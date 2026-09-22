import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  defaultWebhookUrl,
  deleteSubscription,
  listSubscriptionsStrict,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  cleanupPrepaidProbeSessionV39,
  prepaidProbeWebhookUrlV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const LEDGER = path.join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function readAuth(authPath: string): { record: AuthRecord; sha256: string } {
  const raw = fs.readFileSync(authPath, "utf8");
  let record: AuthRecord;
  try { record = JSON.parse(raw); }
  catch { throw new Error("RECOVERY_REFUSED:AUTH_INVALID_JSON"); }
  return { record, sha256: sha256HexString(raw) };
}
async function openRecoveryIncident(detail: Record<string, unknown>): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('reconciliation',now(),$1::jsonb,false)`,
    [JSON.stringify({ kind: "stage1_supervisor_recovery", owner: "v39_phase2g_stage1_recover_after_exit_v39", ...detail })],
  );
}
async function markProbeFailed(input: {
  probeId: number;
  sessionId: string | null;
  stopReason: string;
  cleanupVerifiedAtUtc: string | null;
}): Promise<void> {
  await pool.query(
    `UPDATE clean.adb_anchor_probe
        SET status='failed',window_end=COALESCE(window_end,now()),duration_censored=true,
            stop_reason=COALESCE(stop_reason,$2),
            reconciliation_status=COALESCE(reconciliation_status,'UNRESOLVED'),
            runtime_session_id=COALESCE($3::uuid,runtime_session_id),
            runtime_cleanup_verified_at_utc=COALESCE($4::timestamptz,runtime_cleanup_verified_at_utc)
      WHERE probe_id=$1 AND status IN ('probing','failed')`,
    [input.probeId, input.stopReason, input.sessionId, input.cleanupVerifiedAtUtc],
  );
}

async function main(): Promise<void> {
  const authId = required("--auth").toUpperCase();
  const authPath = path.resolve(required("--auth-file"));
  const expectedAuthSha = required("--auth-sha").toLowerCase();
  const budgetDayId = required("--probe-budget-day-id");
  if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(authId)) throw new Error("RECOVERY_REFUSED:AUTH_ID_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("RECOVERY_REFUSED:AUTH_SHA_INVALID");

  const auth = readAuth(authPath);
  if (auth.sha256 !== expectedAuthSha) throw new Error("RECOVERY_REFUSED:AUTH_SHA_MISMATCH");
  if (auth.record.authorizationId !== authId) throw new Error("RECOVERY_REFUSED:AUTH_ID_MISMATCH");
  if (auth.record.phaseGate !== PHASE) throw new Error("RECOVERY_REFUSED:AUTH_PHASE_MISMATCH");
  if (!String(auth.record.cleanupOwner ?? "").trim()) throw new Error("RECOVERY_REFUSED:CLEANUP_OWNER_MISSING");
  const ledger = fs.readFileSync(LEDGER, "utf8");
  if (!ledger.includes(`### ${authId} — approved Phase 2G Stage-1 authorization`) ||
      !ledger.includes(`AUTH_ARTIFACT_SHA256:${expectedAuthSha}`) ||
      !ledger.includes("approval_scope: PHASE_2G_STAGE1_ONLY")) {
    throw new Error("RECOVERY_REFUSED:EXACT_AUTH_NOT_APPROVED_IN_LEDGER");
  }

  const probes = await pool.query(
    `SELECT probe_id,icao,status,runtime_session_id,stop_reason,reconciliation_status,runtime_cleanup_verified_at_utc
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND probe_budget_day_id=$1
        AND (
          status='probing'
          OR (
            status='failed'
            AND reconciliation_status='UNRESOLVED'
            AND runtime_cleanup_verified_at_utc IS NULL
            AND stop_reason IN ('subscription_delete_failed','balance_read_failed')
          )
        )
      ORDER BY recorded_at ASC`,
    [budgetDayId],
  );
  if ((probes.rowCount ?? probes.rows.length) === 0) {
    console.log(JSON.stringify({
      schema: "v39.phase2g-stage1-abnormal-exit-recovery.v1",
      status: "NO_RECOVERY_NEEDED",
      probe_budget_day_id: budgetDayId,
      active_probe_rows: 0,
      provider_mutation_performed: false,
    }, null, 2));
    return;
  }
  if ((probes.rowCount ?? probes.rows.length) !== 1) {
    throw new Error(`RECOVERY_REFUSED:EXPECTED_ONE_PROBING_ROW_GOT_${probes.rowCount ?? probes.rows.length}`);
  }
  const probeId = Number(probes.rows[0].probe_id);
  const probeIcao = String(probes.rows[0].icao ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(probeIcao)) throw new Error("RECOVERY_REFUSED:PROBE_ICAO_INVALID");
  const durableSessionIdRaw = probes.rows[0].runtime_session_id == null ? "" : String(probes.rows[0].runtime_session_id).toLowerCase();
  const durableSessionId = durableSessionIdRaw && UUID.test(durableSessionIdRaw) ? durableSessionIdRaw : null;
  if (durableSessionIdRaw && !durableSessionId) throw new Error("RECOVERY_REFUSED:DURABLE_RUNTIME_SESSION_ID_INVALID");

  const sessions = await pool.query(
    `SELECT session_id,provider_subscription_id,state
       FROM clean.prepaid_probe_session_runtime
      WHERE owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1
        AND state IN ('armed','active','settling','failed')
      ORDER BY created_at_utc DESC`,
    [probeId],
  );
  if ((sessions.rowCount ?? sessions.rows.length) > 1) {
    await openRecoveryIncident({ probeId, budgetDayId, reason: "multiple_active_runtime_sessions" });
    throw new Error("RECOVERY_REFUSED:MULTIPLE_ACTIVE_RUNTIME_SESSIONS");
  }

  let providerDeleteAttempted = false;
  let providerDeleteVerified = false;
  let cleanupVerifiedAtUtc: string | null = null;
  let sessionId: string | null = null;
  let stopReason = "supervisor_child_exit_before_runtime_session";
  const runtimeSessionPresent = (sessions.rowCount ?? sessions.rows.length) === 1;

  if (runtimeSessionPresent) {
    const row = sessions.rows[0];
    sessionId = String(row.session_id).toLowerCase();
    if (!UUID.test(sessionId)) throw new Error("RECOVERY_REFUSED:RUNTIME_SESSION_ID_INVALID");
    if (durableSessionId && durableSessionId !== sessionId) {
      await openRecoveryIncident({
        probeId,
        budgetDayId,
        reason: "durable_runtime_session_mismatch",
        durableSessionId,
        runtimeSessionId: sessionId,
      });
      throw new Error("RECOVERY_REFUSED:DURABLE_RUNTIME_SESSION_MISMATCH");
    }
    const boundProviderSubscriptionId = row.provider_subscription_id ? String(row.provider_subscription_id) : null;
    stopReason = "supervisor_child_exit_recovered";

    const before = await listSubscriptionsStrict();
    const activeBillableBefore = before.filter((subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased");
    let ownedProviderSubscriptionId = boundProviderSubscriptionId;

    // There is a very small crash interval after the provider returns a new
    // subscription id but before the UNLOGGED runtime row binds that id. In
    // that interval we recover only an exact match to this already-armed
    // session's deterministic callback URL + Stage-1 airport. We never delete
    // an unmatched/ambiguous subscription merely because it is billable.
    if (!ownedProviderSubscriptionId) {
      const expectedSubscriberId = prepaidProbeWebhookUrlV39(defaultWebhookUrl(), sessionId);
      const exactUnboundMatches = activeBillableBefore.filter((subscription) =>
        subscription.billingType === "CreditBased" &&
        String(subscription.subject?.type ?? "") === "FlightByAirportIcao" &&
        String(subscription.subject?.id ?? "").toUpperCase() === probeIcao &&
        String(subscription.subscriber?.id ?? "") === expectedSubscriberId,
      );
      if (exactUnboundMatches.length > 1) {
        await openRecoveryIncident({ probeId, budgetDayId, reason: "multiple_exact_unbound_subscription_matches" });
        throw new Error("RECOVERY_REFUSED:MULTIPLE_EXACT_UNBOUND_SUBSCRIPTION_MATCHES");
      }
      if (exactUnboundMatches.length === 1) {
        ownedProviderSubscriptionId = exactUnboundMatches[0].id;
      } else if (activeBillableBefore.length > 0) {
        await openRecoveryIncident({
          probeId,
          budgetDayId,
          reason: "unbound_session_with_unmatched_active_billable_subscription",
          activeBillableCount: activeBillableBefore.length,
        });
        throw new Error("RECOVERY_REFUSED:UNBOUND_SESSION_ACTIVE_BILLABLE_NOT_EXACTLY_OWNED");
      }
    }

    if (ownedProviderSubscriptionId) {
      const owned = before.find((subscription) => subscription.id === ownedProviderSubscriptionId);
      if (owned?.isActive) {
        if (owned.billingType !== "CreditBased") {
          await openRecoveryIncident({ probeId, budgetDayId, reason: "owned_subscription_billing_type_unexpected" });
          throw new Error("RECOVERY_REFUSED:OWNED_ACTIVE_SUBSCRIPTION_NOT_CREDIT_BASED");
        }
        providerDeleteAttempted = true;
        const deleted = await deleteSubscription(ownedProviderSubscriptionId);
        if (!deleted) {
          await openRecoveryIncident({ probeId, budgetDayId, reason: "owned_subscription_delete_failed" });
          throw new Error("RECOVERY_FAILED:OWNED_SUBSCRIPTION_DELETE_FAILED");
        }
      }
      const after = await listSubscriptionsStrict();
      providerDeleteVerified = !after.some((subscription) => subscription.id === ownedProviderSubscriptionId && subscription.isActive);
      if (!providerDeleteVerified) {
        await openRecoveryIncident({ probeId, budgetDayId, reason: "owned_subscription_still_active_after_delete" });
        throw new Error("RECOVERY_FAILED:OWNED_SUBSCRIPTION_STILL_ACTIVE");
      }
    } else {
      providerDeleteVerified = activeBillableBefore.length === 0;
    }

    // The exact provider subscription is now verified inactive. Transition the
    // surviving runtime owner out of active before any raw/runtime cleanup so
    // the published cleanup bridge can refuse premature evidence deletion.
    await pool.query(
      `UPDATE clean.prepaid_probe_session_runtime
          SET state='failed'
        WHERE session_id=$1::uuid
          AND owner_kind='anchor_probe'
          AND owner_probe_id=$2
          AND stage=1
          AND state IN ('armed','active','settling','failed')`,
      [sessionId, probeId],
    );

    try {
      const cleanup = await cleanupPrepaidProbeSessionV39(sessionId, `phase2g-supervisor-recovery-${probeId}`);
      cleanupVerifiedAtUtc = cleanup.verifiedAtUtc;
    } catch (error) {
      await markProbeFailed({
        probeId,
        sessionId,
        stopReason: "supervisor_child_exit_cleanup_failed",
        cleanupVerifiedAtUtc: null,
      });
      await openRecoveryIncident({
        probeId,
        budgetDayId,
        reason: "runtime_cleanup_failed",
        providerDeleteVerified,
      });
      throw error;
    }
  } else {
    const before = await listSubscriptionsStrict();
    const activeBillableBefore = before.filter(
      (subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased",
    );

    // PostgreSQL deliberately resets UNLOGGED runtime tables after crash
    // recovery. New probes persist only the random runtime session UUID in the
    // logged adb_anchor_probe row before provider creation. That UUID is enough
    // to reconstruct the deterministic callback URL and prove exact ownership
    // without persisting provider subscription IDs or payload content.
    if (durableSessionId) {
      sessionId = durableSessionId;
      const expectedSubscriberId = prepaidProbeWebhookUrlV39(defaultWebhookUrl(), durableSessionId);
      const exactResetMatches = activeBillableBefore.filter((subscription) =>
        subscription.billingType === "CreditBased" &&
        String(subscription.subject?.type ?? "") === "FlightByAirportIcao" &&
        String(subscription.subject?.id ?? "").toUpperCase() === probeIcao &&
        String(subscription.subscriber?.type ?? "") === "WebHook" &&
        String(subscription.subscriber?.id ?? "") === expectedSubscriberId,
      );
      if (exactResetMatches.length > 1) {
        await openRecoveryIncident({
          probeId,
          budgetDayId,
          reason: "multiple_exact_runtime_reset_subscription_matches",
          durableSessionId,
        });
        throw new Error("RECOVERY_REFUSED:MULTIPLE_EXACT_RUNTIME_RESET_SUBSCRIPTION_MATCHES");
      }
      if (exactResetMatches.length === 1) {
        const ownedProviderSubscriptionId = exactResetMatches[0].id;
        providerDeleteAttempted = true;
        const deleted = await deleteSubscription(ownedProviderSubscriptionId);
        if (!deleted) {
          await openRecoveryIncident({
            probeId,
            budgetDayId,
            reason: "runtime_reset_owned_subscription_delete_failed",
            durableSessionId,
          });
          throw new Error("RECOVERY_FAILED:RUNTIME_RESET_OWNED_SUBSCRIPTION_DELETE_FAILED");
        }
        const after = await listSubscriptionsStrict();
        providerDeleteVerified = !after.some(
          (subscription) => subscription.id === ownedProviderSubscriptionId && subscription.isActive,
        );
        if (!providerDeleteVerified) {
          await openRecoveryIncident({
            probeId,
            budgetDayId,
            reason: "runtime_reset_owned_subscription_still_active_after_delete",
            durableSessionId,
          });
          throw new Error("RECOVERY_FAILED:RUNTIME_RESET_OWNED_SUBSCRIPTION_STILL_ACTIVE");
        }
        stopReason = "supervisor_child_exit_after_runtime_reset_recovered";
      } else if (activeBillableBefore.length > 0) {
        await openRecoveryIncident({
          probeId,
          budgetDayId,
          reason: "runtime_reset_durable_session_unmatched_active_billable_subscription",
          durableSessionId,
          activeBillableCount: activeBillableBefore.length,
        });
        throw new Error("RECOVERY_REFUSED:RUNTIME_RESET_ACTIVE_BILLABLE_NOT_EXACTLY_OWNED");
      } else {
        providerDeleteVerified = true;
        stopReason = "supervisor_child_exit_after_runtime_reset_no_active_subscription";
      }
    } else {
      providerDeleteVerified = activeBillableBefore.length === 0;
      if (!providerDeleteVerified) {
        await openRecoveryIncident({
          probeId,
          budgetDayId,
          reason: "no_runtime_session_but_active_billable_subscription_present",
          activeBillableCount: activeBillableBefore.length,
        });
        throw new Error("RECOVERY_REFUSED:NO_RUNTIME_SESSION_ACTIVE_BILLABLE_PRESENT");
      }
    }

    // When PostgreSQL has reset the UNLOGGED runtime tables, the durable probe
    // row still owns the random session UUID. After provider deletion/absence
    // is verified, mark the probe failed first and ask the published Replit
    // cleanup bridge to tombstone any remaining blob refs for that exact UUID.
    if (durableSessionId && providerDeleteVerified) {
      await markProbeFailed({
        probeId,
        sessionId: durableSessionId,
        stopReason,
        cleanupVerifiedAtUtc: null,
      });
      try {
        const cleanup = await cleanupPrepaidProbeSessionV39(
          durableSessionId,
          `phase2g-runtime-reset-recovery-${probeId}`,
        );
        cleanupVerifiedAtUtc = cleanup.verifiedAtUtc;
      } catch (error) {
        await openRecoveryIncident({
          probeId,
          budgetDayId,
          reason: "runtime_reset_blob_cleanup_failed",
          providerDeleteVerified,
          durableSessionId,
        });
        throw error;
      }
    }
  }

  await markProbeFailed({ probeId, sessionId, stopReason, cleanupVerifiedAtUtc });
  await openRecoveryIncident({
    probeId,
    budgetDayId,
    reason: stopReason,
    providerDeleteAttempted,
    providerDeleteVerified,
    runtimeCleanupVerified: Boolean(cleanupVerifiedAtUtc),
    runtimeSessionPresent,
    durableSessionIdUsed: !runtimeSessionPresent && Boolean(durableSessionId),
  });

  console.log(JSON.stringify({
    schema: "v39.phase2g-stage1-abnormal-exit-recovery.v1",
    status: "RECOVERY_COMPLETED_FAIL_CLOSED",
    probe_budget_day_id: budgetDayId,
    probe_id: probeId,
    provider_delete_attempted: providerDeleteAttempted,
    provider_delete_verified: providerDeleteVerified,
    runtime_cleanup_verified: Boolean(cleanupVerifiedAtUtc),
    runtime_session_present: runtimeSessionPresent,
    durable_session_id_used: !runtimeSessionPresent && Boolean(durableSessionId),
    probe_marked_failed: true,
    incident_opened: true,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-stage1-abnormal-exit-recovery.v1",
      status: "RECOVERY_FAILED_OR_REFUSED",
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
