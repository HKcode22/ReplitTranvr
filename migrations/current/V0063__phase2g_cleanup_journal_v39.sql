-- V0063: logged, metadata-only Stage-1 cleanup recovery journal.
-- Forward-only migration. Do not apply without explicit DB approval.
-- No raw provider content, subscription IDs, or credentials are stored.

CREATE TABLE clean.phase2g_cleanup_journal_v39 (
  session_id UUID PRIMARY KEY,
  probe_id INTEGER NOT NULL CHECK (probe_id > 0),
  deletion_run_id TEXT NOT NULL UNIQUE
    CHECK (length(deletion_run_id) BETWEEN 8 AND 160),
  request_sha256 TEXT NOT NULL
    CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  expected_live_blobs INTEGER NOT NULL
    CHECK (expected_live_blobs BETWEEN 0 AND 1000),
  state TEXT NOT NULL DEFAULT 'STARTED'
    CHECK (state IN ('STARTED', 'VERIFIED')),
  deleted_blobs INTEGER,
  deleted_runtime_rows INTEGER,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at_utc TIMESTAMPTZ,
  CONSTRAINT phase2g_cleanup_journal_shape CHECK (
    (
      state = 'STARTED'
      AND verified_at_utc IS NULL
      AND deleted_blobs IS NULL
      AND deleted_runtime_rows IS NULL
    )
    OR
    (
      state = 'VERIFIED'
      AND verified_at_utc IS NOT NULL
      AND verified_at_utc >= created_at_utc
      AND deleted_blobs = expected_live_blobs
      AND deleted_runtime_rows >= 1
    )
  )
);

CREATE FUNCTION clean.guard_phase2g_cleanup_journal_v39()
RETURNS trigger
LANGUAGE plpgsql
AS $phase2g$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Phase2G cleanup journal cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'STARTED' THEN
      RAISE EXCEPTION 'Phase2G cleanup journal must start as STARTED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state = 'VERIFIED' THEN
    RAISE EXCEPTION 'verified Phase2G cleanup journal is immutable';
  END IF;

  IF (
    NEW.session_id,
    NEW.probe_id,
    NEW.deletion_run_id,
    NEW.request_sha256,
    NEW.expected_live_blobs,
    NEW.created_at_utc
  ) IS DISTINCT FROM (
    OLD.session_id,
    OLD.probe_id,
    OLD.deletion_run_id,
    OLD.request_sha256,
    OLD.expected_live_blobs,
    OLD.created_at_utc
  ) THEN
    RAISE EXCEPTION 'Phase2G cleanup journal identity is immutable';
  END IF;

  IF OLD.state = 'STARTED' AND NEW.state = 'VERIFIED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid Phase2G cleanup journal transition';
END;
$phase2g$;

CREATE TRIGGER phase2g_cleanup_journal_guard_v39
BEFORE INSERT OR UPDATE OR DELETE
ON clean.phase2g_cleanup_journal_v39
FOR EACH ROW
EXECUTE FUNCTION clean.guard_phase2g_cleanup_journal_v39();
