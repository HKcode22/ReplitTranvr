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

---

## Part 5: Evidence & Verification — SQL Proof Commands

> All commands are PostgreSQL queries designed to be run against the `risk_score_history` table.
> Run these on Replit Shell with: `psql "$DATABASE_URL" -c "SELECT ..."`
> Or connect with: `psql "$DATABASE_URL"` then paste the queries.

### 5.1 Proof that delay = 0 in 99.98% of rows

```sql
-- Count total rows, zero delays, positive delays, NULLs
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE signals#>>'{flightStatus,delayMinutes}' = '0' OR signals#>>'{flightStatus,delayMinutes}' IS NULL) AS zero_or_null_delay,
  COUNT(*) FILTER (WHERE (signals#>>'{flightStatus,delayMinutes}')::int > 0) AS positive_delay,
  MAX((signals#>>'{flightStatus,delayMinutes}')::int) FILTER (WHERE signals#>>'{flightStatus,delayMinutes}' ~ '^\d+$') AS max_delay
FROM risk_score_history;

-- See the actual delay values (only 2 positive rows)
SELECT id, monitored_flight_id, signals#>>'{flightStatus,delayMinutes}' AS delay
FROM risk_score_history
WHERE (signals#>>'{flightStatus,delayMinutes}')::int > 0;
```

**Expected result**: `10,775 total`, `10,773 zero_or_null`, `2 positive`, `max=90`

### 5.2 Proof that destination weather is missing 4 of 7 fields

```sql
-- Count rows with each destination weather field present
SELECT
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,windSpeedKt}' IS NOT NULL) AS dest_wind_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,gustSpeedKt}' IS NOT NULL) AS dest_gust_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,visibilityMiles}' IS NOT NULL) AS dest_vis_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,ceilingFt}' IS NOT NULL) AS dest_ceiling_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,flightCategory}' IS NOT NULL) AS dest_category_present
FROM risk_score_history;
```

**Expected result**: `0, 0, 0, 0, 10775` — all 4 weather fields are 0% present while flightCategory is 100% present.

### 5.3 Proof that origin weather has all 7 fields

```sql
-- Compare origin vs destination weather completeness
SELECT
  COUNT(*) FILTER (WHERE signals#>>'{originWeather,windSpeedKt}' IS NOT NULL) AS origin_wind_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,windSpeedKt}' IS NOT NULL) AS dest_wind_present
FROM risk_score_history;
```

**Expected result**: `10,773 origin_wind_present` vs `0 dest_wind_present`.

### 5.4 Proof that historical OTP is 100% fallback (no real API data)

```sql
-- Check source of historical OTP data
SELECT
  signals#>>'{signals,historicalOtpSource}' AS source,
  COUNT(*) AS row_count
FROM risk_score_history
GROUP BY source;

-- Check if ANY row has sample size > 0
SELECT COUNT(*) AS rows_with_otp_sample
FROM risk_score_history
WHERE (signals#>>'{signals,historicalOtpSampleSize}')::int > 0;

-- Prove historicalOtp is 100% correlated with horizon (deterministic fallback)
SELECT
  signals#>>'{signals,horizon}' AS horizon,
  (signals#>>'{signals,historicalOtp}')::int AS otp_value,
  COUNT(*) AS row_count
FROM risk_score_history
WHERE signals#>>'{signals,horizon}' IS NOT NULL
GROUP BY horizon, otp_value
ORDER BY horizon, otp_value;
```

**Expected results**:
- Source: `aerodatabox = 0 rows`, `fallback = 5,323 rows`, `NULL = 5,452 rows`
- Sample size > 0: `0 rows`
- Correlation: `short → 2`, `medium → 3` — always the same per horizon

### 5.5 Proof that carrier health has a feedback loop (95.8% = score 1)

```sql
-- Carrier health score distribution
SELECT
  (signals#>>'{carrierHealth,healthScore}')::int AS health_score,
  COUNT(*) AS row_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM risk_score_history
GROUP BY health_score
ORDER BY health_score;

-- How many rows have avgDelay24h > 0
SELECT COUNT(*) AS rows_with_positive_avg_delay
FROM risk_score_history
WHERE (signals#>>'{carrierHealth,avgDelay24h}')::numeric > 0;
```

**Expected result**: `healthScore=1: 10,322 (95.8%)`, `avgDelay24h > 0: 12 rows (0.11%)`.

### 5.6 Proof that dayOfWeekRisk is 51.8% NULL (schema evolution)

