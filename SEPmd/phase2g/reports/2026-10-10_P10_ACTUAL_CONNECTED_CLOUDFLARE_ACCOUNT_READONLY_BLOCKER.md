# Phase 2G P10: connected Cloudflare account read-only availability/cost preflight

**2026-10-10; READ ONLY.** This is an observed infrastructure constraint, not a provisioning or paid-launch authorization. No account ID, email or secret is included here.

## Executed read-only API queries

Cloudflare connector authenticated to **one authorized account** via `GET /accounts`. Then invoked these two read-only queries:

- `GET /accounts/{account_id}/queues?per_page=50` → Cloudflare success HTTP 200, empty array, **zero Queues configured in the accessible account**.
- `GET /accounts/{account_id}/r2/buckets?per_page=50` → Cloudflare API error code **10042**, message **"Please enable R2 through the Cloudflare Dashboard."**. Thus R2 is not enabled for the authorized account at this checkpoint; no bucket inventory can be established and no working R2 backup can be assumed.

Neither operation mutates infrastructure or enables a paid service. No Worker, R2 bucket, Queue, D1, database or external billed AeroDataBox provider call was created.

## Official product constraints vs account-specific facts

[Cloudflare Queues Free-tier launch](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/) documents Queues availability on Workers Free with 10,000 account-wide free Queue operations per day and **24h maximum Free Queue message retention**. [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) documents read-after-write consistency and conditional object writes. Neither general product capability proves this account has a production-capable R2 object store, retention/lifecycle rules or verified no-added-cost quota.

The aviation F.8 source-evidence contract requires **168 hours (7 days)** of original retained source bytes. The existing `worker_queue_only.ts` free Queue prototype cannot alone meet 7-day retention for an undelivered message. The `worker.ts` R2+Queue design is synthetic-only and currently not provisioned in this connected account.

## P10 outcome

**BLOCKED – external durable-ingress backup not provisioned; R2 currently disabled.** Green offline tests only show candidate code shape and error handling. One cannot claim actual independent webhook receipt, source UTC, 168h storage, or a usable cloud replay path in the current deployed YSSY pipeline.

Before selecting an implementation:

1. Verify whether enabling R2 requires billing setup or introduces charges; obtain explicit user approval before any account setting/plan upgrade/bucket/Queue creation.
2. Reconcile existing independent Replit object-store capacity/actual retention with *external* first-edge durability and failure-domain requirements; R2 is not the only possible storage provider. Avoid installing infrastructure simply because one candidate uses it.
3. Forecast worst-case original 120-minute notification bytes, per-message queue envelope, daily free-operations headroom, latency/10-second source response behavior and outage bursts. Account currently has no Queue resources configured, so do not equate the nominal free-tier limit with demonstrated available production capacity.
4. In authorized isolated staging, validate retention lifecycle at least 168h and readback integrity, crash/cold-start and queue retry, actual receiver source identity and independent sender/paid-credit reconciliation. Real staging provisioning and publish require permission and explicit cost check.
5. Complete P09/P11/P12/P13/P14–P20 with actual source-to-database science reconstruction, real 120m wall-clock no-provider rehearsal, frozen hashes, owner controls, an approved prospective YSSY retry AUTH and final GO.

**Immediate YSSY paid status:** **NO-GO** for Sunday October 11 2026 at 20:00 PDT. No Cloudflare resource changes were made; provider delivery retries remain frozen 0; proposed six primary + six backup health checks remain test-only; paid supervisor stays on 3 consecutive health failures.
