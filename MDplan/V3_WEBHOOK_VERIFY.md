# V3 Webhook — Setup & Verification (run these on Replit)

> Created 2026-08-08. Terminal commands to confirm the AeroDataBox webhook pipeline
> works after pulling the v3 code. Companion to `MDplan/V3_WebhookExtractionPlan.md`.
>
> All commands run in the Replit **Shell** (`~/workspace`). The app runs on port 5000.

---

## 0. Pull the code

```bash
git pull origin main
```

The `[postMerge]` hook auto-runs `npm install` + `npm run db:push`. Watch the output —
it should end without errors.

## 1. Confirm the secrets are present (no value printed, just yes/no)

```bash
echo "AERODATABOX_API_KEY set: ${AERODATABOX_API_KEY:+YES}"
echo "AERODATABOX_WEBHOOK_SECRET set: ${AERODATABOX_WEBHOOK_SECRET:+YES}"   # optional
echo "DATABASE_URL set: ${DATABASE_URL:+YES}"
```

- `AERODATABOX_API_KEY` **must** be YES.
- `AERODATABOX_WEBHOOK_SECRET` is optional. If YES, every command below that hits
  the webhook or the management endpoints needs the extra bits in ⚠️ notes.
- If any are not set, add them in **Replit → Secrets** and restart the app.

## 2. Build the public app URL

```bash
APP_URL="https://$(echo $REPLIT_DOMAINS | cut -d, -f1)"
echo "APP_URL=$APP_URL"
echo "expected webhook URL = $APP_URL/api/v1/webhooks/aerodatabox"
```

This is the URL the server auto-builds for subscriptions (same logic as Stripe).

## 3. Start the app

Click the **Run** button (or):

```bash
npm run dev
```

Confirm in the log:

```
[migrations] applied 0010_flight_data_pre_post.sql
serving on port 5000
```

## 4. Confirm the table exists (clean schema)

```bash
psql "$DATABASE_URL" -c "\dt clean.*"
psql "$DATABASE_URL" -c "SELECT count(*) AS rows FROM clean.flight_data_pre_post;"
```

