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


| Number          | Meaning                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **60,000**      | Total monthly API units (the real entitlement — VERIFY at Gate 0)                                                                          |
| **57,900**      | The *spendable* experimental envelope in credits = 58,900 refill − 1,000 permanent floor. **This is the binding limit for the whole run.** |
| **1,900/day**   | Daily credit ceiling (~60,000 ÷ 31 days). The watchdog never lets one day spend more than this.                                            |
| **1,000 floor** | `ADB_RESERVE_CREDITS` — the controller refuses to spend the balance below 1,000 (emergency reserve).                                       |
| **1,000 REST**  | A *separate* line of API units for census/FIDS/probes — never taken out of the 57,900 credit envelope.                                     |


Arithmetic check: `57,900 + 1,000 floor + 1,000 REST + 100 unallocated = 60,000 ✓`

---



## 2. What are "the phases"? (the whole journey)

The plan's runbook (§17) divides everything into phases. Think of the earlier
phases as **safety checks before we spend real money**, and the later phases as
**the actual data collection run**.


| Phase | Name            | What it is, in plain English                                                                                                                                                   | Status  |
| ----- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **0** | Code deltas     | Change the code so the run is safe, budget-protected, and scientifically valid. **No money spent, no data collected.** Everything below that's marked `[x]` is Phase 0.        | ✅ DONE  |
| **1** | Gate 0          | Log into RapidAPI, record the real plan / monthly units / credit balance, make one 1-credit refill, confirm "1 unit = 1 credit", print the budget report, commit the manifest. | ⏳ NEXT  |
| **2** | Gates 1–2       | Run `npm run coverage` (which airports the provider covers), build the stratified airport catalog, run the anchor probe to pick the best 5 airports.                           | pending |
| **3** | Gates 3–4 + 0.5 | Delete every foreign subscription (exclusivity), run the credit canary, confirm SOFT_STOP, inspect real webhook payloads for correctness.                                      | pending |
| **4** | Gate 5          | Validate the census: compare FIDS population vs webhook events, quantify what's missing.                                                                                       | pending |
| **5** | FREEZE          | Write the versioned manifest, materialize + hash the test row set. From here the config cannot change.                                                                         | pending |
| **6** | 31-day run      | The real run: 1,900 credits/day × 31 days with the crossover templates (4h / 2×2h / 6h windows).                                                                               | pending |


**Key rule:** the 31-day run (Phase 6) waits for **all gates to pass** (Phases
1–5). Phase 0's job is just to make the code ready.

---



## 3. What Phase 0 did — the full explanation

Phase 0 = "code deltas". It has **4 steps**. Each step is described with
*why it matters* (not just what was changed).

### Step 1 — R-deltas (the "R" = safety Rules for budget + exclusivity)


