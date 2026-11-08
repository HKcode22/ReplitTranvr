-- V0082: STAGED ADDITIVE only; never overwrite or replay the installed V0079.
-- Requires authentic B0062+V0079, with V0080 real-GitHub prearm independently
-- installed for production SOURCE. Binds physical source GETs to seven
-- explicit REST category charge-day rows and exact Amendment C partitions.
-- No paid GET, production deployment/grant, source-use/retention rights,
-- sampled source records, or Phase6 GO is authorized by this migration.
-- Future non-FIDS REST writers MUST separately consume their own categories;
-- this guard only spends FIDS_BASE and FIDS_SPLIT physical GET reservations.

CREATE TABLE clean.phase5_fids_seven_rest_release_v39 (
 manifest_sha256 text PRIMARY KEY
  REFERENCES clean.phase5_fids_cycle_budget_v39(manifest_sha256),
 reviewed_source_request_grid_sha256 text NOT NULL
  CHECK(reviewed_source_request_grid_sha256 ~ '^[0-9a-f]{64}$'),
 reviewed_provider_range_sha256 text NOT NULL
  CHECK(reviewed_provider_range_sha256 ~ '^[0-9a-f]{64}$'),
 verified_provider_max_range_minutes integer NOT NULL
  CHECK(verified_provider_max_range_minutes BETWEEN 1 AND 360),
 reviewed_category_budget_sha256 text NOT NULL
  CHECK(reviewed_category_budget_sha256 ~ '^[0-9a-f]{64}$'),
 frozen_at_utc timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE clean.phase5_fids_cycle_rest_category_cap_v39 (
 manifest_sha256 text NOT NULL
  REFERENCES clean.phase5_fids_seven_rest_release_v39(manifest_sha256),
 category text NOT NULL CHECK (category IN (
 'FIDS_BASE_UNITS','FIDS_SPLIT_UNITS','FIDS_RETRY_UNIT_BUDGET',
 'VALIDATION_UNIT_BUDGET','OUTCOME_REST_UNIT_BUDGET',
 'HISTORY_BOOTSTRAP_UNIT_BUDGET','DIAGNOSTIC_UNIT_BUDGET')),
 ceiling_units integer NOT NULL CHECK(ceiling_units BETWEEN 0 AND 50000),
 PRIMARY KEY(manifest_sha256,category)
);

CREATE TABLE clean.phase5_fids_utc_rest_category_budget_v39 (
 manifest_sha256 text NOT NULL,
 charge_day_utc date NOT NULL,
 category text NOT NULL CHECK (category IN (
 'FIDS_BASE_UNITS','FIDS_SPLIT_UNITS','FIDS_RETRY_UNIT_BUDGET',
 'VALIDATION_UNIT_BUDGET','OUTCOME_REST_UNIT_BUDGET',
 'HISTORY_BOOTSTRAP_UNIT_BUDGET','DIAGNOSTIC_UNIT_BUDGET')),
 planned_units integer NOT NULL CHECK(planned_units BETWEEN 0 AND 50000),
 physically_reserved_units integer NOT NULL DEFAULT 0
  CHECK(physically_reserved_units>=0 AND physically_reserved_units<=planned_units),
 PRIMARY KEY(manifest_sha256,charge_day_utc,category),
 FOREIGN KEY(manifest_sha256,charge_day_utc)
  REFERENCES clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc)
);

-- One row per reviewed exact provider query; immutable source segmentation.
-- Query metadata is verified at actual physical reservation in this trigger.
CREATE TABLE clean.phase5_fids_exact_query_partition_v39 (
 query_digest text PRIMARY KEY
  REFERENCES clean.phase5_fids_allowed_query_v39(query_digest),
 manifest_sha256 text NOT NULL
  REFERENCES clean.phase5_fids_seven_rest_release_v39(manifest_sha256),
 segment_index integer NOT NULL CHECK(segment_index BETWEEN 1 AND 2),
 partition_index integer NOT NULL CHECK(partition_index BETWEEN 1 AND 360),
 window_shape text NOT NULL CHECK(window_shape IN ('4h','2x2h','up-to-6h')),
 rest_category text NOT NULL CHECK(rest_category IN
  ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),
 reviewed_provider_range_sha256 text NOT NULL
  CHECK(reviewed_provider_range_sha256 ~ '^[0-9a-f]{64}$')
);

