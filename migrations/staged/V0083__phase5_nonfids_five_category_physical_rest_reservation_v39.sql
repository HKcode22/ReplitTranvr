-- V0083 ADDITIVE STAGED ONLY. NOT A LIVE PROVIDER OR PRODUCTION INSTALLER.
-- Existing V0079 SOURCE physical attempts and V0082 BASE/SPLIT +2 semantics
-- remain intact. This adds one-shot prospective OTHER-category REST
-- reservations and extends the frozen V0082 category counter with an exact
-- same-transaction approval/reservation witness for five non-FIDS categories.
-- Never grant public/runtime EXECUTE, call from Replit runtime, or infer
-- research Contents-use rights. A successful reservation is NOT an HTTP GET.

CREATE TABLE clean.phase5_other_rest_reviewed_call_v39 (
 request_sha256 text PRIMARY KEY CHECK(request_sha256~'^[0-9a-f]{64}$'),
 manifest_sha256 text NOT NULL REFERENCES
  clean.phase5_fids_seven_rest_release_v39(manifest_sha256),
 rest_category text NOT NULL CHECK(rest_category IN (
  'FIDS_RETRY_UNIT_BUDGET','VALIDATION_UNIT_BUDGET',
  'OUTCOME_REST_UNIT_BUDGET','HISTORY_BOOTSTRAP_UNIT_BUDGET',
  'DIAGNOSTIC_UNIT_BUDGET')),
 planned_charge_day_utc date NOT NULL,
 earliest_dispatch_utc timestamptz NOT NULL,
 hard_latest_dispatch_utc timestamptz NOT NULL,
 github_run_id text NOT NULL CHECK(github_run_id~'^[0-9]{5,25}$'),
 rights_review_sha256 text NOT NULL CHECK(rights_review_sha256~'^[0-9a-f]{64}$'),
 provider_price_sha256 text NOT NULL CHECK(provider_price_sha256~'^[0-9a-f]{64}$'),
 reviewed_request_context_sha256 text NOT NULL
  CHECK(reviewed_request_context_sha256~'^[0-9a-f]{64}$'),
 reviewed_category_budget_sha256 text NOT NULL
  CHECK(reviewed_category_budget_sha256~'^[0-9a-f]{64}$'),
 api_units_per_get integer NOT NULL CHECK(api_units_per_get BETWEEN 1 AND 100),
 created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT p5_other_reviewed_future_window_v39 CHECK (
  earliest_dispatch_utc<=hard_latest_dispatch_utc
  AND (earliest_dispatch_utc AT TIME ZONE 'UTC')::date=planned_charge_day_utc
  AND (hard_latest_dispatch_utc AT TIME ZONE 'UTC')::date=planned_charge_day_utc
 )
);
CREATE INDEX p5_other_rest_reviewed_day_v39
 ON clean.phase5_other_rest_reviewed_call_v39
 (manifest_sha256,planned_charge_day_utc,rest_category);

CREATE TABLE clean.phase5_other_rest_physical_reservation_v39 (
 reservation_sha256 text PRIMARY KEY
  CHECK(reservation_sha256~'^[0-9a-f]{64}$'),
 request_sha256 text NOT NULL UNIQUE REFERENCES
  clean.phase5_other_rest_reviewed_call_v39(request_sha256),
 manifest_sha256 text NOT NULL
  REFERENCES clean.phase5_fids_seven_rest_release_v39(manifest_sha256),
 rest_category text NOT NULL CHECK(rest_category IN (
  'FIDS_RETRY_UNIT_BUDGET','VALIDATION_UNIT_BUDGET',
  'OUTCOME_REST_UNIT_BUDGET','HISTORY_BOOTSTRAP_UNIT_BUDGET',
  'DIAGNOSTIC_UNIT_BUDGET')),
 charged_utc_date date NOT NULL,
 approved_api_units integer NOT NULL CHECK(approved_api_units BETWEEN 1 AND 100),
 previous_reserved_units integer NOT NULL CHECK(previous_reserved_units>=0),
 github_run_id text NOT NULL CHECK(github_run_id~'^[0-9]{5,25}$'),
 rights_review_sha256 text NOT NULL CHECK(rights_review_sha256~'^[0-9a-f]{64}$'),
 provider_price_sha256 text NOT NULL CHECK(provider_price_sha256~'^[0-9a-f]{64}$'),
 reserved_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 reserved_txid bigint NOT NULL DEFAULT txid_current(),
 UNIQUE(reserved_txid)
);
-- At most one one-shot physical reservation per transaction. Never refund.
CREATE FUNCTION clean.phase5_other_rest_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $immutable$
BEGIN
 RAISE EXCEPTION 'P5_OTHER_REST_IMMUTABLE_NO_UPDATE_OR_REFUND';
