# Repository Maintenance — current status

**October 15, 2026:** Wave A organization [PR #39 merged](https://github.com/HKcode22/ReplitTranvr/pull/39), main merge commit [`4075cce8`](https://github.com/HKcode22/ReplitTranvr/commit/4075cce8aa33c159487a436127199264a4e8954c), [automatic post-merge V3.9 offline CI SUCCESS](https://github.com/HKcode22/ReplitTranvr/actions/runs/38812391951). Separate Gate3 [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) remains unmerged at last inspected `318e2c3...`.

## Read the organized repository

- [Plain-language project guide](../../data-collection/START_HERE.md) and [repository homepage](../../README.md).
- [All 108 original scientific SEPmd files](../../data-collection/ALL_SEPMD_FILES.md), [58 Phase2G dated documents](../../data-collection/phase2g/ALL_REPORTS.md), [all 352 original machine evidence files](../../data-collection/evidence/ARTIFACTS_START_HERE.md).
- [Complete 460-original-record catalog checkpoint](2026-10-15_COMPLETE_460_SOURCE_EVIDENCE_DIRECTORY_CHECKPOINT.md), a dated **pre-merge** report. Wave A had 11 unchanged-content historic root moves, [exact Git blob manifest](manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv). No original `SEPmd/` or `artifacts/` data moved.

## October 4 plan: real historic folder moves

- [October 15 actual root-folder cleanup](2026-10-15_OCT04_WAVEB_SAFE_ROOT_DIRECTORY_MOVES.md): research-paper extracts and old UI screenshots moved byte-for-byte; ignored tool metadata removed with original preserved in old archive snapshot. Remaining scientific core folder migration separately gated.

## What remains

**Wave B physical file relocation is HOLD**, because current executable preflight/manifest code and historical signed source references use the existing `SEPmd` and `artifacts` paths. The [concrete Wave B compatibility gate](../../data-collection/operations/WAVE_B_COMPATIBILITY_GATE.md) documents exact code consumers, case-insensitive Mac collision, integrity constraints and coordination with unmerged PR36. A safe, *browsable* directory is already available without physical relocation.

## Historical evidence and previous decisions

- [First full audit and two-wave plan](2026-10-15_PRE_GATE3_REORGANIZATION_AUDIT_AND_EXECUTION_PLAN.md); [path-by-path 155-source union proposal](2026-10-15_SEPMD_EXACT_PATH_MAPPING_AND_CASE_CONFLICT.md); [original main/PR36 inventory](inventories/README.md).
- [PR36 provenance caution](2026-10-15_PR36_REMOVALS_AND_FREEZE_SAFETY_REVIEW.md): old main-only paths absent in PR36 branch are **not** automatically GitHub merge deletions.
- [Source path audit sample](2026-10-15_GATE3_EXACT_PATH_REFERENCE_SAMPLE.md); [reference scanner](2026-10-15_REFERENCE_AUDIT_SCANNER_FIXTURE_AND_CI_GATE.md); [historical missing literal triage](2026-10-15_CI_UNRESOLVED_LITERALS_FULL_TRIAGE.md). Missing generated placeholder paths are not necessarily bugs.
- [Original nine-file archive](2026-10-15_WAVEA_FIRST_ROOT_HISTORY_MOVES_CHECKPOINT.md), [notebook history](2026-10-15_WAVEA_NOTEBOOK_AND_BLOB_INTEGRITY_CHECKPOINT.md), [11th Gate0 historic source and Mac path conflict](2026-10-15_WAVEA_GATE0_HISTORY_MOVE_AND_CASEFOLD_GUARD.md), [fixed earlier test regression](2026-10-15_GATE0_MOVE_CI_TEST_TUPLE_REPAIR.md), [opaque ZIP and PDF hold](2026-10-15_REMAINING_ROOT_FILES_AND_OPAQUE_ARTIFACT_REVIEW.md).

The historical original YSSY P25 231 billed/229 received delivery gap remains unchanged. Do not dispatch paid provider workflows, use Replit AI Agent, change published deployment, delete object/SQL records or reclassify scientific outcomes from a cleanup commit.
