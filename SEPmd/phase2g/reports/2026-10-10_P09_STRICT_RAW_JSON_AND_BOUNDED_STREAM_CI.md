# Phase 2G P09 — strict original JSON wire admission and bounded streaming before ACK

**Date:** 2026-10-10 America/Los_Angeles. Isolated test-only branch, no provider/cloud deployments. **Latest exact verified code source:** `2f5f733dc118d09a3350b294246e26571ff468e6`. [Actions #38102586079](https://github.com/HKcode22/ReplitTranvr/actions/runs/38102586079) **BOTH jobs SUCCESS: 457/457 offline tests in 46 suites; 45/45 actual V3.9 disposable PostgreSQL16; actual independent SIGKILL confirms UNLOGGED state loss and one LOGGED owner-binding survivor**.

## Concrete bugs eliminated in the OFFLINE Cloudflare Worker candidates

1. Both R2+Queue and Queue-only `ingest` used bare `JSON.parse` and allowed duplicate object keys. JSON parse silently overwrites an earlier `id`, `costCredits`, or nested flight identity; even escaped equivalents (`id` vs `\\u0069d`) are duplicates after decoding. The candidates now call the existing structural duplicate-key check from the already tested signed wire/canonical source envelope **before raw archive or Queue send or 2xx**. Three regression tests cover source-level duplicates, escaped aliases and nested flight/credit fields, and misleading JSON-suffixed content types in Queue-only ingress.
2. Both candidates previously called `request.arrayBuffer()` before enforcing their *actual* maximum body size, allowing a body without a truthful `Content-Length` to be materialized unbounded. The shared synthetic-only `readBoundedSourceWireV39` now assembles bytes incrementally and stops reading once a chunk would exceed the preset cap. R2 uses the existing maximum 2,097,152 bytes; Queue-only uses 127,000 actual raw bytes, with its **stricter existing serialized envelope** limit unchanged. It rejects invalid/overflowing, forged smaller/larger declared lengths and failed reads with sanitized error codes, and still rejects missing/empty input upstream.
3. New `tests/phase2g_bounded_source_wire_v39.test.ts` exercises seven cases: exact original stream bytes, real chunk-level overrun, too-large claimed length, mismatched declared lengths, invalid/fractional/overflowing headers, empty-body header inconsistency and a failing input stream. The offline fault-injection CI now includes the new source/test paths and executes that suite.

## What this does NOT solve

- Both Workers remain **synthetic-only and undeployed**; real AeroDataBox sender identity, a genuine independent provider-attempt ledger and true provider credit costs are NOT authenticated.
- R2+Queue prototype requires Cloudflare R2 activation, real tested Cloudflare Queue, exact retention permissions, durable first-edge UTC ordering across parallel cold arrivals, a validated pre-ACK two-system atomicity design or fail-safe recovery, and scientific approval.
- Queue-only has **24h Free Queue retention** and no independent 168h R2 raw object archive; it is NOT a standalone compliant seven-day source archive.
- Existing synthetic R2 processed marker and current SQL confirmation remain test-only. Production Replay/reconstruction after UNLOGGED loss is NOT implemented.
- The actual signed 6+6 watchdog source evidence is still `undefined`, so its enforceable live threshold is the legacy three failed checks. Replit Support root-cause of P2G24 and hosted P20 two-hour synthetic R0–R11 remain outstanding.

## Actual connected Cloudflare inventory, read-only

- GET Queues returned HTTP 200, success=true, **0 configured queues**.
- GET R2 buckets returned Cloudflare API error **10042, “Please enable R2 through the Cloudflare Dashboard.”** Not activated. No resources were created.
- Official Cloudflare docs, reviewed October 10 2026:
  - [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/): Workers Free 10,000 queue operations/day, 24h retention non-configurable. Each send/read/delete counts separately; extra retries consume operations.
  - [Queues limits](https://developers.cloudflare.com/queues/platform/limits/): up to 128KB total message size with internal metadata.
  - [R2 getting started](https://developers.cloudflare.com/r2/get-started/): R2 subscription/checkout required to activate; included free usage is not a contractual hard-zero-billing guarantee.
  - [R2 pricing](https://developers.cloudflare.com/r2/pricing/): Standard includes 10 GB-month storage and free operation allowances; usage over allowances is billable.

Do not enable billable Cloudflare R2, create Queues, run persistent hosted replicas, subscribe to AeroDataBox or update paid receiver without prior express cost/science approval. These changes only improve **offline** P09 ingress verification, not deployment parity or final P09 sign-off. **Sunday Oct 11 20:00 PDT YSSY paid NO-GO.**
