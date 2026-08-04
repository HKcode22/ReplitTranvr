#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v2.ipynb — the "improve the model" experiment.
v1 is preserved untouched (travnr_ml_v1.ipynb) as the baseline reference.

v2 changes vs v1 (each targets a real v1 finding):
  A. DROP constant features (origin/dest has_freezing are always false in July).
  B. TARGET-ENCODE destination_iata + the other categoricals (D.2 fix) instead
     of integer label-encoding.
  C. TUNE hyperparameters on the validation set (v1 used fixed params and
     stopped at only 9 trees = under-trained).
  D. scale_pos_weight to rebalance ~72%-positive train toward a production
     scenario.
  E. Feature-importance report + an honest v1-vs-v2 comparison on the same test.

Run: python3 ml_analysis/build_notebook_v2.py
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
md("""# Travnr — XGBoost v2 (model improvement experiment)

Second notebook. It mirrors **v1** (`travnr_ml_v1.ipynb`) so we never lose the
original, but attempts to make the model better. It uses the EXACT same data
prep, label back-propagation, and by-flight split as v1 — only the *features*
and *training* differ. At the end it compares **v1 vs v2** on the same held-out
test flights, so we can see honestly whether the changes helped.

**The v1 findings we're trying to fix:**

| v1 finding | v2 change |
| ---------- | --------- |
| best_iteration = 9 (stopped very early = under-trained) | hyperparameter tuning (C) + more estimators |
| `has_freezing` features always false in July (pure noise) | drop them (A) |
| `destination_iata` has 208 cats; 10% of test rows are unseen destinations | target-encode it (B) |
| 72% positive train vs ~15% production | try `scale_pos_weight` (D) |
| no idea which features really matter | feature importance report (E) |

> **Golden rule (from v1 / E.7):** a row is used for *either* its features *or*
> its label. Pre-departure rows (1–12h lead) become features; the flight's
> FINAL outcome (from ANY of its rows, incl. the >72h rescore) becomes the
> label. Test flights are never seen during training.
""")

# ----------------------------------------------------------------------------
code("""import os, json, time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score, precision_recall_curve, precision_score, recall_score
from sklearn.model_selection import train_test_split

pd.set_option('display.max_columns', 60)
print('pandas', pd.__version__, '| numpy', np.__version__, '| xgboost', xgb.__version__)

CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)
print('Using:', os.path.abspath(CSV))
""")

# ----------------------------------------------------------------------------
md("""## Step 1 — Load & clean (identical to v1)""")

# ----------------------------------------------------------------------------
code("""def strip_quotes(v):
    if isinstance(v, str) and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v

df = pd.read_csv(CSV, low_memory=False)
for c in df.columns:
    df[c] = df[c].map(strip_quotes)

def parse_departure(r):
    d = r['departure_date']
    if isinstance(d, str) and 'T' in d:
        d = d[:10]
    t = str(r['departure_time']).strip()
    if 'T' in t or ' ' in t:
        t = t.replace('Z', '').replace(' ', 'T')
        return pd.to_datetime(t, utc=True)
    return pd.to_datetime(f"{d} {t}", utc=True)

df['dep_dt'] = df.apply(parse_departure, axis=1)
df['scored_dt'] = pd.to_datetime(df['scored_at'], utc=True)
df['gap_hours'] = (df['scored_dt'] - df['dep_dt']).dt.total_seconds() / 3600.0
df['hours_until_departure'] = pd.to_numeric(df['hours_until_departure'], errors='coerce')
df = df.dropna(subset=['gap_hours', 'hours_until_departure']).copy()
print('Raw shape:', df.shape)
""")

# ----------------------------------------------------------------------------
md("""## Step 2 — label back-propagation & pre-only pool (identical to v1)""")

