Yes. I reviewed the V3.4 design against recent flight-delay research, including the **NeurIPS 2025 Aeolus benchmark**, 2024–2026 graph/spatiotemporal flight-delay studies, recent aircraft-rotation work, tree-model studies, and the current NOAA aviation-weather data infrastructure.

My overall assessment is:

> **V3.4 is fundamentally sound, and most of its important ML/data-engineering principles are strongly supported by recent aviation research.**
>
> However, I would **not call the exact airport-allocation scheme “standard aviation data collection practice.”** The research supports the *principles* behind it; the exact `{HUB:1, MID:2, REGIONAL:1}`, 1,900-credit cap, five-airport rotation, and 4-hour schedule are your **budget-constrained experimental design**.
>
> There are also **four important things I would change before spending the 60,000 credits**.

## 1. The strongest confirmation: Aeolus is remarkably close to what you are building

The most important paper for your project is **Aeolus: A Multi-structural Flight Delay Dataset**, published in the NeurIPS 2025 Datasets and Benchmarks Track.

Aeolus was specifically designed because ordinary flat flight tables fail to represent the **spatiotemporal and relational structure** of aviation. Its dataset combines:

* flight/tabular information,
* meteorological information,
* airport-level information,
* sequential **flight-chain relationships**,
* and a **flight-network graph** involving aircraft, crew, and airport-resource connections.

It also explicitly uses **temporal splits and leakage prevention**. ([NeurIPS Papers][1])

That is extremely relevant to your architecture.

Your V3.4:

```text
flight_events
      ↓
flight_snapshots
      ↓
flight_outcomes

+ weather
+ aircraft/tail chain
+ airport/network state
+ graph representation
```

is conceptually much closer to the current research direction than simply collecting a gigantic flat CSV.

So the agent was right about one of its biggest conclusions:

**You should optimize for the information required to reconstruct aviation state at prediction time, rather than simply maximizing the number of airport rows.**

---

# 2. Airport + aircraft-chain + network information is absolutely the right direction

This is particularly well supported by recent research.

A 2026 paper, **DS-MGCSTNet**, explicitly argues that flight-delay prediction needs more than simple geographic relationships between airports. It combines multiple static graphs, a dynamic graph, temporal information, and weather to model delay propagation. Its experiments use 50 U.S. airports over a decade. ([ScienceDirect][2])

Another 2024 paper, **CausalNet**, models inter-airport delay relationships dynamically rather than assuming that simple distance or traffic-flow relationships are sufficient. ([arXiv][3])

And a 2025 graph-ML study comparing graph neural networks with tree models found that **CatBoost with graph-derived features actually outperformed GAT** for its imbalanced flight-holding prediction problem. ([arXiv][4])

That supports a very important part of your V3.4 philosophy:

```text
XGBoost/CatBoost
      ↓
+ historical/rolling features
      ↓
+ aircraft rotation
      ↓
+ network/graph features
      ↓
GNN
```

rather than:

```text
collect data → immediately use GNN → assume GNN wins
```

That latter assumption is not justified.

The recent literature actually gives evidence that **a strong tree model with good aviation/network features can be extremely competitive with or outperform a GNN in some tasks.** ([arXiv][4])

So your XGBoost-first ladder is one of the strongest parts of V3.4.

---

# 3. The aircraft-tail/rotation emphasis is especially well justified

This is one area where your collection strategy is very good.

A May 2026 study, **FlightSense**, built a flight-delay prediction system that started with an XGBoost schedule-based model and then added aircraft-rotation propagation features. The reported AUC increased from 0.732 to 0.875 after adding rotation-chain features, followed by a weather layer reaching 0.879. ([arXiv][5])

A December 2025 study similarly modeled **delay absorption** along aircraft rotations. It used a CatBoost model to estimate whether an upstream delay would be absorbed and then fed that information into an XGBoost downstream-delay model. ([arXiv][6])

That is almost a direct validation of your concern about:

> "Don't just collect airports; preserve the aircraft chain."

Your V3.4 emphasis on:

```text
arrival → turnaround → departure
```

and measuring:

```text
tail-chain links / credit
```

is therefore much more scientifically defensible than simply optimizing:

```text
rows / credit
```

That change is excellent.

---

# 4. Weather should absolutely be part of the architecture

The agent was correct to add weather, but I would slightly modify how you implement it.

Recent research repeatedly incorporates weather into flight-delay prediction. The 2024 Temporal Fusion Transformer study, for example, used airport demand/capacity, historic airport operations, wind/visibility, and en-route weather. ([arXiv][7])

The 2025 tree-model/network study also explicitly incorporated flight and weather data with network-centrality features. ([Georgia Southern University][8])

And FlightSense's 2026 results also found an additional improvement after adding NOAA meteorological variables. ([arXiv][5])

So:

**weather = yes.**

But there's a subtle problem with your V3.4 wording.

You wrote:

> "Weather is free — we just have to architect it."

The *data itself* may be free, but historical availability and synchronization are not automatically trivial.

AviationWeather.gov currently provides worldwide METAR and TAF data through its API, but its normal API database exposes only about the preceding 15 days; older historical data requires other archive resources. ([Aviation Weather Center][9])

NOAA's GFS provides extensive historical analysis/forecast data, including records going back many years depending on product/resolution. ([NCEI][10])

So I would change the plan to:

```text
weather architecture = mandatory now
weather backfill = verify coverage before relying on it
```

rather than assuming the complete historical METAR/TAF archive will automatically be available for every airport.

---

# 5. Your leakage strategy is correct — and this is probably more important than GNN vs XGBoost

This part of V3.4 is very strong.

The key rule:

```text
feature_timestamp <= prediction_cutoff
```

is exactly what you need.

Aeolus explicitly emphasizes strict leakage prevention and temporal evaluation. ([arXiv][11])

Your three prediction horizons are also sensible:

```text
T-24h
T-6h
T-90m
```

because the information set available at those times is fundamentally different.

For example:

### T-24h

You could know:

```text
schedule
carrier
route
aircraft type if available
historical delay
airport congestion history
weather forecast available at T-24
```

but you cannot know:

```text
actual inbound aircraft delay at T-3h
```

### T-90m

Now you can potentially know:

```text
current aircraft
inbound flight
recent airport state
METAR
operational status
```

That makes your idea of separate horizon models scientifically much more defensible than throwing all PRE and POST rows into one model.

---

# 6. One correction: your "right-censored" terminology should stay careful

Your agent already corrected this, and I agree.

This:

> "44% have runway time; the rest are right-censored."

is too aggressive.

A missing runway timestamp could mean:

```text
still active
cancelled
diverted
data collection ended
event missing
feed failure
```

Those are different states.

Your newer:

```text
observed
active_censored
canceled
diverted
missing_outcome
```

classification is much better.

In particular:

> **Never convert an unresolved flight into delay = 0.**

That would create a serious label problem.

---

# 7. Where I disagree slightly with V3.4: the airport sampling probability is not enough

This is the biggest statistical issue I would add.

Your V3.4 correctly says:

> deterministic rotation ≠ probability.

Excellent.

And you correctly normalize:

```text
p_i = score_i / Σ score
```

for the REGIONAL sample.

Also excellent.

But there is another layer:

### Airport selection probability ≠ flight inclusion probability.

Suppose:

```text
Airport A
p(A) = 0.10
```

You subscribe to Airport A.

That does **not** automatically mean every flight departing A has:

```text
P(flight captured) = 0.10
```

because flight capture depends on things like:

```text
airport subscription
feed availability
flight schedule
window timing
API behavior
flight activity
notification generation
window censoring
```

For example:

```text
P(flight captured)
=
P(airport selected)
×
P(flight exists during window | airport)
×
P(feed emits it | flight)
×
P(window intersects relevant event | flight)
```

Therefore, I would **not use your `airport_design_probability` as a flight-level inverse-probability weight**.

It is useful metadata.

But:

> `1 / airport_design_probability`

should **not automatically become the weight of every flight row**.

This is an important distinction that I would add to V3.4.

The Aeolus-style approach is more directly aligned with building a rich temporal/relational dataset and evaluating realistic future observations than trying to force classical survey weights onto a complex event stream. ([NeurIPS Papers][1])

