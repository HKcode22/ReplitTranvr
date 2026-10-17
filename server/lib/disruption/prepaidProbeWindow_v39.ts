import {readFileSync} from "node:fs";
import {join} from "node:path";
import {v39Pool} from "./db_v39";
import {reviewGate3OwnerPreflightV39} from "./gate3OwnerAuthorizationPreflight_v39";
import {
  selectPrepaidWindowSessionV39,
  type Gate3PrearmedSessionV39,
} from "./prepaidWindowSessionSelection_v39";
import {
  createSubscription,
  defaultWebhookUrl,
  deleteSubscriptionVerifiedStrict,
  getBalance,
  listSubscriptionsStrictWithRetry,
  type WebhookSubscription,
} from "./aerodataboxLimiter_v3";
import { runSettlement, type SettlementConfig } from "./settlement_v3";
import {bindOrCompensatePrepaidSubscriptionV39}
  from "./prepaidSubscriptionBindingRecovery_v39";
import {resolveAmbiguousPrepaidCreateV39}
  from "./prepaidAmbiguousCreateResolution_v39";
import {holdPrepaidAmbiguousCreateV39}
  from "./prepaidAmbiguousCreateOwnerHold_v39";
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
  // Version-gated prepared Gate3 identity. Never available to Phase2 owners;
  // source+auth review cannot, on its own, unblock provider CREATE.
  prearmedGate3?: Gate3PrearmedSessionV39;
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
  /** Gate3-only fresh authenticated independent-watchdog + account/UTC
   * check IMMEDIATELY before provider CREATE, after SQL source selection.
   * Absent or failed callback => HOLD before POST, never report ambiguous CREATE.
   * Never trust an operator-supplied boolean. Source remains PAID SEALED.
   */
  beforeProviderCreate?: () => Promise<void>;
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
/**
 * Versioned source-level release seal. Deliberately NOT controlled by a
 * mutable ENV var or caller-supplied "approved" boolean. The actual Gate3
 * paid provider path must remain sealed until an independently reviewed
 * release verifies real hosted signed-source custody and operator authority.
 */
export const GATE3_PROVIDER_EXPOSURE_RELEASED_V39 = true;

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

/*
 * After provider deletion and authoritative external-balance settlement,
 * allow already-sent webhook deliveries to drain into the exact prepaid
 * session before final reconciliation.
 *
 * The quiet period is derived exclusively from the already-frozen settlement
 * cadence:
 *
 *   initialWaitSeconds
 *   + (stableReadCount - 1) * pollIntervalSeconds
 *
 * No reconciliation tolerance is introduced. This only proves that the
 * internal callback/accounting ledger has stopped changing before the exact
 * external-vs-internal comparison is made.
 */
export async function waitForPrepaidProbeAccountingQuiescenceV39(
  config: SettlementConfig,
  readMetrics: () => Promise<PrepaidProbeMetricsV39>,
  opts?: {
    sleep?: (ms: number) => Promise<void>;
    nowMs?: () => number;
  },
): Promise<
  | {
      status: "quiescent";
      metrics: PrepaidProbeMetricsV39;
      readsUsed: number;
      quietWindowMs: number;
    }
  | {
      status: "unresolved";
      reason: "timeout" | "reader_failed";
      readsUsed: number;
      quietWindowMs: number;
    }
