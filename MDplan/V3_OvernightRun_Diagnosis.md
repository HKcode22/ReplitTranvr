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
> **UPDATED — v3 export `flight_data_pre_post3.csv` (2,199 rows, ~19:24 UTC)** confirmed
> the fixes hold at scale (§1C): status/codeshare 100%, gcd 99.6%, quality 99.5/98.6%,
> `data_stage` 100% (1,465 POST / 734 PRE), 0 dup dedup keys. The only remaining nulls
> are **true absences** (feed never sends them). §14 = the credit/resource accounting the
> user asked for; §15 = the 28 dead/duplicate columns removed (incl. `payload_json_flat`);
> §12 now uses an **adaptive credit budget** so auto-collection can start with ~3,100
> credits (no more 9,000 gate). **§16 = the full 60k-credit de-biasing campaign; §17 =
> credit monitoring + data-gap prevention** (the "time matters" plan) **+ §17.6 = the
> credit math explained step by step**; **§18 = how to read the collection logs**
> (CREDIT-PLAN, SUBSCRIBED/SKIP, tiers, heartbeat) **+ §18.7 = how to keep logs
> across Shell refreshes (`logs/collector.log`)**; **§19 = fully automated monitoring —
> in-server ALERTs, Slack push, `npm run health`, `npm run export` (received_at first)**. The
> batch starter now **fills each HUB/MID/REGIONAL slot with same-tier fallbacks** and
> the API throttle **retries 429s** — so a rate-limit or no-coverage airport can no
> longer silently turn a mixed batch into a hub-only (or regional-only) one.
>
> All conclusions are reproducible:
> ```bash
> python3 scripts/analyze_flight_data_pre_post.py flight_data_pre_post3.csv
> npx tsx scripts/test-extractor-real-payload.py flight_data_pre_post3.csv
> npx tsx scripts/backfill_flight_data_pre_post.ts   # repair DB rows (run on Replit)
> ```

---

## 0. TL;DR

| Question | Answer |
| ---- | ---- |
| Is the webhook → extractor → DB pipeline working? | **YES** — 1,949 real rows in the v2 export, 0 duplicate dedup keys, real flight data. |
| Is the DATA wrong? | **No.** The raw payloads are correct. The 4 field groups dropped to NULL (status/codeshare/gcd/quality) are **now repaired** — v2 shows 100%/100%/99.5%/99.5% populated. |
| Is `data_stage` set by us or the webhook? | **By US** — derived from the payload's real status code (`2`EnRoute→POST, `1`Expected→PRE…). See §1A. |
| Does `payload_json` hold valuable data? | **YES** — it is the complete raw flight item (times, airports, gcd, quality, aircraft) for both pre- and post-departure snapshots. `payload_json_flat` was its readable mirror but is **REMOVED** (§15) to halve table size — the raw JSON stays. |
| Are the "weird constants" a bug? | **Some are, some aren't.** `has_live_location=false`, `is_cargo=false`, `subscription_notices=[]` are correct; `data_stage=PRE`-everywhere was the extractor bug (now fixed). |
| Are the quoted timestamps a bug? | **CSV-export artifact, not a DB bug.** Every `TIMESTAMPTZ` cell parses as `"2026-08-10T08:09:00.000Z"` (with literal quotes) while TEXT cells are clean — see §2. |
| Are we collecting wrong / wasting credits? | **No.** ~1 credit per flight item; CRUD/balance free. §9 + §14. |
| Is there bias? | **Yes, historically:** all rows came from ONE stray KJFK subscription → hub-only. **Fixed:** the watchdog now auto-rotates HUB/MID/REGIONAL airports and deletes the stray sub automatically (§12). |
| Why couldn't auto-start collect with 3,105 credits? | The old gate demanded `budget 4,000 + reserve 5,000 = 9,000`. **Fixed:** the budget is now **adaptive** — with 3,105 credits it spends `min(3,000, 3,105−1,000) = 2,105` on a batch instead of refusing (§12/§14). |
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
| `payload_json_flat` | — | **0/1,949 in this CSV export** | ⚠️ historical note: the v2 export predates migration 0013. The column WAS later populated (v3: 2,199/2,199) but is **now removed** (§15) — the raw `payload_json` remains the source of truth. |
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

## 1C. v3 export (`flight_data_pre_post3.csv`, 2,199 rows) — the fixes hold at scale

The v3 export (2026-08-10 ~19:24 UTC) is **2,199 rows × 114 cols** (v2 had 113 —
the extra column is `payload_json_flat`, which §15 now removes). This is the
biggest, cleanest export yet and it **confirms everything works**:

| Group | v2 | v3 | Verdict |
| ---- | ---- | ---- | ---- |
| rows | 1,949 | **2,199** | growing through the day |
| `status` / `status_code` | 100% | **100%** (8 distinct) | ✅ |
| `codeshare_status` | 100% | **100%** (IsOperator 2,193 / IsCodeshared 6) | ✅ |
| `gcd_km` | 99.5% | **99.6%** (2,190/2,199; the 9 nulls are real absences) | ✅ |
| `dep_quality` / `arr_quality` | 99.5/98.5% | **99.5% / 98.6%** | ✅ |
| `data_stage` | 65% POST | **66.6% POST (1,465) / PRE (734)** | ✅ |
| `airport_tier` | 99.4% HUB | **98.8% HUB (2,172/2,199)** | ✅ ours, derived |
| `payload_json` | 100% | **100%** | ✅ audit |
| `payload_json_flat` | 0% in CSV | **100% (2,199/2,199) populated** | ⚠️ now fully populated — but **removed anyway** to halve table size (§15) |
| `sampling_batch_id` + `sampling_*` | 0% | **0%** | ⚠️ still null — all rows came from the stray KJFK sub, not a rotation batch. The adaptive budget (§12) lets a real batch start with the ~3,105 remaining credits. |
| `subject_type` | 0% | **1% (27 rows = "1")** | ✅ `strOrCode` preserves the numeric code now |
| dedup | 1,949 unique | **2,199 unique, 0 dups** | ✅ |
| dep airports | 148 | **153 distinct (KJFK 945, then KLAX 72, KSFO 50, KBOS 40…)** | still hub-biased until a rotation batch runs |

