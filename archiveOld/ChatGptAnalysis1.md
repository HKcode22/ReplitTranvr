Yes. I went through both files carefully and cross-checked the collection logic against recent flight-delay, GNN, network-propagation, and leakage/data-construction research from 2024–2026.

There is a **very important misunderstanding in the current setup**:

> Your system is **not sampling ~280 airports per day**.

The catalog contains 276 airports, but the collector is only selecting roughly **5 airports per batch**. In the actual B0002 run, it selected **4 airports**: 1 HUB, 2 MID, and 1 REGIONAL. 

And this distinction matters enormously for whether the eventual XGBoost/GNN model can learn a genuinely broad aviation network.

---

# 1. My overall verdict

I would **not throw away the current architecture**.

The basic idea—airport-level probability sampling because AeroDataBox forces you to subscribe to an entire airport—is reasonable. The files correctly recognize that you cannot tell AeroDataBox "give me these 10 flights." The sampling unit is the airport subscription. 

However, I **would not let the AI agent proceed with the current strategy unchanged**.

There are five important problems:

| Area                             | My verdict                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| 276-airport catalog              | **Too narrow for your stated goal**                                                   |
| 3–5 airports/batch               | **Reasonable for budget, but insufficient by itself for global coverage**             |
| HUB/MID/REGIONAL stratification  | **Good idea**                                                                         |
| "1/p" sampling weights           | **Not as statistically clean as the document claims**                                 |
| Rotating airports                | **Good for breadth, but bad for persistent temporal GNN state if used alone**         |
| Same 4-hour time band            | **Definitely a problem**                                                              |
| Pre/post data together           | **Potentially dangerous leakage unless snapshots are constructed correctly**          |
| Tail-number/rotation information | **Extremely valuable and worth protecting**                                           |
| GNN                              | **Viable, but don't force an airport-node GNN onto incomplete temporal observations** |
| XGBoost                          | **Should absolutely be your baseline**                                                |

The current collection system is therefore **a good prototype, not yet the collection design I would trust for the final research dataset**.

---

# 2. The biggest misconception: 276 airports ≠ 276 airports sampled every day

Your second file says the catalog has:

* 30 HUB
* 89 MID
* 157 REGIONAL
* 276 total. 

But the collector doesn't monitor all 276 simultaneously.

It chooses something like:

```text
Batch
   ↓
1 HUB
2 MID
2 REGIONAL
   ↓
subscribe to those airports
   ↓
collect flights for ~4 hours
   ↓
delete subscriptions
   ↓
choose another set
```

The actual B0002 example is:

```text
WSSS   HUB       1,325 rows
OMAA   MID         508
HECA   MID          87
KGPT   REGIONAL      2
```

So one batch effectively observed **four airports**, not 276. 

And the files explicitly state that the current dataset contains only **336 distinct airports**, even though the catalog itself has 276 and the network edges expose additional endpoints. 

That is an important distinction:

### Airport observed

An airport you actively subscribed to.

### Airport appearing in a flight row

An airport that happened to be the origin or destination of a captured flight.

Those aren't equivalent.

---

# 3. Your graph is not actually "broken" right now

This part of your AI agent's reasoning is actually quite good.

The concern was:

> "If we rotate airports, the GNN graph will become fractured."

The empirical evidence in your own dataset doesn't support that.

The current union of all captured data has:

* 336 airports
* 763 directed route pairs
* 1 connected component
* 336/336 airports in the largest component
* 70% of route pairs observed in both directions. 

So **the graph itself isn't the main problem**.

Why?

Because when you subscribe to WSSS, you're not receiving one isolated airport node. You're seeing flights such as:

```text
WSSS → X
Y → WSSS
```

and therefore discovering many other airports through the captured edges.

The file correctly calls this an important advantage of AeroDataBox's delivery model. 

Recent research actually points in the same direction: modern aviation graph models are increasingly treating flights and their operational connections as relational objects rather than just building a simplistic static airport graph. The 2026 Edge-Based GNN paper, for example, argues that conventional node→edge→node representations can discard important flight-level information and explicitly models flight connectivity through an edge-centric formulation. ([MDPI][1])

So your concern should **not** be:

> "Will my graph become disconnected?"

It should be:

> **"Will the graph have enough temporally persistent observations to learn how its nodes and edges evolve?"**

That's a much more serious problem.

---

# 4. This is where the current rotation strategy has a real weakness

Your own file actually identifies it:

> "Node stability over time, not node count." 

That is exactly what I agree with.

Imagine:

### Day 1

```text
JFK
LAX
LHR
```

### Day 2

```text
SIN
DXB
HND
```

### Day 3

```text
ORD
FRA
CDG
```

