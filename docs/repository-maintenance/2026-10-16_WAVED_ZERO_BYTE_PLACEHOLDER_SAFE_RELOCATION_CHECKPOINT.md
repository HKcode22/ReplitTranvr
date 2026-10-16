# Wave D — Empty historical audit placeholder consolidation

**2026-10-16 PDT. DRAFT / DO NOT MERGE until exact-head no-provider CI succeeds and owner approves the additional source-path change.**

## Why this exists
Owner found `data-collection/history/zero-byte-audit-stubs/` confusing. It was a folder solely for one empty Markdown file named `V3.9_Final_Document_Safety_Audit_2026-09-02.md` — **0 bytes, no actual safety audit report**. It is nevertheless one of 108 historically preserved science-source Git entries. It is incorrect to claim a completed audit; also unwise to silently drop an indexed original.

## Proposed exact physical move (no source deletion)
- Before: `data-collection/history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md`
- After: `data-collection/plans/history/V3.9_Final_Document_Safety_Audit_2026-09-02.md` — the already existing historic-plan folder.
- Exact Git content SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, size **0**, file mode **100644**; original source byte identity remains unchanged.
- Old `data-collection/history/zero-byte-audit-stubs/` no longer appears in GitHub working-tree navigation.

## Custody protocol
The original [Wave B 460-source manifest](manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv) remains unchanged, because it is an accurate historical account of the Oct 15 first physical migration. A [new one-row second-hop addendum](manifests/2026-10-16_WAVED_EMPTY_PLACEHOLDER_SECOND_HOP.csv) explains the subsequent empty-blob relocation. The offline original-identity verifier now checks **460 original records** against the first-hop manifest plus this strictly bounded one-row second hop, with an independent Vitest regression for missing old folder and identical SHA, byte count and mode. The [source catalog](../../data-collection/sepmd-source-catalog.csv) and [108-source index](../../data-collection/ALL_SEPMD_FILES.md) link the latest physical path.

## Baseline and boundaries
- Baseline: [already merged Wave C4 main](https://github.com/HKcode22/ReplitTranvr/commit/0ce56fcf483ee012c3b30c4579652cb608ee2f5e) `0ce56fcf483ee012c3b30c4579652cb608ee2f5e`; [post-merge CI](https://github.com/HKcode22/ReplitTranvr/actions/runs/38887276980) SUCCESS.
- Original old science/evidence records remain byte-identical (108 + 352); 32 signed historical AUTH JSONs, binding V3.9 Plan/Implementation Log, P25 ledger and provider receipts are untouched.
- Pre-reorganization recovery ref `archive/pre-reorganization-20261015` remains at `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`.
- **YSSY P25 remains 231 billed / 229 received, FAILED/DELIVERY_GAP**, not retroactively Gate2 PASS.
- No Replit AI Agent, live deployment, paid provider call, SQL/object storage mutation, PR36 merge, branch deletion or ZIP extraction.

## Review gates / handoff
- [ ] Exact-final-head all four no-provider GitHub Actions success.
- [ ] Original 460/460 first-hop+second-hop science/evidence identity test success.
- [ ] Git tree old empty folder absent; 0-byte blob SHA unchanged; navigation resolves; no path casefold collision.
- [ ] Separate owner merge approval for *Wave D*. A green test does not itself authorize a new scientific-source path to be merged.
