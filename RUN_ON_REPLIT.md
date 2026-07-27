# Run These Commands on Replit — In Order (Updated July 27)

## Step 0: Deploy the Fix

From your LOCAL machine, commit and push:
```bash
git add -A && git commit -m "Faster rescore: concurrent + no extra delay + rate limiter fix" && git push
```

## Step 1: Pull Latest Code on Replit

```bash
git pull
```

## Step 2: Stop the Old Rescore (if still running)

```bash
pkill -f "rescore_historical" 2>/dev/null
```

## Step 3: Run the Faster Rescore on Archived/Resolved Flights

The new version runs 5 flights concurrently (weather/NAS calls overlap). No extra 2s delay — the rate limiter handles spacing.

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

Progress is logged every 50 flights. Expect ~45 min for 1400 flights.

## Step 4: After Archived Pass Finishes — Run on ALL Flights

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts all
```

This catches flights with status != 'archived' that still have zero delay.

## Step 5: Restart Servers + Second Pass (for correct carrier health)

After both rescore passes complete, restart (clears the 15-min carrier health cache) and run again:

```bash
pkill -f "tsx" 2>/dev/null; sleep 1
npm run dev
# Then in a new terminal:
cd server2 && RESCORE_CONCURRENCY=10 npx tsx scripts/rescore_historical_v2.ts archived-only
```

The second pass will query `getCarrierHealth` AFTER the table has real delays → carrier health columns will be correct.

## Step 6: Check Delays

```bash
psql "$DATABASE_URL" -c "
SELECT actual_delay_minutes, carrier_iata, flight_number, scored_at
FROM clean.risk_score_history_v2
WHERE actual_delay_minutes > 0
ORDER BY scored_at DESC
LIMIT 30;
"
```

## Step 7: Check Carrier Health (after second pass)

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

**Want it faster (risks 429s):**
```bash
RESCORE_CONCURRENCY=10 AERO_MIN_INTERVAL_MS=500 npx tsx scripts/rescore_historical_v2.ts archived-only
```
