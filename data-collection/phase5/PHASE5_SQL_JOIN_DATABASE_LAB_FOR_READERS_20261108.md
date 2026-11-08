# Phase 5 SQL lab — see the relations, JOINs, and budget cells

**A short database refresh tied to the actual repository.** This is instructional SQL. Every `SELECT` below is read-only. Do **not** run `INSERT`, `UPDATE`, `DELETE`, DDL, or a production migration while exploring. Use the proper authorized read-only PostgreSQL connection. No current production row counts are asserted here.

## 1. SQL is not a giant flat CSV

An RDBMS (PostgreSQL) stores **relations (tables)**. Tables can have thousands of rows, but each table describes *one kind of thing*:

- Calendar: one row is a **batch-day**, keyed by `run_day_index`.
- Airport draw: one row is an **airport slot selection for a given day**. Four different slots can have the *same* `run_day_index`, so this is **one-to-many**.
- FIDS query: one row is a particular approved HTTP GET request, identified by the immutable `query_digest`.
- Provider response: one row describes an actual FIDS original, identified by `population_query_id`.
- Population: one row is **one identified service/member in a response**, with the `population_query_id` linking back to its response.
- PRE: one row is a selected flight/horizon's **as-of snapshot**. T−24h, T−6h, and T−90m are *different* rows/observation cutoffs.

A CSV export may be **flattened** by joining these tables for analysis, but the stored relational design deliberately avoids duplicating a parent's calendar details every time a flight is observed. The schema also uses `jsonb`, which stores semi-structured objects inside some columns.

## 2. Start with metadata only — what's really installed?

These do not read flight records or user data.

```sql
-- List actual clean-schema tables on THIS PostgreSQL connection.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'clean' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List columns and types for a single real table.
SELECT ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'clean'
  AND table_name = 'phase5_fids_allowed_query_v39'
ORDER BY ordinal_position;

-- Confirm which database you are connected to (no credentials exposed).
SELECT current_database() AS database_name,
       current_schema() AS search_schema,
       current_user AS effective_role;
```

If `phase5_fids_allowed_query_v39` is absent, do not assume it was erased: the explorer might be on a different database/branch/schema or a migration might not be installed. Check the approved source-of-truth/production metadata audit. An empty **table** can still be correctly installed.

## 3. SELECT, WHERE, ORDER BY and LIMIT

```sql
-- Bounded sample of batch-day structure (not flight contents).
SELECT run_day_index, window_shape, scheduled_start_utc,
       active_duration_minutes, crossover_group_id
FROM clean.adb_phase6_calendar_day
ORDER BY run_day_index
LIMIT 10;
```

`SELECT` picks columns, `FROM` names the table, `WHERE` filters rows, `ORDER BY` sorts, `LIMIT` bounds output. Blank results are not evidence that an upstream producer failed: this table can be prepared before data collection.

## 4. The calendar JOIN — what the new source guard checks

```sql
-- Link rows by a shared key; the day has one row,
-- selected airports can have multiple rows.
SELECT c.run_day_index, c.window_shape,
       c.scheduled_start_utc, d.slot_id, d.selected_icao,
       d.selected_at_utc
FROM clean.adb_phase6_calendar_day AS c
JOIN clean.adb_sampling_draw AS d
  ON d.run_day_index = c.run_day_index
ORDER BY c.run_day_index, d.slot_id
LIMIT 16;
```

Visualize it:

```text
CALENDAR                             DRAW
run_day_index  window_shape          run_day_index  slot_id  selected_icao
------------   ------------          -------------  -------  -------------
1              4h                    1              HUB      WSSS
                                      1              MID_A    OMAA
                                      1              MID_B    SKBO
                                      1              REGIONAL KGPT

Result: 4 rows; the calendar shape and start appear alongside
each selected airport, without being stored 4 times in the calendar.
These are SYNTHETIC illustrative values, NOT live Phase6 draws.
```

Why the added Phase5 guard uses a **stricter JOIN**: a parent batch is not safely identified just by a user-supplied number. The source admission compares the actual stored calendar's `calendar_hash`, `config_hash`, `frame_hash`, window shape, and parent start to the reviewed plan. A 4h plan cannot silently read the second child of a 2×2h design.

## 5. Trace one permitted query to its physical attempt

```sql
SELECT q.run_day_index, q.slot_id, q.horizon, q.query_key,
       q.service_window_start_utc, q.service_window_end_utc,
       q.state,
       a.charged_reserved_units, a.charged_utc_date
FROM clean.phase5_fids_allowed_query_v39 AS q
LEFT JOIN clean.phase5_fids_physical_attempt_v39 AS a
       ON a.query_digest = q.query_digest
ORDER BY q.run_day_index, q.slot_id, q.horizon
LIMIT 20;
```

