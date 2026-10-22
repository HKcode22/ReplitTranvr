-- STAGED, UNAPPLIED. REQUIRES EXPLICIT DB OWNER REVIEW/AUTHORIZATION.
-- Gate4 one-time provider-assigned ID custody binding. This table is NOT
-- populated from callback POST or provider ID guesses. Admission requires:
-- independently reviewed CREATE response, signed exact-id STOP ticket,
-- externally protected custody anchor and strict account inventory.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.gate4_alert_owned_binding_v39 (
  scope_id uuid PRIMARY KEY,
  authorization_sha256 varchar(64) NOT NULL,
  source_commit varchar(40) NOT NULL,
  airport_icao varchar(4) NOT NULL,
  subscription_id varchar(128) NOT NULL UNIQUE,
  reviewed_create_receipt_sha256 varchar(64) NOT NULL,
  signed_stop_ticket_sha256 varchar(64) NOT NULL,
  bound_at_utc timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gate4_owner_auth_sha CHECK (
    authorization_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT gate4_owner_source_sha CHECK (
    source_commit ~ '^[a-f0-9]{40}$'),
  CONSTRAINT gate4_owner_airport CHECK (
    airport_icao ~ '^[A-Z]{4}$'),
  CONSTRAINT gate4_owner_sub_id CHECK (
    subscription_id ~ '^[A-Za-z0-9_-]{6,128}$'),
  CONSTRAINT gate4_owner_create_sha CHECK (
    reviewed_create_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT gate4_owner_stop_sha CHECK (
    signed_stop_ticket_sha256 ~ '^[a-f0-9]{64}$')
);
-- Grant only to a separately reviewed, owner-bound operator role. General
-- Alert receiver's prebinding DB role MUST NOT receive INSERT/UPDATE/DELETE.
-- No CREATE-authorizing or Phase6 functions are installed by this migration.
REVOKE ALL ON clean.gate4_alert_owned_binding_v39 FROM PUBLIC;

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
      'REVOKE ALL PRIVILEGES ON TABLE clean.gate4_alert_owned_binding_v39 FROM %I',
      existing_role.rolname
    );
  END LOOP;
END $gate4$;
COMMIT;
