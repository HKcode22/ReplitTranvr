# Phase 4 — Gate 5 (population-observability validation)

**Home for the actual Phase 4 work and checkpoints.** Earlier notes were accidentally filed under Phase 3. All 24 Phase-4-specific runbooks and checkpoint files were **moved here with their exact original Git blob hashes unchanged**. Phase 3 remains historical Gates 3 / 0.5 / 4. The relocation changes documentation paths only; it does not move production source code, alter an approved provider schedule or authorize Phase 6.

## Start here — live source of truth

- [Durable weather as-of optional PRE feature boundary](2026-10-30_PHASE4_WEATHER_DURABLE_ASOF_PRE_FEATURE_BOUNDARY.md) — strict issue/physical-observation/availability/commit/forecast-validity checks; feature code only, **not operational weather ingestion or historic enrichment**
- [Retained same-cohort as-of candidate turnover audit](2026-10-30_PHASE4_RETAINED_SAME_COHORT_ASOF_DRIFT_AUDIT.md) — bounded, protected DB-only candidate appearance/disappearance and schedule revisions across tomorrow's cutoff observations; never unique physical-flight denominator
- [Final paid FIDS physical-dispatch cutoff recheck](2026-10-30_PHASE4_FINAL_PAID_DISPATCH_CUTOFF_GUARD.md) — ensures slow preflight can never dispatch a paid FIDS GET after the protected 15-minute cutoff guard; no change to GitHub schedule
- [Night-before no-provider infrastructure readiness](2026-10-30_PHASE4_NIGHT_BEFORE_INFRASTRUCTURE_READINESS.md) — protected READ ONLY DB writer/trigger preflight on main; **not quota or scientific PASS**
- [**Operational runbook for October 31 WSSS**](OPERATIONS_AND_WEATHER.md) — user instructions, costs, GitHub schedule and fallbacks, weather source, what still remains
- [Scientific Plan f.8 §5, §10 and §17](../plans/V3.9_DataCollectPlan_f.8.md) — binding eligibility, weather source and Gate 5 acceptance rules
- [Implementation Log §A1.15](../implementation/V3.9_IMPLEMENTATION_LOG.md) — engineering state and outcomes
- [Open GitHub issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200) — selected-T, provider actual/estimated runway and operating-identity evidence; note that a science HOLD on these fields is not a veto on every other Phase 4 operation

## Most recent production evidence