```sql
-- Count NULL vs non-NULL dayOfWeekRisk by day of week
-- Extract day name from the departure_date field in monitored_flights
SELECT
  TO_CHAR(mf.departure_date::date, 'Day') AS day_name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE rsh.signals#>>'{signals,dayOfWeekRisk}' IS NULL) AS null_dayrisk,
  ROUND(100.0 * COUNT(*) FILTER (WHERE rsh.signals#>>'{signals,dayOfWeekRisk}' IS NULL) / COUNT(*), 1) AS null_pct
FROM risk_score_history rsh
JOIN monitored_flights mf ON rsh.monitored_flight_id = mf.id
GROUP BY TO_CHAR(mf.departure_date::date, 'Day')
ORDER BY day_name;
```

**Expected result**: Sunday=100% NULL, Monday=100% NULL, Tuesday=100% NULL, Wednesday=7.7% NULL, Thursday=90.7% NULL, Saturday=100% NULL.

### 5.7 Proof of Schema Evolution (field additions over time)

```sql
-- Show how the signals JSONB structure changed across rows
-- by checking which fields exist in the nested 'signals' object
SELECT
  MIN(id) AS first_row,
  MAX(id) AS last_row,
  COUNT(*) AS rows_in_version,
  COUNT(*) FILTER (WHERE signals#>>'{signals,dayOfWeekRisk}' IS NOT NULL) AS has_dayofweek,
  COUNT(*) FILTER (WHERE signals#>>'{signals,historicalOtpSampleSize}' IS NOT NULL) AS has_otp_samplesize,
  COUNT(*) FILTER (WHERE signals#>>'{signals,connectionRisk}' IS NOT NULL) AS has_connectionrisk,
  COUNT(*) FILTER (WHERE signals#>>'{signals,horizon}' IS NOT NULL) AS has_horizon
FROM risk_score_history
GROUP BY CASE
  WHEN id <= 18 THEN 'v1: 5 fields'
  WHEN id <= 5452 THEN 'v2: 12 fields'
  WHEN id <= 5581 THEN 'v3: 14 fields'
  ELSE 'v4: 15 fields'
  END
ORDER BY MIN(id);
```

### 5.8 Proof that 47.9% of rows have negative hoursUntilDeparture

```sql
SELECT
  CASE
    WHEN (signals#>>'{signals,hoursUntilDeparture}')::numeric < 0 THEN 'Negative (< 0)'
    WHEN (signals#>>'{signals,hoursUntilDeparture}')::numeric <= 4 THEN '0 to 4 hours'
    WHEN (signals#>>'{signals,hoursUntilDeparture}')::numeric <= 24 THEN '4 to 24 hours'
    WHEN (signals#>>'{signals,hoursUntilDeparture}')::numeric > 24 THEN '> 24 hours'
    ELSE 'NULL'
  END AS hours_range,
  COUNT(*) AS row_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM risk_score_history
GROUP BY hours_range
ORDER BY hours_range;
```

### 5.9 Proof that zero long-horizon scores exist

```sql
SELECT
  signals#>>'{signals,horizon}' AS horizon,
  COUNT(*) AS row_count
FROM risk_score_history
GROUP BY horizon;
```

**Expected**: `short=7,134`, `medium=3,622`, `NULL=19`, `long=0`.

### 5.10 Proof of class imbalance (88% green, 0.6% red)

```sql
SELECT
  tier,
  COUNT(*) AS row_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM risk_score_history
GROUP BY tier
ORDER BY tier;
```

### 5.11 Proof that 97.5% of flights are test flights

```sql
SELECT
  mf.is_test,
  COUNT(*) AS flight_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM monitored_flights mf
GROUP BY mf.is_test;

-- Count real user-monitored flights
SELECT COUNT(*) AS real_user_flights FROM user_monitored_flights;
```

### 5.12 Full feature sparsity matrix (one query to rule them all)