You should see `flight_data_pre_post` in the clean schema (and 0 rows — the webhook
hasn't written anything yet; only the webhook writes to it).

## 5. Check the alert credit balance (free)

> **Run this DIRECTLY against AeroDataBox** (not through our app) and use `-i` so you
> can see the raw HTTP status + body. Before, this command "gave no output" — that
> was our app's wrapper hiding the real response. Directly you always see something.

```bash
curl -i -s -X GET "https://aerodatabox.p.rapidapi.com/subscriptions/balance" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
```

Expected:
- **`HTTP/2 200` + EMPTY body** → normal the **first time** (no balance record yet; key works). Go to Step 6 and refill.
- **`HTTP/2 200` + body** `{"creditsRemaining":N,"lastRefilledUtc":"...","lastDeductedUtc":"..."}` → balance exists. `N` is your alert credit balance.
- Anything with `401/403` → key problem.

The same check through our app (returns `{"balance":...}` or a helpful message now):

```bash
curl -s "$APP_URL/api/v1/subscriptions/balance"
```

⚠️ If `AERODATABOX_WEBHOOK_SECRET` is set, add `-H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET"` to the app call.

## 6. Refill credits (REQUIRED first time — this creates the balance)

> Same lesson: run it **directly** with `-i`. The refill you ran before went through
> our app and printed nothing — you'll now see the real AeroDataBox response.

```bash
curl -i -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"credits":5000}'
```

Expected: **`HTTP/2 200`** + body `{"creditsRemaining":5000,"lastRefilledUtc":"...","lastDeductedUtc":null}`.

- **1 credit = 1 API unit** from your RapidAPI quota (Ultra plan = 60,000 units/mo).
- 1 credit is spent per **flight item** per notification, so ~50k credits ≈ your whole
  50k-row dataset. 5,000 is a safe first fill.
- After this, Step 5 returns a real balance.

Or through our app:

```bash
curl -s -X POST "$APP_URL/api/v1/subscriptions/balance/refill" \
  -H "Content-Type: application/json" \
  -d '{"credits":5000}'
```

⚠️ + `-H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET"` if the secret is set.

## 7. Create airport subscriptions — CAPTURE ALL FLIGHTS, not one (this IS the right way)

**Yes — we want all/as many flights as we can.** An **airport** subscription is how you
get that. A `FlightByNumber` subscription is ONLY a single-flight test; it is NOT what
we use for the dataset.

| `subjectType` | `subjectId` | What it captures |
| ---- | ---- | ---- |
| `FlightByAirportIcao` | e.g. `KJFK` | **ALL flights** departing + arriving that airport — continuously, as their status changes. Cost = **1 credit per flight item** per notification. ← **THE one we use** |
| `FlightByNumber` | e.g. `AA100` | **ONE specific flight only** until it lands. 1 credit/notification. For single-flight testing only. |

More airports = more flights. Subscribe to a mix of busy domestic + international hubs
(they never expire; add/rotate over time to sample different routes).

**Step 7a — subscribe to your first airport (through our app, it sets the webhook URL automatically):**

```bash
curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook" \
  -H "Content-Type: application/json" \
  -d '{"subjectType":"FlightByAirportIcao","subjectId":"KJFK","maxDeliveryRetries":2}'
```

⚠️ + `-H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET"` if the secret is set.

Expected: `{"subscription":{"id":"<uuid>","isActive":true,"billingType":"CreditBased",...}}`
Check the `url` in the response — it must equal `$APP_URL/api/v1/webhooks/aerodatabox`
(or `.../aerodatabox/<secret>` if set). If it points at `localhost`/wrong domain, stop
and fix `WEBHOOK_BASE_URL` / `REPLIT_DOMAINS`.

> If the app call prints nothing/errors, run the SAME create directly so you see the
> raw AeroDataBox error:
> ```bash
> curl -i -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK" \
>   -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
>   -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
>   -H "Content-Type: application/json" \
>   -d "{\"url\":\"$APP_URL/api/v1/webhooks/aerodatabox\",\"maxDeliveryRetries\":2}"
> ```

**Step 7b — confirm KJFK has live coverage before scaling (free):**

```bash
curl -s "https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/feeds" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
```

**Step 7c — once KJFK works, add the rest in one go (domestic + international mix):**

```bash
for icao in KJFK KLGA KLAX KORD KATL KDFW KSFO KSEA KMIA KIAD EGLL LFPG EHAM EDDF EDDM OMDB WSSS RJTT RJAA; do
  echo "== $icao =="
  curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook" \
    -H "Content-Type: application/json" \
    -d "{\"subjectType\":\"FlightByAirportIcao\",\"subjectId\":\"$icao\",\"maxDeliveryRetries\":2}"
  echo
done
```

**Credit math to sanity-check:** every flight produces ~10–30 rows over its lifecycle
(each status/position change = one row = one flight item = ~1 credit). ~19 airports ×
1–2k flights/day reaches tens of thousands of rows in a few days at roughly
1 unit/row — well inside the 60k-unit Ultra quota. Watch the `balance` block inside
each notification and `GET .../subscriptions/balance`; refill before it hits 0 (all
subscriptions pause at 0).

## 8. List / inspect / delete subscriptions (free)

```bash
curl -s "$APP_URL/api/v1/subscriptions/webhook"
curl -s "$APP_URL/api/v1/subscriptions/webhook/<SUBSCRIPTION_ID>"
curl -s -X DELETE "$APP_URL/api/v1/subscriptions/webhook/<SUBSCRIPTION_ID>"
```

⚠️ + `-H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET"` if the secret is set.

## 9. Test the webhook ingress locally (no AeroDataBox call needed)

Send a sample `FlightNotificationContract` straight to the endpoint to confirm it
acks in 2xx and logs:

```bash
curl -s -X POST "$APP_URL/api/v1/webhooks/aerodatabox" \
  -H "Content-Type: application/json" \
  -d '{
    "flights": [
      {
        "notificationSummary": "AA100 departed",
        "greatCircleDistance": { "meter": 120000, "km": 120, "mile": 74.5, "nm": 64.8, "feet": 393700 },
        "departure": {
          "airport": { "icao": "KORD", "iata": "ORD", "name": "Chicago O'\''Hare", "location": { "lat": 41.9742, "lon": -87.9073 }, "countryCode": "US", "timeZone": "America/Chicago" },
          "scheduledTime": { "utc": "2026-08-08T14:15:00Z", "local": "2026-08-08T09:15:00-05:00" },
          "revisedTime": { "utc": "2026-08-08T14:30:00Z", "local": "2026-08-08T09:30:00-05:00" },
          "terminal": "1", "gate": "C16", "quality": ["Basic"]
        },
        "arrival": {
          "airport": { "icao": "KJFK", "iata": "JFK", "name": "John F. Kennedy", "location": { "lat": 40.6413, "lon": -73.7781 }, "countryCode": "US", "timeZone": "America/New_York" },
          "scheduledTime": { "utc": "2026-08-08T17:50:00Z", "local": "2026-08-08T13:50:00-04:00" },
          "quality": ["Basic"]
        },
        "lastUpdatedUtc": "2026-08-08T14:31:00Z",
        "number": "AA100",
        "callSign": "AAL100",
        "status": "Departed",
        "codeshareStatus": "IsOperator",
        "isCargo": false,
        "aircraft": { "reg": "N101NN", "modeS": "A1B2C3", "model": "A321" },
        "airline": { "name": "American Airlines", "iata": "AA", "icao": "AAL" },
        "location": {
          "altitude": { "feet": 10000 }, "groundSpeed": { "kt": 280 },
          "trueTrack": { "deg": 90 }, "vsiFpm": 1500,
          "reportedAtUtc": "2026-08-08T14:31:00Z", "lat": 41.8, "lon": -87.5
        }
      }
    ],
    "subscription": { "id": "00000000-0000-0000-0000-000000000000", "isActive": true, "billingType": "CreditBased", "subject": { "type": "FlightByNumber", "id": "AA100" }, "subscriber": { "type": "web-hook", "id": "https://travnr.com" } },
    "balance": { "creditsRemaining": 1000, "lastRefilledUtc": "2026-08-08T00:00:00Z", "lastDeductedUtc": null }
  }'
```

⚠️ If `AERODATABOX_WEBHOOK_SECRET` is set, the path is
`.../api/v1/webhooks/aerodatabox/$AERODATABOX_WEBHOOK_SECRET` instead.

Expected: `{"received":true,"flights":1}` and a log line like
`[adb-v3-webhook] received flights=1 subscription=000... credits=1000 firstFlight=AA100`.

> ⚠️ **Phase 2/3 not built yet:** this endpoint currently acks + logs only. It does
> NOT write rows yet. To confirm real extraction into `clean.flight_data_pre_post`,
> wait until the extractor + store are deployed, then:
> ```sql
> SELECT flight_number, status, data_stage, dep_scheduled_utc, aircraft_reg, credits_remaining, received_at
> FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 10;
> ```

## 10. Watch a real notification land

Keep the app running. When AeroDataBox detects a status change on your subscribed
flight, it POSTs to your endpoint. Watch the log:

```
[adb-v3-webhook] received flights=1 subscription=<uuid> credits=<n> firstFlight=AA100
```

The `credits` count should decrease by 1 per flight per notification — that is the
expected cost (1 credit / flight / alert).

## If something fails

| Symptom | Check |
| ---- | ---- |
| balance call returns empty / no body (HTTP 200) | **Expected the first time** — no balance record yet. Run Step 6 refill once to create it. The empty 200 means the key works. |
| balance call fails / 401 | `AERODATABOX_API_KEY` secret; the key must belong to the RapidAPI plan that includes the Flight Alert API (newest pricing plan). |
| create subscription returns an error | plan must be on the latest pricing (webhook endpoints are new); confirm `subjectId` is a valid ICAO (airport) or flight number. |
| webhook URL points at localhost | set `WEBHOOK_BASE_URL` secret, or confirm `REPLIT_DOMAINS` / custom domain. |
| 0 alerts after subscribing | airport/flight outside ADS-B/live coverage — check `/health/services/airports/{icao}/feeds` (free), or the flight isn't operating. |
| `x-webhook-secret` 403 | the management endpoints require the header matching `AERODATABOX_WEBHOOK_SECRET`. |
| "Why is my unit quota dropping?" | Units are the monthly REST quota, spent ONLY by on-demand UI actions (search / rescore / simulate / dashboard "Rescore all") — nothing runs in the background. The webhook spends **credits**, not units. See `V3_WebhookExtractionPlan.md` RUNTIME VERIFICATION Finding 2. |

Coverage check (free):

```bash
curl -s "https://aerodatabox.p.rapidapi.com/health/services/airports/KORD/feeds" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com"
```

---

## Cost reminder — two separate billing systems

- Create / list / get / delete subscription, get balance: **free**.
- Refill: **1 API unit per credit** (converts your RapidAPI quota into alert credits).
- Notification delivered: **1 credit per flight item** (retry = same again).
- Balance is shared across all subscriptions; at 0, all pause until refilled.

**Units vs credits (why the quota shows ~24k used already):**
- **Units** = your monthly REST quota on RapidAPI (`x-ratelimit-api-units-remaining`
  in any response; Ultra plan = 60,000/mo). Spent by the on-demand endpoints
  (`/api/user/flights/search`, `/api/agency/flights/search`, rescore, simulate,
  dashboard **"Rescore all"**) and by refills. **Nothing runs in the background** —
  the polling engine is dead and no cron exists.
- **Credits** = the Flight Alert balance (separate system, doesn't expire). The
  webhook only ever spends credits.
- Monitor units at **RapidAPI dashboard → AeroDataBox → Usage** (per-endpoint
  breakdown). The webhook dataset (~1 unit/row) fits easily in the 60k-unit quota.
