# Database Quality Analysis & ML Training Roadmap

## Executive Summary

The Travnr disruption monitoring system has **two unconnected PostgreSQL databases**, multiple data-quality bugs that corrupted 5 weeks of training data, and a JSONB schema that makes ML feature extraction painful. This document quantifies every issue and lays out a step-by-step plan to fix them so we can train a reliable ML model.

---

## 1. The Two-Database Problem

| Database | Location | Flights | Scores | Last Activity |
|----------|----------|---------|--------|---------------|
| **Neon** (`neondb`) | Cloud (Neon) | 796 | 10,775 | June 11 |
| **Helium** (`helium/heliumdb`) | Replit internal | 663 | 4,532 | **Today** (July 21) |

**Neon** has 5 weeks of historical data. **Helium** is where the project is actively writing. They are completely unconnected — data in Neon never reaches Helium and vice versa. For ML training, we need both datasets consolidated into one place.

**Root cause**: The `DATABASE_URL` environment variable was changed at some point (possibly when the Replit project was re-forked or reset). The project silently started writing to a new database.

---

## 2. Data Quality Issues — Quantified

### Issue #1: Delay values are 0 in 99.98% of rows (CRITICAL)

| Metric | Value |
|--------|-------|
| Total scores in Neon | 10,775 |
| Scores with delay = 0 | 10,773 (99.98%) |
| Scores with delay > 0 | 2 (0.02%) |
| Max delay found | 90 minutes (only 2 rows) |

**Cause**: Bug #1 (the delay parsing bug in `flightStatus.ts`). The code checked an object before a scalar, so `safeNumber()` always returned 0. This was **never correct** — not a single day of accurate delay data exists in the database.

**ML Impact**: A model trained on this data learns "delays are always 0" — completely useless for prediction.

### Issue #2: Destination weather is missing 4 of 7 fields (100% of rows)

| Field | Origin Weather | Destination Weather |
|-------|---------------|-------------------|
| flightCategory | ✅ Present in 10,773 rows | ✅ Present in 10,775 rows |
| hasThunderstorm | ✅ Present | ✅ Present |
| hasFreezing | ✅ Present | ✅ Present |
| windSpeedKt | ✅ Present | ❌ **Missing in ALL 10,775 rows** |
| gustSpeedKt | ✅ Present | ❌ Missing in ALL rows |
| visibilityMiles | ✅ Present | ❌ Missing in ALL rows |
| ceilingFt | ✅ Present | ❌ Missing in ALL rows |

**Cause**: Bug #3 — `monitor.ts` stored only 3 of 7 destination weather fields. Fixed in our latest code but old data is still corrupt.

**ML Impact**: Can't use destination weather as a full feature. Origin vs destination comparison is impossible for wind, visibility, and ceiling.

### Issue #3: Flight status is "Unknown" in 20% of rows

| Status | Count | Percentage |
|--------|-------|------------|
| Valid status | 8,486 | 78.8% |
| "Unknown" | 2,224 | 20.6% |
| Null/empty | 65 | 0.6% |

**Cause**: The AeroDataBox API returns `Unknown` for future flights that haven't departed yet. This is expected behavior, but for ML training we need actual departure status.

### Issue #4: Extreme class imbalance in risk tiers

| Tier | Count | Percentage |
|------|-------|------------|
| Green (low risk) | 9,483 | 88.0% |
| Amber (moderate) | 1,231 | 11.4% |
| Red (high risk) | 61 | 0.6% |

**ML Impact**: Only 61 "red" examples out of 10,775. A model will need heavy class weighting or synthetic oversampling.

### Issue #5: Score range is narrow (81.5% are 0-19)

| Score Range | Count | Percentage |
|-------------|-------|------------|
| 0-9 | 3,706 | 34.4% |
| 10-19 | 5,073 | 47.1% |
| 20-29 | 1,371 | 12.7% |
| 30-39 | 177 | 1.6% |
| 40+ | 448 | 4.2% |

**ML Impact**: The model would mostly predict scores between 10-19. The lack of variation means poor generalization.

### Issue #6: Carrier health score is always 1

Median health score: **1.0** (scale is 1-10). Since delays were always 0, the carrier health formula always returned the lowest risk score. Once Bug #1 is fixed and new data accumulates, this will become accurate.

### Issue #7: JSONB-in-JSONB nesting (messy schema)

The `signals` column stores this structure:
```json
{
  "signals": { ... },         // <-- nested inside signals column!
  "cancelled": false,
  "flightStatus": { ... },
  "originWeather": { ... },
  "destinationWeather": { ... },
  "nasOrigin": { ... },
  "nasDestination": { ... },
  "carrierHealth": { ... }
}
```

