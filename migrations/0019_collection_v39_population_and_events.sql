-- ============================================================
-- MIGRATION 0019: V3.9 S1–S4 (population layer + raw envelope
-- + event-log-before-state + provenance invariant)
-- Schema: clean
--
-- S1  flight_population — the provider-observable prediction
--     population (one row per (flight, cutoff)) from AeroDataBox
--     FIDS/schedule, NOT a "true census" (§5). Coverage metrics are
--     derivable by joining this layer against webhook events.
-- S2  Raw events immutable — adb_ingest_events (0017) gains the raw
--     payload + SHA-256 + parser/schema versions + items + upsert
--     outcome. Rows are never deleted/edited (single-writer ingress).
-- S3  Event log before current state — flight_events is ONE ROW PER
--     FLIGHT-ITEM OBSERVATION (immutable append log, §6.1). The dedup
--     flight_data_pre_post table (0010) remains the latest-state
--     convenience and is never the only research dataset (§6/S4).
-- S4  Provenance invariant — every flight_events row retains its
--     payload_sha256 + ingest_event_id so state is rebuildable from
--     the raw log at any time. Never destructively overwrite.
--
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- S1 — provider-observable prediction population (§5)
-- One row per (flight_number, carrier, cutoff, source_airport): the flight
-- "existed in the provider-observable prediction population at cutoff T"
-- as seen via FIDS/schedule at a collected airport+window.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.flight_population (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT,
  source_airport_icao TEXT NOT NULL,
  source_airport_tier TEXT,
  window_start_utc TIMESTAMPTZ NOT NULL,
  window_end_utc TIMESTAMPTZ NOT NULL,
  cutoff_utc TIMESTAMPTZ NOT NULL,

  flight_number TEXT NOT NULL,
  carrier_iata TEXT,
  carrier_icao TEXT,
  call_sign TEXT,

  dep_airport_icao TEXT,
  dep_airport_iata TEXT,
  arr_airport_icao TEXT,
  arr_airport_iata TEXT,

  dep_scheduled_utc TIMESTAMPTZ,
  arr_scheduled_utc TIMESTAMPTZ,

  -- FIDS/schedule source + provider record identity for provenance (S4)
  source_type TEXT NOT NULL,            -- 'fids' | 'schedule'
  provider_record_key TEXT,
  raw_payload_sha256 TEXT,

  coverage_state TEXT,                  -- taxonomy state if known at insert
  observed_via_webhook BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT flight_population_key UNIQUE
    (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)
);

CREATE INDEX IF NOT EXISTS idx_flight_population_window
  ON clean.flight_population (batch_id, cutoff_utc);
CREATE INDEX IF NOT EXISTS idx_flight_population_airport
  ON clean.flight_population (source_airport_icao, cutoff_utc);
CREATE INDEX IF NOT EXISTS idx_flight_population_flight
  ON clean.flight_population (flight_number, carrier_iata, cutoff_utc);

-- ---------------------------------------------------------------------------
-- S2 — raw immutable envelope on adb_ingest_events (0017)
-- Every webhook delivery retains its raw payload + SHA-256 + versions +
-- outcome so the batch numbers survive restarts AND the exact bytes are
-- auditable/replayable (provenance).
-- ---------------------------------------------------------------------------
ALTER TABLE clean.adb_ingest_events
  ADD COLUMN IF NOT EXISTS payload_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB,
  ADD COLUMN IF NOT EXISTS parser_version TEXT,
  ADD COLUMN IF NOT EXISTS schema_version TEXT,
  ADD COLUMN IF NOT EXISTS provider_published_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS http_metadata JSONB,
  ADD COLUMN IF NOT EXISTS upsert_outcome TEXT;

-- ---------------------------------------------------------------------------
-- S3/S4 — flight_events: immutable per-observation event log (§6, §6.1)
-- One row per flight-item observation. Retains all four availability-rule
-- timestamps (§6.1) distinctly, plus payload_sha256 + ingest_event_id so
-- state can always be rebuilt from this log (provenance invariant).
-- prediction_state is NEVER stamped here — it is derived on snapshots only
-- (S5, §6.1). event_phase is the raw immutable source fact.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.flight_events (
  id BIGSERIAL PRIMARY KEY,
  ingest_event_id BIGINT,
  batch_id TEXT,
  subscription_id TEXT,

  -- Research event-log key (S5): (flight, carrier, loc_reported_utc) when an
  -- airborne point exists, else (flight, carrier, lastUpdatedUtc) — so every
  -- airborne observation survives and no point is overwritten under a
  -- repeated lastUpdatedUtc (§6.2).
  event_key TEXT NOT NULL UNIQUE,

  flight_number TEXT NOT NULL,
  carrier_iata TEXT,
  carrier_icao TEXT,
  call_sign TEXT,
  aircraft_reg TEXT,
  aircraft_mode_s TEXT,
  aircraft_model TEXT,

  -- Four distinct availability-rule timestamps (§6.1) — never conflated.
  event_timestamp TIMESTAMPTZ,          -- when the thing happened (reportedAtUtc)
  provider_published_utc TIMESTAMPTZ,   -- when the provider generated it
  available_at TIMESTAMPTZ,             -- when OUR system could build features (ETL)
  received_timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),

  data_stage TEXT NOT NULL,             -- PRE | POST (evidence-based, §5c)
  event_phase TEXT,                     -- pre_departure, taxi_out, airborne_*, landed, ...
  status TEXT,

  -- FAA-ASPM milestone set (8, §6.2) — mapped, never blindly renamed;
  -- unverified milestones stay NULL + milestone_unverified=true.
  scheduled_gate_out TIMESTAMPTZ,
  actual_gate_out TIMESTAMPTZ,
  scheduled_wheels_off TIMESTAMPTZ,
  actual_wheels_off TIMESTAMPTZ,
  scheduled_wheels_on TIMESTAMPTZ,
  actual_wheels_on TIMESTAMPTZ,
  scheduled_gate_in TIMESTAMPTZ,
  actual_gate_in TIMESTAMPTZ,
  milestone_unverified BOOLEAN NOT NULL DEFAULT true,

  -- Airborne state (raw, per observation — never reduced to "latest")
  has_live_location BOOLEAN NOT NULL DEFAULT false,
  loc_lat DOUBLE PRECISION,
  loc_lon DOUBLE PRECISION,
  loc_altitude_ft DOUBLE PRECISION,
  loc_pressure_altitude_ft DOUBLE PRECISION,
  loc_pressure_hpa DOUBLE PRECISION,
  loc_ground_speed_kt DOUBLE PRECISION,
  loc_true_track_deg DOUBLE PRECISION,
  loc_vsi_fpm DOUBLE PRECISION,
  loc_reported_utc TIMESTAMPTZ,

  -- Derived-in-ETL (stored raw from provider when present)
  distance_to_destination_km DOUBLE PRECISION,
  distance_flown_km DOUBLE PRECISION,
  fraction_of_route_completed DOUBLE PRECISION,
  eta_provider TEXT,
  eta_model_reference TEXT,

  -- QC / provenance
  source_latency_seconds DOUBLE PRECISION,
  trajectory_gap_seconds INTEGER,
  data_quality_flag TEXT,
  payload_sha256 TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_events_batch
  ON clean.flight_events (batch_id, received_timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_flight_events_flight
  ON clean.flight_events (flight_number, carrier_iata, loc_reported_utc);
CREATE INDEX IF NOT EXISTS idx_flight_events_ingest
  ON clean.flight_events (ingest_event_id);

COMMIT;