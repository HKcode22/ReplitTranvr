import { randomUUID } from "crypto";
import { v39Pool as pool } from "./db_v39";
import { cleanupPrepaidProbeSessionV39 } from "./prepaidProbeRuntime_v39";

export interface ExpiredPrepaidProbeSessionV39 {
  sessionId: string;
  ownerKind: "phase2_safety_smoke" | "anchor_probe";
  expiresAtUtc: string;
}

export async function collectExpiredPrepaidProbeSessionsV39(
  now: Date,
  limit: number,
): Promise<ExpiredPrepaidProbeSessionV39[]> {
  if (!Number.isFinite(now.getTime())) throw new Error("PREPAID_SESSION_EXPIRY_NOW_INVALID");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("PREPAID_SESSION_EXPIRY_LIMIT_INVALID");
  const result = await pool.query(
    `SELECT session_id,owner_kind,expires_at_utc
       FROM clean.prepaid_probe_session_runtime
      WHERE expires_at_utc <= $1
      ORDER BY expires_at_utc,session_id
      LIMIT $2`,
    [now, limit],
  );
  return result.rows.map((row: any) => ({
    sessionId: String(row.session_id),
    ownerKind: String(row.owner_kind) as ExpiredPrepaidProbeSessionV39["ownerKind"],
    expiresAtUtc: new Date(row.expires_at_utc).toISOString(),
  }));
}

async function openDeletionIncident(candidate: ExpiredPrepaidProbeSessionV39, error: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('deletion',now(),$1::jsonb,false)`,
    [JSON.stringify({
      owner: "prepaidProbeExpiry_v39",
      sessionId: candidate.sessionId,
      ownerKind: candidate.ownerKind,
      errorType: error instanceof Error ? error.name : "unknown",
    })],
  ).catch(() => undefined);
}

/**
 * Expired prepaid sessions are purpose-complete by definition. Cleanup uses
 * the same verified early-delete path as normal completion: provider blobs are
 * deleted and verified absent before UNLOGGED normalized rows are removed.
 */
export async function applyExpiredPrepaidProbeSessionsV39(
  candidates: readonly ExpiredPrepaidProbeSessionV39[],
): Promise<{ runId: string; expiredCount: number }> {
  const runId = `prepaid-session-expiry-${randomUUID()}`;
  let expiredCount = 0;
  for (const candidate of candidates) {
    try {
      await cleanupPrepaidProbeSessionV39(candidate.sessionId, `${runId}:${candidate.sessionId}`);
      expiredCount += 1;
    } catch (error) {
      await openDeletionIncident(candidate, error);
      throw error;
    }
  }
  return { runId, expiredCount };
}
