-- V3.9 prerequisite-P: extend expiry from obvious raw blobs to the full
-- provider-bearing scope of the ingress/latest-state compatibility layers.
--
-- This migration deliberately does NOT classify canonical identity, semantic
-- event, FIDS-population, or airborne stores as Derived Works. Those remain
-- separately BLOCKED in providerContentInventory_v39 until their exact expiry
-- or transformation owners are implemented and proven.

BEGIN;

ALTER TABLE clean.raw_delivery
  ADD COLUMN IF NOT EXISTS provider_content_expired_at_utc timestamptz;

ALTER TABLE clean.raw_delivery_item
  ADD COLUMN IF NOT EXISTS provider_content_expired_at_utc timestamptz;

ALTER TABLE clean.processing_attempt
  ADD COLUMN IF NOT EXISTS provider_content_expired_at_utc timestamptz;

ALTER TABLE clean.adb_ingest_events
  ADD COLUMN IF NOT EXISTS provider_content_expired_at_utc timestamptz;

-- Full-scope expiry is one-way. Before expiry the legacy owners may continue
-- their normal lifecycle; once provider_content_expired_at_utc is stamped,
-- provider-bearing columns cannot be restored and the stamp cannot be changed.
CREATE OR REPLACE FUNCTION clean.guard_v39_provider_scope_expiry()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  content_present boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'raw_delivery' THEN
    content_present :=
      NEW.raw_body IS NOT NULL OR
      NEW.http_request_headers IS NOT NULL OR
      NEW.http_response_body IS NOT NULL OR
      NEW.http_path IS NOT NULL OR
      NEW.error_message IS NOT NULL OR
      NEW.subscription_id IS NOT NULL OR
      NEW.provider_published_utc IS NOT NULL OR
      NEW.adb_delivery_id IS NOT NULL OR
      NEW.adb_cost_credits IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'raw_delivery_item' THEN
    content_present :=
      NEW.raw_item IS NOT NULL OR
      NEW.flight_number IS NOT NULL OR
      NEW.carrier_iata IS NOT NULL OR
      NEW.carrier_icao IS NOT NULL OR
      NEW.status IS NOT NULL OR
      NEW.status_code IS NOT NULL OR
      NEW.last_updated_utc IS NOT NULL OR
      NEW.departure_scheduled_utc IS NOT NULL OR
      NEW.arrival_scheduled_utc IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'processing_attempt' THEN
    content_present :=
      NEW.validation_errors IS NOT NULL OR
      NEW.parse_errors IS NOT NULL OR
      NEW.storage_errors IS NOT NULL OR
      NEW.error_message IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'adb_ingest_events' THEN
    content_present :=
      NEW.raw_payload IS NOT NULL OR
      NEW.http_metadata IS NOT NULL OR
      NEW.error IS NOT NULL OR
      NEW.provider_published_utc IS NOT NULL;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.provider_content_expired_at_utc IS NOT NULL THEN
    IF NEW.provider_content_expired_at_utc IS DISTINCT FROM OLD.provider_content_expired_at_utc
       OR content_present THEN
      RAISE EXCEPTION 'expired V3.9 provider scope cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.provider_content_expired_at_utc IS NOT NULL AND content_present THEN
    RAISE EXCEPTION 'provider_content_expired_at_utc requires all protected provider fields to be cleared';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_raw_delivery_provider_scope_guard ON clean.raw_delivery;
CREATE TRIGGER trg_raw_delivery_provider_scope_guard
  BEFORE UPDATE ON clean.raw_delivery
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();

DROP TRIGGER IF EXISTS trg_raw_delivery_item_provider_scope_guard ON clean.raw_delivery_item;
CREATE TRIGGER trg_raw_delivery_item_provider_scope_guard
  BEFORE UPDATE ON clean.raw_delivery_item
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();

DROP TRIGGER IF EXISTS trg_processing_attempt_provider_scope_guard ON clean.processing_attempt;
CREATE TRIGGER trg_processing_attempt_provider_scope_guard
  BEFORE UPDATE ON clean.processing_attempt
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();

DROP TRIGGER IF EXISTS trg_adb_ingest_events_provider_scope_guard ON clean.adb_ingest_events;
CREATE TRIGGER trg_adb_ingest_events_provider_scope_guard
  BEFORE UPDATE ON clean.adb_ingest_events
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();

COMMIT;
