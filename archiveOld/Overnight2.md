# Overnight 2 — Detailed Collection & Dataset Analysis (2026-08-11)

> Written for the "second overnight run" review. Companion to
> `V3_CollectionStrategy.md` (the plan) and `V3_OvernightRun_Diagnosis.md`
> (the first-run column-by-column autopsy). This one is about **what the data
> looks like NOW, how the sampling system actually behaved, whether the plan is
> still right, and exactly what to change so 60,000 credits last 30 days.**
>
> Sources: `flight_data_pre_post7.csv` (4,316 rows, exported Replit
> 2026-08-11 15:02), the collector logs (B0001/B0002), the live analyzer
> (`scripts/analyze_flight_data_pre_post.py`) and a new sampling/graph analyzer
> (`scripts/analyze_overnight2.py`), plus the review of the research the model
> suggested (fixed-core + rotating-fringe critique).

---

## 0. The three data eras (everything in the CSV, in chronological order)

The export is not one collection run — it is three different eras stacked on
top of each other. You must not treat them as one dataset.

| Era | When | Rows | What | Sampling stamps |
| ---- | ---- | ---- | ---- | ---- |
| **(adhoc)** | 2026-08-10 08:09 → 08-11 ~02:00 (~18h) | 2,199 | The legacy one-off **KJFK** `FlightByAirportIcao` subscription (`sub 0731056c…`) — created before the batch system existed | **NONE** (`sampling_batch_id` NULL, no tier, no probability, no weight) |
| **B0001** | ~24h window (4h) | 195 | KMSP (MID, 168 rows) + LFBO (REGIONAL, 27 rows) | Stamped (MID:168, REGIONAL:27) |
| **B0002** | 07:29 → 11:17 UTC (3.8h) | 1,922 | WSSS (HUB) + OMAA + HECA (MID) + KGPT (REGIONAL) | Stamped (HUB:1,325 / MID:595 / REGIONAL:2) |

**Why this matters:** 2,199 of the 4,316 rows (51%) carry **no inclusion
probability and no weight**. Anything you feed those rows into for a weighted
sample is only valid for the 2,117 stamped rows. The un-stamped half is usable
as *feature/volume* data but is **not** part of the honest probability sample.

Credit trajectory across the whole export (from the `credits_remaining`
column on each row):

```
08-10 08:09  credits=9554   ← start of KJFK ad-hoc era
08-10 10:05  credits=9352
... steadily down ...
08-10 16:44  credits=7937
08-10 20:22  credits=5900   ← refill happened between 16:44 and 20:22
08-11 01:16  credits=3381
08-11 03:14  credits=3105   ← B0001 just finished, B0002 about to start
08-11 07:31  credits=2900   ← B0002 first rows
08-11 10:55  credits=1147
08-11 11:17  credits=866    ← B0002 stopped (budget hit)
```

Visible (row-implied) spend: **≈8,688 credits in 27.1h**, and there were
refills in between, so true burn is higher. The important point: **collection
at this rate consumes the 60k monthly quota in ~3–5 days**, not 30.

---

## 1. Column-by-column health (from the analyzer on v7)

Overall verdict from `scripts/analyze_flight_data_pre_post.py`: **solid.** The
bugs fixed in the first overnight run (status, gcd, quality, timestamps)
are gone. Column groups:

### 1.1 The columns that are effectively perfect (100%) — OK

