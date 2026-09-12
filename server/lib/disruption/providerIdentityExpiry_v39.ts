import { createHash, randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { PoolClient } from "pg";
import { v39Pool } from "./db_v39";
import type { RetentionPrimaryPolicy } from "./retentionExpiry_v39";

export type ProviderIdentityExpiryKind = "schedule_version" | "resolution" | "flight_identity";

export interface ProviderIdentityExpiryCandidate {
  sourceTable:
    | "clean.webhook_flight_schedule_version"
    | "clean.webhook_identity_resolution"
    | "clean.webhook_flight_identity";
  recordId: string;
  contentClass: "webhook_identity_schedule";
  contentColumns: string[];
  ageTimestampUtc: string;
  expiresAtUtc: string;
  retentionHours: number;
  contentHash: string;
  kind: ProviderIdentityExpiryKind;
  key: number;
}

function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

function planHash(): string {
  const file = path.resolve(process.cwd(), "SEPmd", "V3.9_DataCollectPlan_f.8.md");
  return sha256(readFileSync(file));
}

function utc(value: unknown): string {
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) throw new Error(`invalid provider-identity expiry timestamp: ${String(value)}`);
  return d.toISOString();
}

function expiresAt(age: string, hours: number): string {
  return new Date(new Date(age).getTime() + hours * 3_600_000).toISOString();
}

/**
 * Provider identity/schedule rows are operational linkage, not long-lived
 * research output. A schedule-version row expires from its observation time.
 * Resolution-ledger audit metadata is retained, but its copied leg ID/service
 * date is nulled after the same raw-provider clock. An identity row is eligible
 * only when the identity itself is old AND no schedule observation or
 * non-expired resolution for the same leg has occurred inside the retention
 * window. This prevents deleting actively used linkage merely because its first
 * creation timestamp is old.
 */
export async function collectProviderIdentityExpiryCandidates(
  now: Date,
  policy: RetentionPrimaryPolicy,
  limit: number,
): Promise<ProviderIdentityExpiryCandidate[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("provider-identity expiry limit must be 1..1000");
  const cutoff = new Date(now.getTime() - policy.rawProviderHours * 3_600_000).toISOString();
  const out: ProviderIdentityExpiryCandidate[] = [];
  const room = () => Math.max(0, limit - out.length);

  if (room()) {
    const result = await v39Pool.query(
      `SELECT schedule_version_pk, observed_at_utc, to_jsonb(s) AS row_json
         FROM clean.webhook_flight_schedule_version s
        WHERE observed_at_utc <= $1::timestamptz
        ORDER BY observed_at_utc, schedule_version_pk
        LIMIT $2`,
      [cutoff, room()],
    );
    for (const row of result.rows) {
      const ageTimestampUtc = utc(row.observed_at_utc);
      out.push({
        sourceTable: "clean.webhook_flight_schedule_version",
        recordId: `webhook_flight_schedule_version:${row.schedule_version_pk}:provider_row_v1`,
        contentClass: "webhook_identity_schedule",
        contentColumns: ["*entire-row*"],
        ageTimestampUtc,
        expiresAtUtc: expiresAt(ageTimestampUtc, policy.rawProviderHours),
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(row.row_json),
        kind: "schedule_version",
        key: Number(row.schedule_version_pk),
      });
    }
  }

  if (room()) {
    const result = await v39Pool.query(
      `SELECT resolution_id, resolved_at_utc, flight_instance_id, initial_service_date
         FROM clean.webhook_identity_resolution
        WHERE resolution_status='resolved'
          AND provider_identity_expired_at_utc IS NULL
          AND flight_instance_id IS NOT NULL
          AND initial_service_date IS NOT NULL
          AND resolved_at_utc <= $1::timestamptz
        ORDER BY resolved_at_utc, resolution_id
        LIMIT $2`,
      [cutoff, room()],
    );
    for (const row of result.rows) {
      const ageTimestampUtc = utc(row.resolved_at_utc);
      const content = {
        flight_instance_id: row.flight_instance_id,
        initial_service_date: row.initial_service_date,
      };
      out.push({
        sourceTable: "clean.webhook_identity_resolution",
        recordId: `webhook_identity_resolution:${row.resolution_id}:provider_identity_v1`,
        contentClass: "webhook_identity_schedule",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        expiresAtUtc: expiresAt(ageTimestampUtc, policy.rawProviderHours),
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        kind: "resolution",
        key: Number(row.resolution_id),
      });
    }
  }

  if (room()) {
    const result = await v39Pool.query(
      `SELECT i.id, i.created_at_utc, to_jsonb(i) AS row_json
         FROM clean.webhook_flight_identity i
        WHERE i.created_at_utc <= $1::timestamptz
          AND NOT EXISTS (
            SELECT 1
              FROM clean.webhook_flight_schedule_version s
             WHERE s.flight_instance_id=i.flight_instance_id
               AND s.observed_at_utc > $1::timestamptz
          )
          AND NOT EXISTS (
            SELECT 1
              FROM clean.webhook_identity_resolution r
             WHERE r.flight_instance_id=i.flight_instance_id
               AND r.provider_identity_expired_at_utc IS NULL
               AND r.resolved_at_utc > $1::timestamptz
          )
        ORDER BY i.created_at_utc, i.id
        LIMIT $2`,
      [cutoff, room()],
    );
    for (const row of result.rows) {
      const ageTimestampUtc = utc(row.created_at_utc);
      out.push({
        sourceTable: "clean.webhook_flight_identity",
        recordId: `webhook_flight_identity:${row.id}:provider_row_v1`,
        contentClass: "webhook_identity_schedule",
        contentColumns: ["*entire-row*"],
        ageTimestampUtc,
        expiresAtUtc: expiresAt(ageTimestampUtc, policy.rawProviderHours),
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(row.row_json),
        kind: "flight_identity",
        key: Number(row.id),
      });
    }
  }

  // Expire child/evidence rows before the parent-like identity row when expiry
  // timestamps tie. No FK requires this order, but it keeps lifecycle semantics
  // explicit and future-proof.
  const rank: Record<ProviderIdentityExpiryKind, number> = {
    schedule_version: 0,
    resolution: 1,
    flight_identity: 2,
  };
  return out.sort((a, b) =>
    a.expiresAtUtc.localeCompare(b.expiresAtUtc)
    || rank[a.kind] - rank[b.kind]
    || a.recordId.localeCompare(b.recordId),
  ).slice(0, limit);
}

