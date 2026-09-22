import {
  createSubscription,
  defaultWebhookUrl,
  deleteSubscription,
  getBalance,
  listSubscriptionsStrict,
} from "./aerodataboxLimiter_v3";
import { runSettlement, type SettlementConfig } from "./settlement_v3";
import {
  armPrepaidProbeSessionV39,
  assertPrepaidProbePersistenceConfigV39,
  bindPrepaidProbeSubscriptionV39,
  cleanupPrepaidProbeSessionV39,
  prepaidProbeInternalCreditsV39,
  prepaidProbeMetricsV39,
  prepaidProbeWebhookUrlV39,
  persistProbeReconciliationEvidenceV39,
  setPrepaidProbeSessionStateV39,
  type PrepaidProbeMetricsV39,
  type PrepaidProbeOwnerKindV39,
} from "./prepaidProbeRuntime_v39";

export interface PrepaidLiveWindowInputV39 {
  ownerKind: PrepaidProbeOwnerKindV39;
  ownerProbeId?: number | null;
  stage?: 1 | 2 | null;
  icao: string;
  targetHours: number;
  settledOtherCredits: number;
  hardCapCredits: number;
  balanceBefore: number;
  settlement: SettlementConfig;
  deletionRunId: string;
  watchdogPollMs: number;
  onSessionArmed?: (sessionId: string) => Promise<void>;
}

export interface PrepaidLiveWindowResultV39 {
  status: "completed" | "failed";
  runtimeSessionId: string;
  windowStart: Date;
  windowEnd: Date;
  durationCensored: boolean;
  stopReason: string | null;
  reconciliationStatus: "MATCH" | "DELIVERY_GAP" | "MISMATCH" | "UNRESOLVED";
  externalCredits: number | null;
  internalSendCredits: number;
  /** Maximum observed internal SEND ledger minus provider balance delta while live. */
  maxObservedUnsettledCreditGap: number;
  settlementReads: number;
  metrics: PrepaidProbeMetricsV39 | null;
  cleanupVerifiedAtUtc: string | null;
  subscriptionDeleted: boolean;
}

// Current frozen acceptance remains exact. A positive external-minus-received
// gap is preserved as DELIVERY_GAP evidence, but is terminal/non-scoreable.
export const PROBE_DELIVERY_COMPLETENESS_FLOOR_V39 = 1;

export function classifyProbeReconciliationV39(input: {
  ownerKind: PrepaidProbeOwnerKindV39;
  externalCredits: number;
  internalSendCredits: number;
  costItemDisagreementCount: number;
  deliveryCompletenessFloor?: number;
}): {
  status: "MATCH" | "DELIVERY_GAP" | "MISMATCH";
  deliveryGapCredits: number;
  deliveryCompleteness: number;
} {
  const floor = input.deliveryCompletenessFloor ?? PROBE_DELIVERY_COMPLETENESS_FLOOR_V39;
  if (floor !== 1) throw new Error("PROBE_NONZERO_RECONCILIATION_TOLERANCE_NOT_AUTHORIZED");
  if (!Number.isInteger(input.externalCredits) || input.externalCredits < 0 ||
      !Number.isInteger(input.internalSendCredits) || input.internalSendCredits < 0 ||
      !Number.isInteger(input.costItemDisagreementCount) || input.costItemDisagreementCount < 0) {
    throw new Error("PROBE_RECONCILIATION_INPUT_INVALID");
  }

  const deliveryGapCredits = input.externalCredits - input.internalSendCredits;
  const deliveryCompleteness = input.externalCredits === 0
    ? (input.internalSendCredits === 0 ? 1 : 0)
    : input.internalSendCredits / input.externalCredits;

  if (deliveryGapCredits === 0 && input.costItemDisagreementCount === 0) {
    return { status: "MATCH", deliveryGapCredits, deliveryCompleteness };
  }

  if (
    input.ownerKind === "anchor_probe" &&
    deliveryGapCredits > 0 &&
    input.costItemDisagreementCount === 0
  ) {
    // DELIVERY_GAP is a diagnostic classification only under the current
    // exact-match acceptance rule. Do not convert it into a completed probe.
    return { status: "DELIVERY_GAP", deliveryGapCredits, deliveryCompleteness };
  }

  return { status: "MISMATCH", deliveryGapCredits, deliveryCompleteness };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const LIVE_PROVIDER_BALANCE_POLL_MS_V39 = 60_000;
const LIVE_PROVIDER_BALANCE_FAILED_POLL_LIMIT_V39 = 3;

async function getBalanceWithTransientRetryV39(): Promise<Awaited<ReturnType<typeof getBalance>>> {
  // AeroDataBox balance is a free control-plane read. A single gateway 5xx
  // must not censor a two-hour scientific probe. Retry briefly and boundedly;
  // repeated failure still stops exposure fail-closed.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const balance = await getBalance();
    if (balance) return balance;
    if (attempt < 3) await sleep(attempt === 1 ? 2_000 : 3_000);
  }
  return null;
}

