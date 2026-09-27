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


---

## Entry 2026-09-26 06:04 PDT — resolved WSSS/OMAA comparability decision after deeper audit

### Question
If WSSS and OMAA successfully ran, but their metrics used the legacy flight-number proxy while MMUN/future candidates use corrected physical-flight identity, do WSSS and OMAA actually need another measurement? Can Stage 2 solve it instead?

### Resolved answer
Yes, **if the project retains the current V3.9 §9.2 yield-reference normalization and common Stage-1 ranking**, WSSS and OMAA require one corrected two-hour measurement under the same physical-v2 contract before final ranking.

This is not because their historical provider executions failed. They remain successful historical executions.

The reason is measurement comparability:
- WSSS P2G11 and OMAA P2G03 metrics were produced by legacy `DISTINCT flight_number` / runtime-key proxy logic;
- future candidates use physical `flight_instance_id` semantics;
- §9.2 normalizes candidate yield against WSSS primary / OMAA fallback components measured under the identical target-2h Stage-1 protocol;
- the September 25 amendment prohibits mixing legacy NULL-contract metrics with physical-flight metrics for promotion.

A four-hour Stage-2 measurement is not a substitute under the current protocol because:
1. compact Stage 2 is conditional, not automatic for all six;
2. a 4h exposure is not the binding identical 2h reference exposure in §9.2.

### Scientific disposition
The draft bounded sequence `WSSS → OMAA → MMUN` is therefore scientifically defensible as **contract-correction remeasurement**, not outcome-driven retry.

Each receives at most one v2 correction attempt under the current draft. Historical runs remain immutable.

### Correction of prior conversational guidance
Earlier conversational guidance that WSSS/OMAA could simply remain untouched through final ranking was too permissive. It failed to fully combine:
- the plan's physical-flight unit;
- §9.2 common reference normalization;
- the legacy metric SQL;
- the September 25 non-mixing rule.

This entry supersedes that earlier interpretation.


---

## Entry 2026-09-26 06:42 PDT — does GitHub make infrastructure failure impossible?

### Question
Now that the two-hour owner/watchdog runs on GitHub Actions, is it impossible for an infrastructure issue to happen again?

### Answer
No. GitHub Actions removes or isolates several **specific historical failure modes**, but does not make the entire experiment infrastructure-proof.

What GitHub ownership directly fixes or materially reduces:
- Replit interactive shell exit no longer owns the two-hour paid lifecycle;
- Replit workspace/process replacement no longer automatically kills the paid owner;
- the owner and independent watchdog now live outside the callback-host process;
- exact runtime/DB/secret binding can be rechecked from a separate failure domain;
- exact provider recovery can still run even if the callback process is impaired.

Residual infrastructure risks that still exist:
- Replit callback runtime can be unavailable or replaced;
- AeroDataBox control-plane/balance/delete endpoints can return 5xx or be unavailable;
- internet/network/DNS/TLS delivery can fail;
- database connectivity or PostgreSQL can fail;
- GitHub Actions can be delayed, interrupted, or unavailable;
- webhook/runtime secrets or configuration can drift;
- provider subscription deletion can fail;
- cloud/platform outages can affect either side.

Therefore the correct statement is:

~~~text
GitHub Actions materially hardens the architecture and removes the old
single-Replit-owner failure mode.

It does not make infrastructure failure impossible.
~~~

The scientific rule remains: if infrastructure failure censors or compromises a paid measurement, preserve it as invalid/failed evidence and do not pretend it was a valid scientific probe.


---

## Entry 2026-09-26 20:01 PDT — were the failures missing from the Plan, missed by implementation, or only discoverable by live experimentation?

### Question

Were the Stage-1 failures things the Plan already anticipated but the implementation failed to follow, or were they failure modes that the Plan could not know until the experiment was actually run? Is the correct understanding that experimentation is iterative: we try to prevent known failures, but real runs can expose previously unknown assumptions/failure modes, after which the protocol and implementation are strengthened?

### Answer

**Both categories occurred. They must be separated.**

#### Category A — the scientific/protocol requirement already existed, but implementation or test coverage did not fully satisfy it

The clearest example is physical-flight identity.

The binding V3.9 Plan already requires:
- confirmed distinct physical `flight_instance_id` as the Stage-1 yield count unit;
- retries/updates never create new flights;
- retimes stay under the same physical identity unless positive evidence proves a distinct leg;
- unresolved identity remains bounded rather than guessed.

However, historical WSSS/OMAA Stage-1 code used flight-number/runtime-key proxies for portions of the metric calculation, and the first explicit prepaid physical-flight v1 resolver omitted one exact schedule-aware lookup already present in the normal production resolver.

Therefore:
- the **scientific idea was not missing**;
- the **implementation was incomplete relative to the intended construct**;
- the exact missing live regression case was not covered by tests.

