# Phase 5 Stage 14 — one authentic V0079-bound physical operating-flight PRE, strictly prospective

**Engineering state:** staged/no live entrypoint, no provider GET, no production database migration, no GitHub paid schedule. **Scientific state:** authentic software custody under explicitly *supplied* review artifacts can be exercised, but independently certified native T, operating identity, ML source/backup retention and full Phase 5 FREEZE remain HOLD.

References: [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [Stage 10 cutoff readback](2026-11-07_STAGE10_V0079_BOUND_FLIGHT_PRE_ASOF_READBACK_OFFLINE.md), [Stage 12 PRE audit](2026-11-07_STAGE12_TRUE_PRE_SOURCE_LINEAGE_QA_DENOMINATOR_FIX.md), [Stage 13 multi-refresh source preparation](2026-11-07_STAGE13_BOUNDED_MULTI_REFRESH_V0079_PREPARED_DAY_DB_OFFLINE.md), and [P0 #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## Why this is more than a query proposal

Stages 6–9 can safely prepare daily source requests in a restricted transaction, and Stage 10 can audit as-of flight candidacy. But neither persists a real, prospective flight-level PRE. A naive call to the generic `materializePreSnapshotsForCutoff` after a deadline could reconstruct a historical available-as-of snapshot and **misrepresent it as a genuinely on-time committed PRE**. This Stage 14 path refuses such retrospective backfill; it is a separate opt-in, stricter writer.

## Preconditions and database safety

[Staged function](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) verifies one reviewed manifest, V0079 query digest, real GitHub run, irreversible physical attempt, intact original FIDS body and response hash, bounded legal source expiry, confirmed primary/confirmed core/confirmed operating-leg and uniquely joined normalized flight member, its source/member system availability before **that flight's** frozen T−h prediction cutoff, and maximum frozen population age. The source response and member are verified under one **SERIALIZABLE** database transaction using an exact **SELECT+INSERT-only PRE writer role**; it cannot mutate query/attempt/original rows.

It accepts only `departure.scheduledTime.utc` as an explicitly independently reviewed provider-native selected T, not a legacy FAA/gate-out alias. A first T−24h snapshot must be consistent with that original source schedule. **Stage14 currently permits only T−24h writes**: T−6h and T−90m are explicitly refused until an independently authenticated **durable post-COMMIT T−24h witness** is available. Looking up an older T−24h snapshot via its `created_at=now()` timestamp is insufficient proof that its transaction actually committed before its cutoff; a later release must implement and test a protected witness ledger before enabling those horizons. Later retimes may never re-anchor a validated first T. It passes an empty optional feature vector to the canonical `buildPreSnapshot`/`persistPreSnapshot`, since missing weather or ADS-B should not suppress an otherwise eligible flight.

The **real PostgreSQL database clock**, never CLI/GitHub wall time, must be within the final three minutes before the exact per-flight cutoff and remain at least two seconds before it at the immediate pre-COMMIT check. **A pre-COMMIT clock is insufficient to prove a durable PRE:** after COMMIT is acknowledged, a fresh database statement must read back the exact stored source/flight/T/cutoff and observe the database clock **strictly before that flight's own cutoff**. Only then can the function return a timed PRE result with an explicit post-commit DB witness timestamp. If the pre-COMMIT checks fail, the transaction rolls back. If COMMIT succeeds but post-commit proof is late or unavailable, the possibly durable row must be **quarantined and independently reconciled, without blind retry**; the function returns no scientific-success claim. An unverifiable commit does not become a successful PRE simply because `created_at=now()` in PostgreSQL was earlier than the cutoff.

## Evidence and limitations

The standalone offline CI job installs authentic **B0062 plus staged V0079** into a disposable PostgreSQL16 service, constructs entirely **synthetic** original-decoded-body evidence, an exact one-flight confirmed-primary normalized FIDS source row, a constrained SELECT+INSERT-only writer role and an externally stipulated native T/rights permit. The positive test expects one `PRE_DEPARTURE` row with positive attached population member and source response identity created before its cutoff, and checks the hard refusals for replay, wrong database role, unreviewed permit and already-passed cutoff.

**Do not interpret the synthetic permit as real legal approval or independent evidence of the provider's native schedule / physical operating leg.** The code reports `externalNativeTIndependentlyAuthenticatedByThisFunction:false`, `providerRightsIndependentlyCertifiedByThisFunction:false`, `phase5FreezePassed:false`, `phase6PaidGo:false`. Nothing in this branch authorizes production inserts or labels.

## Next mandatory steps

1. Obtain/independently review a native provider schedule semantics artifact and true physical operating-leg identity, and the exact account-specific source/normalized record/ML+backup retention rights (issue #300).
2. Verify production V0079/V0080 installation rights/roles and final 31-day calendar with real measured FIDS request ranges, full source-refresh staleness, seven-category REST/Alert budgets and Day0 UTC reservations.
3. Wire an independently reviewed **GitHub-only timed source owner** to one bound original, separately scoped due-flight writer(s), correctly stored late/not-due/missing denominator logs, signed no-backfill and STOP protocols; each must use real provider source evidence, not fixture attestations.
4. Collect actual source → cutoff-safe PRE → webhook/AIRBORNE → POST outcomes and independent audit including censoring, non-operating/marketing strata, retention expiry and bias; deploy the exact reviewed receiver and complete final Phase 5 FREEZE.

This is a staged scientific software component, **not the live experiment or Phase 5 completion**. The catalog-locked original implementation log remains untouched.
