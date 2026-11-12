-- V0093 STAGED, NOT INSTALLED: do not replay V0079–V0092.
-- One STOP-default, additive, budget-only PRE-GO compatibility migration.
-- It preserves V0082 EXACT_SOURCE_GRID mode and exact provider range/slot/
-- early-draw/rights/one irreversible 2-unit reservation checks.
--
-- This SQL is an inert candidate. It must not run against live Neon until
-- independently reviewed, SHA-pinned, role-restricted owner authorization
-- and atomic real production preflight. PG16 CI is disposable and nonpaid.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='25000ms';
SET LOCAL lock_timeout='3000ms';

DO $p5_preflight$
BEGIN
 IF current_database()<>'neondb' AND current_database()<>'v39_ci' THEN
   RAISE EXCEPTION 'P5_V0093_WRONG_DATABASE'; END IF;
 IF current_setting('server_version_num')::int<160000 OR
    current_setting('transaction_read_only')<>'off' OR
    pg_is_in_recovery() THEN
   RAISE EXCEPTION 'P5_V0093_NOT_WRITABLE_POSTGRES16_PRIMARY'; END IF;
 IF to_regclass('clean.phase5_fids_seven_rest_release_v39') IS NULL OR
    to_regclass('clean.phase5_fids_utc_rest_category_budget_v39') IS NULL OR
    to_regclass('clean.phase5_fids_physical_attempt_v39') IS NULL OR
    to_regprocedure('clean.phase5_fids_v0082_enforce_category_get_v39()') IS NULL
 THEN RAISE EXCEPTION 'P5_V0093_MISSING_INSTALLED_V0082_SCHEMA'; END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_fids_seven_rest_release_v39) OR
    EXISTS(SELECT 1 FROM clean.phase5_fids_allowed_query_v39) OR
    EXISTS(SELECT 1 FROM clean.phase5_fids_physical_attempt_v39) OR
    EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
 THEN RAISE EXCEPTION 'P5_V0093_REFUSE_LIVE_OR_PREPARED_SOURCE_MIGRATION'; END IF;
END $p5_preflight$;

-- The old exact source grid remains the DEFAULT, no silent reinterpretation.
-- A cost-only row is typed and has NO fraudulent full-future request-grid SHA.
ALTER TABLE clean.phase5_fids_seven_rest_release_v39
 ADD COLUMN budget_release_mode text NOT NULL DEFAULT 'EXACT_SOURCE_GRID'
 CHECK (budget_release_mode IN ('EXACT_SOURCE_GRID','COST_UPPER_BOUND'));
