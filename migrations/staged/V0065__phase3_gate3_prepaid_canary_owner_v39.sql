-- V0065: narrow PREPAID Gate3 owner-kind contract and LOGGED evidence root.
-- DRAFT ONLY in PR36: applying production schema requires a separately
-- reviewed/authorized deployment. Does NOT arm a session, authorize paid
-- usage, replace actual provider-GET settlement, or modify Phase2 evidence.
-- Historical original five-anchor/Stage1 tables remain untouched.
--
-- Existing prepaid probe runtime is UNLOGGED, so do not treat its survival
-- as sufficient ownership/accounting proof after an independent DB restart.
-- Strict independently logged canary metadata provides durable identity.
ALTER TABLE clean.prepaid_probe_session_runtime
  DROP CONSTRAINT prepaid_probe_session_runtime_owner_kind_check;
ALTER TABLE clean.prepaid_probe_session_runtime
  ADD CONSTRAINT prepaid_probe_session_runtime_owner_kind_check
  CHECK (owner_kind IN ('phase2_safety_smoke','anchor_probe','phase3_credit_canary'));

ALTER TABLE clean.prepaid_probe_session_runtime
  DROP CONSTRAINT prepaid_probe_session_runtime_check2;
ALTER TABLE clean.prepaid_probe_session_runtime
  ADD CONSTRAINT prepaid_probe_session_runtime_check2
  CHECK (
    (owner_kind='anchor_probe'
      AND owner_probe_id IS NOT NULL
      AND stage IN (1,2)
      AND icao IS NOT NULL)
    OR
    (owner_kind='phase2_safety_smoke'
      AND stage IS NULL)
    OR
    (owner_kind='phase3_credit_canary'
      AND owner_probe_id IS NULL
      AND stage IS NULL
      AND icao IS NOT NULL AND icao ~ '^[A-Z]{4}$')
  );

