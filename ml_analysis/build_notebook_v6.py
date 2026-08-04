#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v6.ipynb — "beat the honest baseline honestly".

The starting point (v5, trustworthy): clean labels (terminal-evidence only),
Jul 20-28 (Jul 29 dropped), walk-forward time validation, 29-feature base
model: pooled AUC 0.646 +- 0.10, precision ~0.81 @ recall 0.5.

v6 tries to push that number UP, WITHOUT reintroducing any of the mistakes:

  Mistake log being honored:
    - NO random split for scoring (walk-forward only).
    - NO tuning against one small val slice (fixed params).
    - NO "on-time" labels without terminal status (fixed in v5).
    - NO promising something without measuring it under the honest split.

  The four hypotheses v6 tests (all measured under the SAME walk-forward):
    H1. ROLLING WINDOW. The July regime shifts over time (84% -> 7.5%). Maybe
        training on only the most recent N days generalizes better to tomorrow
        than training on ALL past days (which includes an old, very different
        weather regime). Test windows of 3, 4, 5 days.
    H2. SEED-AVERAGED ENSEMBLE. The +-0.10 variance is mostly seed/luck. Averaging
        predictions over several model seeds should reduce that variance and
        slightly raise mean AUC (classic variance reduction).
    H3. TIME FEATURES. Add "days since July 1" / day-of-month as explicit
        features. Legal at prediction time. May help the model learn the regime
        trend -- or may just memorize it. We measure, we don't promise.
    H4. DROP carrier_avg_delay_24h (the ~label feature). v4 showed it tracks the
        day regime (corr +0.75). Under walk-forward it's technically fine, but
        if the model leans on it, predictions in a NEW regime (August) may fail.
        We test whether removing it costs anything.

  The winner of H1-H4 becomes the v6 export (trained on all Jul 20-28).

Run: python3 ml_analysis/build_notebook_v6.py
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
md("""# Travnr — XGBoost v6 (beat the honest baseline, honestly)

**Where v5 left us (the trustworthy baseline):**

| config | pooled walk-forward AUC | prec@recall 0.5 |
| ------ | ----------------------- | --------------- |
| 29-feature base, clean labels, Jul 20-28 | **0.646 ± 0.10** | 0.81 |

v6 does NOT touch labels or the split (those are settled and fixed). It tests
four **hypotheses about how to raise the honest number**, all measured under the
same walk-forward evaluation. Whatever wins, we export — and we accept the
result whether it's higher or not.

> **Reminder of the mistakes we will not repeat:** no random split for scoring,
> no tuning on one val slice, no fake on-time labels, no promising without
> measuring.
""")

# ----------------------------------------------------------------------------
code("""import os, json, time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score, precision_recall_curve
from sklearn.model_selection import train_test_split

pd.set_option('display.max_columns', 60)
print('pandas', pd.__version__, '| numpy', np.__version__, '| xgboost', xgb.__version__)

CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)
print('Using:', os.path.abspath(CSV))
""")

# ----------------------------------------------------------------------------
md("""## Step 1 — Load, FIXED labels, drop Jul 29 (identical to v5)""")

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

jul_full = df[df['departure_date'].str.startswith('2026-07')].copy()
jul_full['fdate'] = jul_full['departure_date'].str[:10]

def flight_label_fixed(rows):
    cancelled = any(str(r['actual_cancelled']).strip().lower() == 'true' for _, r in rows.iterrows())
    if cancelled:
        return 'cancelled'
    delays = [float(r['actual_delay_minutes']) for _, r in rows.iterrows()
              if str(r['actual_delay_minutes']).strip() not in ('', 'nan')]
    if delays and max(delays) >= 15:
        return 'arrived_late'
    statuses = set(str(r['actual_status']).strip() for _, r in rows.iterrows())
    if statuses & {'Arrived', 'Delayed'}:
        return 'arrived_ontime'
    return 'unknown'

flab = jul_full.groupby('monitored_flight_id').apply(flight_label_fixed, include_groups=False).rename('flight_label')
lab = flab.to_frame().reset_index()

keep_dates = [d for d in sorted(jul_full['fdate'].unique()) if d != '2026-07-29']
usable = jul_full[jul_full['fdate'].isin(keep_dates) & (jul_full['gap_hours'] <= 72)].copy()
usable = usable.merge(lab, on='monitored_flight_id', how='left')
usable = usable[usable['flight_label'] != 'unknown'].copy()
usable['label'] = (usable['flight_label'] != 'arrived_ontime').astype(int)
pre = usable[(usable['hours_until_departure'] >= 1) & (usable['hours_until_departure'] <= 12)].copy()
print('Cleaned pool (same as v5):', len(pre), 'rows /', pre['monitored_flight_id'].nunique(),
      'flights | pos', round(pre['label'].mean()*100,1), '%')
""")

# ----------------------------------------------------------------------------
md("""## Step 2 — Feature sets

- **BASE** = the 29-feature v1 set (v5 winner).
- **TIME** = BASE + explicit time features (`days_since_july1`, `day_of_month`).
- **NO24** = BASE minus `carrier_avg_delay_24h` (the ~label feature) — H4.

