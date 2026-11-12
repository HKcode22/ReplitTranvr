-- V0092: **one existing V0087 queue**, now claimed only by exact independently
-- reviewed signed packet hashes and approved horizons (T24 vs T6/T90).
-- This prevents T24/late PRE workers from stealing another worker's
-- lease within a shared 3-minute Stage14 cutoff.
--
-- STAGED and INERT. Nothing provider-paid or queued is activated.
-- Reuse existing V0090 NOLOGIN queue-function owner and Stage30 PRE group.
-- Owner deploys once AFTER exact-head CI and reviewed private-shell pin.
BEGIN;
SET LOCAL lock_timeout='3000ms';
SET LOCAL statement_timeout='30000ms';

DO $before$
DECLARE creator name:=current_user;
DECLARE owner_role pg_catalog.pg_roles%ROWTYPE;
BEGIN
 IF current_database()<>'neondb'
    OR current_setting('server_version_num')::integer<160000
    OR pg_catalog.pg_is_in_recovery()
    OR pg_catalog.to_regclass('clean.phase5_cd_pre_task_v39') IS NULL
    OR pg_catalog.to_regprocedure(
      'clean.phase5_cd_claim_due_v39(text,integer,integer)') IS NULL
    OR pg_catalog.to_regprocedure(
      'clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)') IS NOT NULL
 THEN
   RAISE EXCEPTION 'P5_CD_V0092_PRIOR_REAL_PG16_QUEUE_OR_NO_DUPLICATE_NOT_PROVEN';
 END IF;
 IF pg_catalog.pg_get_userbyid((
    SELECT relowner FROM pg_catalog.pg_class WHERE
    oid='clean.phase5_cd_pre_task_v39'::regclass))<>creator
    OR pg_catalog.pg_get_userbyid((
      SELECT nspowner FROM pg_catalog.pg_namespace WHERE nspname='clean'))<>creator
    OR pg_catalog.pg_get_userbyid((
      SELECT proowner FROM pg_catalog.pg_proc WHERE oid=
      'clean.phase5_cd_claim_due_v39(text,integer,integer)'::regprocedure
    ))<>'phase5_cd_queue_function_owner_v39'
 THEN
  RAISE EXCEPTION 'P5_CD_V0092_QUEUE_SCHEMA_OR_PRIOR_FUNCTION_OWNER_DRIFT';
 END IF;
 SELECT * INTO owner_role FROM pg_catalog.pg_roles
  WHERE rolname='phase5_cd_queue_function_owner_v39';
 IF NOT FOUND OR owner_role.rolcanlogin OR owner_role.rolsuper OR
    owner_role.rolcreaterole OR owner_role.rolcreatedb OR
    owner_role.rolreplication OR owner_role.rolbypassrls OR
    NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE
      rolname='phase5_fids_pre_writer_prod_20261107' AND NOT rolcanlogin)
 THEN
  RAISE EXCEPTION 'P5_CD_V0092_EXISTING_NOLOGIN_ROLES_NOT_SAFE';
 END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39) THEN
  RAISE EXCEPTION 'P5_CD_V0092_ONLY_ZERO_TASK_INERT_QUEUE_CAN_BE_CHANGED';
 END IF;
END $before$;

-- Enforce a unique frozen packet per flight-horizon task. Combined with
-- original flight_instance_id,horizon uniqueness, no duplicate signed SHA
-- can ever be claimed for another flight under one horizon.
CREATE UNIQUE INDEX phase5_cd_one_signed_packet_per_horizon_v39
 ON clean.phase5_cd_pre_task_v39(packet_sha256,horizon);

-- PostgreSQL16 CREATEROLE implicit admin has SET FALSE. Temporarily
-- grant SET to the database owner, create the new function *as the
-- existing restricted NOLOGIN function owner*, revoke the deprecated
-- unscoped PRE claim EXECUTE, and return to neondb_owner immediately.
GRANT CREATE ON SCHEMA clean TO phase5_cd_queue_function_owner_v39;
DO $temporary$
DECLARE creator name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=creator) THEN
  EXECUTE pg_catalog.format(
   'GRANT phase5_cd_queue_function_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',creator);
  IF NOT pg_catalog.pg_has_role(creator,
     'phase5_cd_queue_function_owner_v39','SET') THEN
    RAISE EXCEPTION 'P5_CD_V0092_TEMPORARY_SET_ROLE_UNAVAILABLE';
  END IF;
 END IF;
END $temporary$;
SET ROLE phase5_cd_queue_function_owner_v39;

