# V3 — Overnight Collection Run: Column-by-Column Diagnosis & Fix (2026-08-10)

> Created 2026-08-10. Deep-dive on the FIRST live collection run (~9h overnight:
> 08:09 → 16:58 UTC, **1,659 rows**). Every one of the 113 flattened columns is
> classified below (what it holds, why it is null, and what to do about it).
> Found **4 real extraction bugs + 1 operational gap + 1 docs-vs-reality surprise**,
> fixed the bugs, and verified against all 1,659 captured payloads.
>
> Ground truth = **`flight_data_pre_post.json`** (JSON preserves `NULL` vs `""` vs
> `"null"`). The CSV re-export double-quotes values (`"""2026-08-10T08:09:00.000Z"""`),
> which only looks broken — it is a CSV artifact, not a data bug. Both files have the
> same 1,659 rows (the id difference CSV-vs-JSON is just string-vs-int formatting).

---

## 0. TL;DR

| Question | Answer |
| ---- | ---- |
| Is the webhook → extractor → DB pipeline working? | **YES.** 1,659 rows captured, 0 duplicates, real flight data. |
| Are we collecting the WRONG data? | **No.** But **4 field groups were silently dropped to NULL** because the real payload differs from the documented contract (numeric enums, capitalized gcd keys, numeric quality codes). All fixed + backfilled. |
| What does the real payload actually contain? | Much less than the docs claim: **no** `flightPlan`, **no** `location` (ADS-B), **no** `aircraft.image`, **no** `predictedTime`, **no** `notificationSummary/Remark`. Those 28 columns will be **forever null with this feed type** — see §5. |
| Why is `data_stage` 100% PRE? | Bug: `determineStage()` saw null `status` and tagged everything PRE. After fix: **35% PRE / 65% POST** (correct). |
| Is there bias? | **Yes, operationally:** all rows came from ONE stray KJFK subscription, so all `sampling_*` stamps are null and data is hub-only. See §7. |
| Wasting credits / API calls? | **No.** ~1 credit per flight item ≈ 1,659 credits for 1,659 rows. CRUD/coverage/balance = free. See §9. |

---

## 1. What actually ran

All 1,659 rows share **one** `subscription_id` (`0731056c-f781-49b4-91cd-deaffb9175f1`),
`subject_id = KJFK` — the **verification subscription created at 01:23**, **not** a batch
from `POST /api/v1/collection/start`. Consequences:

- `sampling_batch_id`, `sampling_probability`, `sampling_weight`, `random_seed`,
  `collection_window_start/end` are NULL everywhere (subscription not in `adb_collection_subs`).
- `airport_tier` was NULL → **fixed** by the tier fallback (§6.3) → derives `HUB` from `KJFK`.
- Data is **hub-only** (KJFK departures/arrivals) — proves the pipeline, but the
  tier-rotating batch is what builds the unbiased dataset.

**To run the real rotation:** delete the stray sub, then `POST /api/v1/collection/start` (§10).

---

## 2. How we investigated (all reproducible)

```bash
python3 scripts/analyze_flight_data_pre_post.py flight_data_pre_post.json   # column fill table
npx tsx scripts/test-extractor-real-payload.ts                             # replay 1,659 payloads through FIXED extractor
npx tsx scripts/backfill_flight_data_pre_post.ts                           # repair DB rows (run on Replit)
```

Verified: `npx tsc --noEmit` → **0 errors in v3 files** (only the pre-existing baseline errors).

---

## 3. What the REAL payload looks like (vs the docs)

Captured `payload_json` top-level keys — **this is the ground truth**:

```
aircraft, airline, arrival, callSign, codeshareStatus, departure,
greatCircleDistance, isCargo, lastUpdatedUtc, number, status
```