| Group | Columns | Fill | Notes |
| ---- | ---- | ---- | ---- |
| Identity | `id`, `flight_number`, `carrier_iata/icao/name`, `is_cargo` | 100% | 1788 unique flight numbers; `is_cargo=false` for all (can't judge cargo bias yet — no cargo rows captured) |
| Status | `status`, `status_code` | 100% | 11 statuses; spread is `EnRoute 1327 / Expected 1170 / Arrived 931 / Departed 264` + Boarding/GateClosed/CheckIn trails — good coverage of **pre- and post-departure phases** |
| Codeshare | `codeshare_status` | 100% | 4308 IsOperator / 7 IsCodeshared / 1 Unknown |
| Distance | `gcd_km` | 100% | 497 distinct routes; sane values (878 km = the most common pair, TPA-family shape) |
| Stage | `data_stage` | 100% | **PRE = 1,703 (39.4%) / POST = 2,613 (60.6%)** — both stages present, the pre/post picture is not one-sided |
| Model | `aircraft_model` | 100% | 76 models, dominated A320-family + CRJ900 (the regional feeder) |
| Quality | `dep_quality` / `arr_quality` | 99% | `["Basic","Live"]` for most rows — live QC present where sent |
| Subscription meta | `subscription_id`, `subject_id`, `subscription_is_active`, `credits_remaining`, `balance_last_refilled/deducted_utc` | 100% | 7 distinct subscriptions captured; activity=all true |
| Times | `dep_scheduled_utc`, `arr_scheduled_utc`, `last_updated_utc`, `received_at` | 99–100% | – |

### 1.2 Columns that are *structurally* sparse — expected, not broken

| Column | Fill | Interpretation |
| ---- | ---- | ---- |
| `loc_*` (ADS-B live position) + `has_live_location` | **0%** | AeroDataBox delivers no live-position block in these webhook payloads, ever. Not a bug in our code — the field is simply never sent (same finding as Day 1). Pre-departure rows correctly have no position anyway. |
| `dep_runway_utc` | 44% (1,898) | Runway time present only for aircraft that have actually departed — that IS the post-departure signal, so 44% is the real POST-departure share with an actual runway time. |
| `arr_runway_utc` | 16% (696) | Arrivals landing within the capture window are a small share (expected — a 4h window sees few landings relative to departures). |
| `call_sign` | 83% | Missing on ~1 in 6 (older/regional/ground statuses and some codeshares). Not fatal; feature should treat it as a category with an "unknown". |
| `aircraft_reg` (tail) | **81%** | 800 rows have no tail number. This is the single most important *feature* gap for tail-rotation features (see §5.3). Regional/low-status pushes often omit `aircraft.reg`. |

### 1.3 Delay data quality (the actual ML target signal)

Computed from the CSV (runway − scheduled, in minutes):

| Signal | n | min | mean | max | What it says |
| ---- | ---- | ---- | ---- | ---- | ---- |
| Departure runway delay | 1,898 | −319 | **+44** | +399 | The workhorse target. Mean +44 min is a real, usable delay signal. −319 min = early departures (morning bank/crew re-timings); +399 = a ~6.6h departure pushback. Sanity: no absurd values. |
| Arrival runway delay | 696 | −82 | +14 | +377 | Arrival-side delay, smaller sample. |
| Arrival revised−schedule | 3,590 | −872 | +5 | +1,090 | The *revised* (carrier-published change) vs schedule. +1,090 min ≈ an 18h re-booking — almost certainly a **cancellation/re-route**, an outlier to handle but *evidence the raw data captures big disruptions*, which is exactly what a disruption-prediction product wants. |

**Bottom line for the ML pipeline:** the target (delay) is present, continuous,
and non-degenerate on ~44% of departure rows (and available as revised-delta on
83%). This is genuinely collectable training signal.

---

## 2. The sampling audit — did the system behave as designed?

### 2.1 Per batch (from the analyzer)

| Batch | Rows | Unique flights | Tiers delivered | Airports (sub id → rows) | Probability / weight used |
| ---- | ---- | ---- | ---- | ---- | ---- |
| adhoc | 2,199 | 2,199 | HUB only | KJFK | **none** |
| B0001 | 195 | 195 | MID 168 / REGIONAL 27 | KMSP(168), LFBO(27) | MID p=0.0225 w=44.5 (2/89), REGIONAL p=0.0127 w=78.5 (2/157) |
| B0002 | 1,922 | 1,888 | HUB 1,325 / MID 595 / REGIONAL 2 | WSSS(1,325), OMAA(508), HECA(87), **KGPT(2)** | HUB p=0.0333 w=30, MID p=0.0225 w=44.5, REGIONAL p=0.0127 w=78.5 |

The probability math checks out exactly against the plan: `p = slots_in_tier /
airports_in_tier_catalog` (HUB 1/30, MID 2/89, REGIONAL 2/157) and
`weight = 1/p`. So the bookkeeping the plan promised is actually happening.

**But three things stand out:**

1. **B0002 only filled 4 of 5 configured slots.** tierMix was
   {HUB:1, MID:2, REGIONAL:2}. WSSS + OMAA + HECA + KGPT = 1 HUB, 2 MID,
   1 REGIONAL. One REGIONAL slot was never filled (skipped `no_coverage` or
   `create_failed` on the fallback candidate). The strategy's own "fill or
   exhaust candidates" loop did kick in — it simply found no second REGIONAL
   airport it could subscribe. Not a crash, but it means the mixture claims
   **5 airports and delivered 4**.
2. **REGIONAL is nearly weightless in practice.** REGIONAL total = 29 rows in
   the entire export (27 LFBO in B0001 + 2 KGPT in B0002). Regional airports
   are *subscribed* fine (KGPT got its own subscription and delivered) — they
   just have almost no status-change traffic, so they produce ~0–3 rows per
   batch. Their cost is ~0, but their yield is ~0.
3. **HUB dominates the spend.** WSSS alone = 1,325 of 1,922 B0002 rows
   (69%). WSSS + OMAA = **1,833 of 1,922 (95%)**. The two REGIONAL slots cost
   basically nothing; the HUB+2 MID slots are the entire cost centre.

### 2.2 The "tier mix incomplete" FAIL that confused the first read of the logs

The health check (`scripts/check_collection_health.ts`) flags the active batch:
```
FAIL active B0002 tier mix incomplete — MID:252, HUB:475
```
This is **not** a collection bug. It checks **rows per tier** in
`flight_data_pre_post`, and REGIONAL airports legitimately produce ~1 row in a
window. The mixture guarantee is about **which airport subscriptions were
created** (`adb_collection_subs`), not how many rows each happens to emit yet.
The fix belongs in the health check (gate on subscriptions, report rows as
informational) — see §8.5.

---

## 3. Network / connectivity analysis — the GNN question answered with numbers

This is the crux of the research critique ("your adjacency matrix becomes
sparse or fractured"). I measured it on the actual data:

### 3.1 The whole dataset (all eras)

| Metric | Value |
| ---- | ---- |
| Distinct airports | 336 |
| Unique directed route pairs (edges) | 763 |
| Connected components | **1** |
| Largest component | **336 / 336 airports = 100%** |
| Route pairs seen in BOTH directions | 532 / 763 (70%) |

**The dataset is one giant connected component.** That is the opposite of
"fractured". The reason: **a flight is captured whole.** When we subscribe
WSSS, we get every WSSS→X and Y→WSSS flight *as complete edges* (origin +
destination in the same row). One hub fans out to its full international route
set; hubs + mids union trivially into a single component. Even with only
~5 airports subscribed per batch, the *edge set* is large (B0002 alone added
379 route pairs across 186 nodes).

So Gemini's specific "sparse/fractured adjacency" fear is **empirically
mitigated by how AeroDataBox delivers airport subscriptions** — something the
generic research critique couldn't know. The graph is dense at the top and
connected throughout.

### 3.2 What the graph is NOT giving you yet (the honest gap)

1. **Node stability over time, not node count.** The single component today is
   formed by *unioning* all eras. Day-by-day the active node set rotates
   (3–5 airports/batch). For a GNN you want a **persistent node universe** (the
   top-N core) whose hidden states evolve smoothly across days. Today the top-2
   nodes (KJFK, WSSS) are big but *each era has a different mix* — continuity
   across days is not guaranteed.
2. **The long tail is barely sampled (nodes + volume).** 336 airports total;
   catalog is 276; world is ~4,072 scheduled-commercial, ~500 carry 90% of
   traffic. The REGIONAL data is 29 rows across the entire run. You cannot yet
   learn "regional delay behaviour" — there isn't any data for it.
3. **70% bidirectional is good but not complete.** The missing 30% of
   direction-pairs are mostly spoke→hub routes where only the hub side fell in
   the window, or extremely low-frequency pairs.

### 3.3 Tail-number rotation (the "single strongest microscopic feature")

Aircraft-level continuity is how you get `inbound_arrival_delay →
next_outbound_delay` lag features. Measured:

| Metric | Value |
| ---- | ---- |
| Total distinct tail numbers | 1,036 |
| Tails appearing ≥2 captures | 716 (91% of all tail-captures are re-captures) |
| Re-capture distribution | 2×:200, 3×:136, 4×:87, 5×:81, 6×:69, 7×:53, 8×:42, 9×:18, 10×:9, … up to 17× |

So tail continuity **exists within the data** — the same aircraft keeps
reappearing (mostly the same flights being re-pushed through status phases,
some true rotations). The remaining obstacle is the **81% tail fill rate**: 800
rows (19%) have no `aircraft_reg`. Rotation features will be computed on the
81%, which is workable but must be acknowledged.

### 3.4 Hour-of-day spread (the quiet bias)

Capture hour (UTC) distribution over the whole export:

```
01:186  02:17  03:53  04:63  05:45  06:23
07:208  08:526  09:795  10:691  11:335  12:228
13:177  14:207  15:218  16:209  17:63   (18:0) (19:0)  20:213  21:59
```

Pattern: two lobes — the KJFK ad-hoc era lived ~08–18 UTC; B0002 lived
~07–11 UTC. **Hours 00, 18–19, 22–23 are nearly dead.** Because every current
batch window is a *contiguous 4h block*, the data is lumpy in time, not spread.
The plan's §8 warning is real and visible in the data: running every batch in
the same ~4h UTC band teaches the model "evening congestion == universal".
Fix: staggered start hours + mixed window lengths (§8.4).

---

## 4. Bias & dataset-quality assessment (what's wrong RIGHT NOW)

1. **Hub dominance.** HUB = 3,524 rows (82%); MID = 763 (18%); REGIONAL = 29
   (0.7%). Even *within* B0002 (the designed mixture): HUB 69%, MID 31%,
   REGIONAL 0.1%. The sampling was probabilistically correct, but the *yield
   per slot* is so skewed that the effective mixture is hub-heavy. This is the
   Pareto point the research made — and our own tierMix {HUB:1, MID:2,
   REGIONAL:2} is fighting it on the wrong side (spending 2 of 5 slots on
   ~zero-yield regional airports).
2. **Unweighted legacy rows.** 51% of the dataset (adhoc KJFK) has no
   sampling weight. Any weighted/IPW training must exclude or explicitly
   handle them.
3. **Regional delay signal absent.** 29 rows can't support either a regional
   node embedding or a regional delay model branch. Decide what to do about
   REGIONAL (§8.2) — keep it as frame-representativeness only, or drop it from
   the per-batch mix and let hub/mid routes cover the spokes.
4. **Delay target availability.** Only 44% of rows have `dep_runway_utc`
   (the true realized delay). The other 56% are pre-departure snapshots or
   statuses where the aircraft hasn't departed yet. Model design must treat the
   target as **not-always-observed** (censored), or lean on `revised −
   scheduled` as a secondary label (3,590 rows, includes the big rebooking
   outliers).
5. **Numbers on `credits_remaining` are balance snapshots, not per-row cost.**
   Don't ever sum them per row — they jump at delivery boundaries. Per-batch
   costs must come from logs / deltas, not rows.

---

## 5. Credit economics — why collection dies in days, and the 30-day reset

### 5.1 What we actually spent (measured)

| Era | Duration | Stored rows | Credits | Rate |
| ---- | ---- | ---- | ---- | ---- |
| KJFK ad-hoc | ~18h | 2,199 | ≈6,400+ | ~360/h |
| B0001 | ~4h | 195 | ≈200 | ~50/h |
| B0002 | 3.8h | 1,922 | **≈2,037** | **≈535/h** |

B0002 is the model to plan against: **a 5-slot, 4h batch with 1 hub + 2 mid +
2 regional ≈ 2,000 credits, ~1,900 rows, ~530 credits/hour.** The watchdog
stopped it exactly as designed (`B0002 reached budget (1922 ≥ 1903)` — the
*effective* budget was `min(3000, balance−1000)` with a drained balance).

### 5.2 The arithmetic for 30 days

- Monthly quota: **60,000 units**; refill 1 unit → 1 AeroDataBox credit;
  credits don't expire. So a full refill = **60,000 credits**.
- **60,000 / 30 days = 2,000 credits/day.**
- Measured cost of one 4h batch ≈ **2,000 credits.**
- **Therefore: exactly one 4h batch per day fits the month nearly perfectly.**

| Plan | Credits/day | Days | Total | Rows/day (≈1 row/credit) |
| ---- | ---- | ---- | ---- | ---- |
| A. 1 × 4h batch/day | ~2,000 | 30 | ~60,000 | ~1,900 |
| B. 2 × ~2h batches/day | ~1,900 | 30 | ~57,000 | ~1,800 |
| C. 1 × 4h batch with 6k buffer reserved | ~1,900 | 31 | ~59,000 | ~1,800 |

Under current defaults (no cap), a full 60k balance would let the watchdog
auto-start continuously: `min(budget 3000, balance−1000)` every batch, ~2,000–
3,000 per 4h batch, ~6 batches/day → **60k gone in ~3 days.** This is the
single most important fix: **enforce a daily cap.**

### 5.3 Concrete configuration to set on Replit

**Option A (no code — use the auto-start hour window as a daily limiter):**

| Env var | Value | Why |
| ---- | ---- | ---- |
| `ADB_BATCH_BUDGET` | `1900` | A 4h batch burns ~2,000; cap slightly under so window-stop or budget-stop both land ≤ daily quota |
| `ADB_AUTO_START_HOUR` | `4` | Only start a batch in the 04:xx UTC slot |
| `ADB_AUTO_END_HOUR` | `5` | Window only open 1 hour → at most **one** auto-start/day |
| `ADB_WINDOW_HOURS` | `4` | Unchanged |
| `ADB_RESERVE_CREDITS` | `1000` | Unchanged |
| `ADB_AUTO_COOLDOWN_MIN` | `15` | Unchanged |

→ One batch/day at ~04:00 UTC, runs until ~2,000 credits or 4h, sleeps ~20h.
31 days ≈ 59–62k. Downside: batch start hour is fixed (04 UTC) → hour-of-day
bias. Mitigate by changing the hour occasionally (see §5.4), or accept it for
the first month of volume.

**Option B (small code change — the better long-term answer): a daily credit
budget.**

Add a day-quota check in the watchdog/`startBatchInner`: read a
`meta('daily_spend:<yyyy-mm-dd>')` counter, and refuse to auto-start if
`yesterday+today spend ≥ ADB_DAILY_BUDGET` (default 1900). Then you can safely
keep a wide auto-start window and **stagger** start times (add a spread so the
auto hour drifts 4→24), fixing both the cap AND the time-of-day bias. ~1 hour
of work; the natural place is `maybeAutoStartNextBatch()` (adbCollectionController_v3.ts:730).

**Recommended decision:** ship Option A today (env-only, zero risk), and I can
implement Option B plus the health-check fix whenever you want.

### 5.4 Staggered hours for the time-of-day bias

Whatever cap you pick, vary the UTC start: e.g., a week of batches at
02:00, then 06:00, then 10:00, then 14:00, then 18:00 UTC in rotation. With
Option B this becomes automatic (partial day offset per batch_seq). With
Option A, change `ADB_AUTO_START_HOUR` weekly.

---

## 6. Review of the original plan (V3_CollectionStrategy.md) — verdict per pillar

| Plan pillar | Verdict | Evidence |
| ---- | ---- | ---- |
| Stratified tier catalog (30/89/157 = 276) | **Keep**, but reweight slots (§8.2) | Probabilities/weights are recorded exactly as designed; catalog breadth is why the graph is one connected 336-airport component |
| Seeded, reproducible rotation | **Correct — keep** | `random_seed` stored per batch (B0002 seed 294378940 → replayable); weights 1/p check out |
| Per-flight census at chosen airports | **Correct — keep** | 1,888 unique flights from 1,922 rows; both endpoints always in the row → whole edges |
| Budget + reserve + adaptive minimum | **Keep, add daily cap** | Watchdog stopped B0002 exactly at budget — the mechanism works; it's just uncapped over the month |
| Recent-batch rotation (avoid last 2) | **Keep** | Necessary for breadth; does not corrupt recorded probabilities |
| 4h window | **Keep, vary occasionally** | 4h is a sensible slot size; the problem is only that all slots land in the same UTC band |
| REGIONAL at 2 slots per batch | **Rework** (§8.2) | 29 rows across the whole run — the espoused "learn the long tail" isn't happening through per-batch REGIONAL slots |
| Time-of-day / season spread | **Admit it's currently failing** | Hour distribution is two lumps (08–18 + 07–11 UTC); dead hours 00, 18–19, 22–23 |

**Verdict on the core design:** *not wrong.* It is materially better than
"grab whatever convenient" (which is what most of the research papers did —
their top-N-at-one-airport setups are far narrower than this). The weaknesses
are **operational tuning** (daily cap, tier-mix slot weights, start-hour
spread, hour-of-day lumpiness), not design errors. The one structural gap set
by the research — **stable node universe for GNN continuity** — needs the
fixed-core addition in §8.1.

---

## 7. Point-by-point vs the research critique

| Claim from the critique | Verdict for THIS system | Why |
| ---- | ---- | ---- |
| "Rotating 280 random airports daily breaks spatio-temporal continuity" | **Partly true → fixed-core addition** | The union graph is fully connected (§3.1), but same-node day-over-day continuity isn't guaranteed. A small always-on core fixes it cheaply. |
| "Adjacency matrix becomes sparse / fractured" | **False as measured** | 1 component, 336 nodes, 763 edges, 70% bidirectional — because flights arrive as complete edges. |
| "XGBoost can't learn high-cardinality airport encodings from rotation" | **Partially true; fix = stable core + longer steady states** | Target-encode with smoothing/shrinkage and the recorded weights; a permanent top-2~3 hub core removes the worst case. |
| "Lag features (inbound→outbound) need preceding airport data" | **True but partial** | We have the flight itself plus tail rotations (91% re-capture rate). Missing piece: sustained same-airport history over days. Fixed core + wider windows help; 81% tail fill is the real limiter. |
| "Pareto: equal sampling dilutes with dead nodes" | **True — already somewhat handled, needs reweight** | Our REGIONAL tier IS the dead-node dilution (29 rows). Rebalance slots toward MID (§8.2). |
| "Fixed stratified core = top 300–500 airports" | **Adopt scaled to budget** | A permanent core of *all* 300 would blow the budget in a day. The affordable version: a core of the ~2–5 highest-yield hubs/mids that the sample already dominates (WSSS, OMAA), with rotation for the rest. |
| "Edge-complete sampling: sample connected routes/sub-networks" | **Already satisfied by the API's delivery model** | Subscribing an airport captures both directions of every route through it → sub-networks, not isolated nodes. |

The critique is a **standard, mostly-correct generic warning** that assumes
independent random airports. The one thing its advice changes for us is
**node stability** (fixed core) and **slot weighting** — both cheap.

---

## 8. Recommended next phase (once credits are refilled)

### 8.1 Add a small fixed core (temporal continuity, nearly free)

Make a tiny set of high-yield airports **always subscribed in every batch**:

- Add an env var `ADB_CORE_AIRPORTS` (e.g. `"WSSS,OMAA"`), appended to every
  batch's airport list regardless of shuffle. They stay live across days →
  day-over-day node + edge continuity for the two most-connected nodes, which
  the GNN's message passing most needs.
- Cost: WSSS + OMAA are already ~95% of B0002's spend (~1,800 credits), so
  making them permanent changes cost almost nothing while guaranteeing the
  continuity the research demands.
- The remaining ~500 credits/batch rotate breadth across the catalog
  (MID, sometimes a HUB swap, one REGIONAL for frame-representativeness).

### 8.2 Rebalance the tier mix from REGIONAL → MID

- Observed: REGIONAL slots yield ~0; MID yields heavily (OMAA 508, HECA 87).
- **Recommended default: `ADB_TIER_MIX = {"HUB":1,"MID":3,"REGIONAL":1}`**
  (5 slots, keeps the frame honest with 1 REGIONAL, moves 1 slot where volume
  + connectivity actually lives).
- Even better per-batch: `{"HUB":2,"MID":3,"REGIONAL":0}` if you accept that
  regional spokes are covered through hub/mid edge capture (they are — WSSS's
  edges already include WIII/WMKK-style spokes). Keep REGIONAL airports *in the
  catalog/weights* either way — this only changes how many slots per batch
  they consume.
- This keeps the probability-sampling bookkeeping intact (weights still
  recorded) while concentrating spend where delay data exists.

### 8.3 Daily credit cap (§5.3) — the 30-day insurance policy

Non-negotiable: without a cap the 60k refill runs out in days. Env Option A
now; code Option B when convenient.

### 8.4 Stagger start hours + occasional longer windows

- Keep the interactive/auto start hours varying (02/06/10/14/18 UTC rotation)
  and occasionally run a 6–8h window. Watch `byDepartureHour` in diagnostics.

### 8.5 Fix the health check so "mixture" means subscriptions, not rows

Change `scripts/check_collection_health.ts:69–76` to query
`clean.adb_collection_subs` (per-tier subscription counts for the active
batch) for the PASS/FAIL, and keep the `flight_data_pre_post` tier row counts
as informational output. Otherwise REGIONAL (which emits ~1 row) will keep
falsely failing a healthy, correctly-subscribed batch.

### 8.6 Decide the legacy-row policy (adhoc KJFK, 51%)

Options: (a) treat as feature/volume data only and train weighted models on
the 2,117 stamped rows; (b) assign a coarse synthetic weight and include; (c)
drop. Recommend (a) for the first model, and add a `is_stamped` guard column
to the training prep so it's explicit.

### 8.7 Watch the delay-target construction (censoring)

Only 44% of rows have a realized departure delay. Plan the model as predicting
delay *given the latest pre-departure snapshot*, using `revised−scheduled`
(83% fill) as the primary or auxiliary target, and treat runway-time absence as
censoring, not class imbalance.

---

## 9. Minor / data-management notes

- **`credits_remaining` is a snapshot** — use it only for burn-rate checks
  (as in §5.1), never for per-row cost.
- **Balance snapshots show 3 refills mid-window** (Aug 10 20:07, Aug 11 08:20,
  11:05). Keep `balance_last_refilled_utc` around downstream for spend audits.
- **`arr_revised − arr_scheduled` outliers (±18h)** are almost certainly
  cancellations / re-routes — capture them explicitly as a `diverted/canceled`
  label if AeroDataBox statuses allow it (status 11/12) rather than trimming.
- **81% tail fill / 83% callsign fill** — fixable at extraction time for the
  ad-hoc and future data? No — the API simply omits them. Handle as an
  "unknown" category in features.
- **Current state (as of the logs):** balance 862, no active batch, auto-start
  blocked (`862 < 1000+300`), data gap growing past 10h. This is *expected*
  behaviour while awaiting the refill — collection will resume the moment a
  refill satisfies the guard, and the new settings should be in place BEFORE
  the refill so the 60k actually lasts.

---

## 10. Open decisions (my asks)

1. **Confirm the credit plan:** Option A (env-only 1 batch/day) now, and/or
   should I implement Option B (daily budget + drifting start hours)?
2. **Tier mix:** switch to `{HUB:1,MID:3,REGIONAL:1}`, `{HUB:2,MID:3,REGIONAL:0}`,
   or keep `{1,2,2}` and accept hub-heavy data?
3. **Fixed core:** enable `ADB_CORE_AIRPORTS` (suggest `WSSS,OMAA`)? Add
   `KLAX` for a third region (raise daily budget accordingly)?
4. **Health check:** apply the subscriptions-based tier-mixture fix (§8.5)?
5. **Legacy 2,199 ad-hoc KJFK rows:** keep-as-features, synthetic-weight, or
   drop for the first weighted model (recommend keep-as-features)?
6. **Core airport choice for the permanent subscription** matters for GNN
   node stability — should the core be cross-regional (NA + EU + ASIA) rather
   than 2 airports in one region? (e.g. `KLAX,EGLL,WSSS` — but that raises
   daily cost, so adjust the daily budget to match ~2,400/day ≈ 60k/25d; pick
   the trade-off together.)

Everything below this line in the terminal is just my summary — the detail is
here.