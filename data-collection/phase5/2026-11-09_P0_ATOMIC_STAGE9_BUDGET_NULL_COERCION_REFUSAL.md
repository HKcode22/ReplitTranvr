# Phase 5 P0 — refuse missing REST budget values as zero in atomic prepared source writer

**2026-11-09, owner engineering checkpoint.** This is a focused, additive production-code guard with no provider API calls, production PostgreSQL connection, paid start, or frozen budget. Phase5 scientific FREEZE remains **HOLD**, Phase6 paid GO remains **NO**.

## The real safety issue

In `server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts`, the atomic V0079 + V0082 **PREPARED** source writer checks integer fields for a frozen exact day and its seven-category charge-day reservation. The old helper used:

```ts
Number.isSafeInteger(Number(x)) && Number(x)>=min && Number(x)<=max
```

JavaScript's `Number(null)`, `Number(false)` and `Number("")` are all **zero**. That turns malformed/unreviewed missing values into accepted *zero-unit* budgets in some of the input checks. A SHA digest merely pins whatever data were supplied; it does **not** make a missing REST reserve scientifically valid. This is a fail-closed admission risk even though the source module already requires separate review hashes and signed release rights.

## Exact change

Export and use a strict `phase5Stage9ExactWholeUnit(value, min, max)` predicate in that writer, including the budget and source partition guards. It accepts either a real safe integer **number** or a **canonical decimal integer string** (`0`, `1`, `360`, etc.) for legitimate PostgreSQL protocol text. It rejects `null`, `undefined`, `false`, `true`, whitespace/empty strings, plus/minus prefixes, leading zeros, NaN/Infinity, floating-point units, exponents, hex, negative amounts, overflow and wrong bounds. No numeric data are invented or rounded.

Focused fault-injection tests: `tests/phase5_stage9_exact_rest_budget_whole_units_v39.test.ts`. The actual PG16 integration and existing owner/permissions tests remain part of CI.

## Scientific and operational boundaries

This patch **does not** establish a completed 31-day seven-category source plan, actual provider window range/latency/rate, current REST balance, lawful Contents retention/use, genuine per-flight T or all three cutoff-valid PRE, independent POST/STOP or Phase6 GO. It cannot fix missing externally witnessed release receipts with a type conversion. Existing four HUBs/five pair sets and 21 prospective adaptive days are unchanged.

The overall critical path remains the four actual exits in `2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md`; the owner study guide and earlier 24h45m boundary checkpoint are indexed at the top of `data-collection/phase5/README.md`.

No Replit Shell command is required for this code+test+checkpoints patch.