---

# 8. Your 5-airport rotating anchor pool is reasonable — but it is an experimental choice

This:

```text
KLAX
EGLL
WSSS
SBGR
OMDB
```

is not something the papers establish as a scientifically optimal set.

Nor is:

```text
one anchor/day
```

a published aviation-data-collection standard.

Your agent actually correctly acknowledges this later.

The literature supports **network diversity, connectivity, temporal coverage and airport heterogeneity**, but not this exact allocation.

For example, recent research has used:

* 30 major U.S. airports,
* 50 U.S. airports,
* 74 Chinese airports,
* millions of flights across broad datasets. ([arXiv][7])

So I would phrase your design as:

> **budget-constrained panel-plus-rotation sampling designed to preserve temporal continuity while maintaining geographic and operational coverage.**

That is defensible.

Don't phrase it as:

> "the standard way aviation datasets should be collected."

---

# 9. The 1 × 4-hour window is reasonable, but the rotation does not automatically make the data representative

This part needs a little caution.

Your schedule:

```text
00
04
08
12
16
20
repeat
```

is useful for spreading observations over the day.

But it creates a deterministic pattern.

For instance, over 30 days:

```text
Monday → potentially certain UTC bands
Tuesday → another band
...
```

Depending on the exact calendar alignment, weekday and UTC time can become correlated.

Therefore I would introduce one additional variable:

```text
time_window_schedule_seed
```

and, ideally, use a **pre-specified randomized permutation of the six time blocks**, rather than always cycling strictly:

```text
00 → 04 → 08 → 12 → 16 → 20
```

You can still ensure every block receives approximately equal exposure.

This is statistically cleaner because:

```text
balanced + randomized
```

is preferable to:

```text
balanced + deterministic
```

when you are trying to make comparative claims.

Your own V3.4 correctly recognized this issue for airport selection; I would apply the same philosophy to time windows.

---

# 10. Your controlled 4h vs 2×2h vs 6h experiment is good

I agree strongly with this correction.

The original idea:

```text
80% 4h
10% 2×2h
10% 6h
```

would **not** by itself establish that the window type caused the difference.

Because:

```text
airport
time
weekday
weather
traffic
disruption
window
```

would all vary simultaneously.

Your revised paired design is much better:

```text
Template:
Airport A/B/C
08:00–12:00
Tuesday
4h

Experiment:
same airport set
same time band
same weekday class
2×2h
```

That gives you something much closer to a controlled comparison.

And I particularly agree with:

```text
requested_window_hours
actual_window_hours
stop_reason
```

because:

```text
requested = 6
actual = 3.4
stop = budget_reached
```

should never be reported as a 6-hour observation.

That's good experimental bookkeeping.

---

# 11. Your evaluation design is better than what many flight-delay projects actually do

This is another major strength.

Most weak aviation ML projects do:

```text
random train/test split
```

and then report:

```text
accuracy = 95%
```

That can be extremely misleading for temporal aviation data.

Aeolus specifically emphasizes temporal splits and leakage prevention. ([NeurIPS Papers][1])

Your evaluation:

```text
future time
+
unseen airport
+
unseen region
+
unseen tail
+
unseen aircraft type
```

is considerably more informative.

And the recent U.S. multi-horizon graph study found that graph models can provide strong network-aware forecasting without necessarily dominating simpler models across every point-forecast setting. ([DOI][12])

That's exactly why your experiment should ask:

> **What does the graph add beyond XGBoost?**

rather than:

> "Can we make a GNN?"

---

# 12. I would add one evaluation you don't currently emphasize enough: "ordinary representative test"

This is important.

You currently emphasize:

```text
unseen airports
unseen regions
unseen tails
```

Those are excellent **stress/generalization tests**.

But they should not replace a standard deployment-like test set.

You should have:

### Test A — Future representative

```text
future dates
same population
same normal operating regime
```

This answers:

> How will the deployed model perform on the next month?

### Test B — Unseen airport

Answers:

> Can it generalize to airports it never trained on?

### Test C — Unseen region

Answers:

> Can it transfer geographically?

### Test D — Unseen tail / aircraft

Answers:

> Does it learn general operational structure rather than memorizing individual aircraft?

### Test E — Disruption/event

Answers:

> Does it work during abnormal operations?

Those questions are different and should not be merged.

---

# 13. Your "worldwide" goal needs one very important correction

Your agent already recognized this, and I strongly agree.

You cannot truthfully say:

> "We collected all airports in the world."

Even if your frame contains thousands of airports.

You have:

```text
AeroDataBox-supported universe
```

not:

```text
Earth's complete aviation universe
```

That distinction matters.

Your scientifically defensible wording is:

> **"A probability-aware, budget-constrained sample of the AeroDataBox-supported aviation universe."**

That's excellent wording.

And I would go one step further:

### Separate three concepts

```text
GLOBAL FRAME
        ↓
AeroDataBox-supported airports

DIRECT OBSERVATION
        ↓
airports actively subscribed

NETWORK DISCOVERY
        ↓
airports appearing through captured flight edges
```

That is much more powerful than pretending every airport must receive equal subscription time.

Aeolus itself shows why network/chain representations are important: relationships can expose structure beyond a simple list of independently observed airports. ([NeurIPS Papers][1])

---

# 14. One thing I would change substantially: don't optimize only around airports

This is the biggest conceptual improvement I would make.

Your current architecture is largely:

```text
choose airport
    ↓
collect flights
    ↓
build network
```

I would think about it as:

```text
                 FLIGHT EVENTS
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
     AIRPORT         TAIL          ROUTE
       │              │              │
       └──────────────┼──────────────┘
                      ↓
                NETWORK STATE
                      │
              WEATHER STATE
                      │
                      ↓
             SNAPSHOT AT T
                      │
                      ↓
                  OUTCOME
```

Why?

Because the ultimate unit of prediction is:

> **a flight at a particular prediction time**

not an airport.

The airport is one mechanism for obtaining information about that flight.

That distinction will help enormously when designing the final dataset.

---

# 15. The 1,900-credit budget strategy is sensible, but don't assume your 45/35/10 allocation is optimal

Your:

```text
45–55% core
30–40% rotating
5–10% long tail
```

is reasonable as a **starting experiment**.

But no paper I found establishes those percentages as the correct allocation.

The correct scientific statement is:

> "We initialize the allocation according to a budget-constrained experimental design and optimize it using measured information-per-credit and prediction-performance gains."

That is much stronger.

In fact, I would eventually estimate:

```text
marginal predictive value / credit
```

for:

```text
+1 persistent hub
+1 mid airport
+1 regional airport
+1 additional observation of existing hub
+1 additional tail-chain observation
+1 additional weather observation
```

That could become one of the genuinely interesting contributions of your project.

---

# 16. Your information-per-credit idea is excellent

I would actually expand it.

Don't just calculate:

```text
new_information / credit
```

Calculate:

[
\text{Information Efficiency}
=============================

\frac{\text{useful prediction information gained}}{\text{credits consumed}}
]

Operationally track:

```text
unique flights / credit
unique tails / credit
new tails / credit
new route pairs / credit
tail-chain links / credit
new airports / credit
pre-departure snapshots / credit
observed outcomes / credit
rare disruptions / credit
```

Then ultimately:

```text
Δ model performance / Δ credits
```

That last one is the most important.

For example:

```text
Extra 300 credits
       ↓
+17 new airports
+400 flights
+2 tails
       ↓
XGBoost MAE: 18.3 → 18.1
```

versus:

```text
Extra 300 credits
       ↓
+3 airports
+5000 flights
+240 tails
       ↓
MAE: 18.3 → 16.9
```

Now you know where your money should go.

---

# 17. There is one more improvement I would make to the "staleness" concept

Your:

```text
days_since_last_obs
```

feature is good.

But don't limit this to days.

For flight prediction, use:

```text
hours_since_airport_state
hours_since_route_state
hours_since_tail_state
hours_since_network_state
hours_since_weather_observation
```

because:

```text
airport state from 2 hours ago
```

and:

```text
airport state from 47 hours ago
```

are qualitatively different.

Then calculate:

```text
MAE vs state age
AUC vs state age
calibration vs state age
```

