# P2G22–P2G24 YSSY callback incident and zero-credit 130-minute observation

**Status:** Confirmed incident facts; underlying external lifecycle trigger not yet established. **Decision:** NO NEW PAID YSSY / GATE 6 / FULL COLLECTION from this report alone.  
**Date:** 2026-10-09 UTC. **Authority:** GitHub Actions logs and observation run, read-only PostgreSQL audit supplied by operator, prior Replit deployment log excerpts.  
**Purpose:** Maintain a falsifiable scientific record; distinguish webhook receiver availability from delivered-data integrity and provider/accounting integrity. No historical status changes.

## Executive finding

The revised dedicated Replit published callback-only server stayed reachable through **130.000 minutes** of continuous GitHub-origin health traffic, with **520 samples × five checks = 2,600 checks, zero observed failures, max sample gap 15.007 s**. GitHub job passed and uploaded evidence. This specifically validates the tested receiver's **active, continuously polled** behavior, not idle Autoscale lifecycle, real paid webhook processing, or scientific settlement. It **does not prove** why the earlier P2G24 callback failed at minute ~59 or that the failure cannot recur during bulk data collection.

A previously confirmed callback-only startup defect (Replit GET `/` returned HTTP 404) was corrected by adding a lightweight 200 root handler. This corrects the known platform-readiness mismatch; the actual initiation of the replacement/cold start remains unknown. Following failed probes must remain failed/censored and never be rewritten as valid collections.

## Primary evidence index

