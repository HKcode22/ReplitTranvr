import {
  createSubscription,
  defaultWebhookUrl,
  deleteSubscription,
  getBalance,
} from "./aerodataboxLimiter_v3";
import { runSettlement, type SettlementConfig } from "./settlement_v3";
import {
  armPrepaidProbeSessionV39,
  bindPrepaidProbeSubscriptionV39,
  cleanupPrepaidProbeSessionV39,
  prepaidProbeInternalCreditsV39,
  prepaidProbeMetricsV39,
  prepaidProbeWebhookUrlV39,
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
  reconciliationStatus: "MATCH" | "MISMATCH" | "UNRESOLVED";
  externalCredits: number | null;
  internalSendCredits: number;
  settlementReads: number;
  metrics: PrepaidProbeMetricsV39 | null;
  cleanupVerifiedAtUtc: string | null;
  subscriptionDeleted: boolean;
}

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
 * runtime. The returned externalCredits exists only so the caller can report a
 * mismatch while still refusing to persist that provider account value.
 */
export async function runPrepaidLiveWindowV39(input: PrepaidLiveWindowInputV39): Promise<PrepaidLiveWindowResultV39> {
  validateInput(input);
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

  const sub = await createSubscription("FlightByAirportIcao", icao, {
    url: webhookUrl,
    maxDeliveryRetries: 0,
  });
  if (!sub?.id) {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    const cleanup = await cleanupPrepaidProbeSessionV39(session.sessionId, `${input.deletionRunId}:create-failed`).catch(() => null);
    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd: new Date(),
      durationCensored: true,
      stopReason: "subscription_create_failed",
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits: 0,
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
    const internal = await prepaidProbeInternalCreditsV39(session.sessionId);
    const balance = await getBalance();
    const external = balance ? Math.max(0, input.balanceBefore - balance.creditsRemaining) : 0;
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
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason: "subscription_delete_failed",
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits: await prepaidProbeInternalCreditsV39(session.sessionId),
      settlementReads: 0,
      metrics: null,
      cleanupVerifiedAtUtc: null,
      subscriptionDeleted: false,
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
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason: `settlement_unresolved:${settle.reason}`,
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits: await prepaidProbeInternalCreditsV39(session.sessionId),
      settlementReads: settle.readsUsed,
      metrics: null,
      cleanupVerifiedAtUtc: null,
      subscriptionDeleted: true,
    };
  }

  const externalCredits = Math.max(0, input.balanceBefore - settle.stableBalance);
  const metrics = await prepaidProbeMetricsV39(session.sessionId, windowStart, windowEnd);
  const reconciliationStatus = externalCredits === metrics.internalSendCredits ? "MATCH" : "MISMATCH";
  if (reconciliationStatus !== "MATCH") {
    await setPrepaidProbeSessionStateV39(session.sessionId, "failed").catch(() => undefined);
    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored: windowEnd.getTime() < deadline,
      stopReason: "external_internal_credit_mismatch",
      reconciliationStatus,
      externalCredits,
      internalSendCredits: metrics.internalSendCredits,
      settlementReads: settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc: null,
      subscriptionDeleted: true,
    };
  }

  const cleanup = await cleanupPrepaidProbeSessionV39(session.sessionId, input.deletionRunId);
  return {
    status: "completed",
    runtimeSessionId: session.sessionId,
    windowStart,
    windowEnd,
    durationCensored: windowEnd.getTime() < deadline,
    stopReason: liveStopReason,
    reconciliationStatus: "MATCH",
    externalCredits,
    internalSendCredits: metrics.internalSendCredits,
    settlementReads: settle.readsUsed,
    metrics,
    cleanupVerifiedAtUtc: cleanup.verifiedAtUtc,
    subscriptionDeleted: true,
  };
}
