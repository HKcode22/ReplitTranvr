# Phase 5 Stage 28 — What happens AFTER four non-login PostgreSQL roles exist?

**November 7, 2026. Code study + engineering checkpoint.** The owner's Stage27 Replit Shell output independently confirmed the previous refused transaction rolled back, then the four reviewed `phase5_fids_*_prod_20261107` permission groups were created durably. All four are `NOLOGIN`, with no password or runtime membership; installation cost **zero** FIDS GETs, Alerts, or flight writes. This is authentic **production schema/role installation**, not a claim that the full experiment is live.

## The new engineering obstacle: How can a GitHub worker use a NOLOGIN role?

PostgreSQL has **login roles** and **group/permission roles**. A login connects using a secret connection URL; a group owns just limited privileges. We installed four **NOLOGIN groups** deliberately, so they cannot connect directly. A later, independently authorized GitHub Actions worker will need a **separate dedicated login** assigned exactly ONE group. This must be a new identity unrelated to the Replit application runtime login. The setup of that login and group membership is **not performed by Stage28**; it will be separately reviewed.

Example design (hypothetical identities; **do not run these SQL lines in production**):

```sql
-- Simplified teaching-only SQL; runtime secrets are not generated here.
CREATE ROLE hypothetical_pre_worker LOGIN NOINHERIT;
GRANT phase5_fids_pre_writer_prod_20261107
  TO hypothetical_pre_worker
  WITH SET TRUE, INHERIT FALSE, ADMIN FALSE;
```

**What those exact flags mean:** `SET TRUE` allows this ONE login to assume the PRE group for an isolated session; `INHERIT FALSE` stops it automatically receiving the group's privileges before `SET ROLE`; `ADMIN FALSE` means the worker cannot grant the group to anyone else. Contrast the **PostgreSQL16 implicit admin creator**: the trusted owner has `ADMIN TRUE, SET FALSE, INHERIT FALSE` and can administer groups, but does not have pre-enabled runtime access. This creator grant is not a barrier against the owner.

## How TypeScript safely switches role before calling SQL

[Read the real Stage28 adapter](../../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts). The new `makeP5Stage28DedicatedRolePool(...)` constructs a very narrow `Pool` adapter:

```ts
const checked = makeP5Stage28DedicatedRolePool(dedicatedLoginPool, {
  group: "pre",
  reviewedDedicatedLogin: "hypothetical_pre_worker",
  forbiddenApplicationLogin: "hypothetical_application_login"
});
const client = await checked.connect();
try {
  // Existing Stage14 PRE writer can use this restricted client.
  const rows = await client.query("SELECT current_user, session_user");
} finally {
  client.release();
}
```

This is an **explanatory example**, not production runnable without a separately reviewed dedicated login, group grant, credential and actual Source/PRE release. The adapter performs:
1. Checks `session_user` and `current_user` both equal the separately reviewed dedicated **login** before switching; PG16 primary `neondb`; no login superuser/CREATEROLE/BYPASSRLS. It rejects using the app-runtime login.
2. Reads `pg_auth_members` for **all four** Phase5 groups. The login must belong to exactly one group, with `SET TRUE, INHERIT FALSE, ADMIN FALSE` (not merely a boolean “approved” set in TypeScript). It also checks the database's effective `pg_has_role(...,'SET')`.
3. Runs `SET ROLE <whitelisted exact group name>` (the role name comes from a **fixed four-value internal constant**, never user input). This changes PostgreSQL `current_user` to that NOLOGIN group while `session_user` remains the dedicated login.
4. Verifies the effective table privileges after `SET ROLE`: PRE can INSERT new `flight_snapshots` but cannot INSERT FIDS original or witness; source can INSERT original binding but cannot INSERT a PRE or direct paid reservation; witness can INSERT its immutable T24 witness but cannot INSERT PRE; the plan writer can INSERT only the reviewed V0079 PREPARED query and budgets. All four cannot directly INSERT the paid-attempt table.
5. **Destroys the checked-out connection on `.release()`**, rather than returning a PostgreSQL session with `SET ROLE` active to some unrelated pooled borrower. This also applies when checks throw or an ambiguous transaction fails.