**Bottom line: the pipeline works end-to-end.** Every field the feed actually
sends lands in the table at ~100%; the only nulls are true absences. The dataset
is still hub-only because no rotation batch has run yet — the 3,105-credit
balance blocked the old 9,000 gate. That gate is now adaptive (§12/§14).

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
**Now REMOVED** from the table (§15) — nothing was being lost.

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
| ~~`payload_json_flat`~~ (JSONB, was migration 0013) | ~~readable single-level mirror of `payload_json`~~ | **REMOVED in migration 0014** (§15) — was a full duplicate doubling table size |
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
`payload_json` and `UPDATE`s status/status_code/codeshare_status/gcd_km/dep_quality/
arr_quality/data_stage/has_live_location + derives `airport_tier`. Idempotent, no
re-pay. **Run on Replit after pulling.** (The old `payload_json_flat` write is gone —
the column was removed in §15.)

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
# 1. Pull the fixed code (migration 0014 auto-applies on server boot:
#    drops payload_json_flat + 27 dead/duplicate columns — §15)
cd /path/to/repo && git pull origin main

# 2. Backfill: repair the existing rows in place (idempotent, no re-pay).
#    Re-runs the fixed extractor + derives airport_tier.
npx tsx scripts/backfill_flight_data_pre_post.ts

# 3. Verify the fix (status/gcd/quality nulls gone, PRE/POST split)
npx tsx -e "const{pool}=require('./server/db');(async()=>{const r=await pool.query('SELECT count(*) FILTER (WHERE status IS NULL) AS s_null, count(*) FILTER (WHERE gcd_km IS NULL) AS g_null, count(*) FILTER (WHERE dep_quality IS NULL) AS dq_null, count(*) FILTER (WHERE data_stage=\'POST\') AS post, count(*) FILTER (WHERE data_stage=\'PRE\') AS pre FROM clean.flight_data_pre_post');console.log(r.rows[0]);await pool.end()})()"
#   Expect: s_null=0 g_null≈9 (real absences) dq_null=0 post≈1465 pre≈734

# 4. START THE SERVER. The watchdog takes over from here automatically:
#    - stops a batch when its window (default 4h) elapses or budget is hit
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
#    ADB_BATCH_BUDGET=3000 / ADB_RESERVE_CREDITS=1000 / ADB_MIN_BATCH_CREDITS=300
#    # ADAPTIVE budget: with 3,105 credits the batch runs on min(3000, 3105-1000)=2105
#    # credits instead of refusing to start (the old 4000+5000=9000 gate is gone).

# 6. Watch the log — you should see rotation happening with NO manual calls:
#    [adb-collector] watchdog started (window=4h, ... autoCollect=true)
#    [adb-collector] removed orphan subscription 0731056c-…
#    [adb-collector] AUTO-STARTED batch B0002 airports=KJFK,KORD,KATL,KBOS,KMIA ...
#    [adb-v3-webhook] received flights=N stored=M subscription=<batch sub> credits=…

