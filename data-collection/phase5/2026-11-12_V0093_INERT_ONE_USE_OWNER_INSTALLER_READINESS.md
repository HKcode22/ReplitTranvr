# 2026-11-12 — V0093 only, inert one-use owner PostgreSQL16 installation wrapper

**STATUS: CODE/CI CANDIDATE. Real Neon V0093 is NOT installed by this PR.** No prospective 31-day calendar has been signed, source rights authenticated, seven category row staged, physical GET attempted, or paid Phase6 GO granted. Existing V0079–V0092 schemas were already owner-installed and **MUST NEVER BE REINSTALLED**.

## Why this is the next Phase6 P0 operation, not more optional ADSB/BTS research

Merged [#607](https://github.com/HKcode22/ReplitTranvr/pull/607) implemented and independently tested **staged** [V0093 additive cost-only V0082 compatibility SQL](../../migrations/staged/V0093__phase5_v0082_typed_cost_only_upper_bound_inert_v39.sql). Merged [#608](https://github.com/HKcode22/ReplitTranvr/pull/608) implemented and real PG16-tested its restricted B0062→V0079→V0093 **budget-only seven-category transactional writer**. In production as of the last known actual owner Neon cold-start readback, V0087–V0092 were installed inert, source/flight/REST category rows zero, and V0093 was NOT installed. The missing narrow step is to commission V0093 **schema only** without accidentally reinstalling another migration or enabling collection.

## New one-use owner installer and proof gates

[Source](../../scripts/v39_phase5_v0093_one_use_owner_inert_schema_install_once.mjs) implements an exact source Git-blob hash check of the only permissible V0093 SQL. It rejects any altered migration, unexpected privilege expansion or missing exact V0093 migration clauses, and refuses production execution without a separate owner consent token explicitly containing `LEAVE_AUTH_DISABLED_NO_PAID`, no CI endpoint, API keys removed from the one-off process environment, `ADB_AUTO_COLLECT=0` and `V39_PHASE6_PROCESS_ARMED=0`.

It connects as the **actual preexisting `neondb_owner` PostgreSQL16 primary**, NOT the runtime/source role. Before DDL it starts a real `REPEATABLE READ READ ONLY` transaction, verifies exact existing V0082 tables/trigger-function, confirms the original source-grid column still NOT NULL, no cost-only typed columns, no source-query/attempt/partition rows or seven-category release, and B0062 not enabled/revoked. One B0062 **disabled** authorization row is permitted (or zero if prelaunch still empty). **If V0093 already exists, refuse replay.** Every table row count is captured.

Only then it passes the exact real reviewed V0093 SQL through a **single Node PostgreSQL simple-protocol request**; the SQL includes its own PostgreSQL SERIALIZABLE BEGIN/COMMIT, and adds typed `COST_UPPER_BOUND` metadata/trigger compatibility while preserving the default `EXACT_SOURCE_GRID`. The wrapper does not alter role grants/credentials or fire an external API. After DDL, a new **READ ONLY** catalog check verifies the two new V0093 columns, source-grid column now nullable, B0062 still unenabled, all original source tables still zero and **all before/after row counts unchanged**. A failed or COMMIT-uncertain attempt is HOLD with **NO automatic retry**; determine exact actual state independently with read-only inventory before contemplating a new run.

**An owner installer success means only an INERT type-compatible SCHEMA exists.** It is *not* B0062 31-day calendar or V0079 UTC budget input; *not* V0093 cost-only release row; *not* per-day airport draw; not genuine source PRE. Separate restricted-stage role and signed calendar/range/source-use budget must follow.

## Tests

[Wrapper node test](../../tests/phase5_v0093_one_use_owner_schema_wrapper_v39.test.mjs) validates real existing V0093 migration bytes/hash and fails modified payloads, fake PG16 owner read-only catalog, disabled vs enabled B0062, zero source, exact one-shot DDL, typed schema readback, replay refusal, wrong runtime/replica and deliberately injected COMMIT uncertainty with **one request only**. Dedicated [no-provider workflow](../../.github/workflows/phase5-v0093-owner-wrapper-no-provider.yml) runs these cases. Existing PR #607/#608 disposable real PG16 tests separately prove actual SQL and budget trigger semantics. **This PR's new fake-client tests do not claim production installation or repeat the actual DB test with real source.**

## Actual owner/CI workflow separation

1. Merge this wrapper only after all exact PR-head checks PASS. Preserve a specific reviewed main commit PIN and exact Git **blob** hashes for the wrapper + V0093 SQL. Private Replit shell may download just these two exact files to a fresh private `/tmp/p5-v0093-owner-XXXXXXXX` directory; do not mutate an existing local repo checkout.
2. The owner-only script refuses the deployed runtime role, replica or partial production install. It will permanently refuse a second V0093 attempt. No ADB keys or webhook secret are accessible to the one-shot process. No Replit AI Agent/Cloudflare.
3. Independently read-only verify `pg_attribute` V0093 columns, original B0062/V0079/V0082 status/ACL and zero source rows. Preserve owner receipt in `data-collection/phase5`.
4. Separately sign the prospective corrected 5-pair / 21 unknown future-airport 31-day calendar, independent seeds, provider range and source-use/retention rights, exact 7 category physical UTC reserved budget. Then commission narrowly scoped two-stage B0062 disabled authorizer / V0093 category freezer and independent readback. No need to wait on vendor email for code/test tasks.
5. Independent finite Phase5 science FREEZE, actual GitHub-only T24/T6/T90/source POST/STOP readiness, and separately authorized paid Phase6 GO. Missing source/ADSB/BTS auxiliary fields are scientifically accepted as NULL with metadata, not silently backfilled.

**Safety: NO V0079–V0092 reinstall, NO production source/flight rows, NO paid GET, NO live queue dispatch, NO scientific FREEZE or paid GO.**
