# V3 — Webhook Data Extraction Plan (AeroDataBox Flight Alerts → `flightDataPrePost`)

> Created 2026-08-06. **Updated 2026-08-09** (runtime verification results from the
> Replit terminal, units-vs-credits investigation, subscription subject-type model
> for capturing 50k+ rows, code robustness fix).
>
> Goal: ingest the **entire** AeroDataBox `FlightNotificationContract` webhook payload
> (every field copied into `AugMLtest/PrePosFeat.md` from the docs) into ONE clean
> table, `flightDataPrePost`, safely and correctly — then feed the deep-learning /
> GNN models. Heuristic is **DEFERRED** (Phase 4 below).

---

## STATUS BANNER (2026-08-08)

| Phase | Status | Notes |
| ---- | ---- | ---- |
| **0. Shut down old polling + v1 tables** | ✅ **DONE** (2026-08-08) | All live AeroDataBox poll calls + `monitored_flights` / `risk_score_history` writes commented out in `routes.ts` + `monitor.ts`. Engine was already dead. Only remaining live AeroDataBox call: **manual** `simulate → findLowRiskAlternatives` debug action (left on purpose — see §1c). |
| **1. Subscription manager (create/refill/list/get/delete)** | ✅ **BUILT + RUNTIME-VERIFIED** (2026-08-10) | `aerodataboxLimiter_v3.ts` + `routes_v3.ts`, wired into `server/index.ts`. **Verified live on Replit 2026-08-10 01:23** — stray KJFK sub deleted (bleed stopped), app restarted on fixed code, new KJFK sub created with the correct `:443` webhook URL, `isActive:true` `CreditBased`. App endpoints respond (HTTP 200). |
| **2. Webhook ingress + validator** (`POST /api/v1/webhooks/aerodatabox/:secret`) | ✅ **BUILT** (2026-08-10) | Ingress registers before CSRF (no 403s), always 2xx, now validates with `flightStatus_v3.ts` (zod mirror of `PrePosFeat.md`) then extracts + stores (Phase 3). 2mb JSON body limit set (big airport batches would otherwise 413 → paid retries). |
| **3. Extractor + store** (`flightDataPrePost`) | ✅ **BUILT** (2026-08-10) | `flightNotificationExtractor_v3.ts` (null-safe field-by-field → flat row, `data_stage` PRE/POST, SHA-256 dedup key) + `flightDataPrePostStore_v3.ts` (batch upsert `ON CONFLICT (dedup_key) DO UPDATE` via `excluded.*`). `0010` + new `0011` (quality columns → jsonb) applied at boot. Extractor smoke-tested (33 asserts) + validator + SQL generation verified; `npm run check` still 57 baseline errors, **0 in v3 files**. **Live DB write still to be verified on Replit.** |
| **4. Heuristic** | ⏸️ **DEFERRED** | User decision 2026-08-08: **focus GNN / deep-learning first.** Do not build until the GNN has data. Notes only (`AugMLtest/HeuristicModelNotes.md`). |
| **5. Cutover / retire** | ⛔ Not started | After data flows. |

**Phase 0 recap (what is commented, verified):**
- `server/routes.ts` — user-flight immediate `scoreFlightRisk` (L2453); agency create
  `INSERT monitored_flights` + travelers + `scoreFlightOnce` (endpoint now returns 503);
  agency rescore `scoreFlightOnce` (L9884); simulate `UPDATE monitored_flights` +
  `INSERT risk_score_history` (L9965-9980); search endpoint `dAdbFetch` calls (both
  modes, return 503); outcomes `dGetFlightStatus` live fallback (reports Unknown).
- `server/lib/disruption/monitor.ts` — confirmation-alert `UPDATE monitoredFlights` (L220).
- The 30-min engine (`startMonitoringEngine`) was already commented in `server/index.ts:324`
  AND `server/index_v2.ts:326` (re-confirmed 2026-08-09 — the engine is dead; no
  `setInterval`/cron anywhere calls AeroDataBox).
- `npm run check` = 57 errors (baseline; no new errors; all pre-existing).

---

## RUNTIME VERIFICATION & INVESTIGATION (2026-08-09 — from the Replit terminal)

The user ran `MDplan/V3_WEBHOOK_VERIFY.md` on Replit and shared the output. Here is
what it proved, what it revealed, and the resulting decision. **Nothing is secretly
burning credits/units — confirmed below.**

### What the terminal output confirmed ✅

| Check | Result |
| ---- | ---- |
| `git pull origin main` | Merge conflict in `server/db.ts` resolved by keeping remote (`--theirs`) → clean tree, already up to date. |
| Boot migrations | `0010_flight_data_pre_post.sql` applied (plus 0002–0008). |
| `\dt clean.*` | `clean.flight_data_pre_post` (0 rows), plus the v2 tables. Table exists. |
| Secrets | `AERODATABOX_API_KEY=YES`, `DATABASE_URL=YES`; `AERODATABOX_WEBHOOK_SECRET` unset (secret-less dev mode active). |
| APP_URL | Resolves to `https://95ac2e69-....kirk.replit.dev` — webhook URL will be `<that>/api/v1/webhooks/aerodatabox`. |
| App | `serving on port 5000`, Stripe + v3 modules load. |

### Finding 1 — `GET /subscriptions/balance` returns HTTP 200 with an EMPTY body

The direct RapidAPI call succeeded at the transport level (200, `content-length: 0`).
That is **not** a key problem and **not** a units drain — it means the Flight Alert
**credit balance record does not exist yet** because it has never been refilled.
`balance` is created/returned the first time you call refill.

- The response headers also answer the plan question:
  - `x-ratelimit-api-units-limit: 60000`, `x-ratelimit-requests-limit: 240000` →
    this is the **Ultra plan** (60,000 units / 240,000 requests per month).
  - `x-ratelimit-api-units-remaining: 35927` → **24,073 units used this billing month.**
  - `x-tier: Free Tier` refers to the balance **endpoint** being a free-tier call
    (0 units) — it is not the name of your plan.
