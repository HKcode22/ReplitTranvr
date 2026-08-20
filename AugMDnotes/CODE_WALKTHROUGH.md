# V3.9 — Code Walkthrough (what each file does, how, and why)

This file is a **plain-English tour of the V3.9 data-collection codebase** — every
file that matters, what it does, how it works, and *why* it's built the way it is.
It is written for someone who needs to understand the system end-to-end, not just
patch it. It pairs with `IMPLEMENTATION_LOG.md` (what we did) and
`V3.9_DataCollectPlan.md` (the binding spec — PART 1).

> Reading order suggestion: start at **§0** (the mental model), then follow the
> **data-flow diagram** in §2 — the code files are grouped by the job they do, in
> the order a notification flows through the system.

---

## 0. The mental model (read this first)

The whole system is one idea:

> **"Fly a stratified sample of flights, driven by real airport subscriptions, so
> the collected data is a *designed* sample — not whatever the feed happens to
> deliver."**

Every moving part exists to serve that idea:

- **Airports** are the sampling unit. AeroDataBox lets us subscribe to an *airport*
  and push us every flight alert for it (webhook). So "sampling an airport" =
  "subscribing to it" = capturing all the flights that touch it.
- **Tiers + a daily mix** control *which* airports run each window
  (`{HUB:1, MID:2, REGIONAL:1}` per day). HUB is the "anchor", MID are the
  mid-sized workhorses, REGIONAL is the long tail.
- **A measured sampling frame** (`clean.adb_sampling_frame`) is *who* can be
  picked. It comes from the **measured** AeroDataBox universe, not a hand-written
  list (§6 of the plan). This was the big step-11 change.
- **Design probability** is *how* a pick becomes honest statistics. REGIONAL picks
  are a genuine probability draw; HUB/MID are deterministic slot-fill. The
  realized probability is stamped onto every row so weights can be computed later.
- **Credit accounting** is the *budget*. Every notification item costs exactly
  1 credit (we force `maxDeliveryRetries=0`), the balance delta is the
  authoritative spend, and a watchdog enforces a daily cap so we never overspend.
- **The anchor probe** (step 12) is the *proof* that the anchor pool is right. The
  pool is provisional until a standardized measurement scores it (§9).

Everything below is code that implements one of these sentences.

---

## 1. The map of files

```
server/
  db.ts                                        boot migrations (applies .sql on startup)
  routes_v3.ts                                 webhook ingress + subscription management HTTP API
  index.ts                                     app entrypoint (wires routes, starts watchdog)

server/lib/disruption/
  adbAirportCatalog_v3.ts                      the 276-airport curated catalog + tier lookup
  aerodataboxLimiter_v3.ts                     AeroDataBox REST client (balance/subs/feeds)
  flightNotificationExtractor_v3.ts            webhook payload → flat row (the "extractor")
  flightDataPrePostStore_v3.ts                 writes rows + research-event log (the "store")
  adbCollectionController_v3.ts                THE controller: budget, watchdog, candidate draw, batches
  flightStatus_v3.ts                           zod schema for the webhook contract (validation)

migrations/
  0010_flight_data_pre_post.sql                raw collection table (every webhook field)
  0012_collection_sampling.sql                 collection subs/batches + credits tables
  0021_collection_v39_sampling_frame.sql       measured sampling frame (step 11)
  0022_collection_v39_design_probability.sql   design-probability columns + CHECKs (V3.8/§30)
  0023_anchor_probe_results.sql                probe results table (step 12, new)

scripts/
  measure_coverage.ts          (npm run coverage)       force universe measurement
  build_stratified_catalog.ts  (npm run build-catalog)  build the frame from the universe (step 11)
  anchor_probe.ts              (npm run anchor-probe)   two-stage anchor probe (step 12, new)
  credit_canary.ts             (npm run canary)         reconcile 3 credit quantities (gate 3)
  gate0_budget_report.ts       (npm run gate0)          budget/gate report
  check_collection_health.ts   (npm run health)         health check
  refill_credits.ts            (npm run refill)         refill balance
  export_flight_data.ts        (npm run export)         export collected data
  backfill_flight_data_pre_post.ts / analyze_flight_data_pre_post.py   old analysis tooling
```

