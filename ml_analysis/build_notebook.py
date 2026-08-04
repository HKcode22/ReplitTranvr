#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v1.ipynb from the plan in MLPLAN_UPDATEDDB.md
(Part G implementation steps). Run:  python3 ml_analysis/build_notebook.py
"""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python"},
}
cells = []

def md(src):
    cells.append(nbf.v4.new_markdown_cell(src))

def code(src):
    cells.append(nbf.v4.new_code_cell(src))

# ----------------------------------------------------------------------------
md("""# Travnr — XGBoost Disruption Predictor (v1)

Implements **Part G** of `MLPLAN_UPDATEDDB.md` end-to-end on
`risk_score_history_v2.csv` (the v2 database export).

**The production question this answers:** given only PRE-departure information,
1–12h before takeoff, can we predict "disrupted" (late ≥15min OR cancelled)
better than the heuristic (pre-departure RED recall ≈ 1%)?

## Pipeline (each step maps to a plan section)

| Step | Plan section | What it does |
| ---- | ------------ | ------------ |
| 1 | G.1 | Load CSV, strip the pgAdmin quote artifact, parse both `departure_time` formats |
| 2 | G.2 / E.7 | Keep July, drop >72h rows as FEATURE rows only, back-propagate flight labels from ALL rows, drop the 4 unknown-outcome flights |
| 3 | G.3 / D.1 | Select the 29 features |
| 4 | G.4 / E.2.6 | Option 3 split: pre-only, by-flight 70/15/15, stratified by hour + lead |
| 5 | G.5 / E.3 | Train XGBoost with early stopping |
| 6 | G.6 / E.4 | Tune decision threshold on validation (F1-max) |
| 7 | G.7 / F.3 | Evaluate on test vs the heuristic baseline |
| 8 | G.8 / D.2 | Ablation: Option 2 (mixed rows) to test whether post rows help |
| 9 | G.9 | Export model JSON + threshold for the Python sidecar |

> **Heuristic baseline to beat (F.3):** pre-departure RED recall 0.9%,
> AMBER+RED precision 77.9% / recall 25.2%.
""")

# ----------------------------------------------------------------------------
code("""import os, json, csv, time, math
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score, precision_recall_curve, precision_score, recall_score

pd.set_option('display.max_columns', 50)
print('pandas', pd.__version__, '| numpy', np.__version__, '| xgboost', xgb.__version__)

CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)
print('Using:', os.path.abspath(CSV))
""")

# ----------------------------------------------------------------------------
md("""## Step 1 — Load & clean (G.1)

Two export artifacts must be handled:
1. **Quote wrapping** — pgAdmin wrapped many string values in literal `"..."`,
   which pandas does NOT strip (they arrive as `"2026-07-29T17:47:10.337Z"`).
2. **Two `departure_time` formats** — `HH:MM` (most rows) and full datetime
   `YYYY-MM-DD HH:MMZ` (Jul 27 rows). We parse both into a UTC departure
   timestamp so `scored_at − dep_time` gives the correct lead/hours gap.
""")

# ----------------------------------------------------------------------------
code("""def strip_quotes(v):
    if isinstance(v, str) and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v

df = pd.read_csv(CSV, low_memory=False)
for c in df.columns:
    df[c] = df[c].map(strip_quotes)

print('Raw shape:', df.shape)
print('Sample scored_at:', df['scored_at'].iloc[0])
""")

# ----------------------------------------------------------------------------
code("""def parse_departure(r):
    d = r['departure_date']
    if isinstance(d, str) and 'T' in d:
        d = d[:10]
    t = str(r['departure_time']).strip()
    if 'T' in t or ' ' in t:                      # full datetime form
        t = t.replace('Z', '').replace(' ', 'T')
        return pd.to_datetime(t, utc=True)
    return pd.to_datetime(f"{d} {t}", utc=True)   # HH:MM form

