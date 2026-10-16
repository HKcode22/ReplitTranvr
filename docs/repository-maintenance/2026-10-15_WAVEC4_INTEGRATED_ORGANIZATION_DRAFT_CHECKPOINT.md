# Wave C4 — Integrated scientific organization checkpoint (October 15, 2026 PDT)

## Starting state and custody
- Target branch: `repo-wavec4-integrated-organization-20261015`, based on exact `main` commit `b4f147750662e9636a354aa271d373352d0069be`.
- Immutable pre-reorganization snapshot: `archive/pre-reorganization-20261015` at `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.
- Incorporates independently reviewed draft PR #48 (`5b6f51181ef1548d212ea10cc834cf08fed8f1d9`), #49 (`399a315d30499706cbe29d4863a360d6ea51b7c2`) and #50 (`47af9a3540e1a8ddd5ba6dfb61434ed645833450`) using their exact Git original blob SHA identities.
- Before integration: individual exact-head CI checks were 4/4 green for each of #48, #49, #50 (offline safety, actual PostgreSQL, focused release guard, hosted public GET). **These successes do not substitute for integrated final-head CI.**

## Intended filesystem changes
1. Move the research-only Phase 2G prospective billed-gap TypeScript analysis from root `experiments/phase2g_rehearsal/` into `data-collection/analysis/`; update its Vitest import.
2. Relocate nine original Phase 0/1 historic scientific source records unchanged from `docs/history/phase0` and `docs/history/phase1` into `data-collection/phase0/` and `data-collection/phase1/` with custody tests.
3. Relocate 18 original PNGs unchanged into `client/src/assets/images/legacy-attachments/`; relocate 23 TXT plus one unopened ZIP unchanged into `docs/history/legacy-replit-attachments/`, with Vite alias, reference auditing and custody tests updated.
4. Retain `data-collection/phase2/`, `phase2g/`, `phase3/` for scientific chronology, with reports, amendments, incidents, and runbooks in their existing phase-specific scopes; preserve `docs/history/` for older application/UI and diagnostic artifacts only.
5. Reconcile shared `README.md`, `data-collection/README.md`, `data-collection/START_HERE.md`, `docs/history/README.md` instead of losing any of the three draft navigation improvements. Normalize accidental literal `\\n` table tokens from the C1 draft.
6. Keep `data-collection/STUDY_HUB.md`, `FOLDER_GUIDE.md`, original Plan / Implementation Log / evidence ledger and preserved machine evidence as distinct authoritative references.

## What must NOT change
- The original 108 V3.9 science blobs and 352 original machine evidence blobs moved under `data-collection/` in previously merged Wave B.
- 32 historical AUTH JSON blobs, original signed ledger and P25 result (231 billed / 229 received, FAILED/DELIVERY_GAP and Gate 2 acceptance hold).
- PR #36 Phase 3/Gate 3 draft; application `server/`, `shared/`, feature pages in `client/src/`, Replit deployment, SQL, object storage, callback and paid/provider resources.
- Existing historical branches, workflow run history, ZIP contents and Git commit history.

## Status and unresolved review
- This new branch/PR is **DRAFT / DO NOT MERGE / NOT DEPLOYED**. Do not treat individual PR test success as integrated validation.
- Verify exact-head four no-provider CI gates, 52 original renames with unchanged SHA, link resolution, case-fold uniqueness, Vite build alias behavior, and current runtime path references.
- Branch set #48/#49/#50 should only be retired as superseded **after** the integrated branch is proven and the reviewer has decided the merge route. None of the drafts is a current paid authorization.
- Consider separately a no-deletion classification of 32 AUTH files, the `data-collection/history/zero-byte-audit-stubs/` placeholder, evidence/original-artifacts (180 Phase2F plus 150 Phase2G files), and old branch inventory. Do not infer duplicates from filenames or move the retained originals without a new path/custody review.

## Continuation
Start by opening this file, the combined root [README](../../README.md), [Study Hub](../../data-collection/STUDY_HUB.md), and [Folder Guide](../../data-collection/FOLDER_GUIDE.md). Check final-head CI, scientific path tests, and GitHub diff before any possible merge to `main`. Require a deliberate owner decision for merge; no Replit AI Agent usage.
