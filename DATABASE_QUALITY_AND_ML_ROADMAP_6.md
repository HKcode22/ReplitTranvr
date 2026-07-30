# Database Quality & ML Roadmap — Part 6

## Diagnostics, API Quota Analysis, and Code Fixes (Jul 29)

---

## 24. Summary of Findings from replitshell3.md (Latest Rescore Run)

### 24.1 The Rescore Is Failing Completely

The rescore run (`npx tsx scripts/rescore_historical_v2.ts archived-only`) processed 1,956 flights but **every single AeroDataBox API call returned HTTP 429 (Too Many Requests).** This means the rescore created 1,956 new rows in `risk_score_history_v2` with **all null values** for `actual_delay_minutes`, `actual_status`, `actual_cancelled`, and `inbound_delay_raw_minutes`.

From the log (`replitshell3.md`):

```
[flightStatus] HTTP 429 for "AA4551" 2026-05-19
[flightStatus] HTTP 429 for "AA 4551" 2026-05-19    ← retry with spaced format
[flightStatus] FIDS fallback ORD 2026-05-19 for AA4551  ← FIDS also 429s
[flightStatus] no result for AA4551 2026-05-19
```

**Every flight follows this pattern: primary call → 429 → spaced format → 429 → FIDS → 429 → no result.**

### 24.2 Root Cause: API Quota Likely Exhausted

The AeroDataBox plan provides **60,000 units/month** for $32. Based on the current CSV:

| Item | Calls | Units |
|------|-------|-------|
| Flight status calls (19,717 rows × 2 units) | 19,717 | 39,434 |
| Historical OTP (1,281 flights × 6 units) | 1,281 | 7,686 |
| Airport departures (seeder, FIDS fallbacks, etc.) | many | unknown |
| **Estimated total consumed** | | **~48,000+** |
| **Monthly budget** | | **60,000** |
| **Remaining** | | **~12,000** |

The estimate is 48,000+ units consumed. But this doesn't include:
- FIDS fallback calls (3 units each) — every failed flight makes 3 calls
- Test seeder airport departures calls (3 units each)
- Previous rescore runs that may have already consumed quota

**With 1,956 flights × 3 retries each = 5,868 calls × 2-3 units = ~12,000-17,000 units for a single rescore run.** If the account had less than this remaining, all calls would get 429d.

### 24.3 Carrier Health Is Computing from Null Delay Rows → All Zeros

The carrier health query (`carrierHealth.ts:64-80`) reads `actual_delay_minutes` from the last 24 hours of scored rows:

```typescript
const since = new Date(now - 24 * 60 * 60 * 1000);
// ... queries rsh.scored_at >= since ...
```

Since the rescore created 1,956 rows with null delays in the last 24 hours, the carrier health query sees:

```
AA sample=11 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
UA sample=10 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
DL sample=15 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
```

**Carrier health shows 0.0 avg delay for every carrier**, which means `healthScore=1` (best possible). This is wrong. Carrier health should reflect real delays, but it can't because all the recent rows have null delays.

**The cascade of failures:**
```
Rescore API calls fail (429) → rows written with null delay
                          → carrier health reads null delays → 0.0 avg
                          → heuristic signal_inbound = 0 (null)
                          → heuristic always predicts "green"
                          → ML training data is corrupted
```

### 24.4 Why New Data Has Null Delay (Even Departed Flights)

The "new" rows in the CSV (about 492 rows added by this rescore run) have null delays because:
1. The rescore script calls AeroDataBox for each flight
2. AeroDataBox returns 429 (quota exhausted)
3. `getFlightStatus()` returns null
4. The old code still wrote a row with `actual_delay_minutes = NULL` ← **this is now fixed**
5. For the monitor (not rescore): July 29 rows have null delay because those flights haven't departed yet

**The fix applied:** The rescore script now checks if `risk.flightStatus` is null (meaning the API call failed) and **skips writing a row** instead of writing a useless null-filled row.

### 24.5 The HTTP 429 Retry Storm

Each flight triggers up to 3 API calls through `aerodataboxFetch` (the serial queue with 1-second spacing):

1. **Primary call**: `flights/number/AA4551/2026-05-19` → 429
2. **Spaced format retry**: `flights/number/AA%204551/2026-05-19` → 429
3. **FIDS fallback**: `flights/airports/iata/ORD/2026-05-19T.../...` → 429

With 5 concurrent workers and 1-second spacing, 3 calls per flight × 1,956 flights = 5,868 API calls. If the API has a sustained rate limit below 1 req/sec or the monthly quota is exhausted, ALL of these fail.

---

## 25. API Budget Reality Check

### 25.1 Estimated API Consumption