To query a single field like `delayMinutes`, you need:
```sql
signals -> 'flightStatus' ->> 'delayMinutes'
```

This makes it hard to use standard SQL tools, export to CSV, or feed into ML pipelines. A flat table would be much better.

### Issue #8: Duplicate flights

1 confirmed duplicate: `RPA5792` on `2026-05-18` JFK→IAD (appears 3 times). Minor issue but indicates the seeder's deduplication check isn't perfect.

---

## 3. Data Sources — What's Actually Available

| Signal | Source API | Data Available? | Quality |
|--------|-----------|----------------|---------|
| inboundAircraftDelay | AeroDataBox (flightStatus) | ❌ Always 0 due to Bug #1 | FIXED in code, need backfill |
| atcGroundStop | FAA NAS | ✅ Present in 99.8% rows | Good |
| atcGroundDelay | FAA NAS | ✅ Present in 99.8% rows | Good |
| originWeather | AviationWeather.gov (METAR) | ✅ All 7 fields present | Good |
| destinationWeather | AviationWeather.gov (METAR) | ⚠️ Only 3 of 7 fields (Bug #3) | FIXED in code, need backfill |
| carrierHealth | Self-referential (reads from DB) | ⚠️ Always 1 because delays were 0 | Will improve with new data |
| historicalOtp | AeroDataBox | ⚠️ Mostly fallback (404) | Limited |
| timeOfDayRisk | Computed from departure time | ✅ | Good |
| dayOfWeekRisk | Computed from departure date | ✅ | Good |
| connectionRisk | Computed from departure time | ✅ | Good |

---

## 4. Proposed Plan — 6 Phases

### Phase 0: Safety (immediate)
- Create `server2/` as a copy of `server/` to preserve current working code
- No code changes, just a snapshot

### Phase 1: Database Consolidation (1-2 days)
- Export data from both Neon and Helium databases
- Merge into a single PostgreSQL database (pick one as the source of truth)
- Deduplicate flights
- Verify all migrations are applied
- Update the Replit `DATABASE_URL` to point to the consolidated database

### Phase 2: Data Backfill (2-3 days)
- Run the monitoring engine against ALL historical flights (not just active ones)
- This re-scores every flight using the fixed code (Bug #1 and #3 now corrected)
- New `risk_score_history` rows will have proper delay values and full weather data
- This is the only way to fix the 10,773 rows with delay=0

### Phase 3: Flat ML Training Table (1 day)
- Create a new table `ml_training_data` with FLAT columns (no JSONB):
  ```sql
  CREATE TABLE ml_training_data (
    id SERIAL PRIMARY KEY,
    flight_id INTEGER,
    departure_date DATE,
    delay_minutes INTEGER,
    cancelled BOOLEAN,
    origin_weather_category TEXT,
    origin_wind_speed_kt NUMERIC,
    origin_visibility_miles NUMERIC,
    origin_ceiling_ft NUMERIC,
    origin_has_thunderstorm BOOLEAN,
    dest_weather_category TEXT,
    dest_wind_speed_kt NUMERIC,
    dest_visibility_miles NUMERIC,
    dest_ceiling_ft NUMERIC,
    nas_ground_stop BOOLEAN,
    nas_ground_delay BOOLEAN,
    nas_avg_delay_minutes NUMERIC,
    carrier_health_score NUMERIC,
    carrier_cancellation_rate NUMERIC,
    carrier_avg_delay NUMERIC,
    historical_otp_rate NUMERIC,
    time_of_day_risk INTEGER,
    day_of_week_risk INTEGER,
    connection_risk INTEGER,
    horizon TEXT,
    final_score INTEGER,
    final_tier TEXT,
    ...
  );
  ```
- Populate from the re-scored risk_score_history using a one-time SQL script
- This gives us clean, flat data ready for any ML framework

### Phase 4: Feature Analysis (3-5 days)
- Export `ml_training_data` to CSV
- Run correlation analysis to see which signals actually predict delays
- Check for remaining data quality issues
- Determine minimum sample size needed for a reliable model
- Decide on model type (regression for score, classification for tier)

### Phase 5: ML Training (starts after Phase 4)
- Train/test split (80/20)
- Handle class imbalance (SMOTE or weighted loss)
- Evaluate: precision/recall for amber/red tiers
- Deploy as a microservice or replace the heuristic scorer

---

## 5. Recommendation

**Fix the data pipeline first, then train the model.** The current heuristic scorer works well enough for production — what we need is clean historical data to build a better model.

The critical path is:
1. ✅ Fix the code bugs (DONE in this repo, pushed to GitHub)
2. Re-score historical data with the fixes
3. Build flat ML table
4. Train model

Without step 2, any ML model will learn from corrupted data and fail in production.
