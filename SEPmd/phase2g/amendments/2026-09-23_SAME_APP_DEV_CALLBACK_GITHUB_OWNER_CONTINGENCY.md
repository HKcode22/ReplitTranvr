# Phase 2G amendment — temporary same-app Development callback with GitHub paid owner

> Frozen prospectively before the next paid Stage-1 attempt.
> Artifact: `artifacts/phase2g-same-app-dev-callback-contingency-freeze-20260923.json`

## Reason

P2G09 demonstrated that a paid lifecycle owner inside the Replit Development Sandbox can disappear when that sandbox/process namespace is replaced. The current published `travnr.com` deployment cannot yet be updated by the active collaborator. This amendment prevents that deployment-access constraint from forcing the next Stage-1 attempt back onto a Replit-owned paid supervisor.

## Temporary infrastructure rule

A same-app `*.replit.dev` callback origin may be used only when all of the following are true before provider subscription creation:

1. the authoritative 120-minute paid owner runs in GitHub Actions;
2. an independent GitHub Actions recovery-only watchdog observes the same exact probe/session/budget;
3. the Replit Development callback health endpoint reports `PASS`, the exact authorized Git HEAD, the prepaid route registered, retention 168, `runtime_owner_mode=replit-managed-project`, and no provider mutation;
4. a fresh zero-credit end-to-end synthetic callback proves wrong-secret rejection, correct-secret acceptance, raw/blob + delivery + item persistence, and exact-session cleanup;
5. the callback receipt is hash-bound into fresh paid preflight;
6. the Replit-local paid launcher remains disabled.

## Scientific invariants

This amendment changes callback infrastructure only. It does **not** change the immutable preprobe/compact-6 membership, 120-minute Stage-1 target, weekday/time-class rule, sequencing/rerun eligibility, budget controls, metrics, capacity gate, ranking, exact reconciliation rule, censoring semantics, AUTH scope, or no-automatic-retry rule.

A callback interruption, missing provider SEND, non-MATCH reconciliation, incomplete duration, unresolved settlement, foreign active subscription, or owner/watchdog safety failure remains terminal/non-scoreable under the existing rules.

## Symmetry

The infrastructure rule is not WSSS-specific. It may apply to another frozen Stage-1 candidate only when that candidate is independently next/authorized under the existing sequence and a fresh runtime/AUTH/preflight binds the exact callback origin and source.

## Exit

Once a published callback deployment is available and verified prospectively, select it through a fresh runtime/AUTH/preflight. Do not silently switch callback modes during a run.