CREATE FUNCTION clean.phase5_cd_claim_signed_roster_v39(
 p_packet_sha256s text[],p_horizons text[],p_owner text,
 p_limit integer DEFAULT 2,p_lease_seconds integer DEFAULT 90
) RETURNS SETOF clean.phase5_cd_pre_task_v39
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $signed_claim$
DECLARE n_sha integer; n_h integer;
BEGIN
 n_sha:=COALESCE(cardinality(p_packet_sha256s),0);
 n_h:=COALESCE(cardinality(p_horizons),0);
 IF n_sha<1 OR n_sha>96 OR n_h<1 OR n_h>3
    OR p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9_.:-]{5,96}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 16
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 15 AND 120
    OR array_position(p_packet_sha256s,NULL) IS NOT NULL
    OR array_position(p_horizons,NULL) IS NOT NULL
    OR EXISTS(SELECT 1 FROM unnest(p_packet_sha256s) p(x)
      WHERE x !~ '^[a-f0-9]{64}$')
    OR EXISTS(SELECT 1 FROM unnest(p_horizons) h(x)
      WHERE x NOT IN ('T-24h','T-6h','T-90m'))
    OR (SELECT count(DISTINCT x) FROM unnest(p_packet_sha256s) p(x))<>n_sha
    OR (SELECT count(DISTINCT x) FROM unnest(p_horizons) h(x))<>n_h
 THEN
  RAISE EXCEPTION 'P5_CD_V0092_SIGNED_PACKET_SCOPE_OR_CLAIM_BOUNDS_INVALID';
 END IF;
 RETURN QUERY
  WITH selected AS (
   SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
   WHERE t.state='READY'
    AND t.packet_sha256=ANY(p_packet_sha256s)
    AND t.horizon=ANY(p_horizons)
    AND t.prediction_cutoff_utc-INTERVAL '180 seconds'<=clock_timestamp()
    AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
    AND t.source_expires_at_utc>clock_timestamp()
   ORDER BY t.prediction_cutoff_utc,t.task_id
   FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE clean.phase5_cd_pre_task_v39 t
   SET state='CLAIMED',lease_owner=p_owner,
       lease_generation=t.lease_generation+1,
       lease_until_utc=clock_timestamp()+
        make_interval(secs=>p_lease_seconds)
  FROM selected s WHERE t.task_id=s.task_id
  RETURNING t.*;
END $signed_claim$;

REVOKE EXECUTE ON FUNCTION clean.phase5_cd_claim_signed_roster_v39(
 text[],text[],text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_claim_signed_roster_v39(
 text[],text[],text,integer,integer)
 TO phase5_fids_pre_writer_prod_20261107;

-- This is the migration's essential safety step: existing PRE workers
-- CANNOT use claim_due to lease somebody else's horizon or packet.
REVOKE EXECUTE ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
 FROM phase5_fids_pre_writer_prod_20261107;

RESET ROLE;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_queue_function_owner_v39;
DO $cleanup$
DECLARE actor name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=actor) THEN
  EXECUTE pg_catalog.format(
    'REVOKE phase5_cd_queue_function_owner_v39 FROM %I GRANTED BY %I',actor,actor);
  IF pg_catalog.pg_has_role(actor,'phase5_cd_queue_function_owner_v39','SET') THEN
   RAISE EXCEPTION 'P5_CD_V0092_TEMPORARY_SET_ROLE_NOT_REVOKED';
  END IF;
 END IF;
END $cleanup$;
DO $after$
DECLARE o text:='phase5_cd_queue_function_owner_v39';
DECLARE p text:='phase5_fids_pre_writer_prod_20261107';
BEGIN
 IF pg_catalog.pg_get_userbyid((
    SELECT proowner FROM pg_catalog.pg_proc WHERE oid=
    'clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)'::regprocedure
   )) IS DISTINCT FROM o
 OR pg_catalog.has_schema_privilege(o,'clean','CREATE')
 OR NOT pg_catalog.has_function_privilege(p,
    'clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)','EXECUTE')
 OR pg_catalog.has_function_privilege(p,
    'clean.phase5_cd_claim_due_v39(text,integer,integer)','EXECUTE')
 OR pg_catalog.has_table_privilege(p,
    'clean.phase5_cd_pre_task_v39','UPDATE')
 OR EXISTS(
    SELECT 1 FROM pg_catalog.pg_proc fn
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(
     fn.proacl,pg_catalog.acldefault('f',fn.proowner))) a
    WHERE fn.oid=
     'clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)'::regprocedure
      AND a.grantee=0 AND a.privilege_type='EXECUTE'
   )
 THEN
  RAISE EXCEPTION 'P5_CD_V0092_SOURCE_SCOPE_OWNER_AND_ACL_POSTFLIGHT_FAILED';
 END IF;
END $after$;
COMMIT;