async function insertTombstone(client: PoolClient, candidate: ProviderIdentityExpiryCandidate, runId: string, pHash: string): Promise<void> {
  const deletionMode = candidate.kind === "resolution" ? "content-nullification" : "hard-delete";
  const inserted = await client.query(
    `INSERT INTO clean.retention_tombstone
       (surface,record_id,content_hash,expired_at,plan_hash,content_class,source_table,content_columns,retention_rule,expiry_run_id,deletion_mode)
     VALUES ('primary',$1,$2,$3::timestamptz,$4,$5,$6,$7::text[],$8,$9,$10)
     ON CONFLICT (surface,record_id) DO NOTHING
     RETURNING content_hash`,
    [candidate.recordId, candidate.contentHash, candidate.expiresAtUtc, pHash, candidate.contentClass,
      candidate.sourceTable, candidate.contentColumns, `max-${candidate.retentionHours}h/provider-identity-content`, runId, deletionMode],
  );
  if (inserted.rowCount === 0) {
    const existing = await client.query(
      `SELECT content_hash FROM clean.retention_tombstone WHERE surface='primary' AND record_id=$1`,
      [candidate.recordId],
    );
    if (existing.rows[0]?.content_hash !== candidate.contentHash) {
      throw new Error(`TOMBSTONE_HASH_CONFLICT:${candidate.recordId}`);
    }
  }
}

async function openDeletionIncident(runId: string, error: unknown, candidateCount: number): Promise<void> {
  try {
    await v39Pool.query(
      `INSERT INTO clean.adb_incident_stop(cause,detail,resolved)
       VALUES ('deletion',$1::jsonb,false)`,
      [JSON.stringify({
        owner: "providerIdentityExpiry_v39",
        runId,
        error: error instanceof Error ? error.message : String(error),
        candidate_count: candidateCount,
      })],
    );
  } catch (incidentError) {
    console.error(`[v39-retention-identity] failed to persist deletion incident: ${incidentError instanceof Error ? incidentError.message : String(incidentError)}`);
  }
}

export async function applyProviderIdentityExpiryCandidates(
  candidates: readonly ProviderIdentityExpiryCandidate[],
): Promise<{ runId: string; expiredCount: number }> {
  const runId = `RETIDENT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  if (!candidates.length) return { runId, expiredCount: 0 };

  const client = await v39Pool.connect();
  let expiredCount = 0;
  try {
    await client.query("BEGIN");
    const pHash = planHash();
    for (const candidate of candidates) {
      await insertTombstone(client, candidate, runId, pHash);
      let result;
      if (candidate.kind === "schedule_version") {
        result = await client.query(
          `DELETE FROM clean.webhook_flight_schedule_version
            WHERE schedule_version_pk=$1 AND observed_at_utc <= $2::timestamptz`,
          [candidate.key, candidate.ageTimestampUtc],
        );
      } else if (candidate.kind === "resolution") {
        result = await client.query(
          `UPDATE clean.webhook_identity_resolution
              SET flight_instance_id=NULL,
                  initial_service_date=NULL,
                  provider_identity_expired_at_utc=now()
            WHERE resolution_id=$1
              AND resolution_status='resolved'
              AND provider_identity_expired_at_utc IS NULL
              AND flight_instance_id IS NOT NULL
              AND initial_service_date IS NOT NULL
              AND resolved_at_utc <= $2::timestamptz`,
          [candidate.key, candidate.ageTimestampUtc],
        );
      } else {
        result = await client.query(
          `DELETE FROM clean.webhook_flight_identity i
            WHERE i.id=$1
              AND NOT EXISTS (
                SELECT 1 FROM clean.webhook_flight_schedule_version s
                 WHERE s.flight_instance_id=i.flight_instance_id
                   AND s.observed_at_utc > $2::timestamptz
              )
              AND NOT EXISTS (
                SELECT 1 FROM clean.webhook_identity_resolution r
                 WHERE r.flight_instance_id=i.flight_instance_id
                   AND r.provider_identity_expired_at_utc IS NULL
                   AND r.resolved_at_utc > $2::timestamptz
              )`,
          [candidate.key, candidate.expiresAtUtc],
        );
      }
      if (result.rowCount !== 1) throw new Error(`RETENTION_ROW_CHANGED_OR_ACTIVE:${candidate.recordId}`);
      expiredCount += 1;
    }
    await client.query("COMMIT");
    return { runId, expiredCount };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await openDeletionIncident(runId, error, candidates.length);
    throw error;
  } finally {
    client.release();
  }
}
