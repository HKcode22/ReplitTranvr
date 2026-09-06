Yes — **V3.3 is a big improvement**, and it is now much closer to a defensible research-grade collection design.

I would **not throw it away** and I would **not go back to V3.2**.

However, after reading the whole V3.3 and checking the current research and AeroDataBox's current documentation, I would **not press “Go” on the 60,000-credit run yet**. There are several technical issues that are small enough to fix now but important enough that I would not want them baked into a month of data.

My overall assessment:

> **V3.3 has the right architecture. It is about 85–90% of the way there.**
>
> The remaining problems are mostly about making the sampling design statistically coherent and making the controlled experiments truly controlled.

The research direction itself is good. Recent work supports combining flight-level/tabular data, aircraft chains, network structure, temporal information, weather, chronological evaluation, and leakage prevention. Aeolus explicitly provides those aligned structures and emphasizes temporal splits and strict leakage prevention. ([NeurIPS Proceedings][1])

---

# 1. First: what V3.3 got right

I agree with most of V3.3.

Especially these parts:

### Keep the 4-hour default

V3.3 correctly backed away from making 2×2h the default:

> "ONE continuous 4 h window per day with the UTC start hour ROTATING." 

I agree with that **as the initial experimental default**.

The reason isn't that research says "4 hours is standard." It doesn't.

The reason is that **your own data already demonstrates that continuous observation gives you repeated flight/tail state information**, and aircraft-chain propagation is a major signal in recent research. Aeolus explicitly models sequential flight legs and shared aircraft/network relationships. ([NeurIPS Proceedings][1])

A 2026 FlightSense study likewise found aircraft-rotation features to be highly valuable in an XGBoost pipeline and then added weather as another feature layer. ([arXiv][2])

So this is a sensible engineering choice.

---

# 2. The biggest thing V3.3 still gets wrong: it calls the sampling probabilities more precise than they really are

This is the most important issue I would fix.

V3.3 says it will record:

```text
airport_selection_probability
time_window_selection_probability
joint_selection_probability
```

and says the probabilities are "nominal" because of rotation-with-exclusion. 

That's better than V3.1, but it still isn't fully solved.

## Why?

Your time schedule is:

```text
00
04
08
12
16
20
repeat
```

That's a **deterministic schedule**, not a random selection mechanism.

Likewise:

```text
anchor pool:
KLAX
EGLL
WSSS
SBGR
OMDB

no-repeat until all seen
```

is deterministic once the starting state/seed is known.

So:

```text
"probability of selecting 02 UTC = 1/6"
```

is not actually the same thing as a randomized inclusion probability.

It is a **planned allocation schedule**.

That isn't wrong.

It just needs different terminology.

### I'd distinguish:

**Design probability**

> A genuinely randomized probability of inclusion.

versus

**Allocation schedule**

> A predefined time/airport rotation used to enforce coverage.

That's important because otherwise someone could later assume:

```text
weight = 1 / joint_probability
```

and believe they're doing exact design-based inference when they aren't.

So I would rename these where appropriate:

```text
airport_selection_probability
```

for genuine randomized selection,

and:

```text
time_window_schedule
time_window_regime
```

for deterministic time scheduling.

Then calculate joint probabilities **only when the actual sampling mechanism supports them**.

---

# 3. There is an even bigger problem with the proposed adaptive REGIONAL probability

This part needs fixing before it ships.

V3.3 proposes:

```text
base_prob = 1 / 157

adaptive multiplier m ∈ [0.25, 1.5]

selection_prob = clamp(base_prob × m, ...)
```



The problem is that if you modify each airport independently like this, the probabilities may no longer sum to 1.

For example, suppose 157 airports each have:

```text
p = 1/157
```

Then:

```text
Σp = 1
```

Good.

But now if 20 airports get `1.5×`, 50 stay at `1×`, etc., the total can become:

```text
Σp > 1
```

unless you **renormalize the entire regional stratum**.

So I would change this to:

```text
base score_i
      ↓
adaptive score_i
      ↓
normalize across all eligible regional airports
      ↓
final selection probabilities
      ↓
sample exactly one regional airport
```

That is a proper probability distribution.

And the final realized probability for the selected airport should be stored for that batch.

This is more important than it sounds.

