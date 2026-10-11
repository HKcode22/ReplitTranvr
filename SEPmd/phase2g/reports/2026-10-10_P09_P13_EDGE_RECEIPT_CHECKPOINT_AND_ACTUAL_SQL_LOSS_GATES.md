# P09–P13: Source receipt, durable scanner checkpoint and actual V3.9 SQL-loss boundary

**2026-10-10 · NO PAID GO · isolated investigation branch only**. No actual AeroDataBox requests/subscription/credits, live Replit publish, Cloudflare provisioning, changes to science PostgreSQL, `main` merge or owner/auth modification. GitHub Actions CI has normal CI quota usage.

## Verified evidence

**[GitHub Actions #38089930398](https://github.com/HKcode22/ReplitTranvr/actions/runs/38089930398) COMPLETED SUCCESS with both jobs** at code commit `d9e4f2aa8baa81593ee5cc6335701e9e1d005a87`:
- **301 / 301 offline Vitest, 30 suites**, including 6+6 vs 6+4 health checks, independently signed **synthetic** attempted-delivery ledgers, actual extracted supervisor 4-stage diagnostic mapper and now more adversarial synthetic Worker R2+Queue receipt/scanner tests.
- **37 / 37 actual V3.9 callback route + disposable real PostgreSQL16 integration** cases, including the new synthetic edge→actual local HTTP V3.9→disposable SQL chain and source-vs-UNLOGGED-loss classification. The existing real isolated PostgreSQL `SIGKILL` check again yielded `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED` and `TWO_STAGE_LOGGED_OWNER_BINDING_AFTER_UNCLEAN_RESTART=1`.
- Exact new P13 integration diagnostic lines: `P13_EDGE_SOURCE_BYTES_SURVIVED_DB_RESET=true`; `P13_PROCESSED_EDGE_MARKER_NOT_SUFFICIENT_FOR_SQL_RECOVERY=true`; `P13_REAL_PROVIDER_SOURCE_VERIFIED=false`; `P13_SCIENTIFIC_RECOVERY_AUTHORIZED=false`.

## Source admission and consumer hardening, isolated only

The R2+Queue `experiments/phase2g_cf_sandbox_ingress/worker.ts` Worker is **explicitly synthetic-only and not deployable for provider traffic**. This commit improves:

1. **Exact processed marker identity validation:** formerly `R2.head(processedKey)` alone caused Queue `ack()` and scanner skip. A forged or stale marker could therefore falsely suppress relay. The consumer now checks that original indexed source bytes are still readable and SHA-correct, that a processed record has the exact receipt key/ID/raw SHA/**first-edge UTC**, the claimed receiver persisted receipt, and a valid processing UTC.
2. **Durable readback before consumer ACK:** even if disposable test receiver returns a 200 + `persisted: true` and correct SHA, a processed marker must itself be written and read back intact. A failed R2 write/readback causes Queue `retry()`, not `ack()`.
3. **Outbox scanner checks real indexed/raw receipt:** rejects malformed receipt, forged processed marker, lost raw object or raw checksum mismatch. Tests explicitly assert that errors are surfaced and no phantom success is returned.
4. **Persisted CAS scanner cursor:** former bounded scan always started at first 300 indexes every invocation, potentially starving new orphaned receipts after 300 historical receipts. A synthetic R2 checkpoint with compare-and-swap `etagMatches` persists the pagination cursor across invocations; one test builds 351 receipts, marks 350 verified processed and demonstrates that scan #1 covers 300 and scan #2 covers the final 51, requeueing the single orphan. Corrupt/uncommitted checkpoints produce errors, not silent promotion. This remains **at-least-once** and requires a production concurrency/retention audit.

None of the above proves the real provider is source-authenticated or the real 168h Cloudflare retention configuration is set. In this fake store R2 is a Map, Queue is an array, and all source IDs and signing keys are synthetic.

## Critical new failure mode reproduced with REAL disposable SQL

The new `P09-P13 synthetic R2 edge -> real V3.9 disposable SQL -> UNLOGGED loss` integration:

- Makes a synthetic YSSY `IsOperator` event with original pretty-printed wire bytes, exact `SHA-256` and first edge receipt UTC in the test-only R2 fake.
- Producer enqueues only after test-only R2 source bytes/index readback. Consumer verifies test-edge HMAC and forwards original bytes into the actual `registerV3Routes` HTTP handler backed by disposable PostgreSQL and its existing mocked blob store.
- SQL captures a physical-v2 operator item and one delivery; the synthetic receiver reports 200. Edge persists a processed marker with source/first UTC.
- Simulates UNLOGGED row loss via `TRUNCATE` of the disposable session/delivery/item tables, while LOGGED blob references and the synthetic edge original bytes/processed marker remain.
- **Replaying the already-processed edge Queue message can still be ACKed without a second POST**, even though the physical-v2 SQL row and delivery have vanished. The test requires those observations to remain absent and prints `P13_SCIENTIFIC_RECOVERY_AUTHORIZED=false`. The separate CI PostgreSQL unclean restart experiment independently confirms UNLOGGED state can actually disappear.

**Verdict:** R2/Queue delivery completion and historical receiver `persisted` ACK are NOT equivalent to current/restored **scientific** database state after crash. A fully valid prospective reconstruction protocol needs a downstream durable scientific event/flight-item journal, monotonic signed DB restart epoch and revalidation/rebuild of every lost original item from immutable preserved wires; it cannot simply trust an old processed marker. Unknown provider attempts/credits still require independent provider-sender reconciliation. No unsupervised replay against real science DB.

## Cloudflare constraints checked against current official documentation

- [Cloudflare Queues Free plan announcement](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/) states **10,000 account-wide Queue operations/day** and **24-hour maximum message retention** on Free. It does not prove that this particular user's Cloudflare usage, existing queues or billing state leave room for a real 120m experiment.
- [Cloudflare R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) documents strongly consistent read-after-write, conditional `put()`, and `null` on failed preconditions. Our fake emulates that behavior, but does not measure any real R2 durability, service availability, operation charges, retention or quota exhaustion. Actual R2 payload retention for **168h** is still unconfigured/unverified.

## Remaining hard gates by priority

| Gate | Advanced in this work | Still required before paid GO |
|---|---|---|
| P09 original upstream admission | synthetic source SHA+R2 readback+Queue-before-2xx, receipt conflict | real provider authentication, fail-closed original full-wire source capture at independent hosted ingress, published authentic callback route |
| P10 cost and retention | verified official 24h Queue free-tier vs 168h study evidence gap | actual account-wide usage/headroom, full payload quotas/worst-case delivery burst, zero-additional-cost and 168h R2/raw storage plan |
| P11 source UTC | original synthetic first-edge UTC/sha retained through duplicate | real immutable signed UTC, key rotation/replay boundaries and published V3.9 consumer integration |
| P12 Queue replay/repair | validated exact processed marker, checkpoint scans across 351 objects, forged/expired store negative tests | real Queue/R2/scanner deployment, delay and 10s source ACK tail latency under scale-to-zero, bounded DLQ, queue age monitor, restart/race/cost budget |
| P13 crash reconstruction | actual source→V3.9→SQL loss counterexample, safe failure classification | durable scientific item/attempt/owner event journal or independently provable reconstruction after an actual hosted database crash, 120m/8-bin/physical-v2/credit parity |

**P14–P20 also remain open** in their real-world release conditions; in particular 6 primary + 6 conditional backup checks is only a test-selected candidate. The live GitHub paid supervisor remains **3 consecutive checks at nominal 15-second cadence**, provider delivery retries **0**, and `main` and Replit deployment remain unchanged.

## Recommended next isolated development

1. Design **downstream reconstruction journal and read-only validation** keyed by signed receipt ID, exact source-wire/canonical SHA, original first-edge UTC, physical-v2 item identity, owner freeze and POST-commit database epoch; verify exact per-item and sender attempt completeness across an isolated UNLOGGED reset. Require a real durable recovery protocol before considering modification of an already processed R2 marker.
2. Add end-to-end scanner collision, cursor CAS race and paging fault tests in a true Worker-compatible local runtime with restart and 300+ receipts. Current mock CAS models expected semantics only.
3. Add **actual published-equivalent** cold POST and **120-minute wall-clock no-provider** R0/R1–R11 rehearsal on separately authorized zero-incremental-cost staging after verified provider-free isolation and account billing capacity. **Do not use the live scientific receiver** for trial POSTs.
4. Resolve Replit support #564568, previously missing original lifecycle explanation, exact published/owner binary digests, YSSY bounded scientific retry amendment and fresh AUTH/provider balance/subscription isolation.

**GO/NO-GO:** paid YSSY Sunday Oct 11 8 PM PDT **NO-GO at this evidence checkpoint**. Successful isolated tests demonstrate better fault detection, not safe production reconstruction or an approved paid launch.
