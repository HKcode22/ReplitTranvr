# Phase 5 Stage 13 — bounded multi-refresh V0079 PREPARED query preparation

**Status:** source timing candidate → DB-only prepared-row engineering, **not** an armed FIDS owner, a provider original, per-flight durable PRE, a source-use license or Phase 6 launch. Implemented as an explicit new version **while retaining Stage 6 v1 exact-12 compatibility**, with no source writes, provider requests, receiver deployment, production migration or historical log changes.

Binding references: [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [Stage 11 full 31-day coverage model](2026-11-07_STAGE11_CONTINUOUS_31DAY_PRE_REFRESH_COVERAGE_OFFLINE.md), [Stage 12 source-member audit](2026-11-07_STAGE12_TRUE_PRE_SOURCE_LINEAGE_QA_DENOMINATOR_FIX.md), [#416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## Defect repaired

Previously the Stage 6 source grid, Stage 8 PREPARED proposals, and Stage 9 DB-only writer all required `4 airport slots × 3 horizons = exactly 12` provider queries/day. That is a candidate list, **not** full four-hour source-refresh coverage under a per-flight maximum staleness requirement. Stage 11 independently found that one GET/group leaves a gap for later flight prediction cutoffs under reasonable *hypothetical* parameters.

Stage 13 extends the same Stage 6 → Stage 7 read-only DB → Stage 8 deterministic source frame/UTC budget → Stage 9 genuine restricted transaction path to a **second explicit multi-refresh v2 contract**. It requires **more than 12 and no more than 384** queries/day, with at least one and at most 32 per slot/horizon group and unique query keys, source frame/digests and real physical UTC charge days. Each refresh must still be tied to the earlier immutable four-airport adaptive draw, be scheduled **after** that draw, use one physical GET per query and the independently reviewed provisional two-API-unit per-query contract. No late drawing, backfilling or silent duplicate GETs are allowed.

## Mathematical time coverage

V2 requires separately reviewed `maxPopulationStalenessSeconds`, `maxSchedulerSlipSeconds`, `minimumPreCommitMarginSeconds`, the per-query `maxResponseAndPersistSeconds`, an independently reviewed 31-day coverage grid SHA, and a verified provider maximum query-range parameter (must at least span the requested four hours). A hash is a consistency pin, not evidence that someone verified these real-world values. For every committed selected airport and T−24h/T−6h/T−90m horizon, source observations are a conservative interval covering potential flight-specific prediction cutoffs:

```
[request_utc + maximum_scheduler_slip + maximum_response_persist
             + minimum_PRE_commit_margin,
 request_utc + maximum_population_staleness]
```

The union must cover the **entire four-hour flight-cutoff interval**, and each request's associated cutoff must lie within that horizon's frozen service window. Missing intervals, duplicate query keys, query-count breaches, changed source frames, unfrozen staleness or request times are refused before any DB write. Neither this timing check nor the 31-day coverage check implies that the provider actually returned those flights, native selected T semantics, complete population records, or that the records may lawfully be retained.

## Real database and expense accounting

Stage 8 creates an exact record-level query digest and a dynamic total spend cap at `2 × N` potential API units; Stage 9 verifies the complete independent signed packet, real frozen four-airport draw, per-query digest, all 12 horizon groups and unique keys, real UTC charge-day ledgers, separate other-category reservations, daily max ≤1,900, cycle max ≤50,000 and protected floor. It inserts **exactly N PREPARED rows in one SERIALIZABLE transaction under the least-privilege SELECT+INSERT-only role**; a duplicate run cannot silently append, and no provider GET is performed.

The focused offline tests verify that the earlier 12-query mode still returns 12 PREPARED rows unchanged, while a *synthetic* five-refresh/50-minute-per-group v2 template yields `12×5=60` prepared queries / **120 provisional API units** for that one day. Two isolated **authentic B0062+staged V0079 PostgreSQL16** jobs exercise the existing 12-query and new 60-query transaction and replay refusal. These tests create an inert, disposable database; only a separately independently approved release can install the production schema.

## Follow-ons

- Independent real provider range/latency/staleness measurement, actual adaptive 31-day calendar and full seven-category REST+Alert budget—not hypothetical five-per-group or a static airport template.
- Independent account-specific ML/source-use, normalized record, backup/retention rights [#300](https://github.com/HKcode22/ReplitTranvr/issues/300). Current provider balance, a rights-review SHA or user permission to spend is **not** evidence of this.
- Exact verified production V0079/V0080 installer and GitHub scheduled owner: original body capture before 2xx, irreversible physical GET ledger bound to a real GitHub run, original normalized membership, timely flight-level native T/physical operating-leg PRE writer, POST/Alert/AIRBORNE/censoring/denominator audit.
- Exact reviewed published receiver and independent final Phase 5 FREEZE with separate Phase 6 GO.

**Disposition:** Stage 13 is a correctly bounded **preparation capability**, not completion of the prospective experiment, source rights or Phase 5 scientific acceptance.
