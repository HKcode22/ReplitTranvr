# Phase 2G Stage-1 YSSY — zero-charge Cloudflare feasibility audit and free-queue interruption model

**Date:** 2026-10-10. **No Cloudflare resources created, no R2 activation, no account upgrade, no paid cloud usage, no AeroDataBox calls, no Replit live changes, no scientific DB mutations.** This is an offline engineering decision record, not a launch authorization.

## Connected Cloudflare account, read-only evidence

The connected Cloudflare account was inspected with **GET-only** account, Workers, Queues, R2, subscription and billing endpoints:
- **One accessible standard account.**
- **0 Worker scripts** returned.
- **0 queues** returned.
- R2 bucket listing returned `10042 Please enable R2 through the Cloudflare Dashboard`. Therefore **R2 is currently NOT enabled**; activating it was NOT attempted.
- Account subscription and billing profile/usage endpoints returned API authorization error `10000`. **Actual payment method, existing unrelated billable services, and billing settings could NOT be verified.**
- No `POST`/`PUT`/`DELETE` requests issued. Do not enable R2, add payment details, modify subscription or provision a queue without explicit approval.

## Verified Cloudflare Free constraints

| Service | Published Free limit | Additional risk |
|---|---|---|
| Workers Free | 100,000 requests/day, HTTP 1027 when over limit | A hard limit can break new webhook deliveries during a paid experiment |
| Queues Free | **10,000 message operations/day per account** (writes + reads + deletes, size-rounded); successful lifecycle often ~3 operations/message | Other Cloudflare workloads share the account-wide quota; retries cause additional reads |
| Queues Free retention | **24 hours maximum**, non-configurable | Cannot independently guarantee **168 hours** of raw source evidence while a message remains in queue |
| Queue payload size | **128 KB per message**, including internal metadata (~100 bytes); 1 KB = 1000 bytes | Serialized full JSON + metadata may exceed 128 KB even if raw provider POST is under 128 KB |
| R2 Standard Free | 10 GB-month, 1m Class A, 10m Class B operations per month | Overage is **usage-billed**, not guaranteed $0, and account billing cannot presently be verified |

Official sources:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/#queues
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/
- https://developers.cloudflare.com/r2/pricing/

**Financial instruction:** For this project treat **$0 additional Cloudflare charges** as a hard user requirement. Reject R2 activation or paid plan without explicit permission. Free-tier hard limits are not guarantees of uninterruptible scientific availability.

## Does Queue-only meet frozen scientific evidence policy?

**Conditional short-outage candidate only.** A Queue-only service can hold **complete source JSON** briefly, then relay to unchanged Replit V3.9 processing. When the scientific processor *correctly verifies provenance and durably commits the raw bytes* it can retain them under the existing **168-hour** object-blob contract. But if Replit is down long enough for Queue to expire, or if the payload/quota cap is exceeded, those bytes cannot be recovered using Queue alone. Therefore Queue-only does **not independently satisfy a seven-day source-evidence guarantee**; using it for paid Stage-1 requires prospective protocol amendments/clear acceptance windows and strict fail-closed criteria.

An actual free-tier decision needs:
- Independent provider raw-body **byte-size distribution** (ideally all observed P2G24 30 raw object `content_bytes` and P2G22/P2G23 where available, read-only; avoid exposing payloads or paths), verify **actual serialized** queue envelopes with minimum 8KB headroom to 128 KB.
- Estimate actual distinct notifications, send/credit cost, Queues 3+ ops per notification, other account usage, retry overhead and peak injection size. **1 AeroDataBox credit does not imply exactly 1 webhook**. A budget of 500 credits does not itself bound every Worker/Queue operation without independent evidence.
- Edge FULL-payload Queue receipt, first original receipt UTC signed at origin, semantic and security contract, 168h raw retention after Replit commit, proof under a real Replit cold start and PostgreSQL restart. The current Replit handler sets `receivedAtUtc` at processing time and needs an approved authenticated-edge-provenance integration before live use.
- Bound degraded-but-durable window well below Queue's 24h deadline; after threshold, fail closed and stop owned provider subscription. The user's existing Stage-1 GitHub watchdog **cannot be relaxed until a specific scientific amendment approves this behavior**.
- Account-wide quota telemetry and a fail-closed solution for remaining Free quota; no silent upgrade or fallback to billable R2.

