70. Prompt for your other AI agent

This is the version I'd give it. It is deliberately strict so the agent doesn't decide to invent V3.10 or silently rewrite your design.

Audit and patch V3.9_DataCollectPlan.md PART 1 and IMPLEMENTATION_LOG(1).md BEFORE any Phase-6 / 31-day collection begins.

NON-NEGOTIABLE RULES:

PART 1 (§1–§22) remains the only binding specification.

Do NOT create V3.10/V3.11/etc.

Do NOT implement from PART 2 historical text unless the resolved rule is first copied/adjudicated into PART 1.

Preserve the current architecture unless a genuine contradiction requires a correction.

ADB_AUTO_COLLECT remains false.

Do not begin the 31-day run.

Do not use outcomes from any valid experimental collection to choose definitions retrospectively.

Every collection-affecting and primary-evaluation-affecting choice below must be frozen before the scientific run or explicitly classified as a later experimental unknown.

Keep an adjudication/change record showing exactly what was changed, why, source/measurement used, and where the final rule lives.

Synchronize code, schema, PART 1 and the implementation log. If code and PART 1 conflict, stop and resolve the conflict rather than silently choosing one.

No speculative “industry standard” claims. Separate peer-reviewed support from our project-specific choices.

PRE-FREEZE PATCHES REQUIRED:

Replace the current blanket classification of all 4,053 universe-only airports as REGIONAL. Define and implement a defensible traffic-tier classification for the entire frame. Freeze traffic measure, data source, reference period, HUB/MID/REGIONAL thresholds, missing-reference policy and tier version. Rebuild clean.adb_sampling_frame.

Freeze macro-region mapping with a validated lookup/version. Do not rely on an undocumented ICAO-first-letter heuristic where exceptions can misclassify geography.

Resolve PRE-vs-POST airport eligibility. The controller currently filters post_eligible; define whether the integrated core frame requires pre_eligible && post_eligible or whether separate PRE and POST slot/frame mechanisms are required. Ensure every airport for which S1/FIDS population is required has the required schedule support.

Define canonical flight_instance_id: operating carrier, operating flight, origin, destination, service date/scheduled time, provider ID if available, codeshare mapping, retime/revision handling and collision fallback.

Define codeshare deduplication so multiple marketing flight numbers do not automatically become multiple unique physical flight legs.

Fully specify the FIDS population protocol: arrivals/departures/both, query interval, airport-window boundaries, pagination, deduplication, cancellations, diversions, codeshares, schedule revisions and population membership per cutoff.

Explicitly specify how historical FIDS/schedule state is preserved as-known-at T−24/T−6/T−90 rather than reconstructed from a later final schedule.

Produce an explicit worst-case REST/FIDS cost calculation proving the planned population/census calls, validation calls and retry contingency fit the REST budget.

Define exactly what scheduled milestone T means in T−24/T−6/T−90. Do not leave generic “scheduled departure.”

Complete the binding provider-field mapping for all eight OOOI/ASPM-style milestones. Each mapping needs provider JSON path, semantic meaning and caveat. Unverifiable milestones remain NULL + milestone_unverified.

Freeze four-timestamp semantics and sanity checks: event timestamp, provider publication timestamp, received timestamp, available_at, including missing values and clock-order anomalies.

Freeze the censoring grace interval based on Gate-0.5 notification-latency evidence and record it in the manifest.

Freeze airborne_usable minimum point count.

Freeze trajectory-completeness threshold, maximum gap, minimum trajectory duration/coverage and calculation.

Freeze POST observation-cadence target, minimum acceptable cadence, maximum gap and warning/fail behavior.

Replace generic outcome observed availability with target-specific label-observation fields for gate-out, wheels-off, wheels-on and gate-in targets.

Resolve the zero-yield contradiction in PART 1. Define exact once/repeated/persistent state transitions and specify which state changes adaptive multiplier m_i.

Define the complete REGIONAL adaptation:
m_{i,t+1} = f(m_{i,t}, observed_yield_history, zero_yield_state, ...).
Freeze history window, smoothing, update cadence, cold-start state, reset behavior, missing-yield behavior, floor 0.25 and cap 1.5.

Define the coverage floor mechanism mathematically, including selection frequency/no-starvation behavior.

Define network_degree: directed/undirected, in/out/total, unique destinations vs operation counts, minimum route-frequency threshold, data source and fixed reference period.

Define carrier_diversity: exact metric (count/entropy/HHI/effective carriers), operating-vs-marketing carrier, denominator and reference period.

Define international/domestic mix: route classification, numerator, denominator and reference period.

Define exogenous traffic score source, reference date/window and normalization.

Define geographic/network-diversity score formula and source.

Define carrier/international-diversity score formula and source.

Copy the exact binding anchor-yield transformation into PART 1. If current implementation remains:
component_std = clamp(candidate/reference,0,1),
state that explicitly and justify clipping values above WSSS.

Define WSSS and OMAA roles precisely: primary reference, fallback, diagnostic/reference comparison and invalid-reference behavior. Rename this concept from ambiguous “calibration” to yield reference normalization or otherwise clearly distinguish it from probabilistic model calibration.

Put the exact stability calculation into PART 1, including 15-minute bucket definition, variance/SD/CV convention and current stability = 1/(1+CV) if retained.

Freeze the anchor shortlist in the manifest with exact exogenous values, source citations, retrieval dates and hashes.

Define matched time-class and weekday-class for anchor probes and the exact scheduling algorithm.

Freeze Stage-2 promotion count and duration. If code uses top candidates for 4 h, say exactly that.

Freeze and justify the capacity gate. If rows_per_hour >= 60, put 60 in PART 1 and manifest.

Explicitly state that the rotating anchor consumes the single HUB slot in {HUB:1, MID:2, REGIONAL:1} if that remains the intended design.

Freeze HUB and MID selection mechanics including current freshest-first/recent-exclusion logic and deterministic tie-breaking.

Fully specify crossover design: crossover group identifier, experimental unit, period 1/2, template matching variables, treatment assignment/randomization, incomplete-pair handling and order/carryover policy.

Define weather-severity, ATC-delay-program and storm-track metadata: source, algorithm, threshold/category encoding and availability timestamp.

Freeze scheduler tie-breaking when several seeded candidate schedules have equal weekday×UTC imbalance. Remove optional “may also include...” criteria or make them binding.

Define exactly what coverage-age <= 5 d core means and which airports belong to core.

Freeze all frame/reference snapshot sources, effective dates, versions and hashes used for traffic, degree, route and carrier calculations.

Fully specify historical_feature_store bootstrap: lookback window for airport delay, route delay, carrier×airport delay, tail/previous-leg delay, utilization/congestion and formal history_ready_at criterion.

Freeze weather-source hierarchy and joins: METAR/TAF/GFS/ERA5 precedence, issue/amendment selection, spatial/temporal join, missing-data behavior and availability timestamp.

Define graph edge observation rules: static-route reference window, dynamic-congestion formula, resource-edge sources, aircraft-chain matching and explicit known-absent vs unknown masks.

Define chain completeness exactly, including what “should have had an observable successor” means, turnaround/time-gap threshold, boundary handling and missing-registration handling.

Define OD/route identity and directionality, including diversion/codeshare handling.

Define aircraft-tail identity and aircraft-swap/missing-registration policy.

Ensure every PRE/POST derived snapshot has provenance back to exact raw observations used.

EVALUATION PRECOMMITMENT:

Fix the Engine-A test-protection chronology. Do NOT materialize test rows before they exist. Before collection, freeze/hash the split-assignment rule, dates/groups/seed. After collection and before model tuning, materialize the actual test row IDs using that frozen rule, hash them, make them read-only and never tune against them.

Freeze Engine-A train/validation/test chronological boundaries.

Freeze Engine-B airport holdout fraction/count/stratification/seed.

Freeze Engine-C region holdout.

Freeze Engine-D tail/aircraft-type holdout.

Freeze Engine-R directed OD/route holdout.

Define disruption_event and event_id: source, event boundaries, merging rule and severity.

Use canonical flight_instance_id as the POST same-flight grouping key.

Freeze block-bootstrap confidence level, replicate count and block unit per engine.

Freeze rolling-origin folds.

Freeze the primary metric and decision rule for “Model 1 beats Model −1.” State metric direction and practical/statistical threshold.

Declare primary vs secondary/exploratory endpoints across engines, horizons and metrics so results cannot be cherry-picked.

Freeze hyperparameter/model-selection protocol; validation only for tuning; final test prohibited.

Freeze exact column groups for collection-mechanism ablation.

Freeze staleness bucket boundaries and last_observation_timestamp definition.

Clarify Month-1 vs later collection-regime robustness; event sampling is not active at scale in Month 1.

Freeze probabilistic-calibration implementation: ECE binning, Brier targets and probability output definitions.

Resolve the conformal inconsistency: either define a Month-1 prediction-interval method/coverage target or explicitly defer conformal/interval metrics to Model 7/later.

Define severe-delay “tail performance” metrics for >=60 and >=120 minutes.

Freeze missing-feature handling per model.

Define learning-curve observation unit and fit method.

Fully specify randomized/paired collection-marginal-value interventions: experimental unit, assignment, metric, replication and repeated-intervention sequence.

Predeclare the Month-2 power-analysis trigger, primary window-comparison endpoint and effect-size-estimation method. Month 1 remains pilot evidence.

DOCUMENT / IMPLEMENTATION CONSISTENCY:

Update PART 1 status language so it distinguishes architecture locked from pre-freeze measured manifest values pending.

Update R1–R7 / S1–S5 status wording to reflect the actual implementation state rather than stale “planned/new” text.

Correct IMPLEMENTATION_LOG wording that implies flight_data_pre_post is the only real data table. flight_events, flight_population, flight_snapshots, flight_airborne_snapshots, trajectories/outcomes and historical feature store are first-class research data layers under current PART 1.

After re-tiering/re-regioning, regenerate the frame and update all recorded 18-cell counts and eligibility counts. Do not carry old 18/18 values forward.

Synchronize exact anchor formulas/thresholds and REGIONAL adaptation between code, PART 1, schema comments and IMPLEMENTATION_LOG.

Keep PART 2 explicitly non-normative and do not allow old rules to override PART 1.

After all above decisions and Gates 0–5 pass, write the versioned manifest containing frame version/hash, tier/region reference version, anchor formula/version, final anchor pool, scheduler seed/rule, adaptive-rule version, FIDS population-builder version, milestone mapping, cadence/trajectory thresholds, censoring grace, snapshot builder SHA, feature-store readiness, split-assignment rule/hash, actual account/budget parameters and source versions.

