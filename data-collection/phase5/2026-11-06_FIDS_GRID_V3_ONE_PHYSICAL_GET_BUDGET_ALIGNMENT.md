# Phase5 FIDS freeze-grid V3 — exactly one paid GET per signed query

**Reason:** [V0079](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql) and the [Stage2 source bridge](../../server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts) hard-stop after **one physical GET per planned query**, while the Phase5 pure synthetic budget grid still allowed three attempts. Such a grid could falsely imply a retry that production software must refuse. Real coverage after provider 429/503 remains NULL or censored and not retried outside a new reviewed future source query.

Version `v39.phase5.fids-freeze-grid.utc-charge-day-one-get.v3` requires each frozen acquisition to have `maxAttempts=1` and `apiUnitsPerAttempt=2`. Both still require **independent live provider-pricing verification** and a signed account/rights release before payment. V1/V2 candidate schemas do not qualify as an approved active source contract.

For a synthetic 31-day × 4 slots × 3 horizons freeze:
- 372 individually signed physical FIDS queries at maximum one attempt per query.
- Conservative candidate REST cost: **744 units** (372 × 2), not the previous artificially inflated three-attempt **2,232 units**.
- The sample's other-category 500-unit envelope plus 100-unit protected floor produce **1,344 planned project units**. These values are synthetic and do not represent the user's current provider balance.
- Real charge-day allocation spans **32 UTC dates**, including Day0 before the first flight-service day. `byDay` enforces those actual dates while `byServiceDay` remains the separately tracked 31-day scientific denominator.

If a future provider contract or collector policy permits retries, it must be its own versioned signed release with new immutable physical attempt budgets; silently raising `maxAttempts` is blocked. No real sources, SQL deployments, Replit Shell commands or Phase6 start result from this change.

See separate ongoing live-source readiness [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416), rights [#300](https://github.com/HKcode22/ReplitTranvr/issues/300), Stage5 GH prearm V0080 PR #426, and final Phase5 FREEZE [#413](https://github.com/HKcode22/ReplitTranvr/issues/413).