- Our app now handles the empty 200 gracefully (see `aerodataboxLimiter_v3.ts`
  `readJsonOrNull` + the balance route): instead of a 502 it returns
  `{"balance":null,"message":"...Initialize it with POST .../balance/refill..."}`.

**Fix:** call refill once to initialize the balance (1 credit = 1 API unit):
`POST .../subscriptions/balance/refill` with `{"credits": 5000}`.

### Finding 2 — Units vs Credits: why ~24k units are gone (investigation result)

These are **two separate billing systems** (see AeroDataBox's credit-billing guide):

| | Units (API quota) | Credits (Flight Alert balance) |
| ---- | ---- | ---- |
| Managed by | RapidAPI (your plan) | AeroDataBox directly |
| Renewal | monthly billing cycle | do not expire; paused at 0 |
| Spent by | REST endpoint calls (Tier 1/2/3/4) | 1 credit per flight item per webhook notification |
| Conversion | 1 unit = 1 credit when you **refill** | — |

The webhook has **never fired** (no subscription was ever created), so **0 credits**
were spent. The polling engine is **confirmed dead** — `startMonitoringEngine()` is
commented in BOTH `server/index.ts:324` and `server/index_v2.ts:326`, and a
repo-wide search found **no `setInterval`/cron/scheduler that calls AeroDataBox**.
`apiCallTracker.ts` is also disabled (it's a reference copy), so there is no DB audit
trail of per-call units.

What STILL calls AeroDataBox (only when a human uses the UI — each is Tier 1/2):

| Path | Code | Cost per action |
| ---- | ---- | ---- |
| `/api/user/flights/search` (flight number) | `routes.ts:2344` | ~1 unit |
| `/api/user/flights/search` (airport FIDS) | `routes.ts:2367` | 2 × ~1 unit |
| `/api/agency/flights/search` | `routes.ts:10158` | ~1–2 units |
| `/api/agency/flights/:id/rescore` | `routes.ts:9399` → `getFlightStatus` + `getHistoricalOtp` | ~2–4 units |
| `/api/agency/flights/:id/simulate` | `routes.ts:10006` → `findLowRiskAlternatives` → `scoreFlightRisk` × ~3 | ~6–12 units |
| Agency dashboard **"Rescore all"** | `client/src/pages/agency/dashboard.tsx:464` loops `rescore` over **all** flights | ~2–4 units × N flights ← biggest manual burner |

**Verdict:** the 24,073 units were spent by manual UI actions this month (search /
rescore / simulate / "Rescore all" — a few "Rescore all" runs over dozens of flights
explains thousands of units), or by legacy polling before the 2026-08-08 shutdown.
There is **no background job** running. To see the exact per-endpoint breakdown, log
in to the **RapidAPI dashboard → AeroDataBox → Usage**.

**Cost plan going forward:** your Ultra quota converts cleanly to alert credits
(60k units → 60k credits → ~50k webhook rows, 1 credit each). So the plan is fully
adequate for the 50k-row dataset. Just **stop clicking "Rescore all" / simulate**
on the agency dashboard while the webhook dataset is being built, and use the
RapidAPI usage page to monitor.

### Finding 3 — Subscription model: how to capture MANY flights (answers the "step 7" confusion)

A subscription is **not** "one subscription = all flights everywhere". There are two
subject types, and they behave very differently:

| `subjectType` | `subjectId` | What you get | Cost per notification |
| ---- | ---- | ---- | ---- |
| `FlightByNumber` | a flight number, e.g. `AA100` | **ONE specific flight** — its status changes until it lands. That's it. | 1 credit (1 flight item) |
| `FlightByAirportIcao` | an airport ICAO, e.g. `KJFK` | **ALL flights** departing + arriving that airport (each notification carries a list of updated flights) | **1 credit per flight item** in the notification (e.g. 5 flights = 5 credits) |

**To build the 50k-row training set you want `FlightByAirportIcao` subscriptions,
not `FlightByNumber`.** One airport subscription already captures hundreds of
different flights per day, domestic + international, automatically.

How it works in practice:
- Alerts fire when flight **status changes** (CheckIn → Boarding → GateClosed →
  Departed → EnRoute [multiple live position updates] → Approaching → Arrived).
- Each `flights[i]` in a notification becomes **one row** (different
  `lastUpdatedUtc` → new dedup key → new row). One flight journey typically
  produces **10–30 rows** across its lifecycle.
- `GET /subscriptions/balance` + the `balance` block inside every notification show
  remaining credits so you can refill before hitting 0 (all subs pause at 0).
- Subscriptions never expire; you can add/remove airports over time to sample
  different routes (rotate airports weekly for variety).

**Recommended start:** subscribe to a mix of busy domestic + international hubs,
e.g. `KJFK, KLGA, KLAX, KORD, KATL, KDFW, KSFO, KSEA, KMIA, KIAD, EGLL, LFPG, EHAM,
EDDF, EDDM, OMDB, WSSS, RJTT, RJAA` (ICAO). Verify a couple of notifications land,
then scale up. ~19 airports × ~1–2k flights/day easily reaches the row target over a
few days — at a cost of roughly 1 credit per row, well inside the 60k-unit budget.
See `MDplan/V3_WEBHOOK_VERIFY.md` §7 for the copy-paste commands and the expected
credit math.

### Finding 4 — Round 2 (2026-08-10): the webhook WAS firing and burning credits on 403s; two code bugs fixed

The second verify run revealed the pipeline was half-alive and **losing credits**:

1. **Credit deductions were happening even though we never saw a successful
   subscription.** Balance showed `lastDeductedUtc: 2026-08-10 00:59`, and the app log
   showed `[express] POST /api/v1/webhooks/aerodatabox 403 in 13ms body=32b`. So
   subscription(s) DID exist and AeroDataBox was delivering notifications to
   `/api/v1/webhooks/aerodatabox` — every delivery 403'd, which counts as a **failed
   delivery** (and with `maxDeliveryRetries: 2`, up to 3 sends per flight item, each
   charged). That is where the credits went (~4,250 between Aug 9 10:55 and Aug 10 00:59).
2. **The 403 was the CSRF middleware.** `routes_v3` was registered in `server/index.ts`
   AFTER `registerRoutes()`, which `app.use(csrfMiddleware)` (routes.ts:1716). Any
   POST without our CSRF token → `403 {"message":"Invalid CSRF token"}` (exactly 32
   bytes = the logged `body=32b`). AeroDataBox has no CSRF cookie, so every webhook
   delivery was rejected. **Fix: register `registerV3Routes(app)` BEFORE
   `registerRoutes(...)` in `server/index.ts`** so v3 routes bypass CSRF + the generic
   `/api` limiter. (v3 auth is self-contained: URL secret for the webhook,
   `x-webhook-secret` header for management endpoints.)
3. **Direct subscription create failed with
   `{"message":"Web-hook URL port is not allowed: -1"}`.** AeroDataBox's URL validator
   chokes on a URL without an explicit port. **Fix: `defaultWebhookUrl()` now forces
   `:443`** (`https://host:443/api/v1/webhooks/aerodatabox[<secret>]`).
4. **The ingress only matched `/api/v1/webhooks/aerodatabox/:secret`.** With
   `AERODATABOX_WEBHOOK_SECRET` unset, subscriptions point at the bare path
   `/api/v1/webhooks/aerodatabox`, which never matched the `/:secret` route. **Fix:
   the ingress is now registered on BOTH paths** (secret-less path allowed in dev mode;
   when a secret IS set, only the `/<secret>` path is valid).

**Resulting runbook:** FIRST list + delete any stray subscriptions to stop credit burn
(see `V3_WEBHOOK_VERIFY.md` §0.5), THEN recreate after the fixes are deployed. Verify
the created subscription's `url` now contains `:443` and watch the app log for a
`[adb-v3-webhook] received ...` line (2xx, no 403).

---

## DATA CAPTURE STRATEGY — ALL AIRPORTS / ALL FLIGHTS (confirmed 2026-08-09)

> User question: "Is airport subscription the correct way to capture all or as many
> flights as we can (domestic + international)?" **Answer: yes — it is the ONLY bulk
> mechanism AeroDataBox exposes, and it is the correct one.** There is no "subscribe
> to the whole world" option. You approximate global coverage by subscribing to
> **every major airport**, which captures every flight that touches those airports.

### Why airport subscriptions capture "all flights"

- Every commercial flight has an **origin** and a **destination** airport. A
  `FlightByAirportIcao` subscription (e.g. `KJFK`) covers **all** departures AND
  arrivals at that airport — so any flight is captured by subscribing to *either* of
  its two endpoints.
- Subscribing to the ~100–200 busiest airports (domestic US + international hubs)
  therefore captures the overwhelming majority of the world's scheduled traffic.
  The tiny-airport long tail adds negligible training value.
- One flight's lifecycle (CheckIn → Boarding → GateClosed → Departed → EnRoute ×N →
  Approaching → Arrived) produces **10–30 rows**; each leg of an aircraft is a
  separate flight, so the table naturally accumulates a broad, dense dataset.
- `FlightByNumber` is **complementary only** — use it to follow ONE flight number or
  verify delivery. It is NOT the volume source.

### Coverage caveat (important — don't subscribe blindly)

- AeroDataBox ADS-B / live coverage is **not uniform** (see aerodatabox.com/data-coverage).
- **Before adding any airport, check its live feed:** `GET /health/services/airports/{icao}/feeds`
  (free). Skip airports with weak/absent feeds — you'd pay nothing, but get no alerts.
- Prefer major airports first (best coverage), then expand to mid-size airports for
  **route diversity** (see below).

### The aircraft rotation / tail-number chain-reaction (your insight — and why it's a GNN problem, not a capture problem)

One aircraft (tail number) flies **multiple legs per day**, often crossing the globe
over several days. A late arrival on leg 1 (or a late turn) **cascades** into late
departures on legs 2, 3, … — delay propagates through the aircraft's rotation (plus
connections, crew, and codeshare partners). This is real, and it is exactly what the
GNN should learn.

