-- 0045_incident_stop_persistence_cause.sql
-- V3.9-f.8 prepaid incident response distinguishes raw-ingress persistence
-- from later semantic/identity persistence while retaining one persistent stop.
BEGIN;

ALTER TABLE clean.adb_incident_stop
  DROP CONSTRAINT IF EXISTS adb_incident_stop_cause_check;
ALTER TABLE clean.adb_incident_stop
  DROP CONSTRAINT IF EXISTS adb_incident_stop_cause_check_v2;
ALTER TABLE clean.adb_incident_stop
  ADD CONSTRAINT adb_incident_stop_cause_check_v2
  CHECK (cause IN ('authentication','raw-persistence','persistence','reconciliation','deletion'));

COMMIT;
