## October 20, 01:xx PDT — signed PREPARED atomic transaction integration test (draft only)

**New source/test commits:** `f9ebcab2864793023365bac656b4ab0cb710d4ef`, narrowed `pg.Client` typing fix `f5e20a4631c264fa6573e98589f2c4c2cf8d9989`. Added `tests/phase3_gate05_signed_prepared_atomic_disposable_pg_v39.test.ts`. It is guarded to GitHub Actions `NODE_ENV=test` on **literal localhost** PostgreSQL `v39_ci` with empty `AERODATABOX_API_KEY`. No production SQL path or deployable commissioning entrypoint was added.

**What the integration test actually exercises:** generates an **EPHEMERAL self-pinned Ed25519 test key** (not an authenticated owner/signing root or paid approval), signs a new future one-hour-or-less exact WSSS authorization artifact; verifies signature and independent-byte SHA, tests forged signature and substituted signer pin HOLD before any SQL; derives fixed 2-statement PREPARED-only plan; installs staged V0066/V0067/V0068 inside an outer disposable PG16 `BEGIN` with advisory test lock; checks zero open scopes; injects a PostgreSQL `22012` error after the first scope INSERT then rolls back a SAVEPOINT and verifies no orphan scope; then atomically inserts exactly one PREPARED row and two allowed hashes, confirms post-insert inventory and strict exact-row SHA read-back, all counters zero and no ACTIVE/paid state, rejects replayed authorization with `23505`; finally rolls back all schema/role/data changes. It never invokes the FIDS provider, existing Alert credits, or actual deployment. This tests an *end-to-end simulated preparation sequence*, **not a production commissioner** and does NOT certify human signer identity, plan rights or grant role privileges.

**CI observed when checkpoint authored:** on exact source commit `f5e20a46...` three focused workflows SUCCESS, V3.9 Offline Safety TypeScript and offline V3.9 tests SUCCESS, full suite still in progress. Check complete four-workflow conclusion before claiming verified final PASS. Prior October 20 checkpoint HEAD `8a595a5fd9c3b89253e4c8ba4b187f2ba538a084` all four workflows SUCCESS.

**NO-GO boundary maintained:** October 19 late-night paid experiment canceled; Oct20 around 15:00 Pacific readiness is an informational reminder only. No owner live spend authorization, no production V0068 installation, no active commissioner or real STOP supervisor, no account-specific RapidAPI plan rights, no refreshed restricted login role, no live WSSS request or credits used, no production queries/writes in this engineering session. Existing dispatch/safety login credentials expire Oct20 02:00 PDT; PostgreSQL password expiry does not revoke existing connections. Last production counts 0/0/0 are OLD prior read-only evidence, NOT independently repeated here.

**Next:** check the latest exact CI result and failures; implement a genuine, separated and independently attestable OWNER consent/trust-root binding and least-privileged one-use production commissioner only under a new explicit authorized change. Develop operational independent STOP watchdog and deployment proof with disposable fault tests, then verify owner plan/tariff/retention and choose a **fresh** future event/execution window. Do not manufacture consent, schedule paid API use or reapply V0066/V0067.

---
# Gate 0.5 — V0068 preflight, one-use authorization and race proof
**Checkpoint date:** 2026-10-20 (PDT)  
**Repository:** HKcode22/ReplitTranvr  
**Draft PR:** #80, branch `phase3/gate05-evidence-first-20261018`  
**Scope:** Offline source/tests only — **NOT a paid run, release, production DB change, or new owner authorization**

## Decision

**NO-GO for a paid WSSS FIDS measurement.** The user canceled the October 19 evening run and chose an informational readiness review around 3 PM PDT October 20. This date is a reminder, not an automatic launch. This session performed **no Replit production DB/role work, provider GETs, API-credit usage, deployment or activated scope**. The production database was **not queried afresh in this session**; 0/0/0 pilot counts were previously observed, not independently reconfirmed today.

## Completed draft engineering

1. **V0068 migration strengthening** — `migrations/staged/V0068__gate05_single_open_scope_v39.sql` remains **STAGED, NOT INSTALLED**. It now proposes three indexes:
   - `gate05_fids_one_open_scope_v39`: database-enforced maximum one `PREPARED` or `ACTIVE` scope; historical `STOPPED` scopes remain.
   - `gate05_fids_one_authorization_id_v39`: an authorization ID cannot be used by another scope, even after STOP.
   - `gate05_fids_one_authorization_sha_v39`: the same reviewed authorization bytes/digest cannot be reused by another scope, even after STOP.
   The unique-index invariant is stronger than a cooperative read-only count, which cannot stop concurrent independent transactions.