Why our current plan already supports it:

- Every row stores **`aircraft_reg`** (the tail number) plus the full PRE/POST time
  set: `dep/arr_scheduled_utc`, `_revised_utc`, `_predicted_utc`, `_runway_utc`.
  That gives us each leg's **delay signal** (e.g. `dep_runway_utc − dep_scheduled_utc`,
  `arr_runway_utc − arr_scheduled_utc`) and the aircraft identity to chain legs.
- Consecutive legs of one aircraft therefore share `aircraft_reg` and carry each
  other's delay → the **GNN edge set** (tail-number chaining) can be built directly
  from the stored rows. This matches the research papers in `researchPapers/`
  (Edge-Based GNN / FlightConnectivity, and QUEUE_UP_FOR_TAKEOFF transferable
  framework).
- **Capture needs no change for the chain-reaction idea.** Airport subscriptions at
  the airports an aircraft visits naturally capture every leg. (Optional extra: add a
  `FlightByNumber` sub for a specific flight number to follow one rotation explicitly
  — only for verification/targeting, not breadth.)

**So: capture = all airports; chain-reaction logic = GNN feature/edge engineering on
`flightDataPrePost`.** We are planning it correctly.

### Cost & overlap reality (be honest with the numbers)

- 1 credit per **flight item** per notification. ~50k rows ≈ ~50k credits.
- **Overlap:** a flight between two subscribed airports (e.g. JFK–LHR with both KJFK
  and EGLL subscribed) can appear in notifications from *both* subscriptions — the
  same flight item may be charged twice even though dedup stores one row.
- Budget math: Ultra = 60,000 units/mo = 60,000 credits. At 1–2 credits per unique
  row (depending on overlap + position-update frequency) you get **~30k–60k rows per
  month**. That reaches the 50k goal. Credits do NOT expire — refill across billing
  cycles if you want more volume per month.
