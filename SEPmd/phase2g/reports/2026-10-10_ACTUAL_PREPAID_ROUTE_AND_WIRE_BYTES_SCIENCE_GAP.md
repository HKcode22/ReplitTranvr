# P2G Stage-1 — actual prepaid HTTP route integration and raw wire-evidence finding (2026-10-10)

**Status:** TESTED DRAFT SOURCE ONLY; NOT DEPLOYED OR MERGED. The user requires **no AeroDataBox traffic or credits, no Cloudflare resources/charges, no changes to Replit production or the scientific database**.

## Actual V3.9 route exercised with real disposable PostgreSQL

[CI #38049874944](https://github.com/HKcode22/ReplitTranvr/actions/runs/38049874944) COMPLETED SUCCESS. In the existing isolated disposable `p2g_stage1_fixture` PostgreSQL 16 job, seven new tests invoke the **actual `registerV3Routes(app)` prepaid parser/handler/error boundary** rather than a cloned business-logic handler, over loopback HTTP. Replit's top-level callback-only startup allowlist, real deployment, and real object storage were NOT exercised. Raw provider storage is an in-memory fake with readback.

- Valid content/secret → HTTP 200 only after storage verification and actual SQL commit.
- Wrong path secret → 404, no ledger poisoning.
- Malformed JSON → 400, authorized-session failure counted, no raw/delivery success.
- Over-2MB JSON → 413, failure counted, no success.
- Wrong content type → 415, failure counted, no success.
- Injected object-upload failure → 500, failure count exactly once, no delivery.
- Simultaneous identical POSTs → both 200, exactly one canonical delivery and blob.

Previous [real PostgreSQL tests](2026-10-10_ACTUAL_POSTGRES_INTEGRATION_UNLOGGED_CRASH_RECOVERY_GATE.md) cover operator physical-flight-v2, safe quarantine, retimes, SQL constraints, storage and abrupt SIGKILL/UNLOGGED loss. These combined tests do NOT prove an actual Replit 120-minute uptime/real provider ACK deadline.

## Newly exposed P04/P09/P11 scientific source-evidence distinction

The real prepaid route's Express parser uses `verify:(req,_res,buf)=>{ req.rawBody=buf; }`, **but** `persistPrepaidProbeWebhookV39` currently does:

```ts
const rawText = canonical(input.body ?? {});
const rawBytes = Buffer.from(rawText, "utf8");
const bodySha256 = sha256(rawBytes);
```

Here `canonical` sorts JSON object keys. Consequently `clean.provider_content_blob_ref.content_sha256` and the stored raw-content object refer to **canonical re-serialized JSON** rather than the **exact HTTP wire bytes** of an original AeroDataBox POST. The original `req.rawBody` is not passed to the persistence routine. A new actual-route integration regression proves that a syntactically valid but noncanonically formatted source webhook returns 200 while stored bytes and SHA differ from the HTTP source bytes. The two representations may contain equivalent parsed semantics, but **are not cryptographically byte-for-byte identical**.

**Do not silently rewrite historical P2G22/P2G23/P2G24 blob hashes or claim those 30 P2G24 verified references prove exact original wire payloads**. They prove the bytes of the *stored canonical* objects match the saved metadata SHA/size. They do not independently prove how the upstream sender formatted the original request. This does not prove a former observation was scientifically incorrect; it defines a fidelity and future replay-contract question for the frozen F.8 plan.

### Required prospective resolution before implementing a durable Queue-only upstream receiver

1. Read the frozen study definition of `raw_provider_content`, `content_sha256`, 168-hour retention and source provenance. Confirm whether it requires exact wire-bytes or exact canonical parsed JSON. Do not assume either without checking.
2. If true wire bytes are required: make a **versioned** candidate ingress envelope preserving the original buffer bytes and original wire SHA-256, with distinct canonical JSON/dedup SHA, while retaining safe classification semantics and historical comparability. Signed independently durable edge receipts must bind **both** hashes and first edge-received UTC. Design 168h storage and permitted deletion; provider IDs in UNLOGGED runtime only.
3. Test whitespace/key-order changes, equivalent JSON, UTF-8, duplicate JSON keys, oversized body, malformed JSON, attempt ID ambiguity, exactly-once replay, and no provider billing. Never treat canonical object SHA as evidence of independent source HTTP byte fidelity.
4. Release only as a reviewed **prospective** format amendment with hash/source/run freeze and scientific signoff. **Do not mutate historical receipts, reinterpret the earlier failed probes as completed, or deploy a dual-format parser before versioning.**

## Small preventive draft improvement: authenticate before JSON parsing

`server/routes_v3.ts` now includes `prepaidEarlySecretGuard` **before** `prepaidJsonParser` in the prepaid route only. Previously the parser could allocate for an invalid secret's large/malformed POST before the paid URL secret check. New early guard is constant-time for equal-length byte buffers and responds 404 before parsing; the original in-handler check remains as defense-in-depth. A new real-route integration fixture requires wrong-secret malformed JSON to return 404 and leave counters at zero. **This does not substitute for upstream rate limiting or provider signature validation.**

## Still not proved (P04–P06, P09–P20)

- Replit's actual callback-only top-level allowlist and startup/lifecycle were not mounted in this isolated route job.
- Real Replit storage object write/HEAD/download/readback latency, real Postgres network and cold-start under provider ~10s ACK envelope; no real source-signed provider HTTP traffic.
- Source-authenticated free Queue-only durable ingress, account-wide quotas and 24h limit versus 168h raw evidence.
- Crash recovery of scientific UNLOGGED session, exact 120m operator/watchdog/ledger behavior, true source-time replay and physical-v2 completeness.
- Historical 260/259 gap, Replit SIGTERM cause, matched release or new bounded Stage-1 scientific retry authorization.
- Final **120-minute wall-clock no-credit rehearsal** has not run and requires isolated staging, verified $0 additional cost, and user approval for any cloud deployment.

**Current decision: PAID YSSY Stage-1 NO-GO.** Keep draft PR #27 and incident issue #28 as evidence; no `main` merge until prospective science/security review.

## High-priority P05/P06 extension: independent synthetic sender deadline vs actual V3.9 route

[CI #38050244217](https://github.com/HKcode22/ReplitTranvr/actions/runs/38050244217) COMPLETED SUCCESS. Both jobs passed: **99/99** offline Vitest, **29/29** real PostgreSQL/actual-route integration tests, 18 standalone callback-health scenarios, typecheck and disposable SIGKILL→UNLOGGED reset.

**Adversarial test:** 22 distinct fictional callbacks were posted simultaneously to the **actual** V3.9 prepaid parser/handler on disposable loopback HTTP. Each object-storage upload was artificially delayed **550 ms**, and the exact-session SQL lock serialized the requests. The fake sender enforced its **own** `AbortSignal.timeout(10_000)`; the database pool had a 22-second acquisition timeout for this fixture only.

```
SYNTHETIC_ACTUAL_ROUTE_SENDS=22
SYNTHETIC_SENDER_OBSERVED_200=18
SYNTHETIC_INTERNAL_COMMITTED=22
SENDER_SERVER_ACK_DIVERGENCE_EXPOSED=true
EXTERNAL_PROVIDER_CALLS=0
STORAGE_BACKEND=in_memory_fake
REAL_REPLIT_LATENCY_PROVEN=false
```

All **22** distinct notifications durably committed under the *fake storage* contract, but only **18** timely HTTP 200 responses were observed independently by the synthetic sender. **Four timeouts** show that a V3.9 internal delivery-success counter can disagree with a sender's record of timely acknowledgments without any failed SQL transaction. This is a synthetic architecture risk, not evidence that an actual AeroDataBox sender billed/retried those four notifications, nor an explanation of P2G22's historical **260 external /259 internal** (which is the reverse-direction mismatch). The correct decision remains NO-GO if actual provider records and internal scientific ledger are inconsistent.

**Technical implications:** A bounded pool wait alone is inadequate. The prospective upstream durable frontdoor must authenticate source, persist the complete original bytes **before** returning 2xx to the source, track original receipt time, separate source/sender ACK evidence from later Replit processing, support idempotent at-least-once relay without extra provider calls/credits, and fail closed on queue quota or expiry. Scientific session loss after UNLOGGED crash requires an independent, prospective control-plane recovery contract or censoring. An actual Replit/real storage network latency and published Autoscale lifespan test are still missing; this fixture cannot prove actual paid reliability. No Cloudflare provisioning, billable API, production deployment or scientific DB mutation was conducted.
