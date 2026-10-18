# Phase 1 / Gate 0 — prove provider identity, quotas and the two financial budgets

**Original historical checkpoint: September 9, 2026.** [Complete original Gate0 input checklist](GATE0_INPUT_CHECKLIST.md) is an unchanged Git blob (`560bb06eb155e5d24a5b19c0e176afa422c4deba`) from the earlier history folder. **Do not treat its dated `NOT PASS` or old marketplace entitlement as a present-day current account measurement or paid authorization.**

## Boss/peer explanation in five points

1. **What:** Verify that the actual API key, marketplace plan, billing cycle, Alert-credit account, quotas and subscription inventory match the experiment's intended account.
2. **Why:** Buying data through the wrong team/personal key, relying on stale quota headers, or mixing unit types can run out of money or invalidate an audit without touching ML code.
3. **How:** Read-only AeroDataBox `GET /subscriptions/balance`, `GET /subscriptions/webhook`, authenticated marketplace quota/plan evidence, exact Account ID/cycle and SHA-pinned authorization; build two budgets.
4. **When:** Original checklist corrected account/plan assumptions **2026-09-09**; later source-controlled preflight hardened per actual September–October runs. Preflight must be refreshed before each *new* paid exposure.
5. **Outcome:** A real Gate0 method and later independently verified account preflight checks, **not** one permanent unlimited authorization or proof every earlier plan claim still holds.

## Two distinct billing systems — the most important concept

**Marketplace API units** pay for REST usage/refilling (tier-dependent). **Dedicated Alert credits** are billed when a notification flight item is **sent** (even if the callback is not delivered). A single airport webhook can contain multiple flight items; retries, when enabled, can cost credits. `1 credit` is not `1 HTTP request`, `1 unique physical aircraft`, or `1 completed flight`. The provider documents this in [AeroDataBox Flight Alert Guide (Jan 2026)](https://aerodatabox.com/flight-alert-api-2026/).

A scientifically and financially defensible controller tracks both:
```text
API quota remaining = verified cycle entitlement - recorded tiered REST/refill units
Alert remaining = actual starting Alert balance + approved refills - provider-billed sends
Protected residual = currently available Alert balance - approved exposure/burst allowance
```
The equalities use measurements from the **same account, same cycle and same source**, not values copied from two unrelated dashboards. Planned ceilings are caps, not claims that credits were spent or generated observations.

## What the historical Gate0 checklist fixed

| Historical pitfall | Correction | Why |
| --- | --- | --- |
| Assuming legacy 60,000-unit plan automatically applies to a new team subscription | Record actual active account's subscription, exact plan and quota; historical checklist mentions **50,000** as then-new RapidAPI Ultra planning baseline | Provider offers, grandfathering and marketplace application identity can change |
| Treating a key's `GET` response as proof another application's paid plan exists | Attach each observed entitlement to **same active API key/application/account** | Prevent unauthorized/wrong-account spend |
| Guessing a 30-day cycle by subtracting constant seconds | Capture plan/cycle and authoritative UTC reset together, resolve contradictions | Budget is period-specific |
| Calling `GET /subscriptions` or assuming a `0`-unit FIDS cost | Use `GET /subscriptions/webhook` and authoritative current FIDS tier evidence | Wrong endpoint/cost underestimates liabilities |
| Mixing marketplace quota with dedicated Alert-credit balance | Keep separately reconciled **two** ledgers, named protected floors and category subcaps | Protect both purchase capacity and observation spend |
| Treating AUTH as a standing permission | Verify exact `AUTH-YYYYMMDD` file SHA, gate, UTC validity, allowed scope, predecessor evidence, cleanup owner | Approval is **finite in scope** and cannot be reused as a universal token |

The checklist says no paid Gate0 mutations; later **Gate3 one-run** authorization is a different, exact Oct17/18 document in [Phase3](../phase3/README.md). As of Oct16/17 a user-executed **strict read-only** provider check returned PASS for at least **1,500** Alert credits, protected >=**1,000** floor after soft50, no other active CreditBased subscriptions and positive quota. This is evidence for **that inspection time only**; live Gate3 must re-read account state before any paid CREATE. No unlimited refill permission exists.

## Practical example

Suppose a project holds `2,287` Alert credits and wants a **soft** 50-credit trial while maintaining 1,000 minimum. The arithmetic `2,287 - 50 = 2,237` is above floor; **but** an asynchronous provider-send burst may exceed the 50 local trigger. A preflight `remaining >=1500` and after-intended-spend `remaining >=1000` is necessary but **not** a guarantee of a hard 50-credit maximum. No provider-enforced per-subscription credit hard cap is assumed. Account **LIST** must also prove 0 foreign active billable subscriptions, or charge attribution could be ambiguous.

The originally planned Phase6 `31 parent batch days × 1,900 = 58,900` exceeds a proposed `57,900` **run-total** maximum by 1,000. A day subcap does not mean each day will use the maximum; freeze the feasible **joint** daily and total budget rather than assert 31 independent maxima can all be spent.

## Source pointers, dates and remaining questions

- [Original Sep9 Gate0 checklist](GATE0_INPUT_CHECKLIST.md) lists each source field, budget row, SHA and stop condition; historical statements are frozen, not recomputed for October.
- [Scientific Plan](../plans/V3.9_DataCollectPlan_f.8.md) and [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) govern current versioned budgets.
- [Current Phase3 one-run playbook](../phase3/2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md) and [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) provide the exact future authorized production run and its live preflight.
- [Original provider documentation](https://aerodatabox.com/flight-alert-api-2026/) explains permanently active credit-based subscriptions, SEND charging, optional retries, GETs and DELETEs.
- The original Phase1 single checklist was moved unchanged from `docs/history/phase1/`; [Wave C2 custody evidence](../../docs/repository-maintenance/2026-10-15_WAVEC2_PHASE0_PHASE1_RELOCATION_CHECKPOINT.md).

**What was necessary:** real account/plan verification, two independent spend floors, signed-byte approval and re-reading provider account just before financial mutation. **What was excessive:** treating a one-time historical marketplace plan estimate as a permanent blocker, repeated broad audits when a bounded fresh live GET/LIST could answer the material question, or demanding zero observational missingness as a billing-control substitute. Gate0's accounting arithmetic stays exact; scientific dataset usefulness is a separate decision.

**Next:** [Phase2 scientifically defensible observed route/frame reference](../phase2/README.md), then [real airport trials](../phase2g/README.md).
