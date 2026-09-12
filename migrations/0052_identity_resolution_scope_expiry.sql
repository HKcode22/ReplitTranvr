-- V3.9 prerequisite-P: clean.webhook_identity_resolution is a project audit
-- ledger, but resolved rows also copy provider-derived identity/service-date
-- values. Preserve the audit decision and raw-item hash while allowing exactly
-- one retention transition that clears those copied identity fields.

BEGIN;

ALTER TABLE clean.webhook_identity_resolution
  ADD COLUMN IF NOT EXISTS provider_identity_expired_at_utc TIMESTAMPTZ;

-- Replace the original resolved/quarantined row-shape CHECK so a resolved row
-- may enter the retention-expired shape only after its expiry stamp is set.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid='clean.webhook_identity_resolution'::regclass
     AND contype='c'
     AND pg_get_constraintdef(oid) LIKE '%resolution_status%resolved%flight_instance_id%initial_service_date%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE clean.webhook_identity_resolution DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE clean.webhook_identity_resolution
  DROP CONSTRAINT IF EXISTS webhook_identity_resolution_retention_shape;
ALTER TABLE clean.webhook_identity_resolution
  ADD CONSTRAINT webhook_identity_resolution_retention_shape CHECK (
    (
      resolution_status='resolved'
      AND reason IS NULL
      AND (
        (provider_identity_expired_at_utc IS NULL AND flight_instance_id IS NOT NULL AND initial_service_date IS NOT NULL)
        OR
        (provider_identity_expired_at_utc IS NOT NULL AND flight_instance_id IS NULL AND initial_service_date IS NULL)
      )
    )
    OR
    (
      resolution_status='quarantined'
      AND flight_instance_id IS NULL
      AND initial_service_date IS NULL
      AND reason IS NOT NULL
      AND provider_identity_expired_at_utc IS NULL
    )
  );

CREATE OR REPLACE FUNCTION clean.guard_webhook_identity_resolution_retention()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'webhook identity resolution ledger is append-only';
  END IF;

  -- Already-expired rows are fully immutable.
  IF OLD.provider_identity_expired_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'expired webhook identity resolution row is immutable';
  END IF;

  -- The only permitted UPDATE is the one-way retention transition on a
  -- previously-resolved row. Every audit/provenance field must remain exact.
  IF OLD.resolution_status='resolved'
     AND OLD.flight_instance_id IS NOT NULL
     AND OLD.initial_service_date IS NOT NULL
     AND NEW.flight_instance_id IS NULL
     AND NEW.initial_service_date IS NULL
     AND NEW.provider_identity_expired_at_utc IS NOT NULL
     AND NEW.resolution_id IS NOT DISTINCT FROM OLD.resolution_id
     AND NEW.delivery_id IS NOT DISTINCT FROM OLD.delivery_id
     AND NEW.item_index IS NOT DISTINCT FROM OLD.item_index
     AND NEW.raw_item_sha256 IS NOT DISTINCT FROM OLD.raw_item_sha256
     AND NEW.resolution_status IS NOT DISTINCT FROM OLD.resolution_status
     AND NEW.reason IS NOT DISTINCT FROM OLD.reason
     AND NEW.resolved_at_utc IS NOT DISTINCT FROM OLD.resolved_at_utc
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'webhook identity resolution ledger is append-only except one-way provider identity expiry';
END $$;

DROP TRIGGER IF EXISTS trg_webhook_identity_resolution_immutable ON clean.webhook_identity_resolution;
CREATE TRIGGER trg_webhook_identity_resolution_immutable
  BEFORE UPDATE OR DELETE ON clean.webhook_identity_resolution
  FOR EACH ROW EXECUTE FUNCTION clean.guard_webhook_identity_resolution_retention();

COMMIT;
