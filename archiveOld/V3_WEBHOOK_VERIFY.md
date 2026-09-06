# V3 Webhook — Setup & Verification (run these on Replit)

> Created 2026-08-08. Terminal commands to confirm the AeroDataBox webhook pipeline
> works after pulling the v3 code. Companion to `MDplan/V3_WebhookExtractionPlan.md`.
>
> All commands run in the Replit **Shell** (`~/workspace`). The app runs on port 5000.
>
> **NEW (2026-08-09): §10.5 Tier-rotating collection** — instead of subscribing to 20
> airports forever, run short budget-capped batches that rotate airports and stamp
> sampling metadata on every row. See `MDplan/V3_CollectionStrategy.md`.

---

## 0. Pull the code

```bash
git pull origin main
```

The `[postMerge]` hook auto-runs `npm install` + `npm run db:push`. Watch the output —
it should end without errors.

> ⚠️ **2026-08-10 fixes you MUST pull first:** two bugs were found and fixed —
> (1) the webhook 403'd on the CSRF middleware (fixed by registering v3 routes before
> CSRF), and (2) AeroDataBox rejects webhook URLs without an explicit port (now forced
> `:443`). The ingress also accepts the secret-less path now. **Pull before doing
> anything below.**



## 0.5 STOP CREDIT BLEED — list & delete any existing subscriptions first

> **Why:** your balance was being drained (deducted ~4,250 credits between Aug 9–10).
> Existing subscription(s) were delivering to `/api/v1/webhooks/aerodatabox`, which
> 403'd (CSRF) → every delivery counted as failed → charged credits (+ up to 2 retries
> each). Do this NOW, directly against AeroDataBox, before recreating:

```bash
curl -s "https://aerodatabox.p.rapidapi.com/subscriptions/webhook" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
```

For every `id` it returns, delete it (repeat for each id):

```bash
curl -i -s -X DELETE "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/<REAL_ID>" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
```

> ⚠️ **Must use the REAL id from the list output** — replace `<REAL_ID>` with the actual
> UUID (e.g. `fb346b6c-f1f2-4c6a-9638-a3ee15191151` for the KJFK sub found on
> 2026-08-10). Using the literal text `<ID>` fails with
> `400 {"errors":{"subscriptionId":["The value '<ID>' is not valid."]}}` and the bleed
> continues. Verify deletion worked by re-running the list (returns `[]`).

Re-check balance after — it should stop dropping:

```bash
curl -s "https://aerodatabox.p.rapidapi.com/subscriptions/balance" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
```

> If the balance KEEPS dropping with no subscriptions listed, you missed one — list
> again and delete everything until the list is `[]`.

## 0.6 Make sure the app is up + APP_URL is set BEFORE any app call

> **2026-08-10 lesson:** most "printed nothing" app calls happened because
> `$APP_URL` was EMPTY in that shell (a fresh terminal), so curl silently failed.
> AeroDataBox even echoed it back: `Web-hook URL must be a valid URL: :443/api/v1/...`
> — i.e. the domain was missing. Always run the app URL + create in ONE self-contained
> block, and confirm the app answers first:

```bash
APP_URL="https://$(echo $REPLIT_DOMAINS | cut -d, -f1)"
echo "APP_URL=$APP_URL"
echo "HTTP status: $(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/api/v1/subscriptions/balance")"
```

- `HTTP status: 200` → app is up and reachable → proceed.
- curl fails / status not 200 → the app is DOWN or not restarted on the new code.
  Restart it (`pkill -9 -f server/index.ts; npm run dev`) and re-run this block.



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
echo "expected webhook URL = $APP_URL:443/api/v1/webhooks/aerodatabox"
```

This is the URL the server auto-builds for subscriptions (same logic as Stripe).

> Note the `:443` — AeroDataBox rejects webhook URLs without an explicit port
> (`Web-hook URL port is not allowed: -1`), so the server now appends `:443`.



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

- `HTTP/2 200` **+ EMPTY body** → normal the **first time** (no balance record yet; key works). Go to Step 6 and refill.
- `HTTP/2 200` **+ body** `{"creditsRemaining":N,"lastRefilledUtc":"...","lastDeductedUtc":"..."}` → balance exists. `N` is your alert credit balance.
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

Expected: `HTTP/2 200` + body `{"creditsRemaining":5000,"lastRefilledUtc":"...","lastDeductedUtc":null}`.

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


| `subjectType`         | `subjectId`  | What it captures                                                                                                                                                      |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FlightByAirportIcao` | e.g. `KJFK`  | **ALL flights** departing + arriving that airport — continuously, as their status changes. Cost = **1 credit per flight item** per notification. ← **THE one we use** |
| `FlightByNumber`      | e.g. `AA100` | **ONE specific flight only** until it lands. 1 credit/notification. For single-flight testing only.                                                                   |


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
Check the `url` in the response — it must equal
`$APP_URL:443/api/v1/webhooks/aerodatabox` (or `.../aerodatabox/<secret>` if set).
If it's missing `:443`, points at `localhost`, or the wrong domain, stop and fix
`WEBHOOK_BASE_URL` / `REPLIT_DOMAINS`.