---

# 4. I would NOT drop an airport from the sampling frame simply because it has zero observations

V3.3 says:

> "require ≥1 observation (drop unusable)" 

I would change that.

AeroDataBox itself warns that airports with poor live-update/ADS-B coverage can produce few or no alerts. ([AeroDataBox][3])

That means:

```text
zero observed flights
```

does **not necessarily mean**

```text
this airport is not part of the population
```

It could mean:

```text
AeroDataBox coverage issue
low traffic
window timing
temporary feed issue
API delivery issue
```

You don't want your sampling frame to silently evolve into:

> "airports that we know will produce useful data."

That turns into convenience sampling.

### Better:

Keep the airport in the **eligible universe** if it passes feed/coverage requirements.

Then track:

```text
eligible
directly subscribed
observed
zero-yield
stale
coverage-failed
```

That is much more defensible.

---

# 5. This is especially important because AeroDataBox itself says coverage should be checked before subscription

AeroDataBox's current Flight Alert documentation explicitly says to check whether an airport is within live-update/ADS-B coverage and warns that busy airports can generate thousands of alerts. ([AeroDataBox][3])

So your frame should really be:

```text
AeroDataBox-supported universe
           ↓
feed eligibility
           ↓
sampling frame
```

not:

```text
AeroDataBox-supported universe
           ↓
did it already give us data?
           ↓
keep/drop
```

That distinction protects the sampling frame.

---

# 6. V3.3's "coverage taxonomy" is excellent

This part I strongly agree with.

You now have:

```text
FRAME
DIRECTLY SUBSCRIBED
EDGE-DISCOVERED
RECENTLY OBSERVED
STALE
```



That's much better than saying:

> "we cover 2,000 airports."

Because an airport can be:

```text
in frame
but never directly sampled
```

or:

```text
seen as an edge endpoint
but not directly subscribed
```

or:

```text
subscribed three months ago
```

Those are completely different kinds of coverage.

Keep this.

---

# 7. But one important wording in §17.3 needs correction

V3.3 says:

> "A node's state may be a day old if that is the best we have — the feature must simply carry its own recency ... so the model can weight by freshness." 

I agree with the **recency idea**, but I'd be careful with the implication.

A model should not automatically be allowed to treat:

```text
airport state from 24 hours ago
```

as though it's a meaningful substitute for:

```text
airport state now
```

without testing whether that stale state still predicts well.

The right approach is exactly what V3.3 later proposes:

```text
prediction error
vs.
hours-since-last-observation
```

That is excellent.

Then you learn empirically:

```text
fresh < 1h
error = 10 min

1–3h stale
error = 14 min

3–6h stale
error = 21 min

6–12h stale
error = 34 min
```

Then you can make an economically informed decision about how much persistent monitoring is worth.

That is a **much stronger research contribution** than simply assuming stale information is okay.

---

# 8. The weather addition is absolutely correct—but one sentence should be removed

V3.3 says:

> "Weather is ~40% of why hubs melt down." 

I would **delete that number**.

I couldn't verify a credible research source establishing a universal "40%" figure for that claim.

The underlying point is absolutely valid:

**weather belongs in the model.**

Recent research has explicitly used wind, visibility, airport conditions, en-route weather and traffic alongside operational variables for delay prediction. ([arXiv][4])

And recent work combining rotation-chain features with NOAA weather also supports the value of adding meteorological data. ([arXiv][2])

So say:

> "Weather is an important exogenous predictor of aviation delay and should be modeled alongside operational and network variables."

That's defensible.

Don't attach an unsupported universal percentage.

---

# 9. The weather architecture is good

This part is solid:

```text
weather observation
    obs_time

weather forecast
    issue_time
    valid_from
    valid_to
```

and:

```text
obs_time <= prediction_cutoff

OR

issue_time <= prediction_cutoff
```

That is exactly the right leakage principle.

For historical weather, NOAA's NCEI Integrated Surface Database provides global hourly/synoptic observations from more than 20,000 stations and contains wind, visibility, cloud, precipitation and other surface variables. ([NCEI][5])

So the weather layer is feasible.

One caution: **don't assume every proposed weather product has perfect historical availability at every airport**. Verify the archive/join coverage before promising a complete historical TAF/GFS layer.

