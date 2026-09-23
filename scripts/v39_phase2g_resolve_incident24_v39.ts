import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";

function required(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? String(process.argv[i + 1] ?? "").trim() : "";
  if (!value) throw new Error(`MISSING:${name}`);
  return value;
}
function sha256(raw: Buffer | string): string {
  return createHash("sha256").update(raw).digest("hex");
}
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const receiptPath = path.resolve(required("--callback-verification"));
  const receiptSha = required("--callback-verification-sha").toLowerCase();
  const expectedHead = required("--expected-head").toLowerCase();
  const callbackBase = required("--callback-base").replace(/\/+$/, "");
  if (!/^[a-f0-9]{40}$/.test(expectedHead)) throw new Error("REFUSED:EXPECTED_HEAD_INVALID");
  if (!/^[a-f0-9]{64}$/.test(receiptSha)) throw new Error("REFUSED:RECEIPT_SHA_INVALID");
  if (!new URL(callbackBase).hostname.toLowerCase().endsWith(".replit.dev")) {
    throw new Error("REFUSED:INCIDENT24_CONTINGENCY_REQUIRES_REPLIT_DEV");
  }

  const raw = fs.readFileSync(receiptPath);
  if (sha256(raw) !== receiptSha) throw new Error("REFUSED:RECEIPT_SHA_MISMATCH");
  const receipt = JSON.parse(raw.toString("utf8"));
  const generated = Date.parse(String(receipt?.generated_at_utc ?? ""));
  const ageMs = Date.now() - generated;
  const validReceipt =
    receipt?.schema === "v39.phase2g-live-callback-verification.v1" &&
    receipt?.status === "PASS" &&
    receipt?.callback_mode === "same-app-development-contingency" &&
    receipt?.callback_origin === callbackBase &&
    String(receipt?.workspace_git_head ?? "").toLowerCase() === expectedHead &&
    receipt?.preexisting_incident_24_tolerated === true &&
    receipt?.preexisting_incident_25_tolerated === true &&
    Array.isArray(receipt?.preexisting_synthetic_incident_ids) &&
    receipt.preexisting_synthetic_incident_ids.length === 2 &&
    receipt.preexisting_synthetic_incident_ids[0] === 24 &&
    receipt.preexisting_synthetic_incident_ids[1] === 25 &&
    receipt?.wrong_secret_rejected_404 === true &&
    receipt?.correct_secret_accepted_200 === true &&
    receipt?.persistence_verified === true &&
    receipt?.local_exact_session_cleanup_verified === true &&
    receipt?.provider_called === false &&
    receipt?.provider_subscription_created === false &&
    Number(receipt?.alert_credits_spent) === 0 &&
    Number.isFinite(generated) &&
    ageMs >= -5 * 60_000 &&
    ageMs <= 2 * 60 * 60_000;
  if (!validReceipt) throw new Error("REFUSED:CALLBACK_RECEIPT_NOT_VALID_FOR_SYNTHETIC_INCIDENTS");

  const incidents = await pool.query(
    `SELECT id,cause,occurred_at_utc,detail,resolved
       FROM clean.adb_incident_stop
      WHERE resolved=false
      ORDER BY id ASC`,
  );
  if (incidents.rows.length !== 2) throw new Error(`REFUSED:OPEN_INCIDENT_COUNT:${incidents.rows.length}`);
  const byId = new Map(incidents.rows.map((row: any) => [Number(row.id), row]));
  const inc24 = byId.get(24);
  const inc25 = byId.get(25);
  const incident24Exact =
    !!inc24 &&
    String(inc24.cause) === "raw-persistence" &&
    String(inc24.detail?.mode ?? "") === "prepaid_probe" &&
    String(inc24.detail?.error ?? "") === "V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168";
  const incident25Exact =
    !!inc25 &&
    String(inc25.cause) === "raw-persistence" &&
    String(inc25.detail?.mode ?? "") === "prepaid_probe" &&
    String(inc25.detail?.error ?? "") === 'column "session_id" is of type uuid but expression is of type integer';
  if (!incident24Exact || !incident25Exact) throw new Error("REFUSED:SYNTHETIC_INCIDENT_IDENTITY_MISMATCH");

  const active = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')`,
  );
  if (Number(active.rows[0]?.n ?? -1) !== 0) throw new Error("REFUSED:ACTIVE_OR_SETTLING_PROBE");

  const openBudgets = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_probe_budget_day WHERE state='OPEN'`,
  );
  if (Number(openBudgets.rows[0]?.n ?? -1) !== 0) throw new Error("REFUSED:OPEN_BUDGET_DAY");

  const syntheticSession = String(receipt.session_id ?? "");
  const residue = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime WHERE session_id=$1::uuid) AS sessions,
       (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1::uuid) AS deliveries,
       (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid) AS items,
       (SELECT count(*)::int FROM clean.provider_content_blob_ref
          WHERE source_kind='webhook' AND source_record_id LIKE $2
            AND deletion_verified_at_utc IS NULL) AS live_blobs`,
    [syntheticSession, `prepaid:${syntheticSession}:%`],
  );
  const rr = residue.rows[0];
  if (Number(rr?.sessions) !== 0 || Number(rr?.deliveries) !== 0 || Number(rr?.items) !== 0 || Number(rr?.live_blobs) !== 0) {
    throw new Error(`REFUSED:SYNTHETIC_CALLBACK_RESIDUE:${JSON.stringify(rr)}`);
  }

  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (activeBillable.length !== 0) throw new Error(`REFUSED:ACTIVE_BILLABLE_SUBSCRIPTIONS:${activeBillable.length}`);

  if (!apply) {
    console.log(JSON.stringify({
      schema: "v39.phase2g-synthetic-callback-incident-resolution.v1",
      status: "PASS_READY_TO_RESOLVE_SYNTHETIC_INCIDENTS",
      incident_ids: [24, 25],
      provider_read_only_inventory_performed: true,
      provider_mutation: false,
      alert_credits_spent: 0,
      callback_origin: callbackBase,
      callback_receipt_sha256: receiptSha,
    }, null, 2));
    return;
  }
  if (process.env.PHASE2G_CONFIRM_SYNTHETIC_INCIDENT_RESOLUTION !== "YES") {
    throw new Error("REFUSED:SET_PHASE2G_CONFIRM_SYNTHETIC_INCIDENT_RESOLUTION=YES");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT id,cause,detail,resolved
         FROM clean.adb_incident_stop
        WHERE id IN (24,25)
        ORDER BY id
        FOR UPDATE`,
    );
    if (locked.rows.length !== 2) throw new Error("REFUSED:SYNTHETIC_INCIDENTS_CHANGED_BEFORE_APPLY");
    const lockedById = new Map(locked.rows.map((row: any) => [Number(row.id), row]));
    const l24 = lockedById.get(24);
    const l25 = lockedById.get(25);
    const locked24Exact =
      !!l24 && l24.resolved === false &&
      String(l24.cause) === "raw-persistence" &&
      String(l24.detail?.mode ?? "") === "prepaid_probe" &&
      String(l24.detail?.error ?? "") === "V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168";
    const locked25Exact =
      !!l25 && l25.resolved === false &&
      String(l25.cause) === "raw-persistence" &&
      String(l25.detail?.mode ?? "") === "prepaid_probe" &&
      String(l25.detail?.error ?? "") === 'column "session_id" is of type uuid but expression is of type integer';
    if (!locked24Exact || !locked25Exact) throw new Error("REFUSED:SYNTHETIC_INCIDENTS_CHANGED_BEFORE_APPLY");

    const updated = await client.query(
      `UPDATE clean.adb_incident_stop
          SET resolved=true,
              resolved_at_utc=now(),
              detail=COALESCE(detail,'{}'::jsonb) ||
                jsonb_build_object(
                  'resolution',
                  jsonb_build_object(
                    'classification',CASE
                      WHEN id=24 THEN 'zero-credit-stale-published-callback-synthetic'
                      WHEN id=25 THEN 'zero-credit-prepaid-item-placeholder-bug-synthetic'
                    END,
                    'replacement_callback_mode','same-app-development-contingency',
                    'replacement_callback_origin',$1::text,
                    'replacement_callback_receipt_sha256',$2::text,
                    'expected_git_head',$3::text,
                    'provider_mutation',false,
                    'alert_credits_spent',0,
                    'historical_scientific_evidence_changed',false
                  )
                )
        WHERE id IN (24,25) AND resolved=false
        RETURNING id,resolved,resolved_at_utc
        ORDER BY id`,
      [callbackBase, receiptSha, expectedHead],
    );
    if (updated.rowCount !== 2) throw new Error("REFUSED:SYNTHETIC_INCIDENT_UPDATE_COUNT");
    await client.query("COMMIT");
    const out = {
      schema: "v39.phase2g-synthetic-callback-incident-resolution.v1",
      status: "PASS_SYNTHETIC_INCIDENTS_RESOLVED",
      incident_ids: [24, 25],
      resolved_at_utc: updated.rows.map((row: any) => ({ id: Number(row.id), resolved_at_utc: row.resolved_at_utc })),
      callback_origin: callbackBase,
      callback_receipt_sha256: receiptSha,
      expected_git_head: expectedHead,
      provider_read_only_inventory_performed: true,
      provider_mutation: false,
      alert_credits_spent: 0,
      historical_scientific_evidence_changed: false,
    };
    fs.mkdirSync("artifacts", { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const outPath = path.join("artifacts", `phase2g-synthetic-callback-incident-resolution-${stamp}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ ...out, receipt_file: outPath, receipt_file_sha256: sha256(fs.readFileSync(outPath)) }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
main().catch((error) => {
  console.error(JSON.stringify({
    schema: "v39.phase2g-synthetic-callback-incident-resolution.v1",
    status: "REFUSED_OR_FAILED",
    provider_mutation: false,
    alert_credits_spent: 0,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => undefined);
});
