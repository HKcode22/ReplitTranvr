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
const NO_CALLBACK_SPEND_CONSECUTIVE_PROVIDER_POLLS_LIMIT = 3;
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
  const callbackMode = required("--callback-mode").trim().toLowerCase();

  if (gitHead() !== expectedHead || String(process.env.GITHUB_SHA ?? "").toLowerCase() !== expectedHead) {
    throw new Error("WATCHDOG_REFUSED:GIT_HEAD_MISMATCH");
  }
  if (sha256File(authFile) !== authSha) throw new Error("WATCHDOG_REFUSED:AUTH_SHA_MISMATCH");
  if (sha256File(preflight) !== preflightSha) throw new Error("WATCHDOG_REFUSED:PREFLIGHT_SHA_MISMATCH");
  if (!/^https:\/\/[^/]+$/i.test(callbackBase)) throw new Error("WATCHDOG_REFUSED:CALLBACK_BASE_INVALID");
  const isReplitDev = new URL(callbackBase).hostname.toLowerCase().endsWith(".replit.dev");
  if (!["published", "same-app-development-contingency"].includes(callbackMode)) throw new Error("WATCHDOG_REFUSED:CALLBACK_MODE_INVALID");
  if (isReplitDev && callbackMode !== "same-app-development-contingency") throw new Error("WATCHDOG_REFUSED:REPLIT_DEV_REQUIRES_EXPLICIT_CONTINGENCY");
  if (!isReplitDev && callbackMode === "same-app-development-contingency") throw new Error("WATCHDOG_REFUSED:DEV_CONTINGENCY_REQUIRES_REPLIT_DEV");

  const receipt = JSON.parse(fs.readFileSync(preflight, "utf8"));
  if (receipt?.schema !== "v39.phase2g-stage1-paid-preflight.v1" ||
      receipt?.status !== "PASS_READY_FOR_PAID_STAGE1" ||
      receipt?.owner_executor !== "github-actions" ||
      receipt?.callback_mode !== callbackMode ||
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
  ]) {
    if (!String(process.env[key] ?? "").trim()) {
      throw new Error(`WATCHDOG_REFUSED:MISSING_SECRET_ENV:${key}`);
    }
  }

  process.env.WEBHOOK_BASE_URL = callbackBase;
  process.env.V39_PUBLIC_WEBHOOK_BASE_URL = callbackBase;
  process.env.V39_DEFER_PROVIDER_CONTENT_CLEANUP = "1";

  const started = Date.now();
  let probeSeenAt: number | null = null;
  let nextProviderPoll = 0;
  let lastProviderBalance: number | null = null;
  let providerReadFailures = 0;
  let noCallbackSpendProviderPolls = 0;

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
    let callbackFailures = 0;
    let callbackRequestsSeen = 0;
    if (sessionId) {
      const d = await pool.query(
        `SELECT COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::int AS credits
           FROM clean.prepaid_probe_delivery_runtime
          WHERE session_id=$1::uuid`,
        [sessionId],
      );
      internalCredits = Number(d.rows[0]?.credits ?? 0);
      const sessionCounters = await pool.query(
        `SELECT callback_requests_seen,callback_failures
           FROM clean.prepaid_probe_session_runtime
          WHERE session_id=$1::uuid`,
        [sessionId],
      );
      callbackRequestsSeen = Number(sessionCounters.rows[0]?.callback_requests_seen ?? 0);
      callbackFailures = Number(sessionCounters.rows[0]?.callback_failures ?? 0);
    }

    if (callbackFailures > 0) {
      await invokeRecovery({
        authId, authFile, authSha, budgetDay,
        reason: `callback_persistence_failure_count:${callbackFailures}`,
      });
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

    if (status === "settling" || status === "failed") {
      const subs = await listSubscriptionsStrict();
      const active = subs.filter((sub) => sub.isActive && sub.billingType !== "LifetimeBased");
      if (active.length === 0) {
        if (
          status === "settling" &&
          (probe.duration_censored !== false ||
           probe.stop_reason != null ||
           probe.reconciliation_status !== "MATCH" ||
           probe.runtime_cleanup_verified_at_utc != null ||
           !sessionId)
        ) {
          throw new Error("WATCHDOG_REFUSED:SETTLING_PROBE_SHAPE_INVALID");
        }
        console.log(JSON.stringify({
          schema: "v39.phase2g-github-safety-watchdog.v1",
          status: status === "settling"
            ? "PROVIDER_SAFE_AWAITING_REPLIT_CLEANUP"
            : (probe.runtime_cleanup_verified_at_utc
                ? "OWNER_FAILED_BUT_CLEANUP_VERIFIED"
                : "OWNER_FAILED_PROVIDER_SAFE_CLEANUP_PENDING"),
          observed_at_utc: new Date().toISOString(),
          probe_id: Number(probe.probe_id),
          session_id: sessionId,
          active_billable_subscriptions: 0,
          reconciliation_status: probe.reconciliation_status,
          runtime_cleanup_verified: Boolean(probe.runtime_cleanup_verified_at_utc),
          provider_mutation: false,
        }));
        return;
      }
      await invokeRecovery({
        authId,
        authFile,
        authSha,
        budgetDay,
        reason: status === "settling"
          ? "settling_probe_still_has_active_billable_subscription"
          : "failed_probe_still_has_active_billable_subscription",
      });
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
        // Do not censor a scientifically valid run merely because provider SEND
        // accounting is temporarily ahead of received/persisted credits. The
        // frozen protocol adjudicates a positive external-vs-internal gap only
        // after settlement. Fail early only when provider spend is positive
        // while the application has observed zero callback requests across
        // three consecutive provider polls: that is a transport/authentication
        // failure signature, not a scientific yield signal.
        if (externalDelta > 0 && callbackRequestsSeen === 0) {
          noCallbackSpendProviderPolls += 1;
        } else {
          noCallbackSpendProviderPolls = 0;
        }
        if (noCallbackSpendProviderPolls >= NO_CALLBACK_SPEND_CONSECUTIVE_PROVIDER_POLLS_LIMIT) {
          await invokeRecovery({
            authId, authFile, authSha, budgetDay,
            reason: `persistent_provider_spend_without_callback_requests:external=${externalDelta}:polls=${noCallbackSpendProviderPolls}`,
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
      callback_requests_seen: callbackRequestsSeen,
      callback_failures: callbackFailures,
      provider_balance_last_seen: lastProviderBalance,
      provider_read_failures: providerReadFailures,
      no_callback_spend_provider_polls: noCallbackSpendProviderPolls,
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
