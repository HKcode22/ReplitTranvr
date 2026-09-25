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
import { resolveWebhookFlightIdentity } from "./flightInstanceCanonical_v3";
import type {
  WebhookIdentityObservation,
  WebhookIdentityPersistence,
} from "./flightInstanceCanonical_v3";

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



export interface PrepaidIdentityQueryClientV39 {
  query(
    text: string,
    params?: unknown[],
  ): Promise<{
    rowCount: number | null;
    rows: any[];
  }>;
}

function prepaidWebhookIdentityAmbiguityErrorV39(
  message: string,
): Error {
  const error = new Error(message);
  error.name = "WebhookIdentityAmbiguityError";
  return error;
}

/**
 * Session-local Identity-v2 persistence for the prepaid safe path.
 *
 * This deliberately uses ONLY clean.prepaid_probe_item_runtime, which is
 * UNLOGGED and purpose-deleted with the owning prepaid session. It must never
 * call the default logged webhook identity persistence.
 *
 * The current observation itself is persisted later by the prepaid webhook
 * transaction after resolveWebhookFlightIdentity() returns.
 */
export function createPrepaidSessionIdentityPersistenceV39(
  client: PrepaidIdentityQueryClientV39,
  sessionId: string,
): WebhookIdentityPersistence {
  const id = assertSessionId(sessionId);

  return {
    async resolveOrCreate(input) {
      const providerId = input.providerFlightId?.trim() || null;
      const callsign = input.callsign?.trim().toUpperCase() || null;

      const carrier = input.operatingCarrier.trim().toUpperCase();
      const number = input.operatingFlightNumber
        .trim()
        .replace(/^0+/, "");

      const origin = input.originIcao.trim().toUpperCase();
      const destination =
        input.originalDestinationIcao.trim().toUpperCase();

      /*
       * Serialize identity decisions within one session/alias or route.
       * This mirrors the normal resolver's concurrency protection while
       * keeping all lookup state inside the UNLOGGED prepaid surface.
       */
      const lockKey = providerId
        ? `prepaid-provider:${id}:${carrier}:${providerId}`
        : `prepaid-route:${id}:${carrier}${number}|${origin}|${destination}`;

      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [lockKey],
      );

      if (providerId) {
        const exact = await client.query(
          `SELECT DISTINCT
                  flight_instance_id,
                  initial_service_date::text
             FROM clean.prepaid_probe_item_runtime
            WHERE session_id=$1::uuid
              AND provider_flight_id=$2
              AND operating_carrier=$3
              AND flight_instance_id IS NOT NULL
              AND identity_resolution_status='resolved'
            ORDER BY flight_instance_id
            LIMIT 2`,
          [id, providerId, carrier],
        );

        if ((exact.rowCount ?? exact.rows.length) > 1) {
          throw prepaidWebhookIdentityAmbiguityErrorV39(
            "provider flight id maps to multiple prepaid session identities",
          );
        }

        if (exact.rows[0]) {
          return {
            flightInstanceId:
              String(exact.rows[0].flight_instance_id),
            initialServiceDate:
              String(exact.rows[0].initial_service_date),
          };
        }

        return {
          flightInstanceId: input.flightInstanceId,
          initialServiceDate: input.initialServiceDate,
        };
      }

      /*
       * No-provider-ID observations need positive retained linkage evidence.
       * The production resolver's frozen rule is:
       *   - callsign match + <=12h => strong linkage;
       *   - multiple strong matches => ambiguous;
       *   - otherwise a same-service-date or <=12h nearby identity is
       *     ambiguous between retime and a distinct physical leg.
       */
      const candidates = await client.query(
        `SELECT DISTINCT ON (flight_instance_id)
                flight_instance_id,
                initial_service_date::text,
                scheduled_gate_out_utc,
                callsign
           FROM clean.prepaid_probe_item_runtime
          WHERE session_id=$1::uuid
            AND provider_flight_id IS NULL
            AND flight_instance_id IS NOT NULL
            AND identity_resolution_status='resolved'
            AND operating_carrier=$2
            AND operating_flight_number=$3
            AND origin_icao=$4
            AND destination_icao=$5
            AND initial_service_date BETWEEN
                ($6::date - INTERVAL '1 day')
                AND
                ($6::date + INTERVAL '1 day')
          ORDER BY flight_instance_id,received_at_utc ASC`,
        [
          id,
          carrier,
          number,
          origin,
          destination,
          input.initialServiceDate,
        ],
      );

      const currentMs = Date.parse(input.scheduledGateOutUtc);

      const enriched = candidates.rows
        .map((row: any) => {
          const priorMs =
            new Date(row.scheduled_gate_out_utc).getTime();

          const deltaHours =
            Number.isFinite(currentMs) &&
            Number.isFinite(priorMs)
              ? Math.abs(currentMs - priorMs) / 3_600_000
              : Number.POSITIVE_INFINITY;

          const priorCallsign =
            typeof row.callsign === "string" &&
            row.callsign.trim()
              ? row.callsign.trim().toUpperCase()
              : null;

          return {
            row,
            deltaHours,
            callsignMatch:
              Boolean(callsign) &&
              Boolean(priorCallsign) &&
              callsign === priorCallsign,
          };
        });

      const strong = enriched.filter(
        (candidate) =>
          candidate.callsignMatch &&
          candidate.deltaHours <= 12,
      );

      if (strong.length > 1) {
        throw prepaidWebhookIdentityAmbiguityErrorV39(
          "multiple retained prepaid identities match the no-provider observation",
        );
      }

      if (strong.length === 1) {
        return {
          flightInstanceId:
            String(strong[0].row.flight_instance_id),
          initialServiceDate:
            String(strong[0].row.initial_service_date),
        };
      }

      const ambiguousNearby = enriched.some(
        (candidate) =>
          String(candidate.row.initial_service_date) ===
            input.initialServiceDate ||
          candidate.deltaHours <= 12,
      );

      if (ambiguousNearby) {
        throw prepaidWebhookIdentityAmbiguityErrorV39(
          "no-provider prepaid schedule change is ambiguous between retime and distinct leg",
        );
      }

      return {
        flightInstanceId: input.flightInstanceId,
        initialServiceDate: input.initialServiceDate,
      };
    },
  };
}

