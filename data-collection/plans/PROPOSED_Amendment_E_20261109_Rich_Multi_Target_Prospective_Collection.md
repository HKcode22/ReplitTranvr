# PROPOSED Amendment E — richer, evidence-tiered, multi-target prospective flight collection
**Prepared 2026-11-09 | Owner discussion draft | Branch: `docs/owner-phase5-target-clarity-20261109` | NO AUTHORITY / NO GO**

> This document answers the owner's request for a stronger, more useful traveler-disruption prediction study than only the binary provider-schedule-revision >=15-minute endpoint proposed in the November 7 Amendment D. It is a **PROPOSAL**, not an adopted change to the binding [V3.9-f.8 plan](V3.9_DataCollectPlan_f.8.md); it does not modify previous Phase 2–4 evidence, approve API spend, grant data rights, initiate Phase6, merge to `main`, or authorize retrospective relabeling. The concurrent engineering chat may **review** this independent documentation without replacing its present critical path.

## 0. Owner's actual concern and proposed design principle

The user wants Phase6 to collect **as much accurate, useful, verifiable, time-valid, lawful data as feasible**, from the already approved experimental sampling design and budget, so Phase7 may support genuinely useful predictions (delay minutes, probabilistic severe disruption, cancellation/diversion, arrival/airborne ETA) rather than merely the question "did a provider schedule change by fifteen minutes?". The concern is **not** a request to bypass sample design, add unbounded provider calls, retroactively backfill PRE, violate Contents retention, or re-run old paid pilots.

The safe interpretation is **rich *predefined* evidence capture, not post-hoc discovery of a flattering headline target**:
- predefine multiple prospective measurement/label definitions and their **source evidence requirements**;
- BEFORE future primary-outcome collection, independently choose/register **one primary first-cycle hypothesis, eligibility population, metric, baseline, treatment/cost and 20/5/6 split**; declare other endpoint families secondary or exploratory;
- do NOT infer missing source/outcome as zero; do NOT combine conditional service keys with verified physical operating legs without distinct labels/strata;
- train/tune algorithms in Phase7 on TRAIN/VALIDATION only, evaluate protected TEST once; report honest null/inconclusive or data-inadequate results;
- do not require all optional endpoints/features to be available on every flight or block eligible PRE when optional ADS-B/weather is missing.

## 1. The original scientifically meaningful architecture is already more than a binary schedule change

[Original binding f.8](V3.9_DataCollectPlan_f.8.md) §2 and §6.1 envisioned two prediction states:
1. **PRE at T−24h, T−6h, T−90m**: actual gate-out / wheels-off departure delay minutes, arrivals/disruptions, cancellation/diversion probabilities, potentially subgroup/route analysis.
2. **AIRBORNE / POST**: independently verified airborne state and time-available position → landing ETA, remaining time, arrival delays, >=15/>=60-minute risks and diversion. POST outcome observations are not smuggled into PRE features.

The original f.8 §13.2 first-cycle primary was *physical gate-out/wheels-off departure delay in continuous minutes* with XGBoost versus persistence and an MAE comparison. [Schedule-revision Amendment D](V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md), still DRAFT, proposes **a different first-cycle primary**: at T−6h predict whether a provider `scheduledTime` version by T+2h changes by `abs(Δminutes) >=15`; probability classifier with Brier score against TRAIN-only event-rate baseline. This event is **not actual physical delay**. The November 6 G5A pilot contained 36 horizon comparisons for 12 *conditional* service keys and **no positive >=15-minute revisions**. The 36 are repeated correlated comparisons, NOT 36 independently randomized flights, and are insufficient to claim the alternate event is predictable.

**The two documents called “Amendment D” concern different subjects**: the November 7 D concerns first-cycle target; the November 8 D concerns a **prospective four-HUB sampling scope**, not another alternative model. [The latter](V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md) also remains not fully independently signed/activated.

## 2. Evidence reality check — NOT “AeroDataBox never gives actual movement”

**Official provider evidence:** AeroDataBox publicly advertises actual flight takeoff/landing times and runway data at *some* airports using inferred ADS-B tracks. Its own 2020/2022 explanation explicitly warns of limited geographic coverage, non-guaranteed availability/correctness, and retroactive production. Therefore the categorical claim “AeroDataBox has no physical departure timestamps” is **false**. Source: https://aerodatabox.com/flight-take-off-and-landing-time-runway-detection-based-on-ads-b-data-more-flights-and-status-updates/ . The official OpenAPI documentation can identify the current **endpoint/field** definitions, but marketing capability does NOT establish field semantics, availability, or permitted use for each real sampled flight or subscription: https://doc.aerodatabox.com/ .