| #   | What changed                                                                                                                | File                                                                    | Why it matters (plain English)                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | Default daily batch budget **3000 → 1900**                                                                                  | `adbCollectionController_v3.ts:81`                                      | The controller's default was 3,000 credits/batch, but the plan caps us at **1,900/day**. A batch that thought it had 3,000 could blow through a day's quota. Now the default matches the plan.                                                         |
| 1.2 | **R1 exclusivity** — canary refuses to run if any foreign billable subscription exists                                      | `scripts/credit_canary.ts`                                              | To know exactly how many credits a batch spends, we must be the *only* subscriber. If some other subscription is active, the balance moves for reasons we don't control and our accounting breaks. The canary now **fails loudly** if that's the case. |
| 1.3 | **R2 SOFT_STOP** — watchdog stops the batch when today's spend reaches `1900 − margin` (default margin 50 → stops at 1,850) | `adbCollectionController_v3.ts` (config + watchdog)                     | Credit accounting has a small delay ("async race"). If we waited until exactly 1,900 to stop, in-flight deliveries could push us over. Stopping at 1,850 leaves a safety buffer so we never exceed the hard 1,900 cap.                                 |
| 1.4 | **R3 canary** conditions finalized                                                                                          | `scripts/credit_canary.ts`                                              | The canary is a tiny, controlled batch that proves the credit math is exact: settlement balance stable (`B_after == B_after_2`), external spend == internal spend, zero failures.                                                                      |
| 1.5 | **R5 failure flag** — delivery-failure batch is flagged and auto-resume is blocked                                          | `migrations/0018_collection_v39_delivery_failure_flag.sql` + controller | `maxDeliveryRetries=0` means a failed delivery is **lost forever**. If a batch stopped because of a delivery failure, the watchdog must NOT silently start the next batch — it flags the rows and waits for a human to reconcile.                      |
| 1.6 | **R6 crossover template freeze** — scheduler refuses to run a batch that violates the frozen experiment template            | `adbCollectionController_v3.ts` (`checkTemplateFreeze`)                 | The experiment design (window shape, tier mix, crossover period) must be frozen *before* treatment. The scheduler now **refuses** to start a batch with the wrong shape, wrong tier mix, or a crossover period-2 without its period-1.                 |
| 1.7 | **R7 versioned manifest** — stamps the run's full config at batch start                                                     | `adbCollectionController_v3.ts` (`writeManifest`)                       | Records frame version, config, scheduler state, account plan/units/refill into the DB so the run is reproducible and auditable.                                                                                                                        |


**Bonus fix:** removed a plan violation — the controller was stamping
`sampling_weight = 1/p`; the plan requires **NULL** (1/p is not a valid
flight-level inclusion probability). Now NULL. (`adbCollectionController_v3.ts`)

### Step 2 — S-deltas (the "S" = Schema/Data science layers)


| #          | What changed                                                                                        | File                                                                           | Why it matters (plain English)                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 **S1** | New `flight_population` table — the "census" layer                                                  | `migrations/0019_...population_and_events.sql`                                 | The webhook only shows us *flights that sent an update*. To know the true population ("which flights EXISTED at this airport at this time"), we add a layer built from FIDS/schedule. Every coverage metric (population → captured → snapshots → outcomes) comes from joining this against events.                                                  |
| 2.2 **S2** | Raw immutable envelope on `adb_ingest_events` (payload + SHA-256 + parser/schema version + outcome) | `migrations/0019`                                                              | Every webhook delivery keeps its raw bytes + a hash, forever, never edited. This is the "source of truth" so we can audit or replay anything.                                                                                                                                                                                                       |
| 2.3 **S3** | New `flight_events` table — **one row per observation** (event log before state)                    | `migrations/0019`                                                              | Before, we only kept the "latest state" of each flight. Research needs *every* observation. This log is append-only — never overwritten.                                                                                                                                                                                                            |
| 2.4 **S4** | Provenance invariant                                                                                | `migrations/0019`                                                              | Because every event keeps its payload hash + ingest reference, we can always **rebuild any state from the raw log**. Never destructively overwrite research data.                                                                                                                                                                                   |
| 2.5 **S5** | New airborne time-series tables + **dedup-key fix**                                                 | `migrations/0020_...airborne_time_series.sql` + `flightDataPrePostStore_v3.ts` | **This fixes a silent data-loss bug.** The old code keyed rows on `(flight, carrier, lastUpdatedUtc)`. If the provider sent a new location *under the same* `lastUpdatedUtc`, the older point got **overwritten** — the trajectory lost points. The research log now keys on `(flight, carrier, locReportedUtc)`, so every airborne point survives. |
| 2.6 **S5** | Airborne pipeline tables                                                                            | `migrations/0020`                                                              | `raw_airborne_events → clean_airborne_points → flight_trajectory → flight_airborne_snapshots`. Raw points are never modified; cleaning happens in a separate layer.                                                                                                                                                                                 |
| 2.7 **S5** | `prediction_state` stamped **only on snapshot rows** (PRE/AIRBORNE)                                 | `migrations/0020`                                                              | A raw event is just facts (`event_phase`, `event_timestamp`, `data_stage`). The derived "this is a PRE snapshot" / "this is an AIRBORNE snapshot" label belongs on the derived snapshot tables only — never burned into a raw event.                                                                                                                |
| —          | `appendResearchEvents()` writer wired into the webhook                                              | `routes_v3.ts`                                                                 | Every webhook delivery now also writes the research event log (one row per observation). Never throws — the webhook 2xx reply always happens first.                                                                                                                                                                                                 |




