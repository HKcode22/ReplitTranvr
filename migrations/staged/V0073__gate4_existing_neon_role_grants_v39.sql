-- STAGED / NOT AUTO-APPLIED / OWNER-CONDITIONAL GATE4.
-- Run only by independently verified production DB owner AFTER V0071/V0072
-- and AFTER separate Neon role creation with passwords kept OUT of source.
-- This grants no API/provider key, CREATE, schema DDL or Phase6 authority.
--
-- REQUIRED existing restricted LOGIN names:
--   gate4_receiver_20261022
--   gate4_safety_reader_20261022
-- Receiver may only store/read untrusted pre-CREATE originals (V0071).
-- Actions safety reader may only SELECT positive owner binding (V0072).
-- A separately reviewed *one-shot owner* commission action inserts V0072;
-- do NOT grant V0072 INSERT to public receiver or safety watcher.
BEGIN;

DO $gate4$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls
    FROM pg_roles
    WHERE rolname IN (
      'gate4_receiver_20261022',
      'gate4_safety_reader_20261022'
    )
  LOOP
    IF NOT item.rolcanlogin OR item.rolsuper OR item.rolcreaterole OR
       item.rolcreatedb OR item.rolbypassrls
    THEN
      RAISE EXCEPTION 'GATE4_ROLE_UNRESTRICTED_HOLD';
    END IF;
  END LOOP;
  IF (
    SELECT count(*) FROM pg_roles
    WHERE rolname IN (
      'gate4_receiver_20261022',
      'gate4_safety_reader_20261022'
    )
  )<>2 THEN
    RAISE EXCEPTION 'GATE4_REQUIRED_LOGIN_ROLE_MISSING';
  END IF;
END $gate4$;

GRANT CONNECT ON DATABASE neondb
 TO gate4_receiver_20261022,gate4_safety_reader_20261022;
GRANT USAGE ON SCHEMA clean
 TO gate4_receiver_20261022,gate4_safety_reader_20261022;
GRANT SELECT,INSERT ON TABLE clean.gate4_alert_prebind_original_v39
 TO gate4_receiver_20261022;
GRANT SELECT ON TABLE clean.gate4_alert_owned_binding_v39
 TO gate4_safety_reader_20261022;

-- Exact granted shape, not merely "role exists": fail transaction closed.
DO $gate4$
BEGIN
 IF NOT has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_prebind_original_v39','SELECT')
 OR NOT has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_prebind_original_v39','INSERT')
 OR has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_prebind_original_v39','UPDATE')
 OR has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_prebind_original_v39','DELETE')
 OR has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_owned_binding_v39','SELECT')
 OR has_table_privilege('gate4_receiver_20261022',
      'clean.gate4_alert_owned_binding_v39','INSERT')
 OR NOT has_table_privilege('gate4_safety_reader_20261022',
      'clean.gate4_alert_owned_binding_v39','SELECT')
 OR has_table_privilege('gate4_safety_reader_20261022',
      'clean.gate4_alert_owned_binding_v39','INSERT')
 OR has_table_privilege('gate4_safety_reader_20261022',
      'clean.gate4_alert_owned_binding_v39','UPDATE')
 OR has_table_privilege('gate4_safety_reader_20261022',
      'clean.gate4_alert_owned_binding_v39','DELETE')
 THEN RAISE EXCEPTION 'GATE4_ROLE_GRANTS_SHAPE_HOLD';
 END IF;
END $gate4$;

COMMIT;