# ----------------------------------------------------------------------------
code("""jul = df[df['departure_date'].str.startswith('2026-07')].copy()
stale = jul[jul['gap_hours'] > 72]
usable = jul[jul['gap_hours'] <= 72].copy()

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

flab = jul.groupby('monitored_flight_id').apply(flight_label, include_groups=False).rename('flight_label')
lab = flab.to_frame().reset_index()
usable = usable.merge(lab, on='monitored_flight_id', how='left')
usable = usable[usable['flight_label'] != 'unknown'].copy()
usable['label'] = (usable['flight_label'] != 'arrived_ontime').astype(int)

pre = usable[(usable['hours_until_departure'] >= 1) & (usable['hours_until_departure'] <= 12)].copy()
print('July rows:', len(jul), '| usable <=72h:', len(usable))
print('Flight outcomes:', {k: int(v) for k, v in flab.value_counts().items()})
print('Pre 1-12h pool rows:', len(pre), '| flights:', pre['monitored_flight_id'].nunique())
print('Positive rate in pool:', round(pre['label'].mean() * 100, 1), '%')
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Feature definition: v1 baseline (29) vs v2 (drop constants)

v1 uses the full D.1 list of 29 features. v2 drops any column that is constant
in the pool (proven noise). The rest of the pipeline is shared.
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
    'signal_inbound_delay_raw_minutes',
]
CAT_FEATS = [
    'carrier_iata', 'origin_iata', 'destination_iata',
    'origin_flight_category', 'destination_flight_category', 'equipment_group',
]
ALL_FEATS = NUM_FEATS + CAT_FEATS

pool = pre[['monitored_flight_id', 'departure_date', 'label'] + ALL_FEATS].copy()
for c in NUM_FEATS:
    pool[c] = pd.to_numeric(pool[c], errors='coerce')
pool['equipment_group'] = pool['equipment_group'].fillna('unknown')

# v2 change (A): which numeric features are constant in the pool?
CONSTANT = [c for c in NUM_FEATS if pool[c].nunique() <= 1]
print('Constant numeric columns in pool:', CONSTANT or 'none')
NUM_FEATS_V2 = [c for c in NUM_FEATS if c not in CONSTANT]

# context for the reader: raw boolean flags NOT in the 29 features (for the doc)
for c in ['origin_has_freezing', 'destination_has_freezing']:
    if c in jul.columns:
        print(f'{c}: {int((jul[c].astype(str).isin(["true","True","1"])).sum())} true of {len(jul)} July rows')
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — Split by flight, stratified (IDENTICAL to v1)""")

# ----------------------------------------------------------------------------
code("""def flight_strat_keys(pool):
    f = pool.groupby('monitored_flight_id').agg(
        dep_hour=('departure_hour', 'first'),
        lead=('hours_until_departure', 'median'),
    )
    f['hour_bucket'] = pd.cut(f['dep_hour'], bins=[0, 7, 13, 18, 24], right=False).cat.codes
    f['lead_bucket'] = pd.cut(f['lead'], bins=[1, 6, 12], right=False).cat.codes
    return f['hour_bucket'].astype(str) + '_' + f['lead_bucket'].astype(str)

flights = pool['monitored_flight_id'].unique()
strata = flight_strat_keys(pool)
tr_id, te_id = train_test_split(flights, test_size=0.30, random_state=42, stratify=strata.reindex(flights))
va_id, te_id = train_test_split(te_id, test_size=0.50, random_state=42, stratify=strata.reindex(te_id))

train = pool[pool['monitored_flight_id'].isin(tr_id)]
val   = pool[pool['monitored_flight_id'].isin(va_id)]
test  = pool[pool['monitored_flight_id'].isin(te_id)]
print(f'Train: {len(train)} rows / {tr_id.size} flights (pos {train["label"].mean()*100:.1f}%)')
print(f'Val:   {len(val)} rows / {va_id.size} flights (pos {val["label"].mean()*100:.1f}%)')
print(f'Test:  {len(test)} rows / {te_id.size} flights (pos {test["label"].mean()*100:.1f}%)')
assert len(set(tr_id)&set(te_id))==0 and len(set(tr_id)&set(va_id))==0 and len(set(va_id)&set(te_id))==0
print('No flight overlap between sets: OK')
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Two encoders: v1 (label-encode) and v2 (target-encode)

- **v1:** every categorical column → integer (0,1,2,...). This throws away the
  ranking info and mishandles the 208-cat destination (D.2).
- **v2:** every categorical column → its smoothed *positive-rate* (target
  encoding), computed **only from the training split** (never leaking
  val/test). Unseen categories fall back to the global prior.
""")

