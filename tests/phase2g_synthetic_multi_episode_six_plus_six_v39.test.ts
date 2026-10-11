import {describe,expect,it} from "vitest";
import {advanceHypotheticalMultipleOutagesV39 as advance,
  initialEpisodeStateV39 as start,
  type EpisodeFrozenPolicyV39,type EpisodeStateV39,
  type EpisodeProbeV39} from
  "../experiments/phase2g_rehearsal/synthetic_multi_episode_six_plus_six_v39";

const policy=():EpisodeFrozenPolicyV39=>({
  pollMs:15000,maxIndividualFaultEnvelopeMs:180000,
  maxCumulativeFaultEnvelopeMs:360000,maxEpisodes:2,
  prospectiveBlindPaidRiskAndCreditCeilingApproved:true,
  requireEvidenceForEmergencyChecks:true
});
const step=(state:EpisodeStateV39,at:number,
  health:EpisodeProbeV39["health"]="TRANSIENT_FAILURE",signed=false,
  p=policy(),ownerGood=true)=>{
  const out=advance({
    policy:p,previous:state,
    probe:{atMonotonicMs:at,health,
      originalSenderItemCreditWitnessVerified:signed,
      originalSourceAndEightBinsRecoverable:signed,
      oneOwnerAndBudgetInvariantPreserved:ownerGood}
  });
  return out;
};
describe("P15 repeated 6-primary +6-emergency separate outage vs whole-run error budget",()=>{
  it("four transient failures, TWO stable health checks: fresh full 6+6 for independent later outage, not 2+6",()=>{
    let s=start(0);
    for(const t of [15000,30000,45000,60000]){
      const r=step(s,t);s=r.state;
      expect(r.phase).toBe("PRIMARY");
    }
    const pending=step(s,75000,"FULLY_HEALTHY");
    expect(pending.phase).toBe("RECOVERY_PENDING");
    expect(pending.state.consecutiveFailures).toBe(4);
    const recovered=step(pending.state,90000,"FULLY_HEALTHY");
    expect(recovered.reason).toContain("FRESH_EPISODE_CHECKS");
    expect(recovered.state.consecutiveFailures).toBe(0);
    expect(recovered.state.episodeCount).toBe(1);
    expect(recovered.state.cumulativeFaultEnvelopeMs).toBe(90000);
    const second=step(recovered.state,105000);
    expect(second.state.episodeCount).toBe(2);
    expect(second.reason).toBe("PRIMARY_SIX_1");
    expect(second.state.consecutiveFailures).toBe(1);
    expect(second.cumulativeObservedOrPotentialFaultEnvelopeMs).toBe(105000);
    expect(second.paid6Plus6Authorized).toBe(false);
    expect(second.originalF8SciencePassAuthorized).toBe(false);
  });
  it("eleven failed health probes and successful TWELFTH probe close near 3m only WITH signed independent source",()=>{
    let s=start(0);
    for(let i=1;i<=11;i++){
      const out=step(s,i*15000,"TRANSIENT_FAILURE",i>=7);s=out.state;
      expect(out.action).toBe("MONITOR");
      expect(out.phase).toBe(i<=6?"PRIMARY":"EMERGENCY");
    }
    const recovered=step(s,180000,"FULLY_HEALTHY",true);
    expect(recovered.action).toBe("MONITOR");
    expect(recovered.reason).toBe(
      "SOURCE_VERIFIED_EPISODE_CLOSED_FRESH_SIX_PLUS_SIX_NEXT_OUTAGE");
    expect(recovered.state.consecutiveFailures).toBe(0);
    expect(recovered.state.cumulativeFaultEnvelopeMs).toBe(180000);
    expect(recovered.state.closedEpisodeFaultEnvelopeMs).toEqual([180000]);
    expect(step(recovered.state,195000).reason).toBe("PRIMARY_SIX_1");
  });
  it("without original sender witness the seventh failed health check does NOT magically become recoverable",()=>{
    let s=start(0);
    for(let i=1;i<=6;i++)s=step(s,i*15000).state;
    const out=step(s,105000);
    expect(out.action).toBe("STOP_OWNER");
    expect(out.reason).toBe("EMERGENCY_SIX_REQUIRES_INDEPENDENT_SOURCE_CONTINUITY");
  });
  it("twelve consecutive failed health probes STOP even with trusted synthetic evidence",()=>{
    let s=start(0);
    for(let i=1;i<=11;i++)s=step(s,i*15000,"TRANSIENT_FAILURE",i>=7).state;
    const out=step(s,180000,"TRANSIENT_FAILURE",true);
    expect(out.action).toBe("STOP_OWNER");
    expect(out.reason).toBe("TWELVE_CONSECUTIVE_HEALTH_FAILURES");
  });
  it("failed health after one green but unconfirmed half-open check is same outage, not fresh 6+6",()=>{
    let s=start(0);
    for(const t of [15000,30000,45000])s=step(s,t).state;
    const firstGreen=step(s,60000,"FULLY_HEALTHY");
    expect(firstGreen.phase).toBe("RECOVERY_PENDING");
    const relapse=step(firstGreen.state,75000,"TRANSIENT_FAILURE");
    expect(relapse.state.episodeCount).toBe(1);
    expect(relapse.state.consecutiveFailures).toBe(4);
    expect(relapse.phase).toBe("PRIMARY");
  });
  it("whole-run cumulative error budget survives completed episode reset",()=>{
    let s=start(0);
    for(let i=1;i<=11;i++)s=step(s,i*15000,"TRANSIENT_FAILURE",i>=7).state;
    s=step(s,180000,"FULLY_HEALTHY",true).state;
    const reduced={...policy(),maxCumulativeFaultEnvelopeMs:200000};
    const first=step(s,195000,"TRANSIENT_FAILURE",false,reduced);
    expect(first.action).toBe("MONITOR");
    const second=step(first.state,210000,"TRANSIENT_FAILURE",false,reduced);
    expect(second.action).toBe("STOP_OWNER");
    expect(second.reason).toBe("PER_EPISODE_OR_CUMULATIVE_ERROR_BUDGET_EXHAUSTED");
    expect(second.cumulativeObservedOrPotentialFaultEnvelopeMs).toBe(210000);
  });
  it("max separately recovered outages is frozen; unlimited resets are not allowed",()=>{
    let s=start(0);
    s=step(s,15000).state;
    s=step(s,30000,"FULLY_HEALTHY",true).state;
    s=step(s,45000).state;
    s=step(s,60000,"FULLY_HEALTHY",true).state;
    expect(s.episodeCount).toBe(2);
    const third=step(s,75000);
    expect(third.action).toBe("STOP_OWNER");
    expect(third.reason).toBe("FROZEN_MAX_OUTAGE_EPISODES_EXCEEDED");
  });
  it("unresolved provider science truth remains explicitly unverified after GET-only recovery",()=>{
    let s=start(0);
    s=step(s,15000).state;
    s=step(s,30000,"FULLY_HEALTHY").state;
    const out=step(s,45000,"FULLY_HEALTHY");
    expect(out.state.historicalMissingSourceStillUnproven).toBe(true);
    expect(out.originalF8SciencePassAuthorized).toBe(false);
  });
  it("hard secret/runtime/identity contract failure bypasses primary tolerance",()=>{
    const out=step(start(0),15000,"HARD_CONTRACT_FAILURE");
    expect(out.reason).toBe("HARD_CALLBACK_CONTRACT_OR_IDENTITY_VIOLATION");
    expect(out.action).toBe("STOP_OWNER");
  });
  it("unapproved blind billable exposure is not justified by 'it's only 2.5% of time'",()=>{
    const p={...policy(),prospectiveBlindPaidRiskAndCreditCeilingApproved:false};
    const out=step(start(0),15000,"TRANSIENT_FAILURE",false,p);
    expect(out.reason).toBe("NO_PROSPECTIVE_BLIND_PAID_CREDIT_RISK_APPROVAL");
  });
  it("large scheduler delays are not assumed to represent only one normal check",()=>{
    const out=step(start(0),61000);
    expect(out.reason).toBe("WATCHDOG_MONITOR_SCHEDULING_GAP_UNBOUNDED");
  });
  it("all synthetic checks retain NO-PAID and NO-ORIGINAL-F8-PASS flags",()=>{
    const out=step(start(0),15000);
    expect(out.paid6Plus6Authorized).toBe(false);
    expect(out.originalF8SciencePassAuthorized).toBe(false);
  });
});
