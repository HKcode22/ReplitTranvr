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
> | Addendum B | `analyze_v2_vs_v1.py` + `travnr_ml_v3.ipynb` | Post-mortem diagnosis + v3 honest CV. |
> | Addendum C | `travnr_ml_v4.ipynb` | **Time-aware run**: random split leaks the day regime; honest walk-forward AUC ≈ 0.56; found the Jul-29 label bug. |
> | Addendum D | `travnr_ml_v5.ipynb` | **First clean run**: fixed label rule + dropped never-flew Jul 29 + walk-forward → honest AUC ≈ 0.65, plus the "mistakes never to repeat" list. |
> | Addendum E | `travnr_ml_v6.ipynb` | **Raise honest AUC without tricks**: tested rolling-window, seed-averaging, time features, and dropping the ~label feature — TIME features win → 0.686. |
> | Addendum F | `travnr_ml_v7.ipynb` | **Experiment: DNN + RL** — same data/split, tried a deep net (AUC 0.547, didn't beat XGBoost) and an RL bandit (optimizes utility, not AUC). Production model unchanged. |
> | Addendum G | `travnr_ml_v8.ipynb` | **Re-test of the May/June exclusion** — June *is* label-able (back-propagation works, 104 flights), but mixing it into July training HURTS (0.654 vs 0.686). The plan's verdict holds, now with evidence. |

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
the methodology (honest numbers). Everything above is saved and re-runnable in
`ml_analysis/`. **Update from v4 (Addendum C):** v3's "0.667 with extra
features" was measured on a *random* split, which v4 proved is leaky — on the
honest time walk-forward, extra features did NOT help (0.551). When August data
arrives, retrain with walk-forward time validation.
---

# ADDENDUM C — v4: the time-aware run (the biggest finding of the whole project)

> **The short version, so you get it before the details:**
> v4 tested whether the 0.73 was *real*. It is **not** — and we now know why.
> When we evaluate the way production actually works (predict *future* days, not
> same-day flights), the honest AUC drops to **~0.56, essentially random**. The
> 0.73 came from a **random split that leaked each day's weather/ATC regime** into
> the test set. AND we found a real **data bug**: the last day (Jul 29) never
> happened in the export — those flights are wrongly labeled "on-time". This is
> the most valuable run yet, because it tells us *what is actually broken*.

## C.1 — The discovery that changed everything: the data is NOT stationary

Per-day disruption rate of the pre-1-12h pool:

| date | disruption rate |
| ---- | --------------- |
| Jul 20 | 82% |
| Jul 21 | 73% |
| Jul 22 | 85% |
| Jul 23 | 74% |
| Jul 25 | 77% |
| Jul 26 | 74% |
| Jul 27 | 50% |
| Jul 28 | 37% |
| Jul 29 | **0%** ← bug, see C.4 |

Two things stand out:

1. **Weather/ATC state spills from day to day.** Jul 20–26 is a long bad
   stretch (73–85% disrupted); Jul 27–28 recovers (37–50%). In a *random* split,
   same-day flights land in both train and test, so the model "learns today's
   regime from today's neighbors" — an inflated, fake number.

2. **The `carrier_avg_delay_24h` feature is basically the label wearing a wig.**
   Its correlation with day-of-month is **+0.749** in the pool. That feature says
   "was the last 24h a mess?" — which is *almost* the answer to "will this flight
   be late?". A model fed that feature can hit 0.73 on a random split by reading
   today's weather report card. That is not generalization; it's remembering.

## C.2 — The honest number: time walk-forward ≈ 0.56 (barely above random)

v4 trains only on **earlier** days and predicts each **later** day (like real
production), never training on the target day:

| config | pooled AUC over held-out days |
| ------ | ----------------------------- |
| 29 features (v1 set) | **0.558 ± 0.049** |
| 29 + cascade features | 0.559 ± 0.038 |
| 29 + cascade + extra cols | 0.551 ± 0.058 |

Per-day (29-feature model): Jul25 **0.63**, Jul26 0.52, Jul27 0.58, Jul28 0.51.
**The model cannot predict the day-regime shift** (the 84%→7% swing), because
that regime is not visible in any pre-departure feature we have. With the
current data, ~0.56 is the honest centre — **the 0.73 was inflated by the split
methodology, not real skill.**

**Important:** this does NOT mean the earlier work was wasted. It means the
earlier v1/v2/v3 numbers were *optimistically wrong* (leaky), and v4 is the
first run that tells the truth: **on truly unseen future days we are near
random, and the bottleneck is data volume + the label bug — not the model.**

## C.3 — Cascade (rolling) features: tried, did NOT help

We built rolling features (avg delay of same-destination flights that already
departed in the last 6h, same-carrier in 12h, origin storm/wind trend in 6h).
They are valid at prediction time (only use past rows) and they *fill* well
(carrier 80%, weather 100%), but on the walk-forward test they did **not**
improve AUC (0.559 vs 0.558). So: cascade features are a reasonable idea to
revisit with more data, but **with one week they add nothing measurable.**

## C.4 — THE DATA BUG: Jul 29 flights never happened (labels are lies)

The most actionable finding. Checking the *latest recorded status* per flight:

| date | n | Arrived | Scheduled | EnRoute | has_delay_val |
| ---- | - | ------- | --------- | ------- | ------------- |
| Jul 28 | 59 | 17 | 24 | 9 | 59 |
| **Jul 29** | **53** | **0** | **9** | **0** | **9** |

**Jul 29: all 53 flights are still "Scheduled" — the export was cut off before
they departed.** Our label function sees "no delay, no cancel" → marks them
"on-time". That is **wrong**: they're not on-time, they just haven't flown. This:
- fakes the Jul 29 disruption rate to 0%,
- injects 53 mislabeled "on-time" rows into training,
- makes the Jul 29 → "future" walk-forward step impossible (skipped, pos=0).

**Fix (for August, PART I):** only trust a flight's label once its latest status
is terminal (`Arrived`/`Cancelled`/`Delayed`), or drop the last export day.
Without this, any tail day silently corrupts the data.

## C.5 — Answers to your specific questions

**"Is 5-fold random flight CV good? Does weather spill day-to-day?"**
Random flight CV is *fine for comparing models* but **overstates real-world
accuracy** because weather/ATC regime spills across days and the random split
leaks it. Your instinct was exactly right: the correct test for a prediction
service is **time-based walk-forward** (train past → predict future). We now
measure that.

**"Could we do time-based rolling / feature engineering?"**
We did (C.3). Rolling cascade features are legitimate but added nothing with one
week of data. Feature engineering is not the lever right now — **data is**.

**"Are there issues in the rows hurting accuracy?"**
**YES — one real bug (C.4):** the final export day (Jul 29) has no real labels.
It poisons the tail of the training set and made the last walk-forward step
impossible. Fixing label-completeness is the single highest-value data action.

## C.6 — So can we get above 0.7 / 0.9 precision? (the honest, complete answer)

- **On the current July data: NO — and 0.73 was never real.** Honest walk-forward
  AUC is ~0.56. You cannot honestly claim better until the data changes.
- **What will actually raise it (in order of impact):**
  1. **Fix the label bug** (C.4) — remove/mark the never-flew tail days.
  2. **Get more days** (August, PART I) — non-stationarity needs history.
  3. Only then does feature engineering / tuning matter.
- **What will NOT raise it:** more model tricks, more encoding schemes, more
  tuning on the same week of data. v1/v2/v3/v4 all prove it.

> **Bottom line for the plan:** v1 stays "the best we can deploy today", but its
> 0.731 was optimistic. The real next step is NOT v5 — it is fixing the label
> completeness, then waiting for more data (August), then re-evaluating with
> walk-forward time validation. THAT is how we get an honest, deployable model.

---

# ADDENDUM D — v5: the first CLEAN run (fixed labels, honest future)

> **The short version:** v5 is the first run where every known mistake is fixed
> at the same time — corrected labels, Jul 29 removed, walk-forward future
> prediction. And the honest number got **better**, not worse: the 29-feature
> model now scores **0.646 ± 0.10 pooled AUC on truly unseen future days**
> (up from v4's 0.558). Fixing the data genuinely improved the model.

## D.1 — The mistakes we will never repeat (the "DO NOT" list)

This is the whole project's hard-won lesson, collected so we never regress:

1. ❌ **NEVER label a flight "on-time" without terminal evidence.** A flight is
   on-time ONLY if its status reached `Arrived`/`Delayed`/`Cancelled` or it had a
   real `>=15min` delay. The old `or delays` clause (any delay value, even `0`
   pre-departure) mislabeled **151 flights** as on-time. It is now fixed in
   `audit_dataset.py` and in v5's notebook label rule.
2. ❌ **NEVER trust a flight whose latest status is still `Scheduled`.** It
   hasn't flown yet — its "label" is not a label. (Jul 29: all 53 still
   `Scheduled` → removed.)
3. ❌ **NEVER evaluate with a random flight split for the "real" score.** It
   leaks each day's weather/ATC regime (that's why v1 "hit" 0.731). The honest
   test is **time walk-forward**: train past → predict future.