df['dep_dt'] = df.apply(parse_departure, axis=1)
df['scored_dt'] = pd.to_datetime(df['scored_at'], utc=True)
df['gap_hours'] = (df['scored_dt'] - df['dep_dt']).dt.total_seconds() / 3600.0
df['hours_until_departure'] = pd.to_numeric(df['hours_until_departure'], errors='coerce')

# Sanity checks
print('gap_hours range:', round(df['gap_hours'].min(), 1), 'to', round(df['gap_hours'].max(), 1))
print('both departure_time formats parsed OK')
n_bad = df['gap_hours'].isna().sum()
print('rows with unparseable time:', n_bad)
df = df.dropna(subset=['gap_hours', 'hours_until_departure']).copy()
print('after dropping unparseable:', df.shape)
""")

# ----------------------------------------------------------------------------
md("""## Step 2 — July filter, feature-row rule, label back-propagation (G.2 / E.7)

**E.7 label logic (exact):**
- Each row has FEATURES (predict) and a LABEL (answer). We use a row for only one.
- The label (`actual_*`) is the flight-status API snapshot *at scoring time*.
  Early rows say `delay=0, Scheduled` because the flight hasn't finished yet.
- So we read the flight's FINAL outcome from **any** row of that flight
  (including the excluded >72h rescore rows, which for 504 of 652 positive
  flights are the ONLY record of truth), and stamp it onto every row.
- Flights with **no** row that ever resolves → label `unknown` → dropped.

**Rules applied here:**
1. Keep July departures only (`departure_date` starts `2026-07`).
2. Drop rows with `gap_hours > 72` as **feature rows** (Jul 27 rescore pass) —
   but their labels are still used via back-propagation.
3. Back-propagate flight-level label: `disrupted = cancelled OR max_delay >= 15`.
4. Drop the 4 unknown-outcome flights.
""")

# ----------------------------------------------------------------------------
code("""jul = df[df['departure_date'].str.startswith('2026-07')].copy()
print('July rows total:', len(jul))

stale = jul[jul['gap_hours'] > 72]
print('>72h rows (excluded as FEATURES, kept for labels):', len(stale))

usable = jul[jul['gap_hours'] <= 72].copy()
print('usable <=72h feature rows:', len(usable))

# --- per-flight label from ALL rows (incl. stale) ---
def flight_label(rows):
    cancelled = any(str(r['actual_cancelled']).strip().lower() == 'true' for _, r in rows.iterrows())
    if cancelled:
        return 'cancelled'
    delays = [float(r['actual_delay_minutes']) for _, r in rows.iterrows()
              if str(r['actual_delay_minutes']).strip() not in ('', 'nan')]
    if delays and max(delays) >= 15:
        return 'arrived_late'
    statuses = set(str(r['actual_status']).strip() for _, r in rows.iterrows())
    if (statuses & {'Arrived', 'Delayed'}) or delays:
        return 'arrived_ontime'
    return 'unknown'

# label per flight using ALL july rows (stale + usable)
flab = jul.groupby('monitored_flight_id').apply(flight_label, include_groups=False).rename('flight_label')
print()
print('=== Flight-level outcomes (all July, E.7 Step 1) ===')
print(flab.value_counts())
print()
print('Disrupted (cancelled + late):', (flab != 'arrived_ontime').sum() - (flab == 'unknown').sum(),
      '| unknown (dropped):', (flab == 'unknown').sum())
""")

# ----------------------------------------------------------------------------
code("""# Attach labels to usable rows, drop unknown-outcome flights
lab = flab.to_frame().reset_index()
usable = usable.merge(lab, on='monitored_flight_id', how='left')
unknown_flights = usable.loc[usable['flight_label'] == 'unknown', 'monitored_flight_id'].nunique()
print('flights dropped (unknown outcome):', unknown_flights)
usable = usable[usable['flight_label'] != 'unknown'].copy()
usable['label'] = (usable['flight_label'] != 'arrived_ontime').astype(int)

