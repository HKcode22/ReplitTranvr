-- DRAFT ONLY / NOT A PRODUCTION MIGRATION. Phase3 Gate0.5 prototype.
-- A separate pilot-scoped REST ledger, disjoint from the legacy global
-- clean.adb_rest_budget_control and clean.adb_rest_attempt_ledger.
-- Apply ONLY inside a disposable PG16 transaction for offline tests.
-- Reviewed production schema release requires its own explicit human AUTH.
CREATE TABLE clean.gate05_fids_pilot_scope_v39 (
  scope_id uuid PRIMARY KEY,
  authorization_id text NOT NULL CHECK (authorization_id ~ '^AUTH-[A-Z0-9-]{8,100}$'),
  authorization_sha256 text NOT NULL CHECK (authorization_sha256 ~ '^[a-f0-9]{64}$'),
  cycle_id text NOT NULL CHECK (length(cycle_id) BETWEEN 8 AND 120),
  icao text NOT NULL CHECK (icao ~ '^[A-Z]{4}$'),
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  starts_at_utc timestamptz NOT NULL,
  expires_at_utc timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'PREPARED' CHECK (state IN ('PREPARED','ACTIVE','STOPPED')),
  stopped_at_utc timestamptz,
  stop_reason text CHECK (stop_reason IN ('OPERATOR_STOP','EXPIRED','SAFETY_ABORT')),
  CONSTRAINT gate05_fids_stop_receipt_shape_v39 CHECK (
    (state='STOPPED' AND stopped_at_utc IS NOT NULL AND stop_reason IS NOT NULL)
    OR (state<>'STOPPED' AND stopped_at_utc IS NULL AND stop_reason IS NULL)
  ),
  base_cap_units integer NOT NULL DEFAULT 4 CHECK (base_cap_units = 4),
  retry_cap_units integer NOT NULL DEFAULT 8 CHECK (retry_cap_units = 8),
  base_used_units integer NOT NULL DEFAULT 0 CHECK (base_used_units BETWEEN 0 AND 4),
  retry_used_units integer NOT NULL DEFAULT 0 CHECK (retry_used_units BETWEEN 0 AND 8),
  CONSTRAINT gate05_fids_owner_window_v39 CHECK (
    expires_at_utc > starts_at_utc AND
    expires_at_utc <= starts_at_utc + interval '1 hour' AND
    starts_at_utc < created_at_utc + interval '24 hours'
  ),
  CONSTRAINT gate05_fids_total_cap_v39 CHECK (base_used_units + retry_used_units <= 12)
);

CREATE TABLE clean.gate05_fids_allowed_query_v39 (
  scope_id uuid NOT NULL REFERENCES clean.gate05_fids_pilot_scope_v39(scope_id),
  query_sha256 text NOT NULL CHECK (query_sha256 ~ '^[a-f0-9]{64}$'),
  query_index smallint NOT NULL CHECK (query_index IN (1,2)),
  with_location boolean NOT NULL,
  last_reserved_attempt smallint NOT NULL DEFAULT 0 CHECK (last_reserved_attempt BETWEEN 0 AND 3),
  PRIMARY KEY (scope_id,query_sha256),
  UNIQUE (scope_id,query_index)
);

CREATE TABLE clean.gate05_fids_attempt_v39 (
  reservation_id uuid PRIMARY KEY,
  scope_id uuid NOT NULL,
  query_sha256 text NOT NULL,
  attempt_number smallint NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  category text NOT NULL CHECK (category IN ('fids_base','fids_retry')),
  units integer NOT NULL CHECK (units = 2),
  reserved_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (scope_id,query_sha256)
    REFERENCES clean.gate05_fids_allowed_query_v39(scope_id,query_sha256),
  UNIQUE (scope_id,query_sha256,attempt_number)
);