> If the app call prints nothing/errors, run the SAME create directly so you see the
> raw AeroDataBox error (note the explicit `:443` in the URL — REQUIRED):
>
> ```bash
> curl -i -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK" \
>   -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
>   -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
>   -H "Content-Type: application/json" \
>   -d "{\"url\":\"$APP_URL:443/api/v1/webhooks/aerodatabox\",\"maxDeliveryRetries\":2}"
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

> ✅ **Phase 3 built (2026-08-10):** this endpoint now VALIDATES + EXTRACTS + WRITES
> rows to `clean.flight_data_pre_post` (dedup upsert on `dedup_key`). The log line is now:
> `[adb-v3-webhook] received flights=N stored=M (new=X updated=Y) skipped=Z ...`.
> To confirm rows landed:
>
> ```sql
> SELECT flight_number, status, data_stage, dep_scheduled_utc, aircraft_reg, credits_remaining, received_at
> FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 10;
> ```



## 10. Watch a real notification land

Keep the app running. When AeroDataBox detects a status change on a subscribed
airport's flights, it POSTs to your endpoint. Watch the log — you want to see
**2xx acknowledgements, NOT 403s**:

```
[adb-v3-webhook] received flights=N subscription=<uuid> credits=<n> firstFlight=XXXX
```

The `credits` count should decrease by 1 per flight item per notification — that is
the expected cost (1 credit / flight / alert). If you instead see
`POST /api/v1/webhooks/aerodatabox 403`, the app is running OLD code — pull + restart.

## 10.5 Tier-rotating collection — run a batch (NEW 2026-08-09)

> Instead of "subscribe to 20 airports forever", run **short batches** that rotate
> airports across HUB / MID / REGIONAL tiers, budget-capped and auto-stopped. Every
> captured row is stamped with `sampling_batch_id` / `airport_tier` /
> `sampling_probability` / `sampling_weight` / `random_seed` / window. Full
> rationale: `MDplan/V3_CollectionStrategy.md`.

**Start a batch** (needs balance ≥ budget 4000 + reserve 5000 = 9000 credits):

```bash
curl -s -X POST "$APP_URL/api/v1/collection/start" -H "Content-Type: application/json" -d '{}'
```

Expected: `{"batch":{"batch_id":"B0001",...,"airports":["KJFK",...],"window_start":...,"window_end":...},"created":[...],"skipped":[]}`

⚠️ + `-H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET"` if the secret is set.

**See how much of the world we can touch (NEW — free covered-airports list):**

```bash
curl -s "$APP_URL/api/v1/collection/coverage"
```

Expected: `{"fetchedAt":"...","universeCount":<N>,"catalogCount":276,"catalogInUniverse":<M>,"byTier":[...],"universeNotInCatalog":[...],"worldScheduledCommercial":4072}`.
`universeCount` = how many airports AeroDataBox actually covers (the true ceiling —
the world has ~4,072 scheduled-commercial airports, NOT 50k; most of the 50k are
private strips with no flight data). `universeNotInCatalog` is your "could-add" list.
`?force=1` refreshes the 12h cache.

**Watch it collect** — the app log shows:
`[adb-v3-webhook] received flights=N stored=M (new=X updated=Y) skipped=Z ...`

**Check status / stop / diagnostics:**

```bash
curl -s "$APP_URL/api/v1/collection/status"
curl -s -X POST "$APP_URL/api/v1/collection/stop" -H "Content-Type: application/json" -d '{"reason":"manual_verify"}'
curl -s "$APP_URL/api/v1/collection/diagnostics"
```

`diagnostics` shows rows by tier / departure hour / delay bucket / status + per-batch
rows + total estimated credits — use it as the **bias dashboard** (tier shares should
spread, hours should spread, budget should be under control).

**Verify rows landed + are stamped:**

```bash
psql "$DATABASE_URL" -c "SELECT flight_number, airport_tier, sampling_batch_id, sampling_probability, sampling_weight, random_seed, data_stage FROM clean.flight_data_pre_post WHERE sampling_batch_id IS NOT NULL ORDER BY received_at DESC LIMIT 20;"
```

