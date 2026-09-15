import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { getBalance, listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { loadPhase2SmokeHandoffV39 } from "../server/lib/disruption/phase2SmokeHandoff_v39";

const CALLBACK_SOURCE_PATHS = [
  "server/routes_v3.ts",
  "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  "server/lib/disruption/providerBlobStore_v39.ts",
  "server/lib/disruption/replitProviderBlobStore_v39.ts",
  "server/lib/disruption/db_v39.ts",
  "scripts/v39_workspace_v3_server_v39.ts",
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
  const d = date.getUTCDay();
  return d === 0 || d === 6 ? "weekend" : "weekday";
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
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  const text = await response.text().catch(() => "");
  let json: any | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json };
}

async function main(): Promise<void> {
  const preprobePath = path.resolve(optional("--preprobe", "artifacts/preprobe-reference-freeze-record.json"));
  const smokePath = path.resolve(required("--smoke"));
  const smokeRuntimePath = path.resolve(required("--smoke-runtime-file"));
  const smokeRuntimeSha = required("--smoke-runtime-sha").toLowerCase();
  const expectedHandoff = required("--expected-handoff");

  const handoff = loadPhase2SmokeHandoffV39({
    smokePath,
    preprobePath,
    runtimePath: smokeRuntimePath,
    expectedRuntimeFileSha256: smokeRuntimeSha,
  });
  if (handoff.evidenceId !== expectedHandoff) {
    throw new Error(`BLOCKED:PHASE2F_HANDOFF_MISMATCH:expected=${expectedHandoff}:actual=${handoff.evidenceId}`);
  }

  const ledgerPath = path.resolve("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
  const ledger = fs.readFileSync(ledgerPath, "utf8");
  if (!ledger.includes(handoff.evidenceId) || !ledger.includes("- phase2f: PASS")) {
    throw new Error("BLOCKED:PHASE2F_PASS_HANDOFF_NOT_RECORDED");
  }

  const incidents = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE resolved=false`,
  );
  const openIncidents = Number(incidents.rows[0]?.n ?? -1);

  const activeProbe = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status='probing'`,
  );
  const activeProbes = Number(activeProbe.rows[0]?.n ?? -1);

  const stage1Rows = await pool.query(
    `SELECT icao,status,probe_budget_day_id,recorded_at
       FROM clean.adb_anchor_probe
      WHERE stage=1 AND preprobe_artifact_sha256=$1
      ORDER BY recorded_at ASC`,
    [handoff.preprobe.fileSha256],
  );

  const budgetDays = await pool.query(
    `SELECT probe_budget_day_id,state,cap_credits,created_at,closed_at
       FROM clean.adb_probe_budget_day
      ORDER BY created_at ASC`,
  );
  const openBudgetDays = budgetDays.rows.filter((r: any) => r.state === "OPEN");

  const balance = await getBalance();
  if (!balance) throw new Error("BLOCKED:PROVIDER_BALANCE_READ_FAILED");
  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter((s: any) => s.isActive && s.billingType !== "LifetimeBased");

  const currentHead = git(["rev-parse", "HEAD"]).toLowerCase();
  const origin = workspaceOrigin();
  let callback: Record<string, unknown> = {
    origin,
    reachable: false,
    source_compatible_with_current_head: false,
  };
  if (origin) {
    try {
      const health = await getJson(`${origin}/__v39/workspace-runtime`);
      const runtimeHead = String(health.json?.git_head ?? "").toLowerCase();
      let sourceCompatible = false;
      let matched = 0;
      if (/^[a-f0-9]{40}$/.test(runtimeHead)) {
        const checks = CALLBACK_SOURCE_PATHS.map((file) => {
          const runtimeSha = sha256(gitFileAt(runtimeHead, file));
          const currentSha = sha256(fs.readFileSync(path.resolve(file)));
          const match = runtimeSha === currentSha;
          if (match) matched += 1;
          return { path: file, match };
        });
        sourceCompatible = checks.every((x) => x.match);
      }
      callback = {
        origin,
        reachable: health.status === 200 && health.json?.status === "PASS",
        runtime_git_head: runtimeHead || null,
        current_git_head: currentHead,
        route_owner: health.json?.route_owner ?? null,
        retention_hours: health.json?.retention_hours ?? null,
        bucket_prefix: health.json?.bucket_prefix ?? null,
        matched_protected_sources: matched,
        protected_source_count: CALLBACK_SOURCE_PATHS.length,
        source_compatible_with_current_head: sourceCompatible,
      };
    } catch (error) {
      callback = {
        origin,
        reachable: false,
        source_compatible_with_current_head: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const now = new Date();
  const tc = handoff.preprobe.artifact.probeTimeClass;
  const currentClass = utcWeekdayClass(now);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const stage1TimeClassEligibleNow =
    currentClass === tc.stage1WeekdayClass && circularHourDistance(hour, tc.stage1UtcSlotHour) <= 1;
  const targetEnd = new Date(now.getTime() + 120 * 60_000);
  const stage1WouldCrossUtcMidnight = now.toISOString().slice(0, 10) !== targetEnd.toISOString().slice(0, 10);

  const bucketRaw = String(process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? "").trim();
  const correctedBucketStructurallyAvailable =
    bucketRaw.startsWith("replit-objstore-") || bucketRaw.startsWith("eplit-objstore-");

  const hardCap = 500;
  const margin = handoff.smoke.unsettledBurstMarginCredits;
  const maxConservativeReservation = hardCap - margin;
  const proposedMinBuckets = 6; // 6 x 15 min = 90 min = 75% of the 2h Stage-1 target.

  const blockers: string[] = [];
  if (openIncidents !== 0) blockers.push(`open_incidents=${openIncidents}`);
  if (activeProbes !== 0) blockers.push(`active_probes=${activeProbes}`);
  if (openBudgetDays.length !== 0) blockers.push(`open_probe_budget_days=${openBudgetDays.length}`);
  if (activeBillable.length !== 0) blockers.push(`active_billable_subscriptions=${activeBillable.length}`);
  if (!correctedBucketStructurallyAvailable) blockers.push("provider_blob_bucket_config_missing_or_unexpected");
  if (callback.reachable !== true) blockers.push("workspace_callback_not_reachable");
  if (callback.source_compatible_with_current_head !== true) blockers.push("workspace_callback_source_not_compatible");

  const result = {
    schema: "v39.phase2g-readonly-preflight.v1",
    status: blockers.length === 0 ? "PASS_READY_FOR_NONPAID_FREEZE_DECISION" : "BLOCKED",
    mutation_performed: false,
    provider_paid_action_performed: false,
    deployment_performed: false,
    phase2f_handoff: {
      evidence_id: handoff.evidenceId,
      smoke_binding_sha256: handoff.smokeBindingSha256,
      unsettled_burst_margin_credits: margin,
    },
    provider: {
      credits_remaining: balance.creditsRemaining,
      active_billable_subscriptions: activeBillable.length,
      subscriptions_returned: subscriptions.length,
    },
    database: {
      open_incidents: openIncidents,
      active_probes: activeProbes,
      current_preprobe_stage1_rows: stage1Rows.rowCount ?? stage1Rows.rows.length,
      open_probe_budget_days: openBudgetDays.length,
      existing_probe_budget_days: budgetDays.rows.map((r: any) => ({
        probe_budget_day_id: r.probe_budget_day_id,
        state: r.state,
        cap_credits: Number(r.cap_credits),
      })),
    },
    frozen_stage1_time_class: {
      utc_slot_hour: tc.stage1UtcSlotHour,
      weekday_class: tc.stage1WeekdayClass,
      current_utc: now.toISOString(),
      current_weekday_class: currentClass,
      eligible_now: stage1TimeClassEligibleNow,
      would_cross_utc_midnight_if_started_now: stage1WouldCrossUtcMidnight,
    },
    frozen_stage2_time_class: {
      utc_slot_hour: tc.stage2UtcSlotHour,
      weekday_class: tc.stage2WeekdayClass,
    },
    callback,
    non_authorizing_freeze_proposal: {
      note: "PROPOSAL_ONLY_NOT_FROZEN_NOT_AUTHORIZED",
      rationale: "Use 6 complete 15-minute buckets (90 min, 75% of Stage-1 target) for minimum stability; reserve hard-cap minus the smoke-frozen 50-credit unsettled margin so safe-mode allows only one probe per 500-credit budget day and the next probe requires a separately frozen/closed day.",
      min_stability_buckets: proposedMinBuckets,
      stage1_reservation_credits: maxConservativeReservation,
      stage2_reservation_credits: maxConservativeReservation,
      suggested_stage1_auth_ceiling_credits: hardCap,
      one_probe_per_budget_day: true,
      probe_budget_day_hard_cap_credits: hardCap,
      values_frozen: false,
      paid_authorization: false,
    },
    blockers,
    next: blockers.length === 0
      ? "Human reviews/accepts or changes the non-authorizing Gate-2 freeze values; only then create the hash-locked runtime and Stage-1 draft AUTH."
      : "Resolve blockers before any Gate-2 runtime freeze or paid Stage-1 probe.",
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      schema: "v39.phase2g-readonly-preflight.v1",
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
