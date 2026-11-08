# Phase 5 Stage 31 — Verify the three real GitHub worker logins with **READ ONLY** PostgreSQL

**2026-11-07 UTC | Production execution requires a separate owner-approved, manual GitHub Actions run.** This checkpoint follows authenticated owner evidence of `P5_STAGE30_THREE_NONPAID_DEDICATED_GITHUB_LOGINS_COMMITTED_INERT`: exactly three production PostgreSQL LOGINs created and three encrypted Actions secrets stored. No password was printed. Stage23 schema and Stage27 NOLOGIN groups remain installed. **Do not re-run Stage23, Stage26, Stage27, or Stage30.**

## Why Stage 31 rather than another installer?

Stage30's owner result means the DB role objects and GitHub secret *names* exist, but the remote GitHub runner has not independently connected using those secret values. A GitHub workflow can fail because of network/DNS, SSL, secret permissions, invalid URL formatting, wrong `session_user`, incorrect `SET ROLE`, or misplaced privileges, even if role creation itself succeeded. We must test that **actual GitHub-to-PostgreSQL connection** before using it for a real PRE or independent witness.

The [Stage31 source file](../../scripts/v39_phase5_stage31_three_nonpaid_live_readonly_github_workers_once.ts) imports the **real Stage28** adapter. For each of three independent secrets, it:
1. Requires `GITHUB_ACTIONS=true`, `workflow_dispatch` from `refs/heads/main`, a precise review acknowledgement, and explicitly disabled source collection/Phase6; a separate **PR-only disposable PG16 test mode** never accepts an external DB host.
2. Loads the secret only in memory, parses its URL, and checks that its username matches the exact **reviewed** nonpaid login identity. It deliberately does **not** print any URL, password, secret value, or environment dump.
3. Calls `makeP5Stage28DedicatedRolePool(...).connect()`: the underlying PostgreSQL session authenticates as the dedicated login; the adapter checks `pg_auth_members` and transitive role rights, then runs `SET ROLE` to precisely one NOLOGIN group and refuses any cross-group access. Every connection is destroyed on release so the switched role cannot leak into another worker.
4. Starts a **`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`** transaction and runs a single metadata-only `SELECT` for `current_database()`, `session_user`, `current_user`, `transaction_read_only` and standby status. It checks the expected database is `neondb`, the group and login pair is right, and the current transaction is READ ONLY on a primary. It then `ROLLBACK`s and releases the connection. No source table, `flight_snapshots`, budget, Alert or health data is selected.
5. On successful three-worker verification, prints only group names and boolean results, `flightRowsRead=0`, `flightRowsWritten=0`, `providerFidsGets=0`, and `phase5FreezePassed=false`. Any fail produces only a short sanitized status, not credentials.

### Exactly what are the credentials?

| Nonpaid worker | Secret passed only to manual production workflow | Expected effective PostgreSQL role |
| --- | --- | --- |
| PREPARE | `P5_V39_PREPARE_DATABASE_URL` | `phase5_fids_prepare_prod_20261107` |
| PRE | `P5_V39_PRE_DATABASE_URL` | `phase5_fids_pre_writer_prod_20261107` |
| Witness | `P5_V39_T24_WITNESS_DATABASE_URL` | `phase5_fids_t24_witness_prod_20261107` |

**No source worker login** or `P5_V39_SOURCE_DATABASE_URL` was provisioned by Stage30. No AeroDataBox key is provided to Stage31. This does not address normalized Contents ML/backup-use rights, selected T or physical operating-leg scope under issue #300; those remain separate.

## Two deliberately separate GitHub Actions workflows

- [PR-safe disposable PG16 CI](../../.github/workflows/phase5-stage31-three-nonpaid-disposable-readonly-pg16.yml): trigger on PR/push; install B0062→V79/80/81 and Stage27 NOLOGIN groups only **in GitHub's temporary localhost PG16**; create three CI-only logins with the real role names and dummy `ci-only` passwords; test all three read-only SQL sessions using the production verification code, missing-secret refusal, wrong-login refusal, outside-host refusal, and forbidden provider key. **No real GitHub Actions secrets passed**, no production calls.
- [Manual-main-only production read-only verification](../../.github/workflows/phase5-stage31-three-nonpaid-production-readonly.yml): **`workflow_dispatch` only**, refuses any non-main ref or missing exact `VERIFY_NONPAID_ROLES_READONLY` confirmation. Has repository `contents:read` only; supplies precisely the three Stage30 secrets on the verification step, with no source credentials, no provider API call, no write permission, and no regular schedule. It does not run automatically upon merge.

To run after PR merge and exact-head checks, the owner must dispatch that reviewed main-only workflow (or the assistant may dispatch through an available GitHub Actions connector with suitable permission). This is **not** another Replit database installer and does not require re-entering or displaying any secret. Independently inspect its GitHub Actions result and archive the safe status in [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). If the workflow fails, do not treat the credentials as authenticated or use them for PRE; diagnose exact sanitized refusal.

## A code-reading lesson: why READ ONLY is more than a label

TypeScript:
```ts
const client = await strict.connect();
await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
const result = await client.query(
  "SELECT current_user AS effective_role, session_user AS actual_login");
await client.query("ROLLBACK");
client.release();
```

Here the string inside `client.query()` is **PostgreSQL syntax**, not TypeScript. `BEGIN READ ONLY` is enforced by the database itself: it does not just rely on a comment or the script's promises. `current_user` is the *currently active* NOLOGIN group's permissions after `SET ROLE`, while `session_user` is the dedicated LOGIN whose secret GitHub supplied. `ROLLBACK` ends the transaction and `release()` destroys the role-switched connection.

The source adapter's initial metadata checks occur before the explicit read-only transaction; they contain only catalog SELECTs and `SET ROLE`, no database writes. Running `SET ROLE` changes the **connection session state**, not persistent PostgreSQL roles or database rows. We never make a `SELECT` call to any of the mutable source budget-reservation functions.

## After real Stage31 verification

The next operational work is to wire the nonpaid PREPARE/PRE/WITNESS workers into an **exact reviewed GitHub-only future-event workflow**, with authentic frozen calendar/draw and source evidence, not to rerun the account or role installers. **No PRE can be backfilled after its original cutoff.** The paid FIDS source producer remains a separate hold until provider purpose/retention rights, native first T/physical-leg proof and the day-budget/calendars are adequately reviewed.

**Scientifically:** Stage31 success is *infrastructure readiness*, not a 31-day scientific FREEZE, full real three-PRE data collection, or paid Phase6 GO. Those statuses remain `phase5FreezePassed=false` and `phase6PaidGo=false`. Historical implementation log stays unchanged; a dated, justified prospective amendment to the plan is allowed where evidence supports it.
