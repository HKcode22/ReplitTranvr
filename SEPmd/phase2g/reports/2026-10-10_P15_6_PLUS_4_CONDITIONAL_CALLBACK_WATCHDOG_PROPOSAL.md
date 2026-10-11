# P15 – Six primary callback health checks plus four conditional recovery checks

> **SUPERSEDED AS PREFERRED CANDIDATE (2026-10-10):** The prospective test preference is now **SIX primary + SIX conditional backup health checks (12 maximum)**. See [6+6 draft amendment](../amendments/DRAFT_2026-10-10_YSSY_STAGE1_SIX_PRIMARY_SIX_BACKUP_WATCHDOG.md). This 6+4 record is retained as the test/control baseline; **neither proposal is approved for paid use**, and the actual deployed three-strike watchdog is unchanged.


**Date:** 2026-10-10. **Status: ISOLATED IMPLEMENTATION PROTOTYPE / PROSPECTIVE SCIENCE REVIEW ONLY.**
**Paid-live recommendation: NO-GO.** This is not a source-of-truth modification to V3.9 F.8, not a new authorization, and not a deployed change.

## Verified CI checkpoint — actual source commit 21cfff48b8fd4ef0885e57c27999023f24caec83

[GitHub Actions #38087817211](https://github.com/HKcode22/ReplitTranvr/actions/runs/38087817211) **COMPLETED SUCCESS IN BOTH JOBS** with **28 offline Vitest suites / 251 of 251 tests passing**, 18 separately isolated actual health-function cases, TypeScript typecheck and **36/36 real V3.9 localhost disposable PostgreSQL tests**. Dedicated isolated PostgreSQL 16 SIGKILL/reset check again confirmed UNLOGGED state disappearance while the one LOGGED synthetic owner binding survived. All traffic was to localhost / synthetic senders, with NO actual paid AeroDataBox calls/credits, cloud-resource provisioning, Replit publish, scientific database writes or `main` merge. This is GitHub Actions quota usage, not a real $0 hosted 120-minute rehearsal.

**The adversarial integration tests caught and corrected two meaningful false-safe cases before this green result:**

- A known missing signed provider-emulator billable attempt could be masked by a less specific "independent sender watermark unverified" classification and a recovered HEALTHY GET, leaving the hypothetical owner running. The `ATTEMPT_OR_BILLING_GAP` veto now takes precedence and stops at the first observation even when GET returns 200.
- A healthy endpoint could previously leave known missing original bytes, irreconcilable physical-v2 identity or expired durable backlog categorized as monitoring recovery rather than hard scientific loss. These evidence-failure states now stop immediately; *mere lack of independent verification* without a known loss remains audit-pending on healthy samples, but cannot justify outage grace.

**Additional three tests** bind the six-plus-four candidate to independently signed **synthetic** sender and edge HMAC attempt evidence. Matching signed identities alone are still insufficient without separately declared 168-hour raw-byte durability; with it the 6+4 candidate can recover in the synthetic policy test, never scientifically approve payment or completion. A deliberately missing billed attempt causes an immediate veto. Combined new six-plus-four cases amount to **26** tests beyond previous baseline 225 (23 in the 6+4 model tests, 3 in the signed-evidence integration test).

**Crucial limit:** These test fixtures are *not* a production-verifiable independent AeroDataBox sender ledger, hosted durability, or a representative 120-minute wall-clock simulation. The signed sender is an emulator and source/retention flags are declared by the test. The current paid supervisor `CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3` is **unchanged** and unmerged. The six primary plus four conditional backup policy is a **selected prospective design**, NOT a ready-to-enable live service option.

## User-preferred policy

When the *GitHub-owned supervisor's callback health monitor* encounters transient Replit HTTP/network unavailability, compare a **six-check PRIMARY health window plus four additional CONTINGENCY checks**. Preserve the full frozen 120-minute Stage-1 observation window and provider `maxDeliveryRetries=0`.

**Six + four does not mean six upstream AeroDataBox delivery retries and four more upstream retries.** Upstream paid delivery attempts remain zero retries. This is a watchdog sampling policy only.

Existing live supervisor source: `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts`, `CALLBACK_POLL_MS=15000`, `CALLBACK_CONSECUTIVE_FAILURE_LIMIT=3`, SIGTERM on third consecutive unhealthy monitoring cycle. No production source or deployment changes were made.

At fixed nominal 15-second sampling cadence, six checks cover approximately **90 seconds of periodic sampling** and ten approximately **150 seconds**; *the elapsed time from first to sixth/10th failed sample is ~75/135s respectively*. Four sequential per-cycle health endpoints each have bounded timeout and callback checks skip overlapping requests, so **actual wall-clock grace must be measured**, not inferred by multiplying the count.

### Controlled states

| Condition | Suggested offline policy |
|---|---|
| Health fails check #1 to #6, AND genuine independent exact-source/attempt/credit/owner evidence remains continuously current | `PRIMARY_GRACE`: keep observing, scientific verdict pending |
| Health is still failing #7–#9, evidence still complete, full source bytes/backlog retained and bounded | `CONTINGENCY_DEGRADED_BUT_DURABLE`; no provider delivery retry; no scientific PASS |
| Health recovers during first six or backup four | `HEALTH_RECOVERED_AUDIT_PENDING`; reset consecutive counter, independently reconcile original wire/time/physical items/paid attempts and every elapsed 15min scientific bin |
| Ten failed checks in succession | Terminate bounded paid owner *even if* simulated durable source evidence is consistent; settle and assess scientific completeness separately |
| Known mismatched provider/edge credits or attempt identity, wrong callback secret/build/owner/subscription, unsafe budget or concurrent owner | Immediate hard STOP; never wait for six/ten |
| Any failure with **no current independently durable complete source evidence** | Stop/censor per safe fallback; do not assume that waiting will recover unrecorded, non-retried upstream webhooks |
| Source proof becomes stale or one physical flight item disappears **during** check 7–10 | Revoke contingency immediately; do not finish remaining checks |
| Any pending or future 15-minute bucket (not yet elapsed) | Must not be pretended complete during the run; verify each **elapsed** bucket at the current watermark, then all eight at final scientific adjudication |

The only reason to permit the additional health checks is documented evidence that monitoring unavailability does **not** amount to lost billable data or scientifically invalid exposure. **GET / 200 is not sufficient.**

## Prototype implemented in draft branch

- `experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39.ts`: isolated policy model with exact 6 + 4 + frozen 15-second poll and max provider delivery retries zero. Returns `scientificAdjudication = PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS`, `paidLaunchAuthorized=false`, `liveSupervisorModified=false`, `publicationApproved=false`, regardless of inputs. It does not hold a signing key, subscribe to any real provider, or recover historical YSSY.
- `tests/phase2g_synthetic_watchdog_six_plus_four_v39.test.ts`: 21 adversarial offline tests: six-failure primary; seventh–ninth contingency; exactly tenth bounded stop; WSSS historical 2-failure recovery pattern; hypothetical YSSY 3-failure continuation **without rewriting the failed historical status**; multiple independent transient spells and counter resets; hard secret/source/build/owner, flight item, credit mismatch, raw source SHA and original UTC, raw 168-hour retention, bounded queue TTL, frozen credit ceiling, freshness and emitter-attempt watermark continuity, and loss of evidence during contingency.
- Existing independent emulated signer/source/SQL tests and 3-vs-6-vs-10 comparison stay unchanged, so independent regressions of the historical 3-strike policy remain enforced.
- The implementation still relies on **fixture-declared independent evidence booleans**; as such, it is *not* a production-evidence verifier and never asserts genuine source integrity or scientific acceptance. A matching object/credit counter is not a proof of authenticated actual AeroDataBox billing.

## Why we did not change the paid supervisor yet

1. P2G24 Replit published Autoscale instance replacement around 04:58 UTC and the cause are not independently resolved; WSSS's two transient failed health checks that recovered demonstrate tolerance to benign glitches is possible, not that lost unbuffered webhook POSTs are replayable.
2. A callback health GET / runtime SHA / secret match is not necessarily proof that live SQL and object storage can accept a **POST within the upstream deadline**; Replit support says it does not buffer/retry failed webhook POSTs.
3. Independent signed actual sender-attempt/credit accounting and **persisted original full wire bytes BEFORE 2xx** are not implemented. Increasing the allowed outage with zero upstream retry can increase the number of permanently missing notifications and thus cause a billable censored run.
4. The synthetic 168-hour-retention / first UTC / eight-bin / physical-v2 "true" fields are declarations. Need immutable, independently verifiable production audit objects and actual reset/replay reconstruction before the conditional grace predicate is trustworthy.
5. A platform type change (such as Reserved VM) may have recurrent hosting cost and would still need latency/reliability science testing and explicit approval. Neither it nor a cloud failover service was provisioned.

## P01–P20 plan relevance and exit evidence

All 20 gates remain tracked in [master list](2026-10-10_YSSY_REMAINING_GATES_AND_120MIN_ZERO_CREDIT_REHEARSAL.md), many partially advanced. This proposal chiefly affects **P07/P08/P15/P17/P20**, conditional on closing **P09–P14** (original durable source admission, cost/retention, authenticated first UTC, at-least-once safe replay, UNLOGGED recovery, true sender-attempt reconciliation), plus owner/cleanup and deployment gates P16/P18/P19. No unit test alone closes a paid-live gate.

**Next required proof:** a realistic *independent* source-to-edge durable receipt/emulator with frozen source bytes, retention and trusted timestamps that can survive 90–150 seconds of Replit unavailability and recover all observations, plus an actual hosted, isolated **120-minute no-provider wall-clock rehearsal** with R0 and R1–R11. Independently evaluate six+four vs baseline for **false scientific PASS rate, expected paid exposure, raw-data loss, callback P95/P99, source-to-SQL lag, physical-v2 count and 8 bins**, then prospectively approve any alteration before a real run.

**Provisional recommendation:** retain user's **6 primary + 4 conditional contingency** as the selected *candidate architecture*; **do not silently change existing live 3-strike supervisor** or provider retries until independent durable provenance and bounded-budget safeguards are implemented and reviewed. No paid Stage 1 YSSY GO was granted.
