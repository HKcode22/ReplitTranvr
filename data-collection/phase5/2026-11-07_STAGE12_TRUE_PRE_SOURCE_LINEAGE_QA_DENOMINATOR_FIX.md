# Phase 5 Stage 12 — correct daily PRE candidate denominators through authentic V0079 source lineage

**Date:** 2026-11-07 UTC. **Status:** restricted, aggregate-only metadata QA correction with disposable PostgreSQL 16 integration; **not a scientific PRE certification, rights clearance, actual provider experiment, production migration or Phase 6 release**. f.8 §§5–7 and [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) remain binding. The original historical implementation log is catalog-locked; do not modify.

## Root cause: existing QA could falsely report zero PRE candidates

The previous [Phase 5 daily QA](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) used `s.prediction_state='PRE'` even though the actual [PRE materializer](../../server/lib/disruption/preSnapshotBuilder_v3.ts) writes `PRE_DEPARTURE`, and joined via `clean.flight_snapshots.population_member_id` although the existing `persistPreSnapshot()` does **not supply** that optional UUID; B0062's `attach_population_member_to_snapshot` trigger fills it **only when** a matching primary member can be found. Consequently, valid source-backed PRE rows could be invisible to the daily quality audit, misleading missingness denominators and the scientific dashboard.

## Repaired audit semantics

The repaired SQL reads only authorized aggregate fields and follows:
`flight_snapshots.population_query_id::text` → authentic staged `phase5_fids_original_binding_v39.population_query_id::uuid` → exact V0079 signed query digest/manifest/horizon → persisted `fids_query_response`. A `clockOrderCandidate` additionally requires the canonical `PRE_DEPARTURE` state; created-at no later than the **own flight** cutoff; real matching query and response SHA, source `available_at` no later than cutoff, a source use-expiry later than PRE commit time; frozen selected T-version metadata; and positive `flight_population` member with the *same* query/flight identity, requested-airport primary movement, source hash and on-time member availability.

`snapshots_seen` counts distinct saved PRE snapshot IDs linked to the authentic bound source, not expected snapshots or all flights. `clockOrderCandidates` is only a **subset of actual stored rows with matching provenance**. It remains incapable of establishing selected-T native semantics, legally usable record-level/backup retention, phase6 admission, or independently verified physical operating status. Missing source original is not a zero-flight denominator; source retention and unsupported outcome categories remain separate.

## Tests and safety

- Pure regression tests ensure SQL uses `PRE_DEPARTURE` and V0079 `uuid::text` lineage rather than `population_member_id`, verifies exact source+flight/hash/clock filters and enforces read-only aggregate output.
- Disposable PostgreSQL 16 CI applies authentic B0062 and staged V0079; constructs entirely synthetic current-source original metadata, one normalized primary member, and four synthetic PRE/AIRBORNE snapshots: B0062 automatically fills the UUID for the **one positively linked primary member**, while the remaining **three UUIDs stay NULL**. It must report three source-linked PRE rows (one valid identity, one unknown identity, one intentionally altered response hash) and **only one** clock/source/identity-valid PRE candidate. An AIRBORNE row must never enter PRE counts. This is a test of SQL and denominator behavior, not a genuine AeroDataBox flight or rights.
- Zero provider calls/Alert credits, production DB writes, actual workflow dispatch, receiver publish or authorized new collection. Final release decisions remain HOLD.

See [Phase 5 FREEZE tracker #413](https://github.com/HKcode22/ReplitTranvr/issues/413), [P0 producer/PRE work #416](https://github.com/HKcode22/ReplitTranvr/issues/416), and [rights #300](https://github.com/HKcode22/ReplitTranvr/issues/300).