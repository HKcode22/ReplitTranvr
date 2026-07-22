# Database Quality Analysis & ML Training Roadmap

> All numbers based on direct PostgreSQL queries against 10,775 risk scores and 796 monitored flights. Every claim is backed by database evidence.

**Date**: July 21, 2026

---

## Executive Summary

The ML training dataset has **three distinct problems**: (1) code bugs corrupted the values of key fields, (2) the JSONB schema changed over time leaving old rows incomplete, and (3) two of the planned features are completely non-functional because their external API never returns data. Of ~30 potential ML features, only about half are usable, and the target variable (`delayMinutes`) is 0 in 99.98% of rows. This document covers every feature column individually with evidence, root cause, and fix.

---

## Part 1: Feature-by-Feature Analysis

Each section covers: **Why it matters** → **Current data state** → **What's wrong** → **How to fix**

---

### 1.1 delayMinutes — THE TARGET VARIABLE

**Why it matters**: This is what we want to predict. A regression model learns to estimate delay minutes. A classification model uses it to define "on-time" vs "delayed."

**Current data (direct DB query)**:
```
Total rows:      10,775
delay = 0:       10,708 (99.35%)
delay = NULL:        65 (0.60%)
delay > 0:            2 (0.02%)
Max delay:           90 min
Avg of positive:     90.0 min
Carriers with delay > 0: 1
```

**What's wrong**: 99.98% of rows have zero delay. Not "small delays" — literally zero. The two positive rows represent a single flight on a single carrier, not a representative sample. A model trained on this learns "delay is always 0."

**Root cause**: Bug #1 in `flightStatus.ts`. The parser checked `departure.delay` (an object) before `departure.delayMinutes` (a number). The `safeNumber()` function received an object and returned 0. Every flight, every carrier, every day for 5 weeks.

**Fix**: ✅ Code fix is deployed (scalar checked before object). **Need to re-score all 10,775 historical rows** with the fixed code to get real delay values. This is the single most important remediation step.

---

### 1.2 cancelled — Secondary Target / Binary Feature

**Why it matters**: Cancellations are the most disruptive outcome. Can be a secondary prediction target or a binary feature.

**Current data**:
```
cancelled = false:  10,663 (98.96%)
cancelled = true:       47 (0.44%)
cancelled = NULL:       65 (0.60%)
```

**What's wrong**: Cancellations are rare (0.44%) — extreme class imbalance. 65 rows have NULL (missing flight status entirely). For ML, 47 positive examples is borderline — you'd need aggressive oversampling.

**Root cause**: The NULL rows correspond to flights where the AeroDataBox API returned no data at all (also accounts for 65 rows with NULL delayMinutes and NULL status).

