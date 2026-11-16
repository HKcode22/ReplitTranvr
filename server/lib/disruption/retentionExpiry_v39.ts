import { createHash, randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { Pool, PoolClient } from "pg";
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
  kind:
    | "raw_delivery"
    | "raw_delivery_item"
    | "processing_attempt"
    | "adb_ingest_events"
    | "webhook_identity_resolution"
    | "flight_data_pre_post"
    | "fids_query_response"
    | "monitored_flights_v2";
  key: string | number;
}

export interface RetentionExpiryResult {
  mode: "DRY_RUN" | "APPLY";
  runId: string;
  cutoffUtc: string;
  fidsCutoffUtc: string;
  retentionDays: number;
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
  // Binding f.8 was relocated; keep the original digest convention.
  const file = path.resolve(process.cwd(), "data-collection", "plans", "V3.9_DataCollectPlan_f.8.md");
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
  if (process.env.V39_RETENTION_APPLY_ARMED !== "1") throw new Error("V39_RETENTION_APPLY_ARMED_REQUIRED");

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
  return (await v39Pool.query(sql, params)).rows;
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

function candidate(input: Omit<RetentionExpiryCandidate, "expiresAtUtc">): RetentionExpiryCandidate {
  return { ...input, expiresAtUtc: expiryFromAgeHours(input.ageTimestampUtc, input.retentionHours) };
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
      `SELECT id, received_at_utc, raw_body, raw_body_sha256,
              http_request_headers, http_response_body, http_path, error_message,
              subscription_id, provider_published_utc, adb_delivery_id, adb_cost_credits,
              notification_id, provider_notification_generated_utc,
              delivery_attempt_seq_no, delivery_attempt_utc, delivery_attempt_cost_credits
         FROM clean.raw_delivery
        WHERE provider_content_expired_at_utc IS NULL
          AND received_at_utc <= $1::timestamptz
          AND (raw_body IS NOT NULL OR http_request_headers IS NOT NULL OR http_response_body IS NOT NULL
               OR http_path IS NOT NULL OR error_message IS NOT NULL OR subscription_id IS NOT NULL
               OR provider_published_utc IS NOT NULL OR adb_delivery_id IS NOT NULL OR adb_cost_credits IS NOT NULL
               OR notification_id IS NOT NULL OR provider_notification_generated_utc IS NOT NULL
               OR delivery_attempt_seq_no IS NOT NULL OR delivery_attempt_utc IS NOT NULL
               OR delivery_attempt_cost_credits IS NOT NULL)
        ORDER BY received_at_utc, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.received_at_utc);
      const content = {
        raw_body: r.raw_body,
        http_request_headers: r.http_request_headers,
        http_response_body: r.http_response_body,
        http_path: r.http_path,
        error_message: r.error_message,
        subscription_id: r.subscription_id,
        provider_published_utc: r.provider_published_utc,
        adb_delivery_id: r.adb_delivery_id,
        adb_cost_credits: r.adb_cost_credits,
        notification_id: r.notification_id,
        provider_notification_generated_utc: r.provider_notification_generated_utc,
        delivery_attempt_seq_no: r.delivery_attempt_seq_no,
        delivery_attempt_utc: r.delivery_attempt_utc,
        delivery_attempt_cost_credits: r.delivery_attempt_cost_credits,
      };
      out.push(candidate({
        sourceTable: "clean.raw_delivery",
        recordId: `raw_delivery:${r.id}:full_provider_scope_v3`,
        contentClass: "webhook_ingress",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        payloadHash: r.raw_body_sha256 || undefined,
        kind: "raw_delivery",
        key: Number(r.id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, created_at, raw_item, raw_item_sha256,
              flight_number, carrier_iata, carrier_icao, status, status_code,
              last_updated_utc, departure_scheduled_utc, arrival_scheduled_utc,
              canonical_flight_instance_id
         FROM clean.raw_delivery_item
        WHERE provider_content_expired_at_utc IS NULL
          AND created_at <= $1::timestamptz
          AND (raw_item IS NOT NULL OR flight_number IS NOT NULL OR carrier_iata IS NOT NULL OR carrier_icao IS NOT NULL
               OR status IS NOT NULL OR status_code IS NOT NULL OR last_updated_utc IS NOT NULL
               OR departure_scheduled_utc IS NOT NULL OR arrival_scheduled_utc IS NOT NULL
               OR canonical_flight_instance_id IS NOT NULL)
        ORDER BY created_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.created_at);
      const content = {
        raw_item: r.raw_item,
        flight_number: r.flight_number,
        carrier_iata: r.carrier_iata,
        carrier_icao: r.carrier_icao,
        status: r.status,
        status_code: r.status_code,
        last_updated_utc: r.last_updated_utc,
        departure_scheduled_utc: r.departure_scheduled_utc,
        arrival_scheduled_utc: r.arrival_scheduled_utc,
        canonical_flight_instance_id: r.canonical_flight_instance_id,
      };
      out.push(candidate({
        sourceTable: "clean.raw_delivery_item",
        recordId: `raw_delivery_item:${r.id}:full_provider_scope_v3`,
        contentClass: "webhook_ingress",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        payloadHash: r.raw_item_sha256 || undefined,
        kind: "raw_delivery_item",
        key: Number(r.id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, created_at, validation_errors, parse_errors, storage_errors, error_message
         FROM clean.processing_attempt
        WHERE provider_content_expired_at_utc IS NULL
          AND created_at <= $1::timestamptz
          AND (validation_errors IS NOT NULL OR parse_errors IS NOT NULL OR storage_errors IS NOT NULL OR error_message IS NOT NULL)
        ORDER BY created_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.created_at);
      const content = {
        validation_errors: r.validation_errors,
        parse_errors: r.parse_errors,
        storage_errors: r.storage_errors,
        error_message: r.error_message,
      };
      out.push(candidate({
        sourceTable: "clean.processing_attempt",
        recordId: `processing_attempt:${r.id}:provider_error_scope_v3`,
        contentClass: "webhook_ingress",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        kind: "processing_attempt",
        key: Number(r.id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, received_at, raw_payload, payload_sha256, http_metadata, error,
              provider_published_utc, subscription_id, credits_remaining
         FROM clean.adb_ingest_events
        WHERE provider_content_expired_at_utc IS NULL
          AND received_at <= $1::timestamptz
          AND (raw_payload IS NOT NULL OR http_metadata IS NOT NULL OR error IS NOT NULL
               OR provider_published_utc IS NOT NULL OR subscription_id IS NOT NULL OR credits_remaining IS NOT NULL)
        ORDER BY received_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.received_at);
      const content = {
        raw_payload: r.raw_payload,
        http_metadata: r.http_metadata,
        error: r.error,
        provider_published_utc: r.provider_published_utc,
        subscription_id: r.subscription_id,
        credits_remaining: r.credits_remaining,
      };
      out.push(candidate({
        sourceTable: "clean.adb_ingest_events",
        recordId: `adb_ingest_events:${r.id}:full_provider_scope_v3`,
        contentClass: "webhook_ingest_ledger_mixed",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        payloadHash: r.payload_sha256 || undefined,
        kind: "adb_ingest_events",
        key: Number(r.id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT resolution_id, resolved_at_utc, flight_instance_id, initial_service_date
         FROM clean.webhook_identity_resolution
        WHERE resolution_status='resolved'
          AND provider_identity_expired_at_utc IS NULL
          AND resolved_at_utc <= $1::timestamptz
          AND (flight_instance_id IS NOT NULL OR initial_service_date IS NOT NULL)
        ORDER BY resolved_at_utc, resolution_id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.resolved_at_utc);
      const content = {
        flight_instance_id: r.flight_instance_id,
        initial_service_date: r.initial_service_date,
      };
      out.push(candidate({
        sourceTable: "clean.webhook_identity_resolution",
        recordId: `webhook_identity_resolution:${r.resolution_id}:provider_identity_scope_v1`,
        contentClass: "webhook_identity_schedule",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        kind: "webhook_identity_resolution",
        key: Number(r.resolution_id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT id, received_at, payload_sha256, to_jsonb(f) AS row_json
         FROM clean.flight_data_pre_post f
        WHERE received_at <= $1::timestamptz
        ORDER BY received_at, id LIMIT $2`,
      [rawCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.received_at);
      out.push(candidate({
        sourceTable: "clean.flight_data_pre_post",
        recordId: `flight_data_pre_post:${r.id}:provider_row_v3`,
        contentClass: "latest_state_convenience",
        contentColumns: ["*entire-row*"],
        ageTimestampUtc,
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(r.row_json),
        payloadHash: r.payload_sha256 || undefined,
        kind: "flight_data_pre_post",
        key: Number(r.id),
      }));
    }
  }

  if (room()) {
    const rows = await queryRows(
      `SELECT population_query_id, raw_persisted_at_utc, raw_payload, response_hash
         FROM clean.fids_query_response
        WHERE raw_expired_at_utc IS NULL
          AND raw_persisted_at_utc <= $1::timestamptz
          AND raw_payload IS NOT NULL
        ORDER BY raw_persisted_at_utc, population_query_id LIMIT $2`,
      [fidsCutoff, room()],
    );
    for (const r of rows) {
      const ageTimestampUtc = utc(r.raw_persisted_at_utc);
      out.push(candidate({
        sourceTable: "clean.fids_query_response",
        recordId: `fids_query_response:${r.population_query_id}:raw_payload`,
        contentClass: "fids_population",
        contentColumns: ["raw_payload"],
        ageTimestampUtc,
        retentionHours: policy.liveFidsHours,
        contentHash: sha256(r.raw_payload),
        payloadHash: r.response_hash || undefined,
        kind: "fids_query_response",
        key: String(r.population_query_id),
      }));
    }
  }

  if (room()) {
    const exists = await v39Pool.query(`SELECT to_regclass('clean.monitored_flights_v2') AS c`);
    if (exists.rows[0]?.c) {
      const rows = await queryRows(
        `SELECT id, created_at, raw_api_data, raw_api_sha256
           FROM clean.monitored_flights_v2
          WHERE raw_expired_at_utc IS NULL
            AND created_at IS NOT NULL
            AND created_at <= $1::timestamptz
            AND raw_api_data IS NOT NULL
          ORDER BY created_at, id LIMIT $2`,
        [rawCutoff, room()],
      );
      for (const r of rows) {
        const ageTimestampUtc = utc(r.created_at);
        out.push(candidate({
          sourceTable: "clean.monitored_flights_v2",
          recordId: `monitored_flights_v2:${r.id}:raw_api_data`,
          contentClass: "legacy_provider_raw",
          contentColumns: ["raw_api_data"],
          ageTimestampUtc,
          retentionHours: policy.rawProviderHours,
          contentHash: sha256(r.raw_api_data),
          payloadHash: r.raw_api_sha256 || undefined,
          kind: "monitored_flights_v2",
          key: Number(r.id),
        }));
      }
    }
  }

  return out
    .sort((a, b) => a.expiresAtUtc.localeCompare(b.expiresAtUtc) || a.recordId.localeCompare(b.recordId))
    .slice(0, limit);
}

