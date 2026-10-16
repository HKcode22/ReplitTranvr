/**
 * Phase 3 Gate 3 — INERT, fixture-only prepaid canary contract.
 *
 * This evaluator does NOT contact AeroDataBox, use the production database,
 * arm a runtime session, call the live receiver or authorize a paid canary.
 * A PASS only means internally consistent typed OFFLINE TEST FIXTURE.
 * It cannot establish publication compatibility, real sender deliveries,
 * original blob custody, 3 provider GETs, or the Gate 3 live predecessor.
 *
 * Never route a paid owner through this pure fixture evaluator.
 */
export const GATE3_PREPAID_PATH_TEMPLATE_V39 =
  "/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId" as const;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface Gate3OfflineBalanceReadV39 {
  observedAtMs: number;
  remainingCredits: number;
}
export interface Gate3OfflineSourceV39 {
  sourceId: string;
  sessionId: string;
  subscriptionId: string;
  itemCount: number;
  explicitCostCredits: number;
  originalBlobShaVerified: boolean;
  rawDurableBeforeAck: boolean;
  http2xxAfterRaw: boolean;
  semanticItemLedgerStored: boolean;
}
export interface Gate3OfflineFixtureV39 {
  routeTemplate: string;
  sessionId: string;
  subscriptionId: string;
  balanceBefore: number;
  balanceReads: readonly Gate3OfflineBalanceReadV39[];
  minSettlementPollIntervalMs: number;
  sourceEvents: readonly Gate3OfflineSourceV39[];
  publisherRouteBindingAsserted: boolean;
  foreignActiveBillableBefore: number;
  ownedActiveBillableAfterCleanup: number;
  exactOwnedSubscriptionDeleteVerified: boolean;
}
export interface Gate3OfflineVerdictV39 {
  schema: "v39.gate3.prepaid-inert-fixture.v1";
  status: "OFFLINE_FIXTURE_PASS" | "OFFLINE_FIXTURE_HOLD";
  reasons: string[];
  externalBilledCredits: number | null;
  internalSavedCredits: number | null;
  discrepancyCredits: number | null;
  observedRawSources: number;
  minimumStableBalanceReadsVerified: boolean;
  // Intentionally NEVER return a live Gate 3 PASS or paid authorization.
  liveGate3Certified: false;
  paidProviderAuthorized: false;
  legacyPaidCanaryUnblocked: false;
}
const nonnegativeInt = (x: unknown): x is number =>
  typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
const positiveInt = (x: unknown): x is number =>
  nonnegativeInt(x) && x > 0;
const isTrue = (x: unknown) => x === true;

