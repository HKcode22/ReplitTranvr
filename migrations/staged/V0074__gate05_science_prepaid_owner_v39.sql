-- V0074 (STAGED, NOT BOOT APPLIED): distinct WSSS Gate05 science owner.
-- Requires previously installed V0065 Gate3 owner + integrity guards.
-- Production application/deploy is a distinct supervised reviewed action.
-- NO provider calls, Alert creation, role secrets, grant, backfill or payment.
-- This is ADDITIVE to Phase2/Gate3/NEXT4; no historical rows rewritten.
CREATE TABLE clean.phase3_gate05_science_owner_v39 (
  session_id UUID PRIMARY KEY,
  airport_icao TEXT NOT NULL DEFAULT 'WSSS' CHECK (airport_icao = 'WSSS'),
  source_commit TEXT NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  authorization_sha256 TEXT NOT NULL CHECK (authorization_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_stop_ticket_sha256 TEXT NOT NULL
    CHECK (reviewed_stop_ticket_sha256 ~ '^[0-9a-f]{64}$'),
  alert_credit_ceiling INTEGER NOT NULL DEFAULT 500 CHECK (alert_credit_ceiling = 500),
  early_stop_credits INTEGER NOT NULL DEFAULT 350 CHECK (early_stop_credits = 350),
  rest_api_units_ceiling INTEGER NOT NULL DEFAULT 12 CHECK (rest_api_units_ceiling = 12),
  start_at_utc TIMESTAMPTZ NOT NULL,
  stop_at_utc TIMESTAMPTZ NOT NULL,
  session_expires_at_utc TIMESTAMPTZ NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_subscription_id TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'PREPARED'
    CHECK (state IN ('PREPARED','ACTIVE','STOPPED','FAILED')),
  terminal_evidence_sha256 TEXT
    CHECK (terminal_evidence_sha256 IS NULL OR
      terminal_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  exact_owned_delete_verified BOOLEAN,
  terminal_at_utc TIMESTAMPTZ,
  CONSTRAINT gate05_science_window_v39 CHECK (
    start_at_utc >= created_at_utc AND
    stop_at_utc = start_at_utc + INTERVAL '60 minutes' AND
    session_expires_at_utc > stop_at_utc AND
    session_expires_at_utc <= stop_at_utc + INTERVAL '30 minutes'
  ),
  CONSTRAINT gate05_science_state_v39 CHECK (
    (state='PREPARED' AND provider_subscription_id IS NULL
      AND exact_owned_delete_verified IS NULL
      AND terminal_evidence_sha256 IS NULL AND terminal_at_utc IS NULL)
    OR (state='ACTIVE' AND provider_subscription_id IS NOT NULL
      AND exact_owned_delete_verified IS NULL
      AND terminal_evidence_sha256 IS NULL AND terminal_at_utc IS NULL)
    OR (state='STOPPED' AND provider_subscription_id IS NOT NULL
      AND exact_owned_delete_verified IS TRUE
      AND terminal_evidence_sha256 IS NOT NULL
      AND terminal_at_utc IS NOT NULL)
    OR (state='FAILED' AND terminal_evidence_sha256 IS NOT NULL
      AND terminal_at_utc IS NOT NULL)
  )
);
-- At most ONE unclosed WSSS Gate05 scientific pilot. An earlier failed
-- or settled owner is never reused or overwritten.
CREATE UNIQUE INDEX gate05_one_nonterminal_owner_v39
  ON clean.phase3_gate05_science_owner_v39 ((true))
  WHERE state IN ('PREPARED','ACTIVE');

CREATE FUNCTION clean.guard_gate05_science_owner_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate05_owner$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'GATE05_OWNER_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'PREPARED' THEN
      RAISE EXCEPTION 'GATE05_OWNER_MUST_START_PREPARED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.session_id,NEW.airport_icao,NEW.source_commit,
       NEW.authorization_sha256,NEW.reviewed_stop_ticket_sha256,
       NEW.alert_credit_ceiling,NEW.early_stop_credits,
       NEW.rest_api_units_ceiling,NEW.start_at_utc,NEW.stop_at_utc,
       NEW.session_expires_at_utc,NEW.created_at_utc) IS DISTINCT FROM
     ROW(OLD.session_id,OLD.airport_icao,OLD.source_commit,
       OLD.authorization_sha256,OLD.reviewed_stop_ticket_sha256,
       OLD.alert_credit_ceiling,OLD.early_stop_credits,
       OLD.rest_api_units_ceiling,OLD.start_at_utc,OLD.stop_at_utc,
       OLD.session_expires_at_utc,OLD.created_at_utc) THEN
    RAISE EXCEPTION 'GATE05_OWNER_FROZEN_SCOPE_OR_BUDGET';
  END IF;
  IF OLD.state IN ('STOPPED','FAILED') THEN
    RAISE EXCEPTION 'GATE05_OWNER_TERMINAL_IMMUTABLE';
  END IF;
  IF NEW.state='ACTIVE' THEN
    IF OLD.state<>'PREPARED' OR
       NEW.provider_subscription_id IS NULL OR
       length(NEW.provider_subscription_id)=0 OR
       NEW.terminal_at_utc IS NOT NULL THEN
      RAISE EXCEPTION 'GATE05_OWNER_ACTIVE_REQUIRES_NEW_EXACT_BINDING';
    END IF;
  ELSIF NEW.state='STOPPED' THEN
    IF OLD.state<>'ACTIVE' OR
       NEW.provider_subscription_id IS DISTINCT FROM
         OLD.provider_subscription_id THEN
      RAISE EXCEPTION 'GATE05_OWNER_STOP_REQUIRES_EXACT_ACTIVE_BINDING';
    END IF;
  ELSIF NEW.state='FAILED' THEN
    IF OLD.state NOT IN ('PREPARED','ACTIVE') OR
       NEW.provider_subscription_id IS DISTINCT FROM
         OLD.provider_subscription_id THEN
      RAISE EXCEPTION 'GATE05_OWNER_FAIL_REQUIRES_UNCHANGED_BINDING';
    END IF;
  ELSE
    RAISE EXCEPTION 'GATE05_OWNER_UPDATE_MUST_ADVANCE_STATE';
  END IF;
  RETURN NEW;
END
$gate05_owner$;

CREATE TRIGGER gate05_science_owner_immutable_v39
BEFORE INSERT OR UPDATE OR DELETE
ON clean.phase3_gate05_science_owner_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_science_owner_v39();

-- Retain historic Phase2 and Gate3 approved owner kinds, and extend only
-- for the new legitimate Gate05 signed science owner.
ALTER TABLE clean.prepaid_probe_session_runtime
 DROP CONSTRAINT prepaid_probe_session_runtime_owner_kind_check;
ALTER TABLE clean.prepaid_probe_session_runtime
 ADD CONSTRAINT prepaid_probe_session_runtime_owner_kind_check
 CHECK (owner_kind IN (
   'phase2_safety_smoke','anchor_probe','phase3_credit_canary',
   'phase3_gate05_science'
 ));
ALTER TABLE clean.prepaid_probe_session_runtime
 DROP CONSTRAINT prepaid_probe_session_runtime_check2;
ALTER TABLE clean.prepaid_probe_session_runtime
 ADD CONSTRAINT prepaid_probe_session_runtime_check2
 CHECK (
   (owner_kind='anchor_probe' AND owner_probe_id IS NOT NULL
     AND stage IN (1,2) AND icao IS NOT NULL)
   OR (owner_kind='phase2_safety_smoke' AND stage IS NULL)
   OR (owner_kind='phase3_credit_canary' AND owner_probe_id IS NULL
     AND stage IS NULL AND icao IS NOT NULL AND icao ~ '^[A-Z]{4}$')
   OR (owner_kind='phase3_gate05_science' AND owner_probe_id IS NULL
     AND stage IS NULL AND icao='WSSS')
 );

-- Unlogged session INSERT requires LOGGED owner with identical UUID, WSSS
-- and an expiry that covers it. The original Gate3 guard remains in place.
-- Once provider binding is present, the session cannot adopt an unknown
-- provider-supplied ID (including from a webhook arriving before the owner
-- has committed the exact CREATE receipt).
CREATE FUNCTION clean.guard_gate05_prepaid_session_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate05_session$
DECLARE owner_record RECORD;
BEGIN
  IF NEW.owner_kind<>'phase3_gate05_science' THEN RETURN NEW; END IF;
  SELECT airport_icao,state,provider_subscription_id,
         session_expires_at_utc INTO owner_record
    FROM clean.phase3_gate05_science_owner_v39
   WHERE session_id=NEW.session_id;
  IF NOT FOUND OR owner_record.airport_icao IS DISTINCT FROM NEW.icao OR
     owner_record.session_expires_at_utc<NEW.expires_at_utc THEN
    RAISE EXCEPTION 'GATE05_EXACT_LOGGED_OWNER_REQUIRED';
  END IF;
  IF TG_OP='INSERT' THEN
    IF owner_record.state<>'PREPARED' OR
       NEW.provider_subscription_id IS NOT NULL OR NEW.state<>'armed' THEN
      RAISE EXCEPTION 'GATE05_SESSION_ONLY_PREPARED_BEFORE_CREATE';
    END IF;
  ELSE
    IF NEW.session_id IS DISTINCT FROM OLD.session_id OR
       NEW.owner_kind IS DISTINCT FROM OLD.owner_kind OR
       NEW.icao IS DISTINCT FROM OLD.icao THEN
      RAISE EXCEPTION 'GATE05_SESSION_IDENTITY_IMMUTABLE';
    END IF;
    IF NEW.provider_subscription_id IS NOT NULL AND
       (owner_record.state NOT IN ('ACTIVE','STOPPED') OR
        NEW.provider_subscription_id IS DISTINCT FROM
          owner_record.provider_subscription_id) THEN
      RAISE EXCEPTION 'GATE05_SESSION_BIND_MUST_EQUAL_EXACT_LOGGED_OWNER';
    END IF;
    IF OLD.provider_subscription_id IS NOT NULL AND
       NEW.provider_subscription_id IS DISTINCT FROM OLD.provider_subscription_id THEN
      RAISE EXCEPTION 'GATE05_PROVIDER_BINDING_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END
$gate05_session$;
CREATE TRIGGER gate05_prepaid_session_owner_guard_v39
BEFORE INSERT OR UPDATE
ON clean.prepaid_probe_session_runtime
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_prepaid_session_v39();

-- Intentionally NO PUBLIC grants and NO paid provider mutation. A separate
-- reviewed narrow-role/grant migration is required before live execution.
REVOKE ALL ON TABLE clean.phase3_gate05_science_owner_v39 FROM PUBLIC;
