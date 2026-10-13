import { describe, expect, it } from "vitest";
import {
  evaluateObservedDatasetResearchV39,
  type ObservedDatasetEvidenceV39,
} from "../server/lib/disruption/prospectiveResearchQualification_v39";

const policy = { maxPositiveGapCredits: 2, maxMissingFraction: 0.01 };
const fixture: ObservedDatasetEvidenceV39 = {
  externalSettledCredits: 231,
  internalReceivedCredits: 229,
  costItemDisagreementCount: 0,
  observedWindowSeconds: 7203.639,
  requiredWindowSeconds: 7200,
  activeBillableSubscriptions: 0,
  hardIdentityViolations: 0,
  sourceCustodyVerified: true, // hypothetical fixture; not a claim about live YSSY
  settlementQuiescent: true,
  originalProtocolStatus: "DELIVERY_GAP",
};
const classify = (patch: Partial<ObservedDatasetEvidenceV39> = {}) =>
  evaluateObservedDatasetResearchV39({ ...fixture, ...patch }, policy);

describe("proposed research-only tolerance — zero provider and DB mutations", () => {
  it("can review a 229/231 full-window observation as qualified, not historical PASS", () => {
    const result = classify();
    expect(result.deliveryGapCredits).toBe(2);
    expect(result.completeness).toBeCloseTo(229 / 231);
    expect(result.disposition).toBe("QUALIFIED_RESEARCH_CANDIDATE");
    expect(result.historicalConfirmatoryPass).toBe(false);
    expect(result.historicalReconciliationStatus).toBe("DELIVERY_GAP");
    expect(result.changesToSqlOrProvider).toBe(false);
  });
  it("recognizes exact matches without rewriting the immutable historical result", () => {
    expect(classify({
      externalSettledCredits: 229,
      originalProtocolStatus: "MATCH",
    })).toMatchObject({
      disposition: "EXACT_RESEARCH_CANDIDATE",
      historicalConfirmatoryPass: true,
    });
  });
  it("refuses unverified custody even with a tiny gap", () => {
    expect(classify({ sourceCustodyVerified: false })).toMatchObject({
      disposition: "HOLD_FOR_REVIEW",
      problems: ["RECEIVED_SOURCE_CUSTODY_UNVERIFIED"],
    });
  });
  it("refuses open billing, identity violations, and cost-item disagreements", () => {
    const v = classify({
      activeBillableSubscriptions: 1,
      hardIdentityViolations: 1,
      costItemDisagreementCount: 1,
    });
    expect(v.disposition).toBe("HOLD_FOR_REVIEW");
    expect(v.problems).toContain("BILLING_NOT_CLOSED");
    expect(v.problems).toContain("HARD_IDENTITY_VIOLATIONS");
    expect(v.problems).toContain("COST_ITEM_DISAGREEMENT");
  });
  it("rejects early stop, unconverged settlement, and unknown provider debit", () => {
    expect(classify({ observedWindowSeconds: 7199 }).problems)
      .toContain("INCOMPLETE_OBSERVATION_WINDOW");
    expect(classify({ settlementQuiescent: false }).problems)
      .toContain("SETTLEMENT_NOT_QUIESCENT");
    expect(classify({ externalSettledCredits: null }).problems)
      .toContain("EXTERNAL_SETTLED_CREDITS_UNVERIFIED");
  });
  it("rejects even a small absolute gap when its fraction is too large", () => {
    expect(classify({ externalSettledCredits: 101, internalReceivedCredits: 99 }).problems)
      .toContain("MISSING_FRACTION_OVER_POLICY");
  });
  it("rejects large gaps and unexplained over-receipt", () => {
    expect(classify({ internalReceivedCredits: 225 }).problems)
      .toContain("ABSOLUTE_GAP_OVER_POLICY");
    expect(classify({ internalReceivedCredits: 232 }).problems)
      .toContain("RECEIVED_EXCEEDS_BILLED");
  });
  it("rejects invalid values rather than showing a green result", () => {
    expect(classify({ internalReceivedCredits: Number.NaN }).disposition)
      .toBe("HOLD_FOR_REVIEW");
    expect(evaluateObservedDatasetResearchV39(fixture, {
      maxPositiveGapCredits: 2,
      maxMissingFraction: Number.NaN,
    }).disposition).toBe("HOLD_FOR_REVIEW");
  });
});
