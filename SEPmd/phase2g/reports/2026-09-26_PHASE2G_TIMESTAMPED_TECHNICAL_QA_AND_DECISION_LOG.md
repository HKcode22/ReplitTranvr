# Phase 2G Timestamped Technical Q&A and Decision Log

**Documented at:** 2026-09-26 06:04 PDT / 2026-09-26 13:04 UTC  
**Repository:** HKcode22/ReplitTranvr  
**Branch:** phase2g-mmun-identity-repair-20260925  
**Purpose:** append-only continuity record of operator questions, technical answers, source basis, and resulting project implications. This is not a substitute for the binding Plan/Implementation Log; it records interpretation and evidence so the reasoning is not lost with chat history.

---

## Entry 2026-09-26 06:04 PDT — visibility and documentation

### Question
Why are the new reports/commits not visible on the default ReplitTranvr GitHub page?

### Answer
The reports were committed to the draft repair branch `phase2g-mmun-identity-repair-20260925`, not to `main`. The default GitHub repository view opens `main`, so branch-only commits will not appear until the branch is selected or PR #9 is opened/merged.

Verified branch report paths:
- `SEPmd/phase2g/reports/2026-09-26_MMUN_IDENTITY_DEFECT_TECHNICAL_POSTMORTEM_AND_CONTINUITY.md`
- `SEPmd/phase2g/reports/2026-09-26_PHASE2G_SCIENTIFIC_PROVENANCE_AND_DESIGN_BASIS.md`

PR:
- https://github.com/HKcode22/ReplitTranvr/pull/9

### Decision
Do not merge merely for visibility. Keep scientific/code repair isolated until the repair sequence is reviewed and CI remains green. Use this Q&A log plus PR #9 for visible continuity.

---

## Entry 2026-09-26 06:04 PDT — where the experiment comes from

### Question
Is every tiny experimental action coming from research papers, from ChatGPT, or from somewhere else? How can the team know the route is scientifically defensible?

### Answer
The experiment has three distinct provenance classes and they must never be conflated.

1. **Literature/provider-supported scientific proposition**
   - Example: delay propagates through the same aircraft's itinerary.
   - Example: previous delay, buffer, utilization, weather and congestion affect delay.
   - Example: airborne trajectory points can support online ETA prediction.
   - Example: sampling precision depends on sample size, variability and sampling design.

2. **Project-specific experimental protocol**
   - Example: exactly two hours for Stage 1.
   - Example: exactly six compact regional candidates.
   - Example: WSSS primary reference and OMAA fallback.
   - Example: 40/20/20/20 score weights.
   - These are not copied from a professor's paper. They are prospectively frozen design choices intended to operationalize the research problem under the project's budget/time/provider constraints.

3. **Engineering/reproducibility/safety control**
   - Example: exact Git SHA, AUTH hash, callback-secret proof, GitHub watchdog, exact-session cleanup, zero active billable subscriptions.
   - These are software/experimental-integrity controls, not aviation-science findings.

The academically defensible claim is therefore not “every command came from a professor.” The defensible claim is: **the scientific hypotheses are literature-grounded; the exact operational protocol is project-designed and frozen prospectively; the engineering controls make that protocol reproducible and fail-closed.**

### Trust rule
For every important rule, require this chain:

```text
scientific proposition
→ source supporting that proposition
→ project-specific operationalization
→ Plan/Amendment requirement
→ code owner
→ test
→ exact runtime artifact/SHA
→ run evidence
```

If any link is absent, label it as a gap instead of inventing authority.

---

## Entry 2026-09-26 06:04 PDT — did the papers conduct the same Stage-1 probes?

### Question
Did the SJSU/SDSU professors run two-hour WSSS/OMAA/MMUN airport probes like this, and are we supposed to copy their experiments?

### Answer
No. The cited papers did not run this exact AeroDataBox six-airport, two-hour/credit-capped anchor-selection protocol.

### Chen & Li (SDSU/Purdue), AIAA SciTech 2019
They studied chained flight-delay prediction:
- BTS airline on-time data;
- NOAA Local Climatological Data;
- FAA ASPM airport-capacity data;
- ORD-related flights from July 2016 to June 2017;
- 30 ORD-related airports;
- 15-minute delay groups;
- SMOTE for class imbalance;
- random forest classifiers;
- recursive feature elimination with five-fold cross-validation;
- a same-aircraft chain model using late-arriving-aircraft delay;
- an optimized approximate minimum turnaround time (28 minutes in their data).

They did **not** prescribe a two-hour AeroDataBox airport probe.

Source:
https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf

### Zheng, Wei & Hu (SJSU-affiliated), Aerospace 2021
They studied delay propagation empirically:
- 3,705,093 Chinese flight records from 2016 before filtering;
- departure/arrival airports and dates, airline, aircraft type, **tail number**, scheduled/actual departure and arrival;
- METAR weather at top 30 airports at 60-minute intervals;
- previous delay, turnaround/block buffer, airport congestion, aircraft type/hub, time and weather variables;
- after filtering, roughly 1.43M departure-delay records and 1.46M arrival-delay records;
- OLS models with clustered standard errors;
- sensitivity analysis by aircraft flight order and number of flights flown by the aircraft.

This supports tracking the actual aircraft/tail and flight-leg sequence when studying propagation. It does **not** prescribe WSSS, OMAA, a 500-credit cap, or a two-hour probe.

Sources:
https://www.mdpi.com/2226-4310/8/8/212
https://scholarworks.sjsu.edu/faculty_rsca/2410/

### Zheng, Zou, Wei & Tian (SJSU-affiliated), Aerospace 2023
They studied online airborne ETA:
- Flightradar24 trajectory records;
- DEN-SFO: 63 UA1497 records;
- ORD-SFO: 136 UA2166 records;
- January-June 2020;
- trajectory points with time, callsign, lat/lon, altitude, ground speed and heading;
- trajectories reconstructed at equal-distance intervals;
- historical trajectory matching;
- LSTM remaining-trajectory prediction;
- GBM ground-speed prediction;
- offline training, online ETA calculation;
- train/validation and cross-validation/grid-search procedures.

This supports the later PRE/AIRBORNE split and trajectory-preservation design. It does not define the Stage-1 anchor-probe duration.

Sources:
https://www.mdpi.com/2226-4310/10/8/675
https://scholarworks.sjsu.edu/faculty_rsca/4774/

### NIST sampling guidance
NIST says a sampling plan should define what is measured, when/how it is measured and roles; precision depends on variability, measurement error, independent replication/sample size and sampling efficiency; stratification can reduce systematic error; sample-size choice must consider target parameters, cost, prior information, variability, practicality and desired precision.

NIST does **not** state that six airports or two hours is universally sufficient.

Sources:
https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc33.htm
https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc332.htm
https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc333.htm
https://www.itl.nist.gov/div898/handbook/ppc/section1/ppc134.htm

---

## Entry 2026-09-26 06:04 PDT — why Stage 1 is two hours

### Question
Where does the exact Stage-1 two-hour probe come from and how do we know it is “correct”?

### Answer
The exact two-hour duration is a **V3.9 project protocol choice**, not a duration prescribed by the cited SJSU/SDSU papers.

Its role is to create a standardized, bounded, comparable exposure across candidate airports under finite AeroDataBox credits. The design tries to control obvious confounding by using the same target duration, matched weekday/time class, same cap/reconciliation policy and pre-frozen scoring rules.

The scientific support is therefore indirect:
- NIST supports pre-planned sampling, comparability, stratification, precision/cost tradeoffs and avoiding systematic sampling error.
- Aviation papers support the feature/phenomenon being measured.
- AeroDataBox documentation constrains the actual provider economics and alert behavior.

### Limitation
The repository does not currently contain a literature result proving “120 minutes is statistically optimal.” Therefore it must not be presented that way.

A stronger future justification would include an explicit precision/sensitivity analysis of whether two hours yields adequate effective sample size for the metrics used. Existing gates such as rows/hour, minimum stability buckets and ambiguity bounds partially protect against inadequate observation, but they are not a substitute for claiming a literature-derived optimal duration.

---

## Entry 2026-09-26 06:04 PDT — why physical-flight identity exists

### Question
Where does the decision to identify physical flights instead of only distinct flight numbers come from?

### Answer
This follows from the scientific quantity the project wants to measure.

A flight number is a service label and can repeat across dates. One aircraft can operate many flight numbers; one flight number can be operated by different aircraft. Delay-propagation research explicitly reasons over previous flights of the **same aircraft**, tail number, flight order and aircraft utilization. Therefore one must distinguish:
- public/operating flight number;
- one physical flight leg/instance;
- physical aircraft/tail.

The V3.9 Plan §9 specifies distinct canonical/physical flight instances for yield/stability logic and says retries/updates must not recount a flight.

The legacy prepaid implementation used flight-number/runtime-key proxies. September 25's physical-flight work corrected toward the Plan's intended unit. P2G13 then exposed an implementation parity bug in that new adapter.

This is therefore **not an arbitrary AI feature added for MMUN**. It is an implementation of a scientific identity requirement already present in the Plan and consistent with the aircraft-chain literature.

---

## Entry 2026-09-26 06:04 PDT — why compare regions

### Question
Why are WSSS, OMAA, MMUN, LKPR, SKBO and YSSY being compared?

### Answer
The pre-outcome compact-six amendment intentionally retained one frozen candidate from each macro-region:
- WSSS: Asia-Pacific
- OMAA: Gulf/Africa
- MMUN: North America
- LKPR: Europe
- SKBO: South America
- YSSY: Oceania