`JOIN` (an inner join) returns rows with matches on both sides. **`LEFT JOIN`** keeps even an allowed query with **no attempted GET**: its `a.*` columns will be `NULL`, not zero. That distinction matters scientifically. A missing physical attempt is not a zero-delay observation.

One typical relationship is **one approved query → zero or one attempted physical GET**, because V0079 currently permits one physical attempt per exact query and retries are not silently free. The reservation is committed before provider HTTP, not after. Source original custody is a *different* later event.

## 6. Follow original source custody to a population member

```sql
-- Metadata only. Do not SELECT raw_payload or provider Contents.
SELECT b.population_query_id, b.source_expires_at_utc,
       q.source_airport_icao, q.available_at,
       COUNT(p.id) AS member_rows
FROM clean.phase5_fids_original_binding_v39 AS b
JOIN clean.fids_query_response AS q
  ON q.population_query_id = b.population_query_id
LEFT JOIN clean.flight_population AS p
  ON p.population_query_id = q.population_query_id
GROUP BY b.population_query_id, b.source_expires_at_utc,
         q.source_airport_icao, q.available_at
ORDER BY q.available_at DESC
LIMIT 10;
```

A single FIDS response can contain **zero, one or many** flight population members. `COUNT(p.id)` counts matched population rows; `GROUP BY` aggregates by original response. An empty response is different from an entirely missing provider request. The V0079 binding proves custody at the source-query level; **it does not prove a flight physically operated, provider-native selected T, or legal long-term ML record retention**.

## 7. The subtle REST billing split: service day is not paid UTC day

```text
Batch service date:       e.g., Nov 10 (selected departure window)
T−24h physical GET date:  e.g., Nov 9  (different actual UTC charge day)
                       ↓
clean.phase5_fids_day_budget_v39       (science/service batch-day)
clean.phase5_fids_utc_charge_budget_v39 (physical REST charge-day)
```

For Amendment C, each physical GET also belongs to **exactly one** of seven REST categories:
`FIDS_BASE_UNITS`, `FIDS_SPLIT_UNITS`, `FIDS_RETRY_UNIT_BUDGET`,
`VALIDATION_UNIT_BUDGET`, `OUTCOME_REST_UNIT_BUDGET`,
`HISTORY_BOOTSTRAP_UNIT_BUDGET`, `DIAGNOSTIC_UNIT_BUDGET`.

A 2×2h parent contains two exposed child segments. The first range partition of **each** child is BASE, but a second range partition within the *same* child is SPLIT. All are paid against the **actual dispatch UTC date**. The current V0079 ledger stores total physical units; full category-complete database enforcement requires a separately reviewed additive implementation and tests. **Alert SEND credits are not REST units** and have a separate cap.

## 8. Keys and transactions, mapped to source code

| Concept | Example | Reason |
|---|---|---|
| Primary key | `phase5_fids_allowed_query_v39.query_digest` | No duplicate exact request identity |
| Composite key | `(manifest_sha256, run_day_index)` in the day-budget table | Same index can only be interpreted inside a specific signed release |
| Foreign key | `flight_population.population_query_id → fids_query_response.population_query_id` | Population members cannot refer to a nonexistent original response |
| `NOT NULL` / `CHECK` | `max_physical_attempts = 1` | Prevent invalid plan state before fetching |
| Transaction | DB reservation **COMMIT**, then HTTP GET | Even failed GETs may consume units; no unbilled retry |
| Two transactions | PRE **COMMIT**, then independent T24 witness **COMMIT** | Witness checks durable evidence after the first commit |
| Immutable audit | attempt and witness UPDATE/DELETE triggers | Prevent rewriting history to make a missed cutoff look successful |
| SHA-256 | `calendar_hash` / `response_hash` | Detect altered content, **not proof of legal rights or scientific validity** |

**Practical rule:** To understand any table, first ask (1) “what does one row represent?”, (2) “what is its primary key?”, (3) “what does it reference?”, and (4) “is it planned, actually captured, post-committed, or only a tested/staged schema?”

Read next: [full actual table atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md), [Phase5 file-by-file engineering guide](PHASE5_ENGINEERING_FIELD_GUIDE_FILE_BY_FILE_20261107.md), [Amendment C segmented SOURCE checkpoint](2026-11-08_AMENDMENT_C_REAL_SOURCE_SEGMENT_RELEASE_CHECKPOINT.md).

**No production SQL was executed to produce this lesson.** All example rows are explicitly synthetic. The authenticated real GitHub SOURCE test is readonly and should not be rerun for this educational purpose.
