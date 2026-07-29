# Rescore Commands for Replit

## What This Does

Runs `server2/scripts/rescore_historical_v2.ts` — calls AeroDataBox API for each past flight to get real delay values, carrier health (with `DISTINCT ON` fix), ICAO codes from `iataToIcao()`, and all weather/signal data. Creates NEW rows in `clean.risk_score_history_v2` alongside old rows.

**Cost:** 2 units per flight at AeroDataBox Tier 1. For ~1,166 flights = ~2,332 units (~3.9% of monthly budget).

---

## Commands

### 1. Pull Latest Code (includes visib fix + DISTINCT ON fix + disabled seeder)

```bash
cd ~/project && git pull origin main
```

### 2. Run Rescore (parallel, default concurrency = 5)

```bash
cd ~/project/server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

This processes flights where `status = 'archived'` or `resolved_status IS NOT NULL`. Uses **5 concurrent workers** by default (no extra dependencies needed — uses built-in `mapConcurrent`).

### 3. (Optional) Run With Higher Concurrency to Finish Faster

```bash
cd ~/project/server2 && RESCORE_CONCURRENCY=10 npx tsx scripts/rescore_historical_v2.ts archived-only
```

Uses 10 concurrent workers. Each worker independently calls AeroDataBox + aviationweather.gov + nasstatus.faa.gov + carrier health DB query.

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
