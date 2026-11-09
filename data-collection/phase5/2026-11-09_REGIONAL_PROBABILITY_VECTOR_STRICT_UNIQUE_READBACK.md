# Phase 5 — REGIONAL saved probability-vector integrity

**November 9, 2026. Engineering-only integrity correction. Phase 5 scientific FREEZE HOLD; Phase 6 paid GO NO.**

## Confirmed defect and scientific impact

The existing early airport-draw readback accepted the vector
`[{icao:"KGPT",probability:0.6,drawScore:3},{icao:"KGPT",probability:0.4,drawScore:2}]`
when the stored selected airport was KGPT with design probability 0.6. The
weights sum to one, but the entries are not separate airports. Incorrect
inclusion probabilities can distort later inverse-probability analysis.

It also used `Number(...)` coercion to validate JSON values, which can admit
null, booleans or numeric strings as if they were native numeric probabilities
or scores. `Number(false)` is 0; prior non-finiteness testing was insufficient.

## Narrow, source-reviewed correction

**Source:** [phase5EarlyPreselectionReadback_v39.ts](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts),
`verifyPreparedDailyDraw()`, REGIONAL `probability_vector` admission.
- Require a normalized, four-letter ICAO string per entry.
- Require distinct ICAOs **after normalization** (so KGPT, kgpt and
  whitespace variants cannot be counted as different airports).
- Require native finite numeric probability strictly greater than zero and
  at most one, plus native finite **positive** numeric `drawScore`.
- Retain existing sum-to-one, selected-airport and matching-probability
  checks, plus source/calendar/config/frame hashes and strict early-draw time.
- Preserve valid two-airport vectors, the original vector entry order and
  digest canonicalization. Do not change any persisted draw or sampling policy.

**Compatibility:** `adaptiveMi_v3.ts::computeRegionalProbabilityVector()`
produces positive `drawScore` from positive traffic-prior, Mi and coverage
factors. Pair replay emits the valid single-entry vector with score 1.
Only malformed or duplicate-identity readbacks are newly refused.

**Tests:** [phase5_early_preselection_readback_v39.test.ts](../../tests/phase5_early_preselection_readback_v39.test.ts)
covers honest distinct candidates; duplicate exact/case/whitespace ICAOs;
null/Boolean/string/zero/negative/nonfinite scores and probabilities;
bad ICAO shape; existing JSONB canonicalization and calendar boundaries.

## Safety, evidence and subsequent work

This PR changes source readback plus tests and documentation only. It does
not call AeroDataBox, mutate PostgreSQL, execute a live early draw, alter
the Phase6 date/treatment design or start collection. Pre-merge CI must pass
before merge. All authentic source-original/three-PRE-horizon/POST, rights,
charge-day budget and independent scientific release gates remain open.

Continue next with the signed 31-day treatment/airport design, provider-native
range/price and Contents-use review, physical UTC seven-category budget
reservation, restricted-PostgreSQL prospective draw bind, independent
source→PRE→POST receiver/STOP witness and final Phase 5 audit.

See [assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md),
[owner technical atlas](2026-11-09_OWNER_PROGRESS_ENGINEERING_TIME_AND_PHASE5_CODE_ATLAS.md),
[issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416) and
[source rights issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300).
