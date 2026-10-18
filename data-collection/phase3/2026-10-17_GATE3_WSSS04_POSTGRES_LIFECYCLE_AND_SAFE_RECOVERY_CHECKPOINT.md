# 2026-10-17 PDT — Gate 3 WSSS04 post-recovery PostgreSQL lifecycle evidence and prevention checkpoint

**Canonical project:** HKcode22/ReplitTranvr · Phase 3 / Gate 3 · WSSS, October 17 2026 PDT / October 18 UTC.  
**Last reviewed merged release:** `4c5f1121ff7a2d2de39829ebaddb565ee03f71b5` (merged PR #66).  
**Scope:** production-read-only forensic interpretation and next-session continuity. No change to scientific results, paid provider, migration, privacy/custody boundary or failed-owner records. This documentation alone neither starts a canary nor authorizes future exposure.

## 1. Verified WSSS04 release, failed preparation and recovery

- Approved `AUTH-20261018-G3WSSS04`, exact window `WSSS/departures/2026-10-18T05:00:00Z+600s`, 50 Alert-credit **soft** stopping target, at most one provider CREATE, no automatic retry. Exact authorization JSON SHA-256 `61c5516ad60fe85865f7ed67acc0a779f118042bdeb0077f75bf8957d19fa485`. Owner-approved start 22:00 PDT; source Stage A 21:52–21:57 PDT. It is **expired** and may not be reused.
- Released PR #65 merged `aa8f1d83d3addcdee3b80e64d541444346788c47`; 4/4 CI PASS, with original aggregate preflight second invocation failure and a successful **same-commit no-provider** retry. Published source and registered prepaid route exact-public-SHA parity PASS. No conclusion of a paid outcome.
- A first source `PREPARED` reservation was durably committed **2026-10-18T04:52:19.869Z**: UUID `2eac3fed-2648-44e6-b9b7-79e45ff3b149`, expiry `05:27:19.869Z`. The first console `PREPARED_NO_CREATE` receipt was *not observed by the assistant* and cannot be fabricated. A later overlapping Stage A invocation emitted `GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD`, `providerCreateConfirmed:false`, `anotherRunAuthorized:false`.
- Production READ ONLY before recovery: exact durable WSSS04 row `PREPARED`, its UNLOGGED `clean.prepaid_probe_session_runtime` row **absent**, no provider sub bound; exact current strict provider inventory `credits_remaining=2056`, `active_billable_subscriptions=0`. Older WSSS01 and WSSS02 were already immutable `FAILED/OPERATOR_ABORTED`; WSSS03 was HOLD/NO-RUN.
- A still-running *first* WSSS04 operator was independently visible: Node PID 2845 with parent wrapper PID 2639. SIGTERM requested stop but did not terminate interactive read; owner later identity-verified SIGKILLed **only** PID 2845; subsequent `ps` found no Gate3 paid operator. No new provider CREATE was issued by the recovery.
- Guarded PR #66 merged `4c5f1121ff7a2d2de39829ebaddb565ee03f71b5`; 4/4 exact-head CI PASS, unchanged production provider. User synchronized clean source and Replit republished existing deployment ID `ce096a13-62ff-4f7a-ae6f-3bc91af601d9`; source-public parity PASS.
- Owner ran `scripts/v39_gate3_abort_unpaid_prepared_wsss04_v39.ts` with exact confirmation and reviewed SHA. **Real production terminal receipt**: `WSSS04_PREPARED_TERMINAL_ABORT_CONFIRMED`, `FAILED / OPERATOR_ABORTED`, evidence SHA-256 `166e5a8a3f14afc85132aa498b696505a21e2dfea016c32d296c4a871f9266ca`, `provider_create_by_this_script=0`, `provider_delete_by_this_script=0`, `account_reads_only=true`, `authorizes_another_run=false`. This is an atomic LOGGED owner failure and readback, **NOT** paid experiment success, independent proof of no historical provider operations by every actor, or permission to try again without a new AUTH.

## 2. New production PostgreSQL lifecycle diagnostic — exact output

User ran one SELECT on the live production runtime connection; returned:
```json
{
  "database_time_utc": "2026-10-18T05:18:22.296Z",
  "postgres_started_at_utc": "2026-10-18T05:18:21.696Z",
  "in_recovery": false,
  "runtime_table_persistence": "u",
  "remaining_prepared_owners": 0,
  "current_runtime_rows": 0
}
```

**Observed:** PostgreSQL server reported a startup only 600 ms before that diagnostic. Code `u` denotes an **UNLOGGED** relation. All Gate3 owner reservations are terminal by the time of this query; zero current UNLOGGED sessions expected in this aftermath. `pg_is_in_recovery()=false` is a point-in-time status, **not** proof of how/why a past restart occurred.

**Important chronology:** WSSS04 `runtime_exists=false` was already observed around 04:54–04:56Z; the **05:18:21Z restart is too late to have caused that earlier observed disappearance**. It documents the database restarting (or starting after an inactive period) unusually close to a live query. It *raises* suspicion of database lifecycle turnover/cold startup but does not establish provider, shutdown cleanliness, the WSSS04 first-loss timestamp or a causal restart in that earlier interval.

**PostgreSQL official contract:** `CREATE UNLOGGED TABLE` data are not written to WAL; an unlogged table is automatically truncated after **crash or unclean shutdown**, not guaranteed on every clean restart. Cite: https://www.postgresql.org/docs/16/sql-createtable.html . `pg_postmaster_start_time()` returns the server start timestamp; see https://www.postgresql.org/docs/16/functions-info.html . Without DB provider history/crash/failover logs around 04:52–04:57Z, classify root cause as **UNCONFIRMED**.

## 3. Pre-existing literature and important custody restriction

Repository historical amendment `data-collection/phase2g/amendments/2026-09-30_UNLOGGED_RUNTIME_RESET_INTEGRITY_HARDENING.md` documents a recurring situation: WSSS-v2 and OMAA-v2 transient session/delivery/item rows disappeared *after* their successful full-duration scientific runs despite still-present immutable retained callback blobs. That amendment found normal purpose cleanup, expiry and boot migrations insufficient to explain the ordering, and treated an unclean PG lifecycle reset as a plausible, **not proven**, cause. Its independent watchdog and terminal metrics guards fail closed on runtime loss/regression; postmaster start changes are diagnostic, not standalone failure. WSSS04 is an earlier pre-paid/pre-arm manifestation, not grounds to rewrite earlier qualified science.

**Do not convert `clean.prepaid_probe_session_runtime`, `clean.prepaid_probe_delivery_runtime`, or `clean.prepaid_probe_item_runtime` wholesale to LOGGED without separately evaluating/approving provider-content-safe retention and WAL/PITR terms**: the existing architecture intentionally excludes ephemeral provider-derived flight identity from WAL and replication. Merely switching persistence invalidates that custody assumption.

Historical report `data-collection/phase2g/reports/2026-09-28_REPLIT_WATCH_RESTART_BOOT_MIGRATION_SIDE_EFFECT.md` confirms source synchronization can restart the watch-managed *application child* and apply boot migrations; **that alone does not establish a PostgreSQL postmaster restart**. Replit app republish and PostgreSQL server lifecycle are separate.

## 4. High-priority prospective hardening (not yet authorized for paid use)

1. **Observe database lifecycle before any new live attempt.** Obtain actual PostgreSQL provider lifecycle/failover/shutdown logs encompassing **04:52–04:57Z** on 18 October, and identify whether the runtime DB sleeps/restarts during inactive intervals. Use read-only start-time and persistent-table evidence; don't print the database connection URL, credentials or provider callback payloads. A 05:18Z start-time alone cannot assign blame.
2. **Stop accidental duplicate operator launches.** Add an atomic, owner-specific single-process admission with a human-visible single active-shell lease and no automatic duplicate dispatch. Keep the existing database serialized durable-owner admission and provider exact-zero-active checks; a local process lock alone is not sufficient for cross-worker safety. Test concurrent same/different shells with no-provider fixtures and process cancellation while waiting for the independent bot lease.
3. **Guard the start-time-to-paid gap.** Record initial postmaster-start timestamp in process memory during Stage A, verify expected UNLOGGED source and stable timestamp again before independent watchdog ARM and immediately before paid CREATE. Treat mismatch as HOLD/recovery; this reduces exposure after a known reset but cannot prevent a future crash or imply historical payload recovery. Preserve the existing exact 600 s scientific window and soft50 policy.
4. **Evaluate stable database service/lifecycle configuration.** Consider stable/always-on DB during experiments or an independently reviewed provider-compliant durable checkpoint design; retain raw/provider source custody rules, privacy constraints and existing independent blob spool. No assumption that Replit Node publish or a new vendor is a cure.
5. **Prospectively prove source custody under a controlled no-provider test.** In a *disposable* PostgreSQL environment, simulate UNLOGGED reset plus durable owner survival and repeated CLI execution, assert one PREPARED and no second paid CREATE, genuine hold with auditable recovery, no fabricated success. In production run only read-only baseline after reviewed source/deployment and explicit approval.
6. **Next paid WSSS attempt** requires separately owner-approved exact later clock time, a **new immutable AUTH05** and hash/approval addendum, a new distinct source UUID within 3–8 min Stage A, one genuine GitHub Actions-bot independently authenticated ARMED lease, verified public SHA, strict provider/account floor, and exact one-CREATE 15-sec start boundary. Original AUTH04 is expired. No silent schedule extension or automatic retry.

## 5. Exact next-session starting point

- Reviewed `main=4c5f1121ff7a2d2de39829ebaddb565ee03f71b5`; Replit workspace `release/gate3-wsss04-recovery-20261017` with exact source-tree parity; published URL `https://replit-tranvr--hk84164.replit.app` verified by owner after publication. Verify these again before a future execution.
- Historical WSSS04 owner terminal evidence hash `166e5a8a3f14afc85132aa498b696505a21e2dfea016c32d296c4a871f9266ca`, not to be overwritten. No WSSS04 paid success; no active Gate3 operator observed after shutdown.
- First next task: collect no-mutation database provider/lifecycle metadata and identify read-only root-cause evidence for UNLOGGED turnover; then narrowly fix concurrency and strengthen pre-paid lifecycle checks offline. **DO NOT** create new prepaid reservations until that reviewed work is complete and owner supplies a fresh exact time authorization.
- Document was added under `data-collection/phase3/` rather than an unlinked duplicate docs/history area to preserve Phase 3 organization. This is a factual diagnostic checkpoint, not implementation approval.
