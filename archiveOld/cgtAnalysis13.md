Yes. I reconstructed the missing answer from both attached files and did another stricter pass over them.

The most important conclusion is:

**Do not start the 31-day / 57,900-credit Phase 6 run yet.**

That is not because the overall architecture is bad. The architecture is fundamentally sound. But I found **more pre-freeze specification gaps than the ten I gave you before**, including some important ones that affect the actual sampling frame and experimental validity.

Your own binding plan says **“collection WAIT until Gate 0 + gates 1–5 pass”**, and the implementation log still has Gate 0 incomplete, the anchor probe incomplete, the post-fix canary not yet proven PASS, Gates 0.5/4/5 pending, and the final FREEZE pending.  

There is also one particularly important issue I found by comparing the implementation to the binding design: the current frame gives **all 4,053 universe-only airports provisional `REGIONAL` status with `traffic_prior=1.0`**. That means your “traffic tier × region” stratification is not currently based on actual traffic tiers for most of the frame. 

So I would separate your situation into:

**Architecture:** yes, continue.

**Engineering canary/preflight:** yes, continue safely with `autoCollect=false`.

**Anchor experimentation and final scientific freeze:** fix the gaps below first.

**31-day experiment:** no, not yet.

---

# 1. First fix the biggest confusion: FIDS and “the population”

You asked:

> Isn't FIDS telling us the population of flights? How can it also tell us which flights belong to the population?

Because a **population is a set of members**, not merely a number.

Suppose at LAX at cutoff 13:30, AeroDataBox FIDS/schedule returns these flight instances:

| Flight instance | Origin | Destination | Scheduled departure |
| --------------- | ------ | ----------- | ------------------: |
| F001            | LAX    | SFO         |               15:00 |
| F002            | LAX    | JFK         |               15:10 |
| F003            | LAX    | ORD         |               15:15 |
| …               | …      | …           |                   … |
| F120            | LAX    | SEA         |               18:00 |

Then:

$$
P_{LAX,13:30}=\{F001,F002,\ldots,F120\}
$$

That **set itself is the population**.

Its population size is:

$$
|P_{LAX,13:30}|=120
$$

So FIDS gives us both things automatically:

* **membership:** F001, F002, …, F120 are the flights that FIDS says belong to the provider-observable population;
* **population count:** there are 120 members.

There isn't a separate magical thing called “population” and then another query telling us who belongs to it.

V3.9 defines exactly this layer: `flight_population` contains one row per `(flight, cutoff)` obtained from AeroDataBox FIDS/schedule. 

Then suppose the webhook actually sends us updates for only 84 of those 120 flights.

That gives:

$$
\text{webhook capture rate}=\frac{84}{120}=70\%
$$

The other 36 do **not** automatically “not exist.”

They existed in the FIDS-defined provider population; we simply failed to capture a webhook observation for them.

That is exactly why V3.9 is so strict about:

> missing observation ≠ nonexistent flight.

---

# 2. Airport population and flight population are completely different

This has also been causing some of the confusion.

Your **airport sampling frame** answers:

> Which airports are allowed to be selected for collection?

Currently that is roughly 4,320 airports in `adb_sampling_frame`. 

Your **flight population** answers:

> At this particular prediction cutoff for a selected airport/window, which flight instances did AeroDataBox's schedule/FIDS layer say were present?

So:

```text
AeroDataBox coverage endpoint
        ↓
AIRPORT universe/frame
        ↓
select airports for a collection window
        ↓
FIDS/schedule for those airport-windows
        ↓
FLIGHT population
        ↓
snapshots
        ↓
later outcomes
```

FIDS is therefore principally being used to establish **flight population**, not the global airport frame.

The airport frame comes from the coverage/feed layer. V3.9 explicitly separates these.  

---

# 3. What exactly is a “flight instance”?

This should actually be defined more explicitly in V3.9. I consider that one of the remaining gaps.

A **flight number is not enough**.

For example:

```text
UA123
```

could operate every day.

These are different flight instances:

```text
UA123 — August 30 — SFO→LAX — scheduled 15:00
UA123 — August 31 — SFO→LAX — scheduled 15:00
UA123 — September 1 — SFO→LAX — scheduled 15:00
```

A **flight instance** means one particular execution of one flight leg.

Think approximately:

```text
operating carrier
+ operating flight number
+ origin
+ destination
+ service date / scheduled time
```

possibly supplemented with provider ID, tail, codeshare information, etc.

This distinction becomes very important because the POST evaluation rule says all observations belonging to the **same flight instance** stay together. 

V3.9 uses “flight instance” but does not give a formal canonical identity key. That should be fixed before freeze.

---

# 4. Observation event vs snapshot vs training example

These are three different things.

## Observation event

An **observation event** is one report that came from the provider.

Imagine UA123 is in the air.

AeroDataBox tells us:

```text
15:40
UA123
lat = ...
lon = ...
altitude = 31,000 ft
ground speed = 465 kt
```

That is **one observation**.

Then AeroDataBox updates us again:

```text
15:45
UA123
lat = ...
lon = ...
altitude = 34,000 ft
ground speed = 472 kt
```

That is another observation.

Then:

```text
15:50
...
```

Another observation.

So the underlying event table can look conceptually like:

| flight_instance | observation time | altitude | speed |
| --------------- | ---------------: | -------: | ----: |
| F001            |            15:40 |   31,000 |   465 |
| F001            |            15:45 |   34,000 |   472 |
| F001            |            15:50 |   35,000 |   475 |

V3.9 deliberately preserves these observations instead of overwriting them with only “latest state.” 

## Snapshot

A **snapshot** is something *we construct* for machine learning.

It means:

> Reconstruct everything the prediction system was allowed to know at one particular prediction time.

So at 15:40 we might build:

| column                | value          |
| --------------------- | -------------- |
| flight_instance_id    | F001           |
| prediction_cutoff     | 15:40          |
| altitude              | 31,000         |
| speed                 | 465            |
| distance_remaining    | 650 NM         |
| departure_delay_known | 32 min         |
| current_weather       | ...            |
| previous_leg_delay    | ...            |
| flight_phase          | airborne_climb |
| prediction_state      | AIRBORNE       |

That row is a **snapshot**.

## Training example

A **training example** is essentially:

$$
X = \text{snapshot features}
$$

plus, after the flight is finished,

$$
y = \text{the thing we wanted to predict}
$$

For example:

```text
X = what was known at 15:40
y = actual remaining time until landing = 85 minutes
```

So:

```text
raw observation
        ↓
feature construction
        ↓
snapshot at prediction cutoff
        ↓
wait for future
        ↓
label/outcome
        ↓
training example = snapshot + label
```

That is why V3.9 says:

**an event is not a prediction state.**

`prediction_state` belongs to the derived snapshot/training example, not the raw provider event. 

---

# 5. What does “cutoff-safe snapshot” mean?

This is one of the most important concepts in your entire project.

A **cutoff** is:

> The exact point in time at which we pretend the prediction was made.

A **cutoff-safe snapshot** means:

> Every feature inside the row genuinely could have been known by that time.

Suppose the prediction cutoff is:

```text
13:30
```

A weather observation available at:

```text
13:12
```

can be used.

A schedule revision available at:

```text
13:25
```

can be used.

A schedule revision that happens at:

```text
13:40
```

cannot.

Even if we build the training dataset three weeks later and our database now knows the 13:40 revision.

That is leakage prevention.

V3.9 goes even further. It says the physical event merely happening before the cutoff isn't enough—the information must have actually reached our system by then. 

So:

$$
\boxed{
\text{feature usable}
\iff
\text{information\_available\_timestamp}
\leq
\text{prediction cutoff}
}
$$

---

# 6. Your airborne example — corrected and explained completely

Use one consistent flight.

Suppose:

```text
Scheduled gate-out: 15:00
Actual gate-out:    15:18
Actual wheels-off:  15:32
Observation:        15:40
Actual wheels-on:   17:05
Actual gate-in:     17:18
```

## What happens at 15:32?

The wheels leave the runway.

The aircraft becomes airborne.

## What happens at 15:40?

Eight minutes later, AeroDataBox gives us a live state.

Maybe:

```text
altitude = 18,000 ft
speed = 370 kt
climbing = yes
lat/lon = ...
```

That is an **airborne observation**.

You asked:

> How is 15:40 airborne if wheels-off happened at 15:32?

Because that's exactly what makes it airborne.

The condition in V3.9 is:

$$
\text{actual wheels-off}
\leq t <
\text{actual wheels-on}
$$

Here:

$$
15{:}32 \leq 15{:}40 < 17{:}05
$$

Therefore the aircraft is airborne at 15:40. 

It has been airborne for:

$$
15{:}40-15{:}32=8\text{ minutes}
$$

---

# 7. Then what is the “85 minute” label?

It is **not** how long the flight has already flown.

It means:

> From the prediction moment at 15:40, how much time remained until the aircraft actually touched down?

Actual touchdown/wheels-on:

```text
17:05
```

Snapshot time:

```text
15:40
```

Therefore:

$$
17{:}05-15{:}40=85\text{ minutes}
$$

So:

$$
\boxed{\text{remaining flight time}=85\text{ min}}
$$

The **total actual airborne time** is instead:

$$
17{:}05-15{:}32=93\text{ minutes}
$$

These are different:

```text
already airborne at snapshot = 8 minutes

remaining after snapshot = 85 minutes

total actual airborne time = 93 minutes
```

At 15:40, the model knows the information in the snapshot.

It **does not know** that touchdown will be 17:05.

Later, after the flight finishes, we learn 17:05.

Then we calculate:

$$
y=85
$$

and attach that as the training label.

That is precisely V3.9's:

$$
\texttt{label\_eta\_landing}
=
\texttt{actual\_wheels\_on}-t
$$



---

# 8. Your Q8 objection was correct — the old 14:05 example was confusing

You said:

> How could a prediction be at 14:05 if the flight already landed at 14:00?

You're right.

That example should **not have involved a landing at all**.

What I was trying to demonstrate was information availability.

Use this instead.

Prediction cutoff:

```text
14:05
```

A schedule/status change has:

```text
event_timestamp          = 14:00
provider_published_utc   = 14:01
received_timestamp_utc   = 14:03
available_at             = 14:07
```

The underlying event happened at 14:00.

But our feature system couldn't use it until:

```text
14:07
```

Our prediction is supposedly made at:

```text
14:05
```

Therefore:

$$
14{:}07 > 14{:}05
$$

so the feature is **forbidden**.

That's all the example is supposed to demonstrate.

The V3.9 document itself gives almost exactly this availability example. 

---

# 9. Network degree: directed, undirected, in-degree and out-degree

Imagine an airport route graph.

Nodes:

```text
LAX
SFO
JFK
ORD
LAS
```

Edges are routes.

For example:

```text
SFO → LAX
JFK → LAX
LAX → ORD
LAX → LAS
```

## Directed graph

Direction matters.

```text
LAX→JFK
```

and

```text
JFK→LAX
```

are different edges.

## Undirected graph

Direction doesn't matter.

Both become:

```text
LAX—JFK
```

## In-degree

Number of distinct airports with edges **into** LAX.

Here:

```text
SFO → LAX
JFK → LAX
```

So:

$$
d_{\text{in}}(LAX)=2
$$

## Out-degree

Distinct destinations from LAX.

```text
LAX → ORD
LAX → LAS
```

Thus:

$$
d_{\text{out}}(LAX)=2
$$

## Undirected degree

Distinct airports connected in either direction.

Here:

```text
SFO
JFK
ORD
LAS
```

Therefore:

$$
d(LAX)=4
$$

---

# 10. Unique destinations vs scheduled route count

These are different.

Suppose LAX→SFO has:

```text
40 scheduled flights/day
```

and LAX→JFK has:

```text
10/day
```

Unique destinations:

```text
SFO
JFK
```

so:

$$
2
$$

Scheduled flight operations:

$$
40+10=50
$$

Those measure different things.

One measures **network breadth**.

The other measures **route frequency/traffic volume**.

---

# 11. Minimum route-frequency threshold

Suppose LAX has a one-off charter to airport XYZ once every six months.

Should that count as a meaningful network connection?

Maybe not.

You could define an edge only when:

$$
\text{scheduled operations during reference period} \ge k
$$

such as:

```text
≥1 per week
```

or:

```text
≥10 operations/month
```

The problem is that **V3.9 doesn't currently specify `k`**.

That is a real pre-freeze gap.

---

# 12. Reference time period

You also need to say:

> Network degree based on what period?

For example:

```text
published schedules covering
2026-07-01 through 2026-07-31
```

rather than mixing:

```text
2024 schedules
2025 schedules
our August 2026 collected sample
```

V3.9 says degree/carrier mix should come from a **fixed reference snapshot**, which is scientifically correct, but the exact source/date/window/formula are not completely pinned down in Part 1. 

---

# 13. Carrier diversity: the different possibilities

Suppose 100 flights at airport A are:

```text
United       85
Delta         5
American      5
Southwest     5
```

Airport B:

```text
United       25
Delta        25
American     25
Southwest    25
```

Both have four carriers.

But airport B is obviously more evenly distributed.

That's why simply saying “number of carriers” isn't always enough.

## Number above threshold

You might define:

> Count carriers accounting for at least 5% of departures.

For airport A:

```text
United 85%
Delta 5%
American 5%
Southwest 5%
```

count = 4.

If threshold were 10%, count=1.

The exact threshold must therefore be defined.

## Shannon entropy

For carrier shares \(p_i\):

$$
H=-\sum_i p_i\ln(p_i)
$$

Higher entropy means traffic is distributed more evenly among carriers.

Airport B would have higher \(H\).

## HHI

$$
HHI=\sum_i p_i^2
$$

Here the interpretation is opposite.

Higher HHI means **more concentrated**.

So airport A's HHI would be much larger.

## Effective number of carriers

A Shannon-based version is:

$$
N_{\text{eff}}=e^H
$$

It asks approximately:

> How many equally sized carriers would produce this amount of diversity?

Another concentration-based convention uses:

$$
N_{\text{eff}}=\frac1{HHI}
$$

You must specify which definition you use.

V3.9 currently says `carrier_diversity*` but does not freeze the metric. That is a genuine gap. 

---

# 14. The anchor system, from the beginning

This is where your order confusion is coming from.

There are **three different selection ideas**:

```text
GLOBAL AIRPORT FRAME
        ↓
STRATIFICATION / DAILY TIER SLOTS
        ↓
ANCHOR HUB SUBSYSTEM
```

They are not competing systems.

## Step A — Build the global frame

You have thousands of eligible airports.

## Step B — Classify them into traffic tier × region

Conceptually:

```text
HUB × North America
MID × North America
REGIONAL × North America

HUB × Europe
...
```

## Step C — A daily batch has four airport slots

Your design is:

```text
1 HUB
2 MID
1 REGIONAL
```

V3.9 Part 1 gives the `{1,2,1}` mix. 

## Step D — What is the 5-airport anchor pool?

Instead of letting the HUB slot bounce randomly among every hub on earth, you maintain a small set of important “reference/core-ish” hubs that are revisited frequently.

The historical implementation detail says the daily HUB slot is the **anchor slot**. 

That relationship should actually be stated explicitly in binding Part 1.

So imagine after probes your five anchors become:

```text
KLAX
EGLL
WSSS
SBGR
OMDB
```

Then daily rotation could be:

```text
Day 1: WSSS
Day 2: KLAX
Day 3: SBGR
Day 4: EGLL
Day 5: OMDB
```

No repeat until all five have been seen.

Then another seeded randomized cycle.

The point is:

> Each important anchor is refreshed approximately every five days instead of one airport being permanently observed every day.

V3.9 explicitly says one anchor/day, five-airport pool, no repeat until all. 

---

# 15. Do we calculate anchor score for all 4,320 airports?

**No—not under the current design.**

The implementation freezes a shortlist of about 12 candidate anchors, probes those, calculates anchor scores for those candidates, then chooses the final five. 

So:

```text
4,320 airport frame
       ↓
anchor candidate shortlist (~12 hub candidates)
       ↓
Stage-1 probe
       ↓
score candidates
       ↓
Stage-2 confirmation
       ↓
final 5
       ↓
daily anchor rotation
```

You are **not** computing live anchor scores for every regional airport.

That would be a different mechanism.

---

# 16. What is the anchor score actually measuring?

Current intended formula:

$$
A_i=
0.40T_i+
0.20G_i+
0.20C_i+
0.20Y_i
$$

where:

* \(T_i\) = externally measured traffic score;
* \(G_i\) = geographic/network diversity;
* \(C_i\) = carrier/international diversity;
* \(Y_i\) = observed yield from standardized probes.

Your implementation log describes exactly this and says the first 80% is fixed reference information while the probe contributes only 20%. 

Why?

Because imagine we did:

```text
probe airport
→ airport happened to have an amazing 2 hours
→ high observed activity
→ choose it as anchor
→ observe it much more
→ obtain even more observations from it
→ conclude it is the most important airport
```

That is a feedback loop.

So only 20% depends on the short live probe.

The other 80% comes from frozen external/reference data.

---

# 17. What are WSSS and OMAA?

They are **airports**.

`WSSS` = Singapore Changi.

`OMAA` = Zayed International Airport, Abu Dhabi.

They are not formulas.

They are not statistical constants.

They are not representative of “Asia” and “Middle East” mathematically.

They are simply airports for which you already had prior observed throughput references, so the design says to remeasure them under the same protocol. 

---

# 18. What does “calibration” mean with WSSS/OMAA?

The word is creating unnecessary confusion because later V3.9 also uses **model probability calibration**, which is completely different.

For anchors, I'd actually rename this:

> **yield reference normalization**

rather than “calibration.”

Suppose all airports are probed for exactly two hours under comparable timing rules.

Measured WSSS:

$$
UF/credit=2.0
$$

Measured EGLL:

$$
UF/credit=1.6
$$

Then:

$$
\frac{1.6}{2.0}=0.80
$$

Meaning:

> Under this measurement protocol, EGLL produced 80% as many unique flights per credit as WSSS.

That's all.

WSSS is being used as the ruler.

It does **not** mean:

```text
WSSS = scientifically ideal airport
```

or:

```text
WSSS = population average
```

or:

```text
every region should behave like Singapore
```

The current implementation uses WSSS as the main reference and OMAA as an alternative/fallback. 

---

# 19. What would “regional normalization” mean?

That would be a different idea.

Suppose you wanted to know:

> Is KLAX unusually productive **relative to North American airports**?

Then you'd need a North American reference distribution.

For example:

```text
North American reference airports:

KLAX
KORD
KJFK
KDFW
KSFO
KATL
...
```

You could estimate:

```text
regional mean
regional SD
regional median
regional quantiles
```

Then perhaps calculate:

$$
z_i=\frac{x_i-\mu_{\text{region}}}{\sigma_{\text{region}}}
$$

or a regional percentile.

Similarly Europe would have its own reference distribution.

But your current anchor score is **not intended to estimate region-relative performance**.

It's trying to select a small global anchor pool.

Therefore regional normalization isn't automatically required.

What **is** required is to stop implying WSSS itself makes the score region-normalized.

It does not.

---

# 20. Variance, SD and CV — what they tell you

Suppose a two-hour probe is divided into eight 15-minute buckets.

These:

```text
20, 22, 18, 21, 19, 20, 21, 19
```

mean:

```text
00:00–00:15 → 20 received flight observations/items
00:15–00:30 → 22
00:30–00:45 → 18
00:45–01:00 → 21
01:00–01:15 → 19
01:15–01:30 → 20
01:30–01:45 → 21
01:45–02:00 → 19
```

They are counts per time bucket.

They are **not eight different flights necessarily**.

They're counts of whatever your stability implementation explicitly counts—in the current implementation, rows/events in 15-minute buckets.

### Mean

Approximately:

$$
\bar{x}=20
$$

So typical throughput is around 20 observations per 15 minutes.

### Variance

Variance measures squared spread around the mean:

$$
s^2=\frac{\sum (x_i-\bar{x})^2}{n-1}
$$