You can eventually make one giant graph:

```text
JFK ─ LAX ─ LHR ─ SIN ─ DXB ─ HND ─ ORD ─ FRA ─ CDG
```

But the GNN doesn't magically know:

> "I observed JFK's state yesterday, and here's JFK's state today."

You have created **spatial coverage without necessarily creating temporal continuity**.

That's important because recent flight-delay research is increasingly emphasizing precisely this combination:

**spatial + temporal + aircraft-chain information.**

Aeolus, the NeurIPS 2025 flight-delay benchmark, is particularly relevant here. It explicitly constructs:

* flight-level tabular data,
* aircraft-chain sequences,
* dynamic flight-network relationships,

and emphasizes temporal splits and strict leakage prevention. 

The authors specifically note that flight-delay observations aren't i.i.d.; they are interconnected through aircraft, airport resources, crews, and other operational relationships. 

That is extremely relevant to what you're building.

---

# 5. I would change the "fixed core" idea—but not exactly as your agent proposed

Your current document recommends:

```text
ADB_CORE_AIRPORTS = WSSS, OMAA
```

because those are high-yield airports in B0002. 

I **do not like that exact choice**.

Why?

Because:

```text
WSSS = Singapore
OMAA = Muscat
```

would give you a permanent temporal anchor heavily concentrated in one broad geographic region.

The model could learn:

```text
"Asia/Middle East network dynamics"
```

much more reliably than:

```text
"global aviation network dynamics"
```

I'd rather have a small **cross-regional persistent panel**.

For example conceptually:

```text
North America
    KLAX

Europe
    EGLL

Asia
    WSSS
```

or perhaps 4–6 strategically selected airports if the budget permits.

The exact airports should be selected based on **traffic volume, network degree, geographic region, carrier diversity and AeroDataBox yield**, not simply "the airports that happened to produce the most rows during B0002."

That's an important distinction.

---

# 6. The research strongly supports keeping aircraft-chain information

This is probably the strongest part of your current collection design.

Your file reports:

* 1,036 distinct tails
* 716 tails appearing ≥2 times
* 91% of tail captures being re-captures
* tail number available on 81% of rows. 

That's valuable.

Recent research repeatedly finds that delays propagate through aircraft rotations.

Aeolus explicitly constructs flight chains where sequential flights operated by the same aircraft are connected to represent upstream delay propagation. 

And a 2026 FlightSense study using XGBoost found a large improvement after adding aircraft-rotation delay features to a schedule-based model; their stated AUC increased from 0.732 to 0.875 after introducing rotation-chain features. ([arXiv][2])

So I would **not sacrifice tail-number continuity just to increase airport breadth**.

You need both:

```text
AIRPORT NETWORK
        +
AIRCRAFT ROTATION NETWORK
```

not one or the other.

---

# 7. Your current 81% tail-number availability is a serious limitation

The file says:

> 800 rows have no `aircraft_reg`. 

That means you cannot reconstruct aircraft rotations for 19% of observations.

This isn't necessarily fatal.

But it means your future pipeline should explicitly represent:

```text
tail_known = 1/0
```

and never treat missing tail number as random missingness automatically.

The missingness itself might depend on:

* airport type,
* status,
* aircraft type,
* regional operation,
* codeshare,
* data source behavior.

Your file already observes that regional/low-status records are disproportionately affected. 

That's exactly the sort of missing-not-at-random problem that can quietly bias an ML model.

---

# 8. One thing I strongly disagree with: "1/p makes the sampling statistically honest"

Your second file says:

> `sampling_probability = slots_in_tier / airports_in_tier`

and

> `sampling_weight = 1 / sampling_probability`. 

That's **directionally correct**, but the claim that this completely fixes the sampling bias is too strong.

There are several layers of sampling:

### Layer 1 — Airport selection

```text
Which airport?
```

You have some probability here.

### Layer 2 — Time-window selection

```text
Which 4-hour period?
```

This isn't presently modeled as a clean inclusion probability.

### Layer 3 — API coverage

```text
Does AeroDataBox actually cover this airport/feed?
```

Not every catalog airport is necessarily observable.

### Layer 4 — Delivery / webhook observation

```text
Did the notification actually reach you?
```

### Layer 5 — Flight status timing

```text
Was the relevant state exposed during your subscription window?
```

### Layer 6 — Tail availability

```text
Was aircraft registration provided?
```

Therefore:

```text
1 / airport_probability
```

doesn't mathematically undo all selection effects.

It primarily corrects the **airport-selection component**.

---

# 9. There is another subtle sampling problem: recent-batch exclusion

This is especially important.

Your collector deliberately says:

```text
don't select airports from the previous 2 batches
```

