# Phase 2G Runtime Hardening Plan — Remove Interactive Workspace as Single Point of Failure

> Created after P2G09 host/process incident on 2026-09-22.
> Status: implementation required before the next paid Stage-1 attempt.

## Goal

Make a two-hour Stage-1 probe continue safely when the Replit editor, Shell, development workspace, or a single Node process restarts.

The system must not depend on a human keeping a Shell tab open.

## Architecture decision

### Preferred target

Use a **dedicated Replit Reserved VM deployment** for the V3.9 collector/control plane, or an equivalent always-on VM/service.

Replit documents Reserved VM as a dedicated server that never sleeps and as the appropriate deployment type for background work and always-on APIs.

Do not treat the development `.replit.dev` workspace as an availability guarantee.

### Keep the normal Travnr web deployment isolated

The current main app is configured as Autoscale. Do not silently convert the user-facing Travnr production deployment solely for the experiment.

Preferred isolation:

- existing Travnr app: normal product deployment
- dedicated V3.9 collector deployment: Reserved VM
- dedicated stable callback hostname, e.g. a Replit `.replit.app` deployment URL or approved collector subdomain
- same production database/object-storage contracts only after explicit binding verification

If a separate Reserved VM is not available, changing the existing production deployment type requires explicit human review because it changes cost and production hosting behavior.

## Why Autoscale alone is insufficient for the owner

Autoscale is request-driven and may scale to zero. It is appropriate for APIs, including webhook receivers, but a two-hour background owner loop cannot rely on continuous process residence when no request is active.

Therefore either:

1. run the lifecycle owner on Reserved VM, or
2. run the lifecycle owner as a dedicated deployment job while callbacks are served by a stable deployment.

## Mac fallback

A Mac can run the lifecycle owner, but it is a fallback, not the preferred production design.

It is viable only if:

- callback URL is a stable public deployment URL, not localhost and not a temporary tunnel;
- the Mac has the exact source HEAD;
- production DB/provider credentials are available securely;
- `caffeinate`/power/network protections are active;
- a process manager such as `launchd` or `tmux` keeps the owner independent of a Terminal tab;
- an independent provider cleanup path remains available.

Mac risks include sleep, reboot, network loss, local process termination, and credential exposure.

## Required code changes

### H1 — Freeze two separate endpoints

Runtime/AUTH must record:

- `callback_public_base`
- `owner_runtime_identity`

They must not be inferred from the same development-domain variable.

### H2 — Reject temporary development callback ownership for paid Stage 1

Paid preflight must fail if the paid owner contract is an interactive development-only runtime.

Development callback tests may still use `.replit.dev`, but paid Stage 1 must require the explicitly frozen production collector binding.

### H3 — Durable owner lease

Add a durable control-plane lease for an active probe:

- probe ID
- session UUID
- owner generation
- original window start
- immutable deadline
- lease heartbeat
- owner runtime identity
- recovery state

Use a database advisory lock or compare-and-swap lease so only one owner controls a probe at a time.

### H4 — Restart/resume

On collector startup:

1. find the exact active/probing Stage-1 row;
2. acquire the exact owner lease;
3. verify the durable session UUID;
4. verify the exact provider subscription using deterministic callback URL + airport;
5. verify callback health;
6. verify no foreign billable subscription;
7. if the original deadline is still in the future and continuity requirements are satisfied, resume supervision for the **remaining original window**;
8. never create a second subscription as part of resume;
9. otherwise fail closed and exact-delete.

The restart must not reset the scientific clock.

### H5 — Durable minimal callback receipts

UNLOGGED runtime tables can disappear after database crash recovery.

Persist only the minimum non-payload metadata necessary to reconstruct continuity:

- session UUID
- delivery timestamp
- notification item count
- explicit delivery-attempt credit value when present
- payload/blob hash/reference
- callback HTTP outcome/counter

Raw provider payload remains in the existing controlled object-storage/retention path.

This allows a restart to reconstruct accounting without retaining unnecessary provider content in ordinary tables.

### H6 — External fail-safe

Add a second independent watchdog that is not the same process as the owner.

It may be:

- a Scheduled Deployment,
- a small separate Reserved VM worker,
- another approved external job runner.

It should:

- read the durable owner heartbeat,
- identify only the exact owned subscription,
- never create subscriptions,
- exact-delete only after a frozen stale-owner threshold,
- open an incident,
- never bulk-delete.

The Mac monitor remains observational and is not the primary fail-safe.

### H7 — Provider 502 resilience remains separate

Do not conflate host restart handling with AeroDataBox control-plane handling.

Keep:

- slow provider balance polling,
- bounded retry cycles,
- exact-ID delete retries,
- authoritative settlement,
- exact reconciliation rule,
- no tolerance learned from failed attempts.

## Required tests

Before paid relaunch:

1. offline unit tests pass;
2. TypeScript passes;
3. callback synthetic storage test passes;
4. exact production/deployment callback health contract passes;
5. crash test: kill the owner process mid-window while callback server stays alive;
6. resume test: replacement owner attaches to the same subscription and same immutable deadline;
7. duplicate-owner test: second owner is refused by the lease;
8. host restart simulation: runtime process restarts and does not create a second subscription;
9. UNLOGGED-loss simulation: durable metadata is sufficient to reconstruct/fail closed;
10. provider-balance 502 simulation remains fail-closed after bounded retries;
11. exact provider delete 502 simulation remains exact-ID only;
12. external watchdog dry run proves zero mutation while owner heartbeat is healthy.

## Paid launch gate

A future WSSS attempt is allowed only after a new explicit infrastructure-recovery authorization is created prospectively.

The reason for a future retry may be the documented P2G09 host/process infrastructure failure; WSSS yield or ranking must not be used as the reason to retry.

The prior phrase `no_further_automatic_wsss_retry` means no blind/implicit retry. It does not mean WSSS can never be attempted again. A new, documented authorization can be created after the new runtime design is frozen and tested.

## Next operational sequence

1. Close/adjudicate P2G09 as failed/censored/UNRESOLVED.
2. Implement H1–H7.
3. Configure a stable collector deployment.
4. Verify production secrets/database/object-storage bindings without paid mutation.
5. Run synthetic callback and crash/resume tests.
6. Freeze a new runtime artifact and a new infrastructure-recovery amendment.
7. Create a fresh budget day and fresh AUTH.
8. Run read-only provider preflight.
9. Start WSSS in the frozen weekday 12:00 UTC time class only after every gate passes.

## Sources

- Replit deployment types:
  https://docs.replit.com/features/publishing/deployment-types
- Replit Reserved VM description:
  dedicated server that never sleeps; intended for background work and always-on APIs.
- Replit Scheduled deployments:
  scheduled command jobs; no public URL.