/** Evaluate synthetic inputs without making ANY side-effectful calls. */
export function evaluateGate3PrepaidOfflineFixtureV39(
  input: Gate3OfflineFixtureV39,
): Gate3OfflineVerdictV39 {
  const bad = new Set<string>();
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      schema: "v39.gate3.prepaid-inert-fixture.v1",
      status: "OFFLINE_FIXTURE_HOLD", reasons: ["INVALID_INPUT_OBJECT"],
      externalBilledCredits: null, internalSavedCredits: null,
      discrepancyCredits: null, observedRawSources: 0,
      minimumStableBalanceReadsVerified: false,
      liveGate3Certified: false, paidProviderAuthorized: false,
      legacyPaidCanaryUnblocked: false,
    };
  }
  if (input.routeTemplate !== GATE3_PREPAID_PATH_TEMPLATE_V39)
    bad.add("INCOMPATIBLE_PREPAID_CALLBACK_ROUTE");
  if (typeof input.sessionId !== "string" || !UUID.test(input.sessionId))
    bad.add("INVALID_SESSION_ID");
  if (typeof input.subscriptionId !== "string" ||
      input.subscriptionId.length < 3 || input.subscriptionId.trim() !== input.subscriptionId)
    bad.add("INVALID_SUBSCRIPTION_ID");
  if (!isTrue(input.publisherRouteBindingAsserted))
    bad.add("NO_PUBLISHED_BINDING_IN_FIXTURE");
  if (!nonnegativeInt(input.foreignActiveBillableBefore) ||
      input.foreignActiveBillableBefore !== 0)
    bad.add("FOREIGN_ACTIVE_BILLABLE_OR_INVALID");
  if (!nonnegativeInt(input.ownedActiveBillableAfterCleanup) ||
      input.ownedActiveBillableAfterCleanup !== 0 ||
      !isTrue(input.exactOwnedSubscriptionDeleteVerified))
    bad.add("EXACT_SUBSCRIPTION_CLEANUP_UNVERIFIED");

  if (!positiveInt(input.balanceBefore))
    bad.add("INVALID_BALANCE_BEFORE");
  if (!positiveInt(input.minSettlementPollIntervalMs))
    bad.add("INVALID_SETTLEMENT_CADENCE");

  let stable = false;
  let balanceStable: number | null = null;
  if (!Array.isArray(input.balanceReads) || input.balanceReads.length < 3) {
    bad.add("INSUFFICIENT_SETTLED_BALANCE_READS");
  } else {
    const reads = input.balanceReads;
    let sound = true;
    for (let i = 0; i < reads.length; i++) {
      const curr = reads[i];
      if (curr === null || typeof curr !== "object" ||
          !nonnegativeInt(curr.remainingCredits) ||
          !nonnegativeInt(curr.observedAtMs) ||
          (positiveInt(input.balanceBefore) &&
           curr.remainingCredits > input.balanceBefore)) {
        sound = false;
        break;
      }
      if (i > 0) {
        const prior = reads[i - 1];
        if (!positiveInt(input.minSettlementPollIntervalMs) ||
            curr.observedAtMs - prior.observedAtMs <
              input.minSettlementPollIntervalMs ||
            curr.remainingCredits > prior.remainingCredits) {
          sound = false;
          break;
        }
      }
    }
    if (!sound) bad.add("INVALID_BALANCE_READS_OR_SETTLEMENT_TIMING");
    else {
      const n = reads.length;
      stable = reads[n - 1].remainingCredits === reads[n - 2].remainingCredits &&
        reads[n - 2].remainingCredits === reads[n - 3].remainingCredits;
      if (!stable) bad.add("NO_THREE_CONSECUTIVE_STABLE_READS");
      else balanceStable = reads[n - 1].remainingCredits;
    }
  }

  let internal: number | null = null;
  if (!Array.isArray(input.sourceEvents) || input.sourceEvents.length === 0) {
    bad.add("NO_DURABLY_RECEIVED_SOURCES");
  } else {
    const seen = new Set<string>();
    let sum = 0;
    for (const source of input.sourceEvents) {
      if (source === null || typeof source !== "object") {
        bad.add("INVALID_SOURCE_ENTRY"); continue;
      }
      if (typeof source.sourceId !== "string" || source.sourceId.length < 1 ||
          seen.has(source.sourceId)) bad.add("DUPLICATE_OR_INVALID_SOURCE_ID");
      else seen.add(source.sourceId);
      if (source.sessionId !== input.sessionId ||
          source.subscriptionId !== input.subscriptionId)
        bad.add("CROSS_SESSION_OR_SUBSCRIPTION_SOURCE");
      if (!positiveInt(source.itemCount) ||
          !nonnegativeInt(source.explicitCostCredits) ||
          source.itemCount !== source.explicitCostCredits)
        bad.add("INVALID_ITEM_CREDIT_PARITY");
      if (!isTrue(source.originalBlobShaVerified) ||
          !isTrue(source.rawDurableBeforeAck) ||
          !isTrue(source.http2xxAfterRaw) ||
          !isTrue(source.semanticItemLedgerStored))
        bad.add("RAW_ACK_LEDGER_EVIDENCE_INCOMPLETE");
      if (positiveInt(source.itemCount) && Number.isSafeInteger(sum + source.itemCount))
        sum += source.itemCount;
      else bad.add("INVALID_ITEM_TOTAL");
    }
    if (!bad.has("INVALID_ITEM_CREDIT_PARITY") &&
        !bad.has("INVALID_ITEM_TOTAL") &&
        !bad.has("INVALID_SOURCE_ENTRY")) internal = sum;
  }

  let external: number | null = null;
  if (positiveInt(input.balanceBefore) && balanceStable !== null) {
    const value = input.balanceBefore - balanceStable;
    if (!positiveInt(value)) bad.add("CANARY_NO_POSITIVE_VERIFIED_SPEND");
    else external = value;
  }
  let discrepancy: number | null = null;
  if (external !== null && internal !== null) {
    discrepancy = external - internal;
    if (discrepancy !== 0) bad.add("GATE3_EXACT_ZERO_TOLERANCE_MISMATCH");
  }
  return {
    schema: "v39.gate3.prepaid-inert-fixture.v1",
    status: bad.size === 0 ? "OFFLINE_FIXTURE_PASS" : "OFFLINE_FIXTURE_HOLD",
    reasons: [...bad].sort(),
    externalBilledCredits: external,
    internalSavedCredits: internal,
    discrepancyCredits: discrepancy,
    observedRawSources: Array.isArray(input.sourceEvents) ? input.sourceEvents.length : 0,
    minimumStableBalanceReadsVerified: stable,
    liveGate3Certified: false,
    paidProviderAuthorized: false,
    legacyPaidCanaryUnblocked: false,
  };
}
