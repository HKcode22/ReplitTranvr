# Phase 2G Stage-1 YSSY — P20 faithful irregular-traffic rehearsal gate (2026-10-10)

**Status: DRAFT TEST-ONLY correction. NOT a completed wall-clock 120-minute soak. NOT paid authorization. NOT merged, deployed, or connected to AeroDataBox, Cloudflare, Replit runtime, or scientific PostgreSQL.**

## Scientific problem in the initial test-only rehearsal manifest

The original `experiments/phase2g_rehearsal/synthetic_120min_acceptance_v39.ts` is an **illustrative** scaffold which assumes **exactly 120 upstream webhook attempts (one per minute)** and **15 callbacks in each 15-minute block**. This is not an operational or scientific definition from the frozen V3.9 F.8 plan:

- Actual AeroDataBox Flight Alert notifications have nonuniform timing, may occur in bursts, and may have no provider notifications during some 15-minute intervals.
- **V3.9 F.8 §9.2 Stage-1 15-minute counts are about distinct canonical flight instances whose first valid observation occurs in each bucket**, not the number of received HTTP POSTs. A payload may contain multiple flight items, zero items, retimes or marketing codeshares requiring quarantine.
- The actual 130-minute active and 146-minute sparse GET observer tests did not exercise those nonuniform webhook arrival or physical-flight-v2 paths. The previous actual-route stress test deliberately sent 22 concurrent POSTs: the independent synthetic sender observed **18 timely HTTP 200** and PostgreSQL eventually committed **22**.
- A two-hour test with one callback per minute can be green while not reproducing the same callback-concurrency and timeout risks. It must never be used alone for paid readiness.

## New independent P20 V2 fixture and policy

Created `experiments/phase2g_rehearsal/synthetic_120min_irregular_trace_v39.ts` and `tests/phase2g_synthetic_120min_irregular_trace_v39.test.ts`. The proposed *full rehearsal* must instead:

1. Have an **independently HMAC-frozen synthetic sender plan** with exact fictional attempt IDs, original attempt clocks, original wire SHA256, 0/1 cost identity and the frozen 120-minute window; no actual provider credentials.
2. Preserve **all 120 real elapsed minutes of owner/watcher heartbeat**, regardless of callback arrival count; test explicit quiet intervals and bursts.
3. Confirm sender-observed **HTTP 200 within a 10,000ms synthetic deadline**, original edge receipt timestamp and wire digest, 168-hour declared raw retention, internally committed attempt and strict credit consistency; reject 260/259 and duplicate/missing attempts.
4. **Independently distinguish arrival-count buckets from V3.9 §9.2 distinct first-valid-operating-flight buckets.** Derive a first-physical-flight bucket using the original edge receipt clock, count a flight only the first time it resolves, never count marketing/quarantined items, and compare with the frozen independent fictitious physical trace. Preserve retimes as updates, not new physical flights.
5. Assert **provider calls=0, paid credits=0, cloud-resource mutations=0, scientific DB writes=0**, owner clean terminal exit and proven cleanup. Output `actualPaidScientificGoAuthorized:false` even when synthetic trace consistency passes.
6. Record the methodology limit: these pure validators only check declared evidence. The eventual hosted real 120-minute rehearsal must independently derive source facts from sender/edge/storage/SQL/owner logs, and requires approval of a verified no-extra-cost isolated staging environment.

### Offline test fixture — irregular, not a fabricated P2G24 reconstruction

A fictional 120-minute sender produces **22 notifications**, distributed **[7,0,8,0,0,4,1,2]** across eight 15-minute bins, including several silent bins. Physical item observations include two original operators in bucket 1, a later retime of an existing flight, marketing quarantine, one new operator in bucket 3, another retime, and new operators in buckets 6 and 7. The distinct first physical counts are **[2,0,1,0,0,1,1,0]**, independent of 22 callback count. All 120 minute heartbeats remain mandatory.

Negative tests reject incomplete owner heartbeat, missing sender attempts, credit differences, modified signed trace, wire hash/time drift, marketing being counted as a physical flight, illicit flight-instance split, late sender ACK, raw retention shorter than 168h, incomplete cleanup, duplicate attempts or physical items, and a repeated first flight ID in two frozen buckets. **These numbers are deliberately fictional and not asserted as the actual P2G24 traffic distribution.** The eventual exact rehearsal must freeze permitted real metadata distributions without copying secret or raw provider bytes into public test fixtures.

## Decisions and remaining gates

- The previous V1 manifest's 120-attempt/15-per-bin behavior is explicitly labelled **illustrative mock-test shape only**; do not confuse it with the frozen experiment.
- V2 does **not** introduce provider retries, alter the paid code, change raw blob hashes, overwrite prior evidence, or approve scientific recovery after UNLOGGED loss.
- Real receiver cold-start, signed source origin, Cloudflare quotas and R2/Queue retention, true Replit Object Storage P50/P95/P99, provider timeliness, Replit platform lifecycle and full wall-clock 120-minute hosting are still open. P20 remains INCOMPLETE.
- Strict independent signed sender evidence, complete provider-attempt reconciliation, real stage1 runtime-owner/watcher semantics and actual physical-item SQL checks remain separate mandatory evidence gates before any paid Stage1 YSSY retry.

Related: [P20 original 20-gate plan](2026-10-10_YSSY_REMAINING_GATES_AND_120MIN_ZERO_CREDIT_REHEARSAL.md), [P04/P05 receiver burden](2026-10-10_ACTUAL_PREPAID_ROUTE_AND_WIRE_BYTES_SCIENCE_GAP.md), [incident #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
