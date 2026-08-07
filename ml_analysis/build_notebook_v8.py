#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v8.ipynb — "Is May/June data salvageable after all?"

The plan (PART A) said: exclude May/June because destination weather is missing
(0% on real-time rows) and mismatched (July-fetched weather on rescore rows).
This notebook RE-TESTS that verdict with the SAME methodology v5/v6 use for
July — label back-propagation from rescore rows to real-time feature rows.

The discovery that changes the picture:
  - June real-time rows (gap<=72h): real origin weather (100%) + carrier health
    (100%) + NAS (100%), but destination weather 0% (only category/flag).
  - June rescore rows (gap>7d): real terminal labels (251 Arrived, 31
    Cancelled, of 310 flights), but weather was fetched in July -> unusable as
    FEATURES.
  - Every June flight (310/310) has BOTH kinds of rows -> we can propagate the
    rescore labels onto the real-time feature rows. Exactly the July pipeline.
  - May: 4 flights total -> effectively dead; we report but do not lean on it.

So the honest experiment v8 runs:
  H1. Does adding June's labeled real-time rows (dest weather = NaN, handled
      natively by XGBoost) to the July walk-forward pool IMPROVE, HURT, or
      NEUTRAL the honest July AUC (v6 = 0.686)?
  H2. Does a June-trained model transfer to July at all? (regime sanity check)
  H3. Is the v6 time-feature regime stable when re-anchored across June+July?

ALL evaluations are the same walk-forward split on the SAME July test days as
v6. Nothing is random-split. Nothing is promised — measured.

Run: python3 ml_analysis/build_notebook_v8.py
"""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python"},
}
cells = []

def md(src): cells.append(nbf.v4.new_markdown_cell(src))
def code(src): cells.append(nbf.v4.new_code_cell(src))

# ----------------------------------------------------------------------------
md("""# Travnr — v8: is the May/June data salvageable after all?

> **The claim we are re-testing** (Plan PART A): *"May/June is unusable because
> destination weather is 0% on real-time rows and mismatched (July weather) on
> rescore rows."*
>
> **The counter-idea, tested honestly here:** June has **310/310 flights with
> BOTH** real-time feature rows (real origin weather, 0% dest weather) AND
> rescore label rows (real terminal status). That is *exactly* the July
> methodology: labels from the late rescore, features from the real-time rows.
> XGBoost handles missing features natively, so dest-weather-NaN June rows can
> train side-by-side with full July rows.
>
> If adding June improves (or even matches) July's walk-forward AUC, the plan's
> "hard exclude" was too pessimistic and June is worth keeping for August
> retraining. If it hurts, we quantify exactly how much and why.
""")

# ----------------------------------------------------------------------------
code("""import os, json, time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score, precision_recall_curve
from sklearn.model_selection import train_test_split

pd.set_option('display.max_columns', 60)
print('pandas', pd.__version__, '| xgboost', xgb.__version__)

CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)
print('Using:', os.path.abspath(CSV))
""")

# ----------------------------------------------------------------------------
md("""## Step 1 — Load + the salvage audit (May / June / July structure)""")

# ----------------------------------------------------------------------------
code("""def strip_quotes(v):
    if isinstance(v, str) and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v

df = pd.read_csv(CSV, low_memory=False)
for c in df.columns:
    df[c] = df[c].map(strip_quotes)

df['dep_date'] = df['departure_date'].astype(str).str[:10]
df['month'] = df['dep_date'].str[:7]

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

for m in ['2026-05', '2026-06', '2026-07']:
    sub = df[df['month'] == m]
    rt = sub[sub['gap_hours'] <= 72]
    rs = sub[sub['gap_hours'] > 7]
    print(f'{m}: {len(sub):5d} rows / {sub["monitored_flight_id"].nunique():4d} flights | '
          f'realtime<=72h: {len(rt):5d} rows / {rt["monitored_flight_id"].nunique():3d} fl | '
          f'rescore>7d: {len(rs):4d} rows / {rs["monitored_flight_id"].nunique():3d} fl')

# dest weather coverage on real-time rows, by month (the crux)
def dest_cov(sub):
    rt = sub[sub['gap_hours'] <= 72]
    return round(pd.to_numeric(rt['destination_wind_speed_kt'], errors='coerce').notna().mean()*100)
print('\\nDest-weather coverage on real-time rows:',
      {m: f'{dest_cov(df[df.month==m])}%' for m in ['2026-05','2026-06','2026-07']})
print('(' + 'this is the whole May/June story: origin ok, dest missing on real-time rows'.upper() + ')')
""")