| Source | Estimated Units/Month | % of Budget |
|--------|----------------------|-------------|
| Monitor (41 flights × 720 cycles × 2 units) | 59,040 | 98.4% |
| Historical OTP (one-time per new flight) | ~60 | 0.1% |
| Rescore (one-time, 1,166 flights) | ~2,332 | 3.9% |
| **Total monitor + rescore** | **~61,432** | **102.4%** ❌ |

**The monitor alone uses 59,040 units (98.4% of budget).** Adding the rescore pushes it over budget. This explains the 429 errors.

### 25.2 What's Using All the Units

The chart doesn't match reality because:
- The monitor hasn't been running consistently (it was stopped/restarted)
- Previous rescore runs consumed ~2,300 units each
- The test flight seeder consumed additional units
- FIDS fallbacks during rescore consume extra units

### 25.3 How to Fix Going Forward

| Action | Unit Savings | Why |
|--------|-------------|-----|
| Run rescore at start of billing cycle | ~8,400 | Full quota available |
| Disable test flight seeder ✅ | ~varies | Already done |
| Reduce monitor limit from 41 to 30 | ~13,000 fewer/month | More headroom |
| Only run rescore once, not retries | ~5,600 | Skip failed flights instead of retrying |

---

## 26. Code Fixes Applied

### 26.1 Rescore Script — Skip Flights When API Returns Null

`server2/scripts/rescore_historical_v2.ts` now checks if `risk.flightStatus` is null before writing a row:

```typescript
if (!risk.flightStatus) {
  console.warn(`[rescore] SKIP ${flight.flight_number} — no flight status from API`);
  return;  // ← don't write a useless row
}
```

This prevents creating rows with null delays when the API is rate limited.

### 26.2 Rescore Commands Updated

`RESCORE_COMMANDS.md` now includes:
- A diagnostic step to check API quota before running
- Conservative settings: `RESCORE_CONCURRENCY=1 AERO_MIN_INTERVAL_MS=2000`
- Warning about HTTP 429 and quota exhaustion

---

## 27. Updated Rescore Instructions for Replit

### Step 1: Check if the API is responding

```bash
cd ~/project/server2 && npx tsx -e "
const { getFlightStatus } = require('./lib/disruption/flightStatus');
const result = await getFlightStatus('AA100', '2026-07-28', 'ORD', 'LAX');
console.log('API result:', result ? 'OK delay=' + result.delayMinutes : 'NULL - quota likely exhausted');
"
```

### Step 2: If API is working, run the rescore conservatively

```bash
cd ~/project && git pull origin main
cd server2 && RESCORE_CONCURRENCY=1 AERO_MIN_INTERVAL_MS=2000 npx tsx scripts/rescore_historical_v2.ts archived-only
```

### Step 3: If API is still 429 (quota exhausted)

- **Wait until the next billing cycle** before running the rescore
- The existing data from previous successful rescore runs (July 20-23) is still usable for ML
- When the new cycle starts, run the rescore with conservative settings to avoid re-exhausting the quota

### Step 4: Verify no null-delay rows were written

```bash
cd ~/project/server2 && npx tsx -e "
const { sql } = require('drizzle-orm');
const { db } = require('./db');
const result = await db.execute(sql\`
  SELECT COUNT(*) FROM clean.risk_score_history_v2
  WHERE actual_delay_minutes IS NULL AND scored_at > NOW() - INTERVAL '2 hours'
\`);
console.log('Null-delay rows from rescore:', result.rows[0].count);
"
```

If > 0, the API was still failing. Delete those rows and try again when quota resets.

---

## 28. CSV Data Changes (After Failed Rescore)

The CSV grew from 19,717 to **20,209 rows** (+492) after the failed rescore run. These 492 rows are **junk data** — all have null delay, null status, null ICAO, null everything useful.

**Recommended:** Don't use rows with `scored_at` from the failed rescore run for ML training. Filter them out by date or by checking for null `actual_delay_minutes`.

The 19,717 previous rows (before the failed rescore) are still valid and usable for ML.

---

## 29. Summary

| Issue | Status | Fix |
|-------|--------|-----|
| HTTP 429 on all API calls | 🔴 Active | Wait for next billing cycle or check quota |
| Rescore creating null-delay rows | ✅ Fixed | Skip flights when API returns null |
| Rescore commands not rate-limit safe | ✅ Fixed | Updated with conservative settings |
| Carrier health showing 0.0 avg delay | ⚠️ Will auto-fix | After API works again and non-null delays populate |
| CSV has 492 junk rows from failed rescore | ⚠️ Needs cleanup | Filter by `scored_at` or delete from DB |
| Estimated budget over 100% consumed | 🔴 Needs monitoring | Reduce monitor LIMIT or wait for next cycle |