**Actual project evidence:** [Independent Nov6 Phase4 Gate5 decision](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md): 9 authentic PRE FIDS originals, 12 matched *conditional scheduled-service identities*, 36 genuinely cutoff-safe PRE snapshots, 3 POST FIDS originals, 36 schedule-version comparisons (<15m), **zero positively certified provider-native operating-leg IDs and zero actual-only wheels-off labels in that G5A audit**. The conclusion is **not yet verified in this sampled data**, not **impossible from provider**.

**ADSB.lol:** public readsb-style positional signals (ICAO 24-bit hex, callsign, lat/lon, altitude, ground/airborne, velocity, source/seen clocks) may be useful for separate physical proxy or airborne ETA. However a position or derived takeoff time is NOT by itself an exact wheels-off or proven match to a marketed airline service; first ensure robust aircraft-to-flight/service identity, provenance, timestamp and coverage; validate ODbL and rate/access conditions. See https://github.com/adsblol/api and https://api.adsb.lol/docs . Nov6 decision records a different Oct29 pilot of 12 observed aircraft / 11 recent positions **not persisted or positively linked** to Nov6 flights. Do not join unrelated cohorts to create fake actual labels.

**Optional US validation**: delayed BTS scheduled/actual departure and `WheelsOff` may provide a US-only reference subset after matching exact operating flight/date/airports and respecting public release lag; this does not solve non-US label coverage or real-time feature availability. NOAA aviation weather can be an optional time-safe PRE feature if issued/available before cutoff. Neither is compulsory for every flight.

**Proposed minimal nonpaid validation audit (not an infinite new gate):** read-only inspect previously retained, lawful, unexpired source field names, role semantics and identity mappings; check `departure.runwayTime` and any actual/estimated discriminator from precise historical responses if available and legally usable. Tabulate for each of four HUBs and prospective MID/REGIONAL strata: denominator, source present, native leg match, actual-only runway/gate timestamps, ambiguous, estimate-only, unavailable/expired, label reconciliation with ADS-B or BTS where genuinely same cohort and allowed. Do not disclose protected payloads in public logs. If no lawful data are available, record **UNKNOWN**, not provider incapability; do not pay a redundant FIDS-only pilot merely to restate the known gap.

## 3. Candidate endpoint registry to capture/protect prospectively

| Candidate outcome | Unit/prediction | Exact source required | Evidence stratum / limitation | Possible use |
| --- | --- | --- | --- | --- |
| **Physical gate-out delay** | continuous minutes versus predeclared original scheduled gate reference | observed actual gate departure, matched operating leg, time/source provenance | strongest if actual gate-out semantics independently verified; never mix wheels-off | original first-cycle candidate (if verified) |
| **Physical wheels-off delay** | continuous minutes versus explicitly defined timetable reference | actual-only runway/takeoff event, verified operating leg/clock | inferred provider ADS-B event may be proxy rather than ground truth; attach quality tier | original first-cycle candidate (if verified) or secondary |
| **Probability of severe actual departure delay** | P(actual delay >= prespecified 15/60 min) | *same true physical label* above | needs positives, negatives, missing-label analysis; threshold predeclared | secondary; can produce traveler-readable risk |
| **Arrival delay / ETA** | continuous arrival delay or ETA with reference | verified actual arrival milestone and matching identity | distinguish gate-in / wheels-on; for airborne needs real as-of movement | separate supported model/phase |
| **Provider schedule revision (continuous)** | signed minutes of `scheduledTime` change over frozen interval | two comparable authenticated scheduledTime versions on same service | **not** physical flight delay; conditional/native stratified | supplemental numeric provider-behavior analysis |
| **Provider schedule revision >=15m** | binary/probability | same pair of provider source versions | candidate D; low demonstrated positive support in Nov6 pilot | predeclared alternate primary or secondary |
| **Provider-reported cancellation** | binary/probability + explicit UNKNOWN | qualified terminal provider cancellation status + valid identity | absent Alert callback is UNKNOWN, not false | separate secondary if outcome support |
| **Provider-reported diversion** | binary/probability + explicit UNKNOWN | qualified terminal diverted status + valid identity | rare; not necessarily independent physical arrival confirmation | separate secondary if outcome support |

