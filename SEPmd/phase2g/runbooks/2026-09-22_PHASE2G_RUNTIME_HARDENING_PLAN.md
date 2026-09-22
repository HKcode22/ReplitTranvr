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
- expose the read-only V3.9 runtime health contract;
- perform only secret-guarded exact-session provider-blob/runtime cleanup when requested by the authorized external owner.

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
- request exact-session Replit blob/runtime cleanup through the secret-guarded published endpoint;
- mark the probe completed only under the existing exact MATCH acceptance rule.

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

Raw provider content remains in the existing dedicated Replit Object Storage path. GitHub Actions is not given Replit object-storage credentials.

At cleanup:

1. the GitHub owner has already exact-deleted the provider subscription;
2. it sends the random session UUID and deletion-run ID to the published `/__v39/phase2g/runtime-cleanup` endpoint;
3. the endpoint requires a separate high-entropy `V39_PHASE2G_CONTROL_SECRET`;
4. the endpoint verifies exactly one provider-safe Stage-1 probe owns that runtime session;
5. Replit deletes and verifies only that session's raw blobs/runtime rows;
6. the endpoint cannot create/delete provider subscriptions and reports `provider_mutation=false`.

## Secret boundary

Never commit secret values.

GitHub environment `phase2g-paid` requires:

- `V39_DATABASE_RUNTIME_URL`
- `AERODATABOX_API_KEY`
- `AERODATABOX_WEBHOOK_SECRET`
- `V39_PHASE2G_CONTROL_SECRET`

The matching `V39_PHASE2G_CONTROL_SECRET` must also be configured in the published Replit deployment.

The provider blob bucket ID is not treated as a secret but remains exact/frozen input.

## Launch architecture

The generic workflow is:

`.github/workflows/phase2g-paid-stage1.yml`

It contains three stages:

1. **gate** — read-only provider/DB preflight, exact callback/source verification, and a three-read balance canary where required;
2. **owner** — full foreground paid Stage-1 owner;
3. **safety-watchdog** — independent fail-safe observer/recovery owner.

The gate creates the preflight receipt inside GitHub Actions and passes its exact bytes/SHA to both downstream jobs. The receipt is not committed, so creating it cannot change the source commit it verifies.

The workflow requires the explicit confirmation phrase:

`RUN_PAID_STAGE1_ONCE`

The old local/Replit paid launcher is prospectively disabled.

## Source and deployment binding

Before any future paid launch:

- all runtime/auth/evidence artifacts needed for the attempt are committed;
- the exact branch commit is pushed to GitHub;
- the published callback deployment runs the exact authorized protected source;
- the deployment health route proves the embedded build Git HEAD;
- preflight verifies protected callback source compatibility;
- GitHub Actions checks out the exact authorized commit.

No source edits occur after the paid gate opens.

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
6. Remote cleanup endpoint unit/static tests pass.
7. GitHub owner refuses non-GitHub execution.
8. GitHub watchdog proves it cannot create subscriptions.
9. Synthetic published callback test passes.
10. Secret-guarded cleanup dry/synthetic test proves exact session scoping.
11. Published callback health proves exact source commit and Autoscale runtime identity.
12. Generic workflow is reviewed before being added to the default branch so `workflow_dispatch` can be used.
13. GitHub environment secrets are configured manually; values are never written to git/chat logs.
14. Fresh runtime, budget and AUTH are created prospectively.
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
