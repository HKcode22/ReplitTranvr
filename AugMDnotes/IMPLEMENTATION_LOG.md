# V3.9 Implementation Log — Phase 0 tracker (explained, plain-English)

> Connected to: `AugMDnotes/V3.9_DataCollectPlan.md` (the binding spec, PART 1).
> This file records **what has been implemented, what is being implemented, what
> still needs doing, and how — step by step** so any work can be audited and
> re-checked if something goes wrong.
>
> Status legend: `[x]` done · `[~]` in progress · `[ ]` pending · `[!]` blocked

---

## 1. What is this whole project, in plain English?

Travnr collects **flight data** so it can train machine-learning models that
predict flight delays, cancellations, diversions, and arrival times.

The data comes from a provider called **AeroDataBox**, two ways:

1. **Webhook (Flight Alert)** — the provider *pushes* a notification to our
   server whenever a flight's status changes (new departure time, live GPS
   location while airborne, arrival, etc.).
2. **REST calls (FIDS/schedule)** — we *ask* the provider for "all flights at
   this airport right now".

**Every single API call costs credits.** The plan grants us **60,000 API units
per month**. If we overspend, our account gets locked and the whole project
stops. So almost everything in the plan is about being **parsimonious with
credits** and **scientifically honest with the data** (no "leakage" — never
letting the model see information that wouldn't have existed at prediction
time).

### The two "money" numbers you will keep hearing about

| Number | Meaning |
| ---- | ---- |
| **60,000** | Total monthly API units (the real entitlement — VERIFY at Gate 0) |
| **57,900** | The *spendable* experimental envelope in credits = 58,900 refill − 1,000 permanent floor. **This is the binding limit for the whole run.** |
| **1,900/day** | Daily credit ceiling (~60,000 ÷ 31 days). The watchdog never lets one day spend more than this. |
| **1,000 floor** | `ADB_RESERVE_CREDITS` — the controller refuses to spend the balance below 1,000 (emergency reserve). |
| **1,000 REST** | A *separate* line of API units for census/FIDS/probes — never taken out of the 57,900 credit envelope. |

Arithmetic check: `57,900 + 1,000 floor + 1,000 REST + 100 unallocated = 60,000 ✓`

---

## 2. What are "the phases"? (the whole journey)

The plan's runbook (§17) divides everything into phases. Think of the earlier
phases as **safety checks before we spend real money**, and the later phases as
**the actual data collection run**.

| Phase | Name | What it is, in plain English | Status |
| ---- | ---- | ---- | ---- |
| **0** | Code deltas | Change the code so the run is safe, budget-protected, and scientifically valid. **No money spent, no data collected.** Everything below that's marked `[x]` is Phase 0. | ✅ DONE |
| **1** | Gate 0 | Log into RapidAPI, record the real plan / monthly units / credit balance, make one 1-credit refill, confirm "1 unit = 1 credit", print the budget report, commit the manifest. | ⏳ NEXT |
| **2** | Gates 1–2 | Run `npm run coverage` (which airports the provider covers), build the stratified airport catalog, run the anchor probe to pick the best 5 airports. | pending |
| **3** | Gates 3–4 + 0.5 | Delete every foreign subscription (exclusivity), run the credit canary, confirm SOFT_STOP, inspect real webhook payloads for correctness. | pending |
| **4** | Gate 5 | Validate the census: compare FIDS population vs webhook events, quantify what's missing. | pending |
| **5** | FREEZE | Write the versioned manifest, materialize + hash the test row set. From here the config cannot change. | pending |
| **6** | 31-day run | The real run: 1,900 credits/day × 31 days with the crossover templates (4h / 2×2h / 6h windows). | pending |

**Key rule:** the 31-day run (Phase 6) waits for **all gates to pass** (Phases
1–5). Phase 0's job is just to make the code ready.

---

## 3. What Phase 0 did — the full explanation

Phase 0 = "code deltas". It has **4 steps**. Each step is described with
*why it matters* (not just what was changed).

### Step 1 — R-deltas (the "R" = safety Rules for budget + exclusivity)

