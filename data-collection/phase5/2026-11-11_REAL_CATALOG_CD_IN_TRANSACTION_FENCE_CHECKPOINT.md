# November 11 Phase 5 — REAL project catalog, C+D transaction fencing prototype

**Status:** Dated continuation of [Phase 5's 60K account + real Stage14 benchmark](2026-11-11_LIVE_60K_QUOTA_CD_STAGE14_SQL_AND_AMENDMENT_E_ASOF_CHECKPOINT.md). Repository `main` at `7ed3841ca6b53acf8effc3dbaf9bccef7f39251b` was the engineering base. All changes in this branch are **disposable PostgreSQL 16 CI only**; no actual team Neon schema migration, provider purchase, paid FIDS/Alert/webhook work, reactivation of old experiments, runtime credentials or Phase 6 start. **Phase5 FREEZE HOLD; Phase6 PAID GO NO**.

## 1. November 11 20:48 UTC owner's REAL read-only catalog evidence

Owner executed `scripts/v39_phase5_cd_queue_catalog_owner_readonly_once.mjs` through the team Replit `DATABASE_URL`. Observed at `2026-11-11T20:48:27.251Z`, PostgreSQL major version **16**, read-only transaction, provider GET **0**, database writes **0**.

Within the scan's *limited scope* (`clean` schema's `phase5_%`, `flight_snapshots`, `fids_query_response`, `flight_population`), **17 tables inspected**. The only name-based “possible task table” was `phase5_fids_seven_rest_release_v39`, whose six columns are **release approvals and review hashes**, NOT task owner/status/flight identity/generation/lease and not a queue. The detector matches `lease` in `release` as a false positive. **No reusable C+D flight-task queue was confirmed within this filtered catalog**; this does *not* certify the absence of all tables in other schemas, or deny earlier Phase1–5 source/backup/flight data.

Actual `clean.flight_snapshots` uniqueness evidence:

- `flight_snapshots_pkey` — primary key on `id`.
- `flight_snapshots_uniq` — unique on `(flight_instance_id, horizon, prediction_cutoff_utc)`.

This unique index **does not logically rule out** a second row with the same flight+horizon but a *changed native T and therefore changed cutoff*. Existing Stage14 application advisory locks and selected-T source checks remain useful but cannot be interpreted as a global canonical flight×horizon unique constraint. The separate C+D queue must enforce **UNIQUE(flight_instance_id,horizon)** and immutable native T/cutoff for admitted work.

Current account evidence remains the previously observed **60,000 monthly API units; 59,968 remaining; 1,830 Alert credits, reset 2026-12-04T02:21:21Z** as of 13:34:38Z. No new quota call was performed during the catalog check. The project's separate budget ceiling is 50K/cycle. No paid-airborne provider is proposed: reuse existing free ADSB.lol research/terms.

## 2. Engineering decision — minimal queue only after this observed reuse check

We require persistent “flight × PRE horizon” state and a fencing token so worker crash/restart or GitHub Actions handoff cannot allow two owners to commit incompatible PRE rows. A queue claim can be `READY` then `CLAIMED` then `WRITE_STARTED_UNKNOWN` then `VERIFIED`; an ambiguous writer commit remains **UNKNOWN** pending independent read-only reconciliation, never blindly retried.

