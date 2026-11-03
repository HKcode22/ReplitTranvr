# Phase 4 Gate 5 — V0078 production catalog READY, bounded one-time installer

**Date:** November 3, 2026 Pacific. **State:** production read-only catalog preflight validated by the owner; versioned installer under GitHub review. **NO V0078 production DDL has been run yet.**

## Actual owner-supplied production evidence

The owner ran the exact detached-worktree read-only probe from merged PR #365, source commit `63977703cf0e565fef9c37268b88e334c8b0c37e`, script blob `8451f0c20325996c3fe8056c0fb4423850db2c04`. Output status was:

`V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW`

All reported flags were true for same database/different roles, PostgreSQL 16+, both read-only transactions, privileged owner and restricted runtime separation, unchanged private installed V0077, exact legacy source-independent uniqueness, valid new query-specific FIDS identity index, no already installed V0078, zero foreign-key dependents of the old constraint and zero nonexpired FIDS observations with missing mandatory identity/role fields. The command used **zero provider calls and zero database writes**. The SSL warning was a driver-upgrade semantic warning, not an observed failed TLS connection. No roles, credentials or flight records were printed.

This **removes the catalog blocker**, not the legal rights, paid release or scientific release gates. Do not mislabel it `installed` or `Gate5 PASS`.

## Exact production action now under review

`scripts/v39_phase4_gate5_v0078_one_time_exact_sql_installer.ts` is a separate explicit-entrypoint script, not part of boot migrations. It requires:
- owner intent `V0078_ONE_TIME_ORIGINAL_FIDS_OBSERVATION_UNIQUENESS_NO_PROVIDER_NO_GRANTS`, exact expected migration Git blob and disabled auto-collection/Phase6;
- independently repeat the two-role read-only catalog preflight **in the same run** and refuse unknown/repeated installation;
- acquire one transaction-scoped migration advisory lock and an exclusive `clean.flight_population` schema lock with NOWAIT and bounded statement/lock timeouts;
- check unchanged original B0062 constraint, per-query unique FIDS key, zero legacy dependent FKs and missing identity rows **under the lock**;
- apply **only** the SHA-locked staged V0078 SQL inside one SERIALIZABLE transaction, replacing legacy global uniqueness with the exact non-FIDS-only partial unique index, without modifying any provider data, retention, table privileges, ownership, RLS or triggers;
- compare the exact query-level uniqueness and table privilege/owner/trigger metadata before **COMMIT**, followed by independent two-role read-only verification **after COMMIT**.
- on precommit errors, rollback and report stage name/SQLSTATE only. On ambiguous COMMIT errors, require independent read-only verification and **never blindly rerun**.

The migration remains in `migrations/staged/`, preserving rollback/override of automatic application and strict GitHub-only reviewed operator cadence. Its comments now explicitly permit production use **only** via this installer. The existing baseline, Plan f.8 and hash-locked Implementation Log are not rewritten.

## Exact offline proof

A GitHub-only test boots temporary PG16, applies only baseline plus staged V0076/V0077, separates test owner/runtime roles, and executes the production installer **without provider keys or production URLs**. It first holds an independent advisory lock and requires fail-closed/unchanged schema. It then releases the lock, executes the installer once, requires independent read-only post-install recognition, and confirms a second attempt refuses before any write. Unit tests cover SQL/hash/intent controls, permissions, lock-time catalog and secret-safe errors. This is stronger than the earlier raw `psql -1` migration test.

The actual production command is provided **only after all exact-head GitHub workflow checks pass**. It will be one detached-worktree command pinned to the merged commit and reviewed script+SQL blobs, not an operator timed to a live flight or a manual multi-step process.

## Remaining Gate5 requirements (not waived to accelerate)

Lawful AeroDataBox FIDS Contents use and derived-target retention, actual provider-native first selected `departure.scheduledTime.utc` (not a generic reconstructed proxy), strict physical operating flight/codeshare denominator, reviewed prospective three-horizon manifest, GitHub-only paid owner with reserved budget and real FIDS originals, on-time original→V0077→PRE, webhook in/out/unresolved and true POST, actual-only wheels-off / airborne source and restrictions, source age/expiry/selection bias and independent audits, and a measured scientific verdict. Null/missing fields must remain unknown; small documented technical missingness cannot be silently converted to source success. Preserve Nov2 9/9, 18 units as source-only pilot without replay.

**Gate5 scientific HOLD; Phase5 freeze NO-GO; Phase6 NO-GO.**