- **Mitigation / measurement:** after the first airport is live, measure
  `credits_remaining` vs rows written (a few simple `SELECT count(*)` checks) to learn
  the real cost-per-row, then tune the airport set.

### Route diversity (avoid ML bias)

If we only collect hub→hub routes, the GNN won't generalize to regional/leisure
flights. Mix in **mid-size airports** (e.g. `KDEN KIAH KCLT KBOS KPHL KSEA KSLC KMSP
KDCA KBNA KTPA KPHX KLAS KFLL YVR CYYZ`) alongside the mega-hubs, and rotate the set
over time. Coverage check applies to every airport before subscribing.

### Concrete starting set (see `V3_WEBHOOK_VERIFY.md` §7 for commands)

US hubs: `KJFK KLGA KEWR KLAX KSFO KSEA KORD KATL KDFW KMIA KIAD`
International: `EGLL LFPG EHAM EDDF EDDM LEMD LIRF LSZH OMDB WSSS RJTT RJAA RKSI VHHH YSSY ZBAA ZGGG`
Mid-size / diversity: `KDEN KIAH KCLT KBOS KPHL KDCA KTPA KPHX KFLL KMSP KSLC KBNA YVR CYYZ`

Start small (KJFK + one international), verify notifications land + rows write, then
run the loop. Watch `credits_remaining`; refill before 0.

---

## 0. Why we must do this carefully (the lesson from v1–v8)

We already learned, the hard way, what sloppy data collection does:
- Polling AeroDataBox every hour produced **duplicate rows** and a messy DB
  (the `risk_score_history_v2`/`monitored_flights_v2` mess in the `clean` schema).
- Our ML labels were only as good as the data underneath them.

The webhook is our **clean data source**. If we extract it wrong (nulls turned
into `0`, `utc`/`local` mixed up, live vs scheduled times confused, duplicate
rows on every notification), we poison the **GNN / deep-learning models** before
we ever train. So the extractor is the single most important file we write in August.

---

## 1. Evidence: current state audit

### 1a. The 4 tables we shut down (2026-08-08 — DONE)

| # | Table | Schema | Written by | Status |
| -- | ---- | ---- | ---- | ---- |
| 1 | `monitored_flights` | public (v1) | `routes.ts` agency endpoints + `monitor.ts` | ✅ **STOPPED** — all writes commented |
| 2 | `risk_score_history` | public (v1) | `routes.ts` simulate endpoint | ✅ **STOPPED** — insert commented |
| 3 | `clean.monitored_flights_v2` | clean (v2) | `v2Writer.ts` only | ✅ DEAD (not imported) |
| 4 | `clean.risk_score_history_v2` | clean (v2) | `v2Writer.ts` only | ✅ DEAD (not imported) |

### 1b. aerodataboxLimiter usage after shutdown

- **`aerodataboxLimiter_v2.ts`** — dead (nothing imports it).
- **`aerodataboxLimiter.ts`** — no longer reachable from the auto pipeline.
  Remaining reach path: `alternativeFinder.ts:124 → scoreFlightRisk` (only invoked by
  the **manual** agency `simulate` debug endpoint). Decision: leave it — it is a
  deliberate, rare, user-triggered action; it costs credits only when used. If you
  want it gone too, say so.

### 1c. Honest verdict

| Claim | Verdict |
| ---- | ---- |
| `aerodataboxLimiter_v2` is not used | ✅ TRUE |
| `clean.*_v2` tables are not written | ✅ TRUE (dead) |
| Original `aerodataboxLimiter` auto-pipeline is stopped | ✅ TRUE |
| `monitored_flights` / `risk_score_history` (v1) not written | ✅ TRUE (all writes commented) |
| **No AeroDataBox credits spent** (outside manual simulate) | ✅ TRUE |

---

## 2. Target architecture

```
AeroDataBox Flight Alert webhook
        │  POST FlightNotificationContract (per PrePosFeat.md)
        ▼
server/routes_v3.ts ── POST /api/v1/webhooks/aerodatabox/:secret
        │  (always answer 2xx within 10s — see §7)
        ▼
flightStatus_v3.ts        (zod validator mirroring PrePosFeat.md EXACTLY)
        ▼
flightNotificationExtractor_v3.ts   (safe per-field extraction → flat row)
        ▼
flightDataPrePostStore_v3.ts        (upsert into flightDataPrePost)
        │
        ├──► flightDataPrePost table   (RAW collected data — PRE & POST)
        │
        └──► [DEFERRED] heuristicScorer_v3.ts → heuristic_predictions
                                        │
                                        └──► GNN / deep-learning models read flightDataPrePost
```

- **`flightDataPrePost` = raw truth** (the webhook data, nothing computed).
- **`heuristic_predictions` = computed outputs** — DEFERRED (see §9).
- **Future GNN / deep-learning features** are built from `flightDataPrePost` only.

---

## 3. v3 file naming convention

We keep the version lineage visible, exactly like `aerodataboxLimiter.ts` →
`aerodataboxLimiter_v2.ts`:

| New file (v3) | Replaces / role |
| ---- | ---- |
| `server/routes_v3.ts` | New webhook + subscription endpoints (webhook ingress, create/get/refill/list/delete subscriptions) |
| `server/lib/disruption/aerodataboxLimiter_v3.ts` | **Subscription manager** (all outbound AeroDataBox calls: create/refill/get/list/delete, serialized to avoid 429) |
| `server/lib/disruption/flightStatus_v3.ts` | NOT a poller — holds the webhook **payload types + validator** (mirrors PrePosFeat.md) |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | THE careful field-by-field extractor (§5) |
| `server/lib/disruption/flightDataPrePostStore_v3.ts` | Table def + upsert/dedup (§6) |
| `server/lib/disruption/heuristicScorer_v3.ts` | **DEFERRED** — notes only (HeuristicModelNotes.md) |
| `server/lib/disruption/heuristicPredictionStore_v3.ts` | **DEFERRED** |

