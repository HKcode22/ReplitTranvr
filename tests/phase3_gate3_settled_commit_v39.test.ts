import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import pg from "pg";
import type {Pool} from "pg";
import {
  commitGate3SettledCandidateV39,
  type Gate3SettledCommitInputV39,
} from "../server/lib/disruption/gate3CanarySettledCommit_v39";
import {assessGate3CanaryTerminalV39}
  from "../server/lib/disruption/gate3CanaryTerminalAssessment_v39";

const sha="a".repeat(64);
const at=new Date("2026-10-20T17:00:00Z");
const later=new Date("2026-10-20T17:05:00Z");
function fixture():Gate3SettledCommitInputV39{
  const id=randomUUID();
  return {
    sessionId:id,icao:"YSSY",authorizationEvidenceSha256:sha,
    assessment:{
      expectedSessionId:id,canaryCreditCeiling:20,fixedExposureSeconds:300,
      sourceReadbackVerified:true,publishedReceiverParityVerified:true,
      foreignActiveBillableCount:0,
      result:{
        status:"settling",runtimeSessionId:id,
        windowStart:at,windowEnd:later,
        durationCensored:false,stopReason:null,
        reconciliationStatus:"MATCH",
        externalCredits:5,internalSendCredits:5,
        maxObservedUnsettledCreditGap:0,settlementReads:4,
        metrics:{
          rowsDelivered:3,uniqueFlights:3,tailChainLinks:0,
          internalSendCredits:5,confirmedUniqueLower:3,
          confirmedPlusAmbiguousUpper:3,ambiguousUnknown:0,
          firstObservationMs:[],deliveryCount:3,notificationItemsReceived:5,
          explicitCostDeliveryCount:3,fallbackDeliveryCount:0,
          costItemDisagreementCount:0,callbackRequestsSeen:3,
          callbackSuccess2xx:3,callbackFailures:0,
        },
        cleanupVerifiedAtUtc:null,subscriptionDeleted:true,
      },
    },
  };
}
function fakePool(x:Gate3SettledCommitInputV39,o?:{
  missing?:boolean;state?:"PREPARED"|"SETTLED"|"FAILED";
  mismatchScope?:boolean;commitFails?:boolean;beginFails?:boolean;
  selectFails?:boolean;updateFails?:boolean;rollbackFails?:boolean;
  connectFails?:boolean;replayDigestConflict?:boolean;
}){
  const calls:string[]=[];
  const releases:boolean[]=[];
  const candidate=assessGate3CanaryTerminalV39(x.assessment);
  const client={
    async query(sql:string){
      const name=sql.startsWith("SELECT icao")?"SELECT":
        sql.startsWith("UPDATE clean.phase3")?"UPDATE":sql;
      calls.push(name);
      if(name==="BEGIN"&&o?.beginFails)throw Error("BEGIN_ACK_LOST");
      if(name==="SELECT"&&o?.selectFails)throw Error("READ_FAIL");
      if(name==="UPDATE"&&o?.updateFails)throw Error("UPDATE_FAIL");
      if(name==="COMMIT"&&o?.commitFails)throw Error("COMMIT_ACK_LOST");
      if(name==="ROLLBACK"&&o?.rollbackFails)throw Error("ROLLBACK_ACK_LOST");
      if(name==="SELECT"){
        return o?.missing?{rowCount:0,rows:[]}:{
          rowCount:1,rows:[{
            icao:o?.mismatchScope?"WSSS":x.icao,
            authorization_evidence_sha256:x.authorizationEvidenceSha256,
            canary_credit_ceiling:x.assessment.canaryCreditCeiling,
            fixed_exposure_seconds:x.assessment.fixedExposureSeconds,
            state:o?.state??"PREPARED",
            exact_reconciliation_verified:true,
            internal_received_credits:5,stable_read_count:4,
            owned_subscription_delete_verified:true,
            foreign_billable_count:0,
            evidence_sha256:o?.replayDigestConflict?"b".repeat(64):
              candidate.safeMetadataDigestSha256,
            failure_reason:null,
          }],
        };
      }
      return {rowCount:1,rows:[{session_id:x.sessionId}]};
    },
    release(discard?:boolean){releases.push(discard===true);},
  };
  const pool={connect:async()=>{if(o?.connectFails)throw Error("CONNECT_LOST");return client;}} as unknown as Pick<Pool,"connect">;
  return {pool,calls,releases};
}

