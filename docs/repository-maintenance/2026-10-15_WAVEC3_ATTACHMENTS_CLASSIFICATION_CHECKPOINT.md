# Wave C3 — original attached assets classification and physical relocation (2026-10-15; DRAFT)

**Baseline main:** `b4f147750662e9636a354aa271d373352d0069be`. **Branch:** `repo-wavec3-asset-classification-20261015`. **Review only:** no merge, deployment, paid provider call, Replit AI Agent, database/blob mutation, branch or Action-run deletion.

## Problem and approved boundary

The root `attached_assets/` mixed frontend PNGs, pasted historic development-request texts and a legacy ZIP. This was confusing, especially alongside the existing `client/src/assets/images/`. Separate **file type and role**, not old directory name:

- **18 PNG originals / 1,896,542 bytes** physically relocated to the existing `client/src/assets/images/`, with unchanged exact original Git SHA, mode, bytes and filenames. **No source code imports changed**.
- **23 TXT originals / 135,160 bytes** physically relocated to `docs/history/travnr-pasted-prompts/`. Preserve every historical filename, including duplicates; past pasted instructions are not currently binding.
- **1 ZIP / 584,612 bytes** physically relocated to `docs/history/unreviewed-archives/`. Original bytes preserved, **not opened or judged redundant**.
- **42/42** original Git blobs preserved. Former root `attached_assets/` has **zero tracked files** on this proposed tree. No original content was deleted from Git history.

[Full exact original-to-new filename, blob SHA and size receipt](manifests/2026-10-15_WAVEC3_ASSET_42_BLOB_RELOCATION.csv).

## Dependency review and changes

Vite `@assets` formerly resolved root `attached_assets/` but must now resolve `client/src/assets/images/` instead. The Vite/React application build must pass. Read-only source checks at Oct 15 inspected client TypeScript/TSX entry/pages/components/lib, 150 server sources, 161 scripts, 175 tests and all 13 workflows, plus key configs, for literal `attached_assets`, `@assets` and airplane icon usage. Found the Vite alias and two safety contracts requiring updates: `scripts/repo_cleanup_reference_audit.mjs` protected roots and `tests/repo_oct04_safe_root_structural_moves_v39.test.ts`; also update the scanner regression assertions. Literal scans cannot prove absence of dynamic runtime paths or off-repo Replit dependencies. No Cloudflare or paid provider interfaces touched.

This is a **draft-only structural move**. The published Replit application has **NOT** been updated or proven runtime-identical. No original YSSY P25 state is rewritten (231 billed / 229 received stays FAILED/DELIVERY_GAP). Signing/authorization source ledgers, raw original scientific machine evidence, Plan/Implementation Log, scientific gate records and the pre-migration archive remain untouched.

## Independent draft dependency

PR [#48](https://github.com/HKcode22/ReplitTranvr/pull/48) relocates a separate offline `experiments/` file into `data-collection/analysis/`; PR [#49](https://github.com/HKcode22/ReplitTranvr/pull/49) groups Phase0/1 history under `data-collection/`. **Both remain unmerged**. These three draft reviews are independent based on the same `main`, so shared READMEs need merge-order rebasing and link checks; no automatic main merge.

## Industry guidance and honest limits

- [Vite's static asset handling guide](https://vite.dev/guide/assets.html): assets imported from source can live alongside sources, while public root assets serve a different purpose; keeping historical TXT and ZIP separate from application image files is a logical project policy, not a universal mandate.
- [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github): ideally under 1 GiB repository, and deleting current tree entries does not erase historical Git objects; never rewrite archival history to make the repo appear smaller without explicit owner approval.
- [FAIR data principles](https://doi.org/10.1038/sdata.2016.18): findable, indexed, provenance-rich research objects; no rigid required folder names.

## Verification gates

- [ ] Exact Git source SHA identity for all 42 moves, matching manifest and test.
- [ ] No remaining tracked `attached_assets/` and no new case-insensitive filename collisions.
- [ ] V3.9 Offline Safety (includes Vite build, TypeScript, lint, preservation tests) passes exact head; three P25 no-provider read-only suites pass exact head.
- [ ] Review root/history README links, legacy screenshots, ZIP custody and external runtime alias references.
- [ ] Owner review before integration. Absolutely no branch, evidence or Actions history deletion.

**Next session:** inspect [draft Wave C3 PR](https://github.com/HKcode22/ReplitTranvr/pulls), exact CI SHA, test output and Vite bundle. Compare Wave C1/C2 docs conflicts before any user-authorized sequential merges. Later evaluate specific old zero-ahead branches individually using issue #47 census, not from branch count alone.