---

# 10. The three horizons are a very good decision

This is one of V3.3's best decisions:

```text
T-24h
T-6h
T-90m
```

as separate prediction tasks. 

I agree.

Recent work explicitly explores multi-horizon airport delay forecasting, and a 2026 U.S. network study uses hourly airport states and forecasts across multiple future horizons. ([MDPI][6])

So you shouldn't treat:

```text
24 hours before
```

and:

```text
90 minutes before
```

as just one model with a mysterious feature called `horizon`.

They represent different information regimes.

---

# 11. Your outcome-state correction is also very good

Changing:

> "right-censored"

to explicit states such as:

```text
observed
active_censored
canceled
diverted
missing_outcome
```

is much cleaner. 

I would keep that.

One tiny modification:

Don't automatically call `active_censored` a survival-analysis problem.

It is simply:

> an outcome not yet observed by the end of the collection window.

You only need survival/censoring machinery if you actually formulate a survival/time-to-event model.

For ordinary delay regression:

```text
no final runway time
```

means:

```text
no regression label yet
```

not:

```text delay = 0
```

which V3.3 correctly protects against.

---

# 12. The biggest flaw in the "controlled window experiment"

This is the other thing I would definitely fix.

V3.3 says:

> 80% 4h, 10% 2×2h, 10% 6h, all under the same 1,900-credit cap. 

That's a reasonable **experimental idea**, but it is **not yet a clean controlled experiment**.

Why?

Suppose:

```text
4h day:
Airport A + B + C

6h day:
Airport D + E + F
```

Then differences in results could be caused by:

```text
window length
airport choice
traffic
time of day
weather
weekday
```

You won't know what caused the difference.

### The experiment should be paired/matched.

For example:

```text
4h regime:
WSSS + MID A + MID B + REGIONAL X
08:00–12:00

2×2h regime:
same/similar airport set
08:00–10:00
10:00–12:00
```

or use randomized crossover blocks.

Then compare:

```text
same airport
same day class
same time band
different window shape
```

as much as possible.

That's what makes it an actual experiment.

---

# 13. More importantly: a 6-hour run under a 1,900-credit cap is not really a 6-hour observation

Suppose WSSS burns the budget after:

```text
3.4 hours
```

Then your supposed:

```text
6h experiment
```

is actually:

```text
6h maximum / budget-truncated observation
```

That's fine.

But label it honestly.

I would record:

```text
requested_window_hours = 6
actual_window_hours = 3.42
stop_reason = budget_reached
```

Then the comparison is:

> "4h scheduled window vs up-to-6h budget-capped window"

not:

> "4h vs 6h."

This is very important for your §24 metrics.

---

# 14. V3.3's day-by-day experimental calendar has an inconsistency

The document says:

> approximately 80% / 10% / 10%. 

But the explicit 31-day schedule later has multiple:

* 2×2h days,
* 6h days,
* and even "6h + 4h" on day 15–16. 

That doesn't cleanly correspond to 80/10/10.

And:

> `6h + 4h`

under a 1,900 daily credit cap needs clarification.

It cannot necessarily be two full windows.

So I would simplify the first month.

Something like:

```text
Most days → 4h

A small number → 2×2h
A small number → 6h maximum

Never require two full windows on a day
when the daily cap has already been reached.
```

And make the experimental schedule explicit rather than saying both "10%" and giving a different calendar.

---

# 15. V3.3's anchor idea is good, but I would wait before locking the five airports

V3.3 now correctly calls them a:

> "rotating anchor pool" rather than persistent core. 

Good.

And I agree with:

```text
don't choose by fame
```

The proposal to measure:

* traffic
* network degree
* yield
* region
* carrier diversity
* aircraft rotation activity

is sensible. 

However, I'd make one change.

### Don't use current sampled network degree as the only basis for choosing future anchors.

Otherwise:

```text
sampled airport
   ↓
gets high observed degree
   ↓
chosen as anchor
   ↓
gets sampled more
   ↓
gets even more observed degree
```

That's a feedback loop.

Use **exogenous/pre-existing information** where possible:

```text
scheduled traffic
published route network
geography
carrier mix
historical independent traffic data
```

and use AeroDataBox-observed degree/yield as additional measurements.

