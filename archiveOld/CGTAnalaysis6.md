I think **V3.6 is very close to a real pre-run lock**, but after reading the whole revision carefully, I would make **three changes before actually freezing the schema**.

The important thing is that these are no longer fundamental problems with your collection concept. They are mostly about making sure the evaluation and experimental claims match what your data and 31-day budget can actually identify.

I also checked the design against the newest relevant material I could verify, including the 2025 NeurIPS **Aeolus** benchmark, a July 2026 multi-horizon graph-delay paper, a 2026 aircraft-rotation study, and recent calibrated XGBoost flight-delay work. The overall direction of V3.6 is strongly aligned with the current literature. ([NeurIPS Proceedings][1])

# My verdict: V3.6 is ~95–97% ready

I would classify it like this:

| Component                               | Verdict                            |
| --------------------------------------- | ---------------------------------- |
| Measured AeroDataBox universe           | ✅                                  |
| Traffic × macro-region frame            | ✅                                  |
| Zero-yield retention                    | ✅                                  |
| Rotating cross-region anchors           | ✅                                  |
| 1 × 4h default                          | ✅                                  |
| Randomized time allocation              | ✅                                  |
| Airport-layer probability distinction   | ✅                                  |
| No automatic 1/p flight weighting       | ✅                                  |
| Aircraft-chain preservation             | ✅                                  |
| Weather architecture                    | ✅                                  |
| Leakage-safe snapshots                  | ✅                                  |
| T-24 / T-6 / T-90 evaluation            | ✅                                  |
| XGBoost baseline                        | ✅                                  |
| Persistence baseline                    | ✅                                  |
| Graph/GNN comparison                    | ✅                                  |
| Future-representative evaluation        | ✅                                  |
| Unseen-airport/region evaluation        | ✅                                  |
| Calibration/uncertainty                 | ✅                                  |
| Collection marginal-value concept       | ✅                                  |
| Crossover experiment                    | 🟢 Good, with caveats              |
| 31-day learning curve                   | 🟢 Good                            |
| **"Every tail stays in one partition"** | 🔴 Needs correction                |
| **31-day weekday × UTC "balance"**      | 🟡 Needs wording/design correction |
| **2×2h/6h experiment sample size**      | 🟡 Exploratory only                |

Those last three are the things I would fix.

---

# 1. The overall scientific architecture is now very good

The strongest confirmation comes from **Aeolus**, the NeurIPS 2025 flight-delay benchmark.

Aeolus explicitly combines:

* rich operational/meteorological/airport features,
* sequential flight-chain structure,
* flight-network relationships,
* temporal evaluation,
* and strict leakage prevention.

It was created specifically because flat flight tables fail to capture the spatiotemporal and relational structure of delay propagation. ([NeurIPS Proceedings][1])

That is essentially the architecture you have converged toward:

```text
                 flight events
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     airport        aircraft       route
       state         chain          state
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                  weather
                      ↓
              snapshot at T
                      ↓
                flight outcome
```

That is a good place to be.

Recent research reinforces the same direction. A July 2026 study used 2.88 million flights, 370 airports and 5,334 directed airport connections and evaluated graph-based multi-horizon forecasting alongside LSTM and XGBoost. Importantly, it concluded that graph models were useful but **not universal winners**, which supports your XGBoost → graph → GNN progression rather than assuming GNN superiority. ([DOI][2])

---

# 2. Your aircraft-chain emphasis is probably the most research-supported part

I would keep this exactly as a major collection priority.

The 2026 FlightSense study started with XGBoost and reported a large improvement after adding aircraft-rotation features, followed by an additional improvement from NOAA weather variables. ([arXiv][3])

Aeolus likewise explicitly includes a flight-chain module and a network graph incorporating shared aircraft and airport-resource relationships. ([OpenReview][4])

So your decision to measure:

```text
tail observations
consecutive-tail pairs
3-leg chains
4+ leg chains
chain completeness
```

