# Phase 5 — 31-day shape-first envelope; 21 future adaptive airport sets deliberately UNKNOWN

**Checkpoint date:** November 9, 2026. **Science status: HOLD, Phase 6 paid GO: NO.** This is a concrete interface between the corrected production B0062 crossover candidate sample, the 31-day calendar design, and future *genuine* committed early airport selections. It is not a new Stage number, database installation or a replacement for the binding f.8 protocol.

## Why this was needed

The existing pure Stage21 f.8 calendar audit `phase5F8CrossoverCalendarFreezeGuard_v39.mjs` and Stage22 source-coverage audit `phase5F8SegmentedSourceCoverage_v39.mjs` demand **all four selected airport ICAOs for all 31 days**, then all provider GET query instances. This is correct for validating a completely materialized *retrospective* full packet, but it is not possible or scientifically permissible to fabricate the 21 future adaptive-day airport identities today: those identities depend on the allowed sample frame, prospective draw seed and prior completed-day outcome information *available at the true early selection time*.

The design has **ten paired parent days with known corrected owner candidate airport sets**, and **21 ordinary adaptive parent days with no selected airports yet**. A supposed "signed 31-day source grid" that silently fills the latter with placeholder ICAOs, a future oracle, or old training outcomes is **scientifically invalid** even if a structural test happens to pass.

## The new shape-first adapter

`server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts` exposes `proposeP5Adaptive31ShapeEnvelope(...)`. It does not write PostgreSQL or call the provider. It reuses three already reviewed source-pinned modules:

1. The **real corrected Nov9 B0062 owner readback** (selected 1,013-airport eligible MID/REGIONAL frame, five actual matched candidate airport sets, KTEB→KBUF single correction), via `phase5CorrectedPairDateGeometryProposal_v39.ts`.
2. The **40 exact paired airport-window SHA identities**, via `phase5Crossover40WindowEvidenceReview_v39.ts`.
3. The separately **claimed** independent treatment-order seed and its SHA-bound role allocation, via `phase5IndependentPairedTreatmentSourcePreview_v39.ts`.

It emits the same chronological 31-day candidate `startUtc`, `utcSlot`, split gap and exact active `segments` on each parent day, plus three train/validation/test partitions, an explicit four-slot candidate set **only on the ten paired days**, and literal `null` selected airports for each of the 21 ordinary days. Each day carries the actual shared **72h early-open and strict 24h45m early-close** bounds and earliest hypothetical window T−24h.

Every output is a **shape/date envelope only**, not a frozen signed site/region/GET/price population. It preserves the exact 5 pair replays, known cross-pair SKBO ≥24h washout and six UTC start-time rotation. Ordinary-day global washout must still be checked **after the real four-airport draw** against real prior completed allocations; without those identities the module **does not claim** a 31-day site washout PASS.

## The arithmetic and the common misunderstanding

| Experiment layer | Correct maximum/design count | Why it matters |
| --- | ---: | --- |
| Parent batch-days | **31** | Four selection *slots* in each day |
| Known crossover parent days | **10** | Five pairs observed twice, known 20 slot assignments/19 distinct physical airports |
| Ordinary parent days | **21** | True early site draw later; do not fake 84 selected airport identities |
| Parent exposure shapes | **26×4h**, **3×(2h + 1h GAP + 2h)**, **2×up-to-6h** | Total maximum active exposure **128 hours**; 1h split gap is **not** flight exposure |
| Active child segments | **34** | 26×1 + 3×2 + 2×1; this includes ordinary days |
| Airport × child segment opportunities | **136** | 34 segments × 4 airport slots; some airports still unknown |
| Airport × segment × PRE horizon planning groups | **408** | 136 × (T−24h, T−6h, T−90m); **NOT** 408 flights or physical GETs |
| Crossover-only planning groups | **156** | Subset of 408 from the 13 known paired child segments |
| Ordinary planning groups | **252** | Other 21 × 4 airports × 3 horizons, with **future unknown ICAOs** |
| Actual partitioned source GETs | **UNKNOWN** | Depends on provider verified max query range, refresh cadence, retries and physical UTC charge day |

