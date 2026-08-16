Yes. I read the V3.9 plan in depth, including the binding plan, its deep-dive addenda, the contradiction map, and the PRE/POST additions, and I cross-checked the core scientific assumptions against SJSU, SDSU, FAA, and recent aviation-delay literature.

## My overall verdict

**The architecture is fundamentally on the right path. I would not redesign it.**

But I also would **not start the 60k production collection exactly as written yet**.

There are a handful of **foundation-level issues that should be fixed before collection**, because they can otherwise make the resulting prediction models look much better offline than they would perform in the real world.

The most important finding is this:

> **Your PRE/POST separation is now fundamentally correct, but your notion of “what was knowable at the cutoff” still needs one more layer: *when the information became available*, not merely when the event says it happened.**

That is more important than adding another model, another GNN, or another airport.

---

# 1. Did you successfully create two separate datasets/models?

### Yes — structurally, this is now correct.

Your plan now explicitly defines:

**PRE-DEPARTURE**

* T-24h
* T-6h
* T-90m
* features only from information available at the cutoff
* targets such as departure delay, arrival disruption, cancellation, diversion

**AIRBORNE / POST**

* one snapshot per airborne observation time
* cutoff = the aircraft's prediction timestamp
* trajectory preserved as a time series
* ETA / remaining flight time
* final arrival delay
* diversion / delay probabilities

The file explicitly says PRE and AIRBORNE are separate modeling states and that they should not be merged. 

This is exactly the kind of separation I would expect for two different aviation prediction problems.

The SJSU work strongly supports the POST concept. Zhe Zheng, Bo Zou, Wenbin Wei and Wen Tian's 2023 SJSU-affiliated paper is specifically about **real-time airborne ETA prediction**, using trajectory points such as latitude, longitude and speed, reconstructing historical trajectories, and predicting remaining trajectory/ETA/landing time. ([SJSU ScholarWorks][1])

So your idea of:

`raw trajectory → cleaned trajectory → airborne snapshots → ETA/remaining-time model`

is scientifically defensible.

---

# 2. PRE-DEPARTURE foundation: mostly correct

Your biggest improvement is the population layer.

You correctly recognized that:

> “flight sent a webhook event” ≠ “flight existed at the prediction cutoff.”

Your plan now creates:

`flight_population → flight_snapshot → later outcome`

rather than:

`webhook event → snapshot`

That is a major methodological improvement. The file explicitly says snapshot existence is population-defined and that a post-cutoff event supplies the **label**, not the existence of the snapshot. 

That is the right direction.

Why this matters:

Suppose a flight existed at 08:00 and your T-6 prediction was supposed to be made at 09:00. If the webhook didn't happen to capture that flight until 11:30, you cannot discard the 09:00 prediction example. Doing so would condition your dataset on future observability.

Your plan now avoids that.

### Research supports the operational variables you are collecting

The SJSU study by Zheng, Wei and Hu found that delay propagation depends on previous delay, buffer/turnaround, weather, aircraft utilization, and flight order. ([SJSU ScholarWorks][2])

The SDSU work by Jun Chen and Meng Li likewise found that **departure delay and late-arriving aircraft delay** were among the most important predictors, and explicitly built a chained model around the same aircraft's itinerary. ([Jun Chen][3])

That means your decision to preserve:

* aircraft identity
* previous leg
* arrival/departure times
* turnaround
* tail chains
* route
* airport state

is not unnecessary feature collection. It is directly tied to the aviation mechanism being predicted.

The FAA independently treats aircraft-tail continuity as central to delay propagation and uses Gate Out, Wheels Off, Wheels On and Gate In information to analyze it. ([FAA Aircraft Situation Display Tool][4])

So the **aircraft-chain concept is one of the strongest parts of V3.9**.

---

# 3. The biggest issue I found: timestamp leakage is not fully closed

This is the one I would fix **before anything else**.

Your binding rule says, essentially:

> `feature_timestamp ≤ prediction_cutoff`

and for airborne data you lean heavily on `reportedAtUtc`. 