---

# 16. Also: your proposed anchor probe can itself introduce bias

V3.3 says:

> "run a small 2h probe subscription ... on off-peak" 

"Off-peak" makes the probe cheaper/easier, but it may not represent the airport's normal yield.

For anchor selection, I'd prefer:

```text
standardized probe window
```

across candidates.

Otherwise:

```text
Airport A probed at peak
Airport B probed off-peak
```

and B looks artificially cheap.

The probe should be:

* same duration,
* comparable UTC/local-time regime,
* comparable weekday if possible,
* same credit measurement,
* same extraction logic.

---

# 17. Another important issue: your stratification variables may be endogenous

V3.3 proposes:

```text
traffic tier
continent
network degree
international/domestic
carrier diversity
time zone
```

That's generally sensible.

But for sampling-frame construction, **network degree and carrier diversity need a defined reference source/time period**.

If they come from your current AeroDataBox sample, you're using the thing you're trying to sample to define the sampling frame.

I would specify:

> "Frame-stratification variables are computed from an external or fixed reference period, not recursively from the current sample."

Then your actual observed network metrics can remain ML features.

---

# 18. The graph research actually supports V3.3's general direction

This isn't just theory anymore.

A 2026 study published in *Journal of Air Transport Management* uses multiple static/dynamic graphs to model spatial-temporal delay propagation. ([ScienceDirect][7])

Another 2026 study models delay propagation through spatial-temporal interactions and explicitly integrates network properties such as centrality. ([ScienceDirect][8])

A recent 2026 U.S. network study uses:

* 2.88 million flights,
* 370 airports,
* 5,334 directed connections,
* hourly node-time tensors,
* multi-horizon prediction,
* disruption detection,
* uncertainty estimation. ([MDPI][6])

That is very consistent with the direction you're taking:

```text
airport graph
+
time
+
delay history
+
network propagation
+
multiple horizons
```

So the GNN direction is absolutely reasonable.

But those papers also reinforce why **temporal state construction** matters more than simply having a huge airport list.

---

# 19. Your XGBoost-first plan is still exactly right

V3.3's ladder:

```text
XGBoost
→ temporal
→ aircraft rotation
→ graph/centrality
→ GNN
```

is one of the things I would leave alone.

Recent work supports strong tree-based baselines, and FlightSense specifically reports a substantial gain from aircraft rotation features before adding weather. ([arXiv][2])

A 2025 study also explicitly models delay absorption with CatBoost/XGBoost and combines schedule, weather and congestion information, reinforcing that sophisticated tabular models remain very competitive. ([arXiv][9])

So your experiment should eventually answer:

> **How much additional information does the GNN provide beyond carefully engineered XGBoost features?**

That's a much more interesting scientific question than "Can we train a GNN?"

---

# 20. One thing I would add to the model ladder: uncertainty

Your traveler product is not merely:

```text
Predicted delay = 37 minutes
```

It would eventually be more useful to produce:

```text
expected delay = 37 min
P(delay > 15) = 0.81
P(delay > 60) = 0.29
confidence interval = ...
```

The 2026 U.S. graph study explicitly incorporates conformal uncertainty estimation. ([MDPI][6])

So you don't need to build this immediately, but I would make:

```text
probability calibration
uncertainty
```

part of the eventual evaluation design.

---

# 21. One thing V3.3 hasn't completely solved: "unseen airport" evaluation

The document says:

> future-time, unseen-airport, cross-region, disruption-period splits. 

Excellent.

But I would be more precise.

There are at least **three different generalization tests**:

### Seen airport, future date

```text
JFK seen during training
JFK future data in test
```

Tests temporal generalization.

### Unseen airport, same region

```text
Airport X never in training
Airport X in test
```

Tests airport generalization.

### Unseen region

```text
Asia/America/Europe → training
Africa/South America → test
```

Tests geographic transfer.

Those should all be separate numbers.

---

# 22. There is another missing evaluation: unseen aircraft

Because tail numbers are important.

You should also test:

```text
tail seen in train
vs.
tail not seen in train
```

and perhaps:

```text
aircraft model seen
vs.
new tail, known aircraft type
```

Otherwise the model could accidentally learn specific aircraft behavior rather than general rotation dynamics.

