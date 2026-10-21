-- STAGED V0069 / DRAFT / NEVER AUTO-DEPLOY OR APPLY TO PRODUCTION.
-- Candidate permit-bound, PREPARED-ONLY commissioning function.
-- This is not a human signature verifier, a permit minting endpoint, an
-- activation path, an automatic migration, or authorization to spend.
--
-- Prereqs: V0066/V0067/V0068 reviewed, installed in test, and *independently*
-- verified before any separately approved future production release.
-- No account-specific approval has been authenticated in this migration.
--
-- A privileged, separately approved release operator must register exactly one
-- independently attested, exact signed AUTH as an immutable permit. There is
-- intentionally NO callable permit-issuance function. Normal commissioner
-- LOGIN receives NO INSERT/UPDATE/DELETE/SELECT on the permit table.
-- The function consumes an existing permit exactly once in the SAME atomic
-- PostgreSQL transaction as one PREPARED scope + two matching query rows.
-- One-use is per permit; an issued LOGIN must ALSO be revoked/expired after
-- use, with active sessions terminated by an independently approved operator.

CREATE TABLE clean.gate05_fids_commission_permit_v39 (
  scope_id uuid PRIMARY KEY,
  authorization_id text NOT NULL UNIQUE
    CHECK (authorization_id ~ '^AUTH-[A-Z0-9-]{8,100}$'),
  authorization_sha256 text NOT NULL UNIQUE
    CHECK (authorization_sha256 ~ '^[a-f0-9]{64}$'),
  cycle_id text NOT NULL CHECK (length(cycle_id) BETWEEN 8 AND 120),
  icao text NOT NULL CHECK (icao='WSSS'),
  starts_at_utc timestamptz NOT NULL,
  expires_at_utc timestamptz NOT NULL,
  provider_reset_utc timestamptz NOT NULL,
  no_location_query_sha256 text NOT NULL
    CHECK (no_location_query_sha256 ~ '^[a-f0-9]{64}$'),
  location_query_sha256 text NOT NULL
    CHECK (location_query_sha256 ~ '^[a-f0-9]{64}$'),
  approved_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  consumed_at_utc timestamptz,
  revoked_at_utc timestamptz,
  CONSTRAINT gate05_commission_distinct_queries_v39 CHECK (
    no_location_query_sha256 <> location_query_sha256
  ),
  CONSTRAINT gate05_commission_exact_window_v39 CHECK (
    expires_at_utc > starts_at_utc AND
    expires_at_utc <= starts_at_utc + interval '1 hour' AND
    expires_at_utc <= provider_reset_utc
  ),
  CONSTRAINT gate05_commission_permit_state_v39 CHECK (
    NOT (consumed_at_utc IS NOT NULL AND revoked_at_utc IS NOT NULL)
  )
);

-- An immutable permit cannot be replaced by a recycled AUTH/SHA, not even
-- when the old scope is STOPPED. Only consumption or terminal revocation
-- of a permit is allowed (privileged release-operator grants remain external).
CREATE FUNCTION clean.guard_gate05_commission_permit_v39()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, clean, pg_temp
AS $gate05_permit_guard$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_PERMIT_CANNOT_DELETE';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.consumed_at_utc IS NOT NULL OR NEW.revoked_at_utc IS NOT NULL THEN
      RAISE EXCEPTION 'GATE05_COMMISSION_PERMIT_MUST_BEGIN_UNUSED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(
       OLD.scope_id,OLD.authorization_id,OLD.authorization_sha256,
       OLD.cycle_id,OLD.icao,OLD.starts_at_utc,OLD.expires_at_utc,
       OLD.provider_reset_utc,OLD.no_location_query_sha256,
       OLD.location_query_sha256,OLD.approved_at_utc
     ) IS DISTINCT FROM ROW(
       NEW.scope_id,NEW.authorization_id,NEW.authorization_sha256,
       NEW.cycle_id,NEW.icao,NEW.starts_at_utc,NEW.expires_at_utc,
       NEW.provider_reset_utc,NEW.no_location_query_sha256,
       NEW.location_query_sha256,NEW.approved_at_utc
     ) THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_PERMIT_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.consumed_at_utc IS NOT NULL OR OLD.revoked_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_PERMIT_TERMINAL';
  END IF;
  IF (NEW.consumed_at_utc IS NULL) = (NEW.revoked_at_utc IS NULL) THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_PERMIT_TERMINAL_MARK_REQUIRED';
  END IF;
  RETURN NEW;