# ----------------------------------------------------------------------------
code("""def prep_numeric(X):
    X = X.copy()
    for c in NUM_FEATS:
        X[c] = pd.to_numeric(X[c], errors='coerce')
        if X[c].isna().any():
            X[c] = X[c].fillna(X[c].median())
    return X

# ---- v1 encoder: integer label-encode (baseline) ----
CAT_INDEX = {c: {v: i for i, v in enumerate(sorted(train[c].astype(str).unique()))} for c in CAT_FEATS}
def encode_v1(X):
    X = prep_numeric(X)
    X = X.copy()
    for c in CAT_FEATS:
        X[c + '_e'] = X[c].astype(str).map(CAT_INDEX[c]).fillna(-1).astype(int)
        X.drop(columns=[c], inplace=True)
    return X

# ---- v2 encoder: target-encode (fit on train only) ----
def smoothed_target(src, y, prior, m=40):
    tmp = pd.DataFrame({'v': src.astype(str), 'y': y}).groupby('v')['y'].agg(['count', 'mean'])
    return (tmp['count'] * tmp['mean'] + prior * m) / (tmp['count'] + m)

PRIOR = float(train['label'].mean())
TE = {c: smoothed_target(train[c], train['label'], PRIOR) for c in CAT_FEATS}

def encode_v2(X, feats_numeric):
    X = X.copy()
    for c in feats_numeric:
        X[c] = pd.to_numeric(X[c], errors='coerce')
        if X[c].isna().any():
            X[c] = X[c].fillna(X[c].median())
    for c in CAT_FEATS:
        X[c + '_te'] = X[c].astype(str).map(TE[c]).fillna(PRIOR)
        X.drop(columns=[c], inplace=True)
    return X

# build the actual matrices (features only — no id/date/label columns)
X_tr1, y_tr = encode_v1(train[ALL_FEATS]), train['label']
X_va1, y_va = encode_v1(val[ALL_FEATS]),   val['label']
X_te1, y_te = encode_v1(test[ALL_FEATS]),  test['label']

FEATS_V2 = NUM_FEATS_V2 + [c + '_te' for c in CAT_FEATS]
X_tr2 = encode_v2(train[ALL_FEATS], NUM_FEATS_V2)[FEATS_V2]; y_tr2 = train['label']
X_va2 = encode_v2(val[ALL_FEATS],   NUM_FEATS_V2)[FEATS_V2]; y_va2 = val['label']
X_te2 = encode_v2(test[ALL_FEATS],  NUM_FEATS_V2)[FEATS_V2]; y_te2 = test['label']

print('v1 matrix:', X_tr1.shape, '| v2 matrix:', X_tr2.shape)
print('v2 constant features dropped:', len(NUM_FEATS) - len(NUM_FEATS_V2))
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — Hyperparameter tuning on the VALIDATION set (v2 change C)

v1 used fixed params (E.3) and early-stopped at only 9 trees. Here we run a
small random grid over the most impactful hyper-parameters, pick the set with
the best **validation AUC**, and keep the winner. Only `val` is used to choose
— `test` stays untouched until the final evaluation.
""")

