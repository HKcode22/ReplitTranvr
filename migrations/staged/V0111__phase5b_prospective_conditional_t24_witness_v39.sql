-- Staged only: preserve the existing V0081 witness table, immutable trigger,
-- role ACLs and exact native branch. Extend only the reviewed BEFORE INSERT
-- predicate for an explicitly marked prospective G5A SOURCE original.
-- No data rewrite, grants, role creation, provider calls or production install.
DO $p5_conditional_witness$
DECLARE
 previous_definition text;
 successor_definition text;
 old_predicate constant text := $old$   AND p.scope_classification='confirmed_core'
   AND p.codeshare_resolution_status='confirmed_operating_leg'$old$;
 new_predicate constant text := $new$   AND (
     (p.scope_classification='confirmed_core'
      AND p.codeshare_resolution_status='confirmed_operating_leg')
     OR (
      p.scope_classification='unknown'
      AND p.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'
      AND s.flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$'
      AND p.dep_airport_icao=approved.airport_icao
      AND p.arr_airport_icao ~ '^[A-Z]{4}$'
      AND p.arr_airport_icao<>p.dep_airport_icao
      AND p.flight_number ~ '^[A-Z0-9]{2}[0-9]{1,4}$'
      AND p.query_direction='Departure'
      AND approved.state='ACTIVE'
      AND b.bound_at_utc<=s.prediction_cutoff_utc
      AND p.dep_scheduled_utc=s.selected_t_milestone_utc
      AND r.raw_payload->>'phase5PopulationIdentityVersion'='P5_CANONICAL_SHA256_V1'
      AND r.raw_payload->'fidsRequestContract' @> '{"schema":"v39.fids-request-frame.application-intent.v1","endpointKind":"airport_local_fids","direction":"Departure","withLeg":true,"withCargo":false,"withPrivate":false,"withCancelled":true,"withCodeshared":true,"withLocation":false}'::jsonb
      AND r.raw_payload#>>'{fidsRequestContract,airportIcao}'=approved.airport_icao
      AND r.raw_payload#>>'{fidsRequestContract,openapiSha256}'=approved.provider_contract_sha256
      AND r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,protocolSha256}' ~ '^[a-f0-9]{64}$'
      AND CASE
       WHEN r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,cohortStartUtc}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00[.]000Z$'
       THEN (r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,cohortStartUtc}')::timestamptz <= approved.service_window_start_utc
         AND approved.service_window_end_utc <= (r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,cohortStartUtc}')::timestamptz+interval '6 hours'
       ELSE false END
     )
   )$new$;
BEGIN
 SELECT pg_get_functiondef('clean.phase5_t24_witness_before_insert_v39()'::regprocedure)
 INTO previous_definition;
 -- Do not overwrite a changed/previously applied function or silently
 -- substitute a missing match. Keep the rest of its exact live definition,
 -- including SECURITY/SET attributes, rather than recreating from a template.
 IF previous_definition IS NULL
    OR (length(previous_definition)-length(replace(previous_definition,old_predicate,'')))<>length(old_predicate)
    OR position('g5a_conditional_operator_composite_no_native_id' in previous_definition)>0
 THEN RAISE EXCEPTION 'P5B_V0081_EXACT_PREDECESSOR_PREDICATE_REQUIRED'; END IF;
 successor_definition:=replace(previous_definition,old_predicate,new_predicate);
 EXECUTE successor_definition;
END $p5_conditional_witness$;