That's useful operationally for breadth. 

But once you do that, the actual probability of selecting an airport is **not simply**

```text
slots / total_airports
```

anymore.

It becomes conditional on:

```text
which airports were selected previously
```

So the simplistic:

```text
p = 2 / 89
```

is not the complete inclusion probability for a rotating-with-exclusion design.

This doesn't mean the design is bad.

It means I would **not describe the resulting 1/p values as exact Horvitz–Thompson inclusion weights without carefully deriving the actual sampling design**.

The research file is currently overstating that part.

---

# 10. Even more important: your target population needs to be defined

You are saying:

> "I want all or most airports so nothing is missed by the prediction models."

That's understandable, but statistically there are two different goals:

### Goal A — Estimate the distribution of aviation

You care about:

> "What proportion of all flights worldwide experience delay?"

Then population-representative sampling is critical.

### Goal B — Build the best predictive model

You care about:

> "Can the model accurately predict delay for a new flight anywhere in the network?"

That changes the sampling strategy.

You may deliberately **oversample rare but important cases**:

* regional airports
* unusual routes
* disrupted hubs
* weather events
* low-frequency airports
* international connections

and then evaluate separately on a representative test population.

So I wouldn't make the model training set blindly representative.

I'd build:

```text
TRAINING DATA
    stratified / enriched
          ↓
MODEL

VALIDATION / TEST
    representative target population
          ↓
REALISTIC PERFORMANCE
```

That is much more defensible.

---

# 11. This is where XGBoost is extremely useful

I would **not start with the GNN**.

I would build:

### Model 1 — naive baseline

Logistic/linear regression.

### Model 2 — XGBoost

Using:

```text
scheduled departure
scheduled arrival
airline
origin
destination
route
aircraft type
distance
day of week
month
time of day
airport historical congestion
route historical delay
```

### Model 3 — XGBoost + temporal features

```text
previous airport congestion
recent route delay
recent carrier delay
rolling airport delay
rolling route delay
```

### Model 4 — XGBoost + aircraft lineage

```text
previous flight delay
previous arrival delay
turnaround time
time since previous arrival
number of previous legs
tail rotation position
```

### Model 5 — GNN / temporal GNN

```text
airport relationships
route relationships
aircraft relationships
temporal airport states
```

This lets you answer the scientifically important question:

> Does the GNN actually learn something that XGBoost + carefully engineered graph/rotation features cannot?

Recent research makes that comparison especially worthwhile.

A 2025 aviation study found that incorporating network centrality features into tree-based models improved flight-delay prediction, demonstrating that you can get meaningful network information without necessarily using a GNN. ([MDPI][3])

And the 2025/2026 literature includes both sophisticated GNN models and strong tree-based models, rather than showing that "GNN automatically wins." For example, a 2025 graph-ML study on holding-related delay prediction reported CatBoost outperforming its GAT model on an imbalanced dataset. ([arXiv][4])

So:

**GNN ≠ automatically better.**

---

# 12. Your biggest ML danger may actually be leakage, not airport sampling

This is the part I'd be most worried about.

Your CSV currently contains:

```text
PRE
POST
```

The file reports:

```text
PRE  = 1,703
POST = 2,613
```

and departure runway time exists for 1,898 rows. 

That's great for building a **dataset of flight evolution**.

But it is NOT automatically safe for a **pre-departure prediction model**.

Suppose:

```text
10:00
flight expected

10:15
flight expected

10:30
gate closed

10:40
departed

10:50
actual runway time
```

You cannot train the model as:

```text
10:00 row → final delay
```

while accidentally allowing features generated at 10:40 or 10:50 into that same flight's feature history.

Recent work on flight-delay datasets is explicitly emphasizing this issue. Aeolus identifies temporal leakage as a major problem in flight-delay datasets and uses temporal splitting and leakage prevention. 

A recent Berkeley flight-delay project similarly emphasizes that actual previous-flight durations can leak future information and constructs "safe" lineage features using information that would genuinely exist at prediction time. ([iSchool][5])

---

# 13. You should therefore change the unit of training data

Don't think:

```text
1 webhook row = 1 ML sample
```

Instead think:

```text
1 flight
   ├── snapshot at T-180
   ├── snapshot at T-120
   ├── snapshot at T-60
   ├── snapshot at T-30
   └── snapshot at T-15
```

Then:

```text
INPUT:
everything known at that exact time

TARGET:
actual departure delay
```

For example:

```text
prediction_time = scheduled_departure - 60 min

features allowed:
    weather available at T-60
    airport congestion known at T-60
    inbound flight status known at T-60
    aircraft previous-leg delay known at T-60
    route history before T-60

features forbidden:
    actual departure time
    actual runway time
    future arrival time
    future weather
    future downstream flight status
```

