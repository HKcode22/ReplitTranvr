# DRAFT prospective YSSY Stage-1 6+4 supervisor-health policy amendment

> **SUPERSEDED AS PREFERRED CANDIDATE (2026-10-10):** The prospective test preference is now **SIX primary + SIX conditional backup health checks (12 maximum)**. See [6+6 draft amendment](DRAFT_2026-10-10_YSSY_STAGE1_SIX_PRIMARY_SIX_BACKUP_WATCHDOG.md). This 6+4 record is retained as the test/control baseline; **neither proposal is approved for paid use**, and the actual deployed three-strike watchdog is unchanged.


**State:** PROPOSAL ONLY / not adopted by any paid owner, not approved, not authoritative. Prepared 2026-10-10. This amendment does NOT create a fresh budget-day authorization, change prior P2G22/23/24 results, or grant permission to create/modify AeroDataBox subscriptions. Paid YSSY remains NO-GO pending all unchanged Phase 2G scientific and operational readiness gates.

## 1. Purpose and exact scope

The project lead proposes a **six-failed-health-cycle primary tolerance** and **four additional bounded contingency failed-health cycles** for temporary Replit callback endpoint unavailability. Objective: avoid automatically censoring a scientifically complete Stage-1 run solely because an HTTP health probe transiently timed out or returned 502/503/504, as historically happened briefly in accepted WSSS.

It changes **only the independently operated GitHub-owned supervisor's classification and stop timing for transient callback HEALTH probes**, not any AeroDataBox webhook subscription retry count, not a downstream HTTP POST retry rule, and not a guarantee of source event recovery. A failed monitoring GET/POST is an observability event, **not necessarily a missing AeroDataBox flight notification**.

