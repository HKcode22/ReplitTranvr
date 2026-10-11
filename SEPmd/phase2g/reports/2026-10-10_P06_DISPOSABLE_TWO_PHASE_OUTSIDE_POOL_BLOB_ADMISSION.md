# P06 — experimental two-phase original-blob admission without holding database connections

Prepared Oct 10, 2026 PDT, on isolated draft `phase2g-p2g24-github-observer-20261009`. **NOT production-safe, NOT published, NOT merged, not a paid 6+6 enabler. No live AeroDataBox provider traffic, no credits, production DB write, Replit publishing, Cloudflare or third Replit account.**

## Motivation, exact baseline

[Prior negative CI #38109642815](https://github.com/HKcode22/ReplitTranvr/actions/runs/38109642815) actual V3.9 local HTTP callback + disposable PostgreSQL16, max3 connections, 22 concurrent fake provider notifications, simulated 550ms object-storage stage, independent sender 10-second timeout: **17 of 22 timely sender HTTP 200 vs 22 eventually committed**. SQL pool-acquisition P50 4.465s / P95 10.013s / P99 10.569s, session row-lock P95 1.115s, fake blob stage P95 0.551s. Test is **not** live Replit or original provider evidence. Current V3.9 holds `SELECT ... FOR UPDATE` on entire session during slow object-store upload/read-back; merely enlarging pool acquisition timeout or 6+6 GET health checks cannot fix this POST queue.

## Newly implemented, proof-of-concept ONLY

`experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts` provides a different **synthetic** source admission protocol, exercised through the real PostgreSQL16 fixture, but **NEVER imported by the actual paid V3.9 callback**:

1. Accept only `P2G_DISPOSABLE_POSTGRES=YES` with NO live scientific DB URL/API key; independently verify PostgreSQL database named `p2g_stage1_fixture`, source length ≤64KiB, valid synthetic attempt HMAC and session UUID.
2. Atomically create one short-lived **LOGGED** opaque PENDING intent per synthetic attempt, storing SHA256, future 168-hour retention, immutable private object UUID/path and owner token; never store raw provider JSON/flight identifiers. Commit the `INSERT ... ON CONFLICT DO NOTHING` SQL before uploading any blob; release the database connection.
3. While **no pooled SQL connection or long SQL row lock is held**, persist exact original synthetic bytes through the existing `persistProviderBlobBeforeAckV39` upload/visibility/download/SHA/byte-readback primitive (using simulated Replit storage only).
4. Finalize the PENDING intent using a short atomic PostgreSQL UPDATE to COMMITTED; only then permit a **synthetic** 2xx verdict. An uncommitted/failed update or ambiguous SQL outcome never automatically authorizes 2xx, and the uploaded original is conservatively retained.
5. If another same-attempt callback observes PENDING, it must wait within a bounded duration or return `PENDING_NOT_ACKNOWLEDGED`; it may **never** ACK based on a hash alone. If COMMITTED, first download original object and verify exact bytes; only then return duplicate 2xx. Same synthetic attempt HMAC with different source SHA fails closed; same bytes from distinct synthetic attempt HMACs are **distinct** original send attempts, never silently merged.
6. Every return has `realPaidLaunchAuthorized:false`, `originalF8ScientificPassAuthorized:false`, `originalProviderAttemptWitnessVerified:false`. This design still does NOT provide an AeroDataBox sender-authenticated ledger or independent HTTPS front door.

## Fault tests, and remaining failures

The actual disposable PostgreSQL test suite adds tests for: pool availability **during** delayed upload, 22 distinct simultaneous raw attempts with simulated 550ms blob latency, idempotent duplicate without double upload, concurrent PENDING no false ACK, same attempt/body hash conflict, blob-upload failure leaving PENDING, both nonexecuted and executed-but-reply-lost final SQL, same original bytes from distinct attempts **not** deduped, and refusal of non-disposable input/environment.

**Critically, even if these tests pass, it would be unsafe to wire this to paid production.** Before approval, the implementation must demonstrate in a truly isolated hosted test:

- **No source loss after crash between intent creation and actual blob upload.** The DB intent has ONLY opaque hash and path, not the original bytes. If the Replit process dies before upload and upstream sender will not retry, the original source cannot be reconstructed from the intent; therefore this candidate **does not solve the platform outage problem**.
- **Cleanup, privacy and retention:** abandoned LOGGED PENDING rows and raw App Storage orphans need original HMAC binding, auditable 168h expiry, positive/negative readback checks, restart recovery, bounded retention and policy-compliant hard deletion. Current candidate does **not** implement cleanup/replay.
- **Atomic unique source and science:** final committed source intent is NOT equivalent to existing `provider_content_blob_ref` LOGGED source row or physical flight v2 UNLOGGED item rows, exact billing credits, valid scientific eight UTC bins and owner/one-subscription freeze. Those integrations need separate correctness/fault tests.
- **No blind ACK during incomplete science:** eventual SQL receipt must be independently reconciled to AeroDataBox sent/attempt ledger, payer credits and expected original sources. Local SQL counters do not prove unseen POSTs weren't sent.
- **Original source custody before 2xx**, real published receiver remote send ACK <10s/P99 and real object-storage availability, concurrent duplicate failure isolation, PostgreSQL SIGKILL loss of UNLOGGED session, unknown COMMIT outcomes, stop/cleanup races, rolling deployment and production-vs-draft SHA.
- **Overload backpressure:** synthetic 22-way burst may be faster because fake memory object I/O is parallel; actual Replit object-storage throttles, global connections, network, cold start, quotas, storage cost and real 1.8/5.8/21.7 KB blob distributions are unknown.

### Release gates

**P06 is NOT closed** by an experimental design or speed result. The current production source path is unchanged. Any future adoption needs a monotonic originally-durable receive journal with replay after process death, an auditable orphan cleanup protocol and true two-hour signed-source no-paid hosted rehearsal BEFORE changing 6+6, publishing, or launching. Prior P2G22 external 260 vs internal 259 remains unresolved. If a candidate cannot meet first-hop delivery guarantees, do NOT substitute it for the original source-preserving code.

**Current YSSY paid verdict: NO-GO.**