**Not “more outcomes are always stronger”:** multiple labels can be correlated, incomparable, partially missing and introduce multiple-testing bias. Predeclare a hierarchy and report each denominator and validation separately. Do not call a probability/risk model “accurate” without a reliable held-out label and adequate events. Avoid using estimated takeoff as actual; do not call conditional scheduled-service identities certified operating flights.

**Proposed source observation envelope (rights/budget permitting):** preserve immutable provenance and minimum authorized fields for provider PRE schedule/status/airline/codeshare/route/flight identity, actual-vs-estimated distinction, available-at/observed clocks, optional onboard/aircraft identity if positively reported, weather issued-at fields, Alert source originals and source-grounded POST statuses, independently permitted ADS-B observed positions/ground-state for separate airborne subset. Record source-availability and absent/ambiguous cases for every expected eligible flight; neither extra optional source nor a positive outcome creates the PRE denominator.

**Crucial rights:** Existing [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) discusses AeroDataBox Contents purposes, cache TTL and training/backup rights. Prior paid account subscription and technical 24h cache don't prove that source data may be stored for month-long ML. Never implement “capture everything forever”; minimize/expire by lawful source class and preapproved training purpose, or exclude that class prospectively. This is a hard release prerequisite, not a generic request to email the provider endlessly.

## 4. What the 31-day design actually means, and what it cannot promise

The proposed sampling release design has **31 parent batch-days, each with 4 airport slots**: one selected HUB (WSSS/OMAA/SKBO/YSSY), two eligible but distinct MID-tier sites (MID_A/MID_B), one REGIONAL. Thus **124 airport-slot-day opportunities** (31×4), NOT 124 unique physical airports, flights, or API GETs.

- 26 parent days with one **4-hour exposed service window**.
- 3 parent days with **two active 2-hour windows separated by an inactive gap** (per reviewed experiment, 1 hour nominal gap). Flights in the inactive gap are outside that treatment's exposure denominator.
- 2 parent days with an **up-to-6-hour exposed window**, possibly stopped early for real budgets/safety.
- **Five crossover pairs** use the SAME four airports twice at matched weekday/UTC class under two different window treatments = **10 of the 31 parent days** and **40 paired airport-window review rows**. Not ten new airports and not 40 flights.
- Remaining **21 ordinary adaptive batch-days**: airport IDs are deliberately NOT chosen months ahead; each day will have four chosen early enough **before the first T−24h cutoff** using predeclared frame/probability and no outcome-peeking rules. **It is 21 *days*, not 21 airport identities.** Ordinary days alone provide 21×4=84 airport-slot assignments; sites may repeat subject to rotation/washout.
- The five matched pairs help compare sampling window shapes; 21 ordinary days diversify region/tier/time. The design balances *known* strata but cannot guarantee all world routes, positive delay events, perfect physical labels or generalization to all airports. Report selection probabilities and coverage separately.

The actual [Nov9 owner study guide](../phase5/2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md) cites an active frame of 4,346 airports, 1,125 broader PRE/POST-eligible airports, 4 selected HUBs, 19 unique airports within 20 paired slot assignments (SKBO reused), and five checked crossover sets. Those **frame/structural** counts do not prove actual eligible flight count, rich labels or representative route support.

**No arbitrary enlargement** of airports/days/GETs is authorized by this proposal. More flights from already eligible, already queried provider response data may be usable, but only with frozen inclusion, correct labels, rights and provenance. Missing outcome = missing/censored, not an excuse to redraw airports until an event is found. Record source failures, canceled/unknown status, codeshares, zero activity, segment gaps, region/airline/route/traffic density and horizon-specific attrition by denominators. Where sample power is weak, characterize it with uncertainty and plan a separately predeclared later cycle.

## 5. Clear definitions the owner requested