END $immutable$;
CREATE TRIGGER p5_other_reviewed_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_other_rest_reviewed_call_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_other_rest_immutable_v39();
CREATE TRIGGER p5_other_reservation_immutable
 BEFORE UPDATE OR DELETE ON clean.phase5_other_rest_physical_reservation_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_other_rest_immutable_v39();

-- V0082 FIDS source +2 must remain byte-for-byte equivalent to its old
-- branch. The five OTHER categories can increment only when an IMMUTABLE,
-- exact category/date/amount/previous-unit physical reservation was inserted
-- in this SAME PG transaction (txid_current). A second increment cannot
-- reuse the same attempt because previous_reserved_units would not match.
CREATE OR REPLACE FUNCTION clean.phase5_fids_v0082_category_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,clean
AS $immutable$
DECLARE approved integer; was integer;
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'P5_V0082_SEVEN_REST_BUDGET_CANNOT_DELETE';
 END IF;
 IF NEW.manifest_sha256 IS DISTINCT FROM OLD.manifest_sha256
 OR NEW.charge_day_utc IS DISTINCT FROM OLD.charge_day_utc
 OR NEW.category IS DISTINCT FROM OLD.category
 OR NEW.planned_units IS DISTINCT FROM OLD.planned_units
 THEN RAISE EXCEPTION 'P5_V0082_SEVEN_REST_CATEGORY_IMMUTABLE'; END IF;
 IF OLD.category IN ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS') THEN
  IF NEW.physically_reserved_units<>OLD.physically_reserved_units+2
  THEN RAISE EXCEPTION 'P5_V0082_SOURCE_MUST_RESERVE_EXACT_TWO_UNITS'; END IF;
 ELSIF OLD.category IN (
  'FIDS_RETRY_UNIT_BUDGET','VALIDATION_UNIT_BUDGET',
  'OUTCOME_REST_UNIT_BUDGET','HISTORY_BOOTSTRAP_UNIT_BUDGET',
  'DIAGNOSTIC_UNIT_BUDGET') THEN
  SELECT r.approved_api_units,r.previous_reserved_units
  INTO approved,was
  FROM clean.phase5_other_rest_physical_reservation_v39 r
  WHERE r.reserved_txid=txid_current()
   AND r.manifest_sha256=OLD.manifest_sha256
   AND r.charged_utc_date=OLD.charge_day_utc
   AND r.rest_category=OLD.category;
  IF NOT FOUND OR was IS DISTINCT FROM OLD.physically_reserved_units
     OR approved IS NULL OR
     NEW.physically_reserved_units<>OLD.physically_reserved_units+approved
  THEN RAISE EXCEPTION 'P5_V0083_OTHER_CATEGORY_REQUIRES_SAME_TRANSACTION_ONE_SHOT_PROOF';
  END IF;
 ELSE RAISE EXCEPTION 'P5_V0083_UNKNOWN_REST_CATEGORY'; END IF;
 RETURN NEW;
END $immutable$;