This directly answers:

> "How much recency do we actually need?"

That's a much more valuable answer than simply deciding that every airport must be sampled every day.

---

# 18. Your GNN graph also needs to distinguish *structural* and *dynamic* edges

Recent graph-delay research strongly supports this.

DS-MGCSTNet explicitly distinguishes multiple static relationships and a dynamic graph. ([ScienceDirect][2])

For your project, I would therefore avoid treating the graph simply as:

```text
Airport A → Airport B
```

Instead consider:

```text
STATIC
airport geographic relation
scheduled route relation
carrier relation

DYNAMIC
recent flight flow
recent delay propagation
current congestion
current tail chain

RESOURCE
shared aircraft
shared airport
possibly carrier/operational relationships
```

That will make your eventual GNN much more meaningful.

---

# 19. Your current research evidence strongly supports a hybrid model ladder

I would define the final experiment as:

### Model 0 — naive operational baseline

```text
historical airport/route averages
```

### Model 1 — XGBoost

```text
schedule
route
airport
carrier
aircraft
time
```

### Model 2 — XGBoost + rolling operations

```text
airport delay state
route delay state
congestion
```

### Model 3 — XGBoost + aircraft rotation

```text
inbound delay
tail chain
turnaround
delay absorption
```

### Model 4 — XGBoost + network features

```text
centrality
graph congestion
network propagation
```

### Model 5 — XGBoost + weather

```text
METAR
TAF
GFS
```

### Model 6 — GNN

```text
same information
graph representation
```

### Model 7 — possibly temporal GNN / transformer

```text
graph + temporal state
```

Then the scientific question becomes:

> **How much predictive value is added at each layer?**

This is much stronger than publishing:

> "We created a GNN and achieved 94% accuracy."

---

# 20. One thing I would *not* do: oversample disasters and then evaluate on that same distribution

Your event-sampling idea is useful:

```text
sampling_strategy = event
```

But you correctly need to prevent it from contaminating ordinary evaluation.

Suppose normal operations are:

```text
95% ordinary
5% severe disruption
```

and you deliberately collect:

```text
50% disruption events
```

That is useful for learning rare phenomena.

But your final traveler alert evaluation should still contain an appropriately representative future distribution.

Otherwise you could get:

```text
great performance on disruption-heavy test
```

while producing misleading probabilities during normal operations.

So I recommend:

```text
TRAIN
normal + controlled event enrichment

VALIDATION
representative

TEST
representative future distribution

STRESS TEST
disruption-enriched
```

---

# 21. Calibration is absolutely worth keeping

Your V3.4 addition of:

```text
P(delay >15)
P(delay >60)
confidence interval
```

is very good.

A recent 2025 flight-delay study explicitly evaluated probabilistic calibration using Brier score alongside discrimination and explainability. ([DOI][13])

For a traveler product, this matters enormously.

A model saying:

```text
82% chance of >60 minute delay
```

should actually be right roughly 82% of the time among similarly scored flights.

That's more useful than simply saying:

```text
AUC = 0.91
```

---

# 22. My verdict on each major V3.4 component

