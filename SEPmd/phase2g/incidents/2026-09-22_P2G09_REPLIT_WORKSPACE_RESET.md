# Phase 2G Incident Report — P2G09 Replit Workspace Reset

> Incident date: 2026-09-22  
> Branch at incident: `phase2g-weekend-hardening-20260918`  
> Source HEAD: `e6ce0780090cdfd9f2861e09ceb6c7194d3d4363`  
> Authorization: `AUTH-20260922-P2G09`  
> Budget: `P2G-S1-20260922-08`  
> Airport: `WSSS`  
> Probe ID: `7`  
> Runtime session: `4ac364c1-1f01-4cda-99d9-b0038a4393ea`  
> Provider subscription: `e0dc3e9a-7cd0-440e-a0d9-2da0dcdd8c97`

## Executive finding

P2G09 did **not** fail because of WSSS data quality and did **not** fail because the AeroDataBox subscription stopped delivering callbacks.

The paid owner process failed because the Replit development workspace/process environment reset or replaced the running process set. The Stage-1 supervisor and child PIDs disappeared while the public application route recovered under the Replit-managed project workflow on the same Git HEAD.

The callback/session path continued working after the owner processes disappeared: the runtime session recorded another successful callback at 2026-09-22T13:02:23.657Z. The paid subscription therefore remained live without its two-hour lifecycle owner until exact-ID recovery deleted it and verified it inactive.

This is a host/process-lifecycle failure. Probe 7 remains failed, duration-censored, and UNRESOLVED. It is excluded from scientific scoring.

## Exact timeline

All times are UTC unless PDT is shown explicitly.

| Time | Event |
|---|---|
| 2026-09-22T12:46:55.687Z | P2G09 paid preflight PASS. Three provider balance canary reads were all 2194. Zero active billable subscriptions, zero incidents, callback exact contract PASS. |
| 2026-09-22T12:50:16Z | Stage-1 launch requested. |
| 2026-09-22T12:50:17.103Z | Supervisor PID 6805 started. |
| 2026-09-22T12:50:18.160Z | Probe window started. |
| 2026-09-22T12:50:21.071Z | Probe row 7 recorded as probing. |
| 2026-09-22T12:50:21.509Z | Runtime session created and later bound to exact provider subscription. |
| 2026-09-22T12:50:39.558Z | First callback delivery received. |
| 2026-09-22T12:57:37.780Z | Fourth callback delivery received. |
| 2026-09-22T12:58:40.784Z | Live audit: 4/4 callbacks succeeded, 30 internal credits, provider balance delta 30, external-minus-internal 0, zero open incidents, exactly one active billable subscription. |
| 2026-09-22T12:59:47.312Z | Last supervisor heartbeat observed before the host/process replacement. callback_consecutive_failures=0, watchdog=false. |
| 2026-09-22T12:59:58Z (05:59:58 PDT) | Independent Mac monitor observed public callback HTTP 502. |
| 2026-09-22T13:00:13Z (06:00:13 PDT) | Public runtime returned HTTP 200 again on the same Git HEAD, but owner mode had changed from `phase2g-detached-npm-run-dev` to `replit-managed-project`. |
| 2026-09-22T13:00:28Z–13:00:59Z | Public runtime continued HTTP 200/PASS under the managed project owner. |
| 2026-09-22T13:01:24.207Z | Replit app metadata reported the app updated during the same reset interval. This is supporting evidence of an app/workspace lifecycle event; it does not independently prove the platform-level cause. |
| 2026-09-22T13:02:23.657Z | Runtime session recorded a fifth successful callback after the original supervisor/child had already disappeared. callback_requests_seen=5, success_2xx=5, failures=0. |
| 2026-09-22T13:02:28Z | Diagnostic: supervisor PID 6805 dead; child PID 6824 dead. Durable probe row still `probing`; runtime session still `active`; exact provider subscription still active; public callback server PASS under managed project. |
| 2026-09-22T13:02:52.174Z | Exact-session runtime cleanup verified. |
| 2026-09-22T13:02:52.276Z | Incident 23 opened with reason `supervisor_child_exit_recovered`. |
| 2026-09-22T13:02:52Z | Abnormal-exit recovery deleted the exact owned subscription, verified it inactive, cleaned runtime state, and marked probe 7 failed/censored/UNRESOLVED. |
| post-recovery | Provider balance 2162; active billable subscriptions 0; P2G09 subscription inactive. |

## Evidence immediately before failure