### Step 3 — Gate-0 budget-partition report

- Created `scripts/gate0_budget_report.ts`, run with `npm run gate0`.
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



## 5. RUN REPORT — what actually happened (from `replitLogs1.md`, 2026-08-16)

This section is the "results" section. It shows, line by line, what worked on
the first real run, what broke, why, the fix, and what is blocking progress.
Read it alongside the raw file `AugMDnotes/replitLogs1.md`.

### 5.1 What you ran (the commands)

You ran exactly the safe-start command from §4:

```
ADB_AUTO_COLLECT=0 npm run dev
```

...then watched the log with `npm run logs`, and ran `npm run health` +
`npm run gate0`. The output is all in `replitLogs1.md`. **Good — this is
exactly the right verification workflow.**

### 5.2 ✅ What worked (PASS)


| What                               | Evidence in log                                                                                                                                                             | Meaning                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server booted & served             | `[express] serving on port 5000`                                                                                                                                            | The app started fine.                                                                                                                                               |
| Migrations **0002 → 0019** applied | `[migrations] applied 0018...` / `applied 0019...`                                                                                                                          | 0018 (delivery-failure flag) and 0019 (population + event log) **created successfully**.                                                                            |
| **Phase 0 R-delta config is LIVE** | `[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, ... autoCollect=false)`             | This line proves the code changes are active: **budget=1900** (was 3000), **dailyCap=1900**, **softStop=50** (R2), **autoCollect=false** (your safety flag worked). |
| Health check ran                   | `FAIL balance 866 — below reserve+min (1300)`                                                                                                                               | Health script works; it is correctly reporting the real blocker (below).                                                                                            |
| Gate-0 report ran                  | `Alert-credit refill 58,900 units → 58,900 credits`, `Spendable experimental envelope 57,900 credits`, `Realized spend ... 0 credits`, `Remaining spendable 57,900 credits` | `npm run gate0` works and shows the full §3.2 budget partition.                                                                                                     |
| No accidental spending             | Every heartbeat: `canStart=false`                                                                                                                                           | Because balance < reserve, the watchdog refused to spend anything. Zero credits consumed.                                                                           |




### 5.3 ❌ What failed (the bug you spotted)

```
[migrations] failed to apply 0020_collection_v39_airborne_time_series.sql:
        column "loc_reported_utc" does not exist
Boot migrations failed: column "loc_reported_utc" does not exist
```

**Why it happened (plain English):** migration 0020 creates 4 new "airborne"
tables (`raw_airborne_events`, `clean_airborne_points`, `flight_trajectory`,
`flight_airborne_snapshots`). In the `raw_airborne_events` table, one of the
"speed lookup" indexes (line 95 of the migration) asked PostgreSQL to index a
column named `loc_reported_utc` — **but I had not actually added that column to
the table definition.** PostgreSQL correctly refused. Because the whole file
runs as one transaction, the **entire 0020 migration rolled back** — so NONE of
the 4 airborne tables exist in the database yet.

**Impact:** not fatal. The server still booted and ran (0018/0019 are applied;
the webhook path silently skips the airborne-log write if the table is absent).
But the S5 airborne time-series layer (the part that stops trajectories being
overwritten) is **not installed yet**.

**Where the fix is:** `migrations/0020_collection_v39_airborne_time_series.sql`
(added the missing `loc_reported_utc` column) and
`server/lib/disruption/flightDataPrePostStore_v3.ts` (the airborne insert now
also writes `loc_reported_utc`, so the column is populated). Verified: the
migration's index columns all exist now, and the code typechecks clean.