| # | What changed | File | Why it matters (plain English) |
| ---- | ---- | ---- | ---- |
| 1.1 | Default daily batch budget **3000 → 1900** | `adbCollectionController_v3.ts:81` | The controller's default was 3,000 credits/batch, but the plan caps us at **1,900/day**. A batch that thought it had 3,000 could blow through a day's quota. Now the default matches the plan. |
| 1.2 | **R1 exclusivity** — canary refuses to run if any foreign billable subscription exists | `scripts/credit_canary.ts` | To know exactly how many credits a batch spends, we must be the *only* subscriber. If some other subscription is active, the balance moves for reasons we don't control and our accounting breaks. The canary now **fails loudly** if that's the case. |
| 1.3 | **R2 SOFT_STOP** — watchdog stops the batch when today's spend reaches `1900 − margin` (default margin 50 → stops at 1,850) | `adbCollectionController_v3.ts` (config + watchdog) | Credit accounting has a small delay ("async race"). If we waited until exactly 1,900 to stop, in-flight deliveries could push us over. Stopping at 1,850 leaves a safety buffer so we never exceed the hard 1,900 cap. |
| 1.4 | **R3 canary** conditions finalized | `scripts/credit_canary.ts` | The canary is a tiny, controlled batch that proves the credit math is exact: settlement balance stable (`B_after == B_after_2`), external spend == internal spend, zero failures. |
| 1.5 | **R5 failure flag** — delivery-failure batch is flagged and auto-resume is blocked | `migrations/0018_collection_v39_delivery_failure_flag.sql` + controller | `maxDeliveryRetries=0` means a failed delivery is **lost forever**. If a batch stopped because of a delivery failure, the watchdog must NOT silently start the next batch — it flags the rows and waits for a human to reconcile. |
| 1.6 | **R6 crossover template freeze** — scheduler refuses to run a batch that violates the frozen experiment template | `adbCollectionController_v3.ts` (`checkTemplateFreeze`) | The experiment design (window shape, tier mix, crossover period) must be frozen *before* treatment. The scheduler now **refuses** to start a batch with the wrong shape, wrong tier mix, or a crossover period-2 without its period-1. |
| 1.7 | **R7 versioned manifest** — stamps the run's full config at batch start | `adbCollectionController_v3.ts` (`writeManifest`) | Records frame version, config, scheduler state, account plan/units/refill into the DB so the run is reproducible and auditable. |

**Bonus fix:** removed a plan violation — the controller was stamping
`sampling_weight = 1/p`; the plan requires **NULL** (1/p is not a valid
flight-level inclusion probability). Now NULL. (`adbCollectionController_v3.ts`)

### Step 2 — S-deltas (the "S" = Schema/Data science layers)

| # | What changed | File | Why it matters (plain English) |
| ---- | ---- | ---- | ---- |
| 2.1 **S1** | New `flight_population` table — the "census" layer | `migrations/0019_...population_and_events.sql` | The webhook only shows us *flights that sent an update*. To know the true population ("which flights EXISTED at this airport at this time"), we add a layer built from FIDS/schedule. Every coverage metric (population → captured → snapshots → outcomes) comes from joining this against events. |
| 2.2 **S2** | Raw immutable envelope on `adb_ingest_events` (payload + SHA-256 + parser/schema version + outcome) | `migrations/0019` | Every webhook delivery keeps its raw bytes + a hash, forever, never edited. This is the "source of truth" so we can audit or replay anything. |
| 2.3 **S3** | New `flight_events` table — **one row per observation** (event log before state) | `migrations/0019` | Before, we only kept the "latest state" of each flight. Research needs *every* observation. This log is append-only — never overwritten. |
| 2.4 **S4** | Provenance invariant | `migrations/0019` | Because every event keeps its payload hash + ingest reference, we can always **rebuild any state from the raw log**. Never destructively overwrite research data. |
| 2.5 **S5** | New airborne time-series tables + **dedup-key fix** | `migrations/0020_...airborne_time_series.sql` + `flightDataPrePostStore_v3.ts` | **This fixes a silent data-loss bug.** The old code keyed rows on `(flight, carrier, lastUpdatedUtc)`. If the provider sent a new location *under the same* `lastUpdatedUtc`, the older point got **overwritten** — the trajectory lost points. The research log now keys on `(flight, carrier, locReportedUtc)`, so every airborne point survives. |
| 2.6 **S5** | Airborne pipeline tables | `migrations/0020` | `raw_airborne_events → clean_airborne_points → flight_trajectory → flight_airborne_snapshots`. Raw points are never modified; cleaning happens in a separate layer. |
| 2.7 **S5** | `prediction_state` stamped **only on snapshot rows** (PRE/AIRBORNE) | `migrations/0020` | A raw event is just facts (`event_phase`, `event_timestamp`, `data_stage`). The derived "this is a PRE snapshot" / "this is an AIRBORNE snapshot" label belongs on the derived snapshot tables only — never burned into a raw event. |
| — | `appendResearchEvents()` writer wired into the webhook | `routes_v3.ts` | Every webhook delivery now also writes the research event log (one row per observation). Never throws — the webhook 2xx reply always happens first. |

