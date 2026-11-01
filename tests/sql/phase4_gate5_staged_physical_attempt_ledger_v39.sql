-- Disposable PG16 only! Applied after CREATE SCHEMA clean and staged V0076.
-- Test one immutable approved synthetic owner under local transaction.
-- No source payload, provider key, real subscription or production writes.
BEGIN;
DO $test$
DECLARE
 manifest TEXT:=repeat('a',64);
 owner TEXT:=repeat('b',64);
 queryid TEXT:=repeat('c',64);
 auth TEXT:=repeat('d',64);
 gh_run TEXT:='41278048278';
 reserve1 TEXT;
 reserve2 TEXT;
 t TIMESTAMPTZ;
BEGIN
 INSERT INTO clean.phase4_g5_fids_cohort_budget_v39(
   manifest_sha256,cohort_id,project_unit_ceiling
 ) VALUES(manifest,'SYNTHETIC_WSSS_V0076_UNIT_TEST',4);
 INSERT INTO clean.phase4_g5_fids_physical_owner_v39(
   owner_digest,manifest_sha256,horizon,github_run_id,
   reviewed_authorization_sha256,actual_github_runner_started_at_utc,
   verified_prearm_deadline_utc,first_planned_dispatch_utc,
   last_planned_dispatch_utc,hard_owner_expires_at_utc,state
 ) VALUES(
   owner,manifest,'T-24h',gh_run,
   auth,clock_timestamp()-INTERVAL '4 minutes',
   clock_timestamp()-INTERVAL '3 minutes',
   clock_timestamp()-INTERVAL '2 minutes',
   clock_timestamp()+INTERVAL '2 minutes',
   clock_timestamp()+INTERVAL '3 hours','ACTIVE'
 );
 INSERT INTO clean.phase4_g5_fids_allowed_query_v39(
   query_digest,owner_digest,query_index,
   planned_dispatch_utc,hard_latest_dispatch_utc,
   prediction_cutoff_utc,max_physical_attempts
 ) VALUES(
   queryid,owner,0,clock_timestamp()-INTERVAL '1 minute',
   clock_timestamp()+INTERVAL '1 minute',
   clock_timestamp()+INTERVAL '16 minutes',3
 );
 reserve1=encode(sha256(convert_to(
   manifest||'|'||owner||'|'||queryid||'|1','UTF8')),'hex');
 reserve2=encode(sha256(convert_to(
   manifest||'|'||owner||'|'||queryid||'|2','UTF8')),'hex');

 t=clean.reserve_phase4_g5_fids_physical_attempt_v39(
   manifest,owner,gh_run,queryid,1,reserve1);
 IF t IS NULL THEN RAISE EXCEPTION 'P4_G5_TEST_NO_RECEIPT'; END IF;
 IF (SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39
     WHERE manifest_sha256=manifest)<>2
    OR (SELECT count(*) FROM clean.phase4_g5_fids_physical_attempt_v39)<>1
 THEN RAISE EXCEPTION 'P4_G5_TEST_FIRST_RESERVATION_NOT_DURABLE'; END IF;

 -- Identical workflow rerun cannot reserve or refund the same paid attempt.
 BEGIN
  PERFORM clean.reserve_phase4_g5_fids_physical_attempt_v39(
   manifest,owner,gh_run,queryid,1,reserve1);
  RAISE EXCEPTION 'P4_G5_TEST_DUPLICATE_WAS_ACCEPTED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='P4_G5_TEST_DUPLICATE_WAS_ACCEPTED' OR
     position('P4_G5_PHYSICAL_DUPLICATE_OR_RETRY_SEQUENCE_HOLD' IN SQLERRM)=0
  THEN RAISE; END IF;
 END;

 -- Foreign GitHub runner cannot take over this owner's source window.
 BEGIN
  PERFORM clean.reserve_phase4_g5_fids_physical_attempt_v39(
   manifest,owner,'99999999999',queryid,2,reserve2);
  RAISE EXCEPTION 'P4_G5_TEST_FOREIGN_RUN_ACCEPTED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='P4_G5_TEST_FOREIGN_RUN_ACCEPTED' OR
     position('P4_G5_ACTIVE_ACTUAL_GITHUB_OWNER_REQUIRED' IN SQLERRM)=0
  THEN RAISE; END IF;
 END;

 -- Independently valid second physical attempt reserves two more units.
 PERFORM clean.reserve_phase4_g5_fids_physical_attempt_v39(
   manifest,owner,gh_run,queryid,2,reserve2);
 IF (SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39
     WHERE manifest_sha256=manifest)<>4 OR
    (SELECT count(*) FROM clean.phase4_g5_fids_physical_attempt_v39)<>2
 THEN RAISE EXCEPTION 'P4_G5_TEST_SECOND_RESERVATION_NOT_COMMITTED'; END IF;

 -- Third retry cannot overspend cohort's exact shared cap.
 BEGIN
  PERFORM clean.reserve_phase4_g5_fids_physical_attempt_v39(
   manifest,owner,gh_run,queryid,3,
   encode(sha256(convert_to(manifest||'|'||owner||'|'||queryid||'|3','UTF8')),'hex'));
  RAISE EXCEPTION 'P4_G5_TEST_OVERBUDGET_ACCEPTED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='P4_G5_TEST_OVERBUDGET_ACCEPTED' OR
     position('P4_G5_PHYSICAL_CYCLE_BUDGET_EXHAUSTED' IN SQLERRM)=0
  THEN RAISE; END IF;
 END;

 -- Previously committed charge cannot be deleted or updated.
 BEGIN
  DELETE FROM clean.phase4_g5_fids_physical_attempt_v39
   WHERE expected_reservation_sha256=reserve1;
  RAISE EXCEPTION 'P4_G5_TEST_REFUND_ALLOWED';
 EXCEPTION WHEN others THEN
  IF SQLERRM='P4_G5_TEST_REFUND_ALLOWED' OR
     position('P4_G5_IRREVERSIBLE_PHYSICAL_RESERVATION' IN SQLERRM)=0
  THEN RAISE; END IF;
 END;

 IF (SELECT count(*) FROM clean.phase4_g5_fids_physical_attempt_v39)<>2
 THEN RAISE EXCEPTION 'P4_G5_TEST_REFUND_MODIFIED_LEDGER'; END IF;
 RAISE NOTICE 'P4_G5_V0076_DISPOSABLE_PG16_PHYSICAL_ATTEMPT_RESERVATION_PASS_NO_PROVIDER';
END $test$;
ROLLBACK;
