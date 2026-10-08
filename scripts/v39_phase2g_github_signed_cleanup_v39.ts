import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  assertPhase2gCleanupBlobCountsV39,
  assertPhase2gCleanupJournalMatchV39,
} from "../server/lib/disruption/phase2gCleanupReplay_v39";
import {
  signPhase2gCleanupAttestationV39,
  type Phase2gCleanupAttestationV39,
} from "../server/lib/disruption/phase2gCleanupAttestation_v39";

/**
 * GitHub Actions only. Unlike the receiver, this owner holds the provider API
 * credential and independently checks the entire billable subscription account
 * BEFORE signing a short-lived session-scoped cleanup authorization.
 *
 * Manual --apply + exact user-approved inputs is mandatory. No provider mutation.
 * Failure must be investigated; never automatically repeat a paid Stage1.
 */
function required(key: string): string {
  const i = process.argv.indexOf(key);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`REFUSED:REQUIRED_ARGUMENT:${key}`);
  return value;
}
function assertOrigin(base: string): void {
  if (!/^https:\/\/[^/]+$/.test(base) || new URL(base).hostname.endsWith(".replit.dev")) {
    throw new Error("REFUSED:PUBLIC_HTTPS_CALLBACK_ORIGIN_REQUIRED");
  }
}
function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce = (prefix: string) => `${prefix}-${randomUUID()}`;

