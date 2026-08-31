Yes — **V3.7 is now genuinely on the right path**, and I think the AI agent has done a good job incorporating the successive methodological corrections rather than endlessly redesigning the project.

I checked the V3.7 design against current aviation-delay research again. The strongest recent benchmark, **Aeolus (NeurIPS 2025)**, independently supports the core structure you're building: operational + weather data, sequential aircraft flight chains, network relationships, temporal splits, and strict leakage prevention. ([NeurIPS Proceedings][1]) A 2026 multi-horizon graph study likewise compares graph models with XGBoost and explicitly concludes that graph models should not automatically be treated as universal point-forecast winners. ([DOI][2]) Recent work on aircraft-rotation propagation also supports your emphasis on tail/rotation information. ([arXiv][3])

So the **direction is correct**.

However, I found **four things in V3.7 that I would correct before you literally freeze it**. One is a concrete arithmetic inconsistency; the others are methodological wording/design issues.

---

# 1. The biggest thing: V3.7 should actually be considered "pre-run locked," not "perfect"

My assessment:

| Component                                   | Assessment |
| ------------------------------------------- | ---------- |
| Measured supported universe                 | ✅          |
| Traffic-tier × macro-region frame           | ✅          |
| Zero-yield retention                        | ✅          |
| Cross-region anchor idea                    | ✅          |
| 1×4h continuous default                     | ✅          |
| Randomized/constrained UTC allocation       | ✅          |
| Airport-layer probability distinction       | ✅          |
| No flight-level 1/p weighting               | ✅          |
| Aircraft-chain collection                   | ✅          |
| Weather architecture                        | ✅          |
| Leakage-safe snapshots                      | ✅          |
| T-24/T-6/T-90                               | ✅          |
| Persistence baseline                        | ✅          |
| XGBoost baseline                            | ✅          |
| Graph/GNN ladder                            | ✅          |
| Future-representative evaluation            | ✅          |
| Unseen airport/region/tail tests            | ✅          |
| Disruption stress test                      | ✅          |
| Calibration/uncertainty                     | ✅          |
| Collection marginal-value concept           | ✅          |
| Crossover pilot                             | 🟢         |
| Engine-specific blocking                    | 🟢         |
| **Calendar arithmetic**                     | 🔴 Fix     |
| **Hard 1,900/day cap vs "storm overspend"** | 🔴 Fix     |
| **Adaptive REGIONAL probability wording**   | 🟡 Tighten |
| **31-day constrained UTC optimization**     | 🟡 Clarify |

So I would **not send the AI agent back for another giant rewrite**.

I would make these four corrections, then freeze.

---

# 2. Concrete error: your calendar says 24 four-hour days, but it actually has 26

This is the easiest thing to fix.

Your table has:

* Days 1–5 = 5 × 4h
* Days 7–10 = 4 × 4h
* Days 12–13 = 2 × 4h
* Days 15–20 = 6 × 4h
* Days 22–28 = 7 × 4h
* Days 30–31 = 2 × 4h

That's:

[
5+4+2+6+7+2=26
]

So the actual calendar is:

[
26\text{ 4h days} + 3\text{ 2×2h days} + 2\text{ 6h days}=31
]

Therefore the percentages are approximately:

[
26/31=83.9%
]

[
3/31=9.7%
]

[
2/31=6.5%
]

So your table should say approximately:

> **84% / 10% / 6%**

not:

> 77% / 10% / 6%.

This isn't a scientific problem, but it should absolutely be corrected before locking the document.

---

# 3. There is another internal contradiction: "hard 1,900 cap" vs "storm-day overspend"

V3.7 says:

> `ADB_DAILY_CREDIT_CAP = 1900`

and repeatedly says the cap is hard.

But elsewhere it says the remaining 1,100 credits are available for:

> "a storm-day spike" / "a major weather day ... will legitimately overspend"

Those statements cannot both be true.

If:

[
C_{\text{day}}\le1900
]