# 7. Re-analyze after a real batch (sampling_batch_id should now be populated)
curl -s -X GET -H "x-webhook-secret: $AERODATABOX_WEBHOOK_SECRET" http://localhost:5000/api/v1/collection/diagnostics
python3 scripts/analyze_flight_data_pre_post.py flight_data_pre_post3.csv
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
| `server/lib/disruption/adbCollectionController_v3.ts` | **AUTO-ROTATION** — watchdog auto-stops expired batches, auto-deletes orphan subs, auto-starts the next batch; **adaptive credit budget** (`min(batchBudget, balance−reserve)`, `minBatchCredits` floor) so low balances still start a batch; **heartbeat log + `lastReceivedAt`/`gapMinutes`/`refillRecommended` in status & diagnostics** (§17); **per-tier slot filling with same-tier fallback** so HUB/MID/REGIONAL mixture survives 429/no-coverage, `CREDIT-PLAN` + per-airport `SUBSCRIBED/SKIP` logs + `tiers={…}` on auto-start (§18) |
| `server/lib/disruption/aerodataboxLimiter_v3.ts` | **429-aware throttle** — serial queue now `ADB_API_MIN_INTERVAL_MS` (default 1000 ms) + exponential-backoff retry (3×) on HTTP 429 so batch creates don't silently drop airports |
| `server/lib/disruption/logFile.ts` | **Persistent log file** — tees every console line to `logs/collector.log` (gitignored, 20 MB rotation) so collection logs survive Shell refreshes/restarts; `npm run logs` / `npm run logs:last` / `npm run logs:count` (§18.7) |
| `scripts/export_flight_data.ts` | **`npm run export`** — writes `flight_data_pre_post<N>.csv` with **`received_at` FIRST** (DB insert time — the liveness column), newest rows at the bottom (§19.3) |
| `scripts/check_collection_health.ts` | **`npm run health`** — one-command DB-level PASS/FAIL report (gap, balance, rows today, active batch tier mix), exit 0/1; wire into Replit Scheduler for fully automated checks (§19.4) |
| `server/lib/disruption/flightNotificationExtractor_v3.ts` | Fixed status/codeshare/gcd/quality/data_stage; **stops emitting `payload_json_flat` + 27 dead columns**; preserves numeric subscription codes (`strOrCode`) |
| `server/lib/disruption/flattenPayload_v3.ts` | **DELETED** — `payload_json_flat` column removed (§15) |
| `server/lib/disruption/flightStatus_v3.ts` | Validator accepts real payload shapes (incl. numeric `billingType`/`subject.type`) |
| `server/routes_v3.ts` | Tier fallback when `subject.type` is null |
| `server/lib/disruption/flightDataPrePostStore_v3.ts` | Upsert refreshes all kept columns; removed the 28 dropped from `EXCLUDED_SET` |
| `shared/schema.ts` + `migrations/0014_*.sql` + `server/db.ts` | **28 columns dropped** from `flight_data_pre_post` (dead + duplicates, §15) via boot migration 0014 |
| `scripts/analyze_flight_data_pre_post.py` | Column-by-column analyzer (CSV or JSON), reflects the reduced column set |
| `scripts/test-extractor-real-payload.ts` | Replays 2,199 payloads through fixed extractor (flatten checks removed) |
| `scripts/backfill_flight_data_pre_post.ts` | Repairs existing rows in place (no longer writes `payload_json_flat`) |
| `MDplan/V3_CollectionStrategy.md` | Endpoint paths corrected to `/api/v1/collection/*` |
| `MDplan/V3_WEBHOOK_VERIFY.md` | Endpoint paths corrected |
| `MDplan/V3_WebhookExtractionPlan.md` | Endpoint paths + §8.0 first-run runbook |

---

## 14. Resources / credit accounting (what we actually spend)

**The user asked to go over how many resources we're using.** Measured from the
v3 export + balance blocks:

### 14.1 Cost model (AeroDataBox)
| Operation | Cost | Frequency |
| ---- | ---- | ---- |
| create / get / list / delete subscription | **0 credits** | per batch start/stop |
| checkAirportFeeds (coverage) | 0 credits | per airport per batch |
| get balance | 0 credits | every webhook + watchdog tick |
| **notification deliveries** | **1 credit per flight item** | every webhook |
| HTTP polling (the old credit-burner) | 0 — engine **dead since 2026-08-08** | never |

So **≈1 credit per stored row**. No hidden burn.

### 14.2 Observed usage (this dataset)
- v3 balance `last_deducted_utc` spans 2026-08-10 → 08-11, credits drifting
  7,920 → 3,105 (with refills at 01:15 and 20:07 on 08-10).
- The stray KJFK sub collected ~90 credits over ~45 min earlier (5,762 → 5,672);
  at ~1 credit/flight that matches the delivery rate.

### 14.3 Batch budgeting (NEW — adaptive, no more 9,000 gate)
The old rule demanded `budget 4,000 + reserve 5,000 = 9,000` before ANY batch
could start. With only 3,105 remaining the watchdog was permanently blocked
(`auto-start skipped: Credits too low … need 9000`). **Fixed:**

```
effectiveBudget = min(ADB_BATCH_BUDGET, creditsRemaining − ADB_RESERVE_CREDITS)
canStart        = effectiveBudget ≥ ADB_MIN_BATCH_CREDITS
```

Defaults now: `ADB_BATCH_BUDGET=3000`, `ADB_RESERVE_CREDITS=1000`,
`ADB_MIN_BATCH_CREDITS=300`. With 3,105 credits a batch starts **immediately** on
`min(3000, 3105−1000) = 2105` credits, leaves 1,000 in reserve, and stops when
it hits 2,105 deliveries — then rotates to fresh airports. Refill is only needed
when the balance is below `reserve + min = 1,300`.

### 14.4 What a budget buys (tuning table)
| Budget | ≈ flight items | ≈ 4h-window coverage | Notes |
| ---- | ---- | ---- | ---- |
| 500 | 500 | ~1 mid airport | quick debias sweep |
| 2,000 | 2,000 | 2–3 airports | good per-batch default |
| 3,000 | 3,000 | 3–5 airports | current default cap |
| 4,000+ | 4,000+ | a full hub | the old default — needs a big refill |

For **de-biasing** the dataset (the real goal), run 2–3 smaller adaptive batches
(2,000–2,100 each) across MID/REGIONAL airports — that's ~6,300 credits ≈ the
remaining balance, and it produces non-KJFK rows so the table stops being 99% hub.

---

## 15. Column removal (28 columns dropped — dead / duplicate)

**The user asked to remove `payload_json_flat` (keep raw `payload_json`) and
unnecessary/duplicate columns.** Every drop is justified by the v3 measured fill
rate (2,199 rows):

