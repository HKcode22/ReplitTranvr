# Phase 2G Incident — Probe 3 MMUN runtime interruption

> Date: 2026-09-17
> Durable probe ID: 3
> Airport: MMUN
> Authorization: `AUTH-20260917-P2G04`
> Budget day: `P2G-S1-20260917-03`
> Scientific state: failed / duration-censored / UNRESOLVED / excluded

## What is durably known

The MMUN Stage-1 attempt started under the exact approved runtime/AUTH and runtime session
`2a19b4cb-9c1f-44d0-8291-4108f9ac41ad`.

The durable failure/adjudication evidence shows:

- probe status: failed
- duration_censored: true
- reconciliation_status: UNRESOLVED
- 17 durable provider-content blob references existed for the failed session
- four exact incident rows were associated with the attempt (12–15)
- incident causes included `reconciliation` and `raw-persistence`
- exact provider-subscription cleanup was attempted and verified
- active billable subscriptions after emergency cleanup: 0
- later exact-session purpose cleanup deleted all 17 live blobs and left 0 session/delivery/item/live-blob rows
- exact failed-attempt adjudication preserved the failed probe and closed only its budget day

Key artifacts:

- `artifacts/phase2g-stage1-emergency-cleanup-P2G04.json`
- `artifacts/phase2g-exact-session-purpose-cleanup-mmun-1789912385292.json`
- `artifacts/phase2g-failed-stage1-adjudication-plan-20260917T133323007Z.json`
- `artifacts/phase2g-failed-stage1-adjudication-receipt-20260917T133741329Z.json`

## Root-cause certainty

The repository preserves enough evidence to classify this as an infrastructure/runtime interruption, but it does **not** preserve enough low-level exception detail to claim a narrower platform cause with confidence.

Therefore this report deliberately does not invent a more specific explanation.

The relevant failure family is nevertheless covered prospectively by the same controls introduced after Probe 1 and later P2G09:

1. durable runtime-session binding before provider creation;
2. exact owned-subscription recovery after transient/runtime state loss;
3. GitHub-owned two-hour lifecycle;
4. independent GitHub safety watchdog;
5. exact callback/runtime health checks;
6. durable reconciliation evidence before transient cleanup.

## Scientific disposition

MMUN remains failed/censored/UNRESOLVED and is excluded from scoring. The failure is not interpreted as poor MMUN airport yield.
