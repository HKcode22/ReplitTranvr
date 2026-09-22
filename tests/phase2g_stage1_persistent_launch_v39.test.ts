import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const preflight = readFileSync(join(root, "scripts", "v39_phase2g_stage1_paid_preflight_v39.ts"), "utf8");
const launcher = readFileSync(join(root, "scripts", "v39_phase2g_stage1_launch_logged_v39.sh"), "utf8");
const detachedSpawner = readFileSync(join(root, "scripts", "v39_phase2g_spawn_detached_supervisor_v39.ts"), "utf8");
const supervisor = readFileSync(join(root, "scripts", "v39_phase2g_stage1_logged_supervisor_v39.ts"), "utf8");
const recovery = readFileSync(join(root, "scripts", "v39_phase2g_stage1_recover_after_exit_v39.ts"), "utf8");
const sleepCheck = readFileSync(join(root, "scripts", "v39_phase2g_stage1_sleep_check_v39.ts"), "utf8");
const probeExecution = readFileSync(join(root, "server", "lib", "disruption", "probeExecutionPrepaid_v39.ts"), "utf8");
const prepaidWindow = readFileSync(join(root, "server", "lib", "disruption", "prepaidProbeWindow_v39.ts"), "utf8");
const overnightGuard = readFileSync(join(root, "scripts", "v39_phase2g_overnight_wsss_guard_v39.sh"), "utf8");

