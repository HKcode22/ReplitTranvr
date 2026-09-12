import { createHash, randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { PoolClient } from "pg";
import { v39Pool } from "./db_v39";
import {
  parseRetentionMatrixEvidence,
  resolveRetentionMatrix,
  verifyRetentionMatrix,
} from "./retentionMatrix_v39";
import {
  HARD_RETENTION_LIMIT_HOURS,
  verifyRetentionDeploymentEvidence,
  type RetentionDeploymentEvidenceV39,
} from "./retentionDeployment_v39";

export const DEFAULT_RAW_PROVIDER_RETENTION_HOURS = HARD_RETENTION_LIMIT_HOURS.raw_provider_content;
export const DEFAULT_FIDS_RETENTION_HOURS = HARD_RETENTION_LIMIT_HOURS.live_fids_cache;
export const DEFAULT_EXPIRY_BATCH_LIMIT = 100;

export interface RetentionPrimaryPolicy {
  rawProviderHours: number;
  liveFidsHours: number;
}

export interface RetentionExpiryCandidate {
  sourceTable: string;
  recordId: string;
  contentClass: string;
  contentColumns: string[];
  ageTimestampUtc: string;
  expiresAtUtc: string;
  retentionHours: number;
  contentHash: string;
  payloadHash?: string;
  kind: "raw_delivery" | "raw_delivery_item" | "adb_ingest_events" | "flight_data_pre_post" | "fids_query_response" | "monitored_flights_v2";
  key: string | number;
}

export interface RetentionExpiryResult {
  mode: "DRY_RUN" | "APPLY";
  runId: string;
  cutoffUtc: string; // compatibility alias: raw-provider cutoff
  fidsCutoffUtc: string;
  retentionDays: number; // compatibility alias: raw-provider hours / 24
  retentionHours: RetentionPrimaryPolicy;
  candidates: RetentionExpiryCandidate[];
  expiredCount: number;
  evidenceHash: string;
}

function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

export function validateRetentionHours(raw: string | number | undefined, maxHours: number, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > maxHours) {
    throw new Error(`${label} must be an integer from 1 through ${maxHours} hours`);
  }
  return n;
}

/** Backward-compatible validator for the old raw-provider day setting. */
export function validateRetentionDays(raw: string | number | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 7) {
    throw new Error("V39_RAW_PROVIDER_RETENTION_DAYS must be an integer from 1 through 7");
  }
  return n;
}

export function resolveRetentionPrimaryPolicy(env: NodeJS.ProcessEnv = process.env): RetentionPrimaryPolicy {
  let rawProviderHours: number;
  if (env.V39_RAW_PROVIDER_RETENTION_HOURS != null && String(env.V39_RAW_PROVIDER_RETENTION_HOURS).trim() !== "") {
    rawProviderHours = validateRetentionHours(
      env.V39_RAW_PROVIDER_RETENTION_HOURS,
      HARD_RETENTION_LIMIT_HOURS.raw_provider_content,
      "V39_RAW_PROVIDER_RETENTION_HOURS",
    );
  } else if (env.V39_RAW_PROVIDER_RETENTION_DAYS != null && String(env.V39_RAW_PROVIDER_RETENTION_DAYS).trim() !== "") {
    rawProviderHours = validateRetentionDays(env.V39_RAW_PROVIDER_RETENTION_DAYS) * 24;
  } else {
    rawProviderHours = DEFAULT_RAW_PROVIDER_RETENTION_HOURS;
  }

  const liveFidsHours = validateRetentionHours(
    env.V39_FIDS_RETENTION_HOURS ?? DEFAULT_FIDS_RETENTION_HOURS,
    HARD_RETENTION_LIMIT_HOURS.live_fids_cache,
    "V39_FIDS_RETENTION_HOURS",
  );

  return { rawProviderHours, liveFidsHours };
}

function planHash(): string {
  const file = path.resolve(process.cwd(), "SEPmd", "V3.9_DataCollectPlan_f.8.md");
  return sha256(readFileSync(file));
}