ALTER TABLE clean.phase5_fids_seven_rest_release_v39
 ADD COLUMN reviewed_cost_envelope_sha256 text
 CHECK (reviewed_cost_envelope_sha256 IS NULL OR
    reviewed_cost_envelope_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE clean.phase5_fids_seven_rest_release_v39
 ALTER COLUMN reviewed_source_request_grid_sha256 DROP NOT NULL;
ALTER TABLE clean.phase5_fids_seven_rest_release_v39
 ADD CONSTRAINT p5_v0093_release_provenance_disjoint CHECK (
   (budget_release_mode='EXACT_SOURCE_GRID'
    AND reviewed_source_request_grid_sha256 IS NOT NULL
    AND reviewed_cost_envelope_sha256 IS NULL)
   OR
   (budget_release_mode='COST_UPPER_BOUND'
    AND reviewed_source_request_grid_sha256 IS NULL
    AND reviewed_cost_envelope_sha256 IS NOT NULL)
 );

-- Preserve the exact original V0082 function path for EXACT_SOURCE_GRID.
-- Only for a TYPED COST_UPPER_BOUND release permit legitimate unspent
-- preplanned FIDS BASE/SPLIT REST units. All *existing actual* prepared
-- queries on a UTC charge date must have a matching manifest + reviewed
-- provider-range exact partition; the currently attempted query remains
-- checked against its actual 4h/2x2h/6h segment and V0079 draw rights.
CREATE OR REPLACE FUNCTION clean.phase5_fids_v0082_enforce_category_get_v39()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,clean
AS $charge$
DECLARE
 q clean.phase5_fids_allowed_query_v39%ROWTYPE;
 part clean.phase5_fids_exact_query_partition_v39%ROWTYPE;
 rel clean.phase5_fids_seven_rest_release_v39%ROWTYPE;
 cal record;
 daybudget clean.phase5_fids_utc_charge_budget_v39%ROWTYPE;
 cycle clean.phase5_fids_cycle_budget_v39%ROWTYPE;
 expected_shape_minutes integer;
 segment_start timestamptz;
 segment_end timestamptz;
 expected_start timestamptz;
 expected_end timestamptz;
 child_minutes integer;
 child_offset_minutes integer;
 range_minutes integer;
 total_day_rows integer;
 day_other_units bigint;
 base_planned bigint;
 split_planned bigint;
 summed_cycle_other bigint;
 summed_cycle_source bigint;
 query_total bigint;
 query_mapped bigint;
 query_base_units bigint;
 query_split_units bigint;
 query_invalid bigint;
 changed integer;
BEGIN
 SELECT * INTO q FROM clean.phase5_fids_allowed_query_v39
 WHERE query_digest=NEW.query_digest;
 SELECT * INTO part FROM clean.phase5_fids_exact_query_partition_v39
 WHERE query_digest=NEW.query_digest;
 SELECT * INTO rel FROM clean.phase5_fids_seven_rest_release_v39
 WHERE manifest_sha256=NEW.manifest_sha256;
 IF q.query_digest IS NULL OR part.query_digest IS NULL OR
    rel.manifest_sha256 IS NULL OR
    q.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256 OR
    part.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256 OR
    q.github_run_id IS DISTINCT FROM NEW.github_run_id OR
    q.planned_charge_utc_date IS DISTINCT FROM NEW.charged_utc_date OR
    part.reviewed_provider_range_sha256 IS DISTINCT FROM rel.reviewed_provider_range_sha256 OR
    (rel.budget_release_mode='COST_UPPER_BOUND' AND
      (rel.reviewed_source_request_grid_sha256 IS NOT NULL OR
       rel.reviewed_cost_envelope_sha256 IS NULL)) OR
    (rel.budget_release_mode='EXACT_SOURCE_GRID' AND
      (rel.reviewed_source_request_grid_sha256 IS NULL OR
       rel.reviewed_cost_envelope_sha256 IS NOT NULL))
 THEN RAISE EXCEPTION 'P5_V0082_EXACT_SOURCE_PARTITION_NOT_SIGNED'; END IF;

 SELECT c.window_shape,c.active_duration_minutes,c.scheduled_start_utc
 INTO cal FROM clean.adb_phase6_calendar_day c
 JOIN clean.phase5_fids_day_budget_v39 d
 ON d.run_day_index=c.run_day_index
 AND d.calendar_hash=c.calendar_hash AND d.config_hash=c.config_hash
 AND d.frame_hash=c.frame_hash
 WHERE d.manifest_sha256=NEW.manifest_sha256
 AND d.run_day_index=q.run_day_index;

 IF NOT FOUND OR cal.scheduled_start_utc IS NULL OR
    cal.window_shape IS DISTINCT FROM part.window_shape
 THEN RAISE EXCEPTION 'P5_V0082_PARENT_CALENDAR_UNVERIFIED'; END IF;
 expected_shape_minutes=CASE WHEN part.window_shape='up-to-6h'
  THEN 360 ELSE 240 END;
 IF cal.active_duration_minutes IS DISTINCT FROM expected_shape_minutes
 THEN RAISE EXCEPTION 'P5_V0082_PARENT_EXPOSURE_DURATION_MISMATCH'; END IF;
 range_minutes=rel.verified_provider_max_range_minutes;
 IF part.window_shape='2x2h' THEN
   child_minutes=120;
   child_offset_minutes=CASE part.segment_index WHEN 1 THEN 0
     WHEN 2 THEN 180 ELSE -1 END;
 ELSE
   child_minutes=expected_shape_minutes;
   child_offset_minutes=CASE part.segment_index WHEN 1 THEN 0
     ELSE -1 END;
 END IF;
 IF child_offset_minutes<0 OR
    (part.partition_index-1)*range_minutes>=child_minutes
 THEN RAISE EXCEPTION 'P5_V0082_PARTITION_OUTSIDE_EXPOSURE'; END IF;
 segment_start=cal.scheduled_start_utc+
   make_interval(mins=>child_offset_minutes);
 segment_end=segment_start+make_interval(mins=>child_minutes);
 expected_start=segment_start+
   make_interval(mins=>(part.partition_index-1)*range_minutes);
 expected_end=LEAST(segment_end,expected_start+
   make_interval(mins=>range_minutes));
 IF q.service_window_start_utc IS DISTINCT FROM expected_start OR
    q.service_window_end_utc IS DISTINCT FROM expected_end OR
    (part.partition_index=1 AND part.rest_category<>'FIDS_BASE_UNITS') OR
    (part.partition_index>1 AND part.rest_category<>'FIDS_SPLIT_UNITS')
 THEN RAISE EXCEPTION 'P5_V0082_EXACT_EXPOSED_SOURCE_RANGE_OR_CATEGORY_MISMATCH'; END IF;

 SELECT * INTO daybudget FROM clean.phase5_fids_utc_charge_budget_v39
 WHERE manifest_sha256=NEW.manifest_sha256
 AND charge_day_utc=NEW.charged_utc_date;
 SELECT * INTO cycle FROM clean.phase5_fids_cycle_budget_v39
 WHERE manifest_sha256=NEW.manifest_sha256;
 IF daybudget.manifest_sha256 IS NULL OR cycle.manifest_sha256 IS NULL
 THEN RAISE EXCEPTION 'P5_V0082_MISSING_PHYSICAL_UTC_BUDGET'; END IF;
 SELECT COUNT(*),
   COALESCE(SUM(planned_units) FILTER(WHERE category NOT IN
    ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),0),
   COALESCE(SUM(planned_units) FILTER(WHERE category='FIDS_BASE_UNITS'),0),
   COALESCE(SUM(planned_units) FILTER(WHERE category='FIDS_SPLIT_UNITS'),0)
 INTO total_day_rows,day_other_units,base_planned,split_planned
 FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=NEW.manifest_sha256
 AND charge_day_utc=NEW.charged_utc_date;
 IF total_day_rows<>7 OR
    day_other_units<>daybudget.daily_other_reserved_units OR
    day_other_units+base_planned+split_planned>daybudget.daily_api_ceiling
 THEN RAISE EXCEPTION 'P5_V0082_INCOMPLETE_SEVEN_CATEGORY_UTC_BUDGET'; END IF;

 -- Every planned same-charge-date source query must already have one
 -- reviewed partition row. No arbitrary extra BASE/SPLIT allowance:
 -- planned physical units == exactly 2 * distinct signed source queries.
 SELECT COUNT(*),COUNT(pmap.query_digest),
   2*COUNT(*) FILTER(WHERE pmap.rest_category='FIDS_BASE_UNITS'),
   2*COUNT(*) FILTER(WHERE pmap.rest_category='FIDS_SPLIT_UNITS'),
   COUNT(*) FILTER(WHERE pmap.query_digest IS NOT NULL AND
      (pmap.manifest_sha256 IS DISTINCT FROM allowed.manifest_sha256 OR
       pmap.reviewed_provider_range_sha256 IS DISTINCT FROM
        rel.reviewed_provider_range_sha256))
 INTO query_total,query_mapped,query_base_units,query_split_units,
      query_invalid
 FROM clean.phase5_fids_allowed_query_v39 allowed
 LEFT JOIN clean.phase5_fids_exact_query_partition_v39 pmap
 ON pmap.query_digest=allowed.query_digest
 WHERE allowed.manifest_sha256=NEW.manifest_sha256
 AND allowed.planned_charge_utc_date=NEW.charged_utc_date;
 IF query_total<>query_mapped OR query_invalid<>0 OR
    (rel.budget_release_mode='EXACT_SOURCE_GRID' AND
      (query_base_units IS DISTINCT FROM base_planned OR
       query_split_units IS DISTINCT FROM split_planned)) OR
    (rel.budget_release_mode='COST_UPPER_BOUND' AND
      (query_base_units>base_planned OR
       query_split_units>split_planned))
 THEN RAISE EXCEPTION 'P5_V0093_SIGNED_SOURCE_QUERY_MISSING_PARTITION_OR_OVER_COST_CAP'; END IF;

 -- The seven cycle categories must each exist, even when zero. Their
 -- reserved day totals cannot exceed independent per-category cycle caps.
 IF (SELECT COUNT(*) FROM clean.phase5_fids_cycle_rest_category_cap_v39
     WHERE manifest_sha256=NEW.manifest_sha256)<>7 OR
    EXISTS(
     SELECT 1 FROM clean.phase5_fids_cycle_rest_category_cap_v39 cap
     LEFT JOIN clean.phase5_fids_utc_rest_category_budget_v39 budget
       ON budget.manifest_sha256=cap.manifest_sha256
       AND budget.category=cap.category
     WHERE cap.manifest_sha256=NEW.manifest_sha256
     GROUP BY cap.category,cap.ceiling_units
     HAVING COALESCE(SUM(budget.planned_units),0)>cap.ceiling_units)
 THEN RAISE EXCEPTION 'P5_V0082_SEVEN_CATEGORY_CYCLE_CAP_HOLD'; END IF;
 SELECT
 COALESCE(SUM(planned_units) FILTER(WHERE category NOT IN
   ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),0),
 COALESCE(SUM(planned_units) FILTER(WHERE category IN
   ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),0)
 INTO summed_cycle_other,summed_cycle_source
 FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=NEW.manifest_sha256;
 IF summed_cycle_other>cycle.other_category_reserved_units OR
    summed_cycle_source+cycle.other_category_reserved_units+
      cycle.protected_api_floor_units>cycle.cycle_api_ceiling
 THEN RAISE EXCEPTION 'P5_V0082_PROJECT_CYCLE_REST_CAP_HOLD'; END IF;

 UPDATE clean.phase5_fids_utc_rest_category_budget_v39 budget
 SET physically_reserved_units=physically_reserved_units+2
 WHERE budget.manifest_sha256=NEW.manifest_sha256
 AND budget.charge_day_utc=NEW.charged_utc_date
 AND budget.category=part.rest_category
 AND budget.physically_reserved_units+2<=budget.planned_units;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'P5_V0082_CATEGORY_ALREADY_EXHAUSTED'; END IF;
 RETURN NEW;
END $charge$;



-- Existing BEFORE INSERT trigger remains bound to this exact function OID.
-- NO V0082 trigger deletion/reinstallation, no SOURCE activation, no provider.
COMMIT;