async function insertTombstone(client: PoolClient, c: RetentionExpiryCandidate, runId: string, pHash: string): Promise<void> {
  const deletionMode = c.kind === "flight_data_pre_post" ? "hard-delete" : "content-nullification";
  const inserted = await client.query(
    `INSERT INTO clean.retention_tombstone
       (surface, record_id, content_hash, expired_at, plan_hash, content_class, source_table, content_columns, retention_rule, expiry_run_id, deletion_mode)
     VALUES ('primary',$1,$2,$3::timestamptz,$4,$5,$6,$7::text[],$8,$9,$10)
     ON CONFLICT (surface,record_id) DO NOTHING
     RETURNING content_hash`,
    [
      c.recordId,
      c.contentHash,
      c.expiresAtUtc,
      pHash,
      c.contentClass,
      c.sourceTable,
      c.contentColumns,
      `max-${c.retentionHours}h/provider-content`,
      runId,
      deletionMode,
    ],
  );
  if (inserted.rowCount === 0) {
    const existing = await client.query(
      `SELECT content_hash FROM clean.retention_tombstone WHERE surface='primary' AND record_id=$1`,
      [c.recordId],
    );
    if (existing.rows[0]?.content_hash !== c.contentHash) throw new Error(`TOMBSTONE_HASH_CONFLICT:${c.recordId}`);
  }
}