```sql
-- Run this to get a single table of feature completeness
SELECT
  COUNT(*) AS total_rows,

  -- Target variable
  COUNT(*) FILTER (WHERE signals#>>'{flightStatus,delayMinutes}' IS NOT NULL AND (signals#>>'{flightStatus,delayMinutes}')::int > 0) AS delay_gt_0,

  -- Flight status fields
  COUNT(*) FILTER (WHERE signals#>>'{flightStatus,status}' IS NOT NULL) AS status_present,
  COUNT(*) FILTER (WHERE signals#>>'{flightStatus,cancelled}' = 'true') AS cancelled_true,

  -- Signal scores
  COUNT(*) FILTER (WHERE signals#>>'{signals,dayOfWeekRisk}' IS NOT NULL) AS dayofweek_present,
  COUNT(*) FILTER (WHERE signals#>>'{signals,timeOfDayRisk}' IS NOT NULL) AS timeofday_present,
  COUNT(*) FILTER (WHERE signals#>>'{signals,historicalOtpSource}' = 'aerodatabox') AS otp_real_data,

  -- Weather (origin)
  COUNT(*) FILTER (WHERE signals#>>'{originWeather,windSpeedKt}' IS NOT NULL) AS orig_wind_present,
  COUNT(*) FILTER (WHERE signals#>>'{originWeather,gustSpeedKt}' IS NOT NULL) AS orig_gust_present,
  COUNT(*) FILTER (WHERE signals#>>'{originWeather,visibilityMiles}' IS NOT NULL) AS orig_vis_present,

  -- Weather (destination)
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,windSpeedKt}' IS NOT NULL) AS dest_wind_present,
  COUNT(*) FILTER (WHERE signals#>>'{destinationWeather,gustSpeedKt}' IS NOT NULL) AS dest_gust_present,

  -- NAS
  COUNT(*) FILTER (WHERE signals#>>'{nasOrigin,hasGroundStop}' IS NOT NULL) AS nas_origin_present,
  COUNT(*) FILTER (WHERE signals#>>'{nasOrigin,avgDelayMinutes}' IS NOT NULL AND (signals#>>'{nasOrigin,avgDelayMinutes}')::int > 0) AS nas_delay_gt_0,

  -- Carrier
  COUNT(*) FILTER (WHERE signals#>>'{carrierHealth,healthScore}' = '1') AS carrier_health_1,
  COUNT(*) FILTER (WHERE signals#>>'{carrierHealth,cancellationRate24h}' IS NOT NULL AND (signals#>>'{carrierHealth,cancellationRate24h}')::numeric > 0) AS carrier_cancel_gt_0
FROM risk_score_history;
```

### 5.13 Verify the score distribution

```sql
SELECT
  CASE
    WHEN score <= 4 THEN '0-4'
    WHEN score <= 9 THEN '5-9'
    WHEN score <= 14 THEN '10-14'
    WHEN score <= 19 THEN '15-19'
    WHEN score <= 24 THEN '20-24'
    WHEN score <= 29 THEN '25-29'
    WHEN score <= 34 THEN '30-34'
    WHEN score <= 39 THEN '35-39'
    WHEN score <= 49 THEN '40-49'
    WHEN score <= 59 THEN '50-59'
    ELSE '60+'
  END AS score_range,
  COUNT(*) AS row_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM risk_score_history
GROUP BY score_range
ORDER BY MIN(score);

-- Summary stats
SELECT
  MIN(score), MAX(score), ROUND(AVG(score), 1), ROUND(STDDEV(score), 1)
FROM risk_score_history;
```

### 5.14 Quick one-liner health check

```bash
# Run all critical checks at once (Replit Shell)
psql "$DATABASE_URL" -c "
SELECT 'Total rows' AS check, COUNT(*)::text FROM risk_score_history
UNION ALL SELECT 'delay=0', COUNT(*)::text FROM risk_score_history WHERE (signals#>>''{flightStatus,delayMinutes}'')::int = 0
UNION ALL SELECT 'delay>0', COUNT(*)::text FROM risk_score_history WHERE (signals#>>''{flightStatus,delayMinutes}'')::int > 0
UNION ALL SELECT 'dest_wind_missing', COUNT(*)::text FROM risk_score_history WHERE signals#>>''{destinationWeather,windSpeedKt}'' IS NULL
UNION ALL SELECT 'otp_fallback', COUNT(*)::text FROM risk_score_history WHERE signals#>>''{signals,historicalOtpSource}'' = ''fallback''
UNION ALL SELECT 'otp_real', COUNT(*)::text FROM risk_score_history WHERE signals#>>''{signals,historicalOtpSource}'' = ''aerodatabox''
UNION ALL SELECT 'dayOfWeekRisk NULL', COUNT(*)::text FROM risk_score_history WHERE signals#>>''{signals,dayOfWeekRisk}'' IS NULL
UNION ALL SELECT 'long_horizon', COUNT(*)::text FROM risk_score_history WHERE signals#>>''{signals,horizon}'' = ''long''
UNION ALL SELECT 'carrier_health=1', COUNT(*)::text FROM risk_score_history WHERE (signals#>>''{carrierHealth,healthScore}'')::int = 1;
"
```

