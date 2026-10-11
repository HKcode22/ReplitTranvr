# P10 prospective independent edge-storage decision — NO PROVISION / NO PAID GO

**Prepared October 10, 2026. No account mutation is approved or performed.**

## Verified current account state and non-negotiable science contract

Previous authenticated **read-only** Cloudflare account inventory found **zero Queues** and Cloudflare R2 **not enabled** (Cloudflare API error **10042**: enable R2 via dashboard). This account does not currently have the separate backup system implemented by the synthetic R2+Queue Worker. The full original on-wire source bytes, genuine provider attempt/time and 168-hour retention are release-gate requirements, not optional simulation details. Live Replit V3.9 still has UNLOGGED runtime tables, and an edge `processed` marker alone is demonstrably insufficient after a PostgreSQL crash.

## Current official documentation checked October 10, 2026

- [Cloudflare Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/): **Workers Free includes 10,000 operations per day**. A basic message commonly takes 3 operations (write, read, delete), **plus reads for retries**, and an envelope over 64 KB consumes more billable operation units. Free Queue retention is **24 hours, nonconfigurable**; Workers Paid can set retention up to **14 days**. Neither a free Queue nor our current test-only `worker_queue_only.ts` promises surviving original full bytes for all 168h.
- [Cloudflare Queue limits](https://developers.cloudflare.com/queues/platform/limits/): single message **128 KB** including about 100 bytes internal metadata. Queue throughput and message expiry are bounded. A full original webhook over 128 KB **cannot fit in one Queue message**. Our Worker currently puts only an R2 receipt key on Queue, rather than full raw bytes, precisely to avoid this constraint.
- [Cloudflare R2 current pricing](https://developers.cloudflare.com/r2/pricing/): **Standard** storage includes monthly **10 GB-month, 1 million Class A, 10 million Class B operations** free allocation. Beyond those limits, standard storage is priced at **$0.015/GB-month**, Class A **$4.50/million**, Class B **$0.36/million**. R2 egress is advertised as free. The **free allocation is NOT permission to assume the account has no other usage or cannot incur charges**. Standard—not Infrequent Access—is the only tier with the described free allocation.
- [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/): retention locks can **prevent overwrites/deletes for a specified period**, subject to configuration. A verified lock of at least the full 168-hour source window, plus approved expiration/lifecycle handling, is a candidate source immutability control. An unproven lifecycle-only delete policy is not immutable custody.
- [R2 lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/): expiration and lifecycle behavior require explicit configuration. Object deletion is not instantaneous at expiry. Bucket lock and object-retention policy need independent review as a pair, without prematurely deleting evidence.

## Architecture choice table (NOT a deployment approval)

| Option | Durability against Replit/PG outage | Seven-day independent source custody | Cost/operations uncertainty | Release status |
|---|---|---|---|---|
| Current Replit callback only | Receiver/UNLOGGED restart is the known fault domain | NOT before-ACK independent | Current system | **NO-GO** |
| Cloudflare **Free Queue only**, complete source envelope | Queued during outage for at most 24h, <=128KB/message | **NO** if undelivered source expires before 168h; later Replit storage might extend but independent custody ends after Queue deletion | Account-wide daily 10K operations plus Worker limits; 128KB | **NO-GO for strict 168h independent raw evidence** |
| Cloudflare **R2 Standard + Queue**, source bytes and immutable manifest in R2 before ACK | Independent R2 evidence survives Replit downtime; Queue stores small key; scanner can retry | **Potential YES**, after bucket lock, deletion/retention, signed original UTC/wire SHA, fetch/readback proven | Need enable R2/Queue, check plan, bills, quota, object size, actual ops, privacy | **Preferred candidate, UNPROVISIONED** |
| Another independently approved encrypted object store + 24h Queue | Depends on store and ACK/retention design | Potential YES | Provider access/cost/permissions unknown | **Requires independent verification** |

The R2+Queue option does **not** solve real sender identity/credits, scientific physical-v2 replay, delivered owner lifecycle or the 120-minute hosted POST cold-start test by itself.

## Concrete pre-provision and staged acceptance gates

1. **Explicit user approval** before enabling R2, associating a payment method, creating any Queue/bucket/Worker or committing Worker secrets. Verify exact account billing state, free allotment headroom, expected call volume and a nonzero-cost kill switch.
2. Create **only a separately named synthetic staging environment**, not the live v3.9 `.replit.app` webhook and not a real subscription. Freeze source SHA and match published code to GitHub PR revision before any tests.
3. Require authentication of the real origin (AeroDataBox signed attempts or an independently source-verified sender ledger, if provider supports it). Current `x-p2g-synthetic-attempt-id` is user-supplied TEST HEADER, **not genuine provider proof**.
4. On original POST: capture edge UTC, verify exact on-wire bytes, reject duplicate JSON ambiguity/malformed UTF-8, write immutable source bytes+receipt index to independent source store, check true bytes readback+SHA and correct 168h retention, enqueue only the safe reference key, return 2xx **only after custody/Queue admission is demonstrably durable**. If uncertain, fail 503 and record the unknown potential-billed provider attempt.
5. Queue worker retries with bounded backpressure/DLQ. Validate HMAC-bound source identity, current receiver acknowledgement and a fresh read-only SQL continuity proof (never trust historical processed marker alone). Detect 10-second provider source timeout even if later SQL commit succeeds. Preserve original edge UTC and V3.9 canonical/physical-v2 proof; avoid duplicate LOGGED source blobs.
6. Test actual hosted **120-minute wall-clock**, full POST R0–R11, 8×15-minute original source-bucket scientific status, outage/cold-start/long-tail Replit and DB-epoch transitions, Queue admission and scanner no-skip across 300+ objects, all with **zero genuine AeroDataBox provider calls**.
7. Require 1:1 independently observed **real provider billable attempts vs raw receipts/credits**, including failed source ACKs and no falsified/censored observations. Existing 260-vs-259 accounting gap is a veto, not a rounding issue. Obtain human reviewed prospective 6+6 health policy, deployed owner / source hash freeze, budget cap/floor and **fresh paid authorization**.

**Current decision:** build and test only on the isolated investigation branch. No live cutover, no production database/schema mutation, no paid probe, no Cloudflare account mutations without explicit approval. YSSY paid Sunday October 11 20:00 PDT remains **NO-GO** on current verified release evidence.