describe("Gate3 immutable LOGGED SETTLED candidate — provider-free SQL transaction",()=>{
  it("requires a successful assessment BEFORE acquiring any PG connection",async()=>{
    for(const patch of [
      {sourceReadbackVerified:false},
      {publishedReceiverParityVerified:false},
      {foreignActiveBillableCount:1},
    ]){
      const x=fixture();
      x.assessment={...x.assessment,...patch};
      const h=fakePool(x);
      await expect(commitGate3SettledCandidateV39(h.pool,x))
        .rejects.toThrow("GATE3_SETTLED_CANDIDATE_ASSESSMENT_HOLD");
      expect(h.calls).toEqual([]);
    }
    const wrong=fixture();
    wrong.assessment.result.externalCredits=7;
    await expect(commitGate3SettledCandidateV39(fakePool(wrong).pool,wrong))
      .rejects.toThrow("GATE3_SETTLED_CANDIDATE_ASSESSMENT_HOLD");
  });
  it("COMMIT ACK only -> SQL durable candidate, not a live paid certificate",async()=>{
    const x=fixture(),h=fakePool(x);
    const r=await commitGate3SettledCandidateV39(h.pool,x);
    expect(h.calls).toEqual(["BEGIN","SELECT","UPDATE","COMMIT"]);
    expect(h.releases).toEqual([false]);
    expect(r).toMatchObject({
      disposition:"COMMITTED_SETTLED_CANDIDATE",committed:true,
      liveGate3Certified:false,providerAuthenticityVerifiedHere:false,
      signedOperatorAuthorizationVerifiedHere:false,
      authorizesAnotherPaidRun:false,
      confirmsRetainedOriginalsDeleted:false,providerCalls:0,
    });
    expect(r.safeMetadataDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("identical terminal replay READs and COMMITs, never modifies terminal owner",async()=>{
    const x=fixture(),h=fakePool(x,{state:"SETTLED"});
    const r=await commitGate3SettledCandidateV39(h.pool,x);
    expect(r.disposition).toBe("ALREADY_IDENTICAL_SETTLED_CANDIDATE");
    expect(h.calls).toEqual(["BEGIN","SELECT","COMMIT"]);
    expect(h.releases).toEqual([false]);
  });
  it("FAILED terminal owner and conflicting SETTLED receipt never convert or overwrite",async()=>{
    for(const o of [
      {state:"FAILED" as const},{state:"SETTLED" as const,replayDigestConflict:true},
      {mismatchScope:true},{missing:true},
    ]){
      const x=fixture(),h=fakePool(x,o);
      await expect(commitGate3SettledCandidateV39(h.pool,x)).rejects.toThrow();
      expect(h.calls).not.toContain("UPDATE");
      expect(h.calls.at(-1)).toBe("ROLLBACK");
      expect(h.releases).toEqual([false]);
    }
  });
  it("lost COMMIT ACK discards pooled connection; no second COMMIT or automatic retry",async()=>{
    const x=fixture(),h=fakePool(x,{commitFails:true});
    await expect(commitGate3SettledCandidateV39(h.pool,x))
      .rejects.toThrow("GATE3_SETTLED_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(h.calls).toEqual(["BEGIN","SELECT","UPDATE","COMMIT"]);
    expect(h.releases).toEqual([true]);
  });
  it("SQL fault rolls back normally, unknown rollback/BEGIN discards PG connection",async()=>{
    for(const o of [{selectFails:true},{updateFails:true}]){
      const x=fixture(),h=fakePool(x,o);
      await expect(commitGate3SettledCandidateV39(h.pool,x)).rejects.toThrow();
      expect(h.calls.at(-1)).toBe("ROLLBACK");
      expect(h.releases).toEqual([false]);
    }
    for(const o of [{beginFails:true},{updateFails:true,rollbackFails:true}]){
      const x=fixture(),h=fakePool(x,o);
      await expect(commitGate3SettledCandidateV39(h.pool,x)).rejects.toThrow();
      expect(h.releases).toEqual([true]);
    }
  });
  it("connect fails HOLD; invalid scope rejects before SQL",async()=>{
    const x=fixture(),h=fakePool(x,{connectFails:true});
    await expect(commitGate3SettledCandidateV39(h.pool,x))
      .rejects.toThrow("GATE3_SETTLED_COMMIT_CONNECT_FAILED_HOLD");
    expect(h.calls).toEqual([]);
    for(const patch of [
      {icao:"WSS"},{authorizationEvidenceSha256:"invalid"},
      {sessionId:randomUUID()},
    ]){
      const h2=fakePool(x);
      await expect(commitGate3SettledCandidateV39(h2.pool,{...x,...patch}))
        .rejects.toThrow("GATE3_SETTLED_CANDIDATE_SCOPE_INVALID");
      expect(h2.calls).toEqual([]);
    }
  });
});

const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true"&&
    ["localhost","127.0.0.1"].includes(u.hostname)&&
    u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const pgSuite=local?describe:describe.skip;
pgSuite("Gate3 SETTLED candidate real disposable PG immutable commit",()=>{
  it("acknowledged COMMIT persists state, replay identical, conflicting terminal refuses",async()=>{
    const p=new pg.Pool({connectionString:url,connectionTimeoutMillis:8000,max:2});
    const x=fixture();
    try{
      await p.query(`INSERT INTO clean.phase3_gate3_canary_owner_v39
        (session_id,icao,authorization_evidence_sha256,
         canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
        VALUES ($1,$2,$3,$4,$5,now()+interval '1 hour')`,
        [x.sessionId,x.icao,x.authorizationEvidenceSha256,
         x.assessment.canaryCreditCeiling,x.assessment.fixedExposureSeconds]);
      const committed=await commitGate3SettledCandidateV39(p,x);
      expect(committed.disposition).toBe("COMMITTED_SETTLED_CANDIDATE");
      const row=await p.query(`SELECT state,exact_reconciliation_verified,
        internal_received_credits,stable_read_count,
        owned_subscription_delete_verified,foreign_billable_count,
        evidence_sha256,terminal_at_utc
        FROM clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1`,
        [x.sessionId]);
      expect(row.rows[0]).toMatchObject({
        state:"SETTLED",exact_reconciliation_verified:true,
        internal_received_credits:5,stable_read_count:4,
        owned_subscription_delete_verified:true,foreign_billable_count:0,
        evidence_sha256:committed.safeMetadataDigestSha256,
      });
      expect(row.rows[0].terminal_at_utc).toBeTruthy();
      expect((await commitGate3SettledCandidateV39(p,x)).disposition)
        .toBe("ALREADY_IDENTICAL_SETTLED_CANDIDATE");
      const conflict=fixture();
      conflict.sessionId=x.sessionId;
      conflict.assessment.expectedSessionId=x.sessionId;
      conflict.assessment.result.runtimeSessionId=x.sessionId;
      conflict.assessment.result.settlementReads=5;
      await expect(commitGate3SettledCandidateV39(p,conflict))
        .rejects.toThrow("GATE3_SETTLED_TERMINAL_CONFLICT");
      await expect(p.query(`UPDATE clean.phase3_gate3_canary_owner_v39
        SET internal_received_credits=6 WHERE session_id=$1`,[x.sessionId]))
        .rejects.toThrow(/immutable/);
    }finally{await p.end();}
  },30000);
});
