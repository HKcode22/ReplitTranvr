-- ============================================================
-- MIGRATION 0020: V3.9 S5 (airborne time-series preservation)
-- Schema: clean
--
-- S5 fixes the silent-loss risk: flightDataPrePostStore_v3.ts deduped on
-- SHA-256(flight|carrier|lastUpdatedUtc), so provider location updates under
-- the same lastUpdatedUtc overwrote earlier points. The research event log
-- (flight_events, 0019) keys each airborne observation on
-- (flight, carrier, loc_reported_utc) so every point survives (§6.2). The
-- dedup flight_data_pre_post table stays the latest-state convenience and is
-- NEVER the trajectory source.
--
-- Tables:
--   raw_airborne_events       raw per-observation airborne points (append-only)
--   clean_airborne_points     cleaned points (impossible values removed,
--                             sorted, identifiers joined) (§6.2 QC)
--   flight_trajectory         per-flight sorted trajectory rows (S5 pipeline)
--   flight_airborne_snapshots prediction_state='AIRBORNE' training snapshots
--                             (prediction_state appears ONLY here and on the
--                             PRE snapshot table — never on raw events, §6.1)
--
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- S5 — raw_airborne_events: append-only raw airborne points (§6.2)
-- Keyed on (flight_number, carrier_iata, loc_reported_utc) so every provider
-- observation survives even when lastUpdatedUtc repeats. Raw, never cleaned.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.raw_airborne_events (
  id BIGSERIAL PRIMARY KEY,
  ingest_event_id BIGINT,
  batch_id TEXT,
  subscription_id TEXT,

  flight_number TEXT NOT NULL,
  carrier_iata TEXT,
  carrier_icao TEXT,
  call_sign TEXT,
  aircraft_reg TEXT,
  aircraft_mode_s TEXT,
  aircraft_model TEXT,
  icao24 TEXT,

  -- Research event-log key: (flight, carrier, loc_reported_utc) + fallback.
  event_key TEXT NOT NULL UNIQUE,

  -- Four distinct availability-rule timestamps (§6.1) — never conflated.
  -- loc_reported_utc is the provider's per-observation location timestamp
  -- (the S5 research-log key basis); event_timestamp mirrors it (reportedAtUtc)
  -- for query convenience.
  event_timestamp TIMESTAMPTZ,
  loc_reported_utc TIMESTAMPTZ,
  provider_published_utc TIMESTAMPTZ,
  available_at TIMESTAMPTZ,
  received_timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_latency_seconds DOUBLE PRECISION,

  -- FAA-ASPM milestone set (8) preserved per observation (§6.2)
  scheduled_gate_out TIMESTAMPTZ,
  actual_gate_out TIMESTAMPTZ,
  scheduled_wheels_off TIMESTAMPTZ,
  actual_wheels_off TIMESTAMPTZ,
  scheduled_wheels_on TIMESTAMPTZ,
  actual_wheels_on TIMESTAMPTZ,
  scheduled_gate_in TIMESTAMPTZ,
  actual_gate_in TIMESTAMPTZ,
  milestone_unverified BOOLEAN NOT NULL DEFAULT true,

  -- Airborne state
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude_ft DOUBLE PRECISION,
  pressure_altitude_ft DOUBLE PRECISION,
  pressure_hpa DOUBLE PRECISION,
  ground_speed_kt DOUBLE PRECISION,
  true_track_deg DOUBLE PRECISION,
  vsi_fpm DOUBLE PRECISION,
  on_ground BOOLEAN,
  flight_phase TEXT,

  distance_to_destination_km DOUBLE PRECISION,
  distance_flown_km DOUBLE PRECISION,
  fraction_of_route_completed DOUBLE PRECISION,

  weather_snapshot_id TEXT,
  eta_provider TEXT,
  eta_model_reference TEXT,

  data_quality_flag TEXT,
  trajectory_gap_seconds INTEGER,

  payload_sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_airborne_flight
  ON clean.raw_airborne_events (flight_number, carrier_iata, loc_reported_utc);
CREATE INDEX IF NOT EXISTS idx_raw_airborne_batch
  ON clean.raw_airborne_events (batch_id, received_timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_raw_airborne_time
  ON clean.raw_airborne_events (event_timestamp);

-- ---------------------------------------------------------------------------
-- S5 — clean_airborne_points: cleaned per-point rows (§6.2 QC)
-- Cleaning removes impossible lat/lon/alt/speed, sorts timestamps, joins
-- flight identifiers, marks unjoinable points. Never overwrites raw points.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.clean_airborne_points (
  id BIGSERIAL PRIMARY KEY,
  raw_event_id BIGINT,
  flight_key TEXT NOT NULL,             -- flight_number|carrier_iata
  event_timestamp TIMESTAMPTZ NOT NULL,
  provider_published_utc TIMESTAMPTZ,
  available_at TIMESTAMPTZ,
  received_timestamp_utc TIMESTAMPTZ,

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude_ft DOUBLE PRECISION,
  ground_speed_kt DOUBLE PRECISION,
  true_track_deg DOUBLE PRECISION,
  vsi_fpm DOUBLE PRECISION,
  on_ground BOOLEAN,
  flight_phase TEXT,

  distance_to_destination_km DOUBLE PRECISION,
  distance_flown_km DOUBLE PRECISION,
  fraction_of_route_completed DOUBLE PRECISION,

  -- QC
  qc_flag TEXT NOT NULL DEFAULT 'OK',   -- OK | IMPOSSIBLE | OUT_OF_ORDER | UNJOINABLE
  trajectory_gap_seconds INTEGER,
  source_latency_seconds DOUBLE PRECISION,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT clean_airborne_points_key UNIQUE (raw_event_id, event_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_clean_airborne_flight
  ON clean.clean_airborne_points (flight_key, event_timestamp);

-- ---------------------------------------------------------------------------
-- S5 — flight_trajectory: per-flight sorted trajectory (§6.2)
-- Built FROM clean_airborne_points; never overwrites raw or clean points.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.flight_trajectory (
  id BIGSERIAL PRIMARY KEY,
  flight_key TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  carrier_iata TEXT,

  first_point_utc TIMESTAMPTZ,
  last_point_utc TIMESTAMPTZ,
  point_count INTEGER NOT NULL DEFAULT 0,
  trajectory_duration_seconds INTEGER,
  max_gap_seconds INTEGER,
  median_gap_seconds DOUBLE PRECISION,
  completeness_pct DOUBLE PRECISION,

  -- Milestones that bracket the trajectory
  actual_wheels_off TIMESTAMPTZ,
  actual_wheels_on TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT flight_trajectory_key UNIQUE (flight_key)
);

CREATE INDEX IF NOT EXISTS idx_flight_trajectory_flight
  ON clean.flight_trajectory (flight_number, carrier_iata);

-- ---------------------------------------------------------------------------
-- S5 — flight_airborne_snapshots: prediction_state='AIRBORNE' rows (§6.2)
-- One row per (flight, observation_t). prediction_state appears ONLY here
-- (and on the PRE snapshot table) — never on raw events (§6.1).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.flight_airborne_snapshots (
  airborne_snapshot_id BIGSERIAL PRIMARY KEY,
  flight_id TEXT,
  flight_number TEXT NOT NULL,
  carrier_iata TEXT,
  airline TEXT,
  aircraft_type TEXT,
  callsign TEXT,
  icao24 TEXT,
  registration TEXT,

  prediction_state TEXT NOT NULL DEFAULT 'AIRBORNE',

  event_timestamp TIMESTAMPTZ NOT NULL,
  provider_published_utc TIMESTAMPTZ,
  available_at TIMESTAMPTZ,
  received_timestamp_utc TIMESTAMPTZ,

  origin TEXT,
  destination TEXT,
  current_operational_destination TEXT,
  scheduled_departure TIMESTAMPTZ,
  scheduled_arrival TIMESTAMPTZ,

  scheduled_gate_out TIMESTAMPTZ,
  actual_gate_out TIMESTAMPTZ,
  scheduled_wheels_off TIMESTAMPTZ,
  actual_wheels_off TIMESTAMPTZ,
  scheduled_wheels_on TIMESTAMPTZ,
  actual_wheels_on TIMESTAMPTZ,
  scheduled_gate_in TIMESTAMPTZ,
  actual_gate_in TIMESTAMPTZ,
  milestone_unverified BOOLEAN NOT NULL DEFAULT true,

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  ground_speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  vertical_rate DOUBLE PRECISION,
  on_ground BOOLEAN,
  flight_phase TEXT,

  weather_snapshot_id TEXT,
  weather_timestamp_utc TIMESTAMPTZ,

  distance_to_destination DOUBLE PRECISION,
  distance_flown DOUBLE PRECISION,
  fraction_of_route_completed DOUBLE PRECISION,
  eta_provider TEXT,
  eta_model_reference TEXT,

  data_quality_flag TEXT,
  trajectory_gap_seconds INTEGER,
  source_latency_seconds DOUBLE PRECISION,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT airborne_snapshot_key UNIQUE (flight_number, carrier_iata, event_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_airborne_snapshot_flight
  ON clean.flight_airborne_snapshots (flight_number, carrier_iata, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_airborne_snapshot_state
  ON clean.flight_airborne_snapshots (prediction_state);

COMMIT;