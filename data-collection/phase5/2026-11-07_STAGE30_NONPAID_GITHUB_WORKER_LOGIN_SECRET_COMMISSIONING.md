# Phase 5 Stage30 — Three nonpaid GitHub worker identities and encrypted secrets

**November 7, 2026 UTC.** The production **eight source/PRE/witness tables** were installed by Stage23, and four **NOLOGIN permission groups** were commissioned by the owner in Stage27. Stage28 merged a strict PostgreSQL `SET ROLE` adapter after five green checks. Stage29 exercises the **real PRE→independent witness software** on disposable PG16 (PR #460; exact merge status must be checked). A NOLOGIN group cannot itself connect. Stage30 addresses this **real operational dependency**, without activating a paid source collector.

## What this would install, but has not yet

An exact-reviewed, one-time owner command would provision three *different* PostgreSQL **LOGIN** identities assigned to the already installed Stage27 group roles, and store their randomly generated connection URLs as GitHub Actions encrypted secrets:

| Dedicated future worker | Group it may SET | GitHub Actions secret name |
| --- | --- | --- |
| Signed day-plan / prepared budget writer | `phase5_fids_prepare_prod_20261107` | `P5_V39_PREPARE_DATABASE_URL` |
| Single-flight PRE writer | `phase5_fids_pre_writer_prod_20261107` | `P5_V39_PRE_DATABASE_URL` |
| Separate post-COMMIT T24 witness writer | `phase5_fids_t24_witness_prod_20261107` | `P5_V39_T24_WITNESS_DATABASE_URL` |

**Not created:** a paid FIDS source LOGIN, membership to `phase5_fids_source_prod_20261107`, the corresponding source secret, any actual source GET or Alert, any PRE/POST row, or Phase6 scheduler. Provider normalized Contents ML/backup rights issue #300 and native first-T/physical leg are separate science gates.

## How one Node.js file can safely coordinate PostgreSQL and GitHub secrets

Read [`v39_phase5_stage30_three_nonpaid_github_worker_login_secrets_owner_once.mjs`](../../scripts/v39_phase5_stage30_three_nonpaid_github_worker_login_secrets_owner_once.mjs).

1. The **entry gate** demands explicit literal `P5_STAGE30_NONPAID_LOGINS_ONCE` and both distinct primary and runtime database URLs, no `ADB_AUTO_COLLECT`, no Phase6 armed flag. The real source code never constructs a paid HTTP call.
2. A PostgreSQL admin connection with `CREATEROLE` validates PG16 primary `neondb`, the exact three existing **NOLOGIN NOINHERIT group roles**, zero preexisting intended LOGIN roles, and no GitHub secret-name collision. A `SERIALIZABLE` transaction + advisory lock protects simultaneous installers.
3. For each role, Node's `crypto.randomBytes(36)` produces a **72-character hex password** and builds one dedicated URL in **memory** from the existing admin URL, changing only the username/password. It never emits a password or URL to stdout, stderr, GitHub source, logs, files or issues.
4. SQL `CREATE ROLE ... LOGIN NOINHERIT ... PASSWORD ...` creates three narrowly scoped logins **inside the transaction**. SQL `GRANT group TO login WITH SET TRUE, INHERIT FALSE, ADMIN FALSE` permits switching to only one **NOLOGIN** group but denies broad inherited rights and role administration. A readback checks exactly three memberships.
5. The CLI `gh secret set NAME --repo HKcode22/ReplitTranvr --app actions` receives the URL on **stdin**; no secret appears in shell arguments, stdout or a temporary dotenv file. GitHub locally encrypts the value before storing it. The script checks all three names are present **before** PostgreSQL COMMIT; PostgreSQL's new logins remain unusable to other connections until the transaction commits.
6. A failure **before COMMIT** requests SQL ROLLBACK and deletes only the new attempted GitHub secrets (which were verified absent beforehand). If cleanup itself fails, it reports HOLD, never “success”. If COMMIT was **attempted**, the script refuses replay and demands independent catalog/secret reconciliation because the outcome might be ambiguous.
7. After durable COMMIT, it rechecks role attributes/memberships and GitHub secret names. On success, it reports only the three **secret NAMES** and counts, not values. Nothing invokes the roles automatically.

### Why GitHub secrets aren't a magic permission

A **GitHub Actions repository secret** is an encrypted value that an appropriately authorized workflow could read during a future run. Creating the secret is not the same as a worker deploying or making a provider GET. Secrets need careful trust boundaries; they are **not** independently proof that each future workflow is scientifically authorized. The Stage28 adapter still checks the actual PostgreSQL `session_user`, `current_user`, role membership flags, transitive access, and permitted SQL operations on every connection.

**No source producer secret is created** until a separate reviewed actual AeroDataBox source-use/retention and spending release. The PostgreSQL DBA still has administrative authority; lower-privilege GitHub workers do not.

## True tests

[Stage30 disposable PG16 CI](../../.github/workflows/phase5-stage30-nonpaid-worker-secrets-disposable-pg16.yml) applies B0062 + Stage23 V0079/80/81 + Stage27 NOLOGIN groups, then creates a test-only **non-superuser CREATEROLE** identity with ADMIN-only group grants. The test passes a **mock GitHub secrets driver** (an in-memory `Map`): no actual GitHub CLI calls, network, production secrets or flights. The test injects a second-secret failure and verifies rollback removes every new DB login and mock secret; it then tests a successful three-login provisioning and actual Stage28 `SET ROLE` access from each generated URL in PostgreSQL, followed by duplicate/replay refusal.

This tests both systems' *logic* but cannot prove a real GitHub secret upload will succeed until the owner command is executed. If GitHub credential permissions are insufficient, preflight must HOLD rather than falling back to printing passwords or reusing the Replit runtime database connection. All external credentials remain secret.

## After this finite milestone

An explicit future GitHub-only workflow would use **one scoped secret per source-independent operation** (prepared day, T24 PRE, independent T24 witness). A separate paid source worker still needs legal-use evidence and a scoped source login/secret. End-to-end genuine PRE must be recorded at the real flight cutoff; no retrospective replay can replace missing cutoff evidence. Native selected T/physical operating leg, 31 batch-day crossovers, POST/Alert/AIRBORNE and independently signed complete FREEZE remain separate.

**Phase5 final scientific FREEZE HOLD; Phase6 paid GO NO.** No repeat Stage23/Stage27 owner installations, old RapidAPI tier/quota email searches, or misleading “live flight data” claim. The historical implementation log stays unchanged. Evidence-based prospective f.8 amendments remain permissible.
