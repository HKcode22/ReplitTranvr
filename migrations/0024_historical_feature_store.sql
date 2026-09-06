-- ============================================================
-- MIGRATION 0024: Historical as-of feature store (V3.9 §12.2, Sep1_1 §26)
-- Schema: clean
--
-- One row per (entity_type, entity_id, feature_name, valid_from) with
-- feature_value, source, source_timestamp, information_available_timestamp.
--
-- Snapshot at T fetches max(valid_from) WHERE available_at ≤ T — never
-- future computation. Append-only: rows are never updated or deleted.
--
-- Bootstrap: weather archive backfill + provider FIDS history + pre-run collection.
-- history_ready_at = max(bootstrap_end, earliest_snapshot_cutoff - lookback).
--
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Historical feature store — bitemporal as-of lookup (§12.2.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.historical_feature_store (
  id BIGSERIAL PRIMARY KEY,

  -- Entity identification
  entity_type TEXT NOT NULL,          -- 'airport' | 'route' | 'carrier_airport' | 'tail' | 'od' | 'weather'
  entity_id TEXT NOT NULL,            -- e.g. airport ICAO, carrier+airport, tail reg
  feature_name TEXT NOT NULL,         -- e.g. 'otp_15m_rate', 'avg_delay_minutes', 'weather_metar_visibility'

  -- Feature value
  feature_value DOUBLE PRECISION,     -- nullable: missing features stay NULL, never 0
  feature_text TEXT,                  -- optional text-valued features

  -- Provenance
  source TEXT NOT NULL,               -- e.g. 'metar', 'fids_history', 'otp_archive'
  source_version TEXT,                -- e.g. 'v3.9', 'era5_v1'
  source_timestamp TIMESTAMPTZ,      -- when the source observed/recorded this value

  -- Bitemporal timestamps (§12.2.1)
  information_available_at TIMESTAMPTZ NOT NULL,  -- when our system could first build features from this source (ETL lag)
  valid_from TIMESTAMPTZ NOT NULL,                 -- when this feature value became true in the world
  valid_to TIMESTAMPTZ,                            -- when this feature value stopped being true (NULL = still valid)

  -- Metadata
  batch_id TEXT,                      -- which collection batch produced this
  payload_sha256 TEXT,               -- raw payload hash for provenance
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT hfs_entity_check CHECK (entity_type IN ('airport', 'route', 'carrier_airport', 'tail', 'od', 'weather')),
  CONSTRAINT hfs_valid_time_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT hfs_availability_check CHECK (information_available_at <= valid_from OR information_available_at IS NOT NULL)
);

-- Primary query pattern: as-of lookup
-- SELECT * FROM clean.historical_feature_store
-- WHERE entity_type = $1 AND entity_id = $2 AND feature_name = $3
--   AND information_available_at <= $4  -- cutoff
--   AND valid_from <= $4               -- feature was valid at cutoff
--   AND (valid_to IS NULL OR valid_to > $4)  -- feature hadn't expired
-- ORDER BY valid_from DESC LIMIT 1;

CREATE INDEX IF NOT EXISTS idx_hfs_lookup
  ON clean.historical_feature_store (entity_type, entity_id, feature_name, information_available_at, valid_from DESC);

CREATE INDEX IF NOT EXISTS idx_hfs_validity
  ON clean.historical_feature_store (entity_type, entity_id, valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_hfs_source
  ON clean.historical_feature_store (source, created_at);

-- Unique constraint: one feature value per entity per valid_from period
CREATE UNIQUE INDEX IF NOT EXISTS idx_hfs_unique_entity_feature
  ON clean.historical_feature_store (entity_type, entity_id, feature_name, valid_from);

-- ---------------------------------------------------------------------------
-- History readiness tracking (§12.2)
-- Records when the historical store has sufficient data for a given entity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clean.historical_readiness (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  history_ready_at TIMESTAMPTZ NOT NULL,  -- earliest cutoff where features are available
  bootstrap_end TIMESTAMPTZ,              -- when bootstrap backfill completed
  earliest_snapshot_cutoff TIMESTAMPTZ,   -- earliest snapshot that will query this entity
  lookback_days INTEGER DEFAULT 7,        -- how many days of history needed
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT hr_entity_unique UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_readiness
  ON clean.historical_readiness (entity_type, entity_id, history_ready_at);

COMMIT;
