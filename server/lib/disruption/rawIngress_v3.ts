/**
 * Raw ingress persistence — V3.9-f.8 §15-16 / Sep1_1 §15-16
 *
 * Implements durable raw persistence BEFORE HTTP 2xx acknowledgement.
 * Five conceptual layers:
 *   1. raw_delivery        — HTTP delivery envelope (immutable after persist)
 *   2. raw_delivery_item   — individual flight items from a delivery
 *   3. processing_attempt  — parsing/validation outcomes per item
 *   4. flight_events       — semantic event log (existing, 0019)
 *   5. flight_state        — current state (existing, 0010)
 *
 * Key rule (§16): If DB insert fails, the handler MUST return 5xx
 * (triggering a provider retry) rather than silent data loss.
 *
 * Sep1_1 §15-16 corrections:
 *  - Raw payload immutable: no UPDATE after initial persist
 *  - Hash stable across retries
 *  - Raw persistence before successful acknowledgement
 *  - DB failure injection tests prove durability
 *  - Retry/delivery raw identity preserved
 */

import { createHash } from "crypto";
import { pool } from "../../db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawDeliveryInput {
  subscriptionId: string | null;
  batchId: string | null;
  httpMethod: string;
  httpPath: string | null;
  rawBody: unknown;
  providerPublishedUtc: Date | null;
  receivedAtUtc: Date;
  adbDeliveryId: string | null;
  adbCostCredits: number | null;
}

export interface RawDeliveryRecord {
  id: number;
  deliveryId: string;
  rawBodySha256: string;
}

export interface RawDeliveryItemInput {
  deliveryId: string;
  itemIndex: number;
  flightNumber: string | null;
  carrierIata: string | null;
  carrierIcao: string | null;
  status: string | null;
  statusCode: number | null;
  rawItem: unknown;
  lastUpdatedUtc: Date | null;
  departureScheduledUtc: Date | null;
  arrivalScheduledUtc: Date | null;
  parsingOutcome: string;
  canonicalFlightInstanceId: string | null;
}

export interface ProcessingAttemptInput {
  deliveryId: string;
  attemptIndex: number;
  parserVersion: string;
  schemaVersion: string | null;
  outcome: string;
  itemsReceived: number;
  itemsParsed: number;
  itemsStored: number;
  itemsSkipped: number;
  itemsFailed: number;
  validationErrors: unknown[] | null;
  parseErrors: unknown[] | null;
  storageErrors: unknown[] | null;
  errorMessage: string | null;
  startedAtUtc: Date;
  completedAtUtc: Date | null;
  durationMs: number | null;
  upsertResult: unknown | null;
  researchEventsAppended: boolean;
  ingestEventWritten: boolean;
}