- **Eligible:** a service record that meets *prewritten* inclusion rules for a given observation/endpoint (e.g., selected airport, exposed window, correct timestamp and role). It doesn't mean a completed flight.
- **Stratum, plural strata:** a subgroup analyzed independently. **Native-leg stratum** = evidence-backed provider-native operating-leg ID across originals; **conditional-service stratum** = our source-grounded composite scheduled-service key. Do not silently pool them as identical physical flights.
- **UNKNOWN:** we have insufficient source/identity evidence to determine the outcome or status. Different from a genuine event that did not happen.
- **CENSORED:** a record was eligible/relevant, but its endpoint cannot be observed or evaluated in the specified time/window (e.g. the final comparable POST source is missing/expired). It is not a negative result.
- **20/5/6 chronological split:** of 31 ordered batch-days, first 20 TRAIN, next 5 VALIDATION (choose model/hyperparameters), last 6 locked TEST (final independent performance). Each flight/service and associated horizons/aliases must remain in one partition; never tune based on TEST.
- **First-cycle primary endpoint:** ONE preregistered question/metric and population for the main statistical claim, even though collecting multiple predeclared secondary/diagnostic endpoints is allowed subject to data rights.
- **Treatment / seed:** the treatment is an experimental observation-window strategy (4h vs split or up-to6h), not a patient therapy. A randomization seed makes its planned allocation reproducible before flight outcomes.
- **Calendar parent day:** one scheduled experimental batch, not necessarily a consecutive calendar date or every actual API charge day.

## 6. Translating the seven November 9 Phase5 release tasks to concrete operational questions

| Existing task | Human-readable question | When necessary |
| --- | --- | --- |
| 1. Scientific target/strata/split | What EXACT claim are we trying to predict, for which eligible flight population, at which cutoff, compared to what baseline? Which others are secondary, and what is UNKNOWN? | **Before scientific FREEZE / Phase6 outcome collection**; don't select primary after seeing test positives |
| 2. Rights and retention | Are we actually allowed to store each provider's raw/normalized records and use them for this ML purpose and duration? How are copies/backups expired? | **Before affected paid retained collection**, source-class by source-class |
| 3. 31-day calendar/treatments | Which 31 planned UTC batch-day dates/window types and fixed crossover sets, and when will each of four airport positions be selected? | Parent calendar and assignment rules **before GO**; actual 21 ordinary airport draws occur early but **during approved Phase6 operations** |
| 4. Source/REST budget | Which exact FIDS queries/refreshes/partitions could run, how much per physical UTC request day and per seven cost classes, when do we STOP? | Cost caps and schedule **before GO**; per-day actual request receipts upon operations |
| 5. Unattended GitHub owner | Can GitHub really execute approved early draw→prepared source→one bounded paid GET→source binding→three PRE→independent T24 witness→POST/Alert/STOP without manual clocks? | Dry/inert integration **before GO**; real source/PRE only after GO |
| 6. Independent Day1 quality | If data are missing/delayed/ambiguous/over budget, can an independent reader count expected vs observed and stop instead of fabricating success? | Decision code and thresholds **before GO**; actual quality observations **during Day1** |
| 7. Independent FREEZE vs Phase6 paid GO | Have separately reviewed science, rights, calendar, cost and owner code passed, and has paid activity separately been explicitly authorized? | **Before GO**. Green CI or installed tables alone not sufficient |

The latest owner inventory at Nov9 13:42 UTC found **16/16 scoped new tables and 7 NOLOGIN permission groups installed, all those 16 tables zero rows and Phase6 disabled**. That does NOT mean earlier `clean.flight_population` and `clean.flight_snapshots` were empty or lost. Source original and witness records for first future Day1 are bona fide **post-GO data** and should not be demanded before the Phase5 final FREEZE.

## 7. Proposed E decision sequence — finite, not perfection loop

**E0 (documentation now):** This file is an owner-requested idea / evidence-gap review. No main, SQL, account, Actions, source, budget or model behavior changes. No silent amendment activation.

**E1 (immediate nonpaid independent review, can coexist with Phase5 implementation):** validate actual AeroDataBox runway/gate field definitions and coverage eligibility, whether original/estimated/runway provenance can be distinguished in this subscription and known source originals, and whether any lawful same-flight ADS-B/BTS matches already exist. Save metadata-only table of verified / ambiguous / unavailable—not more unrelated pilots. Source/time/rights gaps become scoped limitations, not a ban on implementation.

