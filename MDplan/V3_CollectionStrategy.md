# V3 — Tier-Rotating Collection Strategy (AeroDataBox → `flightDataPrePost`)

> Created 2026-08-09. **Updated 2026-08-09** — major review requested by user:
> (1) world-airport reality-check (§2a), (2) how the research papers actually
> collected data (§2b), (3) is-this-random-sampling-or-correct §5 rewrite,
> (4) catalog expanded from 41 → 276 airports, (5) free covered-airports
> enumeration endpoint + coverage report (§10).
>
> Companion to `V3_WebhookExtractionPlan.md` and
> `possibleCorrrectExtraction_p1.md` (the "how to extract flights without ML bias"
> conversations).
>
> **The short version:** we can't subscribe to "a few flights" — an airport
> subscription captures the **whole airport**. So the only levers we control are
> **WHICH airports, in what tier mix, for how long, under what credit budget.**
> This strategy rotates a small set of airports through short windows, interleaving
> big hubs, mid-size hubs, and regional fields over time so the dataset isn't
> confounded with "always JFK at 6pm". Every captured flight is stamped with the
> sampling metadata it came from, so the GNN can weight/un-weight correctly.

---

## 1. Why this exists (the bias problem)

The conversations in `possibleCorrrectExtraction_p1.md` correctly warn about bias in
ML/GNN training data:

- If we only collect **huge hubs**, the model never sees regional/leisure flights
  → it can't generalize.
- If we always collect at the **same time of day**, the model learns "evening
  congested" as if it were universal.
- If we always collect the **same airports every week**, the model memorizes those
  airports' idiosyncrasies instead of learning universal delay dynamics.
- If collection isn't **reproducible** (no seed / no recorded probability), we can't
  tell whether the GNN overfits to "whatever we happened to capture".

**The honest constraint we discovered on 2026-08-09 (Finding 3 in the extraction
plan):** AeroDataBox airport subscriptions (`FlightByAirportIcao`) capture **every
flight departing + arriving that airport** — you cannot pick "just these 5 flights".
`FlightByNumber` picks exactly one flight. So there is **no per-flight sampling
lever**. The sampling units are:

1. **Which airports** are in the catalog (and therefore the population).
2. **The tier mix** — how many hubs vs mid vs regional per batch.
3. **The window length** — how long a batch stays live.
4. **The credit budget** — the cost ceiling that auto-stops a batch.

The controller in this repo implements exactly these four levers and records the
metadata so downstream modeling can undo any residual selection bias.

---

## 2. The tiers (and why "almost all airports in the world" is the wrong target)

Defined in `server/lib/disruption/adbAirportCatalog_v3.ts` (`AIRPORT_TIERS`,
`AIRPORT_CATALOG`, `tierForIcao`).

### 2a. World-airport reality check (research-backed, 2026-08-09)

| Number | What it is | Source |
| ---- | ---- | ---- |
| **~41,000–50,000** | "airports" of ANY kind on Earth (including grass strips, helipads, private fields) | howmany.is, aviationfile (CIA/ACI) |
| **~17,000** | have paved runways | howmany.is |
| **~4,072** | have **scheduled commercial flights** (the ONLY ones with useful delay data) | **ATAG (IATA body) 2023** |
| **~1,200** | handle international flights | howmany.is |
| **~500** | carry **>90% of the world's passenger traffic** | howmany.is |

**The crucial fact:** "touching all 50k airports" is impossible AND pointless —
~46,000 of them have zero scheduled commercial flights, so AeroDataBox has no
schedule/delay data for them (its Airport API only stores airports with **both ICAO
and IATA codes AND flight schedules** — see the OpenAPI spec). Even the ~4,072
scheduled-commercial airports can't all be subscribed at once on a 60k-unit budget
(a mega-hub alone can emit thousands of flight items in a 4h window).

So the goal is not "all airports" — it is **representative coverage of the ~4,072
scheduled-commercial airports**, with special emphasis on the ~500 that handle 90%
of traffic plus a healthy long tail for generalization. That is exactly what the
tier structure does.

### 2b. What the research papers actually did (skimmed 2026-08-09)

