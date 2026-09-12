-- V3.9 Phase 2 prerequisite-P: retention-safe provider content expiry.
-- Preserve stable IDs, hashes, timestamps and lineage; expire provider content only.

ALTER TABLE clean.raw_delivery
  ALTER COLUMN raw_body DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;

ALTER TABLE clean.raw_delivery_item
  ALTER COLUMN raw_item DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;

ALTER TABLE clean.adb_ingest_events
  ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;

ALTER TABLE clean.flight_data_pre_post
  ALTER COLUMN payload_json DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payload_sha256 text,
  ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;

ALTER TABLE clean.fids_query_response
  ALTER COLUMN raw_payload DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;

-- Legacy compatibility table: expire old raw bodies if the table exists, but
-- do not make it part of new V3.9 provider ingestion.
DO $$
BEGIN
  IF to_regclass('clean.monitored_flights_v2') IS NOT NULL THEN
    ALTER TABLE clean.monitored_flights_v2
      ADD COLUMN IF NOT EXISTS raw_api_sha256 text,
      ADD COLUMN IF NOT EXISTS raw_expired_at_utc timestamptz;
  END IF;
END $$;

ALTER TABLE clean.retention_tombstone
  ADD COLUMN IF NOT EXISTS content_class text,
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS content_columns text[],
  ADD COLUMN IF NOT EXISTS retention_rule text,
  ADD COLUMN IF NOT EXISTS expiry_run_id text,
  ADD COLUMN IF NOT EXISTS deletion_mode text;

-- FIDS observations remain append-only except for one compliance transition:
-- raw_payload non-NULL -> NULL with a primary-surface tombstone already present.
-- Every other UPDATE/DELETE remains rejected, including flight_population rows.
CREATE OR REPLACE FUNCTION clean.reject_fids_observation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'fids_query_response' AND TG_OP = 'UPDATE' THEN
    IF OLD.raw_payload IS NOT NULL
       AND NEW.raw_payload IS NULL
       AND OLD.raw_expired_at_utc IS NULL
       AND NEW.raw_expired_at_utc IS NOT NULL
       AND (to_jsonb(NEW) - ARRAY['raw_payload','raw_expired_at_utc'])
           = (to_jsonb(OLD) - ARRAY['raw_payload','raw_expired_at_utc'])
       AND EXISTS (
         SELECT 1
           FROM clean.retention_tombstone t
          WHERE t.surface = 'primary'
            AND t.record_id = 'fids_query_response:' || OLD.population_query_id::text || ':raw_payload'
       )
    THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'FIDS observations are append-only except audited raw-content expiry';
END $$;

-- Database-level guards make content expiry one-way. New observations/upserts
-- may populate a row that has never been expired, but expired content cannot be
-- silently restored without a new logical observation/row.
CREATE OR REPLACE FUNCTION clean.guard_v39_raw_expiry_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_content jsonb;
  new_content jsonb;
BEGIN
  IF TG_TABLE_NAME = 'raw_delivery' THEN
    old_content := OLD.raw_body;
    new_content := NEW.raw_body;
  ELSIF TG_TABLE_NAME = 'raw_delivery_item' THEN
    old_content := OLD.raw_item;
    new_content := NEW.raw_item;
  ELSIF TG_TABLE_NAME = 'flight_data_pre_post' THEN
    old_content := OLD.payload_json;
    new_content := NEW.payload_json;
  ELSIF TG_TABLE_NAME = 'adb_ingest_events' THEN
    old_content := OLD.raw_payload;
    new_content := NEW.raw_payload;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.raw_expired_at_utc IS NOT NULL THEN
    IF NEW.raw_expired_at_utc IS DISTINCT FROM OLD.raw_expired_at_utc OR new_content IS NOT NULL THEN
      RAISE EXCEPTION 'expired V3.9 provider content cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF old_content IS NOT NULL AND new_content IS NULL AND NEW.raw_expired_at_utc IS NULL THEN
    RAISE EXCEPTION 'provider content may be cleared only with raw_expired_at_utc';
  END IF;
  IF NEW.raw_expired_at_utc IS NOT NULL AND old_content IS NOT NULL AND new_content IS NOT NULL THEN
    RAISE EXCEPTION 'raw_expired_at_utc requires provider content to be cleared';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_raw_delivery_retention_guard ON clean.raw_delivery;
CREATE TRIGGER trg_raw_delivery_retention_guard
  BEFORE UPDATE ON clean.raw_delivery
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();

DROP TRIGGER IF EXISTS trg_raw_delivery_item_retention_guard ON clean.raw_delivery_item;
CREATE TRIGGER trg_raw_delivery_item_retention_guard
  BEFORE UPDATE ON clean.raw_delivery_item
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();

DROP TRIGGER IF EXISTS trg_flight_data_pre_post_retention_guard ON clean.flight_data_pre_post;
CREATE TRIGGER trg_flight_data_pre_post_retention_guard
  BEFORE UPDATE ON clean.flight_data_pre_post
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();

DROP TRIGGER IF EXISTS trg_adb_ingest_events_retention_guard ON clean.adb_ingest_events;
CREATE TRIGGER trg_adb_ingest_events_retention_guard
  BEFORE UPDATE ON clean.adb_ingest_events
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();
