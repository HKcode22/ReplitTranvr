# Phase 2G Scientific Provenance and Design-Basis Record

Recorded: 2026-09-26 06:04 PDT / 2026-09-26 13:04 UTC

Repository: HKcode22/ReplitTranvr

Purpose: explain what the V3.9/Phase-2G experiment is based on, which decisions are directly supported by research/provider/government sources, which are project-specific protocol choices, and which are engineering safety controls. This prevents overclaiming that every shell command or numeric threshold came directly from a paper.

---

## 1. Three source classes

Every Phase-2G rule should be classified into one of three classes.

### A. Scientific/literature-backed idea

A research paper or statistical reference supports the underlying scientific concept.

Examples:
- same-aircraft delay propagation;
- previous-leg delay as a predictive feature;
- trajectory-based airborne ETA prediction;
- network-based delay propagation;
- stratified sampling and sample-size/precision tradeoffs.

### B. Project-specific experimental protocol choice

The literature supports the need for a controlled/representative measurement, but does not prescribe the exact project number or rule.

Examples:
- exactly six compact macro-region candidates;
- exactly two hours for Stage 1;
- a 500-credit protected ceiling;
- WSSS as primary yield reference and OMAA as fallback;
- 15-minute stability buckets;
- the exact 40/20/20/20 anchor-score weights;
- weekday/time-class matching;
- exact candidate ordering.

These choices are scientifically defensible only because they are frozen prospectively, applied consistently, and not tuned after seeing candidate outcomes. They must not be described as values dictated by a research paper unless a source actually states them.

### C. Engineering/safety/reproducibility control

These rules primarily prevent software, billing, data-integrity, or provenance failures. They are not aviation-science findings.

Examples:
- exact Git SHA binding;
- AUTH files and SHA hashes;
- zero-credit callback verification;
- GitHub owner/watchdog;
- exact-session cleanup;
- active-billable-subscription refusal;
- reconciliation receipts;
- fail-closed states;
- database migrations;
- UNLOGGED transient paid-provider runtime storage;
- provider-secret binding;
- no automatic retry.

These are implementation controls built for this project.

---

## 2. Core aviation research foundation

### 2.1 Same-aircraft / previous-leg delay propagation

Chen & Li, “Chained Predictions of Flight Delay Using Machine Learning,” AIAA SciTech 2019, San Diego State University.

The work supports treating late-arriving-aircraft / previous departure delay and chained flight behavior as important predictive information.

Project implication:
- aircraft/tail continuity is a defensible feature family;
- previous-leg state can influence later-leg delay;
- tail-chain preservation is scientifically meaningful.

It does NOT prescribe this project's exact six-airport shortlist, two-hour probe length, 500-credit cap, or anchor-score weights.

### 2.2 SJSU delay-propagation evidence

Zheng, Wei & Hu, “A Comparative Analysis of Delay Propagation on Departure and Arrival Flights,” Aerospace 8(8):212, 2021, SJSU ScholarWorks #2410.

Supports:
- previous delay propagation;
- turnaround/buffer effects;
- weather effects;
- aircraft-utilization dependence;
- stronger propagation behavior across later legs.

Project implication:
- prior-flight/tail information, operational context and weather are scientifically defensible features.

### 2.3 SJSU airborne trajectory / ETA work

Zheng, Zou, Wei & Tian, “A Data-Light and Trajectory-Based Machine Learning Approach for the Online Prediction of Flight Time of Arrival,” Aerospace 10(8):675, 2023, SJSU ScholarWorks #4774.

Supports:
- separating an AIRBORNE/POST prediction problem from pre-departure prediction;
- preserving trajectory points;
- using latitude/longitude/speed trajectory information;
- online ETA / landing-time prediction.

Project implication:
- the V3.9 PRE versus AIRBORNE split and trajectory-preservation architecture have literature grounding.

### 2.4 Delay-propagation methods review

Li et al., “Flight delay propagation modeling: Data, Methods, and Future opportunities,” Transportation Research Part E 185:103525, 2024.

Supports:
- delay as both a flight-chain and network problem;
- use of multiple aviation data types;
- multiple statistical/network/modeling approaches.

### 2.5 Flight-delay prediction review

Sternberg et al., “A Review on Flight Delay Prediction,” arXiv 1703.06118 / later systematic-review publication.

Supports broad model/data taxonomy and benchmarking context.

The exact persistence baseline used by this project is explicitly a project evaluation control, not a constant dictated by this review.

---

## 3. Sampling/statistical design foundation

NIST/SEMATECH Engineering Statistics Handbook supports the general principles that:
- sample facts are not automatically population facts;
- representativeness, sample size, population variability and desired precision matter;
- sampling cost/practicality trades off against precision;
- stratification can reduce systematic sampling error / within-stratum variability;
- sample-size decisions depend on goals, variability, cost, prior knowledge and desired precision.

Project implication:
- using frozen macro-regions is a defensible stratification idea;
- reducing the original shortlist to one candidate per macro-region is a project-specific cost/coverage compromise;
- no NIST source proves that six candidates is universally sufficient;
- no NIST source prescribes WSSS, OMAA, MMUN, LKPR, SKBO or YSSY specifically.

---

## 4. Provider/government documentation foundation

### AeroDataBox

Provider documentation governs facts such as:
- webhook/FIDS endpoint schemas;
- provider flight/movement fields;
- Flight Alert subscription behavior;
- deliveryAttempt.costCredits;
- Alert-credit accounting;
- SEND-versus-delivery billing behavior;
- provider plan/retention terms.

These are contract/provider facts, not academic findings.

### AviationWeather / NOAA

