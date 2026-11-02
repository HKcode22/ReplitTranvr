# Nov 1 2026 T−6h WSSS event missing at 22:41 PST — bounded GH-only rescue

## Live incident verified
On Sun Nov 1 at 22:41 PST = Nov 2 06:41 UTC, independently queried GitHub Actions run list for workflow `Phase4 Gate5 WSSS Nov2 Three Horizon Real Paid Aggregate` (ID 403552270). It returned only completed [T−24h push #41309044744](https://github.com/HKcode22/ReplitTranvr/actions/runs/41309044744) SUCCESS and later [PR327 push #41310360522](https://github.com/HKcode22/ReplitTranvr/actions/runs/41310360522) SKIPPED. **No T−6h `event=schedule` run/job exists yet** for the trigger nominally due Nov2 06:37 UTC (Nov1 22:37 PST). Four-minute lateness is not proof of a permanent dropped schedule; however October31 T−6h GitHub missed its schedule, and the materialized-source safety window is narrow. Never claim a runner prearmed from cron merely because workflow file has `cron`.

## Recovery contract — no provider or source expansion
- PR reviewed and gated by all 4 mandatory checks BEFORE merging.
- Replace only the T−6h scheduled cron with one **exact one-shot push-trigger** in SAME original workflow and concurrency group (`phase4-gate5-wsss-nov2-2026-real-aggregate-18unit-global`, `cancel-in-progress:false`). Do not touch T−90m `17 11 2 11 *` cron, T−24h historical one-shot, manifest, API endpoint/flags, planned physical windows, caps, or source inspector.
- GitHub merge commit must start with exact title `P4_G5_NOV2_T6_ONE_SHOT_PUSH_RECOVERY`; GitHub job `owner-t6` matches it and `github.run_attempt=1`. Existing owner script's `validatedContext` permits this narrow T−6h push only with `P4_G5_T6_PUSH_RESCUE=NOV2_T6_GH_PUSH_ONCE`, empty scheduled cron, exact GitHub workflow/ref/job/repository/sha, and no database secrets. Independently verified GitHub Actions run must have the exact head commit ID, message title, main branch, running job and start time.
- **Physical T−6h owner earliest allowable GH start** Nov2 06:30 UTC (Nov1 22:30 PST); **latest verified GitHub prearm** Nov2 09:30 UTC (Nov2 01:30 PST). Script refuses after deadline and out-of-window POST. One request each at Nov2 **10:30, 11:00, 11:30 UTC** (Nov2 **02:30,03:00,03:30 PST**), 2 expected Tier-2 API units per request, strict max 3 one-attempt GETs / 6 units, no retries, source/identity raw bytes NOT retained; data are anonymous field-coverage counts only. No webhook Alert credit/subscription mutations, no SQL or Replit timers.
- If a delayed original `schedule` event was already enqueued from old workflow bytes, it may be admitted by its historical schedule guard; all runs share the SAME global single-running-concurrency group. The later overlapping owner cannot begin until first completes; prearm deadline then prevents a second paid owner. Never disable this guard or manually rerun a job.
- Historical old T−24h COMPLETE 3/3 measured 6 units; neither replay nor relabel. T−90m remains Nov2 11:17 UTC / Nov2 03:17 PST GH scheduled prearm, source GET Nov2 15:00/15:30/16:00 UTC (07:00/07:30/08:00 PST); independent genuine run verification required.
- This is a **timing recovery** to preserve original source availability at the real decision cutoffs, NOT a new 3-horizon scientific PASS. The existing frozen Nov2 source experiment is anonymous aggregate-only with no per-flight PRE, verified native T or actual-only wheels-off. Phase5 FREEZE / Phase6 NO-GO remain unchanged.

## Mandatory post-merge verification
1. Confirm merge commit title exact, workflow path included in changed files, main SHA and four PR checks PASS.
2. Read live API for a NEW `event=push` run with **that exact merge SHA**; `owner-t6` must be `in_progress`, not skipped; verify its actual `started_at`, code SHA, `P4_G5_REAL_NOV2_HORIZON_GITHUB_PREARM_VERIFIED` log receipt (not nominal schedule).
3. If the push run does not appear, record `GITHUB_T6_FALLBACK_NOT_MATERIALIZED`, not success. Before Nov2 09:30Z, review safe fallback options **only** with physical-owner dedupe, no second paid authorization and independently audited clock; never backfill an expired horizon.
4. Confirm source GET receipts and billed unit header measurement after actual slots, not before. New owner may run until last 11:30Z slot. T−90m monitor remains enabled.
5. Add exact outcome links to this checkpoint and issue #293, no overwrite of Plan f.8 or immutable Implementation Log.

This checkpoint documents technical source-control recovery; it is not a provider-native semantic or retention clearance. Issues #200/#293/#300 remain open.


## Actual verified recovery outcome — Nov1 22:53 PST / Nov2 06:53Z

- [PR #329](https://github.com/HKcode22/ReplitTranvr/pull/329) **MERGED** after FOUR required checks SUCCESS: offline-safety, focused-guard, actual-postgres, hosted-public-get.
- One-time merge commit `eea16c78209ce10e09467ac7e2d54e2b0f84bd31` on main with **EXACT** expected head message `P4_G5_NOV2_T6_ONE_SHOT_PUSH_RECOVERY`.
- GitHub API verified a NEW genuine [workflow run #41402736335](https://github.com/HKcode22/ReplitTranvr/actions/runs/41402736335), `event=push`, `status=in_progress`, head_sha matching merge commit.
- Real `owner-t6` **job #125137897353** started at `2026-11-02T06:53:06Z` = **Nov1 22:53:06 PST**, with `REAL T-6h WSSS source field availability, 3 fixed zero-retention calls max` paid-step **in progress** in GitHub jobs API. This is ahead of deadline `2026-11-02T09:30:00Z` and within allowable GitHub job lifetime for final paid 11:30Z slot.
- In this recovery PUSH run, `owner-t24` and `owner-t90` jobs **correctly SKIPPED**; this is not a failure. T−24h historical SUCCESS remains untouched, T−90m still independent future `schedule` event at `2026-11-02T11:17:00Z` (Nov2 03:17 PST).
- Main GitHub workflow inspected after merge: **T−6h cron removed**, **T−90m cron retained**, global concurrency group retained. No extra slot, provider args or budget changes.
- **Important evidence boundary:** GitHub confirms paid-step *running*, not that the script has yet emitted its own `P4_G5_REAL_NOV2_HORIZON_GITHUB_PREARM_VERIFIED` line; logs for a running job returned 404 BlobNotFound. No source GET until planned Nov2 10:30Z, and no paid response or units attributed to recovery yet. Next evidence is completed job log or actual observable GitHub step transition; do not claim external paid success prematurely.
- Existing hourly user launch-watch automation updated to recognize this **one-time push** as legitimate T−6h recovery, rather than incorrectly demanding the now-removed T−6h cron. It continues to watch independent T−90m schedule and actual source slots.
- Strict scientific Gate5 = HOLD; Phase5 FREEZE = HOLD; Phase6 = NO-GO.
