-- V0067 DRAFT ONLY: paired with staged V0066. DO NOT install in production.
-- This grants function-only access to NONLOGIN, non-inherited group roles,
-- but intentionally assigns no individual LOGIN credential/membership.
-- Must run with V0066 inside one reviewed privileged transaction.
-- PostgreSQL roles are cluster-scoped; disposable CI transaction ROLLBACKs.
CREATE ROLE gate05_fids_dispatch_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gate05_fids_safety_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gate05_fids_commission_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT USAGE ON SCHEMA clean TO
  gate05_fids_dispatch_v39,gate05_fids_safety_v39;
-- The commissioner is deliberately INERT: no table and function grant.
-- It cannot mint or activate a pilot until a separately reviewed
-- authenticated artifact loader and privilege boundary are implemented.

GRANT EXECUTE ON FUNCTION clean.reserve_gate05_fids_attempt_v39(
  uuid,uuid,text,text,text,text,text,text,integer,integer
) TO gate05_fids_dispatch_v39;
GRANT EXECUTE ON FUNCTION clean.stop_gate05_fids_pilot_v39(uuid,text)
  TO gate05_fids_safety_v39;

-- No direct table privileges, no CREATE/ALTER in clean, no memberships.
-- Do not GRANT these group roles to the existing broad app DB account.
-- Real deployment must use independently issued scoped LOGIN identities.
