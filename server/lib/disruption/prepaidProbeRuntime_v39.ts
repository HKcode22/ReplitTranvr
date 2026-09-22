import { createHash, randomUUID } from "crypto";
import { v39Pool as pool } from "./db_v39";
import {
  deleteProviderBlobAtExpiryV39,
  persistProviderBlobBeforeAckV39,
  type ProviderBlobRefV39,
} from "./providerBlobStore_v39";
import {
  createRequiredProviderBlobStoreV39,
  normalizeProviderBlobBucketIdV39,
} from "./replitProviderBlobStore_v39";
import { CODESHARE_CODE } from "./flightNotificationExtractor_v3";

export type PrepaidProbeOwnerKindV39 = "phase2_safety_smoke" | "anchor_probe";
export type PrepaidProbeSessionStateV39 = "armed" | "active" | "settling" | "completed" | "failed" | "abandoned";

export interface PrepaidProbeSessionV39 {
  sessionId: string;
  ownerKind: PrepaidProbeOwnerKindV39;
  ownerProbeId: number | null;
  stage: 1 | 2 | null;
  icao: string | null;
  state: PrepaidProbeSessionStateV39;
  expiresAtUtc: string;
}

export interface PrepaidProbeDeliveryEvidenceV39 {
  notificationId: string | null;
  notificationGeneratedUtc: Date | null;
  attemptSeqNo: number | null;
  attemptUtc: Date | null;
  costCredits: number | null;
}

export interface PrepaidProbeMetricsV39 {
  rowsDelivered: number;
  uniqueFlights: number;
  tailChainLinks: number;
  internalSendCredits: number;
  confirmedUniqueLower: number;
  confirmedPlusAmbiguousUpper: number;
  ambiguousUnknown: number;
  firstObservationMs: number[];
  deliveryCount: number;
  notificationItemsReceived: number;
  explicitCostDeliveryCount: number;
  fallbackDeliveryCount: number;
  costItemDisagreementCount: number;
  callbackRequestsSeen: number;
  callbackSuccess2xx: number;
  callbackFailures: number;
}

export type PrepaidProbeReconciliationEvidenceStatusV39 =
  | "MATCH"
  | "DELIVERY_GAP"
  | "MISMATCH"
  | "UNRESOLVED";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_RETENTION_ENV = "V39_PREPAID_RAW_RETENTION_HOURS";
const SESSION_MAX_HOURS = 24;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function dateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
}

function nonnegativeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function nonnegativeNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeCodeshareStatus(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return CODESHARE_CODE[value] ?? null;
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolvePrepaidRawRetentionHoursV39(
  env: NodeJS.ProcessEnv = process.env,
): number {
  // The V3.9 runtime registry defines 168h as the safe/default Phase-2
  // prepaid raw-provider retention when this optional override is absent.
  const raw = String(env[RAW_RETENTION_ENV] ?? "").trim();
  const value = raw === "" ? 168 : Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 168) {
    throw new Error(`${RAW_RETENTION_ENV}_MUST_BE_INTEGER_1_TO_168`);
  }
  return value;
}

/**
 * Validate every local persistence prerequisite before a paid provider
 * subscription may be created. Construction of the dedicated blob-store
 * client is non-provider-mutating and fails closed on bad mode/bucket config.
 */
