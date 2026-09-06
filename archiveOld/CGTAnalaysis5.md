Yes. **V3.5 is now on the right path**, and the fourth review fixed the most important conceptual weakness I had identified in V3.4: you are no longer confusing airport-selection probability with flight-level inclusion probability.

I re-checked the design against current 2025–2026 aviation ML work, including the 2025 NeurIPS **Aeolus** dataset, recent aircraft-rotation/propagation work, recent graph-vs-tree comparisons, multi-horizon graph forecasting, and current NOAA aviation-weather documentation. The overall architecture is well aligned with where the research is going. ([NeurIPS Proceedings][1])

But I would **not yet call V3.5 final**. I see about **six remaining issues**, and two of them are important enough that I would fix them before the 60k run.

## My overall verdict

I would characterize it this way:

| Area                                                  | Assessment                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| Prediction problem                                    | ✅ Strong                                                      |
| Leakage prevention                                    | ✅ Strong                                                      |
| Aircraft-chain collection                             | ✅ Strong                                                      |
| Weather architecture                                  | ✅ Strong                                                      |
| Graph/network representation                          | ✅ Strong                                                      |
| XGBoost → graph → GNN ladder                          | ✅ Strong                                                      |
| Temporal/future evaluation                            | ✅ Strong                                                      |
| Unseen-airport/region evaluation                      | ✅ Strong                                                      |
| Flight vs airport sampling distinction                | ✅ Major improvement                                           |
| Randomized/balanced windows                           | ✅ Good improvement                                            |
| Information-per-credit                                | ✅ Excellent                                                   |
| Marginal predictive value / credit                    | ✅ Excellent research direction                                |
| Exact `{1 HUB, 2 MID, 1 REGIONAL}` allocation         | 🟡 Experimental, not literature-established                   |
| Five-airport anchor pool                              | 🟡 Experimental, not literature-established                   |
| Classical sampling-probability interpretation         | 🟡 Still needs tightening                                     |
| First-month causal/window experiment                  | 🔴 Needs one important redesign                               |
| 60k → learning-curve claims                           | 🔴 Needs correction                                           |
| Weather "free" assumption                             | 🟡 Mostly true for source access, but ETL/coverage isn't free |
| "every feature's value = remove it" marginal analysis | 🟡 Needs a cleaner experimental design                        |

So I would say:

> **The architecture is now scientifically defensible. The remaining issues are mostly experimental-design and statistical-identification issues, not fundamental problems with your collection strategy.**

---

# 1. The biggest improvement: the 1/p correction is now right

This part of V3.5 is substantially better.

You now distinguish:

```text
airport selection
        ↓
flight capture
        ↓
flight inclusion
        ↓
snapshot construction
```

That is exactly the distinction I wanted.

This statement in your V3.5 is particularly important:

> "`airport_design_probability` is airport-layer metadata, not a real flight-row inclusion probability."

**Keep that.**

The earlier idea of doing:

```text
sampling_weight = 1 / airport_design_probability
```

for every flight was not justified.

Now you instead record:

```text
airport_design_probability
flight_capture_flags
sampling_weight = NULL
```

and reserve actual weighting for a future study.

That is much more defensible.

Recent aviation benchmark work also emphasizes building realistic multimodal temporal structures rather than pretending the observations are independent flat samples. Aeolus, for example, explicitly constructs aligned tabular, flight-chain, and network modalities and emphasizes temporal splits and leakage prevention. ([NeurIPS Proceedings][1])

### One further correction

Your document still sometimes says:

> "sampling probabilities are recorded..."

Be precise about **which probability**.

I recommend renaming the concept everywhere to:

```text
airport_layer_design_probability
```

rather than merely:

```text
airport_design_probability
```

That makes it much harder for someone six months later to accidentally use it as a flight-level probability.

---

# 2. Your seeded balanced time schedule is a real improvement

Your old schedule was:

```text
00 → 04 → 08 → 12 → 16 → 20
```

The new:

```text
balanced permutation of
{00,04,08,12,16,20}
```

with:

```text
time_window_schedule_seed
```

is better.

You retain:

> each UTC block appears once per six-day block

while avoiding a deterministic association like:

```text
Monday → 00
Tuesday → 04
Wednesday → 08
...
```

