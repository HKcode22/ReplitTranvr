# Repository Reorganization — Current Review Index (October 15, 2026)

**Status:** isolated draft [PR #39](https://github.com/HKcode22/ReplitTranvr/pull/39), not deployed or merged. Main: `f5b1347...`. Parallel live Gate3 engineering remains separate [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36), not assumed passed or merged.

## Read in this order

1. [Oct 15 complete main + PR36 inventory](inventories/README.md), including 1,162 historical/current main tracked blobs, 151 changed paths in Gate3 draft.
2. [Oct 15 complete SEPmd path-by-path proposed migration map](2026-10-15_SEPMD_EXACT_PATH_MAPPING_AND_CASE_CONFLICT.md) and [CSV source-to-destination map](manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv).
3. [Oct 15 historical PR36 deletion safety review](2026-10-15_PR36_REMOVALS_AND_FREEZE_SAFETY_REVIEW.md) — including absent AGENTS.md.
4. [Oct 15 source-level Gate3 path references](2026-10-15_GATE3_EXACT_PATH_REFERENCE_SAMPLE.md).
5. [Oct 15 initial full audit and two-wave plan](2026-10-15_PRE_GATE3_REORGANIZATION_AUDIT_AND_EXECUTION_PLAN.md).
6. [Oct 15 scanner/CI verification](2026-10-15_REFERENCE_AUDIT_SCANNER_FIXTURE_AND_CI_GATE.md).

## Boundaries

Historical root reorganization has completed **11 verified byte-identical Git renames** in draft PR39; historical Git content is retained. **Zero source/scientific/authority file contents have been modified, and no SEPmd/ or artifacts/ paths have moved.** Phase2G qualified historical YSSY source 231/229 remains unchanged; original formal Gate2 and live Gate3 are not certified by repository housekeeping. No Replit Agent, deployment, paid API, SQL/ObjectStorage or source retention action is performed.

## Latest complete scanner triage

- [Oct 15 CI full 64-reference triage and missing literal provenance](2026-10-15_CI_UNRESOLVED_LITERALS_FULL_TRIAGE.md) — 4/4 zero-provider CI PASS at `fc5fd762e2159e187dc913d08f65bff872f55fc1`, 30 distinct unresolved strings (mostly placeholders/generated files, not automatically bugs).

## First actual root cleanup

- [Oct 15 verified nine-file archive move, exact blob SHA custody](2026-10-15_WAVEA_FIRST_ROOT_HISTORY_MOVES_CHECKPOINT.md) and [move receipt](manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv). No `SEPmd` or `artifacts` files were moved. The active operator shell-only guardrail is explicitly protected in the proposed map.

## Second small, offline-safe root move

- [Wave A notebook preservation and exact-blob test](2026-10-15_WAVEA_NOTEBOOK_AND_BLOB_INTEGRITY_CHECKPOINT.md). Ten historical root paths now have identical Git blobs at their new tracked paths. The remaining plan PDF and uninspected ZIP remain unchanged.

## Safe document architecture preview — no scientific file relocation

- [New `data-collection/` entry point](../../data-collection/README.md) links the approved 8 research/operations subsections to the original source files. Unlike the future atomic rename, this is pure navigation and all old authority paths remain valid.

## Remaining root decisions

- [2026-10-15 case-sensitive root file review](2026-10-15_REMAINING_ROOT_FILES_AND_OPAQUE_ARTIFACT_REVIEW.md) and [machine root inventory](manifests/2026-10-15_REMAINING_REPO_ROOT_FILE_REVIEW.csv). The old root snapshot contained Gate0 checklist; it has now been moved unchanged to `docs/history/phase1/GATE0_INPUT_CHECKLIST.md`. Opaque plan PDF and ZIP remain protected.

## Historical Gate 0 checklist and cross-platform collision guard

- [Oct 15 third bounded root move + 11 exact-blob preservation tests](2026-10-15_WAVEA_GATE0_HISTORY_MOVE_AND_CASEFOLD_GUARD.md), including one known macOS case-insensitive collision in `SEPmd/PHASE2G/README.md` vs `SEPmd/phase2g/README.md`.

## Next exact gate

Verify new exact GitHub SHA's 4 no-provider CI runs (including 11-blob identity and casefold collision test). Keep uninspected binary ZIP/PDF and all scientific paths untouched. Only propose SEPmd→data-collection atomic migration with complete path/ref/hash and Gate3 branch merge review.
