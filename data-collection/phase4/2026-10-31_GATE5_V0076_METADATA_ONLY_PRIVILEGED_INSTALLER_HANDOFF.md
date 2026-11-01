# Phase4 Gate5 — one-time V0076 metadata-only privileged Replit installer

**2026-10-31 PDT / 2026-11-01 UTC**. Binding Plan V3.9 f.8 §§5–7, 16–17. No changes to canonical Implementation Log or Phase 3.

## Grounded reason / permission audit
[Actual protected production check #41280104809](https://github.com/HKcode22/ReplitTranvr/actions/runs/41280104809) on merged PR #309 returned \`V0076_OBJECTS_ABSENT_RUNTIME_LACKS_SCHEMA_CREATE\`, \`cleanSchemaExists=true\`, \`canUseCleanSchema=true\`, \`canCreateWithinCleanSchema=false\`, \`v0076ObjectsObserved=0\`; zero provider or production writes. A privileged **distinct** existing Replit \`DATABASE_URL\` might solve this; **not yet verified**. User received a one-time read-only Replit check for \`DATABASE_URL\` and \`V39_DATABASE_RUNTIME_URL\`, printing only clean USAGE/CREATE booleans; await its output before requesting a real installer.

## What code is prepared
- \`scripts/v39_phase4_gate5_v0076_metadata_only_installer.ts\`: one-use opt-in with exact source Git blob SHA \`c74b3d9d2cc635e8fa604f81f6c91595ea558f2f\` (staged V0076 SQL **unchanged**); separate exact environment intent and blob pin. It refuses missing or identical privileged/runtime URLs, PostgreSQL before 16, missing original science schema, nonrestricted runtime user, missing CREATE in privileged role, different database names, or any existing/partial V0076 object.
- The code inspects both connections in **READ ONLY** first. If reviewed and permitted, a separate privileged metadata-only transaction locks \`pg_advisory_xact_lock(76,39)\`, rechecks all target objects absent, installs the existing immutable SQL, asserts four new LOGGED tables are **empty** and the reservation function is **not executable by PUBLIC**, then COMMITs. On any error, ROLLBACK. It grants no runtime role, activates no paid source owner, and never calls AeroDataBox.
- Tests affirm exact source pin, operator intent required, distinct privileged/runtime roles and science schema, partial-existing refusal and no provider code.
- A new GitHub workflow deploys and tests the actual installer **only on disposable PostgreSQL16**, with fake \`postgres\` admin and \`gate5_worker\` unprivileged roles and placeholder historical table names, and asserts empty V0076 tables and revoked PUBLIC function. **It contains no production secrets and never touches real data**.

## Sequence / scientific safety
1. Four mandatory PR CI and merge, then independent actual disposable two-role PG16 installer test must pass.
2. User supplies the one safe readonly Replit roles output. Do not print URLs, user names, API keys, or run unreviewed installer if \`DATABASE_URL\` has no clean CREATE.
3. If privileged connection exists and protected original schema matches, give exact one-time blob-locked metadata installer invocation **in a follow-up**, no manual timestamps. Complete with independent post-install read-only verification.
4. Distinct future exact runtime GRANT/owner production release still requires scoped review; this installer alone does not authorize any REST debit.
5. Unverified AeroDataBox first native selected T / actual-only runway and physical operating identity (issue #200), account-specific raw/normalized/backups retention (#300), live three-horizon prospective source and certified PRE/capture/outcomes (#293) continue strict Gate5 HOLD. No Oct31 T−6h backfill, no Phase5 freeze or Phase6.

**No Replit installation command has been given or executed.** This checkpoint is a verified technical readiness step, not a provider/rights certificate.
