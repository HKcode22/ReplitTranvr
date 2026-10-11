# Phase 2G Gate 2 — YSSY Stage-1 continuation and receiver contingency (2026-10-09)

**STATUS: PREPARATION ONLY / NO PAID AUTHORIZATION / NOT A PHASE 6 LAUNCH.**  
**Authority:** [V3.9 F.8 Plan](../../V3.9_DataCollectPlan_f.8.md) §9; [implementation log](../../V3.9_IMPLEMENTATION_LOG.md) Phase 2G; [early pilot scope](../amendments/2026-10-02_EARLY_PILOT_SCOPE_REDUCTION_YSSY_SKBO.md) **as superseded by** [Oct 2 SKBO-first correction](../amendments/2026-10-02_YSSY_CURFEW_OPERATING_HOURS_CORRECTION.md) and [Oct 3 YSSY hours freeze](../amendments/2026-10-03_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_FREEZE.md). Check actual machine-freeze SHA, current Git HEAD and live database/provider state before any launch.

## 1. Correct project stage and objective

**We are in Phase 2G → Gate 2 → Stage 1.** Not Phase 6, not Gate 2 Stage 2. The early-pilot amended sequence executed **SKBO first**, now scientifically valid/completed/MATCH probe 15 ([report](2026-10-03_P2G20_SKBO_V2_SCIENTIFIC_SUCCESS_AND_FINAL_CLOSEOUT.md)); the missing **YSSY valid measurement** is next. The earlier WSSS/OMAA/MMUN corrected-v2 evidence is preserved and cannot be silently rescored. LKPR is deferred within the narrow early-pilot design. No automatic Stage-2 four-hour confirmation is authorized for this reduced scope. No claim of full original 12-candidate final-five completion/representativeness.

YSSY probe 16 / P2G22: **failed, full duration, DELIVERY_GAP** (260 external / 259 internal, 56 2xx callback requests). Probe 17 / P2G23: **failed/censored/UNRESOLVED**, owner triple callback-health failure ~88min. Probe 18 / P2G24: **failed/censored/UNRESOLVED**, owner triple callback-health failure ~59min; 30/30 referenced raw webhook objects verified intact in operator read-only audit. Do **not** promote or count any of them as a valid YSSY Stage-1 result.

## 2. Next matching calendar class (candidate only; NOT authorization)

Frozen YSSY protocol is **UTC slot 04:00 ±1h**, preferred **03:00–05:00 UTC**, target 120m, **weekday in BOTH UTC and Australia/Sydney**; currently Sydney on AEDT (UTC+11). Correct nearest preferred eligible start after Fri Oct 9 2026:

| Calendar reference | Preferred window |
|---|---|
| **Monday Oct 12, 2026 UTC** | **03:00–05:00 UTC** |
| **Sunday Oct 11, 2026 California PDT** | **8:00–10:00 PM Sunday** |
| **Monday Oct 12, 2026 Sydney AEDT** | **2:00–4:00 PM Monday** |

**Do NOT confuse with** `2026-10-11T03:00Z`, which is Saturday Oct 10 at 8:00 PM PDT and Sunday afternoon at Sydney: **both UTC and Sydney are weekend** → not eligible.

Next preferred fallback if Monday UTC cannot be safely authorized: **Tuesday Oct 13 03:00–05:00 UTC** = Monday Oct 12 8:00–10:00 PM PDT = Tuesday Oct 13 2:00–4:00 PM Sydney. These are *eligible candidate dates*, not a promise/approval to execute. No weekday-class or curfew amendment necessary merely to skip a day.

**Crediting:** 450 Alert-credit Stage-1 reservation; 50 unsettled margin; **max 500 per budget day**, protected account floor 1,000; live admission balance minimum 1,500 subject to provider/owner preflight. Required scientific protocol: physical-v2 metric, 60 delivered rows/hour feasibility, >=6 complete 15-minute stability buckets, uncensored 120-minute target or explicitly censored stop, final exact `MATCH`, delivery completeness exactly 1.0, no tolerated missing credit.

## 3. New authorization is a HARD blocker (not routine paperwork)

The [Oct 7 P2G22 exact recovery freeze](../../../artifacts/phase2g-early-pilot-yssy-p2g22-recovery-freeze-20261007.json) specifically records `maximum_additional_attempts=1` and `no_automatic_retry_after_recovery_attempt=true`, and says **no further automatic or manual rerun is authorized by that freeze**. That allowance was the basis for P2G23; P2G24 then failed in its distinct published-callback arrangement. Neither failure silently creates another permitted attempt. Before ANY next paid YSSY run, separately:

1. Adjudicate probe 17 and 18 exact finalizer, provider subscription ownership/zero active subs, historical cleaned vs retained blob state, and all unresolved incidents. Note observed P2G24 runtime and 30 raw objects; do **not** delete the evidence or claim lost runtime recovered.
2. Draft a **new bounded prospective infrastructure-invalid retry addendum** reviewing all P2G22–24 attempts, cumulative spend, objective reason for additional exposure, identical scientific criteria, exactly one possible fresh attempt **if scientifically justified**, and explicit nonadaptive decision rule. Obtain human approval; if governance refuses, YSSY remains invalid/unmeasured under existing protocol.
3. Implement/test selector to bind and enforce only that approved amendment. Original Oct 8 helper `scripts/v39_phase2g_monday_yssy_local_time_prepare_v39.sh` hardcodes `P2G23` runtime/AUTH, expired dates and consumed one-attempt authorization. **Never execute its `runtime`, `auth-draft`, `auth-approve`, or paid launch paths as a new YSSY run.** Likewise never reuse P2G24 identifiers.
4. Freeze fresh source/owner SHA, callback deployment bundle digest, provider URL, original preprobe/early-scope/YSSY-hours hashes; approve new budget-day ID, exact runtime and new authorization only after review and successful preflight.
5. Validate exact callback route, HMAC webhook secret, DB URL binding **plus actual read-only DB connectivity**, live signed synthetic disposable-only webhook durable-before-2xx, provider-size payload and object-store roundtrip and idempotency. Correct account zero billable subscriptions and settled credit evidence mandatory before paid action.

**If any hard gate fails, Sunday PDT 8 PM is a zero-credit preparation/checkpoint only; defer to the next weekday slot.** No launch by schedule alone.

## 4. Receiver backup: preplanned fail-closed FIRST; optional redundant ingress only after protocol approval

### A. Immediately usable *safety backup* with current architecture

- GitHub Actions remains sole provider subscription/create/delete owner, with a separate independent GitHub safety watchdog. Do not depend on persistent Replit Shell/nohup process or laptop wakefulness.
- Before launch: published endpoint `https://replit-tranvr--hk84164.replit.app`, exact deployed immutable app build/version and original callback path verified. Preserve readiness `GET /` response but do not use it as sole proof: run exact four stage health checks plus an isolated correctly signed **synthetic** callback to a disposable test session with real byte persistence, and check cold-start end-to-end response against provider ~10s budget.
- Run continuous owner/watchdog healthy-stage checks during actual 120m window, requiring exact route auth, HMAC secret, callback version, resolved database binding, actual durable raw object ingest and monotonic counters. Extra optional diagnostics must not increase provider/API credit spend.
- If Replit cold-start/replacement causes three consecutive failures or observed callback persistence stalls: **the experiment fails closed**; GitHub owner stops provider billing by deleting/verifying **only the exact owned subscription**, collects poststop settling/reconciliation evidence, retains failures/censoring, and quarantines objects per approved retention. **Do not silently switch provider webhook URLs, create overlapping subscriptions, republish Replit, resume partial 120m exposure, fabricate missing events, lower timeout/three-strike safety policy, or tolerate 1 credit gap.**
- Pre-store and test a *manually runnable exact-ID provider subscription recovery procedure* in the independent GitHub safety system. Recovery must never delete foreign subscriptions or trigger unapproved provider creation/refill.
- On incident, pin current owner/actions/Git source/deployed-build SHA, platform logs and timestamps, DB postmaster time and unlogged-session evidence, exact raw-ref count/hash, external spend vs internal ledger. After stabilization, return to a **new** review/authorization rather than automatic paid rerun.

**A GitHub monitor that merely notices lost Replit connectivity is a SAFETY fallback, not a scientifically valid delivery failover**. It cannot preserve paid provider notifications already lost between source and HTTP listener.

### B. Scientific continuity option if *zero dropped provider deliveries during Replit replacement* is required

