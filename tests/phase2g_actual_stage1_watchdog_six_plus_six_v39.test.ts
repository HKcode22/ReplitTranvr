import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {
  advanceStage1WatchdogV39,
  initialStage1WatchdogStateV39,
  independentOutageWitnessReasonV39,
  STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39,
  STAGE1_SIX_PLUS_SIX_WALL_MS_V39,
  type Stage1IndependentlyVerifiedOutageWitnessV39,
  type Stage1WatchdogStateV39,
  type Stage1CallbackWatchdogModeV39
} from "../scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39";

const transient={
  healthy:false,check:"published_runtime",
  reason:"runtime_contract_or_http_mismatch",
  http_status:503,elapsed_ms:56
} as const;
const healthy={
  healthy:true,check:"all_checks",reason:"ok",
  http_status:200,elapsed_ms:72
} as const;
const knownProof=():Stage1IndependentlyVerifiedOutageWitnessV39=>({
  evidenceVerifiedByIndependentSource:true,
  providerSubscriptionAndOwnerMatched:true,
  oneActiveOwner:true,
  senderAttemptCount:260,originalSourceAttemptCount:260,
  senderBilledCredits:260,originalSourceAttributedCredits:260,
  sourceUtcAndWireShaVerified:true,fullOriginalBytesReadBack:true,
  rawRetentionHours:168,everyPhysicalFlightV2Reconstructible:true,
  originalElapsed15mBucketsPreserved:true,
  currentSenderWatermarkComplete:true,
  receiverUnloggedRestartReconstructible:true,
  currentEvidenceAgeSeconds:2,
  queueBacklogAgeSeconds:22,queueRetentionSeconds:6000,
  providerMaxDeliveryRetries:0,
  projectedWorstCaseTotalCredits:500,frozenCreditCeiling:500
});
function observe(input:{
  mode?:Stage1CallbackWatchdogModeV39;
  failures:number;
  proof?:Stage1IndependentlyVerifiedOutageWitnessV39;
  spacedMs?:number;
  recover?:boolean;
}){
  let state:Stage1WatchdogStateV39=initialStage1WatchdogStateV39();
  const steps=[];const mode=input.mode??"six-plus-six-candidate";
  for(let i=0;i<input.failures;i++){
    const r=advanceStage1WatchdogV39({
      mode,previous:state,health:transient,
      nowMonotonicMs:i*(input.spacedMs??15_000),
      evidence:input.proof
    });
    steps.push(r);state=r.state;
    if(r.action==="STOP_OWNER")break;
  }
  if(input.recover){
    const r=advanceStage1WatchdogV39({
      mode,previous:state,health:healthy,
      nowMonotonicMs:input.failures*(input.spacedMs??15_000),
      evidence:input.proof
    });steps.push(r);
  }
  return {steps,last:steps.at(-1)!,state:steps.at(-1)!.state};
}
const noPaid=(x:ReturnType<typeof observe>["last"])=>{
  expect(x.scientificPassAuthorized).toBe(false);
  expect(x.paidLaunchAuthorized).toBe(false);
};
describe("P15 real supervisor 6+6 source-proof-gated controller (zero provider calls)",()=>{
  it("actual supervisor imports the controller and defaults to legacy three-strike, never source-proof from ENV",()=>{
    const source=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
    expect(source).toContain("advanceStage1WatchdogV39({");
    expect(source).toContain('process.env.V39_PHASE2G_CALLBACK_WATCHDOG_POLICY ?? "legacy-three"');
    expect(source).toContain("evidence:undefined");
    expect(source).toContain("CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3");
    expect(source).toContain("workspace_watchdog_internal_failure");
    expect(source).toContain("source_proof_implemented: false");
    expect(source).not.toContain("process.env.V39_P2G_TRUSTED_WITNESS_JSON");
  });
  it("legacy default stops at THIRD consecutive 503 even with no source proof",()=>{
    const r=observe({mode:"legacy-three",failures:4});
    expect(r.steps).toHaveLength(3);
    expect(r.last).toMatchObject({
      action:"STOP_OWNER",reason:"LEGACY_THREE_CONSECUTIVE_CALLBACK_FAILURES",
      state:{consecutiveFailures:3,terminated:true}
    });
    noPaid(r.last);
  });
  it("default legacy wrong secret / bad build contract still uses historical three failed checks, not changed by 6+6 integration",()=>{
    const hard={
      healthy:false,check:"published_runtime",
      reason:"runtime_contract_or_http_mismatch",
      http_status:200,elapsed_ms:3
    } as const;
    let p=initialStage1WatchdogStateV39();
    for(let i=0;i<3;i++){
      const r=advanceStage1WatchdogV39({
        mode:"legacy-three",previous:p,health:hard,
        nowMonotonicMs:i*15_000
      });p=r.state;
      expect(r.action).toBe(i===2?"STOP_OWNER":"MONITOR");
    }
  });
  it("candidate selected without independent evidence FAILS CLOSED by third 503, not falsely 12",()=>{
    const r=observe({failures:12});
    expect(r.steps).toHaveLength(3);
    expect(r.last.reason).toBe("NO_EXTENSION_WITHOUT_AUTHENTICATED_SOURCE_AND_CREDITS");
    expect(r.last.state.terminated).toBe(true);
    noPaid(r.last);
  });
  it("candidate with separately VERIFIED synthetic fixture evidence recovers at check 12 after 11 soft failures: never scientific pass",()=>{
    const r=observe({failures:11,proof:knownProof(),recover:true});
    expect(r.steps).toHaveLength(12);
    expect(r.steps[5].phase).toBe("PRIMARY");
    expect(r.steps[6].phase).toBe("CONTINGENT");
    expect(r.steps[10].phase).toBe("CONTINGENT");
    expect(r.steps[10].independentSourceProvenForThisCheck).toBe(true);
    expect(r.last).toMatchObject({
      phase:"HEALTHY",action:"MONITOR",
      reason:"HEALTH_RECOVERED_SCIENTIFIC_AUDIT_STILL_PENDING",
      state:{consecutiveFailures:0,maximumFailures:11,
        recoveredHealthAwaitingScienceAudit:true,terminated:false}
    });
    noPaid(r.last);
  });
  it("twelve consecutive 503 stops; a later fake green response cannot revive a terminated owner",()=>{
    const r=observe({failures:12,proof:knownProof()});
    expect(STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39).toBe(12);
    expect(r.steps).toHaveLength(12);
    expect(r.last.reason).toBe("TWELVE_CONSECUTIVE_HEALTH_FAILURES");
    expect(r.last.state.terminated).toBe(true);
    const next=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:r.state,health:healthy,
      nowMonotonicMs:190_000,evidence:knownProof()
    });
    expect(next).toMatchObject({
      action:"STOP_OWNER",reason:"ALREADY_TERMINATED"
    });
    noPaid(r.last);
  });
  it("actual MONOTONIC WALL time stops early regardless of polling count if checks overrun 180 seconds",()=>{
    expect(STAGE1_SIX_PLUS_SIX_WALL_MS_V39).toBe(180_000);
    const r=observe({failures:6,proof:knownProof(),spacedMs:40_000});
    expect(r.last).toMatchObject({
      action:"STOP_OWNER",
      reason:"SIX_PLUS_SIX_WALL_CLOCK_MAX_EXCEEDED"
    });
    expect(r.steps.length).toBe(6);
  });
  it("verified fixture source detects 260 vs 259 attempt gap on very first outage observation",()=>{
    const proof={...knownProof(),originalSourceAttemptCount:259};
    expect(independentOutageWitnessReasonV39(proof))
      .toBe("SOURCE_WITNESS_PROVIDER_ATTEMPT_OR_CREDIT_GAP");
    const r=observe({failures:5,proof});
    expect(r.steps).toHaveLength(1);
    expect(r.last.reason).toBe("SOURCE_WITNESS_PROVIDER_ATTEMPT_OR_CREDIT_GAP");
  });
  it("billing mismatch at same attempt count stops immediately",()=>{
    const r=observe({failures:5,proof:{
      ...knownProof(),originalSourceAttributedCredits:259
    }});
    expect(r.last.reason).toBe("SOURCE_WITNESS_PROVIDER_ATTEMPT_OR_CREDIT_GAP");
    expect(r.steps).toHaveLength(1);
  });
  it("false signer trust flag can't extend outage",()=>{
    const r=observe({failures:5,proof:{
      ...knownProof(),evidenceVerifiedByIndependentSource:false
    }});
    expect(r.last.reason)
      .toBe("INDEPENDENT_PROVIDER_SOURCE_EVIDENCE_NOT_VERIFIED");
    expect(r.steps).toHaveLength(1);
  });
  it("wrong owner, stale source, missing original wire, loss of physical-v2, expired queue or budget each causes hard STOP without waiting 12",()=>{
    const cases=[
      ["SOURCE_WITNESS_OWNER_OR_PROVIDER_SUBSCRIPTION_MISMATCH",{
        providerSubscriptionAndOwnerMatched:false}],
      ["SOURCE_WITNESS_OWNER_OR_PROVIDER_SUBSCRIPTION_MISMATCH",{
        oneActiveOwner:false}],
      ["SOURCE_WITNESS_CURRENT_PROVIDER_WATERMARK_STALE",{
        currentEvidenceAgeSeconds:31}],
      ["SOURCE_WITNESS_ORIGINAL_RAW_OR_UTC_LOST",{
        fullOriginalBytesReadBack:false}],
      ["SOURCE_WITNESS_ORIGINAL_RAW_OR_UTC_LOST",{rawRetentionHours:167}],
      ["SOURCE_WITNESS_SCIENTIFIC_RECOVERY_INCOMPLETE",{
        everyPhysicalFlightV2Reconstructible:false}],
      ["SOURCE_WITNESS_SCIENTIFIC_RECOVERY_INCOMPLETE",{
        originalElapsed15mBucketsPreserved:false}],
      ["SOURCE_WITNESS_SCIENTIFIC_RECOVERY_INCOMPLETE",{
        receiverUnloggedRestartReconstructible:false}],
      ["SOURCE_WITNESS_BACKLOG_EXPIRED_OR_UNBOUNDED",{
        queueBacklogAgeSeconds:6000}],
      ["SOURCE_WITNESS_BUDGET_BOUND_EXCEEDED",{
        projectedWorstCaseTotalCredits:501}],
      ["SOURCE_WITNESS_SCHEMA_OR_PROVIDER_RETRY_CONTRACT_INVALID",{
        providerMaxDeliveryRetries:1}]
    ] as const;
    for(const [reason,mutate] of cases){
      const result=observe({failures:3,
        proof:{...knownProof(),...mutate} as Stage1IndependentlyVerifiedOutageWitnessV39});
      expect(result.steps).toHaveLength(1);
      expect(result.last).toMatchObject({reason,action:"STOP_OWNER"});
      noPaid(result.last);
    }
  });
  it("hard callback mismatch stops enhanced mode immediately even with independently signed synthetic fixture",()=>{
    const result=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",
      previous:initialStage1WatchdogStateV39(),
      health:{...transient,http_status:200},
      nowMonotonicMs:0,evidence:knownProof()
    });
    expect(result.reason).toBe("HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION");
    expect(result.action).toBe("STOP_OWNER");
  });
  it("unbounded or reversed monotonic observation gets rejected, cannot forge 12 grace",()=>{
    const start=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",
      previous:initialStage1WatchdogStateV39(),
      health:transient,nowMonotonicMs:5000,evidence:knownProof()
    });
    expect(()=>advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:start.state,
      health:transient,nowMonotonicMs:4000,evidence:knownProof()
    })).toThrow("P15_WATCHDOG_INVALID_OR_NONMONOTONIC_STATE");
  });
  it("six plus six never mutates provider retries, bills credits or grants paid owner authority",()=>{
    const r=observe({failures:10,proof:knownProof()});
    expect(r.last.action).toBe("MONITOR");
    expect(r.last.phase).toBe("CONTINGENT");
    expect(r.last.independentSourceProvenForThisCheck).toBe(true);
    noPaid(r.last);
  });
});