### Standard deviation

$$
s=\sqrt{s^2}
$$

It puts spread back into the original units.

If:

```text
mean = 20
SD = 2
```

then typical counts are only moving roughly a couple observations away from 20.

Something like:

```text
18
20
21
22
19
```

That's steady.

If:

```text
mean = 20
SD = 30
```

then variation is enormous compared with the mean.

Maybe:

```text
0
0
2
1
3
5
130
19
```

Average may still land near 20, but the process is extremely bursty.

---

# 21. CV explains that relative to the mean

Coefficient of variation:

$$
CV=\frac{SD}{\text{mean}}
$$

Case A:

$$
\frac2{20}=0.10
$$

That's 10%.

The typical spread is small relative to average throughput.

Case B:

$$
\frac{30}{20}=1.5
$$

That's 150%.

The SD is one-and-a-half times the mean itself.

Hence enormous relative variability.

Your implementation currently converts CV into:

$$
\text{stability}=\frac1{1+CV}
$$

So:

CV=.10:

$$
\frac1{1.10}=0.909
$$

CV=1.5:

$$
\frac1{2.5}=0.40
$$

That formula is a **custom project engineering choice**, not a law of aviation. Your implementation log confirms that's the formula currently coded. 

---

# 22. What does “yield” mean?

In your collection design:

> **How much useful aviation information does one actual AeroDataBox credit buy?**

Three current components are:

### Unique flights per credit

Breadth.

If 100 credits expose 60 distinct flight instances:

$$
UF/credit=\frac{60}{100}=0.60
$$

Higher means more distinct flights per unit of spend.

### Tail-chain links per credit

Propagation structure.

If tail N123AB flies:

```text
LAX→SFO
SFO→SEA
SEA→DEN
```

there are three legs but:

$$
3-1=2
$$

adjacent chain links:

```text
LAX→SFO  →  SFO→SEA
SFO→SEA  →  SEA→DEN
```

### Stability

How temporally steady the stream is during the probe.

So “yield” isn't “airport quality.”

It's:

> useful data return on collection cost.

---

# 23. Why standardize to [0,1]?

Because these have different units:

```text
unique flights / credit
chain links / credit
stability
```

Before averaging them, you need comparable scales.

The current implementation does:

$$
UF_{std}=
\operatorname{clamp}
\left(
\frac{UF_i}{UF_{WSSS}},
0,
1
\right)
$$

and similarly for chain and stability. 

Then:

$$
Y_i=
\frac{UF_{std}+Chain_{std}+Stability_{std}}{3}
$$

---

# 24. What is `clamp`?

$$
\operatorname{clamp}(x,0,1)
=
\min(1,\max(0,x))
$$

Examples:

```text
0.72 → 0.72
-0.20 → 0
1.40 → 1
```

The concern I have is scientific rather than mathematical:

If an airport genuinely performs **1.40× WSSS**, clamping throws away that distinction and says:

```text
1.00
```

So Part 1 should explicitly justify whether saturation at WSSS=1 is intentional.

Right now the exact transform exists in implementation documentation/code, but binding Part 1 only says “standardized to [0,1].” That needs to be synchronized.

---

# 25. What does “formula frozen before probing” mean?

It does **not** mean you already know the probe results.

It means you decide beforehand:

```text
what metrics to calculate
how to calculate them
what weights to use
what reference airport to use
what thresholds to use
```

Then you collect the data.

For example before seeing EGLL:

```text
anchor_score =
  .40 traffic
+ .20 geography
+ .20 carrier
+ .20 yield
```

After probing EGLL, you plug its measured numbers into that already-existing formula.

You don't look at EGLL first and then say:

> “EGLL happened to look great on stability, so let's make stability 60%.”

That would be outcome-driven design.

---

# 26. REGIONAL Regime 1 and Regime 2

This is much simpler than the terminology makes it sound.

## Regime 1 — before any yield history exists

Suppose today's eligible regional airports are:

```text
R1
R2
R3
R4
```

We know nothing meaningful about their collection yield yet.

So:

$$
p_i=\frac14=0.25
$$

Each gets 25%.

That's **uniform random selection**.

## Regime 2 — after evidence exists

Later we have some history.

Suppose scores immediately before today's draw are:

```text
R1 = 1.0
R2 = 0.5
R3 = 1.5
R4 = 1.0
```

Total:

$$
1+.5+1.5+1=4
$$

Therefore:

$$
p_{R1}=1/4=.25
$$

$$
p_{R2}=.5/4=.125
$$

$$
p_{R3}=1.5/4=.375
$$

$$
p_{R4}=1/4=.25
$$

Then randomly draw one according to those probabilities.

V3.9 gives this concept but does **not** completely specify the update formula that turns yesterday's yield history into tomorrow's \(m_i\). That's one of the important gaps I found. 

---

# 27. What does “conditional probability at that precise draw” mean?

Let's make the state explicit.

Let:

$$
S_t=
\{
E_t,\,
m_t,\,
r_t,\,
h_t
\}
$$

where:

* \(E_t\) = airports eligible today;
* \(m_t\) = adaptive multipliers immediately before draw;
* \(r_t\) = reference/base scores;
* \(h_t\) = all history already allowed to affect the rule.

Then the probability is better written:

$$
P(I_t=i\mid S_t)
=
\frac{r_i m_i}
{\sum_{j\in E_t}r_jm_j}
$$

So when the database stores:

```text
airport_layer_design_probability = 0.25
```

it means:

> Given the exact eligible airport set and adaptive state immediately before this draw, this airport had a 25% probability of being selected.

Tomorrow \(S_{t+1}\) can change.

Therefore tomorrow's probability can change too.

---

# 28. Why can tomorrow's yield score change?

Suppose R3 was selected today.

Today it produces:

```text
high unique-flights/credit
good tail chains
steady stream
```

The adaptation rule may increase its multiplier.

Tomorrow:

```text
m_R3
```

could be somewhat larger.

Or suppose it repeatedly produces zero useful observations.

Its multiplier could decrease.

That's how history enters the next day's state.

But—and this is important—**Part 1 currently doesn't precisely specify this update function.**

It says:

```text
m_i ∈ [0.25, 1.5]
yield-aware
```

but it does not fully pin down:

```text
m_{i,t+1} = f(m_{i,t}, yield, zero-yield history, ...)
```

That must be frozen before adaptive selection starts.

---

# 29. Why bound \(m_i\)?

Because of runaway reinforcement.

Imagine no cap.

```text
Day 1:
R1 randomly gets a great two hours
```

System increases R1 probability.

```text
Day 2:
R1 now gets selected more often
```

Because R1 gets selected more often, it accumulates more evidence and more opportunities to produce good observations.

Then:

```text
probability ↑
→ observations ↑
→ apparent evidence ↑
→ probability ↑
→ observations ↑
...
```

Eventually R1 could dominate.

That's the feedback loop.

Bounding:

$$
0.25\le m_i\le1.5
$$

means no airport can explode arbitrarily upward or be crushed to almost zero.

V3.9 explicitly says this is **efficiency-oriented**, not representation-preserving. 

---

# 30. What is \(1/p\) actually for?

It does **not** change tomorrow's selection probability.

This was the main misunderstanding.

Suppose a valid randomized population sample has:

```text
Airport A: p = .10
Airport B: p = .50
```

A is hard to sample.

B is sampled much more often.

If both happen to be selected, inverse probability weights are:

$$
w_A=\frac1{.10}=10
$$

$$
w_B=\frac1{.50}=2
$$

This tells the **analysis**:

> An observation from rarely selected A represents more of the underlying design mass than an observation from frequently selected B.

It does not mean A gets selected 10 times tomorrow.

Selection and weighting happen at different stages:

```text
DESIGN:
p determines who gets selected

AFTER DATA EXISTS:
1/p can be used as an analysis weight
```

---

# 31. Horvitz–Thompson estimator

For a population total:

$$
\hat{Y}_{HT}
=
\sum_{i\in sample}
\frac{y_i}{\pi_i}
$$

where:

* \(y_i\) = observed outcome;
* \(\pi_i\) = known inclusion probability.

Rare units receive larger inverse-probability contribution.

This is classic survey-sampling theory.

But V3.9 correctly refuses to automatically use it for flight rows.

Why?

Because the airport-selection probability isn't the same as the probability of a **flight training row** appearing.

---

# 32. Why “airport selected” ≠ “flight row included”

You're right that a flight row generally involves an airport being selected somewhere in the mechanism.

But that is only the **first step**.

For a flight training row to exist, you need something more like:

$$
P(\text{flight row})
=
P(\text{airport selected})
\times
P(\text{flight in FIDS population}\mid ...)
\times
P(\text{relevant features captured}\mid ...)
\times
P(\text{snapshot eligible}\mid ...)
\times
P(\text{label observed}\mid ...)
\times \cdots
$$

Even if airport LAX was selected, a particular flight could still:

```text
exist in FIDS
but never produce a useful webhook update
```

or:

```text
be captured
but have unusable trajectory points
```

or:

```text
produce a snapshot
but have no final outcome
```

or:

```text
be affected by dedup/join/identity problems
```

Therefore:

$$
p_{\text{airport}}
\ne
p_{\text{flight training row}}
$$

That's why V3.9 keeps:

```text
sampling_weight = NULL
```

instead of pretending:

$$
w_{\text{flight}}=\frac1{p_{\text{airport}}}
$$



---

# 33. Which things are tables and which things are columns?

Conceptually:

| Object                      | Type  | What it stores                          |
| --------------------------- | ----- | --------------------------------------- |
| `adb_sampling_frame`        | table | airports                                |
| `adb_collection_batches`    | table | collection windows/batches              |
| `adb_collection_subs`       | table | airport subscriptions within batches    |
| `adb_ingest_events`         | table | immutable webhook delivery/audit ledger |
| `flight_events`             | table | individual flight observations          |
| `flight_state`              | table | latest known state per flight           |
| `flight_population`         | table | population membership at cutoffs        |
| `flight_snapshots`          | table | PRE ML feature rows                     |
| `flight_airborne_snapshots` | table | AIRBORNE ML feature rows                |
| `flight_outcomes`           | table | eventual labels/outcome states          |
| `historical_feature_store`  | table | as-of historical feature values         |

