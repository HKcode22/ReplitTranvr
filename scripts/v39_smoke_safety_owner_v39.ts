/**
 * V3.9 Phase-2 mandatory pre-probe safety smoke owner (Plan §17 step 11b).
 *
 * This owner is deliberately separate from the official Gate-3 credit canary.
 * Provider payloads use the prepaid App-Storage + UNLOGGED runtime. Logged
 * evidence contains only project aggregate controls/metrics, never provider
 * balance edges, subscription ids, or raw payloads.
 */
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { getBalance, listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { runPrepaidLiveWindowV39 } from "../server/lib/disruption/prepaidProbeWindow_v39";
import { loadPreprobeHandoffBindingV39 } from "../server/lib/disruption/phase2Handoff_v39";
import { parseArgs, resolveOwnerAuthorization, verifyAuthFile } from "./v39_paid_guard_v39";

const SCOPE = "Phase 2 / safety smoke";
const PROTECTED_ALERT_FLOOR = 1000;
const DEFAULT_ARTIFACT = "artifacts/v39-phase2-safety-smoke.json";
const DEFAULT_PREPROBE = "artifacts/preprobe-reference-freeze-record.json";

interface SmokeArgs {
  icao: string;
  minutes: number;
  artifactPath: string;
}

function parseSmokeArgs(argv: string[]): SmokeArgs {
  let icao = "";
  let minutes = 0;
  let artifactPath = DEFAULT_ARTIFACT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--icao") icao = String(argv[++i] ?? "").trim().toUpperCase();
    else if (argv[i] === "--minutes") minutes = Number(argv[++i]);
    else if (argv[i] === "--artifact") artifactPath = String(argv[++i] ?? "").trim();
  }
  if (!/^[A-Z0-9]{4}$/.test(icao)) throw new Error("REFUSED_SMOKE_ICAO_REQUIRED");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 15) {
    throw new Error("REFUSED_SMOKE_WINDOW_MINUTES_MUST_BE_1_TO_15");
  }
  if (!artifactPath) throw new Error("REFUSED_SMOKE_ARTIFACT_PATH_REQUIRED");
  return { icao, minutes, artifactPath };
}

function nonnegativeIntegerEnv(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`REFUSED_${name}_MUST_BE_NONNEGATIVE_INTEGER`);
  return value;
}

function exactScope(icao: string, minutes: number): string {
  return `FlightByAirportIcao:${icao};window_minutes=${minutes}`;
}

async function activeBillableCount(): Promise<number> {
  const subscriptions = await listSubscriptionsStrict();
  return subscriptions.filter((s) => s.isActive && s.billingType !== "LifetimeBased").length;
}

