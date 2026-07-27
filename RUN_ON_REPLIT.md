# Run These Commands on Replit — In Order (Updated July 27 v2)

## Step 0: Pull the Latest (Already Pushed)

From your LOCAL machine, this has already been committed and pushed. On Replit:

```bash
git pull
```

## Step 1: Stop the Old Slow Rescore (if still running)

```bash
pkill -f "rescore_historical" 2>/dev/null
```

## Step 2: Run the Faster Rescore on Archived/Resolved Flights

The new version runs **5 flights concurrently** (weather/NAS calls overlap). No extra 2s delay — the AeroDataBox rate limiter handles spacing. Progress logged every 50 flights.

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

Expect ~45 min for ~1400 flights (vs ~4.5 hours with the old script).

## Step 3: After Archived Pass Finishes — Run on ALL Flights

This catches flights with status != 'archived' that still have zero delay (e.g., June 10 flights).

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts all
```

## Step 4: Restart Servers + Second Pass (for correct carrier health)

After both rescore passes complete, restart the servers (clears the 15-min carrier health cache) and run the rescore again:

```bash
pkill -f "tsx" 2>/dev/null; sleep 1
npm run dev
# Then in a new terminal:
cd server2 && RESCORE_CONCURRENCY=10 npx tsx scripts/rescore_historical_v2.ts archived-only
```

The second pass will query `getCarrierHealth` AFTER the table has real delays → carrier health columns (avg_delay_24h, cancellation_rate_24h, health_score) will reflect the corrected data.

## Step 5: Verify Delays Are Now Non-Zero

```bash
psql "$DATABASE_URL" -c "
SELECT actual_delay_minutes, carrier_iata, flight_number, scored_at
FROM clean.risk_score_history_v2
WHERE actual_delay_minutes > 0
ORDER BY scored_at DESC
LIMIT 30;
"
```

You should see 200+ flights with delays like 3, 15, 63, 133, 343 min etc.

## Step 6: Verify Carrier Health (after second pass)

```bash
psql "$DATABASE_URL" -c "
SELECT carrier_iata,
  COUNT(*) as scores_24h,
  AVG(carrier_avg_delay_24h) as avg_delay,
  AVG(carrier_cancellation_rate_24h) as cancel_rate,
  AVG(carrier_health_score) as health
FROM clean.risk_score_history_v2
WHERE scored_at > NOW() - INTERVAL '24 hours'
GROUP BY carrier_iata
ORDER BY avg_delay DESC;
"
```

`avg_delay` should now show non-zero values for carriers whose flights had delays.

## Troubleshooting

**"archived-only" not processing my June 10 flights:**
The `archived-only` mode only processes flights where `mf.status = 'archived' OR mf.resolved_status IS NOT NULL`. If flights have a different status, use:
```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts all
```

**Too many 429 rate limit errors:**
The rate limiter is now 1000ms (was 500ms). If still getting 429s:
```bash
AERO_MIN_INTERVAL_MS=2000 npx tsx scripts/rescore_historical_v2.ts archived-only
```

**Want it faster (risks more 429s):**
```bash
RESCORE_CONCURRENCY=10 AERO_MIN_INTERVAL_MS=500 npx tsx scripts/rescore_historical_v2.ts archived-only
```

**Carrier health still shows 0 after rescore:**
This is expected after the first pass. The `getCarrierHealth` function queries the table BEFORE writing the current flight's delay, so each flight sees the pre-rescore state. After restart (clears the 15-min cache) + second pass, carrier health will see the updated delay data. If it's still 0, check Step 5 first — delays must exist before carrier health can average them.

**Frontier (F9) flights not showing up:**
Our seeder only covers AA, DL, UA, WN, AF, AS, EI, LO, PD, WS, XP, AC carriers. F9 is not in the monitor set. AeroDataBox does support F9 — to add one:
```sql
INSERT INTO clean.monitored_flights_v2 (flight_number, carrier_iata, departure_date, departure_time, origin_iata, destination_iata, is_test, agency_id)
VALUES ('F94838', 'F9', '2026-07-27', '14:00', 'DEN', 'LAS', true, 1);
```

**What the `extractTime` fix does:**
The old code checked `departure?.actualTime?.utc` — but AeroDataBox returns `revisedTime` and `runwayTime` for past flights, not `actualTime`. And those fields are sometimes strings (not objects with `.utc`). The fix uses `extractTime()` which handles both formats and tries `revisedTime` → `runwayTime` → `actualTime` as fallbacks. 223+ flights now show real delays (3–343 min) thanks to this.
