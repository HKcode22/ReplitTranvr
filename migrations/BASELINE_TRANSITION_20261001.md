# Database Migration Baseline Transition — 2026-10-01

Status: DESIGN FROZEN FOR IMPLEMENTATION REVIEW — NO LIVE DB MUTATION AUTHORIZED BY THIS FILE

Repository: HKcode22/ReplitTranvr

Archive branch preserving the complete pre-baseline migration history:
`archive/pre-baseline-migrations-20261001`

Working branch:
`phase2g-migration-baseline-hardening-20261001`

Source commit at transition start:
`3a932aede8b8b2db14ffef1602c3aaf454eb8022`

## Why this transition exists

The current application boot path replays every historical migration from `0002` through `0062` whenever a fresh server process starts. The project now has enough schema evolution that replaying legacy migrations against a modern live database can temporarily re-introduce obsolete schema assumptions before later migrations correct them.

Observed failure classes include:

- legacy `adb_sampling_frame_tier_source_rule` replay against modern `tier_source` values;
- legacy `adb_anchor_probe_status_check` replay without the later `settling` status;
- historical `sampling_probability` / `airport_layer_design_probability` transition replay;
- concurrent DDL producing `tuple concurrently updated`;
- migration side effects caused by Replit watch-process restarts.

The migration system therefore needs a baseline + durable history model rather than full historical replay on each boot.

## Target architecture

### 1. Preserve history, do not erase it

The complete historical migration chain remains recoverable from:

`archive/pre-baseline-migrations-20261001`

Historical applied migrations are treated as immutable evidence. They are not edited in place to make them appear as though they had always been correct.

### 2. Introduce a current-schema baseline

Create one verified baseline SQL artifact representing the complete intended PostgreSQL schema at the transition boundary.

Proposed active layout:

```text
migrations/
  baseline/
    B0062__v39_schema_baseline_20261001.sql
    B0062__manifest.json
  current/
    V0063__*.sql
    V0064__*.sql
    ...
```

The exact baseline SQL MUST be generated/verified from the intended modern schema and tested by rebuilding an empty verification database. It must not be handwritten from memory.

### 3. Durable schema-history table

The migration runner must persist at minimum:

- migration version / filename;
- SHA-256 checksum;
- applied timestamp;
- execution success;
- baseline marker;
- application/source identifier where useful.

Versioned migrations run exactly once.

If a migration recorded as applied has a different current checksum, migration execution fails closed with a checksum-drift error.

### 4. Cross-process migration ownership

Migration execution must use a PostgreSQL advisory lock held on one dedicated connection for the full migration operation.

This prevents multiple Replit/GitHub/app processes from performing schema DDL concurrently.

### 5. Existing live database adoption

The current live database must NOT replay the baseline SQL.

Before marking the baseline as represented/applied, a read-only schema-contract verifier must confirm the live database matches the expected baseline contract.

Only then may the baseline marker/history row be established.

### 6. New database behavior

A blank database applies:

1. the latest verified baseline;
2. every versioned migration newer than that baseline.

It does not replay migrations `0002` through `0062`.

### 7. Application startup behavior

Application startup may invoke migration checking/apply logic only through the durable migration runner.

An ordinary process restart at an already-current schema must become a no-op:

```text
acquire migration lock
read migration history
verify checksums
find zero pending versions
release lock
start application
```

It must not execute old DDL.

### 8. Legacy migration retirement

Do not remove the legacy files from the active branch until all of the following pass:

- current live schema contract snapshot;
- baseline SQL generated;
- empty-database rebuild from baseline;
- schema comparison baseline rebuild vs intended live contract;
- migration-history baseline/adoption test;
- checksum-drift test;
- concurrent-runner lock test;
- restart/no-op test;
- current Phase-2G offline/full tests and TypeScript checks.

After those gates pass, the active branch may remove the historical `0002`–`0062` SQL chain because it remains permanently preserved on the archive branch and represented by the verified baseline.

## Phase-2G scientific constraints

This migration cleanup does not:

- alter historical probe outcomes;
- alter MMUN/WSSS/OMAA scientific evidence;
- lower reconciliation acceptance;
- make `DELIVERY_GAP` promotion-valid;
- authorize a provider call;
- authorize an MMUN rerun;
- change Stage-1 duration/time class;
- change the physical-flight v2 metric contract.

MMUN recovery authorization and scientific-evaluability rules are handled separately after database/migration hardening.

## Required verification before Thursday MMUN

Before freezing the paid-run HEAD:

1. baseline architecture implemented and tested;
2. P2G17 exact-session cleanup receipt preserved;
3. incident/budget adjudication path verified;
4. migration runner no longer replays legacy DDL;
5. restart test demonstrates zero pending migration side effects;
6. full offline/typecheck/build/preflight regression passes;
7. exact approved source commit is then frozen into runtime/AUTH.
