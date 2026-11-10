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