**Frozen provider billing:** `maxDeliveryRetries=0`. The official [AeroDataBox January 31, 2026 guide](https://aerodatabox.com/flight-alert-api-2026/) states the credit-based provider sends each alert attempt at billable cost, including failed arrivals, and separately billable provider delivery retries (0 by default and up to 2 by API parameter). Its maximum is **not 10**. The proposed ten checks refer only to supervisor checks.

## 2. Frozen scientific data contract remains unchanged

- Airport **YSSY**, exact prospectively registered 120-minute UTC observation window, original eight 15-minute source-UTC buckets and calendar/class-coverage strategy under F.8.
- Preserve `v39-physical-flight-instance-v2` unique confirmed operator physical-flight IDs rather than confusing deliveries, item rows, code shares or multiple observations of one flight.
- Preserve true original first trusted ingress/source event UTC and full on-wire raw bytes/readback hash for each delivery, not a new processing timestamp on replay; exact provider-attempt identity/credits in one-to-one external-vs-internal audit, no credit gap tolerance.
- Any missing data are **not imputed, backdated, shifted or silently replaced** by a later check or provider retry. A lost notification remains a known loss and the affected run must be censored or prospectively adjudicated.
- Preserve provider account floor, frozen budget, one-owner/one-subscription isolation, cleanup guarantees, original historical failed/censored run status and exact cancel/stop authorization.

## 3. Proposed stop decision

- The four real supervisor stages are wrong-secret route rejection, published runtime/source identity, webhook-secret binding, and database-string-binding. **Status 200 with incorrect schema, revision, ownership or secret is a hard contract mismatch**, never a recoverable false alarm. Also immediately stop on known sender/edge billed-attempt mismatch, owner split-brain, known missing original source bytes/flight identity, expired bounded backlog or credit ceiling breach; never wait for the next scheduled health cycle.
- Transport/network timeouts and explicitly identified HTTP 502/503/504 can enter **six primary checks**. A healthy response before six resets the consecutive-health counter; the separate scientific evidence audit continues. Conditional continuation requires source integrity evidence sufficient to rule out unrecognized billable data loss.
- At **health failure cycles 7–9**, at most **four conditional contingency cycles** are available. They require continuously current and independently authenticated source-attempt watermark, durable-before-2xx original bytes and 168-hour retention, original ingress UTC, complete elapsed 15-minute bins, physical-v2 identities, unique owner/lease, nonexpiring queue and frozen cost ceiling. If the underlying evidence becomes stale or contradictory, stop immediately.
- At **tenth consecutive failed health cycle**, terminate the paid owner through the established fail-closed recovery/cleanup path. **Terminating is not the same as scientifically declaring all existing data invalid**: a separate exact terminal science/accounting adjudication determines whether the originally frozen complete 120m window was observed and whether durable evidence survived.
- Nominal monitoring cadence remains **15,000 ms**. Four health subchecks each have their own **8,000 ms** timeout, and the actual code skips overlapping health cycles. Consequently 6 and 10 checks are **not hard real-time guarantees of 90 or 150 seconds**; measure actual elapsed monotonic wall-clock and cap billable exposure independently. A different hard time ceiling needs prospective formal approval.

## 4. Statistical and scientific validity judgment

A monitoring tolerance change **does not inherently** change numerical features, original 15-minute buckets, physical-v2 identity or model labels; it **can be valid** when all independent original observations and credits are provably present.

However the STOP RULE does affect the **probability of completing a probe** and thus selection of accepted airport runs. Missingness may be informative (correlated with traffic, payload size, source outage or hosting load), meaning a mere larger threshold might change the sampled population. Therefore **do not treat this as a pure cosmetic operational adjustment**. Pre-register the new policy **prospectively** for comparable Stage-1 runs and record diagnostic exposure in minutes, latency, monitored outage counts, sender credit gaps, missing delivery count, accepted unique physical-v2, terminal bin coverage and exact publication/build SHA. Preserve older 3-strike outcomes as historical, not equivalent controls without qualification.

A final PASS requires identical independently verifiable old scientific acceptance criteria: exact 120-minute UTC exposure, all 8 bins (and any frozen lower bounds), per-item identity and original source timing, provider external-internal attempt/cost reconciliation, valid subscription ownership and durable preserved evidence. A recovered health endpoint alone is **not** a PASS.

## 5. Necessary authorization and acceptance before *any* paid use

1. Deploy a proven independent durable ingress that records exact raw bytes, first-edge UTC and unique attempt identity before any 2xx, with at least 168-hour source retention and safe queue/replay across instance replacement.
2. Obtain independently verifiable sender/edge and provider billed-credit evidence at ongoing watermarks, not test-provided Booleans. Clearly classify "no event emitted" separately from "unobserved event due to outage". Protect unchanged provider `maxDeliveryRetries=0`.
3. Prove cross-process ownership, bound paid exposure and a single live subscription, actual live callback/storage/DB durability, source/build signing, independent watchdog and cleanup; avoid unauthorized paid CREATE on ambiguous outcome.
4. Pass adversarial 6+4 offline/actual-supervisor tests and an honest **120-minute published-equivalent no-provider wall-clock** interrupted-delivery rehearsal with R0/R1–R11, cold Replit starts, source replay and item-by-item accounting. Mere healthy GET or accelerated synthetic timer is insufficient.
5. Complete original P01–P20 release gates and new prospective specific YSSY retry approval (new auth ID, exact UTC window, fresh budget-day, no stale overlapping paid subscription, confirmed live balance and explicit human GO). PR #26/#27 main/deployed equivalence must be independently verified.
6. If the evidence checks cannot run against the production receiver, the **live existing 3-strike policy remains**. Do not enable this draft as a bypass or silently convert an unreconciled run to PASS.

## 6. Test evidence and current status

- Selected prototype: `experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39.ts`; 6+4 model and signed sender-edge cross-checks.
- Real supervisor telemetry mapper: `experiments/phase2g_rehearsal/synthetic_real_health_6plus4_adapter_v39.ts`, which maps actual emitted reason/status/stage to transient vs hard diagnostic. Both files are **test-only**, not imported into the live supervisor.
- Isolated continuous integration verifies **decision logic**, not authenticated production source provenance or true 120-minute hosted durability. Do not promote CI status to real paid authorizations.
- Historical WSSS recovered after two health failures; historical YSSY P2G24 failed after three, with original 04:58 UTC Replit replacement reason still unresolved. Hypothetical survival at check 4 is not established and must not be backfilled.

**Disposition:** selected prospective test candidate is SIX primary + FOUR conditional backup health checks. Existing paid default remains THREE while the real-source/ingress and end-to-end gate remains unclosed. **Paid YSSY Stage-1 tomorrow 2026-10-11 20:00 PDT is NO-GO on current evidence; not automatically cancelled or reauthorized by this draft.**
