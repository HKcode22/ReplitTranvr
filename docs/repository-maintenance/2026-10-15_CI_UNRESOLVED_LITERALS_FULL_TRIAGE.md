# 2026-10-15 — Full GitHub CI scanner triage: 64 unresolved operational literal references

**Evidence:** GitHub Actions V3.9 Offline Safety [#38789354387](https://github.com/HKcode22/ReplitTranvr/actions/runs/38789354387) completed **SUCCESS**, including TypeScript, both offline/full suites, lint, registry, traceability, and build. Focused no-provider [#38789354366](https://github.com/HKcode22/ReplitTranvr/actions/runs/38789354366), real disposable PG [#38789354589](https://github.com/HKcode22/ReplitTranvr/actions/runs/38789354589), and public published-runtime identity read-only [#38789354390](https://github.com/HKcode22/ReplitTranvr/actions/runs/38789354390) also **SUCCESS**. Triggered by exact PR39 branch commit `fc5fd762e2159e187dc913d08f65bff872f55fc1`. The checkout scanner reported temporary **GitHub PR merge checkout SHA** `8d5e19979ed2b637a74a0aba87629ff266ab3149`; do not confuse it with the PR branch head.

## Actual CI evidence

- **64** operational/test literal mentions not resolved to committed same-path files/dir prefixes.
- **30** distinct target literal strings; **27** references do not match the coarse partial-name/prefix heuristic, **37** match it (heuristic only, not confirmed generated).
- Target buckets: `SEPmd` **4** mentions, `artifacts` **60** mentions.
- This is not 64 proven missing-file defects. Many are intentionally dynamic string prefixes, emitted runtime outputs, unsaved fixture filenames, historical/retired scripts, or variable-expanded shell paths. Conversely, passing offline CI does not guarantee every path is safe or historically resolvable.

## Full 30-string triage register (repeated mentions counted)

| Literal observed by scanner | Mentions | Example source location |
|---|---:|---|
| `artifacts/v39-phase2-safety-smoke.json` | 9 | `scripts/v39_approve_phase2g_auth_v39.ts:12` |
| `artifacts/phase2g-github-owner-` | 6 | `.github/workflows/phase2g-paid-stage1.yml:511` |
| `artifacts/phase2g-signed-cleanup-intent-probe` | 4 | `.github/workflows/phase2g-paid-stage1.yml:514` |
| `artifacts/v39-stage1-promotion-handoff.json` | 4 | `scripts/v39_approve_phase2h_auth_v39.ts:14` |
| `artifacts/phase2g-stage1-` | 4 | `scripts/v39_phase2g_stage1_launch_logged_v39.sh:224` |
| `artifacts/phase2g-settling-finalizer-probe` | 3 | `.github/workflows/phase2g-paid-stage1.yml:516` |
| `artifacts/phase2g-scientific-health-` | 3 | `.github/workflows/phase2g-paid-stage1.yml:585` |
| `artifacts/prepaid-security-retention-pass.json` | 3 | `scripts/v39_phase2a_close.sh:115` |
| `artifacts/phase2g-overnight-guard-` | 3 | `scripts/v39_phase2g_overnight_wsss_guard_v39.sh:346` |
| `artifacts/phase2g-signed-purpose-cleanup-probe` | 2 | `.github/workflows/phase2g-paid-stage1.yml:515` |
| `SEPmd/V3` | 2 | `.github/workflows/v39-phase2-log-status.yml:31` |
| `artifacts/reference-freeze-record.json` | 2 | `scripts/v39_phase2b_e_close.sh:80` |
| `artifacts/phase2g-workspace-server-` | 2 | `scripts/v39_phase2g_tuesday_prepare_v39.sh:349` |
| `SEPmd/V39_PREPROBE_FREEZE.json` | 1 | `scripts/anchor_probe.ts:171` |
| `artifacts/phase2g-overnight-` | 1 | `scripts/v39_phase2g_overnight_wsss_guard_v39.sh:105` |
| `artifacts/phase2g-overnight-paid-launch-` | 1 | `scripts/v39_phase2g_overnight_wsss_guard_v39.sh:254` |
| `artifacts/phase2g-P2G04-overnight-runner-20260917.log` | 1 | `scripts/v39_phase2g_p2g04_overnight_runner_v39.sh:46` |
| `artifacts/phase2g-stage1-paid-preflight-P2G04-` | 1 | `scripts/v39_phase2g_p2g04_overnight_runner_v39.sh:105` |
| `artifacts/phase2g-P2G04-overnight-launch-` | 1 | `scripts/v39_phase2g_p2g04_overnight_runner_v39.sh:146` |
| `artifacts/phase2g-stage1-AUTH-20260917-P2G04-` | 1 | `scripts/v39_phase2g_p2g04_overnight_runner_v39.sh:177` |
| `artifacts/phase2g-stage1-paid-preflight-P2G08-` | 1 | `scripts/v39_phase2g_p2g07_recovery_prepare_v39.sh:103` |
| `artifacts/phase2g-stage1-paid-preflight-P2G09-` | 1 | `scripts/v39_phase2g_p2g08_recovery_prepare_v39.sh:93` |
| `artifacts/phase2g-stage1-paid-preflight-P2G07-` | 1 | `scripts/v39_phase2g_tuesday_prepare_v39.sh:464` |
| `artifacts/phase2f-workspace-callback-verification-` | 1 | `scripts/v39_prepare_phase2f_retry_v39.sh:34` |
| `artifacts/phase2f-workspace-ingress-binding-` | 1 | `scripts/v39_prepare_phase2f_retry_v39.sh:41` |
| `artifacts/phase2f-smoke-runtime-` | 1 | `scripts/v39_prepare_phase2f_retry_v39.sh:42` |
| `SEPmd/V3.9_PHASE2F_AUTH_` | 1 | `scripts/v39_prepare_phase2f_retry_v39.sh:43` |
| `artifacts/phase2f-retry-prep-` | 1 | `scripts/v39_prepare_phase2f_retry_v39.sh:44` |
| `artifacts/v39-gate2-phase2-pass.json` | 1 | `scripts/v39_record_gate2_phase2_pass_v39.ts:27` |
| `artifacts/phase2f-deployment-binding.json` | 1 | `scripts/v39_verify_phase2f_deployment_binding_v39.ts:11` |

## Priority triage before moving `artifacts/` or `SEPmd/`

1. **Legacy missing fixed paths**: examples `SEPmd/V39_PREPROBE_FREEZE.json`, `artifacts/v39-phase2-safety-smoke.json`, `artifacts/v39-stage1-promotion-handoff.json`, and `artifacts/reference-freeze-record.json`. For each, verify whether it was historical, generated at execution, replaced, or truly missing. Do not auto-create evidence to make a scan pass.
2. **Generated/dynamic prefixes**: examples `artifacts/phase2g-github-owner-`, `artifacts/phase2g-scientific-health-`, and `SEPmd/V3.9_PHASE2F_AUTH_` likely represent suffix-generated output names or computed paths. Record generating code and stable path contract, rather than treating absence of a literal prefix as deletion authority.
3. **Partial matches**: `SEPmd/V3` is a truncated token from workflow lines and not a verified required file. Enhance token scanner if that source is material to rename safety.
4. **Frozen existing scientific records**: no inference from these 64 that the V3.9 Plan, ledger, current P25 source files, signed AUTH, or earliest raw source custody may be discarded.
5. **Do not silently mutate older files to suppress scanner counts**. Propose future compatibility code only with an atomic verified path migration, no new provider or live DB action.

## Root-clutter next gate

A further bounded **read-only `git grep` audit** is added to the offline test to report which tracked source/docs currently mention root candidates such as `gptP0analyze*.md`, `confused.md`, `analyze_csv.py`, and `zipFile.zip`. Historical review document **content itself** is not a guarantee of irrelevance, and archive/rename decisions still need classification.

**Current `SEPmd` mapping:** [155-path proposal](2026-10-15_SEPMD_EXACT_PATH_MAPPING_AND_CASE_CONFLICT.md); all moves HOLD. Existing root cleanup branch remains isolated, default main and published application remain untouched. P25 historical discrepancy 231/229 and incident31 retained.
