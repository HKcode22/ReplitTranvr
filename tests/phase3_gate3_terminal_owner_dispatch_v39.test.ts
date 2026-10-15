import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import type {Pool} from "pg";
import {
  commitGate3TerminalDispositionV39,
  type Gate3TerminalOwnerInputV39,
} from "../server/lib/disruption/gate3CanaryTerminalOwner_v39";
import {assessGate3CanaryTerminalV39}
  from "../server/lib/disruption/gate3CanaryTerminalAssessment_v39";

const sha="a".repeat(64);
function success():Gate3TerminalOwnerInputV39{
  const id=randomUUID();
  return {
    sessionId:id,icao:"YSSY",authorizationEvidenceSha256:sha,
    canaryCreditCeiling:20,fixedExposureSeconds:300,
    sourceReadbackVerified:true,publishedReceiverParityVerified:true,
    foreignActiveBillableCount:0,
    result:{
      status:"settling",runtimeSessionId:id,
      windowStart:new Date("2026-10-20T17:00:00Z"),
      windowEnd:new Date("2026-10-20T17:05:00Z"),
      durationCensored:false,stopReason:null,
      reconciliationStatus:"MATCH",externalCredits:5,
      internalSendCredits:5,maxObservedUnsettledCreditGap:0,
      settlementReads:4,cleanupVerifiedAtUtc:null,
      subscriptionDeleted:true,
      metrics:{
        rowsDelivered:3,uniqueFlights:3,tailChainLinks:0,
        internalSendCredits:5,confirmedUniqueLower:3,
        confirmedPlusAmbiguousUpper:3,ambiguousUnknown:0,
        firstObservationMs:[],deliveryCount:3,notificationItemsReceived:5,
        explicitCostDeliveryCount:3,fallbackDeliveryCount:0,
        costItemDisagreementCount:0,callbackRequestsSeen:3,
        callbackSuccess2xx:3,callbackFailures:0,
      },
    },
  };
}
function fakeDb(x:Gate3TerminalOwnerInputV39,opts?:{
  state?:"PREPARED"|"SETTLED"|"FAILED";
  commitThrows?:boolean;
  connectThrows?:boolean;
}){
  const calls:string[]=[];
  const released:boolean[]=[];
  const assessment=assessGate3CanaryTerminalV39({
    expectedSessionId:x.sessionId,
    canaryCreditCeiling:x.canaryCreditCeiling,
    fixedExposureSeconds:x.fixedExposureSeconds,
    sourceReadbackVerified:x.sourceReadbackVerified,
    publishedReceiverParityVerified:x.publishedReceiverParityVerified,
    foreignActiveBillableCount:x.foreignActiveBillableCount,
    result:x.result,
  });
  const client={
    async query(sql:string){
      const name=sql.startsWith("SELECT icao")?"SELECT_SETTLED":
        sql.startsWith("SELECT session_id")?"SELECT_FAILED":
        sql.startsWith("UPDATE clean.phase3")?"UPDATE":sql;
      calls.push(name);
      if(name==="COMMIT"&&opts?.commitThrows)throw Error("LOST_ACK");
      if(name==="SELECT_SETTLED")return {rowCount:1,rows:[{
        icao:x.icao,authorization_evidence_sha256:x.authorizationEvidenceSha256,
        canary_credit_ceiling:x.canaryCreditCeiling,
        fixed_exposure_seconds:x.fixedExposureSeconds,
        state:opts?.state??"PREPARED",
        exact_reconciliation_verified:true,
        internal_received_credits:5,stable_read_count:4,
        owned_subscription_delete_verified:true,
        foreign_billable_count:0,
        evidence_sha256:assessment.safeMetadataDigestSha256,
        failure_reason:null,
      }]};
      if(name==="SELECT_FAILED")return {rowCount:1,rows:[{
        session_id:x.sessionId,icao:x.icao,
        authorization_evidence_sha256:x.authorizationEvidenceSha256,
        state:opts?.state??"PREPARED",
        failure_reason:null,evidence_sha256:null,
      }]};
      return {rowCount:1,rows:[{session_id:x.sessionId}]};
    },
    release(discard?:boolean){released.push(discard===true);},
  };
  const pool={connect:async()=>{
    if(opts?.connectThrows)throw Error("CONNECT_LOST");
    return client;
  }} as unknown as Pick<Pool,"connect">;
  return {pool,calls,released};
}

