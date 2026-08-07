# ML Plan for v2 Database — VERIFIED ANALYSIS & Q&A

> Every number in this file is produced by the scripts in `ml_analysis/`:
>
> - `audit_dataset.py` — full per-column audit
> - `heuristic_eval.py` — heuristic performance vs final outcomes
> - `deepdive_periods.py` — May/June vs July, pre/post departure, feature audit
>
> Run them anytime the CSV changes: `python3 ml_analysis/<script>.py`

---

## PART A — The May/June Question (deep dive, CORRECTED after v1-table discovery)

### A.0 Discovery: the v1 tables DO have weather (in `signals` JSON)

You were right. The original `risk_score_history.csv` (13,469 rows) and
`monitored_flights.csv` contain weather — but **inside the** `signals` **JSON
column**, not as flat columns. A v1 row looks like:

```
signals: {
  originWeather: {ceilingFt, gustSpeedKt, hasFreezing, windSpeedKt,
                  flightCategory, hasThunderstorm, visibilityMiles},
  destinationWeather: {ceilingFt, gustSpeedKt, hasFreezing, windSpeedKt,
                       flightCategory, hasThunderstorm, visibilityMiles},
  nasOrigin/nasDestination: {hasGroundStop, hasGroundDelay, avgDelayMinutes},
  carrierHealth: {reliable, sampleSize, avgDelay24h, healthScore, cancellationRate24h}
}
```

Coverage of v1 weather by flight-departure month:


| Month | Rows   | Origin weather full | Dest vis/wind/gust/ceiling | Dest flightCategory |
| ----- | ------ | ------------------- | -------------------------- | ------------------- |
| May   | 77     | 99%                 | **0%**                     | 100%                |
| June  | 1,013  | 100%                | **0%**                     | 100%                |
| July  | 12,379 | 100%                | **100%**                   | 100%                |


**Key correction to the previous version:** the original May/June rows DO have
**origin** weather (99-100%). What they are missing is (a) **destination
weather** (only the flightCategory was stored) and (b) **delay labels** (v1
never recorded the final delay — every v1 row has `flightStatus: null`). See
A.2.

### A.1 v1's July rows are REAL-TIME monitor rows, not a rescore

The 12,379 v1 July rows were scored **live on the departure day** — e.g. flight
319 dep 2026-07-20 07:10 was scored at 06:59, 07:02, 07:32, 08:02, 08:32 ...
(15 rows, all Jul 20). Gap distribution across all v1 July rows:


| Gap (scored vs departure) | Rows  |
| ------------------------- | ----- |
| 0–24h before departure    | 6,673 |
| 0–6h after                | 3,192 |
| 6–72h after               | 2,514 |
| >72h after (stale)        | **0** |


So **v1's July 20–23 data has correct-timed weather** — my earlier
characterization of "Jul 20–23 = rescore with approximate weather" was WRONG.
Those rows are real-time. The v2 rescore only added **5,606 new July rows**
(v2-only ids), and 1,531 of those are stale (>72h after departure) — see A.4.

### A.2 The real structure of v2's May/June rows

v2 = **all 13,469 v1 rows (1:1 by id) + 6,740 rescore-created rows**. The
May/June slice splits into two halves, and BOTH are now precisely understood:

**ORIGINAL (the v1 rows, 1,090):** real-time timing (scored pre-departure,
origin weather 100%) — but **destination weather is 0%** (only category) AND
**delay labels are ~all zero** (1,065/1,090 have a delay value, but only 1 row

> 0; 0 cancelled). v1 never captured final delays. Unusable as-is.

**RESCORED (1,134):** full weather (100%) and real labels (59% positive) — but
the weather is **July weather** (fetched ~45 days after the flight departed).
v1 **can** fix their ORIGIN weather: all 1,134 rows (100%) have a v1 real-time
origin-weather reading for the same flight. But v1 **cannot** fix their
destination weather — v1 never stored it for May/June (0%).

### A.3 Why we EXCLUDE May/June — now CONFIRMED by v8 experiment (2026-08-04)

Even applying your idea (copy v1's correct weather into the mismatched v2
rows), May/June remains unusable for the full 29-feature model:

- **Origin weather:** fixable from v1 (100% of rescored rows).
- **Destination weather:** **unfixable everywhere.** v1 never captured it for
  May/June (only flightCategory). The aviationweather.gov API only serves the
  **previous 15 days** of data (verified in their docs), and May/June is 45+
  days old — so historical dest weather **cannot be re-fetched today**.
- **Labels:** the original rows have no labels; the rescored rows do, but they
  sit on July weather that we cannot correct on the dest side.

So dest weather is the hard blocker for May/June, not origin weather. A model
cannot train 6 dest-weather features on rows where those features never existed.

