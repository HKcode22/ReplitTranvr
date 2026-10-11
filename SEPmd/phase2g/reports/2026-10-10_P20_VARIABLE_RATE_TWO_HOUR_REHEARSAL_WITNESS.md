# P20 — Variable-rate two-hour Stage-1 YSSY rehearsal witness (offline; not the hosted rehearsal)

**Date:** 2026-10-10 local / 2026-10-11 UTC. **Draft branch only; no deployment, no provider subscription, no AeroDataBox credits, no Cloudflare provisioning, no new paid services, no scientific database modification.**

## The rehearsal modeling error corrected

The early Stage-1 rehearsal acceptance fixture assumed **exactly 120 notifications / one webhook each minute / exactly 15 webhook notifications in each 15-minute bucket**. This was explicitly only a fixture, not the frozen F.8 provider-delivery contract, but using its count as a final real-time science pass/fail criterion would be misleading. **A 120-minute observation window means 120 minutes of active owner and receiver evidence, NOT 120 guaranteed paid webhook notifications.**

The P2G24 read-only audit found 30 preserved canonical provider-content blob objects, raw stored lengths 1,781–21,746 bytes. These 30 do **not** determine a complete 120-minute arrival distribution, all provider billing attempts, or any future maximum payload. No exact historical source arrival histogram has been established. The example 30-attempt pattern below is an **invented test fixture**, not a reconstruction of paid P2G24.

## New isolated code and negatives

- `experiments/phase2g_rehearsal/variable_rate_wallclock_audit_v39.ts`: separate synthetic-variable-rate *consistency* assessment. It validates a frozen exact UTC 120-minute start/end, monotonic elapsed duration of 120 minutes with <=30s finish tolerance, exactly 120 unique owner/receiver per-minute witnesses (8 monitoring buckets x15 minutes), owner and receiver alive/healthy, independent preplanned sender IDs and actual edge/internal complete receipt accounting, signed-receipt *assertions* / raw wire hash / source time and exact credit match, cleanup, zero real provider calls, zero Cloudflare mutations, and 168-hour downstream original raw policy. **Webhook bucket counts are whatever the frozen sender fixture actually submitted** (including zero in an interval), without substituting fabricated arrivals. **Whole-window zero POST** is a hard rehearsal rejection: GET-only health monitoring is not a callback test. The exported decision ALWAYS sets `scientificPassAuthorized=false`, `paidLaunchAuthorized=false`, `wallClockHostContinuityProven=false`.
- `tests/phase2g_variable_rate_wallclock_audit_v39.test.ts`: 13 fixture tests including variable 30 attempted messages; quiet source-time buckets but complete monitoring; strict 120m window/monotonic proof; missing/duplicated/late minute; receiver unhealthy near minute 60; sender 503/late 200; source-wire SHA/UTC mismatch; explicit 30 sender vs 29 internal credit loss; invalid duplicates/orphans; insufficient raw retention; zero posted callbacks; no accidental provider/cloud mutation.
- These tests are added to the existing offline-only GitHub Actions workflow; no real two-hour waits or provider calls are triggered.

## Why an offline fixture still cannot verify a true 120-minute run

An offline test can fabricate `monotonicMs` and `ownerUtc`, and can claim `completeBytesDurablyAccepted=true`; that is **not a genuine host time, original AeroDataBox sender acknowledgment, independent source authentication, or real storage durability witness**.

For the **final hosted wall-clock rehearsal** (only after source gates, cost approval and isolated staging), record these independently:

1. A continuous process monotonic clock and wall-clock UTC start/end, plus GitHub Actions job lifecycle timestamps; clocks must not be fabricated from a virtual schedule.
2. Actual received and acknowledged POSTs through the published-equivalent V3.9 callback-only parser and full storage + SQL path. In addition to source timestamp, record **independently observed sender HTTP response within its deadline** and source wire SHA.
3. Signed attempt identities and original edge UTC, exact source SHA/byte size and body acceptance (a GET / 200 is NOT proof). Ledger comparison uses actual distinct attempts, not 120 dummy attempts.
4. Per-minute owner/receiver availability and database lifecycle start, separate from per-15-minute scientific buckets. Health can be green while storage is unavailable or the processor is behind a PostgreSQL lock; independent webhook POST evidence must be checked.
5. Real 168-hour downstream object-retention contract and verify each original object is available with SHA readback, not just a LOGGED reference or unverified Queue assertion.
6. Inject cold-start, three health failures near minute ~60, SQL lock saturation, non-timely source ACK, queue backlog, sudden PostgreSQL restart, bad provider ID/marketing codeshare, receipt replay/corruption and missing synthetic attempt. Each must produce the **specified safe** result—not necessarily science success. UNLOGGED loss still mandates censor absent an independent, frozen science-equivalent reconstruction.
7. End with exact cleanup, no orphan owner/provider subscription, zero real provider calls/credits, zero unexpected cloud charges and separate independent evidence review.

The latest 348+43 GitHub tests already cover a broad set of cases, but they remain test-only and do not prove a hosted 120-minute trial. **No paid Stage-1 YSSY attempt is authorized by this added module.** For any real hosted 120-minute rehearsal or Cloudflare Free service activation, independently verify a $0 added-cost hosting configuration and obtain user approval before provisioning.

Related: [20 closure gates and R0–R11 fault matrix](2026-10-10_YSSY_REMAINING_GATES_AND_120MIN_ZERO_CREDIT_REHEARSAL.md), [signed sender attempt reconciliation](../../../../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39.ts), [actual-route sender ACK divergence report](2026-10-10_ACTUAL_PREPAID_ROUTE_AND_WIRE_BYTES_SCIENCE_GAP.md).
