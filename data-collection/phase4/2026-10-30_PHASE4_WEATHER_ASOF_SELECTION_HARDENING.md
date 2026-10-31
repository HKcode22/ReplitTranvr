# Phase 4 — WSSS weather as-of selection hardening (October 30, 2026)

## Scope and implementation

This change improves **the existing pure operational weather selector** in `server/lib/disruption/weatherSignal.ts` without touching the October 31 paid FIDS workflow, AeroDataBox credentials, receiver, database schema, or provider billing.

- Recognize `SIN` as ICAO `WSSS` in the existing known-airport lookup, instead of treating it as an unmapped airport.
- Filter all sources by issue time **and stored first-availability time** before applying Plan f.8's frozen source hierarchy. Both clocks must be valid and no later than the target cutoff, the first-availability clock cannot precede the issued-at clock, and the issue clock must fall within the frozen six-hour window (inclusive).
- Only after filtering select preferred `live_metar`, `archive_metar`, `gfs`, `nam`. This fixes the case where an out-of-window preferred METAR was selected first and then rejected, incorrectly masking a valid lower-priority archive or forecast.
- Add no-provider tests covering the WSSS mapping, stale-primary fallback, grid fallback, exact lookback boundary, impossible receipt times, and late arrival.

## Scientific limitation

**This is not evidence that WSSS weather has been retrieved, stored, or available at the October 30 T−24h cutoff.** The present live METAR fetch path does not itself prove historical first availability. A METAR retrieved after a PRE cutoff cannot be backdated to claim it was known earlier merely because the report's issue time precedes the cutoff.

The October 30 production 72 PRE candidates legitimately use `airport_weather = NULL` and `weather_missing = true`, and no certified PRE snapshot has been persisted. The new selector is a tested reusable boundary, **not a new WSSS historical weather observation, weather ingestion job, certified join, or Gate 5 PASS**.

## Next verified implementation

Wire real weather receipts to an immutable, license/retention-checked store with station, provider, issue UTC, first durable available UTC, retrieval UTC, raw provenance/response hash, and archive-as-known evidence. Run the above selector from **stored records** for each WSSS per-flight PRE cutoff. Only then join weather into live PRE features. No experimental weather row should be generated from a later fetch or unverified archive publication time.

## Safety and acceptance

CI must pass offline tests/typechecks; no provider calls and no database writes in this change. Existing October 31 finite one-GET-per-horizon protected GitHub schedules are untouched. Selected-T, actual wheels-off, operating identity, certified persisted PRE and outcome coverage remain independent Gate 5 blockers per Plan f.8 and issue #200.

## Additional live-fetch as-of guard

The existing `getAirportWeather` caller now refuses explicit PRE cutoffs that have already passed **before making any live HTTP request**. For an allowed future cutoff, the returned in-memory `availableAt` and `retrievedAt` now represent when the JSON response finished decoding rather than when the GET began; even that is **not** proof of durable weather archive first-availability until independently persisted. The missingness and future-cutoff rule are tested with mocked fetch, with **zero** external weather requests. Current product weather without a PRE context remains supported as current observation, not certified as historical training data.
