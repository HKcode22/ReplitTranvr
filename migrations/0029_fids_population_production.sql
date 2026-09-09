BEGIN;

CREATE TABLE IF NOT EXISTS clean.fids_query_response (
  population_query_id UUID PRIMARY KEY,
  source_airport_icao TEXT NOT NULL,
  query_direction TEXT NOT NULL CHECK (query_direction IN ('Departure','Arrival','Both')),
  service_window_start_utc TIMESTAMPTZ NOT NULL,
  service_window_end_utc TIMESTAMPTZ NOT NULL,
  from_local TEXT NOT NULL,
  to_local TEXT NOT NULL,
  airport_iana_timezone TEXT NOT NULL,
  fids_retrieval_utc TIMESTAMPTZ NOT NULL,
  raw_persisted_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ NOT NULL,
  response_hash TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  provider_api_version TEXT NOT NULL,
  fids_protocol_version TEXT NOT NULL,
  openapi_sha256 TEXT NOT NULL,
  CONSTRAINT fids_query_response_hash_len CHECK (length(response_hash) = 64),
  CONSTRAINT fids_query_response_clock_order CHECK (fids_retrieval_utc <= raw_persisted_at_utc AND raw_persisted_at_utc <= available_at)
);

ALTER TABLE clean.flight_population
  ADD COLUMN IF NOT EXISTS population_query_id UUID REFERENCES clean.fids_query_response(population_query_id),
  ADD COLUMN IF NOT EXISTS query_direction TEXT,
  ADD COLUMN IF NOT EXISTS population_role TEXT,
  ADD COLUMN IF NOT EXISTS from_local TEXT,
  ADD COLUMN IF NOT EXISTS to_local TEXT,
  ADD COLUMN IF NOT EXISTS airport_iana_timezone TEXT,
  ADD COLUMN IF NOT EXISTS scope_classification TEXT,
  ADD COLUMN IF NOT EXISTS codeshare_resolution_status TEXT,
  ADD COLUMN IF NOT EXISTS fids_retrieval_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_hash TEXT,
  ADD COLUMN IF NOT EXISTS canonical_flight_instance_id TEXT,
  ADD COLUMN IF NOT EXISTS analytic_identity_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_api_version TEXT,
  ADD COLUMN IF NOT EXISTS fids_protocol_version TEXT,
  ADD COLUMN IF NOT EXISTS openapi_sha256 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS flight_population_observation_key
  ON clean.flight_population (population_query_id, analytic_identity_id, population_role);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flight_population_fids_complete'
  ) THEN
    ALTER TABLE clean.flight_population
      ADD CONSTRAINT flight_population_fids_complete CHECK (
        source_type <> 'fids' OR (
          population_query_id IS NOT NULL AND query_direction IS NOT NULL AND population_role IS NOT NULL
          AND from_local IS NOT NULL AND to_local IS NOT NULL AND airport_iana_timezone IS NOT NULL
          AND scope_classification IS NOT NULL AND codeshare_resolution_status IS NOT NULL
          AND fids_retrieval_utc IS NOT NULL AND available_at IS NOT NULL AND response_hash IS NOT NULL
          AND analytic_identity_id IS NOT NULL AND provider_api_version IS NOT NULL
          AND fids_protocol_version IS NOT NULL AND openapi_sha256 IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION clean.reject_fids_observation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'FIDS observations are append-only';
END $$;

DROP TRIGGER IF EXISTS trg_fids_query_response_immutable ON clean.fids_query_response;
CREATE TRIGGER trg_fids_query_response_immutable
  BEFORE UPDATE OR DELETE ON clean.fids_query_response
  FOR EACH ROW EXECUTE FUNCTION clean.reject_fids_observation_mutation();

DROP TRIGGER IF EXISTS trg_flight_population_fids_immutable ON clean.flight_population;
CREATE TRIGGER trg_flight_population_fids_immutable
  BEFORE UPDATE OR DELETE ON clean.flight_population
  FOR EACH ROW WHEN (OLD.source_type = 'fids')
  EXECUTE FUNCTION clean.reject_fids_observation_mutation();

CREATE TABLE IF NOT EXISTS clean.adb_rest_budget_control (
  category TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  cap_units INTEGER NOT NULL CHECK (cap_units >= 0),
  used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (used_units <= cap_units)
);

CREATE TABLE IF NOT EXISTS clean.adb_rest_attempt_ledger (
  reservation_id UUID PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  category TEXT NOT NULL,
  units INTEGER NOT NULL CHECK (units > 0),
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  reserved_at TIMESTAMPTZ NOT NULL
);

COMMIT;
