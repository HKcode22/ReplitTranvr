# Phase 5 Stage 27 — PostgreSQL 16 implicit ADMIN membership: production refusal and corrected role commissioning

**2026-11-07. Source-of-truth checkpoint.** This is a factual correction to Stage26's PostgreSQL role-management model, **not** a change to f.8 sampling/flight science. The owner explicitly ran the reviewed Stage26 source-pinned shell command from `main=5939ffaad50b90cf240809d0a7b4872aaa9418a0`. It returned:

```
STAGE26_PIN_VERIFIED; NOLOGIN_ROLE_SETUP_ONLY; NO_PROVIDER_REQUESTS
REFUSED_P5_STAGE26_SCOPED_ROLE_ALREADY_HAS_RUNTIME_MEMBER
```

There was **no** `P5_STAGE26_FOUR_NOLOGIN_ROLES_INSTALLED_NO_RUNTIME_ACTIVATION` status or `STAGE26_ROLE_COMMAND_FINISHED` marker. The warning about future Node/PostgreSQL SSL-mode compatibility was nonfatal and unrelated.

## What actually happened, precisely?

The installer entered a `SERIALIZABLE READ WRITE` PostgreSQL transaction, passed the earlier cluster/permission/table checks, called `CREATE ROLE` for four future Stage26 roles and issued their scoped grants. It then asked `pg_catalog.pg_auth_members` for the number of membership records involving those four group roles. The old code incorrectly required **zero** rows, and threw `SCOPED_ROLE_ALREADY_HAS_RUNTIME_MEMBER` if even an *administrative-only* creator grant appeared.

