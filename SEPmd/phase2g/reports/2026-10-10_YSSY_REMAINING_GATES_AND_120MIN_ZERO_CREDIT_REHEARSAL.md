# Phase 2G → Gate 2 → Stage 1 YSSY: remaining work, hard gates and final no-credit 120-minute rehearsal

**Updated 2026-10-10.** Source of truth for this incident: [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28), [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27), [V3.9 F.8 collection plan](../../V3.9_DataCollectPlan_f.8.md), [V3.9 implementation log](../../V3.9_IMPLEMENTATION_LOG.md), and prospective [bounded recovery proposal](../amendments/DRAFT_2026-10-10_YSSY_POST_P2G24_BOUNDED_TECHNICAL_RECOVERY_PROPOSAL.md).

**NON-NEGOTIABLE:** NO AeroDataBox calls / subscriptions / credit spends; NO Cloudflare Worker/Queue/R2 provisioning; NO Replit republish/unpublish or deployment modifications; NO scientific DB write, cleanup, or replay; NO `main` merge; NO paid runs. A staged test may use **only disposable PostgreSQL and in-memory fake storage** without new approval. Using a real Replit published-equivalent staging instance, real object storage, any cloud provisioning, or increased hosting cost requires user approval and a verified $0 incremental billing plan first.

## Why all 120 minutes matter

Historical P2G22: **260 external credits vs 259 internal**, terminal gap; P2G23 and P2G24 also failed/censored. P2G24: three published Autoscale callback health failures roughly 04:58:26/41/56 UTC Oct 9, terminate after three-strike owner policy; platform exact cause unresolved, pending Replit Support ticket #564568. Previous 130-minute active + 146-minute sparse GET observation tests passed **GET health only** and did not prove signed nonempty POST persistence. The captured P2G24 30 raw object references range **1,781–21,746 bytes**, none over a conservative 60 KB raw cap; this does **not** establish max future payload or provider-attempt counts.

Disposable tests also proved real PostgreSQL crash clears UNLOGGED runtime while LOGGED references remain, and demonstrated two webhook risks caused by `SELECT ... FOR UPDATE` around slow object-store I/O:
- 18 concurrent simulated sends × 600ms fake upload, short 3s SQL-pool acquisition timeout ⇒ some calls HTTP 503/unrecorded.
- Same load, long 20s acquisition timeout ⇒ all eventually 200/committed, final ACK approximately 11 seconds (past the evaluated ~10s provider deadline).
These are synthetic **risk demonstrations**, not confirmed original P2G24 root cause. The draft proposed 4s pool timeout is **disabled by default** until independent durable admission exists; it cannot fix both cases alone.

## Remaining tasks, in strict dependency order

