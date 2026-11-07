-- V0079 STAGED / DISPOSABLE-POSTGRES16 TEST ONLY.
-- Phase5 31-day adaptive four-slot FIDS source: independent irreversible
-- physical GET reservations, capped daily+cycle budgets, per-query contract,
-- immutable original-decoded-body SHA binding to a real FIDS observation.
--
-- NEVER auto install. NO production grants. Requires B0062 and a separately
-- frozen/approved P5 daily calendar, per-day actual early-sampling draw, rights,
-- current provider pricing and exact Github-only owner code SHA.
-- A rights SHA or PASSING DB constraints is not legal source permission.
-- This ledger DOES NOT create PRE, POST, native operating-leg labels, or GO.
-- Unlike Gate5 V0076, NO UNIQUE(manifest,horizon): 31 days/4 airports.
-- IMPORTANT: service/run-day and physical paid UTC charge-day may differ.
-- A T-24h GET often precedes its flight-service date by one UTC day.
-- BOTH ledgers are required; never use run_day_index alone for billing.
CREATE TABLE clean.phase5_fids_cycle_budget_v39 (
 manifest_sha256 text PRIMARY KEY CHECK(manifest_sha256 ~ '^[0-9a-f]{64}$'),
 cycle_api_ceiling integer NOT NULL CHECK(cycle_api_ceiling BETWEEN 2 AND 50000),
 other_category_reserved_units integer NOT NULL CHECK(other_category_reserved_units>=0),
 protected_api_floor_units integer NOT NULL CHECK(protected_api_floor_units>=0),
 physically_reserved_units integer NOT NULL DEFAULT 0
   CHECK(physically_reserved_units>=0),
 created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT p5_cycle_total_reserve_v39 CHECK(
   physically_reserved_units+other_category_reserved_units+
   protected_api_floor_units<=cycle_api_ceiling)
);
CREATE TABLE clean.phase5_fids_day_budget_v39 (
 manifest_sha256 text NOT NULL
   REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 run_day_index integer NOT NULL CHECK(run_day_index BETWEEN 1 AND 31),
 budget_day_utc date NOT NULL,
 calendar_hash text NOT NULL CHECK(calendar_hash ~ '^[0-9a-f]{64}$'),
 config_hash text NOT NULL CHECK(config_hash ~ '^[0-9a-f]{64}$'),
 frame_hash text NOT NULL CHECK(frame_hash ~ '^[0-9a-f]{64}$'),
 early_draw_sha256 text NOT NULL CHECK(early_draw_sha256 ~ '^[0-9a-f]{64}$'),
 daily_api_ceiling integer NOT NULL CHECK(daily_api_ceiling BETWEEN 2 AND 1900),
 daily_other_reserved_units integer NOT NULL CHECK(daily_other_reserved_units>=0),
 daily_source_reserved_units integer NOT NULL DEFAULT 0
   CHECK(daily_source_reserved_units>=0),
 PRIMARY KEY(manifest_sha256,run_day_index),
 UNIQUE(manifest_sha256,budget_day_utc),
 CONSTRAINT p5_daily_combined_reserved_v39 CHECK(
   daily_other_reserved_units+daily_source_reserved_units<=daily_api_ceiling)
);
-- A *separate* UTC charge-day ledger follows actual paid dispatch, NOT
-- flight service/run day. Day 0 (the day before service Day1) is mandatory
-- whenever it contains T-24h GETs. Each date requires frozen other-category
-- reservations; no implicit zero for unknown billed API categories.
CREATE TABLE clean.phase5_fids_utc_charge_budget_v39 (
 manifest_sha256 text NOT NULL
   REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 charge_day_utc date NOT NULL,
 daily_api_ceiling integer NOT NULL CHECK(daily_api_ceiling BETWEEN 2 AND 1900),
 daily_other_reserved_units integer NOT NULL CHECK(daily_other_reserved_units>=0),
 physically_reserved_units integer NOT NULL DEFAULT 0 CHECK(physically_reserved_units>=0),
 PRIMARY KEY(manifest_sha256,charge_day_utc),
 CONSTRAINT p5_utc_charge_budget_total_v39 CHECK(
   physically_reserved_units+daily_other_reserved_units<=daily_api_ceiling)
);
-- A signed query exists once per actual day/slot/horizon/subwindow; it must
-- be entered by an independently reviewed pre-arm writer, not a paid GET job.
CREATE TABLE clean.phase5_fids_allowed_query_v39 (
 query_digest text PRIMARY KEY CHECK(query_digest ~ '^[0-9a-f]{64}$'),
 manifest_sha256 text NOT NULL,
 run_day_index integer NOT NULL,
 query_key text NOT NULL CHECK(query_key ~ '^[A-Za-z0-9_.:-]{8,150}$'),
 slot_id text NOT NULL CHECK(slot_id IN ('HUB','MID_A','MID_B','REGIONAL')),
 horizon text NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),
 airport_icao text NOT NULL CHECK(airport_icao ~ '^[A-Z]{4}$'),
 early_draw_sha256 text NOT NULL CHECK(early_draw_sha256 ~ '^[0-9a-f]{64}$'),
 reviewed_release_sha256 text NOT NULL CHECK(reviewed_release_sha256 ~ '^[0-9a-f]{64}$'),
 rights_review_sha256 text NOT NULL CHECK(rights_review_sha256 ~ '^[0-9a-f]{64}$'),
 provider_contract_sha256 text NOT NULL CHECK(provider_contract_sha256 ~ '^[0-9a-f]{64}$'),
 github_run_id text NOT NULL CHECK(github_run_id ~ '^[0-9]{5,25}$'),
 service_window_start_utc timestamptz NOT NULL,
 service_window_end_utc timestamptz NOT NULL,
 from_local text NOT NULL,
 to_local text NOT NULL,
 airport_iana_timezone text NOT NULL,
 provider_api_version text NOT NULL,
 fids_protocol_version text NOT NULL,
 planned_dispatch_utc timestamptz NOT NULL,
 -- A real physical GET MUST be charged on this independently frozen
 -- UTC calendar day. No late source reroute across midnight.
 planned_charge_utc_date date NOT NULL,
 hard_latest_dispatch_utc timestamptz NOT NULL,
 prediction_cutoff_utc timestamptz NOT NULL,
 api_units_per_attempt integer NOT NULL DEFAULT 2 CHECK(api_units_per_attempt=2),
 max_physical_attempts integer NOT NULL DEFAULT 1 CHECK(max_physical_attempts=1),
 last_reserved_attempt integer NOT NULL DEFAULT 0
   CHECK(last_reserved_attempt BETWEEN 0 AND 1),
 state text NOT NULL DEFAULT 'PREPARED'
   CHECK(state IN ('PREPARED','ACTIVE','STOPPED')),
 created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(manifest_sha256,run_day_index)
   REFERENCES clean.phase5_fids_day_budget_v39(manifest_sha256,run_day_index),
 UNIQUE(manifest_sha256,query_key),
 CONSTRAINT p5_fids_query_clock_v39 CHECK(
   service_window_start_utc<service_window_end_utc
   AND planned_dispatch_utc<=hard_latest_dispatch_utc
   AND (planned_dispatch_utc AT TIME ZONE 'UTC')::date=planned_charge_utc_date
   AND hard_latest_dispatch_utc<=prediction_cutoff_utc-INTERVAL '2 minutes'
   AND prediction_cutoff_utc<service_window_end_utc)
);
CREATE INDEX p5_allowed_source_day_v39
 ON clean.phase5_fids_allowed_query_v39(manifest_sha256,run_day_index,slot_id,horizon);
