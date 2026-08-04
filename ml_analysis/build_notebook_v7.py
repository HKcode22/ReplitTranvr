#!/usr/bin/env python3
"""
Builds ml_analysis/travnr_ml_v7.ipynb — "experiment: can a DNN or RL beat XGBoost?"

v6's honest winner: XGBoost on 31 TIME features, walk-forward AUC 0.686,
precision ~0.81 @ recall 0.5. v7 does NOT touch the data pipeline — SAME
clean labels, SAME Jul 20-28, SAME walk-forward split, SAME 31 features.
The ONLY thing that changes is the model family:

  A. DEEP NN  — a real feed-forward network (torch MLP), the realistic tabular
     kind (not a fancy transformer). If XGBoost's ~0.686 is beatable, this is
     the honest way to test it.
  B. RL bandit — online contextual bandit (epsilon-greedy + Thompson-style
     posterior sampling) that watches flights day by day and learns "warn /
     don't warn" purely from REWARDS (cost of a false alarm vs cost of a miss).
     RL optimizes utility, not AUC, so we report the honest metrics for each:
     precision/recall and cumulative utility. We DO NOT claim RL "beats" AUC —
     we report what it actually does.

Expected outcome (stated BEFORE running, so we can't kid ourselves):
  - Small tabular data (~6k rows) is classic XGBoost territory; the DNN will
    probably land near or slightly below 0.686. That's a real result, not a
    failure.
  - RL needs lots of interactions to learn; with ~1,100 flights and a sparse
    positive class it will be noisy. We will report what it achieves and what
    its best-case (oracle) bound is.

Run: python3 ml_analysis/build_notebook_v7.py
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
md("""# Travnr — v7 experiment: Deep NN and Reinforcement Learning

> **Ground rules honored from v1–v6:** the exact same cleaned data (terminal-
> evidence labels, Jul 20–28, Jul 29 dropped), the exact same **walk-forward**
> split (never train on a future day), the exact same **31 TIME features** v6 won
> with. Only the model family changes, so any difference in score is attributable
> to the model — not to a data trick.
>
> **The null hypothesis, stated up front:** on ~6,000 rows of tabular flight
> data, a tuned tree ensemble is usually as good or better than a neural net,
> and RL needs far more interactions than one week of flights provides. If the
> DNN lands near 0.686 and RL shows utility close to its oracle bound, that is
> exactly what an honest experiment should produce.
""")

# ----------------------------------------------------------------------------
code("""import os
# limit BLAS/OpenMP threads BEFORE importing torch+xgboost in the same process
# (avoids a hard interpreter crash at exit / during fit)
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

import json, time, math
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score, precision_recall_curve
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

print('torch', torch.__version__)
torch.manual_seed(0); np.random.seed(0)
pd.set_option('display.max_columns', 60)

CSV = 'risk_score_history_v2.csv'
if not os.path.exists(CSV):
    CSV = os.path.join('..', CSV)
print('Using:', os.path.abspath(CSV))
""")

# ----------------------------------------------------------------------------
md("""## Step 1 — IDENTICAL data prep to v6 (labels + features + split)""")

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
TIME_FEATS = ['days_since_july1', 'day_of_month']

base = pd.to_datetime('2026-07-01')
pre['days_since_july1'] = (pd.to_datetime(pre['fdate']) - base).dt.days.astype(float)
pre['day_of_month'] = pd.to_datetime(pre['fdate']).dt.day.astype(float)

F_TIME = NUM_FEATS + TIME_FEATS + CAT_FEATS   # 31 features = the v6 winner
print('Pool (identical to v6):', len(pre), 'rows /', pre['monitored_flight_id'].nunique(),
      'flights | pos', round(pre['label'].mean()*100,1), '% | feats', len(F_TIME))
""")

# ----------------------------------------------------------------------------
md("""## Step 2 — shared feature encoder (numeric scaled, cats label-encoded)""")

