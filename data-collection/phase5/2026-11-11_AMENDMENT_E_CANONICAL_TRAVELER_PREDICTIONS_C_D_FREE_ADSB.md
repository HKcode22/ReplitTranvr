# Amendment E — unified traveler-first prediction and data-collection decision (November 11, 2026)

> **Owner decision:** Keep **one** canonical Amendment E, without future E2/E3/F/G naming. E is the broad traveler-oriented *design direction*, not permission to invent verified physical labels, alter historical outcomes, spend provider credits, operate a second paid ADS-B service, or activate Phase 6. This document is the forward-looking **index and decision sheet**; the earlier E2-labeled file is a historical technical working paper, not a new amendment. Preserve the original A/B/C/D1/D2/E records, f.8 and their revisions as provenance. **Phase 5 scientific FREEZE: HOLD. Phase 6 paid GO: NO.**

## A. What we are optimizing

A traveler's question is not merely "yes/no delayed?" It is: **when will I actually leave and arrive, how uncertain is that, what could go wrong, and when will you update me?** Our dataset should support useful, calibrated, time-aware answers while respecting observations and costs. More complex models are not automatically more predictive.

| Prediction stage | Forecast issue time | Proposed outputs | Allowed inputs |
| --- | --- | --- | --- |
| PRE early | T−24h | Baseline departure delay distribution, status risks | Originals and features genuinely received by the issued timestamp |
| **PRE principal** | **T−6h** | **Actual departure delay in minutes**, q10/median/q90, ≥15/30/60/120-minute risk, separate cancellation likelihood | Airline, origin/destination/route, applicable weather/traffic, revisions and historic context *as of T−6h* |
| PRE update | **T−90m** | Updated distribution and risk, difference from T−6h; no retroactive overwrite | New genuine observations available by T−90m |
| AIRBORNE conditional | after independently authenticated takeoff | Arrival ETA in UTC/local time, time remaining, ETA uncertainty, diversion/arrival-delay risk | Only matched aircraft positions, destination and weather/traffic known at the *airborne* issue time |
| POST/outcome | after actual outcome | Observed gate-out / wheels-off / wheels-on / gate-in and source-specific confidence, cancellation, diversion, missingness | Can produce labels/evaluation, **never** augment a past PRE snapshot |

**One first-cycle primary target, not only one forecast:** choose **T−6h departure delay in continuous minutes** as the preferred first-cycle primary endpoint *conditional on verified same-milestone original scheduled departure and actual gate-out labels, scope/rights and sufficient coverage*. Measure negative early minutes as well as positive late minutes. **T−90m** is a predeclared paired secondary endpoint on the same eligible flight denominator, plus a complementary separate cancellation risk. T−24h is a comparator. AIRBORNE ETA is a separate prediction-time regime, not a post-departure backfill of PRE.

Until actual **gate-out** semantics are proven, this preferred primary remains a **candidate**, not a frozen physical-label assertion. **Actual wheels-off minus scheduled gate departure is not gate-delay**; it includes taxi-out. If only wheels-off can be estimated, preserve a *separate milestone and uncertainty-bearing proxy*. Provider schedule revisions are distinct outcomes, never renamed "actual delay". If labels are too sparse, report insufficiency and prospectively amend the study **before** inspecting protected outcomes, rather than silently substitute a target.

### Labels and missingness

- Tier A: provider/operator/airport-confirmed physical milestone tied to exact operated flight and timestamp, with original content and semantic quality.
- Tier B: separately validated ADS-B ground-to-air transition estimate, with source/aircraft identity, receiver-coverage bracket, and measured/unknown error recorded.
- Tier C: reported status, predicted time, timetable revision or unresolved/probable match: **not certified actual physical departure**.
- Unknown: leave outcome NULL/UNKNOWN. No webhook or no ADS-B detection does **not** equal "on time", "not cancelled" or "did not fly".
- Cancellations are a different event class from continuous departure-delay minutes *conditional on operation*. Conditional delay quantiles must not imply a definitive outcome for a cancelled flight. Define and document the denominator for each forecast/metric independently.
- An airport, date, route and callsign match alone does not prove the same physical leg; require robust operating-service and aircraft identity evidence and account for codeshares/rotations.

### Model quality and comparison, defined before Phase 6 outcomes