export function assertPrepaidProbePersistenceConfigV39(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const retentionHours = resolvePrepaidRawRetentionHoursV39(env);
  const deferred = String(env.V39_DEFER_PROVIDER_CONTENT_CLEANUP ?? "").trim() === "1";

  if (deferred) {
    // GitHub Actions owns only provider exposure/control. Raw callback payloads
    // are written by the already-published Replit webhook receiver, and exact
    // session cleanup is performed later from the Replit workspace after the
    // provider subscription is verified inactive. Do not require Replit
    // object-storage credentials on the GitHub runner.
    const callbackBase = String(
      env.V39_PUBLIC_WEBHOOK_BASE_URL ?? env.WEBHOOK_BASE_URL ?? "",
    ).trim().replace(/\/+$/, "");
    if (!/^https:\/\/[^/]+$/i.test(callbackBase)) {
      throw new Error("V39_DEFERRED_CALLBACK_BASE_MUST_BE_HTTPS_ORIGIN");
    }
    if (/\.replit\.dev$/i.test(new URL(callbackBase).hostname)) {
      throw new Error("V39_DEFERRED_CALLBACK_BASE_CANNOT_BE_REPLIT_DEV");
    }
    if (String(env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase() !== "required") {
      throw new Error("V39_PROVIDER_BLOB_MODE_NOT_REQUIRED");
    }
    // Bind the intended dedicated bucket identity without constructing a local
    // Replit SDK client on GitHub.
    normalizeProviderBlobBucketIdV39(String(env.V39_PROVIDER_BLOB_BUCKET_ID ?? ""));
    return retentionHours;
  }

  const remoteBase = String(env.V39_REMOTE_BLOB_CLEANUP_BASE ?? "").trim().replace(/\/+$/, "");
  if (remoteBase) {
    if (!/^https:\/\/[^/]+$/i.test(remoteBase)) {
      throw new Error("V39_REMOTE_BLOB_CLEANUP_BASE_MUST_BE_HTTPS_ORIGIN");
    }
    if (/\.replit\.dev$/i.test(new URL(remoteBase).hostname)) {
      throw new Error("V39_REMOTE_BLOB_CLEANUP_BASE_CANNOT_BE_REPLIT_DEV");
    }
    if (!String(env.V39_REMOTE_BLOB_CLEANUP_SECRET ?? "").trim()) {
      throw new Error("V39_REMOTE_BLOB_CLEANUP_SECRET_REQUIRED");
    }
    if (String(env.V39_PROVIDER_BLOB_MODE ?? "").trim().toLowerCase() !== "required") {
      throw new Error("V39_PROVIDER_BLOB_MODE_NOT_REQUIRED");
    }
    normalizeProviderBlobBucketIdV39(String(env.V39_PROVIDER_BLOB_BUCKET_ID ?? ""));
  } else {
    createRequiredProviderBlobStoreV39(env);
  }
  return retentionHours;
}

function assertSessionId(sessionId: string): string {
  const normalized = String(sessionId ?? "").trim().toLowerCase();
  if (!UUID.test(normalized)) throw new Error("PREPAID_PROBE_SESSION_ID_INVALID");
  return normalized;
}

function runtimeFlightKey(flight: any): string | null {
  const number = stringOrNull(flight?.number);
  const providerId = stringOrNull(flight?.id);
  const depIcao = stringOrNull(flight?.departure?.airport?.icao)?.toUpperCase() ?? null;
  const arrIcao = stringOrNull(flight?.arrival?.airport?.icao)?.toUpperCase() ?? null;
  const depScheduled = stringOrNull(flight?.departure?.scheduledTime?.utc);
  const callsign = stringOrNull(flight?.callSign);
  if (!number && !providerId && !callsign) return null;
  return sha256(canonical({ number, providerId, depIcao, arrIcao, depScheduled, callsign }));
}

export function prepaidProbeWebhookUrlV39(baseWebhookUrl: string, sessionId: string): string {
  const id = assertSessionId(sessionId);
  const base = String(baseWebhookUrl ?? "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) throw new Error("PREPAID_PROBE_WEBHOOK_BASE_MUST_BE_HTTPS");
  return `${base}/prepaid/${id}`;
}

export async function armPrepaidProbeSessionV39(input: {
  ownerKind: PrepaidProbeOwnerKindV39;
  ownerProbeId?: number | null;
  stage?: 1 | 2 | null;
  icao?: string | null;
  lifetimeHours?: number;
  now?: Date;
}): Promise<PrepaidProbeSessionV39> {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("PREPAID_PROBE_SESSION_NOW_INVALID");
  const lifetimeHours = input.lifetimeHours ?? SESSION_MAX_HOURS;
  if (!Number.isFinite(lifetimeHours) || lifetimeHours <= 0 || lifetimeHours > SESSION_MAX_HOURS) {
    throw new Error("PREPAID_PROBE_SESSION_LIFETIME_INVALID");
  }
  if (input.ownerKind === "anchor_probe") {
    if (!Number.isInteger(input.ownerProbeId) || !input.ownerProbeId || ![1, 2].includes(Number(input.stage)) || !input.icao) {
      throw new Error("PREPAID_PROBE_ANCHOR_OWNER_METADATA_REQUIRED");
    }
  }
  const sessionId = randomUUID();
  const expiresAt = new Date(now.getTime() + lifetimeHours * 3_600_000);
  await pool.query(
    `INSERT INTO clean.prepaid_probe_session_runtime
       (session_id,owner_kind,owner_probe_id,stage,icao,state,created_at_utc,expires_at_utc)
     VALUES($1,$2,$3,$4,$5,'armed',$6,$7)`,
    [sessionId, input.ownerKind, input.ownerProbeId ?? null, input.stage ?? null, input.icao?.toUpperCase() ?? null, now, expiresAt],
  );
  return {
    sessionId,
    ownerKind: input.ownerKind,
    ownerProbeId: input.ownerProbeId ?? null,
    stage: input.stage ?? null,
    icao: input.icao?.toUpperCase() ?? null,
    state: "armed",
    expiresAtUtc: expiresAt.toISOString(),
  };
}

export async function bindPrepaidProbeSubscriptionV39(sessionId: string, providerSubscriptionId: string): Promise<void> {
  const id = assertSessionId(sessionId);
  const sub = String(providerSubscriptionId ?? "").trim();
  if (!sub) throw new Error("PREPAID_PROBE_PROVIDER_SUBSCRIPTION_ID_REQUIRED");
  const result = await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime
        SET provider_subscription_id=$2,state='active'
      WHERE session_id=$1 AND expires_at_utc>now()
        AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)
      RETURNING session_id`,
    [id, sub],
  );
  if (result.rowCount !== 1) throw new Error("PREPAID_PROBE_SESSION_BIND_FAILED");
}

export async function setPrepaidProbeSessionStateV39(sessionId: string, state: PrepaidProbeSessionStateV39): Promise<void> {
  const id = assertSessionId(sessionId);
  const result = await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime SET state=$2 WHERE session_id=$1 RETURNING session_id`,
    [id, state],
  );
  if (result.rowCount !== 1) throw new Error("PREPAID_PROBE_SESSION_STATE_UPDATE_FAILED");
}