**Run another batch** — rotation automatically picks different airports (it avoids
the airports used in the last 2 batches). Budget math: ~4k credits/batch → ~12–15
batches/month inside the 60k units; auto-stop on `window_elapsed` / `budget_reached`.

Env knobs if you want to tune: `ADB_WINDOW_HOURS` (4), `ADB_BATCH_BUDGET` (4000),
`ADB_RESERVE_CREDITS` (5000), `ADB_TIER_MIX` (`{"HUB":1,"MID":2,"REGIONAL":2}`).

## If something fails


| Symptom                                                      | Check                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| balance call returns empty / no body (HTTP 200)              | **Expected the first time** — no balance record yet. Run Step 6 refill once to create it. The empty 200 means the key works.                                                                                                                                                |
| balance call fails / 401                                     | `AERODATABOX_API_KEY` secret; the key must belong to the RapidAPI plan that includes the Flight Alert API (newest pricing plan).                                                                                                                                            |
| create subscription returns an error                         | plan must be on the latest pricing (webhook endpoints are new); confirm `subjectId` is a valid ICAO (airport) or flight number.                                                                                                                                             |
| webhook URL points at localhost                              | set `WEBHOOK_BASE_URL` secret, or confirm `REPLIT_DOMAINS` / custom domain.                                                                                                                                                                                                 |
| 0 alerts after subscribing                                   | airport/flight outside ADS-B/live coverage — check `/health/services/airports/{icao}/feeds` (free), or the flight isn't operating.                                                                                                                                          |
| `x-webhook-secret` 403                                       | the management endpoints require the header matching `AERODATABOX_WEBHOOK_SECRET`.                                                                                                                                                                                          |
| webhook deliveries 403 in app log (`Invalid CSRF token`)     | old bug — **fixed 2026-08-10** (v3 routes now registered before the CSRF middleware). Pull the latest code and restart the app.                                                                                                                                             |
| create subscription → `Web-hook URL port is not allowed: -1` | webhook URL has no explicit port — **fixed 2026-08-10** (server now appends `:443`). Use the app's create endpoint (it builds the URL automatically), or add `:443` manually in the direct curl. |
| create subscription → `Web-hook URL must be a valid URL: :443/...` | `$APP_URL` was EMPTY in that shell (fresh terminal). Re-set it in the same command block: `APP_URL="https://$(echo $REPLIT_DOMAINS | cut -d, -f1)"`. |
| app calls print NOTHING | `$APP_URL` empty (set it first) OR the app is down. Check with §0.6's HTTP-status one-liner; restart the app if needed. |
| delete fails `400 The value '<ID>' is not valid` | you used the literal `<ID>` — paste the REAL id from the list output instead. |
| "Why is my unit quota dropping?"                             | Units are the monthly REST quota, spent ONLY by on-demand UI actions (search / rescore / simulate / dashboard "Rescore all") — nothing runs in the background. The webhook spends **credits**, not units. See `V3_WebhookExtractionPlan.md` RUNTIME VERIFICATION Finding 2. |


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

Results out put:
~/workspace$ echo "AERODATABOX_API_KEY set: ${AERODATABOX_API_KEY:+YES}"
echo "AERODATABOX_WEBHOOK_SECRET set: ${AERODATABOX_WEBHOOK_SECRET:+YES}"   # optional
echo "DATABASE_URL set: ${DATABASE_URL:+YES}"
AERODATABOX_API_KEY set: YES
AERODATABOX_WEBHOOK_SECRET set: 
DATABASE_URL set: YES
~/workspace$ APP_URL="https://$(echo $REPLIT_DOMAINS | cut -d, -f1)"
echo "APP_URL=$APP_URL"
echo "expected webhook URL = $APP_URL/api/v1/webhooks/aerodatabox"
APP_URL=[https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev](https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev)
expected webhook URL = [https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev/api/v1/webhooks/aerodatabox](https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev/api/v1/webhooks/aerodatabox)
~/workspace$ npm run dev 

> [rest-express@1.0.1](mailto:rest-express@1.0.1) dev
> NODE_ENV=development tsx --watch server/index.ts

[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[migrations] applied 0010_flight_data_pre_post.sql
[Duffel] Initialized (testMode=false)
node:events:502
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
    at Server.setupListenHandle [as _listen2] (node:net:1908:16)
    at listenInCluster (node:net:1965:12)
    at doListen (node:net:2139:7)
    at process.processTicksAndRejections (node:internal/process/task_queues:83:21)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1944:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
  address: '0.0.0.0',
  port: 5000
}