describe("Phase-2G persistent paid Stage-1 launch contract", () => {
  it("keeps the paid preflight read-only and emits an immutable exact receipt", () => {
    expect(preflight).toContain('let status: "PASS_READY_FOR_PAID_STAGE1" | "PASS_WAIT_FOR_AUTH_START" | "BLOCKED"');
    expect(preflight).toContain('status = "PASS_READY_FOR_PAID_STAGE1"');
    expect(preflight).toContain('? "PASS_WAIT_FOR_AUTH_START"');
    expect(preflight).toContain('status = "BLOCKED"');
    expect(preflight).toContain('provider_paid_action_performed: false');
    expect(preflight).toContain('deployment_performed: false');
    expect(preflight).toContain('fs.writeFileSync(outPath, raw, { encoding: "utf8", flag: "wx" })');
    expect(preflight).not.toContain("createSubscription(");
    expect(preflight).not.toContain("deleteSubscription(");
    expect(preflight).not.toContain("refillBalance(");
    expect(preflight).not.toContain("INSERT INTO clean.");
    expect(preflight).not.toContain("UPDATE clean.");
    expect(preflight).not.toContain("DELETE FROM clean.");
  });

  it("allows the hash-bound P2G07 recovery amendment in paid preflight without hard-wiring the old compact6 path", () => {
    expect(preflight).toContain("isP2g07Provider502RecoveryEligibleV39");
    expect(preflight).toContain("p2g07_provider502_recovery_rerun");
    expect(preflight).not.toContain("path: path.resolve(PHASE2G_COMPACT6_ARTIFACT_PATH)");
  });

  it("re-binds the exact approved AUTH, runtime, head, budget day, account and callback before launch", () => {
    expect(preflight).toContain("auth.sha256 !== expectedAuthSha");
    expect(preflight).toContain("auth_scope_mismatch");
    expect(preflight).toContain("auth_predecessor_mismatch");
    expect(preflight).toContain("exact_stage1_auth_sha_not_approved");
    expect(preflight).toContain("currentHead !== expectedHead");
    expect(preflight).toContain("probe_budget_day_already_has_probe_rows");
    expect(preflight).toContain("active_billable_subscriptions=");
    expect(preflight).toContain("workspace_callback_source_not_compatible");
    expect(preflight).toContain("provider_balance_below_protected_floor");
  });

  it("requires enough remaining AUTH time for the full target plus cleanup buffer", () => {
    expect(preflight).toContain("const TARGET_MINUTES = 120");
    expect(preflight).toContain("const AUTH_CLEANUP_BUFFER_MINUTES = 5");
    expect(preflight).toContain("safe_latest_start_utc");
    expect(preflight).toContain("auth_remaining_duration_too_short");
    expect(preflight).toContain("outside_frozen_stage1_time_class");
    expect(preflight).toContain("probe_would_cross_utc_midnight");
  });

  it("makes the final launcher reject tracked, staged, or untracked protected-source drift", () => {
    expect(launcher).toContain("git status --porcelain=v1 --untracked-files=all -- server scripts migrations tests");
    expect(launcher).toContain("REFUSED:PROTECTED_SOURCE_TREE_DIRTY");
    expect(launcher).toContain("PROTECTED_STATUS");
    expect(launcher).not.toContain("git diff --quiet -- server scripts migrations tests");
  });

  it("makes the launcher consume only a fresh hash-bound PASS receipt", () => {
    expect(launcher).toContain("ACTUAL_PREFLIGHT_SHA");
    expect(launcher).toContain("PASS_READY_FOR_PAID_STAGE1");
    expect(launcher).toContain("receipt.git_head !== process.env.EXPECTED_HEAD");
    expect(launcher).toContain("receipt.auth?.sha256 !== process.env.AUTH_SHA");
    expect(launcher).toContain("receipt.gate2_runtime?.file_sha256 !== process.env.RUNTIME_SHA");
    expect(launcher).toContain("ageMs > 10 * 60_000");
    expect(launcher).toContain("REFUSED:PREFLIGHT_RECEIPT_");
  });

  it("requires an explicit truthful workspace owner mode across preflight, launch and watchdog", () => {
    expect(preflight).toContain("runtime_owner_mode");
    expect(preflight).toContain("replit-managed-project");
    expect(preflight).toContain("phase2g-detached-npm-run-dev");
    expect(launcher).toContain("runtime_owner_mode");
    expect(launcher).toContain("phase2g-detached-npm-run-dev");
    expect(supervisor).toContain("runtime_owner_mode");
    expect(supervisor).toContain("phase2g-detached-npm-run-dev");
  });

  it("uses only the workspace callback, process-scoped bucket correction, and no deployment", () => {
    expect(launcher).toContain("*.replit.dev");
    expect(launcher).toContain("REFUSED:PRODUCTION_DOMAIN_NOT_ALLOWED");
    expect(launcher).toContain('eplit-objstore-*) CORRECT_BUCKET="r${CURRENT_BUCKET}"');
    expect(launcher).toContain('V39_PROVIDER_BLOB_BUCKET_ID="$CORRECT_BUCKET"');
    expect(launcher).toContain('V39_PUBLIC_WEBHOOK_BASE_URL="$BASE"');
    expect(launcher).toContain('WEBHOOK_BASE_URL="$BASE"');
    expect(launcher).toContain('"deployment_performed": false');
  });

  it("launches the supervisor in an independent OS session with durable artifacts", () => {
    expect(launcher).toContain("v39_phase2g_spawn_detached_supervisor_v39.ts");
    expect(launcher).not.toContain("nohup env");
    expect(launcher).toContain(".log\"");
    expect(launcher).toContain(".status.json\"");
    expect(launcher).toContain(".heartbeat.json\"");
    expect(launcher).toContain(".pid\"");
    expect(launcher).toContain('SUPERVISOR_PID="$(tr -d');
    expect(launcher).toContain('"status": "LAUNCHED_PERSISTENT_SUPERVISOR"');
    expect(launcher).toContain('--callback-base "$BASE"');
    expect(detachedSpawner).toContain("detached: true");
    expect(detachedSpawner).toContain("child.unref()");
    expect(detachedSpawner).toContain('childArgs[0] !== "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"');
    expect(detachedSpawner).toContain('provider_paid_action_performed: false');
    expect(detachedSpawner).toContain('deployment_performed: false');
  });

  it("durably binds the random runtime session before provider subscription creation", () => {
    expect(probeExecution).toContain("durablyBindProbeRuntimeSession");
    expect(probeExecution).toContain("SET runtime_session_id=$2::uuid");
    expect(probeExecution).toContain("REFUSED_RUNTIME_SESSION_DURABLE_BIND_FAILED");
    expect(probeExecution).toContain("onSessionArmed: async (sessionId)");
    const hookIndex = prepaidWindow.indexOf("if (input.onSessionArmed) await input.onSessionArmed(session.sessionId)");
    const createIndex = prepaidWindow.indexOf('createSubscription("FlightByAirportIcao"');
    expect(hookIndex).toBeGreaterThanOrEqual(0);
    expect(createIndex).toBeGreaterThan(hookIndex);
  });

  it("makes the overnight guard single-launch, exact-PASS, and never auto-retry", () => {
    expect(overnightGuard).toContain("PHASE2G_OVERNIGHT_ARM=YES");
    expect(overnightGuard).toContain("PHASE2G_OVERNIGHT_EXPECTED_HEAD");
    expect(overnightGuard).toContain("PASS_READY_FOR_PAID_STAGE1");
    expect(overnightGuard).toContain("OVERNIGHT_PAID_LAUNCH=STARTED_ONCE");
    expect(overnightGuard).toContain("BLOCKED_DO_NOT_RELAUNCH");
    expect(overnightGuard).toContain("scripts/v39_phase2g_stage1_launch_logged_v39.sh");
    expect(overnightGuard).not.toContain("while true; do\n    bash scripts/v39_phase2g_stage1_launch_logged_v39.sh");
  });

  it("front-door verifies the AUTH and supervises the actual paid owner directly", () => {
    expect(supervisor).toContain('enforcePaidGuard("v39:probe:stage1", PHASE)');
    expect(supervisor).toContain('verifyAuthFile(authFile, PHASE)');
    expect(supervisor).toContain("checked.record.authorizationId !== authId");
    expect(supervisor).toContain('"scripts/v39_probe_stage1_owner_v39.ts"');
    expect(supervisor).not.toContain('"scripts/v39_probe_stage1_v39.ts"');
    expect(supervisor).toContain('schema: "v39.command-evidence.v1"');
    expect(supervisor).toContain('command: "v39:probe:stage1"');
  });

  it("fails the owner closed when the public callback becomes persistently unreachable", () => {
    expect(supervisor).toContain("const CALLBACK_POLL_MS = 15_000");
    expect(supervisor).toContain("const CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3");
    expect(supervisor).toContain("callbackFailureCount >= CALLBACK_CONSECUTIVE_FAILURE_LIMIT");
    expect(supervisor).toContain('requestTermination("SIGTERM", "workspace_callback_unreachable_threshold")');
    expect(supervisor).toContain("callback_watchdog_triggered");
  });

  it("automatically invokes exact fail-closed recovery after any nonzero/interrupted owner exit", () => {
    expect(supervisor).toContain("if (!childPassed)");
    expect(supervisor).toContain('"scripts/v39_phase2g_stage1_recover_after_exit_v39.ts"');
    expect(supervisor).toContain('"--auth-sha", expectedAuthSha');
    expect(supervisor).toContain('"--probe-budget-day-id", budgetDayId');
    expect(supervisor).toContain("recovery_exit_code");
  });

  it("separates the 5-second local watchdog from one-minute provider balance polling", () => {
    expect(prepaidWindow).toContain("LIVE_PROVIDER_BALANCE_POLL_MS_V39 = 60_000");
    expect(prepaidWindow).toContain("LIVE_PROVIDER_BALANCE_FAILED_POLL_LIMIT_V39 = 3");
    expect(prepaidWindow).toContain("nextProviderBalancePollAt");
    expect(prepaidWindow).toContain("consecutiveFailedProviderBalancePolls");
    expect(probeExecution).toContain('startsWith("balance_read_failed")');
  });

  it("does not censor a paid probe on one transient balance-read failure", () => {
    expect(prepaidWindow).toContain("getBalanceWithTransientRetryV39");
    expect(prepaidWindow).toContain("attempt <= 3");
    expect(prepaidWindow).toContain("balance_read_failed_after_retries");
    expect(prepaidWindow).not.toContain('liveStopReason = "balance_read_failed";');
  });

  it("recovers an exact orphan subscription even after the owner already marked the probe failed", () => {
    expect(recovery).toContain("status='failed'");
    expect(recovery).toContain("subscription_delete_failed");
    expect(recovery).toContain("state IN ('armed','active','settling','failed')");
    expect(recovery).toContain("status IN ('probing','failed')");
    expect(probeExecution).toContain("duration_censored=COALESCE");
    expect(prepaidWindow).toContain("deleteOwnedSubscriptionVerifiedV39");
    expect(prepaidWindow).toContain("listSubscriptionsStrict");
  });

  it("recovers exact ownership after an UNLOGGED runtime reset without persisting provider IDs", () => {
    expect(recovery).toContain("SELECT probe_id,icao,status,runtime_session_id");
    expect(recovery).toContain("durableSessionId");
    expect(recovery).toContain("prepaidProbeWebhookUrlV39(defaultWebhookUrl(), durableSessionId)");
    expect(recovery).toContain('String(subscription.subject?.type ?? "") === "FlightByAirportIcao"');
    expect(recovery).toContain('String(subscription.subject?.id ?? "").toUpperCase() === probeIcao');
    expect(recovery).toContain('String(subscription.subscriber?.type ?? "") === "WebHook"');
    expect(recovery).toContain("RECOVERY_REFUSED:RUNTIME_RESET_ACTIVE_BILLABLE_NOT_EXACTLY_OWNED");
    expect(recovery).toContain("supervisor_child_exit_after_runtime_reset_recovered");
    expect(recovery).toContain("durable_session_id_used");
  });

  it("scopes recovery to one exact Stage-1 probe/session and never bulk-deletes unmatched billable subscriptions", () => {
    expect(recovery).toContain("stage=1 AND probe_budget_day_id=$1");
    expect(recovery).toContain("owner_kind='anchor_probe' AND owner_probe_id=$1 AND stage=1");
    expect(recovery).toContain("RECOVERY_REFUSED:MULTIPLE_ACTIVE_RUNTIME_SESSIONS");
    expect(recovery).toContain('subscription.billingType === "CreditBased"');
    expect(recovery).toContain("RECOVERY_REFUSED:UNBOUND_SESSION_ACTIVE_BILLABLE_NOT_EXACTLY_OWNED");
    expect(recovery).toContain("deleteSubscription(ownedProviderSubscriptionId)");
    expect(recovery).not.toContain("for (const subscription of activeBillableBefore)");
  });

  it("marks abnormal exits failed/unresolved and opens an incident instead of fabricating PASS", () => {
    expect(recovery).toContain("SET status='failed'");
    expect(recovery).toContain("reconciliation_status='UNRESOLVED'");
    expect(recovery).toContain('kind: "stage1_supervisor_recovery"');
    expect(recovery).toContain('status: "RECOVERY_COMPLETED_FAIL_CLOSED"');
    expect(recovery).not.toContain('status: "PASS"');
  });

  it("makes the pre-sleep health check read-only and refuse a second launch on any uncertainty", () => {
    expect(sleepCheck).toContain('"RUNNING_HEALTHY_UNATTENDED_WINDOW"');
    expect(sleepCheck).toContain('"BLOCKED_DO_NOT_RELAUNCH"');
    expect(sleepCheck).toContain("heartbeatAgeSeconds > 90");
    expect(sleepCheck).toContain("supervisor_process_not_alive");
    expect(sleepCheck).toContain("provider_subscription_not_bound");
    expect(sleepCheck).toContain("exact_owned_credit_subscription_not_active");
    expect(sleepCheck).toContain("foreign_active_billable=");
    expect(sleepCheck).toContain("workspace_callback_not_reachable");
    expect(sleepCheck).toContain("host_failure_boundary");
    expect(sleepCheck).not.toContain("createSubscription(");
    expect(sleepCheck).not.toContain("deleteSubscription(");
    expect(sleepCheck).not.toContain("INSERT INTO clean.");
    expect(sleepCheck).not.toContain("UPDATE clean.");
    expect(sleepCheck).not.toContain("DELETE FROM clean.");
  });
});