- [Original prospective WSSS FIDS provider request](2026-10-30_PHASE4_ONE_PAID_PROSPECTIVE_FIDS_REAL_EVIDENCE.md) — one paid GET / 2 measured API units and 24 primary source observations
- [One same-cohort scheduled collection runbook](2026-10-30_PHASE4_WSSS_THREE_HORIZON_ONE_COHORT_RUNBOOK.md) — exact FIDS timestamps and refund/stop rules
- [Live callback/outcome production implementation](2026-10-30_PHASE4_LIVE_CAPTURE_OUTCOME_IMPLEMENTATION.md) — actual PostgreSQL capture and outcomes read-only SQL
- [WSSS weather as-of selection hardening](2026-10-30_PHASE4_WEATHER_ASOF_SELECTION_HARDENING.md) — SIN→WSSS, stale-source fallback, issue+receipt clock checks; **code/tests only, no historical weather ingestion or certified join**
- [Live PRE builder source execution](2026-10-30_PHASE4_LIVE_PRE_BUILDER_SOURCE_EXECUTION.md) — **72 candidate in-memory PRE features constructed** using 24 WSSS source observations × 3 horizons, optional weather and webhook data marked missing, **0 certified persisted PRE**
- [GitHub production PRE/callback/FIDS read-only success](https://github.com/HKcode22/ReplitTranvr/actions/runs/41153035873) — original body SHA verified, 24 candidate identities, all three cutoff source joins matched, 72 PRE previews, no DB writes
- [Source-semantics issue #200 checkpoint](https://github.com/HKcode22/ReplitTranvr/issues/200#issuecomment-6536861166) — current scientific limitations; Gate5 and Phase6 are not declared PASS

## All historical Phase 4 runbooks and checkpoints (24 original files)

- [PHASE4 AIRCRAFT LINKAGE DURABILITY HANDOFF](2026-10-29_PHASE4_AIRCRAFT_LINKAGE_DURABILITY_HANDOFF.md)
- [PHASE4 ASOF SOURCE CLOCK PRECISION CHECKPOINT](2026-10-29_PHASE4_ASOF_SOURCE_CLOCK_PRECISION_CHECKPOINT.md)
- [PHASE4 DECODED FIDS BODY CUSTODY AND STATUS RESULT](2026-10-29_PHASE4_DECODED_FIDS_BODY_CUSTODY_AND_STATUS_RESULT.md)
- [PHASE4 FIDS REQUEST PROVENANCE CONTRACT](2026-10-29_PHASE4_FIDS_REQUEST_PROVENANCE_CONTRACT.md)
- [PHASE4 GATE5 FASTTRACK EXECUTION](2026-10-29_PHASE4_GATE5_FASTTRACK_EXECUTION.md)
- [PHASE4 LIVE CUTOFF SNAPSHOTS HANDOFF](2026-10-29_PHASE4_LIVE_CUTOFF_SNAPSHOTS_HANDOFF.md)
- [PHASE4 ONE PAID STATUS FEASIBILITY HANDOFF](2026-10-29_PHASE4_ONE_PAID_STATUS_FEASIBILITY_HANDOFF.md)
- [PHASE4 ORIGIN FINGERPRINT FORMAT REPAIR](2026-10-29_PHASE4_ORIGIN_FINGERPRINT_FORMAT_REPAIR.md)
- [PHASE4 PRECISION RECONCILED CANDIDATE ASOF](2026-10-29_PHASE4_PRECISION_RECONCILED_CANDIDATE_ASOF.md)
- [PHASE4 QUERY ORIGIN SENSITIVITY HANDOFF](2026-10-29_PHASE4_QUERY_ORIGIN_SENSITIVITY_HANDOFF.md)
- [PHASE4 RAW AVAILABILITY PG PRECISION REPAIR](2026-10-29_PHASE4_RAW_AVAILABILITY_PG_PRECISION_REPAIR.md)
- [PHASE4 READONLY SOURCE ADAPTER HANDOFF](2026-10-29_PHASE4_READONLY_SOURCE_ADAPTER_HANDOFF.md)
- [PHASE4 SCOPE AND FIDS RESPONSE SHAPE GUARD](2026-10-29_PHASE4_SCOPE_AND_FIDS_RESPONSE_SHAPE_GUARD.md)
- [PHASE4 SOURCE CLOCK INTEGRITY HANDOFF](2026-10-29_PHASE4_SOURCE_CLOCK_INTEGRITY_HANDOFF.md)
- [PHASE4 SOURCE INVENTORY ACTIONS HANDOFF](2026-10-29_PHASE4_SOURCE_INVENTORY_ACTIONS_HANDOFF.md)
- [PHASE4 STRATIFIED COVERAGE HANDOFF](2026-10-29_PHASE4_STRATIFIED_COVERAGE_HANDOFF.md)
- [PHASE4 WSSS FIDS IDENTITY ROOTCAUSE AUDIT](2026-10-29_PHASE4_WSSS_FIDS_IDENTITY_ROOTCAUSE_AUDIT.md)
- [PHASE4 FIDS CANONICAL ENVELOPE INTEGRITY CHECKPOINT](2026-10-30_PHASE4_FIDS_CANONICAL_ENVELOPE_INTEGRITY_CHECKPOINT.md)
- [PHASE4 FIDS ORIGINAL BODY READBACK CHECKPOINT](2026-10-30_PHASE4_FIDS_ORIGINAL_BODY_READBACK_CHECKPOINT.md)
- [PHASE4 LIVE CAPTURE OUTCOME IMPLEMENTATION](2026-10-30_PHASE4_LIVE_CAPTURE_OUTCOME_IMPLEMENTATION.md)
- [PHASE4 LIVE PRE BUILDER SOURCE EXECUTION](2026-10-30_PHASE4_LIVE_PRE_BUILDER_SOURCE_EXECUTION.md)
- [PHASE4 ONE PAID PROSPECTIVE FIDS REAL EVIDENCE](2026-10-30_PHASE4_ONE_PAID_PROSPECTIVE_FIDS_REAL_EVIDENCE.md)
- [PHASE4 PROTECTED LIVE FIDS READBACK CHECKPOINT](2026-10-30_PHASE4_PROTECTED_LIVE_FIDS_READBACK_CHECKPOINT.md)
- [PHASE4 WSSS THREE HORIZON ONE COHORT RUNBOOK](2026-10-30_PHASE4_WSSS_THREE_HORIZON_ONE_COHORT_RUNBOOK.md)

## Where Phase 4 executable code belongs

Runtime TypeScript modules stay in [`server/lib/disruption/`](../../server/lib/disruption/), GitHub-invoked operator scripts in [`scripts/`](../../scripts/), and Actions workflows in [`.github/workflows/`](../../.github/workflows/). Moving executable modules into a documentation folder would break imports/production wiring and is **not part of this relocation**. The relevant production paths are `server/lib/disruption/phase4Gate5LiveFunnel_v39.ts`, `phase4Gate5LiveCaptureOutcome_v39.ts`, `phase4Gate5LivePreBuilderCandidates_v39.ts`, `scripts/v39_gate5_source_inventory_readonly_actions.ts`, `scripts/v39_phase4_one_prospective_fids_paid_actions.ts`, `.github/workflows/phase4-gate5-three-prospective-wsss-cutoffs.yml`.

## Phase 4 versus later phases

**Gate 5 remaining:** independently qualified operating flight population + selected-T milestone, actual departure outcome semantics, certified persisted PRE snapshots, complete after-window capture/target coverage, and weather archive/as-known-at-cutoff readiness for later experimental freeze. Missing optional weather or callback features are measured and NULL, not an automatic failure of a valid population snapshot. **Do not run the full 31-batch Phase 6 from these checkpoints.**

## After-service outcome evidence (GitHub-only automation)

- [October 31 WSSS post-window read-only outcome audits](2026-10-30_PHASE4_POSTWINDOW_OUTCOME_AUTOMATION.md) — **12:15 PM** and **3:15 PM PDT**, original frozen cohort; both no-provider/no-write, deadline-gated. They measure what the existing database knows after the service interval without certifying unresolved selected-T, operating identity, actual wheels-off or a complete capture rate.