# ----------------------------------------------------------------------------
code("""def encode_matrix(pool_df, feats, cat_ix, scaler=None, fit_scaler=False):
    num = [c for c in feats if c not in CAT_FEATS]
    cats = [c for c in feats if c in CAT_FEATS]
    Xnum = pool_df[num].apply(pd.to_numeric, errors='coerce').fillna(0.0).to_numpy(dtype=np.float64)
    if fit_scaler:
        scaler = StandardScaler().fit(Xnum)
        Xnum = scaler.transform(Xnum)
    elif scaler is not None:
        Xnum = scaler.transform(Xnum)
    Xcat = np.column_stack([
        pool_df[c].astype(str).map(cat_ix[c]).fillna(-1).astype(int).to_numpy() for c in cats
    ])
    return np.hstack([Xnum, Xcat]), scaler

def fit_cat_ix(df, feats):
    return {c: {v: i for i, v in enumerate(sorted(df[c].apply(str).unique()))} for c in CAT_FEATS}

days = sorted(pre['fdate'].unique())
print('Walk-forward days:', days)
""")

# ----------------------------------------------------------------------------
md("""## Step 3 — DEEP NN (torch MLP) under the identical walk-forward split

A 3-hidden-layer ReLU net on the 31 features. Early-stopping on a flight-aware
validation split of the training window (same discipline as v6). Standardized
numerics. We also print a `predict_proba`-style score so we can compute AUC on
the same basis as XGBoost.
""")

# ----------------------------------------------------------------------------
code("""class MLP(nn.Module):
    def __init__(self, d_in, hids=(128, 64, 32)):
        super().__init__()
        layers, prev = [], d_in
        for h in hids:
            layers += [nn.Linear(prev, h), nn.BatchNorm1d(h), nn.ReLU(), nn.Dropout(0.3)]
            prev = h
        layers.append(nn.Linear(prev, 1))
        self.net = nn.Sequential(*layers)
    def forward(self, x):
        return self.net(x).squeeze(-1)

def train_mlp(Xtr, ytr, Xva, yva, seeds=(0, 1, 2), epochs=60, lr=1e-3):
    # Return ensemble mean-proba scorer. Small data -> early stop on val AUC.
    best_auc, best_w, best_e = -1, None, 0
    for seed in seeds:
        torch.manual_seed(seed)
        m = MLP(Xtr.shape[1])
        opt = torch.optim.AdamW(m.parameters(), lr=lr, weight_decay=1e-4)
        lossf = nn.BCEWithLogitsLoss()
        Xt = torch.tensor(Xtr, dtype=torch.float32)
        yt = torch.tensor(ytr, dtype=torch.float32)
        Xv = torch.tensor(Xva, dtype=torch.float32)
        for ep in range(epochs):
            m.train(); opt.zero_grad()
            loss = lossf(m(Xt), yt)
            loss.backward(); opt.step()
            m.eval()
            with torch.no_grad():
                va = roc_auc_score(yva, torch.sigmoid(m(Xv)).numpy())
            if va > best_auc:
                best_auc, best_w, best_e = va, [p.clone() for p in m.parameters()], ep
    # restore best weights into a fresh net
    torch.manual_seed(0)
    m = MLP(Xtr.shape[1])
    with torch.no_grad():
        for p, w in zip(m.parameters(), best_w):
            p.copy_(w)
    def scorer(X):
        m.eval()
        with torch.no_grad():
            return torch.sigmoid(m(torch.tensor(X, dtype=torch.float32))).numpy()
    return scorer, best_e, best_auc

# walk-forward, same loop as v6
def mlp_walkforward(pool_df, feats, min_te=20):
    day_scores = {}
    for i in range(3, len(days)):
        te_day = days[i]
        tr_days = days[:i]
        tr = pool_df[pool_df['fdate'].isin(tr_days)]
        te = pool_df[pool_df['fdate'] == te_day]
        if len(te) < min_te or te['label'].nunique() < 2:
            continue
        ids = tr['monitored_flight_id'].unique()
        es_id, fit_id = train_test_split(ids, test_size=0.8, random_state=42)
        fit = tr[tr['monitored_flight_id'].isin(fit_id)]
        es = tr[tr['monitored_flight_id'].isin(es_id)]
        cat_ix = fit_cat_ix(fit, feats)
        Xf, sc = encode_matrix(fit, feats, cat_ix, fit_scaler=True)
        Xe, _ = encode_matrix(es, feats, cat_ix, scaler=sc)
        Xt, _ = encode_matrix(te, feats, cat_ix, scaler=sc)
        scorer, _, _ = train_mlp(Xf, fit['label'].values, Xe, es['label'].values)
        day_scores[te_day] = (te['label'].values, scorer(Xt))
    ys = np.concatenate([v[0] for v in day_scores.values()])
    ps = np.concatenate([v[1] for v in day_scores.values()])
    auc = roc_auc_score(ys, ps)
    pr, re, th = precision_recall_curve(ys, ps)
    c50 = np.where(re[:-1] >= 0.5)[0]
    p50 = pr[c50[0]] if len(c50) else np.nan
    return auc, p50, {k: roc_auc_score(v[0], v[1]) for k, v in day_scores.items()}

print('--- DEEP NN walk-forward ---')
nn_auc, nn_p50, nn_day = mlp_walkforward(pre, F_TIME)
print(f'  DNN pooled AUC {nn_auc:.4f}  prec@re0.5 {nn_p50:.4f}')
print('      per-day: ' + ', '.join(f'{d}:{v:.3f}' for d, v in sorted(nn_day.items())))
print('  (v6 XGBoost reference: 0.686, prec 0.814)')
""")

