# Phase 4 Gate5 — Historical October 31 raw FIDS normalizer filter replay

**Status: CODE CANDIDATE, not yet a measured live result.** This checkpoint follows [PR #297](https://github.com/HKcode22/ReplitTranvr/pull/297) and its real protected [read-only run #41268239697](https://github.com/HKcode22/ReplitTranvr/actions/runs/41268239697), with the original Oct31 WSSS service window **17:00–18:00 UTC**. No paid provider call, no database writes, no prospective new cohort, no backfill of missed T−6h, no scientific Gate5 PASS.

## Verified historical source/normalization discrepancy

Two retained original FIDS query receipts; original raw departures **24 and 87**; the normalized population rows linked to those same receipts are **24 and 86**. Source hashes and normalized-member-before-parent checks: zero in these two receipts. Thus the **single net source-count discrepancy is localized to the second retained original**. It is NOT yet evidence of one omitted physical flight: raw departure movements and provisional analytic population identities are not independently certified physical operating legs, and offsetting filters or identity deduplication can hide row-level causes.

The previous original-field run [#41266327695](https://github.com/HKcode22/ReplitTranvr/actions/runs/41266327695) also found **111 raw departure observations**, with generic scheduledTime present 111, revisedTime present 87, Live quality 87, and departure.runwayTime UTC **0 at inspected JSON path**. Provider OpenAPI allows actual OR estimated revised/runway timestamps; no actual-only wheels-off certificate exists.

## Exact current normalization code is now located

The production normalizer is server/lib/disruption/fidsCensus_v3.ts, function normalizeFidsRecord. For each departure movement it:
1. parses departure.scheduledTime.utc with JavaScript Date; a missing/invalid schedule is excluded
2. excludes selected scheduled UTC earlier than serviceWindowStartUtc or at/after the exclusive serviceWindowEndUtc
3. excludes isCargo=true only when withCargo=false; excludes isPrivate=true or isGeneralAviation=true only when withPrivate=false
4. excludes canceled and marketing codeshare records ONLY when their inclusion flags are false.

The recorded October 31 paid request set direction=Departure, withCancelled=true, withCodeshared=true, withCargo=false and withPrivate=false. Therefore raw records may legitimately be filtered by invalid/out-of-window time, cargo or private/GA flags, but **not** by cancelled/marketing classification if the hash-bound original application-intent contract matches.

## New bounded zero-provider replay

- server/lib/disruption/phase4Gate5HistoricalOriginalFilterReplay_v39.ts: fetches only up to 12 retained original payloads **inside an existing protected REPEATABLE READ READ ONLY PostgreSQL transaction**; validates each frozen airport, application-intent request contract, source size (maximum 900 departures per original) and original receipt ordering. Runs a strict, order-preserving mirror of the *current* normalizer's exclusion predicates in memory. Outputs aggregate per-original **filter reason counts only**; never prints or exports flight numbers, routes, raw data, original query IDs, exact source timestamps, or source hashes.
- Tests: tests/phase4_gate5_historical_original_filter_replay_v39.test.ts: synthetic boundary, invalid schedule, cargo/private/GA, included cancelled/marketing, original request-frame failure, missing original as UNKNOWN, bounded read-only SQL and noncertification.
- Updated SHA-pinned historical GitHub read-only runner includes filter replay and reports whether current-code predicted normalized counts match stored per-receipt population counts. A match is **software-filter count parity**, not record-ordinal linkage or historical producer-version attestation. A mismatch remains a scientific HOLD; no software-side rewrite of the original dataset.
- Original paid workflow and other October 31 audit workflows are not changed. Canonical V3.9 Implementation Log blob remains untouched and source-catalog integrity tests continue to apply.

**Must not claim a real filter-exclusion reason until all four CI checks PASS, PR merges, and a new actual protected GitHub SQL audit returns it.**

## Continuing requirements

1. Investigate an actual replay mismatch with versioned producer source and original member row linkage; do not invent or backfill a missing physical leg.
2. Source-native selected T and independently observed actual wheels-off remain unresolved per [issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200). Current AeroDataBox FIDS source has no independently verified true runway-departure field; do not spend on another identical GET assuming it can fix this.
3. A genuinely future frozen paid cohort with full 24h/6h/90m grid still needs an independent audit runner and provider-native target/identity proof. [Issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293) remains open. No Phase5 final freeze or Phase6 authorization.

**Decision:** Gate5 science HOLD; Phase5 HOLD; Phase6 NO-GO. No Replit shell required.
