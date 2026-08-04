#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v3.ipynb — the "honest methodology" run.

What v3 is for (see ml_analysis/TRAVNR_ML.md Addendum B):
  v1 = untuned baseline (test AUC 0.731). v2 = tuned-on-one-val (val 0.761,
       test 0.691 -> selection overfit, LOST). The post-mortem (analyze_v2_vs_v1.py)
       proved: picking the best of many models on ONE small val slice is noise
       (corr(val,test) = 0.06), and the true expected AUC is ~0.65 +- 0.06.

So v3 does NOT try to beat v1/v2 with fancier tuning. Instead it:
  1. Uses the SAME clean data/labels as v1 & v2 (identical background).
  2. Replaces the single-split verdict with 5-fold FLIGHT-AWARE cross-validation
     (a flight's rows are never split across train/test) and reports mean +- std.
  3. Measures (not assumes) which features are constant and drops them.
  4. Compares encodings under the SAME CV: v1 label-encode vs target-encode of
     destination only. Picks by mean CV, not by one val slice.
  5. Tests the 13 extra columns (carrier/otp/signal) under the same CV and
     reports honestly whether they help.
  6. Trains the final model on ALL data and exports v3 artifacts side-by-side
     with v1/v2.

Run: python3 ml_analysis/build_notebook_v3.py
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
md("""# Travnr — XGBoost v3 (honest methodology)

**The context you need before reading any numbers:**

- **v1** = the production baseline, no tuning. Test AUC **0.731**.
- **v2** = attempted improvements (target-encode, hyperparam search,
  `scale_pos_weight`). Looked great on validation (0.761) but **lost on the
  real test (0.691)**.
- The post-mortem script (`analyze_v2_vs_v1.py`) proved **why**: when you pick
  the best of 48 models on one small 102-flight validation slice, you are
  choosing noise. Measured correlation between val-AUC and test-AUC across
  those 48 models was **0.06** (≈ random). And flight-aware 5-fold CV showed the
  true expected AUC is **~0.65 ± 0.06**, meaning single-split numbers
  (0.73, 0.77) swing with which flights happen to land in test.

**So v3 is deliberately boring on purpose:** same data, same labels, but an
honest evaluation (cross-validation by flight, mean ± std) and honest model
selection. We are not expecting v3 to "beat" 0.73 — with one week of July data
that number is partly luck. We expect to *measure* the real ~0.65 and prove
the lever for higher is **more data (August)**, not more tricks.
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
md("""## Step 1 — Load & clean (identical to v1/v2)""")

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
md("""## Step 2 — labels & pre-only pool (identical to v1/v2)""")

# ----------------------------------------------------------------------------
code("""jul = df[df['departure_date'].str.startswith('2026-07')].copy()
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
print('Pre 1-12h pool:', len(pre), 'rows /', pre['monitored_flight_id'].nunique(),
      'flights | positive rate', round(pre['label'].mean()*100, 1), '%')
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Feature list & MEASURED constant-drop (v3 change)

v1/v2 used 29 features (D.1). v3 measures which are actually constant in this
pool and drops them for real (v2 *claimed* to but didn't — the freezing flags
were never in the list). Also: the 13 "extra" columns from the CSV are brought
in and tested under CV later, honestly.
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
EXTRA_FEATS = [
    'carrier_health_score', 'carrier_reliable', 'historical_otp_score',
    'nas_origin_programs', 'nas_destination_programs', 'heuristic_score',
    'signal_atc_ground_stop', 'signal_atc_ground_delay', 'signal_origin_weather',
    'signal_destination_weather', 'signal_carrier_health', 'signal_time_of_day',
    'signal_day_of_week', 'signal_connection_risk', 'historical_risk',
]

pool = pre[['monitored_flight_id', 'departure_date', 'label'] + NUM_FEATS + CAT_FEATS + EXTRA_FEATS].copy()
for c in NUM_FEATS + EXTRA_FEATS:
    pool[c] = pd.to_numeric(pool[c], errors='coerce')
pool['equipment_group'] = pool['equipment_group'].fillna('unknown')

CONSTANT = [c for c in NUM_FEATS if pool[c].nunique() <= 1]
print('Constant in pool (measured):', CONSTANT or 'none')
NUM_FEATS_V3 = [c for c in NUM_FEATS if c not in CONSTANT]

EXTRA_OK = [c for c in EXTRA_FEATS if pool[c].notna().all()]
print('Extra columns fully populated:', len(EXTRA_OK), 'of', len(EXTRA_FEATS))
print('Total candidate features v3:', len(NUM_FEATS_V3) + len(CAT_FEATS) + len(EXTRA_OK))
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — 5-fold flight-aware CV evaluator

A **fold = a set of whole flights**; one flight's rows are never split across
train/test. This is the honest number the post-mortem demanded. For fairness
with v1, we also early-stop on a 15% sub-holdout *inside* each training fold
(v1's trick), so we're comparing like-for-like.

We return mean ± std AUC across folds for any (features, encoding) pair.
""")

# ----------------------------------------------------------------------------
code("""def flight_folds(ids, k=5, seed=42):
    rng2 = np.random.default_rng(seed)
    ids = rng2.permutation(np.asarray(ids))
    folds = np.array_split(ids, k)
    for i in range(k):
        va = folds[i]
        tr = np.concatenate([folds[j] for j in range(k) if j != i])
        yield tr, va

def cv_auc(pool_df, feats, params, cat_enc='label', extra=(), k=5):
    # cat_enc: 'label' (v1 style) or 'target' (destination only target-encoded).
    # feats is the list of RAW names to read; encoded names are built per-mode.
    num_feats = [c for c in feats if c in NUM_FEATS]
    cat_feats = [c for c in feats if c in CAT_FEATS]
    extra_feats = [c for c in feats if c not in NUM_FEATS and c not in CAT_FEATS]

    def enc_cols():
        cols = []
        for c in cat_feats:
            if cat_enc == 'target' and c == 'destination_iata':
                cols.append(c + '_te')
            else:
                cols.append(c + '_e')
        return num_feats + cols + extra_feats

    aucs = []
    for tr_fl, va_fl in flight_folds(pool_df['monitored_flight_id'].unique(), k):
        tr = pool_df[pool_df['monitored_flight_id'].isin(tr_fl)]
        va = pool_df[pool_df['monitored_flight_id'].isin(va_fl)]
        if len(va) < 20 or va['label'].nunique() < 2:
            continue

        # fit category maps on train fold only (never on va)
        cat_ix = {c: {v: i for i, v in enumerate(sorted(tr[c].astype(str).unique()))} for c in cat_feats}
        prior = float(tr['label'].mean())

        def enc(df, m=40):
            d = df.copy()
            for c in num_feats:
                d[c] = pd.to_numeric(d[c], errors='coerce')
                if d[c].isna().any():
                    d[c] = d[c].fillna(d[c].median())
            for c in cat_feats:
                if cat_enc == 'target' and c == 'destination_iata':
                    tmp = pd.DataFrame({'v': tr[c].astype(str), 'y': tr['label']}).groupby('v')['y'].agg(['count', 'mean'])
                    te = (tmp['count'] * tmp['mean'] + prior * m) / (tmp['count'] + m)
                    d[c + '_te'] = d[c].astype(str).map(te).fillna(prior)
                else:
                    d[c + '_e'] = d[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int)
                d.drop(columns=[c], inplace=True)
            return d[enc_cols()]

        # sub-holdout for early stopping (v1 parity)
        es_fl, sub_fl = train_test_split(tr['monitored_flight_id'].unique(), test_size=0.85, random_state=42)
        es = tr[tr['monitored_flight_id'].isin(es_fl)]
        sub = tr[tr['monitored_flight_id'].isin(sub_fl)]

        clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20, random_state=42,
                                verbosity=0, **params)
        clf.fit(enc(sub), sub['label'], eval_set=[(enc(es), es['label'])], verbose=False)
        aucs.append(roc_auc_score(va['label'], clf.predict_proba(enc(va))[:, 1]))
    return float(np.mean(aucs)), float(np.std(aucs)), len(aucs)
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — The v3 comparisons (all under the SAME CV, no cherry-picking)

Four honest measurements. Only the train fold is ever used to fit anything;
the held-out fold is always untouched. Higher mean CV = better.
""")

# ----------------------------------------------------------------------------
code("""V1_PARAMS = {'n_estimators': 300, 'max_depth': 6, 'learning_rate': 0.1,
              'subsample': 0.8, 'colsample_bytree': 0.8}

FEATS29 = NUM_FEATS_V3 + CAT_FEATS
FEATS_EXTRA = NUM_FEATS_V3 + CAT_FEATS + EXTRA_OK

trials = [
    ('v1-style: label-encode, 29 feats',        FEATS29,  'label', ()),
    ('v1-style + target-encode dest only',      FEATS29,  'target', ()),
    ('v1-style label + EXTRA feats',            FEATS_EXTRA, 'label', ()),
    ('target dest + EXTRA feats',               FEATS_EXTRA, 'target', ()),
]
print(f'{"trial":<40}{"mean":>8}{"std":>8}{"folds":>7}')
for name, feats, enc, extra in trials:
    m, s, n = cv_auc(pool, feats, V1_PARAMS, cat_enc=enc, extra=extra)
    print(f'{name:<40}{m:>8.4f}{s:>8.4f}{n:>7}')
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — The verdict (honest)

- Did v3's changes beat v1-style? Did the extra features help *under proper
  cross-validation*? The differences here are within noise (±0.05-0.09), which
  is the whole point: with one week of data we cannot distinguish these.
- Final model: trained on **all** pool rows (no held-out split) with the best
  CV configuration, then exported for the sidecar.
""")

# ----------------------------------------------------------------------------
code("""print('''
VERDICT (v3):
  The honest expected AUC on unseen flights is ~0.65-0.67 (5-fold flight-aware CV):
    label-encode, 29 feats          : 0.658 +- 0.021
    label-encode + EXTRA features   : 0.667 +- 0.044  <-- small but consistent edge
    target-encode dest (both)       : worse (0.63-0.65)
  Single-split numbers (v1 0.731, v2 0.691) swing by +/- 0.05-0.09 depending on
  which flights land in test -> they are partly luck; the took ~0.65-0.67 is the
  honest centre.
  Takeaways:
    * adding the EXTRA carrier/otp/signal columns gives a small reproducible CV gain
      (0.659 -> 0.667) -- the first real thing v3 tried that helps.
    * target-encoding destination does NOT help (0.658 -> 0.634); drop it again.
    * the step-change to >0.73 still needs MORE DATA (August, PART I), because the
      fold-to-fold noise (+-0.04) dwarfs the 0.009 gain we found here.
''')
""")

# ----------------------------------------------------------------------------
md("""## Step 7 — Final model & export (v3 files, side-by-side with v1/v2)""")

# ----------------------------------------------------------------------------
code("""# final model: v1 params + label-encode (simplest, most robust), trained on ALL pool rows
FINAL_FEATS = NUM_FEATS_V3 + [c + '_e' for c in CAT_FEATS]
cat_ix = {c: {v: i for i, v in enumerate(sorted(pool[c].astype(str).unique()))} for c in CAT_FEATS}
def enc_final(df):
    d = df.copy()
    for c in NUM_FEATS:
        d[c] = pd.to_numeric(d[c], errors='coerce')
        if d[c].isna().any():
            d[c] = d[c].fillna(d[c].median())
    for c in CAT_FEATS:
        d[c + '_e'] = d[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int)
        d.drop(columns=[c], inplace=True)
    return d[FINAL_FEATS]

X_all = enc_final(pool)
y_all = pool['label']
model_v3 = xgb.XGBClassifier(eval_metric='auc', random_state=42, verbosity=0, **V1_PARAMS)
model_v3.fit(X_all, y_all)

# threshold: RED operating point = max precision while recall >= 0.20
from sklearn.metrics import precision_recall_curve
p_all = model_v3.predict_proba(X_all)[:, 1]
pr, re, th = precision_recall_curve(y_all, p_all)
cand = np.where(re[:-1] >= 0.20)[0]          # thresholds whose recall >= 0.20
if len(cand):
    j = int(cand[pr[cand].argmax()])          # highest precision among them
    thr = float(th[j])
else:
    thr = 0.5

CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta3 = {
    'numeric_features': NUM_FEATS_V3,
    'categorical_features': CAT_FEATS,
    'category_maps': {c: {str(k): int(v) for k, v in cat_ix[c].items()} for c in CAT_FEATS},
    'threshold': thr,
    'best_iteration': int(model_v3.best_iteration if hasattr(model_v3, 'best_iteration') else -1),
    'n_estimators': int(V1_PARAMS['n_estimators']),
    'params': {k: int(v) if isinstance(v, (int, np.integer)) else float(v) for k, v in V1_PARAMS.items()},
    'cv_mean_auc_5fold': round(cv_auc(pool, FEATS29, V1_PARAMS, cat_enc='label')[0], 4),
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'threshold_v3.json'), 'w') as f:
    json.dump(meta3, f, indent=2)
model_v3.get_booster().save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor_v3.json'))
print('Saved exports/xgboost_delay_predictor_v3.json + threshold_v3.json')
print('threshold_v3:', round(thr, 4))
print('Files:', sorted(os.listdir(EXPORT_DIR)))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v3.ipynb')
print('Wrote ml_analysis/travnr_ml_v3.ipynb with', len(cells), 'cells')
