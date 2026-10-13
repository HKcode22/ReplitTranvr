/**
 * Review-only, side-effect-free dataset usability evaluator.
 *
 * This is NOT the Phase2G paid owner, financial ledger, or immutable probe
 * reconciliation. It cannot change a historic GitHub run or SQL status.
 * Any future prospective confirmatory tolerance requires a separately frozen
 * approved version and additional end-to-end validation before live wiring.
 */
export type ResearchDispositionV39 =
  | "EXACT_RESEARCH_CANDIDATE"
  | "QUALIFIED_RESEARCH_CANDIDATE"
  | "HOLD_FOR_REVIEW";

export interface ObservedDatasetEvidenceV39 {
  externalSettledCredits: number | null;
  internalReceivedCredits: number;
  costItemDisagreementCount: number;
  observedWindowSeconds: number;
  requiredWindowSeconds: number;
  activeBillableSubscriptions: number | null;
  hardIdentityViolations: number;
  sourceCustodyVerified: boolean;
  settlementQuiescent: boolean;
  originalProtocolStatus: "MATCH" | "DELIVERY_GAP" | "MISMATCH" | "UNRESOLVED";
}

export interface ProposedResearchToleranceV39 {
  // Explicit input, NOT automatically imposed on a frozen experiment.
  maxPositiveGapCredits: number;
  maxMissingFraction: number;
}

export interface ObservedDatasetReviewV39 {
  disposition: ResearchDispositionV39;
  completeness: number | null;
  deliveryGapCredits: number | null;
  problems: string[];
  // This is always the original immutable result, never upgraded by the tool.
  historicalReconciliationStatus: ObservedDatasetEvidenceV39["originalProtocolStatus"];
  historicalConfirmatoryPass: boolean;
  changesToSqlOrProvider: false;
}

export function evaluateObservedDatasetResearchV39(
  e: ObservedDatasetEvidenceV39,
  tolerance: ProposedResearchToleranceV39,
): ObservedDatasetReviewV39 {
  const problem: string[] = [];
  const ints = [
    e.internalReceivedCredits, e.costItemDisagreementCount,
    e.activeBillableSubscriptions, e.hardIdentityViolations,
    tolerance.maxPositiveGapCredits,
  ];
  if (ints.some(v => v === null || !Number.isSafeInteger(v) || v < 0)) {
    problem.push("INVALID_NONNEGATIVE_INTEGER_INPUT");
  }
  if (e.externalSettledCredits === null ||
      !Number.isSafeInteger(e.externalSettledCredits) ||
      e.externalSettledCredits < 0) {
    problem.push("EXTERNAL_SETTLED_CREDITS_UNVERIFIED");
  }
  if (!Number.isFinite(e.observedWindowSeconds) ||
      !Number.isFinite(e.requiredWindowSeconds) ||
      e.requiredWindowSeconds <= 0 || e.observedWindowSeconds < 0) {
    problem.push("INVALID_WINDOW");
  } else if (e.observedWindowSeconds < e.requiredWindowSeconds) {
    problem.push("INCOMPLETE_OBSERVATION_WINDOW");
  }
  if (!Number.isFinite(tolerance.maxMissingFraction) ||
      tolerance.maxMissingFraction < 0 || tolerance.maxMissingFraction > 1) {
    problem.push("INVALID_PROSPECTIVE_POLICY");
  }
  if (e.activeBillableSubscriptions !== 0) problem.push("BILLING_NOT_CLOSED");
  if (e.hardIdentityViolations !== 0) problem.push("HARD_IDENTITY_VIOLATIONS");
  if (e.costItemDisagreementCount !== 0) problem.push("COST_ITEM_DISAGREEMENT");
  if (!e.sourceCustodyVerified) problem.push("RECEIVED_SOURCE_CUSTODY_UNVERIFIED");
  if (!e.settlementQuiescent) problem.push("SETTLEMENT_NOT_QUIESCENT");

  const external = e.externalSettledCredits;
  const gap = external === null || !Number.isSafeInteger(external) || external < 0
    ? null : external - e.internalReceivedCredits;
  const completeness = gap === null ? null
    : external === 0 ? (e.internalReceivedCredits === 0 ? 1 : 0)
    : e.internalReceivedCredits / external;
  if (gap !== null && gap < 0) problem.push("RECEIVED_EXCEEDS_BILLED");
  if (gap !== null && gap > tolerance.maxPositiveGapCredits) problem.push("ABSOLUTE_GAP_OVER_POLICY");
  if (completeness !== null && 1 - completeness > tolerance.maxMissingFraction + Number.EPSILON) {
    problem.push("MISSING_FRACTION_OVER_POLICY");
  }
  const disposition: ResearchDispositionV39 = problem.length
    ? "HOLD_FOR_REVIEW"
    : gap === 0 ? "EXACT_RESEARCH_CANDIDATE" : "QUALIFIED_RESEARCH_CANDIDATE";

  return {
    disposition,
    completeness,
    deliveryGapCredits: gap,
    problems: problem,
    historicalReconciliationStatus: e.originalProtocolStatus,
    historicalConfirmatoryPass: e.originalProtocolStatus === "MATCH",
    changesToSqlOrProvider: false,
  };
}
