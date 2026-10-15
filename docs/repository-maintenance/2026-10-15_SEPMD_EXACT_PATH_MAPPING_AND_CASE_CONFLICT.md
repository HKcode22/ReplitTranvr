# 2026-10-15 — Full SEPmd → data-collection proposed migration map (main + Gate3 draft)

**This is a dry-run MANIFEST, not a rename, migration, or approved deletion.** Two GitHub recursive trees were fetched and checked by exact commits:

- `main=f5b1347b7b9aebd6830302394ea2cc5775aedbf4` → **108** `SEPmd/` files.
- Unmerged PR36 `318e2c3b8223bfc417757dbe571883aecdbca589` → **150** `SEPmd/` files.
- Their path union → **155** candidate paths in [complete manifest](manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv) containing original Git blob SHAs, byte sizes, status in each tree, proposed destinations, category, and move hold reasons.
- Proposed destination *casefold collisions within this manifest*: **0**. **2026-10-15 correction:** the original manifest still had **one collision with an existing repository file**: `SEPmd/phase2g/README.md` → `data-collection/phase2g/README.md`. That target was already the new Wave A navigation index and would have been overwritten. Its destination is now **`data-collection/phase2g/legacy-lowercase/README.md`**. [An executable full existing-tree collision check](../../scripts/repo_waveb_migration_dryrun.mjs) is now provided; run CI before trusting it. This is still NOT migration authorization.

## Confirmed case-sensitivity hazard

The repository has **`SEPmd/PHASE2G/README.md`** and **`SEPmd/phase2g/README.md`**. They are distinct tracked files in Git and collide on the same canonical path on default case-insensitive macOS checkout behavior. Simple lowercase/case-only bulk rename is unsafe. In this proposal the **two historically conflicting uppercase index/amendment files** have distinct proposed paths under `data-collection/phase2g/legacy-uppercase/`, while **the ACTIVE `OPERATOR_SHELL_ONLY_GUARDRAIL.md` goes under `data-collection/phase2g/operations/`** to remain prominent. The original lowercase folder becomes `data-collection/phase2g/`.

This separation is a future path candidate, **not** an endorsement that either conflicting historical README is authoritative. Create a reconciled current index and preserve original dated historical assertions.

## More critical migration constraints

- Binding Plan and Implementation Log are original scientific records; keep exact bytes and independent SHA provenance.
- Ledger `V3.9_RUN_REPORTS_AND_EVIDENCE.md` is a **live source contract** for Phase2G preflight and draft Gate3 exact ledger-bound AUTH; moving it requires source and workflow changes in the same reviewed migration.
- `_AUTH_` JSON files are not scratch; missing PR36 P25 authorizations must be reconciled separately.
- `artifacts/` contains 352 tracked main files with numerous frozen hashed runtime references; its reorganization is a **separate dependency analysis**, not a blanket folder rename.
- Root empty `V3.9_Final_Document_Safety_Audit_2026-09-02.md` can be evaluated as a zero-content deletion candidate **only after checking its references**.
- All names, citations and cross-file links, test fixtures and SHA/hash-bound runtime inputs need a complete consumer update; do not modify historical signatures or silently change frozen source bytes.
- Not yet approved: production Replit deployment, main merge, PR36 integration, provider calls, data retention changes, any Stage3 paid canary.

## Operational checks before Wave B

1. Obtain the full current CI checkout reference-scan details, including 64 provisional unresolved operational/test literal references; classify truly missing vs obsolete/history/test references.
2. Search dynamic `path.join`, `path.resolve`, regex and computed filename references in GitHub workflows, runtime, source, and docs, not just literal tokens.
3. For every proposed old→new path, prove unique destination and preserved raw bytes/hashes; retain history and previous source-pointer resolution.
4. Generate atomic source/test/docs/ref update diff in independent cleanup branch, not within PR36, and rerun offline/typecheck/lint/build/database fixture tests.
5. Review final exact source SHAs and owner approval before production merge, publication or any future paid action.

**Current decision:** ALL proposed moves are HOLD. Collision-free destination planning and scientific approval are separate requirements. Only the zero-byte file is marked REVIEW_REMOVAL, not deleted.
