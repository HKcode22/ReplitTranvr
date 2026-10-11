# P14: exact NUMERIC paid scientific reconciler — no rounded false credit match

Prepared October 10 2026 PDT. **Draft-only V3.9 source code; actual paid Replit deployment and main branch unchanged. No provider calls, scientific database writes, cost, Cloudflare or user rerun authorization.**

## Failure observed in code review

Before this correction, BOTH actual paid scientific reconciliation readers in `server/lib/disruption/prepaidProbeRuntime_v39.ts` did:

- `prepaidProbeInternalCreditsV39`: `COALESCE(sum(COALESCE(delivery_attempt_cost_credits,notification_items,0)),0)::int`
- `prepaidProbeMetricsV39`: the same summed NUMERIC expression followed by `::int AS internal_credits`

PostgreSQL's `numeric::integer` converts fractional values by rounding. Therefore an invalid one-delivery credit claim of `0.5` could be returned by SQL as **1** — mathematically false **if compared to an independent provider-sent item-credit ledger of 1**. This risk is structural and not proof that actual P2G22 was caused by rounding. The earlier independent read-only PostgreSQL observer was hardened against the same issue, but the actual scientific readers still had it.

## Actual paid-source fix, safe and narrow

1. Keep source delivery attributions, duplicate admission, blob upload/readback, SQL serialization, 6+6 watchdog and 2xx ACK order unchanged.
2. Remove `::int` **only from the summed paid NUMERIC credit fields**, preserving exact PostgreSQL text returned by `pg`. Other aggregate `count(*)::int` and `sum(notification_items)::int` remain as before (not covered by this subtask).
3. Add exported `assertExactPrepaidCreditTotalV39(raw)` that accepts nonnegative integers and exact PostgreSQL decimal forms with zeros after the point (`260`, `260.0`); rejects fractional totals, scientific credit negatives, `NaN`, exponential notation, unsafe integers above `Number.MAX_SAFE_INTEGER`, `null` and missing values. Any unexpected numeric value fails closed; no zero-missing-source inference.
4. Use this function in **both** `prepaidProbeInternalCreditsV39` and `prepaidProbeMetricsV39`. If a malformed credit value appears, neither scientific ledger will silently construct an integer match.

The provider's source-billed attempt identity remains unproven and *provider 260 vs internal 259 remains UNRESOLVED*, regardless of the exact internal total. Provider vendor-specific cost schema and actual published/source parity still require independent verification.

## Evidence

[GitHub Actions #38109951091](https://github.com/HKcode22/ReplitTranvr/actions/runs/38109951091), exact tested code `b9222ba96227bf77f808531ab9b200976b05387f`: **BOTH jobs SUCCESS** — 554/554 offline regression tests in 54 suites; **63/63 actual disposable PostgreSQL16 V3.9 integration tests** and actual SIGKILL again proved UNLOGGED runtime loss. The two added actual-PG integration tests exercise (a) valid provider credit 1 through both readers, (b) mutate only the **disposable test** delivery to 0.5 and verify both exact scientific readers reject it with `PREPAID_CREDIT_TOTAL_NOT_EXACT_NONNEGATIVE_INTEGER` while preserving original SQL rows, (c) exact nonnegative integer parser rejects unsafe/out-of-contract totals. This confirms scientific reads remain read-only and no false integer credit accounting is generated.

## Remaining release blockers

- **P14 BLOCK:** externally authenticated provider original attempted send ledger and item-credit attribution, historical 260/259 gap investigation, source+receiver reconciler, possible billable attempts arriving while Replit offline or timing out in HTTP ACK; this fix does NOT resolve them.
- **P05/P06 BLOCK:** actual callback currently holds the same session row FOR UPDATE through App Storage upload/readback and physical identity SQL. Last 22-message disposable PG stress P95 connection acquire ≈10.01s, 17 sender-timely 200 vs 22 eventual internal SQL commits. The exact DB transaction/lock design cannot be modified until duplicate concurrency, 168h source durability, ambiguous SQL COMMIT, physical flight v2, blob orphan recovery and 10s sender deadline are independently tested. Raising 3s/20s SQL wait is NOT a solution.
- **P09/P10/P15/P17/P18/P19/P20** plus actual published receiver source & credit provenance, 120-minute zero-provider-cost hosted rehearsal, and authorized future 6 primary +6 evidence-gated emergency per recovered outage remain open.

**Paid YSSY NO-GO, draft unmerged, no provider credits or production changes.**
