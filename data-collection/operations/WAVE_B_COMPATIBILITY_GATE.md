> **Current implementation reference (October 15, 2026):** The full physical 460-original-blob migration has been implemented and independently verified on [PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46). Its [original-to-relocated SHA/size/mode manifest](../../docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv) records exactly what was moved without rewriting historical science. The last completed source-reader audit head `a4d19f9f446118e034051e76e87f86c43ba9ac1d` passed all four no-provider workflows (1,134 tests passed, 19 skipped); future commits require their own CI. **GitHub merge status must be checked on PR #46; GitHub tests do not prove published Replit source parity or authorize paid work.** The sections below preserve the *original pre-migration decision and dependency inventory as historical evidence*, not a current assertion that relocation has not been implemented.

# Wave B — Original scientific-path compatibility gate

**Historical pre-migration decision (superseded as implementation status, not as release authorization):** Physical `SEPmd/` and `artifacts/` rename was placed on HOLD pending compatibility evidence. PR #46 subsequently implemented the actual isolated 460-blob relocation. The dependency table below documents what had to be repaired and is not an inventory of remaining active broken readers.

## Pre-migration old-path consumers verified against older main `4075cce8...`

| Current executable source | Original path | Type |
|---|---|---|
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts:310` | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | Preflight resolves ledger path for file IO |
| `server/lib/disruption/manifest_v3.ts:149` | `SEPmd/V3.9_DataCollectPlan_f.8.md` | Manifest registers binding Plan |
| `server/lib/disruption/manifest_v3.ts:150` | `SEPmd/V3.9_IMPLEMENTATION_LOG.md` | Manifest registers implementation source |
| `server/lib/disruption/manifest_v3.ts:151` | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | Manifest registers authority ledger |
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts:135` | `artifacts/preprobe-reference-freeze-record.json` | Default original frozen preprobe source |
| `scripts/v39_reports_index_v39.ts` | original evidence ledger | Report index reader references same source |

These are proven **examples**, not an exhaustive dynamic-path audit. Additional references exist in other code, tests, runbooks, workflows and signed records. Do not confuse a comment/citation with an executable path reader.

## Current Gate3 original P25 ledger append hold

The latest independently inspected Gate3 PR36 standalone ledger is an exact prefix of current main's original ledger but **omits its final 31-line `AUTH-20261013-P2G25` append**, which binds the original P25 authorization JSON, runtime record and historical non-execution restrictions. An ordinary GitHub PR merge may preserve this append; standalone draft branch contents are not a valid substitute for present main custody. The [offline P25 ledger preservation test](../../tests/repo_waveb_p25_ledger_append_guard_v39.test.ts) must pass in any future Gate3/science migration, and the [dated review checkpoint](../../docs/repository-maintenance/2026-10-15_WAVEB_P25_LEDGER_APPEND_PRESERVATION_CHECKPOINT.md) records the exact risk.

## How to finish Wave B without undermining the experiment

1. Review last-inspected Gate3 [draft PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) `318e2c3...` against current main. Its *standalone branch tree* lacks some original main records, including `AGENTS.md`, P25 signed AUTH and P25 runtime freeze, and its Plan and Implementation Log blobs differ. This is **not** a claim that GitHub's merge diff deletes them; do not build/deploy from an incomplete standalone branch.
2. Reconcile the proposed [155 original old→new paths](../../docs/repository-maintenance/manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv), future branch conflicts, ledger signatures, embedded filenames and all dynamic code consumers.
3. **Fix the previously missed existing-target collision:** the initial 155-path mapping attempted to move original `SEPmd/phase2g/README.md` onto the already-created **different** `data-collection/phase2g/README.md` navigation file. The updated plan now reserves `data-collection/phase2g/legacy-lowercase/README.md` for that historical source and leaves the current working index intact. Use [the read-only full-tree collision simulator](../../scripts/repo_waveb_migration_dryrun.mjs) (`node scripts/repo_waveb_migration_dryrun.mjs --json --strict`) before any move.
4. Resolve the original Mac case-insensitive collision: `SEPmd/PHASE2G/README.md` and `SEPmd/phase2g/README.md` are **different historic files**. Distinct future destinations are required; keep `SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md` prominent and active.
5. Make original source moves and all required code/defaults/tests/workflow/link changes **atomically on a reviewed branch**; preserve the original Git blobs and signed scientific identity. If filenames or signed hashes are themselves material, use a compatibility path rather than rewriting original records.
6. Run full offline CI, focused no-provider, disposable PostgreSQL, published identity read-only, casefold and all 460 source identity+link tests. Require an independent merge and release decision, and separate owner/operator authorization for any provider exposure or published runtime action.

**Historical recommendation (before PR #46):** Keep Wave A navigation stable pending compatibility reconciliation. For present release status, refer to [PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46), its exact CI runs, the original blob identity manifest and independent operator authorization. Uninspected large ZIP and Plan PDF should not be deleted solely because they appear old. Retain historical YSSY P25 231 billed/229 received original delivery-gap status.