P2G13 MMUN exposed that gap using a real pattern:
- no provider_flight_id;
- same exact operating carrier/flight/route/service date/scheduled time;
- first callback lacked callsign/aircraft;
- later callback gained callsign/aircraft;
- v1 prepaid resolver quarantined the later update instead of reusing the existing physical identity.

This is best classified as a **measurement-implementation defect exposed by experimentation**.

#### Category B — specific infrastructure/provider failure modes were not fully knowable until live operation

Examples:
- AeroDataBox control-plane HTTP 502 during balance/delete operations;
- Replit development workspace/process replacement killing the paid owner;
- cross-environment webhook-secret mismatch;
- provider/internal one-credit delivery gap;
- transient runtime-state loss.

The Plan could and did require general fail-closed behavior, accounting, provenance, ownership, and cleanup, but it could not enumerate every exact cloud/provider/runtime failure signature in advance.

These failures are operational discoveries. After each one, the project should convert the newly observed failure class into:
- a regression test;
- a preflight/gate;
- a watchdog condition;
- a durable evidence requirement;
- or an architectural change.

#### Category C — live results can expose that a project assumption or metric operationalization is weaker than intended

The historical `COUNT(DISTINCT flight_number)` proxy is an example.

The Plan's scientific target was a physical flight instance, but the legacy metric implementation used a simpler proxy. Once the project audited the implementation against the scientific construct, that discrepancy required correction.

This is not the same as an airport “failing.” It is a **measurement-model refinement**.

### Is this normal scientific/engineering experimentation?

Yes.

NIST's Engineering Statistics Handbook explicitly recommends a **sequential/iterative approach to design of experiments**, stating that it is often a mistake to expect one large experiment to provide all answers and that successive experiments commonly supply information used to design follow-up experiments.

Sources:
- NIST DOE steps / iterative approach:
  https://www.itl.nist.gov/div898/handbook/pri/section1/pri14.htm
- NIST iterative nature of experimentation:
  https://www.itl.nist.gov/div898/handbook/pri/section2/pri223.htm
- NIST confirmatory runs / unexpected results:
  https://www.itl.nist.gov/div898/handbook/pri/section4/pri46.htm

NIST also advises preserving raw data and recording what happens during experiments. The project's retention constraints prevent indefinite raw-provider retention, so the project compensates with durable reconciliation evidence, hashes, aggregate metrics, tombstones/cleanup receipts, and failure reports.

### Important qualification

Iterative experimentation does **not** mean changing rules after seeing an undesirable airport score.

A scientifically acceptable follow-up must be triggered by a non-outcome reason such as:
- measurement implementation violated the frozen construct;
- infrastructure censored the exposure;
- accounting completeness failed;
- measurement methods are not comparable;
- a predeclared uncertainty bound is too wide.

The follow-up rule must be frozen before the corrected run's outcome is observed.

---

## Entry 2026-09-26 20:01 PDT — why can't legacy WSSS/OMAA metrics be mixed with corrected MMUN/LKPR metrics?

### Question

According to whom or what scientific/statistical principle is it wrong to compare or mix the WSSS/OMAA legacy metrics with the corrected physical-flight metric used for MMUN and later candidates? Is this mathematics, statistics, probability, measurement theory, or something else?

### Binding repository answer

The repository already records the non-mixing rule explicitly.

The September 25 Physical-Flight Identity Metric Correction states:
- the experiment requires distinct physical flight instances;
- legacy prepaid metrics used flight-number/runtime-key proxies;
- WSSS/OMAA historical metric_contract_version remains NULL;
- those metrics **MUST NOT be mixed** with the corrected physical-flight contract for Stage-2 promotion or corrected anchor-yield normalization;
- corrected historical metrics cannot be reconstructed exactly because transient provider payloads were purpose-deleted.

The binding Plan §9.2 also defines WSSS as the primary yield reference and OMAA as fallback under the **identical target-2h protocol**, with component standardization:

```text
component_std = candidate_component / reference_component
```

for the same components:
- unique physical flights per credit;
- compatible tail-chain links per credit;
- stability.

### External scientific basis

This rule is primarily a **measurement theory / metrology / experimental-design comparability** issue, with statistical consequences.

The International Vocabulary of Metrology (JCGM/BIPM) defines:
- **measurand** as the quantity intended to be measured;
- measurement as requiring a defined quantity and a specified measurement procedure;
- metrological comparability as comparability of measurement results traceable to the same reference.

Sources:
- VIM measurand:
  https://jcgm.bipm.org/vim/en/2.3.html
- VIM measurement:
  https://jcgm.bipm.org/vim/en/2.1.html
- VIM metrological comparability:
  https://jcgm.bipm.org/vim/en/2.46.html
- VIM reference value:
  https://jcgm.bipm.org/vim/en/5.18.html

NIST likewise emphasizes that changes in the measurement process can change bias/variability and that measurement-process control is needed to guarantee comparable results.

