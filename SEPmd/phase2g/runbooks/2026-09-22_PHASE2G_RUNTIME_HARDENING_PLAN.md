# Phase 2G Runtime Hardening Plan — Free Independent Owner Architecture

> Created after P2G09 host/process incident on 2026-09-22.
> Updated after rejecting a new fixed-cost Reserved VM requirement.
> Status: implementation and validation required before the next paid Stage-1 attempt.

## Goal

A two-hour Stage-1 probe must not depend on:

- a Replit Shell tab,
- the Replit editor remaining open,
- one Replit Development Sandbox process surviving for two hours,
- the user's Mac remaining awake,
- or a new fixed-cost Reserved VM.

The callback receiver and the experiment owner must live in separate failure domains.

## Prospective architecture

### Callback receiver — existing Replit published Autoscale app

The existing published Travnr deployment remains the HTTP callback receiver.

Responsibilities:

- receive the exact prepaid callback route;
- persist raw provider bytes to the existing dedicated Replit Object Storage boundary before 2xx;
- persist runtime callback/accounting metadata;
- expose the already-deployed prepaid webhook route;
- persist the callback payload/runtime evidence using the existing Replit Object Storage and PostgreSQL boundaries.

The current live deployment is a legacy September snapshot and does **not** expose the newer `/__v39/workspace-runtime` or remote cleanup endpoints. This is not hidden or treated as an exact-source match. Instead, paid readiness requires a fresh zero-credit end-to-end verification receipt proving the live prepaid route still rejects a wrong secret, accepts the exact secret for a synthetic armed session, persists one blob/delivery/item, and can be cleaned exactly from the Replit workspace.

It does **not** own the 120-minute experiment clock and does not need one in-process loop to survive for two hours.

The paid callback base must be a stable published HTTPS origin such as `https://travnr.com`. A `.replit.dev` Development Sandbox origin is prohibited for paid Stage-1.

### Paid owner — GitHub Actions

The exact paid Stage-1 owner runs foreground on a standard GitHub-hosted Actions runner.

Responsibilities:

- verify exact AUTH, artifact hashes, source commit, budget and WSSS binding;
- create the one exact AeroDataBox subscription;
- retain the original frozen 120-minute deadline;
- monitor callback health and provider accounting;
- exact-delete the owned subscription at the normal endpoint;
- settle/reconcile using the existing V3.9 logic;
- after exact deletion + settlement + exact MATCH, persist the probe as `settling`;
- exit provider-safe without requiring Replit object-storage access;
- never mark the probe `completed` until the later Replit workspace cleanup/finalizer verifies exact-session deletion.

The GitHub runner is independent of the Replit Development Sandbox, so editor/Shell/runtime resets cannot kill the paid owner.

For this public repository, standard GitHub-hosted runner usage is currently documented by GitHub as free. This removes the need for a new fixed Reserved VM charge. Existing Replit Autoscale usage remains subject to the user's existing Replit plan/usage terms; this design does not claim all Replit compute is cost-free.

### Independent safety watchdog — second GitHub Actions job

A second GitHub job runs independently of the primary owner.

It:

- never creates a subscription;
- never refills credits;
- observes the same exact budget/probe/session;
- uses internal received-credit evidence and lower-frequency provider-balance reads;
- invokes only the existing exact-ID abnormal-exit recovery if a hard safety condition occurs;
- triggers on the frozen live credit limit, unresolved active subscription after failure, deadline+cleanup-grace overrun, or watchdog maximum runtime.

This gives the paid window two independent GitHub-hosted processes instead of one Replit workspace process.

## Why this fixes P2G09

P2G09 proved that callback receipt and paid ownership are separate concerns.

The original supervisor/child disappeared during a Replit Development Sandbox lifecycle event, but the HTTP app returned and another AeroDataBox callback was successfully received afterward. The scientific data path itself was not what failed; the two-hour lifecycle owner disappeared.

The new design leaves callback receipt on the published app and moves the lifecycle owner to GitHub infrastructure.

A Replit Development Sandbox reset therefore no longer terminates the experiment owner.

## Provider constraint

AeroDataBox credit-based webhook subscriptions do not automatically expire under the currently pinned provider contract. The project must therefore retain an independent authoritative deadline executor and exact deletion path.

The GitHub owner provides that executor; the independent watchdog provides a second fail-safe.

## Callback availability and Autoscale

The published callback is request-driven. The GitHub owner performs callback-health reads every 15 seconds during the paid window. These requests also keep the published callback service active/warm during the two-hour probe.