Inside those are **columns** such as:

```text
flight_instance_id
prediction_cutoff
altitude
airport
scheduled_gate_out
actual_gate_out
sampling_strategy
available_at
label_eta_landing
...
```

V3.9 explicitly treats the S-layer tables as first-class parts of the research architecture. 

This means one sentence in the implementation log saying essentially “the only true data table is `flight_data_pre_post`” should now be corrected—the S-layer tables are also research data products, not merely audit metadata. 

---

# 34. Why does the language feel like your database/data-science classes?

Because V3.9 mixes several disciplines.

### Database systems / data engineering

Terms like:

```text
immutable
append-only
upsert
dedup
schema
migration
foreign key
hash
provenance
idempotent
constraint
```

That's DBMS/data-engineering language.

### Temporal databases / stream processing

```text
event time
publish time
receive time
availability time
as-of query
cutoff
```

### Statistics / survey sampling

```text
population
sampling frame
stratum
conditional probability
IPW
Horvitz–Thompson
variance
bootstrap
```

### Experimental design

```text
randomization
crossover
blocking
treatment
experimental unit
matched pair
```

### Machine learning

```text
feature
label
train
validation
test
leakage
ablation
calibration
generalization
```

### Aviation operations

```text
gate-out
wheels-off
wheels-on
gate-in
ETA
tail
rotation
ATC
METAR
TAF
```

### Graph/network science

```text
node
edge
degree
GNN
adjacency
edge mask
propagation
```

So your memory is correct: a lot of V3.9 sounds like database and statistics material because it genuinely combines those fields.

---

# 35. Why can't a raw event itself be a prediction state?

Because one event can be reused in multiple derived prediction examples.

Suppose a provider observation arrives at:

```text
14:10
```

That fact is simply:

> At 14:10 the provider reported X.

Later our ETL may use that observation in:

```text
an airborne ETA snapshot
a congestion feature
a tail-state feature for another flight
a staleness calculation
```

The raw event shouldn't be permanently stamped:

```text
prediction_state = AIRBORNE
```

as though it has only one modeling purpose.

Instead:

```text
RAW EVENT
    ↓
derived snapshot A → prediction_state=AIRBORNE
derived snapshot B → perhaps context for another task
```

That's why V3.9 puts `prediction_state` on the snapshot/training example. 

---

# 36. What does “FAA-ASPM-style” mean?

ASPM is FAA aviation operational-performance terminology.

The familiar OOOI milestones are:

```text
OUT = aircraft leaves gate / gate-out
OFF = wheels leave runway / takeoff
ON  = wheels touch runway / landing
IN  = aircraft reaches arrival gate
```

V3.9 stores scheduled and actual versions:

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



The important thing is that AeroDataBox's field called `scheduledTime` cannot simply be assumed to mean one particular FAA milestone.

V3.9 correctly requires actual field-semantics verification before freeze. 

---

# 37. Flight phase and “ETA error”

Suppose at 15:40 the model predicts:

```text
landing = 17:15
```

Actual touchdown later becomes:

```text
17:05
```

The ETA error is:

$$
17{:}15-17{:}05=+10\text{ minutes}
$$

Meaning:

> The model predicted landing ten minutes too late.

Now compare two situations.

Flight A:

```text
just took off
800 NM remaining
```

Flight B:

```text
descending
20 NM remaining
```

A ten-minute prediction error is much less surprising for Flight A because there's much more uncertainty remaining.

Flight B should usually be easier.

That's why you retain:

```text
airborne_climb
airborne_cruise
airborne_descent
approach
...
```

and/or remaining-distance/time.

V3.9 says not to pool “ETA 10 min after takeoff” with “ETA 100 NM from destination” as though the prediction difficulty is identical. 

---

# 38. What is trajectory QC?

QC = **quality control**.

Suppose the provider emits:

```text
15:40 lat 34.2 lon -118.4 altitude 30,000
15:45 lat 35.1 lon -117.8 altitude 32,000
15:50 lat 200.0 lon -900.0 altitude -400,000
```

The third point is physically impossible.

Trajectory QC checks things like:

```text
valid latitude −90…90
valid longitude −180…180
plausible speed
plausible altitude
timestamps correctly ordered
reasonable trajectory gaps
flight identifiers join correctly
```

You preserve the original raw point for provenance.

But the cleaned trajectory can flag or exclude impossible values.

That is exactly V3.9's:

```text
raw_airborne_events
→ clean_airborne_points
→ flight_trajectory
→ flight_airborne_snapshots
```



---

# 39. What does `observed` mean in outcome state?

At present V3.9 says roughly:

```text
observed = operational timing exists
```

for the regression label. 

But I found a tightening needed here.

You now have different targets:

```text
landing delay requires actual_wheels_on

gate-arrival delay requires actual_gate_in
```

So one generic:

```text
observed
```

flag isn't sufficient.

A flight could have:

```text
actual_wheels_on = known
actual_gate_in = missing
```

It is observed for the **landing-delay task**, but not for the **gate-arrival task**.

So V3.9 should define target-specific label availability, for example:

```text
landing_label_observed
gate_arrival_label_observed
departure_gate_label_observed
departure_runway_label_observed
```

That is another gap beyond my original ten.

---

# 40. Crossover experiment, in plain language

The “treatment” is:

```text
window shape
```

For example:

```text
4 continuous hours
```

versus:

```text
2 hours + 2 hours
```

You don't want to compare:

```text
Monday:
LAX, JFK, ORD
08:00–12:00
4h
```

against:

```text
Friday:
small airports
20:00–22:00 + 03:00–05:00
2×2h
thunderstorm
```

because differences could come from airport/time/weather instead of window shape.

A crossover design tries to hold much of the template constant and swap treatment.

For example:

```text
Crossover block C17

Period 1:
Template A → 4h
Template B → 2×2h

Period 2:
Template A → 2×2h
Template B → 4h
```

The assignment is randomized before observing results.

Your scheduler contract refuses broken crossover structures so later nobody accidentally compares incompatible days. 

---

# 41. What is an “Engine”?

An engine is **not another machine-learning algorithm**.

It's an **evaluation scenario / split rule**.

Suppose you train XGBoost.

You can ask different questions about the same XGBoost:

| Engine | Question                                                    |
| ------ | ----------------------------------------------------------- |
| A      | Does it predict later/future data reasonably?               |
| B      | Does it generalize to an airport never seen in training?    |
| C      | Does it generalize to a region never seen?                  |
| D      | Does it work on unseen aircraft/tails?                      |
| E      | Does it survive major disruptions?                          |
| R      | Does it generalize to unseen origin-destination routes?     |
| P      | How does collected sample compare with provider population? |
| POST   | How does the airborne model generalize?                     |

These are evaluation designs.

V3.9 defines them this way. 

---

# 42. “Every model reported twice on Engine A and E”

Suppose:

```text
Model −1 = persistence
Model 1 = XGBoost
Model 2 = XGBoost + weather
```

Each gets measured under ordinary future deployment conditions:

```text
Engine A
```

and disruption stress:

```text
Engine E
```

So you might see:

| model       | Engine A MAE | Engine E MAE |
| ----------- | -----------: | -----------: |
| persistence |         18.2 |         37.4 |
| XGBoost     |         14.7 |         35.5 |
| XGB+weather |         13.9 |         29.2 |

You might discover:

> Weather helps a little normally but helps massively during disruptions.

That's why the evaluations remain separate.

---

# 43. T−24, T−6 and T−90 are different prediction problems

Imagine scheduled gate-out is 15:00.

If \(T\) is defined as scheduled gate-out:

```text
T−24h = previous day 15:00
T−6h  = 09:00
T−90m = 13:30
```

At T−24 the model has little operational information.

At T−90 it may know:

```text
earlier rotation delay
recent airport congestion
updated schedule
more recent weather
```

So performance should be reported separately.

V3.9 leaves open whether to train:

```text
M24
M6
M90
```

separately, or one shared model with:

```text
horizon_hours
```

as a feature. 

The **modeling experiment** can remain open.

But the definition of what milestone \(T\) means cannot.

That must be frozen before collection.

---

# 44. Missing edge ≠ zero edge

Suppose your graph includes airport connectivity.

You don't see:

```text
LAX → XYZ
```

There are two possibilities.

### Known absent

You had complete schedule data for LAX and XYZ for the relevant period and verified no route exists.

Then:

```text
edge = 0
edge_known = 1
```

### Unknown

You never adequately observed XYZ or the schedule source was missing.

Then:

```text
edge value = missing/unknown
edge_known = 0
```

If your GNN changes unknown into:

```text
0
```

it learns:

> places we failed to collect appear disconnected.

That means it is modeling **your data-acquisition pattern** rather than aviation.

V3.9 explicitly warns about this. 

---

# 45. Why train earlier and test later?

For this project, that's generally more realistic than a random split.

Real deployment works:

```text
past → train
future → predict
```

A random split could do:

```text
Aug 17 flight → train
Aug 3 flight → test
Aug 20 flight → train
Aug 12 flight → test
```

which does not simulate deployment.

Chronological evaluation instead asks:

> If I only had the past, how well would I have done on later flights?

The danger isn't “training earlier/testing later.”

The danger is letting highly related observations cross the boundary.

That's why blocking exists.

---

# 46. Why all snapshots from one airborne flight stay together

Suppose one flight instance produces:

```text
15:40 snapshot
15:45 snapshot
15:50 snapshot
```

Those rows are almost the same physical event.

They share:

```text
same aircraft
same route
same weather episode
same departure delay
same eventual landing
same flight trajectory
```

If:

```text
15:40 → training
15:50 → test
```

the model has effectively already seen that flight.

That's overly easy.

Instead:

```text
Flight F001
15:40
15:45
15:50
```

all go to train, or all go to validation, or all go to test.

That requires a reliable **flight_instance_id**, which is why I added flight-instance identity to the gap list. 

---

# 47. What does blocking mean?

Blocking means:

> Keep related observations together instead of pretending they're independent.