The adapter exposes `connect()` and `query()` because Stage9, Stage14, Stage17 and V0079 SourcePorts already use those PostgreSQL client operations. **Important:** just creating a TypeScript adapter does **not** invoke any of those functions, make a FIDS GET or write a PRE. A later independently reviewed workflow must wire it to genuine future live flight data.

## Why are we doing this after Stage27?

We could grant everything to one application's database user and make code run immediately, but then the same compromised actor could edit an original FIDS source, invent a PRE snapshot, and write its own “independent” T24 witness. Such a record would not be independently trustworthy. Four restricted groups + four separately permitted logins prevent that *lower-privileged* crosswrite. The trusted database owner can still administer those roles.

## What tests are real versus synthetic?

[Stage28 dedicated PostgreSQL16 workflow](../../.github/workflows/phase5-stage28-dedicated-pg16-role-session.yml) uses GitHub's **disposable PG16** to install the genuine B0062→V79→V80→V81 schema plus four group roles, then creates **CI-only** login roles and grants two exactly scoped `SET TRUE, INHERIT FALSE, ADMIN FALSE` memberships. It checks:
- PRE group login can SELECT and INSERT only PRE-related permitted data, cannot INSERT original/witness.
- Source group login can assume source group, but cannot switch into PRE.
- Login without group membership cannot impersonate PRE.
- Using the app login for a dedicated worker is refused.
- After `client.release()`, a pooled connection never retains the old `SET ROLE` identity.
- No real provider GET, Alert create, flight record, production login or production role membership is created.

A green Stage28 test proves the **connection/privilege mechanism**, not that source contents or POST/actual departure have been collected.

## What comes next in Phase5?

The next production engineering milestone would be a **separately reviewed login/secret/membership commissioning** with one role per GitHub worker and no reuse of the Replit runtime identity. Actual full source READ/WRITE activation still requires approved provider normalized Contents purpose/retention, physical-leg/native T evidence, signed 31 batch-day window and budget plan, correct GitHub prearm and physical GET original → genuine T24 PRE, independent Stage17 witness → genuine T6/T90 PRE, and later POST/Alert/AIRBORNE independent audit.

We do **not** need to revisit the already documented RapidAPI tier/balance emails, re-install the eight V79/80/81 tables, or re-create the four installed NOLOGIN roles.

**Actual status:** Stage23 production schema DONE; Stage27 production group roles DONE; Stage28 scoped session adapter currently staged CI; **zero runtime login memberships and zero active paid producer**; Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.

## Section B programming refresher

When reading the Stage28 TypeScript file:
- `import type {Pool,PoolClient} from "pg"` tells TypeScript the shapes of PostgreSQL connections; it does **not** make a DB connection.
- `interface P5Stage28DedicatedSessionPermit` declares the expected fields of an authorization object, not a database permission by itself.
- `await client.query(BEFORE, [expected])` sends a **SQL SELECT string** and a separate SQL parameter array to PostgreSQL. `$1` in the SQL refers to `expected`, not to a JavaScript variable named `$1`.
- `const a=membership.rows` creates an ordinary JavaScript variable containing PostgreSQL's returned rows. `if(a.length!==1)` is a **runtime assertion**, not a type-checking declaration.
- `await client.query("SET ROLE "+expected)` sends a SQL **session authorization change**. This is safe here only because `expected` came from a static, exact source-code whitelist.
- `try { ... } catch(e) { ... } finally { ... }` is **JavaScript exception control**. PostgreSQL `BEGIN/COMMIT/ROLLBACK` in the deeper PRE writer are separate **database transaction controls**.
- `client.release()` destroys a session carrying `SET ROLE`, preventing a later borrower from unknowingly inheriting the same privileged PostgreSQL `current_user` session state.

This document records new engineering work without altering the historical implementation log or falsely calling the experiment's 31-day scientific FREEZE accepted.