is much more scientifically meaningful than simply maximizing:

```text
rows / credit
```

I strongly recommend keeping that.

---

# 3. The graph is now correctly becoming multi-relational

Your V3.6 graph taxonomy is much better than the earlier airport-only idea:

```text
STATIC
airport → airport route

DYNAMIC
airport congestion → airport

RESOURCE
capacity/operations

AIRCRAFT
flight A → flight B
same-tail relationship
```

That is consistent with recent network-delay research. CausalNet, for example, explicitly models dynamic inter-airport relationships rather than relying only on geographic distance or static traffic flow. ([arXiv][5])

And the 2022 spatiotemporal propagation work similarly treats spatial and temporal delay dependencies as distinct structures. ([arXiv][6])

So I would **not simplify the graph back down to airport → airport**.

---

# 4. Your airport probability correction is now correct

This part is finally clean:

```text
airport_layer_design_probability
```

means:

> probability of selecting that airport in the randomized airport-selection layer.

It does **not** mean:

> probability that a flight from that airport appears in the dataset.

And:

```text
sampling_weight = 1 / airport_layer_design_probability
```

is **not automatically assigned to flights**.

Keep this frozen.

There are too many downstream capture mechanisms between:

```text
airport selected
```

and:

```text
flight row exists
```

for the simple 1/p weight to be justified.

This was one of the most important revisions across V3.2 → V3.6.

---

# 5. There is, however, one serious evaluation problem in V3.6

## "All observations of a tail stay in one partition"

I would **change this.**

Your V3.6 says:

> ALL observations of a tail stay in one partition.

That is appropriate for your:

```text
Engine D — unseen-tail
```

experiment.

But it is **not appropriate for your primary future-deployment Engine A**.

Consider a tail:

```text
N123AB

June 1:
flight A
flight B

June 15:
flight C
```

At June 15, your deployed model is allowed to know what happened to that tail on June 1.

That historical information is exactly the kind of aircraft-chain state you intend to exploit.

If you force **every observation of N123AB** into one partition, you create an unrealistic evaluation:

```text
TRAIN
N123AB = never seen

TEST
N123AB
```

even though real deployment would normally involve:

```text
past N123AB observations → future N123AB prediction
```

### So you need two different rules.

### Engine A — future representative

Use:

```text
chronological / day-blocked
```

and allow a tail to appear in both train and future test **as long as information crosses the boundary only through legitimate historical features**.

The cutoff rule protects you:

```text
feature_timestamp <= prediction_cutoff
```

### Engine D — unseen-tail

Here you deliberately require:

```text
tail ∩ train = ∅
tail ∩ test ≠ ∅
```

That's the special generalization experiment.

So I would change V3.6's blanket rule:

> "ALL observations of a tail stay in one partition"

to:

> **"Tail blocking is mandatory for the unseen-tail engine; the future-representative engine uses chronological day/event blocking and permits previously observed tails, subject to strict cutoff-safe feature construction."**

That is a **very important correction**.

The same principle applies to aircraft type, airport and route.

Your evaluation engines should not all use identical grouping rules because they are answering different scientific questions.

---

# 6. Calendar-day blocking is good

This part I like.

Don't do:

```text
Monday 00:00–12:00 → train
Monday 12:00–24:00 → test
```

because operational conditions within the same day are highly dependent.

Instead:

```text
whole day → one partition
```

is sensible.

Likewise:

```text
entire disruption event → one partition
```

is sensible.

A hurricane or ATC disruption shouldn't have its beginning in training and peak in testing.

So I would keep:

```text
calendar_day blocking
disruption_event blocking
```

for the appropriate engines.

---

# 7. But don't require "clustered standard errors" for every predictive metric

V3.6 says:

> compute within-cluster means / clustered standard errors

This is a bit too generic.

For prediction evaluation, I would prefer:

```text
bootstrap by cluster
```

or:

```text
block bootstrap by day/event
```

when estimating uncertainty around MAE/RMSE/Brier/etc.