CREATE TABLE clean.phase3_gate3_canary_owner_v39 (
  session_id UUID PRIMARY KEY,
  icao TEXT NOT NULL CHECK (icao ~ '^[A-Z]{4}$'),
  -- SHA of separately reviewed exact owner authorization evidence, not the
  -- text of a credential or the authorization itself.
  authorization_evidence_sha256 TEXT NOT NULL
    CHECK (authorization_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  canary_credit_ceiling INTEGER NOT NULL
    CHECK (canary_credit_ceiling BETWEEN 1 AND 100),
  fixed_exposure_seconds INTEGER NOT NULL
    CHECK (fixed_exposure_seconds BETWEEN 1 AND 3600),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at_utc TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'PREPARED'
    CHECK (state IN ('PREPARED','SETTLED','FAILED')),
  -- Do NOT persist actual provider account balances or exact external credit
  -- deltas in LOGGED research tables. Calculate these strictly in owner
  -- memory, verify equality there, store only a boolean+evidence digest.
  -- This is NOT a substitute for real provider receipt verification.
  exact_reconciliation_verified BOOLEAN,
  internal_received_credits INTEGER
    CHECK (internal_received_credits IS NULL OR internal_received_credits >= 0),
  stable_read_count INTEGER CHECK (stable_read_count IS NULL OR stable_read_count >= 3),
  owned_subscription_delete_verified BOOLEAN,
  foreign_billable_count INTEGER
    CHECK (foreign_billable_count IS NULL OR foreign_billable_count >= 0),
  evidence_sha256 TEXT
    CHECK (evidence_sha256 IS NULL OR evidence_sha256 ~ '^[0-9a-f]{64}$'),
  failure_reason TEXT,
  terminal_at_utc TIMESTAMPTZ,
  CONSTRAINT phase3_g3_canary_expiry_v39 CHECK (
    expires_at_utc > created_at_utc
    AND expires_at_utc <= created_at_utc + interval '24 hours'
  ),
  -- A DB CHECK on this receipt is NOT substitute for source readback,
  -- stable timing or provider subscription ownership verification.
  CONSTRAINT phase3_g3_canary_terminal_shape_v39 CHECK (
    (state='PREPARED'
       AND exact_reconciliation_verified IS NULL
       AND internal_received_credits IS NULL
       AND stable_read_count IS NULL
       AND owned_subscription_delete_verified IS NULL
       AND foreign_billable_count IS NULL
       AND evidence_sha256 IS NULL AND failure_reason IS NULL
       AND terminal_at_utc IS NULL)
    OR
    (state='SETTLED' AND failure_reason IS NULL
       AND terminal_at_utc IS NOT NULL
       AND exact_reconciliation_verified IS TRUE
       AND internal_received_credits IS NOT NULL
       AND internal_received_credits > 0
       AND internal_received_credits <= canary_credit_ceiling
       AND stable_read_count >= 3
       AND owned_subscription_delete_verified IS TRUE
       AND foreign_billable_count = 0
       AND evidence_sha256 IS NOT NULL)
    OR
    (state='FAILED' AND failure_reason IS NOT NULL
       AND length(failure_reason) BETWEEN 1 AND 160
       AND terminal_at_utc IS NOT NULL
       AND evidence_sha256 IS NOT NULL)
  )
);

CREATE FUNCTION clean.guard_phase3_gate3_canary_owner_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate3$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Gate3 canary owner receipt cannot be deleted';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state <> 'PREPARED' THEN
      RAISE EXCEPTION 'Gate3 canary owner must start PREPARED';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.state <> 'PREPARED' THEN
    RAISE EXCEPTION 'Gate3 canary terminal receipt immutable';
  END IF;
  IF ROW(NEW.session_id,NEW.icao,NEW.authorization_evidence_sha256,
      NEW.canary_credit_ceiling,NEW.fixed_exposure_seconds,
      NEW.created_at_utc,NEW.expires_at_utc)
    IS DISTINCT FROM
    ROW(OLD.session_id,OLD.icao,OLD.authorization_evidence_sha256,
      OLD.canary_credit_ceiling,OLD.fixed_exposure_seconds,
      OLD.created_at_utc,OLD.expires_at_utc) THEN
    RAISE EXCEPTION 'Gate3 owner identity and budget cannot be rewritten';
  END IF;
  IF NEW.state NOT IN ('SETTLED','FAILED') THEN
    RAISE EXCEPTION 'Gate3 canary owner permits one terminal transition';
  END IF;
  RETURN NEW;
END
$gate3$;

CREATE TRIGGER phase3_gate3_canary_owner_guard_v39
BEFORE INSERT OR UPDATE OR DELETE
ON clean.phase3_gate3_canary_owner_v39
FOR EACH ROW
EXECUTE FUNCTION clean.guard_phase3_gate3_canary_owner_v39();

-- Harden the actual PREPAID session INSERT path, not just a TS enum check.
-- A new Gate3 session MUST have a same-id LOGGED PREPARED owner with exact
-- ICAO and sufficient lifetime; a caller cannot bypass it by writing the
-- UNLOGGED runtime row directly. Existing Phase2 smoke/anchor inserts do not
-- use this new owner and remain historically unchanged.
CREATE FUNCTION clean.guard_gate3_prepaid_runtime_session_v39()
RETURNS trigger LANGUAGE plpgsql AS $gate3_session$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.owner_kind IS DISTINCT FROM OLD.owner_kind
       OR NEW.session_id IS DISTINCT FROM OLD.session_id THEN
      RAISE EXCEPTION 'Prepaid session owner kind/identity immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.owner_kind='phase3_credit_canary' THEN
    IF NOT EXISTS (
      SELECT 1 FROM clean.phase3_gate3_canary_owner_v39 owner
      WHERE owner.session_id=NEW.session_id
        AND owner.icao=NEW.icao
        AND owner.state='PREPARED'
        AND owner.expires_at_utc >= NEW.expires_at_utc
    ) THEN
      RAISE EXCEPTION 'REFUSED_GATE3_CANARY_DURABLE_OWNER_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END
$gate3_session$;

CREATE TRIGGER trg_guard_gate3_prepaid_runtime_session_v39
BEFORE INSERT OR UPDATE
ON clean.prepaid_probe_session_runtime
FOR EACH ROW
EXECUTE FUNCTION clean.guard_gate3_prepaid_runtime_session_v39();