That's a sensible experimental-design improvement.

### But I would make one additional change

Don't just balance over **6 days**.

Balance over **weekday × UTC slot** over the whole collection.

Because your six-day balancing does not guarantee that:

```text
Monday 00 UTC
Monday 04 UTC
...
```

will be equally represented.

A better schedule constraint is:

[
\text{approximately balanced exposure across}
\quad
(\text{weekday class},\text{UTC block})
]

over a longer block.

For example, maintain a schedule table such as:

```text
weekday
UTC_block
airport_region
local_time_bin
window_shape
```

and optimize the randomization so no combination becomes heavily overrepresented.

That is a relatively small change, but it makes your "balanced randomized schedule" claim much stronger.

---

# 3. The aircraft-chain decision is strongly supported by current research

This part is one of the strongest things you have done.

Aeolus explicitly treats **flight chains** as a first-class modality because delay propagates along sequential flight legs. ([NeurIPS Proceedings][1])

Even more directly, the 2025 delay-absorption study used upstream aircraft-rotation information and then fed a learned absorption signal into an XGBoost downstream delay model. ([arXiv][2])

The 2026 FlightSense paper similarly reports a large performance improvement when aircraft rotation-chain features were added to an XGBoost baseline, with an additional improvement after adding NOAA weather. ([arXiv][3])

So your collection metric:

```text
tail-chain links / credit
```

is excellent.

I would actually elevate it even further.

Your collection dashboard should track:

```text
unique tail
tail observations
consecutive-tail pairs
3-leg chains
4+ leg chains
chain completeness
```

because:

```text
A → B
```

is useful.

But:

```text
A → B → C → D
```

gives you much richer information about propagation.

---

# 4. The GNN strategy is also now much more scientifically defensible

Your Model 0→7 ladder is good.

The important thing is that you have stopped asking:

> "Can the GNN beat XGBoost?"

and instead ask:

> **"What information does a graph representation add beyond strong tabular features?"**

That's exactly the right research question.

Recent work supports being cautious here. One 2025 graph-ML aviation study found that CatBoost with graph-derived features outperformed a GAT for its holding-prediction task. ([arXiv][4])

A very recent 2026 multi-horizon airport-delay study likewise found that graph models were useful for network-aware forecasting but were not universally the best point-forecast model; conventional models remained competitive. ([MDPI][5])

That makes your ladder:

```text
tabular
→ weather
→ static network
→ temporal graph
→ rotation
→ disruption
→ uncertainty
```

very sensible.

---

# 5. I would change the graph architecture slightly

Your static/dynamic/resource split is good:

```text
STATIC
route
geography
schedule

DYNAMIC
current delay
congestion
network state

RESOURCE
capacity
runways
gates
ATC
```

But there is one missing dimension:

## aircraft/flight-chain edges

You currently put rotations mostly into the feature layer.

I would explicitly make them an edge type too:

```text
FLIGHT A ──same-tail──> FLIGHT B
```

while retaining:

```text
AIRPORT A ──route──> AIRPORT B
AIRPORT A ──congestion──> AIRPORT B
AIRCRAFT ──operates──> FLIGHT
```

Then the graph becomes multi-relational rather than merely airport-centric.

That is much closer to Aeolus's concept of combining aircraft, airport-resource, and other flight relationships. ([NeurIPS Proceedings][1])

---

# 6. Your weather layer is good, but there is one factual/documentation issue

You correctly caught the historical-access issue.

The current AviationWeather.gov API says that its database allows access to **up to the previous 15 days**, while METAR and TAF are available worldwide through the service. It also provides cache files for larger/current datasets. ([Aviation Weather Center][6])

So your:

```text
live METAR/TAF
+
historical archive
+
GFS/ERA5
```

architecture is correct.

But I would change this sentence:

> "Weather is free."

to:

> **"The selected weather sources have no AeroDataBox credit cost; historical retrieval, storage, processing, and archive availability remain separate engineering constraints."**

That distinction matters.

---

# 7. There is a subtle issue with your T-24 / T-6 / T-90 setup

I like the three horizons.

But don't necessarily assume they need to be **three completely separate models**.

You could eventually test:

### Strategy A

Three independent models:

```text
M24
M6
M90
```