| ID | Priority | Remaining action and measurable exit evidence | Status |
|---|---|---|---|
| P01 | BLOCK | Confirm original Replit SIGTERM/replacement reason, revision/deployment log correlation and plan-supported mitigation from Quinn/engineering; do not substitute later logs | Awaiting external reply; other tasks can proceed |
| P02 | BLOCK | Freeze historical evidence: preserve P2G22 260/259, P2G23/P2G24 failed/censored, original runtime hashes, 30 P2G24 blob SHA/byte inventory before reference expiry; never backfill missing paid data | Existing audit; verify retention and provenance |
| P03 | HIGH | Test **real physical-flight-v2 identity** with nonempty confirmed `IsOperator` items: same provider ID retime stays one physical leg; `IsCodeshared` and `Unknown` quarantine; conflicting provider linkage fails closed, all using disposable real PostgreSQL | In progress; new CI tests |
| P04 | BLOCK | Verify actual **production prepaid HTTP middleware/secret-parser path** (not the simplified loopback clone), real signed/authorized session and failure accounting, 2xx only after readback+SQL COMMIT, wrong-secret 404, invalid JSON 4xx, duplicates and 2xx-lost ACK | Missing real-route integration |
| P05 | BLOCK | Measure realistic full POST / raw object upload+read-back / physical-v2 SQL latency P50/P95/P99/max and tail under normal, concurrent, 1.8 / 5.8 / 21.7 KB and stress-size messages; account for platform cold-start + provider deadline | Only isolated in-memory storage tests passed |
| P06 | BLOCK | Verify correctness of the original DB pool lock/transaction boundaries under multiple overlapping callbacks and injected SQL/transport faults; **do not fix by loosening deduplication or increasing timeout blindly** | Two opposing failure modes reproduced |
| P07 | HIGH | Review source and preserve matched published receiver hardening: platform GET root 200, fail-closed startup, separate signed live PostgreSQL SELECT 1 preflight before owner spawn; measure that root 200 cannot mask unhealthy real callback | Draft source/test green; not deployed |
| P08 | HIGH | Add sanitized in-run telemetry for actual POST latency, completed/aborted transport, parser failures, callback ingress/concurrency, SQL acquisition/lock time, object upload/readback and circuit breaker; no URL secret, body, account info, or notification ID in logs | Slow/closed diagnostics drafted; stage-level timing missing |
| P09 | BLOCK | Decide scientifically permitted **upstream source ACK**: independently durable, authentic full raw payload admission *before* HTTP 2xx; reject ACK if bytes, authentication or queue admission unverified | Queue-only synthetic prototype only |
| P10 | BLOCK | Prove **zero-additional-cost** backup feasibility: account-wide Workers/Queues limits, message 128 KB serialized cap, provider payload size distribution and worst-case bursts, quota exhaustion behavior; queues Free 24h vs 168h scientific source retention | Historical sizes favorable; no live Cloudflare resources |
| P11 | BLOCK | Implement source-authenticated, immutable original **edge-received UTC** + raw SHA + notification/attempt ID end-to-end at Replit, with anti-replay, key rotation and provenance controls; never trust arbitrary headers | Synthetic HMAC helper only |
| P12 | BLOCK | Prove durable Queue → existing V3.9 processor at-least-once replay, safe retry/backoff, consumer crash, lost HTTP 2xx, duplicate attempts, DLQ, backlog expiry/monitoring and 168h downstream object retention | Not integrated/deployed |
| P13 | BLOCK | Recover from **PostgreSQL UNLOGGED crash loss** only when original 120m session/owner/window/item identity/credit identities and source timestamps can be fully re-established from independently durable, prospectively authorized evidence; otherwise fail/censor | Actual crash loss reproduced; safe restoration NOT proved |
| P14 | BLOCK | Reconcile synthetic external billed attempts vs internal delivery records 1:1 and identify exact gap with proof; provider retries are *billable* and remain disabled until a separately approved bounded amendment | 260/259 historical unexplained |
| P15 | BLOCK | Verify owner GitHub Actions heartbeat/lease, exact published build binding, callback routing, no ownership split or concurrent paid subscription; watchdog can enter `DEGRADED_BUT_DURABLE` only after independent durable receipt, bounded backlog and approved frozen threshold; keep 3-strike fail-closed otherwise | Existing watchdog safe; proposed graceful continuation NOT integrated |
| P16 | HIGH | Test stop/cleanup/settling: GitHub cancellation, SIGTERM, unexpected owner crash, provider subscription exact-ID termination, no orphan active billing, callback drain until quiescent and signed final receipt | Historical tests exist; integration missing |
| P17 | HIGH | Validate *scientific* outputs after replay: no altered 15-minute buckets, physical-flight-v2 lower/upper bounds, no marketing duplicates, zero censored intervals called complete, original window frozen, 80/10/10 future-time policy preserved for later phases | Not yet proved in reconstructed run |
| P18 | BLOCK | Validate exact release/deploy source hashes and preflight state for both published Replit and GitHub owners, review entire PR for secret leakage/privacy/schema/migration hazards and roll back safely without changing frozen data | PR #27 draft; `main` unchanged by this work |
| P19 | BLOCK | Complete new scientific **prospective** recovery amendment and explicit human bounded Stage-1 YSSY authorization; historic single retry consumed; exact budget floor/credit limit, calendar and no existing paid subscription verified by authorized read-only tools | Not authorized |
| P20 | BLOCK | Complete genuine **wall-clock 120-minute no-provider rehearsal** below with PASS/FAIL signed artifacts, plus controlled fault variants; do NOT mistake earlier GET-only monitors or accelerated unit tests for it | Not yet run |

P01 is the only item requiring Quinn. P03–P18/P20 planning and disposable test implementation can continue independently, subject to cost/environment boundaries.

## Final high-fidelity simulation: two separate test modes

### A. Rapid reproducible fault suite (safe now, GitHub disposable only)
Run realistic full-payload synthetic notification sequences with original UTC timestamps, source SHA, distinct notification and delivery-attempt IDs; in-memory object storage + real temporary PostgreSQL + emulated free-tier Queue, with frozen 120-minute **virtual event time**. Test normal delivery, duplicate provider send, 2xx lost ACK, malformed JSON, missing provider subscription, storage corruption and slow upload, concurrent bursts, delayed Queue, SQL fault before/after raw upload, crash-cleared UNLOGGED, watchdog 3 strikes, recovery/settle/accounting; prove NO FALSE PASS for failures. **NOT real elapsed-time/hosting reliability.**

### B. Final wall-clock 120-minute published-equivalent rehearsal (after all gates approved)
**No real AeroDataBox subscription, no credit refill, no provider API call.** Use the exact frozen eligible UTC Stage-1 time class when possible, matching source/build versions, owner/watchdog cadence and published Autoscale behavior. Use **isolated test session, separate disposable database and synthetic test-only ingress** that cannot write live scientific tables or accept real provider credentials. A fake producer sends the same shaped notifications and histogram measured from permitted historical metadata, including a bounded payload worst-case and realistic concurrency. Replit receives signed synthetic full POST requests via the *actual* production-equivalent parser/handler, but with synthetic keys and isolated storage. The fake upstream applies a **strict 10s response deadline**, records its own sender-side HTTP outcome independently, and compares to durable source receipt and SQL logs. Test start, 120m active, then bounded settlement, cleanup, no orphan owner/session or paid subscription, and 168h downstream object retention contract. Capture per-minute health, 15-minute sampling bins, P50/P95/P99/max POST latency, request status/cold-start, persisted SHA, queue depth/age, synthetic external/internal attempt counts, explicit 0 provider API credits and exact deployed build SHA. Keep data isolated, and generate immutable evidence/manifest for independent review.

