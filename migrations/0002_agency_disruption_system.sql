-- Agency Disruption Monitoring System — additive only.
-- Idempotent: every CREATE uses IF NOT EXISTS so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "agency_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "contact_email" text NOT NULL UNIQUE,
  "contact_name" text NOT NULL,
  "password" text NOT NULL,
  "plan" text DEFAULT 'trial' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "monitored_flights" (
  "id" serial PRIMARY KEY NOT NULL,
  "agency_id" integer NOT NULL REFERENCES "agency_accounts"("id"),
  "flight_number" text NOT NULL,
  "carrier_iata" text NOT NULL,
  "departure_date" text NOT NULL,
  "departure_time" text,
  "origin_iata" text NOT NULL,
  "destination_iata" text NOT NULL,
  "traveler_name" text NOT NULL,
  "traveler_email" text NOT NULL,
  "traveler_phone" text,
  "risk_score" integer DEFAULT 0 NOT NULL,
  "risk_tier" text DEFAULT 'green' NOT NULL,
  "last_checked_at" timestamp,
  "status" text DEFAULT 'active' NOT NULL,
  "alert_sent_at" timestamp,
  "traveler_selection_token" text UNIQUE,
  "traveler_selected_option_id" text,
  "traveler_selected_at" timestamp,
  "agency_notified_at" timestamp,
  "agency_resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "monitored_flights_agency_id_idx" ON "monitored_flights" ("agency_id");
CREATE INDEX IF NOT EXISTS "monitored_flights_status_idx" ON "monitored_flights" ("status");

CREATE TABLE IF NOT EXISTS "risk_score_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "monitored_flight_id" integer NOT NULL REFERENCES "monitored_flights"("id"),
  "score" integer NOT NULL,
  "tier" text NOT NULL,
  "signals" jsonb NOT NULL,
  "scored_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "risk_score_history_flight_id_idx" ON "risk_score_history" ("monitored_flight_id");

CREATE TABLE IF NOT EXISTS "disruption_alternatives" (
  "id" serial PRIMARY KEY NOT NULL,
  "monitored_flight_id" integer NOT NULL REFERENCES "monitored_flights"("id"),
  "flight_number" text NOT NULL,
  "carrier_iata" text NOT NULL,
  "carrier_name" text,
  "departure_time" text NOT NULL,
  "arrival_time" text NOT NULL,
  "duration_minutes" integer,
  "stops" integer DEFAULT 0 NOT NULL,
  "price" text,
  "risk_score" integer NOT NULL,
  "risk_tier" text NOT NULL,
  "offer_data" jsonb,
  "selection_token" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "disruption_alternatives_flight_id_idx" ON "disruption_alternatives" ("monitored_flight_id");
