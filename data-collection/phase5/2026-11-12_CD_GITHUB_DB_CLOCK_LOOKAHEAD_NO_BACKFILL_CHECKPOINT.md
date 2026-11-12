# Phase 5 — no-human PRE clock jitter mitigation (bounded early GitHub runner)

**Date:** November 12, 2026. **Source of truth:** GitHub `HKcode22/ReplitTranvr`; code review only, no live flight/paid activation.

## Completed, do not repeat

Owner returned actual Replit evidence that **V0087, V0088, V0089, V0090 and V0091 are installed live INERT** on team `neondb`: latest V0091 result `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT`, existing PREPARE group EXECUTE only, `queueRows=0`, zero paid calls. Do **not** re-run those five installers. Canonical GH PREPARE source enrollment PR #581 merged to main `354343d874b29af2f9cbc1421aab66123d94df73` after all six applicable checks passed; duplicate PR #582 closed (not merged). All useful Stage17 receipt-integrity and read-only unknown-ACK audit were retained in #581. Production GH registration and PRE remain STOP-default.

## Actual scheduling problem, not a reason to invalidate the experiment

GitHub's `*/5` cron is best effort and may be delayed; the existing real V0087 `claim_due` function and original Stage14 accept a PRE ONLY when PostgreSQL `clock_timestamp()` is in the genuine **three-minute window before a flight's immutable T−6h or T−90m cutoff**. A cron arriving just after that time must record MISSED, never backfill, retime or label a retroactive PRE prospective. User prefers bounded missingness and flexible pilot coverage, not perfect every-flight coverage.

## Incremental new engineering

- `server/lib/disruption/phase5CdGithubDbClockLookahead_v39.ts`: after the existing original signed roster/code-lineage release gate, uses the **same PRE Stage30 SET-only restricted session** to read **only `clock_timestamp()` and current role**. Computes upcoming REAL PRE cutoffs from the already reviewed packet's first native T. If a reviewed cutoff is within an eight-minute wait horizon of the existing three-minute admission window, sleeps in increments of five seconds and re-reads PostgreSQL clock until the actual immutable due window begins. Then it hands off to **the existing V0087 claim/start/ACK/reap and original Stage14 writer**, without acquiring a lease early, altering a cutoff, querying source bodies, re-registering tasks or calling AeroDataBox.
- `scripts/v39_phase5_cd_github_one_bounded_pre_tick_v39.ts`: calls the DB-clock lookahead BEFORE any queue claim; includes observed clock-poll/wait status in the run report; a budget-exhausted lookahead returns explicit HOLD/failing job, not a fabricated successful flight.
- `.github/workflows/phase5-cd-github-bounded-pre-tick.yml`: raises only the **already STOP-gated** PRE job timeout from 4 to 15 minutes and includes the new pure tests; GitHub five-minute cron remains best effort, no scheduler credential or new app required. The job is still SKIPPED unless owner independently enables `P5_CD_GH_PRE_SCHEDULE_ENABLED=1`, correct signed code/roster and all existing rights/canary/STOP gates.
- `tests/phase5_cd_github_dbclock_lookahead_offline_v39.test.ts`: confirms a T6 at 12:00 UTC, fixed cutoff at 06:00 UTC, runner waiting from 05:56:58 to the actual 05:57:00 due boundary; no early claim, no rewriting native T; STOP or wrong PRE role refuses before queue work; far-future packets don't hold jobs; frozen/stuck DB clock has bounded exit; paid calls and queued tasks by waiter both zero.

## Limits, finish line

This is **not a guarantee of GitHub scheduling reliability**, a full 31-day controller, independent legal source-rights approval, real FIDS packet, or a completed actual T24 witness. No real V0087 tasks exist yet; a signed source original and Stage17/V0081 T24 independent witness are still required before the current T6/T90 controller can operate. Tick concurrency remains capped at two; benchmark route/airport cohorts and measure missedness before expansion. The GitHub runner environment holds STOP flags sampled at job start; owner should cancel an active run to revoke an in-flight long wait. PostgreSQL DB clock governs actual eligibility.

A late/missing flight is **censored, not evidence the experiment is globally invalid**. Actual departure-delay-minute target/label, route/weather/status as-of features, POST and bias analysis, explicit reviewer/source rights and independent Phase5 scientific freeze still gate Phase6 paid GO.

**Project goals:** Nov 13 checkpoint; Nov 20 outside Phase5-readiness target if real pilot/source evidence supports it. **No paid Phase6 GO.**
