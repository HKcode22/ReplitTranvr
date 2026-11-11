# Phase 5 — next C+D real-database read-only evidence: all user schemas and PRE actors

**Prepared after merged PR #568** (main SHA `1c259ae07aec061354ede1b9a42f476612441e9f`). The prior 2026-11-11T20:48:27.251Z Replit catalog scan of **17 scoped `clean` tables** showed no confirmed queue, but was filtered to `phase5_%`, `flight_snapshots`, `flight_population`, and `fids_query_response`. It did not search other user schemas. The `phase5_fids_seven_rest_release_v39` item was a **false positive** from name matching `lease` within `release`; it was NOT a reusable queue. Its presence is not evidence we must rewrite installed phases.

## New source file and why it is not duplicate work

`scripts/v39_phase5_cd_all_schemas_privilege_readonly_once.mjs` is a **single-use private Replit owner command**, not a GitHub Actions production DB worker. It complements the prior Stage16b and final prelaunch inventories rather than rerunning them.

The script enters `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY` against **team's `neondb` PostgreSQL ≥16 primary**, with statement/lock timeouts; it reads ONLY `pg_catalog` tables and role/trigger metadata. No SELECT of actual source/patient/passenger/flight/event/schedule bodies or any application-table rows; no provider request, write, GRANT, table alteration or data transfer from app.

It enumerates **all non-system user table schema names** discoverable through `pg_catalog`, bounded at 500 tables and 10,000 column descriptions. It identifies potential work queue tables by (a) name *token* `task/queue/lease/claim/worker/job/dispatch` or (b) columns indicating canonical flight/horizon, owner, lease/fence and state. The word `release` cannot match the separate `lease` token. Candidate is only a **lead**, not an approval to reuse the table.

Also captures within bounds:
- Candidate table columns and UNIQUE index definitions, to determine whether `flight_instance_id + horizon` has a durable, non-revision-dependent uniqueness boundary.
- Existing direct INSERT/UPDATE/DELETE/TRIGGER-capable role names for `clean.flight_snapshots` (including legacy owners); merely seeing a role name doesn't authorize changing it.
- Existing noninternal triggers and function names on snapshots to avoid conflicting with old PRE writers.
- Exact server-reported UTC observation timestamp, accessible user schema names and bounded inventory counts. Sensitive connection strings/keys are **never** written to stdout.

Everything is guarded by a private owner session. `GITHUB_ACTIONS=true` refuses invocation. If metadata count/identity boundaries fail, the script **HOLDs** with no misleading “queue absent” conclusion. No API keys or database URLs should be pasted into the chat.

## GitHub CI and release boundary

`.github/workflows/phase5-cd-all-schemas-catalog-classifier-offline.yml` tests JavaScript syntax and pure candidate classification **without a database connection**. It explicitly rejects the `seven_rest_release` false positive while detecting named and opaque genuine task-candidate structures. No CI job runs the private live catalog probe.

**Status until the owner actually runs it:** code prepared / new catalog evidence **not yet observed**. Do not invent table names, rows, roles or permission results. Only one eventual owner Replit command is needed; reuse the verified GitHub blob/commit rather than trusting local staged scripts, and avoid replacing local Replit files.

## What remains for C+D after owner output

1. Read all-schema metadata, determine whether any safe existing queue can be reused, and enumerate every PRE writer that might be broken by a new trigger. **Do not install V0084/V0085** into the real database: they are disposable-CI prototypes using a temporary privileged function owner.
2. Draft independent minimal, migration-safe **production** SQL owner/actor/fencing/trigger scope, including legacy compatibility, NOLOGIN SECURITY DEFINER owner, explicit test roles and migration rollback.
3. Benchmark 50/100/250 synthetic tasks and edge cases (missed deadline, lost connection, confirmed 40001, stale lease, source expiry) on disposable PG16, then choose bounded worker parallelism from performance and p95/p99 missedness, not a one-run 8-task comparison.
4. Connect issued-time-gated Amendment E candidate fields to real signed, licensed FIDS/weather/route/history rows: **existing Stage14 remains `features:[]`** as of this checkpoint. Use the same original native T across T−24/T−6/T−90 and separate physical gate-out from free ADSB.lol wheels-off proxies.
5. Complete GitHub-only autonomous owner/worker/watchdog/POST/STOP and independent Phase 5 source rights/retention/target freeze before any Phase 6 paid GO.

**Phase5 scientific FREEZE HOLD; Phase6 PAID GO NO.** The 2026-11-11T13:34:38Z owner free account report last observed 60,000 allowed / 59,968 remaining units, 1,830 Alert credits, but that is not a contemporaneous paid release or rights proof. Project self-imposed 50,000/cycle ceiling unchanged.
