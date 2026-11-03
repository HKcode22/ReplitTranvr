# Gate 5 — V0078 repeat-FIDS observation uniqueness repair (OFFLINE, STAGED)

**2026-11-03 Pacific. Status:** reviewed candidate migration and real disposable PostgreSQL 16 regression submitted; **no production migration** and no live paid owner. PR #360 raw-first+V0077 original custody is merged. PR #363's three **distinct** synthetic sources→PRE→independent read-only audit is merged. [Issue #362](https://github.com/HKcode22/ReplitTranvr/issues/362) tracks this independent repeated-**same**-flight blocker.

## Reproduced baseline root cause

Immutable baseline `migrations/baseline/B0062__v39_schema_baseline_20261001.sql` (blob `aa9bd07042ba4078d5f938b1b642600118fe78a7`) creates two overlapping uniqueness rules on `clean.flight_population`:

- Legacy `flight_population_key`: source airport + frozen cutoff + flight number + carrier IATA + provider record key, **across every source type**. A second legitimate FIDS original receipt for the same physical operated leg at the same cutoff is rejected, even though its `population_query_id` is new.
- New append-only `flight_population_observation_key`: unique (`population_query_id`, `analytic_identity_id`, `population_role`). The existing `flight_population_fids_complete` check requires these fields for a non-expired FIDS row. This is the correct per-original membership key.

The first repeated-original real PG16 test correctly failed `23505 flight_population_key` in the second normalized FIDS insert; PR #360 rolled back its parent original and V0077 binding rather than falsely treating source coverage as complete. Changing provider IDs, query cutoffs or scientific flight identity to avoid this error would corrupt the study.

## Narrow V0078 candidate policy

The staged `migrations/staged/V0078__phase4_gate5_fids_reobservation_uniqueness_v39.sql` **replaces** only the old **global** uniqueness rule with a partial unique index on the identical five legacy columns for **non-FIDS** rows. For FIDS, the already-existing unique original-query/identity/role index remains authoritative.

The migration refuses unknown baseline table, unexpected old constraint definition, absent/invalid FIDS observation index, pre-existing replacement index and non-expired FIDS rows missing their identity fields. It checks index validity afterward. It does not edit any source rows, provider-expiry triggers, original/normalized retention, V0076/V0077 binding, auth grants, runtime privileges, Plan f.8, or the hash-locked Implementation Log.

This is **not** a purely additive change: removing a table-wide unique constraint is a controlled policy relaxation. It takes a DDL lock and may affect legacy code that explicitly references `ON CONFLICT ON CONSTRAINT flight_population_key`. It therefore remains **STAGED**, not in `migrations/current`, pending independent compatibility/dependency scan, production role audit, maintenance risk review, data-rights clearance and separate owner-executed installer. **Do not run this SQL on production from Replit.**

## No-provider regression on real PG16

The dedicated GitHub-only workflow installs disposable B0062, staged V0076/V0077 and staged V0078 as **one psql -1 transaction**. Its synthetic source producer then commits three original FIDS responses for the **same provider record / flight number / frozen cutoff**, each with a distinct genuine query ID, matching normalized population row and exact V0077 binding. It must independently persist **one** operating-flight T−24h PRE before cutoff, read it after real elapsed cutoff, and count it **once** in a separate read-only auditor. It also inserts two non-FIDS records with identical legacy tuple under a rollback savepoint and requires the second to fail with `23505` on the new partial unique index. No production DB, no provider key/request, no contents beyond fixture, no broad ACLs, no invented schedule or provider IDs.

**Test success does not establish** real first provider-native selected T, rights for original/normalized Contents or ML retention, actual-only wheels-off, live cutoff source coverage, physical scope at WSSS, real receiver/webhook in/out, POST, AIRBORNE, bias bounds, a full three-horizon cohort or scientific Gate 5 completion. Real source-owner release pin stays NULL; Phase5 freeze and Phase6 activation remain NO-GO.

**Next:** examine V0078's tests and compatibility on an independently managed disposable database, review legal/technical admissibility and production DDL/rollback with owner, then wire a *separately permitted* genuinely future GitHub cohort. Never rerun Nov2's 9/9 paid diagnostic or production V0077.
