# Phase 2G — 2026-09-23 status index

> Documentation branch only. The frozen Wednesday execution branch remains unchanged at `a97b6b685b0dadb21e197607871a74f6fc805d1c`.

## Current scientific status

| Probe | Airport | Result | Interpretation |
|---|---|---|---|
| 1 | WSSS | failed / censored / UNRESOLVED | infrastructure-invalid |
| 2 | OMAA | completed / uncensored / MATCH | valid Stage-1 evidence |
| 3 | MMUN | failed / censored / UNRESOLVED | infrastructure-invalid |
| 4 / P2G06 | WSSS | failed / full-duration / MISMATCH | external 220 vs internal 219; excluded |
| 5 / P2G07 | WSSS | failed / censored / UNRESOLVED | provider 502/delete-control-plane failure; excluded |
| 6 / P2G08 | WSSS | failed / censored / MATCH | balance-control-plane 502; false-completion path corrected; excluded |
| 7 / P2G09 | WSSS | failed / censored / UNRESOLVED | Replit Development Sandbox/process reset killed owner; excluded |

## Current Wednesday blocker

Incident 24 is the sole open incident. It was produced by the zero-credit synthetic callback verification against the existing published `travnr.com` backend, which is still an older September snapshot and rejects correct-secret prepaid persistence because `V39_PREPAID_RAW_RETENTION_HOURS` is not available in that deployment revision.

There are currently zero active/settling probes and zero open probe budget days.

## Current hardened execution design

- GitHub Actions: authoritative 120-minute paid owner.
- GitHub Actions: independent recovery-only safety watchdog.
- Existing published Replit app: callback receiver only.
- PostgreSQL: durable shared control/evidence state.
- Replit Object Storage: provider raw-content boundary.
- Replit workspace: post-provider exact-session cleanup/finalization only.
- Exact reconciliation remains required for completion.
- No automatic WSSS retry beyond the prospectively documented infrastructure-recovery allowance.

## New documentation added on 2026-09-23

- `reports/2026-09-16_P2G02_OMAA_SUCCESS.md` — why OMAA is valid and why it does not prove Development Sandbox durability.
- `incidents/2026-09-23_INCIDENT24_STALE_PUBLISHED_CALLBACK.md` — current production callback/republish blocker.
- `runbooks/2026-09-23_WEDNESDAY_WSSS_CONTINGENCY_ANALYSIS.md` — analysis of shell fallback, managed-workflow recovery, and no-republish contingency options.

## Execution-source protection

No documentation commit in this branch changes the frozen Wednesday execution source. The Wednesday branch remains separate so documentation work does not silently change the Git HEAD that CI/runtime/AUTH evidence is intended to bind.

## Incident 25 — zero-credit callback SQL placeholder defect

The Wednesday same-app Development callback proof exposed a prepaid-item INSERT placeholder defect before any paid run. Incident 25 records the exact PostgreSQL UUID/integer type error. The source was corrected and regression-covered on `main`; a fresh zero-credit proof is required before incidents 24/25 can be resolved or any paid WSSS action can proceed.

See `incidents/2026-09-23_INCIDENT25_PREPAID_ITEM_SQL_PLACEHOLDER.md`.
