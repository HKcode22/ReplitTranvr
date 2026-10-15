# 2026-10-15 — ReplitTranvr repository reorganization: exact audit, decisions, and safe execution plan

> **STATUS: DOCUMENTATION-ONLY PREPARATION, NOT IMPLEMENTATION.** The audit branch is intentionally isolated from `main`, Replit published source, and draft PR #36. No paths were moved/deleted, no paid provider calls, no SQL/object changes, no published deployment and no experiment status change occurred. All future rename/delete actions require a complete manifest, dependency checks, and regression proof.

## Verified GitHub state and baseline

- Repository: `HKcode22/ReplitTranvr`, publicly visible; repository default `main`.
- Current/release `main` observed: `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, tree `7d53f1a54de190ab36e2ed4f12af1ae23c298f0d` (October 12, 2026). Main branch protection API reports `protected=false`; guard against accidental direct pushes/merges and evaluate GitHub settings before final integration.
- New immutable-intent pre-cleanup **branch reference**: `archive/pre-reorganization-20261015` at this same `f5b1347...` commit. It is not a GitHub immutable protected tag; do not force-update or delete it.
- Current audit/planning branch: `repo-reorganization-gate3-review-20261015`, forked from this `main` commit. This is the only branch on which this report/README are being added.
- The original approved issue [#24](https://github.com/HKcode22/ReplitTranvr/issues/24) remains the policy and approval record (October 4/5). The older `repo-reorganization-20261004` and `archive/pre-reorganization-20261004` **both still point to** `947ec656b21f91dd9f267e794e1d61439872853b`; do not reset or overwrite either.
- Main Git tree inventory: **1,162 tracked files** / 43 tracked tree entries. Main has **96 Markdown files**, **108 `SEPmd/` files**, **352 `artifacts/` files**, 159 `scripts/`, 159 `tests/`, 151 `server/`, 119 `client/`, 42 `attached_assets/`, 14 `migrations/`. These are counts, not proof that any file is unnecessary.
- `zipFile.zip` tracked at repository root is 34,226,449 bytes (classification candidate, NOT approved deletion on size alone). Root also contains `gptP0analyze.md` to `gptP0analyze7.md`, `confused.md`, `T3.ipynb`, historical diagnostic documents, PDF, and `researchPapers/`. An empty `SEPmd/V3.9_Final_Document_Safety_Audit_2026-09-02.md` exists. Two separately cased folders `SEPmd/PHASE2G/` and `SEPmd/phase2g/` are tracked, with potentially contradictory historical indices.
- Root lacked a `README.md` at the inspected main head; this audit branch adds a navigation README without rewriting scientific records.
- Most recent phase3 work is not on main: unmerged [draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36), branch `phase2g-pragmatic-science-and-checkpoints-20261012`, inspected head `318e2c3b8223bfc417757dbe571883aecdbca589`; **1,271 tracked files, 137 Markdown files, 150 `SEPmd/` files**. It includes `SEPmd/phase3/START_HERE.md` and numerous October 14–15 Gate3 checkpoints, a new workflow, a V0065 migration, and safety-critical Gate3 code. These draft changes MUST be reconciled against a future cleanup plan before ANY merge.
- [PR #37](https://github.com/HKcode22/ReplitTranvr/pull/37) is a separate docs-only scientific closeout. Neither PR is deployed as a result of this audit.

## Scientific and paid safety boundaries — NONNEGOTIABLE

1. Original YSSY P25 probe19 remains `failed/DELIVERY_GAP`, billed 231 vs receiver-original 229 units (2-unit gap); retain 58 original received objects and source-linked scientific history. Qualified completed pilot research is not an original Gate2 PASS.
2. Formal five-anchor Gate2 remains HOLD / NOT_PASSED; the Phase3 paid canary has not passed or been authorized. Source-level Gate3 provider exposure is sealed in draft PR36, and a native signed hosted callback/Blob/PG proof + separately approved release and tiny budget are still pending.
3. Incident31 and the 168-hour source retention window are *outside repository cleanup*. Do not delete, extend, archive to GitHub, or alter raw storage/SQL through reorganization. Do not run invalid exact-session cleanup with a missing transient session.
4. No Replit AI Agent, no Cloudflare, no provider CREATE/DELETE/refill, no live DB migration, no automatic paid schedule, no main push, no Replit republish. Any Replit steps must be narrow shell/UI instructions executed by owner after separate review.
5. Preserve Plan f.8, Implementation Log, frozen authorizations, original receipt/accounting hashes, and failure history. Renaming a pathname is not authority to rewrite historical evidence or approval scope.
6. Git commit/tree fingerprints or GitHub Actions run identity may change after file moves; a fresh release binding and validation would be mandatory before any future paid run.

## Already approved organization principles (Issue #24 October 5 owner decisions)

- Use `data-collection/` with clear README, `plans/`, `implementation/`, phase-specific `phase2/`, `phase2g/`, `phase3/` as appropriate, `authorizations/`, and `evidence/`.
- Distinguish phase `amendments/`, `incidents/`, `reports/`, `runbooks/`; use dated filenames and README timeline **newest first**. Do not renumber immutable files for cosmetic ordering.
- Every cleanup candidate must be labeled `CANONICAL`, `SUPPORTING`, `TRANSIENT`, `SUPERSEDED`, or `DUPLICATE`; age alone is not a deletion criterion.
- Keep `client/`, active `server/`, `shared/schema.ts`, and root active `migrations/` structurally intact. Database baseline proof should live with the migration domain. Reorganize research citations with traceability.
- Preserve important scientific records in active/indexed history. Don't put all old files in a giant mainline archive.
- Rename `SEPmd/` and move `artifacts/` only as a reviewed **atomic cross-code/config/test/workflow/document/hash-contract migration** after scanning all consumers. The Oct4 Issue #24 literal-reference inventory is a STARTING POINT, not a current complete list.

## Newly discovered migration risks requiring fresh inventory

- Main `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` is read by the **October 15 draft Gate3 exact AUTH-ledger reservation** in `server/lib/disruption/gate3LedgerBoundSessionPreparation_v39.ts`; blindly renaming can break the closed-before-provider admission chain.
- Historical `scripts/v39_phase2g_stage1_paid_preflight_v39.ts`, owner tools, V3.9 freeze, authorization checkers, workflow YAML, `server/routes_v3.ts`, and manifest modules have literal SEPmd/artifact contracts, according to Issue #24's earlier source inventory. Re-scan both `main` and latest PR36 before any rename.
- Source and tests may reference absolute and relative paths; generated artifact source SHAs/path manifests and markdown links can refer to specific paths. Keep archival provenance independent from business logic changes.
- Older `SEPmd/PHASE2G/README.md` documents a historical prospective small delivery-gap proposal while `SEPmd/phase2g/README.md` documents a different/frozen strict interpretation. Both are provenance; neither is a safely unqualified current-operations index. Add dated supersession and an authoritative current index rather than silently deleting or editing experiment history.
- New Phase3 draft branch is far ahead in files but not integrated. Mass reorganizing main before PR36 review will produce a difficult and potentially dangerous 100+file path merge conflict.

## Proposed target navigation — conceptual, NOT yet move manifest

```text
README.md                                # newcomer/start-here index (audit-branch draft)
docs/repository-maintenance/             # dated audit and cleanup procedure
data-collection/
  README.md
  plans/
  implementation/
  authorizations/
  phase2/
  phase2g/{README.md,amendments/,incidents/,reports/,runbooks/}
  phase3/{README.md,amendments/,incidents/,reports/,runbooks/}
  evidence/                               # relocate only specifically approved classes