function utc(value: unknown): string {
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) throw new Error(`invalid retention timestamp: ${String(value)}`);
  return d.toISOString();
}

function expiryFromAgeHours(age: string, hours: number): string {
  return new Date(new Date(age).getTime() + hours * 3_600_000).toISOString();
}

function parseDeploymentEvidence(raw: string): RetentionDeploymentEvidenceV39 {
  try { return JSON.parse(raw) as RetentionDeploymentEvidenceV39; }
  catch { throw new Error("V39_RETENTION_DEPLOYMENT_EVIDENCE_NOT_JSON"); }
}

function assertApplyEvidence(policy: RetentionPrimaryPolicy): void {
  if (process.env.V39_RETENTION_APPLY_ARMED !== "1") {
    throw new Error("V39_RETENTION_APPLY_ARMED_REQUIRED");
  }

  const matrixRaw = process.env.V39_RETENTION_MATRIX_EVIDENCE;
  if (!matrixRaw) throw new Error("V39_RETENTION_MATRIX_EVIDENCE_REQUIRED");
  const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(matrixRaw));
  const verdict = verifyRetentionMatrix(rows);
  const all = [...failures, ...verdict.failures];
  if (all.length) throw new Error(`RETENTION_MATRIX_NOT_VERIFIED:${all.slice(0, 5).join(",")}`);

  const deploymentRaw = process.env.V39_RETENTION_DEPLOYMENT_EVIDENCE;
  if (!deploymentRaw) throw new Error("V39_RETENTION_DEPLOYMENT_EVIDENCE_REQUIRED");
  const deployment = parseDeploymentEvidence(deploymentRaw);
  const deploymentVerdict = verifyRetentionDeploymentEvidence(deployment);
  if (!deploymentVerdict.pass) {
    throw new Error(`RETENTION_DEPLOYMENT_NOT_VERIFIED:${deploymentVerdict.failures.slice(0, 5).join(",")}`);
  }
  if (deployment.primaryExpiryHours.raw_provider_content !== policy.rawProviderHours) {
    throw new Error("RETENTION_POLICY_EVIDENCE_MISMATCH:raw_provider_content");
  }
  if (deployment.primaryExpiryHours.live_fids_cache !== policy.liveFidsHours) {
    throw new Error("RETENTION_POLICY_EVIDENCE_MISMATCH:live_fids_cache");
  }
}

async function queryRows(sql: string, params: unknown[]): Promise<any[]> {
  const r = await v39Pool.query(sql, params);
  return r.rows;
}

function normalizePolicy(policyOrLegacyDays?: RetentionPrimaryPolicy | number): RetentionPrimaryPolicy {
  if (typeof policyOrLegacyDays === "number") {
    return {
      rawProviderHours: validateRetentionDays(policyOrLegacyDays) * 24,
      liveFidsHours: DEFAULT_FIDS_RETENTION_HOURS,
    };
  }
  return policyOrLegacyDays ?? resolveRetentionPrimaryPolicy();
}

