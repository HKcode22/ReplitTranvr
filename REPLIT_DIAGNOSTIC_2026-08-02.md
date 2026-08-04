# Replit Server2 / Database Diagnosis — Trip 2 (ops support)

**Created:** 2026-08-02 22:13 PDT (local machine timestamp)
**Context:** You noticed `risk_score_history_v2` (and the DB) stopped populating
around **Jul 30, 2026**. This doc gives the exact shell commands to run in the
Replit **Shell** (the terminal, NOT the deploy tab) to find out whether:
(1) server2 is running, (2) the monitor loop is firing, (3) AeroDataBox quota is
exhausted, or (4) the DB is being written to at all.

Run the blocks top-to-bottom. Each block prints a label. Paste the output back
and I'll interpret it.

---

## 0. Sanity: what day is it over there?

```bash
date -u "+%Y-%m-%d %H:%M UTC"
```

If Replit is asleep or the workspace is stopped, the date itself won't advance.
An "Always On" Replit is supposed to keep this advancing.

---

## 1. Is the process even running?

```bash
# List Node processes
ps aux | grep -iE "node|tsx|server2" | grep -v grep
echo "---"
# How many total processes? (>1 means something is alive)
echo "process count: $(ps aux | wc -l)"
```

What to look for:
- A `node`/`tsx` line for `server2/index.ts` or `dist/index.cjs` → running.
- **Nothing returned** → nothing is running (replica sleeping / not started).
- If you run on Replit, the process you launched in the Run panel shows here.

---

## 2. Was it ever up? (recent process start)

```bash
ps -eo pid,lstart,cmd | grep -iE "node|tsx" | grep -v grep
```

`lstart` = wall-clock the process started. Compare to "today". If it started days
ago and `(1)` is empty now, it crashed/exited.

---

## 3. Is the HTTP port responding?

The app listens on a port from `process.env.PORT` (default `3000`). Try:

```bash
PORT=${PORT:-3000}
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" http://localhost:$PORT/ || echo "NO RESPONSE on port $PORT"
```

If the app serves a health/ping route you can also hit it:

```bash
curl -s http://localhost:${PORT:-3000}/api/health || echo "no /api/health"
```

---

## 4. Monitor log — is it cycling?

The monitor prints `[monitor] cycle start ... cycle end` roughly every hour.
If server2 is running but wrote nothing, the loop may be stuck. Re-run this
block a few times spaced ~2 min apart to see logs advance.

```bash
LOG=$(find / -name "*.log" 2>/dev/null | head -5)
echo "logs found: $LOG"
# If Replit keeps console output, you usually can't tail it from shell.
# Instead, query the DB for evidence that scoring is still happening:
```

> On Replit, console logs are NOT written to files by default — they go to the
> Run panel. So `tail` on a log file usually finds nothing. The definitive check
> is the DB itself (block 6).

---

## 5. Can Node talk to the DB? (connectivity)

```bash
cd /Users/hk/Downloads/replitTravnr   # <-- replace with your actual project dir on Replit
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW() AS now').then(r => {
  console.log('DB CONNECTED, server time =', r.rows[0].now);
  return pool.end();
}).catch(e => { console.error('DB CONNECT FAILED:', e.message); process.exit(1); });
" 2>&1 | head -5
```

