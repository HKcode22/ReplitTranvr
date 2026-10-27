/**
 * Source/receiver completeness triage — offline, no external IO or mutation.
 *
 * IMPORTANT: AeroDataBox bills on SEND flight-item credits, not on confirmed
 * receiver webhook arrivals. A healthy 6+6 endpoint is NOT sender evidence.
 * A "gap of 2" is NOT two independently proven missing HTTP POSTs or flights.
 *
 * Caller must separately authenticate provider statements and source scope.
 * This function does not confer Phase4/6 authorization or trigger a STOP.
 */
export type ProviderSendProofV39 = Readonly<{
  /** Exactly same subscription, time window, billing basis as the account delta. */
  independentlyAuthenticatedAndScopeMatched: boolean;
  /** Flight-item *attempt* credits; not notification HTTP request count. */
  attributedFlightItemCredits: number;
  notificationSendAttempts: number;
}>;

export type Phase2gGapInputV39 = Readonly<{
  externalBilledItemCredits: number | null;
  retainedOriginalItemCreditClaims: number;
  receivedHttp2xxWebhookRequests: number;
  sustainedReceiverHealthFailureObserved: boolean;
  /** A dated terminal account reconciliation, not a mid-window sample. */
  externalAccountSnapshotTerminal: boolean;
  senderProof?: ProviderSendProofV39 | null;
  /** Optional PRE-REGISTERED operator-study limits; never automatic STOP. */
  prospectiveReviewLimits?: Readonly<{
    warningPositiveGapUnits: number;
    warningPositiveGapFraction: number;
  }> | null;
}>;

export type Phase2gGapAssessmentV39 = Readonly<{
  schema: "v39.phase2g.provider-receiver-gap-audit.v1";
  status: "NO_TERMINAL_PROVIDER_COMPARISON" | "RECONCILED_ITEM_CREDITS" |
    "UNATTRIBUTED_POSITIVE_ITEM_CREDIT_GAP" | "NEGATIVE_ITEM_CREDIT_DIFFERENCE";
  gapItemCredits: number | null;
  positiveGapFractionOfBilled: number | null;
  /** The 6+6 health monitor cannot answer missing sender-attempt questions. */
  receiverHealthNotSenderProof: true;
  observedReceiverHttp2xx: number;
  sustainedReceiverHealthFailureObserved: boolean;
  providerSendBasis: "NO_TRUSTED_SENDER_EVIDENCE" |
    "SENDER_EVIDENCE_SCOPE_OR_AUTH_UNVERIFIED" |
    "SENDER_EVIDENCE_MATCHES_BILLED" |
    "SENDER_EVIDENCE_DIFFERS_FROM_BILLED";
  senderAttributedItemCredits: number | null;
  notificationSendAttempts: number | null;
  /** Even validated provider SEND vs stored-count does not identify edge/ACK/JSON cause. */
  mechanismEstablished: false;
  warningReviewSuggested: boolean;
  warningLimitsSupplied: boolean;
  automaticStopAuthorized: false;
  providerRequests: 0;
  databaseWrites: 0;
}>;

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function assessPhase2gProviderReceiverGapV39(
  input: Phase2gGapInputV39
): Phase2gGapAssessmentV39 {
  if (!input ||
      (input.externalBilledItemCredits !== null &&
        !validCount(input.externalBilledItemCredits)) ||
      !validCount(input.retainedOriginalItemCreditClaims) ||
      !validCount(input.receivedHttp2xxWebhookRequests) ||
      typeof input.sustainedReceiverHealthFailureObserved !== "boolean" ||
      typeof input.externalAccountSnapshotTerminal !== "boolean") {
    throw Error("P2G_GAP_INVALID_COUNTS_OR_BASIS");
  }
  const e = input.senderProof;
  if (e && (typeof e.independentlyAuthenticatedAndScopeMatched !== "boolean" ||
      !validCount(e.attributedFlightItemCredits) ||
      !validCount(e.notificationSendAttempts))) {
    throw Error("P2G_GAP_INVALID_SENDER_EVIDENCE");
  }
  const lim = input.prospectiveReviewLimits;
  if (lim && (!validCount(lim.warningPositiveGapUnits) ||
      typeof lim.warningPositiveGapFraction !== "number" ||
      !Number.isFinite(lim.warningPositiveGapFraction) ||
      lim.warningPositiveGapFraction < 0 ||
      lim.warningPositiveGapFraction > 1)) {
    throw Error("P2G_GAP_INVALID_PREDECLARED_REVIEW_LIMITS");
  }
  const terminal = input.externalAccountSnapshotTerminal &&
    input.externalBilledItemCredits !== null;
  const billed = terminal ? input.externalBilledItemCredits! : null;
  const gap = billed === null ? null :
    billed - input.retainedOriginalItemCreditClaims;
  const positiveFraction = gap === null || gap <= 0 || billed === null || billed === 0 ?
    null : gap / billed;
  const status: Phase2gGapAssessmentV39["status"] =
    gap === null ? "NO_TERMINAL_PROVIDER_COMPARISON" :
      gap === 0 ? "RECONCILED_ITEM_CREDITS" :
        gap > 0 ? "UNATTRIBUTED_POSITIVE_ITEM_CREDIT_GAP" :
          "NEGATIVE_ITEM_CREDIT_DIFFERENCE";
  const sendBasis: Phase2gGapAssessmentV39["providerSendBasis"] =
    !e ? "NO_TRUSTED_SENDER_EVIDENCE" :
      !e.independentlyAuthenticatedAndScopeMatched ?
        "SENDER_EVIDENCE_SCOPE_OR_AUTH_UNVERIFIED" :
        billed === null || billed !== e.attributedFlightItemCredits ?
          "SENDER_EVIDENCE_DIFFERS_FROM_BILLED" :
          "SENDER_EVIDENCE_MATCHES_BILLED";
  const limitReview = lim && gap !== null && gap > 0 &&
    (gap >= lim.warningPositiveGapUnits ||
      (positiveFraction !== null &&
        positiveFraction >= lim.warningPositiveGapFraction));
  return {
    schema: "v39.phase2g.provider-receiver-gap-audit.v1",
    status, gapItemCredits: gap,
    positiveGapFractionOfBilled: positiveFraction,
    receiverHealthNotSenderProof: true,
    observedReceiverHttp2xx: input.receivedHttp2xxWebhookRequests,
    sustainedReceiverHealthFailureObserved:
      input.sustainedReceiverHealthFailureObserved,
    providerSendBasis: sendBasis,
    senderAttributedItemCredits:
      e?.independentlyAuthenticatedAndScopeMatched === true ?
        e.attributedFlightItemCredits : null,
    notificationSendAttempts:
      e?.independentlyAuthenticatedAndScopeMatched === true ?
        e.notificationSendAttempts : null,
    mechanismEstablished: false,
    warningReviewSuggested: Boolean(limitReview),
    warningLimitsSupplied: Boolean(lim),
    automaticStopAuthorized: false,
    providerRequests: 0, databaseWrites: 0,
  };
}