**Fix**: Re-scoring historical flights will fill the NULL rows. The class imbalance is intrinsic (most flights aren't cancelled) and must be handled during training (SMOTE, weighted loss).

---

### 1.3 flightStatus.status — Flight Status Category

**Why it matters**: Tells us if the flight is Scheduled, EnRoute, Arrived, etc. Helps distinguish pre-departure predictions from post-departure confirmations.

**Current data**:
```
Status       Count    %
Scheduled    6,066   56.3%
Unknown      2,224   20.6%
Arrived      1,451   13.5%
EnRoute        832    7.7%
Departed        72    0.7%
NULL            65    0.6%
Cancelled       47    0.4%
Approaching     12    0.1%
Delayed          4    0.04%
Simulated        2    0.02%
```

**What's wrong**: 20.6% are "Unknown" — the API didn't recognize this flight number for this date. Only 4 rows (0.04%) have status "Delayed" — the AeroDataBox API almost never reports "Delayed" as a status string; delays are communicated through `delayMinutes` instead.

**Root cause**: AeroDataBox returns "Unknown" for flight numbers it doesn't recognize on the given date. This is expected behavior for future flights or incorrect carrier/flight number combos.

**Fix**: Not actionable — this is an API limitation. For ML, either treat "Unknown" as a separate category or filter those rows.

---

### 1.4 flightStatus.departureTime — Scheduled / Actual Departure Time

**Why it matters**: Used to compute time-of-day features and hours-until-departure.

**Current data**: 99.35% present (10,705 out of 10,775 rows). Only 70 rows missing.

**What's wrong**: Minor. 0.65% missing is acceptable.

**Root cause**: NULL rows correspond to flights where the API returned no data.

**Fix**: ✅ Already good. No action needed. Will be filled by historical re-scoring.

---

### 1.5 hoursUntilDeparture — Time Horizon Feature

**Why it matters**: Critical for the horizon weighting system. Tells us how far in advance the prediction is being made.

**Current data**:
```
NULL:             19 rows (0.2%)
Negative (< 0):   5,159 rows (47.9%)
0 to 4 hours:     1,975 rows (18.3%)
4 to 24 hours:    3,622 rows (33.6%)
> 24 hours:            0 rows (0.0%)
Distinct values: 404
```

**What's wrong**: **47.9% of rows have negative hoursUntilDeparture** — meaning the flight already departed when it was scored. This is because the monitor re-scores flights every 30 minutes even after departure, and the scoring logic uses current time vs planned departure. Also, **0 rows have > 24 hours** horizon — the monitor only scores flights departing today or tomorrow, which is at most 47 hours away.

**Root cause**: The monitor cycle re-scores all active flights regardless of whether they've departed. After departure, hoursUntilDeparture becomes negative. This is by design (to track actual outcomes) but means nearly half the data is "post-diction" not "prediction."

**Fix**: For ML training, consider filtering to only rows where `hoursUntilDeparture >= 0` (predictive data). This removes ~48% of the dataset. Or keep negative rows as a separate "post-hoc" analysis set.

---

### 1.6 timeOfDayRisk — Time-Based Risk Signal

**Why it matters**: Captures that afternoon/evening flights have higher cumulative delay risk due to cascading disruptions.

**Current data**:
```
Value  Count    %
0      4,773   44.3%  (morning flights)
1      2,466   22.9%  (early afternoon)
2      1,655   15.4%  (mid-afternoon)
3      1,255   11.6%  (late afternoon)
4        612    5.7%  (evening)
5         14    0.1%  (late night)
```

**What's wrong**: Nothing — good variation across 6 values. 100% non-null. This is one of the healthiest features.

**Root cause**: N/A — this is a computed feature from departure time.

**Fix**: ✅ No fix needed. Use as-is.

---

### 1.7 dayOfWeekRisk — Day-of-Week Risk Signal

**Why it matters**: Weekday flights have different patterns than weekend flights (more business travelers, more congestion).

**Current data**:
```
Day         Total  NULL dayOfWeekRisk  % NULL
Sunday      1,922    1,922             100.0%
Monday         47       47             100.0%
Tuesday       235      235             100.0%
Wednesday   5,456      420               7.7%
Thursday    1,703    1,545              90.7%
Saturday    1,412    1,412             100.0%

Total:      10,775    5,581 (51.8% null)
```

**What's wrong**: **51.8% of rows have NULL dayOfWeekRisk.** This isn't random — certain days of the week are 100% NULL (Sun, Mon, Tue, Sat) while Wednesday is nearly complete (92.3% present). This is a **schema evolution issue**: the `dayOfWeekRisk` field was added to the code later in the project's lifecycle, so rows scored before the code change don't have it.

**Root cause (detailed)**: The `risk_score_history.signals` JSONB column stores a nested `signals` object. Over 5 weeks of operation, the code was modified multiple times to add new fields:
- **Rows 1-18** (May 17): Only 5 fields — `timeOfDayRisk`, `originWeather`, `historicalRisk`, `inboundAircraftDelay`, `destinationWeather`
- **Rows 19-5,452** (May 17 → June 10): Added `hoursUntilDeparture`, `carrierHealth`, `atcGroundStop`, `atcGroundDelay`, `connectionRisk`, `historicalOtp`, `horizon`
- **Rows 5,453-5,581** (June 10): Added `historicalOtpSampleSize`, `historicalOtpSource`
- **Rows 5,582+** (June 10 → June 11): **Added `dayOfWeekRisk`** — this is when it first appears

**Fix**: Re-scoring historical flights with the current code will include `dayOfWeekRisk` in every row. This is the same backfill needed for Bug #1. One fix solves both problems.

---

### 1.8 connectionRisk — Connection Complexity Signal

**Why it matters**: Flights departing during peak connecting bank hours (10-18h) have higher risk due to connecting passenger volumes.

**Current data**:
```
Value  Count    %
0      2,279   21.2%
1      2,500   23.2%
2      2,463   22.9%
3      1,392   12.9%
4      2,122   19.7%
NULL      19    0.2%
```

**What's wrong**: Very minor — 0.2% NULL due to earliest rows missing this field (schema evolution rows 1-18). Good variation across 5 values.

**Root cause**: Schema evolution (same as dayOfWeekRisk but this field was added earlier).

**Fix**: ✅ Will be resolved by historical re-scoring.

---

### 1.9 originWeather.flightCategory — Visual Flight Rules Category

**Why it matters**: VFR → MVFR → IFR → LIFR progression correlates with weather severity and delay probability.

**Current data**:
```
Category  Count    %
VFR       9,283   86.2%
MVFR      1,346   12.5%
UNKNOWN      80    0.7%
IFR          43    0.4%
LIFR         23    0.2%
```

**What's wrong**: 86.2% VFR (good weather) — heavily skewed towards clear conditions. Only 0.2% LIFR (lowest visibility/ceiling). This is expected for summer US operations.

**Root cause**: Summer weather at major US airports is generally VFR. Also the METAR API might not capture all adverse conditions.

**Fix**: Not fixable — weather is what it is. For ML, consider treating UNKNOWN/IFR/LIFR as a combined "adverse" category to increase sample size.

---

### 1.10 originWeather.windSpeedKt — Wind Speed

**Why it matters**: Crosswinds and high winds affect landing/takeoff safety and can cause delays.

**Current data**: 99.98% present. Average: 7.8 kt. Range: 0 to ~45 kt (typical US summer).

**What's wrong**: Nothing notable. Good coverage. Values are realistic for US airports.

**Fix**: ✅ No fix needed.

---

### 1.11 originWeather.gustSpeedKt — Gust Speed

**Why it matters**: Gusts more than wind speed indicate unstable conditions.

**Current data**: 99.98% present. Average: 4.5 kt. Often equal to windSpeedKt (calm days) or higher during storms.

**What's wrong**: Nothing notable. Good coverage.

**Fix**: ✅ No fix needed.

---

### 1.12 originWeather.visibilityMiles — Visibility

**Why it matters**: Low visibility causes IFR conditions and spacing delays.

**Current data**: 99.98% present. Average: 9.7 miles. Typically 10 miles (clear) or lower during fog/haze.

**What's wrong**: Nothing notable. Good coverage. Values cluster around 10 miles (clear) with some lower values.

**Fix**: ✅ No fix needed.

---

### 1.13 originWeather.ceilingFt — Cloud Ceiling Height

**Why it matters**: Low ceiling forces IFR approaches, reducing airport throughput.

**Current data**: 99.98% present. Average: 45,127 ft. This is heavily skewed by the default value of 99,999 ft (unlimited ceiling).

**What's wrong**: The average of 45,127 ft is misleading — it's dragged up by the 99,999 default. The METAR API often returns unlimited ceiling for clear days. This means ceilingFt has a bimodal distribution: either unlimited (99,999) or a specific value (500-25,000 ft).

**Root cause**: The METAR API reports "unlimited" ceiling as a very high value or omits it. The code defaults to 99,999 ft.

**Fix**: For ML, cap ceilingFt at a reasonable max (e.g., 30,000 ft) or create a binary "unlimited ceiling" flag.

---

### 1.14 originWeather.hasThunderstorm — Thunderstorm Flag

**Why it matters**: Thunderstorms cause delays, diversions, ground stops.

**Current data**: 286 rows (2.7%) have thunderstorms = true. The rest are false.

**What's wrong**: Very rare event (2.7%). For ML, this feature will almost always be 0. The METAR `wxString` field is parsed for `TS`, `TSRA`, `TSGR` patterns.

**Root cause**: Summer weather at 6 US hub airports doesn't produce many thunderstorms in the data window.

**Fix**: Not fixable. Consider whether this feature adds signal given its rarity.

---

### 1.15 originWeather.hasFreezing — Freezing Conditions Flag

**Current data**: **0 rows** have hasFreezing = true. The regex checks for `FZ`, `FZRA`, `FZDZ`, `FZFG`, `SN`, `PL`.

**What's wrong**: Zero occurrences across all 10,775 rows. This feature is completely dead — adds only noise.

**Root cause**: Summer (May-June) at major US airports — no freezing conditions expected. The code checks the `wxString` for freezing/snow patterns, but none were present.

**Fix**: Either (a) remove this feature, or (b) leave it but it will always be 0 for summer data. Not actionable.

---

### 1.16 destinationWeather.windSpeedKt — MISSING IN 100% OF ROWS

**Current data (direct DB query)**:
```
windSpeedKt present:      0 rows  (0.00%)
gustSpeedKt present:      0 rows  (0.00%)
visibilityMiles present:  0 rows  (0.00%)
ceilingFt present:        0 rows  (0.00%)
```

**What's wrong**: **100% of historical rows are missing 4 of 7 destination weather fields.** Origin weather has all 7 fields fine. Destination weather only saved `flightCategory`, `hasThunderstorm`, and `hasFreezing`.

**Root cause**: Bug #3 in `monitor.ts` line 105-109. The `destinationWeather` block in the signals JSONB was declared with only 3 fields compared to originWeather's 7. Origin weather had:
```ts
originWeather: {
  flightCategory, hasThunderstorm, hasFreezing,
  windSpeedKt, gustSpeedKt, visibilityMiles, ceilingFt  // 7 fields
}
```
Destination weather had:
```ts
destinationWeather: {
  flightCategory, hasThunderstorm, hasFreezing
  // NO windSpeedKt, gustSpeedKt, visibilityMiles, ceilingFt
}
```

**Fix**: ✅ Code fix is deployed (all 7 fields now stored). **Need historical re-scoring to fill missing data in old rows.**

---

### 1.17 nasOrigin / nasDestination — FAA Ground Stops & Delays

**Why it matters**: FAA's National Airspace System status directly impacts flight delays. Ground stops and delay programs are strong predictors.

**Current data — Ground Stops**:
```
                   True   False  NULL
nasOrigin:          388   10,368    19
nasDestination:     175   10,581    19
```

**Current data — Ground Delays**:
```
nasOrigin avgDelayMinutes > 0:  1,105 rows (10.3%)
nasOrigin avgDelayMinutes > 60:   996 rows  (9.2%)
Max avgDelayMinutes:              336 min
```

**What's wrong**: Only 19 rows have NULL (schema evolution issue — earliest 19 rows predate NAS tracking). Otherwise, NAS data has good coverage and useful variation. 388 ground stops at origin airports is enough for the model to learn from.

**Root cause**: NAS data works correctly. The 19 NULL rows are from the earliest schema version (rows 1-18).

**Fix**: ✅ Will be resolved by historical re-scoring. NAS data is one of the better features.

---

### 1.18 carrierHealth.healthScore — Carrier Reliability Score

**Why it matters**: Carrier operational performance — high cancellation rates and delays trigger health scores of 7 or 10.

**Current data**:
```
Score  Count    %
1      10,322  95.8%
3         358   3.3%
4          13   0.1%
7          10   0.1%
10         53   0.5%
NULL       19   0.2%
```

**What's wrong**: **95.8% of rows have healthScore = 1 (the lowest possible).** The score distribution is extremely compressed. Only 0.7% of rows have scores 7 or 10. This is because:
- Score 1 = cancellationRate ≤ 3% AND avgDelay24h ≤ 15 min
- Score 10 = cancellationRate > 15% OR avgDelay24h > 60 min
- Since delays were always 0 (Bug #1), only cancellation rates drove higher scores
- With delays at 0, the carrier "looked" healthy even when it wasn't

**Root cause**: **Self-referential feedback loop.** `carrierHealth.ts` computes `avgDelay24h` by querying `risk_score_history` for the last 24 hours:
```sql
SELECT delayMinutes FROM risk_score_history 
WHERE carrierIata = code AND scoredAt >= now() - 24h
```
Since Bug #1 caused ALL delays to be 0, the carrier health always saw avgDelay24h = 0, which meant healthScore stayed at 1. This fed back into the next cycle, reinforcing the 0s.

**Fix**: After historical re-scoring, new scores will have real delay values, and carrier health will compute correctly. **No code fix needed** — the fix for Bug #1 cascades to fix carrier health automatically. But old scores (pre-fix) will remain wrong unless re-scored.

---

### 1.19 carrierHealth.avgDelay24h — 24-Hour Average Delay

**Current data**: Only **12 rows (0.11%)** have avgDelay24h > 0. All 12 have value 90.0 minutes.

**What's wrong**: Same feedback loop as healthScore. With delay=0 in the source data, avgDelay24h is always 0. The 12 positive rows likely correspond to the 2 flights that had delay=90, averaged across a small sample.

**Root cause**: Same as healthScore — the feedback loop from Bug #1.

**Fix**: Same as healthScore — Bug #1 fix cascades to this automatically after re-scoring.

---

### 1.20 carrierHealth.cancellationRate24h — 24-Hour Cancellation Rate

**Current data**:
```
Rate      Count    %
0.0       9,357   87.0%
0.01-0.05 1,339   12.4%
0.05-0.10    10    0.1%
0.10-0.20    32    0.3%
>0.20        18    0.2%
```

**What's wrong**: 87% have zero cancellation rate. This is because the cancellation rate is computed from the same `risk_score_history` table, and most flights weren't cancelled. The 13% with non-zero rates reflect genuine cancellations in the data.

**Root cause**: The cancellation rate query is correct — it reads `signals -> 'flightStatus' -> 'cancelled'` from the DB. Since the cancellation flag WAS populated correctly (not affected by Bug #1), this feature has real variation.

**Fix**: ✅ This feature is already working. No fix needed. The cancellation rate is one of the few features with correct data.

---

### 1.21 historicalOtp — Historical On-Time Performance ⚠️ DEAD FEATURE

**Current data (direct DB query)**:
```
Real API data (source='aerodatabox'):      0 rows (0.00%)
Fallback data (source='fallback'):      5,323 rows (49.41%)
NULL source:                             5,452 rows (50.59%)
SampleSize > 0:                              0 rows (0.00%)
```

**What's wrong**: **100% of historical OTP data is fallback.** The AeroDataBox historical endpoint (`/flights/number/{flight}/history/recent`) always returns HTTP 404 for every query. The system silently falls back to hardcoded values:
- short horizon → risk = 2
- medium horizon → risk = 3

**Proof**: The `historicalOtp` risk points are 100% correlated with horizon — every short-horizon row has risk=2, every medium-horizon row has risk=3. It's a deterministic function, not data-driven.

**Root cause**: The AeroDataBox API plan doesn't include access to the historical performance endpoint. This is a billing/plan limitation, not a code bug.

**Fix**: **Remove this feature from the ML feature set.** It adds zero predictive value. The risk points are a function of horizon (which is already a separate feature), so it's also redundant. No amount of re-scoring will fix this — the external API simply doesn't return data on our plan.

---

### 1.22 heuristicScore — Current System Output (for baseline comparison)

**Why it matters**: Every ML model needs a baseline. The heuristic score is what the current system produces. The ML model must beat it.

**Current data**:
```
Min:      3
Max:     75
Mean:    14.6
Median:  12
P25:      8
P75:     16
P90:     25
P99:     50
StdDev:   9.7

Score Range  Count    %
0-4             19    0.2%
5-9          3,687   34.2%
10-14        3,796   35.2%
15-19        1,277   11.9%
20-24          761    7.1%
25-29          610    5.7%
30-34          121    1.1%
35-39           56    0.5%
40-49          338    3.1%
50-59           50    0.5%
60+             60    0.6%
```

**What's wrong**: 81.5% of scores fall between 5-19 (narrow range). The scoring system doesn't produce much differentiation. With delays = 0, the only score drivers were NAS ground stops, carrier cancellation rates, and weather — all of which produce small values.

**Root cause**: Three of the ten heuristic signals (inboundAircraftDelay, carrierHealth, historicalOtp) were dead due to Bug #1 and the historical OTP issue. This compressed the total score into a narrow band.

**Fix**: After historical re-scoring with the fixed code, scores will vary more because `inboundAircraftDelay` will be non-zero for delayed flights, and `carrierHealth` will reflect real delay averages.

---

### 1.23 horizon — Prediction Horizon Category

**Why it matters**: Different features matter at different horizons (e.g., historical OTP matters more for long-horizon, weather matters more for short-horizon).

**Current data**:
```
short:   7,134 (66.2%)
medium:  3,622 (33.6%)
NULL:       19  (0.2%)
long:        0  (0.0%)  ← ZERO long-horizon scores
```

**What's wrong**: **Zero long-horizon scores.** The monitor only queries flights departing today or tomorrow, which means max horizon is ~47 hours. The code defines "long" as > 24 hours, so no flight ever reaches long horizon weighting. This means the long-horizon weight table (inboundDelay=0.0, historicalOtp=1.0, etc.) is never exercised.

**Root cause**: The monitor's query is:
```ts
const flights = await db.select().from(monitoredFlights).where(
  and(
    eq(monitoredFlights.status, "active"),
    gte(monitoredFlights.departureDate, today),
    lte(monitoredFlights.departureDate, tomorrow),
  ),
);
```

This only selects flights departing today or tomorrow. Since the seeder runs daily for tomorrow's flights, the maximum horizon is ~47 hours. "Long" horizon (>24h) could exist but only in a narrow window (24-47 hours). The data shows zero long-horizon scores, meaning no flight was scored more than 24 hours before departure, OR the timing was such that every score fell into short or medium.

**Fix**: Not a bug, but worth noting for ML. The model will only ever be trained on short (0-4h) and medium (4-24h) horizon data. Long-horizon predictions (>24h) cannot be trained with this data pipeline.

---

### 1.24 inboundAircraftDelay Signal — Heuristic Sub-Score

**Why it matters**: Part of the heuristic score. Converts raw delay minutes into a 0-40 risk contribution.

**Current data**:
```
Value 0:  10,726 rows (99.55%)
Value 40:     49 rows  (0.45%)
```

**What's wrong**: 99.55% of rows have this signal = 0. Only 49 rows have value 40 (which corresponds to cancelled flights — the `cancelled ? 40 : ...` branch). Since delays were always 0, the function `inboundDelayRaw(0, cancelled)` returned 0 for all non-cancelled flights.

**Root cause**: Same Bug #1 — delay values were 0, so the inbound delay signal was always 0.

**Fix**: ✅ Will be resolved by historical re-scoring. After the fix, `inboundDelayRaw()` will receive real delay values and produce meaningful scores.

---

### 1.25 atcGroundStop / atcGroundDelay Signals — Heuristic Sub-Scores

**Why it matters**: ATC ground stop contributes up to 20 points, ground delay contributes up to 15 points to the heuristic score.

**Current data**:
```
atcGroundStop:    avg=0.9, max=20, 19 rows NULL
atcGroundDelay:   avg=3.2, max=15, 19 rows NULL
```

**What's wrong**: Minor. 19 NULL rows from earliest schema version. Otherwise these signals have good variation because they depend on FAA NAS data (which was working correctly).

**Fix**: ✅ Will be resolved by re-scoring. These features are already mostly correct.

---

### 1.26 tailNumber — Aircraft Registration

**Why it matters**: Links to aircraft-specific maintenance history, age, and delay patterns.

**Current data**: 267/796 flights (33.5%) have NULL tail number. In risk_score_history, 7,353/10,775 rows (68.2%) have NULL tail number.

**What's wrong**: 68% of scores have no aircraft identification. Even when present, tail numbers are high-cardinality (many unique values), making them hard to use as ML features without aggregation.

**Root cause**: The AeroDataBox API doesn't always return `flight.aircraft.reg`. When the flight is still in the future, the aircraft assignment may not be finalized.

**Fix**: For ML, either (a) group by equipment type instead, (b) create a "tail age" feature by looking up the aircraft, or (c) drop this feature.

---

### 1.27 equipmentType — Aircraft Model

**Why it matters**: Different aircraft types have different performance characteristics and delay profiles.

**Current data**: 79/796 flights (9.9%) have NULL equipment type. In risk_score_history, 682/10,775 rows (6.3%) have NULL.

**What's wrong**: ~10% missing is acceptable. Main issue is high cardinality (many equipment types) — may need grouping (Boeing, Airbus, Embraer, etc.).

**Fix**: ✅ Reasonable as-is. Group by manufacturer family for ML.

---

### 1.28 isTest — Test Flight Flag

**Why it matters**: 97.5% of flights are system-generated test flights from the seeder. Only 20 flights (2.5%) are from real users.

**Current data**:
```
monitored_flights: 776 test (97.5%), 20 real (2.5%)
user_monitored_flights: 1 user
```

**What's wrong**: The entire ML dataset is dominated by synthetic data. The seeder picks from 6 specific airports (ATL, DFW, ORD, DEN, LAX, JFK) at consistent times of day. This creates a biased sample that doesn't represent:
- Regional/small airports
- International operations
- Non-peak hour flights
- Leisure travel vs business travel patterns

**Root cause**: The product hasn't launched to real users. The seeder was designed to populate the system for testing.

**Fix**: Either (a) expand the seeder to cover more airports and time ranges, (b) launch the product to get real user data, or (c) accept the bias and document it as a known limitation.

---

### 1.29 Schema Evolution — The Hidden Problem

**What's wrong**: The `signals` JSONB column changed its internal structure multiple times during the 5 weeks of operation. Different rows have different sets of fields:

```
Rows 1-18 (May 17):           5 fields in nested signals
Rows 19-5,452 (May 17-Jun 10): 12 fields
Rows 5,453-5,581 (Jun 10):    14 fields (added historicalOtp metadata)
Rows 5,582+ (Jun 10-Jun 11):  15 fields (added dayOfWeekRisk)
```

This means a query like `SELECT signals#>>'{signals,dayOfWeekRisk}' FROM risk_score_history` returns NULL for 5,581 rows NOT because the data is missing, but because the field didn't exist when those rows were created.

**Root cause**: The code was iteratively improved, adding new signals to the heuristic scorer. Each deployment changed the shape of the JSONB. Old rows were never migrated.

**Fix**: Backfilling (re-scoring) all historical rows with the current code will produce a consistent schema.

---

## Part 2: Feature Quality Summary for ML

### Features to KEEP (good quality or fixable by backfill)

| Feature | Current Quality | Quality After Fix | Priority |
|---------|----------------|-------------------|----------|
| delayMinutes | ❌ 99.98% zero | ✅ Good | CRITICAL — target variable |
| cancelled | ⚠️ 0.6% rare | ⚠️ Still rare | Accept class imbalance |
| flightStatus.status | ✅ 99.4% present | ✅ | Good |
| departureTime | ✅ 99.35% present | ✅ | Good |
| hoursUntilDeparture | ⚠️ 47.9% negative | ⚠️ Still negative | Filter for prediction use |
| timeOfDayRisk | ✅ 100% present | ✅ | Good |
| dayOfWeekRisk | ❌ 51.8% null | ✅ | Backfill fixes this |
| connectionRisk | ✅ 99.8% present | ✅ | Good |
| originWeather (all) | ✅ 99.98% present | ✅ | Good |
| destinationWeather wind/gust/vis/ceil | ❌ 0% present | ✅ | **Backfill critical** |
| destinationWeather cat/ts/fz | ✅ 100% present | ✅ | Good |
| nasOrigin | ✅ 99.8% present | ✅ | Good |
| nasDestination | ✅ 99.8% present | ✅ | Good |
| carrierHealth.healthScore | ⚠️ 95.8% = 1 | ✅ | Backfill fixes feedback loop |
| carrierHealth.cancellationRate | ✅ 87% non-zero | ✅ | Already good |
| carrierHealth.avgDelay24h | ❌ 99.9% zero | ✅ | Backfill fixes |
| heuristicScore | ✅ 100% present | ✅ | Baseline only |
| horizon | ⚠️ 0% long horizon | ⚠️ Still none | Design limitation |
| isTest | ✅ 100% present | ✅ | But 97.5% test bias |

### Features to REMOVE (cannot be fixed)

| Feature | Why Remove |
|---------|------------|
| **historicalOtp** | 100% fallback — API plan doesn't support this endpoint. Adds zero signal. |
| **historicalOtpSampleSize** | 100% zero — same reason |
| **historicalOtpSource** | 100% fallback — same reason |
| **originWeather.hasFreezing** | 0% true — never occurs in summer data |
| **inboundAircraftDelay (as feature)** | Encodes the same information as delayMinutes — redundant. Keep as heuristic score component only. |
| **atcGroundStop / atcGroundDelay (as features)** | Encodes the same information as nasOrigin/nasDestination — redundant. Keep as heuristic score components only. |

### Final Recommended Feature Set (~18 features)

**For regression (predict delay minutes):**
- Flight metadata: carrier, origin, destination (one-hot encoded), departure hour
- Timing: hoursUntilDeparture, timeOfDayRisk, dayOfWeek, connectionRisk
- Weather (origin): flightCategory, windSpeedKt, gustSpeedKt, visibilityMiles, ceilingFt, hasThunderstorm
- Weather (destination): Same 6 fields
- NAS (origin + destination): hasGroundStop, hasGroundDelay, avgDelayMinutes
- Carrier: healthScore, cancellationRate

**For classification (predict amber/red tier):**
- Same features as regression
- PLUS: heuristicScore (as a baseline feature — model learns to adjust it)

---

## Part 3: Root Cause Summary

| Issue | Type | Root Cause | Fix |
|-------|------|------------|-----|
| delayMinutes 99.98% zero | Code bug | Bug #1: object before scalar in parser | ✅ Code fixed, need backfill |
| dest weather 4 fields missing | Code bug | Bug #3: monitor.ts only stored 3/7 fields | ✅ Code fixed, need backfill |
| historicalOtp always fallback | API limitation | AeroDataBox plan doesn't include history | Remove feature |
| carrier health feedback loop | Architecture | Reads from same table it writes to | Backfill breaks the loop |
| dayOfWeekRisk 51.8% null | Schema evolution | Field added to code later, old rows never updated | Backfill |
| Early rows have incomplete schema | Schema evolution | Code changed multiple times, old rows stale | Backfill |
| 47.9% negative hoursUntilDeparture | Design | Monitor re-scores departed flights | Document limitation |
| 97.5% test flights | Product stage | No real users yet | Expand seeder or launch |
| Zero long-horizon scores | Design | Monitor only queries today + tomorrow | Document limitation |
| 3 unconnected databases | Configuration drift | DATABASE_URL changed over time | Consolidate |

---

## Part 4: Remediation Plan

### Phase 0 — Database Consolidation (1-2 days)
- Export Replit Helium DB → import into Neon
- Deduplicate flights
- Point project to single database

### Phase 1 — Historical Backfill (2-3 days)
- Re-score all 796 monitored flights with the FIXED code
- Store results in new `risk_score_history_v2` table
- Verify: delays are non-zero, weather has all fields, dayOfWeekRisk is populated

### Phase 2 — Build ML Training Table (1 day)
- Create `ml_training_data` SQL table with flat columns
- Populate from `risk_score_history_v2`
- Remove dead features (historicalOtp, hasFreezing)
- Cap/transform as needed

### Phase 3 — Feature Analysis (3-5 days)
- Export to CSV
- Correlation matrix
- Feature importance (Random Forest or mutual information)
- Class imbalance handling

### Phase 4 — Model Training (starts after Phase 3)
- Random Forest / XGBoost baseline
- Compare against heuristic scorer
- Precision/recall for red/amber tiers
- Deploy in shadow mode first