### Step 3 — Gate-0 budget-partition report

- Created `scripts/gate0_budget_report.ts`, run with **`npm run gate0`**.
- Prints the full 60,000-unit partition (§3.2), the arithmetic check, the
  per-day cap (HARD 1,900 / SOFT_STOP 1,900−margin), realized spend from the
  ledger vs the **57,900 invariant**, and whether the 1,000 floor is intact.
- Registered as `gate0` in `package.json`.

### Step 4 — grep-verify (safety sweep)

- **4.1** No `sampling_weight = 1/p` stamping anywhere (only the NULL default remains).
- **4.2** `maxDeliveryRetries = 0` on every collection subscription (controller,
  limiter, canary) — guarantees each notification item = exactly 1 credit.

---

## 4. ⚠️ MOST IMPORTANT — how to run it on Replit and watch the logs

### BEFORE you press Run — the one thing that prevents accidental spending

The watchdog **auto-starts batches by default** (`ADB_AUTO_COLLECT` defaults to
ON). That means simply starting the app can **begin spending real credits**
before the gates have passed.

**Rule:** while we are still in Phase 0/1 verification, ALWAYS start the server
with auto-collect disabled:

```
ADB_AUTO_COLLECT=0 npm run dev
```

You can also permanently set this by adding it to Replit's **Secrets**
(Tools → Secrets): key `ADB_AUTO_COLLECT`, value `0`. Only turn it back on
(remove the secret / set value `1`) when the gates say the 31-day run may
begin.

> In Replit, the **Run button** executes `npm run dev` (see `.replit`).
> If you press Run without the env var, collection may auto-start — so set the
> secret first, or start from the Shell with the command above.

### Exact shell commands (paste into the Replit Shell)

**A. Start the server (with auto-collect OFF — safe for verification):**
```
ADB_AUTO_COLLECT=0 npm run dev
```
The server boots, **applies the new database migrations (0018/0019/0020)
automatically** (this is where the new tables appear), starts the watchdog
(logs `[adb-collector] watchdog started ...`), and prints a full startup log.

