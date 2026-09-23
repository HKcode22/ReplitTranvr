# Phase 2G Wednesday WSSS — contingency analysis while Publisher access is pending

> Date: 2026-09-23 preparation
> Frozen green source: `a97b6b685b0dadb21e197607871a74f6fc805d1c`
> Objective: preserve the next WSSS 120-minute Stage-1 attempt without silently weakening scientific or billing safeguards.
> Scope: same existing Replit app only.

## Current facts

The production inventory immediately before Wednesday preparation shows:

- one open incident: incident 24, caused by the synthetic `travnr.com` callback retention failure;
- zero active/settling probes;
- zero open probe budget days;
- P2G09 budget `P2G-S1-20260922-08` closed;
- P2G09 probe 7 remains failed, duration-censored, UNRESOLVED;
- OMAA probe 2 remains completed, uncensored, exact MATCH.

The protected Wednesday source tree is clean at `a97b6b685b0dadb21e197607871a74f6fc805d1c`.

## Historical comparison: OMAA vs P2G09

### OMAA P2G02

OMAA used a `.replit.dev` Development Sandbox callback and a Replit-hosted supervisor/owner. The host/process environment remained alive for the full 120-minute window, and the final probe is completed/MATCH.

### WSSS P2G09

P2G09 also entered the paid window with a healthy `.replit.dev` callback and exact source binding. Callback/accounting evidence was healthy before failure. The Replit Development Sandbox/process set was then replaced/reset, killing the supervisor and paid owner. The HTTP application recovered and callbacks continued, but the lifecycle owner did not. Exact recovery deleted the subscription and preserved the run as failed/censored/UNRESOLVED.

Therefore the difference between OMAA and P2G09 was not a special OMAA launcher that guarantees survival. OMAA's host stayed alive; P2G09's host/process namespace did not.

## Can shell detachment fix this?

No shell-only primitive can guarantee survival of a full Development Sandbox replacement:

- `nohup`
- `setsid`
- detached child/process group
- keeping the browser open
- keeping a Shell tab open
- running a second process in another Shell tab

These can protect against terminal closure or parent-shell exit. They cannot survive replacement of the workspace runtime/process namespace itself. P2G09 is direct project evidence of that boundary.

## Candidate same-app contingency paths

### A. Restore the old Replit-shell paid owner unchanged

**Technically possible only by undoing current prospective guards, but not accepted as Wednesday-ready.**

Current green source prospectively disables the local paid launcher and requires GitHub Actions ownership. Re-enabling the old launcher would recreate the exact P2G09 single failure domain.

A successful OMAA run is not sufficient evidence to claim this is durable.

### B. Replit managed Project workflow owns the paid lifecycle

**Possible as a new engineering design, not ready as a last-minute fallback.**

The managed Project workflow recovered the HTTP server after P2G09. In theory a restart-aware paid owner could be integrated into that managed workflow.

However, safe continuation after restart would require a prospectively tested takeover protocol that:

- finds the exact durable probe/session;
- proves there is exactly one owned provider subscription;
- resumes the original immutable deadline rather than starting a new 120-minute window;
- never creates a duplicate subscription;
- preserves callback/session state;
- settles and reconciles the same probe;
- handles repeated restart during recovery.

That protocol does not currently exist as the frozen paid path. Building it immediately before Wednesday would introduce more unvalidated complexity than the GitHub-owner remediation.

### C. Replit-shell owner plus another Replit-shell watchdog

**Not independent.**

Both processes share the same workspace failure domain and can disappear together.

### D. Replit-shell owner plus the user's Mac as watchdog

**Improves detection but is not the frozen durable design.**

The Mac can fail, sleep, lose network, or close. The experiment should not require the user's computer to remain healthy for the full paid window.

### E. GitHub Actions owner with a Development Sandbox callback

**Architecturally stronger than the old shell owner, but currently not authorized by the frozen Wednesday code.**

This separates the two-hour paid lifecycle owner from the Replit Development Sandbox, directly fixing the P2G09 orphan-owner problem. However:

- current paid preflight/supervisor code explicitly rejects `.replit.dev` callback origins;
- the P2G09 recovery freeze requires the hardened callback path;
- a Development Sandbox reset can still make the callback temporarily unavailable;
- a prospective exception would require a new amendment, source change, tests, CI, and fresh runtime/AUTH before launch;
- exact reconciliation would still fail closed if billed provider sends were not received, so scientific corruption would not be silently accepted, but the attempt could still be censored and spend credits.

This is the only technically plausible no-republish contingency worth further engineering review if Publisher access remains unavailable, but it is **not** equivalent to simply switching the old Replit-shell launcher back on.

## Wednesday decision boundary

Do not spend the remaining prospectively authorized WSSS recovery attempt merely because the clock reaches the frozen time window.

The launch must still satisfy:

- exact fresh runtime/budget/AUTH;
- zero open incidents;
- zero active/settling probes;
- zero foreign active billable subscriptions;
- stable provider balance reads;
- correct WSSS/time-class binding;
- callback persistence contract proven before paid creation;
- exact reconciliation/fail-closed handling;
- an owner architecture whose failure behavior has been prospectively frozen.

## Recommended priority

1. Continue seeking Publisher access for the existing Replit app.
2. Keep the exact Wednesday source and all non-paid preparation ready.
3. Do **not** revert to the old local shell owner solely because OMAA once completed on it.
4. If Publisher access is still unavailable before the window and a no-delay contingency is required, evaluate the narrower **GitHub-owner + Development-Sandbox-callback** exception prospectively rather than restoring the Replit-shell owner. That path still requires explicit code/amendment/test work before any paid action.

## Documentation preservation

This runbook is intentionally documentation-only and lives on a separate documentation branch so the frozen Wednesday execution HEAD is not changed merely by recording the analysis.
