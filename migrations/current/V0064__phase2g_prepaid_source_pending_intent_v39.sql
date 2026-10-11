-- V0064: metadata-only LOGGED original-source PENDING intent, draft.
-- DO NOT apply to paid/production without separate migration approval.
-- No provider payload, credentials, identity, or subscription secret.
-- A PENDING row is NEVER evidence that the original blob was received.
CREATE TABLE clean.phase2g_prepaid_source_intent_v39 (
  session_id UUID NOT NULL,
  delivery_id TEXT NOT NULL
    CHECK (length(delivery_id) BETWEEN 1 AND 256),
  source_sha256 TEXT NOT NULL
    CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_bytes INTEGER NOT NULL CHECK (source_bytes BETWEEN 1 AND 2097152),
  blob_ref_id UUID NOT NULL UNIQUE,
  object_name TEXT NOT NULL UNIQUE,
  first_node_received_utc TIMESTAMPTZ NOT NULL,
  source_retention_until TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING','VERIFIED')),
  verified_at_utc TIMESTAMPTZ,
  PRIMARY KEY(session_id,delivery_id),
  CONSTRAINT p2g_source_intent_exact_object_name CHECK (
    object_name = 'v39/provider/raw_provider_content/'
      || left(blob_ref_id::text,2) || '/'
      || blob_ref_id::text || '.blob'
  ),
  CONSTRAINT p2g_source_intent_exact_retention CHECK (
    source_retention_until = first_node_received_utc
      + interval '168 hours'
  ),
  CONSTRAINT p2g_source_intent_state_shape CHECK (
    (state='PENDING' AND verified_at_utc IS NULL)
    OR
    (state='VERIFIED' AND verified_at_utc IS NOT NULL)
  )
);
CREATE INDEX idx_p2g_prepaid_source_intent_retention_v39
  ON clean.phase2g_prepaid_source_intent_v39
  (source_retention_until,session_id,delivery_id);

CREATE FUNCTION clean.guard_p2g_prepaid_source_intent_v39()
RETURNS trigger LANGUAGE plpgsql AS $p2g$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'P2G source-intent deletion forbidden; retained original cleanup requires separate approved protocol';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'PENDING' OR NEW.verified_at_utc IS NOT NULL THEN
      RAISE EXCEPTION 'P2G original source intent must begin unverified';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.session_id,NEW.delivery_id,NEW.source_sha256,
         NEW.source_bytes,NEW.blob_ref_id,NEW.object_name,
         NEW.first_node_received_utc,NEW.source_retention_until)
     IS DISTINCT FROM
     ROW(OLD.session_id,OLD.delivery_id,OLD.source_sha256,
         OLD.source_bytes,OLD.blob_ref_id,OLD.object_name,
         OLD.first_node_received_utc,OLD.source_retention_until) THEN
    RAISE EXCEPTION 'P2G original source intent identity/retention immutable';
  END IF;
  IF OLD.state='PENDING' AND NEW.state='VERIFIED'
    AND OLD.verified_at_utc IS NULL
    AND NEW.verified_at_utc IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'P2G original source intent only permits PENDING to VERIFIED once';
END
$p2g$;
CREATE TRIGGER trg_p2g_prepaid_source_intent_v39
BEFORE INSERT OR UPDATE OR DELETE
ON clean.phase2g_prepaid_source_intent_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_p2g_prepaid_source_intent_v39();