**B. In a SECOND Shell tab, watch the live log stream:**
```
npm run logs
```
This follows `logs/collector.log` in real time (`tail -f`). Every console line
from the server is appended there (that's `installConsoleTee()`), so you see
webhook deliveries, watchdog ticks, batch opens/closes, reconciliation — and it
**survives tab refreshes / restarts**.

**C. See the last 200 lines (for pasting back to me):**
```
npm run logs:last
```
This is the command to run when you want to grab the recent activity and paste
it into the chat for me to analyze.

**D. See the whole log file (largest view):**
```
tail -n 1000 logs/collector.log
```

**E. One-command health check (DB direct, no server needed):**
```
npm run health
```
Prints PASS/FAIL for data freshness, balance vs reserve, rows today, active
batch tier mix. Exit code 0 = healthy.

**F. Gate-0 budget report:**
```
npm run gate0
```
Prints the full budget partition (§3.2) with the live ledger numbers.

### What you should SEE and send back to me

After starting with `ADB_AUTO_COLLECT=0 npm run dev`, paste me the output of:

```
npm run health
npm run gate0
npm run logs:last
```

The log should contain lines like:
- `[migrations] applied 0018...` / `0019...` / `0020...`  → migrations worked
- `[adb-collector] watchdog started (window=4h, budget=1900 ... softStop=50 margin ...)` → watchdog config is correct
- `[adb-collector] auto-start BLOCKED` **or** `[adb-collector] auto-start SKIPPED ...` → auto-collect is off / nothing starting, as intended
- any `error` / `⚠ ALERT` lines → things for me to diagnose

### When the gates pass and the real run may begin

1. Remove the `ADB_AUTO_COLLECT=0` secret (or set it to `1`).
2. Restart the server.
3. Watch with `npm run logs`.
4. The watchdog will auto-start one 4h batch per day, cap spend at 1,900/day,
   stop at SOFT_STOP, and pause on delivery failures — all visible in the log.

---

## 5. Audit snapshot (what existed before Phase 0 — for the record)

| Item | Plan delta | Code state at audit | Verified |
| ---- | ---- | ---- | ---- |
| Credit accounting (ledger + balance delta) | V3.9 §11, migration 0017 | `migrations/0017_collection_v39_credit_accounting.sql` exists; `adb_ingest_events`, `adb_collection_meta` present | `git log` |
| `maxDeliveryRetries = 0` | §15 R-delta / §45.5 | controller `adbCollectionController_v3.ts:490` + canary `credit_canary.ts` set `maxDeliveryRetries: 0` | grep |
| Daily credit cap 1,900 | §3.3 / DD-R | `dailyCreditCap` default 1900 (`adbCollectionController_v3.ts:95`) | read |
| `ADB_BATCH_BUDGET` default | §22 fix 3 (must be **1900**) | ❌ code still defaults **3000** (`adbCollectionController_v3.ts:81`) — FIXED in 1.1 | read |
| R1 subscription exclusivity / orphan cleanup | §15 | partial — orphan removal exists near `:979–998`; canary exclusivity assert not present — FIXED in 1.2 | read |
| R3 credit canary | §15 | `scripts/credit_canary.ts` reconciles C_external/C_internal/rows, settles `B_after==B_after_2` | read |
| R7 versioned manifest | §15 | `adb_collection_meta` get/set exists (`:227–233`); full manifest write not present — FIXED in 1.7 | read |
| R2 SOFT_STOP margin | §15 | ❌ not found in controller — FIXED in 1.3 | grep |
| R5 delivery-failure flag + reconcile-before-resume | §15, migration 0018 | ❌ migration 0018 not present; failure-pause text only — FIXED in 1.5 | ls |
| R6 crossover template freeze | §15 | ❌ not found — FIXED in 1.6 | grep |
| S1–S5 population/airborne layers | §15, migrations 0019–0020 | ❌ migrations 0019–0020 not present — FIXED in Step 2 | ls |
| Gate-0 budget-partition report | §17 step 3 | ❌ not present — FIXED in Step 3 | grep |

---

## 6. Verification commands (quick reference)

| Check | Command |
| ---- | ---- |
| Typecheck (does the code compile?) | `npm run check` |
| Start server, NO auto-collect (safe) | `ADB_AUTO_COLLECT=0 npm run dev` |
| Start server, auto-collect ON (run phase only) | `npm run dev` |
| Live log stream | `npm run logs` |
| Last 200 log lines (paste back to me) | `npm run logs:last` |
| Full recent log | `tail -n 1000 logs/collector.log` |
| Health / ledger | `npm run health` |
| Gate-0 budget report | `npm run gate0` |
| Canary (needs live env + exclusivity) | `npm run canary` |
| Coverage | `npm run coverage` |
| Export | `npm run export` |
| Migration files on disk | `ls migrations/` |

---

## 7. Change log (append-only)

### 2026-08-15 — Audit + this file created
- Audited code vs `V3.9_DataCollectPlan.md` §15/§17 (see audit snapshot above).
- Found: `ADB_BATCH_BUDGET` default 3000 must become 1900; R2/R5/R6/R7(S1–S5),
  migrations 0018–0020, and Gate-0 report are unimplemented.
- This tracking file created so every phase step is auditable.

### 2026-08-15 — Phase 0 Step 1 (R-deltas) COMPLETE
- 1.1 `ADB_BATCH_BUDGET` default 3000→1900 (`adbCollectionController_v3.ts:81`).
- 1.3 R2 SOFT_STOP margin: added `ADB_DAILY_SOFT_STOP_MARGIN` (default 50);
  watchdog stops active batch when today's actual spend ≥ `1900 − margin`,
  stop_reason `soft_stop`; startup log includes margin.
- 1.2 R1 canary exclusivity: `scripts/credit_canary.ts` now lists subscriptions
  first and FAILS if any foreign ACTIVE billable sub exists before the canary's
  own subscription is created.
- 1.5 R5: created `migrations/0018_collection_v39_delivery_failure_flag.sql`
  (`flagged_at`, `flag_reason` on flight rows; `reconcile_acked` on batches).
  Watchdog now calls `flagBatchRows(batchId,'delivery_failure')` before the
  delivery-failure stop, and `maybeAutoStartNextBatch` refuses auto-start while
  any un-acked `delivery_failure`/`soft_stop` batch exists.
- 1.6 R6: added `checkTemplateFreeze` (refuses template/experiment mismatch,
  declared window_shape/tier_mix, crossover period-2-without-period-1) called
  in `startBatchInner`; crossover block completion recorded to meta.
- 1.7 R7: added `writeManifest`/`readManifest` — stamps frame/config/scheduler/
  account (incl. 57,900 spendable envelope) into `adb_collection_meta` at batch
  start; called at end of `startBatchInner`.
- Bonus fix: removed plan violation at `adbCollectionController_v3.ts` — was
  writing `sampling_weight = 1/p`; now writes NULL (plan §8/§20: no auto 1/p).
- Verified: `npm run check` → 0 errors in edited files; the 57 pre-existing
  errors are all in `server/routes.ts` + client pages (untouched, backlogged).

### 2026-08-15 — Phase 0 Steps 2–4 COMPLETE
- 2.1/2.2 S1+S2: created `migrations/0019_collection_v39_population_and_events.sql`
  — `flight_population` (§5 provider-observable layer + coverage states +
  provenance), raw immutable envelope columns on `adb_ingest_events`
  (payload_sha256/raw_payload/parser_version/schema_version/http_metadata/
  upsert_outcome), and `flight_events` (one row per observation, four
  availability-rule timestamps, 8 FAA-ASPM milestones, airborne state).
- 2.3/2.4 S3+S4: `flight_events` is the append-only event log feeding the
  dedup table (provenance rebuildable from raw log; ingest_event_id + hash).
- 2.5–2.7 S5: created `migrations/0020_collection_v39_airborne_time_series.sql`
  — `raw_airborne_events` (keyed `event_key` on (flight, carrier,
  locReportedUtc), `clean_airborne_points`, `flight_trajectory`,
  `flight_airborne_snapshots` (prediction_state='AIRBORNE' only on snapshots).
  Added `researchEventKey()` + `appendResearchEvents()` to
  `flightDataPrePostStore_v3.ts` (ON CONFLICT DO NOTHING, never throws);
  wired into webhook ingress (`routes_v3.ts`) so every observation survives.
- Registered 0018/0019/0020 in `server/db.ts` BOOT_MIGRATIONS.
- 3.1/3.2 Step 3: created `scripts/gate0_budget_report.ts` (`npm run gate0`)
  printing the full §3.2 partition + arithmetic check + ledger spend vs the
  57,900 invariant + floor intactness.
- 4.1/4.2 Step 4: grep-verified no `sampling_weight=1/p` stamping and
  `maxDeliveryRetries=0` everywhere (controller, limiter, canary).
- Verified: `npm run check` → 0 errors in every Phase-0 file; 57 pre-existing
  errors remain in `server/routes.ts` + client pages (backlog). DB not
  reachable in this shell; migrations apply at Replit boot.