**v8 EMPIRICAL CONFIRMATION (Addendum G, `travnr_ml_v8.ipynb`):** we challenged
this verdict using the same label back-propagation v5/v6 use for July — and it
turned out June *is* technically label-able (310/310 flights have both
real-time feature rows and rescore label rows → 354 pre-window rows / 104
flights, 67.5% positive). But under the identical walk-forward split, mixing
June into the July train pool **lowers** honest July AUC (0.654 vs v6's 0.686).
Why: June has a different disruption regime (67.5% vs 81.3% positive) plus 0%
dest weather, so the model spends capacity on a regime it isn't asked to
predict. "June-only" pooled 0.696 is regime luck (per-day 0.385–0.907). May is
dead (2 label-able flights). **Conclusion: exclusion stands, now with
evidence.** Rule for August: if August looks like July (full dest weather, same
monitoring), train **July-only**; use June only as a weak auxiliary if August
is a brand-new regime — never the primary.

**This is NOT about** `is_test_flight` (those are real AeroDataBox flights).
It's about dest weather being permanently unavailable for May/June.

### A.4 July is mostly real-time and clean — 1,531 stale rows excluded as FEATURES (but kept as LABEL source)

Of the 17,341 usable July rows, **1,531 (8.8%) are stale** — scored 3–7 days
after departure in a single late rescore pass on **Jul 27** for Jul 20–23
flights. **Important: these rows must NOT be discarded entirely.** They are
the only place where the flight-status API finally reported the real outcome
(see E.7) — so they are **excluded as feature rows** but **kept to determine
each flight's label**:


| Departure date | Stale rows (scored Jul 27) |
| -------------- | -------------------------- |
| Jul 20         | 558                        |
| Jul 21         | 440                        |
| Jul 22         | 252                        |
| Jul 23         | 274                        |
| **Total**      | **1,531**                  |


Gap range: 72.2 to 162.0 hours after departure. **All 1,531 stale rows are
rescore rows; 0 are v1 rows** (v1's own rows are all correctly-timed per A.1).
Excluded via a >72h cutoff **for feature purposes only**. The remaining July
data is real-time-quality. Their *labels* survive because back-propagation
reads every row of a flight (see E.7).

**Data-quality hierarchy (final):**

1. **v1 real-time July 20–23 rows** (12,379) — correct-timed weather, labels via back-propagation (best)
2. **v2 rescore July rows scored within 72h** — same-day/next-day weather, exact labels (good)
3. **v2 rescore Jul 27 pass** (1,531 rows) — stale weather → **excluded**
4. **May–June** — origin weather fixable from v1, but dest weather permanently unavailable (unusable)

---



## PART B — "How do we have 17k rows from 967 flights?"



### B.1 The 41/cycle limit is NOT 41 flights total

`server2/lib/disruption/monitor.ts:292-298`:

```sql
SELECT * FROM clean.monitored_flights_v2
WHERE status = 'active' AND departure_date >= today AND departure_date <= tomorrow
LIMIT 41
```

- The `LIMIT 41` caps flights **per 60-min cycle**, not lifetime.
- The test seeder inserts ~72 real flights/day (6 airports × 4 time buckets × 3 flights each).
- Flights stay `active` until archived 36h after departure.
- So ~100-190 flights are active at once, and the monitor rotates through them
41 per cycle — every flight gets scored repeatedly before archiving.

Plus the July rescore backfilled scores for flights that were already in the
table. Result for July:


| Departure date | Unique flights | Rows       | Rows/flight |
| -------------- | -------------- | ---------- | ----------- |
| Jul 20         | 186            | 2,355      | 12.7        |
| Jul 21         | 185            | 6,098      | 33.0        |
| Jul 22         | 126            | 2,965      | 23.5        |
| Jul 23         | 176            | 2,492      | 14.2        |
| Jul 25         | 89             | 712        | 8.0         |
| Jul 26         | 48             | 991        | 20.6        |
| Jul 27         | 45             | 1,067      | 23.7        |
| Jul 28         | 59             | 613        | 10.4        |
| Jul 29         | 53             | 692        | 13.1        |
| **Total**      | **967**        | **17,985** | **18.6**    |


Each row = one scoring event. ~18 rows per flight average = the monitor scored
each flight ~18 times over its active life.

### B.1b Is the newest data (Jul 29) extracted correctly?

Mostly yes — with one caveat, and it's quota, not code.

- **Weather extraction is correct for every day.** aviationweather.gov is a
free API with no quota; Jul 20–29 all show ~100% weather coverage.
- **Flight-status extraction is correct when AeroDataBox quota is available.**
Jul 25–28 rows are ~100% complete on delay/status.
- **Jul 29 dropped to 19% delay coverage** (only 126 of 692 rows have a delay
label). Cause: AeroDataBox API quota exhausted that day (563 of 692 calls
returned HTTP 429) — documented in `apiCallTracker.ts`. This is a known
operational limit, not a data-integrity bug. It resets Aug 1.

**Bottom line:** new daily data is extracted correctly as long as AeroDataBox
quota holds. The extraction code is sound; the Jul 29 gap is quota exhaustion.

### B.1c "Why does July have 15k rows but May/June only 2k?" — the mismatch is REAL

You asked about the massive monthly mismatch. It's real, and it's **monitoring
history, not data loss**:


| Month | Flights monitored (v2) | Risk rows | Why                                                      |
| ----- | ---------------------- | --------- | -------------------------------------------------------- |
| May   | **4**                  | 93        | Seeder ran only 2 test days (May 19–20)                  |
| June  | **310**                | 2,131     | Seeder ran 3 days (Jun 9–11) at ~100 flights/day         |
| July  | **1,642**              | 17,985    | Seeder ran every day (Jul 20–29) at ~180–270 flights/day |


The monitor can only produce rows for flights that exist in `monitored_flights`.
In May there were only 4 flights total; in June, 310; in July, 1,642. The row
counts follow the flight counts. **The v1 and v2 flight tables agree exactly**
on the May/June numbers (4 and 310), so this is genuine system history, not a
missing-data artifact. The system simply wasn't seeding many flights in
May/June.

### B.2 Do we feed ML the monitored AND unmonitored flights?

Every row in `risk_score_history_v2` was **created by a scoring event** — the
monitor or the rescore. A flight that was never scored has **no row, no
features, no label**, so it cannot be part of training. **We feed ML every
scored (monitored) flight's rows.** There is no separate "unmonitored but
labeled" population available.

One implication: the monitor over-samples risky flights (which is why the
training labels are ~72% positive vs ~10-20% in real life). This is handled by
threshold tuning (§ E.4), not by trying to build an unmonitored dataset.

### B.3 XGBoost vs time-series models

**Use XGBoost (gradient boosting). Not LSTM/sequence models. Here's why:**

- The data is **panel/longitudinal** (many rows per flight over time), not true
time-series. XGBoost treats each row as an independent sample — that's fine
because `hours_until_departure` tells the model where in the flight's
lifecycle the row sits.
- LSTM/GRU models need fixed-length input sequences and **far** more data
(typically 100k+ sequences). With ~16k rows across 962 flights, a deep
sequence model would badly overfit.
- Industry practice for tabular flight-delay prediction is gradient boosting
(XGBoost/LightGBM/CatBoost) or Random Forest. XGBoost wins most Kaggle
tabular competitions for exactly this data shape.
- If you ever want sequence modeling, the right intermediate step is **feature
aggregation per flight**: collapse each flight's rows into one row with
engineered "trend" features (e.g., last 3 wind readings, rate of signal
change). That's future work; not needed for v1.

---



## PART C — Labels, "positive/negative", negative hours



### C.1 What do "positive" and "negative" mean?

After back-propagation (see §2), every row has one binary label:

- **positive (1)** = the flight's **final** outcome was delay ≥ 15 min or cancelled
- **negative (0)** = the flight's **final** outcome was on-time (delay < 15 min)

"Positive" here means "the thing we want to predict/avoid happened", not
"good". XGBoost predicts the probability that a row is positive (i.e., the
flight will be disrupted).

### C.2 What does negative `hours_until_departure` mean?

`hours_until_departure = (scheduled departure time) - (scoring time)`, in hours.

- **Positive** (e.g., +5) = the flight was scored **5 hours before** departure. Pre-departure. This is what production needs (predict before it flies).
- **Negative** (e.g., -13) = the flight was scored **13 hours after** its scheduled departure time. Post-departure. This happens because the rescore backfill ran after flights had already departed, and the live monitor also keeps scoring until the flight is archived.

The range in July data: **+23.9 to -162** hours. Pre-departure rows = 52% of July data, post-departure = 48%.

### C.3 Expanded explanation of back-propagation (§2.1)

Each flight appears as ~18 rows (one per monitor cycle). The `actual_delay_minutes`
column in each row is **the delay reported at that monitoring moment** — not the
flight's final delay. Example, real row DL5733:


| scored_at | hours_until_departure | actual_delay_minutes |
| --------- | --------------------- | -------------------- |
| Jul 20    | -0.4                  | 0                    |
| Jul 27    | -155                  | 23                   |
| Jul 28    | -10                   | **149**              |


The audit verified **1,010 of 1,281 flights (79%) show different delay values
across their own rows.**

"Back-propagate" = look at the WHOLE flight, find its FINAL outcome (max delay
anywhere + whether it was ever cancelled), then write that outcome onto EVERY
row of the flight. So the Jul 20 row above (delay=0) still gets label **1**,
because the flight eventually arrived 149 min late. Now the model learns:
"at any point before departure, these signals predict the eventual outcome" —
exactly what the monitor needs.

**Cross-check you asked for:** this is the standard approach for point-in-time
prediction on panel data (predict final outcome from features available at time
T). It is NOT target leakage — the label describes the flight's outcome, which
we legitimately want to predict. We just make sure the test set contains
whole flights the model never saw (see §4.3).

---



## PART D — Features (corrected)



### D.1 Corrected feature list (29 features)

The previous version wrongly dropped a raw feature. `signal_inbound_delay_raw_minutes`
**is RAW data** (the inbound aircraft's delay in minutes from the flight-status
API, written verbatim at v2Writer.ts:94) — it is NOT heuristic math. Only its
bucketed twin `signal_inbound_aircraft_delay` (0-40) is heuristic. Audit:
96.9% of July rows have it; 3.8% nonzero; max 520 min. It's a strong delay
predictor. Re-added (renamed `inbound_delay_minutes`).


| #   | Feature                           | Source                          | Notes                                                              |
| --- | --------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| 1   | carrier_iata                      | raw                             | 39 carriers                                                        |
| 2   | origin_iata                       | raw                             | 6 seeder airports                                                  |
| 3   | destination_iata                  | raw                             | **208 values — see D.2**                                           |
| 4   | hours_until_departure             | raw (time math)                 | the phase indicator                                                |
| 5   | departure_hour                    | raw                             | scheduled hour                                                     |
| 6   | departure_day_of_week             | raw                             | scheduled day                                                      |
| 7   | origin_flight_category            | raw METAR                       | VFR/IFR/MVFR/LIFR                                                  |
| 8   | origin_wind_speed_kt              | raw METAR                       |                                                                    |
| 9   | origin_gust_speed_kt              | raw METAR                       | 88% zero (no gust) — real, keep                                    |
| 10  | origin_visibility_miles           | raw METAR                       |                                                                    |
| 11  | origin_ceiling_ft                 | raw METAR                       | 99999 = unlimited sentinel                                         |
| 12  | origin_has_thunderstorm           | raw METAR                       |                                                                    |
| 13  | destination_flight_category       | raw METAR                       | includes 11% 'UNKNOWN' (METAR fetch failed) — valid category, keep |
| 14  | destination_wind_speed_kt         | raw METAR                       |                                                                    |
| 15  | destination_gust_speed_kt         | raw METAR                       |                                                                    |
| 16  | destination_visibility_miles      | raw METAR                       |                                                                    |
| 17  | destination_ceiling_ft            | raw METAR                       |                                                                    |
| 18  | destination_has_thunderstorm      | raw METAR                       |                                                                    |
| 19  | origin_has_ground_stop            | raw NAS                         |                                                                    |
| 20  | origin_has_ground_delay           | raw NAS                         |                                                                    |
| 21  | origin_nas_avg_delay_minutes      | raw NAS                         | 94% zero (no program) — real, keep                                 |
| 22  | destination_has_ground_stop       | raw NAS                         |                                                                    |
| 23  | destination_has_ground_delay      | raw NAS                         |                                                                    |
| 24  | destination_nas_avg_delay_minutes | raw NAS                         | 96% zero — real, keep                                              |
| 25  | carrier_cancellation_rate_24h     | real DB metric                  | **not** manual bucketing                                           |
| 26  | carrier_avg_delay_24h             | real DB metric                  | **not** manual bucketing                                           |
| 27  | carrier_health_sample_size        | real DB metric                  |                                                                    |
| 28  | equipment_group                   | derived from raw equipment_type | 3.6% null → fill 'unknown'                                         |
| 29  | **inbound_delay_minutes**         | **raw API (re-added)**          | inbound aircraft delay at scoring time                             |




### D.2 destination_iata (208 categories) — how important is it, really?

**First, to clear up the confusion: we train ONLY on the v2 tables.**
`risk_score_history_v2.csv` is the single input to ML. The v1 tables
(`risk_score_history.csv` / `monitored_flights.csv`) were used **only in this
analysis** to *explain the history* of where v2's rows came from (Part A) and
to prove the July weather is real-time. Nothing from v1 is fed to the model.
There is no v1/v2 mix. v2 is the cleaned, derived, better version — that's
exactly what we train on.

Now, is `destination_iata` worth its 208 categories? Measured:


| Check                                | Result                         | Meaning                  |
| ------------------------------------ | ------------------------------ | ------------------------ |
| Unique destinations                  | 208                            | High cardinality         |
| Destinations with ≤10 rows           | 28                             | Rare cats — overfit risk |
| Rows at top-10 destinations          | 22%                            | Long tail                |
| Positive-rate across dests (≥5 rows) | min 0%, max 100%, **std 0.32** | Real spread              |
| Top-15 dest positive rates           | 41% (BWI) to 91% (SFO)         | Strong signal exists     |


So destination DOES carry signal beyond the dest weather features — e.g. SFO
is 91% positive, BWI 41%. That's structural route-level risk (cancellation
rates differ by airport). Dropping it throws that away.

But the risk is the **test set** (temporal split): 27 destinations appear in
test but never in train = 342 test rows (10%) where the model sees an unseen
destination. Options with the actual numbers:

1. **Keep it (29 features)** and rely on XGBoost categorical. The 10% unseen-destination test rows still have all other features (weather, carrier, route structure), so the model has *something* to lean on. Start here.
2. **Drop it (28 features)** if validation AUC is unstable — dest weather already captures ~most dest signal.
3. **Keep + target-encode** (average positive rate per dest, smoothed). This turns 208 cats into 1 numeric and handles unseen dests gracefully (fall back to global mean). Best of both, slightly more work.

**Recommendation: (1) keep as-is for the first run.** If test AUC < 0.55 or
the feature-importance plot shows destination_iata dominating, switch to (3)
target-encoding, not dropping.

### D.3 Remaining nulls / constants / zeros in the kept July data (audited)


| Concern                                         | Verdict                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constants in kept features                      | None (all ≥ 2 unique, checked)                                                                                                                                                                          |
| Nulls in kept features                          | Only `equipment_group` (3.6%) — fill with `'unknown'`                                                                                                                                                   |
| Zero-heavy columns                              | `gust_speed_kt` (88%), `nas_avg_delay` (94-96%), `carrier_avg_delay_24h` (79%) — these are **real** measurements (no gust, no NAS program, carrier on-time), NOT junk. XGBoost handles them fine. Keep. |
| `destination_flight_category` = 'UNKNOWN' (11%) | Real METAR-fetch-failure sentinel — valid category, keep                                                                                                                                                |
| Stale rescore rows (>72h after dep)             | **1,531 rows excluded** (see A.4)                                                                                                                                                                       |
| `departure_time` format                         | Two formats exist: `HH:MM` and full datetime `YYYY-MM-DD HH:MMZ` (Jul 27 rows). Preprocessing must handle both before computing `hours_until_departure`.                                                |


**Conclusion: after excluding May/June, excluding the 1,531 stale rescore rows
(>72h after departure, all Jul-27 rescore pass) **as feature rows only**, and
dropping 41 columns, the feature dataset is 15,817 rows from 962 flights.**
Labels for those 15,817 rows are back-propagated from EACH flight's real
outcome — which for 504 of 652 positive flights is reported ONLY in the
excluded stale rows, so the labels read from ALL rows of the flight (see E.7).
No further feature-row removal is needed. (Corrected: the majority of July
20–23 rows are v1 real-time rows with correct-timed weather — see A.1 — not
rescore rows.)

---



## PART E — Training plan (revised)



### E.1 Dataset size — is 15,817 rows enough?

Industry practice for gradient-boosted trees:


| Rows              | Suitability                      |
| ----------------- | -------------------------------- |
| < 1,000           | Poor (overfits)                  |
| 1,000–5,000       | Fair (simple patterns only)      |
| 5,000–10,000      | Good                             |
| **10,000–50,000** | **Very good (reliable, stable)** |
| 50,000+           | Excellent                        |


15,817 rows × 29 features, from 962 unique flights, is solidly "very good".
The previous ML attempt failed because it used ~494 mixed-quality rows from the
old v1 tables, not because of XGBoost.

### E.2 Split strategy — explained from scratch (no jargon)

> Read this whole section in order. If one part doesn't click, the example in
> E.2.2 is the key — go back to it.



#### E.2.1 Start with the flight, not the rows

Pick one real flight. Call it **DL5733**, departing **19:00** on **Jul 21**.
Its final outcome: it actually left late and arrived **149 min late** (so its
label, after back-propagation, is **1 = "disrupted"**).

Now here's the thing: this ONE flight produced **~18 rows** in the table,
because the monitor didn't score it once — it re-scored the same flight every
time it ran (every ~60 min), plus the backfill rescored it again. Each of those
rows is a snapshot: *"here is what I could observe about DL5733 at this exact
moment."*


| scored_at (the moment it was observed)   | hours_until_departure | Label |
| ---------------------------------------- | --------------------- | ----- |
| Jul 21 **14:00** (5h before takeoff)     | **+5.0**              | 1     |
| Jul 21 **16:00** (3h before takeoff)     | **+3.0**              | 1     |
| Jul 21 **18:30** (30 min before takeoff) | **+0.5**              | 1     |
| Jul 21 **21:00** (2h AFTER takeoff)      | **−2.0**              | 1     |
| Jul 22 **03:00** (8h AFTER takeoff)      | **−8.0**              | 1     |


The label (1) is identical on every row — because it's the flight's FINAL
outcome, stamped onto every row of that flight. **The label does not change
row-to-row.**

#### E.2.2 The #1 confusion: "isn't post-departure the answer? Isn't that cheating?"

**Post-departure rows are NOT the answer.** This is the single most important
thing to understand, and your instinct is pointing at the right place but for
the wrong reason. Let's fix it:

A row — pre OR post — contains ONLY **features** (weather, NAS programs,
carrier metrics, time of day, hours_until_departure). It does NOT contain
"this flight was 149 min late." The label is applied separately afterward, via
back-propagation, and it's applied to ALL rows equally.

So what does a **post-departure row** (hours = −2) look like? It looks exactly
like a pre-departure row: a list of weather / NAS / carrier numbers. Nothing in
it says "this flight is delayed." The "149 min late" fact lives ONLY in the
label column, which is the SAME for the +5 row and the −2 row.

**So training on post rows is NOT "feeding the model the answer."** You are not
cheating by including them. If you train a model on post rows only, it still
has to figure out the label from weather + NAS + carrier — exactly the same
learning problem as pre rows.

BUT — and here's where you were half-right — there IS a real problem with post
rows, just a subtler one:

> **A post-departure row has `hours_until_departure < 0`. And the model is
> smart enough to notice: "every time hours_until is negative, the flight has
> ALREADY left... and flights that already left are usually the disrupted
> ones." So the model can cheat by leaning on the sign of that one number —
> predicting "disrupted" whenever hours < 0 — and ace the training set while
> being completely useless for production.**

That's the real trap. It's not that post rows "contain the answer" — it's that
**the value** `hours_until_departure` **itself is a feature**, and in production
the model will never see a negative value (production only predicts BEFORE the
flight leaves). A model that over-relies on "hours < 0 ⇒ disrupted" is overfit
to a signal it can't use in the real world.

That's why we care about pre vs post so much. It's not "post = the answer." It's:

> **Production can only ever feed the model PRE-departure rows (hours > 0,
> before takeoff). So our training and testing should look like what
> production will actually feed it. Post rows are not the answer — they're just
> a different data distribution that the model might over-rely on.**

Your takeaway was actually correct (train on pre rows), and now you know the
true reason: **not because post rows are "the answer," but because post rows
have a** `hours_until_departure` **value the model can exploit as a shortcut that
won't exist in production.**

#### E.2.3 What is "scoring time" / `scored_at`?

"Scoring time" is just **the moment the monitor looked at the flight and
computed its features.** The system calls its `scoreFlightRisk()` function on a
flight at some moment; that moment is `scored_at`, and the features in that row
are whatever the weather/NAS/carrier APIs returned *at that moment*. Nothing
more.

- `hours_until_departure = departure_time − scored_at`.
- If that number is **positive**, the row was captured **before** takeoff (pre).
- If **negative**, it was captured **after** takeoff (post).

Pre/post literally means "was this snapshot taken before or after the plane
left the ground?" — exactly what you thought. The only subtlety is that a
single flight has BOTH kinds of snapshots (verified: 582 of 721 pre-row
flights also have post rows), because the monitor keeps looking at it from
hours before until hours after departure.

#### E.2.4 The three confounds (why a naive date split is dangerous)

Your goal is: *"predict, before the flight leaves, whether it'll be disrupted."*

A naive split by date — "train on Jul 20–22, test on Jul 25–29" — looks clean
but secretly changes THREE things at once between train and test:


| #                           | Mismatch                                                                                                  | What it actually means                                                                                                                             | Measured                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **1. Row source**           | Train rows are mostly from the **rescore/backfill**; test rows are mostly from the **live monitor**       | Different code paths, different feature timing                                                                                                     | Train 55% pre; Test 68% pre                           |
| **2. Time of day**          | Morning flights (dep 6–14h) are 69% **post**-departure rows; evening flights (dep 15–23h) are 78% **pre** | Because the backfill ran in the afternoon, it caught morning flights after they'd left; the live monitor catches evening flights before they leave | Morning 69% post; Evening 78% pre                     |
| **3. Prediction lead time** | Train's pre-rows sit closer to takeoff than test's pre-rows                                               | The model in production must predict at 1–12h out; if train only shows it "predict 6h before" and test asks "predict 9h before," that's a gap      | Train pre median lead 5.8h; Test pre median lead 8.9h |


"What does 'test set has different hours' mean?" — It means this: if the train
set happens to contain lots of *morning* flights and the test set contains lots
of *evening* flights, then when the model does badly on test, we won't know if
it's because it failed to predict disruption, or simply because it never saw
evening flights' weather patterns. The test score gets muddied by a thing we
didn't intend to test (time-of-day), so we can't trust the number as a measure
of "can this predict disruption?" We want the test to differ from train ONLY in
"flight not seen before" — not in hours, not in lead time, not in row source.

#### E.2.5 The three options, with your questions answered directly

**Option 1 — temporal split by flight (train on backfill, test on live).**
Train = Jul 20–22 rows, Val = Jul 23, Test = Jul 25–29 (10,168 / 2,218 /
3,431 rows, 497 / 176 / 289 flights, 0 flight overlap).

- Good: simulates "train on old data, deploy on new live data."
- Bad: carries ALL THREE confounds from E.2.4 at once, so a bad test score is
ambiguous. Don't make this the headline.

**Option 2 — random split by flight, using ALL rows (pre AND post), 70/15/15.**
This is your "mix it all up" idea.

- Good: every set sees both pre and post, both morning and evening, every
destination — no time-of-day/lead-time confound.
- Bad: **it mixes post rows into training**, so the model can lean on the
"hours < 0 ⇒ disrupted" shortcut from E.2.2 — and we won't notice, because
the test set has post rows too. Your worry is directionally right, and now
you know the precise mechanism: not "the answer leaks in," but "the model
exploits a feature value (negative hours) that production never has."

**Option 3 — PRE-ONLY, split by flight, stratified by hour + lead time.
(RECOMMENDED)**

- Use only pre-departure rows at production lead times (1–12h before takeoff).
That's ~6.7k rows (verified table in E.2.6).
- Split by flight (70/15/15) so no flight appears in two sets.
- Then stratify the split so train/val/test each have the SAME mix of
departure-hours and lead-times.
- Good: **matches production exactly** — pre rows, real lead times, no "hours
< 0" shortcut possible (there are no post rows at all). This is the honest
test of "can we warn the passenger before the plane leaves?"
- Bad: uses fewer rows (~6.7k instead of 15.8k) — but every one of them is the
real thing production will feed.



#### E.2.6 My recommendation

**Run Option 3 as the primary answer.** It directly tests your goal sentence:
*"given only pre-departure information, 1–12h before takeoff, can we predict
disruption better than the heuristic?"*

Then run **Option 2 as a second experiment** to answer a different, useful
question: *"do post-departure rows contain information that helps pre-departure
prediction, or do they just teach the model the negative-hours shortcut?"* If
Option 2 beats Option 3 by a lot, some of the post information transfers and
we can consider using it in production training. If not, we stick with pre-only.

**The one-line rule that governs all of this:** *The model is only useful if it
generalizes from the rows it trained on to the rows production will feed it —
live pre-departure rows at 1–12h lead. Every split decision should be judged
against that sentence.*

The pre-rows available at production lead times (1–12h), by departure date:

> **Tally note:** the counts below are a stale snapshot (6,688 rows). The
> notebook (`ml_analysis/travnr_ml_v1.ipynb`) recomputes this table from
> whatever CSV is present *at runtime* — a newer export (e.g. with more Jul 29
> rows) will show a larger total (e.g. 7,021). Always trust the notebook's
> live count over this static table.


| Departure date | Usable pre rows (lead 1–12h) |
| -------------- | ---------------------------- |
| Jul 20         | 562                          |
| Jul 21         | 2,451                        |
| Jul 22         | 1,455                        |
| Jul 23         | 696                          |
| Jul 25         | 165                          |
| Jul 26         | 400                          |
| Jul 27         | 477                          |
| Jul 28         | 397                          |
| Jul 29         | 85                           |
| **Total**      | **6,688**                    |




### E.3 XGBoost hyperparameters

```
n_estimators=300, max_depth=6, learning_rate=0.1,
subsample=0.8, colsample_bytree=0.8,
enable_categorical=True (or label-encode the 6 category columns),
eval_metric='auc', early_stopping_rounds=20, random_state=42
```



### E.4 Threshold tuning (class imbalance)

Training labels are ~72% positive; production is ~10-20%. Do NOT use 0.5.
Tune the decision threshold on the validation set by maximizing F1, then apply
it to the test set (see previous version's §6.6 code, still valid). The model
outputs a probability; the threshold maps it to RED/AMBER/GREEN.

### E.5 Test set contents (what you asked)

The contents depend on which option you run:

- **Option 1 (temporal):** test = every row of flights departing **Jul 25–29**
(3,431 rows, 289 flights, 68% pre). Val = Jul 23 flights (2,218 rows, 176
flights). Train = Jul 20–22 flights (10,168 rows, 497 flights). Whole flights
only — verified 0 overlap.
- **Option 2 (mixed random):** test = 15% of flights drawn randomly across all
July, with all of their rows (pre + post, rescore + live mixed).
- **Option 3 (pre-only, recommended):** test = 15% of flights' **pre-departure
rows only**, stratified so test departure-hour and lead-time distributions
match train. This is the honest production-like evaluation.



### E.6 What ELSE might be mismatched? (the audit you asked for)

You asked whether other dimensions besides pre/post could bite us. I checked
every one. Here's the full list:


| Dimension                         | Is it a mismatch? | Evidence                                                                 | Verdict                                            |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| **Data origin** (rescore vs live) | Yes               | Train (Jul 20–22) = rescore-heavy; Test (Jul 25–29) = live-heavy         | Must report; Option 3 + post ablation handles it   |
| **Time of day**                   | Yes               | Morning rows 69% post, evening 78% pre — pre/post is entangled with hour | Stratify by hour in Option 3                       |
| **Prediction lead time**          | Yes               | Train pre median 5.8h, Test pre median 8.9h                              | Stratify by lead-time bucket                       |
| **Destination coverage**          | Yes, mild         | 27 destinations (342 test rows, 10%) unseen in train                     | target-encode (D.2)                                |
| **Carrier coverage**              | Yes, mild         | 4 carriers test-only                                                     | Rare; accept or target-encode                      |
| **Origin**                        | No                | Same 6 seeder airports in train/test                                     | fine                                               |
| **Equipment**                     | No                | Same 4 equipment groups both sides                                       | fine                                               |
| **Weather seasonality**           | No                | Only ~9 days of data; no seasonal trend possible                         | re-train monthly (Part H)                          |
| **Label distribution**            | Yes, by design    | Train 77.8% pos, Test 51.1% pos — test is closer to real life            | feature, not bug; threshold tuning handles it      |
| **Cancelled vs arrived labels**   | Checked           | 56 cancelled / 596 late / 311 on-time / 4 unknown of 967 flights; 504 of 652 positive flights resolve ONLY in the >72h rescore rows | Full audit in **E.7**; labels read from all rows, never deleted with stale features |


**What I would NOT obsess over:** origin (fixed 6 airports), equipment (4
groups), weather seasonality (impossible with 9 days of data).

**What I WOULD do about the ones that matter:**

1. **Report the model's score separately for pre-departure rows only.** That's
  the number that matters for production. (Post rows are informational.)
2. **Stratify the split** by departure-hour bucket and lead-time bucket so
  train/val/test look alike on those axes.
3. **Keep the flight-split invariant** (no row of a flight in two sets) — this
  is the anti-leakage rule that makes every option valid.
4. **Compare Option 2 vs Option 3** deliberately: if Option 2 (mixed) beats
  Option 3 (pre-only) by a lot, post rows ARE helping and we can include them
   in production training; if not, keep pre-only.

The single most important sentence: **the model is only useful if it generalizes
from the rows it saw in training to the rows production will feed it — live
pre-departure rows at 1–12h lead. Every split decision should be judged against
that sentence.**



### E.7 Label coverage — "how many arrived vs cancelled?" (the audit you asked for)

You asked: *"how many arrived vs cancelled do we have? We'd only use the rows
whose flights arrived or got cancelled, right?"* — Yes, exactly. Every training
row must belong to a flight whose **outcome is known** (it either arrived, so we
know its delay, or it was cancelled). Flights whose outcome was never recorded
cannot be labeled and must be dropped.

**Before the numbers, one idea that removes ALL the confusion:** every row has
TWO different kinds of information, and we use a row for only ONE of them:

| What a row holds  | Meaning                                                 | We use it for |
| ----------------- | ------------------------------------------------------- | ------------- |
| **FEATURES**      | weather, NAS, carrier, time-of-day, `hours_until_departure` these **numbers the model reads to make its prediction** | predicting |
| **LABEL**         | `actual_delay_minutes`, `actual_status`, `actual_cancelled` — the **final outcome** of the flight | answering |

A single row can be great at one and terrible at the other. Keep this table in
mind — E.7 is just deciding, per row, *"do I use it for its features, its label,
both, or neither?"*

---

**Step 1 — How many flights have a known outcome? (flight level, all 967 July flights)**

Read each flight's FINAL outcome (cancelled, or final delay) from its newest row:

| Outcome                      | Flights | %     |
| ---------------------------- | ------- | ----- |
| **Cancelled**                | 56      | 5.8%  |
| **Arrived late** (delay ≥ 15) | 596    | 61.6% |
| **Arrived on time** (delay < 15) | 311 | 32.2% |
| **Unknown** (never resolved) | 4       | 0.4%  |
| **Total**                    | 967     | 100%  |

- **Disrupted** (cancelled + late) = **652 flights (67.4%)**
- **Clean** (on time) = **311 flights (32.2%)**
- **Unknown** = **4 flights (0.4%)** → drop all 4; their rows can't be labeled.

---

**Step 2 — When does the label appear? (why an "old" row can be the only copy)**

Here is the part that felt contradictory, explained slowly.

The `actual_*` columns are a snapshot the flight-status API returned at that
moment (`v2Writer.ts:73`). Before a flight has finished, the API simply doesn't
know the answer yet, so early rows say **`delay=0, status=Scheduled`** — not
because the flight is fine, but because it hasn't happened yet. The API only
tells the truth **once the flight has flown and the outcome is settled** —
usually a day or more later, after we stopped watching it live. The backfill
pass on **Jul 27** is what finally asked again and recorded the real outcome.

Measured: of the **652 positive flights**, the ≥15-min delay / cancel label
**first appears** in a row this far after departure:

| Where the ≥15-min label first appears | Flights | % of positive |
| ------------------------------------- | ------- | ------------- |
| Within 24h of departure               | 85      | 13%           |
| 24–72h after departure                | 63      | 10%           |
| **>72h after departure (Jul-27 pass)**| **504** | **77%**       |

**Consequence:** for **504 of 652 positive flights, the only rows that ever tell
the truth are the "stale" (>72h) rows.** If we threw those rows away entirely,
504 flights would flip from "positive" to "negative" — because every remaining
row still says `delay=0`.

**Now the rescue.** Those >72h rows are ugly for **features** (their weather was
fetched days after the flight — useless for predicting). But they are gold for
**labels** — they are the ONLY record of whether that flight was disrupted. So
we put them to work on their one good side:

> **Read the LABEL from any row of the flight (including the stale ones). Then
> attach that label to the flight's GOOD feature rows (the pre-departure rows
> at 1–12h lead).**

That last sentence is the whole trick. A flight has many rows. We pick a row
whose **features** we trust (pre-departure snapshot), and we take its **label**
not from that same row but from the flight's **final outcome**, found wherever
it was recorded.

Why the >72h rows are "excluded as features but kept for labels" — put in one
line:

| Row group            | Its features good? | Its label known? | Do we use it for |
| -------------------- | ------------------ | ---------------- | ---------------- |
| Pre-departure, 1–12h (in July)   | ✅ yes (right-day weather) | ❌ often still "0/Scheduled" | **FEATURES** |
| Post-departure ≤72h  | 🟡 | 🟡 some resolve | occasionally |
| **>72h (Jul-27 rescore)**       | ❌ **wrong day, even in July** | ✅ **real outcome** | **LABEL ONLY** |

**Yes — even in July the >72h rows have wrong-day features.** "Wrong day" does
not reference May/June; it means the row itself was created 3–7 days after that
flight's departure, so its weather/NAS/status reflect *three days later*, not
the day the flight left. That is why it can't predict. But its `actual_delay`
value is exactly the flight's real outcome, which is why we keep it for labels.

---

**Step 3 — The rule, stated once, clearly**

1. **FEATURES** come from rows scored pre-departure at 1–12h lead (the >72h
   rows are **not** feature rows — wrong-day weather).
2. **LABEL** comes from the flight's **final outcome**, back-propagated from
   **any** of its rows — including the >72h rescore rows (their label is never
   discarded with their features).
3. **DROP** the 4 unknown-outcome flights (0.4%).

| Label source used                    | Positive | Negative | Unknown |
| ------------------------------------ | -------- | -------- | ------- |
| Only ≤72h rows (WRONG — the trap)    | 148      | 815      | 4       |
| All rows incl. rescore (CORRECT)     | 652      | 311      | 4       |

The left row is what you'd get if you naively took each row's own labels from
only its ≤72h rows (reading "0/Scheduled" as "on time" → huge false-negative
blowup). The right row is correct: labels read from the whole flight.

---

**The final training pool** (features: pre-departure, lead 1–12h, complete
weather + equipment; label: back-propagated, known outcome):

| Departure date | Rows | Positive | Negative |
| -------------- | ---- | -------- | -------- |
| Jul 20         | 562  | 459      | 103      |
| Jul 21         | 2,451| 1,789    | 662      |
| Jul 22         | 1,455| 1,239    | 216      |
| Jul 23         | 696  | 513      | 183      |
| Jul 25         | 165  | 127      | 38       |
| Jul 26         | 400  | 300      | 100      |
| Jul 27         | 477  | 241      | 236      |
| Jul 28         | 397  | 145      | 252      |
| Jul 29         | 85   | 0        | 85       |
| **Total**      | **6,688** | **4,813** | **1,875** |

- **6,688 rows / 662 flights**, positive rate **72.0%**.
- Note Jul 29's 85 rows are ALL negative (positive rate 0%) — these are the
  latest live-monitor flights whose delayed/cancelled siblings resolved after
  the AeroDataBox quota reset; expect this date to gain positives once more
  data is backfilled (see Part H).

#### E.7.1 The exact cancelled vs arrived breakdown of the 6,688 pool (verified)

You asked for the precise split of the final pool. Here it is, at both levels,
directly from `risk_score_history_v2.csv` (reproducible in `audit_dataset.py`
§11):

**Row level — each of the 6,688 training rows is a pre-departure snapshot of a
flight with one of these three known outcomes:**

| Outcome class       | Rows     | % of 6,688 |
| ------------------- | -------- | ---------- |
| **Cancelled**       | **497**  | 7.4%       |
| **Arrived late** (≥15 min) | **4,316** | 64.5% |
| **Arrived on time** (<15 min) | **1,875** | 28.0% |
| **Total**           | **6,688** | 100%       |

- Disrupted rows (cancelled + late) = **4,813 (72.0%)**
- Clean rows (on time) = **1,875 (28.0%)**

**Flight level — how many unique flights, and their outcome:**

| Outcome class       | Flights  | % of 662 |
| ------------------- | -------- | -------- |
| **Cancelled**       | **42**   | 6.3%     |
| **Arrived late** (≥15 min) | **412** | 62.2% |
| **Arrived on time** (<15 min) | **208** | 31.4% |
| **Total**           | **662**  | 100%     |

- Disrupted flights = **454 (68.6%)**; Clean flights = **208 (31.4%)**
- Rows per flight in the pool: cancelled **11.8**, arrived-late **10.5**,
  on-time **9.0** (average **10.1**) — all classes produce many snapshots, so
  no class is starved of rows.

**Checksums (all verified):** 497 + 4,316 + 1,875 = **6,688 rows** ✓
42 + 412 + 208 = **662 flights** ✓ (the 4 unknown-outcome flights never
entered the pool, and 301 known-outcome flights produced no usable pre row at
1–12h lead — e.g. flights only ever scored post-departure).

**How this breaks down by departure date (row counts, verified):**

| Date   | Rows | Cancelled | Arrived late | On time |
| ------ | ---- | --------- | ------------ | ------- |
| Jul 20 | 562  | 19        | 440          | 103     |
| Jul 21 | 2,451| 340       | 1,449        | 662     |
| Jul 22 | 1,455| 68        | 1,171        | 216     |
| Jul 23 | 696  | 40        | 473          | 183     |
| Jul 25 | 165  | 6         | 121          | 38      |
| Jul 26 | 400  | 12        | 288          | 100     |
| Jul 27 | 477  | 0         | 241          | 236     |
| Jul 28 | 397  | 12        | 133          | 252     |
| Jul 29 | 85   | 0         | 0            | 85      |
| **Total** | **6,688** | **497** | **4,316** | **1,875** |

Note the cancelled rows are NOT only on Jul 20–23 — they appear on Jul 25–28
too (the flight-status API reports cancellations as it resolves each flight
during live monitoring). Jul 27 and Jul 29 simply happen to have none in this
export (small samples). Cancellation is rare everywhere (row-level ≤ 13.9% on
any day), so the model treats "disrupted = late OR cancelled" as one class, as
designed in C.1.

**What this means for the model:** we have 56 cancelled flights total in July
(5.8%) but only 42 of them contribute training rows (their pre-departure rows at
1–12h lead). Cancellation is rare, so XGBoost will learn "disrupted" (late OR
cancelled) as one class — as designed in C.1. We do NOT train a separate
cancelled-only class with 42 flights; that would be too small to learn.

**So your intuition was right**: we do only train on flights with a known
outcome (arrived or cancelled). The refinement is *where* we read that outcome
from — not the row's own (often still-zero) fields, but the flight's final
state, which for 77% of positive flights lives in the "stale" rescore rows we
keep for labels while excluding them as features.

---



### E.8 XGBoost and deep learning: what the research says, in plain English

**The question you asked:** should we also use "deep learning" (neural
networks)? Is a neural network better than XGBoost for this project?

**Short answer:** For *this* dataset (6,688 rows, ~29 numeric features) the
research says XGBoost is still the state of the art. Deep learning is the right
tool when you have a LOT of data, or unstructured data (images, audio, text,
sequences) — neither of which is our case. We will make XGBoost the primary
model, and optionally add a small neural network *as an ensemble member*, not as
a replacement. The two can cooperate; nothing is lost by trying, but we set
expectations now that a neural net is unlikely to beat XGBoost here.

#### E.8.1 The two papers that settled this question

1. **Grinsztajn, Oyallon & Varoquaux, "Why do tree-based models still
   outperform deep learning on typical tabular data?", NeurIPS 2022.** The most
   widely-cited benchmark on this exact question. They tested 45 tabular
   datasets from OpenML. Result: **tree-based models (XGBoost-type gradient
   boosting) beat deep networks on the majority of datasets, and the advantage
   is biggest on "medium-sized" data — roughly 1,000–10,000 rows.** That is
   exactly our situation (6,688 rows). Their explanation: trees handle
   uninformative features and non-smooth ("step-like") target relationships
   better, while neural networks need enough data to discover those patterns
   from scratch.

2. **Shwartz-Ziv & Armon, "Tabular data: Deep learning is not all you need",
   Information Fusion 2022.** Famous follow-up showing that deep learning's
   reported wins on tabular data are **hard to reproduce and don't transfer** —
   the same DL architecture that "won" on one dataset often loses on another.
   Practical takeaway: for a small project like ours, don't build your plan
   around a technique whose advantages are dataset-specific and fragile.

Two supporting studies that are worth knowing about (they are the "counter" to
paper #1, and explain *when* DL does catch up):

3. **Gorishniy et al., "Revisiting Deep Learning Models for Tabular Data",
   NeurIPS 2021.** If you tune a plain neural network carefully, it can match
   many specialized DL architectures on tabular data — but "matching XGBoost"
   is the ceiling, and it takes a lot of tuning to get there.

4. **Gorishniy et al., "TabM", ICML 2025 (with the earlier TabR, ICLR 2024).**
   The newest DL models for tabular data finally beat XGBoost on large datasets
   (hundreds of thousands of rows). Note the condition: **large** data. On
   small/medium data like ours they still do not beat tuned boosting, and they
   require GPU time and careful hyper-parameter search.

**Summary table:**

| What | XGBoost (gradient boosting) | Neural network / deep learning |
| ---- | ---------------------------- | ------------------------------ |
| Best when | small-to-medium tabular data (ours) | very large datasets; images/text/audio/sequences |
| Data needed | works well from ~1,000 rows | typically needs many thousands+ per pattern |
| Tuning effort | one library, few hyper-params | architecture + regularization + GPU search |
| Our 6,688 rows / 29 features | state of the art (per NeurIPS 2022) | usually ties or loses, rarely wins |
| Reproducibility | high | historically mixed (per Info Fusion 2022) |

#### E.8.2 What we will actually do

- **Primary model: XGBoost.** It is the right tool for 6,688 rows, it is fast
  to train on a laptop/Colab CPU, it gives feature-importance output we can
  verify against our own domain checks (weather/NAS factors), and it handles
  the class imbalance (67% disrupted) natively.
- **Optional second model (only if time permits): a small multilayer
  perceptron (MLP)** — the simplest kind of neural network, just layers of
  weighted sums + nonlinearities — trained on the *same* feature matrix.
  Purpose: ensemble, not replacement. We average its probability with
  XGBoost's (simple model blending). If the blend does not beat XGBoost alone
  on the holdout set, we keep XGBoost only. This is exactly the "try it, but
  verify it beats the simple baseline" lesson from papers 2–4.
- **Never**: using a neural network on raw dates/airports/strings. Any DL
  approach here still needs the same engineered features from D.3; it cannot
  invent weather-window relationships from raw text better than we already
  encode them. (That is the common beginner mistake: DL is not a substitute
  for feature engineering on tabular data.)

#### E.8.3 What "deep learning" actually is, at beginner level

- A neural network is a chain of "layers"; each layer takes numbers in,
  multiplies them by learned weights, and pushes them through a non-linearity,
  then passes the result to the next layer. Training means adjusting millions
  of weights until the network's predictions match the training labels.
- **Why it needs lots of data:** each weight is an unknown; the network must
  "see" many examples to pin each weight down. With 6,688 rows, most weights
  are under-determined → the network memorizes the training data (overfitting)
  instead of generalizing. XGBoost, by contrast, fits a few hundred small
  decision-tree "if-else" rules — far fewer unknowns, so it generalizes fine.
- **Why it shines on images/text:** those inputs are huge (millions of raw
  pixel/word numbers) with patterns impossible to hand-encode, so the "learn
  the features automatically" advantage dominates. Our 29 hand-built features
  have none of that problem.

#### E.8.4 Bottom line for the plan

XGBoost-first is not a fallback; it is the evidence-based primary choice for
this dataset. Deep learning gets one small, clearly-scoped experiment (an MLP
in an ensemble) after the main model works, with a strict acceptance test: it
must beat XGBoost alone on the held-out flight split or we discard it. This
keeps the project honest, cheap (CPU only), and consistent with the published
results above.

---



## PART F — Is the heuristic good or bad? (interpreting the numbers)



### F.1 What precision, recall, F1 mean (plain English)

- **Precision** = of the alerts the model/heuristic fired, what fraction were correct?
  - Precision 92.5% RED = "when it says RED, it's right 92.5% of the time." High precision = few false alarms.
- **Recall** = of all disrupted flights, what fraction did it catch?
  - Recall 2.9% RED = "it catches only 2.9% of disruptions." Low recall = it misses almost everything.
- **F1** = one number balancing the two (higher = better).

You want BOTH high, but there's a tradeoff. The heuristic is **extremely
precise but extremely low-recall**. Being precise with 92%+ is easy when you
only fire after the delay is already visible.

### F.2 Pre-departure vs post-departure

- **Pre-departure** = scored with `hours_until_departure > 0` (before the flight leaves). This is when a warning is useful (passenger can change plans).
- **Post-departure** = scored after departure. Warning is useless (the flight is already gone).



### F.3 Verdict on the heuristic


| View                      | Numbers                          | Verdict                                                                            |
| ------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| Post-departure RED        | 98.8% precision, 6.6% recall     | "Confirming" delays that already happened — trivially easy, and too late to matter |
| Pre-departure RED         | 68.4% precision, **0.9% recall** | Effectively blind before departure                                                 |
| AMBER+RED overall         | 77.9% precision, 25.2% recall    | Catches 1 in 4 disruptions                                                         |
| **The gap ML must close** | pre-departure recall ~1%         | Huge room for improvement                                                          |


So: **the heuristic is good at precision (few false alarms), bad at recall
(misses most disruptions), and useless pre-departure.** That's exactly the job
for ML: match the heuristic's precision but lift pre-departure recall from ~1%
to ~35%+. If XGBoost cannot beat 25% AMBER+RED recall on the test set, it isn't
adding value and we should say so honestly.

---



## PART G — Implementation steps

1. **Prep (Colab)**: load CSV, strip quote artifact, handle BOTH
   `departure_time` formats (`HH:MM` and full datetime), keep July rows,
   drop rows with missing weather/equipment, fill `equipment_group` nulls with
   `'unknown'`. **Drop the >72h-after-departure rows as FEATURE rows only** (Jul
   27 rescore pass), then back-propagate each flight's label from ALL of its
   rows (including the dropped ones) — see E.7. Drop the 4 unknown-outcome
   flights. (Code in prior version §6.2, still valid — add the
   `str.strip('"')` and `startswith('2026-07')` filters, and the "label from
   any row of the flight" step.)
2. **Features**: keep the 29 in §D.1, fill `equipment_group` NaN with `'unknown'`.
3. **Split**: Option 3 primary (pre-only, flight-split, stratified by
  departure-hour + lead-time); Option 2 (mixed random) as the ablation to test
   whether post rows help. Report both.
4. **Train** XGBoost (§E.3), tune threshold on validation (§E.4).
5. **Evaluate** on test: report precision@recall=25% (match the heuristic's AMBER+RED recall), AUC, and pre-departure-only recall. Compare directly against the heuristic numbers in §F.3.
6. **Export** `xgboost_delay_predictor.json` + `threshold.json`.
7. **Deploy** as Python sidecar next to server2 (inference ~1ms/flight).



## PART H — Success criteria & risks

**Success:** on the test set (pre-departure rows, live-monitor lead times),
XGBoost achieves ≥90% RED precision AND ≥20% RED recall (heuristic: 92.5% /
2.9%), and pre-departure recall ≥35% (heuristic: 0.9%).

**Risks:**


| Risk                                                                     | Mitigation                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Rescore-origin rows don't transfer to live monitor data                  | Option-2 vs Option-3 comparison (§E.6); retrain on monitor-only data after Aug 1 quota reset |
| Pre/post + time-of-day + lead-time confounds                             | Option 3 stratification (§E.2)                                                               |
| Late-rescore rows (Jul 27 pass) contaminate training                     | Excluded as FEATURE rows (>72h cutoff, §A.4) but **their labels are still used** (E.7) — labels are flight-level, never deleted |
| 72% positive train vs ~15% production                                    | Threshold tuned on validation, not 0.5                                                       |
| `carrier_*` metrics are self-referential (computed from our own history) | Available at inference; monitor drift                                                        |
| `destination_iata` (208 cats) overfits                                   | Target-encode if validation unstable (§D.2)                                                  |
| AeroDataBox quota exhaustion (e.g., Jul 29 = 19% delay coverage)         | Monitor quota in `apiCallTracker.ts`; backfill after reset                                   |
| Only ~2 weeks of July data                                               | Re-train monthly; this is a v1 model                                                         |



## PART I — When August data arrives: the exact analysis to repeat (pre-train checklist)

Everything in this plan was audited against **July** data. The next export will
contain **August** rows. Before we retrain on July+August, we must repeat the
same audit on August so we do not *silently* carry a July-only artifact into
the combined model. This is the checklist — it mirrors exactly what we did for
July (the numbers in parentheses are the July result, so we know what "normal"
looks like).

> **Golden rule (from E.7):** one row = *either* features *or* a label source.
> Every audit below is deciding, per August row, which one it is.

### I.0 How to get the August export

> **v4/v5/v6 finding (completed — READ BEFORE AUGUST):** v4 proved July's random-split
> numbers were **inflated by same-day leakage** (honest time walk-forward was
> ~0.56) and found a **label bug** — flights were called "on-time" with ANY delay
> value even when they never reached a terminal status (151 mislabeled, worst on
> Jul 27–29), plus Jul 29 **never flew** (all 53 still `Scheduled`). v5 fixed all
> of it: on-time now requires terminal evidence, Jul 29 is dropped, and with time
> walk-forward the clean model scores **0.646 ± 0.10 AUC** (29-feature base wins).
> v6 then added legal TIME features (`days_since_july1`, `day_of_month`) + 5-seed
> averaging → **0.686 AUC**, and proved dropping `carrier_avg_delay_24h` (the
> ~label feature) costs ~nothing → the winner does NOT depend on it (safer for a
> new regime).
> **Before any August retrain: (1)** a flight's label is valid only once its
> status is terminal (`Arrived`/`Cancelled`/`Delayed`) OR it has a real ≥15min
> delay — otherwise exclude it; **(2)** drop any tail day that hasn't finished;
> **(3)** evaluate with **walk-forward time validation**, not a random split;
> **(4)** use the v6 31-feature set (BASE + TIME; cascade/extra features made it
> worse, rolling window was mixed). **Caveat from v6:** TIME features partly encode
> "this month's trend", so re-validate on August before trusting them — the
> `days_since_july1` constant must be re-anchored to the new dataset's start.
> Details in `TRAVNR_ML.md` Addendum C + D + E.

Same process as the July export: dump `risk_score_history_v2.csv` (and, if
useful, `monitored_flights_v2.csv`) from the v2 database once new rows appear.
Then run the existing scripts on it:

- `python3 ml_analysis/audit_dataset.py risk_score_history_v2.csv`
- `python3 ml_analysis/deepdive_periods.py`
- the July-vs-August comparison cells in `ml_analysis/travnr_ml_v1.ipynb`

If the export **stopped on a date** (it did ~Jul 30), first run
`REPLIT_DIAGNOSTIC_2026-08-02.md` before trusting the data — a quota-stop
(HTTP 429) or a dead monitor silently yields a *missing tail*, not an error.

### I.1 The 8 checks (each is a "what would make us stop and think")

| # | Check | Why | July result (baseline) | Stop-and-think if |
| - | ----- | --- | ---------------------- | ------------------ |
| 1 | **Row / flight totals** | Confirm the supply didn't stall | 17,985 July rows; 963 label-able flights | August has far fewer per day than July (monitor stopped) |
| 2 | **Stale (>72h) FEATURE rows** | Re-confirm the E.7 label trick still applies | 1,524 rows (>72h), kept for labels only | 0 stale rows → labels never resolved; or a different pattern |
| 3 | **Flight-level outcomes** (cancelled / late / on-time / unknown) | The exact E.7 Step-1 table | Jul: 56 / 596 / 311 / 4 | "unknown" jumps well past ~0.5% (labels not back-filled) |
| 4 | **Label first-appearance** (≤24h / 24–72h / >72h) | Where does the truth live? | Jul: 85 / 63 / 504 of 652 positive | New distribution → does back-propagation still recover everything? |
| 5 | **Positive rate in the pre 1–12h pool** | Class balance for threshold tuning | Jul: ~69% disrupted (heavy-delay month) | *Plunges* toward ~15% (that's actually expected/healthier; recheck E.4) |
| 6 | **Pre 1–12h pool size** | Enough rows to keep training "very good" | Jul: 6,688 rows (E.2.6 table) | Row count collapses → model degrades |
| 7 | **Weather / equipment nulls** | The 29 features must stay populated | Jul: clean (see A.4/D.3) | A provider changed; new null columns appear |
| 8 | **AeroDataBox coverage tail** | Quota exhaustion looks like missing days | Jul 29 coverage collapsed (0% positive that day) | Any August day with 0 positive; quota 429s in logs |

### I.2 What we do with July + August once both pass the checklist

1. **Concatenate** both months' rows into one cleaned frame (same Step-1/2 prep
   code, same 29 features, same label back-propagation).
2. **Audit drift:** compare the Step-1 outcome table and the positive rate of
   August vs July (the I checklist runs twice — once per month).
3. **Re-split with the flight-level temporal version** (Part E): train on July,
   then evaluate the July-trained model on **August**, to test true
   temporal generalization (the "does it transfer to live data?" risk).
4. **Retrain** the July+August combined model with the E.3 hyperparams,
   tune threshold on validation (E.4), and report the same metrics as
   Part F/G (AUC, precision@recall=25%, RED operating point from H).
5. **Only deploy** if the August holdout meets Part H — this is the acceptance
   test the F.3 gap exists to close. Otherwise iterate on features / data (I.3).

### I.3 What to fix first if August validation looks bad

- **Positive-rate shift** → never trust the 0.5 / F1-max threshold; re-tune on
  validation distribution (E.4).
- **Fresh 208-dest cardinality** → August introduces destinations July never
  saw; 10% of test rows will be unseen (D.2) — prefer target-encoding if val
  instability shows.
- **`carrier_*` self-referential metrics** → they drift month to month; confirm
  the model's reliance didn't overfit July's single carrier-health cache.
- **Quota gap** → backfill the missing August days after the reset (the exact
  backfill is `RESCORE_COMMANDS.md`).

> **The single sentence to remember for August:** *"After the audit, retrain,
> but gate the deploy on the August test set matching Part H — never deploy a
> model that only did well on July."*


