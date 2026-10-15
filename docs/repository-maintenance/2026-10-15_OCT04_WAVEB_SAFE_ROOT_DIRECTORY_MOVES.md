# 2026-10-15 — Actual October 4 structural folder cleanup, bounded first step

**User intention:** [Oct 4 plan (Issue #24)](https://github.com/HKcode22/ReplitTranvr/issues/24) called for real folder moves, selective safe deletion, and an intact original main snapshot, not only more README indexes.

## Independently verified original recovery points

- [Oct 4 original snapshot](https://github.com/HKcode22/ReplitTranvr/tree/archive/pre-reorganization-20261004) exact `947ec656b21f91dd9f267e794e1d61439872853b`.
- [Oct 15 pre-Wave-A snapshot](https://github.com/HKcode22/ReplitTranvr/tree/archive/pre-reorganization-20261015) exact `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.
- Current parent `main=2d546fe2a28e9145c2d59a576ecbbc9ab956d5d3`, both backups unchanged. A branch is a point-in-time recovery ref, not mathematically immutable unless protected.

## Actual structural modifications only in new review branch

- `researchPapers/`: 8 literature Markdown extracts moved byte-identically into `data-collection/research-papers/`, original Git SHA preserved; ninth old README moved and text updated as index.
- `screenshots/`: 4 UI JPEGs moved byte-identically into `docs/history/travnr-ui-screenshots/`; visual archive index added.
- `.agents/`: obsolete 153-byte generated metadata `agent_assets_metadata.toml` (old Git blob `97020d7ef9d22aeea4e8bbe341685dcfd9742028`) **deleted from tracked working tree**; `.gitignore` already ignores this generated-tool folder and prior original snapshot retains its contents. It is Replit agent tooling metadata, *not* application source.
- [Full original → new SHA mapping](manifests/2026-10-15_OCT04_SAFE_ROOT_MOVES.csv) and read-only exact-blob regression `tests/repo_oct04_safe_root_structural_moves_v39.test.ts`. Root README and current navigational files updated. Read-only source-reference scanner now protects the new research location instead of the old top-level name.

## Safety and unfinished areas

No original `SEPmd/` or `artifacts/` content moved or deleted, nor `attached_assets/` (required by Vite alias), runtime client/server code, signed Plan, Implementation, AUTH or P25 source, provider, CI paid dispatch, Replit publish, database or callback store. Historical YSSY P25 231 billed/229 received delivery gap remains original. These are **real root removals**, not the full scientific phase migration.

**Remaining:** original `SEPmd/` still exists until a reviewed **atomic path migration** of source/ledger/workflow/runtime references and unmerged PR36 source records. Original Issue #24 explicitly warned a bulk move may damage paid preflight and signed SHA custody. Next obtain exact CI on this structural branch, inspect source/path references, then merge only if no active references broken; preserve old archive branch refs without force pushes.