async function deleteOwnedSubscriptionVerifiedV39(subscriptionId: string): Promise<boolean> {
  // DELETE is scoped to the exact provider id returned by createSubscription.
  // A transient gateway error is ambiguous: the provider may have applied the
  // delete even when our response is 5xx. Verify account state after every
  // attempt and retry only this same exact id. LIST/DELETE are free operations.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const before = await listSubscriptionsStrict();
      if (!before.some((subscription) => subscription.id === subscriptionId && subscription.isActive)) {
        return true;
      }
    } catch {
      // Account read uncertainty does not authorize success; continue with the
      // exact-id idempotent delete and verify again afterward.
    }

    await deleteSubscription(subscriptionId);
    await sleep(5_000);

    try {
      const after = await listSubscriptionsStrict();
      if (!after.some((subscription) => subscription.id === subscriptionId && subscription.isActive)) {
        return true;
      }
    } catch {
      // Keep fail-closed and make at most the bounded exact-id retries.
    }

    if (attempt < 3) await sleep(10_000);
  }
  return false;
}

function validateInput(input: PrepaidLiveWindowInputV39): void {
  if (!/^[A-Z0-9]{4}$/.test(input.icao.toUpperCase())) throw new Error("PREPAID_WINDOW_ICAO_INVALID");
  if (!(input.targetHours > 0 && input.targetHours <= 6)) throw new Error("PREPAID_WINDOW_DURATION_INVALID");
  if (!Number.isInteger(input.hardCapCredits) || input.hardCapCredits <= 0) throw new Error("PREPAID_WINDOW_CAP_INVALID");
  if (!Number.isInteger(input.settledOtherCredits) || input.settledOtherCredits < 0) throw new Error("PREPAID_WINDOW_SETTLED_OTHER_INVALID");
  if (!Number.isInteger(input.balanceBefore) || input.balanceBefore < 0) throw new Error("PREPAID_WINDOW_BALANCE_BEFORE_INVALID");
  if (!Number.isFinite(input.watchdogPollMs) || input.watchdogPollMs < 250 || input.watchdogPollMs > 60_000) {
    throw new Error("PREPAID_WINDOW_WATCHDOG_POLL_INVALID");
  }
  if (!String(input.deletionRunId ?? "").trim()) throw new Error("PREPAID_WINDOW_DELETION_RUN_ID_REQUIRED");
}

/**
 * Single owner for a prepaid Alert exposure window.
 *
 * Provider subscription/balance values never leave process memory/UNLOGGED
 * runtime. The returned externalCredits exists only for immediate reconciliation
 * and MUST NOT be persisted as provider account content by callers.
 */
