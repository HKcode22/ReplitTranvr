# DRAFT ONLY — proposed bounded P2G25 YSSY infrastructure-recovery adjudication and prospective amendment

**NOT AUTHORIZED / NOT FROZEN / NOT MACHINE-CONNECTED / NO PAID LAUNCH PERMITTED BY THIS FILE.**

Prepared for scientific and operator review on 2026-10-10. Proposed future identifier **P2G25** is a *placeholder* and MUST NOT be bound to any live probe, budget, authorization, or synthetic session until reviewed. This document does **not** amend any existing frozen artifact or override any current selector.

## Scientific governance question

Under [V3.9 F.8](../../V3.9_DataCollectPlan_f.8.md) §9, [implementation log](../../V3.9_IMPLEMENTATION_LOG.md) §1.7.7, current [early-pilot amendment](../amendments/2026-10-02_EARLY_PILOT_SCOPE_REDUCTION_YSSY_SKBO.md), [YSSY local-time freeze](../amendments/2026-10-03_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_FREEZE.md), and the [P2G22 manual recovery freeze](../../../artifacts/phase2g-early-pilot-yssy-p2g22-recovery-freeze-20261007.json), can we justify **at most one further controlled YSSY infrastructure-invalid rerun** after resolving *specific measured technical defects*, without outcome-driven sequential sampling?

**Current answer: NOT YET.** Existing P2G22 freeze explicitly limits extra attempts to 1 (consumed by P2G23) and prohibits further automatic/manual retries under that record. P2G24 also failed; the new amendment requires separate prospective approval, no retroactive rewrite and selector version/frozen digest prior to any future provider creation. The scientific decision may instead be to stop Stage-1 YSSY and report **unmeasured due to technical invalidity**, with the narrowed sampling frame explicitly disclosed.

## Exact immutable YSSY history

| Probe | Label | Actual evidence | Decision |
|---|---|---|---|
| 16 | P2G22 | 120m, `failed` / uncensored / `DELIVERY_GAP`, 260 external vs 259 internal Alert credits, 56/56 observed HTTP2xx; 1 missing credit origin not proven | Excluded |
| 17 | P2G23 | `failed` / censored / `UNRESOLVED` due to callback-health three-strike around +88m using development callback | Excluded |
| 18 | P2G24 | `failed` / censored / `UNRESOLVED` due to callback-health three-strike around +59m using published Autoscale callback; 30/30 referenced raw blobs verified correct on Oct9; cause of underlying published instance change unknown | Excluded |

Preserve these rows and all receipt hashes. Neither active-health 130m success nor sparse-health 146m success retroactively validates these attempts.

## New external evidence for engineering review

Quinn, Replit Support ticket **#564568**, reply Oct 10 02:39 UTC, confirms Autoscale can hold cold-start HTTP requests only until ready; timeout during scale events can lead to undelivered POST and Replit does not retry it. Existing historical logs hidden from current revision after user republish; engineering asked to inspect prior revision. Reserved VM avoids idle scale-to-zero but still does not guarantee all incoming webhooks durable. The **original exact P2G24 cause is not yet known**.

