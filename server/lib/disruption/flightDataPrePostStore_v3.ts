// ============================================================
// v3 — flight_data_pre_post store (plan §6).
// Upserts rows keyed on dedup_key = SHA-256(flight|carrier|lastUpdatedUtc),
// so repeated notifications update the same row instead of growing
// the table (the v1–v2 duplicate-row lesson).
//
// Written ONLY by the webhook path. Never by polling.
//
// V3.9 S3/S4/S5 (plan §6, §6.2): this dedup table is the LATEST-STATE
// convenience. The RESEARCH datasets are the immutable event log
// (clean.flight_events, one row per observation keyed on eventKey =
// (flight, carrier, locReportedUtc)) and the airborne time-series tables
// (clean.raw_airborne_events + pipeline). Those are written by
// appendResearchEvents() and are NEVER overwritten.
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 3.
// ============================================================

import { sql } from "drizzle-orm";
import { db, pool } from "../../db";
import { flightDataPrePost, type InsertFlightDataPrePost } from "@shared/schema";
import { createHash } from "crypto";

export interface UpsertResult {
  /** Rows attempted (already filtered: every one has a flight number). */
  stored: number;
  /** Rows that did NOT exist before this upsert (new dedup keys). */
  inserted: number;
  /** stored − inserted (existing rows refreshed by DO UPDATE). */
  updated: number;
}

// ---------------------------------------------------------------------------
// ON CONFLICT (dedup_key) DO UPDATE SET — every column refreshed from the
// incoming (excluded) row so the LATEST delivery wins. id/dedup_key are the
// identity and must not change. received_at is refreshed to the current time.
// ---------------------------------------------------------------------------

