# V3 — Overnight Collection Run: Column-by-Column Diagnosis & Fix (2026-08-10)

> Created 2026-08-10. **Ground truth = `flight_data_pre_post.csv`** (the actual DB
> table, 1,662 rows × 113 columns, exported 2026-08-10 10:01 UTC). Every column is
> classified below: what it holds, why it is null/constant/suspicious, and the fix.
>
> **UPDATED — v2 export `flight_data_pre_post2.csv` (1,949 rows, 21:07 UTC)** analyzed
> in §1B. The backfill + extractor fixes have been applied on Replit (1,937 rows
> repaired); the v2 export proves every previously-null group is now populated:
> status 100%, gcd 99.5%, quality 99.5%, `data_stage` 100% (1,268 POST / 681 PRE).
>
> All conclusions are reproducible:
> ```bash
> python3 scripts/analyze_flight_data_pre_post.py flight_data_pre_post2.csv
> npx tsx scripts/test-extractor-real-payload.py
> npx tsx scripts/backfill_flight_data_pre_post.ts   # repair DB rows (run on Replit)
> ```

---

## 0. TL;DR

| Question | Answer |
| ---- | ---- |
| Is the webhook → extractor → DB pipeline working? | **YES** — 1,949 real rows in the v2 export, 0 duplicate dedup keys, real flight data. |
| Is the DATA wrong? | **No.** The raw payloads are correct. The 4 field groups dropped to NULL (status/codeshare/gcd/quality) are **now repaired** — v2 shows 100%/100%/99.5%/99.5% populated. |
| Is `data_stage` set by us or the webhook? | **By US** — derived from the payload's real status code (`2`EnRoute→POST, `1`Expected→PRE…). See §1A. |
| Does `payload_json` hold valuable data? | **YES** — it is the complete raw flight item (times, airports, gcd, quality, aircraft) for both pre- and post-departure snapshots; `payload_json_flat` is its readable mirror. |
| Are the "weird constants" a bug? | **Some are, some aren't.** `has_live_location=false`, `is_cargo=false`, `subscription_notices=[]` are correct; `data_stage=PRE`-everywhere was the extractor bug (now fixed). |
| Are the quoted timestamps a bug? | **CSV-export artifact, not a DB bug.** Every `TIMESTAMPTZ` cell parses as `"2026-08-10T08:09:00.000Z"` (with literal quotes) while TEXT cells are clean — see §2. |
| Are we collecting wrong / wasting credits? | **No.** ~1 credit per flight item; CRUD/balance free. See §9. |
| Is there bias? | **Yes, historically:** all rows came from ONE stray KJFK subscription → hub-only. **Fixed:** the watchdog now auto-rotates HUB/MID/REGIONAL airports and deletes the stray sub automatically (§12). |
| Do I have to do this manually every day? | **NO anymore.** `ADB_AUTO_COLLECT` defaults ON — subscribe → collect → unsubscribe → rotate runs itself. |
| Is the post-departure data enough for ML? | **Milestone data YES, trajectory NO.** See §10 (the big strategic answer). |

---

## 1. What the table actually contains (from the CSV itself)

- **1,662 rows**, ids `1..1719` (some ids absent — deletions never happen, ids skip
  after upsert-conflicts refresh existing rows).
- **1,662 unique `dedup_key`** — dedup is perfect (no duplicate deliveries).
- **1,662 unique `payload_json`** — the raw AeroDataBox flight item, stored as JSON.
- **ONE subscription everywhere**: `subscription_id=0731056c-…`, `subject_id=KJFK`,
  `subscriber_type=WebHook`. This is the **01:23 verification sub**, NOT a
  `POST /api/v1/collection/start` batch.

---

## 1A. Which columns are REAL (from the webhook) vs DERIVED (computed by us)

**Answer to "is everything that's coming in real?" — YES, with one category**
`data_stage` is ours. The table splits into exactly three sources:

### A. Real — copied straight from the AeroDataBox payload (these are the FACTS)
The extractor reads the raw `payload_json` flight item field-by-field and writes
them unchanged (only numeric enums are decoded to names for readability):
`flight_number`, `carrier_iata/icao/name`, `call_sign`, `is_cargo`, `status`
(decoded), `status_code` (the raw numeric enum), `codeshare_status` (decoded),
`notification_summary/remark`, `last_updated_utc`, all `gcd_*`, every
`dep_airport_*` + `dep_scheduled/revised/runway_*` + `dep_terminal/gate/checkin/
runway/quality`, every `arr_*` twin, `flight_plan_*`, `aircraft_reg/modeS/model/
image*`, `loc_*` (never sent), `subscription_id/is_active/billing_type/
activate/expires/created`, `subject_type/id`, `subscriber_type/id`,
`subscription_notices`, `credits_remaining`, `balance_last_refilled/deducted_utc`.
These are AeroDataBox's own data — we do not invent them.

