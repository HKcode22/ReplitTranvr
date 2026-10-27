import {describe,expect,it} from "vitest";
import {assessPhase2gSustainedCreditGapV39}
  from "../server/lib/disruption/phase2gSustainedCreditGapSignal_v39";

const base=Date.parse("2026-10-13T04:23:21.227Z");
const limits={
  positiveGapReviewUnits:2,
  minimumConsecutiveSamples:4,
  minimumPersistenceMs:90_000,
  maximumProviderBalanceAgeMs:35_000
};
const samples=(n:number, authenticatedFresh:boolean)=>Array.from(
  {length:n},(_,i)=>{
    const observedAtMs=base+i*31_110;
    return {
      observedAtMs,
      providerCreditsRemaining:2142,
      retainedItemClaims:143,
      providerBalanceObservedAtMs:authenticatedFresh?observedAtMs:null,
      receiverFailureObserved:false
    };
  });

describe("P25 source-vs-billed sustained difference without false SEND proof",()=>{
  it("historical +2 persists despite zero receiver-health faults, provider-poll freshness unknown",()=>{
    const result=assessPhase2gSustainedCreditGapV39(
      2287,samples(17,false),limits);
    expect(result.status)
      .toBe("SUSTAINED_GAP_UNCONFIRMED_PROVIDER_BALANCE_FRESHNESS");
    expect(result.maximumPositiveGapItemUnits).toBe(2);
    expect(result.longestEligibleRunSamples).toBe(17);
    expect(result.longestEligibleRunDurationMs).toBe(16*31_110);
    expect(result.receivingHealthCanProveSenderCompleteness).toBe(false);
    expect(result.providerSendRootCauseIdentified).toBe(false);
    expect(result.eligibleRunHadReceiverFailure).toBe(false);
    expect(result.automaticStopPermitted).toBe(false);
    expect(result.noProviderIO).toBe(true);
  });
  it("known-fresh sustained provider balance strengthens accounting WARNING not cause attribution",()=>{
    const result=assessPhase2gSustainedCreditGapV39(
      2287,samples(17,true),limits);
    expect(result.status).toBe("SUSTAINED_GAP_WITH_FRESH_BALANCE_EVIDENCE");
    expect(result.providerSendRootCauseIdentified).toBe(false);
  });
  it("one huge sample does not trigger sustained incident without minimum time",()=>{
    const one=assessPhase2gSustainedCreditGapV39(
      2287,[{...samples(1,true)[0],retainedItemClaims:130}],limits);
    expect(one.maximumPositiveGapItemUnits).toBe(15);
    expect(one.status).toBe("NO_PERSISTENT_POSITIVE_DIFFERENCE");
  });
  it("new received originals catch up and reset an earlier positive gap",()=>{
    const old=samples(3,true);
    const later=samples(3,true).map(x=>({
      ...x, observedAtMs:x.observedAtMs+200_000,
      providerBalanceObservedAtMs:x.observedAtMs+200_000,
      retainedItemClaims:145
    }));
    const r=assessPhase2gSustainedCreditGapV39(
      2287,[...old,...later],limits);
    expect(r.status).toBe("NO_PERSISTENT_POSITIVE_DIFFERENCE");
  });
  it("negative async billing snapshot drift is not a positive gap",()=>{
    const negative=samples(17,true).map(x=>({
      ...x,retainedItemClaims:150
    }));
    const r=assessPhase2gSustainedCreditGapV39(2287,negative,limits);
    expect(r.status).toBe("NO_PERSISTENT_POSITIVE_DIFFERENCE");
    expect(r.maximumPositiveGapItemUnits).toBe(0);
  });
  it("caller thresholds decide warning, not an invented global 1% SLA",()=>{
    const r=assessPhase2gSustainedCreditGapV39(2287,samples(17,true),{
      ...limits,positiveGapReviewUnits:3
    });
    expect(r.status).toBe("NO_PERSISTENT_POSITIVE_DIFFERENCE");
  });
  it("rejects nonmonotonic time, future provider balance time and negative credit",()=>{
    expect(()=>assessPhase2gSustainedCreditGapV39(
      2287,[samples(1,true)[0],samples(1,true)[0]],limits
    )).toThrow("PHASE2G_PERSISTENCE_BAD_SNAPSHOT");
    expect(()=>assessPhase2gSustainedCreditGapV39(2287,[{
      ...samples(1,true)[0], providerBalanceObservedAtMs:base+1
    }],limits)).toThrow("PHASE2G_PERSISTENCE_BAD_SNAPSHOT");
    expect(()=>assessPhase2gSustainedCreditGapV39(2287,[{
      ...samples(1,true)[0],providerCreditsRemaining:-1
    }],limits)).toThrow("PHASE2G_PERSISTENCE_BAD_SNAPSHOT");
  });
});