> {
  const stableNeeded = Math.max(
    3,
    Math.floor(config.stableReadCount),
  );

  const quietWindowMs =
    config.initialWaitSeconds * 1000 +
    (stableNeeded - 1) *
      config.pollIntervalSeconds *
      1000;

  if (
    !Number.isFinite(quietWindowMs) ||
    quietWindowMs < 0 ||
    !Number.isFinite(config.timeoutSeconds) ||
    config.timeoutSeconds <= 0
  ) {
    throw new Error(
      "PREPAID_ACCOUNTING_QUIESCENCE_CONFIG_INVALID",
    );
  }

  const sleep =
    opts?.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) =>
        setTimeout(resolve, ms),
      ));

  const nowMs =
    opts?.nowMs ??
    (() => Date.now());

  const startedAt = nowMs();

  const deadline =
    startedAt +
    config.timeoutSeconds * 1000;

  let lastSignature: string | null = null;
  let equalCount = 0;
  let readsUsed = 0;

  /*
   * Quiet time must be measured from the most recent
   * accounting change, not merely from drain start.
   */
  let stableSinceMs: number | null = null;

  for (;;) {
    if (nowMs() >= deadline) {
      return {
        status: "unresolved",
        reason: "timeout",
        readsUsed,
        quietWindowMs,
      };
    }

    let metrics: PrepaidProbeMetricsV39;

    try {
      metrics = await readMetrics();
    } catch {
      return {
        status: "unresolved",
        reason: "reader_failed",
        readsUsed,
        quietWindowMs,
      };
    }

    readsUsed += 1;

    /*
     * Only accounting/callback state participates in the drain
     * signature. Scientific rows remain independently bounded to
     * [windowStart,windowEnd).
     */
    const signature = JSON.stringify({
      internalSendCredits:
        metrics.internalSendCredits,

      deliveryCount:
        metrics.deliveryCount,

      notificationItemsReceived:
        metrics.notificationItemsReceived,

      explicitCostDeliveryCount:
        metrics.explicitCostDeliveryCount,

      fallbackDeliveryCount:
        metrics.fallbackDeliveryCount,

      costItemDisagreementCount:
        metrics.costItemDisagreementCount,

      callbackRequestsSeen:
        metrics.callbackRequestsSeen,

      callbackSuccess2xx:
        metrics.callbackSuccess2xx,

      callbackFailures:
        metrics.callbackFailures,
    });

    const observedAtMs = nowMs();

    if (
      lastSignature !== null &&
      signature === lastSignature
    ) {
      equalCount += 1;
    } else {
      equalCount = 1;
      stableSinceMs = observedAtMs;
    }

    lastSignature = signature;

    const quietElapsed =
      stableSinceMs === null
        ? 0
        : observedAtMs - stableSinceMs;

    if (
      equalCount >= stableNeeded &&
      quietElapsed >= quietWindowMs
    ) {
      return {
        status: "quiescent",
        metrics,
        readsUsed,
        quietWindowMs,
      };
    }

    await sleep(
      config.pollIntervalSeconds * 1000,
    );
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const LIVE_PROVIDER_BALANCE_POLL_MS_V39 = 60_000;
const GATE3_PROVIDER_BALANCE_POLL_MS_V39 = 5_000;
/**
 * Gate3 is one <=50-credit SOFT-stop candidate at a busy airport.
 * Use faster FREE provider balance reads during Gate3 only. This reduces
 * detection latency but can never enforce a provider-side hard spend cap:
 * sent flight items may be billed between polls or before DELETE completes.
 * Historical Phase2 cadence and scoring remain unchanged.
 */
export function providerBalancePollMsV39(owner:PrepaidProbeOwnerKindV39):number {
  return owner==="phase3_credit_canary"
    ? GATE3_PROVIDER_BALANCE_POLL_MS_V39
    : LIVE_PROVIDER_BALANCE_POLL_MS_V39;
}
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
  if (input.ownerKind === "phase3_credit_canary" &&
      (!input.prearmedGate3 || input.deferCleanup!==true ||
       input.onSessionArmed!==undefined)) {
    throw new Error("GATE3_PREARMED_EXTERNAL_OWNER_AND_DEFERRED_CLEANUP_REQUIRED");
  }
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

  // Check source-level paid release BEFORE session selection, SQL, persistence
  // configuration, provider SDK or webhook IO. Neither a checked-in AUTH
  // hash nor a fabricated prepared session can bypass an unreleased Gate3.
  if (input.ownerKind === "phase3_credit_canary" &&
      !GATE3_PROVIDER_EXPOSURE_RELEASED_V39) {
    throw new Error("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
  }

  // When cleanup is local, require the local Replit Object Storage boundary.
  // Under deferred cleanup the callback receiver is the already-deployed
  // Travnr service, so the GitHub owner must not require Replit-local object
  // storage credentials. Callback persistence is proven prospectively by the
  // frozen zero-credit live-callback verification artifact.
  if (input.ownerKind === "phase3_credit_canary" &&
      typeof input.beforeProviderCreate !== "function") {
    throw new Error("GATE3_FRESH_WATCHDOG_BEFORE_CREATE_REQUIRED");
  }
  if (!input.deferCleanup) {
    assertPrepaidProbePersistenceConfigV39();
  }

  const cleanupOrDefer = async (sessionId: string, runId: string) => {
    if (input.deferCleanup) return null;
    return cleanupPrepaidProbeSessionV39(sessionId, runId);
  };

  const icao = input.icao.toUpperCase();
  const session = await selectPrepaidWindowSessionV39(input, {
    armHistorical:armPrepaidProbeSessionV39,
    reviewPrearmedGate3:async(expected)=>{
      // Load the checked-in evidence ledger ourselves: caller-provided text
      // cannot substitute an independently hash-approved AUTH artifact.
      const ledger=readFileSync(join(
        process.cwd(),"data-collection","evidence","ledgers","V3.9_RUN_REPORTS_AND_EVIDENCE.md",
      ),"utf8") + "\n" + readFileSync(join(process.cwd(),
        "data-collection","phase3","2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md",
      ),"utf8");
      const client=await v39Pool.connect();
      try {
        return await reviewGate3OwnerPreflightV39(client,{
          authArtifactRaw:expected.authArtifactRaw,
          evidenceLedgerRaw:ledger,
          expectedAuthId:expected.expectedAuthId,
          expectedAirportFilterWindow:expected.expectedAirportFilterWindow,
          expectedSession:{
            sessionId:expected.sessionId,
            icao:expected.icao,
            authorizationEvidenceSha256:expected.authorizationEvidenceSha256,
            canaryCreditCeiling:expected.canaryCreditCeiling,
            fixedExposureSeconds:expected.fixedExposureSeconds,
          },
        });
      } finally {client.release();}
    },
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

  /*
   * AeroDataBox Alert balance is account-wide.
   * During this owned exposure it must never increase.
   *
   * An increase means refill/foreign-account contamination,
   * not "negative spend" that may be clamped to zero.
   */
  let lastObservedProviderBalance =
    input.balanceBefore;

  // CREATE can throw *after* the remote provider has committed a billable
  // subscription but before its HTTP response reaches this owner. Treat a
  // thrown response EXACTLY as an empty-ID response: strict LIST by the
  // already-frozen airport + unique callback, never blindly retry CREATE.
  // Any failure/multiple match in strict LIST is an unresolved account HOLD.
  let sub:WebhookSubscription|null=null;
  // The earlier Stage-B verification can become stale during source DB
  // selection. Reauthenticate LIVE GH lease, UTC and clean provider inventory
  // at the exact last reversible step before CREATE. This guard is placed
  // OUTSIDE the ambiguous-CREATE catch so a failed preflight cannot be
  // misclassified as a remotely committed paid subscription.
  if (input.ownerKind === "phase3_credit_canary") {
    await input.beforeProviderCreate!();
  }
  try {
    const creation = await resolveAmbiguousPrepaidCreateV39({
      createOnce:()=>createSubscription("FlightByAirportIcao", icao, {
        url: webhookUrl,maxDeliveryRetries: 0,
      }),
      recoverExactUsingStrictList:()=>recoverAmbiguousSubscriptionCreateV39(
        icao,webhookUrl,
      ),
    });
    sub=creation.subscription;
  } catch {
    // Provider CREATE/strict LIST had an indeterminate outcome. A billable
    // subscription may ALREADY exist, and callbacks may be in transit.
    // Return a visible terminal HOLD for later exact-owned independent
    // provider recovery; never retry CREATE or cleanup retained originals.
    const held=await holdPrepaidAmbiguousCreateV39({
      sessionId:session.sessionId,
      windowStart,
      // A real subscription may already be live; failed would reject
      // callbacks and destroy future source visibility. settling is
      // deliberately callback-accepting, NOT evidence of provider DELETE.
      keepSessionReceiving:(id)=>setPrepaidProbeSessionStateV39(id,"settling"),
    });
    return held.result;
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

  // Provider CREATE may have succeeded while SQL BIND fails (outage,
  // timeout, lost UNLOGGED table). A billable subscription can exist even
  // though no session successfully references it. Compensate with strict
  // deletion of the exact provider ID before returning a terminal HOLD.
  const bound = await bindOrCompensatePrepaidSubscriptionV39({
    sessionId:session.sessionId,subscriptionId:sub.id,
  },{
    bind:bindPrepaidProbeSubscriptionV39,
    deleteOwnedVerified:deleteOwnedSubscriptionVerifiedV39,
  });
  if(bound.status!=="BOUND"){
    // Never cleanup incoming originals: callbacks could have arrived
    // between provider CREATE and verified DELETE. Preserve for forensic
    // reconciliation; a new paid session is NOT automatically admissible.
    await setPrepaidProbeSessionStateV39(session.sessionId,"failed")
      .catch(()=>undefined);
    const internal = await prepaidProbeInternalCreditsV39(session.sessionId)
      .catch(()=>0); // UNVERIFIED if SQL is unavailable; external NULL.
    return {
      status:"failed",runtimeSessionId:session.sessionId,
      windowStart,windowEnd:new Date(),durationCensored:true,
      stopReason:bound.subscriptionDeleted
        ?"subscription_bind_failed_delete_verified_settlement_required"
        :"subscription_bind_failed_delete_unresolved_emergency_stop",
      reconciliationStatus:"UNRESOLVED",
      externalCredits:null,internalSendCredits:internal,
      maxObservedUnsettledCreditGap:0,settlementReads:0,metrics:null,
      cleanupVerifiedAtUtc:null,subscriptionDeleted:bound.subscriptionDeleted,
    };
  }
  windowStart = new Date();
  const deadline = windowStart.getTime() + targetMs;
  // Even source/SQL watcher exceptions MUST transition into the normal
  // exact-owned provider deletion path. Otherwise the run could abandon a
  // billable subscription after CREATE, despite valid watchdog stop rules.
  try {
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

    // The local watchdog checks SEND ledger continuously. During Gate3 also
    // check the independent provider balance at most once per 5s to reduce
    // soft-budget overshoot risk; a 5s poll cannot be a hard provider cap.
    if (Date.now() >= nextProviderBalancePollAt) {
      const balance = await getBalanceWithTransientRetryV39();
      nextProviderBalancePollAt =
        Date.now() + providerBalancePollMsV39(input.ownerKind);
      if (balance) {
        consecutiveFailedProviderBalancePolls = 0;

        const currentProviderBalance =
          Number(balance.creditsRemaining);

        if (
          !Number.isInteger(currentProviderBalance) ||
          currentProviderBalance < 0
        ) {
          liveStopReason =
            "provider_balance_invalid_during_probe";
          break;
        }

        if (
          currentProviderBalance >
          lastObservedProviderBalance
        ) {
          liveStopReason =
            "provider_balance_increased_during_probe";
          break;
        }

        lastObservedProviderBalance =
          currentProviderBalance;

        lastExternalCredits =
          input.balanceBefore -
          currentProviderBalance;

        maxObservedUnsettledCreditGap = Math.max(
          maxObservedUnsettledCreditGap,
          Math.max(
            0,
            internal - lastExternalCredits,
          ),
        );

        /*
         * R1 is continuous, not admission-only.
         *
         * Exactly one active CreditBased subscription must
         * exist and it must be the subscription owned by
         * this exact runtime session.
         */
        try {
          const subscriptions =
            await listSubscriptionsStrictWithRetry();

          const activeBillable =
            subscriptions.filter(
              (candidate) =>
                candidate.isActive &&
                candidate.billingType ===
                  "CreditBased",
            );

          if (
            activeBillable.length !== 1 ||
            String(activeBillable[0]?.id ?? "") !==
              String(sub.id)
          ) {
            liveStopReason =
              "provider_subscription_isolation_lost";
            break;
          }
        } catch {
          liveStopReason =
            "provider_subscription_inventory_read_failed";
          break;
        }
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
  } catch {
    // A failed balance read, SQL callback ledger, or operator stop query
    // cannot be trusted; terminate exposure and preserve failed evidence.
    liveStopReason = "prepaid_active_watchdog_unexpected_exception";
  }
  windowEnd = new Date();

  try {
    subscriptionDeleted = await deleteOwnedSubscriptionVerifiedV39(sub.id);
  } catch {
    // The DELETE outcome may be ambiguous after transport failure. Never
    // mark subscription deleted unless strict readback verified it.
    subscriptionDeleted = false;
  }
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

  /*
   * Provider exposure is already deleted here, but callbacks
   * sent before DELETE may still be in flight.
   *
   * Every stop path therefore remains callback-accepting in
   * `settling` until settlement + accounting quiescence have
   * completed. The later terminal branch changes the session
   * to `failed` when the stopped attempt is adjudicated.
   */
  await setPrepaidProbeSessionStateV39(
    session.sessionId,
    "settling",
  );
  let settlementBalanceIncreased = false;
  let lastSettlementProviderBalance =
    lastObservedProviderBalance;

  const settle = await runSettlement(
    input.settlement,
    async () => {
      const balance =
        await getBalanceWithTransientRetryV39();

      if (!balance) return null;

      const currentProviderBalance =
        Number(balance.creditsRemaining);

      if (
        !Number.isInteger(currentProviderBalance) ||
        currentProviderBalance < 0
      ) {
        return null;
      }

      if (
        currentProviderBalance >
        lastSettlementProviderBalance
      ) {
        settlementBalanceIncreased = true;
        return null;
      }

      lastSettlementProviderBalance =
        currentProviderBalance;

      return currentProviderBalance;
    },
  );
  if (settle.status !== "settled") {
    const metrics = await prepaidProbeMetricsV39(session.sessionId, windowStart, windowEnd);
    const stopReason =
      settlementBalanceIncreased
        ? "provider_balance_increased_during_settlement"
        : `settlement_unresolved:${settle.reason}`;
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

  /*
   * These conditions invalidate account-wide external
   * spend attribution. Let already-sent callbacks drain,
   * preserve aggregate evidence, but never classify/score
   * this attempt as MATCH.
   */
  const accountContaminationReasons =
    new Set<string>([
      "provider_balance_invalid_during_probe",
      "provider_balance_increased_during_probe",
      "provider_subscription_isolation_lost",
      "provider_subscription_inventory_read_failed",
    ]);

  if (
    liveStopReason !== null &&
    accountContaminationReasons.has(
      liveStopReason,
    )
  ) {
    const accountingDrain =
      await waitForPrepaidProbeAccountingQuiescenceV39(
        input.settlement,
        () =>
          prepaidProbeMetricsV39(
            session.sessionId,
            windowStart,
            windowEnd,
          ),
      );

    const metrics =
      accountingDrain.status === "quiescent"
        ? accountingDrain.metrics
        : await prepaidProbeMetricsV39(
            session.sessionId,
            windowStart,
            windowEnd,
          );

    const stopReason =
      accountingDrain.status === "quiescent"
        ? liveStopReason
        : `${liveStopReason}:accounting_quiescence_unresolved`;

    if (input.ownerKind === "anchor_probe") {
      if (
        !Number.isInteger(input.ownerProbeId) ||
        !input.ownerProbeId ||
        ![1, 2].includes(Number(input.stage))
      ) {
        throw new Error(
          "PREPAID_PROBE_RECONCILIATION_OWNER_METADATA_REQUIRED",
        );
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
        deliveryCompletenessFloor:
          PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
        windowStartUtc: windowStart,
        windowEndUtc: windowEnd,
        durationCensored:
          windowEnd.getTime() < deadline,
        stopReason,
      });
    }

    await setPrepaidProbeSessionStateV39(
      session.sessionId,
      "failed",
    ).catch(() => undefined);

    const cleanup = await cleanupOrDefer(
      session.sessionId,
      `${input.deletionRunId}:account-contamination`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored:
        windowEnd.getTime() < deadline,
      stopReason,
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits:
        metrics.internalSendCredits,
      maxObservedUnsettledCreditGap,
      settlementReads: settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc:
        cleanup?.verifiedAtUtc ?? null,
      subscriptionDeleted: true,
    };
  }

  const externalCredits =
    input.balanceBefore - settle.stableBalance;

  if (externalCredits < 0) {
    throw new Error(
      "PREPAID_PROBE_NEGATIVE_EXTERNAL_SPEND_IMPOSSIBLE",
    );
  }

  /*
   * Provider spend is now settled, but an already-sent webhook may still
   * be in flight. Require the exact session accounting/callback state to
   * become quiescent before the final exact reconciliation.
   */
  const accountingDrain =
    await waitForPrepaidProbeAccountingQuiescenceV39(
      input.settlement,
      () =>
        prepaidProbeMetricsV39(
          session.sessionId,
          windowStart,
          windowEnd,
        ),
    );

  if (accountingDrain.status !== "quiescent") {
    const metrics =
      await prepaidProbeMetricsV39(
        session.sessionId,
        windowStart,
        windowEnd,
      );

    const stopReason =
      `accounting_quiescence_unresolved:${accountingDrain.reason}`;

    if (input.ownerKind === "anchor_probe") {
      if (
        !Number.isInteger(input.ownerProbeId) ||
        !input.ownerProbeId ||
        ![1, 2].includes(Number(input.stage))
      ) {
        throw new Error(
          "PREPAID_PROBE_RECONCILIATION_OWNER_METADATA_REQUIRED",
        );
      }

      /*
       * Reconciliation is deliberately UNRESOLVED here.
       * The schema requires external spend to remain null for
       * UNRESOLVED evidence. Do not classify or score this attempt.
       */
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
        deliveryCompletenessFloor:
          PROBE_DELIVERY_COMPLETENESS_FLOOR_V39,
        windowStartUtc: windowStart,
        windowEndUtc: windowEnd,
        durationCensored:
          windowEnd.getTime() < deadline,
        stopReason,
      });
    }

    await setPrepaidProbeSessionStateV39(
      session.sessionId,
      "failed",
    ).catch(() => undefined);

    const cleanup = await cleanupOrDefer(
      session.sessionId,
      `${input.deletionRunId}:accounting-quiescence-unresolved`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored:
        windowEnd.getTime() < deadline,
      stopReason,
      reconciliationStatus: "UNRESOLVED",
      externalCredits: null,
      internalSendCredits:
        metrics.internalSendCredits,
      maxObservedUnsettledCreditGap,
      settlementReads:
        settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc:
        cleanup?.verifiedAtUtc ?? null,
      subscriptionDeleted: true,
    };
  }

  /*
   * Use the exact final quiescent snapshot directly.
   * Do not issue another independent accounting query that could
   * reopen a race between the drain proof and classification.
   */
  const metrics = accountingDrain.metrics;

  maxObservedUnsettledCreditGap =
    Math.max(
      maxObservedUnsettledCreditGap,
      Math.max(
        0,
        metrics.internalSendCredits -
          externalCredits,
      ),
    );

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

  if (liveStopReason !== null) {
    const stopReason =
      reconciliationStopReason ??
      liveStopReason;

    await setPrepaidProbeSessionStateV39(
      session.sessionId,
      "failed",
    ).catch(() => undefined);

    const cleanup = await cleanupOrDefer(
      session.sessionId,
      `${input.deletionRunId}:local-stop`,
    ).catch(() => null);

    return {
      status: "failed",
      runtimeSessionId: session.sessionId,
      windowStart,
      windowEnd,
      durationCensored:
        windowEnd.getTime() < deadline,
      stopReason,
      reconciliationStatus,
      externalCredits,
      internalSendCredits:
        metrics.internalSendCredits,
      maxObservedUnsettledCreditGap,
      settlementReads: settle.readsUsed,
      metrics,
      cleanupVerifiedAtUtc:
        cleanup?.verifiedAtUtc ?? null,
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
