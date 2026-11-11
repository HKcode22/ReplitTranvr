-- V0089: STAGED-only REAL V0087/V0088 role ownership commissioning plan.
-- Apply in disposable PG16 CI. Do NOT deploy in team neondb until a separately
-- reviewed, exact-role commissioner + rollback + login/SET ROLE readback.
-- The pre-existing Phase5 NOLOGIN PRE group is REUSED; no new PRE login.
-- This migration does not call provider APIs, start a GH worker or charge.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15000ms';

DO $preflight$
DECLARE r pg_catalog.pg_roles%ROWTYPE;
BEGIN
 IF pg_catalog.to_regclass('clean.phase5_cd_pre_task_v39') IS NULL OR
    pg_catalog.to_regclass('clean.phase5_cd_pre_admission_receipt_v39') IS NULL OR
    pg_catalog.to_regprocedure(
      'clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text)'
    ) IS NULL THEN
  RAISE EXCEPTION 'P5_CD_V0089_V0087_V0088_DEPENDENCIES_NOT_PRESENT';
 END IF;
 SELECT * INTO r FROM pg_catalog.pg_roles
  WHERE rolname='phase5_fids_pre_writer_prod_20261107';
 IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolcreaterole
    OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls THEN
  RAISE EXCEPTION 'P5_CD_V0089_PRIOR_RESTRICTED_PRE_NOLOGIN_GROUP_NOT_VERIFIED';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE
    rolname='phase5_cd_admission_guard_owner_v39') THEN
  RAISE EXCEPTION 'P5_CD_V0089_GUARD_OWNER_ALREADY_EXISTS_HOLD';
 END IF;
END $preflight$;

-- Dedicated owner has ONLY enough rights to lock read-only verified queue
-- rows and insert/check same-transaction receipts; it cannot delete/alter
-- snapshots, access paid FIDS reservation, create roles or log in.
CREATE ROLE phase5_cd_admission_guard_owner_v39
 NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA clean TO phase5_cd_admission_guard_owner_v39;
GRANT SELECT,UPDATE ON clean.phase5_cd_pre_task_v39
 TO phase5_cd_admission_guard_owner_v39;
GRANT SELECT,INSERT ON clean.phase5_cd_pre_admission_receipt_v39
 TO phase5_cd_admission_guard_owner_v39;

-- ACL changes precede function ownership transfer, because an ordinary
-- PostgreSQL owner cannot change function ACLs after changing owner.
-- NOLOGIN pre group already exists in Phase5; do NOT create another
-- source/PRE runtime login or grant direct queue UPDATE/INSERT.
REVOKE ALL ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39(
 bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,
 text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39(
 bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,
 text,text,text) TO phase5_fids_pre_writer_prod_20261107;

-- Revoke default grants, if present, on ONLY the newly staged V0088
-- objects from old runtime/source/login roles. Never revoke historical
-- FIDS, PRE, POST, flight_snapshots or weather table privileges.
DO $untrusted$
DECLARE n text;
BEGIN
 FOR n IN SELECT rolname FROM pg_catalog.pg_roles
  WHERE rolname IN(
    'travnr_runtime','travnr_v39_runtime_recovery1',
    'phase5_p30_prepare_login_20261107',
    'phase5_p30_witness_login_20261107',
    'phase5_fids_source_prod_20261107'
  ) LOOP
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON TABLE clean.phase5_cd_pre_admission_receipt_v39 FROM %I',n);
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text) FROM %I',n);
 END LOOP;
END $untrusted$;

-- Direct PRE writer access to task/receipt is forbidden; it must call the
-- security-definer function inside the original Stage14 SQL transaction.
REVOKE ALL ON TABLE clean.phase5_cd_pre_task_v39
 FROM phase5_fids_pre_writer_prod_20261107;
REVOKE ALL ON TABLE clean.phase5_cd_pre_admission_receipt_v39
 FROM phase5_fids_pre_writer_prod_20261107;
REVOKE ALL ON FUNCTION clean.phase5_cd_scope_snapshot_insert_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_scope_snapshot_immutable_v39() FROM PUBLIC;

-- PostgreSQL16 CREATEROLE grants implicit ADMIN TRUE, SET FALSE. To
-- ALTER FUNCTION OWNER the creator must first gain temporary SET TRUE
-- membership. Create that grant with its own grantor so it can be revoked.
DO $temporary_set_role_membership$
DECLARE actor name := current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=actor) THEN
   EXECUTE pg_catalog.format(
     'GRANT phase5_cd_admission_guard_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',
     actor);
   IF NOT pg_catalog.pg_has_role(actor,
        'phase5_cd_admission_guard_owner_v39','SET') THEN
     RAISE EXCEPTION 'P5_CD_V0089_TEMPORARY_SET_MEMBERSHIP_UNAVAILABLE';
   END IF;
 END IF;
END $temporary_set_role_membership$;
GRANT CREATE ON SCHEMA clean TO phase5_cd_admission_guard_owner_v39;
ALTER FUNCTION clean.phase5_cd_admit_stage14_pre_v39(
 bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,
 text,text,text)
 OWNER TO phase5_cd_admission_guard_owner_v39;
ALTER FUNCTION clean.phase5_cd_scope_snapshot_insert_v39()
 OWNER TO phase5_cd_admission_guard_owner_v39;
ALTER FUNCTION clean.phase5_cd_scope_snapshot_immutable_v39()
 OWNER TO phase5_cd_admission_guard_owner_v39;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_admission_guard_owner_v39;
DO $drop_temporary_set_role$
DECLARE actor name := current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=actor) THEN
   EXECUTE pg_catalog.format(
     'REVOKE phase5_cd_admission_guard_owner_v39 FROM %I GRANTED BY %I',
     actor,actor);
   IF pg_catalog.pg_has_role(actor,
       'phase5_cd_admission_guard_owner_v39','SET') THEN
     RAISE EXCEPTION 'P5_CD_V0089_TEMPORARY_SET_MEMBERSHIP_NOT_REVOKED';
   END IF;
 END IF;
END $drop_temporary_set_role$;

DO $postflight$
DECLARE r pg_catalog.pg_roles%ROWTYPE;
BEGIN
 SELECT * INTO r FROM pg_catalog.pg_roles
  WHERE rolname='phase5_cd_admission_guard_owner_v39';
 IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolcreaterole
    OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls OR
    pg_catalog.pg_get_userbyid((
      SELECT p.proowner FROM pg_catalog.pg_proc p
      WHERE p.oid=pg_catalog.to_regprocedure(
        'clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text)')
    )) IS DISTINCT FROM 'phase5_cd_admission_guard_owner_v39' OR
    pg_catalog.has_schema_privilege(
      'phase5_cd_admission_guard_owner_v39','clean','CREATE') OR
    NOT pg_catalog.has_table_privilege(
      'phase5_cd_admission_guard_owner_v39',
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    NOT pg_catalog.has_table_privilege(
      'phase5_cd_admission_guard_owner_v39',
      'clean.phase5_cd_pre_admission_receipt_v39','INSERT') OR
    pg_catalog.has_table_privilege(
      'phase5_fids_pre_writer_prod_20261107',
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    NOT pg_catalog.has_function_privilege(
      'phase5_fids_pre_writer_prod_20261107',
      'clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text)',
      'EXECUTE') THEN
  RAISE EXCEPTION 'P5_CD_V0089_ROLE_LEAST_PRIVILEGE_POSTFLIGHT_FAILED';
 END IF;
END $postflight$;
COMMIT;