| V3.4 component                           | Research support                       | My assessment                                |
| ---------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Measured supported-universe frame        | Strong principle                       | ✅ Keep                                       |
| Stratifying airports                     | Strong                                 | ✅ Keep                                       |
| Cross-region coverage                    | Strong for generalization              | ✅ Keep                                       |
| Continuous temporal collection           | Strong                                 | ✅ Keep                                       |
| Airport/route/network relationships      | Very strong                            | ✅ Keep                                       |
| Aircraft-tail chains                     | Very strong recent evidence            | ✅ Keep                                       |
| Weather                                  | Very strong                            | ✅ Keep                                       |
| Leakage-safe snapshots                   | Essential                              | ✅ Keep                                       |
| T-24/T-6/T-90                            | Strong methodological design           | ✅ Keep                                       |
| XGBoost baseline                         | Strong                                 | ✅ Keep                                       |
| GNN comparison                           | Strong research motivation             | ✅ Keep                                       |
| Temporal/unseen evaluation               | Strong                                 | ✅ Keep                                       |
| Unseen-tail evaluation                   | Good research extension                | ✅ Keep                                       |
| Calibration                              | Strong product justification           | ✅ Keep                                       |
| Coverage-age                             | Very sensible                          | ✅ Keep                                       |
| Information/credit dashboard             | Excellent experimental idea            | ✅ Keep                                       |
| 1×4h default                             | Reasonable                             | 🟢 Test empirically                          |
| 00/04/08/12/16/20 deterministic rotation | Reasonable but not inherently unbiased | 🟡 Improve with randomized balanced schedule |
| 5-airport anchor pool                    | Reasonable                             | 🟡 Experimental, not standard                |
| `{1 HUB, 2 MID, 1 REGIONAL}`             | Reasonable                             | 🟡 Experimental                              |
| 45–55% core                              | Reasonable                             | 🟡 Experimental                              |
| REGIONAL normalized probability          | Statistically much better              | ✅ Keep                                       |
| `1/p` flight weighting                   | Not automatically valid                | 🔴 Change                                    |
| Zero-yield stays in frame                | Correct                                | ✅ Keep                                       |
| Paired window experiment                 | Strong                                 | ✅ Keep                                       |
| 80/10/10 exact shares                    | Not research-established               | 🟡 Treat as allocation plan                  |
| 30-day dataset = seasonality             | Wrong                                  | ❌ Don't claim                                |
| "worldwide airports"                     | Too strong                             | ❌ Don't claim                                |

---

# 23. The four changes I would make to V3.4 before the run

### Change 1 — Separate airport probabilities from flight probabilities

This is the biggest one.

Keep:

```text
airport_design_probability
```

but define it explicitly as:

> probability of selecting the airport within the randomized airport-selection layer.

Do **not** automatically make:

```text
sampling_weight = 1 / airport_design_probability
```

for individual flights.

Your flight/event inclusion process has additional mechanisms.

---

### Change 2 — Randomize the time-block order while maintaining balance

Instead of permanently:

```text
00 → 04 → 08 → 12 → 16 → 20
```

use something like:

```text
pre-generated balanced randomized schedule
```

where every six-day block contains every UTC period once, but the order is randomly permuted.

That preserves:

```text
time coverage
```

while reducing:

```text
calendar/time confounding
```

---

### Change 3 — Add a representative future test set

Keep all of:

```text
unseen airport
unseen region
unseen tail
unseen aircraft
```

but add:

```text
future representative test
```

This should be your primary deployment metric.

---

### Change 4 — Make the final optimization objective prediction value, not coverage alone

Ultimately the collector should learn:

[
\text{marginal predictive value per credit}
]

not merely:

[
\text{new airports per credit}
]

Because an airport that adds 1,000 structurally redundant flights may provide less ML value than another airport producing 100 new aircraft-chain observations.

---

# 24. So, is your AI agent's V3.4 method "correct"?

**Yes, with the four changes above.**

And importantly, the recent research does **not** contradict the fundamental strategy.

Quite the opposite.

The newest work is moving toward exactly the characteristics your design is trying to preserve:

```text
                    FLIGHT DELAY DATA
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
       TABULAR          TEMPORAL          GRAPH
          │                │                │
 schedule/route       flight history     airports
 weather              aircraft chain     network
 carrier               state at T        propagation
 aircraft
          └────────────────┼────────────────┘
                           ↓
                    LEAKAGE-SAFE
                     SNAPSHOTS
                           ↓
               ┌───────────┴───────────┐
               ↓                       ↓
          TREE MODELS                 GNN
          XGBoost/CatBoost            │
               │                      │
               └──────────┬───────────┘
                          ↓
                 FUTURE DEPLOYMENT
                  + UNCERTAINTY
```

That structure is consistent with the direction of Aeolus, recent graph-delay work, aircraft-rotation research, weather-aware models, and recent tree-vs-GNN comparisons. ([NeurIPS Papers][1])

### The most important conclusion

I would **not throw away V3.4**.

I would change its claim from:

> "This is the correct standard way to collect aviation data."

to:

> **"This is a literature-aligned, budget-constrained experimental collection design for constructing a leakage-safe, temporally connected, geographically diverse flight-delay dataset from the AeroDataBox-supported aviation universe."**