async function openIncident(kind: string, detail: Record<string, unknown>): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('reconciliation',now(),$1::jsonb,false)`,
    [JSON.stringify({ kind, owner: "phase2_safety_smoke", ...detail })],
  ).catch(() => undefined);
}

function artifactHash(bytes: string): string {
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

export async function runSafetySmokeOwner(argv = process.argv.slice(2)): Promise<number> {
  const auth = resolveOwnerAuthorization(SCOPE, argv);
  const controls = parseArgs(argv);
  if (!controls.authFile) throw new Error("REFUSED_SMOKE_AUTH_FILE_REQUIRED");
  const checked = verifyAuthFile(controls.authFile, SCOPE);
  if ("error" in checked || !checked.verdict.verified) {
    throw new Error(`REFUSED_SMOKE_AUTH_REVERIFY:${"error" in checked ? checked.error : checked.verdict.reason}`);
  }
  const args = parseSmokeArgs(argv);
  const record = checked.record;

  // Bind the paid smoke to the exact current Phase-2E preprobe artifact. The
  // ledger contains an evidence ID deterministically derived from BOTH the
  // artifact's internal SHA and the exact file-byte SHA. The human-approved
  // AUTH must name that evidence ID, so a stale/different preprobe cannot reuse
  // a prior smoke authorization.
  const preprobePath = process.env.ADB_PREPROBE_ARTIFACT_PATH || DEFAULT_PREPROBE;
  const preprobe = loadPreprobeHandoffBindingV39(preprobePath);
  if (!record.predecessorEvidenceIds.includes(preprobe.evidenceId)) {
    throw new Error(`REFUSED_SMOKE_PREPROBE_BINDING_REQUIRED:${preprobe.evidenceId}`);
  }

  if (record.airportFilterWindow !== exactScope(args.icao, args.minutes)) {
    throw new Error(`REFUSED_SMOKE_SCOPE_MISMATCH:AUTH=${record.airportFilterWindow ?? "<null>"}`);
  }
  const alertCeiling = Number(record.maxAlertCredits);
  if (!Number.isInteger(alertCeiling) || alertCeiling <= 0) throw new Error("REFUSED_SMOKE_ALERT_CEILING_REQUIRED");
  const rest = record.maxRestUnitsByCategory;
  if (rest && Object.values(rest).some((value) => Number(value) !== 0)) {
    throw new Error("REFUSED_SMOKE_REST_UNITS_MUST_BE_ZERO");
  }
  if (!record.cleanupOwner?.trim()) throw new Error("REFUSED_SMOKE_CLEANUP_OWNER_REQUIRED");

  const preSmokeMargin = nonnegativeIntegerEnv("V39_PRE_SMOKE_UNSETTLED_BURST_MARGIN_CREDITS");
  const beforeForeign = await activeBillableCount();
  if (beforeForeign !== 0) throw new Error(`REFUSED_R1_FOREIGN_ACTIVE_BILLABLE:${beforeForeign}`);
  const before = await getBalance();
  if (!before) throw new Error("REFUSED_SMOKE_BALANCE_UNKNOWN");
  if (before.creditsRemaining < PROTECTED_ALERT_FLOOR + alertCeiling + preSmokeMargin) {
    throw new Error("REFUSED_SMOKE_BALANCE_HEADROOM");
  }

  const settlement = {
    initialWaitSeconds: Number(process.env.ADB_SMOKE_SETTLE_INITIAL_S ?? 30),
    pollIntervalSeconds: Number(process.env.ADB_SMOKE_SETTLE_POLL_S ?? 10),
    stableReadCount: 3,
    timeoutSeconds: Number(process.env.ADB_SMOKE_SETTLE_TIMEOUT_S ?? 600),
  };
  if (!Number.isInteger(settlement.initialWaitSeconds) || settlement.initialWaitSeconds < 0 ||
      !Number.isInteger(settlement.pollIntervalSeconds) || settlement.pollIntervalSeconds <= 0 ||
      !Number.isInteger(settlement.timeoutSeconds) || settlement.timeoutSeconds <= 0) {
    throw new Error("REFUSED_SMOKE_SETTLEMENT_CONFIG_INVALID");
  }

  const result = await runPrepaidLiveWindowV39({
    ownerKind: "phase2_safety_smoke",
    icao: args.icao,
    targetHours: args.minutes / 60,
    settledOtherCredits: 0,
    hardCapCredits: alertCeiling,
    balanceBefore: before.creditsRemaining,
    settlement,
    deletionRunId: `phase2-safety-smoke-${auth.authId}`,
    watchdogPollMs: Number(process.env.ADB_SMOKE_WATCHDOG_POLL_MS ?? 5000),
  });

  const afterForeign = await activeBillableCount().catch(() => -1);
  const blobProof = await pool.query(
    `SELECT count(*)::int total,
            count(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int deleted
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1`,
    [`prepaid:${result.runtimeSessionId}:%`],
  );
  const totalBlobs = Number(blobProof.rows[0]?.total ?? 0);
  const deletedBlobs = Number(blobProof.rows[0]?.deleted ?? 0);
  const metrics = result.metrics;
  const boundsValid = !!metrics &&
    metrics.confirmedUniqueLower >= 0 &&
    metrics.confirmedPlusAmbiguousUpper >= metrics.confirmedUniqueLower &&
    metrics.confirmedPlusAmbiguousUpper <= metrics.uniqueFlights;

  const failures: string[] = [];
  if (result.status !== "completed") failures.push(`runtime-status:${result.status}`);
  if (result.reconciliationStatus !== "MATCH") failures.push(`reconciliation:${result.reconciliationStatus}`);
  if (!result.subscriptionDeleted) failures.push("owned-subscription-not-deleted");
  if (!result.cleanupVerifiedAtUtc) failures.push("provider-content-cleanup-not-verified");
  if (!metrics || metrics.rowsDelivered <= 0) failures.push("zero-items");
  if (!metrics || metrics.internalSendCredits <= 0) failures.push("zero-reconciled-send-credits");
  if (!boundsValid) failures.push("identity-codeshare-bounds-invalid");
  if (afterForeign !== 0) failures.push(`foreign-active-after:${afterForeign}`);
  if (totalBlobs <= 0 || deletedBlobs !== totalBlobs) failures.push(`raw-before-2xx-cleanup-proof:${deletedBlobs}/${totalBlobs}`);
  if (result.externalCredits !== result.internalSendCredits) failures.push("external-internal-not-exact");
  if ((result.externalCredits ?? alertCeiling + 1) > alertCeiling) failures.push("authorized-alert-ceiling-exceeded");

  if (failures.length) {
    await openIncident("phase2_safety_smoke_failed", {
      authorizationId: auth.authId,
      icao: args.icao,
      preprobeEvidenceId: preprobe.evidenceId,
      failures,
      cleanupVerified: Boolean(result.cleanupVerifiedAtUtc),
    });
    throw new Error(`PHASE2_SAFETY_SMOKE_FAIL:${failures.join(",")}`);
  }

  const frozenBurstMargin = Math.max(preSmokeMargin, result.maxObservedUnsettledCreditGap);
  const evidence = {
    schema: "v39.phase2-safety-smoke.v1",
    status: "PASS",
    authorizationId: auth.authId,
    authorizationArtifactSha256: auth.artifactHash,
    preprobeEvidenceId: preprobe.evidenceId,
    preprobeArtifactSha256: preprobe.artifactSha256,
    preprobeFileSha256: preprobe.fileSha256,
    preprobeBindingSha256: preprobe.bindingSha256,
    icao: args.icao,
    filter: "FlightByAirportIcao",
    windowMinutes: args.minutes,
    alertCeiling,
    restUnitsAuthorized: 0,
    protectedAlertFloor: PROTECTED_ALERT_FLOOR,
    preSmokeUnsettledBurstMarginCredits: preSmokeMargin,
    measuredMaxUnsettledCreditGap: result.maxObservedUnsettledCreditGap,
    unsettledBurstMarginCredits: frozenBurstMargin,
    rowsDelivered: metrics!.rowsDelivered,
    uniqueFlights: metrics!.uniqueFlights,
    tailChainLinks: metrics!.tailChainLinks,
    confirmedUniqueLower: metrics!.confirmedUniqueLower,
    confirmedPlusAmbiguousUpper: metrics!.confirmedPlusAmbiguousUpper,
    ambiguousUnknown: metrics!.ambiguousUnknown,
    settlementReads: result.settlementReads,
    exactExternalInternalReconciliation: true,
    rawBefore2xxPathVerified: true,
    providerContentCleanupVerified: true,
    ownedSubscriptionDeleted: true,
    foreignActiveBillableBefore: 0,
    foreignActiveBillableAfter: 0,
    generatedAtUtc: new Date().toISOString(),
  };
  const bytes = JSON.stringify(evidence, null, 2) + "\n";
  const path = resolve(args.artifactPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes, "utf8");
  console.log(JSON.stringify({ ...evidence, artifactPath: path, artifactSha256: artifactHash(bytes) }, null, 2));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSafetySmokeOwner().catch((error: any) => {
    console.error(JSON.stringify({ schema: "v39.phase2-safety-smoke.v1", status: "FAIL", error: error?.message ?? String(error) }));
    process.exitCode = 1;
  }).finally(async () => { await pool.end().catch(() => undefined); });
}