export async function collectRetentionExpiryCandidates(
  now = new Date(),
  policyOrLegacyDays?: RetentionPrimaryPolicy | number,
  limit = DEFAULT_EXPIRY_BATCH_LIMIT,
): Promise<RetentionExpiryCandidate[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("retention expiry limit must be 1..1000");
  const policy = normalizePolicy(policyOrLegacyDays);
  const rawCutoff = new Date(now.getTime() - policy.rawProviderHours * 3_600_000).toISOString();
  const fidsCutoff = new Date(now.getTime() - policy.liveFidsHours * 3_600_000).toISOString();
  const out: RetentionExpiryCandidate[] = [];
  const room = () => Math.max(0, limit - out.length);

  if (room()) {
    const rows = await queryRows(
      `SELECT id, received_at_utc, raw_body, raw_body_sha256, http_request_headers, http_response_body, http_path, error_message
         FROM clean.raw_delivery
        WHERE raw_expired_at_utc IS NULL
          AND received_at_utc <= $1::timestamptz
          AND (raw_body IS NOT NULL OR http_request_headers IS NOT NULL OR http_response_body IS NOT NULL OR http_path IS NOT NULL OR error_message IS NOT NULL)
        ORDER BY received_at_utc, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const age = utc(r.received_at_utc);
      const content = { raw_body: r.raw_body, http_request_headers: r.http_request_headers, http_response_body: r.http_response_body, http_path: r.http_path, error_message: r.error_message };
      out.push({ sourceTable: "clean.raw_delivery", recordId: `raw_delivery:${r.id}:provider_content`, contentClass: "webhook_raw_delivery", contentColumns: ["raw_body", "http_request_headers", "http_response_body", "http_path", "error_message"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.rawProviderHours), retentionHours: policy.rawProviderHours, contentHash: sha256(content), payloadHash: r.raw_body_sha256 || undefined, kind: "raw_delivery", key: Number(r.id) });
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, created_at, raw_item, raw_item_sha256
         FROM clean.raw_delivery_item
        WHERE raw_expired_at_utc IS NULL AND created_at <= $1::timestamptz AND raw_item IS NOT NULL
        ORDER BY created_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const age = utc(r.created_at);
      out.push({ sourceTable: "clean.raw_delivery_item", recordId: `raw_delivery_item:${r.id}:raw_item`, contentClass: "webhook_raw_delivery", contentColumns: ["raw_item"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.rawProviderHours), retentionHours: policy.rawProviderHours, contentHash: sha256(r.raw_item), payloadHash: r.raw_item_sha256 || undefined, kind: "raw_delivery_item", key: Number(r.id) });
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, received_at, raw_payload, payload_sha256, http_metadata, error
         FROM clean.adb_ingest_events
        WHERE raw_expired_at_utc IS NULL AND received_at <= $1::timestamptz
          AND (raw_payload IS NOT NULL OR http_metadata IS NOT NULL OR error IS NOT NULL)
        ORDER BY received_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const age = utc(r.received_at);
      const content = { raw_payload: r.raw_payload, http_metadata: r.http_metadata, error: r.error };
      out.push({ sourceTable: "clean.adb_ingest_events", recordId: `adb_ingest_events:${r.id}:provider_content`, contentClass: "webhook_raw_delivery", contentColumns: ["raw_payload", "http_metadata", "error"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.rawProviderHours), retentionHours: policy.rawProviderHours, contentHash: sha256(content), payloadHash: r.payload_sha256 || undefined, kind: "adb_ingest_events", key: Number(r.id) });
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, received_at, payload_json, subscription_notices, payload_sha256
         FROM clean.flight_data_pre_post
        WHERE raw_expired_at_utc IS NULL AND received_at <= $1::timestamptz
          AND (payload_json IS NOT NULL OR subscription_notices IS NOT NULL)
        ORDER BY received_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const age = utc(r.received_at);
      const payloadHash = r.payload_sha256 || (r.payload_json == null ? undefined : sha256(r.payload_json));
      out.push({ sourceTable: "clean.flight_data_pre_post", recordId: `flight_data_pre_post:${r.id}:raw_content`, contentClass: "flight_data_pre_post_raw", contentColumns: ["payload_json", "subscription_notices"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.rawProviderHours), retentionHours: policy.rawProviderHours, contentHash: sha256({ payload_json: r.payload_json, subscription_notices: r.subscription_notices }), payloadHash, kind: "flight_data_pre_post", key: Number(r.id) });
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT population_query_id, raw_persisted_at_utc, raw_payload, response_hash
         FROM clean.fids_query_response
        WHERE raw_expired_at_utc IS NULL AND raw_persisted_at_utc <= $1::timestamptz AND raw_payload IS NOT NULL
        ORDER BY raw_persisted_at_utc, population_query_id LIMIT $2`,
      [fidsCutoff, room()],
    );
    for (const r of rows) {
      const age = utc(r.raw_persisted_at_utc);
      out.push({ sourceTable: "clean.fids_query_response", recordId: `fids_query_response:${r.population_query_id}:raw_payload`, contentClass: "fids_population", contentColumns: ["raw_payload"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.liveFidsHours), retentionHours: policy.liveFidsHours, contentHash: sha256(r.raw_payload), payloadHash: r.response_hash || undefined, kind: "fids_query_response", key: String(r.population_query_id) });
    }
  }

  if (room()) {
    const exists = await v39Pool.query(`SELECT to_regclass('clean.monitored_flights_v2') AS c`);
    if (exists.rows[0]?.c) {
      const rows = await queryRows(
        `SELECT id, created_at, raw_api_data, raw_api_sha256
           FROM clean.monitored_flights_v2
          WHERE raw_expired_at_utc IS NULL AND created_at IS NOT NULL AND created_at <= $1::timestamptz AND raw_api_data IS NOT NULL
          ORDER BY created_at, id LIMIT $2`,
        [rawCutoff, room()],
      );
      for (const r of rows) {
        const age = utc(r.created_at);
        out.push({ sourceTable: "clean.monitored_flights_v2", recordId: `monitored_flights_v2:${r.id}:raw_api_data`, contentClass: "legacy_provider_raw", contentColumns: ["raw_api_data"], ageTimestampUtc: age, expiresAtUtc: expiryFromAgeHours(age, policy.rawProviderHours), retentionHours: policy.rawProviderHours, contentHash: sha256(r.raw_api_data), payloadHash: r.raw_api_sha256 || undefined, kind: "monitored_flights_v2", key: Number(r.id) });
      }
    }
  }

  return out
    .sort((a, b) => a.expiresAtUtc.localeCompare(b.expiresAtUtc) || a.recordId.localeCompare(b.recordId))
    .slice(0, limit);
}

