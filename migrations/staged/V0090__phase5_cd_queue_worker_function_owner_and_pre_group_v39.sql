-- V0090: REAL EXISTING V0087 queue control-plane role commissioning.
-- STAGED: no live rollout, no new login/secrets, no source FIDS GETs.
-- Reuse existing Phase5 PRE NOLOGIN group and Stage30 PRE login.
-- PRE can execute bounded claim/start/ACK/reap functions, NEVER UPDATE
-- the task table or INSERT unreviewed queue/source flight identities.
-- V0087/V0088/V0089 MUST already exist; this is NOT a new task queue.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15000ms';

DO $preflight$
DECLARE r pg_catalog.pg_roles%ROWTYPE;
BEGIN
 IF pg_catalog.to_regclass('clean.phase5_cd_pre_task_v39') IS NULL OR
    pg_catalog.to_regclass('clean.phase5_cd_pre_admission_receipt_v39') IS NULL OR
    pg_catalog.to_regprocedure('clean.phase5_cd_claim_due_v39(text,integer,integer)') IS NULL OR
    pg_catalog.to_regprocedure('clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)') IS NULL OR
    pg_catalog.to_regprocedure('clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)') IS NULL OR
    pg_catalog.to_regprocedure('clean.phase5_cd_reap_once_v39(integer)') IS NULL THEN
  RAISE EXCEPTION 'P5_CD_V0090_PRIOR_REAL_QUEUE_GUARD_NOT_INSTALLED';
 END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39) THEN
  RAISE EXCEPTION 'P5_CD_V0090_ONLY_ZERO_TASK_INERT_QUEUE_CAN_BE_COMMISSIONED';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles
           WHERE rolname='phase5_cd_queue_function_owner_v39') THEN
  RAISE EXCEPTION 'P5_CD_V0090_QUEUE_NOLOGIN_OWNER_ALREADY_EXISTS';
 END IF;
 SELECT * INTO r FROM pg_catalog.pg_roles
 WHERE rolname='phase5_fids_pre_writer_prod_20261107';
 IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolcreaterole OR
    r.rolcreatedb OR r.rolreplication OR r.rolbypassrls THEN
   RAISE EXCEPTION 'P5_CD_V0090_PRE_NOLOGIN_GROUP_NOT_RESTRICTED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname='phase5_p30_pre_login_20261107' AND rolcanlogin=true
      AND rolsuper=false AND rolcreaterole=false AND rolbypassrls=false) THEN
   RAISE EXCEPTION 'P5_CD_V0090_EXISTING_STAGE30_PRE_LOGIN_NOT_READY';
 END IF;
 IF NOT pg_catalog.pg_has_role('phase5_p30_pre_login_20261107',
    'phase5_fids_pre_writer_prod_20261107','SET') THEN
   RAISE EXCEPTION 'P5_CD_V0090_PRE_STAGE30_SET_ROLE_NOT_REVIEWED';
 END IF;
END $preflight$;

CREATE ROLE phase5_cd_queue_function_owner_v39
 NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA clean TO phase5_cd_queue_function_owner_v39;
GRANT SELECT,UPDATE ON clean.phase5_cd_pre_task_v39
 TO phase5_cd_queue_function_owner_v39;
-- The ACK helper must see the already COMMITTED PRE snapshot, but does not
-- INSERT/UPDATE/DELETE clean.flight_snapshots and cannot read raw FIDS.
GRANT SELECT ON clean.flight_snapshots
 TO phase5_cd_queue_function_owner_v39;

-- First revoke any PUBLIC/inherited runtime role function EXECUTE and GRANT
-- precisely the existing PRE NOLOGIN role. Do this BEFORE ownership transfer.
REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)
 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM PUBLIC;
DO $untrusted$
DECLARE n text;
BEGIN
 FOR n IN SELECT rolname FROM pg_catalog.pg_roles
  WHERE rolname IN (
   'travnr_runtime','travnr_v39_runtime_recovery1','neon_service',
   'phase5_p30_prepare_login_20261107',
   'phase5_p30_witness_login_20261107',
   'phase5_fids_source_prod_20261107',
   'phase5_fids_prepare_prod_20261107')
 LOOP
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer) FROM %I',n);
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint) FROM %I',n);
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text) FROM %I',n);
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM %I',n);
 END LOOP;
