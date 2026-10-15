# 2026-10-15 — Wave A historical Gate0 exact move and Mac casefold collision guard

**Scope:** isolated [draft PR #39](https://github.com/HKcode22/ReplitTranvr/pull/39), no deployed source or paid workflow. Previous exact reviewed branch head: `778eae0a5b353b7bc4c6f397e4d4949babfc3dea`; original main `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, PR36 Gate3 draft `318e2c3b8223bfc417757dbe571883aecdbca589`, and October15 pre-cleanup archive remain unchanged.

## Fresh evidence used

At the previous head all four no-provider CI workflows **SUCCESS**:
- [Full V3.9 Offline Safety #38806962809](https://github.com/HKcode22/ReplitTranvr/actions/runs/38806962809), including full suite, TypeScript, lint, source scanner and build.
- [YSSY focused no-provider #38806962967](https://github.com/HKcode22/ReplitTranvr/actions/runs/38806962967).
- [Real disposable PostgreSQL #38806962792](https://github.com/HKcode22/ReplitTranvr/actions/runs/38806962792).
- [Public published-receiver identity read-only #38806962811](https://github.com/HKcode22/ReplitTranvr/actions/runs/38806962811).

Exact GitHub CI source `git grep` for `GATE0_INPUT_CHECKLIST.md` identified 5 tracked text files referencing its name, with the only **operational/test** file being `tests/repo_cleanup_moved_blobs_v39.test.ts` (our own guard). No runtime source, Gate3 workflow or paid release path reported a literal consumer. Inspection confirms original dated September checklist with **zero Markdown hyperlinks** and no `SEPmd/` or `artifacts/` embedded references. Literal/automated scan does not prove absence of hypothetical dynamic consumers; production itself is not mutated here.

## Real change now applied in this isolated draft

- Move `GATE0_INPUT_CHECKLIST.md` → `docs/history/phase1/GATE0_INPUT_CHECKLIST.md` using the **exact original Git blob** `560bb06eb155e5d24a5b19c0e176afa422c4deba`, 7,159 bytes. No document content edits. Historical September provider plan and not-yet-Gate0-PASS text remain a dated original, not an October 2026 authorization.
- Update `tests/repo_cleanup_moved_blobs_v39.test.ts`: now verify **11** byte-identical moved blobs with `git hash-object`, keep all remaining scientific/operational source guards, add the historical phase1 index.
- Add exact `tests/repo_cleanup_casefold_v39.test.ts` verifying the **single existing collision** `SEPmd/PHASE2G/README.md` vs `SEPmd/phase2g/README.md`; future proposed distinct paths are unique with case-folding.
- Correct the stale `docs/repository-maintenance/START_HERE.md` claim that no renames had ever happened; append to the machine old→new Git-SHA receipt and improve `docs/history/` and `data-collection/phase2/` links.
- Preserve `AGENTS.md`, published callback-only safety, Replit shell-only operator rule, `gptP0analyze4.md` (source-cited), PDF, 34MB ZIP, `SEPmd/`, `artifacts/`, original authorizations, evidence and all production code.

## Bounds

**A historical working-tree path is moved; its original blob remains in Git/history and archive branch.** No runtime code, experiment model, data, provider, SQL/Blob, Replit, live objects, 168h retention, published deployment, paid exposure authorization or original P25 231/229 delivery-gap status is changed. Gate3 remains sealed.

**Next exact action:** validate all four **new-head** CI checks; inspect `REPO_CLEANUP_MOVED_BLOB_IDENTITY` and `REPO_CLEANUP_CASEFOLD_GUARD` output at that SHA. If any regression fails, fix on this draft; do not merge. Then reconcile PR36 removed AGENTS/P25 evidence and evaluate code path-bound rename design. Structural 155-path `SEPmd` move stays HOLD.