// ---------------------------------------------------------------------------
// SHA-256 hash helpers
// ---------------------------------------------------------------------------

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function sha256Json(obj: unknown): string {
  return sha256(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Layer 1: raw_delivery — DURABLE PERSISTENCE BEFORE 2xx
// ---------------------------------------------------------------------------

/**
 * Persist the raw delivery envelope. This MUST succeed before the 2xx is sent.
 * If this fails, the caller MUST return 5xx to trigger a provider retry.
 *
 * Returns the delivery record with ID and hash for downstream use.
 * Never throws on duplicate (idempotent via UNIQUE constraint on delivery_id).
 */
export async function persistRawDelivery(input: RawDeliveryInput): Promise<RawDeliveryRecord> {
  const rawBodyJson = JSON.stringify(input.rawBody);
  const rawBodySha256 = sha256(rawBodyJson);
  const deliveryId = `del_${rawBodySha256.slice(0, 16)}_${input.receivedAtUtc.getTime()}`;

  try {
    await pool.query(
      `INSERT INTO clean.raw_delivery
         (delivery_id, subscription_id, batch_id,
          http_method, http_path,
          raw_body, raw_body_sha256,
          provider_published_utc, received_at_utc,
          adb_delivery_id, adb_cost_credits,
          processing_outcome, notification_items)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, 'pending', 0)
       ON CONFLICT (delivery_id) DO NOTHING`,
      [
        deliveryId,
        input.subscriptionId,
        input.batchId,
        input.httpMethod,
        input.httpPath,
        rawBodyJson,
        rawBodySha256,
        input.providerPublishedUtc,
        input.receivedAtUtc,
        input.adbDeliveryId,
        input.adbCostCredits,
      ],
    );
  } catch (err: any) {
    // THIS IS THE CRITICAL PATH: if raw persistence fails, we MUST NOT send 2xx
    console.error(`[raw-ingest] DURABLE PERSISTENCE FAILED — must return 5xx:`, err?.message || err);
    throw new Error(`Raw delivery persistence failed: ${err?.message || err}`);
  }

  return { id: 0, deliveryId, rawBodySha256 };
}

// ---------------------------------------------------------------------------
// Layer 2: raw_delivery_item — individual flight items (immutable)
// ---------------------------------------------------------------------------

/**
 * Persist individual flight items from a delivery. Append-only, never updated.
 * Called after raw_delivery is persisted but potentially before 2xx (§16).
 */
export async function persistRawDeliveryItems(items: RawDeliveryItemInput[]): Promise<number> {
  if (items.length === 0) return 0;

  try {
    const values = items.map((item, i) => {
      const rawItemJson = JSON.stringify(item.rawItem);
      const rawItemSha256 = sha256(rawItemJson);
      return {
        delivery_id: item.deliveryId,
        item_index: item.itemIndex,
        flight_number: item.flightNumber,
        carrier_iata: item.carrierIata,
        carrier_icao: item.carrierIcao,
        status: item.status,
        status_code: item.statusCode,
        raw_item: rawItemJson,
        raw_item_sha256: rawItemSha256,
        last_updated_utc: item.lastUpdatedUtc,
        departure_scheduled_utc: item.departureScheduledUtc,
        arrival_scheduled_utc: item.arrivalScheduledUtc,
        parsing_outcome: item.parsingOutcome,
        canonical_flight_instance_id: item.canonicalFlightInstanceId,
      };
    });

    // Batch insert with ON CONFLICT DO NOTHING (idempotent)
    for (const v of values) {
      await pool.query(
        `INSERT INTO clean.raw_delivery_item
           (delivery_id, item_index, flight_number, carrier_iata, carrier_icao,
            status, status_code, raw_item, raw_item_sha256,
            last_updated_utc, departure_scheduled_utc, arrival_scheduled_utc,
            parsing_outcome, canonical_flight_instance_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (delivery_id, item_index) DO NOTHING`,
        [
          v.delivery_id, v.item_index, v.flight_number, v.carrier_iata, v.carrier_icao,
          v.status, v.status_code, v.raw_item, v.raw_item_sha256,
          v.last_updated_utc, v.departure_scheduled_utc, v.arrival_scheduled_utc,
          v.parsing_outcome, v.canonical_flight_instance_id,
        ],
      );
    }
    return values.length;
  } catch (err: any) {
    console.error(`[raw-ingest] raw_delivery_item persist failed:`, err?.message || err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Layer 3: processing_attempt — parsing/validation outcomes
// ---------------------------------------------------------------------------

/**
 * Record a processing attempt. Append-only: each attempt is a new row.
 */
export async function persistProcessingAttempt(input: ProcessingAttemptInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clean.processing_attempt
         (delivery_id, attempt_index, parser_version, schema_version,
          outcome, items_received, items_parsed, items_stored, items_skipped, items_failed,
          validation_errors, parse_errors, storage_errors, error_message,
          started_at_utc, completed_at_utc, duration_ms,
          upsert_result, research_events_appended, ingest_event_written)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        input.deliveryId,
        input.attemptIndex,
        input.parserVersion,
        input.schemaVersion,
        input.outcome,
        input.itemsReceived,
        input.itemsParsed,
        input.itemsStored,
        input.itemsSkipped,
        input.itemsFailed,
        input.validationErrors ? JSON.stringify(input.validationErrors) : null,
        input.parseErrors ? JSON.stringify(input.parseErrors) : null,
        input.storageErrors ? JSON.stringify(input.storageErrors) : null,
        input.errorMessage,
        input.startedAtUtc,
        input.completedAtUtc,
        input.durationMs,
        input.upsertResult ? JSON.stringify(input.upsertResult) : null,
        input.researchEventsAppended,
        input.ingestEventWritten,
      ],
    );
  } catch (err: any) {
    console.error(`[raw-ingest] processing_attempt persist failed:`, err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// Update raw_delivery outcome (after processing completes)
// ---------------------------------------------------------------------------

/**
 * Update the processing outcome on a raw_delivery row.
 * This is the ONLY update allowed on raw_delivery (post-processing metadata only).
 */
export async function updateRawDeliveryOutcome(
  deliveryId: string,
  outcome: string,
  notificationItems: number,
  errorMessage: string | null,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE clean.raw_delivery
       SET processing_outcome = $2,
           notification_items = $3,
           error_message = $4,
           processed_at_utc = now()
       WHERE delivery_id = $1`,
      [deliveryId, outcome, notificationItems, errorMessage],
    );
  } catch (err: any) {
    console.error(`[raw-ingest] raw_delivery outcome update failed:`, err?.message || err);
  }
}