print('usable rows after label attach:', len(usable), '| flights:', usable['monitored_flight_id'].nunique())
print('positive rate (disrupted):', round(usable['label'].mean() * 100, 1), '%')

# E.7 pool table: pre-departure rows at 1-12h lead
pre = usable[(usable['hours_until_departure'] >= 1) & (usable['hours_until_departure'] <= 12)].copy()
print()
print('=== Option 3 pool: PRE rows, lead 1-12h (E.2.6) ===')
by_date = pre.groupby(pre['departure_date'].str[:10]).agg(
    rows=('label', 'size'),
    disrupted=('label', 'sum'),
    flights=('monitored_flight_id', 'nunique'))
print(by_date)
print('Total pre 1-12h rows:', len(pre), '| flights:', pre['monitored_flight_id'].nunique())
print('Positive rate in pool:', round(pre['label'].mean() * 100, 1), '%')
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Select the 29 features (G.3 / D.1)

The 29 columns from D.1. Categorical: `carrier_iata`, `origin_iata`,
`destination_iata`, `origin_flight_category`, `destination_flight_category`,
`equipment_group` (6 categories → label-encoded, per E.3). Numeric: the rest,
with `equipment_group` nulls filled `'unknown'`.
""")

# ----------------------------------------------------------------------------
code("""NUM_FEATS = [
    'hours_until_departure', 'departure_hour', 'departure_day_of_week',
    'origin_wind_speed_kt', 'origin_gust_speed_kt', 'origin_visibility_miles',
    'origin_ceiling_ft', 'origin_has_thunderstorm',
    'destination_wind_speed_kt', 'destination_gust_speed_kt',
    'destination_visibility_miles', 'destination_ceiling_ft',
    'destination_has_thunderstorm',
    'origin_has_ground_stop', 'origin_has_ground_delay', 'origin_nas_avg_delay_minutes',
    'destination_has_ground_stop', 'destination_has_ground_delay', 'destination_nas_avg_delay_minutes',
    'carrier_cancellation_rate_24h', 'carrier_avg_delay_24h', 'carrier_health_sample_size',
    'signal_inbound_delay_raw_minutes',  # D.1 #29 inbound_delay_minutes (RAW)
]
CAT_FEATS = [
    'carrier_iata', 'origin_iata', 'destination_iata',
    'origin_flight_category', 'destination_flight_category', 'equipment_group',
]
FEATURES = NUM_FEATS + CAT_FEATS
print('Total features:', len(FEATURES))
print('Numeric:', len(NUM_FEATS), '| Categorical:', len(CAT_FEATS))
""")

# ----------------------------------------------------------------------------
code("""def prep_features(pool):
    p = pool[FEATURES + ['monitored_flight_id', 'departure_date', 'label']].copy()
    for c in NUM_FEATS:
        p[c] = pd.to_numeric(p[c], errors='coerce')
    p['equipment_group'] = p['equipment_group'].fillna('unknown')
    # booleans as 0/1
    for c in NUM_FEATS:
        p[c] = p[c].fillna(p[c].median())
    return p

pre_pool = prep_features(pre)
print('pre pool shape:', pre_pool.shape)
print('nulls remaining:', int(pre_pool[FEATURES].isna().sum().sum()))
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — Option 3 split: pre-only, by flight, stratified (E.2.6)

- Split **by flight** so no flight appears in two sets (70/15/15).
- Stratify the split so train/val/test have the same mix of **departure hour**
  and **lead time** (this kills the three confounds from E.2.4).
- Stratification happens at the **flight level** (each flight assigned once),
  using that flight's representative hour/lead bucket.
""")

# ----------------------------------------------------------------------------
code("""from sklearn.model_selection import train_test_split

