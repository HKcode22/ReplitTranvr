# October 15, 2026 — Original 460-file scientific source/evidence directory now browsable

**Working branch:** `repo-reorganization-gate3-review-20261015` / [draft PR39](https://github.com/HKcode22/ReplitTranvr/pull/39). Historical main `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, Gate3 separate unmerged PR36 `318e2c3b8223bfc417757dbe571883aecdbca589`, prior original Git snapshot `archive/pre-reorganization-20261015`. This work was based on `a75bf571bf24a9e169259df99c4cf53b980e6303`.

## Visible finished improvements
1. [New plain-language Start Here](../../data-collection/START_HERE.md) and root project README prominently link the most useful areas, rather than forcing navigation through hundreds of file names.
2. [All 108 original SEPmd tracked files](../../data-collection/ALL_SEPMD_FILES.md) indexed with [Git blob SHA/size CSV](../../data-collection/sepmd-source-catalog.csv). This covers 47 root, 58 lowercase Phase2G and 3 uppercase legacy/active operation records.
3. [All 58 original lowercase Phase2G documents](../../data-collection/phase2g/ALL_REPORTS.md) organized by actual purpose: 7 overview, 24 reports, 8 incidents, 14 amendments/drafts and 5 historical runbooks.
4. [All 352 original artifacts](../../data-collection/evidence/ARTIFACTS_START_HERE.md) grouped into 180 Phase2F, 150 Phase2G and 22 others, with [SHA/size master CSV](../../data-collection/evidence/artifacts-catalog.csv). Per-group pages contain direct links to every source artifact.
5. Automated offline test `tests/repo_cleanup_full_source_catalog_v39.test.ts` asserts complete path set equality to tracked Git index, all 460 SHA and byte size comparisons to `git ls-tree`, group totals, and 58 Phase2G path references. Navigation tests are supplemental to earlier 11 byte-identical preserved historic root moves and protected-file guards.

## Exactly what has NOT happened
- No `SEPmd/` or `artifacts/` original source path moved, copied, edited, deleted, or renamed. **This is navigation, not the unapproved physical 155-path migration.**
- Original V3.9 plan, implementation ledger, P25 signed AUTH, P25 231 billed versus 229 received original delivery gap, artifacts, provider accounting and 168-hour custody remain as before.
- No Replit AI Agent, no paid provider, no live database, no published deployment, no GitHub paid workflow dispatch, no merge of main or PR36.
- GitHub CI for **this exact new HEAD** is necessary before treating the catalog as fully tested. 4/4 offline checks passed on prior repair head `d3ed106a...`; later docs commits must have their own checks.

## What remains for full physical completion
- Decide whether the physical `SEPmd→data-collection` rename should happen now or after Gate3 PR36 integration. In either case, resolve original source paths removed on PR36 (notably `AGENTS.md`, original P25 AUTH and runtime freeze); amend all runtime/CI/dynamic path consumers *atomically*. Preserve original source blob SHAs and scientific ledgers unchanged. Do not touch live/released files without explicit owner review/permission.
- 34MB root `zipFile.zip` and Plan PDF remain opaque unique candidates, deliberately not deleted or renamed.
- Existing only macOS casefold collision `SEPmd/PHASE2G/README.md` versus `SEPmd/phase2g/README.md` must be fixed in any future structural move, not ignored.
