-- 0060_phase2g_physical_flight_metrics.sql
--
-- V3.9-f.8 §9.1 correction:
-- Stage-1/2 prepaid metrics must use confirmed physical flight_instance_id,
-- explicit identity ambiguity bounds, and confirmed compatible tail identity.
--
-- Provider-identifying working fields stay inside the EXISTING UNLOGGED
-- prepaid_probe_item_runtime surface. No new persistence/content class is
-- introduced.
--
-- Historical probe rows remain preserved with metric_contract_version NULL.
-- New corrected probes bind:
--   v39-physical-flight-instance-v1

BEGIN;

ALTER TABLE clean.prepaid_probe_item_runtime
  ADD COLUMN IF NOT EXISTS provider_flight_id TEXT,
  ADD COLUMN IF NOT EXISTS callsign TEXT,
  ADD COLUMN IF NOT EXISTS operating_carrier TEXT,
  ADD COLUMN IF NOT EXISTS operating_flight_number TEXT,
  ADD COLUMN IF NOT EXISTS origin_icao TEXT,
  ADD COLUMN IF NOT EXISTS destination_icao TEXT,
  ADD COLUMN IF NOT EXISTS origin_time_zone TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_gate_out_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_gate_in_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT,
  ADD COLUMN IF NOT EXISTS initial_service_date DATE,
  ADD COLUMN IF NOT EXISTS provisional_identity_key TEXT,
  ADD COLUMN IF NOT EXISTS codeshare_resolution_status TEXT,
  ADD COLUMN IF NOT EXISTS identity_resolution_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname =
       'prepaid_probe_item_codeshare_resolution_status_check'
       AND conrelid =
       'clean.prepaid_probe_item_runtime'::regclass
  ) THEN
    ALTER TABLE clean.prepaid_probe_item_runtime
      ADD CONSTRAINT
        prepaid_probe_item_codeshare_resolution_status_check
      CHECK (
        codeshare_resolution_status IS NULL
        OR codeshare_resolution_status IN (
          'resolved_operator',
          'resolved_marketing',
          'ambiguous_unknown'
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_physical_identity
  ON clean.prepaid_probe_item_runtime
    (session_id, flight_instance_id, received_at_utc)
  WHERE flight_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_provisional_identity
  ON clean.prepaid_probe_item_runtime
    (session_id, provisional_identity_key, received_at_utc)
  WHERE provisional_identity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_provider_flight
  ON clean.prepaid_probe_item_runtime
    (session_id, provider_flight_id)
  WHERE provider_flight_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname =
       'prepaid_probe_item_identity_resolution_status_check'
       AND conrelid =
       'clean.prepaid_probe_item_runtime'::regclass
  ) THEN
    ALTER TABLE clean.prepaid_probe_item_runtime
      ADD CONSTRAINT
        prepaid_probe_item_identity_resolution_status_check
      CHECK (
        identity_resolution_status IS NULL
        OR identity_resolution_status IN (
          'resolved',
          'quarantined'
        )
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS metric_contract_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'adb_anchor_probe_metric_contract_check'
       AND conrelid = 'clean.adb_anchor_probe'::regclass
  ) THEN
    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_metric_contract_check
      CHECK (
        metric_contract_version IS NULL
        OR metric_contract_version =
          'v39-physical-flight-instance-v1'
      ) NOT VALID;
  END IF;
END $$;

COMMIT;
