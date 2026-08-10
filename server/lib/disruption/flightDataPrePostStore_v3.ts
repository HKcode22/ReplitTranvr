// ============================================================
// v3 — flight_data_pre_post store (plan §6).
// Upserts rows keyed on dedup_key = SHA-256(flight|carrier|lastUpdatedUtc),
// so repeated notifications update the same row instead of growing
// the table (the v1–v2 duplicate-row lesson).
//
// Written ONLY by the webhook path. Never by polling.
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 3.
// ============================================================

import { sql } from "drizzle-orm";
import { db, pool } from "../../db";
import { flightDataPrePost, type InsertFlightDataPrePost } from "@shared/schema";

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
  notificationSummary: sql`excluded.notification_summary`,
  notificationRemark: sql`excluded.notification_remark`,
  lastUpdatedUtc: sql`excluded.last_updated_utc`,

  gcdM: sql`excluded.gcd_m`,
  gcdKm: sql`excluded.gcd_km`,
  gcdMile: sql`excluded.gcd_mile`,
  gcdNm: sql`excluded.gcd_nm`,
  gcdFt: sql`excluded.gcd_ft`,

  depAirportIcao: sql`excluded.dep_airport_icao`,
  depAirportIata: sql`excluded.dep_airport_iata`,
  depAirportLocalCode: sql`excluded.dep_airport_local_code`,
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
  depPredictedUtc: sql`excluded.dep_predicted_utc`,
  depRunwayUtc: sql`excluded.dep_runway_utc`,
  depTerminal: sql`excluded.dep_terminal`,
  depCheckinDesk: sql`excluded.dep_checkin_desk`,
  depGate: sql`excluded.dep_gate`,
  depBaggageBelt: sql`excluded.dep_baggage_belt`,
  depRunway: sql`excluded.dep_runway`,
  depQuality: sql`excluded.dep_quality`,

  arrAirportIcao: sql`excluded.arr_airport_icao`,
  arrAirportIata: sql`excluded.arr_airport_iata`,
  arrAirportLocalCode: sql`excluded.arr_airport_local_code`,
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
  arrPredictedUtc: sql`excluded.arr_predicted_utc`,
  arrRunwayUtc: sql`excluded.arr_runway_utc`,
  arrTerminal: sql`excluded.arr_terminal`,
  arrGate: sql`excluded.arr_gate`,
  arrBaggageBelt: sql`excluded.arr_baggage_belt`,
  arrRunway: sql`excluded.arr_runway`,
  arrQuality: sql`excluded.arr_quality`,

  flightPlanFlightRules: sql`excluded.flight_plan_flight_rules`,
  flightPlanFlightType: sql`excluded.flight_plan_flight_type`,
  flightPlanRevisionNo: sql`excluded.flight_plan_revision_no`,
  flightPlanStatus: sql`excluded.flight_plan_status`,
  flightPlanRoute: sql`excluded.flight_plan_route`,
  fpAltRequestedFt: sql`excluded.fp_alt_requested_ft`,
  fpAltAssignedFt: sql`excluded.fp_alt_assigned_ft`,
  fpAirspeedRequestedKt: sql`excluded.fp_airspeed_requested_kt`,
  fpAirspeedAssignedKt: sql`excluded.fp_airspeed_assigned_kt`,
  flightPlanLastUpdatedUtc: sql`excluded.flight_plan_last_updated_utc`,

  aircraftReg: sql`excluded.aircraft_reg`,
  aircraftModeS: sql`excluded.aircraft_mode_s`,
  aircraftModel: sql`excluded.aircraft_model`,
  aircraftImageUrl: sql`excluded.aircraft_image_url`,
  aircraftImageWebUrl: sql`excluded.aircraft_image_web_url`,
  aircraftImageAuthor: sql`excluded.aircraft_image_author`,
  aircraftImageTitle: sql`excluded.aircraft_image_title`,
  aircraftImageDescription: sql`excluded.aircraft_image_description`,
  aircraftImageLicense: sql`excluded.aircraft_image_license`,

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
  samplingProbability: sql`excluded.sampling_probability`,
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