export async function runPrepaidLiveWindowV39(input: PrepaidLiveWindowInputV39): Promise<PrepaidLiveWindowResultV39> {
  validateInput(input);

  // Defense in depth: do not create or arm a paid provider subscription
  // unless the prepaid persistence path is locally configured to accept it.
  assertPrepaidProbePersistenceConfigV39();

  const icao = input.icao.toUpperCase();
  const session = await armPrepaidProbeSessionV39({
    ownerKind: input.ownerKind,
    ownerProbeId: input.ownerProbeId ?? null,
    stage: input.stage ?? null,
    icao: input.ownerKind === "anchor_probe" ? icao : null,
    lifetimeHours: 24,
  });
  if (input.onSessionArmed) await input.onSessionArmed(session.sessionId);
  const webhookUrl = prepaidProbeWebhookUrlV39(defaultWebhookUrl(), session.sessionId);
  const targetMs = input.targetHours * 3_600_000;
  let subscriptionDeleted = false;
  let windowStart = new Date();
  let windowEnd = windowStart;
  let liveStopReason: string | null = null;
  let maxObservedUnsettledCreditGap = 0;
  let lastExternalCredits = 0;
  let nextProviderBalancePollAt = 0;
  let consecutiveFailedProviderBalancePolls = 0;

  const sub = await createSubscription("FlightByAirportIcao", icao, {
    url: webhookUrl,
    maxDeliveryRetries: 0,
  });
  if (!sub?.id) {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(session.sessionId, `${input.deletionRunId}:create-failed`).catch(() => null);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd: new Date(), durationCensored: true,
      stopReason: "subscription_create_failed", reconciliationStatus: "UNRESOLVED", externalCredits: null,
      internalSendCredits: 0, maxObservedUnsettledCreditGap, settlementReads: 0, metrics: null,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null, subscriptionDeleted: false,
    };
  }

  await bindPrepaidProbeSubscriptionV39(session.sessionId, sub.id);
  windowStart = new Date();
  const deadline = windowStart.getTime() + targetMs;
  while (Date.now() < deadline) {
    await sleep(Math.min(input.watchdogPollMs, Math.max(250, deadline - Date.now())));
    const internal = await prepaidProbeInternalCreditsV39(session.sessionId);

    // The 5-second watchdog remains local and protects the soft cap from
    // received SEND evidence. Provider balance is a control-plane cross-check,
    // not something we need to hammer every watchdog tick.
    if (Date.now() >= nextProviderBalancePollAt) {
      const balance = await getBalanceWithTransientRetryV39();
      nextProviderBalancePollAt = Date.now() + LIVE_PROVIDER_BALANCE_POLL_MS_V39;
      if (balance) {
        consecutiveFailedProviderBalancePolls = 0;
        lastExternalCredits = Math.max(0, input.balanceBefore - balance.creditsRemaining);
        maxObservedUnsettledCreditGap = Math.max(
          maxObservedUnsettledCreditGap,
          Math.max(0, internal - lastExternalCredits),
        );
      } else {
        consecutiveFailedProviderBalancePolls += 1;
        if (consecutiveFailedProviderBalancePolls >= LIVE_PROVIDER_BALANCE_FAILED_POLL_LIMIT_V39) {
          liveStopReason = "balance_read_failed_after_retries";
          break;
        }
      }
    }

    if (input.settledOtherCredits + Math.max(internal, lastExternalCredits) >= input.hardCapCredits) {
      liveStopReason = "probe_cap_soft_stop";
      break;
    }
  }
  windowEnd = new Date();

  subscriptionDeleted = await deleteOwnedSubscriptionVerifiedV39(sub.id);
  if (!subscriptionDeleted) {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: windowEnd.getTime() < deadline, stopReason: "subscription_delete_failed",
      reconciliationStatus: "UNRESOLVED", externalCredits: null,
      internalSendCredits: await prepaidProbeInternalCreditsV39(session.sessionId),
      maxObservedUnsettledCreditGap, settlementReads: 0, metrics: null,
      cleanupVerifiedAtUtc: null, subscriptionDeleted: false,
    };
  }

  await setPrepaidProbeSessionStateV39(session.sessionId, "settling");
  const settle = await runSettlement(input.settlement, async () => {
    const balance = await getBalance();
    return balance ? balance.creditsRemaining : null;
  });
  if (settle.status !== "settled") {
    const metrics = await prepaidProbeMetricsV39(session.sessionId, windowStart, windowEnd);
    const stopReason = `settlement_unresolved:${settle.reason}`;
    if (input.ownerKind === "anchor_probe") {
      if (!Number.isInteger(input.ownerProbeId) || !input.ownerProbeId || ![1, 2].includes(Number(input.stage))) {
        throw new Error("PREPAID_PROBE_RECONCILIATION_OWNER_METADATA_REQUIRED");
      }
      await persistProbeReconciliationEvidenceV39({
        probeId: input.ownerProbeId,
        runtimeSessionId: session.sessionId,
        stage: input.stage as 1 | 2,
        icao,
        evidenceStatus: "UNRESOLVED",
        externalSpendCredits: null,
        metrics,
        settlementReads: settle.readsUsed,
        maxObservedUnsettledCreditGap,
        deliveryCompletenessFloor: PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
        windowStartUtc: windowStart,
        windowEndUtc: windowEnd,
        durationCensored: windowEnd.getTime() < deadline,
        stopReason,
      });
    }
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `${input.deletionRunId}:settlement-unresolved`,
    ).catch(() => null);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: windowEnd.getTime() < deadline, stopReason,
      reconciliationStatus: "UNRESOLVED", externalCredits: null,
      internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null, subscriptionDeleted: true,
    };
  }

  const externalCredits = Math.max(0, input.balanceBefore - settle.stableBalance);
  const metrics = await prepaidProbeMetricsV39(session.sessionId, windowStart, windowEnd);
  maxObservedUnsettledCreditGap = Math.max(maxObservedUnsettledCreditGap, Math.max(0, metrics.internalSendCredits - externalCredits));

  // V3.9 §3.2 makes settled provider spend authoritative and explicitly
  // warns that a billed SEND can be absent from the received callback ledger.
  // Safety-smoke owners remain exact-match only. Anchor probes preserve a
  // positive external-minus-received gap as DELIVERY_GAP evidence, but the
  // current frozen acceptance rule remains exact and therefore fail-closed.
  const classified = classifyProbeReconciliationV39({
    ownerKind: input.ownerKind,
    externalCredits,
    internalSendCredits: metrics.internalSendCredits,
    costItemDisagreementCount: metrics.costItemDisagreementCount,
  });
  const deliveryGapCredits = classified.deliveryGapCredits;
  const deliveryCompleteness = classified.deliveryCompleteness;
  const reconciliationStatus = classified.status;
  const reconciliationStopReason = liveStopReason === "balance_read_failed_after_retries"
    ? "balance_read_failed_after_retries"
    : reconciliationStatus === "DELIVERY_GAP"
      ? "external_internal_delivery_gap"
      : reconciliationStatus === "MISMATCH"
        ? "external_internal_credit_mismatch"
        : liveStopReason;

  if (input.ownerKind === "anchor_probe") {
    if (!Number.isInteger(input.ownerProbeId) || !input.ownerProbeId || ![1, 2].includes(Number(input.stage))) {
      throw new Error("PREPAID_PROBE_RECONCILIATION_OWNER_METADATA_REQUIRED");
    }
    await persistProbeReconciliationEvidenceV39({
      probeId: input.ownerProbeId,
      runtimeSessionId: session.sessionId,
      stage: input.stage as 1 | 2,
      icao,
      evidenceStatus: reconciliationStatus,
      externalSpendCredits: externalCredits,
      metrics,
      settlementReads: settle.readsUsed,
      maxObservedUnsettledCreditGap,
      deliveryCompletenessFloor: PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
      windowStartUtc: windowStart,
      windowEndUtc: windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason: reconciliationStopReason,
    });
  }

  if (reconciliationStatus !== "MATCH") {
    const stopReason = reconciliationStopReason ?? "external_internal_credit_mismatch";
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `${input.deletionRunId}:${reconciliationStatus === "DELIVERY_GAP" ? "delivery-gap" : "mismatch"}`,
    ).catch(() => null);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason,
      reconciliationStatus, externalCredits, internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null, subscriptionDeleted: true,
    };
  }

  const durationCensored = windowEnd.getTime() < deadline;
  if (durationCensored) {
    const stopReason = reconciliationStopReason ?? "duration_censored_before_target";
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `${input.deletionRunId}:duration-censored`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: true,
      stopReason,
      reconciliationStatus: "MATCH",
      externalCredits,
      internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap,
      settlementReads: settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null,
      subscriptionDeleted: true,
    };
  }

  const cleanup = await cleanupPrepaidProbeSessionV39(session.sessionId, input.deletionRunId);
  return {
    status: "completed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
    durationCensored: windowEnd.getTime() < deadline, stopReason: liveStopReason,
    reconciliationStatus, externalCredits, internalSendCredits: metrics.internalSendCredits,
    maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics,
    cleanupVerifiedAtUtc: cleanup.verifiedAtUtc, subscriptionDeleted: true,
  };
}