END
$gate05_permit_guard$;

CREATE TRIGGER trg_guard_gate05_commission_permit_v39
BEFORE INSERT OR UPDATE OR DELETE ON clean.gate05_fids_commission_permit_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_commission_permit_v39();

-- V0069 independently grants only EXECUTE on this precise, parameterized
-- function to the non-login commission group. No direct permit/scope grants.
-- A permit row can only be registered by a separately authorized owner.
CREATE FUNCTION clean.prepare_gate05_permitted_scope_v39(
  p_scope_id uuid, p_authorization_sha256 text
) RETURNS TABLE(prepared_scope_id uuid, prepared_queries integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, clean, pg_temp
AS $gate05_prepare$
DECLARE permit clean.gate05_fids_commission_permit_v39%ROWTYPE;
        now_utc timestamptz;
BEGIN
  SELECT * INTO permit FROM clean.gate05_fids_commission_permit_v39
    WHERE scope_id=p_scope_id FOR UPDATE;
  IF NOT FOUND OR permit.authorization_sha256<>p_authorization_sha256 OR
     permit.consumed_at_utc IS NOT NULL OR
     permit.revoked_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_NO_UNUSED_MATCHING_PERMIT';
  END IF;
  now_utc:=clock_timestamp();
  IF permit.icao<>'WSSS' OR
     now_utc>=permit.starts_at_utc OR
     permit.starts_at_utc > now_utc+interval '24 hours' OR
     permit.expires_at_utc<=permit.starts_at_utc OR
     permit.expires_at_utc > permit.starts_at_utc+interval '1 hour' OR
     permit.expires_at_utc > permit.provider_reset_utc OR
     permit.no_location_query_sha256=permit.location_query_sha256 THEN
    RAISE EXCEPTION 'GATE05_COMMISSION_INVALID_PERMIT_WINDOW';
  END IF;

  -- V0068's UNIQUE partial open-slot and unique AUTH/digest constraints are
  -- the authoritative concurrency/replay backstop, not SELECT count alone.
  INSERT INTO clean.gate05_fids_pilot_scope_v39
    (scope_id,authorization_id,authorization_sha256,cycle_id,icao,
     starts_at_utc,expires_at_utc,state,base_cap_units,retry_cap_units,
     base_used_units,retry_used_units)
  VALUES (permit.scope_id,permit.authorization_id,
          permit.authorization_sha256,permit.cycle_id,'WSSS',
          permit.starts_at_utc,permit.expires_at_utc,'PREPARED',4,8,0,0);

  INSERT INTO clean.gate05_fids_allowed_query_v39
    (scope_id,query_sha256,query_index,with_location,last_reserved_attempt)
  VALUES (permit.scope_id,permit.no_location_query_sha256,1,false,0),
         (permit.scope_id,permit.location_query_sha256,2,true,0);

  UPDATE clean.gate05_fids_commission_permit_v39
    SET consumed_at_utc=clock_timestamp() WHERE scope_id=permit.scope_id;

  RETURN QUERY SELECT permit.scope_id,2::integer;
END
$gate05_prepare$;

REVOKE ALL ON TABLE clean.gate05_fids_commission_permit_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.guard_gate05_commission_permit_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.prepare_gate05_permitted_scope_v39(uuid,text)
  FROM PUBLIC;

-- Existing V0067 commission group was INERT. Only staged V0069 adds
-- schema USAGE + this exact function EXECUTE. Still NO LOGIN issued.
GRANT USAGE ON SCHEMA clean TO gate05_fids_commission_v39;
GRANT EXECUTE ON FUNCTION clean.prepare_gate05_permitted_scope_v39(uuid,text)
  TO gate05_fids_commission_v39;

-- All actual LOGIN issuing, permission audits, independently attested permit
-- INSERT, authorization, activation and spending remain separate future gates.
