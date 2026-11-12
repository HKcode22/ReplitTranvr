# Phase5 — Fix unreachable T24 GitHub scheduled job and prevent competing automated owners (Nov 12)

**GitHub engineering only; not a live provider/database transaction.** V0087–V0092 are already owner-confirmed installed real `neondb` and must never be reinstalled. Both older Stage24 native T24 and new C+D V0092 T24 automatic owners were disabled by default. Phase5 scientific FREEZE HOLD; paid Phase6 GO NO.

## Verified code defect

The new #587 workflow declared `on.schedule: */5 * * * *` and its job `if` contained an `|| github.event_name == 'schedule'` alternative; **but the entire expression also began with `github.event_name == 'workflow_dispatch' &&`**. Boolean logic means the scheduled branch could never be true. Green offline tests didn't catch the workflow expression logic. Therefore we must **not claim #587 had functioning unattended T24 scheduling**, despite the cron declaration.

## Focused repair in this PR

1. Move the `github.ref == 'refs/heads/main'` check outside the event alternatives, leaving genuinely reachable `workflow_dispatch` with its exact manual canary signature, OR `schedule` with separately reviewed `P5_CD_GH_T24_SCHEDULE_ENABLED == 1`.
2. The repo has an older `phase5-source-upcoming-queue-main-scheduled-readonly.yml` automated **native T24 source child**, guarded by `P5_T24_AUTO_DISPATCH_ENABLED == true`. To prevent both automatic owners from acting on the same flight, choose ONE reviewed T24 path. Queued V0092 schedule refuses the old variable being `true`; legacy child refuses new schedule variable being `1`. Both have early workflow `if` plus pre-Node/pre-DB shell gates and their respective TypeScript preflight admission checks. The read-only source observer remains available even when the legacy automated child is blocked. Manual independently reviewed T24 canary path retains its own explicit approval.
3. Regression tests read the real YAML strings, assert that the scheduled expression is reachable and the historic manual-only shadowing expression is absent, verify each side's mutual-exclusion guard, and check both in-memory release gates for competing automation flags. No T24 flight is automatically enrolled, no provider GET, queue claim, POST, migration, new roles, or payment occurs here.

## What this does NOT prove

- GitHub Actions scheduling is **best effort**; cron can arrive late or be dropped, and a 3-minute cutoff window may still be missed. The already implemented bounded PostgreSQL-clock lookahead protects true issue-time semantics but cannot create past observations. A real future signed packet and original V0079 source binding, independent V0081 witness, then telemetry about actual scheduling jitter/late missingness are required before unattended release.
- Every review code SHA changing will need new independent frozen executable pin; do not automatically re-arm old secrets after merge. T24 scheduled roster is singleton, not a general 31-day per-day rotating registry yet.
- Legal/ML source Contents purpose and retention/backup question #300 still not independently resolved, Gate5 runway vs Amendment E gate-out labels not to be conflated, 31-parent-day early draw/POST/STOP needs actual live canary.

**Owner action:** none for this code-only PR. Do not enable `P5_CD_GH_T24_SCHEDULE_ENABLED` yet, and do not use the legacy automatic child simultaneously. Subsequent specific Replit Shell or GitHub secret-approval commands will be given only after genuine source/packet/legal-use review and checked CI.
