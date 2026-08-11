# V3.2 — Collection Strategy v2 (response to the ChatGPT review)

> Written 2026-08-11. This is the **decision document**: what the ChatGPT
> analysis
> (`AugMDnotes/ChatGptAnalysis1.md`) got right, what it got wrong or overstated,
> and the resulting **V3.2 collection strategy** we should run for the next
> 60,000 credits — as standard aviation-ML practice, budget-feasible.
>
> Sources: our own measured data (`flight_data_pre_post7.csv`, 4,316 rows;
> B0002 cost ≈ 2,037 credits / 3.8 h / 1,922 rows), `Overnight2.md`,
> `V3_CollectionStrategy.md`, the ChatGPT review (1,971 lines), and the
> cited/published flight-delay ML literature (Edge-Based GNN 2026, Aeolus-style
> benchmarks, network-centrality tabular models, GARNN throughput 2022).

---

## 1. Verdict on ChatGPT's analysis — summary

**It is largely correct, high quality, and aligned with standard ML practice.**
Two corrections we must make to it, and one affordability reality it glosses
over. I recommend adopting most of it, with budget-aware scaling.

| ChatGPT claim | Verdict | Action |
| ---- | ---- | ---- |
| "You're sampling ~5 airports/batch, not ~280/day" | **Correct** (a misread of the 276-catalog) | Already our design; restate clearly in docs |
| "Graph is not fractured — 1 component, 763 edges" | **Correct**, matches our measurement | Keep, and keep the "whole-edge" delivery model |
| "Fix spatial+temporal+aircraft-chain together" (Aeolus alignment) | **Correct** | Adopt snapshot/rotation emphasis |
| "1/p ≠ exact Horvitz–Thompson weight; many selection layers" | **Correct — the most important correction** | We overstated it in V3; temper the claim (below) |
| "Recent-batch exclusion changes the real p" | **Correct technically** | Record as conditional / nominal; keep seeds |
| "Define the target population / prediction goal first" | **Correct** | Add explicit problem statement (§5) |
| "XGBoost baseline before GNN; GNN ≠ automatically better" | **Correct** | Adopt the model ladder |
| "Biggest danger = leakage (PRE/POST in one table), split by flight/date" | **Correct and critical** | Adopt snapshot/cutoff design (§10) |
| "Fixed core should be cross-regional, not WSSS+OMAA" | **Direction correct; the stated reason is partly false** | Cross-regional core yes — but OMAA is **Abu Dhabi, not Muscat**, and Singapore–Abu Dhabi are different aviation regions (see §4) |
| "Expand frame from 276 to the AeroDataBox coverage universe" | **Correct direction, unverified size** | Measure with `/collection/coverage` first (§6) |
| "Persistent core 40–50% / rotating 30–40% / event 10–20%" | **Correct principle** | But under 1,900 credits/day that ≈ **1–2 airports**, not 4–6 (see §7) |
| "Don't delete REGIONAL; make selection yield-aware with floors" | **Correct** | Adopt §8 |
| "Time-of-day must rotate like airports do (2D sampling)" | **Correct** | Adopt §8.4 / §9 |

**Bottom line:** evolve, don't rewrite. The engine (probability sampling +
recorded weights + rotation) is sound and matches how research workloads are
licensed under pay-per-row constraints once the claims about weights are
tempered. The changes are: **panel core, wider frame, 2D time sampling,
leakage-safe snapshots, info-per-credit dashboards, XGBoost-first evaluation.**

---

## 2. Fact-check the ChatGPT claims against our data

| ChatGPT statement | Our data | Agreement |
| ---- | ---- | ---- |
| "B0002 observed 4 airports: 1 HUB + 2 MID + 1 REGIONAL" | WSSS 1,325 / OMAA 508 / HECA 87 / KGPT 2 | ✅ exact |
| "336 distinct airports; 763 route pairs; 1 component; 70% bidirectional" | Same numbers from `analyze_overnight2.py` | ✅ exact |
| "1,036 tails; 716 with ≥2 captures; 91%; tail on 81% of rows" | Same | ✅ exact |
| "PRE 1,703 / POST 2,613; dep runway on 1,898" | Same | ✅ exact |
| "20:22 refill … credits 9554→866" | Matches credit trajectory | ✅ |
| "B0002 cost ≈ 2,037" | ✅ | ✅ |
| "OMAA = Muscat" | **OMAA = AUH Abu Dhabi (UAE); Muscat = OOMS** | ❌ factual error |
| "WSSS + OMAA = one broad geographic region" | Singapore (SE Asia) vs Abu Dhabi (Gulf) — different aviation regions, ~6,000 km apart | ⚠️ overstated |
| "A permanent core of 4–6 airports if budget permits" | 4–6 airports at hub yields **exceeds** 1,900 credits/day | ⚠️ not affordable as-is |