The purpose is not to prove one continent is “better.” It is to prevent the eventual anchor pool from being selected only from one geographic/operational context while keeping data-collection cost bounded.

The final anchor score includes exogenous traffic, geographic diversity, carrier/international diversity and measured provider yield. Capacity remains a separate feasibility gate.

The one-per-region compact design is a project-specific stratification/cost compromise informed by statistical sampling principles. NIST supports stratification as a method for controlling systematic sampling error but does not choose these six airports.

---

## Entry 2026-09-26 06:04 PDT — can Stage 2 fix WSSS/OMAA comparability?

### Question
Instead of remeasuring WSSS/OMAA using corrected metrics, can their future four-hour Stage-2 probes solve the mismatch?

### Answer
**Not under the currently binding compact Phase-2G protocol.**

Two independent reasons:

1. The compact-six amendment superseded automatic Stage-2 confirmation. It says:
   - after all six Stage-1 candidates are terminal and at least five valid, rank/select;
   - **stop after Stage 1 unless a predeclared trigger exists**;
   - Stage 2 is conditional, not “all six get another four hours.”

2. V3.9 §9.2 defines the WSSS primary yield reference as measured under the **identical target-2h, 500-cap-censored protocol**, with OMAA as fallback. A four-hour Stage-2 result is a different exposure class and cannot silently replace a two-hour reference without a prospective amendment.

Therefore “we will fix WSSS/OMAA automatically in Stage 2” is not currently a valid assumption.

### Consequence
If final Stage-1 scoring retains the current yield-reference formula while the remaining candidates use corrected physical-flight metrics, the reference/candidate metrics need a comparable contract before final ranking.

Scientifically clean options include:
- prospectively obtain corrected two-hour measurements for the historical reference/candidate rows that must enter the common ranking; or
- prospectively amend the normalization/scoring method so incompatible legacy metrics are not mixed.

The choice must be frozen before remaining outcomes can influence it.

This is a **metric comparability problem**, not a statement that WSSS P2G11 or OMAA P2G03 failed operationally.

---

## Entry 2026-09-26 06:04 PDT — why not keep repeating WSSS indefinitely

### Question
If the metric changed, why should we ever rerun WSSS/OMAA, and how do we avoid another endless loop?

### Answer
A repeated measurement is justified only by a documented non-outcome reason:
- infrastructure invalidated the run;
- reconciliation failed;
- scientific implementation violated the pre-frozen contract;
- or a prospectively frozen cross-version comparability requirement makes the historical metric unusable for the intended common score.

It is **not** justified because an observed score is undesirable.

Any corrected-contract remeasurement must be bounded before observing its outcome (for example one additional contract-correction attempt) and preserved alongside the historical success rather than rewriting history.

---

## Entry 2026-09-26 06:04 PDT — source reliability

### Question
How much can the team trust an AI-created protocol?

### Answer
The protocol should not be trusted merely because an AI wrote it.

It should be trusted only to the extent that each important claim survives independent verification against:
- peer-reviewed literature for scientific propositions;
- authoritative provider/government documentation for provider semantics;
- standard statistical references for sampling principles;
- explicit prospective project decisions for values not dictated by literature;
- repository code/tests for implementation;
- immutable runtime artifacts and run receipts for what actually happened.

The AI's role is synthesis, consistency checking, coding and traceability—not scientific authority.

If a rule has no adequate external or methodological basis, the correct action is to label it project-specific, justify it, test sensitivity, amend it prospectively if needed, or block the affected claim.

---

## Entry 2026-09-26 06:04 PDT — P2G13 closure

### Evidence supplied by operator
The exact-session cleanup deleted all 39 expected blobs and verified zero remaining runtime rows/live blobs. The settling finalizer subsequently returned:
- PASS_COMPLETED_AND_BUDGET_CLOSED;
- reconciliation MATCH;
- active billable subscriptions 0;
- provider mutation false;
- finalizer credits spent 0;
- cleanup receipt SHA 7b2721320868760b2d305b31905d0a7744028ce799d1573c1b6cb2aeea9a78b5;
- finalizer receipt SHA 796240f07af575384b63b65c11b7264daeee8d40226daa0756320feddfb57593.

### Interpretation
P2G13 is operationally closed. Its physical-identity-v1 scientific metric result remains invalid/excluded; cleanup/finalization does not convert it into valid promotion evidence.

---

## Documentation rule going forward

For each substantive operator question that affects scientific interpretation, execution policy, code, rerun eligibility, or source provenance:
1. append a timestamped entry to this file or a linked incident/report;
2. preserve the question in faithful paraphrase;
3. record the answer;
4. identify source class (literature / provider / project protocol / engineering);
5. record code/document implications;
6. never silently revise historical answers—append a correction if later evidence changes the conclusion.