This is not treated as a substitute for callback evidence: callback success/failure counters and the provider accounting/reconciliation rules remain binding.

## Object-storage boundary

Raw provider content remains in the existing dedicated Replit Object Storage path. GitHub Actions is **not** given Replit object-storage credentials.

Successful completion is deliberately split:

1. GitHub owner exact-deletes the provider subscription.
2. GitHub owner settles provider balance and persists durable reconciliation evidence.
3. Only an exact full-duration MATCH may enter `status='settling'`.
4. At `settling`, the provider subscription is already verified inactive; no further Alert credits can accrue.
5. From the Replit workspace, run `scripts/v39_phase2g_exact_session_purpose_cleanup_v39.ts` for the exact random session UUID. It refuses if any billable provider subscription is active.
6. The cleanup receipt proves all transient runtime rows and live blob refs for that exact session are gone.
7. Run `scripts/v39_phase2g_finalize_settling_probe_v39.ts`; it verifies the cleanup receipt, durable MATCH evidence, exact session/probe/budget binding, zero active subscriptions, then changes the same probe to `completed` and closes the budget.
8. If Replit resets during steps 5–7, repeat/finalize cleanup after recovery. The scientific 120-minute window is already provider-safe and does not need to be rerun.

## Secret boundary

Never commit secret values.

GitHub environment `phase2g-paid` requires only:

- `V39_DATABASE_RUNTIME_URL`
- `AERODATABOX_API_KEY`
- `AERODATABOX_WEBHOOK_SECRET`

No new cross-platform Replit cleanup secret is required.

The provider blob bucket ID is not treated as a secret but remains an exact/frozen workflow input.

## Launch architecture

The generic workflow is:

`.github/workflows/phase2g-paid-stage1.yml`

It contains three stages:

1. **gate** — read-only provider/DB preflight, hash-bound zero-credit live callback verification, immediate wrong-secret live route recheck, and a three-read balance canary where required;
2. **owner** — full foreground paid Stage-1 owner;
3. **safety-watchdog** — independent fail-safe observer/recovery owner.

The gate creates the preflight receipt inside GitHub Actions and passes its exact bytes/SHA to both downstream jobs. The receipt is not committed, so creating it cannot change the source commit it verifies.

The workflow requires the explicit confirmation phrase:

`RUN_PAID_STAGE1_ONCE`

The old local/Replit paid launcher is prospectively disabled.

## Source and callback binding

Before any future paid launch:

- all runtime/auth/evidence artifacts needed for the attempt are committed;
- the exact GitHub owner/source commit is pushed and hash-bound;
- the live callback deployment is **not** claimed to run that same commit because the user has no republish permission;
- a fresh committed `v39.phase2g-live-callback-verification.v1` receipt proves the existing live route end-to-end with zero provider calls and zero Alert credits;
- the GitHub gate verifies that receipt SHA, requires it to be recent, and rechecks the live wrong-secret contract immediately before launch;
- GitHub Actions checks out the exact authorized owner commit.

No source edits occur after the paid gate opens. The callback compatibility proof is behavioral and explicit; it is not represented as an unavailable deployment Git-head proof.

## P2G09 historical handling

P2G09 remains:

- failed;
- duration-censored;
- reconciliation UNRESOLVED;
- excluded from scientific scoring.

Its infrastructure failure can prospectively justify one new explicitly authorized attempt only after the new architecture passes all offline/deployment gates.

The prior `no_further_automatic_wsss_retry` rule means no blind or implicit retry. It does not permanently prohibit WSSS after a separately documented infrastructure remediation and prospective authorization.

## Required validation before another paid attempt

1. P2G09 exact adjudication and budget/incident closeout.
2. Feature branch rebased with the preserved local evidence commit.
3. Full Phase-2G tests pass.
4. TypeScript passes.
5. Production build passes and embeds the exact Git HEAD.
6. Deferred-cleanup + settling-state + exact-session finalizer tests pass.
7. GitHub owner refuses non-GitHub execution.
8. GitHub watchdog proves it cannot create subscriptions.
9. Zero-credit live callback verification against `travnr.com` passes end-to-end and its receipt is committed/hash-bound.
10. Exact-session Replit cleanup dry/synthetic test proves zero-active-subscription gating and exact session scoping.
11. Settling finalizer synthetic test proves a provider-safe MATCH cannot become `completed` before cleanup verification.
12. Generic workflow is reviewed before being added to the default branch so `workflow_dispatch` can be used.
13. GitHub environment secrets are configured manually; values are never written to git/chat logs.
14. Fresh prospective infrastructure amendment/runtime/budget/AUTH are created.
15. Fresh read-only GitHub gate returns PASS before any provider mutation.
16. Launch only inside the frozen weekday Stage-1 time class.