4. ❌ **NEVER tune many hyperparameters against one small validation slice.**
   Picking the best of 48 on 102 flights is noise (corr 0.06). Use folds / CV or
   no tuning at all (v1's fixed params are fine and honest).
5. ❌ **NEVER trust `carrier_avg_delay_24h` as a pure "feature".** It is
   basically the label (corr +0.75 with day). Fine to *use* at prediction time,
   but it must never be the reason a score looks good on a leaky split.
6. ❌ **NEVER promise feature engineering will help until measured under the
   honest (walk-forward) split.** Cascade features, target-encoding, and the 13
   "extra" columns all looked neutral-to-positive on random splits and **hurt**
   on the clean walk-forward. The 29-feature base wins.

## D.2 — What v5 actually did and its results

- **Fixed labels:** on-time 311 → **160**; unknown 4 → **155** (all dropped).
- **Dropped Jul 29 entirely** (it never flew). Kept Jul 20–28 only.
- **Cleaned pool:** 5,946 rows / 559 flights, positive rate **81.3%**
  (higher than the fake 68.9% because the phantom "on-time" tail is gone).
- **Evaluation:** time walk-forward, 5 held-out days (Jul 23, 25, 26, 27, 28).

| feature set | pooled AUC (walk-forward) | prec@recall=50% |
| ----------- | ------------------------- | --------------- |
| **29-feature base (v1 set)** | **0.646 ± 0.100** | **0.81** |
| 34 = base + cascade rolling | 0.590 ± 0.154 | 0.81 |
| 49 = + extra carrier/otp/signal | 0.511 ± 0.086 | 0.81 |

**Reading it:**
- The **29-feature base is the best**. Every "improvement" (cascade, extra
  columns) made it *worse* on the honest test — they were fitting the leak.
- **0.646 vs 0.731 (v1):** v1 looked higher but was inflated by the split; v5's
  0.646 is real. On the days with trustworthy labels it reaches **0.75** (Jul 27
  and 28) — the model genuinely works better now that it isn't being poisoned by
  phantom on-time rows.
- **Precision ≈ 0.81 at recall 0.50** — meaning: if we warn the top 50% most
  at-risk flights, ~81% are actually disrupted. That is a genuinely useful,
  deployable operating point (still not the 90% target, but real).

## D.3 — Why it was "getting worse" — and the truth

| run | number | what was really happening |
| --- | ------ | ------------------------- |
| v1 | 0.731 | leaky random split (over-stated) |
| v2 | 0.691 | leaky + tuned on noise |
| v3 | ~0.65 | honest-ish CV, still random split |
| v4 | ~0.56 | honest walk-forward → found the label bug |
| **v5** | **0.646** | clean labels + no tail bug + walk-forward |

**The number dropped from 0.731 → 0.56 then recovered to 0.646.** It was NOT
the model getting worse — it was *honesty arriving in steps*. Each drop was a
fake layer being peeled off; each rise after that is real learning. The model
is better now than it has ever honestly been.

## D.4 — What we do about Jul 29 (your question, answered)

**Remove it — yes.** Jul 29 never happened in the data (all 53 flights still
`Scheduled`, export cut off before they departed). Their "on-time" labels are
lies that would poison training. v5 keeps **Jul 20–28** and uses terminal-
evidence labels, which also trims the partially-unfinished Jul 27–28 flights to
only the ones we can trust. **Rule going forward (Part I / August):** any flight
whose latest status is not terminal must be excluded until it is.

## D.5 — Where we are, honestly, and what actually gets us accurate

- **Now:** honest walk-forward AUC **~0.65** (best 0.75 on clean tail days),
  precision ~0.81 at recall 0.5. Real, trustworthy, deployable-ish.
- **To reach AUC 0.8+ / precision 0.9:** we need **more days** (August) so the
  model can learn the day-regime instead of being surprised by it. Model tricks
  cannot do it — v1→v5 proved that five different ways.
- **v5 artifacts:** `exports/xgboost_delay_predictor_v5.json`,
  `threshold_v5.json` (threshold 0.77). Builder: `build_notebook_v5.py`.
- **The exact next step is Plan PART I (August)** — with the fixed label rule,
  walk-forward validation, and the 29-feature set, August is where accuracy goes
  up for real.

---

# Addendum E — v6: raise the honest number without any tricks

## E.0 — What we wanted

v5 gave a **trustworthy** baseline (walk-forward AUC 0.646 ± 0.10, precision
≈0.81 @ recall 0.5). We stopped "chasing the metric" and starting asking: **can
we raise it for real, under the exact same honest evaluation, without violating
any rule we've learned?**

v6 tests **four hypotheses**, all measured under the **same walk-forward split**
(fixed labels, Jul 20–28, never train on a future day):

| H | Hypothesis | Why it could be real (not a trick) |
| - | - | - |
| H1 | **Rolling window** (train recent N days) | July's regime *shifts* (84% → 7.5% disrupted). The most recent days may predict tomorrow better than *all* past days. |
| H2 | **Seed-averaging** (5 seeds) | The ±0.10 variance is largely seed luck; averaging predictions should shrink it. Pure variance reduction, no new signal. |
| H3 | **Time features** (`days_since_july1`, `day_of_month`) | Legal at prediction time. May help the model learn the regime trend explicitly. |
| H4 | **Drop `carrier_avg_delay_24h`** (the ~label feature) | v4 showed it tracks the day (corr +0.75). If removing it costs ~nothing, the model is robust for August's new regime. |

v6 does **not** change labels or the split — those are settled. Everything below
is measured, not promised (Mistake Rule #6).

## E.1 — Results (pooled walk-forward AUC, all on identical clean data)

| Config | AUC | prec@recall 0.5 |
| ---- | ---- | ---- |
| **TIME feats expanding (WINNER)** | **0.686** | 0.814 |
| BASE rolling-3d | 0.658 | 0.814 |
| NO24 (no carrier_24h) expanding | 0.658 | 0.814 |
| TIME feats rolling-4d | 0.649 | 0.814 |
| NO24 rolling-4d | 0.640 | 0.814 |
| BASE expanding 5-seed | 0.623 | 0.814 |
| BASE expanding (v5-like) | 0.623 | 0.814 |
| BASE expanding 1-seed | 0.617 | 0.814 |
| BASE rolling-4d | 0.615 | 0.814 |
| BASE rolling-5d | 0.597 | 0.814 |

**Winner: TIME feats expanding → AUC 0.686** (up from v5's 0.646).

## E.2 — What honestly happened, hypothesis by hypothesis

- **H3 TIME features: the win (+0.063 over v5).** Adding `days_since_july1` and
  `day_of_month` lets the model *explicitly* encode "later in the month, less
  disruption." It's legal (a forecast always knows the date) and it genuinely
  helped (biggest jump: 07-26, 0.513 → 0.743).
- **H1 rolling window: mixed, not a clear win.** Rolling-3d (0.658) beat v5
  slightly; rolling-4d/5d did worse. Inconsistent → the extra regime-shift
  signal isn't reliably there. **Recommended fallback, not the primary.**
- **H2 seed-averaging: real, small, always adopt.** 1-seed 0.617 → 5-seed
  0.623 (expanding) and 0.6229→stabilized. It reduces variance; the final v6
  model uses a 5-seed ensemble regardless.
- **H4 drop `carrier_avg_delay_24h`: nearly free (0.658).** This is the
  *important robustness finding*: the winner does NOT depend on the ~label
  feature. Nothing is lost without it → the model is safer for August's new
  regime.

## E.3 — Honest caveats (so we don't fool ourselves)

- **TIME features partly encode "this month's trend".** In July — a single
  atypical weather week — the date features largely say "later = less disrupted."
  Under walk-forward that's honest. But if August is a *different* shape (a
  new spike mid-month), a model leaning on `days_since_july1` may be more
  surprised than v5's. **So:** v6's 0.686 is our best July estimate, but the
  August regime-break is exactly where we must re-validate (Plan PART I).
- **Precision didn't move (0.81).** The AUC gain came from better ranking in the
  middle of the curve, not from a higher-precision operating point. Expect
  precision to only truly rise with more days, as always.
- **0.686 is better, but moral of the saga is unchanged:** the honest number is
  ~0.65–0.69; the remaining big jump needs **more days of data**, not more
  feature ideas. Feature ideas saw diminishing (now even negative) returns —
  TIME was the last cheap, honest lever.

## E.4 — v6 artifacts

- Exports: `exports/xgboost_delay_predictor_v6.json`,
  `exports/threshold_v6.json` (threshold **0.863**, 31 features incl. the 2
  time features, 5-seed ensemble, best-walk-forward 0.686). Smoke-tested: the
  saved booster loads and scores with the documented schema.
- Builder + notebook: `build_notebook_v6.py`, `travnr_ml_v6.ipynb`.
- A **deployment bug caught & fixed during this run**: the export step initially
  wrote the `F_BASE` (v5) feature set while naming itself the winner. v6 now
  writes the winner's actual feature set (TIME) into both the model and the
  metadata — so `threshold_v6.json` lists all 31 features correctly.

## E.5 — Updated one-line story

v1 0.731 (leaky) → v2 0.691 (leaky+tuned noise) → v3 ~0.65 (honest CV) →
v4 ~0.56 (honest WF, found bugs) → v5 0.646 (clean) → **v6 0.686 (clean + TIME
features)**. Precision still ~0.81. **Next**: August (Plan PART I), where more
days + this feature set + re-validation is the real road to AUC 0.8+ / prec 0.9.

---

# Addendum F — v7: the DNN + RL experiment (curiosity, honestly measured)

## F.0 — Why we did this

After v6's honest 0.686, the natural curiosity: *what if we throw a deep
neural net at it, or even reinforcement learning?* This is a **pure experiment
to see what happens** — not a bid for production. v7 keeps **everything**
identical to v6 (clean labels, Jul 20–28, walk-forward split, the 31 TIME
features) and changes **only the model family**, so any score difference is
attributable to the model, not the data.

## F.1 — The two experiments

**A. Deep NN (torch MLP, 128-64-32, ReLU + BatchNorm + Dropout).** Walk-forward,
early-stopped on a flight-aware validation split, exactly like v6's XGBoost.

**B. RL — online contextual bandit.** The agent watches flights day-by-day and
must pick **warn / don't-warn** per flight, earning a reward after the outcome:
warn+disrupted = +1, warn+on-time = −2 (false alarm), silent+disrupted = −3
(miss, the costliest), silent+on-time = 0. It learns its policy *only from past
days* (same walk-forward discipline), ε-greedy. RL optimizes **utility, not
AUC**, so we compare it on utility against (a) an oracle that knows the labels
and (b) v6 XGBoost run through the same reward function.

## F.2 — Results

| Model | Walk-forward AUC | prec@recall 0.5 |
| ---- | ---- | ---- |
| **XGBoost v6 (winner)** | **0.686** | 0.814 |
| DNN (MLP) | 0.547 | 0.814 |

| Decision policy | Cumulative utility | precision | recall |
| ---- | ---- | ---- | ---- |
| RL bandit (ε=0, 0.1, 0.2) | **2199** | 0.814 | 1.000 |
| XGBoost @ thr 0.77 | 341 | 0.864 | 0.883 |
| Oracle (knows labels) | 4047 | 1.000 | 1.000 |

## F.3 — What actually happened (the honest reading)

- **The DNN did NOT beat XGBoost.** 0.547 vs 0.686 on the *same* split. Classic
  result: with ~6,000 rows of small tabular data, a tuned tree ensemble beats a
  neural net. This is a real finding, not a failure — it closes the question
  "should we try deep learning?" for now.
- **The RL bandit "won" on utility but for a revealing reason.** It quickly
  learned that in July's 81%-disrupted regime, *warn everyone* beats a
  precision-hungry threshold: with miss cost (3) > false-alarm cost (2), the
  cheapest policy is to catch every disruption. Its precision (0.814) is just
  the base rate — that's **not** intelligence, it's the cost structure saying
  "alert everyone this week." XGBoost at thr 0.77 got higher precision (0.864)
  but paid heavily for the missed disruptions (−3 each).
- **The takeaway is about the *threshold*, not the algorithm.** v6's exported
  threshold (0.863) was tuned for precision. If the product's real cost of a
  miss is higher than a false alarm, the optimal operating point is far more
  aggressive — the RL result quantifies exactly that trade-off. This is worth
  folding into August's threshold choice.

## F.4 — Caveats / notes

- RL here is a **contextual bandit**, the only honest RL framing for this
  problem. A full MDP/Deep-Q agent would need a sequential decision environment
  this dataset doesn't provide — building one would be fiction, so we didn't.
- The bandit uses a ridge-logistic estimate of P(disrupted|x); it's a baseline,
  not a tuned agent. Its "warn everyone" outcome is robust across all ε.
- **Environment fix needed for reruns:** torch + xgboost in one process crash at
  interpreter exit unless BLAS/OpenMP threads are capped
  (`OMP_NUM_THREADS=1`). v7's first cell sets this — do not delete it.
- **Production model is UNCHANGED:** v6's `xgboost_delay_predictor_v6.json`
  remains THE model. v7 is diagnostic only.

## F.5 — Artifacts

- `travnr_ml_v7.ipynb` (14 cells, 0 errors) + `build_notebook_v7.py`.
- `exports/v7_experiment.json` — the DNN AUC + RL utility/precision/recall +
  oracle bound (no model swap).
- `torch` was added to the venv for this experiment (CPU-only).

## F.6 — One-line story

v1 0.731 (leaky) → v5 0.646 (clean) → v6 0.686 (clean + TIME) → **v7: DNN 0.547
(no), RL utility insight (warn-everyone wins in a 81%-disruption regime; real
lesson is the threshold, not the algorithm)**. XGBoost v6 stays production.
August data is still the real lever for AUC 0.8+ / precision 0.9.

---

# Addendum G — v8: re-testing the "May/June is unusable" verdict (it was right, now with evidence)

## G.0 — Why we re-tested

PART A of the plan says May/June is unusable because destination weather is 0%
on real-time rows and mismatched on rescore rows. The v8 challenge: v5/v6
already use **label back-propagation** (rescore rows → real-time feature rows)
for July. June has the exact same structure — **every one of June's 310 flights
has BOTH real-time feature rows (real origin weather, 0% dest weather) AND
rescore label rows (real terminal status)**. So by the same methodology, June
*should* be label-able. Is the exclusion actually right? We measured it.

## G.1 — What's actually in May / June / July

| Month | Rows | Flights | Real-time rows (≤72h) | Rescore rows (>7d) | Dest weather on real-time | Label-able flights |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| May | 92 | 4 | 72 | 38 | 0% | 2 (dead) |
| June | 2,131 | 310 | 1,013 | 1,245 | 0% | **104 in pre-window** |
| July | 17,985 | 967 | 16,461 | 4,157 | 100% | 559 (v6 pool) |

June's pre-departure pool (1–12h window): **354 rows / 104 flights, 67.5%
positive** — a real, label-able dataset with 0% dest weather. XGBoost handles
NaN natively, so June rows can train beside full July rows without fabricating
the missing 6 dest-weather features.

## G.2 — The walk-forward test (identical discipline to v6; same July test days)

| Config | Pooled AUC | note |
| ---- | ---- | ---- |
| **JULY only (v6 baseline)** | **0.686** | reproduced exactly (0.6858) |
| JUNE only → predict July | 0.696 | **misleading** — see below |
| MAY+JUN+JULY | 0.660 | below baseline |
| JUNE+JULY (mixed train) | 0.654 | **below baseline** |

## G.3 — The honest reading

- **Mixing June into July training HURTS** (0.654 vs 0.686). The model spends
  capacity learning June's regime (67.5% positive, different days, 0% dest
  weather) instead of July's — so on the *July* days it's asked to predict, it
  is worse. **The plan's exclusion verdict is confirmed, now with evidence.**
- **"June only" 0.696 is a trap.** The pooled number looks great, but per-day
  it is 0.385 / 0.823 / 0.853 / 0.907 — wild swings that are regime luck, not
  skill. Never trust the pooled AUC alone (this is exactly the lesson from
  v2's corr=0.06).
- **May is dead** (2 label-able flights / 21 rows) — noise, changes nothing.
- **What IS salvageable from this exercise:** the finding that June's labels
  *can* be back-propagated at all (the technical mechanism works), plus a
  clear rule for August: if August looks like July (same monitoring, full dest
  weather), keep **July-only**; June only as a *weak auxiliary* if August turns
  out to be a brand-new regime — never the primary training data.

## G.4 — Artifacts

- `travnr_ml_v8.ipynb` (14 cells, 0 errors) + `build_notebook_v8.py`.
- `exports/v8_mayjune_experiment.json` — the four AUCs + pool sizes + verdict.
- No production model change. v6 XGBoost remains THE model.

## G.5 — One-line story

**May/June exclusion re-verified with data:** June is label-able (back-prop
works) but adding it lowers honest July AUC (0.654 < 0.686); the plan was right
all along — and now we know *why*: a different regime + 0% dest weather costs
more than extra rows gain. **v6 (July-only, TIME features) stays the model;**
August data is still the only real lever.