2. **V0068 read-only preflight** — added `server/lib/disruption/gate05V0068ReadonlyPreflight_v39.ts`. It emits *two fixed SELECT statements* and strictly interprets the resulting PostgreSQL row arrays: presence of V0066/V0067 tables/functions, NOLOGIN dispatch/safety/commission groups, **none of V0068's proposed index names present**, and zero `PREPARED`/`ACTIVE` scopes. STOPPED history and its queries/attempts may remain. It FAILS CLOSED on absent catalog objects, an existing/partial V0068 index, active/open scopes, broken accounting, malformed counters and invalid row shapes. This is **pure source planning**; it has no database client, no secrets, no network call, no authority to install DDL. The review explicitly does not independently attest which database the caller read.

3. **Disposable PG16 tests** — `tests/phase3_gate05_v0068_readonly_preflight_v39.test.ts` applies staged V0066/V0067/V0068 solely under a rollback-only transaction on CI's literal localhost `/v39_ci` with an empty provider key; tests preinstallation snapshot, open-scope HOLD, STOPPED history acceptance and index-already-present HOLD. `tests/phase3_gate05_authorization_artifact_v39.test.ts` checks per-authorization one-use constraints, post-STOP replay attempts and fresh new AUTH. `tests/phase3_gate05_open_scope_race_disposable_pg_v39.test.ts` mirrors the three indexes on a uniquely named disposable CI table, uses two real PG connections for an uncommitted competing insert and checks immutable ID/digest replay after STOP, before dropping the ephemeral table.

4. **CI incident openly recorded:** the first preflight unit tests mistakenly passed plain objects to a function correctly requiring `pg.query(...).rows` arrays; three focused unit assertions failed, not a production incident. Commit `c5abf41e1fea5e82ee5d0cb8d0215985fd2fe1e2` corrects the fixtures without relaxing production input validation and adds an explicit negative test for plain-object input. Earlier red commits are not treated as successful.

## Current exact source commits (draft branch)

- `40484ec7d34aac221bfb5ca4cd953495cf883d77` — V0068 pure read-only preflight
- `9c4a066ba0ce72e2c5623a0d646ce493c3faa8b0` — preflight unit and disposable PG tests (initial fixture-shape failure)
- `91240333e359e3002157cb6ede2be200d9179dd0` — permanent one-use AUTH ID/SHA indexes
- `b017af9454a4f2de754bcf1a08234505b5b52487` — authorization-history/replay tests
- `dc4062120f4a09439a0806950de47cb1fb68eb38` — independent two-connection race and replay tests
- `66d45abf4e2f75404b55d91b3409bf32d1e8a238` — read-only preflight detects any of three V0068 index names
- `c5abf41e1fea5e82ee5d0cb8d0215985fd2fe1e2` — fix preflight test fixture shape, retain strict real input checking

**Verification at checkpoint authoring:** On corrected source `c5abf41e...`, three focused GitHub workflows **SUCCESS** and V3.9 Offline Safety TypeScript, offline V3.9 tests, full test suite and lint **SUCCESS**; aggregate Phase0 preflight and full workflow still in progress at the most recent check. **Do not claim 4/4 on this exact commit until its final result is checked.** Prior source/checkpoint `b9a02914...` passed all four GitHub workflows.

## Remaining required gates before any live measurement

- Confirm the exact applicable AeroDataBox/RapidAPI subscription tariff, API units, provider cycle and raw-data retention rights from the owner's account. Legacy 60,000-unit quota does **not** itself establish those rights.
- Independently attest owner signer/key trust root **and** explicit paid approval for a freshly timed, exact WSSS two-query scope (at most 12 REST API units). A valid Ed25519 signature alone is not proof of human identity or paid consent.
- Perform a separately authorized production **read-only V0068 preflight**, corroborating DB identity and inventory. Separately approve installing and verifying V0068 only if needed; **do not reapply installed V0066/V0067**.
- Implement and approve a least-privilege, one-use atomic production commissioner and later activation, with separate credentials and independently running emergency STOP/expiry supervisor. Previously tested dispatch/safety login credentials expire October 20 at 09:00 UTC (2 AM PDT); credential expiration does not terminate existing sessions.
- Pin/review the exact source deployed to Replit, create fresh future execution and FIDS event windows and fingerprints, reconcile provider balance, and obtain a **separate explicit owner paid GO**. No automatic run or legacy unrestricted FIDS bypass.
- Treat two snapshot GETs as **source feasibility evidence only**, never a full Gate0.5 scientific/statistical PASS or demonstrated runway departure-delay ground truth.

## Starting point for next session

1. Check the final exact-head GitHub Actions result for `c5abf41e...`, and diagnose any failing stage from real logs.
2. Review staged V0068 three-index SQL, preflight/catalog assumptions and preserved STOP history; run disposable tests only until all checks pass.
3. Build a strictly guarded, audited one-use commissioner and detached operational STOP workflow; request new human authorization before any production write.
4. Record all new evidence and commits here or link a new concise dated checkpoint; do not repeat the full historical handoff or generate dozens of redundant reports.
