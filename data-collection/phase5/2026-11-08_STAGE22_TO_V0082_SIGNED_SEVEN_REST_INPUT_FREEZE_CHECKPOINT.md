# Phase 5 — Stage22 → V0082 seven-category REST input budget freeze (INERT)

**Engineering date:** November 7 Pacific / November 8 UTC 2026. Binding source: [Plan f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md). [PR #473](https://github.com/HKcode22/ReplitTranvr/pull/473) must pass exact-head CI before merge. **This is not a production migration, real future calendar, AeroDataBox license, 31-day data collection or scientific FREEZE.**

## What the previous two integration PRs were still missing

PR #470 staged V0082 four immutable REST budget/category/partition tables plus the real physical-GET transaction trigger. PR #471 made the source planner understand all exposed 4h/2×2h/6h provider-range partitions. PR #472 now writes **matching** V0079 PREPARED source queries + V0082 child/range partitions **atomically**, but deliberately requires signed **existing** V0082 seven-category budget rows.

The missing **INPUT-freezer** is implemented here, without inventing future adaptive-selected airports or assuming all historical AeroDataBox permissions transfer to Phase 5.

## Pure scientific computation: not merely trusting a PASS flag

`server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs` takes the **complete Stage22 source audit input**: a 31 ordered batch-day structurally audited Stage21 crossover calendar, all actual planned range-partition source GETs and their UTC dates, independently reviewed (not measured by this code) provider maximum request range, conservative latency/staleness/cutoff margins, and exactly seven categories per physical UTC charge-day.

It SHA-checks the entire input, **re-runs** `auditP5F8SegmentedSourceCoverage()` (rather than taking its result at face value), and admits only `CANDIDATE_EXPOSED_SEGMENTS_TEMPORALLY_COVERED_NOT_RELEASE` with no coverage gaps, 31 days, two physical REST units per planned FIDS GET, separate seven cycle caps and all physical UTC charge-date ledgers. It validates 0–1900 per UTC day, 0–50,000 cycle category caps and protected project REST floor; includes all 31 saved calendar day geometries in the immutable category hash. It returns a `reviewedCategoryBudgetSha256` **candidate** that requires an independent signed/reviewed expected hash before any DB write. This SHA proves integrity of bytes, **not actual provider measured rights or account limits**.

**Seven REST categories**: `FIDS_BASE_UNITS`, `FIDS_SPLIT_UNITS`, `FIDS_RETRY_UNIT_BUDGET`, `VALIDATION_UNIT_BUDGET`, `OUTCOME_REST_UNIT_BUDGET`, `HISTORY_BOOTSTRAP_UNIT_BUDGET`, `DIAGNOSTIC_UNIT_BUDGET`. The source BASE and SPLIT budgets exactly count planned physical GETs × the reviewed pricing. The other five categories require independent non-FIDS spenders/permissions downstream and cannot be treated as physically consumed here. **Provider Alert SEND credits are completely separate**, with a 1,900-credit per-parent shared cap for 2×2h children and independent unsettled-credit margins.

## Exact SQL write protocol

`server/lib/disruption/phase5V0082SevenCategoryBudgetFreezeWriter_v39.ts` first verifies the approved independent category hash, complete immutable 31-day category packet and expected restricted owner role. In one `BEGIN ISOLATION LEVEL SERIALIZABLE` transaction it:

1. Requires an actual PostgreSQL 16 primary `neondb`, matching **separate** `phase5_fids_budget_freeze_...` current role, read/write DB clock, a per-manifest advisory transaction lock, **only** SELECT rights on frozen B0062/V0079 ledgers and **INSERT** rights on V0082's *release, cycle-category cap, UTC-day-category* tables. It explicitly refuses UPDATE/DELETE/TRUNCATE, SOURCE query/partition INSERT, physical attempt/flight raw/flight PRE access, and other broad permissions. Its database role must be installed separately; it is **not** the already commissioned SOURCE/PREPARE/PRE/WITNESS worker login.
2. Checks the saved **B0062 authorization** SHA and active/nonrevoked state, and reads all **31 actual PostgreSQL calendar days** with matching stored `window_shape`, `active_duration_minutes`, `utc_slot`, UTC start, `calendar_hash`, `config_hash`, `frame_hash`. All 31 parent starts must be prospective.
3. Checks that the **existing V0079 cycle budget** has the *same* REST cycle ceiling, aggregate other-category reservation, protected floor and **0 physical spend**. Every V0079 `utc_charge_budget` physical calendar date and per-day ceiling/other-category envelope must exactly match the Stage22-derived candidate, with 0 spent. It refuses existing published source queries.
4. Checks there are **no existing/partial V0082** input records (idempotency rejects, no destructive overwrite). Executes exactly one release INSERT, one 7-row cycle cap INSERT and one `7×physicalChargeDates` batch budget INSERT, **all in the same SQL transaction**. Any SQL exception (including at the last category) rolls back release and caps too. It then COMMITs and returns an explicit **NO-GET/NO-PRE/NO-PHASE6** statement.
5. If a COMMIT response is ambiguous, quarantines; only independent read-only audit can resolve it. No blind retry or materialization of historical missed cutoffs.

### Teaching: normalized relational tables

```text
V0079 cycle budget (one manifest)
    +-- actual charge-day budgets (one per UTC calendar date)
           +-- V0082 seven category budget (7 rows per real UTC date)

V0082 reviewed release (one manifest)
    +-- V0082 category cycle caps (exactly 7 rows)

B0062 authorization (manifest/calendar hashes)
    +-- B0062 31 parent calendar days (shape/UTC slot)
```

The `manifest_sha256` is a *foreign-key join identity*, not itself the license. `charge_day_utc` is when a later paid HTTP request would consume provider units (often Day−1 for T−24h), not the service `run_day_index`. `SERIALIZABLE` is PostgreSQL's strongest transaction isolation mode; the database should behave as if committed transactions ran one at a time. A `PRIMARY KEY(manifest_sha256,charge_day_utc,category)` prohibits duplicates for the same charge date and budget category. The V0082 UPDATE/DELETE trigger prevents post-hoc retuning of published budget caps; an injected exception proves entire transaction rollback.

## Test-only results are not a scientific outcome

`tests/helpers/phase5_v0082_full31_budget_candidate_fixture_v39.mjs` creates **synthetic** 31-day f.8 geometry (26 four-hour, 3 split, 2 six-hour), five matched pairs, hypothetical 240-minute provider range, 1,968 GETs / 3,936 FIDS units, and also assigns **nonzero** sample spend reservations to all five non-FIDS categories. Its airport identities and all prices/rights are **fabricated solely for CI**, never production account conclusions.

`tests/phase5_v0082_seven_rest_freeze_owner_pg16_v39.test.ts` uses real disposable PostgreSQL 16 boot B0062 + staged V0079 + staged V0082 (NO installed production SQL). Proves mathematical source coverage, read-only response, signed hash tamper refusal, admin/privilege escalation denial, mid-write late-category exception `ROLLBACK`, successful full input release/caps/day budgets, no PRE/no physical attempts, and replay denial. Dedicated [CI workflow](../../.github/workflows/phase5-v0082-seven-rest-full31-input-freeze-pg16-no-provider.yml) never exposes provider keys or production DB. **Only report completed GitHub CI checks after verifying exact current PR head.**

## Still open: do not silently infer a paid release

- **Actual signed 31 ordered batch-day airport/calendar plan** (f.8 crossover, region, shape, slot, 24h previous END to next START washout, protected train/validation/test) and *real measured* max AeroDataBox GET range, pricing, source refresh latency. The synthetic fixture is not that plan. Future truly adaptive selected airport draws have to be committed prospectively; a plan cannot manufacture them.
- **Production V0082 migration installer/role grant** with exact privileged-once, separately reviewed ACL; this PR intentionally contains no production installer and cannot be run by existing four previously commissioned worker roles.
- **Non-FIDS five category actual spenders**, separate Alert SEND credit ledger, full charged-UTC-date SOURCE completeness before a single paid GET. Budgets are input promises, not observed charges.
- **AeroDataBox lawful normalized ML / long-term row-level cache / backup retention** (#300), provider-selected per-flight T, native operational-leg identity, three witnessed cutoff-safe PRE snapshots and independent POST, explicit adopted primary prediction target/Amendment D, assessed missingness/selection bias.
- Independent **Phase5 scientific FREEZE**, followed by a **separate Phase6 paid GO**. User has authorized expenses, but that does not certify provider rights or the missing science.

**Phase5 engineering task complete only when exact-head CI proves it. Phase5 scientific FREEZE=HOLD; Phase6 paid GO=NO.** Historical V0079/V0080/V0081 schema and four worker commissioners are not re-run by this task.
