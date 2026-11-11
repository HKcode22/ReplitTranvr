-- V0085: STRICTLY DISPOSABLE PostgreSQL 16 no-bypass PRE admission test.
-- Applies ONLY after staged CI-only V0084 in isolated neondb. Do not install
-- this trigger in production, which contains other historical PRE writers.
-- Production requires separate scope/roles/source licensing/legacy migration.
--
-- Purpose: even a restricted role that has INSERT on flight_snapshots cannot
-- bypass the C+D task-row lock by calling persistPreSnapshot directly.
--
-- SECURITY DEFINER belongs to CI postgres only; that is NOT an approved
-- production owner. All invoker privileges are deliberately revoked at
-- creation, then granted to the exact isolated test role by CI fixture.
BEGIN;

CREATE TABLE p5_cd_stage14_ci.admission_receipt (
 task_id bigint PRIMARY KEY REFERENCES p5_cd_stage14_ci.task(id),
 transaction_id bigint NOT NULL,
 backend_pid integer NOT NULL,
 flight_instance_id text NOT NULL,
 horizon text NOT NULL,
 selected_native_t timestamptz NOT NULL,
 own_cutoff timestamptz NOT NULL,
 packet_sha text NOT NULL,
 lease_owner text NOT NULL,
 generation bigint NOT NULL CHECK (generation>=1),
 witnessed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(transaction_id,backend_pid)
);
REVOKE ALL ON TABLE p5_cd_stage14_ci.admission_receipt FROM PUBLIC;

-- Every invocation independently checks V0084's row lock/claim and then
-- establishes an immutable receipt for THIS backend + transaction + task.
-- A receipt from a COMMITTED earlier task cannot be reused: xact id differs.
-- A complete 40001 abort undoes both PRE and receipt in the same transaction.
-- Stage14 calls this twice within its SERIALIZABLE transaction.
CREATE FUNCTION p5_cd_stage14_ci.begin_admitted_write(
 expected_task_id bigint,
 expected_flight_instance_id text,
 expected_horizon text,
 expected_native_t timestamptz,
 expected_cutoff timestamptz,
 expected_packet_sha text,
 expected_owner text,
 expected_generation bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $admit$
DECLARE
 witness p5_cd_stage14_ci.admission_receipt%ROWTYPE;
BEGIN
 IF session_user IS DISTINCT FROM 'phase5_fids_pre_writer_cd_ciuser01' THEN
  RAISE EXCEPTION 'P5_CD_ADMISSION_WRONG_ISOLATED_ROLE';
 END IF;
 IF p5_cd_stage14_ci.assert_write_fence(
   expected_task_id, expected_flight_instance_id, expected_horizon,
   expected_native_t, expected_cutoff, expected_packet_sha, expected_owner,
   expected_generation
 ) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'P5_CD_NO_CURRENT_ROW_LOCK';
 END IF;
 INSERT INTO p5_cd_stage14_ci.admission_receipt (
   task_id, transaction_id, backend_pid, flight_instance_id, horizon,
   selected_native_t, own_cutoff, packet_sha, lease_owner, generation
 ) VALUES (
   expected_task_id, txid_current(), pg_backend_pid(),
   expected_flight_instance_id, expected_horizon, expected_native_t,
   expected_cutoff, expected_packet_sha, expected_owner, expected_generation
 )
 ON CONFLICT (task_id) DO NOTHING;

 SELECT * INTO witness FROM p5_cd_stage14_ci.admission_receipt
 WHERE task_id = expected_task_id;
 IF NOT FOUND OR witness.transaction_id IS DISTINCT FROM txid_current()
    OR witness.backend_pid IS DISTINCT FROM pg_backend_pid()
    OR witness.flight_instance_id IS DISTINCT FROM expected_flight_instance_id
    OR witness.horizon IS DISTINCT FROM expected_horizon
    OR witness.selected_native_t IS DISTINCT FROM expected_native_t
    OR witness.own_cutoff IS DISTINCT FROM expected_cutoff
    OR witness.packet_sha IS DISTINCT FROM expected_packet_sha
    OR witness.lease_owner IS DISTINCT FROM expected_owner
    OR witness.generation IS DISTINCT FROM expected_generation
 THEN
  RAISE EXCEPTION 'P5_CD_ADMISSION_RECEIPT_MISMATCH_OR_ALREADY_COMMITTED';
 END IF;
 RETURN true;
END $admit$;
REVOKE ALL ON FUNCTION p5_cd_stage14_ci.begin_admitted_write(
 bigint,text,text,timestamptz,timestamptz,text,text,bigint) FROM PUBLIC;

-- This BEFORE INSERT trigger is a DB-level gate: a caller cannot bypass it
-- by omitting the Stage14 optional argument or by setting a custom GUC.
-- It verifies a non-forgeable database receipt from THIS transaction, plus
-- that the row matches the exact admitted canonical flight and cutoff.
-- It is CI-wide within disposable neondb; production scoping is unsolved.
CREATE FUNCTION p5_cd_stage14_ci.require_pre_admission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $trigger$
DECLARE
 witness p5_cd_stage14_ci.admission_receipt%ROWTYPE;
BEGIN
 IF session_user IS DISTINCT FROM 'phase5_fids_pre_writer_cd_ciuser01' THEN
  RAISE EXCEPTION 'P5_CD_INSERT_WRONG_ISOLATED_ROLE';
 END IF;
 IF NEW.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE'
    OR NEW.flight_instance_id IS NULL
    OR NEW.horizon IS NULL OR NEW.prediction_cutoff_utc IS NULL
 THEN
  RAISE EXCEPTION 'P5_CD_INSERT_INVALID_PRE_IDENTITY';
 END IF;
 SELECT * INTO witness FROM p5_cd_stage14_ci.admission_receipt a
 WHERE a.transaction_id=txid_current()
   AND a.backend_pid=pg_backend_pid()
   AND a.flight_instance_id=NEW.flight_instance_id
   AND a.horizon=NEW.horizon
   AND a.own_cutoff=NEW.prediction_cutoff_utc
 LIMIT 2;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'P5_CD_INSERT_REQUIRES_SAME_TRANSACTION_ADMISSION';
 END IF;
 -- The underlying task is already locked by begin_admitted_write and its
 -- last recheck. A fresh UPDATE/lease takeover cannot pass until COMMIT.
 IF NOT EXISTS (
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
    AND t.lease_until>clock_timestamp()+INTERVAL '2 seconds'
    AND t.own_cutoff>clock_timestamp()+INTERVAL '2 seconds'
 ) THEN
  RAISE EXCEPTION 'P5_CD_INSERT_TASK_CHANGED_OR_EXPIRED';
 END IF;
 RETURN NEW;
END $trigger$;
REVOKE ALL ON FUNCTION p5_cd_stage14_ci.require_pre_admission() FROM PUBLIC;

CREATE TRIGGER p5_cd_ci_enforce_pre_admission
BEFORE INSERT ON clean.flight_snapshots
FOR EACH ROW EXECUTE FUNCTION p5_cd_stage14_ci.require_pre_admission();

COMMIT;
