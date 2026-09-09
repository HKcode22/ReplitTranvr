-- MIGRATION 0026 — PRE snapshot + outcome tables (Phase 0F/0H schema)
-- Idempotent (IF NOT EXISTS), additive. Completes the §1.5.0 data-layer target:
--   flight_population + cutoff-safe features → flight_snapshots (PRE_DEPARTURE)
--   terminal evidence                       → flight_outcomes (2-dim labels)
--
-- NOTE: flight_airborne_snapshots is NOT recreated here — it already exists
-- from migration 0020 (clean.flight_airborne_snapshots, production owner).

CREATE TABLE IF NOT EXISTS clean.flight_snapshots (
  id BIGSERIAL PRIMARY KEY,
  flight_instance_id TEXT NOT NULL,
  prediction_state TEXT NOT NULL DEFAULT 'PRE_DEPARTURE',
  horizon TEXT NOT NULL CHECK (horizon IN ('T-24h', 'T-6h', 'T-90m')),
  prediction_cutoff_utc TIMESTAMPTZ NOT NULL,
  selected_t_milestone_utc TIMESTAMPTZ,
  selected_t_version TEXT,
  population_query_id TEXT,
  fids_response_hash TEXT,
  schedule_version TEXT,
  frame_hash TEXT,
  config_hash TEXT,
  features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missingness_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  builder_version TEXT NOT NULL,
  provenance_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT flight_snapshots_uniq UNIQUE (flight_instance_id, horizon, prediction_cutoff_utc)
);

CREATE INDEX IF NOT EXISTS idx_flight_snapshots_flight
  ON clean.flight_snapshots (flight_instance_id, prediction_cutoff_utc);
CREATE INDEX IF NOT EXISTS idx_flight_snapshots_horizon
  ON clean.flight_snapshots (horizon, prediction_cutoff_utc);

CREATE TABLE IF NOT EXISTS clean.flight_outcomes (
  id BIGSERIAL PRIMARY KEY,
  flight_instance_id TEXT NOT NULL,
  flight_operational_state TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('gate_out', 'wheels_off', 'wheels_on', 'gate_in')),
  label_status TEXT NOT NULL CHECK (label_status IN ('pending', 'observed', 'censored', 'missing', 'not_applicable')),
  reference_arrival_utc TIMESTAMPTZ,
  recovery_deadline_utc TIMESTAMPTZ,
  opportunities_used INTEGER NOT NULL DEFAULT 0,
  evidence_json JSONB,
  terminalizer_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT flight_outcomes_uniq UNIQUE (flight_instance_id, target)
);

CREATE INDEX IF NOT EXISTS idx_flight_outcomes_flight
  ON clean.flight_outcomes (flight_instance_id, target);