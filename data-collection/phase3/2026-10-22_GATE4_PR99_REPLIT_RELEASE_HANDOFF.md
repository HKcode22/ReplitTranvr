# Gate4 PR #99 — safe same-Replit, no-provider promotion handoff

> Created 2026-10-22. This is the exact operational handoff after owner confirmed **V0071/V0072/V0073 COMMITTED** with two narrowly scoped Neon roles. The existing published/prepaid receiver must continue serving. DO NOT execute this runbook before minimal [PR #99](https://github.com/HKcode22/ReplitTranvr/pull/99) passes all five GitHub no-provider workflows and is approved/merged to `main`. This document is on the wider DRAFT PR #95 for continuity; PR #95 is NOT itself the minimal release.

## Verified facts

- Existing Replit local branch: `release/gate3-wsss08-9pm-20261018`, local HEAD `7caa6bbcd481cd69a71ef1e77ab5f1bc137289c2` (one local Replit-publish commit after branch point, 12 behind prior main). Tracked changes=0; do not reset/force/push its branch.
- Existing production published source: `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`, prepaid route=true, HTTP200, ordinary Gate4 Alert not attested.
- Existing `.replit` build: `V39_CALLBACK_ONLY_BUILD=1`, `ADB_AUTO_COLLECT=false`. Additive PR #99 leaves that build choice unchanged. Gate4 route flag `V39_GATE4_PREBIND_ADD_ON_PREPAID` is OFF by default.
- Owner's exact Replit Shell output: `GATE4_V0071_V0072_V0073_COMMITTED_RESTRICTED_ROLES_VERIFIED`, two roles, two tables, owner rows=0, no PREPAID table modifications; generated new role URLs are in private 0600 `~/.config/replittranvr/gate4-owner-20261022/credentials.json`. Never display, copy or commit that file.

## Main promotion after all CI PASS

1. Confirm GitHub PR #99 HEAD/5-of-5 workflows; ensure code is feature-OFF by default and ordinary prepaid binary retains its existing route. Merge into protected `main` via reviewed PR, **never PR #95 as a substitute**.
2. Replit Shell *read-only* verify new remote main, current local HEAD/branch, tracked+untracked status; save an immutable local backup ref at the current local HEAD BEFORE switching local branches. A `git branch backup/gate4-presync-20261022 $(git rev-parse HEAD)` is non-destructive. NEVER `reset --hard`, `git clean`, `git push -f`.
3. Switch workspace to exact reviewed remote `main` HEAD only when no tracked/untracked collisions. The branch switch modifies working source but **does not** itself republish the currently running Autoscale deployment. Preserve the old branch for rollback.
4. Build actual original existing PREPAID binary with `V39_CALLBACK_ONLY_BUILD=1 npm run build`, verified exact source SHA. **Keep Gate4 add-on feature OFF** and no provider API mutation. Confirm published app can be safely republished without active prepaid sessions and that existing required runtime secret env is still configured privately.
5. Owner uses Replit manual Republish (NO Replit Agent). Public `GET /__v39/workspace-runtime` must report new exact pinned published SHA, prepaid route=true, `gate4_alert_ingress_registered=false`. **Do not** interpret that as live Alert readiness.
6. To activate add-on, privately configure new `GATE4_PREBIND_DATABASE_URL` from existing private credential file, correct `GATE4_PREBIND_APPROVED_DB_HOST`, unique trial secret, source/authorization/ICAO pins, `GATE4_PREBIND_RELEASE_REVIEW=EXPLICIT_NO_PROVIDER_RECEIVER`, `V39_GATE4_PREBIND_ADD_ON_PREPAID=1`. The startup role/table check must PASS before listen. Do not print URLs/secrets in logs or chat.
7. Republish only after exact source pin and rollback confirmed; verify GET health flag true AND authenticated zero-provider POST to exact Alert route yields durable V0071 original byte readback (a fake provider payload is NOT real provider ACK evidence). Wrong bearer, foreign ICAO or DB failure must not acknowledge. Verify the existing prepaid callback route remains registered.
8. The signed exact-ID owner binding/STOP worker **are not active yet**; no paid Alert CREATE, even with receiver healthy, until `gate4-safety` exact STOP job is released and visibly ARMED, V0072 trustworthy owner binding installed after CREATE, and owner gives separate tiny paid authorization.

## Rollback / no-provider failure handling

- If role admission fails, leave feature OFF and preserve prepaid-only published deployment.
- If new prepaid build lacks published source match or required health, **do not** send provider paid requests; rollback by checking out the saved prior local branch, rebuilding/re-publishing original audited callback-only binary with its original config after confirming no active subscriptions.
- Never DROP V0071/V0072 tables or privileged roles to fix a route failure. Quarantine records are research custody and require deliberate retention review, not an automatic rollback.
- Every publication is a separate real operator effect even when no paid provider subscription is created. DO NOT claim republished based on code merge, unit CI or local build alone.
- Provider billing per **SEND** means unexpected callback errors can consume credits; true paid run must be short, with a known exact owner ID and independent STOP attempt and 3 stable balance reads.

## Checkpoint before Gate4 canary

Current completed: database/schema role install from owner output; no-provider producer code extracted into focused PR #99. Pending: merge `main`, Replit source preservation+published identity, live zero-provider callback rehearsal, GitHub STOP actually ARMED, verified provider CREATE-response binding and separate new paid AUTH. Gate3 and paid Gate0.5 are owner-completed and must not be repeated.
