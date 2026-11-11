# Phase 5 checkpoint — Nov 11 2026: canonical Amendment E, existing ADSB.lol, C+D next implementation

**Base main when this review branch was created:** `c9175705758c339e06da2afcd870be515d4d3549`, merged [PR #564](https://github.com/HKcode22/ReplitTranvr/pull/564). **This branch is DOCUMENTATION/REVIEW ONLY.** Nothing here starts paid Phase6 jobs, mutates provider subscriptions, accesses the team-owned production DB or incurs ADS-B charges. **Scientific FREEZE HOLD / paid Phase6 GO NO** at writing.

## What the owner decided on November 11

- There is **ONE ongoing Amendment E**, not serial E2/E3/F/G versions. The earlier research paper named E2 and the original E proposal remain historical documentation; this [canonical Amendment E decision/reading guide](2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md) contains the current direction and precise unresolved outcome gates.
- T−6h actual departure lateness in minutes is preferred **candidate first-cycle primary**; T−90m updates the same kind of prediction and measures whether later information improves accuracy; T−24h remains valuable. Don't silently freeze a physical label until actual gate-out vs wheels-off semantics and data are independently verified.
- Rich outputs: continuous delay distribution, sensible tail risks, separate cancellation, optional arrival impact, and *separate* genuinely in-flight ETA. No false guarantee from a 31-day sample.
- **No new paid airborne provider.** We already have ADSB.lol prototypes and a November 9 methodological protocol. Reuse and audit those components; official free data is ODbL, production API is best-effort with maintainer contact requested. Avoid silent commercial/derivative-database license breaches.
- C+D remains the chosen architecture: a few restartable, prearmed GitHub jobs; bounded parallel lanes invoking existing Stage14; durable PostgreSQL queue/lease/fence, uncertainty quarantine, safe takeover; watcher independent of owner sleeping/waking.

## Findings actually inspected in the repo (vs future tasks)

| Evidence | Verified today | What is still NOT verified |
| --- | --- | --- |
| `server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts` | Existing source-bound prospective one-flight PRE writer, no retrospective backfill | Real multitask throughput under Stage14 SQL, production queue lease/fence integration and complete feature engineering |
| `server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39.ts` | Bounded 1–16-lane offline adapter with due/waiting/unknown states; injection point for existing writer | No production SQL queue, paid activation, worker-control deployment |
| `tests/phase5_cplusd_disposable_pg16_queue_lease_fencing_v39.test.ts` | Repository contains real disposable PG16 atomic claim/fence/uncertain-commit test | This is not the live PostgreSQL schema or a Stage14 performance benchmark |
| `server/lib/disruption/phase6SafetyWatchdog_v39.ts` | Reusable watchdog code exists | Phase6 health-scheduler wiring, recovery authorization, operational alerts and actual runner timing |
| `server/lib/disruption/airborneMaterializer_v39.ts`, `airborneSnapshotBuilder_v3.ts` | Prior AIRBORNE implementation paths exist | A lawfully approved, capacity-tested, correctly joined, continuous position feed for real Phase6 aircraft |
| `scripts/v39_gate05_adsb_lol_wsss_one_free_get_20261029.ts`, bounded companion, Nov9 ADSB study | Existing free ADSB.lol research and error protocol | Those studies do **not** establish full-country coverage, certified physical wheels-off labels or source use at new scale |
| `scripts/v39_phase5_free_quota_exact_pinned_isolated_replit_once.sh` | Reviewed current-main script blob `e02ea40cc438c46307bf2ec19a7aa60662f5ab6c` uses immutable dependency blobs in private temporary directory | **No** successful owner Replit quota call yet; old local hash mismatch and incomplete heredoc didn't produce balance |
| `scripts/v39_phase5_cd_queue_catalog_owner_readonly_once.mjs` | One-shot read-only production schema metadata inspection code exists | Actual team-managed Replit DATABASE_URL catalog readback still not supplied |

The merged #564 contains forecast mathematical consistency tests and a revised cutoff guard. Those validate limited properties; they do **not** prove true predictor accuracy, a live queue, or a successful provider request.

## Why C+D is the correct *design*, and the exact uncompleted bridge

**Atomic queue claim ≠ PRE snapshot commit.** A worker taking ownership does not mean flight data has been saved. Source original and selected native T/rights must be checked, the existing Stage14 writer must commit before its flight-specific cutoff, then post-commit readback must succeed. A queue task can be CLAIMED, WRITE_STARTED_UNKNOWN or VERIFIED; only the last has a verified snapshot proof. If an old worker crashes mid-write, a new worker cannot simply replay it. Read-only settlement must verify transaction fate and immutable snapshot identities.

**C+D next engineering slice:** don't write a migration before the team-managed real catalog audit. In a disposable PG16 database, connect atomic claim/lease/fence to the actual Stage14 adapter, with realistic synthetic **source-bound** flight rows, cutoff clusters, bounded lanes 1/2/4/8/16 and p50/p95/p99 completion timings. Test kill/handoff/old-owner race, duplicate flight/horizon after native-T update, and shared STOP; require true deadline-safe response, not only throughput. Then implement short automated GitHub rolling owners and independent deadline-aware watchdog without requiring a human overnight. The GitHub Actions six-hour *hosted job* cap and delayed/dropped cron starts make an uninterrupted one-month job impossible; durable state is essential.

**Policy:** Keep good bounded-missingness PRE even if ADSB or weather is unavailable. Preserve *which fields were absent and when known*, not make missing POST success. Independently budget/rest-per-day category and Alert SEND-unit exposure. No unreviewed paid provider call.

## Web evidence verified Nov11 and saved to the canonical Amendment E file

1. [UK CAA 2026-corrected CAP3148](https://www.caa.co.uk/data-and-publications/publications/documents/content/cap3148/) — passenger communication detail/frequency; not our model accuracy.
2. [2026 systematic review of 72 delay-model papers](https://doi.org/10.1016/j.asoc.2026.115761) — uncertainty/deployment/weather data gaps.
3. [2026 conformal prediction / network delay paper](https://doi.org/10.1016/j.jairtraman.2026.103037) — time-aware interval methodology.
4. [2026 delay tail quantile study](https://www.sciencedirect.com/science/article/pii/S0969699726001481) — severe delay distribution sensitivity.
5. [2026 probabilistic block-time paper](https://www.sciencedirect.com/science/article/pii/S0957417425029288) — uncertainty in duration forecasts.
6. [ADSB.lol API](https://api.adsb.lol/docs), [historical traces](https://www.adsb.lol/docs/open-data/historical), [free-key terms](https://www.adsb.lol/request) — free/best-effort ODbL, no guaranteed production scale.
7. [NOAA aviation weather](https://aviationweather.gov/data/api/) — distinguish past observation METAR and prospectively available TAF.
8. [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits) / [cron reliability](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows), [PostgreSQL SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html) — architectural risk basis, not current runtime measurements.

## Exact correction for the interrupted Replit Shell command

The pasted user's shell ended at `SCRIPT="scripts/v39_phase5_free_quota_exact_pinned_isolated_replit_once.sh` with an **unclosed double quotation mark** and **unfinished heredoc**; Bash showed `>`. This means **no quota checker ran**, and the correct immediate recovery is **Ctrl+C** in the same Shell to discard that incomplete input. Do not append arbitrary `"` lines or repeat the malformed block. At the normal `~/workspace$` prompt, run the immutable script using a complete *reviewed* command provided in the chat; the script fetches the exact pinned account-checker dependencies and does not overwrite the local limiter.

**Quota policy:** public new RapidAPI Ultra 50k versus old account readback 60k remains undecided until actual metadata headers from the teammate-connected owner environment. Never infer a downgrade merely from public listing or a FAILED local hash verification.

## Blockers / next safe actions

- **Owner Shell:** one isolated reviewed metadata-only ADB quota check; separate catalog-only PostgreSQL check after command review. No keys or DATABASE_URL should be pasted into chat.
- **Engineering:** actual Stage14+PG16 queue integration and reproducible latency testing; automatic controller/watchdog/POST/STOP; as-of feature assembler; rights and physical-outcome review. Do not repeat historical paid probes.
- **Science:** one prospective primary target/milestone and analysis population/score freeze before evaluating outcomes; paired T−90m and AIRBORNE separate outputs; license compliance and permitted retention.
- **Result:** This checkpoint and canonical E document are additive **research/review artifacts**. They do not claim Phase5 DONE or an active 31-day study.

Continue to update this checkpoint only with proven commit/CI/owner evidence, not predicted completion dates or guessed provider balances.


## New exact C+D engineering increment on this review branch

The branch also adds a **pure, nonpaid C-to-Stage14 result bridge** (`server/lib/disruption/phase5CPlusDStage14ResultBridgeOffline_v39.ts`) with `tests/phase5_cplusd_stage14_result_bridge_offline_v39.test.ts` and a PR-only no-provider workflow. It maps **actual Stage14 result field names** to the existing C worker's expected proof shape only after checking canonical flight, source population query, horizon, initial native T, exact individual cutoff, saved row proof and acknowledged post-commit DB readback before cutoff. It refuses the wrong flight/source, changed-native-T cutoff, nonpending/unknown queue state, empty durable ID, false commit proof or late readback. It **does not** read an actual database, validate external signed packets or certify that a queue fence prevents a stale writer; those remain next integration gates. At the time this checkpoint was authored, the PR CI **has not yet been reviewed**; do not call this a passing production benchmark.
