BEGIN;

CREATE TABLE IF NOT EXISTS clean.retention_tombstone (
  id BIGSERIAL PRIMARY KEY,
  surface TEXT NOT NULL CHECK (surface IN ('primary','replica','backup','object','log')),
  record_id TEXT NOT NULL,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  expired_at TIMESTAMPTZ NOT NULL,
  tombstoned_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_hash TEXT NOT NULL,
  CONSTRAINT retention_tombstone_unique UNIQUE (surface, record_id)
);

CREATE OR REPLACE FUNCTION clean.reject_retention_tombstone_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'retention tombstones are append-only';
END $$;

DROP TRIGGER IF EXISTS trg_retention_tombstone_immutable ON clean.retention_tombstone;
CREATE TRIGGER trg_retention_tombstone_immutable
  BEFORE UPDATE OR DELETE ON clean.retention_tombstone
  FOR EACH ROW EXECUTE FUNCTION clean.reject_retention_tombstone_mutation();

COMMIT;