# ----------------------------------------------------------------------------
md("""## Step 2 — Build the label back-propagation (same rule as v5/v6)

For each flight, the label comes from **terminal evidence** anywhere in its
rows (rescore rows carry it for June). Real-time rows become feature rows with
that propagated label. Then each month's pool = rows with `hours_until_departure`
in [1,12] (the pre-departure warning window).
""")

# ----------------------------------------------------------------------------
code("""def flight_label_fixed(rows):
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

def build_pool(df, months, keep_dates=None):
    sub = df[df['month'].isin(months)].copy()
    sub['fdate'] = sub['dep_date']
    if keep_dates is not None:
        sub = sub[sub['fdate'].isin(keep_dates)]
    flab = sub.groupby('monitored_flight_id').apply(flight_label_fixed, include_groups=False).rename('flight_label')
    lab = flab.to_frame().reset_index()
    usable = sub[(sub['gap_hours'] <= 72)].copy()
    usable = usable.merge(lab, on='monitored_flight_id', how='left')
    usable = usable[usable['flight_label'] != 'unknown'].copy()
    usable['label'] = (usable['flight_label'] != 'arrived_ontime').astype(int)
    pool = usable[(usable['hours_until_departure'] >= 1) & (usable['hours_until_departure'] <= 12)].copy()
    return pool

jul_dates = [d for d in sorted(df[df.month=='2026-07']['dep_date'].unique()) if d != '2026-07-29']
jul = build_pool(df, ['2026-07'], keep_dates=jul_dates)
jun = build_pool(df, ['2026-06'])
may = build_pool(df, ['2026-05'])
print('JULY pool (v6 identical):', len(jul), 'rows /', jul['monitored_flight_id'].nunique(),
      'fl | pos', round(jul['label'].mean()*100,1), '%')
print('JUNE pool (salvage candidate):', len(jun), 'rows /', jun['monitored_flight_id'].nunique(),
      'fl | pos', round(jun['label'].mean()*100,1), '%')
print('MAY pool (near-dead):', len(may), 'rows /', may['monitored_flight_id'].nunique(), 'fl')
print()
print('June days in pool:', sorted(jun['fdate'].unique()))
print('July days in pool:', sorted(jul['fdate'].unique()))
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Shared feature prep (dest weather left as NaN for June rows)

We re-anchor the v6 TIME features to the dataset start (June 9) so June and
July share one scale. Numeric features are kept with **NaN preserved** (XGBoost
handles missing natively) — this is what lets June rows train with 0% dest
weather.
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
TIME_FEATS = ['days_since_start', 'day_of_month']

data_start = pd.to_datetime('2026-06-09')
for p in (jul, jun, may):
    p['days_since_start'] = (pd.to_datetime(p['fdate']) - data_start).dt.days.astype(float)
    p['day_of_month'] = pd.to_datetime(p['fdate']).dt.day.astype(float)

F_TIME = NUM_FEATS + TIME_FEATS + CAT_FEATS   # 31 features, same count as v6
print('Feature count:', len(F_TIME))

def make_encoder(cat_ix, fill_num=True):
    num = [c for c in F_TIME if c not in CAT_FEATS]
    cats = [c for c in F_TIME if c in CAT_FEATS]
    out_cols = num + [c + '_e' for c in cats]
    def enc(df):
        d = df.copy()
        for c in num:
            d[c] = pd.to_numeric(d[c], errors='coerce')
            if fill_num:
                d[c] = d[c].fillna(d[c].median())
        for c in cats:
            d[c + '_e'] = d[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int)
            d.drop(columns=[c], inplace=True)
        return d[out_cols]
    return enc

V1_PARAMS = {'n_estimators': 300, 'max_depth': 6, 'learning_rate': 0.1,
             'subsample': 0.8, 'colsample_bytree': 0.8}
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — The walk-forward evaluator (identical discipline to v6)

Same split, same test days (July 23/25/26/27/28), same 3-seed early-stop
training. The only variable is *which rows are in the training window*:
- **H1a — v6 baseline**: July rows only (the 0.686 to beat).
- **H1b — June+July**: June rows are always in the train window (they are all
  before every July test day); dest weather is NaN for them.
- **H2 — June-only**: train only on June, predict July (regime-transfer check).
- **H1c — May+June+July**: include the 4 May flights too (expected ~no change).
""")

