# 2026-10-14 UTC — Phase 2G / Gate-2 continuity and Phase 3 Gate 0.5 input hardening

**Status:** DRAFT, no paid launch, no deployment, no merge. **Repo:** `HKcode22/ReplitTranvr`. **Source branch:** `phase2g-pragmatic-science-and-checkpoints-20261012` / [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) (draft). Source code patch commit `a633ac4da2b217474701d2829913f59e89c1af45`, test patch commit `56ea564ff3b6634125bff2bb6a97c2ac2902df48`. GitHub main branch **independently verified at** `f5b1347b7b9aebd6830302394ea2cc5775aedbf4` during this session. PR #37 separate docs-only draft head `0a5cc138d2755968ae992f7ded48fa055b082716`; all its four GitHub no-provider checks passed at that exact SHA.

## Carry-forward science decisions — immutable evidence versus acceptance

- **Five-site ~120-minute observational fieldwork COMPLETE:** WSSS 11, OMAA 12, MMUN 14, SKBO 15, YSSY 19. LKPR deferred by Oct-2 Compact6 early-pilot reduction. Historical original Gate-2 five formally valid anchor selection is **HOLD**, not PASS.
- WSSS, OMAA, SKBO: formal MATCH and >=60 observed physical-flight-v2 items/h. MMUN: MATCH but ~22.9996/h and capacity FAIL.
- YSSY: `7203.639s` uncensored original window; 58/58 retained source blobs original SHA/size readback verified (308832B), 229 source items and 229 item cost claims without duplicates/disagreement. Settled external spend **231** vs receiver **229**: two billable units unresolved, **229/231=99.134% billing reconciliation**. Official frozen probe19 `failed/DELIVERY_GAP`, official rows/h NULL. Research inclusion `B_DEGRADED_OBSERVED_ONLY` is valid with disclosed limitations, **not** a historical exact-MATCH override; sender attempts and missingness mechanism unknown. No scientific proof two real flights were omitted.
- Conditional Stage-2 evidence trigger exists but Oct-2 early-pilot reduction retired automatic 4h confirmation; no new paid run authorized. Original Gate-2 closure must stay **HOLD** until separately dated scientist/operator exception or genuine formal requirements met.
- The [machine-readable Gate-2 fieldwork closeout](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-early-pilot-fieldwork-closeout-docs-20261014/SEPmd/phase2g/reports/2026-10-14_PHASE2G_GATE2_EARLY_PILOT_FIELDWORK_CLOSEOUT_RECORD.json) is **fieldwork completed + formal HOLD** on distinct axes, not authorization.

## Concrete Phase 3 offline defect and change

Found in `server/lib/disruption/gates_v3.ts`: the `evaluateGate05` measurement interface is static TypeScript but `scripts/v39_gate05_owner_v39.ts` reads JSON without runtime schema checks. A nonempty JSON string `"false"` for a required boolean could be propagated to `passed` and treated as truthy by `every(r => r.passed)`, falsely granting offline adequacy PASS. Other numeric fields were coercible (numeric strings) or nonfinite.

**Written only to draft PR #36**, not main or Replit:
1. `server/lib/disruption/gates_v3.ts`: `validateGate05InputV39` rejects nonobject input, missing/wrong boolean types, negative/fractional/nonfinite/oversized count fields, nonfinite/negative duration and invalid or zero reference thresholds; `evaluateGate05` invokes validation before constructing a verdict.
2. `tests/phase3_gate05_measurement_runtime_validation_v39.test.ts`: positive boundary test, negative tests for truthy strings, absent/null fields, coercible counts, NaN/Infinity, negative/fractional values, corrupt criteria and invalid top-level input.

**Boundary:** This is runtime TYPE/SHAPE validation of offline evidence, **not** validation of the claimed measurement's real raw-source provenance, as-of timestamp, population linkage or target constructibility. Gate 0.5 should not receive live PASS from applicant-provided booleans alone. A source-backed measurement harness remains required before scientific approval.

## Evidence / test status at checkpoint creation

- PR #36 prior exact source head `dac5ec10eb02bee00daceaffb25a5a5ada7c785b` passed four no-provider workflows (#38541183703, #38541183502, #38541183518, #38541183348). This does NOT prove the new source patch.
- New Gate05 **test commit** `56ea564ff3b6634125bff2bb6a97c2ac2902df48`: public receiver identity #38568945152 **PASS**, real PostgreSQL faults #38568945071 **PASS**, focused no-provider #38568945170 **PASS**; full offline safety #38568945278 **IN_PROGRESS when checkpoint authored**, do not claim PASS until verified.
- NO local Replit shell executions or hosted runtime verification in this session. GitHub connector code edits and CI inspection only.

## Finances, source custody and safety

- During this session: **0 initiated paid provider calls, 0 provider subscription creates/deletes, 0 refills, 0 production DB writes, 0 source deletes, 0 deployment, 0 PR merges**. Live account current balance/exposure **NOT RECHECKED** (last YSSY operator audit reported 0 active billable subs; do not infer fresh zero).
- **Internal P25 incident #31** remains OPEN (not GitHub PR #31). 58 raw source refs expire starting 2026-10-20T03:06:15.502Z, last scheduled 05:02:12.501Z; do not run old exact-session `--apply` due missing transient session. Scope-bound retention dry run, legal/purpose review, then separately authorized tombstones before incident closure. No raw provider payloads may be uploaded to GitHub.
- Legacy `scripts/credit_canary.ts` uses wrong general webhook vs published prepaid-session route. Draft owner fail-closed guard remains: **DO NOT RUN paid Gate3**. New compatible owner/receipt/ledger, exact 0-gap canary, offline HTTP+disposable PG tests and fresh bounded AUTH must precede live usage.

## Exact next session start (read-only)

1. Verify `main`, PR #36 head (checkpoint commit may have moved HEAD), PR #37 docs-only and the **four** CI jobs for source test SHA `56ea564ff3b6634125bff2bb6a97c2ac2902df48`. Failures must be investigated and patched, never called successful without evidence.
2. Read [Gate-2 closeout and Phase3 handoff](2026-10-14_PHASE2G_CLOSEOUT_LIVE_READONLY_AND_PHASE3_OFFLINE_NEXT.md) plus [Gate3 legacy NO-GO](2026-10-14_PHASE3_GATE3_LEGACY_INGRESS_AND_SAFE_HANDOFF_CHECKPOINT.md). Keep PR #36 code and PR #37 docs separate.
3. Verify actual Replit postrun state only with reviewed detached read-only checker (PR36 `scripts/v39_phase2g_early_pilot_closeout_readonly_v39.ts --read-only`), **operator only**, and do not mistake CI for fresh SQL/provider LIST.
4. Continue Phase 3 **offline**: build source-backed Gate05 measurement/provenance harness; replace incompatible paid Gate3 contract with prepaid session exact-route adapter and negative fault tests; verify Gate4 actual stop-controller coupling (the current `runGate4OfflineTest` is a synthetic counting loop, not proof controller integration). Record every code/test commit and approval boundary.
5. Before Oct20 expiry, decide lawful nonraw derived data preservation; on expiry use separately reviewed retention operator / authorized applies only. No automatic Stage2, YSSY rerun, paid canary, merge, or deployment.

**Decision needed later:** if formal Gate-2 qualified-pilot exception is desired, obtain separately documented prospective/existing evidence fitness-for-purpose decision explicitly without changing original P25 outcome. Until then `Gate2=HOLD`, `Phase3_offline=GO`, `Phase3_paid=NO-GO`.
