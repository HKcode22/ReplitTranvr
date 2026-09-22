# Phase 2G — Canonical Index

> Purpose: one place to find the current Phase-2G scientific rules, implementation state, paid-run evidence, and historical failure reports.
>
> This index is additive. Historical files are not moved or deleted before the next paid run because path/hash changes can invalidate bindings.

## Current execution status

- Paid Stage-2 work: **NOT AUTHORIZED**
- Stage-1 design: **Compact-6**, one already-frozen candidate per macro-region
- Compact-6 candidates: **WSSS, OMAA, MMUN, LKPR, SKBO, YSSY**
- Current reconciliation rule for the next paid Stage-1 attempt: prospective v2 bounded delivery-gap rule, hash-bound through the runtime artifact
- P2G06 remains historical **failed/MISMATCH** and is never retroactively converted to PASS
- Next paid run must use a fresh runtime, fresh budget day, fresh AUTH, fresh preflight, and the exact final Git SHA

## Binding / superseding methodology

1. Main Plan:
   - `SEPmd/V3.9_DataCollectPlan_f.8.md`
2. Main Implementation Log:
   - `SEPmd/V3.9_IMPLEMENTATION_LOG.md`
3. Phase-2G compact-6 + reconciliation amendment:
   - `SEPmd/PHASE2G/V3.9_PHASE2G_COMPACT6_RECONCILIATION_AMENDMENT_20260922.md`
4. Original immutable preprobe:
   - `artifacts/preprobe-reference-freeze-record.json`
   - file SHA-256: `b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870`
5. Prospective compact-6 reconciliation v2 freeze:
   - `artifacts/phase2g-compact6-reconciliation-v2-freeze-20260922.json`

## P2G06 WSSS evidence

Canonical detailed report:
- `SEPmd/V3.9_PHASE2G_P2G06_PLAIN_ENGLISH_FAILURE_REPORT_AND_COMPACT6_DECISION_20260921.md`

Key reconstructed facts:
- runtime stayed alive for the full approximate two-hour exposure
- 36 webhook payloads persisted
- 282,218 raw bytes persisted
- 219 flight items reconstructed
- 219 explicit provider `costCredits`
- every received payload had `costCredits == flight item count`
- provider external spend: 220 credits
- exact delivery/accounting gap: 1 credit
- P2G06 remains excluded from final scoring

Read-only reconstruction tool:
- `scripts/v39_phase2g_reconstruct_prepaid_session_v39.ts`

## Current code hardening

- durable append-only reconciliation evidence:
  - `migrations/0058_phase2g_reconciliation_evidence.sql`
- callback/request aggregate instrumentation:
  - `server/lib/disruption/prepaidProbeRuntime_v39.ts`
- prepaid live-window reconciliation:
  - `server/lib/disruption/prepaidProbeWindow_v39.ts`
- Stage-1 aggregate scoring:
  - `server/lib/disruption/probeExecutionPrepaid_v39.ts`
- compact-6 amendment loader:
  - `server/lib/disruption/phase2Compact6_v39.ts`
- Stage-1 sequencing owner:
  - `scripts/v39_probe_stage1_owner_v39.ts`
- regression tests:
  - `tests/phase2g_compact6_reconciliation_v39.test.ts`
  - plus the existing Phase-2G survival, cleanup, rerun-policy, guard-band and soak suites

## Compact-6 scientific selection

The six are not chosen from observed Stage-1 yield.

They are one candidate from each already-frozen macro-region, preserving the predeclared WSSS/OMAA references:

| Region | ICAO |
|---|---|
| Asia-Pacific | WSSS |
| Gulf/Africa | OMAA |
| North America | MMUN |
| Europe | LKPR |
| South America | SKBO |
| Oceania | YSSY |

The original 12-airport preprobe remains immutable provenance. The compact-6 artifact is a deterministic execution subset bound back to that original freeze.

## Reconciliation v2 rule — prospective only

For future anchor probes:

- settled external provider spend is the cost denominator;
- exact match remains `MATCH`;
- a positive gap is accepted as `DELIVERY_GAP` only when:
  - the gap is at most 1 billed flight item;
  - delivery completeness is at least 99%;
  - no received payload has `costCredits != flight item count`;
  - internal credits never exceed external credits;
  - settlement resolves;
- safety smoke/canary remains exact-match;
- observed metrics are never inflated to compensate for the missing item;
- the unique-flight upper bound is widened by at most the missing billed-item count;
- P2G06 is not retroactively rescored.

## Stage 2

Compact design does **not** automatically schedule five additional four-hour confirmations.

Conditional confirmation is triggered only by the predeclared amendment conditions, including:
- fewer than five valid compact Stage-1 candidates;
- capacity failure;
- identity-bound top-five membership not invariant;
- both WSSS and OMAA invalid;
- fifth-versus-sixth membership not robust.

If no trigger occurs, the result is labeled:
**compact Stage-1-selected anchor pool**

and not the original V3.9 Stage-2-confirmed pool.

## Operational rule

Do not use this index alone to launch anything.

Every paid launch still requires:
1. final tested Git HEAD,
2. applied migrations,
3. managed runtime health on that HEAD,
4. synthetic callback PASS,
5. zero blocking incidents,
6. zero active foreign billable subscriptions,
7. fresh runtime/budget artifact,
8. fresh AUTH with exact amendment hash,
9. fresh paid preflight `PASS_READY_FOR_PAID_STAGE1`,
10. single launch only.
