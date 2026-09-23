# Phase 2G P2G02 — OMAA successful Stage-1 evidence

> Historical run date: 2026-09-16
> Airport: OMAA
> Phase: Phase 2 / Gate 2 Stage 1
> Status: historical valid Stage-1 evidence
> Purpose: preserve why OMAA is valid and what its success does and does not prove about Replit runtime durability.

## Frozen launch state

The recorded paid preflight artifact is:

- `artifacts/phase2g-stage1-paid-preflight-P2G02-20260916T110429Z.json`
- source HEAD: `cd4403913a45990951e60bc09b889802ba7f2362`
- authorization: `AUTH-20260916-P2G02`
- runtime: `artifacts/phase2g-gate2-runtime-P2G-S1-20260915-01.json`
- Stage-1 target duration: 120 minutes
- protected exposure: 500 Alert credits
- provider balance at preflight: 2863
- active billable subscriptions at preflight: 0
- open incidents at preflight: 0
- active probes at preflight: 0
- open probe budget days at preflight: 0
- frozen time class eligible: true

The callback origin was the Replit Development Sandbox `.replit.dev` origin. The preflight verified that the callback runtime Git HEAD matched the current source HEAD, retention was 168 hours, the dedicated provider-content bucket boundary was present, and no blockers remained.

## Runtime owner

The recorded supervisor artifact is:

- `artifacts/phase2g-stage1-AUTH-20260916-P2G02-20260916T110512Z.status.json`
- supervisor PID: 729
- child PID: 750
- callback base: the matching `.replit.dev` Development Sandbox origin

The same Replit Development Sandbox process set survived long enough for the OMAA probe to complete the intended 120-minute Stage-1 window.

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

OMAA demonstrates that the original Replit Development Sandbox execution path *can* survive a complete 120-minute probe when the host/runtime does not reset. The important conditions were:

1. exact source/runtime/AUTH binding passed before launch;
2. no open incidents or active billable subscriptions existed;
3. the callback server was live on the same source revision;
4. the supervisor and paid owner remained alive for the full window;
5. no fatal provider control-plane interruption censored the run;
6. final reconciliation reached exact `MATCH`.

## What OMAA does not prove

OMAA does **not** prove that a Replit Development Sandbox is a durable two-hour owner.

P2G09 later demonstrated that the Development Sandbox/process environment can be replaced while the paid experiment is active. A successful earlier run is evidence that the runtime happened to remain stable for that window, not a platform guarantee that the next window will remain stable.

This distinction is important for Wednesday WSSS planning: reproducing the OMAA launcher can reproduce the OMAA success conditions, but it also reproduces the P2G09 host/process-lifecycle failure domain.

## Canonical interpretation

- Keep OMAA as valid completed/MATCH Stage-1 evidence.
- Do not rerun OMAA merely because later WSSS infrastructure attempts failed.
- Do not use OMAA's successful host lifetime as justification to claim the Development Sandbox is durable.
- Any temporary fallback to a Replit-shell owner must be treated as an explicit prospective infrastructure decision, not as a restoration of a proven-durable architecture.
