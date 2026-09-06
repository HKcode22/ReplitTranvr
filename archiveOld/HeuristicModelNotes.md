# Heuristic Model Notes — the manual-math predictions (NOTES ONLY)

> Created 2026-08-06. **Notes only — no implementation.** These are thinking
> notes for the heuristic ("manual math") prediction layer, because we do not
> yet know exactly how it will work, and we want to decide before coding.

---

## 1. The question we are trying to answer

> "Since we will be using the pre + post departure data from the webhook — will
> we have **4 predictions in total with two manual math**, where each heuristic
> is focusing on pre and post?"

The honest answer: **it depends on how we define "prediction", and we should
draw the matrix explicitly before deciding.**

### The two-dimensional picture

There are **2 prediction PROBLEMS** and **2 prediction METHODS**:

| | PRE-departure problem | POST-departure problem |
| -- | -- | -- |
| **Problem it answers** | Will it cancel / will it still depart / how late? | When will it actually arrive (ETA + delay)? |
| **When it runs** | booking → wheels-up | wheels-up → touchdown |
| **Heuristic method (manual math)** | pre-heuristic (weighted rule-based risk score) | post-heuristic (kinematics ETA from live position) |
| **ML method (learned model)** | pre-ML model (v9+, learned from pre features) | post-ML model (v9+, learned from post features) |

So we have **2 problems × 2 methods = 4 prediction outputs** in total:
`pre_heuristic`, `pre_ml`, `post_heuristic`, `post_ml`.

But — and this is the important part — **the 4 are NOT four competing guesses of
the same number.** They are:

- **2 primary prediction outputs**: `pre` (is the flight disrupted?) and `post`
  (when does it arrive?). These are the numbers the product acts on.
- **2 methods per output**: the heuristic (interpretable, always available,
  cheap) and the ML model (data-hungry, higher ceiling once we have data).

Recommended framing: **the heuristics are the baseline + explainability layer;
the ML models are the primary prediction once trained.** In the beginning (no
post-departure training data yet), the heuristics ARE the product.

---

## 2. Why a heuristic layer at all?

Evidence from v1–v8 (see `MDplan/DATABASE_QUALITY_AND_ML_ROADMAP*.md` and the
ml_analysis docs, archived on the `trash` branch):
- v7 tried an RL contextual bandit and a DNN — neither beat the simple XGBoost.
- Honest, clean data matters more than clever math.
- We currently have **zero post-departure rows** — the ML post model cannot be
  trained until the webhook fills `flightDataPrePost`.

So the heuristic layer:
1. **Works today** (no training data needed — it is explicit math).
2. **Is interpretable** (we can explain to a traveler/agency *why* a risk is
   high: "weather at origin + inbound aircraft is 40min late").
3. **Is the benchmark** every ML model must beat (like v5–v8 did).

---

## 3. PRE heuristic (manual math) — sketch

Input: **PRE-only features** from `flightDataPrePost` (per PrePosFeat.md) plus
external signals we already have (weather, NAS ground stops, carrier health,
historical OTP).

Candidate weighted formula (illustrative — to be tuned):
```
pre_risk = w1·weather_severity(origin)
         + w2·weather_severity(destination)
         + w3·nas_ground_stop_active?       (binary, with delay)
         + w4·carrier_health_index          (how this carrier is performing today)
         + w5·historical_otp(route,carrier) (historical on-time %)
         + w6·inbound_delay_minutes         (aircraft.reg → inbound leg state)
         + w7·time_to_departure_factor      (closer = higher weight)
         + w8·distance_factor               (long routes = more exposure)
         + w9·revision_churn                (scheduled vs revised time drift)
```
Output: a score 0–100 and a tier (e.g. red ≥60, yellow ≥40, else green), mirroring
the old riskScore semantics so the product/UX can reuse it.

`pre_risk` = the "will it be disrupted" prediction. **It reads PRE features only**
(that is the whole point of the two-model split).

---

## 4. POST heuristic (manual math) — sketch

Input: **POST-only features** from `flightDataPrePost` (`location` block) +
arrival baseline.