-- Planned input rows are immutable. Revisions require an entirely new signed
-- manifest and a fresh future experiment, not edits to an already used table.
CREATE FUNCTION clean.phase5_fids_v0082_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $immutable$
BEGIN
 RAISE EXCEPTION 'P5_V0082_FROZEN_SEVEN_REST_MANIFEST_IMMUTABLE';
END $immutable$;

CREATE TRIGGER p5_v0082_release_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_fids_seven_rest_release_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_v0082_immutable_v39();
CREATE TRIGGER p5_v0082_caps_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_fids_cycle_rest_category_cap_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_v0082_immutable_v39();
CREATE TRIGGER p5_v0082_part_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_fids_exact_query_partition_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_v0082_immutable_v39();

-- Day budgets allow only the irreversible +2 physical unit increment on an
-- already frozen FIDS BASE/SPLIT category. No DELETE or retune at runtime.
CREATE FUNCTION clean.phase5_fids_v0082_category_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $immutable$
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'P5_V0082_SEVEN_REST_BUDGET_CANNOT_DELETE';
 END IF;
 IF NEW.manifest_sha256 IS DISTINCT FROM OLD.manifest_sha256
 OR NEW.charge_day_utc IS DISTINCT FROM OLD.charge_day_utc
 OR NEW.category IS DISTINCT FROM OLD.category
 OR NEW.planned_units IS DISTINCT FROM OLD.planned_units
 OR OLD.category NOT IN ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')
 OR NEW.physically_reserved_units<>OLD.physically_reserved_units+2
 THEN RAISE EXCEPTION 'P5_V0082_SEVEN_REST_CATEGORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $immutable$;
CREATE TRIGGER p5_v0082_day_category_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_fids_utc_rest_category_budget_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_v0082_category_immutable_v39();

-- Every successful V0079 irreversible reservation INSERT runs this guard
-- INSIDE THE SAME TRANSACTION. On failure, the V0079 cycle/day/UTC counters,
-- its attempted GET row and the category charge all roll back together.
-- No application-side post-hoc categorization is trusted.
CREATE FUNCTION clean.phase5_fids_v0082_enforce_category_get_v39()
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
    part.reviewed_provider_range_sha256 IS DISTINCT FROM rel.reviewed_provider_range_sha256
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
   2*COUNT(*) FILTER(WHERE pmap.rest_category='FIDS_SPLIT_UNITS')
 INTO query_total,query_mapped,query_base_units,query_split_units
 FROM clean.phase5_fids_allowed_query_v39 allowed
 LEFT JOIN clean.phase5_fids_exact_query_partition_v39 pmap
 ON pmap.query_digest=allowed.query_digest
 WHERE allowed.manifest_sha256=NEW.manifest_sha256
 AND allowed.planned_charge_utc_date=NEW.charged_utc_date;
 IF query_total<>query_mapped OR
    query_base_units IS DISTINCT FROM base_planned OR
    query_split_units IS DISTINCT FROM split_planned
 THEN RAISE EXCEPTION 'P5_V0082_UTC_SOURCE_QUERY_GRID_UNDERFUNDED_OR_UNREVIEWED'; END IF;

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

CREATE TRIGGER phase5_fids_v0082_seven_rest_before_physical
 BEFORE INSERT ON clean.phase5_fids_physical_attempt_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_fids_v0082_enforce_category_get_v39();

REVOKE ALL ON clean.phase5_fids_seven_rest_release_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_cycle_rest_category_cap_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_utc_rest_category_budget_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_fids_exact_query_partition_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_v0082_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_v0082_category_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_v0082_enforce_category_get_v39() FROM PUBLIC;

-- NOTE: A new separate security-reviewed owner/role-grant installer,
-- category-plan freeze writer and per-category non-source REST reservers
-- are REQUIRED before production deployment. This file installs NOTHING.
