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
