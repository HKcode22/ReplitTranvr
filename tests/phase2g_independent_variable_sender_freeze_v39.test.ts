import {generateKeyPairSync} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
  signP20FrozenSenderScheduleV39,
  assessIndependentlyPinnedP20RehearsalV39,
  p20SenderPublicFingerprintV39,
  p20FrozenSenderPlanSha256V39,
  type P20FrozenSyntheticScheduleV39
} from "../experiments/phase2g_rehearsal/independent_variable_sender_freeze_v39";
import type {P20VariableRateFixtureV39} from "../experiments/phase2g_rehearsal/variable_rate_wallclock_audit_v39";

const {privateKey,publicKey}=generateKeyPairSync("ed25519");
const publicPem=publicKey.export({type:"spki",format:"pem"}).toString();
const pin=p20SenderPublicFingerprintV39(publicPem);
const SHA="d".repeat(64),ownerSHA="e".repeat(64);
const start=Date.parse("2026-10-12T03:00:00.000Z");
const utc=(ms:number)=>new Date(start+ms).toISOString();

function setup(){
  const plan:P20FrozenSyntheticScheduleV39={
    schema:"v39.phase2g.synthetic-pre-run-variable-rate-schedule.v1",
    mode:"synthetic-only",sender:"isolated-provider-emulator",
    ownerFrozenRunSha256:ownerSHA,
    frozenAtUtc:utc(-15*60_000),
    windowStartUtc:utc(0),windowEndUtc:utc(7_200_000),
    attempts:[
      {attemptId:"fixture-first",sentUtc:utc(61_000),
        sourceWireSha256:SHA,syntheticCostCredits:1},
      {attemptId:"fixture-last",sentUtc:utc(6_610_000),
        sourceWireSha256:SHA,syntheticCostCredits:1}
    ]
  };
  const signed=signP20FrozenSenderScheduleV39(plan,privateKey);
  const attempts=plan.attempts.map(x=>({
    ...x,senderStatus:200,senderElapsedMs:350
  }));
  const edge=attempts.map(x=>({
    attemptId:x.attemptId,originalUtc:utc(Date.parse(x.sentUtc)-start+100),
    sourceWireSha256:SHA,completeBytesDurablyAccepted:true,
    authenticatedSyntheticReceipt:true
  }));
  const observed:P20VariableRateFixtureV39={
    mode:"synthetic-only",ownerWindowStartUtc:plan.windowStartUtc,
    ownerWindowEndUtc:plan.windowEndUtc,
    monotonicStartMs:2000,monotonicEndMs:7_202_000,
    realProviderCalls:0,cloudResourcesCreated:0,scientificDatabaseWrites:0,
    cleanupAttested:true,ownerExitedCleanly:true,
    minutes:Array.from({length:120},(_,minute)=>({
      minute,ownerUtc:utc(minute*60_000),
      receiverUtc:utc(minute*60_000+150),
      monotonicMs:2000+minute*60_000,
      receiverReady:true,ownerAlive:true
    })),
    preplannedSenderAttempts:attempts,
    observedEdgeAttempts:edge,
    observedInternalAttempts:edge.map(x=>({
      attemptId:x.attemptId,originalUtc:x.originalUtc,
      sourceWireSha256:SHA,rawObjectSha256ReadbackVerified:true,
      rawRetentionHours:168
    }))
  };
  return {
    plan,signed,observed,
    args:{
      signed,senderPublicPem:publicPem,
      pinnedSenderPublicFingerprint:pin,
      independentlyPinnedOwnerRunSha256:ownerSHA,
      independentlyPinnedScheduleSha256:p20FrozenSenderPlanSha256V39(plan),
      observed
    }
  };
}

