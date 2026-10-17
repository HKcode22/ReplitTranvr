/**
 * Pure, descriptive research-data quality dimensions for early pilot.
 * No weighted "scientific success" percentage, no official Gate2 promotion,
 * and no alteration of original provider or ledger evidence.
 */
export interface Phase2gQualityDimensionsInputV39 {
  actualWindowSeconds: number;
  targetWindowSeconds: number;
  externalSettledCredits: number | null;
  receivedVerifiedItems: number;
  savedOriginalReferences: number | null;
  hashVerifiedOriginalReferences: number | null;
  observedResolvedOperatorRows: number | null;
  observedTotalRows: number | null;
  providerObservedCallbackAttempts: number | null;
  receiverRecordedSuccess2xx: number | null;
  historicalReconciliation: string;
}

export interface Phase2gQualityDimensionsV39 {
  observationCompletionRatio: number;
  providerCreditReconciliationRatio: number | null;
  verifiedSourceReferenceRatio: number | null;
  resolvedOperatorRowShare: number | null;
  descriptiveObservedItemsPerHour: number;
  receiverRecorded2xxRatio: number | null;
  providerDeliverySuccessProbability: null;
  missingnessMechanismDetermined: false;
  sourceCanBeUsedForUnqualifiedPrimaryInference: false;
  confirmatoryAcceptanceStatusIsUnchanged: true;
  originalReconciliation: string;
  problems: string[];
}

function validNonnegativeInteger(v: number | null) {
  return v === null || (Number.isSafeInteger(v) && v >= 0);
}
function ratio(n: number | null, d: number | null): number | null {
  if (n === null || d === null || d === 0) return null;
  return n / d;
}
export function evaluatePhase2gQualityDimensionsV39(
  v: Phase2gQualityDimensionsInputV39,
): Phase2gQualityDimensionsV39 {
  const problems: string[] = [];
  if (!Number.isFinite(v.actualWindowSeconds) ||
      !Number.isFinite(v.targetWindowSeconds) ||
      v.actualWindowSeconds <= 0 || v.targetWindowSeconds <= 0) {
    problems.push("INVALID_TIME_WINDOW");
  }
  for (const key of [
    "externalSettledCredits","receivedVerifiedItems",
    "savedOriginalReferences","hashVerifiedOriginalReferences",
    "observedResolvedOperatorRows","observedTotalRows",
    "providerObservedCallbackAttempts","receiverRecordedSuccess2xx",
  ] as const) {
    if (!validNonnegativeInteger(v[key])) problems.push("INVALID_COUNT_" + key);
  }
  if (v.externalSettledCredits !== null && v.receivedVerifiedItems > v.externalSettledCredits)
    problems.push("RECEIVED_EXCEEDS_EXTERNAL");
  if (v.savedOriginalReferences !== null &&
      v.hashVerifiedOriginalReferences !== null &&
      v.hashVerifiedOriginalReferences > v.savedOriginalReferences)
    problems.push("HASH_VERIFIED_EXCEEDS_REFERENCES");
  if (v.observedResolvedOperatorRows !== null &&
      v.observedTotalRows !== null &&
      v.observedResolvedOperatorRows > v.observedTotalRows)
    problems.push("RESOLVED_EXCEEDS_OBSERVED");
  if (v.providerObservedCallbackAttempts !== null &&
      v.receiverRecordedSuccess2xx !== null &&
      v.receiverRecordedSuccess2xx > v.providerObservedCallbackAttempts)
    problems.push("RECEIVER_SUCCESS_EXCEEDS_INDEPENDENT_ATTEMPTS");
  if (!v.historicalReconciliation?.trim()) problems.push("HISTORIC_RESULT_MISSING");

  if (problems.length) throw new Error(
    "PHASE2G_QUALITY_DIMENSIONS_INVALID:" + problems.join("|")
  );
  return {
    observationCompletionRatio: Math.min(v.actualWindowSeconds / v.targetWindowSeconds, 1),
    providerCreditReconciliationRatio: ratio(v.receivedVerifiedItems, v.externalSettledCredits),
    verifiedSourceReferenceRatio: ratio(v.hashVerifiedOriginalReferences, v.savedOriginalReferences),
    resolvedOperatorRowShare: ratio(v.observedResolvedOperatorRows,v.observedTotalRows),
    descriptiveObservedItemsPerHour: v.receivedVerifiedItems*3600/v.actualWindowSeconds,
    // Independent upstream attempted POST count is UNKNOWN in P25.
    // Null is not zero and must NOT be interpreted as "no errors".
    receiverRecorded2xxRatio: ratio(v.receiverRecordedSuccess2xx,v.providerObservedCallbackAttempts),
    providerDeliverySuccessProbability: null,
    missingnessMechanismDetermined: false,
    sourceCanBeUsedForUnqualifiedPrimaryInference: false,
    confirmatoryAcceptanceStatusIsUnchanged: true,
    originalReconciliation: v.historicalReconciliation,
    problems: [],
  };
}
