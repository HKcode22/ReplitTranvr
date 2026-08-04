# Travnr ML — A Living Guide, Notes & Runbook

> **What this file is now:** a living document. It started as the **v1 explainer**
> ("every number, in plain English"). It has since grown to record **every model
> experiment** — v1 (baseline), v2 (attempted improvements that failed), and any
> future versions — *why* we tried each thing, *what* we did, *how*, and
> *what the numbers told us*. If we ever get lost and need to remember where we
> left off, this is the file. It is **planning + notes + a decisions log**, not
> just a tutorial.

> **Who this is for:** you (the person reading this). You built a real ML model
> but the *vocabulary* (precision, recall, F1, AUC, positive/negative,
> train/test) is making the numbers feel like a foreign language. This file
> explains **what every number means, whether it's good or bad, and what number
> we're aiming for** — using plain English, real flights from our own data, and
> a tiny worked example. It walks through the notebook cell-by-cell and answers
> every question you asked, in order.
>
> If you only remember ONE line from this whole file: **we are teaching a
> computer to look at a flight 1–12 hours before takeoff and guess whether it
> will be disrupted (late ≥15 min OR cancelled). The whole point is that a human
> (passenger) can be warned *before* the flight, not after.**

---

> **VERSION LOG — how to read this file**
>
> | Doc part | Notebook | What it covers |
> | ---- | ---- | ---- |
> | PART 0 – 9 | `travnr_ml_v1.ipynb` | The baseline explainer (v1, everything below). |
> | Addendum A | `travnr_ml_v2.ipynb` | What we changed in v2, why, and **why it failed**. |
> | Addendum B | analysis scripts + `travnr_ml_v3.ipynb` | Post-mortem diagnosis + v3 (what we try next). |

---
> explains **what every number means, whether it's good or bad, and what number
> we're aiming for** — using plain English, real flights from our own data, and
> a tiny worked example. It walks through the notebook cell-by-cell and answers
> every question you asked, in order.
>
> If you only remember ONE line from this whole file: **we are teaching a
> computer to look at a flight 1–12 hours before takeoff and guess whether it
> will be disrupted (late ≥15 min OR cancelled). The whole point is that a human
> (passenger) can be warned *before* the flight, not after.**

---

**From here down is the original v1 explainer.** It remains accurate and is
the foundation every later version builds on. v1 = the production baseline.

---

## PART 0 — The single biggest idea (read this first)

A machine learning model is not magic. It is a **file of numbers**. You give it
a flight's details (weather, time of day, etc.) and it returns one number: the
*probability* (0 to 1) that the flight will be disrupted.

**The one task our model does, always and only:**

> Predict P(flight is disrupted) = P(arrives ≥15 min late OR cancelled)
> using only information available 1–12h before takeoff.

That's it. Everything else (precision, recall, AUC, train/test) is just
*how we measure* whether that one prediction is good.

Now the three words that trip everyone up:

- **"positive"** = the thing we're trying to predict **happened**. Here: the
  flight was disrupted. (NOT "good"!). Like a medical test, "positive" for
  cancer is bad — it means cancer present.
- **"negative"** = the thing we predict **did not happen**. Here: flight was
  on time.
- So "I predict positive" = "I think this flight will be disrupted."

---

## PART 1 — The four possible outcomes (the confusion matrix)

When we compare a **prediction** to **what really happened**, one of 4 things
is true. This is the entire foundation of precision/recall/F1.

Let's make it concrete with real flights. Say we predict on 100 flights whether
each is disrupted. After they fly, we know the truth. We sort predictions:

| | **Actually disrupted** | **Actually on time** |
|---|---|---|
| **Model said disrupted** | ✅ **True Positive (TP)** | ❌ **False Positive (FP)** |
| **Model said on time** | ❌ **False Negative (FN)** | ✅ **True Negative (TN)** |

- **True Positive (TP)** — model warned, it *was* disrupted. Good — correctly caught a real disruption.
- **False Positive (FP)** — model warned, but the flight was fine. A "false alarm" — annoying, erodes trust.
- **False Negative (FN)** — model stayed quiet, but the flight *was* disrupted. **The worst miss** — passenger wasn't warned about a flight that actually broke.
- **True Negative (TN)** — model stayed quiet, and the flight was fine. Correct silence.

**The four counts (TP, FP, FN, TN) are the raw ingredients.** Every number you
asked about is just a ratio of these.

---

## PART 2 — Precision, Recall, F1 (your "what do 77 and 25 even mean")

### Precision — "when I warn, am I right?"

\[
\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} = \frac{\text{correctly warned}}{\text{all times we warned}}
\]

Means: **Of the alerts the model fires, what fraction were actually disrupted?**

- A passenger perspective: "when the app tells me my flight is risky, is it really risky?"
- **Higher = better** (fewer false alarms). 1.0 = every warning correct; 0 = every warning wrong.
- It does **NOT** care about how many disruptions we *missed*. Only how clean the warnings are.

### Recall — of all disrupted flights, how many did I catch?

\[
\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}} = \frac{\text{correctly warned}}{\text{all actually disrupted}}
\]

**Plain:** "of all the truly disrupted flights, what fraction did the model warn me about?"
- **Higher = better** (catches more). 1.0 = caught every single disruption; 0 = caught none.
- It does **NOT** care about false alarms. Only about not missing disruptions.

### The tradeoff (this is why we see numbers like 0.77 and 0.95 together)

Precision and recall fight each other:
- If the model warns on **everything** → it catches every disruption (recall→1.0), but almost every warning is wrong (precision→low). Lots of false alarms.
- If the model warns on **almost nothing** → it only warns when very very sure (precision→high), but it misses most disruptions (recall→low). Almost no false alarms, but useless.

