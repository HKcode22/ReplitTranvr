# Phase 5 — V0082 seven-category REST budgets and atomic physical SOURCE debit

**2026-11-07 PT / 2026-11-08 UTC.** Additive **staged** engineering design on PR #470, **not** live installation or Phase5 scientific FREEZE. It builds on [merged source partition fix #468](https://github.com/HKcode22/ReplitTranvr/pull/468), actual V0079/V0080 production metadata checks, and the binding [f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md).

## The real deficiency addressed

The V0079 database already reserves **two physical FIDS REST units per accepted GET** with separate cycle, parent service-day and actual UTC request-date caps. However, it stores only the *total* reserved physical units, not one physically enforced reservation for the correct **BASE** versus **SPLIT** category. The [Stage22 pure mathematical audit](2026-11-07_STAGE22_F8_SEGMENTED_FIDS_SOURCE_COVERAGE_AND_SEVEN_REST_BUDGET.md) separately enumerates seven REST categories, but pure calculations are not a live PG permission boundary. A JS-only `fids_split` flag cannot substitute for an independently frozen SQL budget.

## V0082 additive design (not installed on production)

The new separate migration [`V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql`](../../migrations/staged/V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql) deliberately does **not edit installed B0062/V0079/V0080/V0081**.

| Table | One row means |
|---|---|
| `clean.phase5_fids_seven_rest_release_v39` | A review-pinned manifest, source-grid hash, provider-range evidence hash, maximum measured range and budget review SHA |
| `clean.phase5_fids_cycle_rest_category_cap_v39` | One of seven per-category project cycle ceilings for that manifest |
| `clean.phase5_fids_utc_rest_category_budget_v39` | One of **seven required rows for each actual UTC request date**, with frozen planned units and irrevocable physical spend counter |
| `clean.phase5_fids_exact_query_partition_v39` | Each signed allowed FIDS query's exposed segment/partition identity and whether its physical GET is BASE or SPLIT |

**All seven categories**, including zero-valued rows, must be present at the actual UTC charge date: `FIDS_BASE_UNITS`, `FIDS_SPLIT_UNITS`, `FIDS_RETRY_UNIT_BUDGET`, `VALIDATION_UNIT_BUDGET`, `OUTCOME_REST_UNIT_BUDGET`, `HISTORY_BOOTSTRAP_UNIT_BUDGET`, `DIAGNOSTIC_UNIT_BUDGET`. Only first-partition BASE and later same-child range-partition SPLIT are consumed by this physical SOURCE code. A second exposed 2×2h child is **BASE**, not a split range partition. All retry/non-FIDS spending must have its own separate native category consumer and tests before full release.

## One real physical GET: atomic SQL control flow

```text
Reviewer-signed prospective calendar, provider range and 7-key UTC budget
       |
V0079 allowed exact query + saved actual calendar/day/source draw
       |
V0080 independent real GitHub-run prearm (existing production control)
       |
V0079 reserve_phase5_fids_physical_get_v39()
  BEGIN one PostgreSQL transaction
    - lock V0079 cycle/day/actual UTC charge-day totals
    - verify query/run/date/cutoff/early four selected airport rows
    - V0079 inserts unique irreversible physical attempt
      -> V0080 independent prearm trigger checks REAL run ID
      -> NEW V0082 BEFORE INSERT trigger (same SQL transaction)
           - match stored 4h / 2×2h-gap / up-to-6h parent geometry
           - match immutable segment and provider-range partition
           - require 7 complete day-category and cycle caps
           - match BASE/SPLIT budgets to COUNT of signed exact queries
           - ensure all per-category, actual UTC day and cycle floors
           - irreversibly increment exactly the correct BASE/SPLIT 2 units
  COMMIT SQL transaction
       |
Only now: separately authorized AeroDataBox FIDS HTTP GET
       |
Genuine original/source population atomic commit if actually available
```

If any V0082 check fails, PostgreSQL rolls back the V0079 reservation and **no source HTTP should run**. Missing physical GET is a source-selection/collection miss, *not* zero delay. A failed provider HTTP after a committed physical reservation **does not refund** reserved units. None of this proves flight physical identity, native selected T or lawful right to retain provider Contents.

## Exact budget invariants

For every UTC day `d`:
- `COUNT(category rows[d]) = 7`, with unique exact category keys and nonnegative reserved units.
- Sum of all **five non-FIDS** planned REST categories equals existing `phase5_fids_utc_charge_budget_v39.daily_other_reserved_units`.
- `2 × number of distinct allowed BASE queries[d] = FIDS_BASE planned units[d]` and same for SPLIT, requiring an exact immutable per-query partition row.
- BASE+SPLIT+five-other planned units ≤ that UTC day's REST ceiling. Actual physical source attempts cannot exceed the category planned units.
- Every one of the seven **cycle-category caps** must exist and be ≥ the sum of its planned UTC-day units; cycle actual/planned FIDS + protected floor + pre-reserved non-source units ≤ project REST cap (≤50,000).
- All debits are on **request-date UTC**, never inferred from service/batch-day date. Alert SEND caps are **not** inside this REST ledger.

## Verification and explicit omissions

The new dedicated [disposable PostgreSQL16 test](../../tests/phase5_v0082_seven_rest_category_real_pg16_v39.test.ts) and [no-provider workflow](../../.github/workflows/phase5-v0082-seven-rest-category-disposable-pg16.yml) install authentic B0062+V0079+V0080+V0082 into a local CI database **only**, and probe separately COMMITTED real-run V0080 prearm, missing category, missing cap, altered partition, BASE/SPLIT atomic spend, replay, and immutable cap tampering. V0081's independent PRE witness is a separate existing PG16 suite; no PRE is fabricated in this budget test. Exact-head CI results must be verified before merge; do not treat the existence of a workflow as a PASS.

**Important remaining work** (do not invent more numbered engineering stages):
1. A signed prospective real Stage21/22 **31 ordered batch-day** source calendar, actual externally measured provider query-range and timing, qualified early airport draws, rights review #300, and a proper **Stage9/V0082 seven-category freeze writer** that reconciles every charge-date/category/query before prearm.
2. A separately reviewed **V0082 production migration/ACL installer** and read-only verification against installed live B0062+V0079/V0080/V0081; schema code on GitHub is not a production installation. No reinstall of existing worker logins or older migrations.
3. Physical **non-FIDS** category reservations for retry, validation, outcome, history, diagnostics; strict Alert SEND credits accounting and safety STOP/rollback/censoring. Do not pretend the five categories are already spent/billable through this source-only trigger.
4. Authentic source→cutoff-safe three PRE snapshots→**independent** witness→POST/receiver and scientifically qualified identity / prospective primary protocol decision. Retention and normalized ML rights remain a separate legal gate.
5. Final Phase5 independent scientific FREEZE and **separate** Phase6 explicit paid GO. User paid authorization is documented, not evidence of provider licensing.

**Nonpaid engineering only. Phase5 scientific FREEZE=HOLD, Phase6 paid GO=NO.**