Crucial discovery: [PostgreSQL 16 explicit row-lock documentation](https://www.postgresql.org/docs/16/explicit-locking.html) says `SELECT ... FOR UPDATE` prevents concurrent updates to a locked row until the transaction terminates. [PostgreSQL 16 privileges](https://www.postgresql.org/docs/16/ddl-priv.html) require UPDATE privilege for `SELECT ... FOR UPDATE/FOR SHARE` on the table. Giving our restricted PRE writer direct task-table UPDATE would create too much authority. A narrowly reviewed **SECURITY DEFINER function** with exact role EXECUTE privileges can instead lock and check an *owned* task inside the same original Stage14 SERIALIZABLE transaction. It must have secure search_path and a minimal, non-login owner on a future actual production deployment; the disposable CI version's `postgres` owner is NOT a production model.

## 3. What new actual code does

- `migrations/staged/V0084__phase5_cd_disposable_stage14_transaction_fence_v39.sql`: **isolated CI-only** `p5_cd_stage14_ci.task` with exact flight×horizon uniqueness, original selected native T/cutoff, packet digest, state, lease owner/generation/expiry and due-index. A SQL `assert_write_fence` SECURITY DEFINER function checks all supplied attributes under `FOR UPDATE NOWAIT`, using real PostgreSQL clock and a ≥2-second lease/cutoff margin. Schema has no publicly granted query/EXECUTE privilege. **Never install into production.**
- `server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts`: an optional, **GitHub Actions + exact local neondb + no provider + explicit experimental flag gated** `disposableCdQueueFence` input. The *existing* true Stage14 writer—not a second writer—calls the row-lock function inside its original transaction after advisory locking, before source/flight reads and again immediately before COMMIT. Runtime without that exact CI flag cannot activate the opt-in; this does NOT yet force all real production writes to use a queue.
- `server/lib/disruption/phase5CPlusDStage14ConfirmedAbortRetry_v39.ts`: forwards the reviewed task ID, owner, generation and packet hash to Stage14 on every confirmed-aborted 40001 full-transaction attempt. Unknown commit, no acknowledged rollback, old owner and late cutoffs still quarantine.
- `tests/phase5_cplusd_stage14_intransaction_fence_real_pg_v39.test.ts`: disposable same-schema test using the original Stage14 with 32 synthetic flights under bounded 1/2/4/8 lanes; checks stale generation refusal, controller `UPDATE` blocked while the row is held, least-privilege restricted writer (EXECUTE on guard but no direct SELECT/UPDATE on queue), canonical changed-native-T duplicate prevention and original immutable PRE no-backfill.
- `.github/workflows/phase5-cd-stage14-transaction-fence-disposable-pg16.yml`: PR-only local PG16, B0062+STAGED V0079+STAGED V0084; empty AeroDataBox/Alert secrets and no Phase6 process arm. No public SOURCE artifacts or paid provider.

**Every result needs exact-head CI confirmation.** A proposed role/SQL statement, preliminary code review or test definition does NOT establish a successful real-PG experiment.

### Why Stage14 needs the row lock inside its own transaction

1. A job atomically claims a *distinct* eligible flight/horizon, records owner and monotonically increasing generation.
2. The worker marks `WRITE_STARTED_UNKNOWN` before calling the original Stage14. A crash cannot silently reset it to READY.
3. Stage14 opens its SERIALIZABLE SQL transaction, takes the task row lock and verifies **same flight, horizon, original T/cutoff, reviewed packet, current owner/generation, unexpired lease** before any PRE INSERT.
4. While that transaction remains open, a reaper cannot update/reassign the same row; it must wait. An already reclaimed task's older generation fails immediately instead.
5. Stage14 rechecks lease just before COMMIT and performs the unchanged snapshot readback after COMMIT. Only exact confirmed proof can mark queue VERIFIED.
6. PostgreSQL's 40001 serializable aborts are eligible for a *bounded complete-transaction* retry only with acknowledged server error/rollback, canonical PRE read-only reconciliation and current owner. **No proof** of timeout/network ambiguity means HOLD, not retry.

## 4. Remaining requirements before a REAL production queue release

1. **Independent review** of the above CI results, role creation, function ownership, immutable keys, cross-schema RLS grants and the exact migration plan. Do not copy a CI function owned by `postgres` into production.
2. Make queue fencing **mandatory** in production rather than opt-in: no unqueued Stage14 entrypoint/trigger bypass, no separate unfenced runner, and no direct runtime UPDATE rights. A prospective production migration must be separately pinned and commissioned under exact roles.
3. Durable external task identity / private policy packets, no raw SOURCE leakage to public GitHub, confirmed rights/TTL, 31-day legal retention and physical gate-out/wheels-off label quality must be reviewed.
4. Broader representative performance and failure testing (50/100/250+ tasks, p95/p99, lease expiration, cancellation, 40001, unknown COMMIT, job crash/restore, pool saturation, source starvation and cutoff missedness), then select *measured* concurrency instead of assuming 8 lanes.
5. Autonomous short GitHub controllers/sidecar watchdog, POST/Alert subscription STOP and budget-day reconciliation; connect real as-of Amendment E FIDS/weather/route/historical features to Stage14's currently empty `features:[]` and agree single first-cycle endpoint. AIRBORNE ETA remains separate and free ADSB.lol conditional on rights and coverage.

The user specifically wants speed without repeating phases or perfection loops. The phased approach here prevents rewriting the validated writer or buying another service, while retaining explicit evidence needed for a scientifically usable Phase6 pilot.
