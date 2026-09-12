import { createHash, randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { v39Pool } from "./db_v39";
import type { RetentionPrimaryPolicy } from "./retentionExpiry_v39";

export type ProviderAccountExpiryKind = "collection_batch_account" | "anchor_probe_account";

export interface ProviderAccountExpiryCandidate {
  sourceTable: string;
  recordId: string;
  contentClass: "collection_batch_ledger_mixed" | "probe_ledger_mixed";
  contentColumns: string[];
  ageTimestampUtc: string;
  expiresAtUtc: string;
  retentionHours: number;
  contentHash: string;
  kind: ProviderAccountExpiryKind;
  key: string | number;
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

function utc(value: unknown): string {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error(`invalid provider-account expiry timestamp: ${String(value)}`);
  return date.toISOString();
}

function expiresAt(ageTimestampUtc: string, hours: number): string {
  return new Date(new Date(ageTimestampUtc).getTime() + hours * 3_600_000).toISOString();
}

export async function collectProviderAccountExpiryCandidates(
  now: Date,
  policy: RetentionPrimaryPolicy,
  limit: number,
): Promise<ProviderAccountExpiryCandidate[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("provider-account expiry limit must be 1..1000");
  const cutoff = new Date(now.getTime() - policy.rawProviderHours * 3_600_000).toISOString();
  const candidates: ProviderAccountExpiryCandidate[] = [];
  const room = () => Math.max(0, limit - candidates.length);

  if (room()) {
    const rows = await v39Pool.query(
      `SELECT batch_id, COALESCE(ended_at, window_end, started_at) AS age_at,
              balance_before, balance_after, credits_consumed_actual
         FROM clean.adb_collection_batches
        WHERE provider_account_expired_at_utc IS NULL
          AND COALESCE(ended_at, window_end, started_at) <= $1::timestamptz
          AND (balance_before IS NOT NULL OR balance_after IS NOT NULL OR credits_consumed_actual IS NOT NULL)
        ORDER BY COALESCE(ended_at, window_end, started_at), batch_id
        LIMIT $2`,
      [cutoff, room()],
    );
    for (const row of rows.rows) {
      const ageTimestampUtc = utc(row.age_at);
      const content = {
        balance_before: row.balance_before,
        balance_after: row.balance_after,
        credits_consumed_actual: row.credits_consumed_actual,
      };
      candidates.push({
        sourceTable: "clean.adb_collection_batches",
        recordId: `adb_collection_batches:${row.batch_id}:provider_account_scope_v1`,
        contentClass: "collection_batch_ledger_mixed",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        expiresAtUtc: expiresAt(ageTimestampUtc, policy.rawProviderHours),
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        kind: "collection_batch_account",
        key: String(row.batch_id),
      });
    }
  }

  if (room()) {
    const rows = await v39Pool.query(
      `SELECT probe_id, COALESCE(window_end, recorded_at, window_start) AS age_at,
              subscription_id, balance_before, balance_after
         FROM clean.adb_anchor_probe
        WHERE provider_account_expired_at_utc IS NULL
          AND COALESCE(window_end, recorded_at, window_start) <= $1::timestamptz
          AND (subscription_id IS NOT NULL OR balance_before IS NOT NULL OR balance_after IS NOT NULL)
        ORDER BY COALESCE(window_end, recorded_at, window_start), probe_id
        LIMIT $2`,
      [cutoff, room()],
    );
    for (const row of rows.rows) {
      const ageTimestampUtc = utc(row.age_at);
      const content = {
        subscription_id: row.subscription_id,
        balance_before: row.balance_before,
        balance_after: row.balance_after,
      };
      candidates.push({
        sourceTable: "clean.adb_anchor_probe",
        recordId: `adb_anchor_probe:${row.probe_id}:provider_account_scope_v1`,
        contentClass: "probe_ledger_mixed",
        contentColumns: Object.keys(content),
        ageTimestampUtc,
        expiresAtUtc: expiresAt(ageTimestampUtc, policy.rawProviderHours),
        retentionHours: policy.rawProviderHours,
        contentHash: sha256(content),
        kind: "anchor_probe_account",
        key: Number(row.probe_id),
      });
    }
  }

  return candidates
    .sort((a, b) => a.expiresAtUtc.localeCompare(b.expiresAtUtc) || a.recordId.localeCompare(b.recordId))
    .slice(0, limit);
}

async function insertTombstone(client: PoolClient, candidate: ProviderAccountExpiryCandidate, runId: string, planHash: string): Promise<void> {
  const inserted = await client.query(
    `INSERT INTO clean.retention_tombstone
       (surface,record_id,content_hash,expired_at,plan_hash,content_class,source_table,content_columns,retention_rule,expiry_run_id,deletion_mode)
     VALUES ('primary',$1,$2,$3::timestamptz,$4,$5,$6,$7::text[],$8,$9,'content-nullification')
     ON CONFLICT (surface,record_id) DO NOTHING
     RETURNING content_hash`,
    [candidate.recordId, candidate.contentHash, candidate.expiresAtUtc, planHash, candidate.contentClass,
      candidate.sourceTable, candidate.contentColumns, `max-${candidate.retentionHours}h/provider-account-content`, runId],
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

export async function applyProviderAccountExpiryCandidates(
  candidates: readonly ProviderAccountExpiryCandidate[],
  planHash: string,
): Promise<{ runId: string; expiredCount: number }> {
  const runId = `RETACCT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  if (!candidates.length) return { runId, expiredCount: 0 };

  const client = await v39Pool.connect();
  let expiredCount = 0;
  try {
    await client.query("BEGIN");
    for (const candidate of candidates) {
      await insertTombstone(client, candidate, runId, planHash);
      let result;
      if (candidate.kind === "collection_batch_account") {
        result = await client.query(
          `UPDATE clean.adb_collection_batches
              SET balance_before=NULL,
                  balance_after=NULL,
                  credits_consumed_actual=NULL,
                  provider_account_expired_at_utc=now()
            WHERE batch_id=$1 AND provider_account_expired_at_utc IS NULL`,
          [candidate.key],
        );
      } else {
        result = await client.query(
          `UPDATE clean.adb_anchor_probe
              SET subscription_id=NULL,
                  balance_before=NULL,
                  balance_after=NULL,
                  provider_account_expired_at_utc=now()
            WHERE probe_id=$1 AND provider_account_expired_at_utc IS NULL`,
          [candidate.key],
        );
      }
      if (result.rowCount !== 1) throw new Error(`RETENTION_ROW_CHANGED_OR_MISSING:${candidate.recordId}`);
      expiredCount += 1;
    }
    await client.query("COMMIT");
    return { runId, expiredCount };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
