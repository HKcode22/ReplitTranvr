-- V3.9 prerequisite-P: provider-native account/subscription observations in
-- project ledgers are raw provider content even when the surrounding row is a
-- project-owned experimental/audit record.
--
-- Keep project-derived counters/scores/reconciliation fields. Expire only the
-- provider-native values under the raw-provider clock.

BEGIN;

ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS provider_account_expired_at_utc TIMESTAMPTZ;

ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS provider_account_expired_at_utc TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION clean.guard_v39_provider_account_expiry()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  content_present BOOLEAN := false;
BEGIN
  IF TG_TABLE_NAME = 'adb_collection_batches' THEN
    content_present :=
      NEW.balance_before IS NOT NULL OR
      NEW.balance_after IS NOT NULL OR
      NEW.credits_consumed_actual IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'adb_anchor_probe' THEN
    content_present :=
      NEW.subscription_id IS NOT NULL OR
      NEW.balance_before IS NOT NULL OR
      NEW.balance_after IS NOT NULL;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.provider_account_expired_at_utc IS NOT NULL THEN
    IF NEW.provider_account_expired_at_utc IS DISTINCT FROM OLD.provider_account_expired_at_utc
       OR content_present THEN
      RAISE EXCEPTION 'expired V3.9 provider account scope cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.provider_account_expired_at_utc IS NOT NULL AND content_present THEN
    RAISE EXCEPTION 'provider_account_expired_at_utc requires protected provider account fields to be cleared';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_adb_collection_batches_provider_account_guard ON clean.adb_collection_batches;
CREATE TRIGGER trg_adb_collection_batches_provider_account_guard
  BEFORE UPDATE ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_account_expiry();

DROP TRIGGER IF EXISTS trg_adb_anchor_probe_provider_account_guard ON clean.adb_anchor_probe;
CREATE TRIGGER trg_adb_anchor_probe_provider_account_guard
  BEFORE UPDATE ON clean.adb_anchor_probe
  FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_account_expiry();

COMMIT;
