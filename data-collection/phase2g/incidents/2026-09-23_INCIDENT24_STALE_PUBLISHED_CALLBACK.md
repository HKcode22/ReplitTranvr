# Phase 2G Incident 24 — stale published callback deployment

> Observed: 2026-09-23 UTC
> Incident ID: 24
> Cause: `raw-persistence`
> Mode: `prepaid_probe`
> Status at documentation time: unresolved
> Provider calls during reproducer: 0
> Provider subscription creation during reproducer: false
> Alert credits spent during reproducer: 0

## Summary

A zero-credit synthetic end-to-end callback verification was run against the existing published origin `https://travnr.com`.

The wrong-secret behavior remained correct, but the correct-secret synthetic prepaid callback returned HTTP 500. The production incident ledger recorded:

`V39_PREPAID_RAW_RETENTION_HOURS_MUST_BE_INTEGER_1_TO_168`

The currently published `travnr.com` deployment is an older September production snapshot. A GET to `/__v39/workspace-runtime` returns the ordinary SPA HTML rather than the current V3.9 runtime-health JSON route. The response also carries the older September 14 asset timestamp.

## Root cause

The September 14 published code resolves prepaid raw-retention hours only from the process environment and throws unless the value is an integer from 1 through 168.

The current green Wednesday source safely defaults an absent/empty value to 168, but that corrected code is present only in the development workspace/GitHub source until the production app is republished.

Replit's development workspace and published Autoscale deployment are separate runtime snapshots. Updating Git/GitHub/workspace source does not replace the currently published production backend.

## Production state after the synthetic failure

The Wednesday inventory found:

- open incidents: 1 (incident 24)
- active/settling probes: 0
- open probe budget days: 0
- previous P2G09 budget: CLOSED
- previous P2G09 WSSS probe: failed/censored/UNRESOLVED

No paid provider launch occurred while diagnosing incident 24.

## Safety consequence

Do not launch the next WSSS paid probe through the unchanged `travnr.com` prepaid callback while incident 24 remains unresolved. Doing so could spend provider credits while correct-secret callbacks return 5xx instead of persisting the required prepaid runtime evidence.

Incident 24 is a synthetic zero-credit infrastructure incident. Resolving it must not alter any historical WSSS/OMAA scientific result.

## Remediation

Preferred remediation:

1. obtain Publisher-level access to the existing Replit app;
2. republish the tested green backend;
3. verify the production runtime route/retention contract;
4. resolve only incident 24 with exact evidence;
5. rerun the zero-credit end-to-end callback verification;
6. continue to fresh Wednesday runtime/AUTH only after callback PASS.

The current collaborator cannot mutate the active Autoscale deployment environment or source snapshot through a workspace restart, cold start, suspend/resume, or shared-secret edit without an authorized deployment rollout.
