import "dotenv/config";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import {
  getBalance,
  listSubscriptionsStrict,
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const LIVE_CREDIT_LIMIT = 450;
const POLL_MS = 30_000;
const PROVIDER_POLL_MS = 120_000;
const PROBE_APPEAR_TIMEOUT_MS = 10 * 60_000;
const DEADLINE_CLEANUP_GRACE_MS = 5 * 60_000;
const MAX_WATCH_MS = 150 * 60_000;

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256File(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function gitHead(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("WATCHDOG_REFUSED:GIT_HEAD_READ_FAILED");
  return String(result.stdout).trim().toLowerCase();
}

async function invokeRecovery(input: {
  authId: string;
  authFile: string;
  authSha: string;
  budgetDay: string;
  reason: string;
}): Promise<never> {
  console.error(JSON.stringify({
    schema: "v39.phase2g-github-safety-watchdog.v1",
    status: "RECOVERY_TRIGGERED",
    observed_at_utc: new Date().toISOString(),
    reason: input.reason,
    probe_budget_day_id: input.budgetDay,
  }));

  const recovery = spawnSync(
    process.execPath,
    [
      "--import", "tsx",
      "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts",
      "--auth", input.authId,
      "--auth-file", input.authFile,
      "--auth-sha", input.authSha,
      "--probe-budget-day-id", input.budgetDay,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "inherit",
    },
  );

  const code = recovery.status ?? 1;
  console.error(JSON.stringify({
    schema: "v39.phase2g-github-safety-watchdog.v1",
    status: code === 0 ? "RECOVERY_COMPLETED" : "RECOVERY_FAILED",
    observed_at_utc: new Date().toISOString(),
    recovery_exit_code: code,
    reason: input.reason,
  }));
  process.exit(code === 0 ? 0 : 1);
}

async function main(): Promise<void> {
  if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error("WATCHDOG_REFUSED:GITHUB_ACTIONS_RUNTIME_REQUIRED");
  }

  const authId = required("--auth").toUpperCase();
  const authFile = required("--auth-file");
  const authSha = required("--auth-sha").toLowerCase();
  const budgetDay = required("--probe-budget-day-id");
  const expectedHead = required("--expected-head").toLowerCase();
  const preflight = required("--preflight");
  const preflightSha = required("--preflight-sha").toLowerCase();
  const callbackBase = required("--callback-base").replace(/\/+$/, "");

  if (gitHead() !== expectedHead || String(process.env.GITHUB_SHA ?? "").toLowerCase() !== expectedHead) {
    throw new Error("WATCHDOG_REFUSED:GIT_HEAD_MISMATCH");
  }
  if (sha256File(authFile) !== authSha) throw new Error("WATCHDOG_REFUSED:AUTH_SHA_MISMATCH");
  if (sha256File(preflight) !== preflightSha) throw new Error("WATCHDOG_REFUSED:PREFLIGHT_SHA_MISMATCH");
  if (!/^https:\/\/[^/]+$/i.test(callbackBase) || /\.replit\.dev$/i.test(new URL(callbackBase).hostname)) {
    throw new Error("WATCHDOG_REFUSED:CALLBACK_BASE_INVALID");
  }

  const receipt = JSON.parse(fs.readFileSync(preflight, "utf8"));
  if (receipt?.schema !== "v39.phase2g-stage1-paid-preflight.v1" ||
      receipt?.status !== "PASS_READY_FOR_PAID_STAGE1" ||
      receipt?.owner_executor !== "github-actions" ||
      receipt?.callback?.origin !== callbackBase ||
      receipt?.gate2_runtime?.probe_budget_day_id !== budgetDay) {
    throw new Error("WATCHDOG_REFUSED:PREFLIGHT_BINDING_MISMATCH");
  }
  const baseline = Number(receipt?.provider?.credits_remaining);
  if (!Number.isInteger(baseline) || baseline < 0) {
    throw new Error("WATCHDOG_REFUSED:PREFLIGHT_BASELINE_INVALID");
  }

  for (const key of [
    "V39_DATABASE_RUNTIME_URL",
    "AERODATABOX_API_KEY",
    "AERODATABOX_WEBHOOK_SECRET",
    "V39_REMOTE_BLOB_CLEANUP_SECRET",
  ]) {
    if (!String(process.env[key] ?? "").trim()) {
      throw new Error(`WATCHDOG_REFUSED:MISSING_SECRET_ENV:${key}`);
    }
  }

  process.env.V39_REMOTE_BLOB_CLEANUP_BASE = callbackBase;
  process.env.WEBHOOK_BASE_URL = callbackBase;
  process.env.V39_PUBLIC_WEBHOOK_BASE_URL = callbackBase;
  process.env.V39_PROVIDER_BLOB_MODE = "required";

  const started = Date.now();
  let probeSeenAt: number | null = null;
  let nextProviderPoll = 0;
  let lastProviderBalance: number | null = null;
  let providerReadFailures = 0;

  while (Date.now() - started < MAX_WATCH_MS) {
    const probeR = await pool.query(
      `SELECT probe_id,icao,status,runtime_session_id,window_start,window_end,
              duration_censored,stop_reason,reconciliation_status,
              runtime_cleanup_verified_at_utc
         FROM clean.adb_anchor_probe
        WHERE stage=1 AND probe_budget_day_id=$1
        ORDER BY recorded_at DESC
        LIMIT 1`,
      [budgetDay],
    );

    if (!probeR.rowCount) {
      if (Date.now() - started > PROBE_APPEAR_TIMEOUT_MS) {
        console.log(JSON.stringify({
          schema: "v39.phase2g-github-safety-watchdog.v1",
          status: "NO_PROBE_CREATED_EXIT_SAFE",
          observed_at_utc: new Date().toISOString(),
          probe_budget_day_id: budgetDay,
          provider_mutation: false,
        }));
        return;
      }
      await sleep(POLL_MS);
      continue;
    }

    probeSeenAt ??= Date.now();
    const probe = probeR.rows[0];
    const status = String(probe.status);
    const sessionId = probe.runtime_session_id ? String(probe.runtime_session_id) : null;
    const windowEndMs = Date.parse(String(probe.window_end));

    let internalCredits = 0;
    if (sessionId) {
      const d = await pool.query(
        `SELECT COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::int AS credits
           FROM clean.prepaid_probe_delivery_runtime
          WHERE session_id=$1::uuid`,
        [sessionId],
      );
      internalCredits = Number(d.rows[0]?.credits ?? 0);
    }

    if (status === "completed") {
      if (!probe.runtime_cleanup_verified_at_utc || probe.reconciliation_status !== "MATCH") {
        throw new Error("WATCHDOG_REFUSED:COMPLETED_PROBE_WITHOUT_ACCEPTED_CLEANUP");
      }
      console.log(JSON.stringify({
        schema: "v39.phase2g-github-safety-watchdog.v1",
        status: "OWNER_COMPLETED_CLEANLY",
        observed_at_utc: new Date().toISOString(),
        probe_id: Number(probe.probe_id),
        internal_credits: internalCredits,
      }));
      return;
    }

    if (status === "failed" && probe.runtime_cleanup_verified_at_utc) {
      const subs = await listSubscriptionsStrict();
      const active = subs.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
      if (active.length === 0) {
        console.log(JSON.stringify({
          schema: "v39.phase2g-github-safety-watchdog.v1",
          status: "OWNER_FAILED_BUT_CLEANUP_VERIFIED",
          observed_at_utc: new Date().toISOString(),
          probe_id: Number(probe.probe_id),
          provider_mutation: false,
        }));
        return;
      }
      await invokeRecovery({ authId, authFile, authSha, budgetDay, reason: "failed_probe_still_has_active_billable_subscription" });
    }

    if (status !== "probing") {
      throw new Error(`WATCHDOG_REFUSED:UNEXPECTED_PROBE_STATUS:${status}`);
    }

    if (internalCredits >= LIVE_CREDIT_LIMIT) {
      await invokeRecovery({
        authId, authFile, authSha, budgetDay,
        reason: `internal_live_credit_limit_reached:${internalCredits}`,
      });
    }

    if (Number.isFinite(windowEndMs) && Date.now() > windowEndMs + DEADLINE_CLEANUP_GRACE_MS) {
      await invokeRecovery({
        authId, authFile, authSha, budgetDay,
        reason: "probe_deadline_plus_cleanup_grace_exceeded",
      });
    }

    if (Date.now() >= nextProviderPoll) {
      const balance = await getBalance();
      if (balance) {
        lastProviderBalance = Number(balance.creditsRemaining);
        providerReadFailures = 0;
        const externalDelta = Math.max(0, baseline - lastProviderBalance);
        if (externalDelta >= LIVE_CREDIT_LIMIT) {
          await invokeRecovery({
            authId, authFile, authSha, budgetDay,
            reason: `external_live_credit_limit_reached:${externalDelta}`,
          });
        }
      } else {
        providerReadFailures += 1;
      }
      nextProviderPoll = Date.now() + PROVIDER_POLL_MS;
    }

    console.log(JSON.stringify({
      schema: "v39.phase2g-github-safety-watchdog.v1",
      status: "WATCHING",
      observed_at_utc: new Date().toISOString(),
      probe_id: Number(probe.probe_id),
      probe_status: status,
      session_bound: Boolean(sessionId),
      internal_credits: internalCredits,
      provider_balance_last_seen: lastProviderBalance,
      provider_read_failures: providerReadFailures,
      window_end_utc: Number.isFinite(windowEndMs) ? new Date(windowEndMs).toISOString() : null,
      provider_mutation: false,
    }));

    await sleep(POLL_MS);
  }

  await invokeRecovery({
    authId, authFile, authSha, budgetDay,
    reason: "watchdog_max_runtime_exceeded",
  });
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-github-safety-watchdog.v1",
    status: "WATCHDOG_FAILED",
    observed_at_utc: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
