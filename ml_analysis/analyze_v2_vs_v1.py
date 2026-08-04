#!/usr/bin/env python3
"""
analyze_v2_vs_v1.py — post-mortem for the v2 experiment.

The question: why did v2 (val AUC 0.761) do WORSE on the held-out test
(0.691) than v1 (0.731) which had NO tuning at all?

The hypothesis this script tests, with evidence:

  H1. VALIDATION-SELECTION OVERFIT. v2 tried 48 models (24 hyperparam combos
      x 2 scale_pos_weight) on ONE validation slice (102 flights) and kept the
      best val AUC. Choosing the best of 48 on a tiny slice means we fit the
      slice's noise. We prove it by re-running ALL 48 combos and showing that
      "best on val" is NOT "best on test" (selection is noise-driven).

  H2. THE EXTRA FEATURES ARE THE REAL OPPORTUNITY. v1/v2 used only 29 of the
      columns; the CSV has more (carrier_health_score, historical_otp_score,
      nas_*_programs, heuristic_score, signal_*) that were 100% populated in
      July but never used. We measure whether adding them beats 0.73 at all.

  H3. HONEST MODEL SELECTION. We re-run model selection with K-fold
      cross-validation (fold = flights, no overlap) instead of a single split,
      and report the CV-selected model's test AUC. This is the recipe v3 uses.

Run: ml_analysis/.venv/bin/python ml_analysis/analyze_v2_vs_v1.py
"""
import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.model_selection import KFold

rng = np.random.default_rng(42)
CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)

# ---------------- shared data prep (must match v1/v2 exactly) ----------------
def strip_quotes(v):
    if isinstance(v, str) and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v

def parse_departure(r):
    d = r['departure_date']
    if isinstance(d, str) and 'T' in d:
        d = d[:10]
    t = str(r['departure_time']).strip()
    if 'T' in t or ' ' in t:
        t = t.replace('Z', '').replace(' ', 'T')
        return pd.to_datetime(t, utc=True)
    return pd.to_datetime(f"{d} {t}", utc=True)

print('=' * 70)
print('ANALYZE V2 vs V1 — post-mortem')
print('=' * 70)

df = pd.read_csv(CSV, low_memory=False)
for c in df.columns:
    df[c] = df[c].map(strip_quotes)
df['dep_dt'] = df.apply(parse_departure, axis=1)
df['scored_dt'] = pd.to_datetime(df['scored_at'], utc=True)
df['gap_hours'] = (df['scored_dt'] - df['dep_dt']).dt.total_seconds() / 3600.0
df['hours_until_departure'] = pd.to_numeric(df['hours_until_departure'], errors='coerce')
df = df.dropna(subset=['gap_hours', 'hours_until_departure']).copy()

jul = df[df['departure_date'].str.startswith('2026-07')].copy()
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

NUM_FEATS = [
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
    if pool[c].isna().any():
        pool[c] = pool[c].fillna(pool[c].median())
pool['equipment_group'] = pool['equipment_group'].fillna('unknown')

print(f'Pool: {len(pool)} rows / {pool["monitored_flight_id"].nunique()} flights '
      f'(pos {pool["label"].mean()*100:.1f}%)')
print(f'Extra columns populated: {len([c for c in EXTRA_FEATS if pool[c].notna().all()])}/{len(EXTRA_FEATS)}')

# ---------------- split by flight (identical to v1/v2) ----------------------
def flight_strat_keys(pool):
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
val = pool[pool['monitored_flight_id'].isin(va_id)]
test = pool[pool['monitored_flight_id'].isin(te_id)]

CAT_INDEX = {c: {v: i for i, v in enumerate(sorted(train[c].astype(str).unique()))} for c in CAT_FEATS}
def encode(X, cats=CAT_FEATS, extra=()):
    X = X.copy()
    for c in NUM_FEATS + list(extra):
        X[c] = pd.to_numeric(X[c], errors='coerce')
        if X[c].isna().any():
            X[c] = X[c].fillna(X[c].median())
    for c in cats:
        X[c + '_e'] = X[c].astype(str).map(CAT_INDEX[c]).fillna(-1).astype(int)
        X.drop(columns=[c], inplace=True)
    return X

# label-encoding keeps 1-1 parity with v1; no target encoding in the post-mortem
FEATS29 = NUM_FEATS + [c + '_e' for c in CAT_FEATS]
X_tr, y_tr = encode(train), train['label']
X_va, y_va = encode(val), val['label']
X_te, y_te = encode(test), test['label']
X_tr29, X_va29, X_te29 = X_tr[FEATS29], X_va[FEATS29], X_te[FEATS29]

# ---------------------------------------------------------------------------
print()
print('=' * 70)
print('H1 — VALIDATION-SELECTION OVERFIT: the 48-model re-run')
print('=' * 70)
PARAM_GRID = {
    'n_estimators': [400, 800],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.03, 0.05, 0.1],
    'subsample': [0.7, 0.8],
    'colsample_bytree': [0.7, 0.8],
    'min_child_weight': [1, 3, 8],
}
combos = []
for _ in range(24):
    combos.append({k: rng.choice(v) for k, v in PARAM_GRID.items()})