describe("Gate3 source status -> immutable SQL FAILED or SETTLED candidate, provider-free",()=>{
  it("selects SETTLED candidate ONLY when complete exact source assessment passes",async()=>{
    const x=success(),db=fakeDb(x);
    const got=await commitGate3TerminalDispositionV39(db.pool,x);
    expect(db.calls).toEqual(["BEGIN","SELECT_SETTLED","UPDATE","COMMIT"]);
    expect(db.released).toEqual([false]);
    expect(got).toMatchObject({
      disposition:"SETTLED_CANDIDATE_DURABLY_RECORDED",
      committed:true,liveGate3Certified:false,
      sourceAndProviderEvidenceAuthenticatedHere:false,
      authorizesAnotherPaidRun:false,providerCalls:0,
    });
  });
  it("routes a failed result to failed-only LOGGED SQL, never a success update",async()=>{
    const x=success();
    x.result={
      ...x.result,status:"failed",
      durationCensored:true,stopReason:"subscription_delete_failed",
      reconciliationStatus:"UNRESOLVED",externalCredits:null,
      subscriptionDeleted:false,metrics:null,
    };
    const db=fakeDb(x);
    const got=await commitGate3TerminalDispositionV39(db.pool,x);
    expect(got.disposition).toBe("FAILED_DURABLY_RECORDED");
    expect(db.calls).toEqual(["BEGIN","SELECT_FAILED","UPDATE","COMMIT"]);
    expect(db.released).toEqual([false]);
  });
  it("failed CREATE+LIST ambiguity also uses failed terminal even if receiving state is settling",async()=>{
    const f=success(),x={
      ...f,result:{
        ...f.result,status:"failed" as const,
        durationCensored:true,
        reconciliationStatus:"UNRESOLVED" as const,
        externalCredits:null,
        subscriptionDeleted:false,
        metrics:null,
        stopReason:"subscription_create_provider_outcome_unverified_hold",
      },
    };
    const db=fakeDb(x);
    expect((await commitGate3TerminalDispositionV39(db.pool,x)).disposition)
      .toBe("FAILED_DURABLY_RECORDED");
    expect(db.calls).toContain("SELECT_FAILED");
    expect(db.calls).not.toContain("SELECT_SETTLED");
  });
  it("a successful SQL-shaped input with a missing real-world precondition cannot UPDATE",async()=>{
    for(const patch of [
      {sourceReadbackVerified:false},
      {publishedReceiverParityVerified:false},
      {foreignActiveBillableCount:1},
    ]){
      const f=success(),x={...f,...patch},db=fakeDb(x);
      await expect(commitGate3TerminalDispositionV39(db.pool,x))
        .rejects.toThrow("GATE3_SETTLED_CANDIDATE_ASSESSMENT_HOLD");
      expect(db.calls).toEqual([]);
    }
    const f=success(),x={...f,result:{...f.result,externalCredits:7}},db=fakeDb(x);
    await expect(commitGate3TerminalDispositionV39(db.pool,x))
      .rejects.toThrow("GATE3_SETTLED_CANDIDATE_ASSESSMENT_HOLD");
    expect(db.calls).toEqual([]);
  });
  it("refuses cross-session, wrong auth, negative foreign count and bad scope BEFORE SQL",async()=>{
    for(const patch of [
      {sessionId:randomUUID()},
      {icao:"YSS"},
      {authorizationEvidenceSha256:"123"},
      {foreignActiveBillableCount:-1},
      {canaryCreditCeiling:0},
      {fixedExposureSeconds:0},
    ]){
      const f=success(),db=fakeDb(f);
      await expect(commitGate3TerminalDispositionV39(db.pool,{
        ...f,...patch,
      })).rejects.toThrow("GATE3_TERMINAL_OWNER_EXACT_INPUT_REQUIRED");
      expect(db.calls).toEqual([]);
    }
  });
  it("lost COMMIT ACK from success or failure route is HOLD, destroys connection",async()=>{
    for(const status of ["settling","failed"] as const){
      const f=success(),x={
        ...f,result:status==="failed"?{
          ...f.result,status:"failed" as const,
          stopReason:"subscription_delete_failed",
          durationCensored:true,
          reconciliationStatus:"UNRESOLVED" as const,
          externalCredits:null,subscriptionDeleted:false,metrics:null,
        }:{...f.result,status:"settling" as const},
      };
      const db=fakeDb(x,{commitThrows:true});
      await expect(commitGate3TerminalDispositionV39(db.pool,x))
        .rejects.toThrow(/OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED/);
      expect(db.calls.filter(a=>a==="COMMIT")).toHaveLength(1);
      expect(db.released).toEqual([true]);
    }
  });
  it("never resumes automatically from previous terminal FAILED or mismatched scope",async()=>{
    const x=success(),db=fakeDb(x,{state:"FAILED"});
    await expect(commitGate3TerminalDispositionV39(db.pool,x))
      .rejects.toThrow("GATE3_SETTLED_TERMINAL_CONFLICT");
    expect(db.calls).toEqual(["BEGIN","SELECT_SETTLED","ROLLBACK"]);
    expect(db.released).toEqual([false]);
  });
});
