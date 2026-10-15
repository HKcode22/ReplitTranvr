# October 15, 2026 — Wave B Gate 3 scientific records: executable reconciliation checkpoint

**Scope:** isolated branch `repo-waveb-gate3-record-reconciliation-20261015` from `main=c91eccb519c252b0a8756e1f0bc950e31af1d7b3`. Draft [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) head `318e2c3b8223bfc417757dbe571883aecdbca589`. No physical file moves or original document writes.

## Exact three-record comparison (fetched from GitHub)

| Original record | main blob | PR36 blob | observation |
| --- | --- | --- | --- |
| `SEPmd/V3.9_DataCollectPlan_f.8.md` | `3ef1b8730e3148b936fcf02b46d0a091e69f7480` | `04eaf9345d1b5e44deebf5b5c76f169c3a7f4604` | prospective edits begin following 56 common lines; different Plan, no simple replacement |
| `SEPmd/V3.9_IMPLEMENTATION_LOG.md` | `0a5e4bedfa7c743feaf05ec2dc66f22084f39236` | `9911e8512b846a7aea6e0beda663198181e99153` | prospective edits begin following 2335 common lines; retain original history |
| `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` | `d859a2794d423ec21542afe304d22344b7fccc14` | `c7ac06cb0617486d7061b69fa5bc012502bdae91` | draft is an exact prefix of main; main contains final P25 AUTH append missing in draft |

The final main ledger AUTH is `AUTH-20261013-P2G25`; original scope does not authorize a paid launch, automatic retry or deployment. Existing `tests/repo_waveb_p25_ledger_append_guard_v39.test.ts` remains mandatory. YSSY original 231 billed / 229 received / historical `DELIVERY_GAP` unchanged.

## New executable integration guard

Run on a checkout that has both refs:

```sh
git fetch origin main phase2g-pragmatic-science-and-checkpoints-20261012
WAVEB_BASE_REF=origin/main node scripts/repo_waveb_gate3_record_reconcile.mjs origin/phase2g-pragmatic-science-and-checkpoints-20261012
```

The guard compares the **exact three original files**, emits machine-readable SHA-256 and shared-prefix/suffix lengths, and fails closed if main's P25 authorization is missing/duplicated, if the draft duplicates it, if ledger divergence ceases to be main-only append, or if a file cannot be read. A passing comparison does **not** approve PR36's runtime watchdog/canary changes or rename source paths.

## Next safe executable work

1. On this isolated branch, require clean offline runner output for the three-record guard and original P25 ledger guard. Prefer a single combined merge preparation branch sourced from **current main**; cherry-pick and manually reconcile only prospectively approved PR36 Plan/Log sections, retaining the full main ledger.
2. Review each new code change in PR36 for runtime/paid safety; do not merge en bloc or promote future scientific acceptance thresholds to original P25.
3. Update each real operational path consumer and scientific source-link reference as a single migration diff, while preserving original source Git blobs and an old-path compatibility strategy for historical signed paths.
4. Use existing `scripts/repo_waveb_migration_dryrun.mjs --json --strict` as the occupancy/casefold gate. Then stage a **real isolated physical move** for 108 main SEPmd and 352 artifacts and validate exact identities, hyperlinks, code/CI/runtime compatibility on that tree before proposing any merge.
5. Keep [issue #24](https://github.com/HKcode22/ReplitTranvr/issues/24) OPEN until the physical source moves pass. Preserve snapshots `947ec656`, `f5b1347b`, and `c91eccb5`.

**Authorization boundary:** No AeroDataBox API, charged calls, Replit AI Agent/publish, SQL mutation, object deletion, credit allocation or new live Gate3 experiment. This branch is preparation only.
