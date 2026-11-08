# Phase 5 — SOURCE production credential commissioned; independent read-only GitHub handshake

**Recorded November 7, 2026 Pacific / November 8, 2026 UTC.**

## Production facts (owner-run one-shot result)

The owner executed the exact GitHub-pinned SOURCE commissioner from reviewed main `d1c4cc89c5899fc9408f5df47548b19b552ca5cf`, source Git blob `feb94c7e11515cc8f4566f31b294f9c495aeebf1`. Output:

`P5_DEDICATED_SOURCE_LOGIN_AND_ENCRYPTED_SECRET_COMMISSIONED_INERT`

- **One** new PostgreSQL SOURCE LOGIN: `phase5_p5_source_login_20261108`.
- It has **one SET-only, NOINHERIT, NOADMIN** membership in pre-existing `phase5_fids_source_prod_20261107`.
- One encrypted GitHub Actions secret was created: `V39_P5_SOURCE_DATABASE_URL`. No password or URL was printed.
- **Zero** provider FIDS GETs, Flight Alert creations or flights written; no active source collection.
- `sourceContentsRightsCertified=false`, `paidSourceWorkerActivated=false`, `phase5FreezePassed=false`, `phase6PaidGo=false`.
- Nonfatal legacy `pg-connection-string` SSL compatibility warning did not stop the successful commit.

This installation is **already done in production**. **Do not run the commissioner again**, and do not reinstall Stage23, Stage27, Stage30 or Stage31. The previous three real PREPARE/PRE/WITNESS worker secret→PostgreSQL sessions were independently validated in [Actions #42438676554](https://github.com/HKcode22/ReplitTranvr/actions/runs/42438676554).

## Why verify SOURCE again in GitHub?

Production commissioning reported success from Replit Shell, but it did not prove the later GitHub Actions runner can authenticate with the encrypted SOURCE secret, use the exact SOURCE group and read catalog metadata. [Standalone GH workflow](../../.github/workflows/phase5-source-real-github-readonly-metadata-manual.yml) is a **manual-main-only no-provider** workflow with literal confirmation `VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER`, `permissions: contents: read`, no schedule, no pull-request trigger, and only **one** secret made available to its verification step.

The [verifier](../../scripts/v39_phase5_source_live_github_readonly_once.ts) checks real SQL `session_user` (reviewed SOURCE login), `current_user` (reviewed SOURCE group), PostgreSQL 16 group membership and exclusive `SET ROLE` via existing Stage28 adapter. It executes:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database(), current_user, session_user,
       current_setting('transaction_read_only'),
       pg_is_in_recovery();
ROLLBACK;
```

The query reads **metadata only**: no `fids_query_response`, `flight_snapshots`, candidate flight member, day budgets, original content, POST or payload SELECT. No stored function `reserve_phase5_fids_physical_get_v39` or `prearm_phase5_fids_github_query_v39` is called. Neither the provider API key nor webhook secret is passed into the workflow. Errors are deliberately sanitized, and the PostgreSQL client is destroyed after role switching.

**Nonpaid disposable CI:** the SOURCE-login commissioner integration fixture generates a genuine locally scoped login and a mock GitHub Actions secret; the same verifier authenticates using this credential on temporary `localhost:5432` PG16, and tests refusal for a remote/production URL and for a provider key. The CI path refuses real secrets, external hosts and the non-main/PR context mismatch.

## One actual workflow dispatch, not another installer

After all PR checks pass and the merged workflow and verifier are reviewed, run **one** GitHub workflow dispatch from the merged main, never from a PR branch. Exact command can be generated from verified Git blobs:

```bash
gh workflow run phase5-source-real-github-readonly-metadata-manual.yml \
  --repo HKcode22/ReplitTranvr --ref main \
  -f confirm=VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER
```

A successful dispatch is **not** success of the SQL check; inspect the completed run and its sanitized `P5_SOURCE_GITHUB_REAL_READONLY_ROLE_VERIFIED` result before updating the ledger. If the run fails, retain the installer success but keep the live connectivity claim unverified; diagnose networking/login/ACL/secret metadata without trying to reinstall production logins or creating a paid GET.

## Next research-critical work

This source-identity handshake is *infrastructure*, not independent legal permission or a live scientific flight PRE. The next real problem is the circular requirement for `adb_phase6_authorization.enabled` in the early draw and Stage9 PREPARED admission while Phase5 needs prospective genuine PRE evidence before Phase6 GO. Solve through a **distinct, bounded Phase5 evidence-pilot authorization**, independently reviewed and time/airport/query/REST/retention scoped; do **not** toggle the 31-batch-day Phase6 authority to fake Phase5 acceptance. After that, resolve [provider source-use rights #300](https://github.com/HKcode22/ReplitTranvr/issues/300), one genuine before-cutoff four-airport draw, FIDS original, T24/T6/T90 PRE and independent witness, POST, and the 31-batch-day solver/7 REST budget and final review.

Scientific `phase5FreezePassed=false`; `phase6PaidGo=false`. **No future Phase5 engineering checkpoint is required to be numbered.**