The physics is simple and does NOT need ML:
```
remaining_distance = haversine(loc_lat/lon → destination airport lat/lon)
eta_utc           = loc_reported_utc + remaining_distance / ground_speed_kt
predicted_arrival = eta_utc
arrival_delay_min = predicted_arrival − arr_scheduled_utc
```
Plus cheap "is this flight healthy?" signals:
- altitude climbing/descending vs expected phase (cruise ≈ straight + constant
  altitude).
- ground speed abnormally low for phase (holds, weather deviations).
- trueTrack pointing away from destination → diversion risk (input for a
  `divert_risk` flag).

Output: `predicted_arrival_utc` + `arrival_delay_min` + optional
`trajectory_health` flag. **It reads POST features only.**

---

## 5. The "4 predictions" answer, concretely

| Output | Method | Meaning | Drives |
| ---- | ---- | ---- | ---- |
| `pre_heuristic` | manual math | disruption risk 0–100 | alerts, dashboard tier |
| `post_heuristic` | manual math | predicted arrival + delay | ETA updates to traveler |
| `pre_ml` | learned (future) | disruption probability | primary once trained |
| `post_ml` | learned (future) | arrival delay | primary once trained |

We store **all four** in the heuristic/ML output table so we can compare,
baseline, and later ensemble. But we do **not** treat them as 4 conflicting
answers to one question.

---

## 6. The dedicated heuristic output table (replaces the 4 old tables)

The heuristic scores used to go into `monitored_flights.risk_score` /
`risk_score_history` (v1) and `clean.*_v2` (v2). Those **4 tables are being shut
down** (see `V3_WebhookExtractionPlan.md` §1). We need a **dedicated table** for
heuristic outputs:

```
heuristic_predictions
  id              serial PK
  flight_number   text
  carrier_iata    text
  departure_date  date
  stage           text  -- 'PRE' | 'POST'
  method          text  -- 'heuristic_pre' | 'heuristic_post'
  score           numeric      -- pre: 0-100 risk
  tier            text         -- pre: red/yellow/green (nullable)
  predicted_arrival_utc  timestamptz  -- post
  arrival_delay_min      numeric      -- post
  inputs_snapshot       jsonb   -- the feature values used (audit / debuggability)
  feature_version       text    -- which rule weights/version produced this
  received_at     timestamptz
```

Why a separate table and not columns on `flightDataPrePost`:
- `flightDataPrePost` is **raw collected data** (what AeroDataBox sent).
- `heuristic_predictions` is **computed output** (our math on top).
- Different write cadence, different retention, different consumers (dashboard /
  alerts read predictions; ML reads raw).

---

## 7. Open questions (to decide before coding)

1. **Post label definition** — for the future post-ML model, what is the target?
   Suggested: `arrival_delay_min = predicted − scheduled` regressed, or a
   binary "will arrive ≥30min late". Need a decision so the webhook data we
   collect matches the label we can later build.
2. **Pre label definition** — keep v1–v8's "disrupted = cancelled OR ≥15min
   late"? Recommend keep, so v9 compares apples to apples.
3. **Do the heuristics feed the ML as features?** (e.g. `pre_heuristic` becomes
   a feature of `pre_ml`). Recommend: yes for now, it is a strong free signal.
4. **How does the pre heuristic get inbound-delay (tail-number chain) before the
   webhook is wired?** Phase 0 of the plan stops the polling source of that data.
   We need the webhook + `aircraft_reg` join working first.
5. **Should the post heuristic run only on live rows?** Yes — it needs
   `location`; it should no-op on PRE rows.

---

## 8. Recommendation summary

- Build **2 heuristics** (pre + post), store outputs in a **new dedicated
  `heuristic_predictions` table**.
- Keep `flightDataPrePost` raw; heuristics/ML read from it.
- Treat the heuristic as baseline + explainer; ML as the upgrade once we have
  enough webhook data.
- Do **not** build 4 independent products — build 2 outputs, each with a
  heuristic + an ML method, and compare them side by side.
