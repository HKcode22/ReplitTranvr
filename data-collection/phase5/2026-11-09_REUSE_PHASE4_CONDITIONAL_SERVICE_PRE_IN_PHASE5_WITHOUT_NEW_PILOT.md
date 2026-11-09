# Phase 5 integration — reuse the authentic Phase 4 conditional-service identity in the source-bound PRE writer

**November 9, 2026.** The purpose is to remove a specific *code mismatch* between the existing Phase 4 Gate5A schedule-revision pipeline and the newer Phase 5 restricted Stage14 source-bound per-flight PRE writer. This file is a durable checkpoint and team study guide, not a new Stage, protocol approval, database migration, paid acquisition, source-rights grant or Phase6 GO.

## The exact existing work we are REUSING

Phase 4 [Nov 6 WSSS source→PRE→POST decision](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md) documents **9 authentic PRE FIDS originals, 12 matched conditional scheduled-service keys, 36 on-time PRE snapshots, 3 POST originals and 36 provider schedule-revision comparisons**. It does NOT say these were 12 independently confirmed native operating legs or measured wheels-off times.

The actual [Phase4 G5A horizon owner](../../scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts) previously admitted the explicit source marker `codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'`, `scope_classification='unknown'` and an immutable composite `canonical_flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$'`. These deliberately mean **a provider-query-filtered scheduled service with conditional identity**, not a confirmed operating aircraft.

The prospective narrower first-cycle **[Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) is still a DRAFT**, not adopted by PR merge. It distinguishes `PROVIDER_NATIVE_OPERATING_LEG` from `CONDITIONAL_QUERY_FILTERED_SERVICE`. The original physical gate/runway target remains separate and historical original Gate5 full science is HOLD.

## The actual new integration, not a redo

The [Phase5 Stage14 restricted PRE writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) already performs genuine source-original / V0079 reservation / immutable membership joins, protected PostgreSQL role verification, exact T and cutoff checks, one-use PRE write with a post-COMMIT readback, and a requirement for an independent V0081 T24 witness before T6 or T90. It *formerly* admitted only `confirmed_core + confirmed_operating_leg`, rejecting the earlier *conditional* Phase4 population even if the future scientific schedule-revision protocol explicitly allows it.

This integration preserves the **default legacy native-only path**. It adds a separately selected conditional identity tier only when all of the following are supplied and the database source row actually matches:

- Explicit `identityEvidenceTier='CONDITIONAL_QUERY_FILTERED_SERVICE'`, separately reviewed **prospective** amendment SHA, stable 64-digit service-key SHA which must match the exact `leg:g5a:<SHA>` id, and a separate `externalConditionalScheduleSourceAndUseReviewed=true` attestation. The native operating-leg review attestation must NOT be set for a conditional record. These attestations are caller claims, **not automatically evidence that the amendment or supplier license was independently approved**.
- Exact **one** source-bound persisted member with `scope_classification='unknown'`, `codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'`, `requested_airport_primary`, source type `fids`, and a correctly formed `leg:g5a:<SHA>` ID. No alteration to the *stronger* `confirmed_core/confirmed_operating_leg` native admission branch.
- Its stored operator flight number, destination ICAO and departure direction must match the separately reviewed permit. Same immutable selected source/original digest, signed run/horizon/airport manifest, source allowed query/reservation hash, source availability/expiry, earliest cutoff, DB-now/commit-time checks, and no duplicate PRE.
- T6/T90 still require a real previously committed T24 witness and independent reviewed receipt; a conditional T24 is **not** a substitute for external operating-leg or actual physical departure validation.

**Real disposable PostgreSQL16 integration tests** use one synthetic signed original containing **two different synthetic services**: a previously working native `CI100` and new conditional `CI200` with destination `OMAA`. They require a source-bound PRE for both, preserve separate flight-instance IDs, reject alias relabeling / wrong destination / missing amendment and duplicate PRE replay, and assert `conditionalServiceCertifiedPhysicalLeg=false` and zero provider calls. Tests are **not** a new real aviation cohort or grant to persist future Contents.

## Status and what genuinely remains

This solves one *specific code-level reuse gap*. A real Phase5 source producer must still create or read authentically bound eligible `flight_population` members and independently identify the appropriate stratum; this patch does **not** create a new flight matcher or license. There is still no complete scheduled 31-day GitHub producer (the one-FIDS-GET workflow is manual) and no actual signed future 31-parent-day calendar or seven-category physical UTC budget rows in production as observed in the owner primary read-only inventory at **2026-11-09T13:42:38.603Z**. The proposal's conditional category is only available for live release **after a formal independent prospective Amendment D/alternative approval** and separate signed source-use decision. No code can claim the approval merely from a 64-character hash.

**Reuse rule:** no new YSSY/Phase3 Alert CREATE/STOP demonstration, no repeat November6 WSSS three-horizon FIDS-only pilot, no new V0079–V0083 installer, no source rights emails as a condition for unrelated engineering work. Phase5 unfinished work: approve target/use, freeze real 31 parent dates and costs, assemble scheduled GitHub early draw→FIDS original→PRE/witness→POST/receiver/STOP, Day1 quality/STOP, independent freeze and distinct Phase6 GO. [Detailed seven-task owner guide](2026-11-09_WHAT_THE_FLIGHT_RECORDS_MEAN_AND_PHASE5_EXACT_FINISH_LIST.md) and [Phase5 release issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413) are the current authoritative checklist.

**Phase5 scientific FREEZE HOLD. Phase6 paid GO NO.** No production DB write or billable provider call in this PR.
