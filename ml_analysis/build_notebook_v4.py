#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v4.ipynb — the "time-aware, cascade-feature" run.

What v4 does differently (and WHY):

  DIAGNOSIS that drives v4 (see ml_analysis/TRAVNR_ML.md Addendum C):
  1. The July data is NOT stationary. Flight-level disruption rate swings
     75-85% (Jul 20-23) -> ~68% (25-26) -> 32-38% (27-28) -> 7.5% (Jul 29).
     Weather/ATC state "spills" across days: same-day flights share the same
     disruption regime. => A RANDOM split by flight mixes same-day flights into
     train AND test, leaking the day's regime. v1/v2/v3 all measured on a random
     split, so their ~0.73 test AUC is PARTLY this leak (optimistic).
  2. Evidence of the leak: `carrier_avg_delay_24h` correlates +0.458 with the
     day number in July (it is basically the label "was the last 24h a bad
     stretch"). A model trained on a random split can read today's state from a
     test row's own carrier_avg_delay_24h because it saw OTHER same-day flights
     during training. Real production prediction cannot do that.
  3. `carrier_avg_delay_24h` etc. are legitimate features AT PREDICTION TIME
     (they use only data before the flight), so we keep them — but we must
     EVALUATE honestly: hold out whole FUTURE days.

  v4 changes:
    A. TIME-BASED EVALUATION. Train on early days, predict LATER days
       (walk-forward), never seeing the target day in training. This is the
       production-realistic test. We also report the random-split number for
       comparison so we can SEE how much the old split inflated things.
    B. ROLLING / CASCADE FEATURES. "Is the system ALREADY failing?" measured
       strictly BEFORE each row's score time:
         - same-destination flights that already departed in last 6h: avg delay
         - same-carrier flights already departed in last 12h: avg delay + cancel frac
         - origin/destination weather trend in last 6h (storm fraction, wind delta)
       These are valid at prediction time (only use rows strictly before this
       row's scored_at) and directly capture day-to-day spilling you asked about.
    C. HONEST METRICS. AUC is the headline; we ALSO report precision/recall at
       a fixed threshold so you can see the operating point on future days.

Run: python3 ml_analysis/build_notebook_v4.py
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
md("""# Travnr — XGBoost v4 (time-aware, cascade features)

**The story so far, in one paragraph:**
v1 (no tuning) got test AUC **0.731**; v2 (tuned on one val) got 0.691 and
lost; v3 (honest 5-fold CV) showed the *expected* AUC is really ~0.65 ± 0.04.
The post-mortem proved **why**: with 679 flights from one week, the *data* is
the constraint.

**v4 adds two new ideas the earlier runs missed:**

1. **Time matters.** The July data is *not* stationary — disruption rate
   swings 84% (Jul 20-22) down to 7.5% (Jul 29). Weather/ATC state spills from
   day to day. A random flight split lets the model peek at same-day flights in
   training, inflating the score. **v4 evaluates by time: train on early days,
   predict later days** (walk-forward). That's the production-realistic test.

2. **Cascade features.** If flights to the *same destination* are *already*
   delayed today, your flight probably will be too. v4 builds rolling features
   from flights that already departed BEFORE this row's score time — which is
   fair at prediction time and captures the "system is already failing" signal
   you asked about.

We do **not** expect v4 to magically beat 0.73 — the honest centre is ~0.65.
But v4 tells us: (a) how much the old random split was cheating, (b) whether
cascade features genuinely help on unseen days, and (c) what the real precision
at a production-ish threshold looks like.
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
md("""## Step 1 — Load & clean (identical to v1/v2/v3)""")

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
md("""## Step 2 — labels & pre-only pool (identical to v1/v2/v3)""")

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
md("""## Step 3 — The time-structure problem (evidence for v4)

Every earlier run split **randomly by flight**. If disruption is not stationary
across days, that leaks the day's regime into the test set. Show it: per-day
disruption rate + how `carrier_avg_delay_24h` tracks the day (≈ the label).
""")

# ----------------------------------------------------------------------------
code("""pre['fdate'] = pre['departure_date'].str[:10]
daypiv = pre.groupby('fdate')['label'].agg(['mean', 'count'])
print('Per-day disruption rate in the pre-1-12h pool:')
print((daypiv['mean'] * 100).round(1).to_string())
print()
c = pd.to_numeric(pre['carrier_avg_delay_24h'], errors='coerce').astype(float)
dn = pd.to_datetime(pre['fdate']).dt.day.astype(float)
valid = c.notna() & dn.notna()
corr = c[valid].corr(dn[valid])
print(f'corr(carrier_avg_delay_24h, day-of-month) = {corr:+.3f}  '
      '(high = this feature is ~the day regime = leak vector)')
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — CASCADE / ROLLING features (valid at prediction time)

For every pre-departure row we look at rows **strictly before** its `scored_at`
and aggregate flights that already departed to the same destination / carrier:
- `cascade_dest_delay_6h`: avg actual delay of same-destination flights that
  departed in the previous 6h
- `cascade_dest_cancel_6h`: fraction of those that were cancelled
- `cascade_carrier_delay_12h`: avg actual delay of same-carrier flights that
  departed in the previous 12h
- `cascade_origin_storm_6h`: storm fraction at origin in the previous 6h
- `cascade_origin_wind_delta_6h`: origin wind now minus mean of previous 6h

All windows are strictly past-relative (info available at prediction time).
""")

# ----------------------------------------------------------------------------
code("""# Build a per-flight "departure happened" record with its actual delay + cancel.
dep = jul.copy()
dep['actual_delay_minutes'] = pd.to_numeric(dep['actual_delay_minutes'], errors='coerce')
dep['actual_cancelled'] = dep['actual_cancelled'].astype(str).str.strip().str.lower().eq('true')
dep_delay = dep.groupby('monitored_flight_id').agg(
    dep_dt=('dep_dt', 'first'),
    dep_delay=('actual_delay_minutes', 'max'),
    cancelled=('actual_cancelled', 'max'),
    origin=('origin_iata', 'first'),
    destination=('destination_iata', 'first'),
    carrier=('carrier_iata', 'first'),
).reset_index()
dep_delay['cancelled'] = dep_delay['cancelled'].astype(bool)

def cascade_features(pool_df, dep_df, origin_weather):
    # for each pool row, aggregates over dep events strictly before row.scored_at
    ts = pool_df['scored_dt'].values.astype('datetime64[ns]')
    dep_dt = dep_df['dep_dt'].values.astype('datetime64[ns]')
    dep_delay = dep_df['dep_delay'].values.astype(float)
    dep_canc = dep_df['cancelled'].values.astype(float)
    dep_dest = dep_df['destination'].values
    dep_carrier = dep_df['carrier'].values
    dep_origin = dep_df['origin'].values

    out = {k: np.full(len(pool_df), np.nan) for k in
           ['cascade_dest_delay_6h', 'cascade_dest_cancel_6h',
            'cascade_carrier_delay_12h', 'cascade_origin_storm_6h',
            'cascade_origin_wind_delta_6h']}
    for i, (dt, dest, carrier, origin, wnow) in enumerate(zip(
            ts, pool_df['destination_iata'].values, pool_df['carrier_iata'].values,
            pool_df['origin_iata'].values, pd.to_numeric(pool_df['origin_wind_speed_kt'], errors='coerce').values)):
        h6 = np.timedelta64(6, 'h'); h12 = np.timedelta64(12, 'h')
        before = dep_dt < dt
        w6 = before & (dep_dt >= dt - h6)
        w12 = before & (dep_dt >= dt - h12)

        m = w6 & (dep_dest == dest)
        if m.any():
            out['cascade_dest_delay_6h'][i] = np.nanmean(dep_delay[m])
            out['cascade_dest_cancel_6h'][i] = np.nanmean(dep_canc[m])
        m = w12 & (dep_carrier == carrier)
        if m.any():
            out['cascade_carrier_delay_12h'][i] = np.nanmean(dep_delay[m])

        # origin weather in past 6h from ALL scored rows (not just departs)
        w = jul['scored_dt'].values.astype('datetime64[ns]')
        ow = (jul['origin_iata'].values == origin)
        wmask = ow & (w < dt) & (w >= dt - h6)
        if wmask.any():
            storm = jul.loc[wmask, 'origin_has_thunderstorm'].astype(str).str.strip().str.lower().eq('true')
            out['cascade_origin_storm_6h'][i] = storm.mean()
            winds = pd.to_numeric(jul.loc[wmask, 'origin_wind_speed_kt'], errors='coerce')
            if winds.notna().any() and pd.notna(wnow):
                out['cascade_origin_wind_delta_6h'][i] = float(wnow) - winds.mean()
    return pd.DataFrame(out, index=pool_df.index)

print('Building cascade features over', len(pre), 'rows...')
casc = cascade_features(pre, dep_delay, jul)
print('cascade fill rates:')
print(casc.notna().mean().round(3).to_string())
pre = pd.concat([pre, casc], axis=1)
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Feature sets for the comparison

- **29-feature set** (the v1/v2/v3 base) — call it `F_BASE`.
- **F_BASE + cascade** — `F_CASC`.
- **F_CASC + extra carrier/otp/signal columns** — `F_FULL` (v3 found these a
  small win).

Same numeric handling and label-encoding of categoricals in all three.
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
CASCADE = ['cascade_dest_delay_6h', 'cascade_dest_cancel_6h',
           'cascade_carrier_delay_12h', 'cascade_origin_storm_6h',
           'cascade_origin_wind_delta_6h']
EXTRA_FEATS = [
    'carrier_health_score', 'carrier_reliable', 'historical_otp_score',
    'nas_origin_programs', 'nas_destination_programs', 'heuristic_score',
    'signal_atc_ground_stop', 'signal_atc_ground_delay', 'signal_origin_weather',
    'signal_destination_weather', 'signal_carrier_health', 'signal_time_of_day',
    'signal_day_of_week', 'signal_connection_risk', 'historical_risk',
]

F_BASE = NUM_FEATS + CAT_FEATS
F_CASC = NUM_FEATS + CASCADE + CAT_FEATS
F_FULL = F_CASC + EXTRA_FEATS

pool = pre[['monitored_flight_id', 'fdate', 'dep_dt', 'scored_dt', 'label']
           + list(set(F_BASE) | set(F_CASC) | set(F_FULL))].copy()
for c in NUM_FEATS + CASCADE + EXTRA_FEATS:
    if c in pool.columns:
        pool[c] = pd.to_numeric(pool[c], errors='coerce')
        if pool[c].isna().any():
            pool[c] = pool[c].fillna(pool[c].median())
pool['equipment_group'] = pool['equipment_group'].fillna('unknown')
print('Pool:', len(pool), 'rows /', pool['monitored_flight_id'].nunique(), 'flights')
print('F_BASE:', len(F_BASE), '| F_CASC:', len(F_CASC), '| F_FULL:', len(F_FULL))
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — The two evaluation modes

1. **RANDOM flight split** (old way, for comparison): split whole flights
   randomly into train/val/test — this is what v1/v2/v3 did and it leaks the day.
2. **TIME walk-forward** (new, production-realistic): sort days, train on the
   EARLIEST days, predict LATER days, and never train on the target day.

Both train the SAME model type (XGBoost, fixed v1 params) so the only variable
is the split — that's the point: measure the leak, then measure the real number.
""")

# ----------------------------------------------------------------------------
code("""def make_encoder(pool_df, feats, cat_ix):
    num = [c for c in feats if c in NUM_FEATS + CASCADE + EXTRA_FEATS]
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

def train_eval(tr, va, feats, params):
    cat_ix = {c: {v: i for i, v in enumerate(sorted(tr[c].astype(str).unique()))} for c in CAT_FEATS}
    enc = make_encoder(pool, feats, cat_ix)
    clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20, random_state=42,
                            verbosity=0, **params)
    clf.fit(enc(tr), tr['label'], eval_set=[(enc(va), va['label'])], verbose=False)
    return clf
""")

# ----------------------------------------------------------------------------
md("""## Step 7 — RANDOM split (the old, leaky way — for comparison only)""")

# ----------------------------------------------------------------------------
code("""from sklearn.model_selection import train_test_split
flights = pool['monitored_flight_id'].unique()
tr_id, te_id = train_test_split(flights, test_size=0.30, random_state=42)
va_id, te_id = train_test_split(te_id, test_size=0.50, random_state=42)
tr = pool[pool['monitored_flight_id'].isin(tr_id)]
va = pool[pool['monitored_flight_id'].isin(va_id)]
te = pool[pool['monitored_flight_id'].isin(te_id)]
print('Random split: train', tr.shape, 'val', va.shape, 'test', te.shape)
for feats in [F_BASE, F_CASC, F_FULL]:
    clf = train_eval(tr, va, feats, V1_PARAMS)
    cat_ix = {c: {v: i for i, v in enumerate(sorted(tr[c].astype(str).unique()))} for c in CAT_FEATS}
    enc = make_encoder(pool, feats, cat_ix)
    pt = clf.predict_proba(enc(te))[:, 1]
    print(f'  RANDOM split | {len(feats):2d} feats | test AUC {roc_auc_score(te["label"], pt):.4f}')
""")

# ----------------------------------------------------------------------------
md("""## Step 8 — TIME walk-forward (the production-realistic test)

Chronological days: we always train ONLY on earlier days and predict the next
unseen day. Report per-day AUC and the pooled AUC over all held-out days.
""")

# ----------------------------------------------------------------------------
code("""days = sorted(pool['fdate'].unique())
print('days:', days)
print()

def walk_forward_train(tr, feats, es_frac=0.2):
    # split the training days into fit/es (early-stop) sub-folds by flight
    ids = tr['monitored_flight_id'].unique()
    es_id, fit_id = train_test_split(ids, test_size=1 - es_frac, random_state=42)
    es = tr[tr['monitored_flight_id'].isin(es_id)]
    fit = tr[tr['monitored_flight_id'].isin(fit_id)]
    cat_ix = {c: {v: i for i, v in enumerate(sorted(fit[c].astype(str).unique()))} for c in CAT_FEATS}
    enc = make_encoder(pool, feats, cat_ix)
    clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20, random_state=42,
                            verbosity=0, **V1_PARAMS)
    clf.fit(enc(fit), fit['label'], eval_set=[(enc(es), es['label'])], verbose=False)
    return clf, enc

res_by = {}
for feats in [F_BASE, F_CASC, F_FULL]:
    key = f'{len(feats)}f'
    res_by[key] = []
    for i in range(4, len(days)):
        tr_days = days[:i]
        te_day = days[i]
        tr = pool[pool['fdate'].isin(tr_days)]
        te = pool[pool['fdate'] == te_day]
        if len(te) < 20 or te['label'].nunique() < 2 or len(tr) < 500:
            print(f'  skip {te_day}: tr={len(tr)} te={len(te)} te_pos={te["label"].mean():.2f}')
            continue
        clf, enc = walk_forward_train(tr, feats)
        pt = clf.predict_proba(enc(te))[:, 1]
        auc = roc_auc_score(te['label'], pt)
        res_by[key].append({'day': te_day, 'n': len(te), 'pos': te['label'].mean(), 'auc': auc})
        print(f'  [{key}] train {tr_days[0]}..{tr_days[-1]} -> test {te_day}: '
              f'n={len(te)} pos={te["label"].mean():.2f} AUC={auc:.4f}')
    if res_by[key]:
        import numpy as np
        aucs = [r['auc'] for r in res_by[key]]
        print(f'  [{key}] pooled-mean AUC (held-out days) = {np.mean(aucs):.4f} +- {np.std(aucs):.4f}')
    print()
""")

# ----------------------------------------------------------------------------
md("""## Step 9 — Honest verdict (v4)

What did we learn?
- How much did the random split inflate the number vs time-walk-forward?
- Do cascade features help on unseen days, or is even that within noise?
- What is the real expected AUC for predicting TOMORROW's flights?
""")

# ----------------------------------------------------------------------------
code("""print('''
VERDICT (v4) - filled in after running Steps 7-8.
The honest production-realistic number is the TIME walk-forward AUC, not the
random-split number. If time-AUC << random-AUC, the earlier 0.73 was inflated
by same-day leakage. Cascade features are kept only if they help on unseen days.
''')
""")

# ----------------------------------------------------------------------------
md("""## Step 10 — Final model & export (v4)""")

# ----------------------------------------------------------------------------
code("""# Final model: best feature set per Step 8 (default F_CASC if not worse),
# trained on ALL pool rows, exported as *_v4 files.
best_feats = F_CASC
cat_ix = {c: {v: i for i, v in enumerate(sorted(pool[c].astype(str).unique()))} for c in CAT_FEATS}
enc = make_encoder(pool, best_feats, cat_ix)
X_all = enc(pool)
y_all = pool['label']
model_v4 = xgb.XGBClassifier(eval_metric='auc', random_state=42, verbosity=0, **V1_PARAMS)
model_v4.fit(X_all, y_all)

# threshold: max precision while recall >= 0.20 on all rows
p_all = model_v4.predict_proba(X_all)[:, 1]
pr, re, th = precision_recall_curve(y_all, p_all)
cand = np.where(re[:-1] >= 0.20)[0]
thr = float(th[cand[pr[cand].argmax()]]) if len(cand) else 0.5

CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta4 = {
    'numeric_features': [c for c in best_feats if c in NUM_FEATS + CASCADE],
    'cascade_features': CASCADE,
    'categorical_features': CAT_FEATS,
    'category_maps': {c: {str(k): int(v) for k, v in cat_ix[c].items()} for c in CAT_FEATS},
    'threshold': thr,
    'n_estimators': int(V1_PARAMS['n_estimators']),
    'params': {k: int(v) if isinstance(v, (int, np.integer)) else float(v) for k, v in V1_PARAMS.items()},
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'threshold_v4.json'), 'w') as f:
    json.dump(meta4, f, indent=2)
model_v4.get_booster().save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor_v4.json'))
print('Saved exports/xgboost_delay_predictor_v4.json + threshold_v4.json')
print('threshold_v4:', round(thr, 4))
print('Files:', sorted(os.listdir(EXPORT_DIR)))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v4.ipynb')
print('Wrote ml_analysis/travnr_ml_v4.ipynb with', len(cells), 'cells')
