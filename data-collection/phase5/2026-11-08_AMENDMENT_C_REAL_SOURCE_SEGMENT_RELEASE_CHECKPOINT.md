# Phase 5 — Amendment C executable SOURCE partition and physical GET category checkpoint

**November 7 PT / November 8 UTC, 2026.** Technical implementation review on PR #468, based on binding Plan f.8 §8.7 and its prospective Amendment C. **Not a scientific FREEZE, paid authorization, source-use clearance, provider-range measurement, or production GET.**

## Verified starting point (do not repeat)

- Four already commissioned restricted PostgreSQL worker identities (SOURCE, PREPARE, PRE, independent T24 WITNESS), each authenticated from GitHub Actions, are **done**. SOURCE was proven in [real readonly run #42443811669](https://github.com/HKcode22/ReplitTranvr/actions/runs/42443811669), with zero provider GETs/Alert creates/flight writes. Do not recommission.
- Source manual admission fix [merged #466](https://github.com/HKcode22/ReplitTranvr/pull/466) rejects scheduled or push-triggered paid one-query execution. No change to the full Phase6 authorization.
- The genuine Nov6 Phase4 G5A three-PRE/POST **provider schedule-revision pilot** remains preserved under its narrower science, not native operating-leg/actual wheels-off certification. Do not repeat the same paid pilot.
- [Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) proposes a future first-cycle binary provider-schedule-revision target/Brier metric; still **draft** until independent adoption and unchanged source rights/retention restrictions.

## The real blocker corrected by this patch

The staged `phase5ScopedFidsSourceBridge_v39.ts` previously enforced `q.serviceWindowStartUtc == day.scheduledStartUtc`, silently making the binding Amendment C second 2×2h child and any subsequent provider-range partition **unrunnable**. The same module hardcoded `fids_base`, treating range-partition GETs as base regardless of their actual category.

The code now derives exact canonical, half-open partitions from the **frozen parent start** and one of these shapes:

| Shape | Exposed service segments; offsets from parent start | Inactive gap |
|---|---|---|
| 4h | [0h,4h) | None |
| 2×2h | [0h,2h), [3h,5h) | **[2h,3h) excluded** |
| Up-to-6h | [0h,6h) planned maximum | None; early actual STOP recorded as censored |

Each exposed segment is independently partitioned into contiguous intervals of at most independently verified provider maximum range `R`. The first partition of **either** 2×2h child is `fids_base`, while partition 2+ **within a segment** is `fids_split`. Example for *hypothetical* R=240min: six-hour plan becomes [0h,4h) BASE then [4h,6h) SPLIT. The test's 240min value **does not prove an actual AeroDataBox account entitlement**.

`P5SourceSingleQueryPlan.sourcePartition` now explicitly carries immutable `windowShape`, `segmentIndex`, `partitionIndex`, `verifiedProviderMaxRangeMinutes`, `reviewedProviderRangeEvidenceSha256`. The pure `verifyP5F8ExactSourcePartition` matches the requested service `[start,end)` **exactly** to that particular canonical partition and refuses gap/spillover, mutated indices, bad/unknown range or unsupported shape **before budget reservation/GET**.

The paid GitHub manual release guard must additionally match the **separate reviewed secrets** `V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256` and `V39_P5_VERIFIED_PROVIDER_MAX_RANGE_MINUTES` to the signed JSON's provider range. Until actual external evidence is obtained and independently reviewed, these secrets must **not** be invented, and paid SOURCE stays on HOLD. JSON hashing alone is integrity, not permission.

Before physical V0079 reservation, scoped SOURCE queries now JOIN saved `clean.adb_phase6_calendar_day` using its frozen calendar/config/frame and compare `window_shape`, `active_duration_minutes`, and parent `scheduled_start_utc` with the source worker's signed range/shape. The source runner still verifies the saved exact V0079 query (airport, UTC range, filters/locals, cutoff, provider contract and run ID), reserves **one** physical 2-unit GET, has no implicit retry, and atomically binds a genuine original + population only when the paid release is separately approved. The base/split category is carried into the FIDS transport and independently rechecked by the V0079 scoped port.

## Evidence / test contract

Mock-provider unit tests cover correct second 2×2h child, excluded gap, first-vs-later provider-range categorization, exact 4h+2h partition, forged range, wrong segment and changed source interval. Disposable PG16 adds a refusal where the requested query is a mathematically valid partition of six-hour exposure but the **actual saved DB calendar** only authorizes a four-hour treatment. This is not a live run or a paid provider request. CI must pass at an exact reviewed PR head before merge; do not infer results from a previous head.

## Important remaining distinct work

1. Independently measured AeroDataBox supported GET-range/clock/latency and current source-use/record-level normalized ML, backup and expiry rights ([#300](https://github.com/HKcode22/ReplitTranvr/issues/300)). No automatic approval from 60K units, a SHA, or a 23h local expiry.
2. Signed real 31 **ordered batch-days** with 26×4h, 3×2×2h, 2×up-to-6h, five valid matched pairs, four early preselected airports and ≥24h **END-to-next-START** airport reuse washout. Source calendars in Stage21/22 are computational candidates only, not this actual signed release.
3. Full reviewed seven-category physical REST budget on each actual GET UTC date, including split vs base and retries; a JS transport category and V0079 total reservation **do not yet prove seven independently enforced live category ledgers**. Separately protect Alert SEND credits/STOP.
4. Actual source→selected provider-native T/operating or segregated conditional service identity→cutoff-safe T24/T6/T90 PRE→independent post-commit witness→POST, source custody, deployed receiver SHA, unknown/censoring and abort conditions.
5. One independently signed Phase5 scientific FREEZE and separate Phase6 billable GO. A narrow pre-FREEZE paid evidence permit is only warranted if reviewed missing evidence cannot be addressed using Nov6's existing pilot and offline/readonly tests.

**Production truth:** no SOURCE paid GET, no Alert subscription, no original or PRE/POST write, no migration, no Replit Shell action introduced by PR #468. **Phase5 FREEZE=HOLD, Phase6 paid GO=NO**. The long historical implementation log remains hash-locked and untouched.

### Code-reading note

`[start,end)` is a half-open time interval: it includes `start` but excludes `end`, so adjacent partitions have no double-counted boundary. A **source partition** is a subset of a service exposure; it is not a new randomized batch-day. `sourcePartition.partitionIndex` counts range chunks *inside one child*, resetting to 1 on the next child. `JOIN` in the PostgreSQL read query is a relational validation that the query belongs to the actual saved calendar; a caller-provided TypeScript object alone cannot assert that fact. `fids_base` and `fids_split` designate physical REST accounting, not different kinds of flight outcomes.