async function expireOne(client: PoolClient, c: RetentionExpiryCandidate, runId: string, pHash: string): Promise<void> {
  await insertTombstone(client, c, runId, pHash);
  let r;
  if (c.kind === "raw_delivery") {
    r = await client.query(
      `UPDATE clean.raw_delivery
          SET raw_body=NULL,
              http_request_headers=NULL,
              http_response_body=NULL,
              http_path=NULL,
              error_message=NULL,
              subscription_id=NULL,
              provider_published_utc=NULL,
              adb_delivery_id=NULL,
              adb_cost_credits=NULL,
              notification_id=NULL,
              provider_notification_generated_utc=NULL,
              delivery_attempt_seq_no=NULL,
              delivery_attempt_utc=NULL,
              delivery_attempt_cost_credits=NULL,
              raw_expired_at_utc=COALESCE(raw_expired_at_utc,now()),
              provider_content_expired_at_utc=now()
        WHERE id=$1 AND provider_content_expired_at_utc IS NULL`,
      [c.key],
    );
  } else if (c.kind === "raw_delivery_item") {
    r = await client.query(
      `UPDATE clean.raw_delivery_item
          SET raw_item=NULL,
              flight_number=NULL,
              carrier_iata=NULL,
              carrier_icao=NULL,
              status=NULL,
              status_code=NULL,
              last_updated_utc=NULL,
              departure_scheduled_utc=NULL,
              arrival_scheduled_utc=NULL,
              canonical_flight_instance_id=NULL,
              raw_expired_at_utc=COALESCE(raw_expired_at_utc,now()),
              provider_content_expired_at_utc=now()
        WHERE id=$1 AND provider_content_expired_at_utc IS NULL`,
      [c.key],
    );
  } else if (c.kind === "processing_attempt") {
    r = await client.query(
      `UPDATE clean.processing_attempt
          SET validation_errors=NULL,
              parse_errors=NULL,
              storage_errors=NULL,
              error_message=NULL,
              provider_content_expired_at_utc=now()
        WHERE id=$1 AND provider_content_expired_at_utc IS NULL`,
      [c.key],
    );
  } else if (c.kind === "adb_ingest_events") {
    r = await client.query(
      `UPDATE clean.adb_ingest_events
          SET raw_payload=NULL,
              http_metadata=NULL,
              error=NULL,
              provider_published_utc=NULL,
              subscription_id=NULL,
              credits_remaining=NULL,
              raw_expired_at_utc=COALESCE(raw_expired_at_utc,now()),
              provider_content_expired_at_utc=now()
        WHERE id=$1 AND provider_content_expired_at_utc IS NULL`,
      [c.key],
    );
  } else if (c.kind === "webhook_identity_resolution") {
    r = await client.query(
      `UPDATE clean.webhook_identity_resolution
          SET flight_instance_id=NULL,
              initial_service_date=NULL,
              provider_identity_expired_at_utc=now()
        WHERE resolution_id=$1
          AND resolution_status='resolved'
          AND provider_identity_expired_at_utc IS NULL`,
      [c.key],
    );
  } else if (c.kind === "flight_data_pre_post") {
    r = await client.query(`DELETE FROM clean.flight_data_pre_post WHERE id=$1`, [c.key]);
  } else if (c.kind === "fids_query_response") {
    r = await client.query(
      `UPDATE clean.fids_query_response
          SET raw_payload=NULL,raw_expired_at_utc=now()
        WHERE population_query_id=$1::uuid AND raw_expired_at_utc IS NULL`,
      [c.key],
    );
  } else {
    r = await client.query(
      `UPDATE clean.monitored_flights_v2
          SET raw_api_sha256=COALESCE(raw_api_sha256,$2),raw_api_data=NULL,raw_expired_at_utc=now()
        WHERE id=$1 AND raw_expired_at_utc IS NULL`,
      [c.key, c.payloadHash ?? c.contentHash],
    );
  }
  if (r.rowCount !== 1) throw new Error(`RETENTION_ROW_CHANGED_OR_MISSING:${c.recordId}`);
}

