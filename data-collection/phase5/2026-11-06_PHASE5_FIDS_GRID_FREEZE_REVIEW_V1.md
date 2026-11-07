# Phase 5 — 31-day FIDS acquisition-grid freeze validator, review v1

**Real software work, not a Phase4/YSSY experiment.** This Phase5 feature validates a complete **candidate** 31×4-airport-slot×3-horizon FIDS acquisition plan using exact UTC clocks and independently supplied current provider unit prices. It performs *no* paid provider calls, DB reads/writes, GitHub workflow dispatch, provider subscription activation or phase freeze.

## Source contract

- [Pure validator](../../server/lib/disruption/phase5FidsFreezeGridAdmission_v39.ts) and [CLI](../../scripts/v39_phase5_fids_freeze_grid_check_v39.ts); [offline unit tests](../../tests/phase5_fids_freeze_grid_admission_v39.test.ts), [safe offline CI workflow](../../.github/workflows/phase5-fids-freeze-grid-offline.yml).
- Input `P5FidsGridInput`: exact independently frozen `startDayUtc`, genuine calendar/config/frame/provider-contract SHA256 pins, **explicit protected project API envelope ≤50,000**, non-FIDS category/month floor reservations, explicit daily all-category ceilings ≤1,900, frozen other-category allocation for each of exactly 31 days, and one or more FIDS `Departure` query slots for each day × HUB/MID_A/MID_B/REGIONAL × T−24h/T−6h/T−90m.
- Each query contains immutable query key, intended service window, service airport ICAO, planned earliest cutoff, planned request UTC, **pessimistic maximum response+durable commit seconds**, current actual API units per attempt, and maximum attempts up to three. Dates are strictly ISO UTC; the 31 run-days are consecutive by exactly one UTC day, and a day-slot has one airport for every horizon.
- Validator independently recomputes **worst-case requests and all retries** at both daily and 31-day ceilings (including other source category reservations, floor) and rejects late/uncertain source requests, incorrect cutoff order, missing horizon/days, duplicate query IDs, same airport used in two slots of one day, unpinned provider contract, unknown cost/latency, and incomplete daily other-service spending reservations.
- Output is an input-order-independent SHA256 hash, counts and daily worst-case cost table; status **`SCHEDULE_BUDGET_ARITHMETIC_VERIFIED_NOT_PHASE6_AUTHORIZED`** even when all arithmetic succeeds. It explicitly marks `confirmsLiveSource=false`, `confirmsSourceUseRights=false`, `confirmsFlightLevelPre=false`, and `authorizesPaidCollection=false`.

## P0 timing / adaptive selection conflict found in actual Phase6 controller

**Direct source review (Nov6):** `server/lib/disruption/adbCollectionController_v3.ts::startBatch()` loads the adaptive state and calls `chooseAirportsForRunDay()` **at batch start**, immediately before creating the first Alert subscription. Meanwhile `phase6SafetyWatchdog_v39.ts` explicitly does not fetch FIDS, and original f.8 source-prep requires real T−24h (and T−6h/T−90m) PRE observations already stored before the flight-specific cutoff.

**This is a proven algorithmic integration timing problem, not a provider API failure.** A T−24h source owner cannot prospectively observe *only* the eventually selected airports if those airports aren't drawn/committed until near service window start. The REGIONAL draw depends on adaptive state, so pretending all 31 actual airport choices were frozen in advance also breaks the planned allocation semantics. Must solve before Phase5 FREEZE, not after day 1.

**Decision to resolve in reviewed implementation:** Preselect/commit each day's actual airport set (and the adaptive state version used) sufficiently before its **earliest** T−24h acquisition request, with a frozen policy for exactly what prior completed state is eligible at that early decision time. Then run the GitHub-only FIDS source owners, and at parent subscription start **reuse the persisted early decision** without redraw. Alternately preregister an independently funded, source-rights-cleared candidate-pool observation strategy; do not claim the current project cost budget covers it. Reject same-day redraw, retrospective PRE backfills, last-minute source changes, and selection on future outcomes. Estimate any bias introduced by stale adaptive feedback, preserve selection probabilities and analysis strata.

The current pure validator therefore requires `plannedAirportSelectionUtc` on every grid row, identical across a day-slot and **before the earliest planned source request**. A synthetic 31-day table of static ICAOs is useful only as a **worst-case structural/cost fixture or an explicitly different fixed-frame design**, not as proof that the intended adaptive actual selections have already been made. The validator returns `confirmsActualEarlyAirportSelection=false` and `authorizesPaidCollection=false` permanently. For real adaptive operation, a separate just-in-time *day-level* grid must become concrete and durably signed before that day's T−24h source time. The source/receiver/retention owner still needs independent review.

**P0 Phase5 handoff:** implement an early preselection function/ledger with frozen as-of state timestamp, independent GitHub T24 admission, duplicate-prevention and readback; adapt `startBatch` to refuse an unprepared day instead of redrawing. Simultaneously verify correct producer role/ledger and no-phase6 activation without fresh 3-horizon evidence. Do not present this offline validator as the already-deployed schedule.


## Important real-world limits, not hidden

- This validator checks **planned acquisition times**, not actual source arrival. It cannot certify provider initial scheduled T, codeshare operating ID, whether a provider API succeeds, provider truncation, dynamic population completeness, FIDS original availability relative to every *actual* flight cutoff, or provider Terms. The subsequent GitHub source owner must use the existing V0076/V0077 strict original binding and actual DB clock and preserve source available_at≤cutoff, including missing/late rows. Never backfill missed PRE.
- The candidate full 31-day calendar, 4 slots/day, source-attempt count and cost ledger **are not yet frozen and do not exist from this artifact**. The unit tests use an intentionally **synthetic** 2027-01-01 31-day calendar and hypothetical 2-unit price and 300-second latency only to test arithmetic. These fixture values are NOT live provider facts, user-start dates or valid scientific source/retention decisions.
- A real source query may need multiple sub-windows and refreshes to cover the full 4-hour service interval and each as-of horizon; place EVERY required request in input. One query/airport/horizon in a fixture is not sufficient proof of provider coverage. Budget re-evaluation must use the final call ledger generated from all required splits/retries.
- Other seven-category REST budgets, a real identity/source rights plan, current 1-month provider quota, public deployed receiver SHA, 31-day original/POST provenance and legal/technical expiry are separately required for Phase5 final FREEZE. The existing Phase6 safety watchdog handles Alert subscriptions, not the FIDS acquisition source owner; do not infer the latter is deployed from this grid validation.
- Phase5 first-day launch requires an independent signed release and separate Phase6 GO; no paid sampling should be started merely because a pure arithmetic validator passes.

## How to invoke after the frozen manifest actually exists

```bash
npx tsx scripts/v39_phase5_fids_freeze_grid_check_v39.ts /path/to/reviewed-phase5-grid.json
```

Only a local reviewed JSON file is accepted. The output gives aggregate times and cost math without individual flight IDs or raw provider payloads. The CLI deliberately returns HOLD and exit 2 on failure, not a paid fallback.

This is a concrete first implementation toward the 31-day source producer, **not the complete production owner workflow**. Next engineering work: adapt the proven Gate5 source owner to consume this frozen grid under GitHub Actions while preserving its exact original/cutoff/acquisition protection and implementing daily source-quality/read-only audit.