is a hard invariant, then the storm day **cannot exceed 1,900**.

The 1,100 credits are actually a **monthly reserve**, not an overspend allowance.

I would rewrite the budget logic as:

> **Daily hard cap = 1,900 credits. The 31-day schedule consumes at most 58,900 credits, leaving 1,100 credits unused as a monthly reserve. The reserve is not spendable without an explicit change to the daily-cap policy.**

That's much cleaner.

If you *want* emergency days to be allowed to use the reserve, then define an explicit:

```text
ADB_EXCEPTION_DAY_BUDGET
```

or similar, with an audit flag.

But I would personally keep the hard cap because your entire experiment depends on knowing the cost constraint.

---

# 4. The REGIONAL probability is almost right, but one sentence needs more precision

You have:

[
p_i=\frac{s_i}{\sum_j s_j}
]

That's correct for the **conditional randomized draw given the current eligibility/history**.

But later you say:

> "`airport_layer_design_probability = p_i` = the realized inclusion probability"

I'd tighten that to:

> **`airport_layer_design_probability` = the conditional design probability of selecting airport i for this batch, given the frame and adaptive state immediately before the draw.**

Why?

Because the adaptive rule means:

```text
previous yield
      ↓
m_i
      ↓
score_i
      ↓
p_i
      ↓
airport selected
```

The airport's probability is therefore **history-dependent**.

That isn't wrong. Sequential/adaptive randomization can absolutely have history-dependent probabilities. But the metadata needs to say **conditional on the pre-draw state**.

And this further reinforces why you were right to stop calling it a flight-level probability.

---

# 5. I would also remove this sentence from the old checklist

V3.7 still has remnants of the earlier wording:

> "Sampling probabilities are recorded to allow sampling-aware training..."

That's okay, but in your particular design I would say:

> **Airport-layer design probabilities are recorded for sampling-aware diagnostics and sensitivity analysis. They do not constitute flight-level inclusion probabilities and are not automatically converted into flight weights.**

That's considerably harder to misuse.

---

# 6. The AI agent's correction to tail blocking is absolutely right

This was an important improvement.

Your current:

### Engine A

```text
chronological
+
calendar-day blocking
+
event blocking
+
previously observed tails may recur
```

is appropriate for deployment evaluation.

Imagine:

```text
June 1:
Tail N123AB delayed 75 min

June 15:
N123AB operates another flight
```

A real prediction system **should be allowed to know the June 1 history**.

That is precisely the aircraft-rotation information you're trying to capture.

Aeolus similarly treats flight chains as temporal structures rather than requiring every aircraft to be unseen at prediction time. ([NeurIPS Proceedings][1])

Then:

### Engine D

```text
tail ∩ train = ∅
tail ∩ test ≠ ∅
```

answers a completely different question:

> Can the model generalize to an aircraft it has never observed?

That's excellent.

I would keep this exactly as an engine-specific rule.

---

# 7. One subtle improvement I would make to Engine A

You currently say:

> tails are allowed in both train and later test.

Correct.

But I would explicitly say:

> **Historical tail observations are allowed only insofar as the corresponding derived feature could have been constructed from observations available by the prediction cutoff.**

That's stronger than merely saying:

```text
feature_timestamp <= cutoff
```

because a derived feature can accidentally aggregate future observations.

For example, this would be illegal:

```text
Tail N123AB
June 15 prediction

feature:
"average delay of this tail during June"
```

because June 16+ information has leaked in.

But this is legal:

```text
average delay of N123AB
over its previous 10 completed legs
```

provided every one of those legs occurred before the cutoff.

That should be a unit test in the snapshot builder.

---

# 8. The constrained randomized UTC schedule is a good idea

I agree with the V3.7 change.

You correctly recognized:

[
7\times6=42
]

possible weekday × UTC combinations, while you only have 31 collection starts.

So claiming "balanced" was mathematically too strong.

Your new idea:

[
\min \sum_c(n_c-\bar n)^2
]