---

## Part 6: API Configuration & Environment Variables

### 6.1 Complete API Key Inventory

| Variable | Service | Purpose | Used In |
|----------|---------|---------|---------|
| `DATABASE_URL` | PostgreSQL (Neon/Helium) | Database connection | `db.ts`, `drizzle.config.ts` |
| `AERODATABOX_API_KEY` | AeroDataBox | Flight status, schedules, historical data | `flightStatus.ts`, `historicalOtp.ts`, `testFlightSeeder.ts` |
| `SENDGRID_API_KEY` | SendGrid | Email alerts for disruptions | `alertSender.ts` |
| `SERPAPI_KEY` | SerpAPI | Google Flights alternative search | `alternativeFinder.ts` |
| `ANTHROPIC_API_KEY` | Anthropic Claude | AI summaries, proposal personalization | `callSummary.ts`, `proposalEmailPersonalizer.ts` |
| `BLAND_AI_API_KEY` | Bland AI | AI phone calls for traveler notifications | `bland.ts`, `routes.ts` |
| `EXPEDIA_API_KEY` / `EXPEDIA_SECRET` | Expedia Rapid | Hotel search & booking | `expediaRapid.ts` |
| `RATEHAWK_API_KEY` | RateHawk | Hotel search & booking | `ratehawk.ts` |
| `HOTELBEDS_API_KEY` / `HOTELBEDS_SECRET` | Hotelbeds | Hotel search & booking | `hotelbeds.ts` |
| `DUFFEL_API_TOKEN` | Duffel | Flight search & booking | `routes.ts` |
| `STRIPE_SECRET_KEY` | Stripe | Payment processing | (Stripe SDK) |

### 6.2 How to Check API Keys on Replit

**On Replit Shell:**
```bash
# Check if a specific API key is set
echo "AeroDataBox: $AERODATABOX_API_KEY"
echo "SendGrid: ${SENDGRID_API_KEY:0:8}..."  # shows first 8 chars only
echo "Anthropic: ${ANTHROPIC_API_KEY:0:8}..."
echo "SerpAPI: ${SERPAPI_KEY:0:8}..."
echo "Bland AI: ${BLAND_AI_API_KEY:0:8}..."
echo "Expedia: ${EXPEDIA_API_KEY:0:8}..."
echo "RateHawk: ${RATEHAWK_API_KEY:0:8}..."
echo "Hotelbeds: ${HOTELBEDS_API_KEY:0:8}..."
echo "Duffel: ${DUFFEL_API_TOKEN:0:8}..."
echo "Database: ${DATABASE_URL:0:30}..."

# Check if the DATABASE_URL is pointing to Neon or Helium
echo "$DATABASE_URL" | sed 's/.*@//' | sed 's/\/.*//'
# Neon → shows something like "us-east-1.aws.neon.tech"
# Helium → shows "helium"
```

**On Replit Secrets UI:**
- Go to your Replit project
- Click the 🔒 **Secrets** tab (lock icon) in the sidebar
- All environment variables are listed there
- You can edit, add, or delete them

### 6.3 AeroDataBox Plan Limitations

The AeroDataBox API is used for 3 different endpoints that require different plan tiers:

| Endpoint | Used In | Status on Current Plan | 
|----------|---------|----------------------|
| `/flights/number/{flight}` | `flightStatus.ts` | ✅ Working (returns live flight status) |
| `/flights/number/{flight}/history/recent` | `historicalOtp.ts` | ❌ **Always returns 404** — not included on current plan |
| `/airports/iata/{code}/departures` | `testFlightSeeder.ts` | ✅ Working (returns departure boards) |

**What this means**: The `historicalOtp` feature cannot be fixed by re-scoring or code changes. It requires a higher-tier AeroDataBox plan that includes the historical endpoint. Until that plan change, this feature should be removed from ML training.

### 6.4 Database Connection Discovery

```bash
# Find which database the project is currently writing to
echo "Current DATABASE_URL: $DATABASE_URL"
# Check if it's Neon:
echo "$DATABASE_URL" | grep -q "neon.tech" && echo "→ Using NEON" || echo "→ Using Helium (Replit internal)"
```

---

## Part 7: New Clean Table Design — Industry Standard Flat Schema

### 7.1 The Problem with the Current Schema

The current `risk_score_history.signals` column is a single JSONB blob that stores 30+ nested fields:
```sql
signals: jsonb  -- contains EVERYTHING nested inside
```