versus

### Strategy B

A shared model with:

```text
horizon_hours
```

as an explicit condition.

Then compare:

[
MSE_{separate}
]

against

[
MSE_{shared}
]

This is worth testing because much of the underlying structure is shared, while the available information set changes.

Your current design is still perfectly valid; I'm saying **don't freeze the three-model decision yet**.

The recent literature itself includes multi-horizon forecasting rather than treating every horizon as fundamentally unrelated. The 2026 graph study explicitly evaluates multiple horizons. ([MDPI][5])

---

# 8. Your "future representative" test is absolutely the right primary test

This is one of the best additions.

You now have:

```text
A = future representative
B = unseen airport
C = unseen region
D = unseen tail/type
E = disruption stress
```

That's excellent.

And the distinction:

```text
A = deployment claim
B-D = generalization claims
E = stress claim
```

is exactly how I would structure the scientific narrative.

Recent research also emphasizes transferability/generalization across networks; for example, one 2025 study evaluated its framework across U.S. BTS and EUROCONTROL data specifically to assess transferability. ([arXiv][7])

### One thing I would add

For Engine A, use **rolling-origin evaluation**, not a single chronological split.

For example:

```text
Train: weeks 1–4
Validate: week 5
Test: week 6

Train: weeks 1–5
Validate: week 6
Test: week 7

...
```

Then report:

```text
mean
std
P10/P50/P90
```

across several temporal origins.

That is more robust than:

```text
one train period → one test period
```

especially with aviation seasonality and disruptions.

---

# 9. The biggest problem I still see: your "controlled window experiment" isn't actually fully controlled

This is the most important remaining issue.

You say:

> same anchor, same tier mix, same UTC slot, same weekday class, same matched MID/REGIONAL set — ONLY window shape differs.

But there's a problem.

Suppose:

```text
Day 5:
08:00–12:00

Day 6:
2×2h
08:00–10:00
10:00–12:00
```

Fine.

But if weather and traffic conditions differ between days, then:

```text
weather
ATC state
disruption state
airport demand
aircraft availability
```

still differ.

And aviation operations are highly nonstationary.

Therefore your design is **matched**, not literally "only window shape differs."

That's okay, but call it what it is.

### Better design

Use a **randomized crossover** whenever possible:

```text
Template A/B
same airport set

period 1:
A gets 4h
B gets 2×2h

period 2:
A gets 2×2h
B gets 4h
```

Then estimate the treatment effect within the crossover.

That removes much more of the day-level environmental effect.

Your document says crossover is possible, but I would make it **the preferred design**, with ordinary matched pairs as the fallback.

---

# 10. There is a more important problem with the 6-hour experiment

Suppose:

```text
4h = 1,400 credits
6h = 1,900 credits
```

and the 6h experiment simply runs until the budget is exhausted.

Then you're not really comparing:

```text
4h
vs
6h
```

You're comparing:

```text
4h @ budget 1900
vs
up-to-6h @ budget 1900
```

You already acknowledge this in the documentation.

But then the **scientific question becomes ambiguous**.

Do you want to learn:

> Is a longer observation window better?

or:

> What is the best way to spend 1,900 credits?

Those are not the same experiment.

For your actual product, I think the second question is more important.

So I would define the experiment explicitly as:

> **Under a fixed 1,900-credit budget, which window regime maximizes predictive information?**

Then "up-to-6h" is not a failed 6h experiment. It is a legitimate allocation regime.

---

# 11. The marginal-predictive-value idea is excellent—but your current method has a flaw

You write:

> remove a slice → measure Δ model

This is useful for **feature importance / contribution**.

But it is not automatically:

[
\text{marginal predictive value per credit}
]

because if you remove a slice, you are changing the **features**, not necessarily simulating what it would have cost to collect that slice.

For example:

```text
Remove weather
```

doesn't tell you:

> how many AeroDataBox credits are worth spending on another airport.

Those are different interventions.

I would split this into two quantities:

### Feature contribution

[
\Delta P_{feature}
==================

M(full)-M(without\ feature)
]

### Collection marginal value

[
MV_{data}
=========

\frac{\Delta M}
{\Delta Credits}
]

where the numerator comes from an actual **collection intervention**.

For example:

```text
+1 additional observation day at WSSS
```

versus:

```text
+1 additional MID airport
```

versus:

```text
+1 regional airport
```

versus:

```text
+1 tail-chain observation
```

Those are actual data-collection treatments.

That's much closer to a true marginal-cost study.

---

# 12. Your learning-curve section contains a concrete mistake

You wrote:

> train the ladder models on 10k / 50k / 100k flight-observations

But your hard constraint is:

```text
60,000 credits
```

and the current observed cost is roughly:

```text
~1 row/credit
```

So **100k flight observations cannot be generated by this 60k run** unless you are incorporating external/free data or future collection beyond the stated budget.

You do later say:

> "credits are fixed"

but the proposed learning curve contradicts that.

I would change it to:

```text
2k
5k
10k
20k
30k
40k
50k
~58k
```

or whatever the actual cumulative dataset sizes become.

Then fit the curve only inside the observed domain.

Do **not extrapolate 100k** as though you measured it.

You can model an asymptotic curve if you clearly label the extrapolation, but the empirical experiment should stay within your actual data budget.

---

# 13. I would add one more baseline: "current information only"

Your Model 0:

```text
calendar/seasonal baseline
```

is useful.

But I would also create:

```text
Model -1:
last-known operational state
```

For example:

```text
airport recent delay
route recent delay
aircraft previous-leg delay
```

without sophisticated ML.

Why?

Because aviation is strongly autocorrelated.

Then you can answer:

> Does ML actually outperform a simple persistence/congestion baseline?

That's a very important scientific test.

---

# 14. Your outcome-state design is good, but the diversion definition is too simplistic

You currently have:

```text
planned arr airport ≠ actual
→ diverted
```

Conceptually reasonable, but make sure "actual arrival airport" is based on a reliable actual-arrival field and not simply a changed operational destination field.

Otherwise:

```text
planned destination
```

may be updated after a diversion and your parser could misclassify it.

I would define:

```text
diverted = actual destination differs from original scheduled destination
AND reliable evidence of diversion exists
```

and retain:

```text
original_scheduled_destination
current_operational_destination
actual_destination
diversion_flag
```

This is mostly a data-model improvement.

---

# 15. Your "zero-yield" rule is correct

I agree strongly with:

> zero-yield ≠ outside the population.

A silent airport can be silent because:

```text
low traffic
wrong time window
feed limitation
temporary outage
schedule effect
```

Dropping it based on observed yield would create a feedback loop.

Your current:

```text
eligible
→ zero-yield
→ tracked
→ bounded adaptation
```

is much safer.

I would, however, distinguish:

```text
zero_yield_once
zero_yield_repeated
zero_yield_persistent
```

because one empty observation is not meaningful evidence.

---

# 16. Your anchor selection needs one additional distinction

You correctly say:

> don't choose anchors using current sampled degree.

Excellent.

But your current anchor score combines:

```text
exogenous reference data
+
standardized probe
```

That's good.

The potential issue is that your probe itself may become **too influential**.

Suppose:

```text
Airport A
huge scheduled traffic
poor probe

Airport B
moderate scheduled traffic
excellent probe
```

Your scoring function could accidentally select B because it happens to have a high-yield day.

I'd therefore use the probe as **one feature in a pre-specified score**, but not allow a single short probe to dominate.

Better:

```text
anchor_score =
  40% exogenous traffic
  20% geographic/network diversity
  20% carrier/international diversity
  20% standardized observed yield
```

Those exact percentages should themselves be treated as an R&D choice—not a published standard.

---

# 17. I would change one thing about "continent" stratification

Your frame says:

```text
traffic
continent
degree
intl/domestic
carrier
timezone
```

This is fine, but you need to avoid creating an enormous number of tiny strata.

For example:

```text
REGIONAL × Oceania × international × high carrier diversity × timezone X
```

might contain almost nobody.

Then your supposedly stratified design can become unstable.

Instead, define:

```text
primary strata
    traffic tier × macro-region
```

and use:

```text
carrier diversity
international share
timezone
degree
```

as balancing variables.

That gives you controlled stratification without exploding the number of cells.

---

# 18. Your "worldwide" language is now appropriately restrained

This part is good:

> "A literature-aligned, budget-constrained experimental collection design..."