is reasonable.

But I would describe it as:

> **constrained randomized allocation with imbalance minimization**

rather than implying that this guarantees unbiased representation.

It doesn't.

It simply creates a **better-balanced randomized schedule under a finite 31-day constraint**.

That's exactly what you need.

---

# 9. Don't over-engineer the scheduler

One caution here.

Your scheduler now potentially wants to optimize:

```text
weekday
× UTC block
× airport region
× local time
× window shape
```

while also managing:

```text
anchor rotation
MID rotation
REGIONAL randomization
crossover groups
1,900-credit budget
```

That is a lot of simultaneous constraints.

I would make the scheduler hierarchy explicit:

### Hard constraints

```text
daily credit ≤ 1900
one scheduled collection/day
valid window
valid airport tier
crossover integrity
no duplicate anchor within rotation cycle
```

### Soft constraints

```text
weekday × UTC imbalance
regional diversity
local-time diversity
anchor balance
```

That distinction is important.

The scheduler should never sacrifice a hard constraint merely to improve your balance objective.

---

# 10. Your crossover pilot is now correctly described

The AI agent got this right.

With approximately:

```text
3 × 2×2h
2 × 6h
```

you do **not** have enough experimental repetitions to make a strong statistical claim such as:

> "4h is superior to 2×2h."

Instead:

> "The first-month experiment is a pilot used to determine whether a larger controlled experiment is warranted."

That's scientifically much safer.

And this is particularly appropriate because aviation operations are highly nonstationary.

The 2026 multi-horizon graph study itself uses carefully aligned temporal windows and reports bootstrap confidence intervals rather than treating individual flight observations as independent evidence. ([DOI][2])

---

# 11. One additional thing: your crossover needs a treatment-unit definition

Your wording says:

> Template A and Template B swap window shape.

Good.

But define exactly what the **unit of randomization** is.

For example:

```text
crossover_group = 17

period 1:
airport set A → 4h
airport set B → 2×2h

period 2:
airport set A → 2×2h
airport set B → 4h
```

Then:

```text
treatment = window_shape
unit = matched airport-set / crossover block
```

That makes the eventual statistical analysis much cleaner.

Otherwise someone might accidentally treat every flight as an independent experimental observation.

They aren't.

---

# 12. The aircraft-chain decision remains strongly supported

I want to emphasize this because it's one of the places where your project is particularly well aligned with recent research.

Aeolus explicitly provides a flight-chain module to model delay propagation across sequential aircraft legs. ([NeurIPS Proceedings][1])

FlightSense reports a large improvement when aircraft rotation-chain features were added to its XGBoost model, followed by an additional weather improvement. ([arXiv][3])

A 2025 delay-absorption study similarly modeled whether upstream delay is absorbed or propagated and then incorporated that information into an XGBoost downstream prediction model. ([arXiv][4])

So your emphasis on:

```text
tail
→ previous leg
→ turnaround
→ next leg
```

isn't just theoretically attractive.

It is supported by recent empirical aviation ML work.

---

# 13. Your GNN philosophy is also correct

This is another part I would freeze.

The project is **not** claiming:

> "We have a graph, therefore GNN."

Instead:

```text
Model -1
   ↓
XGBoost
   ↓
XGBoost + weather
   ↓
network features
   ↓
temporal graph
   ↓
aircraft-chain graph
```

and the question becomes:

> **What does the relational representation add after a strong tabular model has already seen the relevant engineered features?**

That is exactly the right scientific comparison.

And current research supports being cautious. A 2025 aviation graph-learning study actually found CatBoost with graph-derived features outperforming its GAT model for the studied holding prediction problem. ([arXiv][5])

The 2026 multi-horizon study similarly found that graph models were valuable for network-aware forecasting but not universal winners in point accuracy. ([DOI][2])

So your GNN should be **tested, not assumed**.

---

# 14. Your weather architecture is correct

