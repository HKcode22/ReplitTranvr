import {describe,it,expect} from "vitest";
import {createHash,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";
import {inspectGate05ExactAuthArtifactV39,previewGate05PreparedScopeRowsV39,planGate05PreparedOnlySqlV39,verifyGate05PreparedReadbackV39,gate05PreparedCommissionInventorySqlV39,verifyGate05PreparedCommissionInventoryV39} from "../server/lib/disruption/gate05AuthorizationArtifact_v39";
import {gate05FidsQueryFingerprintV39} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const core={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
const source="a".repeat(40),openapi="b".repeat(64);
const raw=()=>({
  schema:"v39.gate05.fids-feasibility-auth.v1",
  scopeId:randomUUID(),authorizationId:"AUTH-20261020-G05PILOT001",
  sourceCommit:source,openapiSha256:openapi,
  cycleId:"placeholder-cycle-requires-official-proof",
  providerResetUtc:"2026-11-04T02:21:21.000Z",
  airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
  fromLocal:core.fromLocal,toLocal:core.toLocal,
  startsAtUtc:"2026-10-20T00:55:00.000Z",
  expiresAtUtc:"2026-10-20T01:30:00.000Z",
  noLocationQuerySha256:gate05FidsQueryFingerprintV39({...core,withLocation:false}),
  locationQuerySha256:gate05FidsQueryFingerprintV39({...core,withLocation:true}),
  maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
  purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
});
const review=(a:Record<string,any>,change:Record<string,any>={})=>{
  const bytes=Buffer.from(JSON.stringify(a));
  return inspectGate05ExactAuthArtifactV39(bytes,{
    independentlyReviewedArtifactSha256:sha(bytes),
    expectedSourceCommit:source,
    expectedOpenapiSha256:openapi,
    expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
    expectedIanaTimezone:"Asia/Singapore",
    observedNowUtc:"2026-10-19T23:59:00.000Z",
    ...change
  });
};
describe("Gate05 exact authorization artifact binding — review is NOT live AUTH",()=>{
  it("requires independent exact byte digest and returns a non-activated review",()=>{
    const a=raw(),r=review(a);
    expect(r.status).toBe("ARTIFACT_BOUND_NOT_HUMAN_SIGNED_OR_DEPLOYABLE");
    expect(r.allowedQuerySha256).toEqual([a.noLocationQuerySha256,a.locationQuerySha256]);
    expect(r.maxAlertCreates).toBeUndefined();
    expect(r.humanSignatureVerified).toBe(false);
    expect(r.paidPilotAuthorized).toBe(false);
    expect(r.activationPermissionGranted).toBe(false);
  });
  it("refuses a bytes change even when the JSON content is semantically identical",()=>{
    const a=raw();
    const bytes=Buffer.from(JSON.stringify(a));
    const pins={
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:source,expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    };
    expect(()=>inspectGate05ExactAuthArtifactV39(Buffer.from(JSON.stringify(a,null,2)),pins))
      .toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
  });
  it("refuses altered query, airport, OpenAPI pin, time window and unit ceiling",()=>{
    expect(()=>review({...raw(),locationQuerySha256:"f".repeat(64)}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
    expect(()=>review({...raw(),airportIcao:"EGLL"}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
    expect(()=>review({...raw(),maxTotalUnits:13}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),maxAlertCreates:1}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),sourceCommit:"0".repeat(40)}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review(raw(),{expectedOpenapiSha256:"c".repeat(64)}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),expiresAtUtc:"2026-11-05T01:30:00.000Z"}))
      .toThrow("GATE05_AUTH_TIME_WINDOW_OR_CYCLE_HOLD");
  });
  it("refuses duplicate JSON keys even when raw sha is pinned",()=>{
    const a=raw(),b=Buffer.from(JSON.stringify(a).replace(
      '"maxAlertCreates":0','"maxAlertCreates":0,"maxAlertCreates":99'
    ));
    expect(()=>inspectGate05ExactAuthArtifactV39(b,{
      independentlyReviewedArtifactSha256:sha(b),
      expectedSourceCommit:source,expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    })).toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("does not allow unknown fields or unsafe local query shape",()=>{
    expect(()=>review({...raw(),freeFormProviderOptions:{withLocation:true}}))
      .toThrow("GATE05_AUTH_FIELDS_HOLD");
    expect(()=>review({...raw(),fromLocal:"2026-10-20T10:00",toLocal:"2026-10-20T09:00"}))
      .toThrow("GATE05_FIDS_QUERY_SHAPE_HOLD");
  });
});


describe("Gate05 PREPARED three-row review is deterministic and never an SQL authority",()=>{
  function planned(a:Record<string,any>){
    const bytes=Buffer.from(JSON.stringify(a));
    const pins={
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:source,
      expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    };
    return previewGate05PreparedScopeRowsV39(bytes,pins);
  }
  it("produces one exact PREPARED row and two immutable paired query rows, NO SQL",()=>{
    const a=raw(),out=planned(a);
    expect(out.status).toBe("ROWS_PREVIEW_ONLY_UNAUTHORIZED_NO_SQL");
    expect(out.scope).toEqual({
      scope_id:a.scopeId,
      authorization_id:a.authorizationId,
      authorization_sha256:sha(Buffer.from(JSON.stringify(a))),
      cycle_id:a.cycleId,icao:"WSSS",
      starts_at_utc:a.startsAtUtc,expires_at_utc:a.expiresAtUtc,
      state:"PREPARED",base_cap_units:4,retry_cap_units:8,
      base_used_units:0,retry_used_units:0
    });
    expect(out.queries).toEqual([
      {scope_id:a.scopeId,query_sha256:a.noLocationQuerySha256,
       query_index:1,with_location:false,last_reserved_attempt:0},
      {scope_id:a.scopeId,query_sha256:a.locationQuerySha256,
       query_index:2,with_location:true,last_reserved_attempt:0}
    ]);
    expect(out.exactRowsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(planned(a).exactRowsSha256).toBe(out.exactRowsSha256);
    expect(out.approvedActivation).toBe(false);
    expect(out.approvedCommissioner).toBe(false);
    expect(out.independentlyAuthenticatedOwnerSigner).toBe(false);
    expect(out.paidPilotAuthorized).toBe(false);
    expect(out.providerRequests).toBe(0);
    expect(out.databaseWrites).toBe(0);
  });
  it("rejects mismatched hashes, higher API cap, canceled airport and expired window",()=>{
    expect(()=>planned({...raw(),noLocationQuerySha256:"0".repeat(64)}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
    expect(()=>planned({...raw(),maxRetryUnits:9}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>planned({...raw(),airportIcao:"EGLL",
      fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00",
      noLocationQuerySha256:gate05FidsQueryFingerprintV39({
        icao:"EGLL",fromLocal:core.fromLocal,toLocal:core.toLocal,withLocation:false
      }),
      locationQuerySha256:gate05FidsQueryFingerprintV39({
        icao:"EGLL",fromLocal:core.fromLocal,toLocal:core.toLocal,withLocation:true
      })
    })).toThrow("GATE05_AUTH_PREPARED_WSSS_SCOPE_ONLY");
    expect(()=>planned({...raw(),startsAtUtc:"2026-10-18T00:55:00.000Z"}))
      .toThrow("GATE05_AUTH_TIME_WINDOW_OR_CYCLE_HOLD");
  });
});


describe("Gate05 parameterized only-PREPARED SQL review plan",()=>{
  const planFor=(a:Record<string,any>)=>{
    const bytes=Buffer.from(JSON.stringify(a));
    return planGate05PreparedOnlySqlV39(bytes,{
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:source,
      expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    });
  };
  it("never exports an executable launcher or interpolates auth values into SQL",()=>{
    const a=raw(),p=planFor(a);
    expect(p.status).toBe("PARAMETERIZED_SQL_PLAN_ONLY_NO_COMMISSION_AUTH");
    expect(p.commands).toHaveLength(2);
    expect(p.commands[0].params[0]).toBe(a.scopeId);
    expect(p.commands[0].params[2]).toBe(sha(Buffer.from(JSON.stringify(a))));
    expect(p.commands[1].params).toEqual([
      a.scopeId,a.noLocationQuerySha256,a.locationQuerySha256
    ]);
    expect(p.commands[0].sql).toContain("'PREPARED',4,8,0,0");
    expect(p.commands[1].sql).toContain("($1::uuid,$2,1,false,0)");
    expect(p.commands[1].sql).toContain("($1::uuid,$3,2,true,0)");
    for(const c of p.commands){
      expect(c.sql).not.toContain(a.authorizationId);
      expect(c.sql).not.toContain(a.scopeId);
      expect(c.sql).not.toMatch(/\b(COMMIT|GRANT|UPDATE|DELETE|DROP|ALTER)\b/);
    }
    expect(p.includesBeginOrCommit).toBe(false);
    expect(p.canActivatePilot).toBe(false);
    expect(p.canAuthorizeProviderSpend).toBe(false);
    expect(p.databaseWrites).toBe(0);
    expect(p.providerRequests).toBe(0);
    expect(planFor(a).exactRowsSha256).toBe(p.exactRowsSha256);
  });
  it("fails before SQL plan formation on modified or unreviewed scope",()=>{
    expect(()=>planFor({...raw(),maxTotalUnits:13}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>planFor({...raw(),noLocationQuerySha256:"0".repeat(64)}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
  });
});


describe("Gate05 strict PREPARED scope read-back: no partial, stale or forged rows",()=>{
  function state(){
    const a=raw();
    const bytes=Buffer.from(JSON.stringify(a));
    const pins={
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:source,
      expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    };
    const scope=[{
      scope_id:a.scopeId,authorization_id:a.authorizationId,
      authorization_sha256:sha(bytes),cycle_id:a.cycleId,icao:"WSSS",
      starts_at_utc:new Date(a.startsAtUtc),
      expires_at_utc:new Date(a.expiresAtUtc),
      state:"PREPARED",base_cap_units:4,retry_cap_units:8,
      base_used_units:0,retry_used_units:0,
      stopped_at_utc:null,stop_reason:null
    }];
    const queries=[
      {scope_id:a.scopeId,query_sha256:a.noLocationQuerySha256,
        query_index:1,with_location:false,last_reserved_attempt:0},
      {scope_id:a.scopeId,query_sha256:a.locationQuerySha256,
        query_index:2,with_location:true,last_reserved_attempt:0}
    ];
    return {bytes,pins,scope,queries};
  }
  const check=(x:ReturnType<typeof state>)=>
    verifyGate05PreparedReadbackV39(x.bytes,x.pins,x.scope,x.queries);
  it("accepts only one PREPARED row and exactly two paired queries",()=>{
    const x=state(),out=check(x);
    expect(out.status).toBe("EXACT_THREE_PREPARED_ROWS_MATCH_NO_LIVE_AUTH");
    expect(out.rowsVerified).toBe(3);
    expect(out.usedApiUnitsVerified).toBe(0);
    expect(out.paidPilotAuthorized).toBe(false);
    expect(out.providerRequests).toBe(0);
    expect(out.exactRowsSha256).toMatch(/^[a-f0-9]{64}$/);
    x.queries.reverse();
    expect(check(x).exactRowsSha256).toBe(out.exactRowsSha256);
  });
  it("refuses missing, duplicate or extra rows",()=>{
    const x=state();
    for(const bad of [[],[...x.scope,...x.scope]]){
      expect(()=>check({...x,scope:bad})).toThrow("GATE05_AUTH_PREPARED_READBACK_HOLD");
    }
    for(const bad of [[],[x.queries[0]],[...x.queries,x.queries[0]]]){
      expect(()=>check({...x,queries:bad})).toThrow("GATE05_AUTH_PREPARED_READBACK_HOLD");
    }
  });
  it("rejects activation, STOP, reservation counters, identities and expiry changes",()=>{
    const x=state();
    const mutate=(changes:Record<string,unknown>)=>
      check({...x,scope:[{...x.scope[0],...changes}]});
    for(const changes of [
      {state:"ACTIVE"},{state:"STOPPED"},
      {base_used_units:2},{retry_used_units:2},
      {base_cap_units:6},{retry_cap_units:10},
      {icao:"EGLL"},{cycle_id:"substituted-cycle"},
      {authorization_sha256:"0".repeat(64)},
      {stopped_at_utc:new Date(x.scope[0].starts_at_utc)},
      {stop_reason:"SAFETY_ABORT"},
      {starts_at_utc:new Date(Date.parse(x.scope[0].starts_at_utc.toISOString())+1000)},
      {expires_at_utc:null}
    ]){
      expect(()=>mutate(changes)).toThrow("GATE05_AUTH_PREPARED_READBACK_HOLD");
    }
  });
  it("refuses substituted hash, location, query index or nonzero attempt",()=>{
    const x=state();
    for(const changes of [
      {query_sha256:"0".repeat(64)},
      {query_index:2},{with_location:true},
      {last_reserved_attempt:1},{scope_id:randomUUID()}
    ]){
      const q=[{...x.queries[0],...changes},x.queries[1]];
      expect(()=>check({...x,queries:q})).toThrow("GATE05_AUTH_PREPARED_READBACK_HOLD");
    }
  });
});


describe("Gate05 PREPARED-only exclusivity inventory (no provider or DB I/O)",()=>{
  const values=(overrides:Record<string,unknown>={})=>[{
    open_scopes:0,matching_prepared:0,matching_active:0,
    matching_queries:0,matching_attempts:0,...overrides
  }];
  it("has a scope-bound fixed SQL query and correct BEFORE/AFTER count contracts",()=>{
    const id=randomUUID(),q=gate05PreparedCommissionInventorySqlV39(id);
    expect(q.params).toEqual([id]);
    expect(q.sql).toContain("state IN ('PREPARED','ACTIVE')");
    expect(q.sql).toContain("WHERE scope_id=$1::uuid");
    expect(q.sql).not.toContain(id);
    expect(q.sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|GRANT|COMMIT)\b/);
    expect(verifyGate05PreparedCommissionInventoryV39(values(),"BEFORE"))
      .toMatchObject({status:"NO_CONCURRENT_OPEN_SCOPE_VERIFIED",
        paidPilotAuthorized:false,providerRequests:0});
    expect(verifyGate05PreparedCommissionInventoryV39(values({
      open_scopes:1,matching_prepared:1,matching_queries:2
    }),"AFTER")).toMatchObject({
      status:"ONE_EXCLUSIVE_PREPARED_SCOPE_VERIFIED",activationAuthorized:false
    });
  });
  it("rejects races, other open scopes, early ACTIVE, reserved attempts and broken counts",()=>{
    const invalidBefore=[
      {open_scopes:1},{matching_prepared:1},{matching_active:1},
      {matching_queries:2},{matching_attempts:1},
      {open_scopes:"0"},{open_scopes:-1},{open_scopes:1.5}
    ];
    for(const patch of invalidBefore){
      expect(()=>verifyGate05PreparedCommissionInventoryV39(
        values(patch),"BEFORE")).toThrow("GATE05_AUTH_COMMISSION_INVENTORY_HOLD");
    }
    const expected={
      open_scopes:1,matching_prepared:1,matching_queries:2
    };
    for(const patch of [
      {open_scopes:2},{matching_prepared:0},{matching_active:1},
      {matching_queries:1},{matching_queries:3},{matching_attempts:1},
      {open_scopes:null},{matching_queries:NaN}
    ]){
      expect(()=>verifyGate05PreparedCommissionInventoryV39(
        values({...expected,...patch}),"AFTER"))
        .toThrow("GATE05_AUTH_COMMISSION_INVENTORY_HOLD");
    }
    expect(()=>verifyGate05PreparedCommissionInventoryV39([], "AFTER"))
      .toThrow("GATE05_AUTH_COMMISSION_INVENTORY_HOLD");
    expect(()=>gate05PreparedCommissionInventorySqlV39("wrong"))
      .toThrow("GATE05_AUTH_COMMISSION_INVENTORY_SCOPE_HOLD");
  });
});

const pgUrl=process.env.DATABASE_URL??"";
let disposableGate05Db=false;
try{
  const u=new URL(pgUrl);
  disposableGate05Db=process.env.GITHUB_ACTIONS==="true"&&
    ["localhost","127.0.0.1"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const offlinePg=disposableGate05Db?describe:describe.skip;
offlinePg("Gate05 reviewed prepared-only SQL against disposable PostgreSQL16",()=>{
  it("creates exactly three PREPARED rows inside a rollback-only transaction",async()=>{
    const conn=new pg.Client({connectionString:pgUrl,connectionTimeoutMillis:8000});
    await conn.connect();
    try{
      await conn.query("BEGIN");
      await conn.query("SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))");
      await conn.query(readFileSync(
        "migrations/staged/V0066__gate05_scoped_fids_budget_v39.sql","utf8"
      ));
      await conn.query(readFileSync(
        "migrations/staged/V0067__gate05_fids_function_only_roles_v39.sql","utf8"
      ));
      const start=new Date(Date.now()+10*60_000).toISOString();
      const end=new Date(Date.now()+40*60_000).toISOString();
      const reset=new Date(Date.now()+14*86_400_000).toISOString();
      const local={icao:"WSS",fromLocal:"2026-10-21T10:00",toLocal:"2026-10-21T11:00"};
      // The event-time strings are independent of execution clock.
      const query={...local,icao:"WSSS"};
      const a={
        schema:"v39.gate05.fids-feasibility-auth.v1",
        scopeId:randomUUID(),authorizationId:"AUTH-20261021-G05OFFLINE001",
        sourceCommit:source,openapiSha256:openapi,
        cycleId:"disposable-ci-cycle-no-provider-approval",
        providerResetUtc:reset,airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
        fromLocal:query.fromLocal,toLocal:query.toLocal,
        startsAtUtc:start,expiresAtUtc:end,
        noLocationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:false}),
        locationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:true}),
        maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
        purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
      };
      const bytes=Buffer.from(JSON.stringify(a));
      const plan=planGate05PreparedOnlySqlV39(bytes,{
        independentlyReviewedArtifactSha256:sha(bytes),
        expectedSourceCommit:source,
        expectedOpenapiSha256:openapi,
        expectedProviderResetUtc:reset,
        expectedIanaTimezone:"Asia/Singapore",
        observedNowUtc:new Date(Date.now()-60_000).toISOString()
      });
      // Terminal history is audit evidence, not another live pilot.
      // Keep it in the same rolled-back disposable transaction to prove
      // new runs are not arbitrarily blocked by earlier STOPPED scopes.
      const terminalScopeId=randomUUID();
      await conn.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc) "+
        "VALUES($1::uuid,$2,$3,$4,'WSSS',$5::timestamptz,$6::timestamptz)",
        [terminalScopeId,a.authorizationId,sha(bytes),a.cycleId,
         a.startsAtUtc,a.expiresAtUtc]
      );
      const closed=await conn.query(
        "SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,'OPERATOR_STOP')",
        [terminalScopeId]
      );
      expect(closed.rows[0]).toMatchObject({state:"STOPPED"});
      expect((await conn.query(
        "SELECT count(*)::int AS stopped FROM clean.gate05_fids_pilot_scope_v39 "+
        "WHERE state='STOPPED'"
      )).rows[0].stopped).toBe(1);

      const inventory=gate05PreparedCommissionInventorySqlV39(a.scopeId);
      const initially=(await conn.query(inventory.sql,[...inventory.params])).rows;
      expect(verifyGate05PreparedCommissionInventoryV39(initially,"BEFORE").status)
        .toBe("NO_CONCURRENT_OPEN_SCOPE_VERIFIED");

      // Inject a mid-commission failure after the scope INSERT: no orphan
      // owner row or counter may survive a transaction SAVEPOINT rollback.
      await conn.query("SAVEPOINT simulated_partial_commission");
      expect((await conn.query(plan.commands[0].sql,[...plan.commands[0].params])).rowCount)
        .toBe(1);
      await conn.query("ROLLBACK TO SAVEPOINT simulated_partial_commission");
      await conn.query("RELEASE SAVEPOINT simulated_partial_commission");
      const afterFailure=(await conn.query(inventory.sql,[...inventory.params])).rows;
      expect(verifyGate05PreparedCommissionInventoryV39(afterFailure,"BEFORE").status)
        .toBe("NO_CONCURRENT_OPEN_SCOPE_VERIFIED");

      for(const cmd of plan.commands){
        const result=await conn.query(cmd.sql,[...cmd.params]);
        expect(result.rowCount).toBe(cmd===plan.commands[0]?1:2);
      }
      const afterPrepare=(await conn.query(inventory.sql,[...inventory.params])).rows;
      expect(verifyGate05PreparedCommissionInventoryV39(afterPrepare,"AFTER").status)
        .toBe("ONE_EXCLUSIVE_PREPARED_SCOPE_VERIFIED");

      // Simulate another PREPARED scope from a conflicting commissioner:
      // global exclusivity must reject even if our own 3 rows match.
      await conn.query("SAVEPOINT other_open_scope");
      await conn.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc) "+
        "VALUES($1::uuid,$2,$3,$4,'WSSS',$5::timestamptz,$6::timestamptz)",
        [randomUUID(),a.authorizationId,sha(bytes),a.cycleId,a.startsAtUtc,a.expiresAtUtc]
      );
      const conflict=(await conn.query(inventory.sql,[...inventory.params])).rows;
      expect(()=>verifyGate05PreparedCommissionInventoryV39(conflict,"AFTER"))
        .toThrow("GATE05_AUTH_COMMISSION_INVENTORY_HOLD");
      await conn.query("ROLLBACK TO SAVEPOINT other_open_scope");
      await conn.query("RELEASE SAVEPOINT other_open_scope");

      const rows=(await conn.query(
        "SELECT state,base_cap_units,retry_cap_units,base_used_units,retry_used_units "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
        [a.scopeId]
      )).rows;
      expect(rows).toEqual([{
        state:"PREPARED",base_cap_units:4,retry_cap_units:8,
        base_used_units:0,retry_used_units:0
      }]);
      const allowed=(await conn.query(
        "SELECT query_index,query_sha256,with_location,last_reserved_attempt "+
        "FROM clean.gate05_fids_allowed_query_v39 WHERE scope_id=$1 ORDER BY query_index",
        [a.scopeId]
      )).rows;
      expect(allowed).toEqual([
        {query_index:1,query_sha256:a.noLocationQuerySha256,
          with_location:false,last_reserved_attempt:0},
        {query_index:2,query_sha256:a.locationQuerySha256,
          with_location:true,last_reserved_attempt:0}
      ]);
      const scopeRows=(await conn.query(
        "SELECT scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,state,base_cap_units,retry_cap_units,"+
        "base_used_units,retry_used_units,stopped_at_utc,stop_reason "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
        [a.scopeId]
      )).rows;
      const queryRows=(await conn.query(
        "SELECT scope_id,query_sha256,query_index,with_location,last_reserved_attempt "+
        "FROM clean.gate05_fids_allowed_query_v39 WHERE scope_id=$1 ORDER BY query_index",
        [a.scopeId]
      )).rows;
      expect(verifyGate05PreparedReadbackV39(bytes,{
        independentlyReviewedArtifactSha256:sha(bytes),
        expectedSourceCommit:source,
        expectedOpenapiSha256:openapi,
        expectedProviderResetUtc:reset,
        expectedIanaTimezone:"Asia/Singapore",
        observedNowUtc:new Date(Date.now()-60_000).toISOString()
      },scopeRows,queryRows)).toMatchObject({
        status:"EXACT_THREE_PREPARED_ROWS_MATCH_NO_LIVE_AUTH",
        rowsVerified:3,activeScopesVerified:0,usedApiUnitsVerified:0
      });
      await conn.query("SAVEPOINT prevent_duplicate");
      await expect(conn.query(plan.commands[1].sql,[...plan.commands[1].params]))
        .rejects.toThrow();
      await conn.query("ROLLBACK TO SAVEPOINT prevent_duplicate");
    }finally{
      await conn.query("ROLLBACK").catch(()=>{});
      await conn.end();
    }
  },40000);
});
