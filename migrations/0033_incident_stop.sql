-- 0033_incident_stop.sql
-- gptP0analyze4 #9 (0K safety): provider DELETE / persistence / reconciliation
-- failures trigger a persistent incident-stop that admission consults before
-- any new paid work starts. Additive + idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.adb_incident_stop (
  id BIGSERIAL PRIMARY KEY,
  cause TEXT NOT NULL CHECK (cause IN ('authentication','raw-persistence','reconciliation','deletion')),
  occurred_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  detail JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at_utc TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_adb_incident_stop_open
  ON clean.adb_incident_stop (resolved, occurred_at_utc DESC);

COMMIT;