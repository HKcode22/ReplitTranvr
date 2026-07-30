# Rescore Commands for Replit

## What This Does

Runs `server2/scripts/rescore_historical_v2.ts` — calls AeroDataBox API for each past flight to get real delay values, carrier health (with `DISTINCT ON` fix), ICAO codes from `iataToIcao()`, and all weather/signal data. Creates NEW rows in `clean.risk_score_history_v2` alongside old rows.

**Cost per flight:** 2 units for the primary call + 3 units for each retry/fallback. The code retries up to 3 times per flight (primary, spaced format, FIDS airport endpoint). For ~1,166 flights, worst case = ~8,400 units (14% of monthly budget).

**⚠️ IMPORTANT: HTTP 429 Rate Limiting**

Previous rescore runs are hitting **HTTP 429 (Too Many Requests)** on every API call. The AeroDataBox monthly quota may be exhausted. See section below for diagnosis and fix.

---

## Commands

### 1. Diagnose API Quota Status First

Run a single test call to see if the API is responding:

```bash
cd ~/project/server2 && npx tsx -e "
import { getFlightStatus } from './lib/disruption/flightStatus';
const result = await getFlightStatus('AA100', '2026-07-28', 'ORD', 'LAX');
console.log('API result:', result ? 'OK - delay=' + result.delayMinutes : 'NULL - API quota likely exhausted');
"
```

If result is NULL or shows HTTP 429: **the monthly quota is exhausted.** Wait until the next billing cycle.

### 2. Pull Latest Code

```bash
cd ~/project && git pull origin main
```

### 3. Run Rescore With Rate Limit Protection (concurrency=1, slow)

```bash
cd ~/project/server2 && RESCORE_CONCURRENCY=1 AERO_MIN_INTERVAL_MS=2000 npx tsx scripts/rescore_historical_v2.ts archived-only
```

Uses **1 worker** (no concurrency) with **2 seconds** between API calls. This is the safest setting to avoid 429 errors. For ~1,166 flights at 2 sec each = ~39 minutes.

### 4. (Only if API quota allows) Run With Faster Settings

```bash
cd ~/project/server2 && RESCORE_CONCURRENCY=3 AERO_MIN_INTERVAL_MS=1500 npx tsx scripts/rescore_historical_v2.ts archived-only
```

Uses 3 workers with 1.5 second spacing. For ~1,166 flights = ~10 minutes.

### 4. Verify Results

```bash
# Count new rows created today
cd ~/project/server2 && npx tsx -e "
import { sql } from 'drizzle-orm';
import { db } from './db';
const result = await db.execute(sql\`
  SELECT COUNT(*) as new_rows, 
         SUM(CASE WHEN actual_delay_minutes > 0 THEN 1 ELSE 0 END) as delayed,
         SUM(CASE WHEN origin_icao IS NOT NULL THEN 1 ELSE 0 END) as with_icao
  FROM clean.risk_score_history_v2
  WHERE scored_at > NOW() - INTERVAL '1 hour'
\`);
console.log(result.rows[0]);
"
```

---

## What Gets Fixed

| Issue | Before Rescore | After Rescore |
|-------|---------------|---------------|
| `origin_icao` null (68% of rows) | Missing ICAO codes | Populated from `iataToIcao()` via weather signal |
| `destination_icao` null (68% of rows) | Missing ICAO codes | Populated from `iataToIcao()` via weather signal |
| `actual_delay_minutes` null (past flights) | No delay data | Real delay from AeroDataBox historical lookup |
| `day_of_week_risk` null (May-Jun data) | Missing | Computed correctly in new rows |
| Carrier health (duplicate skew) | Averaged over duplicate rows | Correct — `DISTINCT ON` per flight, latest row only |
| `tail_number` missing (59% of rows) | Not available | Populated if AeroDataBox returns it |
| `equipment_type` missing (3%) | Not available | Populated if AeroDataBox returns it |

## What Does NOT Get Fixed

| Issue | Reason |
|-------|--------|
| `destination_weather` null for May-Jun | Historical weather API doesn't exist |
| Jul 29 future flights with null delay | They haven't departed yet — can't have a delay |
| Old rows with null ICAO (they stay in DB) | Rescore does INSERT, not UPDATE. Old rows remain. ML should use latest `scored_at` per flight. |

---

## Expected Output

```
[rescore] Found ~1166 archived/resolved flights to rescore (concurrency=5)
[rescore] progress: 50/1166
[rescore] progress: 100/1166
[rescore] progress: 150/1166
...
[rescore] progress: 1150/1166
[rescore] progress: 1166/1166
[rescore] Done
```

Each flight takes ~2-5 seconds (AeroDataBox API + weather + NAS + DB writes). With 5 concurrent workers, ~1166 flights takes **~8-15 minutes**.

---

## Expected Data Changes

| Metric | Before | After |
|--------|--------|-------|
| Total rows in risk_score_history_v2 | ~19,717 | ~20,883 (+1,166 new rows) |
| Non-zero delay rows | ~2,360 | ~3,526 (new rescore adds real delays) |
| ICAO populated rows | ~6,248 (32%) | ~7,414 (36%) |
| Carrier health null rows | 1 | 0 |

---

## After Rescore

1. Verify: run the SQL queries in Section 21.4 of `DATABASE_QUALITY_AND_ML_ROADMAP_5.md`
2. Archive excess active flights down to 41 max
3. Start monitor: `cd ~/project/server2 && npm run dev`
4. Wait 3-5 days for ML training data