research/                                 # provenance index + original paper metadata
migrations/                               # unchanged runtime migration tree
client/ server/ shared/ scripts/ tests/    # unchanged in first-pass docs audit
```

**Do not create the full tree/move directories merely for appearance**: Git tracks files, not empty directories; target paths and compatibility/migration order require a concrete manifest.

## Executable sequence — two waves

### Wave A: safely achievable independent readability cleanup (target within 24 hours; review-only branch)

1. Preserve and verify the October 15 archive snapshot and the cleanup branch. Report `main` SHA and PR36 SHA; stop if they advance unexpectedly.
2. Provide root README, current-status/phase pointer, legacy document hierarchy, new/old phase index, dated checkpoint, and explicit current-vs-historical legend.
3. Produce machine-readable manifest covering every path: `old_path`, `type`, `size`, `SHA`, `classification`, `target`, `source_refs`, `blocked_by`, `decision`. In particular inventory scratch ZIP/notebook, root gpt files, screenshots, tool metadata, research markdown, and duplicate indices. Mark uncertainty `REVIEW`, not `DELETE`.
4. Audit current main plus latest PR36; classify required AUTH and evidence refs as `CANONICAL`, keep original logs/artifacts immutable.
5. Update human-readable indexes first, not hash-bound producer/consumer paths. Apply only confirmed no-reference scratch exclusions on separate reviewable commit after evidence/links check. Never force push.
6. Perform no-provider link/path checks, `npm run v39:typecheck`, `npm run v39:lint`, `npm run v39:test:full`, `npm run v39:build`, and current GitHub V3.9 Offline Safety where applicable; record exact SHA and CI outcomes, don't inherit another branch's PASS.

### Wave B: atomic rename/archive (stage independently; timeline conditional)

7. Freeze a complete exact `SEPmd/...` / `artifacts/...` mapping; prove literally every runtime/CI/docs consumer migrates coherently. Retain forward compatibility or intentional fail-closed references as specifically proven.
8. Review Gate3 draft PR36's current executable and documentation head; coordinate migration after a reviewed integration point, not a blanket merge of unreviewed paid-safety code.
9. Perform narrow batch renames with full test+link+SHA provenance checks and review per batch. No deletion of immutable approvals, raw receipts, accepted research/incident evidence, active migrations or currently parsed JSON artifacts.
10. Publish a **draft cleanup PR only after all checks**, independent diff review, full release identity rebind, and explicit human merger decision. `main` and published Replit must remain unaffected throughout branch experimentation.

### What 24 hours means

A usable root README, current/historical indexes, classification inventory and candidate cleanup branch **may reasonably be achievable within 24h**. A verified 1,000+ file reorganization across runtime path contracts, CI, Release/Replit smoke, and PR36 integration **must not be promised or rushed into production** within that window. If proof fails, keep the safe documentation improvements and hold the renames.

## Verified in this particular audit

- Read live repo metadata, October 15 main recursive tree (not truncated), and October 15 PR36 recursive tree (not truncated).
- Read Issue #24 and its exact approval/comment inventory; fetched both October 4 branch heads and the October 15 main SHA.
- Inspected current `AGENTS.md`, `.replit`, `.gitignore`, `package.json`, `SEPmd/PHASE2G/README.md`, `SEPmd/phase2g/README.md`, PR36 Gate3 latest checkpoints and current START_HERE.
- Created two new branches from unchanged `main` head. Only this new audit branch receives documentation; no application source tests or Replit runtime tests were run in the current ChatGPT environment. All counts reflect tracked Git tree, not hidden/untracked Replit files.
- The existing October 4/5 owner approval supports this planning work. Any bulk deletion, hash-sensitive atomic rename, default-branch merge or published live use must meet the explicit safety criteria before proceeding.

## Next session starting point

Read this file, [Issue #24](https://github.com/HKcode22/ReplitTranvr/issues/24), PR36 `SEPmd/phase3/START_HERE.md`, and its newest branch head. Then generate the actual machine-readable `old_path -> target_path` inventory and full reference scan on the **audit branch**. Verify the original `main` and PR36 have not advanced. Review retention/source issues separately before classifying any evidence for removal.

**Current gate:** `AUDIT_ONLY_GO` / `BULK_RENAME_HOLD` / `DELETE_HOLD` / `PRODUCTION_MERGE_HOLD` / `PAID_GATE3_UNAUTHORIZED`.