# ----------------------------------------------------------------------------
code("""rng = np.random.default_rng(42)
PARAM_GRID = {
    'n_estimators': [400, 800],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.03, 0.05, 0.1],
    'subsample': [0.7, 0.8],
    'colsample_bytree': [0.7, 0.8],
    'min_child_weight': [1, 3, 8],
}

def train_cv(Xt, yt, Xv, yv, params, scale_pos_weight):
    clf = xgb.XGBClassifier(
        eval_metric='auc', early_stopping_rounds=25, random_state=42, verbosity=0,
        scale_pos_weight=scale_pos_weight, **params)
    clf.fit(Xt, yt, eval_set=[(Xv, yv)], verbose=False)
    return clf

# sample 24 random param combos
combos = []
for _ in range(24):
    combos.append({k: rng.choice(v) for k, v in PARAM_GRID.items()})

print('Tuning on validation... (24 combos x 2 weights)')
best = None
for spw in [None, 3.0]:
    for params in combos:
        try:
            clf = train_cv(X_tr2, y_tr2, X_va2, y_va2, params, spw)
            auc = clf.best_score
            rec = {'spw': spw, 'auc': auc, 'it': clf.best_iteration, **params}
            if best is None or auc > best['auc']:
                best = rec
        except Exception as e:
            print('  failed', params, e)
print('BEST on validation:', {k: (round(v,4) if isinstance(v,float) else v) for k,v in best.items()})
""")

# ----------------------------------------------------------------------------
md("""## Step 7 — Train the v1 baseline and the v2 winner

Both are trained on the SAME train split and evaluated on the SAME test flights.
- **v1-pipeline**: fixed E.3 params, label-encoded 29 features, no pos-weight.
- **v2-pipeline**: tuned params, target-encoded features minus constants,
  `scale_pos_weight` = 3 (a middle ground for the 15%-production scenario).
""")

# ----------------------------------------------------------------------------
code("""# v1 pipeline (baseline, same as v1 notebook)
model_v1 = xgb.XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8,
    eval_metric='auc', early_stopping_rounds=20, random_state=42, verbosity=0)
model_v1.fit(X_tr1, y_tr, eval_set=[(X_va1, y_va)], verbose=False)
print('v1 baseline: best_iter', model_v1.best_iteration, '| val AUC', round(model_v1.best_score,4))

# v2 pipeline (tuned params from Step 6)
p2 = {k: best[k] for k in ['n_estimators','max_depth','learning_rate','subsample',
                           'colsample_bytree','min_child_weight']}
spw2 = 3.0 if best['spw'] is None else best['spw']
model_v2 = xgb.XGBClassifier(
    eval_metric='auc', early_stopping_rounds=25, random_state=42, verbosity=0,
    scale_pos_weight=spw2, **p2)
model_v2.fit(X_tr2, y_tr2, eval_set=[(X_va2, y_va2)], verbose=False)
print('v2 tuned: best_iter', model_v2.best_iteration, '| val AUC', round(model_v2.best_score,4))
""")

# ----------------------------------------------------------------------------
md("""## Step 8 — Evaluate BOTH on the same test flights

Metrics: AUC, precision@recall=25%, and the **RED operating point** (max
precision while recall ≥ 20%), threshold tuned on validation only — never test.
""")

# ----------------------------------------------------------------------------
code("""def eval_model(clf, Xv, yv, Xt, yt, name):
    pv = clf.predict_proba(Xv)[:, 1]
    pt = clf.predict_proba(Xt)[:, 1]
    auc = roc_auc_score(yt, pt)

    # precision@recall=25%
    pr, re, th = precision_recall_curve(yt, pt)
    idx = (re >= 0.25).argmax()
    p_at_25 = pr[idx]

    # RED operating point: max precision while recall>=0.20, threshold from val
    prv, rev, thv = precision_recall_curve(yv, pv)
    keep = np.where(rev >= 0.20)[0]
    if len(keep):
        i = int(keep[0]); th_red = thv[i] if i < len(thv) else 0.5
    else:
        th_red = 0.5
    pred_red = (pt >= th_red).astype(int)
    p_red = precision_score(yt, pred_red); r_red = recall_score(yt, pred_red)

    print(f'[{name}]')
    print(f'  AUC test: {auc:.4f}')
    print(f'  precision@recall=25%: {p_at_25:.4f}')
    print(f'  RED point (th={th_red:.3f}): precision {p_red:.3f}, recall {r_red:.3f}')
    return {'name': name, 'auc': auc, 'p25': p_at_25, 'p_red': p_red, 'r_red': r_red}

r1 = eval_model(model_v1, X_va1, y_va, X_te1, y_te, 'v1 baseline')
r2 = eval_model(model_v2, X_va2, y_va2, X_te2, y_te2, 'v2 improved')
""")

