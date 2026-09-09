import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { pool } from "../server/db";
import { startBatch } from "../server/lib/disruption/adbCollectionController_v3";
import { resolveOwnerAuthorization } from "./v39_paid_guard_v39";

const PHASE6_SCOPE = "Phase 6 (separate authorization)";
const REQUIRED_SCHEMA_VERSION = "0047";
const MAX_PHASE6_ALERT_CEILING = 57_900;

function currentGitSha(): string {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("invalid git SHA");
    return sha.toLowerCase();
  } catch (error: any) {
    throw new Error(`REFUSED_CODE_SHA_UNAVAILABLE: ${error?.message ?? error}`);
  }
}

function integer(value: unknown, label: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`REFUSED_PHASE6_SAFETY_UNFROZEN: ${label}=${String(value)}`);
  }
  return n;
}

export async function runPhase6StartOwner(argv = process.argv.slice(2)): Promise<number> {
  // Owner-level AUTH verification is first. No DB/provider mutation precedes it.
  const commandAuth = resolveOwnerAuthorization(PHASE6_SCOPE, argv);

  const hashIndex = argv.indexOf("--manifest-sha256");
  const expectedHash = hashIndex >= 0 ? argv[hashIndex + 1] : null;
  const manifestPath = process.env.V39_MANIFEST_PATH;
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash) || !manifestPath) {
    throw new Error("REFUSED_MANIFEST: --manifest-sha256 <64hex> and V39_MANIFEST_PATH are required");
  }
  const actualHash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  if (actualHash !== expectedHash.toLowerCase()) {
    throw new Error(`REFUSED_MANIFEST_HASH: presented=${expectedHash} actual=${actualHash}`);
  }

  const auth = await pool.query(
    `SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,
            schema_version,enabled,revoked_at_utc,alert_cap_per_parent_day,
            phase6_alert_spend_ceiling,daily_soft_stop_margin_credits,
            production_reconcile_tolerance_credits,unsettled_burst_margin_credits,
            protected_alert_floor,safety_watchdog_poll_ms,
            settlement_initial_wait_seconds,settlement_poll_interval_seconds,
            settlement_stable_read_count,settlement_timeout_seconds
       FROM clean.adb_phase6_authorization
      WHERE singleton_key=true`,
  );
  if (auth.rowCount !== 1) throw new Error("REFUSED_PHASE6_AUTH: persistent singleton authorization is missing");
  const row = auth.rows[0];
  if (row.enabled !== true || row.revoked_at_utc !== null) {
    throw new Error("REFUSED_PHASE6_AUTH: persistent authorization is disabled/revoked");
  }
  if (String(row.authorization_id) !== commandAuth.authId) {
    throw new Error(`REFUSED_PHASE6_AUTH_ID: command AUTH ${commandAuth.authId} != persistent ${row.authorization_id}`);
  }
  if (String(row.manifest_sha256).toLowerCase() !== actualHash) {
    throw new Error("REFUSED_PHASE6_MANIFEST_BINDING: persistent authorization does not bind the presented manifest bytes");
  }

  const gitSha = currentGitSha();
  if (String(row.code_sha).toLowerCase() !== gitSha) {
    throw new Error(`REFUSED_CODE_SHA: authorized=${row.code_sha} running=${gitSha}`);
  }
  if (String(row.schema_version) !== REQUIRED_SCHEMA_VERSION) {
    throw new Error(`REFUSED_SCHEMA_VERSION: authorized=${row.schema_version} required=${REQUIRED_SCHEMA_VERSION}`);
  }

  const dailyCap = integer(row.alert_cap_per_parent_day, "alert_cap_per_parent_day", 1, 1900);
  const runCap = integer(row.phase6_alert_spend_ceiling, "phase6_alert_spend_ceiling", 1, MAX_PHASE6_ALERT_CEILING);
  const softMargin = integer(row.daily_soft_stop_margin_credits, "daily_soft_stop_margin_credits", 0, 1899);
  const reconcileTolerance = integer(row.production_reconcile_tolerance_credits, "production_reconcile_tolerance_credits", 0);
  const unsettled = integer(row.unsettled_burst_margin_credits, "unsettled_burst_margin_credits", 0);
  const protectedFloor = integer(row.protected_alert_floor, "protected_alert_floor", 1000);
  const watchdogPollMs = integer(row.safety_watchdog_poll_ms, "safety_watchdog_poll_ms", 250, 60_000);
  const settleInitial = integer(row.settlement_initial_wait_seconds, "settlement_initial_wait_seconds", 0);
  const settlePoll = integer(row.settlement_poll_interval_seconds, "settlement_poll_interval_seconds", 1);
  const settleReads = integer(row.settlement_stable_read_count, "settlement_stable_read_count", 3);
  const settleTimeout = integer(row.settlement_timeout_seconds, "settlement_timeout_seconds", 1);

  if (dailyCap !== 1900) throw new Error(`REFUSED_PHASE6_DAILY_CAP: authorized=${dailyCap} required=1900`);
  if (softMargin < unsettled) {
    throw new Error(`REFUSED_PHASE6_MARGIN_ORDER: soft=${softMargin} unsettled=${unsettled}`);
  }
  if (runCap > MAX_PHASE6_ALERT_CEILING || protectedFloor < 1000) {
    throw new Error("REFUSED_PHASE6_BUDGET_TREE: frozen Alert ceilings/floor are invalid");
  }
  // Keep the variables explicit in the evidence boundary; zero tolerance is
  // valid until/unless Gate evidence freezes a measured production tolerance.
  void reconcileTolerance;
  void settleInitial;
  void settlePoll;
  void settleReads;
  void settleTimeout;

  const schema = await pool.query(
    `SELECT
       to_regclass('clean.adb_phase6_calendar_day') AS calendar,
       to_regclass('clean.adb_airport_sampling_state') AS sampling_state,
       to_regclass('clean.adb_phase6_admission_attempt') AS admission,
       to_regclass('clean.webhook_identity_resolution') AS identity_resolution,
       to_regclass('clean.adb_phase6_safety_heartbeat') AS safety_heartbeat,
       to_regclass('clean.adb_phase6_settlement_evidence') AS settlement_evidence,
       to_regclass('clean.adb_budget_day_adjustment') AS budget_adjustment`,
  );
  const s = schema.rows[0] ?? {};
  if (!s.calendar || !s.sampling_state || !s.admission || !s.identity_resolution ||
      !s.safety_heartbeat || !s.settlement_evidence || !s.budget_adjustment) {
    throw new Error("REFUSED_SCHEMA_INCOMPLETE: required Phase-6/identity/safety tables are missing");
  }

  // A short-lived CLI must never create paid subscriptions unless the
  // long-lived server running the exact authorized code/config already has the
  // frozen SEND-aware watchdog alive. The heartbeat is produced only by that
  // owner after it validates the persistent authorization and running git SHA.
  const heartbeat = await pool.query(
    `SELECT authorization_id,code_sha,config_hash,watchdog_poll_ms,updated_at_utc,
            extract(epoch FROM (clock_timestamp()-updated_at_utc))*1000 AS age_ms
       FROM clean.adb_phase6_safety_heartbeat WHERE singleton_key=true`,
  );
  if (heartbeat.rowCount !== 1) throw new Error("REFUSED_SAFETY_WATCHDOG: no live Phase-6 safety heartbeat");
  const hb = heartbeat.rows[0];
  const ageMs = Number(hb.age_ms);
  const maxHeartbeatAgeMs = Math.max(5000, watchdogPollMs * 3);
  if (
    String(hb.authorization_id) !== commandAuth.authId ||
    String(hb.code_sha).toLowerCase() !== gitSha ||
    String(hb.config_hash).toLowerCase() !== String(row.config_hash).toLowerCase() ||
    Number(hb.watchdog_poll_ms) !== watchdogPollMs ||
    !Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxHeartbeatAgeMs
  ) {
    throw new Error(`REFUSED_SAFETY_WATCHDOG: heartbeat mismatch/stale age_ms=${ageMs} max=${maxHeartbeatAgeMs}`);
  }

  const result = await startBatch();
  console.log(JSON.stringify({
    schema: "v39.phase6-start-evidence.v3",
    status: "PASS",
    authorizationId: commandAuth.authId,
    manifestSha256: actualHash,
    codeSha: gitSha,
    schemaVersion: REQUIRED_SCHEMA_VERSION,
    calendarHash: String(row.calendar_hash),
    configHash: String(row.config_hash),
    dailyHardCap: dailyCap,
    phase6AlertSpendCeiling: runCap,
    dailySoftStopMarginCredits: softMargin,
    unsettledBurstMarginCredits: unsettled,
    productionReconcileToleranceCredits: reconcileTolerance,
    safetyWatchdogPollMs: watchdogPollMs,
    safetyHeartbeatAgeMs: ageMs,
    batchId: result.batch.batchId,
    effectiveBatchCreditBudget: result.batch.creditBudget,
    created: result.created.length,
    skipped: result.skipped.length,
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase6StartOwner().then((code) => { process.exitCode = code; }).catch((error: any) => {
    console.error(JSON.stringify({ schema: "v39.phase6-start-evidence.v3", status: "FAIL", error: error?.message ?? String(error) }));
    process.exitCode = 1;
  }).finally(async () => {
    await pool.end().catch(() => undefined);
  });
}