For Engine E:

```text
entire hurricane/disruption event
```

belongs in one partition.

For Engine D:

```text
all observations from tail N123AB
```

belong together.

For POST:

```text
all observations from one flight instance
```

belong together.

It protects evaluation from leakage.

---

# 48. What is the Engine-A test protection?

You tune models on:

```text
training set
```

You make model/hyperparameter decisions using:

```text
validation set
```

The final test should remain untouched.

If you continually look at test performance and modify the model:

```text
test
→ adjust model
→ test
→ adjust
→ test
```

then the test has effectively become another validation set.

So V3.9 intends to:

```text
freeze final test definition
hash it
make it read-only
do not use it for tuning
```



However, I found an actual logical issue in the runbook:

**Phase 5 currently says to materialize and hash the Engine-A test rows before Phase 6 collection has produced those rows.**

That ordering needs to be fixed.

The correct approach is:

```text
BEFORE COLLECTION:
freeze + hash the test-assignment RULE / dates / grouping / seed

AFTER COLLECTION, BEFORE MODEL TUNING:
materialize actual rows using that already-frozen rule
hash actual test row IDs
lock them
```

That is a new important gap.

---

# 49. What is block-bootstrap CI?

A confidence interval for model performance tells you:

> Given this finite observed sample, how uncertain is our estimated performance metric?

Suppose measured MAE:

```text
14.2 min
```

A bootstrap may produce something like:

```text
95% CI: 12.8–15.9 min
```

But flights on the same day are correlated.

So instead of independently sampling individual rows, you might resample whole:

```text
calendar days
```

or whole:

```text
disruption events
```

That's **block bootstrap**.

V3.9 specifies the concept, but it does not pin down:

```text
CI level
number of bootstrap replicates
exact block unit by engine
```

Those should be frozen.

---

# 50. What is rolling-origin evaluation?

Imagine 31 ordered days.

Instead of one split, you repeatedly move the training boundary:

```text
train days 1–10 → test 11–12

train days 1–12 → test 13–14

train days 1–14 → test 15–16
...
```

The origin “rolls” forward.

It measures whether conclusions are stable over multiple future periods.

But 31 days are still only a short pilot, which is why V3.9 correctly refuses to call this seasonal validation. 

---

# 51. Collection-mechanism ablation

Suppose your model has features such as:

```text
actual airport delay
weather
previous-leg delay

AND

coverage_age
notification_count
observation_density
sampling_strategy
subscription metadata
```

The second group says a lot about **how you bought the data**.

Maybe the model looks excellent because it learns:

> Airports we collect heavily are usually big/busy/problematic.

So V3.9 reruns the model after removing collection-mechanism features.

If performance remains strong:

> Good evidence model understands aviation.

If performance collapses:

> Model may have learned collection artifacts.

That's what this ablation is testing. 

---

# 52. Staleness curve

Suppose prediction cutoff:

```text
16:00
```

Latest relevant airport observation:

```text
15:50
```

Then:

$$
state\_age=10\text{ min}
$$

For another airport:

```text
latest observation = yesterday 16:00
```

Then:

$$
state\_age=24h
$$

Now calculate error separately for:

```text
≤10 min old
10–30 min
30–60 min
1–3 h
3–6 h
...
```

You might discover:

```text
fresh state     MAE = 11 min
6h stale state  MAE = 14 min
24h stale       MAE = 21 min
```

Now you can answer:

> Is another refresh worth spending credits on?

That's the point of the staleness curve. 

---

# 53. Collection-regime robustness

Suppose the model is trained mostly on flights captured during continuous 4h windows.

Does it still work on data captured during:

```text
2×2h windows?
```

Test:

```text
train = 4h regime
test  = 2×2h regime
```

If performance collapses, the model may have learned collection-specific patterns.

Same later for event-driven collection.

This is not another model.

It's a robustness evaluation. 

---

# 54. Two meanings of “calibration”

This deserves explicit renaming in your plan.

## Anchor calibration

Better name:

> **yield reference normalization**

WSSS/OMAA measurement comparison.

## Probabilistic model calibration

Suppose the model predicts:

```text
P(delay >15 min) = 0.70
```

for 1,000 flights.

Among flights receiving approximately 70% predictions, around:

```text
700 / 1000
```

should actually have >15-minute delays.

That's well-calibrated probability prediction.

Probabilistic calibration is **not incorrect**.

What would be incorrect is:

> using the final test to tune/calibrate the model.

V3.9 explicitly wants predicted delay probabilities and calibration metrics. 

---

# 55. Reliability diagram and ECE

Group predictions into probability ranges.

For example:

| predicted probability bin | mean predicted | actual delayed |
| ------------------------- | -------------: | -------------: |
| 0–10%                     |           0.07 |           0.08 |
| 10–20%                    |           0.16 |           0.14 |
| 70–80%                    |           0.74 |           0.71 |
| 90–100%                   |           0.94 |           0.78 |

A perfect model would have points near:

$$
y=x
$$

So predictions of 70% correspond to roughly 70% observed frequency.

ECE = Expected Calibration Error.

Conceptually:

$$
ECE=\sum_b
\frac{n_b}{N}
|
accuracy_b-confidence_b
|
$$

Smaller is better.

V3.9 does not specify the ECE binning convention. That belongs in the predeclared evaluation spec.

---

# 56. Brier score

For a binary event:

```text
delay >15?
```

actual:

$$
y\in\{0,1\}
$$

predicted probability:

$$
p
$$

Brier score:

$$
BS=\frac1N\sum(p_i-y_i)^2
$$

Lower is better.

Example:

Prediction:

```text
p=.90
```

flight really delayed:

```text
y=1
```

error:

$$
(.90-1)^2=.01
$$

Prediction:

```text
p=.90
```

but not delayed:

$$
(.90-0)^2=.81
$$

That confident wrong prediction is heavily penalized.

---

# 57. Prediction interval vs confidence interval

These are very different.

## Prediction interval

For **one future flight outcome**.

Example:

```text
Predicted arrival delay: 24 min
90% prediction interval: 5–53 min
```

It says:

> We believe the realized delay for this future flight will fall in this range with the stated coverage target.

## Confidence interval

Uncertainty about an estimated statistic.

Example:

```text
test MAE = 14.2 min
95% confidence interval = 12.8–15.9
```

This asks:

> How uncertain are we about the model's estimated average performance?

One is about a **future observation**.

The other is about an **estimated parameter/metric**.

---

# 58. Interval coverage and interval width

Suppose the model issues 90% prediction intervals for 1,000 flights.

If 893 actual outcomes fall inside:

$$
coverage=\frac{893}{1000}=89.3\%
$$

Close to the desired 90%.

Width:

```text
Flight A interval: 10–30 → width 20
Flight B interval: 15–65 → width 50
```

Narrower is generally more useful **provided coverage remains correct**.

A useless interval:

```text
−500 to +500 minutes
```

would have enormous coverage but no precision.

So you examine coverage and width together.

---

# 59. There is a calibration/interval inconsistency in V3.9

This is another thing I would fix.

§13.1 says essentially every model should report interval coverage and conformal intervals. 

But §20 says Month 1 does **not** switch on advanced conformal methods. 

Those statements need reconciliation.

Either:

```text
Month 1:
probability calibration + basic uncertainty only;
conformal intervals deferred
```

or specify a simple frozen Month-1 interval procedure.

Don't leave both interpretations active.

---

# 60. What is “tail performance”?

Here “tail” does **not** mean aircraft registration.

It means the statistical tail of severe outcomes.

V3.9 says:

```text
delay ≥60 min
delay ≥120 min
```

So you separately inspect performance on very delayed flights.

But “tail performance” needs an exact metric.

For example:

```text
MAE among ≥60m delays
recall for ≥60m delay detection
Brier for P(delay≥60)
```

Right now the phrase is too vague.

---

# 61. Marginal value per credit

Two very different quantities.

## Feature contribution

Suppose full model:

```text
MAE = 13 min
```

Without weather:

```text
MAE = 15 min
```

Weather feature contribution:

```text
2 minutes of MAE improvement
```

This tells you:

> Weather helps the model.

It doesn't tell you what airport to spend credits on.

## Collection marginal value

Suppose another collection intervention costs:

```text
500 credits
```

and validation MAE changes:

```text
14.0 → 13.5
```

Then you can describe a cost-normalized improvement.

Conceptually:

$$
MV=
\frac{\Delta M}
{\Delta credits}
$$

V3.9 keeps these separate. 

---

# 62. “Breadth” / unique flights

Breadth means:

> How many different things did the collection cover instead of repeatedly observing the same tiny subset?

For example:

Dataset A:

```text
10,000 rows
200 unique flights
```

Dataset B:

```text
10,000 rows
5,000 unique flights
```

B has much greater **flight breadth**.

Likewise:

```text
unique airports
unique routes
unique tails
unique regions
```

measure different forms of coverage breadth.

---

# 63. Does one flight's POST information become a PRE feature for the next flight?

**Yes—but carefully.**

This is actually central to your delay-propagation design.

Suppose tail:

```text
N123AB
```

flies:

```text
Leg 1: LAX→SFO
Leg 2: SFO→SEA
```

Leg 1 lands late.

For Leg 1 itself:

```text
actual landing
```

must never leak backward into Leg 1's earlier prediction snapshots.

But once Leg 1 has landed, and our system has received that information, it can become a **previous-leg feature** for predicting Leg 2.

Example:

```text
Leg 1 actual gate-in = 13:45
our system knows it  = 13:47

Leg 2 prediction cutoff = 14:00
```

Since:

$$
13{:}47\le14{:}00
$$

Leg 2 can use:

```text
previous_leg_arrival_delay
```

That's delay propagation.

V3.9 explicitly says previous-leg features may be used only if the previous leg landed **and** the arrival value was available by the later flight's cutoff. 

---

# 64. Three-leg and four-leg chains

Same tail:

```text
Leg 1: LAX→SFO
Leg 2: SFO→SEA
Leg 3: SEA→DEN
```

That's a **3-leg chain**.

Adjacent propagation links:

```text
L1→L2
L2→L3
```

so:

$$
3-1=2
$$

