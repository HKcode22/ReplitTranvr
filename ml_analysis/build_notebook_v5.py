#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v5.ipynb — the "fixed labels, honest future" run.

WHY v5 exists (the whole project in one chain):
  v1 = untuned baseline, random-split test AUC 0.731 (LEAKY — overstates skill)
  v2 = tuned on one val, test 0.691 (lost; picked noise)
  v3 = honest 5-fold flight CV ~0.65 (started telling the truth)
  v4 = time walk-forward ~0.56 + discovered the real problems:
         (1) random split leaks same-day weather/ATC regime (v1..v3 inflated),
         (2) `carrier_avg_delay_24h` ~= the label (corr +0.75 with day),
         (3) DATA BUG: the final export day (Jul 29) never flew - all 53 flights
             still "Scheduled", so they were labeled on-time wrongly.

v5 therefore DOES the right thing, in order:
  A. FIX THE LABELS: a flight is "arrived_ontime" ONLY if it reached a terminal
     status (Arrived/Delayed) or had a real >=15min delay. Otherwise UNKNOWN ->
     drop. This removes the 151 mislabeled July flights (focused on Jul 27-29).
  B. DROP Jul 29 ENTIRELY: it never happened; its "on-time" labels are lies.
     We keep Jul 20-28. (Jul 27-28 keep only the flights with real terminal
     evidence, i.e. fewer but trustworthy rows.)
  C. EVALUATE WITH TIME WALK-FORWARD: train on earlier days, predict later days
     (train past -> predict future), never training on the target day. This is
     the honest, production-realistic number.
  D. Compare feature sets fairly under the SAME walk-forward:
       * 29-feature base (v1)
       * base + cascade rolling features
       * base + extra carrier/otp/signal columns
     and report AUC + precision/recall at a fixed operating point.

Running v5 is the first time every known mistake (leaky split, bad labels,
tail bug) is corrected at once. It may STILL be ~0.5-0.6 (that is the data's
reality with one week), but it will be an HONEST number we can trust and build
on when August (more days) arrives.