Sources:
- NIST measurement process control:
  https://www.itl.nist.gov/div898/handbook/mpc/section2/mpc21.htm
- NIST Measurement Process Characterization:
  https://www.nist.gov/publications/nistsematech-engineering-statistics-handbook-chapter-2-measurement-process
- NIST repeatability/reproducibility terminology:
  https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-d1-terminology

### Why the old/new ratio is not scientifically clean

Legacy WSSS/OMAA asked approximately:

```text
How many distinct flight-number labels did I observe per credit?
```

Corrected v2 asks:

```text
How many confirmed distinct physical operating legs did I observe per credit?
```

These are related but not identical measurands/operational definitions.

A mathematical ratio can still be calculated numerically, but the scientific interpretation is confounded because the numerator and denominator were produced by different measurement definitions.

Analogy:

```text
candidate = unique PEOPLE per dollar
reference = unique USERNAMES per dollar
```

Both are counts divided by dollars. Dividing one by the other yields a number, but it is not a clean comparison of the same construct.

In experimental-design terms, **airport and measurement method become confounded**:
- WSSS/OMAA → legacy proxy method;
- MMUN/LKPR/SKBO/YSSY → physical-v2 method.

If a score differs, one cannot tell cleanly whether the difference is due to airport/provider yield or due to the changed measurement method.

That is why common-contract remeasurement is required if the current §9.2 reference-normalization formula is retained.

### Why this is not merely probability

Probability/statistics enter later when describing variability, uncertainty, sampling, stability and protected evaluation.

The first-order problem here is **measurement validity and comparability**: are all candidates measuring the same scientific quantity with a compatible procedure?

Statistics cannot repair a construct mismatch after the fact unless there is a validated bridge/calibration model between the old and new procedures. The deleted historical item-level WSSS/OMAA payloads prevent us from building that exact retrospective bridge now.

---

## Entry 2026-09-26 20:01 PDT — current bounded recovery decision and week objective

### Decision

Under the retained V3.9 §9.2 reference-normalization design, the corrected common-contract sequence is:

```text
WSSS v2
→ OMAA v2
→ MMUN v2
→ LKPR
→ SKBO
→ YSSY
```

These WSSS/OMAA runs are **contract-correction remeasurements**, not claims that their historical provider executions failed.

Each WSSS/OMAA/MMUN corrected-contract attempt is bounded by the frozen recovery policy; no automatic repeated attempts are authorized.

### Week objective

The engineering goal for the coming weekday sequence is to finish the necessary corrected Stage-1 regional measurements as efficiently as the frozen timing windows and provider budget permit, while refusing any run that is not ready.

The objective is **zero repeat failures of already-known failure classes**.

A guarantee of zero new failure classes is scientifically/operationally impossible because external providers/cloud systems and unknown implementation edge cases remain possible.

Before each paid run, the no-repeat checklist must cover:
- every historical infrastructure failure;
- every reconciliation/accounting failure;
- every scientific identity/metric failure;
- metric-contract compatibility;
- exact source/runtime binding;
- provider safety and cleanup ownership.



---

## Entry 2026-09-27 — can the live experiment logs detect scientific failures faster?

### Question
The historical runs required substantial post-run analysis to identify scientific failures. Can logging/scripts be strengthened so an operator can see during the live experiment whether the scientific measurement itself is behaving correctly, not merely whether callbacks/provider spending are healthy?

### Answer
Yes, and this is being implemented prospectively before WSSS-v2.

The existing GitHub watchdog was primarily an infrastructure/accounting watchdog. It observed callback failures, provider balance, internal credits, deadline behavior and subscription safety.

The new scientific-health layer reads the exact session's aggregate identity state every watchdog cycle and checks **measurement invariants**, not outcome quality.

The monitor reports counts for resolved/quarantined identity, physical IDs, exact-leg repetition, ambiguity and tail enrichment. It does not copy row-level provider-identifying data into GitHub logs.

### What automatically stops the run
Only a hard measurement-contract violation can trigger recovery, such as:
- one exact scheduled leg splitting into two physical IDs;
- a previously resolved exact leg later becoming quarantined;
- provisional identity drift for the same exact scheduled leg;
- impossible resolved/quarantined row shapes;
- wrong metric-contract version.

### What does NOT stop the run
The monitor is prohibited from stopping based on:
- low flight yield;
- low tail-chain yield;
- high ambiguity;
- low stability;
- missing provider IDs/callsigns;
- unfavorable score.

Those are outcomes and using them to decide whether to continue would create outcome-dependent bias.

### Evidence
The watchdog emits both a concise human line and structured JSON every cycle, and stores aggregate snapshots in a retained GitHub Actions artifact.

The operator also gets a provider-free manual `scientific-health` command.

### Scientific rationale
This is measurement-system monitoring. It strengthens detection of violations of the already-frozen measurand/identity contract without changing the scientific outcome rule or candidate scoring.
