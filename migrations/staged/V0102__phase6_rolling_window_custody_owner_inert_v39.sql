-- V0102 STAGED ONLY. Existing neondb, PG16, no new database or roles,
-- no provider contents, no auto-install, no provider or paid authorization.
-- Durable operational window owner. The DB clock, NOT cron arrival, picks
-- a fixed 120-minute slot of the reviewed policy. An unresolved owner
-- NEVER expires into permission to retry. Separate protected GitHub and
-- scientific/budget/rights gates remain mandatory.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $pre$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner'
 OR current_setting('server_version_num')::int/10000<>16 OR pg_is_in_recovery()
 OR (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='clean') IS DISTINCT FROM current_user
 OR to_regclass('clean.adb_phase6_authorization') IS NULL
 OR to_regclass('clean.phase6_rolling_window_custody_v39') IS NOT NULL
 THEN RAISE EXCEPTION 'P6_V0102_WRONG_OWNER_OR_PREREQUISITE_OR_ALREADY_INSTALLED'; END IF;
END $pre$;
CREATE TABLE clean.phase6_rolling_window_custody_v39 (
 manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
 authorization_id text NOT NULL CHECK (length(authorization_id) BETWEEN 1 AND 128),
 calendar_sha256 text NOT NULL CHECK (calendar_sha256 ~ '^[a-f0-9]{64}$'),
 config_sha256 text NOT NULL CHECK (config_sha256 ~ '^[a-f0-9]{64}$'),
 release_code_sha text NOT NULL CHECK (release_code_sha ~ '^[a-f0-9]{40}$'),
 policy_sha256 text NOT NULL CHECK (policy_sha256 ~ '^[a-f0-9]{64}$'),
 policy_from_utc timestamptz NOT NULL,
 policy_until_utc timestamptz NOT NULL,
 window_index integer NOT NULL CHECK (window_index BETWEEN 0 AND 719),
 window_start_utc timestamptz NOT NULL,
 window_end_utc timestamptz NOT NULL,
 root_run_id bigint NOT NULL UNIQUE CHECK (root_run_id BETWEEN 1 AND 999999999999999),
 claimed_at_utc timestamptz NOT NULL,
 closed_at_utc timestamptz,
 terminal_run_id bigint CHECK (terminal_run_id BETWEEN 1 AND 999999999999999),
 terminal_receipt_sha256 text CHECK (terminal_receipt_sha256 ~ '^[a-f0-9]{64}$'),
 independent_review_sha256 text CHECK (independent_review_sha256 ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(manifest_sha256,window_index),
 CHECK (isfinite(policy_from_utc) AND isfinite(policy_until_utc) AND
   policy_until_utc>policy_from_utc AND policy_until_utc-policy_from_utc<=interval '1440 hours'),
 CHECK (window_start_utc=policy_from_utc+window_index*interval '2 hours' AND
   window_end_utc=least(policy_until_utc,window_start_utc+interval '2 hours') AND
   claimed_at_utc>=window_start_utc AND claimed_at_utc<=window_end_utc-interval '15 minutes'),
 CHECK ((closed_at_utc IS NULL AND terminal_run_id IS NULL AND terminal_receipt_sha256 IS NULL AND independent_review_sha256 IS NULL)
 OR (closed_at_utc IS NOT NULL AND closed_at_utc>=claimed_at_utc AND
     terminal_run_id IS NOT NULL AND terminal_receipt_sha256 IS NOT NULL AND independent_review_sha256 IS NOT NULL))
);
-- At most one unresolved rolling root across the existing database.
-- Independent ordinary worker queue fences/credits remain authoritative.
CREATE UNIQUE INDEX p6_v0102_one_open_window ON clean.phase6_rolling_window_custody_v39 ((true))
 WHERE closed_at_utc IS NULL;
REVOKE ALL ON TABLE clean.phase6_rolling_window_custody_v39 FROM PUBLIC;

CREATE FUNCTION clean.phase6_claim_rolling_window_v39(
 p_authorization text,p_manifest text,p_calendar text,p_config text,p_code text,
 p_policy text,p_from timestamptz,p_until timestamptz,p_root bigint
) RETURNS TABLE(window_index integer,window_start_utc timestamptz,window_end_utc timestamptz,claimed_at_utc timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $claim$
DECLARE n timestamptz; DECLARE i integer; DECLARE s timestamptz; DECLARE z timestamptz;
DECLARE a clean.adb_phase6_authorization%ROWTYPE;
BEGIN
 IF current_user<>'neondb_owner' OR current_setting('transaction_isolation')<>'read committed'
 THEN RAISE EXCEPTION 'P6_V0102_OWNER_READ_COMMITTED_REQUIRED'; END IF;
 IF p_authorization IS NULL OR length(p_authorization) NOT BETWEEN 1 AND 128
 OR p_manifest IS NULL OR p_manifest !~ '^[a-f0-9]{64}$'
 OR p_calendar IS NULL OR p_calendar !~ '^[a-f0-9]{64}$'
 OR p_config IS NULL OR p_config !~ '^[a-f0-9]{64}$'
 OR p_code IS NULL OR p_code !~ '^[a-f0-9]{40}$'
 OR p_policy IS NULL OR p_policy !~ '^[a-f0-9]{64}$'
 OR p_from IS NULL OR p_until IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_until)
 OR date_trunc('second',p_from)<>p_from OR date_trunc('second',p_until)<>p_until
 OR p_until<=p_from OR p_until-p_from>interval '1440 hours'
 OR p_root IS NULL OR p_root NOT BETWEEN 1 AND 999999999999999
 THEN RAISE EXCEPTION 'P6_V0102_BAD_WINDOW_SCOPE'; END IF;
 PERFORM pg_advisory_xact_lock(392602,102);
 -- Existing exact authorization only. Do not enable or replace it.
 SELECT x.* INTO a FROM clean.adb_phase6_authorization x WHERE x.singleton_key FOR SHARE;
 n:=clock_timestamp();
 IF NOT FOUND OR a.enabled IS DISTINCT FROM true OR a.revoked_at_utc IS NOT NULL
 OR a.authorized_at_utc>n OR a.authorization_id IS DISTINCT FROM p_authorization
 OR a.manifest_sha256 IS DISTINCT FROM p_manifest OR a.calendar_hash IS DISTINCT FROM p_calendar
 OR a.config_hash IS DISTINCT FROM p_config OR a.code_sha IS DISTINCT FROM p_code
 THEN RAISE EXCEPTION 'P6_V0102_EXISTING_AUTHORIZATION_HOLD'; END IF;
 IF n<p_from OR n>=p_until THEN RAISE EXCEPTION 'P6_V0102_OUTSIDE_POLICY'; END IF;
 i:=floor(extract(epoch FROM n-p_from)/7200)::integer;
 s:=p_from+i*interval '2 hours'; z:=least(p_until,s+interval '2 hours');
 IF n>z-interval '15 minutes' THEN RAISE EXCEPTION 'P6_V0102_TOO_LATE_NO_BACKFILL'; END IF;
 -- Fix the study/policy identity on its first actual durable root. A new
 -- secret epoch, code/config or authorization ID cannot erase this fence.
 IF EXISTS(SELECT 1 FROM clean.phase6_rolling_window_custody_v39 w WHERE w.manifest_sha256=p_manifest
  AND (w.authorization_id IS DISTINCT FROM p_authorization OR w.calendar_sha256 IS DISTINCT FROM p_calendar
  OR w.config_sha256 IS DISTINCT FROM p_config OR w.release_code_sha IS DISTINCT FROM p_code
  OR w.policy_sha256 IS DISTINCT FROM p_policy OR w.policy_from_utc IS DISTINCT FROM p_from
  OR w.policy_until_utc IS DISTINCT FROM p_until))
 THEN RAISE EXCEPTION 'P6_V0102_IMMUTABLE_STUDY_SCOPE_DRIFT'; END IF;
 IF EXISTS(SELECT 1 FROM clean.phase6_rolling_window_custody_v39 w WHERE w.closed_at_utc IS NULL)
 THEN RAISE EXCEPTION 'P6_V0102_PRIOR_ROOT_UNRESOLVED_NO_REPLAY'; END IF;
 IF EXISTS(SELECT 1 FROM clean.phase6_rolling_window_custody_v39 w WHERE w.root_run_id=p_root OR
   (w.manifest_sha256=p_manifest AND w.window_index>=i) OR w.window_end_utc>s)
 THEN RAISE EXCEPTION 'P6_V0102_WINDOW_ALREADY_OWNED_OR_OVERLAP'; END IF;
 INSERT INTO clean.phase6_rolling_window_custody_v39(manifest_sha256,authorization_id,calendar_sha256,config_sha256,
   release_code_sha,policy_sha256,policy_from_utc,policy_until_utc,window_index,window_start_utc,window_end_utc,root_run_id,claimed_at_utc)
 VALUES(p_manifest,p_authorization,p_calendar,p_config,p_code,p_policy,p_from,p_until,i,s,z,p_root,n);
 RETURN QUERY SELECT i,s,z,n;
END $claim$;
REVOKE ALL ON FUNCTION clean.phase6_claim_rolling_window_v39(text,text,text,text,text,text,timestamptz,timestamptz,bigint) FROM PUBLIC;

-- Owner-only reconciliation primitive. Digest inputs are commitments, NOT
-- proof of actual worker/provider settlement. Do not expose this function
-- to a controller login. A reviewed independent reconciliation adapter
-- must check the complete GitHub chain, receipts and original worker
-- settlement before invoking it. Unknown/expired roots remain open.
CREATE FUNCTION clean.phase6_close_rolling_window_v39(
 p_manifest text,p_index integer,p_root bigint,p_terminal bigint,p_receipt text,p_review text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $close$
DECLARE n integer;
BEGIN
 IF current_user<>'neondb_owner' OR current_setting('transaction_isolation')<>'read committed'
 THEN RAISE EXCEPTION 'P6_V0102_OWNER_READ_COMMITTED_REQUIRED'; END IF;
 IF p_manifest IS NULL OR p_manifest !~ '^[a-f0-9]{64}$' OR p_index IS NULL OR p_index NOT BETWEEN 0 AND 719
 OR p_root IS NULL OR p_root NOT BETWEEN 1 AND 999999999999999
 OR p_terminal IS NULL OR p_terminal NOT BETWEEN 1 AND 999999999999999
 OR p_receipt IS NULL OR p_receipt !~ '^[a-f0-9]{64}$' OR p_review IS NULL OR p_review !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'P6_V0102_BAD_CLOSURE_SCOPE'; END IF;
 PERFORM pg_advisory_xact_lock(392602,102);
 UPDATE clean.phase6_rolling_window_custody_v39 w SET closed_at_utc=clock_timestamp(),
  terminal_run_id=p_terminal,terminal_receipt_sha256=p_receipt,independent_review_sha256=p_review
 WHERE w.manifest_sha256=p_manifest AND w.window_index=p_index AND w.root_run_id=p_root AND w.closed_at_utc IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'P6_V0102_NO_EXACT_OPEN_ROOT_NO_REPLAY'; END IF;
 RETURN true;
END $close$;
REVOKE ALL ON FUNCTION clean.phase6_close_rolling_window_v39(text,integer,bigint,bigint,text,text) FROM PUBLIC;

DO $post$
BEGIN
 IF EXISTS(SELECT 1 FROM clean.phase6_rolling_window_custody_v39)
 OR EXISTS(SELECT 1 FROM pg_class c,LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   WHERE c.oid='clean.phase6_rolling_window_custody_v39'::regclass AND a.grantee<>c.relowner)
 OR EXISTS(SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   WHERE p.oid IN ('clean.phase6_claim_rolling_window_v39(text,text,text,text,text,text,timestamptz,timestamptz,bigint)'::regprocedure,
    'clean.phase6_close_rolling_window_v39(text,integer,bigint,bigint,text,text)'::regprocedure) AND a.grantee<>p.proowner)
 THEN RAISE EXCEPTION 'P6_V0102_OWNER_ONLY_EMPTY_POSTFLIGHT_HOLD'; END IF;
END $post$;
COMMIT;
