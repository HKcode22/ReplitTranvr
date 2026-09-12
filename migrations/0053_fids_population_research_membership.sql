-- V3.9 prerequisite-P / Phase 2: separate short-lived FIDS provider Contents
-- from durable, non-identifying experiment membership/funnel state.
--
-- The binding FIDS retention clock is enforced by the existing raw-response
-- expiry owner. When a clean.fids_query_response raw payload expires, this
-- migration atomically tombstones and clears the normalized provider fields in
-- every linked clean.flight_population row. The experiment denominator remains
-- as a random population_member_id plus project-owned sampling/funnel context.

BEGIN;

ALTER TABLE clean.flight_population
  ADD COLUMN IF NOT EXISTS population_member_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS provider_content_expired_at_utc TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_flight_population_member_id
  ON clean.flight_population(population_member_id);
CREATE INDEX IF NOT EXISTS idx_flight_population_provider_expiry
  ON clean.flight_population(provider_content_expired_at_utc, population_query_id)
  WHERE source_type = 'fids';

-- flight_number is provider content and therefore must be clearable at FIDS
-- expiry. Other provider-bearing columns are already nullable.
ALTER TABLE clean.flight_population
  ALTER COLUMN flight_number DROP NOT NULL;

-- The raw-response SHA is itself a fingerprint of provider Contents. Preserve
-- it only in the immutable retention tombstone, not indefinitely in the live
-- FIDS observation row.
ALTER TABLE clean.fids_query_response
  ALTER COLUMN response_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS clean.population_research_membership (
  population_member_id UUID PRIMARY KEY,
  batch_id TEXT,
  source_airport_icao TEXT NOT NULL,
  source_airport_tier TEXT,
  window_start_utc TIMESTAMPTZ NOT NULL,
  window_end_utc TIMESTAMPTZ NOT NULL,
  cutoff_utc TIMESTAMPTZ NOT NULL,
  query_direction TEXT,
  population_role TEXT,
  source_type TEXT NOT NULL CHECK (source_type = 'fids'),
  observed_via_webhook BOOLEAN NOT NULL DEFAULT false,
  first_webhook_captured_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_population_research_membership_batch_cutoff
  ON clean.population_research_membership(batch_id, cutoff_utc);
CREATE INDEX IF NOT EXISTS idx_population_research_membership_airport_cutoff
  ON clean.population_research_membership(source_airport_icao, cutoff_utc);

-- Backfill existing FIDS observations before any provider fields are expired.
INSERT INTO clean.population_research_membership
  (population_member_id,batch_id,source_airport_icao,source_airport_tier,
   window_start_utc,window_end_utc,cutoff_utc,query_direction,population_role,
   source_type,observed_via_webhook,created_at_utc)
SELECT population_member_id,batch_id,source_airport_icao,source_airport_tier,
       window_start_utc,window_end_utc,cutoff_utc,query_direction,population_role,
       'fids',observed_via_webhook,created_at
  FROM clean.flight_population
 WHERE source_type = 'fids'
ON CONFLICT (population_member_id) DO NOTHING;

CREATE OR REPLACE FUNCTION clean.ensure_population_research_membership()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_type = 'fids' THEN
    INSERT INTO clean.population_research_membership
      (population_member_id,batch_id,source_airport_icao,source_airport_tier,
       window_start_utc,window_end_utc,cutoff_utc,query_direction,population_role,
       source_type,observed_via_webhook,created_at_utc)
    VALUES
      (NEW.population_member_id,NEW.batch_id,NEW.source_airport_icao,NEW.source_airport_tier,
       NEW.window_start_utc,NEW.window_end_utc,NEW.cutoff_utc,NEW.query_direction,NEW.population_role,
       'fids',NEW.observed_via_webhook,NEW.created_at)
    ON CONFLICT (population_member_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_flight_population_research_membership ON clean.flight_population;
CREATE TRIGGER trg_flight_population_research_membership
  AFTER INSERT ON clean.flight_population
  FOR EACH ROW EXECUTE FUNCTION clean.ensure_population_research_membership();

-- A resolved webhook observation may mark one or more active FIDS population
-- memberships as captured. No provider value is copied into the durable
-- membership table; only the project-owned boolean/timestamp is retained.
CREATE OR REPLACE FUNCTION clean.mark_population_research_membership_captured()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.flight_instance_id IS NULL THEN RETURN NEW; END IF;
  UPDATE clean.population_research_membership m
     SET observed_via_webhook = true,
         first_webhook_captured_at_utc = COALESCE(m.first_webhook_captured_at_utc, NEW.available_at, NEW.received_timestamp_utc)
    FROM clean.flight_population p
   WHERE p.population_member_id = m.population_member_id
     AND p.source_type = 'fids'
     AND p.provider_content_expired_at_utc IS NULL
     AND p.population_role = 'requested_airport_primary'
     AND (p.canonical_flight_instance_id = NEW.flight_instance_id OR p.analytic_identity_id = NEW.flight_instance_id)
     AND p.batch_id IS NOT DISTINCT FROM NEW.batch_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_flight_events_mark_population_captured ON clean.flight_events;
CREATE TRIGGER trg_flight_events_mark_population_captured
  AFTER INSERT ON clean.flight_events
  FOR EACH ROW EXECUTE FUNCTION clean.mark_population_research_membership_captured();

-- Carry the random project member id into PRE snapshots while the transient
-- FIDS identity mapping is still available. This preserves cohort linkage after
-- the provider fields are removed.
ALTER TABLE clean.flight_snapshots
  ADD COLUMN IF NOT EXISTS population_member_id UUID REFERENCES clean.population_research_membership(population_member_id);
CREATE INDEX IF NOT EXISTS idx_flight_snapshots_population_member
  ON clean.flight_snapshots(population_member_id)
  WHERE population_member_id IS NOT NULL;

UPDATE clean.flight_snapshots s
   SET population_member_id = p.population_member_id
  FROM clean.flight_population p
 WHERE s.population_member_id IS NULL
   AND s.population_query_id = p.population_query_id
   AND s.flight_instance_id = p.analytic_identity_id
   AND p.population_role = 'requested_airport_primary';

CREATE OR REPLACE FUNCTION clean.attach_population_member_to_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.population_member_id IS NULL AND NEW.population_query_id IS NOT NULL THEN
    SELECT p.population_member_id
      INTO NEW.population_member_id
      FROM clean.flight_population p
     WHERE p.population_query_id = NEW.population_query_id
       AND p.analytic_identity_id = NEW.flight_instance_id
       AND p.population_role = 'requested_airport_primary'
       AND p.provider_content_expired_at_utc IS NULL
     ORDER BY p.id
     LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_flight_snapshots_population_member ON clean.flight_snapshots;
CREATE TRIGGER trg_flight_snapshots_population_member
  BEFORE INSERT OR UPDATE OF population_query_id,flight_instance_id ON clean.flight_snapshots
  FOR EACH ROW EXECUTE FUNCTION clean.attach_population_member_to_snapshot();

-- Outcomes can correspond to multiple cutoff/horizon memberships for the same
-- physical flight. Persist the many-to-many project linkage without copying the
-- provider identity into the durable funnel table.
CREATE TABLE IF NOT EXISTS clean.population_research_outcome_link (
  population_member_id UUID NOT NULL REFERENCES clean.population_research_membership(population_member_id),
  target TEXT NOT NULL,
  label_status TEXT NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(population_member_id,target)
);

INSERT INTO clean.population_research_outcome_link(population_member_id,target,label_status,updated_at_utc)
SELECT DISTINCT s.population_member_id,o.target,o.label_status,o.updated_at
  FROM clean.flight_outcomes o
  JOIN clean.flight_snapshots s ON s.flight_instance_id = o.flight_instance_id
 WHERE s.population_member_id IS NOT NULL
ON CONFLICT (population_member_id,target) DO UPDATE
  SET label_status = EXCLUDED.label_status,
      updated_at_utc = EXCLUDED.updated_at_utc;

CREATE OR REPLACE FUNCTION clean.sync_population_research_outcome_link()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO clean.population_research_outcome_link(population_member_id,target,label_status,updated_at_utc)
  SELECT DISTINCT s.population_member_id,NEW.target,NEW.label_status,NEW.updated_at
    FROM clean.flight_snapshots s
   WHERE s.flight_instance_id = NEW.flight_instance_id
     AND s.population_member_id IS NOT NULL
  ON CONFLICT (population_member_id,target) DO UPDATE
    SET label_status = EXCLUDED.label_status,
        updated_at_utc = EXCLUDED.updated_at_utc;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_flight_outcomes_population_link ON clean.flight_outcomes;
CREATE TRIGGER trg_flight_outcomes_population_link
  AFTER INSERT OR UPDATE OF label_status ON clean.flight_outcomes
  FOR EACH ROW EXECUTE FUNCTION clean.sync_population_research_outcome_link();

-- Expired FIDS population rows keep only project-owned sampling/membership
-- context. Every direct/reversible provider value is cleared.
ALTER TABLE clean.flight_population DROP CONSTRAINT IF EXISTS flight_population_fids_complete;
ALTER TABLE clean.flight_population
  ADD CONSTRAINT flight_population_fids_complete CHECK (
    source_type <> 'fids'
    OR provider_content_expired_at_utc IS NOT NULL
    OR (
      population_query_id IS NOT NULL AND query_direction IS NOT NULL AND population_role IS NOT NULL
      AND from_local IS NOT NULL AND to_local IS NOT NULL AND airport_iana_timezone IS NOT NULL
      AND scope_classification IS NOT NULL AND codeshare_resolution_status IS NOT NULL
      AND fids_retrieval_utc IS NOT NULL AND available_at IS NOT NULL AND response_hash IS NOT NULL
      AND analytic_identity_id IS NOT NULL AND provider_api_version IS NOT NULL
      AND fids_protocol_version IS NOT NULL AND openapi_sha256 IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE clean.flight_population DROP CONSTRAINT IF EXISTS flight_population_fids_expired_cleared;
ALTER TABLE clean.flight_population
  ADD CONSTRAINT flight_population_fids_expired_cleared CHECK (
    provider_content_expired_at_utc IS NULL OR (
      flight_number IS NULL AND carrier_iata IS NULL AND carrier_icao IS NULL AND call_sign IS NULL
      AND dep_airport_icao IS NULL AND dep_airport_iata IS NULL
      AND arr_airport_icao IS NULL AND arr_airport_iata IS NULL
      AND dep_scheduled_utc IS NULL AND arr_scheduled_utc IS NULL
      AND provider_record_key IS NULL AND raw_payload_sha256 IS NULL AND coverage_state IS NULL
      AND population_query_id IS NULL AND from_local IS NULL AND to_local IS NULL
      AND airport_iana_timezone IS NULL AND scope_classification IS NULL
      AND codeshare_resolution_status IS NULL AND fids_retrieval_utc IS NULL
      AND available_at IS NULL AND response_hash IS NULL
      AND canonical_flight_instance_id IS NULL AND analytic_identity_id IS NULL
      AND provider_api_version IS NULL
    )
  ) NOT VALID;

-- Preserve the original append-only rule, with exactly two audited compliance
-- transitions: raw FIDS response expiry and normalized population-content
-- expiry. Restoration/general mutation/delete remain rejected.
CREATE OR REPLACE FUNCTION clean.reject_fids_observation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'fids_query_response' AND TG_OP = 'UPDATE' THEN
    IF OLD.raw_payload IS NOT NULL
       AND NEW.raw_payload IS NULL
       AND OLD.raw_expired_at_utc IS NULL
       AND NEW.raw_expired_at_utc IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM clean.retention_tombstone t
          WHERE t.surface='primary'
            AND t.record_id='fids_query_response:' || OLD.population_query_id::text || ':raw_payload'
       )
    THEN
      NEW.response_hash := NULL;
      IF (to_jsonb(NEW) - ARRAY['raw_payload','raw_expired_at_utc','response_hash'])
         = (to_jsonb(OLD) - ARRAY['raw_payload','raw_expired_at_utc','response_hash'])
      THEN RETURN NEW; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'flight_population' AND TG_OP = 'UPDATE' THEN
    IF OLD.source_type = 'fids'
       AND OLD.provider_content_expired_at_utc IS NULL
       AND NEW.provider_content_expired_at_utc IS NOT NULL
       AND NEW.flight_number IS NULL AND NEW.carrier_iata IS NULL AND NEW.carrier_icao IS NULL AND NEW.call_sign IS NULL
       AND NEW.dep_airport_icao IS NULL AND NEW.dep_airport_iata IS NULL
       AND NEW.arr_airport_icao IS NULL AND NEW.arr_airport_iata IS NULL
       AND NEW.dep_scheduled_utc IS NULL AND NEW.arr_scheduled_utc IS NULL
       AND NEW.provider_record_key IS NULL AND NEW.raw_payload_sha256 IS NULL AND NEW.coverage_state IS NULL
       AND NEW.population_query_id IS NULL AND NEW.from_local IS NULL AND NEW.to_local IS NULL
       AND NEW.airport_iana_timezone IS NULL AND NEW.scope_classification IS NULL
       AND NEW.codeshare_resolution_status IS NULL AND NEW.fids_retrieval_utc IS NULL
       AND NEW.available_at IS NULL AND NEW.response_hash IS NULL
       AND NEW.canonical_flight_instance_id IS NULL AND NEW.analytic_identity_id IS NULL
       AND NEW.provider_api_version IS NULL
       AND (to_jsonb(NEW) - ARRAY[
         'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
         'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
         'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
         'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
         'canonical_flight_instance_id','analytic_identity_id','provider_api_version','provider_content_expired_at_utc'
       ]) = (to_jsonb(OLD) - ARRAY[
         'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
         'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
         'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
         'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
         'canonical_flight_instance_id','analytic_identity_id','provider_api_version','provider_content_expired_at_utc'
       ])
       AND EXISTS (
         SELECT 1 FROM clean.retention_tombstone t
          WHERE t.surface='primary'
            AND t.record_id='flight_population:' || OLD.id::text || ':fids_provider_scope_v1'
       )
    THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'FIDS observations are append-only except audited provider-content expiry';
END $$;

-- The existing retention owner first tombstones and expires raw_payload. This
-- AFTER trigger then performs normalized FIDS expiry atomically in that same
-- transaction. If the parent tombstone is absent, child tombstones are absent
-- and the flight_population guard rejects the UPDATE, failing closed.
CREATE OR REPLACE FUNCTION clean.expire_fids_population_from_response()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO clean.retention_tombstone
    (surface,record_id,content_hash,expired_at,plan_hash,content_class,source_table,
     content_columns,retention_rule,expiry_run_id,deletion_mode)
  SELECT 'primary',
         'flight_population:' || p.id::text || ':fids_provider_scope_v1',
         parent.content_hash,
         parent.expired_at,
         parent.plan_hash,
         'fids_population_normalized',
         'clean.flight_population',
         ARRAY[
           'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
           'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
           'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
           'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
           'canonical_flight_instance_id','analytic_identity_id','provider_api_version'
         ]::text[],
         parent.retention_rule,
         parent.expiry_run_id,
         'content-nullification'
    FROM clean.flight_population p
    JOIN clean.retention_tombstone parent
      ON parent.surface='primary'
     AND parent.record_id='fids_query_response:' || OLD.population_query_id::text || ':raw_payload'
   WHERE p.population_query_id = OLD.population_query_id
     AND p.source_type='fids'
     AND p.provider_content_expired_at_utc IS NULL
  ON CONFLICT (surface,record_id) DO NOTHING;

  UPDATE clean.flight_population
     SET flight_number=NULL,
         carrier_iata=NULL,
         carrier_icao=NULL,
         call_sign=NULL,
         dep_airport_icao=NULL,
         dep_airport_iata=NULL,
         arr_airport_icao=NULL,
         arr_airport_iata=NULL,
         dep_scheduled_utc=NULL,
         arr_scheduled_utc=NULL,
         provider_record_key=NULL,
         raw_payload_sha256=NULL,
         coverage_state=NULL,
         population_query_id=NULL,
         from_local=NULL,
         to_local=NULL,
         airport_iana_timezone=NULL,
         scope_classification=NULL,
         codeshare_resolution_status=NULL,
         fids_retrieval_utc=NULL,
         available_at=NULL,
         response_hash=NULL,
         canonical_flight_instance_id=NULL,
         analytic_identity_id=NULL,
         provider_api_version=NULL,
         provider_content_expired_at_utc=NEW.raw_expired_at_utc
   WHERE population_query_id = OLD.population_query_id
     AND source_type='fids'
     AND provider_content_expired_at_utc IS NULL;

  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_fids_response_expire_population ON clean.fids_query_response;
CREATE TRIGGER trg_fids_response_expire_population
  AFTER UPDATE OF raw_expired_at_utc ON clean.fids_query_response
  FOR EACH ROW
  WHEN (OLD.raw_expired_at_utc IS NULL AND NEW.raw_expired_at_utc IS NOT NULL)
  EXECUTE FUNCTION clean.expire_fids_population_from_response();

COMMIT;