That is necessary, but **not sufficient**.

You need to distinguish at least:

### A. Event time

When the thing actually happened.

Example:

`reportedAtUtc = 14:00`

### B. Publication/provider time

When the provider generated/published the observation.

### C. Receipt/availability time

When **your system actually received the information**.

Example:

`reportedAtUtc = 14:00`
`provider_published = 14:01`
`received_at = 14:07`

If your prediction cutoff is 14:05, a model using that observation is leaking the future even though:

`reportedAtUtc <= 14:05`

because **you did not know it at 14:05**.

Your plan already stores `received_timestamp_utc` and `source_latency_seconds`, which is excellent. 

But the normative leakage rule should therefore become something like:

> **A feature is eligible only when `information_available_timestamp ≤ prediction_cutoff`.**

Then separately preserve:

* event time
* source/provider time
* ingestion/availability time

This is particularly important for:

* live flight status
* FIDS changes
* revised schedules
* weather
* TAF revisions
* network state
* aircraft location

### Why I consider this blocking

A real pre-departure or airborne model is not predicting from “what existed in the universe at that physical time.”

It is predicting from:

> **what the system could actually know at that decision time.**

That distinction is fundamental to an operational prediction system.

So I would make this a **new blocking data-contract rule** before the 60k run.

---

# 4. Your PRE target definitions need one more correction

This is subtle but important.

You currently have things like:

`dep_runway_utc − dep_scheduled_utc`

and

`actual_wheels_on − arr_scheduled`

The problem is that **“scheduled departure” and “scheduled arrival” are ambiguous unless the exact milestone is defined.**

FAA's operational data model explicitly separates:

* Scheduled Gate Out
* Actual Gate Out
* Scheduled Wheels Off
* Actual Wheels Off
* Scheduled Gate In
* Actual Gate In
* Scheduled/Wheels-On information

and separately computes gate, taxi, airborne and block delays. ([FAA Aircraft Situation Display Tool][5])

### Therefore your schema should explicitly store:

**Departure**

* scheduled_gate_out
* actual_gate_out
* scheduled_wheels_off
* actual_wheels_off

**Arrival**

* scheduled_wheels_on
* actual_wheels_on
* scheduled_gate_in
* actual_gate_in

Then define the target precisely.

For example:

### PRE departure-delay target

`actual_wheels_off - scheduled_wheels_off`

or, if you care about traveler experience:

`actual_gate_out - scheduled_gate_out`

### POST landing-time target

`actual_wheels_on - prediction_cutoff`

This is exactly the kind of ETA problem supported by the SJSU airborne study. ([SJSU ScholarWorks][1])

### POST arrival-delay target

You must decide whether “arrival” means:

**landing delay**
`actual_wheels_on - scheduled_wheels_on`

or

**gate-arrival delay**
`actual_gate_in - scheduled_gate_in`

For a traveler-facing product, I would strongly consider keeping **both**, rather than allowing `arr_scheduled` to remain ambiguous.

This is one place where your current plan is not wrong mathematically, but it is **under-specified operationally**.

---

# 5. Your POST model is structurally good — but its population denominator is incomplete

This is the other major issue.

You have done an excellent job preserving:

* lat/lon
* altitude
* pressure altitude
* speed
* track
* vertical rate
* reported time
* flight phase
* trajectory gaps
* distance flown
* route completion

and explicitly preventing the “latest-location overwrites trajectory history” problem. 

That is exactly what the SJSU trajectory research supports. Their 2023 work reconstructs trajectory points from raw trajectory and uses the flown trajectory to predict the remaining trajectory and landing time. ([SJSU ScholarWorks][1])

### But you still have:

`PRE population = defined`

while the POST population is effectively:

`airborne events that happened to be observed`

Those are not the same thing.

Your plan measures:

* observations per flight
* gap distribution
* trajectory completeness
* POST observations per credit

which is very good. 

But I would add a formal POST denominator:

### `airborne_eligible_population`

For example:

```text
flight became known as an operating flight
        ↓
actual wheels-off occurred
        ↓
airborne-eligible
        ↓
≥1 airborne observation captured
        ↓
≥N usable observations
        ↓
trajectory completeness threshold
        ↓
POST training snapshot eligibility
```

Then report:

`airborne eligible → observed → usable → trajectory-complete → POST snapshots → labeled`

That would make POST much more scientifically defensible.

Without this, a model could perform beautifully while being trained disproportionately on aircraft/routes that happen to be easy for the provider to track.

Your plan already understands this problem conceptually for PRE. It should apply the same discipline explicitly to POST.

---

# 6. Your POST partition rule is very good

I especially like this.

You correctly prevent:

> flight A at t1 → train
> flight A at t2 → test

in the primary POST experiment.

Your plan explicitly keeps the same flight instance in one evaluation partition. 

That is important because otherwise the model can effectively memorize the trajectory of the same flight.

SJSU's airborne work makes trajectory history highly informative, so leaking the same flight across train/test would be especially dangerous. ([SJSU ScholarWorks][1])

This part should remain exactly as a hard rule.

---

# 7. Your aircraft-chain design is very well supported

This is another strong part.

The SDSU paper specifically uses the same aircraft's previous flight to propagate delay through its itinerary. ([Jun Chen][3])

The SJSU work likewise finds previous delays, buffer and aircraft utilization important to later-leg performance. ([SJSU ScholarWorks][2])

And the FAA's own delay-propagation definition explicitly follows subsequent legs of the **same aircraft identified by tail number**, requiring arrival/departure relationships across legs. ([FAA Aircraft Situation Display Tool][6])

So your decision to preserve:

`tail → predecessor → arrival → turnaround → successor`

is not just an ML convenience.

It is an actual aviation causal/mechanistic structure.

### One thing to ensure

You need to store the **knowledge status** of the previous leg at the cutoff.

For example:

```text
previous_leg_exists = yes
previous_leg_landed = yes
previous_leg_arrival_known_at_cutoff = yes
previous_leg_arrival_time = ...
source_available_at = ...
```

You already say “previous-leg counts only if landed before cutoff,” which is good. 

I would make that a formal schema requirement rather than just a feature-engineering rule.

---

# 8. Weather: the concept is right, but don't let retrospective weather become “perfect historical knowledge”

Your weather architecture is broadly correct.

The plan correctly distinguishes:

* observation time
* forecast issue time
* forecast validity interval

and prohibits weather issued after the prediction cutoff. 

That's exactly the discipline you need.

The plan also correctly recognizes that historical archive availability is a separate issue from “free API access.” 

### One extra safeguard I would add

For every forecasted weather input, preserve:

```text
source
issue_time
retrieval_time
valid_from
valid_to
revision/amendment identifier if available
```

Because the model should see the forecast **as it existed then**, not the meteorological truth that became known later.

That distinction is especially important for T-24 and T-6.

---

# 9. Your data-collection strategy is more scientifically mature than your average ML dataset

I think several of the sampling decisions are genuinely strong:

### Measured provider population

Good.

You explicitly avoid claiming “true census” and instead use provider-observable population terminology. 

### Zero-yield handling

Good.

You don't automatically conclude that an airport is useless after one empty result.

### Coverage-age/staleness

Very good.

The staleness curve is exactly the type of diagnostic that can reveal whether the model is actually learning aviation or simply responding to stale observation coverage. 

### Collection-mechanism ablation

Excellent.

Your:

* full
* remove coverage/capture metadata
* remove airport identity
* remove graph connectivity

design is especially valuable because it tests whether the model learned:

> aviation operations

or merely:

> the data-collection mechanism.

That is one of the smartest parts of the plan. 

---

# 10. Your 4-hour collection window is defensible — but it should not be mistaken for a scientific truth

Your reasoning that continuous 4h windows help preserve aircraft-chain continuity is sensible.

The SDSU research supports the importance of aircraft itinerary propagation. ([Jun Chen][3])

The SJSU work supports previous-flight and buffer relationships. ([SJSU ScholarWorks][2])

So testing:

* 4h
* 2×2h
* up-to-6h

is useful.

But you correctly do **not** claim that 4h is inherently statistically superior. The file explicitly warns against making that claim. 

That is correct.

---

# 11. Your GNN direction is correct

I do **not** see a reason to make GNN the first model.

Your ladder:

`baseline → XGBoost → weather → graph → temporal GNN → chains → disruption → uncertainty`

is much more scientifically defensible than:

`collect data → immediately build GNN`.

The SJSU literature supports network/graph modeling as a legitimate hypothesis. Their 2023 GCN-GRU work explicitly models correlations between flights in the operational network. ([SJSU ScholarWorks][7])

But that does **not** establish that GNN will beat a well-engineered tabular model.

Your plan correctly treats it as a hypothesis.

The 2024 review literature likewise frames flight-delay propagation as a broad data/method problem rather than something that mandates one algorithm. ([ScienceDirect][8])

---

# 12. Your evaluation design is unusually strong

You have:

* chronological future testing
* unseen airports
* unseen regions
* unseen tails
* disruption-event blocking
* unseen routes
* collection-mechanism ablation
* staleness analysis
* calibration
* block bootstrap
* read-only hashed final test set

This is considerably better than simply doing random train/test splitting.

The 2024 flight-delay propagation review emphasizes the diversity of data sources, modeling perspectives and operational structures involved in this field. ([ScienceDirect][8])

### One warning

The 31-day run can establish an **early operational pilot**, exactly as your file says.

It cannot establish:

* annual seasonality
* year-over-year generalization
* rare-event robustness
* long-term airline schedule shifts
* full seasonal weather regimes

Your own plan already acknowledges this. Keep that wording.

---

# 13. One important missing PRE component: historical feature store

This is the biggest omission I see after the availability timestamp issue.

You want features such as:

* recent airport delay
* route recent delay
* previous-tail delay
* historical operational state
* utilization
* airport congestion

But the new 31-day collection does not itself automatically provide the historical lookback needed to construct these correctly at T-24.

You need an explicit **as-of historical feature layer**, something like:

```text
historical_feature_store

airport × date/time
route × date/time
carrier × airport × time
tail × prior-leg
OD pair × time
weather × time
```

with every value carrying:

```text
feature_value
source
source_timestamp
availability_timestamp
valid_from
valid_to
```

Then:

```text
snapshot(T)
   ↓
find most recent eligible historical information
   ↓
availability_timestamp <= T
```

Otherwise “historical delay” can quietly become “historical delay calculated later from the completed dataset,” which creates retrospective information leakage.

Your plan hints at this, but I would make it a first-class collection/schema requirement.

---

# 14. The plan's biggest internal contradiction is actually historical text

The document contains many preserved addenda and old revisions.

The good news is that your contradiction map explicitly says older statements are superseded. 

For example, the history contains older ideas such as:

* event-required snapshots
* “null = censored”
* true census wording
* 1 row ≈ 1 credit
* old weighting ideas

and the final specification explicitly replaces them.

That is conceptually fine.

### But from an implementation standpoint it is dangerous.

A developer reading the entire file can still encounter old language in Part 2.

I would therefore recommend one hard convention:

> **Only Part 1 is executable. Part 2 must be marked “non-normative historical context” at the top of every old addendum, and every superseded rule should be visually unmistakable.**

Otherwise someone implementing a pipeline six weeks from now can accidentally resurrect an old rule.

Your plan already says Part 1 is normative; the issue is implementation safety, not conceptual correctness.

---

# 15. Research verification: the SJSU/SDSU foundation is legitimate

I checked the major research claims rather than relying only on the citations embedded in the MD file.

### SDSU — Jun Chen

The SDSU paper is real and directly relevant.

It states that departure delay and late-arriving-aircraft delay are important predictors and builds a chained aircraft-itinerary delay model. ([Jun Chen][3])

### SJSU — Wenbin Wei / Zhe Zheng

The 2021 SJSU-affiliated paper explicitly studies operation, time and weather factors, previous delays, buffers, aircraft utilization and later-leg propagation. ([SJSU ScholarWorks][2])

