# MLplanAugV1 — August ML direction (v9+): ONE webhook feed → ONE table → TWO models

> Written 2026-08-06. Updated 2026-08-06 (single-table design, corrected webhook
> endpoints). This is a **planning document** capturing the change of direction
> discussed in `MDplan/prepostdepthts.md` and the conversation that produced it.
> It is NOT a spec yet — it is the assistant's best attempt to write down the
> user's thinking so we agree on where we're going before we build.
>
> Company / host: **travnr.com**. Every AeroDataBox webhook subscription will
> point back at `https://travnr.com/...`.
>
> TL;DR: **We were doing ML wrong.** We trained ONE model on pre-departure
> features only, and we collected data by polling AeroDataBox every hour
> (wasteful, messy DB). The new plan:
> 1. **Stop polling. Use the AeroDataBox Flight Alert WEBHOOK** (push, only on
>    change — no more hourly extraction).
> 2. **The webhook gives us BOTH pre-departure AND post-departure data** in one
>    notification payload (scheduled/revised/predicted times AND live ADS-B
>    position/speed/altitude).
> 3. **Collect everything into ONE table: `flightDataPrePost`.**
> 4. **In the ML phase, use only the relevant features per model:** pre-departure
>    features for the pre-departure model, post-departure features for the
>    post-departure model — respectively and appropriately.
> 5. Plus a **feedback loop** connecting the two models via the tail number.

---

## 1. The core realization: two different problems, two different models

There are **two distinct prediction questions** and they need **different data,
different features, and different targets**:

### 1a. PRE-departure model (the one we've been building: v1–v8)

**Question it answers:** *"Will my flight be cancelled, or will it still depart
(and how late)?"*

**When it runs:** from booking/monitoring until wheels-up (the 1–12h warning
window our v1–v8 pipeline already uses).

**Features:** pre-departure features only — flight number, carrier, route,
scheduled/revised/predicted times, carrier health, origin/destination weather,
NAS ground stops, historical OTP, tail number/equipment, filed flight plan.
**No trajectory, no live position** (that data doesn't exist yet pre-departure).

**Target:** cancelled / departed / delayed-by-X (our existing v1–v8 label
definition: disrupted = ≥15min late OR cancelled).

### 1b. POST-departure model (new — we have never built this)

**Question it answers:** *"When will the plane actually arrive at the
destination, and will live events during the flight change the trajectory /
cause extra delay?"*

**When it runs:** from wheels-up until touchdown.

**Features:** **post-departure features only** — the live ADS-B data that only
exists AFTER departure: latitude, longitude, altitude, pressure altitude,
ground speed, vertical speed (vsiFpm), true track, reportedAtUtc. Plus whatever
pre-departure context is still relevant (route, destination weather, inbound
delay).

**Target:** predicted arrival time vs scheduled arrival (arrival delay), and/or
expected ETA updates as the flight progresses.

**Why they must be separate models:** the feature sets barely overlap, the
targets are different, and the model stages run at different times. One model
can't do both (this was the user's explicit realization).

---

## 2. ONE webhook = BOTH pre-departure AND post-departure data

**Key fact (confirmed from the AeroDataBox webhook payload):** a single
`FlightNotificationContract` notification contains **both** halves:

- **Pre-departure fields** — `departure` and `arrival` blocks with
  `scheduledTime`, `revisedTime`, `predictedTime`, `runwayTime`, `terminal`,
  `checkInDesk`, `gate`, `baggageBelt`, `runway`, `quality[]`; the airport
  identity (icao/iata/name/location/timeZone); `flightPlan` (flightRules,
  route, requested/assigned altitude + airspeed); `number`, `callSign`,
  `status`, `codeshareStatus`, `isCargo`, `airline`, `aircraft.reg` (tail
  number), `aircraft.modeS`, `aircraft.model`, `greatCircleDistance`,
  `notificationSummary`, `notificationRemark`, `lastUpdatedUtc`.
- **Post-departure fields (live ADS-B)** — the `location` block:
  `pressureAltitude`, `altitude`, `pressure`, `groundSpeed` (kt),
  `trueTrack`, `vsiFpm`, `reportedAtUtc`, `lat`, `lon`.