links.

Four legs:

```text
L1→L2→L3→L4
```

produces:

$$
4-1=3
$$

adjacent links.

Why care?

Because a delay can propagate:

```text
L1 late
→ L2 late
→ L3 late
→ L4 late
```

and your hypothesis is that continuous 4h collection preserves more of those sequences. V3.9 explicitly requires 3-leg/4+-leg and chain-completeness diagnostics. 

---

# 65. Chain completeness

Conceptually:

$$
\text{chain completeness}
=
\frac{
\text{successfully linked legs}
}{
\text{legs for which a successor should have been observable}
}
$$

Suppose 100 leg transitions should theoretically have been observable in your collection window.

You successfully reconstruct 72.

Then:

$$
72/100=72\%
$$

But the phrase:

> “should have had a successor in-window”

needs a more precise operational definition:

```text
maximum turnaround gap?
same registration?
same date?
how treat airport mismatch?
what if successor begins just beyond window?
codeshare?
registration missing?
```

That's another pre-freeze item.

---

# 66. Are the old SDSU/SJSU papers outdated?

No—their age alone does not invalidate their findings.

More importantly, I checked newer work.

A **2024 Transportation Research Part E systematic review** synthesizes delay-propagation research over decades and explicitly describes two major perspectives: **flight-chain-based propagation and airport-network-based propagation**, while also discussing GNNs, complex networks and diverse operational data. ([ScienceDirect][1])

And a **May 2026 Information Fusion paper** proposes a hypergraph flight-delay model that combines schedules, origin-destination networks and weather, and explicitly models high-order flight relationships including sequential relationships used to capture delay propagation. ([ScienceDirect][2])

So the core direction in V3.9—

```text
previous-flight chains
OD/routes
airport network structure
weather
temporal state
graph-based modeling as a hypothesis
```

—is not an obsolete 2019 idea.

It remains actively consistent with 2024–2026 literature.

But there is a very important distinction:

**Research supports the concepts. It does not certify your exact custom constants.**

Research does not prove that these exact choices are universal truths:

```text
1 HUB + 2 MID + 1 REGIONAL
five anchors
40/20/20/20 anchor weights
WSSS normalization
60 rows/hour capacity threshold
m ∈ [.25,1.5]
six UTC blocks
1,900 credits/day
```

Those are project-specific design decisions that have to be prespecified, justified, measured and reported honestly.

---

# 67. Now the most important part: the complete pre-freeze audit

After re-reading the binding Part 1, its revision/adjudication record, and the actual implementation log, I would **not** say “there are definitely no more conceivable gaps.”

No serious experiment can guarantee that—real data can always reveal unexpected provider or engineering problems.

What I *can* say is:

> These are the remaining specification/implementation gaps I can identify now that should either be resolved before the scientific run, or explicitly declared as later experimental unknowns.

## A. Must be resolved before the real Phase-6 collection starts

1. **Reclassify the 4,053 `unclassified` airports.** Current implementation puts all of them into provisional `REGIONAL`, which is not valid evidence that they are actually traffic-tier regional airports. This directly affects your primary strata. 

2. **Freeze the traffic-tier definition itself:** traffic metric, source, thresholds for HUB/MID/REGIONAL, reference date/window, and treatment of airports with insufficient traffic reference data.

3. **Freeze macro-region assignment.** Current implementation maps many airports using ICAO first-letter logic. Validate exceptions and freeze exact region lookup/version; don't leave geography heuristic-dependent. The implementation log itself still described region-mapping freeze as open. 

4. **Resolve PRE vs POST airport eligibility.** Current controller filters the sampling frame to `post_eligible=true`, but your integrated project also requires FIDS/schedule-based PRE population. Define whether core sampled airports must satisfy both `pre_eligible && post_eligible`, or whether PRE and POST use distinct slot/frame logic. 

5. **Define `flight_instance_id` canonically:** operating carrier, operating flight number, date, origin/destination, provider ID, codeshares, retiming, tail, fallback collision handling.

6. **Define codeshare handling.** One physical flight advertised under multiple flight numbers must not accidentally become several “unique flights.”

7. **Define the FIDS population query protocol:** arrivals/departures/both, query interval, exact airport-window boundaries, pagination, deduplication, codeshares, cancellations, schedule revisions, diversions.

8. **Define how `(flight, cutoff)` population history is obtained.** You must preserve the FIDS/schedule state *as it existed at T−24/T−6/T−90*, not query a later final schedule and pretend it was historical.

9. **Calculate the actual maximum FIDS REST budget.** Freeze number of airports × FIDS calls × horizons/windows × validation calls × retry contingency and verify it fits the ~1,000-unit REST line.

10. **Define exactly what `T` means for T−24/T−6/T−90.** Scheduled gate-out is one defensible choice, but Part 1 must explicitly say which scheduled milestone is the anchor.

11. **Finish/verify the eight AeroDataBox→OOOI milestone mappings.** V3.9 already requires this before schema freeze. 

12. **Freeze timestamp semantics and sanity checks:** `event_timestamp`, `provider_published_utc`, `received_timestamp_utc`, `available_at`, including what happens when one is missing or clocks appear out of order.

13. **Freeze the censoring grace interval.** It is still written as a proposal measured at Gate 0.5. 

14. **Freeze `airborne_usable` point threshold \(N\).** It still says proposal ≥2/≥5. 

15. **Freeze trajectory-completeness definition:** exact completeness %, maximum permitted gap, required duration/route coverage, treatment of missing endpoints.

16. **Freeze observation-cadence policy:** desired cadence, minimum acceptable cadence, maximum gap and fail/warn behavior. V3.9 says to define these but doesn't currently give values. 

17. **Make outcome availability target-specific.** `observed` cannot mean the same thing for wheels-on delay and gate-in delay.

18. **Resolve the zero-yield contradiction.** Binding Part 1 says repeated zero-yield is down-weighted while persistent zero-yield is excluded from adaptive evidence, whereas historical text says persistent zero-yield drives adaptation and repeated does not. Part 1 must state one exact rule. 

19. **Freeze the complete adaptive REGIONAL update equation:** \(m_{i,t+1}=f(...)\), yield-history window, smoothing, zero-yield handling, cold start, reset policy, update timing.

20. **Define the “coverage floor” mechanism mathematically:** how often long-tail airports are forced/eligible, interaction with adaptive selection and no-starvation guarantee.

21. **Freeze `network_degree`:** directed/undirected, in/out/total, unique routes vs frequency, minimum route threshold, source, reference window.

22. **Freeze `carrier_diversity`:** carrier count/entropy/HHI/effective count, denominator, operating vs marketing carrier, reference window.

23. **Freeze international/domestic mix:** what counts international, numerator/denominator, operating legs vs scheduled flights, reference window.

24. **Freeze exogenous traffic score:** source, reference period and normalization.

25. **Freeze geographic/network diversity score:** exact input and formula.

26. **Freeze carrier/international diversity score:** exact combination/formula.

27. **Move the exact anchor-yield standardization into binding Part 1.** Current code uses WSSS normalization + clamping; Part 1 only says standardized `[0,1]`. 

28. **Decide whether WSSS values above 1 should be clipped.** If clamp is retained, state why sacrificing differentiation above WSSS is intentional.

29. **Define WSSS vs OMAA roles explicitly:** primary denominator, fallback, diagnostic secondary reference, and what happens if either probe is invalid.

30. **Rename anchor “calibration” to something such as `yield_reference_normalization`** to prevent confusion with probabilistic model calibration.

31. **Put the exact stability function into Part 1:** current implementation uses 15-minute buckets and \(1/(1+CV)\); currently that's implementation detail, not explicit binding math.

32. **Put the exact anchor shortlist into binding pre-probe manifest**, not merely implementation prose.

33. **Freeze matched probe timing:** exact definition of `time-class` and `weekday-class` and how candidate probe slots are assigned.

34. **Freeze Stage-2 protocol:** exact number promoted, exact duration. Implementation says four hours; Part 1 only says “top ~5–6” and “longer.”

35. **Freeze/justify the capacity gate.** Implementation uses `rows_per_hour ≥ 60`; Part 1 merely says capacity gate. 

36. **Explicitly state in Part 1 that the rotating anchor occupies the single HUB slot.** This exists in historical/implementation material, but Part 1 presents tier mix and anchor separately. 

37. **Freeze HUB/MID selection logic.** Current implementation uses deterministic “freshest-first”; this needs to be in the binding spec along with recent-exclusion/tie-breaking rules. 

38. **Freeze crossover identities and periods:** exact `crossover_group`, period 1/2, treatment assignment algorithm, matching criteria, what constitutes incomplete block.

39. **Define environmental-context variables exactly:** weather severity algorithm, ATC program source/flag rules, storm-track source and encoding. Part 1 currently names them but doesn't fully define them. 

40. **Freeze UTC scheduler tie-breaking.** If two valid permutations have the same imbalance score, exact deterministic seeded tie resolution should be specified.

41. **Decide whether local-time and region terms participate in scheduler optimization.** Historical sections say they “may” be included; the executable rule should contain no optional ambiguity.

42. **Define “core coverage age ≤5 days.”** Which airports are “core”? Anchors only? HUBs? another set?

43. **Freeze the fixed reference snapshot used for traffic/degree/carrier variables:** data source, effective date, version/hash.

44. **Finish historical-feature-store bootstrap specification:** exact lookback window for recent airport delay, route delay, tail delay, utilization, etc., plus formal `history_ready_at` criterion. V3.9 already says this bootstrap is mandatory. 

45. **Freeze weather-source precedence and joining rules:** METAR/TAF/GFS/ERA5 source priority, spatial join, issue/revision selection, interpolation and missing-data handling.

46. **Freeze graph edge definitions:** static route window, dynamic congestion computation, resource-edge sources, aircraft-chain matching and known/unknown masks.

47. **Define chain-completeness denominator exactly:** what counts “should have had an observable successor,” turnaround limits, registration-match rules and boundary treatment.

48. **Freeze route/OD identity:** directed OD pair, airport changes, diversions, codeshares and multi-airport metropolitan areas.