None of ChatGPT's factual errors change the *adoption* of its recommendations;
they only mean we can't rely on its *justification* for rejecting WSSS+OMAA.
We prefer a cross-regional core for a different, sound reason: **unseen-airport /
cross-region generalization** (Experiment C in its own §24) — that is the
scientific reason, not "one region."

---

## 3. Where ChatGPT overlaps our own findings (already agreed)

These appeared in `Overnight2.md` and ChatGPT independently converged on them —
treat them as settled:

1. The graph is connected (whole-edge delivery); node **count** is not the
   problem.
2. **Temporal persistence** of the same nodes is the real GNN requirement.
3. Time-of-day lumpiness is a real bias; stagger UTC windows.
4. REGIONAL slots yield ~nothing; hub tail dominates spend.
5. **Daily credit cap ≈ 1,800–1,900** is mandatory (60k/30d).
6. Tail/rotation info is the most valuable rare feature; don't sacrifice it.

---

## 4. The corrections to ChatGPT (to keep us honest)

**4.1 OMAA is not Muscat.** OMAA = Abu Dhabi Zayed Intl (AUH); OOMS = Muscat.
Its rejection of the WSSS+OMAA core leaned on "one broad region" which is
only loosely true. **We still reject WSSS+OMAA** as the permanent core, but for
the generalization reason in §7, not the geography mislabel.

**4.2 "Persistent core ≈ 40–50%" ≈ 1–2 airports in our world.** One hub
(WSSS) = ~1,325 rows/4h ≈ **~1,300 credits** of the 1,922 B0002 spend. So a
"persistent core" of 2–3 hubs consumes nearly the whole daily budget. The
correct translation of "40–50% core" under 1,900 credits/day is roughly
**one high-yield hub (cross-regional rotation every ~1–2 days) or two
moderate-yield mids.** Anything claiming 4–6 permanent hubs is unaffordable;
that's a scale mismatch in ChatGPT's recommendation, not a flaw in its
principle.

**4.3 "Expand to the whole universe" is bounded by budget *and* coverage-age.**
At one batch/day ≈ 5 airport-slots, expanding a 276-frame to ~2,000 would give
most airports a coverage-age of *many months*. That's still fine **if** we (a)
use edge-fan-out for cheap node appearance, (b) record coverage age, (c)
evaluate on unseen airports — but we must be explicit that "frame of record"
and "expensively-subscribed" are different. Keep the frame wide; spend the
budget on persistence + connectivity.

**4.4 Don't treat "~1 row ≈ 1 credit" as information per credit.** We measured
B0002 ≈ 1.0 row/credit only because nearly every notification was a new row;
updates and re-pushes cost credits too. ChatGPT's "information/credit" metric
is right — adopt it as a dashboard (§12).

---

## 5. First, the prediction problem (before any more credits)

ChatGPT is right that the design follows the problem. For Travnr (traveler
disruption product) the problem is:

> **Given everything knowable at time T before scheduled departure (T ∈
> {T-24h, T-6h, T-90min}), predict for each flight:**
> (a) departure delay at runway (minutes, continuous), and
> (b) arrival-side delay / cancellation / severe-disruption indicator.

- Primary target (labels exist in our data): `dep_runway_utc −
  dep_scheduled_utc` (44% of rows have it; the rest are treated as
  right-censored snapshots) and `arr_revised − arr_scheduled` (83% coverage) as
  auxiliary.
- Evaluation: future-time, unseen-airport, cross-region, disruption-period
  splits (ChatGPT §24) — the model must generalize beyond the sampled set.

