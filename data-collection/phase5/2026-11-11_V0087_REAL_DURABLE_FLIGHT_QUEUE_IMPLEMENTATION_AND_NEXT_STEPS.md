# Phase 5 — V0087 actual durable C+D per-flight queue creation

**2026-11-11, continuation after merged PR #570.** This is a **real additive SQL migration file and working state machine**, not another architecture idea or duplicate Stage14 writer. The owner correctly clarified: *reuse what already exists, create the pieces that genuinely do not exist*. We confirmed at `2026-11-11T21:47:55.403Z` the real Replit `neondb` has 141 tables in six discoverable user schemas, but no reusable per-flight/horizon task queue. The earlier `phase4_g5_fids_physical_owner_v39` is a manifest/horizon supervisor record; it cannot safely replace per-leg queue ownership.

## What V0087 actually creates

[SQL migration](../../migrations/staged/V0087__phase5_cd_durable_per_flight_horizon_queue_v39.sql) creates `clean.phase5_cd_pre_task_v39`, one immutable canonical **flight × horizon** key covering T−24h/T−6h/T−90m, with original native scheduled T, exact prospective cutoff, source population and response hashes, reviewed source rights, manifest, packet hash, expiry, state, lease owner, monotonically increasing generation and audit clocks. **No real flight-data payload is copied into the queue.** The database rejects a second native-T version of the same flight/horizon even when its cutoff differs.

A single minimal state machine, not another provider/POST pipeline:

```text
READY ── due claim (SKIP LOCKED) ──> CLAIMED ── mark before Stage14 ──> WRITE_STARTED_UNKNOWN
  │                                     │                                   ├── signed Stage14 post-COMMIT readback ──> VERIFIED_ON_TIME
  │                                     │                                   └── lease expired/uncertain COMMIT ──> QUARANTINED
  └── missed cutoff/source expiry ──> MISSED
                                        └── expired before write ──> READY (new generation, old owner fenced)
```

New PostgreSQL stored routines, all `SECURITY DEFINER`, locked to `pg_catalog,pg_temp` search path and **PUBLIC EXECUTE revoked in the same atomic DDL transaction**:

- `clean.phase5_cd_claim_due_v39(owner,max,lease_seconds)` — atomic bounded `FOR UPDATE SKIP LOCKED` due task claims, original Stage14 180-second cutoff eligibility, DB time, max 16 tasks/claim and max 120s lease.
- `clean.phase5_cd_mark_write_started_v39(task_id,owner,generation)` — exact lease generation/state and DB-clock check; irrevocably moves to UNKNOWN before calling the original Stage14 writer.
- `clean.phase5_cd_ack_verified_v39(task_id,owner,generation,snapshot_id,receipt_sha256)` — checks a genuine already-persisted `clean.flight_snapshots` row, same flight/horizon, native T/cutoff, original population query, response hash, cutoff-safe creation, no other flight/horizon snapshot, and an externally issued reviewed after-COMMIT receipt hash. *A digest is not authentication by itself.* The Stage14 original same-transaction commit/cutoff evidence remains authoritative; a readback can legitimately happen **after** cutoff.
- `clean.phase5_cd_reap_once_v39(max)` — requeues only expired claims that **never began writing**; if the write entered UNKNOWN, quarantines and requires independent read-only reconciliation (no blind replay). Expired sources/cutoffs record MISSED.

An immutable BEFORE UPDATE/DELETE trigger protects original source/T and prevents invalid state transitions or deletion. A BEFORE INSERT check reuses Stage14's exact advisory lock and refuses to register an identity that already has a PRE snapshot. No table or function is granted to the runtime or ordinary app role by the schema migration. This is a **real schema creation candidate**, not a paid or worker commissioning event.

## Reuse: earlier Phases 1–5 remain authoritative

- Stage14 real source-bound one-flight PRE SQL writer and its verified serializable-40001 rollback/retry proof are **not replaced**.
- Existing V0079 original binding, population and physical attempts, Phase5 seven-category budgets/rights, weather and historical as-of, and free ADSB.lol research remain **unchanged**. C+D is a dispatch **control plane**, not another provider.
- CI-only V0084/V0085/V0086 proved row locking, no-bypass receipts and compatibility with legacy writers, but their `p5_cd_stage14_ci` schema and privileged test-only trigger **must never be installed in live Neon**. V0087 creates only the minimal real `clean.phase5_cd_pre_task_v39` queue. A production-ready scoped no-bypass admission/role migration must be separately reviewed against actual existing PRE writers, because broad snapshots INSERT/UPDATE grants still exist.
- Single canonical Amendment E remains T−6h conditional departure-delay minutes, T−90m update, T−24h comparator and separate AIRBORNE ETA. Stage14 `features:[]` remains not yet connected to real reviewed FIDS/weather/history.
  
## Commissioning boundary and next concrete work

**CI step:** The PR-only `phase5-v0087-durable-queue-real-pg16.yml` boots the existing clean database in disposable local PostgreSQL16, applies the actual staged migration (not a mock queue), and tests 100 concurrent 8-lane claims, stale owner/generation, no retroactive/shifted-T insertion, write-start uncertainty quarantine, grants and source binding. No provider secrets or production DB. Keep evidence of failed tests and repairs in this checkpoint.

**After exact-head CI passes and PR merges:** The owner may run an independently pinned and read-verified *schema-only* installer in the Replit Shell to create these **inert queue structures** in the actual team database. The installer must verify role/PG16/absence of table, source hash and stop on any error without partial changes. There is no need to wait for a provider reply. This user specifically asked to create a missing queue instead of repeatedly revisiting discovery. **Do not claim a live installation until the owner provides success output.**

**After schema is live:** implement separate least-privilege NOLOGIN queue function owner/worker login grants, Stage14 same-transaction real queue fence, autonomous short-lived GitHub-only rolling controller+watchdog with STOP/POST and durable source/recipient reconciliation. Work can proceed while Amendment E feature-source join is integrated and original physical-label limitations are documented. No human overnight duty.

**Budget/science status:** Account last free-checked 2026-11-11T13:34:38Z: provider 60,000 units, 59,968 remaining, 1,830 Alert credits; independent 50K/cycle project ceiling remains. Creating queue schema alone costs zero provider units. **Phase5 scientific FREEZE HOLD, Phase6 paid activation NO-GO**, until real provenance/rights, automatic worker, label, budget and independent GO evidence are ready.

Official PG16 references: [SKIP LOCKED queue semantics](https://www.postgresql.org/docs/16/sql-select.html), [SECURITY DEFINER and PUBLIC EXECUTE revocation in one transaction](https://www.postgresql.org/docs/16/sql-createfunction.html), [serialization retry](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html).
