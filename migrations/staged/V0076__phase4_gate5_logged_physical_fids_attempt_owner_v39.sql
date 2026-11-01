-- V0076 STAGED ONLY, NOT AUTO-APPLIED OR A PRODUCTION PAID PERMIT.
-- Phase4 Gate5 future original FIDS: LOGGED durable irreversible physical
-- GET reservation across GitHub crash, rerun and independent horizon owners.
-- NO GRANTS. NO historical modification, provider/network call or content.
-- Human-reviewed cohort/rights/selected T and exact runtime role installer
-- are separate production admission requirements under V3.9 f.8.
CREATE TABLE clean.phase4_g5_fids_cohort_budget_v39 (
  manifest_sha256 TEXT PRIMARY KEY CHECK(manifest_sha256 ~ '^[0-9a-f]{64}$'),
  cohort_id TEXT NOT NULL UNIQUE
    CHECK(cohort_id ~ '^[A-Z][A-Z0-9_-]{7,79}$'),
  project_unit_ceiling INTEGER NOT NULL CHECK(project_unit_ceiling BETWEEN 2 AND 50000),
  reserved_units INTEGER NOT NULL DEFAULT 0 CHECK(reserved_units>=0),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT phase4_g5_budget_max_v39 CHECK(reserved_units<=project_unit_ceiling)
);

CREATE TABLE clean.phase4_g5_fids_physical_owner_v39 (
  owner_digest TEXT PRIMARY KEY CHECK(owner_digest ~ '^[0-9a-f]{64}$'),
  manifest_sha256 TEXT NOT NULL
    REFERENCES clean.phase4_g5_fids_cohort_budget_v39(manifest_sha256),
  horizon TEXT NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),
  github_run_id TEXT NOT NULL
    CHECK(github_run_id ~ '^[0-9]{5,25}$'),
  reviewed_authorization_sha256 TEXT NOT NULL
    CHECK(reviewed_authorization_sha256 ~ '^[0-9a-f]{64}$'),
  actual_github_runner_started_at_utc TIMESTAMPTZ NOT NULL,
  verified_prearm_deadline_utc TIMESTAMPTZ NOT NULL,
  first_planned_dispatch_utc TIMESTAMPTZ NOT NULL,
  last_planned_dispatch_utc TIMESTAMPTZ NOT NULL,
  hard_owner_expires_at_utc TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'PREPARED'
    CHECK(state IN ('PREPARED','ACTIVE','STOPPED')),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(manifest_sha256,horizon),
  UNIQUE(owner_digest,manifest_sha256),
  CONSTRAINT phase4_g5_owner_prearm_v39 CHECK(
    actual_github_runner_started_at_utc<=verified_prearm_deadline_utc
    AND verified_prearm_deadline_utc<first_planned_dispatch_utc
    AND first_planned_dispatch_utc<=last_planned_dispatch_utc
    AND last_planned_dispatch_utc<hard_owner_expires_at_utc
    AND hard_owner_expires_at_utc<=first_planned_dispatch_utc+INTERVAL '6 hours'
  )
);

CREATE TABLE clean.phase4_g5_fids_allowed_query_v39 (
  query_digest TEXT PRIMARY KEY CHECK(query_digest ~ '^[0-9a-f]{64}$'),
  owner_digest TEXT NOT NULL REFERENCES clean.phase4_g5_fids_physical_owner_v39(owner_digest),
  query_index INTEGER NOT NULL CHECK(query_index BETWEEN 0 AND 99),
  planned_dispatch_utc TIMESTAMPTZ NOT NULL,
  hard_latest_dispatch_utc TIMESTAMPTZ NOT NULL,
  prediction_cutoff_utc TIMESTAMPTZ NOT NULL,
  max_physical_attempts INTEGER NOT NULL CHECK(max_physical_attempts BETWEEN 1 AND 3),
  last_reserved_attempt INTEGER NOT NULL DEFAULT 0
    CHECK(last_reserved_attempt BETWEEN 0 AND 3),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(owner_digest,query_index),
  CONSTRAINT phase4_g5_query_cutoff_v39 CHECK(
    planned_dispatch_utc<=hard_latest_dispatch_utc
    AND hard_latest_dispatch_utc<=prediction_cutoff_utc-INTERVAL '15 minutes'
    AND last_reserved_attempt<=max_physical_attempts
  )
);