Why?

Your observations aren't IID:

```text
flight
flight
flight
```

from the same day are correlated.

So an ordinary IID confidence interval is inappropriate.

But saying:

```text
clustered SE
```

for every metric isn't automatically the correct solution either.

I'd specify:

> **Confidence intervals for predictive metrics are estimated using cluster/block bootstrap at the relevant experimental unit (calendar day, disruption event, or other predefined group).**

That's cleaner.

---

# 8. The weekday × UTC balancing idea is good, but you cannot literally "balance" all 42 cells with 31 days

This is another concrete issue.

You have:

```text
7 weekdays × 6 UTC blocks = 42 cells
```

but your run has:

```text
31 days
```

and therefore only:

```text
31 window starts
```

You cannot have every `(weekday, UTC block)` cell represented even once.

So the wording:

> "balanced at the weekday × UTC block level over the whole run"

is technically too strong.

You should call it:

> **constrained randomized allocation minimizing imbalance across weekday × UTC-block cells.**

That's what you can actually do.

For example, with 31 observations across 42 possible cells, the schedule can minimize:

[
\text{imbalance}=
\sum_{c}(n_c-\bar n)^2
]

rather than claiming equal representation.

### Even better

Make the scheduler optimize:

```text
weekday × UTC block
+
macro-region
+
local-time bin
```

but don't demand perfect balance.

Call it:

**"run-level constrained randomization."**

That's statistically honest and operationally achievable.

---

# 9. Your 1×4h default is still reasonable

I would keep it.

The reason is not:

> "4 hours is the scientifically correct aviation window."

There isn't evidence for that exact universal rule.

The reason is your measured/operational objective:

```text
4h continuous
→ preserves within-window tail continuity
→ captures arrival → turnaround → departure relationships
```

while randomized start times give broader temporal coverage.

That is a **reasonable experimental default**.

And your upcoming crossover makes the choice empirically testable.

---

# 10. The crossover experiment is now much better, but call it a crossover experiment—not a perfect controlled experiment

I like the change:

```text
preferred = randomized crossover
fallback = matched pair
```

That's an improvement.

But even crossover doesn't completely remove aviation day effects.

For example:

```text
Period 1:
weather = normal

Period 2:
thunderstorm

```

will still affect operations.

So the correct claim is:

> **randomized crossover reduces confounding from stable/block-level characteristics and permits within-block treatment contrasts; it does not make the operating environment identical.**

Your current wording is close to this.

Don't say:

> "only window shape differs."

That was the problem you already corrected.

---

# 11. Your 6h experiment is now conceptually correct

I agree with the reframing:

> "Under a fixed 1,900-credit budget, which window regime maximizes predictive information?"

That's a much better question.

Because:

```text
6h requested
3.4h actual
1900 credits exhausted
```

isn't a failed experiment.

It's valuable information:

> The 6-hour allocation regime consumed the available budget before completing six hours.

That's part of the treatment.

---

# 12. But your experiment sample is too small for strong statistical conclusions

This is something I would explicitly add.

You have approximately:

```text
3 × 2×2h
2 × 6h
```

experiments.

That's **tiny**.

You can use them to answer:

> "Did we see enough evidence to justify changing the default?"

But you shouldn't claim:

> "We statistically established that 4h is superior to 2×2h."

Not from 3 crossover blocks.

I'd label the first month:

```text
pilot experiment
```

and use the results to decide whether Month 2 should perform a larger controlled window study.

That's particularly important if this becomes a thesis/paper.

---

# 13. The 60k learning curve is now realistic

Good correction.

Your:

```text
2k
5k
10k
20k
30k
40k
50k
58k
```

is much more defensible than 100k.

But one subtle issue remains:

You shouldn't assume:

```text
row count ≈ dataset information
```

which you already know.

So your learning curve should ideally have:

```text
cumulative credits
```

and:

```text
cumulative unique flights
```

alongside it.

For example:

| Credits | Unique flights | Tails | Chains | Engine-A MAE |
| ------: | -------------: | ----: | -----: | -----------: |
|      2k |            ... |   ... |    ... |          ... |
|      5k |            ... |   ... |    ... |          ... |
|     10k |            ... |   ... |    ... |          ... |
|     20k |            ... |   ... |    ... |          ... |

Then you're measuring both:

[
\text{performance vs data volume}
]

and:

[
\text{performance vs spending}.
]

That's more useful.

---

# 14. Your Model −1 persistence baseline is an excellent addition

Keep it.

Your ladder now starts:

```text
-1 persistence
0 calendar
1 XGBoost
2 XGBoost + weather
3 + static network
4 + temporal graph
5 + aircraft chain
6 + disruption
7 + uncertainty
```

This is much more rigorous.

Recent calibrated tree-based flight-delay research also found XGBoost to be a strong baseline and explicitly evaluated probability quality using Brier score, not merely AUC/F1. ([DOI][7])

### One wording change, though

You say:

> "Model −1 must be beaten by Model 1 before richer features matter."

I would change that to:

> **"Model 1 must beat Model −1 on the primary future-representative deployment test before the project treats added model complexity as justified for general deployment."**

Why?

A richer model could legitimately underperform persistence on ordinary days but provide substantially better performance during disruptions.

Your Engine E exists precisely to discover that.

So don't discard a model solely because it doesn't beat persistence everywhere.

---

# 15. Your T-24 / T-6 / T-90 design is now appropriately flexible

I like the change from:

```text
three separate models
```

to:

```text
three evaluation horizons
+
compare:
    separate models
    vs
    shared model conditioned on horizon_hours
```

That's the right experiment.

You can have:

[
f(X,T)
]

where:

```text
T = 24h
T = 6h
T = 1.5h
```

and the model learns shared aviation structure.

Then compare against:

[
f_{24}(X), f_6(X), f_{90}(X)
]

as separate models.

Do not decide this in advance.

---

# 16. The weather architecture remains correct

Your current wording is much better:

> no AeroDataBox credit cost, but retrieval/storage/archive are separate engineering constraints.

The current AviationWeather.gov API documentation confirms worldwide METAR and TAF availability but says the weather database supports queries going back only **up to the previous 15 days** through that API; it recommends cache files for larger current datasets. ([Aviation Weather Center][8])

So your architecture:

```text
live METAR/TAF
+
archived data
+
GFS/ERA5
```

is sensible.

And your requirement:

```text
weather source
weather timestamp
issue time
valid time
```

is essential for leakage safety.

---

# 17. One thing I would add to the weather schema

You already have:

```text
source
```

I would also store:

```text
retrieval_time
issue_time
valid_from
valid_to
observation_time
```

and distinguish:

```text
observed weather
```

from:

```text
forecast weather
```

very explicitly.

Because the model at:

```text
T-24h
```

may legitimately use:

```text
TAF issued at T-25h
```

but must not accidentally use:

```text
TAF issued at T-2h
```

That's a very common form of hidden leakage.

---

# 18. Your anchor formula is acceptable—but lock the scaling before probing

You now have:

```text
40% traffic
20% geographic/network diversity
20% carrier/international diversity
20% observed yield
```

That's fine **as an R&D allocation formula**, but there's one thing I'd add.

Before computing:

```text
anchor_score
```

you need to normalize all four components onto comparable scales.

For example:

```text
traffic_score ∈ [0,1]
geo_score ∈ [0,1]
carrier_score ∈ [0,1]
yield_score ∈ [0,1]
```

Otherwise:

```text
20% × raw_yield
```

could numerically overwhelm:

```text
40% × traffic
```

depending on units.

Also freeze the formula **before seeing the probe outcome**.

Your document says you are doing this already; make the code enforce it.

---

# 19. Your primary strata correction is good

This:

```text
traffic tier × macro-region
```

with:

```text
degree
international share
carrier diversity
timezone
```

