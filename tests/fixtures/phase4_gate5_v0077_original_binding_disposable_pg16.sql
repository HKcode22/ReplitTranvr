-- DISPOSABLE CI PG16 ONLY. Run after B0062 and staged V0076 + V0077.
-- Atomic rollback; no paid HTTP, no secret, no runtime production grant.
BEGIN;
SET LOCAL statement_timeout='12000ms';
SET LOCAL lock_timeout='2000ms';
DO $fixture$
DECLARE
 m TEXT:=repeat('a',64);
 o TEXT:=repeat('b',64);
 q TEXT:=repeat('c',64);
 a TEXT:=repeat('d',64);
 src UUID:='b00bb00b-0000-4000-8000-000000000077';
 paid_at TIMESTAMPTZ:=clock_timestamp()-INTERVAL '30 seconds';
 avail TIMESTAMPTZ:=clock_timestamp()-INTERVAL '5 seconds';
 first_at TIMESTAMPTZ:=clock_timestamp()-INTERVAL '3 minutes';
 last_at TIMESTAMPTZ:=clock_timestamp()+INTERVAL '4 minutes';
 cutoff_at TIMESTAMPTZ:=clock_timestamp()+INTERVAL '30 minutes';
 expiry TIMESTAMPTZ:=clock_timestamp()+INTERVAL '1 day';
 err TEXT;
BEGIN
 INSERT INTO clean.phase4_g5_fids_cohort_budget_v39
  (manifest_sha256,cohort_id,project_unit_ceiling,reserved_units)
 VALUES(m,'WSSS_V0077_CI_SYNTHETIC',2,2);
 INSERT INTO clean.phase4_g5_fids_physical_owner_v39
  (owner_digest,manifest_sha256,horizon,github_run_id,
   reviewed_authorization_sha256,actual_github_runner_started_at_utc,
   verified_prearm_deadline_utc,first_planned_dispatch_utc,
   last_planned_dispatch_utc,hard_owner_expires_at_utc,state)
 VALUES(o,m,'T-90m','12345678',repeat('e',64),
   first_at-INTERVAL '60 minutes',first_at-INTERVAL '1 minute',
   first_at,last_at,last_at+INTERVAL '15 minutes','ACTIVE');
 INSERT INTO clean.phase4_g5_fids_allowed_query_v39
  (query_digest,owner_digest,query_index,planned_dispatch_utc,
   hard_latest_dispatch_utc,prediction_cutoff_utc,
   max_physical_attempts,last_reserved_attempt)
 VALUES(q,o,0,first_at,last_at,cutoff_at,1,1);
 INSERT INTO clean.phase4_g5_fids_physical_attempt_v39
  (expected_reservation_sha256,owner_digest,query_digest,github_run_id,
   physical_attempt_number,charged_reserved_units,committed_at_utc)
 VALUES(a,o,q,'12345678',1,2,paid_at);
 INSERT INTO clean.fids_query_response
  (population_query_id,source_airport_icao,query_direction,
   service_window_start_utc,service_window_end_utc,from_local,to_local,
   airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,
   available_at,response_hash,raw_payload,provider_api_version,
   fids_protocol_version,openapi_sha256)
 VALUES(src,'WSSS','Departure',
   cutoff_at+INTERVAL '30 minutes',cutoff_at+INTERVAL '90 minutes',
   '2026-11-03T01:00','2026-11-03T02:00','Asia/Singapore',
   paid_at+INTERVAL '5 seconds',paid_at+INTERVAL '15 seconds',
   avail,repeat('f',64),'{}'::jsonb,'CI_SYNTHETIC',
   'CI_SYNTHETIC',repeat('1',64));
 -- Reject incorrect source SHA, despite valid V0076 attempt.
 BEGIN
  INSERT INTO clean.phase4_g5_fids_original_binding_v39
   (population_query_id,expected_reservation_sha256,
    query_digest,manifest_sha256,original_response_sha256,
    rights_review_artifact_sha256,source_use_expires_at_utc)
  VALUES(src,a,q,m,repeat('0',64),repeat('2',64),expiry);
  RAISE EXCEPTION 'TEST_SHOULD_HAVE_REJECTED_WRONG_SHA';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
  IF err<>'P4_G5_V0077_ORIGINAL_SOURCE_HASH_CLOCK_OR_EXPIRY_HOLD'
   THEN RAISE EXCEPTION 'V0077_TEST_WRONG_SHA_NOT_ENFORCED: %',err; END IF;
 END;
 -- Correct reference to real retained synthetic original/committed reservation.
 INSERT INTO clean.phase4_g5_fids_original_binding_v39
  (population_query_id,expected_reservation_sha256,
   query_digest,manifest_sha256,original_response_sha256,
   rights_review_artifact_sha256,source_use_expires_at_utc)
 VALUES(src,a,q,m,repeat('f',64),repeat('2',64),expiry);
 IF (SELECT count(*) FROM clean.phase4_g5_fids_original_binding_v39
     WHERE population_query_id=src
       AND original_response_sha256=repeat('f',64))<>1
 THEN RAISE EXCEPTION 'V0077_TEST_VALID_BINDING_NOT_INSERTED'; END IF;
 -- Reject any rewriting of the immutable binding.
 BEGIN
  UPDATE clean.phase4_g5_fids_original_binding_v39
  SET source_use_expires_at_utc=expiry+INTERVAL '1 day'
  WHERE population_query_id=src;
  RAISE EXCEPTION 'TEST_SHOULD_HAVE_REJECTED_RETENTION_EXTENSION';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
  IF err<>'P4_G5_V0077_ORIGINAL_BINDING_UPDATE_FORBIDDEN'
   THEN RAISE EXCEPTION 'V0077_TEST_UPDATE_NOT_ENFORCED: %',err; END IF;
 END;
 -- Duplicate attempted source mapping cannot silently overwrite a physical slot.
 BEGIN
  INSERT INTO clean.phase4_g5_fids_original_binding_v39
   (population_query_id,expected_reservation_sha256,
    query_digest,manifest_sha256,original_response_sha256,
    rights_review_artifact_sha256,source_use_expires_at_utc)
  VALUES(src,a,q,m,repeat('f',64),repeat('2',64),expiry);
  RAISE EXCEPTION 'TEST_SHOULD_HAVE_REJECTED_DUPLICATE';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 RAISE NOTICE 'V0077_DISPOSABLE_PG16_SOURCE_RESERVATION_BINDING_PASS_NO_PROVIDER';
END
$fixture$;
ROLLBACK;
