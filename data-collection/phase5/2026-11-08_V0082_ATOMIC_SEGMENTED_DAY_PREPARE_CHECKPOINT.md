# Phase 5 — Same-transaction V0079 query + V0082 source partition preparation (UNARMED)

**Engineering checkpoint, November 7 Pacific / November 8 UTC.** [PR #472](https://github.com/HKcode22/ReplitTranvr/pull/472). This checkpoint describes **source code proposed for review**; consult PR status and exact-head GitHub Actions before claiming it merged. No live production schema installation, DB inserts, actual provider usage, external rights adjudication or Phase6 GO occurred as a result of this engineering work.

Binding science: [Plan f.8 and Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md). Read [source Stage6–8 and Stage9 HOLD](2026-11-08_AMENDMENT_C_UPSTREAM_SEGMENTED_DAY_GRID_AND_STAGE9_SAFE_HOLD.md), [staged V0082 seven-category physical GET trigger](2026-11-08_SEVEN_CATEGORY_V0082_ATOMIC_SOURCE_GET_LEDGER_CHECKPOINT.md), and [SQL/JOIN lab](PHASE5_SQL_JOIN_DATABASE_LAB_FOR_READERS_20261108.md).

## Why the original Stage9 must still refuse segmented releases

The existing V0079-only Stage9 writer is proven in a real PG16 test for old 12-query and 60-query four-hour source grids. However, it does not insert the V0082 required `clean.phase5_fids_exact_query_partition_v39` row. If we merely removed its `start=parent start` check, it could commit source queries that **V0082's real physical GET trigger correctly refuses**, creating an ambiguous partial release.

The NEW, deliberately separate `server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts` accepts only Stage8's distinct v3 opt-in `reviewedSegmentedSource` and full `sourcePartitionPins`, with independently reviewed matching digests, a real saved four-airport early draw and parent calendar, and already-frozen seven REST-category budgets.

## Actual database table relationship

```text
clean.adb_phase6_authorization [one active SHA-bound manifest]
      |
clean.adb_phase6_calendar_day [one stored treatment/day]
      |                      clean.adb_sampling_draw [exactly four selected airports]
      |                              |
clean.phase5_fids_day_budget_v39 [this day's service-day budget]
      |
clean.phase5_fids_allowed_query_v39    -- one V0079 query for a future GET
      |
      +--> clean.phase5_fids_exact_query_partition_v39
                [ONE matching immutable V0082 child/range BASE/SPLIT row]

separate FROZEN PREREQUISITES (the new writer can only SELECT):
  clean.phase5_fids_seven_rest_release_v39
  clean.phase5_fids_cycle_rest_category_cap_v39       [seven categories]
  clean.phase5_fids_utc_rest_category_budget_v39      [seven each physical UTC date]
  clean.phase5_fids_utc_charge_budget_v39             [same actual UTC date]
  clean.phase5_fids_cycle_budget_v39                  [REST project cap/floor]

physical GET and actual source original remain 0: preparation is not collection
```

**Key fact:** `run_day_index` identifies the *service batch*, while `planned_charge_utc_date` identifies the physical calendar date that a future GET will consume REST units. T−24h commonly appears on the day preceding the service date. A `JOIN` combines facts; it never creates the provider response by itself.

## How the new writer refuses unsafe state

1. Re-hash the full Stage8 v3 packet from independently reviewed Stage6 source-candidate SHA and every V0079 row/partition pin. Validate SHA, query digest, unique queryKey, exact source range, future physical cutoff, true T−24h/T−6h/T−90m slot coverage and one-to-one V0079/V0082 identity.
2. Start **one SERIALIZABLE PostgreSQL transaction**, select the exact database name/effective role and require **SELECT + INSERT on only V0079 query and V0082 partition**; deny UPDATE, DELETE, budget/release INSERT, and physical-attempt INSERT, even if the login name matches. Verify the live database clock is ≥2m before earliest future scheduled GET and use a per-day transaction advisory lock.
3. Recheck the active frozen authorization, saved calendar SHA/shape/active minutes, and *actual four committed airport rows* against the signed draw SHA; independently derive every allowed child and range partition from saved parent start + reviewed provider maximum range, never accept gap-crossing or altered clock.
4. Read exact frozen V0082 manifest/source-grid/provider-range/category SHA, all seven cycle caps, all seven actual-UTC-day category plans and existing V0079 day/cycle/charge budgets. Deny over-budget plan, incomplete category, extra unreviewed category, unauthorized category, mismatch of other REST reserved units or underfunded future BASE/SPLIT counts. This writer **does not change any of those budgets**.
5. In **one database transaction**, for every reviewed future query, execute `INSERT clean.phase5_fids_allowed_query_v39`, immediately followed by its **matching** `INSERT clean.phase5_fids_exact_query_partition_v39`; only then `COMMIT`. If query N or partition N fails, everything rolls back. All rows remain `state='PREPARED'` with placeholder `github_run_id='00000'`. No HTTP attempt, original binding, PRE or POST is invented.
6. If the commit's status is ambiguous, issue an explicit HOLD and require independent **read-only** database readback; never silently retry.

## What this does NOT solve

- **No production installer or role grants.** The new writer has no GitHub release workflow, Replit timed script or production runtime invocation. It is not appropriate to run it with the normal app database role or an unrestricted owner.
- **No frozen-category-plan INPUT writer.** Before this consumer can run, a separately reviewed, scoped `V0082` release/cap/seven-category freeze preparer must have populated all 31-day category budgets and actual charge-day rows. The new writer cannot grant itself seven-category rights or infer the unobserved future adaptive airport identities.
- **Actual UTC cross-day queries remain dynamically prepared.** A charge date can contain queries from more than one future service batch. This writer checks that the published category plan is sufficient for existing plus new signed queries, but it intentionally does not assert every future airport's yet-unselected identity. The V0082 physical-GET trigger independently requires the complete exact *charge-day* query grid before it admits any paid GET; if missing, HOLD.
- **No legal, scientific, billing or provider approval.** Reviewer booleans and integrity hashes are necessary engineering inputs, not an AeroDataBox license. Authentic provider response rights (#300), first-cycle endpoint/Amendment D, genuine PRE→witness→POST evidence, source latency/provider range and independent Phase5 FREEZE remain separate release gates. Full 31 ordered batch days are future collection, not a requirement to repeat a 31-day paid Phase5 pilot.

## Tests

Dedicated [no-provider authentic disposable PostgreSQL16 test](../../tests/phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts) and [workflow](../../.github/workflows/phase5-v0082-atomic-segmented-day-pg16-no-provider.yml) create a synthetic future split parent + real B0062 selected-airport write + read-only Stage7 + v3 Stage8 signed proposal, install actual B0062/V0079/V0082 into CI PostgreSQL, then verify:
- no seventh category → no approved query/partition persists;
- effective ordinary Postgres owner role is rejected despite wide privileges;
- changing the reviewed Stage6 source SHA is rejected;
- injected second partition INSERT exception forces *whole* SERIALIZABLE transaction rollback with query=partition=attempt=original=0;
- successful exact **96 prepared V0079 rows + 96 matching V0082 partition rows**, including **48 BASE and 48 SPLIT** with 60-minute signed range partitions of the two exposed 2h children, no provider or original and `PREPARED` state;
- replay is rejected, and restricted writer cannot mutate budgets or reserve a physical GET.

**Exact-head CI must complete successfully before merge.** No synthetic success qualifies scientific PASS.

## Finish-line owner tasks after this PR

The remaining concrete work is (1) frozen review-complete seven-REST-category **input plan writer** and scoped V0082 installer/ACL, with actual external range/pricing, lawful retention and real 31-day calendar; (2) verified GitHub-only prospective SOURCE→all three PREs→independent witness→POST+STOP lineage and adopted first-cycle target; (3) separate independent Phase5 scientific FREEZE, then separate Phase6 paid GO. Do not rerun installed V0079/V0080/V0081 or four worker-login commissioners.

**At creation: Phase5 scientific FREEZE=HOLD; Phase6 paid GO=NO.**
