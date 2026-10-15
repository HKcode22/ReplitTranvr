# ReplitTranvr — Aviation Data Collection & Experimental Evidence

This repository contains the Tranvr application, its V3.9 aviation data-collection research, experimental authorization and evidence records, and tests. **Research observations and a successful paid deployment certification are different outcomes.** Never run a paid canary from a README without exact live preflight and owner authorization.

> **This navigation README is a proposed docs-only improvement on an isolated October 15, 2026 cleanup-review branch, not a change to published production.** The original main branch did not contain a root README at the audited SHA.

## Start here

| Goal | Read |
|---|---|
| Repository cleanup policy and original approvals | [Issue #24](https://github.com/HKcode22/ReplitTranvr/issues/24) |
| Current cleanup safety assessment, exact inventory, and execution plan | [October 15 cleanup audit](docs/repository-maintenance/2026-10-15_PRE_GATE3_REORGANIZATION_AUDIT_AND_EXECUTION_PLAN.md) |
| Phase 3/Gate 3 latest **draft**, not deployed | [PR #36 START_HERE](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-pragmatic-science-and-checkpoints-20261012/SEPmd/phase3/START_HERE.md) |
| Phase 2G current/historical reports | [Phase 2G index](SEPmd/phase2g/README.md) |
| Historical original V3.9 protocol | [Plan f.8](SEPmd/V3.9_DataCollectPlan_f.8.md) |
| Historical implementation ledger | [Implementation Log](SEPmd/V3.9_IMPLEMENTATION_LOG.md) |
| Phase 2G/Gate 2 scientific fieldwork closeout (draft docs) | [PR #37](https://github.com/HKcode22/ReplitTranvr/pull/37) |
| Current operator safety constraints | [AGENTS.md](AGENTS.md) |

## Current branch-level status (October 15 snapshot)

- Released/default `main` is frozen at `f5b1347b7b9aebd6830302394ea2cc5775aedbf4` in this audit. The actual live Replit deployment needs its own runtime SHA verification.
- Phase 2G five-site observations are closed for research purposes, but formal original Gate 2 five-anchor acceptance remains **HOLD**. P25 YSSY's 231 billed / 229 received discrepancy remains documented, with no retroactive strict PASS.
- Phase 3 Gate 3 preparation is being developed in separate **draft PR #36**; the one-airport paid canary remains sealed/not certified. Do not run it from unreviewed source.
- `SEPmd/` and `artifacts/` are **existing compatibility-critical names**. The approved future name is `data-collection/`, but that migration has NOT happened on main or in this audit commit.

## Current repository areas

- `client/`, `server/`, `shared/`: current application and scientific processing code.
- `scripts/`, `tests/`, `.github/workflows/`: experiment and application operations, CI, and regression tests.
- `migrations/`: active versioned database baseline and migrations; do not move generically into experiment documents.
- `SEPmd/`: existing scientific plans, authorizations, Phase2G reports/incident records and more; historically mixed active/reference content.
- `artifacts/`: frozen source/evidence records with fixed references in code and approvals; don't bulk move.
- `researchPapers/`: research reading/source material awaiting a traceable index.
- `attached_assets/`: historical attachments requiring selective import/alias reference checks before cleanup.

## Organized historical materials

- [Historical Phase0 analysis, V2 diagnostics and ML notebook](docs/history/README.md) — original bytes preserved, not current experimental instructions.
- [Wave A path move receipt](docs/repository-maintenance/manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv) — trace old and new names without rewriting files.

## Organization rule for new work

Use ISO-dated records, distinct plan/amendment/incident/report/runbook categories and a newest-first phase README. Do not append dozens of indistinguishable checkpoints without a single authoritative current-status landing page. Keep approved scientific failures visible; classify historical artifacts before any cleanup.

**Protected operations:** No paid AeroDataBox run, live SQL/object deletion, Replit AI Agent or production publication/branch merge is authorized by this README.
