import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  armPrepaidProbeSessionV39,
  cleanupPrepaidProbeSessionV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

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

  const secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim();
  if (secret.length < 32) throw new Error("REFUSED:AERODATABOX_WEBHOOK_SECRET_REQUIRED");

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

    if (!knownOnly) throw new Error(`REFUSED:OPEN_INCIDENTS:${incidents.rows.length}`);
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
  let cleanupDone = false;

  try {
    const now = new Date();
    const payload = {
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

    const accepted = await fetch(
      `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(secret)}/prepaid/${session.sessionId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const acceptedJson = await jsonBody(accepted);
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
      preexisting_incident_24_tolerated: toleratedIncident24,
      preexisting_incident_25_tolerated: toleratedIncident25,
      preexisting_synthetic_incident_ids: [
        ...(toleratedIncident24 ? [24] : []),
        ...(toleratedIncident25 ? [25] : []),
      ],
      wrong_secret_rejected_404: true,
      correct_secret_accepted_200: true,
      persistence_verified: true,
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
