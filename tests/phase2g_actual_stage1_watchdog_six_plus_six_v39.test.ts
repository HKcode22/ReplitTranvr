import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import ts from "typescript";
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
  eachSenderAttemptMatchedByImmutableIdentity:true,
  eachSenderAttemptFlightItemCreditsMatched:true,
  noUnattributedOrDuplicateBillableAttempts:true,
  sourceUtcAndWireShaVerified:true,fullOriginalBytesReadBack:true,
  rawRetentionHours:168,everyPhysicalFlightV2Reconstructible:true,
  originalElapsed15mBucketsPreserved:true,
  currentSenderWatermarkComplete:true,
  receiverUnloggedRestartReconstructible:true,
  currentEvidenceAgeSeconds:2,
  queueBacklogAgeSeconds:22,queueRetentionSeconds:6000,
  providerMaxDeliveryRetries:0,
  projectedWorstCaseTotalCredits:500,frozenCreditCeiling:500,
  frozenMaxOutageEpisodes:2,
  frozenMaxCumulativeOutageEnvelopeMs:180_000
});
function observe(input:{
  mode?:Stage1CallbackWatchdogModeV39;
  failures:number;
  proof?:Stage1IndependentlyVerifiedOutageWitnessV39;
  spacedMs?:number;
  recover?:boolean;
}){
  let state:Stage1WatchdogStateV39=initialStage1WatchdogStateV39();
  const steps=[];const mode=input.mode??"six-plus-six";
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
describe("P25 effective live 6+6 owner controller (zero provider calls)",()=>{
  it("P15 paid supervisor heartbeat and watch logs expose aggregate outage budget without source IDs",()=>{
    const src=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
    expect(src).toContain("callback_outage_episodes_observed:watchdogState.outageEpisodeCount");
    expect(src).toContain("callback_closed_outage_envelope_ms:watchdogState.closedOutageEnvelopeMs");
    expect(src).toContain("outage_episodes_observed:watchdogState.outageEpisodeCount");
    expect(src).toContain("closed_outage_envelope_ms:watchdogState.closedOutageEnvelopeMs");
    expect(src).toContain("callback_watchdog_source_proof_implemented: false");
    expect(src).toContain("evidence:undefined");
  });
  it("REAL paid supervisor defaults to effective 6+6 and forbids fallback to legacy three",()=>{
    const source=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
    expect(source).toContain('process.env.V39_PHASE2G_CALLBACK_WATCHDOG_POLICY ?? "six-plus-six"');
    expect(source).toContain('if(requestedWatchdogMode!=="six-plus-six")');
    expect(source).toContain("SUPERVISOR_REFUSED:STAGE1_WATCHDOG_POLICY_MUST_BE_SIX_PLUS_SIX");
    expect(source).toContain("STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39");
    expect(source).toContain("effective_failure_limit:CALLBACK_CONSECUTIVE_FAILURE_LIMIT");
    expect(source).toContain("callback_watchdog_max_cumulative_outage_ms:STAGE1_SIX_PLUS_SIX_MAX_CUMULATIVE_MS_V39");
    expect(source).toContain("evidence:undefined");
    expect(source).not.toContain("SIX_PLUS_SIX_AUTHENTICATED_VERIFIER_NOT_DEPLOYED");
    expect(source).not.toContain("V39_P2G_TRUSTED_WITNESS_JSON");
  });
  it("sender/source audit remains unresolved on healed GETs and cannot grant scientific PASS",()=>{
    const x=observe({failures:11,recover:true});
    expect(x.steps).toHaveLength(12);
    expect(x.steps[5].phase).toBe("PRIMARY");
    expect(x.steps[6].phase).toBe("CONTINGENT");
    expect(x.last).toMatchObject({
      action:"MONITOR",phase:"HEALTHY",
      reason:"HEALTH_RECOVERED_SCIENTIFIC_AUDIT_STILL_PENDING",
      state:{recoveredHealthAwaitingScienceAudit:true,
        closedOutageEnvelopeMs:165_000,terminated:false}
    });
    noPaid(x.last);
  });
  it("500 startup HTTP health errors count as recoverable, not source-verified",()=>{
    let p=initialStage1WatchdogStateV39();
    for(let i=0;i<3;i++){
      const x=advanceStage1WatchdogV39({
        mode:"six-plus-six",previous:p,
        health:{...transient,http_status:500},
        nowMonotonicMs:i*15_000
      });p=x.state;
      expect(x.action).toBe("MONITOR");
    }
    expect(p.consecutiveFailures).toBe(3);
    expect(p.recoveredHealthAwaitingScienceAudit).toBe(true);
  });
  it("actual paid supervisor's four-stage callback health has independent 40-second kill timer with guaranteed cleanup",()=>{
    const source=readFileSync(join(process.cwd(),
      "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
    const ast=ts.createSourceFile("supervisor.ts",source,
      ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    let watchdog:ts.CallExpression|undefined;
    function visit(n:ts.Node):void{
      if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==="callbackWatchdog"&&
         n.initializer&&ts.isCallExpression(n.initializer)&&
         n.initializer.expression.getText(ast)==="setInterval")
        watchdog=n.initializer;
      ts.forEachChild(n,visit);
    }
    visit(ast);
    expect(watchdog).toBeDefined();
    const src=watchdog!.getText(ast);
    expect(source).toContain("CALLBACK_HEALTH_CYCLE_HARD_DEADLINE_MS = 40_000");
    expect(src).toContain("const healthCycleDeadline = setTimeout(");
    expect(src).toContain('requestTermination("SIGTERM", "workspace_callback_health_cycle_hard_timeout")');
    expect(src).toContain("healthCycleDeadline.unref()");
    expect(src).toContain("clearTimeout(healthCycleDeadline)");
    expect(src).toContain("callbackCheckInFlight = false");
    expect(src).toContain("if (callbackCheckInFlight || child.exitCode !== null || child.killed) return");
    expect(src).toContain("advanceStage1WatchdogV39({");
    // A scheduled timeout cannot be replaced by checking elapsed time only
    // after a potentially hung callbackHealthy() promise resolves.
    expect(src.indexOf("const healthCycleDeadline = setTimeout("))
      .toBeLessThan(src.indexOf("await callbackHealthy("));
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
  it("6+6 without independent source witness stops on twelfth health failure, not third",()=>{
    const r=observe({failures:12});
    expect(r.steps).toHaveLength(12);
    expect(r.steps[5].phase).toBe("PRIMARY");
    expect(r.steps[6].phase).toBe("CONTINGENT");
    expect(r.last.reason).toBe("TWELVE_CONSECUTIVE_HEALTH_FAILURES");
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
  it("P14 same overall count and credit total STILL stops for offsetting per-attempt 5/4 vs 4/5",()=>{
    const proof={...knownProof(),
      senderAttemptCount:2,originalSourceAttemptCount:2,
      senderBilledCredits:9,originalSourceAttributedCredits:9,
      // Synthetic signed sender: item credits [5,4]
      // Synthetic receipt/readback:  item credits [4,5]
      eachSenderAttemptFlightItemCreditsMatched:false
    };
    expect(independentOutageWitnessReasonV39(proof))
      .toBe("SOURCE_WITNESS_PER_ATTEMPT_ITEM_CREDITS_OR_IDENTITY_GAP");
    const result=observe({failures:9,proof});
    expect(result.steps).toHaveLength(1);
    expect(result.last).toMatchObject({
      action:"STOP_OWNER",reason:"SOURCE_WITNESS_PER_ATTEMPT_ITEM_CREDITS_OR_IDENTITY_GAP",
      scientificPassAuthorized:false,paidLaunchAuthorized:false
    });
  });
  it("P15 summary-equal duplicated, forged or missing attempt identities cannot extend the 3-strike limit",()=>{
    for(const wrong of [
      {eachSenderAttemptMatchedByImmutableIdentity:false},
      {noUnattributedOrDuplicateBillableAttempts:false},
      {eachSenderAttemptMatchedByImmutableIdentity:undefined},
      {eachSenderAttemptFlightItemCreditsMatched:undefined}
    ]){
      const proof={...knownProof(),...wrong} as Stage1IndependentlyVerifiedOutageWitnessV39;
      const result=observe({failures:4,proof});
      expect(result.steps).toHaveLength(1);
      expect(result.last).toMatchObject({
        action:"STOP_OWNER",reason:"SOURCE_WITNESS_PER_ATTEMPT_ITEM_CREDITS_OR_IDENTITY_GAP"
      });
    }
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
  it("return to green after 1 failure without sender evidence continues but audit remains pending",()=>{
    const r=observe({failures:1,recover:true});
    expect(r.steps).toHaveLength(2);
    expect(r.last).toMatchObject({
      action:"MONITOR",
      reason:"HEALTH_RECOVERED_SCIENTIFIC_AUDIT_STILL_PENDING",
      state:{terminated:false,recoveredHealthAwaitingScienceAudit:true}
    });
    noPaid(r.last);
  });
  it("a healthy-looking response after 180s cannot bypass bounded 6+6 wall-clock censorship",()=>{
    const prior=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",
      previous:initialStage1WatchdogStateV39(),
      health:transient,nowMonotonicMs:1000,evidence:knownProof()
    });
    const recovered=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",
      previous:prior.state,health:healthy,
      nowMonotonicMs:181000,evidence:knownProof()
    });
    expect(recovered).toMatchObject({
      action:"STOP_OWNER",reason:"SIX_PLUS_SIX_WALL_CLOCK_MAX_EXCEEDED"
    });
    noPaid(recovered);
  });
  it("P15 freezes signed max-episodes and cumulative budget; future witness cannot increase either midrun",()=>{
    for(const changed of [
      {frozenMaxOutageEpisodes:3},
      {frozenMaxCumulativeOutageEnvelopeMs:420_000}
    ]){
      const original=knownProof();
      const initial=advanceStage1WatchdogV39({
        mode:"six-plus-six-candidate",
        previous:initialStage1WatchdogStateV39(),
        health:transient,nowMonotonicMs:1000,evidence:original
      });
      expect(initial.state.frozenMaxOutageEpisodes).toBe(2);
      expect(initial.state.frozenMaxCumulativeOutageEnvelopeMs).toBe(180_000);
      const next=advanceStage1WatchdogV39({
        mode:"six-plus-six-candidate",previous:initial.state,
        health:transient,nowMonotonicMs:16_000,
        evidence:{...original,...changed}
      });
      expect(next.action).toBe("STOP_OWNER");
      expect(next.reason).toBe("FROZEN_OUTAGE_RISK_POLICY_CHANGED");
    }
  });
  it("P15 default three-strike never accepts an unsigned witness as a way to change the active safety policy",()=>{
    const initial=initialStage1WatchdogStateV39();
    const first=advanceStage1WatchdogV39({
      mode:"legacy-three",previous:initial,
      health:transient,nowMonotonicMs:0
    });
    expect(first.state.frozenMaxOutageEpisodes).toBe(null);
    expect(first.state.frozenMaxCumulativeOutageEnvelopeMs).toBe(null);
    const second=advanceStage1WatchdogV39({
      mode:"legacy-three",previous:first.state,
      health:transient,nowMonotonicMs:15_000
    });
    const third=advanceStage1WatchdogV39({
      mode:"legacy-three",previous:second.state,
      health:transient,nowMonotonicMs:30_000
    });
    expect(third.reason).toBe("LEGACY_THREE_CONSECUTIVE_CALLBACK_FAILURES");
    expect(third.state.frozenMaxOutageEpisodes).toBe(null);
  });
  it("P15 both watchdog modes reject repeated health observation time, including AFTER green recovery",()=>{
    for(const mode of ["legacy-three","six-plus-six-candidate"] as const){
      const proof=knownProof();
      let p=initialStage1WatchdogStateV39();
      const first=advanceStage1WatchdogV39({
        mode,previous:p,health:transient,
        nowMonotonicMs:15_000,evidence:proof
      });
      p=first.state;
      expect(p.lastObservedMonotonicMs).toBe(15_000);
      expect(()=>advanceStage1WatchdogV39({
        mode,previous:p,health:transient,
        nowMonotonicMs:15_000,evidence:proof
      })).toThrow("P15_WATCHDOG_INVALID_OR_NONMONOTONIC_STATE");
      const healthyResult=advanceStage1WatchdogV39({
        mode,previous:p,health:healthy,
        nowMonotonicMs:30_000,evidence:proof
      });
      expect(healthyResult.state.lastObservedMonotonicMs).toBe(30_000);
      expect(()=>advanceStage1WatchdogV39({
        mode,previous:healthyResult.state,health:transient,
        nowMonotonicMs:30_000,evidence:proof
      })).toThrow("P15_WATCHDOG_INVALID_OR_NONMONOTONIC_STATE");
    }
  });
  it("P15 real controller does not mint unlimited new 6+6 on independently recovered episodes",()=>{
    let s=initialStage1WatchdogStateV39();
    const proof={...knownProof(),frozenMaxOutageEpisodes:1};
    const f1=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:s,health:transient,
      nowMonotonicMs:0,evidence:proof
    });s=f1.state;
    expect(s.outageEpisodeCount).toBe(1);
    const recovered=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:s,health:healthy,
      nowMonotonicMs:15_000,evidence:proof
    });s=recovered.state;
    expect(recovered.action).toBe("MONITOR");
    expect(s.closedOutageEnvelopeMs).toBe(15_000);
    const second=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:s,health:transient,
      nowMonotonicMs:30_000,evidence:proof
    });
    expect(second.action).toBe("STOP_OWNER");
    expect(second.reason).toBe("FROZEN_WHOLE_RUN_OUTAGE_RISK_BUDGET_EXCEEDED");
    expect(second.scientificPassAuthorized).toBe(false);
    expect(second.paidLaunchAuthorized).toBe(false);
  });
  it("P15 whole-run cumulative fault envelope is preserved after a signed healthy recovery",()=>{
    let s=initialStage1WatchdogStateV39();
    const proof={...knownProof(),frozenMaxOutageEpisodes:2,
      frozenMaxCumulativeOutageEnvelopeMs:45_000};
    for(const [at,health] of [
      [0,transient],[15_000,healthy],[30_000,transient],
      [45_000,transient]
    ] as const){
      const out=advanceStage1WatchdogV39({
        mode:"six-plus-six-candidate",previous:s,health,
        nowMonotonicMs:at,evidence:proof
      });s=out.state;
      expect(out.action).toBe("MONITOR");
    }
    expect(s.closedOutageEnvelopeMs).toBe(15_000);
    const exceeded=advanceStage1WatchdogV39({
      mode:"six-plus-six-candidate",previous:s,health:transient,
      nowMonotonicMs:60_000,evidence:proof
    });
    expect(exceeded.action).toBe("STOP_OWNER");
    expect(exceeded.reason).toBe("FROZEN_WHOLE_RUN_OUTAGE_RISK_BUDGET_EXCEEDED");
  });
  it("P15 unsigned, absent or unreasonable risk limits cannot act as an independent source witness",()=>{
    for(const invalid of [
      {frozenMaxOutageEpisodes:undefined},
      {frozenMaxOutageEpisodes:0},
      {frozenMaxOutageEpisodes:101},
      {frozenMaxCumulativeOutageEnvelopeMs:undefined},
      {frozenMaxCumulativeOutageEnvelopeMs:0},
      {frozenMaxCumulativeOutageEnvelopeMs:Number.MAX_SAFE_INTEGER}
    ]){
      const p={...knownProof(),...invalid} as Stage1IndependentlyVerifiedOutageWitnessV39;
      expect(independentOutageWitnessReasonV39(p)).toBe(
        "SOURCE_WITNESS_SCHEMA_OR_PROVIDER_RETRY_CONTRACT_INVALID");
      const out=advanceStage1WatchdogV39({
        mode:"six-plus-six-candidate",previous:initialStage1WatchdogStateV39(),
        health:transient,nowMonotonicMs:0,evidence:p
      });
      expect(out.action).toBe("STOP_OWNER");
    }
  });
  it("no witness cannot reset risk limits: two episodes and 180s total is maximum",()=>{
    let st=initialStage1WatchdogStateV39();
    for(const [ms,health] of [
      [0,transient],[75_000,healthy],[90_000,transient],
      [165_000,healthy],[180_000,transient]
    ] as const){
      const x=advanceStage1WatchdogV39({
        mode:"six-plus-six",previous:st,health,
        nowMonotonicMs:ms
      });st=x.state;
      if(ms===180_000){
        expect(x.action).toBe("STOP_OWNER");
        expect(x.reason).toBe("FROZEN_WHOLE_RUN_OUTAGE_RISK_BUDGET_EXCEEDED");
      }else expect(x.action).toBe("MONITOR");
    }
    expect(st.closedOutageEnvelopeMs).toBe(150_000);
  });
  it("two disjoint incidents cannot exceed 180s cumulative without any witness",()=>{
    let st=initialStage1WatchdogStateV39();
    for(const [ms,health] of [
      [0,transient],[120_000,healthy],
      [135_000,transient],[195_000,transient]
    ] as const){
      const x=advanceStage1WatchdogV39({
        mode:"six-plus-six",previous:st,health,
        nowMonotonicMs:ms
      });st=x.state;
      if(ms===195_000){
        expect(x.action).toBe("STOP_OWNER");
        expect(x.reason).toBe("FROZEN_WHOLE_RUN_OUTAGE_RISK_BUDGET_EXCEEDED");
      }else expect(x.action).toBe("MONITOR");
    }
  });
  it("six plus six never mutates provider retries, bills credits or grants paid owner authority",()=>{
    const r=observe({failures:10,proof:knownProof()});
    expect(r.last.action).toBe("MONITOR");
    expect(r.last.phase).toBe("CONTINGENT");
    expect(r.last.independentSourceProvenForThisCheck).toBe(true);
    noPaid(r.last);
  });
});