Run a final preflight search over PART 1 and executable config for unresolved experimental-control words such as proposal, TBD, ambiguous ~, may, unspecified threshold, or competing alternatives. Classify each occurrence as either:
(a) empirically estimated but frozen before Phase 6,
(b) explicitly exploratory after collection and unable to alter collection or primary evaluation,
or
(c) a remaining blocker.

Only after this checklist, Gate 0, Gate 1, Gate 2, Gate 3, Gate 0.5, Gate 4, Gate 5 and the final FREEZE all pass may Phase 6 / the 31-day run begin.

Do NOT change these established principles:

frame from measured provider-supported universe;

zero yield does not imply nonexistent airport;

FIDS/provider population defines denominator, not webhook capture;

snapshot existence is population-defined;

post-cutoff data supplies labels only;

information must actually have been available by cutoff;

immutable raw provenance;

PRE and AIRBORNE remain separate training sets;

no raw airborne time-series overwrite;

no automatic flight-row 1/p;

anchor live yield remains a minority component;

REGIONAL adaptive allocation remains bounded and explicitly efficiency-oriented;

no population-representative claim without evidence;

GNN remains a hypothesis, not default;

Month 1 remains an early operational pilot;

no 31-day/57,900-credit run until all preflight gates and final freeze pass.

At the end, produce:

a patch/change table with old wording → new wording → reason → section → code/schema impact;

the final frozen-values table;

an unresolved-items table that MUST be empty for collection-affecting and primary-evaluation-affecting choices;

commands/tests needed to verify every changed rule;

a GO/NO-GO verdict for Phase 6.

That is the version I would use before letting the main experiment begin.

The biggest change from my earlier answer is that I am not comfortable with the statement “only ten things remain.” The deeper comparison of the actual implementation against the binding Part 1 exposed additional specification issues—especially the provisional REGIONAL classification of 4,053 airports, the undefined adaptive-(m_i) update, the anchor/HUB relationship being implicit rather than binding, target-specific outcome availability, canonical flight-instance identity, and the Engine-A test-row freeze ordering.

Those are exactly the kinds of things you want to catch now, while autoCollect=false, rather than halfway through the experimental month.

Yes. I remember the exact issue from our earlier work on this project: each time we re-reviewed V3.9, we mixed together three different questions—“is the architecture scientifically sound?”, “is every implementation detail specified?”, and “is everything preregistered tightly enough to begin the 31-day experiment?” That made it look as if the scientific design itself kept changing. The #70 prompt was my attempt to apply the strictest third standard. Its own instructions say not to invent V3.10, not to redesign unless there is a genuine contradiction, and to distinguish peer-reviewed support from project-specific choices. 

After re-reading the current **V3.9 Part 1**, the **Implementation Log**, the #70 checklist, and checking the important claims against SJSU, SDSU, FAA, broader peer-reviewed work, and current AeroDataBox documentation, I can give you a much more stable answer.

# Final verdict

**V3.9's core scientific architecture is sound. I do NOT recommend another architectural redesign, and I do NOT recommend V3.10.**

But:

**The project is currently NO-GO for Phase 6 / the 31-day scientific collection.**

That is not because the PRE/POST architecture is wrong. It is because there are still several **pre-freeze definitions and implementation/specification mismatches** that must be resolved before the experimental run.

There is also a second, completely independent reason it is NO-GO: according to the latest state recorded in your files, Gate 3 has not actually passed, Gates 0.5/4/5 have not been completed, the final freeze has not happened, and `autoCollect=false`.  

So the stable conclusion is:

| Question                                                              | Final answer                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Is the overall PRE + AIRBORNE/POST architecture wrong?                | **No**                                                                      |
| Should we redesign it again?                                          | **No**                                                                      |
| Should we create V3.10?                                               | **No**                                                                      |
| Are many principles in V3.9 backed by aviation research?              | **Yes**                                                                     |
| Are every one of your numeric design constants “proven by SJSU/SDSU”? | **No — and they do not need to be**                                         |
| Is Part 1 fully frozen enough for the 31-day experiment today?        | **No**                                                                      |
| Should Phase 6 start now?                                             | **NO-GO**                                                                   |
| Is #70 completely wrong?                                              | **No, but it is too broad if all 77 items are treated as equally blocking** |

---

# 1. The most important thing: the scientific foundation checks out

There are several things I would now consider **settled** unless new provider evidence directly contradicts them.

### PRE and AIRBORNE should remain separate

Your Part 1 correctly treats PRE predictions at T−24/T−6/T−90m and AIRBORNE predictions at observation time \(t\) as separate modeling states. 

This is well supported by aviation research. SJSU's 2023 paper by Zheng, Zou, Wei, and Tian specifically studies **online ETA/landing-time prediction while a flight is airborne**, reconstructing raw trajectory sequences from latitude, longitude, and speed and predicting the remaining trajectory. That strongly supports treating AIRBORNE as a separate time-series prediction problem rather than mixing it into pre-departure rows. ([SJSU ScholarWorks][1])

So I would **not revisit this again**.

### Preserving every airborne trajectory point is correct

Part 1 says the raw trajectory must not be reduced to “latest location”; observations must remain reconstructable as a time series. 

That matches the methodology of the SJSU airborne-ETA study, which explicitly reconstructs sequences of flown trajectory points before making predictions. ([SJSU ScholarWorks][1])

**Keep S5. Do not go back to one-row/latest-state-only storage.**

### Previous-leg / aircraft-chain information is scientifically justified

The SDSU Chen & Li work is particularly strong here. It identifies departure delay and late-arriving-aircraft delay as important predictors and constructs chained predictions along the **same aircraft's itinerary**. ([ResearchGate][2])

The SJSU 2021 paper independently finds that previous delays, buffer time, weather, and aircraft utilization affect propagation, with previous-delay effects becoming stronger on later flight legs and with utilization. ([SJSU ScholarWorks][3])

The 2024 Transportation Research Part E review also identifies **flight-chain-based** and **airport-network-based** modeling as the two major perspectives in delay-propagation research. ([ScienceDirect][4])

Therefore these V3.9 principles are scientifically defensible:

**same-tail previous-leg history → yes; chain continuity → yes; route/network context → yes; utilization → yes; weather → yes.**

### GNN as a later hypothesis rather than the starting model is sensible

SJSU has published a GCN-GRU approach that models spatial network structure plus temporal delay evolution and reports improvements on its particular data. ([SJSU ScholarWorks][5])

But that does **not** mean a GNN is guaranteed to beat XGBoost on your AeroDataBox sample. The broader review shows many viable modeling classes and contexts. ([ScienceDirect][4])

So V3.9's “GNN is a hypothesis, not the default” position is exactly the cautious position I would retain.

### Your anti-leakage architecture is one of the strongest parts

Part 1 now requires:

$$
information\_available\_timestamp \le prediction\_cutoff
$$

rather than merely checking when the physical event occurred. It separately preserves event time, provider publication time, system availability time, and received time. 

That is methodologically strong. The leakage literature documents how seemingly minor leakage can produce dramatically overoptimistic ML results. ([Princeton University][6])

Likewise, Part 1's “schedule as it was known at the cutoff” rule and its immutable historical feature store are correct protections against retrospective reconstruction. 

**I would not weaken any of these rules.**

### Your provider-population denominator is also correct

Part 1 correctly says webhook observations cannot themselves define which flights “existed”; the FIDS/schedule layer defines the provider-observable population, while later events supply outcomes. 

For POST it similarly defines:

`airborne_eligible → observed → usable → complete → snapshot_eligible → labeled`

instead of silently training on only flights that happened to emit convenient airborne points. 

I did not find an SJSU paper saying “use AeroDataBox FIDS exactly this way”—nor should we expect one. This is a **sampling/selection-bias safeguard specific to your provider**, and methodologically it is the right idea.

---

# 2. Why #70 found more problems after earlier reviews

Here is where the confusion came from.

The current Part 1 says:

> architecture GO, sampling GO, research/eval GO … “Implementation lock: COMPLETE”

while also saying the 60k run must wait on the gates. 

But another Part 1 section still describes R1–R7 as “planned” and S1–S5 as “new.” 

Meanwhile, your Implementation Log says Phase 0 code work is done but Gates 1–2 are still in progress and Phases 3–5 remain pending. 

Those three statements are talking about different kinds of “complete.”

The wording should therefore be changed from:

**“Implementation lock: COMPLETE”**

to something like:

**“Architecture locked. Core implementation constructed. Pre-freeze measured values, operational definitions, gate validation, and final experimental manifest remain pending.”**

That one wording change would have prevented a lot of our earlier confusion.

---

# 3. These are the real remaining blockers I found

I would collapse the giant #70 list into approximately **12 substantive blocker families**. This is much more useful than pretending you have “77 separate scientific mistakes.”

| Blocker family                                         | My verdict                                              | Why                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **1. Traffic-tier classification**                     | **REAL — HIGH**                                         | 4,053 universe-only airports are currently automatically classified REGIONAL.                                                 |
| **2. Macro-region classification**                     | **REAL — HIGH**                                         | Implementation uses ICAO first letter rather than a frozen validated geography lookup.                                        |
| **3. PRE/POST frame eligibility**                      | **REAL**                                                | Need one explicit rule for which airports can serve PRE, POST, or both and therefore which slots/population calls they enter. |
| **4. Canonical physical flight identity + codeshares** | **REAL — HIGH**                                         | No binding `flight_instance_id` specification exists.                                                                         |
| **5. FIDS population protocol + REST budget**          | **REAL — HIGH**                                         | Population concept is right; exact executable protocol and worst-case cost are incomplete.                                    |
| **6. Exact cutoff/milestone/provider mapping**         | **PARTLY ALREADY RECOGNIZED — must finish at Gate 0.5** | Plan correctly says mapping must be verified, but it isn't frozen yet.                                                        |
| **7. POST cadence/trajectory/censoring thresholds**    | **MEASURE → FREEZE**                                    | These should come from canary evidence, not be invented now.                                                                  |
| **8. REGIONAL adaptation + coverage floor**            | **REAL — HIGH**                                         | Bounds exist, but the actual recurrence/update algorithm does not.                                                            |
| **9. Anchor formulas/procedure synchronization**       | **REAL, mostly specification**                          | Code has details Part 1 only states approximately.                                                                            |
| **10. Historical bootstrap/provenance**                | **Concept correct; exact readiness rule incomplete**    | `history_ready_at` exists, but exact historical sufficiency must be frozen.                                                   |
| **11. Evaluation preregistration**                     | **REAL — especially Engine A**                          | Split chronology and primary decision rule need correction.                                                                   |
| **12. Manifest/docs/code synchronization**             | **REAL**                                                | Binding plan, implementation log and executable behavior need one final synchronized state.                                   |