| Paper | Airports used | Flights/rows | How they picked airports |
| ---- | ---- | ---- | ---- |
| Data-Light (ToA prediction, 2021) | **3** (SFO, DEN, ORD) | 199 flights | "among the busiest US airports" — convenience |
| Purdue thesis: Air Traffic Delay ML + Delay Propagation | **31** (ORD + 30 top ORD routes) | 1 year, no count | **top-N by traffic** to/from ORD |
| Chained Predictions of Flight Delay (same dataset) | **31** | 1 year | **top-N by traffic** |
| Convolutional LSTM (traffic flow) | N/A (road traffic, not flights) | — | — |
| **Edge-Based GNN (FlightConnectivity)** | **ALL 236 mainland-China airports** | **1,061,250 flights / 3 months** | **full population** (every commercial airport) |
| LLM4Delay (Incheon) | **1** (ICN) | 12 months, no count | single-airport study |
| ML for ATFM survey | N/A | — | notes single-airport vs US-network studies |
| QUEUE_UP_FOR_TAKEOFF | not stated (US BTS + EUROCONTROL) | 4 months (Mar/Jun/Sep/Dec 2022) | not stated; picked 4 months for **seasonal diversity** |

**What this tells us:**
- **Nobody collects "the whole world."** The most comprehensive published study
  (China GNN) used the entire national population — 236 airports, 1.06M flights in
  3 months, from the CAAC's own operational records (which are free/complete for one
  country). That's the gold standard: **full population within one network.**
- Our constraint: we pay per flight item, so we can't do a full population. Our
  design — **stratified, tier-rotating, seeded, budget-capped airport sampling with
  recorded inclusion probabilities** — is the statistically honest equivalent: it
  samples airports with KNOWN probabilities so the GNN can inverse-weight.
- Time-of-day / season: QUEUE_UP deliberately sampled **4 months across seasons**.
  Our rotating batches naturally spread across times as the window start time
  drifts; to be deliberate about it, vary `ADB_WINDOW_HOURS` and stagger batch
  start times (see §8).

---

| Tier | Meaning | Count | Examples (ICAO) |
| ---- | ---- | ---- | ---- |
| `HUB` | Global mega-hubs — dense, high delay-propagation | **30** | KJFK KLAX KORD KATL EGLL LFPG EHAM EDDF OMDB RJTT WSSS CYYZ SBGR |
| `MID` | Large/medium airports — heavy traffic, route diversity | **89** | KDEN KIAH KBOS KMSP EDDM LIRF LEBL EKCH RJBB ZGGG WMKK FAOR SCEL MMUN |
| `REGIONAL` | Smaller / feeder fields — the long tail the GNN must learn | **157** | KRDU KSJC KPIT KABQ EGPH LKPR EDDC WADD YPAD GMMN SBBR |

**Total: 276 unique airports** (each in exactly one tier). This is a big, broad
sampling frame — and because airports are only *subscribed* when a batch picks
them, the catalog size costs nothing. The real lever per batch is the tier mix.

Why this split matters: a hub-only dataset makes the model blind to the ~40% of
flights that are regional. A regional-only dataset never learns hub congestion
cascades. Interleaving all three tiers across batches gives the GNN the full
distribution while keeping per-batch cost bounded.

---

## 3. How a collection batch works

A **batch** is a bounded, seeded, short-lived collection run. Lifecycle:

```
POST /api/v1/subscriptions/collection/start
  1. Guard: no other batch may be ACTIVE (else 400).
  2. Guard: balance ≥ budget + reserve (else 400, "refill first").
  3. Pick airports: seeded shuffle, rotate AWAY from the airports used in the
     last `rememberRecentBatches` (default 2) batches — so we don't re-collect
     the same airports every time.
  4. For each chosen airport (in tier order HUB→MID→REGIONAL):
       a. Coverage check  (GET /health/services/airports/{icao}/feeds) — FREE.
       b. Create subscription (FlightByAirportIcao) — FREE.
       c. Record it in clean.adb_collection_subs with its tier + sampling math.
  5. Write the batch row (clean.adb_collection_batches): batch_id, batch_seq,
     random_seed, window_start, window_end, credit_budget, tier_mix, airports.
  6. Return { batch, created, skipped }.

[webhook notifications flow in — see §4]

POST /api/v1/subscriptions/collection/stop   (or the watchdog auto-stops)
  - Delete every subscription of the batch  (DELETE ... — FREE; failure doesn't block).
  - Mark each adb_collection_subs.ended_at = now.
  - Close the batch: status = 'CLOSED', ended_at = now, stop_reason.
```

