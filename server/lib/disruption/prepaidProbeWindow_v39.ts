import {
  createSubscription,
  defaultWebhookUrl,
  deleteSubscription,
  getBalance,
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

export const PROBE_DELIVERY_COMPLETENESS_FLOOR_V39 = 0.99;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    const balance = await getBalance();

    // A missing authoritative balance can never be treated as zero spend.
    // Stop the live exposure immediately; deletion occurs directly after
    // leaving this loop, before settlement/reconciliation.
    if (!balance) {
      liveStopReason = "balance_read_failed";
      break;
    }

    const external = Math.max(0, input.balanceBefore - balance.creditsRemaining);
    maxObservedUnsettledCreditGap = Math.max(maxObservedUnsettledCreditGap, Math.max(0, internal - external));
    if (input.settledOtherCredits + Math.max(internal, external) >= input.hardCapCredits) {
      liveStopReason = "probe_cap_soft_stop";
      break;
    }
  }
  windowEnd = new Date();

  subscriptionDeleted = await deleteSubscription(sub.id);
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
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: windowEnd.getTime() < deadline, stopReason: `settlement_unresolved:${settle.reason}`,
      reconciliationStatus: "UNRESOLVED", externalCredits: null,
      internalSendCredits: await prepaidProbeInternalCreditsV39(session.sessionId),
      maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics: null,
      cleanupVerifiedAtUtc: null, subscriptionDeleted: true,
    };
  }

  const externalCredits = Math.max(0, input.balanceBefore - settle.stableBalance);
  const metrics = await prepaidProbeMetricsV39(session.sessionId, windowStart, windowEnd);
  maxObservedUnsettledCreditGap = Math.max(maxObservedUnsettledCreditGap, Math.max(0, metrics.internalSendCredits - externalCredits));

  const deliveryGapCredits = externalCredits - metrics.internalSendCredits;
  const deliveryCompleteness = externalCredits === 0
    ? (metrics.internalSendCredits === 0 ? 1 : 0)
    : metrics.internalSendCredits / externalCredits;

  // V3.9 §3.2 makes the settled provider balance delta authoritative and
  // explicitly notes that a billed SEND may never reach the callback. The
  // received-attempt ledger is therefore diagnostic rather than an equality
  // oracle. Accept only a small pre-frozen delivery loss; contradictory
  // accounting (internal > external), cost/item disagreement, or <99%
  // completeness remains a hard MISMATCH.
  const reconciliationStatus: "MATCH" | "DELIVERY_GAP" | "MISMATCH" =
    deliveryGapCredits === 0 && metrics.costItemDisagreementCount === 0
      ? "MATCH"
      : deliveryGapCredits > 0 &&
          deliveryCompleteness >= PROBE_DELIVERY_COMPLETENESS_FLOOR_V39 &&
          metrics.costItemDisagreementCount === 0
        ? "DELIVERY_GAP"
        : "MISMATCH";

  await persistProbeReconciliationEvidenceV39({
    probeId: Number(input.ownerProbeId),
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
    stopReason: liveStopReason,
  });

  if (reconciliationStatus === "MISMATCH") {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    return {
      status: "failed", runtimeSessionId: session.sessionId, windowStart, windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason: liveStopReason === "balance_read_failed"
        ? "balance_read_failed"
        : "external_internal_credit_mismatch",
      reconciliationStatus, externalCredits, internalSendCredits: metrics.internalSendCredits,
      maxObservedUnsettledCreditGap, settlementReads: settle.readsUsed, metrics,
      cleanupVerifiedAtUtc: null, subscriptionDeleted: true,
    };
  }

  if (liveStopReason === "balance_read_failed") {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `${input.deletionRunId}:balance-read-failed`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: true,
      stopReason: "balance_read_failed",
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
