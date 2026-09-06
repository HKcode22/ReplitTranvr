# Database Quality & ML Roadmap — Part 6

## Diagnostics: API Quota Exhaustion, Null Delays, Carrier Health (Jul 29)

---

## 24. Root Cause: AeroDataBox API Monthly Quota Exhausted

### 24.1 What's Happening

The AeroDataBox API monthly quota (60,000 units) was exhausted on **July 29, 2026**. Every monitor cycle after that point gets **HTTP 429 (Too Many Requests)** on most flight status calls. The CSV shows:

| Date | Total Rows | Null Delay Rows | Failure Rate |
|------|-----------|----------------|--------------|
| Jul 25 | 712 | 0 | 0% |
| Jul 26 | 991 | 0 | 0% |
| Jul 27 | 1,067 | 0 | 0% |
| Jul 28 | 613 | 0 | 0% |
| Jul 29 | **692** | **563** | **81%** |

On July 29, 563 out of 692 API calls failed. The 129 that succeeded were likely from early in the month/day before the quota was completely exhausted. All 563 failed calls have both `actual_delay_minutes = NULL` and `actual_status = NULL` — the API returned nothing.

### 24.2 Why the Quota Ran Out

The CSV now has **20,209 rows**. Each row = 1 AeroDataBox flight status call at 2 units:

| Source | Rows | API Units |
|--------|------|-----------|
| Flight status calls (20,209 × 2 units) | 20,209 | 40,418 |
| Historical OTP (~1,281 flights × 6 units) | — | 7,686 |
| FIDS fallbacks + seeder airport calls | — | ~5,000-10,000 |
| **Estimated total** | | **~53,000-58,000+** |
| **Monthly budget** | | **60,000** |
| **Remaining (estimate)** | | **~2,000-7,000** |

The remaining ~2,000-7,000 units were consumed by the July 29 monitor cycles, which hit the hard limit and started getting 429s.

### 24.3 Why Carrier Health Shows 0.0

The carrier health query (`carrierHealth.ts:50-124`) reads `actual_delay_minutes` from rows scored in the last 24 hours:

```typescript
const since = new Date(now - 24 * 60 * 60 * 1000);
// Queries rsh.scored_at >= since
// Uses DISTINCT ON to get latest row per flight
// Counts rows where actual_delay_minutes > 0
```

In the last 24 hours, ~563 rows have `actual_delay_minutes = NULL` (API failed) and ~129 have `actual_delay_minutes = 0` (on-time departures). **Zero rows have `actual_delay_minutes > 0`** in the recent window. So:

```
AA sample=11 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
DL sample=15 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
```

This is NOT a code bug. It's the correct computation from bad input data. Carrier health looks weird because there's no recent delay data to compute from.

---

## 25. Data Quality Impact

### 25.1 CSV Growth

The CSV grew from the last analysis (19,717 rows) to **20,209 rows** (+492). The 563 null-delay July 29 rows include the 492 new ones plus 71 from a previous export.

### 25.2 Which Rows Are Affected

| Affected | Count | What Happened |
|----------|-------|---------------|
| July 29 rows with null delay | 563 | API quota exhausted — no data returned |
| Carrier health in last 24h | All carriers | Computed from null-delay rows → 0.0 average |
| Heuristic predictions | 563 rows | All signals default to minimum (no API data) |

### 25.3 Which Rows Are NOT Affected

| Not Affected | Count | Why |
|-------------|-------|-----|
| July 20-28 rows | ~15,000+ | Created before quota exhaustion |
| May-June backfill | ~2,100 | Created during earlier rescore runs |
| July 29 rows with status (129) | 129 | API call succeeded, flight was on-time (delay=0) |

---

## 26. Code Analysis: Is There a Bug Causing Null Delays?

### 26.1 Flight Status Extraction (flightStatus.ts:270-309)

The delay extraction checks multiple response fields:

```typescript
let departureDelay = safeNumber(
    departure?.delayMinutes ??
    departure?.delay?.minutes ??
    departure?.delay?.departure ??
    departure?.runwayDelayMinutes ??
    departure?.delay ??
    null,
);
```

If none exist, it computes from `scheduledTime - actualTime`. If that also fails, `safeNumber(null)` returns **0** (not null). So the delay extraction itself never produces null — it always returns 0 at minimum.

### 26.2 Where Null Comes From

Null `actual_delay_minutes` comes from ONE place only: when `getFlightStatus()` returns null entirely (API call failed), and `risk.flightStatus` is null. The writer does:

```typescript
${risk.flightStatus?.delayMinutes ?? null}
```

`risk.flightStatus?.delayMinutes` when `risk.flightStatus` is null → undefined → `?? null` → NULL.

**Verdict: No code bug.** The null delay issue is 100% caused by API quota exhaustion (HTTP 429), not a parsing or computation bug.

### 26.3 Carrier Health Query Correctness

The carrier health query (`carrierHealth.ts:64-80`) uses `DISTINCT ON (rsh.monitored_flight_id)` to get the latest row per flight, then filters by carrier. The computation is:

```typescript
if (d != null && d > 0) {   // only counts delays > 0
    delaySum += d;
    delayCount += 1;
}
avgDelay24h = delayCount > 0 ? delaySum / delayCount : 0;
```

This correctly handles null and zero delays. When all recent rows have null or zero delays, avgDelay = 0. **Not a bug.**

---

## 27. What to Do

### 27.1 Short Term (Current Month)

| Action | Why |
|--------|-----|
| **Wait for next billing cycle** | Quota resets monthly — new cycle starts Aug 1 |
| **Don't run rescore** | Will also fail with 429 |
| **Delete null-delay July 29 rows** | Clean them from DB so carrier health isn't poisoned |
| **Filter out null-delay rows for ML** | Already covered in Part 5 Section 23.9 |

To delete the null-delay July 29 rows from the DB (run on Replit when quota resets):

```sql
DELETE FROM clean.risk_score_history_v2
WHERE actual_delay_minutes IS NULL
  AND departure_date >= '2026-07-29'::date;
```

### 27.2 Long Term (Next Billing Cycle)

| Action | Why |
|--------|-----|
| **Reduce monitor LIMIT from 41 to 30** | Saves ~15,840 units/month — leaves headroom for rescore |
| **Run rescore at START of cycle** | Full quota available |
| **Archive old test flights** | 294 active flights → reduce to 41 max |
| **Monitor for quota usage** | Track API call count to avoid hitting limit mid-month |

### 27.3 Updated Rescore Sequence (Next Cycle)

```bash
# 1. Pull latest code
cd ~/project && git pull origin main

# 2. Delete junk rows from previous failed rescore
psql "$DATABASE_URL" -c "DELETE FROM clean.risk_score_history_v2 WHERE actual_delay_minutes IS NULL AND scored_at > NOW() - INTERVAL '3 days';"

# 3. Run rescore with conservative settings
cd server2 && RESCORE_CONCURRENCY=1 AERO_MIN_INTERVAL_MS=2000 npx tsx scripts/rescore_historical_v2.ts archived-only

# 4. Start monitor
cd server2 && npm run dev
```