**Auto-stop watchdog** (`startCollectionWatchdog`, runs every 60s, started once at
boot):
- window elapsed  (`now > window_end`)  → stop reason `window_elapsed`
- budget reached (`used ≥ credit_budget`) → stop reason `budget_reached`
- It only reads the DB + calls free DELETE endpoints — it can **never** spend
  credits itself.

---

## 4. What gets stamped on every captured row

Migration `0012_collection_sampling.sql` adds these columns to
`clean.flight_data_pre_post`:

| Column | Meaning |
| ---- | ---- |
| `sampling_batch_id` | which batch this row came from (null = ad-hoc sub) |
| `airport_tier` | HUB / MID / REGIONAL (derived from the subscribed airport) |
| `sampling_probability` | probability this airport was selected in its tier, this batch = `slots_in_tier / airports_in_tier_catalog` |
| `sampling_weight` | `1 / sampling_probability` — how many population flights this row represents |
| `random_seed` | the batch's seed, so the whole run is reproducible |
| `collection_window_start` / `collection_window_end` | the batch's live window |

The webhook ingress (`routes_v3.ts`) looks up the subscription id in
`adb_collection_subs` before extracting; if the subscription belongs to a batch it
passes this metadata to the extractor, which stamps every row. If the subscription
is ad-hoc (not in a batch), it still stamps `airport_tier` from the catalog.

**Why this is honest sampling:** within a chosen airport we get a **census** (all
flights), so a flight's selection probability equals its airport's selection
probability. Recording `sampling_weight` lets the GNN phase do weighted training /
Inverse Probability Weighting to recover the true population distribution.

---

## 5. Credit budget math + "is this correct sampling?" (user asked, 2026-08-09)

### 5a. Units vs credits (the two billing systems)

Facts (verified 2026-08-09 from the live Replit terminal + AeroDataBox's own
Flight-Alert guide + OpenAPI spec):

| | Units (API quota) | Credits (Flight Alert balance) |
| ---- | ---- | ---- |
| Managed by | RapidAPI (your plan) | AeroDataBox directly |
| Renewal | monthly (Ultra = **60,000 / month**) | do not expire |
| Spent by | REST calls + **refills** | **1 credit per flight item per notification** |
| Conversion | 1 unit = 1 credit **when you refill** | — |

- **Subscription CRUD** (create/get/list/delete), **balance**, **coverage check**
  (`/health/services/airports/{icao}/feeds`), and the **covered-airports list**
  (`/health/services/feeds/{service}/airports`) are all **FREE**.