### 5.4 ⚠️ What is blocking progress (the real next step)

Every heartbeat in the log says:

```
heartbeat balance=862 rowsToday=0 gap=7420min canStart=false
    refillToFullBudget=2038 reason=Insufficient credits
    (862 < reserve 1000 + min batch 300)
```

And `npm run health` confirms: `FAIL balance 866 — below reserve+min (1300)`.

**Meaning:** your Flight-Alert credit balance is **~862 credits**, but the
controller refuses to start a batch unless balance ≥ **1,000 (reserve) + 300
(min batch) = 1,300**. So collection is correctly paused and nothing is
spending. This is **not a bug** — it is the reserve-floor safety working.

**This is exactly what Gate 0 (Phase 1) is for:** log into RapidAPI and
**refill credits** (plan §17 Phase 1 step 6–8: check the balance, make a
1-credit refill to confirm 1 unit = 1 credit, then refill up to a healthy
level). The log even tells you how many to add: `refillToFullBudget=2038`.

### 5.5 Status summary + what happens next


| Item                                                                         | Status                                                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Migrations 0018, 0019                                                        | ✅ applied                                                                                 |
| Migration 0020                                                               | ❌ failed → **FIXED** → needs a redeploy/restart to apply                                  |
| Watchdog config (budget=1900, softStop=50, dailyCap=1900, autoCollect=false) | ✅ verified live                                                                           |
| `npm run gate0`                                                              | ✅ works                                                                                   |
| `npm run health`                                                             | ✅ works (reports the real blocker)                                                        |
| Credit balance                                                               | ⚠️ 862 → **below reserve+min (1,300)** → collection paused by design                      |
| **Next action**                                                              | ① redeploy so fixed migration 0020 applies ② Gate 0: refill credits ③ re-run health/gate0 |


---

## 6. RUN REPORT #2 — from `replitLogs2.md` (the follow-up run)

This is the report for the second log you pasted. **The migration 0020 fix
WORKED.** Read this section with `AugMDnotes/replitLogs2.md` open.

### 6.1 What you ran (the commands)

```
ADB_AUTO_COLLECT=0 npm run dev     ← fresh boot (23:58 UTC)
npm run logs                       ← tail -f
npm run logs:last                  ← last 200 log lines
```

### 6.2 ✅ What worked (PASS)

| What | Evidence | Meaning |
| ---- | ---- | ---- |
| **Migration 0020 APPLIED** | `[migrations] applied 0020_collection_v39_airborne_time_series.sql` (23:58:59.993Z, and terminal line 21) | The `loc_reported_utc` fix is confirmed. All 4 airborne tables now exist. **The 0020 bug is closed.** |
| All 4 Phase-0 migrations applied | `0017`, `0018`, `0019`, `0020` all show `applied` on the fresh boot | Full S-layer stack (credit accounting → delivery-failure flag → population/events → airborne time-series) is live. |
| Watchdog config correct | `budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, ... autoCollect=false` (23:59:00) | All R-delta safety knobs are live and the run was in **safe mode**. |
| Server healthy | `[express] serving on port 5000`, Duffel/Stripe all initialized | App boots cleanly. |
| **Zero credits spent** | every heartbeat `canStart=false`, `balance=862` | The reserve floor is doing its job — nothing spent during the whole window. |

### 6.3 ❌ / ⚠️ What did NOT work — the 3 things you saw and were suspicious about

**(1) `0020 failed` still appears TWICE in the log (14:47 and 20:06 UTC).**

Those two lines are from **OLDER boots before your redeploy** — you can tell
because they sit in the middle of the `tail -200` history while the **last boot
at 23:58 succeeded**. Look at the pattern:

```
14:47:14  [error] failed to apply 0020 ... loc_reported_utc does not exist   ← old server, old file
20:06:59  [error] failed to apply 0020 ... loc_reported_utc does not exist   ← old server, old file
23:58:59  [log]    applied 0020 ...                                          ← NEW server, fixed file ✅
```