This would make your dataset much stronger.

---

# 14. Your 4-hour windows are another weakness

Your own diagnostics found:

```text
00 nearly dead
18–19 nearly dead
22–23 nearly dead
```

and major concentration around certain UTC hours. 

This is absolutely a collection bias.

You're effectively saying:

> "Teach the model aviation using what happens during this slice of the day."

A network model can then learn correlations that are actually artifacts of observation.

Recent aviation research repeatedly models temporal patterns explicitly. For example, nationwide airport-throughput GNN work incorporates quarter-hour time states and historical airport traffic conditions, illustrating how important temporal coverage is to these models. ([Frontiers][6])

And recent delay work stresses that prediction performance depends on the forecast horizon and temporal context. ([ScienceDirect][7])

So your proposed:

```text
02 → 06 → 10 → 14 → 18 → 22 UTC
```

rotation is much better than always starting at one hour.

---

# 15. I would NOT rotate airport coverage and time coverage independently

This is another improvement I'd make.

You need something like a **2-dimensional sampling matrix**:

```text
                 UTC TIME
             00  04  08  12  16  20
           ┌─────────────────────────
HUB        │ ●   ●   ●   ●   ●   ●
MID        │ ●   ●   ●   ●   ●   ●
REGIONAL   │ ●   ●   ●   ●   ●   ●
```

And across batches:

```text
Batch 1:
HUB A + MID A/B + REGIONAL A
time = 00–04

Batch 2:
HUB B + MID C/D + REGIONAL B
time = 04–08

Batch 3:
HUB C + MID E/F + REGIONAL C
time = 08–12

...
```

That way you don't accidentally create:

```text
Airport × Time
```

confounding.

---

# 16. And you need seasonality

This is currently missing because you've only collected a tiny temporal slice.

You eventually need coverage across:

```text
Spring
Summer
Fall
Winter
```

because aviation delay mechanisms change dramatically with:

* thunderstorms
* winter storms
* summer congestion
* holidays
* seasonal schedules
* daylight changes
* vacation traffic

The research literature reflects this need for temporal diversity. Recent datasets such as Aeolus cover many years and explicitly use temporal splits rather than treating flight observations as exchangeable i.i.d. samples. 

So 30 days of cleverly sampled data is **not equivalent** to a representative aviation dataset.

---

# 17. The "all 4,000 airports" goal needs to be reframed

Your V3 file says approximately:

```text
~4,072 airports with scheduled commercial flights
```

and distinguishes those from tens of thousands of aerodromes that don't matter for scheduled delay prediction. 

That's conceptually correct.

But even 4,072 is not the whole practical sampling universe.

The important universe is:

```text
AeroDataBox-supported airports
        ↓
airports with relevant flight data
        ↓
airports with sufficient temporal observation
```

Your own system already has a very good idea for discovering this universe:

```text
FlightSchedules
FlightLiveUpdates
AdsbUpdates
```

through the covered-airports endpoint. 

**That should become the foundation of your sampling frame.**

Don't hard-code 276 airports and assume they're the world.

Instead:

```text
AeroDataBox coverage universe
             ↓
remove unusable airports
             ↓
stratify the complete universe
             ↓
sampling frame
             ↓
rotation
```

That is much stronger.

---

# 18. I would expand the airport catalog substantially

Your 276-airport catalog is useful for testing the collector.

I would **not use it as the final sampling frame**.

The final pipeline should dynamically generate something like:

```text
ALL_SUPPORTED_AIRPORTS
       │
       ├── HUB
       ├── LARGE
       ├── MID
       ├── REGIONAL
       └── LOW_VOLUME
```

And preferably stratify on more than traffic tier:

```text
continent / region
traffic volume
international/domestic
network degree
carrier diversity
airport type
time zone
seasonality
AeroDataBox coverage
historical observation yield
```

That prevents you from having a "regional airport" category that accidentally consists mainly of one geography.

---

# 19. The current REGIONAL problem is real—but I wouldn't simply delete regional airports

Your file says:

> REGIONAL = only 29 rows. 

So the current 2 regional slots aren't generating much data.

The proposed response is:

```text
HUB 1
MID 3
REGIONAL 1
```

or even:

```text
HUB 2
MID 3
REGIONAL 0
```

I **wouldn't immediately choose the second option**.

The regional airports are exactly where you are trying to protect against a hub-biased model.

Instead I'd change the sampling objective.

Rather than:

```text
"every tier gets equal number of slots"
```

use something closer to:

```text
coverage value per credit
```

For example:

```text
regional airport selected
        ↓
does it actually emit flight observations?
        ↓
YES → increase probability
NO  → rotate to another regional airport
```

That means you still preserve regional representation, but you're not repeatedly paying the opportunity cost of dead airports.

---

# 20. But don't turn this into convenience sampling

This is the trap.

You don't want:

```text
"Let's just pick the airports that give us lots of rows."
```

because then your model becomes:

```text
BIG AIRPORT MODEL
```

instead of:

```text
GLOBAL FLIGHT MODEL
```

So I'd use an adaptive design with safeguards:

```text
Minimum coverage requirement
        +
probability sampling
        +
yield information
        +
geographic balancing
```

rather than pure traffic optimization.

---

# 21. There is one extremely strong research precedent for your objective

The 2026 Edge-Based GNN research used:

```text
236 Chinese commercial airports
1,061,250 flights
3 months
```

and split the data chronologically:

```text
January → training
February → testing
March → validation
```

with actual departure/arrival times and aircraft registration numbers. ([ResearchGate][8])

That's important.

They didn't say:

> "Let's randomly sample five Chinese airports every day."

They had the advantage of having access to essentially the **whole network population**.

That is the gold-standard situation.

Your problem is different because AeroDataBox is pay-per-notification.

So your closest equivalent is:

```text
FULL AVAILABLE UNIVERSE
        +
PROBABILITY SAMPLING
        +
TEMPORAL COVERAGE
        +
PERSISTENT CORE
        +
AIRCRAFT CHAINS
```

That's the design I'd pursue.

---

# 22. Recent research also says your GNN should probably be more than an airport GNN

This is something I think your AI agent hasn't fully appreciated.

There are at least three networks in your data:

### Network A — airport network

```text
Airport → Airport
```

### Network B — aircraft rotation network

```text
Flight A → Flight B → Flight C
```

because the same aircraft operates them.

### Network C — temporal airport congestion network

```text
airport state at t
      ↓
airport state at t+15
      ↓
airport state at t+30
```

Modern datasets such as Aeolus explicitly combine flight chains with a flight network rather than relying on only one static airport adjacency matrix. 

And the 2026 edge-based GNN work specifically argues that edge/flight information can be more informative than reducing everything to airport nodes. ([MDPI][1])

So eventually I would favor something like:

```text
                    ┌─────────────┐
                    │ Airport     │
                    │ Graph       │
                    └──────┬──────┘
                           │
                           ▼
                     spatial state
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
       Aircraft sequence         Flight/route edges
               │                       │
               └───────────┬───────────┘
                           ▼
                    Temporal model
                           │
                           ▼
                   Delay prediction
```

That's more aligned with where the research is heading than a simple:

```text
airport adjacency matrix → GCN
```

---

# 23. Your current dataset has another important issue: repeated observations

You have:

```text
4,316 rows
1,788 unique flight numbers
1,888 unique flights in B0002
```

That means rows are not necessarily independent flights. 

That's actually **good** for a monitoring dataset.

But dangerous for conventional ML evaluation.

Suppose you have:

```text
Flight AA123
  09:00 Expected
  09:15 Expected
  09:30 GateClosed
  09:40 Departed
  09:55 EnRoute
```

You must not randomly split rows:

```text
TRAIN:
09:00
09:30
09:55

TEST:
09:15
```

That would make your model look spectacular while effectively giving it the same flight's future information.

For your project, the fundamental split unit should often be:

```text
flight/date
```

not:

```text
webhook row
```

And for network experiments, potentially:

```text
time block
```

or:

```text
day
```

---

# 24. Your model evaluation should look like this

I'd strongly recommend:

### Experiment A — temporal generalization

```text
Weeks 1–6 → train
Week 7 → validation
Week 8 → test
```

### Experiment B — airport generalization

```text
some airports → train
unseen airports → test
```

### Experiment C — geographic generalization

```text
North America/Europe/Asia → train
another region → test
```

### Experiment D — disruption generalization

Normal periods → train

major disruption/weather periods → test

### Experiment E — tail generalization

Seen aircraft families → test

new tail numbers → test

This will tell you whether the GNN is actually learning aviation dynamics rather than memorizing airport IDs.

---

# 25. I would specifically test "unseen airport" performance

This is one of the best experiments you could run.

Suppose your model performs:

```text
Known airports:
RMSE = 23 min

Unseen airports:
RMSE = 81 min
```

Then you haven't really built a general aviation predictor.

You built:

```text
airport-specific memorization
```

And that's exactly the kind of failure your concern about rotating sampling was pointing toward.

Conversely:

```text
Known airports:
RMSE = 24

Unseen airports:
RMSE = 29
```

would be extremely encouraging.

---

