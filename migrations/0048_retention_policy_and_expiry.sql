BEGIN;

-- Phase-2 prerequisite-P retention owner. This migration deliberately does not
-- choose a retention period. Verified policy rows are inserted only from live
-- prerequisite-P evidence. Until an ENABLED enforcement event exists, legacy
--/offline writes remain possible; prerequisite P itself refuses to PASS unless
-- enforcement is enabled and every required raw class has a verified policy.
CREATE TABLE IF NOT EXISTS clean.adb_retention_policy_v39 (
  policy_hash TEXT PRIMARY KEY CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  content_class TEXT NOT NULL,
  content_classification TEXT NOT NULL CHECK (content_classification IN ('raw_api_content','derived_work','non_aerodatabox_metadata')),
  retention_seconds BIGINT NOT NULL CHECK (retention_seconds > 0),
  retention_verified_date DATE NOT NULL,
  retention_source TEXT NOT NULL,
  retention_legal_basis TEXT NOT NULL,
  expiry_action TEXT NOT NULL,
  owner_approval_ref TEXT NOT NULL,
  retention_matrix_hash TEXT NOT NULL CHECK (retention_matrix_hash ~ '^[a-f0-9]{64}$'),
  effective_from_utc TIMESTAMPTZ NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_class, policy_hash)
);