### B. Real — the `payload_json`/`payload_json_flat` audit columns
`payload_json` = the WHOLE raw flight item verbatim (our source of truth for the
A/B categories). `payload_json_flat` = the SAME data flattened to dot-notation
keys with enums decoded — it adds no new facts, only readability.

### C. Derived — computed by OUR code (3 columns + stamps)
| Column | Who sets it | Why |
| ---- | ---- | ---- |
| `data_stage` | **US** (`determineStage()` in the extractor) | POST iff payload `status` ∈ {Departed, EnRoute, Approaching, Arrived}; else PRE. It is **not** sent by the webhook — it is our label of whether this snapshot is pre- or post-departure. |
| `has_live_location` | **US** | `true` iff the payload has a `location` (ADS-B) block. This feed never sends it → always `false` (real, see §7). |
| `received_at` | **US** (server clock) | when our server received the webhook — the only time we trust. |
| `dedup_key` | **US** | SHA-256 of `flight|callsign|lastUpdatedUtc` — our dedup identity, not a fact. |
| `airport_tier` + `sampling_*` | **US** | stamped by the batch collector to record WHY a flight entered the dataset (migration 0012). `airport_tier` is derived from the subscribed airport ICAO. |

So: everything in **A + B** is real AeroDataBox data. `data_stage` is the ONLY
data-label column we derive from a real status code — it is accurate because the
code comes from the payload (`2`EnRoute→POST, `1`Expected→PRE, `9`Arrived→POST, …).
The full status→stage mapping observed in v2: `EnRoute→POST 624`, `Expected→PRE
610`, `Arrived→POST 474`, `Departed→POST 122`, `Unknown→PRE 50`, `Approaching→POST
48`, `GateClosed→PRE 16`, `Delayed→PRE 5`.

---

## 1B. v2 export (`flight_data_pre_post2.csv`, 1,949 rows) — post-backfill verdict

The user's second export (2026-08-10 21:07 UTC) is the **proof the fixes landed**.
Rows grew 1,662 → 1,949 because the collection ran through the day; the backfill
repaired **1,937** rows in place. Every previously-null group is now populated:

| Group | v1 (broken) | v2 (fixed) | Verdict |
| ---- | ---- | ---- | ---- |
| `status` / `status_code` | 0% | **100%** (8 distinct: EnRoute 624, Expected 610, Arrived 474, Departed 122…) | ✅ real |
| `codeshare_status` | 0% | **100%** (IsOperator 1,943 / IsCodeshared 6) | ✅ real |
| `gcd_*` | 0% | **99.5%** (1,940/1,949; the 9 nulls = 8 payloads with no gcd key + 1 all-`NaN` row) | ✅ real, nulls correct |
| `dep_quality` / `arr_quality` | `''` | **99.5% / 98.5%** — `["Basic","Live"]` 1,755 / `["Basic"]` 184… | ✅ real (numeric codes decoded) |
| `data_stage` | `PRE` × all | **100%** — POST 1,268 / PRE 681 (65% POST) | ✅ ours, accurate |
| `airport_tier` | 0% | **99.4%** HUB (1,937/1,949) | ✅ ours (derived) |
| `payload_json` | 100% | **100%** (1,949/1,949) | ✅ audit |
| `payload_json_flat` | — | **0/1,949 in this CSV export** | ⚠️ the export tool lists 113 fixed columns and predates migration 0013 — column exists in DB, just not in this CSV dump (see §13/§12 step 3b) |
| `sampling_batch_id` + `sampling_*` | 0% | **0%** | ⚠️ still null — the table is dominated by the stray KJFK sub, NOT a rotation batch. Fixed by the new auto-rotator (see §12). |
| `subject_type` | 0% | **0%** | ✅ real — the feed sends `subject.type` as a numeric code; extractor now preserves it as a string (`strOrCode`) instead of nulling it. |
| `dep_airport` | 100% | 100%, 148 distinct | ✅ real (KJFK 830 + arrivals from KLAX/KSFO/KBOS/EGLL…) |
| delay signal | — | dep_runway−dep_scheduled on 1,154 rows: min −285, max 359, mean 39 min | ✅ real runway−scheduled spread |
| dedup | — | **1,949 unique dedup_key, 0 dups** | ✅ |