export interface PrepaidIdentityObservationMappingV39 {
  observation: WebhookIdentityObservation;
  codeshareStatus: string | null;
  aircraftReg: string | null;
  scheduledGateInUtc: Date | null;
  provisionalIdentityKey: string | null;
}

/**
 * Pure AeroDataBox payload -> V3.9 canonical identity boundary.
 *
 * Field selection intentionally mirrors the normal webhook path:
 *   airline IATA -> ICAO fallback
 *   flight.number
 *   departure/arrival ICAO
 *   departure scheduled UTC
 *   departure IANA timezone
 *   provider flight.id as linkage evidence only
 *   callsign
 *
 * The provisional key exists only to bound unresolved identity. It is not a
 * canonical physical-flight ID and is never eligible for the confirmed lower
 * bound.
 */
export function prepaidIdentityObservationFromFlightV39(
  flight: any,
): PrepaidIdentityObservationMappingV39 {
  const operatingCarrier =
    stringOrNull(flight?.airline?.iata) ??
    stringOrNull(flight?.airline?.icao);

  const operatingFlightNumber = stringOrNull(flight?.number);

  const originIcao =
    stringOrNull(flight?.departure?.airport?.icao)?.toUpperCase() ??
    null;

  const destinationIcao =
    stringOrNull(flight?.arrival?.airport?.icao)?.toUpperCase() ??
    null;

  const scheduledGateOutRaw =
    stringOrNull(flight?.departure?.scheduledTime?.utc);

  const scheduledGateOut =
    dateOrNull(scheduledGateOutRaw);

  const scheduledGateIn =
    dateOrNull(flight?.arrival?.scheduledTime?.utc);

  const originTimeZone =
    stringOrNull(flight?.departure?.airport?.timeZone);

  const providerFlightId =
    stringOrNull(flight?.id);

  const callsign =
    stringOrNull(flight?.callSign);

  const codeshareStatus =
    normalizeCodeshareStatus(flight?.codeshareStatus);

  const aircraftReg =
    stringOrNull(flight?.aircraft?.reg);

  /*
   * For unresolved observations the upper-bound key must:
   *   - ignore mutable status/update timestamps;
   *   - preserve a stable provider-native ID when present;
   *   - otherwise distinguish materially different scheduled legs.
   *
   * A provider flight ID is linkage evidence, never canonical key material.
   */
  let provisionalIdentityKey: string | null = null;

  if (providerFlightId) {
    provisionalIdentityKey = `amb:${sha256(canonical({
      providerFlightId,
      operatingCarrier,
      operatingFlightNumber,
      originIcao,
      destinationIcao,
    }))}`;
  } else if (operatingFlightNumber || callsign) {
    provisionalIdentityKey = `amb:${sha256(canonical({
      operatingCarrier,
      operatingFlightNumber,
      originIcao,
      destinationIcao,
      scheduledGateOutUtc:
        scheduledGateOut?.toISOString() ??
        scheduledGateOutRaw,
      callsign,
    }))}`;
  }

  return {
    observation: {
      operatingCarrier,
      operatingFlightNumber,
      originIcao,
      originalDestinationIcao: destinationIcao,
      scheduledGateOutUtc: scheduledGateOutRaw,
      originTimeZone,

      // Match the normal webhook boundary: provider supplied a scheduled UTC
      // field. The canonical resolver independently rejects invalid timestamps.
      scheduleVerified: scheduledGateOutRaw !== null,

      providerFlightId,
      providerRecordKey: providerFlightId,
      callsign,
    },
    codeshareStatus,
    aircraftReg,
    scheduledGateInUtc: scheduledGateIn,
    provisionalIdentityKey,
  };
}