Node.js v20.20.0
Failed running 'server/index.ts'
~/workspace$ pkill -9 -f "server/index.ts" || kill -9 $(lsof -t -i:5000)
~/workspace$ npm run dev

> [rest-express@1.0.1](mailto:rest-express@1.0.1) dev
> NODE_ENV=development tsx --watch server/index.ts

[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[migrations] applied 0010_flight_data_pre_post.sql
[Duffel] Initialized (testMode=false)
12:59:20 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: [https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev](https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev)
Stripe data synced
12:59:29 AM [express] POST /api/v1/webhooks/aerodatabox 403 in 13ms body=32b

~/workspace$ psql "$DATABASE_URL" -c "\dt clean.*"
psql "$DATABASE_URL" -c "SELECT count(*) AS rows FROM clean.flight_data_pre_post;"
                 List of relations
 Schema |         Name          | Type  |  Owner  
--------+-----------------------+-------+----------
 clean  | flight_data_pre_post  | table | postgres
 clean  | monitored_flights_v2  | table | postgres
 clean  | risk_score_history_v2 | table | postgres
(3 rows)

##  rows 

```
0
```

(1 row)

~/workspace$ curl -i -s -X GET "[https://aerodatabox.p.rapidapi.com/subscriptions/balance](https://aerodatabox.p.rapidapi.com/subscriptions/balance)"   
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY"   
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
HTTP/2 200 
date: Mon, 10 Aug 2026 01:00:13 GMT
content-type: application/json; charset=utf-8
vary: Accept-Encoding
cache-control: no-store
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"[https://a.nel.cloudflare.com/report/v4?s=KqwQUtCraoIj1xbdIaKSbRkPbnZfDT2XVqzzQCUthnh2mNBthxDwYHurlKQHbC2DY%2FmG6%2BA8VSEfOc2LUxt1EZ%2BFRhniXr%2FgxlNpn87BtAoJVP%2FGy05uu5MV%2BMofzbZyFwjrEGyy"}]}](https://a.nel.cloudflare.com/report/v4?s=KqwQUtCraoIj1xbdIaKSbRkPbnZfDT2XVqzzQCUthnh2mNBthxDwYHurlKQHbC2DY%2FmG6%2BA8VSEfOc2LUxt1EZ%2BFRhniXr%2FgxlNpn87BtAoJVP%2FGy05uu5MV%2BMofzbZyFwjrEGyy"}]})
cf-cache-status: BYPASS
server-timing: total;dur=9.3
x-robots-tag: none
x-tier: Free Tier
vary: Accept-Encoding
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
alt-svc: h3=":443"; ma=86400
cf-ray: a28b0ff9fac323a3-PDX
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 25926
x-ratelimit-api-units-reset: 2164868
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 215690
x-ratelimit-requests-reset: 2164868
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 379ac4b5615823e089b0f0bd16fe07a2065b8bfd9b2d5286ed6ffb782e66938f
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"creditsRemaining":747,"lastRefilledUtc":"2026-08-09 10:55","lastDeductedUtc":"2026-08-10 00:59"}~/workspace$ curl -s "$APP_URL/api/v1/scurl -s "$APP_URL/api/v1/subscriptions/balance"
~/workspace$ curl -s "$APP_URL/api/v1/subscriptions/balance"
~/workspace$ curl -i -s -X POST "[https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill](https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill)"   
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY"   
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"   
  -H "Content-Type: application/json"   
  -d '{"credits":5000}'
HTTP/2 200 
date: Mon, 10 Aug 2026 01:01:12 GMT
content-type: application/json; charset=utf-8
vary: Accept-Encoding
cache-control: no-store
x-robots-tag: none
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"[https://a.nel.cloudflare.com/report/v4?s=mRNyshk2ZWRhTBWBcKP0nlGa6M3f%2BRxImGNCkyLAhP%2BnhFCpFE8KhFvJX5RRHDzkMAzMTFBA4V7876vqvAjkhBQrk0zGioI258tEWfRw5s0PEwlsjH4gkDtbidVpR6AdaQFHS4Ln"}]}](https://a.nel.cloudflare.com/report/v4?s=mRNyshk2ZWRhTBWBcKP0nlGa6M3f%2BRxImGNCkyLAhP%2BnhFCpFE8KhFvJX5RRHDzkMAzMTFBA4V7876vqvAjkhBQrk0zGioI258tEWfRw5s0PEwlsjH4gkDtbidVpR6AdaQFHS4Ln"}]})
server-timing: total;dur=23.5
cf-ray: a28b1166fc08c54c-PDX
vary: Accept-Encoding
alt-svc: h3=":443"; ma=86400
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
cf-cache-status: DYNAMIC
x-tier: Tier 1
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 20922
x-ratelimit-api-units-reset: 2164809
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 210690
x-ratelimit-requests-reset: 2164809
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 47c77d244d45cfa8733dd83c9fe9cd3802f665ebc495f99f8bac1c4e7c1bcb76
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"creditsRemaining":5744,"lastRefilledUtc":"2026-08-10 01:01Z","lastDeductedUtc":"2026-08-10 01:00"}~/workspace$ curl -s -X POST "$APP_URcurl -s -X POST "$APP_URL/api/v1/subscriptions/balance/refill"   
  -H "Content-Type: application/json"   
  -d '{"credits":5000}'
