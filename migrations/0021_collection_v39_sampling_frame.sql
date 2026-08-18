-- ============================================================
-- MIGRATION 0021: V3.9 measured sampling frame (DB-backed, §6)
-- Schema: clean
--
-- The plan §6 says the frame comes from the MEASURED universe, not the
-- static 276 catalog ("Sampling frame v2: from '276 hard-coded' to
-- 'measured universe'"; "build the frame from that universe, not from a
-- static 276 list"; "regenerate adbAirportCatalog_v3.ts data (or a
-- DB-backed frame)"). We chose the DB-backed frame.
--
-- build-catalog (scripts/build_stratified_catalog.ts) writes this table
-- from the measured AeroDataBox universe. The collector's candidate
-- selection reads from HERE, not from the 276 catalog — so the measured
-- frame is what actually drives collection.
--
-- Columns:
--   icao           airport ICAO (PK)
--   tier           HUB | MID | REGIONAL
--   tier_source    'curated' (in our 276, human-classified) or
--                  'unclassified' (universe-only; provisional REGIONAL
--                  with traffic_prior=1.0 per §8, never a measured
--                  traffic class until probe/reference data refines it)
--   traffic_prior  §8 REGIONAL prior (starts at 1.0 for unclassified)
--   region         macro-region (North America, Europe, Asia-Pacific,
--                  Gulf/Africa, South America, Oceania)
--   feed_schedule  airport present in the FlightSchedules feed (PRE layer)
--   feed_live      present in FlightLiveUpdates feed (POST layer)
--   feed_adsb      present in AdsbUpdates feed (POST layer)
--   pre_eligible   has schedule feed  (PRE model needs FIDS/schedule)
--   post_eligible  has live OR adsb feed (POST model needs live/ADS-B)
--   in_frame       true while the airport is eligible (only coverage-
--                  failed airports leave; zero-yield airports STAY)
--   built_at       when the frame was last written
--
-- Idempotent, additive — safe to re-run every boot.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS clean.adb_sampling_frame (
  icao           TEXT PRIMARY KEY,
  tier           TEXT NOT NULL CHECK (tier IN ('HUB', 'MID', 'REGIONAL')),
  tier_source    TEXT NOT NULL CHECK (tier_source IN ('curated', 'unclassified')),
  traffic_prior  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  region         TEXT NOT NULL,
  feed_schedule  BOOLEAN NOT NULL DEFAULT false,
  feed_live      BOOLEAN NOT NULL DEFAULT false,
  feed_adsb      BOOLEAN NOT NULL DEFAULT false,
  pre_eligible   BOOLEAN NOT NULL DEFAULT false,
  post_eligible  BOOLEAN NOT NULL DEFAULT false,
  in_frame       BOOLEAN NOT NULL DEFAULT true,
  built_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adb_sampling_frame_tier
  ON clean.adb_sampling_frame (tier, in_frame);
CREATE INDEX IF NOT EXISTS idx_adb_sampling_frame_region
  ON clean.adb_sampling_frame (region, in_frame);

COMMIT;
