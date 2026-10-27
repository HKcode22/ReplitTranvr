import {describe,expect,it} from "vitest";
import {assessPhase2gProviderReceiverGapV39}
  from "../server/lib/disruption/phase2gProviderReceiveGapAudit_v39";

const yssy = {
  externalBilledItemCredits: 231,
  retainedOriginalItemCreditClaims: 229,
  receivedHttp2xxWebhookRequests: 58,
  sustainedReceiverHealthFailureObserved: false,
  externalAccountSnapshotTerminal: true,
};

describe("P25 YSSY sender vs source accounting — offline-only", () => {
  it("preserves true 231 vs 229, 6+6 green does NOT prove SEND completeness", () => {
    const r=assessPhase2gProviderReceiverGapV39(yssy);
    expect(r.status).toBe("UNATTRIBUTED_POSITIVE_ITEM_CREDIT_GAP");
    expect(r.gapItemCredits).toBe(2);
    expect(r.positiveGapFractionOfBilled).toBeCloseTo(2/231, 12);
    expect(r.observedReceiverHttp2xx).toBe(58);
    expect(r.sustainedReceiverHealthFailureObserved).toBe(false);
    expect(r.receiverHealthNotSenderProof).toBe(true);
    expect(r.notificationSendAttempts).toBeNull();
    expect(r.providerSendBasis).toBe("NO_TRUSTED_SENDER_EVIDENCE");
    expect(r.mechanismEstablished).toBe(false);
    expect(r.automaticStopAuthorized).toBe(false);
    expect(r.providerRequests).toBe(0);
    expect(r.databaseWrites).toBe(0);
  });
  it("does not pretend a mid-window balance is final source loss", () => {
    const r=assessPhase2gProviderReceiverGapV39({
      ...yssy,externalAccountSnapshotTerminal:false
    });
    expect(r.status).toBe("NO_TERMINAL_PROVIDER_COMPARISON");
    expect(r.gapItemCredits).toBeNull();
  });
  it("distinguishes exact MATCH, negative difference, and missing provider bill", () => {
    expect(assessPhase2gProviderReceiverGapV39({
      ...yssy,externalBilledItemCredits:229
    }).status).toBe("RECONCILED_ITEM_CREDITS");
    const high=assessPhase2gProviderReceiverGapV39({
      ...yssy,retainedOriginalItemCreditClaims:232
    });
    expect(high.status).toBe("NEGATIVE_ITEM_CREDIT_DIFFERENCE");
    expect(high.gapItemCredits).toBe(-1);
    expect(assessPhase2gProviderReceiverGapV39({
      ...yssy,externalBilledItemCredits:null
    }).status).toBe("NO_TERMINAL_PROVIDER_COMPARISON");
  });
  it("does not grant verified sender status from an unauthenticated attempt tally", () => {
    const r=assessPhase2gProviderReceiverGapV39({
      ...yssy,
      senderProof:{
        independentlyAuthenticatedAndScopeMatched:false,
        attributedFlightItemCredits:231,notificationSendAttempts:58
      }
    });
    expect(r.providerSendBasis).toBe("SENDER_EVIDENCE_SCOPE_OR_AUTH_UNVERIFIED");
    expect(r.notificationSendAttempts).toBeNull();
    expect(r.mechanismEstablished).toBe(false);
  });
  it("matches properly scoped attributed sender credits without claiming which hop lost data", () => {
    const r=assessPhase2gProviderReceiverGapV39({
      ...yssy,senderProof:{
        independentlyAuthenticatedAndScopeMatched:true,
        attributedFlightItemCredits:231,notificationSendAttempts:59
      }
    });
    expect(r.providerSendBasis).toBe("SENDER_EVIDENCE_MATCHES_BILLED");
    expect(r.notificationSendAttempts).toBe(59);
    expect(r.gapItemCredits).toBe(2);
    expect(r.mechanismEstablished).toBe(false);
  });
  it("flags sender-vs-billing disagreement independently of receiver gap",()=>{
    const r=assessPhase2gProviderReceiverGapV39({
      ...yssy,senderProof:{
        independentlyAuthenticatedAndScopeMatched:true,
        attributedFlightItemCredits:229,notificationSendAttempts:58
      }
    });
    expect(r.providerSendBasis).toBe("SENDER_EVIDENCE_DIFFERS_FROM_BILLED");
    expect(r.mechanismEstablished).toBe(false);
  });
  it("permits warning recommendations only for caller-supplied review limits, not auto-STOP",()=>{
    const r=assessPhase2gProviderReceiverGapV39({
      ...yssy,prospectiveReviewLimits:{
        warningPositiveGapUnits:2,warningPositiveGapFraction:0.02
      }
    });
    expect(r.warningLimitsSupplied).toBe(true);
    expect(r.warningReviewSuggested).toBe(true);
    expect(r.automaticStopAuthorized).toBe(false);
    const no=assessPhase2gProviderReceiverGapV39({
      ...yssy,prospectiveReviewLimits:{
        warningPositiveGapUnits:10,warningPositiveGapFraction:0.02
      }
    });
    expect(no.warningReviewSuggested).toBe(false);
  });
  it("rejects invalid numbers or invented negative raw billing",()=>{
    expect(()=>assessPhase2gProviderReceiverGapV39({
      ...yssy,externalBilledItemCredits:-1
    })).toThrow("P2G_GAP_INVALID_COUNTS_OR_BASIS");
    expect(()=>assessPhase2gProviderReceiverGapV39({
      ...yssy,retainedOriginalItemCreditClaims:Number.NaN
    })).toThrow("P2G_GAP_INVALID_COUNTS_OR_BASIS");
    expect(()=>assessPhase2gProviderReceiverGapV39({
      ...yssy,prospectiveReviewLimits:{
        warningPositiveGapUnits:2,warningPositiveGapFraction:1.02
      }
    })).toThrow("P2G_GAP_INVALID_PREDECLARED_REVIEW_LIMITS");
  });
});