CREATE TABLE clean.phase5_fids_physical_attempt_v39 (
 reservation_sha256 text PRIMARY KEY CHECK(reservation_sha256 ~ '^[0-9a-f]{64}$'),
 query_digest text NOT NULL UNIQUE
   REFERENCES clean.phase5_fids_allowed_query_v39(query_digest),
 manifest_sha256 text NOT NULL
   REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 github_run_id text NOT NULL,
 physical_attempt_number integer NOT NULL DEFAULT 1
   CHECK(physical_attempt_number=1),
 charged_reserved_units integer NOT NULL DEFAULT 2
   CHECK(charged_reserved_units=2),
 committed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 observed_selected_at_utc timestamptz NOT NULL,
 charged_utc_date date NOT NULL,
 FOREIGN KEY(manifest_sha256,charged_utc_date)
  REFERENCES clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc)
);
CREATE FUNCTION clean.phase5_fids_attempt_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $p5imm$
BEGIN
 RAISE EXCEPTION 'P5_IRREVERSIBLE_PHYSICAL_RESERVATION';
END $p5imm$;
CREATE TRIGGER phase5_fids_attempt_immutable_v39
 BEFORE UPDATE OR DELETE ON clean.phase5_fids_physical_attempt_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_attempt_immutable_v39();