and:

> "A probability-aware sample of the AeroDataBox-supported aviation universe."

Keep that.

Do **not** later let the README become:

> "Our dataset contains global airport coverage."

It doesn't.

You have:

```text
supported universe
```

not:

```text
all airports on Earth
```

and:

```text
edge-discovered airport
```

doesn't mean:

```text
directly observed airport
```

Your V3.5 taxonomy correctly recognizes that distinction.

---

# 19. Your research direction is strongly aligned with Aeolus

This is worth emphasizing.

Aeolus combines:

```text
operational features
+
weather
+
airport information
+
flight chains
+
flight network
```

and explicitly emphasizes:

```text
temporal splits
+
leakage prevention
```

for realistic evaluation. ([NeurIPS Proceedings][1])

Your V3.5 architecture has essentially converged toward the same **data structure philosophy**, even though your collection mechanism and budget are completely different.

That's a very good sign.

---

# 20. Your XGBoost-first strategy is also very well supported

The 2025 graph-ML study I checked found CatBoost with graph features outperforming GAT in its holding-event problem. ([arXiv][4])

The 2026 multi-horizon graph study found graph models useful but not universally superior for point forecasting. ([MDPI][5])

And a recent 2025 flight-delay study specifically evaluates tree models with calibration, reporting Brier score in addition to discrimination metrics. ([DOI][8])

So:

```text
XGBoost
→ graph features
→ GNN
```

is a much better scientific design than:

```text
GNN because aviation is a graph
```

---

# 21. Your calibration requirement is absolutely worth keeping

I strongly agree with:

```text
P(delay >15)
P(delay >60)
expected_delay
uncertainty interval
```

and:

```text
calibration
```

as evaluation metrics.

Recent 2025 flight-delay work explicitly evaluates both discrimination and probability calibration, including Brier score and isotonic calibration. ([DOI][8])

For Travnr, this is especially important.

A traveler doesn't really care whether your model has:

```text
AUC = 0.91
```

if:

```text
model says 80% chance
actual frequency = 44%
```

A well-calibrated:

```text
P(delay >60) = 0.63
```

is substantially more useful.

---

# 22. The one major statistical concept I would add: hierarchical dependence

Your flights are not independent.

You have:

```text
same airport
same route
same airline
same tail
same day
same disruption
```

creating clusters.

Your evaluation must therefore be careful not to accidentally put highly related observations into both train and test.

You already say:

```text
split by flight/date
```

but I would strengthen that.

For example, for certain experiments:

```text
entire day
```

or:

```text
entire disruption event
```

should stay within one split.

And for unseen-tail testing:

```text
all observations of a tail
```

must remain in one partition.

Otherwise the model can still memorize operational identities.

---

# 23. There's a hidden problem with the "future representative" test

You say:

> disruption days weighted at their true population frequency.

That's right in theory.

But during your first 30 days you may not have enough disruption events to estimate their natural frequency robustly.

So don't calculate:

```text
true disruption frequency
```

from a tiny 30-day sample and assume it's population truth.

Instead report:

```text
observed frequency
```

and use external historical information where necessary.

This is another reason your statement:

> 30 days ≠ seasonality

is important.

---

# 24. I would modify the first-month goal slightly

Your current first month is trying to accomplish:

```text
collect
+
test window shape
+
choose anchors
+
build snapshots
+
build GNN
+
evaluate weather
+
evaluate marginal value
```

That's ambitious.

The most valuable output of month 1 should instead be:

```text
1. validated collection pipeline
2. validated snapshot pipeline
3. leakage-safe XGBoost baseline
4. information-per-credit curves
5. first airport/recency/generalization results
```

Then GNN becomes the next phase.

Not because GNN is unimportant, but because **you can't meaningfully prove the GNN's value until the underlying data construction has stabilized.**

Aeolus itself demonstrates the importance of the underlying multi-structural dataset before graph learning becomes meaningful. ([NeurIPS Proceedings][1])

---

# 25. The exact changes I would make to V3.5

I would make these **six changes and then consider the collection design ready**:

### A. Rename the probability

Change:

```text
airport_design_probability
```

to:

```text
airport_layer_design_probability
```

or at minimum explicitly define the namespace as airport-layer only.

