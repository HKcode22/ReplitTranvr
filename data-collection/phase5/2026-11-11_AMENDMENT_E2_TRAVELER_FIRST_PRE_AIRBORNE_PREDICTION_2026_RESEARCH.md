# November 11, 2026 — Amendment E2: traveler-first PRE + AIRBORNE disruption predictions, evidence-based expansion through 2026

**Governance:** The owner explicitly accepted using **Amendment E's richer, evidence-tiered model direction on November 11, 2026**. This document **EXPANDS** the proposal and registers the chosen *scope of design/collection*, rather than overwriting the intact [Nov9 E original discussion](https://github.com/HKcode22/ReplitTranvr/blob/docs/owner-phase5-target-clarity-20261109/data-collection/plans/PROPOSED_Amendment_E_20261109_Rich_Multi_Target_Prospective_Collection.md), its [preserved point-in-time copy](../plans/PROPOSED_Amendment_E_20261109_PRESERVED_NOT_ADOPTED.md), A, B, C, or **both** D documents. This is **NOT** an independently signed scientific first-cycle primary-outcome freeze, retrospective relabeling, model training, license clearance, paid provider authorization, or proof of model-client reliability. Maintain original f.8 and the implementation log historically. **Phase5 science FREEZE HOLD / Phase6 paid GO NO**.

## Owner-friendly executive answer

**“First-cycle primary target”** = the ONE outcome by which we first judge whether our Phase7 model beats a prespecified simple baseline on a protected, unseen subset of the first Phase6 study. It is **not** the only data we save, not the only secondary model, and not necessarily the only helpful output a traveler sees. It prevents choosing a conveniently successful label *after seeing the outcomes*.

**PRE prediction** = forecast made before the first scheduled departure's individual cutoff (T−24h, T−6h, T−90m). It may describe expected departure lateness in minutes, a broad uncertainty interval and chances of meaningful problems, only if training labels/rights are real.

**AIRBORNE (after departure) prediction** = NEW snapshot at a known actual-as-of time after an authenticated flight has taken off, updating **ETA** (estimated time of arrival), remaining time, delay-at-arrival risks and diversion status using only already received positions/weather/route. It must not feed this future information into an old PRE feature. **POST** is the later collection of truth/labels; it is not itself the same thing as an AIRBORNE prediction. A completed flight cannot receive a genuine in-flight prediction retrospectively.

**Traveler value** = “What is likely to happen, by when, how uncertain is it, what does that mean for MY journey, and when will you update me?” Not simply an on-time/delayed yes/no flag or an arbitrary five-minute bucket.

**Two strict distinctions:** (1) projected **scheduled-time revisions** are changes in a provider's timetable, NOT measured actual departure delay; (2) physical **gate-out vs wheels-off vs touchdown vs gate-in** are different milestones, not interchangeable. If original provider scheduled time represents gate departure, comparing it to actual wheels-off adds taxi time and does NOT measure gate-departure lateness. Record and match *both* event and scheduled reference milestone before defining the label.

## 1. Research evidence supporting traveler-driven outcomes — do not mistake a survey for trained-model proof