~/workspace$ curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook"   
  -H "Content-Type: application/json"   
  -d '{"subjectType":"FlightByAirportIcao","subjectId":"KJFK","maxDeliveryRetries":2}'
~/workspace$ curl -i -s -X POST "[https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK](https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK)"   
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY"   
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"   
  -H "Content-Type: application/json"   
  -d "{url:$APP_URL/api/v1/webhooks/aerodatabox,maxDeliveryRetries:2}"
HTTP/2 400 
date: Mon, 10 Aug 2026 01:02:03 GMT
content-type: application/json; charset=utf-8
cache-control: no-store
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server-timing: total;dur=2.1
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"[https://a.nel.cloudflare.com/report/v4?s=TQeixRROX4mzwpgdyGA77F0lsk23MtuQyUtg1NStaflhnE9bNR8Pun5fp9I09iifJgYRUys4kySZvnA5AjtLcP1e9kS8qBLdWSfe%2FV4iAHwLQzeXgBW8xCu8t%2F5LbmaanUZFB%2BEk"}]}](https://a.nel.cloudflare.com/report/v4?s=TQeixRROX4mzwpgdyGA77F0lsk23MtuQyUtg1NStaflhnE9bNR8Pun5fp9I09iifJgYRUys4kySZvnA5AjtLcP1e9kS8qBLdWSfe%2FV4iAHwLQzeXgBW8xCu8t%2F5LbmaanUZFB%2BEk"}]})
x-robots-tag: none
alt-svc: h3=":443"; ma=86400
cf-cache-status: DYNAMIC
vary: Accept-Encoding
cf-ray: a28b12a6eb68ef73-PDX
x-tier: Free Tier
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 210687
x-ratelimit-requests-reset: 2164758
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 20922
x-ratelimit-api-units-reset: 2164758
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 63a3ed50c9a7f4fb33da029990759a52c22021e4fa839827847b14d96dc7b995
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"message":"Web-hook URL port is not allowed: -1"}~/workspace$ curl -s "[https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/curl](https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/curl) -s "[https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/feeds](https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/feeds)"   
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY"   
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
{"flightSchedulesFeed":{"service":"FlightSchedules","status":"OK","minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"},"liveFlightUpdatesFeed":{"service":"FlightLiveUpdates","status":"OK"},"adsbUpdatesFeed":{"service":"AdsbUpdates","status":"OKPartial"},"generalAvailability":{"minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"}}~/workspace$ for icao in KJFK KLGA KLAX KORD KATL KDFW KSFO KSEA KMIA KIAD EGLL LFPG EHAM EDDF EDDM OMDB WSSS RJTT RJAA; d~/workspace$ for icao in KJFK KLGA KLAX KORD KATL KDFW KSFO KSEA KMIA KIAD EGLL LFPG EHAM EDDF EDDM OMDB WSSS RJTT RJAA; do
  echo "== $icao =="
  curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook"   
    -H "Content-Type: application/json"   
    -d "{subjectType:FlightByAirportIcao,subjectId:$icao,maxDeliveryRetries:2}"
  echo
done
== KJFK ==

== KLGA ==

== KLAX ==

== KORD ==

== KATL ==

== KDFW ==

== KSFO ==

== KSEA ==

== KMIA ==

== KIAD ==

== EGLL ==

== LFPG ==

== EHAM ==

== EDDF ==

== EDDM ==

== OMDB ==

== WSSS ==

== RJTT ==

== RJAA ==

