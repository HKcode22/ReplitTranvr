-- ============================================================
-- MIGRATION 0010: Flight Data PRE/POST raw collection table
-- Schema: clean
-- Table: flight_data_pre_post
--
-- Single raw table for the AeroDataBox FlightAlert webhook
-- (FlightNotificationContract). Stores EVERY field the webhook
-- sends (per AugMLtest/PrePosFeat.md), flattened, with a
-- data_stage marker (PRE/POST) for the ML phase.
-- Written ONLY by the webhook path (Phase 3 store). Never by polling.
-- ============================================================
-- Applied automatically at boot via server/db.ts BOOT_MIGRATIONS.
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clean;
COMMENT ON SCHEMA clean IS 'Clean v2/v3 data pipeline — flat tables, no JSONB blobs';

CREATE TABLE IF NOT EXISTS clean.flight_data_pre_post (
  id SERIAL PRIMARY KEY,

  -- Identity (from .number, .airline.*, .callSign, ...)
  flight_number TEXT NOT NULL,
  carrier_iata TEXT,
  carrier_icao TEXT,
  carrier_name TEXT,
  call_sign TEXT,
  is_cargo BOOLEAN,
  status TEXT,
  status_code SMALLINT,
  codeshare_status TEXT,
  notification_summary TEXT,
  notification_remark TEXT,
  last_updated_utc TIMESTAMPTZ,

  -- Great-circle distance
  gcd_m DOUBLE PRECISION,
  gcd_km DOUBLE PRECISION,
  gcd_mile DOUBLE PRECISION,
  gcd_nm DOUBLE PRECISION,
  gcd_ft DOUBLE PRECISION,

  -- Departure (PRE)
  dep_airport_icao TEXT,
  dep_airport_iata TEXT,
  dep_airport_local_code TEXT,
  dep_airport_name TEXT,
  dep_airport_short_name TEXT,
  dep_airport_municipality TEXT,
  dep_airport_country_code TEXT,
  dep_airport_lat DOUBLE PRECISION,
  dep_airport_lon DOUBLE PRECISION,
  dep_airport_timezone TEXT,
  dep_scheduled_utc TIMESTAMPTZ,
  dep_scheduled_local TEXT,
  dep_revised_utc TIMESTAMPTZ,
  dep_predicted_utc TIMESTAMPTZ,
  dep_runway_utc TIMESTAMPTZ,
  dep_terminal TEXT,
  dep_checkin_desk TEXT,
  dep_gate TEXT,
  dep_baggage_belt TEXT,
  dep_runway TEXT,
  dep_quality TEXT[],

  -- Arrival (PRE baseline)
  arr_airport_icao TEXT,
  arr_airport_iata TEXT,
  arr_airport_local_code TEXT,
  arr_airport_name TEXT,
  arr_airport_short_name TEXT,
  arr_airport_municipality TEXT,
  arr_airport_country_code TEXT,
  arr_airport_lat DOUBLE PRECISION,
  arr_airport_lon DOUBLE PRECISION,
  arr_airport_timezone TEXT,
  arr_scheduled_utc TIMESTAMPTZ,
  arr_scheduled_local TEXT,
  arr_revised_utc TIMESTAMPTZ,
  arr_predicted_utc TIMESTAMPTZ,
  arr_runway_utc TIMESTAMPTZ,
  arr_terminal TEXT,
  arr_gate TEXT,
  arr_baggage_belt TEXT,
  arr_runway TEXT,
  arr_quality TEXT[],

  -- Flight plan (PRE)
  flight_plan_flight_rules TEXT,
  flight_plan_flight_type TEXT,
  flight_plan_revision_no INTEGER,
  flight_plan_status TEXT,
  flight_plan_route TEXT,
  fp_alt_requested_ft DOUBLE PRECISION,
  fp_alt_assigned_ft DOUBLE PRECISION,
  fp_airspeed_requested_kt DOUBLE PRECISION,
  fp_airspeed_assigned_kt DOUBLE PRECISION,
  flight_plan_last_updated_utc TIMESTAMPTZ,

  -- Aircraft (tail-number join key)
  aircraft_reg TEXT,
  aircraft_mode_s TEXT,
  aircraft_model TEXT,
  aircraft_image_url TEXT,
  aircraft_image_web_url TEXT,
  aircraft_image_author TEXT,
  aircraft_image_title TEXT,
  aircraft_image_description TEXT,
  aircraft_image_license TEXT,

  -- Live position (POST, ADS-B)
  loc_lat DOUBLE PRECISION,
  loc_lon DOUBLE PRECISION,
  loc_altitude_ft DOUBLE PRECISION,
  loc_pressure_altitude_ft DOUBLE PRECISION,
  loc_pressure_hpa DOUBLE PRECISION,
  loc_ground_speed_kt DOUBLE PRECISION,
  loc_true_track_deg DOUBLE PRECISION,
  loc_vsi_fpm INTEGER,
  loc_reported_utc TIMESTAMPTZ,

  -- Stage + meta
  data_stage TEXT NOT NULL,
  has_live_location BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_id UUID,
  subscription_is_active BOOLEAN,
  subscription_billing_type TEXT,
  subscription_activate_before_utc TIMESTAMPTZ,
  subscription_expires_on_utc TIMESTAMPTZ,
  subscription_created_on_utc TIMESTAMPTZ,
  subject_type TEXT,
  subject_id TEXT,
  subscriber_type TEXT,
  subscriber_id TEXT,
  subscription_notices JSONB,
  credits_remaining BIGINT,
  balance_last_refilled_utc TIMESTAMPTZ,
  balance_last_deducted_utc TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_json JSONB NOT NULL,
  dedup_key TEXT NOT NULL,

  CONSTRAINT flight_data_pre_post_dedup_key_unique UNIQUE (dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_fdp_flight_date ON clean.flight_data_pre_post (flight_number, dep_scheduled_utc);
CREATE INDEX IF NOT EXISTS idx_fdp_aircraft_reg ON clean.flight_data_pre_post (aircraft_reg);
CREATE INDEX IF NOT EXISTS idx_fdp_status ON clean.flight_data_pre_post (status);

COMMIT;