-- Never give this SECURITY DEFINER function to PUBLIC, normal runtime or
-- existing SOURCE, PRE, PREPARE, WITNESS. A separately reviewed scoped
-- NOLOGIN REST worker may eventually receive EXECUTE. It validates a frozen
-- approved physical call and reserves once BEFORE external HTTP; failure,
-- timeout and uncertain dispatch never refund credit reservations.
CREATE FUNCTION clean.reserve_phase5_other_rest_once_v39(
 p_manifest text,p_request_sha256 text,p_github_run_id text,
 p_rights_sha256 text,p_price_sha256 text,
 p_expected_reservation_sha256 text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,clean
AS $reserve$
DECLARE
 v_cycle clean.phase5_fids_cycle_budget_v39%ROWTYPE;
 v_charge clean.phase5_fids_utc_charge_budget_v39%ROWTYPE;
 v_call clean.phase5_other_rest_reviewed_call_v39%ROWTYPE;
 v_cat clean.phase5_fids_utc_rest_category_budget_v39%ROWTYPE;
 v_release clean.phase5_fids_seven_rest_release_v39%ROWTYPE;
 v_auth clean.adb_phase6_authorization%ROWTYPE;
 v_now timestamptz;v_date date;
 n integer;other_day integer;other_cycle integer;
 cap integer;plan_cycle integer;modified integer;ref timestamptz;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
 OR p_request_sha256 IS NULL OR p_request_sha256 !~ '^[0-9a-f]{64}$'
 OR p_github_run_id IS NULL OR p_github_run_id !~ '^[0-9]{5,25}$'
 OR p_rights_sha256 IS NULL OR p_rights_sha256 !~ '^[0-9a-f]{64}$'
 OR p_price_sha256 IS NULL OR p_price_sha256 !~ '^[0-9a-f]{64}$'
 OR p_expected_reservation_sha256 IS NULL
 OR p_expected_reservation_sha256 !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'P5_V0083_INPUT_SHA_OR_GITHUB_RUN_HOLD'; END IF;
 SELECT * INTO v_cycle FROM clean.phase5_fids_cycle_budget_v39
 WHERE manifest_sha256=p_manifest FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_V0083_CYCLE_NOT_FROZEN'; END IF;
 SELECT * INTO v_call FROM clean.phase5_other_rest_reviewed_call_v39
 WHERE manifest_sha256=p_manifest AND request_sha256=p_request_sha256 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_V0083_REVIEWED_OTHER_REST_GET_MISSING'; END IF;
 SELECT * INTO v_release FROM clean.phase5_fids_seven_rest_release_v39
 WHERE manifest_sha256=p_manifest;
 IF NOT FOUND OR v_call.reviewed_category_budget_sha256
  IS DISTINCT FROM v_release.reviewed_category_budget_sha256
 THEN RAISE EXCEPTION 'P5_V0083_SEVEN_REST_RELEASE_HASH_NOT_FROZEN'; END IF;
 SELECT * INTO v_auth FROM clean.adb_phase6_authorization
 WHERE singleton_key=true;
 IF NOT FOUND OR v_auth.enabled IS DISTINCT FROM true OR
  v_auth.revoked_at_utc IS NOT NULL OR
  v_auth.manifest_sha256 IS DISTINCT FROM p_manifest
 THEN RAISE EXCEPTION 'P5_V0083_PHASE6_AUTH_NOT_RELEASED'; END IF;
 IF v_call.github_run_id IS DISTINCT FROM p_github_run_id OR
  v_call.rights_review_sha256 IS DISTINCT FROM p_rights_sha256 OR
  v_call.provider_price_sha256 IS DISTINCT FROM p_price_sha256
 THEN RAISE EXCEPTION 'P5_V0083_REVIEWED_GITHUB_RIGHTS_OR_PRICE_MISMATCH'; END IF;
 v_now=clock_timestamp();
 v_date=(v_now AT TIME ZONE 'UTC')::date;
 IF v_date IS DISTINCT FROM v_call.planned_charge_day_utc OR
  v_now<v_call.earliest_dispatch_utc OR
  v_now>v_call.hard_latest_dispatch_utc
 THEN RAISE EXCEPTION 'P5_V0083_REAL_PHYSICAL_UTC_REQUEST_WINDOW_HOLD'; END IF;
 IF EXTRACT(HOUR FROM (v_now AT TIME ZONE 'UTC'))=23 AND
    EXTRACT(MINUTE FROM (v_now AT TIME ZONE 'UTC'))>=50
 THEN RAISE EXCEPTION 'P5_V0083_NO_LATE_UTC_MIDNIGHT_BILLING'; END IF;
 IF EXISTS(SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39
   WHERE request_sha256=p_request_sha256)
 THEN RAISE EXCEPTION 'P5_V0083_DUPLICATE_PHYSICAL_GET_NEVER_RETRY'; END IF;
 IF p_expected_reservation_sha256 IS DISTINCT FROM encode(sha256(convert_to(
   p_manifest||'|'||p_request_sha256||'|'||p_github_run_id||'|'||
   v_call.api_units_per_get::text||'|'||p_rights_sha256||'|'||
   p_price_sha256,'UTF8')),'hex')
 THEN RAISE EXCEPTION 'P5_V0083_RESERVATION_DIGEST_NOT_REVIEWED'; END IF;

 SELECT * INTO v_charge FROM clean.phase5_fids_utc_charge_budget_v39
 WHERE manifest_sha256=p_manifest AND charge_day_utc=v_date FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P5_V0083_REAL_CHARGE_DAY_NOT_FUNDED'; END IF;
 SELECT * INTO v_cat FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=p_manifest AND charge_day_utc=v_date
 AND category=v_call.rest_category FOR UPDATE;
 IF NOT FOUND OR v_cat.physically_reserved_units+v_call.api_units_per_get>
  v_cat.planned_units
 THEN RAISE EXCEPTION 'P5_V0083_OTHER_CATEGORY_CAP_EXHAUSTED'; END IF;
 SELECT COUNT(*),
  COALESCE(SUM(planned_units) FILTER(WHERE category NOT IN
   ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),0)
 INTO n,other_day
 FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=p_manifest AND charge_day_utc=v_date;
 IF n<>7 OR other_day<>v_charge.daily_other_reserved_units OR
  (SELECT COALESCE(SUM(planned_units),0)
   FROM clean.phase5_fids_utc_rest_category_budget_v39
   WHERE manifest_sha256=p_manifest AND charge_day_utc=v_date)>
   v_charge.daily_api_ceiling
 THEN RAISE EXCEPTION 'P5_V0083_SEVEN_PHYSICAL_UTC_CATEGORIES_NOT_FROZEN'; END IF;
 SELECT COUNT(*),COALESCE(SUM(planned_units) FILTER(WHERE category NOT IN
   ('FIDS_BASE_UNITS','FIDS_SPLIT_UNITS')),0)
 INTO n,other_cycle
 FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=p_manifest;
 IF other_cycle>v_cycle.other_category_reserved_units OR
  v_cycle.physically_reserved_units+v_cycle.other_category_reserved_units+
   v_cycle.protected_api_floor_units>v_cycle.cycle_api_ceiling
 THEN RAISE EXCEPTION 'P5_V0083_OTHER_RESERVE_PROJECT_CYCLE_FLOOR_HOLD'; END IF;
 IF (SELECT COUNT(*) FROM clean.phase5_fids_cycle_rest_category_cap_v39
   WHERE manifest_sha256=p_manifest)<>7
 THEN RAISE EXCEPTION 'P5_V0083_SEVEN_INDEPENDENT_CYCLE_CAPS_MISSING'; END IF;
 SELECT ceiling_units INTO cap
 FROM clean.phase5_fids_cycle_rest_category_cap_v39
 WHERE manifest_sha256=p_manifest AND category=v_call.rest_category;
 SELECT COALESCE(SUM(planned_units),0) INTO plan_cycle
 FROM clean.phase5_fids_utc_rest_category_budget_v39
 WHERE manifest_sha256=p_manifest AND category=v_call.rest_category;
 IF cap IS NULL OR plan_cycle>cap
 THEN RAISE EXCEPTION 'P5_V0083_CATEGORY_CYCLE_BUDGET_NOT_FROZEN'; END IF;
 INSERT INTO clean.phase5_other_rest_physical_reservation_v39(
  reservation_sha256,request_sha256,manifest_sha256,rest_category,
  charged_utc_date,approved_api_units,previous_reserved_units,github_run_id,
  rights_review_sha256,provider_price_sha256,reserved_at_utc)
 VALUES(p_expected_reservation_sha256,p_request_sha256,p_manifest,
  v_call.rest_category,v_date,v_call.api_units_per_get,
  v_cat.physically_reserved_units,p_github_run_id,p_rights_sha256,
  p_price_sha256,v_now);
 UPDATE clean.phase5_fids_utc_rest_category_budget_v39 b
 SET physically_reserved_units=physically_reserved_units+v_call.api_units_per_get
 WHERE b.manifest_sha256=p_manifest AND b.charge_day_utc=v_date
 AND b.category=v_call.rest_category
 AND b.physically_reserved_units=v_cat.physically_reserved_units
 AND b.physically_reserved_units+v_call.api_units_per_get<=b.planned_units;
 GET DIAGNOSTICS modified=ROW_COUNT;
 IF modified<>1 THEN RAISE EXCEPTION 'P5_V0083_OTHER_CATEGORY_CHARGE_ROLLED_BACK'; END IF;
 RETURN v_now;
END $reserve$;

REVOKE ALL ON clean.phase5_other_rest_reviewed_call_v39 FROM PUBLIC;
REVOKE ALL ON clean.phase5_other_rest_physical_reservation_v39 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_other_rest_immutable_v39() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.reserve_phase5_other_rest_once_v39(
 text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clean.phase5_fids_v0082_category_immutable_v39() FROM PUBLIC;
-- No group/login/grants/install of any kind supplied by this migration.
-- A future dedicated reviewer/ACL installer must bind exact one-time
-- reviewed requests and issue EXECUTE only to an independent NOLOGIN role.
-- Existing SOURCE/ PRE/ PREPARE/ WITNESS never gain these privileges.
