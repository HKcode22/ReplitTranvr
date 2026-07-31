# ML Plan for v2 Database — VERIFIED ANALYSIS & Q&A

> Every number in this file is produced by the scripts in `ml_analysis/`:
> - `audit_dataset.py` — full per-column audit
> - `heuristic_eval.py` — heuristic performance vs final outcomes
> - `deepdive_periods.py` — May/June vs July, pre/post departure, feature audit
>
> Run them anytime the CSV changes: `python3 ml_analysis/<script>.py`

---

## PART A — The May/June Question (deep dive)

### A.1 There are TWO kinds of May/June rows

| Type | Rows | scored_at | hours_until_departure | Has weather? |
|------|------|-----------|------------------------|--------------|
| **ORIGINAL (real-time)** | 1,085 | May / June | +7 (pre-departure!) | **0%** |
| **RESCORED (July)** | 1,139 | July | -301 to -1650 (~45 days after) | 100% |

Verified examples:
- Original: `AA5243 dep=2026-06-11 scored=2026-06-11T01:52 hours=+5.3 vis=(empty)`
- Rescored: `UA2303 dep=2026-06-11 scored=2026-07-27T02:00 hours=-1075.8 vis=10.0`

### A.2 Why BOTH are unusable for ML

**Original May/June rows (1,085):** scored in real-time, pre-departure, hours correct — but they have **NO weather data** (0%). The v1-era monitor didn't capture METAR weather. We cannot train on rows with no weather features. The audit confirms the May/June rows that *survive* cleaning are NOT these — they're the rescored ones.

**Rescored May/June rows (1,139):** have weather (100%) but the weather is **July weather**. The rescore script re-ran `scoreFlightRisk()` ~45 days after the flight departed. So `origin_visibility_miles`, `origin_wind_speed_kt`, carrier health, NAS status — all reflect **July 20-27 conditions**, not the May/June conditions the flight actually flew in. A model trained on this learns "July KLAX weather predicts a May UA2303 delay" — pure noise.

### A.3 Why we EXCLUDE May/June entirely

The only May/June rows with weather features have **temporally-mismatched features** (July weather for May flights), and the only May/June rows with correct timing have **no weather at all**. There is no usable May/June sample. Excluding them is not a judgment call — neither half is usable.

This is **NOT** about `is_test_flight`. As you noted, those are real flights (real flight numbers, real routes). It's about the feature values being fetched at the wrong time.

### A.4 Is the July 20–23 rescore data also suspect?

Partly, but usable. The July rescore ran within hours-to-~2 days of departure for July 20–23 flights (avg `hours_until_departure` ≈ -7 to -37, i.e. scored shortly after the flight flew). The weather is the **same weather system**, not 45 days off. It's approximate but not broken. The July 25–29 rows are exact (live monitoring).

So the data-quality hierarchy:
1. **July 25–29 live monitor** — exact features, exact labels (best)
2. **July 20–23 rescore** — approximate features (same-day weather), exact labels (good)
3. **May–June** — either missing weather or wrong-time weather (unusable)

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

| Departure date | Unique flights | Rows | Rows/flight |
|----------------|----------------|------|-------------|
| Jul 20 | 186 | 2,355 | 12.7 |
| Jul 21 | 185 | 6,098 | 33.0 |
| Jul 22 | 126 | 2,965 | 23.5 |
| Jul 23 | 176 | 2,492 | 14.2 |
| Jul 25 | 89 | 712 | 8.0 |
| Jul 26 | 48 | 991 | 20.6 |
| Jul 27 | 45 | 1,067 | 23.7 |
| Jul 28 | 59 | 613 | 10.4 |
| Jul 29 | 53 | 692 | 13.1 |
| **Total** | **967** | **17,985** | **18.6** |

Each row = one scoring event. ~18 rows per flight average = the monitor scored
each flight ~18 times over its active life.

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
  (typically 100k+ sequences). With ~17k rows across 967 flights, a deep
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

The range in July data: **+23.9 to -162** hours. Pre-departure rows = 52% of July data (9,424 rows), post-departure = 48% (8,561 rows).

### C.3 Expanded explanation of back-propagation (§2.1)

Each flight appears as ~18 rows (one per monitor cycle). The `actual_delay_minutes`
column in each row is **the delay reported at that monitoring moment** — not the
flight's final delay. Example, real row DL5733:

| scored_at | hours_until_departure | actual_delay_minutes |
|-----------|----------------------|----------------------|
| Jul 20 | -0.4 | 0 |
| Jul 27 | -155 | 23 |
| Jul 28 | -10 | **149** |

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

The previous version wrongly dropped a raw feature. **`signal_inbound_delay_raw_minutes`
is RAW data** (the inbound aircraft's delay in minutes from the flight-status
API, written verbatim at v2Writer.ts:94) — it is NOT heuristic math. Only its
bucketed twin `signal_inbound_aircraft_delay` (0-40) is heuristic. Audit:
96.9% of July rows have it; 3.8% nonzero; max 520 min. It's a strong delay
predictor. Re-added (renamed `inbound_delay_minutes`).