---

# 23. The 4-hour window itself is now in the right place

To answer your original concern directly:

### Yes.

I agree with V3.3's decision:

> **1 × 4h continuous window/day with rotating UTC start time should be the initial default.**

The reason is not "industry standard."

It is:

```text
4h gives continuity
+
rotating start fixes temporal sampling bias
+
2×2h can be experimentally measured
```

And current research supports the importance of both temporal and relational structure. ([NeurIPS Proceedings][1])

So I would leave §9 largely intact.

---

# 24. But the UTC cycle should not be the only temporal stratification

You correctly added local time.

That's good.

I'd go one step further.

The sampling dashboard should track:

```text
UTC hour
local departure hour
local arrival hour
day of week
month
holiday/event period
```

Because:

```text
14:00 UTC
```

means very different local operational regimes in:

```text
LAX
LHR
SIN
```

Your addition of airport-local time is therefore important.

---

# 25. Seasonality is correctly deferred

The document correctly admits:

> "30 days = short-term temporal variation, not seasonality." 

Keep that.

A 30-day dataset cannot support annual seasonal claims.

That's scientifically honest.

---

# 26. One thing I'd change in the "standard practice" language

V3.3 improved this significantly, but it still has language such as:

> "Budget split (standard practice, budget-scaled)" 

I'd change that.

There is no published universal aviation-ML standard saying:

```text
45–55% persistent
30–40% rotating
5–10% regional
```

Those are **your experimental allocation choices**.

And that's perfectly okay.

Call it:

> **"our budget-scaled experimental allocation."**

Your later §26 already moves toward this more honest terminology. 

I'd make the whole document consistent.

---

# 27. Your current AeroDataBox billing assumptions are well supported

One thing I re-checked because it affects the entire design:

AeroDataBox's current Flight Alert documentation says:

* airport subscriptions can cover all movements at an airport;
* alerts are charged per flight item;
* a notification with five flights costs five credits;
* retries can also consume credits;
* busy airports can generate thousands of alerts;
* coverage should be checked before creating subscriptions. ([AeroDataBox][3])

So your measured observation that one busy airport can dominate the credit budget is completely plausible and consistent with the API's actual billing model.

That part of the collector design is grounded in reality.

---

# 28. The most important changes I'd make to V3.3

Here is my "before Go" list.

### **Change 1 — fix probability terminology**

Do not call deterministic UTC rotation a probability.

Use:

```text
airport_design_probability
time_window_schedule
sampling_regime
```

and calculate true probabilities only for genuinely randomized selections.

---

### **Change 2 — normalize adaptive regional probabilities**

Do:

```text
score_i
↓
normalize Σ score_i = 1
↓
sample
↓
record actual inclusion probability
```

Don't independently multiply `1/157`.

---

### **Change 3 — don't drop airports because they haven't produced an observation**

Keep them in the eligible frame if the feed/coverage says they are collectable.

Mark:

```text
zero_yield
```

instead of deleting them.

---

### **Change 4 — make the window experiment genuinely controlled**

Match or randomize:

```text
airport set
time
weekday
anchor
tier mix
```

as much as possible.

Otherwise you cannot attribute differences to window shape.

---

### **Change 5 — distinguish requested vs actual window**

Record:

```text
requested_window_hours
actual_window_hours
stop_reason
```

Especially for the 6h experiment.

---

### **Change 6 — remove the unsupported "weather is ~40%" statement**

Keep weather. Remove the number.

---

### **Change 7 — define anchor selection using a fixed reference dataset**

Don't let current sampled degree recursively determine future selection.

---

### **Change 8 — standardize anchor probes**

Don't use "off-peak" for one airport and some other time for another.

---

### **Change 9 — add unseen-tail evaluation**

Not just unseen airports.

---

### **Change 10 — add calibration/uncertainty to the eventual evaluation**

Especially because this is a traveler alert product.

---

# 29. What I would NOT change

These are now solid:

```text
1 × 4h default
rotating UTC hours
AeroDataBox measured universe
stratification
rotating anchor pool terminology
bounded long-tail representation
eventually adding weather
T-24 / T-6 / T-90 separate tasks
flight_events
flight_snapshots
flight_outcomes
feature_timestamp <= prediction_cutoff
aircraft-chain features
XGBoost-first ladder
coverage-age
info-per-credit
future-time evaluation
unseen-airport evaluation
cross-region evaluation
30-day ≠ seasonality
```

