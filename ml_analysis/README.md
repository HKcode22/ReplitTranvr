# ml_analysis — scripts + notebook

## Files

| File | What it does |
| ---- | ------------ |
| `audit_dataset.py` | Per-column/per-row data quality audit of `risk_score_history_v2.csv` (nulls, constants, quote artifact, label coverage = E.7 numbers). |
| `heuristic_eval.py` | Evaluates the current heuristic vs final outcomes (precision/recall, pre/post). |
| `deepdive_periods.py` | May/June vs July comparison, pre/post departure, feature audit. |
| `travnr_ml_v1.ipynb` | **The ML model (baseline)** — implements Part G of `MLPLAN_UPDATEDDB.md` end-to-end: load → clean → label back-propagation → Option-3 split → XGBoost → threshold tuning → test evaluation vs heuristic → Option-2 ablation → export. |
| `travnr_ml_v2.ipynb` | **Optimization experiment** — mirrors v1's data prep/split exactly but target-encodes categoricals, tunes hyperparams + `scale_pos_weight`. **Verdict: does NOT beat v1 on held-out test (see below), so v1 stays production.** |
| `travnr_ml_v3.ipynb` | **Honest methodology** — same data, but evaluates with 5-fold flight-aware CV (mean ± std) instead of one lucky split. Finds the small reproducible edge (extra carrier/otp/signal features) and confirms >0.73 needs **more data**, not more tuning. |
| `analyze_v2_vs_v1.py` | **Post-mortem** — proves why v2 lost (val-selection is noise: corr(val,test)=0.06) and estimates the honest expected AUC (~0.65 ± 0.06). Run: `.venv/bin/python ml_analysis/analyze_v2_vs_v1.py`. |
| `exports/` | Output of the notebooks: `xgboost_delay_predictor.json` (booster) + `threshold.json` (features, category maps, threshold) for the server2 Python sidecar. v2/v3 write separate `*_v2`/`*_v3` files. |

## Why we went v2 → v3

v2 "won" on validation (val AUC 0.761) but **lost** on the real test (0.691 vs
v1 0.731). The post-mortem proved the cause: picking the best of 48 models on
one small 102-flight validation slice is choosing noise — measured correlation
between val and test AUC across those 48 models was **0.06** (≈ random), and
the honest 5-fold flight-aware expected AUC is only **~0.65 ± 0.04**. v3
therefore stops trying to "improve" v1 with more tuning and instead reports the
real number, finds the only genuine (small) gain — adding the unused
carrier/otp/signal columns (0.659 → 0.667) — and concludes that **>0.73
requires more data (August; PART I of the plan), not more model tricks**.

## How to run

The ML stack lives in `ml_analysis/.venv` (Python 3.14 + pandas 3, xgboost 3,
scikit-learn 1.9). Rebuild/rerun anytime the CSV changes:

```bash
# re-create the notebooks from the builders (keeps cells in sync with the plan)
python3 ml_analysis/build_notebook.py        # v1 baseline
python3 ml_analysis/build_notebook_v2.py     # v2 experiment
python3 ml_analysis/build_notebook_v3.py     # v3 honest methodology

# post-mortem analysis (why did v2 lose? what's the honest expected AUC?)
ml_analysis/.venv/bin/python ml_analysis/analyze_v2_vs_v1.py

# execute any notebook headlessly (Jupyter equivalent of "Run All")
ml_analysis/.venv/bin/python -c "import nbformat; from nbclient import NotebookClient; nb=nbformat.read('ml_analysis/travnr_ml_v3.ipynb',as_version=4); NotebookClient(nb,timeout=1200,kernel_name='python3').execute(); nbformat.write(nb,'ml_analysis/travnr_ml_v3.ipynb'); print('OK')"

# or open them interactively
ml_analysis/.venv/bin/python -m jupyter notebook ml_analysis/travnr_ml_v1.ipynb ml_analysis/travnr_ml_v2.ipynb ml_analysis/travnr_ml_v3.ipynb
```

Data is read from `risk_score_history_v2.csv` at the repo root (found
automatically whether you launch from the repo root or from `ml_analysis/`).

## When August data arrives

See **PART I** of `MLPLAN_UPDATEDDB.md`: rerun the audit scripts + notebook on
the new export, gate any deploy on the August holdout meeting Part H.
