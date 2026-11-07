# Phase 5 Stage 6 — dynamic 4-airport draw to 12 source-query candidate bridge

**Status:** offline candidate code and tests only; not scheduled, not deployed, not a Phase5 FREEZE or Phase6 paid GO. Do not install V0079/V0080 or create any provider subscription from this review.

## P0 engineering gap

The existing frozen 31-day source-grid V3 assumes each of the 31 days has a known ICAO for HUB, MID_A, MID_B and REGIONAL. In actual Phase6, the REGIONAL candidate depends on adaptive prior-day state that is observed and frozen only by the Stage1 serializable early owner. The Stage5 GitHub one-query CLI also expects a preexisting checked-in `data-collection/phase5/frozen/*.json` file containing a precise selected ICAO. A full month of precommitted, fixed ICAO request files would either invent future adaptive outcomes or be too late for T−24h GET. An early-selection algorithm freeze is not evidence of 31 days of executed selections.

## Added pure boundary

`phase5DynamicDaySourceGrid_v39.ts` accepts **the four previously committed early-draw rows**, their independently required readback SHA, exact frozen daily calendar/config/frame hashes and 12 airport-agnostic source-query templates (4 slots × 3 horizons). It uses the existing canonical `verifyPreparedDailyDraw` function, applies the real Stage1 >24h45m/≤72h timing, validates one shared daily start, true UTC physical charge date, one GET/2 *candidate* API units, max 3600s response+durable-commit and the T24 < T6 < T90 cutoff order. It injects only the saved selected airport for each slot; no caller may include a different guessed ICAO. It emits deterministic hashes and per-UTC-charge-date provisional units, not a release permit.

**Important:** a caller can pass fabricated in-memory rows. This helper does not independently authenticate the database or review rights; its outputs explicitly say `authorizesPaidGet=false`, `actualFlightLevelPreCertified=false` and `phase6Go=false`. A future restricted committed-db source/prearm owner must bind exact query digests to those rows, freeze the selected day and seven-category actual billing-day budgets, release a narrowly scoped GitHub schedule, and then obtain actual source/PRE evidence. This change alone makes **zero database writes**, zero provider requests and zero alerts.

## Executable boundary tests

Zero-provider Vitest checks canonical randomized draw hash/ICAO injection, Day0 + service-day UTC charges, future/too-late/too-early draw, tampering, extra or duplicate slot/horizons, wrong rights-independent contract hashes, late source cutoff, unapproved retries/price and no false paid/PRE GO. A separate GitHub CI job uses no database secrets or AeroDataBox keys.

## Open independent Phase5 acceptance

- Bind the actual database state and frozen 31-day calendar, including rotation/2×2h source variants without silently inventing 372 as guaranteed source counts.
- Create privileged separate query-preparation writer, read-only independent reviewer, true production V0079/V0080 install and restricted grants only after source-rights, expiry and balance approvals.
- Implement real T−24h/T−6h/T−90m timed GitHub jobs and subsequent genuine selected-provider-T flight-level PRE/POST, Alert receiver linkage and independent daily missingness.
- Verify account-specific source use/retention on updated November 7 terms and actual provider credits; no historical Gate5 backfill, no old YSSY paid replay.

Authority: [f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), Phase5 [#413](https://github.com/HKcode22/ReplitTranvr/issues/413), P0 [#416](https://github.com/HKcode22/ReplitTranvr/issues/416), rights [#300](https://github.com/HKcode22/ReplitTranvr/issues/300). The provenance-locked [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) must remain unchanged.
