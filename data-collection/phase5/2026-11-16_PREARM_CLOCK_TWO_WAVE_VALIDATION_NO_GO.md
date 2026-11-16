# Phase 5: actual prearmed SOURCE timing rehearsal, not another collection architecture

## Evidence reused and why this is a distinct measurement
- [Oct31 real one-query push-prearmed T90](../phase4/2026-10-31_WSSS_T90_ACTUAL_SUCCESS_AND_POSTFLIGHT_PUSH_PREARM.md), [run 41202671665](https://github.com/HKcode22/ReplitTranvr/actions/runs/41202671665): one actual FIDS GET began 2.350 seconds after the 14:37:00Z wait target, 2 observed API units, 86 normalized rows, no certified operating legs. This is historical one-query evidence, not current four-hour range/price certification or sustained throughput.
- [Three nonpaid rolling rehearsal runs](https://github.com/HKcode22/ReplitTranvr/actions/runs/43786384018): actual read-only preview/successor handoff, six planning waves; no real flight processing.
- [Actual scheduled canary](https://github.com/HKcode22/ReplitTranvr/actions/runs/43817643428): 1 timely, 2 late, 3 missing slots using the existing 75-minute observation tolerance. Cron alone is not a 120-second service-level proof.
- Original first-seed plan and present capacity: four slots per 15-minute refresh/horizon, 15–35-minute parent lead, maximum 8 child admissions/tick, 24 in flight. Do not change that release proposal solely from a test.

## One bounded actual clock experiment
Reuse the existing **phase5-v0080-github-runtime-prearm-real-pg16.yml** workflow and existing `waitForP5ScheduledPhysicalDispatch` from V0080. Its prior PR/push disposable integration is unchanged except a small offline test addition. The new manual-only mode has eight independent runners (two nominal waves 15 minutes apart, four slots each). All eight runners are admitted together to stress runner allocation, checkout, locked npm install, PG16 service setup and clock readiness. This is a timing rehearsal of real infrastructure, not a live production child dispatch or sequential 10-minute parent test. The first target is prospectively 15 minutes after dispatch, the second 30 minutes; don't slide missed targets. The exact UTC, reviewed main and first manual run attempt are checked against GitHub metadata.

Each runner reads only local disposable PG16 with default read-only transactions; no live DB, real prearm reservation, migrations or provider secrets for this mode. The original waiting function checks the actual DB clock, waits without an open transaction and never releases early. Each receipt includes earliest ready timestamp, nominal target, observed release, root-creation-to-ready, ready lead, release slip, clock read count and maximum measured local read duration. All eight receipts, including late/missing measurements, must be retained and independently assessed. 120s proposed slip is the existing candidate, not a proven SLA; a late first ready timestamp is separately recorded even if the original wait logic would allow the eventual delay. No inference of actual source HTTP, Neon latency, persistence, PRE signing, actual flight yield or target label coverage. No automated repeat, no paid GO. No new production workflow, schema, role or collector.

## Owner-only launch after exact-head CI and merge
Use the existing authenticated Replit Shell to dispatch the *manual-only* no-provider clock experiment exactly once, with current reviewed main. Don't repeat an unknown dispatch. The connector can read results but cannot dispatch the root. Each job timeout 40 minutes; max eight runners and one root. The user need not keep their Shell open. No requirement for Replit publication or DB setup. Current workflow should not be run from a feature branch.

```bash
REPO=HKcode22/ReplitTranvr
PIN=<exact-reviewed-main-after-merge>
FIRST="$(node -e 'process.stdout.write(new Date(Date.now()+900000).toISOString())')"
gh workflow run phase5-v0080-github-runtime-prearm-real-pg16.yml -R "$REPO" --ref main \
  -f confirm=MEASURE_TWO_FOUR_SLOT_PREARM_CLOCK_WAVES_NO_PROVIDER \
  -f approved_main_sha="$PIN" -f first_target_utc="$FIRST"
```

No actual run sent by this PR. New tests cover wrong repository/code/attempt/credential scope, fixed two-wave geometry, original waiting function, late arrival, excessive slip and wait refusal. The result remains measurement evidence, not another mandatory gate or a full-cycle SLA. Existing B0062/V0093 staging and genuine source-rights/actual-only target review remain the priority.