This fixes the snapshot design (§10) and the frame (§6).

---

## 6. Sampling frame v2: from "276 hard-coded" to "measured universe"

**Step 1 (this week, free):** run the already-built coverage report
`GET /api/v1/collection/coverage` (or its refresh `?force=1`). It calls
AeroDataBox's free covered-airports endpoint for
FlightSchedules / FlightLiveUpdates / AdsbUpdates and reports
`universeCount`, `catalogInUniverse`, `universeNotInCatalog`. We have never
confirmed the true universe size; ChatGPT's "expand" is an assumption until we
measure it.

**Step 2:** build the frame from that universe, not from a static 276 list:

```
allowed universe (AeroDataBox-covered, scheduled, has a feed)
  → require ≥1 observation (drop unusable)
  → stratify on: traffic tier (HUB/LARGE/MID/REGIONAL),
                 continent/region, network degree, intl/domestic,
                 carrier diversity, time zone
  → sampling frame = strata × (airport_selection_probability,
                               time_window_selection_probability)
```

Implement as a **catalog build script** so the frame regenerates when the
coverage report refreshes (12 h cache). Stratifying on continent prevents
ChatGPT's §18 warning ("a regional category that is accidentally one
geography").

---

## 7. The three samples — translated to our 1,900 credits/day

Economic table (measured from B0002, ~4h batch):

| Tier | Typical 4h yield (rows) | ~cost/4h | Notes |
| ---- | ---- | ---- | ---- |
| HUB (e.g., WSSS) | ~800–1,400 | ~900–1,400 | Dominates; one hub ≈ 50–70% of a batch |
| MID (e.g., OMAA) | ~90–500 | ~90–500 | The workhorse slot: volume + connectivity |
| REGIONAL (e.g., KGPT) | 0–30 | ~0–30 | Nearly free, near-zero volume; keep 1 slot for frame |

**Budget split (standard practice, budget-scaled):**

| Bucket | Share | ≈ credits/day | ≈ slots/day | Purpose |
| ---- | ---- | ---- | ---- | ---- |
| **Persistent / high-frequency core** | ~45–55% | ~850–1,050 | 1 hub-equivalent | Temporal node/edge continuity, congestion baseline, aircraft-chain anchoring, coverage-age ≤ 2 days |
| **Rotating coverage** | ~30–40% | ~600–750 | 1–2 MID | New-airport / route / tail discovery, breadth |
| **Long-tail REPRESENTATION** | ~5–10% | ~100–150 | 1 regional (yield-aware) | Frame representativeness; prevents pure convenience sampling |

**Core recommendation (cross-regional, but size-aware):**
a small **core pool** — e.g., `KLAX (NA) · EGLL (EU) · WSSS (ASIA) · SBGR (SA) ·
OMDB (MEA)` — and each day's core slot picks **one** from the pool (no repeats
until all seen). Any single hub appears every ~3–5 days, keeping its
coverage-age ≤ ~5 days, which is the affordable version of "persistent." If we
accept ~1,100/day on core, a **2-airport panel (e.g., KLAX + EGLL)** appears
~every 2.5 days. Perfect 24/7 multi-hub persistence is simply not in the
budget; **coverage-age budgeting** is how industry handles pay-per-row panels.
Record the age; the model gets a `days_since_last_obs` feature.

> Design decision to confirm with you: a **1/day rotating core pool** (3
> regions, age ~3–5 d) vs a **2/day fixed panel** (2 regions, age ~2–3 d).
> Costs are close; the pool covers more ground (better unseen-airport eval),
> the fixed panel has better temporal resolution per node.

---

## 8. Keep REGIONAL, but make selection yield-aware (ChatGPT §19/§20 is right)

Instead of equal slots or deleting REGIONAL:

```
per REGIONAL airport: base_selection_prob = slots/regional_count
  after each observation: if yield≈0 five times → reduce its weight
                          (rotate to another regional), NEVER to zero
  floor: each regional airport still has base_prob/5 (representativeness)
```

i.e., **adaptive probability with a floor** — not "pick the ones that emit
rows" (convenience) and not "equal slots for dead airports" (waste). Keep the
probabilities recorded so the floor/adaptation is auditable. Practical slot
count: **1 REGIONAL slot per day** satisfies the frame without meaningful cost.