## Tests implemented in unmerged GitHub PR #27 (all synthetic, offline)

1. `experiments/phase2g_cf_sandbox_ingress/free_queue_two_hour_model.ts` + `tests/phase2g_yssy_120m_free_queue_interruption_model_v39.test.ts`
   - 120 fake notifications (one/minute for 2 hours; **240 simulated provider credits**), temporary Replit unavailability at minute **59–88**, consumes backlog in batches after minute 89; asserts complete original-source 15-minute buckets and exactly 240 matching synthetic internal credits.
   - Deliberate longer outage (>=36 minute oldest backlog), queue retention 24h expiry, 500-credit ceiling, 8,000 modeled ops reservation (20% safety margin on 10k; actual account utilization unverified), maximum 60,000 raw bytes until real envelope measured, unfinished +260/+259 credits and settlement cutoff: all must fail closed.
   - This is only **infrastructure/ledger modeling**, not actual provider traffic, observed hour/physical-v2 measurements or real scientific replay proof. 35-minute degraded cutoff and 30-minute settlement grace are **design candidates**, NOT validated frozen study thresholds.
2. `experiments/phase2g_cf_sandbox_ingress/worker_queue_only.ts` + `tests/phase2g_cf_free_queue_only_worker_v39.test.ts`
   - An actual Cloudflare Worker-shaped, **synthetic-only** Queue producer/consumer path with complete JSON body in the queued message, no R2 binding whatsoever.
   - Only 2xx after Queue producer promises message acceptance; checks **serialized Queue envelope** <= 120,000 bytes (below 128,000 bytes incl CF metadata) and source SHA-256. Worker explicitly refuses any `EDGE_EXECUTION_MODE` other than `synthetic-only`.
   - Consumer retries while test Replit endpoint is unavailable, signs edge provenance, and ACKs only if disposable test receiver reports committed matching SHA-256. Not wired into the live paid callback or production PostgreSQL. No persistent producer receipt ledger; account-wide quota is **not enforced by the Worker** in this sandbox.
   - Queue retention and billing protections must be implemented in a separate reviewed, measured deployment before acceptance.

## What is still not solved

- Actual Cloudflare deployed free-tier reliability, 24h retention exhaustion, quota saturation, expiry and request failures. The sandbox is not deployed and cannot carry paid traffic.
- Correct production AeroDataBox authentication/callback identities and retry-credits, Queue delivery idempotency across sender retries, UNLOGGED session loss and replay after DB restart.
- Real correct signed source-time handling by Replit and preservation of 15-minute stability statistics. Neither a queue nor simulator makes a previously failed/censored Stage-1 probe valid.
- **Replit Support ticket #564568** has acknowledged the Autoscale callback loss/retry hazard, but root cause of actual P2G24 original incident remains under engineering investigation.
- **A new bounded prospective authorization/amendment** remains required after failed P2G22/23/24; no automatic paid retry authorized by historical freeze. Candidate YSSY clock class remains Monday Oct 12 03:00–05:00 UTC (= Sunday Oct 11 20:00–22:00 PDT); calendar eligibility does not equal readiness.

## Decision / next evidence

**KEEP R2 OFF. DO NOT DEPLOY CLOUDFARE.** Finish sandbox CI, benchmark actual historical **blob size statistics** via existing read-only DB (not provider API), confirm provider callback attempt identities, implement isolated real local HTTP + PostgreSQL receipt/UNLOGGED reset integration, evaluate 24h full-message Queue only with strict capacity and 168h downstream retention. If payloads are too large or fully free durable replay fails, do not silently weaken the scientific protocol; defer the paid window or select an explicitly approved free alternative.

Related: [Phase2G Sunday Stage-1 runbook](2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md), [full layered backup RFC](../amendments/DRAFT_2026-10-10_PHASE2G_STAGE1_DURABLE_FAILOVER_AND_RETRY_PROTOCOL.md).