| Research (date and type) | Actual reported finding | What it changes in E; limitations |
| --- | --- | --- |
| [UK Civil Aviation Authority / Yonder CAP3148, July 2025, corrected August 18 2026](https://www.caa.co.uk/data-and-publications/publications/documents/content/cap3148/); [official summary](https://www.caa.co.uk/newsroom/news/new-research-reveals-only-one-in-ten-passengers-feel-fully-informed-of-their-rights-when-flight-is-disrupted/) | Mixed-method research including 60 qualitative participants and 2,105 survey respondents; 44% rank **length of delay** as first information priority; 57% wanted **more detailed** communication; 56% wanted **more frequent**; uncertainty about next steps, impact and costs is a major concern. The original report has corrigenda; use corrected version. | Output continuous minutes and uncertainties, update cadence, known-vs-predicted notices, scenario impact and rights links. UK sample is not evidence of universal preferences or predictive accuracy. |
| [Mansouri et al., Journal of Air Transport Management, May 2026, DOI 10.1016/j.jairtraman.2025.102960](https://doi.org/10.1016/j.jairtraman.2025.102960) | ML topic/sentiment analysis of Skytrax reviews of top-100 airlines reveals delays, scheduling problems, communication gaps and pricing transparency concerns. | Favor reliable and transparent travel disruption information over a complicated opaque number. Reviews have selection bias; not a prospective A/B experiment. |
| [Decoding travel behavioral intentions under flight delays, Transportation Research A, 2025, DOI 10.1016/j.tra.2025.104666](https://doi.org/10.1016/j.tra.2025.104666) | Joint revealed/stated preference survey at Beijing Daxing and explainable XGBoost: behavior/alternatives depend on passenger trip attributes and delay scenario. | Build *optional conditional traveler-action layer* only with consented itinerary, transfer time and actual alternate-option data; not a claimed global travel choice predictor from FIDS alone. |
| [Modelling multi-stage behavioural responses to disruptions, Transportation Research A, 2026](https://www.sciencedirect.com/science/article/abs/pii/S0965856426003253) | Multi-stage stated-preference behavior changes with amount/completeness of information, context and reported emotional state. | Give clear time-aware updates and scenarios, not manipulative urgency or false assurances; don't infer individual emotions from aircraft data. |
| [IATA Global Passenger Survey, Oct 28 2026](https://www.iata.org/en/pressroom/2026-releases/10-28-iata-2026-global-passenger-survey-travelers-biometrics-ai-entry-requirements/), [SITA Passenger IT Insights 2025](https://www.sita.aero/resources/surveys-reports/passenger-it-insights-2025/) | IATA's >10,000 responses from >200 countries: 49% have used AI for trip planning. SITA's 7,500 respondents in 25 countries emphasize digital, convenient, trusted travel. | Plan readable mobile-first, explainable, opt-in updates *after* actual model validation. These are broader travel-technology surveys, NOT direct proof users want a particular flight-delay ML score. |
| [2026 systematic review of 72 flight-delay ML studies, Applied Soft Computing, DOI 10.1016/j.asoc.2026.115761](https://doi.org/10.1016/j.asoc.2026.115761) | Gaps include uncertainty representation, standardization, external weather and feasible deployment. | Predeclare reliability, uncertainty and data-as-of controls, not just point accuracy. |
| [Network delay + conformal prediction, Journal of Air Transport Management, Sep 2026, DOI 10.1016/j.jairtraman.2026.103037](https://doi.org/10.1016/j.jairtraman.2026.103037) | Japanese domestic delays: network properties and adaptive conformal intervals studied with multiple interval update strategies. | Probabilistic quantiles/interval coverage are worthwhile *candidate* methods; Japanese carrier-specific reported coverage does not transfer automatically to 31 global batch days. |
| [Graph-based multi-horizon U.S. airport delay, Applied Sciences, July 15 2026](https://doi.org/10.3390/app16147110) | Multi-horizon airport graph forecasts use spatial/temporal propagation and uncertainty; model type preference varies by task. | Include appropriately lagged hub/route/network features where real pre-cutoff data and licenses permit. Do not require a graph network on day one. |
| [Delay distribution tails and severe events, Journal of Air Transport Management, 2026](https://www.sciencedirect.com/science/article/pii/S0969699726001481) | Quantile/distribution-sensitive approach highlights weather and tail-delay behavior, rather than only averages. | Quantiles and chances of severe delay are more action-oriented than a mean-only output; results on U.S. 2024 flights do not certify our global cohort. |
| [SWAG-Net trajectory/ETA + weather, Transportation Research E, Sep 2026, DOI 10.1016/j.tre.2026.104966](https://doi.org/10.1016/j.tre.2026.104966); [Social-LSTM trajectories/ETA, CEAS Aeronautical Journal, Oct21 2026](https://doi.org/10.1007/s13272-026-01026-1); [2026 trajectory review, Aerospace, Nov3 2026](https://doi.org/10.3390/aerospace13111016) | ETA modeling uses actual time-stamped positions, destination and traffic/weather/airspace context; research favors different models under different data and operating conditions, no single universal best. | Separate conditional AIRBORNE model with genuine track/matched operated identity and as-of updates; cannot manufacture in-flight ETA from airport FIDS alone. |

**Research quality hierarchy:** CAA mixed-method fielded survey and SITA/IATA industry surveys describe stated passenger preferences; peer-reviewed aviation ML papers test particular data/model tasks; their accuracy numbers are **not transportable** to this project's live global AeroDataBox data. No peer-reviewed research guarantees 31 study batch days yield a commercial-grade model. Treat references as hypotheses/approaches to benchmark against honest simple baselines.

## 2. Recommended traveler information outputs, deliberately organized by stage and evidence

| Stage / conditional population | Proposed output, what the traveler reads | Target/source requirement | Priority and limitations |
| --- | --- | --- | --- |
| **PRE T−24h/T−6h/T−90m** (eligible actual operated flight) | Predicted **departure lateness in minutes**, e.g. median and an 80% *empirically calibrated* range | verified *actual gate-out* compared with original *scheduled gate departure*; OR separate actual wheels-off with correct runway milestone reference, never mix | **Core first-cycle candidate** only if actual labels/source rights/coverage confirmed; else UNKNOWN/NOT EVALUABLE, not automatic schedule revision |
| **PRE** | P(meaningful departure lateness ≥15/30/60/120min), with update time and uncertainty | same physical label as corresponding continuous outcome; sufficient positives/negatives | Secondary traveler-facing summaries **conditional on operating flight**; risk for canceled flight is a different event |
| **PRE** | P(canceled), P(diverted), provider-reported expected status (source-attributed), and "unknown" if no outcome evidence | independently matched status evidence, terminal provider outcome and time | Can be rare, do not label absent webhook as false; preserve per-endpoint denominators |
| **PRE** | What happens to estimated arrival time if departure delay occurs? | actual flight duration/route/turnaround evidence available before cutoff; availability and label evidence | **Exploratory conditional arrival distribution**; not an in-flight model using unseen positions |
| **AIRBORNE after positively confirmed takeoff** | **Arrival ETA** in local time + UTC, e.g. median and uncertainty band, remaining flight time; destination-timezone-aware | genuine timestamped aircraft positions from authorized ADS-B/provider, verified flight identity and intended destination; track/available-at <= snapshot | Separate **second-stage model** requiring real track stream, not an approved or available flight-position collector yet |
| **AIRBORNE** | P(arrival ≥15/30/60min late), updated diversion risk, destination arrival estimate | correct actual arrival milestone and matching original *scheduled arrival reference*; matched flight and current as-of track | Independent outcome/denominator from departure; airport METAR is not enough for full route forecast |
| **Traveler itinerary scenario** | “If my inbound arrives in this range and my outbound connection is at X, what is possible?” | traveler voluntarily supplies booking itinerary, terminals, local transit, minimum connection time, gate changes, alternative options, rights jurisdiction | **Not presently derivable from FIDS alone.** Scenario calculator can be research-only and conditional; no claims about actual rebooking availability or airline obligations without live sources |
| **After arrival POST** | Final observed departure/arrival delay, canceled/diverted, compare prediction to observed outcome | authentic post-event original, independent actual-vs-estimated distinction and retention | **Evaluation**, not retroactively generated PRE or AIRBORNE prediction |

**Important customer experience guard:** Do not display estimated/correlated proxy event as “actual departure confirmed”; mark “prediction”, “provider-reported,” “actual verified” and “unknown” separately. “Why” explanations should show only legitimate measured factors (e.g. known origin METAR, as-of nearby airport congestion); a top model feature is not proven causal reason for a particular disruption.

## 3. One first-cycle headline metric and how a broad product is still scientifically testable

A **first-cycle primary target** is the *one* label for which the first pilot preregisters a hypothesis, population, prediction timestamp, actual observed milestone, baseline, metric, missingness policy and 20 TRAIN / 5 VALIDATION / 6 sealed TEST batch-day partition. It is **not** the only data collected or the only future model output.

**Recommended desired physical first-cycle target, conditional on native evidence and source-use verification:** **T−6h prediction of *actual gate-out departure delay minutes relative to matched original scheduled gate-out reference***, with a continuous predictor (MAE headline versus predeclared train-only baseline) and predictive quantiles; ≥30/60min risks as explicitly secondary, evaluated with Brier/calibration. This is actionable, broadly informative, allows continuous and risk outputs from one coherent label, and retains the original f.8 physical-event intent. **Do NOT adopt it as final until actual gate-out fields are independently proven and matched**. If only actual wheels-off is certifiable, use that as **a separately specified target with a correct matched runway/schedule reference**; do not compare it to gate-scheduled time and present as the same gate-out delay. Never blend gate and runway events in one unlabeled target.

**If no valid enough physical labels before prospective freeze:** choose a narrower, *explicitly named and honestly described* first-cycle observable target **prospectively**, e.g. D1 provider schedule-revision ≥15min with Brier score / train event-rate baseline, **but do not claim it is physical traveler delay**. Nov6's zero positive among 36 same-cohort horizon comparisons makes it a particularly risky first-cycle headline. If rare/no positives in held-out test, discrimination is NOT ESTIMABLE, not magically high accuracy. Alternatively retain physical target as unscorable pilot and describe scientifically incomplete, while E captures future permitted evidence for subsequent month. The decision must be finite and taken before relevant Phase6 outcomes; do not select whichever label yields a flattering test score.

**Selection procedure proposed for pre-GO finite review (no new paid FIDS pilot required):**
1. READ ONLY examine lawful *unexpired* source original field schemas and authentic same-operating-leg identity and actual/estimated quality flags. ADB \`runwayTime\` and \`revisedTime\` may be **actual OR estimated**; non-null is not enough, per provider OpenAPI. Account-only 60K quota is NOT scientific label evidence.
2. Count real individually eligible source legs by sampled HUB/MID/REGION, matched scheduled reference, actual-only gate or runway event and terminal outcome, missing/censored/estimated, with actual source times; report fraction available by stratum. **Do not fabricate future 31 days** and do not use data whose permitted lifetime expired.
3. Freeze one endpoint before paid first-cycle labels: evidence tier, milestone, feature cutoff, label observation horizon, source rights, eligible population, 20/5/6 split, baseline, metric, subgroup/route missingness and study limitations. A science qualified null result is allowed.
4. E's other PRE+AIRBORNE outputs remain conditional secondary or exploratory goals. They need not all become trained models by day 31; data availability and sample size determine which can be evaluated honestly.

## 4. Mathematical validation and understandable interpretation

For one operated flight \(i\), **when both milestones refer to the same physical event**, the actual continuous delay is

\[
D_i = \frac{t^{\mathrm{actual}}_{\mathrm{gate\ out},i} - t^{\mathrm{first\ scheduled}}_{\mathrm{gate\ out},i}}{60\ \mathrm{seconds}}.
\]

A gate-out scheduled time **must not** be subtracted from an actual wheels-off timestamp and called gate-out delay. Keep negative \(D_i\) for early departure if verified; cancellation is a **competing event**, not “zero delay.” For categorical terminal outcomes, define operated/canceled/diverted with mutually exclusive well-specified states and honest unknown when no final label exists. A claimed multi-class probability vector must sum to one over its declared outcome space, but **UNKNOWN** cannot be silently replaced with a modeled fourth operational state.

For *operated* flights, forecast a distribution \(F_i(d \mid X_{\le C},\mathrm{operated})\), where \(X_{\le C}\) means features **truly retrieved before the PRE cutoff**. Useful possible outputs:
- median \(q_{0.5}\) delay, 10th and 90th percentiles \(q_{0.1},q_{0.9}\), \(q_{0.1}\le q_{0.5}\le q_{0.9}\);
- \(P(D\ge15), P(D\ge30), P(D\ge60), P(D\ge120)\), which must be nonincreasing as the threshold rises;
- independently calibrated and labeled \(P(\mathrm{canceled})\), \(P(\mathrm{diverted})\). Don't report conditional-on-operation delay risk as an unconditional traveler probability.

Use **MAE** for point minutes; Brier \(N^{-1}\sum_i(p_i-y_i)^2\) for each binary threshold; **pinball loss** at predeclared quantiles and observed 80% interval coverage vs target; evaluate out-of-time groups, calibration (not only AUC), source quality, missingness, lead-time versus error, false-alarm costs, region/carrier airport heterogeneity and uncertainty intervals around reported performance. Conformal intervals require exchangeability assumptions or explicit adaptive calibration/coverage audits; an “80% interval” is a **goal** until observed held-out coverage is established. When insufficient actual labels, say **NOT EVALUABLE**.

**Toy display, NOT trained output:** “At T−6h, median departure delay 20 minutes; 80% predicted range 0–65 minutes; chance delay ≥30m 36%; data last updated 12:03 UTC; actual outcome not yet known.” These sample numbers **have no measured project basis**. A UI should never imply a gate time, threshold chance or en-route ETA has been validated merely because code can render it.

## 5. Architecture to reuse — what we already have vs what must be added

**Reuse**, rather than overwrite:
1. Existing original **f.8/A/B/C/D1/D2/E** lineage, scientifically chosen four HUB/mid/regional sample, exact 26/3/2 parent calendar and future genuine 21 adaptive draws; don't redraw based on hindsight.
2. Actual source airport FIDS GET owner, original receipt/response binding V0077/V0079–V0083, real provider timestamp, canonical operating vs conditional identity, zero optimistic source backfill and REST/Alert ledgers.
3. Existing Stage14 \`server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts\` for each honest cutoff, Stage17 independent T24 witness; C+D parallel short-transaction owner and queue claim test from merged PRs #561 and #563 remain **nonpaid / no production queue**.
4. \`preSnapshotBuilder_v3.ts\`, \`historicalFeatureStore_v3.ts\`, Stage4 NOAA METAR receipt and \`phase4Gate5WeatherAsOfFeature_v39.ts\`, route support QA. These provide potential *as-of airport weather*, NOT yet route forecast or a trained feature vector. Existing Stage14 currently constructs \`features:[]\`; actual feature joins are P0.
5. Existing signed POST source, published webhook receiver, Alert CREATE/STOP ownership, missing-label audit, distinct SOURCE and OUTCOME originals.

**Additional, only when independently supported:** a genuine consented/authorized flight-position event source; independently matched operating aircraft/leg and route; genuine pre-cutoff TAF, SIGMET and if licensed weather grid from actual route/time; a separately isolated AIRBORNE snapshot writer + source/clock identity and review; ETA label evaluation (scheduled arrival milestone versus actual touchdown or gate-in **matching the chosen event**); simple trip-impact scenario layer. **None of these are implied available or paid-approved by the owner accepting E.** Route-weather/existing optional METAR missing stays NULL, no guessed flight path.

Suggested operational architecture:

\`\`\`text
APPROVED sampling + lawful SOURCE/fee policy
   └─ authentic ADB airport FIDS originals → distinct operating/conditional member evidence
          ├─ PRE T−24h → Stage14 immutable on-time snapshot (as-of)
          ├─ PRE T−6h  → Stage14 immutable on-time snapshot (as-of)
          ├─ PRE T−90m → Stage14 immutable on-time snapshot (as-of)
          ├─ optional later authenticated AIRBORNE observations → IN-FLIGHT ETA snapshot
          └─ late ADB POST / webhook / terminal outcomes → scientific labels and scorecard
Unattended GitHub-only C+D time-based owner + DB queue leases/fences/watchdog
  SAME original PRE writer, no per-flight GitHub Actions, no duplicate provider buys
\`\`\`

**Milestone boundaries:** PRE is never revised using AIRBORNE/POST observations. An AIRBORNE prediction may be repeatedly refreshed **only when each new input is genuinely available as-of that updated timestamp**, not when a later retrospective track archive happens to be retrievable. POST is later label reconciliation; it cannot make a missed flight an on-time PRE retrospectively. SOURCE rights and 31-day normalized record/storage/backup expiry must independently support training and inference; public GitHub cannot contain private licensed flight records.

## 6. First-cycle product acceptance, not unrealistic zero-risk guarantees

**Before a consumer trial:** check actual sample size/positive counts by target, matched physical ground truth, legal training purpose and retention, 20/5/6 chronological flight-group/crossover-group split, actual model and train-only baseline, held-out metrics and confidence intervals, risk calibration, uncertainty coverage, performance by HUB/MID/REGIONAL and weather/season strata, withheld-cancellation handling, as-of leakage, air route/wx match, API cost, post/Alert ownership/STOP, and a human-readable changed-status/last-available-at explanation. A poor or unavailable model is marked **research-only/inconclusive**, not shipped by overstating accuracy.

**User research** is separate from ML evaluation: field-test decision usefulness and false-alert harms with consent and suitable sample, without automatically rebooking, impersonating the airline, claiming compensation rights or pretending official real-time alert access. The CAA evidence suggests these are meaningful tests, not automatic product requirements.

**Month two (separately lawful/funded)** can test temporal generalization during Phase7 training for the first cohort, but cannot silently append new unlabeled rows to the sealed first-cycle test or borrow future month outcomes for prior PRE features.

## 7. Exact scientific next decision register

| Question | Recommended disposition (until independently evidenced) |
| --- | --- |
| Does the owner accept E richer evidence capture? | **YES — owner accepted November 11.** Scope is data/model-research **direction**, not scientific primary/retention/paid GO. |
| First headline target? | **Desired:** T−6h prediction of verified actual **gate-out** delay minutes against matching original **scheduled gate-out**, conditional on available same-leg rights/ground truth. Otherwise specific documented alternative review **before** outcome collection, not silent D1 switch. |
| PRE horizons? | T−24h, T−6h, T−90m all prospectively saved when due; T−6h first-cycle evaluation headline proposed, others secondary for lead-time comparison. |
| After departure/ETA? | **YES — distinct AIRBORNE research objective**, only after authenticated track/flight available. **POST is evaluation**, not merely “the after-departure model.” |
| Risk thresholds? | 15,30,60,120m secondary conditional-on-operated candidate bins; no arbitrary five-minute bucketing; small-event feasibility checks required. |
| Client-level missed connections? | Scenario-based, **not a validated prediction** without itinerary/terminal/minimum-connection-time and onward flight sources. |
| What is **not** approved? | No E scientific primary freeze, source Contents use rights, extra ADS-B provider spending, live queue/writer, current API entitlement, GitHub paid month or consumer deployment. |
