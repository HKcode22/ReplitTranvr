-- Disposable/review-only SQL. NOT a production migration or a grant.
-- Separate durable output from phase6_private temporary source custody.
BEGIN;
CREATE SCHEMA phase7_private;
REVOKE ALL ON SCHEMA phase7_private FROM PUBLIC;
CREATE TABLE phase7_private.derived_release_bundle_v39 (
 packet_id uuid PRIMARY KEY,
 bundle_sha256 text NOT NULL UNIQUE CHECK (bundle_sha256 ~ '^[0-9a-f]{64}$'),
 approval_sha256 text NOT NULL CHECK (approval_sha256 ~ '^[0-9a-f]{64}$'),
 row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 100000),
 research_expiry_utc timestamptz NOT NULL,
 payload_bytes bytea NOT NULL CHECK (octet_length(payload_bytes) BETWEEN 1 AND 33554432),
 created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (research_expiry_utc>created_at_utc),
 CHECK (encode(sha256(payload_bytes),'hex')=bundle_sha256),
 CHECK (jsonb_typeof(convert_from(payload_bytes,'UTF8')::jsonb)='object'),
 CHECK (convert_from(payload_bytes,'UTF8')::jsonb ?& ARRAY['schema','packet','paired','continuous']),
 CHECK (convert_from(payload_bytes,'UTF8')::jsonb - ARRAY['schema','packet','paired','continuous']='{}'::jsonb),
 CHECK (convert_from(payload_bytes,'UTF8')::jsonb->>'schema'='v39.phase7.durable-derived-bundle.v1'),
 CHECK (convert_from(payload_bytes,'UTF8')::jsonb->'packet'->>'packetId'=packet_id::text)
);
REVOKE ALL ON TABLE phase7_private.derived_release_bundle_v39 FROM PUBLIC;
COMMIT;
