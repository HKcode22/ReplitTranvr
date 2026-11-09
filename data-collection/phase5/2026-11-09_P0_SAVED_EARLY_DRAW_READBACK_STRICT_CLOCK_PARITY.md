# Phase 5 P0 — saved early draw readback must match the real 24h45m-to-72h source window

**November 9, 2026.** Narrow science integrity repair: **not** a new engineering stage, a new draw, a migration, provider call or paid permission. Phase 5 FREEZE **HOLD**, Phase 6 paid GO **NO**.

## Source-code mismatch discovered AFTER PR #510

Three parts of the release path refer to the same saved four-airport draw:

1. `phase5EarlyAdaptiveDrawOwner_v39.ts`, which writes it to PostgreSQL in a serializable, idempotent, four-row transaction;
2. `phase5DynamicDaySourceGrid_v39.ts`, which materializes the source requests from the committed draw;
3. `phase5EarlyPreselectionReadback_v39.ts::verifyPreparedDailyDraw`, which checks whether four saved draw rows are consistent and cutoff-safe.

PR #510 unified the **writer** and **grid** around the exact prospective early-selection window: strictly **more than 24 hours 45 minutes** and no more than **72 hours** before parent service starts. But the third component still required only **more than 24 hours 30 minutes**, with no upper bound. Therefore an independently passed readback could have accepted a selection the actual owner should have refused, including a timestamp exactly 24h45m before service. An overly old future selection could also pass a readback despite the prospective 72h limit.

## Exact fix

The saved-draw readback now imports `P5_EARLY_DRAW_MIN_STRICT_LEAD_MS`, `P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS`, and the shared eligibility predicate from `phase5ProspectiveEarlyDrawClockContract_v39.ts`. It rejects draws `>= serviceStart - 24h45m` and draws `< serviceStart - 72h`, preserving the existing `DRAW_TOO_LATE_FOR_T24_SOURCE` error for previously expected failures. It never rewrites a stored selection, invents one, or changes the route/region/anchor sampling frame.

Tests in `tests/phase5_early_preselection_readback_v39.test.ts` cover the four exact millisecond boundaries:

| Scenario (UTC start = 2026-11-08 14:00) | Decision |
| --- | --- |
| Selected Nov 7 at 13:15:00.000 (exact 24h45m) | REFUSE: strict cutoff reached |
| Selected Nov 7 at 13:14:59.999 (24h45m + 1ms before) | Allowed as *calendar-only* readback |
| Selected Nov 5 at 14:00:00.000 (exact 72h before) | Allowed as *calendar-only* readback |
| Selected Nov 5 at 13:59:59.999 (72h + 1ms before) | REFUSE: too early |

Even allowed readbacks set `verifiedFlightLevelPre:false`. The real PostgreSQL clock, identity/regions, prior completed-day feedback, sample probabilities, source receipt available-at, budget and rights still need independent proof.

## Where this leaves the actual Phase 5 critical path

All three saved-draw preparation components now use the **same** timing contract. Do not treat a frozen **31-day schedule structure** as 31 frozen sets of physical airport identities: **ten paired days have fixed candidate sets**, while the other **21 ordinary days must select a real four-airport set prospectively before their own earliest T−24h**. A provider flight is still not inferred from an airport code. Stage21's fully specified 31-day verifier must not be fed artificial ordinary-day airport codes simply to achieve SAT.

This patch does NOT close provider licensed Contents use/retention issue #300, actual FIDS range/latency and seven-category physical UTC costs, POST receiver, or independent Phase 5 scientific FREEZE. The existing manual one-query paid workflow is not dispatched.

No owner Replit Shell action is required for this code review/CI patch.
