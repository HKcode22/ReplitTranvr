# Phase 5 Stage 21 — Enforce registered f.8 calendar structure before any scientific FREEZE

**Date:** 2026-11-07 UTC. **Status:** purely offline structural candidate acceptance and bounded finite-candidate solver, not the complete globally generated/verified study calendar, paid source/Alert commissioning, or scientific Phase5 FREEZE. **Phase6 remains NO-GO.**

## Specific defect discovered against binding [Plan f.8 §8.7](../plans/V3.9_DataCollectPlan_f.8.md)

The existing [Stage11 source-refresh coverage model](../../server/lib/disruption/phase5ContinuousPerFlightRefreshCoverage_v39.ts) assumes *31 contiguous UTC service dates* and a single four-hour window per batch-day. That model is valid only for its **limited four-hour synthetic baseline**; it cannot validate f.8's registered full study, where 31 **ordered batch-days** may span more than 31 calendar dates because of repeated-airport washout, and the mandatory window shapes are **26 standard 4h, three 2×2h split-gap, and two up-to-6h**. Five of the 26 standard days must be matched-pair controls, leaving 21 ordinary 4h days. Do not silently label Stage11 SAT as a full f.8 SAT.

## What code was added

[Pure Stage21 f.8 crossover-calendar candidate guard](../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) checks a supplied complete candidate packet and returns a typed **`SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE`** or a list of `UNSAT_HARD_F8_CALENDAR_CONSTRAINTS` reasons. It **never supplies missing dates, future airport draws, actual provider observations, flight labels or spend evidence**. Input SHA values are immutability cross-references only, never cryptographic proof of external facts.

Current enforced structural constraints:
- Exactly **31 ordered, UTC-valid nonoverlapping parent batch-days**, each with frozen 4 distinct airport ICAOs, frozen four target-region labels, one of six 4-hour UTC start slots, distinct Alert parent budget-day identifier and one evaluation split.
- **Exactly 26×4h / 3×2×2h / 2×up-to-6h**. A 2×2h parent must have exactly two disjoint 2h segments separated by a positive gap, with parent boundaries matching both; a 4h parent is exactly four hours; an up-to-6h planned maximum is six hours (not an assertion the final run lasted six).
- Within each complete group of six ordered batch-days, **each of UTC 00/04/08/12/16/20 exactly once** (five full blocks, one remaining day).
- Exactly **five** unique frozen matched crossover pairs, each with two ordered periods, one 4h control and one alternative; **three** alternative split-gap and **two** alternative up-to-6h pairs. Both periods share exact four-airport set, four target regions, UTC time class, weekday/weekend class, frozen pair template and train/validation/test split.
- Period 2 must be `PAIR_REPLAY` rather than a new adaptive draw; the same airport must have **≥24h from its previous window END to next START** across *all 31 days*, not just pair members. That implements Plan f.8's washout definition, not a 24h start-to-start approximation.
- Explicit seeded treatment order: `deriveP5F8SeededPairRoles` deterministically ranks frozen `(crossover_seed, pair_id, pair_template_hash)` values, assigns three pairs control-first and two alternative-first. This is a **versioned proposed algorithm** for review, not confirmation an independently approved study seed/order already exists.
- Each parent Alert candidate reserve plus unsettled margin must fit its own cap ≤1900. Separate provisional monthly REST FIDS, other REST and protected floor must fit ≤50,000. These are structural *candidate* reservations only, not live balances/charge-day proof.
- Negative regression tests for the old all-4h error, split-gap corruption, pair-member redraw, incorrect replay, 24h washout, mismatched split, reused UTC slot, Alert and REST over-budget, changed seeded order and incomplete days.

## Stage21b finite-candidate SAT solver added in the same PR

[Deterministic finite-candidate calendar solver](../../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs) searches only complete supplied choices for each of the 31 indexed parent batch days. It does **not invent** future airport selections, provider range, proposed dates or source-use rights. It checks a frozen SHA of the candidate pool; prunes overlapping windows, six-slot block violations, early repeated-airport washout and impossible 26/3/2 shape totals; uses the structural guard above to test all hard rules at every complete leaf. Among valid candidates, it minimizes the exact weekday-class × UTC-slot imbalance Σ(n_c−31/12)², then chooses the lexicographically smallest canonical schedule on ties (§8.8). Frozen time-seed deterministically orders bounded exploration, but **never overrides the lexical tie-break**.

Results are carefully distinguished:
- `SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE`: selected one complete candidate from the frozen supplied pool, but not proven globally optimal over every possible real date/airport schedule.
- `UNSAT_SUPPLIED_FROZEN_CANDIDATE_POOL_ONLY`: exhausted this finite supplied pool without a valid member; **not** a claim that every possible real schedule is impossible.
- `HOLD_BOUNDED_SEARCH_NOT_PROVEN_COMPLETE`: search exceeded the explicit 200,000-node ceiling; does not call an incomplete search either SAT-optimal or UNSAT.

Focused tests cover one valid frozen pool, multiple equivalent choices with §8.8 lexical tie-break, intentionally impossible pair assignment, bounded-search failure, and tampered source-pool SHA. All evidence remains offline synthetic only.

## Explicitly NOT solved by this module

The **complete production constraint solver** that first generates the frozen real-world date/airport/region candidate universe and then selects the globally optimal feasible 31-batch-day calendar, ties seeds to real signed manifests, selects weekday×UTC soft-imbalance winner and applies §8.8 lexical tie-break is *still needed*. This guard only verifies a candidate and cannot falsely turn it into a generated final artifact.

The HUB 5-airport anchor rotation, MID 7-day freshest-first and region-permutation sequences, actual adaptive selected-at/DB commitment before each T24, eligibility/source range, real source staleness, actual per-UTC-charge-day seven-category REST budgets, crossovers' real provider endpoint split-range behavior, published receiver/source rights, accurate operating-leg native selected T and POST/Alert/AIRBORNE science are **explicitly NOT certified**; result fields are false. Final release requires another independent audit and genuine future data, not optional fixture IDs.

## Continuity facts

Actual owner Replit production audit at 2026-11-07T12:36:14.015Z still shows full baseline and **all V0079/V0080/V0081 tables physically absent**. [Stage19](2026-11-07_STAGE19_ATOMIC_INERT_V0079_V0081_SCHEMA_COMMISSIONING_CI.md) proves atomic three-migration install and rollback on disposable PG16 only; it is **not a Replit installer**. Provider normalized source/ML/backup rights under [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) remain unresolved. Historical [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) and catalog-locked implementation log Git blob `0a5e4bedfa7c743feaf05ec2dc66f22084f39236` remain untouched.

**Disposition: Stage21 nonpaid engineering advancement; no source calls, no database writes, no production DDL, no new statistical release, no Phase6 paid GO.**
