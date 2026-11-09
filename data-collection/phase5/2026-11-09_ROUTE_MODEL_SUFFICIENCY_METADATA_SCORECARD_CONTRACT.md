# Phase 5 → 6 → 7: route and prediction-data sufficiency metadata scorecard contract

**November 9, 2026 UTC. State: PURE OFFLINE IMPLEMENTATION + SYNTHETIC TESTS; NO REAL PHASE6 ROUTE METRICS HAVE BEEN RUN.** This tool is intended to prevent a familiar aviation-ML failure: collecting many API records but discovering later that too few were distinct physical scheduled legs, had cutoff-valid PRE features, had observable outcomes, or represented meaningful routes. It does **not** replace the phase5 independent science FREEZE, provider usage rights, the actual paid source pipeline, or Phase7 protected model evaluation.

## Purpose and precise protection

[Pure module](../../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs) exports `auditP5RouteAndModelDataSupport` and admits **only aggregate training/validation metadata for batch-day indices 1..25**. It REJECTS all `runDayIndex=26..31` (the planned protected Engine-A TEST batch-days) and `protectedTestOutcomesIncluded=true`. No database connection, webhook provider access, file reads, actual private flight identities, or ML fitting is implemented. A future independently reviewed restricted SQL auditor must create the aggregated input; the present `sourceClass` string is **a claimed contract type, not a cryptographic attestation**. Do not feed it fabricated counts and claim a production quality PASS.

The source B0062 frame SHA is exact `02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94`. For each eligible train/validation day, a future audited producer must supply integer counts of genuinely qualified scheduled operating legs, durable bound originals, PRE snapshots at T−24h/T−6h/T−90m, observed/censored/pending primary outcomes, **joint T−6h cutoff-valid PRE AND observed target rows**, missing tails, severe delays and physical REST/Alert costs. These are population denominators, not raw credit counts.

### Route groups

Each day additionally supplies `directedRouteGroups` consisting of **hashed canonical ordered OD route IDs** (`SHA256(originICAO + ">" + destinationICAO)`; no plaintext flight numbers), each group's number of unique qualified operating legs and observed primary target labels. The caller must separately prove that routes are canonical, that shared/group codeshare flight numbers are deduplicated and that hash keys use a consistent encoding. Do not assume that a hashed route is a source-rights-free record; enforce provider rights and data minimization even for aggregates.

Each day must reconcile:
- `sum(route.qualifiedLegCount) + unknownRouteLegs == qualifiedScheduledLegs`
- `sum(route.observedLabelCount) + unknownRouteObservedLabels == labelsObserved`
- `labelsObserved + labelsCensored + labelsPending == qualifiedScheduledLegs`.
- `preT6AndObservedLabel <= min(validPreT6,labelsObserved)` because independently adequate feature and label *marginal* counts are NOT proof the **same flight** has both. Counts reflect source-qualified unique flight legs, not API request rows.
- Severity event counts must nest `>120 <= >60 <= >15 <= observed`. If these are not constructible from the frozen primary target, return a source-stage HOLD rather than fake all zeros.

The audit calculates actual independent batch-day count, number of directed OD routes, number of routes recurring across **different** days, routes with at least one observed target, fraction with unknown destination/route, missing tail and label support, route concentration and actual physical units spent. Every denominator is nullable when none exists, avoiding divide-by-zero or fictitious zero-error rates.

## Scientific interpretation

- **0 prospective rows** → `NO_PROSPECTIVE_TRAIN_VALIDATION_DATA_YET`. This is the correct present state of the Phase6 prediction-data cohort, despite historical B0062 airport rows.
- **Some rows, but no joint valid T−6h PRE and observed target** → `NO_CUTOFF_VALID_T6_AND_OBSERVED_LABEL_JOINT_ROWS`. A model cannot train on two separate unmatched subsets.
- **At least one qualifying joint row** → `TRAIN_VALIDATION_ROUTE_COVERAGE_DESCRIPTIVE_ONLY`. This is not a model-ready PASS. One observation or a thousand flights on a single day can still be scientifically underpowered or unrepresentative.

The tool deliberately returns `numericalSampleSizeTargetProved=false`, `targetClassBalanceAdequate=false`, `routeHoldoutEngineRSupportCertified=false`, `primaryTargetConstructibilityCertified=false`, `modelFittedOrEvaluated=false`, `phase5ScientificFreeze=false`, and `phase6PaidGo=false` **in all cases**. Route statistics can expose missingness/selection/rare-event risks, but cannot establish an accurate Model1 vs Model−1 comparison before untouched TEST days are evaluated in Phase7.

The present input contract covers *data support*, not complete model performance. Later, an independently protected Phase7 test evaluator must compute the frozen Engine-A MAE/delta, 95% day-block uncertainty, calibration, unseen-route Engine R results and collection-mechanism ablation. In Phase6, metadata dashboards may evaluate quality and provider spend but **must not** adapt model hyperparameters, label thresholds, feature selection or paid sampling based on protected TEST outcomes.

## Software verification

[Vitest regressions](../../tests/phase5_route_model_data_support_audit_v39.test.ts) test empty future data, two synthetic train/validation batch-days with three directed OD groups (one recurring across two *independent days*), true joint usable T−6h+target counts, observed versus censored versus pending, severe-delay event inequalities, source/write cost separation and deliberately missing tails. They fail closed on any test-day outcome input, unknown frame, missing provenance contract, duplicated dates/route hash, invalid rows, mismatched route or label denominators, impossible PRE/source bounds and negative physical unit costs. **Test input is synthetic, not actual future real flights**, and the results never authorize Phase6.

## Engineering handoff

Next integrate the **real restricted metadata-only PostgreSQL auditor** with the already deployed V0079–V0083 source/pre/outcome tables, and retain the exact manifest SHA, day-level sampling probability, provider-original hashes and cutoff-safe available_at provenance. The Phase5 early-draw/calendar/source grid and legal Contents-rights gates must pass before paid Phase6 data can be collected. Report pre-/during-collection baseline and trends, route/tail coverage and cost efficiency as descriptive science; if data are too sparse, make the next experiment a **separately preregistered** follow-up rather than weakening the protected first-month test.

See the [detailed team-meeting checkpoint](2026-11-09_MEETING_CHECKPOINT_PREDICTIVE_READINESS_B0062_COMMANDS_ROUTES.md) for how to explain this workflow and Plan f.8 §13 and §17 for the binding evaluation/route/tail metrics.