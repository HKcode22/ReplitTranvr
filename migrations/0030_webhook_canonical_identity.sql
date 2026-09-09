BEGIN;

CREATE TABLE IF NOT EXISTS clean.webhook_flight_identity (
  id BIGSERIAL PRIMARY KEY,
  provider_identity_alias TEXT NOT NULL UNIQUE,
  provider_flight_id TEXT,
  flight_instance_id TEXT NOT NULL,
  operating_carrier TEXT NOT NULL,
  operating_flight_number TEXT NOT NULL,
  origin_icao TEXT NOT NULL,
  original_destination_icao TEXT NOT NULL,
  initial_service_date DATE NOT NULL,
  initial_scheduled_gate_out_utc TIMESTAMPTZ NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_flight_identity_instance
  ON clean.webhook_flight_identity (flight_instance_id);

COMMIT;
