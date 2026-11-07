# Phase 5 Stage 10 — V0079 bound FIDS source to flight-specific PRE as-of readback (offline)

**State:** implementation/test only on a dedicated PR. **No live entrypoint, scheduled GET, production migration, PRE materialization, source-use release or Phase 6 GO.** Unlike the original historical V3.9 implementation log, this dated Phase 5 engineering note is mutable. Scientific authority remains the original [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), Phase 5 [#413](https://github.com/HKcode22/ReplitTranvr/issues/413) and source/PRE P0 [#416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## Why this exists

Stage 9 proved that exactly twelve *prepared provider source queries* can be committed under a restricted role. A planned query, paid REST reservation, authentic bound source original and actual flight-specific PRE are **four different things**. A flight observed at a four-hour-window query may have its own T−24h/T−6h/T−90m cutoff **hours later**. One timed FIDS response does not automatically supply an acceptably fresh population for all four hours. The current one-request-per-slot/horizon grid is a **candidate budget**, not frozen per-flight coverage. Population refresh cadence/guard/max staleness from f.8 §5.2 remain a separate independent FREEZE blocker.

## What the code enforces

The new [readback module](../../server/lib/disruption/phase5V0079BoundFlightPreAsOfReadback_v39.ts) queries **only existing V0079 original-binding/attempt/query metadata and normalized population** on one restricted `REPEATABLE READ READ ONLY` PostgreSQL snapshot. It never reads the provider's raw JSON Content into its result and returns **aggregate-only counts and mutually exclusive reasons**. It requires exact manifest/query/rights digests, GitHub run ID parity, single bound source, unexpired original, intact hash and clock ordering, real normalized population count, requested-airport origin, confirmed-core and confirmed-operating status, and uniqueness of candidate physical legs.

For each qualifying member it evaluates **that flight's own** T−h candidate cutoff using effective system availability and an **explicitly supplied frozen staleness limit**. It distinguishes source available after cutoff, source too stale, cutoff not yet due and **late-no-backfill**. T−6h/T−90m **refuse an unanchored T**: they require an existing, timely persisted T−24h frozen snapshot with consistent first T. Unknown/conditional code-share identity never silently becomes a confirmed physical leg. A genuinely empty persisted original (0 members) is distinguishable from **no original**, which is a HOLD.

The module intentionally returns `scientificFlightLevelPreCertified:false`, `legalPurposeAndRetentionCertified:false`, `preSnapshotsWritten:0`, `phase6PaidGo:false`, even when the source-only candidate count is nonzero. T−24h `dep_scheduled_utc` is a **provisional provider-native schedule candidate**, not a verified FAA gate-out or scheduled wheels-off T. A caller's hash/boolean is not source semantics or legal rights approval. It cannot use any later schedule to silently revise a frozen T.

## Tested boundaries

CI runs pure as-of/role/replay/duplication/expiry/leakage tests with no credentials, and a separate **disposable PostgreSQL 16** job that installs authentic B0062 and staged V0079, compiles the real source and member SQL, checks that its restricted reader cannot insert PRE or mutate V0079, and refuses missing originals rather than calling an absent query a genuine zero-member population. This job uses no provider key, no production database and no real provider Content.

## Remaining launch blockers

1. Independently certify a constructible selected T and genuine physical operating-leg semantics per f.8 §6.0, and account-specific source-purpose/record-retention/backup expiry under [#300](https://github.com/HKcode22/ReplitTranvr/issues/300). November 7 updated Terms cannot be bypassed by paid permission.
2. Freeze the **actual 31-day** adaptive four-airport × continuous horizon-refresh schedule and the separate seven-category REST/Alert budgets, including Day 0 actual UTC charge-days and source staleness; reconcile the currently provisional **12/day** source-query design with the binding 4h service-window coverage before spending.
3. Install and independently authorize V0079/V0080 with correct roles only after FREEZE; add the signed GitHub timed source owner and bound source→**cutoff-safe durable PRE writer** with no backfill; measure actual per-flight expected/created denominators and POST/AIRBORNE/Alert outcomes.
4. Verify published Replit receiver exact reviewed SHA/raw-before-2xx, legal source visibility, incident STOP and independent Phase 5 FREEZE. Complete Gate 5's separate original science evidence honestly.

**Decision:** Offline engineering can continue. Stage 10 source-as-of candidate readback is **not** Phase 5 FREEZE, a scientific Gate 5 PASS, permission to republish, or Phase 6 authorization.
