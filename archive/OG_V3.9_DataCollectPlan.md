# V3.9 — Data Collection Plan (single, organized, binding)

> **How this document is organized (rebuilt 2026-08-12).** This file merges the
> two specs that previously lived separately:
>
> 1. **PART 1 — THE FINAL PLAN (binding).** The complete, current, executable
>    contract: what we collect, how we pay, how we keep it honest, what changes
>    in code, the GO gates, and the step-by-step runbook. This is the ONLY part
>    you need to execute. (Previously `V3.9_FINAL_PLAN.md`, now archived under
>    `archive/`.)
> 2. **PART 2 — DEEP-DIVE ADDENDA (detail, preserved).** The full worked detail
>    behind each part of the final plan — sampling economics, probability
>    honesty, weather data layer, evaluation suite, anchor protocol, window
>    experiments, calendar, diagnostics, config knobs, model ladder + graph
>    taxonomy. Everything that makes the plan defensible, preserved nearly
>    verbatim. Each addendum is cross-linked to the PART 1 section it supports.
> 3. **PART 3 — REVISION HISTORY (why it is this way).** How the plan evolved
>    V3.2 → V3.9-f.1: one entry per review, with the claim-by-claim
>    adjudications and the "what we deliberately did not change" frozen lists.
>    This answers the question **"which V3.x do we use?"** — we use ONE
>    document, this one; V3.2–V3.8 are revision history, not separate plans.

**Removed as redundant during organization:** §15 (principle-aligned
checklist — a restatement of §§6/8/9/10/13/19, which live in PART 2) and
§33 (first-month calendar summary — a duplicate of the full §25 calendar,
moved to PART 2 as DD-N). The §27 gates list is superseded by the final GO
gates (PART 1 §16) and §24 contents merged into the window-experiment
addendum (DD-M). Nothing else was deleted — all remaining detail is preserved
in PART 2 or PART 3.

---

# PART 1 — THE FINAL PLAN (binding)

> The single, complete, executable contract. Read this part to run the project.
> Its internal numbering (§1–§22) is the canonical one. Supersedes every prior
> revision.

**Status: LOCKED — architecture GO, collection WAIT until Gate 0 + gates 1–5 pass.**
Built from reviews 1–12 (ChatGPT1–4, CGTAnalaysis5–9, -9 follow-up, 11, and the
external SJSU/SDSU-grounded review adjudicated in `V3_CollectionStrategy2.md` §47).
This is the **V3.9-f.1 execution plan — deliberately NOT V3.10**. Once the gates
pass we stop revising and let the run produce the evidence.

**This file is the ONLY normative specification.** `V3_CollectionStrategy2.md`
is the full revision history; where anything there conflicts with this file,
this file governs (see §18 for the contradiction map).

---

## 1. How to read this plan

- `R#` = code delta, `S#` = schema/pipeline delta, `G#` = GO gate. All must
  complete before the 60k starts.
- Everything below is the **final, integrated decision**. No section here is a
  "menu" — V3.1→V3.9 were cumulative revisions of the same plan; this file is
  the frozen end-state.
- **This file is the ONLY document you need to read to execute.** All other
  files in `AugMDnotes/` (`V3_CollectionStrategy*.md`, `CGTAnalaysis*.md`,
  `ChatGptAnalaysis*.md`, `V3_WebhookExtractionPlan.md`) are history and
  adjudication records — cited only for provenance, never required for the run.
- Dates/times are UTC unless noted.
- The plan answers, in order: **what we collect (§2–§9), how we pay (§10–§11),
  how we keep it honest (§12–§14), what changes in code (§15), what must pass
  before we start (§16), how we run it step-by-step (§17), and why we trust it
  (§19).**

---

## 2. Locked architecture (end-to-end)

```text
AeroDataBox (maxDeliveryRetries = 0)   ←  webhook POST
        │  1 credit per flight item, deducted on SEND
        ▼
raw immutable notification envelope      (S4 — raw payload + SHA-256, never overwritten)
        │
        ▼
flight_events (append-only per delivery + per observation timestamp)  ──►  current flight_state (dedup)
        │  ├── every field preserved incl. live location (lat/lon/alt/gs/track/vsi/reportedAtUtc)
        │  └── NEVER reduced to "latest location" before storing
        │
        ├────────────────────────────►  provider-observable prediction population (S1, FIDS/schedule)
        │
        ├── (when POST) ──► raw_airborne_events ──► clean_airborne_points ──► flight_trajectory (S5)
        ▼
flight_population  (which flights EXISTED at each cutoff — provider-observable, NOT a true census)
        │
        ▼
cutoff-safe flight_snapshots  (T-24 / T-6 / T-90; features ≤ cutoff;
        │                       EXISTENCE = population-defined; post-cutoff events supply the LABEL only)
        ▼
flight_airborne_snapshots  (prediction_state = AIRBORNE; one row per (flight, observation_t);  S5)
        ▼
flight_outcomes   (five states: observed / active_censored / canceled / diverted / missing_outcome)
        │
        ▼
ML dataset + evaluation  (PRE: Engines A–E + R + P; AIRBORNE: Model POST; collection-mechanism ablation)
```

**Two prediction states (see §6.1), never merged into one row:**

```text
PRE-DEPARTURE        cutoff = scheduled-departure horizon (T-24 / T-6 / T-90)
                     predict departure delay / arrival disruption / cancellation / diversion

AIRBORNE (POST)      cutoff = provider observation timestamp t, valid when
                     actual wheels_off ≤ t < actual wheels_on (or terminal censoring)
                     predict landing ETA, remaining flight time, final arrival delay,
                     P(delay>15), P(delay>60), diversion risk
```

**Three promises the whole plan enforces:**

1. **Never destructively overwrite research provenance** (raw event log +
   current state both kept; dedup is an operational convenience, never the only
   dataset).
2. **No future information in dataset construction or features**
   (`feature_timestamp ≤ prediction_cutoff`; snapshot existence is
   population-defined, never event-defined).
3. **No foreign subscription can bill during the experiment** (exclusive set;
   balance delta = batch cost only because of R1).

---

## 3. Budget & accounting (two budgets — Gate 0)

### 3.1 Two separate pools, one shared quota (the Gate-0 fix)

AeroDataBox has **two billing concepts** fed from the SAME monthly RapidAPI API
quota (verified against aerodatabox.com/flight-alert-api-2026):

- **API quota** (units) — monthly allowance on the marketplace plan, spent by
  REST calls (search ≈1 unit, **FIDS ≈2 units**, rescore ≈2–4, simulate
  ≈6–12). Managed by RapidAPI; renews each billing cycle.
- **Flight-Alert credit balance** (credits) — dedicated balance, does not
  expire, pauses at 0; spent only by webhook deliveries: **1 credit per flight
  item per delivery attempt, deducted on SEND (not delivery), each retry costs
  another credit.** Refilled via `POST /subscriptions/balance/refill` at
  **1 credit = 1 API unit**. Per-refill and balance-cap limits depend on the
  pricing plan — verify at Gate 0.

### 3.2 The explicit partition of the 60,000 monthly API units (Gate 0)

```text
60,000 API units (monthly entitlement — VERIFY the actual plan at Gate 0)
│
├── Alert-credit refill  (1 unit → 1 credit)      = 58,900 units → 58,900 credits
│     ├── Spendable experimental envelope   = 57,900 credits  (58,900 − 1,000 floor)
│     │       (1,900 × 31 nominal, minus the permanently reserved 1,000;
│     │        the ONLY spendable experimental quota — the true binding
│     │        total-invariant is this 57,900, not 58,900)
│     └── Permanent balance floor           = ADB_RESERVE_CREDITS = 1,000 credits
│           (carved out of the 58,900 refill; controller refuses to
│            intentionally spend the balance below 1,000; doubles as the
│            emergency application reserve)
│
├── Census + REST budget                  ≈  1,000 API units (FIDS ≈2/call for S1 + anchor probes + diagnostics)
│     └── census spend is tracked against this line, NEVER against the refill line
│
└── Unallocated mathematical remainder    =    100 API units  (never used experimentally)
```

**Arithmetic check (no double-counting):** the 1,000 floor is INSIDE the
58,900 credit refill, not a third add-on. So:
`57,900 spendable + 1,000 floor (credits) + 1,000 REST/census + 100 unallocated
= 60,000 ✓`. **Maximum actual experimental spend = 57,900 credits**, never
58,900. Any report that says "58,900 spend" means *refill size*, which includes
the reserved 1,000; the spendable number is always 57,900.

**Rules:**
- The spendable experimental envelope is in **credits** (57,900); the
  FIDS/census spend is in **API units** (1,000) and comes out of the REST line.
  They are NOT the same pool — this resolves the contradiction the review found.
- The daily 1,900 cap is the per-day **ceiling**; the 57,900 envelope is the
  run-total **binding invariant**. On the final day(s), the scheduler sizes the
  window down automatically so total realized spend never exceeds 57,900
  (e.g. days 1–30 × 1,900 = 57,000 → day 31 is capped at the remaining ≈900).
