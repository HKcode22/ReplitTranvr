-- STAGED / NOT AUTO-APPLIED / NOT PRODUCTION-AUTHORIZED.
-- Gate4 exact-scoped original-wire pre-CREATE quarantine.
-- Requires separate signed deployment and restricted runtime/database review.
-- Never import this migration into current boot migrator without new approval.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.gate4_alert_prebind_original_v39 (
  scope_id uuid NOT NULL,
  original_sha256 varchar(64) NOT NULL,
  source_commit varchar(40) NOT NULL,
  authorization_sha256 varchar(64) NOT NULL,
  airport_icao varchar(4) NOT NULL,
  claimed_provider_subscription_id varchar(128) NOT NULL,
  original_wire bytea NOT NULL,
  received_at_utc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope_id,original_sha256),
  CONSTRAINT gate4_prebind_sha_shape CHECK (original_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT gate4_prebind_source_shape CHECK (source_commit ~ '^[a-f0-9]{40}$'),
  CONSTRAINT gate4_prebind_auth_shape CHECK (authorization_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT gate4_prebind_icao_shape CHECK (airport_icao ~ '^[A-Z]{4}$'),
  CONSTRAINT gate4_prebind_claim_shape CHECK (
    claimed_provider_subscription_id ~ '^[A-Za-z0-9_-]{6,128}$'
  ),
  CONSTRAINT gate4_prebind_wire_size CHECK (
    octet_length(original_wire) BETWEEN 2 AND 2097152
  )
);

-- Ownership/authenticated remote CREATE binding is deliberately NOT stored
-- in this table: these rows contain UNTRUSTED claims until externally
-- reviewed provider custody is atomically established elsewhere.
REVOKE ALL ON clean.gate4_alert_prebind_original_v39 FROM PUBLIC;

-- The existing V3.9 provisioning script grants *default* future clean-table
-- DML to travnr_v39_runtime and its recovery logins. New Gate4 custody tables
-- must not inherit that broad application access. This revokes ONLY this new
-- object, not any historical tables or long-lived runtime credentials.
DO $gate4$
DECLARE existing_role record;
BEGIN
  FOR existing_role IN
    SELECT rolname FROM pg_roles
    WHERE rolname ~ '^travnr_v39_runtime(_recovery[0-9]+)?

COMMIT;

  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE clean.gate4_alert_prebind_original_v39 FROM %I',
      existing_role.rolname
    );
  END LOOP;
END $gate4$;

COMMIT;
