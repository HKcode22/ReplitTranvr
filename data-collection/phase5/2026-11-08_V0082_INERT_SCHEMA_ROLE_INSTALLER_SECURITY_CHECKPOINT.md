# Phase 5 — V0082 inert schema + separately scoped NOLOGIN roles (NOT DEPLOYED)

**Engineering checkpoint:** 2026-11-07 Pacific / 2026-11-08 UTC. [PR #474](https://github.com/HKcode22/ReplitTranvr/pull/474). Before claiming merged, inspect the PR's exact-head V3.9 and disposable PostgreSQL 16 checks. This is an **additional versioned migration installation tool** for the reviewed V0082 REST-category/partition guard. It is not instructions to reinstall existing V0079, V0080, V0081, B0062 or four production worker identities.

## Why code existing in GitHub is not an installed database feature

The V0082 SQL file from PR #470 is **staged, not production installed**. PR #472's source/partition prepared writer and PR #473's budget freeze writer will both correctly refuse to operate until those tables and separately scoped grants exist. A PostgreSQL `CREATE TABLE` changes the actual DB catalog; merely merging a `.sql` file does **not** execute it. This new owner-only installer makes that possible later, but this PR itself executes **only CI disposable PG16**, not production.

### Exactly what the additive migration creates

`migrations/staged/V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql` Git blob must equal **`49b0954c25eeff6c496dfb03cf8b6d735e26badb`**. The installer reads the **real bytes** and recomputes the Git SHA-1 `blob <byte count>\0<bytes>`; a changed migration gets a hard HOLD instead of executing arbitrary SQL.

Four tables are added:
- `phase5_fids_seven_rest_release_v39`: one immutable reviewed source-grid / range / category-budget manifest.
- `phase5_fids_cycle_rest_category_cap_v39`: seven independent immutable cycle ceilings, including zero categories.
- `phase5_fids_utc_rest_category_budget_v39`: seven planned/rest charge-day rows per actual physical UTC date, with source +2 unit immutable spend increments.
- `phase5_fids_exact_query_partition_v39`: one immutable reviewed child/partition index and BASE/SPLIT classification for every V0079 prepared query.

Three trigger functions and five triggers prevent category rewrites and reject a physical FIDS GET without an exact expected source partition and all seven charge-day category/cycle budgets. An empty schema installation is **not** a paid request.

## SQL privileges and role map

The owner command: `scripts/v39_phase5_v0082_inert_schema_and_nologin_roles_owner_once.mjs`. It requires a distinct privileged database connection, reviewed main SHA and explicit one-time purpose token, actual `neondb` PG16 primary, verified four existing NOLOGIN Phase5 roles, B0062 + V0079/V0080/V0081 objects present, and **zero existing V0079 prepared queries, physical attempts, original bindings or GH prearms**.

All changes are inside **one SERIALIZABLE transaction**, with an advisory lock and statement/lock timeouts. It installs exactly one pre-reviewed V0082 SQL blob, creates one **new** `phase5_fids_budget_freeze_prod_20261108` NOLOGIN group, and grants:

| Role | Added permissions only | Explicitly *not* granted |
|---|---|---|
| New budget-freeze NOLOGIN | SELECT on stored B0062 authorization/calendar and V0079 cycle/UTC/query metadata, SELECT+INSERT on V0082 release/caps/daily category inputs | Query/partition/flight insert, physical attempt, raw flight payload SELECT, UPDATE/DELETE/TRUNCATE, LOGIN, role membership |
| Existing Phase5 PREPARE NOLOGIN | SELECT on V0082 release/caps/daily budgets/partition metadata; INSERT on **V0082 exact query partition only** | Direct physical attempt INSERT, budget release/cap/day INSERT, UPDATE/DELETE |
| Existing SOURCE NOLOGIN | **No new permissions from this installer**; V0079's existing SECURITY DEFINER physical reservation path is independently protected by V0082's newly installed trigger | V0082 direct INSERT, extra source or raw content rights, provider activation |
| Existing PRE-only and independent T24 WITNESS NOLOGIN | **No new permissions** | Any V0082 budget/partition INSERT or SOURCE execution |

**Important security distinction:** PostgreSQL `NOLOGIN` roles are groups and cannot connect directly, while a `LOGIN` role is an authenticated principal. This installer creates **zero new LOGIN credentials** and **zero membership grants**. In PG16, a non-superuser CREATEROLE owner may receive special **ADMIN-only, SET=FALSE, INHERIT=FALSE** administrative membership automatically; that is still a trusted administrator, **not cryptographic isolation from the database owner**. It never grants any runtime login membership or source release.

Post-install ACL readback explicitly checks: the new role has **no SELECT on raw `fids_query_response`, `flight_population`, `flight_snapshots`**; SOURCE/PRE/WITNESS get no new direct V0082 INSERT rights; PREPARE may INSERT only the signed exact child/range partitions, while budget freezer may INSERT only the three frozen input tables. PUBLIC must not retain V0082 table privileges or function EXECUTE. All four V0082 tables and source/attempt/original/prearm row counts must remain **zero** after empty installation.

## Test and production release boundary

`tests/phase5_v0082_inert_schema_role_installer_real_pg16_v39.test.mjs` and [the disposable PG16 CI workflow](../../.github/workflows/phase5-v0082-inert-schema-scoped-nologin-real-pg16.yml) install authentic B0062+V0079+V0080+V0081 **in a fresh CI database**, create four synthetic existing NOLOGIN groups, then prove:

1. Missing purpose or accidental non-local CI URL is refused before database access.
2. Deliberate interruption after executing **V0082 DDL inside the transaction** rolls back all four tables/functions and never creates the new role.
3. Success installs exactly the four V0082 tables, three helper functions, five triggers and the new NOLOGIN-only role, with verified PREPARE partition grants and no paid SOURCE added privileges; all flight/budget row counts zero.
4. Blind replay is refused because this is a **one-time additive installer**, not a reapply/overwriter.

**Crucial:** CI tests **do not** make the production installation. Do not run the owner command until its SHA and exact role/database safety are independently reviewed against the *real* Neon/Replit production database. Do not display database URLs, credentials or provider keys in logs.

## Next actual Phase 5 work

The paired protected producer chain now exists as engineering **source code**: Stage22 full31 audited source-to-REST-category plan → input-freeze writer (#473) → V0079+V0082 atomic prepared query/partition writer (#472) → separately V0080 actual GitHub run prearm → V0079+V0082 safeguarded physical GET → T−24h/T−6h/T−90m PRE and witnessed POST. Production still requires independently reviewed real eligible 31-day crossover calendar, real provider request range, legal normalized AeroDataBox ML/backup retention rights (#300), signed operational/prediction endpoint (draft Amendment D must be adopted), actual category spenders and separately bounded Alert SEND cap, independent release review and one true prospective cohort with flight-level PRE/witness/POST evidence.

**Status: code/tests under PR review; installation NOT RUN on live DB. Phase5 scientific FREEZE=HOLD. Phase6 paid GO=NO.** Never repeat installed historical V0079/V0080/V0081 or the four worker-account commissioners merely because these additional role grants are uninstalled.