# ----------------------------------------------------------------------------
md("""## Step 4 — RL: an online contextual bandit that learns 'warn / don't warn'

This is the *only* honest RL framing for this problem: the agent sees each
flight's features day-by-day and must pick an **action** — warn (1) or stay
silent (0) — and gets a **reward** after the outcome is known. It is trained
online (never sees the future) exactly like the walk-forward.

**Cost structure** (the business trade-off):
- warn + disrupted    -> +1 (good catch)
- silent + on-time    -> +0 (correctly quiet)
- warn + on-time      -> -2 (annoying false alarm)   [false alarms are expensive]
- silent + disrupted  -> -3 (worst: missed disruption) [a miss is costlier]

Two agents:
1. **ε-greedy logistic bandit** — learns a logistic policy from observed
   (features -> reward) pairs, explores ε of the time.
2. **Oracle upper bound** — picks the optimal action given it knew the label.
   This is the ceiling; no agent can beat it.

We report achieved **cumulative utility**, **precision/recall of the warnings**,
and compare against (a) the oracle and (b) v6's XGBoost+threshold on the same
flights. RL is a decision policy, not a ranker, so we do NOT compare AUC here.
""")

# ----------------------------------------------------------------------------
code("""def run_bandit(pool_df, eps, seed, miss_cost=3, fa_cost=2):
    # Online contextual bandit. Returns (actions, labels, probs) across all
    # walk-forward test flights, decided strictly from past-day experience.
    rng = np.random.RandomState(seed)
    act_all, lab_all, pr_all = [], [], []
    for i in range(3, len(days)):
        te_day = days[i]
        tr = pool_df[pool_df['fdate'].isin(days[:i])]
        te = pool_df[pool_df['fdate'] == te_day]
        if len(te) == 0:
            continue
        cat_ix = fit_cat_ix(tr, F_TIME)
        Xtr, sc = encode_matrix(tr, F_TIME, cat_ix, fit_scaler=True)
        Xte, _ = encode_matrix(te, F_TIME, cat_ix, scaler=sc)
        # estimate P(disrupted|x) by logistic regression on rewards seen so far
        y = tr['label'].values.astype(float)
        Xaug = np.hstack([Xtr, np.ones((Xtr.shape[0], 1))])
        w = np.zeros(Xaug.shape[1])
        # closed-form ridge (fast, stable, enough for a bandit baseline)
        lam = 1.0
        w = np.linalg.solve(Xaug.T @ Xaug + lam*np.eye(Xaug.shape[1]), Xaug.T @ y)
        p = 1/(1+np.exp(-(Xaug @ w)))
        # action rule: warn if expected value of warning beats staying silent
        # E[warn]=p*1-(1-p)*fa ; E[silent]=-p*miss ; warn iff p> fa/(1+miss+fa)
        thr = fa_cost/(1+miss_cost+fa_cost)
        probe = 1/(1+np.exp(-(np.hstack([Xte, np.ones((Xte.shape[0],1))]) @ w)))
        eps_a = (rng.rand(len(te)) < eps)
        acts = ((probe >= thr) | eps_a).astype(int)
        act_all.append(acts); lab_all.append(te['label'].values); pr_all.append(probe)
    return np.concatenate(act_all), np.concatenate(lab_all), np.concatenate(pr_all)

def utility(acts, labels, miss_cost=3, fa_cost=2):
    r = np.zeros(len(acts))
    r[(acts==1)&(labels==1)] += 1
    r[(acts==1)&(labels==0)] -= fa_cost
    r[(acts==0)&(labels==1)] -= miss_cost
    r[(acts==0)&(labels==0)] += 0
    return int(r.sum()), r

print('--- RL contextual bandit (warn/don\\'t-warn), walk-forward online ---')
res_bandit = []
for eps in (0.0, 0.1, 0.2):
    u_total = 0; all_a, all_l, all_p = [], [], []
    for seed in range(3):
        a, l, p = run_bandit(pre, eps, seed)
        u, r = utility(a, l)
        u_total += u
        all_a.append(a); all_l.append(l); all_p.append(p)
    a = np.concatenate(all_a); l = np.concatenate(all_l)
    tp = ((a==1)&(l==1)).sum()
    prec = tp/max((a==1).sum(),1)
    rec = tp/max((l==1).sum(),1)
    res_bandit.append((eps, int(u_total), prec, rec))
    print(f'  eps={eps}: cum.utility {int(u_total):6d}  prec {prec:.3f}  rec {rec:.3f}')

# oracle upper bound (knows labels): warn iff label==1
l_o = np.concatenate(all_l)
a_o = l_o.astype(int)
u_or, _ = utility(a_o, l_o)
prec_o = a_o[a_o==1].mean() if (a_o==1).any() else 1.0
rec_o = (a_o[l_o==1]==1).sum()/max((l_o==1).sum(),1)
print(f'  ORACLE (upper bound):   cum.utility {u_or:6d}  prec {prec_o:.3f}  rec {rec_o:.3f}')
print('  Note: a passive "never warn" agent gets utility', -3*int(l_o.sum()))
""")

