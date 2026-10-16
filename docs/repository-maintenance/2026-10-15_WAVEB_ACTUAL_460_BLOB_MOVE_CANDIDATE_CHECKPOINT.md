# October 15, 2026 — Wave B isolated actual 460-file relocation candidate

**Do not merge / do not deploy.** This is the first *real Git tree relocation* of all 108 original `SEPmd/` files and 352 original `artifacts/` files into organized `data-collection/` subfolders. It is intentionally isolated; original `main` remains at `c91eccb519c252b0a8756e1f0bc950e31af1d7b3` pending review.

## Method and proof available
- New CSV `docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv` lists **all 460** original paths, candidate paths, original blob SHA, byte size, mode, and bucket.
- Relocations reuse original Git blob IDs and original executable mode (no payload rewrite), including both formerly colliding upper/lowercase historical Phase2G READMEs and the zero-byte audit stub. Empty audit stub is **preserved** in `data-collection/history/zero-byte-audit-stubs/` for later review, not discarded.
- Updated 108-source and 352-artifact catalogs retain historical path and add current candidate path. Machine artifact subfolders grouped by original index bucket (Phase2F:180; Phase2G:150; other:22 including database-baseline).
- Navigation indexes are remapped to relocated file links, without replacing the distinct new `data-collection/phase2g/README.md` home page.
- `scripts/repo_waveb_verify_actual_move.mjs` and `tests/repo_waveb_verify_actual_move_v39.test.ts` perform real offline tracked-tree checks (SHA, bytes, executable mode, 460 count, absence of legacy root, case-fold target uniqueness).

## CRITICAL NOT DONE — blocked until atomic operational compatibility
- Original `server/lib/disruption/manifest_v3.ts`, `scripts/v39_phase2g_stage1_paid_preflight_v39.ts`, signed historical records, other scripts/workflows/tests may still read historical `SEPmd/` / `artifacts/` paths. The new tree is **not safe to merge or deploy** until those dependencies are updated and tested, including dynamic paths.
- Old physical migration dry-run and original-path safety tests intentionally fail closed if run unchanged on a renamed source tree; do NOT bypass them simply to get green CI. Change the contract only when code path consumers and signed identities are handled correctly.
- Gate3 [draft PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) prospective Plan/Log and code changes remain separate and unapproved; never replace current main's P25 ledger from its stale draft. [PR45](https://github.com/HKcode22/ReplitTranvr/pull/45) adds independent three-record comparison.
- P25 original 231 billed/229 received historical `DELIVERY_GAP` remains unchanged; original ledger P25 append must remain byte-identical after move. Neither the historical authority nor published release binding authorizes a new paid Gate3 run.

**Review checkpoints to complete:** verify full GitHub no-provider CI, reconcile fail-closed operational consumers and frozen source paths, ensure original P25 AUTH and runtime read with new path mapping without rewriting frozen content, verify rebuilt navigation and no broken local references, inspect branch vs PR36 prospective additions, then obtain independent merge/release decision. No provider charge, SQL mutation, Replit deployment, object deletion or AI Agent actions.