**E2 (before release, the actual scientific choice):** compare (a) original physical departure delay with a measured label-coverage support threshold / possible original-gate HOLD, (b) D's provider schedule-revision target with sparse-positive warning, and (c) one explicitly proposed multi-endpoint hierarchy with named primary and secondary objectives. Make an owner-visible signed decision, specify outcome/grain, cutoff, label source and evidence tiers, baseline, metric, power/missingness and protected 20/5/6 split. If a genuinely verified first-cycle primary is not feasible, report HOLD or adopt a candidly narrower predeclared estimand; do not claim actual-delay accuracy based on proxy.

**E3 (freeze only feasible shared observation schema, not an ever-growing shopping list):** use existing Phase2 frame, Phase3 Alert receiver/STOP, Phase4 authentic FIDS PRE/POST pilot, V0079–V0083 source/role/budget code. A **small, finite** source/endpoint matrix identifies which raw fields and optional external sources are worth capturing if independently permitted and paid/latency feasible. Existing FIDS source GET may yield multiple fields per single observation. Never issue unlimited extra GETs, ignore source rights, or suppress PRE solely because optional features are absent.

**E4 (Phase6 prospective collection):** run approved 31 ordered batch-days/4 airport slots/day; record observed/unknown/censored/source gaps and actual budgets each day. No after-cutoff backfill, no dynamic choice of easiest airport/endpoint based on seen delays, no fabricated physical labels.

**E5 (Phase7):** fit simple baselines plus regression / calibrated risk / ETA models **only for endpoint-population pairs with real matched labels and adequate positives**. Use TRAIN/VALIDATION and one locked TEST; publish per-endpoint label coverage, event counts, errors/calibration, stratified region/route/airport performance, uncertainty and domain limitations. If the true labels are not learnable, the scientifically correct result may be "insufficient evidence"; it is not evidence that collected data or engineering are worthless.

### Explicit owner review notice (do not bypass)

Before any material switch of official target, population, four/five HUB scope, source-use, time windows, success metric, spend, calendar or training split, the owner should receive a plain-English current-vs-proposed change summary, consequences and exact references, and approve a dated reviewed manifest. Historical Amendment A/B/C/D status remains unchanged until independently superseded for **future** data only. **No silent ACCEPTED tag; no PR merge to main without owner-directed review.**

## 8. Sources and existing implementation to REUSE