export const EXCLUDED_SET = {
  flightNumber: sql`excluded.flight_number`,
  carrierIata: sql`excluded.carrier_iata`,
  carrierIcao: sql`excluded.carrier_icao`,
  carrierName: sql`excluded.carrier_name`,
  callSign: sql`excluded.call_sign`,
  isCargo: sql`excluded.is_cargo`,
  status: sql`excluded.status`,
  statusCode: sql`excluded.status_code`,
  codeshareStatus: sql`excluded.codeshare_status`,
  lastUpdatedUtc: sql`excluded.last_updated_utc`,

  gcdKm: sql`excluded.gcd_km`,

  depAirportIcao: sql`excluded.dep_airport_icao`,
  depAirportIata: sql`excluded.dep_airport_iata`,
  depAirportName: sql`excluded.dep_airport_name`,
  depAirportShortName: sql`excluded.dep_airport_short_name`,
  depAirportMunicipality: sql`excluded.dep_airport_municipality`,
  depAirportCountryCode: sql`excluded.dep_airport_country_code`,
  depAirportLat: sql`excluded.dep_airport_lat`,
  depAirportLon: sql`excluded.dep_airport_lon`,
  depAirportTimezone: sql`excluded.dep_airport_timezone`,
  depScheduledUtc: sql`excluded.dep_scheduled_utc`,
  depScheduledLocal: sql`excluded.dep_scheduled_local`,
  depRevisedUtc: sql`excluded.dep_revised_utc`,
  depRunwayUtc: sql`excluded.dep_runway_utc`,
  depTerminal: sql`excluded.dep_terminal`,
  depCheckinDesk: sql`excluded.dep_checkin_desk`,
  depGate: sql`excluded.dep_gate`,
  depRunway: sql`excluded.dep_runway`,
  depQuality: sql`excluded.dep_quality`,

  arrAirportIcao: sql`excluded.arr_airport_icao`,
  arrAirportIata: sql`excluded.arr_airport_iata`,
  arrAirportName: sql`excluded.arr_airport_name`,
  arrAirportShortName: sql`excluded.arr_airport_short_name`,
  arrAirportMunicipality: sql`excluded.arr_airport_municipality`,
  arrAirportCountryCode: sql`excluded.arr_airport_country_code`,
  arrAirportLat: sql`excluded.arr_airport_lat`,
  arrAirportLon: sql`excluded.arr_airport_lon`,
  arrAirportTimezone: sql`excluded.arr_airport_timezone`,
  arrScheduledUtc: sql`excluded.arr_scheduled_utc`,
  arrScheduledLocal: sql`excluded.arr_scheduled_local`,
  arrRevisedUtc: sql`excluded.arr_revised_utc`,
  arrRunwayUtc: sql`excluded.arr_runway_utc`,
  arrTerminal: sql`excluded.arr_terminal`,
  arrGate: sql`excluded.arr_gate`,
  arrBaggageBelt: sql`excluded.arr_baggage_belt`,
  arrRunway: sql`excluded.arr_runway`,
  arrQuality: sql`excluded.arr_quality`,

  aircraftReg: sql`excluded.aircraft_reg`,
  aircraftModeS: sql`excluded.aircraft_mode_s`,
  aircraftModel: sql`excluded.aircraft_model`,

  locLat: sql`excluded.loc_lat`,
  locLon: sql`excluded.loc_lon`,
  locAltitudeFt: sql`excluded.loc_altitude_ft`,
  locPressureAltitudeFt: sql`excluded.loc_pressure_altitude_ft`,
  locPressureHpa: sql`excluded.loc_pressure_hpa`,
  locGroundSpeedKt: sql`excluded.loc_ground_speed_kt`,
  locTrueTrackDeg: sql`excluded.loc_true_track_deg`,
  locVsiFpm: sql`excluded.loc_vsi_fpm`,
  locReportedUtc: sql`excluded.loc_reported_utc`,

  dataStage: sql`excluded.data_stage`,
  hasLiveLocation: sql`excluded.has_live_location`,
  subscriptionId: sql`excluded.subscription_id`,
  subscriptionIsActive: sql`excluded.subscription_is_active`,
  subscriptionBillingType: sql`excluded.subscription_billing_type`,
  subscriptionActivateBeforeUtc: sql`excluded.subscription_activate_before_utc`,
  subscriptionExpiresOnUtc: sql`excluded.subscription_expires_on_utc`,
  subscriptionCreatedOnUtc: sql`excluded.subscription_created_on_utc`,
  subjectType: sql`excluded.subject_type`,
  subjectId: sql`excluded.subject_id`,
  subscriberType: sql`excluded.subscriber_type`,
  subscriberId: sql`excluded.subscriber_id`,
  subscriptionNotices: sql`excluded.subscription_notices`,
  creditsRemaining: sql`excluded.credits_remaining`,
  balanceLastRefilledUtc: sql`excluded.balance_last_refilled_utc`,
  balanceLastDeductedUtc: sql`excluded.balance_last_deducted_utc`,
  samplingBatchId: sql`excluded.sampling_batch_id`,
  airportTier: sql`excluded.airport_tier`,
  isRandomized: sql`excluded.is_randomized`,
  airportLayerDesignProbability: sql`excluded.airport_layer_design_probability`,
  plannedShare: sql`excluded.planned_share`,
  samplingWeight: sql`excluded.sampling_weight`,
  randomSeed: sql`excluded.random_seed`,
  collectionWindowStart: sql`excluded.collection_window_start`,
  collectionWindowEnd: sql`excluded.collection_window_end`,
  receivedAt: sql`now()`,
  payloadJson: sql`excluded.payload_json`,
} as const;

/**
 * Batch upsert. `inserted` is computed by diffing dedup keys that already
 * exist in the table before the upsert (single-writer assumption — only the
 * webhook writes this table, so the race window is negligible).
 */
export async function upsertFlightNotifications(
  rows: InsertFlightDataPrePost[],
): Promise<UpsertResult> {
  if (rows.length === 0) return { stored: 0, inserted: 0, updated: 0 };

  const keys = rows.map((r) => r.dedupKey);

  let existing = 0;
  try {
    const res = await pool.query(
      "SELECT 1 FROM clean.flight_data_pre_post WHERE dedup_key = ANY($1::text[])",
      [keys],
    );
    existing = res.rowCount ?? 0;
  } catch (err: any) {
    // Never fail the webhook ack on a stats query — the upsert below is the
    // source of truth for storage.
    console.error("[adb-v3] dedup pre-check failed (continuing):", err?.message || err);
  }

  const stored = rows.length;
  const inserted = Math.max(0, stored - existing);
  const updated = stored - inserted;

  try {
    await db
      .insert(flightDataPrePost)
      .values(rows)
      .onConflictDoUpdate({
        target: flightDataPrePost.dedupKey,
        set: EXCLUDED_SET as any,
      });
  } catch (err: any) {
    console.error("[adb-v3] upsert flight_data_pre_post failed:", err?.message || err);
    throw err;
  }

  return { stored, inserted, updated };
}

