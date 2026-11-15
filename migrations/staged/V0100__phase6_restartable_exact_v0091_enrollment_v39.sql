-- V0100: small additive wrapper of installed V0091. No new queue, role,
-- credential, paid call or changes to the original immutable task.
-- Exact identity/digest replay is a read-only ACK, never a second INSERT.
-- STAGED only until separate owner release and real PG16 readback.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $before$
BEGIN
 IF current_database()<>'neondb' OR current_setting('server_version_num')::int/10000<>16
 OR pg_is_in_recovery()
 OR to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)') IS NULL
 OR to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)') IS NOT NULL
 OR to_regclass('clean.phase5_cd_pre_task_v39') IS NULL
 OR pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid=
 'clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'::regprocedure))<>'phase5_cd_source_registration_owner_v39'
 OR pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname='clean'))<>current_user
 OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='phase5_cd_source_registration_owner_v39'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole
 AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls)
 OR NOT has_function_privilege('phase5_fids_prepare_prod_20261107',
 'clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'P6_V0100_EXISTING_V0091_OWNER_OR_ALREADY_INSTALLED_HOLD'; END IF;
END $before$;
GRANT CREATE ON SCHEMA clean TO phase5_cd_source_registration_owner_v39;
DO $temporary$
DECLARE actor name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=actor) THEN
  EXECUTE format('GRANT phase5_cd_source_registration_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',actor);
 END IF;
END $temporary$;
SET ROLE phase5_cd_source_registration_owner_v39;
CREATE FUNCTION clean.phase5_cd_ensure_exact_source_flight_v39(
 p_manifest text,p_query text,p_flight text,p_horizon text,
 p_native_t timestamptz,p_packet text,p_population_id text,
 p_response text,p_rights text,p_max_staleness integer
) RETURNS TABLE(task_id bigint,newly_registered boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $ensure$
DECLARE existing clean.phase5_cd_pre_task_v39%ROWTYPE;
DECLARE new_id bigint;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
 p_query IS NULL OR p_query !~ '^[0-9a-f]{64}$' OR
 p_packet IS NULL OR p_packet !~ '^[0-9a-f]{64}$' OR
 p_response IS NULL OR p_response !~ '^[0-9a-f]{64}$' OR
 p_rights IS NULL OR p_rights !~ '^[0-9a-f]{64}$' OR
 p_flight IS NULL OR length(p_flight) NOT BETWEEN 5 AND 200 OR
 p_flight !~ '^[A-Za-z0-9_.:|-]+$' OR
 p_population_id IS NULL OR p_population_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
 p_horizon IS NULL OR p_horizon NOT IN ('T-24h','T-6h','T-90m') OR
 p_native_t IS NULL OR NOT isfinite(p_native_t) OR
 p_max_staleness IS NULL OR p_max_staleness NOT BETWEEN 1 AND 86400
 THEN RAISE EXCEPTION 'P6_V0100_INVALID_EXACT_PACKET_INPUT'; END IF;
 -- SAME transaction lock as the immutable V0087 insert trigger.
 -- Concurrent calls under READ COMMITTED see the preceding commit.
 PERFORM pg_advisory_xact_lock(hashtext(p_flight||'|'||p_horizon));
 SELECT t.* INTO existing FROM clean.phase5_cd_pre_task_v39 t
 WHERE t.flight_instance_id=p_flight AND t.horizon=p_horizon;
 IF FOUND THEN
  IF existing.manifest_sha256 IS DISTINCT FROM p_manifest OR
  existing.selected_native_t_utc IS DISTINCT FROM p_native_t OR
  existing.packet_sha256 IS DISTINCT FROM p_packet OR
  existing.source_population_query_id IS DISTINCT FROM p_population_id OR
  existing.source_response_sha256 IS DISTINCT FROM p_response OR
  existing.reviewed_source_rights_sha256 IS DISTINCT FROM p_rights
  THEN RAISE EXCEPTION 'P6_V0100_EXISTING_TASK_IDENTITY_OR_PACKET_CONFLICT'; END IF;
  -- The byte hash commits the reviewed query, native T, and staleness;
  -- do not re-validate expired source for an already registered task,
  -- and never return a new PRE/claim entitlement from this ACK.
  RETURN QUERY SELECT existing.task_id,false;
  RETURN;
 END IF;
 -- All new-task source and cutoff checks remain in original V0091.
 new_id:=clean.phase5_cd_register_source_flight_v39(
 p_manifest,p_query,p_flight,p_horizon,p_native_t,p_packet,
 p_population_id,p_response,p_rights,p_max_staleness);
 RETURN QUERY SELECT new_id,true;
END $ensure$;
REVOKE ALL ON FUNCTION clean.phase5_cd_ensure_exact_source_flight_v39(
 text,text,text,text,timestamptz,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_ensure_exact_source_flight_v39(
 text,text,text,text,timestamptz,text,text,text,text,integer)
 TO phase5_fids_prepare_prod_20261107;
RESET ROLE;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_source_registration_owner_v39;
DO $after$
DECLARE actor name:=current_user;
DECLARE owner_role text:='phase5_cd_source_registration_owner_v39';
DECLARE sig text:='clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)';
BEGIN
 IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=actor) THEN
  EXECUTE format('REVOKE phase5_cd_source_registration_owner_v39 FROM %I GRANTED BY %I',actor,actor);
  IF pg_has_role(actor,owner_role,'SET') THEN
   RAISE EXCEPTION 'P6_V0100_TEMPORARY_SET_NOT_REVOKED'; END IF;
 END IF;
 IF pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid=to_regprocedure(sig)))<>owner_role
 OR has_schema_privilege(owner_role,'clean','CREATE')
 OR NOT has_function_privilege('phase5_fids_prepare_prod_20261107',sig,'EXECUTE')
 OR has_function_privilege('phase5_fids_pre_writer_prod_20261107',sig,'EXECUTE')
 OR has_function_privilege('phase5_fids_source_prod_20261107',sig,'EXECUTE')
 OR has_table_privilege('phase5_fids_prepare_prod_20261107','clean.phase5_cd_pre_task_v39','INSERT')
 OR has_table_privilege('phase5_fids_prepare_prod_20261107','clean.phase5_cd_pre_task_v39','UPDATE')
 OR EXISTS(SELECT 1 FROM pg_proc f CROSS JOIN LATERAL
 aclexplode(COALESCE(f.proacl,acldefault('f',f.proowner))) acl
 WHERE f.oid=to_regprocedure(sig) AND acl.grantee=0 AND acl.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'P6_V0100_WRAPPER_ACL_HOLD'; END IF;
END $after$;
COMMIT;
