> **DRAFT migration branch only:** Links below follow physically relocated original Git blobs. Historical signed references, source compatibility and release safety remain under review; no paid execution is authorized.

# ReplitTranvr — Aviation Data Collection & Research

The project includes a live-capable application, original V3.9 aviation scientific records, evidence receipts, scripts and tests.

**[Start here — plain-English research guide](data-collection/START_HERE.md)**. [Full data-collection navigation](data-collection/README.md) provides the phase-by-phase directory.

## Find a document quickly

| You are looking for | Open |
|---|---|
| What the experiment predicts and how it is defined | [Binding V3.9 Plan](data-collection/plans/V3.9_DataCollectPlan_f.8.md) |
| Past pilots, errors and amendments | [58 Phase 2G dated documents](data-collection/phase2g/ALL_REPORTS.md) |
| Machine evidence or receipts | [All 352 original artifacts](data-collection/evidence/ARTIFACTS_START_HERE.md) |
| A specific original research file | [All 108 SEPmd records](data-collection/ALL_SEPMD_FILES.md) |
| Archived original PDF rendition | [Original V3.9 Plan PDF (status unverified)](data-collection/plans/reference-pdfs/V3.9_DataCollectPlanCurrent.pdf) |
| Preserved unreviewed legacy ZIP | [Historical archive custody](docs/history/unreviewed-archives/README.md) |
| Research literature and prediction models | [Research paper extracts](data-collection/research-papers/README.md) |
| Historic website screenshots | [Screenshots archive](docs/history/travnr-ui-screenshots/README.md) |
| Implementation details | [Implementation Log navigation](data-collection/implementation/README.md) |
| Phase 3 / Gate 3 engineering | [Phase 3 status](data-collection/phase3/README.md) |
| Operator safety and runbooks | [Operations](data-collection/operations/README.md) |
| Why filenames haven't all been relocated | [Wave B path-compatibility gate](data-collection/operations/WAVE_B_COMPATIBILITY_GATE.md) |

## What's finished?

**Wave A is merged on `main`** through [PR #39](https://github.com/HKcode22/ReplitTranvr/pull/39), merge commit [`4075cce8`](https://github.com/HKcode22/ReplitTranvr/commit/4075cce8aa33c159487a436127199264a4e8954c). All four PR CI checks and the automatic [post-merge offline main check](https://github.com/HKcode22/ReplitTranvr/actions/runs/38812391951) passed. Eleven historical root files moved byte-for-byte into [`docs/history/`](docs/history/README.md) with [exact original Git blob identities](docs/repository-maintenance/manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv). The original **108 `SEPmd/` files and 352 `artifacts/` files remain untouched** at their old paths, indexed with verified source identities and links.

**Wave B (physical original-file rename) remains on HOLD.** Source code and signed experimental records depend on those exact paths, and Gate 3 engineering remains in [unmerged draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36). An organized index is useful now without damaging those dependencies.

## Repository map

| Directory | Purpose |
|---|---|
| `data-collection/` | **Human-friendly project home** and links to original research/evidence |
| `SEPmd/`, `artifacts/` | Compatibility-protected scientific Plan, AUTH, frozen original data and reports |
| `client/`, `server/`, `shared/` | Application |
| `scripts/`, `tests/`, `.github/workflows/` | Tests, scripts and GitHub Actions |
| `migrations/` | Database baseline and schema migration |
| `data-collection/research-papers/`, `attached_assets/` | Research reading and historical attachments |
| `docs/history/` | Historical archive |
| `docs/repository-maintenance/` | [Cleanup checkpoints and current status](docs/repository-maintenance/START_HERE.md) |

**Safety and science:** YSSY P25 originally recorded 231 provider-billed versus 229 received; the original delivery gap and formal Gate 2 acceptance hold are not retroactively changed by repo cleanup. No deployment or paid provider call is implied by a GitHub merge. Do not use Replit AI Agent. Follow [`AGENTS.md`](AGENTS.md) and the [ACTIVE shell-only guardrail](data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md); paid, SQL, blob and retention mutations require separate explicit authorization.