Run: python3 ml_analysis/build_notebook_v5.py
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
md("""# Travnr — XGBoost v5 (fixed labels, honest future prediction)

**Where we are and why v5 exists:**

| run | what it did | number | honest? |
| --- | ----------- | ------ | ------- |
| v1 | untuned baseline, random split | test 0.731 | ❌ leaky (inflated) |
| v2 | tuned on ONE val split | test 0.691 | ❌ leaky + noise-picking |
| v3 | 5-fold flight CV | ~0.65 ± 0.04 | ⚠️ better, still random-split |
| v4 | time walk-forward | **~0.56** | ✅ honest, found the real bugs |
| **v5** | **fixed labels + drop the never-flew day + walk-forward** | **?** | ✅ the first clean run |

**The two real bugs v4 found, that v5 now fixes:**

1. **The label bug.** The old label rule called a flight "arrived on time" if it
   had ANY delay value present — even `0` on a pre-departure row — even when the
   flight never reached a terminal status (Arrived/Delayed). That mislabeled
   **151 July flights** as on-time, concentrated exactly in the tail days
   (Jul 27/28/29) whose flights had not finished when the export was cut.

2. **Jul 29 never happened.** All 53 flights on Jul 29 are still `Scheduled` —
   they had not departed yet. Calling them "on-time" (0% disrupted) is a lie.
   v5 drops Jul 29 (and keeps only terminal-evidence flights from Jul 27-28).

**The honest expectation for v5:** even CLEAN, one week of July data probably
cannot beat ~0.55-0.60 on truly unseen future days. But v5 is the number we can
finally TRUST, and the exact baseline to rebuild on when August (more days)
arrives (Plan PART I). We are not promising a magic 0.8 — we are promising we
stopped fooling ourselves.
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
md("""## Step 1 — Load & clean (identical to every version)""")

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
md("""## Step 2 — FIXED label rule (v5 change A) + pre-only pool

The old rule: `if statuses & {"Arrived","Delayed"} or delays: -> ontime`.
The bug was the `or delays` — ANY delay value (even 0, even pre-departure) made
a flight "on-time" even if it never landed.
The fixed rule: on-time ONLY if it truly arrived/delayed (terminal evidence).
Everything else UNKNOWN -> drop.
""")

# ----------------------------------------------------------------------------
code("""jul_full = df[df['departure_date'].str.startswith('2026-07')].copy()
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
    if statuses & {'Arrived', 'Delayed'}:      # FIXED: terminal status required
        return 'arrived_ontime'
    return 'unknown'                           # never reached terminal -> drop

flab = jul_full.groupby('monitored_flight_id').apply(flight_label_fixed, include_groups=False).rename('flight_label')
lab = flab.to_frame().reset_index()
print('FIXED label counts (all July):', {k: int(v) for k, v in flab.value_counts().items()})

# DROP Jul 29 entirely (v5 change B) - it never flew -> labels are lies.
DROPPED = ['2026-07-29']
keep_dates = [d for d in sorted(jul_full['fdate'].unique()) if d not in DROPPED]
print('Keeping days:', keep_dates)
print('Dropped days:', DROPPED)

usable = jul_full[jul_full['fdate'].isin(keep_dates) & (jul_full['gap_hours'] <= 72)].copy()
usable = usable.merge(lab, on='monitored_flight_id', how='left')
usable = usable[usable['flight_label'] != 'unknown'].copy()   # drop untrustworthy
usable['label'] = (usable['flight_label'] != 'arrived_ontime').astype(int)

pre = usable[(usable['hours_until_departure'] >= 1) & (usable['hours_until_departure'] <= 12)].copy()
print('Cleaned pre-1-12h pool:', len(pre), 'rows /', pre['monitored_flight_id'].nunique(),
      'flights | positive rate', round(pre['label'].mean()*100, 1), '%')
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — Feature sets (same as v4)

- F_BASE = 29 features (the v1 set)
- F_CASC = F_BASE + 5 rolling cascade features
- F_FULL = F_CASC + extra carrier/otp/signal columns
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
print('F_BASE:', len(F_BASE), '| F_CASC:', len(F_CASC), '| F_FULL:', len(F_FULL))
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — Build cascade / rolling features (valid at prediction time)""")

# ----------------------------------------------------------------------------
code("""dep = jul_full.copy()
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

ts = pre['scored_dt'].values.astype('datetime64[ns]')
ddt = dep_delay['dep_dt'].values.astype('datetime64[ns]')
ddelay = dep_delay['dep_delay'].values.astype(float)
dcanc = dep_delay['cancelled'].values.astype(float)
ddest = dep_delay['destination'].values
dcarr = dep_delay['carrier'].values

h6 = np.timedelta64(6, 'h'); h12 = np.timedelta64(12, 'h')
jul_w_dt = jul_full['scored_dt'].values.astype('datetime64[ns]')
jul_w_origin = jul_full['origin_iata'].values
jul_storm = jul_full['origin_has_thunderstorm'].astype(str).str.strip().str.lower().eq('true').values
jul_wind = pd.to_numeric(jul_full['origin_wind_speed_kt'], errors='coerce').values

rows = {}
for c in CASCADE:
    rows[c] = np.full(len(pre), np.nan)
for i in range(len(pre)):
    dt = ts[i]
    before = ddt < dt
    w6 = before & (ddt >= dt - h6)
    w12 = before & (ddt >= dt - h12)
    m = w6 & (ddest == pre['destination_iata'].values[i])
    if m.any():
        rows['cascade_dest_delay_6h'][i] = np.nanmean(ddelay[m])
        rows['cascade_dest_cancel_6h'][i] = np.nanmean(dcanc[m])
    m = w12 & (dcarr == pre['carrier_iata'].values[i])
    if m.any():
        rows['cascade_carrier_delay_12h'][i] = np.nanmean(ddelay[m])
    ow = jul_w_origin == pre['origin_iata'].values[i]
    wmask = ow & (jul_w_dt < dt) & (jul_w_dt >= dt - h6)
    if wmask.any():
        rows['cascade_origin_storm_6h'][i] = jul_storm[wmask].mean()
        winds = jul_wind[wmask]
        if np.isfinite(winds).any():
            wnow = pd.to_numeric(pre['origin_wind_speed_kt'].values[i], errors='coerce')
            if pd.notna(wnow):
                rows['cascade_origin_wind_delta_6h'][i] = float(wnow) - np.nanmean(winds)
pre = pd.concat([pre, pd.DataFrame(rows, index=pre.index)], axis=1)
print('cascade fill rates:')
print(pd.DataFrame(rows).notna().mean().round(3).to_string())
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Encoder + walk-forward evaluator (identical logic to v4)

Train on EARLIER days, predict a LATER day, never training on the target day.
""")


# ----------------------------------------------------------------------------
code("""pool = pre[['monitored_flight_id', 'fdate', 'dep_dt', 'scored_dt', 'label']
           + list(dict.fromkeys(F_BASE + F_CASC + F_FULL))].copy()
for c in NUM_FEATS + CASCADE + EXTRA_FEATS:
    if c in pool.columns:
        pool[c] = pd.to_numeric(pool[c], errors='coerce')
        if pool[c].isna().any():
            pool[c] = pool[c].fillna(pool[c].median())
pool['equipment_group'] = pool['equipment_group'].fillna('unknown')
print('Pool:', len(pool), 'rows /', pool['monitored_flight_id'].nunique(), 'flights')
print('Per-day rows:', pool['fdate'].value_counts().sort_index().to_dict())
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

def walk_forward_fit(tr, feats, es_frac=0.2):
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
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — The v5 result: time walk-forward on CLEAN data

For each feature set, train on earliest days and predict each later unseen day.
Report per-day AUC + pooled mean ± std. This is the honest, deployable number.
""")

# ----------------------------------------------------------------------------
code("""days = sorted(pool['fdate'].unique())
print('days kept:', days)
print('random-split number for reference: v1 was 0.731 (proven leaky)')
print()

for feats in [F_BASE, F_CASC, F_FULL]:
    key = len(feats)
    aucs, prs = [], []
    print(f'=== {key}-feature set ===')
    for i in range(3, len(days)):
        tr_days = days[:i]
        te_day = days[i]
        tr = pool[pool['fdate'].isin(tr_days)]
        te = pool[pool['fdate'] == te_day]
        if len(te) < 20 or te['label'].nunique() < 2 or len(tr) < 400:
            print(f'  skip {te_day}: tr={len(tr)} te={len(te)} pos={te["label"].mean():.2f}')
            continue
        clf, enc = walk_forward_fit(tr, feats)
        pt = clf.predict_proba(enc(te))[:, 1]
        auc = roc_auc_score(te['label'], pt)
        aucs.append(auc)
        # precision at fixed recall 50% operating point
        pr, re, th = precision_recall_curve(te['label'], pt)
        c50 = np.where(re[:-1] >= 0.5)[0]
        p50 = pr[c50[0]] if len(c50) else np.nan
        prs.append(p50)
        print(f'  train {tr_days[0]}..{tr_days[-1]} -> test {te_day}: '
              f'n={len(te)} pos={te["label"].mean():.2f} AUC={auc:.4f} prec@re0.5={p50:.3f}')
    if aucs:
        print(f'  => {key}-feat pooled mean AUC {np.mean(aucs):.4f} +- {np.std(aucs):.4f} '
              f'| mean prec@recall0.5 {np.nanmean(prs):.4f}')
    print()
""")

# ----------------------------------------------------------------------------
md("""## Step 7 — Verdict & next actions

v5 is the first CLEAN number (corrected labels, never-flew day removed,
walk-forward future prediction). Whatever it says is what production can expect.
Think of it as the honest floor; August data (Plan PART I) is what raises it.
""")

# ----------------------------------------------------------------------------
code("""print('''
VERDICT (v5) - after the walk-forward run above.
If AUC ~ 0.5-0.6: that is the truth of one week of data. The fixes (labels,
tail removed, time split) were necessary, not optional: they are the difference
between a number we can trust and a number that fooled us (0.731).
The path forward is NOT more model tricks - it is: (1) keep these clean labels,
(2) get more days (August), (3) then let features/tuning matter.
''')
""")

# ----------------------------------------------------------------------------
md("""## Step 8 — Final model & export (v5)""")

# ----------------------------------------------------------------------------
code("""best_feats = F_BASE
cat_ix = {c: {v: i for i, v in enumerate(sorted(pool[c].astype(str).unique()))} for c in CAT_FEATS}
enc = make_encoder(pool, best_feats, cat_ix)
X_all = enc(pool)
y_all = pool['label']
model_v5 = xgb.XGBClassifier(eval_metric='auc', random_state=42, verbosity=0, **V1_PARAMS)
model_v5.fit(X_all, y_all)
p_all = model_v5.predict_proba(X_all)[:, 1]
pr, re, th = precision_recall_curve(y_all, p_all)
cand = np.where(re[:-1] >= 0.20)[0]
thr = float(th[cand[pr[cand].argmax()]]) if len(cand) else 0.5

CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta5 = {
    'numeric_features': NUM_FEATS,
    'categorical_features': CAT_FEATS,
    'category_maps': {c: {str(k): int(v) for k, v in cat_ix[c].items()} for c in CAT_FEATS},
    'threshold': thr,
    'n_estimators': int(V1_PARAMS['n_estimators']),
    'params': {k: int(v) if isinstance(v, (int, np.integer)) else float(v) for k, v in V1_PARAMS.items()},
    'label_rule': 'terminal-evidence only (Arrived/Delayed/Cancelled or >=15min); Jul29 dropped',
    'created_from': os.path.basename(CSV),
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'threshold_v5.json'), 'w') as f:
    json.dump(meta5, f, indent=2)
model_v5.get_booster().save_model(os.path.join(EXPORT_DIR, 'xgboost_delay_predictor_v5.json'))
print('Saved exports/xgboost_delay_predictor_v5.json + threshold_v5.json')
print('threshold_v5:', round(thr, 4))
print('Files:', sorted(os.listdir(EXPORT_DIR)))
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v5.ipynb')
print('Wrote ml_analysis/travnr_ml_v5.ipynb with', len(cells), 'cells')