Official [AeroDataBox 2026 Flight Alert guide](https://aerodatabox.com/flight-alert-api-2026/) states credit-based webhook POST attempt is billed on SEND, delivery success not guaranteed; retries OFF by default but can be enabled only as a billable explicit option. Production code `server/lib/disruption/prepaidProbeWindow_v39.ts` and `aerodataboxLimiter_v3.ts` explicitly freeze `maxDeliveryRetries:0` and forbid nonzero; prospective policy must review receiver architecture before changing this.

## Prospective eligibility proposal (draft; zero provider actions)

A single further technical YSSY attempt **could be considered** only if **all** of the following are independently documented and approved **before its result**:

1. Incident-specific end-to-end root cause either reproduced on isolated data OR covered by a demonstrably successful mitigation and stress test. Passing GET/HMAC binding alone is insufficient. Determine whether published instance replacement, routing readiness, UNLOGGED PG restart, or paid-delivery record accounting makes loss unsafe.
2. **Actual correctly signed synthetic, nonempty flight-item POST** across a cold start/restart is durably committed and acknowledged within the external sender limit, using independent disposable database/object storage and strict mock upstream latency (no paid provider).
3. At least one defensible delivery continuity method: tested always-on Reserved VM (cost explicitly approved) or independent durable ingress/queue with stable provider callback URL and raw-before-2xx contract. A mere GitHub watchdog is *failure containment*, not delivery preservation.
4. Reconciliation: outstanding one-credit P2G22 class fail-closed, zero tolerance, explicit credit-cost-per-attempt accounting. Neither count of 2xx requests nor unique flight count substitutes for authoritative provider spend.
5. Proper signed exact-session cleanup/recovery, no active foreign/owned billable subscriptions, prior probes 17/18 terminal and exact retention obligations satisfied; any missing historical evidence flagged instead of backfilled.
6. Immutable frozen preprobe and YSSY local time class, `v39-physical-flight-instance-v2`, 60 rows/hour feasibility, >=6 complete stability buckets, 120m matching exposure, zero gap, 450-credit reservation + 50 margin, max 500 per UTC budget day, protected 1,000 account floor, no UTC midnight overlap.
7. Frozen candidate date: **Monday Oct12 03:00–05:00 UTC** (= Sunday Oct11 20:00–22:00 PDT, Monday 14:00–16:00 Sydney AEDT) only if gates pass; otherwise shift to the **next matching weekday UTC class without changing yield-based selection**. Date does not grant authorization.
8. Separate human-approved **new** amendment with exact source/artifact hashes, max one bounded attempt (if approved), explicit expiry and consumed-upon-attempt semantics, no post-hoc eligibility/tolerance change, no automatic additional retry, no fallback to historical proof, and documented contingency if that attempt fails.
9. Real signed callback end-to-end verification, deployed build hash, DB and provider secret bindings, GitHub paid owner/watchdog and 120m execution safety from exact immutable HEAD; fresh budget/AUTH/paid preflight only after successful zero-credit evidence.
10. Independent scientist/operator review and explicit final launch approval; PR merges and repo code only after planned reviews. This file **does not authorize anyone** to create a subscription or issue paid account mutations.

## Backup/failure response if an approved technical attempt later encounters another callback failure

- **Never silently retry, extend, reclassify a partial window, or change endpoint mid-flight**. Independent GitHub owner and watchdog invoke exact-ID provider subscription termination and verify billing stop; preserve original failure and residual send/receive mismatch.
- Do not set `reconciliation=MATCH` from health status or create replacement rows. Quarantine and preserve referenced raw payloads per 168h expiry policy; do not copy them to public repository. Record SQL postmaster start, frontend instance transition, receiver latency and probe/callback counters as redacted forensic evidence.
- If provider webhook cannot be made robust enough, terminate prospective Stage1 YSSY effort and report a missing Oceania domestic contrast; the narrowed early-pilot findings must not be generalized to a global anchor sample.

## Governance review slots

| Required review | Value now |
|---|---|
| Root cause confirmed or robustly mitigated in a verified whole-route fault harness | **NO** |
| P2G22 external 260 / internal 259 origin explained | **NO** |
| Replit Support engineering logs recovered | **PENDING ticket #564568** |
| Signed realistic webhook cold-start persisted/ACKed within sender timeout | **NOT TESTED** |
| Ingress topology / reserved tier billing approved | **NO** |
| Proposed further attempt count scientifically justified and frozen | **DRAFT ONLY** |
| Selector/runner updated to enforce new prospective rule | **NOT IMPLEMENTED / MUST REFUSE** |
| New runtime, budget ID, AUTH approved and checked | **NONE** |
| **Launch readiness** | **NO-GO** |

[Current forensic report](2026-10-10_REPLIT_SUPPORT_564568_AUTOSCALE_NO_RETRY_YSSY_STAGE1_RISK.md) and [Sunday Stage-1 contingency](2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md).

**No automatic retrospective authorization. User and scientific owner must explicitly authorize any future bounded attempt after full review.**
