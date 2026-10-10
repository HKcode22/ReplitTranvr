# 2026-10-10 — Actual disposable PostgreSQL integration and UNLOGGED crash-recovery proof (Phase 2G / Stage 1 YSSY)

**Status:** OFFLINE TEST EVIDENCE ONLY — NOT A PAID AUTHORIZATION, NOT A REAL YSSY REPLAY IMPLEMENTATION. The live Replit scientific DB, published callback, Cloudflare account and AeroDataBox were not accessed or modified by this experiment.

## Replit support status

Support ticket **#564568**: user provided the requested Private Join Link directly to Replit Support by replying to Quinn on 2026-10-10 03:04 UTC. As of connected Gmail thread inspection during this run, the only messages in that conversation are Quinn's 02:39 UTC support reply and the user's 03:04 UTC response. **No engineering root-cause response yet.** Private Join Link must NEVER be copied into GitHub.

## New test environment and boundary

[CI run #38037437561](https://github.com/HKcode22/ReplitTranvr/actions/runs/38037437561), source `0bc4e655a39828c1b4c43fe4c3c18a0f19473eaa`: both jobs **COMPLETED SUCCESS**.

- Main offline job: **84/84 Vitest tests**, 18 existing callbackHealthy isolated scenarios, two auditor scripts only COMPILED (no database/storage access), and full TypeScript typecheck all PASS.
- New service-isolated CI job: disposable `postgres:16` container using explicitly fake `p2g_stage1_fixture` local database, no `V39_DATABASE_RUNTIME_URL` or `AERODATABOX_API_KEY` or Cloudflare credentials. An in-memory fake object store substitutes for Replit cloud storage.
- [Actual V3.9 function integration tests](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-p2g24-github-observer-20261009/tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts): **7/7 PASS**. Execute `persistPrepaidProbeWebhookV39()` itself against real disposable SQL schemas: UNLOGGED `clean.prepaid_probe_session_runtime` and `clean.prepaid_probe_delivery_runtime`; LOGGED `clean.provider_content_blob_ref`, with no flights in fixture to avoid claiming real identity-v2 integration. Checks (1) object-storage byte readback before DB commit and credit record, (2) duplicate replay dedupes actual SQL transaction, (3) forced SQL CHECK error after blob upload rolls back both SQL writes, records one failure and deletes orphan object, (4) fake object store failure no success, (5) wrong subscription ID rejects without object write, (6) simulated UNLOGGED record reset leaves logged metadata but rejects lost session, (7) ~21 KB synthetic nonempty JSON processed in fake storage.
- **Real abrupt database stop and restart** via SIGKILL to ONLY the disposable GitHub job PostgreSQL container. Using separate fixture schema with one logged control row and one unlogged session-like row:
  - BEFORE: `BEFORE_UNCLEAN_STOP_LOGGED_AND_UNLOGGED=1|1`
  - AFTER: `AFTER_UNCLEAN_RESTART_LOGGED_AND_UNLOGGED=1|0`
  - Result: `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED`.

## Interpretation — key scientific risk

This *proves* (in a temporary PostgreSQL 16 setup) that a crash/restart can destroy the UNLOGGED active-session and delivery ledger while retaining the LOGGED opaque metadata reference. The actual V3.9 prepaid persistence logic correctly **refuses to treat a missing session as delivered**. It does not auto-recreate a session and count a false success.

Therefore:
- A durable Cloudflare queue, or even perfect upstream notification preservation, is **NOT SUFFICIENT** on its own to guarantee an uninterrupted scientifically valid 120-minute Phase-2G Stage-1 sample after PostgreSQL runtime loss.
- Raw provider notification bytes may still be present in Replit Object Storage and logged blob-ref rows, but historical processor-time session state, item-level physical-v2 identity resolution, at-most-once billed attempt accounting and original source/receive-time provenance are not demonstrably reconstructible from these alone. No provenance-free or post-hoc reconstruction is authorized.
- A correct prospective **dual-layer recovery protocol** must preserve authenticated original edge-receipt time, exact notification and billable attempt identities, durable control-plane state, source raw bytes, bounded backlog, and reprocess into the original (not extended) sampling window under strict idempotent verified reconciliation; avoid storing prohibited provider plaintext in PostgreSQL logged/PITR.
- If reconstructability cannot be formally demonstrated without changing frozen study semantics, do **not** fake a recovered PASS; preserve the failed/censored record and stop provider charges using existing exact-ID GitHub watchdog. A reliable backup can only reduce risk, not mathematically eliminate all failure modes.

## Boundaries of evidence / remaining unfinished gates

- Does NOT mean P2G23/P2G24 suffered an actual PG crash: no forensic DB postmaster event matching original failure has been established.
- Real PostgreSQL 16 crash test was a small schema fixture, **not the actual deployed Replit/Neon server**, with no real flight-item identity processing, no actual Replit App Storage network/storage latency, no signed full HTTP callback and no AeroDataBox provider send.
- Prior all-GET HTTP active/sparse observer passes demonstrate endpoints answered, not that signed nonempty notifications persisted within AeroDataBox's response timeout.
- No genuine crash-resume mechanism is implemented. A **production replay pipeline** would require review of frozen V3.9 F.8 scientific design, session ownership, budget control, 15-minute source-time buckets, retention, pseudonymity and PITR.
- Replit Autoscale SIGTERMs and historical 260-external/259-internal discrepancy still lack confirmed causal attribution. Support case is pending.
- Draft [primary prevention improvements](2026-10-10_P2G24_PRIMARY_FAILURE_PREVENTION_AUDIT_AND_DB_PREFLIGHT.md) remain UNMERGED and NOT DEPLOYED: exact published SQL connectivity preflight; passive sanitized slow/closed HTTP logs. No app or owner rollout is authorized by this test.

## Next engineering actions (zero provider/cloud spend until approved)

1. Build a disposable signed synthetic `HTTP POST -> real PostgreSQL V3.9 function -> object storage mock -> 2xx` receiver, measure response latency on 1.8, 5.8 and 21.7 KB payloads with injected slow/failed persistence and concurrent duplicates. This is NOT a full provider latency benchmark while object storage remains mock.
2. Add a science-preserving **durable control-plane and replay feasibility study** separately from UNLOGGED runtime, using logged opaque metadata only where permitted. Prove, with disposable SQL, that an interrupted run can restore original timestamps, credit identities, physical-flight-v2 invariants and session owner without fabricated evidence; otherwise formally reject auto-resume.
3. Verify Replit original incident cause with their engineering team after Quinn reviews support ticket #564568. Avoid republishing/unpublishing while preserving evidence.
4. Apply the previously drafted bounded Stage-1 prospective retry amendment, approve exact source/build hashes, GitHub owner/watchdog integration and appropriate callback destination only **after all safety and scientific review gates pass**.

**Cost/action:** 0 AeroDataBox provider calls; 0 Cloudflare resources activated, 0 R2/Queues Workers; 0 scientific DB mutations; 0 Replit deployment changes. Tests use standard GitHub-hosted disposable CI on a public repository. Draft PR #27 unchanged in deployment status.

## Follow-on result: local real HTTP synthetic requests + real PostgreSQL (11/11 tests)

[CI run #38037635428](https://github.com/HKcode22/ReplitTranvr/actions/runs/38037635428), source `5c4ad57fc0d5abb60f8c442b6a9f3e3b47c56c28`: **BOTH jobs SUCCESS**. Same 84/84 Vitest offline suite +18 standalone callbacks, compile and typecheck. PostgreSQL job expanded to **11/11** true SQL-backed persistence tests; actual SIGKILL/restart confirms `BEFORE=1|1`, `AFTER=1|0`.

Four new tests spin up a disposable loopback-only Express HTTP listener and call the real `persistPrepaidProbeWebhookV39` with isolated PostgreSQL and in-memory mock object storage:

1. Synthetic ~21 KB JSON HTTP POST responds 200 **only after** blob readback and committed logged/unlogged SQL.
2. Injected 220 ms blob upload delay delays HTTP 200 by at least ~190 ms. This establishes correct **ACK ordering** at the mock boundary, **NOT** real provider/Replit P95/P99 latency.
3. Two identical, concurrent HTTP POSTs are serialized by PostgreSQL session row locking; both receive 200, but only **one** unique delivery and blob reference are persisted. Callback request/success counters record two 2xx requests appropriately.
4. Injected blob-storage failure causes HTTP 503, zero committed delivery records, and one failure count.

**Limits:** The synthetic HTTP listener copies the minimal route/persistence behavior; it does not use the actual published Replit callback-only route/middleware; blob storage is in memory rather than real Replit Object Storage. No full nonempty physical-v2 flight record was processed, no cloud network/SLO was tested, and no actual production/frozen scientific replay after crash was achieved. No paid API calls, scientific DB changes, deployments, Cloudflare creation, or R2 usage.

**Next missing gate:** Test a full synthetic *actual published-handler-equivalent* secret-authenticated route with nonempty provider flight records and real storage latency in an isolated environment; check P95/P99 and request timeouts against the provider SLA. Then prove source-time-authenticated queue replay under actual UNLOGGED reset, including independent signed session and attempt ledger; absent that proof, fail closed rather than mark the Stage-1 probe complete.
