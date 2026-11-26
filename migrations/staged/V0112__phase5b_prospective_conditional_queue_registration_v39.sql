-- STAGED only: extend existing V0091 registration for explicitly marked
-- prospective G5A members, without adding a queue, role or grant. V0100
-- delegates new registrations to this exact function. The existing signed
-- application admission must separately bind the reviewed conditional
-- protocol; the SQL does not create or approve a packet or physical label.
-- Existing native branch and all source/time/rights/role checks preserved.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $p5_conditional_registration$
DECLARE
 sig constant text:='clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)';
 prior text;
 successor text;
 original_owner oid;
 original_acl aclitem[];
 old_source constant text := $old$    r.source_airport_icao,r.query_direction,
    r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL$old$;
 new_source constant text := $new$    r.source_airport_icao,r.query_direction,
    r.raw_payload->>'phase5PopulationIdentityVersion' AS identity_version,
    r.raw_payload->'fidsRequestContract' AS request_contract,
    r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL$new$;
 old_member constant text := $old$    m.response_hash,m.provider_content_expired_at_utc,
    m.available_at,m.dep_scheduled_utc,m.population_member_id$old$;
 new_member constant text := $new$    m.response_hash,m.provider_content_expired_at_utc,
    m.available_at,m.dep_scheduled_utc,m.population_member_id,
    m.arr_airport_icao,m.flight_number,m.query_direction$new$;
 old_predicate constant text := $old$   member.scope_classification<>'confirmed_core' OR
   member.codeshare_resolution_status<>'confirmed_operating_leg' OR$old$;
 new_predicate constant text := $new$   NOT COALESCE((
     (member.scope_classification='confirmed_core' AND member.codeshare_resolution_status='confirmed_operating_leg'
       AND p_flight !~ '^leg:g5a:')
     OR (
       member.scope_classification='unknown'
       AND member.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'
       AND p_flight ~ '^leg:g5a:[a-f0-9]{64}$'
       AND member.arr_airport_icao ~ '^[A-Z]{4}$'
       AND member.arr_airport_icao<>source_row.airport_icao
       AND member.flight_number ~ '^[A-Z0-9]{2}[0-9]{1,4}$'
       AND member.query_direction='Departure'
       AND source_row.identity_version='P5_CANONICAL_SHA256_V1'
       AND source_row.request_contract @> '{"schema":"v39.fids-request-frame.application-intent.v1","endpointKind":"airport_local_fids","direction":"Departure","withLeg":true,"withCargo":false,"withPrivate":false,"withCancelled":true,"withCodeshared":true,"withLocation":false}'::jsonb
       AND source_row.request_contract->>'airportIcao'=source_row.airport_icao
       AND source_row.request_contract->>'openapiSha256'=source_row.provider_contract_sha256
       AND source_row.request_contract#>>'{phase5ConditionalService,protocolSha256}' ~ '^[a-f0-9]{64}$'
       AND CASE WHEN source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00[.]000Z$'
         THEN (source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}')::timestamptz<=source_row.service_window_start_utc
           AND source_row.service_window_end_utc<=(source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}')::timestamptz+interval '6 hours'
         ELSE false END
     )),false) OR$new$;
BEGIN
 IF current_database()<>'neondb' OR current_setting('server_version_num')::int/10000<>16 OR pg_is_in_recovery()
 THEN RAISE EXCEPTION 'P5B_V0091_WRONG_DATABASE'; END IF;
 SELECT pg_get_functiondef(p.oid),p.proowner,p.proacl INTO prior,original_owner,original_acl
 FROM pg_proc p WHERE p.oid=to_regprocedure(sig)
 AND p.prosecdef AND pg_get_userbyid(p.proowner)='phase5_cd_source_registration_owner_v39';
 IF prior IS NULL OR position('g5a_conditional_operator_composite_no_native_id' in prior)>0
 OR (length(prior)-length(replace(prior,old_source,'')))<>length(old_source)
 OR (length(prior)-length(replace(prior,old_member,'')))<>length(old_member)
 OR (length(prior)-length(replace(prior,old_predicate,'')))<>length(old_predicate)
 THEN RAISE EXCEPTION 'P5B_V0091_EXACT_PREDECESSOR_REQUIRED'; END IF;
 successor:=replace(replace(replace(prior,old_source,new_source),old_member,new_member),old_predicate,new_predicate);
 EXECUTE successor;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(sig)
 AND p.proowner=original_owner AND p.proacl IS NOT DISTINCT FROM original_acl AND p.prosecdef)
 THEN RAISE EXCEPTION 'P5B_V0091_FUNCTION_OWNER_OR_ACL_CHANGED'; END IF;
END $p5_conditional_registration$;
COMMIT;
