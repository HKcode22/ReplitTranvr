import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import {
  armPrepaidProbeSessionV39,
  cleanupPrepaidProbeSessionV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function resolveBase(): string {
  const raw = String(process.env.V39_WORKSPACE_CALLBACK_BASE_URL ?? "").trim();
  if (!raw) throw new Error("REFUSED:WORKSPACE_CALLBACK_BASE_URL_REQUIRED");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("REFUSED:WORKSPACE_CALLBACK_BASE_URL_INVALID");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("REFUSED:WORKSPACE_CALLBACK_BASE_URL_MUST_BE_ORIGIN_ONLY");
  }
  return url.origin;
}

async function bodyJson(response: Response): Promise<any | null> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function main(): Promise<void> {
  const base = resolveBase();
  const secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim();
  if (secret.length < 32) throw new Error("REFUSED:WEBHOOK_SECRET_REQUIRED");

  const openBefore = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`,
  );
  if (Number(openBefore.rows[0]?.n ?? -1) !== 0) {
    throw new Error(`REFUSED:OPEN_INCIDENTS_BEFORE_WORKSPACE_CALLBACK:${openBefore.rows[0]?.n}`);
  }

  const health = await fetch(`${base}/__v39/workspace-runtime`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const healthJson = await bodyJson(health);
  if (
    health.status !== 200 ||
    healthJson?.status !== "PASS" ||
    !/^[a-f0-9]{40}$/i.test(String(healthJson?.git_head ?? "")) ||
    healthJson?.route_owner !== "server/index.ts+server/routes_v3.ts" ||
    healthJson?.prepaid_route_registered !== true ||
    Number(healthJson?.retention_hours) !== 168 ||
    healthJson?.bucket_prefix !== "replit-objstore"
  ) {
    throw new Error(`REFUSED:WORKSPACE_RUNTIME_HEALTH_INVALID:http=${health.status}`);
  }
  const runtimeGitHead = String(healthJson.git_head).toLowerCase();
  const runtimeOwnerMode = String(healthJson.runtime_owner_mode ?? "");
  const runtimeOwnerContract =
    (runtimeOwnerMode === "replit-managed-project" &&
      healthJson.managed_replit_workflow === true &&
      healthJson.detached_workspace_server === false) ||
    (runtimeOwnerMode === "phase2g-detached-npm-run-dev" &&
      healthJson.managed_replit_workflow === false &&
      healthJson.detached_workspace_server === true);
  if (!runtimeOwnerContract) {
    throw new Error(`REFUSED:WORKSPACE_RUNTIME_OWNER_CONTRACT_INVALID:mode=${runtimeOwnerMode || "<missing>"}`);
  }

  const wrongSecret = `phase2f-wrong-${randomBytes(16).toString("hex")}`;
  const wrongSession = "00000000-0000-4000-8000-000000000001";
  const wrong = await fetch(
    `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(wrongSecret)}/prepaid/${wrongSession}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    },
  );
  await wrong.arrayBuffer().catch(() => undefined);
  if (wrong.status !== 404) {
    throw new Error(`REFUSED:WORKSPACE_WRONG_SECRET_NOT_REJECTED:http=${wrong.status}`);
  }

  const session = await armPrepaidProbeSessionV39({
    ownerKind: "phase2_safety_smoke",
    lifetimeHours: 1,
  });

  let cleanupDone = false;
  const now = new Date();
  const payload = {
    id: `phase2f-workspace-ingress-${Date.now()}`,
    timestampUtc: now.toISOString(),
    deliveryAttempt: {
      seqNo: 0,
      timestampUtc: now.toISOString(),
      costCredits: 0,
    },
    flights: [
      {
        id: "phase2f-workspace-synthetic-flight",
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

  try {
    const response = await fetch(
      `${base}/api/v1/webhooks/aerodatabox/${encodeURIComponent(secret)}/prepaid/${session.sessionId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const responseJson = await bodyJson(response);
    if (
      response.status !== 200 ||
      responseJson?.received !== true ||
      Number(responseJson?.items) !== 1 ||
      responseJson?.duplicate !== false
    ) {
      throw new Error(`REFUSED:WORKSPACE_PREPAID_INGRESS_FAILED:http=${response.status}`);
    }

    const before = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) AS sessions,
         (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) AS deliveries,
         (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) AS items,
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
      throw new Error(`REFUSED:WORKSPACE_PREPAID_DB_PROOF_INVALID:${JSON.stringify(b)}`);
    }

    const cleanup = await cleanupPrepaidProbeSessionV39(
      session.sessionId,
      `phase2f-workspace-ingress-${Date.now()}`,
    );
    cleanupDone = true;

    const after = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) AS sessions,
         (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) AS deliveries,
         (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) AS items,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2) AS blobs,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2
              AND deletion_verified_at_utc IS NOT NULL) AS deleted_blobs,
         (SELECT count(*)::int FROM clean.provider_content_blob_ref
            WHERE source_kind='webhook' AND source_record_id LIKE $2
              AND deletion_verified_at_utc IS NULL) AS live_blobs`,
      [session.sessionId, `prepaid:${session.sessionId}:%`],
    );
    const a = after.rows[0];
    if (
      Number(a?.sessions) !== 0 ||
      Number(a?.deliveries) !== 0 ||
      Number(a?.items) !== 0 ||
      Number(a?.blobs) !== 1 ||
      Number(a?.deleted_blobs) !== 1 ||
      Number(a?.live_blobs) !== 0
    ) {
      throw new Error(`REFUSED:WORKSPACE_PREPAID_CLEANUP_PROOF_INVALID:${JSON.stringify(a)}`);
    }

    const openAfter = await pool.query(
      `SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`,
    );
    if (Number(openAfter.rows[0]?.n ?? -1) !== 0) {
      throw new Error(`REFUSED:OPEN_INCIDENTS_AFTER_WORKSPACE_CALLBACK:${openAfter.rows[0]?.n}`);
    }

    const generatedAtUtc = new Date().toISOString();
    const stamp = generatedAtUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const receipt = {
      schema: "v39.phase2f-workspace-callback-verification.v1",
      status: "PASS",
      executionEnvironment: "replit-workspace-live",
      deploymentPerformed: false,
      providerCalled: false,
      providerSubscriptionCreated: false,
      alertCreditsSpent: 0,
      callbackOrigin: base,
      gitHead: runtimeGitHead,
      exactRouteOwner: "server/index.ts+server/routes_v3.ts",
      runtimeOwnerMode,
      managedReplitWorkflow: healthJson.managed_replit_workflow === true,
      detachedWorkspaceServer: healthJson.detached_workspace_server === true,
      wrongSecretRejected404: true,
      exactSecretAccepted200: true,
      publicHttpsIngress: true,
      retentionHours: 168,
      bucketPrefix: "replit-objstore",
      beforeCleanup: b,
      cleanup: {
        deletedBlobs: cleanup.deletedBlobs,
        deletedRuntimeRows: cleanup.deletedRuntimeRows,
        verifiedAtUtc: cleanup.verifiedAtUtc,
      },
      afterCleanup: a,
      openIncidentsBefore: 0,
      openIncidentsAfter: 0,
      generatedAtUtc,
    };

    fs.mkdirSync("artifacts", { recursive: true });
    const out = path.join("artifacts", `phase2f-workspace-callback-verification-${stamp}.json`);
    fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({
      ...receipt,
      receiptArtifact: out,
      receiptArtifactSha256: sha256(fs.readFileSync(out)),
    }, null, 2));
  } finally {
    if (!cleanupDone) {
      await cleanupPrepaidProbeSessionV39(
        session.sessionId,
        `phase2f-workspace-ingress-failure-${Date.now()}`,
      ).catch(() => undefined);
    }
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2f-workspace-callback-verification.v1",
      status: "FAIL",
      deploymentPerformed: false,
      providerCalled: false,
      providerSubscriptionCreated: false,
      alertCreditsSpent: 0,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
