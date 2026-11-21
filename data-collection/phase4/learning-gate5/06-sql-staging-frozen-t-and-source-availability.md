# 06 — Read the as-of SQL: staging a PRE candidate from trustworthy source data

## This is where the "hopping around" can stop

Your entry point is **one file**: `server/lib/disruption/phase4Gate5ScopedPreStaging_v39.ts`. The critical function is `stageP4G5ScopedPreV39`. Its job is *not* to pay AeroDataBox and *not* to commit a PRE yet. Its job is to identify eligible **candidates** with the correct flight identity, source provenance and information-availability times.

## Block 1: decide scope and identify this cohort

```ts
export interface P4G5ScopedPreScope {
  airportIcao: string;
  serviceStartUtc: string;
  serviceEndUtc: string;
  observedAtUtc: string;
  reviewedFrozenManifestSha256: string;
}
```

A TypeScript `interface` describes the required shape. The caller must supply exactly which airport, cohort time frame and frozen manifest it means. `assertP4G5ScopedPreScope` checks exact UTC string shape and a valid timeframe; this prevents accidentally reading a different airport's or study's data.

The optional `P4G5BoundPreSourceOwnerV39` adds a **single horizon**, real GitHub run ID and exact run authorization hash. Without that binding, the generic staging query is only a preview, not an admitted live PRE source.

## Block 2: understand a SQL common-table expression (CTE)

In `P4_G5_SCOPED_PRE_SOURCE_SQL` the code builds SQL from an array of string fragments. Read it as one query with names for intermediate results:

```sql
WITH q AS (
  SELECT f.population_query_id, f.response_hash, f.available_at
  FROM clean.fids_query_response f
  WHERE f.source_airport_icao=$1
    AND f.service_window_start_utc=$2::timestamptz
    AND f.service_window_end_utc=$3::timestamptz
    AND f.available_at<=$4::timestamptz
    AND f.raw_payload IS NOT NULL
    AND f.raw_expired_at_utc IS NULL
),
p AS (
  SELECT m.analytic_identity_id, m.population_query_id,
         m.response_hash, q.available_at AS source_available,
         GREATEST(m.available_at,q.available_at) AS effective_available
  FROM clean.flight_population m
  JOIN q ON q.population_query_id=m.population_query_id
)
SELECT ...
```

This is a **pared-down conceptual excerpt**; the real `p` CTE contains more columns and filters. `q` means "source originals meeting source time and frame filters"; `p` means "normalized population members tied to those originals".

Why use CTEs? Instead of repeatedly writing a giant subquery, the author breaks one computation into named stages. They are not automatically separate physical databases or new permanent tables.

### Read the SQL symbols

- `$1`, `$2` etc. are **parameter placeholders** supplied separately by the JavaScript client. This avoids concatenating untrusted strings into SQL.
- `::timestamptz` means "interpret this parameter as a timezone-aware timestamp".
- `JOIN q ON ...` demands matching source and member rows; a normalized row without its parent original cannot qualify.
- `GREATEST(member.available_at, source.available_at)` chooses the later information-availability time. A feature cannot be considered usable before **both** source and member exist.
- `IS NOT NULL` and `raw_expired_at_utc IS NULL` are explicit custody checks.

## Block 3: validate parent/child lineage

The next CTE `source_integrity` groups by `analytic_identity_id` and uses `bool_and(...)` to ensure source/member evidence is consistent.

```sql
bool_and(
  response_hash IS NOT NULL
  AND original_hash IS NOT NULL
  AND response_hash=original_hash
  AND member_available>=source_available
) AS all_parent_member_provenance_valid
```

This means **every** considered parent-member relation for that identity must pass—not merely any one row. A mismatch is a reason to HOLD and inspect provenance, not silently substitute another source.

## Block 4: first schedule, versus newest available observation

The `firsts` CTE obtains each identity's *earliest observed schedule*. In PostgreSQL, `DISTINCT ON (analytic_identity_id)` with an appropriate `ORDER BY` retains only one row per identity:

```sql
SELECT DISTINCT ON (analytic_identity_id)
  analytic_identity_id, dep_scheduled_utc AS first_schedule
FROM p
WHERE population_role='requested_airport_primary'
  AND analytic_identity_id IS NOT NULL
ORDER BY analytic_identity_id, effective_available ASC,
         population_query_id ASC
```

