# Repository Maintenance — current status

> **Updated October 16:** [Wave C4 PR #52](https://github.com/HKcode22/ReplitTranvr/pull/52) **merged** to `main` at [`0ce56fcf483e`](https://github.com/HKcode22/ReplitTranvr/commit/0ce56fcf483ee012c3b30c4579652cb608ee2f5e); its [post-merge offline safety run #38887276980](https://github.com/HKcode22/ReplitTranvr/actions/runs/38887276980) succeeded. PRs #48/#49/#50 were closed without separate merges. [Wave D zero-byte folder simplification](2026-10-16_WAVED_ZERO_BYTE_PLACEHOLDER_SAFE_RELOCATION_CHECKPOINT.md) **merged as PR #53** at [`64cb013ca315`](https://github.com/HKcode22/ReplitTranvr/commit/64cb013ca3157ccb903de90cc4b68612c7f37d3f), preserving the exact 0-byte original in `data-collection/plans/history/` and eliminating the redundant standalone history folder. [Post-merge safety run #38888745281](https://github.com/HKcode22/ReplitTranvr/actions/runs/38888745281) should be checked for its final conclusion; no paid execution, Replit publication, PR #36 merge or deletion of historical source blobs occurred.


**Wave C1 review (Oct 15):** [V3.9 Study Hub](../../data-collection/STUDY_HUB.md), [Folder Guide](../../data-collection/FOLDER_GUIDE.md), [offline analysis](../../data-collection/analysis/README.md), [Wave C1 checkpoint](2026-10-15_WAVEC1_PHYSICAL_NAVIGATION_CHECKPOINT.md), and [Issue #47](https://github.com/HKcode22/ReplitTranvr/issues/47). [Wave B PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46) is **merged to main** at the Wave C1 audit; Replit deployment parity still needs separate verification. Historical entries below document earlier stages; their old draft status no longer describes PR #46 today.


**October 15, 2026:** Wave A organization [PR #39 merged](https://github.com/HKcode22/ReplitTranvr/pull/39), main merge commit [`4075cce8`](https://github.com/HKcode22/ReplitTranvr/commit/4075cce8aa33c159487a436127199264a4e8954c), [automatic post-merge V3.9 offline CI SUCCESS](https://github.com/HKcode22/ReplitTranvr/actions/runs/38812391951). Separate Gate3 [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) remains unmerged at last inspected `318e2c3...`.

## Read the organized repository

- [Plain-language project guide](../../data-collection/START_HERE.md) and [repository homepage](../../README.md).
- [All 108 original scientific SEPmd files](../../data-collection/ALL_SEPMD_FILES.md), [58 Phase2G dated documents](../../data-collection/phase2g/ALL_REPORTS.md), [all 352 original machine evidence files](../../data-collection/evidence/ARTIFACTS_START_HERE.md).
- [Complete 460-original-record catalog checkpoint](2026-10-15_COMPLETE_460_SOURCE_EVIDENCE_DIRECTORY_CHECKPOINT.md), a dated **pre-Wave-B** report. Wave A had 11 unchanged-content historic root moves, [exact Git blob manifest](manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv). Wave B subsequently moved **108 original `SEPmd/` and 352 original `artifacts/` blobs in merged PR #46**, without rewriting them; review [the actual 460-row relocation manifest](manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv).

## October 4 plan: real historic folder moves

- [October 15 actual root-folder cleanup](2026-10-15_OCT04_WAVEB_SAFE_ROOT_DIRECTORY_MOVES.md): research-paper extracts and old UI screenshots moved byte-for-byte; ignored tool metadata removed with original preserved in old archive snapshot. Remaining scientific core folder migration separately gated.

## Additional root-only reorganized original files

- [Reviewed exact-root file relocations checkpoint](2026-10-15_OCT04_LEGACY_ROOT_PDF_ZIP_GPT_HISTORY_MOVE.md): the historical Phase0 analysis, 300KB V3.9 reference PDF and uninspected 34MB ZIP are moved **byte-identically** into archival/reference locations. Their old root paths are absent; neither PDF nor ZIP was deleted or adjudicated as obsolete.

## Physical scientific-core migration — current review

The original-source physical migration was **merged through [PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46)** into GitHub `main` on October 15. GitHub merge does **not** imply published Replit runtime parity. A verified migration contains 108 original `SEPmd/` scientific sources and 352 originally tracked `artifacts/` evidence blobs at documented new paths, preserving all original SHA/bytes/modes.

**Earlier pre-merge CI head:** [`a4d19f9f`](https://github.com/HKcode22/ReplitTranvr/commit/a4d19f9f446118e034051e76e87f86c43ba9ac1d) passed the four no-provider workflows, including 1,134 passing tests and 19 skipped. New commits require their **own** checks. The [dated relocation checkpoint](2026-10-15_WAVEB_PHYSICAL_RELOCATION_AND_SCIENTIFIC_COMPATIBILITY_CI_CHECKPOINT.md), [path classification](../../data-collection/operations/WAVE_B_RUNTIME_PATH_CLASSIFICATION.md), and [historic pre-migration gate](../../data-collection/operations/WAVE_B_COMPATIBILITY_GATE.md) explain what changed and why a green read-only published-identity job is **not** proof that Replit has been republished.

**Still unresolved after GitHub merge:** controlled Replit workspace/runtime source parity review, and independent integration of 47 PR36-only draft scientific records (without overwriting the signed original P25 ledger). [Issue #24](https://github.com/HKcode22/ReplitTranvr/issues/24) tracks the final closeout.

## Historical evidence and previous decisions

- [First full audit and two-wave plan](2026-10-15_PRE_GATE3_REORGANIZATION_AUDIT_AND_EXECUTION_PLAN.md); [path-by-path 155-source union proposal](2026-10-15_SEPMD_EXACT_PATH_MAPPING_AND_CASE_CONFLICT.md); [original main/PR36 inventory](inventories/README.md).
- [PR36 provenance caution](2026-10-15_PR36_REMOVALS_AND_FREEZE_SAFETY_REVIEW.md): old main-only paths absent in PR36 branch are **not** automatically GitHub merge deletions.
- [Source path audit sample](2026-10-15_GATE3_EXACT_PATH_REFERENCE_SAMPLE.md); [reference scanner](2026-10-15_REFERENCE_AUDIT_SCANNER_FIXTURE_AND_CI_GATE.md); [historical missing literal triage](2026-10-15_CI_UNRESOLVED_LITERALS_FULL_TRIAGE.md). Missing generated placeholder paths are not necessarily bugs.
- [Original nine-file archive](2026-10-15_WAVEA_FIRST_ROOT_HISTORY_MOVES_CHECKPOINT.md), [notebook history](2026-10-15_WAVEA_NOTEBOOK_AND_BLOB_INTEGRITY_CHECKPOINT.md), [11th Gate0 historic source and Mac path conflict](2026-10-15_WAVEA_GATE0_HISTORY_MOVE_AND_CASEFOLD_GUARD.md), [fixed earlier test regression](2026-10-15_GATE0_MOVE_CI_TEST_TUPLE_REPAIR.md), [opaque ZIP and PDF hold](2026-10-15_REMAINING_ROOT_FILES_AND_OPAQUE_ARTIFACT_REVIEW.md).

The historical original YSSY P25 231 billed/229 received delivery gap remains unchanged. Do not dispatch paid provider workflows, use Replit AI Agent, change published deployment, delete object/SQL records or reclassify scientific outcomes from a cleanup commit.

## Integrated review

- [Wave C4 historical integration checkpoint](2026-10-15_WAVEC4_INTEGRATED_ORGANIZATION_DRAFT_CHECKPOINT.md) — pre-merge review record for Phase 0/1, Phase 2G and legacy assets; **subsequently merged as PR #52**, with all required checks passing.