| Payload block | Present? | Presence in 1,659 rows |
| ---- | ---- | ---- |
| `status` (numeric) | ✅ always | 1,659 (100%) |
| `codeshareStatus` (numeric) | ✅ always | 1,659 (100%) |
| `greatCircleDistance` | ✅ usually | 1,651 (100%) — 1 row = all-`"NaN"` strings (correctly → null) |
| `departure` / `arrival` | ✅ always | 1,659 (100%) |
| `departure.terminal` | ✅ sparse | 1,146 (69%) |
| `departure.gate` / `checkInDesk` | ✅ sparse | 142 (9%) / 145 (9%) |
| `departure.runway` | ✅ sparse | 422 (25%) |
| `arrival.terminal` | ✅ sparse | 1,252 (75%) |
| `arrival.gate` / `baggageBelt` | ✅ sparse | 37 (2%) / 46 (3%) |
| `arrival.runway` | ✅ sparse | 251 (15%) |
| `flightPlan` | ❌ **never** | 0 |
| `location` (ADS-B) | ❌ **never** | 0 |
| `aircraft.image` | ❌ **never** | 0 |
| `departure/arrival.predictedTime` | ❌ **never** | 0 |
| `notificationSummary` / `notificationRemark` | ❌ **never** | 0 |
| `subscription.subject.type` | ❌ null | 0 |

**Airport object keys actually sent:** `iata, icao, name, shortName, municipalityName,
countryCode, timeZone, location{lat,lon}`. Note **`localCode` is never sent** (docs list it).

---

## 4. THE 113-COLUMN TABLE — every column, its fill rate, why, and the fix

> Fill rates are from the JSON export (before backfill). Verdict legend:
> **✅ OK** = extractor reads it correctly; its fill is the payload's reality.
> **🐛 FIXED** = extractor dropped it (bug); fixed in code + repaired by backfill.
> **🚫 NEVER-SENT** = the feed never carries this field; expected null forever (docs wrong).
> **🔶 SPARSE** = legitimately partial (only present for some flights/stages).
> **⚙️ OPERATIONAL** = null only because this run used a stray non-batch sub.

### 4.1 Identity (7 cols) — all ✅ OK
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `id` | 100% | PK | — |
| `flight_number` | 100% | `number` (e.g. "2K 7393") | — |
| `carrier_iata` | 99.8% | `airline.iata` | — |
| `carrier_icao` | 99.6% | `airline.icao` | — |
| `carrier_name` | 100% | `airline.name` | — |
| `call_sign` | 100% | `callSign` (e.g. GLG7395) | — |
| `is_cargo` | 100% (all `false`) | `isCargo` — all rows are passenger flights; fine | — |

### 4.2 Status (3 cols) — 🐛 FIXED (this was the biggest bug)
| Column | Fill before | Why it was null | Fix |
| ---- | ---- | ---- | ---- |
| `status` | 0% → **100%** | payload sends **numeric** code (e.g. `2`); extractor used `str()` | `enumName(flight.status, STATUS_CODE_BY_NUMBER)` |
| `status_code` | 0% → **100%** | same root cause | numeric code used directly |
| `codeshare_status` | 0% → **100%** | payload sends numeric `1/2`, extractor wanted a string | `enumName(flight.codeshareStatus, CODESHARE_CODE)` |

Status distribution after fix: `EnRoute` 545, `Expected` 519, `Arrived` 388,
`Departed` 105, `Unknown` 42, `Approaching` 41, `GateClosed` 16, `Delayed` 3.
Codeshare: `IsOperator` 1,658 / `IsCodeshared` 4.

### 4.3 Notifications (2 cols) — 🚫 NEVER-SENT
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `notification_summary` | 0% | feed never sends it | none (drop from ML features) |
| `notification_remark` | 0% | feed never sends it | none (drop from ML features) |

### 4.4 Update timestamp (1 col) — ✅ OK
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `last_updated_utc` | 100% | `lastUpdatedUtc` ("2026-08-10 08:09Z" — parser handles space format) | — |

