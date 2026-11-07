-- V0080 STAGED ONLY. Requires B0062 + staged V0079, never auto-install.
-- Fixes Stage5 impossible release template: the real GITHUB_RUN_ID and final
-- commit SHA are unknowable when a signed source file is committed.
-- No production grants, no provider call, no PRE and no Phase6 activation.
--
-- The independently hash-reviewed template remains immutable; a dedicated
-- GH source owner binds its REAL run ID to exactly one signed PREPARED query
-- in a separate durable transaction BEFORE physical paid GET. The physical
-- attempt trigger denies any reservation without this previous readback.
CREATE TABLE clean.phase5_fids_github_prearm_v39 (
 query_digest text PRIMARY KEY
  REFERENCES clean.phase5_fids_allowed_query_v39(query_digest),
 manifest_sha256 text NOT NULL
  REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 github_run_id text NOT NULL CHECK(github_run_id ~ '^[0-9]{5,25}$'),
 early_draw_sha256 text NOT NULL CHECK(early_draw_sha256 ~ '^[0-9a-f]{64}$'),
 rights_review_sha256 text NOT NULL CHECK(rights_review_sha256 ~ '^[0-9a-f]{64}$'),
 prearm_sha256 text NOT NULL UNIQUE CHECK(prearm_sha256 ~ '^[0-9a-f]{64}$'),
 prearmed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT phase5_prearm_real_run_v39 CHECK(github_run_id<>'00000')
);
CREATE FUNCTION clean.phase5_fids_prearm_immutable_v39()
 RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $imm$
BEGIN
 RAISE EXCEPTION 'P5_V0080_PREARM_IMMUTABLE';
END $imm$;
CREATE TRIGGER phase5_fids_prearm_immutable_v39
 BEFORE DELETE OR UPDATE ON clean.phase5_fids_github_prearm_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_prearm_immutable_v39();