| Column(s) | v3 fill | Why removed |
| ---- | ---- | ---- |
| `payload_json_flat` | 100% | full duplicate of `payload_json` — was **doubling** table size; the raw JSON stays as source of truth |
| `gcd_m`, `gcd_mile`, `gcd_nm`, `gcd_ft` | 100% | the **same distance** in 4 extra units — `gcd_km` is canonical |
| `flight_plan_*` (10 cols) | **0%** | feed never sends a `flightPlan` block |
| `dep_predicted_utc`, `arr_predicted_utc` | **0%** | feed never sends `predictedTime` |
| `dep_airport_local_code`, `arr_airport_local_code` | **0%** | airport object has no `localCode` |
| `dep_baggage_belt` | **0%** | departure block has no `baggageBelt` (arrival-only — keep `arr_baggage_belt`) |
| `notification_summary`, `notification_remark` | **0%** | wrapper never sends them |
| `aircraft_image_*` (6 cols) | **0%** | no `aircraft.image` block |

**Kept on purpose** (real data, not duplicates): `subscriber_id` (the webhook URL)
vs `subscription_id` (the sub UUID) are **different things**; `subscriber_type` =
`WebHook` (constant but real); `subject_type` now fills as a numeric-code string;
all `loc_*` stay because they are the **designed home for future ADS-B trajectory**
(§10) — re-adding them later would be churn.

Migration: `migrations/0014_flight_data_pre_post_drop_dead_columns.sql`
(`DROP COLUMN IF EXISTS`, idempotent, auto-applies on boot). Table goes
**114 → 86 columns**, roughly halving exported size (`payload_json_flat` was the
~5 MB duplicate in the 10 MB CSV).

---

## 16. When credits return to 60,000 — collecting *correctly* (no bias)

The user asked: **once the balance is back to the full 60k units, how do we
collect so the dataset is unbiased and we actually get what we need?** Short
answer: the machinery is already bias-aware — you just need to (a) set the right
tier mix, (b) spend the 60k in **planned phases**, not one giant batch, and
(c) verify with `diagnostics` after every phase. Details below.

### 16.1 The four levers (what we can actually control)
We cannot subscribe to "a few flights" — an airport subscription captures the
**whole airport** (`MDplan/V3_CollectionStrategy.md` §1). The only levers are:

1. **Which airports** (from the 276-airport tier catalog).
2. **The tier mix** per batch — `ADB_TIER_MIX` = `{HUB, MID, REGIONAL}` slots.
3. **The window length** — `ADB_WINDOW_HOURS` (default 4 h).
4. **The credit budget** — `ADB_BATCH_BUDGET` (now adaptive, §14).

Every captured row is stamped with `sampling_batch_id`, `airport_tier`,
`sampling_probability`, `sampling_weight`, `random_seed`, and the window — so the
GNN can do **Inverse-Probability Weighting** later and undo any residual
selection bias (strategy doc §4).

### 16.2 Recommended 60k-credit campaign (phased, de-biasing first)

| Phase | Credits | Tier mix (`ADB_TIER_MIX`) | Why |
| ---- | ---- | ---- | ---- |
| **0 — debias sweep** | ~6,000 (3 × 2,000) | `{"HUB":0,"MID":2,"REGIONAL":3}` | Kills the 99%-hub bias. Small adaptive batches across MID/REGIONAL only. This is the **first thing to do** when refilled. |
| **1 — balance** | ~30,000 (10 × 3,000) | `{"HUB":1,"MID":2,"REGIONAL":2}` (default) | The steady-state stratified mix. Rotates automatically away from recent airports. |
| **2 — regional depth** | ~12,000 (4 × 3,000) | `{"HUB":0,"MID":1,"REGIONAL":4}` | Deliberately grow the long tail the GNN must generalize over. |
| **3 — hub density** | ~10,000 (2 × 5,000) | `{"HUB":2,"MID":2,"REGIONAL":0}` | Only after phases 0–2 have breadth; hub congestion-cascade features. |
| **Hold** | ~2,000 | — | Reserve for refill rounding + never let balance hit the 1,300 floor. |

**Total ≈ 60,000.** Because batches are budget-capped and auto-stopped, each
phase is just "set env, let the watchdog run" — you do **not** need to babysit
`start`/`stop`. The rotation avoids the last 2 batches' airports automatically.

### 16.3 "Am I getting what I need?" — the acceptance checks

After each phase, run `GET /api/v1/collection/diagnostics` and read **five** numbers:

1. **`byTier.share`** — HUB / MID / REGIONAL row shares. Bias target (from the
   world mix): roughly **HUB ~60%, MID ~25%, REGIONAL ~15%** of *scheduled
   commercial flights* (big hubs carry most traffic). If REGIONAL < 5%, you are
   still hub-blind → run Phase 0/2 again.
2. **`byDepartureHour`** — rows should spread across the **day, not one UTC band.**
   If everything is 14:00–18:00 UTC, your batch windows keep landing in the same
   timezone's evening → stagger `ADB_AUTO_START_HOUR` or lengthen
   `ADB_WINDOW_HOURS` occasionally (strategy doc §8).
3. **`totalEstimatedCredits`** — credits consumed so far (≈ rows with a
   `sampling_batch_id`). Compare to the phase budget.
4. **`batches`** — the batch list with per-batch `rows`. 0 rows on a batch = that
   airport had no flights in the window or the sub failed → check
   `created`/`skipped` in the start log.
5. **`byDelayBucket` / `byStatus`** — sanity: you should see `Canceled`,
   `<15min`, `15-60min`, `>180min` all present. A dataset with zero cancellations
   is missing a whole class the model must learn.

