-- V0086: DISPOSABLE PG16 TEST ONLY, specifically after CI-only V0084+V0085.
-- In response to owner all-schema 2026-11-11T21:47:55Z catalog: 141 user
-- tables, multiple historical snapshot INSERT roles, existing population-
-- member trigger. A blanket V0085 PRE trigger cannot be deployed unchanged.
-- This exact migration must NEVER run against the production Neon DB.
--
-- Compatibility boundary: mandatory admission is scoped to a flight+horizon
-- that is REGISTERED in the immutable, UNIQUE C+D task table. The cutoff
-- is deliberately *not* part of scope selection (prevents native-T retime
-- bypass). A legacy unrelated flight+horizon without a C+D task stays on
-- existing PRE writer/trigger path; this is a design test, not proof of
-- production authorization or scientific licensing.
--
-- CI owner is privileged postgres, SECURITY DEFINER use is NOT reviewed for
-- a production deployment. Future migration needs NOLOGIN least-privilege
-- owner, carefully reviewed grants, legacy actor audit and exact new cohort
-- provenance/authentication before a paid production release.
BEGIN;
CREATE OR REPLACE FUNCTION p5_cd_stage14_ci.require_pre_admission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $trigger$
DECLARE
 protected_task_id bigint;
 witness p5_cd_stage14_ci.admission_receipt%ROWTYPE;
 observed_at timestamptz;
BEGIN
 -- Only protected canonical flight + horizon are subject to C+D.
 -- The task registry has UNIQUE(flight_instance_id,horizon), so even if
 -- a later provider schedule shifts the cutoff there is no bypass.
 SELECT id INTO protected_task_id FROM p5_cd_stage14_ci.task
 WHERE flight_instance_id=NEW.flight_instance_id
   AND horizon=NEW.horizon;

 IF NOT FOUND THEN
  -- Legacy/unregistered rows still pass to the original DB constraints and
  -- existing clean.trg_flight_snapshots_population_member trigger.
  RETURN NEW;
 END IF;

 -- This is a literal disposable CI identity, NOT a production role policy.
 IF session_user IS DISTINCT FROM 'phase5_fids_pre_writer_cd_ciuser01'
 THEN
  RAISE EXCEPTION 'P5_CD_PROTECTED_INSERT_WRONG_ISOLATED_ROLE';
 END IF;
 IF NEW.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE'
    OR NEW.flight_instance_id IS NULL
    OR NEW.horizon IS NULL
    OR NEW.prediction_cutoff_utc IS NULL
    OR NEW.selected_t_milestone_utc IS NULL THEN
  RAISE EXCEPTION 'P5_CD_PROTECTED_INSERT_INVALID_PRE_IDENTITY';
 END IF;
 SELECT * INTO witness FROM p5_cd_stage14_ci.admission_receipt a
 WHERE a.task_id=protected_task_id
   AND a.transaction_id=txid_current()
   AND a.backend_pid=pg_backend_pid()
   AND a.flight_instance_id=NEW.flight_instance_id
   AND a.horizon=NEW.horizon
   AND a.own_cutoff=NEW.prediction_cutoff_utc
   AND a.selected_native_t=NEW.selected_t_milestone_utc;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'P5_CD_PROTECTED_INSERT_REQUIRES_SAME_TX_ADMISSION';
 END IF;

 observed_at:=clock_timestamp();
 IF NOT EXISTS(
  SELECT 1 FROM p5_cd_stage14_ci.task t
  WHERE t.id=witness.task_id
    AND t.flight_instance_id=witness.flight_instance_id
    AND t.horizon=witness.horizon
    AND t.selected_native_t=witness.selected_native_t
    AND t.own_cutoff=witness.own_cutoff
    AND t.packet_sha=witness.packet_sha
    AND t.owner=witness.lease_owner
    AND t.generation=witness.generation
    AND t.status='WRITE_STARTED_UNKNOWN'
    AND t.lease_until>observed_at+INTERVAL '2 seconds'
    AND t.own_cutoff>observed_at+INTERVAL '2 seconds'
 ) THEN
  RAISE EXCEPTION 'P5_CD_PROTECTED_INSERT_QUEUE_CHANGED_OR_EXPIRED';
 END IF;
 RETURN NEW;
END $trigger$;
-- CREATE OR REPLACE preserves prior function owner/grants; PUBLIC must
-- remain revoked even in the disposable CI environment.
REVOKE ALL ON FUNCTION p5_cd_stage14_ci.require_pre_admission()
 FROM PUBLIC;
COMMIT;