**Every remaining null in v2 is a TRUE absence** (feed never sends it), not a
dropped field:
- `flight_plan_*` (5 cols) 0% — feed never sends `flightPlan`.
- `loc_*` (7 cols) 0% — feed never sends a `location` block (verified §10).
- `dep_predicted_utc` 0% — feed never sends `predictedTime`.
- `dep_baggage_belt` 0% — departure block has no `baggageBelt` (arrival-only).
- `dep_airport_local_code` 0% — airport object has no `localCode`.
- `subject_type` 0% → will fill as a numeric-code string on the NEXT delivery.

---

## 2. The quoted timestamps — what the user saw and why it's OK

Look at the CSV with a text editor and every UTC timestamp appears as:

```
"""2026-08-10T08:09:00.000Z"""
```

Parsed with a CSV reader, every `TIMESTAMPTZ` cell comes back as
`'"2026-08-10T08:09:00.000Z"'` — **with literal double-quotes wrapped around it** —
while TEXT columns (e.g. `dep_scheduled_local`, `aircraft_reg`) come back clean.

This is a **CSV export artifact**: the tool that produced this CSV serialized
timestamp columns as JSON strings (quoted), not as the raw ISO text. It is NOT
stored that way in the DB — the timestamp columns are real `TIMESTAMPTZ`
(`migrations/0010`, lines 35/55/56/…). Confirmed because the *same* table's JSON
export (`flight_data_pre_post.json`, 09:58) has clean values
`2026-08-10T08:09:00.000Z`.

> ⚠️ If your DB UI shows the timestamps WITH quotes, that's the UI's display. Use the
> JSON export or `COPY ... TO` for analysis; do not "fix" the data because of this.

---

## 3. Full column-by-column analysis (from the CSV)

Legend: **OK** = correct as-is · **SPARSE** = legitimately partial · **BUG** = dropped by
the old extractor (fixed in code + repaired by backfill) · **NEVER-SENT** = the feed
doesn't carry this field · **OP** = null only because this run used a stray non-batch sub.

### 3.1 Identity (7) — all **OK**
| Column | Fill | Note |
| ---- | ---- | ---- |
| `id` | 100% | PK |
| `flight_number` | 100% | from `number` (e.g. "2K 7393") |
| `carrier_iata` | 99.8% | from `airline.iata` |
| `carrier_icao` | 99.6% | from `airline.icao` |
| `carrier_name` | 100% | from `airline.name` |
| `call_sign` | 100% | from `callSign` (e.g. GLG7395) |
| `is_cargo` | 100% = **all `false`** | **Suspicious-looking constant** — see §3.0 |