At 2026-09-22T12:58:40.784Z the experiment was healthy:

- probe status: `probing`
- duration_censored: `false`
- runtime session: `active`
- callback requests/successes/failures: `4 / 4 / 0`
- deliveries: `4`
- notification items/internal credits: `30`
- provider balance: `2164`, baseline `2194`, external delta `30`
- external-minus-internal: `0`
- fallback deliveries: `0`
- cost/item disagreements: `0`
- open incidents: `0`
- active billable subscriptions: exactly `1`, exact owned ID

Therefore there is no evidence that WSSS itself triggered this failure.

## Failure classification

### What failed

The process lifetime of the Stage-1 owner was tied to the Replit development workspace/runtime. Both supervisor and child PIDs vanished during a workspace/process reset.

### What survived

- Git HEAD remained unchanged.
- The Replit-managed application workflow recovered the HTTP server.
- The V3.9 webhook route remained registered.
- The runtime session and provider subscription remained active.
- AeroDataBox continued to deliver callbacks successfully after the owner process had died.

### Why this is unsafe

The supervisor owns:

- the 120-minute deadline,
- callback-health supervision,
- provider balance cross-checking,
- exact subscription deletion,
- settlement/reconciliation,
- runtime cleanup,
- final probe state.

If the HTTP server comes back but the supervisor does not, the subscription can continue spending credits without the process that is supposed to stop and reconcile it.

The abnormal-exit recovery successfully contained this occurrence, but manual recovery is not a production-quality primary design.

## Relationship to earlier WSSS failures

These attempts did not share one root cause.

| Attempt | Failure class | Summary |
|---|---|---|
| P2G06 / probe 4 | reconciliation | Full-duration result; external 220 vs internal 219; MISMATCH; excluded. |
| P2G07 / probe 5 | provider control plane | AeroDataBox balance/delete HTTP 502; orphan subscription existed until exact-ID cleanup; UNRESOLVED; excluded. |
| P2G08 / probe 6 | provider control plane + classification bug | Repeated AeroDataBox balance HTTP 502 censored run; deletion succeeded; false PASS path later adjudicated to failed; excluded. |
| P2G09 / probe 7 | Replit host/process lifecycle | Healthy collection and exact accounting before Replit workspace/process replacement killed supervisor/child; callback application recovered; exact subscription required abnormal-exit recovery; UNRESOLVED; excluded. |

## Replit configuration relevant to this incident

The repository `.replit` currently defines:

- development workflow: `V39_WORKSPACE_RUNTIME_OWNER_MODE=replit-managed-project npm run dev`
- development port: 5000
- deployment target: `autoscale`
- production build/run commands
- `WEBHOOK_BASE_URL=https://travnr.com/`

The paid Stage-1 launch/supervisor health contract, however, was bound to the temporary `.replit.dev` development workspace origin.

Replit's current deployment documentation distinguishes the environments:

- Autoscale: request-driven servers that may scale to zero.
- Reserved VM: dedicated server that never sleeps; documented for background work and always-on APIs.
- Scheduled: runs a command on a schedule, then stops; no public URL.

Reference:
https://docs.replit.com/features/publishing/deployment-types

## Root-cause conclusion

**Confirmed:** the immediate P2G09 cause is loss of the supervisor/child processes during a Replit workspace/process replacement.

**Not proven:** whether the underlying Replit lifecycle event was caused by host migration, editor/runtime restart, infrastructure maintenance, resource pressure, workflow replacement, or another Replit platform mechanism. The user reports the browser, Replit workspace, and shells were left open and untouched.

The incident must therefore be described as a Replit development-workspace/runtime reset or replacement, not as user closure and not as an AeroDataBox/WSSS failure.

## Required remediation before another paid Stage-1 launch

1. Do not use an interactive `.replit.dev` development workspace as the sole paid lifecycle owner.
2. Pin the provider callback base and owner runtime separately and hash-bind both into runtime/AUTH evidence.
3. Move the always-on callback/control plane to deployment infrastructure appropriate for long-running/background work.
4. Add restart/resume semantics so loss of one process does not automatically orphan an active subscription.
5. Add an independent fail-safe that can delete the exact owned subscription if the primary owner disappears.
6. Preserve the existing exact-ID/no-bulk-delete recovery discipline.
7. Re-run offline, synthetic callback, crash/restart, and provider-read-only gates before another paid attempt.

See:
`SEPmd/phase2g/runbooks/2026-09-22_PHASE2G_RUNTIME_HARDENING_PLAN.md`
