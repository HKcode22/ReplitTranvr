# Phase 5 — strict REGIONAL draw-score versus inclusion-probability parity

**Date:** 2026-11-09 UTC. **Scope:** independent saved early-draw readback guard; zero provider calls, zero production database mutations, no Phase6 paid release.

## Confirmed code gap and why it matters

The actual `phase6SamplingDecision_v39.ts` calls `adaptiveMi_v3.ts::computeRegionalProbabilityVector`. Each eligible regional airport is assigned a positive `drawScore` (traffic prior × adaptive Mi, capped, × coverage boost) and a `probability = drawScore / sum(drawScore)`. A deterministic seeded draw then selects one airport using that probability distribution. The planned inverse-probability statistical adjustment depends on the **actual inclusion probability** of the selected airport.

The saved readback `verifyPreparedDailyDraw()` had already been hardened in PR #517 to refuse duplicate normalized ICAOs and malformed scores. It checked `sum(probability) ~= 1` and whether the selected airport had a matching saved `airport_layer_design_probability`. But it **did not check** the crucial relationship `probability[i] = drawScore[i] / sum(scores)`.

Concrete counterexample: KGPT had score 3, probability 0.9; KDEC score 2, probability 0.1; saved selected KGPT probability 0.9. Airport identities were unique, scores positive, probabilities totaled one and selected probability matched—but the actual sampling distribution implied by scores was 0.6/0.4. This is scientifically meaningful, not cosmetic: wrong recorded selection probability would corrupt downstream design/importance weights.

## Narrow reviewed implementation

**File:** `server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts`

- Requires `scoreTotal` to be finite and positive.
- Requires every expected `drawScore / scoreTotal` probability to be representable, positive, finite, and relatively consistent with the stored native numeric probability (relative tolerance `1e-9`).
- Tightens comparison of the selected airport's stored probability with its saved `airport_layer_design_probability` to the same relative tolerance.
- Preserves old SHA/readback canonicalization, normalized four-letter ICAO identity, all calendar/config/frame hashes, frozen seed, original decision timestamp, strict >24h45m and <=72h selection lead window, and source no-redraw behavior.
- No change to the real generator formula or a previously saved draw. This rejects falsely represented scoring distributions rather than silently recomputing the stored result.

**Tests:** `tests/phase5_early_preselection_readback_v39.test.ts`. Add an invalid 0.9/0.1 versus 3/2 pair, altered selected probability, nonfinite sum and unrepresentably tiny probability; preserve valid 3/2 → 0.6/0.4 and different object-key orders after PostgreSQL JSONB. Existing no-redraw and role guards remain in other tests.

## Boundaries and next actual Phase 5 work

This check does **not** independently re-derive the traffic prior, historical feedback, previous sampling-state hash, eligible airport frame, signed 31-day calendar, legal source rights or live source/flight evidence. A valid vector is necessary but not sufficient for a fully authenticated adaptive draw. This is **not** a 21-day retrospective selection, true per-flight source/pre/POST, independently verified 7-category UTC budget, or source permission.

**Phase5 scientific FREEZE HOLD; Phase6 paid GO NO.** Do not rerun V0079–V0083, historical P25 or request an additional one-airport pilot. Actual next release-critical work: independently approved first-cycle target plus licensed retention/expiry policy (#300), full future treatment calendar and live provider request-range/7-category physical budget, restricted real GitHub SOURCE→PRE T24/T6/T90/witness→POST/STOP, independent Phase5 FREEZE and separately approved Phase6 activation.

Continuity: [four exit requirements](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md); [assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md); [global prior-airport washout](2026-11-09_PRIOR_COMMITTED_GLOBAL_AIRPORT_WASHOUT_SAME_READONLY_SNAPSHOT.md).