New DB migration (auto-applied at boot via `server/db.ts` `BOOT_MIGRATIONS`):
- `0010_flight_data_pre_post.sql` — the raw collection table, **in the `clean`
  schema** (`CREATE SCHEMA IF NOT EXISTS clean; CREATE TABLE IF NOT EXISTS
  clean.flight_data_pre_post ...` — same home as the v2 tables). The drizzle
  table uses `pgSchema("clean")` so `db.insert(...)` is type-safe.

---

## 4. The contract source of truth: `AugMLtest/PrePosFeat.md`

`PrePosFeat.md` is the AeroDataBox **FlightNotificationContract** field
documentation, copied verbatim from
`https://doc.aerodatabox.com/rapidapi.html#/operations/SubscribeWebhook`.
Top-level shape:

```
{
  flights[]: [
    {
      notificationSummary, notificationRemark,
      greatCircleDistance { meter, km, mile, nm, feet },
      departure { airport{icao,iata,localCode,name,shortName,municipalityName,
                           location{lat,lon}, countryCode, timeZone},
                   scheduledTime{utc,local}, revisedTime{utc,local},
                   predictedTime{utc,local}, runwayTime{utc,local},
                   terminal, checkInDesk, gate, baggageBelt, runway, quality[] },
      arrival   { ...same shape as departure (no checkInDesk)... },
      flightPlan { flightRules, flightType, revisionNo, status, route,
                   altitude{requested{...},assigned{...}},
                   airspeed{requested{...},assigned{...}}, lastUpdatedUtc },
      lastUpdatedUtc, number, callSign,
      status,        // 0-12 enum (Unknown..CanceledUncertain)
      codeshareStatus, // 0-2 enum (Unknown..IsCodeshared)
      isCargo,
      aircraft  { reg, modeS, model, image{url,webUrl,author,title,description,license,htmlAttributions[]} },
      airline   { name, iata, icao },
      location  { pressureAltitude{...}, altitude{...}, pressure{hPa,inHg,mmHg},
                  groundSpeed{kt,kmPerHour,miPerHour,meterPerSecond},
                  trueTrack{deg,rad}, vsiFpm, reportedAtUtc, lat, lon }   // POST (live ADS-B)
    }
  ],
  subscription { id, isActive, billingType, activateBeforeUtc, expiresOnUtc,
                 createdOnUtc, subject{type,id}, subscriber{type,id}, notices[] },
  balance      { creditsRemaining, lastRefilledUtc, lastDeductedUtc }
}
```

**Key insight for extraction:** the same payload carries BOTH
- **PRE-departure** data (scheduled/revised/predicted/runway times, gates,
  terminals, flight plan, tail number), and
- **POST-departure** data (the `location` block: lat, lon, altitude, groundSpeed,
  trueTrack, vsiFpm, reportedAtUtc — live ADS-B).

So we store **both** in `flightDataPrePost` (one table), and only at the ML phase
do we split features by stage.

---

## 5. The careful extraction plan (field by field)

### 5a. General rules (non-negotiable)

1. **Never default a missing field to `0`.** A missing `location` is NOT
   `lat=0,lon=0` — it means "not airborne yet". Use `NULL`. Zeros would poison
   every downstream model. (This was a real bug pattern in the v2 flightStatus code.)
2. **Store `utc` as the canonical timestamp** (`timestamptz`). Keep `local` only
   as optional text (display / airport-local context).
3. **Flatten nested objects** into named columns with prefixes (`dep_`, `arr_`,
   `loc_`, etc.). Do NOT store raw JSONB as the only copy — we learned JSONB blobs
   are un-queryable for ML. (We DO keep a raw `payload_json` for audit/recovery.)
4. **Record `quality[]` as returned** (`Basic`/`Live`/`Approximate`) — it tells us
   how trustworthy each field is.
5. **Dedup.** Notifications can be delivered more than once (best-effort + retries).
   Dedup key: SHA-256 of `(flight_number, carrier_iata, last_updated_utc)` — see §6.
6. **Tag each row with `data_stage`** = `PRE` / `POST` (determination in §5c).
7. **Loop `flights[]`** — a single notification may contain several updated
   flights; extract and write each.
8. **Record the whole raw flight item** in `payload_json` so nothing is ever lost,
   even fields we choose not to flatten.

### 5b. Column map (flightDataPrePost) — EXHAUSTIVE (covers every field in PrePosFeat.md)

Grouped, snake_case, canonical units. ✅ = present; this map is the **full** set.

**Identity**
| column | source path | type |
| ---- | ---- | ---- |
| flight_number | `.number` | text |
| carrier_iata / carrier_icao / carrier_name | `.airline.iata` / `.icao` / `.name` | text |
| call_sign | `.callSign` | text |
| is_cargo | `.isCargo` | boolean |
| status | `.status` (string enum) | text |
| status_code | `.status` (numeric 0–12, derived — table in §5d) | smallint |
| codeshare_status | `.codeshareStatus` | text |
| notification_summary | `.notificationSummary` | text |
| notification_remark | `.notificationRemark` | text |
| last_updated_utc | `.lastUpdatedUtc` | timestamptz |

**Great-circle distance**
| column | source path | type |
| ---- | ---- | ---- |
| gcd_m / gcd_km / gcd_mile / gcd_nm / gcd_ft | `.greatCircleDistance.meter/km/mile/nm/feet` | double |