as balancing variables is better than creating hundreds of tiny crossed strata.

Keep it.

One consistency issue remains in your document: Section 6 uses **macro-region**, while the checklist and some later passages still say:

```text
traffic × continent × degree × intl/domestic × carrier × timezone
```

Those descriptions should be brought into exact agreement.

Use one official definition:

```text
Primary strata:
traffic tier × macro-region

Balancing variables:
network degree
international share
carrier diversity
time zone
```

---

# 20. Your zero-yield correction is good

This:

```text
once
repeated
persistent
```

is better than immediately doing:

```text
zero yield → m *= 0.75
```

A single empty airport observation tells you almost nothing.

I would keep the new rule.

---

# 21. Your "coverage age" idea is still one of the most valuable ideas in the entire project

This is something I wouldn't change.

Instead of asking:

> "Did we collect Airport X?"

you ask:

> "How old is the best state information we have about Airport X at prediction time?"

That creates a continuous variable:

[
\Delta t_{\text{state}}
=======================

## T_{\text{prediction}}

T_{\text{last reliable observation}}
]

and lets you measure:

[
error(\Delta t)
]

directly.

That can tell you whether:

```text
6-hour-old airport state
```

is actually usable, or whether you need:

```text
1-hour-old state
```

for meaningful prediction.

That is much more scientifically interesting than simply declaring:

> "Every airport needs daily coverage."

---

# 22. Your biggest conceptual contribution is now becoming clearer

At this stage, I don't think the strongest research question is:

> "Can a GNN predict flight delays?"

There are already many papers doing that.

The more interesting question is:

> **Given a fixed data-acquisition budget, how should aviation observations be allocated across airport breadth, temporal recency, aircraft-chain continuity, network structure and disruption coverage to maximize future predictive performance?**

That is much more interesting.

Your:

```text
info per credit
```

becomes the operational diagnostic.

Your:

```text
ΔModel / ΔCredits
```

becomes the scientific quantity.

And your 60k budget becomes an actual experimental constraint instead of merely a limitation.

That is a strong research framing.

---

# 23. One thing I would NOT claim yet: "probability-aware sample"

Be slightly careful with this phrase.

You do have a genuinely randomized airport-selection layer for REGIONAL.

But your entire flight dataset is **not necessarily a probability sample** in the survey-sampling sense, because:

```text
airport selection
×
window assignment
×
feed behavior
×
flight existence
×
capture mechanism
×
deduplication
×
API success
```

are all involved.

Your V3.5 already recognizes this.

So I would use:

> **"budget-constrained, partially randomized sample of the AeroDataBox-supported aviation universe"**

or:

> **"sampling-aware collection from the AeroDataBox-supported aviation universe."**

That's more precise than implying the entire flight population has known inclusion probabilities.

---

# 24. I would change your "research-aligned" statement slightly

Right now you say the exact method is research-aligned.

I'd make the distinction:

```text
Literature-supported:
✓ temporal structure
✓ weather
✓ aircraft chains
✓ network relationships
✓ leakage prevention
✓ chronological evaluation
✓ multi-horizon prediction
✓ uncertainty
✓ tree/GNN comparison

Our experimental contribution:
✓ 1,900 credits/day
✓ 1×4h window
✓ 1:2:1 tier allocation
✓ 5-airport anchor pool
✓ regional yield adaptation
✓ crossover allocation
✓ information/credit optimization
```

That distinction is scientifically important.

The literature supports the **components**, not your exact airport allocation.

---

# 25. Where the literature currently lands relative to V3.6

The recent evidence is quite supportive.

**Aeolus** explicitly supports the importance of flight chains, meteorology, airport-level structure, network relationships, temporal splits and leakage prevention. ([NeurIPS Proceedings][1])

**CausalNet** supports dynamic inter-airport relationships instead of treating airports as independent entities. ([arXiv][5])

The July 2026 multi-horizon graph study is especially useful for your project because it compares graph models against XGBoost and LSTM and concludes that graph models are useful for network-aware monitoring but are not universally superior point predictors. ([DOI][2])