CREATE FUNCTION clean.guard_gate05_fids_pilot_scope_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate05_guard$
DECLARE q_count integer; has_false boolean; has_true boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'GATE05_SCOPE_CANNOT_DELETE';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'PREPARED' OR NEW.base_used_units <> 0 OR NEW.retry_used_units <> 0 THEN
      RAISE EXCEPTION 'GATE05_SCOPE_MUST_BEGIN_PREPARED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(OLD.scope_id,OLD.authorization_id,OLD.authorization_sha256,
         OLD.cycle_id,OLD.icao,OLD.created_at_utc,OLD.starts_at_utc,
         OLD.expires_at_utc,OLD.base_cap_units,OLD.retry_cap_units)
     IS DISTINCT FROM
     ROW(NEW.scope_id,NEW.authorization_id,NEW.authorization_sha256,
         NEW.cycle_id,NEW.icao,NEW.created_at_utc,NEW.starts_at_utc,
         NEW.expires_at_utc,NEW.base_cap_units,NEW.retry_cap_units) THEN
    RAISE EXCEPTION 'GATE05_SCOPE_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.state='STOPPED' THEN
    RAISE EXCEPTION 'GATE05_STOP_TERMINAL';
  END IF;
  IF NEW.state='STOPPED' AND
     (NEW.stopped_at_utc IS NULL OR NEW.stop_reason IS NULL) THEN
    RAISE EXCEPTION 'GATE05_STOP_RECEIPT_REQUIRED';
  END IF;
  IF NEW.state<>'STOPPED' AND
     (NEW.stopped_at_utc IS NOT NULL OR NEW.stop_reason IS NOT NULL) THEN
    RAISE EXCEPTION 'GATE05_PREMATURE_STOP_RECEIPT_HOLD';
  END IF;
  IF OLD.state='PREPARED' AND NEW.state='ACTIVE' THEN
    IF NEW.base_used_units <> 0 OR NEW.retry_used_units <> 0 OR
       NOT (NEW.starts_at_utc <= clock_timestamp() AND NEW.expires_at_utc > clock_timestamp()) THEN
      RAISE EXCEPTION 'GATE05_ACTIVATION_WINDOW_HOLD';
    END IF;
    SELECT count(*)::integer,
           coalesce(bool_or(with_location=false),false),
           coalesce(bool_or(with_location=true),false)
    INTO q_count,has_false,has_true
    FROM clean.gate05_fids_allowed_query_v39 WHERE scope_id=NEW.scope_id;
    IF q_count <> 2 OR NOT has_false OR NOT has_true THEN
      RAISE EXCEPTION 'GATE05_EXACT_TWO_QUERY_ACTIVATION_HOLD';
    END IF;
  ELSIF OLD.state <> NEW.state THEN
    IF NOT ((OLD.state='PREPARED' AND NEW.state='STOPPED')
         OR (OLD.state='ACTIVE' AND NEW.state='STOPPED')) THEN
      RAISE EXCEPTION 'GATE05_INVALID_STATE_TRANSITION';
    END IF;
  END IF;
  IF NEW.base_used_units < OLD.base_used_units OR
     NEW.retry_used_units < OLD.retry_used_units THEN
    RAISE EXCEPTION 'GATE05_RESERVATION_COUNTERS_MONOTONIC';
  END IF;
  RETURN NEW;
END
$gate05_guard$;
CREATE TRIGGER trg_guard_gate05_fids_pilot_scope_v39
BEFORE INSERT OR UPDATE OR DELETE ON clean.gate05_fids_pilot_scope_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_fids_pilot_scope_v39();

CREATE FUNCTION clean.guard_gate05_fids_allowed_query_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate05_query$
DECLARE owner_state text;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'GATE05_QUERY_CANNOT_DELETE'; END IF;
  SELECT state INTO owner_state FROM clean.gate05_fids_pilot_scope_v39
    WHERE scope_id=COALESCE(NEW.scope_id,OLD.scope_id);
  IF TG_OP='INSERT' THEN
    IF owner_state<>'PREPARED' OR NEW.last_reserved_attempt<>0 THEN
      RAISE EXCEPTION 'GATE05_QUERY_ONLY_PREPARED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.scope_id,NEW.query_sha256,NEW.query_index,NEW.with_location)
     IS DISTINCT FROM ROW(OLD.scope_id,OLD.query_sha256,OLD.query_index,OLD.with_location) OR
     NEW.last_reserved_attempt < OLD.last_reserved_attempt OR
     NEW.last_reserved_attempt > OLD.last_reserved_attempt + 1 THEN
    RAISE EXCEPTION 'GATE05_QUERY_IMMUTABLE_OR_BAD_SEQUENCE';
  END IF;
  RETURN NEW;
END
$gate05_query$;
CREATE TRIGGER trg_guard_gate05_fids_allowed_query_v39
BEFORE INSERT OR UPDATE OR DELETE ON clean.gate05_fids_allowed_query_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_fids_allowed_query_v39();

-- This function atomically binds each physical attempt to exactly one
-- immutable pilot authorization/cycle/query and separate base/retry caps.
-- It intentionally does NOT activate an authorization and cannot mint AUTH.
CREATE FUNCTION clean.reserve_gate05_fids_attempt_v39(
  p_reservation_id uuid, p_scope_id uuid, p_authorization_id text,
  p_authorization_sha256 text, p_cycle_id text, p_icao text,
  p_query_sha256 text, p_category text, p_attempt integer, p_units integer
) RETURNS boolean LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, clean, pg_temp
AS $gate05_reserve$
DECLARE o clean.gate05_fids_pilot_scope_v39%ROWTYPE;
        q clean.gate05_fids_allowed_query_v39%ROWTYPE;
