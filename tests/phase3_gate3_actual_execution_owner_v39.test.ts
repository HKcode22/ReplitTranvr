import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import type {Pool} from "pg";
import {sha256HexString} from
  "../server/lib/disruption/authRecord_v39";
import {
  buildGate3ExactPaidWindowV39,
  executeGate3ActualWindowV39,
  recordGate3ActualWindowOutcomeV39,
  type Gate3ActualOwnerInputV39,
} from "../server/lib/disruption/gate3ActualExecutionOwner_v39";

const sessionId=randomUUID();
const raw=JSON.stringify({
  authorizationId:"AUTH-20261020-G3ONE",
  phaseGate:"Phase 3 / Gate 3",
  airportFilterWindow:"WSSS/departures/2026-10-20T17:00:00Z+300s",
  maxAlertCredits:12,
});
const sha=sha256HexString(raw);
const input:Gate3ActualOwnerInputV39={
  prepared:{
    sessionId,icao:"WSSS",state:"PREPARED",runtimeState:"armed",
    canaryCreditCeiling:12,fixedExposureSeconds:300,
    sessionExpiresAtUtc:"2026-10-20T17:15:00Z",
    approvalVerifiedHere:false,authorizedPaidProviderCalls:false,
    status:"SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH",
    authArtifactSha256:sha,independentLedgerHashMatched:true,
    signedOperatorAuthorizationVerifiedHere:false,
    publishedHostCustodyVerifiedHere:false,
    providerAccountInventoryVerifiedHere:false,
    authorizesPaidProviderCalls:false,
    stage:"REAL_HOST_AND_ACCOUNT_READS_SOURCE_PREPARED_ONLY",
    publicHostGetVerified:true,publicReceiverPrepaidRouteVerified:true,
    providerReadOnlyBalanceAndInventoryChecked:true,
    activeBillableSubscriptions:0,protectedCreditFloorSatisfied:true,
    liveSignedCallbackShaReadbackVerified:false,
    humanPaidAuthorizationVerified:false,paidCanaryCertified:false,
    providerSubscriptionCreatedHere:false,balanceBeforeInMemory:2300,
  },
  authArtifactRaw:raw,expectedAuthId:"AUTH-20261020-G3ONE",
  expectedAirportFilterWindow:"WSSS/departures/2026-10-20T17:00:00Z+300s",
  deletionRunId:"phase3-g3-run-20261020",
  settlement:{
    initialWaitSeconds:20,pollIntervalSeconds:15,
    stableReadCount:3,timeoutSeconds:240,
  },
  externalStopCheck:async()=>null,
};
function failedResult(id=sessionId){
  return {
    status:"failed" as const,runtimeSessionId:id,
    windowStart:new Date("2026-10-20T17:00:00Z"),
    windowEnd:new Date("2026-10-20T17:03:00Z"),
    durationCensored:true,stopReason:"subscription_delete_failed",
    reconciliationStatus:"UNRESOLVED" as const,
    externalCredits:null,internalSendCredits:0,
    maxObservedUnsettledCreditGap:0,settlementReads:0,
    metrics:null,cleanupVerifiedAtUtc:null,
    subscriptionDeleted:false,
  };
}
function pool(){
  const calls:string[]=[],released:boolean[]=[];
  const db={
    async connect(){
      return {
        async query(sql:string){
          const op=sql.startsWith("SELECT session_id")?"SELECT_FAILED":
            sql.startsWith("UPDATE clean.phase3")?"UPDATE":sql;
          calls.push(op);
          if(op==="SELECT_FAILED")return {
            rowCount:1,rows:[{
              session_id:sessionId,icao:"WSSS",
              authorization_evidence_sha256:sha,
              state:"PREPARED",failure_reason:null,evidence_sha256:null,
            }],
          };
          return {rowCount:1,rows:[{session_id:sessionId}]};
        },
        release(discard?:boolean){released.push(discard===true);},
      };
    },
  } as unknown as Pick<Pool,"connect">;
  return {db,calls,released};
}

