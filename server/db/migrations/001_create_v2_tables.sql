-- ============================================================================
-- PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
-- DISABLED 2026-08-06: v2 tables NOT created; polling + v2 risk scoring SHUT
-- DOWN (moving to AeroDataBox webhooks). Reference copy only. (server2-only.)
-- ============================================================================
-- ============================================================
-- MIGRATION 001: Create v2 Data Tables
-- Schema: clean
-- Tables: monitored_flights_v2, risk_score_history_v2
-- ============================================================
-- Run with: psql "$DATABASE_URL" -f server2/db/migrations/001_create_v2_tables.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Create the clean schema (a folder for new tables)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS clean;
COMMENT ON SCHEMA clean IS 'Clean v2 data pipeline — flat tables, no JSONB blobs';

-- ============================================================
-- STEP 2: Create monitored_flights_v2
-- ============================================================
-- One row per flight. Created by seeder or user. Updated by monitor.
-- ============================================================
CREATE TABLE IF NOT EXISTS clean.monitored_flights_v2 (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Flight identity (from AeroDataBox)
  flight_number TEXT NOT NULL,
  carrier_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT,
  departure_time_utc TIMESTAMP,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  origin_name TEXT,
  destination_name TEXT,

  -- Monitor state (updated every scoring cycle)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  risk_score INTEGER,
  risk_tier TEXT CHECK (risk_tier IN ('green', 'amber', 'red')),
  last_checked_at TIMESTAMP,
  red_tier_first_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  confirmation_alert_sent_at TIMESTAMP,

  -- Resolution (set after flight departs)
  resolved_status TEXT,
  resolved_delay_minutes INTEGER,
  resolved_at TIMESTAMP,
  agency_resolved_at TIMESTAMP,

  -- Aircraft (from AeroDataBox)
  tail_number TEXT,
  equipment_type TEXT,
  equipment_group TEXT,

  -- Metadata
  is_test BOOLEAN DEFAULT FALSE,
  agency_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Raw API response (debugging only)
  raw_api_data JSONB
);

