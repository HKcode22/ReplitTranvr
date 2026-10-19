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
      const sql=readFileSync("migrations/staged/V0066__gate05_scoped_fids_budget_v39.sql","utf8");
      await conn.query(sql);
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
      await conn.query("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='STOPPED' WHERE scope_id=$1",[id]);
      await rejected(callSql,arg(sha0,1),/GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET state='ACTIVE' WHERE scope_id=$1",
        [id],/GATE05_STOP_TERMINAL/);
      await rejected("DELETE FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[id],/GATE05_SCOPE_CANNOT_DELETE/);
      await rejected("UPDATE clean.gate05_fids_pilot_scope_v39 SET cycle_id='new' WHERE scope_id=$1",
        [id],/GATE05_SCOPE_IDENTITY_IMMUTABLE/);
    }finally{
      await conn.query("ROLLBACK").catch(()=>undefined);
      await conn.end();
    }
  },35000);
});
