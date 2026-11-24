-- Staged only. No deployment, grants, provider, migration replay or paid GO.
-- B0062/V0093 intentionally leave parent draw-dependent rows empty.
-- Existing PREPARE performs independent verified draw and signed proposal
-- checks; this narrow function enables the missing parent-row INSERT in
-- the SAME SERIALIZABLE transaction. All UTC/cycle/category checks remain.
BEGIN;
CREATE FUNCTION clean.bind_phase5_prospective_parent_source_budget_v39(
 p_manifest text,p_day integer,p_draw text,p_units integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,clean AS $body$
DECLARE
 a clean.adb_phase6_authorization%ROWTYPE;
 c clean.adb_phase6_calendar_day%ROWTYPE;
 rel clean.phase5_fids_seven_rest_release_v39%ROWTYPE;
 cyc clean.phase5_fids_cycle_budget_v39%ROWTYPE;
 n integer;
 distinct_slots integer;
 distinct_sites integer;
 selected_min timestamptz;
 selected_max timestamptz;
 now_at timestamptz;
 exact_incident boolean;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
    OR p_draw IS NULL OR p_draw !~ '^[0-9a-f]{64}$'
    OR p_day IS NULL OR p_day NOT BETWEEN 1 AND 31
    OR p_units IS NULL OR p_units NOT BETWEEN 24 AND 768
    OR p_units%2<>0
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_BAD_INPUT'; END IF;
 IF current_setting('transaction_isolation')<>'serializable'
    OR current_setting('transaction_read_only')<>'off'
    OR pg_is_in_recovery()
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_WRONG_TRANSACTION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('v39-phase5-prepare-day'),p_day);
 SELECT * INTO a FROM clean.adb_phase6_authorization WHERE singleton_key=true;
 IF NOT FOUND OR a.enabled IS DISTINCT FROM true OR a.revoked_at_utc IS NOT NULL
    OR a.manifest_sha256 IS DISTINCT FROM p_manifest
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_AUTH'; END IF;
 SELECT * INTO c FROM clean.adb_phase6_calendar_day WHERE run_day_index=p_day;
 IF NOT FOUND OR c.calendar_hash IS DISTINCT FROM a.calendar_hash
    OR c.config_hash IS DISTINCT FROM a.config_hash
    OR c.scheduled_start_utc IS NULL
    OR c.active_duration_minutes NOT IN (240,360)
    OR (c.scheduled_start_utc AT TIME ZONE 'UTC')::date IS DISTINCT FROM c.date_utc
    OR p_units>c.active_duration_minutes/15*24
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_CALENDAR_OR_MAX_UNITS'; END IF;
 SELECT * INTO rel FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=p_manifest;
 IF NOT FOUND OR rel.budget_release_mode IS DISTINCT FROM 'COST_UPPER_BOUND'
    OR rel.reviewed_source_request_grid_sha256 IS NOT NULL
    OR rel.reviewed_cost_envelope_sha256 IS NULL
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_COST_MODE'; END IF;
 SELECT * INTO cyc FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=p_manifest;
 IF NOT FOUND OR cyc.physically_reserved_units+cyc.other_category_reserved_units+cyc.protected_api_floor_units+p_units>cyc.cycle_api_ceiling
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_CYCLE_CAP'; END IF;
 SELECT count(*)::int,count(DISTINCT slot_id)::int,count(DISTINCT selected_icao)::int,
   min(selected_at_utc),max(selected_at_utc)
 INTO n,distinct_slots,distinct_sites,selected_min,selected_max
 FROM clean.adb_sampling_draw WHERE run_day_index=p_day;
 now_at=clock_timestamp();
 exact_incident=p_manifest='a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e'
  AND p_day=1 AND p_units=256 AND c.draw_type='NEW_TEMPLATE' AND c.window_shape='4h'
  AND c.scheduled_start_utc='2026-11-25T00:00:00Z'::timestamptz
  AND selected_min>='2026-11-24T00:00:00Z'::timestamptz
  AND now_at<'2026-11-24T17:25:00Z'::timestamptz
  AND NOT EXISTS(SELECT 1 FROM clean.adb_sampling_draw s WHERE s.run_day_index=1 AND
    s.selected_icao IS DISTINCT FROM CASE s.slot_id WHEN 'HUB' THEN 'OMAA' WHEN 'MID_A' THEN 'OMSJ' WHEN 'MID_B' THEN 'SPJC' WHEN 'REGIONAL' THEN 'KDEC' ELSE NULL END);
 IF n<>4 OR distinct_slots<>4 OR distinct_sites<>4 OR selected_min IS NULL
    OR selected_min IS DISTINCT FROM selected_max OR selected_min>=now_at
    OR (NOT COALESCE(exact_incident,false) AND (selected_min>=c.scheduled_start_utc-interval '24 hours 45 minutes'
    OR selected_min<c.scheduled_start_utc-interval '72 hours'
    OR now_at>=c.scheduled_start_utc-interval '24 hours 17 minutes'))
    OR EXISTS(SELECT 1 FROM clean.adb_sampling_draw s WHERE s.run_day_index=p_day
      AND (s.frozen_draw_seed IS DISTINCT FROM c.frozen_draw_seed OR s.draw_type IS DISTINCT FROM c.draw_type
       OR s.slot_id NOT IN ('HUB','MID_A','MID_B','REGIONAL')
       OR s.target_region IS DISTINCT FROM c.slot_regions->>s.slot_id
       OR (c.pair_airport_set IS NOT NULL AND s.selected_icao IS DISTINCT FROM c.pair_airport_set->s.slot_id->>'icao')
       OR (s.slot_id='HUB' AND s.selected_icao IS DISTINCT FROM c.anchor_icao)))
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_NOT_ON_TIME_REAL_DRAW'; END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=p_manifest AND run_day_index=p_day)
    OR EXISTS(SELECT 1 FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=p_manifest AND run_day_index=p_day)
 THEN RAISE EXCEPTION 'P6_PARENT_BUDGET_NO_REPLAY'; END IF;
 -- Parent ledger only bounds SOURCE, non-FIDS REST is separately enforced
 -- on its physical UTC dates and in the cycle. No budget category is changed.
 INSERT INTO clean.phase5_fids_day_budget_v39
 (manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,frame_hash,
  early_draw_sha256,daily_api_ceiling,daily_other_reserved_units,daily_source_reserved_units)
 VALUES(p_manifest,p_day,c.date_utc,c.calendar_hash,c.config_hash,c.frame_hash,p_draw,p_units,0,0);
 RETURN true;
END $body$;
REVOKE ALL ON FUNCTION clean.bind_phase5_prospective_parent_source_budget_v39(text,integer,text,integer) FROM PUBLIC;
COMMIT;
