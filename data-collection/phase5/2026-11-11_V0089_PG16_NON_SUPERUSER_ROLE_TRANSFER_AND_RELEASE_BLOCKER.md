# Phase 5 — PostgreSQL 16 V0089 real non-superuser ownership correction

**Nov 11, 2026.** Live Replit team `neondb` has already installed **V0087 inert queue**, 0 tasks, original snapshot trigger intact, runtime no queue grants, provider spend zero. **Do not re-run V0087.** PRs #572 (real V0087→existing Stage14) and #573 (Amendment E first source-bound FIDS origin/destination fields) were merged and passed CI. PR #574 introduced staged V0089 least-privilege NOLOGIN guard ownership; it also passed its previous tests **under the disposable PostgreSQL superuser**.

## Why another PG16 test is needed (a concrete blocker, not a new architecture)

PostgreSQL16 **does not automatically let a non-superuser with CREATEROLE `SET ROLE` to a new role**. Creating `phase5_cd_admission_guard_owner_v39` implicitly gives its creator administrative membership with **SET FALSE, INHERIT FALSE**. But `ALTER FUNCTION ... OWNER TO` requires the function's current owner to be able to **SET ROLE to the new owner**, plus grant that owner CREATE on the containing schema during transfer. See official docs: [PG16 role attributes](https://www.postgresql.org/docs/16/role-attributes.html), [PG16 ALTER FUNCTION](https://www.postgresql.org/docs/16/sql-alterfunction.html), [PG16 role membership GRANT](https://www.postgresql.org/docs/16/sql-grant.html).

There is a second ordering issue: after a real non-superuser transfers function ownership to a distinct NOLOGIN role, it ordinarily cannot issue `GRANT` or `REVOKE` of that function's privileges anymore. Our previous superuser CI did not detect either problem.

## Exact code correction

The STAGED V0089 SQL **now performs all existing-function ACL GRANT/REVOKE work before transferring ownership**. Its transaction grants a temporary creator-issued **SET TRUE, INHERIT FALSE** membership from the newly created NOLOGIN guard role to the current non-superuser schema owner, verifies effective SET ability, grants the guard temporary schema CREATE, transfers **only the V0088 admission and scoped snapshot functions**, revokes CREATE, then revokes the creator-issued membership grant and verifies **SET is no longer possible**. An original implicit ADMIN/SET FALSE administrative membership can remain, as dictated by PostgreSQL 16; that privilege is not a worker credential or an independent security boundary against the DB owner.

The test workflow `.github/workflows/phase5-v0089-pg16-nonsuperuser-owner-transfer.yml` creates a real local `postgres:16` DB, bootstraps V0079/V0087/V0088, simulates the real non-superuser `neondb_owner` ownership arrangement using **`phase5_cd_ci_owner` LOGIN CREATEROLE**, then executes V0089 **as that non-superuser**. It verifies no lingering SET role, exact function owner, no direct PRE queue UPDATE, and NOLOGIN PRE group guard EXECUTE. All provider/API/Phase6 flags off; no live credentials, live DB or source payload.

**Critical distinction:** This test is a *production-identity compatibility preflight*, not a live Neon migration or live permission verification. It does not authorize activating V0088/V0089 in the owner database. An eventual one-shot production installer must verify `neondb_owner` actually owns or has proper grant authority on every object, schema permissions and trigger compatibility, perform an atomic migration or HOLD with no half-deployed privileged trigger, and independently verify the resulting function owner and public/runtime grant lockdown.

## Phase 5 remaining track, no repetition

The Phase 5 end-of-this-week **Nov 13** checkpoint and outside **Nov 20** readiness target remain planning goals. Next: verified role-commissioner/atomic V0088+V0089 installer for owner, narrow GH source/worker credentials, bounded automatic due task controller/watchdog/STOP and unknown-COMMIT reconciliation, then real Amendment E licensed/status/weather/historical as-of features and physical delay-minute labels. **Phase5 FREEZE HOLD, Phase6 paid GO NO** until separate independent validation; accept bounded coverage/missingness, never backfill a PRE or invent source rights. V0087 lives and should not be reinstalled.