// ---------------------------------------------------------------------------
// V3.9 S5 research event-log key (§6.2): (flight, carrier, locReportedUtc).
// The dedup table uses lastUpdatedUtc; the research log keys each airborne
// observation on its own loc_reported_utc so no point is overwritten under a
// repeated lastUpdatedUtc. Fallback (no live location): lastUpdatedUtc, then
// receivedAt|index (safety net so a malformed payload never collides).
// ---------------------------------------------------------------------------
export function researchEventKey(input: {
  flightNumber: string;
  carrierIata: string | null | undefined;
  locReportedUtc: Date | null | undefined;
  lastUpdatedUtc: Date | null | undefined;
  receivedAt: Date;
  index: number;
}): string {
  const flight = input.flightNumber.toLowerCase();
  const carrier = (input.carrierIata ?? "").toLowerCase();
  const point = input.locReportedUtc
    ? input.locReportedUtc.toISOString()
    : input.lastUpdatedUtc
      ? input.lastUpdatedUtc.toISOString()
      : `${input.receivedAt.toISOString()}|${input.index}`;
  return createHash("sha256").update(`evt|${flight}|${carrier}|${point}`).digest("hex");
}

export interface ResearchEventInsert {
  eventKey: string;
  flightNumber: string;
  carrierIata: string | null | undefined;
  carrierIcao: string | null | undefined;
  callSign: string | null | undefined;
  aircraftReg: string | null | undefined;
  aircraftModeS: string | null | undefined;
  aircraftModel: string | null | undefined;
  eventTimestamp: Date | null | undefined;
  providerPublishedUtc: Date | null | undefined;
  availableAt: Date | null | undefined;
  receivedTimestampUtc: Date;
  dataStage: "PRE" | "POST";
  status: string | null | undefined;
  hasLiveLocation: boolean;
  locLat: number | null | undefined;
  locLon: number | null | undefined;
  locAltitudeFt: number | null | undefined;
  locPressureAltitudeFt: number | null | undefined;
  locGroundSpeedKt: number | null | undefined;
  locTrueTrackDeg: number | null | undefined;
  locVsiFpm: number | null | undefined;
  locReportedUtc: Date | null | undefined;
  scheduledGateOut: Date | null | undefined;
  actualGateOut: Date | null | undefined;
  scheduledWheelsOff: Date | null | undefined;
  actualWheelsOff: Date | null | undefined;
  scheduledWheelsOn: Date | null | undefined;
  actualWheelsOn: Date | null | undefined;
  scheduledGateIn: Date | null | undefined;
  actualGateIn: Date | null | undefined;
  sourceLatencySeconds: number | null | undefined;
  payloadSha256: string | null | undefined;
  batchId: string | null | undefined;
  subscriptionId: string | null | undefined;
  ingestEventId: number | null | undefined;
}

/**
 * V3.9 S3/S4/S5 (§6, §6.2): append the research event log — ONE ROW PER
 * OBSERVATION, never overwritten. PRE/AIRBORNE observations go to
 * clean.flight_events (keyed on (flight, carrier, locReportedUtc)); airborne
 * (POST with live location) observations ALSO go to
 * clean.raw_airborne_events so the trajectory pipeline is fed. The dedup
 * flight_data_pre_post table is never the trajectory source.
 *
 * Never throws: the webhook 2xx must not depend on research-log writes. Loud
 * error logs let reconciliation find gaps (S4 provenance).
 */