**FlightSense** supports the specific importance of aircraft rotation and weather features. ([arXiv][3])

And recent calibrated tree-model work supports your decision to evaluate probability quality, not just classification discrimination. ([DOI][7])

So the current research does **not** tell you that your exact sampling allocation is optimal. But it strongly supports the information types you're trying to preserve.

---

# 26. What I would lock—and what I would change

### LOCK THESE

```text
1 × 4h default
cross-region rotating anchors
measured supported universe
traffic × macro-region frame
zero-yield retention
normalized REGIONAL randomization
airport-layer probability only
NO automatic 1/p flight weights
aircraft-chain preservation
weather architecture
T-24/T-6/T-90
leakage cutoff
Model -1 persistence
XGBoost baseline
graph/GNN ladder
future representative test
unseen airport
unseen region
unseen tail
disruption stress
calibration
coverage age
information-per-credit
collection marginal-value experiments
```

### CHANGE THESE THREE THINGS

**1. Tail blocking must be engine-specific.**

```text
Engine A:
chronological + day/event blocked
tails may appear in train and later test

Engine D:
unseen-tail blocked
tail cannot appear in train
```

This is the most important change.

**2. Replace "weekday × UTC balanced" with "constrained randomized allocation."**

31 days cannot balance 42 weekday×UTC cells perfectly.

**3. Treat the 2×2h/6h results as pilot evidence.**

Three 2×2h and two 6h observations cannot establish a definitive winner. Use them to decide whether a Month-2 controlled experiment is warranted.

---

# 27. My final status for V3.6

I would now call it:

> **PRE-RUN APPROVED WITH THREE LOCKED CLARIFICATIONS**

rather than another full redesign.

The architecture has reached the point where continuing to make large structural revisions would probably be counterproductive.

The next scientifically useful step is actually to **measure the things the document itself says are unknown**:

```text
universeCount
catalogInUniverse
anchor yields
actual airport costs
actual regional yield distribution
coverage ages
tail-chain density
```

Then the empirical data—not another round of theoretical optimization—should determine whether the `{HUB:1, MID:2, REGIONAL:1}` allocation is worth keeping.

And there is one particularly important distinction I would put directly into the final spec:

> **Engine A asks, "How well will this model work tomorrow on flights resembling the deployment population?"**
>
> **Engine D asks, "Can the model generalize to a tail it has never seen?"**
>
> Those are different questions, so they require different partition rules.

Once that distinction is made, **I would consider the V3.6 collection architecture ready to freeze.**

The current literature gives you good reason to proceed with the core information architecture, especially the combination of temporal state, weather, aircraft rotation and network structure. ([NeurIPS Proceedings][1]) The remaining questions—how many airports, which anchors, how much recency, and how many credits should go to each—are exactly the things your first empirical run should measure rather than assume.

[1]: https://proceedings.neurips.cc/paper_files/paper/2025/hash/586fbdff064d506f5af3e3db82681f84-Abstract-Datasets_and_Benchmarks_Track.html?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[2]: https://doi.org/10.3390/app16147110?utm_source=chatgpt.com "Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network"
[3]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[4]: https://openreview.net/forum?id=BIlSrNHdki&utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset | OpenReview"
[5]: https://arxiv.org/abs/2407.15185?utm_source=chatgpt.com "A Spatio-Temporal Approach with Self-Corrective Causal Inference for Flight Delay Prediction"
[6]: https://arxiv.org/abs/2207.06959?utm_source=chatgpt.com "Spatiotemporal Propagation Learning for Network-Wide Flight Delay Prediction"
[7]: https://doi.org/10.1145/3786484.3786539?utm_source=chatgpt.com "Calibrated and Explainable Flight Delay Prediction with Tree-Based Models in Machine Learning | Proceedings of the 2025 International Conference on Artificial Intelligence and Sustainable Development"
[8]: https://aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