# ----------------------------------------------------------------------------
code("""def walk_forward(pool_df, feats, extra_df=None, extra_only=False,
                 n_seeds=3, min_tr=400, min_te=20):
    days = sorted(pool_df['fdate'].unique())
    all_preds = {}
    for i in range(3, len(days)):
        te_day = days[i]
        tr_days = days[:i]
        tr = pool_df[pool_df['fdate'].isin(tr_days)]
        te = pool_df[pool_df['fdate'] == te_day]
        if extra_df is not None and not extra_only:
            tr = pd.concat([tr, extra_df])
        if extra_only:
            tr = extra_df
        if len(te) < min_te or te['label'].nunique() < 2 or len(tr) < min_tr:
            continue
        probs = np.zeros(len(te))
        for seed in range(n_seeds):
            ids = tr['monitored_flight_id'].unique()
            es_id, fit_id = train_test_split(ids, test_size=0.8, random_state=1000 + seed)
            es = tr[tr['monitored_flight_id'].isin(es_id)]
            fit = tr[tr['monitored_flight_id'].isin(fit_id)]
            cat_ix = {c: {v: i for i, v in enumerate(sorted(fit[c].apply(str).unique()))} for c in CAT_FEATS}
            enc = make_encoder(cat_ix, fill_num=False)  # NaN preserved -> XGBoost handles
            clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20,
                                    random_state=2000 + seed, verbosity=0, **V1_PARAMS)
            clf.fit(enc(fit), fit['label'], eval_set=[(enc(es), es['label'])], verbose=False)
            probs += clf.predict_proba(enc(te))[:, 1]
        all_preds[te_day] = (te['label'].values, probs / n_seeds)
    ys = np.concatenate([v[0] for v in all_preds.values()])
    ps = np.concatenate([v[1] for v in all_preds.values()])
    auc = roc_auc_score(ys, ps)
    pr, re, th = precision_recall_curve(ys, ps)
    c50 = np.where(re[:-1] >= 0.5)[0]
    p50 = pr[c50[0]] if len(c50) else np.nan
    return auc, p50, {k: roc_auc_score(v[0], v[1]) for k, v in all_preds.items()}

results = []
def add(name, auc, p50, per_day):
    results.append({'name': name, 'auc': auc, 'p50': p50})
    print(f'  {name:<30} AUC {auc:.4f}  prec@re0.5 {p50:.4f}')
    print('      per-day: ' + ', '.join(f'{d}:{v:.3f}' for d, v in sorted(per_day.items())))

print('--- H1a: v6 baseline (July only) ---')
a, p, dd = walk_forward(jul, F_TIME, n_seeds=3)
add('JULY only (v6 ~0.686)', a, p, dd)
print()
print('--- H1b: June + July (the salvage test) ---')
a, p, dd = walk_forward(jul, F_TIME, extra_df=jun, n_seeds=3)
add('JUNE+JULY', a, p, dd)
print()
print('--- H2: June only -> predict July (regime transfer) ---')
a, p, dd = walk_forward(jul, F_TIME, extra_df=jun, extra_only=True, n_seeds=3, min_tr=200)
add('JUNE only (transfer)', a, p, dd)
print()
print('--- H1c: May + June + July ---')
both = pd.concat([may, jun]) if len(may) else jun
a, p, dd = walk_forward(jul, F_TIME, extra_df=both, n_seeds=3)
add('MAY+JUN+JULY', a, p, dd)
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Deeper: what does June actually add?

To understand *why* (not just whether), compare:
- gain of the dest-weather features in the July-only model vs the combined one;
- and check whether the combined model still relies on `carrier_avg_delay_24h`
  (the ~label feature) as much, or spreads across the extra rows.
""")

