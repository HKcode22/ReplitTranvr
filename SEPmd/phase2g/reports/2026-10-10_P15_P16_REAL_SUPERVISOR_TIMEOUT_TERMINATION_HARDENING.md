# Phase 2G P15/P16 — real paid supervisor timeout, 6+6 gating and bounded local child termination

**Prepared October 10, 2026, US Pacific. Status: TESTED ON ISOLATED DRAFT BRANCH; PAID YSSY NO-GO.**

## Verified CI evidence

[GitHub Actions #38101190614](https://github.com/HKcode22/ReplitTranvr/actions/runs/38101190614), exact CI source commit `ee45c0fc21b03fb7d3057e73c3922a1b0778a0d3`: **both jobs completed SUCCESS**.

- **438/438 offline Vitest cases, 45 suites**, plus real callback checker integration and server TypeScript checking.
- **45/45 disposable actual V3.9/PG16 integration tests**, with separate real container `SIGKILL` recovery confirming `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED` and `TWO_STAGE_LOGGED_OWNER_BINDING_AFTER_UNCLEAN_RESTART=1`.
- Tests execute without actual AeroDataBox provider keys/traffic, flight-alert credit spending, production DB, Replit deployment or Cloudflare mutations. The result is NOT a 120-minute hosted wall-clock run.

## Actual 6 primary + 6 backup supervisor status

The existing real code `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` imports `scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts` and accepts **`six-plus-six-candidate`** as an opt-in policy. The real four-endpoint `callbackHealthy` tests cover published runtime/HEAD, secret binding and DB binding. The candidate enforces:

- Six primary + six contingent health observations **only while each observation has independently corroborated provider-source/attempt/credit/owner/queue/backlog/raw retention/physical-v2 science evidence**, bounded by 180 seconds elapsed and 12 checks.
- Hard wrong build/secret/owner/DB mismatch stops immediately; any true 260-billed vs 259-original-source gap or stale evidence stops immediately. It does not make a healthy GET a scientific PASS. Provider `maxDeliveryRetries=0` is unchanged.
- **CRITICAL: A trusted real independent source/provider verifier is NOT IMPLEMENTED or connected to the paid supervisor. It intentionally passes `evidence:undefined` and defaults to `legacy-three`.** Selecting the candidate today cannot honestly enable twelve retries; it stops by the third failure without independent proof (and can fail closed on recovered health without independent science authority).
- Previously the candidate's watchdog diagnostic displayed `failure_limit=12` even when real independent evidence was unavailable. The paid supervisor now logs `failure_limit=3`, `effective_failure_limit=3`, `requested_failure_limit=12`, `conditional_extension_authorized=false` so on-call staff cannot misinterpret a policy-selection flag as a real extension.
- This draft's P15 changes have NOT been merged to `main`, published to Replit, or promoted to a paid owner release.

## P15: independent upper bound on a hung four-stage check

The nominal schedule is 15 seconds, but the four network subchecks each carry an 8-second request timeout. A hung callback checker used to keep `callbackCheckInFlight=true` while the paid child continued. A new **40-second independent timer** now calls the existing fail-closed local paid-owner SIGTERM path if the complete four-stage cycle has not returned. It uses `unref()`, cancels in the callback's `finally`, and cannot resurrect a dead child. AST tests inspect the actual supervisor source to prove a timeout is armed **before awaiting** `callbackHealthy`, not checked only after the potentially hung promise resolves.

This is a fail-closed safety timer, not permission to label the elapsed 6+6 detection window as 15s×12. The 180s monotonic aggregate bound is separately enforced by the 6+6 candidate policy, and nominal polling latency can vary.

## P16: bounded owner SIGTERM escalation and recovery entry

The existing supervisor sends `SIGTERM` to its directly spawned paid Stage-1 child before running the recovery/settlement path. **SIGTERM successfully sent does NOT mean the child exited.** A child hanging after receiving SIGTERM could delay recovery indefinitely.

New `scripts/v39_phase2g_paid_owner_termination_bound_v39.ts` and actual supervisor wiring arm a **45-second grace timer** after the first SIGTERM. If the **same originally spawned local PID** has neither an exit code nor a terminating signal state, the supervisor escalates with **SIGKILL** to force OS process exit and let its existing recovery procedure start. This does not touch any provider subscription directly or call paid APIs; the existing recovery routine remains responsible for provider deletion/isolation. The escalation logs sanitized action/reason, never secret, URL, payload, provider balance or token. The timer cancels after child exit.

Five timer-driven P16 tests prove: no force-kill before 45s; exactly one force-kill for unresponsive child; exiting after SIGTERM avoids force-kill; explicit cancellation suppresses force-kill; invalid wiring refuses; and the actual supervisor checks `exitCode`/`signalCode`, **not** `child.killed`, to determine if the child is still alive.

**Limit:** A successful local SIGKILL does NOT prove that Replit/Cloudflare POST admission is durable, that AeroDataBox actually canceled subscription, that credits settled, or that real original flight-item data survived. Separate P16 real exact-ID provider cancellation/signature/drain proofs are still mandatory.

## Paid GO blockers that remain

The scientific release still requires all of the following evidenced in a coherent deployed configuration:

1. **P01/P02:** Vendor Replit hosting explanation, original volatile data provenance, protected old blob evidence; prior Quinn ticket #564568 has no later substantive answer as of the last Gmail check.
2. **P09–P11:** A real independent durable, authenticated pre-2xx original webhook archive with immutable first-edge UTC/SHA, 168h source retention, 10s ACK/cold-start p95/p99, and a scientifically approved failure domain. Read-only Cloudflare account inventory found zero Queues and R2 not enabled (API 10042). Do not provision paid resources without explicit specific cost/retention authorization.
3. **P12/P13:** Actual deployed Queue/R2 replay, current SQL persistence/DB-epoch confirmation and privacy-safe complete signed original 120m flight reconstruction—not just isolated signed-after-processing LOGGED fixture rows. The actual V3.9 application uses UNLOGGED provider detail by design.
4. **P14:** Real AeroDataBox original billable attempted-event ledger/cost parity per notification containing 1–N flight items; the provider bills **1 credit per flight item per delivery attempt**, including failure and explicitly configured provider retries. Account balance deltas cannot by themselves prove every event identity or source UTC. The historical 260 vs 259 gap is unacceptable.
5. **P15/P16/P18:** Integrate a genuine independently authenticated current source witness before any twelve-check paid monitoring; independent owner lifecycle/cancel/settle proofs, frozen sender/owner/receiver build, and actual Replit published SHA equivalence. PR #27 remains large and DRAFT, not merged.
6. **P17/P19/P20:** Original eight elapsed 15-minute scientific buckets and physical-v2 metrics without false imputation, prospective approved science amendment and new bounded AUTH, followed by the **actual 120-minute wall-clock hosted zero-provider-credit** R0–R11 failure matrix (not a speedup or synthetic offline simulation).

**Decision:** YSSY planned Sunday October 11, 20:00–22:00 PDT (Monday October 12 03:00–05:00 UTC) remains **PAID NO-GO** on current evidence. New tests materially improve local owner and health failure behavior but are not evidence of a deployable independent source archive or completed hosted rehearsal.
