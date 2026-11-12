-- V0091: STAGED, no new queue or new password/worker/provider.
-- Source-bound registration through EXISTING Stage30 PREPARE -> PREPARE NOLOGIN.
-- Separate the source PREPARE admission from the restricted V0090 PRE writer.
-- This is a small nonpaid Phase5 canary dependency, NOT an auto GO.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';

DO $preflight$
DECLARE n pg_catalog.pg_roles%ROWTYPE;
BEGIN
 IF pg_catalog.to_regclass('clean.phase5_cd_pre_task_v39') IS NULL
 OR pg_catalog.to_regclass('clean.phase5_cd_pre_admission_receipt_v39') IS NULL
 OR pg_catalog.to_regclass('clean.phase5_fids_original_binding_v39') IS NULL
 OR pg_catalog.to_regclass('clean.phase5_fids_allowed_query_v39') IS NULL
 OR pg_catalog.to_regclass('clean.phase5_fids_physical_attempt_v39') IS NULL
 OR pg_catalog.to_regclass('clean.fids_query_response') IS NULL
 OR pg_catalog.to_regclass('clean.flight_population') IS NULL THEN
  RAISE EXCEPTION 'P5_CD_V0091_EXISTING_V0079_V0087_V0088_NOT_PRESENT';
 END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39) THEN
  RAISE EXCEPTION 'P5_CD_V0091_ONLY_EMPTY_INERT_QUEUE_MAY_BE_COMMISSIONED';
 END IF;
 IF pg_catalog.to_regprocedure(
  'clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'
 ) IS NOT NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles
  WHERE rolname='phase5_cd_source_registration_owner_v39') THEN
  RAISE EXCEPTION 'P5_CD_V0091_REGISTRATION_ALREADY_EXISTS_NO_REINSTALL';
 END IF;
 SELECT * INTO n FROM pg_catalog.pg_roles WHERE
  rolname='phase5_fids_prepare_prod_20261107';
 IF NOT FOUND OR n.rolcanlogin OR n.rolsuper OR n.rolcreatedb OR
    n.rolcreaterole OR n.rolreplication OR n.rolbypassrls THEN
  RAISE EXCEPTION 'P5_CD_V0091_EXISTING_PREPARE_NOLOGIN_ROLE_NOT_RESTRICTED';
 END IF;
 IF NOT pg_catalog.pg_has_role('phase5_p30_prepare_login_20261107',
    'phase5_fids_prepare_prod_20261107','SET') THEN
  RAISE EXCEPTION 'P5_CD_V0091_EXISTING_PREPARE_LOGIN_SET_ROLE_MISSING';
 END IF;
END $preflight$;

CREATE ROLE phase5_cd_source_registration_owner_v39
 NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA clean TO phase5_cd_source_registration_owner_v39;
GRANT SELECT ON clean.phase5_fids_allowed_query_v39,
 clean.phase5_fids_physical_attempt_v39,
 clean.phase5_fids_original_binding_v39,
 clean.fids_query_response,
 clean.flight_population,
 clean.flight_snapshots
 TO phase5_cd_source_registration_owner_v39;
GRANT SELECT,INSERT ON clean.phase5_cd_pre_task_v39
 TO phase5_cd_source_registration_owner_v39;
GRANT USAGE ON SEQUENCE clean.phase5_cd_pre_task_v39_task_id_seq
 TO phase5_cd_source_registration_owner_v39;

