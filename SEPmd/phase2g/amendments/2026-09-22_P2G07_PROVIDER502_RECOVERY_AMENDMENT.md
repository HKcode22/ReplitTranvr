# Phase-2G Binding Supplement — P2G07 Provider-502 Recovery

> Frozen prospectively on 2026-09-22 after P2G07 failed and before any further paid WSSS attempt.
> This supplement does not convert P2G07 into a valid scientific result and does not change the compact-6 candidate set, two-hour target, weekday 12:00 UTC ±1 hour start class, exact reconciliation rule, or 500-credit protected ceiling.

## Failure basis

P2G07 (probe 5, WSSS) is preserved as failed / UNRESOLVED with stop reason `subscription_delete_failed`. The owner log recorded provider HTTP 502 responses on the live balance read and exact subscription deletion path. The exact P2G07 provider subscription remained active after the child exited and was subsequently deleted by exact ID and verified inactive before this supplement was frozen.

This is treated as an infrastructure/provider-safety failure. P2G07 is excluded from final scoring. Payload/yield outcomes from P2G07 are not used to authorize this recovery attempt.

## Recovery authorization

Exactly one additional WSSS recovery attempt is authorized, and only with:

- a fresh runtime and fresh probe-budget-day ID;
- a fresh AUTH bound to that runtime and this amendment hash;
- the same 120-minute target;
- the same frozen WSSS time class;
- the same exact MATCH requirement;
- the same 500-credit protected exposure ceiling;
- zero active billable subscriptions and zero unresolved incidents at preflight;
- the hardened exact-ID deletion/recovery code at the new Git HEAD.

No further WSSS retry is automatically authorized after this recovery attempt.

## Safety defects corrected before recovery

1. `markSafeFailure` now persists the computed `duration_censored` value.
2. The supervisor recovery path can recover an exact owned subscription even when the owner already changed the probe row from `probing` to `failed / UNRESOLVED`.
3. The provider deletion path verifies exact subscription inactivity after transient delete failures and makes bounded exact-ID retries only.

## Binding artifact

Machine-readable artifact:

`artifacts/phase2g-compact6-p2g07-provider502-recovery-freeze-20260922.json`

Its SHA-256 must be frozen into the fresh recovery runtime and therefore into the fresh AUTH scope before launch.