~/workspace$ curl -s "$APP_URL/api/v1/subscriptions/webhook"
curl -s "$APP_URL/api/v1/subscriptions/webhook/"
curl -s -X DELETE "$APP_URL/api/v1/subscriptions/webhook/"
~/workspace$ curl -s "$APP_URL/api/v1/subscriptions/webhook"
curl -s "$APP_URL/api/v1/subscriptions/webhook/"
curl -s -X DELETE "$APP_URL/api/v1/subscriptions/webhook/"^C
~/workspace$ curl -s -X POST "$APP_URL/api/v1/webhooks/aerodatabox"   
  -H "Content-Type: application/json"   
  -d '{
    "flights": [
      {
        "notificationSummary": "AA100 departed",
        "greatCircleDistance": { "meter": 120000, "km": 120, "mile": 74.5, "nm": 64.8, "feet": 393700 },
        "departure": {
          "airport": { "icao": "KORD", "iata": "ORD", "name": "Chicago O''Hare", "location": { "lat": 41.9742, "lon": -87.9073 }, "countryCode": "US", "timeZone": "America/Chicago" },
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
    "subscription": { "id": "00000000-0000-0000-0000-000000000000", "isActive": true, "billingType": "CreditBased", "subject": { "type": "FlightByNumber", "id": "AA100" }, "subscriber": { "type": "web-hook", "id": "[https://travnr.com](https://travnr.com)" } },
    "balance": { "creditsRemaining": 1000, "lastRefilledUtc": "2026-08-08T00:00:00Z", "lastDeductedUtc": null }
  }'
~/workspace$ SELECT flight_number, status, data_stage, dep_scheduled_utc, aircraft_reg, credits_remaining, received_at
FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 10;
bash: SELECT: command not found
bash: FROM: command not found
~/workspace$ curl -s "[https://aerodatabox.p.rapidapi.com/health/services/airports/KORD/feeds](https://aerodatabox.p.rapidapi.com/health/services/airports/KORD/feeds)"   
  -H "x-rapidapi-key: $AERODATABOX_API_KEY"   
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com"
{"flightSchedulesFeed":{"service":"FlightSchedules","status":"OK","minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"},"liveFlightUpdatesFeed":{"service":"FlightLiveUpdates","status":"OK"},"adsbUpdatesFeed":{"service":"AdsbUpdates","status":"OKPartial"},"generalAvailability":{"minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"}}~/workspace$ 

Aug 9th, 6:11pm results output:
~/workspace$ curl -s "https://aerodatabox.p.rapidapi.com/subscriptions/webhook" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
[{"id":"fb346b6c-f1f2-4c6a-9638-a3ee15191151","isActive":true,"billingType":"CreditBased","createdOnUtc":"2026-08-09 10:56","subject":{"type":"FlightByAirportIcao","id":"KJFK"},"subscriber":{"type":"WebHook","id":"https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev/api/v1/webhooks/aerodatabox"},"notices":[]}]~/workspace$ curl -i -s -X DELETE "https://aerodacurl -i -s -X DELETE "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/<ID>" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
HTTP/2 400 
date: Mon, 10 Aug 2026 01:13:14 GMT
content-type: application/json; charset=utf-8
server-timing: total;dur=1.5
alt-svc: h3=":443"; ma=86400
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
vary: Accept-Encoding
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=R9onaQ7iV96AOAqiZKP7FM4vz7RPf6chUbiutgYyZo4OKGnN0v%2BtFQATKZOJhDPqU6HPO3Jetofb0UAhc3ClH%2FYaPAIZK%2FJ5CStREIeyA4Q4lh9rQ1OxMuBHMXJq73LlgMHPat6j"}]}
cf-cache-status: DYNAMIC
cf-ray: a28b23088ed6fef1-PDX
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 20921
x-ratelimit-api-units-reset: 2164087
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 210683
x-ratelimit-requests-reset: 2164087
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 25a72bb1fbda27a9362ff1e9a1f3bcbf409f013ee3288efcd5964d3215d4fe1f
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"errors":{"subscriptionId":["The value '<ID>' is not valid."]},"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"traceId":"00-e32ed553a1df7a74e07ffb0a5cf3490d-3b3d92dda5ccfa67-00"}~/workcurl -s "https://aerodatabox.p.rapidapi.com/subscriptions/balance" \ance" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
{"creditsRemaining":5600,"lastRefilledUtc":"2026-08-10 01:01","lastDeductedUtc":"2026-08-10 01:13"}~/workspace$ echo "AERODATABOX_API_KEYecho "AERODATABOX_API_KEY set: ${AERODATABOX_API_KEY:+YES}"
echo "AERODATABOX_WEBHOOK_SECRET set: ${AERODATABOX_WEBHOOK_SECRET:+YES}"             
echo "DATABASE_URL set: ${DATABASE_URL:+YES}"
AERODATABOX_API_KEY set: YES
AERODATABOX_WEBHOOK_SECRET set: 
DATABASE_URL set: YES
~/workspace$ APP_URL="https://$(echo $REPLIT_DOMAINS | cut -d, -f1)"
echo "APP_URL=$APP_URL"
echo "expected webhook URL = $APP_URL:443/api/v1/webhooks/aerodatabox"
APP_URL=https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
expected webhook URL = https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev:443/api/v1/webhooks/aerodatabox
~/workspace$ 
~/workspace$ psql "$DATABASE_URL" -c "\dt clean.*"
psql "$DATABASE_URL" -c "SELECT count(*) AS rows FROM clean.flight_data_pre_post;"
                 List of relations
 Schema |         Name          | Type  |  Owner   
--------+-----------------------+-------+----------
 clean  | flight_data_pre_post  | table | postgres
 clean  | monitored_flights_v2  | table | postgres
 clean  | risk_score_history_v2 | table | postgres
(3 rows)

 rows 
------
    0
(1 row)

~/workspace$ curl -i -s -X GET "https://aerodatabox.p.rapidapi.com/subscriptions/balance" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
HTTP/2 200 
date: Mon, 10 Aug 2026 01:15:12 GMT
content-type: application/json; charset=utf-8
vary: Accept-Encoding
cache-control: no-store
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=oPOUnBbTwokanyb4Yrk03lKPLK6dzIRN9iNhPi9SWzSC%2FeRx0PcuqDcWzWabpNgHcAvrEgIMm4efhwlcjGy5jGKJise0tyc3bPa4Y2vptlpVpY%2B2tqLunv%2F4cY70ta%2Fphh1YrYoh"}]}
cf-ray: a28b25e868f54b01-PDX
server-timing: total;dur=4.6
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
x-robots-tag: none
x-tier: Free Tier
alt-svc: h3=":443"; ma=86400
vary: Accept-Encoding
cf-cache-status: BYPASS
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 20921
x-ratelimit-api-units-reset: 2163969
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 210681
x-ratelimit-requests-reset: 2163969
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 98d1b7c52826082fdbf11eb31cb2d1b8c237290ba203df93b9f338a0f3be15e9
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"creditsRemaining":5592,"lastRefilledUtc":"2026-08-10 01:01","lastDeductedUtc":"2026-08-10 01:15"}~/workspace$ curl -s "$APP_URL/api/v1/curl -s "$APP_URL/api/v1/subscriptions/balance"
~/workspace$ curl -i -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/balance/refill" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"credits":5000}'
HTTP/2 200 
date: Mon, 10 Aug 2026 01:15:26 GMT
content-type: application/json; charset=utf-8
vary: Accept-Encoding
cache-control: no-store
server-timing: total;dur=21.5
cf-cache-status: DYNAMIC
x-robots-tag: none
x-tier: Tier 1
alt-svc: h3=":443"; ma=86400
vary: Accept-Encoding
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
cf-ray: a28b263cacff68f1-PDX
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=kLsdmw5YHSQFHbnqLj5k2CgAFBuO1nA1tresVkYnPAHIMiKLXvF9QBKyhCTkm7onsm5vWJF4dzKZhEBwYfXwTH0ySEtuTx9fEGpIzp4SQuF0V7T2H5uO4isKVrniIpyE2Rgeuhaf"}]}
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 15921
x-ratelimit-api-units-reset: 2163955
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 205681
x-ratelimit-requests-reset: 2163955
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: 0275e16429aeb82f90fef2166c3d918980ad300a833b9caebf3a098f0eb7dabc
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"creditsRemaining":10589,"lastRefilledUtc":"2026-08-10 01:15Z","lastDeductedUtc":"2026-08-10 01:15"}~/workspace$ curl -s -X POST "$APP_Ucurl -s -X POST "$APP_URL/api/v1/subscriptions/balance/refill" \
  -H "Content-Type: application/json" \
  -d '{"credits":5000}'
