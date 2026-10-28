-- V0075 (STAGED, not application boot): small LOGGED metadata-only
-- Gate05 scientific callback custody journal. Requires reviewed V0074.
--
-- Motivation: B0062 prepaid_probe_delivery_runtime and item_runtime are
-- UNLOGGED; their loss after postmaster restart previously prevented even
-- authentic notification counts from being reconstructed.
--
-- NO flight numbers, tail numbers, positions, status, provider body, provider
-- credential, or human identity in this table. We keep source identifiers,
-- hashes, item counts and source clocks only. This is NOT proof that HTTP 2xx
-- actually reached the upstream sender; it proves DB COMMIT is eligible for
-- the receiver's subsequent ACK path. No trigger touches prior cohorts.
--
-- No blanket GRANT, no ALTER old schema, no provider mutation and no retention extension.
-- One narrowly scoped INSERT grant to the exact live runtime role is applied
-- separately by the verified one-use release installer AFTER the DDL succeeds.
CREATE TABLE clean.gate05_science_delivery_custody_v39 (
  session_id UUID NOT NULL
    REFERENCES clean.phase3_gate05_science_owner_v39(session_id),
  delivery_id TEXT NOT NULL CHECK (delivery_id ~ '^ppd_[0-9a-f]{64}$'),
  blob_ref_id UUID NOT NULL
    REFERENCES clean.provider_content_blob_ref(blob_ref_id),
  body_sha256 TEXT NOT NULL CHECK(body_sha256 ~ '^[0-9a-f]{64}$'),
  item_count INTEGER NOT NULL CHECK(item_count >= 0 AND item_count <= 5000),
  receiver_attempt_at_utc TIMESTAMPTZ NOT NULL,
  blob_persisted_at_utc TIMESTAMPTZ NOT NULL,
  raw_before_db_commit_verified BOOLEAN NOT NULL DEFAULT TRUE
    CHECK (raw_before_db_commit_verified IS TRUE),
  http_2xx_delivery_verified BOOLEAN NOT NULL DEFAULT FALSE
    CHECK (http_2xx_delivery_verified IS FALSE),
  committed_at_utc TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(session_id,delivery_id),
  UNIQUE(blob_ref_id),
  CONSTRAINT gate05_custody_clock_order_v39
    -- Distributed receiver/Neon clocks may differ slightly. No clock
    -- equivalence or certified HTTP-ACK claim is inferred from this bound.
    CHECK(blob_persisted_at_utc <= committed_at_utc + INTERVAL '3 minutes'),
  CONSTRAINT gate05_custody_receiver_clock_v39
    CHECK(receiver_attempt_at_utc <= committed_at_utc + INTERVAL '3 minutes')
);
COMMENT ON TABLE clean.gate05_science_delivery_custody_v39 IS
 'LOGGED metadata-only custody ledger, atomic with source-ref and prepaid rows; survives UNLOGGED restart; no flight identity and NO HTTP2xx proof';
REVOKE ALL ON TABLE clean.gate05_science_delivery_custody_v39 FROM PUBLIC;

CREATE FUNCTION clean.guard_gate05_delivery_custody_v39()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,clean AS $gate05_custody$
DECLARE ref_record RECORD;
DECLARE owner_record RECORD;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION 'GATE05_CUSTODY_IMMUTABLE';
  END IF;
  SELECT state,session_expires_at_utc INTO owner_record
    FROM clean.phase3_gate05_science_owner_v39
   WHERE session_id=NEW.session_id;
  IF NOT FOUND OR (owner_record.state NOT IN ('PREPARED','ACTIVE','STOPPED') OR
        clock_timestamp()>owner_record.session_expires_at_utc) THEN
    RAISE EXCEPTION 'GATE05_CUSTODY_EXACT_OPEN_OWNER_REQUIRED';
  END IF;
  SELECT source_kind,source_record_id,content_class,storage_kind,
         content_sha256,persisted_at_utc
    INTO ref_record
    FROM clean.provider_content_blob_ref
   WHERE blob_ref_id=NEW.blob_ref_id;
  IF NOT FOUND OR ref_record.source_kind<>'webhook'
    OR ref_record.content_class<>'raw_provider_content'
    OR ref_record.storage_kind<>'replit_app_storage'
    OR ref_record.source_record_id<>
      'prepaid:'||NEW.session_id::text||':'||NEW.delivery_id
    OR ref_record.content_sha256<>NEW.body_sha256
    OR ref_record.persisted_at_utc<>NEW.blob_persisted_at_utc
  THEN
    RAISE EXCEPTION 'GATE05_CUSTODY_SOURCE_REF_MISMATCH';
  END IF;
  RETURN NEW;
END
$gate05_custody$;

CREATE TRIGGER gate05_delivery_custody_immutable_v39
BEFORE INSERT OR UPDATE OR DELETE
ON clean.gate05_science_delivery_custody_v39
FOR EACH ROW EXECUTE FUNCTION clean.guard_gate05_delivery_custody_v39();

-- Trigger checks reference the owner/source-ref under the reviewed DDL owner,
-- not under the low-privilege callback role. Revoke direct execution; the
-- callback can INSERT into its exact guarded custody table only.
REVOKE ALL ON FUNCTION clean.guard_gate05_delivery_custody_v39() FROM PUBLIC;
