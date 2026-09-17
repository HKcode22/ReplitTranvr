import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { getBalance, listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  loadGate2RuntimeBindingV39,
  stage1AuthorizationScopeV39,
} from "../server/lib/disruption/phase2Gate2Runtime_v39";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";

const PHASE = "Phase 2 / Gate 2 Stage 1";
const TARGET_MINUTES = 120;
const AUTH_CLEANUP_BUFFER_MINUTES = 5;
const CALLBACK_SOURCE_PATHS = [
  "server/index.ts",
  "server/routes_v3.ts",
  "server/lib/disruption/workspaceRuntimeHealth_v39.ts",
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "server/lib/disruption/providerBlobStore_v39.ts",
  "server/lib/disruption/replitProviderBlobStore_v39.ts",
  "server/lib/disruption/db_v39.ts",
] as const;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function optional(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  return value || fallback;
}
function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function gitFileAt(ref: string, file: string): string {
  return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}
function utcWeekdayClass(date: Date): "weekday" | "weekend" {
  const day = date.getUTCDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
function circularHourDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}
function workspaceOrigin(): string | null {
  const direct = String(process.env.REPLIT_DEV_DOMAIN ?? "").trim();
  if (direct) {
    const host = direct.replace(/^https?:\/\//, "").split("/")[0];
    if (host.endsWith(".replit.dev")) return `https://${host}`;
  }
  for (const raw of String(process.env.REPLIT_DOMAINS ?? "").split(",")) {
    const host = raw.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (host.endsWith(".replit.dev")) return `https://${host}`;
  }
  return null;
}
async function getJson(url: string): Promise<{ status: number; json: any | null }> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}
function readAuth(authPath: string): { raw: string; record: AuthRecord; sha256: string } {
  const raw = fs.readFileSync(authPath, "utf8");
  let record: AuthRecord;
  try { record = JSON.parse(raw); }
  catch { throw new Error("BLOCKED:AUTH_INVALID_JSON"); }
  return { raw, record, sha256: sha256HexString(raw) };
}