Why choose the earliest schedule? If schedule updates from 6:15 to 6:30, we must **not move the C90 deadline from 4:45 to 5:00** to accommodate later information. Otherwise the prediction experiment would leak future knowledge into the definition of "90 minutes before the departure".

Then we need **the newest eligible source** that existed by that fixed cutoff. This uses a SQL lateral subquery.

## Block 5: what does LEFT JOIN LATERAL do?

```sql
LEFT JOIN LATERAL (
  SELECT * FROM p
  WHERE p.analytic_identity_id=f.analytic_identity_id
    AND p.population_role='requested_airport_primary'
    AND p.effective_available<=f.first_schedule-h.lag
  ORDER BY p.effective_available DESC, p.population_query_id DESC
  LIMIT 1
) obs ON TRUE
```

The key idea: for **each outer flight/horizon row**, SQL runs this subquery with that flight's ID and cutoff. It chooses the *latest source that was already available*, using descending availability. `LIMIT 1` means exactly one best eligible observation. `LEFT JOIN` means the flight can remain represented even if no eligible source exists; its source then is NULL and the code can report missingness rather than fabricate a source.

**Illustration:** Flight A C90=4:45. Source A persisted 4:00, source B persisted 4:30, source C persisted 5:00. LATERAL picks **B**. It does not pick C just because C is newest overall.

## Block 6: the source-owner-bound query changes what counts as trustworthy

`P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39` augments the generic source query. It joins:

```text
fids_query_response
  -> original_binding_v39 (same response hash and population_query_id)
  -> allowed_query_v39 (exact allowed slot)
  -> physical_owner_v39 (same manifest/horizon/run)
  -> physical_attempt_v39 (actual reserved once)
```

The SQL also requires the source-use window still open:

```sql
AND b.source_use_expires_at_utc>clock_timestamp()
```

This is why a source can have a saved PRE from yesterday but no longer be allowed as a newly read current source. **Do not remove this condition to make an audit green.**

## Block 7: freeze the **same** selected T across all horizons

The owner-bound SQL uses a meaningful string replacement to add an anchor query for later horizons:

```sql
SELECT s.selected_t_milestone_utc AS frozen_t
FROM clean.flight_snapshots s
WHERE s.frame_hash=$5
  AND s.horizon='T-24h'
  AND s.prediction_state='PRE_DEPARTURE'
  AND s.flight_instance_id=f.analytic_identity_id
  AND s.created_at<=s.prediction_cutoff_utc
ORDER BY s.created_at ASC LIMIT 1
```

The later T6 and T90 deadlines become:

```sql
CASE WHEN h.horizon='T-24h'
     THEN f.first_schedule
     ELSE anchor.frozen_t
END - h.lag
```

The SQL shown is a conceptual splice of the actual replacement statements. **Purpose:** one flight has one frozen T, rather than letting the later AeroDataBox schedule update reassign the target. If the T24 anchor is missing for a flight, the later horizon must not invent a substitute.

## Block 8: choose or exclude candidates in TypeScript

`stageP4G5ScopedPreV39` executes the SQL, checks row shape, validates the source hash and availability, then runs `assessG5AConditionalOperatingPREV39`. It distinguishes:

- confirmed positive operating leg and confirmed commercial core;
- conditionally identified operator with unverified scope;
- ambiguous / unverified identities that must not become the core cohort.

It calls `buildPreSnapshot` to create the candidate object. That call returns a **candidate object**, not a committed row. The actual writer later decides whether it is due at the real database clock.

## Why SQL text is constructed with .replace

The file builds a generic query and programmatically replaces a few fixed fragments to create a stronger owner-bound query. This avoids duplicating the full generic query text, but it can make reading harder. When you see `.replace("FROM...", "...")`, ask: **what extra table join or temporal condition has been inserted into the effective SQL?**

In the actual file, the replacements are fixed strings, not user-controlled arbitrary SQL. They are a source of code-reading complexity, not a permission to change query semantics midexperiment.

## Exercise: mentally execute LATERAL

T = 6:40, C90=5:10. Sources available at 4:00, 4:30 and 5:02. Which is chosen? Now suppose the 5:02 source has a mismatched original hash—should SQL use it? Why can we not simply use the latest provider response regardless of `available_at`?

Next: [07 — PRE builder and commit-time protection](07-pre-builder-transaction-and-nonbackfill.md).