### SJSU — airborne ETA

The 2023 SJSU-affiliated research directly concerns real-time airborne ETA/landing-time prediction and trajectory reconstruction. ([SJSU ScholarWorks][1])

### SJSU — network model

The SJSU-affiliated GCN-GRU work supports the idea that operational network structure can be used for delay prediction. ([SJSU ScholarWorks][7])

### FAA operational data

FAA ASPM independently confirms that the aircraft operational chain is represented with Gate Out, Wheels Off, Wheels On and Gate In, and its delay-propagation framework explicitly follows subsequent legs by aircraft/tail. ([FAA Aircraft Situation Display Tool][9])

### Broader recent literature

A 2024 Transportation Research Part E review synthesizes flight-delay propagation data sources, methods and research opportunities, reinforcing your general architecture of combining schedule, operational/network and other contextual data rather than relying on a single feature family. ([ScienceDirect][8])

So I **do not see evidence that the scientific direction of the plan is fundamentally wrong**.

---

# 16. My “red / yellow / green” assessment

| Area                             | Assessment                                       |
| -------------------------------- | ------------------------------------------------ |
| PRE vs POST separation           | 🟢 Correct                                       |
| FIDS/population layer            | 🟢 Correct and important                         |
| Raw immutable event storage      | 🟢 Strong                                        |
| Airborne trajectory preservation | 🟢 Strong                                        |
| Aircraft-chain preservation      | 🟢 Strong                                        |
| SJSU/SDSU scientific basis       | 🟢 Supported                                     |
| Weather architecture             | 🟢 Correct, with archive caveats                 |
| Leakage philosophy               | 🟢 Strong                                        |
| Timestamp implementation         | 🟠 **Needs availability-time correction**        |
| PRE target definitions           | 🟠 **Need milestone-specific definitions**       |
| POST arrival-delay target        | 🟠 **Need wheels-on vs gate-in decision**        |
| POST denominator/population      | 🟠 **Needs explicit airborne eligibility layer** |
| Historical/as-of feature store   | 🟠 **Needs to become first-class**               |
| Tail features                    | 🟢 Correct, provided as-of logic is enforced     |
| GNN strategy                     | 🟢 Correct as a later hypothesis                 |
| Evaluation design                | 🟢 Very strong                                   |
| 31-day scientific claims         | 🟢 Correctly treated as pilot                    |
| Contradictory old addenda        | 🟠 Implementation-risk, not architecture failure |

---

# 17. What I would change before collecting the 60k

I would **not add another model, another sampling revision, or another theoretical review.**

I would make these four foundation patches:

### Patch 1 — Knowledge/availability timestamp

Add a universal rule:

```text
feature eligible iff
information_available_timestamp <= prediction_cutoff
```

and preserve separately:

```text
event_timestamp
provider_timestamp
availability_timestamp
received_timestamp
```

This should apply to:

* flight events
* FIDS/schedules
* schedule revisions
* weather observations
* weather forecasts
* network features
* tail/rotation features

### Patch 2 — Exact operational milestone schema

Explicitly collect:

```text
scheduled_gate_out
actual_gate_out

scheduled_wheels_off
actual_wheels_off

scheduled_wheels_on
actual_wheels_on

scheduled_gate_in
actual_gate_in
```

Then define the target for every model unambiguously.

### Patch 3 — Formal POST population denominator

Add:

```text
airborne_eligible
airborne_observed
airborne_usable
airborne_trajectory_complete
POST_snapshot_eligible
POST_labeled
```

This makes the POST collection mechanism measurable rather than simply assuming observed airborne points are representative.

### Patch 4 — As-of historical feature store

Make historical features immutable and timestamped with:

```text
value
event_time
available_at
source
valid_from
valid_to
```

This is essential for the T-24/T-6/T-90 models.

---

# 18. One thing I would NOT change

I would **not** reverse your decision to preserve every airborne observation.

That is absolutely the right choice.

