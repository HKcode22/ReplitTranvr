import {describe,it,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";
import {
  gate05FidsQueryFingerprintV39,makeGate05ScopedFidsBudgetOwnerV39,
  fetchGate05ScopedFidsV39
} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";

const noLocation={icao:"WSSS",fromLocal:"2026-10-19T09:00",toLocal:"2026-10-19T10:00",withLocation:false};
const yesLocation={...noLocation,withLocation:true};
const hash0=gate05FidsQueryFingerprintV39(noLocation);
const hash1=gate05FidsQueryFingerprintV39(yesLocation);
const owner=(scopeId=randomUUID(),querySha256=hash0)=>({
  scopeId,authorizationId:"AUTH-20261019-G05SCOPED001",
  authorizationSha256:"a".repeat(64),
  cycleId:"test-cycle-2026-10-04-to-11-04",
  icao:"WSSS",querySha256
});

describe("Gate05 pilot-scoped FIDS adapter refuses any unbound request",()=>{
  it("rejects a 200 response with missing departures, not misleading zero flights",async()=>{
    const db={query:vi.fn(async()=>({rowCount:1,rows:[{reserved:true}]}))};
    const http=vi.fn(async()=>new Response(JSON.stringify({arrivals:[]}),{status:200}));
    const response=await fetchGate05ScopedFidsV39({
      db:db as any,owner:owner(),query:noLocation,fetchImpl:http as any
    });
    expect(response).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("waits before retrying 429 without Retry-After instead of zero-delay retry",async()=>{
    let n=0;
    const db={query:vi.fn(async()=>({rowCount:1,rows:[{reserved:true}]}))};
    const http=vi.fn(async()=>{
      n++;
      return n===1 ? new Response(null,{status:429}):
        new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
    });
    const sleep=vi.fn(async (_ms:number)=>{});
    const response=await fetchGate05ScopedFidsV39({
      db:db as any,owner:owner(),query:noLocation,
      fetchImpl:http as any,sleepImpl:sleep
    });
    expect(response).toEqual({departures:[],arrivals:[]});
    expect(http).toHaveBeenCalledTimes(2);
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it("fingerprints the full actual FIDS option shape (including opt-in location)",()=>{
    expect(hash0).toMatch(/^[0-9a-f]{64}$/);
    expect(hash0).not.toBe(hash1);
    expect(()=>gate05FidsQueryFingerprintV39({...noLocation,icao:"EGLL"}))
      .not.toThrow();
    expect(gate05FidsQueryFingerprintV39({...noLocation,icao:"EGLL"})).not.toBe(hash0);
    expect(()=>gate05FidsQueryFingerprintV39({...noLocation,direction:"Both"} as any))
      .not.toThrow(); // Extra caller properties do not alter immutable query shape.
    expect(()=>gate05FidsQueryFingerprintV39({...noLocation,withLocation:"true" as any}))
      .toThrow("GATE05_FIDS_QUERY_SHAPE_HOLD");
  });
  it("refuses impossible calendar days and clock values before a query can be bound",()=>{
    const invalid=[
      {fromLocal:"2026-02-30T09:00"},
      {fromLocal:"2026-02-29T09:00"},
      {fromLocal:"2026-04-31T09:00"},
      {toLocal:"2026-10-19T25:00"},
      {fromLocal:"2026-10-19T09:60"},
      {fromLocal:"2026-13-19T09:00"}
    ];
    for(const patch of invalid){
      expect(()=>gate05FidsQueryFingerprintV39({...noLocation,...patch}))
        .toThrow("GATE05_FIDS_QUERY_SHAPE_HOLD");
    }
    expect(()=>gate05FidsQueryFingerprintV39({
      ...noLocation,fromLocal:"2028-02-29T09:00"
    })).not.toThrow();
  });
  it("never sends mock HTTP when authorization scope hash does not bind the query",async()=>{
    const db={query:vi.fn()},http=vi.fn();
    await expect(fetchGate05ScopedFidsV39({
      db:db as any,owner:owner(randomUUID(),hash0),query:yesLocation,fetchImpl:http
    })).rejects.toThrow("GATE05_SCOPED_OWNER_BINDING_HOLD");
    expect(db.query).not.toHaveBeenCalled();
    expect(http).not.toHaveBeenCalled();
  });
  it("reserves exact scoped SQL before mock GET; no global ledger fallback",async()=>{
    const calls:string[]=[];
    const db={query:vi.fn(async(sql:string,args:unknown[])=>{
      expect(sql).toContain("reserve_gate05_fids_attempt_v39");
      expect(args[4]).toBe(owner().cycleId);
      expect(args[6]).toBe(hash0);
      calls.push("scoped-reserve");
      return {rowCount:1,rows:[{reserved:true}]};
    })};
    const http=vi.fn(async(url:any)=>{
      calls.push("mock-http");
      const u=new URL(String(url));
      expect(u.searchParams.get("direction")).toBe("Departure");
      expect(u.searchParams.get("withLocation")).toBe("false");
      return new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
    });
    const response=await fetchGate05ScopedFidsV39({
      db:db as any,owner:owner(),query:noLocation,fetchImpl:http as any
    });
    expect(response).toEqual({departures:[],arrivals:[]});
    expect(calls).toEqual(["scoped-reserve","mock-http"]);
  });
  it("blocked DB reservation fails closed without mock HTTP",async()=>{
    const db={query:vi.fn(async()=>{throw Error("GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD")})};
    const http=vi.fn();
    const value=await fetchGate05ScopedFidsV39({
      db:db as any,owner:owner(),query:noLocation,fetchImpl:http as any
    });
    expect(value).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(http).not.toHaveBeenCalled();
  });
});

const localUrl=process.env.DATABASE_URL??"";
let isDisposable=false;
try {
  const u=new URL(localUrl);
  isDisposable=process.env.GITHUB_ACTIONS==="true"&&
    ["localhost","127.0.0.1"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
} catch {}
const onlyDisposable=isDisposable?describe:describe.skip;

onlyDisposable("Gate05 exact stored reservation under real disposable PostgreSQL 16",()=>{
  it("creates the isolated staged SQL inside a transaction and tests scope, exhaustion, terminal stop",async()=>{
    const conn=new pg.Client({connectionString:localUrl,connectionTimeoutMillis:8000});
    await conn.connect();
    const id=randomUUID(),auth=owner(id),sha0=hash0,sha1=hash1;
    async function rejected(query:string,params:any[],match:RegExp){
      await conn.query("SAVEPOINT bad_attempt");
      await expect(conn.query(query,params)).rejects.toThrow(match);
      await conn.query("ROLLBACK TO SAVEPOINT bad_attempt");
      await conn.query("RELEASE SAVEPOINT bad_attempt");
    }
    const callSql="SELECT clean.reserve_gate05_fids_attempt_v39($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) AS reserved";
    const arg=(h:string,n:number,override:Record<string,any>={})=>[
      randomUUID(),id,override.authorizationId??auth.authorizationId,
      auth.authorizationSha256,override.cycleId??auth.cycleId,
      auth.icao,h,n===1?"fids_base":"fids_retry",n,2
    ];
    try{
      await conn.query("BEGIN");
      await conn.query("SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))");
      const sql=readFileSync("migrations/staged/V0066__gate05_scoped_fids_budget_v39.sql","utf8");
      await conn.query(sql);
      await conn.query(readFileSync(
        "migrations/staged/V0067__gate05_fids_function_only_roles_v39.sql","utf8"
      ));
      await conn.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,starts_at_utc,expires_at_utc) "+
        "VALUES ($1,$2,$3,$4,'WSSS',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '20 minutes')",
        [id,auth.authorizationId,auth.authorizationSha256,auth.cycleId]
      );
      await conn.query("INSERT INTO clean.gate05_fids_allowed_query_v39 "+
        "(scope_id,query_sha256,query_index,with_location) VALUES ($1,$2,1,false),($1,$3,2,true)",
        [id,sha0,sha1]
      );
      await rejected(callSql,arg(sha0,1),/GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD/);
      await conn.query("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='ACTIVE' WHERE scope_id=$1",[id]);


      // These are NOLOGIN roles; even in the disposable DB they must only
      // acquire function EXECUTE, not any direct ledger/table writing powers.
      const grants=await conn.query(`
        SELECT
          has_function_privilege('gate05_fids_dispatch_v39',
            'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS dispatch_reserve,
          has_function_privilege('gate05_fids_dispatch_v39',
            'clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS dispatch_stop,
          has_function_privilege('gate05_fids_safety_v39',
            'clean.stop_gate05_fids_pilot_v39(uuid,text)','EXECUTE') AS safety_stop,
          has_function_privilege('gate05_fids_safety_v39',
            'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS safety_reserve,
          has_table_privilege('gate05_fids_dispatch_v39',
            'clean.gate05_fids_pilot_scope_v39','UPDATE') AS dispatch_table_update,
          has_table_privilege('gate05_fids_safety_v39',
            'clean.gate05_fids_pilot_scope_v39','UPDATE') AS safety_table_update,
          has_function_privilege('gate05_fids_commission_v39',
            'clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)','EXECUTE') AS commission_reserve
      `);
      expect(grants.rows[0]).toEqual({
        dispatch_reserve:true,dispatch_stop:false,safety_stop:true,
        safety_reserve:false,dispatch_table_update:false,safety_table_update:false,
        commission_reserve:false
      });

      // Exercise the actual permission boundary as a non-superuser role.
      // All role test mutations are undone by their own SAVEPOINTs.
      await conn.query("SAVEPOINT dispatch_privilege_test");
      await conn.query("SET LOCAL ROLE gate05_fids_dispatch_v39");
      expect((await conn.query(callSql,arg(sha0,1))).rows[0].reserved).toBe(true);
      await rejected("SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
        [id,"SAFETY_ABORT"],/permission denied/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='STOPPED' WHERE scope_id=$1",
        [id],/permission denied/);
      await conn.query("ROLLBACK TO SAVEPOINT dispatch_privilege_test");
      await conn.query("RELEASE SAVEPOINT dispatch_privilege_test");

      await conn.query("SAVEPOINT safety_privilege_test");
      await conn.query("SET LOCAL ROLE gate05_fids_safety_v39");
      expect((await conn.query("SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
        [id,"SAFETY_ABORT"])).rows[0].state).toBe("STOPPED");
      await rejected(callSql,arg(sha0,1),/permission denied/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='ACTIVE' WHERE scope_id=$1",
        [id],/permission denied/);
      await conn.query("ROLLBACK TO SAVEPOINT safety_privilege_test");
      await conn.query("RELEASE SAVEPOINT safety_privilege_test");

      await rejected(callSql,arg(sha0,1,{cycleId:"wrong-cycle"}),/GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD/);
      await rejected(callSql,arg(sha0,1,{authorizationId:"AUTH-WRONG00001"}),/GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD/);
      await rejected(callSql,arg("f".repeat(64),1),/GATE05_WRONG_QUERY_DUPLICATE_OR_SEQUENCE_HOLD/);
      await rejected(callSql,arg(sha0,2),/GATE05_WRONG_QUERY_DUPLICATE_OR_SEQUENCE_HOLD/);

      for(const h of [sha0,sha1])for(let n=1;n<=3;n++) {
        expect((await conn.query(callSql,arg(h,n))).rows[0].reserved).toBe(true);
        if(h===sha0&&n===1)
          await rejected(callSql,arg(h,n),/GATE05_WRONG_QUERY_DUPLICATE_OR_SEQUENCE_HOLD/);
      }
      const report=await conn.query(
        "SELECT base_used_units,retry_used_units,state FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[id]);
      expect(report.rows[0]).toMatchObject({base_used_units:4,retry_used_units:8,state:"ACTIVE"});
      const receipt=await conn.query(
        "SELECT count(*)::int AS n,sum(units)::int AS units "+
        "FROM clean.gate05_fids_attempt_v39 WHERE scope_id=$1",[id]);
      expect(receipt.rows[0]).toEqual({n:6,units:12});
      await rejected(callSql,arg(sha1,3),/GATE05_WRONG_QUERY_DUPLICATE_OR_SEQUENCE_HOLD/);
      const stopped=await conn.query(
        "SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
        [id,"OPERATOR_STOP"]);
      expect(stopped.rows[0]).toMatchObject({
        state:"STOPPED",reserved_attempts:"6",reserved_units:"12"
      });
      const stopAgain=await conn.query(
        "SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
        [id,"OPERATOR_STOP"]);
      expect(stopAgain.rows[0].reserved_units).toBe("12");
      const terminal=await conn.query(
        "SELECT stop_reason,stopped_at_utc IS NOT NULL AS has_time "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[id]);
      expect(terminal.rows[0]).toMatchObject({
        stop_reason:"OPERATOR_STOP",has_time:true
      });
      await rejected(callSql,arg(sha0,1),/GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='ACTIVE' WHERE scope_id=$1",
        [id],/GATE05_STOP_TERMINAL/);
      await rejected("DELETE FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[id],/GATE05_SCOPE_CANNOT_DELETE/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET stop_reason='SAFETY_ABORT' WHERE scope_id=$1",[id],
        /GATE05_STOP_TERMINAL/);
      await rejected("SELECT clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",[id,"CUSTOM_REASON"],
        /GATE05_STOP_REASON_HOLD/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET cycle_id='new' WHERE scope_id=$1",
        [id],/GATE05_SCOPE_IDENTITY_IMMUTABLE|GATE05_STOP_TERMINAL/);

      // PostgreSQL default EXECUTE on functions is PUBLIC; staged V0066
      // must explicitly revoke it from all new gate-05 functions.
      const publicFns=await conn.query(
        `SELECT p.proname,
           EXISTS (SELECT 1 FROM aclexplode(
             COALESCE(p.proacl,acldefault('f',p.proowner))) a
             WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
           ) AS public_execute
         FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='clean'
           AND p.proname IN (
             'reserve_gate05_fids_attempt_v39',
             'stop_gate05_fids_pilot_v39'
           )`
      );
      expect(publicFns.rowCount).toBe(2);
      expect(publicFns.rows.every(row=>row.public_execute===false)).toBe(true);
    }finally{
      await conn.query("ROLLBACK").catch(()=>undefined);
      await conn.end();
    }
  },35000);
});