### 3.0 The "constants" the user flagged
| Column | Value | Verdict |
| ---- | ---- | ---- |
| `is_cargo` | `false` × 1,662 | These are all passenger flights captured from KJFK daytime ops; `false` is plausible. BUT verify: if cargo flights exist in the window and AeroDataBox reports them, we'd see some `true`. For now treat as data-reality, add a check during a cargo-heavy window. |
| `data_stage` | `PRE` × 1,662 | **BUG** — every row mis-tagged PRE (the extractor's `determineStage()` saw null status). After fix: **580 PRE / 1,079 POST** (65% POST). Repaired by backfill. |
| `has_live_location` | `false` × 1,662 | **CORRECT** — this feed never sends a `location` block, so every row genuinely has no live position. |
| `subscription_id`, `subject_id`, `subscriber_type/id`, `subscription_is_active`, `subscription_created_on_utc` | constant | **CORRECT** — one subscription, single run. |
| `subscription_notices` | `[]` × 1,662 | **CORRECT** — wrapper sends empty array. |
| `balance_last_refilled_utc` | 1 value × 1,660 | **CORRECT** — one refill at 01:15. |

### 3.2 Status (3) — **BUG → fixed**
| Column | Fill in CSV | Why null | Fix |
| ---- | ---- | ---- | ---- |
| `status` | 0% | payload sends **numeric** code (e.g. `2`); old extractor `str()`ed it → null | `enumName(flight.status, STATUS_CODE_BY_NUMBER)` |
| `status_code` | 0% | same | numeric code used directly |
| `codeshare_status` | 0% | payload sends numeric `1/2` | `enumName(..., CODESHARE_CODE)` |

Statuses present in payloads (from `payload_json`): `2`EnRoute=545, `1`Expected=519,
`9`Arrived=388, `6`Departed=105, `0`Unknown=42, `8`Approaching=41, `5`GateClosed=16,
`7`Delayed=3. Codeshare: `1`IsOperator=1,658, `2`IsCodeshared=4.

### 3.3 Great-circle distance (5) — **BUG → fixed**
| Column | Fill | Why null | Fix |
| ---- | ---- | ---- | ---- |
| `gcd_m`,`gcd_km`,`gcd_mile`,`gcd_nm`,`gcd_ft` | 0% | payload keys are **CAPITALIZED** `{Km,Nm,Feet,Mile,Meter}`; old extractor read lowercase | `pickKey()` case-insensitive |
| (row 1627 `JRE 715`) | stays null | payload literally sent `"NaN"` strings for every unit | **correct** — garbage in, null out |

### 3.4 Quality (2 JSONB columns) — **BUG → fixed**
| Column | Fill | Why null | Fix |
| ---- | ---- | ---- | ---- |
| `dep_quality` (JSONB) | 0% (`''`) | payload `quality` = **numeric codes** `[0,1]`; `strArr()` kept strings only | maps → `["Basic","Live"]` |
| `arr_quality` (JSONB) | 0% (`''`) | same | maps → `["Basic"]` |

> These are the two JSON columns the user asked about. After backfill they become
> proper JSONB arrays like `["Basic","Live"]`. The payload quality codes observed:
> `0`=Basic (3,288) and `1`=Live (2,776). **Gemini's claim that quality is
> `{checkState, accuracyKm, source}` is WRONG for this feed** — see §11.

### 3.5 Departure airport (10) — **OK** (1 `local_code` is NEVER-SENT)
`dep_airport_icao/iata/name/short_name/municipality/country_code/lat/lon/timezone`
all 99.9–100%. `dep_airport_local_code` = 0% — the airport object in this feed has
**no `localCode` key** → **NEVER-SENT**.

### 3.6 Departure times (5)
| Column | Fill | Verdict |
| ---- | ---- | ---- |
| `dep_scheduled_utc` / `_local` | 99.5% | **OK** (from `scheduledTime`) |
| `dep_revised_utc` | 91.3% | **SPARSE** (only after a revision) |
| `dep_predicted_utc` | 0% | **NEVER-SENT** (no `predictedTime` in feed) |
| `dep_runway_utc` | 58.8% | **SPARSE** (only after airborne) — the actual-departure signal |

### 3.7 Departure facilities (6)
| Column | Fill | Verdict |
| ---- | ---- | ---- |
| `dep_terminal` | 69.1% | **OK** (sparse by nature) |
| `dep_checkin_desk` | 8.7% | **OK** (rare) |
| `dep_gate` | 8.5% | **OK** (rare) |
| `dep_baggage_belt` | 0% | **NEVER-SENT** — departure block has no `baggageBelt` (only arrival does) |
| `dep_runway` | 25.5% | **OK** |
| `dep_quality` | 0% → **BUG fixed** | §3.4 |

### 3.8 Arrival airport (10) — same as 3.5; `arr_airport_local_code` **NEVER-SENT**
### 3.9 Arrival times (5)
| Column | Fill | Verdict |
| ---- | ---- | ---- |
| `arr_scheduled_utc` / `_local` | 98.7% | **OK** |
| `arr_revised_utc` | 86.5% | **SPARSE** |
| `arr_predicted_utc` | 0% | **NEVER-SENT** |
| `arr_runway_utc` | 25.2% | **SPARSE** — the actual-arrival signal (418 rows) |

### 3.10 Arrival facilities (6)
| Column | Fill | Verdict |
| ---- | ---- | ---- |
| `arr_terminal` | 75.4% | **OK** |
| `arr_gate` | 2.2% | **OK** (rare) |
| `arr_baggage_belt` | 2.8% | **OK** (rare) |
| `arr_runway` | 15.1% (22L×88, 31R×85, 04R×61…) | **OK** |
| `arr_quality` | 0% → **BUG fixed** | §3.4 |

### 3.11 Flight plan (10) — all **NEVER-SENT**
`flight_plan_flight_rules/type/revision_no/status/route`, `fp_alt_requested_ft`,
`fp_alt_assigned_ft`, `fp_airspeed_requested_kt`, `fp_airspeed_assigned_kt`,
`flight_plan_last_updated_utc` — **0%**. The feed never sends a `flightPlan` block.
Keep columns (harmless) but **drop from ML features**.

### 3.12 Aircraft (3) — **OK**
| Column | Fill | Note |
| ---- | ---- | ---- |
| `aircraft_reg` | 99.1% | 440 unique tails — the tail-number join key |
| `aircraft_mode_s` | 99.7% | |
| `aircraft_model` | 100% | 46 models |

### 3.13 Aircraft image (6) — **NEVER-SENT** (0%): `aircraft_image_url/web_url/author/title/description/license` — no `aircraft.image` block.

### 3.14 Location / ADS-B (9) — **NEVER-SENT** (0%): `loc_lat/lon/altitude_ft/pressure_altitude_ft/pressure_hpa/ground_speed_kt/true_track_deg/vsi_fpm/reported_utc`.
**This is the key finding for the post-departure model — see §10.**

### 3.15 Stage & live flag (2)
| Column | Fill | Verdict |
| ---- | ---- | ---- |
| `data_stage` | 100% = all `PRE` | **BUG** → fixed → 580 PRE / 1,079 POST |
| `has_live_location` | 100% = `false` | **CORRECT** |

### 3.16 Subscription wrapper (12)
`subscription_id`, `subscription_is_active`, `subscription_created_on_utc`, `subject_id`,
`subscriber_type`, `subscriber_id`, `credits_remaining`, `balance_last_refilled_utc`,
`balance_last_deducted_utc` — **OK** (100%). `subscription_billing_type`,
`subscription_activate_before_utc`, `subscription_expires_on_utc` — **NEVER-SENT** (0%,
wrapper omits). `subject_type` — 0% (wrapper sends null; tier fallback now handles it).
`subscription_notices` — `[]` (OK).

### 3.17 Audit (3) — **OK**: `received_at`, `payload_json` (the raw JSON, intentionally),
`dedup_key` (unique per (flight, lastUpdatedUtc)).

### 3.18 Sampling (7) — **OP** (all 0%): `sampling_batch_id`, `airport_tier`,
`sampling_probability`, `sampling_weight`, `random_seed`, `collection_window_start/end`.
Null because the stray sub isn't in a managed batch. `airport_tier` is now derived by the
tier fallback (KJFK→HUB); the rest fill only with a real batch.

### 3.19 The JSON columns inside the CSV
| Column | What it holds | After backfill |
| ---- | ---- | ---- |
| `payload_json` | raw flight item (10 keys: aircraft, airline, arrival, callSign, codeshareStatus, departure, greatCircleDistance, isCargo, lastUpdatedUtc, number, status) | unchanged (audit) |
| `payload_json_flat` (JSONB, **new migration 0013**) | **readable single-level mirror** of `payload_json` with dot-notation keys (`arrival.airport.iata`, `departure.runwayTime.utc`, …). Numeric enums decoded to names (`status`→"EnRoute", `codeshareStatus`→"IsOperator", `departure.quality`→["Basic","Live"]). | populated by extractor (new rows) + backfill (existing rows) |
| `dep_quality` / `arr_quality` (JSONB) | `''` now | `["Basic","Live"]` / `["Basic"]` |
| `subscription_notices` (JSONB) | `[]` | `[]` (correct) |

---

## 4. Verify Gemini's audit against the REAL table (important)

Gemini's recommendations are based on an **imagined schema, not our actual table**.
Check every claim before running any SQL:

| Gemini claim | Reality in our CSV/schema | Verdict |
| ---- | ---- | ---- |
| "`loc_heading_deg`, `loc_ground_speed_kts`" | Our columns are `loc_true_track_deg`, `loc_ground_speed_kt` | ❌ wrong names |
| "position vectors populate during airborne updates" | **Never** in 1,662 rows; feed has no `location` block | ❌ wrong cause |
| "`dep_quality`/`arr_quality` = `{checkState, accuracyKm, source}`" | They are **numeric codes `[0,1]`** = Basic/Live | ❌ wrong structure |
| "`subscription_notices` = `[{code,timestamp}]`" | It is `[]` (empty) | ❌ wrong structure |
| "`is_cancelled`/`is_diverted` columns" | **Don't exist**; we use `status` codes 10/11/12 | ❌ schema hallucination |
| "`arr_delay_mins`, `arr_actual_utc`, `runway_arr_utc`" | **Don't exist**; we have `arr_runway_utc`, delay derived | ❌ schema hallucination |
| "`fp_route_text`" | Column is `flight_plan_route` (0%) | ⚠️ near-miss |
| "sampling_* null on older rows, backfill weight=1.0" | Correct that they're null, but cause = stray sub; **better: run a real batch** + filter `WHERE sampling_batch_id IS NOT NULL` for training | ⚠️ partial |
| "COALESCE(aircraft_reg, aircraft_mode_s)" | Both are ~99% populated; COALESCE still harmless for chaining | ✅ ok advice |
| "unique on (flight_number, dep_scheduled_utc, data_stage)" | **Would BREAK the design** — we keep versioned snapshots (multiple rows per flight per stage by design). Use the existing `dedup_key` + indexes. | ❌ don't do this |
| "flatten quality into `dep_quality_source/check_state`" | quality is `[0,1]` codes, not an object — nothing to flatten | ❌ no-op |

> **Bottom line:** do NOT run Gemini's `ALTER TABLE` — it adds columns that will be
> permanently null and would mis-model the data. Our fix (extractor + backfill) is the
> correct one.

---

## 5. What was fixed in code (committed + pushed)

1. **`server/lib/disruption/flightNotificationExtractor_v3.ts`** — numeric status/
   codeshare enums, capitalized gcd keys, numeric quality codes, correct PRE/POST
   `data_stage`, `statusCode` set directly.
2. **`server/lib/disruption/flightStatus_v3.ts`** — validator accepts numeric-or-string
   enums and both gcd key cases.
3. **`server/routes_v3.ts`** — tier fallback derives `airport_tier` from the subject
   ICAO when `subject.type` is null.

Verified: `npx tsc --noEmit` (0 errors in v3 files), and `scripts/test-extractor-real-payload.ts`
replays all 1,662 payloads **pass**.

---

## 6. Backfill (repairs the existing table on Replit)

`scripts/backfill_flight_data_pre_post.ts` re-runs the FIXED extractor over each stored
`payload_json` and `UPDATE`s status/status_code/codeshare_status/gcd_*/dep_quality/
arr_quality/data_stage/has_live_location + derives `airport_tier` + writes the new
`payload_json_flat` mirror. Idempotent, no re-pay. **Run on Replit after pulling.**

---

## 7. Bias / data quality (measured from CSV)

- **Hub-only:** one KJFK subscription. Dep airport = KJFK on **701** rows (JFK departures);
  the other **959** rows are arrivals INTO KJFK from elsewhere (dep airport = e.g. KLAX/KSFO/EGLL).
  138 distinct dep airports, 123 distinct arr airports — but ALL flights pass through KJFK.
- **Lifecycle coverage good:** 699 unique flight instances; rows-per-instance up to 17;
  sequences like `(1,2,9,9)` = Expected→EnRoute→…→Arrived captured. Exactly what the PRE/POST model needs.
- **Freshness:** delivery lag median 0.7 min, max 5.8 min, **0 rows > 60 min**.
- **Delay signal:** 977 rows have `dep_runway−dep_scheduled`, mean **+36 min**, max
  +359 min; 27 rows negative (≤−98 min, early-departure/schedule-change artifacts).
- **Arrival-outcome labels:** 194 unique flights observed to Arrived with actual
  `arr_runway_utc` — a real, usable post-departure target set.

---

## 8. Dedup / versioning behavior (important nuance)

`dedup_key = SHA256(flight_number|carrier|lastUpdatedUtc)`. AeroDataBox bumps
`lastUpdatedUtc` on every state change → **each change is a NEW row** (versioned
snapshot), not an in-place update. That's why 1,662 rows = 699 instances × ~2.4
snapshots. **By design** (timeline dataset). For a single-row-per-flight view, use
`DISTINCT ON (flight_number, dep_scheduled_utc) ORDER BY last_updated_utc DESC`.

---

## 9. Credit / API-call audit

- ~1,662 credits ≈ 1,662 rows (balance 9,554→7,878 = 1,676; matches deliveries).
- CRUD/coverage/balance = free. No polling (engine dead since 2026-08-08).
- CSRF-403 loop (the old credit burner) fixed 2026-08-10. **No waste.**

---

## 10. STRATEGIC: is webhook data enough for post-departure / GNN training?

### What the webhook DOES give (post-departure, verified in the CSV)
- **Milestone snapshots:** status transitions (Departed→EnRoute→Approaching→Arrived)
  with timestamps — `data_stage`, `status`, `dep_runway_utc`, `arr_runway_utc`,
  revised times, terminal/gate/baggage at both ends.
- **194 fully-arrived flights with actual arrival times** = ground-truth labels for
  arrival-delay / ETA prediction.
- Route/aircraft/carrier/gcd for graph node+edge features.
- 533 instances have ≥1 POST snapshot; 386 have ≥2 distinct statuses; 337 have ≥2 POST
  snapshots — enough for a milestone-sequence model.

### What the webhook does NOT give
- **No `location` block, ever** → no continuous position/speed/altitude/heading, no
  trajectory. `loc_*` will stay null forever on this feed.
- No `flightPlan` (no route/altitude profile), no `predictedTime`.

### So: do we need OpenSky?
| Model we want | Webhook enough? | If not, what's needed |
| ---- | ---- | ---- |
| **Pre-departure delay model** (tabular) | ✅ **Yes** | nothing |
| **Post-departure ETA/arrival-delay** from milestones (Departed→Arrived states + times) | ✅ **Yes** | nothing |
| **GNN on airport/route network** (nodes=airports, edges=routes, features=delay state/traffic) | ✅ **Yes** | the webhook provides airports, routes, gcd, delay signals |
| **Trajectory model** (RNN/transformer over per-minute position/velocity/altitude) | ❌ **No** | **OpenSky Network (free)** or AeroDataBox **AdsbUpdates** feed |
| **Real-time position features** during flight | ❌ **No** | OpenSky / AdsbUpdates |

### Recommendation
1. **Do NOT add OpenSky yet.** The current ML plan (pre-departure delay + post-departure
   milestone-based ETA + airport-network GNN) is fully served by the webhook data.
2. If/when you build a **trajectory** model (Phase 6b+), add **OpenSky Network** as a
   *supplementary* source (free, ADS-B state vectors per aircraft) OR AeroDataBox
   `AdsbUpdates` (same vendor, consistent API). The MLplanAugV1 §1b assumption that the
   webhook carries live ADS-B is **disproven** — update the plan doc.
3. Priority order: **(a)** run the backfill, **(b)** delete the stray sub, **(c)** run a
   real tier-rotating batch for multi-airport unbiased data, **(d)** collect multiple days
   to grow the 194 → thousands of arrived labels for the GNN.

---

## 11. Gemini's "quality = {checkState, accuracyKm, source}" — proof it's wrong

From the actual `payload_json` stored in the table:
```json
"departure": { "quality": [0, 1] },
"arrival":   { "quality": [0] }
```
`quality` is an **array of int codes** (0=Basic, 1=Live, 2=Approximate), NOT an object.
The correct ML feature is a JSONB array of names, which our fix produces:
`["Basic","Live"]`. Nothing to flatten into `source`/`checkState` columns.

---

## 12. What to run on Replit (fix the table + go FULLY AUTOMATIC)

**Good news: the daily manual steps are gone.** The watchdog now auto-rotates:
subscribe → collect → unsubscribe → next airports → repeat, and it auto-deletes
orphan subscriptions (like the stray KJFK sub that was charging forever). You only
pull, backfill once, and let it run. `ADB_AUTO_COLLECT` defaults to ON.

```bash
# 1. Pull the fixed code (migration 0013 auto-applies on server boot:
#    adds payload_json_flat JSONB — the readable flattened payload mirror)
cd /path/to/repo && git pull origin main

# 2. Backfill: repair the existing rows in place (idempotent, no re-pay).
#    Re-runs the fixed extractor; also writes payload_json_flat + derives airport_tier.
npx tsx scripts/backfill_flight_data_pre_post.ts

# 3. Verify the fix (status/gcd/quality nulls gone, PRE/POST split, flat populated)
npx tsx -e "const{pool}=require('./server/db');(async()=>{const r=await pool.query('SELECT count(*) FILTER (WHERE status IS NULL) AS s_null, count(*) FILTER (WHERE gcd_km IS NULL) AS g_null, count(*) FILTER (WHERE dep_quality IS NULL) AS dq_null, count(*) FILTER (WHERE payload_json_flat IS NULL) AS flat_null, count(*) FILTER (WHERE data_stage=\'POST\') AS post, count(*) FILTER (WHERE data_stage=\'PRE\') AS pre FROM clean.flight_data_pre_post');console.log(r.rows[0]);await pool.end()})()"
#   Expect: s_null=0 g_null≈9 (1 NaN-gcd row + 8 payloads with no gcd key) dq_null=0 flat_null=0 post≈1268 pre≈681

# 3b. Read one flattened payload (readability check)
npx tsx -e "const{pool}=require('./server/db');(async()=>{const r=await pool.query('SELECT payload_json_flat FROM clean.flight_data_pre_post WHERE payload_json_flat IS NOT NULL LIMIT 1');console.log(JSON.stringify(r.rows[0].payload_json_flat,null,1));await pool.end()})()"

# 4. START THE SERVER. The watchdog takes over from here automatically:
#    - stops a batch when its window (default 4h) elapses or budget (4000 credits) is hit
#    - deletes ORPHAN subscriptions (any webhook sub not in the active batch —
#      the stray KJFK sub 0731056c-… gets removed automatically on the next tick)
#    - AUTO-STARTS the next batch (different airports) after a 15-min cooldown
#    - repeats forever, rotating HUB/MID/REGIONAL airports
npm run dev

# 5. Optional tuning (env vars):
#    ADB_AUTO_COLLECT=0         # disable auto-rotation
#    ADB_WINDOW_HOURS=4         # how long each batch collects
#    ADB_AUTO_COOLDOWN_MIN=15   # gap between batches
#    ADB_AUTO_START_HOUR=0 / ADB_AUTO_END_HOUR=24  # UTC window to collect (e.g. 4..23)
#    ADB_BATCH_BUDGET=4000 / ADB_RESERVE_CREDITS=5000

# 6. Watch the log — you should see rotation happening with NO manual calls:
#    [adb-collector] watchdog started (window=4h, ... autoCollect=true)
#    [adb-collector] removed orphan subscription 0731056c-…
#    [adb-collector] AUTO-STARTED batch B0002 airports=KJFK,KORD,KATL,KBOS,KMIA ...
#    [adb-v3-webhook] received flights=N stored=M subscription=<batch sub> credits=…

# 7. Re-analyze after a real batch (sampling_batch_id should now be populated)
curl -s -X GET -H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET" http://localhost:5000/api/v1/collection/diagnostics
python3 scripts/analyze_flight_data_pre_post.py flight_data_pre_post2.csv
```

> **Note about the earlier curl failures:** `https://travnr.com/…` serves the SPA
> (the HTML you saw) and the management DELETE is CSRF-guarded — that path is the
> frontend, not the API. The API runs on the Replit app URL (e.g.
> `https://<preview>.replit.dev` or `localhost:5000`). With auto-rotation you
> never need to call these endpoints manually anyway.

---

## 13. Files touched

| File | Change |
| ---- | ---- |
| `server/lib/disruption/adbCollectionController_v3.ts` | **AUTO-ROTATION** — watchdog auto-stops expired batches, auto-deletes orphan subs, auto-starts the next batch (env-gated, default ON) |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | Fixed status/codeshare/gcd/quality/data_stage; emits `payload_json_flat`; preserves numeric subscription codes (`strOrCode`) |
| `server/lib/disruption/flattenPayload_v3.ts` | **NEW** — single-level dot-notation mirror (enums decoded) |
| `server/lib/disruption/flightStatus_v3.ts` | Validator accepts real payload shapes (incl. numeric `billingType`/`subject.type`) |
| `server/routes_v3.ts` | Tier fallback when `subject.type` is null |
| `server/lib/disruption/flightDataPrePostStore_v3.ts` | Upsert refreshes `payload_json_flat` |
| `shared/schema.ts` + `migrations/0013_*.sql` + `server/db.ts` | New `payload_json_flat` JSONB column (boot migration) |
| `scripts/analyze_flight_data_pre_post.py` | Column-by-column analyzer (CSV or JSON), incl. JSON-column stats |
| `scripts/test-extractor-real-payload.ts` | Replays 1,662+ payloads through fixed extractor + flatten checks |
| `scripts/backfill_flight_data_pre_post.ts` | Repairs existing rows in place, writes `payload_json_flat` (Replit) |
| `MDplan/V3_CollectionStrategy.md` | Endpoint paths corrected to `/api/v1/collection/*` |
| `MDplan/V3_WEBHOOK_VERIFY.md` | Endpoint paths corrected |
| `MDplan/V3_WebhookExtractionPlan.md` | Endpoint paths + §8.0 first-run runbook |
