# 2026-10-15 — Main ↔ PR36 tracked-file change and deletion safety check

**Read-only comparison:** `main=f5b1347b7b9aebd6830302394ea2cc5775aedbf4` against **unmerged draft** `PR36=318e2c3b8223bfc417757dbe571883aecdbca589`. No inference of production deployment. Both recursive trees returned `truncated=false`.

## Verified change counts

- Main tracked file blobs: **1162**.
- PR36 tracked file blobs: **1271**.
- **120** newly named paths; **20** differing blob contents on common paths; **11** paths absent from PR36.
- Every main blob appears in [main inventory](inventories/2026-10-15_MAIN_TRACKED_FILE_INVENTORY.csv), every changed PR36 path in [PR36 delta inventory](inventories/2026-10-15_PR36_PATH_CHANGES_RELATIVE_TO_MAIN.csv).
- No deletions/renames were made by this cleanup audit.

## PR36 paths absent relative to main — DO NOT BLINDLY MERGE OR 'CLEAN' THESE

- `AGENTS.md` — **OPERATOR SAFETY GUARDRAIL**
- `artifacts/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json` — **potential binding/forensic reference; verify provenance**
- `artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json` — **potential binding/forensic reference; verify provenance**
- `SEPmd/phase2g/reports/2026-10-11_P25_120MIN_REAL_WALLCLOCK_REHEARSAL_HANDOFF.md` — **potential binding/forensic reference; verify provenance**
- `SEPmd/phase2g/reports/2026-10-11_P25_OCT12_8PM_RELEASE_PACKAGING_PLAN_AND_UNWAIVABLE_GATES.md` — **potential binding/forensic reference; verify provenance**
- `SEPmd/phase2g/reports/2026-10-11_P25_P01_P20_NEXT_DAY_RELEASE_MATRIX.md` — **potential binding/forensic reference; verify provenance**
- `SEPmd/phase2g/reports/2026-10-12_P25_NO_REPLIT_AGENT_OPERATOR_SHELL_RELEASE_HANDOFF.md` — **potential binding/forensic reference; verify provenance**
- `SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json` — **potential binding/forensic reference; verify provenance**
- `tests/phase2g_p25_exact_quarantined_history_budget_gate_v39.test.ts` — **potential binding/forensic reference; verify provenance**
- `tests/phase2g_p25_frozen_real_science_loader_v39.test.ts` — assess dependency/history
- `tests/phase2g_p25_published_receipt_workflow_dispatch_contract_v39.test.ts` — assess dependency/history

**Important:** A Git path's absence in a draft tree does **not** prove its evidence is lost forever; earlier Git history and snapshot may retain it. It also does not prove removal is safe. Content/functional equivalence and active path contracts require source review.

## Review priority

1. **Block loss of `AGENTS.md`**: it contains the standing no-Replit-AI-Agent and no-automatic-live-mutation policies. No approved cleanup should erase this operator policy. Before PR36 eventual integration, retain a current canonical guardrail or explicit reviewed replacement.
2. Preserve/read P25 AUTH and runtime/freeze artifacts referenced by historical run ledgers; do not re-create, change, or reinterpret signatures/hashes.
3. Investigate changes to `SEPmd/V3.9_DataCollectPlan_f.8.md`, `SEPmd/V3.9_IMPLEMENTATION_LOG.md`, and `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` in PR36: proposed changes are not automatically approved for scientific history. New Phase3 ledger reads must be included in rename inventory.
4. Don't delete old `SEPmd/PHASE2G/` because its entries disagree with later `SEPmd/phase2g/`. Classify both as historical/status-specific, then publish authoritative dated index.
5. No one should interpret this audit as approval to merge PR36, delete historical source objects, modify GitHub workflows, or authorize a Gate3 paid canary.

**Next step:** scan all literal refs in main and PR36 actual source, not merely filename matches; resolve every protected dependency, dry-run moves and tests on a nonproduction branch.
