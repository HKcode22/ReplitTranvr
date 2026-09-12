-- V3.9 prerequisite-P: PITR-independent provider-content storage boundary.
--
-- IMPORTANT: this table contains ONLY project-owned storage metadata and hashes.
-- Provider plaintext must live on the separately verified provider blob surface,
-- never in this ledger. PostgreSQL/PITR may retain this metadata indefinitely
-- because it cannot by itself reconstruct the deleted provider object.

BEGIN;

CREATE TABLE IF NOT EXISTS clean.provider_content_blob_ref (
  blob_ref_id UUID PRIMARY KEY,
  storage_kind TEXT NOT NULL DEFAULT 'replit_app_storage'
    CHECK (storage_kind = 'replit_app_storage'),
  contract_version TEXT NOT NULL DEFAULT 'provider-blob-contract-v39@1.0.0'
    CHECK (contract_version = 'provider-blob-contract-v39@1.0.0'),
  object_name TEXT NOT NULL UNIQUE
    CHECK (object_name ~ '^v39/provider/(raw_provider_content|live_fids_cache)/[0-9a-f]{2}/[0-9a-f-]{36}\.blob$'),
  content_class TEXT NOT NULL
    CHECK (content_class IN ('raw_provider_content','live_fids_cache')),
  content_sha256 TEXT NOT NULL
    CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  content_bytes BIGINT NOT NULL CHECK (content_bytes >= 0),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('webhook','fids')),
  source_record_id TEXT NOT NULL,
  persisted_at_utc TIMESTAMPTZ NOT NULL,
  retention_hours INTEGER NOT NULL CHECK (
    (content_class='raw_provider_content' AND retention_hours BETWEEN 1 AND 168)
    OR
    (content_class='live_fids_cache' AND retention_hours BETWEEN 1 AND 24)
  ),
  expires_at_utc TIMESTAMPTZ NOT NULL,
  deleted_at_utc TIMESTAMPTZ,
  deletion_verified_at_utc TIMESTAMPTZ,
  deletion_run_id TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT provider_blob_expiry_exact CHECK (
    expires_at_utc = persisted_at_utc + retention_hours * interval '1 hour'
  ),
  CONSTRAINT provider_blob_delete_shape CHECK (
    (deleted_at_utc IS NULL AND deletion_verified_at_utc IS NULL AND deletion_run_id IS NULL)
    OR
    (deleted_at_utc IS NOT NULL AND deletion_verified_at_utc IS NOT NULL AND deletion_run_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_provider_blob_expiry_pending
  ON clean.provider_content_blob_ref (expires_at_utc, blob_ref_id)
  WHERE deletion_verified_at_utc IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_blob_source_record
  ON clean.provider_content_blob_ref (source_kind, source_record_id);

-- Opaque metadata pointers only. These columns do not authorize plaintext to
-- remain in the legacy provider-bearing columns; later cutover code must prove
-- those columns are NULL/non-content before P may PASS.
ALTER TABLE clean.raw_delivery
  ADD COLUMN IF NOT EXISTS provider_blob_ref_id UUID
    REFERENCES clean.provider_content_blob_ref(blob_ref_id);
ALTER TABLE clean.fids_query_response
  ADD COLUMN IF NOT EXISTS provider_blob_ref_id UUID
    REFERENCES clean.provider_content_blob_ref(blob_ref_id);

CREATE INDEX IF NOT EXISTS idx_raw_delivery_provider_blob_ref
  ON clean.raw_delivery(provider_blob_ref_id)
  WHERE provider_blob_ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fids_query_provider_blob_ref
  ON clean.fids_query_response(provider_blob_ref_id)
  WHERE provider_blob_ref_id IS NOT NULL;

CREATE OR REPLACE FUNCTION clean.guard_provider_content_blob_ref()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'provider content blob metadata is append-only';
  END IF;

  IF OLD.deletion_verified_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'verified provider content blob tombstone is immutable';
  END IF;

  -- Exactly one state transition is allowed: pending object -> externally
  -- deleted and verified absent. Every identity/hash/TTL field stays exact.
  IF OLD.deleted_at_utc IS NULL
     AND OLD.deletion_verified_at_utc IS NULL
     AND OLD.deletion_run_id IS NULL
     AND NEW.deleted_at_utc IS NOT NULL
     AND NEW.deletion_verified_at_utc IS NOT NULL
     AND NEW.deletion_run_id IS NOT NULL
     AND NEW.blob_ref_id IS NOT DISTINCT FROM OLD.blob_ref_id
     AND NEW.storage_kind IS NOT DISTINCT FROM OLD.storage_kind
     AND NEW.contract_version IS NOT DISTINCT FROM OLD.contract_version
     AND NEW.object_name IS NOT DISTINCT FROM OLD.object_name
     AND NEW.content_class IS NOT DISTINCT FROM OLD.content_class
     AND NEW.content_sha256 IS NOT DISTINCT FROM OLD.content_sha256
     AND NEW.content_bytes IS NOT DISTINCT FROM OLD.content_bytes
     AND NEW.source_kind IS NOT DISTINCT FROM OLD.source_kind
     AND NEW.source_record_id IS NOT DISTINCT FROM OLD.source_record_id
     AND NEW.persisted_at_utc IS NOT DISTINCT FROM OLD.persisted_at_utc
     AND NEW.retention_hours IS NOT DISTINCT FROM OLD.retention_hours
     AND NEW.expires_at_utc IS NOT DISTINCT FROM OLD.expires_at_utc
     AND NEW.created_at_utc IS NOT DISTINCT FROM OLD.created_at_utc
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'provider content blob metadata is immutable except one-way verified deletion';
END $$;

DROP TRIGGER IF EXISTS trg_provider_content_blob_ref_immutable ON clean.provider_content_blob_ref;
CREATE TRIGGER trg_provider_content_blob_ref_immutable
  BEFORE UPDATE OR DELETE ON clean.provider_content_blob_ref
  FOR EACH ROW EXECUTE FUNCTION clean.guard_provider_content_blob_ref();

COMMIT;
