# 2026-10-15 — Root legacy AI review, original Plan PDF and ZIP safely relocated

**Review-only branch:** `repo-oct04-waveb-root-reference-packages-20261015`, based on `main=cc2c0e1b62531c05379cc600dbc9d0fa84b269d4` (after merged PR41). Original October 4 issue [#24](https://github.com/HKcode22/ReplitTranvr/issues/24) called for final clean root and recoverable pre-reorganization state.

**Two verified original snapshots untouched:** `archive/pre-reorganization-20261004` @ `947ec656b21f91dd9f267e794e1d61439872853b`; `archive/pre-reorganization-20261015` @ `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.

## Concrete 3 root-file changes (no deletion of these files)

1. `gptP0analyze4.md` → `docs/history/phase0/reviews/gptP0analyze4.md`, original SHA `ed76774bae16866ca58752da6237f3eb19cde5ff` and 26,391 bytes. Last full CI reference scan reported no executable app consumer of this exact filename, only the repository cleanup preservation test; updated the test to preserve/match new path.
2. `V3.9_DataCollectPlanCurrent.pdf` → `data-collection/plans/reference-pdfs/V3.9_DataCollectPlanCurrent.pdf`, original SHA `b81436b4509b4dc1fa86f60755feb6de15c1befd` and 300,288 bytes. **Opaque/unverified PDF rendition; not declared current authoritative or duplicative.**
3. `zipFile.zip` → `docs/history/unreviewed-archives/zipFile.zip`, original SHA `114bdc2df7b78ffa36d4d4ad310b9b870075183d`, size 34,226,449 bytes. **No extraction or claim about ZIP contents, privacy or obsolescence.** The intact binary was moved by Git blob identity, not parsed.
4. [Machine-verifiable old/new SHA receipt](manifests/2026-10-15_OCT04_OLD_ROOT_PDF_ZIP_HISTORY_MOVES.csv), updated old-root protection test (now 14 exact archive/root moves), Plan navigation, root homepage and history index.

These moves are a real directory cleanup, but do not imply scientific signed path changes or provider deployment. No active experiment code, original `SEPmd/`, `artifacts/`, `attached_assets/`, running Gate3 PR36, AUTH, P25 original delivery-gap status (231 billed/229 received), Replit AI Agent, live SQL/object storage/retention, or provider call touched.

**Before merge:** require 4/4 exact-new-head no-provider CI success, verify three Git SHA 1:1 renames and root absences, verify current link targets. **Still incomplete:** full `SEPmd` / `artifacts` physical migration is held behind signed path bindings and atomic source/PR36 reconciliation.