The current AviationWeather.gov documentation confirms that its API provides worldwide METAR and TAF data, but the weather database accessible through the API currently goes back only about 15 days. ([Aviation Weather Center][6])

Therefore this part of V3.7 is correct:

```text
live weather
+
timestamped forecast
+
historical archive/reanalysis
+
leakage-safe join
```

And adding:

```text
retrieval_time
issue_time
valid_from
valid_to
```

is a good idea.

Especially for T-24:

```text
TAF issued at T-25h → valid input
```

versus:

```text
TAF issued at T-2h → forbidden
```

That cutoff distinction is essential.

---

# 15. One wording issue in the weather section

You still say:

> "No extra to pay."

I'd use:

> **"No AeroDataBox credit cost."**

That's the precise statement.

The NOAA service itself is free to access, but archive retrieval, processing, storage, rate limits, and historical-data availability are still engineering constraints. The official API documentation explicitly notes rate limits and requests that large requests use cache files. ([Aviation Weather Center][6])

---

# 16. The persistence baseline is a very good addition

I strongly agree with:

```text
Model -1
```

because aviation delays are temporally persistent.

Now your research question is much stronger:

> Does the ML model learn anything beyond the operational state that was already known?

Then:

```text
Model -1 → Model 1
```

tests:

[
\text{ML value beyond persistence}
]

and:

```text
Model 1 → Model 2
```

tests:

[
\text{weather contribution}
]

and:

```text
Model 2 → Model 3
```

tests:

[
\text{network contribution}
]

and so on.

That's an excellent ablation ladder.

---

# 17. The marginal-value framework is probably the most original part

This is where I think the AI agent has landed on an interesting research contribution.

You now separate:

### Feature contribution

[
\Delta M_{\text{feature}}
=========================

M_{\text{full}}-M_{\text{without feature}}
]

from:

### Collection marginal value

[
MV_{\text{data}}
================

\frac{\Delta M}{\Delta Credits}.
]

That's exactly the distinction I wanted.

For example:

```text
Intervention A:
+1 additional hub observation-day

Intervention B:
+1 MID airport

Intervention C:
+1 REGIONAL airport

Intervention D:
+1 week of depth at existing hub
```

Then measure their effect on the **same future-representative test**.

That is much more informative than saying:

> "We collected 58,000 rows."

---

# 18. One thing I would add to the marginal-value experiment

Use **paired/repeated interventions** where possible.

Suppose you run:

```text
+1 MID airport
```

once and MAE improves by 0.7 minutes.

That is not enough.

You want repeated interventions:

```text
+MID #1
+MID #2
+MID #3
...
```

or repeated randomized blocks.

Then estimate something like:

[
MV_k =
\frac{\Delta M_k}{\Delta C_k}
]

and observe how:

[
MV_1 > MV_2 > MV_3...
]

changes.

That's how you actually discover diminishing returns.

You don't need to add this to the collection schema; it's an analysis protocol.

---

# 19. Another important point: don't use the same test set repeatedly to choose the collection design

This is probably the biggest evaluation issue I would add to V3.7.

You say:

> marginal-value experiments are read on Engine A.

Good.

But suppose you keep checking Engine A:

```text
Intervention 1 → A
Intervention 2 → A
Intervention 3 → A
Intervention 4 → A
```

and choose whichever collection strategy performs best on A.

Eventually Engine A becomes part of your **optimization loop**.

Then it isn't a clean final test anymore.

I'd therefore distinguish:

```text
development / tuning
    ↓
validation

collection-policy selection
    ↓
validation

final deployment evaluation
    ↓
untouched Engine-A test
```

In other words:

> **Don't let the final representative test become the training set for your collection strategy.**

This is especially important if this eventually becomes a thesis/paper.

---

# 20. Your rolling-origin evaluation is good

Keep:

```text
train 1–4
validate 5
test 6

train 1–5
validate 6
test 7

...
```

The reason is simple:

A single future window might happen to contain:

```text
normal weather
```

or:

```text
major disruption.
```

