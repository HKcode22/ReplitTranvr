# 2026-10-15 — Wave B source migration: collision fixed and executable preflight added

**Review-only change:** branched from `main=8402989a564c6fa0a00ec0c25e2e87e49174e0ee`, all four prior PR42 CI plus its post-merge offline run `38818299135` SUCCESS. **Gate 3 PR36 remains separately unmerged** at inspected `318e2c3b8223bfc417757dbe571883aecdbca589`.

## Concrete blocker discovered after full-tree comparison

The pre-existing migration CSV [155 original paths](manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv) had 0 *internal* duplicate destination names but **did contain one destination already occupied in the working repo**:

- Signed/historical original `SEPmd/phase2g/README.md` — Git SHA `9b82a08e0a0bc33cc45081c7324eef18637d18c0`, 11,694 bytes;
- Proposed destination `data-collection/phase2g/README.md` — **already occupied** by the different, newer human-friendly Phase 2G navigation file, Git SHA `b121260c72026a96908e44d608affd3b11f694aa`.

A naive old→new move would overwrite the working navigation and potentially lose the distinct historical original from the active tree. This was NOT detected by the earlier “0 collisions within CSV” statement, because that check only compared future names against each other and ignored occupied targets.

**Correction on this review branch:** preserve existing `data-collection/phase2g/README.md` and route the historical original to a separate `data-collection/phase2g/legacy-lowercase/README.md` (future migration only). The different uppercase original remains mapped to `data-collection/phase2g/legacy-uppercase/README.md`, and the ACTIVE shell-only guardrail retains its dedicated `operations/` proposed path. No original science file moved in this step.

## New executable offline guard

- [`scripts/repo_waveb_migration_dryrun.mjs`](../../scripts/repo_waveb_migration_dryrun.mjs) reads the manifest and real checked-out Git tree without writes or network calls. Simulates the proposed future union (108 current-main original sources + 47 PR36-only sources) with all existing nonmoved files, compares all 108 original SHA and byte sizes, checks exact and case-insensitive path ownership, and records the no-destination 0-byte original stub as **MANUAL REVIEW / NOT AUTOMATIC DELETE**.
- The scanner also inventories `SEPmd/` and `artifacts/` textual references inside operational source/workflows/tests. These are **candidate dependencies**; text occurrences can be comments or fixtures, and computed/runtime paths or signed metadata need manual verification.
- [`tests/repo_waveb_migration_dryrun_v39.test.ts`](../../tests/repo_waveb_migration_dryrun_v39.test.ts) runs the strict simulation in V3.9 offline CI, failing if an original SHA/size changes or an existing target would be overwritten. Asserts `safe_to_bulk_move_now=false` as explicit project policy.

## Hard limits, next actions

The manifest and script **do not** grant authority to rename `SEPmd` or the 352 original `artifacts/` files. Both source names and source IDs are bound by existing preflight, manifest, signed AUTH, original P25 custody and unmerged PR36. The Oct4/Oct15 snapshot branches remain intact. The October 15 root-only cleanup is complete; scientific path migration remains an **atomic future job** involving reference/source tests, PR36 reconciliation, 460 original identity checks, macOS casefold handling and fresh full CI.

The original P25 historical billed 231 vs received 229 delivery gap and formal HOLD remain unchanged. No Replit AI Agent, provider paid call, deployment, SQL/object storage or retention mutations were attempted.

**Exact next session:** Verify four fresh CI checks for this review branch; inspect the scanner's operational-line evidence. Use it to classify executable path consumers before making **any** physical scientific-file move.
