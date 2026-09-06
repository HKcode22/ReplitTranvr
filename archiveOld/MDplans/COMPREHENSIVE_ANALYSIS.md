# Travnr — Comprehensive System Analysis & Improvement Plan

## 1. EXECUTIVE SUMMARY

This document covers:
- Why the database stopped populating after June 11
- What the training_data.csv contains and how it's used
- The current ML pipeline architecture and its state
- A prioritized improvement plan

---

## 2. WHY THE DATABASE STOPPED POPULATING AFTER JUNE 11

### Root Cause

The monitoring engine (`server/lib/disruption/monitor.ts:673-712`) uses:
```ts
const flights = await db.select().from(monitoredFlights).where(
  and(
    eq(monitoredFlights.status, "active"),
    gte(monitoredFlights.departureDate, today),
    lte(monitoredFlights.departureDate, tomorrow),
  ),
);
```

**The engine only processes flights that are:**
1. `status = 'active'`
2. `departureDate` is today or tomorrow

Once a flight's departure date passes, the resolution cycle (`runResolutionCycle`) marks it as completed/resolved. When no new flights are added to the system, the engine finds zero active flights within the date window — and **silently logs nothing**.

### Evidence from the Notebook

The `training_data.csv` date range is `2026-05-17` to `2026-06-10`. The notebook confirms 7,258 rows from 478 unique flights, all of which had departure dates in May–early June 2026.

By June 11, **all 478 flights had passed their departure dates**, were resolved by `runResolutionCycle`, and no new flights were added. The monitoring engine is still running (the `setInterval` fires every 30 min), but queries return zero rows.

### Secondary Contributing Factors

| Factor | Impact |
|--------|--------|
| No automated flight re-adding mechanism | Flights are added via agency UI or API; if no agency added new post-June-10 flights, the queue dries up |
| Silent failure mode | `runCycle()` only logs `checked=0` — no alert or health check flags the idle state |
| API key expiration | If AeroDataBox credits ran out, `processFlight()` would fail silently but that's not the primary issue here |

### Solutions

| Priority | Solution | Effort |
|----------|----------|--------|
| **P0** | Add a health-check endpoint that reports last `scored_at` timestamp, total active flights, and engine status | 1hr |
| **P0** | Add a monitoring alert if `checked == 0` for 3+ consecutive cycles (90 min) | 2hr |
| **P1** | Add a `/api/flights/refresh` endpoint to re-add recent flights from agency itineraries | 4hr |
| **P1** | Extend `runCycle` to look up to 3 days ahead (not just today/tomorrow) for pre-monitoring | 0.5hr |
| **P2** | Add a dashboard widget showing "Last score recorded: N hours ago" | 3hr |

---

## 3. TRAINING_DATA.CSV — WHAT IT CONTAINS

### Raw Statistics

| Metric | Value |
|--------|-------|
| Total rows | 7,258 |
| Unique flights | 478 |
| Cancelled flights | 684 rows / 32 unique flights (9.4%) |
| Arrived flights | 6,574 rows / 446 unique flights (90.6%) |
| Date range | 2026-05-17 21:33 → 2026-06-10 23:23 |

### Columns (19)

| Column | Type | Source |
|--------|------|--------|
| `id` | int | Risk score history row ID |
| `monitored_flight_id` | int | FK to monitored_flights |
| `heuristic_score` | int | 0-100 heuristic score |
| `signals` | JSONB | Nested JSON with heuristic + raw data |
| `tail_number`, `equipment_type` | text | From AeroDataBox |
| `scored_at` | timestamp | When the cycle ran |
| `tier` | text | green/amber/red |
| `flight_number`, `carrier_iata`, `origin_iata`, `destination_iata` | text | Flight metadata |
| `departure_date`, `departure_time` | text | Scheduled departure |
| **`resolved_status`** | text | **Target variable:** Arrived / Cancelled / Diverted |
| **`resolved_delay_minutes`** | int | **Target variable:** Actual delay at arrival |
| `departure_hour`, `day_of_week`, `month` | int | Derived from departure_time |

### Signals JSONB Structure

