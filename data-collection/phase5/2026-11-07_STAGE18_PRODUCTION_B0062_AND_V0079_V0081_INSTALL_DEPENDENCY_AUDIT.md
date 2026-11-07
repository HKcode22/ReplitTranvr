# Phase 5 Stage 18 — production B0062 prerequisites and V0079→V0080→V0081 readiness (metadata only)

**2026-11-07 UTC. Staged for review.** This is an independent **read-only catalog inspector** and CI integration test, **not** a production migration, paid data collection, legal permission, Phase5 FREEZE or Phase6 GO.

## Authentic owner evidence recovered from Stage16b

Owner ran PR #449 exact-source-pinned script, merged main `ff5ab00a167e59fa2c054d7bf24937eb21fc550e`, Git blob `b2e191ef5fa1e83521bc54d086ba805b880cdfb6`. PostgreSQL `neondb` reported on **2026-11-07T12:18:48.521Z**:
- `expectedDatabaseMatched=true`, `transactionReadOnlyVerified=true`, `currentRoleHasCleanSchemaUsage=true`.
- `v0079CatalogTableCount=0`; all six relations have `presentInPgCatalog=false`, not merely hidden by current-role name resolution. **V0079 is physically absent from this production database**.
- `possibleCause=V0079_SIX_TABLES_PHYSICALLY_ABSENT_IN_THIS_DATABASE`.
- `providerCalls=0`, `providerFidsGets=0`, `alertCreates=0`, `databaseWrites=0`, `githubMutations=0`; `phase5FreezePassed=false`, `phase6PaidGo=false`.
- Nonfatal `pg-connection-string` SSL-mode compatibility warning appeared. Do not modify existing database URL or weaken TLS based on that warning.

Permanent issue checkpoint: [#416](https://github.com/HKcode22/ReplitTranvr/issues/416). No duplicate owner verification of the six absent V0079 relations is needed merely to repeat this evidence.

## What Stage18 adds

[Standalone read-only script](../../scripts/v39_phase5_v0079_v0081_install_dependencies_readonly_once.mjs) independently inventories **only PostgreSQL system-catalog table names and required column names** for:
1. Existing B0062 core/sampling prerequisites: `adb_phase6_calendar_day`, `adb_sampling_draw`, `fids_query_response`, `flight_population`, `flight_snapshots`.
2. All six V0079 source/cycle/day/UTC-charge/physical-attempt/original-binding relations.
3. V0080 one real-GitHub-run-ID `phase5_fids_github_prearm_v39` relation.
4. V0081 one independent `phase5_t24_postcommit_witness_v39` relation, independent of `track_commit_timestamp` being ON.

SQL uses `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` with local statement/lock timeouts and only `pg_catalog.pg_class`, `pg_catalog.pg_namespace`, `pg_catalog.pg_attribute`, server identity/clock and boolean schema privilege checks. No flight rows/payloads, secret values, role identities, provider requests, SQL DDL/DML, grants, deployment or paid owner. It refuses wrong DB, non-PG16 and read-only failures; it classifies complete baseline vs missing columns, no staged relations vs partial vs all staged relations existing. Even all staged tables present **do not prove triggers/functions/ACLs/rights/operational readiness**.

A dedicated GitHub workflow tests the module with synthetic failures and **actual disposable PostgreSQL16**: B0062 baseline catalog, empty V0079–V0081, staged SQL applied in correct order to **CI-only disposable DB**, then a fresh catalog readback of all eight stage tables. No runtime provider key or production DATABASE_URL is passed. Passing CI is proof of that test environment only, not a live install.

## Production decision sequence and stop conditions

- If baseline missing/changed: HOLD; reconcile actual B0062 columns and migration owner, no installation attempt.
- If any V0079/V0080/V0081 partially present: HOLD; do not repeat non-idempotent migrations or silently grant privileges.
- If prerequisites match and all staged are absent: stage a **separate** reviewed scoped installer with exact migration-file blob pins, role/ACL safeguards, transactional atomicity where possible, post-install role tests, no automatic runtime activation and no cost-bearing source operations. **This Stage18 script does not grant installation authorization**.
- If all staged already present: audit functions, triggers, roles and actual privileges; table names alone do not certify a working source owner.
- Protect original f.8 science and immutable `V3.9_IMPLEMENTATION_LOG.md` Git blob `0a5e4bedfa7c743feaf05ec2dc66f22084f39236`. Do not re-run expired flight cutoffs or backfill PRE.

**Separate external dependencies:** owner-authorized spending is not independent current AeroDataBox normalized Contents ML/backup rights ([#300](https://github.com/HKcode22/ReplitTranvr/issues/300)); real provider-native selected T and physical operating-leg proof, frozen full 31-day / five crossover design with seven-category UTC charge-day budget, exact published receiver, GitHub-only T24/T6/T90→POST/webhook/AIRBORNE denominators and signed Phase5 FREEZE are not solved by installing empty tables.

**Decision remains Phase5 final FREEZE HOLD / Phase6 paid NO-GO**. Keep historical original Gate5 full scientific HOLD under Amendment B. No Cloudflare, Replit Agent or timed manual Replit owner.