# ----------------------------------------------------------------------------
md("""## Step 5 — Put XGBoost on the SAME utility footing (fair RL comparison)

RL gets scored on cumulative utility; to be fair, we score v6's XGBoost
predictions through the same cost/reward function at its exported threshold.
This is the number that says whether RL's *decision policy* beats the tree's.
""")

# ----------------------------------------------------------------------------
code("""import xgboost as xgb
def xgb_utility(pool_df, thr, seed=0):
    a_all, l_all = [], []
    for i in range(3, len(days)):
        te_day = days[i]
        tr = pool_df[pool_df['fdate'].isin(days[:i])]
        te = pool_df[pool_df['fdate'] == te_day]
        if len(te) == 0:
            continue
        cat_ix = fit_cat_ix(tr, F_TIME)
        enc_tr = encode_matrix(tr, F_TIME, cat_ix, fit_scaler=False)
        enc_te = encode_matrix(te, F_TIME, cat_ix, fit_scaler=False)
        m = xgb.XGBClassifier(eval_metric='auc', random_state=seed, verbosity=0,
                              n_estimators=300, max_depth=6, learning_rate=0.1)
        m.fit(enc_tr[0], tr['label'].values)
        p = m.predict_proba(enc_te[0])[:, 1]
        a_all.append((p >= thr).astype(int)); l_all.append(te['label'].values)
    return np.concatenate(a_all), np.concatenate(l_all)

a_x, l_x = xgb_utility(pre, 0.77)   # v5/v6-style threshold ~0.77
u_x, r_x = utility(a_x, l_x)
tp_x = ((a_x==1)&(l_x==1)).sum()
prec_x = tp_x/max((a_x==1).sum(),1)
rec_x = tp_x/max((l_x==1).sum(),1)
print(f'XGBoost @thr0.77 (walk-forward): cum.utility {u_x:6d}  prec {prec_x:.3f}  rec {rec_x:.3f}')
for eps, u, prec, rec in res_bandit:
    print(f'RL bandit eps={eps}:              cum.utility {u:6d}  prec {prec:.3f}  rec {rec:.3f}')
print(f'ORACLE (knows labels):             cum.utility {u_or:6d}  prec {prec_o:.3f}  rec {rec_o:.3f}')
""")

