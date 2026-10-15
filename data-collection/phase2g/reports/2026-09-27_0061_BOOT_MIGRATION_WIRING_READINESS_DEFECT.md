# Phase 2G Readiness Defect — Migration 0061 Was Not Wired Into Production Boot

**Discovered:** 2026-09-27 during Monday WSSS-v2 readiness preparation  
**Discovery stage:** zero-credit / pre-launch  
**Provider mutation:** none  
**Alert credits spent:** 0  
**Paid experiment affected:** none; defect was caught before WSSS-v2 authorization

## Summary

The physical-v2 repair added:

`migrations/0061_phase2g_physical_flight_metrics_v2.sql`

but the production boot migration list in:

`server/db.ts`

still ended at:

`0060_phase2g_physical_flight_metrics.sql`

Therefore the production server's normal `applyBootMigrations()` path would not automatically apply migration 0061.

## Why this matters

Migration 0061 changes the durable `clean.adb_anchor_probe.metric_contract_version` constraint so new probes may persist:

`v39-physical-flight-instance-v2`

while preserving legacy NULL/v1 evidence.

Without 0061, a future v2 probe could reach the database with the correct v2 application code but encounter a v1-only schema contract.

That would be a schema/implementation mismatch and could invalidate or abort the measurement.

## Root cause

A new migration file was added during the physical-v2 repair, but the repository uses an explicit ordered `BOOT_MIGRATIONS` list rather than automatically discovering every migration file.

The repair added the migration file but did not add its filename to that explicit production list.

The previous CI path did not make this omission obvious because the migration file existed and other v2 code/tests were green; the readiness audit specifically inspected the live production migration path and found the gap.

## Classification

- scientific concept failure: no
- provider failure: no
- paid-run failure: no
- production schema wiring defect: yes
- pre-launch readiness defect: yes

## Fix

1. add `0061_phase2g_physical_flight_metrics_v2.sql` immediately after 0060 in `BOOT_MIGRATIONS`;
2. export the boot migration list for regression testing;
3. add `tests/phase2g_boot_migration_v39.test.ts` asserting 0061 follows 0060 and is the terminal Phase-2G boot migration;
4. extend `db_verify_phase0_v39.ts` to prove the live `adb_anchor_probe_metric_contract_check` accepts both v1 and v2;
5. include the boot-migration regression in the Monday WSSS-v2 targeted static suite;
6. after merge/sync, apply the production boot migrations to the live DB and independently read back the constraint before creating Monday's runtime/AUTH.

## Prevention rule

A future numbered Phase-2G migration is not considered implemented merely because the SQL file exists.

It must have all three:

```text
migration file
+ production boot-path wiring
+ live-schema verification
```

before a paid probe may rely on it.

## Monday consequence

Do not create the WSSS-v2 runtime or AUTH until:
- this fix is green and merged;
- Replit is synced to the exact fixed HEAD;
- production boot migrations are applied;
- live read-back confirms the v2 metric-contract constraint.

This discovery is a successful pre-launch prevention event, not another failed Stage-1 experiment.