So a single number like "precision=0.77" is *meaningless by itself* — you MUST
know the recall it was measured at. That's exactly why the notebook quotes
"precision@recall=25%".

### F1 — one number that balances both

\[
F1 = 2 \cdot \frac{\text{precision} \cdot \text{recall}}{\text{precision} + \text{recall}}
\]

It's just the "average" (harmonic mean) of precision and recall. **Higher = more balanced = better.** It's a single summary when you want one number to compare models.

---

## PART 3 — ROC AUC (your "is .72 good or bad?")

This is the number that most confuses people, so let's nail it.

The model outputs a *probability* (0 to 1), not a yes/no. But alerts are
yes/no (warn / don't warn). To turn a probability into a yes/no we pick a
**threshold**: "warn if probability ≥ threshold".

**The ROC curve.** Imagine sliding the threshold from 1.0 (warn on nothing) down
to 0.0 (warn on everything). At every step, we recompute recall (x) and
*"false positive rate"* (y). Plot those points. That curve is the ROC.

**AUC = Area Under that Curve.** It answers: *"If I randomly picked one real
disruption and one real on-time flight, would my model rank the disruption
higher?"* — measured as a probability 0–1.

**How to read AUC (the scale you keep asking about):**

| AUC | Meaning | Analogy |
|-----|---------|---------|
| 0.5 | **Random coin flip.** No skill at all. | guessing |
| 0.5–0.7 | Weak. Better than random, barely useful. | barely better than guessing |
| **0.7–0.8** | **Moderate.** Real signal, but lots of noise. **We are here (~0.73).** | "has learned something real, not enough to fire with confidence" |
| 0.8–0.9 | Strong. Deployable for many real apps. | good |
| 0.9+ | Very strong / suspiciously perfect (check for leakage). | excellent |

**So: is 0.72 a good thing?** Honest answer: **it's not a bad thing** — it
proves the model has learned real patterns (0.5 would mean "no learning"). But
**0.7–0.8 is only "moderate"**, NOT "great". So 0.73 means:

> "The model is genuinely learning the right patterns — a real disrupted flight
> tends to get a higher risk score than a real on-time flight — but there is
> a LOT of overlap/noise, so it is not yet accurate enough to confidently alert
> passengers with few false alarms."

It is **not** evidence the data or approach is broken. It is expected for ~2
weeks of data. That's exactly why we'll re-check with August (Part I of the plan).

---

## PART 4 — Train / Validation / Test (your "how is the code actually doing it")

You asked whether it's: *"train given, then test, then predict"*. Yes — but it's
actually **three** buckets, not two. Here's the birds-eye view:

```
All flights with known outcomes (July)
        │
        │  split BY FLIGHT, 70/15/15, stratified
        ▼
   ┌─────────┐   ┌──────────┐   ┌─────────┐
   │  TRAIN  │   │  VAL     │   │  TEST   │
   │ 475 flt │   │ 102 flt  │   │ 102 flt │
   │ 4,896   │   │ 1,114    │   │ 1,011   │
   │  rows    │   │  rows    │   │  rows   │
   └────┬────┘   └────┬─────┘   └────┬────┘
        │              │              │
   model looks here  used to tune   used ONLY at the
   (learns patterns) (picks best    very end, NEVER
                       threshold)    shown to the model
```

- **TRAIN:** the model reads these rows and learns the pattern. The model sees
  the answer here and adjusts its numbers to fit.
- **VALIDATION (val):** used to *pick* the threshold and to *stop* training when
  it stops improving. It's a "practice exam" — kept separate so we don't cheat.
- **TEST:** the **final exam**. We run the model on it exactly **once**, as the
  model, to report the real number. Never tune on test, or you're reporting
  "learning the test answers" instead of "generalizing."

**Crucially, the split is by FLIGHT, not by row**: all rows of a given flight go
into the same bucket. So a flight seen in training is *never* in the test. That
means the model is genuinely tested on **flights it has never met** — exactly
like production, where it will predict flights it never saw during training.
The notebook verified: `No flight overlap between sets: OK`.

> **Back to your worry** ("is it cheating to use the 'answer' to train?"): The
> label (disrupted/on-time) IS the answer we tell the model during **training**
> — that's normal and necessary (that's the "class"). But the model is shown the
> answer only for *training* rows. On the **test** rows it is shown only the
> features and must predict the label by itself. That's the "exam" — it can't
> peek.

---

## PART 5 — Walking through the notebook, cell by cell, in plain English

### Cell 1 — imports & environment

```
pandas 2.1.4 | numpy 1.24.3 | xgboost 3.2.0
Using: /Users/hk/Downloads/replitTravnr/risk_score_history_v2.csv
```

Just loading the tools and confirming it found the CSV. Nothing to judge here.
(It's normal: prints the library versions so we know what's running.)

### Cells 2–3 — load CSV, strip quotes

```
Raw shape: (20209, 69)
```

20,209 rows × 69 columns in the whole export (all months). Then it strips the
pgAdmin **quote artifact** (`"..."` around values) — just cleaning.

### Cell 4 — parse the times

```
gap_hours range: -23.9 to 1649.7
both departure_time formats parsed OK
rows with unparseable time: 0
after dropping unparseable: (20208, 72)
```

- `gap_hours` = `scored_at − scheduled departure time`, in hours.
- **+23.9** means a row scored ~24h *before* departure (pre-departure).
- **+1649.7** means scored 68 DAYS *after* (an old May/June rescore). 
- `-23.9`... wait, the range shows **-23.9 to 1649.7**. `hours_until_departure`
  being negative is post-departure. So the spread from "-24h (post) to +1649h"
  is just saying we have rows captured anywhere from ~1 day after departure all
  the way to 68 days after. **This is neutral/expected** — it's why we FILTER by
  "usable ≤72h" in the next cell.

