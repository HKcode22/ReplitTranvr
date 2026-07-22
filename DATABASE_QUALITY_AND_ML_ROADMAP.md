# Database Quality Analysis & ML Training Roadmap

> All numbers in this report are based on direct queries against the Neon database (10,775 risk scores, 796 monitored flights) and cross-validated against the Replit Helium database (8,606 scores, 746 flights). The structural and quality issues are identical in both databases since they share the same codebase.

**Date**: July 21, 2026
**Author**: Automated analysis

---

## Executive Summary

The Travnr disruption monitoring database has **systemic data quality issues that make ML training impossible without significant remediation**. Of the 16 features we would use for ML training, **6 are essentially dead** (0% or near-0% useful data), **1 is half-missing**, and only **9 have reliable coverage**. The target variable (`delayMinutes`) is 0 in 99.98% of rows due to a code bug that existed since day one. The database is split across two unconnected instances with no overlap.

This document provides the complete evidence, feature-by-feature analysis, root causes, and a phased remediation plan.

---

## Part 1: Why ML Training Has Been Failing

### Problem 1: The Target Variable (delayMinutes) is 0 in 99.98% of Rows

| Metric | Value |
|--------|-------|
| Total scores in database | 10,775 |
| Scores with delay = 0 | 10,708 (99.35%) |
| Scores with delay = NULL | 65 (0.60%) |
| Scores with delay > 0 | **2 (0.02%)** |
| Maximum delay ever recorded | 90 minutes |
| Average of positive delays | 90.0 minutes |

**Root cause**: Bug #1 in `flightStatus.ts` — the delay parser checked a JSON object field (`departure.delay`) before checking the scalar number field (`departure.delayMinutes`). JavaScript's `safeNumber()` received an object, returned 0. This existed since the first commit.

**ML impact**: You cannot train a regression model to predict delay when the training data has zero variation. A model trained on this would predict 0 for every input and be 99.98% "accurate" but completely useless.

**Evidence**: Database query against 10,775 rows:
```sql
SELECT count(*) FILTER (WHERE delay > 0) AS positive_delay FROM risk_score_history;
-- Result: 2
```

### Problem 2: Destination Weather is Missing 4 of 7 Fields in 100% of Rows

| Weather Field | Origin (present %) | Destination (present %) |
|---------------|-------------------|------------------------|
| flightCategory | ✅ 100% | ✅ 100% |
| hasThunderstorm | ✅ 100% | ✅ 100% |
| hasFreezing | ✅ 100% | ✅ 100% |
| windSpeedKt | ✅ 99.98% | ❌ **0.00%** |
| gustSpeedKt | ✅ 99.98% | ❌ **0.00%** |
| visibilityMiles | ✅ 99.98% | ❌ **0.00%** |
| ceilingFt | ✅ 99.98% | ❌ **0.00%** |

**Root cause**: Bug #3 in `monitor.ts` — the `destinationWeather` block only stored 3 fields while `originWeather` stored all 7. Fixed in the latest code but 5 weeks of historical data is corrupt.

**ML impact**: You cannot compare origin vs destination weather. Features like "visibility differential" or "crosswind at destination" are impossible to compute for 100% of historical data.

**Evidence**: 
```sql
SELECT count(*) FILTER (WHERE dest_wind IS NOT NULL) AS dest_wind_present FROM risk_score_history;
-- Result: 0
```

### Problem 3: Historical OTP (On-Time Performance) is Always Fallback — 0% Real Data

| Metric | Value |
|--------|-------|
| Scores with real API data | **0 rows (0.00%)** |
| Scores with fallback data | 5,323 rows (49.4%) |
| Scores with NULL source | 5,452 rows (50.6%) |
| Historical OTP sample size > 0 | **0 rows (0.00%)** |

**Root cause**: The AeroDataBox historical endpoint always returns HTTP 404 for every flight number queried. The system falls back to hardcoded values. The `historicalOtpRisk` is determined entirely by the horizon, not by real data:
- short horizon → risk = 2 (100% of short scores)
- medium horizon → risk = 3 (100% of medium scores)

