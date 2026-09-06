-- ============================================================
-- MIGRATION 0025: Raw ingress immutability layers (V3.9 §15-16, Sep1_1 §15-16)
-- Schema: clean
--
-- Five conceptual layers (§15):
--   1. raw_delivery        — HTTP delivery envelope (immutable after persist)
--   2. raw_delivery_item   — individual flight items from a delivery
--   3. processing_attempt  — parsing/validation outcomes per item
--   4. flight_events       — semantic event log (already exists, 0019)
--   5. flight_state        — current state (already exists, 0010)
--
-- Key rule (§16): durable raw persistence BEFORE HTTP 2xx acknowledgement.
-- Failure-injection tests must prove that a DB failure results in HTTP 5xx
-- (which triggers a provider retry) rather than silent data loss.
--
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Layer 1: raw_delivery — HTTP delivery envelope (immutable)
-- One row per webhook HTTP delivery. Never UPDATEd or DELETEd.
-- This is the FIRST thing persisted, BEFORE the 2xx is sent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.raw_delivery (
  id BIGSERIAL PRIMARY KEY,

  -- Delivery identity
  delivery_id TEXT NOT NULL UNIQUE,    -- SHA-256(method|path|timestamp|body_hash) or provider delivery ID
  subscription_id TEXT,
  batch_id TEXT,

  -- HTTP metadata
  http_method TEXT NOT NULL DEFAULT 'POST',
  http_path TEXT,
  http_status_code INTEGER,            -- our response code (should be 200)
  http_request_headers JSONB,
  http_response_body JSONB,

  -- Raw payload
  raw_body JSONB NOT NULL,             -- the entire HTTP body
  raw_body_sha256 TEXT NOT NULL,       -- SHA-256 of raw body for dedup/provenance
  content_length INTEGER,
  content_type TEXT,

  -- Timing (§14 timestamp taxonomy)
  provider_published_utc TIMESTAMPTZ,  -- when provider generated the notification
  received_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when WE received it
  processed_at_utc TIMESTAMPTZ,        -- when we finished processing

  -- Outcome
  processing_outcome TEXT,             -- 'success' | 'partial' | 'validation_error' | 'db_error' | 'timeout'
  notification_items INTEGER DEFAULT 0, -- number of flight items in this delivery
  error_message TEXT,

  -- Provenance
  adb_delivery_id TEXT,                -- provider's delivery attempt ID
  adb_cost_credits NUMERIC,            -- provider's cost for this delivery

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rd_subscription
  ON clean.raw_delivery (subscription_id, received_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_rd_batch
  ON clean.raw_delivery (batch_id, received_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_rd_received
  ON clean.raw_delivery (received_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_rd_sha256
  ON clean.raw_delivery (raw_body_sha256);

-- ---------------------------------------------------------------------------
-- Layer 2: raw_delivery_item — individual flight items (immutable)
-- One row per flight item within a delivery. Never UPDATEd or DELETEd.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.raw_delivery_item (
  id BIGSERIAL PRIMARY KEY,

  -- Link to parent delivery
  delivery_id TEXT NOT NULL,           -- references raw_delivery.delivery_id
  item_index INTEGER NOT NULL,         -- 0-based index within the delivery's flights[]

  -- Flight identity (extracted eagerly for indexing)
  flight_number TEXT,
  carrier_iata TEXT,
  carrier_icao TEXT,
  status TEXT,
  status_code INTEGER,

  -- Raw item
  raw_item JSONB NOT NULL,             -- the individual flight object
  raw_item_sha256 TEXT NOT NULL,       -- SHA-256 of this specific item

  -- Timestamps from the item (§14)
  last_updated_utc TIMESTAMPTZ,        -- provider's lastUpdatedUtc
  departure_scheduled_utc TIMESTAMPTZ,
  arrival_scheduled_utc TIMESTAMPTZ,

  -- Outcome
  parsing_outcome TEXT,                -- 'success' | 'partial' | 'skipped_no_number' | 'skipped_cargo' | 'skipped_private'
  canonical_flight_instance_id TEXT,   -- deduped canonical ID (if parsed successfully)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rdi_delivery_item_unique UNIQUE (delivery_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_rdi_flight
  ON clean.raw_delivery_item (flight_number, carrier_iata, last_updated_utc);
CREATE INDEX IF NOT EXISTS idx_rdi_canonical
  ON clean.raw_delivery_item (canonical_flight_instance_id);
CREATE INDEX IF NOT EXISTS idx_rdi_delivery
  ON clean.raw_delivery_item (delivery_id);

-- ---------------------------------------------------------------------------
-- Layer 3: processing_attempt — parsing/validation outcomes (immutable)
-- One row per processing attempt on a delivery. Records what happened:
-- which parser ran, what succeeded, what failed, what was stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.processing_attempt (
  id BIGSERIAL PRIMARY KEY,

  -- Link to delivery
  delivery_id TEXT NOT NULL,           -- references raw_delivery.delivery_id

  -- Processing metadata
  attempt_index INTEGER NOT NULL DEFAULT 1,  -- 1-based: first attempt, retry, etc.
  parser_version TEXT NOT NULL,        -- e.g. 'v3.9-f.8'
  schema_version TEXT,                 -- e.g. 'flightNotificationContractSchema v1'

  -- Outcome
  outcome TEXT NOT NULL,               -- 'success' | 'partial' | 'failed'
  items_received INTEGER DEFAULT 0,
  items_parsed INTEGER DEFAULT 0,
  items_stored INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Error details
  validation_errors JSONB,            -- array of zod validation issues
  parse_errors JSONB,                 -- array of per-item parse errors
  storage_errors JSONB,               -- array of DB write errors
  error_message TEXT,

  -- Timing
  started_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at_utc TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Resulting state
  upsert_result JSONB,                -- { stored, inserted, updated } from upsertFlightNotifications
  research_events_appended BOOLEAN DEFAULT false,
  ingest_event_written BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_delivery
  ON clean.processing_attempt (delivery_id, attempt_index);
CREATE INDEX IF NOT EXISTS idx_pa_outcome
  ON clean.processing_attempt (outcome, started_at_utc DESC);

-- ---------------------------------------------------------------------------
-- Durable raw persistence rule (§16):
-- The webhook handler MUST insert into raw_delivery BEFORE sending 2xx.
-- If the DB insert fails, the handler MUST return 5xx (triggering a provider retry).
-- This guarantees no silent data loss.
--
-- Implementation note: the webhook ingress in routes_v3.ts must be updated to:
--   1. INSERT INTO raw_delivery (raw_body, raw_body_sha256, ...)
--   2. THEN send 200 response
--   3. THEN process items asynchronously (extract, upsert, research events)
-- ---------------------------------------------------------------------------

COMMIT;
