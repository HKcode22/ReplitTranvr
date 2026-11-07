# Phase5 source grid V2 — budget actual UTC paid GET date, not service day

The original [31-day freeze grid](../../server/lib/disruption/phase5FidsFreezeGridAdmission_v39.ts) V1 counted each planned FIDS GET and its retries against its **service run day**. T−24h source GETs are commonly made on the previous UTC calendar date, so that could undercount the real daily 1,900-unit project limit. It was synthetic planning software, not installed source permission, but could have produced misleading green cost arithmetic.

**V2** changes the strict input schema to `v39.phase5.fids-freeze-grid.utc-charge-day.v2` and requires each immutable acquisition to include BOTH:
- `runDayIndex` / `budgetDayUtc` = **service day / observational scientific stratum** (31 consecutive dates).
- `physicalChargeDayUtc` = **UTC calendar date of the scheduled physical GET**, which must equal `scheduledRequestUtc`'s UTC day. Never substitute the service date when T24 occurs before it.

`otherCategoryReservedPerDay` now explicitly means every **actual UTC provider charge date**, including Day0 (e.g., Dec31 for Jan1 service) and any extra non-FIDS-only category dates in the bounded collection perimeter. Missing a GET charge date returns HOLD; unknown other-category costs cannot silently default to zero. `byServiceDay` now provides analysis attribution only, while `byDay` provides **actual UTC spending** including FIDS physical max attempts, reserved other categories and the 1900/day ceiling. The same monthly total+protected floor cap remains independently enforced. Input-order-independent grid hashing includes actual UTC charges.

The 31-day synthetic test uses 31 **service** days but **32 actual UTC charge days**. Its T24 Day1 source is physically charged on Day0, and every UTC-date budget is recomputed. New negative tests refuse faked service-date charges, omitted Day0 reserves and real-UTC overspending even when service-day groupings appear legitimate.

**Limits:** This remains a *pure offline candidate planner*, not a verified provider request, correct account billing/rate, adaptive 31-day airport selection, signed release, legal rights, or Phase6 paid GO. A real dynamically sampled REGIONAL airport is selected before each day's T24 source, not fixed across 31 future days, so the full actual charge plan must be revalidated per-day under its immutable selected as-of draw, with previously approved monthly category reserves. The staged **V0079 actual UTC charge ledger correction** lives in parallel PR #424; both must pass CI before any release. Actual provider charging might apply on a different accounting timezone than the project's UTC safety clock; verify and conservatively reserve accordingly.

No provider calls, production SQL writes, receiver deployments or Replit Shell steps arise from this V2 documentation.
