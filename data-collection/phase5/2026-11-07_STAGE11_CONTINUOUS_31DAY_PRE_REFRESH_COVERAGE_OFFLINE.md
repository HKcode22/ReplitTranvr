# Phase 5 Stage 11 — 31-day continuous flight-cutoff FIDS refresh coverage and physical UTC charge days

**Status:** a pure offline scientific release-design guard, **not** an installed producer, paid collector, actual 31-day signed manifest, certified native T, or Phase 6 GO. It does not create a production schedule or change V0079/V0080 ledgers. Reference: [Plan f.8 §5.2–5.4](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [P0 issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416), [Stage 10 original-to-flight cutoff audit](2026-11-07_STAGE10_V0079_BOUND_FLIGHT_PRE_ASOF_READBACK_OFFLINE.md).

## Why the earlier 372 GET plan was not a scientific source-coverage proof

One FIDS query immediately before each airport/horizon's **first** T−24h, T−6h or T−90m cutoff does not guarantee a suitably fresh population for **all other flights in the four-hour service window**. f.8 explicitly requires a nonadaptive refresh grid across the **entire** target-cutoff span, with MEASURE→FREEZE of scheduler/response/persistence guard, refresh cadence, maximum staleness and provider-specific range/splits.

Earlier Stage6–Stage9 used **12 queries/day × 31 = 372 physical GETs, 744 candidate API units**. This is an accurate *billing calculation for that provisional input*, not a usable coverage proof for the whole four-hour population. Stage11 makes that difference machine-checkable, rather than silently converting a low-cost synthetic grid into a Phase5 FREEZE.

## Safety proof

[Pure Stage11 coverage evaluator](../../server/lib/disruption/phase5ContinuousPerFlightRefreshCoverage_v39.ts) requires exactly 31 contiguous UTC service days, four distinct frozen airport slots per day, three horizon groups, exact query service-frame/airport/horizon pins, a separately verified provider maximum single-request FIDS range, explicit maximum source age, measured scheduler slip, maximum response+durable-commit latency and a pre-commit margin. Each planned request's **conservative cutoff coverage interval** is:

`[scheduled_get + maximum_scheduler_slip + max_response_and_persist + pre_commit_margin, scheduled_get + maximum_population_staleness]`

The union of these intervals must cover the **entire** `[service_window_start − horizon, service_window_end − horizon)` for every day/airport/horizon. Any uncovered millisecond is a logged HOLD, not a zero-count flight and not a missing POST. This is theoretical timing feasibility; real provider availability, source freshness, flight membership and legal rights still need independent evidence.

Billing is computed on the **actual scheduled physical UTC GET day** (including **Day 0** for first-day T−24h), not the flight-service date. Query keys are unique; V0079's current single physical attempt and provisional 2 API units per GET are checked. Every real charge date has an explicit other-category reserve and daily 1,900-unit ceiling, with a separate total-project ceiling ≤50,000 and protected API floor. No hidden zero reservations, category transfers, unpriced retries or alert-credit substitution.

### Illustrative offline examples, *not frozen real operations*

With a hypothetical 60-minute maximum population age and 60-second scheduler slip + 120-second response/persist + 120-second PRE commit margin, **one GET per 4h group** leaves **3h05m of cutoffs uncovered** for that group. The 372-GET month therefore fails the coverage guard.

A *hypothetical* five-GET sequence per group spaced 50 minutes apart can cover this exact 4h cutoff span in the pure model: **1,860 GETs × provisional 2 units = 3,720 candidate REST units**, with **32 actual UTC physical charge dates** in the illustrative fixed-UTC service-day calendar. These are test inputs ONLY, **not** measured endpoint limits, legally usable provider terms, source-request cadence, source frame, the live REST budget tree or accepted scientific capture. A crossover split or provider FIDS truncation still needs endpoint-range and original population evidence. The 31-day real draw and UTC rotation are not replaced by the example's synthetic fixed airports.

## Follow-on work before completion

1. Independently verify source response size/range, plan rate and actual FIDS cutoff/staleness/latency parameters; generate the exact **31-day dynamic actual airport draw → full continuous source refresh plan** with bounded query count and all f.8 seven REST categories.
2. Extend staged V0079/V0080 query prep/ledger + Stage8/Stage9's **exact twelve-row assumption** to the independently frozen multi-refresh cardinality, add real PG16 role/budget/replay tests, and then a GitHub-only signed prospective timed owner. Do not arm a partial/incorrect source schedule.
3. Connect real bound source observations to a certified physical-leg/provider-native first T, a durable cutoff-safe PRE builder independent of webhooks/weather, and POST/Alert/AIRBORNE denominators. Extend Stage10's read-only flight candidate to an independently audited source-backed writer after externally certified rights and freeze.
4. Verify existing published Replit receiver reviewed source, raw-before-2xx, account-specific ML/record retention/backup expiry [#300](https://github.com/HKcode22/ReplitTranvr/issues/300), explicit launch budgets and an independent final Phase5 FREEZE.

**Disposition:** Stage11 can prove or disprove hypothetical **temporal feasibility** for given input constraints; it never passes scientific Gate5 or authorizes paid Phase6. The immutable historical implementation log remains unchanged.