**Why this is bad:**
- Cannot create indexes on specific fields
- Cannot use standard comparison operators (`WHERE delay > 15`)
- ML frameworks (pandas, sklearn) cannot parse JSONB directly — must extract first
- Every query requires JSON path traversal (`signals#>>'{flightStatus,delayMinutes}'`)
- Schema changes silently leave old rows incomplete (see Part 1.29)
- No type enforcement — a string can end up in a numeric field

### 7.2 Proposed New Tables

#### `risk_score_history_v2` — Flat, Typed, ML-Ready

```sql
-- Run this AFTER creating the server2/ migration
CREATE TABLE IF NOT EXISTS risk_score_history_v2 (
  -- Identifiers
  id SERIAL PRIMARY KEY,
  monitored_flight_id INTEGER NOT NULL REFERENCES monitored_flights_v2(id),
  scored_at TIMESTAMP DEFAULT NOW(),

  -- === TARGET VARIABLES ===
  actual_delay_minutes INTEGER,          -- delay from AeroDataBox (ML regression target)
  actual_cancelled BOOLEAN,              -- cancellation flag (ML classification target)
  actual_status TEXT,                     -- flight status string

  -- === HEURISTIC BASELINE ===
  heuristic_score INTEGER NOT NULL,
  heuristic_tier TEXT NOT NULL CHECK (heuristic_tier IN ('green', 'amber', 'red')),
  heuristic_horizon TEXT CHECK (heuristic_horizon IN ('short', 'medium', 'long')),
  hours_until_departure NUMERIC(6,1),

  -- === TIMING FEATURES ===
  time_of_day_risk INTEGER CHECK (time_of_day_risk BETWEEN 0 AND 5),
  day_of_week_risk INTEGER CHECK (day_of_week_risk BETWEEN 0 AND 4),
  connection_risk INTEGER CHECK (connection_risk BETWEEN 0 AND 4),
  departure_hour INTEGER CHECK (departure_hour BETWEEN 0 AND 23),
  departure_day_of_week INTEGER CHECK (departure_day_of_week BETWEEN 0 AND 6),

  -- === WEATHER FEATURES (ORIGIN) ===
  origin_icao TEXT,
  origin_flight_category TEXT CHECK (origin_flight_category IN ('VFR', 'MVFR', 'IFR', 'LIFR', 'UNKNOWN')),
  origin_wind_speed_kt NUMERIC(5,1),
  origin_gust_speed_kt NUMERIC(5,1),
  origin_visibility_miles NUMERIC(5,1),
  origin_ceiling_ft INTEGER,
  origin_has_thunderstorm BOOLEAN,
  origin_has_freezing BOOLEAN,

  -- === WEATHER FEATURES (DESTINATION) ===
  destination_icao TEXT,
  destination_flight_category TEXT CHECK (destination_flight_category IN ('VFR', 'MVFR', 'IFR', 'LIFR', 'UNKNOWN')),
  destination_wind_speed_kt NUMERIC(5,1),
  destination_gust_speed_kt NUMERIC(5,1),
  destination_visibility_miles NUMERIC(5,1),
  destination_ceiling_ft INTEGER,
  destination_has_thunderstorm BOOLEAN,
  destination_has_freezing BOOLEAN,

  -- === NAS FEATURES ===
  origin_has_ground_stop BOOLEAN DEFAULT FALSE,
  origin_has_ground_delay BOOLEAN DEFAULT FALSE,
  origin_nas_avg_delay_minutes INTEGER DEFAULT 0,
  destination_has_ground_stop BOOLEAN DEFAULT FALSE,
  destination_has_ground_delay BOOLEAN DEFAULT FALSE,
  destination_nas_avg_delay_minutes INTEGER DEFAULT 0,

  -- === CARRIER FEATURES ===
  carrier_iata TEXT,
  carrier_cancellation_rate_24h NUMERIC(5,4),
  carrier_avg_delay_24h NUMERIC(6,1),
  carrier_health_score INTEGER CHECK (carrier_health_score IN (1, 3, 4, 7, 10)),
  carrier_reliable BOOLEAN,

  -- === AIRCRAFT FEATURES ===
  tail_number TEXT,
  equipment_type TEXT,

  -- === METADATA ===
  is_test_flight BOOLEAN DEFAULT FALSE,

  -- === SIGNAL SUB-SCORES (for interpretability) ===
  signal_inbound_aircraft_delay INTEGER DEFAULT 0,
  signal_atc_ground_stop INTEGER DEFAULT 0,
  signal_atc_ground_delay INTEGER DEFAULT 0,
  signal_origin_weather INTEGER DEFAULT 0,
  signal_destination_weather INTEGER DEFAULT 0,
  signal_carrier_health INTEGER DEFAULT 0,
  signal_time_of_day INTEGER DEFAULT 0,
  signal_day_of_week INTEGER DEFAULT 0,
  signal_connection_risk INTEGER DEFAULT 0
);

-- Indexes for ML querying
CREATE INDEX idx_risk_v2_flight_id ON risk_score_history_v2(monitored_flight_id);
CREATE INDEX idx_risk_v2_scored_at ON risk_score_history_v2(scored_at);
CREATE INDEX idx_risk_v2_delay ON risk_score_history_v2(actual_delay_minutes);
CREATE INDEX idx_risk_v2_tier ON risk_score_history_v2(heuristic_tier);
```