export type PrepaidCodeshareResolutionStatusV39 =
  | "resolved_operator"
  | "resolved_marketing"
  | "ambiguous_unknown";

export interface PrepaidResolvedFlightIdentityV39
  extends PrepaidIdentityObservationMappingV39 {
  codeshareResolutionStatus: PrepaidCodeshareResolutionStatusV39;
  identityResolutionStatus: "resolved" | "quarantined";
  flightInstanceId: string | null;
  initialServiceDate: string | null;
  identityReason: string | null;
}

/**
 * Apply the V3.9 §7.2 codeshare boundary before physical identity resolution.
 *
 * - IsOperator may enter canonical physical-leg resolution.
 * - IsCodeshared is a known marketing record and never creates a physical leg.
 * - Unknown/missing classification remains explicitly ambiguous and never
 *   enters the physical resolver.
 */
export async function resolvePrepaidFlightIdentityV39(
  client: PrepaidIdentityQueryClientV39,
  sessionId: string,
  flight: any,
): Promise<PrepaidResolvedFlightIdentityV39> {
  const mapped = prepaidIdentityObservationFromFlightV39(flight);

  if (mapped.codeshareStatus === "IsCodeshared") {
    return {
      ...mapped,
      codeshareResolutionStatus: "resolved_marketing",
      identityResolutionStatus: "quarantined",
      flightInstanceId: null,
      initialServiceDate: null,
      identityReason: "provider classified record as marketing codeshare",
    };
  }

  if (mapped.codeshareStatus !== "IsOperator") {
    return {
      ...mapped,
      codeshareResolutionStatus: "ambiguous_unknown",
      identityResolutionStatus: "quarantined",
      flightInstanceId: null,
      initialServiceDate: null,
      identityReason: "provider codeshare state is unknown or unavailable",
    };
  }

  const persistence =
    createPrepaidSessionIdentityPersistenceV39(client, sessionId);

  const identity = await resolveWebhookFlightIdentity(
    mapped.observation,
    persistence,
  );

  if (identity.status === "resolved") {
    return {
      ...mapped,
      codeshareResolutionStatus: "resolved_operator",
      identityResolutionStatus: "resolved",
      flightInstanceId: identity.flightInstanceId,
      initialServiceDate: identity.initialServiceDate,
      identityReason: null,
    };
  }

  return {
    ...mapped,
    codeshareResolutionStatus: "resolved_operator",
    identityResolutionStatus: "quarantined",
    flightInstanceId: null,
    initialServiceDate: null,
    identityReason: identity.reason,
  };
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

  await pool.query(
    `UPDATE clean.prepaid_probe_session_runtime
        SET callback_requests_seen=callback_requests_seen+1
      WHERE session_id=$1`,
    [sessionId],
  );

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
    await pool.query(
      `UPDATE clean.prepaid_probe_session_runtime
          SET callback_success_2xx=callback_success_2xx+1
        WHERE session_id=$1`,
      [sessionId],
    );
    return { deliveryId, blobRefId: String(prior.rows[0].blob_ref_id), itemCount: Array.isArray(input.body?.flights) ? input.body.flights.length : Array.isArray(input.body) ? input.body.length : 0, duplicate: true };
  }

  const flights: any[] = Array.isArray(input.body)
    ? input.body
    : Array.isArray(input.body?.flights)
      ? input.body.flights
      : [];
  const store = createRequiredProviderBlobStoreV39();
  const blob: ProviderBlobRefV39 = await persistProviderBlobBeforeAckV39({
    store,
    bytes: rawBytes,
    contentClass: "raw_provider_content",
    retentionHours: resolvePrepaidRawRetentionHoursV39(),
    now: receivedAt,
  });

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
      /*
       * Resolve and persist sequentially inside this transaction.
       *
       * A later item in the same provider notification must be able to see
       * the identity retained for an earlier item (provider-ID update/retime
       * linkage). Do not resolve the whole delivery before inserting rows.
       */
      for (let itemIndex = 0; itemIndex < flights.length; itemIndex += 1) {
        const flight = flights[itemIndex];
        const itemRaw = canonical(flight);

        const identity =
          await resolvePrepaidFlightIdentityV39(client, sessionId, flight);

        const operatingCarrier =
          identity.observation.operatingCarrier
            ?.trim()
            .toUpperCase() || null;

        const operatingFlightNumber =
          identity.observation.operatingFlightNumber
            ?.trim()
            .replace(/^0+/, "") || null;

        const originIcao =
          identity.observation.originIcao
            ?.trim()
            .toUpperCase() || null;

        const destinationIcao =
          identity.observation.originalDestinationIcao
            ?.trim()
            .toUpperCase() || null;

        await client.query(
          `INSERT INTO clean.prepaid_probe_item_runtime
           (session_id,
            delivery_id,
            item_index,
            raw_item_sha256,
            flight_number,
            aircraft_reg,
            codeshare_status,
            runtime_flight_key,
            provider_flight_id,
            callsign,
            operating_carrier,
            operating_flight_number,
            origin_icao,
            destination_icao,
            origin_time_zone,
            scheduled_gate_out_utc,
            scheduled_gate_in_utc,
            flight_instance_id,
            initial_service_date,
            provisional_identity_key,
            codeshare_resolution_status,
            identity_resolution_status,
            received_at_utc)
           VALUES(
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
             $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
           )`,
          [
            sessionId,
            deliveryId,
            itemIndex,
            sha256(itemRaw),
            stringOrNull(flight?.number),
            identity.aircraftReg,
            identity.codeshareStatus,
            runtimeFlightKey(flight),
            identity.observation.providerFlightId ?? null,
            identity.observation.callsign ?? null,
            operatingCarrier,
            operatingFlightNumber,
            originIcao,
            destinationIcao,
            identity.observation.originTimeZone ?? null,
            identity.observation.scheduledGateOutUtc ?? null,
            identity.scheduledGateInUtc,
            identity.flightInstanceId,
            identity.initialServiceDate,
            identity.provisionalIdentityKey,
            identity.codeshareResolutionStatus,
            identity.identityResolutionStatus,
            receivedAt,
          ],
        );
      }
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
    await client.query(
      `UPDATE clean.prepaid_probe_session_runtime
          SET callback_success_2xx=callback_success_2xx+1
        WHERE session_id=$1`,
      [sessionId],
    );
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

