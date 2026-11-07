# Phase 5 Stage 17 — PostgreSQL T−24h two-transaction commit witness, native tracking OFF

**Date:** November 7, 2026. **State:** STAGED OFFLINE only; no production database migration or owner. *Not* a real-aircraft PRE cohort, native provider scheduled-T certification, account-specific source/backup ML retention right, independently accepted final Phase 5 FREEZE or Phase 6 paid GO.

## The actual production reason

Owner's source-pinned [Stage16 read-only production audit](2026-11-07_LIVE_PRODUCTION_DB_AUDIT_AERODATABOX_ACCOUNT_AND_TECHNICAL_STUDY_CHECKPOINT.md) observed November 7 11:34:03Z: `neondb`, PostgreSQL16+, `track_commit_timestamp=off`; source query/original/physical attempt V0079 tables **not present or not visible**. PostgreSQL's `pg_xact_commit_timestamp(xmin)` verifier from Stage15 cannot return native historical commit evidence when the server did not record it. Do not turn on server settings, treat the disabled setting as user error, or infer that an offline Stage15 success means native proof is available in this account.

## Mathematical and database argument (two independently durable transactions)

The source/physical-flight PRE Stage14 **already** requires the following statement in transaction `TX₁`:

1. An independently reviewed native-T and correct operating flight are structurally joined to an authentic immutable V0079 source original. The saved `PRE_DEPARTURE` snapshot must be visible after `TX₁` has COMMITTED. It cannot be backfilled after the flight's own T−24h deadline.
2. A separate, more restricted witness-only database user `phase5_fids_t24_witness_...` starts **transaction `TX₂` only after TX₁ is finished**. Its SQL reads the original snapshot and source lineage; because PostgreSQL MVCC does not expose uncommitted rows from another transaction, positive visibility establishes TX₁ committed **before** the observation.
3. A V0081 **BEFORE INSERT trigger** derives all witness values from the authentic stored snapshot/source tables rather than trusting caller fields. It records `post_pre_commit_db_observed_at_utc=clock_timestamp()` and refuses timestamps outside **[T24 cutoff − 180s, T24 cutoff − 2s)**. There is exactly one frozen T24 snapshot for the flight and one witness per flight/snapshot; witness rows are immutable by trigger and dedicated role has no source/PRE INSERT/UPDATE/DELETE.
4. The `TX₂` witness INSERT commits. A **separate fresh SQL readback after COMMIT** re-reads the immutable witness and confirms current database clock `readback_at_utc < T24 cutoff`. Any unknown COMMIT or readback means **HOLD/quarantine/no blind retry**, even if the witness may already be durable.

Therefore the positive event ordering is:

```
PRE original/source observed <= TX₁ COMMIT
TX₁ COMMIT < first separate-transaction witness visibility (TX₂)
TX₂ DB witness timestamp <= TX₂ COMMIT
TX₂ COMMIT <= later SQL readback DB clock < T24 cutoff
```

This is independent of PostgreSQL `track_commit_timestamp` and of the misleading transaction-start `flight_snapshots.created_at=now()`. It is **not** a cryptographic external/provider source attestation, nor a substitute for source-use rights, operating-leg identity, actual-only outcome or as-of features.

## New files

- [V0081 staged migration](../../migrations/staged/V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql): protected `clean.phase5_t24_postcommit_witness_v39` table, original `snapshot_id` foreign key, unique immutable operating-flight identity, record SHA/selected T source fields, mandatory positive V0079 original/member joins, timestamp trigger and no UPDATE/DELETE. **No production GRANT or installation**.
- [Stage17 TypeScript writer](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts): exact restricted role check, `SERIALIZABLE` witness insertion, all source/snapshot identity guards, SQL clock due-window checks, post-COMMIT readback before cutoff, no provider calls, no actual Phase6 activation.
- [Authentic PostgreSQL16 CI](../../.github/workflows/phase5-stage17-real-pg16-two-transaction-witness.yml) reuses the independently tested Stage14 PRE integration fixture in `tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts`. It boots B0062+staged V0079+V0081, explicitly asserts **`SHOW track_commit_timestamp = off`**, commits an actual synthetic Stage14 T24 row under one SELECT+INSERT-only role, then writes the witness under a **different** role. Tests deny duplicate witness, privileged/wrong user, changed frozen T/source SHA and mutable witness rewrite. Zero external provider API, Replit/production DB writes or alert credits.

## What is not done / why no immediate paid launch

This module does **not** automatically enable Stage14 T−6h/T−90m: the later writer must separately verify the exact protected witness against the canonical same physical operating leg, original frozen T/version/cutoffs, source and rights **before** any true prospective PRE and must use its own post-COMMIT clock. Stages17/14 also remain staged until V0079/V0081 permissions and actual rights are independently commissioned.

The independent final Phase5 FREEZE still requires a measured, frozen 31-day seeded four-airport schedule, all five registered f.8 crossovers, seven REST/Alert budget categories, verified published receiver source, genuine GitHub-only source → three on-time PRE → POST/webhook/AIRBORNE data and all operating-leg/missingness/actual-only outcomes. Account-specific AeroDataBox Contents ML/backup retention remains a separately documented dependency in [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300); the original grandfathered Ultra plan and entitlement are already documented, not a question to ask again.

**No change** to the binding Plan f.8 or the immutable historical V3.9 implementation log.
