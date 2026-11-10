# The ReplitTranvr Data Pipeline — An End-to-End Code Teaching Atlas

**Prepared:** 2026-11-10 (Pacific). **Audience:** project owner learning the engineering and data-science internals.  
**Repository:** [HKcode22/ReplitTranvr](https://github.com/HKcode22/ReplitTranvr) • **Source snapshot reviewed:** `main` at `03155ee1bff480122944530bbf04b58ea0ae90db` (the independent documentation branch was created from this commit).  
**Location:** `data-collection/phase5/2026-11-10_END_TO_END_DATA_PIPELINE_CODE_TEACHING_ATLAS.md`  
**Document type:** educational code map, **not** an executable release manifest, provider authorization, a change to scientific outcomes, or permission for paid operations. No application code, original data, credentials, production tables, automations or `main` were changed to prepare it.

> **The 15-second summary:** A *data pipeline* is a repeatable sequence that obtains information, records its origins and timing, checks it, transforms it, and makes it available for a later purpose. In this project there are **two main incoming streams**: AeroDataBox airport FIDS **REST GET** responses and AeroDataBox Flight Alert **webhook POST** deliveries. We additionally have airport sampling, pre-departure snapshots, optional airborne trajectory processing, outcome assessment, cost/permission safeguards, and scientific quality audits. The individual pieces are not the same thing as an unattended, fully approved 31-batch-day Phase 6 run.

## Contents / reading route

1. What a pipeline is, and six different kinds of code you keep seeing.
2. The whole architecture drawn twice (simple and engineering).
3. One hypothetical flight through the data pipeline, with exact times.
4. Phase 1–7: what was tested, built, collected, and what remains.
5. The **FIDS REST pipeline**, line by line, including the real SQL writes.
6. The separate **Flight Alert webhook pipeline**, from Replit HTTP to append-only observations.
7. Identity, normalization, codeshares, source time, and actual-versus-estimated outcomes.
8. The **Phase 5 future GitHub pipeline**: calendar → draw → Stage 6–9 → source GET → PRE/witness → POST.
9. How the PostgreSQL tables connect; SQL examples with actual table names.
10. Other pipelines: ADS-B, weather/history, QA, and future ML.
11. Why the code has roles, SHA, tests, fake data, and “fail closed.”
12. **Code and workflow reference atlas** — grouped paths, why each exists, what it does NOT prove.
13. Common misconceptions translated into ordinary English.
14. Guided reading exercises, including where to click and what to look for.
15. Real completion status and where to verify it without accidentally starting a paid experiment.

---

## 1. What is a data pipeline? Why do we have more than one?

Imagine the airport information arrives as a complex JSON object. The database does not magically understand which objects are real operating flights, which timestamps are estimates, when a fact became known, or whether we are legally allowed to retain it. Code has to establish those distinctions.

A typical project pipeline has **steps**:

1. **Extract / acquire:** Get the source information. Example: request WSSS departures using AeroDataBox FIDS, or receive an Alert webhook.
2. **Validate:** Check shape, missing fields, origin, time, permissions and whether a request was authorized. A source response that parses is not automatically scientifically true.
3. **Normalize / transform:** Put heterogeneous nested records into consistent objects and database columns; keep UNKNOWN instead of inventing zeros.
4. **Persist:** Save records transactionally in PostgreSQL with the original evidence and transformation lineage.
5. **Materialize as-of / label:** Build the PRE prediction-time state from information genuinely available by the cutoff; separately observe later outcomes when they are available.
6. **Audit / use:** Count missingness, coverage, duplicate identities and cost; finally, if enough valid labels exist, produce Phase 7 model training and protected evaluation datasets.

This is related to **ETL** (Extract, Transform, Load), but our project adds explicit scheduling, budgets, timed snapshots, identity verification, audit provenance and a real-time receiving service. A pipeline is **not** just one long function, just SQL, just “an array,” or automatically an ML model.

### Six code roles to recognize

| Code role | Your mental translation | Example |
|---|---|---|
| **Client / fetcher** | “Ask a provider for data” | `aerodataboxLimiter_v3.ts` |
| **Parser / normalizer** | “Interpret and organize the returned JSON” | `fidsCensus_v3.ts`, `flightNotificationExtractor_v3.ts` |
| **Writer / repository** | “Safely put evidence into tables” | `persistFidsObservation`, `persistRawDeliveryTransaction` |
| **Builder / materializer** | “Produce an analytical row from valid earlier evidence” | `buildPreSnapshot`, `materializeAirborne` |
| **Orchestrator / owner** | “Call other steps in the right order and at the right time” | `phase5ReviewedSourceDayPrepareOrchestrator_v39.ts`, GitHub owner scripts |
| **Auditor / guard** | “Read and reject inconsistent or unqualified claims” | `phase5DaySourceQualityReadonly_v39.ts`, `gate05RunwayDelayLabelAudit_v39.ts` |

A **TypeScript `interface`** is the shape/type contract of a value; it does **not** run or fetch anything. A **function** executes when invoked. A `.test.ts` file runs examples and assertions, normally with **synthetic data**. A `.yml` GitHub Actions workflow controls *when and how a runner might invoke* a script. A `.sql` migration creates or changes tables/functions/permissions. A Markdown `.md` is documentation and is not executable software.

---

## 2. The architecture — first the understandable picture

~~~text
              RESEARCH DESIGN / AUTHORIZATION
  eligible airport frame + 31 parent days + 4 slots per day
  target definition + rights + budgets + approved GitHub run
                           |
                   SOURCE COLLECTION
         +-----------------+------------------+
         |                                    |
  AeroDataBox FIDS GET                  Flight Alert webhook
  airport departure board               provider sends us JSON
         |                                    |
  verify source/response                 Replit HTTPS receiver
         |                                    |
  FIDS ORIGINAL +                         RAW DELIVERY +
  normalized flight_population            RAW DELIVERY ITEMS
         |                                    |
         |                               identity + extraction
         |                                    |
         |                         immutable flight_events +
         |                         latest convenient state
         |                                    |
         +----------> valid flight identity <-+
                       and source lineage
                              |
                   PRE (T−24h, T−6h, T−90m)
            cutoff-safe flight_snapshots in PostgreSQL
             (separate independent T−24h witness)
                              |
              POST source, status, optional track
                              |
                  qualified later outcome(s)
                 or UNKNOWN / missing / pending
                              |
                   READ-ONLY QUALITY AUDITS
               source / route / tail / labels / spend
                              |
                   FUTURE PHASE 7 MODELING
           TRAIN 20 days / VALIDATE 5 / TEST 6
~~~

**Important:** The two acquisition paths are **parallel**, not one automatic handoff. The POST FIDS path is also a **later REST query**, whereas a Flight Alert POST is an unsolicited notification from the provider to our receiver. Not every FIDS scheduled service receives a valid webhook or a verified actual physical event.

### Engineer's view: distinct evidence stores

~~~text
[Phase5 calendar / sampling / signed packet]
  clean.adb_phase6_calendar_day
  clean.adb_sampling_draw
  clean.adb_phase6_authorization
            |
  Stage7 saved draw readback (READ ONLY)
            |
  Stage8 exact source request proposal (PURE)
            |
  Stage9 stored approved/partitioned source query
  clean.phase5_fids_allowed_query_v39
  clean.phase5_fids_exact_query_partition_v39
            |
  V0079 / V0080 real GitHub-job + physical-GET reservation
  clean.phase5_fids_physical_attempt_v39
            |
  FIDS HTTP GET -> original response + normalized members
  clean.fids_query_response
  clean.flight_population
  clean.phase5_fids_original_binding_v39
            |
  one eligible flight/horizon PRE (DB-clock cutoffs)
  clean.flight_snapshots
            |
  independently committed V0081 witness for T−24h
  clean.phase5_t24_postcommit_witness_v39
            |
  later signed POST FIDS source (V0083 REST budget)
          and/or bounded Flight Alert webhooks
            |
  clean.flight_outcomes and/or explicitly UNKNOWN
            |
  quality/route metadata -> Phase7 (NOT trained yet)
~~~

**No data pipeline is complete merely because its tables exist.** Tables are containers, functions are mechanisms, actual source rows are observations, independent review approves the scientific *meaning*, and protected test evaluation determines model performance. Those are different achievements.

---

## 3. Follow one fictional flight from start to finish

**This example is intentionally invented.** It demonstrates programming mechanics; it is not a real AeroDataBox flight, a provider purchase, or an observed actual departure.

Suppose a scheduled operating flight **WSSS (Singapore) → RJTT (Tokyo Haneda)** has an independently established initial reference schedule `T = 2026-12-12 10:00 UTC`. For teaching, assume this `T` is the approved first scheduled provider milestone, not an observed wheels-off event.

| Moment | UTC | What the code is supposed to know |
|---|---|---|
| **T−24h** | Dec 11 10:00 | Only valid information available by this instant |
| **T−6h** | Dec 12 04:00 | More recent permitted information if available |
| **T−90m** | Dec 12 08:30 | Last separate PRE cutoff |
| **T** | Dec 12 10:00 | Scheduled reference time, NOT proof of departure |
| **Later POST** | e.g. Dec 12 13:00 | Later provider version/status, but not retroactively PRE |

If a FIDS observation **first became available** at 08:45 on Dec 12, it is **15 minutes too late for T−90m** (08:30). It may support later legitimate observations or a POST analysis, but **must never be saved as genuine 08:30 PRE evidence**.

An eligible operating-service key might be built from operating airline, flight number, original origin/destination, origin-local service date and first observed schedule. But a **conditional service key is not automatically a certified physical aircraft movement**. A marketing codeshare flight number may refer to the same operated aircraft; two separate flight records must not automatically become two physical flights.

A PRE snapshot is a **row per flight × horizon**, so 12 eligible source-grounded service keys with three actual cutoff-safe observations *could* yield 36 PRE rows. They are **not** 36 independently distinct flights. Nor does that prove those 12 keys have verified wheels-off outcomes.

To use the flight for a particular supervised regression target, we ultimately need a **joint pair**: its legitimate PRE row **and** a scientifically valid matched outcome. Seeing 100 PRE rows in one table and 80 outcomes in another does **not** prove that 80 of the *same* flights have both.

---

## 4. What the phases were doing — not “fetching AeroDataBox for five months”

| Phase | Actual research/engineering question | Pipeline work and evidence category |
|---|---|---|
| **Phase 1 / Gate 0 / foundation** | Which provider/account/contract, research plan, safety, database and source rules are in scope? | Provider/account evidence, source terms, reference frame and architecture; not 31-day future flight prediction accuracy |
| **Phase 2 / 2G** | Which airports, routes, tiers and windows are useful? What source delivery/selection and missingness limitations exist? | Sampling frame, traffic/route evidence, historical source/pilot rows; some real paid activity, not blanket coverage of all 1,013 candidates |
| **Phase 3** | Can a controlled Flight Alert subscription actually SEND, reach the published Replit webhook, be preserved, recovered, stopped and billed without unsafe duplication? | Alert controller, signed receiver, raw webhook custody, watchdog/STOP, actual narrow paid tests |
| **Phase 4 Gate 5** | Can genuine FIDS responses be source-bound to scheduled services, recorded before T−24/T−6/T−90 cutoffs, and compared to later POST observations? | FIDS originals/population, real PRE/POST on a narrow WSSS cohort, true source semantics and physical-label limitations |
| **Phase 5** | Can all the existing pieces run **prospectively for 31 controlled batch-days**, with a defined target, lawful source use, real schedule/budget, restricted GitHub owner and final independent review? | Database V0079–V0083, Stage7→9, one signed GET, PRE/witness, future POST prototype, quality checks; **not yet a fully unattended released production chain** |
| **Phase 6 (future)** | What flight observations did the approved experiment actually collect? What coverage, missingness, source cost and valid labels resulted? | 31 parent-day live data collection **only after separate GO** |
| **Phase 7 (future)** | Can time-safe features predict a trustworthy, predeclared outcome and outperform appropriate baselines on protected future data? | Model training, calibration, uncertainty, route/generalization holdouts and honest reporting; do not claim model accuracy in Phase 5 |

**Latest source-of-truth guidance at this branch's base:** [Nov 10 minimum Phase 5 exit checkpoint](2026-11-10_MINIMUM_PHASE5_EXIT_AND_PARTIAL_PRE_POST_REUSE.md) and [new-chat engineering handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md). Both say reuse already installed infrastructure and narrow pilots; the current hard work is future end-to-end orchestration, source-use/target contract, calendar/budget, and independent FREEZE. Project status can change on `main` after this guide is written.

---

## 5. Pipeline A — AeroDataBox FIDS airport REST source, in actual code

**FIDS** means **Flight Information Display System**: data comparable to an airport arrival/departure board. This is *not* necessarily physical motion telemetry. The REST client **requests** records for an airport and time window; unlike a webhook, the provider does not spontaneously push this FIDS response to us.

### 5.1 File 1: the network/client layer

Open [`server/lib/disruption/aerodataboxLimiter_v3.ts`](../../server/lib/disruption/aerodataboxLimiter_v3.ts).

This file contains AeroDataBox transport, API/quota handling, and `fetchFidsAirport`. Think:

- A function prepares and sends an HTTP `GET` to AeroDataBox with airport code and `fromLocal/toLocal`.
- The provider returns a JSON document (e.g., `departures` and possibly `arrivals`).
- The client applies transport and error/timeout rules.
- **Future Phase 5 paid source owners must supply a separate restricted reservation and exact one-request admission; do not invoke a generic client and assume its usual retry behavior is automatically approved.**

The airport FIDS source is **one API response containing potentially many records**, not one paid GET per returned flight. Our historic public planning price in this implementation is two REST API units per FIDS GET; actual live account/endpoint terms and budget admission must be verified per release.

### 5.2 File 2: the parser/normalizer and population writer

Open [`server/lib/disruption/fidsCensus_v3.ts`](../../server/lib/disruption/fidsCensus_v3.ts).

It is nearly **1,000 lines** because it handles several separate responsibilities, not because each line makes another API call. Use these anchors:

| Lines (at pinned commit) | What to look for |
|---|---|
| **20+** `interface FidsCensusParams` | Input contract: airport, local window, source protocol, eligible scope |
| **57+** `buildFidsRequestContractV39` | Exactly which provider options the request intends |
| **111+** `interface FidsCensusResult` | Shape of the result returned by the function |
| **235–390** classification and population row logic | Scope, role, missing identity, codeshares |
| **398+** `normalizeFidsRecord` | Convert heterogeneous provider records to structured candidate rows |
| **569+** `fetchFidsPopulation` | Calls the actual FIDS client and constructs the observation |
| **861+** `persistFidsObservation` | Saves original + normalized members in PostgreSQL, atomically |

**Verified excerpt**, shortened without changing its meaning:

~~~ts
const fids = await (deps.fetchAirport ?? fetchFidsAirport)(
  params.airportIcao,
  params.fromLocal,
  params.toLocal,
  {
    direction,
    withLeg: frame.withLeg,
    withCancelled: frame.withCancelled,
    withCodeshared: frame.withCodeshared,
    withCargo: frame.withCargo,
    withPrivate: frame.withPrivate,
    category: params.restCategory
  }
);
if (!fids) return null;
~~~

Read this like a programmer:

1. `const fids =` means “store the fetched result in a variable named `fids`.”
2. `await` means “wait until this asynchronous operation finishes.”
3. `deps.fetchAirport ?? fetchFidsAirport` means “use the injected fetcher if one was supplied (useful for tests); otherwise use the real provider client.”
4. `params.airportIcao` is the selected airport, e.g. `WSSS`.
5. `fromLocal` / `toLocal` specify the exact local-time request range.
6. The last object sets source rules, including cargo/private filters and the request's accounting category.
7. `if (!fids) return null` means no FIDS response was obtained, **not** “the airport has zero flights.”

**Nested JSON normalization** is not “shrinking our database into little tables.” It means mapping provider fields into consistent typed records. For illustration only:

~~~json
{
  "departure": {
    "airport": { "icao": "WSSS" },
    "scheduledTime": { "utc": "2026-12-12T10:00:00Z" }
  },
  "arrival": { "airport": { "icao": "RJTT" } }
}
~~~

may become a population member with columns such as `dep_airport_icao`, `arr_airport_icao`, `dep_scheduled_utc` and a source query ID. The original response's meaning, timestamps and content hash are preserved separately under the approved retention policy.

**Actual persistence function** [`persistFidsObservation`](../../server/lib/disruption/fidsCensus_v3.ts#L861) performs roughly this SQL structure (column lists omitted for readability):

~~~sql
BEGIN;
INSERT INTO clean.fids_query_response (...) VALUES (...) RETURNING available_at;
INSERT INTO clean.flight_population (...) VALUES (...)
  ON CONFLICT (population_query_id, analytic_identity_id, population_role)
  DO NOTHING;
COMMIT;
~~~

One **transaction** means the group of writes succeeds together or fails together. If it fails midway, `ROLLBACK` prevents falsely claiming the original and population are both complete. The writer also uses a database-derived durable `available_at` timestamp so a flight-member row cannot appear to have been known earlier than its original saved response.

**REST original ≠ generated normalized row ≠ independent physical flight.** Those three should never be conflated.

### 5.3 The checksum and response provenance

[`fidsEnvelopeCanonical_v39.ts`](../../server/lib/disruption/fidsEnvelopeCanonical_v39.ts) creates a canonical application-side SHA-256 checksum. This helps reproduce/compare an envelope even when JSON key ordering differs after PostgreSQL `jsonb` storage. It is **not a cryptographically signed promise by AeroDataBox** or proof of physical runway activity.

`fidsCensus_v3.ts` distinguishes verified decoded response-body bytes from a reconstructed JavaScript JSON envelope; those are not the same transport evidence. It also stores source identity, request range, retrieval/availability times and reference hashes.

---

## 6. Pipeline B — AeroDataBox Flight Alert webhooks to Replit

This is the other important path. Rather than our code querying an airport board, **AeroDataBox sends a notification to an HTTPS endpoint we operate** when a subscribed flight/airport event occurs.

### 6.1 Different HTTP directions

| FIDS REST | Flight Alert webhook |
|---|---|
| **Our GitHub worker → AeroDataBox** | **AeroDataBox → our published Replit receiver** |
| An HTTP `GET` | An incoming HTTP `POST` |
| REST API-unit budget | Flight Alert delivery credits (separate ledger) |
| Query for a specified service window | Provider sends notification items as part of an approved subscription |
| Records saved as FIDS source observations | Raw webhook deliveries and semantic events |
| Same API company; **different acquisition mechanics** | Not proof that an Alert was received just because provider billed SEND |

### 6.2 HTTP entry point: the receiver

Open [`server/routes_v3.ts`](../../server/routes_v3.ts) near **lines 407–455**. The `webhookIngress` callback:

1. Confirms the configured webhook secret. A random public caller cannot simply send data into the accepted source path.
2. Validates the received JSON shape.
3. Records provider delivery, batch and reception clocks.
4. Calls `persistRawDeliveryTransaction` to save the raw envelope **before replying successfully**.
5. Extracts and resolves flight identities; unresolved identities are quarantined from the resolved analytic stream, not invented.
6. Appends research events, updates the convenient latest-state table, and records processing results.
7. Returns HTTP success only on the appropriate accepted path.

Actual code fragment:

~~~ts
const committed = await persistRawDeliveryTransaction(
  deliveryEvidenceAndContext,
  rawFlightItems
);
// Illustrative argument names: see routes_v3.ts for exact values.
~~~

**This is a simplified teaching representation of the invocation**, not copy-pastable code: the actual callback passes a detailed literal object with subscription, delivery, notification and source-time fields plus an array of item records. The important fact is the call order: raw storage first, then semantic work.

### 6.3 What does “durable raw ingress” mean?

Open [`server/lib/disruption/rawIngress_v3.ts`](../../server/lib/disruption/rawIngress_v3.ts), particularly **`persistRawDeliveryTransaction` near lines 207–254**.

It performs:

~~~sql
BEGIN;
INSERT INTO clean.raw_delivery (...)
  VALUES (...) ON CONFLICT (delivery_id) DO NOTHING;
INSERT INTO clean.raw_delivery_item (...)
  VALUES (...) ON CONFLICT (delivery_id, item_index) DO NOTHING;
COMMIT;
~~~

The “raw envelope” is one received notification; “items” are its individual flight entries. `ON CONFLICT DO NOTHING` can make repeated delivery of the exact same event idempotent—**not** create a new counted physical flight. The receiver deliberately saves source evidence before responding 200, so a parsing error later cannot erase what was delivered.

### 6.4 Convert notifications into useful rows

[`flightNotificationExtractor_v3.ts`](../../server/lib/disruption/flightNotificationExtractor_v3.ts) flattens nested provider fields; absent fields become **`null`**, not invented `0`. It preserves numeric and string status/codeshare/quality representations and origin/arrival UTC fields.

[`flightInstanceCanonical_v3.ts`](../../server/lib/disruption/flightInstanceCanonical_v3.ts) tries to establish a stable **operating-leg** identity and handles duplicates, aliases, codeshares and retimes. “Airline SQ123 was advertised” alone is not enough to distinguish physical operating legs across dates or prove every source record.

[`flightDataPrePostStore_v3.ts`](../../server/lib/disruption/flightDataPrePostStore_v3.ts) has **two very different writes**:

- `appendResearchEvents` → `clean.flight_events`: retain distinct source-grounded semantic observations, rather than overwriting all history with the newest position.
- `upsertFlightNotifications` → `clean.flight_data_pre_post`: a latest-state convenience view/table; helpful operationally, **not** a replacement for immutable observations.

A webhook item may contain reported location, altitude, speed, aircraft IDs or status. None of those by itself guarantees a verified takeoff, a matched physical operating leg or a labeled arrival delay.

### 6.5 How Phase 3 fits

Phase 3's owner/watchdog/STOP code and tests exercised the **subscription and receiver lifecycle** with real bounded provider pilots: who is authorized to create a paid Alert, what an ambiguous CREATE means, when to retry or refuse, what to count on SEND versus receipt, and how to stop safely. The future Phase 6 owner should **reuse those mechanisms**, not build an unrelated second paid receiver. Example code [`adbCollectionController_v39.ts`](../../server/lib/disruption/adbCollectionController_v39.ts) includes batch control and budget measurement; [`gate4ActionsStopIntegration_v39.ts`](../../server/lib/disruption/gate4ActionsStopIntegration_v39.ts) addresses Action-driven STOP. Do not treat an old Phase 3 pilot as automatically proving the new future 31-day owner.

---

## 7. Identity and time: why “clean data” is harder than changing column names

### 7.1 Four different identities

| Term | What it identifies | Risk if confused |
|---|---|---|
| **Airport ICAO** e.g. WSSS | One airport | Not a region or flight |
| **Directed O–D** e.g. WSSS→RJTT | One origin-to-destination *direction* | Not one individual flight or one physical plane |
| **Conditional scheduled-service identity** | Provider-observed schedule matched by airline/number/route/local date/first schedule | Can be useful, but not guaranteed certified physical operating-leg identity |
| **Provider-native / verified physical leg** | One actual operated movement with evidence-backed stable linkage | Requires true source identity evidence, not merely a plausible composite |

A **tail / registration** is the aircraft, not the flight. The same plane may perform multiple flights, and one flight number recurs on different calendar dates. A marketing codeshare may advertise the same physical flight under a different number. That is why a naïve SQL `JOIN ON flight_number` could corrupt our label assignments.

### 7.2 Four different clocks

- **Provider event time:** When the provider says a flight-related event happened; may arrive later.
- **Provider response retrieval time:** When our request got a response.
- **Durable `available_at`:** When our system could genuinely use the recorded fact after acquiring/saving it.
- **Prediction cutoff `C`:** The deadline at which a model would need to make its PRE prediction. A feature is admissible only if it was actually available by `C`.

A timestamp from **yesterday's event**, returned to us **today**, is **not** a yesterday-available prediction feature.

Open [`preSnapshotBuilder_v3.ts`](../../server/lib/disruption/preSnapshotBuilder_v3.ts#L60-L75). Its actual logic includes:

~~~ts
if (feature.informationAvailableAt.getTime() > cutoffUtc.getTime()) {
  return {
    ...base,
    value: null,
    missing: true,
    missingReason: "available_after_cutoff"
  };
}
~~~

This is an **anti-leakage rule**. It rejects future-available feature values instead of quietly placing them in an earlier prediction.

### 7.3 Does `runwayTime` automatically become “real actual takeoff”?

**No.** AeroDataBox's `revisedTime` and `runwayTime` can be actual **or estimated**, depending on provider source semantics; a field being populated is not a per-record proof of an actual wheels-off event.

[`phase4Gate5NativeFidsFieldPresence_v39.ts`](../../server/lib/disruption/phase4Gate5NativeFidsFieldPresence_v39.ts) counts fields from previously obtained originals; it explicitly **does not** declare actual-only proof.

[`gate05RunwayDelayLabelAudit_v39.ts`](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts) is a pure assessment guard requiring verified actual-wheelsoff semantics, an appropriate scheduled baseline and an independently matched operating leg. If evidence is insufficient, return **`runwayDelayMinutes: null`**, not a guessed delay.

[`phase4Gate5G5AScheduleRevisionOutcome_v39.ts`](../../server/lib/disruption/phase4Gate5G5AScheduleRevisionOutcome_v39.ts) measures **provider schedule revisions**, a valid *different* possible outcome; it does not make the revised timetable a physical delay.

[`outcomeTerminalizer_v3.ts`](../../server/lib/disruption/outcomeTerminalizer_v3.ts) distinguishes an operational state (scheduled/departed/canceled/diverted/unknown) from the **status of each target label** (observed/pending/missing/not-applicable; censored only under suitable follow-up definition). It can store qualified outcomes in `clean.flight_outcomes`, but a caller's `actualVerified=true` is not an independent source of physical proof.

**Important scientific reality:** The November 6 WSSS pilot had authentic FIDS originals, conditional scheduled-service keys and cutoff-safe PRE/POST comparisons, **not** verified wheels-off labels for its intended physical-delay primary. We have guards against fabricating labels; a universal end-to-end independently verified physical-label producer is **not established**. See [Phase 4 November 6 scientific assessment](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md).

---

## 8. Phase 5: how the FUTURE unattended pipeline is supposed to work

This is the section behind the phrase “unattended source/PRE/POST pipeline.”

**Unattended** means a reviewed GitHub Actions system schedules and advances authorized stages itself, with safe retries, receipts and STOP. It does **not** mean ChatGPT or Replit Shell manually running timed commands every night. It also doesn't mean a cron entry alone gives approval.

### 8.1 Step 0 — real calendar, target, source-use and cost

The planned experiment has **31 parent batch-days**, each with **4 airport positions**: HUB, MID_A, MID_B, REGIONAL. The 31 **window treatments** are 26 ordinary 4-hour, three split 2×2-hour, and two up-to-6-hour. Five deliberately repeated four-airport groups support crossover comparisons; remaining 21 ordinary days get their actual eligible airport identities at prospective early draws.

[`experimentCalendarSolver_v39.ts`](../../server/lib/disruption/experimentCalendarSolver_v39.ts) calculates allowed date/time/region/slot structures. [`phase5Prospective31DayShapeEnvelope_v39.ts`](../../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts) explicitly **does not fabricate future adaptive-day airport codes**.

**A calendar candidate passing a mathematical solver is not a signed release calendar.** The first-cycle target definition, source-use/ML retention permissions, true UTC source costs/Alert budgets and independent review must also be established.

### 8.2 Step 1 — select four airport IDs early

[`phase5EarlyAdaptiveDrawOwner_v39.ts`](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) uses a SERIALIZABLE PostgreSQL transaction to read the actual approved calendar, eligible airport frame, prior sampling state and select the four slots. It then saves actual assignments in `clean.adb_sampling_draw`.

For example, one *hypothetical* saved day's array could be:

~~~ts
[
  { runDayIndex: 7, slotId: "HUB", selectedIcao: "WSSS" },
  { runDayIndex: 7, slotId: "MID_A", selectedIcao: "SBFL" },
  { runDayIndex: 7, slotId: "MID_B", selectedIcao: "TJSJ" },
  { runDayIndex: 7, slotId: "REGIONAL", selectedIcao: "LSZB" }
]
~~~

This is a **teaching array**, not verified actual Day 7 rows. `runDayIndex` means *which numbered experimental batch-day*; `slotId` means *which position within that day*. These are **four airports, not four flights**.

[`phase5EarlyPreselectionReadback_v39.ts`](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts) verifies genuine committed draw timestamps were sufficiently before the earliest source/PRE cutoff. A source worker must not secretly redraw a nicer airport after seeing problems.

### 8.3 Step 2 — Stage 6/7: compute source candidates from the SAVED draw

- [`phase5DynamicDaySourceGrid_v39.ts`](../../server/lib/disruption/phase5DynamicDaySourceGrid_v39.ts) **Stage 6**, pure source-window plan for a saved day (no SQL/HTTP).
- [`phase5CommittedDayGridReadonly_v39.ts`](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts) **Stage 7**, independently reads the actual calendar + four draw rows using PostgreSQL `REPEATABLE READ READ ONLY`. This proves which rows exist now, not source rights.
- [`phase5V0079DailyPreparedQueryProposals_v39.ts`](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts) **Stage 8**, produces exact query proposals from Stage 7; the file explicitly says **not yet a provider GET or DB INSERT**.

Why Stage7? A TypeScript function receiving a caller-supplied array of four airports **cannot by itself prove** those selections were genuinely saved in the authorized database. Readback checks the persisted source-of-truth rows.

### 8.4 Step 3 — Stage 9: save reviewed allowed queries and exact partitions

[`phase5ReviewedSourceDayPrepareOrchestrator_v39.ts`](../../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39.ts) connects **Stage7→Stage8→Stage9** and verifies externally reviewed proposal SHA/cost/manifest pins. It calls [`phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts`](../../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts), which inserts approved **`PREPARED` source query rows** and exact partitions in one restricted transaction.

~~~text
Read actual saved airports (7)
  -> calculate intended query ranges and cost (8)
  -> independently review exact proposal
  -> persist allowed query + partition metadata (9)
  -> stop here: NO paid provider request yet
~~~

A source query can cover **many flights**. Four airports × three horizons is **12 logical source slots** before any additional approved segmentation/refresh; source slot, exact HTTP GET attempt and returned flight are **different counting units**.

[`phase5F8SegmentedSourceCoverage_v39.mjs`](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) handles source-window partitioning (including the inactive 2×2 gap) and the seven REST spending classes:
`FIDS_BASE_UNITS`, `FIDS_SPLIT_UNITS`, `FIDS_RETRY_UNIT_BUDGET`, `VALIDATION_UNIT_BUDGET`, `OUTCOME_REST_UNIT_BUDGET`, `HISTORY_BOOTSTRAP_UNIT_BUDGET` and `DIAGNOSTIC_UNIT_BUDGET`. These are **seven accounting categories**, not seven airlines or seven required purchases; Flight Alert credits are **separate**. [`phase5V0082SevenCategoryFreezePacket_v39.mjs`](../../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs) proposes their guarded freeze packet.

### 8.5 Step 4 — a real GET needs a real physical reservation

An authorized source owner takes **one exact prepared query** and requires:

- The approved manifest, source-use, source range/partition, budget and actual clock.
- A real GitHub Actions run identity (V0080).
- One durable physical attempt/reservation **before** the HTTP GET (V0079).
- Exactly that GET, with no unauthorized silent additional retry.
- A saved original response and flight members, **bound to the attempt**.

[`phase5ScopedFidsSourceBridge_v39.ts`](../../server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts) is the coordinator; [`phase5V0079ScopedDbPorts_v39.ts`](../../server/lib/disruption/phase5V0079ScopedDbPorts_v39.ts) gives it restricted real PostgreSQL implementations. One DB function call is:

~~~sql
SELECT clean.reserve_phase5_fids_physical_get_v39(
  -- exact reviewed request and budget identifiers
);
~~~

This is an **illustrative abbreviated invocation**; inspect the code for all six actual parameters. `Physical` here means a real **billable API attempt**, **not a physical takeoff**. The original response is later linked via `clean.phase5_fids_original_binding_v39`. Missing body custody or a rejected reservation must not be reclassified as an ordinary “no flights” response.

A [signed one-query manual GitHub owner](../../scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts) and matching [manual workflow](../../.github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml) exist. Their existence is **not a fully scheduled all-day consumer**.

### 8.6 Step 5 — write real PRE records before each actual flight cutoff

[`phase5V0079SingleBoundFlightPreWriter_v39.ts`](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) verifies **one** source-bound flight/member, its native first scheduled T, source availability, timestamp order, eligible identity, a precise cutoff, role permissions and no existing duplicate.

It calls:

~~~ts
const built = buildPreSnapshot({
  flightInstanceId: p.flightInstanceId,
  populationQueryId: p.expectedSourcePopulationQueryId,
  populationMemberAtCutoff: true,
  horizonEligible: true,
  horizon: p.horizon,
  selectedTMilestoneUtc: native,
  selectedTVersion: version,
  predictionCutoffUtc: cutoff,
  features: [],
  frameHash: p.reviewedFrameSha256,
  configHash: p.reviewedConfigSha256,
  fidsResponseHash: p.expectedSourceResponseSha256,
  // Other timestamp/provenance fields omitted in this teaching excerpt.
});
~~~

**The `features: []` line matters enormously.** The current narrow Phase 5 PRE writer can save a **time-valid, source-qualified prediction-state skeleton**, even without optional weather/ADS-B features. This is **not yet a feature-rich trained ML input**; separate lawful cutoff-safe feature materialization and Phase7 model construction still need evidence. The writer refuses to backfill a missed PRE and independently checks the actual saved row after COMMIT.

Open [`preSnapshotBuilder_v3.ts`](../../server/lib/disruption/preSnapshotBuilder_v3.ts) to see how features are filtered by their information availability time.

### 8.7 Step 6 — a separate T−24h witness

[`phase5T24IndependentPostCommitWitness_v39.ts`](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts) uses a **separate PostgreSQL transaction** and a narrower role that cannot create the PRE it is checking. V0081 supplies a DB-timed witness trigger. It reads the genuinely committed T24 snapshot, writes a witness row and reads it back after witness COMMIT.

Why? A programmer saying “I inserted the snapshot” is not enough evidence that a durable row existed **before the actual cutoff**. A reviewer/worker must verify it independently. The witness is **not a person watching an airplane** and not proof of wheels-off. For T−6/T−90, [`phase5T24WitnessedLaterHorizonGuard_v39.ts`](../../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts) checks an authenticated prior T24 witness where the current protocol requires it.

There are separate [manual native T24 PRE+witness](../../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39.ts) and [manual later T6/T90](../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts) owner scripts with dedicated workflow gates; **a series of manual scripts is not yet a 31-day unattended scheduler**.

### 8.8 Step 7 — capture a later POST without rewriting PRE history

[`phase5FuturePostSourceEligibility_v39.mjs`](../../server/lib/disruption/phase5FuturePostSourceEligibility_v39.mjs) checks whether a future POST source observation is worth reviewing when **at least one** genuinely cutoff-safe PRE exists; one missed horizon does **not automatically invalidate the others**. It is a pure nonpaid eligibility audit.

[`phase5V0083FuturePostOriginalDb_v39.ts`](../../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts) and [`scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39.ts`](../../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39.ts) support a reviewed **one future POST FIDS GET** with its dedicated outcome REST budget and original-custody readback. The [manual future POST workflow](../../.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) explicitly gates paid execution on main-only manual dispatch and independent approvals. At this code snapshot, **V0083 dedicated REST login/grant commissioning is not positively certified**, and there is no fully unattended future POST owner.

**A POST source observation is not automatically an actual physical-delay label.** We still apply identity, source-time and outcome-semantics rules. Callback receiver/Alert/STOP must also be integrated prospectively and budgeted.

### 8.9 What “unattended” still needs to connect

~~~text
GitHub scheduled owner:
  approved calendar and early draw
        |
        v
  Stage7/8/9 exact source request prepared
        |
        v
  bounded real GET reserved + executed once + original committed
        |
        +-> for EACH eligible real flight and EACH due PRE horizon
        |      insert at correct DB clock, postcommit readback
        |      separate T24 witness where required
        |
        +-> independently budgeted later POST / receiver callbacks
        |
        v
  day-level read-only source and outcome audit / Alert STOP
        |
        v
  record missing, late, partial, unknown honestly and continue safely
~~~

Right now much of that is **built as independently tested modules and gated manual workflows**, plus **a scheduled READ-ONLY queue observer** ([`phase5-source-upcoming-queue-main-scheduled-readonly.yml`](../../.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml)). The queue observer has a cron expression but explicitly disables provider/API keys: **scheduled inspection is NOT scheduled paid collection**.

The missing piece is to connect the components into **one approved reliable owner** with real future dates, independently reviewed budget/rights, correct worker-role grants, restart/STOP behavior and a final release verdict. Do **not** reinstall completed migrations or pay to rerun the same historical pilot simply to “show a pipeline.”

---

## 9. PostgreSQL: where the information is stored, and what JOIN is doing

**PostgreSQL 16 / PG16** is the database engine. Tables are not separate apps. A table has rows (records) and columns (fields). One experiment uses *many tables* because original source bytes, normalized flight membership, prediction snapshots, outcome labels, sampling and costs have different **grains** and should not be mixed.

### 9.1 Table grain — learn this before writing SQL

| Table | Conceptual unit of one row | Main purpose |
|---|---|---|
| `clean.adb_phase6_calendar_day` | One experimental parent batch-day | Date, treatment, clock/region template |
| `clean.adb_sampling_draw` | One airport slot actually chosen for one day | Which ICAO, selection time and sampling probability |
| `clean.phase5_fids_allowed_query_v39` | One approved prospective FIDS query | What the worker is allowed to request |
| `clean.phase5_fids_exact_query_partition_v39` | One exact segment/partition of approved query | Provider range and source-budget correctness |
| `clean.phase5_fids_physical_attempt_v39` | One actual reserved provider GET attempt | Prevent duplicate/unauthorized spend |
| `clean.fids_query_response` | One original FIDS source observation | Raw source custody and availability |
| `clean.phase5_fids_original_binding_v39` | Link one saved original to one authorized attempt | Lineage and receipt |
| `clean.flight_population` | One normalized source member/identity from a FIDS observation | Eligible schedule service candidates |
| `clean.flight_snapshots` | One flight × PRE horizon × cutoff state | What the model could have known then |
| `clean.phase5_t24_postcommit_witness_v39` | One independently witnessed committed T24 snapshot | Verify durable early save |
| `clean.raw_delivery` | One received webhook delivery | Original pushed notification |
| `clean.raw_delivery_item` | One flight item inside a delivery | Detailed original item custody |
| `clean.flight_events` | One research semantic observation | Append-only flight history |
| `clean.flight_data_pre_post` | Deduplicated convenient latest-state record | Operational current view, **not** immutable research log |
| `clean.clean_airborne_points` / `clean.flight_trajectory` | Qualified airborne points and trajectory history | Separate in-flight evidence |
| `clean.flight_outcomes` | A target-specific final or unresolved outcome | Training labels only if verified |
| Phase5/6 REST and Alert budget ledgers | One allocation or physical charge record | Spending/STOP accountability |

The [existing database atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md) already lists the **76 baseline B0062 tables** plus named V0076–V0083 additions. **Do not make a second fake complete live inventory from this teaching diagram.** A more recent installed-table audit is about installed *structure*, not how many historical flights exist.

### 9.2 What returning a database array looks like

A **teaching-only READ-ONLY** TypeScript example:

~~~ts
const result = await client.query(
  "SELECT flight_instance_id, horizon FROM clean.flight_snapshots " +
  "WHERE horizon = $1 LIMIT 3",
  ["T-24h"]
);
const rows = result.rows;

console.log(rows[0]?.flight_instance_id);
console.log(rows.length);
~~~

- `client.query` sends SQL to PostgreSQL. It is **PostgreSQL** that filters and returns rows.
- `$1` is a bound SQL parameter, not string concatenation.
- `result.rows` is now a **JavaScript array of objects**, e.g. `[{flight_instance_id:"X",horizon:"T-24h"}, ...]`.
- `rows[0]` gets the first returned object; `rows.length` counts returned objects.
- The database may contain many more rows than the `LIMIT 3` result.
- This is an example, **not an actual production query run**.

### 9.3 JOIN helps, but the matching key must be right

Suppose `flight_snapshots` has a flight's T−6h PRE, and `flight_outcomes` has a later outcome for that **same** flight. You might use a `JOIN` to build a supervised dataset. But if you join only on **flight number**, you can confuse different operating dates, codeshares, or repeated services.

**Illustrative, not executable without reviewing the real label schema:**

~~~sql
SELECT s.flight_instance_id, s.horizon, o.label_status
FROM clean.flight_snapshots AS s
LEFT JOIN clean.flight_outcomes AS o
  ON o.flight_instance_id = s.flight_instance_id
WHERE s.prediction_state = 'PRE_DEPARTURE'
  AND s.horizon = 'T-6h';
~~~

A `LEFT JOIN` can help keep PRE members even when the later outcome is missing. But a LEFT JOIN alone **does not solve duplicates**, label target ambiguity, provider rights or physical leg verification. If one flight has multiple outcome-target rows, this simple query would duplicate that flight. A real ML dataset builder must constrain **one exact target grain and unique identity, cutoff and approved evidence**.

### 9.4 Atomicity and the roles behind it

- `BEGIN` starts a transaction; `COMMIT` saves it; `ROLLBACK` abandons it.
- `READ ONLY` prevents writes from a particular transaction.
- `SERIALIZABLE` is a transaction isolation mode for strong concurrent correctness (but doesn't validate the real-world science).
- `ON CONFLICT DO NOTHING` helps avoid duplicate-row insertion; it doesn't magically prove operating identity.
- A database **LOGIN** authenticates. A **NOLOGIN** group bundles allowed actions; a restricted worker can `SET ROLE` if correctly authorized. PRE writer and independent witness should not share unrestricted insert rights.
- A SHA-256 digest detects changes to a pinned packet relative to trusted earlier evidence; a SHA alone cannot approve the packet or certify provider facts.

V0079–V0083 are **schema/permission upgrades**, not names of different AeroDataBox APIs. They add request reservation/original binding, GitHub run identity, T24 witness, seven-category budget and dedicated POST REST ledger. The 16 named new Phase5/6 tables were observed installed with **zero records at the Nov9 audited timestamp**; that **does not contradict older Phase2–4 source tables with data**. Counts must be rechecked before claiming a later state.

---

## 10. Related pipelines and the future modeling handoff

### 10.1 Optional airborne/trajectory path

[`airborneMaterializer_v39.ts`](../../server/lib/disruption/airborneMaterializer_v39.ts) consumes eligible raw airborne observations, rejects implausible/unjoinable points into `clean.airborne_quarantine`, writes qualified `clean.clean_airborne_points` and `clean.flight_trajectory`, and creates `clean.flight_airborne_snapshots` using only the trajectory prefix legitimately available at that decision instant.

Airborne positions may help predict **ETA or remaining flight time**, a **different prediction state** from T−24h PRE. A position point is **not** by itself a verified exact wheels-off timestamp. Optional ADSB.lol/OpenSky/NOAA evidence must be assessed for actual availability, identity coverage, latency, license and purpose; their omission should not erase otherwise valid source-bound PRE.

### 10.2 Historical as-of features

[`historicalFeatureStore_v3.ts`](../../server/lib/disruption/historicalFeatureStore_v3.ts) enforces *bitemporal* eligibility: when a fact was true **and** when our system could know it. Historical tail/route, weather and network features have to satisfy these as-of rules before use in a PRE prediction. Function names include `getHistoricalFeatureAsOfResult` and `insertHistoricalFeature`.

### 10.3 Source/route data sufficiency auditor

[`phase5DaySourceQualityReadonly_v39.ts`](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) reads restricted aggregate metadata: planned/attempted/observed source, clock-safe PRE candidates, missingness/duplicates, spending and Day1 STOP. It does **not** read raw provider data to train a model.

[`phase5RouteAndModelDataSupportAudit_v39.mjs`](../../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs) is a **pure offline analysis of TRAIN/VALIDATION metadata only**, planned days 1–25; it refuses protected TEST days 26–31. It measures directed origin→destination route coverage, valid PRE, observed/censored/pending labels, missing tail and **joint rows** having *both* T−6h PRE and the matching observed outcome. It does not fit a model or certify adequate sample size. The associated [`phase5_route_model_data_support_audit_v39.test.ts`](../../tests/phase5_route_model_data_support_audit_v39.test.ts) uses fake days and routes to test correctness.

### 10.4 The Phase 7 modeling path is not “done” because evaluation-guard files exist

[`evaluationEngines_v39.ts`](../../server/lib/disruption/evaluationEngines_v39.ts) has pure split assignment and grouping rules; [`evaluationGuard_v39.ts`](../../server/lib/disruption/evaluationGuard_v39.ts) checks leakage and protected-test misuse. Under the currently documented first-cycle design, **days 1–20** train, **21–25** validation, and **26–31** protected test; same-flight revisions and linked records need proper grouping. The primary target/rights decisions are still subject to official Phase5 approval.

**This is evaluation scaffolding, not a trained XGBoost, neural network, or demonstrated traveler ETA prediction model.** A 31-day experiment may be too small or have insufficient verified physical outcome labels for some estimands. Good science measures that honestly rather than reporting fake accuracy.

---

## 11. Understand software safeguards versus real-world scientific proof

### 11.1 Three meanings of “worked”

1. **CODE EXISTS:** A file implements an operation.
2. **TEST PASS:** An offline test gave the function known synthetic inputs and got the expected outputs, or a disposable PG16 test checked SQL behavior.
3. **REAL OBSERVED PROOF:** A genuine approved production source was obtained, saved at the right clock, joined to the correct entity and independently read back.

These are not interchangeable. `Vitest` regression protects an expected behavior across future code changes, but it doesn't prove an airport will have enough flights or that a provider timestamp is physical reality.

### 11.2 Why there are tests with fake data

Suppose the scorecard receives **16 fake flights**, but only **11** have valid T−6h PRE records, **8** have qualified labels, and just **6 of the same flights have both**. A sound test checks the answer **6**, not `min(11,8)=8`. The code must refuse duplicates and invalid denominators. That's what the [route support test](../../tests/phase5_route_model_data_support_audit_v39.test.ts) demonstrates. It is intentionally **not** an actual Phase 6 sample-size result.

### 11.3 Why code and reviewers keep saying “HOLD”

HOLD means an operation is not yet permitted or its claim is not established. Examples:

- Query lacks an exact signed source/cost budget: **do not spend**.
- Source first arrived after a flight's PRE deadline: **record missed; never backfill**.
- A provider reports estimated runway time: **do not label verified actual wheels-off**.
- A required role lacks privileges: **refuse; don't fall back to the ordinary app DB user**.
- Optional weather/ADS-B is absent: **record feature missingness; don't reject an otherwise valid source-bound PRE solely for that**.
- Day1 actual POST hasn't happened because Phase6 hasn't been authorized yet: **do not demand this future evidence as a prelaunch receipt**.

**Relax operational brittleness where scientifically defensible; never relax evidence truthfulness or hard budget/legal constraints.** The [Nov10 bounded calendar flexibility proposal](2026-11-10_CALENDAR_CONTINGENCY_SCIENTIFIC_FLEXIBILITY_PROPOSAL.md) is a proposal, not an adopted new calendar contract.

### 11.4 No secret permission from flags, JSON or SHA

A supplied `approved: true`, `sourceClass` string, or hash means a caller **claims** an authority. Actual proof needs independently approved exact packets, correct credentials/grants and persisted readbacks. A GitHub CI badge verifies tests; it does not guarantee a legal right to retain AeroDataBox Contents or physical flight identity.

---

## 12. Code and workflow reference atlas

This is a **functional map of the pipeline-relevant files inspected or identified in the pinned repository**. It is not a claim that these are the only 309 files in `server/lib/disruption`, nor proof that every listed module is production commissioned. Paths are clickable relative to this document.

### A. Scientific plan and lifecycle checkpoints

| Read | Why |
|---|---|
| [V3.9-f.8 binding plan](../plans/V3.9_DataCollectPlan_f.8.md) | The intended research, source/identity/time rules and Phase6/7 evaluation constraints |
| [Owner Phases 1–5 field guide](PHASES_1_TO_5_OWNER_FIELD_GUIDE_AND_PHASE6_PRESTART.md) | The full explanation of project phases and responsibilities |
| [Nov10 minimum Phase5 exit](2026-11-10_MINIMUM_PHASE5_EXIT_AND_PARTIAL_PRE_POST_REUSE.md) | Four finite actual remaining work areas |
| [Nov9/10 engineering recovery checkpoint](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md) | Time-qualified code/PR/GO state; refresh against current main for live claims |
| [Existing DB atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md) | Actual B0062 baseline and V0079–V0083 SQL tables/columns |
| [Phase4 Nov6 original result](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md) | Exactly what the narrow live FIDS PRE/POST proved and didn't prove |

### B. Airport sampling, calendar, and early draw

| Actual code | Purpose |
|---|---|
| [`adbAirportCatalog_v3.ts`](../../server/lib/disruption/adbAirportCatalog_v3.ts) | Historical airport reference/catalog data |
| [`gate1Coverage_v39.ts`](../../server/lib/disruption/gate1Coverage_v39.ts) | Coverage qualification for airport frame decisions |
| [`experimentCalendarSolver_v39.ts`](../../server/lib/disruption/experimentCalendarSolver_v39.ts) | Parent-day/date/treatment/region/crossover geometry |
| [`phase5Prospective31DayShapeEnvelope_v39.ts`](../../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts) | 31-day shape, 21 still-future ordinary airport identities |
| [`phase5EarlyAdaptiveDrawOwner_v39.ts`](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) | Four atomic airport-slot selection writes, DB clock |
| [`phase5EarlyPreselectionReadback_v39.ts`](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts) | Proves saved draw and lead time, rejects invented late draw |
| [`phase5ProspectiveEarlyDrawClockContract_v39.ts`](../../server/lib/disruption/phase5ProspectiveEarlyDrawClockContract_v39.ts) | Strict first-source/T24 timing |
| [`phase5DynamicDaySourceGrid_v39.ts`](../../server/lib/disruption/phase5DynamicDaySourceGrid_v39.ts) | Stage6 pure query-grid proposal from committed airport selections |
| [`phase5CommittedDayGridReadonly_v39.ts`](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts) | Stage7 restricted actual calendar+draw database readback |
| [`phase5V0079DailyPreparedQueryProposals_v39.ts`](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts) | Stage8 pure reviewed exact request proposals |
| [`phase5F8CrossoverCalendarFreezeGuard_v39.mjs`](../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) | Crossover calendar structural guard |
| [`phase5F8SegmentedSourceCoverage_v39.mjs`](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) | Source-window partition/cost coverage |

**The 48 screened airports were a historical top-four-per-region×tier inspection, not the final random sample.** All 1,013 strict MID/REGIONAL candidates were considered by the later seeded full-frame selection; the five crossover templates use a much smaller sample, and ordinary days draw later. See [real B0062 screening and full-frame selection checkpoint](2026-11-09_ACTUAL_48_B0062_AND_FULLFRAME_FIVE_CROSSOVER_PRESELECTION.md). Screening/reference analysis was not a purchase of 1,013 AeroDataBox responses.

### C. Reviewed source preparation, API spend, FIDS original and data custody

| Actual code | Purpose |
|---|---|
| [`phase5ReviewedSourceDayPrepareOrchestrator_v39.ts`](../../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39.ts) | Invokes Stage7→8→9 from same actual saved day, **no GET** |
| [`phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts`](../../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts) | Stores approved query/partition in restricted transaction |
| [`phase5V0082SevenCategoryFreezePacket_v39.mjs`](../../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs) | Seven-category candidate budget, not actual signed approval |
| [`phase5V0082SevenCategoryBudgetFreezeWriter_v39.ts`](../../server/lib/disruption/phase5V0082SevenCategoryBudgetFreezeWriter_v39.ts) | Restricted budget/freezing writer code |
| [`phase5SourceUpcomingDueQueueReadonly_v39.ts`](../../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39.ts) | List due prepared source queries, read only |
| [`phase5ScopedFidsSourceBridge_v39.ts`](../../server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts) | One paid-reservation-before-GET original-custody coordinator |
| [`phase5V0079ScopedDbPorts_v39.ts`](../../server/lib/disruption/phase5V0079ScopedDbPorts_v39.ts) | Restricted DB reservation/original-binding adapters |
| [`aerodataboxLimiter_v3.ts`](../../server/lib/disruption/aerodataboxLimiter_v3.ts) | Actual provider HTTP, FIDS/client quota and Alert operations |
| [`fidsCensus_v3.ts`](../../server/lib/disruption/fidsCensus_v3.ts) | FIDS fetch, normalization, atomic response+population |
| [`fidsEnvelopeCanonical_v39.ts`](../../server/lib/disruption/fidsEnvelopeCanonical_v39.ts) | Canonical source envelope consistency fingerprint |
| [`phase5V0080GitHubPrearm_v39.ts`](../../server/lib/disruption/phase5V0080GitHubPrearm_v39.ts) | Bind and admit actual source request owner run |
| [`phase5V0079DailyPreparedQueryProposals_v39.ts`](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts) | Exact proposed query packet (no physical attempt) |

### D. PRE and independent proof

| Actual code | Purpose |
|---|---|
| [`preSnapshotBuilder_v3.ts`](../../server/lib/disruption/preSnapshotBuilder_v3.ts) | PRE deadlines, feature missingness, snapshot construction/INSERT |
| [`phase5V0079SingleBoundFlightPreWriter_v39.ts`](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) | Source/member/clock-bound one-flight PRE with actual postcommit readback |
| [`phase5V0079BoundFlightPreAsOfReadback_v39.ts`](../../server/lib/disruption/phase5V0079BoundFlightPreAsOfReadback_v39.ts) | Check source-bound flight PRE membership as-of |
| [`phase5T24IndependentPostCommitWitness_v39.ts`](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts) | Separate DB witness after T24 COMMIT |
| [`phase5T24WitnessedLaterHorizonGuard_v39.ts`](../../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts) | Validates T24 witness before specific later horizons |
| [`phase5NativeT24CommitWitnessReadonly_v39.ts`](../../server/lib/disruption/phase5NativeT24CommitWitnessReadonly_v39.ts) | Read-only evidence about native T24 durable state |

### E. Alert receiving, identity, semantic events and STOP

| Actual code | Purpose |
|---|---|
| [`server/routes_v3.ts`](../../server/routes_v3.ts) | HTTP webhook receiver, secret, raw-first acceptance and downstream processing |
| [`rawIngress_v3.ts`](../../server/lib/disruption/rawIngress_v3.ts) | Atomic raw delivery+items before HTTP success |
| [`flightNotificationExtractor_v3.ts`](../../server/lib/disruption/flightNotificationExtractor_v3.ts) | Normalize webhook JSON; missing→null |
| [`flightInstanceCanonical_v3.ts`](../../server/lib/disruption/flightInstanceCanonical_v3.ts) | Stable leg identity, aliases, codeshares and ambiguity |
| [`flightDataPrePostStore_v3.ts`](../../server/lib/disruption/flightDataPrePostStore_v3.ts) | Append immutable events and update convenient latest state |
| [`adbCollectionController_v39.ts`](../../server/lib/disruption/adbCollectionController_v39.ts) | Controlled Alert/batch creation, budget and STOP/status |
| [`gate3CallbackSixPlusSix_v39.ts`](../../server/lib/disruption/gate3CallbackSixPlusSix_v39.ts) | Historic bounded receiver evidence/retry guard |
| [`gate4ActionsStopIntegration_v39.ts`](../../server/lib/disruption/gate4ActionsStopIntegration_v39.ts) | Historic GitHub-driven independent STOP |
| [`phase5Phase6WebhookDestinationGuard_v39.ts`](../../server/lib/disruption/phase5Phase6WebhookDestinationGuard_v39.ts) | Deny paid subscription with unsafe/unverified callback destination |

### F. POST, outcomes, airborne and scientific assessment

| Actual code | Purpose |
|---|---|
| [`phase5FuturePostSourceEligibility_v39.mjs`](../../server/lib/disruption/phase5FuturePostSourceEligibility_v39.mjs) | Future date/partial true PRE → reviewable POST source |
| [`phase5V0083FuturePostOriginalDb_v39.ts`](../../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts) | Reserved future POST FIDS GET and actual original/readback |
| [`phase5V0083RestDedicatedRolePool_v39.ts`](../../server/lib/disruption/phase5V0083RestDedicatedRolePool_v39.ts) | Dedicated REST REVIEW/RESERVE role-pool checks |
| [`outcomeTerminalizer_v3.ts`](../../server/lib/disruption/outcomeTerminalizer_v3.ts) | Distinguish observed/pending/missing/canceled/target statuses |
| [`outcomeRecoveryOrchestrator_v39.ts`](../../server/lib/disruption/outcomeRecoveryOrchestrator_v39.ts) | Bounded outcome recovery logic |
| [`phase4Gate5NativeFidsFieldPresence_v39.ts`](../../server/lib/disruption/phase4Gate5NativeFidsFieldPresence_v39.ts) | Inspect native source field presence (not true event proof) |
| [`gate05RunwayDelayLabelAudit_v39.ts`](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts) | Refuse invalid physical wheels-off label |
| [`phase4Gate5G5AScheduleRevisionOutcome_v39.ts`](../../server/lib/disruption/phase4Gate5G5AScheduleRevisionOutcome_v39.ts) | Separate reported-schedule-revision outcome |
| [`airborneMaterializer_v39.ts`](../../server/lib/disruption/airborneMaterializer_v39.ts) | Reject bad position points; materialize airborne trajectory/snapshots |

### G. Data audits, dataset construction and protected evaluation

| Actual code | Purpose |
|---|---|
| [`phase5DaySourceQualityReadonly_v39.ts`](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) | Read-only real daily source/PRE/attempt/missingness quality |
| [`phase5RouteAndModelDataSupportAudit_v39.mjs`](../../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs) | Route + PRE/outcome joint sufficiency, protected TEST refusal |
| [`historicalFeatureStore_v3.ts`](../../server/lib/disruption/historicalFeatureStore_v3.ts) | As-of historical features and history completeness |
| [`evaluationEngines_v39.ts`](../../server/lib/disruption/evaluationEngines_v39.ts) | A/B/C/D/R splitting and population auditing |
| [`evaluationGuard_v39.ts`](../../server/lib/disruption/evaluationGuard_v39.ts) | Prevent hindsight leakage / test tuning |
| [`gate05RunwayDelayLabelAudit_v39.ts`](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts) | Ensure model's physical delay label is not an estimate |

### H. Workflows and actual command entrypoints: “Who calls the functions?”

| Workflow | Real execution boundary |
|---|---|
| [Six-slot early four-airport draw](../../.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml) | Inert/approval-gated GitHub early draw entrypoint; not a complete full-season owner |
| [Signed future-day source PREPARED manual](../../.github/workflows/phase5-one-signed-future-day-source-prepared-main-manual.yml) | [Script](../../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39.ts); database query preparation, **zero provider GET** |
| [Reviewed one FIDS GET manual](../../.github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml) | [Script](../../scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts); one authorized source attempt |
| [Signed native T24 PRE+witness manual](../../.github/workflows/phase5-one-signed-native-t24-pre-witness-main-manual.yml) | [Script](../../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39.ts); one per-flight native PRE+witness |
| [Signed witnessed T6/T90 manual](../../.github/workflows/phase5-one-signed-witnessed-later-pre-main-manual.yml) | [Script](../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts); subsequent cutoff-safe PRE |
| [Signed future V0083 POST manual](../../.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) | [Script](../../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39.ts); paid-capable but separate GO/role/rights gates |
| [Scheduled upcoming source queue observer](../../.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml) | Reads due request metadata, **explicitly no paid provider execution** |

Example YAML concepts from those files:

- `workflow_dispatch` = operator must explicitly invoke this workflow.
- `pull_request` = review/CI checks; often secrets are empty and real HTTP/database access disabled.
- `schedule: - cron: ...` = a GitHub periodic runner; **may be only a read-only observer**, not the paid collector.
- `if: ...` = gates whether a job can run; must not confuse an inactive job definition with live proof.
- `env`/`secrets` = runtime configuration. The existence of a secret name in YAML does **not** mean the secret value is installed or its approval is true.
- `concurrency` = protect against overlapping runs of the same logical operation.

### I. Database migrations and tests

| File | What to inspect |
|---|---|
| [B0062 baseline schema](../../migrations/baseline/B0062__v39_schema_baseline_20261001.sql) | Main normalized research tables and earlier operational schema |
| [V0079 source custody and budget](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql) | Approved query / physical reservation / original binding |
| [V0080 GitHub physical run identity](../../migrations/staged/V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql) | Bind real Actions owner to request |
| [V0081 independent witness](../../migrations/staged/V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql) | Independent after-COMMIT DB-clock record |
| [V0082 REST seven-category/source partitions](../../migrations/staged/V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql) | Exact request/grid budget and per-category limits |
| [V0083 other outcome REST reservation](../../migrations/staged/V0083__phase5_nonfids_five_category_physical_rest_reservation_v39.sql) | Dedicated physical non-base-FIDS REST reservations |

**Recommended tests to read in source order:**

- [FIDS identity fail-closed](../../tests/fids_identity_failclosed_v39.test.ts)
- [FIDS population retention](../../tests/fids_population_retention_v39.test.ts)
- [Dynamic day source grid](../../tests/phase5_dynamic_day_source_grid_v39.test.ts)
- [Real saved early draw readback](../../tests/phase5_early_preselection_readback_v39.test.ts)
- [Stage8 query proposals](../../tests/phase5_stage8_v0079_prepared_day_proposals_v39.test.ts)
- [Scoped source bridge](../../tests/phase5_scoped_fids_source_bridge_v39.test.ts)
- [Real PG16 Stage14 PRE](../../tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts)
- [T24 witness chain](../../tests/phase5_t24_pre_independent_witness_chain_v39.test.ts)
- [Future POST partial-PRE eligibility](../../tests/phase5_future_post_source_partial_pre_eligibility_v39.test.ts)
- [Route/model data-support audit](../../tests/phase5_route_model_data_support_audit_v39.test.ts)
- [Day/source QA](../../tests/phase5_day_source_quality_readonly_v39.test.ts)
- [Future POST V0083 real DB adapter](../../tests/phase5_v0083_future_post_real_db_adapter_v39.test.ts)

**Do not run paid-capable GitHub workflows to study them.** Reading source/test files is sufficient. A Vitest test passing fake flights or a disposable PG16 instance is **not** a real Phase6 provider response or a Phase7 trained model.

---

## 13. Frequent phrases from the documents, translated

| Complicated phrase | What it actually means |
|---|---|
| **Pipeline** | Repeatable chain from a source to saved/checked analytical records |
| **Source original** | The preserved response or received notification evidence, subject to rights |
| **FIDS normalization** | Convert airport-board JSON to consistent typed flight records without inventing missing facts |
| **Source-bound PRE** | An early snapshot traceable to an actual eligible saved source, not made up from a later response |
| **Population denominator** | All eligible opportunities, including ones whose outcome is missing |
| **Four airport slots** | Four selected airports per batch-day, **not four flights** |
| **Five crossover pairs** | Five selected four-airport groups each repeated under different observation-window treatments |
| **Directed O–D** | Origin→destination route; reverse direction is a different route |
| **Conditional service identity** | A matched schedule service, not yet independently verified actual physical leg |
| **Physical API reservation** | Guarded allowance for a *real paid network GET*; unrelated to aircraft motion |
| **Original binding** | Database proof that one response belongs to one exact authorized request |
| **T24 witness** | Separate DB check that the snapshot committed before the deadline, not a human or airplane observer |
| **Lineage / provenance** | Trace which raw observation, request, transform, time and flight key produced each derived row |
| **PG16** | PostgreSQL 16; disposable PG16 means throwaway database used for software tests |
| **SHA/digest** | Reproducible fingerprint; not a source signature or permission |
| **READ-ONLY audit** | Check/aggregate existing records without altering them |
| **Sufficiency scorecard** | Counts usable flights, matched labels, routes, missingness and costs; NOT model accuracy |
| **Scientific FREEZE / Phase6 GO** | Independent final approved rules / separately authorized paid start |
| **“Installed 16, zero rows”** | At that audited moment, new ledger structures existed but weren't populated; old data was not erased |
| **Unknown / pending** | Evidence is unavailable / outcome awaits resolution; not automatically “on time” |
| **Censored** | A properly defined limited-follow-up outcome, not a universal alias for every missing value |
| **Model leakage** | Future information accidentally used as a past feature or TEST data used to tune |

---

## 14. Self-guided reading lab: exactly what to click, in order

**Lab A — “Where does AeroDataBox GET actually happen?” (10–20 minutes)**

1. Open [FIDS census](../../server/lib/disruption/fidsCensus_v3.ts#L569-L590); locate `fetchFidsPopulation` and `fetchFidsAirport`.
2. Open [HTTP client](../../server/lib/disruption/aerodataboxLimiter_v3.ts); find `fetchFidsAirport`, the API path, provider headers, timeout and category.
3. Return to [FIDS census](../../server/lib/disruption/fidsCensus_v3.ts#L861) and find `persistFidsObservation`, `BEGIN`, `INSERT INTO`, `COMMIT`.
4. Explain why **one FIDS HTTP request can create one response row and many normalized population rows**.

**Lab B — “Why don't we just count all flight numbers?”**

1. Read [flight identity module](../../server/lib/disruption/flightInstanceCanonical_v3.ts) top comment and `dedupCodeshares`.
2. Read [FIDS census](../../server/lib/disruption/fidsCensus_v3.ts) `classifyScope` and `normalizeFidsRecord`.
3. Describe the difference between an operator's flight, a marketing codeshare, an aircraft tail, a service date and a directed route.

**Lab C — “How does a webhook arrive and get saved?”**

1. Open [routes](../../server/routes_v3.ts#L407-L455), find `webhookIngress`.
2. Find the call `persistRawDeliveryTransaction`, then open [raw ingress](../../server/lib/disruption/rawIngress_v3.ts#L207-L254).
3. Find `appendResearchEvents` and `upsertFlightNotifications` in [store](../../server/lib/disruption/flightDataPrePostStore_v3.ts).
4. Answer: why is the **raw source** saved before HTTP 200, and why are **immutable research events** different from latest state?

**Lab D — “How do we enforce T−6h?”**

1. Open [PRE builder](../../server/lib/disruption/preSnapshotBuilder_v3.ts#L60-L135), read `selectFeatureValue` and `buildPreSnapshot`.
2. Open [Stage14 writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts#L365-L430), find `features: []`, `persistPreSnapshot` and after-COMMIT readback.
3. Open [witness](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts), identify the **second** transaction.
4. Explain why a flight observed at 08:45 cannot be presented as a T−90m snapshot from 08:30.

**Lab E — “Can GitHub run the month itself?”**

1. Open [Stage7→9 orchestrator](../../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39.ts).
2. Open the [manual signed source PREPARED workflow](../../.github/workflows/phase5-one-signed-future-day-source-prepared-main-manual.yml): `workflow_dispatch` is **manual**, the PR path is **no provider**.
3. Open [read-only scheduled queue](../../.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml): the cron **does not** grant paid GET.
4. Open [future V0083 manual POST](../../.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml): paid-capable but explicitly demands source rights/GO and dedicated DB roles.
5. Answer: **which missing integration would turn these controlled separate jobs into one unattended approved Phase6 owner?**

**Lab F — “Is the dataset large enough to model?”**

1. Open [route audit](../../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs).
2. Open its [synthetic tests](../../tests/phase5_route_model_data_support_audit_v39.test.ts); find why 11 PRE and 8 outcomes can have only **6 joint matched rows**.
3. Open [evaluation engines](../../server/lib/disruption/evaluationEngines_v39.ts) and [guard](../../server/lib/disruption/evaluationGuard_v39.ts).
4. Answer: what does a PASS on a **software-counting test** prove, and what does it **not** prove about actual model accuracy?

You can answer these labs verbally in chat. You do **not** need to run any code, install anything, create tables, dispatch Actions, or share secrets.

---

## 15. Reality check, exact stage of completion, and guardrails

At the pinned GitHub snapshot:

- **REAL / HISTORICAL:** prior airport frame/Phase2 sampling, narrow Phase3 paid Alert/receiver/STOP evidence, and Phase4 genuine FIDS source→population→cutoff-safe PRE→later POST schedule-version evidence.
- **BUILT / TESTED COMPONENTS:** V0079–V0083 structures and scoped roles, saved draw, Stage6–9 source plans, one guarded source GET bridge, per-flight PRE, independent T24 witness, qualified future POST eligibility, manual future POST path, daily source QA and route audit logic.
- **NOT COMPLETED / NOT PROVED:** an independently signed first-cycle scientific target and lawful source retention/ML-use package; the actual fully authorized future 31-day calendar and charge-day budget; fully connected **unattended** GitHub source→PRE/witness→POST/receiver/STOP; complete dedicated POST REST commissioning; signed Phase5 science FREEZE and **separate** paid Phase6 GO; universal genuine physical wheels-off outcomes; Phase7 trained/evaluated reliable prediction accuracy.
- **SOURCE-CLASS LIMITATION:** Historical FIDS schedule-version evidence is valuable, but not the same as verified physical departure-delay outcomes for the original worldwide target. The rich modeling candidates/Amendment E remain proposals unless separately reviewed/adopted.
- **NO NEED:** to reinstall V0079–V0083, redo an old paid WSSS-only FIDS pilot, backfill missed horizons, or fabricate actual outcomes just to mark the pipeline green.

**For up-to-date operational status**, consult current [main branch](https://github.com/HKcode22/ReplitTranvr/tree/main), the [latest engineering checkpoint](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), live Actions and a **time-stamped restricted database readback**. This educational document is pinned to a known code snapshot; other concurrent engineering work on `main` may have progressed since it was created.

### Final mental model

**Source → verified original → correct member/identity → correct as-of PRE → independently recorded receipt → later qualified POST/UNKNOWN → measured coverage → protected modeling**.

The software engineering protects **how evidence moves and when it becomes usable**. The data science protects **what the evidence actually means, which population it represents, and whether a model can predict anything useful from it**. Both disciplines are necessary; neither can replace the other.

**This file is educational only.** It does not trigger a paid provider request, change scientific rules, authorize retention, create an auto-running pipeline, or close the Phase5/Phase6 release gates.