Categorical label-encoding for all; nothing new is target-encoded (v2/v3
proved target-encoding loses under honest evaluation).
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
TIME_FEATS = ['days_since_july1', 'day_of_month']
NO24_FEATS = [c for c in NUM_FEATS if c != 'carrier_avg_delay_24h']

# add time features to pool (legal at prediction time)
base = pd.to_datetime('2026-07-01')
pre['days_since_july1'] = (pd.to_datetime(pre['fdate']) - base).dt.days.astype(float)
pre['day_of_month'] = pd.to_datetime(pre['fdate']).dt.day.astype(float)

F_BASE = NUM_FEATS + CAT_FEATS
F_TIME = NUM_FEATS + TIME_FEATS + CAT_FEATS
F_NO24 = NO24_FEATS + CAT_FEATS
print('BASE:', len(F_BASE), '| TIME:', len(F_TIME), '| NO24:', len(F_NO24))
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Walk-forward evaluator (fixed params, optional seed averaging)

Train on a window of past days, predict the next unseen day. Two modes:
- `expanding`: use ALL past days (v5 behaviour).
- `rolling`: use only the LAST `window` days (H1) — closer to "predict
  tomorrow from this week's behaviour".

`n_seeds`: average predictions over several model seeds (H2) to cut variance.
""")

# ----------------------------------------------------------------------------
code("""def make_encoder(pool_df, feats, cat_ix):
    num = [c for c in feats if c in NUM_FEATS + TIME_FEATS]
    cats = [c for c in feats if c in CAT_FEATS]
    out_cols = num + [c + '_e' for c in cats]
    def enc(df):
        d = df.copy()
        for c in num:
            d[c] = pd.to_numeric(d[c], errors='coerce')
            if d[c].isna().any():
                d[c] = d[c].fillna(d[c].median())
        for c in cats:
            d[c + '_e'] = d[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int)
            d.drop(columns=[c], inplace=True)
        return d[out_cols]
    return enc

V1_PARAMS = {'n_estimators': 300, 'max_depth': 6, 'learning_rate': 0.1,
             'subsample': 0.8, 'colsample_bytree': 0.8}

def walk_forward(pool_df, feats, mode='expanding', window=4, n_seeds=3,
                 min_tr=400, min_te=20):
    days = sorted(pool_df['fdate'].unique())
    all_preds = {}   # day -> list of (label, mean_prob)
    for i in range(3, len(days)):
        te_day = days[i]
        if mode == 'expanding':
            tr_days = days[:i]
        else:
            tr_days = days[max(0, i - window):i]
        tr = pool_df[pool_df['fdate'].isin(tr_days)]
        te = pool_df[pool_df['fdate'] == te_day]
        if len(te) < min_te or te['label'].nunique() < 2 or len(tr) < min_tr:
            continue
        # split training by flight into fit/es for early stopping
        probs = np.zeros(len(te))
        for seed in range(n_seeds):
            ids = tr['monitored_flight_id'].unique()
            es_id, fit_id = train_test_split(ids, test_size=0.8, random_state=1000 + seed)
            es = tr[tr['monitored_flight_id'].isin(es_id)]
            fit = tr[tr['monitored_flight_id'].isin(fit_id)]
            cat_ix = {c: {v: i for i, v in enumerate(sorted(fit[c].apply(lambda x: str(x)).unique()))} for c in CAT_FEATS}
            enc = make_encoder(pool_df, feats, cat_ix)
            clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20,
                                    random_state=2000 + seed, verbosity=0, **V1_PARAMS)
            clf.fit(enc(fit), fit['label'], eval_set=[(enc(es), es['label'])], verbose=False)
            probs += clf.predict_proba(enc(te))[:, 1]
        all_preds[te_day] = (te['label'].values, probs / n_seeds)
    # pooled AUC over all held-out days
    ys = np.concatenate([v[0] for v in all_preds.values()])
    ps = np.concatenate([v[1] for v in all_preds.values()])
    auc = roc_auc_score(ys, ps)
    pr, re, th = precision_recall_curve(ys, ps)
    c50 = np.where(re[:-1] >= 0.5)[0]
    p50 = pr[c50[0]] if len(c50) else np.nan
    return auc, p50, {k: roc_auc_score(v[0], v[1]) for k, v in all_preds.items()}
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — The v6 comparison (all under walk-forward, all honest)

We vary ONE thing at a time so each hypothesis is cleanly testable:
""")

# ----------------------------------------------------------------------------
code("""results = []
def add(name, auc, p50, per_day):
    results.append({'name': name, 'auc': auc, 'p50': p50})
    print(f'  {name:<44} AUC {auc:.4f}  prec@re0.5 {p50:.4f}')
    print(f'      per-day: ' + ', '.join(f'{d}:{v:.3f}' for d, v in sorted(per_day.items())))

print('--- H1: rolling vs expanding window (BASE features, 3 seeds) ---')
a, p, dd = walk_forward(pre, F_BASE, 'expanding', n_seeds=3)
add('BASE expanding (v5-like)', a, p, dd)
for w in [3, 4, 5]:
    a, p, dd = walk_forward(pre, F_BASE, 'rolling', window=w, n_seeds=3)
    add(f'BASE rolling-{w}d', a, p, dd)