---

## 9. Two-dimensional sampling: airport × UTC-time (ChatGPT §15→§37)

Break the airport×time confounding by sampling the **joint**
(airport, time-window) cell:

- Run **2 × 2h windows/day** at staggered UTC hours (e.g., 02:00 and 14:00
  UTC), rather than 1 × 4h at the same hour. Same daily cost; two start times
  instead of one; two chances to hit different congestion regimes.
- The window's UTC hour itself rotates over days (02/06/10/14/18/22) so the
  2D grid fills in.
- Occasionally run one 6h window/week for long flights / cross-midnight
  coverage.

This directly fixes the dead UTC hours (00, 18–19, 22–23) we measured.

---

## 10. Metadata v2 — make the sampling honest (ChatGPT §9/§38)

Extend the per-row stamp (compatible with migration 0012; additive columns):

| Current | Add |
| ---- | ---- |
| `sampling_probability`, `sampling_weight` | `airport_selection_probability`, `time_window_selection_probability`, `joint_selection_probability`, `sampling_strategy` (`core`/`rotating`/`longtail`), `sampling_reason`, `days_since_last_obs` |

**And temper the documentation claim** (moving from V3's "the model can weight
this to recover the population" to ChatGPT's phrasing):

> "Sampling probabilities are recorded to allow sampling-aware training,
> evaluation, sensitivity analysis, and — where the statistical assumptions
> hold — design-based weighting."

This is the one place ChatGPT genuinely corrected us; adopt it verbatim in
V3.2. Document also that rotation-with-exclusion makes recorded p a **nominal**
probability (the conditional design is realizable via the stored seed).

---

## 11. Leakage-safe dataset build (the highest-value ML change)

Current table = mixed PRE/POST snapshots (potentially multiple rows per
flight). Never train on raw rows like that. Build (Phase: modeling time, but
design the collector to support it):

1. **`flight_events`** — one row per webhook event (what we store today, but
   tag it `event`).
2. **`flight_snapshots`** — one row per (flight, horizon): T-24h / T-6h /
   T-90min, with only features with `feature_timestamp ≤ prediction_cutoff`.
   Snapshot a flight **only if we hold an event after `horizon`'s cutoff**;
   otherwise the snapshot doesn't exist (that's the honest censoring rule).
3. **`flight_outcomes`** — `actual_departure`, `departure_delay`,
   `arrival_delay`, `cancelled`, `diverted` (fill from later events; null =
   still-in-flight/censored).

Rules enforced at build time:
- `feature_timestamp ≤ prediction_cutoff` (e.g., previous leg's arrival
  counts only if landed before cutoff — the exact example ChatGPT gave).
- Splits by **flight/date**, **time block**, and **unseen airport** — never
  random rows.
- `tail_known = 1/0` + `days_since_last_obs` handled as explicit features
  (tail missingness is not random).

The collector doesn't have to change much: it already preserves
`received_at`/`last_updated_utc` per row. Snapshot construction is an offline
ETL that enforces the cutoffs.

---

## 12. Diagnostics upgrade: information-per-credit

Extend `/api/v1/collection/diagnostics` (and the health script) with
per-batch and cumulative:

```
credits                          unique flights        unique airports
new airports (first-seen)        new route pairs       new tails
pre-departure snapshots          post-departure        delay events
severe delays (>= 60/120 min)    tail_missing %        route-direction coverage
airport coVERAGE-AGE (min/age)   prev-batch airports
```

And the key ratio per strategy bucket: **new info ÷ credits** (not rows ÷
credits). This is how we tune core vs rotating vs long-tail empirically over
the month — exactly ChatGPT §29.

Also fix the health check (`scripts/check_collection_health.ts`): tier-mixture
PASS/FAIL should read **subscriptions** (`adb_collection_subs`), with row
counts informational — otherwise REGIONAL (~1 row) keeps falsely failing a
correctly-subscribed batch (the earlier B0002 `tier mix incomplete` flag).

---

## 13. Credit plan (unchanged from Overnight2, now binding)

