# Phase 4 — strict durable weather receipt as-of feature boundary

Date: October 30, 2026 PDT. Binding Plan f.8 section 10. Entirely **zero-provider, zero-write** code/tests. The scheduled October 31 paid WSSS FIDS workflow and protected post-window audits are UNCHANGED.

## Work completed here

`server/lib/disruption/phase4Gate5WeatherAsOfFeature_v39.ts` implements an independently testable, deterministic optional PRE weather feature adapter consuming only **already stored, authenticated-by-the-caller weather receipt metadata** (never performing an API fetch or database persistence itself). Every eligible candidate must have source/airport/version + original content SHA, issued/report time, **first system availability and durable receipt commit timestamps both at/before the exact prediction cutoff**. First availability cannot precede source issuance or occur after durable commit. A SHA string and timestamps alone do **not** prove a genuinely stored receipt; that will be an independently verified ingestion-layer responsibility.

METAR selection requires distinct **physical observation time** (not report-issue or retrieval time), <=6-hour observation/report freshness, a valid station ICAO within **30 km** of target, and frozen priority live METAR > archive METAR > frozen GFS **or** NAM grid. For GFS/NAM candidate forecast, preserve actual source issuance time, require first-availability+durability before cutoff, and require **valid_from <= cutoff <= valid_to**, with grid ID and the one frozen grid choice. ERA5 never enters an operational feature; it is retrospective truth only. Null/malformed/future/late-retained sources are excluded, never magically backdated. Deterministic tie-breaking prevents unstable experiments.

`preWeatherFeatureAsOfV39` returns a `PreFeatureInput` for the existing production `buildPreSnapshot`. Absent eligible weather yields `airport_weather=NULL` and `weather_missing=true`; optional feature missingness is **not** a reason to drop a valid population snapshot. Tests exercise real builder integration, future amendments/receipts, stale physical observations, 30km cutoff, grid validity/selection, and ERA5 exclusion. No raw provider bodies or weather URLs are logged by this feature boundary.

## What remains / cannot yet be claimed

**Not completed by this PR:** operational AviationWeather.gov/NOAA ingestion, independently validated source timestamp provenance and original content SHA custody, schema `weather_observation`/`weather_forecast` and legal retention review, historic archive depth/permissions, genuine WSSS persisted weather receipt or weather joins for the **already collected** T−24 and upcoming T−6/T−90 snapshots. Existing live PRE source builder still supplies explicit missing optional weather; it has not been secretly filled from a later source. This module is the safe feature-selection boundary for future ingestion, NOT completion of Plan f.8 weather readiness.

Source identity, provider-selected T, true wheels-off labels, durable certified PRE, post-window capture rates and Gate5 PASS remain unverified. Do not freeze Phase5 or begin Phase6 based on this result. No user Replit shell command.