- Track BOTH the RapidAPI usage page (units) and the Flight-Alert balance
  (credits). No manual REST-heavy UI actions (Rescore / Simulate / "Rescore
  all") during the run.
- **Gate 0 (new):** verify (a) actual plan + monthly units, (b) refill
  conversion 1 unit = 1 credit, (c) per-refill + balance caps, (d) census
  spend is budgeted on the REST line — all before any FIDS call.

### 3.3 Three cap concepts (never conflated)

1. **Estimated reservation (before):** `daily_budget_remaining = 1900 −
   credits_actually_consumed_today` (from the `adb_ingest_events` ledger).
   Estimate of what a start is allowed to spend, not a record of spend.
2. **Actual spend (during):** watchdog stops on observed spend.
   `SOFT_STOP = 1900 − ADB_DAILY_SOFT_STOP_MARGIN` (default 50, tuned from the
   canary's worst un-settled burst). `HARD_CAP = 1900`; any overshoot flags the
   batch `reconciliation_status='MISMATCH'`.
3. **Post-batch reconciliation (after):** `C_external = balance_before −
   balance_after` vs `C_internal = Σ notification_items`; `|Δ| ≤ tolerance →
   PASS`, else MISMATCH. Only meaningful on an exclusive subscription set (R1).

### 3.4 Enforced by code (already implemented: V3.9 / §34-Q)

- `adb_collection_batches`: `balance_before/after`, `credits_consumed_actual`,
  `credits_consumed_internal`, `notification_items_received`, rows
  stored/inserted/updated, `delivery_failures`, `reconciliation_status`.
- `adb_ingest_events`: one immutable row per webhook delivery
  (subscription_id, batch_id, received_at, items, stored/inserted/updated/
  skipped, credits_remaining, delivery_failure, error).
- Daily-cap math uses **notification items from the ledger**, not row counts.

---

## 4. Sampling frame (measured, stratified)

| Element | Decision |
| ---- | ---- |
| Universe | AeroDataBox-covered airports per feed, measured via `GET /api/v1/collection/coverage` (free) → `universeCount`, `catalogInUniverse`, `universeNotInCatalog` |
| Frame | `universe ∩ feed-eligible`; **keep every eligible airport, including zero-yield ones** (tracked, never dropped); only `coverage-failed` airports leave the frame |
| Zero-yield triage (restored) | **`zero_yield_once`** → keep + re-observe; **`zero_yield_repeated`** (≥2 empties) → keep, down-weight candidate; **`zero_yield_persistent`** → keep but excluded from adaptive down-weighting's *evidence*, eligible for manual review. **One empty observation is never treated as evidence the airport is useless** (could be low traffic, wrong time, temporary outage, schedule effect, or provider issue). Only `coverage-failed` airports (probe/feed errors, not empty observations) leave the frame |
| Primary strata | **traffic tier × macro-region** only (crossing more would explode cell count) |
| Balancing variables (reported within strata, NOT crossed) | network degree*, intl/domestic, carrier diversity*, time zone — from a FIXED reference snapshot at frame-build time, never from the recursive current sample |
| Catalog | catalog build script; regenerates when coverage refreshes (12 h cache) |
| Tier mix | **`{HUB:1, MID:2, REGIONAL:1}`** per batch |
| Unit of prediction | **a flight-leg outcome** ("departure delay of leg L at cutoff C") |

---

## 5. The provider-observable prediction population (S1 — the census layer, renamed)

**Why it exists:** the webhook is an event stream, not a census. "These flights
emitted an update we captured" ≠ "these are all the flights that existed at the
cutoff." Observability selects on airport size, activity, disruption severity,
tracking quality, airline, region, ADS-B coverage — the very things we predict.

**Naming (Gate-0 fix):** the FIDS/schedule layer is called the
**"provider-observable prediction population"**, NOT a "true census". It is
"population relative to the validated AeroDataBox-supported operational frame."
**Gate 5** validates provider-population → reference operational source (e.g.,
FAA/BTS-derived schedules/ops for US flights, where available) → observed.

| Layer | Contents | Source |
| ---- | ---- | ---- |
| `flight_population` | one row per (flight, cutoff): "existed in the provider-observable prediction population at cutoff T" | AeroDataBox FIDS/schedule (≈2 API units per airport-window) for every collected airport+window |
| `flight_snapshots` | feature state at T−24 / T−6 / T−90, features ≤ cutoff | built for every population flight, not only event-captured ones; missing features marked missing, never dropped |
| `flight_outcomes` | five-state outcome (§7) | filled from later webhook events |

**Corrected snapshot rule (the ONLY normative rule):** a snapshot exists iff
the flight was in the provider-observable prediction population at cutoff ∧
features available ≤ cutoff ∧ eligible for the horizon. **A post-cutoff webhook
event is required for the LABEL only — it never decides whether the snapshot
exists.** (This supersedes the old `V3_CollectionStrategy2.md` §11 line-667
rule, which was population-definition leakage.)

**Coverage metrics (G5 + monthly):** for every horizon, by airport tier /
region / time-of-day / airline / tail-known:
`population → captured → snapshot-eligible → snapshots → outcomes observed`.

**Full coverage taxonomy (restored — one airport belongs to exactly one state):**

```text
supported          in the AeroDataBox universe (feed covers it)
eligible           universe ∩ feed-eligible (in the frame)
directly_subscribed  we hold a billable subscription for it this batch
recently_observed  directly subscribed and produced observations in the window
edge_discovered    observed via another airport's flight/rotation (not directly
                   subscribed) — GNN-critical: edge-discovered ≠ directly observed
zero_yield_once     1 empty observation — keep + re-observe
zero_yield_repeated  ≥2 empty observations — keep, down-weight candidate
zero_yield_persistent persistent empties — keep, excluded from adaptive evidence
coverage_failed     feed/probe error — ONLY state that may leave the frame
stale               in frame, no direct observation in >60 days
```

Plus per-frame **coverage-age distribution** (hours since last direct
observation, by tier/region) reported monthly and at G5. The mapping
`global frame vs directly observed vs edge-discovered` is kept explicit
end-to-end so the GNN never conflates "not observed" with "no edge" (§12.3).

**Population-claims rule:** until the census layer is validated, all results
are "under the collection regime", never population-representative.

---

## 6. Data pipeline & provenance (S2–S5)

| # | Delta | Rule |
| ---- | ---- | ---- |
| S2 | Raw events immutable | `adb_ingest_events` never deleted/edited; every delivery retains subscription_id, batch_id, received_at, provider notification timestamp (if any), HTTP metadata, **raw payload + SHA-256**, parser version, schema version, number of items, upsert outcome |
| S3 | Event log before current state | `flight_events` (one row per flight-item observation) feeds `flight_state` (latest via dedup) — the dedup table is an operational convenience, never the only research dataset |
| S4 | Provenance invariant | "Never destructively overwrite research provenance." Rebuilding state from the raw log must be possible at any time |

### 6.1 Dual prediction-state data contract (PRE + AIRBORNE) — NEW (V3.9-f.2)

The plan has **two distinct prediction states**, never merged into one row.
**An event is NOT one of them.** `prediction_state` is a property of the
**snapshot / training example**, derived at dataset-construction time; the raw
event carries only immutable source facts (`event_phase`, `event_timestamp`,
`data_stage PRE|POST`). The same observation (e.g. an event at 14:10) may feed
features for multiple tasks → we never burn an event's reusability by stamping
it with one state. The two derived states:

```text
prediction_state = PRE_DEPARTURE        cutoffs: T-24h / T-6h / T-90m
                                        valid while prediction_cutoff < actual wheels_off
                                        target: departure delay / arrival disruption /
                                                cancellation / diversion

prediction_state = AIRBORNE             cutoff: the provider observation timestamp t
                                        valid while actual wheels_off ≤ t < actual wheels_on
                                        (or terminal censoring, §6.2)
                                        target: landing ETA, remaining flight time,
                                                final arrival delay, P(delay>15/60), diversion risk
```

**The cutoff rule is universal:** for BOTH states,
`feature/provider_timestamp ≤ prediction_cutoff`. For AIRBORNE the cutoff is the
flight's own observation timestamp (e.g. `reportedAtUtc`), so the model may use
`actual departure time` (known at t) but never `actual arrival time` (that is
the target). This generalizes the pre-departure rule from `≤ scheduled departure`
to `≤ prediction timestamp`.

**Availability-time rule (NEW, blocking — the deepest leakage fix):** "the
event happened before the cutoff" is NOT sufficient. A model predicts from
what the **system could actually know at the decision time**, so the eligible
condition is:

```text
feature eligible  iff  information_available_timestamp ≤ prediction_cutoff
```

where `information_available_timestamp` = when OUR system had the value (the
time a downstream feature could actually be built from it). This is stricter
than `event_timestamp ≤ prediction_cutoff`, which only proves the thing
happened, not that we knew it. Every preserved observation carries up to four
distinct timestamps and they are NEVER conflated:

```text
event_timestamp        when the thing actually happened/departed/etc.
provider_published_utc when the provider generated/published the observation
available_at           when OUR ingestion made it usable for feature-building
received_timestamp_utc when our system received the raw delivery
```

Example that must NOT leak: `reportedAtUtc = 14:00`, `provider_published =
14:01`, `available_at = 14:07`. With a prediction cutoff of 14:05 the
observation is INELIGIBLE even though `reportedAtUtc ≤ 14:05`, because the
information was not in the system until 14:07. This discipline applies
uniformly to: flight events, FIDS/schedule revisions, live flight status,
weather observations & forecasts (TAF amendments), network/congestion
features, and tail/rotation features (previous-leg arrival must be both landed
AND its arrival value available, by cutoff). `available_at` is computed at the
ETL layer from the S2 raw ledger (received timing), never backfilled from the
provider or from a later dataset.

### 6.2 Airborne data foundation (NEW — what the collector must preserve)

**AeroDataBox already provides the fields** — verified in our own code:
`server/lib/disruption/flightStatus_v3.ts` defines `liveLocation` with
`lat, lon, altitude, pressureAltitude, groundSpeed, trueTrack, vsiFpm,
reportedAtUtc`, and `flightNotificationExtractor_v3.ts` flattens all of them
(`loc_lat`, `loc_lon`, `loc_altitude_ft`, `loc_pressure_altitude_ft`,
`loc_ground_speed_kt`, `loc_true_track_deg`, `loc_vsi_fpm`,
`loc_reported_utc`, `has_live_location`, `data_stage PRE|POST`). The missing
piece is a **preservation + time-series contract**, not new provider data.

**Hard requirement:** do NOT reduce the webhook payload to "latest location"
before storing. `flight_events` must keep one row per observation so the
trajectory is reconstructable. Current code DANGER (verified
`flightDataPrePostStore_v3.ts`): the upsert dedup key is
`SHA-256(flight|carrier|lastUpdatedUtc)` — if the provider updates location
under the same `lastUpdatedUtc`, earlier points are overwritten. **S5 fixes
this** (§15): the research event log keys on `(flight, carrier, locReportedUtc)`
(plus fallback) so every airborne observation is preserved; the dedup
`flight_state` table remains the latest-state convenience and is never the
trajectory source.

**Per-observation fields to preserve (raw collection layer):**

| Group | Fields |
| ---- | ---- |
| Identity | flight_number, callsign, carrier, aircraft_reg, aircraft_mode_s, aircraft_model, icao24 where available |
| Times | `event_timestamp` (`reportedAtUtc`), `provider_published_utc`, `available_at`, `received_timestamp_utc` (four distinct timestamps per §6.1 availability rule — never conflated), `source_latency_seconds` (received − event) |
| Scheduled/revised | dep_scheduled_utc, dep_revised_utc, arr_scheduled_utc, arr_revised_utc, original/current/actual destination |
| Movement chain | **FAA-ASPM-style milestone set (8 fields, scheduled AND actual, never conflated):** `scheduled_gate_out`, `actual_gate_out`, `scheduled_wheels_off`, `actual_wheels_off`, `scheduled_wheels_on`, `actual_wheels_on`, `scheduled_gate_in`, `actual_gate_in` (mapped from `dep_scheduled_utc`, `dep_revised_utc`, `dep_runway_utc`, `arr_runway_utc`, `arr_scheduled_utc`, `arr_revised_utc`, `actual_gate_in`; each field keeps its own `available_at` per §6.1). Gate/taxi/airborne/block delays are all derivable and never conflated |
| Airborne state | lat, lon, altitude_ft, pressure_altitude_ft, pressure_hpa, ground_speed_kt, true_track_deg, vsi_fpm, on_ground, flight_phase |
| Derived (stored raw, computed in ETL) | distance_to_destination, distance_flown, fraction_of_route_completed |
| Context | weather_snapshot_id, eta_provider, eta_model_reference |
| QC | data_quality_flag, trajectory_gap_seconds, source_latency_seconds |

**Milestone-mapping verification (NEW, required before schema freeze — do NOT
blindly rename provider fields):** AeroDataBox exposes
`FlightAirportMovementContract` with `scheduledTime`, `revisedTime`,
`predictedTime`, `runwayTime`, `gate`, and other movement fields. That DOES NOT
automatically mean every provider `scheduledTime` equals FAA's
`scheduled_gate_out` or `scheduled_wheels_off`. Before the milestone schema is
frozen (and re-confirmed in the Gate 0.5 sample inspection), verify the ACTUAL
provider JSON semantics for each of the eight §6.2 milestones:
`mapped_<milestone> = <provider field path> + <semantics note>` (which
milestone it counts as and any caveat), recorded in the code/config, so a
provider `scheduledTime` is never renamed `scheduled_gate_out` unless the
provider's field semantics support that exact interpretation. Confirm
`runwayTime` means wheels-off/wheels-on (it does, per provider docs) and that
gate-out/gate-in have a real source before labeling them. This milestone
mapping is a binding §6.2 requirement; Gate 0.5 re-verifies it on live payloads
(§17 step 16). If a milestone cannot be verified (e.g. no reliable gate-in
source), it is kept NULL and explicitly marked `milestone_unverified`, never
approximated.

**Flight phase (explicit):** `pre_departure, taxi_out, airborne_climb,
airborne_cruise, airborne_descent, approach, landed, taxi_in, gate_in` — so ETA
at 10 min after takeoff is never pooled with ETA 100 NM from destination.

**Trajectory QC / provenance (S5):** never overwrite raw points; pipeline is
`raw_airborne_events → clean_airborne_points → flight_trajectory →
flight_airborne_snapshots → Model POST`. Cleaning removes impossible
lat/lon/alt/speed, sorts timestamps, joins flight identifiers, marks
unjoinable points — mirroring the Springer 2024 in-flight-ETA study (§19).

**Observation cadence policy:** do NOT assume a fixed cadence (the provider
sends on update, not on a guarantee). Define and measure:
`post_departure_observation_policy` with target cadence, minimum acceptable,
and max gap; report `obs_per_flight, median_gap_seconds, P95_gap_seconds,
max_gap_seconds, trajectory_duration, trajectory_completeness_%`. Measure in
the canary (Gate 0.5) and monthly. **Only if measured cadence is insufficient
do we consider supplementary REST — never before measurement.**

**Terminalization rule (when a flight is "complete"):** declare final
`flight_outcome` at the FIRST of: landing/gate-in, diversion terminal state,
cancellation, provider terminal state, or **censoring after a documented
grace interval**. The ETL must never finalize a label before the terminal
event arrives.

**Censoring timeout/grace (NEW, tightening):** "our collection window ended"
≠ "the flight never produced an outcome." A flight is only labeled
`active_censored` / `missing_outcome` AFTER a separately-defined grace
interval past the last observation (or past the window end) during which a
terminal event could still arrive:

```text
last observation / window end
        │
        ▼
wait grace interval (defined once at freeze; proposal: 60 min, or
provider-typical arrival-notification latency + margin, measured at Gate 0.5)
        │
        ▼
terminal event arrived?  → label it normally
no terminal event?       → active_censored / missing_outcome
```

Until that grace interval elapses the label is NOT final; the ETL never
finalizes a label early. `missing_outcome` = grace elapsed with no terminal
event. The grace value is frozen with the manifest (§17 Phase 5), and the
canary measures actual arrival-notification latency to justify it.

**Airborne snapshots table (S5):**

```text
  flight_airborne_snapshots:
  flight_id | airborne_snapshot_id | prediction_state='AIRBORNE'
  event_timestamp | provider_published_utc | available_at | received_timestamp_utc
  icao24 | registration | callsign | flight_number | airline | aircraft_type
  origin | destination | scheduled_departure | scheduled_arrival
  scheduled_gate_out | actual_gate_out | scheduled_wheels_off | actual_wheels_off
  scheduled_wheels_on | actual_wheels_on | scheduled_gate_in | actual_gate_in
  latitude | longitude | altitude | ground_speed | heading | vertical_rate | on_ground | flight_phase
  weather_snapshot_id | weather_timestamp_utc
  distance_to_destination | distance_flown | fraction_of_route_completed
  eta_provider | eta_model_reference | current_operational_destination
  data_quality_flag | trajectory_gap_seconds | source_latency_seconds
```

**POST labels — targets are milestone-explicit (NEW, blocking):** "scheduled
departure/arrival" is ambiguous, so every label names its exact milestones
(FAA-ASPM definitions, §6.2). Two delay families and one ETA family, all
collected:
- **POST-A — ETA / remaining flight time:** `label_eta_landing = actual_wheels_on − t`
- **POST-B1 — landing delay (wheels-on):** `label_arr_delay_wheels_on =
  actual_wheels_on − scheduled_wheels_on`
- **POST-B2 — gate-arrival delay (traveler-facing):** `label_arr_delay_gate_in =
  actual_gate_in − scheduled_gate_in`
Evaluated separately (SJSU airborne-ETA work supports the ETA target; §19);
`label_arr_delay` alone is deprecated because it does not say which milestone it
means. PRE-side targets are equally explicit: departure delay = `actual_gate_out
− scheduled_gate_out` (gate, traveler-facing) AND/OR `actual_wheels_off −
scheduled_wheels_off` (airborne/trajectory), stored as separate columns, never
merged into one ambiguous "dep delay".



---

## 7. Flight-outcome states & modeling populations (replaces "null = censored")

| State | Definition | Modeling use |
| ---- | ---- | ---- |
| `observed` | `dep_runway_utc` / `arr_runway_utc` present | regression labels (delay, arrival delay) |
| `active_censored` | in window, no runway yet, status pre-departure, not canceled | survival/censored tasks; excluded from regression labels |
| `canceled` | status/payload indicates cancellation | cancellation classifier |
| `diverted` | actual destination ≠ original scheduled destination AND reliable evidence (`diversion_flag`) | diversion classifier (rare, high-value) |
| `missing_outcome` | window ended before any outcome event arrived | explicit "unknown"; kept out of label population; tracked as data-quality |

- Per-flight retained fields: `original_scheduled_destination`,
  `current_operational_destination`, `actual_destination`, `diversion_flag`.
- Per-task label populations: delay regression = only `observed` outcomes with
  runway time ≥ cutoff (never impute 0); cancellation = all snapshots;
  arrival-delay = `observed` arrivals.

**AIRBORNE / POST population denominator (NEW, blocking — the POST-side
census, mirroring §5):** "flights with airborne events we happened to observe"
is NOT a defined population. The **`airborne_eligible` denominator is
population-defined independent of airborne observation capture** — it comes
from the SAME `flight_population` layer as PRE (§5: provider-observable FIDS
population), intersected with movement evidence that the flight actually
became airborne (`actual_wheels_off` / provider terminal state). A flight is
`airborne_eligible` whether or not a single airborne point was ever captured —
using the airborne webhook to define the denominator would make it circular
with `airborne_observed`. Every eligible flight then goes through the same
measured funnel as PRE does, and each stage is counted and reported:

```text
airborne_eligible        = flight_population (FIDS-observable, §5)
                           ∩ actual_wheels_off (or provider terminal state)
                           [denominator defined from FIDS/population evidence,
                            NOT from whether we captured airborne points]
airborne_observed            ≥1 airborne observation captured for that flight
airborne_usable              ≥ N usable points (N frozen in manifest;
                             proposal ≥ 2 to fit a line, ≥ 5 to fit a curve)
airborne_trajectory_complete passes trajectory-completeness threshold
                             (completeness_% / max_gap_seconds, §6.2 QC)
POST_snapshot_eligible       produced ≥1 POST training snapshot (cutoff rule §6.1)
POST_labeled                 received a final terminal label (§6.2 terminalization)
```

- **Report the funnel at every monthly checkpoint:** `eligible → observed →
  usable → complete → snapshot_eligible → labeled`, e.g. as
  `airborne_eligible → airborne_observed → … → POST_labeled` proportions and
  per-airport / per-tier rows, exactly like the PRE census (§5).
- **Missingness is measured, not hidden:** `airborne_eligible − airborne_observed`
  quantifies provider coverage; `observed − usable` quantifies point quality;
  `complete − snapshot_eligible` quantifies cutoff/cadence losses. If a big
  step collapses (e.g. most flights observed but few complete), that's a
  provider-cadence finding (Gate 0.5 / monthly), and POST training is weighted
  to the funnel denominators — a POST model must NOT be silently trained only
  on the easy-to-track tail of flights (`airborne_observed` disproportionately
  on provider-friendly aircraft/routes).

---

## 8. Sampling design (LOCKED)

| Element | Decision |
| ---- | ---- |
| Default window | **1 × 4 h continuous** per day (preserves aircraft-chain continuity) |
| UTC schedule | Run-level **constrained randomized allocation**: seeded balanced permutation of `{00,04,08,12,16,20}`; every 6-day block uses each UTC slot exactly once (**HARD**); minimize weekday×UTC imbalance Σ(n_c−n̄)² among valid permutations (**SOFT**). Seeded + replayable (`time_window_schedule_seed`). Never claim "balanced at the weekday×UTC level" |
| Calendar | **26 × 4h + 3 × 2×2h + 2 × 6h = 31 days** (≈84% / 10% / 6%) |
| Crossover (R6) | Template frozen BEFORE treatment: freeze candidate pool → airport set → UTC slot + day/block → crossover block → randomize `window_shape` → execute. Treatment must NOT depend on any post-freeze observation |
| Environmental context (restored) | every batch/window records **weather severity** (METAR/TAF-derived, §10), **ATC delay-program flags**, and **storm-track context** in batch metadata. The crossover does not make the operating environment identical — two matched windows can differ because severe weather arrived during one; that context must be explainable, not absorbed as "treatment effect" |
| Anchor pool | 5 airports; provisional KLAX/EGLL/WSSS/SBGR/OMDB, **finalized only after probing** (§9); 1/day, no-repeat-until-all, order randomized via `anchor_pool_seed` |
| Anchor score | **40% exogenous traffic + 20% geo/network diversity + 20% carrier/international diversity + 20% standardized observed yield**; station/API capacity = separate feasibility GATE, not a score component; formula frozen in code pre-probe |
| Yield metric | `yield_score = f(unique_flights/credit, tail_chain_links/credit, stability)`, each standardized to [0,1], formula frozen pre-probe |
| REGIONAL | normalized yield-aware draw (`m_i ∈ [0.25,1.5]`, hard cap ×1.5, Σp=1); `airport_layer_design_probability = p_i` = conditional design probability at the draw; **adaptive rule is efficiency-oriented allocation, not representation-preserving**; boots only after probe data; before that uniform `1/|eligible|` |
| Long-tail | named **"coverage floor"** (efficiency allocation, not representation) |
| `sampling_weight` | **NULL by default; no auto 1/p** (1/p ≠ valid flight-level inclusion probability) |

### 8.1 Scheduler contract (code must REFUSE)

- Experiment day without a declared template/crossover group → REFUSED.
- Template/experiment mismatch (different tier mix or slots) → REFUSED.
- Crossover period-2 without its period-1 → REFUSED.
- `requested_window_hours=6` hitting the cap → tagged `up-to-6h`,
  `stop_reason='budget_reached'`, never relabeled "6h".
- Hard constraints (daily credit ≤1900, one batch/day, valid window/tier,
  crossover integrity, no duplicate anchor in cycle) are never sacrificed for
  the soft balance objective.

---

## 9. Two-stage anchor probe (budget-capped)

1. **Stage 1:** ~10–12 shortlisted candidates across regions, 2 h standardized
   probes at matched time-class/weekday-class (never crossing in real time);
   record unique-flights/credit, chain-links/credit, stability. WSSS (~331
   rows/h) and OMAA (~127 rows/h) re-probed the same way as calibration.
2. **Stage 2:** top ~5–6 candidates get a longer confirmation probe.
3. Final anchor pool of 5; station/API capacity applied as a **feasibility
   gate** before scoring. Total probe spend hard-capped within the 1,900/day
   budget.

---

## 10. Weather (LOCKED)

- METAR/TAF → `observation_time` / `issue_time` ≤ cutoff; a TAF issued at T−2
  is never used for a T−24 prediction.
- **Forecast-as-known-at-cutoff (NEW, blocking):** every forecasted weather
  input preserves `source`, `issue_time`, `retrieval_time`,
  `information_available_timestamp` (when OUR layer had it, §6.1),
  `valid_from`, `valid_to`, and `amendment/revision id` where available. The
  model sees the forecast **as it existed at the cutoff** — never the
  meteorological truth that became known later (TAF amendments must not leak a
  revised forecast into a snapshot taken before the amendment was issued).
  Retrospective archive availability ≠ eligibility (§6.1).
- Sources (free, no AeroDataBox credit cost — retrieval/storage/archive are
  separate engineering constraints): aviationweather.gov METAR/TAF
  (operational, **≤15 days history** + cache files), NOAA GFS/NAM grids, ERA5 /
  NOAA LDM reanalysis for deep backfill.
- Schema: `weather_observation` + `weather_forecast` tables; `source` tag
  (`live_metar` | `archive_metar` | `gfs` | `era5`) so depths never mix.
- **Weather-availability gate (new):** weather feature availability is itself
  measured and reported; missing historical weather is never silently filled
  from a later/revised source. The layer is "architected" day 1, "complete"
  only after the archive coverage check passes.
- Enters the ladder at **Model 2**; marginal value = Model2 − Model1 on Engine A.

---

## 11. Credit accounting & the canary

### 11.1 Three quantities per batch (source of truth = balance)

```text
notification_items_received           (from the webhook payload)
credits_actually_consumed             (Flight Alert balance delta: B_before − B_after)
unique_flight_rows_created_or_updated (inserted / updated / duplicates, from UpsertResult)
```

- `credits_actually_consumed` (balance delta) is the **authoritative
  denominator** for all marginal-value and info-per-credit claims; internal
  row-counting is diagnostic only. ("1 row ≈ 1 credit" is fully retracted.)

### 11.2 The isolated credit canary (R1 + R3 — Gate 3)

1. **Exclusivity (R1):** list subs; delete/disable every non-experimental
   **active** subscription; verify no foreign sub **capable of billable
   delivery** remains (inactive/historical records can't bill → not
   contamination).
2. `balance_before` + timestamp (in audit chain).
3. Subscribe to one busy airport, `maxDeliveryRetries = 0`.
4. Wait; collect. Delete subscription.
5. **Settle:** sleep a documented window, read `B_after`, then `B_after_2`;
   require **`B_after == B_after_2`** (balance stable). `B_stable = B_after`.
6. `C_external = B_before − B_stable`.
7. `C_internal = Σ notification_items(received)` from the immutable ledger.
8. Composition: notifications (POST count), items/notification, max burst,
   stored/inserted/updated/skipped, delivery_failures.
9. **PASS iff** `|C_external − C_internal| ≤ tol` (default 3) AND failures = 0
   AND balance stable AND no foreign billable sub.
10. SOFT_STOP margin tuned from this canary's measured burst.

### 11.3 Webhook reliability & the daily cap (R2 — Gate 4)

- `maxDeliveryRetries = 0`; delivery failure → **PAUSE** the run, stop the
  batch (`stop_reason='delivery_failure'`), **flag** affected rows/observations
  (`sampling_reason='delivery_failure'` or audit column), log "reconcile before
  resume". Never silently resume.
- `SOFT_STOP = 1900 − ADB_DAILY_SOFT_STOP_MARGIN` (default 50) stops the active
  batch when today's ledger spend reaches it; `HARD_CAP = 1900`; overshoot →
  `reconciliation_status='MISMATCH'`.
- Orphan cleanup enforces exclusivity at every batch start.
- Second-start protection (one auto-started window/day) stays.

---

## 12. Model ladder, features, graph

### 12.1 Model ladder (each rung measured, not assumed)

```text
−1  Naive operational persistence (last-known state: airport recent delay,
    route recent delay, aircraft previous-leg delay)   ← the gate for deployment claims
 0  Calendar/seasonal baseline (no features)
 1  Tabular XGBoost (airport + route + aircraft + schedule stats)
 2  Model 1 + weather (METAR/TAF at cutoff)
 3  Model 1/2 + cross-sectional network (static graph)
 4  Model 3 + temporal/rollout aggregation (GNN)   ← hypothesis, not default
 5  Model 4 + rotations/chains (same-tail legs)
 6  Model 5 + disruption/event signals (cancellations, MCDs, alert flags)
 7  Model 6 + uncertainty/calibration (conformal) → deployed product model
```

- Every ladder step reported TWICE: (a) Engine-A future-representative test,
  (b) Engine-E disruption stress. **Model −1 is the gate every ML model must
  clear for general-deployment claims**; the gate is engine-specific — losing
  Engine A may still win Engine E, and both are reported.
- Three horizons (T-24/T-6/T-90) evaluated separately; separate models
  (M24/M6/M90) vs shared model conditioned on `horizon_hours` is an open
  experiment.

### 12.2 Feature discipline

- **Universal eligibility rule (NEW, blocking):**
  `information_available_timestamp ≤ prediction_cutoff` — a feature is
  eligible only when our system could actually have KNOWN it by the cutoff,
  not merely when the event says it happened (§6.1). `event_timestamp`,
  `provider_published_utc`, `available_at`, `received_timestamp_utc` are
  preserved separately per observation and never conflated. The old shorthand
  `feature_timestamp ≤ prediction_cutoff` is superseded: it remains necessary
  but is no longer sufficient.
- **Schedule/status/destination as-known-at-cutoff (NEW, blocking):** a PRE
  snapshot may use **only the version of the schedule that was observable by
  its prediction cutoff**. `scheduled_/revised_departure_utc(at_cutoff)`,
  `scheduled_/revised_arrival_utc(at_cutoff)`, `destination_at_cutoff`
  (original vs current vs actual) are each stamped with the time the value
  became known. The final/revised value that surfaced AFTER the cutoff is a
  LABEL or test-time input only — never a snapshot feature. Same discipline
  applies to AIRBORNE snapshots (use state observable at observation
  timestamp t). Rationale: an airline revising departure 15:00→16:00 at 13:00
  must NOT leak into a T-6, 09:00-cutoff training example built later from the
  current FIDS value — that leakage makes an otherwise clean dataset look
  artificially strong.
- Tail/rotation features: previous-leg counts only if landed before cutoff
  AND the previous leg's arrival value was **available** by cutoff
  (`information_available_timestamp ≤ prediction_cutoff`, §6.1). Knowledge
  status is stored per previous leg: `previous_leg_exists_known`,
  `previous_leg_landed_known_0/1`, `previous_leg_arrival_value_known_0/1`,
  `previous_leg_arrival_available_at`. "Landed but value not yet in our system
  at cutoff" is treated as UNKNOWN, exactly like a landed-but-unreceived event.
- Explicit missingness features: `tail_known`, `days_since_last_obs`,
  capture flags — never silently dropped.
- **As-of historical feature store (NEW, first-class, blocking):** features
  like recent airport/route/tail delay, congestion, utilization and
  operational state need a historical lookback that a 31-day collection does
  NOT automatically provide at T-24/T-6/T-90m. These get an explicit immutable
  store, `historical_feature_store`, keyed by `(airport|route|carrier×airport|
  tail|OD-pair|weather) × datetime`, where EVERY row carries:
  `feature_value, source, source_timestamp, information_available_timestamp,
  valid_from, valid_to`. A snapshot at time T builds its feature by fetching
  the most-recent value with `information_available_timestamp ≤ T` — never by
  computing it later "from the completed dataset", which would be
  retrospective leakage (§6.1). The store is populated during the run (and by
  the §10 archive layers for weather), not reconstructed after.
- **Warm-up / bootstrap rule (NEW, blocking):** Day 1 of collection CANNOT
  build T-24/T-6 historical features from data that only starts on Day 1 —
  the store must be populated BEFORE the first eligible prediction snapshot.
  Define a **pre-run bootstrap period** (weather backfill from §10 archives +
  provider/FIDS state history as far back as the provider retains, plus any
  qualifying pre-run collection) so that the earliest evaluation day has the
  same historical as-of maturity as later days:
  ```text
  PRE-RUN BOOTSTRAP (weather archive backfill + history as deep as provider retains)
       ↓
  historical_feature_store populated; availability frozen (history_ready_at)
       ↓
  Day-1 evaluation begins — first prediction cutoff is AFTER history_ready_at
  ```
  If/where history is still unavailable at a snapshot, the feature must NOT be
  silently omitted; it is stamped `history_incomplete` and that snapshot is
  excluded from the **primary** deployment evaluation (a `history_complete`
  subset is reported separately, §13).
- **Hard consequence for Model −1 (persistence):** `airport recent delay`,
  `route recent delay`, `previous-leg delay` are its core inputs. Without the
  bootstrap, the first portion of the dataset is structurally different from
  the rest and Model −1 is not even well-defined. The bootstrap is therefore a
  pre-implementation requirement, not a nicety.
- **No `1/p` auto-weight.**

### 12.3 Graph edge taxonomy

- **Static** (route/schedule, from catalog + schedule ref data)
- **Dynamic** (state-at-T congestion, from snapshot columns at cutoff)
- **Resource** (capacity/ops: runway/stand/ATC config, from reference + flags)
- **Aircraft/flight-chain** (same-tail legs — first-class edge type for delay
  propagation)
- **Missing edge ≠ zero edge:** `known-absent` (observed, no edge) vs
  `unknown` (unobserved) are distinct masks; a GNN that treats "not observed"
  as "no edge" learns the collection pattern, not aviation structure.

**Graph edge → collection requirements (each edge must be constructible from
preserved fields):**
- *Static route:* flight_population (dep/arr ICAO pairs from FIDS/schedule).
- *Dynamic congestion:* flight_snapshots + flight_events state-at-T (airport
  delay aggregates at cutoff).
- *Resource:* reference/event flags (runway/stand/ATC config preserved on the
  event row).
- *Aircraft/flight-chain:* aircraft_reg-joined same-tail leg sequence from
  flight_events — explicit gate-out → wheels-off → wheels-on → gate-in chain
  per tail, as an event history (SDSU chained-prediction support, §19).

---

## 13. Evaluation suite (Engines A–E + R + P ) + Model POST

**Two model families, evaluated separately (each with the full metric block):**

- **PRE family:** Engines A–E + R + P (below) — the pre-departure evaluation.
- **AIRBORNE (Model POST):** trained on `flight_airborne_snapshots`, targets
  POST-A (landing ETA / remaining time) and POST-B (final arrival delay).
  Validation preserves the time-ordered airborne ordering: observations are
  time-ordered per flight, and `reportedAtUtc ≤ cutoff` for every feature. Evaluation
  blocked by flight/date and by disruption event; never mixes with PRE rows.

| Engine | Question | Blocking |
| ---- | ---- | ---- |
| **A** | Future/deployment-representative **under the collection regime** (primary; model selection + marginal-value instruments) | chronological, day/event-blocked; **tails REUSABLE** across train/test; disruption days at their observed frequency |
| **B** | Unseen airport (same region) | airport-level blocking |
| **C** | Unseen region | region-level blocking |
| **D** | Unseen tail / aircraft type (cold-start) | **HARD tail-blocking** (the only engine that does) |
| **E** | Disruption stress | whole disruption event in one partition |
| **R** (NEW) | **Unseen route/OD pair** — separates airport-identity memorization from general dynamics (e.g. train LAX→ORD/SEA + SFO→ORD, test SEA→JFK) | route-level holdout |
| **P** | Population audit | from FIDS census, vs Engine-A deltas |
| **POST** (NEW) | Airborne ETA / arrival-delay (Model POST, §6.2) | time-ordered per flight; flight/date + disruption-event blocked; time-anchored cutoffs |

**POST partition rule (strengthened):** for the PRIMARY POST generalization
test, **all airborne snapshots from the same flight instance stay in ONE
evaluation partition** (no t1→train / t2→test within one flight). A SEPARATE,
explicitly-labeled experiment may test future flights of known aircraft/tails
(tail-held-out POST), never mixed into the primary number.

- Eval builder takes explicit `group_by` per engine (`tail` / `event_id` /
  `calendar_day` / `airport` / `region` / `route`); Engine A groups by
  `calendar_day` + `event_id`, NOT `tail`; refuses splits that break a relevant
  group.
- **CI via block bootstrap** at the experimental unit (calendar day /
  disruption event), not blanket clustered SE.
- **Engine-A test protection:** model/collection-policy tuning → validation
  cut; the final untouched Engine-A test is materialized once, hashed
  (SHA-256), versioned, read-only — read once for the deployment claim.
- Rolling-origin on the 31 days labeled **"early rolling-origin pilot
  evaluation"**, never "robust seasonal validation".
- Constructible-at-cutoff unit test in the snapshot builder (a future-dated
  feature must error).
- **Collection-mechanism ablation (a major result, not a side diagnostic):**
  A = all features; B = minus coverage-age / notification counts / capture
  flags / observation density / sampling strategy / subscription metadata;
  C = minus airport identity; D = minus graph connectivity. Answers: **does
  the model learn aviation operations, or how we bought the data?**
- **Staleness curve (restored, first-class):** prediction error vs
  `state_age = prediction_cutoff − last_observation_timestamp` at explicit
  buckets (10 min, 30 min, 1 h, 3 h, 6 h, 12 h, 24 h, 48 h, …), for PRE and
  POST, on Engine A + POST. Directly answers **"should I spend another credit
  refreshing this airport?"** and grounds the coverage-age feature rather than
  assuming staleness is harmless.
- **Collection-regime robustness test (restored):** every event retains
  `sampling_strategy`, `sampling_reason`, `window_shape`, seed, probabilities,
  `coverage_age`; the eval explicitly tests **train-on-4h → test-on-2×2h**,
  **train-standard → test-event-regime** (regime as a blocking/ablation
  factor). Separates "model understands aviation" from "model understands this
  particular collection regime" (§8 calendar).

### 13.1 First-class calibration metrics (new)

Report for every model (PRE and AIRBORNE), every horizon, on Engine A and
POST (and E): `MAE`, `RMSE`, **calibration error (reliability-diagram ECE)**,
**Brier score** for P(delay>15) and P(delay>60), **prediction-interval
coverage**, **interval width**, **tail performance** (delay ≥60/≥120 min).
The product outputs `expected_delay`, `P(delay>15)`, `P(delay>60)`, and a
conformal interval. For Model POST add **ETA error vs remaining-flight-time
curve** (precision should improve as the aircraft approaches landing).

---

## 14. Marginal value per credit (the final objective)

**Two quantities, never conflated:**
- **Feature contribution:** `ΔM_feature = M(full) − M(without feature)` on
  held-out tests (ablation — modeling result, NOT a budget result).
- **Collection marginal value:** `MV_data = ΔM / Δcredits` from **real
  collection interventions** (+1 obs-day WSSS vs +1 MID vs +1 REGIONAL vs +1
  tail-chain vs +1 week on an existing hub), `Δcredits` = actual cost.
  Reported as **"estimated collection marginal value under randomized/paired
  intervention"** — never universal causal value. Repeated/paired interventions
  reveal diminishing returns (MV₁ > MV₂ > MV₃ …).

**Learning curves** at cumulative **2k / 5k / 10k / 20k / 30k / 40k / 50k /
~58k** flight-observations (no 100k — impossible under the budget); fit
`metric = a·n⁻ᵇ + c` **only inside the observed domain**; extrapolation labeled
"predicted, unmeasured". Curve carries rows AND cumulative credits AND unique
flights.

---

## 15. Code to-do — final list (R1–R7, S1–S5)

| # | Delta | Where |
| ---- | ---- | ---- |
| R1 | Subscription-set exclusivity (orphan-cleanup at batch start; canary asserts no foreign *billable* sub; run policy deletes non-experimental active subs) | controller `startBatchInner`, `scripts/credit_canary.ts` |
| R2 | SOFT_STOP margin (watchdog stops active batch at `1900 − margin`; MISMATCH on overshoot) | controller config + watchdog |
| R3 | Canary: composition, settlement (`B_after==B_after_2`), audit chain, exclusivity | `scripts/credit_canary.ts` |
| R4 | Cost-model wording (API-unit vs credit; "deducted on SEND") | doc §3 + controller header |
| R5 | Delivery-failure flag + reconcile-before-resume | migration 0018, watchdog |
| R6 | Crossover template freeze (treatment independent of post-freeze info) | scheduler/`startBatchInner`, §8 |
| R7 | Versioned manifest incl. real account plan/refill | `adb_collection_meta`, diagnostics |
| S1 | Provider-observable prediction population (FIDS/schedule) + coverage metrics | migration 0019, new ETL, diagnostics |
| S2 | Raw immutable envelope (payload + hash + versions + outcome) | migration 0019, webhook store |
| S3 | Event-log-before-state invariant | ETL ordering |
| S4 | Provenance invariant | ETL |
| S5 | Airborne time-series preservation: research event log keys on `(flight, carrier, locReportedUtc)` so every observation survives; `raw_airborne_events → clean_airborne_points → flight_trajectory → flight_airborne_snapshots` pipeline; `prediction_state` stamped on SNAPSHOT rows (PRE/AIRBORNE) only — never on raw events (§6.1/§6.2) | new ETL, flightDataPrePostStore_v3.ts dedup fix, migrations 0019–0020 |

Status: R1–R7 are **planned** (doc §45.5) incl. §34-Q accounting already
implemented (ledger + canary v1). S1–S5 are **new from CGTAnalaysis11 + V3.9-f
(V3.9_final_plan_review.md)**; S1 is the one delta that changes the pipeline
shape (adds a layer, does not redesign); S5 removes a silent-loss risk by
keying the research event log on `(flight, carrier, locReportedUtc)` instead of
the overwriting `lastUpdatedUtc` dedup key (§6.2). **Gate 0 code:**
budget-partition report (units ledger + credits ledger side by side).

---

## 16. The GO gates (ALL must pass — no 60k before Gate 5)

| Gate | Action | Pass criterion |
| ---- | ---- | ---- |
| **0 — Budget partition (NEW)** | Verify actual plan + monthly API units; refill 1 unit = 1 credit; per-refill & balance caps; census spend budgeted on the REST line; units ledger + credits ledger both tracked | all verified against the live account before any census call |
| **1 — Coverage** | `npm run coverage` | `universeCount`, `catalogInUniverse` recorded, sane (universe ≥ catalog) |
| **2 — Anchor probe** | two-stage standardized probe, budget-capped | scores from the frozen formula; capacity as feasibility gate; pool NOT locked before measurement |
| **3 — Credit canary** | R1 + R3 live canary | `C_external = C_internal` after balance-stable; failures = 0; exclusive billable set; composition reported |
| **0.5 — Webhook data-content (NEW)** | During the canary, verify actual payload content for a sample of deliveries: **raw event carries only** `event_phase`, `event_timestamp`, `data_stage PRE|POST` (**never `prediction_state`** — that is derived on snapshots, §6.1); the four availability-rule timestamps (`event_timestamp` / `provider_published_utc` / `available_at` / `received_timestamp_utc`) are preserved, distinct, and sane (§6.1); raw airborne fields (liveLocation lat/lon/alt/gs/track/vsi/reportedAtUtc) preserved per observation; multi-point trajectories reconstructable (S5) | ≥1 sample batch shows reconstructable trajectories, no payload-field loss, and intact distinct timestamps; `prediction_state` appears only on derived snapshots, never on raw events; cadence metrics (`obs_per_flight`, gaps) recorded — measured before any decision to add REST (§6.2) |
| **4 — Webhook + cap** | R2/R5 | failures = 0, retries = 0, SOFT_STOP stops at 1,850/1,900, second-start guard works |
| **5 — Population/census validation** | S1 FIDS vs webhook vs (where available) reference source for a sample of airport-windows | population ≥ captured; per-stage missingness quantified and sane; Engine-A naming stays regime-qualified |

---

## 17. Step-by-step runbook (what to do, how to do it)

```text
PHASE 0 — Code deltas
 1. Implement R1 (exclusivity), R2 (SOFT_STOP margin), R3 (canary),
    R5 (failure flag), R6 (template freeze), R7 (manifest).
 2. Implement S1–S5 (population layer, raw envelope, event-log-first,
    provenance invariant, airborne time-series key + snapshot pipeline)
    + migrations 0019–0020; fix the lastUpdatedUtc dedup loss (§6.2).
 3. Implement Gate-0 budget-partition report (units + credits ledgers).
 4. grep-verify: no `sampling_weight = 1/p` stamping; `maxDeliveryRetries = 0`
    on all collection subs.

PHASE 1 — Gate 0
 5. Log into RapidAPI; record plan, monthly units, remaining units.
 6. Call GET /subscriptions/balance; record credits.
 7. Make one 1-credit refill; confirm units−1 = credits+1.
 8. Confirm per-refill and balance caps; confirm FIDS (2 units) spend is
    within the REST line budget.
 9. Print the budget-partition report; commit to the manifest.

PHASE 2 — Gates 1–2
10. Run `npm run coverage`; record universeCount / catalogInUniverse.
11. Build the stratified catalog (traffic tier × macro-region + balancing
    variables from the fixed reference snapshot).
12. Run the two-stage anchor probe (frozen yield formula; capacity as gate);
    lock the 5-airport pool + scores.

PHASE 3 — Gates 3–4 (+ 0.5, the canary)
13. R1: list subscriptions; delete/disable all non-experimental ACTIVE subs;
    verify no foreign billable sub remains.
14. Run `scripts/credit_canary.ts`; require balance-stable settlement
    (B_after == B_after_2), C_external = C_internal, failures = 0.
15. Confirm SOFT_STOP (1,900 − margin) stops the batch at ~1,850; confirm
    second-start protection; confirm delivery_failure → pause + flag.
16. **Gate 0.5:** inspect a sample of stored payloads — raw events carry
    `event_phase` / `event_timestamp` / `data_stage PRE|POST` only
    (`prediction_state` must appear ONLY on derived snapshots, §6.1); the
    four timestamps (`event_timestamp`, `provider_published_utc`,
    `available_at`, `received_timestamp_utc`) are preserved and distinct
    (§6.1 availability rule); liveLocation fields preserved per observation;
    multi-point trajectories reconstructable (S5); record cadence metrics
    (obs_per_flight, median/P95/max gap). No REST decision before this
    measurement (§6.2).

PHASE 4 — Gate 5 (population/census validation)
17. For a sample of airport-windows, fetch FIDS/schedule; build
    flight_population; join with webhook events; compute per-stage
    missingness (population → captured → snapshots → outcomes).
18. Where available (US), spot-check against FAA/BTS-derived schedule/ops.
19. Label results "population relative to the validated AeroDataBox-supported
    operational frame" unless independently validated.

PHASE 5 — FREEZE
20. Write the versioned manifest (frame, anchor_score version, scheduler seed,
    anchor seed, catalog version, feature/snapshot builder SHA, real account
    plan/units/refill) to adb_collection_meta.
21. Materialize + hash the Engine-A test row set.

PHASE 6 — The 31-day run (§8 calendar)
22. Day 1–5: 4h templates. Day 6: 2×2h matched to day 5. Day 7–10: 4h.
    Day 11: 6h (up-to-6h) matched to day 10. Day 12–13: 4h. Day 14: 2×2h
    matched to day 13 → checkpoint 1. Day 15–20: 4h (first snapshot ETL cut +
    data-quality report). Day 21: 6h → checkpoint 2. Day 22–28: 4h (weekly
    diagnostics). Day 29: 2×2h matched to day 28 → checkpoint 3 → default
    decision. Day 30–31: 4h wrap-up (export, snapshot ETL rerun, baselines).
23. Daily: watchdog enforces 1,900 cap; SOFT_STOP margin; exclusive set;
    delivery_failure → pause/flag; weekly diagnostics (info-per-credit,
    coverage-age ≤5 d core, new-info/credit trends, hour spread).
24. Monthly: airborne cadence metrics re-measured (obs_per_flight, gaps,
    trajectory completeness) so the POST decision stays evidence-based (§6.2).

PHASE 7 — Month-1 deliverables (§17.1) + evaluation
25. Build flight_snapshots ETL + leakage-safe evaluation (all engines, all
    horizons, calibration metrics, collection-mechanism ablation).
26. Fit Model −1 (persistence) and Model 1 (XGBoost) on Engine A; report
    whether ML beats the persistence gate (engine-specific).
27. Report info-per-credit curves, Engine B–E + R light results, census
    coverage metrics, and the collection-mechanism ablation.
28. Label all month-1 outputs **"early operational pilot"**, never "validated
    production model". GNN is phase 2.
29. **Model POST pilot:** train airborne ETA / arrival-delay model on
    flight_airborne_snapshots (Engine POST, §13); report ETA-error-vs-remaining-
    time curve + cadence report; gate any larger POST program on this pilot.
```

---

## 17.1 Month-1 deliverables

1. Validated collection pipeline (exclusive set; accounting reconciled).
2. Validated snapshot pipeline + provider-observable population layer.
3. Leakage-safe **XGBoost that beats the Model −1 persistence gate** on
   Engine A (and per-engine results).
4. Information-per-credit curves (using `C_actual`, not rows).
5. Engine B–E + R light results; **collection-mechanism ablation**.
6. Census coverage metrics + calibration metrics (all horizons).
7. Window-experiment **pilot** evidence gating a properly-sized Month-2 study.
8. **Model POST pilot** (airborne ETA / arrival-delay) + cadence/
   trajectory-completeness report (S5), with a go/no-go for any larger POST
   program (no REST before measurement, §6.2).
9. **Regime-robustness + staleness + chain-depth results** (§17.2): the
   collection-regime robustness test, the staleness curve, and the
   aircraft-chain evidence that the propagation layer is actually rich enough.

---

## 17.2 Full diagnostic dashboard & chain-depth metrics (restored)

Every weekly diagnostics run (and the month-1 report) reports ALL of:

```text
credits consumed                    unique flights / airports
new airports / new routes / new tails   per-tier and per-region shares
PRE snapshots / credit               POST (airborne) observations / credit
delay events / severe delays (≥60/≥120 min)   tail-missing %
route-direction coverage             coverage-age distribution (by tier/region)
tail observations                    consecutive tail-pairs (same aircraft, back-to-back legs)
3-leg chains                         4+-leg chains
chain completeness = chained legs / legs that had a successor in-window
```

**Why chains matter:** a core hypothesis is that continuous 4h windows preserve
aircraft-chain continuity — the dashboard must prove **how much chain continuity
was actually obtained** (3-leg and 4+-leg counts, chain completeness), otherwise
the SDSU-propagation modeling claim has no evidence. `tail-chain links / credit`
is the cost-normalized yield metric for the window-regime comparison.

**Window-regime comparison table (per window shape: 4h / 2×2h / 6h):**

```text
unique flights / credit      unique tails / credit      tail-chain links / credit
3-leg chain count            4+-leg chain count          new routes / credit
PRE snapshots / credit       POST outcomes / credit     hour uniformity
coverage-age achieved        environmental context recorded (§8)
```

---

## 18. Contradiction map (this file vs `V3_CollectionStrategy2.md`)

Where anything in the revision-history file conflicts, the right-hand column here governs:

| History-file statement | Binding resolution |
| ---- | ---- |
| §11 "snapshot only if we hold an event after cutoff" | Snapshot existence is population-defined (§5 here) |
| "null = censored" in any diagram | Five-state outcome model (§7 here) |
| "FIDS census / true census" | "provider-observable prediction population" (§5 here) |
| "60k → 58,900 credits" with no REST partition | Two-budget partition + Gate 0 (§3 here) |
| "80/10/10" | 26×4h + 3×2×2h + 2×6h = 31 days ≈84/10/6 (§8 here) |
| "balanced at weekday×UTC" | constrained randomized allocation, min Σ(n_c−n̄)² (§8 here) |
| "persistent core" | rotating anchor pool (§8 here) |
| "sampling_weight = 1/p" | NULL by default; no auto 1/p (§8 here) |
| "1 row ≈ 1 credit" | three-quantity accounting, balance delta authoritative (§11 here) |
| Reserve "1,100" | **57,900 spendable experimental envelope / 1,000 protected floor (inside the 58,900 refill) / 1,000 REST + 100 unallocated = 60,000 (§3.2 here); "1,100" is legacy** |
| Engine A "future-representative" | "future/deployment-representative **under the collection regime**" (§13 here) |
| Weather "free" | "no AeroDataBox credit cost; engineering constraints separate" (§10 here) |

---

## 19. Sources & research foundation

The plan's central scientific bets are grounded in peer-reviewed aviation
research and the provider's own documentation (all verified 2026-08-12):

| Idea in our plan | Source |
| ---- | ---- |
| Previous-leg / late-arriving-aircraft delay is among the most predictive features; delay propagates along the same aircraft's itinerary | Chen, J. & Li, M., "Chained Predictions of Flight Delay Using Machine Learning," AIAA SciTech 2019 (San Diego State University) — junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf |
| Delay propagation differs by aircraft utilization; previous delays, turnaround/buffer, weather, and utilization influence later flights; stronger propagation in later legs | Zheng, Z., Wei, W., et al., "A Comparative Analysis of Delay Propagation on Departure and Arrival Flights," SJSU ScholarWorks #2410 / Aerospace (MDPI) 8(8):212, 2021 — scholarworks.sjsu.edu/faculty_rsca/2410 |
| Aircraft-chain continuity as first-class modeling; focused information-rich features beat feature-stuffing | Zheng, Zou, et al., "A Data-Light and Trajectory-Based Machine Learning Approach…," SJSU ScholarWorks #4774 |
| GNN for delay propagation = defensible hypothesis, not guaranteed winner | Wu, Chen, et al., "Delay Prediction of Flight Operation Network Based on Deep Learning," SJSU ScholarWorks #4935 (GCN-GRU); ERAU 2025 AIAA GNN-for-weather-delay (portfolio.erau.edu) |
| Persistence / autoregressive baselines as the first gate for aviation delay | Chen & Li (2019); Sternberg et al., "A Review on Flight Delay Prediction," arXiv (2017) |
| Ops + capacity/demand + wind/visibility + en-route weather | "Airport Delay Prediction with Temporal Fusion Transformers," arXiv 2405.08293 (2024) |
| Delay as a network/propagation problem; data & methods taxonomy | "Flight Delay Propagation Modeling: Data, Methods, and Future Opportunities," Transportation Research Part E (2024), ScienceDirect S1366554524001169 |
| Two-budget accounting: API quota vs Flight-Alert credits; 1 credit per flight item on SEND; retries cost extra; refill 1 unit = 1 credit; per-plan caps | AeroDataBox, "Flight Alert API: Guide to the New System" (2026-01-31) — aerodatabox.com/flight-alert-api-2026; doc.aerodatabox.com/rapidapi.html#/operations/RefillBalance |
| Weather data availability (METAR/TAF, 15-day window, free) | AviationWeather.gov Data API — aviationweather.gov/data/api |
| In-flight ETA/remaining-time as a first-class prediction state with trajectory features (grounding for Model POST, §6.2/§13) | Springer 2024 in-flight ETA study (trajectory-derived ETA/remaining-time, mirrors our `raw_airborne_events → clean_airborne_points → flight_trajectory → snapshots` pipeline); SJSU airborne-ETA line (#4774) |
| Airborne fields (lat/lon/alt/groundSpeed/track/vsi/reportedAtUtc, `data_stage PRE|POST`) are provided per notification | verified in our own code: `server/lib/disruption/flightStatus_v3.ts`, `flightNotificationExtractor_v3.ts` (2026-08-12) |

---

## 20. Explicit NOT-do list

- **No V3.10/V3.11/V3.12** theoretical reviews.
- No GNN-first; no `1/p` weighting yet (measure the denominator first).
- No claim: "6-day slot-once ⇒ unbiased"; "future-representative ⇒
  population-representative"; "4h statistically beats 2×2h" from pilot data;
  "31 days ⇒ seasonality"; "+1 MID caused 0.7 min improvement" (marginal value
  is estimated under intervention, not universal).
- No foreign active subscription during the run (R1).
- No raw-event overwrites (S2–S5); the dedup `flight_state` is never the
  trajectory source (S5, §6.2).
- No REST-airborne monitoring before cadence measurement (Gate 0.5, §6.2).
- No merging PRE and AIRBORNE rows into one modeling set; POST labels are
  never finalized before a terminal event arrives (§6.1/§6.2).
- No post-cutoff schedule/status/destination revision used as a snapshot
  feature — only the version observable at cutoff (as-known-at-cutoff,
  §12.2).
- No "[window ended] = [no outcome]" — censoring requires the documented
  grace interval (§6.2).
- No manual Rescore / Simulate / "Rescore all" during the run.
- No silent weather backfill from later/revised sources.
- No assumption that one empty observation (or one stale day) is evidence an
  airport is useless — triage requires once/repeated/persistent (§4).
- No claim that the crossover equalizes the environment — context is recorded,
  not assumed away (§8).
- Month 1 does not switch on: event-sampling regimes at scale, IPW, advanced
  conformal/GNNs, long-horizon seasonal eval, intervention optimization.

---

## 21. Final status

**Architecture: GO. Sampling: GO (experimental allocation). Research/eval: GO.
Leakage: GO + population layer + availability-time rule. Credit model: GO after
Gate 0 + canary. Airborne: GO to **preserve + measure** (S5, Gate 0.5);
REST-based airborne monitoring stays a decision AFTER cadence measurement
(§6.2). Strat2 carry-forward: COMPLETE (all eight restored safeguards, §22).
Implementation lock: COMPLETE after the four blocking fixes (Gate 0.5 wording,
schedule-as-known-at-cutoff, ADB_BATCH_BUDGET=1900, censoring grace interval)
PLUS the five pre-collection data-contract requirements (availability-time
rule, milestone-explicit targets, POST population denominator, as-of
historical feature store, forecast-as-known-at-cutoff — all in §6.1/§6.2/§7/
§10/§12.2, record in §22 V3.9-f.5) PLUS the accounting/bootstrap/foundation
resolutions: **spendable envelope = 57,900 credits (1,000 reserved inside the
58,900 refill, §3.2)**, historical-store warm-up/bootstrap with
`history_ready_at` (§12.2), `airborne_eligible` pinned to the FIDS/population
layer (§7), and milestone-mapping provider verification (§6.2 — record in §22
V3.9-f.6). 60k: WAIT on Gate 0 + gates 1–5.** This document is the FINAL, binding spec — all
previous revision files (`V3_CollectionStrategy.md`, `V3_CollectionStrategy2.md`,
`V3_WebhookExtractionPlan.md`, `CGTAnalaysis*.md`, `ChatGptAnalaysis*.md`) are
history/adjudication only and are NOT needed to execute. The remaining
uncertainty — supported-universe size, effective window regime, staleness,
XGBoost vs persistence, airborne cadence, marginal value of a credit, and
collection-vs-aviation confounds — is exactly what this run is designed to
measure. Implement, verify the budget partition, canary, validate the
denominator, then collect.

---

## 22. Adjudication record: airborne + Strat2 carry-forward + implementation-lock fixes (V3.9-f.2 / f.3 / f.4)

Reviewed: our ChatGPT airborne claims (that AeroDataBox provides lat/lon/alt/
groundSpeed/track/vsi/reportedAtUtc and `data_stage PRE|POST`, and that we can
train an in-flight ETA / arrival-delay model). **Adjudication: the field claims
are TRUE and verified against our own code** (`flightStatus_v3.ts` defines
`liveLocation`; `flightNotificationExtractor_v3.ts` flattens all of them to
`loc_*`, `has_live_location`, `data_stage PRE|POST`). Three NEW requirements
fall out:

1. **Preserve the time series, not just the latest state.** Current dedup key
   `SHA-256(flight|carrier|lastUpdatedUtc)` overwrites earlier points when the
   provider updates location under the same `lastUpdatedUtc`. → **S5** (§15):
   research event log keys on `(flight, carrier, locReportedUtc)`;
   pipeline `raw_airborne_events → clean_airborne_points → flight_trajectory →
   flight_airborne_snapshots` (§6.2).
2. **Dual prediction-state contract.** PRE (T-24/T-6/T-90m, cutoff ≤ scheduled
   departure) and AIRBORNE (cutoff = the observation timestamp t, target = ETA/
   remaining time/arrival delay) are separate modeling sets; universal cutoff
   rule `feature/provider_timestamp ≤ prediction_cutoff` (§6.1). POST labels
   never finalized before a terminal event arrives (§6.2).
3. **No REST before measurement.** Cadence is measured (Gate 0.5, §16:
   obs_per_flight, gaps, completeness) before any decision to add REST-based
   airborne monitoring (§6.2).

**Second pass (V3.9-f.3 — Strat2 carry-forward, final lock):** re-read the full
candidate plan vs `V3_CollectionStrategy2.md`; verdict: architecture is a sound
foundation for both PRE and POST, no redesign needed. Eight Strat2 execution-spec
safeguards were partially compressed on copy-forward and are now **restored**:

| Restored safeguard | Where it lives now |
| ---- | ---- |
| A. Full coverage taxonomy (`supported/eligible/directly_subscribed/recently_observed/edge_discovered/zero_yield_once/repeated/persistent/coverage_failed/stale`) + coverage-age distribution; **edge-discovered ≠ directly observed** | §5 |
| B. Zero-yield triage: one empty observation is never treated as evidence an airport is useless; only `coverage-failed` leaves the frame | §4 |
| C. Staleness curve (prediction error vs `state_age`, 10 min → 48 h buckets) | §13 |
| D. Collection-regime robustness: train-4h→test-2×2h, train-standard→test-event-regime, regime metadata retained per event | §13 |
| E. Full diagnostic dashboard + chain-depth metrics (3-leg / 4+-leg / chain completeness / tail-chain links-credit) + window-regime comparison table | §17.2 |
| F. Crossover environmental context (weather severity, ATC delay programs, storm-track) recorded in batch metadata | §8 |
| G. Event-vs-prediction-state distinction: events carry immutable `event_phase`/`event_timestamp`/`data_stage`; `prediction_state` is derived on snapshots/training examples | §6.1 |
| H. POST partition rule: all airborne snapshots from one flight instance stay in ONE partition for the primary test; tail-held-out POST is a separate, labeled experiment | §13 |

Enforced by: §6.1/§6.2 (contract + foundation), §13 (Engine POST + staleness +
regime robustness), §15 (S5), §16 (Gate 0.5), §17/§17.1/§17.2 (runbook +
deliverables + dashboard), §19 (sources), §20 (NOT-do), §21 (final status). This
file is the binding spec; the adjudication record lives here, not in
`V3_CollectionStrategy2.md`.

**Third pass (V3.9-f.4 — implementation-lock patch):** a fresh full-file read
verified the foundation end-to-end; verdict: **no further architecture
redesign** — implementation + preflight are the next step, not the 60k.
Four blocking fixes were made before implementation is considered locked:

| Fix | What changed | Where |
| ---- | ---- | ---- |
| 1. Gate 0.5 contradiction | Raw webhook events carry `event_phase`/`event_timestamp`/`data_stage` only; `prediction_state` appears ONLY on derived snapshots — Gate 0.5 verifies exactly that, so devs can't misinterpret | §16 Gate 0.5, §17 step 16 |
| 2. Schedule-as-known-at-cutoff (blocking leakage) | A PRE snapshot may use only the schedule/status/destination version observable by its cutoff; values are stamped with when they became known; post-cutoff revisions are labels/test-time only (e.g. a 13:00 15:00→16:00 revision never leaks into a T-6 09:00-cutoff snapshot) | §12.2 |
| 3. `ADB_BATCH_BUDGET` ambiguity | Default changed from `3000` → `1900`, equal to and never above the binding daily cap; controller refuses a batch budget above today's remaining spend | §3.3/§11 (binding), DD-R §28 |
| 4. Censoring grace interval | A flight is labeled `active_censored`/`missing_outcome` only after a defined grace period (proposal: 60 min or provider arrival-notification latency + margin, measured at Gate 0.5); never "window ended = no outcome" | §6.2 |

Gate order after fixes (unchanged from §17): implement S1–S5 + R1–R7 → Gate 0 →
1 coverage → 2 anchor → 3 canary → 0.5 webhook content/airborne → 4
reliability+cap → 5 population → FREEZE manifest+test → 31-day run. 60k spend
remains gated on Gates 0–5.

**Fourth pass (V3.9-f.5 — data-contract blocking patch):** a fresh full-file
review (SJSU/SDSU/FAA-grounded) confirmed the PRE/POST separation, population
layer, immutable raw storage, airborne trajectory preservation, aircraft-chain
and evaluation design are fundamentally correct and need NO redesign. It
recommended a data-contract patch before the 60k, not before implementation.
Five pre-collection blocking requirements were added, all in PART 1:

| Fix | What changed | Where |
| ---- | ---- | ---- |
| 1. Availability-time leakage (blocking) | A feature is eligible only when `information_available_timestamp ≤ prediction_cutoff` — surviving that the event *happened* before cutoff is NOT enough; the value must have been *in our system* by cutoff. `event_timestamp`, `provider_published_utc`, `available_at`, `received_timestamp_utc` preserved separately, never conflated | §6.1, §12.2 |
| 2a. Milestone-explicit delay targets (blocking) | FAA-ASPM 8-field milestone set (`scheduled/actual gate_out`, `wheels_off`, `wheels_on`, `gate_in`); departure delay = `gate_out` AND/OR `wheels_off` as separate columns; arrival = `wheels_on` AND `gate_in` separately; `label_arr_delay` deprecated as ambiguous | §6.2, §6.2 POST labels |
| 2b. PRE-side target sync | DD-A historic `dep_runway_utc − dep_scheduled_utc` marked `[SUPERSEDED]` → milestone-explicit (§6.2) | §DD-A |
| 3. POST population denominator (blocking) | Formal funnel mirroring §5: `airborne_eligible → observed → usable → trajectory_complete → snapshot_eligible → labeled`, reported monthly per airport/tier; no POST training on the easy-to-track subset silently | §7 |
| 4. As-of historical feature store (blocking) | First-class immutable `historical_feature_store` (airport/route/carrier×airport/tail/OD/weather × time) with `value, source, source_timestamp, information_available_timestamp, valid_from, valid_to`; snapshot(T) uses most-recent value with `available_at ≤ T`, never a post-hoc computed "historical delay" | §12.2 |
| 5. Forecast-as-known-at-cutoff (blocking) | Weather inputs preserve `source, issue_time, retrieval_time, information_available_timestamp, valid_from, valid_to, amendment id`; model sees the forecast as it existed, never meteorological truth revealed later | §10 |

Part 2 header hardened to say `⚠️ NON-NORMATIVE HISTORICAL CONTEXT — DO NOT
IMPLEMENT FROM HERE` (impl-safety convention; PART 1 governs always). Gate 0.5
now additionally verifies availability timestamps on raw payloads (§17 step 16).
Verdict: **architecture GO — data contract patched — implementation next, 60k
ONLY after Gates 0–5.**

**Fifth pass (V3.9-f.6 — accounting + bootstrap + denominator pinning):** a
follow-up full-file review re-read the patched plan and found three
methodological items and one field-validation item to resolve before
implementation (no architecture change). All applied in PART 1:

| Fix | What changed | Where |
| ---- | ---- | ---- |
| 1. 58,900 vs 1,000 floor (blocking, HIGH) | The 1,000 reserve is INSIDE the 58,900 refill → **spendable experimental envelope = 57,900 credits** (run-total binding invariant); "58,900" always means refill size, "57,900" means spend; final day sizes down automatically to stay ≤ 57,900 (e.g. days 1–30 × 1,900 = 57,000 → day 31 ≤ ~900); legacy "~1,100 reserve" wording marked `[SUPERSEDED]` | §3.2, DD-F §13 |
| 2. Historical-store warm-up/bootstrap (blocking, HIGH) | Pre-run bootstrap period (weather archive backfill + provider history) BEFORE the first eligible prediction snapshot; `history_ready_at` frozen; any snapshot with missing history is stamped `history_incomplete` and excluded from PRIMARY evaluation (a `history_complete` subset is reported separately); Model −1 persistence baseline explicitly requires this | §12.2 |
| 3. `airborne_eligible` denominator source (MED-HIGH) | `airborne_eligible = flight_population (FIDS, §5) ∩ actual_wheels_off (or provider terminal state)` — defined independently of airborne observation capture (using the webhook would be circular with `airborne_observed`) | §7 |
| 4. Milestone-mapping verification (MEDIUM) | Each of the 8 §6.2 milestones must be verified against actual AeroDataBox JSON semantics (`FlightAirportMovementContract`: `scheduledTime`/`revisedTime`/`predictedTime`/`runwayTime`/`gate`) before schema freeze; never rename a provider `scheduledTime` unless semantics support it; unverifiable milestones stay NULL + marked `milestone_unverified`; Gate 0.5 re-verifies on live payloads | §6.2 |

Verdict: **architecture GO — accounting/bootstrap fixed — START
IMPLEMENTATION; 60k ONLY after Gates 0–5.** All other reviewed areas (avail-
ability-time rule, schedule-as-known-at-cutoff, milestone-explicit labels,
POST denominator funnel, forecast-as-known-at-cutoff, weather, evaluation)
confirmed correct — no further redesign.



---
---

# PART 2 — DEEP-DIVE ADDENDA (detail, preserved)

> ## ⚠️ NON-NORMATIVE HISTORICAL CONTEXT — DO NOT IMPLEMENT FROM HERE
>
> Part 2 is retained **only** as historical/detail context. It is a faithful
> copy of older revisions with light annotations. **Only PART 1 (§1–§22) is
> normative and executable.** Every addendum below is historical context; where
> its wording conflicts with PART 1, PART 1 governs — always, even where this
> Part has not been individually annotated. Superseded phrasing is also marked
> inline with `[SUPERSEDED — see PART 1 §…]`. If a rule-scanning pass finds any
> wording here that reads as an instruction, treat it as description, not
> prescription. Implementers MUST use Part 1.

---

## DD-A. The prediction problem

> Supports PART 1 §5 (§ problem) and §12 (ladder). The right-censored wording here is superseded by the five-state outcome model (PART 1 §7).

## 5. First, the prediction problem (before any more credits)

ChatGPT is right that the design follows the problem. For Travnr (traveler
disruption product) the problem is:

> **Given everything knowable at time T before scheduled departure (T ∈
> {T-24h, T-6h, T-90min}), predict for each flight:**
> (a) departure delay at runway (minutes, continuous), and
> (b) arrival-side delay / cancellation / severe-disruption indicator.

- Primary target (labels exist in our data): `dep_runway_utc − dep_scheduled_utc` (44% of rows have it; the rest are treated as
right-censored snapshots) and `arr_revised − arr_scheduled` (83% coverage) as
auxiliary.
  > **[SUPERSEDED — see PART 1 §6.2]** these are milestone-ambiguous; the
  > binding targets are `actual_gate_out − scheduled_gate_out` / `actual_wheels_off −
  > scheduled_wheels_off` (departure, separate columns), `actual_wheels_on −
  > scheduled_wheels_on` and `actual_gate_in − scheduled_gate_in` (arrival),
  > each with its own `available_at` per §6.1.
- Evaluation: future-time, unseen-airport, cross-region, disruption-period
splits (ChatGPT §24) — the model must generalize beyond the sampled set.

This fixes the snapshot design (§10) and the frame (§6).

---




---

## DD-B. Sampling frame & selection (measured universe, strata, REGIONAL, × UTC-time)

> Supports PART 1 §4 (frame) and §8 (sampling design).

## 6. Sampling frame v2: from "276 hard-coded" to "measured universe"

**Step 1 (this week, free):** run the already-built coverage report
`GET /api/v1/collection/coverage` (or its refresh `?force=1`). It calls
AeroDataBox's free covered-airports endpoint for
FlightSchedules / FlightLiveUpdates / AdsbUpdates and reports
`universeCount`, `catalogInUniverse`, `universeNotInCatalog`. We have never
confirmed the true universe size; ChatGPT's "expand" is an assumption until we
measure it.

**Step 2:** build the frame from that universe, not from a static 276 list:

```
allowed universe (AeroDataBox-covered, scheduled, has a feed)
  → keep EVERY feed-eligible airport, INCLUDING zero-yield ones   (V3.4, §22)
     only coverage-failed airports leave the frame; silent airports are
     tracked as `zero-yield` (adaptive §8), never dropped (§8/C3)
  → PRIMARY STRATA: traffic tier × macro-region (V3.6, CGTAnalaysis5 §17)
  → balancing variables (kept, but NOT crossed into the primary strata, so
     the cell count does not explode): network degree*, intl/domestic,
     carrier diversity*, time zone
     (* from a FIXED reference snapshot, not the recursive current sample —
        V3.4 §23/C7/C17)
  → sampling frame = strata × (airport_layer_design_probability [randomized
                                layers only] & time_window_schedule
                                [deterministic UTC rotation, §10])
```

**V3.6 (CGTAnalaysis5 §17):** do NOT cross every dimension into every cell —
`REGIONAL × Oceania × international × high carrier diversity × tz X` would be
near-empty and make the stratified design unstable. Primary strata are
**traffic tier × macro-region** only; the rest (carrier diversity, intl share,
timezone, degree) are **balancing variables** applied within the primary
strata. Controlled stratification without exploding cells.

Implement as a **catalog build script** so the frame regenerates when the
coverage report refreshes (12 h cache). Stratifying on continent prevents
ChatGPT's §18 warning ("a regional category that is accidentally one
geography").

---



## 7. The three samples — translated to our 1,900 credits/day

Economic table (measured from B0002, ~4h batch):


| Tier                  | Typical 4h yield (rows) | ~cost/4h   | Notes                                                |
| --------------------- | ----------------------- | ---------- | ---------------------------------------------------- |
| HUB (e.g., WSSS)      | ~800–1,400              | ~900–1,400 | Dominates; one hub ≈ 50–70% of a batch               |
| MID (e.g., OMAA)      | ~90–500                 | ~90–500    | The workhorse slot: volume + connectivity            |
| REGIONAL (e.g., KGPT) | 0–30                    | ~0–30      | Nearly free, near-zero volume; keep 1 slot for frame |


**Budget split (our budget-scaled EXPERIMENTAL allocation — there is no
published universal "standard-practice" split that says these exact shares;
ChatGPT v3 §26):**


| Bucket                               | Share   | ≈ credits/day | ≈ slots/day              | Purpose                                                                                             |
| ------------------------------------ | ------- | ------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Persistent / high-frequency core** | ~45–55% | ~850–1,050    | 1 hub-equivalent         | Temporal node/edge continuity, congestion baseline, aircraft-chain anchoring, coverage-age ≤ 2 days |
| **Rotating coverage**                | ~30–40% | ~600–750      | 1–2 MID                  | New-airport / route / tail discovery, breadth                                                       |
| **Long-tail REPRESENTATION**         | ~5–10%  | ~100–150      | 1 regional (yield-aware) | Frame representativeness; prevents pure convenience sampling                                        |


**Anchor recommendation (honest terminology — V3.3):**
A per-day pick from an airport pool is a **rotating anchor pool — NOT a
persistent core**; a node seen ~every 3–5 days is *semi-persistent*. The
provisional shortlist (subject to §23 empirical selection, never chosen by
fame): `KLAX (NA) · EGLL (EU) · WSSS (ASIA) · SBGR (SA) · OMDB (MEA)`. Each day
the anchor slot picks **one** airport from the pool (no repeats until all
seen). If (and only if) §23 probing shows the budget allows it, we upgrade to a
**fixed anchor** — 1, later 2, airports genuinely on every day. Commitments:
anchors are chosen by measured yield + network properties (§23); the pool is
cross-regional; coverage-age is a recorded model feature
(`days_since_last_obs`).

> **Why not "persistent core" (V3.3 correction):** the research requirement is
> NOT "every node observed every day"; it is "the operational state used at
> prediction time T is the state that was knowable at T" (§17.3). So we manage
> **recency** (coverage-age), not constant presence. A 5-airport rotation is
> honestly called a *rotating anchor pool*; we only claim "persistent" for
> genuinely fixed anchors.

---



## 8. Keep REGIONAL, but make selection yield-aware AND normalized (ChatGPT §19/§20, §3)

Instead of equal slots or deleting REGIONAL. **V3.4 correction (ChatGPT3
Change 2):** the old "multiply every airport's `base_prob` by its own `m`"
rule is gone — independent multipliers can push Σp > 1, which breaks the
probability interpretation. The REGIONAL stratum is now a proper distribution:

```
per eligible REGIONAL airport i (frame = universe ∩ feed-covered):
   raw_score_i = f(traffic_prior, recent_yield_i)         # starts at 1.0
   m_i  ∈ [0.25, 1.5]      adaptive: 5 zero-yield obs → ×0.75;
                            1 live obs → → 1.0  (gentle, capped per airport)
   score_i = raw_score_i × m_i
   HARD CAP per airport: score_i ≤ base_score × 1.5   (no runaway feedback)

   NORMALIZE:  p_i = score_i / Σ_j score_j            →  Σ p_i = 1
   sample EXACTLY ONE regional airport from this distribution
   record p_i as the CONDITIONAL design probability for that batch:
     "probability of selecting airport i given the frame and the adaptive
      state (yield history, m_i) immediately BEFORE the draw" (V3.8)
```

Properties:
- A real probability distribution (Σp = 1), so `1/p` design-based weighting
  (where assumptions hold) is honest for the *airport* layer — **conditional on
  the pre-draw state**.
- **Nonzero floor**, not convenience sampling; **hard cap**, no feedback loop.
- The **realized** `p_i` (the one that actually happened, to the chosen
  airport) is what gets stamped on the batch row — never a retrospective
  "average". **V3.8 wording (CGTAnalaysis7 §4):** because the adaptive rule
  makes `p_i` history-dependent, the metadata is always read as "conditional
  design probability at the moment of the draw", never a marginal/unconditional
  inclusion probability.
- **V3.8 honesty (CGTAnalaysis7 §24):** the adaptive REGIONAL mechanism is an
  **efficiency-oriented allocation** (favors recent-yield airports to maximize
  rows/credit), NOT a representation-preserving probability sample of the
  regional airport population. We never claim "adaptive probabilities ⇒
  unbiased regional sample"; the frame + nonzero floor + hard cap keep it
  bounded, but representativeness is a separate claim we only make per-stratum
  (§6, §30).
- The observable `m` history (yield tracker per airport) is kept for audit.
- `m`-adaptation boots only AFTER §23 probe data exists; before that, uniform
  `p_i = 1/|regional eligible|`.
- Practical cost: **1 REGIONAL slot/day** satisfies the frame (~free).

Standing rule (ChatGPT3 Change 3): an airport with zero observed flights stays
**eligible** in the frame (marked `zero-yield`) — it is never dropped for
"being quiet", because quiet ≠ outside the population (coverage/feed/timing
can explain it).

---



## 9. Two-dimensional sampling: airport × UTC-time (ChatGPT §15→§37)

Break the airport×time confounding by sampling the **joint**
(airport, time-window) cell:

- **Default (V3.5 correction): ONE continuous 4 h window per day, start hour
  drawn from a SEEDED BALANCED PERMUTATION of the six blocks
  `{00,04,08,12,16,20}`.** Every 6-day block contains each UTC slot EXACTLY
  once, but the order within each block is a recorded, reproducible random
  permutation (`time_window_schedule_seed`). This spreads the UTC hours like
  the old strict `00→04→08→12→16→20` cycle, but (V3.5, ChatGPT4 §9/Change 2)
  it removes the **weekday↔UTC correlation** a fixed ascending cycle can
  create (e.g. "Mondays always 00 UTC") without losing balance.
  (V3.3 kept 1×4h continuous for aircraft-chain continuity — unchanged.)
- The spread start hour delivers the time-of-day diversity 2×2h was meant to
(fixes the dead UTC hours 00, 18–19, 22–23 we measured) — without paying the
continuity cost. Additionally we stratify the UTC hour **per airport local
time-zone** (`dep_airport_timezone` already on every row), so "evening peak"
is judged in each airport's local terms, not a single UTC band.
- **V3.7 (CGTAnalaysis6 §8) — run-level CONSTRAINED RANDOMIZATION, not
  "weekday × UTC balance."** 7 weekdays × 6 UTC blocks = 42 cells but the run
  has only 31 window starts, so perfect equal representation is impossible
  (we cannot even visit every cell once). The scheduler therefore performs a
  **constrained randomized allocation minimizing imbalance** across the
  `(weekday, UTC_block)` cells (minimize Σ_c(n_c − n̄)², optionally also
  accounting for `airport_region` and `local_time_bin`), seeded and replayable.
  Claim: "constrained randomized allocation across weekday×UTC cells," never
  "balanced at the weekday×UTC level."
- **V3.8 (CGTAnalaysis7 §9) — the scheduler constraint hierarchy is explicit.**
  The scheduler does NOT sacrifice a hard constraint to improve a soft balance
  objective:

  | Kind | Constraint |
  | ---- | ---- |
  | **HARD** (never violated) | daily credit ≤ 1,900; one scheduled collection/day; valid window shape/time; valid airport tier; crossover integrity (period-1 ⇄ period-2 pair); no duplicate anchor within a rotation cycle |
  | **SOFT** (optimized when all hard constraints are satisfiable) | `(weekday × UTC_block)` imbalance Σ(n_c−n̄)²; regional diversity; local-time diversity; anchor balance |
- The anchor pool order is randomized the same way (balanced, seeded,
  no-repeat-until-all) so the anchor weekday-alignment is also de-correlated.
- **2×2h and 1×6h are demoted to CONTROLLED EXPERIMENTS** (~10% / ~10% of
days, tag `window_shape` on the batch row) so the 4h-vs-2×2h-vs-6h choice is
settled with measured information-per-credit and rotation-chain yield
(§24–§31), not by assumption. Do not change the default until that comparison
says to.
- **V3.4 (ChatGPT3 Changes 4+5):** the comparison must be *paired/matched or a
  randomized crossover block* — same/similar airport set, same day-class and
  time band, differing only in window shape — and each day records
  `requested_window_hours` AND `actual_window_hours` + `stop_reason`. A 6h day
  that exhausts the 1,900 cap at 3.4h is reported as
  "up-to-6h budget-capped (actual 3.42, budget_reached)", never as "6h". Full
  experiment design in §31. **V3.6: randomized crossover is now the preferred
  design; matched pairs are the fallback (§31.2), and the 6h day is an
  allocation-regime question under the fixed 1,900 budget.**

---




---

## DD-C. Metadata v2 — design probability vs allocation schedule

> Supports PART 1 §12.2 (feature discipline) and §8 (sampling_weight NULL).

## 10. Metadata v2 — design probability vs allocation schedule (ChatGPT3 Change 1)

**V3.4 rename rule (the most important correction of the third review):** only
label something a **probability** when the mechanism is genuinely randomized.
Everything else is an **allocation schedule** and must be named that, so nobody
later computes `weight = 1/p` and believes they are doing exact design-based
inference.

**V3.6 (CGTAnalaysis5 §1/Change A):** the column is now
**`airport_layer_design_probability`** everywhere — the `_layer_` makes it
impossible to misread as a flight-level probability months from now.

**V3.8 (CGTAnalaysis7 §23) — enforce the rule in the database, not the docs:**
developers must not be able to populate `airport_layer_design_probability` for
HUB/MID. Add a check constraint:

```
is_randomized = true   → airport_layer_design_probability NOT NULL
is_randomized = false  → airport_layer_design_probability NULL
                         (planned_share may be populated)
```

This single constraint protects six versions of methodological work from a
future "helpful" default (code: §34 item, `adb_collection_subs` + batch rows).

| Concept | True nature in our design | Column / term to use |
| ---- | ---- | ---- |
| UTC start hour (00/04/08/12/16/20, **seeded balanced permutation** since V3.5) | randomized-but-balanced schedule (now genuinely a randomization) | `time_window_schedule` (the slot) + `time_window_regime` (daily/experiment tag) + `time_window_schedule_seed` — **STILL NOT** `time_window_selection_probability` |
| Anchor rotation (KLAX→EGLL→WSSS→SBGR→OMDB→…) | balanced no-repeat (order randomized V3.5) | `anchor_rotation` + `sampling_strategy='anchor'` + `anchor_pool_seed` |
| REGIONAL pick (once m exists) | **genuinely randomized** (sampled from the normalized distribution) | `airport_layer_design_probability` = the **realized draw's conditional probability** given frame + adaptive state just before the draw (V3.8 wording; §8), never a marginal/unconditional inclusion probability |
| Tier-slot share for HUB / MID (catalog ⊆ tier) | deterministic slot-fill, recorded for **documentation** only | `airport_layer_design_probability := slots / eligible_count` **labeled `planned`, not realized** — it is an allocation share, not an inclusion probability |
| Joint | only computable when BOTH layers are randomized (REGIONAL ✓; HUB/MID ✗) | `joint_selection_probability` **only for the randomized path** — otherwise NULL |

**V3.5 correction (ChatGPT4 Change 1) — the single biggest conceptual
change of the fourth review:** the columns above describe **airport-layer
selection only**. After the airport is chosen, a flight row can still be
absent or dropped for independent reasons — the aircraft isn't known to be at
that airport, the tail/rotation heuristic misses it, it's a duplicate,
no-call-record, status page retry, midnight time-out, etc. So we do **NOT**
auto-stamp `sampling_weight = 1 / airport_layer_design_probability` on every flight
row. Flight inclusion probability is a **joint product** of several
mechanisms, none of which we measure as clean marginals yet. The V3.4
"stamp 1/p on every flight" instruction is **retracted** (see §34-I). We
record `airport_layer_design_probability` as honest airport-layer metadata and let a
future post-hoc weighting study (ChatGPT4 §9 "Some flights will never appear
exactly once") decide whether / how to weight.

Extend the per-row stamp (compatible with migration 0012; additive columns):

| Current                                   | Add (V3.4) |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sampling_probability`, `sampling_weight` | `airport_layer_design_probability` (conditional design probability if randomized; else `NULL` + `planned_share`), `time_window_schedule`, `time_window_regime`, `sampling_strategy` (`anchor`/`rotating`/`longtail`), `sampling_reason`, `days_since_last_obs` |

| Add (V3.5) | Meaning |
| ---- | ---- |
| `time_window_schedule_seed` | seed of the balanced UTC permutation (reproducibility; joined with `time_window_schedule`) |
| `anchor_pool_seed` | seed of the balanced anchor-order permutation |
| `flight_capture_flags` | per-row record of **why** this flight row exists / could have been missed (e.g. `tail_heuristic`, `rotation_chain`, `status_retry`, `duplicate`, `no_call_record`) — do NOT conflate with airport selection weight |
| `sampling_weight` | **only if** a future weighting study defines it; otherwise leave NULL (do not auto-stamp 1/p) |

**Claim we adopt (V3.8 tightened wording — CGTAnalaysis7 §5; replaces the
ChatGPT2 §9/§38 sentence, which was too easy to over-read):**

> **Airport-layer design probabilities are recorded for sampling-aware
> diagnostics and sensitivity analysis. They do not constitute flight-level
> inclusion probabilities and are not automatically converted into flight
> weights.**

**V3.4 addition (ChatGPT3 §2):** document per batch whether the recorded
probability is (a) a **realized randomized draw's conditional design
probability** (REGIONAL stratum — conditional on frame + adaptive state
immediately before the draw; V3.8 wording, §8) or (b) a **planned allocation
share** (HUB/MID slot-fill + the deterministic time schedule). The stored
`random_seed` makes the conditional allocation replayable; it does not by
itself make a deterministic schedule a randomization.

---




---

## DD-D. Leakage-safe dataset build

> Supports PART 1 §5 (snapshot rule) and §13 (cutoff guarantees). NOTE: the snapshot rule stated inside this addendum is [SUPERSEDED] by the population-defined rule in PART 1 §5 — a snapshot exists iff the flight was in the provider-observable population at cutoff, not iff we hold a post-cutoff event.

## 11. Leakage-safe dataset build (the highest-value ML change)

Current table = mixed PRE/POST snapshots (potentially multiple rows per
flight). Never train on raw rows like that. Build (Phase: modeling time, but
design the collector to support it):

1. `flight_events` — one row per webhook event (what we store today, but
  tag it `event`).
2. `flight_snapshots` — one row per (flight, horizon): T-24h / T-6h /
  T-90min, with only features with `feature_timestamp ≤ prediction_cutoff`.
   Snapshot a flight **only if we hold an event after** `horizon`**'s cutoff**;
   otherwise the snapshot doesn't exist (that's the honest censoring rule).
3. `flight_outcomes` — `actual_departure`, `departure_delay`,
  `arrival_delay`, `cancelled`, `diverted` (fill from later events; null =
   still-in-flight/censored).

Rules enforced at build time:

- `feature_timestamp ≤ prediction_cutoff` (e.g., previous leg's arrival
counts only if landed before cutoff — the exact example ChatGPT gave).
- Splits by **flight/date**, **time block**, and **unseen airport** — never
random rows.
- `tail_known = 1/0` + `days_since_last_obs` handled as explicit features
(tail missingness is not random).

The collector doesn't have to change much: it already preserves
`received_at`/`last_updated_utc` per row. Snapshot construction is an offline
ETL that enforces the cutoffs.

---




---

## DD-E. Diagnostics: information-per-credit

> Supports PART 1 §14 (marginal value per credit) and §17.2 (dashboard).

## 12. Diagnostics upgrade: information-per-credit

Extend `/api/v1/collection/diagnostics` (and the health script) with
per-batch and cumulative:

```
credits                          unique flights        unique airports
new airports (first-seen)        new route pairs       new tails
pre-departure snapshots          post-departure        delay events
severe delays (>= 60/120 min)    tail_missing %        route-direction coverage
airport coVERAGE-AGE (min/age)   prev-batch airports
tail observations               consecutive-tail pairs      (V3.6, CGTAnalaysis5 §3)
3-leg chains                    4+-leg chains           chain completeness
```

And the key ratio per strategy bucket: **new info ÷ credits** (not rows ÷
credits). This is how we tune core vs rotating vs long-tail empirically over
the month — exactly ChatGPT §29.

Also fix the health check (`scripts/check_collection_health.ts`): tier-mixture
PASS/FAIL should read **subscriptions** (`adb_collection_subs`), with row
counts informational — otherwise REGIONAL (~1 row) keeps falsely failing a
correctly-subscribed batch (the earlier B0002 `tier mix incomplete` flag).

**V3.6 upgrade (CGTAnalaysis5 §11/§12 + ChatGPT4 Change 4) — two quantities.**
Info-per-credit (`new info ÷ credits`) stays as the day-to-day steering ratio,
and the *final* collection objective is:

> **Collection marginal value per credit** = how much does one more unit of a
> *collection intervention* (one more hub, one more MID, one more REGIONAL,
> one more tail-chain observation, one more week of observing an existing hub,
> +ε capture depth at an existing hub, …) change **future prediction quality**
> (Δmodel), divided by what it costs in credits (Δcredits).

Measured as: **(1) feature contribution** via ablation on held-out tests
(remove a slice → measure Δ in the §32 test metric) — a modeling result, NOT a
budget result; **(2) collection marginal value** via **learning-curve /
scale experiments at the ACTUAL cumulative sizes the run produces**
(2k → ~58k flight-obs; **the 100k point is removed — it is impossible under
60k credits at ~1 row/credit**; extrapolation beyond the observed domain is
labeled, never presented as measured; fit `metric = a·n⁻ᵇ + c` only inside
the observed domain); **(3) real collection interventions** (+1 obs-day at
WSSS vs +1 MID vs +1 REGIONAL vs +1 tail-chain vs +1 week on an existing hub),
whose Δcredits is the actual cost and whose Δmetric is read on Engine A
(§38 full split). The collection design is judged by whether the credits we
spend sit on the steep part of that curve. This reframes the project's claim
(§38, §26) and is what makes the "how much of the world can we touch" question
scientifically answerable rather than just a count. (§16 rows 9–10 unchanged
in intent, now measured this way.)

---




---

## DD-F. Credit plan (full detail)

> Supports PART 1 §3 (budget partition) and §11 (credit accounting). The pre-Gate-0 budget arithmetic here is [SUPERSEDED] by the two-budget partition in PART 1 §3; '1 row ≈ 1 credit' is [SUPERSEDED] by three-quantity accounting (PART 1 §11.1).

## 13. Credit plan (unchanged from Overnight2, now binding)


| Setting          | Value                                                                                                             | Why                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Refill           | 60,000                                                                                                            | monthly Ultra quota                                                               |
| Daily cap        | **1,900**                                                                                                         | 60,000/31; never exceeded because uncapped burning ≈ 3–5 days                     |
| Windows          | **1 × 4 h**, UTC start from seeded balanced permutation of {00/04/08/12/16/20} (`time_window_schedule_seed`), **run-level constrained randomization minimizing (weekday × UTC-block) imbalance** (§9, §25) | preserves chain continuity; kills time bias; de-correlates weekday↔UTC; honest about 31-starts-vs-42-cells; 2×2h & 6h only as **crossover PILOT experiments** (§24, §31) |
| Batch budget env | `ADB_BATCH_BUDGET=1900`                                                                                           | code daily-cap preferred; else `ADB_AUTO_START_HOUR` narrow window as fallback    |
| Anchor pool      | shortlist `KLAX,EGLL,WSSS,SBGR,OMDB` (provisional) — 1/day, no-repeat-until-all; final set only after §23 probing | cross-region rotating anchor pool, coverage-age ≤ ~5 d                            |
| Tier mix         | `{HUB:1(anchor), MID:2, REGIONAL:1}` with bounded yield-aware regional (§8)                                       | from `{1,2,2}`                                                                    |


Enrollment budget: 1,900 × 31 ≈ 58,900, leaving **~1,100 monthly reserve**.
The reserve is NOT a storm-day overspend allowance — `ADB_DAILY_CREDIT_CAP` is
hard (V3.8, CGTAnalaysis7 §3, §25). A storm day simply spends its share of the
1,900 cap; disruption signal is captured by `sampling_strategy='event'`
oversampling within the cap, never by exceeding it.
> **[SUPERSEDED — see PART 1 §3.2]** the binding arithmetic is: refill 58,900
> credits → spendable experimental envelope **57,900** + permanent 1,000 floor
> (emergency reserve) + 1,000 REST/census (units) + 100 unallocated = 60,000.
> The "~1,100 reserve" wording here is legacy and is NOT to be implemented.

**V3.8 — two billing systems, both must be tracked (§43-E):**

| Track | Managed by | Renewal | Spent by | Cost per action |
| ---- | ---- | ---- | ---- | ---- |
| **API units** | RapidAPI (Ultra plan) | monthly | REST endpoint calls (search / rescore / simulate) | search ≈ 1 unit; FIDS ≈ 2; rescore ≈ 2–4; simulate ≈ 6–12; **"Rescore all" ≈ 2–4 × N flights** |
| **Alert credits** | AeroDataBox | do not expire; pause at 0 | webhook notification deliveries | **1 credit per flight item delivered + 1 per delivery retry** |

The 60,000-credit refill converts **1 API unit → 1 credit** (`POST
/subscriptions/balance/refill`). A "Rescore all" click on the agency dashboard
therefore eats units that would otherwise fund credits. **Guard:** no manual
REST-heavy UI actions (rescore / simulate / "Rescore all") during the run;
monitor the RapidAPI usage page, not just the AeroDataBox balance
(`V3_WebhookExtractionPlan.md` Finding 2).

**V3.8 → V3.9 — delivery retries break "1 row ≈ 1 credit" (§43-E → §44-A).**
Subscriptions are currently created with `maxDeliveryRetries: 2` (server line),
and each retry costs 1 credit per flight item — but the daily-cap and
batch-budget accounting count **rows stored**. Two problems, both now closed:

1. **Retries** (each = 1 credit, no new row): set `maxDeliveryRetries = 0`
   during the run (cost predictability; delivery protection is handled by the
   §44-C failure gate instead).
2. **Duplicates/updates consume credits without new rows (V3.9 — the one
   remaining real flaw).** Even with retries off, a re-delivered / already-known
   flight item hits `ON CONFLICT (dedup_key) DO UPDATE` — 0 new rows, but the
   credit is still spent. So "1 delivered flight item = 1 Flight Alert credit,
   and stored/unique flight rows are a **separate** data-product measure."

**V3.9 — three quantities, tracked per batch (source of truth = balance):**

```
notification_items_received          (from the webhook payload)
credits_actually_consumed            (Flight Alert balance delta: B_before − B_after)
unique_flight_rows_created_or_updated (inserted / updated / duplicates, from UpsertResult)
```

`credits_actually_consumed` (balance delta) is the **authoritative
denominator** for every §38 marginal-value and §12 info-per-credit claim.
Internal row-counting is a diagnostic only; the canary gate (§44) requires
`|C_external − C_internal| ≈ 0`. The store already stamps each row's
`credits_remaining` and returns `{stored, inserted, updated}` — the raw
material exists; we persist it per batch (§34-Q).

**V3.9-f — three reserve buckets, named explicitly (CGTAnalaysis8 §5,
CGTAnalaysis9 §5; §44-D, §45.2):**

```
Refill converted to credits           = 58,900 credits  (1,900 × 31 nominal)
Spendable experimental envelope       = 57,900 credits  (58,900 − 1,000 permanent floor;
                                                         the ONLY spendable experimental quota; §3.2)
Emergency application floor           = 1,000 credits   (ADB_RESERVE_CREDITS; permanently reserved
                                                         inside the 58,900 refill; the controller refuses
                                                         to intentionally spend below this unless
                                                         explicitly overridden)
Unallocated mathematical remainder    = 100 credits     (60,000 − 58,900 − 1,000;
                                                         NOT usable experimental budget)
```

They are different numbers for different purposes; every report names which
one it means. "58,900" always means REFILL size (includes the reserved 1,000);
the maximum actual experimental spend is always **57,900**, and the run-total
invariant is 57,900 — never described as 58,900 spend (§3.2, binding). **V3.9-f — three distinct cap concepts, never conflated
(CGTAnalaysis8 §4, CGTAnalaysis9 §3/§4):**

1. **Estimated reservation (before start).** `daily_budget_remaining = 1900 −
   credits_actually_consumed_today` (the `adb_ingest_events` ledger, C_internal).
   The batch budget is capped at this. It is an *estimate* of what starting is
   allowed to spend, NOT a record of spend.
2. **Actual spend (during).** The watchdog stops the batch on *observed* spend,
   never the reservation. Because AeroDataBox accounting is asynchronous
   (deduction happens when an alert is sent, and notifications can arrive in
   bursts), the hard cap is enforced with a margin:
   `SOFT_STOP = 1900 − ADB_DAILY_SOFT_STOP_MARGIN` (default 50, tuned from the
   canary's observed burst, §45.2) → a batch that pushes today's ledger spend
   to SOFT_STOP is stopped BEFORE the async race can overshoot;
   `HARD_CAP = 1900` is never intentionally exceeded, and if the balance ever
   shows it was, that batch is flagged `reconciliation_status = MISMATCH`.
3. **Post-batch reconciliation (after).** `C_external = balance_before −
   balance_after` vs `C_internal = notification_items`; |Δ| ≤ tolerance → PASS
   (§44-A/B). The watchdog refuses a start that would push either the
   reservation or the observed spend past the cap (§34-Q, §34-R).

---




---

## DD-G. 31-day collection-month phased rollout

> Supports PART 1 §17 (runbook) and §8 (calendar).

## 14. 31-day collection-month phased rollout (the plan to actually run)

**Week 0 (now, before refill):**

1. Apply health-check subscription fix (§12).
2. Run `/collection/coverage?force=1` on Replit → **record universeCount**.
3. Confirm the daily-cap mechanism (env-only now; code version after).

**Week 1:**
4. Catalog build script: universe → frame stratified by **traffic tier ×
   macro-region (primary strata)** with the other dimensions as balancing
   variables (§6) → regenerate `adbAirportCatalog_v3.ts` data (or a DB-backed
   frame).
5. Add anchor logic (1 anchor slot/day from the provisional pool, tagged
   `sampling_strategy='anchor'`); final anchor set only after §23 probing.
6. Switch tier mix to `{HUB:1,MID:2,REGIONAL:1}` + bounded yield-aware regional
   floor (§8).
7. Windows: 1×4h/day with UTC start from a **seeded balanced permutation** of
   the six blocks (every 6 days = each UTC slot once, `time_window_schedule_seed`);
   schedule ~3 experimental days (2×2h and 6h) and tag them `window_shape`.

**Weeks 2–4:**
8. Let it run on the cap. Weekly: check diagnostics — coverage-age ≤ 5d for
   core, new-info/credit trends, hour spread.
9. Mid-month: build `flight_snapshots` ETL + leakage-safe evaluation; run
   **Model −1 (persistence) and Model 1 (XGBoost)** baselines
   (schedule/route/distance/time features → +rolling airport & route delay →
   +aircraft rotation features → +graph/centrality features), then compare a
   GNN on the same splits — GNN as the NEXT phase, not a month-1 must.

**V3.6 month-1 goal (CGTAnalaysis5 §24):** month 1's deliverables are (1) a
validated collection pipeline, (2) a validated snapshot pipeline, (3) a
leakage-safe **XGBoost baseline that beats the Model −1 persistence gate**,
(4) information-per-credit curves, and (5) the first airport/recency/
generalization results (Engines B–E light). **GNN is phase 2** — you can't
meaningfully prove the GNN's value until the underlying multi-structural data
construction has stabilized (Aeolus's own point). Nothing in the §25 calendar
changes; only the reporting priority and the "what counts as a successful
month" definition.

**Month 2+:** event sampling (disruption spikes) once the baseline exists —
we have the disruption module already; wire it as `sampling_strategy='event'`.

---




---

## DD-H. Weather data layer & backfill specifics

> Supports PART 1 §10 (weather). §18 + §40 combined.

## 18. Weather data layer (the missing half of the problem)

Aviation-delay models that use weather + ops outperform flight-only models
(TFT delay work, OTP forecasting 2026). **Weather is an important exogenous
predictor of aviation delay and should be modeled alongside operational and
network variables** (V3.4 wording — the unsupported "~40%" figure is removed
per ChatGPT3 Change 6). **V3.6 wording (CGTAnalaysis5 §6):** the sources have
**no AeroDataBox credit cost; historical retrieval, storage, processing, and
archive availability remain separate engineering constraints** — we say that,
not "weather is free." We still architect it with the same leakage discipline.

### 18.1 Sources (no AeroDataBox credit cost; retrieval/storage are engineering constraints)


| Source                         | What                                                        | Type                         | Cost        |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------- | ----------- |
| aviationweather.gov (NOAA/NWS) | METAR (observed) + TAF (forecast w/ issuance time) per ICAO | Real-time & historical       | Free        |
| NOAA GFS / NAM grids           | Forecast fields at any lat/lon (wind 10 m, ceiling, precip) | Forecast with issue-time     | Free        |
| ERA5 / NOAA LDM reanalysis     | Full retrospective meteorology                              | Historical (training labels) | Free, heavy |




### 18.2 Data model (timestamped, leakage-safe from day 1)

```
weather_observation (station_icao, obs_time, obs_type='METAR',
                     wind_dir/spd/gust, vis_m, ceiling_ft, wx_code)
weather_forecast    (station_icao, issue_time, valid_from_utc, valid_to_utc,
                     field, value)                      -- TAF / GFS-picked
```

Join & leakage rule (identical to snapshots):

```
feature allowed  ⇔  weather.obs_time <= prediction_cutoff
                 OR  weather.issue_time <= prediction_cutoff   (forecast)
feature forbidden ⇔  obs_time > cutoff  OR  issue_time > cutoff
```



### 18.3 What we actually do

- **Collect phase:** no AeroDataBox credit cost (V3.8 wording — weather sources
  are free NOAA/METAR/TAF; the collection engine's only credit cost is webhook
  notification deliveries, §13). `flight_events` already carries
  dep/arr airport + times + timezone; that is all weather needs to join.
- **Modeling phase:** backfill METAR/TAF history (archived free) for every
(dep_airport, snapshot_cutoff) and every (arr_airport, est_arrival) that
falls before the cutoff. No credit cost; pure ETL.
- **Product phase (real-time alerts):** a live METAR/TAF ingest at prediction
time feeds the same tables. Design the tables now so collection isn't wasted.
- **Rule for the doc/team:** weather is added to the formal data spec NOW
(columns + join rule); actual ingestion starts at the snapshot-ETL step. We
do not pay for it during the 60k run.
- **V3.4 caution (ChatGPT3 §9):** don't assume every product has perfect
historical availability at every airport. Verify the archive/join coverage
(METAR station coverage, TAF archive depth, GFS grid availability for the
lat/lon) before promising a complete historical weather layer.
- **V3.5 detail (ChatGPT4 §Weather/§40):** a hard number from that verify step
— aviationweather.gov's normal API only serves **~15 days** of METAR/TAF
history, and free station archives end at that horizon. Our data model must
therefore (a) snapshot METAR/TAF at collection time if we want their values at
modeling time without relying on thin history, and (b) treat any older
backfill as a **separately-verified archive task** (ERA5/NOAA LDM) with its
own coverage check **before** the weather layer is billed as complete. We do
not change the credit budget — weather stays free — but the ETL step must
explicitly test "can I actually get the value I need at this cutoff context",
not assume it. (§40)



## 40. Weather backfill specifics (V3.5 deep-dive)

- **OKX→METAR/TAF live:** aviationweather.gov normal REST provides observed
  METAR + issued TAF for current conditions and typically **~15 days** of
  recent history. For anything older you must pull an archive (the site's
  archived products / NOAA LDM / ERA5 reanalysis for grid fields).
- **Fork at the data model:** `weather_observation`/`weather_forecast` tables
  (§18.2) stay identical; only the *retrieval path* differs (live vs archive).
  Store `source` (`live_metar` | `archive_metar` | `gfs` | `era5`) on each
  weather row so downstream can't silently mix depths.
- **Gate for "weather layer is complete":** run an explicit coverage check —
  for the set of (dep/arr, cutoff) pairs the modeling phase needs, what
  fraction have a weather obs issued ≤ cutoff? Report that number honestly;
  the layer is "architected" from day 1 but "complete" only after the archive
  path is verified. (§18)
- **Use in the ladder:** weather enters at Model 2 (§19); its marginal value
  is exactly the Model 2 − Model 1 gap on Engine A (and Engine E), one input
  to the §38 marginal-value accounting.

---


---

## DD-I. Formal prediction tasks & horizons

> Supports PART 1 §12.1 (ladder) and §13.1 (calibration metrics).

## 19. Formal prediction tasks & horizons (three horizons; model count is an experiment)

| Task          | Cutoff (prediction time) | Typical inputs                                                                                                                 | Use case                                      |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **A — T-24h** | 24 h before sched dep    | schedule, route, aircraft type, airline, route/airport historical delay, weather *forecasts* issued ≤ cutoff, previous-day ops | Itinerary planning, agency rebooking heads-up |
| **B — T-6h**  | 6 h before sched dep     | all of A + status trail, airport congestion state (if recent), weather obs ≤ cutoff, inbound-tail position if known            | Ops dashboards; early traveler alert          |
| **C — T-90m** | 90 min before sched dep  | all of B + boarding/gate state, live queue, TAIL ROTATION (inbound leg delay), current METAR                                   | Final traveler alert (push)                   |

Rules:

- Each horizon is **separately EVALUATED**; whether it is a separate model or a
  shared model conditioned on `horizon_hours` is an **open experiment** (V3.6,
  CGTAnalaysis5 §7). Report `per-horizon MAE/RMSE/calibration`; the headline
  product metric is the T-90m alert quality, but T-24h is what agencies buy.
- A **horizon-vs-error curve** is the honest way to tell the user "how much
earlier can we reliably warn you." If T-24h error is 80 min and T-90m is
12 min, the product differs by task — the three-task design makes that visible.
- A single `horizon_hours` column on snapshots plus one shared feature builder,
not three copies of the pipeline.
- **V3.4 (ChatGPT3 §20):** the traveler product should end in calibrated
  probabilities, not just a point estimate: `expected delay`, `P(delay>15)`,
  `P(delay>60)`, a confidence interval (conformal). Add calibration + uncertainty
  to the evaluation design now even though the implementation comes later (§32).

**Model ladder (V3.5 expansion, ChatGPT4 §Model/§39) — the scientific
question is value per layer:**

The GraphGNN launch commitment stands. Now add the ladder of ablations that
makes "why is it a graph problem" *demonstrable*:

| # | Model  | What it proves | Where it lives in the pipeline |
| ---- | ---- | ---- | ---- |
| **-1** | **Naive operational persistence (V3.6, CGTAnalaysis5 §13):** last-known state — airport recent delay, route recent delay, aircraft previous-leg delay — no learned model | aviation is strongly autocorrelated; proves whether **ML adds value over "predict today = how it was recently"**, not just over the calendar floor | persistence / congestion baseline |
| 0 | Calendar/seasonal baseline (no features) | absolute floor; what delay looks like with zero knowledge | forecast baselines |
| 1 | Tabular: airport + route + aircraft + schedule stats | what structured features alone buy vs floor | XGBoost as the stated baseline (kept, V3.3 §11) |
| 2 | Model 1 + weather (METAR/TAF at cutoff) | marginal value of the weather layer | weather-joined features |
| 3 | Model 1/2 **cross-sectional network** (static graph: hubs, centrality, route edges) | marginal value of network position at snapshot-time | static-graph features |
| 4 | Model 3 + **temporal/rollout aggregation (GNN rollout / temporal GNN)** | marginal value of the dynamic delay-propagation signal | GraphGNN launch models |
| 5 | Model 4 + **rotations/chains** (same-tail legs; FlightSense-style) | marginal value of aircraft-tail continuity | rotation features |
| 6 | Model 5 + **disruption/event signals** (cancellations, MCDs, alert flags) | marginal value of ops-event signal | event features |
| 7 | Model 6 + **full context ensemble / uncertainty (conformal)** | the final deployed traveler-alert model | product model (§19 C) |

Every ladder step must be reported **twice**: (a) on the future-representative
test (does the input help on ordinary days?) and (b) on the disruption stress
test (does the input help exactly when travel falls apart?). A layer that only
wins on (a) but not (b) is still publishable and still useful — the ladder
report structure just makes it explicit (§32, §39). Model **-1 (persistence)
is the gate every ML model must clear for general deployment**: if Model 1
(XGBoost) can't beat "last-known state" on the PRIMARY future-representative
test, added complexity isn't justified for ordinary days. **V3.7 nuance
(CGTAnalaysis6 §14):** the gate is engine-specific — a richer model may lose
to persistence on Engine A yet legitimately win Engine E (disruption);
we report BOTH, and only the Engine-A miss blocks *general-deployment* claims,
not the model's use in disruption settings.

**V3.6 — don't freeze the three-model decision (CGTAnalaysis5 §7).** The
T-24/T-6/T-90 tasks stay as three *evaluation* horizons, but whether they are
three separate models (M24/M6/M90) or ONE shared model conditioned on
`horizon_hours` is now an **open experiment**, not a fixed choice. Test
Strategy A (three independent models) vs Strategy B (shared model with
explicit `horizon_hours` conditioning), compare MSE/calibration on Engine A,
and pick the winner per §38. Shared structure is plausible because much of the
underlying signal is identical across horizons while only the information set
changes.




---

## DD-J. Flight-outcome states & modeling populations

> The five-state model here is the binding one — see also PART 1 §7.

## 20. Flight-outcome states & modeling populations (replacing "right-censored")

A row without a runway time is NOT automatically "a censored delay." It may be
"hasn't departed yet" or "outcome missed entirely." Define states:


| Outcome state     | Defined by (our payload)                                     | Modeling use                                                              |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `observed`        | `dep_runway_utc` / `arr_runway_utc` present                  | The regression labels                                                     |
| `active_censored` | in window, no runway yet, status pre-departure, not canceled | Survival/censored tasks; regression population must exclude it as label   |
| `canceled`        | status code / payload indicates cancellation                 | Cancellation classifier target                                            |
| `diverted`        | **V3.6 (CGTAnalaysis5 §14):** actual destination differs from the ORIGINAL scheduled destination AND reliable evidence of diversion exists | Diversion classifier (rare, high-value)                                   |
| `missing_outcome` | window ended before any outcome event arrived                | Explicit "unknown", kept out of label-population; tracked as data-quality |

**V3.6 diversion hardening (CGTAnalaysis5 §14):** a changed operational
destination field is NOT by itself evidence of a diversion — the airline may
update the planned destination *after* a diversion and the parser could
misclassify it. We retain four distinct fields per flight:
`original_scheduled_destination`, `current_operational_destination`,
`actual_destination`, and `diversion_flag` (from a reliable actual-arrival
field / explicit event), and define `diverted` only when
`actual_destination ≠ original_scheduled_destination` AND `diversion_flag` is
set. Schema-only change; collection already returns the raw fields.


**Per-task population (explicit — prevents "no delay yet = delay 0" bugs):**


| Task                   | Label population                                       | Censored handled as                                 |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| A/B/C delay regression | only `observed` outcomes whose runway time is ≥ cutoff | exclude; do NOT impute 0                            |
| A/B/C cancellation     | all snapshots                                          | binary `canceled`                                   |
| A/B/C arrival-delay    | `observed` arrivals                                    | exclude pre-departure-only rows                     |
| Disruption tail (rare) | `diverted` / `canceled` / severe-delay events          | oversampled by design, eval on representative split |





---

## DD-K. Collection-regime robustness

> Supports PART 1 §13 (regime-robustness test).

## 21. Collection-regime robustness (protect the test set from design change)

Because we are going to run 4h/2×2h/6h days, anchor-vs-rotating days, and later
event days — the training/test material changes collection regime. That would
bias naive splits. Mitigation:

- Every batch row (and therefore every event, via the foreign key) carries:
`sampling_strategy`, `sampling_reason`, `window_shape`, `seed`, `prob`s,
`coverage_age` at capture.
- **Regime is a facet, never a random contaminant:** splits can be
*by-regime*, and a robustness experiment asks "train on 4h-regime only →
test on 2×2h-regime events" etc. If the model collapses across regimes, it
learned collection microstructure, not aviation.
- Same discipline for the later event-sampling phase: `sampling_reason='event'`
rows are analyzed and validated separately, and their effect on the general
model is measured, not assumed.




---

## DD-L. Coverage taxonomy dashboard

> Supports PART 1 §5 (full coverage taxonomy) and §17.2. Includes the zero-yield triage (once/repeated/persistent) and the staleness curve.

## 22. Coverage taxonomy dashboard (correct coverage metric set)

Replace the loose "is it covered?" with distinct counters, updated after every
batch. **V3.4 (ChatGPT3 Changes 3+5):** zero-yield and coverage-failed are
separate states — never merged into "not in the population":

| Term | Definition | Where it comes from |
| ---- | ---- | ---- |
| **supported universe** | airports AeroDataBox covers per feed (union) | `npm run coverage` (§6) |
| **eligible (frame)** | universe ∩ feed-eligible; **kept even when silent** | category membership + `checkAirportFeeds` |
| **directly subscribed** | airports actually subscribed in the active batch | `adb_collection_subs` |
| **recently observed** | subscribed within last 7 days | `adb_collection_subs.created_at` |
| **edge-discovered** | airports appearing as dep/arr in any captured flight (cheap coverage) | `flight_data_pre_post` distinct dep/arr |
| **zero-yield** | eligible + (frequently) subscribed + 0 rows — tracked, NOT dropped (`sampling_reason='zero_yield_probe'`, `m *= 0.75` in §8) | subs vs rows join |

**V3.6 zero-yield triage (CGTAnalaysis5 §15):** one empty observation is not
meaningful evidence, so we track the *persistence* of zero yield, not just a
boolean: `zero_yield_once` / `zero_yield_repeated` / `zero_yield_persistent`.
Only **persistent** zero-yield feeds the bounded adaptation (e.g. `m *= 0.75`);
single/repeated empties are recorded but do not move `m`, avoiding premature
down-weighting of a quiet-but-valid airport (low traffic, wrong window, feed
outage, schedule effect).
| **coverage-failed** | `checkAirportFeeds` said unsupported/failed — only these leave eligibility | controller `skipped` log |
| **stale** | in frame but not directly observed in > 60 days | frame − recent set |

**Levels of knowledge (V3.5, ChatGPT4 §9 "we're building the network graph
from direct obs"):** the taxonomy above splits into three honesty tiers — the
**global frame** (universe, known from coverage measurement), **direct
observations** (subscribed airports during windows; this is the ONLY layer
that yields per-flight rows), and **edge/network discovery** (airports and
routes that become visible only because a captured flight's dep/arr mentions
them). Edges discovered through a flight we captured are *indirect* — useful
for graph structure, but they are not evidence we have flight-level data at
those airports. Every evaluation and report must label which tier
each number belongs to.


Plus two continuous signals:

- **coverage-age distribution** (for each frame airport, hours since last
subscription/recent observation) → median, P90, max.
- **staleness curve** (model error vs hours-since-obs) → the money answer to
"how wide must the core be?" (§17.3). Be honest with the interpretation
(ChatGPT3 §7): a 24 h-old node state is only acceptable as a **measured
substitute**, tested by this curve — not assumed equal to "now".

This is what makes the GNN coverage problem decidable: a node in the adjacency
matrix is only as real as its recency.


---

## DD-M. Anchor-selection protocol

> Supports PART 1 §9 (two-stage anchor probe).

## 23. Anchor-selection protocol (fixed reference data + standardized probes)

**V3.4 (ChatGPT3 Changes 7+8):** two guardrails before the old protocol.

- **(a) Fixed reference dataset.** Ranking MUST be computed from exogenous /
  pre-existing information (scheduled traffic, published route network,
  geography, carrier mix, historical independent data) plus a one-time
  standardized probe. **Never** use the current sample's observed degree as the
  only basis: sampled → high observed degree → chosen as anchor → sampled more
  is a feedback loop that self-justifies its own selection.
- **(b) Standardized probes.** No "off-peak for A, peak for B". All candidates
  are probed with the SAME duration, in a comparable UTC/local-time regime and
  weekday class, with the same credit measurement and extraction logic.

Protocol:

1. **Enumerate:** universe from `/collection/coverage?force=1`
  (`universeCount`, `catalogInUniverse`).
2. **Shortlist from EXOGENOUS data:** top ~20 candidates across regions on
  (a) scheduled traffic (published schedules / independent data), (b) published
  route counts, (c) international + carrier mix, (d) geography. This list is
  fixed at frame-build time; observed data may later ADD candidates but not
  silently reorder the base list.
3. **Feed membership:** confirm each candidate is in the AeroDataBox feeds list
  (listFeedAirports) — some "famous" hubs may be weak on ADS-B.
4. **STANDARDIZED yield probe:** for each shortlisted candidate not yet
   measured, run the same **2 h probe** at the same time-class/weekday-class
   (schedule probes so they don't cross in real time), record rows/credit,
   tail-chain links/credit, and station capacity. Compare with known WSSS
   (~331 rows/h) and OMAA (~127 rows/h) **measured the same way** as calibration
   (re-probe WSSS/OMAA once at the same time-class so the baseline is
   apples-to-apples). **V3.9 (CGTAnalaysis8 §8, §44-G) + V3.9-f (CGTAnalaysis9
   §10, §45.2) — the yield metric is defined BEFORE probing, and it is not raw
   rows/hour** (a single noisy 2 h observation would dominate the 20% weight):
   `yield_score = f(unique_flights_per_credit, tail_chain_links_per_credit,
   stability)` where each component is standardized to [0,1] and `stability` is
   the probe-to-probe variance / SE (fewer obs → wider CI → lower weight).
   **Station/API capacity is NOT a yield component — it is a separate
   feasibility GATE**: an airport must meet a minimum measured capacity to be
   eligible, but capacity never trades off against scientific yield (that would
   move us toward "easiest to collect" instead of "most useful information").
   The exact formula is fixed in code before any probe runs; observed data
   never re-weights the formula (only fills it in).
5. **Score & select (V3.6 pre-specified weights, CGTAnalaysis5 §16):** the probe
   is **one feature** in a pre-specified score, never allowed to dominate (a
   single high-yield probe day must not override years of scheduled traffic).
   Adopt, as an R&D choice (not a published standard):

   ```
   anchor_score =
       40% exogenous traffic
       20% geographic / network diversity
       20% carrier / international diversity
       20% standardized observed yield (probe)
   ```

   Rank with this fixed formula, pick the pool of 5 + mark the top 1–2 as
   fixed-anchor candidates if pacing (§7) allows. Weights are documented as
   our own choice and revisited only deliberately, not tuned on outcome.
6. **Re-probe quarterly + on schedule change** (frames drift; yields change
  with schedules) — always with the standardized protocol.

Priority anchor regions (bases the shortlist): North America (KLAX, KORD, KJFK,
KATL), Europe (EGLL, EDDF, LFPG, EHAM, LEMD), Asia-Pacific (WSSS, RJTT/HND,
VHHH/RKSI), Gulf/Africa (OMDB, OMAA), South America (SBGR, SAEZ), Oceania
(YSSY, NZAA).


---

## DD-N. Controlled window experiments & the crossover design

> Supports PART 1 §8 (crossover) and §14. §24 (V3.4 fixes + per-regime metric list) + §31 (full design, crossover-first, scheduler REFUSE contract). The per-regime metrics here feed PART 1 §17.2.

## 24. Controlled window experiments (V3.4 — genuinely controlled, §31 for the full design)

**V3.4 (ChatGPT3 Changes 4+5):** naive "80% 4h / 10% 2×2h / 10% 6h on whatever
airports the rotation picks" is NOT a controlled experiment — airport set,
time-of-day, weekday, weather, and window shape all vary together, so you
couldn't attribute any difference. Two fixes:

1. **Randomized-crossover blocks preferred, matched pairs as fallback (§31).**
   Every experiment day belongs to a crossover group (Template A/B swap 4h and
   2×2h across two periods) or, when crossover is impossible, replicates a
   recent 4h day's conditions — same anchor, same tier mix, same time band,
   same weekday class — changing ONLY the window shape. Metric deltas are
   computed within crossover blocks / within pairs, never across arbitrary
   days. (V3.6: crossover is now the preferred design; §31.2.)
2. **Requested vs actual window.** Record `requested_window_hours`,
   `actual_window_hours`, `stop_reason` on every batch. A 6h day that exhausts
   the 1,900 cap after 3.4h is compared as "4h-scheduled vs up-to-6h
   budget-capped (actual 3.42)", never as "4h vs 6h". (V3.6: the 6h day is
   explicitly an allocation-regime question under a fixed budget; §31.2.)

Per-regime metrics within each matched pair (2-week comparison gate):

- unique flights / credit
- unique tails / credit
- **tail-chain links / credit** (arrival→turnaround→departure pairs of the
  same tail inside one window — the thing 2×2h may hurt)
- **chain depth / credit** — 3-leg and 4+-leg chain counts (V3.6,
  CGTAnalaysis5 §3) — the deeper chains carry the richest propagation signal
- new route pairs / credit
- pre-departure snapshots / credit
- post-departure outcomes / credit
- departure-hour uniformity (Shannon entropy over UTC/local hours)

Decision rule (V3.7 — PILOT framing, CGTAnalaysis6 §12): month-1 window
results are **pilot evidence** — they decide ONLY whether Month 2 should run a
properly-sized controlled window study. No default is switched on month-1 data
alone unless the pilot signal is overwhelming and directionally consistent
across all metrics; otherwise the default stays 4h until the Month-2 study.
Switch the default to 2×2h only if it wins on chain-links AND
snapshot yield AND hour uniformity *within matched pairs* by a clear margin;
otherwise keep 4h. Do not just look at row counts, and do not compare across
unmatched days.



## 31. The controlled window experiment (deep dive; C4 + C5)

### 31.1 Why naive 80/10/10 was not an experiment

| Source of variation | 4h day | 2×2h day | confounding? |
| ---- | ---- | ---- | ---- |
| window shape | 4h | 2+2h | **the hypothesis** |
| airport set | A,B,C | D,E,F | ✗ confounded |
| time of day | 08–12 | 18–20 | ✗ confounded |
| weekday / weather | varied | varied | ✗ confounded |

You can't attribute a difference to window shape under that design.

### 31.2 The design we adopt (V3.6 Change B — crossover FIRST, matched pair as fallback; V3.7 = PILOT)

**Honest framing first (CGTAnalaysis5 §9):** because aviation operations are
highly nonstationary (weather, ATC state, disruption state, demand, aircraft
availability all vary day-to-day), any two *separate days* are only **matched**,
never "identical except window shape." Even a randomized crossover does not make
the operating environment identical (period 1 may be normal weather, period 2 a
thunderstorm); it reduces confounding from stable/block-level characteristics
and permits within-block treatment contrasts (CGTAnalaysis6 §10). We therefore
name the design for what it is and use the strongest feasible structure:

- **PREFERRED — randomized crossover blocks.** Take two template days with the
  same airport set, tier mix, UTC slot, and weekday class. In period 1,
  Template A runs 4h and Template B runs 2×2h; in period 2 they **swap**
  (A = 2×2h, B = 4h), with the A/B assignment to periods randomized and the
  order of treatment shuffled across weeks to cancel order/learning effects.
  The treatment effect is then estimated *within* the crossover, which removes
  much of the day-level environmental effect (CGTAnalaysis5 §9).
- **V3.8 (CGTAnalaysis7 §11) — define the treatment UNIT explicitly.**
  `treatment = window_shape`, **`unit = the matched airport-set / crossover
  block`**, NOT the individual flight. Flights inside a window are correlated
  and are never treated as independent experimental observations; the analysis
  unit is the crossover block (or the matched pair in the fallback). Recorded
  as `crossover_group=<id>` + `period` (1|2) + `unit_type='airport_set_block'`.
- **V3.7 — this is PILOT evidence, not a conclusive test (CGTAnalaysis6 §12):**
  month 1 yields ~3×2×2h and ~2×6h comparisons. That is far too small to claim
  "4h is statistically superior to 2×2h." The month-1 window experiment answers
  only "did we see enough signal to justify a larger controlled study?" — if
  yes, **Month 2 runs a properly-sized window experiment** with more crossover
  blocks. All month-1 window conclusions are labeled "pilot."
- **FALLBACK — ordinary matched pairs** (the V3.5 §31 design), used only when a
  genuine crossover is impossible (e.g. 6h days, where a full second 6h window
  won't fit the weekly cap). When used, it must be labeled "matched pair, not
  fully controlled" and analyzed with paired deltas.
- **Template days:** the first ~5 days (all 4h) establish the templates: (anchor,
  tier mix, UTC slot, weekday class, matched airport set).
- **Experiment days:** each experiment day declares
  `crossover_group=<id>` + `period` (1|2) or `matches_template=<day>` (fallback) —
  same anchor, same tier mix, same UTC slot, same weekday class, same matched
  MID/REGIONAL set — ONLY the window shape differs.
- **Budgets:** ALL experiment days and their templates use the SAME 1,900 cap
  and the SAME `requested_window_hours`.
- **Honest window accounting (§13/C5):** store `requested_window_hours`,
  `actual_window_hours` (window_end − window_start at close), `stop_reason`
  (`window_elapsed` | `budget_reached`). Metrics aggregate by
  **achieved window-shape class**: "4h", "2×2h", "up-to-6h". A 3.42h day is
  compared as up-to-6h, and its `actual_window_hours` is a feature/label input,
  not a rounding artifact.
- **V3.6 6h reframe (CGTAnalaysis5 §10):** the scientific question is explicitly
  **"under a fixed 1,900-credit budget, which window regime maximizes
  predictive information?"** — so `up-to-6h` is a legitimate allocation regime,
  NOT a failed 6h experiment. We are comparing allocation regimes under a fixed
  budget, not "longer window beats shorter window" (that question is
  unanswerable at a fixed credit cap). Every report states this framing.
- **Analysis:** within-crossover estimates (primary) and paired deltas
  (fallback) for every metric in §24; decision gate at §25 checkpoint 3.

### 31.3 Scheduler contract (what the code must refuse to do)

- An experiment day without a declared template or crossover group → REFUSED at
  start.
- A template/experiment mismatch (different tier mix or slots) → REFUSED.
- A crossover group whose period-2 day is missing its paired period-1 day →
  REFUSED (no half-completed crossover analyzed as if complete).
- A day whose `requested_window_hours=6` that hits the cap → tagged
  `up-to-6h` with `stop_reason='budget_reached'` — never relabeled "6h".
- **V3.7 (CGTAnalaysis6 §10):** a crossover period must record its **marginal
  environmental context** (weather severity, ATC delay program, storm-track
  lines) on both the batch row and the flight-observation rows. The crossover
  contrast is *within* the block, and these context fields let us check how
  much of the residual treatment variance is environment-driven
  (CGTAnalaysis6 §10).

---


---

## DD-O. The 60k experimental calendar v2

> The full 31-day table. Supports PART 1 §17 Phase 6. The '80/10/10' framing here is corrected to 84/10/6 by V3.8 (§43); PART 1 §8 carries the corrected arithmetic.

## 25. The 60k experimental calendar v2 (V3.5 — self-consistent with 80/10/10)

**V3.4 (ChatGPT3 Change 14):** the V3.3 calendar said "~80/10/10" but the table
had 2×2h + 6h + an impossible "6h + 4h" day (two full windows can't fit under a
1,900 cap). v2 below: **most days 4h; a small number of 2×2h and 6h days as
MATCHED PAIRS (repeat a recent 4h day's airport set + time band + weekday class,
only the window shape differs); never two full windows in one day under the cap.**

**V3.5 (ChatGPT4 Change 2):** the UTC start hour is NOT a fixed ascending
`00,04,08,12,16,20` cycle. It is a **seeded balanced permutation** — each
6-day block uses every UTC slot exactly once, in a recorded random order
(`time_window_schedule_seed`), so no UTC slot is tied to a fixed weekday.
Anchor picks follow the same balanced-randomized no-repeat rule
(`anchor_pool_seed`). Balance is preserved (still every slot once per 6 days);
the fixed weekday↔UTC correlation of the old cycle is gone.

**V3.7 (CGTAnalaysis6 §8):** the wording "balanced at the weekday×UTC level"
is too strong — 42 weekday×UTC cells cannot be balanced by 31 window starts.
The scheduler performs **constrained randomized allocation minimizing
imbalance** across `(weekday, UTC_block)` cells (minimize Σ_c(n_c−n̄)²; may also
fold in `airport_region`, `local_time_bin`), seeded for replayability. The
claim we make is "constrained randomized allocation," not "balanced."

**V3.9 (CGTAnalaysis8 §7, §44-F) — the two rules are hierarchical, not
competing:**

| Kind | Rule |
| ---- | ---- |
| **HARD** | Every complete 6-day block contains `00,04,08,12,16,20` exactly once (the V3.5 seeded-permutation invariant) |
| **SOFT** | Among all valid permutations, pick the seeded schedule minimizing weekday×UTC imbalance Σ_c(n_c−n̄)² (the V3.7 objective) |

The 6-day slot balance is a hard feasibility constraint; the imbalance term is
only optimized among schedules that already satisfy it. This makes the
scheduler mathematically unambiguous (and matches §9's hard/soft hierarchy).

1,900 credits/day; days 1–31. Anchor pool: 1 pick/day, no-repeat-until-all.
Tier mix {1,2,1} daily. Regime tags set by `window_shape`; every batch records
`requested/actual_window_hours` + `stop_reason` (the UTC slot for each day is
whatever the seeded permutation assigns; illustrative ascending example below):

| Day | Window | Notes |
| ---- | ---- | ---- |
| 1–5 | 4h | baseline (establishes the calendar's matching templates) |
| 6 | **2×2h** | MATCHED to day 5 (same airports/time band/weekday class) |
| 7–10 | 4h | |
| 11 | **6h** | MATCHED to day 10; if it budget-caps early with stop_reason=budget_reached, it is "up-to-6h" — that IS the finding |
| 12–13 | 4h | |
| 14 | **2×2h** | matched to day 13 → gate checkpoint 1 (§24 metrics within pairs) |
| 15–20 | 4h | first `flight_snapshots` ETL cut + data-quality report |
| 21 | **6h** | matched to day 20 → checkpoint 2 (6h value decision) |
| 22–28 | 4h | rolling anchor + rotating mix; weekly diagnostics |
| 29 | **2×2h** | final pair (matched to 28) → checkpoint 3 → default decision |
| 30–31 | 4h | wrap-up: export, snapshot ETL rerun, per-horizon baselines |

Rounding (V3.8 corrected arithmetic — the §25 table has 26 four-hour days,
not 24): **26 × 4h + 3 × 2×2h + 2 × 6h = 31 days ≈ 84% / 10% / 6%** —
as close to the intended 80/10/10 as the "a few honestly-matched experiment
days" constraint allows (CGTAnalaysis7 §2).

**V3.8 (CGTAnalaysis7 §3) — the 1,100 is a MONTHLY RESERVE, not an overspend
allowance.** `ADB_DAILY_CREDIT_CAP=1900` is a hard invariant (enforced at batch
start in `startBatchInner`, §28); 1,900×31 = 58,900, so the 60,000 refill leaves
**1,100 credits that cannot be spent while the cap is active**. They are a
monthly reserve against refill slippage, engine cost overruns (see §13 on
delivery retries), or a deliberate future change of the daily-cap policy. If we
ever want emergency days to draw on it, we must define an explicit
`ADB_EXCEPTION_DAY_BUDGET` with an audit flag — it is never silently
"overspent" (CGTAnalaysis7 §3).


---

## DD-P. Vocabulary & honesty

> The corrections that keep the science defensible.

## 26. Vocabulary & honesty (the corrections that keep the science defensible)

Adopt these phrasings everywhere (docs, README, model cards, external claims):

- **Thesis statement (adopted verbatim, ChatGPT4 §9/Verdict):** *"A
  literature-aligned, budget-constrained experimental collection design for
  constructing a leakage-safe, temporally connected, geographically diverse
  flight-delay dataset from the AeroDataBox-supported aviation universe."*
- Our dataset is **"a probability-aware sample of the AeroDataBox-supported
aviation universe,"** never "the world's airports."
- The exact scheme (slots, budgets, pools, allocation shares) is **our own R&D
constrained design** — the research literature supports the *principles*
(stratification, panel + rotation, temporal structure, aircraft chains,
leakage prevention, chronological/unseen evaluation), not our precise numbers.
  - Never call the split "standard practice" — call it **"our budget-scaled
  experimental allocation"** (V3.4, ChatGPT3 §26).
- **30 days = short-term temporal variation**, not seasonality or annual
patterns. Seasonal claims require multiple seasons or external history.
- **Design probability vs allocation schedule (§10):** a deterministic rotation
is a *schedule*; the word *probability* is reserved for genuinely randomized
layers (REGIONAL stratum). We record both — labelled as what they are.
- **Zero-yield ≠ outside the population.** An airport that emitted no rows is
`zero-yield` (eligible, tracked, adaptively down-weighted); only
`coverage-failed` airports leave the frame (§8, §22).
- **Airport-layer design probabilities are recorded for sampling-aware
diagnostics and sensitivity analysis** (V3.8, CGTAnalaysis7 §5) — they do NOT
constitute flight-level inclusion probabilities and are NOT automatically
converted into flight weights — and **not** "the model can un-bias the data
automatically."
- **Flight inclusion ≠ airport selection (§10, §30.2b):** we never write
  `sampling_weight = 1/p` on flight rows; `airport_layer_design_probability` is
  airport-layer metadata and `flight_capture_flags` explains why a row exists.
- **Credits/rows are not ML units.** Talk in info-per-credit, unique flights,
new routes, new tails, chain links, snapshots.




---

## DD-Q. Risk register & numbers still unknown

> Supports PART 1 §16 (gates) and §21 (final status). The §27 gate list itself is SUPERSEDED by PART 1 §16; the risk register and the 'unknown until measured' list below remain live.

## 27. Verification gates & risk register



### 27.1 Gates (must pass before the 60k run "counts")

1. `/collection/coverage?force=1` → `universeCount`, `catalogInUniverse`
  recorded and sane (universe ≥ catalog).
2. Catalog-build outputs: frame stratified by **primary strata = traffic tier
   × macro-region** (V3.6/§6), with balancing distributions for international
   share, carrier diversity, timezone, and reference-network degree **reported
   within strata** (never crossed into the primary strata — V3.8,
   CGTAnalaysis7 §22); no tier-empty cells; `catalogInUniverse` fraction
   reported; **zero-yield airports still present in the frame, only
   coverage-failed removed** (§22).
3. Anchor probe yields measured with the **standardized protocol** (same
  duration/time-class/weekday for all candidates, §23); pool locked with
  recorded scores; **scores derived from fixed reference data, not recursive
  sample degree**.
4. Health-check subscription gate green on a live subs set (no false FAIL).
5. Daily-cap verified: a second auto-start same UTC day is refused
  (logs/sql check).
6. Snapshot ETL unit test: injected future-dated feature asserts cutoff error;
  flight/date + unseen-airport splits exist.
7. **V3.4:** window-experiment scheduler rejects unpaired experiment days
  (each 2×2h/6h day must reference its matched 4h template) and every batch
  carries `requested/actual_window_hours` + `stop_reason` (§31).
8. **V3.4:** probability fields use design-probability vs allocation-schedule
   naming; no field called `*_probability` that is actually a deterministic
   schedule (§10).
9. **V3.9 credit-canary gate (CGTAnalaysis8 §3, §44):** one tiny controlled
   batch before meaningful spend; record `balance_before`, `balance_after`,
   `notification_items`, `unique_rows`, `updated_rows`, `duplicate_rows`,
   `delivery_failures`, `credits_actually_consumed = balance_before −
   balance_after`, `credits_internal_recorded`; require `|C_external −
   C_internal| ≈ 0` within tolerance (§13).
10. **V3.9 webhook-reliability gate (CGTAnalaysis8 §2, §44):** confirm
    `delivery_failures = 0`, `unexpected_retries = 0`, daily-cap and
    second-start protection correct. **Hard rule: if delivery failure rate > 0
    at any point, PAUSE the experimental run and investigate** — with
    `maxDeliveryRetries=0` a transient outage silently loses flights otherwise.



### 27.2 Risk register


| Risk                                                                           | Likelihood          | Impact                      | Mitigation                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Universe far larger than 276 → frame huge → most airports go months unobserved | high                | GNN node staleness          | edge-discovered coverage, coverage-age features, unseen-airport eval; expensive depth reserved for anchor candidates |
| One hub (WSSS-like) eats 70% of daily budget                                   | certain             | little room for breadth     | 1,900 cap; anchor budgeted to a slot; rotating pool only from MID                                                    |
| Weather overspend / stall                                                      | medium              | —                           | weather is free sources only; no credit impact                                                                       |
| Regime experiment pollutes training                                            | medium              | eval bias                   | regime tags + by-regime robustness eval (§21)                                                                        |
| Tail missingness (19%) skews rotation features                                 | high                | chain features weak for 19% | tail_known flag; never impute; evaluate rotation lift separately                                                     |
| 2×2h default shipped without experiment                                        | (currently averted) | chain continuity loss       | §24 gate before any default switch                                                                                   |
| Credits run dry mid-month                                                      | medium              | collection halts            | 1,900/day hard cap + **57,900 spendable envelope (1,000 protected floor inside the 58,900 refill — §3.2, supersedes the old "1,100 reserve" wording)** + alerts at 2,000/1,000; `maxDeliveryRetries=0` during run (§13, §43-E) |




### 27.3 Numbers still unknown until measured (do not guess)

- `universeCount` and `catalogInUniverse` (run this week — free).
- Anchor-candidate yields (probe in week 1).
- 2×2h vs 4h vs 6h chain-link/snapshot metrics (2-week experiment).
- Staleness curve (error vs hours-since-obs) — a model product, estimated
after first snapshot ETL.
- Cost of a real disruption/weather day (only observed when one happens).

Everything else in this document is built on measured figures from
`flight_data_pre_post7.csv` and the B0001/B0002 logs.

---




---

## DD-R. Implemented config & knobs

> The ADB_* environment switches the collector ships with. Supports PART 1 §3.4 and §11.

## 28. Implemented config & knobs (what the "Go" shipped in code)

The approved defaults are now code in
`server/lib/disruption/adbCollectionController_v3.ts` (+ `migrations/0015`),
not just a doc:


| Knob                   | Default                          | Meaning                                                                                                                                                        |
| ---------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADB_DAILY_CREDIT_CAP` | `1900` (`0` disables)            | hard cap on credits per UTC day; enforced in `startBatchInner` (a start that would push past it refuses) and checked before the watchdog even attempts a start |
| `ADB_UTC_START_CYCLE`  | `0,4,8,12,16,20`                 | rotating UTC start hours for the one 4h window/day (`ADB_ROTATING_UTC_START=0` reverts to start-anytime)                                                       |
| `ADB_RESERVE_CREDITS`  | `1000`                           | spend floor — a batch never starts if it would drop the balance below this (distinct from the 1,100 monthly remainder, §13)                                  |
| `ADB_ALERT_MIN_BALANCE` | `2000`                           | alert threshold — warns "refill soon" via the watchdog notification webhook                                                                                 |
| `ADB_MIN_BATCH_CREDITS` | `300`                            | don't start a batch unless it can run at least this many credits (avoids worthless slivers)                                                                 |
| `ADB_ANCHOR_POOL`      | `KLAX,EGLL,WSSS,SBGR,OMDB`       | rotating anchor pool — one per day, forced into the HUB slot, no-repeat-until-all (`ADB_ANCHOR_ENABLED=0` disables)                                            |
| `ADB_TIER_MIX`         | `{"HUB":1,"MID":2,"REGIONAL":1}` | tier slots per batch (REGIONAL floor = 1 slot/day)                                                                                                             |
| `ADB_WINDOW_HOURS`     | `4`                              | window length; batch tagged `window_shape='4h'` (rotate to `2x2h`/`6h` only as §24 experiments)                                                                |
| `ADB_BATCH_BUDGET`     | `1900`                           | per-batch ceiling — set equal to the binding daily cap (1,900), never above it; the controller refuses any requested batch budget above today's remaining allowable spend (§3.3, §11) |


Batch rows now carry `window_shape`, `anchor_icao`, and `sampling_strategy`
(`'anchor'`/`'rotating'`) for auditability (§21). Watchdog behavior: exactly
**one auto-started batch per UTC day** at the rotating slot (manual starts are
exempt from the per-day guard but still hit the daily cap), and a missed slot
waits for the next cycle hour instead of double-firing.

**V3.8 (CGTAnalaysis7 §3 + §43-E) — credit accounting must match billing.**
Delivery retries cost **1 credit per flight item per retry**, but the
row-based daily-cap/batch-budget accounting counts rows only (de-dup keeps
rows at 1 per flight). The row↔credit identity is only exact if
`maxDeliveryRetries = 0` during the run — **set it to 0 for collection
subscriptions**, or the 1,900 cap silently undercounts real spend by up to 3×
during a delivery outage. Also remember the **units-vs-credits** split (§13):
the 60k refill converts RapidAPI units→credits, so manual REST-heavy UI
actions (rescore / simulate / "Rescore all") during the run must be avoided;
monitor the RapidAPI usage page separately.

**Deferred (not coded yet — need §23 probe data first):** the **normalized**
REGIONAL adaptive rule (§8). The tier-mix floor (1 REGIONAL slot/day) and the
1/|eligible| uniform prior are respected; the **normalized yield-feedback**
term (score → Σ=1 → sample one → record realized `p_i`, V3.4) needs the
per-airport yield history that anchor probing produces. While it's off, the
REGIONAL slot is drawn uniformly from the eligible frame with the realized
acceptance recorded as `airport_layer_design_probability` only once randomization
exists — ✔ see §34 item C.

Operation: `npm run health` (subscription-gated tier check), `npm run coverage`
(fresh universe measurement), `npm run logs:last`.

---


---

## DD-S. Probability & design-based inference honesty (deep dive)

> Supports PART 1 §4/§8 (sampling) and §12.2. Includes the two-tier naming rule, the flight-inclusion ≠ airport-selection argument, and the REGIONAL two-step procedure. §30 + §37.

## 30. Probability & design-based inference honesty (deep dive; C1 + C2)

### 30.1 The two-tier naming rule

Record, per batch, exactly one of these for each sampling layer:

| Layer | Mechanism | What we may write | What we may NOT write |
| ---- | ---- | ---- | ---- |
| UTC start hour | **seeded balanced permutation** of 00/04/08/12/16/20 (since V3.5) | `time_window_schedule` = slot, `time_window_regime` = daily/experiment, `time_window_schedule_seed` | `time_window_selection_probability` |
| Anchor pick | balanced no-repeat rotation of 5, **order randomized** (`anchor_pool_seed`) | `sampling_strategy='anchor'`, `anchor_rotation` index | `airport_selection_probability` for the anchor |
| HUB / MID slot-fill | deterministic from seeded shuffle + recent-exclusion | `planned_share = slots/eligible`, labeled **planned** | calling it a realized inclusion probability |
| REGIONAL pick | **randomized when §8 adaptive rule is on** (normalized distribution) | `airport_layer_design_probability = p_i` — **conditional design probability given frame + adaptive state immediately before the draw** (V3.8; a *realized* draw, but *conditional* probability) | an un-normalized table of `1/157 × m`; calling it a marginal/unconditional inclusion probability |

The stored `random_seed` still makes any allocation replayable; replayability ≠
randomization. Weighting (`1/p`) is only valid on genuinely randomized layers,
so only the REGIONAL stratum (once adaptive) supports design-based weights.

### 30.2b Flight-inclusion ≠ airport-selection (V3.5, ChatGPT4 Change 1)

The §30.1 table and §30.2 procedure describe only the **airport layer**. A row
can be missing from a subscribed airport for independent reasons (tail
heuristic misses it, rotation-chain heuristic misses it, duplicate de-dup,
`no_call_record`, status-page not-yet-run, midnight time-out). Therefore:

- `airport_layer_design_probability` is **airport-layer metadata**, not a real
  flight-row inclusion probability.
- We do **NOT** auto-stamp `sampling_weight = 1 / airport_layer_design_probability`
  on flight rows (V3.4's tentative instruction is deliberately retracted,
  §34-I). `sampling_weight` stays NULL until a future study defines what a
  flight-level weight would even mean.
- Per-row `flight_capture_flags` records *which mechanism produced the row*,
  so a later post-hoc weighting/coverage study is possible without pretending
  precision we don't have (ChatGPT4 §9: "Some flights will never appear
  exactly once").
- **Unit of prediction:** the §19 A/B/C tasks predict a *flight leg outcome*
  conditioned on whatever is knowable at the cutoff. Design-based weighting
  (if ever) is about correcting for WHO is in the dataset, not about the
  within-leg prediction itself. Keep those two concepts separate in the docs.

### 30.2 REGIONAL stratum: the correct two-step procedure (§8 restated with code in mind)

```
eligible = frame ∩ feed-covered airports of REGIONAL tier
raw_score_i from exogenous priors (traffic class from fixed reference data)
score_i = raw_score_i × m_i ;  m_i ∈ [0.25,1.5], score_i ≤ raw_score × 1.5
p_i = score_i / Σ_j score_j            // Σ p = 1
draw ONE index K ~ Categorical(p)
subscription = eligible[K]
record airport_layer_design_probability = p_K for batch_k
yield_K observed → update m_K for next window (audit trail on m history)
```

Guarantees: Σp=1 (a true distribution), nonzero floor for every eligible
airport, hard cap kills the upsample feedback loop. The recorded
`airport_layer_design_probability = p_K` is honest **conditional on the
pre-draw adaptive state** (V3.8 wording, §8) — it is the realized draw of a
history-dependent distribution, not a marginal inclusion probability. The
adaptive rule is an **efficiency-oriented allocation**, not a
representation-preserving sample (§8, CGTAnalaysis7 §24).

### 30.3 Stratification reference period (C7-adjacent, ChatGPT3 §17)

Frame-stratification variables (traffic, degree, carrier mix) are computed from
an **external or fixed reference snapshot** (published schedules / independent
data) taken once at frame-build time. Observed network/staleness metrics remain
ML features for the model — they never feed back into the frame.

---

## 37. Flight-inclusion probability & the unit of prediction (V3.5 deep-dive)

**Why 1/p must not be stamped (the full decomposition).** After the airport is
chosen and subscribed for a window, a flight row exists only if ALL of these
line up:

1. the flight is *scheduled/known* at the airport during the window;
2. the capture mechanism (tail heuristics, rotation chains, status-pull row
   generation) actually emits it;
3. it is not dropped as a duplicate or merged away;
4. it (or its airline/registration) is represented in the AeroDataBox
   reference data we join to;
5. the API call for its status/outcomes succeeds (not `no_call_record`,
   not a retry hit, not a midnight time-out).

Each is an unmeasured marginal and they interact (a flight absent because the
tail heuristic missed it is also a flight whose chain link we lose). So the
bare `airport_layer_design_probability` is at most a *component* of flight
inclusion — never the whole story. Per-row `flight_capture_flags` is the
measurable trace we keep; a future weighting study can then attempt a
hierarchical estimator (§10, §30.2b).

**Unit of prediction stays a flight-leg outcome.** The §19 A/B/C tasks predict
"delay of departure leg L at cutoff C" conditioned on schedule/status/chain/
weather knowable at C. Weighting (if ever) would correct for *which legs are
in the population*; it is orthogonal to the within-leg prediction and can't
fix leakage — that's what the cutoff rules (§11) are for.


---

## DD-T. Evaluation suite v2 (deep dive)

> The full engine-by-engine detail behind PART 1 §13. Includes train/val/test/stress doctrine, per-engine blocking, and the hashed Engine-A test protection.

## 32. Evaluation suite v2 (deep dive; C9 + C10 + V3.5 engines + V3.6 clustering)

**V3.5 (ChatGPT4 Change 3) — the family is formalized as five named engines,**
each reported separately, and the doctrine is train/val/test/stress:

| Engine | Split | Tests | Role in decision-making |
| ---- | ---- | ---- | ---- |
| **A — Future-representative** | chronological, continuous recent ~15–20% of days, **day/event-blocked; tails reusable across train/test**; disruption days weighted at their *observed* population frequency | deployment behavior on ordinary future days | **PRIMARY metric** — model selection + §12 marginal-value instruments |
| **B — Unseen airport (same region)** | other airports in region R train; airport Y ∈ R test | airport generalization within geography | breadth claims |
| **C — Unseen region** | regions R₁..Rₙ train; airport in Rₙ₊₁ test | geographic transfer | "does it travel?" |
| **D — Unseen tail/aircraft-type** | tails T₁..Tₖ / types M₁..Mₘ train; unseen tails / new tail of known type test | rotation & type-vs-instance generalization | chain/rotation feature value |
| **E — Disruption stress** | event/oversampled days (snow, ATC, MCD, hurricane) held out; ALL models re-run here | performance exactly when travel breaks | operational + publication-grade stress evidence |

Doctrine: **train/val/test/stress** — val is used for model selection (also
chronological, before test), test is the Engine-A representative window,
stress is the Engine-E oversampled-event window and is **never mixed into the
representative test set** (oversampling would bias it). Collection design must
make Engine-E feasible: disruption/event days are tagged in metadata
(`sampling_reason='disruption'`) from day 1 so the stress split exists even if
we never "target" those days (§21).

**V3.8 (CGTAnalaysis7 §19) — the final Engine-A test is protected from the
collection-policy optimization loop.** Marginal-value experiments are read on
Engine A (§38), but if every intervention is judged on the SAME Engine-A
window, that window becomes part of the collection-strategy optimizer and is
no longer a clean final test. Three-tier separation:

```
model / collection-policy tuning  →  validation cut (chronological, before test)
collection-policy selection       →  validation cut (choose interventions here)
final deployment claim            →  UNTOUCHED Engine-A test (read once, at the end)
```

The untouched future-representative window is consumed exactly once, for the
deployment claim (§39 Model −1 gate). Everything before it is decided on the
validation cut. This is especially important if the work becomes a
thesis/paper.

**V3.9 (CGTAnalaysis8 §13, §44-H) — the final Engine-A test is materialized
once, hashed/versioned, and read-only.** The instant the split is frozen, its
row set is written with a **content hash (e.g. SHA-256 over the flight/date
keys)** stored in meta; any later ETL rerun that would change the test
population → the hash mismatches → hard error. This prevents an accidental
reprocessing from silently rewriting the population the deployment claim was
made on.

**V3.7 Change A (SIXTH review, most important) — blocking is engine-specific.
** The V3.6 blanket rule "ALL observations of a tail stay in one partition" is
**retracted.** Each engine answers a different question, so each uses different
grouping rules (CGTAnalaysis6 §5):

| Engine | Blocking rule | Why |
| ---- | ---- | ---- |
| **A — Future-representative** | **chronological + day/event blocking; tails ARE allowed in both train and later test** | This is deployment: at test time the model legitimately knows what tail N123AB did on June 1 when predicting June 15 — that historical chain state is exactly the signal we collect. The cutoff rule (`feature_timestamp ≤ prediction_cutoff`) is what protects this, not tail-blocking. Banning previously-seen tails would create an unrealistically "cold-start" evaluation. |
| **B — Unseen airport** | airport-level blocking (airport Y ∈ region R held out entirely) | testing transfer to a new airport |
| **C — Unseen region** | region-level blocking | testing geographic transfer |
| **D — Unseen tail / aircraft-type** | **HARD tail-blocking: tail ∩ train = ∅, tail ∩ test ≠ ∅** (likewise type-blocking for the type variant) | the special generalization experiment — this is the ONLY engine that requires unseen tails |
| **E — Disruption stress** | whole disruption event in one partition | a hurricane/ATC event must not straddle train/test |

- **Same principle for identity features:** aircraft type, airport, and route
  are grouped per-engine exactly like tails — only the engine whose question is
  "can it generalize to unseen X" blocks on X.
- **Grouping key in the harness:** the eval builder takes an explicit
  `group_by` list per engine (`tail` / `event_id` / `calendar_day` / `airport` /
  `region`) and refuses any split that breaks a *relevant* group across a
  boundary. Engine A's group_by is `calendar_day` + `event_id` — NOT `tail`.
- **V3.7 (CGTAnalaysis6 §7) — confidence intervals via block bootstrap, not
  blanket "clustered SE":** observations are correlated within a day/event, so
  ordinary IID CIs are wrong. For predictive metrics (MAE/RMSE/Brier/…), CI is
  estimated by **cluster/block bootstrap resampled at the relevant experimental
  unit** (calendar day, disruption event, or other predefined group). Use
  within-cluster means only where a claim depends on day/event-level variation;
  don't force "clustered SE" onto every metric.

- **V3.8 (CGTAnalaysis7 §7) — Engine-A historical-feature cutoff guard.**
  "Tails reusable across train/test" does NOT license derived features that
  peek forward. A tail-derived feature is legal only **insofar as it could
  have been constructed from observations available by the prediction
  cutoff** — stronger than `feature_timestamp ≤ cutoff`, because a derived
  feature can accidentally aggregate future rows:
  - **ILLEGAL** for a June 15 prediction: `mean delay of N123AB during June`
    (June 16+ leaks in).
  - **LEGAL**: `mean delay of N123AB over its previous 10 completed legs`,
    provided every leg occurred before the cutoff.
  The snapshot builder gets a **unit test** for this (a feature must pass
  "constructible-at-cutoff" for a set of hand-built cases).
- **V3.6 — rolling-origin evaluation for Engine A (CGTAnalaysis5 §8).** Do NOT
  rely on one chronological train→test split. Walk several origins:
  `train w1–4 / val w5 / test w6`, then `train w1–5 / val w6 / test w7`, etc.,
  and report **mean ± std and P10/P50/P90** across origins. Aviation is seasonal
  and event-heavy; a single origin can be lucky or unlucky. **V3.8
  (CGTAnalaysis7 §21): on 31 days there are only ~2–3 weekly origins — label
  the result "early rolling-origin pilot evaluation," never "robust seasonal
  validation" (30 days ≠ seasonality, §25).**

**V3.6 — disruption frequency honesty (CGTAnalaysis5 §23).** Report the
disruption weight used in Engine A as the **observed frequency** from the
collection, and where 30 days is too short to estimate it robustly, anchor it
with **external historical information** (published seasonal norms). Never
present a 30-day estimate as "population truth." This is the same discipline
as "30 days ≠ seasonality" (§26).

Plus **leakage controls:** any feature timestamp > cutoff → hard error (unit
test, §27.1-gate 6); regime-by-regime splits (§21) so collection-design change
can't masquerade as model signal.

**Uncertainty/calibration (C10, later phase but designed now):** the traveler
alert outputs `expected_delay`, `P(delay>15)`, `P(delay>60)`, and a
conformal interval. Evaluation includes reliability-diagram calibration and
coverage of the interval — not only point-error MAE/RMSE per horizon.

---


---

## DD-U. V3.5→V3.6 code-delta plan

> The historical to-do (A–R) that led to the final R1–R7/S1–S5 list in PART 1 §15. Kept for traceability.

## 34. V3.5→V3.6 code-delta plan (what needs to change after we say "Go")

Order matters; each item is independently verifiable. (Nothing here runs until
the balance is refilled and each gate is green.) A–F are collection-time;
G–J are the V3.5 additions (seeded schedules, 1/p retraction, eval harness);
K–O are the V3.6 additions (crossover-first, blocked eval, Model −1, rename,
balance table); P is the V3.8 additions (credit accounting + DB constraint).

| # | Item | File(s) | Verification |
| ---- | ---- | ---- | ---- |
| A | Coverage measurement (already coded) | `scripts/measure_coverage.ts`, `npm run coverage` | run on Replit; record `universeCount`, `catalogInUniverse` |
| B | **Migration: probability naming** — batches get `time_window_schedule`, `time_window_regime`; rows/`adb_collection_subs` rename `sampling_probability` → keep as `planned_share` semantics + add `is_randomized` flag | `migrations/0016_*`; `adbCollectionController_v3.ts` stamping | typecheck; grep shows no field named `*_probability` that is actually a schedule |
| C | **REGIONAL normalized pick** (uniform-only first, adaptive second): `p_i=1/|eligible|`, draw one, stamp `airport_layer_design_probability=p_K` (conditional design probability at the draw; §8, §30); yield tracker table for `m` | `adbCollectionController_v3.ts`, new `adb_regional_yield` table | unit test: Σp=1 over eligible; realized draw stamped with its conditional p |
| D | **Experiment scheduler (crossover-first, V3.6)**: `crossover_group`+`period` for crossover days (preferred) or `matches_template` for matched-pair fallback; refuse unpaired/mismatched experiment days (31.3) | controller + meta | rejection tests for each REFUSE rule incl. half-completed crossover |
| E | **Zero-yield tracker with triage**: `zero_yield_once` / `repeated` / `persistent`; only persistent feeds `m` adaptation; report count in health, never remove from frame | health script + controller | health shows zero-yield triage counts, no false FAIL |
| F | **Requested/actual window**: write `requested_window_hours`, compute `actual_window_hours` at close, store `stop_reason` (already have stop_reason) | migration 0016 + controller `stopBatch` | batch row shows requested vs actual for a capped day |
| G | (Later, modeling) **five-engine eval harness** A–E + calibration: future-representative primary, unseen airport/region/tail/type, disruption stress; model ladder −1..7 each on representative + stress | new eval scripts | report includes 5 engines + ladder curve + calibration curves |
| H | **Anchor from fixed reference list + pre-specified 40/20/20/20 score** (V3.6) + standardized probe helper that schedules same-class probes | `adbAirportCatalog_v3.ts` doc + `scripts/probe_anchors.ts` | probe workbook: same time-class/weekday for all candidates; score formula fixed in code |
| I | **V3.5 Change 1 — stop stamping `1/p`**: remove any `sampling_weight = 1 / airport_layer_design_probability` auto-write on flight rows; add `flight_capture_flags` per row (which mechanism produced it); keep `sampling_weight` NULL | stamping code, migration 0016 | no row has `sampling_weight = 1/p`; flags populated |
| J | **Seeded schedules + constrained randomization (V3.7)**: UTC start hour from seeded balanced permutation of `{00,04,08,12,16,20}` with run-level **constrained randomization minimizing (weekday × UTC-block) imbalance** (42 cells, 31 starts → minimize Σ(n_c−n̄)²); anchor order via `anchor_pool_seed`; seeds recorded on batch rows; **V3.8 hard/soft hierarchy (CGTAnalaysis7 §9):** never violate daily-credit≤1,900 / one-batch-per-day / valid window / valid tier / crossover integrity / no duplicate anchor-in-cycle to improve the soft imbalance objective (§9) | scheduler + meta | replay test: same seed → same order; reported as "constrained randomized allocation", never "balanced at weekday×UTC level"; hard-constraint-sacrifice → hard error |
| K | **V3.6 Change A — rename**: `airport_layer_design_probability` everywhere (schema, code, docs) so the name can't be misread as flight-level | migration 0016 + grep sweep | zero occurrences of the old name; docs consistent |
| L | **V3.6 Change D — clustered/blocked eval**: eval builder takes explicit `group_by` (tail/event/calendar-day/airport/region) and refuses splits that break a group across a boundary | eval harness | grouping tests: split with a broken group → hard error |
| M | **V3.6 Change E — Model −1 persistence baseline** in the eval harness (last-known airport/route/leg delay, no learned model) | eval scripts | report always includes Model −1 column |
| N | **V3.6 Change C/F — marginal-value tracker**: diagnostic dashboard reports per-intervention-family `Δmetric/Δcredits` and learning curves at cumulative sizes (2k…~58k) | diagnostics + eval | dashboard shows MV per intervention family; no 100k point |
| O | **V3.6 secondary** — diversion fields (`original_scheduled_destination`, `current_operational_destination`, `actual_destination`, `diversion_flag`); tail-chain depth metrics (3-leg / 4+-leg / completeness) | schema + diagnostics | diversion classification uses `diversion_flag`; dashboard shows chain depth |
| P | **V3.8 credit accounting + DB constraint**: set `maxDeliveryRetries=0` on collection subscriptions (row↔credit identity exact, §13); check-constraint `is_randomized=true → airport_layer_design_probability NOT NULL` / `false → NULL + planned_share` (§10); crossover periods tag `unit_type='airport_set_block'` (§31.2); snapshot-builder unit test: derived tail features constructible-at-cutoff (§32) | controller `createSubscription` opts, migration 0016, snapshot builder | grep confirms `maxDeliveryRetries=0`; insert that violates the p/planned constraint → DB error; cutoff unit test passes |
| Q | **V3.9 credit-accounting implementation (CGTAnalaysis8 §3/§4, §44)**: add `balance_before`/`balance_after`/`credits_consumed_actual` to `adb_collection_batches` (set at start/stop); persist per-batch `notification_items / inserted / updated / duplicates / delivery_failures` (from `UpsertResult`); daily-cap math uses balance delta (`1900 − actual_spend_today`), not rows; reconciliation check `|C_external − C_internal| ≈ 0`; small **credit-canary script/endpoint**; `yield_score` probe formula fixed in code pre-probe (§23); Engine-A test materialized with content hash (§32) | migration 0017, controller `startBatchInner`/`stopBatch`, watchdog, `scripts/credit_canary.ts` | canary prints balance-before/after, items, rows, failures, C_external, C_internal, and PASS/FAIL on tolerance |

After A–R land (and A's numbers come back), the 60k run can start on the
approved §25 calendar. (V3.4 said A–H; V3.5 added I + J; V3.6 adds K–O so all
six fifth-review changes are literally in the plan, not just in prose; V3.8
adds P; V3.9 adds Q — and §27.1 gates 9–10 must be green; V3.9-f adds R =
CGTAnalaysis9's exclusivity + soft-stop + canary composition, §45.5, and the
§45.6 GO gate covers all of it.)

| R | **V3.9-f (CGTAnalaysis9 §45.5)**: subscription-set exclusivity (orphan-cleanup at batch start + canary asserts no foreign sub); daily-cap SOFT_STOP margin (`1900 − ADB_DAILY_SOFT_STOP_MARGIN`, default 50); canary reports notification composition (items/notification, max burst) and PASS only with exclusivity + `|C_external − C_internal| ≤ tol` + failures = 0; delivery-failure stop flags affected rows; crossover template frozen before treatment; versioned manifest (frame/scheduler/anchor/catalog/builder) | migration 0018, controller watchdog + `startBatchInner`, `scripts/credit_canary.ts`, `adb_collection_meta` | `listSubscriptions()` empty-foreign during run; batch stops at 1,850/1,900; canary prints composition + PASS/FAIL; `npm run health` shows manifest |

---


---

## DD-V. Marginal predictive value per credit

> Supports PART 1 §14. Feature contribution vs collection marginal value; learning curves 2k…58k; repeated interventions.

## 38. Marginal predictive value per credit (V3.6 — two quantities, not one)

Objective (final): **collection marginal value per credit** — "does +1 hub, +1
MID airport, +1 REGIONAL airport, +1 tail-chain observation, or +1 week of an
existing hub buy enough future prediction quality to be worth its credits?"

**V3.6 Change F (CGTAnalaysis5 §11):** we now split the V3.5 idea into TWO
quantities and never conflate them:

| Quantity | Definition | What it answers | How measured |
| ---- | ---- | ---- | ---- |
| **Feature contribution** | `ΔM_feature = M(full) − M(without feature)` on held-out tests | "Is feature X useful to the model?" | ablation (drop weather / chain / hub-count features) — a **modeling** result |
| **Collection marginal value** | `MV_data = ΔM / Δcredits` where the numerator comes from an actual **collection intervention** | "Should we spend our next N credits on airport A, tail-chains, or obs-depth?" | real interventions: +1 observation day at WSSS vs +1 MID airport vs +1 REGIONAL airport vs +1 tail-chain vs +1 week on an existing hub; numerator = ΔEngine-A metric from that intervention, denominator = credits it actually cost |

Dropping the weather *feature* (§38-ablation) does NOT tell you how many
credits to spend on another airport — those are different interventions
(CGTAnalaysis5 §11). Feature contribution informs the modeling ladder (§19);
collection marginal value informs the collection budget (§12). Only the second
is the allocation objective.

Measurement instruments (all read on the Engine-A **validation cut**, not the
final untouched test — V3.8, CGTAnalaysis7 §19, §32):

1. **Ablation on held-out tests (feature contribution only).** Remove a slice
   of inputs (drop weather, drop chain features, drop the newest airports / a
   week of an existing hub) → measured drop in Engine-A error/calibration.
   Label this "feature contribution," never "marginal value per credit."
2. **Learning curves (V3.6 Change C — inside the budget; V3.7 adds spend
   columns).** Hard constraint: **60,000 credits at ~1 row/credit ⇒ the run
   produces at most ~58k–60k flight-observations; the V3.5 "100k" point is
   removed as empirically impossible.** Fit the ladder models at the actual
   cumulative dataset sizes as they accumulate — e.g. **2k / 5k / 10k / 20k /
   30k / 40k / 50k / ~58k** — and fit `metric = a·n⁻ᵇ + c` **only inside the
   observed domain**. Any asymptotic extrapolation beyond ~58k is allowed ONLY
   if clearly labeled as extrapolation (e.g. "predicted at 100k, unmeasured").
   **V3.7 (CGTAnalaysis6 §13):** rows ≠ information, so the curve carries
   **cumulative credits AND cumulative unique flights** alongside rows — we
   measure performance-vs-data AND performance-vs-spend simultaneously:

   | Credits | Unique flights | Tails | Chains | Engine-A MAE |
   | ------: | -------------: | ----: | -----: | -----------: |
   |      2k |            …   |   …   |   …    |          …   |
   |      5k |            …   |   …   |   …    |          …   |
   |     10k |            …   |   …   |   …    |          …   |

   Tells us whether we're on the steep part (collect more of that family) or the
   flat part (stop).
3. **Counterfactual slices using the §33 calendar.** The crossover/matched
   window pairs and the disruption days provide natural quasi-experiments:
   compare the *same templates* for what extra capture buys. (Crossovers are
   preferred precisely so these contrasts are not confounded by day effects;
   §31.)
4. **V3.8 — repeat the interventions, don't rely on one draw (CGTAnalaysis7
   §18).** One "+1 MID airport → MAE −0.7 min" is not evidence. Collect
   **repeated / paired interventions**: `+MID #1, +MID #2, +MID #3, …` (or
   repeated randomized blocks), estimate `MV_k = ΔM_k / ΔC_k` per repetition,
   and report the **sequence `MV_1 > MV_2 > MV_3 …`** — that trajectory is how
   diminishing returns are actually discovered. Analysis protocol only; the
   collection schema is unchanged.

Operational consequence: the §25 calendar doesn't change (credits fixed), but
the **§12 diagnostic dashboard now reports** `Δmetric / Δcredits-allocated`
per **collection intervention family** (new hub, new MID, new REGIONAL,
tail-chain density, weather coverage, obs depth), so every session can see
which lever is still paying. This is the research-contribution claim (§26):
*"how much coverage is enough?"* answered with measured marginal value, not an
assumed target.


---

## DD-W. Model ladder v2 & graph edge taxonomy

> The graph-edge-taxonomy half is live (also in PART 1 §12.3); the ladder is elaborated in PART 1 §12.1. §39.

## 39. Model ladder v2 + graph edge taxonomy (V3.5 deep-dive)

**Ladder** (full table in §19, Models −1..7): every step reported on BOTH the
Engine-A representative test and the Engine-E stress test; the scientific
headline is the **increment each layer adds**, identical to the marginal-value
question for data (§38). Model 4 (GNN rollout) is the launch commitment; Models
5–7 are the productization layers. If a higher layer wins on A but not E (or
vice-versa) we say so in the report — that asymmetry is itself a finding.
Model −1 (persistence) is the gate for *general-deployment* claims: Model 1
must beat it on the PRIMARY future-representative test before added complexity
is treated as justified for ordinary days. **V3.7 (CGTAnalaysis6 §14):** the
gate is engine-specific — a model that loses to persistence on Engine A may
still be the right disruption product if it wins Engine E; report both.

**Graph edge taxonomy** (required so a GNN is honest about what it aggregates):

| Edge type | Example | What it encodes | Collection requirement |
| ---- | ---- | ---- | ---- |
| Static (route/schedule) | JFK–LHR on the published timetable | geography + regularity | catalog + schedule ref data (free) |
| Dynamic (state-at-T) | "LHR departures delayed avg 34 min now" | live congestion/delay propagation | snapshot columns at cutoff (snapshot ETL) |
| Resource (capacity/ops) | runway/stand/ATC configuration, gates | physical capacity coupling | reference data + event flags when available |
| **Aircraft/flight-chain (V3.6)** | FLIGHT A ──same-tail──> FLIGHT B; AIRCRAFT ──operates──> FLIGHT | delay propagation along sequential legs; makes the graph multi-relational, not just airport-centric (Aeolus-style) | the same `tail_chain` features we already capture — promoted from feature-only to an explicit edge type (§19, CGTAnalaysis5 §5) |

The graph is therefore **multi-relational**: airport-route, airport-congestion,
aircraft-operates-flight, and flight-chained-by-same-tail edge types, all with
timestamps and all subject to the same `feature_timestamp ≤ cutoff` leakage
rule; the modeling doc must separate them (a common GNN failure is training on
dynamic edges that at inference time can't exist yet).



---
---

# PART 3 — REVISION HISTORY (V3.2 → V3.9-f.1)

> **Which V3.x do we use?** ONE document — this one. V3.2 through V3.8 were
> cumulative *revisions of the same plan*, each responding to a review
> (`ChatGptAnalysis1–4`, `CGTAnalaysis5–9`). The final state is PART 1 above.
> This part is the record of HOW the plan got here — the claim-by-claim
> adjudications and the frozen "what we did NOT change" lists. It is history;
> where it conflicts with PART 1, PART 1 governs.

## The master revision log (V3.2 → V3.9-f)

> _Original document title: "V3.9 — Collection Strategy (frozen pre-run spec;
> preflight verification gates)." The revision log below is preserved verbatim._

> **Revision log**
>
> - **V3.2** (2026-08-11, first review): responded to `ChatGptAnalysis1.md` —
> tempered the 1/p claims, added frame-from-universe, cross-region core,
> 2D sampling, leakage-safe snapshots, info-per-credit diagnostics.
> - **V3.3** (2026-08-11, second review): this revision **updates** V3.2 after
> `AugMDnotes/ChatGptAnalaysis2.md` (1,085 lines) and adds the deep-dive
> sections (§17–§27): weather layer, formal prediction tasks, flight-outcome
> states, collection-regime robustness, coverage taxonomy, anchor-selection
> protocol, controlled window experiments, an honest vocabulary, and a
> ready-to-approve default configuration (no more open guessing).
> - **V3.4** (2026-08-11, THIRD review): `AugMDnotes/ChatGptAnalaysis3.md`
> (1,368 lines) says V3.3 is **approved conceptually, ~85–90%**, but lists
> **10 statistical/experimental corrections** to make BEFORE the run. V3.4
> applies all 10 (§29) and expands probability-vs-allocation honesty (§30),
> a genuinely controlled window experiment (§31), the evaluation suite
> incl. unseen-tail + uncertainty (§32), a self-consistent first-month
> calendar (§33), and the code-delta plan (§34).
> - **V3.5** (2026-08-11, FOURTH review): `AugMDnotes/ChatGptAnalaysis4.md`
> (1,305 lines) says V3.4 is **~90–95% conceptually right — "yes, with the
> four changes below."** The four are **all adopted** (§36):
>   1. **Flight inclusion ≠ airport selection.** `airport_layer_design_probability`
>     is airport-layer metadata only; we must **NOT** auto-stamp
>     `sampling_weight = 1 / airport_layer_design_probability` on every flight row
>     (flight capture has 4+ further mechanisms). (§10, §30, §37)
>   2. **Balanced RANDOMIZED time schedule**, not strict `00→04→08→12→16→20`
>     cycling — removes weekday↔UTC correlation; seeded & recorded
>     (`time_window_schedule_seed`). (§9, §25, §39)
>   3. **Add a "future representative" primary test + a disruption stress test**
>     to the evaluation family, and adopt the train/val/test/stress doctrine.
>     (§32)
>   4. **Final collection objective = marginal predictive value per credit**
>     (Δmodel / Δcredits), not coverage alone — the genuinely interesting
>     research contribution. (§12, §16, §38)
> - **V3.6** (2026-08-11, FIFTH review / PRE-RUN LOCK): `AugMDnotes/CGTAnalaysis5.md`
> (1,357 lines) verdict: **V3.5 architecture, collection philosophy, leakage,
> flight-chain, weather, graph, ladder, and evaluation designs are all
> APPROVED**; the remaining issues are experimental-design / statistical-
> identification tightening, not re-design. Per its own recommendation we do
> **NOT rewrite** — we produce a **V3.6 "pre-run lock"** with exactly **six
> corrections** (§41) and a short list of adopted secondary refinements, then
> **freeze the collection schema and begin coverage/anchor measurement**:
>   1. **Rename the probability** → `airport_layer_design_probability`
>     everywhere (Change A) so it can never be mistaken for a flight-level
>     probability six months from now. (§10, §30, §37, §41-A)
>   2. **Randomized crossover becomes the PREFERRED window experiment**
>     (matched pair = fallback only); the 6h day is reframed as a legitimate
>     **budget-allocation regime**, not a "failed 6h experiment". (§31, §41-B)
>   3. **Learning-curve sizes fixed** — remove the 100k point (impossible under
>     60k credits at ~1 row/credit); fit only inside the observed domain
>     (2k…58k cumulative), extrapolation labeled as such. (§38, §41-C)
>   4. **Clustered/blocked evaluation added** — same day / same disruption /
>     same tail never straddle a train/test boundary in the partition engines.
>     (§32, §41-D)
>   5. **Model -1: naive operational persistence baseline** added below XGBoost
>     (prove ML beats "last-known state", not just the calendar floor). (§19, §41-E)
>   6. **Marginal value split in two:** *feature contribution* (ablation) vs
>     *collection marginal value* (Δmodel / Δcredits from REAL collection
>     interventions, e.g. +1 obs-day at WSSS vs +1 MID vs +1 REGIONAL).
>     (§38, §41-F)
> - **V3.7** (2026-08-11, SIXTH review / FROZEN): `AugMDnotes/CGTAnalaysis6.md`
> (1,209 lines) verdict: **V3.6 ~95–97% ready — "PRE-RUN APPROVED WITH THREE
> LOCKED CLARIFICATIONS"; no redesign.** All three are **adopted** (§42) and
> the collection architecture is now FROZEN — from here it is measurement, not
> theory:
>   1. **Tail-blocking is engine-specific.** The blanket "ALL observations of a
>     tail stay in one partition" rule is retracted. Engine A (future-
>     representative, deployment) uses **chronological day/event blocking and
>     lets previously-observed tails appear in both train and later test**
>     (historical chain state is a legitimate, cutoff-protected feature).
>     Engine D (unseen-tail generalization) alone requires hard tail-blocking.
>     (§32, §42-A)
>   2. **"Constrained randomized allocation," not "weekday × UTC balance."**
>     31 days cannot represent all 42 weekday×UTC cells; we minimize imbalance
>     Σ(n_c−n̄)², not equal representation. (§9, §25, §42-B)
>   3. **The 2×2h/6h window experiment is a PILOT.** Three 2×2h and two 6h
>     blocks cannot statistically establish a winner; month-1 gates Month-2's
>     larger controlled study. (§24, §31, §42-C)
>
> **What the fifth review changed (short version):**
>
> 1. **`airport_layer_design_probability` everywhere** — the namespace is
>   explicitly airport-layer-only; no flight-row uses it as a weight. (§10,
>   §30, §37; code §34-C/I; Change A)
> 2. **Crossover-first window experiment** — randomized crossover is the
>   preferred design, ordinary matched pairs are the fallback, and the 6h day
>   is defined as *"under a fixed 1,900-credit budget, which window regime
>   maximizes predictive information?"* — so `up-to-6h` is a legitimate
>   allocation regime, not a failure. (§31; Change B)
> 3. **Learning curve stays inside the budget** — 2k/5k/10k/20k/30k/40k/50k/58k
>   cumulative rows; no 100k empirical claim; asymptotic extrapolation is
>   labeled. (§38; Change C)
> 4. **Blocked/clustered evaluation** — the whole day, the whole disruption
>   event, and all observations of a tail stay in one partition. (§32; Change D)
> 5. **Model -1 persistence baseline** — `last-known operational state`
>   (airport recent delay, route recent delay, previous-leg delay) proves ML
>   adds value over a strong autocorrelation baseline. (§19; Change E)
> 6. **Marginal-value framework is now two quantities** — feature contribution
>   (ablation ΔM) and collection marginal value (ΔM from real collection
>   interventions / Δcredits). They are never conflated. (§38; Change F)
> 7. **Adopted secondary refinements:** weekday×UTC-block balance over the
>   whole run (§9, §25); **aircraft/flight-chain edges** as an explicit graph
>   edge type (§19, §39); weather "free" → "no AeroDataBox credit cost, but
>   retrieval/storage/archive are separate engineering constraints" (§18, §40);
>   don't freeze the three-model decision — test shared `horizon_hours`
>   conditioning (§19); rolling-origin evaluation for Engine A (§32);
>   diversion needs explicit fields + reliable evidence (§20); zero-yield
>   triage `once/repeated/persistent` (§8, §22); pre-specified anchor score
>   weights (§23); stratification = primary `traffic tier × macro-region`
>   strata + balancing variables (§6); disruption frequency reported as
>   *observed*, not population truth (§32); month-1 goal reprioritized to
>   validated pipelines + XGBoost baseline first, GNN as the next phase (§14, §24).
>
> **What the sixth review changed (short version):**
>
> 1. **Engine-specific partition rules (§42-A, most important):** Engine A uses
>   chronological day/event blocking with tails REUSABLE across train/test
>   (cutoff-safe); Engine D requires hard unseen-tail blocking. Aircraft type,
>   airport, and route grouping likewise vary per engine's question.
> 2. **"Constrained randomized allocation" replaces "balanced at the weekday ×
>   UTC level"** — 31 window starts can't balance 42 cells; we minimize
>   cell-imbalance Σ(n_c−n̄)² and say so. (§9, §25, §42-B)
> 3. **Window experiment relabeled pilot evidence** — 3×2×2h + 2×6h gates a
>   Month-2 controlled study; no "4h beats 2×2h" statistical claim from
>   month 1. (§24, §31, §42-C)
> 4. **Block bootstrap replaces blanket "clustered SE"** for predictive-metric
>   confidence intervals (bootstrap by calendar day / disruption event). (§32)
> 5. **Learning curve gains cumulative credits + cumulative unique flights**
>   columns alongside rows — we measure performance-vs-data AND
>   performance-vs-spend, never "rows ≈ information". (§38)
> 6. **Model −1 gate is engine-specific:** Model 1 must beat persistence on the
>   PRIMARY future-representative test to justify added complexity for general
>   deployment; a model may still win Engine E (disruption) without beating
>   persistence on Engine A — both results are reported. (§19, §39)
> 7. **Weather schema hardened:** `retrieval_time` added and observed-vs-forecast
>   made explicit so a T-24h model can't ingest a T-2h-issued TAF. (§18, §40)
> 8. **Anchor score normalized + frozen in code** (each of the 4 components
>   scaled to [0,1] before the 40/20/20/20 weighting; formula locked pre-probe).
>   (§23)
> 9. **Stratification wording unified** to `traffic tier × macro-region`
>   (primary) + balancing variables everywhere — the §6 vs checklist
>   inconsistency fixed. (§6, §15, §27)
> 10. **Vocabulary refined:** "sampling-aware collection from the
>   AeroDataBox-supported aviation universe" replaces the stronger
>   "probability-aware sample" phrasing; literature-supported components vs our
>   experimental contribution split is explicit. (§26)
> - **V3.8** (2026-08-11, SEVENTH review): `AugMDnotes/CGTAnalaysis7.md`
> (1,118 lines) verdict: **V3.7 is "scientifically defensible pre-run design,
> with four small lock corrections — not a design needing another rewrite."**
> We adopt those four, plus the gaps ChatGPT did NOT see: **two real
> credit-accounting holes in the subscription engine** (delivery-retry credits
> and the units-vs-credits dual billing system) and a **final-Engine-A-test
> protection** rule. All land in §43. The collection architecture stays FROZEN;
> these are corrections, not a redesign:
>   1. **Calendar arithmetic fixed** — the §25 table really has **26 × 4h + 3 ×
>     2×2h + 2 × 6h = 31 days (84% / 10% / 6%)**, not "24…77%". (§25, §43-A)
>   2. **Hard cap reconciled with the 1,100** — `ADB_DAILY_CREDIT_CAP=1900` is a
>     hard invariant; the 1,100 remainder is a **monthly reserve, unusable
>     while the cap is active**, not a storm-day overspend allowance. (§13,
>     §25, §43-B)
>   3. **REGIONAL wording tightened** — `airport_layer_design_probability` =
>     conditional design probability given frame + adaptive state *immediately
>     before the draw*, never "realized inclusion probability"; and the
>     adaptive rule is labeled an **efficiency-oriented allocation**, not a
>     representation-preserving sample. (§8, §30, §43-C)
>   4. **Engine-A historical-feature guard** — a tail's derived feature is legal
>     only if it could have been built from observations available by the
>     prediction cutoff; snapshot builder gets a unit test. (§32, §43-D)
>   5. **Credit accounting closed** — delivery retries (each = 1 credit) are set
>     to 0 during the run so "1 row ≈ 1 credit" stays exact, the units-vs-credits
>     dual billing system is written into the credit plan with a "no manual
>     Rescore all / simulate during collection" guard, and the missing
>     `ADB_RESERVE_CREDITS` / `ADB_ALERT_MIN_BALANCE` / `ADB_MIN_BATCH_CREDITS`
>     knobs are documented. (§13, §28, §43-E)
>   6. **Final Engine-A test is protected** — collection-policy tuning reads a
>     validation cut; the untouched future-representative test is used once,
>     for the deployment claim. (§32, §38, §43-F)
> - **V3.9** (2026-08-11, EIGHTH review): `AugMDnotes/CGTAnalaysis8.md` (671
> lines) verdict: **V3.8 is ~95–98% ready — architecture/experimental/eval are
> right; the one real remaining flaw is credit-accounting *implementation*
> ("1 credit ≠ 1 newly stored row" because dedupe/updates consume credits
> without new rows), and the rest are preflight/code-verification items. Do
> NOT invent another architecture review — proceed to implementation +
> verification gates, then a tiny live credit-reconciliation canary before
> committing the 60k.** All adopted in §44 (V3.9 = preflight lock, not a
> redesign):
>   1. **Three-quantity credit accounting**: `notification_items_received`,
>     `credits_actually_consumed` (Flight Alert balance delta, the source of
>     truth), `unique_flight_rows_created_or_updated` (plus
>     duplicate/updated/failed-delivery counts). "1 row ≈ 1 credit" is
>     retracted. (§13, §44-A)
>   2. **Daily cap = reservation vs actual spend**: `daily_budget_remaining =
>     1900 − actual_credit_spend_today` (balance-based), not `− estimated_rows`.
>     (§13, §44-B)
>   3. **Delivery-failure hard gate**: if webhook delivery failure rate > 0
>     (HTTP error / timeout / non-2xx / missing sequence), pause the run and
>     investigate — retries=0 trades delivery protection for cost
>     predictability. (§44-C)
>   4. **Reserve nomenclature fixed**: monthly remainder = 1,100; application
>     safety reserve = 1,000; controller refuses to spend below 1,000 unless
>     explicitly overridden. (§13, §44-D)
>   5. **31-day naming + scheduler hierarchy**: §14/§15 say "31-day collection
>     month"; the 6-day "each UTC slot once" rule is a HARD constraint and the
>     weekday×UTC imbalance minimization is the SOFT objective among valid
>     permutations. (§14, §25, §44-E/F)
>   6. **Anchor yield defined precisely** (not raw rows/hour): probe score uses
>     f(unique flights/credit, tail-chain links/credit, stability) with
>     uncertainty. (§23, §44-G)
>   7. **Final Engine-A test materialized once, hashed/versioned, read-only** —
>     an accidental ETL rerun cannot change the test population. (§32, §44-H)
>   8. **Five preflight gates before the 60k**: coverage → anchor probe →
>     credit canary (C_external = C_internal within tolerance) → webhook
>     reliability → 31-day run. (§27.1, §44)
> - **V3.9-f (final) — NINTH review close-out**: `AugMDnotes/CGTAnalaysis9.md`
> (661 lines) verdict: **"V3.9 is very close — proceed to implementation and
> preflight, NOT directly to the 60k. Do NOT iterate V3.10/V3.11/V3.12… on
> theoretical objections — the remaining questions are empirical."** We checked
> every claim against the code and the current document: none changes the
> architecture. **One real implementation gap** (batch credit attribution needs
> a provably exclusive experimental subscription set), a **soft-stop margin**
> for the async-accounting overshoot, and a **richer canary**. All land in §45
> — the LAST revision of this document.
>
>
> Sources: our own measured data (`flight_data_pre_post7.csv`, 4,316 rows;
> B0002 cost ≈ 2,037 credits / 3.8 h / 1,922 rows), `Overnight2.md`,
> `V3_CollectionStrategy.md`, `ChatGptAnalysis1.md`, `ChatGptAnalaysis2.md`,
> `ChatGptAnalaysis3.md`, `ChatGptAnalaysis4.md`, `CGTAnalaysis5.md`,
> `CGTAnalaysis6.md`, `CGTAnalaysis7.md`, `CGTAnalaysis8.md`,
> `CGTAnalaysis9.md`, and the
> cited/published flight-delay
> ML literature (Aeolus NeurIPS 2025, DS-MGCSTNet, CausalNet, graph-ML
> tree-vs-GNN,
> FlightSense rotation+NOAA, delay-absorption, TFT, US multi-horizon graph
> study, calibrated tree models).

---

## R-V3.2. First review — ChatGptAnalysis1 (V3.2)

## 1. Verdict on ChatGPT's analysis — summary

**It is largely correct, high quality, and aligned with standard ML practice.**
Two corrections we must make to it, and one affordability reality it glosses
over. I recommend adopting most of it, with budget-aware scaling.


| ChatGPT claim                                                            | Verdict                                                  | Action                                                                                                                           |
| ------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "You're sampling ~5 airports/batch, not ~280/day"                        | **Correct** (a misread of the 276-catalog)               | Already our design; restate clearly in docs                                                                                      |
| "Graph is not fractured — 1 component, 763 edges"                        | **Correct**, matches our measurement                     | Keep, and keep the "whole-edge" delivery model                                                                                   |
| "Fix spatial+temporal+aircraft-chain together" (Aeolus alignment)        | **Correct**                                              | Adopt snapshot/rotation emphasis                                                                                                 |
| "1/p ≠ exact Horvitz–Thompson weight; many selection layers"             | **Correct — the most important correction**              | We overstated it in V3; temper the claim (below)                                                                                 |
| "Recent-batch exclusion changes the real p"                              | **Correct technically**                                  | Record as conditional / nominal; keep seeds (V3.4 refinement: rename to design-probability vs allocation-schedule, §10, §30)                                                                                                                        |
| "Define the target population / prediction goal first"                   | **Correct**                                              | Add explicit problem statement (§5)                                                                                              |
| "XGBoost baseline before GNN; GNN ≠ automatically better"                | **Correct**                                              | Adopt the model ladder                                                                                                           |
| "Biggest danger = leakage (PRE/POST in one table), split by flight/date" | **Correct and critical**                                 | Adopt snapshot/cutoff design (§10)                                                                                               |
| "Fixed core should be cross-regional, not WSSS+OMAA"                     | **Direction correct; the stated reason is partly false** | Cross-regional core yes — but OMAA is **Abu Dhabi, not Muscat**, and Singapore–Abu Dhabi are different aviation regions (see §4) |
| "Expand frame from 276 to the AeroDataBox coverage universe"             | **Correct direction, unverified size**                   | Measure with `/collection/coverage` first (§6)                                                                                   |
| "Persistent core 40–50% / rotating 30–40% / event 10–20%"                | **Correct principle**                                    | But under 1,900 credits/day that ≈ **1–2 airports**, not 4–6 (see §7)                                                            |
| "Don't delete REGIONAL; make selection yield-aware with floors"          | **Correct**                                              | Adopt §8                                                                                                                         |
| "Time-of-day must rotate like airports do (2D sampling)"                 | **Correct**                                              | Adopt §8.4 / §9                                                                                                                  |


**Bottom line:** evolve, don't rewrite. The engine (probability sampling +
recorded weights + rotation) is sound and matches how research workloads are
licensed under pay-per-row constraints once the claims about weights are
tempered. The changes are: **panel core, wider frame, 2D time sampling,
leakage-safe snapshots, info-per-credit dashboards, XGBoost-first evaluation.**

---



## 2. Fact-check the ChatGPT claims against our data


| ChatGPT statement                                                        | Our data                                                                              | Agreement               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------- |
| "B0002 observed 4 airports: 1 HUB + 2 MID + 1 REGIONAL"                  | WSSS 1,325 / OMAA 508 / HECA 87 / KGPT 2                                              | ✅ exact                 |
| "336 distinct airports; 763 route pairs; 1 component; 70% bidirectional" | Same numbers from `analyze_overnight2.py`                                             | ✅ exact                 |
| "1,036 tails; 716 with ≥2 captures; 91%; tail on 81% of rows"            | Same                                                                                  | ✅ exact                 |
| "PRE 1,703 / POST 2,613; dep runway on 1,898"                            | Same                                                                                  | ✅ exact                 |
| "20:22 refill … credits 9554→866"                                        | Matches credit trajectory                                                             | ✅                       |
| "B0002 cost ≈ 2,037"                                                     | ✅                                                                                     | ✅                       |
| "OMAA = Muscat"                                                          | **OMAA = AUH Abu Dhabi (UAE); Muscat = OOMS**                                         | ❌ factual error         |
| "WSSS + OMAA = one broad geographic region"                              | Singapore (SE Asia) vs Abu Dhabi (Gulf) — different aviation regions, ~6,000 km apart | ⚠️ overstated           |
| "A permanent core of 4–6 airports if budget permits"                     | 4–6 airports at hub yields **exceeds** 1,900 credits/day                              | ⚠️ not affordable as-is |


None of ChatGPT's factual errors change the *adoption* of its recommendations;
they only mean we can't rely on its *justification* for rejecting WSSS+OMAA.
We prefer a cross-regional core for a different, sound reason: **unseen-airport /
cross-region generalization** (Experiment C in its own §24) — that is the
scientific reason, not "one region."

---



## 3. Where ChatGPT overlaps our own findings (already agreed)

These appeared in `Overnight2.md` and ChatGPT independently converged on them —
treat them as settled:

1. The graph is connected (whole-edge delivery); node **count** is not the
  problem.
2. **Temporal persistence** of the same nodes is the real GNN requirement.
3. Time-of-day lumpiness is a real bias; stagger UTC windows.
4. REGIONAL slots yield ~nothing; hub tail dominates spend.
5. **Daily credit cap ≈ 1,800–1,900** is mandatory (60k/30d).
6. Tail/rotation info is the most valuable rare feature; don't sacrifice it.

---



## 4. The corrections to ChatGPT (to keep us honest)

**4.1 OMAA is not Muscat.** OMAA = Abu Dhabi Zayed Intl (AUH); OOMS = Muscat.
Its rejection of the WSSS+OMAA core leaned on "one broad region" which is
only loosely true. **We still reject WSSS+OMAA** as the permanent core, but for
the generalization reason in §7, not the geography mislabel.

**4.2 "Persistent core ≈ 40–50%" ≈ 1–2 airports in our world.** One hub
(WSSS) = ~1,325 rows/4h ≈ **~1,300 credits** of the 1,922 B0002 spend. So a
"persistent core" of 2–3 hubs consumes nearly the whole daily budget. The
correct translation of "40–50% core" under 1,900 credits/day is roughly
**one high-yield hub (cross-regional rotation every ~1–2 days) or two
moderate-yield mids.** Anything claiming 4–6 permanent hubs is unaffordable;
that's a scale mismatch in ChatGPT's recommendation, not a flaw in its
principle.

**4.3 "Expand to the whole universe" is bounded by budget *and* coverage-age.**
At one batch/day ≈ 5 airport-slots, expanding a 276-frame to ~2,000 would give
most airports a coverage-age of *many months*. That's still fine **if** we (a)
use edge-fan-out for cheap node appearance, (b) record coverage age, (c)
evaluate on unseen airports — but we must be explicit that "frame of record"
and "expensively-subscribed" are different. Keep the frame wide; spend the
budget on persistence + connectivity.

**4.4 Don't treat "~1 row ≈ 1 credit" as information per credit.** We measured
B0002 ≈ 1.0 row/credit only because nearly every notification was a new row;
updates and re-pushes cost credits too. ChatGPT's "information/credit" metric
is right — adopt it as a dashboard (§12).

---




---

## R-V3.3. Second review — ChatGptAnalaysis2 (V3.3)

## 17. The second review — claim-by-claim adjudication


| ChatGPT v2 claim                                                                      | Verdict                             | Where it lands |
| ------------------------------------------------------------------------------------- | ----------------------------------- | -------------- |
| "Don't default to 2×2h; keep 1×4h with rotating start; use 2×2h/6h as experiments"    | **Adopt — a genuine correction**    | §9, §24        |
| "A 5-airport rotation is not a persistent core — call it rotating anchor pool"        | **Adopt (terminology clarity)**     | §7, §26        |
| "Research requires state-knowable-at-T, not every-airport-every-day"                  | **Adopt — reframes the whole goal** | §17.3          |
| "Prefer a small fixed anchor + rotating pool + long-tail over a pool-of-5"            | **Adopt, budget-scaled**            | §7, §23        |
| "Don't lock KLAX/EGLL by fame; measure yield + network properties first"              | **Adopt**                           | §23            |
| "Weather is missing from the architecture (and has the same leakage rules)"           | **Adopt — the biggest addition**    | §18            |
| "Make T-24h / T-6h / T-90m separate tasks"                                            | **Adopt**                           | §19            |
| "Fix the '44% right-censored' wording; define flight-outcome states"                  | **Adopt**                           | §20            |
| "Keep the snapshot ETL as a foundational requirement"                                 | **Keep (was already ours)**         | §11/wire       |
| "Keep XGBoost baseline, ladder as a formal experiment"                                | **Adopt (already ours, formalize)** | §11model, §19  |
| "Protect the test set from sampling-design changes (regime metadata)"                 | **Adopt**                           | §21            |
| "Soften 'worldwide'; you're a probability-aware sample of the supported universe"     | **Adopt**                           | §26            |
| "Distinguish frame / directly-subscribed / edge-discovered / stale coverage"          | **Adopt**                           | §22            |
| "REGIONAL floor needs a bounded multiplier with a hard cap, not just 'reduce weight'" | **Adopt**                           | §8             |
| "Don't call the exact scheme 'industry standard'"                                     | **Adopt**                           | §26            |
| "Measure the universe first; 30 days ≠ seasons"                                       | **Adopt (already ours)**            | §6, §26        |




### 17.3 The reframe that matters most (state-knowable-at-T)

Everything ChatGPT v2 argued reduces to one principle we should operationalize:

> A flight-delay model does not need every airport every day. It needs that
> **whatever feature it consumes was knowable at the prediction moment.** A
> node's state may be a day old if that is the best we have — the feature must
> simply carry its own recency (`days_since_last_obs`, `state_timestamp`) so
> the model can *weight by freshness* and the evaluator can *measure the cost
> of staleness*.

Consequences for collection:

- **Recency is a budget decision, not a binary.** We trade credits → coverage
age. The anchor pool and rotating pools exist to keep *key* nodes' age small
at tolerable cost; the long-tail pool accepts large age by design.
- **Staleness becomes a first-class feature**, so the model can produce a
confidence/error that grows as `state_timestamp` ages — exactly what a
traveler-facing alert needs ("prediction confidence: medium; based on data
6 h old").
- **Evaluation must include a staleness curve**: error vs hours-since-last-obs,
which will tell us how much money node continuity is actually worth before we
spend more credits on a bigger anchor.




---

## R-V3.4. Third review — ChatGptAnalaysis3 (V3.4)

## 29. The third review (`ChatGptAnalaysis3.md`) — claim-by-claim adjudication

Verdict from ChatGPT3: **"V3.3 is approved conceptually (~85–90%); make these
10 corrections before the production run."** We agree with that framing — every
item below is adopted or explicitly rejected:

| ChatGPT3 claim | Verdict | Where it lands |
| ---- | ---- | ---- |
| C1 — deterministic UTC rotation & anchor rotation are **allocation schedules, not probabilities** | **Adopt — the most important correction.** Rename / stop calling them probabilities; compute joint p only on randomized layers | §10, §26, §30, §34-B |
| C2 — adaptive REGIONAL must **normalize Σp=1**, sample one, record realized p; don't multiply `1/157 × m` independently | **Adopt — replaces §8.** My V3.3 had deferred this exactly because it was unsolved; ChatGPT3 nailed the correct form | §8, §30, §34-I |
| C3 — **don't drop zero-yield airports**; keep eligible, track `zero-yield` | **Adopt.** "Quiet ≠ outside the population"; only coverage-failed leaves the frame | §6, §22, §26, §34-E |
| C4 — window experiment must be **paired/matched or crossover blocks**, else unattributable | **Adopt — genuine correction.** Naive 80/10/10 different-days confounds window shape with airports/time/weekday/weather | §24, §31, §34-D |
| C5 — record **requested vs actual window hours + stop_reason**; a capped 6h day is "up-to-6h budget-capped" not "6h" | **Adopt** | §9, §13, §24, §25, §33, §34-F |
| C6 — remove unsupported **"weather is ~40%"** number, keep the layer | **Adopt** | §18 |
| C7 — anchor selection must use a **fixed reference dataset**, not recursive sampled degree (feedback loop) | **Adopt** | §23, §34-H |
| C8 — **standardize anchor probes** (same duration/time-class/weekday), never "off-peak for A" | **Adopt** | §23 |
| C9 — add **unseen-tail** + unseen-aircraft-type evaluation | **Adopt** | §32, §34-G |
| C10 — add **calibration/uncertainty** to the eventual evaluation | **Adopt (later-phase)** | §19, §32 |
| §7 — a day-old node state must be tested (staleness curve), not assumed equal to "now" | **Adopt — exact phrasing + empirical test** | §17.3, §22 |
| §9 — verify historical weather archive coverage before promising a full layer | **Adopt** | §18.3 |
| §12 — the window design is right but needs the fixes in C4/C5 | **Adopt (superset of C4/C5)** | §24, §31 |
| §14 — V3.3's calendar is internally inconsistent (80/10/10 vs "6h+4h" days) | **Adopt — fully rewritten in V3.4** | §25, §33 |
| §15/16/17 — endogenous stratification vars need a reference period | **Adopt** | §23, §30 |
| §19 — XGBoost-first ladder is right; ask "what does GNN add beyond XGBoost?" | **Keep as-is** | §5, §19 |
| §20/21 — uncertainty & the 3 distinct generalization tests | **Adopt** | §32 |
| §23 — 1×4h/day rotating start is correct | **Keep as-is** | §9 |
| §27 — billing model validated by AeroDataBox docs; busy airport dominates budget | **Confirms our measurements** | §7, §13 |
| §29 — list of things NOT to change | **Adopt as frozen** | §35 |

### 29.1 What ChatGPT3 says is already solid (do not touch)

1×4h default, rotating UTC hours, measured universe, stratification, rotating
anchor pool terminology, **long-tail coverage floor** (V3.9-f wording — the
REGIONAL allocation is efficiency-oriented, so "coverage floor" not
"representation"; CGTAnalaysis9 §12), eventual weather,
T-24/T-6/T-90 separate tasks, `flight_events`/`flight_snapshots`/`flight_outcomes`,
`feature_timestamp <= prediction_cutoff`, aircraft-chain features, XGBoost-first
ladder, coverage-age, info-per-credit, future-time + unseen-airport +
cross-region evaluation, 30-day ≠ seasonality. (§35 keeps the full list.)

### 29.2 The reframe that closes the loop (§32 of ChatGPT3)

The original fear — "are we rotating airports and causing the GNN to miss
patterns?" — is superseded. The design that matters now is: **breadth +
recency + aircraft continuity + network continuity + time coverage + weather +
leakage control + future/unseen evaluation.** That is what we now enforce.

---


---

## R-V3.5. Fourth review — ChatGptAnalaysis4 + frozen list (V3.5)

## 36. Fourth-review adjudication (ChatGPT4 `ChatGptAnalaysis4.md`, 1,305 lines)

Verdict received: **"yes, with the four changes below"** — the conceptual
design is ~90–95% right. None of the four requires a re-design; all four are
corrections to reported framing and sharpened objectives. This table records
each and where it landed (WDS = "what the fourth review changed" above):

| # | Change requested | Adopt? | Where it lands | Non-goal (what we explicitly did NOT change) |
| ---- | ---- | ---- | ---- | ---- |
| 1 | Don't treat `airport_layer_design_probability` as a per-flight inclusion probability; don't stamp `1/p` on rows | **Adopt (WDS-1)** | §10, §30.2b, §34-I, §37 | We KEEP `airport_layer_design_probability` as airport-layer metadata and keep the REGIONAL normalized draw |
| 2 | Balanced RANDOMIZED window schedule instead of strict cycle; record seeds | **Adopt (WDS-2)** | §9, §25, §30.1, §34-J, §39 | We KEEP one continuous 4h default (chain continuity) and keep 2×2h/6h as matched experiments |
| 3 | Add a "future representative" primary test + disruption stress test; adopt train/val/test/stress | **Adopt (WDS-3)** | §32, §34-G | The earlier unseen-airport/region/tail engines B–D stay; they're complementary, not replaced |
| 4 | Final objective = marginal predictive value per credit, not coverage alone | **Adopt (WDS-4)** | §12, §16, §38 | Coverage/info-per-credit stays as the daily steering diagnostics, subservient to Δmodel/Δcredits |

Two honest boundaries requested by the review and accepted: (i) **credits are
fixed** — no allocation increase for the marginal-value study; the learning
curve is fit on what the 60k buys, and (ii) **we don't claim a clean
probability sample of flights**, only of airports via the randomized REGIONAL
layer. Both are encoded above.

## 35. What we would NOT change (frozen; ChatGPT3 §29, confirmed by our data)

```
1 × 4h default                rotating UTC hours     measured universe
stratification                rotating anchor pool   bounded long-tail
eventual weather              T-24/T-6/T-90 tasks    flight_events/snapshots/outcomes
feature_timestamp ≤ cutoff    aircraft-chain feats   XGBoost-first ladder
coverage-age                  info-per-credit        future-time evaluation
unseen-airport evaluation     cross-region eval      30-day ≠ seasonality
```

These are grounded in both the research ChatGPT3 cites (Aeolus NeurIPS 2025;
DS-MGCSTNet; multi-horizon U.S. network study; FlightSense rotation+weather;
delay-absorption CatBoost/XGBoost) **and** our measured B0001/B0002 numbers.
The remaining open items are empirical, not design: universe size, realized
REGIONAL p, standardized anchor yields, and the 2×2h-vs-4h-vs-6h decision —
all scheduled for measurement in the first month (§25, §27.3).

**Frozen addenda — adopted verbatim from ChatGPT4 §9/Verdict so nothing is
"lost in translation":**

- "Some flights will never appear exactly once" → we do **not** pretend a
  clean per-flight sampling probability exists; `flight_capture_flags` + NULL
  `sampling_weight` is the honest encoding (§10, §30.2b).
- "A balanced randomized schedule is better than a fixed schedule" → adopted
  for UTC windows and anchor order; balance is preserved the same way the old
  fixed cycle had it (each slot once per 6 days) but weekday alignment is
  de-correlated (§9, §25, §39).
- "The future-representative test is the primary deployment metric" and
  "train/val/test/stress" → Engine A primary + Engine E stress, both in §32.
- "Marginal value per credit is the final optimization objective" → the §12
  diagnostics are upgraded; the collection's worth is judged by Δmodel per
  Δcredits on Engine A, fitted as a learning curve (§12, §38).
- "Weather backfill must be verified, not assumed" → aviationweather.gov
  normal API ≈ 15-day depth; weather layer completeness is gated on a real
  archive-coverage test (§18, §40).
- "Balance the schedule at the `weekday × UTC block` level, not just per
  6-day block" (CGTAnalaysis5 §2) → run-level schedule table + **constrained
  randomized allocation minimizing (weekday × UTC-block) imbalance** (42 cells
  vs 31 starts — minimize Σ(n_c−n̄)²; V3.7 correction CGTAnalaysis6 §8)
  (§9, §25).
- "A single short probe must not dominate anchor selection" (CGTAnalaysis5
  §16) → pre-specified 40/20/20/20 score; probe is one weighted feature (§23).
- "Diversion needs reliable evidence, not a changed operational field"
  (CGTAnalaysis5 §14) → `original_scheduled_destination` /
  `current_operational_destination` / `actual_destination` / `diversion_flag`
  (§20).
- "One empty observation is not evidence" (CGTAnalaysis5 §15) → zero-yield
  triage `once/repeated/persistent`; only persistent feeds adaptation (§8, §22).
- "Don't cross every stratifying dimension into every cell" (CGTAnalaysis5
  §17) → primary strata `traffic tier × macro-region`, the rest as balancing
  variables (§6).
- "Weather sources have no AeroDataBox credit cost, but retrieval/storage/
  archive are separate engineering constraints" (CGTAnalaysis5 §6) → exact
  wording adopted (§18, §40).

---


---

## R-V3.6. Fifth review / pre-run lock — CGTAnalaysis5 + approved defaults (V3.6)

## 41. V3.6 pre-run lock (CGTAnalaysis5 `AugMDnotes/CGTAnalaysis5.md`, 1,357 lines)

**Verdict received:** *"V3.5 is genuinely on the right path — the architecture
is now scientifically defensible; the remaining issues are experimental-design
and statistical-identification issues, not fundamental problems."* Per its own
recommendation we do NOT rewrite; we lock the six changes below, freeze the
collection schema, and start coverage/anchor measurement.

### 41.1 The sixth review — claim-by-claim adjudication

| CGTAnalaysis5 claim | Verdict | Where it lands |
| ---- | ---- | ---- |
| "The 1/p correction is now right — keep `airport_design_probability` as airport-layer metadata" | **Keep (already ours)** | §10, §30.2b, §37 |
| "Rename to `airport_layer_design_probability` so it can't be misused later" | **Adopt (Change A)** | §10, §30.1, §30.2b, §37 |
| "Balance over weekday × UTC block, not just 6-day blocks" | **Adopt — corrected to "constrained randomized allocation" (V3.7)** | §9, §25 |
| "Elevate tail-chain tracking: 3-leg, 4+ leg chains, chain completeness" | **Adopt (add to dashboard)** | §12, §24 |
| "GNN question = what does a graph add beyond strong tabular features" | **Keep (already ours)** | §19, §39 |
| "Make aircraft/flight-chain an explicit graph edge type (multi-relational graph)" | **Adopt (secondary)** | §19, §39 |
| "Weather 'free' → 'no AeroDataBox credit cost; retrieval/storage/archive are separate engineering constraints'" | **Adopt (secondary)** | §18, §40 |
| "Don't freeze three separate models; test shared `horizon_hours` conditioning" | **Adopt (secondary)** | §19 |
| "Engine A: use rolling-origin evaluation, report mean/std/P10/P50/P90" | **Adopt (secondary)** | §32 |
| "Window experiment is MATCHED, not 'only window shape differs'; make randomized crossover the preferred design" | **Adopt (Change B)** | §24, §31, §16 |
| "6h experiment = 'under a fixed 1,900-credit budget, which regime maximizes predictive information?' — up-to-6h is a legitimate allocation regime" | **Adopt (Change B)** | §31.2, §24 |
| "Marginal value: split feature contribution vs collection marginal value (real collection interventions)" | **Adopt (Change F)** | §12, §38 |
| "Learning curve: remove 100k — impossible under 60k credits; fit only inside observed domain" | **Adopt (Change C)** | §12, §38 |
| "Add Model −1: naive operational persistence baseline" | **Adopt (Change E)** | §19, §39, §14 |
| "Diversion needs reliable evidence; keep 4 distinct destination fields" | **Adopt (secondary)** | §20 |
| "Zero-yield: distinguish once / repeated / persistent" | **Adopt (secondary)** | §8, §22 |
| "Anchor probe must not dominate; pre-specified 40/20/20/20 score" | **Adopt (secondary)** | §23 |
| "Avoid exploding strata; primary strata = traffic tier × macro-region + balancing variables" | **Adopt (secondary)** | §6 |
| "Keep restrained 'worldwide' language" | **Keep (already ours)** | §26 |
| "XGBoost-first ladder is well-supported by 2025–2026 graph-vs-tree studies" | **Keep (already ours)** | §19 |
| "Calibration/uncertainty is essential for Travnr" | **Keep (already ours)** | §32, §19 |
| "Add clustered/blocked evaluation: whole day / whole event / whole tail in one split" | **Adopt (Change D)** | §21, §32 |
| "Don't estimate 'true disruption frequency' from 30 days; report observed + external info" | **Adopt (secondary)** | §32 |
| "Month-1 goal: validated pipelines + XGBoost baseline + info-per-credit + first generalization results; GNN = next phase" | **Adopt (secondary)** | §14, §24, §16 |

### 41.2 The six changes that define V3.6

| # | Change | Status | Code/home |
| ---- | ---- | ---- | ---- |
| A | `airport_layer_design_probability` everywhere (namespace = airport-layer only; never a flight weight) | **Adopt** | §10, §30, §34-C/I |
| B | Randomized crossover = preferred window experiment; matched pair = fallback; 6h day = allocation-regime question under fixed 1,900 budget | **Adopt** | §31.2, §24, §16-8 |
| C | Learning curve inside the observed domain: 2k→~58k cumulative; no 100k; extrapolation labeled | **Adopt** | §12, §38 |
| D | Clustered/blocked evaluation: `group_by` (tail / event / calendar-day / airport / region) never splits a group across a boundary | **Adopt** | §32 |
| E | Model −1 naive persistence baseline; every ML model must clear it | **Adopt** | §19, §39, §14 |
| F | Feature contribution (ablation) vs collection marginal value (real interventions) split, never conflated | **Adopt** | §12, §38 |

### 41.3 What we deliberately did NOT change (locked by this review)

- The **1×4h default window**, the seeded balanced UTC permutation, and the
  2×2h/6h experiments (they stay; only the experimental *design* changed to
  crossover-first).
- The **five-engine evaluation family** A–E (B–D complement the new
  clustering/rolling-origin work; nothing was removed).
- The **60,000-credit budget and 1,900/day cap** — fixed; marginal-value and
  learning-curve claims are constrained by it (that is the point, §38).
- **REGIONAL normalized draw, zero-yield retention, anchor-vs-rotation, the
  model ladder, weather architecture, cutoff/leakage rules** — all confirmed
  as already correct by this review and left intact.
- **"Worldwide" language discipline** and the thesis statement (§26).

### 41.4 Pre-run lock checklist (the freeze)

After these land in code (§34 A–O) and the §27.1 gates pass,
**the collection schema is frozen** — no further design review; the remaining
work is empirical (universe size, realized REGIONAL p, standardized anchor
yields, 2×2h-vs-4h-vs-6h decision, Model −1 vs Model 1). Items to land before
the run:

1. `airport_layer_design_probability` rename + `flight_capture_flags` (A).
2. Crossover-first scheduler with `crossover_group`/`period` and the
   **constrained-randomization** schedule table `(weekday, UTC_block,
   airport_region, local_time_bin, window_shape)` minimizing cell imbalance
   (B + §9/§25).
3. Zero-yield triage `once/repeated/persistent` (secondary).
4. Anchor score = pre-specified 40/20/20/20 (secondary).
5. Eval harness: five engines + clustering `group_by` + rolling-origin + Model
   −1 + observed-disruption-frequency (D, E + §32).
6. Diagnostics dashboard: tail-chain depth (3-leg / 4+-leg / completeness),
   intervention-family marginal value, learning curve at cumulative sizes (C,
   F + §12).

Status per this review: **architecture and collection philosophy APPROVED;
exact 1:2:1 allocation and the 5-airport anchor pool flagged MEASURE FIRST
(yellow), not design errors.** We begin with coverage measurement
(`npm run coverage`) and standardized anchor probing.

---

## 16. Approved defaults (V3.6 — say "Go" on the updated set)

You said you weren't sure what to choose. Here are the recommended answers,
each with the one-line reason. **"Go"** accepts all of them (incl. the V3.4
corrections, the four V3.5 changes, and the six V3.6 changes); change any
single one if you disagree.

| # | Decision | Recommended default | Why |
| ---- | ---- | ---- | ---- |
| 1 | Window shape | **1 × 4h/day, UTC start from a seeded balanced permutation** of `{00,04,08,12,16,20}` (`time_window_schedule_seed`), **run-level constrained randomization minimizing (weekday × UTC-block) imbalance** (§9, §25); 2×2h & 6h only as **crossover PILOT experiments** (~10% each, month-1) | Preserves chain continuity, fixes time bias, removes weekday↔UTC correlation; honest about what 31 days can actually balance (§9, §31) |
| 2 | Anchor | **Rotating anchor pool of 5 cross-region hubs** (`KLAX,EGLL,WSSS,SBGR,OMDB` provisional), 1/day, no-repeat-until-all, **order randomized via `anchor_pool_seed`**; choose via a **pre-specified score** (40% traffic / 20% geo / 20% carrier / 20% standardized yield) on a **fixed reference dataset** (§23) | Pool gives coverage-age ≤ ~5 d; probe can't dominate the score; avoids the sample→degree→pick feedback loop |
| 3 | Frame | **Build from the measured AeroDataBox universe → feed eligibility → frame.** Primary strata = **traffic tier × macro-region**; other dimensions are balancing variables. Zero-yield airports stay eligible (`zero-yield`), never dropped (§6, §22) | Frame = what we can actually subscribe; quiet ≠ outside the population; controlled stratification without exploding cells |
| 4 | Tier mix | **{HUB:1, MID:2, REGIONAL:1}**; REGIONAL uses the **normalized** yield-aware rule (Σp=1, hard cap; boots after probe) | Long-tail representation without wasted spend or a broken probability model |
| 5 | Daily cap | **1,900 credits/day, enforced in code** (done in V3.3 §28) | 60,000/31; uncapped burns in ~3–5 days |
| 6 | Metadata | **Design-probability vs allocation-schedule naming** (§10); realized p only for the airport layer, named **`airport_layer_design_probability`** (V3.6); **no auto `1/p` flight weight** — `flight_capture_flags`; `window_shape`, `requested/actual_window_hours`, `stop_reason`, `sampling_reason`, `days_since_last_obs`, `time_window_schedule_seed` | Honest, replayable, regime-testable; the name can never be mistaken for a flight-level probability |
| 7 | Health check | Gate mixture on **subscriptions** (done); add zero-yield **triage** (`once/repeated/persistent`) so quiet REGIONALs never false-FAIL | REGIONAL (~1 row) must not trip a FAIL; one empty obs ≠ evidence |
| 8 | Experiments | Window-shape days use **randomized crossover blocks as the preferred design** (matched pairs only as fallback); never interpret a budget-capped 6h day as "6h" — the 6h day is an allocation-regime question under the fixed 1,900 budget; **month-1 window results are PILOT evidence** that gates a larger Month-2 study, not a statistical verdict | Crossover removes stable day-effects (environment still varies); 3×2×2h+2×6h can't establish a winner (§31) |
| 9 | Evaluation (long-run) | **Five engines A–E** (A future-representative PRIMARY, **with rolling-origin + observed disruption frequency**); **clustered/blocked splits** (whole day, whole event, whole tail stay together); **Model −1 persistence gate** below XGBoost; three-horizon vs shared-model is an experiment | Deployment, generalization, and stress claims are each airtight (§32, §19) |
| 10 | Implementation | Week 0 (done): health fix, coverage script, daily cap, anchor + rotating window; Week 1: catalog builder, prob-naming migration, zero-yield tracker, crossover scheduler; **+ V3.5/V3.6: five-engine harness, blocked splits, Model −1 baseline, intervention-style marginal-value tracker** | Incremental, no rewrite |

**Confirm to proceed:** after you say *Go*, I implement exactly this order:
(1) coverage measurement on Replit (`npm run coverage`), (2) catalog-universe
builder, (3) V3.4 metadata migration (probability naming + requested/actual
window + zero-yield), (4) paired window-experiment scheduler + region yield
tracker, (5) deploy env knobs, (6) V3.5 additions: seeded balanced UTC/anchor
schedules, `flight_capture_flags` + 1/p retraction, five-engine eval harness,
(7) V3.6 additions: `airport_layer_design_probability` rename, crossover-first
scheduler, weekday×UTC balance table, Model −1 baseline, blocked-split eval,
zero-yield triage, pre-specified anchor score. Code for §34 (A–J) + §41.

Everything above is grounded in our measured numbers; numbers that are
estimates (anchor yields, universeCount, realized REGIONAL p) are flagged
"measure next" so we don't pretend precision we don't have.

---


## R-V3.7. Sixth review / frozen — CGTAnalaysis6 (V3.7)

## 42. V3.7 change summary (CGTAnalaysis6 `AugMDnotes/CGTAnalaysis6.md`)

**Verdict received:** the V3.6 package is correct in structure; the remaining
corrections are about **language discipline** (never claim more than the design
supports), **pilot vs conclusive evidence**, and **constraining claims to the
engine/test that earned them**. Per the same rule as §41 we do NOT rewrite; we
lock the four changes below, and the collection schema stays frozen (no new
columns, no new endpoints).

### 42.1 The seventh review — claim-by-claim adjudication

| CGTAnalaysis6 claim | Verdict | Where it lands |
| ---- | ---- | ---- |
| "31 starts cannot balance 42 weekday×UTC cells — drop 'balanced', use constrained randomized allocation minimizing imbalance (Σ(n_c−n̄)²)" | **Adopt (Change A)** | §9, §25, §16-1, §34-J, §41.4 |
| "Engine E = disruption, Engine A = ordinary; persistence must be beaten per engine — an Engine-A miss blocks only general-deployment claims" | **Adopt (Change B)** | §14, §16-8, §19, §32, §39, §41.1 |
| "Month-1 window experiment is PILOT evidence gating a properly-sized Month-2 study; no default switch on month-1 data alone" | **Adopt (Change C)** | §24, §31.2, §33, §16-8 |
| "Crossover doesn't make the operating environment identical — record marginal environmental context (weather severity, ATC delay program, storm-track lines) on batch + observation rows" | **Adopt (Change D)** | §31.3, §31.2, §16-8 |
| "Learning curve should carry credits AND unique flights alongside rows" | **Adopt (secondary)** | §38 |
| "Persist/disrupt labels as feature+label inputs" | **Adopt (secondary)** | §30, §32 |
| "Record full realized-window bounds in time_windows (3.1h ≠ 6h)" | **Adopt (secondary)** | §16-8, §31.2, §13 |
| "Don't report cross-engine or cross-design aggregated numbers (Engine A is not Engine E)" | **Adopt (secondary)** | §39, §26 |

### 42.2 The four changes that define V3.7

| # | Change | Status | Code/home |
| ---- | ---- | ---- | ---- |
| A | Run-level **constrained randomized allocation** minimizing `(weekday × UTC_block)` imbalance (Σ(n_c−n̄)²; optional `airport_region`, `local_time_bin`); word it "constrained randomized allocation", never "balanced at the weekday×UTC level" | **Adopt** | §9, §25, §34-J |
| B | **Engine-specific persistence gate**: Model −1 per engine; Engine-A miss blocks only *general-deployment* claims, never disruption use; report every ladder model on A AND E | **Adopt** | §14, §19, §32, §39 |
| C | Month-1 window experiment = **pilot evidence**; gates a properly-sized Month-2 controlled study; no default switch on month-1 data alone | **Adopt** | §24, §31.2, §33 |
| D | Crossover periods record **marginal environmental context** (weather severity, ATC delay program, storm-track lines) on batch + observation rows | **Adopt** | §31.3, §16-8 |

### 42.3 What we deliberately did NOT change (locked by this review)

- **The four fixed designs from V3.5/V3.6**: 1×4h default window with seeded
  UTC permutation, randomized crossover-first window experiments, the
  five-engine evaluation family A–E, and the 60,000-credit budget.
- **The frozen schema** (§41.4) — V3.7 adds zero new columns and zero new
  endpoints; every V3.7 change is a scheduler/eval/reporting instruction.
- **The model ladder, weather architecture, REGIONAL draw, zero-yield
  retention, cutoff/leakage rules, §26 language discipline** — all reconfirmed
  and left intact.
- **The claim structure itself**: "constrained randomized allocation" and
  "pilot evidence" are not new science — they are the V3.7 requirement to never
  state more than the run can actually deliver.

### 42.4 What ships with V3.7 (before the run)

1. Scheduler: constrained randomized allocation + seeded replay (A, §34-J).
2. Eval harness: persistence reported per engine; ladder models tagged with the
   engine they clear (B, §32/§39).
3. Window experiment: pilot flag on all month-1 window outputs; Month-2 gate
   pre-specified (C, §24/§31.2).
4. Crossover periods: marginal environmental context fields on batch +
   observation rows (D, §31.3).

Status per this review: **collection remains APPROVED and the schema stays
frozen.** V3.7 is the language-and-claims tightening pass applied on top of the
already-locked V3.6 design.

---


---

## R-V3.8. Seventh review — CGTAnalaysis7 (V3.8)

## 43. V3.8 change summary (CGTAnalaysis7 `AugMDnotes/CGTAnalaysis7.md`)

**Verdict received:** *"V3.7 is now genuinely on the right path … a
scientifically defensible pre-run design, with four small lock corrections —
not a design needing another rewrite."* We **agree with all four** (each was
verified against our document — see the "what we checked" column), and we add
**two credit-accounting holes ChatGPT did not flag** but which are real in our
code (`maxDeliveryRetries: 2` breaks the "1 row ≈ 1 credit" identity; the
units-vs-credits dual billing system is absent from the credit plan). Per the
established rule we do NOT rewrite; we lock the changes below and proceed to
measurement — the 60k run's unknowns (universe size, anchor yields, 2×2h-vs-4h,
marginal value) are empirical, not design.

### 43.1 The eighth review — claim-by-claim adjudication

| CGTAnalaysis7 claim | What we checked | Verdict | Where it lands |
| ---- | ---- | ---- | ---- |
| "Calendar arithmetic is wrong: 26 × 4h + 3 × 2×2h + 2 × 6h = 31 days ≈ 84%/10%/6%, not 24…77%" | Counted the §25 table: 5+4+2+6+7+2 = **26 four-hour days** | **Correct — FIXED** | §25, §43-A |
| "Hard 1,900/day cap contradicts 'storm-day overspend'; the 1,100 is a monthly reserve, unusable while the cap is active" | §13/§25 said "buffer for storm overspend"; code enforces the cap at start (`startBatchInner`, §28) | **Correct — FIXED** | §13, §25, §27.2, §33, §43-B |
| "`airport_layer_design_probability` = conditional design probability given frame + adaptive state immediately before the draw, not 'realized inclusion probability'" | §8/§10/§30 used "realized"; the adaptive rule makes p history-dependent | **Correct — FIXED** | §8, §10, §30.1, §30.2, §34-C, §43-C |
| "Adaptive REGIONAL is an efficiency-oriented allocation, not a representation-preserving probability sample — say so" | §8 lacked the explicit sentence; §30.2 called the adaptive rule "honest" without the efficiency caveat | **Correct — FIXED** | §8, §30.2, §43-C |
| "Scheduler: make hard vs soft constraints explicit; never sacrifice a hard constraint for the balance objective" | §9/§25 described balance but no hierarchy | **Correct — FIXED** | §9, §34-J, §43-D |
| "Crossover needs a treatment-unit definition (unit = matched airport-set / crossover block, not flights)" | §31.2 defined blocks but not the unit | **Correct — FIXED** | §31.2, §34-P |
| "Engine-A historical tail features must be constructible-at-cutoff (a unit test in the snapshot builder)" | §32 allowed tails in train+test but lacked the derived-feature guard | **Correct — FIXED** | §32, §34-P |
| "Don't let the final representative test become the training set for the collection strategy (dev → validation → untouched test)" | §38 read marginal value "on Engine A" with no test protection | **Correct — FIXED** | §32, §38, §43-F |
| "§27.1 strata wording conflicts with V3.7 primary strata (traffic tier × macro-region + balancing variables)" | §27.1/§15 still said "traffic × continent × intl × carrier × tz" | **Correct — FIXED** | §27.1, §15 |
| "`airport_layer_design_probability` should be enforced NOT NULL only when `is_randomized` (DB check constraint)" | §10 documented the rule but no enforcement | **Correct — FIXED** | §10, §34-P |
| "Label rolling-origin on 31 days as 'early pilot', not robust seasonal validation" | §32 called it rolling-origin without the pilot label | **Correct — FIXED** | §32 |
| "Tighten 'Sampling probabilities are recorded to allow sampling-aware training…' to a harder-to-misuse sentence" | §10/§26 carried the old ChatGPT2 sentence | **Correct — FIXED** | §10, §26 |
| "Weather: 'No extra to pay' → 'No AeroDataBox credit cost'" | §18.3 said "nothing extra to pay" | **Correct — FIXED** | §18.3, §40 |
| "Marginal value: use paired/repeated interventions to observe diminishing returns MV₁ > MV₂ > MV₃…" | §38 had a single-intervention sketch | **Correct — FIXED (analysis protocol only)** | §38 |
| "Mine" — **delivery retries break "1 row ≈ 1 credit"**: `maxDeliveryRetries: 2` in code, each retry = 1 credit, but cap/budget count rows (de-dup keeps rows=1) → real spend can be up to 3× rows | read `adbCollectionController_v3.ts:443` + `aerodataboxLimiter_v3.ts` + `creditsUsedTodayUtc()` | **GAP — FIXED** | §13, §28, §43-E |
| "Mine" — **units vs credits dual billing is absent from the credit plan**: the 60k refill converts RapidAPI units→credits; rescore/simulate/"Rescore all" burn the SAME units during the run | `V3_WebhookExtractionPlan.md` Finding 2 (24,073 units from manual UI) | **GAP — FIXED** | §13, §28, §43-E |

Everything else in CGTAnalaysis7 (engine-specific blocking, constrained UTC
allocation, crossover-as-pilot, GNN-vs-tabular caution, weather architecture,
persistence baseline, marginal-value split, 1:2:1 stays yellow) is a
**confirmation of what we already locked**. No re-adjudication needed
(CGTAnalaysis7 §6, §8, §10, §13, §14, §16–§18, §25).

### 43.2 The changes that define V3.8

| # | Change | Status | Code/home |
| ---- | ---- | ---- | ---- |
| A | Calendar corrected to **26 × 4h + 3 × 2×2h + 2 × 6h ≈ 84% / 10% / 6%** | Adopt | §25, §33 |
| B | **1,100 = monthly reserve**; hard cap stands; overspend language removed; explicit `ADB_EXCEPTION_DAY_BUDGET` if ever needed | Adopt | §13, §25, §27.2 |
| C | `airport_layer_design_probability` = **conditional design probability at the draw**; adaptive REGIONAL labeled efficiency-oriented | Adopt | §8, §10, §30 |
| D | Scheduler **hard/soft constraint hierarchy** explicit; never sacrifice hard for soft | Adopt | §9, §34-J |
| E | **Credit accounting closed**: `maxDeliveryRetries=0` during the run; units-vs-credits track written into §13; missing knobs documented; `ADB_RESERVE_CREDITS=1000` ≠ 1,100 remainder | Adopt | §13, §28, §34-P |
| F | **Engine-A test protected**: collection-policy tuning → validation cut; untouched test read once for the deployment claim | Adopt | §32, §38 |

### 43.3 What we deliberately did NOT change (locked by this review)

- **The fixed designs**: 1×4h default window with seeded UTC permutation,
  crossover-first window experiments, the five-engine evaluation family A–E,
  engine-specific blocking, and the 60,000-credit budget / 1,900/day cap.
- **The frozen schema** (§41.4) — V3.8 adds no new *data* columns; the only
  code deltas are the `maxDeliveryRetries=0` subscription option, the
  `is_randomized → NOT NULL` check constraint, and the crossover
  `unit_type` tag (an existing row's value, not a new table).
- **The core research question** from §26 stands: *"under a fixed
  aviation-data acquisition budget, how much airport breadth, temporal
  recency, aircraft-chain continuity, network coverage, and weather are worth
  in future flight-delay prediction?"* — as ChatGPT puts it, this is the
  strongest version of the contribution (CGTAnalaysis7 §28).
- **A V3.9 review cycle is not requested.** CGTAnalaysis7 itself says "I would
  not start another V3.8 review cycle" — the design is locked; the unknowns
  are measured, not theorized (CGTAnalaysis7 §27–§28).

### 43.4 What ships with V3.8 (before the run)

1. Scheduler: hard/soft constraint hierarchy + a "hard-constraint violation →
   hard error" test (D, §9/§34-J).
2. Collection subscriptions: `maxDeliveryRetries=0`; DB check constraint for
   `airport_layer_design_probability` vs `planned_share` (E, §13/§34-P).
3. Credit plan: units-vs-credits table + "no Rescore all / simulate during the
   run" guard, with `ADB_RESERVE_CREDITS` / `ADB_ALERT_MIN_BALANCE` /
   `ADB_MIN_BATCH_CREDITS` documented (E, §13/§28).
4. Eval harness: Engine-A validation/test split protecting the final test;
   constructible-at-cutoff unit test in the snapshot builder; rolling-origin
   reported as "early pilot" (F, §32/§34-P).
5. Crossover rows: `unit_type='airport_set_block'` treatment-unit tag (D/§31.2).
6. Docs: §25 "84/10/6", §13 reserve wording, §8/§30 conditional-probability
   wording, §27.1/§15 strata wording (A–C).

Status per this review: **V3.8 is the final pre-run specification.
Architecture, philosophy, and credit accounting are all APPROVED; the schema
is frozen; the calendar is internally consistent; the claims match what the
code enforces.** From here: run `npm run coverage`, probe anchors, and let the
60k run answer the empirical questions.

---


---

## R-V3.9. Eighth review / preflight — CGTAnalaysis8 (V3.9)

## 44. V3.9 preflight & canary-gate lock (CGTAnalaysis8 `AugMDnotes/CGTAnalaysis8.md`)

**Verdict received:** *"V3.8 is much better… Architecture 98%, experimental
design 96–98%, statistical/evaluation 95%, credit-accounting implementation
90–95% until verified in code. Do NOT go back and invent V3.9. Proceed with
implementation + verification gates, then run a tiny live canary before
committing the 60k."* We agree: **the design is correct; the one real remaining
flaw is that the credit accounting is specified but not yet implemented to
match** (dedupe/updates consume credits without new rows). V3.9 is therefore a
**preflight lock**, not a redesign — it closes the accounting gap, fixes the
small wording/ambiguity items, and turns the run's start into five verifiable
gates.

### 44.1 The ninth review — claim-by-claim adjudication

| CGTAnalaysis8 claim | What we checked | Verdict | Where it lands |
| ---- | ---- | ---- | ---- |
| "V3.8 still says '1 row ≈ 1 credit' — wrong even with retries=0: a duplicate/update delivery consumes a credit but creates 0 new rows" | `flightDataPrePostStore_v3.ts` uses `ON CONFLICT (dedup_key) DO UPDATE`; `creditsUsedTodayUtc()`/`estimateBatchCredits()` count rows; `UpsertResult` already separates `stored/inserted/updated` | **Correct — GAP CLOSED** | §13, §34-Q, §44-A |
| "Track three quantities: notification_items_received, credits_actually_consumed (balance delta = source of truth), unique rows created/updated" | Each row already stamps `credits_remaining`; `getBalance()` is already called at start + heartbeat — raw material exists | **Correct — FIXED (spec)** | §13, §44-A |
| "`maxDeliveryRetries=0` is legitimate but trades delivery protection; require failure rate = 0 else pause" | AeroDataBox default is no retries; retries are optional; no delivery-failure gate existed | **Correct — FIXED** | §27.1 gate 10, §44-C |
| "Actual Flight Alert balance must be authoritative; C_actual = B_before − B_after; |C_actual − C_internal| ≈ 0 in canary" | Controller reads balance at start but doesn't persist before/after or reconcile | **Correct — FIXED (spec)** | §13, §27.1 gate 9, §34-Q |
| "Separate budget reservation from actual spend: daily_budget_remaining = 1900 − actual spend, not − rows" | `creditsUsedTodayUtc()` = row count; cap math uses rows | **Correct — FIXED (spec)** | §13, §44-B |
| "Two reserves are ambiguous (1,100 remainder vs 1,000 safety reserve); name them explicitly" | §13 documents both but without the explicit distinction sentence | **Correct — FIXED** | §13, §44-D |
| "§14 still says '30-day' — the calendar is 31 days" | §14 header + §15 checklist said 30-day | **Correct — FIXED** | §14, §15 |
| "6-day UTC rule and weekday×UTC minimization must be hierarchical (hard/soft)" | §25 stated both but not their ordering | **Correct — FIXED** | §25, §44-F |
| "Anchor '20% observed yield' must not be raw rows/hour — define f(unique flights/credit, chain links/credit, stability)" | §23 listed rows/credit + chain links but the score's yield component was undefined | **Correct — FIXED** | §23, §44-G |
| "Final Engine-A test: materialize once, hash/version, read-only" | §32 had the untouched-test rule but no materialization guard | **Correct — FIXED** | §32, §44-H |
| "Proceed via gates: coverage → anchor probe → credit canary → webhook reliability → 31-day run" | §27.1 had 8 gates but no canary / no delivery-failure gate | **Correct — FIXED** | §27.1 gates 9–10, §44 |
| Confirmations: REGIONAL conditional-probability logic, Engine A design, tail unit test, weather architecture, model ladder, "measure-first" for 1:2:1 / 4h / anchors / budget / GNN | Verified against §8, §30, §32, §40, §19, §16 | **Confirmed — no change** | — |

### 44.2 The changes that define V3.9

| # | Change | Status | Code/home |
| ---- | ---- | ---- | ---- |
| A | **Three-quantity credit accounting**: `notification_items_received`, `credits_actually_consumed` (balance delta — authoritative), `unique_flight_rows_created_or_updated`; "1 row ≈ 1 credit" retracted | Adopt | §13, §34-Q |
| B | **Daily cap = reservation vs actual spend**: `1900 − credits_actually_consumed_today`, not rows | Adopt | §13, §34-Q |
| C | **Delivery-failure hard gate**: failure rate > 0 → pause the run; monitor HTTP error / timeout / non-2xx / missing sequence | Adopt | §27.1 gate 10 |
| D | **Reserve nomenclature**: monthly remainder 1,100 vs application safety reserve 1,000 (controller refuses below 1,000 unless overridden) | Adopt | §13 |
| E | **31-day naming** everywhere it's a calendar reference | Adopt | §14, §15 |
| F | **Scheduler hierarchy explicit**: 6-day "each UTC slot once" = HARD; weekday×UTC imbalance = SOFT among valid permutations | Adopt | §25, §9 |
| G | **Anchor yield defined pre-probe**: `yield_score = f(unique_flights/credit, chain-links/credit, stability)` standardized to [0,1]; station/API capacity = separate feasibility gate, not a yield component (CGTAnalaysis9 §10); formula frozen in code | Adopt | §23, §34-Q |
| H | **Final Engine-A test materialized once, hashed, read-only** (hash mismatch → hard error) | Adopt | §32, §34-Q |

### 44.3 The five preflight gates (start of the 60k is gated on ALL of these)

| Gate | Action | Pass criterion |
| ---- | ---- | ---- |
| **1 — Coverage** | `npm run coverage` | `universeCount`, `catalogInUniverse` recorded, sane (universe ≥ catalog) |
| **2 — Anchor probe** | standardized probes (§23) | scores computed with the frozen formula; pool NOT locked before measurement |
| **3 — Credit canary** | one tiny controlled batch; record balance-before/after, items, unique/updated/duplicate rows, delivery failures, C_external, C_internal | `|C_external − C_internal| ≈ 0` within tolerance (§13, §27.1 gate 9) |
| **4 — Webhook reliability** | confirm delivery failures = 0, unexpected retries = 0, daily cap correct, second-start protection correct | all zero/verified (§27.1 gate 10) |
| **5 — 31-day run** | only after 1–4 green | start the §25 calendar |

### 44.4 What we deliberately did NOT change (locked by this review)

- **No architecture change.** CGTAnalaysis8 is explicit: *"I would not ask the
  AI agent to create V3.9… Do not go back and invent V3.9."* This section is
  the preflight/canary lock, not a new design.
- **1:2:1 allocation, 1×4h default, the five-airport anchor pool, the 60,000
  credit budget, the model ladder, the five-engine evaluation family** — all
  remain **measure-first** (§16, §23, §19, §32). No theory-driven changes.
- **REGIONAL conditional-probability wording (§8), Engine A/B/D blocking
  (§32), the constructible-at-cutoff unit test (§32), weather architecture
  (§18/§40)** — reconfirmed correct, untouched.
- **The frozen schema** (§41.4) — V3.9 adds only accounting/metadata columns on
  `adb_collection_batches` (balance before/after, consumed, upsert counts) and
  a canary script; no collection-behavior columns change.

Status per this review: **are we correctly OK? Yes — the design is right and
frozen (~95–98% by CGTAnalaysis8's own scoring). The remaining 2–5% is
implementation verification, not design: the credit accounting must be
implemented as specified (§34-Q), gates 1–4 must pass, and only then does the
60k run start (gate 5). We do not begin spending meaningful quota until the
canary reconciles `C_external = C_internal`.**

---


---

## R-V3.9f. Ninth review close-out — CGTAnalaysis9 (V3.9-f)

## 45. Final preflight — CGTAnalaysis9 close-out (the LAST revision; deliberately NOT V3.10)

**CGTAnalaysis9** (`AugMDnotes/CGTAnalaysis9.md`, 661 lines) verdict: *"V3.9 is
now very close. Proceed to implementation and preflight. Do not proceed
directly to the 60k run… Do NOT keep iterating V3.10, V3.11, V3.12, etc. based
on theoretical objections… The questions remaining are exactly the questions
the actual run needs to answer."* We agree with every point. **None requires
changing the sampling architecture.** This section is the final plan of record:
it folds the last hardening items into the document and freezes the to-do list.
After this section the only work is execution (the §45.5 code deltas), then
gates 1–4 (§45.6), then the 60k.

### 45.1 Which V3.x do we "use"? — ONE document, not a menu

V3.1–V3.9 are **cumulative revisions of the same strategy document**, not
competing options. Each `V3.n` = the document as it stood at the n-th review;
later versions supersede earlier ones on every point of conflict, and the
surviving decisions are already integrated (the revision log above records each
adoption). There is no "use V3.4 or V3.9" choice. **The final plan = this
document (V3.9) + this §45 close-out.** The table below is for orientation —
nothing here is re-decided:

| Version | What it contributed that still stands |
| ---- | ---- |
| V3.1 | Original architecture: 4 h windows, airport-census sampling, per-row sampling metadata, AeroDataBox webhook collection |
| V3.2 | 1:2:1 tier mix, 1,900/day cap, information-per-credit framing, snapshot ETL, XGBoost ladder, weather layer, test-set protection |
| V3.3 | Adaptive budget + reserve, tier-resilient rotation, daily-cap enforcement, watchdog auto-rotation |
| V3.4 | Controlled window experiment (not naive 80/10/10), probability-vs-schedule naming discipline |
| V3.5 | Pre-run lock: deterministic UTC rotation, normalized REGIONAL pick, planned-vs-realized probability language |
| V3.6 | **Pre-specified 40/20/20/20 anchor score, crossover-first window comparison, `airport_layer_design_probability` naming** |
| V3.7 | Month-1 = pilot / month-2 = powered study framing; scheduler HARD/SOFT hierarchy |
| V3.8 | Calendar fix (26×4h + 3×2×2h + 2×6h = 31), reserve nomenclature, Engine-A test protection, REGIONAL wording |
| V3.9 | Three-quantity credit accounting, delivery-failure gate, five preflight gates, canary |
| **V3.9-f (§45)** | **Subscription-set exclusivity, SOFT_STOP margin, richer canary, versioned manifest, final GO gate — the last revision** |

What was tried and deliberately NOT adopted (superseded): the "2×2h replaces
4h" hypothesis (became a controlled crossover experiment, §24/§31), the
"persistent core 40–50%" claim (unaffordable at 1,900/day, §7), the
"44%/276-airport coverage" wording (measured universe only, §6), "realized
inclusion probability" phrasing (→ conditional design probability, §8/§30),
and any "V3.10+" re-design (explicitly declined — CGTAnalaysis9's own advice).

### 45.2 The ninth review — claim-by-claim adjudication

| CGTAnalaysis9 claim | What we checked | Verdict | Where it lands |
| ---- | ---- | ---- | ---- |
| "C_external = B_before − B_after is account-level, not automatically batch cost; balance is shared across webhook subs" | Verified: only two `createSubscription` callers exist (controller + guard-protected manual endpoint); the account balance is shared. A foreign sub would contaminate the batch denominator | **Correct — GAP** | §13, §45.5-R1, §44.3 gate 3 |
| "Best fix: experimental subscription set is exclusive OR concurrent sources proven inactive" | Orphan cleanup exists but only runs when no batch is active; manual subs (`maxDeliveryRetries` default 2) can exist | **Correct — adopt exclusivity as a hard canary + batch-start condition** | §45.5-R1 |
| "Reserve (before) / actual spend (during) / reconciliation (after) are three concepts; don't call the estimate 'spent'" | §13 used "rows-budgeted as today's best estimate" inside the daily-cap block | **Correct — FIXED** | §13, §45.5-R2 |
| "Hard 1,900 cap needs a safety margin (SOFT_STOP ≈ 1,800–1,850, HARD_CAP = 1,900) — accounting is asynchronous" | Watchdog stops on batch budget (3,000) or window elapsed — it does NOT stop mid-batch on the daily cap, so a burst can overshoot 1,900 | **Correct — GAP** | §13, §45.5-R2 |
| "Split 60,000 into 58,900 experimental / 1,000 emergency / 100 unallocated" | Arithmetic checks: 58,900 + 1,000 + 100 = 60,000 | **Correct — FIXED** | §13 |
| "Credit is deducted when the alert is SENT, not on successful delivery; retries disabled by default" | Matches limiter (retries optional, default absent = none); strengthens the retries=0 decision | **Correct — FIXED (wording)** | §13, §45.5-R4 |
| "Failure > 0 → pause is defensible; add: reconcile + flag affected observations before resume" | Watchdog already stops the batch; no flag/resume discipline existed | **Correct — FIXED** | §27.1 gate 10, §45.5-R5 |
| "Month-1 pilot / month-2 powered" framing | Confirmed already correct | **Confirmed — no change** | §24 |
| "Crossover template must be frozen BEFORE treatment assignment (airports → UTC slot → weekday → then randomize window)" | Scheduler picks airports/state adaptively per batch (`recent_batches`, anchor rotation); treatment shape must be assigned from a pre-frozen template | **Correct — adopt** | §31, §45.5-R6 |
| "Remove station/API capacity from the yield score; make it a feasibility gate" | §23 formula included `station_capacity` in `yield_score` | **Correct — FIXED** | §23, §44-G |
| "REGIONAL conditional-probability distinction is excellent — don't change" | Confirmed | **Confirmed — no change** | §8, §30 |
| "Drop 'long-tail REPRESENTATION' → 'long-tail coverage floor'" | §29.1 phrase "bounded long-tail representation" | **Correct — FIXED** | §29.1, §45 |
| "31-day schedule (26/3/2 = 31; 83.9/9.7/6.5%) is correct now" | Confirmed: 26+3+2 = 31 | **Confirmed — no change** | §25 |
| "6-day 'each UTC slot once' is a design choice, not proof of unbiasedness" | Confirmed; no doc claims it proves unbiasedness | **Confirmed — wording caveat kept** | §9, §25 |
| "GNN ladder: persistence → calendar → XGBoost → weather → network → graph → tail → events → uncertainty" | Confirmed identical to §19 | **Confirmed — no change** | §19 |
| "Canary should add notification composition: items/notification, notifications/subscription, max burst (C = Σ items_n)" | `adb_ingest_events` already records items per delivery; the canary doesn't report composition | **Correct — adopt** | §45.5-R3 |
| "Hash/version everything besides Engine A: frame, anchor formula, scheduler seed, anchor seed, catalog, feature/snapshot builder" | Only the Engine-A test row set is hashed today (§32) | **Correct — adopt** | §45.5-R7 |
| "Weather architecture (METAR/TAF → issue/observation time → cutoff) still fine" | Confirmed against current AviationWeather.gov docs (15-day window + cache files) | **Confirmed — no change** | §18, §40 |

### 45.3 The cross-check — is CGTAnalaysis9 wrong anywhere?

**We found no factual or arithmetic errors.** Every claim was verified against
the code (`adbCollectionController_v3.ts`, `routes_v3.ts`, `aerodataboxLimiter_v3.ts`,
`flightDataPrePostStore_v3.ts`, migrations) and this document. Two points are
**over-stated**, and we resolve them as follows:

- **§1's "second-best" fix (concurrent-subscription baseline) is unnecessary.**
  The design already enforces the "best" option (exclusive experimental set)
  via watchdog orphan-cleanup at auto-start, and §45.5-R1 makes it a hard
  batch-start + canary condition. We take the best option; we do not build the
  baseline-reconciliation machinery.
- **§7 "failure > 0 → pause may be too rigid."** CGTAnalaysis9 itself concedes
  the strict rule is defensible for a measurement run. We keep the hard pause
  (a lossy delivery biases the data) and add the reconcile + flag consequence
  (§45.5-R5) — which is exactly its own recommendation.
- **§14 is a caveat, not a correction**: "6-day slot-once" is a design choice;
  we keep it and the doc already avoids claiming it implies unbiasedness.
- **§4's SOFT_STOP band (1,800–1,850) is a starting point, not a number.**
  We implement it as `1900 − ADB_DAILY_SOFT_STOP_MARGIN` (default 50) and tune
  the margin from the canary's measured burst — as CGTAnalaysis9 requests.

Everything else is either already-true (verified) or a wording/consistency fix
already folded into §13/§23/§29.1/§44-G.

### 45.4 What we deliberately did NOT change (locked by this review)

- **No architecture change** — CGTAnalaysis9 is explicit: *"I would not make
  another V4 review… call the architecture locked."* §45 is a close-out.
- **No "V3.10+" iteration** — explicitly declined by CGTAnalaysis9 §5 final.
- **1:2:1, 1×4h default, five-airport anchor pool, 60,000 budget, model
  ladder, five-engine family, month-1 pilot framing, REGIONAL conditional
  probability, weather architecture, 26/3/2 calendar, 6-day HARD rule** — all
  reconfirmed, untouched.
- **The frozen schema** (§41.4) — §45.5 adds only **audit/error-state metadata
  and accounting columns** (balance ledger, upsert counts, failure flag),
  watchdog margin config, and a canary report. **The experimental schema is
  frozen except for audit/error-state metadata required for preflight
  integrity** (CGTAnalaysis9-f §4): no collection-behavior columns change.

### 45.5 Final code to-do (row R) — the ONLY remaining implementation

| # | Delta | Where | Verify |
| ---- | ---- | ---- | ---- |
| R1 | **Subscription-set exclusivity (capable-of-delivery)**: run orphan-cleanup inside `startBatchInner` (before creating subs); **run policy: delete/disable every non-experimental ACTIVE subscription and verify only the experimental set remains capable of delivery.** The canary's check is on *billable capability*, not raw list length (the API may return inactive/historical records that cannot bill — those do NOT contaminate C_external). | `adbCollectionController_v3.ts`, `scripts/credit_canary.ts` | during a run, `listSubscriptions()` contains no foreign sub **capable of delivery**; canary fails on any such sub |
| R2 | **SOFT_STOP margin**: `ADB_DAILY_SOFT_STOP_MARGIN` (default 50); watchdog stops the active batch when today's ledger spend reaches `1900 − margin` (in addition to the existing batch-budget stop); HARD_CAP remains 1,900 and any overshoot → `reconciliation_status='MISMATCH'` | `adbCollectionController_v3.ts` (config + watchdog) | batch stops when today's actual spend ≥ 1,850; no batch exceeds 1,900 by design |
| R3 | **Canary notification composition + settlement + audit chain**: report `notifications` (POST count), `items/notification`, `max burst`, plus items/rows/failures; keep `C = Σ items_n` as C_internal. **Settlement condition (CGTAnalaysis9-f §2):** read `B_after` then `B_after_2` after a documented settle window and require `B_after == B_after_2` (balance stable) before computing `C_external = B_before − B_stable`. Record the audit chain: subscription ID, batch ID, per-notification timestamps, balance-before/after timestamps. | `scripts/credit_canary.ts` | canary prints all; PASS only if `|C_external − C_internal| ≤ tol`, balance stable, failures = 0, no foreign billable sub |
| R4 | **Cost-model wording**: "1 credit per flight item per delivery attempt; credit deducted on SEND, not delivery; each retry = another credit" in the §13 cost model + controller header | `V3_CollectionStrategy2.md` §13, controller header | grep shows the exact sentence |
| R5 | **Delivery-failure consequence**: on `delivery_failure` stop, mark the batch's rows/flights as **flagged** (`sampling_reason='delivery_failure'` or a `flagged_at` audit column) and log "reconcile before resume"; never silently resume | migration 0018 (audit flag column), watchdog stop path | flagged rows queryable after a forced stop |
| R6 | **Crossover template freeze**: the scheduler pre-generates a frozen template (candidate pool → airport set → UTC slot + day/block → crossover block) and assigns `window_shape` treatment from it, from `time_window_schedule_seed`. **The rule is NOT "treatment before airports" — it is: treatment assignment must NOT depend on any information observed after the template is frozen** (CGTAnalaysis9-f §1). Sequence: freeze candidate pool → freeze airport set → freeze UTC slot/day → freeze crossover block → randomize treatment → execute | scheduler (`plannedWindowStartUtc`/startBatchInner) + §31 | same seed → same template + same treatment; no adaptive shape selection |
| R7 | **Versioned manifest**: record frame version, `anchor_score` formula version, scheduler seed, anchor seed, catalog version, feature/snapshot-builder SHA in `adb_collection_meta` (e.g. `manifest` key) at run start; report prints them | `adbCollectionController_v3.ts`, diagnostics | `npm run health` shows `frame=… scheduler=seed_… anchor_score=… builder=sha…` |

Rows R1–R3 are the canary-blocking items (gates 3/4). R4–R7 are smaller and
may land before or with them; none changes the sampling design.

### 45.6 The GO gate (updated from §44.3 — ALL must be green)

| Gate | Action | Pass criterion |
| ---- | ---- | ---- |
| **1 — Coverage** | `npm run coverage` | `universeCount`, `catalogInUniverse` recorded, sane (universe ≥ catalog) |
| **2 — Anchor probe** | standardized probes (§23, capacity as feasibility gate) | scores computed with the frozen formula; pool NOT locked before measurement |
| **3 — Credit canary** | R1 + R3 canary: exclusive set (no foreign *billable* sub); report items/notification, burst, unique/updated rows, failures, audit chain; **balance-stable condition (`B_after == B_after_2`)**; reconcile `C_external = B_before − B_stable` vs `C_internal` | `|C_external − C_internal| ≤ tolerance` AND failures = 0 AND balance stable AND no foreign billable sub (CGTAnalaysis9 #1/#16, CGTAnalaysis9-f §2) |
| **4 — Webhook reliability + cap** | failures = 0, unexpected retries = 0, daily cap enforced with SOFT_STOP margin (R2), second-start protection correct | all verified (CGTAnalaysis9 #4) |
| **5 — 31-day run** | only after 1–4 green | start the §25 calendar |

### 45.7 Final status

**Are we correctly OK to proceed? Yes — with the §45.5 code deltas done and
gates 1–4 green.** CGTAnalaysis9 scores the design "strong" across the board
and the credit-accounting concept "much better"; its one remaining objection
(batch attribution under a shared account balance) is closed by R1, the async
overshoot by R2, and the canary's auditability by R3. Everything else is
already fixed or confirmed. **We do not begin the 60k until the canary proves
`C_external = C_internal` on an exclusive subscription set.**

---


---

## R-V3.9flock. Final lock — CGTAnalaysis9-f (V3.9-f.1 previously final)

## 46. CGTAnalaysis9-f revision — the final lock (second pass on §45; still deliberately NOT V3.10)

In answer to the §45 draft, CGTAnalaysis9's follow-up said: **"V3.9 + §45 is now
on the right path, and I would stop doing architecture revisions… Proceed with
R1–R7 implementation and gates 1–4. Do not start the 60k run until those gates
pass."** It raised four points to fix before calling the preflight locked, plus
one canary addition. We adjudicate each below — **all four are correct** (three
genuine internal contradictions, one strengthening of the canary), and all have
been folded into §45.4/§45.5/§45.6 above. Nothing requires a design change.

### 46.1 Claim-by-claim adjudication of the follow-up

| Follow-up claim | Is it right? | Resolution |
| ---- | ---- | ---- |
| **§1 — R6 contradiction:** "treatment drawn before airports" can't be true if the airport set is part of the frozen template; the real rule is "treatment assignment must NOT depend on information observed after the template is frozen" (freeze candidate pool → airport set → UTC slot/day → crossover block → randomize treatment → execute) | **Correct — genuine contradiction in the R6 wording.** The *order* of draws is irrelevant; the *independence* of treatment from post-freeze observations is the requirement | R6 rewritten (§45.5): template frozen first; treatment drawn from the frozen template; no adaptive shape selection. No code consequence beyond the scheduler seed producing a deterministic template |
| **§2 — Canary settlement:** the balance may not reflect every notification instantly at the B_after read; require `B_after == B_after_2` (documented settle window) and use `C_external = B_before − B_stable` | **Correct — this is the most important accounting strengthening.** A stale balance read would produce a false `|C_external − C_internal|` mismatch (or worse, a false pass) exactly when the accounting is async | R3 + gate 3 rewritten (§45.5/§45.6): two post-settle balance reads, equality required, `C_external = B_before − B_stable`. The canary already sleeps a settle window; it now *proves* stability instead of assuming it |
| **§3 — R1 too strict:** `listSubscriptions().length == batch subs` counts inactive/historical/orphan records that cannot generate billable notifications; the scientifically relevant condition is "no foreign subscription *capable of generating billable notifications*" | **Partly right, and the conclusion favors the strict policy anyway.** Whether AeroDataBox returns non-billable records is unknown from our side, so the check should target delivery capability — and for the actual run ChatGPT itself prefers deleting every non-experimental active sub | R1 rewritten (§45.5): run policy = delete/disable all non-experimental **active** subs; canary checks *billable capability*, not raw list length |
| **§4 — R5 vs "frozen schema":** introducing a `flagged_at`/`sampling_reason` column contradicts "no collection-behavior columns change" | **Correct — small internal contradiction.** Audit/error-state metadata is not a methodological change, but the language must say so | §45.4 freeze bullet rewritten: "experimental schema is frozen **except for audit/error-state metadata required for preflight integrity**" |
| **Canary addition:** record subscription ID, batch ID, per-notification timestamps, balance-before/after timestamps → auditable chain (batch → subscription → notification → flight items → DB upsert → credit consumption) | **Correct — cheap and valuable.** `adb_ingest_events` already stores `subscription_id`, `batch_id`, `received_at`, per-delivery counts; the canary must surface them | Folded into R3 (§45.5): audit chain printed by the canary |
| Everything else (architecture GO, sampling GO, evaluation GO, leakage GO, probability language GO, pilot window GO, credit model GO-after-canary, 60k NOT YET, "stop revising after gates") | **Confirmed** — matches our own §45 verdict | Recorded; no change |

### 46.2 The final execution sequence (locked — no further reviews)

```text
R1–R7 implementation          (§45.5)
    ↓
Gate 1: coverage              (npm run coverage; universeCount, catalogInUniverse sane)
    ↓
Gate 2: standardized anchor probes  (§23; capacity = feasibility gate)
    ↓
Gate 3: isolated credit canary      (R1+R3; C_external = C_internal after balance-stable;
                                     no foreign billable sub; failures = 0)
    ↓
Gate 4: webhook + cap verification  (failures=0, retries=0, SOFT_STOP margin, second-start guard)
    ↓
FREEZE manifest / seeds / frame / code versions   (R7)
    ↓
60k collection                (§25 calendar)
```

The single most important go/no-go condition, verbatim from CGTAnalaysis9-f:

> `C_external = C_internal` **after the credit balance has reached a stable
> post-canary state, with no foreign active subscription capable of generating
> Flight Alert notifications.**

### 46.3 Final status (this is the last revision)

**Architecture: GO. Sampling design: GO. Research/evaluation: GO. Leakage:
GO. Probability/inference language: GO. Window experiment: GO (month 1 =
pilot). Credit model: GO after canary. 60k production run: NOT YET — only
after gates 1–4 pass.** Both AI reviews (CGTAnalaysis9 and its follow-up)
agree that another theoretical review is more likely to add complexity than
find a real flaw. The remaining uncertainty — supported-universe size, window
regime, staleness, XGBoost vs persistence, and marginal value of a credit — is
precisely what the 60k run is designed to measure. **We stop revising the
architecture here and begin execution.**

---

## 47. External research adjudication + contradiction resolution (the FINAL section — V3.9-f.1)

**This section is the last word on the plan and on every contradiction that
exists anywhere above it.** It does three things: (A) adjudicates a fresh
external methodological review that grounded itself in San José State
University and San Diego State University flight-delay research plus current
AeroDataBox pricing; (B) resolves every internal contradiction that still
exists in this 46-section, multiply-revised document; (C) records the five
small pre-run fixes that follow from (A)+(B). **Nothing in sections 1–46 is
deleted; where a statement below conflicts with any earlier statement, the
statement in this §47 (and the rebuilt `AugMDnotes/V3.9_FINAL_PLAN.md`)
governs.**

### 47.1 The review we adjudicate

A review of the final plan (the "V3.9-f package") was performed using current
AeroDataBox documentation and SJSU/SDSU research. Its verdict: **"the final
architecture is on the right scientific path … I would not redesign it …
8.5–9/10 … but not yet fully methodologically closed."** Its demanded fixes
before the 60k are: (1) reconcile the API-unit vs Flight-Alert-credit budget
(FIDS is a paid Tier-2 operation); (2) call FIDS the **provider-defined
prediction population**, not a true census; (3) remove "null = censored" from
the architecture diagram (use the §20 five-state outcomes); (4) make the
population-defined snapshot rule the sole normative rule; (5) add route/OD
holdout evaluation and first-class calibration. We adjudicate every claim
against our own document and code below.

### 47.2 Claim-by-claim adjudication (external review)

| Review claim | Checked against | Verdict | Decision |
| ---- | ---- | ---- | ---- |
| "Pre/post separation (raw → event log → population → cutoff snapshot → outcome → ML) is fundamentally correct; 'post-cutoff events supply the label, not snapshot existence' is the strongest part" | §11, §20, §44-H, V3.9_FINAL_PLAN §6 | **Correct** | Locked, no change |
| "Aircraft rotation / previous-leg / late-arriving-aircraft delay is the most strongly supported direction; SDSU Jun Chen 2019 and SJSU Zheng & Wei 2021 delay-propagation studies directly support it" | §19 ladder, §39 aircraft-chain edge type, §12 chain metrics | **Correct — verified** (see 47.4 sources) | Keep chain features first-class; add the citations |
| "GNN is a hypothesis to test, not a default; 'because aviation is a network → GNN must win' is NOT supported" | §19/§39 ladder wording | **Correct** | Locked, no change |
| "XGBoost-first + persistence (Model −1) gate is correct; aviation delay is heavily autocorrelated" | §19 model ladder, §41.2-E, §42.2-B | **Correct** | Locked, no change |
| "Weather architecture correct (obs_time/issue_time ≤ cutoff) BUT make weather availability a measured data gate; never silently fill missing history from a later/revised source" | §18, §40 | **Correct — adopt** | New: weather-availability gate (47.3-fix #6) + §40 coverage check already exists |
| "Population layer is the single biggest improvement" | V3.9_FINAL_PLAN §5 | **Correct** | Locked, no change |
| "Calling FIDS a 'census' overstates it; it is a provider-observable prediction population. G5 should validate provider → reference source → observed" | V3.9_FINAL_PLAN §5 (used "census"), §6 Gate 5 | **Correct — real wording fix** | Rename to "provider-observable prediction population" (47.3-fix #2); G5 wording updated |
| "Internal contradiction: old doc still says 'snapshot only if we hold an event after cutoff' (that's §11 line 667 of THIS file) vs the corrected rule" | This file §11 | **Correct — genuine contradiction** | §11's old rule is SUPERSEDED by §47.4 rule below; the final plan is the only normative spec |
| "Internal contradiction: 'null = censored' (diagram) vs the five-state §20 outcome model" | V3.9_FINAL_PLAN §2 diagram vs §20 | **Correct — real contradiction** | Diagram fixed (47.3-fix #3); outcomes are observed / active_censored / canceled / diverted / missing_outcome |
| "Missing edge ≠ zero edge (known-absent vs unknown/unobserved)" | §39 edge taxonomy, V3.9_FINAL_PLAN §7.5 | **Correct** | Locked, no change |
| "Collection-mechanism ablation is a major scientific result, not a side diagnostic" | V3.9_FINAL_PLAN §7.4 | **Correct** | Promoted to a month-1 headline deliverable |
| "1×4h default, constrained randomized UTC allocation, 31 days ≠ seasonality, 2×2h/6h = pilot" | §9, §25, §31, §42.2-A/C | **Correct** | Locked, no change |
| "airport-layer probability ≠ flight inclusion probability; 1/p not a valid flight weight" | §8, §10, §30, §37 | **Correct** | Locked, no change |
| "**The budget problem:** 60,000 API units → refill → 58,900 credits assumes the same 60k pays for FIDS census too. AeroDataBox bills FIDS as Tier-2 = 2 API units; API quota and alert credits are two separate pools fed from the same 60k. Need an explicit two-budget partition; make it Gate 0" | §13 (already had units-vs-credits table), V3.9_FINAL_PLAN §3 | **Correct — the most important fix.** We documented the dual system but did NOT partition the 60k between refill and REST/census spend | New Gate 0 + explicit partition (47.3-fix #1); budget table in final plan §3 |
| "1,900/day is an experimental resource constraint, not a scientific truth; the useful quantity is Δprediction-quality/Δcredits" | §13, §38 | **Correct** | Wording adopted |
| "Marginal value per credit: describe as 'estimated under randomized/paired intervention', not universal causal value" | §38 | **Correct** | Wording adopted in final plan §16/§38 |
| "Five-engine suite strong; Engine A allows known tails, Engine D hard-blocks them" | §32, §41.4, V3.9_FINAL_PLAN §7.3 | **Correct** | Locked, no change |
| "**Add route/OD holdout** (e.g., train LAX→ORD/SEA, test SEA→JFK) to separate airport-identity memorization from general dynamics" | §32 (no OD engine) | **Correct — adopt** | New Engine R (route/OD holdout), 47.3-fix #5 |
| "**Make calibration first-class:** calibration error, Brier score, interval coverage, interval width, tail performance — especially at T-90m" | §19/§32 (calibration mentioned, not required) | **Correct — adopt** | New calibration metric block in final plan §14 |
| "SJSU trajectory-focused work (Zheng, Zou et al.) supports 'don't collect everything; collect what has measurable incremental value' → your info-per-credit framing" | §12, §38 | **Correct** | Locked, supports info-per-credit |
| "Staleness as feature (days_since_last_obs) + staleness curve" | §17.3, §23 | **Correct** | Locked, no change |
| "Do NOT change: XGBoost-first, persistence, rotation, weather timestamps, graph hypothesis, missing-edge distinction, population layer, immutable raw log, constrained UTC randomization, 4h default, pilot framing, no 1/p, ablation, engines, test protection, info-per-credit" | All | **Correct** | All locked — matches our §35/§45.4 |
| Overall: "don't press the 60k button yet until the two-budget fix + 3 cleanups; then ready for controlled collection subject to your gates" | — | **Correct** | We add Gate 0; gates 1–5 unchanged |

**Where the review is wrong or overstated:** none of the substantive claims are
wrong. Two points deserve scale-notes: (a) the FIDS census is *cheap* — on the
order of 2 API units per airport-window, so the partition is an accounting
discipline (Gate 0), not a budget threat; (b) the review calls the census
"essential, but FIDS itself needs validation" — we agree and encode that as
G5, not as a reason to stop.

### 47.3 The five pre-run fixes (V3.9-f.1)

| # | Fix | Where it lands |
| ---- | ---- | ---- |
| 1 | **Two-budget accounting + Gate 0**: partition the 60,000 monthly API units explicitly between (a) Flight-Alert refill → credits, (b) FIDS/census + other REST calls, (c) probes, (d) diagnostics; track API-quota remaining on the RapidAPI usage page in parallel with the credit balance; **Gate 0 (new, before Gate 1):** verify plan entitlement, refill rate (1 unit = 1 credit), per-refill/balance caps (they depend on the pricing plan per AeroDataBox), and that FIDS spend is budgeted — all confirmed before any census call | final plan §3.1 + Gate 0 in §15 |
| 2 | **Rename census → provider-observable prediction population**; G5 validates provider-population → reference operational source (e.g., FAA/BTS for US, where available) → observed; global claim is "population relative to the validated AeroDataBox-supported operational frame" | final plan §5, §15 Gate 5 |
| 3 | **Outcome model everywhere**: remove "null = censored" from the architecture diagram; use `observed / active_censored / canceled / diverted / missing_outcome` (§20) | final plan §2, §5 |
| 4 | **Single normative snapshot rule**: the only rule is "snapshot exists iff flight ∈ provider-observable prediction population at cutoff ∧ features available ≤ cutoff ∧ eligible; post-cutoff events supply the LABEL only." **§11's line-667 rule is obsolete.** | final plan §6 |
| 5 | **Route/OD holdout engine (R) + first-class calibration metrics** | final plan §7.3, §14 |
| 6 | **Weather-availability gate**: weather feature availability is itself measured and reported; missing historical weather is never silently filled from a later/revised source | final plan §10 |

### 47.4 Contradiction-resolution map for THIS document (read top-to-bottom)

Because this file is 46 layered revisions, older text sometimes contradicts the
final position. **Where any of the following conflicts, the right-hand column
governs:**

| Contradiction found in sections 1–46 | Binding resolution |
| ---- | ---- |
| §5 "44% right-censored" vs §20 outcome taxonomy | §20 five-state model governs; "right-censored" is only `active_censored` + `missing_outcome` |
| §11 "snapshot only if we hold an event after cutoff" (line 667) | **SUPERSEDED.** Snapshot existence is population-defined (47.3-fix #4) |
| §13 "60k → 58,900 credits" without REST/FIDS partition | Gate 0 two-budget partition governs (47.3-fix #1) |
| "null = censored" (architecture diagram) vs §20 | Five-state outcome model governs (47.3-fix #3) |
| "FIDS census" / "true census" wording | "provider-observable prediction population" governs (47.3-fix #2) |
| §25/§43 "80/10/10" vs §25 84%/10%/6% | 26 × 4h + 3 × 2×2h + 2 × 6h = 31 days, ≈84/10/6 governs |
| §16 "balanced at weekday×UTC" vs §42 "constrained randomized allocation" | Σ(n_c − n̄)² minimization governs (V3.7 Change A) |
| §23 anchor "20% observed yield" with station capacity vs §44-G | `yield_score = f(unique_flights/credit, chain-links/credit, stability)`, capacity = separate feasibility gate |
| "persistent core" (old) vs "rotating anchor pool" | rotating anchor pool governs (§7, §16, §23) |
| "sampling_weight = 1/p" (old §10) vs §30/§37 | Retracted; `sampling_weight` stays NULL; no auto 1/p |
| "1 row ≈ 1 credit" (old) vs §13/V3.9 | Retracted; three-quantity accounting + balance-delta source of truth |
| Reserve numbers "1,100" vs "1,000" vs "100" | 58,900 experimental / 1,000 emergency reserve / 100 unallocated = 60,000 (§13) |
| Engine-A name "future-representative" | "future/deployment-representative **under the collection regime**" (CGTAnalaysis11) |
| Weather "free" | "no AeroDataBox credit cost; retrieval/storage/archive are separate engineering constraints" |

### 47.5 External research foundation (the sources the plan is built on)

The final plan's central scientific bets — **aircraft rotation / delay
propagation, persistence baseline, weather timing, network modeling as a
hypothesis, and info-per-credit frugality** — are grounded in peer-reviewed
aviation research, not invented convention:

| Idea in our plan | Source (verified 2026-08-12) |
| ---- | ---- |
| Previous-leg / late-arriving-aircraft delay is among the most predictive features; delay propagates along the same aircraft's itinerary | Chen, J. & Li, M., "Chained Predictions of Flight Delay Using Machine Learning," AIAA SciTech 2019 (San Diego State University). Verified via junchen.sdsu.edu — states departure delay and late-arriving aircraft delay are the most important features and the chain model predicts delay along the aircraft's itinerary |
| Delay-propagation differs by aircraft utilization; previous delays, turnaround/buffer, weather, and utilization influence later flights; stronger propagation later in an aircraft's day | Zheng, Z., Wei, W., et al., "A Comparative Analysis of Delay Propagation on Departure and Arrival Flights," SJSU ScholarWorks #2410 / Aerospace (MDPI) 8(8):212, 2021 (Wenbin Wei, SJSU) |
| Aircraft-chain continuity as a first-class modeling element; focused information-rich features beat feature-stuffing | Zheng, Zou, et al., "A Data-Light and Trajectory-Based Machine Learning Approach…," SJSU ScholarWorks #4774 (SJSU-affiliated) |
| GNN for delay propagation is defensible as a hypothesis but not a guaranteed winner | Wu, Chen, et al., "Delay Prediction of Flight Operation Network Based on Deep Learning," SJSU ScholarWorks #4935 (GCN-GRU); and ERAU 2025 AIAA GNN-for-weather-delay work |
| Persistence / autoregressive baselines are the right first gate for aviation delay (highly autocorrelated) | Chen & Li (2019) demonstrates previous departure delay value; operational persistence is standard practice in the literature (Sternberg et al., 2017 review, arXiv) |
| Airport capacity/demand, wind/visibility, en-route weather combined with ops | "Airport Delay Prediction with Temporal Fusion Transformers," arXiv 2405.08293 (2024) |
| Delay as a network/propagation problem with dominant-airport effects; data & methods taxonomy | "Flight Delay Propagation Modeling: Data, Methods, and Future Opportunities," Transportation Research Part E (2024), ScienceDirect S1366554524001169 |
| Credit/API accounting model: API quota vs Flight-Alert credit balance, 1 credit per flight item deducted on SEND, retries cost extra, refill 1 unit = 1 credit, per-plan refill/balance caps | AeroDataBox, "Flight Alert API: Guide to the New System" (Jan 31, 2026 update); aerodatabox.com/flight-alert-api-2026 and /doc/rapidapi.html#/operations/RefillBalance |

### 47.6 Final status (V3.9-f.1 — truly the last section)

**Architecture: GO. Sampling: GO. Evaluation: GO. Leakage: GO. Credit model:
GO after Gate 0 + canary. 60k: NOT YET — wait for Gate 0 (budget partition),
gates 1–5, and the canary's `C_external = C_internal`.** The review scored the
architecture 8.5–9/10 and said "I would not redesign it"; we agree and have
made only the six small fixes in §47.3. The rebuilt, complete, single-source
executable contract — with the step-by-step runbook, sources, and no
contradictions — is **`AugMDnotes/V3.9_FINAL_PLAN.md`** (renamed from
`V3_CollectionStrategy2_FINAL_PLAN.md`). Read §47 of this file and that file
together; both are the final spec.

>> Subsequent V3.9 revisions (V3.9-f.2 airborne pass and any later) live in
>> `AugMDnotes/V3.9_FINAL_PLAN.md` (§22 onward). This file is closed as a spec;
>> it only documents the adjudication history up to V3.9-f.1.