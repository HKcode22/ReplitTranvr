# Phase 2G Readiness Finding — Replit Watch Restart Applied Boot Migration During Source Sync

**Discovered:** 2026-09-28 UTC during WSSS-v2 readiness  
**Paid provider action:** none  
**Alert credits spent:** 0  
**Provider mutation:** none  
**Scientific experiment affected:** none  
**Classification:** readiness/tooling side effect; source-sync procedure assumption was too strong.

## What happened

The Replit workspace was fast-forwarded from an older verified source state to the newly hardened Phase-2G main branch.

The sync command labeled itself:

`database_mutations=0`

because the Git command did not itself execute SQL.

However, the managed Replit application already had a long-lived:

`tsx --watch server/index.ts`

process running.

Updating imported server files caused the watch-managed child `server/index.ts` process to restart automatically.

On every application boot, `server/index.ts` invokes `applyBootMigrations()`.

The restart therefore applied the newly wired:

`0061_phase2g_physical_flight_metrics_v2.sql`

migration before the planned explicit before/after migration step.

## Evidence

Persisted collector log:

- 2026-09-28T06:15:33.110Z — migration 0060 applied;
- 2026-09-28T06:15:33.172Z — migration 0061 applied;
- 2026-09-28T06:15:36.238Z — Express server serving on port 5000.

Process state showed:
- parent `npm run dev` from 05:29:07 UTC;
- long-lived `tsx --watch server/index.ts` supervisor from 05:29:08 UTC;
- new `server/index.ts` child process from 06:15:17 UTC.

This timing is consistent with the Git fast-forward changing imported server files, which caused the watcher to restart the child application and execute boot migrations.

## What did NOT happen

- The read-only SQL audit did not apply migration 0061.
- Importing `server/lib/disruption/db_v39.ts` cannot invoke `applyBootMigrations()`; it only creates the V3.9 PostgreSQL pool.
- The user did not manually click Run as part of this step.
- No AeroDataBox provider action occurred.
- No paid Alert credits were spent.
- Historical probe rows were not rewritten.

## Live database proof after the restart

The live constraint became:

`metric_contract_version IS NULL OR metric_contract_version IN ('v39-physical-flight-instance-v1','v39-physical-flight-instance-v2')`

with `NOT VALID`, as designed.

Historical rows remained:
- probe 2 / OMAA: metric contract NULL;
- probe 9 / WSSS: metric contract NULL;
- probe 10 / MMUN: `v39-physical-flight-instance-v1`.

There were:
- 0 existing physical-v2 probe rows;
- 0 active/settling probes;
- 0 open incidents;
- 0 open probe budget days;
- 0 prepaid runtime session/delivery/item rows.

Therefore the migration changed the future allowed metric contract without rewriting historical scientific evidence.

## Root cause

The readiness procedure treated Git source synchronization as if it were operationally equivalent to a passive filesystem update.

That assumption was incomplete in a managed watch-mode development runtime.

The true causal chain was:

```text
git fast-forward
→ imported server files change on disk
→ existing tsx --watch supervisor detects change
→ child server/index.ts restarts
→ server boot calls applyBootMigrations()
→ migration 0061 applies
```

## Corrected rule

A Replit source sync is **not automatically database-mutation-free** when a managed watch-mode server is active.

Future schema-sensitive readiness work must distinguish:

1. direct action mutation:
   - whether the shell/Git command itself writes the DB;

2. induced runtime mutation:
   - whether changing watched source can restart the app and trigger boot-time DB mutation.

## Future prevention

For any future numbered migration that needs before/after live-schema evidence:

1. capture the **before** database audit before changing any watched production source;
2. inspect whether a managed watch process is running;
3. assume updating imported server/migration wiring may trigger application restart;
4. treat source sync as potentially inducing boot migrations;
5. after sync/restart, capture the **after** database audit;
6. never label the overall sync step `database_mutations=0` unless the managed runtime is proven unable to execute migrations during that interval;
7. do not kill/restart the managed Replit process merely to avoid this behavior; instead design the audit ordering around the managed lifecycle.

## Scientific impact

None to existing evidence.

This was caught during zero-credit preparation before WSSS-v2.

It improves procedural truthfulness and future schema-change provenance, but does not change:
- Stage-1 candidate order;
- WSSS-v2 timing;
- metric definitions;
- scoring;
- retry policy;
- provider budget.