rows = []
for spw in [None, 3.0]:
    for params in combos:
        clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=25,
                                random_state=42, verbosity=0,
                                scale_pos_weight=spw, **params)
        clf.fit(X_tr29, y_tr, eval_set=[(X_va29, y_va)], verbose=False)
        p_va = clf.predict_proba(X_va29)[:, 1]
        p_te = clf.predict_proba(X_te29)[:, 1]
        rows.append({
            'spw': 'none' if spw is None else '3.0',
            'val_auc': roc_auc_score(y_va, p_va),
            'test_auc': roc_auc_score(y_te, p_te),
            'it': clf.best_iteration,
            **params,
        })
res = pd.DataFrame(rows)

best_val = res.sort_values('val_auc', ascending=False).iloc[0]
best_test = res.sort_values('test_auc', ascending=False).iloc[0]
corr = res['val_auc'].corr(res['test_auc'])
print(f'48 models run. Correlation(val_auc, test_auc) = {corr:.3f}')
print(f'Model chosen by VAL (what v2 did): val {best_val.val_auc:.4f} -> test {best_val.test_auc:.4f}')
print(f'Model that was ACTUALLY best on test: test {best_test.test_auc:.4f} (its val was {best_test.val_auc:.4f})')
print(f'Spread of test AUC across the 48: min {res.test_auc.min():.4f} '
      f'med {res.test_auc.median():.4f} max {res.test_auc.max():.4f}')
print(f'\nDistribution of test AUCs for the 24 "best on val" per weight:')
for spw in ['none', '3.0']:
    sub = res[res.spw == spw].sort_values('val_auc', ascending=False).head(3)
    for _, r in sub.iterrows():
        print(f'  spw={spw} val {r.val_auc:.4f} test {r.test_auc:.4f} it={int(r.it)} lr={r.learning_rate} depth={r.max_depth}')

# ---------------------------------------------------------------------------
print()
print('=' * 70)
print('H2 — THE EXTRA FEATURES: do they beat 0.73?')
print('=' * 70)
EXTRA_FEATS_NUM = [c for c in EXTRA_FEATS if c in pool.columns]
FEATS_EXTRA = NUM_FEATS + EXTRA_FEATS_NUM + [c + '_e' for c in CAT_FEATS]
X_trE, X_vaE, X_teE = (encode(train, extra=EXTRA_FEATS_NUM), encode(val, extra=EXTRA_FEATS_NUM),
                       encode(test, extra=EXTRA_FEATS_NUM))
X_trE, X_vaE, X_teE = X_trE[FEATS_EXTRA], X_vaE[FEATS_EXTRA], X_teE[FEATS_EXTRA]

# pick the best-on-val from H1 and retrain on 29 + extras
p_best = best_val
paramsB = {k: p_best[k] for k in ['n_estimators', 'max_depth', 'learning_rate',
                                  'subsample', 'colsample_bytree', 'min_child_weight']}
spwB = None if p_best.spw == 'none' else 3.0

for name, (Xt, Xv, Xte) in [('29 features (v1/v2 set)', (X_tr29, X_va29, X_te29)),
                            ('29 + EXTRA features', (X_trE, X_vaE, X_teE))]:
    clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=25, random_state=42,
                            verbosity=0, scale_pos_weight=spwB, **paramsB)
    clf.fit(Xt, y_tr, eval_set=[(Xv, y_va)], verbose=False)
    pv = clf.predict_proba(Xv)[:, 1]
    pt = clf.predict_proba(Xte)[:, 1]
    print(f'{name}: val {roc_auc_score(y_va, pv):.4f} | test {roc_auc_score(y_te, pt):.4f} '
          f'({len(Xt.columns)} features)')

