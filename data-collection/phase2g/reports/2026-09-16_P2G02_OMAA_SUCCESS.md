# Phase 2G Probe 2 / AUTH P2G03 — OMAA successful Stage-1 evidence

> Historical run date: 2026-09-16
> Airport: OMAA
> Durable probe ID: 2
> Authorization: `AUTH-20260916-P2G03`
> Budget day: `P2G-S1-20260916-02`
> Phase: Phase 2 / Gate 2 Stage 1
> Status: historical valid Stage-1 evidence
> Filename note: this file keeps its original `P2G02` filename for link compatibility, but the earlier heading/launch details conflated the durable probe number with the AUTH label. The actual OMAA launch used P2G03. P2G02 was consumed by the earlier WSSS probe-1 attempt.

## Frozen launch state

The final passing paid preflight was:

- `artifacts/phase2g-stage1-paid-preflight-P2G03-20260916T1232Z.json`
- source HEAD: `f06820486ca8395edde2de29a6da81f5b1dc8b40`
- authorization: `AUTH-20260916-P2G03`
- authorization SHA-256: `bfcc0e66125ba93fb17a374044df571e880db7e807463dbabad6bc6033129c2f`
- runtime: `artifacts/phase2g-gate2-runtime-P2G-S1-20260916-02.json`
- runtime SHA-256: `9cc4ea782145470ce4c038bafe48a23aa125dfc64ea271dc0f553adf24b287b6`
- Stage-1 target duration: 120 minutes
- protected exposure: 500 Alert credits
- provider balance at final passing preflight: 2820
- active billable subscriptions at preflight: 0
- open incidents at preflight: 0
- active probes at preflight: 0
- open probe budget days at preflight: 0
- frozen time class eligible: true

An earlier P2G03 preflight at 12:30 UTC was BLOCKED because the callback was temporarily unreachable; the 12:33 UTC preflight passed only after the exact callback/runtime contract was healthy. That blocked preflight is historical evidence that launch gating was already capable of refusing an unhealthy callback.

## Runtime owner

The recorded supervisor artifact is:

- `artifacts/phase2g-stage1-AUTH-20260916-P2G03-20260916T123415Z.status.json`
- state: `CHILD_PASS`
- started: `2026-09-16T12:34:16.236Z`
- ended: `2026-09-16T14:35:25.750Z`
- child exit code: 0
- callback watchdog triggered: false
- callback consecutive failures at exit: 0
- recovery attempted: false
- callback base: the matching `.replit.dev` Development Sandbox origin

The Replit Development Sandbox process set happened to survive the complete intended window for this run.

## Final scientific state

The durable production `clean.adb_anchor_probe` row for probe 2 records:

- stage: 1
- ICAO: OMAA
- status: `completed`
- duration_censored: `false`
- stop_reason: null
- reconciliation_status: `MATCH`

Therefore OMAA is valid historical Stage-1 evidence.

## Why OMAA succeeded

OMAA demonstrates that the original Development Sandbox execution path *can* survive a complete 120-minute probe when the host/runtime does not reset. The important observed conditions were:

1. exact source/runtime/AUTH binding passed before launch;
2. no open incidents or active billable subscriptions existed;
3. the callback server was live on the exact source revision;
4. the supervisor and paid owner remained alive for the full window;
5. no fatal provider control-plane interruption censored the run;
6. final reconciliation reached exact `MATCH`.

## What OMAA does not prove

OMAA does **not** prove that a Replit Development Sandbox is a durable two-hour lifecycle owner.

Later WSSS failures, especially P2G09, demonstrated that the Development Sandbox/process environment can be replaced while a paid experiment is active. OMAA therefore proves a successful historical window, not a platform durability guarantee.

## Canonical interpretation

- Keep OMAA as valid completed/MATCH Stage-1 evidence.
- Do not rerun OMAA merely because later WSSS infrastructure attempts failed.
- Do not use OMAA's successful host lifetime as justification to claim the Development Sandbox is durable.
- Current paid lifecycle ownership belongs to GitHub Actions; Replit is the callback receiver under the explicit same-app contingency.
