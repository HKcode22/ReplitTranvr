import {
  createSubscription,
  defaultWebhookUrl,
  deleteSubscriptionVerifiedStrict,
  getBalance,
  listSubscriptionsStrictWithRetry,
  type WebhookSubscription,
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
  /**
   * Independent-owner/watchdog fail-closed handshake.
   *
   * The GitHub safety watchdog runs in a separate job and therefore cannot
   * signal this process directly. It may mark the durable probe failed after
   * exact provider recovery. This callback lets the live owner observe that
   * durable stop request on its next local watchdog tick and stop exposure
   * promptly instead of continuing toward the original deadline.
   *
   * Return a durable stop reason to stop; return null to continue.
   */
  externalStopCheck?: () => Promise<string | null>;
  /**
   * When true, provider deletion/settlement/reconciliation complete here but
   * exact-session Replit Object Storage/runtime cleanup is deferred to a
   * post-stop Replit workspace finalizer. No provider exposure remains while
   * cleanup is pending.
   */
  deferCleanup?: boolean;
}

export interface PrepaidLiveWindowResultV39 {
  status: "completed" | "settling" | "failed";
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

async function deleteOwnedSubscriptionVerifiedV39(
  subscriptionId: string,
): Promise<boolean> {
  return deleteSubscriptionVerifiedStrict(subscriptionId);
}

async function recoverAmbiguousSubscriptionCreateV39(
  icao: string,
  webhookUrl: string,
): Promise<WebhookSubscription | null> {
  // A failed/timeout POST response is ambiguous: the provider may have created
  // the subscription even when the response did not reach us. Never issue a
  // second POST blindly. Reconcile only an exact airport + deterministic
  // callback match using free strict LIST reads.
  await sleep(2_000);

  const subscriptions = await listSubscriptionsStrictWithRetry();

  const exact = subscriptions.filter(
    (subscription) =>
      subscription.isActive &&
      subscription.billingType === "CreditBased" &&
      String(subscription.subject?.type ?? "") === "FlightByAirportIcao" &&
      String(subscription.subject?.id ?? "").toUpperCase() ===
        icao.toUpperCase() &&
      String(subscription.subscriber?.type ?? "") === "WebHook" &&
      String(subscription.subscriber?.id ?? "") === webhookUrl,
  );

  if (exact.length > 1) {
    throw new Error(
      "PREPAID_PROBE_CREATE_AMBIGUOUS_MULTIPLE_EXACT_SUBSCRIPTIONS",
    );
  }

  return exact[0] ?? null;
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
  if (input.deferCleanup != null && typeof input.deferCleanup !== "boolean") {
    throw new Error("PREPAID_WINDOW_DEFER_CLEANUP_INVALID");
  }
  if (
    input.externalStopCheck != null &&
    typeof input.externalStopCheck !== "function"
  ) {
    throw new Error("PREPAID_WINDOW_EXTERNAL_STOP_CHECK_INVALID");
  }
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

  // When cleanup is local, require the local Replit Object Storage boundary.
  // Under deferred cleanup the callback receiver is the already-deployed
  // Travnr service, so the GitHub owner must not require Replit-local object
  // storage credentials. Callback persistence is proven prospectively by the
  // frozen zero-credit live-callback verification artifact.
  if (!input.deferCleanup) {
    assertPrepaidProbePersistenceConfigV39();
  }

  const cleanupOrDefer = async (sessionId: string, runId: string) => {
    if (input.deferCleanup) return null;
    return cleanupPrepaidProbeSessionV39(sessionId, runId);
  };

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
  let externalStopRequested = false;
  let maxObservedUnsettledCreditGap = 0;
  let lastExternalCredits = 0;
  let nextProviderBalancePollAt = 0;
  let consecutiveFailedProviderBalancePolls = 0;

  let sub = await createSubscription("FlightByAirportIcao", icao, {
    url: webhookUrl,
    maxDeliveryRetries: 0,
  });

  if (!sub?.id) {
    sub = await recoverAmbiguousSubscriptionCreateV39(icao, webhookUrl);
  }

  if (!sub?.id) {
    await setPrepaidProbeSessionStateV39(
      session.sessionId,
      "failed",
    ).catch(() => undefined);

    const cleanup = await cleanupOrDefer(
      session.sessionId,
      `${input.deletionRunId}:create-failed`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd: new Date(),
      durationCensored: true,
      stopReason: "subscription_create_failed_after_exact_reconciliation",
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits: 0,
      maxObservedUnsettledCreditGap,
      settlementReads: 0,
      metrics: null,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null,
      subscriptionDeleted: false,
    };
  }

  await bindPrepaidProbeSubscriptionV39(session.sessionId, sub.id);
  windowStart = new Date();
  const deadline = windowStart.getTime() + targetMs;
  while (Date.now() < deadline) {
    await sleep(Math.min(input.watchdogPollMs, Math.max(250, deadline - Date.now())));

    if (input.externalStopCheck) {
      const requestedReason = await input.externalStopCheck();
      if (requestedReason) {
        externalStopRequested = true;
        liveStopReason = requestedReason;
        break;
      }
    }

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

  await setPrepaidProbeSessionStateV39(
    session.sessionId,
    externalStopRequested ? "failed" : "settling",
  );
  const settle = await runSettlement(input.settlement, async () => {
    const balance = await getBalanceWithTransientRetryV39();
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
    const cleanup = await cleanupOrDefer(
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
    const cleanup = await cleanupOrDefer(
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
  if (externalStopRequested) {
    const stopReason = liveStopReason ?? "external_watchdog_stop";
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed")
      .catch(() => undefined);
    const cleanup = await cleanupOrDefer(
      session.sessionId,
      `${input.deletionRunId}:external-stop`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: true,
      stopReason,
      reconciliationStatus,
      externalCredits,
      internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap,
      settlementReads: settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc: cleanup?.verifiedAtUtc ?? null,
      subscriptionDeleted: true,
    };
  }

  if (durationCensored) {
    const stopReason = reconciliationStopReason ?? "duration_censored_before_target";
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupOrDefer(
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

  if (input.deferCleanup) {
    // Provider exposure is already stopped and authoritative reconciliation is
    // MATCH. Keep transient callback evidence intact in state='settling' until
    // the Replit workspace performs exact-session purpose cleanup.
    await setPrepaidProbeSessionStateV39(session.sessionId, "settling");
    return {
      status: "settling", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: false, stopReason: null,
      reconciliationStatus, externalCredits, internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics,
      cleanupVerifiedAtUtc: null, subscriptionDeleted: true,
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
