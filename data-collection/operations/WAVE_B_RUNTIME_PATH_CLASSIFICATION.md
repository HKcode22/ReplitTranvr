# Wave B runtime-path compatibility — review classification

**Draft PR #46 only, not merged or deployed.** The relocation is real in the isolated Git tree: 108 original scientific files + 352 original evidence files were moved to `data-collection/` with identical Git blob SHA/bytes/modes. Root `SEPmd/` and `artifacts/` no longer have tracked original-source blobs *in the draft*.

## Source paths and dynamic outputs are distinct

- **Immutable historical scientific identity:** JSON fields, project-lead decisions, original event ledger entries, frozen AUTH/source names and hashes must retain their *recorded string values* even though the bytes now live at a mapped location. In validation, compare against the historical path and hash, but read the mapped original blob. Do not rewrite frozen JSON. The `phase2Compact6_v39.ts` code uses an explicitly restricted historical-to-stored source mapping.
- **Active static inputs:** explicit source file readers, authorization/ledger/preprobe scanner defaults and CI frozen artifact reads must use the new on-disk paths. Specific repaired examples: scientific Plan/Log, original P25 ledger, preprobe, traffic reference, receipt writer, P2G10 incident, schema inventory, and pinned baseline. `tests/repo_waveb_critical_operational_readers_v39.test.ts` checks key consumers.
- **Newly produced runtime outputs:** existing `artifacts/phase2g-*.log`, `artifacts/*.status.json`, `artifacts/*.jsonl`, job artifacts and other ephemeral outputs are **not** among the 352 historical moved blobs. They may still use a transient `artifacts/` directory created at runtime. The directory is not a restored tracked source collection. Do not interpret or automatically move outputs as signed archival evidence.
- **Historical owner scripts:** past P2G helper shell scripts include old literal inputs and old expired authorization epochs, branch assertions or deprecation guards. Retain them as forensics, **not** as executable instructions for a new Stage1 paid run. Do not bypass guardrails just to make an old script re-run. Review any restoration under separate prospective AUTH/source/release authorization.
- **Migration/audit utilities:** the pre-move `repo_waveb_migration_dryrun.mjs` deliberately refers to the pre-move directory names; it is **not** a post-move acceptance test. Use the new exact identity verifier and source catalog instead. `repo_waveb_gate3_record_reconcile.mjs` must compare the relocated candidate sources against the original PR36 historical path names.

## What the safety workflows show and do not show

PR46 commit `2ec540c2a74f2a16e86a072eadb10edd791b33dd` completed all four no-provider workflows: full V3.9 offline suite **168 passed, 3 skipped / 1,124 tests passed, 19 skipped**, focused suite **172/172 passed**, disposable PostgreSQL receiver fault suite **success**, and published receiver identity read-only check **success**. This proves tested static and scientific compatibility on that exact Git head; it is not published Replit source-parity certification and does not authorize a paid run.

An earlier full suite printed **226 text lines in 63 source/workflow files** matching `SEPmd/` or `artifacts/`. This is a deliberately broad *literal inventory* containing new relocated `original-artifacts/` strings, historical signed paths, output patterns, comments and actual old readers. The raw number is **not** the count of broken active readers. Do not mass-replace every `artifacts/` substring: that would rewrite signed values and output paths. Continue targeted type-by-type assessment. The safety workflows must run again against the final exact head before considering merge.

## Release boundary

No GitHub main merge, no Replit republish, no paid provider run, no database/object-store changes, no scientific relabeling. Original P25 remains **231 billed / 229 received, failed/DELIVERY_GAP**. Keep pre-migration snapshot and PR36 separate. If a version of an old user-triggered script is required later, rewrite and test its file-reader paths under a new, explicitly approved operation; do not reuse time-expired AUTH.

Reference: [full dated checkpoint](../../docs/repository-maintenance/2026-10-15_WAVEB_PHYSICAL_RELOCATION_AND_SCIENTIFIC_COMPATIBILITY_CI_CHECKPOINT.md), [complete blob manifest](../../docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv).