~/workspace$ curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook" \
  -H "Content-Type: application/json" \
  -d '{"subjectType":"FlightByAirportIcao","subjectId":"KJFK","maxDeliveryRetries":2}'
~/workspace$ curl -i -s -X POST "https://aerodatabox.p.rapidapi.com/subscriptions/webhook/FlightByAirportIcao/KJFK" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$APP_URL:443/api/v1/webhooks/aerodatabox\",\"maxDeliveryRetries\":2}"
HTTP/2 400 
date: Mon, 10 Aug 2026 01:15:49 GMT
content-type: application/json; charset=utf-8
cache-control: no-store
x-robots-tag: none
x-tier: Free Tier
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
alt-svc: h3=":443"; ma=86400
cf-ray: a28b26d0be3ba60a-PDX
vary: Accept-Encoding
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=cpoXU7vXdzpsC37BCgjos%2BrmFWt2%2BdagF5yDdBqX%2Bj3EovbpbWE8oHz8rlQQMrOJjHV%2FqEpSzJwXz9qlQpO%2FZJZQl1rOXsJ1zZfzWU3r3o8ohPkra3kp8i3AqifyljRq2xnbVBdp"}]}
server-timing: total;dur=2.4
cf-cache-status: DYNAMIC
x-ratelimit-api-units-limit: 60000
x-ratelimit-api-units-remaining: 15921
x-ratelimit-api-units-reset: 2163932
x-ratelimit-requests-limit: 240000
x-ratelimit-requests-remaining: 205680
x-ratelimit-requests-reset: 2163932
server: RapidAPI-0.0.45
x-rapidapi-version: 0.0.45
x-rapidapi-region: AWS - us-west-2
x-rapidapi-request-id: b1825e056c80d7fe85fa825dac4a75e5f53e2888e2f31311f94ea8a60d167aff
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