END $untrusted$;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
 TO phase5_fids_pre_writer_prod_20261107;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
 TO phase5_fids_pre_writer_prod_20261107;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)
 TO phase5_fids_pre_writer_prod_20261107;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_reap_once_v39(integer)
 TO phase5_fids_pre_writer_prod_20261107;

-- A CREATEROLE non-superuser implicitly gets ADMIN TRUE but SET FALSE.
-- For ALTER FUNCTION OWNER TO a dedicated NOLOGIN owner, create a
-- TEMPORARY SET TRUE grant and revoke that *creator-issued* edge afterward.
DO $temporary_set_role$
DECLARE actor name := current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=actor) THEN
  EXECUTE pg_catalog.format(
   'GRANT phase5_cd_queue_function_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',actor);
  IF NOT pg_catalog.pg_has_role(actor,
   'phase5_cd_queue_function_owner_v39','SET') THEN
   RAISE EXCEPTION 'P5_CD_V0090_TEMPORARY_SET_ROLE_UNAVAILABLE';
  END IF;
 END IF;
END $temporary_set_role$;

GRANT CREATE ON SCHEMA clean TO phase5_cd_queue_function_owner_v39;
ALTER FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
 OWNER TO phase5_cd_queue_function_owner_v39;
ALTER FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
 OWNER TO phase5_cd_queue_function_owner_v39;
ALTER FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)
 OWNER TO phase5_cd_queue_function_owner_v39;
ALTER FUNCTION clean.phase5_cd_reap_once_v39(integer)
 OWNER TO phase5_cd_queue_function_owner_v39;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_queue_function_owner_v39;

DO $drop_temporary_set$
DECLARE actor name := current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=actor) THEN
  EXECUTE pg_catalog.format(
   'REVOKE phase5_cd_queue_function_owner_v39 FROM %I GRANTED BY %I',actor,actor);
  IF pg_catalog.pg_has_role(actor,
    'phase5_cd_queue_function_owner_v39','SET') THEN
   RAISE EXCEPTION 'P5_CD_V0090_TEMPORARY_SET_ROLE_NOT_REVOKED';
  END IF;
 END IF;
END $drop_temporary_set$;

DO $postflight$
DECLARE role_row pg_catalog.pg_roles%ROWTYPE;
DECLARE old_pre text:='phase5_fids_pre_writer_prod_20261107';
DECLARE queue_owner text:='phase5_cd_queue_function_owner_v39';
BEGIN
 SELECT * INTO role_row FROM pg_catalog.pg_roles WHERE rolname=queue_owner;
 IF NOT FOUND OR role_row.rolcanlogin OR role_row.rolsuper OR
    role_row.rolcreaterole OR role_row.rolcreatedb OR
    role_row.rolbypassrls OR role_row.rolreplication OR
    pg_catalog.pg_has_role(current_user,queue_owner,'SET') OR
    pg_catalog.has_schema_privilege(queue_owner,'clean','CREATE') OR
    NOT pg_catalog.has_table_privilege(queue_owner,
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    NOT pg_catalog.has_table_privilege(queue_owner,
      'clean.flight_snapshots','SELECT') OR
    pg_catalog.has_table_privilege(queue_owner,
      'clean.flight_snapshots','INSERT') OR
    pg_catalog.has_table_privilege(old_pre,
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    pg_catalog.has_table_privilege(old_pre,
      'clean.flight_snapshots','DELETE') OR
    NOT pg_catalog.has_function_privilege(old_pre,
      'clean.phase5_cd_claim_due_v39(text,integer,integer)','EXECUTE') OR
    NOT pg_catalog.has_function_privilege(old_pre,
      'clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)','EXECUTE') OR
    NOT pg_catalog.has_function_privilege(old_pre,
      'clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)','EXECUTE') OR
    NOT pg_catalog.has_function_privilege(old_pre,
      'clean.phase5_cd_reap_once_v39(integer)','EXECUTE') OR
    pg_catalog.pg_get_userbyid((
      SELECT proowner FROM pg_catalog.pg_proc
      WHERE oid=pg_catalog.to_regprocedure(
       'clean.phase5_cd_claim_due_v39(text,integer,integer)'
      ))) IS DISTINCT FROM queue_owner THEN
   RAISE EXCEPTION 'P5_CD_V0090_LEAST_PRIVILEGE_POSTFLIGHT_FAILED';
 END IF;
END $postflight$;
COMMIT;
