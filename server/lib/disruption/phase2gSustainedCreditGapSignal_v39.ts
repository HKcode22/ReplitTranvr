/**
 * Phase2G/YSSY: advisory sustained credit-gap analysis.
 *
 * A callback 6+6 health check does NOT observe provider SEND attempts.
 * Provider account credit snapshots and received original item counters are
 * asynchronous. A persistent accounting delta is NOT proof of lost HTTP POSTs.
 * No provider calls, DB mutations, host STOP, payment or user notification.
 */
export interface Phase2gCreditGapSampleV39 {
  /** Milliseconds since epoch, from the local read-only observer. */
  readonly observedAtMs: number;
  /** Provider account total remaining units observed or cached. */
  readonly providerCreditsRemaining: number;
  /** Committed callback original item-credit claims, cumulative. */
  readonly retainedItemClaims: number;
  /** When the provider account balance itself was actually observed. */
  readonly providerBalanceObservedAtMs: number | null;
  readonly receiverFailureObserved: boolean;
}
export interface Phase2gCreditGapReviewLimitsV39 {
  readonly positiveGapReviewUnits: number;
  readonly minimumConsecutiveSamples: number;
  readonly minimumPersistenceMs: number;
  /** 0 means every provider balance must be observed at the exact sample time. */
  readonly maximumProviderBalanceAgeMs: number;
}
export interface Phase2gSustainedCreditGapVerdictV39 {
  readonly schema: "v39.phase2g.sustained-credit-gap.v1";
  readonly status: "NO_PERSISTENT_POSITIVE_DIFFERENCE" |
    "SUSTAINED_GAP_UNCONFIRMED_PROVIDER_BALANCE_FRESHNESS" |
    "SUSTAINED_GAP_WITH_FRESH_BALANCE_EVIDENCE";
  readonly maximumPositiveGapItemUnits: number;
  readonly longestEligibleRunSamples: number;
  readonly longestEligibleRunDurationMs: number;
  readonly receivingHealthCanProveSenderCompleteness: false;
  readonly providerSendRootCauseIdentified: false;
  readonly eligibleRunHadReceiverFailure: boolean;
  readonly thresholdSetProspectively: boolean;
  readonly automaticStopPermitted: false;
  readonly noProviderIO: true;
}
function integer(x: unknown): x is number {
  return typeof x === "number" && Number.isSafeInteger(x);
}
export function assessPhase2gSustainedCreditGapV39(
  initialProviderCredits: number,
  samples: readonly Phase2gCreditGapSampleV39[],
  limits: Phase2gCreditGapReviewLimitsV39
): Phase2gSustainedCreditGapVerdictV39 {
  if (!integer(initialProviderCredits) || initialProviderCredits < 0 ||
      !Array.isArray(samples) || samples.length > 100_000 ||
      !limits || !integer(limits.positiveGapReviewUnits) ||
      limits.positiveGapReviewUnits < 1 ||
      !integer(limits.minimumConsecutiveSamples) ||
      limits.minimumConsecutiveSamples < 2 ||
      !integer(limits.minimumPersistenceMs) ||
      limits.minimumPersistenceMs < 0 ||
      !integer(limits.maximumProviderBalanceAgeMs) ||
      limits.maximumProviderBalanceAgeMs < 0)
    throw Error("PHASE2G_PERSISTENCE_BAD_INPUT");
  let previous = -1;
  let runStart: number | null = null;
  let runSamples = 0, runFresh = true, runFailure = false;
  let longest = 0, longestMs = 0, maxGap = 0;
  let warning = false, warningFresh = false, warningReceiver = false;
  const clear = () => {
    runStart = null;runSamples = 0;runFresh = true;runFailure = false;
  };
  for (const row of samples) {
    if (!row || !integer(row.observedAtMs) || row.observedAtMs <= previous ||
        !integer(row.providerCreditsRemaining) ||
        row.providerCreditsRemaining < 0 ||
        row.providerCreditsRemaining > initialProviderCredits ||
        !integer(row.retainedItemClaims) ||
        row.retainedItemClaims < 0 ||
        typeof row.receiverFailureObserved !== "boolean" ||
        (row.providerBalanceObservedAtMs !== null &&
         (!integer(row.providerBalanceObservedAtMs) ||
           row.providerBalanceObservedAtMs > row.observedAtMs ||
           row.providerBalanceObservedAtMs < 0)))
      throw Error("PHASE2G_PERSISTENCE_BAD_SNAPSHOT");
    previous = row.observedAtMs;
    const gap = initialProviderCredits -
      row.providerCreditsRemaining - row.retainedItemClaims;
    if (gap > maxGap) maxGap = gap;
    if (gap < limits.positiveGapReviewUnits) {
      clear(); continue;
    }
    if (runStart === null) runStart = row.observedAtMs;
    runSamples++;
    const age = row.providerBalanceObservedAtMs === null ? Infinity :
      row.observedAtMs - row.providerBalanceObservedAtMs;
    if (age > limits.maximumProviderBalanceAgeMs) runFresh = false;
    if (row.receiverFailureObserved) runFailure = true;
    const ms = row.observedAtMs - (runStart ?? row.observedAtMs);
    if (runSamples > longest || (runSamples === longest && ms > longestMs)) {
      longest = runSamples;longestMs = ms;
    }
    if (runSamples >= limits.minimumConsecutiveSamples &&
        ms >= limits.minimumPersistenceMs) {
      warning = true;
      if (runFresh) warningFresh = true;
      if (runFailure) warningReceiver = true;
    }
  }
  return {
    schema:"v39.phase2g.sustained-credit-gap.v1",
    status: warning ?
      warningFresh ? "SUSTAINED_GAP_WITH_FRESH_BALANCE_EVIDENCE" :
        "SUSTAINED_GAP_UNCONFIRMED_PROVIDER_BALANCE_FRESHNESS" :
      "NO_PERSISTENT_POSITIVE_DIFFERENCE",
    maximumPositiveGapItemUnits:maxGap,
    longestEligibleRunSamples:longest,
    longestEligibleRunDurationMs:longestMs,
    receivingHealthCanProveSenderCompleteness:false,
    providerSendRootCauseIdentified:false,
    eligibleRunHadReceiverFailure:warningReceiver,
    thresholdSetProspectively:true,
    automaticStopPermitted:false,
    noProviderIO:true,
  };
}