Let me show you why the first few are not theoretical nitpicking.

---

## 3.1 The 4,053-airport REGIONAL classification is genuinely wrong

The Implementation Log explicitly says:

> the curated airports retain their tier; **everyone else → REGIONAL**, with `traffic_prior=1.0`.

It also says macro-region comes from the **ICAO first letter**. 

That means the current frame has not actually measured the variable that Part 1 calls **traffic tier**.

A large international airport that wasn't in the original curated 276 can therefore be labeled REGIONAL merely because it was absent from your old hand-built list.

That makes your claimed stratification:

$$
traffic\ tier \times macro\text{-}region
$$

not really traffic stratification for most of the frame.

This is why #70 item 1 was correct.

### What should happen?

Not a redesign.

You need an **external, fixed traffic reference** for all airports and frozen thresholds for:

`HUB / MID / REGIONAL`.

It could be based on annual passenger movements, operations, scheduled movements, or another defensible traffic metric. The crucial scientific rule is not which metric I personally pick today; it is:

**the metric, source, reference period, thresholds and missing-data policy are chosen before the experimental run and never changed based on your collected delay outcomes.**

Then rebuild the frame.

---

# 4. Macro-region also needs correction

The Implementation Log explicitly says macro-region is assigned from the ICAO first letter. 

That can work as a crude engineering shortcut, but a stratification variable should be a proper airport→geographic-region lookup.

Again, this is not “SJSU says use exactly six regions.”

The six-region scheme is **your experimental design choice**. That's allowed.

But once you use region as a blocking/stratification variable and later create an “unseen region” Engine C, the assignment needs to be deterministic and defensible.

So #70 item 2 stays.

---

# 5. Flight identity and codeshares are one of the most important omissions

I searched the full binding Part 1 for `flight_instance_id`: there is no binding definition. 

Yet POST evaluation says all snapshots belonging to the same flight instance must remain in one partition. 

Those two facts do not fit together.

You cannot reliably enforce:

> “all observations from the same physical flight stay together”

without first defining:

> “what uniquely identifies one physical flight?”

And AeroDataBox makes this especially important because its FIDS API has an explicit `withCodeshared` option. Its documentation warns that if code-share information is unavailable, filtering may use inference and **false results are possible**. ([GitHub][7])

So you need to freeze something conceptually like:

$$
flight\_instance =
(\text{operating carrier},
\text{operating flight},
\text{origin},
\text{destination},
\text{service date/time})
$$

with provider identifier preferred where reliable, plus explicit rules for codeshares, retiming, diversion and collision fallback.

The exact implementation should be based on the actual AeroDataBox payload fields you receive.

This is a **real pre-collection blocker**, not a future modeling luxury.

---

# 6. Your FIDS population idea is right, but the protocol isn't finished

Part 1 correctly says approximately 2 API units per airport-window and requires a FIDS population row for each relevant cutoff. 

Current AeroDataBox documentation confirms airport FIDS is a **Tier-2** endpoint. It can retrieve `Arrival`, `Departure`, or `Both`, with `Both` as the default, and a single explicit time range can span at most 12 hours. ([GitHub][7])

This lets us make the rough base calculation I mentioned earlier.

Assuming:

* 4 collected airports/day,
* 31 days,
* 3 PRE cutoffs,
* one FIDS `Both` request per airport/cutoff,
* 2 units/request,

then:

$$
4\times31\times3\times2 = \mathbf{744\ API\ units}.
$$

Your Part 1 reserves about **1,000 API units** for census/REST operations. 

That leaves only roughly:

$$
1000-744=\mathbf{256}
$$

for Gate-5 validation, retries, supplementary calls and diagnostics.

That may be sufficient.

But **“may be” isn't enough before committing 58k-ish credits.**

The protocol needs to specify exactly:

arrivals/departures/Both; time-range boundaries; whether one query covers each cutoff; codeshare handling; cancellation/diversion inclusion; schedule revision handling; deduplication; as-known-at-cutoff preservation; and retry allowance.

Then calculate the worst case.

That is exactly why #70 item 8 is legitimate.

---

# 7. Provider milestone mapping is already correctly flagged in V3.9

This is important because this is **not another newly discovered flaw**.

Your Part 1 already says not to blindly rename AeroDataBox `scheduledTime`, `revisedTime`, `runwayTime`, etc. It requires every one of the eight milestone mappings to have verified provider semantics, and unverified values must remain NULL with `milestone_unverified`. 

That is the correct rule.

FAA terminology supports being this strict. FAA flight data distinguishes operational timestamps such as gate movement and runway movement, and delay calculations can also use derived/planned runway times rather than simply treating every “departure time” as interchangeable. ([ASPMHelp][8])

Therefore #70 item 10 does **not** mean:

> “we discovered the architecture was wrong.”

It means:

> **the architecture already requires field verification; now Gate 0.5 has to actually perform it and freeze the resulting mapping.**

That distinction matters.

---

# 8. Several #70 items are deliberately “measure first, then freeze”

This is another reason my previous responses appeared to keep discovering unfinished things.

Your plan intentionally does not yet know the correct values for things such as:

* censoring grace,
* minimum usable airborne points,
* maximum acceptable trajectory gap,
* POST cadence threshold,
* trajectory completeness threshold.

Part 1 itself says to measure cadence empirically rather than assume the provider has a fixed update frequency. 

Likewise, the censoring grace is currently a **proposal** of 60 minutes or measured notification latency plus margin and is explicitly supposed to be determined from Gate-0.5 evidence. 

And the POST denominator currently says:

> `airborne_usable ≥ N`, proposal ≥2 or ≥5

rather than pretending the required point count is already known. 

Those are **not mistakes**.

The correct scientific procedure is:

**predeclare how Gate 0.5 will estimate them → measure them using the pre-run canary → freeze the values → write them into the manifest → never alter them using the 31-day experimental outcomes.**

So #70 items 12–15 should be classified **MEASURE → FREEZE**, not “we need another theoretical review.”

---

# 9. REGIONAL adaptation is genuinely under-specified

This one I do agree needs fixing.

Part 1 says:

$$
m_i\in[0.25,1.5]
$$

and that the REGIONAL draw is normalized and yield-aware. 

But it doesn't tell us the actual evolution:

$$
m_{i,t+1}
=
f(m_{i,t},y_{i,t},\ldots).
$$

Likewise, “coverage floor” is named but not mathematically defined. 

That leaves room for the live controller to make decisions after seeing yield.

For exploratory data collection that's fine.

For a scientific collection experiment, it means your sampling policy is not yet reproducible.

You need to freeze:

history window → yield statistic → update cadence → smoothing → zero-yield response → cold-start → missing-data handling → min/max → no-starvation rule.

The bounds `[0.25,1.5]` can remain exactly as they are.

This is **specifying the existing V3.9 idea**, not redesigning it.

---

# 10. The anchor system has the same issue: principle good, constants partly implicit

Part 1 already locks:

* 40% traffic,
* 20% geographic/network diversity,
* 20% carrier/international diversity,
* 20% measured yield,
* 5 final anchors,
* 2-hour Stage 1,
* longer confirmation Stage 2. 

The Implementation Log gives additional details that Part 1 does not bind cleanly, such as:

* Stage 2 = **4 hours**,
* stability = \(1/(1+CV)\) over 15-minute buckets,
* capacity threshold = **60 rows/hour**,
* the anchor drives the HUB share.  

Those details should be synchronized into Part 1/config/manifest before you interpret probe results.

And I would rename WSSS/OMAA from **“calibration baseline”** to something like:

**yield-reference normalization**

because later you use “calibration” in the statistical/probability sense for Brier score/ECE. Using one word for two different operations invites confusion.

This is a terminology/specification cleanup, not a scientific redesign.

---

# 11. The Engine-A test ordering in Part 1 is definitely wrong

This is probably the clearest genuine contradiction in the document.

Phase 5 currently says:

> Write manifest
> **Materialize + hash the Engine-A test row set**

and then Phase 6 starts the 31-day collection. 

But before Phase 6, those flight rows literally don't exist.

Therefore #70 item 47 is correct.

The sequence should be:

**Before Phase 6:** freeze and hash the *rule* that assigns rows to train/validation/test—calendar boundaries, blocking variables, seed, disruption grouping, etc.

**After Phase 6:** apply that already-frozen rule to the newly collected rows, generate the actual test IDs, hash them and make them read-only.

**Then:** tune only on train/validation. Final test stays untouched.

Time-ordered evaluation is also consistent with standard time-series validation methodology, where training observations precede the observations being evaluated and rolling-origin evaluation progressively advances the forecast origin. ([OTexts: Online, open-access textbooks][9])

This patch should absolutely happen.

---

# 12. Some #70 evaluation items do NOT need to block data collection

This is where I would modify the #70 prompt itself.

A strict preregistration is good, but it shouldn't turn every downstream modeling choice into a data-collection blocker.

Here is the categorization I would use from now on:

| #70 group                                   | Final classification                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| #1–11                                       | **Pre-collection specification blockers**                                                                  |
| #12–15                                      | **Gate-0.5 measure → freeze**                                                                              |
| #16–41                                      | Mostly **freeze before Phase 6**, because they affect labels/sampling/collection/environment               |
| #42 detailed GNN edge formulas              | **Can defer**, provided raw data needed to construct the edges is preserved                                |
| #43–48                                      | **Freeze before primary evaluation; #43–47 strongly pre-collection relevant**                              |
| #49–52 detailed secondary holdout fractions | **Can be frozen before analysis rather than blocking collection**, provided no results are inspected first |
| #53–59                                      | **Primary evaluation protocol — predeclare before looking at experimental outcomes**                       |
| #60–67                                      | Mostly **pre-analysis**, not architecture blockers                                                         |
| #68                                         | Either fully preregister intervention now **or defer causal marginal-value experiment to Month 2**         |
| #69                                         | Predeclare Month-2 trigger/endpoint now; power calculation itself naturally uses Month-1 pilot variance    |
| #70–74                                      | **Real document/code consistency fixes**                                                                   |
| #75                                         | **Already satisfied**                                                                                      |
| #76–77                                      | **Final-freeze requirements**                                                                              |