-- Reserve commits in a SEPARATE transaction BEFORE any provider request.
-- Caller computes expected_sha256=sha256(manifest|query_digest|github_run_id|1).
-- Never refund on timeout, crash, non-2xx or ambiguous dispatch.
CREATE FUNCTION clean.reserve_phase5_fids_physical_get_v39(
 p_manifest text, p_query text, p_github_run_id text,
 p_early_draw_sha256 text, p_rights_sha256 text,
 p_expected_reservation_sha256 text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,clean
AS $p5reserve$
DECLARE
 v_cycle clean.phase5_fids_cycle_budget_v39%ROWTYPE;
 v_day clean.phase5_fids_day_budget_v39%ROWTYPE;
 v_charge clean.phase5_fids_utc_charge_budget_v39%ROWTYPE;
 v_charge_date date;
 v_query clean.phase5_fids_allowed_query_v39%ROWTYPE;
 v_selected timestamptz;
 v_n integer;
 v_now timestamptz;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
    OR p_query IS NULL OR p_query !~ '^[0-9a-f]{64}$'
    OR p_expected_reservation_sha256 IS NULL
    OR p_expected_reservation_sha256 !~ '^[0-9a-f]{64}$'
    OR p_github_run_id IS NULL OR p_github_run_id !~ '^[0-9]{5,25}$'
    OR p_early_draw_sha256 IS NULL OR
       p_early_draw_sha256 !~ '^[0-9a-f]{64}$'
    OR p_rights_sha256 IS NULL OR p_rights_sha256 !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'P5_GET_RESERVATION_INPUT_HOLD'; END IF;
 SELECT * INTO v_cycle FROM clean.phase5_fids_cycle_budget_v39
 WHERE manifest_sha256=p_manifest FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_CYCLE_BUDGET_NOT_FROZEN'; END IF;
 SELECT * INTO v_query FROM clean.phase5_fids_allowed_query_v39
 WHERE query_digest=p_query AND manifest_sha256=p_manifest FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_QUERY_NOT_FROZEN'; END IF;
 SELECT * INTO v_day FROM clean.phase5_fids_day_budget_v39
 WHERE manifest_sha256=p_manifest AND run_day_index=v_query.run_day_index FOR UPDATE;
 IF NOT FOUND OR v_day.early_draw_sha256 IS DISTINCT FROM p_early_draw_sha256
    OR v_query.early_draw_sha256 IS DISTINCT FROM p_early_draw_sha256
    OR v_query.rights_review_sha256 IS DISTINCT FROM p_rights_sha256
    OR v_day.calendar_hash IS DISTINCT FROM
       (SELECT c.calendar_hash FROM clean.adb_phase6_calendar_day c
        WHERE c.run_day_index=v_day.run_day_index)
    OR v_day.config_hash IS DISTINCT FROM
       (SELECT c.config_hash FROM clean.adb_phase6_calendar_day c
        WHERE c.run_day_index=v_day.run_day_index)
    OR v_day.frame_hash IS DISTINCT FROM
       (SELECT c.frame_hash FROM clean.adb_phase6_calendar_day c
        WHERE c.run_day_index=v_day.run_day_index)
 THEN RAISE EXCEPTION 'P5_DAILY_RELEASE_OR_CALENDAR_HASH_MISMATCH'; END IF;
 IF v_query.github_run_id<>p_github_run_id OR v_query.state<>'ACTIVE'
    OR v_query.last_reserved_attempt<>0
 THEN RAISE EXCEPTION 'P5_PHYSICAL_QUERY_NOT_ACTIVE_OR_ALREADY_RESERVED'; END IF;
 -- No reliance on a string SHA alone: the four selected rows must exist
 -- already and the selected airport must match this exact day+slot.
 SELECT COUNT(*),MIN(d.selected_at_utc) INTO v_n,v_selected
 FROM clean.adb_sampling_draw d
 WHERE d.run_day_index=v_query.run_day_index;
 IF v_n<>4 OR
    EXISTS(SELECT 1 FROM clean.adb_sampling_draw d
      WHERE d.run_day_index=v_query.run_day_index
        AND d.selected_at_utc<>v_selected) OR
    NOT EXISTS(SELECT 1 FROM clean.adb_sampling_draw d
      WHERE d.run_day_index=v_query.run_day_index
        AND d.slot_id=v_query.slot_id AND d.selected_icao=v_query.airport_icao)
 THEN RAISE EXCEPTION 'P5_EARLY_FOUR_SLOT_SELECTION_MISSING_OR_CHANGED'; END IF;
 v_now=clock_timestamp();
 v_charge_date=(v_now AT TIME ZONE 'UTC')::date;
 -- Charging the actual physical request date is mandatory, even when
 -- the selected service day occurs tomorrow (T-24h) or after UTC midnight.
 -- One signed planned charge day only: a delayed request crossing UTC day
 -- is a missed prospective source, not permission to charge another day.
 IF v_charge_date IS DISTINCT FROM v_query.planned_charge_utc_date
 THEN RAISE EXCEPTION 'P5_ACTUAL_UTC_CHARGE_DAY_MISMATCH_HOLD'; END IF;
 -- Avoid sending a GET through UTC midnight after the transaction commits.
 -- A narrow late-day blackout is classified as missed rather than risk
 -- unrecorded day+1 billing; an individual source can remain NULL.
 IF EXTRACT(HOUR FROM (v_now AT TIME ZONE 'UTC'))=23 AND
    EXTRACT(MINUTE FROM (v_now AT TIME ZONE 'UTC'))>=50
 THEN RAISE EXCEPTION 'P5_UTC_MIDNIGHT_PAID_DISPATCH_BLACKOUT'; END IF;
 SELECT * INTO v_charge FROM clean.phase5_fids_utc_charge_budget_v39
 WHERE manifest_sha256=p_manifest AND charge_day_utc=v_charge_date FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_UTC_CHARGE_DAY_NOT_FROZEN'; END IF;
 IF v_selected>=v_query.planned_dispatch_utc OR
    v_selected>=(SELECT c.scheduled_start_utc - INTERVAL '24 hours 30 minutes'
      FROM clean.adb_phase6_calendar_day c
      WHERE c.run_day_index=v_query.run_day_index) OR
    v_now<v_query.planned_dispatch_utc OR
    v_now>v_query.hard_latest_dispatch_utc OR
    v_now>=v_query.prediction_cutoff_utc-INTERVAL '2 minutes'
 THEN RAISE EXCEPTION 'P5_FIDS_GET_NOT_IN_PROSPECTIVE_WINDOW'; END IF;
 IF p_expected_reservation_sha256<>encode(sha256(convert_to(
   p_manifest||'|'||p_query||'|'||p_github_run_id||'|1','UTF8')),'hex')
 THEN RAISE EXCEPTION 'P5_GET_RESERVATION_DIGEST_MISMATCH'; END IF;
 IF v_cycle.physically_reserved_units+2+
    v_cycle.other_category_reserved_units+v_cycle.protected_api_floor_units>
      v_cycle.cycle_api_ceiling
 THEN RAISE EXCEPTION 'P5_CYCLE_API_UNITS_EXHAUSTED'; END IF;
 IF v_day.daily_source_reserved_units+2+v_day.daily_other_reserved_units>
    v_day.daily_api_ceiling
 THEN RAISE EXCEPTION 'P5_DAY_API_UNITS_EXHAUSTED'; END IF;
 IF v_charge.physically_reserved_units+2+v_charge.daily_other_reserved_units>
    v_charge.daily_api_ceiling
 THEN RAISE EXCEPTION 'P5_UTC_CHARGE_DAY_API_UNITS_EXHAUSTED'; END IF;
 UPDATE clean.phase5_fids_utc_charge_budget_v39
 SET physically_reserved_units=physically_reserved_units+2
 WHERE manifest_sha256=p_manifest AND charge_day_utc=v_charge_date;
 UPDATE clean.phase5_fids_cycle_budget_v39
 SET physically_reserved_units=physically_reserved_units+2 WHERE manifest_sha256=p_manifest;
 UPDATE clean.phase5_fids_day_budget_v39
 SET daily_source_reserved_units=daily_source_reserved_units+2
 WHERE manifest_sha256=p_manifest AND run_day_index=v_query.run_day_index;
 UPDATE clean.phase5_fids_allowed_query_v39
 SET last_reserved_attempt=1 WHERE query_digest=p_query;
 INSERT INTO clean.phase5_fids_physical_attempt_v39(
 reservation_sha256,query_digest,manifest_sha256,github_run_id,
 physical_attempt_number,charged_reserved_units,
 committed_at_utc,observed_selected_at_utc,charged_utc_date)
 VALUES(p_expected_reservation_sha256,p_query,p_manifest,p_github_run_id,
   1,2,v_now,v_selected,v_charge_date);
 RETURN v_now;
END $p5reserve$;

-- Source original binding: actual provider-decoded body bytes are stored
-- under fids_query_response.raw_payload.originalDecodedEntityBodyEvidence.
-- It is NOT a verifiable HTTP wire-byte receipt. Binding does not certify
-- individual flight-level PRE or legal permissions.
CREATE TABLE clean.phase5_fids_original_binding_v39 (
 population_query_id uuid PRIMARY KEY
   REFERENCES clean.fids_query_response(population_query_id),
 reservation_sha256 text NOT NULL UNIQUE
   REFERENCES clean.phase5_fids_physical_attempt_v39(reservation_sha256),
 query_digest text NOT NULL
   REFERENCES clean.phase5_fids_allowed_query_v39(query_digest),
 manifest_sha256 text NOT NULL
   REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 response_hash text NOT NULL CHECK(response_hash ~ '^[0-9a-f]{64}$'),
 decoded_original_body_sha256 text NOT NULL
   CHECK(decoded_original_body_sha256 ~ '^[0-9a-f]{64}$'),
 rights_review_sha256 text NOT NULL
   CHECK(rights_review_sha256 ~ '^[0-9a-f]{64}$'),
 normalized_members_count integer NOT NULL CHECK(normalized_members_count BETWEEN 0 AND 10000),
 source_expires_at_utc timestamptz NOT NULL,
 bound_at_utc timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE FUNCTION clean.phase5_fids_check_original_v39()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,clean
AS $p5bind$
DECLARE
 a record;
 f record;
 v_bytes bytea;
 v_items integer;
BEGIN
 SELECT p.query_digest AS actual_query,p.committed_at_utc,
        q.manifest_sha256,q.query_digest,q.airport_icao,q.service_window_start_utc,
        q.service_window_end_utc,q.from_local,q.to_local,q.airport_iana_timezone,
        q.provider_api_version,q.fids_protocol_version,q.provider_contract_sha256,
        q.rights_review_sha256
 INTO a FROM clean.phase5_fids_physical_attempt_v39 p
 JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=p.query_digest
 WHERE p.reservation_sha256=NEW.reservation_sha256;
 IF NOT FOUND OR a.query_digest IS DISTINCT FROM NEW.query_digest
    OR a.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256
    OR a.rights_review_sha256 IS DISTINCT FROM NEW.rights_review_sha256
 THEN RAISE EXCEPTION 'P5_ORIGINAL_UNBOUND_PHYSICAL_GET'; END IF;
 SELECT source_airport_icao,query_direction,service_window_start_utc,
        service_window_end_utc,from_local,to_local,airport_iana_timezone,
        provider_api_version,fids_protocol_version,openapi_sha256,
        fids_retrieval_utc,raw_persisted_at_utc,available_at,
        response_hash,raw_payload,raw_expired_at_utc
 INTO f FROM clean.fids_query_response
 WHERE population_query_id=NEW.population_query_id;
 IF NOT FOUND OR f.raw_payload IS NULL OR f.raw_expired_at_utc IS NOT NULL
    OR f.source_airport_icao<>a.airport_icao OR f.query_direction<>'Departure'
    OR f.service_window_start_utc<>a.service_window_start_utc
    OR f.service_window_end_utc<>a.service_window_end_utc
    OR f.from_local<>a.from_local OR f.to_local<>a.to_local
    OR f.airport_iana_timezone<>a.airport_iana_timezone
    OR f.provider_api_version<>a.provider_api_version
    OR f.fids_protocol_version<>a.fids_protocol_version
    OR f.openapi_sha256<>a.provider_contract_sha256
    OR f.response_hash IS DISTINCT FROM NEW.response_hash
    OR f.fids_retrieval_utc<a.committed_at_utc
    OR f.available_at<a.committed_at_utc
    OR f.available_at<f.fids_retrieval_utc OR f.raw_persisted_at_utc>f.available_at
    OR f.available_at>clock_timestamp()+INTERVAL '2 seconds'
    OR NEW.bound_at_utc<f.available_at
    OR NEW.bound_at_utc<clock_timestamp()-INTERVAL '15 seconds'
    OR NEW.bound_at_utc>clock_timestamp()+INTERVAL '2 seconds'
    OR NEW.source_expires_at_utc<=clock_timestamp()
    OR NEW.source_expires_at_utc>f.available_at+INTERVAL '23 hours'
 THEN RAISE EXCEPTION 'P5_ORIGINAL_SOURCE_FRAME_CLOCK_RIGHTS_HOLD'; END IF;
 IF f.raw_payload->>'originalDecodedEntityBodyPreserved' IS DISTINCT FROM 'true'
    OR f.raw_payload->>'originalHttpWireBytesPreserved' IS DISTINCT FROM 'false'
    OR f.raw_payload#>>'{originalDecodedEntityBodyEvidence,representation}'
       IS DISTINCT FROM 'FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE'
    OR f.raw_payload#>>'{originalDecodedEntityBodyEvidence,bodySha256}'
       IS DISTINCT FROM NEW.decoded_original_body_sha256
 THEN RAISE EXCEPTION 'P5_ORIGINAL_DECODED_BODY_EVIDENCE_HOLD'; END IF;
 -- Decoded body can contain provider Content; never print it in exceptions.
 v_bytes=decode(f.raw_payload#>>'{originalDecodedEntityBodyEvidence,bodyBase64}','base64');
 IF v_bytes IS NULL OR octet_length(v_bytes)>4194304 OR
    encode(sha256(v_bytes),'hex')<>NEW.decoded_original_body_sha256 OR
    octet_length(v_bytes)<>(f.raw_payload#>>'{originalDecodedEntityBodyEvidence,bodyLengthBytes}')::integer
 THEN RAISE EXCEPTION 'P5_ORIGINAL_DECODED_BODY_HASH_HOLD'; END IF;
 SELECT COUNT(*) INTO v_items FROM clean.flight_population
 WHERE population_query_id=NEW.population_query_id;
 IF v_items<>NEW.normalized_members_count OR
    EXISTS(SELECT 1 FROM clean.flight_population
      WHERE population_query_id=NEW.population_query_id
        AND (source_airport_icao<>a.airport_icao
          OR source_type<>'fids' OR available_at<f.available_at))
 THEN RAISE EXCEPTION 'P5_ORIGINAL_ATOMIC_POPULATION_INCOMPLETE'; END IF;
 RETURN NEW;
END $p5bind$;
CREATE TRIGGER phase5_fids_original_ins_check_v39
 BEFORE INSERT ON clean.phase5_fids_original_binding_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_check_original_v39();
CREATE FUNCTION clean.phase5_fids_original_immutable_v39()
RETURNS trigger LANGUAGE plpgsql AS $p5imm$
BEGIN
 RAISE EXCEPTION 'P5_ORIGINAL_BINDING_CANNOT_BE_REWRITTEN';
END $p5imm$;
CREATE TRIGGER phase5_fids_original_immutable_v39
 BEFORE UPDATE ON clean.phase5_fids_original_binding_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_original_immutable_v39();

-- Exact per-role GRANTS are NOT provided; require separate original
-- scientific database installer and independent rights/ACL verification.
REVOKE ALL ON clean.phase5_fids_cycle_budget_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_day_budget_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_utc_charge_budget_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_allowed_query_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_physical_attempt_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_original_binding_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_attempt_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.reserve_phase5_fids_physical_get_v39(
 text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_check_original_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_original_immutable_v39() FROM PUBLIC;