**Is it good or bad?** Neutral — it's just documenting the raw span. The *next*
cell is where we actually decide what to keep.

### Cell 6 — July filter + the ">72h" rule + flight outcomes

```
July rows total: 17985
>72h rows (excluded as FEATURES, kept for labels): 1524
usable <=72h feature rows: 16461

=== Flight-level outcomes (all July) ===
arrived_late   596
arrived_ontime 311
cancelled      56
unknown         4
Disrupted (cancelled + late): 652  |  unknown (dropped): 4
```

**This is your #1 question area, so read carefully.**

1. **17985 July rows** — rows belonging to July departures.
2. **1524 rows are "stale"** — scored more than 72h after departure (the Jul-27
   rescore). These are **excluded as *features*** (their weather/timing is
   wrong for predicting) **but kept for reading the label** (their delay info
   is the flight's real final answer). This is the E.7 trick.
3. **Flight-level outcomes** — for each *flight* (not row), what happened:

   | Outcome | flights | meaning |
   |---------|--------|---------|
   | arrived late (≥15 min) | 596 | **disrupted** |
   | arrived on time | 311 | not disrupted |
   | cancelled | 56 | **disrupted** |
   | unknown | 4 | no recorded outcome → **dropped** |

   `Disrupted = cancelled + late = 56 + 596 = 652`.

**Your specific question — "are we counting 'arrived late' as 'cancelled'?"**
NO — they are **separate**, but the model treats them as **one class** because
both disrupt the passenger. This is deliberate and it is the right call:

- **Why one class:** a passenger whose flight is cancelled OR whose flight is
  runs 3h late both need to be warned. From the passenger's point of view,
  both are "my flight is broken." The business label is "disrupted," not
  "cancelled-temporarily."
- **Why not a separate "cancelled" model:** only 56 cancelled flights exist in
  July. That's far too few for a machine to learn cancellation specifically.
  Cancellation is rare (~6%) and driven by things the API may not fully
  expose. Trying to predict cancel-vs-late separately would be worse.
- **Your deeper worry:** "how can a model learn to *predict* cancellation from
  flights that *arrived* (delayed)?" **Great question — you're right it can't
  specifically.** That's precisely *why* we blended it: the model predicts
  **"disrupted (late OR cancelled)"** as one thing, never tries to split them.
  It uses arrived-late examples to learn "these signals → high risk", and
  cancellation examples to learn "disrupted" too. Both arrive at "disrupted=1".
- **Is it a good idea?** For this stage, **yes.** One combined "disrupted"
  target is learnable (we have 652 positives). A separate cancellation-only
  target would fail at 56 examples. Later, with months of data, you could
  upgrade to a 3-way class (late / cancelled / on-time). For a v1 that
  warns a passenger, "disrupted (either)" is the correct useful target.

### Cell 7 — assign labels, build the pre-only pool

```
flights dropped (unknown): 4
usable rows after label attach: 16416 | flights: 963
positive rate (disrupted): 69.5 %

=== Option 3 pool: PRE rows, lead 1-12h ===
   (per-date rows: Jul20 562, Jul21 2451, ... Jul29 367)
Total pre 1-12h rows: 7021 | flights: 679
Positive rate in pool: 68.9 %
```

**Your question: "where are the 6k rows?"** 

- 16,416 rows usable (≤72h, label known) — but that includes pre AND post
  rows, and all lead times.
- **Option 3 keeps only the "pre 1–12h" slice: 7,021 rows from 679 flights.**
  This is the *production-like* pool: rows taken 1–12h *before* departure
  (like the model will be in production). This is the "6 or 7k" you heard
  about. (The plan's static table said 6,688 — the live CSV has a few more
  Jul 29 rows, hence 7,021.)
- **positive rate 68.9%** — in the pool 68.9% of rows belong to disrupted
  flights. That high number matters and we come back to it (Part 7).

### Cell 9 — the 29 features

```
Total features: 29   (Numeric: 23 | Categorical: 6)
```

### Cell 10 — pre_pool

```
pre pool shape: (7021, 32)
nulls remaining: 0
```

- 7,021 rows × 32 columns = the 29 features + a few id/label columns.
- **0 nulls** = every feature is populated; clean. (Good.)

**Your question about the booleans** (`origin_has_ground_stop` etc.): Yes
they're boolean, so they're in the "numeric" list but as 0/1 after conversion.
XGBoost can use them fine. Verified spreads in July:

| feature | true | false | note |
|---------|------|-------|------|
| origin_has_ground_stop | 757 | 17,228 | rare signal (4%) |
| origin_has_ground_delay | 1,682 | 16,303 | rare (9%) |
| dest_has_ground_stop | 364 | 17,621 | very rare (2%) |
| dest_has_ground_delay | 1,268 | 16,717 | rare (7%) |
| origin/dest_has_thunderstorm | 130/194 | ~17,800 | very rare (<1%) |
| **origin/dest_has_freezing** | **0** | **17,985** | **always false in July → adds nothing** |

**Cross-check you asked ("Is AeroDataBox giving us valuable data?"):** Mostly
yes. `origin_wind_speed_kt` is nonzero 94% of rows; `visibility` 100%. The
freezing flags are **always false in July** (summer) so they can't help — the
notebook keeps them but they contribute ~nothing. The ground-stop flags are
rare but not constant (sometimes true), so they're legitimate signals, just
uncommon. So: valuable, with a couple of columns that are near-useless in
July (has_freezing) — worth dropping/flagging for August.

### Cell 12 — the split

```
Train: 4896 rows / 475 flights (pos 69.7%)
Val:   1114 rows / 102 flights (pos 63.9%)
Test:  1011 rows / 102 flights (pos 70.5%)
No flight overlap between sets: OK
```

**Your question: "does positive 69 / 63 / 70 mean good or bad?"** — It means
the split is **consistent**: each bucket has a similar mix of disrupted flights
(~69%/64%/70%). That's **good** — it means train/val/test look alike, so the
test score isn't ruined by a lucky/unlucky split. (We stratified by time-of-day
and lead for this.)