- [Original Plan f.8](V3.9_DataCollectPlan_f.8.md), [Amendments A](V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md), [B](V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [C](V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [D schedule](V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md), [D four-HUB](V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md).
- [Phase4 actual partial scientific decision](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md); [Phase5 owner study guide](../phase5/2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md); [Phase5 exact finish list](../phase5/2026-11-09_WHAT_THE_FLIGHT_RECORDS_MEAN_AND_PHASE5_EXACT_FINISH_LIST.md); [Phase5 database atlas](../phase5/PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md).
- Official AeroDataBox takeoff/landing capability, including warnings: https://aerodatabox.com/flight-take-off-and-landing-time-runway-detection-based-on-ads-b-data-more-flights-and-status-updates/ ; official OpenAPI: https://doc.aerodatabox.com/
- ADSB.lol maintained source/API and ODbL terms: https://github.com/adsblol/api ; https://api.adsb.lol/docs
- Existing repo code `server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts`, `phase5ScopedFidsSourceBridge_v39.ts`, `phase5V0079SingleBoundFlightPreWriter_v39.ts`, `phase5T24IndependentPostCommitWitness_v39.ts` and Phase3 STOP/Phase4 PRE/POST are the integration starting points, not systems to replace.

**Final status: PROPOSED / OWNER-REVIEW PENDING.** No amount of drafting here proves exact current provider paid rights, enough actual-only labels, approved Phase5 FREEZE, or Phase6 GO.



## 9. November 9, 2026 source-field and code verification — concrete factual evidence

**This evidence appendix updates the proposal; it does not approve an amendment or alter the live experiment.** All authoritative provider definitions were checked against the publicly accessible [AeroDataBox RapidAPI OpenAPI v1.15.4.0](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json) and its official [AeroDataBox documentation front end](https://doc.aerodatabox.com/). Provider account/source-specific permission, actual identity or semantics remain independently unproven unless positive evidence is documented.

### 9.1 Exact provider fields — a timestamp value and its meaning are distinct

OpenAPI schema `FlightAirportMovementContract` identifies:

| Provider field | Official semantic wording/meaning | Allowed conclusion |
| --- | --- | --- |
| `departure.scheduledTime` | **Scheduled** arrival/departure (generic scheduled movement) | Provider schedule; **not** independently established scheduled wheels-off or scheduled gate-out |
| `departure.revisedTime` | **Actual or estimated** departure/arrival; when distinct from separately present runwayTime may stand for gate time, otherwise may be gate or runway | Cannot claim observed actual gate-out or takeoff just because populated |
| `departure.runwayTime` | **Actual or estimated** time on runway; takeoff for departing, landing for arriving, if known | Field presence alone **does not** reveal actual-vs-estimated |
| `departure.quality` | Data quality characteristics Basic, Live, Approximate | A `Live` array value does not independently certify that a particular `runwayTime` is **actual-only** |
| LiveUpdates / AdsbUpdates airport feed status | Coverage depends on airport and individual flights | Even a healthy feed is not a guarantee of physical labels for all observations |

Source: [official OpenAPI](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json), `FlightAirportMovementContract`, `FeedServiceStatusContract`. [AeroDataBox's original runway/ADS-B announcement](https://aerodatabox.com/flight-take-off-and-landing-time-runway-detection-based-on-ads-b-data-more-flights-and-status-updates/) **does** describe actual takeoff/landing capability but explicitly warns of limited coverage, possible wrong/incomplete tracks, and retroactive inference. Historical airport examples are NOT a current per-flight warranty.

A separate timestamped **Nov 1, 2026 real paid WSSS FIDS one-call metadata-only check** was already documented in [Phase4 one nonretained source semantics check](../phase4/2026-11-01_GATE5_REAL_PAID_FIDS_ONE_NONRETAINED_SEMANTIC_CHECK.md): 113 departure *observations*, 25 operator-tagged, 88 marketing/codeshare, `scheduledTime` 113, `revisedTime` 113, **`runwayTime` 0**. These are only *one request's field-presence counts*, not 113 unique operating legs and not proof runwayTime is never supplied by the API. No per-flight Contents were retained from that metadata-only check.

The code's semantic caution has been explicitly documented since [Phase4 Oct31 provider-native semantic-lineage guard](../phase4/2026-10-31_GATE5_PROVIDER_NATIVE_SEMANTIC_LINEAGE_GUARD.md), the [Phase3 Oct27 paid withLeg A/B test](../phase3/2026-10-27_GATE05C_FIDS_WITHLEG_PAID_SCHEMA_RETEST_PROTOCOL.md) and the [Phase4 Nov2 fallback protocol](../phase4/2026-11-02_GATE5_RESEARCH_FALLBACK_TARGET_PROTOCOL_DRAFT.md). The **Nov6 G5A decision** reports zero positively certified actual-only wheels-off labels in the audited same cohort: [Phase4 Nov6 Gate5 residual decision](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md). This is not a vendor-wide impossibility claim.

### 9.2 Actual existing code pipeline — what is implemented versus what is merely an intended gate

```text
AeroDataBox FIDS REST response
    |
    v
aerodataboxLimiter_v3.ts (HTTP client)
    |
    v
fidsCensus_v3.ts:
  fetchFidsPopulation() -> normalizeFidsRecord()
  -> source decoded-body hash and availability
  -> persistFidsPopulationAtomic()
       clean.fids_query_response (query/raw original)
       clean.flight_population (normalized members)
    |
    +--> phase4Gate5NativeFidsFieldPresence_v39.ts
    |    read-only counts presence: scheduled/revised/runway/quality
    |    DOES NOT certify each runwayTime as actual
    |
    +--> gate05RunwayDelayLabelAudit_v39.ts
    |    assessGate05ExactRunwayDelayV39() — PURE classification/guard
    |    needs external evidence of actual semantics, scheduled runway
    |    baseline and positively verified operating-leg match
    |    otherwise gives NULL physical-delay minutes and
    |    SOURCE_SEMANTICS_UNVERIFIED / PENDING / MISSING
    |
    +--> outcomeTerminalizer_v3.ts
    |    terminalizeTarget() considers externally supplied
    |    actualUtc + actualVerified and operational status:
    |    observed, pending, missing or not_applicable
    |    persistOutcome() stores to clean.flight_outcomes
    |    DOES NOT by itself authenticate actualVerified
    |
    +--> phase4Gate5G5AScheduleRevisionOutcome_v39.ts
         distinct source-grounded *scheduled-version revision* outcome,
         NOT a physical departure label

optional independently identified ADS-B position/airborne pipeline:
raw position/event -> airborneMaterializer_v39.ts
  -> quarantine bad/unjoinable points
  -> clean airborne points, trajectories, airborne snapshots
  -> physical departure milestone properties remain NULL
     unless separate, actually evidenced and admitted
```

**Useful source code with navigation ranges (main, verified Nov9):**

- [`fidsCensus_v3.ts`](../../server/lib/disruption/fidsCensus_v3.ts): **lines 558–640** fetch provider FIDS, validate decoded original hash and normalized arrays; **lines 845–908** transactionally save original request/response metadata then flight population members; **lines 387+** normalize source record and identity. Raw persistence is retention/permission-scoped, not an entitlement to warehouse Contents indefinitely.
- [`phase4Gate5NativeFidsFieldPresence_v39.ts`](../../server/lib/disruption/phase4Gate5NativeFidsFieldPresence_v39.ts): **lines 20–39** SQL checks whether `departure.scheduledTime.utc`, `departure.revisedTime.utc`, `departure.runwayTime.utc`, quality and operating-vs-marketing tags are present; **lines 75–100** returns actual-only labels **NULL** and `NATIVE_FIELDS_PRESENT_NOT_ACTUAL_ONLY_PROOF`, never a false observed runway event.
- [`gate05RunwayDelayLabelAudit_v39.ts`](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts): **lines 7–20** types `VERIFIED_ACTUAL_WHEELS_OFF`, `VERIFIED_SCHEDULED_WHEELS_OFF`, `GENERAL_SCHEDULED_DEPARTURE`, `ESTIMATED_RUNWAY`, `ADSB_INFERRED_TAKEOFF_PROXY`, `UNKNOWN`. **Lines 61–98:** requires externally authenticated meaning and independently verified operating leg; only then calculates `(actual - scheduled) / 60000`; otherwise `runwayDelayMinutes: null`. **Pure code, no DB write, no provider I/O.** An arbitrary caller Boolean is not cryptographic or independent scientific verification by itself.
- [`outcomeTerminalizer_v3.ts`](../../server/lib/disruption/outcomeTerminalizer_v3.ts): **lines 100–145** target-specific `observed/pending/missing/not_applicable` status based on externally supplied `actualVerified`; **lines 192+** SQL `INSERT ... ON CONFLICT UPDATE` into `clean.flight_outcomes` when a caller invokes persistence. This is a *capability*, not proof the Nov6 flight rows were populated or actuality verified.
- [`phase4Gate5G5AScheduleRevisionOutcome_v39.ts`](../../server/lib/disruption/phase4Gate5G5AScheduleRevisionOutcome_v39.ts): **lines 75–151** compares two valid as-of provider schedule versions; returns observed revision category or explicit UNKNOWN, and `actualDepartureDelayClaimed=false`.
- [`airborneMaterializer_v39.ts`](../../server/lib/disruption/airborneMaterializer_v39.ts): **lines 49–64** reject unjoinable/invalid positions; **lines 94+** materialize eligible airborne state; **lines 219–222** explicitly pass `actualWheelsOffUtc:null`, `actualGateOutUtc:null`, etc. into snapshot construction. A track is not automatically a physically verified runway event.
- [`phase4Gate5DualSourceAdsbAdmission_v39.ts`](../../server/lib/disruption/phase4Gate5DualSourceAdsbAdmission_v39.ts) and [dual-provider plan](../phase4/2026-11-01_GATE5_ADSB_LOL_DUAL_PROVIDER_PLAN_AND_IMPLEMENTATION_SUPPLEMENT.md): offline aircraft-to-flight/source-clock/ODbL gate, **not** a confirmed deployed full live trajectory-to-actual-only label integration.

**Critical distinction:** We *have* modular normalization and validation code. We **have not verified a production end-to-end rule** that ingests arbitrary AeroDataBox `runwayTime`, independently determines actual-versus-estimated for every flight, links it to a physical operating leg, stores a validated continuous physical-delay label, and supplies it at scale for the original f.8 intended population. Until verified, leave the label `NULL` / status `SOURCE_SEMANTICS_UNVERIFIED` or target-specific pending/missing, rather than treating a populated timestamp as actual.

### 9.3 Source use, license and numerical-science cautions grounded in current 2026 sources

- AeroDataBox's [September 7–8, 2026 Terms update](https://aerodatabox.com/2026-09-terms-update) states a **default 7-day caching cap**, plan-specific exceptions, and a stated November 7, 2026 grace-date change for existing subscribers. **Provider billable quota is not legal consent for a 31-day raw/normalized source training warehouse**. The exact account's purposes, license and backups/expiry remain [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) to resolve before affected retained collection; do not infer legal advice or automatic derived-work exception from technical TTL.
- [ADSB.lol API](https://api.adsb.lol/docs) says the public API/data are licensed ODbL and explicitly asks production users to contact the operator. ODbL and receiver coverage need review; no universal ADS-B ground truth assumption.
- [U.S. BTS on-time data field definitions](https://transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ) explicitly distinguish `CRSDepTime` (scheduled gate departure), `DepTime` (actual gate departure), and `WheelsOff` (wheels-off time). **Do not compute wheels-off delay as BTS `WheelsOff - CRSDepTime` and silently label it a matched scheduled-runway baseline.** The [Phase4 BTS checkpoint](../phase4/2026-11-02_GATE5_FREE_BTS_ACTUAL_WHEELSOFF_MONTHLY_SOURCE_VERIFICATION.md) verified only external source schema/availability for historical U.S. domestic flights, not exact same-flight AeroDataBox join.
- Statistical comparison: predeclare per-label estimand, positives/negatives/missingness and distinct prediction-vs-observation times; evaluate physical-minute regression with appropriate MAE or other predeclared metrics, a probability/classification target with proper probability score (e.g. Brier), and airborne ETA against matched actual arrival milestones. In a pilot with **zero positive provider schedule-revision events**, observed event classification discrimination such as AUROC cannot be estimated for that pilot. The 36 Nov6 horizon comparisons are *correlated observations on 12 service keys*, not 36 independent randomized flights. Block/cluster by batch-day and same flight for evaluation; a 20/5/6 day split is a **design** not evidence of adequate event power. Report confidence intervals, calibration and site/route coverage only when denominators permit; do not promise an arbitrary accuracy or “nearly exact” prediction.
- The 2026 AeroDataBox OpenAPI describes actual/estimated runway information and the provider has ADS-B-based actual takeoff/landing capability in principle, but neither guarantees **this experiment** can independently disambiguate physical label semantics at every airport and actual operating leg. Do not spend more solely to repeat a known source-only FIDS pilot; a bounded metadata-only source/field-to-label audit is the finite prelaunch investigation.

### 9.4 Operator-friendly explanation of the Phase5 release-manifest/owner language

- **Release manifest**: one reviewed, versioned *configuration contract*, not a response from AeroDataBox. It pins primary research target and population, calendar/treatments, source/retention approvals, budgets, owner code hashes, cutoff/STOP rules and required independent review.
- **Unattended owner**: GitHub Actions workflows and restricted database workers acting according to that contract; not a person, a provider, or the ChatGPT model running silently forever.
- **`calendar=0`/`budget=0`** in the Nov9 inventory: no committed *future experiment setup rows* in the corresponding scoped tables at that particular timestamp. **`sourceQuery=0`**: no prepared future source request in the scoped new ledger yet. These are **not** statements that Phase2–4 never requested AeroDataBox or that historical flight records vanished.
- **Prelaunch**: future 31-day dates/window rules, first-cycle scientific target, lawful source-class use, signed budget/STOP and tested integrated scheduler must be ready; **after-GO**: first future Day1 exact airport draw, actual paid FIDS request/reservation and provider original, per-flight PRE saved at true cutoffs, `sourceOriginalBinding` and `t24Witness`. Demanding actual future Day1 response before Day1 is legally authorized is a circular test.
- **No future PRE backfill**: if the T−24h cutoff was yesterday and the provider returned information only today, that response can never be claimed as a genuine yesterday-as-of prediction feature.
- **No fake signed permission**: don't set an owner/reviewer/provider-rights approval flag merely to let the workflow run; no blanket block on independently valid offline preparation.
- Reuse Phase2 airport reference/coverage, Phase3 paid Alert owner/receiver/STOP and Phase4 FIDS source→PRE→POST pilot, rather than pay to repeat an already resolved transport/cutoff mechanism.

**End of verified evidence appendix. The proposal remains review-only, not an accepted change to primary outcome, legal interpretation, production code or Phase6 GO.**
