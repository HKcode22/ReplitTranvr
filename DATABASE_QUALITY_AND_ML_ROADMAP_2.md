# DATABASE QUALITY & ML ROADMAP — PART 2

**Continuation of** `DATABASE_QUALITY_AND_ML_ROADMAP.md` (Parts 1–13)

This file covers execution status, remaining work, and the ML pipeline. See Part 1 for the original database analysis, v2 table design, API budget, and the complete detailed plan.

**Latest commit:** `759e609` — Part 2 MD, stray fence fix, renumber section 13

---

## Part 1: Phase 1 Execution Status — What's Been Done & What Needs To Be Done

### 1.1 Phase 1 — Foundation (Code Complete, Needs Replit Migration)

All code changes are pushed to GitHub (`main`, commit `5e07d3a`). The migration and backfill need to run on Replit.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1a | Create `clean` schema | ✅ Done | In `migrations/001_create_v2_tables.sql`, `CREATE SCHEMA IF NOT EXISTS clean` |
| 1b | Create `clean.monitored_flights_v2` | ✅ Done | SERIAL PK, 22 flat columns, all indexes. Part 7 columns: `departure_time_utc`, `equipment_group` |
| 1c | Create `clean.risk_score_history_v2` | ✅ Done | SERIAL PK, ~55 flat columns, all indexes. Part 7 columns: `origin_icao`, `destination_icao` |
| 1d | Add all indexes | ✅ Done | 5 indexes on flights_v2, 5 on risk_score_v2 + UNIQUE on (flight_number, departure_date) |
| 1e | Backfill flights: old `monitored_flights` → v2 | ✅ Script ready | `scripts/backfill_v2.sql` copies all columns, computes `departure_time_utc` + `equipment_group` |
| 1f | Backfill scores: old JSONB → v2 | ✅ Script ready | Extracts all 55+ fields from JSONB into typed columns; extracts `equipment_group` from `equipment_type` |
| 1g | Verify row counts match | 🔲 **Needs Replit** | Run `psql "$DATABASE_URL" -f scripts/backfill_v2.sql` then check counts |
| 1h | Push to GitHub | 🔲 **Needs push** | Bug fixes not yet committed (see bugs below) |

### 1.2 Additional Phase 1 Work (Beyond Original Roadmap 11.7)

These tasks were not in the original 11.7 roadmap but were necessary during implementation:

