# Gate 5 technical walkthrough — Nov 1, 2026 verified GitHub state, paid T−24h success and expected SKIPPED jobs

**Audience:** owner/operator and future coding agent. **Authority:** binding [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§5–7, 16, 17 and hash-locked [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §1.9. This explanation does **not** amend either. Read together with [exact timed live cohort checkpoint](2026-11-01_GATE5_REAL_NOV2_THREE_HORIZON_PAID_SOURCE_EXECUTION.md).

## The research question, without jargon

A webhook tells us **which flights sent us notifications**, not all flights in the departure population. A flight with no message must not silently disappear from the denominator. Before Phase 6, Gate 5 must validate a **provider-observable** flight population from AeroDataBox airport FIDS against webhook capture and outcomes, with a frozen time reference T and independent denominator counts. This is not a claim to enumerate every real-world flight. Phase 4 validates that later training examples are legitimate before we spend a month collecting them.

For every airport/time window/horizon, final required funnel is:
`FIDS primary members → confirmed physical operating legs → horizon eligibility → expected PRE rows → actual persisted PRE rows`, plus independent `captured-inside / captured-outside`, weather/other feature completeness and actual-only terminal outcome applicability/observability. The webhook is **parallel** to PRE eligibility. Any missing optional features may be `NULL` without erasing eligible PRE. Zero true denominator gives `rate=NULL, reason` rather than zero. Source known only after a cutoff may not backfill earlier existence.

Plan §6.0 defines `T` as **first verified provider-native schedule milestone**, NOT automatically FIDS `departure.scheduledTime` or an FAA gate-out/runway timestamp. At each actual flight's frozen T, `cutoff=T-24h`, `T-6h`, `T-90m`. `information_available_at<=cutoff` is the leakage guard. A revised/estimated `runwayTime` is not a certified actual wheels-off label. Marketing code-share rows cannot silently become independent operated legs. Retention rights are also a precondition of durable source storage.

## What the *current* paid November 2 test is — and what it is not

It is a **finite real AeroDataBox REST FIDS field-presence/source-availability and GitHub automation experiment** over WSSS Singapore departures whose chosen 1h service interval is **Nov 2 17:00–18:00 UTC = Nov 3 01:00–02:00 Asia/Singapore = Nov 2 09:00–10:00 PST**. Its fixed manifest is [GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json](GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json). **Its three cutoff clocks are a candidate interval-clock engineering grid, not per-flight verified first provider-native T**. No one may promote these counts to real per-flight horizon PRE rows.

The code makes **three one-attempt provider GETs at each of three distinct time horizons** (9 fixed physical slots, 2 expected REST units each, hard maximum expected 18 units, zero Alert credits). UTC and PST clocks are:
| Owner | Job event / early prearm | Frozen GET target times (UTC) | PST GET time |
|---|---|---|---|
| `owner-t24` | one exact PR #326 merge `push`; actual verified start Nov 1 12:59:16Z | Nov 1 16:30, 17:00, 17:30 | Sun Nov 1 08:30, 09:00, 09:30 |
| `owner-t6` | independent Nov 2 06:37Z `schedule` (**Nov 1 22:37 PST**) | Nov 2 10:30, 11:00, 11:30 | Mon Nov 2 02:30, 03:00, 03:30 |
| `owner-t90` | independent Nov 2 11:17Z `schedule` (**Nov 2 03:17 PST**) | Nov 2 15:00, 15:30, 16:00 | Mon Nov 2 07:00, 07:30, 08:00 |

Source API:
`GET https://aerodatabox.p.rapidapi.com/flights/airports/icao/WSSS/{fromLocal}/{toLocal}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false` with `fromLocal=2026-11-03T01:00`, `toLocal=2026-11-03T02:00`. Key is passed via GitHub protected `phase2g-paid` secret, never printed.

**No provider original/flight IDs/flight-level timestamp records are written;** data are inspected in runner memory and only anonymous **aggregate counts** appear in logs. No database connection, V0076 per-attempt reservation, FIDS original durable table or certified PRE snapshots are created by THIS paid test. This is purposeful limited scope because customer-specific lawful longer retention, native T and actual-only target cannot yet be certified, not a full Gate 5.

## Actual read-only GitHub evidence, verified Nov 1 evening

- **SUCCESS**: [Actions run #41309044744](https://github.com/HKcode22/ReplitTranvr/actions/runs/41309044744), merge #326 commit `90d543c377a631d8e2789403d1273b6bd97062ed`. Actual `owner-t24` job **#124855394173**, started `12:59:16Z`, GitHub API authenticated own running state at `12:59:38.663Z`, 3 paid source dispatches `16:30:00.552Z`/`17:00:00.435Z`/`17:30:00.497Z`. All 3 successful; **6 API units measured from response quota-header delta**, 0 missing slots/retries/DB writes; finished `17:30:03Z`.
- Three separate FIDS responses each had **23 departure records**, 7 provider `IsOperator`-tagged, 16 `codeshareStatus` unresolved under exact checked path, 23 `departure.scheduledTime` present, **0 `departure.revisedTime` and 0 `departure.runwayTime` present**. Repeated 23 records do not imply 69 distinct physical operating legs. `quality` field present for 23, but does not supply actual runway evidence.
- **EXPECTED SKIP IN THAT SAME SUCCESS RUN**: jobs `owner-t6` #124855395233 and `owner-t90` #124855395266 skipped because the current event was a `push` and those jobs require `schedule`. There was no failure or user interaction.
- **EXPECTED ALL-JOB SKIPPED**: [Actions run #41310360522](https://github.com/HKcode22/ReplitTranvr/actions/runs/41310360522), from PR #327 merge `push`, was skipped: `owner-t24` requires the **specific original** `Merge pull request #326` commit; `owner-t6`/`owner-t90` require their **future exact cron** event. This is a *necessary anti-duplicate paid guard*, not a missed T−6h collection.
- At this checkpoint, Nov 2's two scheduled events have not happened and have no validated running job or paid receipts. **Do not mark either SUCCESS or FAIL yet**. An installed cron is not a running runner or source evidence.

## How the code works: exact owner files and responsibilities

1. [Workflow](https://github.com/HKcode22/ReplitTranvr/blob/main/.github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml): GitHub Actions trigger separation `push` (only merge #326) vs two future `schedule` crons; three independent `owner-t24/owner-t6/owner-t90` jobs, protected `phase2g-paid`, `contents:read`, `actions:read`, no DB secret, per-job 345m and paid step 330m timeouts, one concurrency group, `cancel-in-progress:false`.
2. [Frozen manifest](GATE5_WSSS_20261102_FROZEN_NONRETAINED_REAL_HORIZONS.json): exact airport, service window, freeze metadata, 30-minute guard and refresh cadence, 45m max staleness, 60m runner-prearm lead, 9 queries * one physical attempt * two units = 18 expected maximum, no durable provider source retention or scientific promotion.
3. [Grid builder](https://github.com/HKcode22/ReplitTranvr/blob/main/server/lib/disruption/phase4Gate5FrozenGridDraft_v39.ts): computes 3 candidate cutoff clocks for each horizon at 30-minute cadence, `physical_dispatch=cutoff-30min`, latest permitted dispatch `<=cutoff-15min`, validates airport timezone and rejects DST edges, too-late frozen assignment or budget overrun.
4. [Actual timed owner](https://github.com/HKcode22/ReplitTranvr/blob/main/scripts/v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions.ts): `validatedContext` requires correct repository/ref/head SHA, true first GH run attempt, exact workflow name/job/event/cron, API key and no DB credentials. `verifyRealRunningGitHubJob` reads the GitHub Actions API to verify that the exact **live running job** began inside the prearm-open/deadline interval; scheduler's nominal cron is not proof. It never emits a late/catch-up GET.
5. For each of 3 indexed fixed queries, owner waits on the GitHub runner until its planned target dispatch clock, validates cutoff and one-attempt cap again, calls `getBalanceEvidenceStrict()` through the *free* account/balance endpoint, refuses depleted/stale quota, then makes precisely **one** `fetch` to the AeroDataBox WSSS FIDS source (15s timeout, 4MiB response, no retry). HTTP error/ambiguous transport causes `UNOBSERVED`, not zero flights.
6. [Anonymous field inspector](https://github.com/HKcode22/ReplitTranvr/blob/main/server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39.ts) computes count of returned departures, tagged operators/marketing/unknown statuses, and presence of scheduled/revised/runway/quality/leg fields; it returns no per-flight provider body or IDs. Logs report each physical attempt, aggregate response counts, header-based measured units, and final horizon totals. Normalized original+PRE writes are deliberately absent.
7. [Negative tests](https://github.com/HKcode22/ReplitTranvr/blob/main/tests/phase4_gate5_wsss_20261102_real_three_horizon_aggregate_v39.test.ts) verify 3x3 exact grid, exact two early crons, actual job-lifetime prearm limits, no retry/no persistence, and rejection of wrong event, run attempt, SHA, wrong job or database secrets. PR #326/#327 both passed all four required checks before merge.

## Why the *full* Gate 5 is still NOT complete

| Required by f.8 Plan / Log §1.9 | Status of current real Nov2 FIDS aggregate test |
|---|---|
| Original append-only role-aware FIDS population with durable availability/source hash | **Not produced** — ephemeral source only |
| Canonical independent physical operating-leg IDs and uncertainty bounds | **Not certified** — 16 ambiguous status records in each T24 response |
| Verified first provider-native scheduled milestone T, frozen per flight | **Unverified** — generic `scheduledTime` only |
| As-of eligible flight count and actual persisted PRE snapshot count | **Zero certified PRE** — no per-flight source retained |
| Webhook inside/outside population denominator | **Not tested** by this source-only pilot |
| Actual-only runway milestone, label applicability/terminal status, outcome audit | **Not demonstrated** — `runwayTime` absent from T24 payloads |
| Retention rights, expiration and lawful storage for a real per-flight cohort | **Still open** — issue #300 and current provider Terms; historical Team Ultra does not automatically grant indefinite raw retention |
| Independent comparison to operational reference where available | **Not performed** by this pilot |
| Final strict Gate5 PASS / Phase5 FREEZE / Phase6 GO | **HOLD / HOLD / NO-GO** |

The meaningful next engineering task after the finite existing 9-slot campaign is not another aggregate replay: build the **lawfully retained original-source → frozen physical-population → actual PRE writer → provider/webhook/outcome reconciliation → independent Gate5 audit** pipeline on a new prospectively frozen cohort. Existing V0076 SQL and PRE staging modules have offline evidence but **production source write/actual-only labels are not connected**; do not assert a tested adapter equals a scientifically completed end-to-end pipeline. Optional missing webhook/weather data are allowed as explicit missingness; **a missing entire horizon, unlicensed raw storage, fabricated flight identity or unverified actual label are not optional features**. Current source-blocker issues: [#200](https://github.com/HKcode22/ReplitTranvr/issues/200), [#293](https://github.com/HKcode22/ReplitTranvr/issues/293), [#300](https://github.com/HKcode22/ReplitTranvr/issues/300).

## Exact owner instructions — observational only, no timed manual work

1. Open [GitHub run #41309044744](https://github.com/HKcode22/ReplitTranvr/actions/runs/41309044744) and click `owner-t24` (green check). In the paid step's logs, locate `P4_G5_REAL_NOV2_AGGREGATE_HORIZON_CLOSED_SOURCE_ONLY`; it reports `3/3`, `6` units, 0 unknown.
2. If seeing `Skipped`, check the **run number** before diagnosing. [Run #41310360522](https://github.com/HKcode22/ReplitTranvr/actions/runs/41310360522) is a **later push** that intentionally did not meet the unique PR #326 paid trigger. It is not the future scheduled T−6h or T−90m event. Do not click `Re-run all jobs`, `Re-run failed jobs`, `Run workflow` or `Cancel workflow` to force provider paid work.
3. Tonight **Nov 1 22:37 PST**, the `schedule` event should create a new run with only `owner-t6` eligible. Open GitHub → `HKcode22/ReplitTranvr` → `Actions` → workflow **Phase4 Gate5 WSSS Nov2 Three Horizon Real Paid Aggregate**, check that the new event is `schedule` (not `push`) and `owner-t6` actually began by **Mon Nov2 01:30 PST**. The first actual paid T−6h GET is **02:30 PST**.
4. Tomorrow **Nov 2 03:17 PST**, the second `schedule` event should create a new run with `owner-t90` eligible. It must actually begin by **06:00 PST**; first paid GET is **07:00 PST**. If either future run is absent/failed near its deadline, send the exact run link or say `Nov2 T6 missing` / `Nov2 T90 missing` in ChatGPT immediately. The existing hourly independent Gate5 launch watch also checks the Actions API, but cannot force GitHub's schedule to fire.
5. Do **not** run a Replit shell, change secrets, restart Replit, or manually attempt a paid GET. This study's timed owners execute only on GitHub. If a job is missing, a new reviewed fail-safe authorization/dispatch is needed while still before its *actual* cutoff; no late backfill.
6. No Phase5/6 start, provider target amendment or indefinite retention is authorized by the green aggregate-only run. The old Oct31 missed T−6h is historical `UNOBSERVED` and not "fixed" by the new Nov2 candidate campaign.

### Sources / orientation

- Current canonical binding plan: [V3.9-f.8](../plans/V3.9_DataCollectPlan_f.8.md)
- Owner/operator implementation manual (hash-locked): [V3.9 Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md)
- [Real dated three-horizon execution checkpoint](2026-11-01_GATE5_REAL_NOV2_THREE_HORIZON_PAID_SOURCE_EXECUTION.md)
- [Oct31 failed historical prospective cohort root cause](2026-10-31_GATE5_REDO_ROOTCAUSE_AND_RESTART_HANDOFF.md)