Preflight a **separate durable ingestion front door** (or genuinely always-on Reviewed Reserved VM), BEFORE any paid subscription is created:
- Subscription webhook URL must remain stable and preauthorized for full exposure; configure provider notification HMAC accordingly. Never change midrun unless provider supports proven atomic migration and it is prospectively frozen.
- Front door must authenticate provider, preserve exact raw bytes in durable object/queue, atomically record delivery identity and explicit ACK-after-durability, support retry/idempotent exact event ID/cost accounting, and use backpressure/capacity envelopes.
- Replit V3.9 becomes a replay/idempotent processor; documented local/DB restart cannot lose delivery queue messages or double count provider spend. End-to-end integration + controlled outage test, provider upstream 10s ACK constraint, and source/metric invariants must pass in a disposable nonprovider dataset first.
- Redundant region/host or reserve VM does **not** cure external/internal credit gaps unless authoritative provider receipt reconciliation and retry behavior are also validated. If no eligible low-cost durable receiver is validated, default to no-go rather than operating insecure ad hoc standby.
- Evaluate all changes for provider callbacks' one-target semantics, contract/source hashes, cost, data retention, privacy and academic methods. Changing receiver architecture is a **prospective engineering change requiring explicit review**.

### C. Deployment class decision

Observed Autoscale termination/start cycles and occasional ~3–5s startup-like GET latency make Replit instance lifecycle a credible failure exposure, not confirmed origin of original P2G24 failure. Pending Replit support case **#564568**, review provider of instance stop reason/cold POST buffer semantics. If budget permits, evaluate Reserved VM **only after explicit pricing approval**. It reduces idle-scale-to-zero but does not prevent crashes, PostgreSQL UNLOGGED reset or missing delivered credits.

## 5. Sunday PDT 8 PM run GO/NO-GO checklist

**Required evidence (all true):**

- [ ] A NEW approved prospective bounded YSSY retry amendment overrides the consumed P2G22 allowance after reviewing P2G23/24; selector refuses repeat without it.
- [ ] Prior exact sessions adjudicated/censored as historical failures, closed/no active billable subs; P2G24 object retention evidence respected.
- [ ] Replit receiver startup/health *and correctly signed synthetic durable ingest* verified under idle/restart, not just GET and HMAC binding.
- [ ] GitHub actual owner/source HEAD and published independent bundle/version hashes are sealed; PR #26 / PR #27 are still unmerged as of last check; no unreviewed callback-only `.replit` changes to team `main`.
- [ ] New probe-budget day, AUTH, runtime and approval for **Monday Oct 12 03–05 UTC**, no old P2G19/P2G23/P2G24 identifiers reused.
- [ ] Exact live preflight pass for YSSY slot/weekday, >=1,500 credits, subscription isolation, 500 max day ceiling, scientific v2, no open incidents, proper callback/DB/storage binding.
- [ ] Independent GitHub watchdog/owner recovery route proven, including exact ID cleanup fail-closed.
- [ ] Explicit final human go/no-go with observed hashes and UTC timestamps; no implicit permission from this runbook.

**Current outcome:** **PREPARATION / NO-GO pending these new gates**, not cancellation of Phase 2G or automatic progression to Phase 6. If these cannot be completed by Sunday, safely slide to a following eligible UTC weekday without changing the scientific time class. Failing early is cheaper and scientifically more defensible than repeating P2G22–24 invalid paid exposures.

## 6. Source hierarchy and provenance notes

- Plan §9 remains base V3.9; implementation log §1.7.7 describes Phase2G Stage1. These large base documents contain old historical 12-candidate/Stage2 rules and prior "no weekend" remarks; apply later **dated, prospectively frozen early-pilot amendment** and YSSY local-time freeze in that limited scope. Sunday PDT evening maps to **Monday UTC and Monday Sydney**, meeting the frozen *weekday* requirement, not overriding a weekend prohibition.
- P2G22–P2G24 causal investigation: [primary incident](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md), [published lifecycle correlation](2026-10-09_P2G24_REPLIT_LIFECYCLE_COLD_START_GITHUB_CORRELATION.md), [operator ledger/object audit](2026-10-09_P2G22_P2G24_OPERATOR_READONLY_AUDIT.md), [synthetic integration protocol](2026-10-09_P2G24_NEXT_SYNTHETIC_INGRESS_FAULT_PROTOCOL.md).
- [Replit support issue #564568](https://github.com/HKcode22/ReplitTranvr/issues/28) tracks platform evidence. Lack of accessible original logs after unpublish/republish does not rule out retrieving provider-side lifecycle evidence, but do not count it as resolved.