[Official PostgreSQL 16 role attributes](https://www.postgresql.org/docs/16/role-attributes.html) establish that when a **non-superuser with CREATEROLE** creates a new role, PostgreSQL automatically grants it back to the creator with:

| Membership flag | Default | Meaning |
| --- | --- | --- |
| `admin_option` | `true` | Creator can grant membership or administer the created role |
| `set_option` | `false` | Creator cannot immediately `SET ROLE` to this new role |
| `inherit_option` | `false` | Creator does not immediately inherit this new role's table/function privileges |

The code's blanket `count(*)=0` assumption is therefore invalid for a **non-superuser creator**, though it happened to pass disposable PostgreSQL16 CI when CI connected as the `postgres` **superuser**. This is a **test-environment fidelity bug**. The live refusal is consistent with the documented default, but the error alone is **not** a complete independent list of production memberships. There is no evidence from this output of a paid call or a completed role install.

### Does `ADMIN=true` mean there is no security risk?

**No.** An administrative creator can subsequently grant itself `INHERIT` or `SET` privileges. Even if `SET=false` and `INHERIT=false` today, this administrative power is meaningful. It is expected because the creator is already a trusted database administrator, but the new groups must **never** be presented as a security barrier against that administrator. They isolate lower-privilege **application/workflow identities**, which will be commissioned separately after reviewed operational conditions.

### Did the first Stage26 attempt leave role changes?

The exception was thrown **before** the installer set its `commitStarted` flag and before `COMMIT`. Its error handler calls PostgreSQL `ROLLBACK`. PostgreSQL `CREATE ROLE` and `GRANT` are transactional in this path, so the intended state is no four-role installation; however, **the owner shell result alone cannot prove an independent post-failure catalog snapshot**. The new [Stage27 read-only catalog auditor](../../scripts/v39_phase5_stage27_role_creator_refusal_readonly_once.mjs) verifies exact role counts and membership/SET/INHERIT flags in `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`. No source flight rows, secrets, provider calls or database writes.

**Do not re-run the original Stage26 script.** Even if its first failed transaction rolled back, the unchanged code will encounter the same error under the same non-superuser role.

## The actual technical repair

[Stage26 repaired role commissioner](../../scripts/v39_phase5_stage26_four_nologin_roles_owner_once.mjs) now:
1. Verifies PG16 role creator identity and `CREATEROLE` attribute.
2. If actual actor is **superuser**, expects **zero** role membership records as before.
3. If actual actor is **non-superuser**, expects **exactly four** memberships: one each for our exact four new `NOLOGIN NOINHERIT` group names, granted to **that current creator only**, by a superuser, with `ADMIN=true, SET=false, INHERIT=false`.
4. Rejects any extra member, another target or grantor, duplicate, inherited privileges, `SET=true`, missing `ADMIN`, unexpected role status, or prior partial-role install. The grants/roles are still applied in **one atomic SERIALIZABLE transaction**, with post-COMMIT readback.
5. Returns explicit `pg16CreatorAutomaticAdminMembershipMode` and `pg16AdminCreatorCanLaterGrantRuntimePrivileges=true` to describe the real security boundary; does not fabricate a direct runtime role grant, password, app source login, original response, flight PRE, or paid operation.

[Dedicated Stage26/27 PostgreSQL16 CI](../../.github/workflows/phase5-stage26-nologin-role-installer-disposable-pg16.yml) now sets up **a real non-superuser CREATEROLE installer** in disposable PG16. It has enough *temporary test-only grant options* to assign the reviewed object grants, then checks **full rollback after injected refusal**, exact four automatic ADMIN-only grants after successful commit, **zero SET/INHERIT access**, NOLOGIN roles, and duplicate refusal. It also executes the Stage27 **read-only catalog audit after rollback and after success**. The test-only administrator is never created in production, and no production credentials exist in CI. Neither script activates a collector or certifies provider rights.

## What this teaches about SQL inside TypeScript

The old code treated `pg_auth_members` as if every row meant a live application login. But a **database catalog** stores more nuance than a simple row count:

```sql
-- Teaching excerpt; querying pg_catalog is a READ ONLY activity:
SELECT m.rolname, a.admin_option, a.inherit_option, a.set_option
FROM pg_catalog.pg_auth_members AS a
JOIN pg_catalog.pg_roles AS m ON m.oid = a.member;
```

Here, `a` and `m` are **SQL table aliases**, not JavaScript variables. `a.member` is a role OID identifying who belongs to the target group. PostgreSQL stores the three separate boolean privileges. A TypeScript `await client.query(sql,[...])` can execute this query and inspect the returned `rows`. **A membership row with ADMIN-only privileges does not mean the new role can log in or its table rights are currently inherited.** Equally important: ADMIN power means the creator *could change those membership options later*. Correct code models both facts.

## Current verified release state

- **Stage23**: eight V0079/V0080/V0081 tables installed in production; source/Alert GET zero in that installation, original role GRANTs zero.
- **Stage24/25**: witness-gated later PRE code and four-role **disposable CI** access matrix merged.
- **Stage26 owner attempt**: `REFUSED_P5_STAGE26_SCOPED_ROLE_ALREADY_HAS_RUNTIME_MEMBER`, pre-COMMIT; not a successful production role install.
- **Stage27 repair**: staged on PR until exact-head PostgreSQL16 non-superuser CI and full safety tests pass; production outcome still awaits separate reviewed owner execution. Read-only recovery audit first, and never blindly retry ambiguous COMMIT.
- **Science**: legal source Contents ML/backup rights #300, authentic native selected T/physical leg, signed 31 batch-day schedule, genuine FIDS originals, all three PRE horizons, POST/Alert/AIRBORNE and independent audit remain separate. **Phase5 final scientific FREEZE HOLD / Phase6 paid GO NO**.

Read [Start Here terminology](PHASE5_START_HERE_FREEZE_FIDS_PILOT_GLOSSARY_20261107.md) and [Section B code lab](PHASE5_SECTION_B_DEEP_CODE_LAB_LINE_BY_LINE_20261107.md) for the rest of the system. Future sessions should recover this checkpoint and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416), not ask again about historical RapidAPI emails or repeat Stage23 schema installation.
