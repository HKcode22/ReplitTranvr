# Phase5 Stage16b — distinguish physically absent V0079 tables from inaccessible tables

**Date:** 2026-11-07 UTC, based on the owner-run Replit audit at `2026-11-07T11:34:03.714Z`.

The previous [Stage16 environment check](2026-11-07_STAGE16_READONLY_PRODUCTION_DB_SCHEMA_AND_COMMIT_TRACKING.md) proved expected `neondb`, PostgreSQL16+ and `track_commit_timestamp=off`, and showed `to_regclass(...)` false for five V0079 source-ledger tables. That is sufficient to mark Phase5 production readiness **HOLD**, but not sufficient to choose a migration or grants repair: a table can be absent, partly installed, or inaccessible to the current role.

## Exact Stage16b answer

[One-shot read-only script](../../scripts/v39_phase5_v0079_production_catalog_privileges_readonly_once.mjs) performs one PostgreSQL `REPEATABLE READ READ ONLY` transaction and queries **only `pg_catalog.pg_class`, `pg_catalog.pg_namespace` and built-in privilege functions**. It returns six table-name rows with:

- `presentInPgCatalog`: actual relation exists in the current `clean` schema in this database, independent of `to_regclass` visibility;
- `resolvesForCurrentRole`: fully qualified table name resolves;
- current role `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges, as boolean only;
- `currentRoleHasCleanSchemaUsage` plus summary `possibleCause`: `PHYSICALLY_ABSENT`, `PARTIAL_SCHEMA`, `CATALOG_PRESENT_BUT_ROLE_LIMITED` or `TABLES_PRESENT_STILL_NO_RELEASE`.

It never prints a connection string, role name, password, flight ID, source payload, API key, billing credential or record values. No live AeroDataBox GET, alert credit, raw Contents, `CREATE`, `GRANT`, migration, `UPDATE`, `DELETE` or provider paid operation. The script's Git blob must be pinned independently before its first owner run; **do not guess it from a filename**. Offline CI tests each absent/partial/present-but-invisible state and transaction rollback. Only actual owner Replit Shell output can establish production findings.

This diagnostic is needed because user permission to spend does **not** automatically install the staged [V0079](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql) or authorize retention. The correct action for fully absent tables is a separate reviewed scoped installer **after** rights and science readiness; the correct action for existing but invisible tables is a separate reviewed role/ACL correction, never duplicate installation. If partial, HOLD and independently reconcile migration inventory before changing anything.

## What this does not solve

Even if all six tables appear, it does not certify real source original rows, current provider-native selected T, physical operating-leg data, legal model-training/backup retention, the full signed 31-day calendar, the five registered crossovers, receiver publish identity, POST/webhook/AIRBORNE denominator audit or independent Phase5 FREEZE. The production server has **native T24 XID timestamp tracking OFF**; the separately staged [Stage17 two-transaction T24 witness design](2026-11-07_STAGE17_INDEPENDENT_T24_TWO_COMMIT_WITNESS_WITH_TRACKING_OFF.md) was tested without changing that server setting, but its V0081 schema and restricted roles are also **not installed**.

The prior documented AeroDataBox subscription is grandfathered RapidAPI Team Ultra: September verified quota 60k; project ceiling 50k; 2026-11-07 09:00Z balance 59,968 and 1,830 Alert credits. These facts do **not** need repeat account-identification requests. Current account-specific normalized flight-Contents ML/backup rights remain separately tracked [#300](https://github.com/HKcode22/ReplitTranvr/issues/300).

**Phase5 final FREEZE: HOLD. Phase6 paid GO: NO.** Neither the f.8 plan nor the immutable historical V3.9 implementation log changes in this checkpoint.
