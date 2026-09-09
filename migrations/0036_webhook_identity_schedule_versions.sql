-- 0036_webhook_identity_schedule_versions.sql
-- V3.9-f.8 Phase 0D: remove route-only no-provider identity aliases and retain
-- append-only schedule-version evidence under canonical physical identities.
BEGIN;

ALTER TABLE clean.webhook_flight_identity
  ADD COLUMN IF NOT EXISTS provider_record_key TEXT,
  ADD COLUMN IF NOT EXISTS callsign TEXT;

-- Existing no-provider rows were created under a route-only alias that can
-- merge recurring daily legs. Rewrite those aliases deterministically from the
-- retained immutable first schedule evidence before production uses the new
-- resolver. Provider-ID aliases are left unchanged.
UPDATE clean.webhook_flight_identity
   SET provider_identity_alias =
       'schedule:' || operating_carrier || operating_flight_number || '|' ||
       origin_icao || '|' || original_destination_icao || '|' ||
       initial_service_date::text || '|' ||
       to_char(initial_scheduled_gate_out_utc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 WHERE provider_flight_id IS NULL
   AND provider_identity_alias NOT LIKE 'schedule:%';

CREATE INDEX IF NOT EXISTS idx_webhook_identity_route_first_schedule
  ON clean.webhook_flight_identity
     (operating_carrier, operating_flight_number, origin_icao,
      original_destination_icao, initial_service_date,
      initial_scheduled_gate_out_utc)
  WHERE provider_flight_id IS NULL;

CREATE TABLE IF NOT EXISTS clean.webhook_flight_schedule_version (
  schedule_version_pk BIGSERIAL PRIMARY KEY,
  flight_instance_id TEXT NOT NULL,
  retime_version INTEGER NOT NULL CHECK (retime_version >= 0),
  observed_scheduled_gate_out_utc TIMESTAMPTZ NOT NULL,
  current_service_date DATE NOT NULL,
  provider_identity_alias TEXT NOT NULL,
  provider_record_key TEXT,
  callsign TEXT,
  observed_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flight_instance_id, observed_scheduled_gate_out_utc),
  UNIQUE (flight_instance_id, retime_version)
);

CREATE INDEX IF NOT EXISTS idx_webhook_schedule_version_instance_time
  ON clean.webhook_flight_schedule_version
     (flight_instance_id, observed_scheduled_gate_out_utc);

-- Backfill the retained first schedule as version zero. If a database already
-- contains multiple alias rows pointing at the same canonical identity/schedule,
-- DISTINCT ON prevents duplicate version-zero rows.
INSERT INTO clean.webhook_flight_schedule_version
  (flight_instance_id, retime_version, observed_scheduled_gate_out_utc,
   current_service_date, provider_identity_alias, provider_record_key, callsign)
SELECT DISTINCT ON (flight_instance_id)
       flight_instance_id, 0, initial_scheduled_gate_out_utc,
       initial_service_date, provider_identity_alias, provider_record_key, callsign
  FROM clean.webhook_flight_identity
 ORDER BY flight_instance_id, created_at_utc ASC
ON CONFLICT DO NOTHING;

COMMIT;
