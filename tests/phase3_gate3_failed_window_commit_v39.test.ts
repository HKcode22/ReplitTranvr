import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import pg from "pg";
import type {Pool} from "pg";
import type {PrepaidLiveWindowResultV39}
  from "../server/lib/disruption/prepaidProbeWindow_v39";
import {
  classifyGate3FailedWindowV39,
  commitGate3FailedWindowV39,
  type Gate3FailedWindowInputV39,
} from "../server/lib/disruption/gate3CanaryFailedWindowCommit_v39";

const AUTH="a".repeat(64);
const fixture=():Gate3FailedWindowInputV39=>({
  expectedSessionId:randomUUID(),icao:"YSSY",authorizationEvidenceSha256:AUTH,
  result:{
    status:"failed",runtimeSessionId:"",windowStart:new Date("2026-10-14T17:00:00Z"),
    windowEnd:new Date("2026-10-14T17:05:00Z"),
    durationCensored:true,stopReason:"subscription_delete_failed",
    reconciliationStatus:"UNRESOLVED",
    externalCredits:null,internalSendCredits:0,
    maxObservedUnsettledCreditGap:0,settlementReads:0,
    metrics:null,cleanupVerifiedAtUtc:null,subscriptionDeleted:false,
  },
});
function failed(){
  const x=fixture();
  x.result.runtimeSessionId=x.expectedSessionId;
  return x;
}
function fakePool(x:Gate3FailedWindowInputV39){
  const commands:string[]=[];
  let discarded:boolean[]=[];
  const client={
    async query(sql:string){
      const cmd=sql.startsWith("SELECT session_id")?"SELECT":
        sql.startsWith("UPDATE clean.phase3")?"UPDATE":sql;
      commands.push(cmd);
      if(cmd==="SELECT")return {rowCount:1,rows:[{
        session_id:x.expectedSessionId,icao:x.icao,
        authorization_evidence_sha256:x.authorizationEvidenceSha256,
        state:"PREPARED",failure_reason:null,evidence_sha256:null,
      }]};
      return {rowCount:1,rows:[{session_id:x.expectedSessionId}]};
    },
    release(flag?:boolean){discarded.push(flag===true);},
  };
  const pool={connect:async()=>client} as unknown as Pick<Pool,"connect">;
  return {pool,commands,get discarded(){return discarded;}};
}
describe("Gate3 failed prepaid-window durable bridge — offline, no provider",()=>{
  it("maps exact verified-delete failure to immutable FAILED, not a paid PASS",async()=>{
    const x=failed(),p=fakePool(x);
    expect(classifyGate3FailedWindowV39(x)).toMatchObject({
      failureCode:"OWNED_DELETE_UNVERIFIED",
      safeEvidenceSha256:expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    const v=await commitGate3FailedWindowV39(p.pool,x);
    expect(p.commands).toEqual(["BEGIN","SELECT","UPDATE","COMMIT"]);
    expect(p.discarded).toEqual([false]);
    expect(v).toMatchObject({
      disposition:"DURABLY_FAILED",committed:true,providerCalls:0,
      authorizesAnotherRun:false,confirmsProviderSubscriptionDeleted:false,
      confirmsAccountSettled:false,
    });
  });
  it("reconciliation gap remains FAILED instrumentation only",()=>{
    const x=failed();
    x.result.subscriptionDeleted=true;
    x.result.stopReason="delivery_gap";
    x.result.reconciliationStatus="DELIVERY_GAP";
    expect(classifyGate3FailedWindowV39(x).failureCode).toBe("CREDIT_DIFFERENCE");
  });
  it("maps bind/create/settlement/early stop to distinct safe failure reasons",()=>{
    const x=failed();
    const cases=[
      ["subscription_bind_failed_delete_unresolved_emergency_stop","BIND_FAILED"],
      ["subscription_create_failed_after_exact_reconciliation","CREATE_AMBIGUOUS_ACCOUNT_HOLD"],
      ["balance_read_failed_after_retries","SETTLEMENT_UNRESOLVED"],
    ] as const;
    for(const [reason,code] of cases){
      x.result.stopReason=reason;
      expect(classifyGate3FailedWindowV39(x).failureCode).toBe(code);
    }
    x.result.reconciliationStatus="MATCH";
    x.result.stopReason="duration_censored_before_target";
    expect(classifyGate3FailedWindowV39(x).failureCode).toBe("WINDOW_STOPPED");
  });
  it("refuses successful/settling result and cross-session before DB connection",async()=>{
    const x=failed();
    let connected=0;
    const pool={connect:async()=>{connected++;throw Error("MUST_NOT_CONNECT")}} as unknown as Pick<Pool,"connect">;
    for(const status of ["settling","completed"] as const){
      await expect(commitGate3FailedWindowV39(pool,{
        ...x,result:{...x.result,status},
      })).rejects.toThrow("GATE3_FAILED_WINDOW_SCOPE_OR_RESULT_INVALID");
    }
    await expect(commitGate3FailedWindowV39(pool,{
      ...x,result:{...x.result,runtimeSessionId:randomUUID()},
    })).rejects.toThrow("GATE3_FAILED_WINDOW_SCOPE_OR_RESULT_INVALID");
    expect(connected).toBe(0);
  });
  it("invalid ICAO, AUTH, time, reconciliation and negative counters fail before DB",()=>{
    for(const change of [
      {icao:"YSS"},
      {authorizationEvidenceSha256:"not-a-sha"},
      {result:{...failed().result,windowStart:new Date("invalid")}},
      {result:{...failed().result,internalSendCredits:-1}},
      {result:{...failed().result,reconciliationStatus:"NOT_CONFIRMED"}},
    ]){
      const x=failed();
      expect(()=>classifyGate3FailedWindowV39({...x,...change} as Gate3FailedWindowInputV39))
        .toThrow("GATE3_FAILED_WINDOW_SCOPE_OR_RESULT_INVALID");
    }
  });
  it("digest ignores provider account delta and raw/free-form stop reason content",()=>{
    const x=failed(),a=classifyGate3FailedWindowV39(x);
    const y=failed();
    y.expectedSessionId=x.expectedSessionId;
    y.result.runtimeSessionId=x.expectedSessionId;
    y.result.externalCredits=40;
    y.result.internalSendCredits=7;
    y.result.stopReason="subscription_delete_failed"; // same class; no raw body
    y.result.windowEnd=new Date("2026-10-14T17:06:00Z");
    expect(classifyGate3FailedWindowV39(y)).toEqual(a);
    const z=failed();
    z.expectedSessionId=x.expectedSessionId;z.result.runtimeSessionId=x.expectedSessionId;
    z.result.stopReason="some arbitrary upstream secret-looking text";
    z.result.reconciliationStatus="MATCH";
    const w={...z,result:{...z.result,stopReason:"another free-form text"}};
    expect(classifyGate3FailedWindowV39(z).safeEvidenceSha256)
      .toEqual(classifyGate3FailedWindowV39(w).safeEvidenceSha256);
  });
});

const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const realPG=local?describe:describe.skip;
realPG("Gate3 failed window bridge commits LOGGED receipt on disposable PG",()=>{
  it("failed result commits, replays identically, conflicting terminal result fails",async()=>{
    const pool=new pg.Pool({connectionString:url,connectionTimeoutMillis:8000,max:2});
    const x=failed();
    try{
      await pool.query(`INSERT INTO clean.phase3_gate3_canary_owner_v39
       (session_id,icao,authorization_evidence_sha256,
        canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
       VALUES ($1,$2,$3,20,300,now()+interval '60 minutes')`,
        [x.expectedSessionId,x.icao,x.authorizationEvidenceSha256]);
      expect((await commitGate3FailedWindowV39(pool,x)).disposition).toBe("DURABLY_FAILED");
      const q=await pool.query(`SELECT state,failure_reason,evidence_sha256,
        internal_received_credits,exact_reconciliation_verified,
        owned_subscription_delete_verified,terminal_at_utc
        FROM clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1`,[x.expectedSessionId]);
      expect(q.rows[0]).toMatchObject({
        state:"FAILED",failure_reason:"OWNED_DELETE_UNVERIFIED",
        evidence_sha256:classifyGate3FailedWindowV39(x).safeEvidenceSha256,
        internal_received_credits:null,exact_reconciliation_verified:null,
        owned_subscription_delete_verified:null,
      });
      expect(q.rows[0].terminal_at_utc).toBeTruthy();
      expect((await commitGate3FailedWindowV39(pool,x)).disposition)
        .toBe("DURABLY_ALREADY_IDENTICAL_FAILED");
      await expect(commitGate3FailedWindowV39(pool,{
        ...x,result:{...x.result,subscriptionDeleted:true,
          reconciliationStatus:"DELIVERY_GAP",stopReason:"delivery_gap"},
      })).rejects.toThrow("GATE3_FAILED_RECEIPT_TERMINAL_CONFLICT");
    }finally{await pool.end();}
  },30000);
});