### 4.5 Great-circle distance (5 cols) — 🐛 FIXED
| Column | Fill before | Why it was null | Fix |
| ---- | ---- | ---- | ---- |
| `gcd_m`, `gcd_km`, `gcd_mile`, `gcd_nm`, `gcd_ft` | 0% → **99%** (1,650/1,659) | payload uses **CAPITALIZED** keys `{Km, Nm, Feet, Mile, Meter}`; extractor read lowercase | `pickKey()` case-insensitive read |
| (row `1627` JRE 715) | stays null | payload literally sent `"NaN"` strings for every unit | correct — garbage in, null out |

### 4.6 Departure airport (10 cols) — ✅ OK
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `dep_airport_icao` | 99.9% | `departure.airport.icao` | — |
| `dep_airport_iata` | 99.9% | `…iata` | — |
| `dep_airport_local_code` | 0% | **feed never sends `localCode`** | none (docs wrong) |
| `dep_airport_name` | 100% | `…name` | — |
| `dep_airport_short_name` | 99.9% | `…shortName` | — |
| `dep_airport_municipality` | 99.9% | `…municipalityName` | — |
| `dep_airport_country_code` | 99.9% | `…countryCode` | — |
| `dep_airport_lat` / `lon` | 99.9% | `…location.lat/lon` | — |
| `dep_airport_timezone` | 99.9% | `…timeZone` | — |

(The <100% are the single malformed row 1627.)

### 4.7 Departure times (5 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `dep_scheduled_utc` / `_local` | 99.5% | `departure.scheduledTime` | ✅ OK |
| `dep_revised_utc` | 91.3% | `revisedTime` — only sent after a schedule revision | 🔶 SPARSE, OK |
| `dep_predicted_utc` | 0% | **feed never sends `predictedTime`** | 🚫 NEVER-SENT |
| `dep_runway_utc` | 58.9% | `runwayTime` — only after airborne (977 rows also give the delay signal) | 🔶 SPARSE, OK |

### 4.8 Departure facilities (6 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `dep_terminal` | 69.1% | `departure.terminal` — only published for some flights | ✅ OK (sparse by nature) |
| `dep_checkin_desk` | 8.7% | `departure.checkInDesk` — rare | ✅ OK |
| `dep_gate` | 8.6% | `departure.gate` — rare | ✅ OK |
| `dep_baggage_belt` | 0% | **departure block has no `baggageBelt`** (only arrival does) | 🚫 NEVER-SENT |
| `dep_runway` | 25.4% | `departure.runway` string | ✅ OK |
| `dep_quality` | 0% → **99%** | payload `quality` = **numeric codes** `[0,1]`; `strArr()` kept strings only | 🐛 FIXED → `["Basic","Live"]` |

### 4.9 Arrival airport (10 cols) — ✅ OK (same as 4.6; `arr_airport_local_code` = 🚫 NEVER-SENT)

### 4.10 Arrival times (5 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `arr_scheduled_utc` / `_local` | 98.7% | `arrival.scheduledTime` | ✅ OK |
| `arr_revised_utc` | 86.5% | `revisedTime` | 🔶 SPARSE, OK |
| `arr_predicted_utc` | 0% | **feed never sends `predictedTime`** | 🚫 NEVER-SENT |
| `arr_runway_utc` | 25.2% | `runwayTime` after landing | 🔶 SPARSE, OK |

### 4.11 Arrival facilities (6 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `arr_terminal` | 75.5% | `arrival.terminal` | ✅ OK |
| `arr_gate` | 2.2% | `arrival.gate` — rare | ✅ OK |
| `arr_baggage_belt` | 2.8% | `arrival.baggageBelt` — rare | ✅ OK |
| `arr_runway` | 15.1% | `arrival.runway` | ✅ OK |
| `arr_quality` | 0% → **99%** | same numeric-code bug | 🐛 FIXED |

### 4.12 Flight plan (10 cols) — 🚫 NEVER-SENT (all 0%)
`flight_plan_flight_rules`, `flight_plan_flight_type`, `flight_plan_revision_no`,
`flight_plan_status`, `flight_plan_route`, `fp_alt_requested_ft`, `fp_alt_assigned_ft`,
`fp_airspeed_requested_kt`, `fp_airspeed_assigned_kt`, `flight_plan_last_updated_utc`.
**The feed never sends a `flightPlan` block.** Docs list them; reality doesn't.
→ Remove from ML feature expectations (or obtain via a different feed/subscription).

