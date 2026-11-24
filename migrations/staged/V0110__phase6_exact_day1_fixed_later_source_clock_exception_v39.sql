-- Staged incident-only V0079 guard replacement; not an installer, no GO.
-- No change to any normal day, T24, physical UTC charge, reservation,
-- prearm, cost, rights, source identity, retention or per-flight PRE check.
BEGIN;
DO $preflight$
BEGIN
 IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)'))
    IS DISTINCT FROM $original$
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
END $original$
 THEN RAISE EXCEPTION 'P6_DAY1_RESERVE_ORIGINAL_BODY_DRIFT'; END IF;
END $preflight$;
CREATE FUNCTION clean.p6_day1_later_source_exception_v39(
 q clean.phase5_fids_allowed_query_v39,selected_at timestamptz
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,clean AS $check$
DECLARE
 parts text[];
 start_at constant timestamptz:='2026-11-25T00:00:00Z';
 cutoff_at timestamptz;
 request_at timestamptz;
 expected_icao text;
BEGIN
 -- Explicit, reviewed exception is tied to one already-approved
 -- production manifest and original frozen paired Day1 schedule.
 IF q.manifest_sha256 IS DISTINCT FROM 'a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e'
    OR q.run_day_index IS DISTINCT FROM 1
    OR selected_at IS NULL OR selected_at<'2026-11-24T00:00:00Z'::timestamptz
    OR selected_at>=start_at
    OR q.service_window_start_utc IS DISTINCT FROM start_at
    OR q.service_window_end_utc IS DISTINCT FROM start_at+interval '4 hours'
    OR q.api_units_per_attempt IS DISTINCT FROM 2 OR q.max_physical_attempts IS DISTINCT FROM 1
 THEN RETURN false; END IF;
 parts=regexp_match(q.query_key,'^p6\.d1\.(HUB|MID_A|MID_B|REGIONAL)\.(T-6h|T-90m)\.s1\.p1\.r([1-9]|1[0-6])$');
 IF parts IS NULL OR q.slot_id IS DISTINCT FROM parts[1] OR q.horizon IS DISTINCT FROM parts[2]
 THEN RETURN false; END IF;
 expected_icao=CASE parts[1] WHEN 'HUB' THEN 'OMAA' WHEN 'MID_A' THEN 'OMSJ' WHEN 'MID_B' THEN 'SPJC' ELSE 'KDEC' END;
 cutoff_at=start_at-CASE parts[2] WHEN 'T-6h' THEN interval '6 hours' ELSE interval '90 minutes' END
  + make_interval(mins=>15*(parts[3]::integer-1));
 request_at=cutoff_at-interval '15 minutes';
 RETURN q.airport_icao IS NOT DISTINCT FROM expected_icao
    AND q.planned_dispatch_utc IS NOT DISTINCT FROM request_at
    AND q.prediction_cutoff_utc IS NOT DISTINCT FROM cutoff_at
    AND q.hard_latest_dispatch_utc IS NOT DISTINCT FROM request_at+interval '1 minute'
    AND q.planned_charge_utc_date IS NOT DISTINCT FROM (request_at AT TIME ZONE 'UTC')::date
    AND selected_at<request_at-interval '20 minutes';
END $check$;
REVOKE ALL ON FUNCTION clean.p6_day1_later_source_exception_v39(clean.phase5_fids_allowed_query_v39,timestamptz) FROM PUBLIC;
CREATE OR REPLACE FUNCTION clean.reserve_phase5_fids_physical_get_v39(
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
    (v_selected>=(SELECT c.scheduled_start_utc - INTERVAL '24 hours 30 minutes'
      FROM clean.adb_phase6_calendar_day c
      WHERE c.run_day_index=v_query.run_day_index)
     AND NOT clean.p6_day1_later_source_exception_v39(v_query,v_selected)) OR
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
COMMIT;