export async function prepaidProbeMetricsV39(
  sessionId: string,
  start: Date,
  end: Date,
): Promise<PrepaidProbeMetricsV39> {
  const id = assertSessionId(sessionId);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    throw new Error("PREPAID_PROBE_METRIC_WINDOW_INVALID");
  }

  /*
   * Scientific Stage-1/2 metrics are derived from the corrected physical-leg
   * identity contract, not flight-number or runtime-key proxies.
   *
   * codeshare_resolution_status is the frozen analytic interpretation.
   * The raw provider codeshare_status remains selected for auditability but
   * does not override the normalized classification.
   */
  const itemRows = await pool.query(
    `SELECT
        received_at_utc,
        flight_instance_id,
        provisional_identity_key,
        identity_resolution_status,
        codeshare_status,
        codeshare_resolution_status,
        aircraft_reg,
        origin_icao,
        destination_icao,
        scheduled_gate_out_utc,
        scheduled_gate_in_utc
       FROM clean.prepaid_probe_item_runtime
      WHERE session_id=$1
        AND received_at_utc >= $2
        AND received_at_utc < $3
      ORDER BY received_at_utc,item_index`,
    [id, start, end],
  );

  const physicalRows: PrepaidPhysicalMetricRowV39[] =
    itemRows.rows.map((row: any) => {
      const semanticCodeshare =
        row.codeshare_resolution_status === "resolved_operator"
          ? "IsOperator"
          : row.codeshare_resolution_status === "resolved_marketing"
            ? "IsCodeshared"
            : row.codeshare_resolution_status === "ambiguous_unknown"
              ? "Unknown"
              : null;

      const identityStatus =
        row.identity_resolution_status === "resolved"
          ? "resolved"
          : row.identity_resolution_status === "quarantined"
            ? "quarantined"
            : null;

      return {
        receivedAtUtc: new Date(row.received_at_utc),
        flightInstanceId:
          typeof row.flight_instance_id === "string"
            ? row.flight_instance_id
            : null,
        provisionalIdentityKey:
          typeof row.provisional_identity_key === "string"
            ? row.provisional_identity_key
            : null,
        identityResolutionStatus: identityStatus,
        codeshareStatus: semanticCodeshare,
        aircraftReg:
          typeof row.aircraft_reg === "string"
            ? row.aircraft_reg
            : null,
        originIcao:
          typeof row.origin_icao === "string"
            ? row.origin_icao
            : null,
        destinationIcao:
          typeof row.destination_icao === "string"
            ? row.destination_icao
            : null,
        scheduledGateOutUtc:
          row.scheduled_gate_out_utc
            ? new Date(row.scheduled_gate_out_utc)
            : null,
        scheduledGateInUtc:
          row.scheduled_gate_in_utc
            ? new Date(row.scheduled_gate_in_utc)
            : null,
      };
    });

  const physical =
    summarizePrepaidPhysicalIdentityRowsV39(physicalRows);

  /*
   * Delivery/credit reconciliation remains unchanged. This is accounting
   * evidence, not physical-flight scientific identity.
   */
  const deliveries = await pool.query(
    `SELECT
        count(*)::int AS delivery_count,
        COALESCE(sum(notification_items),0)::int AS notification_items,
        COALESCE(
          sum(
            COALESCE(
              delivery_attempt_cost_credits,
              notification_items,
              0
            )
          ),
          0
        )::int AS internal_credits,
        count(*) FILTER (
          WHERE delivery_attempt_cost_credits IS NOT NULL
        )::int AS explicit_cost_count,
        count(*) FILTER (
          WHERE delivery_attempt_cost_credits IS NULL
        )::int AS fallback_count,
        count(*) FILTER (
          WHERE delivery_attempt_cost_credits IS NOT NULL
            AND delivery_attempt_cost_credits <> notification_items
        )::int AS cost_item_disagreement_count
       FROM clean.prepaid_probe_delivery_runtime
      WHERE session_id=$1
        AND received_at_utc >= $2
        AND received_at_utc < $3`,
    [id, start, end],
  );

  const sessionCounters = await pool.query(
    `SELECT
        callback_requests_seen,
        callback_success_2xx,
        callback_failures
       FROM clean.prepaid_probe_session_runtime
      WHERE session_id=$1`,
    [id],
  );

  const d = deliveries.rows[0] ?? {};
  const counters = sessionCounters.rows[0] ?? {};

  return {
    rowsDelivered: itemRows.rows.length,
    uniqueFlights: physical.uniqueFlights,
    tailChainLinks: physical.tailChainLinks,
    internalSendCredits: Number(d.internal_credits ?? 0),
    confirmedUniqueLower: physical.confirmedUniqueLower,
    confirmedPlusAmbiguousUpper:
      physical.confirmedPlusAmbiguousUpper,
    ambiguousUnknown: physical.ambiguousUnknown,
    firstObservationMs: physical.firstObservationMs,
    deliveryCount: Number(d.delivery_count ?? 0),
    notificationItemsReceived:
      Number(d.notification_items ?? 0),
    explicitCostDeliveryCount:
      Number(d.explicit_cost_count ?? 0),
    fallbackDeliveryCount:
      Number(d.fallback_count ?? 0),
    costItemDisagreementCount:
      Number(d.cost_item_disagreement_count ?? 0),
    callbackRequestsSeen:
      Number(counters.callback_requests_seen ?? 0),
    callbackSuccess2xx:
      Number(counters.callback_success_2xx ?? 0),
    callbackFailures:
      Number(counters.callback_failures ?? 0),
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
        settlement_reads,max_observed_unsettled_credit_gap,delivery_completeness_floor,
        window_start_utc,window_end_utc,duration_censored,stop_reason)
     VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [
      input.probeId, sessionId, input.stage, input.icao.toUpperCase(), input.evidenceStatus,
      external, input.metrics.internalSendCredits, gap, completeness,
      input.metrics.deliveryCount, input.metrics.notificationItemsReceived,
      input.metrics.explicitCostDeliveryCount, input.metrics.fallbackDeliveryCount,
      input.metrics.costItemDisagreementCount, input.metrics.callbackRequestsSeen,
      input.metrics.callbackSuccess2xx, input.metrics.callbackFailures,
      input.settlementReads, input.maxObservedUnsettledCreditGap, input.deliveryCompletenessFloor,
      input.windowStartUtc, input.windowEndUtc, input.durationCensored, input.stopReason,
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

/**
 * Pure §9.1 physical-flight metric reducer.
 *
 * This consumes already-normalized transient UNLOGGED identity rows.
 * It performs no I/O and contains no provider/account logic.
 */
export interface PrepaidPhysicalMetricRowV39 {
  receivedAtUtc: Date;
  flightInstanceId: string | null;
  provisionalIdentityKey: string | null;
  identityResolutionStatus: "resolved" | "quarantined" | null;
  codeshareStatus: string | null;
  aircraftReg: string | null;
  originIcao: string | null;
  destinationIcao: string | null;
  scheduledGateOutUtc: Date | null;
  scheduledGateInUtc: Date | null;
}

export interface PrepaidPhysicalMetricSummaryV39 {
  uniqueFlights: number;
  confirmedUniqueLower: number;
  confirmedPlusAmbiguousUpper: number;
  ambiguousUnknown: number;
  tailChainLinks: number;
  firstObservationMs: number[];
}

function prepaidMetricTokenV39(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

export function summarizePrepaidPhysicalIdentityRowsV39(
  rows: readonly PrepaidPhysicalMetricRowV39[],
): PrepaidPhysicalMetricSummaryV39 {
  type ConfirmedLeg = {
    firstObservationMs: number;
    latestObservationMs: number;
    latest: PrepaidPhysicalMetricRowV39;
    registrations: Set<string>;
  };

  const confirmed = new Map<string, ConfirmedLeg>();
  const ambiguous = new Set<string>();

  for (const row of rows) {
    const receivedMs = row.receivedAtUtc.getTime();
    if (!Number.isFinite(receivedMs)) continue;

    const physicalId = row.flightInstanceId?.trim() || null;

    if (
      row.identityResolutionStatus === "resolved" &&
      physicalId !== null &&
      row.codeshareStatus === "IsOperator"
    ) {
      const reg = prepaidMetricTokenV39(row.aircraftReg);
      const prior = confirmed.get(physicalId);

      if (!prior) {
        confirmed.set(physicalId, {
          firstObservationMs: receivedMs,
          latestObservationMs: receivedMs,
          latest: row,
          registrations: new Set(reg ? [reg] : []),
        });
      } else {
        prior.firstObservationMs = Math.min(
          prior.firstObservationMs,
          receivedMs,
        );

        if (reg) prior.registrations.add(reg);

        if (receivedMs >= prior.latestObservationMs) {
          prior.latestObservationMs = receivedMs;
          prior.latest = row;
        }
      }

      continue;
    }

    const provisional = row.provisionalIdentityKey?.trim() || null;
    if (
      provisional &&
      row.codeshareStatus !== "IsCodeshared"
    ) {
      ambiguous.add(provisional);
    }
  }

  const confirmedUniqueLower = confirmed.size;
  const ambiguousUnknown = ambiguous.size;

  /*
   * Tail continuity is intentionally conservative:
   * - confirmed physical identity only;
   * - one stable verified registration throughout observations of that leg;
   * - same tail;
   * - prior destination == next origin;
   * - non-negative gate-in -> gate-out turnaround <= 6h.
   *
   * Aircraft-registration conflicts exclude that leg from chaining.
   */
  const byRegistration = new Map<
    string,
    Array<{
      origin: string;
      destination: string;
      gateOutMs: number;
      gateInMs: number;
    }>
  >();

  for (const leg of confirmed.values()) {
    if (leg.registrations.size !== 1) continue;

    const registration = [...leg.registrations][0];
    const origin = prepaidMetricTokenV39(leg.latest.originIcao);
    const destination = prepaidMetricTokenV39(
      leg.latest.destinationIcao,
    );
    const gateOutMs =
      leg.latest.scheduledGateOutUtc?.getTime() ?? Number.NaN;
    const gateInMs =
      leg.latest.scheduledGateInUtc?.getTime() ?? Number.NaN;

    if (
      !origin ||
      !destination ||
      !Number.isFinite(gateOutMs) ||
      !Number.isFinite(gateInMs)
    ) {
      continue;
    }

    const list = byRegistration.get(registration) ?? [];
    list.push({
      origin,
      destination,
      gateOutMs,
      gateInMs,
    });
    byRegistration.set(registration, list);
  }

  let tailChainLinks = 0;
  const MAX_TURNAROUND_MS = 6 * 60 * 60 * 1000;

  for (const legs of byRegistration.values()) {
    legs.sort((a, b) => a.gateOutMs - b.gateOutMs);

    for (let i = 1; i < legs.length; i += 1) {
      const previous = legs[i - 1];
      const next = legs[i];

      const turnaroundMs = next.gateOutMs - previous.gateInMs;

      if (
        previous.destination === next.origin &&
        turnaroundMs >= 0 &&
        turnaroundMs <= MAX_TURNAROUND_MS
      ) {
        tailChainLinks += 1;
      }
    }
  }

  return {
    // Nominal unique count is the conservative confirmed physical count.
    uniqueFlights: confirmedUniqueLower,
    confirmedUniqueLower,
    confirmedPlusAmbiguousUpper:
      confirmedUniqueLower + ambiguousUnknown,
    ambiguousUnknown,
    tailChainLinks,
    firstObservationMs: [...confirmed.values()]
      .map((x) => x.firstObservationMs)
      .sort((a, b) => a - b),
  };
}