Also verify the stamping (one-line SQL, run on Replit):
```sql
SELECT sampling_batch_id, airport_tier, sampling_probability, sampling_weight,
       random_seed, count(*) AS rows
FROM clean.flight_data_pre_post
WHERE sampling_batch_id IS NOT NULL
GROUP BY 1,2,3,4,5 ORDER BY rows DESC LIMIT 15;
```
Every row here should carry a real batch id + tier + weight. Rows **without** a
batch id (the old KJFK 2,199) should stay **excluded from training** — filter
`WHERE sampling_batch_id IS NOT NULL` (§12 note).

### 16.4 Time-of-day / season spread (the subtle bias)
The China GNN used a full 3-month population; we can't, but we *can* deliberately
spread across time:
- Vary `ADB_AUTO_START_HOUR` / `ADB_AUTO_END_HOUR` so batches land at different
  UTC hours across the day.
- Occasionally set `ADB_WINDOW_HOURS=6–8` so one window spans more of the day.
- Over a month, aim to have **multiple batches per weekday** and some weekend
  coverage — `byDepartureHour` + `received_at` span will tell you if you did.
- Record the batch `started_at` (already in `adb_collection_batches`) so any
  downstream model can condition on time-of-day / day-of-week.

### 16.5 What "enough data" looks like
| Goal | Target rows (with batch id) | Source benchmark |
| ---- | ---- | ---- |
| Pre-departure delay model | ≥ 10,000 clean rows | Purdue top-N studies used 1 year; we scale down |
| Post-departure milestone ETA | ≥ 3,000 **arrived** flights (label = real `arr_runway_utc`) | current: 194 in 2,199 rows → need ~15× |
| GNN airport-network | ≥ 20,000 rows spanning ≥ 50 airports, all 3 tiers | China GNN: 1.06M/236 airports |
| Trajectory model (Phase 6b+) | N/A on this feed | needs OpenSky/AdsbUpdates (§10) |