export async function recordPrepaidProbeCallbackAttemptV39(sessionId: string): Promise<void> {
  const id = assertSessionId(sessionId);
  await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime
        SET callback_requests_seen=callback_requests_seen+1
      WHERE session_id=$1`,
    [id],
  );
}

export async function recordPrepaidProbeCallbackSuccessV39(sessionId: string): Promise<void> {
  const id = assertSessionId(sessionId);
  await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime
        SET callback_success_2xx=callback_success_2xx+1
      WHERE session_id=$1`,
    [id],
  );
}

export async function recordPrepaidProbeCallbackFailureV39(sessionId: string): Promise<void> {
  const id = assertSessionId(sessionId);
  await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime
        SET callback_failures=callback_failures+1
      WHERE session_id=$1`,
    [id],
  );
}

export async function prepaidProbeSessionExistsV39(sessionId: string): Promise<boolean> {
  const id = assertSessionId(sessionId);
  const result = await pool.query(
    `SELECT 1 FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$1 AND expires_at_utc>now() AND state IN ('armed','active','settling')`,
    [id],
  );
  return result.rowCount === 1;
}

function providerDeliveryEvidence(body: any): PrepaidProbeDeliveryEvidenceV39 {
  const attempt = body?.deliveryAttempt ?? body?.delivery?.attempt ?? null;
  const notificationIdRaw = body?.id ?? body?.notification?.id ?? null;
  return {
    notificationId: stringOrNull(notificationIdRaw),
    notificationGeneratedUtc: dateOrNull(body?.timestampUtc ?? body?.notification?.timestampUtc ?? null),
    attemptSeqNo: nonnegativeIntOrNull(attempt?.seqNo),
    attemptUtc: dateOrNull(attempt?.timestampUtc),
    costCredits: nonnegativeNumberOrNull(attempt?.costCredits ?? body?.deliveryAttemptCostCredits ?? null),
  };
}

function providerSubscriptionId(body: any): string | null {
  return stringOrNull(body?.subscription?.id);
}

function deliveryIdFor(sessionId: string, bodySha256: string, evidence: PrepaidProbeDeliveryEvidenceV39): string {
  return `ppd_${sha256(canonical({
    sessionId,
    bodySha256,
    notificationId: evidence.notificationId,
    attemptSeqNo: evidence.attemptSeqNo,
    attemptUtc: evidence.attemptUtc?.toISOString() ?? null,
  }))}`;
}

/**
 * PITR-safe prepaid webhook persistence.
 *
 * Raw bytes are durably round-trip verified in App Storage BEFORE this returns.
 * PostgreSQL receives only one logged opaque/hash metadata row; all provider-
 * identifying normalized fields are written exclusively to UNLOGGED runtime
 * tables. The caller may return HTTP 2xx only after this function succeeds.
 */
export async function persistPrepaidProbeWebhookV39(input: {
  sessionId: string;
  body: any;
  receivedAtUtc?: Date;
}): Promise<{ deliveryId: string; blobRefId: string; itemCount: number; duplicate: boolean }> {
  const sessionId = assertSessionId(input.sessionId);
  const receivedAt = input.receivedAtUtc ?? new Date();
  if (!Number.isFinite(receivedAt.getTime())) throw new Error("PREPAID_PROBE_RECEIVED_AT_INVALID");
  const session = await pool.query(
    `SELECT provider_subscription_id,state,expires_at_utc
       FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$1`,
    [sessionId],
  );
  if (session.rowCount !== 1) throw new Error("PREPAID_PROBE_SESSION_NOT_FOUND_OR_CRASH_RESET");
  const state = String(session.rows[0].state ?? "");
  if (!["armed", "active", "settling"].includes(state)) throw new Error(`PREPAID_PROBE_SESSION_NOT_ACCEPTING:${state}`);
  if (new Date(session.rows[0].expires_at_utc).getTime() <= receivedAt.getTime()) throw new Error("PREPAID_PROBE_SESSION_EXPIRED");

  const subId = providerSubscriptionId(input.body);
  const boundSub = session.rows[0].provider_subscription_id ? String(session.rows[0].provider_subscription_id) : null;
  if (boundSub && subId && boundSub !== subId) throw new Error("PREPAID_PROBE_PROVIDER_SUBSCRIPTION_MISMATCH");

  const rawText = canonical(input.body ?? {});
  const rawBytes = Buffer.from(rawText, "utf8");
  const bodySha256 = sha256(rawBytes);
  const evidence = providerDeliveryEvidence(input.body);
  const deliveryId = deliveryIdFor(sessionId, bodySha256, evidence);
  const prior = await pool.query(
    `SELECT blob_ref_id,raw_body_sha256 FROM clean.prepaid_probe_delivery_runtime
      WHERE session_id=$1 AND delivery_id=$2`,
    [sessionId, deliveryId],
  );
  if (prior.rowCount) {
    if (String(prior.rows[0].raw_body_sha256) !== bodySha256) throw new Error("PREPAID_PROBE_DUPLICATE_HASH_CONFLICT");
    return { deliveryId, blobRefId: String(prior.rows[0].blob_ref_id), itemCount: Array.isArray(input.body?.flights) ? input.body.flights.length : Array.isArray(input.body) ? input.body.length : 0, duplicate: true };
  }

  const flights: any[] = Array.isArray(input.body)
    ? input.body
    : Array.isArray(input.body?.flights)
      ? input.body.flights
      : [];
  const store = createRequiredProviderBlobStoreV39();
  let blob: ProviderBlobRefV39;
  try {
    blob = await persistProviderBlobBeforeAckV39({
      store,
      bytes: rawBytes,
      contentClass: "raw_provider_content",
      retentionHours: resolvePrepaidRawRetentionHoursV39(),
      now: receivedAt,
    });
  } catch (error) {
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO clean.provider_content_blob_ref
       (blob_ref_id,storage_kind,contract_version,object_name,content_class,content_sha256,content_bytes,
        source_kind,source_record_id,persisted_at_utc,retention_hours,expires_at_utc)
       VALUES($1,$2,$3,$4,$5,$6,$7,'webhook',$8,$9,$10,$11)`,
      [blob.blobRefId, blob.storageKind, blob.contractVersion, blob.objectName, blob.contentClass,
       blob.contentSha256, blob.contentBytes, `prepaid:${sessionId}:${deliveryId}`, blob.persistedAtUtc,
       blob.retentionHours, blob.expiresAtUtc],
    );
    await client.query(
      `INSERT INTO clean.prepaid_probe_delivery_runtime
       (session_id,delivery_id,blob_ref_id,raw_body_sha256,provider_subscription_id,received_at_utc,
        provider_notification_generated_utc,delivery_attempt_seq_no,delivery_attempt_utc,
        delivery_attempt_cost_credits,notification_items)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [sessionId, deliveryId, blob.blobRefId, bodySha256, subId, receivedAt,
       evidence.notificationGeneratedUtc, evidence.attemptSeqNo, evidence.attemptUtc,
       evidence.costCredits, flights.length],
    );
    if (flights.length > 0) {
      const values: unknown[] = [];
      const tuples: string[] = [];
      for (let itemIndex = 0; itemIndex < flights.length; itemIndex += 1) {
        const flight = flights[itemIndex];
        const itemRaw = canonical(flight);
        const offset = values.length;
        values.push(
          sessionId,
          deliveryId,
          itemIndex,
          sha256(itemRaw),
          stringOrNull(flight?.number),
          stringOrNull(flight?.aircraft?.reg),
          normalizeCodeshareStatus(flight?.codeshareStatus),
          runtimeFlightKey(flight),
          receivedAt,
        );
        tuples.push(`(${offset + 1},${offset + 2},${offset + 3},${offset + 4},${offset + 5},${offset + 6},${offset + 7},${offset + 8},${offset + 9})`);
      }
      await client.query(
        `INSERT INTO clean.prepaid_probe_item_runtime
         (session_id,delivery_id,item_index,raw_item_sha256,flight_number,aircraft_reg,codeshare_status,runtime_flight_key,received_at_utc)
         VALUES ${tuples.join(",")}`,
        values,
      );
    }
    if (subId) {
      const bind = await client.query(
        `UPDATE clean.prepaid_probe_session_runtime
            SET provider_subscription_id=COALESCE(provider_subscription_id,$2),state='active',last_delivery_at_utc=$3
          WHERE session_id=$1 AND (provider_subscription_id IS NULL OR provider_subscription_id=$2)
          RETURNING session_id`,
        [sessionId, subId, receivedAt],
      );
      if (bind.rowCount !== 1) throw new Error("PREPAID_PROBE_SESSION_PROVIDER_BIND_CONFLICT");
    } else {
      await client.query(`UPDATE clean.prepaid_probe_session_runtime SET last_delivery_at_utc=$2 WHERE session_id=$1`, [sessionId, receivedAt]);
    }
    await client.query("COMMIT");
    return { deliveryId, blobRefId: blob.blobRefId, itemCount: flights.length, duplicate: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    try {
      await deleteProviderBlobAtExpiryV39({ store, ref: blob, now: new Date(), allowEarlyDelete: true });
    } catch { /* fail original request; orphan cleanup/expiry job still has opaque path in the thrown context only */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function prepaidProbeInternalCreditsV39(sessionId: string): Promise<number> {
  const id = assertSessionId(sessionId);
  const result = await pool.query(
    `SELECT COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::int AS n
       FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1`,
    [id],
  );
  return Number(result.rows[0]?.n ?? 0);
}

export async function prepaidProbeMetricsV39(sessionId: string, start: Date, end: Date): Promise<PrepaidProbeMetricsV39> {
  const id = assertSessionId(sessionId);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error("PREPAID_PROBE_METRIC_WINDOW_INVALID");
  const counts = await pool.query(
    `SELECT count(*)::int AS rows,
            count(DISTINCT flight_number)::int AS unique_flights,
            count(DISTINCT CASE WHEN codeshare_status='IsOperator' THEN flight_number END)::int AS confirmed_lower,
            count(DISTINCT CASE WHEN codeshare_status IS NULL OR codeshare_status='Unknown' THEN flight_number END)::int AS ambiguous_n
       FROM clean.prepaid_probe_item_runtime
      WHERE session_id=$1 AND received_at_utc >= $2 AND received_at_utc < $3`,
    [id, start, end],
  );
  const chain = await pool.query(
    `SELECT COALESCE(sum(links),0)::int AS links FROM (
       SELECT GREATEST(count(DISTINCT flight_number)-1,0) AS links
         FROM clean.prepaid_probe_item_runtime
        WHERE session_id=$1 AND received_at_utc >= $2 AND received_at_utc < $3
          AND aircraft_reg IS NOT NULL AND flight_number IS NOT NULL
        GROUP BY aircraft_reg
     ) x`,
    [id, start, end],
  );
  const observations = await pool.query(
    `SELECT extract(epoch FROM min(received_at_utc))*1000 AS event_ms
       FROM clean.prepaid_probe_item_runtime
      WHERE session_id=$1 AND received_at_utc >= $2 AND received_at_utc < $3
        AND runtime_flight_key IS NOT NULL
      GROUP BY runtime_flight_key`,
    [id, start, end],
  );
  const deliveries = await pool.query(
    `SELECT
        count(*)::int AS delivery_count,
        COALESCE(sum(notification_items),0)::int AS notification_items,
        COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::int AS internal_credits,
        count(*) FILTER (WHERE delivery_attempt_cost_credits IS NOT NULL)::int AS explicit_cost_count,
        count(*) FILTER (WHERE delivery_attempt_cost_credits IS NULL)::int AS fallback_count,
        count(*) FILTER (
          WHERE delivery_attempt_cost_credits IS NOT NULL
            AND delivery_attempt_cost_credits <> notification_items
        )::int AS cost_item_disagreement_count
       FROM clean.prepaid_probe_delivery_runtime
      WHERE session_id=$1 AND received_at_utc >= $2 AND received_at_utc < $3`,
    [id, start, end],
  );
  const sessionCounters = await pool.query(
    `SELECT callback_requests_seen,callback_success_2xx,callback_failures
       FROM clean.prepaid_probe_session_runtime WHERE session_id=$1`,
    [id],
  );
  const row = counts.rows[0] ?? {};
  const d = deliveries.rows[0] ?? {};
  const s = sessionCounters.rows[0] ?? {};
  return {
    rowsDelivered: Number(row.rows ?? 0),
    uniqueFlights: Number(row.unique_flights ?? 0),
    tailChainLinks: Number(chain.rows[0]?.links ?? 0),
    internalSendCredits: Number(d.internal_credits ?? 0),
    confirmedUniqueLower: Number(row.confirmed_lower ?? 0),
    confirmedPlusAmbiguousUpper: Number(row.unique_flights ?? 0),
    ambiguousUnknown: Number(row.ambiguous_n ?? 0),
    firstObservationMs: observations.rows.map((r: any) => Number(r.event_ms)).filter((n: number) => Number.isFinite(n)),
    deliveryCount: Number(d.delivery_count ?? 0),
    notificationItemsReceived: Number(d.notification_items ?? 0),
    explicitCostDeliveryCount: Number(d.explicit_cost_count ?? 0),
    fallbackDeliveryCount: Number(d.fallback_count ?? 0),
    costItemDisagreementCount: Number(d.cost_item_disagreement_count ?? 0),
    callbackRequestsSeen: Number(s.callback_requests_seen ?? 0),
    callbackSuccess2xx: Number(s.callback_success_2xx ?? 0),
    callbackFailures: Number(s.callback_failures ?? 0),
  };
}

export async function persistProbeReconciliationEvidenceV39(input: {
  probeId: number;
  runtimeSessionId: string;
  stage: 1 | 2;
  icao: string;
  evidenceStatus: PrepaidProbeReconciliationEvidenceStatusV39;
  externalSpendCredits: number | null;
  metrics: PrepaidProbeMetricsV39;
  settlementReads: number;
  maxObservedUnsettledCreditGap: number;
  maxObservedExternalDeliveryGap: number;
  deliveryCompletenessFloor: number;
  windowStartUtc: Date;
  windowEndUtc: Date;
  durationCensored: boolean;
  stopReason: string | null;
}): Promise<void> {
  const sessionId = assertSessionId(input.runtimeSessionId);
  const external = input.externalSpendCredits;
  if (external !== null && (!Number.isInteger(external) || external < 0)) {
    throw new Error("PREPAID_PROBE_RECONCILIATION_EXTERNAL_INVALID");
  }
  if (!(input.deliveryCompletenessFloor > 0 && input.deliveryCompletenessFloor <= 1)) {
    throw new Error("PREPAID_PROBE_RECONCILIATION_FLOOR_INVALID");
  }
  const gap = external === null ? null : external - input.metrics.internalSendCredits;
  const completeness = external === null
    ? null
    : external === 0
      ? (input.metrics.internalSendCredits === 0 ? 1 : 0)
      : input.metrics.internalSendCredits / external;

  await pool.query(
    `INSERT INTO clean.adb_probe_reconciliation_evidence
       (probe_id,runtime_session_id,stage,icao,evidence_status,
        external_spend_credits,internal_received_credits,delivery_gap_credits,delivery_completeness,
        delivery_count,notification_items_received,explicit_cost_delivery_count,fallback_delivery_count,
        cost_item_disagreement_count,callback_requests_seen,callback_success_2xx,callback_failures,
        settlement_reads,max_observed_unsettled_credit_gap,max_observed_external_delivery_gap,delivery_completeness_floor,
        window_start_utc,window_end_utc,duration_censored,stop_reason)
     VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
    [
      input.probeId, sessionId, input.stage, input.icao.toUpperCase(), input.evidenceStatus,
      external, input.metrics.internalSendCredits, gap, completeness,
      input.metrics.deliveryCount, input.metrics.notificationItemsReceived,
      input.metrics.explicitCostDeliveryCount, input.metrics.fallbackDeliveryCount,
      input.metrics.costItemDisagreementCount, input.metrics.callbackRequestsSeen,
      input.metrics.callbackSuccess2xx, input.metrics.callbackFailures,
      input.settlementReads, input.maxObservedUnsettledCreditGap, input.maxObservedExternalDeliveryGap,
      input.deliveryCompletenessFloor, input.windowStartUtc, input.windowEndUtc,
      input.durationCensored, input.stopReason,
    ],
  );
}