-- PREPARE role supplies the reviewed SHA of a frozen signed GitHub packet.
-- SQL never assumes a digest proves rights: it independently verifies the
-- genuine existing bound original, physical charged attempt, selected
-- native-T from one operating flight member, expiry, and DB-clock cutoff.
-- Only a signed main GitHub owner can attest the packet/rights protocol.
CREATE FUNCTION clean.phase5_cd_register_source_flight_v39(
 p_manifest text,p_query text,p_flight text,p_horizon text,
 p_native_t timestamptz,p_packet text,p_population_id text,
 p_response text,p_rights text,p_max_staleness integer
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp
AS $enroll$
DECLARE
 now_utc timestamptz:=clock_timestamp();
 offset_utc interval;
 cutoff_utc timestamptz;
 q record;
 v record;
 member record;
 found_count integer;
 inserted_task bigint;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
    p_query IS NULL OR p_query !~ '^[0-9a-f]{64}$' OR
    p_packet IS NULL OR p_packet !~ '^[0-9a-f]{64}$' OR
    p_response IS NULL OR p_response !~ '^[0-9a-f]{64}$' OR
    p_rights IS NULL OR p_rights !~ '^[0-9a-f]{64}$' OR
    p_flight IS NULL OR length(p_flight) NOT BETWEEN 5 AND 200 OR
    p_flight !~ '^[A-Za-z0-9_.:|-]+$' OR
    p_population_id IS NULL OR
    p_population_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
    p_horizon IS NULL OR p_horizon NOT IN ('T-24h','T-6h','T-90m') OR
    p_native_t IS NULL OR
    p_max_staleness IS NULL OR p_max_staleness NOT BETWEEN 1 AND 86400
 THEN RAISE EXCEPTION 'P5_CD_V0091_INVALID_FROZEN_SOURCE_PACKET_INPUT'; END IF;
 offset_utc:=CASE p_horizon WHEN 'T-24h' THEN INTERVAL '24 hours'
  WHEN 'T-6h' THEN INTERVAL '6 hours' ELSE INTERVAL '90 minutes' END;
 cutoff_utc:=p_native_t-offset_utc;
 IF cutoff_utc<=now_utc+INTERVAL '2 seconds' THEN
  RAISE EXCEPTION 'P5_CD_V0091_RETROSPECTIVE_CUTOFF'; END IF;

 SELECT q.manifest_sha256,q.query_digest,q.state,
    q.run_day_index,q.slot_id,q.horizon,q.airport_icao,
    q.github_run_id,q.early_draw_sha256,q.reviewed_release_sha256,
    q.rights_review_sha256,q.provider_contract_sha256,
    q.hard_latest_dispatch_utc,
    q.service_window_start_utc,q.service_window_end_utc,
    a.github_run_id AS actual_attempt_run,
    a.committed_at_utc AS reserved_at,
    b.population_query_id::text AS original_population_id,
    b.response_hash AS original_hash,
    b.rights_review_sha256 AS bound_rights,
    b.source_expires_at_utc AS original_expires,
    b.normalized_members_count,
    b.bound_at_utc,
    r.available_at AS original_available,
    r.fids_retrieval_utc,r.raw_persisted_at_utc,
    r.response_hash AS response_hash,
    r.source_airport_icao,r.query_direction,
    r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
      AS original_unexpired
 INTO q FROM clean.phase5_fids_allowed_query_v39 q
 JOIN clean.phase5_fids_physical_attempt_v39 a
   ON a.query_digest=q.query_digest
  AND a.manifest_sha256=q.manifest_sha256
 JOIN clean.phase5_fids_original_binding_v39 b
   ON b.query_digest=q.query_digest
  AND b.reservation_sha256=a.reservation_sha256
  AND b.manifest_sha256=q.manifest_sha256
 JOIN clean.fids_query_response r
   ON r.population_query_id=b.population_query_id
 WHERE q.manifest_sha256=p_manifest AND q.query_digest=p_query;
 IF NOT FOUND OR q.state<>'ACTIVE' OR q.horizon<>p_horizon OR
    q.original_population_id<>p_population_id OR
    q.original_hash<>p_response OR q.response_hash<>p_response OR
    q.rights_review_sha256<>p_rights OR q.bound_rights<>p_rights OR
    q.original_expires<=cutoff_utc OR
    q.original_expires<=now_utc OR
    q.original_unexpired IS DISTINCT FROM TRUE OR
    q.source_airport_icao<>q.airport_icao OR
    q.query_direction<>'Departure' OR
    q.actual_attempt_run<>q.github_run_id OR
    q.normalized_members_count<1 OR
    p_native_t<q.service_window_start_utc OR
    p_native_t>=q.service_window_end_utc OR
    q.hard_latest_dispatch_utc>cutoff_utc-INTERVAL '2 seconds' OR
    q.reserved_at>q.fids_retrieval_utc OR
    q.fids_retrieval_utc>q.raw_persisted_at_utc OR
    q.raw_persisted_at_utc>q.original_available OR
    q.original_available>q.bound_at_utc OR
    q.bound_at_utc>now_utc OR
    q.original_available>cutoff_utc OR
    cutoff_utc-q.original_available>
      make_interval(secs=>p_max_staleness)
 THEN
  RAISE EXCEPTION 'P5_CD_V0091_REAL_SOURCE_OR_FRAME_TIME_NOT_QUALIFIED'; END IF;

 -- One exact confirmed operating leg: no aggregate conditional services
 -- silently relabeled as a physical aircraft, no codeshare duplicates.
 SELECT count(*)::integer INTO found_count
 FROM clean.flight_population m WHERE
   m.population_query_id=p_population_id::uuid AND
   m.analytic_identity_id=p_flight;
 IF found_count<>1 THEN
  RAISE EXCEPTION 'P5_CD_V0091_SOURCE_MEMBER_MISSING_OR_DUPLICATED'; END IF;
 SELECT m.population_query_id::text AS population_id,
   m.canonical_flight_instance_id,m.source_airport_icao,
   m.dep_airport_icao,m.population_role,m.source_type,
   m.scope_classification,m.codeshare_resolution_status,
   m.response_hash,m.provider_content_expired_at_utc,
   m.available_at,m.dep_scheduled_utc,m.population_member_id
 INTO member FROM clean.flight_population m WHERE
   m.population_query_id=p_population_id::uuid AND
   m.analytic_identity_id=p_flight;
 IF NOT FOUND OR
   member.population_id<>p_population_id OR
   member.canonical_flight_instance_id<>p_flight OR
   member.source_airport_icao<>q.airport_icao OR
   member.dep_airport_icao<>q.airport_icao OR
   member.population_role<>'requested_airport_primary' OR
   member.source_type<>'fids' OR
   member.scope_classification<>'confirmed_core' OR
   member.codeshare_resolution_status<>'confirmed_operating_leg' OR
   member.response_hash<>p_response OR
   member.provider_content_expired_at_utc IS NOT NULL OR
   member.available_at<q.original_available OR
   member.available_at>cutoff_utc OR
   member.dep_scheduled_utc IS DISTINCT FROM p_native_t OR
   member.population_member_id IS NULL THEN
  RAISE EXCEPTION 'P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG'; END IF;

 -- V0087's immutable INSERT trigger repeats prospective DB-clock,
 -- existing snapshot and frozen-identity checks under the same transaction.
 INSERT INTO clean.phase5_cd_pre_task_v39(
   manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,
   prediction_cutoff_utc,packet_sha256,source_population_query_id,
   source_response_sha256,reviewed_source_rights_sha256,
   source_expires_at_utc)
 VALUES(p_manifest,p_flight,p_horizon,p_native_t,cutoff_utc,p_packet,
   p_population_id,p_response,p_rights,q.original_expires)
 RETURNING task_id INTO inserted_task;
 RETURN inserted_task;
END $enroll$;

REVOKE ALL ON FUNCTION clean.phase5_cd_register_source_flight_v39(
 text,text,text,text,timestamptz,text,text,text,text,integer
) FROM PUBLIC;
DO $untrusted$
DECLARE role_name text;
BEGIN
 FOR role_name IN SELECT rolname FROM pg_catalog.pg_roles WHERE
  rolname IN ('travnr_runtime','travnr_v39_runtime_recovery1',
    'phase5_fids_source_prod_20261107',
    'phase5_fids_pre_writer_prod_20261107',
    'phase5_p30_pre_login_20261107',
    'phase5_p30_witness_login_20261107',
    'phase5_p5_source_login_20261108') LOOP
  EXECUTE pg_catalog.format(
   'REVOKE ALL ON FUNCTION clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer) FROM %I',
   role_name);
 END LOOP;
END $untrusted$;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_register_source_flight_v39(
 text,text,text,text,timestamptz,text,text,text,text,integer
) TO phase5_fids_prepare_prod_20261107;

-- PG16 non-superuser CREATEROLE has implicit ADMIN-only membership, not SET.
DO $temp_set$
DECLARE a name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=a) THEN
  EXECUTE pg_catalog.format(
   'GRANT phase5_cd_source_registration_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',a);
  IF NOT pg_catalog.pg_has_role(a,
    'phase5_cd_source_registration_owner_v39','SET') THEN
    RAISE EXCEPTION 'P5_CD_V0091_TEMPORARY_PG16_ROLE_SET_MISSING'; END IF;
 END IF;
