# Phase 2G Early-Pilot Scope Reduction — YSSY then SKBO

**Frozen prospectively:** 2026-10-02  
**Status:** design amendment only; does not authorize provider mutation  
**Base execution history:** WSSS-v2 probe 11, OMAA-v2 probe 12, MMUN-v2 probe 14  
**Machine-readable freeze:** `artifacts/phase2g-compact6-early-pilot-scope-reduction-freeze-20261002.json`

## 1. Why this amendment exists

The original compact-6 design was a project-specific screening protocol, not a literature-derived minimum.

Completed corrected-contract evidence now shows:

- WSSS-v2: scientifically valid, exactly reconciled, capacity-pass;
- OMAA-v2: scientifically valid, exactly reconciled, capacity-pass;
- MMUN-v2: scientifically valid, exactly reconciled, but below the frozen 60 rows/hour capacity gate.

Those results do not invalidate the original protocol. They do show that the marginal information value of another overwhelmingly international airport is lower for the stated early-operational-pilot objective than the value of adding a domestic/mixed operating regime.

The scope decision is explicitly **outcome-informed**. It is not represented as if it had been frozen before WSSS/OMAA/MMUN outcomes.

Selection among the still-unmeasured targets is based on attributes already frozen in the original pre-probe artifact, not on YSSY/SKBO outcomes that do not yet exist.

## 2. Frozen pre-outcome target attributes

| ICAO | Region | International share | Domestic share | Traffic metric | Route degree |
|---|---|---:|---:|---:|---:|
| YSSY | Oceania | 0.2854093990 | 0.7145906010 | 141036 | 92 |
| SKBO | South America | 0.4274890830 | 0.5725109170 | 91600 | 95 |
| LKPR | Europe | 0.9707302534 | 0.0292697466 | 67100 | 170 |

These values are copied from the immutable pre-probe reference freeze.

## 3. Revised early-pilot question

The original question:

> complete the compact-6 Stage-1 sequence and derive the original final-five anchor selection question

is superseded **for the early-pilot scope only** by:

> after validating the corrected measurement system in two international-heavy hubs and one valid capacity-failed tourist/mixed hub, obtain the highest-value missing domestic/mixed operating contrasts before beginning the broader Phase-6 collection.

This does not rewrite historical evidence and does not claim the reduced design is equivalent to the original compact-6/final-five design.

## 4. New ordered paid Stage-1 targets

The only new targets under this amendment are:

1. `YSSY`
2. `SKBO`

`LKPR` is deferred for the early-pilot anchor screen.

The selector must refuse any attempt to:
- run LKPR before the reduced scope completes;
- skip YSSY and run SKBO first;
- automatically retry a failed YSSY or SKBO attempt;
- reinterpret historical WSSS/OMAA/MMUN rows.

Each new target requires a fresh runtime, fresh budget, fresh AUTH, fresh paid preflight, and the same identity-v2/reconciliation/callback/cleanup controls.

## 5. Baseline evidence that must match exactly

The reduced-scope selector is valid only if the database still contains the expected completed baseline:

- WSSS probe 11: completed, physical-v2, MATCH, uncensored, capacity-pass;
- OMAA probe 12: completed, physical-v2, MATCH, uncensored, capacity-pass;
- MMUN probe 14: completed, physical-v2, MATCH, uncensored, capacity-fail.

If this baseline changes or cannot be matched uniquely, paid work must refuse.

## 6. Integrity controls that are NOT relaxed

This amendment changes scope, not scientific integrity.

Still required:

- `v39-physical-flight-instance-v2`;
- exact final reconciliation `MATCH`;
- external/internal equality;
- zero delivery gap;
- delivery completeness 1.0;
- zero cost/item disagreement;
- callback persistence and callback-failure monitoring;
- independent GitHub owner + watchdog;
- exact source/runtime/AUTH SHA binding;
- protected-source fingerprint checks;
- same-app callback/runtime binding;
- no active foreign billable subscriptions;
- no open incident;
- one open probe budget only;
- exact-session retained-content cleanup;
- settling finalizer;
- immutable historical evidence;
- no outcome-driven automatic reruns.

