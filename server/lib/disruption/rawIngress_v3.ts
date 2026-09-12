/**
 * Raw ingress persistence — V3.9-f.8 §§6.4, 15-16.
 * Durable raw envelope + raw items commit before HTTP 2xx. Provider-native
 * notification and delivery-attempt clocks/identity are preserved separately.
 */
import { createHash } from "crypto";
import { v39Pool as pool } from "./db_v39";

export interface RawDeliveryInput {
  subscriptionId: string | null;
  batchId: string | null;
  httpMethod: string;
  httpPath: string | null;
  rawBody: unknown;
  /** Legacy compatibility field; canonical envelope generation uses providerNotificationGeneratedUtc. */
  providerPublishedUtc: Date | null;
  receivedAtUtc: Date;
  /** Provider attempt/transport identifier when present. */
  adbDeliveryId: string | null;
  /** Legacy compatibility cost alias; canonical field is deliveryAttemptCostCredits. */
  adbCostCredits: number | null;
  notificationId?: string | null;
  providerNotificationGeneratedUtc?: Date | null;
  deliveryAttemptSeqNo?: number | null;
  deliveryAttemptUtc?: Date | null;
  deliveryAttemptCostCredits?: number | null;
}
export interface RawDeliveryRecord { id: number; deliveryId: string; rawBodySha256: string; }
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

function sha256(data: string): string { return createHash("sha256").update(data).digest("hex"); }
function sha256Json(obj: unknown): string { return sha256(JSON.stringify(obj)); }

/**
 * Provider notification-id + attempt sequence is the stable retry identity when
 * both are present. Otherwise retain the local receipt-based identity. This
 * makes an exact redelivery idempotent instead of creating an orphan duplicate.
 */
function rawDeliveryId(input: RawDeliveryInput, rawBodySha256: string): string {
  if (input.notificationId && Number.isInteger(input.deliveryAttemptSeqNo) && Number(input.deliveryAttemptSeqNo) >= 0) {
    return `del_adb_${sha256(`${input.notificationId}|${input.deliveryAttemptSeqNo}`).slice(0, 32)}`;
  }
  return `del_${rawBodySha256.slice(0, 16)}_${input.receivedAtUtc.getTime()}`;
}
function canonicalProviderGenerated(input: RawDeliveryInput): Date | null {
  return input.providerNotificationGeneratedUtc ?? input.providerPublishedUtc ?? null;
}
function canonicalAttemptCost(input: RawDeliveryInput): number | null {
  return input.deliveryAttemptCostCredits ?? input.adbCostCredits ?? null;
}

export async function persistRawDelivery(input: RawDeliveryInput): Promise<RawDeliveryRecord> {
  const rawBodyJson = JSON.stringify(input.rawBody);
  const rawBodySha256 = sha256(rawBodyJson);
  const deliveryId = rawDeliveryId(input, rawBodySha256);
  try {
    await pool.query(
      `INSERT INTO clean.raw_delivery
         (delivery_id,subscription_id,batch_id,http_method,http_path,raw_body,raw_body_sha256,
          provider_published_utc,provider_notification_generated_utc,received_at_utc,
          adb_delivery_id,adb_cost_credits,notification_id,delivery_attempt_seq_no,
          delivery_attempt_utc,delivery_attempt_cost_credits,processing_outcome,notification_items)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',0)
       ON CONFLICT (delivery_id) DO NOTHING`,
      [
        deliveryId,input.subscriptionId,input.batchId,input.httpMethod,input.httpPath,rawBodyJson,rawBodySha256,
        canonicalProviderGenerated(input),input.providerNotificationGeneratedUtc ?? null,input.receivedAtUtc,
        input.adbDeliveryId,canonicalAttemptCost(input),input.notificationId ?? null,input.deliveryAttemptSeqNo ?? null,
        input.deliveryAttemptUtc ?? null,canonicalAttemptCost(input),
      ],
    );
  } catch (err: any) {
    console.error("[raw-ingest] DURABLE PERSISTENCE FAILED — must return 5xx:", err?.message || err);
    throw new Error(`Raw delivery persistence failed: ${err?.message || err}`);
  }
  return { id: 0, deliveryId, rawBodySha256 };
}

export async function persistRawDeliveryItems(items: RawDeliveryItemInput[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    const values = items.map((item) => {
      const rawItemJson = JSON.stringify(item.rawItem);
      return {
        delivery_id: item.deliveryId,
        item_index: item.itemIndex,
        flight_number: item.flightNumber,
        carrier_iata: item.carrierIata,
        carrier_icao: item.carrierIcao,
        status: item.status,
        status_code: item.statusCode,
        raw_item: rawItemJson,
        raw_item_sha256: sha256(rawItemJson),
        last_updated_utc: item.lastUpdatedUtc,
        departure_scheduled_utc: item.departureScheduledUtc,
        arrival_scheduled_utc: item.arrivalScheduledUtc,
        parsing_outcome: item.parsingOutcome,
        canonical_flight_instance_id: item.canonicalFlightInstanceId,
      };
    });
    for (const v of values) {
      await pool.query(
        `INSERT INTO clean.raw_delivery_item
           (delivery_id,item_index,flight_number,carrier_iata,carrier_icao,status,status_code,
            raw_item,raw_item_sha256,last_updated_utc,departure_scheduled_utc,arrival_scheduled_utc,
            parsing_outcome,canonical_flight_instance_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (delivery_id,item_index) DO NOTHING`,
        [v.delivery_id,v.item_index,v.flight_number,v.carrier_iata,v.carrier_icao,v.status,v.status_code,
         v.raw_item,v.raw_item_sha256,v.last_updated_utc,v.departure_scheduled_utc,v.arrival_scheduled_utc,
         v.parsing_outcome,v.canonical_flight_instance_id],
      );
    }
    return values.length;
  } catch (err: any) {
    console.error("[raw-ingest] raw_delivery_item persist failed:", err?.message || err);
    throw new Error(`Raw delivery-item persistence failed: ${err?.message || err}`);
  }
}

