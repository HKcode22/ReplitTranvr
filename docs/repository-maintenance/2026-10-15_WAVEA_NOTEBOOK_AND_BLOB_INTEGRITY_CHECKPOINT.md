# 2026-10-15 — Wave A continued: Notebook archival + exact-blob preservation test

**Actual source:** `6d5e48881033ce14c0d93926817aa904288f285c` on isolated cleanup draft PR39. Exact previous-head checks **4/4 PASS**: [full offline #38790973899](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790973899), [focused no provider #38790973804](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790973804), [disposable PG #38790973646](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790973646), [receiver public read-only #38790973823](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790973823).

## What changed

- Inspected original `T3.ipynb` via GitHub: a 24-cell Travnr V2 ML feature-engineering audit, with 19 Python code cells, 5 Markdown cells, references to local `training_data.csv`. No `training_data.csv` blob exists in the exact 1182-file tree. Historical analysis/not directly reproducible modern V3.9 science.
- Earlier no-provider `git grep` root candidate audit showed **zero operational/test literal mentions** of `T3.ipynb`, but some docs mention it; historical links are maintained via index.
- Using an exact existing Git blob (**no content rewriting**), moved `T3.ipynb` → `docs/history/v2-diagnostics/notebooks/T3.ipynb`, blob `df60b3241f6e459fba6fe3ce79efff01fa090c37` and byte size 92,670. All notebook outputs and original cell content remain intact, unexecuted.
- Existing nine exact-hash path moves remain unchanged, for a total of **10** historical files relocated. Extended [old/new path SHA receipt](manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv).
- Added an automated Vitest guard `tests/repo_cleanup_moved_blobs_v39.test.ts` that uses local `git hash-object` to prove all **10 unchanged blobs**, and guards twelve critical unaffected paths, including both differently capitalized `SEPmd/phase2g/README.md` and `SEPmd/PHASE2G/README.md`, active shell-only guardrail, authoritative Plan/ledger, and raw Gate2 runtime artifact. It never connects to live sources.
- Added historic notebook README describing missing local input and no automatic execution. Historical cross links updated in `README.md` and `docs/history/` indexes.

## Holds / safety

No move of `SEPmd`, `artifacts`, authentication, frozen science, 34MB `zipFile.zip`, Plan PDF, retained source-cited `gptP0analyze4.md`, root Gate0 historic checklist, runtime code, workflows, nor current PR36. No Replit agent, provider calls, live DB/object mutation, deploy or main merge. Gate3 remains paid-sealed, YSSY original 231/229 remains qualified failed/delivery gap.

**CI not implied by commit:** rerun and check four exact-sha no-provider PR workflows after this change. Confirm final current-head SHA and compare shows **ten Git renames** and zero unchanged-root deletions/edits. Do not relax operator guardrails or merge PR39 without review.

## Next action

Verify new CI; inspect resulting root/history exact-path mentions and historical relative links. Inventory the unexplored PDF and 34MB ZIP *without* deleting or rewriting unique contents; run case-insensitive collision scan on proposed `data-collection/` migration. Start a separate atomic rename PR only once the Gate3 ledger and dynamic path consumers are comprehensively resolved.