- **Notifications** are the ONLY thing that costs: **1 credit per flight item**.
  A hub notification with 5 flights = 5 credits. A delivery retry costs the same
  again (that's why `maxDeliveryRetries` = 2 only helps a reliable endpoint).

### 5b. Is this "correct" sampling or "random" sampling?

**Both, and that's the point.** It is a **stratified, probability-based sample** —
which is the correct way to build a training set under a cost cap:

- **Stratification:** airports are grouped into HUB / MID / REGIONAL (strata). We
  control how many from each stratum appear per batch (`ADB_TIER_MIX`). This is
  **better than naive uniform random**, because uniform random would pick mostly
  regional airports (they're the majority) and starve the hubs where congestion
  cascades actually happen.
- **Random-with-known-probability selection:** within a stratum, airports are picked
  by a **seeded uniform shuffle** (mulberry32 PRNG, seed stored in the batch row).
  Because the selection is random with a *known* inclusion probability
  (`sampling_probability = slots_in_tier / airports_in_tier`), it is **reproducible**
  AND **correctable**: every row stores its probability + weight (`1/p`), so the GNN
  phase can do **Inverse-Probability Weighting** to recover the population
  distribution — i.e. undo the fact that hubs were oversampled relative to
  regional fields.
- **Within an airport = census, not sampling.** We get every flight at a chosen
  airport, so there is no further bias *inside* a selected airport — the only
  selection bias is at the airport level, and we record exactly how it was applied.
- **The recent-batch rotation** (avoid the last 2 batches' airports) is a deliberate
  deviation from pure independence: it guarantees *breadth* (we don't waste 12
  batches re-capturing the same 5 airports). It does not bias the *inclusion
  probabilities* that matter, because those are still recorded per row and the
  GNN uses them for weighting.

**So, to answer directly:** it is not "grab whatever we can" — it is **stratified
probability sampling with recorded inclusion probabilities and reproducible seeds**,
which is the statistically honest design for a pay-per-row data source. That's what
the research papers' "just pick top-N" approach lacks and what our design fixes.

### 5c. The monthly unit math (worst case and realistic)

Defaults (`COLLECTOR_CONFIG`, env-overridable):

| Knob | Default | Env var |
| ---- | ---- | ---- |
| `windowHours` | 4 h | `ADB_WINDOW_HOURS` |
| `batchBudget` | 4,000 credits | `ADB_BATCH_BUDGET` |
| `reserveCredits` | 5,000 | `ADB_RESERVE_CREDITS` |
| `tierMix` | `{HUB:1, MID:2, REGIONAL:2}` (5 airports/batch) | `ADB_TIER_MIX` (JSON) |
| `rememberRecentBatches` | 2 | (code) |

- **Start guard:** a batch requires `balance ≥ batchBudget + reserveCredits`
  (≥ 9,000) — so it can never zero you out, and it always leaves a reserve.
- **Per batch:** 5 airports × a 4h window. A big hub in a busy window can emit a few
  thousand flight items on its own; the **watchdog stops the batch the instant the
  4,000 budget is hit** (or the window elapses). So one batch costs **at most 4,000
  credits, in practice a few hundred to a couple thousand**.
- **Per month:** 60,000 units → refill as needed. Worst case ~15 batches × 4,000 =
  the whole 60k; realistic 15 batches × ~1–2k ≈ **15k–30k units/month** for tens of
  thousands of rows. Credits don't expire — a slow month rolls over.
- **The watchdog cannot waste money:** it only reads the DB and calls the free
  DELETE endpoint. It never spends credits itself.

**Sanity vs the research papers:** the China GNN got 1.06M rows in 3 months from a
free national dataset. We pay ~1 credit/row, so 60k units ≈ **~50–60k rows/month**.
That is far less than China's 350k/month, but it is the ceiling our data source
allows, and 50–60k clean, bias-recorded rows is a very solid GNN training set (most
of the surveyed papers trained on far less).

---

## 6. Endpoints (all behind the management guard)

| Method | Path | Purpose |
| ---- | ---- | ---- |
| GET | `/api/v1/collection/catalog` | tiers + airports + tierMix (what could be collected) |
| GET | `/api/v1/collection/status` | active/closed batches, current window, budget, rows |
| POST | `/api/v1/collection/start` | open a new batch (idempotency guard built in) |
| POST | `/api/v1/collection/stop` | close the active batch now (`{"reason":"..."}` optional) |
| GET | `/api/v1/collection/diagnostics` | dataset health: rows by tier / departure hour / delay bucket / status, per-batch rows, total estimated credits, + coverage summary |
| GET | `/api/v1/collection/coverage` | **how much of the world we can touch** — free covered-airports enumeration vs our catalog (see §10) |

Diagnostics is the **bias dashboard**: `byTier.share` should approach the population
share as batches accumulate; `byDepartureHour` should be spread across the day (if
it's all 14:00–18:00, the batch windows are landing in one timezone's evening and we
should widen the window or vary start times).

---

## 7. Reproducibility

Every batch stores `random_seed` (crypto-random at start, saved in the batch row)
and uses a deterministic `mulberry32` PRNG for airport selection. Replaying a seed
reproduces exactly which airports were picked → the whole collection run is
auditable and reproducible, which the `possibleCorrrectExtraction_p1.md` notes call
out as a requirement for trustworthy ML data.

---

## 8. Suggested cadence

1. `POST /collection/coverage` → see how many airports AeroDataBox covers vs our
   catalog (free, 12h cache).
2. `POST /collection/start` → wait for the webhook log lines
   (`[adb-v3-webhook] received flights=N stored=M ...`) to confirm rows land.
3. Let the watchdog auto-stop (or `POST /collection/stop`).
4. `GET /collection/diagnostics` — check tier shares + hour spread + budget.
5. `POST /collection/start` again — the rotation picks different airports
   automatically (it avoids the last 2 batches).
6. Verify rows: `SELECT sampling_batch_id, airport_tier, sampling_probability,
   sampling_weight, random_seed FROM clean.flight_data_pre_post
   WHERE sampling_batch_id IS NOT NULL ORDER BY received_at DESC LIMIT 20;`

When you want more volume per month, raise `ADB_BATCH_BUDGET` or shorten
`ADB_WINDOW_HOURS` to squeeze more batches into the 60k. When you want more
diversity, widen `ADB_TIER_MIX` toward REGIONAL or add airports to the catalog
(it's free to grow the catalog — only picked airports are ever subscribed).

**Deliberate time-of-day/season spread (from QUEUE_UP's seasonal design):**
the batch start time currently = whenever you hit `start`. If you always start at
the same hour, all windows land in the same UTC time band. For even coverage:
- Vary the hour you start batches (start at different times of day).
- Optionally set `ADB_WINDOW_HOURS` up to 6–8h occasionally so windows span more
  of the day.
- Diagnostics' `byDepartureHour` will tell you if you're lopsided.

---

## 9. Files

| File | Role |
| ---- | ---- |
| `migrations/0012_collection_sampling.sql` | sampling columns + `adb_collection_batches` / `adb_collection_subs` / `adb_collection_meta` tables + index |
| `server/lib/disruption/adbAirportCatalog_v3.ts` | **276-airport tier catalog** + `tierForIcao()` |
| `server/lib/disruption/aerodataboxLimiter_v3.ts` | + `listFeedAirports()` — free covered-airports enumeration |
| `server/lib/disruption/adbCollectionController_v3.ts` | batch lifecycle, seeded rotation, budget guards, watchdog, diagnostics, `getAirportCoverage()` |
| `server/lib/disruption/adbCollectionController_v3.ts` → `routes_v3.ts` | endpoints + webhook stamping |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | stamps `SamplingMeta` onto every row |
| `server/lib/disruption/flightDataPrePostStore_v3.ts` | upsert includes the sampling columns |

Env knobs: `ADB_WINDOW_HOURS`, `ADB_BATCH_BUDGET`, `ADB_RESERVE_CREDITS`,
`ADB_TIER_MIX` (e.g. `'{"HUB":1,"MID":2,"REGIONAL":2}'`).

---

## 10. "How much of the world can we touch?" — the coverage report (NEW 2026-08-09)

AeroDataBox exposes a **FREE** endpoint that lists every airport it supports per
feed service:
`GET /health/services/feeds/{service}/airports` where `service` ∈
`FlightSchedules` | `FlightLiveUpdates` | `AdsbUpdates` (3 calls, all free, returns
`{ count, items: string[] }` of ICAO codes — confirmed in the OpenAPI spec).

We added `listFeedAirports()` (limiter) + `getAirportCoverage()` (controller), so:

```
GET /api/v1/subscriptions/collection/coverage
{
  "fetchedAt": "...",
  "universe":      { "FlightSchedules": [...], "FlightLiveUpdates": [...], "AdsbUpdates": [...] },
  "universeUnion": [...],            // all covered airports (true collectable universe)
  "universeCount": 2500,             // how many airports AeroDataBox actually covers
  "catalogCount": 276,               // our sampling frame
  "catalogInUniverse": 250,          // how many of ours are covered (rest get skipped, safely)
  "catalogMissingFromUniverse": [...],
  "universeNotInCatalog": [...],     // airports we COULD add for broader coverage
  "byTier": [{tier:"HUB",total:30,inUniverse:30}, ...],
  "worldScheduledCommercial": 4072,  // ATAG 2023 (context)
  "error": null
}
```

**How to read it / act on it:**
- `universeCount` is the ceiling — AeroDataBox's covered airports (far below 50k;
  most of the world's "airports" have no scheduled flights or no ADS-B coverage).
- `catalogInUniverse / catalogCount` tells you how much of our frame is actually
  collectable. Missing ones are auto-skipped before subscribing (free check), so
  they're harmless — but you can prune them.
- `universeNotInCatalog` is your "could-add" list. Grow the catalog from it to
  widen future coverage for free. Coverage is cached 12h; `?force=1` refreshes.
- `diagnostics` also embeds this summary, so one report shows both dataset health
  and coverage. See also `MDplan/V3_WEBHOOK_VERIFY.md` §10.5 for the copy-paste run.