print()
print('--- H2: seed averaging (BASE expanding) ---')
a, p, dd = walk_forward(pre, F_BASE, 'expanding', n_seeds=1)
add('BASE expanding 1-seed', a, p, dd)
a, p, dd = walk_forward(pre, F_BASE, 'expanding', n_seeds=5)
add('BASE expanding 5-seed', a, p, dd)
print()
print('--- H3: time features (expanding) ---')
a, p, dd = walk_forward(pre, F_TIME, 'expanding', n_seeds=3)
add('TIME feats expanding', a, p, dd)
a, p, dd = walk_forward(pre, F_TIME, 'rolling', window=4, n_seeds=3)
add('TIME feats rolling-4d', a, p, dd)
print()
print('--- H4: drop carrier_avg_delay_24h (expanding) ---')
a, p, dd = walk_forward(pre, F_NO24, 'expanding', n_seeds=3)
add('NO24 (no carrier_24h)', a, p, dd)
a, p, dd = walk_forward(pre, F_NO24, 'rolling', window=4, n_seeds=3)
add('NO24 rolling-4d', a, p, dd)
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Pick the winner and give the honest verdict""")

# ----------------------------------------------------------------------------
code("""best = max(results, key=lambda r: r['auc'])
print('=== SUMMARY (pooled walk-forward AUC) ===')
for r in sorted(results, key=lambda r: -r['auc']):
    print(f'  {r["name"]:<44} AUC {r["auc"]:.4f}  prec@re0.5 {r["p50"]:.4f}')
print()
print(f'WINNER: {best["name"]}  (AUC {best["auc"]:.4f})')
print()
print('''VERDICT:
  Did any hypothesis beat v5's 0.646? Check the summary above.
  - H1 (rolling window): if yes, a recent-window model adapts to the shifting
    regime -> adopt it for August.
  - H2 (seed averaging): reduces variance; adopt regardless (more trustworthy).
  - H3 (time features): if no improvement, the model already extracts the
    regime signal from weather/delay features; drop time features.
  - H4 (drop carrier_avg_delay_24h): if AUC barely moves, the model does NOT
    depend on the ~label feature -> safer for August's new regime. If it drops
    a lot, carrier_24h is doing real (post-hoc) work and we must note that.
  Whatever the winner, v6 is exported below. Honesty: the number is what it is.
''')
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — Final model & export (v6)""")

# ----------------------------------------------------------------------------
code("""# v6 uses the winning approach on ALL of Jul 20-28, then exports.
WIN_FEATS = {'TIME': F_TIME, 'NO24': F_NO24, 'BASE': F_BASE}.get(
    best['name'].split()[0], F_BASE)
print('Exporting winner config:', best['name'], '| feats =', len(WIN_FEATS))
mode = 'expanding'; window = 4

cat_ix = {c: {v: i for i, v in enumerate(sorted(pre[c].apply(lambda x: str(x)).unique()))} for c in CAT_FEATS}
enc = make_encoder(pre, WIN_FEATS, cat_ix)
X_all = enc(pre)
y_all = pre['label']

# seed-averaged ensemble final model (H2)
models = []
for seed in range(5):
    m = xgb.XGBClassifier(eval_metric='auc', random_state=3000 + seed, verbosity=0, **V1_PARAMS)
    m.fit(X_all, y_all)
    models.append(m)
def ensemble_proba(X):
    return np.mean([m.predict_proba(X)[:, 1] for m in models], axis=0)

p_all = ensemble_proba(X_all)
pr, re, th = precision_recall_curve(y_all, p_all)
cand = np.where(re[:-1] >= 0.20)[0]
thr = float(th[cand[pr[cand].argmax()]]) if len(cand) else 0.5

CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta6 = {
    'numeric_features': [c for c in WIN_FEATS if c not in CAT_FEATS],
    'categorical_features': [c for c in WIN_FEATS if c in CAT_FEATS],
    'category_maps': {c: {str(k): int(v) for k, v in cat_ix[c].items()} for c in CAT_FEATS},
    'threshold': thr,
    'n_estimators': int(V1_PARAMS['n_estimators']),
    'params': {k: int(v) if isinstance(v, (int, np.integer)) else float(v) for k, v in V1_PARAMS.items()},
    'ensemble_seeds': 5,
    'label_rule': 'terminal-evidence only; Jul29 dropped',
    'best_config': best['name'],
    'best_walkforward_auc': round(best['auc'], 4),
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'threshold_v6.json'), 'w') as f:
    json.dump(meta6, f, indent=2)
# export the FIRST model of the ensemble as the primary booster
models[0].get_booster().save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor_v6.json'))
print('Saved exports/xgboost_delay_predictor_v6.json + threshold_v6.json')
print('threshold_v6:', round(thr, 4))
print('Files:', sorted(os.listdir(EXPORT_DIR)))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v6.ipynb')
print('Wrote ml_analysis/travnr_ml_v6.ipynb with', len(cells), 'cells')
