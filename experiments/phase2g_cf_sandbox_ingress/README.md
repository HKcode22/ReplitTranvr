# Phase2G Cloudflare R2/Queues backup — sandbox only

STATUS: NOT DEPLOYED. NOT FOR AERODATABOX TRAFFIC. NOT SCIENTIFICALLY APPROVED. The existing GitHub owner, Replit processor and deployed callback server are unchanged.

## Implemented isolated source

- Worker module: experiments/phase2g_cf_sandbox_ingress/worker.ts. Real Cloudflare-style fetch, queue and scheduled handlers; explicit EDGE_EXECUTION_MODE=synthetic-only prevents other traffic.
- Valid simulated webhook: verify long test-only path secret, synthetic attempt/session, JSON size; store SHA-256-verified raw body in R2; write immutable first-arrival timestamp index; enqueue pointer; return HTTP 200 only after successful enqueue.
- Queue failure after R2 index preserves an orphaned receipt. Scheduled scanner can discover mature indexes and enqueue again. Scanner currently limited to 300 receipt records each pass.
- Queue consumer is disabled by default and, even when explicitly enabled, accepts only a separate sandbox receiver path /__p2g-sandbox-verify; NEVER sends to paid /prepaid/:sessionId endpoint.
- Consumer requires a disposable sandbox receiver to attest that the raw hash was committed; then stores a processed marker and acknowledges. Delivery is at-least-once, not exactly once.
- In-memory tests exercise actual Worker entry points, fake R2 semantics, fake Queues, 503/409/404 responses, duplicate sender attempts, queue-replay behavior and orphan index recovery.

## Why this cannot serve real AeroDataBox yet

1. No actual Cloudflare account, R2 bucket, queue, scheduled trigger, billing/quota verification or deployed host has been provisioned.
2. The Worker uses explicitly synthetic attempt identity; production provider notification/attempt/cost evidence and authenticity have not been integrated or freeze-reviewed.
3. Existing Replit prepaid handler timestamps on processing time. Delayed relay would shift first-arrival time and 15-minute scientific stability buckets. Must add authenticated immutable edge receipt provenance verified in Replit BEFORE any live cutover.
4. Replit runtime session and item tables are UNLOGGED; PostgreSQL crash may wipe session state so replay may not be accepted. The durable store alone cannot guarantee scientific continuity.
5. R2 and Queues are not one atomic transaction. Additional tests/repair are needed for crash before index write, index/queue partial states, duplicate races, backend 2xx lost acknowledgment and >300 receipts.
6. Queue retention on Free tier may be 24h, below project's 168h raw-evidence retention requirement. Need R2 lifecycle policy, legal/privacy retention and exact deletion attestation.
7. Current paid watchdog requires three-strike fail-closed; no degraded-but-durable relief unless a prospective reviewed amendment and real end-to-end tests pass.
8. Provider retry remains maxDeliveryRetries=0. Enabling up to two billable extra attempts is a separate prospective cost/science decision, not an emergency switch.

## Subsequent engineering gates

- Verify sandbox tests in GitHub CI; locally benchmark actual nonempty signed fake provider-sized HTTPS notifications and response latency.
- Build a disposable signed receiver, isolated PostgreSQL with crash/reset fixture, source-time verification, durable attestation and replay/duplicate accounting.
- Test queue/edge outage, outbox >300 entries, long backlogs, DLQ, actual R2/Queues startup and usage limits. Do not allow live ingress while any gate is open.
- Obtain Replit support's prior-deployment investigation on ticket #564568, and independent scientific review of any new bounded YSSY Stage-1 retry amendment.
- No paid YSSY launch until exact new AUTH, calendar, 450+50 credit ceiling and callback endpoint are frozen and approved.

Full RFC: SEPmd/phase2g/amendments/DRAFT_2026-10-10_PHASE2G_STAGE1_DURABLE_FAILOVER_AND_RETRY_PROTOCOL.md
Phase2G gate: SEPmd/phase2g/reports/2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md
Issue: https://github.com/HKcode22/ReplitTranvr/issues/28
Cloudflare references: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ ; https://developers.cloudflare.com/queues/configuration/batching-retries/