**Departure (PRE)**
| column | source path | type |
| ---- | ---- | ---- |
| dep_airport_icao / dep_airport_iata / dep_airport_local_code | `.departure.airport.icao/iata/localCode` | text |
| dep_airport_name / dep_airport_short_name / dep_airport_municipality | `.departure.airport.name/shortName/municipalityName` | text |
| dep_airport_country_code | `.departure.airport.countryCode` | text |
| dep_airport_lat / dep_airport_lon | `.departure.airport.location.lat/lon` | double |
| dep_airport_timezone | `.departure.airport.timeZone` | text |
| dep_scheduled_utc / dep_scheduled_local | `.departure.scheduledTime.utc/local` | timestamptz / text |
| dep_revised_utc | `.departure.revisedTime.utc` | timestamptz |
| dep_predicted_utc | `.departure.predictedTime.utc` | timestamptz |
| dep_runway_utc | `.departure.runwayTime.utc` | timestamptz |
| dep_terminal / dep_checkin_desk / dep_gate / dep_baggage_belt / dep_runway | `.departure.*` | text |
| dep_quality | `.departure.quality[]` | text[] |

**Arrival (PRE — the "when will it land" baseline)**
| column | source path | type |
| ---- | ---- | ---- |
| arr_airport_icao / arr_airport_iata / arr_airport_local_code | `.arrival.airport.*` | text |
| arr_airport_name / arr_airport_short_name / arr_airport_municipality | `.arrival.airport.*` | text |
| arr_airport_country_code | `.arrival.airport.countryCode` | text |
| arr_airport_lat / arr_airport_lon | `.arrival.airport.location.lat/lon` | double |
| arr_airport_timezone | `.arrival.airport.timeZone` | text |
| arr_scheduled_utc / arr_scheduled_local | `.arrival.scheduledTime.utc/local` | timestamptz / text |
| arr_revised_utc | `.arrival.revisedTime.utc` | timestamptz |
| arr_predicted_utc | `.arrival.predictedTime.utc` | timestamptz |
| arr_runway_utc | `.arrival.runwayTime.utc` | timestamptz |
| arr_terminal / arr_gate / arr_baggage_belt / arr_runway | `.arrival.*` | text |
| arr_quality | `.arrival.quality[]` | text[] |

**Flight plan (PRE)**
| column | source path | type |
| ---- | ---- | ---- |
| flight_plan_flight_rules | `.flightPlan.flightRules` (IFR/VFR) | text |
| flight_plan_flight_type | `.flightPlan.flightType` | text |
| flight_plan_revision_no | `.flightPlan.revisionNo` (int or null) | int |
| flight_plan_status | `.flightPlan.status` (Proposed/Active/Dropped/Cancelled/Completed) | text |
| flight_plan_route | `.flightPlan.route` | text |
| fp_alt_requested_ft / fp_alt_assigned_ft | `.flightPlan.altitude.requested.feet` / `.assigned.feet` | double |
| fp_airspeed_requested_kt / fp_airspeed_assigned_kt | `.flightPlan.airspeed.requested.kt` / `.assigned.kt` | double |
| flight_plan_last_updated_utc | `.flightPlan.lastUpdatedUtc` | timestamptz |

**Aircraft (PRE + the tail-number join key + image)**
| column | source path | type |
| ---- | ---- | ---- |
| aircraft_reg (tail number) | `.aircraft.reg` | text |
| aircraft_mode_s | `.aircraft.modeS` | text |
| aircraft_model | `.aircraft.model` | text |
| aircraft_image_url / aircraft_image_web_url | `.aircraft.image.url` / `.webUrl` | text |
| aircraft_image_author / title / description | `.aircraft.image.*` | text |
| aircraft_image_license | `.aircraft.image.license` | text |
| (htmlAttributions) | `.aircraft.image.htmlAttributions[]` | kept in `payload_json` |

**Live position (POST — ADS-B)**
| column | source path | type |
| ---- | ---- | ---- |
| loc_lat / loc_lon | `.location.lat` / `.location.lon` | double |
| loc_altitude_ft | `.location.altitude.feet` | double |
| loc_pressure_altitude_ft | `.location.pressureAltitude.feet` | double |
| loc_pressure_hpa | `.location.pressure.hPa` | double |
| loc_ground_speed_kt | `.location.groundSpeed.kt` | double |
| loc_true_track_deg | `.location.trueTrack.deg` | double |
| loc_vsi_fpm | `.location.vsiFpm` (int or null) | int |
| loc_reported_utc | `.location.reportedAtUtc` | timestamptz |

**Subscription + balance (meta)**
| column | source | type |
| ---- | ---- | ---- |
| subscription_id | `.subscription.id` | uuid |
| subscription_is_active | `.subscription.isActive` | boolean |
| subscription_billing_type | `.subscription.billingType` | text |
| subscription_activate_before_utc | `.subscription.activateBeforeUtc` | timestamptz |
| subscription_expires_on_utc | `.subscription.expiresOnUtc` | timestamptz |
| subscription_created_on_utc | `.subscription.createdOnUtc` | timestamptz |
| subject_type / subject_id | `.subscription.subject.type` / `.id` | text |
| subscriber_type / subscriber_id | `.subscription.subscriber.type` / `.id` | text |
| subscription_notices | `.subscription.notices[]` | jsonb |
| credits_remaining | `.balance.creditsRemaining` | bigint |
| balance_last_refilled_utc | `.balance.lastRefilledUtc` | timestamptz |
| balance_last_deducted_utc | `.balance.lastDeductedUtc` | timestamptz |

**Data-stage & meta**
| column | source | type |
| ---- | ---- | ---- |
| data_stage | derived (§5c) | text PRE/POST |
| has_live_location | `location != null` | boolean |
| dedup_key | derived (SHA-256 of flight+carrier+lastUpdatedUtc) | text UNIQUE |
| received_at | server time | timestamptz |
| payload_json | whole `flights[i]` raw | jsonb (audit) |

### 5c. `data_stage` determination (evidence-based)

Use the **strongest available signal**, not a guess:
1. If `.location` is present and non-null → **POST** (live ADS-B being reported).
2. Else if `.status` ∈ {Departed, EnRoute, Approaching, Arrived} → **POST**.
3. Otherwise → **PRE**.

We ALSO store `has_live_location` so the GNN phase can filter cleanly.

### 5d. `status_code` mapping (from PrePosFeat.md)