-- Unique index for idempotent inserts (same flight+date = same row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mf_v2_flight_date ON clean.monitored_flights_v2(flight_number, departure_date);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_mf_v2_status ON clean.monitored_flights_v2(status);
CREATE INDEX IF NOT EXISTS idx_mf_v2_date ON clean.monitored_flights_v2(departure_date);
CREATE INDEX IF NOT EXISTS idx_mf_v2_carrier ON clean.monitored_flights_v2(carrier_iata);
CREATE INDEX IF NOT EXISTS idx_mf_v2_test ON clean.monitored_flights_v2(is_test);

COMMENT ON TABLE clean.monitored_flights_v2 IS 'Clean v2 flight table — one row per flight, no JSONB for core fields';

-- ============================================================
-- STEP 3: Create risk_score_history_v2
-- ============================================================
-- One row per scoring event. Every 30 min per active flight.
-- All fields from old JSONB extracted into flat, typed columns.
-- ============================================================
CREATE TABLE IF NOT EXISTS clean.risk_score_history_v2 (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Foreign key to flight
  monitored_flight_id INTEGER NOT NULL REFERENCES clean.monitored_flights_v2(id),
  scored_at TIMESTAMP DEFAULT NOW(),

  -- ===== TARGET VARIABLES (what ML predicts) =====
  actual_delay_minutes INTEGER,
  actual_cancelled BOOLEAN,
  actual_status TEXT,

  -- ===== FLIGHT INFO (denormalized for ML convenience) =====
  flight_number TEXT,
  carrier_iata TEXT,
  departure_date DATE,
  departure_time TEXT,
  origin_iata TEXT,
  destination_iata TEXT,

  -- ===== TIMING FEATURES (computed at score time) =====
  hours_until_departure NUMERIC(6,1),
  time_of_day_risk INTEGER CHECK (time_of_day_risk BETWEEN 0 AND 5),
  day_of_week_risk INTEGER CHECK (day_of_week_risk BETWEEN 0 AND 4),
  connection_risk INTEGER CHECK (connection_risk BETWEEN 0 AND 4),
  horizon TEXT CHECK (horizon IN ('short', 'medium', 'long')),
  departure_hour INTEGER CHECK (departure_hour BETWEEN 0 AND 23),
  departure_day_of_week INTEGER CHECK (departure_day_of_week BETWEEN 0 AND 6),

  -- ===== WEATHER: ORIGIN (from aviationweather.gov METAR) =====
  origin_icao TEXT,
  origin_flight_category TEXT CHECK (origin_flight_category IN ('VFR', 'MVFR', 'IFR', 'LIFR', 'UNKNOWN')),
  origin_wind_speed_kt NUMERIC(5,1),
  origin_gust_speed_kt NUMERIC(5,1),
  origin_visibility_miles NUMERIC(5,1),
  origin_ceiling_ft INTEGER,
  origin_has_thunderstorm BOOLEAN DEFAULT FALSE,
  origin_has_freezing BOOLEAN DEFAULT FALSE,

  -- ===== WEATHER: DESTINATION (from aviationweather.gov METAR) =====
  destination_icao TEXT,
  destination_flight_category TEXT CHECK (destination_flight_category IN ('VFR', 'MVFR', 'IFR', 'LIFR', 'UNKNOWN')),
  destination_wind_speed_kt NUMERIC(5,1),
  destination_gust_speed_kt NUMERIC(5,1),
  destination_visibility_miles NUMERIC(5,1),
  destination_ceiling_ft INTEGER,
  destination_has_thunderstorm BOOLEAN DEFAULT FALSE,
  destination_has_freezing BOOLEAN DEFAULT FALSE,

  -- ===== NAS FEATURES (from faa.gov) =====
  origin_has_ground_stop BOOLEAN DEFAULT FALSE,
  origin_has_ground_delay BOOLEAN DEFAULT FALSE,
  origin_nas_avg_delay_minutes INTEGER DEFAULT 0,
  destination_has_ground_stop BOOLEAN DEFAULT FALSE,
  destination_has_ground_delay BOOLEAN DEFAULT FALSE,
  destination_nas_avg_delay_minutes INTEGER DEFAULT 0,
  nas_origin_programs JSONB,
  nas_destination_programs JSONB,

  -- ===== CARRIER HEALTH FEATURES (computed from internal DB) =====
  carrier_cancellation_rate_24h NUMERIC(5,4),
  carrier_avg_delay_24h NUMERIC(6,1),
  carrier_health_score INTEGER CHECK (carrier_health_score IN (1, 3, 4, 7, 10)),
  carrier_reliable BOOLEAN,
  carrier_health_sample_size INTEGER,

  -- ===== AIRCRAFT FEATURES (from AeroDataBox) =====
  tail_number TEXT,
  equipment_type TEXT,
  equipment_group TEXT,

  -- ===== HISTORICAL OTP (stored for reference — always fallback) =====
  historical_otp_score INTEGER,
  historical_otp_sample_size INTEGER,
  historical_otp_source TEXT,
  historical_risk INTEGER,

  -- ===== HEURISTIC SCORE (baseline for ML comparison) =====
  heuristic_score INTEGER NOT NULL,
  heuristic_tier TEXT NOT NULL CHECK (heuristic_tier IN ('green', 'amber', 'red')),

  -- ===== SIGNAL SUB-SCORES (for model interpretability) =====
  signal_inbound_aircraft_delay INTEGER DEFAULT 0,
  signal_inbound_delay_raw_minutes INTEGER,
  signal_atc_ground_stop INTEGER DEFAULT 0,
  signal_atc_ground_delay INTEGER DEFAULT 0,
  signal_origin_weather INTEGER DEFAULT 0,
  signal_destination_weather INTEGER DEFAULT 0,
  signal_carrier_health INTEGER DEFAULT 0,
  signal_time_of_day INTEGER DEFAULT 0,
  signal_day_of_week INTEGER DEFAULT 0,
  signal_connection_risk INTEGER DEFAULT 0,

  -- ===== METADATA =====
  is_test_flight BOOLEAN DEFAULT FALSE,
  agency_id INTEGER
);

-- Indexes for risk_score_history_v2
CREATE INDEX IF NOT EXISTS idx_rs_v2_flight_id ON clean.risk_score_history_v2(monitored_flight_id);
CREATE INDEX IF NOT EXISTS idx_rs_v2_scored_at ON clean.risk_score_history_v2(scored_at);
CREATE INDEX IF NOT EXISTS idx_rs_v2_delay ON clean.risk_score_history_v2(actual_delay_minutes);
CREATE INDEX IF NOT EXISTS idx_rs_v2_tier ON clean.risk_score_history_v2(heuristic_tier);
CREATE INDEX IF NOT EXISTS idx_rs_v2_carrier ON clean.risk_score_history_v2(carrier_iata);

COMMENT ON TABLE clean.risk_score_history_v2 IS 'Clean v2 risk score table — flat typed columns extracted from old JSONB';

-- ============================================================
-- STEP 4: Verify the tables exist
-- ============================================================
SELECT 'Migration 001 complete' AS status,
       (SELECT COUNT(*) FROM clean.monitored_flights_v2) AS flights_v2_count,
       (SELECT COUNT(*) FROM clean.risk_score_history_v2) AS scores_v2_count;

COMMIT;