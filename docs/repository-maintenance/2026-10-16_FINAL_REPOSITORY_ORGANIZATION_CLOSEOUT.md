# Final repository organization closeout — October 16, 2026 PDT

**CURRENT GITHUB STATE:** Reorganized `main`; Wave C4 and bounded Wave D follow-up merged and source custody verified. This is a GitHub/repository checkpoint, **not** a Replit published-deployment or paid-study approval.

## Confirmed merge commits
1. [PR #52 — integrated physical organization](https://github.com/HKcode22/ReplitTranvr/pull/52): main merge `0ce56fcf483ee012c3b30c4579652cb608ee2f5e`, 4/4 exact-head no-provider PR checks and [postmerge main offline-safety SUCCESS](https://github.com/HKcode22/ReplitTranvr/actions/runs/38887276980).
2. [PR #53 — eliminate empty audit history directory](https://github.com/HKcode22/ReplitTranvr/pull/53): main merge `64cb013ca3157ccb903de90cc4b68612c7f37d3f`, 4/4 exact-head no-provider PR checks; [postmerge main offline run #38888745281](https://github.com/HKcode22/ReplitTranvr/actions/runs/38888745281) should be checked separately for final status.
3. Older PRs #48, #49 and #50 closed as superseded **without merging**, preserving their branches and review histories. Recovery ref `archive/pre-reorganization-20261015` remains `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.

## Filesystem convention going forward
- [`data-collection/`](../../data-collection/START_HERE.md) is the scientific project home. Phase-specific human-written method reports, incidents, amendments and runbooks remain within `phase0/`, `phase1/`, `phase2/`, `phase2g/`, `phase3/`. Historical phase labels are not current launch authorizations.
- [`plans/`](../../data-collection/plans/README.md), [`implementation/`](../../data-collection/implementation/README.md), and [`evidence/ledgers/`](../../data-collection/evidence/README.md) contain distinct authoritative plan, execution record and source ledger; use [Study Hub](../../data-collection/STUDY_HUB.md) to find all three.
- [`evidence/original-artifacts/`](../../data-collection/evidence/ARTIFACTS_START_HERE.md) preserves **352 original machine receipts** separately from interpretive Phase 2G reports; 180 Phase 2F, 150 Phase 2G, 22 other/database/gate.
- [`authorizations/`](../../data-collection/authorizations/README.md) holds **32 historical signed JSONs**, not reusable provider/paid permissions.
- [`analysis/`](../../data-collection/analysis/README.md) holds standalone no-provider/offline research code, not a second root `experiments/`.
- `client/src/assets/images/legacy-attachments/` holds 18 original PNGs. [`docs/history/`](../../docs/history/README.md) holds older application screenshots, pasted text/ZIP and legacy diagnostics; it is not scientific Phase 0/1 history.
- `docs/repository-maintenance/` holds cleanup proofs, manifests and status checkpoints, not current scientific protocols. Main root remains focused on runtime code, migrations, policy, tests and workflow configuration.

## Why there is no longer a `history/zero-byte-audit-stubs/` folder
It held one **empty 0-byte Markdown placeholder** (`V3.9_Final_Document_Safety_Audit_2026-09-02.md`) with Git blob SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`. It never proved completion of a safety audit. PR #53 moved the **identical empty blob** into the existing `data-collection/plans/history/` folder, removing an unnecessary visible directory. The original Wave B 460-row relocation manifest remains historically unmodified; [Wave D second-hop manifest](manifests/2026-10-16_WAVED_EMPTY_PLACEHOLDER_SECOND_HOP.csv) documents the later move. The active 108-source index now points to its current preserved path.

## Integrity and verification
- **460/460 original scientific/evidence records** matched exact Git SHA, size and mode on the Oct16 merged `main` tree, resolving the one approved second hop; no source bytes rewritten, no macOS casefold collisions and no missing original receipts.
- Wave C4 physically relocated 52 original files with identical original content SHAs. Wave D moved one more 0-byte original without deletion.
- 167 internal relative links inspected across five key Wave D navigation and checkpoint pages: **0 broken** before merge; new navigation/source catalog paths checked by PR CI.
- Original YSSY P25 science remains **231 billed / 229 received, FAILED/DELIVERY_GAP**. Neither folder cleanup nor prospective statistical analysis retroactively changes formal Gate2 acceptance.
- Gate 3 [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) remains an independent older-base draft with 47 newly added scientific records under obsolete `SEPmd/` paths. Future integration must map them under `data-collection/` without rewriting Plan/Log/ledger or reintroducing old roots.

## Operational and approval boundaries
**No new live Replit publication, callback/SQL/object-storage mutation, paid AeroDataBox operation, or Replit AI Agent action occurred.** The published Replit source parity/retention/receiver state is **not certified by these GitHub merges**, and paid protocol or Gate3 actions need independent authorization. No historic branch/recovery-ref deletion; branch inventory [67-branch audit](inventories/2026-10-15_BRANCH_RETENTION_AUDIT_SUMMARY.md) remains a review list, not a delete permit.

## Exact continuation point
Begin from current `main`, [Study Hub](../../data-collection/STUDY_HUB.md), and [Issue #47](https://github.com/HKcode22/ReplitTranvr/issues/47). Confirm latest main CI, track independent runtime parity HOLD, and review Gate3 PR #36 path-and-ledger merge safety before any further science work. Preserve these dated checkpoints and always run exact-head no-provider tests on substantive repository changes.