CREATE TABLE clean.phase4_g5_fids_physical_attempt_v39 (
  expected_reservation_sha256 TEXT PRIMARY KEY
    CHECK(expected_reservation_sha256 ~ '^[0-9a-f]{64}$'),
  owner_digest TEXT NOT NULL REFERENCES clean.phase4_g5_fids_physical_owner_v39(owner_digest),
  query_digest TEXT NOT NULL REFERENCES clean.phase4_g5_fids_allowed_query_v39(query_digest),
  github_run_id TEXT NOT NULL,
  physical_attempt_number INTEGER NOT NULL
    CHECK(physical_attempt_number BETWEEN 1 AND 3),
  charged_reserved_units INTEGER NOT NULL DEFAULT 2
    CHECK(charged_reserved_units=2),
  committed_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(query_digest,physical_attempt_number)
);
COMMENT ON TABLE clean.phase4_g5_fids_physical_attempt_v39 IS
 'LOGGED irreversible pre-HTTP physical attempt reservations, 2 REST units each, no provider HTTP receipt or source content; independent actual billing must be reconciled';
CREATE FUNCTION clean.phase4_g5_attempt_immutable_v39()
RETURNS TRIGGER LANGUAGE plpgsql AS $immutable$
BEGIN
  RAISE EXCEPTION 'P4_G5_IRREVERSIBLE_PHYSICAL_RESERVATION';
END $immutable$;
CREATE TRIGGER phase4_g5_fids_attempt_immutable_v39
  BEFORE UPDATE OR DELETE ON clean.phase4_g5_fids_physical_attempt_v39
  FOR EACH ROW EXECUTE FUNCTION clean.phase4_g5_attempt_immutable_v39();

