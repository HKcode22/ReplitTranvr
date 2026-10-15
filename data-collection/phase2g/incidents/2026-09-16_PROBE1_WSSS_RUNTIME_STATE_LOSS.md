# Phase 2G Incident — Probe 1 WSSS runtime-state loss

> Date: 2026-09-16
> Durable probe ID: 1
> Airport: WSSS
> Authorization: `AUTH-20260916-P2G02`
> Budget day: `P2G-S1-20260915-01`
> Scientific state: failed / duration-censored / UNRESOLVED / excluded

## What happened

The first paid Stage-1 attempt passed its paid preflight and created the intended WSSS credit-based subscription. At least three provider callback bodies crossed the raw-before-ack storage boundary.

During the live window, the intentionally UNLOGGED prepaid runtime tables lost/reset the session state while the provider subscription still existed. After the session disappeared, callbacks could no longer be associated with the prepaid runtime session and persistence failed closed. The supervisor/owner process set was also no longer alive.

Emergency recovery identified and deleted exactly the owned WSSS subscription and verified that no active billable subscription remained.

## Durable evidence

- runtime session observed before reset: `c6f464b3-e8fe-4b5c-af61-22e403b40ae5`
- exact cleanup artifact: `artifacts/phase2g-stage1-emergency-cleanup-1789557942766.json`
- provider delete verified: true
- active billable after cleanup: 0
- durable raw blob references: 3
- failed-attempt adjudication receipt: `artifacts/phase2g-failed-stage1-adjudication-receipt-20260916T122402987Z.json`
- original incidents resolved by exact adjudication: 3–11
- budget closed without rewriting probe result

The exact external reason the original supervisor/owner process set vanished was not proven. The confirmed engineering defect was that the random runtime-session UUID had not yet been durably bound to the logged probe row before provider creation, so an UNLOGGED reset could destroy the ownership bridge.

## Corrective controls now present

1. `probeExecutionPrepaid_v39.ts` durably binds the random runtime-session UUID before provider creation.
2. `v39_phase2g_stage1_recover_after_exit_v39.ts` can reconstruct exact ownership from the durable UUID after an UNLOGGED reset.
3. Recovery refuses ambiguous/unmatched billable subscriptions and never bulk-deletes.
4. The paid lifecycle owner is now GitHub Actions rather than a Replit shell/background process.
5. The independent GitHub watchdog can invoke exact recovery but cannot create a subscription.
6. The historical failure-regression test requires these controls to remain in source.

## Scientific disposition

This attempt is not a WSSS yield measurement. It remains infrastructure-invalid, failed, duration-censored, and UNRESOLVED. Its failure must never be rewritten as PASS.