Government/provider documentation grounds:
- METAR/TAF availability and API behavior;
- weather issue/validity timestamps;
- source-history depth;
- operational weather-source semantics.

Project-specific as-known-at-cutoff rules are then applied to prevent hindsight leakage.

---

## 5. What is NOT directly copied from a paper

The following are primarily V3.9 project protocol/engineering decisions unless a later source is specifically attached to them:

- two-hour Stage-1 target window;
- four-hour Stage-2 target window;
- 500-credit probe cap;
- 60 rows/hour capacity threshold;
- 15-minute stability bucket;
- exact compact-six airport identities;
- exact WSSS -> OMAA -> MMUN -> LKPR -> SKBO -> YSSY ordering;
- WSSS primary reference / OMAA fallback;
- 40% traffic + 20% geography + 20% carrier + 20% observed-yield weights;
- exact-match provider/internal reconciliation requirement;
- GitHub Actions lifecycle owner;
- independent watchdog;
- exact AUTH/hash mechanism;
- same-app Replit callback contingency;
- exact database table names;
- exact cleanup/finalizer mechanics;
- exact rerun adjudication rules.

These are not invalid because they are project-specific.

Their scientific legitimacy comes from:
1. being decided before the relevant outcomes;
2. having a stated rationale;
3. being applied consistently;
4. being measurable/auditable;
5. failing closed when assumptions are violated;
6. not being tuned after seeing a desired result.

---

## 6. Stage-1 two-hour probes

The exact two-hour duration is a project protocol choice.

The research/statistical foundation supports measuring representative behavior and controlling confounding, but does not say “all airport probes must be exactly two hours.”

The V3.9 protocol freezes two hours so every Stage-1 candidate is measured under the same target exposure class, while cost remains bounded.

Matched weekday/time-class execution is likewise a project control intended to reduce obvious time-context confounding.

This must be presented as:
“a prospectively standardized project protocol informed by sampling principles,”
not:
“the SJSU/SDSU papers require a two-hour probe.”

---

## 7. Stage-2 four-hour confirmation

The four-hour duration is also a project protocol choice.

Its role is longer confirmation for cases that trigger Stage 2 under the compact amendment.

Research supports replication/adequate observation and the need to account for variability; it does not specifically mandate four hours.

The compact amendment currently makes Stage 2 conditional rather than automatic for all five candidates.

---

## 8. Physical-flight identity provenance

The V3.9 scientific requirement is that repeated updates of one real flight must not be counted as new physical flights.

The legacy prepaid implementation used flight-number/runtime-key proxies.

On 2026-09-25 commit da65e0e9a2672e5cbbb9d15dfae7f3afb96d3b27 introduced the explicit physical-flight metric contract and migration 0060.

P2G13 then exposed a defect in that new prepaid identity adapter: exact same scheduled no-provider-ID legs were not checked before callsign/fuzzy matching.

The repair does not change the scientific goal. It corrects the code implementation so the paid transient resolver implements the intended physical-flight definition more faithfully.

---

## 9. Historical WSSS/OMAA versus corrected MMUN metrics

OMAA P2G03 and WSSS P2G11 are successful completed provider experiments.

Their historical metric implementation used legacy flight-number/runtime-key proxies.

Their detailed transient item payloads were purpose-deleted, so exact later physical-flight metrics cannot be reconstructed from the old raw observations.

Therefore:
- do not call their successful runs infrastructure failures;
- do not silently claim their legacy metric values are mathematically identical to later corrected physical-flight metrics;
- do not automatically rerun them simply because a new implementation exists;
- before final promotion/normalization, resolve comparability prospectively without outcome-driven rule changes.

---

## 10. Evidence hierarchy teammates can use

When asked “where did this rule come from?”, answer in this order:

1. Binding V3.9 Plan subsection / superseding amendment.
2. Implementation Log requirement and production owner.
3. Research/statistical/provider source supporting the underlying proposition.
4. Repository code implementing the rule.
5. Test proving intended behavior.
6. Runtime artifact / AUTH / SHA proving what exact version ran.
7. Run report / reconciliation receipt showing what actually happened.

This is stronger than claiming that every exact shell command was copied from a paper.

---

## 11. Core cited sources

- Chen, J. & Li, M. (2019), “Chained Predictions of Flight Delay Using Machine Learning,” AIAA SciTech 2019, SDSU.
- Zheng, Z., Wei, W., Hu, M. (2021), “A Comparative Analysis of Delay Propagation on Departure and Arrival Flights,” Aerospace 8(8):212, SJSU ScholarWorks #2410.
- Zheng, Z., Zou, B., Wei, W., Tian, W. (2023), “A Data-Light and Trajectory-Based Machine Learning Approach for the Online Prediction of Flight Time of Arrival,” Aerospace 10(8):675, SJSU ScholarWorks #4774.
- Li, C. et al. (2024), “Flight delay propagation modeling: Data, Methods, and Future opportunities,” Transportation Research Part E 185:103525.
- Sternberg et al. (2017 preprint; later systematic-review publication), “A Review on Flight Delay Prediction.”
- NIST/SEMATECH Engineering Statistics Handbook: populations/sampling, choosing a sampling scheme, selecting sample sizes.
- AeroDataBox current API/Flight Alert/pricing/terms documentation.
- AviationWeather.gov Data API / NOAA source documentation.

---

## 12. Rule against citation overreach

A citation supports only the proposition actually established by that source.

It is incorrect to say:
“because Chen & Li supports delay propagation, it proves our exact 500-credit cap.”

It is correct to say:
“Chen & Li supports same-aircraft delay propagation as an important scientific feature; the 500-credit cap is our prospectively frozen engineering/budget control.”

This distinction is required for academically defensible reporting.