CREATE TABLE IF NOT EXISTS clean.adb_retention_enforcement_event_v39 (
  event_id BIGSERIAL PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  retention_matrix_hash TEXT NOT NULL CHECK (retention_matrix_hash ~ '^[a-f0-9]{64}$'),
  security_contract_hash TEXT NOT NULL CHECK (security_contract_hash ~ '^[a-f0-9]{64}$'),
  owner_approval_ref TEXT NOT NULL,
  occurred_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION clean.reject_retention_control_mutation_v39()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'V3.9 retention policy/enforcement records are append-only';
END $$;

DROP TRIGGER IF EXISTS trg_retention_policy_immutable_v39 ON clean.adb_retention_policy_v39;
CREATE TRIGGER trg_retention_policy_immutable_v39
  BEFORE UPDATE OR DELETE ON clean.adb_retention_policy_v39
  FOR EACH ROW EXECUTE FUNCTION clean.reject_retention_control_mutation_v39();

DROP TRIGGER IF EXISTS trg_retention_enforcement_immutable_v39 ON clean.adb_retention_enforcement_event_v39;
CREATE TRIGGER trg_retention_enforcement_immutable_v39
  BEFORE UPDATE OR DELETE ON clean.adb_retention_enforcement_event_v39
  FOR EACH ROW EXECUTE FUNCTION clean.reject_retention_control_mutation_v39();

ALTER TABLE clean.raw_delivery
  ADD COLUMN IF NOT EXISTS retention_policy_hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
ALTER TABLE clean.raw_delivery_item
  ADD COLUMN IF NOT EXISTS retention_policy_hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
ALTER TABLE clean.raw_airborne_events
  ADD COLUMN IF NOT EXISTS retention_policy_hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
ALTER TABLE clean.fids_query_response
  ADD COLUMN IF NOT EXISTS retention_policy_hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
ALTER TABLE clean.flight_population
  ADD COLUMN IF NOT EXISTS retention_policy_hash TEXT,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_raw_delivery_retention_expiry_v39 ON clean.raw_delivery(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_delivery_item_retention_expiry_v39 ON clean.raw_delivery_item(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_airborne_retention_expiry_v39 ON clean.raw_airborne_events(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fids_query_retention_expiry_v39 ON clean.fids_query_response(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flight_population_retention_expiry_v39 ON clean.flight_population(retention_expires_at) WHERE retention_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION clean.retention_enforcement_enabled_v39()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT enabled FROM clean.adb_retention_enforcement_event_v39 ORDER BY event_id DESC LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION clean.apply_retention_policy_v39()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_class TEXT := TG_ARGV[0];
  v_hash TEXT;
  v_seconds BIGINT;
  v_base TIMESTAMPTZ;
BEGIN
  IF NOT clean.retention_enforcement_enabled_v39() THEN
    RETURN NEW;
  END IF;

  SELECT policy_hash, retention_seconds INTO v_hash, v_seconds
    FROM clean.adb_retention_policy_v39
   WHERE content_class = v_class
     AND effective_from_utc <= now()
   ORDER BY effective_from_utc DESC, created_at_utc DESC
   LIMIT 1;
  IF v_hash IS NULL OR v_seconds IS NULL THEN
    RAISE EXCEPTION 'RETENTION_POLICY_MISSING:%', v_class;
  END IF;

  IF TG_TABLE_NAME = 'raw_delivery' THEN
    v_base := NEW.received_at_utc;
  ELSIF TG_TABLE_NAME = 'raw_airborne_events' THEN
    v_base := NEW.received_timestamp_utc;
    IF NEW.payload_sha256 IS NULL OR NEW.payload_sha256 !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'RETENTION_CONTENT_HASH_MISSING:airborne_raw';
    END IF;
  ELSIF TG_TABLE_NAME = 'fids_query_response' THEN
    v_base := NEW.raw_persisted_at_utc;
  ELSIF TG_TABLE_NAME = 'flight_population' THEN
    IF NEW.source_type IS DISTINCT FROM 'fids' THEN RETURN NEW; END IF;
    v_base := COALESCE(NEW.available_at, now());
    IF NEW.response_hash IS NULL OR NEW.response_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'RETENTION_CONTENT_HASH_MISSING:fids_population';
    END IF;
  ELSE
    RAISE EXCEPTION 'RETENTION_UNSUPPORTED_TABLE:%', TG_TABLE_NAME;
  END IF;

  IF v_base IS NULL THEN RAISE EXCEPTION 'RETENTION_BASE_TIME_MISSING:%', v_class; END IF;
  NEW.retention_policy_hash := v_hash;
  NEW.retention_expires_at := v_base + (v_seconds * interval '1 second');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION clean.inherit_raw_delivery_item_retention_v39()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT clean.retention_enforcement_enabled_v39() THEN RETURN NEW; END IF;
  SELECT retention_policy_hash, retention_expires_at
    INTO NEW.retention_policy_hash, NEW.retention_expires_at
    FROM clean.raw_delivery WHERE delivery_id = NEW.delivery_id;
  IF NEW.retention_policy_hash IS NULL OR NEW.retention_expires_at IS NULL THEN
    RAISE EXCEPTION 'RETENTION_PARENT_POLICY_MISSING:webhook_raw_delivery:%', NEW.delivery_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_raw_delivery_retention_v39 ON clean.raw_delivery;
CREATE TRIGGER trg_raw_delivery_retention_v39
  BEFORE INSERT ON clean.raw_delivery
  FOR EACH ROW EXECUTE FUNCTION clean.apply_retention_policy_v39('webhook_raw_delivery');

DROP TRIGGER IF EXISTS trg_raw_delivery_item_retention_v39 ON clean.raw_delivery_item;
CREATE TRIGGER trg_raw_delivery_item_retention_v39
  BEFORE INSERT ON clean.raw_delivery_item
  FOR EACH ROW EXECUTE FUNCTION clean.inherit_raw_delivery_item_retention_v39();

DROP TRIGGER IF EXISTS trg_raw_airborne_retention_v39 ON clean.raw_airborne_events;
CREATE TRIGGER trg_raw_airborne_retention_v39
  BEFORE INSERT ON clean.raw_airborne_events
  FOR EACH ROW EXECUTE FUNCTION clean.apply_retention_policy_v39('airborne_raw');

DROP TRIGGER IF EXISTS trg_fids_query_retention_v39 ON clean.fids_query_response;
CREATE TRIGGER trg_fids_query_retention_v39
  BEFORE INSERT ON clean.fids_query_response
  FOR EACH ROW EXECUTE FUNCTION clean.apply_retention_policy_v39('fids_population');

DROP TRIGGER IF EXISTS trg_flight_population_retention_v39 ON clean.flight_population;
CREATE TRIGGER trg_flight_population_retention_v39
  BEFORE INSERT ON clean.flight_population
  FOR EACH ROW EXECUTE FUNCTION clean.apply_retention_policy_v39('fids_population');

-- Actual raw-content expiry candidates. This is the source used by the P dry
-- run; tombstones are outputs of compliance deletion, never the candidate set.
CREATE OR REPLACE FUNCTION clean.list_expired_retention_candidates_v39(p_cutoff TIMESTAMPTZ)
RETURNS TABLE(surface TEXT, record_id TEXT, content_hash TEXT, expires_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT 'primary', 'raw_delivery:' || rd.delivery_id, rd.raw_body_sha256, rd.retention_expires_at
    FROM clean.raw_delivery rd
   WHERE rd.retention_expires_at <= p_cutoff
     AND NOT EXISTS (SELECT 1 FROM clean.retention_tombstone t WHERE t.surface='primary' AND t.record_id='raw_delivery:' || rd.delivery_id)
  UNION ALL
  SELECT 'primary', 'raw_delivery_item:' || rdi.delivery_id || ':' || rdi.item_index::text, rdi.raw_item_sha256, rdi.retention_expires_at
    FROM clean.raw_delivery_item rdi
   WHERE rdi.retention_expires_at <= p_cutoff
     AND NOT EXISTS (SELECT 1 FROM clean.retention_tombstone t WHERE t.surface='primary' AND t.record_id='raw_delivery_item:' || rdi.delivery_id || ':' || rdi.item_index::text)
  UNION ALL
  SELECT 'primary', 'raw_airborne_events:' || rae.id::text, rae.payload_sha256, rae.retention_expires_at
    FROM clean.raw_airborne_events rae
   WHERE rae.retention_expires_at <= p_cutoff AND rae.payload_sha256 ~ '^[a-f0-9]{64}$'
     AND NOT EXISTS (SELECT 1 FROM clean.retention_tombstone t WHERE t.surface='primary' AND t.record_id='raw_airborne_events:' || rae.id::text)
  UNION ALL
  SELECT 'primary', 'fids_query_response:' || fqr.population_query_id::text, fqr.response_hash, fqr.retention_expires_at
    FROM clean.fids_query_response fqr
   WHERE fqr.retention_expires_at <= p_cutoff
     AND NOT EXISTS (SELECT 1 FROM clean.retention_tombstone t WHERE t.surface='primary' AND t.record_id='fids_query_response:' || fqr.population_query_id::text)
  UNION ALL
  SELECT 'primary', 'flight_population:' || fp.id::text, fp.response_hash, fp.retention_expires_at
    FROM clean.flight_population fp
   WHERE fp.source_type='fids' AND fp.retention_expires_at <= p_cutoff AND fp.response_hash ~ '^[a-f0-9]{64}$'
     AND NOT EXISTS (SELECT 1 FROM clean.retention_tombstone t WHERE t.surface='primary' AND t.record_id='flight_population:' || fp.id::text)
$$;

COMMIT;