SJSU's airborne ETA research reconstructs trajectory sequences from raw points, so reducing the provider stream to only the latest aircraft location would throw away precisely the information needed for a trajectory-based POST model. ([SJSU ScholarWorks][1])

Likewise, I would keep the aircraft-chain history rather than simplifying it to a single previous-delay feature. The raw chain lets you later test:

* previous leg
* previous two legs
* chain depth
* turnaround
* accumulated delay
* aircraft utilization

without recollecting everything.

---

# Final answer: should you proceed?

### **Yes — but proceed to implementation/preflight, not to the full 60k collection yet.**

I would classify the plan as:

> **Architecture GO — data-contract patch required — then collection GO subject to the existing gates.**

I **do not** see a fundamental contradiction such as:

> “This collection strategy can never produce a PRE model.”

or:

> “This strategy cannot produce a POST model.”

It can produce both.

And the PRE/POST foundation is now substantially supported by the SJSU/SDSU literature:

* SDSU supports the importance of aircraft-chain / late-arriving-aircraft information for delay propagation. ([Jun Chen][3])
* SJSU supports previous delay, buffers, weather and aircraft utilization as operational predictors. ([SJSU ScholarWorks][2])
* SJSU directly supports airborne trajectory-based ETA/landing prediction. ([SJSU ScholarWorks][1])
* FAA operational definitions support preserving Gate-Out/Wheels-Off/Wheels-On/Gate-In and aircraft-tail chains. ([FAA Aircraft Situation Display Tool][9])

### The three things I consider truly blocking are:

**1. Availability-time leakage**
`reported_at <= cutoff` is not enough; the information must have been **available** by cutoff.

**2. Ambiguous delay milestones**
Define gate-out / wheels-off / wheels-on / gate-in targets explicitly.

**3. Missing formal POST denominator**
Measure which airborne flights were eligible versus merely observed, just as you now do for PRE.

And I would add the historical as-of feature store as the fourth important foundation improvement.

Once those are patched, I would be comfortable saying:

> **V3.9 is on the correct scientific and engineering path for building two separate aviation prediction systems — PRE-DEPARTURE and AIRBORNE/POST — and the next step should be implementation of the corrected data contract and gates, not another architecture rewrite.**

The strongest next step is to turn those four findings into a precise **“V3.9 pre-collection blocking patch”**—field-by-field, table-by-table—so the implementation cannot accidentally reintroduce timestamp leakage or ambiguous labels.

[1]: https://scholarworks.sjsu.edu/faculty_rsca/4774/ "\"A Data-Light and Trajectory-Based Machine Learning Approach for the On\" by Zhe Zheng, Bo Zou et al."
[2]: https://scholarworks.sjsu.edu/faculty_rsca/2410/ "\"A comparative analysis of delay propagation on departure and arrival f\" by Zhe Zheng, Wenbin Wei et al."
[3]: https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf "Chained Predictions of Flight Delay Using Machine Learning"
[4]: https://www.aspm.faa.gov/aspmhelp/index/ASPM_Flight_Level.html "ASPM:Flight Level - ASPMHelp"
[5]: https://www.aspm.faa.gov/aspmhelp/index/ASPM_Data_Download__Flight_Level_Data.html?utm_source=chatgpt.com "ASPM Data Download: Flight Level Data - ASPMHelp"
[6]: https://www.aspm.faa.gov/aspmhelp/index/Delay_Propagation.html?utm_source=chatgpt.com "Delay Propagation - ASPMHelp"
[7]: https://scholarworks.sjsu.edu/faculty_rsca/4935/ "
\"Delay Prediction of Flight Operation Network Based on Deep Learning Co\" by Jiaxin Chen, Weiwei Wu et al.
"
[8]: https://www.sciencedirect.com/science/article/pii/S1366554524001169?utm_source=chatgpt.com "Flight delay propagation modeling: Data, Methods, and Future opportunities - ScienceDirect"
[9]: https://www.aspm.faa.gov/aspmhelp/index/ASPM_Flight_Level.html?utm_source=chatgpt.com "ASPM:Flight Level - ASPMHelp"