describe("Gate3 integrated ACTUAL window handoff is sealed pending real host+signed source",()=>{
  it("derives the actual shared prepaid runner's ONE prearmed UUID/scope; no Phase2 fallback",()=>{
    const p=buildGate3ExactPaidWindowV39(input);
    expect(p).toMatchObject({
      ownerKind:"phase3_credit_canary",icao:"WSSS",
      targetHours:300/3600,hardCapCredits:12,
      balanceBefore:2300,settledOtherCredits:0,
      stage:null,ownerProbeId:null,deferCleanup:true,
      watchdogPollMs:5000,
      prearmedGate3:{
        sessionId,icao:"WSSS",fixedExposureSeconds:300,
        canaryCreditCeiling:12,authorizationEvidenceSha256:sha,
        expectedAuthId:"AUTH-20261020-G3ONE",
      },
    });
    expect(p.onSessionArmed).toBeUndefined();
    expect(typeof p.externalStopCheck).toBe("function");
  });

  it("rejects forged scope, changed baseline, unsafe settlement or absent watchdog",()=>{
    for(const patch of [
      {authArtifactRaw:raw+" "},
      {expectedAuthId:"AUTH-20261020-G3OTHER"},
      {expectedAirportFilterWindow:"WSSS/departures/2026-10-20T17:02:00Z+300s"},
      {prepared:{...input.prepared,balanceBeforeInMemory:1499}},
      {prepared:{...input.prepared,canaryCreditCeiling:101}},
      {prepared:{...input.prepared,authArtifactSha256:"a".repeat(64)}},
      {settlement:{...input.settlement,stableReadCount:2}},
      {settlement:{...input.settlement,timeoutSeconds:0}},
      {externalStopCheck:null},
    ]){
      expect(()=>buildGate3ExactPaidWindowV39({
        ...input,...patch,
      } as Gate3ActualOwnerInputV39)).toThrow();
    }
  });

  it("actual provider-capable run is blocked BEFORE any database, SDK or subscription",async()=>{
    const d=pool();
    await expect(executeGate3ActualWindowV39(d.db,input))
      .rejects.toThrow("GATE3_OWNER_PAID_PATH_NOT_RELEASED_BEFORE_ANY_IO");
    expect(d.calls).toEqual([]);
  });

  it("completed-looking PREPAID window cannot write false SETTLED without original source proof",async()=>{
    const p=buildGate3ExactPaidWindowV39(input);
    const d=pool();
    const result={...failedResult(),status:"settling" as const,
      stopReason:null,reconciliationStatus:"MATCH" as const,
      subscriptionDeleted:true,durationCensored:false,
      externalCredits:5,internalSendCredits:5,settlementReads:3,
    };
    const r=await recordGate3ActualWindowOutcomeV39(d.db,p,result);
    expect(r).toMatchObject({
      status:"HOLD_SUCCESS_REQUIRES_SOURCE_AUTHENTICITY",
      liveGate3Certified:false,authorizesAnotherPaidRun:false,
    });
    expect(d.calls).toEqual([]);
  });

  it("one genuine failed window writes only a durable FAILED receipt, not SETTLED",async()=>{
    const p=buildGate3ExactPaidWindowV39(input),d=pool();
    const r=await recordGate3ActualWindowOutcomeV39(d.db,p,failedResult());
    expect(r.status).toBe("FAILED_DURABLY_RECORDED");
    expect(r.terminalReceipt).toMatchObject({
      disposition:"FAILED_DURABLY_RECORDED",
      liveGate3Certified:false,authorizesAnotherPaidRun:false,
    });
    expect(d.calls).toEqual(["BEGIN","SELECT_FAILED","UPDATE","COMMIT"]);
    expect(d.released).toEqual([false]);
  });

  it("mismatched callback session cannot terminalize an unrelated owner",async()=>{
    const p=buildGate3ExactPaidWindowV39(input),d=pool();
    await expect(recordGate3ActualWindowOutcomeV39(d.db,p,
      failedResult(randomUUID())))
      .rejects.toThrow("GATE3_OWNER_RESULT_SESSION_MISMATCH_HOLD");
    expect(d.calls).toEqual([]);
  });
});
