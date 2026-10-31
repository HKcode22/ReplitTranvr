# Phase 4 owner instructions — next WSSS paid GETs and weather

_Last reviewed against production main on October 30, 2026 (Pacific time). This is a runbook, not proof that a future job executed._

## October 31 05:31 PDT INCIDENT OVERRIDE — T6 MISSED

**The originally scheduled 03:07 PDT / 10:07Z T−6h GitHub paid FIDS event did not dispatch before its scientific 03:45 PDT latest-safe start. That refresh is UNOBSERVED.** The 07:37 PDT / 14:37Z remaining T−90m opportunity has moved to the explicitly GitHub PUSH-prearmed, one-shot workflow `.github/workflows/phase4-gate5-wsss-t90-push-prearm-20261031.yml`. The original T90 cron is removed to prevent duplicates. Do not assume "ready" until the new push-run is visibly active in GitHub Actions. The runner waits in GitHub, never Replit, until 07:37 PDT, verifies the same frozen WSSS cohort and 08:15 PDT latest-safe paid start, with one protected provider request maximum. See [incident checkpoint](2026-10-31_WSSS_T6_GITHUB_SCHEDULER_MISS_T90_PUSH_PREARM_RECOVERY.md). Historical old schedules in the table below are **not** the current active T90 owner.

## What to do now

**No Replit shell command. No manual 3 AM action. No Cloudflare or Replit Agent.** GitHub's main-branch workflow `.github/workflows/phase4-gate5-three-prospective-wsss-cutoffs.yml` is the autonomous owner. The existing `phase2g-paid` protected GitHub environment previously completed a one-shot FIDS GET and original-source write, so the workflow demonstrated working credentials **at that time**. Current budget and credentials will be rechecked automatically immediately before any billable request; they cannot be guaranteed in advance.

| Observation | GitHub cron (UTC) | Scheduled California PDT | Candidate earliest cutoff | Automatic latest safe start (PDT) | Maximum billable work |
|---|---|---|---|---|---|
| T−6h | `7 10 31 10 *` | **Sat Oct 31, 3:07 AM** | 2026-10-31 11:00Z / 4 AM | **3:45 AM** | 1 FIDS GET, expected 2 REST units, zero retries |
| T−90m | `37 14 31 10 *` | **Sat Oct 31, 7:37 AM** | 2026-10-31 15:30Z / 8:30 AM | **8:15 AM** | 1 FIDS GET, expected 2 REST units, zero retries |

Both read the SAME WSSS **2026-10-31 17:00–18:00Z** (Sat 10 AM–11 AM PDT) service cohort. Combined extra expected 4 API units. No new Alert subscriptions, 0 expected Alert credits. The already scheduled T−24h request was delayed over four hours by GitHub, **HOLD_BEFORE_PAID** and charged 0 units; an earlier successful Oct 30 13:49Z GET yielded 24 source rows and cost 2 actual units. A missed scheduled refresh is NOT treated as zero flights and cannot be backfilled. GitHub schedules are best-effort, not precise clock guarantees.

**Preflight before any paid GET:** reviewed GitHub main/event/run attempt and matching cron, exact one-hour WSSS service window, no past cutoff (15-minute guard), protected API and DB credentials, writable immutable response/population tables and expiry triggers, current AeroDataBox public endpoint contract, account/API-units/request and Alert balance floors. One physical request at most; after GET and transaction commit, an independent original decoded-body and canonical JSONB SHA readback is required. GitHub runner/workflow will display `providerAttempted`, `measuredApiUnitDelta`, `fidsRowsInserted`, original-body integrity and hold/stop reason. A GitHub failure alone is **not** evidence that credits were spent. The independent read-only audit can be rerun without paid provider use.