Rolling origins tell you whether your model consistently performs.

The 2026 graph-delay paper likewise evaluates multiple forecast horizons and explicitly uses bootstrap-based uncertainty around forecast windows. ([DOI][2])

---

# 21. But there's a practical problem with doing rolling-origin evaluation on only 31 days

You can't get many meaningful weekly origins from 31 days.

That's okay, but label it as:

> **early rolling-origin pilot evaluation**

rather than implying you have robust seasonal validation.

Your own document already correctly says:

> 30 days ≠ seasonality.

Keep that principle.

---

# 22. One thing I would fix in §27.1

You still have:

> "Catalog-build outputs: frame stratified by traffic × continent × intl × carrier × tz; no tier-empty cells"

That conflicts with your newer V3.7 definition:

```text
primary strata =
traffic tier × macro-region

balancing variables =
international share
carrier diversity
timezone
degree
```

The newer definition is the one I prefer.

So §27.1 should say:

> **Catalog-build output: primary strata = traffic tier × macro-region; balancing distributions for international share, carrier diversity, timezone, and reference-network degree are reported within strata.**

That's a documentation consistency issue, but worth fixing.

---

# 23. Another subtle issue: `airport_layer_design_probability` isn't always available

Your schema says:

```text
regional randomized:
p_i

HUB/MID deterministic:
planned_share
```

Good.

But make sure your database does **not** allow developers to accidentally populate:

```text
airport_layer_design_probability
```

for HUB/MID.

I would enforce:

```text
is_randomized = true
    → airport_layer_design_probability NOT NULL

is_randomized = false
    → airport_layer_design_probability NULL
    → planned_share may be populated
```

That should be a database/check constraint if your system allows it.

This is exactly the type of thing that prevents a future developer from accidentally undoing six versions of methodological work.

---

# 24. One concern with the adaptive REGIONAL rule

The idea is mathematically valid:

[
p_i=\frac{s_i}{\sum_j s_j}
]

but there is a scientific tradeoff.

You are adapting the sampling distribution based partly on **observed yield**.

That optimizes collection efficiency.

But it can move you away from geographic representativeness.

You already mitigate this with:

```text
nonzero floor
hard cap
persistent zero-yield only
```

That's good.

But your documentation should explicitly say:

> **The adaptive REGIONAL mechanism is an efficiency-oriented allocation, not a representation-preserving probability sample of the regional airport population.**

Otherwise someone might later claim:

> "We use adaptive probabilities, therefore our regional sample is unbiased."

It isn't necessarily.

---

# 25. Your exact 1:2:1 allocation should remain yellow, just as your document says

This is important.

Research does **not** tell us:

```text
HUB:1
MID:2
REGIONAL:1
```

is universally optimal.

What the literature supports is the need for:

```text
network information
+
temporal information
+
weather
+
aircraft rotation
+
broad evaluation
```

not those exact percentages.

Aeolus's 50-million-flight dataset, for example, doesn't prescribe your budget allocation; it demonstrates the value of a rich multi-structural dataset. ([NeurIPS Proceedings][1])

So your statement:

> "budget-scaled experimental allocation, not industry standard"

is exactly right.

---

# 26. The current research gives you especially strong support for your data architecture

I would summarize the literature alignment like this:

```text
                  V3.7
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
     Weather      Temporal     Network
        │           │           │
        └─────┬─────┴─────┬─────┘
              ↓           ↓
         Aircraft       Graph
          chains        model
              \           /
               \         /
                ↓       ↓
               Future leakage-safe
                    prediction
```

That's very close to the direction of Aeolus. ([NeurIPS Proceedings][1])

And the current research does **not** support prematurely declaring:

```text
GNN > XGBoost
```

which is another reason your V3.7 ladder is appropriate. ([DOI][2])

---

# 27. So is your AI agent doing a good job?

**Yes.**

More importantly, it is doing something I would consider a good sign in a research project: **it has been willing to retract earlier claims.**

