# Nov 17 — distinguish schedule creation gap from runner startup; primary retention timing alternatives (REVIEW ONLY)

Current merged main de15816bccb867dc17dcd396f8bedec66960e115. Prior coordinated merge/re-pin and exact candidate rebind are CLOSED; see [actual new receipt](2026-11-17_ACTUAL_ENGINEERING_MERGE_AND_STABLE_MAIN_REVIEW_REBIND.md). No new scheduler, migrations, owner request, provider call or database work here.

## Actual GitHub scheduling evidence

Repository schedule query, three pages, total_count 258, all 258 unique returned. First created Oct29 21:03:51Z, last Nov17 08:59:57Z. Source-parent 28 observed runs Nov10–17, all gated/skipped, 27 creation intervals: min 212.33 min, median 398.73 min, max 590.32 min. PRE max 593.62, T24 max 577.67, heartbeat max 611.12, metadata retention max 634.78 min. Early draw max 722.9 min with different 4h configured cadence. These gaps exist in actual run creation metadata, before the job starts. Exact current workflow comparison from 49b39a83 to merged main checked 74 commits/122 files; PRE, T24 and watchdog offsets changed from */5 to staggered 5m frequencies, source and enrollment offsets from */10 to staggered 10m frequencies. No claim of exact missed scheduled-event count across historical versions.

Retrieved actual job metadata for all 17 successful scheduled heartbeat/retention runs in returned history: 12 heartbeat, 4 metadata sentinel and 1 primary FIDS expiry. Difference from workflow created_at to successful job started_at: min1s, median2s, max3s. Jobs themselves 10–32s. This distinguishes event-creation gaps from post-creation runner startup for this specific observed no-provider sample. It is NOT root-cause proof, platform SLA, proof of missing vs delayed cron events, or production paid child/PRE runner latency. SOURCE/PRE/T24 actual scheduled jobs skipped under STOP and cannot certify actual processing capacity. No new schedule event beyond the earlier 09Z heartbeat in this query. Existing 3-hop and eight-runner timing rehearsals remain closed; no rerun.

## New explicit source-deadline sensitivity

The earlier 23h raw-source access bound and 24h physical maximum give at most 1h scheduled cleanup margin, which is much smaller than the observed 634.78m metadata-sentinel gap. Existing V0103 targets the earlier bound-source expiry / raw-persistence+24h. V0104 blocks new physical REST reservations on unresolved deletion STOP or hard-due raw, not an independent time-triggered purge. Current bridge phase5ScopedFidsSourceBridge_v39.ts RIGHT_WINDOW_MS = 23h; phase5V0079ScopedDbPorts_v39.ts inserts the exact computed expectedExpiresAtUtc. Thus shortening source lifetime would be an explicit small future reviewed source-policy/code change, NOT magically available as a current toggle.

Sensitivity only: original 26 ordinary, 3 split and 2 extended days yield 28 4h partitions and 8 2h partitions per four-slot group (112+32=144 partition-slot groups), 2048 templates/horizon. 15m refresh and 15m GET lead. Check representative ordinary day1 and every split/extended day 3,5,7,8,10 directly against actual merged day-plan files: T6 maximum age to assumed hard/latest POST 695min for 4h and 575min for 2h, minimum470min. Attempted all-31 extraction in one invocation hit call limit; use prior completed full-plan byte parity plus these representative and all nonordinary checks, not claim a new full independent scan. Exact native POST code phase6PostNativePreCandidateReadOnce_v39.mjs requires eligible anchor expiry STRICTLY after hardLatest, reviewable policy followup+dispatch, same UTC charge day. Existing signed publication may clamp earlier to source-query/anchor/day/policy expiry.

Illustrative review candidate: source available at scheduled GET, POST single physical partition GET starts partition end+60m, hard latest +80m, also check +3m completion margin. All assumed inputs ready; no actual paid or observed flight yields. The modeled expiry must be strictly after hard latest.

| Hypothetical source access lifetime | T6 eligible request templates at hard latest | T90 eligible | T24 eligible | Physical 24h margin net of prior max metadata-sentinel gap (min) |
|---:|---:|---:|---:|---:|
| 8h | 144 | 2048 | 0 | 325.2 |
| 10h | 1264 | 2048 | 0 | 205.2 |
| 11h | 1712 | 2048 | 0 | 145.2 |
| 12h | 2048 | 2048 | 0 | 85.2 |
| 13h | 2048 | 2048 | 0 | 25.2 |
| 14h | 2048 | 2048 | 0 | -34.8 |
| 23h | 2048 | 2048 | 0 | -574.8 |

12h illustrative gives all 2048 T6 and 2048 T90 nominal templates, including the +3m margin; earliest/latest nominal ages 470/695m T6, 200/425m T90, 1550/1775m T24. 12h gives 85.2m modeled margin after the historical maximum metadata sentinel gap, 13h only25.2m. This uses source availability/persistence at planned GET for a simple sensitivity; actual clocks/processing, differing scheduler and raw surfaces, additional late POST recovery, policy minima and future outages may invalidate it. It does not prove any bound on primary purge latency, backup/PITR, source rights, Phase6 eligibility or physical gate-out. Early bounds could reduce actual recovery availability. T24 structural retained-original postflight incompatibility persists. No change to canonical E or negotiated rights.

**Recommendation for actual independent operational review:** prefer addressing event-creation continuity using already-built bounded mechanisms rather than CPU/runner tuning. If agreed limited early-POST lawful scope also needs additional physical cleanup margin, 12h is a numerical candidate to review, NOT an adopted policy or request to reopen this now-stable merged release. No source deadline change until approved study scope and evidence determine actual necessary retention and mechanism. Do not assume future scheduling gaps bounded by the past, enable optional V0102, or treat lower TTL as a lawful linked 31-day corpus. Phase5 FREEZE HOLD / Phase6 paid NO-GO.

[Structured redacted evidence](evidence/2026-11-17_controller_schedule_creation_and_retention_geometry.json).