# 26. The permanent core should therefore have a specific purpose

I would define it as:

### Persistent panel

A small set of airports observed continuously.

Purpose:

```text
temporal state estimation
network drift detection
GNN node continuity
weather/congestion synchronization
aircraft-chain anchoring
```

### Rotating panel

The remaining budget.

Purpose:

```text
geographic coverage
airport diversity
long-tail coverage
unseen-airport generalization
network expansion
```

That's much cleaner conceptually than simply calling everything "sampling."

---

# 27. I would also add a third category: event sampling

This is something I think could make your project significantly stronger.

Don't rely only on random rotation.

When you detect a major event:

```text
airport congestion spike
severe weather
large delay cluster
airport closure
diversion
cancellation wave
```

allocate some collection capacity to it.

Because one of the hardest things for a delay model is:

```text
rare disruptions
```

A random sampler will naturally under-sample them.

But you don't want to contaminate the general training distribution either.

So label them:

```text
sampling_reason =
    random
    coverage
    persistence
    event
```

Then you can analyze models separately.

---

# 28. Your current credit strategy is also not safe for a 30-day research run

This part of the document is absolutely correct.

The measured B0002 cost was around:

```text
2,037 credits
```

and the file estimates roughly:

```text
~2,000 credits/day
```

for a single batch/day. 

Without a daily cap, the 60k balance can be burned in roughly 3–5 days.

So the daily budget is not optional.

I agree with the document's recommendation here:

```text
daily budget ≈ 1,800–1,900
```

with the exact number adjusted based on observed burn rate.

---

# 29. But I would measure "information per credit", not "rows per credit"

You currently treat:

```text
~1 row ≈ 1 credit
```

which is useful financially.

But for ML, these are not equivalent:

```text
1,000 repeated WSSS status updates
```

versus:

```text
1,000 new flights across 100 airports
```

The second could be dramatically more valuable.

So your diagnostics should include:

```text
credits
unique flights
unique airports
new airport coverage
unique tails
new tails
route pairs
new route pairs
pre-departure snapshots
post-departure snapshots
weather coverage
delay events
severe delay events
```

Then calculate:

```text
information / credit
```

for each sampling strategy.

---

# 30. I would change the final collection architecture to this

This is what I would tell your AI agent to build.

```text
                    AERODATABOX
                        │
                        ▼
             FULL COVERAGE UNIVERSE
                        │
                        ▼
              AIRPORT SAMPLING FRAME
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
   PERSISTENT       ROTATING         EVENT-DRIVEN
      CORE            SAMPLE            SAMPLE
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                 4–6 hour windows
                 varied UTC times
                        │
                        ▼
                 WEBHOOK DATA
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
       FLIGHT SNAPSHOTS       FINAL OUTCOME
             │                     │
             ▼                     ▼
     PRE-DEPARTURE ONLY        DELAY LABEL
             │
             ▼
      TAIL / ROTATION HISTORY
             │
             ▼
       AIRPORT / ROUTE GRAPH
             │
             ▼
        TRAIN / VALIDATE / TEST
```

---

# 31. The dataset should ultimately have three synchronized tables

This is another major change I'd make.

### `flight_events`

One row per observed event:

```text
flight_id
timestamp
status
airport
origin
destination
tail
scheduled times
estimated times
observed times
sampling metadata
```

### `flight_snapshots`

One row per prediction horizon:

```text
flight_id
snapshot_time
minutes_to_departure
all information available at snapshot_time
```

For example:

```text
T-180
T-120
T-60
T-30
T-15
```

### `flight_outcomes`

One row per flight:

```text
flight_id
actual_departure
actual_arrival
departure_delay
arrival_delay
cancelled
diverted
```

That architecture makes leakage control vastly easier.

---

# 32. The most important thing your collector should record is "what was knowable at time T"

For every feature, you eventually want:

```text
feature_timestamp
```

and:

```text
prediction_cutoff
```

Then enforce:

```text
feature_timestamp <= prediction_cutoff
```

This is the single cleanest way to protect the model from accidental future information.

For example:

```text
previous_arrival_delay
```

is okay if the aircraft actually landed before the prediction time.

But:

```text
previous_arrival_delay
```

is leakage if you're predicting at 10:00 and the previous flight doesn't land until 10:30.

That distinction is critical.

---

# 33. What recent research says about the model choice

The recent literature doesn't support choosing only one architecture.

It points toward a progression:

### XGBoost / tree models

Excellent for:

```text
structured flight data
categorical variables
nonlinear relationships
small-to-medium datasets
interpretability
```

Network-derived features such as centrality can substantially help tree models. ([MDPI][3])

### LSTM / temporal models

Useful for:

```text
historical sequences
airport congestion
time evolution
```

### GNN

Useful when:

```text
relationships themselves matter
```

especially:

```text
airport ↔ airport
flight ↔ flight
aircraft ↔ flight
resource ↔ flight
```

### Spatiotemporal GNN

Probably the long-term architecture I'd investigate.

Recent 2025–2026 papers are explicitly combining:

```text
graph structure
+
temporal dynamics
+
delay propagation
```

for network-wide prediction. ([Springer][9])

---

# 34. But don't assume GNN will solve the coverage problem

This is extremely important.

A GNN cannot learn information that never exists in its inputs.

If airport X is observed:

```text
once every 20 days
```

the GNN cannot magically reconstruct a reliable:

```text
airport X congestion state
```

every day.

Likewise, if a tail number is missing:

```text
19% of rows
```

the GNN can't reconstruct the aircraft's identity from nothing.

Deep learning does not eliminate sampling bias.

It can actually **hide it better**.

That's why I'd be more concerned about dataset design than whether you use:

```text
GAT
GCN
GraphSAGE
GATv2
Temporal GNN
Transformer
XGBoost
```

---

# 35. The current dataset actually gives you an excellent opportunity

You have already discovered:

```text
336 airports
763 route pairs
1,036 tails
pre + post states
497 distinct route distances
1,788 unique flight numbers
```

and the delay signal isn't degenerate. 

So the prototype is working.

The problem is **not that the data is useless**.

The problem is that it's currently more like:

> "a good proof that the collector works"

than:

> "a statistically defensible global aviation training corpus."

That's an important difference.

---

# 36. My recommended final sampling design

I'd use something approximately like:

```text
                  COLLECTION BUDGET
                        │
         ┌──────────────┼───────────────┐
         │              │               │
         ▼              ▼               ▼
     40–50%          30–40%           10–20%
   persistent       rotating         event/
      core          coverage         long-tail
```

The exact percentages should be determined empirically from:

```text
credits per airport
unique flights
new route discovery
new tails
temporal coverage
```

Then:

### Persistent core

Cross-region.

Not simply:

```text
WSSS + OMAA
```

### Rotating sample

Draw from the entire supported airport universe.

Not just 276 hard-coded airports.

### Long-tail sample

Guarantee repeated exposure to smaller airports.

### Event sample

Capture unusual disruption regimes.

---

# 37. And the airport sampling should be two-dimensional

Your next sampling controller should know:

```text
airport inclusion probability
+
time-window inclusion probability
```

so your metadata becomes something like:

```text
airport_selection_probability
time_window_selection_probability
joint_selection_probability
sampling_weight
sampling_strategy
sampling_reason
random_seed
```

Then you can actually study the effect of your sampling design.

---

# 38. I would also stop saying "the model can weight this to recover the population"

That phrase in the current documentation is too ambitious.

I'd replace the conceptual claim with:

> "Sampling probabilities are recorded to allow sampling-aware training, evaluation, sensitivity analysis, and—where the statistical assumptions hold—design-based weighting."

That's much more scientifically defensible.

Because the actual goal isn't necessarily to estimate a population mean.

You're building a predictor.

---

# 39. Your health dashboard should become a sampling dashboard

Currently you're looking at:

```text
rows by tier
departure hours
delay buckets
batch rows
estimated credits
```

That's useful.

I'd add:

```text
unique airports observed / universe
coverage probability by airport
days since last observation by airport
hours since last observation
unique routes
route-direction coverage
unique tails
tail-number missingness
flights per airport
flights per credit
pre-departure snapshots
post-departure snapshots
delay events
severe delays
weather regimes
geographic coverage
```

And especially:

```text
AIRPORT COVERAGE AGE
```

Example:

```text
JFK → observed 2h ago
LHR → observed 1 day ago
SIN → observed 2h ago
DEN → observed 11 days ago
regional X → never
```

That would instantly tell you whether your sampling strategy is healthy.

---

# 40. My final judgment on the two files

### V3_CollectionStrategy.md

**Conceptually good.**

The authors correctly recognized:

* airport-level sampling constraints,
* stratification,
* budget limitations,
* need for reproducibility,
* long-tail coverage,
* time-of-day bias,
* sampling metadata. 

But it currently makes the sampling design sound more statistically complete than it really is.

### Overnight2.md

**Much better because it is based on actual collected data.**

It correctly discovered:

* hub dominance,
* regional starvation,
* temporal lumpiness,
* tail-number gaps,
* node-continuity problems,
* budget problems,
* the fact that the graph itself is connected. 

The most valuable conclusion in that file is actually:

> **Node stability is more important than simply increasing node count.** 

I agree with that.

