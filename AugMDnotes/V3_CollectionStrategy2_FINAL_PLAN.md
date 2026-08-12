# V3.9 — FINALIZED COLLECTION PLAN
### Single source of truth for execution (finalizes `V3_CollectionStrategy2.md` §1–§46)

Status: **LOCKED — architecture GO, collection WAIT until gates 1–5 pass.**
Built from reviews 1–11 (ChatGPT1–4, CGTAnalaysis5–9, -9 follow-up, 11). This
is a **V3.9-f execution amendment, deliberately NOT V3.10**. After gates pass
we stop revising and let the run produce the evidence.

---

## 1. How to read this plan

- Everything below is the **final, integrated decision** — earlier conflicting
  language in `V3_CollectionStrategy2.md` is superseded on any point of conflict.
- Version lineage is cumulative, not a menu: V3.1→V3.9 each revised the *same*
  document; later versions supersede earlier ones. This file is the frozen
  end-state of that lineage.
- `R#` = code delta, `S#` = schema/pipeline delta, `G#` = GO gate. All three
  must complete before the 60k starts.
- Dates/times are UTC unless noted.

---

## 2. Locked architecture (end-to-end)

```text
AeroDataBox subscription (maxDeliveryRetries = 0)
        │  webhook POST (1 credit per flight item, deducted on SEND)
        ▼
raw immutable notification envelope        (S4 — raw payload + hash, never overwritten)
        │
        ▼
flight_events (per notification → flight-item event log)      ──► current flight_state
        │
        ├────────────────────────────────────────────►  population census (FIDS/schedule, S1)
        ▼
flight_population  (which flights existed at each cutoff)
        │
        ▼
cutoff-safe flight_snapshots  (T-24 / T-6 / T-90; features ≤ cutoff; EXISTENCE = population,
        │                       post-cutoff events only supply the LABEL)
        ▼
flight_outcomes  (actual outcome; null = censored)
        │
        ▼
ML dataset + evaluation  (Engines A–E + collection-mechanism ablation)
```

**Three promises the whole plan enforces:**

1. **Never destructively overwrite research provenance** (raw event log + current
   state both kept; dedup is an operational convenience, never the only dataset).
2. **No future information in dataset construction or features**
   (`feature_timestamp ≤ prediction_cutoff`; snapshot existence is population-
   defined, not event-defined).
3. **No foreign subscription can bill during the experiment** (exclusive set;
   balance delta = batch cost only because of R1).

---

## 3. Budget & accounting model

### 3.1 API units vs Flight-Alert credits

- **60,000 = the monthly RapidAPI API-unit entitlement** (Ultra plan per current
  RapidAPI listing). Flight Alert credits are created by calling the **refill
  endpoint: API units convert 1:1 into Flight Alert credits**.
- We therefore write: **"60,000 API-unit budget → allocate → refill → spend
  credits on notification items."** Never collapse the two into one number.
- Record the **actual** account state at run start (plan, monthly units,
  remaining units, Flight Alert balance, refill amount + timestamp) instead of
  assuming "Ultra = 60k" (R7 / G5).

### 3.2 Cost model (exact wording)

> **1 Flight Alert credit = 1 flight item in a notification delivery attempt.
> Credits are deducted when the alert is SENT, not when our endpoint receives
> it. Each retry costs another credit. `maxDeliveryRetries = 0` for the run.**

### 3.3 Three reserve buckets (named explicitly)

```text
Experimental allocation budget   = 58,900 credits  (1,900 × 31; the ONLY spendable experimental quota)
Emergency application reserve    = 1,000 credits   (ADB_RESERVE_CREDITS; controller refuses below unless overridden)
Unallocated mathematical remainder = 100 credits   (60,000 − 58,900 − 1,000; NOT usable budget)
```

### 3.4 Three cap concepts (never conflated)

1. **Estimated reservation (before):** `daily_budget_remaining = 1900 −
   credits_actually_consumed_today` (from the `adb_ingest_events` ledger).
   Batch budget is capped at this. It is an *estimate*, not spend.
