-- 0037_phase6_sampling_decision_state.sql
-- V3.9-f.8 §§8.2-8.6: frozen slot→region calendar, pair replay,
-- versioned REGIONAL adaptive state, and draw provenance.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.adb_phase6_calendar_day (
  run_day_index INTEGER PRIMARY KEY CHECK (run_day_index BETWEEN 1 AND 31),
  budget_day_id TEXT NOT NULL UNIQUE,
  calendar_hash TEXT NOT NULL CHECK (calendar_hash ~ '^[0-9a-f]{64}$'),
  config_hash TEXT NOT NULL CHECK (config_hash ~ '^[0-9a-f]{64}$'),
  date_utc DATE NOT NULL,
  utc_slot TEXT NOT NULL,
  time_class TEXT NOT NULL,
  window_shape TEXT NOT NULL CHECK (window_shape IN ('4h','2x2h','up-to-6h')),
  evaluation_partition TEXT NOT NULL,
  crossover_group_id TEXT,
  crossover_period INTEGER CHECK (crossover_period IN (1,2)),
  pair_role TEXT CHECK (pair_role IN ('control','alternative')),
  draw_type TEXT NOT NULL CHECK (draw_type IN ('NEW_TEMPLATE','PAIR_REPLAY')),
  slot_regions JSONB NOT NULL,
  anchor_icao TEXT NOT NULL,
  pair_airport_set JSONB,
  frozen_draw_seed TEXT NOT NULL,
  frozen_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (slot_regions ?& ARRAY['HUB','MID_A','MID_B','REGIONAL']),
  CHECK ((crossover_group_id IS NULL AND pair_airport_set IS NULL)
      OR (crossover_group_id IS NOT NULL AND pair_airport_set IS NOT NULL)),
  CHECK ((draw_type='PAIR_REPLAY') = (crossover_period=2))
);

CREATE TABLE IF NOT EXISTS clean.adb_airport_sampling_state (
  icao TEXT PRIMARY KEY,
  ema_yield DOUBLE PRECISION,
  m_i DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (m_i BETWEEN 0.25 AND 1.5),
  zero_yield_state TEXT NOT NULL DEFAULT 'normal'
    CHECK (zero_yield_state IN ('normal','zero_yield_once','zero_yield_repeated','zero_yield_persistent')),
  consecutive_zero_yield INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_zero_yield >= 0),
  first_zero_yield_date DATE,
  last_successful_phase6_observation_at TIMESTAMPTZ,
  last_direct_observation_at TIMESTAMPTZ,
  last_selected_at TIMESTAMPTZ,
  last_selected_run_day INTEGER,
  provider_failure BOOLEAN NOT NULL DEFAULT false,
  coverage_failed BOOLEAN NOT NULL DEFAULT false,
  state_version INTEGER NOT NULL DEFAULT 0 CHECK (state_version >= 0),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clean.adb_sampling_draw (
  draw_id BIGSERIAL PRIMARY KEY,
  run_day_index INTEGER NOT NULL REFERENCES clean.adb_phase6_calendar_day(run_day_index),
  slot_id TEXT NOT NULL CHECK (slot_id IN ('HUB','MID_A','MID_B','REGIONAL')),
  target_region TEXT NOT NULL,
  draw_type TEXT NOT NULL CHECK (draw_type IN ('NEW_TEMPLATE','PAIR_REPLAY')),
  selected_icao TEXT NOT NULL,
  frozen_draw_seed TEXT NOT NULL,
  adaptive_state_hash TEXT,
  probability_vector JSONB,
  airport_layer_design_probability DOUBLE PRECISION,
  selected_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_day_index, slot_id),
  CHECK ((slot_id='REGIONAL' AND airport_layer_design_probability IS NOT NULL)
      OR (slot_id<>'REGIONAL' AND airport_layer_design_probability IS NULL)),
  CHECK (airport_layer_design_probability IS NULL OR
         (airport_layer_design_probability > 0 AND airport_layer_design_probability <= 1))
);

CREATE TABLE IF NOT EXISTS clean.adb_adaptive_state_history (
  history_id BIGSERIAL PRIMARY KEY,
  icao TEXT NOT NULL,
  state_version INTEGER NOT NULL,
  observation_class TEXT NOT NULL,
  observation_date DATE,
  yield_score DOUBLE PRECISION,
  ema_before DOUBLE PRECISION,
  ema_after DOUBLE PRECISION,
  m_i_before DOUBLE PRECISION NOT NULL,
  m_i_after DOUBLE PRECISION NOT NULL,
  zero_state_before TEXT NOT NULL,
  zero_state_after TEXT NOT NULL,
  state_hash TEXT NOT NULL CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (icao, state_version)
);

CREATE INDEX IF NOT EXISTS idx_sampling_state_last_direct
  ON clean.adb_airport_sampling_state(last_direct_observation_at);
CREATE INDEX IF NOT EXISTS idx_sampling_draw_selected
  ON clean.adb_sampling_draw(selected_icao, run_day_index);
CREATE INDEX IF NOT EXISTS idx_adaptive_history_icao_version
  ON clean.adb_adaptive_state_history(icao, state_version);

COMMIT;