That is a much stronger and scientifically defensible statement.

And there is a genuinely interesting research contribution hiding inside this project: **you are not merely comparing XGBoost vs GNN; you can empirically measure how airport breadth, temporal recency, aircraft-chain continuity, network coverage, weather coverage, and collection cost trade off against actual future prediction performance.** Recent literature strongly motivates those information types, while your exact budget-allocation problem remains an empirical design question rather than something the papers have already solved. ([NeurIPS Papers][1])

### Key papers/sources I used

* **Xu et al., “Aeolus: A Multi-structural Flight Delay Dataset,” NeurIPS 2025** — multi-modal flight data, flight chains, network graph, weather, temporal splits, leakage prevention. ([NeurIPS Papers][1])
* **Sun et al., “DS-MGCSTNet,” Journal of Air Transport Management, 2026** — static + dynamic graphs and weather for delay propagation. ([ScienceDirect][2])
* **Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation, 2026** — comparison of graph models and XGBoost across horizons. ([DOI][12])
* **FlightSense, 2026** — XGBoost + aircraft rotation + NOAA weather. ([arXiv][5])
* **Integrating Delay-Absorption Capability into Flight Departure Delay Prediction, 2025** — aircraft rotation, CatBoost/XGBoost, weather and congestion. ([arXiv][6])
* **CausalNet, 2024** — dynamic inter-airport relationships for flight-delay prediction. ([arXiv][3])
* **Graph ML for flight-delay/holding prediction, 2025** — evidence that a tree model with graph features can outperform GAT in some aviation tasks. ([arXiv][4])
* **Airport Delay Prediction with Temporal Fusion Transformers, 2024** — weather, airport demand/capacity and temporal forecasting. ([arXiv][7])
* **AviationWeather.gov / NOAA** — current METAR/TAF API and archive limitations. ([Aviation Weather Center][9])
* **NOAA GFS** — historical analysis and forecast data availability. ([NCEI][10])

**Bottom line: V3.4 is about 90–95% conceptually right.** The remaining issues are mostly about statistical interpretation and experimental rigor—not the fundamental collection architecture.

[1]: https://papers.neurips.cc/paper_files/paper/2025/hash/586fbdff064d506f5af3e3db82681f84-Abstract-Datasets_and_Benchmarks_Track.html?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[2]: https://www.sciencedirect.com/science/article/pii/S0969699726000839?utm_source=chatgpt.com "DS-MGCSTNet: Multi-Graph convolution spatial-temporal network with dynamic and static graph fusion for flight delay prediction - ScienceDirect"
[3]: https://arxiv.org/abs/2407.15185?utm_source=chatgpt.com "A Spatio-Temporal Approach with Self-Corrective Causal Inference for Flight Delay Prediction"
[4]: https://arxiv.org/abs/2502.04233?utm_source=chatgpt.com "Graph machine learning for flight delay prediction due to holding manouver"
[5]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[6]: https://arxiv.org/abs/2512.08197?utm_source=chatgpt.com "Integrating Delay-Absorption Capability into Flight Departure Delay Prediction"
[7]: https://arxiv.org/abs/2405.08293?utm_source=chatgpt.com "Airport Delay Prediction with Temporal Fusion Transformers"
[8]: https://scholars.georgiasouthern.edu/en/publications/airline-specific-flight-delay-prediction-with-tree-based-models-a/?utm_source=chatgpt.com "Airline-Specific Flight Delay Prediction with Tree-Based Models and Network Metrics - Georgia Southern University"
[9]: https://aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
[10]: https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast?utm_source=chatgpt.com "Global Forecast System (GFS) | National Centers for Environmental Information (NCEI)"
[11]: https://arxiv.org/abs/2510.26616?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[12]: https://doi.org/10.3390/app16147110?utm_source=chatgpt.com "Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network"
[13]: https://doi.org/10.1145/3786484.3786539?utm_source=chatgpt.com "Calibrated and Explainable Flight Delay Prediction with Tree-Based Models in Machine Learning | Proceedings of the 2025 International Conference on Artificial Intelligence and Sustainable Development"