CREATE FUNCTION clean.prearm_phase5_fids_github_query_v39(
 p_manifest text,p_query_digest text,p_actual_run_id text,
 p_early_draw_sha256 text,p_rights_sha256 text,p_expected_prearm_sha256 text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,clean
AS $prearm$
DECLARE
 q clean.phase5_fids_allowed_query_v39%ROWTYPE;
 d clean.phase5_fids_day_budget_v39%ROWTYPE;
 v_now timestamptz;
 v_selected timestamptz;
 v_n integer;
 v_expected text;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
 OR p_query_digest IS NULL OR p_query_digest !~ '^[0-9a-f]{64}$'
 OR p_actual_run_id IS NULL OR p_actual_run_id !~ '^[0-9]{5,25}$'
 OR p_actual_run_id='00000'
 OR p_early_draw_sha256 IS NULL OR p_early_draw_sha256 !~ '^[0-9a-f]{64}$'
 OR p_rights_sha256 IS NULL OR p_rights_sha256 !~ '^[0-9a-f]{64}$'
 OR p_expected_prearm_sha256 IS NULL
 OR p_expected_prearm_sha256 !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'P5_V0080_SIGNED_PREARM_INPUT_HOLD'; END IF;
 SELECT * INTO q FROM clean.phase5_fids_allowed_query_v39
  WHERE query_digest=p_query_digest AND manifest_sha256=p_manifest
  FOR UPDATE;
 IF NOT FOUND OR q.state<>'PREPARED' OR q.github_run_id<>'00000'
 OR q.last_reserved_attempt<>0 OR q.early_draw_sha256<>p_early_draw_sha256
 OR q.rights_review_sha256<>p_rights_sha256
 THEN RAISE EXCEPTION 'P5_V0080_SIGNED_QUERY_NOT_PREPARED'; END IF;
 SELECT * INTO d FROM clean.phase5_fids_day_budget_v39
  WHERE manifest_sha256=p_manifest AND run_day_index=q.run_day_index
  FOR SHARE;
 IF NOT FOUND OR d.early_draw_sha256<>p_early_draw_sha256
 OR d.calendar_hash IS DISTINCT FROM
  (SELECT calendar_hash FROM clean.adb_phase6_calendar_day
    WHERE run_day_index=q.run_day_index)
 OR d.config_hash IS DISTINCT FROM
  (SELECT config_hash FROM clean.adb_phase6_calendar_day
    WHERE run_day_index=q.run_day_index)
 OR d.frame_hash IS DISTINCT FROM
  (SELECT frame_hash FROM clean.adb_phase6_calendar_day
    WHERE run_day_index=q.run_day_index)
 THEN RAISE EXCEPTION 'P5_V0080_DAILY_MANIFEST_NOT_BOUND'; END IF;
 SELECT COUNT(*),MIN(selected_at_utc) INTO v_n,v_selected
 FROM clean.adb_sampling_draw WHERE run_day_index=q.run_day_index;
 IF v_n<>4 OR EXISTS(
   SELECT 1 FROM clean.adb_sampling_draw
   WHERE run_day_index=q.run_day_index AND selected_at_utc<>v_selected
 ) OR NOT EXISTS(
   SELECT 1 FROM clean.adb_sampling_draw
   WHERE run_day_index=q.run_day_index AND slot_id=q.slot_id
     AND selected_icao=q.airport_icao
 ) THEN RAISE EXCEPTION 'P5_V0080_EARLY_DRAW_NOT_FROZEN'; END IF;
 v_now=clock_timestamp();
 IF v_selected>=q.planned_dispatch_utc
 OR v_now<q.planned_dispatch_utc-INTERVAL '2 hours'
 OR v_now>q.hard_latest_dispatch_utc-INTERVAL '10 seconds'
 OR v_now>=q.prediction_cutoff_utc-INTERVAL '4 minutes'
 THEN RAISE EXCEPTION 'P5_V0080_PREARM_WINDOW_MISSED'; END IF;
 v_expected=encode(sha256(convert_to(
   'phase5-v0080|'||p_manifest||'|'||p_query_digest||'|'||
   p_actual_run_id||'|'||p_early_draw_sha256||'|'||p_rights_sha256,
   'UTF8')),'hex');
 IF v_expected<>p_expected_prearm_sha256
 THEN RAISE EXCEPTION 'P5_V0080_PREARM_HASH_MISMATCH'; END IF;
 UPDATE clean.phase5_fids_allowed_query_v39
   SET github_run_id=p_actual_run_id,state='ACTIVE'
   WHERE query_digest=p_query_digest;
 INSERT INTO clean.phase5_fids_github_prearm_v39(
   query_digest,manifest_sha256,github_run_id,early_draw_sha256,
   rights_review_sha256,prearm_sha256,prearmed_at_utc)
 VALUES(p_query_digest,p_manifest,p_actual_run_id,p_early_draw_sha256,
   p_rights_sha256,p_expected_prearm_sha256,v_now);
 RETURN v_now;
END $prearm$;

-- A direct V0079 reservation (even if some future role can execute it)
-- cannot spend credits without a real immutable prior GitHub prearm.
-- On failure the entire V0079 reservation transaction rolls back, including
-- cycle, service-day, UTC-charge-day and physical reservation rows.
CREATE FUNCTION clean.phase5_fids_require_actual_prearm_v39()
 RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,clean
AS $guard$
DECLARE p record;
BEGIN
 SELECT a.github_run_id,a.manifest_sha256,a.query_digest,a.prearmed_at_utc,
        q.github_run_id AS query_run_id,q.state,
        q.early_draw_sha256,q.rights_review_sha256
 INTO p FROM clean.phase5_fids_github_prearm_v39 a
 JOIN clean.phase5_fids_allowed_query_v39 q
   ON q.query_digest=a.query_digest
 WHERE a.query_digest=NEW.query_digest;
 IF NOT FOUND OR p.github_run_id IS DISTINCT FROM NEW.github_run_id
 OR p.query_run_id IS DISTINCT FROM NEW.github_run_id
 OR p.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256
 OR p.state<>'ACTIVE' OR p.prearmed_at_utc>NEW.committed_at_utc
 OR p.early_draw_sha256 IS NULL OR p.rights_review_sha256 IS NULL
 THEN RAISE EXCEPTION 'P5_V0080_REAL_GITHUB_PREARM_REQUIRED'; END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER phase5_fids_require_actual_prearm_v39
 BEFORE INSERT ON clean.phase5_fids_physical_attempt_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_require_actual_prearm_v39();

REVOKE ALL ON clean.phase5_fids_github_prearm_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_prearm_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.prearm_phase5_fids_github_query_v39(
 text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_require_actual_prearm_v39() FROM PUBLIC;
-- Separate reviewed least-privilege installer/grants mandatory.