## 7. Capacity treatment

The 60 rows/hour threshold remains the Stage-1 feasibility gate.

A YSSY or SKBO run can be scientifically valid but capacity-failed, as MMUN was.

A capacity failure does not authorize a retry.

The second target remains useful as a separate missing-regime measurement; therefore a valid but capacity-failed YSSY measurement may still be followed by the one authorized SKBO attempt.

After both authorized new targets have terminal valid measurements, the reduced Stage-1 sequence is complete regardless of whether one of them fails the capacity gate. The eventual Phase-6 HUB anchor pool uses only candidates that satisfy the frozen feasibility rules.

## 8. Phase-6 implication

If both YSSY and SKBO are capacity-valid, the intended early-pilot HUB anchor set is:

`WSSS, OMAA, YSSY, SKBO`

If one is capacity-failed, the realized HUB pool is narrower and must be reported as such.

Broader geography remains a Phase-6 responsibility through the MID/REGIONAL region-balanced sampling layers. Deferring LKPR does not authorize omission of Europe from the broader Phase-6 frame.

Claims must be limited to the realized collection frame. The reduced anchor screen must not be described as globally representative.

## 9. Stage-2 implication

The original compact amendment already made Stage 2 conditional rather than automatic.

For this early-pilot scope, the old final-five confirmation question is retired. No automatic five-candidate four-hour Stage-2 program is authorized by this amendment.

Any future confirmatory anchor study requires a new prospective design and authorization.

## 10. YSSY scheduling

The original Stage-1 matching class remains unchanged:

- weekday;
- UTC slot centered at 12:00;
- eligible start tolerance ±1 hour;
- target duration 120 minutes;
- 500-credit authorization ceiling;
- 450-credit Stage-1 reservation;
- 50-credit unsettled margin;
- protected residual balance floor 1000.

For 2026-10-02 the preferred matched start is:

`2026-10-02T11:00:00Z` / `04:00 PDT`.

## 11. Refill rule

A refill is not automatically required.

The paid preflight admission rule is:

`balance >= 1000 protected floor + 450 reservation + 50 unsettled margin = 1500 credits`.

A live read-only account check must be used.

If the balance is already at least 1500, do not refill merely to create a round number.

If it is below 1500, any refill is a separate provider-billing mutation and requires its own exact authorization. The minimum required amount is computed from the live balance; no blind top-up is authorized by this amendment.

## 12. Scientific interpretation

This is an adaptive pilot-scope decision, not a confirmatory stopping rule.

The amendment is defensible only with the following disclosure:

- prior WSSS/OMAA/MMUN results informed the decision to reduce scope;
- pre-outcome frozen airport attributes determined which unmeasured contrasts were prioritized;
- all prior measurements remain unchanged;
- YSSY/SKBO acceptance criteria are frozen before their outcomes;
- final claims are narrower than the original compact-6/final-five question.

## 13. References already carried by V3.9

- NIST Engineering Statistics Handbook — populations, sampling, sample size / cost / precision considerations.
- Chen & Li (AIAA SciTech 2019) — chained flight-delay prediction and previous-aircraft/previous-flight effects.
- Zheng, Wei et al. (Aerospace 2021; SJSU ScholarWorks) — aircraft utilization and delay propagation.
- Transportation Research Part E (2024) review — flight-chain and airport-network delay-propagation perspectives.

These sources support the principles of stratification, heterogeneity, chain effects, and cost/precision tradeoffs. They do **not** prescribe the exact YSSY/SKBO choice or a universal airport count.

## 14. Authorization status

This document and its machine-readable artifact **do not authorize a paid provider action**.

A YSSY run requires:
- merged/tested source;
- exact managed Replit runtime identity;
- fresh runtime artifact;
- fresh budget day;
- fresh approved AUTH;
- sufficient live balance;
- zero active billable subscriptions;
- zero active/settling probes;
- zero open incidents;
- fresh zero-credit callback binding;
- final paid preflight `PASS_READY_FOR_PAID_STAGE1`.