**ML impact**: This feature has zero predictive value — it's a deterministic function of horizon, not actual historical performance. It adds noise, not signal.

**Evidence**:
```sql
-- 0 rows with real API data
SELECT count(*) FROM risk_score_history 
WHERE signals->'signals'->>'historicalOtpSource' = 'aerodatabox';
-- Result: 0

-- 100% correlation with horizon
SELECT horizon, otp_risk, count(*) FROM risk_score_history 
GROUP BY horizon, otp_risk ORDER BY horizon;
-- short → 2 (7,134 rows), medium → 3 (3,622 rows)
```

### Problem 4: Carrier Health Suffers from Feedback Loop

| Health Score | Count | Percentage |
|--------------|-------|------------|
| 1 (lowest risk) | 10,322 | 95.8% |
| 3 | 358 | 3.3% |
| 4 | 13 | 0.1% |
| 7 | 10 | 0.1% |
| 10 (highest risk) | 53 | 0.5% |
| NULL | 19 | 0.2% |

| avgDelay24h > 0 | Count |
|-----------------|-------|
| Rows with positive avgDelay24h | **12 (0.11%)** |

**Root cause**: `carrierHealth.ts` queries `risk_score_history` to compute `avgDelay24h`. Since delays were always 0 (Bug #1), the carrier health always computed healthy scores. This creates a **self-reinforcing feedback loop**:
1. flightStatus writes delay=0 → risk_score_history
2. carrierHealth reads delay=0 from risk_score_history → computes avgDelay24h=0
3. Health score stays at 1 → no risk contribution
4. Total score stays low → no flag raised
5. Go to step 1

**ML impact**: Carrier health score is almost invariant (95.8% at value 1). The model can't learn carrier-specific delay patterns because the data was never collected correctly.

### Problem 5: Extreme Feature Sparsity — The Feature Completeness Matrix

| Rank | Feature | Useful Data % | Status |
|------|---------|--------------|--------|
| 1 | historicalOtpSampleSize > 0 | **0.00%** | 🔴 DEAD |
| 2 | historicalOtp (real API data) | **0.00%** | 🔴 DEAD |
| 3 | destinationWeather fields (4 of 7) | **0.00%** | 🔴 DEAD (Bug #3) |
| 4 | delayMinutes > 0 | **0.02%** | 🔴 DEAD (Bug #1) |
| 5 | carrierHealth.avgDelay24h > 0 | **0.11%** | 🔴 DEAD (cascade from Bug #1) |
| 6 | dayOfWeekRisk (non-null) | **48.20%** | 🟡 HALF DEAD |
| 7 | flightStatus.departureTime | 99.35% | 🟢 GOOD |
| 8 | flightStatus.status (non-empty) | 99.40% | 🟢 GOOD |
| 9 | nasOrigin.hasGroundStop | 99.82% | 🟢 GOOD |
| 10 | hoursUntilDeparture | 99.82% | 🟢 GOOD |
| 11 | connectionRisk | 99.82% | 🟢 GOOD |
| 12 | carrierHealth.healthScore | 99.82% | 🟢 GOOD (but mostly invariant) |
| 13 | nasDestination.hasGroundStop | 99.82% | 🟢 GOOD |
| 14 | originWeather windSpeedKt | 99.98% | 🟢 GOOD |
| 15 | timeOfDayRisk | 100.00% | 🟢 GOOD |

**Of 16 features, only 9 have good data. 6 are completely dead.**

### Problem 6: Extreme Class Imbalance

| Tier | Count | Percentage |
|------|-------|------------|
| Green | 9,483 | 88.0% |
| Amber | 1,231 | 11.4% |
| Red | **61** | **0.6%** |

**ML impact**: A classifier that always predicts "green" would be 88% accurate while adding zero value. With only 61 "red" examples, any model will struggle to learn what causes high-risk events.

### Problem 7: Narrow Score Distribution

| Score Range | Count | Percentage | Cumulative |
|-------------|-------|------------|------------|
| 0-4 | 19 | 0.2% | 0.2% |
| 5-9 | 3,687 | 34.2% | 34.4% |
| 10-14 | 3,796 | 35.2% | 69.6% |
| 15-19 | 1,277 | 11.9% | 81.5% |
| 20-24 | 761 | 7.1% | 88.6% |
| 25-29 | 610 | 5.7% | 94.3% |
| 30-34 | 121 | 1.1% | 95.4% |
| 35-39 | 56 | 0.5% | 95.9% |
| 40-49 | 338 | 3.1% | 99.0% |
| 50-59 | 50 | 0.5% | 99.5% |
| 60+ | 60 | 0.6% | 100.0% |

**81.5% of all scores fall between 5-19** out of a possible 0-100. The scoring system produces very little variation.

### Problem 8: Three Unconnected Databases

| Database | Type | Flights | Scores | Last Activity | Purpose |
|----------|------|---------|--------|---------------|---------|
| **Neon** | Cloud (Neon) | 796 | 10,775 | June 11 | Historical — was the original DB |
| **Helium** | Replit internal | 746 | 8,606 | **Today** (July 22) | Currently active — Replit dev DB |
| **Replit Production** | Replit internal | unknown | unknown | unknown | Exists in Replit UI but no connection string |

The databases have **overlapping but different data**:
- Neon has more historical depth (May 17 → June 11)
- Helium has newer data but less history
- They cannot be queried together

### Problem 9: Only 1 Real User Flight

| Source | Count |
|--------|-------|
| Test flights (seeder-generated) | 776 (97.5%) |
| Real user flights | **20 (2.5%)** |
| Active user-monitored flights | **1** |

**ML impact**: The model would be trained almost entirely on synthetic/system-generated flights, not real user bookings. The seeder picks specific airports (6 major US hubs) at specific times, creating a biased sample.

### Problem 10: JSONB-in-JSONB Schema Mess

The `risk_score_history.signals` column stores:
```json
{
  "signals": { ... },         // ← heuristic sub-scores
  "cancelled": false,
  "flightStatus": { ... },
  "originWeather": { ... },
  "destinationWeather": { ... },
  "nasOrigin": { ... },
  "nasDestination": { ... },
  "carrierHealth": { ... }
}
```

This means:
- Every query requires JSON path traversal: `signals #>> '{flightStatus,delayMinutes}'`
- Cannot use standard SQL comparison operators
- Cannot create partial indexes on nested fields
- ML frameworks cannot read this format directly
- PostgreSQL must parse the JSONB on every read, slowing queries

### Problem 11: Other Structural Issues

| Issue | Evidence | Impact |
|-------|----------|--------|
| 47.9% of hoursUntilDeparture are negative | 5,159 out of 10,775 | Scores computed AFTER departure — not predictive |
| Flight number "2861" missing carrier prefix | Observed in Replit logs | Some flights get inserted without carrier code |
| Duplicate flights | 1 confirmed (RPA5792 x3) | Minor |
| tailNumber 33% null | 267/796 flights missing | Can't analyze aircraft-specific patterns |
| equipmentType 10% null | 79/796 missing | Same |
| Only 12 origin airports | All seeder airports | No geographic diversity |
| 97.5% of flights are "test" | System-generated bias | Not representative of real usage |

---

## Part 2: Root Cause Analysis — Why Each Issue Happened

### Code Bugs (All Fixed)

| Bug | File | Impact | Fixed? |
|-----|------|--------|--------|
| #1: delay parsed as object before scalar | `flightStatus.ts:268-280` | 99.98% of delays = 0 | ✅ Fixed |
| #2: Same bug in historical OTP | `historicalOtp.ts:52-57` | Historical delay data corrupt | ✅ Fixed |
| #3: Destination weather only 3 of 7 fields | `monitor.ts:105-109` | 4 fields missing in 100% of rows | ✅ Fixed |
| #4: Seeder no error diagnostics | `testFlightSeeder.ts:24-55` | Couldn't tell why seeder failed | ✅ Fixed |

### API Limitations (Not Fixable in Code)

| Issue | Cause | Mitigation |
|-------|-------|------------|
| Historical OTP always 404 | AeroDataBox plan doesn't include history endpoint | Remove or replace this feature |
| 20.6% "Unknown" flight status | Future flights haven't departed yet | Accept as expected |
| 2.7% thunderstorm detection | Weather is usually good at US airports | Accept as expected |
| All flights from 6 airports | Seeder limited to major hubs | Expand seeder or add user flights |

### Architectural Issues (Need Design Change)

| Issue | Cause | Solution |
|-------|-------|----------|
| Carrier health feedback loop | Reads from same table it feeds into | Use external data or time-delayed computation |
| JSONB-in-JSONB | No schema design for ML | Build flat ML table |
| Three databases | Configuration drift over time | Consolidate to one |
| Only 20 real user flights | Product hasn't launched / no users | Add synthetic variety to seeder |

---

## Part 3: Remediation Plan — 6 Phases

### Phase 0: Safety (Immediate)
- Create `server2/` directory as snapshot of current `server/` — no code changes, just preservation
- Everything in `server/` continues working normally

### Phase 1: Database Consolidation (1-2 days)

**Goal**: Pick one database as source of truth, export/merge data from the others.

**Steps**:
1. Decide which database to keep (recommendation: Neon for historical depth, merge Helium data into it)
2. Export Helium data: `pg_dump` from Replit Shell
3. Import into Neon: `psql` restore
4. Deduplicate flights (RPA5792 pattern)
5. Update Replit `DATABASE_URL` to point to consolidated database
6. Verify all tables match the schema (`npm run db:push` to add any missing columns)

### Phase 2: Historical Data Backfill (2-3 days)

**Goal**: Re-score all historical flights with the fixed code so delay and weather data become accurate.

**Why this is necessary**: The code bugs were fixed, but the 10,775 existing rows in the database still have delay=0 and missing weather fields. The only way to fix them is to run the scoring engine again against every flight.

**Approach**: Create a script that iterates through all `monitored_flights` and calls `scoreFlightRisk()` with `forceRefreshNas: true`, storing results in a new `risk_score_history_v2` table (preserving the original for comparison).

**Expected outcome**:
- delayMinutes will show real values (not 0) for flights that have departed
- destinationWeather will have all 7 fields
- inboundAircraftDelay signal will show real variation
- Carrier health will compute real averages from corrected data

### Phase 3: Build Flat ML Training Table (1 day)

**Goal**: Create `ml_training_data` table with flat columns, no JSONB nesting.

**Schema design**:

```sql
CREATE TABLE ml_training_data (
  id SERIAL PRIMARY KEY,
  
  -- Identifiers
  flight_id INTEGER,
  flight_number TEXT,
  carrier TEXT,
  origin TEXT,
  destination TEXT,
  departure_date DATE,
  departure_time TEXT,
  
  -- Target variables (what we want to predict)
  actual_delay_minutes INTEGER,
  actual_cancelled BOOLEAN,
  
  -- Heuristic score (current system output)
  heuristic_score INTEGER,
  heuristic_tier TEXT,
  heuristic_horizon TEXT,
  
  -- Timing features
  hours_until_departure NUMERIC,
  time_of_day_risk INTEGER,
  day_of_week_risk INTEGER,
  connection_risk INTEGER,
  
  -- Weather features (origin)
  origin_flight_category TEXT,
  origin_wind_speed_kt NUMERIC,
  origin_gust_speed_kt NUMERIC,
  origin_visibility_miles NUMERIC,
  origin_ceiling_ft NUMERIC,
  origin_has_thunderstorm BOOLEAN,
  origin_has_freezing BOOLEAN,
  
  -- Weather features (destination) — ALL 7 fields
  dest_flight_category TEXT,
  dest_wind_speed_kt NUMERIC,
  dest_gust_speed_kt NUMERIC,
  dest_visibility_miles NUMERIC,
  dest_ceiling_ft NUMERIC,
  dest_has_thunderstorm BOOLEAN,
  dest_has_freezing BOOLEAN,
  
  -- NAS features
  origin_has_ground_stop BOOLEAN,
  origin_has_ground_delay BOOLEAN,
  origin_nas_avg_delay NUMERIC,
  dest_has_ground_stop BOOLEAN,
  dest_has_ground_delay BOOLEAN,
  dest_nas_avg_delay NUMERIC,
  
  -- Carrier features
  carrier_cancellation_rate NUMERIC,
  carrier_avg_delay_24h NUMERIC,
  carrier_health_score INTEGER,
  carrier_reliable BOOLEAN,
  
  -- Aircraft features
  tail_number TEXT,
  equipment_type TEXT,
  
  -- Metadata
  is_test_flight BOOLEAN,
  scored_at TIMESTAMP,
  
  -- Computed features (from code, not DB)
  inbound_aircraft_delay_signal INTEGER,
  atc_ground_stop_signal INTEGER,
  atc_ground_delay_signal INTEGER,
  
  -- Flag for data quality
  data_quality_flag TEXT
);
```

**Populate from backfilled `risk_score_history`** using a one-time SQL + TypeScript script.

### Phase 4: Feature Analysis (3-5 days)

**Goals**:
1. Check correlation between every feature pair (remove highly correlated features)
2. Check for remaining null values and decide imputation strategy
3. Analyze which features actually predict delays (feature importance ranking)
4. Determine if we should predict:
   - **Regression**: actual delay minutes
   - **Classification**: tier (green/amber/red)
   - **Binary**: delayed vs on-time (15-minute threshold)
5. Minimum sample size calculation for statistical significance

**Expected outcome**: A reduced feature set (maybe 8-12 features instead of 16+) that actually has predictive power.

### Phase 5: Model Training (starts after Phase 4)

1. Train/test split: 80/20 (stratified by tier to preserve class distribution)
2. Handle class imbalance: SMOTE, weighted loss, or oversampling
3. Model candidates:
   - **Random Forest** (handles mixed feature types well)
   - **XGBoost/LightGBM** (state-of-the-art for tabular data)
   - **Logistic Regression** (simple baseline)
4. Evaluation metrics:
   - Precision/recall for red and amber tiers (not just accuracy)
   - RMSE for regression models
   - Confusion matrix
5. Compare against heuristic scorer baseline

### Phase 6: Gradual Deployment

1. Run ML model alongside heuristic scorer (shadow mode)
2. Compare predictions for N cycles
3. When confident, replace heuristic with ML
4. Keep heuristic as fallback

---

## Part 4: Quick Wins & Recommendations

### Do Now (Already Done)
- ✅ Bug #1 fix (delay parsing) — pushed to GitHub
- ✅ Bug #2 fix (historical OTP) — pushed to GitHub  
- ✅ Bug #3 fix (destination weather) — pushed to GitHub
- ✅ Bug #4 fix (seeder diagnostics) — pushed to GitHub
- ✅ Diagnostic logging for monitor/seeder — pushed to GitHub

### Do Next (This Week)
- [ ] Phase 0: Create `server2/` snapshot
- [ ] Phase 1: Consolidate databases (pick ONE, merge others)
- [ ] Phase 2: Backfill historical scores with fixed code

### Do This Month
- [ ] Phase 3: Build `ml_training_data` table
- [ ] Phase 4: Feature analysis
- [ ] Phase 5: Model training

### Don't Do (Remove or Replace)
- ❌ Don't use `historicalOtp` — it's always fallback, adds zero signal
- ❌ Don't use `carrierHealth.avgDelay24h` from historical data — it's all zeros from the feedback loop
- ❌ Don't train on pre-backfill data — it has delay=0 in 99.98% of rows
- ❌ Don't use the nested JSONB `signals` column directly for ML — build the flat table first

---

## Appendix: Data Sources for ML (What's Good, What's Not)

| # | Feature | Source | Data Quality | Use for ML? | Notes |
|---|---------|--------|-------------|-------------|-------|
| 1 | delayMinutes | flightStatus.ts → AeroDataBox | ❌ 99.98% zero → will be GOOD after backfill | ✅ **Target variable** | After backfill |
| 2 | cancelled | flightStatus.ts → AeroDataBox | ❌ Only 0.4% cancelled → rare event | ⚠️ With caution | Needs balancing |
| 3 | flightCategory (origin) | weatherSignal.ts → METAR | ✅ 99.3% non-UNKNOWN | ✅ Yes | |
| 4 | windSpeedKt (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 5 | gustSpeedKt (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 6 | visibilityMiles (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 7 | ceilingFt (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 8 | hasThunderstorm (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 9 | hasFreezing (origin) | weatherSignal.ts → METAR | ✅ 99.98% present | ✅ Yes | |
| 10 | flightCategory (dest) | weatherSignal.ts → METAR | ✅ 87.5% non-UNKNOWN | ✅ Yes | More UNKNOWN than origin |
| 11-14 | wind/gust/vis/ceil (dest) | weatherSignal.ts → METAR | ❌ **0% present** → will be GOOD after backfill | ✅ After backfill | Bug #3 |
| 15 | hasThunderstorm (dest) | weatherSignal.ts → METAR | ✅ Present | ✅ Yes | |
| 16 | hasFreezing (dest) | weatherSignal.ts → METAR | ✅ Present | ✅ Yes | |
| 17 | hasGroundStop (origin) | nasStatus.ts → FAA API | ✅ 99.82% present | ✅ Yes | |
| 18 | hasGroundDelay (origin) | nasStatus.ts → FAA API | ✅ 99.82% present | ✅ Yes | |
| 19 | avgDelayMinutes (origin NAS) | nasStatus.ts → FAA API | ✅ 99.82% present | ✅ Yes | |
| 20 | hasGroundStop (dest) | nasStatus.ts → FAA API | ✅ 99.82% present | ✅ Yes | |
| 21 | hasGroundDelay (dest) | nasStatus.ts → FAA API | ✅ 99.82% present | ✅ Yes | |
| 22 | carrierHealthScore | carrierHealth.ts → DB query | ✅ 99.82% present but 95.8% invariant | ⚠️ After backfill | Feedback loop issue |
| 23 | carrierCancellationRate | carrierHealth.ts → DB query | ✅ Present | ✅ Yes | |  
| 24 | carrierAvgDelay24h | carrierHealth.ts → DB query | ❌ 99.89% zero → will be GOOD after backfill | ✅ After backfill | |
| 25 | historicalOtpRisk | historicalOtp.ts → AeroDataBox | ❌ **0% real data** → always fallback | ❌ **REMOVE** | API doesn't support it |
| 26 | historicalOtpSampleSize | historicalOtp.ts → AeroDataBox | ❌ **0% > 0** | ❌ **REMOVE** | Same reason |
| 27 | timeOfDayRisk | Computed | ✅ 100% present | ✅ Yes | |
| 28 | dayOfWeekRisk | Computed | ⚠️ 48.2% present | ❌ Fix first | |
| 29 | connectionRisk | Computed | ✅ 99.82% present | ✅ Yes | |
| 30 | hoursUntilDeparture | Computed | ✅ 99.82% present | ✅ Yes | But 47.9% are negative |
| 31 | horizon | Computed | ✅ 99.82% present | ✅ Yes | |
| 32 | isTest | monitored_flights | ✅ 100% | ⚠️ Bias warning | |
| 33 | carrierIata | monitored_flights | ✅ 100% | ✅ Yes | |
| 34 | originIata | monitored_flights | ✅ 100% | ✅ Yes | |
| 35 | destinationIata | monitored_flights | ✅ 100% | ✅ Yes | |
| 36 | tailNumber | monitored_flights | ⚠️ 33% null | ⚠️ With imputation | |
| 37 | equipmentType | monitored_flights | ⚠️ 10% null | ⚠️ With imputation | |
| 38 | heuristicScore | risk_score_history | ✅ 100% | ✅ Baseline comparison | |
| 39 | heuristicTier | risk_score_history | ✅ 100% | ✅ Baseline comparison | |