---

## 2. Data flow (one notification, end to end)

```
AeroDataBox
   │  POST https://travnr.com/api/v1/webhooks/aerodatabox[/<secret>]
   ▼
routes_v3.ts  ── webhookIngress()
   │  1. validate payload against zod schema (log issues, never hard-fail)
   │  2. look up sampling metadata for this subscription_id
   │     (batch id / tier / design probability / weight)
   │  3. extract each flight → flat row (flightNotificationExtractor_v3)
   │  4. upsert rows (dedup on dedup_key)  → flightDataPrePostStore_v3
   │  5. append research-event log (never overwritten)  → same store
   │  6. answer 2xx fast (retries cost credits!)
   ▼
clean.flight_data_pre_post      ← every webhook field, flattened
clean.flight_events             ← one row per observation, keyed (flight,carrier,locReportedUtc)
clean.raw_airborne_events       ← airborne (POST+livelocation) points for trajectory work
clean.adb_ingest_events         ← per-delivery ledger (notification_items = credits, V3.9)
```

Why step 6 matters: AeroDataBox *retries* webhooks that don't answer 2xx, and each
retry costs the same as an initial delivery. So the ingress must **always answer
2xx** — even when validation finds problems (we log and store defensively).

---

## 3. `server/db.ts` — boot migrations

**What it does:** on startup, runs every `.sql` file listed in `BOOT_MIGRATIONS`
against `DATABASE_URL`.

**Why it's built this way:** the project uses a tiny in-process migrator because
the migration files are *additive and idempotent* (`IF NOT EXISTS`, guarded
renames). This is safe to re-run every boot — which matters because **every boot
re-runs ALL migrations**. We learned this the hard way (see `rl6.md`): a migration
that is only safe the first time breaks on the second boot.

**How to add a migration:** create `migrations/00NN_*.sql` and append the filename
to the `BOOT_MIGRATIONS` array (that's how `0023_anchor_probe_results.sql` was
added). The `--> statement-breakpoint` splitter is supported but our files don't
use it.

**The critical rule:** every migration MUST be fully idempotent (safe to run 10×
on a live DB). The 0022 fix exists precisely to satisfy this (see §5).

---

## 4. The migration files

### 4.1 `0010_flight_data_pre_post.sql` — the raw table

One row per flight per delivery, flattened from the webhook. Every field the
provider sends becomes a column: identity (`.number`, `.airline.*`, `.callSign`),
departure/arrival (scheduled/revised/predicted/runway UTC + terminal/gate),
flight plan, aircraft (tail number, mode S, model), live ADS-B position (POST),
and the whole payload as JSONB.

- `dedup_key` is the upsert key — a later delivery of the same flight **updates**
  the row instead of duplicating it.
