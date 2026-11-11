# November 11 — ONE Amendment E: first authentic-source PRE features inside the original Stage14 writer

**This is Amendment E, not a new E2, F or separate experiment.** The primary traveler-facing candidate remains T−6h continuous departure delay minutes *relative to the final agreed physical event*, with paired T−90m and T−24h baseline; a separate after-takeoff AIRBORNE ETA is supplementary. Do not confuse actual gate-out with ADSB.lol wheels-off proxy and do not buy another airborne vendor. Reuse all Phase1–5 FIDS source, budgets, as-of weather/history work and free ADSB.lol code.

## Implemented, not merely a proposal

`server/lib/disruption/phase5AmendmentEStage14BoundRouteFeatures_v39.ts` accepts the **same** `clean.flight_population` normalized row already independently qualified by the real Stage14 writer and its exact V0079 original response hash + population UUID + canonical flight identity. It extracts only two safe categorical fields that truly exist in the bound row:

- `origin_icao` from `dep_airport_icao` (must be a valid four-letter-or-digit ICAO and match the Stage14's approved FIDS source identity).
- `destination_icao` from `arr_airport_icao`, if present and valid. Missing/invalid destination becomes an explicit **missing feature**, rather than invalidating an otherwise genuine, cutoff-safe PRE.

Both are `AERODATABOX_FIDS` observations with `available_at` from the actual normalized DB row, `fids_retrieval_utc` when present, and the exact original response SHA as `sourceRecordId`. The code reuses `selectP5AmendmentEAsOfFeaturesOffline` so an observation available *after* **the actual issuedAtUtc**, even if before the mathematical T−6h horizon cutoff, cannot appear in the saved prediction. Missing and contradictory observations do not become invented values. This is safer than letting the PRE builder only compare to the horizon cutoff.

`server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts` — the ORIGINAL existing Stage14 SQL writer — now has an experimental `amendmentENativeRouteBoundCi:true` option, locked to GitHub Actions disposable local PostgreSQL16, no provider API key, no paid owner, no Phase6 arm. It calculates `issuedAtUtc` from its own initial DB clock **after** confirming that the flight is within its own true PRE cutoff, uses the already-joined source-bound population row, and passes the issued-time-safe feature inputs to the same `buildPreSnapshot` and `persistPreSnapshot` calls. There is no second writer, new database table, paid provider call, or duplicate original API read.

**The old `features:[]` default is preserved for existing production code until the independent source rights/role/feature provenance review and actual Phase5 release.** The CI switch demonstrates the real persistence path rather than claiming the model is already ready.

## Tests

- `tests/phase5_amendment_e_stage14_bound_route_features_v39.test.ts`: selects both observed airport codes, refuses mismatched original hash and flight identity, rejects observations that appear only after issuance, preserves missing destination, refuses output after cutoff and invalid source timestamps/rights.
- Existing real `tests/phase5_cd_v0088_existing_stage14_real_v0087_queue_pg16_v39.test.ts` (reused, not copied again): its original FIDS population fixture now sets `arr_airport_icao=YSSY` and the actual Stage14 write receives `amendmentENativeRouteBoundCi:true` and must read back **persisted** `features_json=[{name:'origin_icao',value:'WSSS'},{name:'destination_icao',value:'YSSY'}]`. The actual V0087 task, V0088 same-tx receipt, restricted role, post-commit readback and verified queue ACK are still required.
- The disposable V0088 PG16 workflow now runs both new tests; no external API keys, no live Neon access, no database record copied to public CI.

**Test declarations are NOT success claims until exact-head Actions show green.** All the strict scientific metadata checks remain; the user accepts bounded missingness and wants to finish rapidly rather than demand perfect coverage.

## What remains for a meaningful model

Airport origin and destination are **not enough** to certify useful delay-minute prediction. Genuine, licensed source-issued **current FIDS revised departure/status**, historical route delay aggregates, airport congestion, METAR/TAF issued times, turnaround/previous-leg context and carrier/operating-aircraft context must be added where actually available, using the existing Phase4 weather as-of selector and `historicalFeatureStore_v3.ts`. Every feature needs source original/hash, actual available time, missingness, decision time and retention/license review, preferably in an immutable feature-lineage receipt. No label/outcome may leak into a PRE. A null feature is not a reason to drop a valid flight.

Research evaluation remains MAE/median absolute error/quantile calibration, comparing T−24h vs T−6h vs T−90m and a simple baseline with grouped temporal/route splits, with missingness and coverage included in the reports. This requires real prospective evidence and trusted outcome event types; CI synthetic source tests cannot prove predictive accuracy.

## Cross-workstream status

Owner has **already successfully installed V0087** into the actual team database, 0 tasks and no runtime privileges or paid credits. Do not repeat its installer. V0088 true queue-to-Stage14 transaction admission/legacy preservation is a **separate staged** PR; never install the disposable privileged trigger into live Neon. The GitHub automated owner/watchdog/STOP, NOLOGIN function owner/worker credentials, live original PRE test, rights/retention/final target label, and independent Phase5 freeze are still outstanding. The planning aim is an engineering milestone by Friday Nov 13, with Friday Nov 20 the outside target for Phase5 readiness; these are goals, not blanket approvals.

**Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.**
