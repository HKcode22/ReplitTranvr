# Wave C1 — physical experiment reorganization and V3.9 navigation checkpoint

**Date:** October 15, 2026 PDT. **Branch:** `repo-wavec1-navigation-20261015` (separate review branch). **Tracked issue:** [#47](https://github.com/HKcode22/ReplitTranvr/issues/47). **Baseline main:** `b4f147750662e9636a354aa271d373352d0069be`. **Original tree:** `56c74dc9ac88313bcb9ad25a09b8a7df042649f1`.

## Why
The owner found the reorganized repo hard to use despite preserving all scientific blobs: Plan/Log separated, repeated Phase 2G folder names, an unexplained 0-byte audit stub, many historic AUTH/receipt files, outdated descriptions, and one root `experiments/` item. This cleanup intentionally includes one reversible physical code move, not simply README navigation.

## Actual changes
1. New [Study Hub](../../data-collection/STUDY_HUB.md) displays original Plan, Implementation Log and Evidence Ledger together as links, without changing their source bytes or file locations. [Folder Guide](../../data-collection/FOLDER_GUIDE.md) explains raw receipts, human-written reports, duplicate-looking phase names, `other/`, `docs/history/`, AUTHORIZE history and the empty audit file.
2. Move the single research-only file `experiments/phase2g_rehearsal/prospective_billed_gap_research_only_v39.ts` to `data-collection/analysis/prospective_billed_gap_research_only_v39.ts` **without changing Git blob `30752e1b05a28912b51d8803656dccf49e78bed2`**, update the existing direct Vitest import and add an [analysis README](../../data-collection/analysis/README.md). No runtime code imports were found in the inspected direct focused test and the production module's explicit exclusion assertions remain unchanged. The old directory disappears because Git does not preserve empty directories.
3. Refresh the root, Start Here, detailed data-collection index, Plan, Implementation Log, historical authorization and repository-maintenance navigation. Correct factual old notes: Wave B PR #46 is merged; P25 AUTH is in `data-collection/authorizations/`; the reference PDF moved; the Log has a relocated path.

## Strict boundaries
- Original **108 scientific sources** and **352 original machine evidence files** from Wave B, **32 historical AUTH JSON** records, P25 ledger and scientific Plan/Log are **not modified or moved**.
- The **empty** scientific audit file remains at `data-collection/history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md` with empty Git blob SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`; it never established a completed audit.
- `attached_assets/`, `client/`, `server/`, `shared/`, `scripts/`, `.github/workflows/`, `vite.config.ts`, runtime, backups, live credits, SQL, object storage, signed historical values and branch refs are unchanged.
- Original YSSY P25 outcome stays **231 billed / 229 received, failed/DELIVERY_GAP**. Gate 3 remains separate [draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36); published Replit parity is not certified. Do not use Replit AI Agent.

## Review/CI acceptance — finish before merge
- [ ] GitHub branch compare must show only documentation/index changes, a Git-identity-preserved offline experimental source move and its one test import change. Zero changes to source ledgers, 460 originals, AUTH JSON, application runtime, asset alias or GitHub Actions.
- [ ] Resolve and case-check all new local Markdown navigation links, test macOS casefold paths.
- [ ] Run branch-head no-provider workflow(s), TypeScript, Vitest, lint/build and scientific path integrity. Historical successful main [run 38829219036](https://github.com/HKcode22/ReplitTranvr/actions/runs/38829219036) is **not** sufficient proof for the new commit. Prior red-X icons remain historical.
- [ ] Review draft PR separately before merging. **No auto-merge.**
- [ ] Future C2 classification of AUTH/receipt status, C3 `attached_assets` imports/assets audit, C5 exact branch/ref CSV and individually authorized deletion list. No blanket deletion, ZIP purge or Git history rewrite.

## Storage / why archive rather than delete
The audited main logical tracked-content sum is approximately **60.6 MiB**; REST repo summary is approximately **59.8 MiB** and is not a free-quota figure. The preserved unreviewed historical ZIP alone is **34,226,449 bytes**. `data-collection/` is about **6.74 MiB** while authorization JSON are roughly **31 KiB**. Deleting historical signatures saves negligible storage; historical Git blobs remain reachable via prior commits and snapshots unless history is rewritten, which is **not** authorized.

**Next session:** Check this draft PR's exact head/CI and diff. Keep the pre-migration recovery ref `archive/pre-scientific-directory-migration-20261015` (reported `c91eccb519c252b0a8756e1f0bc950e31af1d7b3` in Issue #47) and Gate 3 PR36. Do not merge until direct tests are verified.
