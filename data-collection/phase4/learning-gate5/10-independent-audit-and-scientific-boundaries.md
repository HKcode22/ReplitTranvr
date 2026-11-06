# 10 — Independent audit: green code, good data, and a scientific verdict are different

## The big distinction

A successfully completed GitHub Action can report that its **software executed without throwing**. That is not the same as proving every intended source was present, every flight got an on-time PRE, every later outcome was observed, all rights were satisfied and the study supports the target scientific claim.

That is why Phase 4 has a **different read-only independent audit workflow**.

## Source files

- `.github/workflows/phase4-gate5-g5a-nov06-1400z-independent-final-audit.yml` (GitHub scheduling, secrets, summary).
- `scripts/v39_phase4_gate5_g5a_nov06_1400z_independent_real_cohort_readonly_audit.ts` (actual read-only counts and HOLD conditions).
- `scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts` (`G5A_POST_AGGREGATE_AUDIT_SQL_V39`).
- `clean.flight_snapshots` and source owner/attempt/original/flight-population tables.

## Block 1 — isolated audit environment

The auditor uses its own dedicated PostgreSQL reader URL (`P4_G5_G5A_NOV07_AUDIT_DATABASE_URL`; the historical variable name is not a claim of a Nov 7 cohort). Its code starts:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15000ms';
```

`REPEATABLE READ` gives a stable view across the subsequent count queries in one transaction. `READ ONLY` protects the database from accidental writes in that transaction. The script also checks `current_user` is the expected least-privileged role, no superuser/DDL privileges and no provider secret. A self-described audit running with a production writer role is not truly independent.

## Block 2 — attest the audit workflow's identity

`requireG5AIndependentAuditContextV39` requires the reviewed repo and main ref/SHA, audited workflow name/path, correct job `audit-independent`, a scheduled or explicitly dispatched event, the time window and separate scoped reader. The audited workflow schedules four opportunities **9:12, 9:18, 9:24, 9:30 AM PST on Nov 6**. A late GitHub cron is not a fabricated earlier audit.

The audit does **not** make AeroDataBox calls and does not change data to improve scores.

## Block 3 — source ledger and original quality

`G5A_SOURCE_AUDIT_SQL_V39` counts by horizon:

```text
plannedSourceSlots
actualCommittedPhysicalReservations
originalBoundSlots
sourceBoundAndOnTimeNow
sourceLifetimeExpiredByAudit
```

**Why more than one count?** A planned slot can exist without a provider request; an attempt may be reserved but produce no usable source; the source may be bound but later pass its allowed use expiry. An auditor that counts only planned slots would falsely declare success.

The source audit independently constrains original-bound counts not to exceed committed physical attempts, and source-on-time counts not to exceed original-bound counts.

## Block 4 — independently verify PRE

`G5A_PRE_AUDIT_SQL_V39` groups persisted PRE rows by horizon and calculates:

```sql
count(*) AS persisted_pre,
count(DISTINCT s.flight_instance_id) AS unique_physical_pre,
count(*) FILTER (
  WHERE s.created_at<=s.prediction_cutoff_utc
) AS source_qualified_pre_written_before_cutoff,
count(*) FILTER (
  WHERE s.created_at>s.prediction_cutoff_utc
) AS late_pre_written_should_be_zero
```

Shortened excerpt. It also counts missing source response hashes, non-PRE states and missing selected-T version. Why is `FILTER (WHERE ...)` useful? It computes multiple conditional counts in one grouped scan, giving separate success and error denominators.

### Why another per-cutoff join is useful

A green owner can exit after **at least one** source and at least one PRE. For an expected 12-flight cohort, we want to ask *independently*: for each frozen T24 anchor, is the matching T90 record present, tied to the correct frozen T, source hash and an on-time commit? The user's extra read-only audit did precisely this: at **04:44 PST**, `reached=2` and `valid_t90_pre=2`, `due_missing_or_invalid=0`. It wasn't a final T90 complete verdict because ten cutoffs were still future.

**Beware of `lateNoBackfill`:** the live PRE writer counts cutoffs that have passed, including previously saved on-time ones. It does not independently count missing records; compare with the snapshots table.

## Block 5 — population identity and scope are separate audit dimensions

`G5A_POPULATION_AUDIT_SQL_V39` distinguishes:

- source-confirmed operating leg identities;
- conditional composite operator keys **without certified native IDs**;
- query-filtered commercial scope that remains **unknown**;
- ambiguous or marketing codeshare rows.

These are not synonyms. You can have 12 eligible operating keys and still have unresolved native-ID or charter/commercial-scope uncertainty. The audit explicitly reports conditional identity **not independently certified**.

## Block 6 — POST and the missingness denominator

The audit reuses `G5A_POST_AGGREGATE_AUDIT_SQL_V39` to read:

```text
preDenominator
asofBaselineSource
postSourceObservedByW
observedScheduleRevisionAtLeast15min
observedScheduleRevisionLess15min
missingOrCensored
```

The label counts must be consistent: observed classifications cannot exceed qualified POST observations, which cannot exceed the PRE denominator. A missing observation isn't treated as "the flight was on time".

**One methodological caution:** the current audit checks these counts/constraints, not a complete causal or statistical analysis of selection bias. A small denominator or mostly unknown outcomes can technically produce consistent counts while still being insufficient for generalizable machine learning claims.

## Block 7 — project budget and provider balance are different

The audit checks `clean.phase4_g5_fids_cohort_budget_v39`: reserved project units must not exceed 24. It explicitly says **actual provider billing still needs independent reconciliation**. A reserved unit in our DB is an intentional budget guard; it doesn't independently prove the provider charged that amount. Never claim credit certainty based only on the internal ledger.

## Block 8 — a dangerous SQL bug and what it taught us

A previous *manually authored read-only diagnostic* tried to compare PostgreSQL `uuid` directly with a `text` snapshot ID:

```sql
f.population_query_id = s.population_query_id
```

PostgreSQL refused: `operator does not exist: uuid = text`. That was an error **in the diagnostic SELECT**, not evidence that the paid source/production PRE writer failed. The repaired audit cast the fields to compatible representations for comparison. It returned 0 missing or invalid **due** T90 PRE at the measured time.

**Lesson:** distinguish **tooling failure** (your audit crashed) from **system under test failure** (the actual experiment failed). A false alarm can cause destructive restarts if this distinction is ignored.

## Block 9 — the final output and its limitations

The real independent audit output has a shape like:

```json
{
  "schema": "v39.phase4.g5a-independent-real-source-pre-post-counts.v1",
  "sourceHorizonCounts": [],
  "independentlyVerifiedPRE": [],
  "prospectiveScheduleRevisionOutcomes": [],
  "providerCalls": 0,
  "databaseWrites": 0,
  "scientificGate5Passed": false,
  "phase5FreezeAuthorized": false
}
```

Arrays are intentionally empty in this **shape illustration**, not actual audit results. The real script populates them. It writes a safe count-only summary to the GitHub Actions step summary and posts to issue #293. Its status is a **measurement**, not an automatic scientific release.

## What Gate 5 still needs before a true broad scientific acceptance

Depending on the binding Plan f.8 protocol and scope, separately reconcile provider-native semantics/rights, actual operating-leg identities and population inclusion/exclusions, arrival of POST outcomes, missed/late/unknown categories, webhook inside/outside/unresolved coverage, potential selection bias, actual-only wheels-off if claiming that original target, budget and lawful retention. A narrower **schedule-revision** operational study cannot be retroactively relabeled as "actual departure delay accuracy".

## Exercises

1. Why can a green GitHub Action coexist with 10 missing PRE snapshots?
2. What is the difference between reserved units and actual provider billing?
3. Why should an independent audit have a read-only role rather than the source writer password?
4. A flight has no qualifying POST by W. How should it count in the outcome?
5. Why does a hash-matched expired original not automatically become usable in the final audit?