function blobRefFromRow(row: any): ProviderBlobRefV39 {
  return {
    blobRefId: String(row.blob_ref_id),
    contractVersion: row.contract_version,
    storageKind: row.storage_kind,
    objectName: row.object_name,
    contentClass: row.content_class,
    contentSha256: row.content_sha256,
    contentBytes: Number(row.content_bytes),
    persistedAtUtc: new Date(row.persisted_at_utc).toISOString(),
    expiresAtUtc: new Date(row.expires_at_utc).toISOString(),
    retentionHours: Number(row.retention_hours),
  } as ProviderBlobRefV39;
}

/**
 * Purpose-completion cleanup. Raw provider blobs are deleted and verified
 * absent first; only then are transient UNLOGGED normalized rows removed.
 */
export interface PrepaidProbeCleanupResultV39 {
  deletedBlobs: number;
  deletedRuntimeRows: number;
  verifiedAtUtc: string;
}

export async function cleanupPrepaidProbeSessionLocalV39(
  sessionId: string,
  deletionRunId: string,
): Promise<PrepaidProbeCleanupResultV39> {
  const id = assertSessionId(sessionId);
  if (!String(deletionRunId ?? "").trim()) throw new Error("PREPAID_PROBE_DELETION_RUN_ID_REQUIRED");
  const store = createRequiredProviderBlobStoreV39();
  const blobs = await pool.query(
    `SELECT blob_ref_id,storage_kind,contract_version,object_name,content_class,content_sha256,content_bytes,
            persisted_at_utc,expires_at_utc,retention_hours,deletion_verified_at_utc
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1
      ORDER BY persisted_at_utc,blob_ref_id`,
    [`prepaid:${id}:%`],
  );
  let deletedBlobs = 0;
  for (const row of blobs.rows) {
    if (row.deletion_verified_at_utc) continue;
    const ref = blobRefFromRow(row);
    const deleted = await deleteProviderBlobAtExpiryV39({ store, ref, now: new Date(), allowEarlyDelete: true });
    const update = await pool.query(
      `UPDATE clean.provider_content_blob_ref
          SET deleted_at_utc=$2,deletion_verified_at_utc=$2,deletion_run_id=$3
        WHERE blob_ref_id=$1 AND deletion_verified_at_utc IS NULL
        RETURNING blob_ref_id`,
      [deleted.blobRefId, deleted.deletedAtUtc, deletionRunId],
    );
    if (update.rowCount !== 1) throw new Error(`PREPAID_PROBE_BLOB_TOMBSTONE_UPDATE_FAILED:${deleted.blobRefId}`);
    deletedBlobs += 1;
  }

  const client = await pool.connect();
  let deletedRuntimeRows = 0;
  try {
    await client.query("BEGIN");
    const items = await client.query(`DELETE FROM clean.prepaid_probe_item_runtime WHERE session_id=$1`, [id]);
    const deliveries = await client.query(`DELETE FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1`, [id]);
    const sessions = await client.query(`DELETE FROM clean.prepaid_probe_session_runtime WHERE session_id=$1`, [id]);
    deletedRuntimeRows = (items.rowCount ?? 0) + (deliveries.rowCount ?? 0) + (sessions.rowCount ?? 0);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const verify = await pool.query(
    `SELECT
       (SELECT count(*) FROM clean.prepaid_probe_item_runtime WHERE session_id=$1)::int AS items,
       (SELECT count(*) FROM clean.prepaid_probe_delivery_runtime WHERE session_id=$1)::int AS deliveries,
       (SELECT count(*) FROM clean.prepaid_probe_session_runtime WHERE session_id=$1)::int AS sessions,
       (SELECT count(*) FROM clean.provider_content_blob_ref WHERE source_kind='webhook' AND source_record_id LIKE $2 AND deletion_verified_at_utc IS NULL)::int AS live_blobs`,
    [id, `prepaid:${id}:%`],
  );
  const v = verify.rows[0];
  if (Number(v.items) || Number(v.deliveries) || Number(v.sessions) || Number(v.live_blobs)) {
    throw new Error(`PREPAID_PROBE_CLEANUP_VERIFICATION_FAILED:${JSON.stringify(v)}`);
  }
  return { deletedBlobs, deletedRuntimeRows, verifiedAtUtc: new Date().toISOString() };
}

export async function cleanupPrepaidProbeSessionV39(
  sessionId: string,
  deletionRunId: string,
): Promise<PrepaidProbeCleanupResultV39> {
  const id = assertSessionId(sessionId);
  if (!String(deletionRunId ?? "").trim()) throw new Error("PREPAID_PROBE_DELETION_RUN_ID_REQUIRED");

  const base = String(process.env.V39_REMOTE_BLOB_CLEANUP_BASE ?? "").trim().replace(/\/+$/, "");
  if (!base) return cleanupPrepaidProbeSessionLocalV39(id, deletionRunId);

  if (!/^https:\/\/[^/]+$/i.test(base)) {
    throw new Error("V39_REMOTE_BLOB_CLEANUP_BASE_MUST_BE_HTTPS_ORIGIN");
  }
  if (/\.replit\.dev$/i.test(new URL(base).hostname)) {
    throw new Error("V39_REMOTE_BLOB_CLEANUP_BASE_CANNOT_BE_REPLIT_DEV");
  }
  const secret = String(process.env.V39_REMOTE_BLOB_CLEANUP_SECRET ?? "").trim();
  if (!secret) throw new Error("V39_REMOTE_BLOB_CLEANUP_SECRET_REQUIRED");

  const response = await fetch(`${base}/__v39/phase2g/runtime-cleanup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-v39-phase2g-control-secret": secret,
    },
    body: JSON.stringify({ sessionId: id, deletionRunId }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text().catch(() => "");
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (response.status !== 200 ||
      json?.schema !== "v39.phase2g-runtime-cleanup.v1" ||
      json?.status !== "PASS" ||
      String(json?.session_id ?? "").toLowerCase() !== id ||
      !Number.isInteger(Number(json?.deleted_blobs)) ||
      !Number.isInteger(Number(json?.deleted_runtime_rows)) ||
      !Number.isFinite(Date.parse(String(json?.verified_at_utc ?? "")))) {
    throw new Error(`PREPAID_PROBE_REMOTE_CLEANUP_FAILED:http=${response.status}`);
  }
  return {
    deletedBlobs: Number(json.deleted_blobs),
    deletedRuntimeRows: Number(json.deleted_runtime_rows),
    verifiedAtUtc: new Date(String(json.verified_at_utc)).toISOString(),
  };
}