Part 2 already has a very strong warning saying it is **non-normative historical context** and that only Part 1 governs. So #70 item 75 does not remain outstanding. 

This categorization is important because it stops the cycle of me later saying “I found 20 more things.”

They may be things worth specifying, but **not all of them can invalidate the collection.**

---

# 13. I found three research-citation/wording corrections

These aren't architectural flaws, but I would fix them so your report is academically accurate.

### SJSU #4774 is being asked to support too much

Your §19 table associates SJSU #4774 partly with aircraft-chain continuity. 

The actual SJSU #4774 paper is specifically about **online airborne time-of-arrival prediction using flight trajectories**, not downstream same-tail flight-delay propagation. ([SJSU ScholarWorks][1])

Use it for:

**AIRBORNE state, raw trajectory reconstruction, ETA/landing-time prediction.**

Use SDSU Chen & Li 2019 and SJSU Zheng et al. 2021 for:

**previous-leg delay, same-aircraft chaining, utilization, delay propagation.** ([ResearchGate][2])

That's a citation reassignment, not a method change.

### “Persistence must be the first gate because these papers say so” is too strong

A simple persistence/operational baseline is a very sensible benchmark.

But I would phrase it as:

**“V3.9 predeclares persistence as the project's primary simple baseline.”**

rather than implying Chen/Sternberg scientifically mandate that exact gate.

Research justifies comparing sophisticated models to strong simple baselines; the precise “Model −1 then Model 1” ladder is **your experimental methodology**.

That's perfectly acceptable.

### Your AviationWeather retention statement is stale

Current AviationWeather.gov documentation says its weather database allows access to the **previous 30 days**, not 15. It provides worldwide METAR and TAF data. ([Aviation Weather Center][10])

So don't treat “15 days” as a permanent scientific fact.

Freeze:

**source + API version/date checked + retrieval date + what archive depth was actually available when the bootstrap ran.**

---

# 14. One other document inconsistency should definitely be corrected

The Implementation Log describes `flight_data_pre_post` as:

> “the raw data table — everything else is either an audit log of this table's writes or a later derivation.” 

That no longer matches binding V3.9.

V3.9 now treats first-class research layers including:

`flight_events`
`flight_population`
`flight_snapshots`
`flight_airborne_snapshots`
`flight_outcomes`
trajectory layers
`historical_feature_store`.

For example, Part 1 explicitly says the FIDS population independently determines snapshot existence. 

Therefore #70 item 72 is correct: fix the Implementation Log wording.

Again, documentation synchronization—not architecture.

---

# 15. What I would now consider permanently settled

Unless real provider evidence or your actual executable code contradicts these assumptions, I would **stop reopening** the following decisions:

> measured provider-supported frame; keep zero-yield airports; provider/FIDS population rather than webhook as denominator; snapshot existence population-defined; post-cutoff events labels only; availability-at-cutoff protection; immutable raw provenance; PRE and AIRBORNE separate; preserve airborne point history; same-tail/previous-leg information; no automatic flight-level \(1/p\); bounded REGIONAL efficiency adaptation; no population-representative claims without validation; GNN later, not first; Month 1 pilot; final 31-day run only after gates/freeze.

Those are essentially the same principles your #70 prompt itself told the other agent **not to change**. 

That is where I want the moving target to stop.

---

# 16. What should happen next, in order

You **should not** immediately resume the WSSS anchor probe under the existing frame, because some definitions governing the probe/scoring system and frame are still incomplete.

The next work should be one **V3.9 pre-freeze specification patch**, not another review/version:

**First**, fix the frame: defensible global traffic tier + validated geographic lookup + PRE/POST eligibility rule.

**Second**, freeze physical flight identity/codeshare/FIDS population protocol and prove the 1,000-unit REST budget.

**Third**, copy the exact existing sampling mechanics into Part 1: REGIONAL update, coverage floor, HUB/MID mechanics, anchor normalization/stability/capacity/stage-2 rules, crossover details.

**Fourth**, fix the Engine-A split chronology and predeclare only the truly primary evaluation choices.

**Fifth**, correct the citation/document inconsistencies I identified above.

**Then** regenerate the frame and its 18-cell counts.

**Then** run the gates and operational measurements. Gate 0.5 supplies the empirical cadence, trajectory and censoring parameters that are supposed to be measured rather than invented.

**Then** write one versioned final manifest.

**Only then** Phase 6 becomes GO.

And importantly, the latest Implementation Log still has Gate 3's successful rerun, Gate 0.5, Gate 4, Gate 5 and final freeze outstanding anyway. 

---

# My final adjudication of the #70 prompt

I would **keep #70 as an audit checklist**, but I would change its interpretation.

Do **not** tell your AI agent:

> “Every one of these 77 things is a new defect and you must redesign V3.9.”

Tell it:

> **“V3.9 architecture is frozen. Classify each #70 item as (A) already satisfied, (B) specification required before Phase 6, (C) empirically measured at a pre-run gate then frozen, or (D) downstream analysis item explicitly deferred. Patch only B and the decision rules for C. Do not redesign the architecture.”**

That is the stable answer I should have given you earlier.

### Final GO/NO-GO

**Architecture:** 🟢 **GO**

**Scientific principles:** 🟢 **GO**

**PRE/POST design:** 🟢 **GO**

**Research foundation:** 🟢 **GO, with the citation corrections above**

**Current sampling-frame implementation:** 🔴 **NOT frozen**

**Experimental preregistration:** 🟠 **incomplete**

**Recorded gates:** 🔴 **incomplete**

**Phase 6 / 31-day collection:** 🔴 **NO-GO right now**

And one limitation I want to be explicit about: you gave me the **plan and implementation log**, not the current source-code repository itself. I can audit what the log says the code does, but I cannot truthfully certify that the executable code/schema actually matches every statement until the source files/config/migrations themselves are inspected. The documents are enough for the methodological verdict above; a final **code-level GO** requires that last implementation audit.

If you want, the most useful thing I can do next is turn this audit into the **single final prompt for your coding AI agent**, with the blocker/measure/defer classifications already resolved so that the agent cannot invent another V3.10 or reopen decisions we just settled.

[1]: https://scholarworks.sjsu.edu/faculty_rsca/4774/ "https://scholarworks.sjsu.edu/faculty_rsca/4774/"
[2]: https://www.researchgate.net/publication/330185077_Chained_Predictions_of_Flight_Delay_Using_Machine_Learning "https://www.researchgate.net/publication/330185077_Chained_Predictions_of_Flight_Delay_Using_Machine_Learning"
[3]: https://scholarworks.sjsu.edu/faculty_rsca/2410/ "https://scholarworks.sjsu.edu/faculty_rsca/2410/"
[4]: https://www.sciencedirect.com/science/article/pii/S1366554524001169 "https://www.sciencedirect.com/science/article/pii/S1366554524001169"
[5]: https://scholarworks.sjsu.edu/faculty_rsca/4935/ "https://scholarworks.sjsu.edu/faculty_rsca/4935/"
[6]: https://collaborate.princeton.edu/en/publications/leakage-and-the-reproducibility-crisis-in-machine-learning-based-/ "https://collaborate.princeton.edu/en/publications/leakage-and-the-reproducibility-crisis-in-machine-learning-based-/"
[7]: https://github.com/lucasbstn/aerodatabox/blob/main/doc/FlightAPIApi.md "https://github.com/lucasbstn/aerodatabox/blob/main/doc/FlightAPIApi.md"
[8]: https://aspmhelp.faa.gov/index/ASPM__Individual_Flights__Definitions_of_Variables.html "https://aspmhelp.faa.gov/index/ASPM__Individual_Flights__Definitions_of_Variables.html"
[9]: https://otexts.com/fpp3/tscv.html "https://otexts.com/fpp3/tscv.html"
[10]: https://aviationweather.gov/data/api/ "https://aviationweather.gov/data/api/"

Yes. I understand why the word **“blocking”** confused you, and I also understand why you want this to be the last time the list keeps expanding.

### What “blocking” means

A **blocker** does **not** mean “the whole V3.9 plan is wrong.”

It means:

> **Do not start the real 31-day Phase-6 experiment until this specific thing is resolved.**

Why? Because if we leave it undefined, collect the experimental data, look at the results, and *then* decide the rule, we could accidentally bias the experiment or make it impossible to reproduce.

For example:

* **4,053 airports automatically labeled REGIONAL** → blocker, because this changes which airports are sampled.
* **What exactly T−24 means** → blocker, because it determines which data are legal at a prediction cutoff.
* **How `flight_instance_id` works** → blocker, because otherwise one physical flight/codeshares can be counted incorrectly.
* **Whether conformal intervals use 90% or 95% coverage** → not necessarily a collection blocker. That can be formally deferred to a later modeling stage as long as you say so before looking at the final test.
* **The exact censoring grace period** → a *Gate-measured blocker*: we intentionally don't know the number yet; Gate 0.5 measures latency, then we freeze the number before Phase 6.

So when I said “all 77 should not be treated as equally blocking,” I meant some of the 77 are genuine **stop-the-run** issues, while others are downstream analysis definitions or things intentionally measured during the pre-run gates.

---

# I did another final scan

I went back through **Part 1 again**, searched specifically for `proposal`, approximations, `~`, unspecified thresholds, “planned,” “open experiment,” unresolved definitions, and compared them again with #70.

I also rechecked the important external evidence.

My document-level conclusion is now:

> **I am not finding another architectural redesign that V3.9 needs.**
>
> PRE vs AIRBORNE, population-based snapshot existence, as-known-at-cutoff timestamps, immutable raw provenance, same-tail propagation, the 4h default, constrained UTC sampling, population/capture distinction, XGBoost-first/GNN-later, and Month-1-as-pilot all remain sound.

SDSU supports the importance of previous-leg/late-aircraft delay and chained same-aircraft modeling. ([Jun Chen][1]) SJSU supports aircraft-utilization/previous-delay propagation and weather effects. ([SJSU ScholarWorks][2]) SJSU's trajectory paper supports keeping AIRBORNE trajectories as a distinct prediction problem. ([SJSU ScholarWorks][3]) The 2024 Transportation Research Part E review supports both flight-chain and airport-network perspectives rather than requiring one single model architecture. ([ScienceDirect][4])

But **everything is not yet set for Phase 6**.

And this final scan caught a few details that I want explicitly included in the final coding-agent prompt so we do not discover them later.

## The additional details I want explicitly covered