export async function appendResearchEvents(
  rows: ResearchEventInsert[],
): Promise<void> {
  if (rows.length === 0) return;

  const flightEvents = rows.map((r) => ({
    event_key: r.eventKey,
    flight_number: r.flightNumber,
    carrier_iata: r.carrierIata,
    carrier_icao: r.carrierIcao,
    call_sign: r.callSign,
    aircraft_reg: r.aircraftReg,
    aircraft_mode_s: r.aircraftModeS,
    aircraft_model: r.aircraftModel,
    event_timestamp: r.eventTimestamp,
    provider_published_utc: r.providerPublishedUtc,
    available_at: r.availableAt,
    received_timestamp_utc: r.receivedTimestampUtc,
    data_stage: r.dataStage,
    status: r.status,
    has_live_location: r.hasLiveLocation,
    loc_lat: r.locLat,
    loc_lon: r.locLon,
    loc_altitude_ft: r.locAltitudeFt,
    loc_pressure_altitude_ft: r.locPressureAltitudeFt,
    loc_ground_speed_kt: r.locGroundSpeedKt,
    loc_true_track_deg: r.locTrueTrackDeg,
    loc_vsi_fpm: r.locVsiFpm,
    loc_reported_utc: r.locReportedUtc,
    scheduled_gate_out: r.scheduledGateOut,
    actual_gate_out: r.actualGateOut,
    scheduled_wheels_off: r.scheduledWheelsOff,
    actual_wheels_off: r.actualWheelsOff,
    scheduled_wheels_on: r.scheduledWheelsOn,
    actual_wheels_on: r.actualWheelsOn,
    scheduled_gate_in: r.scheduledGateIn,
    actual_gate_in: r.actualGateIn,
    source_latency_seconds: r.sourceLatencySeconds,
    payload_sha256: r.payloadSha256,
    batch_id: r.batchId,
    subscription_id: r.subscriptionId,
    ingest_event_id: r.ingestEventId,
  }));

  const airborne = rows
    .filter((r) => r.hasLiveLocation)
    .map((r) => ({
      event_key: r.eventKey,
      flight_number: r.flightNumber,
      carrier_iata: r.carrierIata,
      carrier_icao: r.carrierIcao,
      call_sign: r.callSign,
      aircraft_reg: r.aircraftReg,
      aircraft_mode_s: r.aircraftModeS,
      aircraft_model: r.aircraftModel,
      event_timestamp: r.eventTimestamp,
      loc_reported_utc: r.locReportedUtc,
      provider_published_utc: r.providerPublishedUtc,
      available_at: r.availableAt,
      received_timestamp_utc: r.receivedTimestampUtc,
      source_latency_seconds: r.sourceLatencySeconds,
      scheduled_gate_out: r.scheduledGateOut,
      actual_gate_out: r.actualGateOut,
      scheduled_wheels_off: r.scheduledWheelsOff,
      actual_wheels_off: r.actualWheelsOff,
      scheduled_wheels_on: r.scheduledWheelsOn,
      actual_wheels_on: r.actualWheelsOn,
      scheduled_gate_in: r.scheduledGateIn,
      actual_gate_in: r.actualGateIn,
      latitude: r.locLat,
      longitude: r.locLon,
      altitude_ft: r.locAltitudeFt,
      pressure_altitude_ft: r.locPressureAltitudeFt,
      ground_speed_kt: r.locGroundSpeedKt,
      true_track_deg: r.locTrueTrackDeg,
      vsi_fpm: r.locVsiFpm,
      payload_sha256: r.payloadSha256,
      batch_id: r.batchId,
      subscription_id: r.subscriptionId,
      ingest_event_id: r.ingestEventId,
    }));

  try {
    if (flightEvents.length > 0) {
      await pool.query(
        `INSERT INTO clean.flight_events
           (event_key, flight_number, carrier_iata, carrier_icao, call_sign,
            aircraft_reg, aircraft_mode_s, aircraft_model,
            event_timestamp, provider_published_utc, available_at,
            received_timestamp_utc, data_stage, status, has_live_location,
            loc_lat, loc_lon, loc_altitude_ft, loc_pressure_altitude_ft,
            loc_ground_speed_kt, loc_true_track_deg, loc_vsi_fpm, loc_reported_utc,
            scheduled_gate_out, actual_gate_out, scheduled_wheels_off,
            actual_wheels_off, scheduled_wheels_on, actual_wheels_on,
            scheduled_gate_in, actual_gate_in, source_latency_seconds,
            payload_sha256, batch_id, subscription_id, ingest_event_id)
         VALUES ${flightEvents.map(
           (_, i) =>
             `($${i * 37 + 1}, $${i * 37 + 2}, $${i * 37 + 3}, $${i * 37 + 4}, $${i * 37 + 5}, ` +
             `$${i * 37 + 6}, $${i * 37 + 7}, $${i * 37 + 8}, $${i * 37 + 9}, $${i * 37 + 10}, $${i * 37 + 11}, ` +
             `$${i * 37 + 12}, $${i * 37 + 13}, $${i * 37 + 14}, $${i * 37 + 15}, $${i * 37 + 16}, $${i * 37 + 17}, ` +
             `$${i * 37 + 18}, $${i * 37 + 19}, $${i * 37 + 20}, $${i * 37 + 21}, $${i * 37 + 22}, $${i * 37 + 23}, ` +
             `$${i * 37 + 24}, $${i * 37 + 25}, $${i * 37 + 26}, $${i * 37 + 27}, $${i * 37 + 28}, $${i * 37 + 29}, ` +
             `$${i * 37 + 30}, $${i * 37 + 31}, $${i * 37 + 32}, $${i * 37 + 33}, $${i * 37 + 34}, $${i * 37 + 35}, ` +
             `$${i * 37 + 36}, $${i * 37 + 37})`,
         ).join(", ")}
         ON CONFLICT (event_key) DO NOTHING`,
        flightEvents.flatMap((e) => [
          e.event_key, e.flight_number, e.carrier_iata, e.carrier_icao, e.call_sign,
          e.aircraft_reg, e.aircraft_mode_s, e.aircraft_model,
          e.event_timestamp, e.provider_published_utc, e.available_at,
          e.received_timestamp_utc, e.data_stage, e.status, e.has_live_location,
          e.loc_lat, e.loc_lon, e.loc_altitude_ft, e.loc_pressure_altitude_ft,
          e.loc_ground_speed_kt, e.loc_true_track_deg, e.loc_vsi_fpm, e.loc_reported_utc,
          e.scheduled_gate_out, e.actual_gate_out, e.scheduled_wheels_off,
          e.actual_wheels_off, e.scheduled_wheels_on, e.actual_wheels_on,
          e.scheduled_gate_in, e.actual_gate_in, e.source_latency_seconds,
          e.payload_sha256, e.batch_id, e.subscription_id, e.ingest_event_id,
        ]),
      );
    }

    if (airborne.length > 0) {
      await pool.query(
        `INSERT INTO clean.raw_airborne_events
           (event_key, flight_number, carrier_iata, carrier_icao, call_sign,
            aircraft_reg, aircraft_mode_s, aircraft_model,
            event_timestamp, loc_reported_utc, provider_published_utc, available_at,
            received_timestamp_utc, source_latency_seconds,
            scheduled_gate_out, actual_gate_out, scheduled_wheels_off,
            actual_wheels_off, scheduled_wheels_on, actual_wheels_on,
            scheduled_gate_in, actual_gate_in,
            latitude, longitude, altitude_ft, pressure_altitude_ft,
            ground_speed_kt, true_track_deg, vsi_fpm,
            payload_sha256, batch_id, subscription_id, ingest_event_id)
         VALUES ${airborne.map(
           (_, i) =>
             `($${i * 33 + 1}, $${i * 33 + 2}, $${i * 33 + 3}, $${i * 33 + 4}, $${i * 33 + 5}, ` +
             `$${i * 33 + 6}, $${i * 33 + 7}, $${i * 33 + 8}, $${i * 33 + 9}, $${i * 33 + 10}, $${i * 33 + 11}, ` +
             `$${i * 33 + 12}, $${i * 33 + 13}, $${i * 33 + 14}, $${i * 33 + 15}, $${i * 33 + 16}, $${i * 33 + 17}, ` +
             `$${i * 33 + 18}, $${i * 33 + 19}, $${i * 33 + 20}, $${i * 33 + 21}, $${i * 33 + 22}, $${i * 33 + 23}, ` +
             `$${i * 33 + 24}, $${i * 33 + 25}, $${i * 33 + 26}, $${i * 33 + 27}, $${i * 33 + 28}, $${i * 33 + 29}, ` +
             `$${i * 33 + 30}, $${i * 33 + 31}, $${i * 33 + 32}, $${i * 33 + 33})`,
         ).join(", ")}
         ON CONFLICT (event_key) DO NOTHING`,
        airborne.flatMap((e) => [
          e.event_key, e.flight_number, e.carrier_iata, e.carrier_icao, e.call_sign,
          e.aircraft_reg, e.aircraft_mode_s, e.aircraft_model,
          e.event_timestamp, e.loc_reported_utc, e.provider_published_utc, e.available_at,
          e.received_timestamp_utc, e.source_latency_seconds,
          e.scheduled_gate_out, e.actual_gate_out, e.scheduled_wheels_off,
          e.actual_wheels_off, e.scheduled_wheels_on, e.actual_wheels_on,
          e.scheduled_gate_in, e.actual_gate_in,
          e.latitude, e.longitude, e.altitude_ft, e.pressure_altitude_ft,
          e.ground_speed_kt, e.true_track_deg, e.vsi_fpm,
          e.payload_sha256, e.batch_id, e.subscription_id, e.ingest_event_id,
        ]),
      );
    }
  } catch (err: any) {
    console.error(
      "[adb-v3] research event log write failed (webhook 2xx preserved, reconcile gap):",
      err?.message || err,
    );
  }
}
