# Phase 5 — Final freeze, collection readiness and data visibility

**Purpose:** freeze the actual one-month operating study (sampling, FIDS producer→three PRE horizons, provider Alerts, operating-flight identities, rights/expiry, budgets, safety, missingness, monitoring and exact launch calendar). **This is NOT the place to redo historical YSSY incidents or re-run Phase 4 Gate5 tests.**

## Latest operational checkpoint — November 7, 2026

**Start here after a lost chat:** [Live Replit production database findings, AeroDataBox legacy account evidence, Stages1–16 code map and technical study guide](2026-11-07_LIVE_PRODUCTION_DB_AUDIT_AERODATABOX_ACCOUNT_AND_TECHNICAL_STUDY_CHECKPOINT.md). Observed: production PostgreSQL native COMMIT tracking **OFF**; V0079 source ledger tables **not installed or not visible**; core snapshot/FIDS/population tables exist; **0 provider/DB writes** by audit. Do not treat green PG16 CI or source query preparation as live production. **Owner's grandfathered Team Ultra account, Sept10 60k entitlement, Nov7 59,968 remaining and 1,830 Alert credits are already documented: do not repeatedly ask.** Phase5 final FREEZE HOLD / Phase6 NO-GO.

## Current implementation recovery — production evidence and follow-ons

- [Stage17 genuine PostgreSQL two-transaction T24 post-COMMIT witness (native tracking OFF)](2026-11-07_STAGE17_INDEPENDENT_T24_TWO_COMMIT_WITNESS_WITH_TRACKING_OFF.md) — **real disposable PG16 CI PASS**; V0081 staged, no live installation or T6/T90 activation.
- [Stage16b read-only PostgreSQL catalog/role check](2026-11-07_STAGE16B_V0079_PRODUCTION_CATALOG_ROLE_VISIBILITY.md) — distinguishes physically absent V0079 ledger tables from tables invisible to the Replit role. No source rows, provider calls or DDL.
- [Latest owner-audited account and engineering checkpoint](2026-11-07_LIVE_PRODUCTION_DB_AUDIT_AERODATABOX_ACCOUNT_AND_TECHNICAL_STUDY_CHECKPOINT.md) — **do not re-ask historical Ultra identity, 60k original quota or Nov7 balance**.

## November 7 live V0079 installation cause (Stage16b → Stage18)

Owner's **2026-11-07T12:18:48.521Z** source-pinned Stage16b PostgreSQL `pg_catalog` audit demonstrated **0/6 V0079 tables physically present in `neondb.clean`**, with correct DB, `READ ONLY` and schema USAGE verified. This is a missing migration, **not** a mere ACL invisibility issue. [Stage18 read-only baseline + V0079→V0080→V0081 dependency audit](2026-11-07_STAGE18_PRODUCTION_B0062_AND_V0079_V0081_INSTALL_DEPENDENCY_AUDIT.md) provides the next owner-check and disposable PG16 migration-order CI; it is **not an approved production installer**, an account-specific retention grant or Phase6 GO. Exact user evidence is also preserved in [#416](https://github.com/HKcode22/ReplitTranvr/issues/416). Keep f.8, Amendment B and catalog-locked implementation log unchanged. Phase5 FREEZE HOLD.

## Stage19 — all-or-none schema commissioning tested only in disposable PostgreSQL16

The source-pinned **Stage18 owner production audit 2026-11-07 12:36:14Z** confirmed all required five B0062 baseline tables/columns, `clean` schema CREATE privilege, and **all eight staged V0079/V0080/V0081 tables physically absent**. [Stage19 atomic three-migration and forced rollback/disposable CI checkpoint](2026-11-07_STAGE19_ATOMIC_INERT_V0079_V0081_SCHEMA_COMMISSIONING_CI.md) is a new **CI-only commissioning fixture**, not permission to install on production or use AeroDataBox flight Contents. Its production path is deliberately disabled. The owner should not run the Stage19 fixture in Replit. Phase5 FREEZE HOLD, Phase6 NO-GO. The immutable f.8 and implementation log remain untouched.

## Stage21 — binding f.8 31-batch-day crossover shape guard

[Stage21 f.8 crossover candidate hard-gate](2026-11-07_STAGE21_F8_31_BATCH_DAY_CROSSOVER_STRUCTURAL_HARD_GATE.md) addresses an uncovered scientific/calendar mismatch: the older Stage11 evaluator models **31 consecutive UTC dates / four-hour windows**, while signed f.8 requires **31 ordered batch-days with 26 standard 4h, 3 split 2×2h, 2 up-to-6h, five seed-randomized matched pairs and ≥24h end→start same-airport washout**. Stage21 checks those exact structural constraints, UTC/role/region/partition and provisional Alert/REST budgets without provider calls; its Stage21b finite-candidate SAT solver chooses and balances valid proposals from an input SHA-frozen pool, with explicit UNSAT/UNKNOWN distinctions and §8.8 lexical tie-break. **It still does not generate the independently verified real candidate universe or a finalized experimental calendar**; actual source/range/retention/operating-leg certifications and Phase5 FREEZE remain HOLD.

## Stage22 — revised f.8 math for actual split/6-hour source coverage

[Stage22 source-cutoff and seven REST category ledger](2026-11-07_STAGE22_F8_SEGMENTED_FIDS_SOURCE_COVERAGE_AND_SEVEN_REST_BUDGET.md) implements the scientifically necessary split-window fix to our own Plan f.8: every **exposed** 2×2h segment (excluding the gap), every up-to-6h provider-range partition, all four airport slots × all three PRE horizons, the exact source-age/latency feasibility interval, and every physical UTC GET charge-day must be covered and budgeted. The [versioned Plan f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) documents the rationale, formulas and migration from Stage11's limited hypothetical 31-consecutive-day/4h model. This changes our **prospective method**, not historic observations. Both documents explain why an offline SAT result is **not** live source rights, PRE evidence or final Phase5 FREEZE. Study guide and exact code index below.

## Phase 5 source of truth
- [Stage 10 authentic V0079 bound-source → per-flight as-of PRE candidate readback (offline)](2026-11-07_STAGE10_V0079_BOUND_FLIGHT_PRE_ASOF_READBACK_OFFLINE.md) — source-to-member/cutoff/retime/staleness test coverage only; **no live PRE writer or source-use/Phase6 release**.
- [Dated November 7 Phase5 engineering handoff](2026-11-07_IMPLEMENTATION_HANDOFF_SEPARATE_FROM_CATALOG_LOCKED_LOG.md) — mutable status and exact-code checkpoints. The original [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) remains source-catalog-locked research provenance.
- [PR #428: offline Phase5 clock/grid alignment](https://github.com/HKcode22/ReplitTranvr/pull/428) — 5/5 reviewed CI PASS but **closed unmerged**; do not treat as deployed code.
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
