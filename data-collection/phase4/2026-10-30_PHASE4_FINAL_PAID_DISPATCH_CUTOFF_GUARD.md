# Phase 4 — Guard against slow preflight exhausting the source cutoff

**Date:** Friday October 30, 2026 PDT. **Scope:** existing GitHub-owned WSSS 2026-10-31 prospective FIDS sampling; source-only safety patch. No change to the scheduled paid workflow, provider request shape, budget, cohort, or Phase6 authorization rules.

## Root cause risk
The paid operator previously asserted the schedule cutoff once at main() entry, then awaited PostgreSQL schema/permissions, the public OpenAPI document and free provider account/quota balance before its **single billable FIDS GET**. A rare prolonged preflight could shift physical dispatch outside the latest safe cutoff even though initial time check passed.

## Corrective action
Inside the exact one-shot fetchOnce closure, call scheduledWsssHorizonV39(process.env,Date.now()) after asynchronous preflight and scope checks, **immediately before** billableAttempts=1 and the single provider fetch. It verifies exact GitHub cron, first attempt, protected context and the original 15-minute pre-cutoff guard. No second request or new paid scope.

Added offline tests verifying source ordering (the second time check occurs before billable-attempt marker and physical network fetch), one billable attempt marker, acceptance of cutoff minus 15:00.000 and rejection of cutoff minus 14:59.999 and post-cutoff for both future slots. Existing full offline, TypeScript, lint and real-PG GitHub checks must pass before merge.

## Measured readiness
Original paid WSSS FIDS GET succeeded (2 measured API units, 24 persisted primary observations, original-body SHA verified). Night-before [protected DB-only run #41159114490](https://github.com/HKcode22/ReplitTranvr/actions/runs/41159114490) PASSED writer grants and immutable/expiry triggers, one retained original WSSS receipt, no provider calls or DB writes. These do not guarantee tomorrow's provider quota, transport or precise GitHub timing.

Tomorrow scheduled exact slots: 2026-10-31 10:07Z / 03:07 PDT T−6h and 14:37Z / 07:37 PDT T−90m, expected two API units each on success. No retries, catch-up or backdated source. The existing paid and after-service read-only workflows are untouched.

**Still unproven:** source-selected-T, confirmed operating flight/codeshare, actual-only wheels-off, certified persisted PRE, weather receipt joins, Gate5 completion and Phase6. No Replit shell actions required.