-- Only a future production role with a separately reviewed exact grant may
-- execute this function. Reserve BEFORE any physical paid GET, and COMMIT
-- before sending. An ambiguous failed HTTP request NEVER refunds a slot.
CREATE FUNCTION clean.reserve_phase4_g5_fids_physical_attempt_v39(
 p_manifest_sha256 TEXT,p_owner_digest TEXT,p_github_run_id TEXT,
 p_query_digest TEXT,p_physical_attempt_number INTEGER,
 p_expected_reservation_sha256 TEXT
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,clean
AS $reserve$
DECLARE
 v_now TIMESTAMPTZ;
 v_budget clean.phase4_g5_fids_cohort_budget_v39%ROWTYPE;
 v_owner clean.phase4_g5_fids_physical_owner_v39%ROWTYPE;
 v_query clean.phase4_g5_fids_allowed_query_v39%ROWTYPE;
BEGIN
 IF p_manifest_sha256 IS NULL OR p_manifest_sha256 !~ '^[0-9a-f]{64}$'
    OR p_owner_digest IS NULL OR p_owner_digest !~ '^[0-9a-f]{64}$'
    OR p_query_digest IS NULL OR p_query_digest !~ '^[0-9a-f]{64}$'
    OR p_expected_reservation_sha256 IS NULL OR
       p_expected_reservation_sha256 !~ '^[0-9a-f]{64}$'
    OR p_github_run_id IS NULL OR p_github_run_id !~ '^[0-9]{5,25}$'
    OR p_physical_attempt_number IS NULL
    OR p_physical_attempt_number NOT BETWEEN 1 AND 3 THEN
   RAISE EXCEPTION 'P4_G5_PHYSICAL_RESERVATION_INPUT_HOLD';
 END IF;
 -- Lock global cohort first, then owner, then immutable query. Thus separate
 -- GitHub jobs cannot oversubscribe the project budget concurrently.
 SELECT * INTO v_budget
 FROM clean.phase4_g5_fids_cohort_budget_v39
 WHERE manifest_sha256=p_manifest_sha256 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P4_G5_BUDGET_MANIFEST_NOT_BOUND'; END IF;

 SELECT * INTO v_owner FROM clean.phase4_g5_fids_physical_owner_v39
 WHERE owner_digest=p_owner_digest AND manifest_sha256=p_manifest_sha256
 FOR UPDATE;
 IF NOT FOUND OR v_owner.state<>'ACTIVE' OR
    v_owner.github_run_id<>p_github_run_id OR
    v_owner.actual_github_runner_started_at_utc>
     v_owner.verified_prearm_deadline_utc THEN
   RAISE EXCEPTION 'P4_G5_ACTIVE_ACTUAL_GITHUB_OWNER_REQUIRED';
 END IF;

 SELECT * INTO v_query FROM clean.phase4_g5_fids_allowed_query_v39
 WHERE query_digest=p_query_digest AND owner_digest=p_owner_digest
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P4_G5_EXACT_QUERY_REQUIRED'; END IF;

 v_now=clock_timestamp();
 IF v_now<v_query.planned_dispatch_utc OR
    v_now>v_query.hard_latest_dispatch_utc OR
    v_now>=v_query.prediction_cutoff_utc-INTERVAL '15 minutes' OR
    v_now>=v_owner.hard_owner_expires_at_utc THEN
   RAISE EXCEPTION 'P4_G5_PHYSICAL_SOURCE_WINDOW_MISSED_OR_EARLY';
 END IF;
 IF v_query.last_reserved_attempt+1<>p_physical_attempt_number OR
    p_physical_attempt_number>v_query.max_physical_attempts THEN
   RAISE EXCEPTION 'P4_G5_PHYSICAL_DUPLICATE_OR_RETRY_SEQUENCE_HOLD';
 END IF;
 IF v_budget.reserved_units+2>v_budget.project_unit_ceiling THEN
   RAISE EXCEPTION 'P4_G5_PHYSICAL_CYCLE_BUDGET_EXHAUSTED';
 END IF;
 -- Check against independently generated canonical reservation key.
 IF p_expected_reservation_sha256 <> encode(
   sha256(convert_to(
     p_manifest_sha256||'|'||p_owner_digest||'|'||
     p_query_digest||'|'||p_physical_attempt_number::text,'UTF8'
   )),'hex'
 ) THEN
   RAISE EXCEPTION 'P4_G5_PHYSICAL_RESERVATION_DIGEST_MISMATCH';
 END IF;
 UPDATE clean.phase4_g5_fids_cohort_budget_v39
 SET reserved_units=reserved_units+2
 WHERE manifest_sha256=p_manifest_sha256;
 UPDATE clean.phase4_g5_fids_allowed_query_v39
 SET last_reserved_attempt=p_physical_attempt_number
 WHERE query_digest=p_query_digest;
 INSERT INTO clean.phase4_g5_fids_physical_attempt_v39(
   expected_reservation_sha256,owner_digest,query_digest,github_run_id,
   physical_attempt_number,charged_reserved_units,committed_at_utc
 ) VALUES(
   p_expected_reservation_sha256,p_owner_digest,p_query_digest,
   p_github_run_id,p_physical_attempt_number,2,v_now
 );
 RETURN v_now;
END $reserve$;

-- Explicit exact privilege owner release is NOT part of this migration.
REVOKE ALL ON clean.phase4_g5_fids_cohort_budget_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase4_g5_fids_physical_owner_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase4_g5_fids_allowed_query_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase4_g5_fids_physical_attempt_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase4_g5_attempt_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.reserve_phase4_g5_fids_physical_attempt_v39(
 TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT) FROM PUBLIC;
