-- V0077 STAGED ONLY, not auto-applied; NO production installation or grants.
-- Forward-only metadata binding between V0076 PHYSICAL attempt reservation
-- and an actually retained original clean.fids_query_response row.
--
-- This protects exact source hash, prior reservation and historical cutoff
-- but does not independently certify source rights, provider-native scheduled
-- T, actual-only wheels-off, physical unique flight scope, or initial allowed
-- query parameters from a separately hash-pinned frozen manifest. A rights SHA
-- is NOT permission. This table alone cannot promote any Gate 5 science.
--
-- Requires B0062 and V0076 installed in disposable/independently reviewed DB.
-- Never run against the live science database without separate staged review,
-- exact role/default ACL audit and prospective lawful source design.

CREATE TABLE clean.phase4_g5_fids_original_binding_v39 (
  population_query_id UUID PRIMARY KEY
    REFERENCES clean.fids_query_response(population_query_id),
  expected_reservation_sha256 TEXT NOT NULL UNIQUE
    REFERENCES clean.phase4_g5_fids_physical_attempt_v39(expected_reservation_sha256),
  query_digest TEXT NOT NULL
    REFERENCES clean.phase4_g5_fids_allowed_query_v39(query_digest),
  manifest_sha256 TEXT NOT NULL
    REFERENCES clean.phase4_g5_fids_cohort_budget_v39(manifest_sha256),
  original_response_sha256 TEXT NOT NULL
    CHECK (original_response_sha256 ~ '^[0-9a-f]{64}$'),
  -- Independently reviewed rights must be verified out-of-band BEFORE INSERT;
  -- the DB checks only shape and a conservative expiry bound.
  rights_review_artifact_sha256 TEXT NOT NULL
    CHECK (rights_review_artifact_sha256 ~ '^[0-9a-f]{64}$'),
  source_use_expires_at_utc TIMESTAMPTZ NOT NULL,
  bound_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT phase4_g5_fids_binding_source_expiry_v39 CHECK (
    source_use_expires_at_utc > bound_at_utc
  )
);

CREATE INDEX phase4_g5_fids_binding_manifest_idx_v39
 ON clean.phase4_g5_fids_original_binding_v39(manifest_sha256,query_digest);

CREATE FUNCTION clean.phase4_g5_check_original_binding_v39()
 RETURNS TRIGGER LANGUAGE plpgsql
 SET search_path=pg_catalog,clean
AS $v0077$
DECLARE
 v_attempt RECORD;
 v_source RECORD;
BEGIN
 -- Caller-supplied manifest and hash cannot substitute for a physical
 -- committed attempt in a trusted frozen V0076 owner/query ledger.
 SELECT a.github_run_id,a.committed_at_utc,a.query_digest,
        q.owner_digest,q.planned_dispatch_utc,q.hard_latest_dispatch_utc,
        q.prediction_cutoff_utc,o.manifest_sha256,o.github_run_id AS owner_run_id
 INTO v_attempt
 FROM clean.phase4_g5_fids_physical_attempt_v39 a
 JOIN clean.phase4_g5_fids_allowed_query_v39 q
  ON q.query_digest=a.query_digest
 JOIN clean.phase4_g5_fids_physical_owner_v39 o
  ON o.owner_digest=q.owner_digest
 WHERE a.expected_reservation_sha256=NEW.expected_reservation_sha256;

 IF NOT FOUND OR v_attempt.query_digest IS DISTINCT FROM NEW.query_digest
    OR v_attempt.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256
    OR v_attempt.github_run_id IS DISTINCT FROM v_attempt.owner_run_id
    OR v_attempt.committed_at_utc<v_attempt.planned_dispatch_utc
    OR v_attempt.committed_at_utc>v_attempt.hard_latest_dispatch_utc THEN
  RAISE EXCEPTION 'P4_G5_V0077_NO_MATCHING_COMMITTED_PHYSICAL_OWNER';
 END IF;

 SELECT q.population_query_id,q.source_airport_icao,q.query_direction,
  q.service_window_start_utc,q.service_window_end_utc,
  q.fids_retrieval_utc,q.available_at,q.response_hash,q.raw_payload,
  q.raw_expired_at_utc
 INTO v_source FROM clean.fids_query_response q
 WHERE q.population_query_id=NEW.population_query_id;

 IF NOT FOUND OR v_source.raw_payload IS NULL
    OR v_source.raw_expired_at_utc IS NOT NULL
    OR v_source.query_direction<>'Departure'
    OR v_source.response_hash IS NULL
    OR v_source.response_hash IS DISTINCT FROM NEW.original_response_sha256
    OR v_source.fids_retrieval_utc<v_attempt.committed_at_utc
    OR v_source.available_at<v_source.fids_retrieval_utc
    OR v_source.available_at>v_attempt.prediction_cutoff_utc
    OR v_source.available_at>clock_timestamp()
    OR NEW.bound_at_utc<v_source.available_at
    OR NEW.source_use_expires_at_utc>v_source.available_at+INTERVAL '7 days'
    OR NEW.source_use_expires_at_utc>v_attempt.prediction_cutoff_utc+INTERVAL '7 days'
 THEN
  RAISE EXCEPTION 'P4_G5_V0077_ORIGINAL_SOURCE_HASH_CLOCK_OR_EXPIRY_HOLD';
 END IF;

 -- The airport/service window are fields in the original source and can be
 -- confirmed by a separate reviewed frozen-grid read. V0076 itself stores
 -- query digests but not a hashed canonical airport+window request frame;
 -- do NOT represent this trigger as a full manifest-to-source contract.
 RETURN NEW;
END
$v0077$;

CREATE TRIGGER phase4_g5_fids_original_binding_ins_v39
 BEFORE INSERT ON clean.phase4_g5_fids_original_binding_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase4_g5_check_original_binding_v39();

-- Immutable metadata once bound. Retention owner MAY delete at or before
-- expiry through a separate reviewed privileged cleanup; no row may be
-- rewritten to enlarge rights. No retention job is enabled by this file.
CREATE FUNCTION clean.phase4_g5_original_binding_immutable_update_v39()
 RETURNS TRIGGER LANGUAGE plpgsql
 SET search_path=pg_catalog,clean
AS $imm$
BEGIN
 RAISE EXCEPTION 'P4_G5_V0077_ORIGINAL_BINDING_UPDATE_FORBIDDEN';
END
$imm$;
CREATE TRIGGER phase4_g5_fids_original_binding_update_v39
 BEFORE UPDATE ON clean.phase4_g5_fids_original_binding_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase4_g5_original_binding_immutable_update_v39();

REVOKE ALL ON clean.phase4_g5_fids_original_binding_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase4_g5_check_original_binding_v39()
 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase4_g5_original_binding_immutable_update_v39()
 FROM PUBLIC;

-- No grants to a production worker, no INSERT operator, no paid source,
-- no source bytes copied and no changes to existing B0062/V0076 content.
