-- 0034_airborne_phase0_conformance.sql
-- V3.9-f.8 Phase 0G: canonical physical-flight uniqueness, deployable AIRBORNE
-- cutoff provenance, explicit quarantine, and independently verified airborne
-- eligibility. Additive/idempotent upgrade from migrations 0020 + 0032.
BEGIN;

-- Legacy number/carrier uniqueness can merge recurring physical flights.
ALTER TABLE clean.flight_trajectory
  DROP CONSTRAINT IF EXISTS flight_trajectory_key;
ALTER TABLE clean.flight_airborne_snapshots
  DROP CONSTRAINT IF EXISTS airborne_snapshot_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_flight_trajectory_canonical
  ON clean.flight_trajectory (flight_instance_id)
  WHERE flight_instance_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_airborne_snapshot_canonical_observation
  ON clean.flight_airborne_snapshots (flight_instance_id, event_timestamp)
  WHERE flight_instance_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_clean_airborne_canonical_observation
  ON clean.clean_airborne_points (flight_instance_id, event_timestamp)
  WHERE flight_instance_id IS NOT NULL;

ALTER TABLE clean.flight_airborne_snapshots
  ADD COLUMN IF NOT EXISTS prediction_cutoff_utc TIMESTAMPTZ;
ALTER TABLE clean.flight_airborne_snapshots
  ADD COLUMN IF NOT EXISTS trajectory_prefix_hash TEXT;
ALTER TABLE clean.flight_airborne_snapshots
  ADD COLUMN IF NOT EXISTS builder_version TEXT;

-- Raw events that cannot safely enter a trajectory must be durably accounted
-- for so a batch reader does not retry the same impossible row forever.
CREATE TABLE IF NOT EXISTS clean.airborne_quarantine (
  quarantine_id BIGSERIAL PRIMARY KEY,
  raw_event_id BIGINT NOT NULL UNIQUE,
  flight_instance_id TEXT,
  reason TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AIRBORNE snapshot eligibility is deliberately separate from webhook capture.
-- This table is populated only from a provider-observable population member plus
-- a Gate-0.5-verified provider-native movement fact. A webhook point alone must
-- never create this row.
CREATE TABLE IF NOT EXISTS clean.airborne_eligibility_evidence (
  flight_instance_id TEXT PRIMARY KEY,
  population_query_id TEXT NOT NULL,
  evidence_source TEXT NOT NULL,
  movement_milestone TEXT NOT NULL,
  evidence_observed_utc TIMESTAMPTZ NOT NULL,
  evidence_available_at TIMESTAMPTZ NOT NULL,
  provider_api_version TEXT,
  evidence_hash TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_airborne_eligibility_verified
  ON clean.airborne_eligibility_evidence (verified, evidence_available_at);

COMMIT;
