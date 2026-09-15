import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  getBalance,
  listSubscriptionsStrict,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

const FAILED_AUTH = "AUTH-20260915-P2F011738";
const FAILED_SESSION = "4eb0fad5-0732-42f6-b273-efae577df432";
const FAIL_START_MS = Date.parse("2026-09-15T01:27:23Z");
const FAIL_END_MS = Date.parse("2026-09-15T01:33:24Z");
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

  const balances = balanceReads.map((r) => r.creditsRemaining);
  if (!balances.every((value) => value === balances[0])) {
    throw new Error(`REFUSED:BALANCE_NOT_STABLE:${balances.join(",")}`);
  }

  const currentBalance = balances[0];
  if (!Number.isFinite(currentBalance) || currentBalance < MIN_SAFE_BALANCE) {
    throw new Error(`REFUSED:CURRENT_BALANCE_HEADROOM:${currentBalance}`);
  }

  const lastDeductedUtc = balanceReads[balanceReads.length - 1].lastDeductedUtc;
  const deductionMs = providerUtcMs(lastDeductedUtc);
  if (!Number.isFinite(deductionMs) || deductionMs < FAIL_START_MS || deductionMs > FAIL_END_MS) {
    throw new Error(`REFUSED:LATEST_DEDUCTION_OUTSIDE_FAILED_SMOKE_WINDOW:${lastDeductedUtc ?? "<null>"}`);
  }

  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter(
    (s) => s.isActive && s.billingType !== "LifetimeBased",
  );
  if (activeBillable.length !== 0) {
    throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);
  }

  const incidents = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail,resolved,resolved_at_utc
       FROM clean.adb_incident_stop
      WHERE id IN (1,2)
      ORDER BY id`,
  );

  if (incidents.rowCount !== 2) {
    throw new Error(`REFUSED:EXPECTED_TWO_RECOVERY_INCIDENTS:${incidents.rowCount}`);
  }

  const one = incidents.rows.find((r) => String(r.id) === "1");
  const two = incidents.rows.find((r) => String(r.id) === "2");
  if (!one || !two) throw new Error("REFUSED:RECOVERY_INCIDENT_IDS_MISSING");

  if (
    one.cause !== "raw-persistence" ||
    one.detail?.sessionId !== FAILED_SESSION ||
    !String(one.detail?.error ?? "").includes(
      "V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168",
    )
  ) {
    throw new Error("REFUSED:INCIDENT_1_HISTORICAL_DETAIL_CHANGED");
  }

  if (
    two.cause !== "reconciliation" ||
    two.detail?.authorizationId !== FAILED_AUTH ||
    two.detail?.kind !== "phase2_safety_smoke_failed"
  ) {
    throw new Error("REFUSED:INCIDENT_2_HISTORICAL_DETAIL_CHANGED");
  }

  if (
    one.resolved !== true ||
    two.resolved !== true ||
    !one.resolved_at_utc ||
    !two.resolved_at_utc
  ) {
    throw new Error(
      `REFUSED:RECOVERY_NOT_COMMITTED:${JSON.stringify({
        incident1Resolved: one.resolved,
        incident2Resolved: two.resolved,
      })}`,
    );
  }

  for (const incident of [one, two]) {
    const resolution = incident.detail?.resolution;
    if (!resolution || typeof resolution !== "object") {
      throw new Error(`REFUSED:INCIDENT_${incident.id}_RESOLUTION_METADATA_MISSING`);
    }
    if (
      resolution.historical_smoke_status !== "FAIL" ||
      resolution.historical_mismatch_preserved !== true ||
      resolution.exact_historical_reconciliation_recovered !== false ||
      resolution.root_cause_remediated !== true ||
      resolution.new_valid_state_proven !== true ||
      Number(resolution.active_billable_subscriptions) !== 0
    ) {
      throw new Error(`REFUSED:INCIDENT_${incident.id}_RESOLUTION_METADATA_INVALID`);
    }
  }

  const open = await pool.query(
    `SELECT id,cause,occurred_at_utc
       FROM clean.adb_incident_stop
      WHERE resolved=false
      ORDER BY id`,
  );
  if (open.rowCount !== 0) {
    throw new Error(
      `REFUSED:OPEN_INCIDENTS_REMAIN:${open.rows.map((r) => `${r.id}:${r.cause}`).join(",")}`,
    );
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

  const generatedAtUtc = new Date().toISOString();
  const stamp = generatedAtUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const receipt = {
    schema: "v39.phase2f-failed-smoke-recovery-verification.v1",
    status: "PASS",
    historicalSmokeConvertedToPass: false,
    exactHistoricalReconciliationClaimed: false,
    historicalMismatchPreserved: true,
    failedAuthorizationId: FAILED_AUTH,
    failedRuntimeSessionId: FAILED_SESSION,
    balanceReads,
    currentBalance,
    lastDeductedUtc,
    activeBillableSubscriptions: 0,
    persistenceSelftestArtifact: selftest.file,
    persistenceSelftestSha256: sha256(selftest.raw),
    failedSessionResidue: residueRow,
    openIncidents: 0,
    recoveredIncidents: 2,
    incident1ResolvedAtUtc: one.resolved_at_utc,
    incident2ResolvedAtUtc: two.resolved_at_utc,
    mutationPerformedByThisVerifier: false,
    generatedAtUtc,
  };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const receiptPath = path.join(
    ARTIFACT_DIR,
    `phase2f-failed-smoke-recovery-verification-${stamp}.json`,
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
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          schema: "v39.phase2f-failed-smoke-recovery-verification.v1",
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