| Setting | Value | Why |
| ---- | ---- | ---- |
| Refill | 60,000 | monthly Ultra quota |
| Daily cap | **1,900** | 60,000/31; never exceeded because uncapped burning ≈ 3–5 days |
| Windows | **2 × 2 h** staggered (02 & 14 UTC, rotating) | same cost, better time coverage, 2 starts/day |
| Batch budget env | `ADB_BATCH_BUDGET=1900` | code daily-cap preferred; else `ADB_AUTO_START_HOUR` narrow window as fallback |
| Core pool | `KLAX,EGLL,WSSS,SBGR,OMDB` (1/day, no-repeat-until-all) | cross-region panel, coverage-age ≤ 5 d |
| Tier mix | `{HUB:1(core), MID:2, REGIONAL:1}` with yield-aware regional | from `{1,2,2}` |

Enrollment budget: 1,900 × 31 ≈ 58,900, leaving ~1,100 buffer for a storm-day
spike or a winter-event over-sample.

---

## 14. 30-day phased rollout (the plan to actually run)

**Week 0 (now, before refill):**
1. Apply health-check subscription fix (§12).
2. Run `/collection/coverage?force=1` on Replit → **record universeCount**.
3. Confirm the daily-cap mechanism (env-only now; code version after).

**Week 1:**
4. Catalog build script: universe → stratified frame (tier × continent ×
   degree) → regenerate `adbAirportCatalog_v3.ts` data (or a DB-backed frame).
5. Add core-pool logic (1 core slot/day from the pool; no-repeat rule).
6. Switch tier mix to `{HUB:1,MID:2,REGIONAL:1}` + yield-aware regional floor.
7. Switch to 2×2h staggered windows; start weekly UTC-hour rotation.

**Weeks 2–4:**
8. Let it run on the cap. Weekly: check diagnostics — coverage-age ≤ 5d for
   core, new-info/credit trends, hour spread.
9. Mid-month: build `flight_snapshots` ETL + leakage-safe evaluation; run
   XGBoost baseline (schedule/route/distance/time features → +rolling airport
   & route delay → +aircraft rotation features → +graph/centrality features),
   then compare a GNN on the same splits.

**Month 2+:** event sampling (disruption spikes) once the baseline exists —
we have the disruption module already; wire it as `sampling_strategy='event'`.

---

## 15. Standard-practice checklist (what "correct" means, final)

- [x] Sampling frame defined from the **measured** supported universe, not an
      assumed list.
- [x] **Stratified** frame (traffic × continent × degree), not uniform.
- [x] **Panel + rotating + long-tail** allocation (persistent cross-region
      core; rotating for breadth; long-tail floor for representativeness).
- [x] **2D sampling** (airport × time-window) to break confounding; rotated
      UTC hours.
- [x] Selection probabilities **recorded** (airport, window, joint, reason);
      nominal-vs-conditional explicitly documented; seeds kept for replay.
- [x] **Leakage-safe** snapshot construction with `feature_timestamp ≤
      cutoff`, censoring honored, flight/date + unseen-airport splits.
- [x] **Aircraft-chain** and tail-missingness features protected/explicit.
- [x] **XGBoost baseline → +rotation → +graph → GNN** ladder; never assume
      GNN wins.
- [x] Daily **credit cap** + info-per-credit diagnostics + coverage-age
      dashboard.
- [x] Seasonal + event coverage planned beyond the 30-day window.

---

## 16. Decisions I need from you (in priority order)

1. **Core model:** 1/day rotating **pool across 5 regions** (recommended;
   coverage-age ≤ 5 d) or 2/day fixed **panel** (KLAX+EGLL, age ≤ 2–3 d)?
2. **Implement now?** (a) health-check subscription fix → easy, do it;
   (b) daily-cap code (`meta`-based) or env-only for now;
   (c) catalog-universe build — needs the coverage measurement first.
3. **Tier mix confirmation:** `{HUB:1, MID:2, REGIONAL:1}` + yield-aware
   regional floor, ok?
4. **Window shape:** 2 × 2h staggered (recommended) vs 1 × 4h?
5. Kick off Week-0 (health fix + coverage measurement) right away?

Everything above is grounded in our measured numbers; numbers that are
estimates (core-pool costs, universeCount) are flagged as “measure next” so we
don't pretend precision we don't have.