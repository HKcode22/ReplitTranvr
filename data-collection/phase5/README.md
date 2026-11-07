# Phase 5 — Final freeze, collection readiness and data visibility

**Purpose:** freeze the actual one-month operating study (sampling, FIDS producer→three PRE horizons, provider Alerts, operating-flight identities, rights/expiry, budgets, safety, missingness, monitoring and exact launch calendar). **This is NOT the place to redo historical YSSY incidents or re-run Phase 4 Gate5 tests.**

## Phase 5 source of truth
- [Dated Nov 7 Phase5 merged-code and release-HOLD handoff in Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) — authoritative chronology and current exact-code checkpoint; check latest main/PR before acting.
- [Phase5 Stage1/Stage2 source-grid executable-clock alignment proposal (PR #428)](https://github.com/HKcode22/ReplitTranvr/pull/428) — draft until all exact-head tests pass; no paid scheduling.
- [Phase5 freeze acceptance checklist and versioned 31-day QA plan](2026-11-06_PHASE5_FREEZE_CHECKLIST_AND_VERSIONED_COLLECTION_QA.md)
- [Original V3.9 f.8 collection plan](../plans/V3.9_DataCollectPlan_f.8.md), [binding scientific Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md)
- [Safe read-only Phase5 table/column and recent row-presence audit](audits/phase5-phase6-column-observability-readonly.mjs) — schema metadata, not a deployed user dashboard and not permission to export expired provider Content.
- [Phase5 readiness issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413), earlier [freeze handoff issue #344](https://github.com/HKcode22/ReplitTranvr/issues/344), [source-use/retention #300](https://github.com/HKcode22/ReplitTranvr/issues/300)

## Clear phase boundaries

| Phase | Owner and decision |
| --- | --- |
| **Phase 2G — YSSY** | [YSSY delivery-gap and possible tiny paid recheck](../phase2g/2026-11-06_YSSY_DELIVERY_GAP_RECHECK_MICROPROBE_DECISION.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28). No old incident is auto-closed or paid test auto-started. |
| **Phase 4 — Gate5** | [Original scientific validation and smallest useful residual test](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md), [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293). Historical G5-R readiness PASS, Nov6 FIDS schedule-revision pilot COMPLETE WITH LIMITATIONS, original full scientific Gate5 **HOLD**. |
| **Phase 5 — HERE** | Freeze lawful sources/31-day design, cutoff-safe FIDS owner and provider Alert connection, source limits, protected real-data view, budget/STOP/governance. **Nonpaid implementation GO**, **final FREEZE not yet passed**. |
| **Phase 6** | **Not yet started/authorized.** Daily monitored versioned collection once independently released. Each day can repair non-scientific reliability defects prospectively without changing original cutoffs, meaning of labels, or eligibility silently. |
| **Phase 7** | Training and evaluation using as-of, legally retained, target-specific labeled data, disjoint physical operating legs/time holdouts and measured missingness. |

## Facts fixed by the November 6–7 audits
- Verified G5A source: 9 PRE originals, 36 on-time PRE, 3 POST originals and 36 repeated schedule-revision comparisons over 12 conditional identity keys. **Not** actual-only runway delay, certified operating legs or a valid complete source/Alert/AIRBORNE funnel.
- Owner's all-time read-only SQL inventory: 1,574 clean.flight_population observation rows; 0 generic webhook/airborne/outcome rows on this DB. That inventory did **not** inspect the separate historical Phase2G UNLOGGED prepaid tables or Replit App Storage custody references.
- [PR #412](https://github.com/HKcode22/ReplitTranvr/pull/412) **merged after five exact-head CI checks**, protects future Phase6 subscription CREATE from secretless callback URLs. This is a source-code improvement; a live published Replit receiver matching that release is not yet independently verified.
- No new paid provider calls, database writes, expiry extension, deployment, or Phase6 authorization were made by this Phase5 documentation work.

**Phase5 next implementation:** build the actual 31-day GitHub-only FIDS→PRE→POST schedule and its independent audit, source/operating-leg crosswalk, per-provider rights classification, receiver deployment verification, a secure real-column/row-quality explorer and first-day bounded STOP logic. Avoid repetition of one-hour G5A source-only experiments.