describe("Phase2G synthetic pre-run independent sender plan pin (no paid calls)",()=>{
  it("accepts two unevenly spaced callbacks with full 120m heartbeats and independent Ed25519 pre-plan",()=>{
    const s=setup();
    const d=assessIndependentlyPinnedP20RehearsalV39(s.args);
    expect(d.infrastructureFixtureConsistent,d.errors.join(",")).toBe(true);
    expect(d.senderAttemptCount).toBe(2);
    expect(d.monitoringMinuteBuckets).toEqual([15,15,15,15,15,15,15,15]);
    expect(d.scientificPassAuthorized).toBe(false);
    expect(d.wallClockHostContinuityProven).toBe(false);
  });
  it("rejects a retrospectively changed sender timetable even if current receiver ledgers match it",()=>{
    const s=setup();
    const retconned={...s.observed,
      preplannedSenderAttempts:s.observed.preplannedSenderAttempts.map((x,i)=>
        i===0?{...x,sentUtc:utc(120_000)}:x)
    };
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,observed:retconned
    })).toThrow("P20_POST_RUN_PLAN_RECONSTRUCTION_OR_WINDOW_SHIFT");
  });
  it("rejects swapped sender attempt identities, changed content hash or credit count",()=>{
    const s=setup();
    const bad=s.observed.preplannedSenderAttempts.map((x,i)=>
      i===0?{...x,sourceWireSha256:"a".repeat(64)}:x);
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,observed:{...s.observed,preplannedSenderAttempts:bad}
    })).toThrow("P20_POST_RUN_PLAN_RECONSTRUCTION_OR_WINDOW_SHIFT");
  });
  it("rejects forged pre-run signature and incorrect pinned signer public key",()=>{
    const s=setup();
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,signed:{...s.signed,signatureBase64:"A".repeat(86)+"=="}
    })).toThrow("P20_PRE_RUN_INDEPENDENT_SENDER_SIGNATURE_INVALID");
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,pinnedSenderPublicFingerprint:"f".repeat(64)
    })).toThrow("P20_INDEPENDENT_SIGNER_KEY_PIN_MISMATCH");
  });
  it("requires sender freeze strictly BEFORE the 120min observation begins",()=>{
    const s=setup();
    expect(()=>signP20FrozenSenderScheduleV39({
      ...s.plan,frozenAtUtc:s.plan.windowStartUtc
    },privateKey)).toThrow("P20_PLAN_WAS_NOT_FROZEN_BEFORE_120M_WINDOW");
  });
  it("rejects substituted plan or run identity despite having an internally valid new signature",()=>{
    const s=setup();
    const altered={...s.plan,attempts:s.plan.attempts.map((a,i)=>i===0?
      {...a,attemptId:"new-after-run"}:a)};
    const newlySigned=signP20FrozenSenderScheduleV39(altered,privateKey);
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,signed:newlySigned
    })).toThrow("P20_INDEPENDENT_OWNER_OR_PREPLAN_SHA_MISMATCH");
    expect(()=>assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,independentlyPinnedOwnerRunSha256:"1".repeat(64)
    })).toThrow("P20_INDEPENDENT_OWNER_OR_PREPLAN_SHA_MISMATCH");
  });
  it("rejects duplicate planned ID and sender event outside 120m window",()=>{
    const s=setup();
    const duplicate={...s.plan,attempts:[
      s.plan.attempts[0],s.plan.attempts[0]]};
    expect(()=>signP20FrozenSenderScheduleV39(duplicate,privateKey))
      .toThrow("P20_SIGNED_PRE_RUN_ATTEMPT_INVALID_OR_DUPLICATE");
    const out={...s.plan,attempts:[
      s.plan.attempts[0],{...s.plan.attempts[1],sentUtc:utc(7_200_000)}]};
    expect(()=>signP20FrozenSenderScheduleV39(out,privateKey))
      .toThrow("P20_SIGNED_PRE_RUN_ATTEMPT_TIME_UNFROZEN");
  });
  it("even a verified plan refuses an actual synthetic sender timeout or missing HTTP 200",()=>{
    const s=setup();const bad=s.observed.preplannedSenderAttempts.map((x,i)=>
      i===0?{...x,senderStatus:503,senderElapsedMs:10001}:x);
    const result=assessIndependentlyPinnedP20RehearsalV39({
      ...s.args,observed:{...s.observed,preplannedSenderAttempts:bad}
    });
    expect(result.infrastructureFixtureConsistent).toBe(false);
    expect(result.errors).toContain("P20_PROVIDER_EMULATOR_ACK_FAILURE");
  });
});
