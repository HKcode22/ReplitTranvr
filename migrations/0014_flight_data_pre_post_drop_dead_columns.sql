-- ============================================================
-- MIGRATION 0014: drop dead / duplicate columns from
-- clean.flight_data_pre_post (measured 0% fill or redundant).
--
-- v3 export (2,199 rows) proved these are never sent by the
-- AeroDataBox webhook feed and/or duplicate other columns:
--   * payload_json_flat       — full duplicate of payload_json
--                               (doubled table size; user removed it)
--   * gcd_m/gcd_mile/gcd_nm/gcd_ft — same distance as gcd_km
--   * flight_plan_* (10)      — 0% (feed never sends flightPlan)
--   * dep_predicted_utc / arr_predicted_utc — 0% (no predictedTime)
--   * dep_airport_local_code / arr_airport_local_code — 0%
--   * dep_baggage_belt        — 0% (departure block has no baggageBelt)
--   * notification_summary / notification_remark — 0%
--   * aircraft_image_* (6)    — 0% (no aircraft.image block)
--
-- payload_json stays as the untouched raw source of truth.
-- Idempotent: safe to re-run every boot (no-op when already dropped).
-- ============================================================

BEGIN;

ALTER TABLE clean.flight_data_pre_post
  DROP COLUMN IF EXISTS payload_json_flat,
  DROP COLUMN IF EXISTS gcd_m,
  DROP COLUMN IF EXISTS gcd_mile,
  DROP COLUMN IF EXISTS gcd_nm,
  DROP COLUMN IF EXISTS gcd_ft,
  DROP COLUMN IF EXISTS flight_plan_flight_rules,
  DROP COLUMN IF EXISTS flight_plan_flight_type,
  DROP COLUMN IF EXISTS flight_plan_revision_no,
  DROP COLUMN IF EXISTS flight_plan_status,
  DROP COLUMN IF EXISTS flight_plan_route,
  DROP COLUMN IF EXISTS fp_alt_requested_ft,
  DROP COLUMN IF EXISTS fp_alt_assigned_ft,
  DROP COLUMN IF EXISTS fp_airspeed_requested_kt,
  DROP COLUMN IF EXISTS fp_airspeed_assigned_kt,
  DROP COLUMN IF EXISTS flight_plan_last_updated_utc,
  DROP COLUMN IF EXISTS dep_predicted_utc,
  DROP COLUMN IF EXISTS arr_predicted_utc,
  DROP COLUMN IF EXISTS dep_airport_local_code,
  DROP COLUMN IF EXISTS arr_airport_local_code,
  DROP COLUMN IF EXISTS dep_baggage_belt,
  DROP COLUMN IF EXISTS notification_summary,
  DROP COLUMN IF EXISTS notification_remark,
  DROP COLUMN IF EXISTS aircraft_image_url,
  DROP COLUMN IF EXISTS aircraft_image_web_url,
  DROP COLUMN IF EXISTS aircraft_image_author,
  DROP COLUMN IF EXISTS aircraft_image_title,
  DROP COLUMN IF EXISTS aircraft_image_description,
  DROP COLUMN IF EXISTS aircraft_image_license;

COMMIT;