The code checks the identity: `156 + 252 = 408`. If a future verified source range were 240 minutes, both 6-hour exposures would need partitioning into at least 4h + 2h, potentially increasing the count of *partitioned* planning groups. **We do not assert 240 minutes is an independently verified live provider entitlement.** Nor does a logical planning group necessarily map to one API GET: each partition/horizon may need multiple refreshes.

The source `phase5F8SegmentedSourceCoverage_v39.mjs` and seven-category REST budget `phase5V0082SevenCategoryFreezePacket_v39.mjs` remain authoritative for actual **complete submitted** provider request sets with physical charge-day timestamps; the envelope is **not** passed to them with fabricated ordinary airport identities. Full physical source reservation, 50k-cycle ceiling and daily Alert credit use remain unapproved until signed real evidence and query/cost pins exist.

## What needs to happen at an actual ordinary day's early selection

1. Independently approve calendar **dates/UTC slots/shape/region targets**, treatment seed and current provider eligible-service/range/cost/right-to-use *before* source creation.
2. At that day's lawful early-selection time **strictly more than 24h45m and at most 72h before parent service**, use `phase5EarlyAdaptiveDrawOwner_v39.ts` to select and commit all four airport slots atomically in the actual PostgreSQL database. That code is already implemented and tested, but the output is **not yet a real first future cohort**.
3. From an independent restricted read-only PostgreSQL transaction, use `phase5CommittedDayGridReadonly_v39.ts` and `phase5EarlyPreselectionReadback_v39.ts` to bind the real four ICAOs, slot regions, draw seed, selected-at DB clock and probability vector to the day and verify true global site reuse/washout. Do **not** treat an in-memory/fake prospective draw as a persisted selection.
4. Derive the exact **FIDS source partition × three PRE horizon × physical UTC charge day** requests from that bound identity, including actual allowed provider range, latency, refresh slots and all seven REST categories, and enforce signed budget caps using the existing Stage8/9/V0082 validators.
5. Prove genuine source original → on-time flight-level PRE (T−24h/T−6h/T−90m) → independent witness → POST and STOP through the published receiver; missing/censored/unknown is recorded, not backfilled or recoded as observed zero.

A **complete shape-envelope** is an intermediate prerequisite to Phase 5 FREEZE, not Phase 5 FREEZE itself. A single rehearsed day is also not 31-days' scientific equivalence. The next justified integration work should validate each actual saved early-draw day **against** this immutable shape-envelope hash and real prior day identities, rather than generate an unauthorized fixed 31-airport schedule.

## Engineering learning: why `null` is necessary and why this uses two validation levels

```ts
// Illustrative structure, not a live collection command
type Day = {
  startUtc: string;             // can be decided before collection
  windowShape: "4h"|"2x2h"|"up-to-6h"; // can be decided before collection
  pairedAirportCandidates: Record<string,string> | null;
};

// A known matched crossover candidate may already name OMAA, OMSJ, SPJC, KDEC.
// An ordinary adaptive day MUST still have pairedAirportCandidates: null.
// Later, verified PostgreSQL early draw binds the real four selected airports.
```

Think of the shape envelope as a **type-level contract**: it defines *when and how much* the experiment would observe without pretending to know all future adaptive choices. The separate DB readback is the **value-level binding**: it proves *which four airports were actually chosen* before the cutoff. The Stage21/Stage22 full packet check is a **later complete-materialization audit**, not a valid way to fill missing ordinary sites today.

The SHA-256 over the 31 day/shape rows helps detect changed dates/treatment shape, but a SHA cannot authenticate the source, historical seed independence, legal rights, a provider-native flight, or code execution. The method always returns `phase5ScientificFreezePassed:false`, `phase6PaidGo:false`, `providerCalls:0`, `databaseWrites:0`.

**Important chronology:** the November 24 → January 5 sample calendar remains *one test input*. Per the owner directive and PR #509, actual Phase 6 begins only on the **earliest prospective day after all authentic scientific and source gates pass**, with sufficient lead for the strict early draw and first real T−24h source; no arbitrary calendar wait.

**No Replit Shell command** is needed for this offline PR. Preserve the original sample, previous installing/custody receipts and existing manual paid workflow without re-dispatching or reinstalling.
