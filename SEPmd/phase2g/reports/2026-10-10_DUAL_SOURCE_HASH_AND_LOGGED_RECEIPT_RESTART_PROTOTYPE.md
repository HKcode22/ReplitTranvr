# Phase 2G — original wire, canonical hash, and crash-durable synthetic receipt feasibility (2026-10-10)

**Status: ISOLATED TEST-ONLY PROPOSAL, NOT A PUBLISHED RECEIVER CHANGE.**
GitHub [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27), [incident #28](https://github.com/HKcode22/ReplitTranvr/issues/28). No actual AeroDataBox subscriptions/calls, Cloudflare resources, Replit deployment, live scientific database access/write, or production migrations; $0 additional Cloudflare charges.

## Binding method from frozen V3.9 F.8

- **§6 S2/S4**: immutable raw delivery HTTP envelope/body/hash, append-only research provenance while lawfully retained; successful 2xx comes only after verified durable admission.
- **§6.0 identities**: provider notification ID + attempt seq distinguish individual provider SENDs; a delivered webhook is not a flight identity. Distinct retries must not silently merge.
- **§6.4 clocks**: original `http_received_at_utc` distinct from provider timestamp, attempt timestamp, persistence timestamp and downstream available-at. Same-system receipt precedes durable raw commit.
- **§10.2**: provider raw retention must be lawful for the actual Plan/channel, with 168h current probe policy and explicit expiry; no claim of indefinite raw retention.
- **Existing draft V3.9 code**: the Express parser captures `req.rawBody`, but current `persistPrepaidProbeWebhookV39` stores `canonical(input.body)` with sorted object keys. Thus the current saved hash certifies **canonical parsed JSON**, not exact request wire bytes. Earlier 30 P2G24 stored-object SHA checks remain valid as stored-object integrity only.

These requirements make a dual-hash *prospective versioned* incoming receipt desirable. Do not alter prior canonical/historical hashes, sample labels or frozen delivery IDs without explicit scientific amendment.

## New synthetic-only proof components

- `experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39.ts`: **V2** receipt validates UTF-8, JSON syntax, duplicate JSON object keys (including escaped equivalent names), pinned notification ID / delivery-attempt seq/time/credit / expected subscription, original incoming `wireSha256`, V3.9-compatible `canonicalSha256`, source byte count, first trusted edge UTC, collision-resistant attempt/receipt keys and HMAC over fixed ordered fields. Consumer verifies original bytes + BOTH hashes + signed metadata, expected session/subscription, maximum backlog and future skew. Edge HMAC does **NOT** authenticate original AeroDataBox origin; its webhook authentication remains a separate security gate.
- `tests/phase2g_dual_wire_canonical_source_receipt_v39.test.ts`: explicit domain-separated tamper/forgery/time/identity/size/deep nesting/ambiguous JSON tests, and proof whitespace/key order can change wire SHA without changing legacy canonical SHA. An initial test found that `RegExp.test(null)` coerced the missing ID into the string `null`; strict runtime types were fixed and verified by CI before any deployment.
- `experiments/phase2g_rehearsal/synthetic_dual_receipt_queue_admission_v39.ts` + matching `tests/phase2g_dual_receipt_queue_admission_v39.test.ts`: synthetic Queue port ACKs only after Promise-resolved full-message acceptance, conservative 120KB full-message envelope, strict same-attempt conflict refusal, concurrency single-flight, independent downstream signed replay verifier. **Dangerous intentional negative:** a new process loses the in-memory first-UTC map and can enqueue the same provider attempt again under a different signed arrival time. This prototype is NOT restart-safe or approved for live traffic.
- `experiments/phase2g_rehearsal/disposable_logged_source_receipt_v39.ts`: a separate *disposable PostgreSQL 16* metadata-only experiment. Stores **only** HMAC-blinded attempt token, wire/canonical SHA hashes, versioned receipt ID, and first trusted UTC in a LOGGED fixture table; no original provider notification, subscription or raw flight body in PostgreSQL. Explicitly refuses real DB/provider environment, accepts only signed synthetic receipts **after separately asserted Queue acceptance**, and enforces SQL uniqueness and original timestamp preservation. Tests include duplicate and conflicting-attempt rejection. This does NOT authorize real logged metadata/PITR storage; legal and data-classification review required.
- Existing actual-route disposable SQL suite now proves that for a single signed synthetic source, `V2 canonicalSha256` equals the unchanged V3.9 `clean.provider_content_blob_ref.content_sha256`, while `wireSha256` is distinct.
- The GitHub ephemeral PostgreSQL job performs **actual SIGKILL/restart** and separately verifies whether a single opaque LOGGED receipt row survives when UNLOGGED runtime is reset. Passing would prove technical survivability in PostgreSQL 16, **not production server identity/state recovery**.

## Important unclosed engineering and scientific constraints

1. **No real provider-origin signature**: edge HMAC is only trusted after real provider identity/authentication is independently established. Path secrets alone are a compensating control, not a cryptographic provider signature.
2. **No atomic Queue + DB transaction**: acknowledging only after two disparate durable systems accept data is vulnerable to a crash between admission and metadata commit. Need prospectively designed receiver state machine, authoritative durable receipt and idempotent recovery of **both** commit orderings; never assume this SQL fixture solves two-phase atomicity.
3. **No cloud persistence proof**: Queue operations in these tests are in-memory fakes. Actual Cloudflare Free plan imposes 128KB message cap, 24h retention and a shared operation quota; local 120KB envelope checks do not prove external capacity, zero charges or uptime. R2 is not enabled; user prohibits paid Cloudflare usage.
4. **No scientific session reconstruction**: original `clean.prepaid_probe_session_runtime` and item/delivery state remain UNLOGGED. New opaque first-receipt metadata is necessary at most, **not sufficient** for legitimate physical-v2, 15-minute, 120-minute, exact provider-attempt accounting restoration.
5. **No cost/retention clearance**: 168h raw evidence after downstream commit must meet Plan/license policy. A free 24h queue is a buffer, not seven-day independent raw retention.
6. **No published Replit performance proof**: 22 fake requests in the actual HTTP route test led to 18 timely sender 200s despite 22 eventual SQL commits under deliberately slow fake storage. Real latency and platform instance replacement remain untested.
7. **No paid retry authorization**: Stage-1 YSSY remains **NO-GO** after failed/censored P2G22/23/24; Quinn's ticket #564568 remains an independent blocker to determine original platform termination cause.

## Next isolated tests to implement

- Explicit Queue↔receipt-DB two-system crash matrix (Queue succeeded/SQL failed, SQL succeeded/Queue failed, 2xx lost at sender, producer restart, replay reordered) with fail-closed outcomes and no false credited delivery.
- Proof of frozen physical-flight-v2 + session control-plane reconstruction **or** automatic refusal/censoring after actual crash; never silently change source UTC or invent completed observations.
- True source-authenticated, secret-safe production-equivalent receiver testing with independent sender deadline and real object storage, only after a verified $0-staging plan and user approval.
- Finish independent final wall-clock 120-minute no-credit R0 baseline and R1–R11 fault rehearsals after all prerequisites; any host deployment is separately permissioned.

**Decision:** Keep the dual-hash pipeline and metadata guard in the experimental namespace, not imported by current paid callback/owner code. Historical artifacts unchanged; no production merge/release. 

## Two-store non-atomicity explicitly quantified (new TEST-ONLY safety model)

The offline scenario model `experiments/phase2g_rehearsal/dual_store_receipt_fault_matrix_v39.ts` and 10 tests `tests/phase2g_dual_store_receipt_fault_matrix_v39.test.ts` now produce explicit, **non-success statuses** for each of:

- Queue full-payload committed, logged receipt metadata fails -> queued bytes remain but original sender is **not** confirmed 2xx; replay and receipt completion are required
- Logged receipt metadata committed, Queue fails -> **ghost** hash-only record without raw source, never scientific evidence
- Process SIGKILL after either first commit -> first-system-only state must be repaired/censored, not passed
- Both committed but sender never received 2xx, or owner crashed before responding -> cannot claim sender ACK; supplier-billed behavior remains independently unknown
- Both committed but latency >10s -> upstream timeout, despite eventually successful SQL
- Queue 24h expiry with metadata still retained -> raw source unavailable, no scientific success
- Either service entirely unavailable before first commit -> source not admitted
- Baseline both accepted within independent sender budget -> only INFRASTRUCTURE receipt accepted; **scientific 120m continuity is never inferred by this model**.

The 10/10 isolated tests passed on [GitHub CI #38051620243](https://github.com/HKcode22/ReplitTranvr/actions/runs/38051620243), together with the now **129/129 offline tests** and the existing SQL crash suite. This demonstrates correct *failure detection/classification*, not a fix for cross-service atomicity or actual hosting reliability.

**Outstanding design decision:** a truly independent durable first-receipt ledger is needed with an explicitly reviewed failure-recovery state machine, but adding a second required external commit to synchronous ingress may itself violate the 10s provider ACK deadline. No Cloudflare resource creation or paid cloud plan is authorized. Validate cost and real sender timings **before** exposing billable Stage-1 traffic.