| code | value |
| ---- | ---- |
| 0 | Unknown |
| 1 | Expected |
| 2 | EnRoute |
| 3 | CheckIn |
| 4 | Boarding |
| 5 | GateClosed |
| 6 | Departed |
| 7 | Delayed |
| 8 | Approaching |
| 9 | Arrived |
| 10 | Canceled |
| 11 | Diverted |
| 12 | CanceledUncertain |

---

## 6. Store / dedup design (avoiding the v1–v2 duplicate-row mess)

- **One row per (flight, update)** — dedup key =
  `SHA-256(lower(flight_number) || '|' || lower(coalesce(carrier_iata,'')) || '|' || last_updated_utc)`.
- `flightDataPrePostStore_v3.ts` does an **upsert** (`INSERT ... ON CONFLICT (dedup_key)
  DO UPDATE`): repeated notifications update the same row instead of growing the table.
- The post-departure time-series comes from `location` updates changing
  `last_updated_utc` / `loc_reported_utc` → each new report = a new dedup_key = a new row.
- **No scheduled polling writes anywhere.** Only the webhook writes this table.
- Indexes: `(flight_number, dep_scheduled_utc)`, `(aircraft_reg)`, `(status)`.

---

## 7. Webhook endpoint rules (travnr.com)

- Register `POST /api/v1/webhooks/aerodatabox/:secret` in `routes_v3.ts`.
- **Always return 2xx within 10 seconds** — otherwise AeroDataBox retries and each
  retry costs 1 credit per flight. On validation failure: log it, still 2xx (400 only
  if the body is truly malformed — but 4xx/5xx triggers a costly retry).
- **Auth (DECISION — resolved):** the contract has NO signature field (verified in
  PrePosFeat.md). Use a **secret token in the URL path**:
  `:secret` = `AERODATABOX_WEBHOOK_SECRET` env var (a long random string). If the
  path secret doesn't match → 404 (not 403, so we don't advertise the route).
- `express.json()` is already configured globally (`server/index.ts:178`), so the
  body arrives parsed. Add a **size cap** (`limit: "2mb"`) — airport subscriptions
  can send many flights per notification.

---

## 8. THE STEP-BY-STEP SETUP (what we actually do next)

### Phase 0 — ✅ done (this session). Nothing to redo. Do NOT touch.

### Phase 1 — Subscription manager + manual smoke test

**Step 1.1 — Make sure the API key is set.**
- The repo has **no stored key** (verified: no `.env`, no hardcoded key; every call
  reads `process.env.AERODATABOX_API_KEY`).
- **Action needed:** add the key as `AERODATABOX_API_KEY` in **Replit Secrets** (the
  env where the app runs) — the key you already have (do not paste it into any repo
  file; it must only live in the secret store).
- (For local testing on this Mac: create a gitignored `.env` — add `.env` to
  `.gitignore` first. Do NOT commit the key.)

**Step 1.2 — Check balance (free call).**
```
curl -s -X GET "https://aerodatabox.p.rapidapi.com/subscriptions/balance" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com"
```
> **Verified 2026-08-09:** this returns **HTTP 200 with an EMPTY body** until you have
> refilled at least once (no balance record exists yet). That is expected — it does
> NOT mean the key is wrong (200 proves the key works). Initialize the balance with
> Step 1.3, then this returns `{ "creditsRemaining": N, "lastRefilledUtc": "...", "lastDeductedUtc": "..." }`.

**Step 1.3 — Refill credits (REQUIRED first time — this creates the balance).**
```
curl -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{ "credits": 5000 }'
```
> ⚠️ **Correction vs the older plan:** the body key is **`credits`** (not `amount`).
> 1 credit = 1 API unit (converted from your RapidAPI quota at refill time);
> 1 credit per flight item per notification.

**Step 1.4 — Create a subscription (free, credit-based).**
> ⚠️ The credit-based transition ended **2026-04-04** — `?useCredits=true` is now the
> default and the parameter is being removed. Do **not** include it.
>
> ⚠️ **Decision (2026-08-09):** use **`FlightByAirportIcao`** for bulk data — a
> `FlightByNumber` subscription covers **one flight only** (see RUNTIME VERIFICATION
> Finding 3). One airport subscription captures hundreds of domestic + international
> flights per day. Command for an airport:
```
curl -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://travnr.com/api/v1/webhooks/aerodatabox/<SECRET>", "maxDeliveryRetries": 2 }'
```
- `subjectType` = `FlightByAirportIcao` (volume — cost scales with how many flight
  items each notification carries) **or** `FlightByNumber` (a single specific flight,
  1 credit/flight — for verification only, not volume).
- `maxDeliveryRetries`: 0–2. **Recommend 2** — retries only fire on delivery failure
  (our endpoint down / >10s / non-2xx), each costs 1 credit/flight. Reliable endpoint
  → retries never fire.
- **Before subscribing, check coverage** (else you get no alerts):
  `GET https://aerodatabox.p.rapidapi.com/health/services/airports/{icao}/feeds`.

**Step 1.5 — Verify the subscription.**
```
curl -s -X GET "https://aerodatabox.p.rapidapi.com/subscriptions/webhook" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com"
```
and `GET .../subscriptions/webhook/{subscriptionId}` for one.

**Step 1.6 — Build `aerodataboxLimiter_v3.ts`** wrapping all of the above
(create / get / list / delete / refill / balance), serialized (one-at-a-time queue)
to avoid 429s. It will be the ONLY file allowed to make outbound AeroDataBox calls.

> **Smoke-test note:** AeroDataBox pushes to a **public HTTPS URL**. Locally on this
> Mac it can't reach `localhost`. Test options: (a) the deployed travnr.com/Replit
> app (preferred), or (b) a tunnel (ngrok/cloudflared) pointed at the local server.
> The endpoint must be live BEFORE creating subscriptions, or delivery fails (and
> retries burn credits).

### Phase 2 — Webhook ingress (the receiving side)

