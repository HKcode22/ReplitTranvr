# Run These Commands on Replit — In Order

## On Your Local Machine: Commit & Push

```bash
git add -A && git commit -m "Update RUN_ON_REPLIT.md with latest instructions" && git push
```

## On Replit: Pull the Latest Code

```bash
git pull
```

## On Replit: Run the Rescore (3 Passes Total)

The `extractTime` + `revisedTime`/`runwayTime` fix IS working on the code level. It needs to be executed to populate real delays. Run these **in order**:

### Pass 1: Stop old rescore + run faster version on archived flights

```bash
pkill -f "rescore_historical" 2>/dev/null
cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

This runs 5 flights concurrently, no extra 2s delay. Expect ~45 min.

### Pass 2: Rescore ALL flights (catches non-archived ones like June 10)

```bash
cd server2 && npx tsx scripts/rescore_historical_v2.ts all
```

### Pass 3: Restart + rescore again (fixes carrier health columns)

Restart clears the 15-min carrier health cache. The second rescore will query carrier health AFTER the table has real delays:

```bash
pkill -f "tsx" 2>/dev/null; sleep 1
npm run dev
# Then in a new terminal:
cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
```

### Verify delays

```bash
psql "$DATABASE_URL" -c "
SELECT actual_delay_minutes, carrier_iata, flight_number, scored_at
FROM clean.risk_score_history_v2
WHERE actual_delay_minutes > 0
ORDER BY scored_at DESC
LIMIT 30;
"
```

### Verify carrier health (after Pass 3)

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

## Why This Works (For Context)

**The `extractTime` fix** handles AeroDataBox returning `revisedTime`/`runwayTime` (not `actualTime`) for past flights, and those fields can be strings not objects. The rescore calls AeroDataBox for each flight with the fixed code, which computes `delay = revisedTime - scheduledTime`.

**Carrier health is stale after Pass 1** because `getCarrierHealth()` queries the DB before the current flight's delay is written. After restart + Pass 3, the table has real delays → carrier health sees them.

**June 9 flights still at 0** if `archived-only` skips them (status != archived). Pass 2 (`all` mode) catches every flight with zero delay regardless of status.

## Troubleshooting

**429 errors:** `AERO_MIN_INTERVAL_MS=2000 npx tsx scripts/rescore_historical_v2.ts archived-only`

**Faster but risk 429s:** `RESCORE_CONCURRENCY=10 AERO_MIN_INTERVAL_MS=500 npx tsx scripts/rescore_historical_v2.ts archived-only`

**Add Frontier (F9) flight:**
```sql
INSERT INTO clean.monitored_flights_v2 (flight_number, carrier_iata, departure_date, departure_time, origin_iata, destination_iata, is_test, agency_id)
VALUES ('F94838', 'F9', '2026-07-27', '14:00', 'DEN', 'LAS', true, 1);
```
