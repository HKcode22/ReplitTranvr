-- 0042_webhook_identity_resolution_ledger.sql
-- V3.9-f.8 Phase 0D/0E: raw item identity is immutable, while canonical
-- resolution occurs after raw durability. Preserve that decision in its own
-- append-only ledger so ambiguous records remain auditable/countable without
-- mutating raw_delivery_item.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.webhook_identity_resolution (
  resolution_id BIGSERIAL PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES clean.raw_delivery(delivery_id),
  item_index INTEGER NOT NULL CHECK (item_index >= 0),
  raw_item_sha256 TEXT NOT NULL CHECK (raw_item_sha256 ~ '^[0-9a-f]{64}$'),
  resolution_status TEXT NOT NULL CHECK (resolution_status IN ('resolved','quarantined')),
  flight_instance_id TEXT,
  initial_service_date DATE,
  reason TEXT,
  resolved_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(delivery_id,item_index),
  CHECK (
    (resolution_status='resolved' AND flight_instance_id IS NOT NULL AND initial_service_date IS NOT NULL AND reason IS NULL)
    OR
    (resolution_status='quarantined' AND flight_instance_id IS NULL AND reason IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_webhook_identity_resolution_flight
  ON clean.webhook_identity_resolution(flight_instance_id)
  WHERE flight_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_identity_resolution_status
  ON clean.webhook_identity_resolution(resolution_status,resolved_at_utc);

CREATE OR REPLACE FUNCTION clean.reject_webhook_identity_resolution_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'webhook identity resolution ledger is append-only';
END $$;
DROP TRIGGER IF EXISTS trg_webhook_identity_resolution_immutable ON clean.webhook_identity_resolution;
CREATE TRIGGER trg_webhook_identity_resolution_immutable
  BEFORE UPDATE OR DELETE ON clean.webhook_identity_resolution
  FOR EACH ROW EXECUTE FUNCTION clean.reject_webhook_identity_resolution_mutation();

COMMIT;