async function insertTombstone(client: PoolClient, c: RetentionExpiryCandidate, runId: string, pHash: string): Promise<void> {
  const inserted = await client.query(
    `INSERT INTO clean.retention_tombstone
       (surface, record_id, content_hash, expired_at, plan_hash, content_class, source_table, content_columns, retention_rule, expiry_run_id, deletion_mode)
     VALUES ('primary',$1,$2,$3::timestamptz,$4,$5,$6,$7::text[],$8,$9,'content-nullification')
     ON CONFLICT (surface,record_id) DO NOTHING
     RETURNING content_hash`,
    [c.recordId, c.contentHash, c.expiresAtUtc, pHash, c.contentClass, c.sourceTable, c.contentColumns, `max-${c.retentionHours}h/provider-content`, runId],
  );
  if (inserted.rowCount === 0) {
    const existing = await client.query(`SELECT content_hash FROM clean.retention_tombstone WHERE surface='primary' AND record_id=$1`, [c.recordId]);
    if (existing.rows[0]?.content_hash !== c.contentHash) throw new Error(`TOMBSTONE_HASH_CONFLICT:${c.recordId}`);
  }
}

async function expireOne(client: PoolClient, c: RetentionExpiryCandidate, runId: string, pHash: string): Promise<void> {
  await insertTombstone(client, c, runId, pHash);
  let r;
  if (c.kind === "raw_delivery") {
    r = await client.query(`UPDATE clean.raw_delivery SET raw_body=NULL,http_request_headers=NULL,http_response_body=NULL,http_path=NULL,error_message=NULL,raw_expired_at_utc=now() WHERE id=$1 AND raw_expired_at_utc IS NULL`, [c.key]);
  } else if (c.kind === "raw_delivery_item") {
    r = await client.query(`UPDATE clean.raw_delivery_item SET raw_item=NULL,raw_expired_at_utc=now() WHERE id=$1 AND raw_expired_at_utc IS NULL`, [c.key]);
  } else if (c.kind === "adb_ingest_events") {
    r = await client.query(`UPDATE clean.adb_ingest_events SET raw_payload=NULL,http_metadata=NULL,error=NULL,raw_expired_at_utc=now() WHERE id=$1 AND raw_expired_at_utc IS NULL`, [c.key]);
  } else if (c.kind === "flight_data_pre_post") {
    r = await client.query(`UPDATE clean.flight_data_pre_post SET payload_sha256=COALESCE(payload_sha256,$2),payload_json=NULL,subscription_notices=NULL,raw_expired_at_utc=now() WHERE id=$1 AND raw_expired_at_utc IS NULL`, [c.key, c.payloadHash ?? c.contentHash]);
  } else if (c.kind === "fids_query_response") {
    r = await client.query(`UPDATE clean.fids_query_response SET raw_payload=NULL,raw_expired_at_utc=now() WHERE population_query_id=$1::uuid AND raw_expired_at_utc IS NULL`, [c.key]);
  } else {
    r = await client.query(`UPDATE clean.monitored_flights_v2 SET raw_api_sha256=COALESCE(raw_api_sha256,$2),raw_api_data=NULL,raw_expired_at_utc=now() WHERE id=$1 AND raw_expired_at_utc IS NULL`, [c.key, c.payloadHash ?? c.contentHash]);
  }
  if (r.rowCount !== 1) throw new Error(`RETENTION_ROW_CHANGED_OR_MISSING:${c.recordId}`);
}

