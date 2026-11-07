# Phase 5 Stage 23 — inert production V0079/V0080/V0081 database schema commissioner

**November 7, 2026 UTC. This is a real persistent SQL schema change when explicitly owner-executed, NOT a provider bill, not runtime role enabling, not live FIDS/PRE, not source retention permission and not Phase5 scientific FREEZE.**

## Why this is the next practical task, not another repeated diagnosis

Owner's authenticated PostgreSQL read-only catalog audits, already recorded in Phase5 issue #416:
- Stage16b `2026-11-07T12:18:48.521Z`: 0/6 V0079 tables **physically absent** in production `neondb.clean`, not merely invisible due to privileges.
- Stage18 `2026-11-07T12:36:14.015Z`: correct `neondb` PG16+, all five B0062 baseline/flight/sampling tables and enumerated critical columns present, schema `CREATE` true, V0079 0/6, V0080 0/1, V0081 0/1. This does not yet prove exact FK parent key types/REFERENCES privileges on the live production role.
- Stage19 PR #451: on disposable PostgreSQL16, exact V0079→V0080→V0081 staging files proved **one-transaction atomic rollback**, successful commit and duplicate refusal. That Stage19 script **cannot** run on production and did not install tables.

## Stage23 actual reviewed commissioner

[Owner-only schema commissioner](../../scripts/v39_phase5_stage23_atomic_schema_only_owner_once.mjs) performs a tightly scoped real DDL operation **only** with explicit `P5_STAGE23_SCHEMA_ONLY_ONCE=INSTALL_EMPTY_V0079_V0080_V0081_NO_PROVIDER_CALLS`, temporary whitelisted SQL path, `ADB_AUTO_COLLECT=0`, `V39_PHASE6_PROCESS_ARMED=0`, and a dedicated connection string distinct from the runtime role. It verifies all three downloaded SQL files by **exact Git blob SHA1**, not merely by filename:

| Migration | Git blob | Creates |
| --- | --- | --- |
| V0079 | `fa6f4275f773dfe36f591eb0259063aafe7ecd0c` | Six locked source/budget/original-binding tables |
| V0080 | `bcdb0e8d77a0684e495467d20fdd0fb83c686c0e` | One real-GitHub-run prearm table and extra paid-attempt guard |
| V0081 | `1ee6fa7f1582ec775002c1157f4b815cfe342015` | One independent T−24h witness table and DB-clock trigger |

Each commissioned DB transaction:
1. Acquires one **transaction-scoped advisory lock** (avoids concurrent schema installers) with tight statement/lock timeouts.
2. Verifies **PG16 primary `neondb`**, clean schema `CREATE`, parent FIDS UUID and snapshot BIGINT primary/unique keys, actual `REFERENCES` permissions and five baseline critical schemas.
3. Checks **zero** existing V0079/V0080/V0081 tables, helper function names or composite types (no blind reapplication to a partial installation).
4. Executes V0079, then V0080, then V0081 inside **one SERIALIZABLE transaction**; if a precommit step fails, rolls back **every** new table/function/trigger.
5. Restricts V0081 default PUBLIC function execution (V0079/V0080 already revoke their PUBLIC grants). Verifies eight tables + one index relation, nine helper functions and eight table composite types; verifies **zero PUBLIC table privilege and helper EXECUTE grants**, then commits.
6. In a later DB transaction reads back committed object counts and ACL. If the COMMIT or readback is ambiguous, returns quarantine and **never tells the owner to blindly retry**.

**Deliberately omitted:** NO `GRANT` to runtime/source writer or witness roles, no FIDS request, no Air Alert CREATE/STOP, no source original, no PRE or POST, no migration of old flight rows, no expanded provider backup retention, and no new application deployment. The tables are empty and inert after commission. A later independent least-privilege source, reader and witness-role grant/deployment and real quality audit remain.

The [dedicated Stage23 disposable PostgreSQL16 CI](../../.github/workflows/phase5-stage23-inert-owner-schema-real-pg16.yml) tests deliberate failure after V0079 → all 8 absent, successful three-migration atomic commit → all 8 present and zero PUBLIC access, then duplicate replay refusal. It cannot connect to a production database.

## Live execution admission and handoff

A **single pinned Replit Shell command** can fetch the reviewed exact Stage23 script and the three unchanged migration blobs via GitHub into a temporary folder, verify all blob hashes, and invoke `node` with existing `DATABASE_URL` and explicit schema-only consent. This is a **persistent DDL operation**, unlike the prior Stage18 read-only audit, but it costs zero AeroDataBox API or Flight Alert credits. Do not run it until GitHub exact-head dedicated and full safety CI checks pass, merger pins are verified and the command is supplied directly. The repo's history of user spending permission is not a license to activate provider ingestion or retain normalized per-flight Contents indefinitely.

If successful, record the sanitized database readback in issue #416 and Phase5 README. Then prioritize actual restricted roles, signed V0079 allowed query/day/UTC budget, V0080 true Github prearm, genuine original custody, T24/T6/T90 per-flight PRE, deployed receiver, POST/AIRBORNE independent denominators, and source-use/retention case #300. The original Gate5 scientific full criterion is still HOLD; the account-specific source retention/ML contract is still unverified; **Phase5 FREEZE HOLD / Phase6 paid GO NO**.

## Understanding the code as a programmer

- `readFileSync` + Git blob hashing prevents a reviewed SQL file being quietly changed before execution.
- `Pool.connect()` obtains a PostgreSQL connection. `BEGIN SERIALIZABLE READ WRITE` groups **all three** migration SQL files in one unit. `pg_try_advisory_xact_lock()` serializes competing installers.
- `pg_catalog.pg_class`, `pg_proc`, `pg_type` and `pg_attribute` reveal actual schema and types. `has_table_privilege(...,'REFERENCES')` checks FK installation privilege.
- `REVOKE ... FROM PUBLIC` means no default broad execution permissions. **The role owner can still administer objects**; broad application activation is intentionally deferred.
- `COMMIT` is followed by **readback** to distinguish transaction success from an unverified action. A network error during/after COMMIT creates an **unknown state**, not a retry invitation.

This file is mutable *prospective* implementation documentation. Plan f.8 can be versioned/amended when our own mathematical assumptions need improvement; the archived observed implementation log should keep historical bytes/observations intact.
