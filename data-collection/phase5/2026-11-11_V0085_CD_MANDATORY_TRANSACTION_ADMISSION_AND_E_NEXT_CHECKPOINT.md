# Phase 5 November 11 — C+D mandatory SQL admission experiment (V0085)

**Base source-of-truth:** `main` merge `a92b1b8d81f36c85074893deb6fe1f46cecf37f9`, PR #567. This is the **next disposable-only engineering slice**, not a live installation or authorization to start Phase6. See [verified owner catalog and C+D first transactional fence](2026-11-11_REAL_CATALOG_CD_IN_TRANSACTION_FENCE_CHECKPOINT.md) and [ONE canonical Amendment E](2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md).

## Why V0085 exists

The V0084 real-PG test proved that when Stage14 *voluntarily calls* the correct SQL row lock, an older queue owner cannot race a controller updating the same task. But the original restricted Stage14 database role also holds `INSERT` on `clean.flight_snapshots`. A different code path invoking a raw PRE INSERT could bypass the **application-level optional fence**. Making the queue a reliable **database-level** rule requires an INSERT trigger, not just convention.

The real Replit catalog on 2026-11-11T20:48:27.251Z showed 17 selected `clean` tables, no confirmed flight-task queue, and snapshot uniqueness only on `(flight_instance_id,horizon,prediction_cutoff_utc)`. The release metadata table is not a queue. This does **not** prove all other database schemas contain none. No second live queue or schema migration is authorized.

## New implementation on a distinct PR branch (NO live provider)

- `migrations/staged/V0085__phase5_cd_disposable_mandatory_pre_admission_receipt_v39.sql` installs **only in disposable local PostgreSQL16 after V0084**. It creates one `admission_receipt` per task (unique task and transaction/backend), an owned `begin_admitted_write` function which takes the already-tested V0084 `FOR UPDATE NOWAIT` task row lock, and a **BEFORE INSERT trigger on `clean.flight_snapshots`** that checks the same transaction's admission receipt for the exact canonical flight/horizon/cutoff. The receipt is durable and blocks replay across a later transaction even if a queue task remains temporarily UNKNOWN. A rolled-back SERIALIZABLE transaction rolls back both PRE and receipt.
- `server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts` chooses **one of two fixed function names** only under explicitly safe GitHub CI flags. V0084 baseline continues to call `assert_write_fence`. V0085 CI selects `begin_admitted_write`, still inside the **original Stage14 SERIALIZABLE transaction** before SOURCE and just before COMMIT. Every non-CI call remains unchanged. Neither flag installs or activates a live queue.
- Existing `tests/phase5_cplusd_stage14_intransaction_fence_real_pg_v39.test.ts` reused (no third batch fixture or redundant writer). New opt-in negative tests demand a **real PostgreSQL error** on direct `persistPreSnapshot` INSERT with no admission, and on a cross-flight INSERT after admitting the wrong flight in the very same transaction. Existing no-reclaim lock, stale generation, 32 synthetic source-bound PRE transactions at 1/2/4/8 lanes, canonical flight+horizon duplicate protection, and immutable PRE readback still run.
- `.github/workflows/phase5-cd-mandatory-transaction-receipt-disposable-pg16.yml`: fresh isolated `postgres:16` database, B0062 + STAGED V0079/V0084/V0085, empty AeroDataBox/Alert keys, no production runtime DB. **Do not treat a PR or test definition as a PASS until an exact GitHub Actions head succeeds.**

### PostgreSQL 16 official references

- [Writing SECURITY DEFINER functions safely](https://www.postgresql.org/docs/16/sql-createfunction.html): secure `search_path`, revoke PUBLIC EXECUTE before granting to specifically reviewed roles, distinguish function-owner authority from invoking role.
- [CREATE TRIGGER](https://www.postgresql.org/docs/16/sql-createtrigger.html): BEFORE-row INSERT trigger executes before insertion and can refuse the row.
- [Trigger behavior](https://www.postgresql.org/docs/16/trigger-definition.html): trigger runs in same transaction and a failure rolls back the triggering statement.
- [Explicit locking](https://www.postgresql.org/docs/16/explicit-locking.html): FOR UPDATE holds row lock through writer transaction, preventing concurrent reclaim.
- [Transaction serialization failures](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html): only confirmed SQLSTATE 40001 aborted complete transactions can undergo bounded retry. A lost COMMIT acknowledgment remains UNKNOWN and must be reconciled, not blindly retried.

## The precise claims this CI can and cannot prove

**If tests pass:** Given the CI-only `postgres`-owned trigger, an unprivileged INSERT by the specified restricted PRE role without a same-transaction witness is refused. A witness for flight A cannot be used to INSERT flight B. A confirmed one-flight/one-horizon Stage14 SQL write succeeds, and the task row lock prevents concurrent lease reallocation until COMMIT/ROLLBACK.

**Still NOT proved:** production owner/actor authenticity, a safe NOLOGIN function owner and RLS grants, prevention of privileged DB-owner/schema owners disabling a trigger, trigger interactions with historical PRE writers across different applications, an installed live queue, a continuously running GitHub controller/watchdog/STOP, final legal provider retention and model feature correctness. The `session_user` gate in V0085 is hard-coded to the disposable CI actor, intentionally unusable as a production role policy. Source-rights hashes and user-set packet fields are not external identity/authentication. This test does not guarantee physical gate-out labels, 31-day scientific feasibility, real AeroDataBox quota after 2026-11-11 13:34:38Z, or Phase6 paid GO.

## Amendment E and AIRBORNE boundaries remain unchanged

T−6h continuous physical departure delay minutes remains a **candidate** first primary, with T−90m paired secondary and T−24h baseline; actual gate-out versus ADSB.lol wheels-off proxies must remain separate. Continue using existing free ADSB.lol research/code with its best-effort and ODbL restrictions; no new paid airborne provider. `phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts` has T−6h/T−90m as-of policy but **Stage14 still writes `features:[]`**. The next slice will bind real licensed FIDS/weather/history source rows into Stage14 without time leakage and with explicit missingness/coverage.

## Next production-readiness engineering after V0085

1. Independent broad **read-only catalog** across user-accessible schemas to confirm no queue elsewhere and inspect actual permissions/indices without reading personal or raw flight payloads.
2. Inventory all writers of `clean.flight_snapshots` and direct table grants, and propose a separately reviewed **scoped production trigger** that does not retroactively break prior phases/other users.
3. Replace disposable `postgres` SECURITY DEFINER with a dedicated reviewed **NOLOGIN least-privilege owner** and exact role grants; investigate schema owners and replication bypass, plus certificate/test against tamper and retries.
4. Prototype a GitHub-only rolling SOURCE/PRE/POST controller and watchdog with durable receipt/lease recovery and STOP paths; no human overnight and no unreviewed paid GET.
5. Connect Amendment E features and label-tier outcome manifests, then freeze future calendar/primary score/rights and conduct independent paid GO review.

**Operational state:** Phase5 scientific FREEZE HOLD; Phase6 paid GO NO. Everything here is a nonpaid CI engineering experiment.
