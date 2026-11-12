# Nov 12 — Reuse existing NOAA METAR + bitemporal history in ONE signed Amendment E PRE packet

**Phase 5 engineering, no provider calls.** This builds on merged PR #593 (original Stage14 sealed multi-feature reader) and PR #595 (one bound V0079 FIDS original → four actual source fields). It **does not** build another weather collector, another data warehouse, new ML model, grant Contents-use rights or modify existing V0087–V0092.

## Existing code reused, rather than rebuilt

- [Phase4 NOAA METAR decoded durable receipt](../../server/lib/disruption/phase4Gate5NoaaMetarReceipt_v39.ts): keeps NOAA observation, report/issue, system-collected and **actual durable-artifact-read** times separate; sources include visibility in **statute miles** and wind speed in **knots**, NOT direct meters; the decoder omits `10+` visibility rather than fabricating 10 miles.
- [Phase4 durable as-of weather selector](../../server/lib/disruption/phase4Gate5WeatherAsOfFeature_v39.ts): requires real issued, fetched and durably available source by forecast issue time; METAR station within 30 km and ≤6-hour age; do **not** treat NOAA fetched time as evidence that a GitHub artifact was stored earlier.
- [Existing historical bitemporal store](../../server/lib/disruption/historicalFeatureStore_v3.ts): `information_available_at`, `valid_from`, `valid_to`, `source_timestamp`, payload hash. Its SQL loader distinguishes "missing as of" from query/infrastructure errors rather than magically treating exceptions as absent observations.
- [Source-original FIDS compiler (PR #595)](../../server/lib/disruption/phase5AmendmentEFidsOriginalFeatureCompiler_v39.ts) supplies four first-source fields for one positively identified operating flight, with identical source query/response identity.
- [One source-signed Stage14 supplemental packet](../../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39.ts) still performs final same-flight source/class/issued-at checks, then the original Stage14 writer persists the resulting `features_json` if all separate release gates remain reviewed and true.

## What this PR does

[New pure existing-source adapters](../../server/lib/disruption/phase5AmendmentENoaaHistoricalReceiptCompiler_v39.ts) add:
- Origin **METAR** `origin_metar_visibility_m` = `round(visibilitySm × 1609.344)` only when numeric, finite and ≤100,000 meters; `origin_metar_wind_kt` copied as a finite 0–250 knot value. Weather is selected by the actual database prediction issue time, not a retrospective event. Missing `durableArtifactReadAtUtc`, post-issue durable receipt, stale source, missing numeric visibility or wrong station yields NULL/missing or explicit refusal as appropriate. Original NOAA receipt and local strings are not output as new source originals.
- Four **historical context** candidates: verified tail-based `prior_aircraft_turnaround_minutes`, independently named route `prior_route_departure_delay_median_minutes`, origin `prior_airport_departure_delay_median_minutes`, and origin `airport_congestion_1h`. Exact predeclared feature/DB entity type and **reviewed** route/tail entity IDs are mandatory, rather than calculating route identity from a cross-airport guess or inferring a tail from flight number. `validFrom` must be ≤ actual issue, `validTo` still active, `informationAvailableTimestamp` before issue, sourceTimestamp before available, with real payload and source version proof. Absent, expired or late rows stay missing rather than appearing as training information. Infrastructure failures still throw through the preexisting historical store.
- A **pure draft combiner** joins those two source-type results to the same original four-field FIDS packet from PR #595 and recomputes a single bounded SHA-256 `observationsSha256`. All **12** currently declared supplemental names can be represented: 4 FIDS + 2 NOAA METAR + 4 historic values, with **2 TAF fields intentionally NULL** until true independently received/issued/valid NOAA TAF source receipts are available. Contradictory field ownership, duplicate feature names and another flight's source fail closed.

## What is *not* proven

These are **source receipt adapters**, not a provider network fetch or actual review of the historical aggregate's upstream facts. A caller-supplied `payloadSha256` or `externallyReviewedSourcePurposeSha256` is integrity metadata, **NOT** source authentication or legal-use attestation. Only an independent, authorized source owner can store/combine such receipts into a **frozen, approved** future-flight signed packet. Weather free endpoint access is not a blank check to ignore archive-use/retention obligations. Real TAF remains unimplemented; do not manufacture TAF flight-category labels from METAR. Carrier/route/tail coverage must be measured, not assumed.

A new future source owner must:
1. Confirm account/license and content retention, original V0079 binding and native schedule/flight identity.
2. Retrieve already persisted original, appropriate weather durable receipt and bitemporally valid historic rows using existing owners **before actual PRE issue**; no HTTP or DB write in the Stage14 ~3-minute deadline.
3. Record explicit missingness when any source was absent/late; never retrofit it afterward.
4. Freeze and independently review the all-sources packet SHA and code SHA before V0091 queue registration and PRE workers, retaining existing STOP gates and V0081 T24 witness.
5. Only then run a genuine future one-flight source→PRE→POST/STOP pilot and study label coverage.

## Handoff / scientific state

The original V0087–V0092 roles/queue are **live-installed but inert**. No additional flight task, paid API use, new migrations, signed real packet or physical gate-out observation resulted from this PR. The preferred Amendment E target remains a **conditional research candidate**, not a frozen verified physical gate-out outcome. The optional four/five/six horizons from [budget tier evaluation](2026-11-12_4_5_6_HORIZON_FULL_LEDGER_CANDIDATE_BUDGET_NO_GO.md) remain unarmed hypotheses; the actual 50K project ceiling and separate Alert credits must be independently budgeted before further horizons.

**Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.**