2. **Actual spend (during):** watchdog stops on observed spend.
   `SOFT_STOP = 1900 − ADB_DAILY_SOFT_STOP_MARGIN` (default 50; margin made
   empirical from the canary's worst un-settled burst). `HARD_CAP = 1900`;
   any overshoot flags the batch `reconciliation_status='MISMATCH'`.
3. **Post-batch reconciliation (after):** `C_external = balance_before −
   balance_after` vs `C_internal = Σ notification_items`; |Δ| ≤ tolerance → PASS,
   else MISMATCH. (Only meaningful while the subscription set is exclusive, R1.)

### 3.5 Enforced by code (already implemented: V3.9 / §34-Q)

- `adb_collection_batches` ledger: `balance_before/after`, `credits_consumed_actual`,
  `credits_consumed_internal`, `notification_items_received`, rows
  stored/inserted/updated, `delivery_failures`, `reconciliation_status`.
- `adb_ingest_events`: one immutable row per webhook delivery
  (subscription_id, batch_id, received_at, items, stored/inserted/updated/
  skipped, credits_remaining, delivery_failure, error).
- Daily cap math uses **notification items from the ledger**, not row counts.

---

## 4. Sampling design (LOCKED)

| Element | Decision |
| ---- | ---- |
| Universe / frame | AeroDataBox supported universe, measured via `/collection/coverage` (free); frame = traffic tier × macro-region strata; catalog ⊆ universe tracked (`universeCount`, `catalogInUniverse`) |
| Tier mix | `{HUB: 1, MID: 2, REGIONAL: 1}` per batch (1:2:1) |
| Default window | **1 × 4 h continuous per day** |
| UTC schedule | Rotating start from `time_window_schedule_seed` over {00, 04, 08, 12, 16, 20}; **HARD**: each UTC slot once per 6-day block; **SOFT**: minimize weekday×UTC imbalance among valid permutations. 6-day-once is a *design choice*, never claimed as proof of unbiasedness |
| Calendar | **26 × 4h + 3 × 2×2h + 2 × 6h = 31 days** (83.9% / 9.7% / 6.5%); window shapes are a **pilot experiment**, not proof of superiority |
| Crossover (R6) | Template frozen BEFORE treatment: freeze candidate pool → airport set → UTC slot + day/block → crossover block → randomize `window_shape` → execute. **Treatment must not depend on any post-freeze observation** |
| Anchor pool | 5 airports; provisional KLAX/EGLL/WSSS/SBGR/OMDB, **finalized only after probing** (see 4.1) |
| Anchor score | 40% exogenous traffic + 20% geographic/network diversity + 20% carrier/international diversity + 20% standardized observed yield; **station/API capacity is a feasibility GATE, not a score component** |
| Yield metric | `yield_score = f(unique_flights/credit, tail_chain_links/credit, stability)`, each standardized to [0,1], **formula frozen in code pre-probe** |
| REGIONAL allocation | Efficiency-oriented adaptive allocation with normalized draw; `airport_layer_design_probability` = conditional design probability at the draw, **never** a flight-level inclusion probability; no `1/p` auto-weight |
| Long-tail | Named **"coverage floor"** (efficiency allocation, not representation) |
| Streaming terms | Collection = "sampling-aware collection from the AeroDataBox-supported universe" (not "probability-aware sample") |

### 4.1 Two-stage anchor probe (capped budget)

1. **Stage 1:** ~10–12 shortlisted candidates across regions, 2 h standardized
   probes at matched time-class/weekday-class (probes scheduled so they never
   cross in real time); record unique-flights/credit, chain-links/credit,
   stability; WSSS (~331 rows/h) & OMAA (~127 rows/h) re-probed same way as
   calibration.
2. **Stage 2:** top ~5–6 candidates get a longer confirmation probe.
3. Final anchor pool of 5; station/API capacity applied as a **gate** before
   scoring. **Total probe spend is hard-capped** within the 1,900/day budget —
   never an uncontrolled fraction of the 60k.

---

## 5. NEW — flight-population / census layer (S1, MUST before 60k)

**Problem (CGTAnalaysis11):** the webhook is an event stream, not a census.
"These flights emitted an update we captured" ≠ "these are all the flights that
existed at the cutoff." Observability selects on airport size, activity,
disruption severity, tracking quality, airline, region, ADS-B coverage — i.e.
the very things we predict.

**Fix — three layers, quantified missingness:**

| Layer | Contents | Source |
| ---- | ---- | ---- |
| `flight_population` | one row per (flight, cutoff): "existed in the prediction population at cutoff T" | AeroDataBox FIDS/schedule (≈2 API units per airport-window), for every collected airport+window |
| `flight_snapshots` | feature state at T−24 / T−6 / T−90, features ≤ cutoff | built for **every population flight**, not only event-captured ones; missing features marked missing, not dropped |
| `flight_outcomes` | actual departure/delay/cancellation | filled from later webhook events; null = still-in-flight/censored |

**Corrected snapshot rule (MUST):** a snapshot exists iff the flight was in the
population at cutoff ∧ necessary features available ≤ cutoff ∧ eligible for the
horizon. **A post-cutoff webhook event is required for the LABEL only — it
never decides whether the snapshot exists.** (This replaces the old §11 wording
"snapshot only if we hold an event after cutoff", which was population-definition
leakage.)

**Coverage metrics (G5, and monthly):** for every horizon, break down by
airport tier / region / time-of-day / airline / tail-known:
`population → captured → snapshot-eligible → snapshots → outcomes observed`
with missingness at each stage.

**Population claims rule:** until the census layer exists, all results are
described as "under the collection regime", never population-representative.

---

## 6. Data pipeline & provenance (S2–S4, MUST)

| # | Delta | Rule |
| ---- | ---- | ---- |
| S2 | Raw events immutable | `adb_ingest_events` never deleted/edited; every delivery retains subscription_id, batch_id, received_at, provider notification timestamp (if any), HTTP metadata, **raw payload + SHA-256**, parser version, schema version, number of items, upsert outcome |
| S3 | Event log before current state | `flight_events` (one row per flight-item observation) feeds `flight_state` (latest via dedup) — **the dedup table is an operational convenience, never the only research dataset** |
| S4 | Provenance invariant | "Never destructively overwrite research provenance." Rebuilding state from the raw log must be possible at any time |

---

## 7. Model ladder, features, engines

### 7.1 Ladder (each rung measured, not assumed)

```text
Persistence → Calendar → XGBoost → +Weather → +Network → +Dynamic graph
            → +Aircraft rotation → +Disruption → Uncertainty/calibration
```

The question every rung answers: **what does this rung add beyond the previous
one?** GNN is a hypothesis to test, not a default.

### 7.2 Feature discipline

- `feature_timestamp ≤ prediction_cutoff`, always.
- Tail/rotation features: previous leg counts only if landed before cutoff.
- Missingness handled as **explicit features** (`tail_known`, `days_since_last_obs`,
  capture flags) — never silently dropped.
- **No `1/p` auto-weight.**

### 7.3 Engines (evaluation family)

| Engine | Question | Blocking |
| ---- | ---- | ---- |
| **A** | Future/deployment-representative **under the collection regime** (renamed) | chronological, day/event-blocked; tails reusable |
| **B** | Unseen airport | airport-level blocking |
| **C** | Unseen region | region blocking |
| **D** | Unseen tail/type (cold-start) | tail never in training |
| **E** | Disruption | regime-tagged events |
| **P** | Population audit | from FIDS census, vs Engine A deltas |

Final Engine-A test materialized once, hashed/versioned, read-only (§32/§44-H).

### 7.4 Collection-mechanism ablation (NEW, month-1)

Same model trained as:
- **A — all features**
- **B — minus** coverage-age, notification count, capture flags, observation
  density, sampling strategy, airport-subscription metadata
- **C — minus** airport identity
- **D — minus** graph connectivity

Answer: **is the model learning aviation operations, or how we bought the data?**
Also test `with/without` the coverage-age/missingness variables (if removing
them collapses performance, that's a finding).

### 7.5 Graph rules

- **Missing edge ≠ zero edge.** The graph is "discoverable through the sampled
  network"; `known-absent` (observed, no edge) and `unknown` (unobserved) are
  distinct masks.
- Warn-and-test: node observation density ≠ importance; add degree/density
  features and an ablation so the GNN cannot learn "observed a lot ⇒ important".

---

## 8. Window experiment (pilot framing)

- 26 × 4h / 3 × 2×2h / 2 × 6h over 31 days. **This is pilot evidence**, not a
  powered comparison of window shapes. Question it answers: *"is there signal +
  operational feasibility to justify a larger experiment?"* It cannot answer
  "4h is statistically better than 2×2h."
- Month-2 (after pilot) is the adequately-powered controlled study. No theoretical
  window decisions — measure it.

---

## 9. Weather (LOCKED)

- METAR/TAF → `issue_time` / `observation_time` ≤ cutoff; a TAF issued at T−2 is
  never used for a T−24 prediction.
- AviationWeather.gov Data API = operational, **≤ previous 15 days** + cache
  files; separate verified archive sources for historical depth. No change.

---

## 10. The credit canary (R1 + R3 + R5 — gate 3)

One tiny controlled live batch. Prints the full audit chain and PASS/FAIL:

1. **Exclusivity (R1):** list subs; delete every non-experimental **active**
   subscription; verify no foreign sub **capable of delivery** remains
   (inactive/historical records don't bill → not contamination).
2. `balance_before` + timestamp (include in audit chain).
3. Subscribe to one busy airport, `maxDeliveryRetries = 0`.
4. Wait; collect. Delete subscription.
5. **Settle:** sleep a documented window, then read `B_after`, then `B_after_2`;
   require **`B_after == B_after_2`** (balance stable). `B_stable = B_after`.
6. `C_external = B_before − B_stable`.
7. `C_internal = Σ notification_items(received)` for the subscription, from the
   immutable ledger.
8. Composition: notifications (POST count), **items/notification**, **max burst**,
   stored/inserted/updated/skipped, delivery_failures.
9. **PASS iff** `|C_external − C_internal| ≤ tol` (default 3) **and** failures = 0
   **and** balance stable **and** no foreign billable sub.
10. Soft-stop margin tuned from this canary's measured burst (R2).

---

## 11. Webhook reliability & the daily cap (R2 — gate 4)

- `maxDeliveryRetries = 0`; delivery failure → **PAUSE** the run, stop the batch
  (`stop_reason='delivery_failure'`), **flag** affected rows/observations, log
  "reconcile before resume". Never silently resume.
- `SOFT_STOP = 1900 − margin` stops the active batch when today's ledger spend
  reaches it (margin default 50, empirical). `HARD_CAP = 1900`.
- Orphan cleanup enforces exclusivity at every start.
- Second-start protection (one auto-started window/day) stays.

---

## 12. Manifest & versioning (R7)

Before the 60k: record to `adb_collection_meta` (key `manifest`) and print in
`npm run health` / diagnostics:

```text
frame = v1.x            scheduler = seed_<time_window_schedule_seed>
anchor_score = v1       anchor_pool = v1 (post-probe)
catalog = <version>     feature_builder = git sha
snapshot_builder = git sha   engine_a_test = <sha-256 of materialized test>
account_plan = <actual> monthly_units = <actual> refill_amount/timestamp = <actual>
```

---

## 13. Code to-do — final list (R1–R7, S1 fine-grained)

| # | Delta | Where |
| ---- | ---- | ---- |
| R1 | Subscription-set exclusivity (orphan-cleanup at batch start; canary asserts no foreign *billable* sub; run policy deletes non-experimental active subs) | controller `startBatchInner`, `scripts/credit_canary.ts` |
| R2 | SOFT_STOP margin (watchdog stops active batch at `1900 − margin`; MISMATCH on overshoot) | controller config + watchdog |
| R3 | Canary: composition, settlement (`B_after==B_after_2`), audit chain, exclusivity | `scripts/credit_canary.ts` |
| R4 | Cost-model wording (API-unit vs credit; "deducted on SEND") | doc §13 + controller header |
| R5 | Delivery-failure flag + reconcile-before-resume | migration 0018, watchdog |
| R6 | Crossover template freeze (treatment independent of post-freeze info) | scheduler/`startBatchInner`, §31 |
| R7 | Versioned manifest incl. real account plan/refill | `adb_collection_meta`, diagnostics |
| S1 | `flight_population` census layer + FIDS seed + coverage metrics | migration 0019, new ETL, diagnostics |
| S2 | Raw immutable envelope (payload + hash + versions + outcome) | migration 0019, webhook store |
| S3 | Event-log-before-state invariant | ETL ordering |
| S4 | Provenance invariant | ETL |

Status: R1–R7 are **planned** (doc §45.5) incl. §34-Q accounting already
implemented (ledger + canary v1). S1–S4 are **new from CGTAnalaysis11**; S1 is
the one MUST that changes the pipeline shape (adds a layer, does not redesign).

---

## 14. The GO gates (ALL five must pass — no 60k before G5)

| Gate | Action | Pass criterion |
| ---- | ---- | ---- |
| **G1 — Coverage** | `npm run coverage` | `universeCount`, `catalogInUniverse` recorded, sane (universe ≥ catalog) |
| **G2 — Anchor probe** | two-stage standardized probe, budget-capped | scores from the frozen formula; capacity applied as gate; pool NOT locked before measurement |
| **G3 — Credit canary** | R1+R3 live canary | `C_external = C_internal` after balance-stable; failures = 0; exclusive billable set; composition reported |
| **G4 — Webhook + cap** | R2/R5 | failures = 0, retries = 0, SOFT_STOP stops at 1,850/1,900, second-start guard works |
| **G5 — Population/census validation** | S1 FIDS vs webhook for a sample of airport-windows | census ≥ captured; per-stage missingness quantified and sane (capture rate, snapshot rate, outcome rate); Engine-A naming stays regime-qualified |

---

## 15. Execution sequence & month-1 deliverables

```text
1. R1–R7 implementation           6. G4  webhook + cap
2. S1–S4 population + raw layers  7. G5  population/census validation
3. G1  coverage                   8. FREEZE manifest/seeds/frame/code
4. G2  anchor probe (2-stage)     9. 31-day run (1,900/day)
5. G3  credit canary              10. month-1 report
```

**Month-1 deliverables** (all labeled **"early operational pilot"**, never
"validated production model"): validated collection pipeline; validated snapshot
pipeline; leakage-safe **XGBoost that beats the persistence gate**; information-
per-credit curves (using `C_actual`, not rows: `new/useful information / C_actual`);
Engine B–E light results; **collection-mechanism ablation**; census coverage
metrics. GNN is phase 2.

---

## 16. Explicit NOT-do list

- **No V3.10/V3.11/V3.12** theoretical reviews (CGTAnalaysis9/11 both say stop).
- No GNN-first; no `1/p` weighting yet (measure the denominator first, then
  decide if a formal estimator is needed).
- No claim: "6-day slot-once ⇒ unbiased"; "future-representative ⇒ population-
  representative"; "4h statistically beats 2×2h" from pilot data; "31 days ⇒
  seasonality".
- No foreign active subscription during the run (R1).
- No raw-event overwrites (S2–S4).
- Month 1 does not switch on: event-sampling regimes at scale, IPW, advanced
  conformal/GNNs, long-horizon seasonal eval, intervention optimization.

---

## 17. Status

**Architecture: GO. Sampling: GO (experimental allocation). Research/eval: GO.
Leakage: GO + the census fix. Credit model: GO after canary. 60k: WAIT on
G1–G5.** The remaining uncertainty — supported-universe size, effective window
regime, staleness, XGBoost vs persistence, marginal value of a credit, and
collection-vs-aviation confounds — is exactly what this run is designed to
measure. We implement, canary, validate the denominator, then collect.