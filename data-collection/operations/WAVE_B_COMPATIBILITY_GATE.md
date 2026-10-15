# Wave B — Original scientific-path compatibility gate

**Decision, October 15, 2026: physical `SEPmd/` and `artifacts/` rename remains HOLD.** Wave A already provides usable access to all 460 original source/evidence paths. This gate identifies the *specific* dependencies to clear if a physical rename becomes worth performing.

## Exact consumers verified against merged main `4075cce8...`

| Current executable source | Original path | Type |
|---|---|---|
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts:310` | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | Preflight resolves ledger path for file IO |
| `server/lib/disruption/manifest_v3.ts:149` | `SEPmd/V3.9_DataCollectPlan_f.8.md` | Manifest registers binding Plan |
| `server/lib/disruption/manifest_v3.ts:150` | `SEPmd/V3.9_IMPLEMENTATION_LOG.md` | Manifest registers implementation source |
| `server/lib/disruption/manifest_v3.ts:151` | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | Manifest registers authority ledger |
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts:135` | `artifacts/preprobe-reference-freeze-record.json` | Default original frozen preprobe source |
| `scripts/v39_reports_index_v39.ts` | original evidence ledger | Report index reader references same source |

These are proven **examples**, not an exhaustive dynamic-path audit. Additional references exist in other code, tests, runbooks, workflows and signed records. Do not confuse a comment/citation with an executable path reader.

## How to finish Wave B without undermining the experiment

1. Review last-inspected Gate3 [draft PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) `318e2c3...` against current main. Its *standalone branch tree* lacks some original main records, including `AGENTS.md`, P25 signed AUTH and P25 runtime freeze, and its Plan and Implementation Log blobs differ. This is **not** a claim that GitHub's merge diff deletes them; do not build/deploy from an incomplete standalone branch.
2. Reconcile the proposed [155 original old→new paths](../../docs/repository-maintenance/manifests/2026-10-15_SEPMD_MAIN_AND_PR36_PATH_MAPPING.csv), future branch conflicts, ledger signatures, embedded filenames and all dynamic code consumers.
3. Resolve the original Mac case-insensitive collision: `SEPmd/PHASE2G/README.md` and `SEPmd/phase2g/README.md` are **different historic files**. Distinct future destinations are required; keep `SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md` prominent and active.
4. Make original source moves and all required code/defaults/tests/workflow/link changes **atomically on a reviewed branch**; preserve the original Git blobs and signed scientific identity. If filenames or signed hashes are themselves material, use a compatibility path rather than rewriting original records.
5. Run full offline CI, focused no-provider, disposable PostgreSQL, published identity read-only, casefold and all 460 source identity+link tests. Require an independent merge and release decision, and separate owner/operator authorization for any provider exposure or published runtime action.

**Recommendation:** Keep the Wave A navigation structure as the stable readable repository for now; pursue Wave B only after Gate3 integration dependencies are reconciled. Uninspected large ZIP and Plan PDF should not be deleted solely because they appear old. Retain historical YSSY P25 231 billed/229 received original delivery-gap status.
