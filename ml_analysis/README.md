# ml_analysis — scripts + notebook

## Files

| File | What it does |
| ---- | ------------ |
| `audit_dataset.py` | Per-column/per-row data quality audit of `risk_score_history_v2.csv` (nulls, constants, quote artifact, label coverage = E.7 numbers). |
| `heuristic_eval.py` | Evaluates the current heuristic vs final outcomes (precision/recall, pre/post). |
| `deepdive_periods.py` | May/June vs July comparison, pre/post departure, feature audit. |
| `travnr_ml_v1.ipynb` | **The ML model (baseline)** — implements Part G of `MLPLAN_UPDATEDDB.md` end-to-end: load → clean → label back-propagation → Option-3 split → XGBoost → threshold tuning → test evaluation vs heuristic → Option-2 ablation → export. |
| `travnr_ml_v2.ipynb` | **Optimization experiment** — mirrors v1's data prep/split exactly but target-encodes categoricals, tunes hyperparams + `scale_pos_weight`. **Verdict: does NOT beat v1 on held-out test (see below), so v1 stays production.** |
| `travnr_ml_v3.ipynb` | **Honest methodology** — same data, but evaluates with 5-fold flight-aware CV (mean ± std) instead of one lucky split. |
| `travnr_ml_v4.ipynb` | **Time-aware run (biggest finding)** — proves the random split leaks each day's weather/ATC regime (v1's 0.731 was inflated); honest walk-forward AUC ≈ **0.56**; tests rolling cascade features (no help with 1 week of data); **discovers the Jul-29 label bug** (all 53 flights still "Scheduled" — export cut off, so they're wrongly labeled on-time). |
| `travnr_ml_v5.ipynb` | **First CLEAN run** — fixes the label rule (on-time requires terminal status), drops the never-flew Jul 29, keeps Jul 20–28, evaluates with time walk-forward. Honest pooled AUC **0.646 ± 0.10** (29-feature base wins; cascade/extra features actually hurt), precision ~0.81 at recall 0.5. **This is the trustworthy baseline.** |
| `travnr_ml_v6.ipynb` | **Raise the honest baseline, no tricks** — same clean data, tests rolling-window (H1), seed-averaging (H2), **TIME features (H3)**, and dropping `carrier_avg_delay_24h` (H4). **TIME feats win: AUC 0.686** (up from v5's 0.646); dropping the ~label feature costs ~nothing (0.658) = safer for August. Exports `*_v6` (31 features, 5-seed ensemble, threshold 0.863). |
| `travnr_ml_v7.ipynb` | **DNN + RL experiment** (same data/split/features as v6, pure curiosity) — deep net got walk-forward AUC **0.547** (did NOT beat XGBoost); an RL contextual bandit optimizing warn/miss utility returned "warn everyone" (utility 2199 vs oracle 4047), revealing that v6's precision-tuned threshold may be too timid given miss cost > false-alarm cost. Production model unchanged. Requires `OMP_NUM_THREADS=1` (torch+xgboost). |
| `analyze_v2_vs_v1.py` | **Post-mortem** — proves why v2 lost (val-selection is noise: corr(val,test)=0.06) and estimates honest expected AUC. Run: `.venv/bin/python ml_analysis/analyze_v2_vs_v1.py`. |
| `exports/` | Output of the notebooks: `xgboost_delay_predictor.json` (booster) + `threshold.json` (features, category maps, threshold) for the server2 Python sidecar. v2-v6 write separate `*_v2`–`*_v6` files; v7 writes only `v7_experiment.json` (no model swap). |

## The hard truth (v4 → v6) — read before the next experiment

1. **July is not stationary.** Disruption rate swings 82–85% (Jul 20–26) →
   37–50% (Jul 27–28) → 0% (Jul 29, which is a label bug). `carrier_avg_delay_24h`
   correlates **+0.75** with the day — it is basically the label.
2. **Random splits were leaking.** Because same-day flights share the day's
   regime, training on some and testing on others inflated every score.
3. **There was a real label bug:** flights were called "on-time" if they had ANY
   delay value (even 0), even when they never reached a terminal status. That
   mislabeled **151 flights** (concentrated in Jul 27–29, which had not finished
   flying). **Fixed in v5 + `audit_dataset.py`** — on-time now requires terminal
   evidence. **Jul 29 was removed** (it never flew).
4. **v5 is the trustworthy baseline:** with clean labels + Jul 20–28 + time
   walk-forward, the 29-feature model scores **0.646 ± 0.10 AUC** and ~0.81
   precision at recall 0.5. Cascade and "extra" features made it WORSE.
5. **v6 improved it for real:** adding the legal TIME features
   (`days_since_july1`, `day_of_month`) + 5-seed averaging → **0.686 AUC**.
   Dropping `carrier_avg_delay_24h` costs ~nothing (0.658) → the model does not
   lean on the ~label feature, which is safer for August. Rolling window was
   mixed (not adopted). Caveat: TIME features partly encode "this month's
   trend" — must be re-validated on August before trusting.
6. **v7 (experiment): DNN/RL don't beat XGBoost.** Deep net = 0.547 AUC (trees
   win on small tabular data). The RL bandit's real insight: with a 81%
   disruption regime and miss-cost > false-alarm-cost, *warn everyone* is
   optimal — so v6's precision-tuned threshold may be too timid; pick August's
   threshold on the product's actual miss/false-alarm costs.
7. **The lever is data, not the model.** To reach 0.8+/0.9 precision we need more
   days (August, PART I). Model tricks were tried five ways and always lost once
   measured honestly.

See `ml_analysis/TRAVNR_ML.md` **Addendum C + D + E + F** (including the
"mistakes never to repeat" list).

## How to run

The ML stack lives in `ml_analysis/.venv` (Python 3.14 + pandas 3, xgboost 3,
scikit-learn 1.9). Rebuild/rerun anytime the CSV changes:

```bash
# re-create the notebooks from the builders (keeps cells in sync with the plan)
python3 ml_analysis/build_notebook.py        # v1 baseline
python3 ml_analysis/build_notebook_v2.py     # v2 experiment
python3 ml_analysis/build_notebook_v3.py     # v3 honest methodology
python3 ml_analysis/build_notebook_v4.py     # v4 time-aware run
python3 ml_analysis/build_notebook_v5.py     # v5 CLEAN run (fixed labels + walk-forward)
python3 ml_analysis/build_notebook_v6.py     # v6 TIME-features winner (AUC 0.686)
python3 ml_analysis/build_notebook_v7.py     # v7 DNN+RL experiment (no model swap)

# post-mortem analysis (why did v2 lose? what's the honest expected AUC?)
ml_analysis/.venv/bin/python ml_analysis/analyze_v2_vs_v1.py

# data audit WITH the fixed label rule (on-time requires terminal status)
ml_analysis/.venv/bin/python ml_analysis/audit_dataset.py

# execute any notebook headlessly (Jupyter equivalent of "Run All")
# NOTE: v7 needs OMP_NUM_THREADS=1 (torch+xgboost crash otherwise)
OMP_NUM_THREADS=1 ml_analysis/.venv/bin/python -c "import nbformat; from nbclient import NotebookClient; nb=nbformat.read('ml_analysis/travnr_ml_v7.ipynb',as_version=4); NotebookClient(nb,timeout=1500,kernel_name='python3').execute(); nbformat.write(nb,'ml_analysis/travnr_ml_v7.ipynb'); print('OK')"

# or open them interactively
ml_analysis/.venv/bin/python -m jupyter notebook ml_analysis/travnr_ml_v1.ipynb ml_analysis/travnr_ml_v2.ipynb ml_analysis/travnr_ml_v3.ipynb ml_analysis/travnr_ml_v4.ipynb ml_analysis/travnr_ml_v5.ipynb ml_analysis/travnr_ml_v6.ipynb ml_analysis/travnr_ml_v7.ipynb
```

Data is read from `risk_score_history_v2.csv` at the repo root (found
automatically whether you launch from the repo root or from `ml_analysis/`).

## When August data arrives

See **PART I** of `MLPLAN_UPDATEDDB.md`: rerun the audit scripts + notebook on
the new export, gate any deploy on the August holdout meeting Part H.