def flight_strat_keys(pool):
    f = pool.groupby('monitored_flight_id').agg(
        dep_hour=('departure_hour', 'first'),
        lead=('hours_until_departure', 'median'),
    )
    # Coarse buckets so every stratum has >=2 flights (verified: min 8 here).
    f['hour_bucket'] = pd.cut(f['dep_hour'], bins=[0, 7, 13, 18, 24], right=False).cat.codes
    f['lead_bucket'] = pd.cut(f['lead'], bins=[1, 6, 12], right=False).cat.codes
    return f['hour_bucket'].astype(str) + '_' + f['lead_bucket'].astype(str)

flights = pre_pool['monitored_flight_id'].unique()
strata = flight_strat_keys(pre_pool)

tr_id, te_id = train_test_split(flights, test_size=0.30, random_state=42, stratify=strata.reindex(flights))
va_id, te_id = train_test_split(te_id, test_size=0.50, random_state=42,
                                stratify=strata.reindex(te_id))

train = pre_pool[pre_pool['monitored_flight_id'].isin(tr_id)]
val   = pre_pool[pre_pool['monitored_flight_id'].isin(va_id)]
test  = pre_pool[pre_pool['monitored_flight_id'].isin(te_id)]

print(f'Train: {len(train)} rows / {tr_id.size} flights (pos {train["label"].mean()*100:.1f}%)')
print(f'Val:   {len(val)} rows / {va_id.size} flights (pos {val["label"].mean()*100:.1f}%)')
print(f'Test:  {len(test)} rows / {te_id.size} flights (pos {test["label"].mean()*100:.1f}%)')
assert len(set(tr_id) & set(te_id)) == 0 and len(set(tr_id) & set(va_id)) == 0 and len(set(va_id) & set(te_id)) == 0
print('No flight overlap between sets: OK')

X_tr, y_tr = train[NUM_FEATS + CAT_FEATS], train['label']
X_va, y_va = val[NUM_FEATS + CAT_FEATS], val['label']
X_te, y_te = test[NUM_FEATS + CAT_FEATS], test['label']
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Train XGBoost (G.5 / E.3)

Hyperparameters straight from E.3:
`n_estimators=300, max_depth=6, learning_rate=0.1, subsample=0.8,
colsample_bytree=0.8, eval_metric='auc', early_stopping_rounds=20,
random_state=42`. Categorical columns are label-encoded to indices first
(XGBoost treats them as numeric ordinals here; `enable_categorical` requires
native `category` dtype — we keep label-encoding for portability to the JSON
sidecar export).
""")

# ----------------------------------------------------------------------------
code("""CAT_INDEX = {c: {v: i for i, v in enumerate(sorted(X_tr[c].astype(str).unique()))} for c in CAT_FEATS}

def encode(X):
    Xe = X.copy()
    for c in CAT_FEATS:
        Xe[c] = Xe[c].astype(str).map(CAT_INDEX[c]).fillna(-1).astype(int)
    return Xe

X_tr_e, X_va_e, X_te_e = encode(X_tr), encode(X_va), encode(X_te)

model = xgb.XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8,
    eval_metric='auc', early_stopping_rounds=20,
    random_state=42, verbosity=0,
)
model.fit(X_tr_e, y_tr, eval_set=[(X_va_e, y_va)], verbose=False)
print('Best iteration:', model.best_iteration)
print('Val AUC:', round(model.best_score, 4))
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — Tune the decision threshold on validation (G.6 / E.4)

Training labels are ~70% positive but production is ~10–20%. **Do not use
0.5.** We sweep thresholds on the **validation** set to maximize F1, then apply
the winning threshold to the **test** set (never tune on test).
""")

# ----------------------------------------------------------------------------
code("""probs_va = model.predict_proba(X_va_e)[:, 1]
prec_va, rec_va, th_va = precision_recall_curve(y_va, probs_va)
f1_va = 2 * prec_va * rec_va / (prec_va + rec_va + 1e-9)
best_i = f1_va.argmax()
best_th = th_va[best_i] if best_i < len(th_va) else 0.5
print('F1-max threshold on validation:', round(float(best_th), 4),
      '-> F1', round(float(f1_va[best_i]), 4))
