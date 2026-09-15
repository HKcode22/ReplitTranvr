import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  getBalance,
  listSubscriptionsStrict,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

const FAILED_AUTH = "AUTH-20260915-P2F011738";
const FAILED_SESSION = "4eb0fad5-0732-42f6-b273-efae577df432";
const FAIL_START_MS = Date.parse("2026-09-15T01:27:23Z");
const FAIL_END_MS = Date.parse("2026-09-15T01:33:24Z");
const GATE0_TRUSTED_BALANCE = 2900;
const MIN_SAFE_BALANCE = 1150;
const ARTIFACT_DIR = "artifacts";

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function providerUtcMs(value: unknown): number {
  if (!value) return Number.NaN;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return Date.parse(raw.replace(" ", "T") + ":00Z");
  }
  return Date.parse(raw);
}

function strongSelftestPass(value: any): boolean {
  return (
    value?.status === "PASS" &&
    value?.aerodatabox_called === false &&
    value?.subscription_created === false &&
    Number(value?.alert_credits_spent) === 0 &&
    Number(value?.retention_hours) === 168 &&
    Number(value?.before_cleanup?.sessions) === 1 &&
    Number(value?.before_cleanup?.deliveries) === 1 &&
    Number(value?.before_cleanup?.items) === 1 &&
    Number(value?.before_cleanup?.live_blobs) === 1 &&
    Number(value?.after_cleanup?.sessions) === 0 &&
    Number(value?.after_cleanup?.deliveries) === 0 &&
    Number(value?.after_cleanup?.items) === 0 &&
    Number(value?.after_cleanup?.live_blobs) === 0
  );
}