## Failure policy

- Do not launch a second subscription because one job becomes uncertain.
- Owner failure does not authorize a retry.
- Watchdog recovery is exact-ID only.
- Foreign active billable subscriptions fail closed.
- Any non-MATCH reconciliation remains terminal/non-scoreable.
- No tolerance is calibrated from prior failed attempts.
- No WSSS yield/ranking outcome is used to justify retry authorization.

## References

- P2G09 incident:
  `SEPmd/phase2g/incidents/2026-09-22_P2G09_REPLIT_WORKSPACE_RESET.md`
- Replit support-ready report:
  `SEPmd/phase2g/incidents/2026-09-22_REPLIT_SUPPORT_REPORT.md`
- GitHub issue #4
- V3.9 Data Collection Plan and Implementation Log remain the baseline scientific authority.


## Final no-extra-cost execution architecture

After further review, a Reserved VM is **not required** for the next recovery attempt.

The preferred architecture is:

- Existing published `travnr.com` deployment: HTTP callback receiver only; no republish is required for this recovery path.
- GitHub Actions **owner job**: runs the existing audited Stage-1 owner in the foreground for the 120-minute scientific window.
- GitHub Actions **independent safety-watchdog job**: watches the same durable budget/probe/session and may only invoke exact fail-closed recovery; it cannot create a second subscription.
- PostgreSQL: shared experiment state/runtime counters.
- Replit Object Storage: raw provider payload boundary remains unchanged.
- Interactive Replit Development Sandbox/Shell: **not part of paid execution**.

This removes the P2G09 single point of failure: a Replit editor/Shell/Development Sandbox reset cannot terminate the GitHub-hosted owner.

The owner supervisor performs a wrong-secret prepaid-route POST health check every 15 seconds. During an active probe this also continuously exercises the Autoscale deployment, reducing callback cold-start risk without a dedicated always-on VM.

### Exact role separation

```text
AeroDataBox
    |
    v
travnr.com published Autoscale callback
    |
    +--> Replit Object Storage (raw provider payload)
    |
    +--> PostgreSQL runtime evidence
                 ^
                 |
       GitHub Actions owner
       - exact AUTH/runtime/preprobe binding
       - creates one subscription
       - 120-minute immutable deadline
       - provider balance guard
       - settlement/reconciliation
       - published callback health every 15s
                 |
                 +--> GitHub Actions safety watchdog
                      - cannot create subscriptions
                      - observes exact probe/session/budget
                      - exact recovery on safety boundary
```

At purpose completion, GitHub has already stopped and reconciled provider exposure. It leaves a full-duration exact-MATCH probe in `settling`. The Replit workspace then performs exact-session cleanup locally and the finalizer changes that same probe to `completed` and closes the budget. Provider subscription creation/deletion remains owned by the audited GitHub Stage-1 owner/recovery code.

### Why this is stronger than the previous Replit workspace owner

The prior design required one process inside the Development Sandbox to survive for two hours. `setsid` only detached that process from a Shell; it could not survive replacement of the sandbox/runtime.

The new design makes the long-running owner a GitHub-hosted job. The published Replit deployment is request-driven and can restart independently without destroying the owner clock. The owner repeatedly checks the published callback and fails closed if the callback becomes persistently unavailable.

### Cost constraint

This architecture is selected specifically to avoid requiring a new Reserved VM deployment charge. Repository visibility is public, so standard GitHub-hosted Actions runners are eligible for GitHub's public-repository hosted-runner policy. Current account/billing limits must still be reviewed before paid provider execution, but no Reserved VM is part of the frozen design.

### Workflow activation rule

The paid GitHub Actions workflow is manual only (`workflow_dispatch`), requires the literal confirmation token `RUN_PAID_STAGE1_ONCE`, uses a global non-cancelling concurrency group, and has three jobs:

1. `gate`: generates one fresh read-only preflight receipt;
2. `owner`: consumes that exact receipt and runs the paid owner in the foreground;
3. `safety-watchdog`: consumes the same receipt and independently protects the exact subscription.

The workflow must exist on the repository default branch before it can be manually dispatched. Do not merge/activate it until branch static/typecheck/build tests pass and the published callback deployment is verified on the exact source HEAD.
