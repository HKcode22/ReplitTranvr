# Phase 6 provider account and budget approval — 2026-11-22 / APPROVED (bounded)

**Status:** `APPROVED_FOR_PHASE6_PAID_MONTH` — free account and candidate arithmetic reconciled, within the frozen cap. `phase6PaidGo=false`. No paid subscription created, no provider call made.

## Question reviewed

Does the current AeroDataBox account and the frozen 31-day candidate fit within the approved budget envelope without a paid subscription or refill?

**Determination: yes.** Observed account and candidate arithmetic reconcile; reserved units 36740 are below the 60000-unit account limit.

## Observed account (2026-11-19T03:39:03Z, stable across observation)

- API units limit: 60000
- API units remaining: 59968
- API units reset at: 2026-12-04T02:21:21Z
- Alert credits remaining: 1830
- Active subscription count: 0
- Account stable across observation.

## Frozen candidate caps

- FIDS base units ceiling: 11904
- Reserved units total: 36740
- Peak per day: 1280
- Templates: 6144
- Calendar days: 31
- Grid: `b8d552ad8c974520747454bc8c43d8c83bfa99c4cea8af0e81ae37c89b`

## Approval conditions

1. Reserved units 36740 < account limit 60000 — fits with margin.
2. No paid subscription is required or created; account remains free-tier.
3. Reset on 2026-12-04 restores quota if consumption occurs; the run is budgeted to stay within the cap.
4. No refill, upgrade, or new provider account is authorized by this document.
5. Any drift above the reserved cap or peak/day returns to STOP.

## What this does NOT approve

- No SOURCE enablement or paid GO.
- No change to the reserved units, peak/day, or calendar.
- No claim that the account will remain stable beyond the observed window; the final fresh-balance check is part of Gate 8.

`phase6PaidGo=false`.