```json
{
  "signals": {               ← HEURISTIC SCORES (10 signals)
    "inboundAircraftDelay": 0,
    "atcGroundStop": 0,
    "atcGroundDelay": 0,
    "originWeather": 2,
    "destinationWeather": 2,
    "carrierHealth": 0,
    "historicalRisk": 10,
    "timeOfDayRisk": 5,
    "dayOfWeekRisk": 0,
    "connectionRisk": 0
  },
  "flightStatus": {           ← RAW AeroDataBox
    "status": "Scheduled",
    "delayMinutes": 0,
    "inboundDelayMinutes": 0,
    "cancelled": false,
    "departureTime": "2026-05-18 21:11Z"
  },
  "originWeather": {          ← RAW NOAA METAR
    "flightCategory": "VFR", "hasThunderstorm": false,
    "windSpeedKt": 19, "visibilityMiles": 10, "ceilingFt": 99999
  },
  "destinationWeather": {     ← RAW NOAA METAR
    "flightCategory": "VFR", "hasThunderstorm": false
  }
}
```

### Target Variable

The notebook trains a **binary classifier** where:
- **`y = 1`**: `resolved_status == 'Cancelled'` (32 flights)
- **`y = 0`**: `resolved_status == 'Arrived'` (446 flights)

The model uses **per-flight aggregation** — each flight's ~15 monitoring cycles are collapsed into summary statistics (max, min, trend) — producing 478 rows, 30 features. This avoids the per-cycle duplication bug that caused the v2 model to memorize flight IDs.

---

## 4. CURRENT ML PIPELINE STATE

### Architecture (Fixed — No Heuristic Leakage)

```
rawData → featureExtractor.ts → 25 features → XGBoost → ML probability (0-1)
                                                                      |
rawData → riskScorer.ts → heuristic score (0-100) --------------------+
                                                                      |
                                                                      v
                                                          hybridScore(): 30% heuristic + 70% ML
```

### 25 Features (Live Inference)

| # | Feature | Source |
|---|---------|--------|
| 1 | `inbound_delay` | AeroDataBox |
| 2 | `current_delay` | AeroDataBox |
| 3 | `atc_avg_delay` | FAA NAS (max of origin/dest) |
| 4-10 | `origin_flight_cat`, `origin_thunderstorm`, `origin_freezing`, `origin_wind_speed`, `origin_gust_speed`, `origin_visibility`, `origin_ceiling` | NOAA METAR |
| 11-13 | `dest_flight_cat`, `dest_thunderstorm`, `dest_freezing` | NOAA METAR |
| 14-16 | `carrier_cancel_rate`, `carrier_avg_delay`, `carrier_sample_size` | DB aggregate |
| 17-19 | `departure_hour`, `day_of_week`, `month` | Schedule |
| 20-22 | `is_weekend`, `is_rush_hour`, `is_summer` | Derived |
| 23-25 | `delay_delta_30m`, `delay_rolling_avg_4`, `checkpoint_number` | ML temporal cache |

### NB: Different from Training

The training notebook uses **30 per-flight aggregated features** (e.g., `origin_wind_max`, `origin_worsened`, `wind_trend`, `atc_fraction`, `monitor_hours`). The live inference uses **25 per-cycle features** (current snapshot + rolling).

This is a **deliberate architectural mismatch** — training aggregates across all cycles, while live inference must operate on a single cycle. The live features track temporal deltas through the `flightHistory` in-memory cache.

### Colab Model Training Results

| Metric | Value |
|--------|-------|
| ROC AUC (CV) | 0.8738 ± 0.0623 |
| Precision | 0.8889 (at 0.5 threshold) |
| Recall | 1.0000 (at 0.5 threshold) |
| Best params | max_depth=4, n_estimators=224, learning_rate=0.052 |

**Top features:**
1. `carrier_cancel_rate_max` (29.0%)
2. `carrier_cr_trend` (13.8%)
3. `is_rush_hour` (4.7%)
4. `departure_hour` (4.5%)
5. `origin_flight_cat_worst` (4.4%)

### Gap: Model File May Not Exist

