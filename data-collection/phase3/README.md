# Phase 3 — integration review landing (NOT an authorized live gate)

**Draft integration from [Gate 3 PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36), original source SHA `318e2c3b8223bfc417757dbe571883aecdbca589`, onto current organized `main` `ebdfbbf19d7d52121f0c9b3317ac1da2ad290524`.** This landing page is proposed only, not merged into default main, published to Replit, migrated into production SQL, or approved for provider billing.

- [Phase 3 START HERE](START_HERE.md) — unchanged historical source from the draft with 30 preserved phase3 blobs. Historical references to `SEPmd/` in a source may point to a prior layout and must be interpreted with [the exact mapping](../../docs/repository-maintenance/manifests/2026-10-16_GATE3_PR36_SOURCE_PATH_REVIEW.csv).
- [Oct 15 Gate 3 owner wiring and paid seal checkpoint](2026-10-15_GATE3_ACTUAL_EXECUTION_OWNER_WIRING_AND_PAID_RELEASE_SEAL_CHECKPOINT.md).
- [Oct 15 GitHub Actions↔published callback read-only admission checkpoint](2026-10-15_PHASE3_GATE3_GITHUB_ACTIONS_CALLBACK_AUTOMATION_READONLY_CHECKPOINT.md).
- [Oct 15 real host/account source pre-exposure checkpoint](2026-10-15_GATE3_REAL_PUBLISHED_HOST_PROVIDER_ACCOUNT_PREEXPOSURE_INTEGRATION_REPORT.md).
- [Current original Plan](../plans/V3.9_DataCollectPlan_f.8.md), [original implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md), and [immutable ledger](../evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md) are preserved at their existing identical Git blobs.
- [Cross-branch source provenance and safety checkpoint](../../docs/repository-maintenance/2026-10-16_GATE3_MAIN_BASED_INTEGRATION_CHECKPOINT.md).
- [Phase 2 owner-approved qualified early-pilot scope](../phase2g/amendments/2026-10-14_APPROVED_PHASE2_QUALIFIED_EARLY_PILOT_EXCEPTION_AND_PHASE3_BOUNDARY.md) — an administrative predecessor, **not** original strict Gate 2 PASS or a Gate 3 spend token.
- [Eleven-source exact PR #37 qualified-closeout custody index](../../docs/repository-maintenance/manifests/2026-10-16_PHASE2G_PR37_QUALIFIED_CLOSEOUT_CUSTODY.csv) — five already matched, six newly preserved.

**Engineering state:** Gate 3 canary source/tests are being reconciled and reviewed under a separate GitHub draft. A passing no-provider CI means only the particular Git source passed tests, **not** that Gate3/0.5/4 live passed. Legacy Gate3 paid canary remains hard NO-GO; additive SQL V0065 is only a draft until a separately approved production migration.

YSSY P25 remains **231 billed / 229 received**, original formal `FAILED/DELIVERY_GAP`. Prospective science proposals cannot change its status, and owner authorization for a new paid experiment remains a separate gate.

### Gate 3 SQL release control — not yet approved

The additive `V0065__phase3_gate3_prepaid_canary_owner_v39.sql` is retained byte-identically under [`migrations/staged/`](../../migrations/staged/V0065__phase3_gate3_prepaid_canary_owner_v39.sql), **not** `migrations/current/`. Normal full-application `applyBootMigrations()` scans `migrations/current/`, so this draft must not auto-apply V0065 merely from a checkout/startup. A GitHub no-provider CI step applies the staged SQL **directly via psql** to the isolated disposable `localhost:5432/v39_ci` PostgreSQL 16 fixture after ordinary boot is tested. It **never copies V0065 into `migrations/current/`**, even temporarily, and its [exact-head offline suite passed](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981600721). This is not production migration authorization. Future controlled activation requires a separate reviewed/authorized migration release PR, fresh runtime parity, and operator-approved deployment. No direct production `--apply` until that boundary is satisfied.

### Replit local source-parity investigation

The user confirmed a clean local Replit workspace on `release/p25-reviewed-publish-20261012` at `bb44fc1d...`, which is not the same commit as GitHub `main`, Gate3 PR54 or the published Replit receiver. Two local P25 commits are not currently exposed by upstream GitHub; `origin/main` ahead/behind output may be stale. Follow the [read-only local Git-history reconciliation](../../docs/repository-maintenance/2026-10-16_GATE3_REPLIT_LOCAL_HISTORY_FORENSICS_NO_MUTATION.md) before any fetch/reset/rebase, branch deletion or Replit publishing.
