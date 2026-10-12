import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  armPrepaidProbeSessionV39,
  bindPrepaidProbeSubscriptionV39,
  cleanupPrepaidProbeSessionV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { assessIncident30ZeroProviderSmokeV39 } from "./v39_phase2g_p25_historical_incident_smoke_scope_v39";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}
function gitHead(): string {
  const r = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(r)) throw new Error("REFUSED:GIT_HEAD_INVALID");
  return r;
}
async function jsonBody(response: Response): Promise<any | null> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

/*
 * AeroDataBox webhook contract: successful 2XX within
 * 10 seconds.
 *
 * Phase-2G prospective admission is intentionally tighter:
 * 8 seconds, retaining 2 seconds of operating margin.
 */
const ADB_WEBHOOK_RESPONSE_LIMIT_MS = 10_000;
const PHASE2G_CALLBACK_ADMISSION_BUDGET_MS = 8_000;

if (
  PHASE2G_CALLBACK_ADMISSION_BUDGET_MS >=
  ADB_WEBHOOK_RESPONSE_LIMIT_MS
) {
  throw new Error(
    "REFUSED:CALLBACK_ADMISSION_BUDGET_HAS_NO_SAFETY_MARGIN",
  );
}

async function main(): Promise<void> {
  const base = required("--callback-base").replace(/\/+$/, "");
  const callbackMode = process.argv.includes("--callback-mode") ? required("--callback-mode").trim().toLowerCase() : "published";
  const expectedHead = process.argv.includes("--expected-head") ? required("--expected-head").trim().toLowerCase() : gitHead();
  const contingencyFile = process.argv.includes("--callback-contingency-file") ? path.resolve(required("--callback-contingency-file")) : null;
  const contingencySha = process.argv.includes("--callback-contingency-sha") ? required("--callback-contingency-sha").trim().toLowerCase() : "";
  if (!/^https:\/\/[^/]+$/i.test(base)) throw new Error("REFUSED:CALLBACK_BASE_MUST_BE_HTTPS_ORIGIN");
  const isReplitDev = new URL(base).hostname.toLowerCase().endsWith(".replit.dev");
  const isDevContingency = callbackMode === "same-app-development-contingency";
  if (!["published", "same-app-development-contingency"].includes(callbackMode)) throw new Error("REFUSED:CALLBACK_MODE_INVALID");
  if (isReplitDev && !isDevContingency) throw new Error("REFUSED:REPLIT_DEV_REQUIRES_EXPLICIT_CONTINGENCY");
  if (isDevContingency && !isReplitDev) throw new Error("REFUSED:DEV_CONTINGENCY_REQUIRES_REPLIT_DEV");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("REFUSED:EXPECTED_HEAD_INVALID");
  if (isDevContingency) {
    if (!contingencyFile || !/^[a-f0-9]{64}$/.test(contingencySha)) throw new Error("REFUSED:DEV_CONTINGENCY_ARTIFACT_REQUIRED");
    const raw = fs.readFileSync(contingencyFile);
    if (sha256(raw) !== contingencySha) throw new Error("REFUSED:DEV_CONTINGENCY_SHA_MISMATCH");
    const contingency = JSON.parse(raw.toString("utf8"));
    const valid =
      contingency?.schema === "v39.phase2g-same-app-dev-callback-contingency.v1" &&
      contingency?.status === "FROZEN" &&
      contingency?.authorized === true &&
      contingency?.owner_executor === "github-actions" &&
      contingency?.independent_watchdog_required === true &&
      contingency?.scientific_protocol_unchanged === true &&
      contingency?.exact_match_required === true &&
      Number(contingency?.stage1_target_minutes) === 120 &&
      contingency?.no_automatic_retry === true;
    if (!valid) throw new Error("REFUSED:DEV_CONTINGENCY_CONTRACT_INVALID");
    const health = await fetch(`${base}/__v39/workspace-runtime`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    const healthJson = await jsonBody(health);
    const healthExact =
      health.status === 200 &&
      healthJson?.schema === "v39.phase2f-workspace-runtime.v1" &&
      healthJson?.status === "PASS" &&
      String(healthJson?.git_head ?? "").toLowerCase() === expectedHead &&
      healthJson?.prepaid_route_registered === true &&
      Number(healthJson?.retention_hours) === 168 &&
      healthJson?.provider_mutation === false &&
      healthJson?.runtime_owner_mode === "replit-managed-project" &&
      healthJson?.managed_replit_workflow === true &&
      healthJson?.published_deployment === false;
    if (!healthExact) throw new Error("REFUSED:DEV_RUNTIME_HEALTH_NOT_EXACT");
  }

  // Published verification has the SAME exact-source requirement as the
  // development contingency. Check it BEFORE arming a disposable session,
  // any signed POST, SQL mutation, or original object-storage creation.
  // A shell operator may accidentally continue after a failed 'test':
  // the executable itself MUST reject an older Replit published image.
  if(!isDevContingency){
    const h=await fetch(`${base}/__v39/workspace-runtime`,{
      headers:{accept:"application/json"},
      signal:AbortSignal.timeout(15_000)
    });
    const j=await jsonBody(h);
    if(h.status!==200||
       j?.schema!=="v39.phase2f-workspace-runtime.v1"||
       j?.status!=="PASS"||
       String(j?.git_head??"").toLowerCase()!==expectedHead||
       j?.prepaid_route_registered!==true||
       j?.prepaid_source_custody_ready!==true||
       Number(j?.retention_hours)!==168||
       j?.provider_mutation!==false||
       j?.runtime_owner_mode!=="replit-published-deployment"||
       j?.published_deployment!==true)
      throw new Error("REFUSED:PUBLISHED_RUNTIME_GIT_HEAD_OR_CONTRACT_MISMATCH");
  }

  // Integration-only opt-in: model an already-bound provider identity using
  // a fake local runtime identifier. It never invokes a provider endpoint.
  // No paid/scientific admission can be derived from this synthetic record.
  const boundSynthetic=process.argv.includes("--synthetic-bound-subscription");
  const secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim();
  if (secret.length < 32) throw new Error("REFUSED:AERODATABOX_WEBHOOK_SECRET_REQUIRED");
  if(boundSynthetic&&(
    callbackMode!=="published"||
    process.env.V39_CALLBACK_ONLY_RUNTIME!=="1"||
    process.env.V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED!=="1"||
    process.env.V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED!=="1"||
    process.env.V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED!=="1"))
    throw Error("REFUSED:BOUND_SYNTHETIC_OUTSIDE_LOCK_FLAGS_NOT_FULLY_ENABLED");


  // Local cleanup must use the same dedicated provider bucket that the live
  // callback route writes to.
  if (String(process.env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase() !== "required") {
    throw new Error("REFUSED:V39_PROVIDER_BLOB_MODE_REQUIRED");
  }
  if (!String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? "").trim()) {
    throw new Error("REFUSED:V39_PROVIDER_BLOB_BUCKET_ID_REQUIRED");
  }

  const incidents = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail FROM clean.adb_incident_stop WHERE resolved=false ORDER BY id ASC`,
  );
  let toleratedIncident24 = false;
  let toleratedIncident25 = false;
  let historicalIncident30PreservedForSmokeOnly = false;
  if (incidents.rows.length !== 0) {
    const byId = new Map(incidents.rows.map((row: any) => [Number(row.id), row]));
    const i24 = byId.get(24);
    const i25 = byId.get(25);

    toleratedIncident24 =
      isDevContingency &&
      !!i24 &&
      String(i24.cause) === "raw-persistence" &&
      String(i24.detail?.mode ?? "") === "prepaid_probe" &&
      String(i24.detail?.error ?? "") === "V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168";

    toleratedIncident25 =
      isDevContingency &&
      !!i25 &&
      String(i25.cause) === "raw-persistence" &&
      String(i25.detail?.mode ?? "") === "prepaid_probe" &&
      String(i25.detail?.error ?? "") === 'column "session_id" is of type uuid but expression is of type integer';

    const knownOnly =
      isDevContingency &&
      incidents.rows.length === 2 &&
      toleratedIncident24 &&
      toleratedIncident25;

    if (!knownOnly) {
      // Narrow separate admission for disposable signed POST only. The
      // actual paid owner/preflight STILL rejects the open incident #30.
      // No cleanup, UPDATE, deletion or scientific promotion of probe 18.
      const historicalSession = "6267293e-75a0-42a7-b977-89543f200ebc";
      const proof = await pool.query(`
        SELECT p.probe_id,p.icao,p.status,p.duration_censored,
               p.reconciliation_status,p.stop_reason,
               p.runtime_cleanup_verified_at_utc,
               (p.runtime_session_id=$2::uuid) AS exact_session_bound,
               (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
                 WHERE session_id=$2::uuid) AS historical_runtime_rows,
               (SELECT count(*)::int FROM clean.phase2g_cleanup_journal_v39
                 WHERE session_id=$2::uuid) AS historical_cleanup_journal_rows,
               (SELECT count(*)::int FROM clean.provider_content_blob_ref
                 WHERE source_kind='webhook' AND source_record_id LIKE $3) AS original_refs,
               (SELECT count(*)::int FROM clean.provider_content_blob_ref
                 WHERE source_kind='webhook' AND source_record_id LIKE $3
                 AND deletion_verified_at_utc IS NULL) AS untombstoned_original_refs,
               (SELECT count(*)::int FROM clean.adb_anchor_probe
                 WHERE status IN ('probing','settling')) AS current_active_or_settling
        FROM clean.adb_anchor_probe p WHERE p.probe_id=$1
      `,[18,historicalSession,`prepaid:${historicalSession}:%`]);
      const row=proof.rows.length===1?proof.rows[0]:null;
      const incidentWitness=incidents.rows.map((i:any)=>({
        id:Number(i.id),cause:String(i.cause),resolved:false,
        kind:i.detail?.kind??null,reason:i.detail?.reason??null,
        providerDeleteVerified:i.detail?.providerDeleteVerified==null?null:
          String(i.detail.providerDeleteVerified),
        runtimeCleanupVerified:i.detail?.runtimeCleanupVerified==null?null:
          String(i.detail.runtimeCleanupVerified)
      }));
      const decision=assessIncident30ZeroProviderSmokeV39({
        incidents:incidentWitness,
        historicalProbe:{
          probeId:Number(row?.probe_id??-1),icao:String(row?.icao??""),
          status:String(row?.status??""),durationCensored:row?.duration_censored===true,
          reconciliationStatus:String(row?.reconciliation_status??""),
          stopReason:String(row?.stop_reason??""),
          exactSessionBound:row?.exact_session_bound===true,
          runtimeCleanupVerifiedAtUtc:row?.runtime_cleanup_verified_at_utc??null
        },
        originalRefs:Number(row?.original_refs??-1),
        untombstonedOriginalRefs:Number(row?.untombstoned_original_refs??-1),
        historicalRuntimeRows:Number(row?.historical_runtime_rows??-1),
        historicalCleanupJournalRows:Number(row?.historical_cleanup_journal_rows??-1),
        currentActiveOrSettlingProbes:Number(row?.current_active_or_settling??-1)
      });
      if(isDevContingency||!decision.allowed)
        throw new Error(`REFUSED:OPEN_INCIDENTS:${incidents.rows.length}:${decision.reason}`);
      historicalIncident30PreservedForSmokeOnly=decision.historicalIncident30Preserved;
    }
  }
  const active = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')`,
  );
  if (Number(active.rows[0]?.n ?? -1) !== 0) {
    throw new Error(`REFUSED:ACTIVE_OR_SETTLING_PROBES:${active.rows[0]?.n}`);
  }

  const wrongSecret = `phase2g-wrong-${randomBytes(24).toString("hex")}`;
  const wrongSession = "00000000-0000-4000-8000-000000000000";
  const wrong = await fetch(
    `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(wrongSecret)}/prepaid/${wrongSession}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const wrongJson = await jsonBody(wrong);
  if (wrong.status !== 404 || wrongJson?.error !== "Not found") {
    throw new Error(`REFUSED:LIVE_PREPAID_ROUTE_WRONG_SECRET_CONTRACT:http=${wrong.status}`);
  }

  const session = await armPrepaidProbeSessionV39({
    ownerKind: "phase2_safety_smoke",
    lifetimeHours: 1,
  });
  if (session.sessionId === "6267293e-75a0-42a7-b977-89543f200ebc")
    throw new Error("REFUSED:DISPOSABLE_SESSION_COLLIDES_WITH_HISTORICAL_YSSY");
  let cleanupDone = false;

  try {
    const syntheticSubId = `P25-NO-PROVIDER-BOUND-${session.sessionId}`;
    if(boundSynthetic){
      await bindPrepaidProbeSubscriptionV39(session.sessionId,syntheticSubId);
    }
    const now = new Date();
    const payload = {
      ...(boundSynthetic?{subscription:{id:syntheticSubId}}:{}),
      id: `phase2g-live-callback-${Date.now()}`,
      timestampUtc: now.toISOString(),
      deliveryAttempt: {
        seqNo: 0,
        timestampUtc: now.toISOString(),
        costCredits: 0,
      },
      flights: [
        {
          id: "phase2g-live-synthetic-flight",
          number: "V39LIVE001",
          departure: {
            airport: { icao: "WSSS" },
            scheduledTime: { utc: now.toISOString() },
          },
          arrival: { airport: { icao: "TEST" } },
          aircraft: { reg: "V39LIVE" },
        },
      ],
    };

    const acceptedStartedAt =
      process.hrtime.bigint();

    let accepted: Response;

    try {
      accepted = await fetch(
        `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(secret)}/prepaid/${session.sessionId}`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            accept:
              "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(
            PHASE2G_CALLBACK_ADMISSION_BUDGET_MS,
          ),
        },
      );
    } catch (error: any) {
      const elapsedMs =
        Number(
          process.hrtime.bigint() -
          acceptedStartedAt,
        ) / 1_000_000;

      const errorName =
        String(error?.name ?? "");

      if (
        errorName === "TimeoutError" ||
        errorName === "AbortError"
      ) {
        throw new Error(
          `REFUSED:LIVE_PREPAID_CALLBACK_LATENCY_BUDGET_EXCEEDED:` +
          `elapsed_ms=${Math.round(elapsedMs)}:` +
          `budget_ms=${PHASE2G_CALLBACK_ADMISSION_BUDGET_MS}`,
        );
      }

      throw new Error(
        `REFUSED:LIVE_PREPAID_CALLBACK_TRANSPORT_FAILURE:` +
        `${errorName || "unknown"}`,
      );
    }

    const acceptedLatencyMs =
      Number(
        process.hrtime.bigint() -
        acceptedStartedAt,
      ) / 1_000_000;

    if (
      acceptedLatencyMs >
      PHASE2G_CALLBACK_ADMISSION_BUDGET_MS
    ) {
      throw new Error(
        `REFUSED:LIVE_PREPAID_CALLBACK_LATENCY_BUDGET_EXCEEDED:` +
        `elapsed_ms=${Math.round(acceptedLatencyMs)}:` +
        `budget_ms=${PHASE2G_CALLBACK_ADMISSION_BUDGET_MS}`,
      );
    }

    const acceptedJson =
      await jsonBody(accepted);
    if (
      accepted.status !== 200 ||
      acceptedJson?.received !== true ||
      Number(acceptedJson?.items) !== 1 ||
      acceptedJson?.duplicate !== false
    ) {
      throw new Error(`REFUSED:LIVE_PREPAID_ROUTE_CORRECT_SECRET_CONTRACT:http=${accepted.status}`);
    }

    const before = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
         (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
         (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2) AS blobs,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2
              AND deletion_verified_at_utc IS NULL) AS live_blobs`,
      [session.sessionId, `prepaid:${session.sessionId}:%`],
    );
    const b = before.rows[0];
    if (
      Number(b?.sessions) !== 1 ||
      Number(b?.deliveries) !== 1 ||
      Number(b?.items) !== 1 ||
      Number(b?.blobs) !== 1 ||
      Number(b?.live_blobs) !== 1
    ) {
      throw new Error(`REFUSED:LIVE_PREPAID_PERSISTENCE_PROOF:${JSON.stringify(b)}`);
    }

    // A bound session + payload.subscription.id forces the reviewed
    // V0064 outside-session-lock admission path on the actual hosted POST.
    // This is synthetic; prove the LOGGED VERIFIED source intent exists
    // before this exact disposable source is intentionally cleaned up.
    if(boundSynthetic){
      const q=await pool.query(`
        SELECT count(*)::int AS verified FROM clean.phase2g_prepaid_source_intent_v39
        WHERE session_id=$1::uuid AND state='VERIFIED'
      `,[session.sessionId]);
      if(Number(q.rows[0]?.verified??-1)!==1)
        throw Error("REFUSED:BOUND_SYNTHETIC_V0064_VERIFIED_INTENT_MISSING");
    }

    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `phase2g-live-callback-verification-${Date.now()}`,
    );
    cleanupDone = true;

    const after = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
         (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
         (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2
              AND deletion_verified_at_utc IS NULL) AS live_blobs,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2
              AND deletion_verified_at_utc IS NOT NULL) AS deleted_blobs`,
      [session.sessionId, `prepaid:${session.sessionId}:%`],
    );
    const a = after.rows[0];
    if (
      Number(a?.sessions) !== 0 ||
      Number(a?.deliveries) !== 0 ||
      Number(a?.items) !== 0 ||
      Number(a?.live_blobs) !== 0 ||
      Number(a?.deleted_blobs) !== 1
    ) {
      throw new Error(`REFUSED:LIVE_PREPAID_CLEANUP_PROOF:${JSON.stringify(a)}`);
    }

    const generatedAtUtc = new Date().toISOString();
    const stamp = generatedAtUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const receipt = {
      schema: "v39.phase2g-live-callback-verification.v1",
      status: "PASS",
      callback_origin: base,
      callback_mode: callbackMode,
      callback_contingency_sha256: isDevContingency ? contingencySha : null,
      workspace_git_head: gitHead(),
      deployed_git_head_claimed: null,
      contract_mode: "live-prepaid-route-end-to-end",
      historical_incident30_unresolved_and_preserved_for_disposable_only: historicalIncident30PreservedForSmokeOnly,
      historical_incident30_paid_launch_authorized: false,
      historical_incident30_closure_or_deletion_authorized: false,
      preexisting_incident_24_tolerated: toleratedIncident24,
      preexisting_incident_25_tolerated: toleratedIncident25,
      preexisting_synthetic_incident_ids: [
        ...(toleratedIncident24 ? [24] : []),
        ...(toleratedIncident25 ? [25] : []),
      ],
      wrong_secret_rejected_404: true,
      correct_secret_accepted_200: true,
      provider_webhook_response_limit_ms:
        ADB_WEBHOOK_RESPONSE_LIMIT_MS,
      callback_admission_budget_ms:
        PHASE2G_CALLBACK_ADMISSION_BUDGET_MS,
      callback_end_to_end_latency_ms:
        Math.round(
          acceptedLatencyMs * 1000,
        ) / 1000,
      callback_safety_margin_ms:
        ADB_WEBHOOK_RESPONSE_LIMIT_MS -
        PHASE2G_CALLBACK_ADMISSION_BUDGET_MS,
      persistence_verified: true,
      signed_test_synthetic_subscription_only: boundSynthetic,
      actual_paid_provider_subscription_created: false,
      published_bound_outside_lock_path_exercised: boundSynthetic,
      synthetic_is_not_paid_or_scientific_evidence: true,
      local_exact_session_cleanup_verified: true,
      provider_called: false,
      provider_subscription_created: false,
      alert_credits_spent: 0,
      session_id: session.sessionId,
      before_cleanup: b,
      cleanup: {
        deleted_blobs: cleanup.deletedBlobs,
        deleted_runtime_rows: cleanup.deletedRuntimeRows,
        verified_at_utc: cleanup.verifiedAtUtc,
      },
      after_cleanup: a,
      generated_at_utc: generatedAtUtc,
    };

    fs.mkdirSync("artifacts", { recursive: true });
    const out = path.join("artifacts", `phase2g-live-callback-verification-${stamp}.json`);
    fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({
      ...receipt,
      receipt_file: out,
      receipt_file_sha256: sha256(fs.readFileSync(out)),
    }, null, 2));
  } finally {
    if (!cleanupDone) {
      await cleanupPrepaidProbeSessionV39(
        session.sessionId,
        `phase2g-live-callback-verification-failure-${Date.now()}`,
      ).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-live-callback-verification.v1",
    status: "FAIL",
    provider_called: false,
    provider_subscription_created: false,
    alert_credits_spent: 0,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