#### `monitored_flights_v2` — Clean, Normalized Flight Table

```sql
CREATE TABLE IF NOT EXISTS monitored_flights_v2 (
  id SERIAL PRIMARY KEY,
  flight_number TEXT NOT NULL,
  carrier_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT,
  departure_time_utc TIMESTAMP,
  origin_iata TEXT NOT NULL,
  origin_name TEXT,
  destination_iata TEXT NOT NULL,
  destination_name TEXT,

  -- Current status (updated by monitor)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  risk_score INTEGER,
  risk_tier TEXT CHECK (risk_tier IN ('green', 'amber', 'red')),
  last_checked_at TIMESTAMP,
  red_tier_first_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Resolution (set when flight is done)
  resolved_status TEXT,
  resolved_delay_minutes INTEGER,
  resolved_at TIMESTAMP,

  -- Aircraft
  tail_number TEXT,
  equipment_type TEXT,
  equipment_group TEXT,  -- 'Boeing', 'Airbus', 'Embraer', 'Other'

  -- Metadata
  is_test BOOLEAN DEFAULT FALSE,
  agency_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  -- JSONB only for raw API response (not for core data)
  raw_api_data jsonb
);

-- Indexes
CREATE INDEX idx_mf_v2_status ON monitored_flights_v2(status);
CREATE INDEX idx_mf_v2_date ON monitored_flights_v2(departure_date);
CREATE INDEX idx_mf_v2_carrier ON monitored_flights_v2(carrier_iata);
```

### 7.3 Benefits of Flat Schema

| Aspect | Old (JSONB) | New (Flat Columns) |
|--------|-------------|-------------------|
| Query speed | Slow — must parse JSONB on every read | Fast — direct column access |
| Indexing | Cannot index nested fields | Can index any column |
| Type safety | No enforcement | CHECK constraints, typed columns |
| ML framework | Must extract/parse first | Direct CSV export |
| Schema evolution | Silent drift, NULL surprises | ALTER TABLE is explicit |
| Readability | `signals#>>'{carrierHealth,avgDelay24h}'` | `carrier_avg_delay_24h` |
| Data quality | Bugs hide in JSONB | NULLs are visible immediately |

### 7.4 Migration Path

```bash
# Step 1: Create the new tables
psql "$DATABASE_URL" -f server2/db/migrations/0001_create_v2_tables.sql

# Step 2 (optional): Copy existing data into the new flat schema
# This extracts and flattens JSONB into typed columns
# See server2/scripts/backfill_v2.ts

# Step 3: Point the app to the new tables
# In db.ts, import v2 tables instead of originals
```

---

## Part 8: Industry Standard Practices for Aviation Disruption Monitoring

### 8.1 Data Architecture Standards

**What the aviation industry (and professional data teams) does:**

| Practice | Industry Standard | Our Current State | Gap |
|----------|-----------------|-------------------|-----|
| **Flat tables for ML** | All training data in flat, typed columns | JSONB blob with 30+ nested fields | 🔴 Major |
| **Separate OLTP and OLAP** | Transaction DB separate from analytical DB | Single DB, single table for both | 🔴 Major |
| **Schema versioning** | Explicit migrations, never silent schema changes | Code changes silently alter JSONB shape | 🔴 Major |
| **Idempotent data pipeline** | Re-running pipeline produces same results | Re-scoring with bugs produced corrupt data | 🔴 Major |
| **Data quality checks** | Automated checks on every write (delay >= 0, etc.) | None — any value goes into JSONB | 🔴 Major |
| **Backfilling** | When schema changes, old data is migrated | Old rows are never updated | 🔴 Major |