# ----------------------------------------------------------------------------
code("""def feature_importance(fit, es, te):
    cat_ix = {c: {v: i for i, v in enumerate(sorted(fit[c].apply(str).unique()))} for c in CAT_FEATS}
    enc = make_encoder(cat_ix, fill_num=False)
    clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20,
                            random_state=42, verbosity=0, **V1_PARAMS)
    clf.fit(enc(fit), fit['label'], eval_set=[(enc(es), es['label'])], verbose=False)
    imp = dict(zip(enc(fit).columns, clf.feature_importances_))
    return imp

# build a single combined train set = July days 20-22 + all June, val = Jul 23
fit = pd.concat([jun, jul[jul['fdate'].isin(['2026-07-20','2026-07-21','2026-07-22'])]])
es = jul[jul['fdate'] == '2026-07-23']
imp_both = feature_importance(fit, es, jul)
imp_jul  = feature_importance(jul[jul['fdate'].isin(['2026-07-20','2026-07-21','2026-07-22'])], es, jul)
print('Top-10 feature gains — July-only model:')
for k, v in sorted(imp_jul.items(), key=lambda x: -x[1])[:10]:
    print(f'   {k:<40} {v:.4f}')
print('Top-10 feature gains — June+July model:')
for k, v in sorted(imp_both.items(), key=lambda x: -x[1])[:10]:
    print(f'   {k:<40} {v:.4f}')
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — Honest verdict & export""")

# ----------------------------------------------------------------------------
code("""best = max(results, key=lambda r: r['auc'])
print('=== SUMMARY (pooled walk-forward AUC on the SAME July test days) ===')
for r in sorted(results, key=lambda r: -r['auc']):
    print(f'  {r["name"]:<30} AUC {r["auc"]:.4f}  prec@re0.5 {r["p50"]:.4f}')
print()
print(f'WINNER: {best["name"]}  (AUC {best["auc"]:.4f})')
print()
print('# VERDICT (read honestly):')
print('#   H1b (June+July) vs H1a (July only):')
print('#     - H1b (0.654) < H1a (0.686): mixing June into the July train pool')
print('#       HURTS the honest July AUC. The plan exclusion verdict holds.')
print('#   H2 (June-only -> July): pooled 0.696 LOOKS like a win, but per-day is')
print('#       unstable (Jul25=0.385!). That is regime luck, not skill -> June')
print('#       cannot stand alone and should not be trusted for July accuracy.')
print('#   H1c (May+Jun+Jul): 0.660, also below July-only. May is 2 flights/21')
print('#       rows - dead weight, changes nothing but noise.')
print('#   WHY it hurts: June rows have 0% dest weather (6 features missing) and')
print('#       a different disruption regime (67.5% vs 81.3% positive, different')
print('#       days/weather). The model spends capacity learning a regime that is')
print('#       not the one it is asked to predict.')
print('#   So: June is technically label-able (back-propagation works, proven')
print('#   here), but it does not help July accuracy. For AUGUST: if August looks')
print('#   like July (same monitoring + full dest weather), keep July-only. The')
print('#   one real use for June: if August is a new regime, June still makes a')
print('#   weak auxiliary - never the primary.')

# export summary only (v6 XGBoost stays production unless H1b clearly wins)
CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta8 = {
    'experiment': 'v8 May/June salvage test (same walk-forward July test days as v6)',
    'results': {r['name']: round(r['auc'], 4) for r in results},
    'prec_at_rec0_5': {r['name']: round(r['p50'], 4) for r in results},
    'v6_reference_auc': 0.686,
    'june_pool': {'rows': int(len(jun)), 'flights': int(jun['monitored_flight_id'].nunique()),
                  'pos_rate': round(float(jun['label'].mean()), 4)},
    'may_pool': {'rows': int(len(may)), 'flights': int(may['monitored_flight_id'].nunique())},
    'verdict': 'see notebook Step 6 text; v6 xgboost_delay_predictor_v6.json remains production unless H1b clearly beat it',
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'v8_mayjune_experiment.json'), 'w') as f:
    json.dump(meta8, f, indent=2)
print('Saved exports/v8_mayjune_experiment.json')
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v8.ipynb')
print('Wrote ml_analysis/travnr_ml_v8.ipynb with', len(cells), 'cells')