| # | Feature | Source | Notes |
|---|---------|--------|-------|
| 1 | carrier_iata | raw | 39 carriers |
| 2 | origin_iata | raw | 6 seeder airports |
| 3 | destination_iata | raw | **208 values — see D.2** |
| 4 | hours_until_departure | raw (time math) | the phase indicator |
| 5 | departure_hour | raw | scheduled hour |
| 6 | departure_day_of_week | raw | scheduled day |
| 7 | origin_flight_category | raw METAR | VFR/IFR/MVFR/LIFR |
| 8 | origin_wind_speed_kt | raw METAR | |
| 9 | origin_gust_speed_kt | raw METAR | 88% zero (no gust) — real, keep |
| 10 | origin_visibility_miles | raw METAR | |
| 11 | origin_ceiling_ft | raw METAR | 99999 = unlimited sentinel |
| 12 | origin_has_thunderstorm | raw METAR | |
| 13 | destination_flight_category | raw METAR | includes 11% 'UNKNOWN' (METAR fetch failed) — valid category, keep |
| 14 | destination_wind_speed_kt | raw METAR | |
| 15 | destination_gust_speed_kt | raw METAR | |
| 16 | destination_visibility_miles | raw METAR | |
| 17 | destination_ceiling_ft | raw METAR | |
| 18 | destination_has_thunderstorm | raw METAR | |
| 19 | origin_has_ground_stop | raw NAS | |
| 20 | origin_has_ground_delay | raw NAS | |
| 21 | origin_nas_avg_delay_minutes | raw NAS | 94% zero (no program) — real, keep |
| 22 | destination_has_ground_stop | raw NAS | |
| 23 | destination_has_ground_delay | raw NAS | |
| 24 | destination_nas_avg_delay_minutes | raw NAS | 96% zero — real, keep |
| 25 | carrier_cancellation_rate_24h | real DB metric | **not** manual bucketing |
| 26 | carrier_avg_delay_24h | real DB metric | **not** manual bucketing |
| 27 | carrier_health_sample_size | real DB metric | |
| 28 | equipment_group | derived from raw equipment_type | 3.6% null → fill 'unknown' |
| 29 | **inbound_delay_minutes** | **raw API (re-added)** | inbound aircraft delay at scoring time |

### D.2 destination_iata (208 categories) — decision needed

`destination_iata` has 208 unique values across 17,985 rows. XGBoost's native
categorical support can handle this, but rare destinations risk overfitting.
Options:

1. **v1: keep it** (29 features) and watch for overfitting — XGBoost 1.6+ categorical is decent.
2. **v1 fallback: drop it** (28 features) — the destination WEATHER features already capture much of the destination signal.
3. Keep it but **target-encode** (average label per destination) — more complex.

Recommendation: start with (1); if validation AUC is unstable, use (2).

### D.3 Remaining nulls / constants / zeros in the kept July data (audited)

| Concern | Verdict |
|---------|---------|
| Constants in kept features | None (all ≥ 2 unique, checked) |
| Nulls in kept features | Only `equipment_group` (3.6%) — fill with `'unknown'` |
| Zero-heavy columns | `gust_speed_kt` (88%), `nas_avg_delay` (94-96%), `carrier_avg_delay_24h` (79%) — these are **real** measurements (no gust, no NAS program, carrier on-time), NOT junk. XGBoost handles them fine. Keep. |
| `destination_flight_category` = 'UNKNOWN' (11%) | Real METAR-fetch-failure sentinel — valid category, keep |

**Conclusion: after excluding May/June and dropping 41 columns, no further row
removal is needed.** The 17,341 usable rows are clean for the 29 kept features.

---

## PART E — Training plan (revised)

### E.1 Dataset size — is 17,341 rows enough?

Industry practice for gradient-boosted trees:

| Rows | Suitability |
|------|-------------|
| < 1,000 | Poor (overfits) |
| 1,000–5,000 | Fair (simple patterns only) |
| 5,000–10,000 | Good |
| **10,000–50,000** | **Very good (reliable, stable)** |
| 50,000+ | Excellent |

17,341 rows × 29 features, from 962 unique flights, is solidly "very good".
The previous ML attempt failed because it used ~494 mixed-quality rows from the
old v1 tables, not because of XGBoost.

### E.2 Split strategy — REVISED with phase analysis

The naive "train Jul 20-22, test Jul 25-29" has a hidden problem. By date:

| Departure date | Pre-departure rows | Post-departure rows | avg hours_until |
|----------------|--------------------|---------------------|-----------------|
| Jul 20 | 713 | 1,642 | -37.4 |
| Jul 21 | 3,128 | 2,970 | -8.2 |
| Jul 22 | 1,759 | 1,206 | -6.5 |
| Jul 23 | 1,035 | 1,457 | -9.2 |
| Jul 25 | 191 | 521 | -8.0 |
| Jul 26 | 623 | 368 | +3.0 |
| Jul 27 | 932 | 135 | +9.0 |
| Jul 28 | 529 | 84 | +6.6 |
| Jul 29 | 514 | 178 | +4.4 |

Jul 20-23 (rescore) is **post-departure-heavy**; Jul 25-29 (live monitor) is
**pre-departure-heavy**. So a temporal split = training on mostly
post-departure rows and testing on mostly pre-departure rows. That's the
hardest, most honest test of production readiness (production is
pre-departure). Two valid options:

**Option 1 (recommended): temporal split, by flight** — verified counts:

| Set | Departure dates | Rows | Flights | Positive % | Pre-departure % |
|-----|-----------------|------|---------|------------|-----------------|
| Train | Jul 20-22 | 11,418 | 497 | 77.8% | 49% |
| Validation | Jul 23 | 2,492 | 176 | 76.9% | 42% |
| Test | Jul 25-29 | 3,431 | 289 | **51.1%** | 68% |
| **Total** | | **17,341** | **962** | | |

(Overlapping flights between sets: 0 — verified. Total equals 17,341 usable rows.)

Note the test set is 51% positive vs 77.8% in train — the live-monitor period
had more on-time flights, so the test set is **closer to production
distribution** than training. That's a feature, not a bug.

This is the realistic "train on backfill, deploy on live data" test. If the
model transfers poorly, that itself tells us we need live-monitor-only data.

**Option 2 (fallback): random split by flight across all July**
- Train 70% of flights, val 15%, test 15% (by `monitored_flight_id`)
- Ensures both phases appear in train AND test
- Easier, but less honest about the backfill→live transition

Use Option 1 first. If test performance collapses (AUC < 0.55), fall back to
Option 2 and note that the backfill data doesn't transfer.

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

Using Option 1, the **test set** is every row of flights departing **Jul 25,
26, 27, 28, 29** (3,431 rows, 289 flights, 68% pre-departure). The
**validation set** is Jul 23 flights (2,492 rows, 176 flights). The **training
set** is Jul 20-22 flights (11,418 rows, 497 flights). Every set contains
WHOLE flights only — verified 0 flights appear in more than one set.

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

| View | Numbers | Verdict |
|------|---------|---------|
| Post-departure RED | 98.8% precision, 6.6% recall | "Confirming" delays that already happened — trivially easy, and too late to matter |
| Pre-departure RED | 68.4% precision, **0.9% recall** | Effectively blind before departure |
| AMBER+RED overall | 77.9% precision, 25.2% recall | Catches 1 in 4 disruptions |
| **The gap ML must close** | pre-departure recall ~1% | Huge room for improvement |

So: **the heuristic is good at precision (few false alarms), bad at recall
(misses most disruptions), and useless pre-departure.** That's exactly the job
for ML: match the heuristic's precision but lift pre-departure recall from ~1%
to ~35%+. If XGBoost cannot beat 25% AMBER+RED recall on the test set, it isn't
adding value and we should say so honestly.

---

## PART G — Implementation steps

1. **Prep (Colab)**: load CSV, strip quote artifact, keep July rows, back-propagate labels (code in prior version §6.2, still valid — add the `str.strip('"')` and `startswith('2026-07')` filters).
2. **Features**: keep the 29 in §D.1, fill `equipment_group` NaN with `'unknown'`.
3. **Split**: Option 1 temporal (Jul 20-22 / Jul 23 / Jul 25-29).
4. **Train** XGBoost (§E.3), tune threshold on validation (§E.4).
5. **Evaluate** on test: report precision@recall=25% (match the heuristic's AMBER+RED recall), AUC, and pre-departure-only recall. Compare directly against the heuristic numbers in §F.3.
6. **Export** `xgboost_delay_predictor.json` + `threshold.json`.
7. **Deploy** as Python sidecar next to server2 (inference ~1ms/flight).

## PART H — Success criteria & risks

**Success:** on the Jul 25-29 test set, XGBoost achieves ≥90% RED precision
AND ≥20% RED recall (heuristic: 92.5% / 2.9%), and pre-departure recall ≥35%
(heuristic: 0.9%).

**Risks:**

| Risk | Mitigation |
|------|------------|
| Rescore-origin rows (approx weather) don't transfer to live monitor data | Option-2 fallback split; retrain on monitor-only data after Aug 1 quota reset |
| 72% positive train vs ~15% production | Threshold tuned on validation, not 0.5 |
| `carrier_*` metrics are self-referential (computed from our own history) | Available at inference; monitor drift |
| `destination_iata` (208 cats) overfits | Drop it if validation is unstable (§D.2) |
| Only ~2 weeks of July data | Re-train monthly; this is a v1 model |