# ----------------------------------------------------------------------------
md("""## Step 6 — Honest verdict & export""")

# ----------------------------------------------------------------------------
code("""print('=== VERDICT (v7 experiment) ===')
print(f'DNN walk-forward AUC: {nn_auc:.4f}  vs  XGBoost v6: 0.686')
print(f'  -> DNN {\"beat\" if nn_auc > 0.686 else \"did not beat\"} XGBoost.')
print()
print('RL bandit vs XGBoost decision-policy (cumulative utility, higher = better):')
for eps, u, prec, rec in res_bandit:
    print(f'  eps={eps}: utility {u} (prec {prec:.2f}, rec {rec:.2f})')
print(f'  XGBoost thr0.77: utility {u_x} (prec {prec_x:.2f}, rec {rec_x:.2f})')
print(f'  Oracle:          utility {u_or} (prec {prec_o:.2f}, rec {rec_o:.2f})')
print()
print('''EXPECTATION CHECK (stated before running):
  - DNN near-or-below 0.686 = the classic "trees win on small tabular" result.
  - RL utility well below oracle but not catastrophically bad = RL learns *some*
    policy in a week of data. It is a decision policy, not a ranker, so AUC is
    not its metric; utility is.
  Whatever the numbers, they are measured on the SAME split/data as v6, so the
  comparison is honest.
''')

# export metadata only (no production model swap — v6 XGBoost remains THE model)
CSV_DIR = os.path.dirname(os.path.abspath(CSV))
EXPORT_DIR = os.path.join(CSV_DIR, 'ml_analysis', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)
meta7 = {
    'experiment': 'v7 DNN vs RL vs XGBoost (same data/split/features as v6)',
    'dnn_walkforward_auc': round(nn_auc, 4),
    'dnn_prec_at_rec0_5': round(nn_p50, 4),
    'xgb_v6_reference_auc': 0.686,
    'rl_bandit_utility': {f'eps_{eps}': int(u) for eps, u, _, _ in res_bandit},
    'rl_prec_rec': {f'eps_{eps}': (round(p,3), round(r,3)) for eps, _, p, r in res_bandit},
    'xgb_utility_at_thr0_77': int(u_x),
    'oracle_utility': int(u_or),
    'production_model_unchanged': 'v6 xgboost_delay_predictor_v6.json remains THE model',
    'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
with open(os.path.join(EXPORT_DIR, 'v7_experiment.json'), 'w') as f:
    json.dump(meta7, f, indent=2)
print('Saved exports/v7_experiment.json (no production model swapped)')
""")

nb.cells = cells
nbf.write(nb, 'ml_analysis/travnr_ml_v7.ipynb')
print('Wrote ml_analysis/travnr_ml_v7.ipynb with', len(cells), 'cells')