{"message":"Web-hook URL must be a valid URL: :443/api/v1/webhooks/aerodatabox"}~/workspace$ curl -s "https://aerodatabox.p.rapidapi.com/curl -s "https://aerodatabox.p.rapidapi.com/health/services/airports/KJFK/feeds" \
  -H "X-RapidAPI-Key: $AERODATABOX_API_KEY" \
  -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
{"flightSchedulesFeed":{"service":"FlightSchedules","status":"OK","minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"},"liveFlightUpdatesFeed":{"service":"FlightLiveUpdates","status":"OK"},"adsbUpdatesFeed":{"service":"AdsbUpdates","status":"OKPartial"},"generalAvailability":{"minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"}}~/workspace$ for icao in KJFK KLGA KLAX KORD KATL KDFW KSFO KSEA KMIA KIAD EGLL LFPG EHAM EDDF EDDM OMDB WSSS RJTT RJAA; d~/workspace$ for icao in KJFK KLGA KLAX KORD KATL KDFW KSFO KSEA KMIA KIAD EGLL LFPG EHAM EDDF EDDM OMDB WSSS RJTT RJAA; do
  echo "== $icao =="
  curl -s -X POST "$APP_URL/api/v1/subscriptions/webhook" \
    -H "Content-Type: application/json" \
    -d "{\"subjectType\":\"FlightByAirportIcao\",\"subjectId\":\"$icao\",\"maxDeliveryRetries\":2}"
  echo
done
== KJFK ==

== KLGA ==

== KLAX ==

== KORD ==

== KATL ==

== KDFW ==

== KSFO ==

== KSEA ==

== KMIA ==

== KIAD ==

== EGLL ==

== LFPG ==

== EHAM ==

== EDDF ==

== EDDM ==

== OMDB ==

== WSSS ==

== RJTT ==

== RJAA ==

~/workspace$ curl -s "$APP_URL/api/v1/subscriptions/webhook"
curl -s "$APP_URL/api/v1/subscriptions/webhook/<SUBSCRIPTION_ID>"
curl -s -X DELETE "$APP_URL/api/v1/subscriptions/webhook/<SUBSCRIPTION_ID>"
~/workspace$ curl -s -X POST "$APP_URL/api/v1/webhooks/aerodatabox" \
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
~/workspace$ SELECT flight_number, status, data_stage, dep_scheduled_utc, aircraft_reg, credits_remaining, received_at
FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 10;
bash: SELECT: command not found
bash: FROM: command not found
~/workspace$ curl -s "https://aerodatabox.p.rapidapi.com/health/services/airports/KORD/feeds" \
  -H "x-rapidapi-key: $AERODATABOX_API_KEY" \
  -H "x-rapidapi-host: aerodatabox.p.rapidapi.com"
{"flightSchedulesFeed":{"service":"FlightSchedules","status":"OK","minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"},"liveFlightUpdatesFeed":{"service":"FlightLiveUpdates","status":"OK"},"adsbUpdatesFeed":{"service":"AdsbUpdates","status":"OKPartial"},"generalAvailability":{"minAvailableLocalDate":"2025-08-08","maxAvailableLocalDate":"2027-08-07"}}~/workspace$ 