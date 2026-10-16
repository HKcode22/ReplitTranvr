> **Source integrity:** Original historical files are preserved byte-for-byte at the linked locations. Historical receipts and runbooks are not new authorization for paid execution or deployment.

# ReplitTranvr — Aviation Data Collection & Research

The project includes a live-capable application, original V3.9 aviation scientific records, evidence receipts, scripts and tests.

**[START HERE — V3.9 Study Hub: Plan, Log and Ledger](data-collection/STUDY_HUB.md)**. Also see the [simple guide](data-collection/START_HERE.md), [folder explanation](data-collection/FOLDER_GUIDE.md), and [advanced navigation](data-collection/README.md).

## Find a document quickly

| You are looking for | Open |
|---|---|
| Scientific Plan + Implementation Log + Ledger on one page | [Open Study Hub](data-collection/STUDY_HUB.md) |
| Why repeated phase folders or old evidence exist | [Folder Guide](data-collection/FOLDER_GUIDE.md) |
| What the experiment predicts and how it is defined | [Binding V3.9 Plan](data-collection/plans/V3.9_DataCollectPlan_f.8.md) |
| Offline Phase 2G rehearsal analysis (research-only) | [Analysis](data-collection/analysis/README.md) |
| Original Phase 0 and Phase 1 scientific history | [Phase 0](data-collection/phase0/README.md) · [Phase 1](data-collection/phase1/README.md) |
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
| Physical relocation compatibility and safety decisions | [Wave B path-compatibility gate](data-collection/operations/WAVE_B_COMPATIBILITY_GATE.md) |

## Repository organization and source custody

**Wave A:** [PR #39](https://github.com/HKcode22/ReplitTranvr/pull/39) organized navigation and moved 11 historical root files, retaining their Git identities. **Wave B:** [PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46) is the separately reviewed physical relocation of all **108 original `SEPmd/` source files and 352 original `artifacts/` evidence files**. The links on this page point to the moved, byte-identical originals in the tree containing this README.

Wave B **PR #46 was merged on October 15, 2026**. Live Replit deployment parity and current tests must still be checked independently on [PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46) and [maintenance Issue #24](https://github.com/HKcode22/ReplitTranvr/issues/24); a copied README or an old signed authorization is not evidence that the published Replit deployment matches this code. [Complete 460-file original-to-relocated SHA manifest](docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv).

[Phase 3 / Gate 3](data-collection/phase3/README.md) still requires a **separate** review of [draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36). Do not replace the authoritative signed P25 evidence ledger with the draft's shorter historical version.

## Repository map

| Directory | Purpose |
|---|---|
| `data-collection/` | **Project home**; original Plans, AUTH, evidence and historical scientific records at relocated paths |
| `artifacts/` when created at runtime | New **generated/temporary outputs**, not the 352 archived original blobs; output paths must remain isolated |
| `client/`, `server/`, `shared/` | Application |
| `scripts/`, `tests/`, `.github/workflows/` | Tests, scripts and GitHub Actions |
| `migrations/` | Database baseline and schema migration |
| `data-collection/research-papers/`, `client/src/assets/images/legacy-attachments/`, `docs/history/legacy-replit-attachments/` | Research reading, historic PNGs, pasted text and original ZIP |
| `docs/history/` | Historical archive |
| `docs/repository-maintenance/` | [Cleanup checkpoints and current status](docs/repository-maintenance/START_HERE.md) |

**Safety and science:** YSSY P25 originally recorded 231 provider-billed versus 229 received; the original delivery gap and formal Gate 2 acceptance hold are not retroactively changed by repo cleanup. No deployment or paid provider call is implied by a GitHub merge. Do not use Replit AI Agent. Follow [`AGENTS.md`](AGENTS.md) and the [ACTIVE shell-only guardrail](data-collection/phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md); paid, SQL, blob and retention mutations require separate explicit authorization.