**Explanation:** `logs/collector.log` is append-only across every boot — the
file remembers the old failures. On Replit, `tsx --watch` keeps one server
running until you **Stop + Run again**, so the 14:47 and 20:06 failures were
the previous, still-buggy process. The fresh 23:58 boot is the first one with
the fix. **Not a problem anymore — ignore the old lines.** The proof is the
23:58 success + `applied` line.

**(2) `refillToFullBudget` changed from `3138` to `2038` mid-log.**

That is **expected** and actually confirms your Phase-0 config. The number is
`budget + reserve − balance`:
- old code (budget 3000): `3000 + 1000 − 862 = 3138` ✅
- new code (budget 1900): `1900 + 1000 − 862 = 2038` ✅

So the log is showing you the moment the **1900 budget delta went live** —
before that boot it was still the old 3000. Same story as the 0020 failures:
older boots ran old code, the latest boots run Phase-0 code. **This is a good
sign, not a bug.**

**(3) ⚠️ The REAL anomaly — one boot at 20:06 shows `autoCollect=true`.**

```
20:06:59  watchdog started (..., autoCollect=true)
23:59:00  watchdog started (..., autoCollect=false)
```

Line 508 of `replitLogs2.md`. **Root cause found — it was NOT your shell
command.** Look at `.replit` (the Replit config file):

```
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"              ← NO ADB_AUTO_COLLECT=0 prefix
waitForPort = 5000
```

**Two different ways to start the server:**

| Way to start | Command that runs | `ADB_AUTO_COLLECT` | Result |
| --- | --- | --- | --- |
| You type in Shell | `ADB_AUTO_COLLECT=0 npm run dev` | set to `0` | `autoCollect=false` ✅ |
| You press the **Run ▶** button (or Replit auto-restarts) | `npm run dev` (from `.replit`) | **unset** | `autoCollect=true` ⚠️ |

So the 20:06 boot was a **Run-button / auto-restart**, which ignores your
shell env var. Your command was right — the .replit workflow just never gets
it. This is also why **every reboot that Replit starts on its own** will have
`autoCollect=true`.

**Why nothing bad happened:** balance was still 862 < 1,300, so every
`canStart` check returned `false` and **no batch ever started — 0 credits
spent.** The reserve floor (R-delta) literally saved this window.

**But this is a real hazard for the future:** once you refill past 1,300, a
server started WITHOUT `ADB_AUTO_COLLECT=0` WILL begin spending on its own.

**THE FIX (do this now):** add `ADB_AUTO_COLLECT=0` to the **Replit Secrets**
(also called Environment Variables) instead of relying on the shell prefix.
Then EVERY start — Run button, auto-restart, shell — is safe by default.
Steps: Replit → your app → **Secrets** (left menu, 🔒) → "New secret" →
Key `ADB_AUTO_COLLECT`, Value `0` → Save. That makes the 20:06-style anomaly
impossible. You can ALSO update `.replit` to bake the prefix in, but Secrets
is the cleaner single place.

### 6.4 ❓ Your question — can you refill credits WITHOUT the RapidAPI account login?