| # | Task | Status | Notes |
|---|------|--------|-------|
| — | **server/ frozen** — stop ALL writes to old `public` schema | ✅ Done | `monitor.ts`: removed `riskScoreHistory` inserts + `monitoredFlights` score updates. `testFlightSeeder.ts`: reduced to no-op. `v2Writer.ts` deleted from server/ |
| — | **server2/ v2-only writes** (not dual-write) | ✅ Done | `monitor.ts`: removed old table writes, keeps only `writeScoreToV2` + `updateFlightInV2`. `testFlightSeeder.ts`: removed old `monitoredFlights` insert, uses `insertFlightToV2` only |
| — | **60-min scoring interval** (was 30) | ✅ Done | All `INTERVAL_MS` changed from `30 * 60 * 1000` to `60 * 60 * 1000` |
| — | **41-flight max** per cycle (Ultra budget) | ✅ Done | `.limit(41)` added to `runCycle` flight queries in both server/ and server2/ |
| — | **v2Writer.ts helper** created | ✅ Done | `server2/lib/disruption/v2Writer.ts` — `writeScoreToV2`, `updateFlightInV2`, `insertFlightToV2` |
| — | **Unique index** for idempotent inserts | ✅ Done | `CREATE UNIQUE INDEX idx_mf_v2_flight_date ON clean.monitored_flights_v2(flight_number, departure_date)` |
| — | **ON CONFLICT fix** in v2Writer | ✅ Done | Changed from `ON CONFLICT (id)` (never fires) to `ON CONFLICT (flight_number, departure_date)` |
| — | **Seeder dedup queries v2** (not old table) | ✅ Done | `server2/testFlightSeeder.ts` dedup checks `clean.monitored_flights_v2` |
| — | **MD formatting fixes** | ✅ Done | Removed stray ``` at line 2346 that broke all subsequent code block syntax highlighting. Renumbered section 14 → Part 13 |
| — | **DATABASE_QUALITY_AND_ML_ROADMAP_2.md** created | ✅ Done | This file — continuation with execution status and ML plan |
| — | **Bug fix:backfill table names** (PascalCase→snake_case) | ✅ Done | `scripts/backfill_v2.sql`: `"MonitoredFlight"`→`"monitored_flights"`, `"RiskScoreHistory"`→`"risk_score_history"` |
| — | **Bug fix:backfill JSONB column** (`data`→`"signals"`) | ✅ Done | `scripts/backfill_v2.sql`: old column is `rsh."signals"`, not `rsh.data` |
| — | **Bug fix:backfill ON CONFLICT** (`(id)`→ never fires) | ✅ Done | Flights use `ON CONFLICT (flight_number, departure_date)`, scores use `ON CONFLICT (id)` (correct for explicit ids) |
| — | **Bug fix:backfill preserve IDs** | ✅ Done | Added `id` to INSERT column list + sequence reset via `setval` |
| — | **Bug fix:migration missing Part 7 columns** | ✅ Done | Added `departure_time_utc`, `equipment_group` to flights_v2; `origin_icao`, `destination_icao` to scores_v2 |
| — | **Bug fix:backfill date cast** (`departure_date::date`) | ✅ Done | Old `departure_date` is TEXT, v2 expects DATE — added explicit `::date` cast |

### 1.3 Phase 2 — Pipeline Rewrite (Partially Done)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2a | Add `apiCallTracker` to all API calls in server2/ | 🔲 **Not started** | Need to integrate from `server2/lib/disruption/apiCallTracker.ts` into monitor.ts, flightStatus.ts, weatherSignal.ts, nasStatus.ts, historicalOtp.ts |
| 2b | Update `monitor.ts` to write to v2 tables | ✅ Done | `server2/monitor.ts` writes scores to `clean.risk_score_history_v2` and updates `clean.monitored_flights_v2` |
| 2c | Update `testFlightSeeder.ts` to write to v2 tables | ✅ Done | `server2/testFlightSeeder.ts` inserts flights into `clean.monitored_flights_v2` only |
| 2d | Update `carrierHealth.ts` to read from v2 tables | 🔲 **Not started** | `server2/carrierHealth.ts` still reads from old `riskScoreHistory` + `monitoredFlights` JSONB. Need to rewrite to query `clean.risk_score_history_v2` using flat columns |
| 2e | Add data quality validation checks | 🔲 **Not started** | Need automated checks for: null rates, zero-delay rates, missing weather, score distribution |
| 2f | Add `/api/v2/api-stats` endpoint | 🔲 **Not started** | Need route to expose API call counts, costs, cache hits |

### 1.4 Phase 3 to Phase 5 — Not Started

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| **3a** | Run server2/ alongside server/ | 🔲 | Needs Replit deployment |
| **3b** | Verify seeder adds flights to v2 | 🔲 | Check `clean.monitored_flights_v2` row count grows |
| **3c** | Verify monitor scores and writes to v2 | 🔲 | Check `clean.risk_score_history_v2` row count grows each cycle |
| **3d** | Check API costs via api call tracker | 🔲 | Blocked on 2a (apiCallTracker) |
| **3e** | Compare old vs new scores side by side | 🔲 | Run SQL query: `SELECT rsh.score, rsh_v2.heuristic_score FROM ... JOIN ...` |
| **4a** | Re-score historical data (optional) | 🔲 | Write script to re-fetch AeroDataBox for past flights |
| **5a** | Point server/ to use v2 tables | 🔲 | After validation — update server/ routes to read from v2 |
| **5c** | Archive old tables | 🔲 | `ALTER TABLE ... RENAME TO ..._legacy` |

### 1.5 Critical Path Analysis

The fastest path to a working v2 system:

1. **On Replit**: `git pull` (includes backfill bug fixes) → run migration → run backfill → restart server2/
2. **After restart**: server2/ monitor writes scores to v2, seeder inserts flights to v2
3. **Then**: Fix `carrierHealth.ts` to read from v2 (task 2d) — takes ~30 min
4. **Then**: Add `apiCallTracker` integration (task 2a) — takes ~1-2 hours
5. **Then**: Run Phase 3 verification — takes 24 hours to accumulate data

### 1.6 Code Architecture Summary

```
server/ (frozen — reads only, no writes to public schema)
  ├── lib/disruption/monitor.ts       → scores flights but writes nothing
  ├── lib/disruption/testFlightSeeder.ts  → no-op (returns 0)
  ├── lib/disruption/carrierHealth.ts  → reads old tables (stale)
  ├── lib/disruption/flightStatus.ts   → API call, returns data (no store)
  └── lib/disruption/riskScorer.ts     → computation only (no store)

server2/ (active — writes to clean schema)
  ├── lib/disruption/monitor.ts        → v2-only: writeScoreToV2 + updateFlightInV2
  ├── lib/disruption/testFlightSeeder.ts → v2-only: insertFlightToV2
  ├── lib/disruption/carrierHealth.ts  → 🔲 NEEDS FIX: reads old tables
  ├── lib/disruption/v2Writer.ts       → writeScoreToV2, updateFlightInV2, insertFlightToV2
  ├── lib/disruption/flightStatus.ts   → same as server/ (stateless API call)
  └── lib/disruption/riskScorer.ts     → same as server/ (stateless computation)

Database schema (clean):
  ├── clean.monitored_flights_v2       → populated by: backfill + testFlightSeeder + user inserts
  └── clean.risk_score_history_v2      → populated by: backfill + monitor (each cycle)
```

### 1.7 Verification Checklist (for Replit)

After deploying, run these to confirm everything works:

```sql
-- Check v2 tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'clean';

-- After backfill: row counts
SELECT 'old monitored_flights' AS tbl, COUNT(*) FROM public.monitored_flights
UNION ALL
SELECT 'new monitored_flights_v2', COUNT(*) FROM clean.monitored_flights_v2;

-- After backfill: score counts
SELECT 'old risk_score_history' AS tbl, COUNT(*) FROM public.risk_score_history
UNION ALL
SELECT 'new risk_score_history_v2', COUNT(*) FROM clean.risk_score_history_v2;

-- After one monitor cycle: scores appearing
SELECT COUNT(*) FROM clean.risk_score_history_v2
WHERE scored_at > NOW() - INTERVAL '2 hours';

-- After one seeder run: new flights appearing
SELECT departure_date, COUNT(*) FROM clean.monitored_flights_v2
GROUP BY departure_date ORDER BY departure_date DESC;
```

---

*This document continues in `DATABASE_QUALITY_AND_ML_ROADMAP_PART3.md` for ML pipeline details.*
