# Phase5 P0 — real Ed25519 signed run-day index reader/publisher (NO GO)

**Checkpoint:** November 13 PST / November 14 UTC 2026. Source base: merged main 014a76f607b1537677fb8a8023e9f992374d7748 (#658). Live Replit-connected neondb PostgreSQL16 V0094 is installed and independently audited (two original NOLOGIN groups, zero private packet rows). **V0095 and old V0096 are NOT installed.** Never replay V0094 or already-installed V0079–V0093.

## Why this change is necessary

The old uninstalled V0096 global first-review TTL chain cannot span 31 parent days under at-most-seven-day private Content expiry. PR #658 installed **no production schema**, but provided a disposable-only alternative per-study-day index (run_day_index, revision), 31 independent genesis days, a durable minimal content-free day replay claim, bounded private byte TTL, and a disabled old V0096 owner installer.

This draft PR #659 adds **code that targets only the candidate alternative**. It does not automatically authorize a database migration or provider activity.

## Actual code

- server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs implements a separate **domain-separated Ed25519 external review** with the exact prospective runDayIndex, current/private SHA, prior SHA, reviewed code, manifest, calendar, release, rights and external reviewer key fingerprint. It cannot accept the old global index review as a scoped-day signature.
- It validates a precise single-day SOURCE/LATER_PRE/POST index. Every entry belongs to the same study day; non-SOURCE entries reference a source registry already in that same day and SHA-pinned. Runtime UTC windows and per-lane cutoff limits are checked.
- The restricted publisher performs a real SERIALIZABLE PostgreSQL transaction under the existing V0094 publisher group and a distinct scoped LOGIN. It validates real database identity and ACL, independent external signed review, all referenced previously committed private packet metadata from V0095, SHA/rights/clock/expiry and prior same-day prefix. One INSERT is attempted and an uncertain COMMIT is a hard HOLD, never replay.
- The restricted reader performs REPEATABLE READ READ ONLY with original reader group, distinct LOGIN, verified same-day current/prior index SHA and prefix, database-clock TTL. Full private bytes are nonenumerable. Its redacted receipt contains only day/revision/hash/count/clock and zero writes/provider calls.
- tests/phase6_day_epoch_signed_index_once_v39.test.ts uses **real Node Ed25519 cryptography**, synthetic source identities and mocked SQL transactions to test cross-day signatures, registries, roles, TTL, wrong prior, missing contents, unknown COMMIT and absent rights. CI runs with no provider or real PG credentials.
- The previously merged #658 disposable PG16 tests already proved the **candidate DDL** with all 31 independent days, owner expiry/deletion plus immutable day replay claim, and actual restricted publisher SET ROLE. Mock SQL in this PR does **not** replace those prior physical tests; next review must combine the reader/publisher with actual disposable PostgreSQL and full signed packet bytes before production commission.

## Critical remaining prelaunch boundaries

1. **Rights and retention (#300):** source/ML-purpose authorization, identifiable normalized flight rows versus truly nonreconstructable Derived Works, legal TTL, all replica/backup/PITR/log recovery windows. A timestamp is not physical deletion. Provider response terms and account-specific plan still unresolved.
2. **Once-only live schema:** independent V0095 legal approval + one-time owner installation and separate audit, then one newly hash-pinned day-epoch *replacement* schema installer; old global V0096 installation is blocked. No unrelated Neon plugin database, no reinstalls.
3. **Scoped signer and executor:** actual independently authorized reviewer and scoped reader/publisher LOGIN credentials; adapt the real full V0095 registry hydrator and original SOURCE/Stage14/V0081/V0083 GitHub children to day epochs; materialize private bytes ephemerally and purge on lawful expiry. Do not build another paid provider worker.
4. **Genuine scientific startup:** reviewed prospective B0062 day/calendar, SOURCE and flight roster, budget+REST/Alert STOP, first-cycle canonical Amendment E real-physical delay target and honest missingness. One independent Phase5 freeze; a separate capped Phase6 Day1 paid GO afterward.

**Decision:** Phase5 scientific FREEZE HOLD and paid Phase6 NO-GO. No new Replit Shell action or paid provider call is required for this PR. Preserve the evidence in issue #413 and these Phase5 checkpoints.


## November 14 UTC — actual disposable PG16 integration added and passed

The original checkpoint above described mocked SQL tests only. That limitation has now been **partly resolved** by a second test executable, tests/phase6_day_epoch_signed_index_real_pg16_v39.mjs, and the dedicated CI job real-restricted-postgres16-signed-day-index.

This job provisions a fresh **disposable** postgres:16, installs original V0094 and V0095 plus #658's candidate schema **only inside CI**, creates synthetic scoped publisher and reader LOGINs, verifies authentic Ed25519 external signatures under fresh runtime-generated keys, and performs **actual PostgreSQL SERIALIZABLE index publication and REPEATABLE READ readback**. It commits first/second revisions for study day 1 and an independent genesis for study day 31. After a synthetic owner DELETE of day-1 private index bytes, a re-genesis for day 1 is blocked by the immutable day claim; day 31 remains readable. No real provider Contents or production database URL enter the test.

**Verified CI receipt:** status P6_DAY_EPOCH_REAL_RESTRICTED_PG16_PUBLISH_READ_PASS; signedDayIndices [1,31]; sourceRegistries 3; day1RevisionsBeforeOwnerDeletion 2; day31SurvivesDay1PrivateByteDeletion true; immutableDay1ClaimPreventsGenesisReplay true; realExternalEd25519SignatureVerified true; realPg16SourceRoleIsolation true; productionDatabaseWrites 0; providerCalls 0; phase6PaidGo false.

The phrase “owner deletion” here is only a controlled test operation on synthetic records; **the actual lawful retention/backup/PITR purge worker and real provider-use approval are still missing**, and the full V0095 SOURCE/PRE/POST packet byte semantic hydrator and GitHub Day1 flight workers are still not connected to this new index. It does not change the live V0094-installed production state.


## Follow-on PR: exact day-epoch registry-byte read-only hydration (review pending)

This follow-on work is a **specific missing end-to-end transport edge**, not a new dataset or a second paid collector. The merged #659 signed day-epoch reader returned validated index metadata but *did not actually SELECT all signed SOURCE/PRE/POST registry bytes*. The old #650 full-byte bridge targets the superseded global V0096 table and must **not** be enabled as a substitute.

- New `server/lib/disruption/phase6DayEpochFullRegistryReadOnce_v39.mjs` calls the existing **real** day-epoch Ed25519+PG16 reader, then in a second restricted `REPEATABLE READ READ ONLY` snapshot bounds the exact signed registry set to **1024 entries / 32 MiB overall / 250,000 bytes per packet** before retrieving only the signed paths. Checks DB identity, session/effective role, no DML grants, clock/TTL, byte SHA, study day, shard, kind, pinned code/manifest/rights/reviewer and committed-before-signed-publication.
- Exposes redacted counts and an **unenumerable** synchronous `getFrozen(path)` callback; paths and provider/provider-like bytes never become standard JSON/log fields. This is *transport integrity*, **not** a certified physical flight, a scheduled paid child, or the final existing Stage14/V0081/V0083 semantic admission.
- The **existing** #659 disposable PostgreSQL16 test is extended to physically read two day-1 synthetic registries, read a separate day-31 registry, verify non-logging and reject unsigned paths, then delete one signed day-31 registry in the CI-only owner connection and prove the read **fails closed**. This test changes only a disposable PG16 container and uses no real provider/private user DB.
- The existing offline/real PostgreSQL workflow is updated to cover the new adapter; full PR CI must pass before merge. No production V0095/day-index installation, no private LOGIN secrets, no ADB paid REST or autonomous launch is performed by this PR.

**Next real P0 after review:** use the newly authenticated private `getFrozen` with the existing full per-flight/source admission and true day-scoped scheduler, preserving original Phase5 SOURCE, T24/T6/T90 Stage14, V0081 witness, V0083 POST and STOP/unknown-COMMIT controls. Separately complete #300 lawful provider Contents/derived/backup/PITR purpose and TTL, then once-only production V0095 + reviewed replacement day-index schema, signed prospective B0062 calendar/cost/inputs and independent scientific FREEZE + separate paid Day1 GO. Do not treat synthetic success as any of these.


## Follow-on: reuse ORIGINAL signed SOURCE/PRE/POST semantic audit under the day-epoch reader (PR pending)

After merged #660, the **real** day-scoped Ed25519 reader can fetch the exact private SOURCE/LATER_PRE/POST registry bytes (rather than just the catalog of paths). One further execution edge matters: the original `phase5Phase6AppendOnlyDayShardIndex_v39.ts` semantic and due planner expects the **old global-index JSON schema**, whereas #658/#659 deliberately use a **new per-run-day JSON schema**. Passing the new bytes directly into the old planner is invalid, and enabling the original V0096 global runtime would revive the seven-day/31-day contradiction.

`server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs` therefore:
1. Calls the approved #660 restricted PostgreSQL day-scoped signed-index/full-registry read inside the same runtime, **not an externally supplied authorization string**.
2. Produces a deterministic **in-memory compatibility projection** limited to that already signed study day. It **never stores** that projection in a database or calls the retired global V0096 table.
3. Reuses the **exact existing** `planP6ThirtyOneDaySignedShardHandoffs` → `auditP5Phase6AppendOnlyDayShardIndex` code to validate actual SOURCE registry query digests, LATER_PRE flight-horizon duplicates, V0083 POST review shape, same-day SOURCE provenance, windows, cutoff, SHA and at-most-four-due-shards-per-lane counters.
4. Emits separate fields for the **real externally Ed25519-reviewed original index SHA** and the **internal, UNSIGNED compatibility-projection SHA**. That projection is a deterministic computational intermediary, **not a separate independent reviewer signature**.
5. Produces redacted due/missed/deferred summaries and nonenumerable private routing candidates; performs no collection child dispatch, payment, DB write or physical-outcome certification.

Synthetic Vitest cases cover SOURCE/T−6h/POST positive semantics, corrupted private SOURCE bytes, false POST rights claim, wrong day/SHA, missing same-day predecessor, non-logging and NO-GO. The full repo CI and existing real disposable PG16 #660 reader test must pass on the exact PR head before merge. This is reusable internal scientific validation, not final child paid admission.

### Still NOT done

- The per-flight packet bodies, provider-origin real selected native departure T, Stage14 PRE/POST final release checks and full GitHub Day1–31 dispatcher are **not executed** by this adapter.
- Existing production `neondb` has V0094 installed and independently read back, while **V0095 and the new day-epoch schema still need lawful approval and one-time owner installation**; **obsolete global V0096 must never be installed**.
- See issue #300 for source/ML use, TTL, actual owner-only expiry, backup/PITR/replica verification. Issue #413 remains the single release docket; a legal or scientific HOLD cannot be replaced by CI success.
- Historical Nov6 FIDS-only PRE/POST pilot is valid narrow schedule-revision evidence, **not** certified actual wheels-off/gate-out. Keep one canonical Amendment E T−6h departure delay candidate with T−90m update, label missingness and optional ADSB/NOAA limitations. Existing 26/3/2 calendar, seven physical REST categories, independent Alert budget, SOURCE native flight selection, GitHub C+D queue/reaper, throughput and receiver STOP all remain separate exit checks.