Because one webhook carries both, **we do NOT need a second ADS-B source**
(OpenSky / ADS-B Exchange are no longer required — see §4).

---

## 3. The single collection table: `flightDataPrePost`

**Design principle: collect everything, split later.**

- **One table, one row per flight-notification event** — both stages saved
  together, because they arrive in the same payload.
- A **`dataStage` marker** (or timestamp + live-flag) tags each event as
  `PRE` or `POST` so the ML phase can select features per model.
- **Pre columns:** flight number, carrier (iata/icao/name), callSign, status,
  codeshareStatus, isCargo, departure/arrival airport (icao, iata, name,
  timeZone, lat, lon), scheduled/revised/predicted/runway times (utc + local)
  for both departure and arrival, departure terminal/gate/checkInDesk/
  baggageBelt/runway, arrival terminal/gate/baggageBelt/runway, quality[],
  flightPlan (flightRules, route, requested+assigned altitude & airspeed),
  aircraft.reg (tail number), aircraft.modeS, aircraft.model, greatCircleDistance
  (km/nm/feet), notificationSummary, notificationRemark, lastUpdatedUtc.
- **Post columns:** lat, lon, altitude, pressureAltitude, pressure,
  groundSpeed, trueTrack, vsiFpm, reportedAtUtc.
- **ML phase rule (the user's instruction):**
  - PRE-departure model → read **only** `dataStage='PRE'` features.
  - POST-departure model → read **only** `dataStage='POST'` features.
  - Use each stage's features for that stage's prediction, respectively and
    appropriately. No mixing.
- **Tail number (`aircraft.reg`) is the key join key** — it links the inbound
  leg's POST outcome to the outbound leg's PRE prediction (the feedback loop,
  §5).

---

## 4. Webhook API (travnr.com) — the exact endpoints

### The three endpoints we use

| Method | URL | Purpose |
| ---- | ---- | ---- |
| **POST** | `https://aerodatabox.p.rapidapi.com/subscriptions/webhook/{subjectType}/{subjectId}` | **Create** a webhook subscription |
| **GET** | `https://aerodatabox.p.rapidapi.com/subscriptions/webhook/{subscriptionId}` | **Fetch / check** a subscription |
| **POST** | `https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill` | **Refill** webhook credit balance |

**Create a subscription:**
```
POST https://aerodatabox.p.rapidapi.com/subscriptions/webhook/{subjectType}/{subjectId}
{
  "url": "https://travnr.com/api/v1/webhooks/aerodatabox",
  "maxDeliveryRetries": 2
}
```
- `subjectType` = `FlightByNumber` or `FlightByAirportIcao`
- `subjectId` = e.g. `AA100` (flight) or `KORD` (airport)

**Refill the balance** (before creating subscriptions and whenever it hits 0):
```
POST https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill
{ "amount": 6000 }
```

### The notification payload (what travnr.com receives)

POST → `https://travnr.com/api/v1/webhooks/aerodatabox` — a
`FlightNotificationContract`:

```
{
  "flights": [
    {
      "notificationSummary": "string",
      "notificationRemark": "string",
      "greatCircleDistance": { "meter": 0, "km": 0, "mile": 0, "nm": 0, "feet": 0 },
      "departure": {                       // PRE-departure
        "airport": { "icao", "iata", "localCode", "name", "shortName",
                     "municipalityName", "location": { "lat", "lon" },
                     "countryCode", "timeZone" },
        "scheduledTime": { "utc", "local" },
        "revisedTime":   { "utc", "local" },
        "predictedTime": { "utc", "local" },
        "runwayTime":    { "utc", "local" },
        "terminal", "checkInDesk", "gate", "baggageBelt", "runway",
        "quality": [ "Basic" ]
      },
      "arrival": { ... same shape as departure ... },   // PRE-departure
      "flightPlan": {                                     // PRE-departure
        "flightRules": "IFR", "flightType": "Other", "revisionNo": 0,
        "status": "Proposed", "route": "string",
        "altitude": { "requested": { "meter","km","mile","nm","feet" },
                      "assigned": { ... } },
        "airspeed":  { "requested": { "kt","kmPerHour","miPerHour","meterPerSecond" },
                       "assigned": { ... } },
        "lastUpdatedUtc": "2019-08-24T14:15:22Z"
      },
      "lastUpdatedUtc": "2019-08-24T14:15:22Z",
      "number": "string",                  // flight number
      "callSign": "string",
      "status": "Unknown",
      "codeshareStatus": "Unknown",
      "isCargo": true,
      "aircraft": {                         // tail number = aircraft.reg
        "reg": "string", "modeS": "string", "model": "string",
        "image": { "url", "webUrl", "author", "title", "description",
                   "license", "htmlAttributions": [] }
      },
      "airline": { "name": "string", "iata": "string", "icao": "string" },
      "location": {                         // POST-departure (live ADS-B)
        "pressureAltitude": { "meter","km","mile","nm","feet" },
        "altitude":        { "meter","km","mile","nm","feet" },
        "pressure":        { "hPa","inHg","mmHg" },
        "groundSpeed":     { "kt","kmPerHour","miPerHour","meterPerSecond" },
        "trueTrack":       { "deg","rad" },
        "vsiFpm": 0,
        "reportedAtUtc": "2019-08-24T14:15:22Z",
        "lat": -90,
        "lon": -180
      }
    }
  ],
  "subscription": {
    "id": "497f6eca-...", "isActive": true, "billingType": "LifetimeBased",
    "activateBeforeUtc": "...", "expiresOnUtc": "...", "createdOnUtc": "...",
    "subject": { "type": "FlightByNumber", "id": "string" },
    "subscriber": { "type": "string", "id": "string" },
    "notices": [ "string" ]
  },
  "balance": {
    "creditsRemaining": 0, "lastRefilledUtc": "...", "lastDeductedUtc": "..."
  }
}
```

**Ingest rule for our endpoint:** parse `flights[]` (only the **updated**
flights), tag each with `dataStage` PRE/POST, and write every field above into
`flightDataPrePost`. Reply **2xx within 10 seconds** or delivery is retried
(retries cost credits).

### Webhook behavior facts (important for design)
- **1 credit per flight item per notification.** Airport subscriptions can
  include 5+ flights per notification → drain balance fast. **Prefer
  flight-by-number subscriptions** to control cost.
- Balance is **shared across all subscriptions**; when it hits 0 all webhooks
  pause until refilled.
- Notifications are **best-effort**: may be missing or delayed; retries only if
  `maxDeliveryRetries` set.
- Covers updates from **6 hours ago to 72 hours in the future**.
- Coverage depends on ADS-B/live-updates coverage at the airport — check
  `/health/services/airports/{icao}/feeds` before subscribing.
- Our receiving host is **travnr.com** (that is the company/domain we point
  every subscription's `url` at).

### Management endpoints (for code to self-maintain)
- `GET /subscriptions/webhook/balance` — check remaining credits.
- `GET /subscriptions/webhook` — list active subscriptions.
- `DELETE /subscriptions/webhook/{subscriptionId}` — unsubscribe.

---

## 5. The feedback loop (pre ↔ post models, via tail number)

The user's key insight: **a flight is a link in a chain.**
- **Tail number connects flights:** the same aircraft flies leg A, then leg B.
  If it's late on leg A, leg B is late (post-departure outcome of leg A feeds
  the **pre-departure** prediction of leg B).
- **Post-departure feeds pre-departure:** the post model's live ETA for the
  inbound aircraft becomes an input to the pre model for the outbound flight
  using that aircraft. `aircraft.reg` in every webhook event is the join key.

**Design sketch:** `flightDataPrePost` is keyed/queryable by tail number; the
post model writes predicted arrival + actual arrival; the pre model reads the
inbound leg's predicted/actual arrival as a feature. (v9+ design item.)

---

## 6. Data sources (updated — simpler than before)

| Data need | Source | Cost | Notes |
| ---- | ---- | ---- | ---- |
| PRE + POST flight data (both stages) | **AeroDataBox Flight Alert WEBHOOK** (push, not polling) | 1 credit per flight item per alert | One feed supplies BOTH models; collected into `flightDataPrePost`. |
| Weather | **NOAA Aviation Weather Center (AWC) API** | — | For both models. |
| ~~POST-departure ADS-B~~ | ~~OpenSky Network~~ | — | **NOT NEEDED** — webhook `location` block already gives live position/speed/altitude. |
| ~~POST-departure ADS-B~~ | ~~ADS-B Exchange~~ | — | **NOT NEEDED** (same reason). |
| PRE-departure rich data | ~~FlightAware Aero API~~ | ~~$100/mo~~ | **Rejected by user**; AeroDataBox webhook covers it. |

---

## 7. What "makes us different" (user's question: everyone uses the same APIs)

Everyone pulling from FlightAware/AeroDataBox sees the same raw data. What
differentiates Travnr:
- **The two-model split + the feedback loop** (tail-number chaining is genuinely
  harder for competitors to copy cheaply).
- **One clean collection table** (`flightDataPrePost`) with honest stage labels —
  no JSONB blobs, no duplicate poll rows (the v1–v8 mess).
- **Focused feature engineering** — tail number / equipment / inbound-aircraft
  state as first-class features (the user flagged tail number as very important).
- **Better label quality** — the v1–v8 saga taught us honest labels matter more
  than clever math. Clean, terminal-evidence labels + walk-forward validation is
  a real edge when competitors quote inflated random-split AUCs.
- Possibly **specialized deep learning** for the post-departure trajectory model
  (sequences of ADS-B points are a natural fit for an RNN/transformer; v7 showed
  DNN loses on *small tabular* pre-departure data, but trajectory is time-series,
  where NNs genuinely shine).

---

## 8. Reference material

- `MDplan/prepostdepthts.md` — the full notes: two-model realization, webhook
  API docs, chained-predictions paper link
  (`https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf`).
- `ml_analysis/TRAVNR_ML.md` — v1–v8 history. **NOTE: `ml_analysis/` is archived
  to the `trash` branch** (moved 2026-08-06 along with `server2/`); fetch the
  trash branch for these docs.
- AeroDataBox API docs: `https://doc.aerodatabox.com/rapidapi.html#/`
- AeroDataBox flight-alert guide: `https://aerodatabox.com/flight-alert-api-2026/`

---

## 9. Next steps

1. **DEEP INVESTIGATION (the next task):** inventory every file that currently
   does AeroDataBox POLLING and plan the switch to the webhook. Polling is NOT
   changed yet — only commented out. Files to investigate (current state):
   - `server/lib/disruption/aerodataboxLimiter.ts` (+ `_v2`) — serial queue /
     rate limiter for every AeroDataBox call.
   - `server/lib/disruption/flightStatus.ts` (+ `_v2`) — flight-by-number fetch.
   - `server/lib/disruption/historicalOtp.ts` — `history/recent` OTP fetch.
   - `server/lib/disruption/monitor.ts` (+ `_v2`) — the polling engine.
   - `server/lib/disruption/testFlightSeeder.ts` (+ `_v2`) — airport-departures
     fetch + seed.
   - `server/lib/disruption/alertSender.ts` — alert email/SMS on status change.
   - `server/lib/disruption/apiCallTracker.ts` — API usage/cost tracking.
   - `server/routes.ts` (+ `_v2`) — rescore endpoints / dashboard that call
     AeroDataBox on demand.
   → Replace the poll logic with a **webhook listener** + **subscription
   manager** (create/refill/get/list/delete) pointing at travnr.com.
2. **Define the `flightDataPrePost` table schema** (pre + post columns,
   `dataStage` marker, tail-number index) + migration.
3. **Build `POST /api/v1/webhooks/aerodatabox`** on travnr.com: validate +
   ingest `FlightNotificationContract` → write rows into `flightDataPrePost`.
4. **Subscription manager**: create/refill/list/delete; credit balance tracking;
   refill when balance runs low.
5. **Shut down polling for good** (already commented out) and remove the
   extraction code once the webhook is proven.
6. Only then: **data collection** (both stages into `flightDataPrePost`), then
   pre-departure model v9 and the first-ever post-departure model.