BEGIN
  IF p_units <> 2 OR p_attempt NOT BETWEEN 1 AND 3 OR
     p_category NOT IN ('fids_base','fids_retry') OR
     (p_attempt=1 AND p_category<>'fids_base') OR
     (p_attempt>1 AND p_category<>'fids_retry') THEN
    RAISE EXCEPTION 'GATE05_ATTEMPT_SHAPE_HOLD';
  END IF;
  SELECT * INTO o FROM clean.gate05_fids_pilot_scope_v39
    WHERE scope_id=p_scope_id FOR UPDATE;
  IF NOT FOUND OR o.state<>'ACTIVE' OR
     o.authorization_id<>p_authorization_id OR
     o.authorization_sha256<>p_authorization_sha256 OR
     o.cycle_id<>p_cycle_id OR o.icao<>p_icao OR
     clock_timestamp()<o.starts_at_utc OR
     clock_timestamp()>=o.expires_at_utc THEN
    RAISE EXCEPTION 'GATE05_OWNER_AUTH_CYCLE_OR_WINDOW_HOLD';
  END IF;
  SELECT * INTO q FROM clean.gate05_fids_allowed_query_v39
    WHERE scope_id=p_scope_id AND query_sha256=p_query_sha256 FOR UPDATE;
  IF NOT FOUND OR q.last_reserved_attempt<>p_attempt-1 THEN
    RAISE EXCEPTION 'GATE05_WRONG_QUERY_DUPLICATE_OR_SEQUENCE_HOLD';
  END IF;
  IF (p_attempt=1 AND o.base_used_units+p_units>o.base_cap_units)
     OR (p_attempt>1 AND o.retry_used_units+p_units>o.retry_cap_units)
     OR o.base_used_units + o.retry_used_units + p_units > 12 THEN
    RAISE EXCEPTION 'GATE05_SCOPED_UNIT_CAP_HOLD';
  END IF;
  UPDATE clean.gate05_fids_pilot_scope_v39
    SET base_used_units=base_used_units+CASE WHEN p_attempt=1 THEN p_units ELSE 0 END,
        retry_used_units=retry_used_units+CASE WHEN p_attempt>1 THEN p_units ELSE 0 END
    WHERE scope_id=p_scope_id;
  UPDATE clean.gate05_fids_allowed_query_v39
    SET last_reserved_attempt=p_attempt
    WHERE scope_id=p_scope_id AND query_sha256=p_query_sha256;
  INSERT INTO clean.gate05_fids_attempt_v39
    (reservation_id,scope_id,query_sha256,attempt_number,category,units)
    VALUES (p_reservation_id,p_scope_id,p_query_sha256,p_attempt,p_category,p_units);
  RETURN true;
END
$gate05_reserve$;


-- SECURITY REVIEW: default EXECUTE privileges on new PostgreSQL functions
-- include PUBLIC. This staged migration explicitly withholds all reservation
-- and stop execution grants, including ordinary application connections.
-- A separate APPROVED release must grant only specific dedicated runtime
-- identities; no runtime roles or human approval are invented here.
REVOKE ALL ON TABLE clean.gate05_fids_pilot_scope_v39,
  clean.gate05_fids_allowed_query_v39,
  clean.gate05_fids_attempt_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.guard_gate05_fids_pilot_scope_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.guard_gate05_fids_allowed_query_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.reserve_gate05_fids_attempt_v39(
  uuid,uuid,text,text,text,text,text,text,integer,integer
) FROM PUBLIC;

-- STOP owner is deliberately separated from the reservation caller.
-- STOPPED is terminal; this function runs under its controlled owner
-- and locks the same row as the reservation stored function. It therefore
-- serializes STOP with new admissions. An HTTP GET already reserved before
-- STOP commits may still be in flight and must be reconciled separately.
CREATE FUNCTION clean.stop_gate05_fids_pilot_v39(
  p_scope_id uuid, p_reason text
) RETURNS TABLE(state text, reserved_attempts bigint, reserved_units bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, clean, pg_temp
AS $gate05_stop$
DECLARE s text;
BEGIN
  IF p_reason NOT IN ('OPERATOR_STOP','EXPIRED','SAFETY_ABORT') THEN
    RAISE EXCEPTION 'GATE05_STOP_REASON_HOLD';
  END IF;
  SELECT owner.state INTO s FROM clean.gate05_fids_pilot_scope_v39 owner
    WHERE owner.scope_id=p_scope_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GATE05_STOP_SCOPE_NOT_FOUND'; END IF;
  IF s <> 'STOPPED' THEN
    UPDATE clean.gate05_fids_pilot_scope_v39 owner
      SET state='STOPPED', stopped_at_utc=clock_timestamp(),stop_reason=p_reason
      WHERE owner.scope_id=p_scope_id;
  END IF;
  RETURN QUERY SELECT 'STOPPED'::text,count(*)::bigint,
     coalesce(sum(a.units),0)::bigint
     FROM clean.gate05_fids_attempt_v39 a WHERE a.scope_id=p_scope_id;
END
$gate05_stop$;

REVOKE ALL ON FUNCTION clean.stop_gate05_fids_pilot_v39(uuid,text) FROM PUBLIC;

-- Production release REQUIRES separate, reviewed role/credential isolation.
-- Do not grant any of these to legacy broad database owner credentials and do
-- not load this file as an automatic production migration.