END $temp_set$;
GRANT CREATE ON SCHEMA clean TO phase5_cd_source_registration_owner_v39;
ALTER FUNCTION clean.phase5_cd_register_source_flight_v39(
 text,text,text,text,timestamptz,text,text,text,text,integer
) OWNER TO phase5_cd_source_registration_owner_v39;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_source_registration_owner_v39;
DO $temp_drop$
DECLARE a name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=a) THEN
  EXECUTE pg_catalog.format(
   'REVOKE phase5_cd_source_registration_owner_v39 FROM %I GRANTED BY %I',a,a);
  IF pg_catalog.pg_has_role(a,
     'phase5_cd_source_registration_owner_v39','SET') THEN
    RAISE EXCEPTION 'P5_CD_V0091_TEMPORARY_ROLE_SET_NOT_REVOKED'; END IF;
 END IF;
END $temp_drop$;

DO $postflight$
DECLARE n pg_catalog.pg_roles%ROWTYPE;
DECLARE sig text:='clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)';
BEGIN
 SELECT * INTO n FROM pg_catalog.pg_roles
 WHERE rolname='phase5_cd_source_registration_owner_v39';
 IF NOT FOUND OR n.rolcanlogin OR n.rolsuper OR n.rolcreatedb OR
    n.rolcreaterole OR n.rolreplication OR n.rolbypassrls OR
    pg_catalog.pg_has_role(current_user,n.rolname,'SET') OR
    pg_catalog.has_schema_privilege(n.rolname,'clean','CREATE') OR
    NOT pg_catalog.has_table_privilege(n.rolname,
      'clean.phase5_cd_pre_task_v39','INSERT') OR
    pg_catalog.has_table_privilege(n.rolname,
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    pg_catalog.has_table_privilege(
      'phase5_fids_prepare_prod_20261107',
      'clean.phase5_cd_pre_task_v39','INSERT') OR
    pg_catalog.has_table_privilege(
      'phase5_fids_prepare_prod_20261107',
      'clean.phase5_cd_pre_task_v39','UPDATE') OR
    pg_catalog.has_function_privilege(
      'phase5_fids_pre_writer_prod_20261107',sig,'EXECUTE') OR
    pg_catalog.has_function_privilege(
      'phase5_fids_source_prod_20261107',sig,'EXECUTE') OR
    NOT pg_catalog.has_function_privilege(
      'phase5_fids_prepare_prod_20261107',sig,'EXECUTE') OR
    pg_catalog.pg_get_userbyid((
      SELECT p.proowner FROM pg_catalog.pg_proc p
      WHERE p.oid=pg_catalog.to_regprocedure(sig)
    )) IS DISTINCT FROM n.rolname OR
    EXISTS(
      SELECT 1 FROM pg_catalog.pg_proc p
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
      WHERE p.oid=pg_catalog.to_regprocedure(sig)
        AND acl.grantee=0 AND acl.privilege_type='EXECUTE')
 THEN
  RAISE EXCEPTION 'P5_CD_V0091_SOURCE_PREPARE_REGISTRATION_ACL_POSTFLIGHT_FAILED';
 END IF;
END $postflight$;
COMMIT;
