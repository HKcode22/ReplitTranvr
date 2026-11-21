# 01 — The 3 / 48 / 12 / 12 mystery: count the right objects

## An analogy before reading code

Picture an airport departure board with many rows. You take **three photos** of the same board, at different times. You then standardize every row in each photo into a database record. Among the records, some may be canceled, marketing codeshares, context, or lack positive operating-identity evidence. You identify 12 eligible operating-flight **identity candidates**. Finally, for each qualifying flight you make one prediction-time snapshot at a specific horizon.

This produces four kinds of counts, each with a different denominator:

| Printed value | Counts | Does NOT mean |
|---|---|---|
| `sourceSlots: 3` | Three scheduled provider observations *per horizon* | Three flights |
| `normalizedRows: 48` | 48 standardized response rows from *one* capture | 48 unique confirmed operated flights |
| `sourceQualifiedIdentityKeys: 12` | 12 eligible/deduplicated operating-identity keys in source processing | 12 independently certified native provider IDs |
| `12 distinct on-time PRE` | 12 saved flight–horizon records at valid cutoff times | 12 API calls, or proof of actual departure |

Three source observations × 48 normalized rows can yield **144 row-observations** across time. That says nothing by itself about how many physical aircraft departed: source row #1 at 4:00 AM and source row #1 at 4:30 AM may describe the **same flight**.

## 1. How a capture turns into records

Open `server/lib/disruption/fidsCensus_v3.ts`; find `fetchFidsPopulation`. The main source-processing skeleton is:

```ts
const sourceRecords = [
  ...fids.departures.map((source, index) => ({
    source, sourceIndex: index, movement: "departure" as const
  })),
  ...fids.arrivals.map((source, index) => ({
    source, sourceIndex: index, movement: "arrival" as const
  }))
];
const preDedup = sourceRecords
  .map((r) => normalizeFidsRecord({ ...r, params, populationQueryId,
    retrievalUtc, availableAtUtc, responseHash }))
  .filter((r): r is NormalizedFidsRecord => r !== null);
```

**Block 1:** `map` walks over source records. `...` spreads the returned arrays and object fields; `as const` gives TypeScript a literal type. `normalizeFidsRecord` may refuse an invalid/out-of-window record. The `filter` removes `null` and provides a type guard (it is **not** the entire physical-operating-leg filter).

**Block 2:** subsequent maps check duplicates in the *same original response*. A repeated operator/route composite is demoted to an ambiguous provisional identity; it should not become two confidently distinct legs.

**Block 3:** `rows = unambiguous.map(r => r.row)` is the normalized table input. `flightInstanceIds` is computed from non-null resolved canonical identities after deduplication; thus its size can be smaller than `rows.length`.

```ts
const rows = unambiguous.map((r) => r.row);
const flightInstanceIds = Array.from(
  new Set(unambiguous.map((r) => r.resolvedCanonical)
    .filter((x): x is string => !!x))
);
```

A `Set` removes repeated values. A row can be preserved for transparency while **not** contributing an eligible canonical identity.

## 2. Flight identity is different from the displayed flight number

A marketing codeshare can have a number even though a different airline operates the aircraft. Some provider rows have a stable `flight.id`; others do not. G5A accepts a specially flagged **conditional operator/number/route composite** for a prospective cohort when a positive operator signal exists but no native ID does. This is **not** the same as certifying a native provider identifier. See [Lesson 04](04-fids-data-normalization-and-identity.md).

## 3. What a PRE snapshot holds

Open `server/lib/disruption/preSnapshotBuilder_v3.ts`. A `PreSnapshot` has: `flightInstanceId`, `horizon`, `predictionCutoffUtc`, `selectedTMilestoneUtc`, `populationQueryId`, `features`, and `provenance` (including `fidsResponseHash` and missingness flags). It means: *the feature state we can legitimately offer a prediction model as of this cutoff*.

The key is **flight × horizon**, not just a flight number. If all three horizons work:

```text
Flight A  | T-24h | snapshot 1
Flight A  | T-6h  | snapshot 2
Flight A  | T-90m | snapshot 3
...
Flight L  | T-24h / T-6h / T-90m
= 12 flight identities × 3 horizons = 36 PRE records
```

These are **36 flight–horizon rows, not 36 flights**. Every horizon produces a *different permissible historical information set* for the same flight.

## 4. Why one source can have 12 keys but third-source eligibility may be five

The provider response can still contain 12 recognizable flight identities at 5:00 AM, **even when seven earlier flight cutoffs are over**. Its `sourceQualifiedIdentityKeys` may be 12, while the *as-of a given cutoff* query identifies fewer new eligible candidate snapshots. A 5:00 AM source can never be used to produce a 4:35 AM PRE retrospectively; those earlier records must already have been written from earlier sources.

**Observed example:** T−6h third source reported 48 rows and 12 keys, but the database query for `qualified_asof_frozen_t6_keys` returned 5 because seven earlier cutoffs had passed; seven flights did not disappear.

## 5. Where the database stores each object

```text
phase4_g5_fids_physical_owner_v39      one owner per horizon
  -> phase4_g5_fids_allowed_query_v39  three immutable source slots
  -> phase4_g5_fids_physical_attempt_v39  irrevocable reservation
  -> phase4_g5_fids_original_binding_v39 original-to-owner linkage
  -> fids_query_response               bound decoded source response
  -> flight_population                 normalized source members
  -> flight_snapshots                  per-flight prediction state
```

This is a conceptual processing/lineage path; exact SQL foreign keys/joins need not follow the indentation exactly.

**Why the logs do not list flight numbers:** the current logs intentionally avoid printing flight identifiers and copyrighted provider response bodies. A count-only log cannot identify a particular real flight for you. Don't assume Flight A represents an actual WSSS flight number.

## 6. Interpret the actual Nov 6 audit

At 04:44 PST, frozen T−24h anchors=12, T90 prediction cutoffs reached=2, future=10, valid T90 PRE=2, missed=0. This means **all due predictions were saved**, **not** that T90 had finished. The last T90 cutoff is 05:25 PST. The source-owner log later reported third capture committed around 05:00; final 12/12 requires checking the final persisted snapshots separately.

A second subtlety: `lateNoBackfill: 7` in a polling log is a **temporal classification** (seven cutoffs already passed), not necessarily seven missing records. Only a separate join with `flight_snapshots` determines whether they were saved on time.

## Practice: answer without looking

1. If each of three captures yields 48 rows, how many row observations? Does that tell you unique operated flights?
2. If 12 distinct flight identities each have 3 valid PRE horizons, how many PRE rows and how many physical-identity candidates?
3. A 5:00 AM source contains Flight A, whose cutoff was 4:45. Could this new source *create* its 4:45 PRE? Why?
4. Why may a marketing codeshare be present in `flight_population` while absent from the eligible 12?

**Finish condition:** You can explain `sourceSlots`, `normalizedRows`, `flightInstanceIds`, `PRE` and `horizon` as five different nouns.