- `received_at` is when WE received it (our own clock, not the provider's).

### 4.2 `0012_collection_sampling.sql` — collection bookkeeping

Tables for the collection controller:

- `clean.adb_collection_batches` — one row per collection window (batch id, seed,
  window start/end, credit budget, tier mix).
- `clean.adb_collection_subs` — the airport subscriptions that make up a batch,
  each stamped with `batch_id`, `icao`, `tier`, sampling metadata.
- `clean.adb_collection_meta` — key/value store for rotation state (`batch_seq`,
  `last_anchor`, `run_template`, `manifest`, and now anchor-pool lock state).
- `clean.adb_ingest_events` — **the credit ledger**. One row per webhook delivery
  with `notification_items`, `rows_stored/inserted/updated/skipped`,
  `delivery_failure`. This is the internal credit basis (`C_internal`).

### 4.3 `0021_collection_v39_sampling_frame.sql` — the measured frame (step 11)

The plan §6 says the sampling frame must come from the **measured universe**, not
a static 276 list. This table is that frame. `scripts/build_stratified_catalog.ts`
writes it; the controller's candidate selection reads **from here**, never from the
static catalog.

Columns you need to know:

- `tier` — HUB / MID / REGIONAL.
- `tier_source` — `'curated'` (in our 276, human-classified) or `'unclassified'`
  (universe-only, provisional REGIONAL with `traffic_prior=1.0`, §8).
- `traffic_prior` — the REGIONAL prior (starts 1.0 for unclassified, §8).
- `region` — one of six macro-regions (North America, Europe, Asia-Pacific,
  Gulf/Africa, South America, Oceania) — the primary strata are tier × region.
- `feed_schedule / feed_live / feed_adsb` — per-feed membership, measured free.
- `pre_eligible` (has schedule feed) and `post_eligible` (has live OR adsb) —
  which model layer an airport can serve.
- `in_frame` — true while eligible. **Zero-yield airports STAY** (the plan says
  only coverage-failed airports leave — see the frame decision in the log).

### 4.4 `0022_collection_v39_design_probability.sql` — design probability (V3.8/§30)

Adds the sampling-integrity columns that the plan (§30) makes mandatory:

- `airport_layer_design_probability` — the realized conditional design probability
  for a REGIONAL (randomized) pick.
- `is_randomized` — true ⇒ the design probability must be NOT NULL (enforced by a
  CHECK); false ⇒ it must be NULL (planned_share may be populated instead).
- `planned_share` — the HUB/MID deterministic slot-fill share (a plan, not a
  probability).

**Why the 3-state rename logic matters (this was a real bug):** the old column
was `sampling_probability`. Migration 0022 renames it. But because every boot
re-runs *all* migrations in order, the sequence `0012 → 0022 → 0012 → 0022` happens
across boots: boot 1 renames `sampling_probability` → `airport_layer_design_probability`;
boot 2 runs 0012 again, whose `ADD COLUMN IF NOT EXISTS sampling_probability`
re-creates the old column; then 0022's guarded rename collides with the
already-renamed target column → **"column ... already exists"** (the `rl6.md`
failure). The fix makes each rename block handle all three states:
only-old → rename; both → drop the stale empty one and re-add; only-new → no-op.
Every migration must survive this "re-run everything every boot" behavior.

### 4.5 `0023_anchor_probe_results.sql` — probe results (step 12, new)

The anchor pool is **provisional until measured** (§9). This table records every
probe observation so the frozen score formula can be filled with real numbers and
so quarterly re-probing has an audit trail. One row per probe with:
`stage` (1 or 2), `icao`, `region`, the live window, `credits_spent` (the balance
delta), `rows_delivered`, `unique_flights`, `tail_chain_links`, `rows_per_hour`,
`unique_flights_per_credit`, `tail_chain_links_per_credit`, `stability`. Unique on
`(icao, stage, window_start)` so re-runs don't duplicate.

---

## 5. `adbAirportCatalog_v3.ts` — the curated catalog

**What it does:** three hard-coded tier lists (HUB/MID/REGIONAL, ~276 airports)
plus a fast `tierForIcao()` lookup.

**Why it still exists (and why it's NOT the frame):** the catalog is the *curated
human-classified reference*. After step 11, **selection no longer reads from
here** — it reads from `clean.adb_sampling_frame`. The catalog survives for two
jobs: (1) `tier_source='curated'` classification of the 276, and (2) a fallback
tier for rows whose subscription isn't in a managed batch (the webhook stamps a
catalog tier so data is never tier-less).

---

## 6. `aerodataboxLimiter_v3.ts` — the AeroDataBox REST client

A thin, throttled, API-key-guarded client. Every function is one REST call:

| Function | Endpoint | Cost | Purpose |
|---|---|---|---|
| `getBalance()` | GET /subscriptions/balance | free | authoritative credit balance |
| `refillBalance(n)` | POST /subscriptions/balance/refill | 1 unit/credit | top up |
| `createSubscription(type, id, opts)` | POST /subscriptions/webhook/... | free | subscribe to an airport/number |
| `listSubscriptions()` | GET /subscriptions/webhook | free | audit active subs |
| `getSubscription(id)` | GET /subscriptions/webhook/:id | free | one sub's state |
| `deleteSubscription(id)` | DELETE /subscriptions/webhook/:id | free | stop a sub |
| `checkAirportFeeds(icao)` | GET /health/services/airports/:icao/feeds | free | is this airport in the feeds? |
| `listFeedAirports(service)` | GET /health/services/feeds/:service/airports | free | enumerate the feed universe |
| `defaultWebhookUrl()` | — | — | public webhook URL (+`:443` — see below) |

Three details worth knowing:

- **Throttle + retry chain:** calls go through a promise chain that spaces them
  out (the `chain` variable) so we never burst the provider's rate limit.
- **`maxDeliveryRetries=0` is a pricing guarantee.** The plan bases all credit
  math on "each notification item = 1 credit". That's only true if AeroDataBox
  never retries (a retry costs the same as an initial delivery). So every
  subscription is created with `maxDeliveryRetries: 0`.
- **The `:443` quirk:** AeroDataBox rejects webhook URLs without an explicit port
  (`"Web-hook URL port is not allowed: -1"`). `defaultWebhookUrl()` therefore
  always produces a URL with `:443`.

---

## 7. `flightNotificationExtractor_v3.ts` — the extractor

**What it does:** turns one webhook flight object into a flat `InsertFlightDataPrePost`
row, plus the `SamplingMeta` stamped onto it.

Key concepts:

- `SamplingMeta` — `{ batchId, tier, isRandomized, airportLayerDesignProbability,
  plannedShare, samplingWeight, randomSeed, windowStart, windowEnd }`. This is how
  a row knows which batch/draw it came from. The webhook looks it up by
  `subscription_id` and passes it in.
- The extractor is **null-safe and defensive**: a malformed field yields a null
  column, never a crash. The webhook contract validation (zod) logs issues but
  the extractor still extracts what it can — because the 2xx (and thus the credit)
  must not be wasted.
- **`is_randomized` is NEVER NULL (2026-08-19 fix).** Migration 0022 created
  `is_randomized` as `NOT NULL DEFAULT false` (the V3.8 DB rule requires it to be a
  real boolean). The extractor used to set `isRandomized: ctx.sampling?.isRandomized
  ?? null`, and for any delivery with no managed batch (probe/canary subscription)
  that sent NULL → Postgres NOT NULL violation → the whole webhook handler threw →
  0 rows stored + `delivery_failure=1`. That was the rl9 canary FAIL (charged 1
  credit, stored nothing). It now defaults to `false` (unmanaged rows are never
  randomized), satisfying the NOT NULL column and the V3.8 boolean rule.
- `eventKey()` — the key for the research-event log: `(flight, carrier,
  locReportedUtc)` hashed, so every airborne point survives (the dedup table
  would otherwise overwrite repeated observations).

---

## 8. `flightDataPrePostStore_v3.ts` — the store

Three exports do the writing:

- `upsertFlightNotifications(rows)` — batch upsert keyed on `dedup_key`. Returns
  `{ stored, inserted, updated }`. `inserted` is computed by diffing existing
  dedup keys first (single-writer assumption — only the webhook writes this
  table, so the race is negligible).
- `researchEventKey(input)` — the V3.9 event-log key (§6.2).
- `appendResearchEvents(rows)` — **one row per observation, never overwritten.**
  PRE/AIRBORNE go to `clean.flight_events`; airborne (POST + live location) ALSO
  go to `clean.raw_airborne_events` so the trajectory pipeline is fed. It never
  throws — the webhook 2xx must not depend on it.

---

## 9. `routes_v3.ts` — the webhook + management API

Two kinds of routes:

**Webhook ingress** (`POST /api/v1/webhooks/aerodatabox[/:secret]`):
1. Verify the `:secret` path param if `AERODATABOX_WEBHOOK_SECRET` is set.
2. Validate the payload against `flightNotificationContractSchema` — **log
   issues, don't reject**.
3. Resolve `SamplingMeta`: look up the subscription in `adb_collection_subs` +
   batches; if it's not a managed-batch sub, fall back to the catalog tier from
   the ICAO (so unmanaged deliveries are still tier-stamped).
4. Extract → upsert → append research events.
5. **Answer 2xx fast** (retries cost credits).

**Management routes** (guarded by the same secret header, bypassed in local dev):
balance, refill, list/get/create/delete subscriptions. These are what the scripts
(`canary`, `anchor_probe`) and the controller use.

---

## 10. `adbCollectionController_v3.ts` — the brain

This is the biggest, most important file. Everything else serves it. Read it in
layers.

### 10.1 Config (`COLLECTOR_CONFIG`, ~line 44)

Environment-driven tuning: window hours (default 4), batch budget (1900),
daily cap (1900), soft-stop margin (50 → batch stops at 1,850), reserve (1000),
min batch (300), tier mix `{HUB:1, MID:2, REGIONAL:1}`, anchor pool
(`KLAX,EGLL,WSSS,SBGR,OMDB`), UTC start cycle `0,4,8,12,16,20`, and
`autoCollect` (default ON, but we run with `ADB_AUTO_COLLECT=0`).

### 10.2 Rotation state + manifest (meta table)

`readMeta`/`writeMeta` are the key/value store. `writeManifest()` writes a full,
versioned, auditable snapshot (frame version, config, scheduler state, account
plan) at batch start — the plan's reproducibility requirement. `readRunTemplate()`
enforces the R6 crossover freeze: if a `run_template` declares a window shape /
tier mix for today, a batch that violates it is **REFUSED** (§8.1).

### 10.3 Budget (`creditsUsedTodayUtc`, `actualBatchSpend`)

- `creditsUsedTodayUtc()` = SUM(notification_items) since UTC midnight → the
  internal daily basis (`C_internal`). With `maxDeliveryRetries=0`, items ==
  credits.
- `actualBatchSpend(batchId)` = items for one batch.

### 10.4 Candidate selection (`pickAirportCandidates`, ~line 495) — the heart

```
pickAirportCandidates(seed)
  1. read the frame from clean.adb_sampling_frame (measured universe, NOT catalog)
  2. split by tier → { HUB: [...], MID: [...], REGIONAL: [...] }
  3. HUB/MID → deterministic slot-fill, "fresh-first" (avoid repeating recent picks)
  4. REGIONAL → GENUINE normalized probability draw (drawWithoutReplacement),
     every eligible airport has a chance, conditional p_i returned in regionalP
  5. return { candidates, poolSizes, regionalP }
```

Why HUB/MID are deterministic but REGIONAL is a draw: the plan's design (§8).
HUB and MID slots are scarce and high-value — we want the "best" (fresh-first)
ones. REGIONAL is the long tail, and the *scientific* goal is a well-defined
probability distribution over the tail (so we can weight results), not "pick the
best". Pre-probe, all REGIONAL scores are equal (`traffic_prior = 1.0`), so the
draw is uniform `1/|eligible|`; after §23 probe data exists, the adaptive `m_i`
multiplier enters.

### 10.5 `startBatch` / `stopBatch` (~line 639 / 843)

`startBatch`:
- enforces daily cap + reserve (can't start if `balance < reserve + minBatch` or
  today's spend would exceed the cap),
- runs the template freeze check,
- picks candidates, creates a subscription per airport
  (`maxDeliveryRetries=0`), stamps each sub with its design probability /
  planned share (from `regionalP` for REGIONAL, deterministic for HUB/MID),
- writes the manifest.

`stopBatch(reason)`:
- closes the batch, reads `actualBatchSpend` (external = balance delta),
  reconciles against `C_internal`, flags any batch rows with a reason,
  writes the "stop reason" back.

### 10.6 The watchdog (`startCollectionWatchdog`)

A timer that, on each tick, checks health (gap since last row), the daily cap,
and whether `autoCollect` should rotate a new batch. With `autoCollect=false` it
only *reports* — it never starts a batch on its own. That's why the 31-day run is
safe: nothing starts until we say so.

### 10.7 Lookups + diagnostics

`lookupSubscriptionMeta(subscriptionId)` — the JOIN that stamps webhook rows with
batch/tier/probability/weight (used by the ingress). `getDiagnostics()` — the
coverage / gap / budget report. `getAirportCoverage()` — the universe measurement
behind `npm run coverage`.

---

## 11. `scripts/build_stratified_catalog.ts` — step 11 (the frame builder)

`npm run build-catalog`. Reads the measured AeroDataBox universe
(`listFeedAirports` for each of the three feeds, free), classifies every airport:

- curated 276 → keep human tier (`tier_source='curated'`),
- everything else in the universe → `REGIONAL`, `tier_source='unclassified'`,
  `traffic_prior=1.0` (the §8 uniform prior),
- per-airport feed booleans → `pre_eligible` / `post_eligible`,
- macro-region from the ICAO first letter (K/C/M/T/P → North America, E/L/U/B →
  Europe, R/V/W/Z → Asia-Pacific, O/H/F/D/G → Gulf/Africa, S → South America,
  Y/N/A → Oceania).

Then writes the whole frame to `clean.adb_sampling_frame` (upsert), prints the
stratum table (tier × region), the eligible counts, and the three honest flags
(unmapped codes excluded, universe drift, unclassified⇒REGIONAL provisional).

**The step-11 result (rl7.md):** `universeCount 4333`, frame = 4320 airports =
267 curated + 4053 unclassified; 18/18 tier×region strata non-empty;
`pre_eligible 3337 / post_eligible 2264 / both 1281`; 13 unmapped US FAA
private/airstrip codes excluded (not ICAO); 9 catalog airports missing from the
universe.

---

## 12. `scripts/anchor_probe.ts` — step 12 (the two-stage anchor probe, new)

`npm run anchor-probe`. The anchor pool `KLAX·EGLL·WSSS·SBGR·OMDB` is
**provisional until measured** (§8, §9). This script measures it and scores it
with a **frozen formula** (decided pre-probe — observed data only fills it in,
never re-weights it).

**Frozen parameters at the top of the file:**
- stage-1 window = 2 h, stage-2 window = 4 h (overridable),
- capacity gate = 60 rows/h (a PASS/FAIL feasibility gate, NOT a score component),
- probe daily cap = 500 credits (hard-capped inside the 1,900/day budget),
- anchor-score weights: 40% exogenous traffic + 20% geo/network diversity +
  20% carrier/international diversity + 20% standardized observed yield.

**The frozen shortlist** (12 airports across the six regions, from the plan's
priority anchor regions) each carries an **exogenous reference** (published
scheduled flights/year + geo index + carrier index). Our own collection NEVER
feeds the exogenous components — that prevents the "sampled → chosen as anchor →
sampled more" feedback loop the plan warns about (§23a).

**Modes:**
- `--stage 1` — probe every shortlisted candidate not yet probed: 2 h live window
  each, one at a time (probes never cross in real time), recording
  rows/credit, chain-links/credit, stability, and capacity. WSSS and OMAA are
  re-probed the same way as calibration baselines. `--icao KLAX` probes just one.
- `--stage 2` — the top candidates get a longer (4 h) confirmation probe; the
  script **refuses** any airport without a COMPLETED stage-1 probe (the rl8
  out-of-order mistake is now impossible).
- `--score` — fills the frozen formulas: yield is standardized against the WSSS
  (or OMAA) baseline measured the same way; capacity gate disqualifies airports
  that can't physically serve enough data; prints the ranked pool and the
  proposed 5-airport lock.
- `--status` — list recorded probes from `clean.adb_anchor_probe`.
- `--cleanup [--force]` — deletes probe-owned ORPHAN subscriptions (rows still
  `status='probing'` from an interrupted run) and marks them `abandoned`;
  `--force` also deletes any other untracked ACTIVE credit-based subscription
  (safe pre-run because `autoCollect=false`). This is the R1 recovery tool.
- `--check-webhook` — prints the public webhook URL (from `defaultWebhookUrl()`),
  whether `REPLIT_DOMAINS`/`WEBHOOK_BASE_URL` are set, and probes the URL with a
  GET (any HTTP status proves reachability; a network error means AeroDataBox
  cannot reach us).
- `--hours N` — override the window length.

**How a probe works mechanically:** budget guard (balance ≥ reserve, probe spend
won't breach the 1,900/day cap) → **R1 exclusivity guard** (refuse to start if any
foreign ACTIVE billable subscription exists — this is what stops parallel probes)
→ free feed check → `createSubscription` (maxDeliveryRetries=0) → INSERT a
`probing` row into `clean.adb_anchor_probe` → **wait the window in-process** (the
command blocks for the full 2 h; deliveries hit the live webhook and land in
`flight_data_pre_post` with our `subscription_id`) → delete the sub → settle →
`credits_spent = balance_before - balance_after` → SQL counts rows / unique
flights / tail-chain links / 15-min bucket stability → flip the row to
`completed` (idempotent `ON CONFLICT` on `(icao, stage, window_start)`). The
`probing` row is what lets `--cleanup` find and recover interrupted runs.

**Why the probe is only 20% of the score:** a single good probe day must not
override years of published schedules (§9 step 5). The exogenous 80% is frozen,
so the probe only refines, never dominates.

---

## 13. `scripts/credit_canary.ts` — gate 3 (the credit reconciliation)

`npm run canary`. A tiny controlled live test that reconciles the **three credit
quantities** BEFORE meaningful spend:
- `C_external` = balance_before − balance_after (authoritative),
- `C_internal` = notification items in `adb_ingest_events` (each = 1 credit with
  maxDeliveryRetries=0),
- rows = unique rows stored/inserted/updated.

PASS when `|C_external − C_internal| ≤ tolerance` AND delivery failures = 0.
It also asserts **R1 exclusivity** — no foreign ACTIVE billable subscription may
exist during the test. This is the proof that our credit math is honest before we
spend thousands of credits.

**Real result from rl9 (2026-08-19):** the canary FAILED —
`C_external=1, C_internal=0, rows 0, delivery_failures=1`. That is the signature
of "webhook reachable but the handler threw before storing": AeroDataBox charged 1
credit for the delivery, our route caught the error, and recorded a delivery
failure. The cause was the `is_randomized` NOT NULL bug (see §7). After the fix
the same canary must print `PASS` with `>0` items — if it still FAILs, stop and
diagnose the webhook path; do not start probes.

---

## 14. The other scripts (brief)

- `measure_coverage.ts` (`npm run coverage`) — forces a fresh universe
  measurement and prints `universeCount` / `catalogInUniverse`.
- `gate0_budget_report.ts` (`npm run gate0`) — the budget/gate report.
- `check_collection_health.ts` (`npm run health`) — balance, gap, can-start,
  delivery-failure health.
- `refill_credits.ts` (`npm run refill`) — top up the balance.
- `export_flight_data.ts` / `backfill_...` / `analyze_...py` — older analysis
  tooling, superseded by the V3.9 pipeline but kept for reference.

---

## 15. The 57-typecheck-errors baseline

`npm run check` (tsc) reports **57 pre-existing errors** across the repo (mostly
in `server/routes.ts` and older files). We treat that as the baseline: our
changes must not add any. After step 11's rename + migration fixes and after
step 12's new files, the count is still **57** — verified each time.

---

## 16. What is NOT implemented yet (the honest list)

These are in the plan but deliberately NOT built yet — they are pre-freeze
Gate 0.5 / Gate 5 items, not blockers to the current steps:

- **PRE FIDS population** (the PRE layer needs scheduled FIDS data — we collect
  from FlightAlert, but the "PRE" field population strategy isn't done).
- **4-timestamp availability contract** (`available_at` is currently NULL; the
  T-24/T-6/T-90 snapshots and the `available_at` stamps are future work).
- **Milestone mapping verification** and `flight_capture_flags`.
- **Historical feature store** and the **POST denominator**.
- **The adaptive REGIONAL `m_i`** — the yield-aware multiplier boots only AFTER
  §23 probe data exists (currently uniform, which is correct pre-probe).
- **The 31-day run itself** — `autoCollect=false` stays until every gate passes.

Everything above step 12 is wired to respect these boundaries: the probe records
data, the frame is measured, the draw is probability-honest, and the budget is
capped — but the full ML data-contract features come at their gate.