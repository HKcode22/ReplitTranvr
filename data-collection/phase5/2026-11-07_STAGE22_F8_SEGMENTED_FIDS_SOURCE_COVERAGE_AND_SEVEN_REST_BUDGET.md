# Phase 5 Stage 22 — f.8 segment-aware FIDS source coverage + seven REST categories

**2026-11-07 UTC.** Proposed standalone *offline mathematical verification*, **not** a live producer, current-provider measured range, permission for normalized flight ML/backup retention, or scientific FREEZE. Code path: [Stage22 exact source cutoff × exposed segment validator](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs), [focused tests](../../tests/phase5_stage22_f8_segmented_source_coverage_v39.test.mjs). Binding correction: [Plan f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md).

## What is different from Stage11 and why

Old `phase5ContinuousPerFlightRefreshCoverage_v39.ts` asks a good limited question: if *every* service window is exactly 4h on **31 consecutive UTC dates**, do hypothetical 4h FIDS refreshes cover the full flight-cutoff interval? But Plan f.8 §8.7 defines **31 ordered batch-days** with 26×4h, 3×2×2h and 2×up-to-6h, plus five crossed treatment pairs and ≥24h airport reuse washout. The old validator cannot prove the real design's full source coverage. Stage21 catches invalid calendar geometry; Stage22 catches source-availability coverage and associated physical REST billing for every approved exposed segment **without creating source data**.

### Exact control flow

1. **Admit Stage21 calendar:** `auditP5F8CrossoverCandidate(calendar)` must return `SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE`, with exact crossover geometry. Every supplied request set is SHA-checked against its frozen candidate digest.
2. **Split the actual exposed intervals:** `partitionP5F8ServiceSegments(day, providerMaxRangeMinutes)`. For a 2×2h parent it returns the two child intervals without covering the inactive gap; for a 6h parent and independently verified max FIDS range 4h, it returns `[0,4h)` and `[4h,6h)`. It never asks the provider for an undocumented 6h query.
3. **Make the entire flight-specific cutoff span:** for each exposed partition, airport slot and horizon `H`, the target interval is `[partitionStart−H,partitionEnd−H)`. A request `q` scheduled at UTC time `t` is **conservatively** considered potentially available to flight cutoffs only in `[t + schedulerSlip + responsePersist + preCommitMargin, t + maxPopulationStaleness]`.
4. **Prove no temporal gaps:** union every query interval in each exact source-partition group. Any uncovered interval returns `HOLD_EXPOSED_FLIGHT_CUTOFF_REFRESH_COVERAGE_GAPS` and the first uncovered cutoff and duration. A source query cannot become an on-time snapshot just because it was scheduled before cutoff; the actual durable `available_at` remains a later independent check.
5. **Bill on the physical request UTC day:** each request carries one unique query key and `utcChargeDay = scheduledGetUtc.substring(0,10)`. First range partition units accrue to FIDS_BASE; additional splits to FIDS_SPLIT. Every actual request UTC date must have a **complete 7-category** budget row (base, split, retry, validation, outcome, history, diagnostic), with exact base/split reservations and independently bounded day/category/cycle/REST floor. Provider Alerts SEND credits are a separate budget.
6. **Return a candidate result only:** `CANDIDATE_EXPOSED_SEGMENTS_TEMPORALLY_COVERED_NOT_RELEASE` is mathematical feasibility, not a live original, physical flight identity, source permission, or Phase6 GO. Evidence flags remain false.

### Explicit negative cases tested

- Distinct split-gap child partition vs fraudulent GET interval across inactive gap.
- Six-hour parent split into 4h+2h at hypothetical 240-minute max (an **illustrative input**, not an account-measured entitlement).
- Missing last-window refresh, missing entire second range partition, wrong request UTC charge-day, missing Day−1 charge budget, unreserved split requests, tampered request SHA, exceeded seven-category REST cap, malformed crossover and no provider call.
- Focused synthetic scenario uses **31 real-shaped candidate batch-days**, 432 `day×slot×horizon×range-partition` groups, a hypothetical 50-minute request cadence/max 60-minute staleness, **1,968** physical requests with **3,936** hypothetical REST units at **2 per GET**: **1,896 BASE** physical GETs (including the second exposed 2×2h child as a new base segment) = **3,792 BASE** REST units, and **72 additional same-segment provider-range SPLIT** GETs (only the two up-to-6h windows at an illustrative four-hour provider max) = **144 SPLIT** REST units. These are **test-case arithmetic**, not measured AeroDataBox numbers or approved run schedule. Actual price, response/range/latency, size and rights must be independently sourced before the real query grid is signed.

## Status, next release work, and deliberate limits

The next *engineering integration* is to pass a **real** reviewed 31-batch-day candidate generated from actual eligible airports/slot×region sequences/anchor rotation and verified provider parameters into the daily source owner; use Stage22 budget outputs as the constraints for V0079 charge-day physical reservations and V0080 GitHub-run prearm, and connect Stage14 to real T24/T6/T90 PRE/POST with an independent durable witness. The existing Stage8/9 and Stage14 code paths remain **staged**, not live, and may need bounds/role/cutoff changes after actual cardinality is known. Do not silently call PREPARED query rows observed original responses.

Authentic November 7 Replit Stage18 baseline audit: B0062 existing columns present; **V0079 0/6, V0080 0/1, V0081 0/1** physically absent from production. Stage19 all-or-none migration rehearsal passed on **disposable PG16 only**. No need for another identical owner shell audit. Source-use/ML/backup rights issue #300 is separately unverified despite documented grandfathered RapidAPI Ultra tier/quota; do not ask owner to repeat it. No paid calls, no production DDL, no Alert CREATE, no receiver publish by Stage22.

**Phase5 nonpaid engineering GO. Scientific final FREEZE HOLD; Phase6 paid 31-day GO NO.**

**Focused test correction:** The first CI run rejected an inaccurate assertion that classified the 2×2h second *child exposure* as a provider-range split; separate exposed segments each start at partition 1 and are BASE. It also caught a negative test that accidentally retained the original shape. Both fixture assertions were corrected and the dedicated Stage22 test run #42377523743 passed on exact updated source. No production flight data were used in either test run.