Useful workflow links: [all Phase 4 fixed prospective FIDS runs](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase4-gate5-three-prospective-wsss-cutoffs.yml) · [original successful paid WSSS GET](https://github.com/HKcode22/ReplitTranvr/actions/runs/41066341220) · [real PRE builder audit](https://github.com/HKcode22/ReplitTranvr/actions/runs/41153035873).

## Night-before infrastructure verification — completed

At 2026-10-31 02:15Z (Friday October 30, 7:15 PM PDT), protected [GitHub run #41159114490](https://github.com/HKcode22/ReplitTranvr/actions/runs/41159114490) **PASS** verified the same DB writer connection-selection path as the scheduled paid operator, INSERT grants, original FIDS immutable and expiry triggers, and **one retained original WSSS source receipt**. The preflight used `REPEATABLE READ READ ONLY`, zero provider calls and zero DB writes. [Phase 4 checkpoint](2026-10-30_PHASE4_NIGHT_BEFORE_INFRASTRUCTURE_READINESS.md) records scope. This check **does not** establish live API balance, exact GitHub dispatch timing, provider response or scientific Gate 5 completion; those checks remain at the actual scheduled execution.

## What exactly are we using for weather?

**Plan f.8 §10 explicitly chooses free operational [AviationWeather.gov METAR and TAF](https://aviationweather.gov/)**. Meteorological Aviation Routine Weather Reports (METAR) describe observed airport weather; Terminal Aerodrome Forecasts (TAF) are forecasts. We must use only the report/forecast **issued AND available before each prediction cutoff**, not a later amended forecast. The frozen hierarchy is `live_metar` → `archive_metar` → the selected NOAA `GFS` or `NAM` forecast grid. Choose nearest operational station within 30 km; absent usable weather within the frozen 6-hour lookback, leave `weather_missing=true` and the value NULL. **ERA5 is retrospective climate/weather reanalysis for later comparison only, not a substitute for real-time missing weather.** The API's stated historical retrieval window is *not* blanket storage permission; source/license retention and archive-as-of proof still require verification before Phase 5 freeze.

**What is actually connected now?** The repo has a weather service module at `server/lib/disruption/weatherSignal.ts` that calls AviationWeather.gov METAR for known IATA/ICAO mappings and enforces an issue-time check. But it does **not yet establish historical receipt availability or production PRE cohort weather joins**. The SIN→WSSS mapping and direct live-fetch historical-cutoff refusal were corrected in PR #282; these are safeguards, **not** proof that historical weather was collected or linked. The October 30 WSSS live PRE builder **explicitly populated optional `airport_weather` with NULL/missing for all 72 candidate snapshots** rather than inventing weather. This is honest missingness, not a claim that the airport had no weather. The next practical work is a verified as-known-at-cutoff weather reader for WSSS and later wider airports, plus optional forecast support; do not retroactively fill T−24 with a METAR fetched after the cutoff.

**October 30 implementation follow-up:** [Phase 4 weather as-of selector hardening](2026-10-30_PHASE4_WEATHER_ASOF_SELECTION_HARDENING.md) adds `SIN → WSSS` and fixes stale-primary blocking of fresh archive/grid fallback; it requires verified issue and stored first-availability clocks. This does **not** mean weather was ingested for WSSS or that any old candidate PRE can be retroactively enriched. The paid October 31 FIDS workflow is unchanged.

## What remains after these two FIDS attempts?

1. Finish scientific source identity/milestone proof for the target population and real runway labels. Existing FIDS returns cannot on their own certify all codeshares or actual-versus-estimated `runwayTime` semantics; provider support response is useful but not a reason to stop implementing other independent layers.
2. Produce **certified, persisted PRE snapshots**, not only the currently successful 72 in-memory candidate builds, and report feature missingness by cutoff.
3. After the WSSS service window completes, measure independent population, resolved/unresolved webhook captures and true observed versus censored/missing target labels.
4. Complete weather/history-as-of and source retention readiness; prepare the Phase 5 manifest/schedule FREEZE only after the binding actual-source gates are met. Phase 6 is the separate 31-batch-day trial and is not silently launched here.

**Owner action:** no command is necessary now. If GitHub reports `HOLD_BEFORE_PAID`, the exact audit reason must be reviewed before asking for any Replit shell access. Never paste protected API keys or DB passwords into chat.