Across these revisions it has removed or corrected things like:

```text
1/p flight weighting
"balanced" when 31 days cannot balance 42 cells
"6h" when the budget actually stops at 3.4h
worldwide-airport claims
weather percentage claims
automatic tail blocking
"industry standard" allocation claims
```

That's much better than an agent trying to defend its original design.

The current version shows that the agent is responding to methodological objections rather than merely polishing the wording.

---

# 28. What I would do now

I would **not start another V3.8 review cycle**.

I would make these final fixes:

### Fix 1 — calendar

Change:

> `24 × 4h + 3 × 2×2h + 2 × 6h`

to:

> **26 × 4h + 3 × 2×2h + 2 × 6h = 31 days (84% / 10% / 6%).**

### Fix 2 — monthly reserve

Change:

> "1,100 spare for storm-day overspend"

to:

> **"1,100 monthly reserve, unusable while the 1,900/day hard cap remains active."**

### Fix 3 — adaptive probability wording

Change:

> "realized inclusion probability"

to:

> **"conditional airport-selection probability immediately before the randomized draw, given the current frame and adaptive state."**

### Fix 4 — Engine-A testing

Make absolutely explicit:

```text
collection-policy tuning → validation
final deployment claim → untouched test
```

so repeated marginal-value experiments don't consume your final test set.

---

# Bottom line

**Yes — you and the AI agent are on the right path.**

I would now call V3.7:

> **Scientifically defensible pre-run design, with four small lock corrections—not a design needing another rewrite.**

The most important parts are now correct:

**the sampling frame is defined before sampling, quiet airports aren't silently removed, time and airport coverage are deliberately varied, aircraft chains are preserved, weather is timestamped and leakage-safe, airport selection isn't confused with flight inclusion, XGBoost gets a serious baseline, GNNs aren't assumed to win, future performance is the primary deployment criterion, unseen entities are tested separately, disruptions are treated as stress rather than quietly oversampling the main test set, and the collection strategy itself is evaluated by predictive value per credit.**

That overall design is well supported by current flight-delay research. Aeolus explicitly emphasizes flight chains, weather, network relationships, temporal splits and leakage prevention; recent 2026 work likewise shows the value of multi-horizon/network modeling while cautioning against assuming graph models universally beat strong temporal or tabular baselines. ([NeurIPS Proceedings][1])

And your most interesting contribution is no longer simply:

> **"I built a GNN for flight delays."**

It is becoming:

> **"Under a fixed aviation-data acquisition budget, how much airport breadth, temporal recency, aircraft-chain continuity, network coverage, and weather information are actually worth in future flight-delay prediction?"**

That is a substantially stronger research question.

The only thing I would **not** do now is keep endlessly redesigning the collection strategy. At this point, the unknowns you correctly identified—**the real AeroDataBox universe, anchor yields, actual costs, coverage-age behavior, chain density, and marginal predictive value—need to be measured rather than theorized.**

[1]: https://proceedings.neurips.cc/paper_files/paper/2025/hash/586fbdff064d506f5af3e3db82681f84-Abstract-Datasets_and_Benchmarks_Track.html?utm_source=chatgpt.com "Aeolus: A Multi-structural Flight Delay Dataset"
[2]: https://doi.org/10.3390/app16147110?utm_source=chatgpt.com "Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network"
[3]: https://arxiv.org/abs/2605.07364?utm_source=chatgpt.com "FlightSense: An End-to-End MLOps Platform for Real-Time Flight Delay Prediction via Rotation-Chain Propagation Features and Agentic Conversational AI"
[4]: https://arxiv.org/abs/2512.08197?utm_source=chatgpt.com "Integrating Delay-Absorption Capability into Flight Departure Delay Prediction"
[5]: https://arxiv.org/abs/2502.04233?utm_source=chatgpt.com "Graph machine learning for flight delay prediction due to holding manouver"
[6]: https://aviationweather.gov/data/api/?utm_source=chatgpt.com "Data API"
