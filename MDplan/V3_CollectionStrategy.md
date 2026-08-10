# V3 — Tier-Rotating Collection Strategy (AeroDataBox → `flightDataPrePost`)

> Created 2026-08-09. Companion to `V3_WebhookExtractionPlan.md` and
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

## 2. The tiers

Defined in `server/lib/disruption/adbAirportCatalog_v3.ts` (`AIRPORT_TIERS`,
`AIRPORT_CATALOG`, `tierForIcao`).

| Tier | Meaning | Examples (ICAO) |
| ---- | ---- | ---- |
| `HUB` | Global mega-hubs — huge domestic + international volume, dense ADS-B | KJFK KLAX KORD KATL KDFW KSFO EGLL LFPG EHAM EDDF WSSS RJTT OMDB |
| `MID` | Large mid-size hubs — heavy traffic, route diversity | KLGA KEWR KSEA KMIA KIAD KDEN KIAH KCLT EDDM RJAA RKSI VHHH YSSY LEMD |
| `REGIONAL` | Regional / secondary fields — the long tail the GNN must learn | KRDU KSJC KPIT KABQ KTUS KSTL KPDX KBDL KSMF KOAK KMSY KMKE YVR CYYZ |

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

## 5. Credit budget math (why we don't waste the 60k units)

Facts (verified 2026-08-09):
- Ultra plan = **60,000 units / 240,000 requests per month**; 1 unit = 1 alert credit.
- Subscription CRUD (create/get/list/delete), balance, coverage check = **FREE**.
- **Notifications = 1 credit per flight item**; failed deliveries retry (up to
  `maxDeliveryRetries`) and each retry costs — that's why the old 403 bug burned
  ~4,250 credits.

Defaults (`COLLECTOR_CONFIG`, env-overridable):

| Knob | Default | Env var |
| ---- | ---- | ---- |
| `windowHours` | 4 h | `ADB_WINDOW_HOURS` |
| `batchBudget` | 4,000 credits | `ADB_BATCH_BUDGET` |
| `reserveCredits` | 5,000 | `ADB_RESERVE_CREDITS` |
| `tierMix` | `{HUB:1, MID:2, REGIONAL:2}` | `ADB_TIER_MIX` (JSON) |
| `rememberRecentBatches` | 2 | (code) |

The start guard requires `balance ≥ batchBudget + reserveCredits` (i.e. ≥ 9,000),
so a batch can never zero you out.

**Rough cost of one batch:** 5 airports × ~1–2k flight items/day across a 4h window
of active departures+arrivals ⇒ roughly 1–4k credits of notifications (a big hub in
a busy window can generate a few thousand items on its own; the budget cap stops us
if it blows past 4k). With 60k units and ~4k/batch you get **~12–15 batches per
month**, and each batch re-rotates to different airports — breadth over depth, which
is what the GNN needs. Credits don't expire, so a slow month rolls over.

The watchdog stops a batch the moment the budget is hit, so **units are never
wasted on a runaway airport.**

---

## 6. Endpoints (all behind the management guard)

| Method | Path | Purpose |
| ---- | ---- | ---- |
| GET | `/api/v1/collection/catalog` | tiers + airports + tierMix (what could be collected) |
| GET | `/api/v1/collection/status` | active/closed batches, current window, budget, rows |
| POST | `/api/v1/collection/start` | open a new batch (idempotency guard built in) |
| POST | `/api/v1/collection/stop` | close the active batch now (`{"reason":"..."}` optional) |
| GET | `/api/v1/collection/diagnostics` | dataset health: rows by tier / departure hour / delay bucket / status, per-batch rows, total estimated credits |

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

1. `POST /collection/start` → wait for the webhook log lines
   (`[adb-v3-webhook] received flights=N stored=M ...`) to confirm rows land.
2. Let the watchdog auto-stop (or `POST /collection/stop`).
3. `GET /collection/diagnostics` — check tier shares + hour spread + budget.
4. `POST /collection/start` again — the rotation picks different airports
   automatically (it avoids the last 2 batches).
5. Verify rows: `SELECT sampling_batch_id, airport_tier, sampling_probability,
   sampling_weight, random_seed FROM clean.flight_data_pre_post
   WHERE sampling_batch_id IS NOT NULL ORDER BY received_at DESC LIMIT 20;`

When you want more volume per month, raise `ADB_BATCH_BUDGET` or shorten
`ADB_WINDOW_HOURS` to squeeze more batches into the 60k. When you want more
diversity, widen `ADB_TIER_MIX` toward REGIONAL or add airports to the catalog.

---

## 9. Files

| File | Role |
| ---- | ---- |
| `migrations/0012_collection_sampling.sql` | sampling columns + `adb_collection_batches` / `adb_collection_subs` / `adb_collection_meta` tables + index |
| `server/lib/disruption/adbAirportCatalog_v3.ts` | tier catalog + `tierForIcao()` |
| `server/lib/disruption/adbCollectionController_v3.ts` | batch lifecycle, seeded rotation, budget guards, watchdog, diagnostics |
| `server/lib/disruption/adbCollectionController_v3.ts` → `routes_v3.ts` | endpoints + webhook stamping |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | stamps `SamplingMeta` onto every row |
| `server/lib/disruption/flightDataPrePostStore_v3.ts` | upsert includes the sampling columns |

Env knobs: `ADB_WINDOW_HOURS`, `ADB_BATCH_BUDGET`, `ADB_RESERVE_CREDITS`,
`ADB_TIER_MIX` (e.g. `'{"HUB":1,"MID":2,"REGIONAL":2}'`).