| Evidence | Reference | Finding |
|---|---|---|
| 130-minute zero-credit GitHub observer | [37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) | completed success 2026-10-09 13:08 UTC |
| Observer evidence artifact | [run artifacts](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) ID `11617790710` | `checks.csv`, `summary.json`; 30-day configured retention |
| P2G24 paid owner | [37881617397](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397) | fail, 3 consecutive callback health failures |
| P2G24 owner/scientific artifacts | same run, IDs `11596473375`, `11596189334` | preserve before expiration |
| P2G23 paid owner | [37720914245](https://github.com/HKcode22/ReplitTranvr/actions/runs/37720914245) | first transient failure ~59m, terminal triple at ~88m |
| P2G22 paid owner | [37407181205](https://github.com/HKcode22/ReplitTranvr/actions/runs/37407181205) | child returned exit 1 after ~121m; **not** callback-watchdog triggered |
| Earlier WSSS full owner | [36413290291](https://github.com/HKcode22/ReplitTranvr/actions/runs/36413290291) | PASS despite **two recovered health-check failures** ~25m |
| OMAA full owner | [36559290299](https://github.com/HKcode22/ReplitTranvr/actions/runs/36559290299) | PASS |
| MMUN full owner | [36126990149](https://github.com/HKcode22/ReplitTranvr/actions/runs/36126990149), [36852662251](https://github.com/HKcode22/ReplitTranvr/actions/runs/36852662251) | PASS owner executions |
| SKBO full owner | [36998609342](https://github.com/HKcode22/ReplitTranvr/actions/runs/36998609342) | PASS |
| Additional WSSS full owner | [35990540643](https://github.com/HKcode22/ReplitTranvr/actions/runs/35990540643) | PASS |
| Callback fix & diagnostics draft PR | [#26](https://github.com/HKcode22/ReplitTranvr/pull/26) | unmerged; offline CI succeeded |
| Published deployment | `https://replit-tranvr--hk84164.replit.app` | published Autoscale; dedicated receiver |

**Important:** GitHub Actions success denotes an owner-process execution, not automatically every scientific quality gate or later reconciliation. Interpret scientific PASS/MATCH/uncensored separately.

## Exact timeline of relevant failures (UTC)

- **P2G23 / YSSY / original full-app Replit development callback:** owner started 2026-10-08 **03:05:02**; watchdog recorded one failed health cycle at **04:04:48**, recovered; further failed cycles at **04:32:49**, **04:33:04**, **04:33:19**. Three-strike shutdown generated `workspace_callback_unreachable_threshold`; owner signaled SIGTERM. The log did not identify which of four sequential health subchecks failed.
- **P2G24 / YSSY / separate published Autoscale receiver:** GitHub owner started 2026-10-09 **03:59:10**. Operator-supplied Replit platform log excerpts showed a new deployment instance initializing around **04:58:21**, then startup connection-refusal/500 and failing GET `/` checks (404 on pre-fix build). Correlation is strong; neither the platform reason for the new instance nor the failing supervisor subcheck is conclusively identified. Supervisor failures: **04:58:26**, **04:58:41**, **04:58:56**; third strike produced SIGTERM and fail-closed recovery, not successful 120m completion.
- **P2G22 / YSSY / original development callback:** owner started **2026-10-06 03:04:59**, child exited **05:06:03** with code 1; `callback_watchdog_triggered=false`. Investigate scientific/settlement evidence separately; do not group with the one-hour watchdog incident.
- **WSSS / earlier success 2026-09-28:** owner started **11:04:09**; callback watchdog had transient failure #1 at **11:29:10** and #2 **11:29:25**, then recovered before fatal threshold; owner child passed at **13:05:13**. Hence transient callback outages are not categorically YSSY-exclusive.

## Repair, verification, and observation

The receiver fix on [PR #26](https://github.com/HKcode22/ReplitTranvr/pull/26) added `GET /` (200 JSON, no DB/provider dependency) **ahead of the callback-only route allowlist** and converted supervisor boolean health failures into sanitized named-stage/HTTP/elapsed diagnostics. The 15-second polling/three-consecutive-failures fail-closed rule remained unchanged.

Published `/__v39/workspace-runtime` reported the tested build SHA `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`; Replit's local automatic publication commit `1cc213a...` changed no tracked files. `main` remained independent; neither dedicated callback configuration nor this observer was merged to `main`.

GitHub-hosted observer started **2026-10-09 10:58:28.176 UTC**, ended **13:08:28.183 UTC**, ran 130 min. Final machine record:
```json
{
  "status":"PASS_ZERO_CREDIT_130_MIN",
  "duration_minutes":130,
  "samples":520,
  "checks_per_sample":5,
  "total_checks":2600,
  "failed_checks":0,
  "max_consecutive_failed_samples":0,
  "max_sample_gap_seconds":15.007,
  "provider_calls":0,
  "provider_mutations":0,
  "database_queries":0,
  "database_mutations":0
}
```
Five sequential checks: (1) root 200; (2) deliberately invalid secret/session POST rejected 404; (3) exact runtime source and published mode 200; (4) webhook-secret binding 200; (5) HMAC DB-URL binding 200 (proof comparison **without database connection**). Observer logs deliberately omit credentials and raw bodies. GitHub runner job timeout 155m, observed job completed successfully and evidence artifact uploaded.

### Limitations / alternative explanations

1. **Workload not equivalent:** active health requests about every 15 seconds can keep Autoscale warm; P2G24 had real webhook/provider and scientific DB writes. Observation tests availability and configuration binding, not webhook persistence, database transaction latency, object storage, queue/settling, or delivered-event identity.
2. **Different versions/time periods:** successful WSSS/OMAA/MMUN/SKBO paid runs used a different `.replit.dev` receiver build and scientific schedule from failed YSSY and the repaired dedicated `.replit.app`. Airport-specific data volume/traffic, callback workloads, runtime lifecycle, and exact configuration are confounded.
3. **Unknown platform trigger:** changing instance at ~59m does not prove a scheduled one-hour timeout; need authoritative Replit deployment instance logs, health probe policy, scaling and crash/OOM diagnostics, instance startup/shutdown reason and revision.
4. **Health check not processing check:** root `/` can be healthy even if DB connectivity or HMAC-authenticated actual webhook ingestion fails; an HMAC DB URL comparison proves equivalent string secret, **not SQL availability**.
5. **Three-strike is appropriate fail-closed behavior, not automatically a code bug:** loosening it to permit data collection without callback durability risks censored/incomplete scientific experiments.
6. **Observation may influence autoscaling:** success under continuous polling is not evidence of healthy idle/sleep/wake cycles.
7. **P2G24 logs were from an older boolean-only supervisor:** current stage-specific diagnostics improve **future** evidence, cannot retrospectively identify the old failure subcheck.

## Data, evidence retention, cleanup

Operator read-only DB audit 2026-10-09 10:33 UTC:
- `clean.adb_anchor_probe.probe_id=18`, `icao=YSSY`, `probe_budget_day_id=P2G-S1-20261009-23`, session `6267293e-75a0-42a7-b977-89543f200ebc`.
- `status=failed`, `duration_censored=true`, `stop_reason=supervisor_child_exit_recovered`, `reconciliation_status=UNRESOLVED`, cleanup verified UTC NULL, window 03:59:11–05:59:11 UTC.
- UNLOGGED runtime session/delivery/item count **0/0/0** at audit; PostgreSQL `pg_postmaster_start_time=2026-10-09T10:33:37.285Z`. This alone cannot prove whether P2G24's original failure involved DB restart, or when UNLOGGED data was lost.
- 30 durable `provider_content_blob_ref` webhook references, none marked deleted, 30 distinct SHA-256; earliest registered object expiry **2026-10-16T04:02:22.780Z**; all underlying object bytes and checksums **not yet verified**. `clean.phase2g_cleanup_journal_v39` query returned no rows.
- Preserve scientific owner/scientific-health artifact files; avoid deleting, rewriting failed status, synthesizing a MATCH or rearming subscriptions. Prior cleanup refused with `REFUSED:AUTO_DISCOVERY_REQUIRES_ONE_EXACT_SETTLING_MATCH`.

**Evidence priority:** Before blob expiry, verify actual object availability and SHA-256 using a strictly read-only, exact-session, signed and audited procedure. No bulk cleanup or reuse of the failed probe as valid scientific outcome.

## Decision

**Proven:** repaired receiver active HTTP contract and authenticated binding remained healthy during 130-min independent GitHub-origin observation; earlier failures were real fail-closed owner terminations, and P2G22 was a different mechanism.  
**Unproven:** why published Replit instance changed at ~59m; whether actual paid webhook processing survives Autoscale replacement; whether all preserved raw events are reconstructable; Phase6 1,900/day sustained scientific read/write/accounting validity.

**Action:** retain paid launches blocked; implement offline injected failure/recovery test suite, platform idle-to-wake and restart testing, independent real-ingest (non-provider) synthetic persistence with disposable fixture and full cleanup proof, exact-stage watchdog logging validation, database lifecycle observability, provider-delivery/reconciliation invariants, and a distinct phase6 prelaunch gate review.

See [P2G24 reliability hardening and Phase6 criteria](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md).


## 2026-10-09 forensic addendum: before/after source and P2G22 ledger

**Before/after verified on GitHub:** comparing P2G24 paid revision `7541bb0975000454dc6e3f3a8cdfeff06910297c` to repaired callback head `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653` yields exactly four changed files: callback-only `server/phase2gCallbackOnly.ts` (+14 lines of root health), supervisor `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` (sanitized subcheck failure detail; 66 added/23 removed lines), an offline CI workflow and a root-health regression test. **The supervisor's four sequential checks, 8s timeout each, 15s poll and 3-strike SIGTERM logic existed before the failure and were not made more tolerant or more available by those edits.** The post-fix zero-failure soak therefore supports a healthy *different configuration/time window*, not proof of the exact failure cause or prevention.

**Causation nuance:** The missing root `GET /` 200 route was absent in the original P2G24 callback-only server. This can affect Replit's platform readiness handling but is **not itself among the four supervisor subchecks**. It may have caused failed platform health/replacement routing during a new instance startup; the direct old supervisor stage and the reason a new instance appeared remain unknown.

**Self-reported revision nuance:** `server/lib/disruption/workspaceRuntimeHealth_v39.ts` prefers valid configured `V39_DEPLOYED_GIT_HEAD` before consulting `git rev-parse HEAD`. A runtime exact-head PASS is therefore a configuration contract, not independent cryptographic attestation of the deployed `dist/index.mjs` bundle. Require an independently checked build/release digest at Phase6 preflight.

**No SQL uptime proof:** `POST /__v39/phase2g/runtime-db-binding` compares an HMAC keyed by the configured DB connection string, but does not connect to PostgreSQL. `GET /` returns 200 independently of DB/object-store readiness. Neither checks actual durable paid webhook acknowledgement, and 130m active soak cannot certify it.

**P2G22 now specifically classified from original artifact:** downloaded owner [#37407181205](https://github.com/HKcode22/ReplitTranvr/actions/runs/37407181205) artifact `11391881377` records `REFUSED_STAGE1_PROBE_FAILED: YSSY external_internal_delivery_gap`, `child_exit_code=1`, `callback_watchdog_triggered=false`. Existing [historical recovery fixture](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-p2g24-github-observer-20261009/tests/phase2g_p2g22_yssy_recovery_v39.test.ts) preserves external **260 credits**, internal **259**, gap **1**, 56 callback requests and 56 successes, zero counted failures; [existing 260/259 regression](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-p2g24-github-observer-20261009/tests/phase2g_yssy_260_259_regression_v39.test.ts) tests late callback arrival vs persistent gap and rejects 1-credit tolerance. These are historical repository *fixture* assertions pending read-only comparison with production logged evidence, and explicitly do not claim origin of missing credit. Final P2G22 scientific-health snapshot recorded **259 item rows**; never equate those item rows to credit count by inference. [Detailed addendum](2026-10-09_P2G22_DELIVERY_GAP_ROOT_CAUSE_CLASS.md).

**Next evidence requests:** export platform instance-lifecycle/startup reason and health status, inspect P2G22 durable reconciliation row via read-only SQL, verify all 30 P2G24 object bytes before the October 16 retention deadline, then design isolated synthetic end-to-end ingest/replay. Do not alter live scientific state.
