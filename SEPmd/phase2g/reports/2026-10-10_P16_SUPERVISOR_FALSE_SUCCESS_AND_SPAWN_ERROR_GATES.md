# Phase 2G P16 — supervisor false-success, spawn failure and 120-minute lifetime hardening

**Work date:** 2026-10-10 America/Los_Angeles. **Branch:** `phase2g-p2g24-github-observer-20261009`; draft review PR #27 only.

## Defects found in actual paid supervisor source

1. **Watchdog/shutdown false success.** Previous code set `childPassed = exit.code === 0 && !exit.signal && !exit.spawnError`. An owner could receive the supervisor watchdog's SIGTERM (or external shutdown), complete cleanup and exit with zero: supervisor would wrongly emit command-evidence PASS and skip its existing abnormal-exit recovery. This was a safety risk, not proof that any previous P2G22/P2G23/P2G24 outcome actually suffered this exact path.
2. **Spawn-error unresolved promise.** Child `error` need not be followed by `exit` per Node child-process semantics; `close` is emitted after `exit` or `error`. The previous wait on `exit` could hang the paid supervisor if spawn failed. Raw `error.message` also risked uncontrolled diagnostics.
3. **Early zero-exit false success.** The actual Stage-1 owner `runStage1Owner` can return zero when there is no next target selected. Thus zero by itself does not show the intended 120-minute observation occurred. The owner also applies scientific gates, but supervisor success must independently veto early exits.
4. **Escalation NDJSON line break.** The prior SIGKILL diagnostic template had a literal escaped backslash-n rather than the normal newline delimiter, risking malformed concatenated JSON evidence.

## Isolated draft changes made

- `scripts/v39_phase2g_paid_owner_termination_bound_v39.ts`: `stage1PaidOwnerExitVerdictV39` fails closed on watchdog-triggered shutdown, any explicit termination request, spawn/process error, signal, nonzero/null exit, and non-finite or below-120m monotonic lifetime; clean zero with at least 7,200,000 ms is necessary, NOT sufficient, for paid success.
- `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts`: invokes the classifier with `terminationSignal`, `callbackWatchdogTriggered`, and `performance.now()` around child spawn/close; awaits `close` instead of optional `exit` after process error; uses sanitized spawn error; records `exit_verdict_reason` and `child_wall_elapsed_ms` in status; fixes escalation newline; retains existing abnormal-exit recovery.
- `tests/phase2g_paid_owner_termination_bound_v39.test.ts`: reproduces early/zero-exit, failed-after-stop, spawn-error, signal and malformed monotonic timing cases, and verifies real supervisor wiring + log delimiter. No provider call.
- Exact source checkpoint before this report: `a64497e18aa6bc3d7777737334c412b5f3585945`. Verification target: [GitHub Actions #38101882460](https://github.com/HKcode22/ReplitTranvr/actions/runs/38101882460). **Treat run status as unverified until both jobs complete successfully.**

## Critical boundaries

This is an **exit-classification safety barrier only**: monotonic process lifetime is not proof of true original provider source/credit completeness, authentic edge UTC, persisted eight 15-minute buckets, physical-flight-v2 scientific completeness, exact subscription cancellation or storage retention. **P09–P14 and P17–P20 remain open.** 6+6 remains conditional: actual supervisor source evidence is `undefined`, effective failure ceiling remains 3, no 12-check allowance or paid permission. Replit ticket #564568 still requires engineering-specific P2G24 instance findings.

No AeroDataBox requests, subscription, provider credit spending, Cloudflare Queue/R2 enablement, Replit republish, migration, scientific database write, PR merge or live owner execution from these code edits. Sunday October 11 at 20:00 PDT remains paid **NO-GO** until the full release contract and fresh bounded authorization are independently proved.

## Follow-up

1. Verify full CI at exact source SHA and update this report with checked counts.
2. Address P09–P13 authentic independently durable ingress + replay and P14 actual provider attempt attribution, then connect P15's trusted source witness (do not emulate from environment variables).
3. Test exact deployed published/source hashes P18, present prospective P19 authorization and evidence, and run real hosted 120-minute zero-provider-credit R0–R11 rehearsal P20 only in user-approved zero-extra-charge isolated environment.