**Important limitation:** An isolated synthetic producer cannot prove AeroDataBox's real infrastructure/retry/billing or Replit's future instance lifecycle. If an exact published Autoscale staging clone requires new service usage or charge, do not provision it before user explicitly approves a verified $0-cost deployment plan. Do not send synthetic POST to the currently published production probe endpoint—would contaminate scientific data.

### Mandatory fault-injection variants (repeat after fixes, at least once each)

| Variant | Injection | Required observable outcome |
|---|---|---|
| R0 | Baseline unperturbed 120 minutes | Every expected synthetic source receipt reconciles exactly, 0 external paid calls, original window/8 bins intact |
| R1 | P2G24-style 3 transient published callback health failures near minute ~60 | Either correctly detects unsafe loss and marks run FAIL without paid owner or demonstrates *provably durable* upstream admission and bounded recovery; never silently calls it complete |
| R2 | Replit cold startup/autoscale replacement at minute ~60 | Source sends ≤10s or is durably staged; no unsupported "provider retry" assumption |
| R3 | PostgreSQL pool saturation, 18 overlapping callbacks and slow blob service | No false ACK or synthetic 260/259 mismatch; quantify sender status and original source UTC |
| R4 | PostgreSQL SIGKILL→recovery clears UNLOGGED session | Unless prospective science-equivalent reconstruction is demonstrated, run must FAIL/CENSOR, not auto-recreate or mark PASS |
| R5 | Object-store unavailable/readback corruption and then restored | Never 2xx before durable commit; retries accounted without duplicate scientific items |
| R6 | Edge Queue temporarily unavailable or account Free quota exceeded | Admission returns non-2xx, no success claim or surprise paid resource activation |
| R7 | Replit unavailable while queue persists; duplicate/late relay and 2xx-lost response | At-least-once replay, dedupe, source UTC preserved, 168h raw evidence after downstream commit; backlog ceiling obeyed |
| R8 | Owner SIGTERM/GitHub Actions cancellation/stop during active window | Exact-ID cleanup, no active billable subscription, preserve failed/censored evidence |
| R9 | Scientific ambiguous codeshare / flight retime / reused provider flight ID | Physical-v2 PASS only when grounded, otherwise quarantine/FAIL, no fabricated complete sample |
| R10 | Forced 260 sender-attempt credits vs 259 internally committed | Reconciliation always FAIL, never completed; missing sender item not inferred |
| R11 | Post-window callbacks during 30m proposed settling interval, 24h queue expiry, retention 168h audit | Frozen observation clock cannot shift; no lost source blob or claims beyond available evidence |

### Hard rehearsal PASS contract

All must be true **for the clean R0 baseline**: frozen source hash/build and architecture config match; fully isolated synthetic-only owner and receiver; actual elapsed active time 120m without gaps; 0 paid provider traffic, 0 hidden cloud costs; every sent notification's authenticated original edge receipt is recovered; **provider-emulator sender ledger = edge durable receipts = unique internal billable attempt ledger** with exact dedupe; all raw object SHA and byte sizes match and 168h retention policy present; exact original eight 15-minute bins, scientifically valid physical-v2 classification and strict noncensor; provider-emulator 10s response deadline met at source for each submitted POST or explicitly bounded independent queued admission; watchdog/owner/cleanup and recovery checks PASS; no unauthorized reclassification of earlier P2G22/P2G23/P2G24.

**Every deliberate-fault R1–R11 case must produce its specified safe result**, which may be an explicit FAIL/CENSOR. A test that stops safely is a success of the safety mechanism, **not a successful science sample**. Unmeasured external provider/network behaviors remain on a residual-risk list; never promise "failure impossible."

### Evidence checklist
Repository commit and exact build SHA, owner/watchdog version, published deployment revision, budget/auth **synthetic-only** marker, UTC start/end/arrival clocks with offsets, per-minute health, complete sender ledger, per-attempt provider-emulator response status and response times, 15-minute scientific buckets, item identities/quarantine, immutable raw SHA + length manifest, database postmaster lifecycle, 3-strike events, queue backlog/expiry telemetry, end-of-window and settlement reconciliation, no-provider-call audit, teardown and data retention verification; independent review of evidence and scientifically authorized launch gate.

### Sequence and permission
1. First finish P03–P18 offline source/test gates.
2. Review rehearsal design against V3.9 F.8 frozen definitions and cost/permission envelope.
3. Ask user before any real Replit staging deployment, optional Cloudflare Free Queue provisioning or full 120-minute hosted test. Respect zero additional hosting charges.
4. Run R0 real-time no-credit baseline and deliberate-fault scenarios only on isolated staging.
5. Independent full evidence audit; never automatically convert its success into a paid YSSY Stage-1 launch without new prospective authorization.

**Current decision: PAID STAGE-1 NO-GO; work on safety can and should continue.**
