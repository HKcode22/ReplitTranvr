# Phase 5 Stage 15 — native PostgreSQL T−24h durable COMMIT witness

**Status:** staged **read-only independent evidence check**, not a live owner, a production install, a new PRE write, physical-flight certification or Phase 5 FREEZE. All source/provider/legal rights requirements remain independent; the function never issues a paid API call, creates Alerts, updates the DB or authorizes a later horizon.

Source: [PostgreSQL 16 documentation — committed transaction information](https://www.postgresql.org/docs/16/functions-info.html#FUNCTIONS-PG-XACT-COMMIT-TIMESTAMP). PostgreSQL provides `pg_xact_commit_timestamp(xid)` **only if** `track_commit_timestamp` was enabled when that transaction committed; those records can later be vacuum-pruned. Neither `created_at=now()` (transaction start) nor an application-supplied audit timestamp proves actual COMMIT. Do not claim Neon or the live Replit database has this option: its current setting has not been independently read, and a connected Neon project is not exposed.

## Objective

The newly merged Stage 14 writer [PR #444](https://github.com/HKcode22/ReplitTranvr/pull/444) produces a T−24h snapshot only after exact source/flight identity, database-clock cutoff, COMMIT and after-COMMIT readback. It **intentionally refuses T−6h and T−90m** until the original T24 actually committed before its cutoff, rather than trusting PostgreSQL's transaction-start `flight_snapshots.created_at`.

Stage 15 adds a **native database XID commit-timestamp verifier** independent of the caller's claimed timestamp. It performs `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` as an exact SELECT-only `phase5_fids_pre_auditor_...` role, verifies actual PostgreSQL `track_commit_timestamp=on` and loads at most two T24 rows for the exact canonical flight instance. More than one candidate, a retimed/changed T, a different source query UUID/response hash, unexpected frame or config, absent retained commit metadata, a commit after the cutoff, or a commit earlier than the reviewed last-three-minutes window all produce **HOLD**.

It checks `flight_snapshots.xmin` (the row-version transaction ID) using **`pg_xact_commit_timestamp(xmin)`**, and requires:

```
selected_t_native_utc - frozen_t24_cutoff_utc = 24 hours
frozen_t24_cutoff_utc - 3 minutes <= actual_pg_commit_at_utc
actual_pg_commit_at_utc < frozen_t24_cutoff_utc
actual_pg_commit_at_utc <= real_pg_readback_clock_utc
```

An UPDATE after the cutoff changes the visible row's transaction ID; the verifier conservatively rejects it. A transaction timestamp that was disabled, unavailable, pruned by vacuum, or not readable in the restricted role is **UNKNOWN/HOLD**, never inferred from `created_at`. No production role privileges or database settings are modified by this code.

## Disposable real PostgreSQL16 science regression

The GitHub workflow starts a fresh **local-only disposable PostgreSQL16 Docker container** with `track_commit_timestamp=on`, applies the authentic B0062 schema, installs a SELECT-only reader role, and verifies a genuine native transaction commit for a synthetic first T24 row. A negative test deliberately inserts a second synthetic T24 row **after its cutoff while backdating `created_at` before the cutoff**, showing the unsafe historical shortcut would pass while native COMMIT proof correctly refuses. It also rejects schedule retime/second T24 row, admin role and a simulated disabled-tracking response. No provider source body, alert credits or production writes.

This job is NOT permission to activate commit tracking in a user's production Neon/Replit database. That setting may be unavailable or require server restart/privileged control. Before final Phase 5 RELEASE, a separate independent read-only production probe is needed.

## Limits and next gates

1. This proof validates **only the database COMMIT time and exact stored T24 identity/version**, not the legal source Content, authoritative provider-native scheduled T, physical operating leg or selected history. Those must be verified through the authentic V0079 source/normalized identity and independently reviewed external evidence.
2. Stage 14 still explicitly rejects T6/T90; **a separate verified integration must combine native T24 commit witness with the authentic Stage14 V0079 bound-source cutoff-safe PRE writer**, and do so without weakening no-backfill. If the live database lacks native commit metadata, a separate durable, independently authenticated and scientifically accepted timestamp-witness design is required; no fallback using `created_at` is permitted.
3. Finish the independently measured full 31-day dynamic FIDS refresh and registered 2×2h/up-to-6h crossover calendars, correct all seven REST/Alert budget categories, verify source and derived-record/ML backup-retention rights [#300](https://github.com/HKcode22/ReplitTranvr/issues/300), run a real prospective GitHub-only source→PRE→webhook/AIRBORNE→POST collection and independent Phase 5 FREEZE.
4. The original catalog-locked implementation log and f.8 plan are unchanged; see [Phase 5 P0 #416](https://github.com/HKcode22/ReplitTranvr/issues/416) and [FREEZE #413](https://github.com/HKcode22/ReplitTranvr/issues/413).

**Disposition:** a real PostgreSQL COMMIT timestamp can be strong evidence for the stored T24 anchor when supported, but Stage15 never independently clears source, legal rights, or full scientific acceptance.