function latestStrongSelftest(): { file: string; raw: Buffer; parsed: any } {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    throw new Error("REFUSED:ARTIFACT_DIR_MISSING");
  }

  const files = fs
    .readdirSync(ARTIFACT_DIR)
    .filter((name) => /^phase2f-local-persistence-selftest-\d{8}T\d{6}Z\.json$/.test(name))
    .sort()
    .reverse();

  for (const name of files) {
    const file = path.join(ARTIFACT_DIR, name);
    const raw = fs.readFileSync(file);
    try {
      const parsed = JSON.parse(raw.toString("utf8"));
      if (strongSelftestPass(parsed)) return { file, raw, parsed };
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("REFUSED:NO_STRONG_PHASE2F_PERSISTENCE_SELFTEST_PASS");
}

function validateOriginalIncidentRows(rows: any[]): void {
  if (rows.length !== 2 || rows.map((r) => String(r.id)).join(",") !== "1,2") {
    throw new Error(
      `REFUSED:INCIDENT_SET_CHANGED:${rows.map((r) => `${r.id}:${r.cause}`).join(",")}`,
    );
  }

  const one = rows[0];
  const two = rows[1];

  if (
    one.cause !== "raw-persistence" ||
    one.detail?.sessionId !== FAILED_SESSION ||
    !String(one.detail?.error ?? "").includes(
      "V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168",
    )
  ) {
    throw new Error("REFUSED:INCIDENT_1_UNEXPECTED");
  }

  if (
    two.cause !== "reconciliation" ||
    two.detail?.authorizationId !== FAILED_AUTH ||
    two.detail?.kind !== "phase2_safety_smoke_failed"
  ) {
    throw new Error("REFUSED:INCIDENT_2_UNEXPECTED");
  }
}

function validateExistingResolution(row: any): Record<string, any> {
  const resolution = row?.detail?.resolution;
  if (!resolution || typeof resolution !== "object") {
    throw new Error(`REFUSED:INCIDENT_${row?.id}_RESOLVED_WITHOUT_RECOVERY_METADATA`);
  }

  if (
    resolution.historical_smoke_status !== "FAIL" ||
    resolution.historical_mismatch_preserved !== true ||
    resolution.exact_historical_reconciliation_recovered !== false ||
    resolution.root_cause_remediated !== true ||
    resolution.new_valid_state_proven !== true
  ) {
    throw new Error(`REFUSED:INCIDENT_${row.id}_RECOVERY_METADATA_UNEXPECTED`);
  }

  return resolution;
}

async function main(): Promise<void> {
  const selftest = latestStrongSelftest();

  const balanceReads: Array<{
    atUtc: string;
    creditsRemaining: number;
    lastRefilledUtc: string | null;
    lastDeductedUtc: string | null;
  }> = [];

  for (let i = 0; i < 3; i += 1) {
    const balance = await getBalance();
    if (!balance) throw new Error(`REFUSED:BALANCE_READ_${i + 1}_FAILED`);
    balanceReads.push({
      atUtc: new Date().toISOString(),
      creditsRemaining: Number(balance.creditsRemaining),
      lastRefilledUtc: balance.lastRefilledUtc ?? null,
      lastDeductedUtc: balance.lastDeductedUtc ?? null,
    });
    if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const balanceValues = balanceReads.map((r) => r.creditsRemaining);
  if (!balanceValues.every((value) => value === balanceValues[0])) {
    throw new Error(`REFUSED:BALANCE_NOT_STABLE:${balanceValues.join(",")}`);
  }

  const currentBalance = balanceValues[0];
  if (!Number.isFinite(currentBalance) || currentBalance < MIN_SAFE_BALANCE) {
    throw new Error(`REFUSED:CURRENT_BALANCE_HEADROOM:${currentBalance}`);
  }

  const lastDeductedUtc = balanceReads[balanceReads.length - 1].lastDeductedUtc;
  const deductionMs = providerUtcMs(lastDeductedUtc);
  if (!Number.isFinite(deductionMs) || deductionMs < FAIL_START_MS || deductionMs > FAIL_END_MS) {
    throw new Error(
      `REFUSED:LATEST_DEDUCTION_OUTSIDE_FAILED_SMOKE_WINDOW:${lastDeductedUtc ?? "<null>"}`,
    );
  }

  const lastRefilledUtc = balanceReads[balanceReads.length - 1].lastRefilledUtc;
  const refillMs = providerUtcMs(lastRefilledUtc);
  if (Number.isFinite(refillMs) && refillMs >= FAIL_START_MS) {
    throw new Error(`REFUSED:REFILL_AT_OR_AFTER_FAILED_SMOKE:${lastRefilledUtc}`);
  }

  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter(
    (s) => s.isActive && s.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const residue = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2) AS blobs`,
    [FAILED_SESSION, `prepaid:${FAILED_SESSION}:%`],
  );

  const residueRow = residue.rows[0];
  if (
    Number(residueRow.sessions) !== 0 ||
    Number(residueRow.deliveries) !== 0 ||
    Number(residueRow.items) !== 0 ||
    Number(residueRow.blobs) !== 0
  ) {
    throw new Error(`REFUSED:FAILED_SESSION_RESIDUE_PRESENT:${JSON.stringify(residueRow)}`);
  }

  const incidentResult = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail,resolved,resolved_at_utc
       FROM clean.adb_incident_stop
      WHERE id IN (1,2)
      ORDER BY id`,
  );
  validateOriginalIncidentRows(incidentResult.rows);

  const otherOpen = await pool.query(
    `SELECT id,cause
       FROM clean.adb_incident_stop
      WHERE resolved=false AND id NOT IN (1,2)
      ORDER BY id
      LIMIT 1`,
  );
  if (otherOpen.rowCount !== 0) {
    throw new Error(
      `REFUSED:OTHER_OPEN_INCIDENT:${otherOpen.rows[0].id}:${otherOpen.rows[0].cause}`,
    );
  }

  const resolutionStates = incidentResult.rows.map((r) => r.resolved === true);
  const bothOpen = resolutionStates.every((value) => value === false);
  const bothResolved = resolutionStates.every((value) => value === true);
  if (!bothOpen && !bothResolved) {
    throw new Error("REFUSED:MIXED_INCIDENT_RESOLUTION_STATE");
  }

  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const conservativeExternalDelta = Math.max(0, GATE0_TRUSTED_BALANCE - currentBalance);
  const reviewedAtUtc = new Date().toISOString();
  const stamp = reviewedAtUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  let recoveryMode: "RESOLVED_NOW" | "ALREADY_RESOLVED_VERIFIED";
  let basisPath: string;
  let basisSha256: string;

  if (bothOpen) {
    const basis = {
      schema: "v39.phase2f-failed-smoke-recovery-basis.v1",
      status: "EVIDENCE_PASS",
      historicalSmokeStatus: "FAIL",
      historicalMismatchPreserved: true,
      exactHistoricalReconciliationRecovered: false,
      failedAuthorizationId: FAILED_AUTH,
      failedRuntimeSessionId: FAILED_SESSION,
      failedWindowUtc: {
        start: "2026-09-15T01:27:23Z",
        end: "2026-09-15T01:33:24Z",
      },
      providerState: {
        repeatedBalanceReads: balanceReads,
        stableBalance: currentBalance,
        lastDeductedUtc,
        latestDeductionFallsWithinFailedSmokeWindow: true,
        lastRefilledUtc,
        activeBillableSubscriptions: 0,
      },
      accountingDisposition: {
        gate0TrustedBalance: GATE0_TRUSTED_BALANCE,
        currentBalance,
        conservativeExternalDeltaSinceGate0: conservativeExternalDelta,
        exactFailedSmokeExternalSpendProven: false,
        exactFailedSmokeInternalSpendProven: false,
        note:
          "Historical mismatch is retained. The conservative balance delta is recorded for safety, but no exact per-SEND internal count is invented or backfilled.",
      },
      remediationEvidence: {
        sourceCommit,
        persistenceSelftestArtifact: selftest.file,
        persistenceSelftestSha256: sha256(selftest.raw),
        retentionHours: selftest.parsed.retention_hours,
        rawPersistencePassed: true,
        blobPersistencePassed: true,
        normalizedRuntimePersistencePassed: true,
        cleanupPassed: true,
        postCleanupRuntimeRows: 0,
        postCleanupLiveBlobs: 0,
        failedSessionResidue: residueRow,
      },
      resolutionMeaning:
        "Clear the persistent incident stop only after guarded operator review and proof of a new valid provider/storage/runtime state. This does not convert the failed Phase-2F smoke into PASS; a fresh authorized smoke remains required.",
      reviewedAtUtc,
    };

    basisPath = path.join(
      ARTIFACT_DIR,
      `phase2f-failed-smoke-recovery-basis-${stamp}.json`,
    );
    fs.writeFileSync(basisPath, JSON.stringify(basis, null, 2) + "\n", "utf8");
    basisSha256 = sha256(fs.readFileSync(basisPath));

    const resolutionMeta = {
      disposition: "HISTORICAL_MISMATCH_RETAINED_OPERATOR_REVIEW_COMPLETE",
      historical_smoke_status: "FAIL",
      historical_mismatch_preserved: true,
      exact_historical_reconciliation_recovered: false,
      root_cause_remediated: true,
      new_valid_state_proven: true,
      conservative_external_delta_since_gate0: conservativeExternalDelta,
      current_balance: currentBalance,
      latest_provider_deduction_utc: lastDeductedUtc,
      active_billable_subscriptions: 0,
      recovery_basis_artifact: basisPath,
      recovery_basis_sha256: basisSha256,
      persistence_selftest_artifact: selftest.file,
      persistence_selftest_sha256: sha256(selftest.raw),
      source_commit: sourceCommit,
      reviewed_at_utc: reviewedAtUtc,
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const locked = await client.query(
        `SELECT id,cause,detail,resolved
           FROM clean.adb_incident_stop
          WHERE id IN (1,2)
          ORDER BY id
          FOR UPDATE`,
      );
      validateOriginalIncidentRows(locked.rows);
      if (locked.rows.some((r) => r.resolved !== false)) {
        throw new Error("REFUSED:INCIDENT_STATE_CHANGED_DURING_RECOVERY");
      }

      const newOtherOpen = await client.query(
        `SELECT id,cause FROM clean.adb_incident_stop
          WHERE resolved=false AND id NOT IN (1,2)
          LIMIT 1`,
      );
      if (newOtherOpen.rowCount !== 0) {
        throw new Error(
          `REFUSED:NEW_OPEN_INCIDENT_DURING_RECOVERY:${newOtherOpen.rows[0].id}:${newOtherOpen.rows[0].cause}`,
        );
      }

      const r1 = await client.query(
        `UPDATE clean.adb_incident_stop
            SET detail=COALESCE(detail,'{}'::jsonb) || jsonb_build_object('resolution',$1::jsonb),
                resolved=true,
                resolved_at_utc=$2::timestamptz
          WHERE id=1 AND cause='raw-persistence' AND resolved=false
          RETURNING id`,
        [JSON.stringify(resolutionMeta), reviewedAtUtc],
      );

      const r2 = await client.query(
        `UPDATE clean.adb_incident_stop
            SET detail=COALESCE(detail,'{}'::jsonb) || jsonb_build_object('resolution',$1::jsonb),
                resolved=true,
                resolved_at_utc=$2::timestamptz
          WHERE id=2 AND cause='reconciliation' AND resolved=false
          RETURNING id`,
        [JSON.stringify(resolutionMeta), reviewedAtUtc],
      );

      if (r1.rowCount !== 1 || r2.rowCount !== 1) {
        throw new Error(`REFUSED:INCIDENT_UPDATE_COUNT:${r1.rowCount}/${r2.rowCount}`);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    recoveryMode = "RESOLVED_NOW";
  } else {
    const resolution1 = validateExistingResolution(incidentResult.rows[0]);
    const resolution2 = validateExistingResolution(incidentResult.rows[1]);

    if (
      resolution1.recovery_basis_artifact !== resolution2.recovery_basis_artifact ||
      resolution1.recovery_basis_sha256 !== resolution2.recovery_basis_sha256
    ) {
      throw new Error("REFUSED:RESOLVED_INCIDENT_RECOVERY_BASIS_MISMATCH");
    }

    basisPath = String(resolution1.recovery_basis_artifact ?? "");
    basisSha256 = String(resolution1.recovery_basis_sha256 ?? "");
    if (!basisPath || !/^[a-f0-9]{64}$/.test(basisSha256)) {
      throw new Error("REFUSED:RESOLVED_INCIDENT_RECOVERY_BASIS_MISSING");
    }
    if (!fs.existsSync(basisPath)) {
      throw new Error(`REFUSED:RECOVERY_BASIS_ARTIFACT_MISSING:${basisPath}`);
    }
    const actualBasisSha = sha256(fs.readFileSync(basisPath));
    if (actualBasisSha !== basisSha256) {
      throw new Error("REFUSED:RECOVERY_BASIS_SHA_MISMATCH");
    }

    recoveryMode = "ALREADY_RESOLVED_VERIFIED";
  }

  const verify = await pool.query(
    `SELECT
       count(*) FILTER (WHERE resolved=false)::int AS open_incidents,
       count(*) FILTER (
         WHERE id IN (1,2) AND resolved=true AND resolved_at_utc IS NOT NULL
       )::int AS recovered_incidents
     FROM clean.adb_incident_stop`,
  );

  const finalRows = await pool.query(
    `SELECT id,cause,resolved,resolved_at_utc,detail->'resolution' AS resolution
       FROM clean.adb_incident_stop
      WHERE id IN (1,2)
      ORDER BY id`,
  );

  const pass =
    Number(verify.rows[0]?.open_incidents) === 0 &&
    Number(verify.rows[0]?.recovered_incidents) === 2;

  const receipt = {
    schema: "v39.phase2f-failed-smoke-recovery-receipt.v1",
    status: pass ? "PASS" : "FAIL",
    recoveryMode,
    historicalSmokeConvertedToPass: false,
    exactHistoricalReconciliationClaimed: false,
    historicalMismatchPreserved: true,
    currentBalance,
    conservativeExternalDeltaSinceGate0: conservativeExternalDelta,
    latestDeductedUtc: lastDeductedUtc,
    activeBillableSubscriptions: 0,
    recoveryBasisArtifact: basisPath,
    recoveryBasisSha256: basisSha256,
    verification: verify.rows[0],
    incidents: finalRows.rows,
    generatedAtUtc: new Date().toISOString(),
  };

  const receiptPath = path.join(
    ARTIFACT_DIR,
    `phase2f-failed-smoke-recovery-receipt-${stamp}.json`,
  );
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        ...receipt,
        receiptArtifact: receiptPath,
        receiptArtifactSha256: sha256(fs.readFileSync(receiptPath)),
      },
      null,
      2,
    ),
  );

  if (!pass) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          schema: "v39.phase2f-failed-smoke-recovery-receipt.v1",
          status: "FAIL",
          historicalSmokeConvertedToPass: false,
          exactHistoricalReconciliationClaimed: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