export async function persistProcessingAttempt(input: ProcessingAttemptInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clean.processing_attempt
         (delivery_id,attempt_index,parser_version,schema_version,outcome,items_received,items_parsed,
          items_stored,items_skipped,items_failed,validation_errors,parse_errors,storage_errors,error_message,
          started_at_utc,completed_at_utc,duration_ms,upsert_result,research_events_appended,ingest_event_written)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [input.deliveryId,input.attemptIndex,input.parserVersion,input.schemaVersion,input.outcome,
       input.itemsReceived,input.itemsParsed,input.itemsStored,input.itemsSkipped,input.itemsFailed,
       input.validationErrors ? JSON.stringify(input.validationErrors) : null,
       input.parseErrors ? JSON.stringify(input.parseErrors) : null,
       input.storageErrors ? JSON.stringify(input.storageErrors) : null,
       input.errorMessage,input.startedAtUtc,input.completedAtUtc,input.durationMs,
       input.upsertResult ? JSON.stringify(input.upsertResult) : null,
       input.researchEventsAppended,input.ingestEventWritten],
    );
  } catch (err: any) {
    console.error("[raw-ingest] processing_attempt persist failed:", err?.message || err);
  }
}

/** Post-processing metadata only; raw_body/raw items remain immutable. */
export async function updateRawDeliveryOutcome(
  deliveryId: string,
  outcome: string,
  notificationItems: number,
  errorMessage: string | null,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE clean.raw_delivery
          SET processing_outcome=$2,notification_items=$3,error_message=$4,processed_at_utc=now()
        WHERE delivery_id=$1`,
      [deliveryId,outcome,notificationItems,errorMessage],
    );
  } catch (err: any) {
    console.error("[raw-ingest] raw_delivery outcome update failed:", err?.message || err);
  }
}

export interface RawCommitResult {
  deliveryId: string;
  rawBodySha256: string;
  itemsPersisted: number;
  /** Application timestamp sampled immediately after COMMIT succeeds. */
  committedAtUtc: Date;
}

/** Envelope + raw items commit atomically before 2xx. */
export async function persistRawDeliveryTransaction(
  delivery: RawDeliveryInput,
  items: Omit<RawDeliveryItemInput, "deliveryId">[],
): Promise<RawCommitResult> {
  const rawBodyJson = JSON.stringify(delivery.rawBody);
  const rawBodySha256 = sha256(rawBodyJson);
  const deliveryId = rawDeliveryId(delivery, rawBodySha256);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO clean.raw_delivery
         (delivery_id,subscription_id,batch_id,http_method,http_path,raw_body,raw_body_sha256,
          provider_published_utc,provider_notification_generated_utc,received_at_utc,
          adb_delivery_id,adb_cost_credits,notification_id,delivery_attempt_seq_no,
          delivery_attempt_utc,delivery_attempt_cost_credits,processing_outcome,notification_items)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17)
       ON CONFLICT (delivery_id) DO NOTHING`,
      [
        deliveryId,delivery.subscriptionId,delivery.batchId,delivery.httpMethod,delivery.httpPath,
        rawBodyJson,rawBodySha256,canonicalProviderGenerated(delivery),
        delivery.providerNotificationGeneratedUtc ?? null,delivery.receivedAtUtc,
        delivery.adbDeliveryId,canonicalAttemptCost(delivery),delivery.notificationId ?? null,
        delivery.deliveryAttemptSeqNo ?? null,delivery.deliveryAttemptUtc ?? null,
        canonicalAttemptCost(delivery),items.length,
      ],
    );
    for (const item of items) {
      const rawItemJson = JSON.stringify(item.rawItem);
      await client.query(
        `INSERT INTO clean.raw_delivery_item
           (delivery_id,item_index,flight_number,carrier_iata,carrier_icao,status,status_code,
            raw_item,raw_item_sha256,last_updated_utc,departure_scheduled_utc,arrival_scheduled_utc,
            parsing_outcome,canonical_flight_instance_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (delivery_id,item_index) DO NOTHING`,
        [deliveryId,item.itemIndex,item.flightNumber,item.carrierIata,item.carrierIcao,item.status,item.statusCode,
         rawItemJson,sha256(rawItemJson),item.lastUpdatedUtc,item.departureScheduledUtc,item.arrivalScheduledUtc,
         item.parsingOutcome,item.canonicalFlightInstanceId],
      );
    }
    await client.query("COMMIT");
    return { deliveryId, rawBodySha256, itemsPersisted: items.length, committedAtUtc: new Date() };
  } catch (err: any) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("[raw-ingest] TRANSACTIONAL persist failed — must return 5xx:", err?.message || err);
    throw new Error(`Raw delivery transaction failed: ${err?.message || err}`);
  } finally {
    client.release();
  }
}

// retained for tests/import compatibility
export const rawIngressHashJsonForTest = sha256Json;
