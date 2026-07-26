# Run These Commands on Replit — In Order

## Step 1: Pull Latest Code

```bash
git pull
```

## Step 2: Restart Both Servers

Stop both servers in the Replit UI, then start them again.

Or if using Shell:

```bash
# Kill any running server processes
pkill -f "tsx.*server/" 2>/dev/null; pkill -f "tsx.*server2/" 2>/dev/null

# Start both (if your package.json has a dev script that does both)
npm run dev
```

## Step 3: Wait 10 Minutes

Let the monitor run one full cycle with the new code so new scores start using the computed-delay fix.

## Step 4: Rescore Archived/Resolved Flights

This re-scores flights that have already departed/arrived so they get real delay values:

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

## Step 5: Check If Delays Appeared

```bash
psql "$DATABASE_URL" -c "
SELECT actual_status, actual_delay_minutes, heuristic_score, heuristic_tier, carrier_iata, flight_number
FROM clean.risk_score_history_v2
WHERE actual_delay_minutes IS NOT NULL AND actual_delay_minutes > 0
ORDER BY scored_at DESC
LIMIT 20;
"
```

If this shows non-zero delays (like 15, 30, 45, 90 etc.), the fix worked!

## Step 6: Rescore ALL Flights

Only if Step 5 showed non-zero delays:

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts all
```

## Step 7: Verify Carrier Health Sees Real Delays

```bash
psql "$DATABASE_URL" -c "
SELECT carrier_iata, COUNT(*) as scores, AVG(actual_delay_minutes) as avg_delay
FROM clean.risk_score_history_v2
WHERE actual_delay_minutes > 0
  AND scored_at > NOW() - INTERVAL '24 hours'
GROUP BY carrier_iata
ORDER BY avg_delay DESC;
"
```

## Step 8: Check API Stats Endpoint

```bash
curl http://localhost:5001/api/v2/api-stats
```

## Step 9: Final Data Quality Check

```bash
psql "$DATABASE_URL" -c "
-- Total rows
SELECT COUNT(*) FROM clean.risk_score_history_v2;

-- Non-zero delays
SELECT COUNT(*) FROM clean.risk_score_history_v2 WHERE actual_delay_minutes > 0;

-- Cancelled flights
SELECT COUNT(*) FROM clean.risk_score_history_v2 WHERE actual_cancelled = true;

-- Carrier health avg delay (should now show non-zero)
SELECT carrier_iata, AVG(carrier_avg_delay_24h) FROM clean.risk_score_history_v2 WHERE carrier_avg_delay_24h > 0 GROUP BY carrier_iata;

-- Score tiers
SELECT heuristic_tier, COUNT(*) FROM clean.risk_score_history_v2 GROUP BY heuristic_tier;
"
```
