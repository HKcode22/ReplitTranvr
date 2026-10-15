# Start here — the aviation research repository, in plain English

**If you are lost in the repository, use this page first.** It is a navigation guide on [draft cleanup PR #39](https://github.com/HKcode22/ReplitTranvr/pull/39), not an experiment approval or a copy of the scientific record.

| What you want to understand | Where to go |
|---|---|
| What does this research try to predict? | [V3.9-f.8 foundational scientific plan](../SEPmd/V3.9_DataCollectPlan_f.8.md) |
| How did the code implement the plan? | [Implementation guide and exact original implementation log](implementation/README.md) |
| What happened during flight data collection? | [Phase 2G overview](phase2g/README.md) and [all dated Phase2G reports](phase2g/ALL_REPORTS.md) |
| Where are the original receipts and experiment evidence? | [Evidence and artifact entry point](evidence/README.md) |
| What is Phase 3 working on now? | [Phase 3 (separate draft PR #36, NOT deployed)](phase3/README.md) |
| How do I look up a particular authorization? | [Original dated AUTH source files](authorizations/README.md) |
| Is a workflow or command safe to execute? | [Shell-only operator and deployment safety rules](operations/README.md) |
| I know the filename but not where it lives. | [All 108 original SEPmd files](ALL_SEPMD_FILES.md) |

## Understand the difference between phases

- **Phase 0 / Gate 0 and Gate 1:** initial protocol and application wiring, provider account/budget proof and early gates.
- **Phase 2 / Phase 2G:** airport pilots, data-collection experiments, incident investigations and prospective repairs.
- **YSSY P25:** an original delivery gap of 231 provider-billed vs 229 received. The qualified research analysis does not convert historical strict acceptance into PASS.
- **Phase 3 / Gate 3:** engineering work in [separate draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36), not authorized for a paid canary by this cleanup.

## What has actually changed?

Eleven historic, non-runtime root files were moved **without content changes** into [historical documents](../docs/history/README.md). The 108 original `SEPmd/` files and 352 `artifacts/` records remain at their original hash/path-bound locations. Their new navigation pages are *shortcuts, not replacements*.

Read dates, source SHAs and approval scope before treating an old record as current. Do not use Replit AI Agent; live actions require the established human shell-only workflow.
