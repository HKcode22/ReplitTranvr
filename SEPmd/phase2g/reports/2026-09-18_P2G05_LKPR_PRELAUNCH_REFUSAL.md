# Phase 2G P2G05 — LKPR pre-launch refusal

> Date: 2026-09-18
> Intended candidate: LKPR
> Authorization: `AUTH-20260918-P2G05`
> Frozen prospective budget ID: `P2G-S1-20260918-04`
> Scientific state: NOT_RUN

## What happened

P2G05 did not become a paid LKPR Stage-1 probe.

The callback preparation verifier had a stale route-owner expectation:
`server/routes_v3.ts`.

The hardened managed Replit runtime correctly reported:
`server/index.ts+server/routes_v3.ts`.

Because the verifier and runtime contract disagreed, preparation refused before paid preflight and before provider mutation.

## Verified consequences

- deployment performed: false
- provider called by failed callback preparation: false
- provider subscription created: false
- Alert credits spent by the attempted launch: 0
- paid preflight started: false
- paid Stage-1 launch started: false
- LKPR Stage-1 row created: false
- P2G-S1-20260918-04 database budget row created: false
- LKPR remains scientifically unmeasured
- the stale authorization is expired/consumed and may never be reused

## Corrective controls now present

The current callback verifier, paid preflight, zero-credit GitHub binding workflow, paid GitHub gate, and paid owner all validate the same exact managed runtime-health contract rather than maintaining separate route-owner assumptions.

The historical regression matrix explicitly protects the exact runtime-health schema, managed owner mode, managed workflow flag, and exact Git HEAD.

## Scientific disposition

Do not list P2G05 as a failed LKPR experiment. It was a successful fail-closed pre-launch refusal and consumed no LKPR scientific attempt.
