/**
 * P25 YSSY exact-object forensic readback — independent of missing UNLOGGED
 * session rows.  No provider API imports, DB writes, storage upload/delete,
 * raw payload logging, or automatic archival/retention extension.
 *
 * Run only in Replit workspace with the dedicated object bucket configured.
 * Explicit --verify-objects opt-in reads each saved object, nothing else.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { v39Pool } from "../server/lib/disruption/db_v39.ts";
import { createRequiredProviderBlobStoreV39 } from "../server/lib/disruption/replitProviderBlobStore_v39.ts";

const PROBE_ID = 19;
const BUDGET = "P2G-S1-20261013-03";
const SESSION = "b0077437-edc1-459a-9d63-8c6e6e50c4f2";
const EXPECTED_REFS = 58;
const EXPECTED_BYTES = 308832;
const EXPECTED_EXTERNAL_CREDITS = 231;
const EXPECTED_RECEIVED_CREDITS = 229;
const verify = process.argv.slice(2).length === 1 &&
  process.argv[2] === "--verify-objects";
if (!verify) throw Error("P25_REQUIRES_EXPLICIT_VERIFY_OBJECTS");
if (!process.env.V39_DATABASE_RUNTIME_URL ||
    process.env.V39_PROVIDER_BLOB_MODE !== "required" ||
    !process.env.V39_PROVIDER_BLOB_BUCKET_ID)
  throw Error("P25_REQUIRED_READONLY_DATABASE_AND_BLOB_CONFIG_MISSING");

const failures: { index: number; kind: string }[] = [];
let checked = 0, readBytes = 0;
let refs: Array<{
  object_name: string;
  content_sha256: string;
  content_bytes: number | string;
  storage_kind: string;
  contract_version: string;
  content_class: string;
  expires_at_utc: Date | string;
  deletion_verified_at_utc: Date | string | null;
}> = [];
let committedMetadata = false;
const c = await v39Pool.connect();
try {
  await c.query("BEGIN TRANSACTION READ ONLY");
  await c.query("SET LOCAL statement_timeout = '10000ms'");
  const p = await c.query(
    `SELECT status,reconciliation_status,duration_censored,
            runtime_session_id,runtime_cleanup_verified_at_utc
       FROM clean.adb_anchor_probe
      WHERE probe_id=$1 AND probe_budget_day_id=$2 AND icao='YSSY'
        AND runtime_session_id=$3::uuid`,
    [PROBE_ID, BUDGET, SESSION],
  );
  if (p.rowCount !== 1 ||
      p.rows[0].status !== "failed" ||
      p.rows[0].reconciliation_status !== "DELIVERY_GAP" ||
      p.rows[0].duration_censored !== false ||
      p.rows[0].runtime_cleanup_verified_at_utc !== null)
    throw Error("P25_ORIGINAL_PROBE_CONTRACT_CHANGED");

  const q = await c.query(
    `SELECT external_spend_credits,internal_received_credits,delivery_gap_credits
       FROM clean.adb_probe_reconciliation_evidence
      WHERE probe_id=$1 AND runtime_session_id=$2::uuid`,
    [PROBE_ID, SESSION],
  );
  if (q.rowCount !== 1 ||
      Number(q.rows[0].external_spend_credits) !== EXPECTED_EXTERNAL_CREDITS ||
      Number(q.rows[0].internal_received_credits) !== EXPECTED_RECEIVED_CREDITS ||
      Number(q.rows[0].delivery_gap_credits) !== 2)
    throw Error("P25_FINAL_RECONCILIATION_EVIDENCE_CHANGED");

  const r = await c.query(
    `SELECT object_name,content_sha256,content_bytes,storage_kind,
            content_class,contract_version,expires_at_utc,
            deletion_verified_at_utc
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook'
        AND source_record_id LIKE $1
      ORDER BY persisted_at_utc,blob_ref_id`,
    [`prepaid:${SESSION}:%`],
  );
  refs = r.rows;
  if (refs.length !== EXPECTED_REFS)
    throw Error("P25_EXACT_REFERENCE_COUNT_CHANGED");
  if (refs.some(x =>
    x.deletion_verified_at_utc !== null ||
    x.storage_kind !== "replit_app_storage" ||
    x.content_class !== "raw_provider_content" ||
    x.contract_version !== "provider-blob-contract-v39@1.0.0" ||
    !/^[a-f0-9]{64}$/.test(String(x.content_sha256)) ||
    !Number.isSafeInteger(Number(x.content_bytes)) ||
    Number(x.content_bytes) < 0 ||
    !(new Date(x.expires_at_utc).getTime() > Date.now())
  )) throw Error("P25_BLOB_REFERENCE_CONTRACT_INVALID_OR_EXPIRED");
  if (refs.reduce((n,x) => n+Number(x.content_bytes),0) !== EXPECTED_BYTES)
    throw Error("P25_TOTAL_METADATA_BYTES_CHANGED");

  await c.query("ROLLBACK");
  committedMetadata = true;
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  c.release();
}

try {
  if (!committedMetadata) throw Error("P25_READONLY_METADATA_NOT_COMPLETE");
  const storage = createRequiredProviderBlobStoreV39();
  for (let i=0; i<refs.length; i++) {
    try {
      const b = Buffer.from(await storage.downloadBytes(refs[i].object_name));
      if (createHash("sha256").update(b).digest("hex") !== refs[i].content_sha256 ||
          b.length !== Number(refs[i].content_bytes)) {
        failures.push({ index: i+1, kind: "SHA256_OR_BYTE_LENGTH_MISMATCH" });
      } else {
        checked++;
        readBytes += b.length;
      }
    } catch {
      failures.push({ index: i+1, kind: "STORAGE_DOWNLOAD_UNAVAILABLE" });
    }
  }
  const pass = checked === EXPECTED_REFS && readBytes === EXPECTED_BYTES &&
    failures.length === 0;
  console.log(JSON.stringify({
    schema: "v39.phase2g-p25-yssy-original-readback.v1",
    status: pass ? "PASS_ORIGINAL_BYTES_SHA256" : "HOLD_READBACK_INCOMPLETE",
    probe_id: PROBE_ID, budget_day: BUDGET, session_id: SESSION,
    historical_protocol_result: "DELIVERY_GAP",
    reviewed_external_credits: EXPECTED_EXTERNAL_CREDITS,
    reviewed_received_credits: EXPECTED_RECEIVED_CREDITS,
    observed_credit_completeness: EXPECTED_RECEIVED_CREDITS/EXPECTED_EXTERNAL_CREDITS,
    reference_count: refs.length, verified_objects: checked,
    expected_original_bytes: EXPECTED_BYTES, verified_original_bytes: readBytes,
    earliest_source_expiry: new Date(Math.min(...refs.map(x =>
      new Date(x.expires_at_utc).getTime()))).toISOString(),
    failures,
    original_payloads_exported: false,
    provider_calls: 0, provider_mutations: 0,
    database_mutations: 0, storage_mutations: 0,
    limitation: "Only 58 received originals; cannot reconstruct 2 unseen billed units",
  },null,2));
  if (!pass) process.exitCode=2;
} finally {
  await v39Pool.end();
}
