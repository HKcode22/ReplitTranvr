import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {reviewGate3InstrumentationAndResearchV39} from
  "../server/lib/disruption/gate3CanaryDualTrackReview_v39";
import type {ObservedDatasetEvidenceV39} from
  "../server/lib/disruption/prospectiveResearchQualification_v39";
import type {Gate3TerminalAssessmentInputV39} from
  "../server/lib/disruption/gate3CanaryTerminalAssessment_v39";

const observed:ObservedDatasetEvidenceV39={
  externalSettledCredits:231,internalReceivedCredits:229,
  costItemDisagreementCount:0,
  observedWindowSeconds:7203.639,requiredWindowSeconds:7200,
  activeBillableSubscriptions:0,hardIdentityViolations:0,
  sourceCustodyVerified:true,settlementQuiescent:true,
  originalProtocolStatus:"DELIVERY_GAP",
};
const policy={maxPositiveGapCredits:2,maxMissingFraction:0.01};
const fixture=()=>({
  exactCanary:null as Gate3TerminalAssessmentInputV39|null,
  observedDataset:{...observed},
  proposedResearchTolerance:{...policy},
});
describe("Research usability does not require false paid canary MATCH",()=>{
  it("YSSY-like 229 of 231 billed is qualified for research review, original status remains failed",()=>{
    const x=reviewGate3InstrumentationAndResearchV39(fixture());
    expect(x.instrumentation).toBeNull();
    expect(x.scientificInterpretation).toBe("HISTORICAL_INSTRUMENTATION_NOT_EVALUATED");
    expect(x.scientific).toMatchObject({
      disposition:"QUALIFIED_RESEARCH_CANDIDATE",
      deliveryGapCredits:2,historicalReconciliationStatus:"DELIVERY_GAP",
      historicalConfirmatoryPass:false,changesToSqlOrProvider:false,
    });
    expect(x.scientific.completeness).toBeCloseTo(229/231);
    expect(x).toMatchObject({
      prospectiveScientificApprovalVerifiedHere:false,
      observedFlightMissingFractionEstablished:false,
      futurePaidProviderAuthorizationGranted:false,
      providerCalls:0,databaseMutations:0,
    });
  });
  it("actual separate small canary remains HOLD on non-exact 7/5, even when research tier accepts some missingness",()=>{
    const sessionId=randomUUID();
    const canary:Gate3TerminalAssessmentInputV39={
      expectedSessionId:sessionId,canaryCreditCeiling:20,fixedExposureSeconds:300,
      sourceReadbackVerified:true,publishedReceiverParityVerified:true,
      foreignActiveBillableCount:0,
      result:{
        status:"completed",runtimeSessionId:sessionId,
        windowStart:new Date("2026-10-14T00:00:00Z"),
        windowEnd:new Date("2026-10-14T00:05:00Z"),
        durationCensored:false,stopReason:null,
        reconciliationStatus:"DELIVERY_GAP",externalCredits:7,
        internalSendCredits:5,maxObservedUnsettledCreditGap:0,
        settlementReads:3,metrics:null,
        cleanupVerifiedAtUtc:null,subscriptionDeleted:true,
      },
    };
    const x=reviewGate3InstrumentationAndResearchV39({
      ...fixture(),exactCanary:canary,
    });
    expect(x.instrumentation?.status).toBe("HOLD");
    expect(x.scientific.disposition).toBe("QUALIFIED_RESEARCH_CANDIDATE");
    expect(x.scientificInterpretation)
      .toBe("EXACT_CANARY_HELD_RESEARCH_EVALUATED_SEPARATELY");
    expect(x.futurePaidProviderAuthorizationGranted).toBe(false);
  });
  it("closed billed account, source custody and identity are hard research prerequisites",()=>{
    for(const patch of [
      {activeBillableSubscriptions:1},
      {sourceCustodyVerified:false},
      {hardIdentityViolations:1},
      {settlementQuiescent:false},
      {costItemDisagreementCount:1},
      {externalSettledCredits:null},
      {observedWindowSeconds:600},
    ]){
      const x=reviewGate3InstrumentationAndResearchV39({
        ...fixture(),observedDataset:{...observed,...patch},
      });
      expect(x.scientific.disposition).toBe("HOLD_FOR_REVIEW");
      expect(x.futurePaidProviderAuthorizationGranted).toBe(false);
    }
  });
  it("tolerance is a stated review assumption, not universally approved",()=>{
    const x=reviewGate3InstrumentationAndResearchV39({
      ...fixture(),proposedResearchTolerance:{
        maxPositiveGapCredits:1,maxMissingFraction:0.01,
      },
    });
    expect(x.scientific.disposition).toBe("HOLD_FOR_REVIEW");
    expect(x.scientific.problems).toContain("ABSOLUTE_GAP_OVER_POLICY");
    expect(x.prospectiveScientificApprovalVerifiedHere).toBe(false);
  });
  it("never treats credit ratio as fraction of missed physical flights",()=>{
    const x=reviewGate3InstrumentationAndResearchV39(fixture());
    expect(x.scientific.completeness).toBeCloseTo(0.99134199134);
    expect(x.observedFlightMissingFractionEstablished).toBe(false);
  });
});
