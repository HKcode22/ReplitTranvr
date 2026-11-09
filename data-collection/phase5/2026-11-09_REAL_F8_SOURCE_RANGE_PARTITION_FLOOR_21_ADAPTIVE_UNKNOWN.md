# Phase 5 — real 31-day FIDS request-partition FLOOR with 21 future adaptive airport IDs unknown

**2026-11-09.** Source shape/cost lower-bound integration; **science FREEZE HOLD / Phase6 paid GO NO**. This calculation invokes no provider HTTP or production PostgreSQL and does not create a new Stage-N.

## Why it matters

Full Stage22 materialized source-grid admission requires all 31 days' actual four-site airport IDs. That would **fabricate future adaptive selections** for the 21 ordinary days. Nevertheless the 31-day shape (26×4h, 3×2h+excluded 1h gap+2h, 2×up-to-6h) already supports an exact **minimum number of airport-range partitions**, without knowing those 21 airport names. This screens impossibly costly designs but never grants source rights or claims full feasibility.

**Code:** [phase5ShapeOnlyFidsRangePartitionFloor_v39.ts](../../server/lib/disruption/phase5ShapeOnlyFidsRangePartitionFloor_v39.ts), export `calculateP5ShapeOnlyFidsRangePartitionFloor`.
**Tests:** [phase5_shape_only_fids_partition_floor_v39.test.ts](../../tests/phase5_shape_only_fids_partition_floor_v39.test.ts).
**Actual owner correction:** [real B0062 five-pair packet](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json), SHA `f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592`.
**Existing formal physical-range/audit authority remains:** [Stage22](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) and [seven-category V0082 source budget](../../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs). The new floor does NOT replace either.

## The mathematical request floor

For an active service segment of L minutes and an **assumed** provider maximum per-request range R minutes, partitions = `ceil(L/R)`. With four airport slots and three horizons, the full minimum count is:

```text
12 × [ 26 × ceil(240/R) + 3 × 2 × ceil(120/R) + 2 × ceil(360/R) ]
```

The inactive 1-hour split gap has NO source flight population. At least one physical FIDS GET for each range partition/airport/horizon is a **structural lower bound**; real per-flight continuous refresh, provider filters, retries and actual per-horizon source availability can greatly increase it.

| Hypothetical max FIDS range | Necessary GET partition floor | Hypothetical 2 API units / GET |
| --- | ---: | ---: |
| 360 minutes | 408 | 816 |
| 240 minutes | 432 | 864 |
| 120 minutes | 768 | 1,536 |
| 60 minutes | 1,536 | 3,072 |
| 30 minutes | 3,072 | 6,144 |
| 1 minute (stress test) | 92,160 | 184,320 |

**These values are sensitivity scenarios, NOT independently verified AeroDataBox current contract range, price or account balance.** A mere 64-character SHA pins a claim, not proof of an actual service permission. 360 minutes would map 408 logical horizon groups to 408 minimum GET partitions; 240 minutes makes the two 6h parent windows require another partition per slot/horizon, raising the floor to 432. At 120 minutes, 26 × 4h days need two partitions, split-days each have two active 2h child segments and six-hour days require three: 768 floor.

The function checks the real corrected B0062 owner-pair SHA, an independently supplied reviewed 31-day shape SHA, the exactly 31/10/21/26/3/2/34 design, each active child and excluded split gap, pair candidate identity/nonfabricated ordinary null identity, strictly integer range/price and fixed 50,000-unit project cycle cap. It reports whether the **mathematical** lower bound by itself exceeds 50,000 under the *assumed* price. A lower bound below cap does **not** imply any source request, continuous-refresh coverage or charge-day budget is ready.

## Explicit exclusions and release work remaining

The output always marks **no source refreshes costed, no retries costed, no physical UTC charge day assigned, no seven-category REST/Alert reservation, no provider range/price/balance certification, no 21 future adaptive database draws, no legal Contents-retention permission, no real flight PRE and no scientific FREEZE or paid Phase6 GO.**

To get beyond this mathematical floor: obtain authentic provider-native range/latency/price evidence; generate a continuous cutoff-refresh schedule with exact physical charge-day timestamps and seven REST categories; check native scheduled airline scope for the selected *dates and windows*; bind each legitimate future adaptive four-airport draw to the signed calendar; audit prior-airport >=24h END→START washout; complete real original → cutoff-safe T24/T6/T90 PRE → witness → POST and STOP. Source-use/retention issue [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) remains open. No need to wait for a vendor email to do further safe offline engineering, but vendor silence is not a rights grant.

**The November 24 first-day value in CI is a hypothetical reproducible fixture, not the approved Phase6 launch date.** Start at the earliest legitimately safe prospective point after separate scientific FREEZE PASS and paid GO.

Continuity: [assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md) and [owner code atlas](2026-11-09_OWNER_PROGRESS_ENGINEERING_TIME_AND_PHASE5_CODE_ATLAS.md).