### 4.13 Aircraft (3 cols) — ✅ OK
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `aircraft_reg` | 99.1% | `aircraft.reg` (441 unique tails) | — |
| `aircraft_mode_s` | 99.7% | `aircraft.modeS` | — |
| `aircraft_model` | 100% | `aircraft.model` (46 models) | — |

### 4.14 Aircraft image (6 cols) — 🚫 NEVER-SENT (all 0%)
`aircraft_image_url/web_url/author/title/description/license`. The feed never sends
`aircraft.image`. → Drop from ML features.

### 4.15 Location / ADS-B (9 cols) — 🚫 NEVER-SENT (all 0%)
`loc_lat`, `loc_lon`, `loc_altitude_ft`, `loc_pressure_altitude_ft`, `loc_pressure_hpa`,
`loc_ground_speed_kt`, `loc_true_track_deg`, `loc_vsi_fpm`, `loc_reported_utc`.
**The Flight Alerts webhook never includes a live `location` block.**
> ⚠️ **This disproves the MLplanAugV1 assumption** that the webhook gives live ADS-B
> position/speed/altitude. For the post-departure model (delay/arrival prediction) we
> need a different data source (e.g. AeroDataBox **AdsbUpdates** feed, or FlightLiveUpdates)
> — **open decision before Phase 6b.** The pre-departure model is unaffected (it uses
> schedule/status/terminal/gate, all of which this feed provides).

### 4.16 Stage & live flag (2 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `data_stage` | 100% **was all PRE (wrong)** | `determineStage()` saw null `status` | 🐛 FIXED → now **PRE 580 / POST 1,079** |
| `has_live_location` | 100% (all false) | correct — no `location` block in this feed | ✅ OK |

### 4.17 Subscription wrapper (12 cols)
| Column | Fill | Why | Fix |
| ---- | ---- | ---- | ---- |
| `subscription_id` | 100% | `body.subscription.id` | ✅ OK |
| `subscription_is_active` | 100% | wrapper | ✅ OK |
| `subscription_created_on_utc` | 100% | wrapper (01:23, the stray sub) | ✅ OK |
| `subscription_billing_type` | 0% | wrapper omits it | 🚫 NEVER-SENT |
| `subscription_activate_before_utc` | 0% | wrapper omits it | 🚫 NEVER-SENT |
| `subscription_expires_on_utc` | 0% | wrapper omits it | 🚫 NEVER-SENT |
| `subject_type` | 0% | payload sends it **null** — the tier fallback now handles this | 🐛 FIXED (fallback) |
| `subject_id` | 100% | `KJFK` | ✅ OK |
| `subscriber_type` | 100% | `WebHook` | ✅ OK |
| `subscriber_id` | 100% | our callback URL | ✅ OK |
| `subscription_notices` | 0% (empty `[]`) | wrapper sends empty array | ✅ OK |

### 4.18 Balance (3 cols) — ✅ OK
`credits_remaining` (100%), `balance_last_refilled_utc` (100%), `balance_last_deducted_utc` (100%).
From the `balance` wrapper. Credits went 9,554 → 7,878 during the run.

### 4.19 Audit (3 cols) — ✅ OK
`received_at` (100%), `payload_json` (100% — the raw payload, intentionally stored as the
recovery net per plan §5a rule 8), `dedup_key` (100%, unique per (flight, lastUpdatedUtc)).

### 4.20 Sampling metadata (7 cols) — ⚙️ OPERATIONAL (all 0%)
`sampling_batch_id`, `airport_tier`, `sampling_probability`, `sampling_weight`,
`random_seed`, `collection_window_start`, `collection_window_end`.
Null only because this run used the stray non-batch KJFK sub. After the fix, `airport_tier`
now derives from the subject ICAO (KJFK → `HUB`); the other six fill only when rows are
stamped by a real batch (`POST /api/v1/collection/start`). See §7.

---

