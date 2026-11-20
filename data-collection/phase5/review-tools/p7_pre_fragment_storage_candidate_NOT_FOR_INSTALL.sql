-- REVIEW / DISPOSABLE PG16 ONLY. No production grants, no new provider
-- retention authority. Install AFTER the derived bundle candidate schema.
-- Separate durable derived PRE rows from temporary source linkage.
BEGIN;
CREATE TABLE phase7_private.pre_fragment_v39(
 row_id uuid PRIMARY KEY,
 group_id uuid NOT NULL,
 horizon text NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),
 cohort_bucket integer NOT NULL CHECK(cohort_bucket BETWEEN 0 AND 4095),
 split text NOT NULL CHECK(split IN ('train','validation','test')),
 contract_sha256 text NOT NULL CHECK(contract_sha256 ~ '^[a-f0-9]{64}$'),
 profile_sha256 text NOT NULL CHECK(profile_sha256 ~ '^[a-f0-9]{64}$'),
 research_expiry_utc timestamptz NOT NULL,
 packet_sha256 text NOT NULL UNIQUE CHECK(packet_sha256 ~ '^[a-f0-9]{64}$'),
 packet_bytes bytea NOT NULL CHECK(octet_length(packet_bytes) BETWEEN 1 AND 65536),
 UNIQUE(group_id,horizon),
 CHECK(encode(sha256(packet_bytes),'hex')=packet_sha256),
 CHECK(jsonb_typeof(convert_from(packet_bytes,'UTF8')::jsonb)='object'),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb ?& ARRAY['schema','packetId','contractVersion','featureDictionarySha256','rows']),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb - ARRAY['schema','packetId','contractVersion','featureDictionarySha256','rows']='{}'::jsonb),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->>'schema'='v39.phase6.phase7-derived-release-packet.v1'),
 CHECK(jsonb_array_length(convert_from(packet_bytes,'UTF8')::jsonb->'rows')=1),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0->>'releaseRowId'=row_id::text),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0->>'horizon'=horizon),
 CHECK((convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0->>'cohortBucket')::int=cohort_bucket),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0->>'split'=split),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0->>'censoring'='not_due'),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0 ?& ARRAY['releaseRowId','horizon','cohortBucket','split','featureBuckets','labelBuckets','missingness','qualityFlags','censoring']),
 CHECK(convert_from(packet_bytes,'UTF8')::jsonb->'rows'->0 - ARRAY['releaseRowId','horizon','cohortBucket','split','featureBuckets','labelBuckets','missingness','qualityFlags','censoring']='{}'::jsonb)
);
-- Snapshot identity is temporary ONLY. Neither the durable fragment nor its
-- research payload contains the source snapshot ID or operational timestamps.
CREATE TABLE phase7_private.pre_source_link_v39(
 snapshot_id bigint PRIMARY KEY,
 row_id uuid NOT NULL UNIQUE REFERENCES phase7_private.pre_fragment_v39(row_id),
 expires_at_utc timestamptz NOT NULL
);
CREATE INDEX pre_source_link_expiry_v39 ON phase7_private.pre_source_link_v39(expires_at_utc);
REVOKE ALL ON phase7_private.pre_fragment_v39,phase7_private.pre_source_link_v39 FROM PUBLIC;
-- Exact approved profile must be commissioned separately. This inert table
-- cannot be populated by a collector. No production INSERT/UPDATE grants here.
CREATE TABLE phase7_private.pre_preservation_policy_v39(
 manifest_sha256 text PRIMARY KEY CHECK(manifest_sha256 ~ '^[a-f0-9]{64}$'),
 contract_sha256 text NOT NULL CHECK(contract_sha256 ~ '^[a-f0-9]{64}$'),
 profile_sha256 text NOT NULL CHECK(profile_sha256 ~ '^[a-f0-9]{64}$'),
 rights_sha256 text NOT NULL CHECK(rights_sha256 ~ '^[a-f0-9]{64}$'),
 policy_review_sha256 text NOT NULL CHECK(policy_review_sha256 ~ '^[a-f0-9]{64}$'),
 valid_from_utc timestamptz NOT NULL,
 valid_until_utc timestamptz NOT NULL CHECK(valid_until_utc>valid_from_utc),
 mapping_hours integer NOT NULL CHECK(mapping_hours BETWEEN 1 AND 24),
 research_expiry_utc timestamptz NOT NULL CHECK(research_expiry_utc>=valid_until_utc)
);
REVOKE ALL ON phase7_private.pre_preservation_policy_v39 FROM PUBLIC;
-- This admission acts only on the same transaction's exact newly written
-- snapshot, original binding and sealed prospective profile. No old link is
-- extended. Later horizons have their OWN live-source custody deadline.
CREATE FUNCTION phase7_private.persist_bound_pre_fragment_v39(
 p_manifest text,p_query text,p_snapshot bigint,p_candidate_group uuid,
 p_row uuid,p_contract text,p_profile text,p_rights text,p_review text,
 p_packet bytea,p_packet_sha text,p_issue timestamptz,p_source_expiry timestamptz,
 p_mapping_hours integer,p_research_expiry timestamptz
) RETURNS TABLE(group_id uuid,expires_at_utc timestamptz)
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp
 AS $fn$
