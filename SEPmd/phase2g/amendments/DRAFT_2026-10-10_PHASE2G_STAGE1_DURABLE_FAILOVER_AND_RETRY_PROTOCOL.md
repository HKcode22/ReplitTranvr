# DRAFT DESIGN — Phase 2G Stage-1 YSSY durable ingress fallback + optional provider retry tier

**Status: ENGINEERING RFC ONLY. Not implemented, authorized, deployed, merged or substituted into the scientific protocol. No provider calls or infrastructure charges.** Date: 2026-10-10. No Replit private-invite links, credentials, provider payloads, secret webhook URL tokens, or account identifiers belong in this document.

## User objective / invariants

Keep **GitHub Actions as the ONLY paid subscription/budget owner and independent safety watchdog**, and keep **Replit V3.9 existing callback parsing, flight-identity resolution, object persistence, reconciliation, and study analysis**. Add a separate, very low-cost durable webhook ingress for cold starts/route replacement, with the option of a **second provider-delivery retry tier** only if scientifically and financially reauthorized in advance.

This is **Phase 2G Gate 2 Stage 1 YSSY**, *not* Phase 6 or Stage 2. Current 120-minute matched YSSY preferred UTC class is Monday 03:00–05:00 UTC (= Sunday 8–10 PM PDT, Monday 14:00–16:00 Sydney AEDT); it is **candidate-only and not authorized**. No changes to the frozen preprobe/early-pilot/time-class/physical-v2 gate, no post-hoc rerun selection, no automatic extension of a censored exposure and no tolerance for a missing credit. [Sunday readiness runbook](../reports/2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md); [bounded recovery proposal](../amendments/DRAFT_2026-10-10_YSSY_POST_P2G24_BOUNDED_TECHNICAL_RECOVERY_PROPOSAL.md).

## Confirmed external constraints

