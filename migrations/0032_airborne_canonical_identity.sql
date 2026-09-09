-- 0032_airborne_canonical_identity.sql
-- gptP0analyze4 #8 (0G): airborne/live-location points are keyed by canonical
-- flight_instance_id, never by flight/carrier/time alone, so same-number,
-- codeshare, multi-leg and retime cases cannot merge distinct physical flights.
-- Additive + idempotent; backfills existing rows to NULL (unknown).
BEGIN;

ALTER TABLE clean.flight_events
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT;

ALTER TABLE clean.raw_airborne_events
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT;

CREATE INDEX IF NOT EXISTS idx_flight_events_canonical_instance
  ON clean.flight_events (flight_instance_id);

CREATE INDEX IF NOT EXISTS idx_raw_airborne_canonical_instance
  ON clean.raw_airborne_events (flight_instance_id);

-- 0G: canonical identity through the whole airborne chain (clean points,
-- trajectory, snapshots), not just flight_key (number|carrier).
ALTER TABLE clean.clean_airborne_points
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT;

ALTER TABLE clean.flight_trajectory
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT;

ALTER TABLE clean.flight_airborne_snapshots
  ADD COLUMN IF NOT EXISTS flight_instance_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clean_airborne_canonical
  ON clean.clean_airborne_points (flight_instance_id, event_timestamp);

CREATE INDEX IF NOT EXISTS idx_flight_trajectory_canonical
  ON clean.flight_trajectory (flight_instance_id);

CREATE INDEX IF NOT EXISTS idx_airborne_snapshot_canonical
  ON clean.flight_airborne_snapshots (flight_instance_id, event_timestamp);

COMMIT;