**Step 2.1 — Create `flightStatus_v3.ts`** with the zod schema that mirrors
PrePosFeat.md **exactly** (top-level `{ flights[], subscription, balance }`, all
field types + optional/nullable flags + enums). This is our validation gate.

**Step 2.2 — Create `routes_v3.ts`**:
- `POST /api/v1/webhooks/aerodatabox/:secret` — check secret → parse → validate →
  loop `flights[]` → extract → store → **respond 2xx within 10s** (respond BEFORE
  any slow work; kick off heavy work fire-and-forget if needed).
- Management endpoints (for the subscription manager UI / scripts):
  `POST /api/v1/subscriptions/webhook`, `GET /api/v1/subscriptions/balance`,
  `GET /api/v1/subscriptions/webhook`, `DELETE /api/v1/subscriptions/webhook/:id`,
  `POST /api/v1/subscriptions/balance/refill`.
- Wire it: `registerRoutes` in `server/routes.ts` already builds the express app
  passed to `registerRoutes(httpServer, app)` at `server/index.ts:267`. Add
  `registerV3Routes(app)` there (or export the v3 router and `app.use()` it).

**Step 2.3 — Local test:** POST a copy of the PrePosFeat.md sample payload to the
endpoint (curl to `localhost`), confirm 2xx + logged validation.

### Phase 3 — Extractor + store

**Step 3.1 — Create `0010_flight_data_pre_post.sql`** (DDL in §5b, **`clean` schema**:
`CREATE SCHEMA IF NOT EXISTS clean;` then `CREATE TABLE IF NOT EXISTS
clean.flight_data_pre_post ...`) and add it to `BOOT_MIGRATIONS` in `server/db.ts`
so it auto-applies on boot. Also add the table to `shared/schema.ts` via
`pgSchema("clean")` so `db.insert(...)` is type-safe.

**Step 3.2 — Create `flightNotificationExtractor_v3.ts`** implementing §5b + §5c +
§5d + dedup_key. Rules: every missing field → `null` (never 0); `utc` canonical;
`quality[]` preserved; `payload_json` = full raw flight item.

**Step 3.3 — Create `flightDataPrePostStore_v3.ts`** — `upsertFlight(data)` using
`ON CONFLICT (dedup_key) DO UPDATE SET ...` (drizzle `onConflictDoUpdate`).

**Step 3.4 — Verify extraction:** trigger a real webhook (create a subscription for
a live flight, e.g. `AA100` today), then:
```sql
SELECT flight_number, data_stage, status, dep_scheduled_utc, loc_lat, loc_lon,
       aircraft_reg, credits_remaining, received_at
FROM flight_data_pre_post ORDER BY received_at DESC LIMIT 20;
```
Check: no nulls where data existed; `data_stage` flips PRE→POST after wheels-up;
each notification with the same `lastUpdatedUtc` did NOT duplicate the row.

### Phase 4 — ❌ DEFERRED (heuristic). Skip until GNN has data.

### Phase 5 — Cutover / retire (later): remove commented v1 code + `_v2` ref files.

---

## 9. Model direction — GNN first (heuristic DEFERRED)

User decision (2026-08-08): **focus on the deep-learning / GNN model** — a more
specialized ML approach — before any heuristic.

- **Why GNN:** the post-departure trajectory problem is naturally graph-structured —
  flights, airports, and aircraft as nodes/edges (delays propagate through the
  network; tail-number chaining links legs). A GNN is the right tool for that.
- **What it needs:** clean, raw, time-ordered data from `flightDataPrePost`
  (esp. `aircraft_reg`, `dep_scheduled_utc`, `loc_*` sequence per flight).
- **Heuristic:** stays as notes (`AugMLtest/HeuristicModelNotes.md`). Build only if
  the GNN path stalls or we need a cheap baseline to compare against. Do not spend
  time here now.

---

## 10. Open decisions (reduced)

1. ~~Shutdown scope~~ ✅ Resolved 2026-08-08 (all live writes commented; only manual
   `simulate→alternatives` remains — tell us if you want that killed too).
2. ~~Auth~~ ✅ Resolved: secret token in URL path (`AERODATABOX_WEBHOOK_SECRET`).
3. ~~utc + local~~ ✅ Resolved: utc primary (`timestamptz`), local optional text.
4. ~~payload_json retention~~ ✅ Resolved: keep for audit.
5. **`maxDeliveryRetries`** — 2 recommended (only costs on delivery failure).
6. **Subscription strategy for the 50k-row dataset (RESOLVED 2026-08-09)** — use
   `FlightByAirportIcao` across a mix of domestic + international hubs (see RUNTIME
   VERIFICATION Finding 3). Start with a few airports, verify delivery, then scale to
   ~20 airports. `FlightByNumber` only for single-flight verification.
7. **Server2 leftovers** ✅ RESOLVED 2026-08-08 — `package.json` `dev` now runs
   `tsx --watch server/index.ts`.
8. **Unit usage audit** — `apiCallTracker.ts` is disabled (reference copy). If we want
   per-call unit accounting again, re-wire a lightweight tracker. Until then, monitor
   via the RapidAPI dashboard → AeroDataBox → Usage.
9. **"Rescore all" / simulate on the agency dashboard** — leave the code, but avoid
   clicking them while building the webhook dataset (each run burns units on the live
   REST endpoints).

---

## 11. References / evidence

- `AugMLtest/PrePosFeat.md` — the full contract field docs (copied from the webhook docs).
- `AugMLtest/MLplanAugV1.md` — one-table / two-model plan + webhook endpoints.
- `AugMLtest/HeuristicModelNotes.md` — DEFERRED heuristic design notes.
- AeroDataBox official guide (credit-based billing): https://aerodatabox.com/flight-alert-api-2026/
- AeroDataBox docs: https://doc.aerodatabox.com/rapidapi.html#/operations/SubscribeWebhook
- Audit evidence (2026-08-08): all Phase 0 comment sites listed in §STATUS BANNER.