async function openDeletionIncident(detail: Record<string, unknown>): Promise<void> {
  try {
    await v39Pool.query(`INSERT INTO clean.adb_incident_stop(cause,detail,resolved) VALUES ('deletion',$1::jsonb,false)`, [JSON.stringify(detail)]);
  } catch (err) {
    console.error(`[v39-retention] failed to persist deletion incident: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function runRetentionExpiry(opts: {
  apply?: boolean;
  now?: Date;
  retentionDays?: number;
  rawRetentionHours?: number;
  fidsRetentionHours?: number;
  limit?: number;
} = {}): Promise<RetentionExpiryResult> {
  const apply = Boolean(opts.apply);
  const now = opts.now ?? new Date();
  const envPolicy = resolveRetentionPrimaryPolicy();
  const policy: RetentionPrimaryPolicy = {
    rawProviderHours: opts.rawRetentionHours != null
      ? validateRetentionHours(opts.rawRetentionHours, HARD_RETENTION_LIMIT_HOURS.raw_provider_content, "rawRetentionHours")
      : opts.retentionDays != null
        ? validateRetentionDays(opts.retentionDays) * 24
        : envPolicy.rawProviderHours,
    liveFidsHours: opts.fidsRetentionHours != null
      ? validateRetentionHours(opts.fidsRetentionHours, HARD_RETENTION_LIMIT_HOURS.live_fids_cache, "fidsRetentionHours")
      : envPolicy.liveFidsHours,
  };
  const limit = opts.limit ?? DEFAULT_EXPIRY_BATCH_LIMIT;
  if (apply) assertApplyEvidence(policy);
  const candidates = await collectRetentionExpiryCandidates(now, policy, limit);
  const runId = `RETEXP-${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  let expiredCount = 0;
  if (apply && candidates.length) {
    const client = await v39Pool.connect();
    try {
      await client.query("BEGIN");
      const pHash = planHash();
      for (const candidate of candidates) {
        await expireOne(client, candidate, runId, pHash);
        expiredCount += 1;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      await openDeletionIncident({ runId, error: err instanceof Error ? err.message : String(err), candidate_count: candidates.length });
      throw err;
    } finally {
      client.release();
    }
  }

  const rawCutoffUtc = new Date(now.getTime() - policy.rawProviderHours * 3_600_000).toISOString();
  const fidsCutoffUtc = new Date(now.getTime() - policy.liveFidsHours * 3_600_000).toISOString();
  const resultBase = {
    mode: apply ? "APPLY" as const : "DRY_RUN" as const,
    runId,
    cutoffUtc: rawCutoffUtc,
    fidsCutoffUtc,
    retentionDays: policy.rawProviderHours / 24,
    retentionHours: policy,
    candidates,
    expiredCount,
  };
  return { ...resultBase, evidenceHash: sha256(resultBase) };
}