49. **Freeze tail identity policy:** missing/changed registrations, aircraft swaps and provider corrections.

50. **Freeze PRE/POST raw-to-derived linkage.** Same raw event may support multiple features, but each derived snapshot should have explicit provenance keys back to the exact source observations.

## B. Evaluation definitions that should be precommitted before inspecting outcomes

51. **Fix Phase-5 test protection chronology.** You cannot materialize future Engine-A test rows before Phase 6 has collected them. Pre-freeze the split rule; materialize/hash rows after collection but before modeling.

52. **Freeze Engine-A chronological train/validation/test boundaries** or exact proportions/dates.

53. **Freeze Engine B airport holdout construction:** percentage/count, stratification, seed.

54. **Freeze Engine C region holdout construction.**

55. **Freeze Engine D tail/aircraft-type holdout construction.**

56. **Freeze Engine R OD/route holdout construction.**

57. **Define `disruption_event` and `event_id`:** source, start/end, merging of overlapping events and event severity.

58. **Freeze POST partition key using the canonical `flight_instance_id`.**

59. **Freeze block-bootstrap settings:** confidence level, number of replicates and blocking unit per engine.

60. **Freeze rolling-origin folds.**

61. **Freeze primary model metric used to decide whether XGBoost “beats” Model −1.** “Beats” needs a metric and a practical/statistical decision rule.

62. **Freeze secondary metrics and clearly mark them secondary.**

63. **Predeclare primary endpoint(s) across the many horizons/engines/metrics.** Otherwise you have enough comparisons to accidentally cherry-pick a “win.”

64. **Freeze model tuning protocol:** training/validation only; final test unavailable to hyperparameter selection.

65. **Freeze the exact collection-mechanism ablation column groups.**

66. **Freeze staleness bucket boundaries and inclusivity**, plus exact definition of “last observation.”

67. **Clarify whether event-regime robustness is Month-1 or later.** §20 says event sampling isn't turned on at scale in Month 1.

68. **Freeze ECE implementation:** bins, adaptive/equal-width bins, empty-bin policy.

69. **Freeze Brier targets:** `delay>15`, `delay>60`, and whether additional thresholds are exploratory.

70. **Resolve Month-1 conformal contradiction.** Either define the Month-1 prediction-interval method and target coverage, or explicitly defer interval metrics to Model 7.

71. **Define “tail performance” metrics**, not just the severe-delay thresholds.

72. **Freeze missing-feature handling per model:** native XGBoost missing values, indicators, exclusions, categorical missingness.

73. **Freeze the learning-curve observation unit:** raw observation vs flight snapshot vs unique flight instance.

74. **Freeze learning-curve fit method and primary metric** if you're going to interpret \(a n^{-b}+c\).

75. **Specify collection-marginal-value interventions.** “+1 WSSS day vs +1 MID” is a concept; if it's a formal scientific result you need assignment/pairing units, outcome metric and replication schedule.

76. **Define diminishing-return repetitions** so `MV1 > MV2 > MV3` isn't post-hoc storytelling.

77. **Predeclare the Month-2 power-analysis trigger and primary outcome.** Formal power isn't required to start the Month-1 pilot, but the rule for deciding whether/what to power should be predeclared.

## C. Documentation ↔ implementation synchronization fixes

78. **Update Part 1's implementation-status language.** It still contains language describing R/S work as “planned/new” although the implementation log says Phase 0 is done.

79. **Update the implementation log's “only true data table” wording.** S1–S5 derived research tables are now first-class data products. 

80. **Synchronize exact anchor formulas from code into Part 1.**

81. **Synchronize exact adaptive REGIONAL code into Part 1 once defined.**

82. **Synchronize the re-tiered frame into the implementation log and rebuild `adb_sampling_frame`.**

83. **Synchronize region-map version/hash into the manifest.**

84. **Separate `architecture locked` from `manifest values pending`.** Right now “LOCKED” can be read as if grace interval, trajectory thresholds, anchor pool etc. are already frozen when they are deliberately still awaiting measurement.

85. **Keep Part 2 explicitly non-normative.** Do not implement an old multiplier/threshold solely because it appears there. Part 1 must receive the final resolved value.

86. **Do not create V3.10 just for these fixes.** Patch V3.9 Part 1 before the experiment, record an adjudication/freeze entry, then freeze the manifest.

---

# 68. Which things are NOT “gaps” and should remain unknown until the experiment?

Don't accidentally “fix” these.

These are precisely what the experiment is supposed to learn:

```text
Which five anchors ultimately win the frozen probe?

What realized REGIONAL p_i values occur?

How much webhook airborne cadence AeroDataBox actually provides?

Whether XGBoost beats persistence.

Whether weather materially improves prediction.

Whether graph features help.

Whether GNN eventually helps.

Whether 4h produces better chain information than 2×2h.

How quickly stale states harm prediction.

How much predictive value another credit buys.

How much missingness exists between FIDS population and webhook capture.
```

V3.9 itself identifies many of these as empirical uncertainty the run is intended to measure. 

If you choose their answers beforehand, you destroy the purpose of the experiment.

---

# 69. So what should you do right now?

The current implementation log says the post-fix canary still needs to be rerun, the anchor probe has not validly completed, Gates 0.5/4/5 remain pending and FREEZE has not happened. 

The sequence I would use now is:

```text
1. Keep autoCollect=false.

2. Patch V3.9 Part 1 with the pre-freeze definitions above.

3. Fix/rebuild traffic tiers and region mapping.

4. Synchronize implementation constants with Part 1.

5. Complete Gate 0 live account verification.

6. Re-run the tiny engineering canary.
   This is okay before the scientific run because it is an infrastructure test,
   not part of the 31-day experimental sample.

7. Canary must PASS.

8. Run the standardized anchor probes under the now-frozen protocol.

9. Freeze the five-anchor pool.

10. Complete Gate 0.5 and Gate 4.

11. Run FIDS population validation / Gate 5.

12. Freeze manifest + split assignment rule + builder versions/hashes.

13. Perform a final mechanical checklist:
    every critical definition has a value, source, version or hash;
    no "proposal", "TBD", "~", "may", or unresolved alternative remains
    for anything that determines collection or primary analysis.

14. Only then enable Phase 6.
```

The binding plan itself gives essentially the same gate order: code → Gate 0 → coverage/anchor → canary/content/cap → population validation → FREEZE → collection. 

So the answer to **“Should I start?”** is:

**Continue preflight, yes. Start the 31-day experiment, no.**

---

# 70. Prompt for your other AI agent

This is the version I'd give it. It is deliberately strict so the agent doesn't decide to invent V3.10 or silently rewrite your design.

Audit and patch `V3.9_DataCollectPlan.md` PART 1 and `IMPLEMENTATION_LOG(1).md` BEFORE any Phase-6 / 31-day collection begins.

NON-NEGOTIABLE RULES:

* PART 1 (§1–§22) remains the only binding specification.
* Do NOT create V3.10/V3.11/etc.
* Do NOT implement from PART 2 historical text unless the resolved rule is first copied/adjudicated into PART 1.
* Preserve the current architecture unless a genuine contradiction requires a correction.
* `ADB_AUTO_COLLECT` remains false.
* Do not begin the 31-day run.
* Do not use outcomes from any valid experimental collection to choose definitions retrospectively.
* Every collection-affecting and primary-evaluation-affecting choice below must be frozen before the scientific run or explicitly classified as a later experimental unknown.
* Keep an adjudication/change record showing exactly what was changed, why, source/measurement used, and where the final rule lives.
* Synchronize code, schema, PART 1 and the implementation log. If code and PART 1 conflict, stop and resolve the conflict rather than silently choosing one.
* No speculative “industry standard” claims. Separate peer-reviewed support from our project-specific choices.

PRE-FREEZE PATCHES REQUIRED:

1. Replace the current blanket classification of all 4,053 universe-only airports as `REGIONAL`. Define and implement a defensible traffic-tier classification for the entire frame. Freeze traffic measure, data source, reference period, HUB/MID/REGIONAL thresholds, missing-reference policy and tier version. Rebuild `clean.adb_sampling_frame`.

2. Freeze macro-region mapping with a validated lookup/version. Do not rely on an undocumented ICAO-first-letter heuristic where exceptions can misclassify geography.

3. Resolve PRE-vs-POST airport eligibility. The controller currently filters `post_eligible`; define whether the integrated core frame requires `pre_eligible && post_eligible` or whether separate PRE and POST slot/frame mechanisms are required. Ensure every airport for which S1/FIDS population is required has the required schedule support.

4. Define canonical `flight_instance_id`: operating carrier, operating flight, origin, destination, service date/scheduled time, provider ID if available, codeshare mapping, retime/revision handling and collision fallback.

5. Define codeshare deduplication so multiple marketing flight numbers do not automatically become multiple unique physical flight legs.

6. Fully specify the FIDS population protocol: arrivals/departures/both, query interval, airport-window boundaries, pagination, deduplication, cancellations, diversions, codeshares, schedule revisions and population membership per cutoff.

7. Explicitly specify how historical FIDS/schedule state is preserved as-known-at T−24/T−6/T−90 rather than reconstructed from a later final schedule.

8. Produce an explicit worst-case REST/FIDS cost calculation proving the planned population/census calls, validation calls and retry contingency fit the REST budget.

9. Define exactly what scheduled milestone `T` means in T−24/T−6/T−90. Do not leave generic “scheduled departure.”

10. Complete the binding provider-field mapping for all eight OOOI/ASPM-style milestones. Each mapping needs provider JSON path, semantic meaning and caveat. Unverifiable milestones remain NULL + `milestone_unverified`.

11. Freeze four-timestamp semantics and sanity checks: event timestamp, provider publication timestamp, received timestamp, `available_at`, including missing values and clock-order anomalies.

12. Freeze the censoring grace interval based on Gate-0.5 notification-latency evidence and record it in the manifest.

13. Freeze `airborne_usable` minimum point count.

14. Freeze trajectory-completeness threshold, maximum gap, minimum trajectory duration/coverage and calculation.

15. Freeze POST observation-cadence target, minimum acceptable cadence, maximum gap and warning/fail behavior.