DECLARE pol phase7_private.pre_preservation_policy_v39%ROWTYPE;
 s record; v_at timestamptz; v_group uuid; v_expiry timestamptz;
 v_payload jsonb; v_row jsonb; v_groups uuid[]; v_cohort int; v_split text;
BEGIN
 IF current_setting('transaction_isolation')<>'serializable' THEN
  RAISE EXCEPTION 'P7_PRE_SERIALIZABLE_REQUIRED'; END IF;
 v_at:=clock_timestamp();
 SELECT * INTO STRICT pol FROM phase7_private.pre_preservation_policy_v39 v
 WHERE v.manifest_sha256=p_manifest AND v.contract_sha256=p_contract
 AND v.profile_sha256=p_profile AND v.rights_sha256=p_rights AND v.policy_review_sha256=p_review
 AND v.mapping_hours=p_mapping_hours AND v.research_expiry_utc=p_research_expiry
 AND v.valid_from_utc<=v_at AND v.valid_until_utc>v_at;
 IF EXISTS(SELECT 1 FROM phase7_private.pre_source_link_v39 l WHERE l.expires_at_utc<=v_at) THEN
  RAISE EXCEPTION 'P7_PRE_DUE_LINK_CLEANUP_REQUIRED'; END IF;
 SELECT x.id,x.flight_instance_id,x.horizon,x.selected_t_milestone_utc,x.prediction_cutoff_utc,x.frame_hash,x.config_hash,x.created_at,
 b.source_expires_at_utc INTO STRICT s
 FROM clean.flight_snapshots x JOIN clean.phase5_fids_original_binding_v39 b
 ON b.population_query_id=x.population_query_id AND b.response_hash=x.fids_response_hash
 WHERE x.id=p_snapshot AND x.prediction_state='PRE_DEPARTURE'
 AND b.manifest_sha256=p_manifest AND b.query_digest=p_query
 AND b.rights_review_sha256=p_rights
 AND b.source_expires_at_utc=p_source_expiry;
 -- The tuple must have been inserted by this very transaction. A delayed
 -- replay of an old PRE row cannot become a newly approved durable fragment.
 IF NOT EXISTS(SELECT 1 FROM clean.flight_snapshots x WHERE x.id=p_snapshot
 AND x.xmin=pg_current_xact_id()::xid) OR p_issue>s.created_at OR p_issue>v_at
 OR s.prediction_cutoff_utc<=v_at OR s.source_expires_at_utc<=v_at THEN
  RAISE EXCEPTION 'P7_PRE_NOT_SAME_LIVE_TRANSACTION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('p7-pre-group'),hashtext(s.flight_instance_id));
 v_at:=clock_timestamp();
 IF v_at>=s.prediction_cutoff_utc OR v_at>=s.source_expires_at_utc OR v_at>=pol.valid_until_utc THEN
  RAISE EXCEPTION 'P7_PRE_CLOCK_ELAPSED'; END IF;
 v_payload:=convert_from(p_packet,'UTF8')::jsonb;v_row:=v_payload->'rows'->0;
 IF (v_row->>'horizon') IS DISTINCT FROM s.horizon OR (v_row->>'releaseRowId') IS DISTINCT FROM p_row::text THEN
  RAISE EXCEPTION 'P7_PRE_FRAGMENT_IDENTITY'; END IF;
 v_cohort:=(v_row->>'cohortBucket')::int;v_split:=v_row->>'split';
 SELECT array_agg(DISTINCT f.group_id) INTO v_groups
 FROM phase7_private.pre_source_link_v39 l
 JOIN phase7_private.pre_fragment_v39 f ON f.row_id=l.row_id
 JOIN clean.flight_snapshots prior ON prior.id=l.snapshot_id
 WHERE l.expires_at_utc>v_at AND prior.flight_instance_id=s.flight_instance_id
 AND prior.selected_t_milestone_utc=s.selected_t_milestone_utc
 AND prior.frame_hash=s.frame_hash AND prior.config_hash=s.config_hash
 AND f.contract_sha256=p_contract AND f.profile_sha256=p_profile;
 IF coalesce(cardinality(v_groups),0)>1 THEN RAISE EXCEPTION 'P7_PRE_AMBIGUOUS_LIVE_ASSOCIATION'; END IF;
 v_group:=coalesce(v_groups[1],p_candidate_group);
 IF EXISTS(SELECT 1 FROM phase7_private.pre_fragment_v39 f WHERE f.group_id=v_group
 AND (f.cohort_bucket<>v_cohort OR f.split<>v_split OR f.contract_sha256<>p_contract
 OR f.profile_sha256<>p_profile OR f.research_expiry_utc<>p_research_expiry))
 THEN RAISE EXCEPTION 'P7_PRE_GROUP_PROFILE_OR_SPLIT_DRIFT'; END IF;
 v_expiry:=least(s.source_expires_at_utc,p_issue+make_interval(hours=>p_mapping_hours),pol.valid_until_utc,p_research_expiry);
 IF v_expiry<=v_at THEN RAISE EXCEPTION 'P7_PRE_LINK_EXPIRED'; END IF;
 INSERT INTO phase7_private.pre_fragment_v39(row_id,group_id,horizon,cohort_bucket,split,contract_sha256,profile_sha256,research_expiry_utc,packet_sha256,packet_bytes)
 VALUES(p_row,v_group,s.horizon,v_cohort,v_split,p_contract,p_profile,p_research_expiry,p_packet_sha,p_packet);
 INSERT INTO phase7_private.pre_source_link_v39(snapshot_id,row_id,expires_at_utc) VALUES(p_snapshot,p_row,v_expiry);
 RETURN QUERY SELECT v_group,v_expiry;
END $fn$;
REVOKE ALL ON FUNCTION phase7_private.persist_bound_pre_fragment_v39(text,text,bigint,uuid,uuid,text,text,text,text,bytea,text,timestamptz,timestamptz,integer,timestamptz) FROM PUBLIC;
-- Deliberately separate safe due-only sweep; no source or durable-row DELETE.
CREATE FUNCTION phase7_private.sweep_due_pre_links_v39(p_limit int)
 RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE n int;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'P7_LINK_SWEEP_LIMIT'; END IF;
 WITH due AS (SELECT snapshot_id FROM phase7_private.pre_source_link_v39 WHERE expires_at_utc<=clock_timestamp()
  ORDER BY expires_at_utc,snapshot_id LIMIT p_limit FOR UPDATE SKIP LOCKED)
 DELETE FROM phase7_private.pre_source_link_v39 l USING due WHERE l.snapshot_id=due.snapshot_id;
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n;
END $fn$;
REVOKE ALL ON FUNCTION phase7_private.sweep_due_pre_links_v39(integer) FROM PUBLIC;
COMMIT;