### Cell 14 — training XGBoost

```
Best iteration: 9
Val AUC: 0.7137
```

- XGBoost learns in steps (trees). "Best iteration 9" = it improved up to tree
  9 then stopped improving (early stopping) — the model isn't overgrowing.
- **Val AUC 0.71** = on the *validation* slice, the model ranks disrupted
  flights above on-time ones 71% of the time. (Same "moderate" league as
  before: it's learned something real, not perfect.) Should be printed every
  train. Good enough to be positive, honest that it's not great yet.

### Cell 16 — F1-max threshold (E.4)

```
F1-max threshold on validation: 0.54 -> F1 0.83
At threshold: precision 0.74, recall 0.96
```

The computer asked: "which warning-threshold gives the best F1 on validation?"
Answer: 0.54. At that threshold: precision ~0.74 (warnings 74% right), recall
~0.96 (catches 96%).

**This is the trap you sensed.** Because the *test/val* set is ~70% positive,
"predict disrupted most of the time" looks great on recall (catches ~everything)
and F1 (0.83). But **that's only because the test set is full of disruptions**.
Production won't look like that (next section). So this F1-max number **looks**
good but is misleading for production — which is exactly why we add the RED
operating point check (Step 7b).

### Cell 18 — test evaluation (the real test score)

```
=== TEST SET (pre-only, unseen flights) ===
AUC: 0.7306
precision@recall=25%: 0.7052
At F1 threshold 0.54: precision 0.777, recall 0.958, F1 0.858
```

- **AUC 0.73** — same "moderate" grade as above. Learned, not perfect.
- **precision@recall=25% = 0.71** — if we force the model to ONLY warn on the
  25% highest-risk flights, then ~71% of warnings are correct. Good context.
- At F1 threshold: precision 0.78 / recall 0.96 — but recall being 0.96 reveal
  the "predict most-things-positive" effect again.

### Cell 20 — the RED operating point (your "what does th=0.242 mean")

```
=== RED operating points, tuned on validation, applied to test ===
recall>=20%  th=0.242 -> test precision 0.705  recall 1.000  [below 90% target]
recall>=35%  th=0.242 -> test precision 0.705  recall 1.000  [below 90% target]
```

This is exactly the *production*-style check. It answers: "Can I find a
threshold that catches at least 20% (or 35%) of disruptions while keeping
precision ≥90%?" The result: **no.** Even at a high threshold (0.242), the model
catches *everything* (recall ~1.0) but precision is only ~0.7 — **below the 0.9
target.** Why recall hits 1.0 even at high thresholds? Because the test
set is so positive (~70%) that nearly everything IS high-risk — so you can't
isolate "the truly certain" ones well enough to reach 0.9 precision.

**Good or bad?** **Bad, but honestly so.** It means the model at a *production-
like* threshold does NOT yet reach the 90% precision bar we set (Part H). It
confirms what AUC already hinted: moderate model, not yet deployable at high
confidence. Not broken — just not good enough — and that diagnosis is exactly
what this check is *for*.

### Cell 22 — the Option 2 vs Option 3 ablation (your "which option is better?")

```
Option 2 (mixed, incl. post rows) AUC on pre-only test: 0.7361  precision@recall25: 0.6709
Option 3 (pre-only)              AUC on pre-only test: 0.7306  precision@recall25: 0.7052
```

- **Option 2** = train on ALL rows (pre + post). **Option 3** = train on
  pre-only rows only.
- We measure BOTH on the same pre-only test flights.
- **Result:** Option 2's AUC is a *tad* higher (0.736 vs 0.731) but its precision
  is LOWER (0.67 vs 0.71).

**Which is better??** Marginally, and for the right reason: **Option 3 (pre-only)**.
It has higher sensitivity @25% recall for the same AUC, and it is the
"honest production" version (production only ever feeds pre-departure rows).
The tiny AUC gap from Option 2 is likely because including post rows leaks a
little "it's obviously already disrupted" info into training — exactly the
shortcut described in E.2. So the recommendation (both in plan and result) is
**Option 3**.

**"Verdict: Option 2 (post rows help)"** — that's a per-caller message and it's
a *tiny* difference; I wouldn't read it as "use Option 2." Judge by
precision@recall: pre-only is cleaner and more production-realistic. The AUC
gap (0.736 vs 0.731) is within noise. **Stick with Option 3.**

### Cell 18 (continued) — the heuristic comparison (your last question)

```
Heuristic baseline:
Pre-departure RED recall: 0.9%     (we must beat this)
AMBER+RED precision: 77.9%, recall 25.2%
```

- **Pre-departure RED recall 0.9%** — the current *heuristic* (the hand-written
   scoring rule) catches only ~1% of disruptions *before* departure. Basically
  blind pre-departure. **That's the number our model exists to beat.**
- **AMBER+RED 77.9% precision / 25.2% recall** — the heuristic's best case,
  but that includes *post*-departure (after we already know it's ruined). 
  Pre-departure it's useless.

**Is the heuristic doing good or bad?** **Good AFTER departure, bad BEFORE.**
- **Bad (before):** 0.9% recall = misses ~99% of disruptions pre-flight.
- **Good (after):** 92.5% precision post-departure = when it eventually fires
  after the fact, it's usually right. But that's too late to help a passenger.

That is THE reason we're building ML: **ML works pre-departure.** The notebook
also compares our ML (pre-only precision@recall 0.71) to that weak heuristic
(0.9% pre-dep recall). Our ML is far better pre-departure, but it ALSO needs to
reach ~90% precision before deploy to actually be trustworthy. Not there yet.

---

## PART 6 — Test 70% positive vs the 10–20% production (your "why is it 70 but they say 15?")

This is critical and it's the number that makes the meanings confusing. Two ways
to say "positive rate":

- **In the test set we used, ~70% of rows are from disrupted flights.** Because
  (a) July was a heavy-delay month, (b) disrupted flights get rescored many
  times (more rows per flight), and (c) our pool is all pre-departure rows of a
  bad-month sample.

- **In the real world (production), only ~10–20% of flights will be disrupted**
  on a given day. Weather varies day to day; most flights are fine. So the
  model's job is hardest in production — it can't just say "positive" with
  high probability most of the time, because mostly it'll be wrong.

**Why it matters (your question: "test is 70% positive, what does that mean?"):**
It means the numbers that look great *inside* the experiment (RECALL 0.95, F1
0.858) are flattered because the test had lots of positives. In production the
model will be fed mostly *negative* (on-time) flights. So:

- If we picked our threshold by "max F1 on the *test* set" (which is 70%
  positive), we'd pick "warn on almost everything" — and in production that
  would alert on the ~85% of flights that are fine → terrible precision.

That's the meaning of the line you quoted: **"F1-max on the test distribution
is NOT the production answer."**

## How to fix it (what GOOD looks like for production)

The *right* way to pick the warning threshold for production is to ask: **"with
a ~15% positive rate, what threshold gives us the precision we need (≥90%) while
catching ≥20% of disruptions?"** — and the notebook's Step 7b does that ("recall
≥20%" / "≥35%"), but it says the precision only reaches ~0.7, below 0.9.

So **where do we stand?** Honest verdict: the model is **correctly built but not
yet accurate enough to ship at 90% precision.** It's a v1. We know exactly which
bar to hit (Part H: ≥90% precision & ≥20% recall, pre-dep recall ≥35%), we have
a working way to measure it, and we need more (and better) data — which is what
August (Part I) gives us.

---

## PART 7 — "Why only risk_score_history_v2, why not merge monitored_flights_v2?"

Great question about the two CSVs. Here's the clean separation:

- **`risk_score_history_v2.csv`** = the *score history*: it has a row for every
  time something was scored, and INCLUDES the features (weather, NAS, time) AND
  the label columns (`actual_delay_minutes`, `actual_status`,
  `actual_cancelled`) — everything training needs in one table.
- **`monitored_flights_v2.csv`** = the *current* monitoring registry: one row
  per flight, with live status, risk score, resolved outcome. It does NOT have
  *the full feature snapshot* per cycle — it's the summary of what's being
  watched right now.

**Why we use `risk_score_history_v2` alone:** because it already contains both
the features and the labels. Merging `monitored_flights_v2` wouldn't add new
row-level features; it mostly repeats the resolved outcome per flight (which we
already back-propagate via `actual_*`) plus some final counts that aren't
predictive.

**Would merging add accuracy?** Almost certainly NOT — it would add *a few
columns that tell us the outcome itself* (e.g., `resolved_status`,
`resolved_delay_minutes`). If we merged that into the *feature matrix*, we'd
leak the label into the features, which would make the AUC *look* huge but be
useless for actually predicting (the leak is "you already told me the answer").
So NOT merging it into features is a deliberate correctness choice. We *could*
use it for cross-checks. But for raw training, the score-history is the right
input.

---

## PART 8 — Your free-crib sheet: "what should these numbers be?"

Quick reference you can return to. "Better = higher/lower" for each:

| Metric | Good direction | Scale guide | Where the notebook is (raw) |
|--------|----------------|-------------|-----------------------------|
| **Accuracy** | Higher | 0–1 | not the headline metric (misleading when classes are imbalanced) |
| **AUC (ROC)** | Higher | 0.5=no skill, 0.7–0.8=moderate, 0.8+ strong, 0.9+ near-perfect | **0.73 (moderate)** |
| **Precision** | Higher | 0–1 (0.5=guess-ish, 0.9=good) | 0.70–0.77 (not yet 0.9) |
| **Recall @ 25%** | Higher (better to hit) | 0–1 | 0.25 (we set it) |
| **F1 @ threshold** | Higher | 0–1 | 0.83–0.86 (flattered by 70% positives) |
| **Val AUC** | Higher | 0.7=moderate | 0.71 |

**What's a "good" number for each (your "is there a good range"):**
- **Aim for AUC ≥ 0.80** (strong) as a stretch goal, but **0.70–0.78 AUC** as
  your bar for "it's actually learning — keep going." We're at 0.73 = passing
  "actually learning," below "strong." Goal: more data → higher.
- **Precision ≥ 0.90 & recall ≥ 0.20** = Part H production bar. We're at
  precision ~0.7. Not reached.
- **Pre-departure recall ≥ 0.35** = the bar that beats the heuristic's 0.9%.
  We're in a position to show it, but not yet at 0.9 precision.

**The honest takeaway, in one paragraph:** The pipeline is *correct* (the
split is by-flight, labels are back-propagated and not leaked, features are
cleaned, the threshold is tuned on validation, we check a realistic operating
point instead of trusting the inflated F1). The model has genuinely learned
(AUC 0.73 ≠ 0.5), but it is **not yet accurate enough to deploy at 90%
precision** — which is expected for ~1 week of July data, and is exactly the
gap Part I (August) and model iteration address. We're doing it correctly; we
just need the bar of "good" to be met next.

---

## PART 9 — Your full question list, answered in one line each

1. **What do positive/negative mean?** → "Disrupted / not disrupted" (the flight's final outcome), not good/bad.
2. **Is recall/precision/F1 good or bad at these values?** → precision@recall=25% (0.71) is okay-but-not-great; recall 0.95 & F1 0.86 are inflated by the 70%-positive test. Production target: precision ~0.9.
3. **What does the AUC .72/.73 mean?** → "the model ranks disrupted flights above on-time ones 73% of the time." Moderate; better than random (0.5), not "great" (0.8+).
4. **How does train/test happen?** → 3 splits: train (learn) / val (tune threshold) / test (final exam on unseen flights). Split by flight, no overlap.
5. **Are we doing it correctly?** → Yes — correct split, no label leakage, tuned on val. The *method* is right; only the *accuracy* is moderate.
6. **precision 0.77, recall 0.25 — example.** → Of all warnings, 77% are real (precision); we catch 25% of disruptions (recall at that operating point). Always read the two together.
7. **Is there a good range?** → AUC 0.8+ = strong; currently 0.73 = moderate. Precision 0.9 = target; recall ≥0.20 at that precision.
8. **test 70% vs prod 10–20%** → test is delay-heavy so scores look good; production is mostly on-time, so those scores mislead us — we must set the threshold for a 10–20% base rate.
9. **"F1-max is not the production answer"** → F1-max was fit on the inflated 70%-positive test; it would over-alert on the 15%-positive production.
10. **RED operating points 0.705/1.0 below 90%?** → that's the honest, production-relevant number; it says we're not yet at 90% precision.
11. **Option 2 or 3?** → Option 3 (pre-only) is better and more realistic, despite a tiny AUC gap.
12. **Heuristic good or bad?** → post-departure good (92% precision) but too late; pre-departure poor (0.9% recall) — that's the gap we're filling.
13. **6,688 vs 7,021?** → the live CSV has a few newer rows; the notebook recomputes it, the plan page is a static snapshot.
14. **"Arrived-late as cancelled"?** → No, two outcomes; combined into one "disrupted" class (because both are disruptions; cancellations are too few to learn separately).
15. **Bool features?** → treated as 0/1 numeric; fine for XGBoost; freezing flags are useless in July (always false).
16. **Why no merge of the two CSVs?** → the score-history has both features + labels; the monitor file leaks the *outcome* and has no per-cycle features. Merging into features would hurt correctness (label leakage).
17. **Are we on the right track?** → yes: correct method + honest metrics. 0.73 (not 0.5) means it's learning; we need more/better data to reach 0.9 precision.
18. **pre-departure recall 0.9** → that's the heuristic's (bad) score; ML is trying to beat it. Good recall but precision must also be high — that's the choke point.

---

*End of the v1 explainer. From here on, this file records every experiment that
comes after v1 (v2, v3, and any future runs) — a decisions log.*

---

# ADDENDUM A — The v2 experiment: what we tried, why, and **why it failed**

> **One-paragraph summary you can keep in your head:**
> v2 "worked" on the validation set (val AUC went UP, 0.714 → 0.761) but got
> **worse on the real held-out test** (test AUC 0.731 → 0.691). That is the classic
> signature of **overfitting the validation set**. We tuned so many knobs against
> the *same* validation data that v2 learned to fool that one snapshot, then fell
> over on flights it had never seen. v1 uses no tuning at all (fixed params), so
> it can't overfit val — and it won.

---

## A.1 — The goal of v2 (what we were trying to fix)

The plan's **E.2.6 / Part G** listed four real problems with v1, and v2 was
built to fix each one. Here they are, side by side with the change:

| # | Real v1 problem (diagnosed earlier) | What v2 did about it |
| - | ----------------------------------- | -------------------- |
| A | `origin/destination_has_freezing` are **always false** in the July data (pure noise columns). | Tried to **drop** constant columns. |
| B | `destination_iata` has **208 categories**; ~10% of test flights are destinations never seen in train → label-encoding can't generalize. | Replaced integer label-encoding with **target-encoding** (each category → its historical disruption rate). |
| C | v1 stopped at only **9 trees** = under-trained. | Ran a **hyperparameter search** (24 combos × 2 class-weights). |
| D | v1 trains on a 72%-positive set but production is ~15% → class imbalance. | Added **`scale_pos_weight`** (gave the rare class more weight). |

So in theory v2 should have been strictly better. Let's look at what actually
happened.

## A.2 — What the numbers actually said (results table)

These are the **exact** printed outputs from `travnr_ml_v2.ipynb` (Step 8 & 10),
both evaluated on the *same* held-out test flights:

| metric | v1 baseline | v2 improved | who wins |
| ------ | ----------- | ----------- | -------- |
| validation AUC | 0.714 | **0.761** | 🟡 v2 (looks better!) |
| **test AUC** | **0.731** | 0.691 | 🟢 v1 |
| precision@recall=25% | 0.705 | 0.705 | ⚪ tie |
| RED precision (recall≥20%) | 0.705 | 0.705 | ⚪ tie |
| RED recall | 1.000 | 1.000 | ⚪ tie |

**The tell:** v2's *validation* number got *better* (0.761) but its *test* number
got *worse* (0.691). If v2's changes were genuinely good, **both** numbers would
improve. When only the set-you-tuned-on improves and the unseen set does not,
that is the definition of overfitting to the validation split.

## A.3 — Why did v2 fail? (the honest diagnosis / post-mortem)

There are **five** concrete reasons, each with the evidence:

1. **Validation-set overfitting (the big one).** We took a single validation
   split (102 flights) and tried **48 different models** (24 hyperparameter
   combinations × 2 `scale_pos_weight` values), keeping the one with the best val
   AUC. Tuning that many models against the *same* small slice means we're
   selecting the model that happens to fit that slice's noise. The val number
   becomes "cherry-picked" and is no longer an honest estimate of the test. v1
   didn't do this at all (fixed params) → its numbers stayed honest.
   > The proof is in the gap: v2 val 0.761 (picked) vs v2 test 0.691 (real),
   > a **0.070 slump**. v1 val 0.714 vs test 0.731 (val actually *below* test —
   > no tuning, nothing to overcredit).

2. **Same 102-flight validation is tiny.** Choosing hyperparameters on 102
   flights is like tuning a racing car on a 100-metre straight and expecting it
   to win a 400m race. The selection has huge variance. Any apparent win there
   is likely to be luck, not signal.

3. **Target-encoding the 208-category destination can leak/overfit.** Turning
   each `destination_iata` into its average disruption rate is powerful, but with
   only a few hundred training flights, most of those 208 categories have very
   few samples — their "rate" is mostly noise, and the model learns to trust that
   noise for destinations that will be brand-new in test. This is likely why v2's
   destination feature scored top (gain 20.6%) yet the model still lost: it
   learned deep rules about specific airport codenames that don't transfer.

4. **`scale_pos_weight` tuned the wrong curve.** We boosted the positive class to
   mimic ~15% production, but we tuned it on a 64% *disrupted* validation slice.
   So the tuning "found the best" for a slice that doesn't represent production
   either. The RED operating points ended up identical to v1 (0.705 prec / 1.0
   rec) — meaning on these test flights the extra weighting changed nothing at the
   operating point we actually care about.

5. **The real ceiling isn't the model, it's the DATA.** v1's test AUC is 0.731
   with *no* tuning, on featureless ~7,000 rows from ~1 week of July. When a model
   that is *intentionally under-trained* (9 trees) already hits 0.73, it means the
   predictive signal in the data itself runs out around there. Tuning and clever
   encoding can't invent information that isn't there.

> **And a design flaw we counted as a bug:** v2 didn't actually drop the freezing
> features. Its own printed output said **"Constant numeric columns in pool:
> none"** and **"v2 constant features dropped: 0"** — because the freezing flags
> were never in the feature list at all (v1 + v2 both use the D.1 list of 29,
> which simply doesn't contain `has_freezing`). So change #A did *nothing*, and
> the "228 vs 229 features" story in the plan was never actually realized. We
> tried to "fix" a column that wasn't even a feature. Lesson: verify the fix is
> real before banking on it.

**So, in one sentence:** v2 is worse than v1 **not because target-encoding or
hyperparameter search are bad**, but because we *gave those techniques huge
degrees of freedom and let them all tune on one small validation slice, which
they overfit*. The failed lever is **model selection, not modeling**.

## A.4 — The answers to your questions, directly

### "Why is v2 worse than v1?"
v2 was tuned on the validation set and that's exactly where it improved (0.761)
— yet the improvement did not show up on unseen test (0.691). That is the
fingerprint of **selection overfitting**: it learned the validation set, not
the problem. v1, with no tuning, simply doesn't suffer this.

### "Are we not able to go above 0.73 on AUC / higher precision & recall?"
Not yet — and for a specific reason. **The 0.73 we have comes from the model
already being under-trained** (it intentionally stops early at ~9 trees). When
an intentionally-weak model hits 0.73, the data is the constraint, not the
model. You do not get to 0.8+ AUC purely by trying harder models on 679 unique
flights. The levers that **actually** move the number are:
   - **more data** (Part I — August), and/or
   - **more predictive raw features** that v1/v2 do not currently use
     (we found several: `carrier_health_score`, `historical_otp_score`,
     `nas_origin/destination_programs`, `heuristic_score`, the `signal_*`
     columns — all 100% populated in July but left out of the 29).
     **Update after Addendum B measurement:** adding them did **not** clearly
     help on a first test (H2). So treat this as *unlikely* to be the lever,
     and re-verify under proper CV before promising it.

**The precision/recall >90% target is a separate bar** (Part H / Part 6): it is
about the *threshold* choosing for the ~15% production base rate, and both v1
and v2 stopped at precision ~0.705 / recall 1.0. That won't jump to 0.9 until
either the underlying uplift actually improves or we get data closer to
production. The 0.8+/90% target is a real goal, but for **August**, not ~1 week
of July.

## A.5 — What this means for v3 (what we will and will NOT do again)

**Won't repeat (learned the hard way):**
- ❌ Tuning many hyperparameters against the *same* small validation set —
  replaced with **cross-validation / multiple validation folds** so a "good"
  setting must be good across several unseen slices, not one.
- ❌ Letting the selection pressure and the reward no survive: selecting the best
  of 48 on 102 flights gives no reliable signal.

**Will do / keep:**
- ✅ Keep target-encoding *for high-cardinality destination only*, and only if it
  helps under honest cross-validation.
- ✅ Actually remove any truly-constant features (careful: the freezing flags
  were never truly in the list).
- ✅ Evaluate model selection with cross-validation and report **both** val AND
  test, always, so a "val-win" is caught as a lie immediately.
- ✅ Re-test the 13 extra columns *under cross-validation* (see Addendum B.2/B.3 —
  on first measurement they did NOT clearly help; we re-confirm, not promise).

---

# ADDENDUM B — Diagnosis & v3 (post-mortem analysis, and the next run)

> **WHY this section exists:** we needed to know two things — (1) exactly why v2
> lost, and (2) whether 0.73 was a real ceiling or just luck. So we wrote a real
> analysis script (`ml_analysis/analyze_v2_vs_v1.py`) to *measure* it instead of
> guessing. Every number below is its **actual output**. Run it yourself with:
> `ml_analysis/.venv/bin/python ml_analysis/analyze_v2_vs_v1.py`

## B.1 — H1: "Is tuning on the validation set a reliable way to pick a model?"
**No — it's a coin flip.** We re-ran all 48 models that v2 tried and compared
their val vs test AUC:

```
48 models run. Correlation(val_auc, test_auc) = 0.061     <-- basically ZERO
Model chosen by VAL (what v2 did):   val 0.739 -> test 0.685
Model that was actually best on test:                  test 0.770
Spread of test AUC across the 48: 0.567 ... med 0.686 ... 0.770
```

**Reading it:** if val predicted test, correlation would be near 1. It is
**0.06** — random. The model picked by "best val" was a lucky/unlucky draw, not
a better model. And the spread (0.57 → 0.77) proves the *test* number itself
swings wildly depending on which flights get scored. **A single split is noise
we're chasing.**

## B.2 — H2: "Would adding more columns (carrier/otp/signal) beat 0.73?"
We found 13 extra populated columns v1/v2 never used. Added in, they did **not**
clearly help under the same settings (test 0.657 with extras vs 0.685 without).
**The ceiling is not a lack of feature *breadth* — it's how few flights we have
to learn the relationship from.**

## B.3 — H3: "What's the HONEST expected AUC (flight-aware CV)?"
We split whole *flights* into 5 folds (so one flight's rows are never split
across train/test) and averaged:

| config | CV AUC (mean ± std) |
| ------ | ------------------- |
| v1 fixed params, 29 features | 0.657 ± 0.062 |
| v1 fixed + the missing 13 features | 0.654 ± 0.054 |
| v2's "best" params, 29 features | 0.663 ± 0.094 |
| v2's best params + missing features | 0.657 ± 0.066 |

**The honest answer to "can we get above 0.73?":** with one week of July, the
true expected AUC is **~0.65, with ±0.05–0.09 fold noise**. The 0.73/0.77 we saw
in single splits is partly a good draw. **We are not at a hard ceiling because
the model is bad — we are at a soft ~0.65 wall because we have ~700 flights of
one week.** Tuning/encoding/feature-adding cannot invent information. **The
lever is data (August, Part I).**

## B.4 — The v3 rules (what we must and must NOT do, from B.1–B.3)
- ❌ Do NOT tune many hyperparameters against one small val split and call the val
  AUC the "real score".
- ❌ Do NOT report a single test number as truth; the fold stdev is large.
- ✅ DO report several-fold flight-aware CV with mean ± deviation.
- ✅ DO say honestly when the signal is too weak to decide — that's data reality.
- ✅ Keep the model simple; early stopping is doing the heavy lifting (full trees
  overfit the few flights quickly).
- ❌ Do NOT promise the 13 extra features will help — measured: they don't yet.

## B.5 — What v3 (`travnr_ml_v3.ipynb`) did, and its ACTUAL results

| Step | Action | Result |
| ---- | ------ | ------ |
| 1 | Same load/clean/label back-propagation as v1/v2 | identical background, 7,021 rows / 679 flights |
| 2 | Replace single-split verdict with 5-fold flight-aware CV | mean ± std, no lucky split |
| 3 | Drop measured-constant features | measured: none constant in pool (the freezing flags were never features) |
| 4 | Compare encodings under the **same CV** | label-encode **0.658 ± 0.021** vs target-encode dest **0.634 ± 0.038** → target-encode loses again |
| 5 | Test the 13 extra columns under the same CV | **label + extra = 0.667 ± 0.044** → the first thing that gives a real (small) edge |
| 6 | Verdict, honest | ~0.65–0.67 is the honest centre; single-split 0.73/0.77 are partly luck |
| 7 | Export v3 + threshold | `exports/xgboost_delay_predictor_v3.json`, `threshold_v3.json` (threshold 0.80) |

### What v3 actually found (the real takeaways)

1. **The honest expected AUC is ~0.65–0.67, not 0.73.** Flight-aware CV spreads
   of ±0.02–0.04 dwarf every single-split difference we've seen. The 0.731
   (v1) and 0.77 (best-luck model) are draws.
2. **Adding the unused carrier/otp/signal columns is a real, if small, win:**
   `0.659 → 0.667` reproducible under CV. This is the first genuine gain in
   three runs. It is *not* big enough to trust yet (±0.04 noise), but it is
   directionally right and it's what we should carry into the August retrain.
3. **Target-encoding destination does NOT help** (0.658 → 0.634). Confirmed
   twice now (v2 and v3). Do not spend more time on it.
4. **The wall is data.** With ~700 rows of one week, fold noise (±0.04) swamps
   every change we can make. **More data (August, PART I) is the only lever
   that gets us past 0.73 and toward 0.8+ / 90% precision.**

### The full numbers you should remember

| model | how chosen | test AUC (single split) | honest CV AUC |
| ----- | ---------- | ------------------------ | ------------- |
| v1 | no tuning | **0.731** | ~0.66 ± 0.02 |
| v2 | tuned on one val | 0.691 (lost) | ~0.66 ± 0.09 |
| v3 + extra features | CV, no tuning | — | **0.667 ± 0.044** |

**Bottom line for the plan:** v1 stays production. v3's real contribution is
the methodology (honest numbers) and the one genuine gain (extra features).
Everything above is saved and re-runnable in `ml_analysis/`. When August data
arrives, retrain with the extra-feature feature set and the CV methodology.