### B. Make crossover the preferred window experiment

```text
preferred = randomized crossover
fallback = matched pair
```

rather than treating them as equivalent.

### C. Fix the learning-curve sizes

Remove:

```text
100k
```

from the empirical 60k-run plan.

Use actual cumulative dataset sizes.

### D. Add clustered/blocked evaluation

Explicitly prevent:

```text
same disruption
same tail
same date
```

from leaking across certain train/test boundaries.

### E. Add persistence baseline

Before XGBoost:

```text
naive operational persistence
```

Then prove ML adds value.

### F. Define marginal-value experiments as actual collection interventions

Don't treat:

```text
drop weather
```

as equivalent to:

```text
cost of collecting weather
```

Instead separately measure:

```text
feature contribution
```

and:

```text
collection marginal value
```

---

# Final assessment

So, yes:

## **V3.5 is now genuinely on the right path.**

The revisions weren't superficial. The design has evolved from:

```text
"How do we collect lots of airports?"
```

into the much more scientifically meaningful:

```text
"How do we spend a fixed observation budget
to obtain the information required to reconstruct
the aviation state that was knowable at prediction time?"
```

That is the right question.

And the research supports the core ingredients you're prioritizing:

**flight chains + temporal state + weather + network structure + leakage-safe snapshots + future evaluation + tree-model baselines + graph comparison.** Aeolus is particularly strong confirmation of that overall data architecture. ([NeurIPS Proceedings][1]) Aircraft-rotation studies reinforce your emphasis on tail continuity, while recent graph studies reinforce your decision not to assume a GNN will automatically beat boosted trees. ([arXiv][3])

The remaining work is **not "figure out the correct sampling strategy from scratch."** It is now about making the experimental claims statistically airtight.

### My recommended status would be:

```text
V3.5 architecture                    ✅ APPROVED
Collection philosophy                ✅ APPROVED
Leakage design                       ✅ APPROVED
Flight-chain strategy                ✅ APPROVED
Weather architecture                 ✅ APPROVED
Graph strategy                       ✅ APPROVED
XGBoost-first ladder                 ✅ APPROVED
Future/unseen/stress evaluation      ✅ APPROVED
1/p flight weighting                 ✅ RETIRED
Exact 1:2:1 allocation               🟡 EXPERIMENTAL
5-airport anchor pool                🟡 MEASURE FIRST
4h default                           🟢 GOOD DEFAULT
Window experiment                    🟡 USE CROSSOVER PREFERRED
Marginal-value framework             🟡 REFINE AS ABOVE
60k learning curve                  🔴 FIX 100k CLAIM
```

**I would therefore not rewrite V3.5.** I would produce a **V3.6 "pre-run lock"** consisting only of those six corrections, then freeze the collection schema and begin the coverage/anchor measurement. That would preserve everything good in V3.5 without letting another huge review introduce unnecessary redesign.

The especially encouraging part is that your collection design is now very close to the *data architecture* used by the strongest recent flight-delay benchmark work, while your budget-allocation problem is being treated as an empirical research question rather than falsely labeled as an industry standard. ([NeurIPS Proceedings][1])

[1]: https://proceedings.neurips.cc/paper_files/paper/2025/hash/586fbdff064d506f5af3e3db82681f84-Abstract-Datasets_and_Benchmarks_Track.html?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[2]: https://arxiv.org/abs/2512.08197?utm_source=chatgpt.com "Integrating Delay-Absorption Capability into Flight Departure Delay Prediction"
[3]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[4]: https://arxiv.org/abs/2502.04233?utm_source=chatgpt.com "Graph machine learning for flight delay prediction due to holding manouver"
[5]: https://www.mdpi.com/2076-3417/16/14/7110?utm_source=chatgpt.com "Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network"
[6]: https://aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
[7]: https://arxiv.org/abs/2507.09084?utm_source=chatgpt.com "Queue up for takeoff: a transferable deep learning framework for flight delay prediction"
[8]: https://doi.org/10.1145/3786484.3786539?utm_source=chatgpt.com "Calibrated and Explainable Flight Delay Prediction with Tree-Based Models in Machine Learning | Proceedings of the 2025 International Conference on Artificial Intelligence and Sustainable Development"
