# Phase 4 Gate 5 — V0078 production **read-only** compatibility catalog guard

**November 3, 2026 Pacific. Engineering-only / no production run.**

## Current handoff

[PR #360](https://github.com/HKcode22/ReplitTranvr/pull/360) merged raw-first original/normalized/V0077 atomicity. [PR #363](https://github.com/HKcode22/ReplitTranvr/pull/363) merged the distinct-flight synthetic source→timely PRE→independent after-cutoff PG16 audit. [PR #364](https://github.com/HKcode22/ReplitTranvr/pull/364) merged a **STAGED, NOT INSTALLED** V0078 candidate migration resolving repeated provider-FIDS originals at one unchanged cutoff. It passed the same-flight/three-originals→one-PRE disposable regression and all five GitHub checks. This is not a scientific Gate 5 PASS or a live provider-collection release.

## Why an independent production read-only catalog probe is required

V0078 replaces the older all-source `flight_population_key` uniqueness constraint with a narrow partial non-FIDS unique index, preserving the `flight_population_observation_key` original-query uniqueness for FIDS. Despite passing synthetic PostgreSQL 16 tests, production may have different foreign-key dependents, unexpected schema or index shape, runtime role inheritance/default ACL, incomplete active FIDS keys, or earlier partial deployment. An unexamined production DDL transaction is not justified.

`scripts/v39_phase4_gate5_v0078_production_readonly_preflight.ts` is a **catalog and aggregate-count probe** for the already configured distinct privileged and unprivileged database connections. It uses two independent `REPEATABLE READ READ ONLY` transactions and returns only non-sensitive boolean metadata, not role names, URLs, flight original or normalized Contents. It checks:
- PostgreSQL 16+, same database and distinct roles; owner membership, restricted runtime inability to own the table/create in `clean`, and both sessions read-only.
- B0062 `flight_population` and original `fids_query_response` existing, V0077 metadata existing and still private to runtime.
- Exact global legacy constraint identity, query-specific unique observation index, absence of staged V0078 replacement, and no foreign keys that depend on the old constraint's backing index.
- Count only (not identities, bytes or rows) of active non-expired FIDS rows without mandatory source/analytic-role keys.
- Already installed or mismatched database/ACL/constraint/catalog is an explicit HOLD, not an invitation to rerun the installer.

Even `V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW` is **not** permission to install. Before any production V0078 DDL, inspect transaction-lock duration/index creation impact, dependent application code, past migrations, retention behavior, production rollback strategy and rights. **No broad runtime GRANT; do not run V0077 again.**

## Disposable PG16 verification

A separate GitHub-only workflow starts a temporary local PostgreSQL 16 service, applies the current B0062 baseline plus staged V0076 and V0077, creates an isolated unprivileged role with only `clean` USAGE, and requires the preinstall catalog-candidate status with zero writes/provider calls. In that disposable service only, it applies V0078 and confirms the preflight now returns `V0078_ALREADY_PRESENT_DO_NOT_REINSTALL_HOLD`. Vitest covers malformed PostgreSQL catalog fields, unexpected dependencies, runtime ACL leaks, role mismatches, already-installed flags and absent observation uniqueness.

This workflow never loads production secrets or AeroDataBox credentials and never makes a live FIDS GET. The script itself may be used for a **separately authorized read-only production operator check**, but this PR neither schedules one nor requests a new Replit command. No scientific cohort is armed.

## Still missing for Gate 5

Independent AeroDataBox **source-use and retention rights**, authoritative provider-native first selected T, stable physical operating-leg/codeshare adjudication, actual prospective on-time PRE across T−24h/T−6h/T−90m, synchronized GitHub-only paid source owner, webhook in/out/unresolved accounting, actual-only POST and AIRBORNE reconciliation, cost/bias/missingness audits and measured pass/fail verdict. The 9/9 Nov 2 source-only GETs remain operational evidence, **not** a measured science cohort and must not be replayed.

Original Plan f.8 and hash-locked Implementation Log unchanged. Gate5 scientific HOLD / Phase5 freeze NO-GO / Phase6 NO-GO. No production migration or paid provider requests.