async function main(): Promise<void> {
  const preprobePath = path.resolve(optional("--preprobe", "artifacts/preprobe-reference-freeze-record.json"));
  const smokePath = path.resolve(required("--smoke"));
  const smokeRuntimePath = path.resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  const runtimePath = path.resolve(required("--runtime-file"));
  const runtimeSha = required("--runtime-sha").toLowerCase();
  const authPath = path.resolve(required("--auth-file"));
  const expectedAuthSha = required("--auth-sha").toLowerCase();
  const expectedHead = required("--expected-head").toLowerCase();
  const outPath = path.resolve(required("--out"));

  if (!/^[a-f0-9]{64}$/.test(runtimeSha)) throw new Error("BLOCKED:RUNTIME_SHA_INVALID");
  if (!/^[a-f0-9]{64}$/.test(expectedAuthSha)) throw new Error("BLOCKED:AUTH_SHA_INVALID");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("BLOCKED:EXPECTED_HEAD_INVALID");

  const currentHead = git(["rev-parse", "HEAD"]).toLowerCase();
  const blockers: string[] = [];
  if (currentHead !== expectedHead) blockers.push(`git_head_mismatch:${currentHead}`);

  const binding = loadGate2RuntimeBindingV39({
    probeRuntimePath: runtimePath,
    probeRuntimeFileSha256: runtimeSha,
    smokePath,
    smokeRuntimePath,
    smokeRuntimeFileSha256: smokeRuntimeSha,
    preprobePath,
  });

  const auth = readAuth(authPath);
  if (auth.sha256 !== expectedAuthSha) blockers.push(`auth_sha_mismatch:${auth.sha256}`);
  if (auth.record.phaseGate !== PHASE) blockers.push("auth_phase_mismatch");
  if (auth.record.airportFilterWindow !== stage1AuthorizationScopeV39(binding)) blockers.push("auth_scope_mismatch");
  const predecessors = [binding.smoke.evidenceId, binding.evidenceId];
  if (!Array.isArray(auth.record.predecessorEvidenceIds) ||
      auth.record.predecessorEvidenceIds.length !== predecessors.length ||
      auth.record.predecessorEvidenceIds.some((id, index) => id !== predecessors[index])) {
    blockers.push("auth_predecessor_mismatch");
  }
  const ceiling = Number(auth.record.maxAlertCredits);
  const protectedExposure = binding.runtime.stage1ReservationCredits + binding.runtime.unsettledBurstMarginCredits;
  if (!Number.isInteger(ceiling) || ceiling <= 0 || ceiling > 500 || protectedExposure > ceiling) {
    blockers.push("auth_ceiling_does_not_cover_protected_exposure");
  }
  if (auth.record.maxRestUnitsByCategory !== null &&
      Object.values(auth.record.maxRestUnitsByCategory).some((value) => Number(value) !== 0)) {
    blockers.push("auth_rest_units_nonzero");
  }
  if (!String(auth.record.cleanupOwner ?? "").trim()) blockers.push("auth_cleanup_owner_missing");

  const ledgerPath = path.resolve("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
  const ledger = fs.readFileSync(ledgerPath, "utf8");
  const approvalHeading = `### ${auth.record.authorizationId} — approved Phase 2G Stage-1 authorization`;
  if (!ledger.includes(binding.smoke.evidenceId)) blockers.push("smoke_handoff_not_in_ledger");
  if (!ledger.includes(binding.evidenceId)) blockers.push("gate2_runtime_not_in_ledger");
  if (!ledger.includes(approvalHeading)) blockers.push("exact_stage1_auth_approval_heading_missing");
  if (!ledger.includes(`AUTH_ARTIFACT_SHA256:${expectedAuthSha}`)) blockers.push("exact_stage1_auth_sha_not_approved");
  if (!ledger.includes("approval_scope: PHASE_2G_STAGE1_ONLY")) blockers.push("stage1_approval_scope_missing");

  const startMs = Date.parse(String(auth.record.startNotBeforeUtc ?? ""));
  const expiresMs = Date.parse(String(auth.record.expiresAtUtc ?? ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(expiresMs) || expiresMs <= startMs) {
    blockers.push("auth_time_window_invalid");
  }

  const incidents = await pool.query(`SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`);
  const openIncidents = Number(incidents.rows[0]?.n ?? -1);
  if (openIncidents !== 0) blockers.push(`open_incidents=${openIncidents}`);

  const activeProbe = await pool.query(`SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status='probing'`);
  const activeProbes = Number(activeProbe.rows[0]?.n ?? -1);
  if (activeProbes !== 0) blockers.push(`active_probes=${activeProbes}`);

  const sameDayRows = await pool.query(
    `SELECT probe_id,icao,status FROM clean.adb_anchor_probe WHERE probe_budget_day_id=$1 ORDER BY recorded_at ASC`,
    [binding.runtime.probeBudgetDayId],
  );
  if ((sameDayRows.rowCount ?? sameDayRows.rows.length) !== 0) blockers.push("probe_budget_day_already_has_probe_rows");

  const budgetDays = await pool.query(
    `SELECT probe_budget_day_id,state,cap_credits FROM clean.adb_probe_budget_day ORDER BY created_at ASC`,
  );
  const openBudgetDays = budgetDays.rows.filter((row: any) => row.state === "OPEN");
  if (openBudgetDays.length !== 0) blockers.push(`open_probe_budget_days=${openBudgetDays.length}`);

  const balance = await getBalance();
  if (!balance) throw new Error("BLOCKED:PROVIDER_BALANCE_READ_FAILED");
  if (balance.creditsRemaining < 1000 + protectedExposure) {
    blockers.push(`provider_balance_below_protected_floor:${balance.creditsRemaining}`);
  }
  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter((subscription) => subscription.isActive && subscription.billingType !== "LifetimeBased");
  if (activeBillable.length !== 0) blockers.push(`active_billable_subscriptions=${activeBillable.length}`);

  const origin = workspaceOrigin();
  let callback: Record<string, unknown> = {
    origin,
    reachable: false,
    exact_contract: false,
    managed_replit_workflow: false,
    source_compatible_with_current_head: false,
  };
  if (!origin) {
    blockers.push("workspace_callback_origin_missing");
  } else {
    try {
      const health = await getJson(`${origin}/__v39/workspace-runtime`);
      const runtimeHead = String(health.json?.git_head ?? "").toLowerCase();
      let matched = 0;
      let sourceCompatible = false;
      if (/^[a-f0-9]{40}$/.test(runtimeHead)) {
        const checks = CALLBACK_SOURCE_PATHS.map((file) => {
          const runtimeSourceSha = sha256(gitFileAt(runtimeHead, file));
          const currentSourceSha = sha256(fs.readFileSync(path.resolve(file)));
          const match = runtimeSourceSha === currentSourceSha;
          if (match) matched += 1;
          return { file, match };
        });
        sourceCompatible = checks.every((check) => check.match);
      }
      const exactContract = health.status === 200 &&
        health.json?.schema === "v39.phase2f-workspace-runtime.v1" &&
        health.json?.status === "PASS" &&
        health.json?.prepaid_route_registered === true &&
        health.json?.provider_mutation === false &&
        health.json?.managed_replit_workflow === true &&
        runtimeHead === currentHead;
      const reachable = exactContract && sourceCompatible;
      callback = {
        origin,
        reachable,
        exact_contract: exactContract,
        schema: health.json?.schema ?? null,
        route_owner: health.json?.route_owner ?? null,
        managed_replit_workflow: health.json?.managed_replit_workflow === true,
        runtime_git_head: runtimeHead || null,
        current_git_head: currentHead,
        retention_hours: health.json?.retention_hours ?? null,
        bucket_prefix: health.json?.bucket_prefix ?? null,
        matched_protected_sources: matched,
        protected_source_count: CALLBACK_SOURCE_PATHS.length,
        source_compatible_with_current_head: sourceCompatible,
      };
      if (!exactContract) blockers.push("workspace_callback_exact_managed_contract_failed");
      if (!sourceCompatible) blockers.push("workspace_callback_source_not_compatible");
    } catch (error) {
      callback = {
        origin,
        reachable: false,
        exact_contract: false,
        managed_replit_workflow: false,
        source_compatible_with_current_head: false,
        error: error instanceof Error ? error.message : String(error),
      };
      blockers.push("workspace_callback_check_failed");
    }
  }

  const bucketRaw = String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? "").trim();
  const bucketCorrectable = bucketRaw.startsWith("replit-objstore-") || bucketRaw.startsWith("eplit-objstore-");
  if (!bucketCorrectable) blockers.push("provider_blob_bucket_config_missing_or_unexpected");

  const now = new Date();
  const tc = binding.smoke.preprobe.artifact.probeTimeClass;
  const currentClass = utcWeekdayClass(now);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const timeClassEligible = currentClass === tc.stage1WeekdayClass && circularHourDistance(hour, tc.stage1UtcSlotHour) <= 1;
  const safeLatestStartMs = expiresMs - (TARGET_MINUTES + AUTH_CLEANUP_BUFFER_MINUTES) * 60_000;
  const authStarted = Number.isFinite(startMs) && now.getTime() >= startMs;
  const authNotExpired = Number.isFinite(expiresMs) && now.getTime() <= expiresMs;
  const safeToStartByAuthDuration = Number.isFinite(safeLatestStartMs) && now.getTime() <= safeLatestStartMs;
  const targetEnd = new Date(now.getTime() + TARGET_MINUTES * 60_000);
  const wouldCrossUtcMidnight = now.toISOString().slice(0, 10) !== targetEnd.toISOString().slice(0, 10);

  if (authStarted && !authNotExpired) blockers.push("auth_expired");
  if (authStarted && !safeToStartByAuthDuration) blockers.push("auth_remaining_duration_too_short");
  if (authStarted && wouldCrossUtcMidnight) blockers.push("probe_would_cross_utc_midnight");
  if (authStarted && !timeClassEligible) blockers.push("outside_frozen_stage1_time_class");

  let status: "PASS_READY_FOR_PAID_STAGE1" | "PASS_WAIT_FOR_AUTH_START" | "BLOCKED";
  if (blockers.length > 0) {
    status = "BLOCKED";
  } else if (!authStarted) {
    const secondsUntilStart = Math.ceil((startMs - now.getTime()) / 1000);
    status = secondsUntilStart >= 0 && secondsUntilStart <= 30 * 60
      ? "PASS_WAIT_FOR_AUTH_START"
      : "BLOCKED";
    if (status === "BLOCKED") blockers.push(`auth_not_started_seconds=${secondsUntilStart}`);
  } else {
    status = "PASS_READY_FOR_PAID_STAGE1";
  }

  const receipt = {
    schema: "v39.phase2g-stage1-paid-preflight.v1",
    status,
    mutation_performed: false,
    provider_paid_action_performed: false,
    deployment_performed: false,
    generated_at_utc: now.toISOString(),
    git_head: currentHead,
    expected_git_head: expectedHead,
    auth: {
      authorization_id: auth.record.authorizationId,
      file: path.relative(process.cwd(), authPath),
      sha256: auth.sha256,
      start_not_before_utc: auth.record.startNotBeforeUtc,
      expires_at_utc: auth.record.expiresAtUtc,
      max_alert_credits: ceiling,
      protected_exposure_credits: protectedExposure,
      safe_latest_start_utc: Number.isFinite(safeLatestStartMs) ? new Date(safeLatestStartMs).toISOString() : null,
      approved_in_ledger: ledger.includes(approvalHeading) && ledger.includes(`AUTH_ARTIFACT_SHA256:${expectedAuthSha}`),
    },
    gate2_runtime: {
      file: path.relative(process.cwd(), runtimePath),
      file_sha256: binding.runtimeFileSha256,
      binding_sha256: binding.bindingSha256,
      evidence_id: binding.evidenceId,
      probe_budget_day_id: binding.runtime.probeBudgetDayId,
      stage1_reservation_credits: binding.runtime.stage1ReservationCredits,
      unsettled_burst_margin_credits: binding.runtime.unsettledBurstMarginCredits,
    },
    provider: {
      credits_remaining: balance.creditsRemaining,
      protected_floor_after_authorized_exposure: 1000,
      active_billable_subscriptions: activeBillable.length,
    },
    database: {
      open_incidents: openIncidents,
      active_probes: activeProbes,
      same_budget_day_probe_rows: sameDayRows.rowCount ?? sameDayRows.rows.length,
      open_probe_budget_days: openBudgetDays.length,
    },
    frozen_stage1_time_class: {
      utc_slot_hour: tc.stage1UtcSlotHour,
      weekday_class: tc.stage1WeekdayClass,
      eligible_now: timeClassEligible,
      would_cross_utc_midnight_if_started_now: wouldCrossUtcMidnight,
    },
    callback,
    blockers,
    next: status === "PASS_READY_FOR_PAID_STAGE1"
      ? "Launch only through the exact hash-bound persistent Stage-1 launcher."
      : status === "PASS_WAIT_FOR_AUTH_START"
        ? "Wait until AUTH start/time-class opens, rerun this preflight, then launch only on PASS_READY_FOR_PAID_STAGE1."
        : "Resolve blockers; do not launch Stage 1.",
  };

  const raw = JSON.stringify(receipt, null, 2) + "\n";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, raw, { encoding: "utf8", flag: "wx" });
  const fileSha256 = sha256(raw);
  console.log(JSON.stringify({
    ...receipt,
    preflight_receipt: path.relative(process.cwd(), outPath),
    preflight_receipt_sha256: fileSha256,
  }, null, 2));

  if (status === "BLOCKED") process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-stage1-paid-preflight.v1",
      status: "BLOCKED",
      mutation_performed: false,
      provider_paid_action_performed: false,
      deployment_performed: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });