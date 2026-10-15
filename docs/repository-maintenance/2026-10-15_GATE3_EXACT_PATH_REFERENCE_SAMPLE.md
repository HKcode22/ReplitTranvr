# 2026-10-15 — Partial live-source path consumer sample (Gate3 draft, SHA 318e2c3b)

**Method:** Fetched individual files from GitHub's exact unmerged PR36 source, not a broad code-search index. This is a **sample**, not a complete dependency scan. The complete repository scanner added at `scripts/repo_cleanup_reference_audit.mjs` must be executed on exact branches before any moves; it is static/literal and also does not establish all dynamic dependencies.

## Confirmed source lines from PR36

| Source path | Line | Observed literal | Why important |
|---|---:|---|---|
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts` | 135 | `artifacts/preprobe-reference-freeze-record.json` | preprobe experiment evidence loaded as path |
| `scripts/v39_phase2g_stage1_paid_preflight_v39.ts` | 310 | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | authority ledger |
| `server/lib/disruption/manifest_v3.ts` | 149 | `SEPmd/V3.9_DataCollectPlan_f.8.md` | binding plan registered as source |
| `server/lib/disruption/manifest_v3.ts` | 150 | `SEPmd/V3.9_IMPLEMENTATION_LOG.md` | implementation reference |
| `server/lib/disruption/manifest_v3.ts` | 151 | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | evidence ledger registered |
| `scripts/v39_reports_index_v39.ts` | 15 | `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | direct read-only report index loader |
| `server/routes_v3.ts` | 3 | `SEPmd/V3.9_DataCollectPlan_f.8.md` | source comment citation, not necessarily runtime read |

Source audit also fetched `gate3LedgerBoundSessionPreparation_v39.ts`, `gate3OwnedPreExposure_v39.ts`, `gate3ActualExecutionOwner_v39.ts`, `v39_gate3_owner_readonly_v39.ts`, `credit_canary.ts`, `v39_gate3_canary_v39.ts`, and `prepaidProbeWindow_v39.ts`. They did not contain **these particular direct root literal patterns** in the fetched text; that does **not** establish an absence of transitive references (e.g. imported ledger helper).

## Required validation prior to rename

- Follow helper imports and path.join / path.resolve / constant composition. Check literal refs in every `scripts/`, `server/`, `tests/`, `.github/`, generated artifact, lockfile and markdown.
- On a checkout of both `main` and the reviewed future PR36 integration point, run `node scripts/repo_cleanup_reference_audit.mjs --json`, write result outside tracked production artifact paths, review the unknown/missing operational references.
- Build a manifest with *every* original path, proposed target, manifest SHA, source code references, CI tests, documentation links, original scientific bytes/hash preservation and explicit rollback criteria.
- Re-run full typecheck, lint, full tests, build, offline safety CI, linked-path scan, and independently verified source/PUBLISHED runtime binding before any paid workflow.
- **No source/asset move or deletion has been authorized from this sample.**
