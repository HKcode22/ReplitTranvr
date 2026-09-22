# Replit Support Report — Development Workspace Reset Killed Paid Experiment Owner

## Account/app

- Replit app ID: `95ac2e69-854d-460f-8e9d-8e4711aef739`
- App title: `Travnr-Environment-Setup.zip`
- Incident date: 2026-09-22
- Incident window: approximately 2026-09-22T12:59:47Z through 2026-09-22T13:02:28Z
- Local time: approximately 05:59:47–06:02:28 PDT
- Git HEAD at incident: `e6ce0780090cdfd9f2861e09ceb6c7194d3d4363`

## User-observed behavior

The Project Editor, Replit workspace, and Shell tabs were open and left untouched. The user did not close the project or intentionally restart it.

A detached Node supervisor and child process were running a two-hour scientific collection window. The development HTTP server was also running.

At approximately 12:59:58Z, an independent external monitor observed the public `.replit.dev` endpoint return HTTP 502. Seconds later the application returned on the same Git HEAD, but the runtime owner had changed from the detached process to the Replit-managed Project workflow. Shell sessions had reset and the original supervisor/child PIDs no longer existed.

## Exact evidence

- last healthy supervisor heartbeat: `2026-09-22T12:59:47.312Z`
- external callback monitor: HTTP 502 at `2026-09-22T12:59:58Z`
- managed Project workflow HTTP server visible again by `2026-09-22T13:00:13Z`
- Replit app metadata showed `timeUpdated=2026-09-22T13:01:24.207Z`
- at `2026-09-22T13:02:28Z`:
  - original supervisor PID 6805: absent
  - original child PID 6824: absent
  - public runtime: HTTP 200/PASS on same Git HEAD
  - runtime owner: `replit-managed-project`
  - database/runtime session: still active
  - exact external subscription: still active
- another valid webhook callback was received at `2026-09-22T13:02:23.657Z`, after the original owner processes had disappeared.

This indicates that the HTTP application recovered while unrelated detached background processes and Shell sessions were lost.

## Safety impact

The external subscription continued to exist after the process responsible for its deadline, settlement, and deletion disappeared.

Project recovery logic subsequently:
- identified the exact owned subscription;
- deleted only that exact subscription;
- verified it inactive;
- cleaned runtime state;
- marked the scientific attempt failed/censored/UNRESOLVED.

No continuing paid exposure remains.

## Questions for Replit

1. Was app/workspace `95ac2e69-854d-460f-8e9d-8e4711aef739` recycled, migrated, suspended/resumed, or process-namespace restarted during 12:59–13:02 UTC on 2026-09-22?
2. Are there platform/internal logs identifying the reason for the workspace lifecycle event?
3. Is loss of detached `setsid`/background processes expected whenever a Development Sandbox is recycled?
4. Can any development-workspace setting prevent such lifecycle replacement, or must a long-running owner be moved to a Reserved VM deployment?
5. For Reserved VM deployments, what process-restart behavior should an application expect if the main process exits or the underlying VM is restarted?

## Project-side remediation

The project is moving paid experiment ownership away from the interactive development workspace and will require a stable published Reserved VM contract before another paid attempt.

The incident is also tracked in:
- `SEPmd/phase2g/incidents/2026-09-22_P2G09_REPLIT_WORKSPACE_RESET.md`
- GitHub issue #4