1. Fixed chronological train/validation/test (existing provisional **20/5/6 parent-day** design, subject to exact 31-day frozen manifest) and never randomly split multiple horizons/observations from one operating flight across sets.
2. Simple historical/airline-airport-season/time baselines and current scheduled/revised-time benchmark; compare more elaborate ML against them. No model is described as "nearly accurate" before held-out results.
3. Continuous delays: minutes MAE/median absolute error, quantile pinball loss, 80% interval empirical coverage *and width*; check over/underprediction of severe tails.
4. Risks: Brier score and calibration/reliability, prevalence and coverage at 15/30/60/120-minute thresholds. Ensure nested event probabilities obey P(≥15) ≥ P(≥30) ≥ P(≥60) ≥ P(≥120).
5. Arrival ETA: absolute arrival-time error, interval coverage and source-update staleness. Do not claim continuously tracked ETA when position feed goes stale.
6. Report by airport tier/region, carrier/route availability, time, identity tier, weather coverage, matched/unknown POST, and days. Include complete denominator and selection/ascertainment-bias statement.
7. Add *traveler usefulness* outcomes (e.g. likely connection-risk scenarios) only when actual opted-in connection itinerary/minimum connect times/airport context exist; don't invent traveler itinerary from FIDS.

## B. Reuse—not replace—the project we have built

Pipeline: approved airport/day/segment sampling → charge-day-reserved AeroDataBox FIDS original → normalized operating/conditional identities → immutable selected native scheduled departure T → properly issued source+weather/feature observations → eligible T−24h/T−6h/T−90m PRE snapshots via **existing Stage14 writer** → independently signed/bounded Alert subscriptions + raw-first webhook/POST observations → outcome label/uncertainty registry → Phase7 evaluation. Separate lawful ADSB.lol track matching and conditional AIRBORNE ETA snapshots are optional linked branches of the pipeline, not prerequisites that erase good FIDS PRE records.

**Critical existing implementation gap:** the currently staged Stage14 writer still creates PRE with `features:[]` in its underlying path; a usable predictive feature matrix has **not** been proven. The existing normalized FIDS, weather, route and provenance modules must be connected and tested *as-of* rather than reimplemented or retrospectively filled. Different database tables serve separate purposes; table count does not measure completeness of machine-learning evidence.

## C. AIRBORNE: our existing ADSB.lol work, kept free

Existing repository sources to reuse:

- [Nov 9 ADSB.lol physical departure error research and evidence-tier protocol](2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md)
- [Earlier one-free-request ADSB.lol prototype](../../scripts/v39_gate05_adsb_lol_wsss_one_free_get_20261029.ts) and [bounded prototype](../../scripts/v39_gate05_adsb_lol_wsss_bounded_live_20261029.ts)
- [Existing continuity analysis](../../server/lib/disruption/gate05LiveAdsbContinuity_v39.ts), [free ADSB evidence adapter](../../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39.ts), [dual-source safety](../../server/lib/disruption/phase4Gate5DualSourceAdsbAdmission_v39.ts), [airborne materializer](../../server/lib/disruption/airborneMaterializer_v39.ts), [snapshot builder](../../server/lib/disruption/airborneSnapshotBuilder_v3.ts)

**Public-source facts checked November 11, 2026:**