async function main(): Promise<void> {
  // Post-owner mode discovers only one exact settling/MATCH probe for the
  // approved frozen budget. Never guess a session or clean a failed probe.
  const autoFromBudget = process.argv.includes("--auto-from-budget");
  if (autoFromBudget && ["--session", "--probe-id", "--expected-live-blobs"].some(
    (arg) => process.argv.includes(arg),
  )) throw new Error("REFUSED:AUTO_DISCOVERY_MIXED_WITH_MANUAL_EXACT_SCOPE");
  let session = autoFromBudget ? "" : required("--session").toLowerCase();
  let probeId = autoFromBudget ? 0 : Number(required("--probe-id"));
  const budget = required("--budget-day");
  const icao = required("--icao").toUpperCase();
  let expectedLive = autoFromBudget ? -1 : Number(required("--expected-live-blobs"));
  const callback = required("--callback-base");
  const expectedHead = required("--expected-head").toLowerCase();
  const runtimeFile = required("--runtime-file");
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const apply = process.argv.includes("--apply");
  if (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REPOSITORY !== "HKcode22/ReplitTranvr") {
    throw new Error("REFUSED:GITHUB_ACTIONS_OWNER_REQUIRED");
  }
  if (!apply) throw new Error("REFUSED:EXPLICIT_APPLY_FLAG_REQUIRED");
  if ((!autoFromBudget && (!uuid.test(session) || !Number.isSafeInteger(probeId) || probeId <= 0 ||
        !Number.isSafeInteger(expectedLive) || expectedLive < 0 || expectedLive > 1000)) ||
      !/^P2G-S1-\d{8}-\d{1,5}$/.test(budget) ||
      !/^[A-Z]{4}$/.test(icao) ||
      !/^[a-f0-9]{40}$/.test(expectedHead) || !/^[a-f0-9]{64}$/.test(runtimeSha)) {
    throw new Error("REFUSED:INVALID_EXACT_SCOPE");
  }
  assertOrigin(callback);
  const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (gitHead !== expectedHead || process.env.GITHUB_SHA !== expectedHead) {
    throw new Error("REFUSED:CHECKOUT_SOURCE_HEAD_MISMATCH");
  }
  const secret = String(process.env.V39_PHASE2G_CLEANUP_SIGNING_KEY ?? "");
  if (secret.length < 32 || !process.env.AERODATABOX_API_KEY) {
    throw new Error("REFUSED:GITHUB_ONLY_CLEANUP_CREDENTIALS_MISSING");
  }
  if (!fs.existsSync(runtimeFile) || sha256(fs.readFileSync(runtimeFile)) !== runtimeSha) {
    throw new Error("REFUSED:EXACT_RUNTIME_ARTIFACT_MISMATCH");
  }

  const healthResponse = await fetch(callback + "/__v39/workspace-runtime", {
    signal: AbortSignal.timeout(15000),
  });
  const health = await healthResponse.json().catch(() => null);
  if (healthResponse.status !== 200 || health?.status !== "PASS" ||
      health?.git_head !== expectedHead ||
      health?.published_deployment !== true ||
      health?.runtime_owner_mode !== "replit-published-deployment") {
    throw new Error("REFUSED:PUBLISHED_CALLBACK_SOURCE_MISMATCH");
  }

  if (autoFromBudget) {
    const candidates = await pool.query(
      `SELECT probe_id,runtime_session_id FROM clean.adb_anchor_probe
       WHERE probe_budget_day_id=$1 AND icao=$2 AND stage=1
         AND status='settling' AND reconciliation_status='MATCH'
         AND duration_censored=false AND stop_reason IS NULL
         AND provider_content_safe_mode=true
         AND runtime_cleanup_verified_at_utc IS NULL`,
      [budget, icao],
    );
    if (candidates.rowCount !== 1) {
      throw new Error("REFUSED:AUTO_DISCOVERY_REQUIRES_ONE_EXACT_SETTLING_MATCH");
    }
    probeId = Number(candidates.rows[0].probe_id);
    session = String(candidates.rows[0].runtime_session_id ?? "").toLowerCase();
    if (!Number.isSafeInteger(probeId) || probeId <= 0 || !uuid.test(session)) {
      throw new Error("REFUSED:AUTO_DISCOVERY_INVALID_PROBE_SESSION");
    }
    const blobs = await pool.query(
      `SELECT count(*)::int AS n FROM clean.provider_content_blob_ref
       WHERE source_kind='webhook' AND source_record_id LIKE $1`,
      [`prepaid:${session}:%`],
    );
    expectedLive = Number(blobs.rows[0]?.n ?? -1);
    if (!Number.isSafeInteger(expectedLive) || expectedLive < 0 || expectedLive > 1000) {
      throw new Error("REFUSED:AUTO_DISCOVERY_LIVE_BLOBS_INVALID");
    }
    console.log("AUTO_DISCOVERY_EXACT_SETTLING_MATCH=PASS");
    console.log("AUTO_DISCOVERED_PROBE_ID=" + probeId);
    console.log("AUTO_DISCOVERED_LIVE_BLOBS=" + expectedLive);
  }

  const r = await pool.query(
    `SELECT p.probe_id,p.probe_budget_day_id,p.icao,p.status,p.stage,
            p.provider_content_safe_mode,p.reconciliation_status,
            p.duration_censored,p.stop_reason,p.runtime_cleanup_verified_at_utc,
            p.subscription_id AS probe_subscription_id,
            s.session_id,s.state AS session_state,
            s.provider_subscription_id,s.last_delivery_at_utc
       FROM clean.adb_anchor_probe p
       LEFT JOIN clean.prepaid_probe_session_runtime s
         ON s.session_id=p.runtime_session_id
        AND s.owner_kind='anchor_probe'
        AND s.owner_probe_id=p.probe_id
        AND s.stage=1
      WHERE p.probe_id=$1 AND p.runtime_session_id=$2::uuid
        AND p.probe_budget_day_id=$3 AND p.icao=$4`,
    [probeId, session, budget, icao],
  );
  if (r.rowCount !== 1) throw new Error("REFUSED:PROBE_AND_RUNTIME_NOT_EXACT");
  const owner = r.rows[0];

  const journalQ = await pool.query(
    `SELECT session_id,probe_id,deletion_run_id,request_sha256,
            expected_live_blobs,state,deleted_blobs,
            deleted_runtime_rows,verified_at_utc
       FROM clean.phase2g_cleanup_journal_v39
      WHERE session_id=$1::uuid`,
    [session],
  );
  if (journalQ.rowCount !== 0 && journalQ.rowCount !== 1) {
    throw new Error("REFUSED:AMBIGUOUS_CLEANUP_JOURNAL");
  }
  const priorJournal = journalQ.rows[0] ?? null;
  const hasRuntime = owner.session_id != null;

  const providerSubscriptionId = String(
    owner.provider_subscription_id ??
    owner.probe_subscription_id ??
    "",
  ).trim();

  if (
    owner.stage !== 1 ||
    owner.provider_content_safe_mode !== true ||
    owner.status !== "settling" ||
    owner.reconciliation_status !== "MATCH" ||
    owner.duration_censored !== false ||
    owner.stop_reason != null ||
    owner.runtime_cleanup_verified_at_utc != null ||
    !providerSubscriptionId ||
    (hasRuntime
      ? owner.session_state !== "settling"
      : priorJournal?.state !== "VERIFIED")
  ) {
    throw new Error("REFUSED:PROBE_NOT_SAFE_TO_PURPOSE_CLEAN");
  }

  if (
    owner.provider_subscription_id != null &&
    owner.probe_subscription_id != null &&
    String(owner.provider_subscription_id) !==
      String(owner.probe_subscription_id)
  ) {
    throw new Error("REFUSED:PROVIDER_SUBSCRIPTION_IDENTITY_CONFLICT");
  }

  if (priorJournal?.state === "VERIFIED" && hasRuntime) {
    throw new Error("REFUSED:VERIFIED_JOURNAL_RUNTIME_PRESENT");
  }

  if (hasRuntime) {
    const lastDeliveryMs = Date.parse(
      String(owner.last_delivery_at_utc ?? ""),
    );
    if (
      !Number.isFinite(lastDeliveryMs) ||
      Date.now() - lastDeliveryMs < 30_000
    ) {
      throw new Error(
        "REFUSED:CALLBACK_SETTLING_QUIESCENCE_30S_NOT_PROVEN",
      );
    }
  }

  if (priorJournal && (
    Number(priorJournal.probe_id) !== probeId ||
    Number(priorJournal.expected_live_blobs) !== expectedLive ||
    !["STARTED", "VERIFIED"].includes(String(priorJournal.state)) ||
    !/^[A-Za-z0-9_.:\\-]{8,160}$/.test(
      String(priorJournal.deletion_run_id ?? ""),
    )
  )) {
    throw new Error("REFUSED:EXACT_CLEANUP_JOURNAL_SCOPE_MISMATCH");
  }

  const deletionRunId = priorJournal
    ? String(priorJournal.deletion_run_id)
    : nonce("phase2g-github-cleanup");

  const count = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (
         WHERE deletion_verified_at_utc IS NULL
       )::int AS live,
       count(*) FILTER (
         WHERE deletion_verified_at_utc IS NOT NULL
           AND deletion_run_id=$2
       )::int AS verified_for_run
     FROM clean.provider_content_blob_ref
     WHERE source_kind='webhook'
       AND source_record_id LIKE $1`,
    [`prepaid:${session}:%`, deletionRunId],
  );

  try {
    assertPhase2gCleanupBlobCountsV39(
      count.rows[0] ?? {},
      expectedLive,
      priorJournal?.state === "VERIFIED",
    );
  } catch {
    throw new Error("REFUSED:LIVE_BLOB_COUNT_CHANGED");
  }

  if (
    !priorJournal &&
    Number(count.rows[0]?.live ?? -1) !== expectedLive
  ) {
    throw new Error("REFUSED:PREEXISTING_DELETION_WITHOUT_JOURNAL");
  }

  // Two independent account-wide provider inventories; never treat an API error
  // as an empty account. There are no provider mutations in this program.
  for (let check = 0; check < 2; check++) {
    const subs = await listSubscriptionsStrict();
    const activeBillable = subs.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
    if (activeBillable.length !== 0) {
      throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
    }
    if (check === 0) await sleep(3000);
  }

  const inventoryAt = new Date();
  const claim: Phase2gCleanupAttestationV39 = {
    schema: "v39.phase2g-provider-inactive-cleanup-attestation.v1",
    callback_origin: callback,
    session_id: session,
    probe_id: probeId,
    probe_budget_day_id: budget,
    icao,
    provider_subscription_id: providerSubscriptionId,
    deletion_run_id: deletionRunId,
    expected_live_blobs: expectedLive,
    active_billable_subscriptions: 0,
    provider_inventory_checked_at_utc: inventoryAt.toISOString(),
    expires_at_utc: new Date(inventoryAt.getTime() + 90000).toISOString(),
  };
  if (priorJournal) {
    try {
      assertPhase2gCleanupJournalMatchV39(claim, priorJournal);
    } catch {
      throw new Error("REFUSED:EXACT_CLEANUP_JOURNAL_SCOPE_CONFLICT");
    }
  }

  const signature = signPhase2gCleanupAttestationV39(
    claim,
    secret,
    inventoryAt,
  );

  // Preserve an auditable non-secret request intent BEFORE sending a destructive
  // cleanup request. If Replit deletes the blob but GitHub loses the HTTP
  // response, this exact deletion_run_id lets a human reconcile durable blob
  // tombstones without inventing a successful cleanup receipt.
  const intent = {
    schema: "v39.phase2g-signed-cleanup-intent.v1",
    status: "PREPARED_NOT_PROOF_OF_DELETION",
    session_id: session,
    probe_id: probeId,
    probe_budget_day_id: budget,
    icao,
    provider_subscription_id: claim.provider_subscription_id,
    expected_live_blobs: expectedLive,
    deletion_run_id: claim.deletion_run_id,
    provider_inventory_reads: 2,
    active_billable_subscriptions: 0,
    provider_inventory_checked_at_utc: claim.provider_inventory_checked_at_utc,
    attestation_expires_at_utc: claim.expires_at_utc,
    callback_origin: callback,
    source_git_head: expectedHead,
    provider_mutation: false,
    secret_or_hmac_written: false,
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const intentFile = path.join("artifacts", `phase2g-signed-cleanup-intent-probe${probeId}-${Date.now()}.json`);
  fs.writeFileSync(intentFile, JSON.stringify(intent, null, 2) + "\n", { flag: "wx" });
  console.log("PHASE2G_CLEANUP_INTENT_FILE=" + intentFile);
  console.log("PHASE2G_CLEANUP_INTENT_SHA256=" + sha256(fs.readFileSync(intentFile)));

  const res = await fetch(callback + "/__v39/phase2g/runtime-cleanup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-v39-phase2g-cleanup-proof": signature,
    },
    body: JSON.stringify(claim),
    signal: AbortSignal.timeout(60000),
  });
  const received = await res.json().catch(() => null);
  if (res.status !== 200 || received?.schema !== "v39.phase2g-runtime-cleanup.v1" ||
      received?.status !== "PASS" || received?.session_id !== session ||
      Number(received?.probe_id) !== probeId ||
      received?.provider_inactive_attestation_verified !== true ||
      received?.provider_mutation !== false ||
      Number(received?.deleted_blobs) !== expectedLive ||
      !Number.isFinite(Date.parse(String(received?.verified_at_utc ?? "")))) {
    throw new Error(`REFUSED:REMOTE_CLEANUP_FAILED_OR_UNVERIFIED:http=${res.status}`);
  }

  const finalQ = await pool.query(
    `SELECT
      (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
      (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
      (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
      (SELECT count(*)::int FROM clean.provider_content_blob_ref
        WHERE source_kind='webhook' AND source_record_id LIKE $2
          AND deletion_verified_at_utc IS NULL) AS live_blobs`,
    [session, `prepaid:${session}:%`],
  );
  const final = finalQ.rows[0];
  if (Object.values(final).some((n) => Number(n) !== 0)) {
    throw new Error("REFUSED:REMOTE_CLEANUP_POSTCHECK_FAILED");
  }
  const receipt = {
    schema: "v39.phase2g-exact-session-purpose-cleanup.v1",
    mode: "APPLY",
    session_id: session,
    probe_id: probeId,
    label: `github-${icao}-${budget}`,
    deletion_run_id: claim.deletion_run_id,
    expected_live_blobs: expectedLive,
    deleted_blobs: Number(received.deleted_blobs),
    deleted_runtime_rows: Number(received.deleted_runtime_rows),
    verified_at_utc: received.verified_at_utc,
    final,
    active_billable_subscriptions: 0,
    provider_mutation: false,
    subscription_mutation: false,
    alert_credits_spent: 0,
    signed_cleanup_proof_verified: true,
    signed_proof_ttl_seconds: 90,
    provider_inventory_reads: 2,
    callback_origin: callback,
    git_head: expectedHead,
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const out = path.join("artifacts", `phase2g-signed-purpose-cleanup-probe${probeId}-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  const receiptSha = sha256(fs.readFileSync(out));
  console.log("PHASE2G_SIGNED_EXACT_SESSION_CLEANUP=PASS");
  console.log("CLEANUP_RECEIPT=" + out);
  console.log("CLEANUP_RECEIPT_SHA256=" + receiptSha);

  // Reuse the frozen finalizer: only MATCH + uncensored settling evidence can
  // become completed and close the budget. Failed probes remain untouched.
  const result = spawnSync(
    "node",
    ["--import", "tsx", "scripts/v39_phase2g_finalize_settling_probe_v39.ts",
      "--probe-id", String(probeId), "--session", session,
      "--probe-budget-day-id", budget,
      "--cleanup-receipt", out, "--cleanup-receipt-sha", receiptSha,
      "--runtime-file", runtimeFile, "--runtime-sha", runtimeSha],
    { encoding: "utf8", stdio: ["ignore", "inherit", "inherit"], env: process.env },
  );
  if (result.status !== 0) {
    throw new Error("REFUSED:SETTLING_FINALIZER_FAILED_CLEANUP_RECEIPT_PRESERVED");
  }
  console.log("PHASE2G_SETTLING_FINALIZER=PASS");
  console.log("PROVIDER_MUTATIONS=0");
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "REFUSED_OR_FAILED",
    schema: "v39.phase2g-github-signed-cleanup-owner.v1",
    provider_mutation: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 2;
}).finally(async () => { await pool.end().catch(() => undefined); });