The `predictor.ts:20` expects the model at `server/models/disruption_model.json`. If this file does not exist, `initModel()` logs a warning and ML inference falls back to heuristic-only mode:
```ts
if (!fs.existsSync(MODEL_PATH)) {
  console.warn('[ML] Model file not found');
  return false;  // Falls back to 100% heuristic
}
```

---

## 5. IMPROVEMENT PLAN

### Phase 1: Fix Immediate Gaps (Days 1-2)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1 | Export model from Colab and place at `server/models/disruption_model.json` | Colab → server/models/ | 15min |
| 2 | Add monitoring engine health check endpoint | `server/routes.ts` | 1hr |
| 3 | Add idle detection: warn if no scores in 2+ hours | `server/lib/disruption/monitor.ts` | 2hr |
| 4 | Verify 25 live features match training feature order exactly | `featureExtractor.ts` vs Colab | 1hr |

### Phase 2: Operational Stability (Days 3-5)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 5 | Add `/api/flights/refresh` to re-query recent agency bookings | `server/routes.ts`, `monitor.ts` | 4hr |
| 6 | Extend monitoring window to T-3 days (pre-monitor) | `monitor.ts:310-321` | 1hr |
| 7 | Add Prometheus metrics: `active_flights`, `last_score_timestamp`, `cycle_duration_ms` | New file | 3hr |
| 8 | Add database backup/export for `training_data.csv` | `server/lib/services/` | 2hr |

### Phase 3: ML Improvements (Days 5-10)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 9 | Align live inference features with training features | `featureExtractor.ts`, Colab | 4hr |
| 10 | Add per-flight aggregation to live pipeline (for real scoring, not just training) | New file | 8hr |
| 11 | Ship an automated retraining pipeline | Python script + CRON | 6hr |
| 12 | Add model versioning — store model metadata in DB | `schema.ts`, `predictor.ts` | 3hr |
| 13 | Add feature importance logging per cycle to detect drift | `predictor.ts` | 2hr |

### Phase 4: Architecture (Days 10+)

| # | Task | Effort |
|---|------|--------|
| 14 | Dynamic blend weighting (80% ML when model confident, 50% when uncertain) | 4hr |
| 15 | Multi-class prediction: on-time / delayed / cancelled | 8hr |
| 16 | Weather forecast integration (not just current METAR) | 6hr |
| 17 | Real-time dashboard for monitoring engine status | 10hr |

---

## 6. KEY CODE LOCATIONS

| Component | Path | Purpose |
|-----------|------|---------|
| Monitoring loop | `server/lib/disruption/monitor.ts:673-712` | The 30-min cycle that drives everything |
| Flight processing | `server/lib/disruption/monitor.ts:42-250` | Score + alert per flight |
| Resolution cycle | `server/lib/disruption/monitor.ts:510-601` | Resolve past flights (status, delay) |
| Heuristic scorer | `server/lib/disruption/riskScorer.ts` | Manual rule-based risk score |
| ML predictor | `server/lib/ml/predictor.ts` | XGBoost inference + hybrid blend |
| Feature extractor | `server/lib/ml/featureExtractor.ts` | 25 features from raw signals |
| ML types | `server/lib/ml/types.ts` | Interfaces |
| Training notebook | `Travnr (1).ipynb` | Full Colab training pipeline |
| Training data | `training_data.csv` | 7,258 labeled risk score rows |
| Database schema | `shared/schema.ts` | All pgTable definitions |
| Server entry | `server/index.ts:320` | Where `startMonitoringEngine()` is called |

---

## 7. CRITICAL QUESTIONS TO ANSWER

1. **Does `server/models/disruption_model.json` exist?** If not, the ML prediction is completely disabled and only heuristic scoring runs.
2. **Are there agency accounts actively using the system?** If `monitored_flights` has no new rows with future departure dates, the engine has nothing to do.
3. **Do the 25 live features exactly match the order in the Colab `feature_columns.txt`?** A mismatch would produce garbage ML predictions.
4. **When was the server last restarted?** The in-memory `flightHistory` cache in `featureExtractor.ts` is cleared on restart, and the `setInterval` monitoring loop also resets.
