# Phase 2G YSSY Stage-1 — non-Quinn preventive work, raw-data and burst integrity gates (2026-10-10)

**Status: DRAFT engineering evidence, NOT paid-live authorization; NOT deployed or merged.** Main GitHub owner, published Replit receiver, cloud account, AeroDataBox balance/subscriptions and scientific database untouched.

## Replit support remains parallel, not gating offline investigation

Connected support thread #564568 contained Quinn's Oct 10 02:39 UTC explanation of Autoscale timeout/replacement behavior, and the user's Oct 10 03:04 UTC Private Join Link reply. No newer engineering reply on the checked thread at the time of investigation. The private link has not been copied into GitHub. Do not infer root cause of historical P2G24 from tests here.

## Stronger real SQL / synthetic HTTP findings

In [GitHub Actions #38045496994](https://github.com/HKcode22/ReplitTranvr/actions/runs/38045496994), independent Stage-1 fixture CI passed **13 actual V3.9 persistence/PostgreSQL tests** plus the original 84 offline tests and 18 callback-health scenarios.

- *Nonempty synthetic YSSY flight items:* three fictional YSSY → YMML item payloads reached actual UNLOGGED `clean.prepaid_probe_item_runtime` under PostgreSQL 16. Unknown codeshare statuses correctly remained **quarantined**, not falsely counted as confirmed physical-v2 identities. **Operator physical-v2 path still untested**.
- *Concurrent duplicate callback:* a mock 450ms storage upload while holding the same PostgreSQL session lock delayed a concurrent repeat. Idempotency and one unique blob/delivery succeeded, but requests queue behind external storage while the per-session lock is held.
- The actual crash test continued to show **logged 1 / unlogged 1 BEFORE**, **logged 1 / unlogged 0 AFTER** an abrupt restart of a completely disposable PostgreSQL container. This is a *general PostgreSQL failure mechanism*, not proof original Replit DB restarted during P2G24.

## NEW high-priority verified: per-session storage/SQL lock causes **two different paid-loss exposures**

Code at `server/lib/disruption/prepaidProbeRuntime_v39.ts` **begins a SQL transaction and takes `SELECT ... FOR UPDATE` before** doing external object storage upload, existence check, full download and SHA256 read-back; then it writes delivery/item ledgers and commits. This is strong exactly-once accounting protection but increases transaction lock duration. The root `GET /` health probe does not measure this path. Real Replit object-storage latency/tails are unknown.

[GitHub Actions #38045978272](https://github.com/HKcode22/ReplitTranvr/actions/runs/38045978272) **PASSED 15/15 disposable real PostgreSQL integration tests** and 88 existing offline Vitest tests +18 callback-health cases and typecheck. Two new *adversarial synthetic* tests sent 18 unique fake paid notifications in parallel, with **600ms simulated object-storage upload latency each**, using a disposable SQL fixture (no provider or real storage).

1. **Fast failure case:** fixture has PostgreSQL connection acquisition timeout **3 seconds**, pool size 3. Some requests returned **HTTP 503**, never entered the delivery ledger. Only successful calls were persisted as unique credits. This is a **verified synthetic data-loss hazard** with billable provider sends and frozen `maxDeliveryRetries:0`; it does NOT prove YSSY P2G24 saw this exact burst.
2. **Long-wait case:** with pool acquisition timeout **20 seconds** and same session locking, *all* 18 reached HTTP 200 and exactly-once delivery accounting, but total completion was **10,958ms**, beyond the ~10-second upstream ACK budget. A provider timing out before some HTTP 200s may count them as failed even though Replit eventually committed. **Server-side 200 is not proof of provider acknowledgment**.

**Actionable decision:** Simply shortening the DB acquisition timeout **does not prevent paid delivery loss**; it converts slow-but-possible callbacks into 503. Simply extending it may produce >10-second responses. **Do NOT deploy connection-timeout changes alone**, lower watchdog thresholds, or pretend a passing SQL transaction test proves the upstream delivery contract.

## Code safeguards prepared, carefully disabled until prospective change control

- `server/lib/disruption/db_v39.ts` has a **feature-gated** candidate 4-second pool acquisition limit. Original published behavior (`connectionTimeoutMillis:0`) remains the default even for `V39_CALLBACK_ONLY_RUNTIME=1`. Candidate only activates when **both** `V39_CALLBACK_ONLY_RUNTIME=1` and separate `V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED=1` are set; such an opt-in is **NOT approved**, **NOT deployed** and must not be enabled until reliable durable front-door and scientific change control pass. Test enforces exact flags, ordinary-app isolation and default preservation.
- Existing draft `/__v39/phase2g/db-live-preflight` proves a published endpoint can **actually run read-only `SELECT 1`** before the paid owner is created; mere URL HMAC is insufficient. Must publish owner/receiver changes as a reviewed matched release (not currently deployed).
- Existing draft prepaid-only sanitized HTTP diagnostics warn on >=7-second finish and incomplete connections, with no secret-bearing URLs or flight bodies; **not yet deployed**.
- Cloudflare Free Queue-only synthetic candidate remains **offline**, with **no Worker, Queue or R2 activated**, and $0 additional Cloudflare usage. Independent frontdoor source ACK-after-queue receipt before forwarding to Replit addresses Replit cold-start and lock-head-of-line ACK pressure in theory, but no real-edge HTTP/DB scientific replay proof exists.
- Original 30 P2G24 raw webhook metadata objects: min 1,781B, max 21,746B, mean 5,827B, P95 17,441B, none >60KB. Favorable but not future upper bound and not a proof of complete serialized Queue envelope sizes.
- Free queue retention **24 hours** vs raw-object study retention **168 hours**; queue-only cannot independently guarantee 168-hour durability without prompt downstream Replit commit. If original UNLOGGED session disappears during queue backlog, the actual persistence function fails closed, so backlog cannot safely be counted as scientific success.

## Non-Quinn remainder: staged **go/no-go gates** for future YSSY P2G25 proposal

1. **Exact actual published prepaid-handler-equivalent signed synthetic HTTP test** with several nonempty operator-coded source items, measured real V3.9 identity-v2 path and real isolated SQL/storage. Current three-item test only proves unknown codeshare quarantine and item-row SQL.
2. **End-to-end latency budget** using the actual published-equivalent receiver, *real* dedicated Replit app object-storage in a nonprovider sandbox (permission required) and cold Replit startup, representative webhook sizes 1.8/5.8/21.7 KB and burst concurrency. Measure response P50/P95/P99/max and compare to provider timeout; **do not mark green based on GET / or fake storage**.
3. **Queue/free-tier backup**: complete signed source receipt → durable Queue admission within upstream timeout → Replit later verifies original time/bytes/attempt → 168h object retention; at-least-once duplicates do not increase logical provider spend; test with real free tier only after account/billing/quota review and explicit user action. No R2 activation.
4. **Prospective PostgreSQL crash recovery scientific feasibility**: independently preserved signed control plane (session/owner, exact provider subscription, source-time, exact attempt/billable SEND identity, physical-v2 chain), immutable raw receipt evidence, original 120m observation window and age/deadline. No post-hoc invented source time, no fake full observation, no auto-resume until formal equivalence shown. Do not move sensitive raw provider payload into LOGGED PITR tables.
5. **Original external/internal credit gap 260/259**: keep invalid evidence preserved, trace sender delivery attempts only from authorized future provider/platform logs; no guessing. Strict reconciliation remains `MATCH` and full delivery completeness.
6. **Human scientific authorization:** Oct7 one-retry freeze already consumed, P2G23/P2G24 failed; a new bound, independently reviewed prospective YSSY Stage1 authorization, source hashes, budget cap 450+50/max500, provider snapshot, zero active other subscriptions, exact weekday UTC/Sydney time-class and explicit GO are required before any paid new attempt.

**No-go remains the scientifically correct state until gates pass.** A 120-minute probe can fail despite all endpoint checks if it loses a billable notification. The goal is making that failure less likely and detectable without making the study falsely pass.

Related: [stage1 runbook](2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md), [real PostgreSQL crash gate](2026-10-10_ACTUAL_POSTGRES_INTEGRATION_UNLOGGED_CRASH_RECOVERY_GATE.md), [zero-cost backup feasibility](2026-10-10_CLOUDFLARE_ZERO_CHARGE_FREE_QUEUE_ONLY_PHASE2G_FEASIBILITY.md).

## Final fixed and retested draft HEAD after observing both failure modes

[GitHub Actions #38046121842](https://github.com/HKcode22/ReplitTranvr/actions/runs/38046121842) completed **SUCCESS** after the experimental timeout was disabled by default: **89/89** offline Vitest, **15/15** actual disposable PostgreSQL integration, 18 callback health checks, server typecheck and actual PostgreSQL SIGKILL UNLOGGED check.

- Short-acquisition adversarial burst: observed HTTP 503 for some of 18 synthetic sends under 3-second acquisition and 600ms fake external object I/O; *only 200-acknowledged requests* reached the internal ledger. A short wait limit reduces hang duration but does not guarantee source delivery.
- Long-acquisition adversarial burst: all 18 eventually committed, synthetic wall-clock completion **11,015ms** in the final run (previous green run **10,958ms**), beyond the evaluated ~10-second sender response deadline; at-most-once internal DB delivery does not prove a remote sender saw 200.
- The drafted `V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED=1` requires explicit opt-in alongside `V39_CALLBACK_ONLY_RUNTIME=1`. **Default remains original unlimited pool acquisition wait** even if draft code were deployed. DO NOT set approval flag before durable front-door + scientific contract review. Neither default nor opt-in eliminates this architecture-level tradeoff.

Real YSSY P2G24 data do not prove an 18-webhook simultaneous burst or 600ms per blob upload; these are controlled worst-case probes. Preventive priority is an **ACK-after-durable ingress outside Replit** and bounded independent replay, with verified original arrival-time evidence, not arbitrary timeout changes.
