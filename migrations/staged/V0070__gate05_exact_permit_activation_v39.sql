-- STAGED V0070 ONLY / DO NOT INSTALL BY BOOT OR REAPPLY V0066..V0069.
-- Exact one-use activation endpoint. Separate gate after an independently
-- approved, exact signed AUTH permit has been consumed to PREPARED, a real
-- external safety worker has been verified ARMED, and human live GO is bound
-- to the exact two-query WSSS feasibility scope (<=12 API units).
--
-- No provider calls, no receipt or signer creation, no permission for
-- dispatcher/safety/commissioner to activate or mutate pilot tables.
-- A SQL function cannot attest GitHub worker uptime or human approval:
-- the separately authorized activation operator must verify those first.
--
-- This migration is NOT approval to deploy, issue login, register a permit,
-- activate, consume provider units or merge draft PR #80.
CREATE ROLE gate05_fids_activate_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;

CREATE FUNCTION clean.activate_gate05_prepared_scope_v39(
  p_scope_id uuid, p_authorization_sha256 text
) RETURNS TABLE(scope_id uuid, state text, expires_at_utc timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, clean, pg_temp
AS $gate05_activate$
DECLARE v_scope clean.gate05_fids_pilot_scope_v39%ROWTYPE;
        v_permit clean.gate05_fids_commission_permit_v39%ROWTYPE;
        v_count integer;
        v_no_location integer;
        v_with_location integer;
        v_now timestamptz;
BEGIN
  SELECT * INTO v_scope
    FROM clean.gate05_fids_pilot_scope_v39 s
    WHERE s.scope_id=p_scope_id FOR UPDATE;
  IF NOT FOUND OR v_scope.state <> 'PREPARED'
      OR v_scope.authorization_sha256 IS DISTINCT FROM p_authorization_sha256
      OR v_scope.icao <> 'WSSS'
      OR v_scope.base_cap_units<>4 OR v_scope.retry_cap_units<>8
      OR v_scope.base_used_units<>0 OR v_scope.retry_used_units<>0
      OR v_scope.stopped_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'GATE05_ACTIVATION_SCOPE_OR_AUTH_HOLD';
  END IF;

  SELECT * INTO v_permit
    FROM clean.gate05_fids_commission_permit_v39 p
    WHERE p.scope_id=p_scope_id FOR UPDATE;
  IF NOT FOUND OR v_permit.consumed_at_utc IS NULL
      OR v_permit.revoked_at_utc IS NOT NULL
      OR v_permit.authorization_id IS DISTINCT FROM v_scope.authorization_id
      OR v_permit.authorization_sha256 IS DISTINCT FROM p_authorization_sha256
      OR v_permit.cycle_id IS DISTINCT FROM v_scope.cycle_id
      OR v_permit.icao <> 'WSSS'
      OR v_permit.starts_at_utc IS DISTINCT FROM v_scope.starts_at_utc
      OR v_permit.expires_at_utc IS DISTINCT FROM v_scope.expires_at_utc THEN
    RAISE EXCEPTION 'GATE05_ACTIVATION_PERMIT_HOLD';
  END IF;

  v_now := clock_timestamp();
  IF v_now < v_scope.starts_at_utc OR v_now >= v_scope.expires_at_utc
      OR v_now >= v_permit.provider_reset_utc THEN
    RAISE EXCEPTION 'GATE05_ACTIVATION_WINDOW_HOLD';
  END IF;

  SELECT count(*)::integer,
    count(*) FILTER (WHERE query_index=1 AND with_location=false AND
                     query_sha256=v_permit.no_location_query_sha256),
    count(*) FILTER (WHERE query_index=2 AND with_location=true AND
                     query_sha256=v_permit.location_query_sha256)
  INTO v_count,v_no_location,v_with_location
  FROM clean.gate05_fids_allowed_query_v39
  WHERE clean.gate05_fids_allowed_query_v39.scope_id=p_scope_id;
  IF v_count<>2 OR v_no_location<>1 OR v_with_location<>1 THEN
    RAISE EXCEPTION 'GATE05_ACTIVATION_QUERY_OR_ORDER_HOLD';
  END IF;

  IF EXISTS (SELECT 1 FROM clean.gate05_fids_attempt_v39 a
             WHERE a.scope_id=p_scope_id) THEN
    RAISE EXCEPTION 'GATE05_ACTIVATION_PREEXISTING_ATTEMPTS_HOLD';
  END IF;

  UPDATE clean.gate05_fids_pilot_scope_v39 s SET state='ACTIVE'
    WHERE s.scope_id=p_scope_id;
  RETURN QUERY SELECT p_scope_id,'ACTIVE'::text,v_scope.expires_at_utc;
END
$gate05_activate$;

REVOKE ALL ON FUNCTION clean.activate_gate05_prepared_scope_v39(uuid,text)
  FROM PUBLIC;
GRANT USAGE ON SCHEMA clean TO gate05_fids_activate_v39;
GRANT EXECUTE ON FUNCTION clean.activate_gate05_prepared_scope_v39(uuid,text)
  TO gate05_fids_activate_v39;
-- The activation group receives NO CREATE, table ACL or LOGIN.
-- All existing groups remain unable to activate.
