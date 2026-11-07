# Phase 5 — early adaptive draw writer, Stage 1 review

**Status:** Code proposed, not enabled, not scheduled, not deployed and not a Phase6 GO. For issue [#416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## Why this exists

Prior [PR #417](https://github.com/HKcode22/ReplitTranvr/pull/417) merged after six green CI checks to **forbid** sampling airports at Flight Alert batch start, which is too late for genuine T−24h FIDS/PRE. The Phase6 parent and child paths now read four earlier frozen draws and refuse missing, swapped, late or tampered entries. There was no code that could produce those entries early.

This Stage 1 implements an **early-selection-only** backend using the existing live schema; it does not attempt a provider request, acquire FIDS originals, write PRE/POST, operate subscriptions, modify rights, or start Phase6.

## Implementation under review

- [Pure immutable sampling selector](../../server/lib/disruption/phase6SamplingDecision_v39.ts) remains authoritative for tier×region frame constraints, hub and mid picks, REGIONAL adaptive probabilities, exact crossover and 24h washout.
- [Transactional early owner](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) requires exact 64-hex manifest/calendar/config/frame pins, enabled nonrevoked Phase6 authorization, matching frozen day and active frame, and exactly 31 legal day indices. Uses real DB `clock_timestamp()` and only allows new draws between **72h and >24h45m** before the day window start, allowing time to schedule actual T−24h source queries. These are conservative calendar-level guards, **not a substitute for actual flight-level T**.
- It obtains PostgreSQL `SERIALIZABLE` transaction + run-day `pg_advisory_xact_lock`, locks current sampling state, computes the deterministic exact four selections and probability vector, stores **one identical selected-at UTC** for all four draws, updates selected-airport washout state, checks full database readback and an independent final DB clock before committing. Any failure rolls back. Existing complete immutable rows return an idempotent digest; incomplete/tampered rows refuse rather than redrawing.
- [Staged GitHub-only CLI](../../scripts/v39_phase5_early_adaptive_draw_owner_once.ts) needs **all** of: exact main-branch GitHub Actions context, a separately approved Phase5 freeze and rights flag, exact release SHA pins, protected dedicated `V39_P5_EARLY_DRAW_DATABASE_URL` role and explicit single day. No repository workflow invokes it automatically. No Replit-shell secret copy is requested. The code guards are defensive checks, **not a substitute for credential-level database grants**.
- [Offline tests](../../tests/phase5_early_adaptive_draw_owner_v39.test.ts) use a transaction-state mock with no secrets/provider/real DB and test one atomic four-row write, deterministic idempotent replay, committed clock checks, malformed/expired selection refusal, rollback on injected DB error, and strict freeze admission. [Isolated CI workflow](../../.github/workflows/phase5-early-adaptive-draw-owner-offline.yml) has blank provider and database credentials.

## Exact limitations / conditions before real release

1. **Not yet executable in production:** No reviewed GitHub clocked job, separate database role/ACL installed, right to issue these provider-derived sampling queries, actual 31-day freeze/manifest and independent authorization evidence. The staged CLI must not be invoked under today's blocked Phase6 rights/release state.
2. **Very early or lagging feedback:** Sampling uses only state present at the actual preselection transaction; that is *earlier than* the parent service window. This creates a deliberate adaptive-state lag. Preregister effective cutoff, previous-day completeness rule and probabilities. Do not allow post-selection data to revise the already-drawn airports.
3. **Scientific source missing:** A preselected airport is only the first dependency. Next issue #416 step is GitHub FIDS source acquisition from the *committed* four draw rows, with 24h/6h/90m actual per-flight cutoff safety (V0076/V0077), source-hash/available_at, bounded request units/STOP, and frozen post-service reconciliation. No provider backfill.
4. **Still no released receiver:** YSSY public runtime has been reporting an older Git SHA. [PR #412](https://github.com/HKcode22/ReplitTranvr/pull/412) fixed source callback selection but must be observed in the actual published runtime before any paid receiver experiment or long collection.
5. **Content rights remain source-specific:** Historical grandfathered quota does not itself prove lawful month-long flight-level AeroDataBox storage/ML training as of Nov7 updated terms; see [#300](https://github.com/HKcode22/ReplitTranvr/issues/300).
6. **No entitlement inference:** This code does not verify provider current REST/Alert balances or that the actual complete source grid uses the correct FIDS API billing and locality/time-window semantics; [PR #415](https://github.com/HKcode22/ReplitTranvr/pull/415) validates synthetic per-query budget only until real measured plan is supplied.

## Evidence from owner read-only database 2026-11-07 04:17Z

Nine FIDS original rows and 24 PRE snapshots in prior 24h, 1,574 all-time population observation rows. Generic Alert/AIRBORNE/outcome tables still zero. Older YSSY prepaid UNLOGGED session/delivery/item tables zero but LOGGED webhook custody references **838 expired** with **773 deletion-verified** and **65 verification-unknown**. No expired blobs opened, no paid source calls or database writes. The YSSY historical diagnostic belongs to [Phase2G issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28), not Phase5 development.

**Release decision:** Phase5 engineering continues, original full strict Gate5 remains HOLD, Phase5 final FREEZE and Phase6 live GO remain blocked. A green early-owner unit test is not a scientific data collection PASS.
