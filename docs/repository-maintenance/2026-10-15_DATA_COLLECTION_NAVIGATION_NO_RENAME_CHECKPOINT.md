# 2026-10-15 — Added safe eight-section data-collection navigation without renaming source

**Branch:** `repo-reorganization-gate3-review-20261015` on review-only [PR39](https://github.com/HKcode22/ReplitTranvr/pull/39). Source main `f5b1347...` and inspected Gate3 draft PR36 `318e2c3...` remain separate and unmerged. Current base commit for this change is `b752e515d943f9a038f4f8662e6020e637e4b66a`.

## Implemented

- Added `data-collection/README.md` top-level navigation and eight category indexes (`plans`, `implementation`, `phase2`, `phase2g`, `phase3`, `authorizations`, `evidence`, `operations`). All linked original V3.9 Markdown and JSON files remain untouched in `SEPmd/` or `artifacts/`.
- Indexed **32** original root authorization JSON files by Gate0, Gate1, Phase2F, Phase2G and refill *for navigation only*. Historical signed AUTH files **never authorize fresh paid action** by their presence.
- Flagged the two historical Phase2G READMEs that both claim canonical authority; do not combine or delete based on capitalization. Highlighted current `SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md` separately as **ACTIVE**.
- Phase3 draft index links to exact previously reviewed PR36 commit `318e2c3b8223bfc417757dbe571883aecdbca589`, without incorporating/unreviewedly merging Gate3 code or duplicating the running scientific ledgers.
- Added no-provider `tests/repo_cleanup_navigation_v39.test.ts` validating that every relative Markdown navigation link from the new section indexes targets an existing checked-out file/dir and essential original source paths remain tracked. No network/provider/database/paid workflow actions.
- Root README and repository-maintenance START_HERE now prioritize `data-collection/` navigation.

## No changes / unwaived holds

- No move/copy/edit of `SEPmd` plans, implementation log, evidence ledger, AUTH, `artifacts` freezes, live DB/object receipts or original P25 scientific failure status (231 provider billed vs229 source received).
- No production GitHub Actions workflow edit, GitHub paid dispatch, Replit Agent or deployment, published runtime change, paid API call, or live SQL action. The 155-path actual migration is still held for atomic compatibility checks.
- Original P25 Gate2 HOLD and historical incident/custody follow existing signed source documents; document navigation does not certify Gate3.

## Next exact gate

1. Confirm all four no-provider CI workflows pass at this new exact branch head; inspect new navigation target check output and exact 10-blob archive integrity check.
2. Produce a **compatibility-layer migration review** across main + Gate3 PR36 before any case-sensitive `SEPmd` rename. Do not merge PR36 until its absent AGENTS.md and P25 original evidence paths are resolved.
3. Evaluate ZIP/PDF root remaining unique contents separately and review superseded Gate0 index through authorizations; no blind deletion.
4. Continue checkpoint and exact GitHub PR39 SHA/CI verification after each bounded change. Do not merge until owner review.