**1. T−24 has an operational scheduling problem, not merely a wording problem.**

Part 1 requires schedule state as it was knowable at T−24, T−6 and T−90, but the current runbook does not explicitly prove how tomorrow's airport/window is selected early enough to take the **T−24** population snapshot. 

You cannot choose an airport at today's collection start and then reconstruct what its schedule looked like yesterday.

Therefore the agent must implement one of these before Phase 6:

> Freeze/select a future airport+window sufficiently before its earliest T−24 cutoff and schedule FIDS snapshots at T−24/T−6/T−90;

or prove that AeroDataBox provides genuinely versioned historical schedule states with original availability timestamps.

**Reconstructing T−24 later from the final FIDS schedule is forbidden.**

This is really an operational consequence of #70 items 7 and 9, but it needed to be made much more explicit.

---

**2. AeroDataBox FIDS uses airport-local query times.**

The current AeroDataBox documentation says `fromLocal` and `toLocal` are **local airport time**, direction may be Arrival/Departure/Both, and the query range can be at most 12 hours. ([GitHub][5])

Your experiment is defined primarily in UTC.

Therefore the FIDS builder needs a frozen rule for:

> UTC experimental window → airport IANA timezone → correct local-time FIDS interval, including daylight-saving transitions → stored UTC canonical boundaries.

Otherwise an airport near a DST transition could get the wrong population window.

This should be added explicitly under #70 item 6.

---

**3. FIDS flight scope must explicitly decide cargo/private flights.**

AeroDataBox exposes `withCargo` and `withPrivate`, in addition to `withCancelled` and `withCodeshared`. ([GitHub][5])

Your research talks repeatedly about traveler-facing predictions, but Part 1 does not cleanly say:

> scheduled commercial passenger flights only?

or:

> passenger + cargo + private?

That should be frozen.

It doesn't matter which scientifically defensible scope you choose nearly as much as **not allowing the scope to change halfway through the experiment**.

---

**4. Codeshares should not be allowed to inflate the physical-flight denominator.**

AeroDataBox explicitly warns that code-share status can sometimes be unknown and that provider filtering can produce false results. ([GitHub][5])

Therefore the safest research design is likely to retrieve sufficient codeshare information and perform **your own physical-leg canonicalization**, rather than assuming each marketing flight number is a unique aircraft operation.

The coding agent should verify the provider payload and decide this before freezing `flight_instance_id`.

---

**5. There is a real contradiction in the outcome table.**

Part 1 correctly defines separate labels:

* gate-out,
* wheels-off,
* wheels-on,
* gate-in. 

But immediately afterward, the generic `observed` state is defined by the presence of `dep_runway_utc / arr_runway_utc`. 

That cannot determine whether a **gate-in** label is observed.

For example:

> wheels-on exists
> gate-in is missing

Then landing-delay is observable, but gate-arrival-delay is **not**.

So #70 item 16 is absolutely real.

You need target-specific states such as:

`gate_out_label_observed`
`wheels_off_label_observed`
`wheels_on_label_observed`
`gate_in_label_observed`

rather than one generic `observed` boolean deciding every regression population.

FAA explicitly distinguishes Gate Out, Wheels Off, Wheels On and Gate In as separate operational milestones. ([ASPMHelp][6])

---

**6. The five-state table still contains stale censoring wording.**

It currently says:

> `missing_outcome` = window ended before any outcome event arrived. 

But another binding Part 1 rule correctly says the window ending is **not enough**; you must wait the frozen grace interval.

Therefore that state definition needs to become something like:

> `missing_outcome` = required terminal/target outcome remains unavailable **after the frozen censoring grace interval expires**.

This is a small wording change but a real binding contradiction.

---

**7. The weather-history number is outdated.**

Part 1 currently says AviationWeather.gov history is ≤15 days. 

The current AviationWeather.gov Data API says the weather database allows access to the previous **30 days**. ([Aviation Weather Center][7])

So that should be corrected, and more importantly the manifest should record:

`weather_source_version`
`retrieved_at`
`archive_depth_verified_at_freeze`

instead of permanently assuming a provider retention duration.

---

# So is this finally the complete list?

**For the documents you supplied: yes, this is now the final methodological/pre-freeze audit I would use.**

I am **not** recommending another conceptual V3.10 review after these corrections.

But there is one limitation that matters:

> I do not have your complete current source-code repository in these attachments.

Your Implementation Log describes the code, but it is possible for actual `.ts` files, migrations, SQL constraints, environment defaults or scripts to differ from what the log says.

For example, Part 1 itself still says R1–R7 are “planned,” while the Implementation Log says Phase 0 implementation is done.  That is exactly why the **coding AI agent must inspect the actual repository**, not merely edit Markdown.

So my finality claim is:

**Architecture/methodology/document audit: final.**

**Executable-code certification: the agent below must perform it.**

After that agent produces an empty collection-affecting unresolved table and all gates pass, I would stop theoretical re-reviewing and collect.

---

# Final prompt for your coding AI agent

Use this as the replacement for the old #70 prompt.

You are performing the FINAL PRE-FREEZE AUDIT AND PATCH of the existing V3.9 aviation PRE + AIRBORNE/POST data-collection experiment.

This is NOT another theoretical redesign.

The architecture has already undergone repeated review against SJSU, SDSU, FAA and broader peer-reviewed aviation literature. Your job is to make the existing V3.9 architecture executable, internally consistent, reproducible and fully precommitted before Phase 6.

FILES / SOURCES TO AUDIT:

* `V3.9_DataCollectPlan.md`
* ONLY PART 1 (§1–§22) is normative.
* `IMPLEMENTATION_LOG.md`
* the complete actual source-code repository
* all current migrations/schema
* executable config/environment defaults
* scheduler/controller
* population/FIDS code
* webhook ingestion code
* snapshot/feature-store code
* anchor-probe code
* evaluation builder/config
* the prior “#70” 77-item checklist

DO NOT create V3.10, V3.11 or another design revision.

Modify V3.9 PART 1 in place where necessary and maintain the existing adjudication/change record.

Do NOT reopen or redesign these principles unless actual provider evidence proves an implementation impossibility:

1. Provider-supported measured universe → feed-eligible sampling frame.
2. Zero yield does NOT mean an airport does not exist.
3. FIDS/provider population defines the prediction denominator; webhook capture does not.
4. Snapshot existence is population-defined, not post-event-defined.
5. Post-cutoff information supplies labels only and cannot leak into cutoff features.
6. Information must have actually been available to our system by the prediction cutoff.
7. Preserve immutable raw provenance.
8. Preserve `flight_events`; current/latest state must never be the only research representation.
9. PRE_DEPARTURE and AIRBORNE are separate modeling populations.
10. Preserve every usable airborne observation so trajectories are reconstructable.
11. Do not destructively replace airborne time series with latest-location state.
12. Same-aircraft/previous-leg information remains a first-class delay-propagation feature.
13. No automatic flight-row `1/p` weighting.
14. REGIONAL adaptation remains bounded and explicitly efficiency-oriented, not representation-preserving.
15. Anchor live yield remains a minority component of anchor selection.
16. GNN remains a later hypothesis, not the default first model.
17. Month 1 remains an early operational pilot, not seasonal validation.
18. Do not claim population representativeness until the provider population layer is validated.
19. No 31-day/57,900-credit Phase-6 run until every required preflight gate and final FREEZE passes.
20. `ADB_AUTO_COLLECT=false` remains in force during this work.

Research support should be cited accurately:

* Chen & Li, SDSU/AIAA SciTech 2019 → previous-leg/late-aircraft delay and same-aircraft chained prediction.
* Zheng, Wei & Hu, SJSU/Aerospace 2021 → previous-delay propagation, buffer, weather and aircraft utilization.
* Zheng, Zou, Wei & Tian, SJSU/Aerospace 2023 (#4774) → AIRBORNE online ETA/landing prediction from reconstructed trajectory sequences.
* SJSU #4935 → GCN-GRU/network delay prediction as evidence that graph modeling is defensible, NOT proof it will beat tabular methods here.
* Transportation Research Part E 2024 delay-propagation review → flight-chain and airport-network perspectives.
* FAA ASPM documentation → Gate Out / Wheels Off / Wheels On / Gate In are distinct operational milestones.
* AeroDataBox documentation → provider/API semantics only.

Do NOT claim that SJSU/SDSU research scientifically proves our project-specific constants such as five anchors, 60 rows/hour, 40/20/20/20 weights or `{HUB:1,MID:2,REGIONAL:1}`. Those are V3.9 design choices that must be predeclared and justified, not falsely attributed to literature.

`IMPLEMENTATION_LOG.md` is a required first-class deliverable, not an informal summary.

Update it continuously and in extreme detail throughout every phase, gate, patch, command, migration, test, decision and verification step. The purpose is to ensure that a human reader can understand exactly what was done, why it was done, how it was done, where it was implemented, what changed, what remains, and how to reproduce or audit it.

Do not write vague entries such as:

* “Implemented FIDS changes.”
* “Fixed schema.”
* “Updated sampling.”
* “Gate passed.”
* “Added provenance.”
* “Resolved blocker.”

Every implementation-log entry must explain the complete chain of reasoning and execution.

For every task, create a detailed entry containing, at minimum:

1. Entry ID.
2. Date and UTC timestamp.
3. Phase, gate, checklist item and subsection.
4. Human-readable task title.
5. Problem or requirement being addressed.
6. Why the requirement matters scientifically, operationally and reproducibly.
7. Previous behavior or previous wording.
8. Exact intended behavior after the change.
9. Files inspected.
10. Files changed.
11. Exact functions, classes, modules, migrations, tables, columns, indexes, constraints, configuration keys or commands involved.
12. The implementation approach.
13. Step-by-step execution details.
14. Relevant code before the change, summarized or quoted where useful.
15. Relevant code after the change, summarized or quoted where useful.
16. SQL/schema changes, including migration names and rollback considerations.
17. Configuration/environment changes.
18. Data-flow explanation: source → ingestion → normalization → storage → transformation → snapshot/evaluation use.
19. Timestamp and availability semantics.
20. Provenance and audit implications.
21. Failure modes considered.
22. Validation performed.
23. Exact commands run.
24. Exact test names and results.
25. Expected result versus observed result.
26. Artifacts generated.
27. Hashes, versions, seeds and timestamps.
28. Whether the change affects collection, denominator, labels, leakage, sampling, evaluation or only documentation.
29. Whether the change is A, B, C or D under the #70 classification.
30. Whether the change is reversible.
31. Any unresolved issue.
32. The next required action.
33. Final status: pending, implemented, verified, blocked or frozen.

For every gate, create a separate gate record containing:

* gate name and purpose;
* prerequisites;
* exact inputs;
* exact commands/scripts;
* environment/configuration used;
* expected outputs;
* actual outputs;
* pass/fail criteria;
* warnings;
* failures and remediation;
* artifacts and hashes;
* reviewer-readable explanation;
* whether the gate result is frozen;
* who/what authorized progression to the next gate.

For every decision, create a decision record containing:

* decision ID;
* question;
* alternatives considered;
* evidence inspected;
* scientific and operational tradeoffs;
* selected option;
* rejected options and reasons;
* exact implementation consequence;
* affected files/schema/config;
* whether the decision is reversible;
* approval/freeze status.

For every unresolved issue, create an issue record containing:

* issue ID;
* discovery date;
* source;
* affected requirement;
* severity;
* collection impact;
* primary-evaluation impact;
* proposed resolution;
* owner/action;
* blocking classification;
* resolution date;
* verification evidence.

For every code or schema change, explain what the code is supposed to do in plain language before explaining how it does it. Include a small example whenever possible.

For every major phase, add a “How this phase works” section written for a reader who did not implement the system. It must explain:

* the purpose of the phase;
* what enters the phase;
* what happens internally;
* what data are created or changed;
* what cannot happen yet;
* what exits the phase;
* how the next phase uses the output;
* what could go wrong;
* how the phase is verified.

For every major component, add a “Where this lives” section identifying:

* repository path;
* module/file;
* function/class;
* database table;
* migration;
* configuration key;
* scheduled job/controller;
* generated artifact;
* test coverage.

For every major component, add a “What the code should look like” section. This does not require copying the entire repository, but it must provide enough representative pseudocode, function signatures, SQL shape, data structures or code excerpts that a human can understand the intended implementation and compare it with the actual code.

At minimum, provide this level of explanation for:

* sampling-frame construction;
* airport tiering;
* region mapping;
* PRE/POST eligibility;
* future airport/window assignment;
* T−24/T−6/T−90 FIDS snapshots;
* UTC/local-time/DST conversion;
* FIDS query construction;
* codeshare canonicalization;
* `flight_instance_id`;
* tail-chain identity;
* webhook ingestion;
* immutable raw storage;
* `flight_events`;
* current operational state;
* population rows;
* PRE snapshots;
* airborne observations;
* trajectory reconstruction;
* target-specific outcome labels;
* censoring and grace periods;
* four-timestamp leakage contract;
* historical feature store;
* anchor scoring;
* Stage-1 and Stage-2 probes;
* scheduler and crossover assignment;
* REGIONAL adaptation;
* coverage floor;
* weather joins;
* manifest generation;
* test split materialization;
* evaluation construction;
* final preflight scan.

Do not delete historical log entries. Append corrections and superseding entries. If an earlier entry was inaccurate, mark it as superseded and explain exactly what was wrong.

Do not silently edit history to make the implementation appear cleaner than it was.

At the end of every work session, append a session summary containing:

* work completed;
* files changed;
* commands run;
* tests passed/failed;
* decisions made;
* blockers;
* next steps;
* current overall status.

At the end of every phase, append a phase summary containing:

* objectives;
* completed tasks;
* incomplete tasks;
* implementation locations;
* generated artifacts;
* verification results;
* remaining risks;
* gate status;
* whether the phase is frozen.

At the end of the entire audit, `IMPLEMENTATION_LOG.md` must contain:

1. A chronological implementation history.
2. A phase-by-phase guide.
3. A gate-by-gate guide.
4. A file/module/table/configuration map.
5. A requirement-to-code traceability matrix.
6. A #70 item-to-implementation traceability matrix.
7. A manifest-field-to-source traceability matrix.
8. A schema/data-lineage diagram or detailed text equivalent.
9. A complete command and test index.
10. A list of all generated artifacts and hashes.
11. A list of all frozen values.
12. A list of all formally deferred items.
13. A list of all rejected alternatives and reasons.
14. A final plain-language explanation of how the complete system works from airport selection through final evaluation.
15. A final “how to reproduce this audit” section with exact commands and prerequisites.
16. A final “what a future maintainer must not change” section.
17. A final “known limitations and non-claims” section.

The implementation log must be understandable to a technically capable reader who was not present during the work. Assume the reader is worried about missing a hidden dependency or misunderstanding a phase. Explain every dependency explicitly.

If the repository does not contain enough code or documentation to explain a behavior, do not guess. Record:

* what was searched;
* what was found;
* what was missing;
* why the missing information matters;
* what must be inspected or implemented.

Before modifying code, create an implementation roadmap in `IMPLEMENTATION_LOG.md` covering:

Phase 0: repository and environment audit.
Phase 1: normative document and checklist reconciliation.
Phase 2: sampling frame and airport metadata.
Phase 3: FIDS/population construction.
Phase 4: identity, events, provenance and snapshots.
Phase 5: anchors, scheduler, crossover and adaptive sampling.
Phase 6: weather, historical features and airborne trajectories.
Phase 7: evaluation, split assignment and manifest.
Phase 8: gates, final preflight and Phase-6 readiness.

For each phase, document:

* objective;
* prerequisites;
* inputs;
* outputs;
* exact files/modules;
* database objects;
* configuration;
* commands;
* tests;
* expected artifacts;
* failure conditions;
* rollback/recovery;
* completion criteria;
* implementation-log entries required.

Do not begin a phase until its prerequisites are documented. Do not mark a phase complete until its outputs and verification evidence are recorded.

For EACH of the 77 #70 items, output one classification:

A = ALREADY SATISFIED
The binding Part 1 + code already define and implement it consistently.

B = PHASE-6 BLOCKER
It affects what gets collected, who enters the denominator, sampling probabilities, labels, leakage protection, irrecoverable metadata, or the primary precommitted evaluation. It MUST be resolved before Phase 6.

C = PRE-RUN MEASURE → FREEZE
The value should not be guessed. A named pre-run gate/canary measures it, then it is frozen in the manifest BEFORE Phase 6.

D = FORMALLY DEFERRED ANALYSIS ITEM
It cannot affect collection or the predeclared primary claim. State exactly when it must be frozen, such as before model fitting or before viewing validation or test results. It must not be selected after examining final-test performance.

Do NOT treat all 77 items as equivalent defects.

The final unresolved table MUST contain ZERO unresolved B items before Phase 6.

Retain all existing requirements in the original prompt, including:

* sampling-frame and airport-definition corrections;
* validated region mapping;
* explicit passenger/cargo/private scope;
* PRE/POST eligibility;
* exact T milestone;
* operational T−24 scheduling solution;
* complete FIDS protocol;
* airport-local time and DST conversion;
* worst-case REST/FIDS budget;
* canonical physical-flight identity;
* codeshare deduplication;
* OD and tail identity;
* complete eight-milestone provider mapping;
* target-specific label availability;
* grace-period censoring;
* four-timestamp leakage contract;
* provenance for every derived snapshot;
* Gate-0.5 measured values;
* REGIONAL recurrence and coverage floor;
* frame-balancing variables;
* anchor formulas and probe thresholds;
* scheduler/crossover rules;
* environmental metadata;
* weather hierarchy and retention verification;
* historical-feature readiness;
* graph/chain raw-data preservation;
* frozen test chronology;
* primary scientific claim;
* endpoint hierarchy;
* model-selection protocol;
* conformal/interval inconsistency resolution;
* document/code/schema synchronization;
* immutable final manifest;
* actual repository inspection;
* exact gate order;
* final preflight scan;
* required final outputs.

Do not omit any of those requirements while adding the implementation-log requirements.

Mandatory pre-freeze blockers and implementation requirements:

1. Sampling frame and airport definitions

Replace blanket classification of all universe-only airports as REGIONAL.

If the current implementation assigns all remaining airports to REGIONAL with `traffic_prior=1.0`, treat that as provisional. Freeze:

* traffic measure;
* authoritative/reference source;
* reference period;
* HUB/MID/REGIONAL thresholds;
* missing-reference policy;
* tier algorithm/version;
* retrieval date;
* source/version/hash.

Do not use experimental delay outcomes to determine tiers.

Rebuild `clean.adb_sampling_frame`.

Replace any ICAO-first-letter macro-region heuristic with a validated airport-to-region lookup. Freeze:

* six macro-region definitions;
* airport country/region mapping source;
* exception handling;
* unknown/missing policy;
* mapping version/hash.

Regenerate all region/tier cell counts.

Explicitly define prediction-population scope:

* commercial scheduled passenger only or broader scope;
* cargo inclusion/exclusion;
* private-flight inclusion/exclusion;
* charter/non-scheduled handling;
* cancellation inclusion;
* diversion inclusion.

The scope must remain identical between population construction, webhook matching, snapshots and evaluation unless explicitly labeled as a different population.

Resolve PRE versus POST airport eligibility. Define whether:

* one integrated experimental airport requires `pre_eligible && post_eligible`; or
* PRE and AIRBORNE use separate eligibility mechanisms or slots.

No airport requiring T−24/T−6/T−90 population snapshots may silently lack schedule/FIDS support.

2. Time, FIDS and population construction

Define exactly what milestone T means. Specify:

* canonical scheduled milestone;
* exact provider mapping;
* original versus revised schedule handling;
* timezone semantics;
* retime policy.

T must remain stable for a flight instance according to the frozen retime policy.

Solve the T−24 scheduling problem explicitly.

A T−24 population snapshot cannot be reconstructed later from a final schedule. Prove exactly how the system captures provider state as known at:

* T−24 hours;
* T−6 hours;
* T−90 minutes.

If live timed FIDS snapshots are required, the airport/window assignment must be frozen sufficiently early for the T−24 call.

Required order:

future experimental airport/window assignment frozen
→ T−24 FIDS snapshot at its actual cutoff
→ T−6 FIDS snapshot
→ T−90 FIDS snapshot
→ webhook collection/window
→ later terminal outcomes and labels.

The only alternative is a provider that supplies genuine versioned historical schedule states with trustworthy availability/version timestamps.

Never reconstruct T−24 from a later final/current schedule.

Fully specify the FIDS protocol and verify it against current AeroDataBox documentation and actual account behavior. Freeze:

* endpoint/version;
* `direction`;
* `withLeg`;
* `withCancelled`;
* `withCodeshared`;
* `withCargo`;
* `withPrivate`;
* `withLocation` if relevant;
* airport window boundaries;
* interval-edge inclusivity/exclusivity;
* pagination/result-limit/truncation detection;
* retries;
* duplicate handling;
* cancellation handling;
* diversion handling;
* schedule revisions;
* retiming;
* population membership at each cutoff;
* provider-response hash/version/raw preservation.

AeroDataBox airport FIDS query bounds are airport-local time. Implement:

canonical UTC experimental interval
→ airport IANA timezone
→ local AeroDataBox `fromLocal`/`toLocal`
→ DST-aware conversion
→ persist queried local bounds and canonical UTC bounds.

Do not use a fixed UTC-offset assumption.

Produce a worst-case REST/FIDS budget proof covering:

* all T−24/T−6/T−90 population snapshots;
* all required airports/windows;
* Gate-5 validation;
* reference/diagnostic calls;
* retries;
* reasonable contingency.

Do not merely write “approximately 1,000 units.” Prove that total worst-case REST consumption remains within the frozen REST line and cannot steal from the 57,900 experimental alert-credit envelope or protected 1,000-credit floor.

If the arithmetic does not fit, stop and adjust the REST plan before collection. Do not silently reduce population coverage after the run begins.

3. Physical flight identity, codeshares and routes

Create a canonical `flight_instance_id` identifying one physical operated flight leg, not one marketing-flight record.

Specify:

* provider unique flight ID if stable/reliable;
* operating carrier;
* operating flight number;
* origin;
* destination;
* original scheduled departure UTC/service date;
* service-date convention;
* callsign where useful;
* codeshare mapping;
* retime/revision handling;
* diversion handling;
* collision fallback;
* duplicate-detection rules.

Document stable identity fields versus mutable flight-state fields.

Multiple marketing flight numbers for one physical leg must not become multiple prediction units.

Because provider codeshare filtering may be uncertain when statuses are unknown, verify whether the safest procedure is:

retrieve sufficient codeshare records
→ canonicalize to the operating physical leg internally.

Do not blindly trust marketing flight number as physical identity.

Use canonical `flight_instance_id` everywhere a same-flight grouping is required:

* population;
* events;
* snapshots;
* outcomes;
* AIRBORNE trajectory;
* POST partition;
* deduplication;
* provenance.

Freeze OD/route identity:

* directed rather than silently undirected;
* original versus current/actual destination;
* diversion treatment;
* codeshare treatment;
* retime treatment.

Freeze tail identity:

* registration/Mode-S/ICAO24 priority and fallback;
* aircraft-swap policy;
* missing-registration policy;
* how a swap breaks or continues a chain.

4. OOOI and labels

Complete provider-field mapping for all eight milestones:

* scheduled_gate_out;
* actual_gate_out;
* scheduled_wheels_off;
* actual_wheels_off;
* scheduled_wheels_on;
* actual_wheels_on;
* scheduled_gate_in;
* actual_gate_in.

For each, record:

* exact provider JSON path;
* provider semantic definition;
* FAA/ASPM-equivalent meaning if valid;
* caveat;
* availability timestamp;
* verification status.

Never rename provider `scheduledTime` to a specific FAA milestone without semantic evidence.

If a milestone is unverifiable, store NULL plus `milestone_unverified`.

Gate 0.5 must reverify against live payloads.

Replace generic label availability with target-specific availability:

* `gate_out_label_observed`;
* `wheels_off_label_observed`;
* `wheels_on_label_observed`;
* `gate_in_label_observed`.

A flight may have wheels-on observed while gate-in is missing. Each modeling target must use its own label-eligibility field.

Fix stale censoring wording. The binding rule is:

window end
→ wait frozen grace interval
→ terminal/task-specific outcome available?
→ label normally
→ otherwise censored/missing according to the frozen rule.

Synchronize Part 1, schema comments and ETL.

5. Four-timestamp and leakage contract

Freeze exact semantics and sanity checks for:

* `event_timestamp`;
* `provider_published_utc`;
* `received_timestamp_utc`;
* `available_at`.

Define:

* which may be NULL;
* fallback behavior;
* impossible ordering handling;
* negative latency handling;
* provider clock-skew tolerance;
* duplicate timestamps;
* ingestion/ETL clock source;
* quarantine/QC flags.

The universal rule remains:

`information_available_timestamp <= prediction_cutoff`.

Every derived PRE and AIRBORNE snapshot must retain provenance to the exact source observations and versions used.

6. Gate 0.5 measured values

Gate 0.5 must measure and freeze before Phase 6:

* censoring grace interval;
* minimum `airborne_usable` point count;
* target airborne observation cadence;
* minimum acceptable cadence;
* maximum trajectory gap;
* minimum trajectory duration/coverage;
* trajectory completeness formula/threshold;
* warning/fail behavior.

Record sample sizes and latency/gap distributions used to make each decision.

Do not use Phase-6 model performance to tune these thresholds.

7. REGIONAL adaptation and coverage floor

Fully specify the REGIONAL recurrence while retaining `m_i ∈ [0.25,1.5]`.

Define:

`m_{i,t+1} = f(...)`

including:

* exact yield statistic;
* history window;
* smoothing;
* update cadence;
* cold start;
* zero-yield transitions;
* missing-yield behavior;
* reset behavior;
* floor/cap;
* deterministic behavior given seed/history.

Resolve zero-yield states:

* `zero_yield_once`;
* `zero_yield_repeated`;
* `zero_yield_persistent`.

Specify:

* counts/window triggering each;
* which state affects `m_i`;
* recovery behavior;
* whether persistent zero-yield remains selectable.

Define coverage floor mathematically:

* maximum starvation interval or minimum selection frequency;
* eligible-pool behavior;
* tie breaking;
* interaction with `m_i`.

This is an efficiency/no-starvation mechanism, not a claim of representative sampling.

8. Frame-balancing variables

Freeze:

* `network_degree`;
* carrier diversity;
* international/domestic mix;
* exogenous traffic;
* geographic/network diversity;
* carrier/international diversity.

For each, define:

* exact formula;
* operating versus marketing carrier;
* directed/undirected treatment;
* reference period;
* source;
* missing policy;
* normalization;
* snapshot version/hash.

These may influence balancing or anchor scores but must never recursively depend on the Phase-6 sample they help select.

9. Anchor system

Keep the existing 40/20/20/20 architecture unless a real implementation contradiction is found.

Copy exact executable formulas into Part 1:

* traffic component;
* geographic/network component;
* carrier/international component;
* yield component.

Rename ambiguous anchor “calibration” terminology to `yield reference normalization` or another term clearly distinct from probabilistic model calibration.

Define WSSS/OMAA roles:

* primary reference;
* fallback;
* diagnostic comparison;
* invalid-reference behavior.

Freeze exact yield standardization, including clipping.

Put the exact stability calculation in Part 1:

* 15-minute bucket definition;
* population/sample standard-deviation convention;
* mean-zero handling;
* CV calculation;
* `stability = 1/(1+CV)` if retained.

Freeze:

* candidate shortlist;
* exogenous source values;
* retrieval date;
* source/hash;
* matched time-class definition;
* weekday-class definition;
* Stage-1 count/duration;
* Stage-2 promotion count;
* Stage-2 duration;
* capacity gate.

Replace `~10–12`, `top ~5–6`, and “longer confirmation probe” with exact binding values before probe results can influence the final anchor pool.

Explicitly state whether the daily anchor consumes the single HUB slot in `{HUB:1, MID:2, REGIONAL:1}`.

Freeze HUB/MID non-random slot selection:

* freshest-first;
* recent exclusion;
* tie breaking;
* seed/determinism.

10. Scheduler, crossover and context

Fully specify crossover:

* `crossover_group_id`;
* experimental unit;
* periods 1/2;
* matching variables;
* treatment assignment;
* randomization seed;
* incomplete-pair policy;
* carryover/order policy.

Freeze deterministic scheduler tie-breaking when multiple schedules have identical weekday×UTC imbalance.

Define `coverage-age <=5 d core`. Do not leave `core` undefined.

Define collection-time environmental metadata:

* weather severity;
* ATC delay-program flag;
* storm-track context.

For each, define:

* data source;
* retrieval/API;
* threshold/category algorithm;
* timestamp/availability semantics;
* missing state.

If a source cannot reliably be reconstructed after the experimental day, collect and preserve it during Phase 6.

11. Weather

Freeze weather hierarchy and joins:

* METAR;
* TAF;
* GFS/NAM if retained;
* ERA5/reanalysis.

Define:

* precedence;
* spatial join;
* temporal join;
* issue/amendment choice;
* as-known-at-cutoff eligibility;
* missing-data behavior;
* archive/live distinction.

Correct stale AviationWeather.gov retention wording. Current Data API documentation reports access to up to the previous 30 days, but do not hard-code that as timeless truth.

Record in the manifest:

* documentation/API version;
* date checked;
* archive depth observed at freeze.

12. Historical feature store

Fully specify bootstrap/readiness for:

* airport delay;
* route delay;
* carrier×airport delay;
* tail previous-leg history;
* OD history;
* utilization;
* congestion;
* weather.

Freeze:

* required lookback;
* minimum observations if applicable;
* availability timestamp rule;
* source;
* bootstrap source;
* `history_ready_at` criterion.

Day-1 primary evaluation cannot pretend historical features are mature if they are not.

13. Graph and chain data

Collection must preserve enough raw information to construct later:

* static route edges;
* dynamic congestion edges;
* resource edges;
* aircraft-chain edges.

Freeze collection-side identity and provenance requirements before Phase 6.

Advanced GNN edge-weighting/model formulas may be formally deferred if they do not alter collection and are chosen without consulting final-test results.

Define chain completeness exactly:

* observable successor;
* allowable turnaround/time gap;
* window-boundary treatment;
* missing-tail treatment;
* aircraft-swap treatment.

14. Primary evaluation precommitment

Fix Engine-A test chronology.

The runbook cannot materialize Phase-6 test row IDs before those rows exist.

Correct rule:

Before Phase 6:

* freeze split-assignment algorithm;
* chronology;
* grouping variables;
* dates or relative-date rules;
* seed;
* event blocking;
* version/hash of rule.

After collection, before model tuning:

* apply the already-frozen rule;
* materialize actual test row IDs;
* hash them;
* make them read-only;
* never tune collection or model choices against the final test.

Update Phase 5 wording accordingly.

Freeze the primary scientific claim before Phase 6:

* primary target;
* primary horizon or clearly hierarchical horizons;
* primary Engine-A metric;
* direction of improvement;
* practical threshold;
* statistical or confidence-interval rule if used.

MAE, RMSE, Brier, ECE and other metrics may all be reported, but one primary claim cannot be selected after results are visible.

Declare:

* primary endpoints;
* secondary endpoints;
* exploratory endpoints.

Do this across:

* PRE versus AIRBORNE;
* horizons;
* regression;
* delay >15;
* delay >60;
* cancellation/diversion;
* engines.

Freeze model-selection protocol:

train → validation/tuning → untouched test.

The final test is prohibited for:

* feature selection;
* hyperparameter choice;
* collection-policy choice;
* endpoint choice.

Resolve the conformal/interval inconsistency. Part 1 currently treats conformal as Model 7/later while §13.1 asks every model for interval coverage. For Month 1 either:

* define a simple fixed interval method now; or
* explicitly defer conformal/interval metrics to Model 7/later.

Do not leave both statements active.

15. Secondary evaluation items

For detailed Engine-B/C/D/R fractions, exact bootstrap replicate counts, rolling-origin folds, ECE binning, severe-tail summaries, learning-curve fitting and similar downstream analysis choices:

* freeze them now; or
* classify them D and record when they must be frozen.

They must not affect collection or the primary claim and must never be chosen based on final-test performance.

16. Document, code and schema synchronization

Change misleading status wording such as `Implementation lock: COMPLETE` to distinguish:

* architecture locked;
* code implementation state;
* pre-freeze measured values pending;
* gates pending;
* final manifest pending.

Update stale R1–R7 and S1–S5 “planned/new” wording to actual repository state.

Correct any wording implying `flight_data_prepost` is the only real research table. First-class layers include:

* raw immutable webhook envelope;
* `flight_events`;
* current operational state;
* `flight_population`;
* `flight_snapshots`;
* raw airborne events;
* cleaned points;
* trajectories;
* `flight_airborne_snapshots`;
* `flight_outcomes`;
* `historical_feature_store`.

After re-tiering and re-regioning:

* rebuild the frame;
* regenerate every 18-cell table/count;
* regenerate PRE, POST and both-eligible counts;
* update documentation;
* do not retain old “18/18” statistics automatically.

Synchronize:

* Part 1;
* code;
* migrations/schema comments;
* config defaults;
* `IMPLEMENTATION_LOG.md`.

If any conflict exists, stop and resolve it explicitly. Part 1 governs only after the resolution has actually been copied there.

Keep Part 2 non-normative. No executable rule may come solely from Part 2.

17. Final manifest

Before Phase 6 write one versioned immutable manifest containing at minimum:

* frame version/hash;
* traffic source/version/reference period/thresholds;
* region mapping version/hash;
* PRE/POST eligibility rule;
* flight-scope definition;
* canonical `flight_instance_id` version;
* FIDS builder version;
* FIDS parameters;
* FIDS timezone/DST conversion version;
* exact cutoff-T milestone;
* milestone field mapping;
* codeshare/deduplication policy;
* REST budget proof/version;
* anchor formula/version;
* final anchor pool;
* yield-reference-normalization rule;
* capacity threshold;
* Stage-1/Stage-2 protocol;
* scheduler seed/rule;
* scheduler tie-break;
* crossover assignment rule;
* adaptive REGIONAL rule/version;
* coverage-floor rule;
* frame/reference source versions;
* timestamp semantic version;
* cadence thresholds;
* trajectory thresholds;
* censoring grace;
* weather source/version/join policy;
* historical-feature-store readiness and `history_ready_at`;
* snapshot-builder SHA;
* provenance-builder version;
* split-assignment rule/hash;
* primary endpoint/metric/decision rule;
* actual RapidAPI plan/units/caps;
* actual Flight Alert balance parameters;
* `maxDeliveryRetries=0`;
* daily cap, SOFT_STOP and reserve values.

18. Actual repository inspection

Do not trust `IMPLEMENTATION_LOG.md` statements about what code does.

Inspect the actual repository.

At minimum search and verify:

* all `maxDeliveryRetries`;
* all `sampling_weight`;
* all deduplication keys;
* all uses of flight number as identity;
* all `post_eligible` and `pre_eligible` filters;
* all tier fallbacks;
* all ICAO-first-letter region logic;
* all `traffic_prior`;
* REGIONAL multiplier update;
* coverage-floor implementation;
* HUB/MID candidate ordering;
* anchor scoring;
* stability;
* 60 rows/hour threshold;
* Stage-2 count/duration;
* schedule/treatment assignment;
* weather metadata;
* FIDS query parameters;
* local/UTC conversion;
* codeshare parameters;
* cargo/private parameters;
* snapshot cutoff filtering;
* four-timestamp construction;
* `flight_outcomes`;
* test split materialization;
* manifest writing.

Do not claim “implemented” unless executable code and schema actually implement it.

19. Gate order

No Phase 6 until this exact logical sequence is complete:

pre-freeze specification patches
→ code/schema synchronization
→ frame rebuild
→ Gate 0
→ Gate 1
→ Gate 2
→ Gate 3
→ Gate 0.5
→ freeze Gate-0.5 measured values
→ Gate 4
→ Gate 5
→ final manifest
→ final preflight scan
→ Phase 6.

If a gate fails:

STOP.
Fix the failure.
Do not reinterpret the gate after seeing the result.

20. Final preflight scan

Search binding Part 1 and executable config for:

`proposal`
`proposed`
`TBD`
ambiguous `~`
`top ~`
`may`
`approximately`
unspecified `threshold`
`longer`
`planned`
`new`
`open experiment`
competing alternatives
placeholder seeds
undefined `core`
undefined `matched`
undefined `calibration baseline`

Every occurrence must be classified as:

1. frozen exact value/rule;
2. Gate-measured value with a documented freeze procedure;
3. explicitly deferred non-collection/non-primary analysis;
4. unresolved blocker.

Category 4 MUST be empty before Phase 6.

Required final outputs:

1. 77-row #70 adjudication table:

   item | A/B/C/D classification | current evidence | required action | final location.

2. Additional-findings table containing any issue found outside the original #70 checklist.

3. Patch table:

   old wording/code
   → new wording/code
   → scientific reason
   → file/section
   → code/schema impact.

4. Final frozen-values table.

5. Gate-measured-values table:

   parameter
   → measurement procedure
   → gate
   → freeze rule.

6. Formally deferred analysis table:

   item
   → why it cannot affect collection/primary result
   → deadline for freezing it
   → prohibited information when choosing it.

7. REST/FIDS worst-case budget calculation.

8. Sampling-frame regeneration report:

   total frame;
   HUB/MID/REGIONAL;
   six regions;
   all 18 tier×region cells;
   PRE eligible;
   POST eligible;
   both eligible;
   missing traffic reference;
   missing geography;
   excluded population counts/reasons.

9. Canonical identity specification:

   `flight_instance_id`;
   codeshares;
   OD;
   tail;
   retimes;
   diversions.

10. Complete provider milestone mapping table.

11. Exact tests and commands used to verify every patch.

12. Repository consistency report:

Part 1 versus code versus schema versus config versus `IMPLEMENTATION_LOG.md`.

13. Final unresolved-items table.

14. Complete implementation-log index:

entry ID;
phase;
gate;
checklist item;
files;
status;
verification artifact.

15. Phase-by-phase implementation guide.

16. Code-location and data-lineage map.

17. Reproduction guide:

prerequisites;
environment variables;
database setup;
commands;
expected outputs;
verification steps.

18. Final plain-language system walkthrough:

airport universe
→ sampling frame
→ future assignment
→ T−24/T−6/T−90 population snapshots
→ webhook collection
→ raw/event/state storage
→ PRE/AIRBORNE snapshots
→ labels/outcomes
→ historical features
→ frozen split
→ evaluation.

19. Final verdict:

* ARCHITECTURE GO/NO-GO
* CODE GO/NO-GO
* DOCUMENTATION GO/NO-GO
* IMPLEMENTATION-LOG GO/NO-GO
* GATES GO/NO-GO
* PHASE-6 GO/NO-GO

Collection-affecting unresolved count MUST = 0.
Primary-evaluation unresolved count MUST = 0.
Implementation-log completeness status MUST be explicitly reported.

Do NOT say Phase-6 GO merely because the architecture is sound.

Phase-6 GO is permitted ONLY when:

* every B blocker is resolved;
* every required C value has been measured and frozen;
* required gates have actually passed;
* code/schema/docs agree;
* `IMPLEMENTATION_LOG.md` contains detailed evidence for every completed task and gate;
* every major implementation has a documented location and explanation;
* the manifest is complete;
* the final preflight category-4 unresolved count is zero;
* the repository can be reproduced and audited from the recorded commands and artifacts.

After those conditions pass, STOP theoretical redesign and execute V3.9.

That is the prompt I would use now. It incorporates the original #70 checklist **plus the provider-specific things I caught on this final pass**—especially the T−24 scheduling dependency, local-time/DST FIDS handling, explicit cargo/private scope, the stale outcome/censoring table, and the current AviationWeather retention change.

If the coding agent completes that prompt correctly and its final tables show **zero collection blockers + zero primary-evaluation blockers + all gates actually passed**, then I would consider V3.9 ready and would **not recommend another theoretical re-audit before Phase 6**.

[1]: https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf?utm_source=chatgpt.com "Chained Predictions of Flight Delay Using Machine Learning"
[2]: https://scholarworks.sjsu.edu/faculty_rsca/2410/?utm_source=chatgpt.com "\"A comparative analysis of delay propagation on departure and arrival f\" by Zhe Zheng, Wenbin Wei et al."
[3]: https://scholarworks.sjsu.edu/faculty_rsca/4774/?utm_source=chatgpt.com "\"A Data-Light and Trajectory-Based Machine Learning Approach for the On\" by Zhe Zheng, Bo Zou et al."
[4]: https://www.sciencedirect.com/science/article/pii/S1366554524001169?utm_source=chatgpt.com "Flight delay propagation modeling: Data, Methods, and Future opportunities - ScienceDirect"
[5]: https://github.com/lucasbstn/aerodatabox/blob/main/doc/FlightAPIApi.md?utm_source=chatgpt.com "aerodatabox/doc/FlightAPIApi.md at main · lucasbstn/aerodatabox · GitHub"
[6]: https://aspmhelp.faa.gov/index/ASPM__Individual_Flights__Definitions_of_Variables.html?utm_source=chatgpt.com "ASPM: Individual Flights: Definitions of Variables - ASPMHelp"
[7]: https://www.connect.aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