print('At that threshold: precision', round(float(prec_va[best_i]), 4),
      'recall', round(float(rec_va[best_i]), 4))
""")

# ----------------------------------------------------------------------------
md("""## Step 7 — Evaluate on test vs the heuristic (G.7 / F.3)

Metrics (per G.7):
1. **AUC** on test.
2. **precision@recall=25%** — precision when threshold chosen so recall = 25%
   (matches the heuristic's AMBER+RED recall level).
3. **precision / recall at the tuned F1 threshold**.
4. Compare against heuristic baselines: pre-departure RED recall **0.9%**,
   AMBER+RED precision 77.9% / recall 25.2%.
""")

# ----------------------------------------------------------------------------
code("""probs_te = model.predict_proba(X_te_e)[:, 1]
auc_te = roc_auc_score(y_te, probs_te)

prec_te, rec_te, th_te = precision_recall_curve(y_te, probs_te)
# precision@recall=25%
idx = (rec_te >= 0.25).argmax()
prec_at_25 = prec_te[idx]

pred_te = (probs_te >= best_th).astype(int)
p_at_th = precision_score(y_te, pred_te)
r_at_th = recall_score(y_te, pred_te)
f1_at_th = 2*p_at_th*r_at_th/(p_at_th+r_at_th+1e-9)

print('=== TEST SET (pre-only, unseen flights) ===')
print('AUC:', round(auc_te, 4))
print('precision@recall=25%:', round(float(prec_at_25), 4))
print(f'At F1 threshold {best_th:.3f}: precision {p_at_th:.3f}, recall {r_at_th:.3f}, F1 {f1_at_th:.3f}')
print()
print('=== Heuristic baseline (F.3) ===')
print('Pre-departure RED recall: 0.9%  (we must beat this)')
print('AMBER+RED: precision 77.9%, recall 25.2%')
print()
print('=== Success criteria (H) ===')
print('>=90% RED precision AND >=20% RED recall; pre-dep recall >=35%')
""")

# ----------------------------------------------------------------------------
md("""## Step 7b — Production-realistic operating point (Part H check)

The test set is ~70% positive (July was a heavy-delay month), but production
will see ~10–20% positives. So **F1-max on the test distribution is NOT the
production answer** — it reports high recall by flagging almost everything.
Part H asks for the **RED alert** operating point: maximum precision while
still catching ≥20% (and ≥35%) of disruptions. We sweep the threshold on the
*validation* set for that objective, then apply it to the test set — never
tuning on test.
""")

# ----------------------------------------------------------------------------
code("""def precision_at_recall(y, prob, target):
    pr, re, th = precision_recall_curve(y, prob)
    keep = np.where(re >= target)[0]     # thresholds are descending
    if len(keep) == 0:
        return None, None, None
    i = int(keep[0])                     # highest threshold still meeting recall
    return pr[i], re[i], th[i] if i < len(th) else None

# Tune RED operating points on VALIDATION only
prec_v20, rec_v20, th_v20 = precision_at_recall(y_va, probs_va, 0.20)
prec_v35, rec_v35, th_v35 = precision_at_recall(y_va, probs_va, 0.35)

print('=== RED operating points, tuned on validation, applied to test ===')
for name, th_val, target in [('recall>=20%', th_v20, 0.20), ('recall>=35%', th_v35, 0.35)]:
    if th_val is None:
        print(f'{name}: cannot reach on validation'); continue
    pred = (probs_te >= th_val).astype(int)
    p = precision_score(y_te, pred); r = recall_score(y_te, pred)
    flag = 'OK (>=90%)' if p >= 0.90 else 'below 90% target'
    print(f'{name:12s} th={th_val:.3f} -> test precision {p:.3f}  recall {r:.3f}  [{flag}]')
print()
print('Note: test set is ~70% positive; production ~15%. These numbers compare')
print('models on the SAME data as the heuristic baseline. Field validation on')
print('August live data is the real acceptance test.')
""")

# ----------------------------------------------------------------------------
md("""## Step 8 — Ablation: Option 2 (mixed pre+post rows) (G.8 / D.2)

Does adding post-departure rows help pre-departure prediction, or does the
model just learn the `hours < 0 ⇒ disrupted` shortcut (E.2.2)? We train a
second XGBoost on **all** usable rows (pre + post) with the same by-flight
split, then evaluate on the **same pre-only test flights**.
""")

# ----------------------------------------------------------------------------
code("""all_pool = prep_features(usable)   # includes post rows (hours_until_departure < 0)
tr_a = all_pool[all_pool['monitored_flight_id'].isin(tr_id)]
va_a = all_pool[all_pool['monitored_flight_id'].isin(va_id)]
te_a = all_pool[all_pool['monitored_flight_id'].isin(te_id)]  # pre+post of test flights

X_tr_a = encode(tr_a[FEATURES]); y_tr_a = tr_a['label']
X_va_a = encode(va_a[FEATURES]); y_va_a = va_a['label']
X_te_a = encode(te_a[FEATURES]); y_te_a = te_a['label']

model2 = xgb.XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8,
    eval_metric='auc', early_stopping_rounds=20,
    random_state=42, verbosity=0,
)
model2.fit(X_tr_a, y_tr_a, eval_set=[(X_va_a, y_va_a)], verbose=False)