But I would **not** implement the exact proposed `WSSS + OMAA` permanent core without redesigning the geographic sampling logic.

---

# 41. The design I would use for your actual project

My recommended hierarchy is:

```text
1. Define the prediction problem
       ↓
2. Define exact prediction timestamp/horizon
       ↓
3. Define the complete AeroDataBox-supported universe
       ↓
4. Build geographic + traffic + network strata
       ↓
5. Create a small cross-regional persistent panel
       ↓
6. Rotate the remaining airports probabilistically
       ↓
7. Rotate UTC time windows
       ↓
8. Include seasonal coverage
       ↓
9. Preserve all webhook events
       ↓
10. Construct leakage-safe snapshots
       ↓
11. Reconstruct aircraft rotations
       ↓
12. Build airport + route + aircraft graphs
       ↓
13. Train XGBoost baseline
       ↓
14. Add graph features to XGBoost
       ↓
15. Test GNN
       ↓
16. Evaluate on future time + unseen airports
```

That is much closer to what I would consider a **research-grade aviation prediction dataset**.

---

# 42. The one-sentence answer to your original concern

Your AI agent's current strategy is **not fundamentally wrong**, and the "rotating airports will automatically fracture the GNN" argument is **not supported by your actual graph data**.

But **rotating only 3–5 airports at a time from a 276-airport catalog is not enough to claim broad global airport coverage**, and the current `1/p` weighting does not fully correct the additional time-window, coverage, and rotation-selection effects.

The bigger danger is **temporal discontinuity + pre/post leakage + insufficient tail/airport history**, not graph connectivity itself.

Recent research strongly supports building a dataset around **time-consistent snapshots + aircraft rotations + airport/network relationships + strict temporal evaluation**, rather than simply accumulating as many airport rows as possible. 

And I would absolutely keep **XGBoost as the first serious model** rather than assuming a GNN will outperform it; recent aviation work shows that well-engineered tree models with network and lineage features can be extremely competitive. ([MDPI][3])

### The biggest changes I'd make before you spend the next 60,000 credits

**1. Expand the sampling frame beyond the 276 hard-coded airports.**

**2. Add a small cross-regional persistent core rather than WSSS/OMAA only.**

**3. Rotate time-of-day as deliberately as you rotate airports.**

**4. Treat airport probability and time-window probability separately.**

**5. Build leakage-safe T−180/T−120/T−60/T−30/T−15 snapshots.**

**6. Preserve and exploit aircraft-tail rotation history.**

**7. Evaluate on future dates and airports the model has not seen.**

**8. Compare XGBoost → XGBoost+graph → GNN instead of jumping directly to GNN.**

**9. Track coverage and information gained per AeroDataBox credit, not just row count.**

**10. Do not claim "global representative sampling" until the coverage dashboard demonstrates it.**

That would make the project substantially more defensible scientifically and much less likely to end up with a model that scores well while silently learning the quirks of the airports and hours you happened to collect.

[1]: https://www.mdpi.com/2226-4310/13/2/161?utm_source=chatgpt.com "Edge-Based GNN for Network Delay Prediction Enhanced by Flight Connectivity"
[2]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[3]: https://www.mdpi.com/2078-2489/15/9/559?utm_source=chatgpt.com "Enhancing Flight Delay Predictions Using Network Centrality Measures"
[4]: https://arxiv.org/abs/2502.04233?utm_source=chatgpt.com "Graph machine learning for flight delay prediction due to holding manouver"
[5]: https://www.ischool.berkeley.edu/projects/2025/air-travel-delay-prediction-feature-engineering-and-ml-approaches?utm_source=chatgpt.com "Air Travel Delay Prediction Feature Engineering and ML Approaches | UC Berkeley School of Information"
[6]: https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2022.884485/full?utm_source=chatgpt.com "Frontiers | Short-Term Nationwide Airport Throughput Prediction With Graph Attention Recurrent Neural Network"
[7]: https://www.sciencedirect.com/science/article/pii/S0957417423022492?utm_source=chatgpt.com "Improving flight delays prediction by developing attention-based bidirectional LSTM network - ScienceDirect"
[8]: https://www.researchgate.net/publication/400641041_Edge-Based_GNN_for_Network_Delay_Prediction_Enhanced_by_Flight_Connectivity?utm_source=chatgpt.com "(PDF) Edge-Based GNN for Network Delay Prediction Enhanced by Flight Connectivity"
[9]: https://link.springer.com/article/10.1007/s44196-025-00932-2?utm_source=chatgpt.com "Prediction and Optimization of Civil Aviation Flight Delays Based on Machine Learning Algorithms | International Journal of Computational Intelligence Systems | Springer Nature Link"