At ~1 credit/row, 60k credits ≈ **~50–60k rows/month** — a solid GNN training
set. The bottleneck is **arrived labels**, so prioritize batches on routes/airports
that complete flights (hubs do; that's why Phase 3 hub density matters).

---

## 17. Credit monitoring + data-gap management (time matters)

The user asked: **how do I keep checking the credits, because if there's a gap in
data collection it hurts the ML?** Two separate things to watch: (a) the credit
balance, and (b) **continuity** of incoming data. Both now have built-in tooling.

### 17.1 What a gap actually breaks
The PRE/POST model is built from **versioned snapshots per flight**
(`dedup_key = flight|carrier|lastUpdatedUtc`, §8). A gap = a stretch of time where
NO flights got captured. Consequences:
- **Broken lifecycle sequences** — flights that started before the gap and
  finished during it are missing their `EnRoute→Arrived` chain → their rows become
  one-off snapshots instead of usable POST labels.
- **Temporal bias** — if the gap is "always the same hours" (e.g. every night the
  balance hits 0 at 21:00), the model learns a distorted day.
- **Credit exhaustion = a hard gap.** Balance hits the 1,300 floor → the watchdog
  cannot auto-start → zero new rows until you refill. That's the #1 cause of the
  gaps you're worried about.

### 17.2 Monitoring credits (three ways, all free)
1. **Heartbeat log (NEW).** The watchdog now logs every ~10 minutes:
   ```
   [adb-collector] heartbeat balance=3105 gap=42min canStart=true ...
   ```
   `gap` = minutes since the last stored row. If `gap` keeps climbing, data has
   stopped — look at `reason`.
2. **`GET /api/v1/collection/status` (NEW fields)** — returns `balance`,
   `effectiveBudget`, `canStart`, `reason`, plus **`lastReceivedAt`** and
   **`gapMinutes`** so a script/cron can alert you.
3. **The webhook log line** — every delivery prints
   `[adb-v3-webhook] received flights=N stored=M ... credits=…`; watching it is the
   real-time check.

**Alert rule of thumb (set a reminder / cron):** if `gapMinutes > 60` **or**
`balance < 2000`, refill or investigate. That keeps you far above the 1,300 floor
and gives an hour of buffer to react before ML data continuity is at risk.

### 17.3 SQL to check balance + gap from the DB (run on Replit)
```sql
-- balance is on every row (the wrapper sends it): latest value
SELECT credits_remaining, balance_last_refilled_utc, balance_last_deducted_utc
FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 1;

-- data continuity: largest gap between consecutive rows (minutes)
SELECT max(gap_min) AS max_gap_min
FROM (
  SELECT EXTRACT(EPOCH FROM (received_at - lag(received_at) OVER (ORDER BY received_at)))/60 AS gap_min
  FROM clean.flight_data_pre_post
) t;

-- per-hour volume for the last 24h — a flat/zero row = a gap
SELECT date_trunc('hour', received_at) AS hr, count(*) AS rows
FROM clean.flight_data_pre_post
WHERE received_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1;
```

### 17.4 The gap-prevention playbook
| Scenario | What happens now | What you do |
| ---- | ---- | ---- |
| Balance drops below floor (1,300) | Watchdog logs `auto-start skipped: Credits too low…`; no new batches | **Refill before it hits the floor.** The adaptive budget already spends only what's above the 1,000 reserve, so refilling **any amount** resumes collection immediately (no 9,000 gate). |
| Batch window elapses | Watchdog auto-stops (`window_elapsed`), cooldown 15 min, auto-starts next | Nothing — rotation resumes by itself. |
| Budget reached mid-window | Watchdog auto-stops (`budget_reached`), same auto-restart | Nothing. |
| No delivery for > 60 min | Heartbeat shows `gap=NNmin` climbing | Check `reason`; if `canStart=false` → refill. If `canStart=true` but still dry → the batch's airports had no flights (small regionals); the next batch rotates anyway. |
| Server restarted | Watchdog re-arms on boot; auto-start continues | `npm run dev` and confirm the `watchdog started` log. |
| Refill arrives | Next watchdog tick (≤ 60 s) sees `canStart=true` and starts a batch | Nothing — automatic. |

### 17.5 One-time setup to never miss a gap (recommended)
- **Replit cron / scheduler** (or any free cron hitting the URL): every hour call
  `GET /api/v1/collection/status` (with the management secret) and email/Slack you
  if `gapMinutes > 60 || balance < 2000`. The endpoint now returns both values
  precisely so this check is a 2-line script.
- **Check the heartbeat** in the Replit log once a day — it's printed every
  ~10 min already, so a scroll shows the whole day's continuity.
- **Keep `ADB_AUTO_COLLECT=1`** (default) — never run collection by hand again;
  gaps then only come from an empty balance, which the heartbeat surfaces.

> **TL;DR for the 60k plan + monitoring:** when refilled, run the 4-phase campaign
> in §16.2 (start with a REGIONAL-only debias sweep), verify each phase with the 5
> `diagnostics` checks (§16.3), keep the hourly status check (§17.2) so a credit
> dry-run becomes a 1-line alert instead of a silent multi-hour data gap (§17.4).

### 17.6 The credit math, step by step (explain it to your teammate)

**The three knobs (all in `COLLECTOR_CONFIG`, default):**
| Knob | Default | Meaning |
| ---- | ---- | ---- |
| `batchBudget` | **3,000** | the most credits a single batch is allowed to *try* to spend |
| `reserveCredits` | **1,000** | credits we refuse to touch — the emergency floor for existing subscriptions |
| `minBatchCredits` | **300** | a batch must be able to spend at least this many credits, or it won't start at all |

**The rule (one line):**
```
effectiveBudget = min( 3000,  balance − 1000 )
canStart        = effectiveBudget ≥ 300   AND   no batch is already active
```

**Worked examples with a 60,000-credit balance:**
| Balance | `balance − reserve` | `effectiveBudget` | What happens |
| ---- | ---- | ---- | ---- |
| 60,000 | 59,000 | **3,000** (capped) | Full-size batch: 3,000 credits of flights per batch. |
| 12,000 | 11,000 | **3,000** | Still full-size — anything above 4,000 gives the full 3,000. |
| 4,000 | 3,000 | **3,000** | Full-size again (exactly at the cap). |
| 3,105 (today) | 2,105 | **2,105** | Batch shrinks to what's affordable. |
| 1,300 | 300 | **300** | Minimum-size batch — the floor; starts, but tiny. |
| 1,299 | 299 | **299** | **Blocked.** `minBatchCredits` guard → no batch, `reason=Insufficient credits`. |

**What one credit buys:** ~1 flight item per webhook notification. 3,000 credits ≈
3,000 flight rows per batch (each row = a pre or post snapshot of one flight).

**A full 60k burn-down schedule (worst case, non-stop):**
```
Day 1  balance 60,000 → batches of 3,000 → ~10 full batches before refill
       (each batch lasts until budget spent or the 4-hour window ends)
       + 1,000 reserve never touched → you can auto-start down to balance 4,000
Day 2  at 4,000 → batches shrink below 3,000 (3,000, 2,000, 1,000, 700…)
       at 1,300 → 300-credit batches, still running
       at 1,299 → STOP. reason="Insufficient credits". refillRecommended tells you
                  exactly how much: e.g. balance 1,200 → refill 2,800 → 4,000
                  (3,000 budget + 1,000 reserve) for a full batch again
```
**What "goes down" means and what auto-recovers:**
- **Balance too low** → watchdog logs `auto-start skipped: Insufficient credits`,
  no data flows → this is a real gap → refill any amount > 300 and it resumes on
  the next tick (≤ 60 s). Nothing else to do.
- **Batch window elapsed (4 h)** → watchdog auto-stops that batch, waits 15 min
  cooldown, auto-starts a NEW batch with fresh airports. No action.
- **Budget spent mid-window** → same: auto-stop, cooldown, auto-start. No action.
- **One airport rate-limits / has no coverage** → the batch fills that tier slot
  with the next airport in the same tier (§18.2). No action.

**How long each collection cycle lasts (all defaults):**
| Event | When | Duration |
| ---- | ---- | ---- |
| Batch runs | auto-start → stop | up to **4 h** (`windowHours`) unless budget runs out first |
| Cooldown | between batches | **15 min** (`autoCooldownMinutes`) |
| Auto-start allowed | each day | `autoStartHourUtc`–`autoEndHourUtc` (default the whole day) |
| Watchdog tick | checks everything | every **60 s**; heartbeat line every 10 ticks (~10 min) |

So in a 24 h day the theoretical max is ~ (24 h / (4 h + 15 min)) ≈ **5–6 batches/day**,
but the real limiter is credits: 3,000/batch × 5–6 = 15,000–18,000 credits/day of
collection at full pace.

---

## 18. Reading the collection logs (what each line means)

The user asked for **detailed logs so it's obvious whether collection is working**.
Here is exactly what you'll see in the Replit terminal and how to read it:

### 18.1 Startup (once per boot)
```
[migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[adb-collector] watchdog started (window=4h, budget=3000 credits/batch, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":2}, autoCollect=true)
```
`watchdog started` = auto-rotation is armed. `autoCollect=true` means batches
start/stop themselves. If you ever see `autoCollect=false`, set `ADB_AUTO_COLLECT=1`.

### 18.2 Batch start (this is where the mixture is decided)
```
[adb-collector] CREDIT-PLAN batch=B0001 balance=3105 reserve=1000 → effectiveBudget=2105 tierMix={"HUB":1,"MID":2,"REGIONAL":2}
[adb-collector] batch B0001 HUB SAEZ SUBSCRIBED (1/1 slots) sub=00c59665-…
[adb-collector] batch B0001 MID KMSP SKIP create_failed — trying next MID airport
[adb-collector] batch B0001 MID KSAN SUBSCRIBED (1/2 slots) sub=…
[adb-collector] AUTO-STARTED batch B0001 airports=SAEZ,KSAN,… tiers={"HUB":1,"MID":2,"REGIONAL":2} created=5 skipped=1 budget=2105
```
Read it like this:
- **`CREDIT-PLAN`** → "with 3,105 credits we can afford a 2,105-credit batch". This is the
  credit-based decision you asked for — the batch size is computed from the balance.
- **`SUBSCRIBED (n/slots)`** → an airport is live and will push flight notifications.
- **`SKIP …`** → that airport was rejected (no coverage / create failed / rate limit);
  the code now **tries another airport in the same tier** so the mixture survives.
- **`tiers={…}`** → the actual HUB/MID/REGIONAL split of this batch. This is your
  **daily-mixture check**: you want all three tiers > 0 **every batch** (one day HUB-heavy,
  next day REGIONAL-only is exactly the temporal bias we're avoiding). If a tier shows 0,
  scroll up to see which `SKIP` lines caused it.

### 18.3 Webhook deliveries (proves data is flowing)
```
[adb-v3-webhook] received flights=2 stored=2 (new=2 updated=0) skipped=0 subscription=… credits=3105 ms=44 | KJFK->KATL:EnRoute[B0002/HUB] KMSP->ORD:Expected
```
- `flights=N` = notifications delivered · `stored=N` = rows written ·
  `new=` fresh rows / `updated=` refreshed rows (upsert) ·
  `skipped=0` = all had a flight number (0 is the healthy number) ·
  `credits=` balance AFTER this delivery (1 credit per flight item).
- **NEW detail tail (after the `|`):** the actual flights that landed, as
  `dep->arr:Status[batch/tier]` (up to 8, then `+N more`). This is your instant
  "is data really coming in?" check — you see real routes and statuses, plus which
  batch/tier they belong to.
- If `stored=0` for many lines → nothing new is landing → check §17.

### 18.4 Heartbeat (every ~10 min)
```
[adb-collector] heartbeat balance=3105 rowsToday=1520 gap=42min canStart=true active=B0002 rows=1200 tiers=HUB:400,MID:550,REGIONAL:250
[adb-collector] heartbeat balance=1200 rowsToday=1650 gap=5min canStart=false refillToFullBudget=3100 reason=Insufficient credits (1200 < reserve 1000 + min batch 300)
```
- `gap=NNmin` = minutes since the last row — if it climbs past ~60, data stopped.
- **`rowsToday=N`** = total rows stored since midnight UTC — watch this climb day over day.
- **`tiers=HUB:n,MID:n,REGIONAL:n`** (active batch only) = the live mixture of the
  current batch — all three > 0 means the daily-mixture guarantee is holding.
- `canStart=false` + `reason=…` = why it can't auto-start; **`refillToFullBudget=3100`**
  tells you exactly how many credits to add to run a full 3,000-credit batch.

### 18.5 Errors you might see
| Log line | Meaning | Action |
| ---- | ---- | ---- |
| `rate-limited (429) — retrying in 1500ms` | RapidAPI per-second cap | **Fixed automatically** — it retries (up to 3×) with backoff instead of dropping the airport |
| `createSubscription … 429` (still, after retries) | sustained rate limit | Check `AERODATABOX_API_KEY` plan; raise `ADB_API_MIN_INTERVAL_MS` (default 1000) to slow the queue |
| `only filled 2/3 REGIONAL slots` | not enough candidates had coverage/created | Usually fine — the next batch rotates to fresh airports |
| `watchdog error: …` | non-fatal tick error | Note it; the next 60s tick retries |
| `EADDRINUSE port 5000` | another server instance is running | Stop the old one (`Ctrl-C`) and restart |

### 18.6 The one-line "is it working?" check
Every morning, scroll the log and confirm you saw in the last 24 h:
1. `CREDIT-PLAN` + `AUTO-STARTED` lines (batches are running),
2. `tiers={"HUB":…,"MID":…,"REGIONAL":…}` with **all three > 0** (mixture held),
3. `received flights=N stored=N` lines (data is landing),
4. heartbeats with `gap` in single digits and `canStart=true`.

### 18.7 The persistent log file — logs that survive a Shell refresh
**Problem solved:** the Replit Shell scrollback is wiped when the tab refreshes or the
workspace restarts. Now every console line (migrations, heartbeat, deliveries, errors)
is **tee'd to `logs/collector.log`** on disk (gitignored, not in the DB). Restart-safe:
it appends, so history from before a restart is still there.

| Where | Command | What it does |
| ---- | ---- | ---- |
| Replit Shell **or** Mac terminal (in the repo root) | `tail -f logs/collector.log` | **live stream** — leave it open and you watch collection in real time |
| | `npm run logs` | same as above (shorthand) |
| | `tail -200 logs/collector.log` / `npm run logs:last` | last 200 lines — enough to paste back to Claude |
| | `npm run logs:count` | how many lines you've accumulated |
| Mac (outside Replit) | `npm run dev` in the local repo | you'll get the same file locally — open a **second terminal** and `tail -f logs/collector.log` |
| Both | `grep "heartbeat\\|AUTO-STARTED" logs/collector.log` | just the important lines |

**To paste logs back to me:** `npm run logs:last` (or the grep above) and copy the output
into your message — even if the Shell refreshed in between, the file still has it all.
The file rotates at 20 MB (`ADB_LOG_MAX_MB`) so it can't grow forever.

---

## 19. Fully automated monitoring — you do NOT have to check daily

The user asked: *"do I have to manually check every day that nothing broke?"* **No.**
Everything below is automatic. The only manual action that ever exists is **refilling
credits when an ALERT says so** — and even the ALERT can be pushed to Slack.

### 19.1 The column that tells you data is landing: `received_at`
- `received_at` = the moment the webhook row was **written to the DB**. This is the
  column to trust: if `max(received_at)` keeps moving forward, data is flowing.
- `last_updated_utc` = the **flight's** last change from AeroDataBox. It can sit at an
  old time for hours (a stable flight) while rows are still being written — that's why
  it *looked* like nothing was being added. Don't use it as a liveness signal.
- **Exports now put `received_at` FIRST** (`npm run export`, §19.3) so you see the
  newest row immediately without sliding right.

### 19.2 What is ALREADY automated (in the server, no cron needed)
| Guard | How it runs | What you see |
| ---- | ---- | ---- |
| Data-flow heartbeat | every ~10 min | `heartbeat balance=… rowsToday=… gap=…min` |
| **ALERT on stall** | heartbeat tick | `⚠ ALERT data gap: no row for 90min` |
| **ALERT on low balance** | heartbeat tick | `⚠ ALERT balance low (1900 < 2000) — refill 2100+` |
| ALERT cooldown | 30 min | fires again until the problem clears |
| ALERT cleared | automatic | `ALERT CLEARED — collection healthy again` |
| Slack push (optional) | `ADB_ALERT_WEBHOOK_URL` set | POSTs `Travnr ⚠ …` to Slack on every new alert |
| Orphan-subscription cleanup | watchdog | auto-deletes stale subs each batch |
| Batch rotation | watchdog | auto-stop on window/budget, cooldown, auto-start |

**The alert triggers are configurable:** `ADB_ALERT_GAP_MIN` (default 90),
`ADB_ALERT_MIN_BALANCE` (default 2000), `ADB_ALERT_COOLDOWN_MIN` (default 30).

### 19.3 The three commands you'll ever need (all in the repo)
| Command | What it does | When |
| ---- | ---- | ---- |
| `npm run logs:last` | last 200 log lines (paste back to Claude) | any time |
| `npm run health` | one-line PASS/FAIL report from the DB; exit 0/1 | any time, or automated below |
| `npm run export` | writes `flight_data_pre_post<N>.csv` with **`received_at` first**, newest at the bottom | when you want a snapshot for ML |

### 19.4 Fully-automated daily checking (2-minute setup, then zero manual work)
1. **Wire Slack (optional but recommended):**
   - Create a Slack Incoming Webhook (workspace → apps → incoming webhooks).
   - On Replit add the Secret: `ADB_ALERT_WEBHOOK_URL = https://hooks.slack.com/services/…`
   - Restart. Now a stall or low balance POSTs to Slack automatically.
2. **Schedule the health check** (so even a dead server is caught):
   - Replit → **Tools → Scheduler** → New job → every 6 hours →
     command: `npm run health`
   - If the check fails, Replit notifies you / you can point it at a webhook too.
   - The script prints `PASS` lines and exits 0 when healthy, `FAIL` + exit 1 when not.
3. **That's it.** You now get: Slack push on problems + scheduled DB-level checks.
   Nothing else requires attention.

### 19.5 "What do I actually need to do?" — the whole answer
- **Nothing daily.** If the Slack/cron setup is done, you're alerted before data is at
  risk (90 min of silence or balance < 2,000).
- **The ONLY recurring action:** when you get `⚠ ALERT balance low … — refill NN+`,
  top up that many credits (any amount ≥ 300 works; the batch sizes itself).
- **Once a week (optional):** `npm run health` and a glance at
  `npm run logs:last | grep heartbeat` to see `rowsToday` climbing.
- **If you see `⚠ ALERT data gap` with a healthy balance:** the batch's airports had no
  flights or a subscription silently died — paste `npm run logs:last` to Claude with
  the alert line; the next batch rotation usually fixes it automatically.

> **TL;DR for §19:** trust `received_at`, not `last_updated_utc`. `npm run export`
> writes CSVs with `received_at` first. The server self-monitors and screams
> (`⚠ ALERT`) when data stalls or credits run low, can push to Slack, and
> `npm run health` is a one-command PASS/FAIL you can schedule on Replit. The only
> manual thing left is refilling credits when alerted.
