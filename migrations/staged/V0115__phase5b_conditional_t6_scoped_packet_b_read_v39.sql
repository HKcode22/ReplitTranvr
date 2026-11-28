-- Additive conditional T6 scoped read; staged only. No role/grant creation,
-- no writes to study data, no replacement of the native physical-leg reader.
-- Owner commissioning must verify existing function owner and narrowly grant
-- EXECUTE only to the existing POST scoped reader, separately from this DDL.
CREATE FUNCTION phase7_private.read_bound_conditional_t6_group_v39(
 p_manifest text,p_snapshot bigint,p_rights text,p_query text,p_day integer,
 p_airport text,p_frame text,p_protocol text)
 RETURNS TABLE(group_id uuid,contract_sha256 text,profile_sha256 text,packet_sha256 text,packet_bytes bytea)
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $read$
 DECLARE v_at timestamptz; v_group uuid; v_contract text; v_profile text;
 BEGIN
 IF current_setting('transaction_read_only')<>'on' OR current_setting('transaction_isolation') NOT IN ('repeatable read','serializable') THEN
  RAISE EXCEPTION 'P7_CONDITIONAL_GROUP_REQUIRES_STABLE_READONLY'; END IF;
 IF p_protocol IS NULL OR p_protocol !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'P7_CONDITIONAL_GROUP_PROTOCOL'; END IF;
 v_at:=clock_timestamp();
 SELECT f.group_id,f.contract_sha256,f.profile_sha256 INTO STRICT v_group,v_contract,v_profile
 FROM phase7_private.pre_source_link_v39 l
 JOIN phase7_private.pre_fragment_v39 f ON f.row_id=l.row_id
 JOIN clean.flight_snapshots s ON s.id=l.snapshot_id
 JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id AND b.response_hash=s.fids_response_hash
 JOIN phase7_private.pre_preservation_policy_v39 pol ON pol.manifest_sha256=b.manifest_sha256 AND pol.contract_sha256=f.contract_sha256 AND pol.profile_sha256=f.profile_sha256
 JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=b.query_digest AND q.manifest_sha256=b.manifest_sha256
 JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash
 JOIN clean.flight_population fp ON fp.population_query_id=b.population_query_id AND fp.population_member_id=s.population_member_id AND fp.canonical_flight_instance_id=s.flight_instance_id
 WHERE q.query_digest=p_query AND q.run_day_index=p_day AND q.airport_icao=p_airport AND q.state='ACTIVE' AND q.rights_review_sha256=p_rights
 AND s.frame_hash=p_frame AND q.horizon='T-6h' AND s.horizon='T-6h' AND f.horizon='T-6h'
 AND s.flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$'
 AND fp.source_airport_icao=q.airport_icao AND fp.dep_airport_icao=q.airport_icao
 AND fp.population_role='requested_airport_primary' AND fp.source_type='fids' AND fp.query_direction='Departure'
 AND fp.scope_classification='unknown' AND fp.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'
 AND fp.arr_airport_icao ~ '^[A-Z]{4}$' AND fp.arr_airport_icao<>q.airport_icao
 AND fp.flight_number ~ '^[A-Z0-9]{2}[0-9]{1,4}$'
 AND r.source_airport_icao=q.airport_icao AND r.query_direction='Departure'
 AND r.raw_payload->>'phase5PopulationIdentityVersion'='P5_CANONICAL_SHA256_V1'
 AND (r.raw_payload->'fidsRequestContract') @> '{"schema":"v39.fids-request-frame.application-intent.v1","endpointKind":"airport_local_fids","direction":"Departure","withLeg":true,"withCargo":false,"withPrivate":false,"withCancelled":true,"withCodeshared":true,"withLocation":false}'::jsonb
 AND r.raw_payload#>>'{fidsRequestContract,airportIcao}'=q.airport_icao
 AND r.raw_payload#>>'{fidsRequestContract,openapiSha256}'=q.provider_contract_sha256
 AND r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,protocolSha256}'=p_protocol
 AND fp.response_hash=b.response_hash
 AND s.selected_t_milestone_utc>=q.service_window_start_utc AND s.selected_t_milestone_utc<q.service_window_end_utc
 AND fp.dep_scheduled_utc>=q.service_window_start_utc AND fp.dep_scheduled_utc<q.service_window_end_utc
 AND s.prediction_cutoff_utc=s.selected_t_milestone_utc-interval '6 hours'
 AND r.available_at<=fp.available_at AND fp.available_at<=s.created_at AND s.created_at<s.prediction_cutoff_utc
 AND s.created_at<=v_at AND v_at<s.selected_t_milestone_utc+interval '2 hours'
 AND fp.provider_content_expired_at_utc IS NULL AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL
 AND s.id=p_snapshot AND s.prediction_state='PRE_DEPARTURE' AND b.manifest_sha256=p_manifest AND b.rights_review_sha256=p_rights AND pol.rights_sha256=p_rights
 AND l.expires_at_utc>v_at AND b.source_expires_at_utc>s.selected_t_milestone_utc+interval '2 hours'
 AND f.research_expiry_utc>v_at AND pol.valid_from_utc<=v_at AND pol.valid_until_utc>v_at;
 RETURN QUERY SELECT f.group_id,f.contract_sha256,f.profile_sha256,f.packet_sha256,f.packet_bytes
 FROM phase7_private.pre_fragment_v39 f
 WHERE f.group_id=v_group AND f.contract_sha256=v_contract AND f.profile_sha256=v_profile AND f.research_expiry_utc>v_at
 ORDER BY CASE f.horizon WHEN 'T-24h' THEN 1 WHEN 'T-6h' THEN 2 ELSE 3 END;
 END $read$;
REVOKE ALL ON FUNCTION phase7_private.read_bound_conditional_t6_group_v39(text,bigint,text,text,integer,text,text,text) FROM PUBLIC;