16. Replace generic outcome `observed` availability with target-specific label-observation fields for gate-out, wheels-off, wheels-on and gate-in targets.

17. Resolve the zero-yield contradiction in PART 1. Define exact once/repeated/persistent state transitions and specify which state changes adaptive multiplier `m_i`.

18. Define the complete REGIONAL adaptation:
    `m_{i,t+1} = f(m_{i,t}, observed_yield_history, zero_yield_state, ...)`.
    Freeze history window, smoothing, update cadence, cold-start state, reset behavior, missing-yield behavior, floor 0.25 and cap 1.5.

19. Define the `coverage floor` mechanism mathematically, including selection frequency/no-starvation behavior.

20. Define `network_degree`: directed/undirected, in/out/total, unique destinations vs operation counts, minimum route-frequency threshold, data source and fixed reference period.

21. Define `carrier_diversity`: exact metric (count/entropy/HHI/effective carriers), operating-vs-marketing carrier, denominator and reference period.

22. Define international/domestic mix: route classification, numerator, denominator and reference period.

23. Define exogenous traffic score source, reference date/window and normalization.

24. Define geographic/network-diversity score formula and source.

25. Define carrier/international-diversity score formula and source.

26. Copy the exact binding anchor-yield transformation into PART 1. If current implementation remains:
    `component_std = clamp(candidate/reference,0,1)`,
    state that explicitly and justify clipping values above WSSS.

27. Define WSSS and OMAA roles precisely: primary reference, fallback, diagnostic/reference comparison and invalid-reference behavior. Rename this concept from ambiguous “calibration” to `yield reference normalization` or otherwise clearly distinguish it from probabilistic model calibration.

28. Put the exact stability calculation into PART 1, including 15-minute bucket definition, variance/SD/CV convention and current `stability = 1/(1+CV)` if retained.

29. Freeze the anchor shortlist in the manifest with exact exogenous values, source citations, retrieval dates and hashes.

30. Define `matched time-class` and `weekday-class` for anchor probes and the exact scheduling algorithm.

31. Freeze Stage-2 promotion count and duration. If code uses top candidates for 4 h, say exactly that.

32. Freeze and justify the capacity gate. If `rows_per_hour >= 60`, put 60 in PART 1 and manifest.

33. Explicitly state that the rotating anchor consumes the single HUB slot in `{HUB:1, MID:2, REGIONAL:1}` if that remains the intended design.

34. Freeze HUB and MID selection mechanics including current freshest-first/recent-exclusion logic and deterministic tie-breaking.

35. Fully specify crossover design: crossover group identifier, experimental unit, period 1/2, template matching variables, treatment assignment/randomization, incomplete-pair handling and order/carryover policy.

36. Define weather-severity, ATC-delay-program and storm-track metadata: source, algorithm, threshold/category encoding and availability timestamp.

37. Freeze scheduler tie-breaking when several seeded candidate schedules have equal weekday×UTC imbalance. Remove optional “may also include...” criteria or make them binding.

38. Define exactly what `coverage-age <= 5 d core` means and which airports belong to `core`.

39. Freeze all frame/reference snapshot sources, effective dates, versions and hashes used for traffic, degree, route and carrier calculations.

40. Fully specify `historical_feature_store` bootstrap: lookback window for airport delay, route delay, carrier×airport delay, tail/previous-leg delay, utilization/congestion and formal `history_ready_at` criterion.

41. Freeze weather-source hierarchy and joins: METAR/TAF/GFS/ERA5 precedence, issue/amendment selection, spatial/temporal join, missing-data behavior and availability timestamp.

42. Define graph edge observation rules: static-route reference window, dynamic-congestion formula, resource-edge sources, aircraft-chain matching and explicit known-absent vs unknown masks.

43. Define chain completeness exactly, including what “should have had an observable successor” means, turnaround/time-gap threshold, boundary handling and missing-registration handling.

44. Define OD/route identity and directionality, including diversion/codeshare handling.

45. Define aircraft-tail identity and aircraft-swap/missing-registration policy.

46. Ensure every PRE/POST derived snapshot has provenance back to exact raw observations used.

EVALUATION PRECOMMITMENT:

47. Fix the Engine-A test-protection chronology. Do NOT materialize test rows before they exist. Before collection, freeze/hash the split-assignment rule, dates/groups/seed. After collection and before model tuning, materialize the actual test row IDs using that frozen rule, hash them, make them read-only and never tune against them.

48. Freeze Engine-A train/validation/test chronological boundaries.

49. Freeze Engine-B airport holdout fraction/count/stratification/seed.

50. Freeze Engine-C region holdout.

51. Freeze Engine-D tail/aircraft-type holdout.

52. Freeze Engine-R directed OD/route holdout.

53. Define `disruption_event` and `event_id`: source, event boundaries, merging rule and severity.

54. Use canonical `flight_instance_id` as the POST same-flight grouping key.

55. Freeze block-bootstrap confidence level, replicate count and block unit per engine.

56. Freeze rolling-origin folds.

57. Freeze the primary metric and decision rule for “Model 1 beats Model −1.” State metric direction and practical/statistical threshold.

58. Declare primary vs secondary/exploratory endpoints across engines, horizons and metrics so results cannot be cherry-picked.

59. Freeze hyperparameter/model-selection protocol; validation only for tuning; final test prohibited.

60. Freeze exact column groups for collection-mechanism ablation.

61. Freeze staleness bucket boundaries and `last_observation_timestamp` definition.

62. Clarify Month-1 vs later collection-regime robustness; event sampling is not active at scale in Month 1.

63. Freeze probabilistic-calibration implementation: ECE binning, Brier targets and probability output definitions.

64. Resolve the conformal inconsistency: either define a Month-1 prediction-interval method/coverage target or explicitly defer conformal/interval metrics to Model 7/later.

65. Define severe-delay “tail performance” metrics for >=60 and >=120 minutes.

66. Freeze missing-feature handling per model.

67. Define learning-curve observation unit and fit method.

68. Fully specify randomized/paired collection-marginal-value interventions: experimental unit, assignment, metric, replication and repeated-intervention sequence.

69. Predeclare the Month-2 power-analysis trigger, primary window-comparison endpoint and effect-size-estimation method. Month 1 remains pilot evidence.

DOCUMENT / IMPLEMENTATION CONSISTENCY:

70. Update PART 1 status language so it distinguishes `architecture locked` from `pre-freeze measured manifest values pending`.

71. Update R1–R7 / S1–S5 status wording to reflect the actual implementation state rather than stale “planned/new” text.

72. Correct IMPLEMENTATION_LOG wording that implies `flight_data_pre_post` is the only real data table. `flight_events`, `flight_population`, `flight_snapshots`, `flight_airborne_snapshots`, trajectories/outcomes and historical feature store are first-class research data layers under current PART 1.

73. After re-tiering/re-regioning, regenerate the frame and update all recorded 18-cell counts and eligibility counts. Do not carry old 18/18 values forward.

74. Synchronize exact anchor formulas/thresholds and REGIONAL adaptation between code, PART 1, schema comments and IMPLEMENTATION_LOG.

75. Keep PART 2 explicitly non-normative and do not allow old rules to override PART 1.

76. After all above decisions and Gates 0–5 pass, write the versioned manifest containing frame version/hash, tier/region reference version, anchor formula/version, final anchor pool, scheduler seed/rule, adaptive-rule version, FIDS population-builder version, milestone mapping, cadence/trajectory thresholds, censoring grace, snapshot builder SHA, feature-store readiness, split-assignment rule/hash, actual account/budget parameters and source versions.

77. Run a final preflight search over PART 1 and executable config for unresolved experimental-control words such as `proposal`, `TBD`, ambiguous `~`, `may`, unspecified `threshold`, or competing alternatives. Classify each occurrence as either:
    (a) empirically estimated but frozen before Phase 6,
    (b) explicitly exploratory after collection and unable to alter collection or primary evaluation,
    or
    (c) a remaining blocker.

Only after this checklist, Gate 0, Gate 1, Gate 2, Gate 3, Gate 0.5, Gate 4, Gate 5 and the final FREEZE all pass may Phase 6 / the 31-day run begin.

Do NOT change these established principles:

* frame from measured provider-supported universe;
* zero yield does not imply nonexistent airport;
* FIDS/provider population defines denominator, not webhook capture;
* snapshot existence is population-defined;
* post-cutoff data supplies labels only;
* information must actually have been available by cutoff;
* immutable raw provenance;
* PRE and AIRBORNE remain separate training sets;
* no raw airborne time-series overwrite;
* no automatic flight-row `1/p`;
* anchor live yield remains a minority component;
* REGIONAL adaptive allocation remains bounded and explicitly efficiency-oriented;
* no population-representative claim without evidence;
* GNN remains a hypothesis, not default;
* Month 1 remains an early operational pilot;
* no 31-day/57,900-credit run until all preflight gates and final freeze pass.

At the end, produce:

1. a patch/change table with old wording → new wording → reason → section → code/schema impact;
2. the final frozen-values table;
3. an unresolved-items table that MUST be empty for collection-affecting and primary-evaluation-affecting choices;
4. commands/tests needed to verify every changed rule;
5. a GO/NO-GO verdict for Phase 6.

That is the version I would use before letting the main experiment begin.

The biggest change from my earlier answer is that I am **not** comfortable with the statement “only ten things remain.” The deeper comparison of the actual implementation against the binding Part 1 exposed additional specification issues—especially the provisional REGIONAL classification of 4,053 airports, the undefined adaptive-\(m_i\) update, the anchor/HUB relationship being implicit rather than binding, target-specific outcome availability, canonical flight-instance identity, and the Engine-A test-row freeze ordering.

Those are exactly the kinds of things you want to catch **now**, while `autoCollect=false`, rather than halfway through the experimental month.

[1]: https://www.sciencedirect.com/science/article/abs/pii/S1366554524001169 "https://www.sciencedirect.com/science/article/abs/pii/S1366554524001169"
[2]: https://www.sciencedirect.com/science/article/pii/S1566253525011388 "https://www.sciencedirect.com/science/article/pii/S1566253525011388"