1. Replit Support ticket #564568 confirmed: Autoscale may go idle and scale to zero; requests can be held during startup but may time out; **Replit will neither buffer nor retry failed upstream webhooks**; current publication hides earlier revision logs. Exact P2G24 original shutdown cause still under engineering investigation. Reserved VM is excluded by cost preference.
2. AeroDataBox credit-based alert subscriptions default to **no retries**; retries `0..2` must be set when **creating** a subscription, and **each delivery attempt** is billable by flight item even if endpoint is down. Official [Flight Alert API 2026](https://aerodatabox.com/flight-alert-api-2026/). Existing `prepaidProbeWindow_v39.ts` intentionally requests `maxDeliveryRetries: 0`; `aerodataboxLimiter_v3.ts` refuses any positive setting. **Do not modify these defaults merely by adding a fallback diagram.**
3. Cloudflare Workers + Queues is a **candidate** for low-cost edge ingress, *not a selected or connected service*: [Queues Free tier announced 2026-02-04](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/) with 10,000 queue operations/day and **24-hour Free-tier queue retention**, 128 KB maximum message size ([limits](https://developers.cloudflare.com/queues/platform/limits/)); [R2 Standard Free tier](https://developers.cloudflare.com/r2/pricing/) lists 10 GB-month, 1M Class A writes and 10M Class B reads/month. Verify signup/payment-card requirements, usage and availability on user's account separately. Cloudflare Queues is **at-least-once, not exactly-once** ([guarantee](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)); use idempotency. Do not claim these free tiers guarantee indefinite no-charge operation.
4. Current V3.9 raw-blob retention intent is **168 hours**; Cloudflare Queues Free retention is **24 hours**, insufficient alone for the project's evidence retention. Durable R2 object/manifest or equivalent must independently meet scientific and privacy retention requirements. Queue message should carry a **pointer + hash**, not full provider content (also avoids 128 KB cap).
5. The published Replit callback requires a shared secret in the URL path (`/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId`), and `server/routes_v3.ts` passes `receivedAtUtc: new Date()` to `persistPrepaidProbeWebhookV39`. This **assigns arrival at Replit processing**, not original arrival at an edge backup after minutes of delay. It must be addressed prospectively, with authenticated timestamp provenance, before scientific equivalence can be claimed.

## What must change / must not change

**Keep unchanged:** GitHub owner/safety watchdog control of provider lifecycle; scientific two-hour time window and operating class; V3.9 flight-instance-v2 extractor, identity rules, source freeze/evidence; zero gap acceptance; 450+50 reservation / max 500 / protected 1000 floor until a formally reviewed update; no duplicate or overlapping provider subscriptions.

**Minimal necessary new plumbing:** Subscription's webhook destination for the *next separately approved run* must be an **independent stable ingress URL**, since a call to the old `.replit.app` URL cannot magically fail over once it already failed. The ingress relay forwards the **same existing Replit callback route** and its scientific pipeline. Do not change the destination while a subscription is live or delete/recreate a replacement subscription during failover.

**Security:** edge verifies per-session shared secret without logging token; no public raw data; secrets in secret manager; TLS only; body cap consistent with existing 2 MB JSON parser; replay-to-Replit authenticates a separately designated edge principal (not publicly spoofable source-time headers); exact session binding; rate limit and deny replay outside bounded states. URL-path secret alone is a bearer token and must not appear in logs/traces, issue bodies or GitHub code.

## Proposed failover dataflow

```text
                     GitHub Stage-1 owner + safety watchdog
                      (creates/deletes ONE subscription only)
                                    │
                                    ▼
                        AeroDataBox Flight Alerts
                                    │
                                    ▼
                  STABLE EDGE INGRESS / FRONT DOOR
                 (not Replit; authenticate, hash bytes)
                                    │
                            durable raw write
                                    ▼
               R2 / equivalent immutable raw-object store
                   + durable receipt/index/manifest
                                    │
                              queue pointer
                                    ▼
                  at-least-once delivery queue + DLQ
                                    │
               normal operation / delayed replay
                                    ▼
             Existing Replit V3.9 callback/processor
               SQL + flight-identity-v2 + evidence
                                    │
                       verified processing ACK
                                    ▼
              queue acknowledgment / reconciled ledger

   On edge ingest failure BEFORE 2xx: return non-2xx.
   Optional AeroDataBox retries only IF retry budget + scientific
   amendment were explicitly approved at subscription creation.
```

**Crucial ordering**: The edge must return provider HTTP 2xx **only after** proof of durable receipt of source bytes and a recoverable index (and successful enqueue OR independently scannable durable manifest that can reconstruct the queue). Never ACK based merely on forwarding to Replit or receiving a warm `GET /` response. On raw-storage/manifest failure, return 5xx promptly; assume AeroDataBox may nevertheless bill SEND. If queue enqueue fails after raw+manifest write, either fail request and recover the durable orphan by reconciler or use a validated idempotent outbox pattern; **never silently lose an acknowledged R2 object**.

**Normal path:** Edge accepts/stores each event; asynchronously forwards quickly to existing Replit processing. The front door is logically active even while Replit is healthy—the sender must always use the stable URL. Backup *behavior* only activates when Replit is unreachable; at-least-once replay when recovered. This is the only workable meaning of an **automatic failover** without controlling the provider's retries mid-flight.

## Scientific time and credit accounting (HARD GATE)

Track and authenticate separately:
- `provider_notification_generated_at_utc` (if present),
- `provider_delivery_attempt_at_utc` (if present),
- `edge_received_at_utc` (trusted, immutable server-clock receipt at durable ingest),
- `replit_processed_at_utc` (current app processing time),
- `queue_replay_attempt`, `source_bytes_sha256`, `provider_subscription_id`, `session_id` and stable edge receipt ID.

Current `receivedAtUtc:new Date()` in the Replit handler means delayed replays are **incorrectly attributed to processing time** unless carefully changed. Do not trust arbitrary public `X-Received-At` headers. New edge-signed timestamp and source digest must be versioned, authorized and frozen before live use. Determine which frozen metrics depend on receive time / 15-minute stability buckets, preserve original observation windows, avoid inventing real-time capacity from post-run replay, and compare against earlier airport protocol comparability.

Keep separate ledgers:
- external provider charged `SEND` credits (including retries if approved),
- **edge durable receipts** (source notifications and provider attempts),
- **Replit internal committed delivery credits** and actual items,
- queue backlog/retry/DLQ/deadline and duplicates.

Queue redelivery **must not** increment AeroDataBox spend or an internal unique logical delivery credit. A new *provider* retry may itself be an independently billable attempt; preserve its `deliveryAttempt.seqNo` and cost rather than conflating it with queue replay. Exact final reconciliation stays `MATCH` only if provider-spend, correctly deduplicated internal attempt ledger and source evidence agree; `DELIVERY_GAP/UNRESOLVED` stays fail-closed even if raw R2 blobs exist.

**Window invariant:** A Replit outage during the two-hour provider exposure may be recoverable by replay, but if queue backlog is not drained and settled within the **prospectively frozen grace and retention period**, the experiment fails/censors. No extension of the source sampling exposure to manufacture a complete 120-minute window, and no fake 60 rows/hour in processor wall-clock time.

## GitHub watchdog: HEALTHY / DEGRADED_BUT_DURABLE / FAIL_CLOSED

- `HEALTHY`: edge receipt+manifest+queue end-to-end healthy, Replit healthy, no overdue backlog, sustained correct authenticated processing.
- `DEGRADED_BUT_DURABLE`: Replit unavailable while edge continues verified durable receipts **and queue age/backlog ≤ preapproved ceiling**; GitHub preserves ownership and billing cap, emits exact degraded evidence; **prospectively approved** timeout/degraded limit may allow recovery **without automatically ending at first three bad Replit polls**. This requires explicit frozen change to current 15s/3-strike policy. Under current existing policy there is no such exemption; do not change the watchdog threshold in an unreviewed PR.
- `FAIL_CLOSED`: edge cannot prove ACK-after-durability, queue ages/retention exceed threshold, confidence in source timestamps lost, provider balance ceiling/floor threatened, incompatible revision/secret, DB state lost irrecoverably, unknown provider subscription, unbounded backlog or any unmatched billed SEND after finalized drain → exact-owned subscription delete + verify, preserve censored/evidence, no resume pretending success.

Prelaunch must demonstrate each state with injected faults and deterministic GitHub owner behavior. If a genuine backup receiver also goes offline, a non-2xx/timeout to provider can trigger **preconfigured paid provider retries** only if budget-authorized, and only while the provider is willing to retry. These cannot replay an already-successfully acknowledged message later lost by our own queue.

## Second tier: AeroDataBox retries (OPTIONAL; NOT ENABLED)

- `maxDeliveryRetries:0` remains frozen. A non-zero value requires a separate prospective design and budget amendment, replay-aware credit proof, explicit maximum cost per *flight item* with retry amplification, additional API-unit/refill impact and account floor, plus tested stop/control behavior. Do not enable dynamically after failure (subscription creation parameter), run two overlapping subscriptions, or try to solve failed historical P2G22 by post-hoc tolerance.
- At worst, two additional retries could charge up to **three sends per item** on repeated failure, incompatible with an unchanged 450+50 Stage-1 envelope if frequent. Determine an exact upper bound under source data and cap. No guarantee of provider availability or delivery even with retries.

## Independent cost envelope for a free-tier candidate

Using Cloudflare *only as a candidate*:
- Workers Free requests up to 100k/day per [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/); queue Free **10,000 ops/day** writes+reads+deletes, each message up to 64 KB charged at least ~3 ops for successful lifecycle (so rough **3,333 small messages/day** before retries or overhead, **not** equivalent to 3,333 flight items); R2 Standard separate free allocations. Validate body sizes, notification batches, request rates, queue retries, burst handling, local billing availability, 24h queue expiry and Cloudflare limits before choosing.
- Cloudflare Queue message max **128 KB**; store full provider JSON as R2 object keyed by deterministic digest and queue only pointer/hash. R2 would need an object lifecycle policy consistent with existing 168h retention and verified deletion/attestation, with DLQ/outbox scanner.
- Cloudflare free allowances are **not an SLA**, unlimited credit protection, or promise of zero cost. An R2 billing/payment setup may be required; never create accounts or activate billable resources without explicit user permission.

## Tests before ANY live cutover, provider credits=0

1. Synthetic valid 1/5/large airport-notification JSON through standalone edge receiver: exact secret/session check, size cap, immutable raw bytes/hash, durable manifest, 2xx-after-durable timing below upstream 10s worst case.
2. Edge raw-store failure; manifest failure; enqueue failure after raw write (orphan recover); edge network failure; no partial ACK, with externally visible error classification.
3. Replit warm, idle cold start (~5s), killed during receiving, HTTP 500, DB unavailable / UNLOGGED reset; edge keeps source intact and queues/retries at-least-once without dropping or doubling billed external attempt.
4. Delayed replays (+15 sec, +30 min, +120 min) preserve **edge receipt and provider timestamps**; physical-flight-v2, two-hour pre/post timing, six full buckets, closure and grace criteria tested with explicit expected outcomes. Authenticate relay metadata.
5. Multiple queue deliveries of same pointer; same raw provider payload re-delivered; genuine provider retry with distinct attempt seq and cost. Show external ledger vs internal distinct credited sends under all cases.
6. Crash after R2 write but before enqueue; retry after queue ACK but before Replit DB commit; edge and Replit outages overlapping; long outage exceeding queue 24h retention; DLQ and durable orphan scanner. Nothing ACKed is untraceable.
7. GitHub owner/watchdog degraded-state test across 120 minutes, with exact stop/floor/settling behavior; no old authorization reuse. Preserve scientific original data and do not synthesize invalid observations.
8. Full read-only subscription/budget and revision/replay provenance preflight; only explicit approval of new YSSY limited rerun and frozen callback destination permits provider mutation.

## Recommended near-term implementation order

**Phase A (now, no credentials/network):** Freeze this RFC and create offline fake Queue + R2 store + relay state-machine tests (edge ACK ordering, duplicate IDs, outage, ledger). In parallel obtain Replit Support Q1/Q2 and original instance evidence via authorized diagnostic inspection.

**Phase B (needs user Cloudflare account action, not paid probe):** Provision private sandbox Worker/Queue/R2 under user-selected free allowances, with nonproduction test tokens. Run real end-to-end synthetic-only HTTP and time/DB/replay tests. Do not use real `.replit.app` prepaid sessions for this; use isolated fixture and test DB.

**Phase C (scientific governance):** Compare against frozen V3.9 F.8 plan and exact operating-hour protocol, approve ingress endpoint/replay/timestamp/retention/reconciliation interpretation, new bounded P2G25 proposal if justified, exact fresh GitHub source SHA and independently verified release artifact hash, debit budget and GitHub watchdog states.

**Phase D (only after explicit go/no-go):** Configure a single provider subscription with **stable tested edge URL**, keep GitHub paid owner and Replit V3.9 processing, collect 120m under frozen policy, drain and reconcile exactly, declare PASS only on complete evidence. Default provider retry setting stays zero until explicitly amended.

**Current state: DESIGN ONLY.** No cloud account provisioned, no queue, no new webhook URL, no paid retry, no change to owner watchdog, no new authorization, no Replit deployment. The guarantee sought is *stronger recoverability with bounded fail-closed handling*, **not absolute certainty that two hours will never fail**.

Supporting: [Stage-1 run contingency](../reports/2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md), [zero-credit synthetic integration protocol](../reports/2026-10-09_P2G24_NEXT_SYNTHETIC_INGRESS_FAULT_PROTOCOL.md), [Replit support report](../reports/2026-10-10_REPLIT_SUPPORT_564568_AUTOSCALE_NO_RETRY_YSSY_STAGE1_RISK.md).
