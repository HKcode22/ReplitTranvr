-- 0061_phase2g_physical_flight_metrics_v2.sql
--
-- Forward-only Phase-2G metric-contract version bump after live MMUN P2G13
-- exposed a prepaid identity-parity defect: an exact repeated scheduled leg
-- could be quarantined when a later callback added callsign/aircraft
-- enrichment. Historical v1 evidence remains immutable; new corrected probes
-- write v2 and promotion logic only accepts the current contract constant.

BEGIN;

ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_metric_contract_check;

ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_metric_contract_check
  CHECK (
    metric_contract_version IS NULL
    OR metric_contract_version IN (
      'v39-physical-flight-instance-v1',
      'v39-physical-flight-instance-v2'
    )
  ) NOT VALID;

COMMIT;