### 8.2 Recommended Pipeline Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  AeroDataBox  │    │  FAA NAS     │    │  METAR       │
│  (Flight API) │    │  (Ground Stops)│   │  (Weather)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Raw Ingestion Layer                      │
│  (store API responses verbatim, no transformation)   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Transformation Layer                     │
│  (extract, validate, type-cast, compute features)    │
│  - Validate delay >= 0                               │
│  - Check weather coverage                            │
│  - Log data quality metrics                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│           ML-Ready Data Warehouse                    │
│  (flat, typed, indexed, versioned)                   │
│  risk_score_history_v2 table                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Model Training                           │
│  (export CSV, train, evaluate, deploy)               │
└─────────────────────────────────────────────────────┘
```

### 8.3 Data Quality Checks That Should Exist

Before writing a score to the database, a monitoring system should verify:

```typescript
// Industry-standard data quality assertions
function validateScore(risk: RiskScoreResult): boolean {
  const checks = [
    risk.score >= 0 && risk.score <= 100,          // Score in valid range
    risk.flightStatus?.delayMinutes === null ||     // Delay is null or non-negative
      risk.flightStatus.delayMinutes >= 0,
    risk.originWeather.windSpeedKt >= 0,           // Wind speed isn't negative
    risk.originWeather.flightCategory !== null,     // Weather category exists
    risk.signals.horizon !== null,                  // Horizon is set
    risk.signals.hoursUntilDeparture === null ||    // hoursUntilDeparture is reasonable
      Math.abs(risk.signals.hoursUntilDeparture) < 168,  // max 1 week
  ];

  const allPass = checks.every(c => c === true);
  if (!allPass) {
    console.error(`[quality] SCORE REJECTED for flight ${flightNumber}:`, checks);
  }
  return allPass;
}
```

### 8.4 Monitoring Best Practices

| Practice | Why It Matters | Our Status |
|----------|---------------|------------|
| **Track delay sources separately** | Know whether delays are weather, ATC, or carrier-caused | ✅ Partially (NAS separate from weather) |
| **Log every API failure with error code** | Debug without needing to reproduce | ❌ Bug #4 fixed this (was silent failures) |
| **Alert when data quality drops** | Know immediately if delay=0 for 5 weeks | ❌ Never detected the bug |
| **Version the data schema** | Know which code version produced each row | ❌ No version field in schema |
| **P95/P99 monitoring** | Watch for tail latency in scoring | ❌ Not implemented |
| **A/B test scoring changes** | Compare new vs old logic side by side | ❌ Not implemented |

### 8.5 Learning from the Current Issues

The 4 bugs found in this codebase are **exactly the types of bugs** that plague early-stage ML systems:

1. **Silent fallback** (historicalOtp): API returns 404, system returns default values with no warning → ML trains on fake data
2. **Type confusion** (Bug #1): `delay` object treated as `delayMinutes` number → all values become 0
3. **Incomplete mapping** (Bug #3): Copy-paste of weather block missed 4 fields → 100% missing data
4. **Self-referential loop** (carrierHealth): System reads its own corrupt output → feedback loop reinforces errors

**The fix for all of these**: Separate the scoring logic from the data storage. Write raw API responses to one table, compute features in a transformation layer, and store ML-ready data separately. This is the industry standard for a reason.

---

## Part 9: My Analysis — Is the Database Actually Messy?

**Short answer: Yes, it is messy.** But not hopelessly so. Here's my honest assessment:

### What's Actually Bad (Not Just in Your Head)

| Problem | Severity | Verdict |
|---------|----------|---------|
| delay=0 in 99.98% of rows | 🔴 CRITICAL | The target variable is corrupt. Any ML trained on this is worthless. |
| JSONB design for ML data | 🔴 CRITICAL | No professional system stores ML training data in a single JSONB blob. This needs to change. |
| 3 unconnected databases | 🟡 CONCERNING | Data is split across 3 places. Nobody knows which is the source of truth. |
| Carrier health feedback loop | 🟡 CONCERNING | System reads from the same table it writes to. This is a design flaw. |
| Schema evolution without migration | 🟡 CONCERNING | Every code deploy silently changed the data shape. Old rows abandoned. |
| No data quality monitoring | 🟡 CONCERNING | Bugs ran for 5 weeks without detection. |

### What's Not Actually Bad (Just Normal Growing Pains)

| Concern | Reality |
|---------|---------|
| "97.5% of flights are test flights" | **Normal for pre-launch.** Every system before launch has synthetic data. Document it in ML training (add `isTest` as a feature). |
| "Only 20 real user flights" | **Expected.** You can't have real user flights without real users. Focus on making the system correct first, then the data will come. |
| "20.6% Unknown flight status" | **Expected from AeroDataBox.** The API doesn't recognize every flight number for every date. This happens in production systems too. |
| "47.9% negative hoursUntilDeparture" | **Design choice, not a bug.** The monitor re-scores departed flights. Filter the data for prediction use cases. |
| "Only 12 origin airports" | **Seeder limitation.** Expand the seeder if you need more variety. Not a database problem. |

### Is It All in Your Head?

**No.** Your instinct that something is wrong was correct. The data pipeline has real, systemic issues. Here's why you should trust your concern:

1. **The monitor stopped populating on June 11** — that was the first red flag that something was broken
2. **The delay=0 result "felt wrong"** — because it is wrong. A system that monitors flights and never sees delays is definitely broken
3. **The JSONB structure "felt messy"** — because it is. Storing ML training data in a JSONB blob violates every database design principle
4. **The multiple databases "felt wrong"** — because they are. Having 3 databases with overlapping data is configuration drift

**However**, the situation is recoverable. None of the bugs are architectural dead ends:

- The 4 code bugs are **fixed** (pushed to GitHub)
- The historical data can be **re-scored** (backfill script)
- The JSONB can be **migrated to flat tables** (new schema designed in Part 7)
- The databases can be **consolidated** (export + import)
- The carrier feedback loop **breaks automatically** once delays are real

**Verdict**: The database is messy, but it's a **repairable mess**. Not a rebuild-from-scratch situation. The plan in Part 4 (consolidate → backfill → flat tables → ML) is the right approach.

### What Would Worry Me (If This Were My Project)

1. **If the AeroDataBox API plan can't be upgraded** — the historical OTP feature stays dead forever
2. **If more code paths have silent fallbacks** — there could be other bugs we haven't found
3. **If the team keeps editing `server/` directly** — the `server2/` approach (Part 10) is safer

---

## Part 10: Safe Development Strategy — server2/ Workflow

### 10.1 Why server2/ Exists

A duplicate of `server/` has been created at `server2/`. This is your safe sandbox to redesign the data pipeline without touching the running production code.

### 10.2 How to Work with server2/

```
server/     → Original code (PRODUCTION — DO NOT EDIT)
server2/    → New development (SANDBOX — make all changes here)
```

**I recommend this workflow:**

```bash
# Step 1: Make changes in server2/
# Edit files in server2/lib/disruption/*.ts