async function openDeletionIncident(detail: Record<string, unknown>): Promise<void> {
  try {
    await v39Pool.query(
      `INSERT INTO clean.adb_incident_stop(cause,detail,resolved) VALUES ('deletion',$1::jsonb,false)`,
      [JSON.stringify(detail)],
    );
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
      for (const c of candidates) {
        await expireOne(client, c, runId, pHash);
        expiredCount += 1;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      await openDeletionIncident({
        runId,
        error: err instanceof Error ? err.message : String(err),
        candidate_count: candidates.length,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  const cutoffUtc = new Date(now.getTime() - policy.rawProviderHours * 3_600_000).toISOString();
  const fidsCutoffUtc = new Date(now.getTime() - policy.liveFidsHours * 3_600_000).toISOString();
  const resultBase = {
    mode: apply ? "APPLY" as const : "DRY_RUN" as const,
    runId,
    cutoffUtc,
    fidsCutoffUtc,
    retentionDays: policy.rawProviderHours / 24,
    retentionHours: policy,
    candidates,
    expiredCount,
  };
  return { ...resultBase, evidenceHash: sha256(resultBase) };
}

/** Narrow historical FIDS remediation only.
 * This reuses expireOne and the installed B0062 trigger. The generic
 * runRetentionExpiry APPLY gate above is unchanged. A reviewed overdue
 * primary cleanup is NOT a declaration that the deployment or paid data
 * retention is compliant. No other provider class is mutable here.
 */
export const P5_HISTORICAL_FIDS_EXPIRY_APPROVAL =
  "CLEAR_EXACT_REVIEWED_OVERDUE_FIDS_PRIMARY_CONTENT_ONLY_NO_GO";
const P5_CLEARED_CHILD_FIELDS=[
  "flight_number","carrier_iata","carrier_icao","call_sign","dep_airport_icao","dep_airport_iata",
  "arr_airport_icao","arr_airport_iata","dep_scheduled_utc","arr_scheduled_utc","provider_record_key",
  "raw_payload_sha256","coverage_state","population_query_id","from_local","to_local","airport_iana_timezone",
  "scope_classification","codeshare_resolution_status","fids_retrieval_utc","available_at","response_hash",
  "canonical_flight_instance_id","analytic_identity_id","provider_api_version",
] as const;
const P5_KEEP_EXCLUDE=[...P5_CLEARED_CHILD_FIELDS,"provider_content_expired_at_utc"];
const P5_PARENT_EXCLUDE=["raw_payload","raw_expired_at_utc","response_hash"];
const p5Hold=(s:string):never=>{throw Error("HOLD_P5_HISTORICAL_FIDS_EXPIRY_"+s);};
const isSha=(x:unknown):x is string=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
type P5HistoricalScope={
  observedAtUtc:string;expectedOriginals:number;expectedPopulation:number;
  expectedPre:number;expectedT24:number;
};
export const P5_HISTORICAL_FIDS_SCOPE_20261116=Object.freeze({
  observedAtUtc:"2026-11-16T13:47:34.388Z",expectedOriginals:17,expectedPopulation:1574,expectedPre:36,expectedT24:12,
});
const p5DisposableFixture=()=>process.env.GITHUB_ACTIONS==="true"&&process.env.V39_P5_HISTORICAL_FIDS_DISPOSABLE_PG16==="1"&&
 process.env.DATABASE_URL==="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
type P5HistoricalParent={id:string;age:string;full_sha:string;keep_sha:string;response_hash:string|null};
type P5HistoricalChild={id:string;parent_id:string;full_sha:string;keep_sha:string;member_sha:string;unexpired:boolean;is_fids:boolean};
const p5ParentKeep="encode(sha256(convert_to((to_jsonb(r)-$2::text[])::text,'UTF8')),'hex')";
const p5ChildKeep="encode(sha256(convert_to((to_jsonb(p)-$2::text[])::text,'UTF8')),'hex')";
const p5MemberSha="CASE WHEN m.population_member_id IS NULL THEN NULL ELSE encode(sha256(convert_to(to_jsonb(m)::text,'UTF8')),'hex') END";
const p5Full=(alias:"r"|"p")=>"encode(sha256(convert_to(to_jsonb("+alias+")::text,'UTF8')),'hex')";
const P5_STOP_TABLES="clean.adb_phase6_authorization, clean.adb_collection_batches, clean.adb_collection_segments, clean.adb_anchor_probe, clean.phase5_cd_pre_task_v39, clean.phase5_fids_original_binding_v39";
const P5_PRE_COUNTS="SELECT count(*)::int AS pre,count(*) FILTER(WHERE horizon='T-24h')::int AS t24 FROM clean.flight_snapshots WHERE prediction_state='PRE_DEPARTURE'";
function p5Scope(s:P5HistoricalScope){
  if(!s||typeof s.observedAtUtc!=="string"||!Number.isFinite(Date.parse(s.observedAtUtc))||
     new Date(s.observedAtUtc).toISOString()!==s.observedAtUtc||
     !Number.isSafeInteger(s.expectedOriginals)||s.expectedOriginals<1||s.expectedOriginals>50||
     !Number.isSafeInteger(s.expectedPopulation)||s.expectedPopulation<1||s.expectedPopulation>10000||
     !Number.isSafeInteger(s.expectedPre)||s.expectedPre<0||
     !Number.isSafeInteger(s.expectedT24)||s.expectedT24<0||s.expectedT24>s.expectedPre)
    p5Hold("INVALID_EXACT_SCOPE");
  if(sha256(s)!==sha256(P5_HISTORICAL_FIDS_SCOPE_20261116)&&!p5DisposableFixture())
    p5Hold("NOT_EXACT_NOV16_OWNER_SCOPE");
  return new Date(Date.parse(s.observedAtUtc)-24*3600000).toISOString();
}
async function p5Session(c:PoolClient,ro:boolean){
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  await c.query("SET LOCAL TIME ZONE 'UTC'");
  // Acquire the stopped-scope fence before the first SERIALIZABLE
  // snapshot, not after reading a potentially stale status snapshot.
  if(!ro)await c.query("LOCK TABLE "+P5_STOP_TABLES+", clean.fids_query_response, clean.flight_population, clean.population_research_membership, clean.flight_snapshots, clean.retention_tombstone IN SHARE ROW EXCLUSIVE MODE");
  const q=await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,current_setting('session_replication_role') repl,clock_timestamp() AS db_now");
  const a=q.rows[0];
  if(q.rowCount!==1||a.db!=="neondb"||a.actor!==a.login||a.ver<160000||a.ver>=170000||
     a.ro!==(ro?"on":"off")||a.replica!==false||a.repl!=="origin"||!Number.isFinite(new Date(a.db_now).getTime()))
    p5Hold("NOT_EXPECTED_PG16_PRIMARY_SESSION");
  return new Date(a.db_now).toISOString();
}
async function p5Stopped(c:PoolClient){
  const q=await c.query("SELECT "+
    "(SELECT count(*) FROM clean.adb_phase6_authorization WHERE enabled=true AND revoked_at_utc IS NULL)::int AS auth,"+
    "(SELECT count(*) FROM clean.adb_collection_batches WHERE upper(status) IN ('ACTIVE','SETTLING'))::int AS batches,"+
    "(SELECT count(*) FROM clean.adb_collection_segments WHERE status='ACTIVE')::int AS segments,"+
    "(SELECT count(*) FROM clean.adb_anchor_probe WHERE status IN ('probing','settling'))::int AS probes,"+
    "(SELECT count(*) FROM clean.phase5_cd_pre_task_v39 WHERE state IN ('READY','CLAIMED','WRITE_STARTED_UNKNOWN'))::int AS tasks,"+
    "(SELECT count(*) FROM clean.phase5_fids_original_binding_v39)::int AS phase5_bindings");
  if(q.rowCount!==1||Object.values(q.rows[0]).some(n=>n!==0))p5Hold("NOT_STOPPED_HISTORICAL_ONLY");
}
async function p5ReadScope(c:PoolClient,s:P5HistoricalScope,cutoff:string){
  const parent=await c.query<P5HistoricalParent>(
    "SELECT r.population_query_id::text AS id,r.raw_persisted_at_utc::text AS age,"+
    p5Full("r")+" AS full_sha,"+p5ParentKeep+" AS keep_sha,r.response_hash "+
    "FROM clean.fids_query_response r WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL "+
    "AND r.raw_persisted_at_utc<=$1::timestamptz ORDER BY r.population_query_id LIMIT "+(s.expectedOriginals+1),
    [cutoff,P5_PARENT_EXCLUDE]);
  if(parent.rows.length!==s.expectedOriginals||parent.rows.some(x=>!isSha(x.full_sha)||!isSha(x.keep_sha)))p5Hold("SOURCE_COUNT_OR_IDENTITY_DRIFT");
  const ids=parent.rows.map(x=>x.id);
  const children=await c.query<P5HistoricalChild>(
    "SELECT p.id::text AS id,p.population_query_id::text AS parent_id,"+p5Full("p")+" AS full_sha,"+p5ChildKeep+" AS keep_sha,"+
    p5MemberSha+" AS member_sha,p.provider_content_expired_at_utc IS NULL AS unexpired,p.source_type='fids' AS is_fids "+
    "FROM clean.flight_population p LEFT JOIN clean.population_research_membership m ON m.population_member_id=p.population_member_id "+
    "WHERE p.population_query_id=ANY($1::uuid[]) ORDER BY p.id LIMIT "+(s.expectedPopulation+1),
    [ids,P5_KEEP_EXCLUDE]);
  if(children.rows.length!==s.expectedPopulation||children.rows.some(x=>!x.unexpired||!x.is_fids||
      !isSha(x.full_sha)||!isSha(x.keep_sha)||!isSha(x.member_sha)))p5Hold("POPULATION_OR_MEMBERSHIP_DRIFT");
  const pre=(await c.query(P5_PRE_COUNTS)).rows[0];
  if(pre?.pre!==s.expectedPre||pre?.t24!==s.expectedT24)p5Hold("PRE_COUNT_DRIFT");
  const records=[...parent.rows.map(p=>"fids_query_response:"+p.id+":raw_payload"),
    ...children.rows.map(p=>"flight_population:"+p.id+":fids_provider_scope_v1")];
  const prior=(await c.query("SELECT count(*)::int AS n FROM clean.retention_tombstone WHERE surface='primary' AND record_id=ANY($1::text[])",[records])).rows[0];
  if(prior?.n!==0)p5Hold("EXISTING_TOMBSTONE_NO_REPLAY");
  const pHash=planHash();
  const scopeSha256=sha256({schema:"v39.phase5.historical-fids-primary-expiry-scope.v1",s,cutoff,pHash,parent:parent.rows,children:children.rows});
  return {parent:parent.rows,children:children.rows,records,pHash,scopeSha256};
}
type P5ReadScope=Awaited<ReturnType<typeof p5ReadScope>>;
async function p5VerifyCleared(c:PoolClient,s:P5HistoricalScope,x:P5ReadScope,runId:string){
  const a=await c.query("SELECT r.population_query_id::text AS id,"+p5ParentKeep+" AS keep_sha, (r.raw_payload IS NULL AND r.response_hash IS NULL AND r.raw_expired_at_utc IS NOT NULL) AS cleared FROM clean.fids_query_response r WHERE r.population_query_id=ANY($1::uuid[])",
    [x.parent.map(p=>p.id), P5_PARENT_EXCLUDE]);
  const b=await c.query("SELECT p.id::text AS id,"+p5ChildKeep+" AS keep_sha,"+p5MemberSha+" AS member_sha,(p.provider_content_expired_at_utc IS NOT NULL AND "+P5_CLEARED_CHILD_FIELDS.map(k=>"p."+k+" IS NULL").join(" AND ")+") AS cleared "+
    "FROM clean.flight_population p LEFT JOIN clean.population_research_membership m ON m.population_member_id=p.population_member_id "+
    "WHERE p.id=ANY($1::bigint[])",[x.children.map(p=>p.id),P5_KEEP_EXCLUDE]);
  const am=new Map(a.rows.map(q=>[q.id,q])),bm=new Map(b.rows.map(q=>[q.id,q]));
  if(a.rows.length!==x.parent.length||b.rows.length!==x.children.length||
    x.parent.some(p=>am.get(p.id)?.cleared!==true||am.get(p.id)?.keep_sha!==p.keep_sha)||
    x.children.some(p=>bm.get(p.id)?.cleared!==true||bm.get(p.id)?.keep_sha!==p.keep_sha||bm.get(p.id)?.member_sha!==p.member_sha))
    p5Hold("PRIMARY_CLEAR_OR_PRESERVED_METADATA_READBACK");
  const ts=await c.query("SELECT record_id,content_hash,source_table,content_class FROM clean.retention_tombstone "+
    "WHERE surface='primary' AND expiry_run_id=$1 AND plan_hash=$2 AND retention_rule='max-24h/provider-content' AND deletion_mode='content-nullification'",[runId,x.pHash]);
  const by=new Map(ts.rows.map(t=>[t.record_id,t]));
  if(ts.rows.length!==x.records.length||x.records.some(k=>!by.has(k)))p5Hold("TOMBSTONE_COUNT_OR_SCOPE_DRIFT");
  for(const p of x.parent){
    const t=by.get("fids_query_response:"+p.id+":raw_payload");
    if(!isSha(t?.content_hash)||t.source_table!=="clean.fids_query_response"||t.content_class!=="fids_population")p5Hold("PARENT_TOMBSTONE_DRIFT");
  }
  for(const p of x.children){
    const t=by.get("flight_population:"+p.id+":fids_provider_scope_v1"),parent=by.get("fids_query_response:"+p.parent_id+":raw_payload");
    if(!t||t.content_hash!==parent?.content_hash||t.source_table!=="clean.flight_population"||t.content_class!=="fids_population_normalized")p5Hold("CHILD_TOMBSTONE_DRIFT");
  }
  const pre=(await c.query(P5_PRE_COUNTS)).rows[0];
  if(pre?.pre!==s.expectedPre||pre?.t24!==s.expectedT24)p5Hold("PRE_COUNT_DRIFT_AFTER");
}
/** Exact reviewed owner-local repair. A separate connection verifies the
 * committed primary rows. Never retry an ambiguous COMMIT. */
export async function reviewOrExpireP5HistoricalFidsPrimary(pool:Pick<Pool,"connect">,s:P5HistoricalScope,
  action:{mode:"review"}|{mode:"apply";expectedScopeSha256:string;approval:string}){
  const cutoff=p5Scope(s),apply=action?.mode==="apply";
  if(!pool||typeof pool.connect!=="function"||(!apply&&action?.mode!=="review")||
    (apply&&(action.approval!==P5_HISTORICAL_FIDS_EXPIRY_APPROVAL||!isSha(action.expectedScopeSha256))))
    p5Hold("EXPLICIT_REMEDIATION_REVIEW_REQUIRED");
  let c=await pool.connect(),began=false,unknown=false,committed=false;
  try{
    await c.query(apply?"BEGIN ISOLATION LEVEL SERIALIZABLE":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
    const dbNow=await p5Session(c,!apply);
    if(Date.parse(dbNow)<Date.parse(s.observedAtUtc))p5Hold("OBSERVATION_NOT_YET_DUE");
    await p5Stopped(c);
    const x=await p5ReadScope(c,s,cutoff);
    const runId="RETEXP-P5-FIDS-"+x.scopeSha256;
    const summary={scopeSha256:x.scopeSha256,cutoffUtc:cutoff,originals:x.parent.length,population:x.children.length,
      preservedPre:s.expectedPre,preservedT24:s.expectedT24,runId,providerCalls:0,backupOrPitrVerified:false,accountRightsVerified:false,
      completeRetentionDeploymentVerified:false,phase6PaidGo:false};
    if(!apply){
      await c.query("ROLLBACK");began=false;
      return {status:"EXACT_HISTORICAL_FIDS_SCOPE_REVIEW_ONLY_NO_GO",...summary,databaseWrites:0};
    }
    if(x.scopeSha256!==action.expectedScopeSha256)p5Hold("REVIEW_SCOPE_HASH_DRIFT");
    for(const p of x.parent){
      // Original existing expiry tombstone convention: canonical payload
      // digest computed only in this owner process. No values in output.
      const v=await c.query("SELECT raw_payload FROM clean.fids_query_response WHERE population_query_id=$1::uuid AND raw_expired_at_utc IS NULL AND raw_persisted_at_utc<=$2::timestamptz",[p.id,cutoff]);
      if(v.rowCount!==1||v.rows[0].raw_payload==null)p5Hold("ORIGINAL_DRIFT");
      await expireOne(c,candidate({sourceTable:"clean.fids_query_response",recordId:"fids_query_response:"+p.id+":raw_payload",
        contentClass:"fids_population",contentColumns:["raw_payload"],ageTimestampUtc:utc(p.age),retentionHours:24,
        contentHash:sha256(v.rows[0].raw_payload),payloadHash:p.response_hash??undefined,kind:"fids_query_response",key:p.id}),runId,x.pHash);
    }
    await p5VerifyCleared(c,s,x,runId);
    unknown=true;await c.query("COMMIT");unknown=false;began=false;committed=true;
    c.release(true);
    // Fresh connection, new read-only transaction; not an independent actor.
    c=await pool.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
    await p5Session(c,true);await p5VerifyCleared(c,s,x,runId);
    await c.query("ROLLBACK");began=false;
    return {status:"HISTORICAL_FIDS_PRIMARY_CLEAR_COMMITTED_FRESH_READBACK_NO_GO",...summary,
      originalsCleared:x.parent.length,populationCleared:x.children.length,preservedProjectMembership:x.children.length,
      tombstones:x.records.length,freshConnectionReadback:true,independentActorVerified:false};
  }catch(e){
    if(unknown)p5Hold("COMMIT_UNKNOWN_READBACK_ONLY_NO_REPLAY");
    if(committed)p5Hold("COMMITTED_FRESH_READBACK_UNRESOLVED_NO_REPLAY");
    if(e instanceof Error&&/^HOLD_P5_HISTORICAL_FIDS_EXPIRY_[0-9A-Z_]+$/.test(e.message))throw e;
    const code=(e as {code?:unknown}|null)?.code;
    if(typeof code==="string"&&/^[0-9A-Z]{5}$/.test(code))p5Hold("SQLSTATE_"+code);
    p5Hold("SQL_OR_SCOPE_FAILURE_REDACTED");
  }finally{
    if(began&&!unknown)await c.query("ROLLBACK").catch(()=>undefined);
    // A release can already have occurred if the second connection failed.
    try{c.release(true);}catch{/* no replay */}
  }
}