- [ADSB.lol public API](https://api.adsb.lol/docs) supports live hex, callsign and area queries; its public data is under **ODbL 1.0**. The maintainer requests contact for production use; API limits can change. [Provider README](https://github.com/adsblol/api/blob/main/README.md).
- [ADSB.lol historical archive](https://www.adsb.lol/docs/open-data/historical) publishes daily compressed per-aircraft traces in large whole-sky releases. An archive is **not** a free unlimited single-flight history endpoint, and later daily records are not valid for PRE-as-of use.
- [Key request policy](https://www.adsb.lol/request) describes **best-effort free keys**, possible temporary rate limits and no commercial guarantees. Respect ODbL attribution, derivative-database/sharing obligations and applicable source/retention approval before mixing with non-open provider data or public publishing; do not assume open-source API code licenses are the same as dataset-use rights.
- Free government [AviationWeather API](https://aviationweather.gov/data/api/) provides METAR (observations) and TAF (forecasts), with request limits. Airport METAR cannot masquerade as en-route weather or a forecast available earlier than publication.
- **No other paid ADS-B/airborne provider will be added** without a new owner decision. This prevents silent new subscription cost, but public-source availability/permissions still require a reviewed operational policy.

**Proposed bounded research behavior:** match ADB operating identity to unique ICAO24 aircraft/route/date, record source reception and point times, use a bounded permitted live read or authorized archive sampling, compute a candidate ground-to-air bracket only if receiver quality/airport geometry supports it, quarantine ambiguous/weak matches, and capture independent outcome availability. Use valid *as-of* airborne positions to issue separate ETA; reserve later archive for POST labels/research, not past predictions. **No automatic production polling until source-use rights, request rate, key policy, retention and error tests are signed.**

## D. C+D automation and the two different kinds of parallel work

**C = bounded simultaneous work.** A small number of prearmed/restartable GitHub jobs each run a measured number of independent processing lanes. Each lane picks a flight×horizon due within the original Stage14 safety window, invokes that **one existing Stage14 writer implementation** for a distinct flight and records confirmed commit readback. 1/2/4/8/16 lanes are only experiment settings, **not** counts of actual flights or paid API calls.

**D = durable task memory and recovery.** Persistent PostgreSQL tasks identify canonical flight/horizon, original source evidence, native T/cutoff, signed permit, status, claim owner, lease deadline, fence token, last error, and separate uncertain-write state. A failed job may end; another approved job recovers *eligible* work. An UNKNOWN COMMIT is **quarantined** until original snapshot and transaction-fate reconciliation: no blind retry. Do not add a duplicate queue table before catalog reuse review.

**Important failure handling:** workers must not hold SQL transactions/sessions while waiting for future cutoffs; claim tasks atomically and check real database clock; allow non-conflicting tasks to continue after flight-specific errors; use global STOP for source-rights/credentials/budget/Alert-stop/DB-integrity breaches. A stale lease owner is fenced from finishing writes after newer ownership. GitHub scheduling is best effort—not an exact-timestamp clock; use overlapping short scheduled owners, restartable state, deadline lookahead and watchdog. Protect source/flight/secret payload from public Actions logs and artifacts.

**Watchdog** watches missed run heartbeats, deadlines, unknown commits, provider budget/reservations, missed POST/STOP and stale source evidence, separate from optional every-four-hour progress digest. Watchdog can trigger a safe *hold* or clearly authorized recovery, **never** invent a paid authorisation. Avoid requiring the owner to wake for normal workflow continuity.

**GitHub documentation:** [6-hour GitHub-hosted job limit](https://docs.github.com/en/actions/reference/limits), [scheduled jobs may be delayed or dropped](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows), [workflow concurrency groups](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency); [PostgreSQL SKIP LOCKED queue-consumer semantics](https://www.postgresql.org/docs/current/sql-select.html) are relevant techniques, not evidence the current production DB already contains a ready-to-use queue.

### C+D integration checklist — the unfinished engineering, not an argument for redesigning

1. **READ-ONLY actual production catalog:** inspect existing queue-like tables, unique key, RLS/roles and indexes on teammate-managed `DATABASE_URL` through Replit, not the unrelated logged-in Neon plugin. No new table until this inventory is done.
2. On disposable PostgreSQL 16, connect genuine *staged* Stage14 implementation with synthetic, source-bound originals; benchmark grouped cutoffs at measured 1/2/4/8/16 concurrency, realistic p95/p99 commit+readback latency, locked rows, serializable failures, timeout/kill, reclaims, flight-specific failure isolation and global STOP.
3. Independently verify canonical flight+horizon duplicate prevention across native-T schedule revisions; exact bytes/rights/as-of review and stale-lease fencing at the writer SQL boundary.
4. Prepare automatic GitHub prearm/rolling handoff, source dispatch, future due activation, watchdog/notification, raw-first POST, budget-day and Alert SEND-credit reservations, STOP, and daily reports. Nonpaid end-to-end canary first.
5. Author a legally reviewed **specific** source-use/retention, identity and primary metric freeze. Verify 31-day geography/selection and price on actual provider account before paid GO.
6. Only then explicitly authorize Phase 6 paid activation. No claim made here that a production queue, full worker, validated ETA model or paid collector exists.

## E. Evidence base: why these outputs, and what is not proven

- [UK CAA CAP3148 corrected August 2026](https://www.caa.co.uk/data-and-publications/publications/documents/content/cap3148/) and [CAA news summary](https://www.caa.co.uk/newsroom/news/new-research-reveals-only-one-in-ten-passengers-feel-fully-informed-of-their-rights-when-flight-is-disrupted/): 57% wanted more detailed information and 56% more frequent disruption updates; survey/research preference is **not** trained-model accuracy. The 44% "length of delay" ranking applies to a *different question*.
- [2026 systematic review (72 studies)](https://doi.org/10.1016/j.asoc.2026.115761): external/weather, uncertainty and deployability are known gaps, supporting our design tests, not a guaranteed result.
- [2026 Japan network/conformal delay intervals](https://doi.org/10.1016/j.jairtraman.2026.103037): supports trying calibrated uncertainty conditional on transferability tests, not copying Japanese empirical coverage.
- [2026 flight-delay distribution tail analysis](https://www.sciencedirect.com/science/article/pii/S0969699726001481): supports meaningful tail risk and quantiles; its data and operating environment differ from ours.
- [2026 probabilistic block-time work](https://www.sciencedirect.com/science/article/pii/S0957417425029288): independent support for uncertainty in travel-time forecasts, not proof of our airborne ETA accuracy.
- [Earlier full traveler-first literature and quantitative consistency working paper](2026-11-11_AMENDMENT_E2_TRAVELER_FIRST_PRE_AIRBORNE_PREDICTION_2026_RESEARCH.md): preserved *historical source* despite E2 in its filename. **There is only one forward-looking Amendment E.**

## F. Critical implementation map — what to open first

| Read in this order | Repository file | What it controls |
| --- | --- | --- |
| 1 | [C+D ADR](2026-11-10_ADR_PHASE6_AUTONOMOUS_C_PLUS_D_HYBRID_DESIGN.md) | Operating design, timelines, permissions, SOURCE/PRE/POST and code atlas |
| 2 | [Independent C+D audit](2026-11-10_INDEPENDENT_PHASE6_PARALLEL_AUTOMATION_DESIGN_AND_BUDGET_AUDIT.md) | 31-day geometry, billing arithmetic, concurrency risks and missing parts |
| 3 | [Stage14 one-flight PRE writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) | One flight/horizon source-bound cutoff-safe SQL write |
| 4 | [C parallel selector/worker proof](../../server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39.ts) | Offline due tasks and bounded parallel adapter, **not** live worker |
| 5 | [D disposable PG16 queue test](../../tests/phase5_cplusd_disposable_pg16_queue_lease_fencing_v39.test.ts) | Real PG test of atomic claim/lease/unknown commit, **not** production migration |
| 6 | [Watchdog](../../server/lib/disruption/phase6SafetyWatchdog_v39.ts) | Existing Phase6 safety-check logic to review/reuse |
| 7 | [Amendment E offline forecast consistency](../../server/lib/disruption/phase5AmendmentE2ForecastConsistencyOffline_v39.ts) | Pure consistency guard, not trained model; filename remains historical |
| 8 | [Catalog-only owner checker](../../scripts/v39_phase5_cd_queue_catalog_owner_readonly_once.mjs) | Read-only real PostgreSQL schema inventory |
| 9 | [Isolated free ADB quota owner checker](../../scripts/v39_phase5_free_quota_exact_pinned_isolated_replit_once.sh) | Safe immutable-source, metadata-only account quota read in Replit |
| 10 | [ADSB.lol repo study](2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md) | Existing physical-milestone estimation and evidence limits |
| 11 | [Existing airborne materializer](../../server/lib/disruption/airborneMaterializer_v39.ts) | Existing AIRBORNE data path to audit before changing |
| 12 | [Phase 5 README](README.md) | Overall working checkpoints and remaining release gates |

**Final distinction:** Building a sophisticated database/pipeline is meaningful engineering progress, but it is not the same as having an independently validated predictor. The purpose of the remaining Phase5 work is to make Phase6 collect the evidence needed to discover what really works, rather than promise accuracy in advance.


## G. Incremental C+D implementation added in this review

The [Stage14 result bridge](../../server/lib/disruption/phase5CPlusDStage14ResultBridgeOffline_v39.ts) and [offline consistency tests](../../tests/phase5_cplusd_stage14_result_bridge_offline_v39.test.ts) map the **existing writer's committed-snapshot acknowledgment** to the offline parallel worker's result contract, refusing mismatched flight/horizon/native-T/cutoff/source identities and late post-commit evidence. It does not run Stage14 SQL, own a production lease, install a queue, authenticate an external research permit, or prove throughput. This is a narrow usable implementation step toward the full disposable-PG16 integration rather than a new data pipeline or second writer.