# Step 2: Create new tables using server2's schema
# Add new table definitions to server2/db/schema.ts

# Step 3: Test with a script
tsx server2/scripts/test_new_pipeline.ts

# Step 4: When confident, copy specific files back to server/
cp server2/lib/disruption/newFile.ts server/lib/disruption/
```

### 10.3 What to Build in server2/

In priority order:

1. **New table schema** (`server2/db/schema_v2.ts`) — flat, typed tables from Part 7
2. **New data pipeline** (`server2/lib/disruption/pipeline/`) — extraction layer that writes raw API responses first
3. **Backfill script** (`server2/scripts/backfill_v2.ts`) — re-score historical flights into v2 tables
4. **Validation script** (`server2/scripts/validate_v2.ts`) — run data quality checks on v2 data
5. **ML export** (`server2/scripts/export_ml_csv.ts`) — export v2 tables directly to CSV

### 10.4 Switching Between Tables

```typescript
// In server2/db.ts — swap which tables are imported
// Option A: Use old tables (original server behavior)
// import { riskScoreHistory, monitoredFlights } from '../shared/schema';

// Option B: Use new tables (new pipeline)
// import { riskScoreHistoryV2, monitoredFlightsV2 } from './schema_v2';
```

### 10.5 Safety Rules

1. **Never edit files in `server/` directly.** All experiments go in `server2/`.
2. **Keep the original schema in `shared/schema.ts` untouched.** Define new tables in `server2/db/schema_v2.ts`.
3. **Use `server2/scripts/` for one-off scripts** (backfill, validation, export).
4. **Only copy working code from `server2/` back to `server/`** when it's been tested.
5. **The `risk_score_history` and `monitored_flights` tables are untouched.** The new pipeline writes to `risk_score_history_v2` and `monitored_flights_v2`.