Needs `pg` installed (it is — it's a dependency). If env isn't loaded in a bare
`node` shell, source it first:

```bash
set -a; source .env 2>/dev/null; set +a
node -e "...same as above..."
```

---

## 6. Direct DB questions (the ones that answer "why did it stop Jul 30")

These use `psql` if installed, else Node. Reset env first:

```bash
set -a; source .env 2>/dev/null; set +a
```

### 6a. Most recent rows written to the v2 history table

```bash
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c "
SELECT MAX(scored_at) AS last_scored
FROM clean.risk_score_history_v2;
" 2>&1
```

If last_scored is stuck around `2026-07-29`/`2026-07-30` → **nothing has been
written since then**.

### 6b. Most recent *monitored flight* created / updated

```bash
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c "
SELECT MAX(created_at) AS last_created, MAX(last_checked_at) AS last_checked
FROM clean.monitored_flights_v2;
" 2>&1
```

### 6c. Counts by day — did rows stop on a specific date?

```bash
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c "
SELECT LEFT(scored_at::text,10) AS day, COUNT(*) AS rows
FROM clean.risk_score_history_v2
GROUP BY day ORDER BY day DESC LIMIT 10;
" 2>&1
```

The row that "flatlines" is the day the monitor stopped writing.

### 6d. Active flights right now (what would the monitor pick up next)

```bash
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c "
SELECT status, COUNT(*) FROM clean.monitored_flights_v2 GROUP BY status;
" 2>&1
```

If there are **0 `active` flights for today/tomorrow**, the monitor query (
`monitor.ts:292-298`, `WHERE status='active' AND departure_date BETWEEN today AND tomorrow`)
returns nothing, fires no API calls, and writes nothing — even if the loop runs.
This is a very common silent cause of "DB stopped growing."

### 6e. Is anything queued as datemet today/tomorrow?

```bash
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c "
SELECT departure_date, COUNT(*) FROM clean.monitored_flights_v2
WHERE status='active' GROUP BY departure_date ORDER BY departure_date;
" 2>&1
```

---

## 7. AeroDataBox quota — is it exhausted? (429s)

AeroDataBox (RapidAPI) rejets with HTTP **429** when throttled/over-quota. When
that happens `scoreFlightRisk` can return `no flight status` and the monitor
skips the flight (see `rescore_historical_v2.ts:77-80`), producing **no new
rows** — which looks exactly like "DB stopped."

### 7a. Is there an in-memory quota tracker? (v2)

The app logs every AeroDataBox call in-memory via `apiCallTracker.ts`
(`getApiStats()`). If a route exposes it, hit it:

```bash
curl -s http://localhost:${PORT:-3000}/api/...health...   # find the actual endpoint
```

(There is no obvious public route in this snapshot — see note below.)

### 7b. Most reliable: run ONE live AeroDataBox call and look at HTTP status

Use the same env the app uses. If `status: 429`, quota is the problem.

```bash
set -a; source .env 2>/dev/null; set +a
node -e "
const RAPID_KEY = process.env.AERODATABOX_API_KEY;
const url = 'https://aerodatabox.p.rapidapi.com/flights/airports/iata/LAX/2026-08-01T10:00:00Z';
fetch(url, { headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'aerodatabox.p.rapidapi.com' } })
  .then(r => { console.log('HTTP', r.status, r.statusText); return r.text(); })
  .then(t => console.log('BODY(snippet):', t.slice(0,180)))
  .catch(e => console.error('ERR:', e.message));
" 2>&1 | head -10
```

Replace the URL/date with a valid one. **HTTP 200 = quota OK (problem is
elsewhere). HTTP 429 = quota/user at ceiling.**

---

## 8. Capture server console output (the actual smoking gun)

Replit Run-panel logs aren't files, but you can capture them by starting the
app yourself with output redirected:

```bash
cd <project-dir>
NODE_ENV=production npx tsx server2/index.ts > /tmp/server2.log 2>&1 &
echo "started pid $!"
sleep 20
tail -40 /tmp/server2.log
```

For the existing (possibly already-running) process, first stop your Run tab,
or kill the current one:

```bash
ps aux | grep -iE "server2|tsx|node" | grep -v grep
pkill -f "server2" ; pkill -f "tsx"   # after confirming it's safe
```

Then start fresh above. Within 20–60s you should see:
- `[monitor] starting engine interval=3600000ms`
- `[monitor] cycle start` → `[monitor] cycle end checked=N alerts=M`
- Or an exception (DB/auth/quota) — that line IS the cause.

---

## 9. Free metrics to record before concluding

```bash
node -e "console.log(process.version)"   # Node version expected
df -h /tmp | tail -1                       # disk not full?
```