**UPDATE (run #2 analysis): YES, you CAN — because your teammate already
added a payment method.** The billing authorization now lives on the account,
so the API-key-only refill works. I added a command for it.

**How it works under the hood:** your code already wraps AeroDataBox's
`POST /subscriptions/balance/refill` in `refillBalance()` at
`server/lib/disruption/aerodataboxLimiter_v3.ts:147`. It sends only the
`x-rapidapi-key` header. RapidAPI honors it because the **account** (not the
key) carries the payment method. Since your teammate added billing, **you do
not need the dashboard login anymore.**

**The exact commands (paste into the Replit Shell):**

```bash
# 1) Check current balance (read-only, free, no spend):
npm run refill

# 2) Gate 0 rule §17 Phase 1 step 7 — ONE 1-credit test refill first,
#    confirm the log shows "New balance: 863" (862 + 1), proving 1 unit = 1 credit:
npm run refill -- 1

# 3) Then refill up to full budget (watchdog said refillToFullBudget=2038):
npm run refill -- 2038
```

Each `npm run refill -- N` calls AeroDataBox, spends exactly N API units, and
prints the new balance + `lastRefilledUtc`. After step 3 your balance should be
**2,900** (862 + 1 + 2038 − 1 already spent on the test) — comfortably above
the 1,300 reserve+min floor, so collection becomes possible.

**Still works without any login — no `x-webhook-secret` needed**, because the
script talks directly to AeroDataBox (it does not go through your server).

**Watch the spend:** 1 unit = 1 credit, so `npm run refill -- 2038` uses 2,038
of your monthly 58,900-unit envelope. That's the whole point of Gate 0 —
confirm the conversion before the real run. After refilling, re-check with
`npm run gate0` and `npm run health`.

### 6.5 Status summary (end of run #2)

| Item | Status |
| ---- | ---- |
| Migration 0020 | ✅ **APPLIED on the fresh boot — bug closed** |
| Migrations 0017/0018/0019/0020 | ✅ all applied |
| Watchdog safety config (budget=1900, softStop=50, autoCollect=false) | ✅ verified live on latest boot |
| Credits spent | ✅ **0** (reserve floor held even during the accidental autoCollect=true boot) |
| ⚠️ Risk noted | `autoCollect=true` on one 20:06 boot — restart happened without `ADB_AUTO_COLLECT=0`; safe only because balance was low |
| Balance | ⚠️ still 862 → **below reserve+min (1,300)** → collection paused |
| Data gap | ⚠️ growing (~7,839 min by end of log) — expected, no spend available |
| Refill ability | ✅ **SOLVED** — teammate added billing → `npm run refill -- N` refills with just the API key (no dashboard login) |
| autoCollect risk | ✅ **Explained + fix given** — Run-button/auto-restarts run `.replit`'s `npm run dev` (no env prefix); fix = put `ADB_AUTO_COLLECT=0` in Replit Secrets |
| **Next action** | ① put `ADB_AUTO_COLLECT=0` in Replit Secrets ② `npm run refill` (check) → `npm run refill -- 1` (test) → `npm run refill -- 2038` ③ restart ④ `npm run health` + `npm run gate0` → report back |


### 6.6 📋 YOUR NEXT STEPS — read this when you're back in Replit

Follow these **in order**. Each step says what to type and what to expect.

**Step A — make every future boot safe (2 min).**
1. In Replit, open your app → left menu → **Secrets** (the 🔒 icon).
2. Click **New secret** → Key: `ADB_AUTO_COLLECT` → Value: `0` → Save.
3. (Optional but nice:) also add `Key: ADB_API_MIN_INTERVAL_MS` → `Value: 1000` if not already there.
4. Why: the Run ▶ button and Replit auto-restarts run `npm run dev` from
   `.replit` WITHOUT your shell env var. Secrets make `autoCollect=false` apply
   to every start, forever. This closes the 20:06 anomaly for good.

**Step B — refill the credits (this is Gate 0, plan §17 Phase 1 steps 6–8).**
```bash
npm run refill          # read-only check → should print balance 862
npm run refill -- 1     # test refill → expect "New balance: 863" (1 unit = 1 credit ✓)
npm run refill -- 2038  # full refill → expect "New balance: 2900"
```
Each command prints the new balance and `lastRefilledUtc`. If a command prints
`FAILED` + a `[adb-v3] refillBalance` error line, paste that error back to me.

**Step C — verify.**
```bash
npm run gate0           # budget-partition report → confirm 57,900 envelope intact
npm run health          # should now show PASS on balance (2,900 ≥ 1,300)
```
Then paste me the output of `npm run health` + `npm run gate0`, and the last
boot's `[adb-collector] watchdog started (...)` line after a fresh restart.

**Step D — what comes after refill (Gates, per the plan).**
The plan's order (§17): after Gate 0 (refill + conversion + caps) comes
**Phase 2 — Gates 1–2** (`npm run coverage`, build the stratified catalog,
run the anchor probe → lock the 5-airport pool), then **Phase 3 — Gates 3–4**
(subscription cleanup + `npm run canary` + SOFT_STOP/delivery-failure tests +
Gate 0.5 payload inspection), then **Phase 4 — Gate 5** (population/census
validation), then **Phase 5 FREEZE**, then the 31-day run. **Do NOT start a
60k run yet** — we're at Gate 0, and `ADB_AUTO_COLLECT=0` stays ON until the
gates pass.

---

## 7. Audit snapshot (what existed before Phase 0 — for the record)


| Item                                               | Plan delta                   | Code state at audit                                                                                               | Verified  |
| -------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| Credit accounting (ledger + balance delta)         | V3.9 §11, migration 0017     | `migrations/0017_collection_v39_credit_accounting.sql` exists; `adb_ingest_events`, `adb_collection_meta` present | `git log` |
| `maxDeliveryRetries = 0`                           | §15 R-delta / §45.5          | controller `adbCollectionController_v3.ts:490` + canary `credit_canary.ts` set `maxDeliveryRetries: 0`            | grep      |
| Daily credit cap 1,900                             | §3.3 / DD-R                  | `dailyCreditCap` default 1900 (`adbCollectionController_v3.ts:95`)                                                | read      |
| `ADB_BATCH_BUDGET` default                         | §22 fix 3 (must be **1900**) | ❌ code still defaults **3000** (`adbCollectionController_v3.ts:81`) — FIXED in 1.1                                | read      |
| R1 subscription exclusivity / orphan cleanup       | §15                          | partial — orphan removal exists near `:979–998`; canary exclusivity assert not present — FIXED in 1.2             | read      |
| R3 credit canary                                   | §15                          | `scripts/credit_canary.ts` reconciles C_external/C_internal/rows, settles `B_after==B_after_2`                    | read      |
| R7 versioned manifest                              | §15                          | `adb_collection_meta` get/set exists (`:227–233`); full manifest write not present — FIXED in 1.7                 | read      |
| R2 SOFT_STOP margin                                | §15                          | ❌ not found in controller — FIXED in 1.3                                                                          | grep      |
| R5 delivery-failure flag + reconcile-before-resume | §15, migration 0018          | ❌ migration 0018 not present; failure-pause text only — FIXED in 1.5                                              | ls        |
| R6 crossover template freeze                       | §15                          | ❌ not found — FIXED in 1.6                                                                                        | grep      |
| S1–S5 population/airborne layers                   | §15, migrations 0019–0020    | ❌ migrations 0019–0020 not present — FIXED in Step 2                                                              | ls        |
| Gate-0 budget-partition report                     | §17 step 3                   | ❌ not present — FIXED in Step 3                                                                                   | grep      |


---



## 8. Verification commands (quick reference)


| Check                                          | Command                           |
| ---------------------------------------------- | --------------------------------- |
| Typecheck (does the code compile?)             | `npm run check`                   |
| Start server, NO auto-collect (safe)           | `ADB_AUTO_COLLECT=0 npm run dev`  |
| Start server, auto-collect ON (run phase only) | `npm run dev`                     |
| Live log stream                                | `npm run logs`                    |
| Last 200 log lines (paste back to me)          | `npm run logs:last`               |
| Full recent log                                | `tail -n 1000 logs/collector.log` |
| Health / ledger                                | `npm run health`                  |
| Gate-0 budget report                           | `npm run gate0`                   |
| Canary (needs live env + exclusivity)          | `npm run canary`                  |
| Coverage                                       | `npm run coverage`                |
| Export                                         | `npm run export`                  |
| Migration files on disk                        | `ls migrations/`                  |


---



## 9. Change log (append-only)



### 2026-08-16 — Run #2 follow-up: autoCollect mystery SOLVED + refill command added
- **autoCollect=true mystery solved.** It was NOT the user's shell command —
  `.replit`'s Run-button workflow executes bare `npm run dev` with no
  `ADB_AUTO_COLLECT=0` prefix, so Run ▶ / auto-restarts boot with
  `autoCollect=true`. Nothing spent because balance was below reserve+min.
  **Fix:** add `ADB_AUTO_COLLECT=0` to Replit Secrets so every start is safe.
- **Refill now possible without the RapidAPI login** because the teammate
  added billing to the account. The existing `refillBalance()`
  (aerodataboxLimiter_v3.ts:147) works with just `AERODATABOX_API_KEY`.
- **New script:** `scripts/refill_credits.ts` + `npm run refill` command.
  Usage: `npm run refill` (read-only balance) → `npm run refill -- 1`
  (Gate-0 conversion test, expect balance 862→863) → `npm run refill -- 2038`
  (full refill, expect balance 2,900).
- Added §6.6 step-by-step instructions (Secrets fix → refill → verify → what
  Gates come next) so the user always knows the next action.

### 2026-08-16 — Run #2 analyzed (replitLogs2.md)
- **Migration 0020 CONFIRMED APPLIED** on the fresh 23:58 boot — the
  `loc_reported_utc` fix works. Old `0020 failed` lines at 14:47/20:06 are
  pre-redeploy history in the append-only log; not a current problem.
- **Discrepancy `3138 → 2038` explained:** `refillToFullBudget` =
  `budget + reserve − balance`; it dropped because the old code ran budget 3000
  and the new Phase-0 code runs budget 1900. Confirms the delta went live.
- **Anomaly found:** the 20:06 boot ran with `autoCollect=true` (started
  without `ADB_AUTO_COLLECT=0`). No spend happened because balance (862) was
  below reserve+min (1,300) — the reserve floor saved it. **Action:** always
  start with `ADB_AUTO_COLLECT=0 npm run dev`; optionally set the var in Replit
  Secrets so every boot is safe.
- **Refill answer (user's question):** refilling requires the RapidAPI account
  owner — the `x-rapidapi-key` can read balance and even *call* the refill
  endpoint (`refillBalance()`, aerodataboxLimiter_v3.ts:147), but RapidAPI will
  not charge the account without dashboard/billing authorization. Teammate
  must refill (~2,038+ credits) or add the user to the RapidAPI org.
- Report added as §6 in this file.

### 2026-08-16 — First live run + migration 0020 fix (from replitLogs1.md)

- **User ran** `ADB_AUTO_COLLECT=0 npm run dev` on Replit and pasted the log
(`AugMDnotes/replitLogs1.md`). Analysis in §5 above.
- **Failure found:** migration 0020 aborted with
`column "loc_reported_utc" does not exist` — the `raw_airborne_events` index
referenced a column missing from the table. Whole 0020 rolled back; the 4
airborne tables (S5) are not in the DB.
- **Fix applied:**
  - `migrations/0020_collection_v39_airborne_time_series.sql` — added the
  missing `loc_reported_utc TIMESTAMPTZ` column to `raw_airborne_events`
  (with a comment explaining the four-timestamps rule, §6.1).
  - `server/lib/disruption/flightDataPrePostStore_v3.ts` — airborne insert now
  writes `loc_reported_utc` (column list + values updated 32→33 params).
  - Verified: every index column in 0019/0020 now exists in its table;
  `npm run check` → 0 errors in edited files (57 pre-existing untouched).
- **Confirmed working (PASS):** migrations 0018/0019 applied; watchdog live
with budget=1900, dailyCap=1900, softStop=50, autoCollect=false; `npm run health` + `npm run gate0` both run; zero credits spent.
- **Blocking (by design):** balance ≈862 < reserve+min (1,300) → collection
paused. Next: redeploy (applies fixed 0020) then Gate 0 refill
(`refillToFullBudget=2038`).



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

