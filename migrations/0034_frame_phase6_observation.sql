-- 0029_frame_phase6_observation.sql
-- Add last_successful_phase6_observation_at to adb_sampling_frame for
-- coverage boost eligibility (Plan §8.2: boost applies when the airport has
-- never had a successful qualifying Phase-6 direct observation or its last one
-- is >=20 days old). Previously the controller used built_at (frame inclusion
-- date) as a proxy, which is incorrect.
BEGIN;

ALTER TABLE clean.adb_sampling_frame
  ADD COLUMN IF NOT EXISTS last_successful_phase6_observation_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_adb_sampling_frame_last_phase6_obs
  ON clean.adb_sampling_frame (last_successful_phase6_observation_at);

COMMIT;