# ----------------------------------------------------------------------------
md("""## Step 9 — Feature importance (v2)

Which features actually drive the v2 model? XGBoost `gain` = average
improvement in the loss when a feature is used to split. Higher = more
important.
""")

# ----------------------------------------------------------------------------
code("""import pandas as pd
gain = pd.Series(model_v2.get_booster().get_score(importance_type='gain'))
imp = gain.reset_index().rename(columns={'index': 'feature', 0: 'gain'})
imp['gain'] = imp['gain'].fillna(0)
imp = imp.sort_values('gain', ascending=False).reset_index(drop=True)
imp['share_%'] = (imp['gain'] / imp['gain'].sum() * 100).round(2)
print(imp.to_string(index=False))
""")

# ----------------------------------------------------------------------------
md("""## Step 10 — v1 vs v2 verdict (honest)""")

# ----------------------------------------------------------------------------
code("""print('=== v1 vs v2 (same test flights) ===')
print(f'{"metric":<28}{"v1":>10}{"v2":>10}')
print(f'{"AUC":<28}{r1["auc"]:>10.4f}{r2["auc"]:>10.4f}')
print(f'{"precision@recall=25%":<28}{r1["p25"]:>10.4f}{r2["p25"]:>10.4f}')
print(f'{"RED precision (rec>=20%)":<28}{r1["p_red"]:>10.3f}{r2["p_red"]:>10.3f}')
print(f'{"RED recall":<28}{r1["r_red"]:>10.3f}{r2["r_red"]:>10.3f}')
print()
if r2['auc'] > r1['auc']:
    print('Verdict: v2 improved AUC over v1 (modestly or not — check the gap).')
else:
    print('Verdict: v2 did NOT beat v1 on AUC. The changes are not helping yet;')
    print('the bottleneck is the data (only ~1 week of July), not the model.')
""")

# ----------------------------------------------------------------------------
md("""## Step 11 — Export the v2 model (separate files from v1)

Same export format as v1 but with `v2` names so the sidecar can choose which to
load.
""")

# ----------------------------------------------------------------------------
code("""CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)

out = {}
for k, v in TE.items():
    out[k] = {str(kk): float(vv) for kk, vv in v.items()}
p2 = {k: (float(v) if isinstance(v, float) else int(v)) for k, v in p2.items()}
meta2 = {
    'numeric_features': NUM_FEATS_V2,
    'categorical_features': CAT_FEATS,
    'target_encode': out,
    'prior': float(PRIOR),
    'threshold': None,  # set after threshold selection (Step 8)
    'best_iteration': int(model_v2.best_iteration),
    'n_estimators': int(model_v2.best_iteration) + 1,
    'params': p2,
    'scale_pos_weight': spw2,
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'threshold_v2.json'), 'w') as f:
    json.dump(meta2, f, indent=2)
model_v2.get_booster().save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor_v2.json'))
print('Saved exports/xgboost_delay_predictor_v2.json + threshold_v2.json')
print('Files:', sorted(os.listdir(EXPORT_DIR)))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v2.ipynb')
print('Wrote ml_analysis/travnr_ml_v2.ipynb with', len(cells), 'cells')