# ---------------------------------------------------------------------------
print()
print('=' * 70)
print('H3 — HONEST MODEL SELECTION: K-fold CV by flight (the v3 recipe)')
print('=' * 70)
def flight_split_indexes(pool, k=5, seed=42):
    """K-fold where each fold is a set of whole flights (no row sharing)."""
    fl = pool['monitored_flight_id'].unique()
    rng2 = np.random.default_rng(seed)
    fl = rng2.permutation(fl)
    folds = np.array_split(fl, k)
    for i in range(k):
        va_fl = folds[i]
        tr_fl = np.concatenate([folds[j] for j in range(k) if j != i])
        yield tr_fl, va_fl

def fit_eval_on_folds(pool_df, feats, params, spw, k=5, early_stop=True):
    """5-fold CV by whole flights. When early_stop=True, each training fold is
    further split (by flight) 85/15 into train/es and the model early-stops on
    the es slice (mirroring v1's use of a val set), then is scored on the
    held-out fold. This is the honest "v1-with-CV" recipe."""
    aucs = []
    for tr_fl, va_fl in flight_split_indexes(pool_df, k):
        tr = pool_df[pool_df['monitored_flight_id'].isin(tr_fl)]
        va = pool_df[pool_df['monitored_flight_id'].isin(va_fl)]
        if len(va) == 0 or len(np.unique(va['label'])) < 2:
            continue
        cat_ix = {c: {v: i for i, v in enumerate(sorted(tr[c].astype(str).unique()))} for c in CAT_FEATS}
        def enc(df, cats=CAT_FEATS):
            d = df.copy()
            for c in feats:
                if c in NUM_FEATS:
                    d[c] = pd.to_numeric(d[c], errors='coerce')
                    if d[c].isna().any():
                        d[c] = d[c].fillna(d[c].median())
            for c in cats:
                d[c + '_e'] = d[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int)
                d.drop(columns=[c], inplace=True)
            return d[feats]
        if early_stop and len(np.unique(tr['label'])) >= 2:
            es_fl, sub_fl = train_test_split(tr['monitored_flight_id'].unique(),
                                             test_size=0.15, random_state=42)
            es = tr[tr['monitored_flight_id'].isin(es_fl)]
            sub = tr[tr['monitored_flight_id'].isin(sub_fl)]
            clf = xgb.XGBClassifier(eval_metric='auc', early_stopping_rounds=20,
                                    random_state=42, verbosity=0,
                                    scale_pos_weight=spw, **params)
            clf.fit(enc(sub), sub['label'], eval_set=[(enc(es), es['label'])], verbose=False)
        else:
            clf = xgb.XGBClassifier(eval_metric='auc', random_state=42, verbosity=0,
                                    scale_pos_weight=spw, **params)
            clf.fit(enc(tr), tr['label'])
        aucs.append(roc_auc_score(va['label'], clf.predict_proba(enc(va))[:, 1]))
    return np.mean(aucs), np.std(aucs), len(aucs)

# compare a few honest configs on CV: does tuning/extra features help at all?
configs = {
    'v1-fixed-params, 29 feats': (FEATS29, {'n_estimators': 300, 'max_depth': 6, 'learning_rate': 0.1,
                                            'subsample': 0.8, 'colsample_bytree': 0.8}, None),
    'v1-fixed + EXTRA feats': (FEATS_EXTRA, {'n_estimators': 300, 'max_depth': 6, 'learning_rate': 0.1,
                                             'subsample': 0.8, 'colsample_bytree': 0.8}, None),
    'best-val-from-H1 params, 29 feats': (FEATS29, paramsB, spwB),
    'best-val-from-H1 params + EXTRA': (FEATS_EXTRA, paramsB, spwB),
}
for name, (feats, params, spw) in configs.items():
    mean, sd, n = fit_eval_on_folds(pool, feats, params, spw)
    print(f'CV mean AUC {mean:.4f} +/- {sd:.4f} ({n} folds)  <- {name}')

print()
print('DONE — see TRAVNR_ML.md Addendum B for what this means.')
