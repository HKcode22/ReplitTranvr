# Phase 5 — Amendment C upstream Stage6→7→8 segmented day grid (and explicit Stage9 HOLD)

**Engineering checkpoint: 2026-11-07 Pacific / 2026-11-08 UTC.** Code on [PR #471](https://github.com/HKcode22/ReplitTranvr/pull/471), check final merged status and exact HEAD in GitHub. Binding protocol: [f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md). **No paid AeroDataBox call, production database mutation, deployment, real selected future airport draw, or provider-range/rights certification.**

## Why this is needed after V0082 merged

[PR #468](https://github.com/HKcode22/ReplitTranvr/pull/468) made a physically reserved SOURCE GET admit canonical subwindows. [PR #470](https://github.com/HKcode22/ReplitTranvr/pull/470) staged immutable V0082 REST BASE/SPLIT budget protection. **But the upstream Stage6 dynamic day builder and Stage9 PREPARED query writer still assumed every query starts at its parent day start and ends by +4h.** For the binding 31-day mix `26×4h, 3×2×2h, 2×up-to-6h`, that would silently make the second exposed child and six-hour later source partition unrunnable, even though Stage22 pure mathematical audit showed hypothetical coverage.

This PR addresses the **upstream pure-source-candidate side** and explicitly blocks its unsupported downstream preparation path until independently reviewed atomic V0079+V0082 query/partition writing exists. Never claim the whole pipeline is ready merely because a pure source grid passes.

## What the new opt-in source schema means

Old `P5_DYNAMIC_DAY_GRID_SCHEMA` v1 and `P5_DYNAMIC_DAY_MULTI_GRID_SCHEMA` v2 are preserved for previous four-hour 12-query / legacy multi-refresh engineering tests. The **new v3 schema** `P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA` adds a reviewed source contract:

- `windowShape`: `4h`, `2x2h`, or `up-to-6h`. It is not independently verified simply because the object says so.
- `verifiedProviderMaxRangeMinutes`: maximum allowed length of one physical provider FIDS request. **Must have independently reviewed real-provider/account evidence before paid use.** An illustrative 120/240-minute unit-test value is not the user's measured entitlement.
- `reviewedProviderRangeEvidenceSha256`: immutable evidence digest (integrity only; no legal or scientific permission).
- `reviewed31DayCoverageGridSha256` and latency/staleness/margin: frozen scientific source-timing assumptions from previous Stage22/Plan f.8 coverage; not actual persisted source availability.

The pure v3 builder derives **canonical** half-open `[start,end)` partitions:

| Parent shape | Exposed child segments relative to parent start | The forbidden interval |
|---|---|---|
| `4h` | `[0h,4h)` | none |
| `2x2h` | `[0h,2h)` and `[3h,5h)` | `[2h,3h)` inactive gap |
| `up-to-6h` | `[0h,6h)` split further into provider-compliant ranges | none (early actual STOP must be censored) |

For an **illustrative 4h** provider range, up-to-6h is `[0h,4h)` (FIDS_BASE) + `[4h,6h)` (FIDS_SPLIT). For 2×2h each separate exposed child starts at its own `partitionIndex=1` and is **BASE**, not SPLIT. Query start/end must match a **complete canonical range partition**, not just overlap. The algorithm rejects a query spilling across the gap, a 6h request when only 4h documented, an invented segment or an impossible high-partition-count day.

**Refresh coverage is checked per `slot × horizon × segment × partition`, not only 12 slot×horizon pairs.** For each partition with service interval `[a,b)` and horizon offset `H`, prospective flight cutoff population is `[a−H,b−H)`. For each scheduled provider request time `t`, conservative usable cutoff coverage is `[t+schedulerSlip+responsePersist+preCommitMargin, t+maxPopulationStaleness]`. The union must cover the whole exposed cutoff interval without gaps. This is a **mathematical necessary condition only**: `available_at`, actual original content, physical source custody, selected T and late PRE clocks remain separate real checks.

## Cross-file pipeline and protection

| Source file | Verified engineering purpose |
|---|---|
| `phase5DynamicDaySourceGrid_v39.ts` Stage6 | New v3 exact partitions and complete source refresh coverage; unique source query keys; returns sourcePartitionPins by query key |
| `phase5CommittedDayGridReadonly_v39.ts` Stage7 | Queries the actual PostgreSQL `adb_phase6_calendar_day.window_shape` and `active_duration_minutes` **READ ONLY**; refuses caller's v3 shape if different from saved day |
| `phase5V0079DailyPreparedQueryProposals_v39.ts` Stage8 | Regenerates and SHA-checks Stage6 v3 packet from real Stage7 readback; binds exact V0079 `query_digest` to the V0082-compatible `segmentIndex`, `partitionIndex`, `FIDS_BASE_UNITS`/`FIDS_SPLIT_UNITS` and provider-range SHA; **still only a proposal** |
| `phase5Stage9V0079CommittedDayPrepare_v39.ts` Stage9 | **Intentionally refuses v3 packets** before any database connection. Its historic insert-only V0079 writer cannot insert V0082 partition bindings in the same atomic transaction, so it must not silently publish incomplete release rows. The next actual engineering task is a narrowly scoped, jointly reviewed V0079+V0082 source/day/category atomic preparation writer and role/ACL test |

### Why we do not simply remove Stage9's old start-time check

Removing `q.service_window_start_utc = day.scheduledStartUtc` alone would be unsafe: the DB writer could then accept a caller-invented subwindow even when the signed V0082 partition mapping, all **seven charge-day REST categories**, true 31-day source request grid and permissions do not exist. The proper fix is an independently verified **exact two-table write** (V0079 prepared query + V0082 immutable partition, and a frozen seven-category budget release) with a constrained role, in one transaction. Missing or expired providers and missing science remain `HOLD`, never reconstructed after cutoff.

### Relevant SQL schema terms

A *parent day row* lives in `clean.adb_phase6_calendar_day`. The *four selected airports* live in `clean.adb_sampling_draw`. The *physical query* is planned in `clean.phase5_fids_allowed_query_v39`. The *exact child/range and category* belong in `clean.phase5_fids_exact_query_partition_v39` (V0082). The *original response* must later be committed and bound in `clean.phase5_fids_original_binding_v39`. A SQL `JOIN` reads relational facts across these tables; it does not itself mean a paid provider GET or actual flight observation occurred. See [SQL lab](PHASE5_SQL_JOIN_DATABASE_LAB_FOR_READERS_20261108.md) and [table atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md).

## Tests and limitations

New `tests/phase5_amendment_c_dynamic_day_grid_v39.test.ts` and a dedicated no-provider GitHub workflow cover hypothetical exact 2×2h (2h + forbidden 1h + 2h), 6h split into 4h+2h, ordinary 4h, actual per-partition BASE/SPLIT counted into V0079 query digests, invalid provider range, crossing the gap, missing entire child, missing one cutoff refresh, and no Phase6 GO. Historical Stage6/7/8/9 tests and full V3.9 safety should pass exact-head checks. **Synthetic requests are not sampled airline data.** Do not claim a provider account range from hypothetical fixtures.

A truly final scientific Phase5 FREEZE still requires: (A) independently adjudicated lawful normalized Contents ML purpose/TTL/backup (#300) and first-cycle target (proposed Amendment D); (B) one genuine GitHub-only prospective early draw/source→all three DB-clock PREs→independent T24 witness→POST/receiver/STOP end-to-end; (C) a hash-frozen actual 31 ordered batch-day eligible airport/region/window/crossover/≥24h END-to-START washout schedule, approved provider range and complete seven physical REST charge-day categories **plus separate Alert SEND credits**; (D) one independent reviewed Phase5 scientific FREEZE and separate Phase6 paid authorization. Do not repeat installed production V0079/V0080/V0081, worker-login commissioning or historical November6 narrow paid source pilot merely to check this code path.

**Release decision: Phase5 scientific FREEZE=HOLD; Phase6 paid GO=NO.**