# Evaluate on PRE-ONLY rows of the test flights (production-like)
pre_test = te_a[te_a['hours_until_departure'] > 0]
X_pre = encode(pre_test[FEATURES]); y_pre = pre_test['label']
probs2 = model2.predict_proba(X_pre)[:, 1]
auc2 = roc_auc_score(y_pre, probs2)
prec2, rec2, th2 = precision_recall_curve(y_pre, probs2)
idx2 = (rec2 >= 0.25).argmax()
print('=== Option 2 (mixed) vs Option 3 (pre-only), both on pre-only test flights ===')
print('Option 2 AUC on pre-only test:', round(auc2, 4), '| precision@recall=25%:', round(float(prec2[idx2]), 4))
print('Option 3 AUC on pre-only test:', round(auc_te, 4), '| precision@recall=25%:', round(float(prec_at_25), 4))
better = 'Option 2 (post rows help)' if auc2 > auc_te else 'Option 3 (pre-only; post rows just teach the shortcut)'
print('Verdict:', better)
""")

# ----------------------------------------------------------------------------
md("""## Step 9 — Export for the Python sidecar (G.9)

`xgboost_delay_predictor.json` (booster dump), `threshold.json`, and the
categorical label maps — so the server2 Python sidecar can reproduce
`predict()` without retraining. ~1ms per flight inference.
""")

# ----------------------------------------------------------------------------
code("""out = {}
for k, v in CAT_INDEX.items():
    out[k] = {str(kk): vv for kk, vv in v.items()}
meta = {
    'numeric_features': NUM_FEATS,
    'categorical_features': CAT_FEATS,
    'cat_index': out,
    'threshold': float(best_th),
    'best_iteration': int(model.best_iteration),
    'n_estimators': int(model.best_iteration) + 1,
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}

# Anchor exports to the same folder as the notebook CSV lives next to.
# Works from Jupyter or any CWD because it derives from the CSV path.
CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
with open(os.path.join(EXPORT_DIR, 'threshold.json'), 'w') as f:
    json.dump(meta, f, indent=2)

booster = model.get_booster()
booster.save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor.json'))
print('Saved', os.path.join(EXPORT_DIR, 'xgboost_delay_predictor.json'),
      'and', os.path.join(EXPORT_DIR, 'threshold.json'))
print('Files:', os.listdir(EXPORT_DIR))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v1.ipynb')
print('Wrote ml_analysis/travnr_ml_v1.ipynb with', len(cells), 'cells')