The research supports this overall architecture. ([NeurIPS Proceedings][1])

---

# 30. My recommended final architecture

At this point I would conceptualize your project like this:

```text
                    AeroDataBox
                         │
                         ▼
             MEASURED ELIGIBLE UNIVERSE
                         │
                         ▼
              STRATIFIED SAMPLING FRAME
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       ANCHOR         ROTATING       LONG-TAIL
       PANEL           SAMPLE         SAMPLE
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  1 × 4h window
                  rotating start
                         │
                         ▼
                    WEBHOOK EVENTS
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
        FLIGHTS        AIRCRAFT       WEATHER
        /routes        chains          state
           │             │              │
           └─────────────┼──────────────┘
                         ▼
                leakage-safe snapshots
                         │
       ┌─────────────────┼────────────────┐
       ▼                 ▼                ▼
     T-24h              T-6h             T-90m
       │                 │                │
       └─────────────────┼────────────────┘
                         ▼
                   MODEL LADDER
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       XGBoost        Graph XGB       GNN
                         │
                         ▼
               future/unseen testing
                         │
                         ▼
             calibrated traveler alert
```

That's a very coherent architecture.

---

# 31. So should you tell the AI agent "Go"?

### **Not quite yet.**

I would tell your agent:

> **"V3.3 is approved conceptually, but make the 10 corrections above before the production run."**

The two most important are:

**#1:** Fix the probability terminology/normalization.

**#2:** Make the 4h vs 2×2h vs 6h comparison a real controlled experiment rather than merely different days with different collection conditions.

After that, I would be comfortable with the basic collection direction.

---

# 32. Most importantly: you are no longer making the mistake you were originally worried about

Your original fear was:

> "Are we randomly rotating airports and accidentally causing a GNN to miss important patterns?"

The answer after V3.3 is:

**The risk has been substantially reduced, but it isn't eliminated by the GNN.**

The important design now is:

```text
breadth
+
recency
+
aircraft continuity
+
network continuity
+
time coverage
+
weather
+
leakage control
+
future/unseen evaluation
```

That is much more important than simply saying:

> "we sampled 4,000 airports."

And recent research strongly supports that multi-structure approach. Aeolus explicitly combines tabular operational/meteorological features, flight chains, and relational flight networks with strict temporal/leakage controls. ([NeurIPS Proceedings][1])

So **V3.3 is genuinely moving toward the right research architecture**.

I would just make those final statistical/experimental corrections before letting it consume the 60,000 credits.

[1]: https://proceedings.neurips.cc/paper_files/paper/2025/hash/586fbdff064d506f5af3e3db82681f84-Abstract-Datasets_and_Benchmarks_Track.html?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[2]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[3]: https://aerodatabox.com/flight-alert-api-2026/?utm_source=chatgpt.com "Flight Alert API: Guide to the New System – AeroDataBox | Aviation and Flight Data"
[4]: https://arxiv.org/abs/2405.08293?utm_source=chatgpt.com "Airport Delay Prediction with Temporal Fusion Transformers"
[5]: https://www.ncei.noaa.gov/products/land-based-station/integrated-surface-database?utm_source=chatgpt.com "Global Hourly - Integrated Surface Database (ISD) | National Centers for Environmental Information (NCEI)"
[6]: https://www.mdpi.com/2076-3417/16/14/7110?utm_source=chatgpt.com "Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network"
[7]: https://www.sciencedirect.com/science/article/pii/S0969699726000839?utm_source=chatgpt.com "DS-MGCSTNet: Multi-Graph convolution spatial-temporal network with dynamic and static graph fusion for flight delay prediction - ScienceDirect"
[8]: https://www.sciencedirect.com/science/article/pii/S100093612500490X?utm_source=chatgpt.com "Delay propagation prediction of aviation network based on spatial–temporal dynamic interaction - ScienceDirect"
[9]: https://arxiv.org/abs/2512.08197?utm_source=chatgpt.com "Integrating Delay-Absorption Capability into Flight Departure Delay Prediction"