## 5. Structural finding: columns that are permanently null with this feed

**28 columns will never populate from Flight Alerts webhook deliveries** (the docs
`AugMLtest/PrePosFeat.md` are aspirational, not what AeroDataBox sends):

- **Flight plan (10)**: no `flightPlan` block.
- **Location/ADS-B (9)**: no `location` block. → **Post-departure model needs a new data source.**
- **Aircraft image (6)**: no `aircraft.image` block.
- **Predicted times (2)**: no `predictedTime` on departure/arrival.
- **Notifications (2)**: no `notificationSummary/Remark`.
- **`dep_baggage_belt`**: departure block has no `baggageBelt`.
- **`dep/arr_airport_local_code`**: airport object has no `localCode`.

**Recommendation:** prune these from the ML feature list (keep the columns in the DB —
they're harmless and cost nothing — but don't expect data, and don't feed them to models).

---

## 6. What was fixed (code) — all verified

1. **`server/lib/disruption/flightNotificationExtractor_v3.ts`**
   - `STATUS_CODE_BY_NUMBER`, `CODESHARE_CODE`, `QUALITY_CODE` maps added.
   - `enumName()` accepts numeric code OR string name for `status`/`codeshareStatus`.
   - `pickKey()` reads `greatCircleDistance` case-insensitively (handles `Km` + `meter`).
   - `strArr()` maps numeric quality codes → `Basic`/`Live`/`Approximate`.
   - `statusCode` uses the numeric code directly.
   - `determineStage()` now tags Departed/EnRoute/Approaching/Arrived as **POST**.
2. **`server/lib/disruption/flightStatus_v3.ts`** — validator accepts numeric-or-string
   enums and both gcd key cases (stops spurious validation noise).
3. **`server/routes_v3.ts`** — tier fallback derives `airport_tier` from the 4-letter
   subject ICAO even when `subject.type` is null (real payloads send it null).

**Verification:** all 1,659 payloads replayed → 100% status/status_code/codeshare,
99% gcd/quality, correct PRE/POST split. One isolated check (id=405): `gcdKm=5554.54`,
`status=Departed`, `statusCode=6`, `stage=POST`, `codeshare=IsOperator`,
`depQuality=["Basic","Live"]` ✅.

---

## 7. Bias / data-quality assessment

- **Hub-only:** all rows are KJFK (918 dep-tiers HUB, 65 MID, 676 OTHER = arrivals into
  KJFK from elsewhere). NOT a representative sample — the tier rotation fixes this.
- **Lifecycle coverage is good:** 699 unique flight instances; rows-per-instance
  `1→11,17`, sequences like `(1)→(1,2)→(1,2,2)→(1,2,9,9)` — i.e. we capture a flight's
  state evolution (Expected→EnRoute→…→Arrived), which is exactly what the pre/post model needs.
- **Delivery lag:** received−lastUpdated median 0.7 min, max 5.8 min, **0 rows > 60 min**
  → no stale data problem.
- **Delay signal:** 977 rows have `dep_runway_utc − dep_scheduled_utc`, mean **+36 min**,
  max +359 min. 27 rows are negative (≤ −98 min = early departures / schedule-change
  artifacts) — real signal, keep it.
- **"Weird constant numbers" the user saw:** `is_cargo=false`, `has_live_location=false`,
  `data_stage=PRE` were all *constants* — the first two are correct, the third was the bug
  (now fixed). Hourly `dep_scheduled_utc` repeats are real schedules, not a bug.

---

## 8. Dedup / versioning behavior (important nuance)

`dedup_key = SHA256(flight_number|carrier|lastUpdatedUtc)`. Because AeroDataBox bumps
`lastUpdatedUtc` on every state change, **each change becomes a NEW row** (a versioned
snapshot), not an in-place update. That's why 1,659 rows = 699 instances × ~2.4 snapshots
(up to 17 for one flight). This is **by design and desirable** for a timeline dataset —
but note the table grows with every update. If a single-row-per-flight view is ever
needed, dedupe on `flight_number+dep_scheduled_utc` keeping max `last_updated_utc`.

---

## 9. Credit / API-call audit (am I wasting money?)

- **No waste.** ~1,659 credits ≈ 1,659 rows (balance 9,554 → 7,878 = 1,676; matches
  delivery volume incl. wrappers). Zero extra API calls.
- Subscription CRUD, coverage checks, balance = **free** on AeroDataBox.
- No background polling (engine dead since 2026-08-08); `apiCallTracker` is disabled.
- The old **CSRF-403 webhook loop** that burned credits was fixed 2026-08-10 (v3 routes
  registered before CSRF); the log shows `lastDeductedUtc` moving with our 2xx
  `received … stored=N` lines.
- Manual UI actions (search/rescore/simulate) still cost REST units — avoid while collecting.

---

## 10. What to do next (operational, run on Replit)

1. **Repair existing rows:** `npx tsx scripts/backfill_flight_data_pre_post.ts`
   (idempotent; re-runs the fixed extractor over stored `payload_json`, UPDATE in place).
2. **Verify repair:** `SELECT count(*) FROM clean.flight_data_pre_post WHERE status IS NULL;` → ~0.
3. **Stop the stray sub** (stops hub-only collection outside rotation):
   `GET /api/v1/subscriptions/webhook` → `DELETE /api/v1/subscriptions/webhook/:id` for KJFK.
4. **Run the real tier-rotating batch:** `POST /api/v1/collection/start`
   → watch log for `received flights=N stored=M`; rows should now carry
   `sampling_batch_id` + `airport_tier` + `sampling_weight`.
5. **Re-analyze after a real batch:** `GET /api/v1/collection/diagnostics`
   → `byTier` should spread across HUB/MID/REGIONAL; `byDepartureHour` across the day.
6. **Decide the post-departure data source** (ADS-B for the Phase 6b model): the Flight
   Alerts feed has no `location` — evaluate `AdsbUpdates` or FlightLiveUpdates feeds (§5).

---

## 11. Files touched

| File | Change |
| ---- | ---- |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | Fixed status/codeshare/gcd/quality/data_stage extraction |
| `server/lib/disruption/flightStatus_v3.ts` | Validator accepts real payload shapes |
| `server/routes_v3.ts` | Tier fallback works when `subject.type` is null |
| `server/lib/disruption/adbCollectionController_v3.ts` | Endpoint-path fix in error message |
| `scripts/analyze_flight_data_pre_post.py` | NEW — column-by-column analysis tool |
| `scripts/test-extractor-real-payload.ts` | NEW — replays 1,659 real payloads through fixed extractor |
| `scripts/backfill_flight_data_pre_post.ts` | NEW — repairs existing rows in place (run on Replit) |
| `MDplan/V3_CollectionStrategy.md` | Endpoint paths corrected to `/api/v1/collection/*` |
| `MDplan/V3_WEBHOOK_VERIFY.md` | Endpoint paths corrected |
| `MDplan/V3_WebhookExtractionPlan.md` | Endpoint paths corrected + §8.0 first-run runbook |

---

## 12. Evidence trail (how each conclusion was reached)

| Conclusion | Evidence |
| ---- | ---- |
| 4 extraction bugs | `payload_json` vs flattened columns; `scripts/test-extractor-real-payload.ts` all-pass after fix |
| 28 never-sent columns | union of all keys across 1,659 payloads (§3 table) — no `flightPlan`/`location`/`aircraft.image`/`predictedTime` anywhere |
| Correct PRE/POST split | fixed extractor → 580 PRE / 1,079 POST, matching status distribution |
| No credit waste | balance 9,554 → 7,878 over window ≈ row count; CRUD free |
| Single stray sub / hub bias | every row `subscription_id=0731056c…`, `subject_id=KJFK` |
| Lifecycle capture works | 699 instances, sequences `(1,2,9,9)` etc. |
| Delivery freshness | lag median 0.7 min, max 5.8 min, 0 rows >60 min |
| Delay signal real | 977 rows, mean +36 min, 27 early-departure artifacts |
