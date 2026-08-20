# IMPLEMENTATION LOG — V3.9 Flight-Delay Data Collection

This is the running record of the V3.9 project. The binding specification is
**`V3.9_DataCollectPlan.md` PART 1 (§1–§22)** — we never edit that file, we only
explain and execute it. This log tells you, in this order:

1. **Where we are right now** (§0)
2. **What to do next, as one complete ordered command list** (§1)
3. **What the plan says, section by section** (§2)
4. **The phase roadmap with steps inside phases** (§3)
5. **The science, taught slowly** (§4 statistics, §5 glossary, §6 tables)
6. **The most important code** (§7)
7. **The records — how to see them again after a Replit restart** (§8, §9)
8. **The run reports and change history** (§10, §11, §12 archive)

Click any heading in the table of contents to jump to it.

## Table of contents

- [0. Where we are right now](#0-where-we-are-right-now)
- [1. What to do next (one ordered list)](#1-what-to-do-next-one-ordered-list)
- [2. The V3.9 plan PART 1, section by section](#2-the-v39-plan-part-1-section-by-section)
- [3. Phase-by-phase walkthrough (phases with steps)](#3-phase-by-phase-walkthrough-phases-with-steps)
- [4. Teaching: statistics and probability refresher](#4-teaching-statistics-and-probability-refresher)
- [5. Teaching: glossary of every technical term](#5-teaching-glossary-of-every-technical-term)
- [6. Teaching: the tables and their columns](#6-teaching-the-tables-and-their-columns)
- [7. The most important code, explained](#7-the-most-important-code-explained)
- [8. Shell commands to check the records (history survives restarts)](#8-shell-commands-to-check-the-records-history-survives-restarts)
- [9. Money, dates, and credits ledger](#9-money-dates-and-credits-ledger)
- [10. Run report: rl8 (2026-08-18) analyzed](#10-run-report-rl8-2026-08-18-analyzed)
- [11. Change log (newest first)](#11-change-log-newest-first)
- [12. Archive (outdated and historical)](#12-archive-outdated-and-historical)

---

## 0. Where we are right now

### 0.1 The one-sentence status

**We have finished Phase 0 (all code deltas), most of Phase 1 (Gate 0), and steps
10 + 11 of Phase 2 (coverage measurement and the measured sampling frame). Step 12
(the anchor probe) is built. On 2026-08-19 (rl9) we proved AeroDataBox CAN reach
our webhook (HTTP 200), but the **Gate-3 canary FAILED**: AeroDataBox sent one
delivery, charged 1 credit, and our webhook handler threw — 0 items stored,
`delivery_failure=1`. That bug is now fixed in code (see §0.3.2). The WSSS probe
you started *before* the fix will have hit the same failure; we re-run it after
the canary passes.**

Total spend so far: **1 credit** (the failed canary delivery). The 31-day run has
NOT started (`autoCollect=false`).

### 0.2 The status board

| Item | Value | Meaning |
| --- | --- | --- |
| Overall phase | **Phase 2 — Gates 1–2** in progress | steps 10–12 of the runbook |
| Step 10 — coverage | DONE | universe 4,332; our 267 collectable; Gate-1 sanity passes |
| Step 11 — stratified catalog | DONE | frame = 4,320 airports, 18/18 tier×region strata |
| Step 12 — anchor probe | SCRIPT READY; **canary blocked it on 08-19** | bug fixed; re-run canary → probes |
| Webhook reachability | **CONFIRMED (HTTP 200)** | `--check-webhook` on 08-19, rl9 |
| Gate-3 canary | **FAILED on 08-19** → **root cause fixed** | 1 delivery, 1 credit, 0 stored, `delivery_failure=1`; `is_randomized` NOT-NULL bug (§0.3.2) |
| Balance (live) | **2,900 credits** | 2,901 − 1 (the failed canary delivery) |
| Credits spent so far | **1** | one SEND that failed to store; no real spend |
| Data rows total | 4,316 | from earlier testing, not the run |
| Rows today | 0 | nothing stored yet |
| Frame size | 4,320 airports | 267 curated + 4,053 unclassified — **the 267 is a *subset*, NOT the frame** |
| Frame strata | 18/18 non-empty | 3 tiers × 6 macro-regions, all populated |
| post-eligible | 2,264 airports | can serve the POST/AIRBORNE layer |
| autoCollect | `false` | nothing starts by itself |
| 31-day run | NOT started | waits for all gates 1–5 |

### 0.3 What the last run (rl8) actually showed — the honest version

You pasted the outputs into `AugMDnotes/rl8.md` out of order. Reordered, here is
what happened on 2026-08-18 (all times UTC):

1. `git pull origin main` worked — fast-forward to `73affad`, migrations `0023`
   arrived, and a fresh `ADB_AUTO_COLLECT=0 npm run dev` applied all migrations
   through `0023` with `autoCollect=false`. That part was clean.
2. `--status` correctly printed "No probes recorded yet."
3. `--stage 1` started a KLAX probe (2 h window, subscription
   `99cdf2be-8016-4a91-ab8c-22246fabbd8d`).
4. The probe was **interrupted** and `--stage 2` was started (KLAX, 4 h window,
   subscription `9c87e594-c245-4126-af71-97e3acbef457`) **before stage 1 finished**.
   That is out of plan order (stage 2 must confirm stage-1 picks) and it orphaned
   the first subscription.
5. `--score` correctly said **"No calibration baseline probed yet"** — because no
   probe ever completed.
6. The log shows `balance=2901 rowsToday=0` for **hours** — **AeroDataBox never
   delivered a single webhook to us.**

Two things matter here:

- **Two orphaned ACTIVE subscriptions remain** (`99cdf2be…` and `9c87e594…`).
  The plan's R1 rule (exclusivity) forbids foreign active billable subscriptions —
  these would make the Gate-3 canary fail and corrupt balance-delta accounting. We
  added a `--cleanup` mode to delete them (see §1, §7).
- **Zero deliveries means the webhook path is unverified.** Either AeroDataBox
  cannot reach our public webhook URL, or the subscription never activated. The
  new `--check-webhook` mode and the Gate-3 canary exist precisely to answer this
  before we spend anything.

### 0.3.2 What the last run (rl9, 2026-08-19) actually showed

You pasted the outputs into `AugMDnotes/rl9.md` in order this time. Here is the
honest reading:

| Step | Command | Result | Verdict |
| --- | --- | --- | --- |
| 1 | `git pull origin main` | fast-forward `73affad → 6bcea50` | ✅ |
| 2 | `pkill -9 -f node` + `ADB_AUTO_COLLECT=0 npm run dev` | all migrations applied incl. 0023; `autoCollect=false` | ✅ |
| 3 | `--check-webhook` | **HTTP 200 — OK**; URL `https://95ac2e69-…-00-265uxlvlm69md.kirk.replit.dev:443/api/v1/webhooks/aerodatabox` | ✅ **first real proof AeroDataBox can reach us** |
| 4 | `--cleanup` | `0 of 0` orphans; no other ACTIVE credit subs | ✅ (the rl8 orphans were already gone — the `--force` you ran earlier cleaned them) |
| 5 | `npm run health` + `npm run gate0` | balance 2,901 live; floor intact; `data flow`/`active batch` FAIL lines are expected while idle | ✅ |
| 6 | `npm run canary` | **FAIL** — see below | ❌ → **root cause fixed** |
| 7 | `--stage 1 --icao WSSS` | subscription `6a73207d-…` created `isActive=true`, then *you ran it before the canary passed* | ⚠️ re-run after canary PASS |

**The canary FAIL, decoded:**

```text
balance_before 2901 → balance_after 2900   → C_external = 1   (AeroDataBox charged 1 credit)
C_internal (items) = 0                       → the ledger stored 0 items
rows stored/ins/upd/skip = 0/0/0/0           → nothing went into flight_data_pre_post
delivery_failures = 1                        → the webhook handler threw an error
result = FAIL
```

So AeroDataBox **did** deliver (that is why it charged 1 credit) — our server
received the POST but the handler threw **before** storing anything, and the
`delivery_failure` row was written. That is a *server-side* bug, not a
reachability problem. This is exactly why the canary exists: it costs ~1 credit
to catch a bug that would otherwise burn a 2-hour probe window.

**Root cause (found in the code, fixed on 2026-08-19):** migration 0022 created
`is_randomized` as **`NOT NULL DEFAULT false`**, but the webhook extractor sent
`isRandomized: null` for any delivery that had no managed batch (a probe/canary
subscription has no batch). Inserting NULL into a NOT NULL column → Postgres
error → the whole webhook handler threw → 0 rows stored + `delivery_failure=1`.
The extractor now defaults unmanaged rows to `isRandomized: false` (they are
never randomized), which satisfies both the NOT NULL column and the V3.8
boolean rule. **Your WSSS probe (step 7) ran before this fix, so it will have
hit the same failure — its 0-delivery outcome does not tell us anything about
WSSS. Re-run it after the canary passes.**

### 0.4 What needs to happen next (summary)

One ordered sequence, detailed in §1:

`git pull` (gets the fix) → safe boot → `--cleanup` (just in case the WSSS probe
was interrupted) → `npm run canary` (**must now show PASS with >0 items stored**)
→ stage 1 probes one airport at a time (WSSS first, then OMAA, then the rest) →
`--status` → `--score` → `--stage 2` → lock the 5-airport pool. Then Phases 3–6.

### 0.5 Dates worth remembering

| Date (UTC) | Event |
| --- | --- |
| 2026-08-16 | Run reports 1–3: migrations live, refill confirmed 1 unit = 1 credit, balance 862 → 2,901 |
| 2026-08-17 | Frame decision (Option 1: measured universe), step-11 script built |
| 2026-08-18 | **Step 11 DONE** (rl7); step-12 script + migration 0023 + CODE_WALKTHROUGH written; **first probe attempt** (rl8) — 0 deliveries, 0 spend, 2 orphaned subs |
| 2026-08-19 | Log restructured; probe hardened; **rl9: webhook reachable (200), canary FAIL → root cause (`is_randomized` NOT NULL) found + fixed; spend so far = 1 credit; WSSS probe re-run needed** |

---

## 1. What to do next (one ordered list)

> This is the complete, ordered list — every command, in order, with what to look
> for. Do not skip. Every command below is safe (nothing collects by itself).
> This is the **current** list (post-rl9). The previous list (the version that
> told you to do `--check-webhook` → `--cleanup` → canary → probes) is archived in
> §12.10 — every time the situation moves, the old "what to do next" moves to the
> archive so you can always look back.

### Step 1 — Get the fix

```bash
git pull origin main
```

What to look for: `server/lib/disruption/flightNotificationExtractor_v3.ts`
updates. That file contains the fix for the rl9 canary failure (see §0.3.2).

### Step 2 — Stop the old server, then boot safely

```bash
pkill -9 -f node
ADB_AUTO_COLLECT=0 npm run dev
```

What to look for in the boot log:

- `[migrations] applied 0023_anchor_probe_results.sql` (all migrations re-run every
  boot — this is expected).
- `[adb-collector] watchdog started (... autoCollect=false)` — the safe mode is on.
- `[express] serving on port 5000`.

### Step 3 — Re-confirm the webhook is reachable (30 seconds)

```bash
npm run anchor-probe -- --check-webhook
```

Expect `→ HTTP 200 — OK` like rl9. Any HTTP status proves AeroDataBox can reach
us. A network error means fix `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL` first. Note:
the boot log already showed `GET /api/v1/webhooks/aerodatabox 200` in rl9 — this
is just the safety re-check.

### Step 4 — Clean up anything the interrupted WSSS probe left

```bash
npm run anchor-probe -- --cleanup
```

Your WSSS probe (`6a73207d-…`) was started *before* the fix. If it was interrupted
before it finished its 2 h window, this deletes its subscription and marks the row
`abandoned`. Expect `probe-owned orphan subs deleted: 0 of 0` if it completed, or
`1 of 1` if it did not.

### Step 5 — Confirm money and health

```bash
npm run health
npm run gate0
```

Look for: `PASS balance 2900 (live-api)`, `Permanent floor (1000) intact YES`,
`Run-total invariant HOLDING`. The `data flow` / `active batch` FAIL lines are
expected (nothing started yet). Spend so far: **1 credit**.

### Step 6 — The one controlled live test (Gate 3 canary) — THE GATE NOW

```bash
npm run canary
```

This subscribes to one busy airport (KLAX by default) for ~2 minutes and checks
three things: (a) no foreign active subscription, (b) `C_external` (balance delta)
equals `C_internal` (notification items) within tolerance, (c) zero delivery
failures. **The result must be PASS with more than 0 items stored.**

This is the command that FAILED on 08-19 (`delivery_failure=1`, 0 items). The
`is_randomized` bug is fixed, so it should now PASS. If it still FAILs, stop and
tell me — **do not run the probes.** This is what the canary is for: ~1 credit to
prove the whole path works before a 2-hour probe.

### Step 7 — Run stage 1, one airport at a time (2 h each)

First, the timing question answered, because it decides how you run this:

- **Each `--stage 1 --icao X` command ITSELF waits the full 2 hours in the same
  process.** It creates the subscription, prints `probing 2h`, then *blocks* (waits
  the window), then deletes the subscription and records results. So you run ONE
  command, walk away for 2 hours, come back and read the output. You do **not**
  time it by hand and you do **not** need a separate timer.
- **Run them one at a time — never in parallel shells.** The plan's R1 exclusivity
  rule allows only ONE active billable subscription at a time (balance-delta
  accounting breaks with two). The script's R1 guard refuses to start if any other
  active credit subscription exists, so parallel probes will simply refuse.
- **Why not one big `--stage 1` command that does all 12 back-to-back?** The script
  *can* do that (`npm run anchor-probe -- --stage 1` loops the whole shortlist, 2 h
  each ≈ 24 h in one process), but a single 24-hour process on Replit is fragile: a
  shell timeout or tab close kills the whole loop mid-airport and leaves an orphan
  subscription. Running one airport per command means a failure only costs that
  airport, and `--cleanup` always recovers it. That is the "run them one at a time
  so a shell timeout never leaves an orphan again" instruction — the orphan problem
  is about Replit killing a long-running shell, not about you forgetting a timer.

So, in order (WSSS first — see below):

```bash
npm run anchor-probe -- --stage 1 --icao WSSS   # wait ~2h, then read the result
npm run anchor-probe -- --stage 1 --icao OMAA   # wait ~2h
npm run anchor-probe -- --stage 1 --icao KLAX
npm run anchor-probe -- --stage 1 --icao KORD
npm run anchor-probe -- --stage 1 --icao EGLL
npm run anchor-probe -- --stage 1 --icao EDDF
npm run anchor-probe -- --stage 1 --icao LFPG
npm run anchor-probe -- --stage 1 --icao VHHH
npm run anchor-probe -- --stage 1 --icao RJTT
npm run anchor-probe -- --stage 1 --icao OMDB
npm run anchor-probe -- --stage 1 --icao SBGR
npm run anchor-probe -- --stage 1 --icao YSSY
```

**WSSS and OMAA first — what "calibration baseline" means here:** WSSS and OMAA
are airports — Singapore Changi and Abu Dhabi Zayed. The plan's known references
say WSSS yields roughly **331 rows per hour** and OMAA roughly **127 rows per
hour** when probed. Those are just reference points for *how busy the airport is
in terms of data per hour* — a busy hub gives more rows/hour than a smaller one.
We re-probe WSSS and OMAA **ourselves, with the exact same 2 h protocol** as every
other candidate, so the reference used to standardize the other airports is
*measured identically*, not assumed from the plan. That is the calibration
baseline (§4.8). It is not a pass/fail — it is the yardstick every other airport
is compared against.

12 airports × 2 h = ~24 h of wall clock if run back-to-back. That is the plan:
probes never cross in real time (§23 step 4). If you must stop between probes,
that's fine — always run `--cleanup` after an interrupted window. **The WSSS probe
you ran on 08-19 predates the fix, so ignore its result and re-run it.**

### Step 8 — See what you recorded

```bash
npm run anchor-probe -- --status
```

Look for a row per airport with `status=completed` and real `rows/h`, `uf/credit`,
`chain/credit`, `stability` numbers.

### Step 9 — Fill the frozen formula and get the proposed lock

```bash
npm run anchor-probe -- --score
```

This fills the frozen anchor-score formula with the measured numbers, applies the
capacity gate (rows/h ≥ 60, a PASS/FAIL feasibility gate, not a score component —
see §4.12), and prints the ranked pool plus the proposed 5-airport lock. It will
refuse to score until at least WSSS or OMAA has a completed stage-1 probe.

### Step 10 — Confirm the top picks (stage 2)

```bash
npm run anchor-probe -- --stage 2
```

A longer (4 h) confirmation probe for the top candidates. The script now **refuses**
stage 2 for any airport that has no completed stage-1 probe — the rl8 out-of-order
mistake is now impossible.

### Step 11 — Lock the pool, then stop and report

Paste the `--score` output into a new `AugMDnotes/rl10.md` and tell me. We then move
to Phase 3 (SOFT_STOP test, payload inspection, and Gate 0.5).

### What NOT to do yet

- Do **not** run the 31-day run (`autoCollect=false` stays until gates 1–5 pass).
- Do **not** remove `ADB_AUTO_COLLECT=0` from the boot command.
- Do **not** set `ADB_PLAN` — PART 1 does not name the plan; that must be verified
  from the RapidAPI account at Gate 0.
- Do **not** run stage 2 before stage 1 (the script now refuses).
- Do **not** interrupt a probe window; if it happens, run `--cleanup` immediately.
- Do **not** run two probes at once (R1 exclusivity; the script refuses anyway).

---

## 2. The V3.9 plan PART 1, section by section

> The plan file `V3.9_DataCollectPlan.md` PART 1 (§1–§22) is the only binding spec.
> This section explains what each part says and why it exists — in order. We do not
> edit the plan; we execute it.

### §1 How to read the plan

`R#` = code delta, `S#` = schema/pipeline delta, `G#` = GO gate. All must finish
before the 60,000-unit run starts. PART 1 is the frozen end-state; every other
`AugMDnotes` file is history. Times are UTC.

### §2 Locked architecture (end-to-end)

The pipeline:

```text
AeroDataBox  ──webhook POST (1 credit per flight item, deducted on SEND)──►
raw immutable notification envelope (S4) ──► flight_events (append-only) ──►
current flight_state (dedup, operational only) ──► flight_population (S1) ──►
cutoff-safe snapshots (T-24 / T-6 / T-90, features ≤ cutoff) ──► outcomes ──►
ML dataset + evaluation
```

Two **prediction states** are never merged: **PRE** (before departure; predict
delay/disruption at T-24/T-6/T-90 cutoffs) and **AIRBORNE/POST** (in flight; predict
ETA, remaining time, arrival delay at the observation timestamp). Three promises:
(1) never destructively overwrite provenance, (2) no future information in
features/snapshots, (3) no foreign subscription may bill during the experiment (R1).

### §3 Budget and accounting (two budgets — Gate 0)

AeroDataBox has two billing concepts fed by the same monthly RapidAPI quota:
**API units** (REST calls: search ≈1, FIDS ≈2, rescore ≈2–4, simulate ≈6–12) and
**Flight-Alert credits** (webhook deliveries, **1 credit per flight item per
delivery attempt, deducted on SEND**, each retry costs another credit; refill is
1 unit → 1 credit). The partition of the 60,000 units:

| Line | Units | Meaning |
| --- | --- | --- |
| Spendable experimental envelope | **57,900 credits** | the ONLY spendable quota for the run (58,900 refill − 1,000 floor) |
| Permanent balance floor | 1,000 credits | `ADB_RESERVE_CREDITS`; controller refuses to spend below it |
| Census + REST budget | ~1,000 API units | FIDS census + probes + diagnostics — never from the envelope |
| Unallocated remainder | 100 units | never used |

Check: `57,900 + 1,000 + 1,000 + 100 = 60,000`. **Maximum experimental spend =
57,900 credits, never 58,900.** The daily 1,900 cap is the per-day ceiling; on the
final day the scheduler shrinks the window so total spend never exceeds 57,900.

Three cap concepts (never conflated): (1) estimated reservation *before* a batch
(`1900 − credits_actually_consumed_today`), (2) actual spend *during* (`SOFT_STOP`
= 1900 − margin 50 → stops at ~1,850; `HARD_CAP` = 1900, overshoot →
`reconciliation_status='MISMATCH'`), (3) post-batch reconciliation *after*
(`C_external = balance_before − balance_after` vs `C_internal = Σ notification
items`, |Δ| ≤ tolerance → PASS — only meaningful on an exclusive subscription set).

Gate 0 requires verifying, live: actual plan + monthly units, refill conversion
(1 unit = 1 credit), per-refill and balance caps, and that census spend sits on the
REST line.

### §4 Sampling frame (measured, stratified)

- **Universe** = airports AeroDataBox covers, measured free via
  `GET /api/v1/collection/coverage`.
- **Frame** = `universe ∩ feed-eligible`, **keep every eligible airport including
  zero-yield ones**; only `coverage_failed` airports leave the frame.
- **Primary strata** = **traffic tier × macro-region** only (3 × 6 = 18 cells).
  Crossing more variables would explode cell count.
- **Balancing variables** (reported within strata, not crossed): network degree,
  intl/domestic, carrier diversity, time zone — from a **fixed reference snapshot
  at frame-build time**, never from the recursive current sample.
- **Tier mix per batch**: `{HUB:1, MID:2, REGIONAL:1}`.
- **Unit of prediction**: a flight-leg outcome ("departure delay of leg L at cutoff C").

### §5 The provider-observable prediction population (S1 — the census layer)

The webhook is an **event stream, not a census**. "Flights that emitted an update
we captured" ≠ "all flights that existed". Observability selects on size, activity,
severity, tracking quality, etc. So `flight_population` records which flights
existed at each cutoff (from FIDS/schedule ≈2 units per airport-window), snapshots
are built for **every population flight**, and a post-cutoff event is used for the
**label only** — it never decides whether a snapshot exists. Full coverage taxonomy
(`supported → eligible → directly_subscribed → recently_observed →
edge_discovered → zero_yield_* → coverage_failed → stale`); `edge-discovered` is
not the same as `directly observed`.

### §6 Data pipeline and provenance (S2–S5)

S2 raw events immutable (`adb_ingest_events`, with raw payload + SHA-256), S3 event
log before current state (`flight_events` append-only feeds `flight_state` via
dedup), S4 rebuild state from the raw log at any time. §6.1 defines the dual
PRE/AIRBORNE data contract with the four availability timestamps
(`event_timestamp`, `provider_published_utc`, `available_at`, `received_timestamp_utc`).
§6.2 is the airborne foundation: preserve the time series
(`raw_airborne_events → clean_airborne_points → flight_trajectory →
flight_airborne_snapshots`), keyed on `(flight, carrier, locReportedUtc)` so
updates never overwrite earlier points.

### §7 Flight-outcome states and modeling populations

Five states: `observed / active_censored / canceled / diverted / missing_outcome`.
"No [window ended] = [no outcome]" — censoring requires a documented grace interval.

### §8 Sampling design (LOCKED)

Default window **1 × 4 h per day** (preserves aircraft-chain continuity). UTC slots
rotate through `{00,04,08,12,16,20}` — a seeded balanced permutation, every 6-day
block uses each slot exactly once (HARD), minimize weekday×UTC imbalance (SOFT).
Calendar: 26 × 4h + 3 × 2×2h + 2 × 6h = 31 days. Crossover template frozen before
treatment. Anchor pool = **5 airports, provisional `KLAX·EGLL·WSSS·SBGR·OMDB`,
finalized only after probing**. Anchor score = 40% exogenous traffic + 20% geo
diversity + 20% carrier/international diversity + 20% standardized observed yield;
capacity is a separate feasibility gate, not a score component; formula frozen in
code pre-probe. REGIONAL selection = normalized yield-aware draw (`m_i ∈ [0.25,1.5]`,
cap ×1.5, Σp = 1) that boots only after probe data (uniform `1/|eligible|` before).
`sampling_weight` stays NULL — no auto `1/p`.

### §9 Two-stage anchor probe (budget-capped)

1. **Stage 1:** ~10–12 shortlisted candidates across regions, **2 h standardized
   probes** at matched time-class/weekday-class, never crossing in real time.
   Record unique-flights/credit, chain-links/credit, stability. **WSSS (~331
   rows/h) and OMAA (~127 rows/h) are re-probed the same way as calibration.**
2. **Stage 2:** top ~5–6 candidates get a longer confirmation probe.
3. Final anchor pool of **5**; capacity = feasibility gate before scoring. Total
   probe spend hard-capped inside the 1,900/day budget (our code caps it at 500/day).

### §10 Weather (LOCKED)

METAR/TAF forecast-as-known-at-cutoff (a TAF issued at T−2 is never used for a
T−24 prediction); free sources (aviationweather.gov, NOAA GFS/NAM, ERA5); schema
`weather_observation` + `weather_forecast` with `source` tags.

### §11 Credit accounting and the canary

Three quantities per batch: `notification_items_received` (webhook),
`credits_actually_consumed` (balance delta — the **authoritative denominator**),
`unique_flight_rows_created_or_updated`. The canary (Gate 3, R1 + R3): delete every
non-experimental ACTIVE subscription, read `balance_before`, subscribe to one busy
airport with `maxDeliveryRetries=0`, collect, delete the sub, settle until
`B_after == B_after_2`, then `C_external = B_before − B_stable` vs
`C_internal = Σ notification_items`; PASS iff |Δ| ≤ tolerance (default 3) AND
failures = 0 AND balance stable AND no foreign billable sub. R2/R5: delivery
failure → PAUSE + flag, never silently resume; SOFT_STOP at 1,850; orphan cleanup
at every batch start; second-start protection.

### §12 Model ladder, features, graph

Rungs −1 (naive persistence — the gate for deployment claims) → 7 (conformal
uncertainty). Features must be as-known-at-cutoff. Graph edge taxonomy for the GNN
rung (4 is a hypothesis, not the default).

### §13 Evaluation suite

Engines A–E + R + P, calibration metrics, staleness curve, collection-regime
robustness, chain-depth metrics, POST partition rule.

### §14 Marginal value per credit

The final objective — measured per credit (using `C_actual`, never row counts).

### §15 Code to-do — final list (R1–R7, S1–S5)

R1 exclusivity, R2 SOFT_STOP margin, R3 canary, R5 delivery-failure flag,
R6 crossover template freeze, R7 versioned manifest; S1 population layer, S2 raw
envelope, S3 event log first, S4 provenance invariant, S5 airborne time series.
**All of these are implemented** (Phase 0).

### §16 The GO gates (ALL must pass before the 60k run)

| Gate | Action | Pass criterion |
| --- | --- | --- |
| 0 | Budget partition | plan/units/refill-conversion/caps verified live |
| 1 | Coverage | universeCount, catalogInUniverse recorded, universe ≥ catalog |
| 2 | Anchor probe | frozen-formula scores; capacity as gate; pool not locked before measurement |
| 3 | Credit canary | C_external = C_internal, failures = 0, exclusive set |
| 0.5 | Webhook data content | real payloads: event fields only, 4 timestamps intact, trajectories reconstructable |
| 4 | Webhook + cap | failures = 0, SOFT_STOP at ~1,850, second-start guard |
| 5 | Population/census validation | population ≥ captured; missingness quantified |

### §17 Step-by-step runbook (what to do)

The plan's own phases 0–7 — **this is exactly the structure we use in §3** of this
log. Phases: 0 code deltas, 1 Gate 0, 2 Gates 1–2, 3 Gates 3–4 (+0.5 canary),
4 Gate 5 census validation, 5 FREEZE (manifest + hashed test rows), 6 the 31-day
run, 7 month-1 deliverables + evaluation. §17.1 lists month-1 deliverables (validated
pipeline, snapshot pipeline, XGBoost that beats the persistence gate, info-per-credit
curves, engine results, census coverage, window-experiment pilot, POST pilot).

### §18 Contradiction map

Explains how this file resolves conflicts with older files.

### §19 Sources and research foundation

The scientific bets are grounded in peer-reviewed work (all verified 2026-08-12):
previous-leg delay propagation (Chen & Li, AIAA SciTech 2019, SDSU), delay
propagation by utilization (Zheng et al., SJSU 2021), aircraft-chain continuity
(Zheng, Zou et al., SJSU), GNN as hypothesis not default (SJSU GCN-GRU, ERAU),
persistence as first gate (Chen & Li; Sternberg et al., 2017), network/propagation
taxonomy (Transportation Research Part E 2024), two-budget accounting + credit
rules (AeroDataBox "Flight Alert API Guide" 2026-01-31), weather availability
(AviationWeather.gov), in-flight ETA as a first-class state (Springer 2024; SJSU #4774).

### §20 Explicit NOT-do list

Highlights: no V3.10+ reviews, no GNN-first, no `1/p` before measuring the
denominator, no over-claiming ("6-day slot-once ⇒ unbiased" etc.), no foreign active
subscription, no raw-event overwrites, no REST-airborne monitoring before cadence
measurement (Gate 0.5), no merging PRE and AIRBORNE sets, no post-cutoff features,
no manual Rescore/Simulate during the run, no silent weather backfill, no "one
empty observation ⇒ airport is useless".

### §21 Final status

Architecture GO; sampling GO; credit model GO after Gate 0 + canary; airborne GO
to preserve + measure (S5, Gate 0.5), REST monitoring a decision AFTER measurement.
The 60k waits on Gate 0 + gates 1–5. Implementation lock complete after the four
blocking fixes + five pre-collection data-contract requirements (all recorded in §22).

### §22 Adjudication record

Records the V3.9-f.2/f.3/f.4 passes: airborne claims verified against our own code,
the S5 time-series requirement, the dual prediction-state contract, "no REST before
measurement", the eight restored Strat2 safeguards (coverage taxonomy, zero-yield
triage, staleness curve, collection-regime robustness, dashboard/chain-depth, crossover
context, event-vs-prediction-state, POST partition rule).

---

## 3. Phase-by-phase walkthrough (phases with steps)

> The plan's runbook (§17) is organized as **phases with steps inside them** — we
> follow the same structure here (the old "steps with numbers only" framing was
> confusing and has been retired; its content moved to §12).

| Phase | Name | What it is | Status |
| --- | --- | --- | --- |
| 0 | Code deltas | Make the code safe, budget-protected, scientifically valid (R1–R7, S1–S5). No money. | DONE |
| 1 | Gate 0 | Verify plan/units, refill conversion, budget report, manifest. | NEARLY DONE |
| 2 | Gates 1–2 | Coverage, stratified catalog/frame, anchor probe → lock 5 airports. | IN PROGRESS (steps 10–11 done; 12 pending) |
| 3 | Gates 3–4 + 0.5 | Exclusivity cleanup, credit canary, SOFT_STOP test, payload inspection. | PENDING |
| 4 | Gate 5 | Census validation (FIDS population vs webhook events). | PENDING |
| 5 | FREEZE | Versioned manifest, hash test rows, config frozen. | PENDING |
| 6 | The 31-day run | 1,900 credits/day × 31 days. | PENDING — NOT started |
| 7 | Month-1 deliverables | Snapshot ETL, leakage-safe eval, Model −1 vs Model 1, info-per-credit. | PENDING |

**Key rule: the 31-day run (Phase 6) waits for every gate (1–5) to pass.**

### Phase 0 — Code deltas (DONE)

Steps (plan §17 steps 1–4): implement R1 exclusivity, R2 SOFT_STOP margin, R3
canary, R5 failure flag, R6 template freeze, R7 manifest; implement S1–S5 +
migrations 0019–0020 (and the `lastUpdatedUtc` dedup fix); implement the Gate-0
budget report; grep-verify no `sampling_weight = 1/p` and `maxDeliveryRetries = 0`
everywhere. All verified (see the audit snapshot in §12).

### Phase 1 — Gate 0 (NEARLY DONE)

Steps 5–9: record plan + monthly units (still needs a teammate to read the RapidAPI
account — we do not set `ADB_PLAN`), read balance (2,901), **1-credit refill
confirmed 1 unit = 1 credit** (rl3: 862 → +1 → 863), full refill to 2,901, confirm
caps + REST-line census, print the budget report (`npm run gate0` — clean), commit
the manifest (pending). Gate 0's missing piece is only the live account verification.

### Phase 2 — Gates 1–2 (IN PROGRESS)

- **Step 10 — coverage (DONE).** `npm run coverage` → universe 4,332/4,333, our
  catalog 276, `catalogInUniverse 267`, missing 9, Gate-1 sanity `universe ≥
  catalog` passes. The numbers are *measurements* — see §12 for the honest history
  of how "276 as frame" was corrected to "measured universe as frame".
- **Step 11 — stratified catalog/frame (DONE, rl7).** `npm run build-catalog` →
  frame = 4,320 airports = 267 curated + 4,053 unclassified; 18/18 tier×region
  strata non-empty; pre 3,337 / post 2,264 / both 1,281; persisted to
  `clean.adb_sampling_frame`; the controller now draws candidates from the frame,
  REGIONAL is a genuine normalized probability draw, and the DB enforces the
  design-probability rule (migration 0022).
- **Step 12 — anchor probe (SCRIPT READY, needs a successful run).** `npm run
  anchor-probe` — first attempt (rl8) produced zero deliveries; see §0.3 and §10.
  After the webhook proof + cleanup, re-run per §1.

### Phase 3 — Gates 3–4 (+ 0.5, the canary)

Steps 13–16. R1 cleanup (now scripted via `--cleanup`), the credit canary (must
reconcile with real deliveries), SOFT_STOP test, payload inspection for Gate 0.5.
Not started.

### Phase 4 — Gate 5 (census validation)

Steps 17–19: build `flight_population` from FIDS for sample windows, join with
webhook events, quantify per-stage missingness, spot-check US against
FAA/BTS-derived schedules. Not started.

### Phase 5 — FREEZE

Steps 20–21: versioned manifest (frame version, anchor-score version, scheduler
seed, anchor seed, catalog version, builder SHA, real account plan/units/refill) →
`adb_collection_meta`; materialize + hash the Engine-A test rows. Not started.

### Phase 6 — The 31-day run

Steps 22–24: the calendar (26 × 4h + 3 × 2×2h + 2 × 6h), daily watchdog enforcing
1,900 cap / SOFT_STOP / exclusivity / delivery-failure pause, weekly diagnostics,
monthly airborne cadence re-measurement. **Not started — `autoCollect=false`.**

### Phase 7 — Month-1 deliverables

Steps 25–29: snapshot ETL + leakage-safe evaluation, Model −1 vs Model 1, info-per-
credit curves, collection-mechanism ablation, POST pilot. Labeled "early operational
pilot", never "validated production model".

**Why the phases are ordered this way (the science):** you prove the *money
math* (Phase 1) before you *measure the world* (Phase 2) before you *prove the
pipeline honestly* (Phase 3–4) before you *freeze the config* (Phase 5) before you
*spend* (Phase 6). Every gate protects the next one from a silent invalidation.
Sources backing this: the credit/retry rules come from AeroDataBox's own Flight
Alert guide; stratification is standard survey design; the "persistence first" gate
comes from Chen & Li 2019 and Sternberg 2017 (see §2 §19).

---

## 4. Teaching: statistics and probability refresher

> This section assumes no math since high school and builds up every idea we use,
> in order, with worked examples from OUR own numbers.

### 4.1 Populations, samples, universes

- **Universe** = everything we *could* measure. Here: the 4,332 airports
  AeroDataBox covers (measured, free).
- **Frame** = the subset we actually *allow ourselves* to sample from (universe ∩
  feed-eligible, keeping zero-yield airports). Ours: 4,320.
- **Sample** = what we actually collect in a window (a batch: 1 HUB + 2 MID +
  1 REGIONAL airport that day).
- **Population** (the plan's S1 layer) = the flights that *existed* at a cutoff,
  as best the provider can observe — the denominator for later statistics.

> **The 267 / 276 numbers are NOT the frame — this is a common trap, let's kill it
> here.** Our *curated catalog* (276 airports, hand-classified into HUB/MID/REGIONAL
> before the final plan existed) is only a **reference** now. Step 11 built the
> frame from the *measured universe* the way the final plan says: `frame = universe
> ∩ feed-eligible` (every airport AeroDataBox covers that has the right feeds),
> with zero-yield airports kept. The frame has **4,320** rows. Of those 4,320,
> exactly **267** of our 276 curated airports are present in the measured universe
> (276 − 9 that AeroDataBox doesn't cover = 267) — so the 4,320 splits as
> **267 curated + 4,053 unclassified**. The 267 is a *subset inside the frame*, not
> the frame. When we sample, the collector draws from the **4,320** (the frame), and
> the 267 just happen to be labeled `tier_source='curated'`. The final plan never
> says "sample from the 267" — it says sample from the measured frame. See §2 (the
> plan explained) and §6.1 for the exact numbers.

### 4.2 Sets and set operations

A **set** is a collection of things (here: airports). We use three operations:

- **Intersection (∩)** — things in *both* sets. Example:
  `our catalog ∩ ADB universe = 267` airports. That number is our "collectable
  catalog".
- **Union (∪)** — things in *either* set.
- **Complement / difference** — things in one but not the other. `universe ∖ our
  catalog = 4,332 − 267 = 4,065` airports we don't target.

This is why 276, 267, 9, 4,065 and 4,332 all check out by hand (276 = 30+89+157;
267 = 30+87+150; missing 9 = 2+7; 4,065 = 4,332 − 267).

### 4.3 Probability

A **probability** `p` is a number between 0 and 1 saying how likely something is.
For a random draw over `n` equally likely options, each option has
`p = 1/n` and all the probabilities **sum to exactly 1**. Example: if the REGIONAL
pool has 100 eligible airports and we draw uniformly, `p_i = 1/100` each.

- **Design probability** = the probability *our design* assigned to a pick. We
  record the *realized* one (`airport_layer_design_probability`) on every row so
  later weights are computable. Its full honest name in the plan is the
  "conditional design probability given the frame + adaptive state immediately
  before the draw" (V3.8) — see "conditional" below.
- **The `1/p` weight, and why we DON'T write it (plan §30.2b).** In a survey, if an
  airport is drawn with probability `p`, the standard trick is to weight its rows
  by `1/p` so rare airports are counted more and the total stands in for the
  universe. That weight is only valid when `p` is a **flight-inclusion**
  probability — the chance that a *flight* ends up in our data. But our draw is
  over **airports**, not flights: a flight is included only if its airport
  happened to be subscribed that day (and if it had a rotation, and if the
  delivery was stored). So `1/p_airport` is **not** the flight's inclusion
  probability, and stamping it on rows would silently bias later statistics. This
  is the plan's hard rule: `airport_layer_design_probability` is **airport-layer
  metadata**, never a flight weight; `sampling_weight` stays NULL until the plan's
  §10 work measures the real flight-inclusion denominator (§30.2b, the "flight
  inclusion ≠ airport selection" correction). Our canary/reconciliation and the
  probe's credit math never assume `1/p`.
- **Conditional probability** = probability given some condition. At the REGIONAL
  draw, `p_i` is conditional on **the pool that survived filtering that day**.
  Concretely: each day the controller first filters the frame (only
  `post_eligible=true`, not currently in a batch, not in a too-recent rotation,
  credit cap not hit). Say 100 airports survive the filters on Monday and 80 on
  Tuesday. `p_i` is computed as `1/(number that survived THAT day)` — so `1/100`
  on Monday, `1/80` on Tuesday — not `1/4320` against the whole frame. That is why
  the recorded value is "conditional": the denominator is the pool that was *still
  standing* at the moment of the draw, and it can differ day to day. The plan made
  this an explicit wording fix (V3.8): it is not a fixed "realized inclusion
  probability", it is the conditional design probability at the draw.

### 4.4 Stratification

**Stratified sampling** splits the frame into non-overlapping groups (strata) and
samples within each. Our primary strata are **traffic tier × macro-region** = 3 × 6
= 18 cells. Answering the two "where do these numbers come from?" questions:

- **The 3 (traffic tiers) come from how busy an airport is**, and they were already
  how our curated catalog is classified: **HUB** (~30 very large international
  hubs), **MID** (~89 mid-size workhorses), **REGIONAL** (~157 smaller
  regional airports). The plan's daily batch mix is exactly `{1 HUB, 2 MID,
  1 REGIONAL}` per window. Tier is the single strongest predictor of how much
  data an airport produces (a HUB like WSSS dwarfs a small regional), so it is the
  first thing we stratify on.
- **The 6 (macro-regions) come from the plan's "Priority anchor regions" list** —
  North America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania. PART 1
  defines the strata as "traffic tier × macro-region" but does not enumerate the
  regions; our 6-region set is our documented choice, taken directly from that
  priority-regions list (§23). A region here is a real geographic/aviation region,
  not a country.

Why cross them into 18 cells instead of just sampling the frame randomly? Two
reasons. (1) **Guarantee of representation:** if we did one big random draw, a
rare cell (say REGIONAL × Oceania) could go completely un-sampled for a long time
by bad luck; stratifying forces every cell to be represented, so the final data
covers the whole design. (2) **Lower variance within strata:** airports in the
same tier and region behave more alike than airports picked from anywhere, so
measuring a few per cell gives a more stable picture than measuring the same
number from the whole frame. The plan says cross **only** tier × region — crossing
more variables (e.g. time-of-day × tier × region) would explode the cell count (18
is already 18; doubling the crossing makes it unwieldy).

**What "18/18 strata non-empty" means** (step-11 output, rl7): it means all 18
tier×region cells contain at least one frame airport — no cell is empty, so every
stratum is actually sampleable. "pre 3,337 / post 2,264 / both 1,281" refers to
the same frame split by feed layer: 3,337 airports have the schedule feed
(pre-eligible), 2,264 have live/ADS-B (post-eligible), and 1,281 have both.
"Strata non-empty" and "pre/post" are just two different ways of slicing the same
4,320-row frame — one by tier×region, one by which data layer the airport can
serve (§6.1).

### 4.5 Randomization and seeds

First, **UTC** — the timestamps everywhere in this project use **UTC (Coordinated
Universal Time)**, the global time standard that is essentially GMT (London
Greenwich time, without daylight-saving shifts). Flights cross time zones; a
"departure" at 14:00 in Singapore is 06:00 UTC. If we stored local wall-clock
times from different airports, "is this the same instant?" would be unanswerable.
So every column that ends in `_utc` (and `window_start`, `received_at`, etc.) is
a UTC timestamp, and the "UTC slot" for collection is one of {00, 04, 08, 12, 16,
20} — the six 4-hour blocks of the UTC day. Storing UTC makes every comparison
apples-to-apples.

A **seed** is just an integer that initializes a pseudo-random number generator.
The same seed always produces the **same** sequence of "random" numbers. We seed
the generator so the draw and the UTC-slot rotation are **replayable**: anyone can
re-run the exact same random sequence from the seed and verify the picks — a
reproducibility requirement for science. "Balanced permutation" means we don't
just draw random UTC slots; we shuffle the 6 slots so each appears once per 6-day
block (no airport ever gets unlucky with 3 midnights in a row). HUB/MID are
*deterministic slot-fill* (we want the best fresh ones, no randomness needed);
REGIONAL is a *probability draw* (we want a well-defined distribution over the
long tail). `random_seed` is recorded per batch/row so the draw is auditable.

### 4.6 Averages, variance, coefficient of variation

- **Mean** = sum ÷ count (the "average").
- **Variance** = average squared distance from the mean; **standard deviation (SD)**
  = square root of variance. SD tells you how spread out the numbers are.
- **Coefficient of variation (CV)** = SD ÷ mean. It is a *unit-free* spread measure.
  Example from our stability metric: count rows in each 15-minute bucket of a probe
  window; if buckets are [10, 11, 10, 9, 10], mean ≈ 10, SD ≈ 0.6, CV ≈ 0.06 —
  very stable. If buckets are [0, 20, 0, 20, 0], CV is huge — unstable.
- **Stability = 1 / (1 + CV)** — a "stability score" between 0 and 1 that is 1
  when CV = 0 (perfectly steady) and shrinks as CV grows. This is one of the three
  yield components.

**The three yield components, in plain words.** The plan (§23) defines the yield
metric as `f(unique_flights_per_credit, tail_chain_links_per_credit, stability)`,
each standardized to [0,1]. What each one is actually measuring:

1. **unique_flights_per_credit** — how many *distinct flight numbers* we get for
   one credit. A busy international hub returns many different flights (SQ305,
   SQ306, …) for the same spend; a quiet strip returns the same handful again and
   again. High = the credit buys *breadth* (many different flights).
2. **tail_chain_links_per_credit** — for each aircraft tail (registration, e.g.
   `9V-SKD`) that flies N legs inside the window, those N flights are N−1
   "rotation links" of that aircraft (land → next takeoff). Summed across tails and
   divided by credits, this measures how much *delay-propagation material* (the
   chains a disruption travels down) a credit buys. High = the credit buys *chain
   structure*.
3. **stability** — how *consistent* the data stream is across the window (rows
   arriving steadily in every 15-min bucket vs arriving in bursts). High = the
   airport is a steady producer, so a short window represents its long-run
   behavior (the plan's full definition adds the probe-to-probe variance once 2+
   probes exist: fewer observations → wider confidence → lower weight).

All three answer the plan's core question in different words: **how much science
do we get per unit of money?** (the "marginal value per credit" philosophy — judge
everything by credits actually spent, never by row counts alone).

### 4.7 Ratios "per credit" — the marginal-value idea

`unique_flights/credit` and `chain-links/credit` answer: *how much science do we get
per unit of money?* That is the plan's "marginal value per credit" philosophy —
evaluate everything against `C_actual` (balance delta), never against row counts.
`chain-links` = for each aircraft tail that flew N legs inside the probe window,
N−1 rotation links connect them (that aircraft's flight chain).

Worked example (all made-up numbers to show the shape): a 2 h probe of airport X
spends 20 credits and stores 60 unique flights across 15 aircraft tails that flew
39 legs total. Then `uf/credit = 60/20 = 3.0`, `chain/credit = (39−15)/20 =
24/20 = 1.2`, and stability = 1/(1+CV) of the bucket counts, say 0.85. Airport Y
spends the same 20 credits but yields 20 unique flights, 8 links, stability 0.30 —
clearly X buys more per credit. The standardization in §4.8 turns those raw ratios
into comparable 0–1 numbers.

### 4.8 Standardization (the "standardized measurement" in §9)

To compare airports fairly, raw numbers need a common scale. We **standardize to
[0,1] against the WSSS baseline**:

```text
uf_standardized = clamp( probe.uf_per_credit / WSSS.uf_per_credit , 0, 1 )
```

If KLAX delivers 0.80× the flights-per-credit of WSSS, its standardized value is
0.80. `clamp` just cuts anything below 0 or above 1. We do this for all three yield
components, then the **yield score** is the simple average:

```text
yield_score = ( uf_std + chain_std + stability_std ) / 3
```

**What "calibration baseline" means, and where WSSS/OMAA fit.** The baseline is a
*reference measurement* that every other airport is divided by, so "good" is always
defined relative to a known, identically-measured airport instead of to an
arbitrary number. WSSS (Singapore Changi) and OMAA (Abu Dhabi Zayed) are the two
baselines the plan gives us reference points for: probed, WSSS yields roughly
**331 rows per hour** and OMAA roughly **127 rows per hour** — those are just how
much data each airport's traffic produces per hour of subscription (a busy hub
pushes more rows/hour than a mid-size one). We re-probe WSSS and OMAA **ourselves,
with the exact same 2 h protocol** as every candidate (the plan calls this
"measured the same way as calibration", §23 step 4), so the denominator is measured
identically — never assumed. If our own WSSS probe measures `uf/credit = 2.0`, then
KLAX at `1.6` standardizes to 0.80, OMAA at `0.5` to 0.25, and so on.

**Full worked example.** Say our measured WSSS baseline is `uf/credit = 2.0`,
`chain/credit = 0.8`, `stability = 0.90`, and candidate EGLL measures `1.6`, `0.6`,
`0.72`:

```text
uf_std     = clamp(1.6/2.0, 0, 1) = 0.80
chain_std  = clamp(0.6/0.8, 0, 1) = 0.75
stab_std   = clamp(0.72/0.90, 0, 1) = 0.80
yield_score = (0.80 + 0.75 + 0.80)/3 = 0.783
```

Every component is measured by the same probe → same time-of-day class → same
credit math (§23 step 4b), so the ratios are apples-to-apples.

### 4.9 Weighted scores

**Why we need an anchor score at all:** the plan needs to turn the 12 candidate
airports into a **5-airport anchor pool** — a ranked, defensible choice of which
airports drive the HUB share of every batch. Raw yield alone would be a terrible
rank (one good probe day could pick a "lucky" airport), and pure schedule size
would ignore what we actually measure. So the plan (§23 step 5) fixes a weighted
score in code *before* measuring, and the probe is only one input.

An **anchor score** combines several parts with weights that sum to 1:

```text
anchor_score = 0.40·exogenous_traffic + 0.20·geo_diversity + 0.20·carrier_diversity + 0.20·yield_score
```

Each part is itself 0–1, so the result is 0–1. What each part means:

- **40% exogenous traffic** — the airport's *published* scheduled traffic (flights
  per year from schedules/reference data). This is the biggest weight deliberately:
  it encodes years of known aviation activity.
- **20% geographic / network diversity** — how well the airport spreads our
  coverage across the world (a geo/network index).
- **20% carrier / international diversity** — how international/carrier-rich the
  airport is (how many airlines, how much international share).
- **20% standardized observed yield** — our own measured probe yield (§4.8). Kept
  at only 20% so a single good probe day **never** overrides years of scheduled
  traffic — this is the plan's anti-feedback-loop guardrail: sampled → high
  observed degree → chosen as anchor → sampled more would be a self-justifying
  loop (§23 step 4a).

Weights say how much each part matters. The first three parts come from
**published reference data, frozen before any probe** — our own collection never
feeds the exogenous 80%. The formula is fixed in code pre-probe; measured data only
*fills in* the 20%, never re-weights the formula (the "frozen" rule, §4.11).

### 4.10 Reconciliation (the canary's check)

`C_external = balance_before − balance_after` is the *true* spend (the source of
truth — AeroDataBox charged us this). `C_internal = Σ notification_items` is what
the ledger thinks. We PASS iff `|C_external − C_internal| ≤ tolerance (3)`. If a
foreign subscription existed, the balance delta would mix in *its* spend — hence
exclusivity (R1) first. The canary is the *unit test* of reconciliation: create one
tiny subscription, watch one window, delete it, and compare the two numbers. The
rl9 canary FAIL (`C_external=1`, `C_internal=0`, `delivery_failure=1`) is exactly
what the check exists to catch — the two quantities disagreed because the webhook
handler threw before storing anything.

### 4.11 Why formulas are "frozen" pre-probe

If you decide the scoring formula *after* seeing the data, you can always make the
formula fit the data (a researcher's bias). Freezing the formula, the weights, the
shortlist, and the exogenous references in code **before** measuring means the
measurement is allowed to *disagree* with our prior — that's what makes the probe
an honest test. The plan makes this a hard rule (§8 "formula frozen in code
pre-probe"; §9 step 4).

### 4.12 "Capacity is a gate, not a component" — the difference

We measure two different kinds of things about each airport, and mixing them up is
the exact mistake the plan warns against (§23 step 4):

- **A score component** ranks airports against each other. More is *better* — it
  trades off against the other components. The three yield components and the three
  exogenous parts are score components (they add up to the anchor score in §4.9).
- **A gate** is a PASS/FAIL yes/no: the airport either clears the bar or it is
  disqualified *entirely*, and no amount of score can rescue a gate failure.

**Capacity** (our code: `rows_per_hour ≥ 60`) is a **gate**. It answers one
question only: *does this airport physically deliver enough data to be worth a
subscription slot?* If an airport pushes only 30 rows/h, it can't fill a batch
usefully — FAIL, out of the pool, regardless of how good its stability is. If it
pushes 200 rows/h it PASSES, but being 200 vs 150 does **not** make it "better" —
capacity is never added into the anchor score. Why? Because making capacity part of
the score would slide us toward "easiest to collect" instead of "most useful
information" — a huge-but-easy airport would outrank a scientifically rich one.
The plan's words: "capacity never trades off against scientific yield." Our code
prints `capacity PASS` / `capacity FAIL (… rows/h < 60)` and only airports that
PASS the gate enter the ranking.

### 4.13 The evaluation suite (Engines A–E + R + P) and the R / S codes

**What the "A–E R P" thing is (plan §13).** That is the **evaluation suite** — the
ML testing design for the *eventual* prediction models, a much later phase (Phase
7, not the probe). It is a family of baseline engines that will each be trained and
tested on the data we are collecting now:

| Engine | What it tests (which generalization question) |
| ---- | ---- |
| **A** | Primary: behaves like the real deployment — chronological, day/event-blocked; the model may reuse tails it saw in training |
| **B** | Unseen *airport* (same region) — does the model work on airports it never saw? |
| **C** | Unseen *region* |
| **D** | Unseen *tail / aircraft type* (cold-start) — the only one with hard tail-blocking |
| **E** | *Disruption stress* — a whole disruption event kept in one partition |
| **R** | Unseen *route/OD pair* (e.g. train LAX→ORD, test SEA→JFK) — separates airport-identity memorization from real dynamics |
| **P** | *Population audit* — compares against the FIDS census |
| **POST** | The airborne ETA/delay model, time-ordered per flight |

These engines exist so the final evaluation can honestly answer *"does the model
understand aviation, or did it just memorize what it saw?"* and *"does it survive
a brand-new airport/region/tail?"* — each engine blocks one kind of leakage. This
is **not** the anchor probe. You will not interact with it now; it only matters
because the data we collect now is what those engines will later train on (which
is why "collection-mechanism ablation" — did the model learn operations or how we
bought data? — is in the plan).

**What the "R1/R2/R3/…" and "S1/S2/…" codes are.** These are the plan's internal
*requirement* codes that came out of the 9 review rounds the plan documents (each
"review" was a critique of an earlier draft; the plan is the adjudicated result).
An **R** code is a requirement added to fix a review finding:

- **R1** — subscription **exclusivity**: only one active billable subscription may
  exist during the experiment (the canary asserts it; the probe enforces it). Fixes
  balance-delta contamination.
- **R2** — **SOFT_STOP** margin: the watchdog stops at 1,850, 50 below the 1,900
  cap, so overshoot is impossible.
- **R3** — the **credit canary** gate itself (the script we just ran).
- **R5** — the **delivery-failure flag** (`delivery_failure` on ingest events) so a
  broken webhook pauses collection instead of silently burning credits.
- **R7** — a **versioned manifest** written at batch start (auditability).

An **S** code is a *layer* of the data pipeline: **S1** population census,
**S2/S3/S4** per-flight event/observation logs, **S5** airborne trajectory points.
When the log says "R1 exclusivity" or "the S5 layer", that is the plan's shorthand
for these numbered requirements — they are all named and explained in the glossary
(§5) and the audit snapshot (§12.7).

---

## 5. Teaching: glossary of every technical term

Alphabetical, one plain paragraph each. Terms already fully explained in §4 are
marked "(see §4.x)".

- **Anchor** — one of the 5 airports that drive the HUB share of every batch. The
  pool `KLAX·EGLL·WSSS·SBGR·OMDB` is **provisional until the probe proves it**.
- **Anchor score** — the frozen 0.4/0.2/0.2/0.2 weighted score used to lock the 5
  (see §4.9). Capacity is a gate, not a component.
- **Calibration baseline** — WSSS (~331 rows/h) and OMAA (~127 rows/h), probed the
  same way as every candidate, providing the reference the yield components are
  standardized against (§4.8). They are marked `isCalibration` in the shortlist.
  "Baseline" = the yardstick; "calibration" = the reference is measured by us with
  the identical protocol, not assumed.
- **Canary** — a tiny, controlled live test (a "canary in a coal mine"): spend ~1
  credit to prove the whole delivery path works before real spend. Ours subscribes
  to one airport for ~2 minutes, then reconciles three numbers and must PASS
  (§7.2). The credit canary is the same thing — this one canary *is* the credit
  canary (`scripts/credit_canary.ts`, `npm run canary`).
- **Capacity / feasibility gate** — PASS/FAIL: does the airport physically deliver
  enough data (our code: rows/h ≥ 60)? A gate is a yes/no that disqualifies an
  airport outright; it is **never** added to the score (§4.12).
- **Catalog** — our curated 276-airport list (30 HUB + 89 MID + 157 REGIONAL).
  After step 11 it is a *reference* (`tier_source='curated'`), NOT the frame. Of the
  276, only **267** exist in the measured universe, so the frame splits as 267
  curated + 4,053 unclassified = 4,320. See the note in §4.1.
- **Chain links / tail chain** — for each aircraft tail, N−1 rotation links over N
  observed legs; a measure of delay-propagation material (see §4.7).
- **Conditional probability** — probability given a condition. At the REGIONAL
  draw, `p_i` is conditional on the pool that *survived filtering that day*: the
  denominator is the airports still standing at the moment of the draw, not the
  whole frame (§4.3).
- **Coverage** — which airports AeroDataBox can serve, measured free.
- **Credit** — Flight-Alert balance unit; 1 credit per flight item per delivery
  attempt, deducted on SEND; refill 1 unit → 1 credit.
- **Crossover** — the window-shape experiment (4h vs 2×2h vs 6h); template frozen
  before treatment so treatment never depends on post-freeze observations.
- **Cutoff** — the time boundary a prediction uses; features must be ≤ cutoff; the
  POST event supplies only the label.
- **data_stage PRE|POST** — which prediction state a payload serves; raw events
  carry `data_stage`, never `prediction_state` (that is derived on snapshots).
- **Dedup** — dedup_key upsert so later deliveries update rather than duplicate;
  an operational convenience, never the only dataset.
- **Design probability** — the realized probability of a REGIONAL pick
  (`airport_layer_design_probability`), stamped per row (see §4.3).
- **Envelope** — the 57,900-credit spendable experimental total (§2 §3).
- **Engine (A–E + R + P)** — the evaluation-suite baseline engines for the later ML
  phase; each answers one generalization question (unseen airport / region / tail /
  route, disruption stress, population audit). NOT the probe (§4.13).
- **Evaluation suite** — the plan's ML testing design (plan §13): a family of
  engines A–E + R + P + Model POST, each with its own leakage-blocking split, run
  on the data we collect now (§4.13).
- **Exclusivity (R1)** — no foreign active subscription may exist during the
  experiment; the canary asserts it and the probe enforces it.
- **FIDS** — Flight Information Display System data (schedules) from AeroDataBox,
  ≈2 API units per airport-window; the basis of the S1 census layer.
- **Frame** — the sampled-from set: universe ∩ feed-eligible, zero-yield kept
  (§2 §4, §4.1).
- **Frozen** — decided in code before measurement and never tuned on outcomes
  (see §4.11).
- **Gate** — a GO/NO-GO checkpoint (0, 1, 2, 3, 0.5, 4, 5) — all must pass before
  the run (§2 §16). Also the PASS/FAIL *feasibility* kind (capacity gate, §4.12):
  a yes/no that never enters a score.
- **HUB / MID / REGIONAL** — the three traffic tiers: ~30 big hubs, ~89 mid,
  ~157 regional in the curated catalog; the daily mix is {1, 2, 1}. "Traffic tier"
  = how busy the airport is — the 3 in "3 tiers × 6 regions" (§4.4).
- **Inclusion probability (and the `1/p` weight)** — the chance that an item lands
  in the sample. Weighting rows by `1/p` is only valid when `p` is a
  *flight-inclusion* probability; our draw is over airports, so we do NOT stamp
  `1/p` — the plan's §30.2b rule (§4.3).
- **isCalibration** — the flag on WSSS/OMAA marking them as calibration baselines.
- **Macro-region** — one of our 6 documented geographic regions (North America,
  Europe, Asia-Pacific, Gulf/Africa, South America, Oceania). The 6 in "3 tiers ×
  6 regions" (§4.4). Note: PART 1 defines
  primary strata as "traffic tier × macro-region" but does NOT enumerate the
  regions; the 6-region set is our documented choice, drawn from the plan's
  "Priority anchor regions" list.
- **Manifest** — the versioned, auditable snapshot (frame version, config, seeds,
  account plan) written at batch start (R7).
- **Population** — flights that existed at a cutoff per the provider-observable
  S1 layer (a census-like denominator, honestly labeled, §2 §5).
- **post_eligible / pre_eligible** — an airport can serve the POST (live/ADS-B)
  layer, the PRE (schedule/FIDS) layer, or both.
- **Probe** — a standardized, budget-capped live measurement of an airport
  (subscribe → collect a 2 h/4 h window → delete → count) that produces the yield
  components; the basis for locking the anchor pool (§2 §9). Run by
  `scripts/anchor_probe.ts` (§7.1). "Probing" is the act of running these
  measurements.
- **Prediction state** — PRE (before departure) or AIRBORNE/POST (in flight);
  never merged into one modeling set.
- **R1–R7 requirement codes** — the plan's numbered requirements that came from the
  9 review rounds: R1 exclusivity, R2 SOFT_STOP margin, R3 credit canary, R5
  delivery-failure flag, R7 versioned manifest (§4.13).
- **Reconciliation** — comparing external spend (balance delta) to internal ledger
  (notification items); PASS iff |Δ| ≤ tolerance (§4.10).
- **Reserve** — the 1,000-credit permanent floor the controller refuses to spend
  below.
- **REST line** — the ~1,000 API-unit budget for census/probes/diagnostics,
  separate from the credit envelope.
- **S1–S5 layer codes** — the plan's data-pipeline layer numbers: S1 population
  census, S2/S3/S4 per-flight event/observation logs, S5 airborne trajectory
  points (§4.13). The tables live in §6.6.
- **Sampling frame** — see Frame.
- **Seed** — an integer that initializes a pseudo-random generator so the
  "random" sequence is reproducible: same seed → same sequence → replayable,
  auditable draws and UTC-slot rotation (§4.5).
- **Settlement** — waiting until the balance is stable (`B_after == B_after_2`)
  before reading the true spend.
- **Shortlist** — the frozen 12 candidate airports (2 per region) probed in stage 1.
- **SOFT_STOP / HARD_CAP** — the watchdog stops at 1,850 (1,900 − 50 margin);
  1,900 is the hard ceiling; overshoot → MISMATCH.
- **Stability** — 1/(1+CV) of per-15-min bucket counts inside a probe window
  (§4.6).
- **Standardized measurement** — raw values scaled to [0,1] against the WSSS
  baseline (§4.8).
- **Strata / stratified** — non-overlapping groups (tier × region = 18 cells)
  within which we sample (§4.4). "18/18 non-empty" = all 18 cells contain at least
  one frame airport, so every stratum is sampleable.
- **Subscription** — an AeroDataBox webhook subscription (subject type +
  subject id, e.g. `FlightByAirportIcao` + KLAX) that pushes flight alerts to our
  webhook; billing is per delivered item.
- **Tier × macro-region** — the primary strata: 3 tiers crossed with 6 regions =
  18 cells (§4.4).
- **Universe** — everything AeroDataBox covers (measured) — §4.1.
- **UTC** — Coordinated Universal Time (≈ GMT): the global time standard used for
  every timestamp, so comparisons across time zones are apples-to-apples (§4.5).
- **UTC slot** — the 4 h block of a collection window chosen from
  {00,04,08,12,16,20} with a seeded balanced rotation (§2 §8).
- **Webhook** — the push mechanism: AeroDataBox POSTs notifications to
  `/api/v1/webhooks/aerodatabox[/secret]`; our ingress must answer 2xx fast because
  each retry costs a credit.
- **WSSS / OMAA** — Singapore Changi and Abu Dhabi Zayed; the calibration baselines
  (~331 and ~127 rows/h respectively — how much data each airport produces per
  hour, our reference points). They are *airports*, re-probed by us with the same
  2 h protocol as every candidate (§4.8).
- **Yield score** — the average of three standardized components
  (uf/credit, chain/credit, stability) vs the WSSS baseline (§4.8).
- **Zero-yield** — an airport that produced no observations; one empty is never
  evidence of uselessness (once/repeated/persistent triage); only coverage-failed
  airports leave the frame.

---

## 6. Teaching: the tables and their columns

All tables live in the `clean` schema. A migration created each one and every boot
re-runs all migrations (they must stay idempotent).

### 6.1 `clean.adb_sampling_frame` (migration 0021) — the measured frame

| Column | Meaning |
| --- | --- |
| `icao` | airport code (primary key) |
| `tier` | HUB / MID / REGIONAL |
| `tier_source` | `curated` (one of our 276, human-classified) or `unclassified` (universe-only, provisional REGIONAL) |
| `traffic_prior` | the REGIONAL prior, starts 1.0 for unclassified |
| `region` | one of the 6 macro-regions |
| `feed_schedule` / `feed_live` / `feed_adsb` | airport present in each AeroDataBox feed (measured free) |
| `pre_eligible` | has the schedule feed (serves PRE) |
| `post_eligible` | has live OR ADS-B (serves POST/AIRBORNE) |
| `in_frame` | eligible — zero-yield airports stay; only coverage-failed leave |
| `built_at` | when the frame was last written |

Our measured values: **4,320 rows = 267 curated + 4,053 unclassified**;
pre 3,337 / post 2,264 / both 1,281; 18/18 strata non-empty.

### 6.2 `clean.adb_anchor_probe` (migration 0023) — the probe results

One row per probe observation: one airport, one stage, one window. `probe_id` is
just the row's serial number (the database's auto-increment counter, like a receipt
number). `stage` is which probe round it was — **1** = the shortlist measurement
(2 h), **2** = the confirmation measurement (4 h) for the top picks. `status` is
`probing` (window live), `completed`, `failed`, or `abandoned` (interrupted;
subscription deleted by `--cleanup`). You will mostly care about the
`rows_per_hour`, `unique_flights_per_credit`, `tail_chain_links_per_credit` and
`stability` columns — those are the numbers the `--score` command turns into the
anchor ranking.

| Column | Meaning |
| --- | --- |
| `probe_id` | primary key |
| `stage` | 1 (shortlist, 2 h) or 2 (confirmation, 4 h) |
| `icao`, `region` | airport and macro-region |
| `window_start` / `window_end` / `window_hours` | the live window (UTC) |
| `subscription_id` | the AeroDataBox subscription used |
| `balance_before` / `balance_after` | credit balance at window edges |
| `credits_spent` | = balance_before − balance_after (the authoritative C_external) |
| `rows_delivered` | rows attributed to this subscription in the window |
| `unique_flights` | distinct flight numbers |
| `tail_chain_links` | aircraft-rotation chain links |
| `rows_per_hour` | station capacity — the feasibility GATE, not a score component |
| `unique_flights_per_credit` | yield component 1 (standardized later vs WSSS) |
| `tail_chain_links_per_credit` | yield component 2 |
| `stability` | 1/(1+CV) of 15-min bucket counts |
| `recorded_at` | insert time |

Unique on `(icao, stage, window_start)` so re-runs never duplicate.

### 6.3 `clean.flight_data_pre_post` (migration 0010) — the raw collected data

One row per flight per delivery, flattened from the webhook. This is the **raw
data table** — everything else is either an audit log of *this* table's writes or
a later derivation. The row is a mix of **what AeroDataBox sends** and **what we
stamp ourselves**:

**Columns that come FROM AeroDataBox (the webhook payload):**

| Column group | Meaning |
| --- | --- |
| `flight_number`, `carrier_icao/iata/name`, `call_sign` | identity of the flight |
| `status`, `status_code`, `codeshare_status` | current status (numeric enum → name) |
| `last_updated_utc` | when the provider last updated this flight |
| `dep_*` / `arr_*` (airport, scheduled/revised/runway UTC, terminal, gate) | departure / arrival plan |
| `aircraft_reg`, `aircraft_mode_s`, `aircraft_model` | the physical aircraft |
| `loc_*` (lat/lon/altitude/speed/heading/live location) | live ADS-B position (POST) |
| `subscription_*`, `subject_*`, `subscriber_*`, `credits_remaining` | the subscription + balance blocks of the payload |
| `payload_json` | **the whole raw flight item**, kept verbatim for audit/recovery |
| `gcd_km`, `great_circle_distance` | route distance |

**Columns WE stamp (our server, at receive time):**

| Column group | Meaning |
| --- | --- |
| `received_at` | our clock when the POST landed |
| `dedup_key` | SHA-256 of (flight, carrier, lastUpdatedUtc) — the upsert key so re-deliveries update, not duplicate |
| `data_stage`, `has_live_location` | PRE vs POST decided by us from the payload's location/status |
| `sampling_batch_id`, `airport_tier` | which batch/tier this delivery belonged to |
| `is_randomized` | true only for a REGIONAL probability-draw row (never NULL — the 08-19 fix) |
| `airport_layer_design_probability` | the realized conditional design probability (REGIONAL draws only) |
| `planned_share` | the HUB/MID allocation share (deterministic fills only) |
| `collection_window_start/end`, `random_seed` | which window/seed produced this row |
| `sampling_weight` | stays NULL — the plan forbids auto `1/p` (§4.3) |

**Which other tables are derived from this one?** Precisely:

- **`clean.adb_ingest_events`** — NOT derived; it is the per-delivery *audit log*
  written alongside the insert (one row per webhook POST with counts). This is
  `C_internal` (§6.5).
- **`clean.flight_events` / `raw_airborne_events` / `clean_airborne_points` /
  `flight_trajectory` / `flight_airborne_snapshots`** — derived *from the same
  payload* at receive time (appended from the extracted rows), never re-derived
  from `flight_data_pre_post` later. They keep every airborne observation so
  trajectories are reconstructable (§6.6).
- **`clean.adb_anchor_probe`** — NOT derived from the table's rows as a transform;
  it is a *measurement log* that the probe script fills by **counting** rows in
  `flight_data_pre_post` for a subscription inside a window (§6.2).
- **`clean.adb_sampling_frame`** — NOT derived at all; it is built from the
  *coverage* endpoint (free measurement), not from collected data (§6.1).

So the only true "data" table is `flight_data_pre_post`; everything else is an
audit log, a per-payload event log, or a measurement summary.

### 6.4 `clean.adb_collection_batches` / `adb_collection_subs` / `adb_collection_meta` (migration 0012)

- `adb_collection_batches` — one row per collection window: batch id, seed, window
  start/end, credit budget, tier mix, `balance_before/after`,
  `credits_consumed_actual` vs `credits_consumed_internal`,
  `notification_items_received`, rows stored/inserted/updated,
  `delivery_failures`, `reconciliation_status`.
- `adb_collection_subs` — the airport subscriptions that make up a batch, each
  stamped with `batch_id`, `icao`, `tier`, sampling metadata (design probability /
  planned share), and `is_randomized`.
- `adb_collection_meta` — key/value store for rotation state (`batch_seq`,
  `last_anchor`, `run_template`, `manifest`, anchor-pool lock state).

### 6.5 `clean.adb_ingest_events` (migration 0017) — the credit ledger

One immutable row per webhook delivery: `subscription_id`, `batch_id`,
`received_at`, `notification_items` (the internal credit basis), rows
stored/inserted/updated/skipped, `credits_remaining`, `delivery_failure`, `error`.
This is `C_internal` for the canary.

### 6.6 The S-layer tables (migrations 0019–0020)

- `flight_population` — S1 census layer: flights that existed at each cutoff
  (provider-observable).
- `flight_events` — append-only per-observation event log keyed
  `(flight, carrier, locReportedUtc)` — never overwritten (S3/S4).
- `raw_airborne_events` — airborne (POST + live location) points with all fields
  preserved incl. `loc_reported_utc`.
- `clean_airborne_points` / `flight_trajectory` / `flight_airborne_snapshots` —
  the S5 trajectory pipeline feeding the POST model.

---

## 7. The most important code, explained

> The full plain-English walkthrough of every file is in
> **`AugMDnotes/CODE_WALKTHROUGH.md`** — read that for the complete tour. This
> section summarizes the pieces that matter for what we're doing right now (the
> probe), so you can follow a run.

### 7.1 `scripts/anchor_probe.ts` — the probe runner (`npm run anchor-probe`)

**Where the shell commands come from (answering "did you make these?"):** yes.
`npm run anchor-probe -- --check-webhook` is a chain of two things. The `npm run
anchor-probe` part reads the `"anchor-probe"` entry in `package.json`, which says
`tsx scripts/anchor_probe.ts` — i.e. "run this TypeScript file with the tsx
loader". The `--` just tells npm to pass everything after it to the script as
command-line arguments. So `npm run anchor-probe -- --check-webhook` runs
`tsx scripts/anchor_probe.ts --check-webhook`, and the script's `main()` looks at
its arguments and picks a mode (`--check-webhook`, `--cleanup`, `--stage 1`,
`--score`, `--status`, …). Same mechanism for `npm run canary` →
`tsx scripts/credit_canary.ts` and `npm run build-catalog` →
`tsx scripts/build_stratified_catalog.ts`. You don't need tsx directly — npm
handles it.

**What the script does, start to finish.** It encodes the plan's §23 probe
protocol. At the top are the **frozen parameters** — decided in code before any
measurement, never tuned on outcomes: stage-1 window 2 h, stage-2 window 4 h,
capacity gate 60 rows/h, probe daily cap 500, anchor weights 0.4/0.2/0.2/0.2. Then
the **frozen shortlist**: 12 airports (2 per region) with published exogenous
reference values (scheduled flights/yr, geo index, carrier index) — our own
collection never feeds the exogenous 80% (no feedback loop). WSSS and OMAA carry
`isCalibration: true`.

Its modes:

- `--stage 1 [--icao X] [--hours N]` — probe each candidate (or just X) for the
  window. **This command blocks (waits) for the whole window itself** — it does not
  return until the probe is done (§1 step 7 explains the timing).
- `--stage 2` — 4 h confirmation; **refuses any airport without a completed stage-1**
  (the rl8 out-of-order mistake is now impossible).
- `--score` — fills the frozen formula (see §7.8 for the exact code), applies the
  capacity gate, prints the ranked pool + proposed 5-airport lock.
- `--status` — list recorded probes from `clean.adb_anchor_probe`.
- `--cleanup [--force]` — deletes orphaned probe subscriptions (rows still
  `probing` from an interrupted run) and marks them `abandoned`; `--force` also
  deletes other untracked active credit subs (safe because `autoCollect=false`).
- `--check-webhook` — prints the public webhook URL, whether
  `REPLIT_DOMAINS`/`WEBHOOK_BASE_URL` are set, and does a GET reachability probe.

**Mechanics of ONE probe** (`runSingleProbe`): budget guard (`checkBudget`:
balance ≥ reserve, daily probe spend won't breach the 1,900 cap) → **R1
exclusivity guard** (`assertExclusivity`: refuse if any foreign ACTIVE billable
subscription exists — this is what stops parallel probes) → free feed check
(`checkAirportFeeds`) → `createSubscription("FlightByAirportIcao", icao,
{maxDeliveryRetries: 0})` → insert a `probing` row → **wait the window** (deliveries
land on the live webhook; the process stays alive) → `deleteSubscription` →
settle 10 s → read balance → `credits_spent = balance_before − balance_after` →
SQL-count rows / unique flights / chain links / stability for *this subscription
in this window* → flip the row to `completed`. The `probing` row is what lets
`--cleanup` find interrupted runs.

### 7.2 `scripts/credit_canary.ts` — Gate 3 (`npm run canary`)

A **canary** = a tiny controlled live test meant to die loudly before the real
work. This one proves the whole delivery path works for ~1 credit. It:

1. Reads the live balance (`balance_before`).
2. **Asserts R1 exclusivity** — lists subscriptions, refuses to continue if any
   foreign ACTIVE billable subscription exists (the rl8 orphans would have failed
   this).
3. Creates ONE subscription for KLAX with `maxDeliveryRetries: 0`.
4. Waits ~2 minutes (120 s, `ADB_CANARY_WAIT_MS`), deletes the sub, settles 5 s.
5. Reads balance again → `C_external = balance_before − balance_after`.
6. Queries `adb_ingest_events` for that subscription → `C_internal = Σ
   notification_items`, plus rows stored/inserted/updated/skipped and
   `delivery_failures`.
7. **PASS iff `|C_external − C_internal| ≤ tolerance (3)` AND `delivery_failures
   = 0`.** FAIL → exit code 1 → the 60k run must not start.

This is the command that FAILED on 08-19: `C_external=1`, `C_internal=0`,
`delivery_failures=1` — the webhook was reachable (charged 1 credit) but the
handler threw before storing. The `is_randomized` fix (§7.5) is exactly what makes
this go green.

### 7.3 `scripts/build_stratified_catalog.ts` — step 11 (`npm run build-catalog`)

Builds the sampling frame from the measured universe (plan §6/§17 step 11):
calls the free AeroDataBox coverage endpoint, then for every universe airport
classifies tier (the 276 curated keep theirs; everyone else → REGIONAL
`tier_source='unclassified'` with `traffic_prior=1.0`), assigns a macro-region from
the ICAO first letter, computes per-feed eligibility (`pre_eligible`/`post_eligible`
from the feed flags), prints the 18-cell tier×region stratum table, and upserts the
4,320 rows into `clean.adb_sampling_frame`. **This is where "267 curated + 4,053
unclassified" and "18/18 strata non-empty" come from** (§4.1, §4.4).

### 7.4 `server/lib/disruption/adbCollectionController_v3.ts` — the brain

`COLLECTOR_CONFIG` holds the frozen knobs: budget 1,900, daily cap 1,900,
soft-stop margin 50, reserve 1,000, min batch 300, tier mix {1 HUB, 2 MID,
1 REGIONAL}, anchor pool, UTC slots {0,4,8,12,16,20}, `autoCollect=false`. The
watchdog (runs every window) only *reports* while `autoCollect=false`. When the
run is enabled, `pickAirportCandidates` reads candidates from the **frame**
(`clean.adb_sampling_frame`, not the 276): HUB/MID are deterministic
"freshest-first" slot-fill, REGIONAL is a genuine seeded normalized probability
draw (`drawWithoutReplacement`, `p_i = 1/(eligible that day)` — the conditional
probability of §4.3). `startBatch` enforces cap/reserve/template-freeze then
subscribes; `stopBatch` reconciles `C_external` vs `C_internal` and writes
`reconciliation_status`. `creditsUsedTodayUtc()` is what the probe's budget guard
calls.

### 7.5 The webhook path (`routes_v3.ts` + `flightNotificationExtractor_v3.ts` + `flightDataPrePostStore_v3.ts`)

**The data flow, answered in plain words** (the "what comes from us vs AeroDataBox"
question):

1. AeroDataBox sees a flight change for a subscribed airport and **POSTs a payload**
   to `POST /api/v1/webhooks/aerodatabox[/secret]`. The payload contains the
   `subscription` block, the `balance` block, and a `flights[]` array.
2. Our route validates (logs issues, **never rejects** — a 5xx would trigger a
   *paid* retry) and looks up sampling metadata by `subscription_id`.
3. `flightNotificationExtractor_v3.ts` **flattens each flight item** into one row:
   everything AeroDataBox sent becomes `dep_*`/`arr_*`/`loc_*`/`aircraft_*`/etc.
   columns, and *we* add `received_at`, `dedup_key`, `data_stage`, `is_randomized`,
   tier, design probability, window stamps (the "columns WE stamp" list in §6.3).
4. `flightDataPrePostStore_v3.ts` **upserts** by `dedup_key` (re-deliveries update,
   not duplicate) and appends the research event log keyed
   `(flight, carrier, locReportedUtc)`.
5. We write the `adb_ingest_events` ledger row (this is `C_internal`) and answer
   **2xx fast**.

**The rl9 bug, and the fix (in this same file):** migration 0022 created
`is_randomized` as `NOT NULL DEFAULT false`. But for any delivery with no managed
batch (probe/canary subscription), the extractor set `isRandomized: null` — and
inserting NULL into a NOT NULL column makes Postgres throw, which made the whole
handler throw, store 0 rows, and record `delivery_failure=1` (your canary FAIL). The
extractor now defaults unmanaged rows to `isRandomized: false` (they are never
randomized), which satisfies the NOT NULL column and the V3.8 boolean rule. The
canary and every probe after the fix store rows normally.

### 7.6 `aerodataboxLimiter_v3.ts` — the AeroDataBox client

Throttled/rate-limited REST calls: `getBalance`, `refillBalance`,
`createSubscription`/`listSubscriptions`/`deleteSubscription`/`getSubscription`,
`checkAirportFeeds`, `listFeedAirports`, `defaultWebhookUrl`. Every subscription is
created with `maxDeliveryRetries: 0` (the pricing guarantee: each delivery costs
exactly 1 credit, no retry chains), and webhook URLs always include `:443`
(AeroDataBox rejects URLs without an explicit port).

### 7.7 The 57-error typecheck baseline

`npm run check` reports **57 pre-existing errors** (mostly in `server/routes.ts`).
We treat that as the baseline and require our changes to add zero. After all step-12
changes + the rl9 fix: still 57, none in the changed files.

### 7.8 Where every formula in §4 comes from, and the code of it

Every number and equation in §4 is **not invented** — it comes from the plan's §9 /
§23 (the anchor-probe spec) and §3.2 (the budget), and the code that implements it
is in `scripts/anchor_probe.ts`:

| Formula (§4) | Source | The code |
| --- | --- | --- |
| `uf_per_credit = unique_flights / credits_spent` (§4.7) | plan §9 step 4 ("record unique-flights/credit") | `runSingleProbe`: `ufPerCredit = creditsSpent && creditsSpent > 0 ? uniqueFlights / creditsSpent : null` |
| `chain_per_credit = chain_links / credits_spent` (§4.7) | plan §9 step 4 | `tailChainLinks` counted by the SQL `count(*) - 1 ... GROUP BY aircraft_reg`, divided by credits |
| `stability = 1/(1+CV)` of 15-min buckets (§4.6) | our implementation of the plan's "stability" component | `runSingleProbe`: buckets rows per 900-second block, mean/variance/CV, `clamp01(1/(1+cv))` |
| `uf_std = clamp(probe/reference, 0, 1)` (§4.8) | plan §23 step 4: standardized to [0,1] vs the WSSS baseline | `computeScores`: `clamp01(probe.unique_flights_per_credit / refUf)` where `refUf` is WSSS (fallback OMAA) measured the same way |
| `yield_score = (uf_std + chain_std + stab_std)/3` (§4.8) | plan §23 step 4 | `computeScores`: `yieldScore = (ufStd + chainStd + stabStd) / 3` |
| `capacity gate = rows/h ≥ 60` (§4.12) | plan §23 step 4: capacity is a separate feasibility GATE | `computeScores`: `capacityPass = rowsPerHour >= CAPACITY_GATE_ROWS_PER_HOUR`; printed as `capacity PASS`/`FAIL`, never added to the score |
| `anchor_score = 0.4·traffic + 0.2·geo + 0.2·carrier + 0.2·yield` (§4.9) | plan §23 step 5, V3.6 pre-specified weights | `computeScores`: `W_EXOGENOUS*exogTraffic + W_GEO*exogGeo + W_CARRIER*exogCarrier + W_YIELD*yieldScore` with `W_EXOGENOUS=0.4` etc. at the top of the file |
| `exog_traffic = flights/yr ÷ shortlist max` (§4.9) | plan §23 step 2 (published reference, frozen) | `computeScores`: `clamp01(cand.exogFlightsPerYear / MAX_EXOG_FLAIGHTS)` |
| `C_external = balance_before − balance_after` (§4.10) | plan §3.2/§44-A (authoritative spend) | canary `cExternal = balanceBefore - balanceAfter`; probe `creditsSpent = max(0, balanceBefore - balanceAfter)` |
| `C_internal = Σ notification_items` (§4.10) | plan §13/§44-A | canary SQL: `COALESCE(sum(notification_items),0) FROM clean.adb_ingest_events WHERE subscription_id=$1` |

So: the plan defines *what* to measure and the weights; the code is the frozen
implementation of it, written before any probe ran. If you want to see a formula
"live", read `computeScores` in `scripts/anchor_probe.ts` (lines ~430–484) — it is
the whole §4.8/§4.9/§4.12 in ~50 lines.

### 7.9 How to read a probe run (mapping the output to the code)

A stage-1 run prints: `balance_before` → `subscription: … isActive=true` →
`probing 2h …` (the process is now *waiting* — walk away) → `subscription deleted:
yes` → `balance_after` / `credits_spent` → `rows_delivered` / `unique_flights` /
`chain_links` → `rows_per_hour` / `uf/credit` / `chain/credit` / `stability` →
`recorded in clean.adb_anchor_probe.`. Each printed line corresponds to a step in
`runSingleProbe` (§7.1). If it prints `SKIPPED — …`, read the reason: either the
budget guard, the R1 exclusivity guard, or "already probed (stage 1)". If it prints
`subscription deleted: NO`, run `--cleanup` before the next probe.

---

## 8. Shell commands to check the records (history survives restarts)

> Replit's shell restarts and the *live* output disappears. The records do NOT —
> they live in the append-only log file and in the database. Here is how to see
> them again, any time.

| You want to see | Command |
| --- | --- |
| Latest 200 log lines (paste back to me) | `npm run logs:last` |
| Live log stream | `npm run logs` |
| Last 1,000 log lines, raw | `tail -n 1000 logs/collector.log` |
| Whether a boot was safe | `npm run logs:last \| grep "watchdog started"` — must end `autoCollect=false` |
| Current health (live balance, gap, can-start) | `npm run health` |
| Budget report (floor, invariant) | `npm run gate0` |
| Balance / refill | `npm run refill` (add `-- N` to refill N) |
| Recorded probes | `npm run anchor-probe -- --status` |
| Probe webhook reachability | `npm run anchor-probe -- --check-webhook` |
| Orphaned subscriptions + fix | `npm run anchor-probe -- --cleanup` |
| Credit reconciliation (Gate 3) | `npm run canary` |
| Step-11 frame summary | `npm run build-catalog` (re-prints the stratum table; safe to re-run) |
| All collected flight rows | `npm run export` |

### The log files are the history

Every pasted run lives in `AugMDnotes/`: `replitLogs1.md`, `replitLogs2.md`,
`replitLogs3.md`, `rl4.md`, `rl5.md`, `rl6.md`, `rl7.md`, `rl8.md`. Rule: **every
time we run something, paste the output into the next `rlN.md`** — that way the
record survives any shell restart. The analysis of each report is in §10 (and the
older ones in §12).

### How to read the boot log line

```text
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch,
  dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300,
  tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB,
  utcCycle=0,4,8,12,16,20, autoCollect=false)
```

Everything here is the safe Phase-0 config. The one line to verify every boot:
`autoCollect=false`. If a boot shows `autoCollect=true`, Replit started the app
with the Run button (bare `npm run dev`, no env prefix) — it did no damage while
balance < 1,300, but fix it by making sure the boot command includes
`ADB_AUTO_COLLECT=0`.

---

## 9. Money, dates, and credits ledger

### 9.1 The budget numbers (from the plan §3)

| Number | Meaning |
| --- | --- |
| **60,000** | total monthly API units (real entitlement — VERIFY at Gate 0) |
| **57,900** | *spendable* experimental envelope = 58,900 refill − 1,000 floor. Binding total for the whole run |
| **1,900/day** | daily credit ceiling (~60,000 ÷ 31); the watchdog never exceeds it |
| **1,000 floor** | `ADB_RESERVE_CREDITS`; controller refuses to spend below this |
| **1,000 REST** | separate line for census/FIDS/probes — never from the 57,900 envelope |
| **100** | unallocated remainder, never used |

Arithmetic: `57,900 + 1,000 floor + 1,000 REST + 100 unallocated = 60,000 ✓`

### 9.2 The balance history and when spending started

| Date (UTC) | Event | Balance |
| --- | --- | --- |
| 2026-08-16 | Gate-0 refill: read-only check | 862 |
| 2026-08-16 | 1-credit refill — **proved 1 unit = 1 credit** | 863 |
| 2026-08-16 | full refill | **2,901** |
| 2026-08-18 | **first probe attempt (rl8)** — first moment spending *could* have begun | 2,901 (still — 0 delivered, 0 spent) |
| now | canary + real probe spend has NOT begun yet | 2,901 |

**Credits spent so far: 0.** The probe daily cap is 500 (inside the 1,900/day
budget). When the first real deliveries arrive, this is the row that changes —
that's the date the actual credit spending starts, and we will record it here.

### 9.3 Reserve and invariant rules

- `npm run gate0` prints `Permanent floor (1000) intact YES` (balance ≥ 1,000) and
  `Run-total invariant HOLDING` (spend ≤ 57,900). Both are checked every run.
- SOFT_STOP = 1,850 (1,900 − 50) stops a batch; HARD_CAP = 1,900; overshoot →
  MISMATCH. The probe script refuses when balance < reserve or the daily cap would
  be exceeded.

---

## 10. Run report: rl8 (2026-08-18) analyzed

You pasted the outputs into `AugMDnotes/rl8.md` out of order. This is the
line-by-line analysis. The raw reordering: `git pull` → boot → `--status` →
`--stage 1` (KLAX, started) → `--stage 2` (KLAX, started) → `--score` →
`logs:last`.

### 10.1 What worked

| Piece | Verdict |
| --- | --- |
| `git pull origin main` → fast-forward `2ffb693..73affad` | all step-12 files arrived (0023 migration, probe script, walkthrough, log, rl7) |
| Fresh boot applied migrations through `0023` | `[migrations] applied 0023_anchor_probe_results.sql` appears in the boot log |
| Watchdog line | `budget=1900 ... autoCollect=false` — safe mode confirmed |
| `--status` | correctly reported "No probes recorded yet" (first time) |
| `--score` | correctly refused to score — "No calibration baseline probed yet (WSSS/OMAA)" |

### 10.2 What went wrong

1. **The probe run was interrupted and run out of order.** `--stage 1` started a
   KLAX 2 h probe (sub `99cdf2be-8016-4a91-ab8c-22246fabbd8d`), then `--stage 2`
   was started (KLAX 4 h, sub `9c87e594-c245-4126-af71-97e3acbef457`) before stage
   1 finished. The plan says stage 2 *confirms* stage-1 picks — running it first is
   meaningless. The script now **refuses** stage 2 without a completed stage-1.
2. **Two orphaned ACTIVE subscriptions were left behind.** The interrupted stage-1
   process never deleted its sub. Both are still active and billable — a violation
   of R1 exclusivity, and the Gate-3 canary will fail while they exist. Run
   `npm run anchor-probe -- --cleanup` to delete them.
3. **Zero deliveries, zero spend, for hours.** Every heartbeat shows
   `balance=2901 rowsToday=0` from 18:23 UTC through 06:11 UTC the next day. That
   means AeroDataBox **never sent anything** to our webhook. The `data gap` ALERT
   lines are just the watchdog noting no rows arrived — expected, because nothing
   was delivered.

### 10.3 What the zero-deliveries result means (and what to do)

Because AeroDataBox deducts credits **on SEND** (not on delivery), a balance that
never moved means it never tried to send — so this is NOT "credits were spent and
lost". It means the webhook path is unproven. Two candidate causes:

- AeroDataBox cannot reach the public webhook URL (the URL comes from
  `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL`).
- The subscription never became active (`isActive=false` / pending activation).

The probe now prints `isActive` / `activateBeforeUtc` for every subscription, and
`--check-webhook` probes the public URL directly. **Do the canary next** (`npm run
canary`): it must show PASS **with more than 0 items**. If the canary still shows 0
deliveries, tell me — we will fix the webhook URL/activation before any probe.

### 10.4 The takeaway

Nothing was lost and nothing was spent. The script has since been hardened so the
out-of-order and orphan-sub mistakes cannot recur. The only open question is the
one the probe was supposed to answer for us: **can AeroDataBox reach our webhook?**
That is exactly what `--check-webhook` + the canary settle next.

---

## 11. Change log (newest first)

### 2026-08-19 (later) — rl9 canary FAIL root-caused + fixed; log teaching sections expanded

**rl9 (see §0.3.2) showed the webhook IS reachable (HTTP 200) but the canary
FAILED:** 1 delivery charged 1 credit, 0 items stored, `delivery_failure=1`.

**Root cause found + fixed (one line):** migration 0022 made `is_randomized`
`NOT NULL DEFAULT false`, but the webhook extractor sent `isRandomized: null` for
any delivery with no managed batch (probe/canary). NULL into a NOT NULL column →
Postgres error → the whole webhook handler threw → 0 rows + delivery failure.
`server/lib/disruption/flightNotificationExtractor_v3.ts` now defaults unmanaged
rows to `isRandomized: false`. Typecheck still 57.

**Log expansions (your questions answered in place):**

- §0.3.2 — full rl9 table-by-table analysis + the decoded canary FAIL.
- §1 — rewritten for the post-fix state; explains the probing-timing question
  (each command waits its own 2 h; never parallel; why not one 24 h command) and
  what "calibration baseline" / 331 / 127 mean.
- §4.1 — the 267/276 is NOT the frame (the 4,320 = 267 curated + 4,053
  unclassified breakdown).
- §4.3 — the `1/p` weight, flight-inclusion ≠ airport-selection, conditional `p_i`.
- §4.4 — where 3 (tiers) and 6 (regions) come from; "18/18 non-empty" and
  pre/post/both explained.
- §4.5 — what UTC is; seeds.
- §4.6/4.7 — the three yield components in plain words + a worked example.
- §4.8 — calibration baseline + full worked standardization example.
- §4.9/4.10 — anchor score parts and reconciliation, both expanded.
- §4.12 (new) — "capacity is a gate, not a component".
- §4.13 (new) — the evaluation suite (Engines A–E + R + P) and the R1–R7 / S1–S5
  codes.
- §5 — new glossary terms (canary, conditional probability, inclusion probability,
  evaluation suite, engines, R/S codes, UTC, expanded strata/tiers).
- §6.3 — which columns come from AeroDataBox vs stamped by us; which tables are
  derived vs audit logs.
- §7 — anchor_probe/canary/frame-builder/controller rewritten deeper; new §7.8
  (every formula → its plan source → its exact code line) and §7.9 (how to read a
  probe run); the `is_randomized` bug explained in §7.5.
- §12.10 (new) — the previous "what to do next" archived.
- `CODE_WALKTHROUGH.md` — updated for the fix and the new probe modes.

**You still need to run on Replit:** pull the fix, re-boot, re-run the canary
(step 6), then re-run the WSSS probe — the 08-19 WSSS result predates the fix and
is meaningless.

### 2026-08-19 — Probe hardened after the rl8 post-mortem + log restructured

**rl8 findings (see §10):** the first probe attempt ran out of order, left two
orphaned ACTIVE subscriptions (`99cdf2be-8016-4a91-ab8c-22246fabbd8d`,
`9c87e594-c245-4126-af71-97e3acbef457`), and produced zero deliveries (balance
stayed 2,901, rowsToday=0 for hours) — the webhook path is unverified.

**Probe script changes** (`scripts/anchor_probe.ts` + migration 0023):

1. **`--cleanup`** — deletes probe-owned orphan subscriptions (rows left
   `status='probing'` by an interrupted run) and marks them `abandoned`;
   `--cleanup --force` also deletes any other untracked ACTIVE credit-based sub.
2. **Stage-2 guard** — refuses `--stage 2` for any airport without a completed
   stage-1 probe (the rl8 out-of-order mistake is now impossible).
3. **R1 exclusivity guard** — refuses to start a probe if any foreign ACTIVE
   billable subscription exists.
4. **`probing` status rows** — every probe is inserted as `probing` at
   subscription time and flipped to `completed` at the end, so interrupted runs are
   visible and cleanable. Migration 0023's status CHECK widened to
   `completed | failed | probing | abandoned` (idempotent re-run).
5. **`--check-webhook`** — prints the exact public webhook URL, whether
   `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL` are set, and probes reachability (any HTTP
   status proves reachability; a network error means AeroDataBox can't reach us).
6. Subscription creation now prints `isActive` / `activateBeforeUtc` so activation
   state is visible.

**Log restructured** into the phase-with-steps + teaching layout you asked for:
table of contents with jump links; §0 dashboard; §1 one complete ordered command
list; §2 the plan explained section by section; §3 phases with steps; §4–§6 the
statistics/glossary/tables teaching sections; §7 main code; §8 records-after-
restart commands; §9 money + dates ledger; §10 the rl8 analysis; §11 this change
log; §12 archive (outdated Step A/Step B, old run reports, audit snapshot).

Typecheck: still **57** pre-existing errors, none in the changed files.

**What you do next (on Replit):** `git pull` → `pkill -9 -f node` →
`ADB_AUTO_COLLECT=0 npm run dev` → `--check-webhook` → `--cleanup` → `npm run
canary` → stage 1 probes one at a time (see §1).

### 2026-08-18 — STEP 12 SCRIPT READY: two-stage anchor probe built

**What I built (per the plan §9 / §17 step 12 — the pool
`KLAX·EGLL·WSSS·SBGR·OMDB` is *provisional until measured*, so we now have the
script that measures + scores it):**

1. `migrations/0023_anchor_probe_results.sql` (NEW, registered in `server/db.ts`)
   — `clean.adb_anchor_probe`: one row per probe observation (stage, icao, region,
   live window, `credits_spent`, rows, unique flights, chain links, rows/h,
   uf/credit, chain/credit, stability). Idempotent, unique on
   `(icao, stage, window_start)` so re-runs never duplicate.
2. `scripts/anchor_probe.ts` (NEW, `npm run anchor-probe`) — the probe runner:
   - **Frozen pre-probe math** (decided in code BEFORE measuring, §9 step 4):
     `yield_score = ⅓·std(uf/credit) + ⅓·std(chain/credit) + ⅓·std(stability)`
     standardized to [0,1] against the **WSSS baseline measured the same way**;
     `anchor_score = 40% exogenous + 20% geo + 20% carrier + 20% yield`;
     **capacity gate = rows/h ≥ 60** as a PASS/FAIL feasibility gate (NOT a score
     component).
   - **Frozen shortlist** (12 airports across the 6 regions, from the plan's
     priority anchor regions) with exogenous reference values (published
     scheduled flights/yr + geo + carrier indices). Our own collection never
     feeds the exogenous 80% (kills the §23a feedback loop).
   - Modes: `--stage 1` (2 h probe per candidate, WSSS/OMAA calibration included),
     `--stage 2` (longer confirmation for top picks), `--score` (fills the frozen
     formulas, applies the capacity gate, prints the ranked pool + proposed
     5-airport lock), `--status` (list recorded probes), `--icao`, `--hours`.
   - **Budget-capped inside the 1,900/day budget**: refuses to probe when balance
     < reserve (1,000) or the daily probe spend (cap 500) would push past the cap.
3. `package.json` — added `"anchor-probe": "tsx scripts/anchor_probe.ts"`.
4. `AugMDnotes/CODE_WALKTHROUGH.md` (NEW) — a **full plain-English code
   walkthrough** of the V3.9 codebase (what each file does, how, and why).

**Typecheck:** still **57** pre-existing errors (baseline — no new ones).

### 2026-08-18 — STEP 11 DONE: frame built from the measured universe (rl7)

**Result (from `rl7.md`):** `npm run build-catalog` ran clean after the 0022 fix.
`frameCount 4320` = 267 curated + 4,053 unclassified; 18/18 tier×region strata
non-empty; persisted to `clean.adb_sampling_frame`; `post_eligible 2264`. Step 11
is **complete** — next was step 12 (the two-stage anchor probe).

**Which files changed and what they do (plain English):**

1. `scripts/build_stratified_catalog.ts` (NEW logic, `npm run build-catalog`) — the
   step-11 script: calls AeroDataBox coverage, gives every universe airport a tier
   (curated 276 keep theirs; the rest → REGIONAL "unclassified",
   `traffic_prior=1.0`), a macro-region (ICAO first letter → 1 of 6), and per-layer
   feed flags (`feed_schedule`/`feed_live`/`feed_adsb` →
   `pre_eligible`/`post_eligible`), builds the tier × region strata table, then
   writes all 4,320 rows into `clean.adb_sampling_frame`.
2. `server/lib/disruption/adbCollectionController_v3.ts` — `pickAirportCandidates()`
   now reads candidates from `clean.adb_sampling_frame`, refuses to start if it's
   empty, filters to `post_eligible=true`, and for REGIONAL runs a genuine
   normalized probability draw (`drawWithoutReplacement`, seeded) instead of
   "shuffle and take first". HUB/MID stay deterministic slot-fill. The batch-insert
   stamps `is_randomized` + `airport_layer_design_probability` (REGIONAL) or
   `planned_share` (HUB/MID) — the DB CHECK enforces the rule.
3. `migrations/0021_collection_v39_sampling_frame.sql` (NEW) — `clean.adb_sampling_frame`.
4. `migrations/0022_collection_v39_design_probability.sql` (NEW) — renames
   `sampling_probability` → `airport_layer_design_probability`, adds `is_randomized`
   + `planned_share`, adds the DB CHECK rule + frame-invariant CHECKs; fixed to
   survive re-runs alongside 0012.
5. `server/db.ts` — registers 0021/0022 in `BOOT_MIGRATIONS`.
6. `shared/schema.ts` — TS/Drizzle types for the renamed columns.
7. Consumers updated to the new column/interface names (store, extractor, routes,
   limiter, export/analyze/backfill scripts, test script).
8. Controller `toInt` helper renamed `toNum` (never truncated; the name just
   implied it).

### 2026-08-18 — FIXED: step-11 run failed on migration 0022 re-run (0012 ↔ 0022 order bug)

**What happened (from `rl6.md`):** `npm run build-catalog` aborted:
`[migrations] failed to apply 0022 ... column "airport_layer_design_probability" of relation "flight_data_pre_post" already exists`.

**Why:** every boot re-runs ALL migrations. On the FIRST boot 0022 renamed
`sampling_probability` → `airport_layer_design_probability`. On the NEXT process
migration **0012** ran first and its `ADD COLUMN IF NOT EXISTS sampling_probability`
**re-created the old column**; then 0022's guarded rename saw it again and tried to
rename it onto the already-existing new column → error. (`adb_collection_subs` was
safe because 0012 creates it with `CREATE TABLE IF NOT EXISTS`.)

**Fix (migration 0022, re-runnable):** the rename handles all three states —
only-old-column → rename; both → drop the stale empty re-add; only-new → no-op.
Both tables covered. Typecheck still 57.

### 2026-08-18 — LOG REORGANIZED + `toInt` renamed to `toNum`

- Log restructured so current info is at the top and old stuff lives in the
  archive (§12). `toInt` → `toNum` in the controller (it never truncated; the name
  implied integer rounding of design probabilities).

### 2026-08-18 — SECOND REVIEW: statistical mechanics fixed

A deeper review confirmed the direction but found two must-fix statistical issues:
(1) webhook candidates are now POST-eligible only (the webhook supplies
POST/AIRBORNE observations; subscriptions depend on live/ADS-B coverage);
(2) REGIONAL selection is a genuine normalized probability draw (seeded
`drawWithoutReplacement()`, uniform `p_i = 1/|eligible|` pre-probe; realized p_i
recorded); HUB/MID remain deterministic slot-fill. Plus: `sampling_probability` →
`airport_layer_design_probability` with `is_randomized` + `planned_share` enforced
in the DB (migration 0022), and frame CHECK constraints so the invariants can't
drift. Open (documented pre-freeze): traffic-reference re-tiering, region-mapping
freeze, and the adaptive REGIONAL `m_i` (boots only after probe data).

### 2026-08-18 — REVIEW-DRIVEN FIXES: collector wired to the frame, honest tiering

A code review found three real bugs that would have silently undone the frame
decision: (1) the collector still sampled from the old 276 — now reads
`clean.adb_sampling_frame` and throws if it's empty; (2) `sampling_probability` had
the wrong denominator — now uses the frame tier pool and is labelled a **planned
share**; (3) unclassified airports were invisible to tier counting — now falls back
to REGIONAL. Also: `tierSource` `"default"` → `"unclassified"`, explicit per-layer
feed eligibility, and `build-catalog` runs `applyBootMigrations()` first.

---

## 12. Archive (outdated and historical)

> Everything below is **history** — kept for honesty, not for current use. The
> current state is at the TOP of this file (§0). These entries are archived
> because the design moved on (mostly the "276 as the frame" era, which the plan
> §6 superseded with the measured universe).

### 12.1 Outdated: the "three lists" (276 / 267 / 4,332) framed as the sampling design

This is the pre-step-11 framing. It is archived because it is **only partially
right**: the arithmetic (276 = 30+89+157, 267 = 30+87+150, 9 missing, 4,065 =
4,332−267) is correct as *measurements*, but presenting `catalogInUniverse 267` as
"the frame" was wrong. Per PART 1 §4, the frame = `universe ∩ feed-eligible` (the
whole measured universe, zero-yield kept), which is what step 11 actually built
(4,320 airports). The 276 remains the curated reference (`tier_source='curated'`).

The measured numbers, for the record:
`universeCount 4332`, `catalogCount (ours) 276`, `catalogInUniverse 267`
(30 HUB + 87 MID + 150 REGIONAL), `catalogMissingFromUniverse 9` (2 MID + 7
REGIONAL), `universeNotInCatalog 4065`. Gate-1 sanity: `universe ≥ catalog` →
4332 ≥ 276 passes.

### 12.2 Outdated: Step A / Step B of the old "steps" section

The old §1 framed everything as numbered Steps A–D with Step A "housekeeping"
(done) and Step B "the stratified catalog build" that still described the 276 as
the frame. That framing was retired in favor of the phases-with-steps layout in §3.
Step A is done; Step B became step 11 (see §3 Phase 2). The two honest options the
old text presented (Option 1 = rebuild from measured universe, Option 2 = keep 276
as a restricted panel) were decided: **Option 1** was chosen on 2026-08-17.

### 12.3 Run report #4 (from `rl4.md`, 2026-08-17) — it all worked

You pulled, booted, and verified: migrations 0017–0020 applied; watchdog safe
(`budget=1900 ... autoCollect=false`); `npm run health` PASS with live balance
2,901; `npm run gate0` clean (floor intact, invariant holding); heartbeats showed
`canStart=false → canStart=true` after the refill. `npm run coverage` was also run
here (step 10) — the numbers are in §12.1. One note: a 02:07 boot had
`autoCollect=true` again (Run button issue) but did no damage because balance was
below the floor.

### 12.4 Run report #3 (from `replitLogs3.md`, 2026-08-16) — refill worked

This closed Gate 0's refill + conversion checks: `npm run refill` (read-only) → 862;
`npm run refill -- 1` → 863 (**1 unit = 1 credit confirmed**); `npm run refill --
2038` → **2,901**. Also fixed a stale-read bug: `health`/`gate0` now call
`getBalance()` live and print `(live-api)` instead of reading the last webhook row.

### 12.5 Run report #2 (from `replitLogs2.md`, 2026-08-16) — 0020 fixed

Migration 0020 applied on the fresh boot (the `loc_reported_utc` fix is confirmed;
all 4 airborne tables exist). Old `0020 failed` lines in the log are from earlier
boots (append-only log). `refillToFullBudget` changed 3138 → 2038 (budget 3000 →
1900). A 20:06 boot ran `autoCollect=true` (Run button issue); nothing spent.

### 12.6 Run report #1 (from `replitLogs1.md`, 2026-08-16) — 0020 bug found + fixed

Server booted; migrations 0018/0019 applied; Phase-0 config live
(`budget=1900 ... autoCollect=false`). Bug found: migration 0020 failed with
`column "loc_reported_utc" does not exist` — the index referenced a missing column
and the single transaction rolled all 4 airborne tables back. Fix: added
`loc_reported_utc TIMESTAMPTZ` to `raw_airborne_events` + updated the store's
insert (32→33 params).

### 12.7 AUDIT SNAPSHOT (what existed before Phase 0 — for the record)

| Item | Plan delta | Code state at audit | Verified |
| --- | --- | --- | --- |
| Credit accounting (ledger + balance delta) | §11, migration 0017 | exists | `git log` |
| `maxDeliveryRetries = 0` | §15 R-delta / §45.5 | controller + canary | grep |
| Daily credit cap 1,900 | §3.3 / DD-R | `:95` | read |
| `ADB_BATCH_BUDGET` default | §22 fix 3 (must be 1900) | ❌ was 3000 → FIXED | read |
| R1 subscription exclusivity | §15 | canary assert — FIXED | read |
| R3 credit canary | §15 | `credit_canary.ts` — present | read |
| R7 versioned manifest | §15 | `writeManifest` — FIXED | read |
| R2 SOFT_STOP margin | §15 | `:102` — FIXED | grep |
| R5 delivery-failure flag | §15, migration 0018 | — FIXED | ls |
| R6 crossover template freeze | §15 | — FIXED | grep |
| S1–S5 population/airborne layers | §15, migrations 0019–0020 | — FIXED | ls |
| Gate-0 budget-partition report | §17 step 3 | `gate0_budget_report.ts` — FIXED | grep |

### 12.8 Older change log (2026-08-17 and earlier — full history)

- **2026-08-17 — FRAME DECISION MADE (Option 1) + script rebuilt.** Team chose to
  follow plan §6 literally: frame = measured universe (universe ∩ feed-eligible,
  zero-yield kept), 276 preserved as flagged curated reference. Script rebuilt;
  macro-region map extended to the whole universe; tested locally (frame=287 test
  set, 18 cells all populated). No open decision remains for step 11.
- **2026-08-17 — CONFIRMED DESIGN GAP: 276 predates the plan.** Verified with git
  history: catalog created 2026-08-09/10, plan 2026-08-13, catalog never
  regenerated. Plan §6 explicitly moved from "276 hard-coded" to "measured
  universe". Arithmetic still correct; the design gap led to the Option-1/Option-2
  decision above.
- **2026-08-17 — FINAL VERIFICATION of 276/267.** Three independent proofs: the
  plan names these metrics (PART 1 §4 line ~215), the coverage endpoint is the same
  code path, and hand-arithmetic is internally consistent.
- **2026-08-17 — VERIFIED number origins + regions CONFIRMED.** 4,332 = from
  AeroDataBox (`listFeedAirports`); 276 = from US (`adbAirportCatalog_v3.ts`);
  267 = a MIX (our catalog ∩ their universe); "frame" terminology fixed
  (267 = `catalogInUniverse`, a Gate-1 metric, NOT the frame). Macro-regions
  confirmed: the plan's "Priority anchor regions" list enumerates exactly North
  America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania.
- **2026-08-17 — CORRECTION: PART 1 is the only spec.** `ADB_PLAN = Ultra`
  RETRACTED (came from PART 2 §13, old); `ADB_MONTHLY_UNITS = 60000` confirmed
  (PART 1 §3.2). "6 macro-regions from §23" RETRACTED (that's PART 2; it's our
  documented choice). Anchor-probe §23 quotes RETRACTED (PART 1 §8/§9 is the
  authority). "No tier-empty cells" no longer a plan requirement (kept as a
  warning). All section cross-refs now point to PART 1.
- **2026-08-17 — `npm run build-catalog` implemented (Phase 2 step 11).** New
  script building the stratified catalog: our 276 ∩ universe → primary strata =
  traffic tier × macro-region (PART 1 §4/§17 step 11), using our 6 regions.
- **2026-08-17 — Step-by-step detail added for Steps A–C (from the plan).**
  Step A answered (verification commands, `ADB_MONTHLY_UNITS`); Step B clarified
  the three lists; Step C explained the anchor probe in plain English.
- **2026-08-17 — Next-steps section rewritten from the plan (§3).** Steps A–D
  with the exact "what I need from you" list. (Superseded by §1 of this log.)

### 12.9 The old plain-English command explanations (kept for the record)

The detailed line-by-line explanations of `npm run health`, `npm run gate0`, and
`npm run coverage` output (the "2.3/2.4/2.5" sections) were folded into §8 and the
glossary. The essential takeaways, still true today: the `data flow FAIL` and
`active batch FAIL` lines are *status*, not errors — they flip green only after the
real run starts; the line that matters is **balance**, which is green (2,901).

### 12.10 Previous "What to do next" — the 2026-08-19 pre-rl9 list (superseded)

> This is the previous version of §1, archived whole so you can look back. It was
> superseded on 2026-08-19 because the canary FAILED and its root cause was found
> and fixed, so the current list (top of §1) now starts with pulling the fix and
> re-running the canary. The rl8 orphans (`99cdf2be-…`, `9c87e594-…`) named in
> step 4 of this old list are long gone.

The old list, verbatim in substance:

1. `git pull origin main` — get the latest code (anchor_probe.ts, migration 0023,
   the log, rl8.md).
2. `pkill -9 -f node` then `ADB_AUTO_COLLECT=0 npm run dev` — safe boot;
   watch for `applied 0023` + `autoCollect=false`.
3. `npm run anchor-probe -- --check-webhook` — prove the webhook URL is
   publicly reachable; any HTTP status is a pass, network error is a fail.
4. `npm run anchor-probe -- --cleanup` — delete the two orphaned subscriptions
   from the rl8 interrupted run and mark their rows `abandoned`.
5. `npm run health` + `npm run gate0` — balance 2,901, floor intact, invariant
   HOLDING.
6. `npm run canary` — must PASS with more than 0 items and zero delivery
   failures; if 0 items / 0 balance change, the webhook still is not receiving.
7. `npm run anchor-probe -- --stage 1 --icao WSSS`, then `OMAA`, then `KLAX`, then
   the other 9, one at a time — each a 2 h window, WSSS/OMAA first as calibration
   baselines (~331 / ~127 rows/h); ~24 h back-to-back; never cross in real time.
8. `npm run anchor-probe -- --status` — list recorded probes.
9. `npm run anchor-probe -- --score` — fill the frozen formula, apply the
   capacity gate, print the ranked pool + proposed 5-airport lock.
10. `npm run anchor-probe -- --stage 2` — 4 h confirmation; refuses airports
    without a completed stage-1.
11. Paste the `--score` output into `AugMDnotes/rl9.md` and report back.

What actually happened when you followed it: steps 1–5 all green; step 6
(canary) FAILED with `delivery_failure=1`, 0 items, 1 credit spent; step 7 was
started for WSSS before the canary passed, so it hit the same bug. The fix and
the re-run are the current §1.
