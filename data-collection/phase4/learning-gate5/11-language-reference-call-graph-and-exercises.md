# 11 — Read the unfamiliar syntax: TypeScript, async functions, SQL, tests and how to trace files

The goal is to build the engineering skill of **following data and control flow**. You do not need to memorize a 700-line script. Instead, identify the inputs, side effects and output of the current block, then cross a file boundary only when the block actually calls a helper.

## Part A — TypeScript constructs from the source

### 1. Imports versus function calls

```ts
import { fetchFidsPopulation, type FidsCensusParams }
  from "../server/lib/disruption/fidsCensus_v3";
```

`import` lets this file refer to an exported symbol. `type` is a compile-time TypeScript type; it vanishes at runtime. **Importing does not itself execute the fetch.** The real network call occurs when the program invokes `fetchFidsPopulation(...)` with an admitted source slot and dependencies.

### 2. Interfaces and typed objects

```ts
interface Observation {
  flightInstanceId: string;
  availableAtUtc: Date;
  responseHash: string | null;
}
```

An `interface` defines a data-shape contract. `string | null` means the value is either text or absent. It does not validate a provider's JSON by itself; runtime validation must do that.

### 3. Optional chaining, nullish coalescing, assertions

```ts
const code = f?.departure?.airport?.icao;
const value = existing ?? fallback;
const literal = "T-90m" as const;
```

`?.` returns undefined instead of throwing when a nested property is absent. `??` uses fallback only when the left side is null/undefined (unlike `||`, which also replaces 0/false/empty string). `as const` narrows a literal's type. They are syntax tools, **not evidence that provider fields exist**.

### 4. Async/await and the three major side effects

```ts
await waitUntil(targetTime);      // time passes; no provider GET implied
await db.query(sql, args);        // may be read OR write: inspect SQL!
await fetchFidsPopulation(...);   // may call the paid provider when wired
```

`async` functions return a Promise. `await` waits for resolution. Before interpreting an `await`, ask **what** it awaits. `await tryPre()` can insert PRE records, while `await readOnlyHealthProbe()` just checks the DB. `await sleep(...)` simply delays the loop.

### 5. Destructuring with .entries()

```ts
for (const [sourceOrdinal, entry] of owner.entries.entries()) {
  // sourceOrdinal = 0, 1, 2
  // entry = query slot configuration
}
```

The first `entries` is an array field on the owner object; the second `.entries()` is the JavaScript array iterator returning index/value pairs. This is why the expression can look confusing but is ordinary JavaScript.

### 6. Closures and dependency injection

```ts
let reserveCalls = 0;
const fetchOne = async (icao, from, to, opts) =>
  fetchFidsAirport(icao, from, to, {
    ...opts,
    budgetOwner: {
      async reserve(_category, units, attempt) {
        if (reserveCalls !== 0 || units !== 2 || attempt !== 1)
          throw Error("G5A_SECOND_PHYSICAL_PAID_GET_FORBIDDEN");
        reserveCalls++;
        return expectedReservationSha256;
      }
    }
  });
```

Shortened from the source-owner code. **Closure**: the nested `reserve` function can remember `reserveCalls` and `expectedReservationSha256` from its enclosing scope. **Dependency injection**: `fetchFidsPopulation` can be handed this explicitly guarded fetcher, rather than choosing an unrestricted fetch implementation.

### 7. Sets and Maps

- `new Set(items)` removes duplicate values (here, candidate flight identities).
- `new Map()` maps a key to a value (here, counts of source composite collisions).
- Neither one coordinates **separate GitHub runners**. That requires durable DB uniqueness/locking.

### 8. Throw/HOLD versus continue/UNKNOWN

`throw Error(...)` aborts the current path, typically rolling back an open transaction and marking the job failed. `continue` skips the current slot/candidate and proceeds with later ones. `return` ends a function. The study distinguishes **data uncertainty** (UNKNOWN, no false label) from **logic/provenance violation** (HOLD). A process that continues with bounded missingness has not silently passed the scientific gate.

## Part B — SQL constructs used repeatedly

| SQL syntax | Meaning in this project |
|---|---|
| `$1::uuid` | Parameter 1, cast to PostgreSQL UUID |
| `$2::timestamptz` | Parameter 2, timezone-aware time |
| `JOIN ... ON ...` | Require matching source/owner/member records |
| `LEFT JOIN ... ON ...` | Keep a flight row even if a source/outcome is missing |
| `LEFT JOIN LATERAL (...)` | Choose per-flight newest admissible source |
| `WITH q AS (...), p AS (...)` | Name intermediate result stages (CTEs) |
| `DISTINCT ON (...)` | One selected row per identity given ordering |
| `count(*) FILTER (WHERE ...)` | Conditional count within one grouped scan |
| `GREATEST(a,b)` | Later of source/member availability clocks |
| `clock_timestamp()` | Actual PostgreSQL wall-clock reading |
| `FOR UPDATE` | Row-level lock during transaction |
| `SERIALIZABLE` | Strong transactional isolation semantics |
| `ON CONFLICT (...) DO NOTHING` | Insert once, then verify identical previous evidence |
| `ROLLBACK` | Undo current transaction's uncommitted DB writes |
| `RETURNING` | Read newly inserted/updated row values |

### Real SQL example: why a small type mismatch matters

```sql
-- Incorrect if one column is uuid and the other text:
f.population_query_id = s.population_query_id

-- Corrected diagnostic comparison (both as text):
f.population_query_id::text = s.population_query_id::text
```

PostgreSQL does not automatically make `uuid = text` comparisons. A failed read-only audit query does not necessarily mean the source writer's SQL is wrong. Use column types to identify which layer failed.

## Part C — "I opened this file; where do I go next?"

**Example: trace one T90 source request**, following only calls:

```text
.github/workflows/...prospective-owner.yml
  [node --import tsx ...horizon_owner.ts]
scripts/...horizon_owner.ts main()
  [for (const [sourceOrdinal,entry] of owner.entries.entries())]
  [reserve_phase4_g5_fids_physical_attempt_v39]  -> DB durable ledger
  [fetchFidsPopulation(q, {fetchAirport: fetchOne, persist: ...})]
server/lib/disruption/fidsCensus_v3.ts fetchFidsPopulation()
  [fetchAirport] -> server/lib/disruption/aerodataboxLimiter_v3.ts
  [normalizeFidsRecord] -> normalized rows/identity candidates
  [persist] -> returned callback from horizon_owner.ts
server/lib/disruption/phase4Gate5AtomicBoundSourceV39.ts
  [persistP4G5BoundFidsDbOnlyV39] -> original/member/binding
scripts/...horizon_owner.ts tryPre()
  [persistP4G5ReviewedPreForCohortV39]
server/lib/disruption/phase4Gate5ScopedPreWriter_v39.ts
  [stageP4G5ScopedPreV39]
server/lib/disruption/phase4Gate5ScopedPreStaging_v39.ts
  [buildPreSnapshot]
server/lib/disruption/preSnapshotBuilder_v3.ts
  [persistPreSnapshot] -> clean.flight_snapshots
```

This is a **runtime conceptual call path**; every helper also has checks, and some wrappers don't literally return straight to the next file without callbacks. Try following each arrow only when the previous function *calls* it.

## Part D — block-by-block method for any 300–1000 line file

Use this template in your own notes:

```text
FILE:
ROLE: (launcher / source adapter / database writer / audit)
CALLER:
INPUTS:
VALIDATIONS:
READS:
WRITES / PAID SIDE EFFECTS:
TIMING CONSTRAINTS:
OUTPUT / LOG:
HOLD OR UNKNOWN CONDITIONS:
NEXT FUNCTION TO TRACE:
```

For example, `phase4Gate5ScopedPreWriter_v39.ts`:
- Caller: reviewed horizon owner.
- Reads: staged source provenance and PostgreSQL clock.
- Writes: at most cutoff-safe `clean.flight_snapshots` rows in a transaction.
- Holds: missing source, identity mismatch, late commit, conflict differing in source/feature provenance.
- Output: inserted vs idempotent vs not-yet-due vs late-classified counts.
- Next trace: `stageP4G5ScopedPreV39`, then `buildPreSnapshot`.

## Part E — real-code exercises (do not run production writes)

1. **Calculate clocks:** Selected T=06:40 PST. Find C24, C6, C90, and W=T+2h. Decide whether sources at 04:00,04:30,05:00 can support C90.
2. **Find each unit:** Identify table/function for (a) original source, (b) normalized member, (c) bound original receipt, (d) saved PRE, (e) POST revision observation.
3. **Explain count discrepancies:** The log says 48 normalized rows and 12 keys. Which value is a denominator for eligible physical-flight PRE, and why might 48 include other rows?
4. **Trace one refusal:** Search for `G5A_FIRST_SOURCE_ASOF_PRE_ELIGIBILITY_VERIFIED` and explain why zero qualified identities stops later paid source requests.
5. **Prove no leakage:** In `P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39`, identify the source availability/retention conditions and frozen T24 anchor.
6. **Prove no retroactive PRE:** Find `MAX_PRE_EARLY_MS`, `LATE_NO_BACKFILL` and `PRE_COMMIT_MARGIN_MS`. Draw the allowed timeline for C90=04:45.
7. **Trace POST:** Find `POSTS`, `PROOF_DEADLINE` and `G5A_POST_AGGREGATE_AUDIT_SQL_V39`. How can a 15-minute *schedule revision* differ from 15-minute actual takeoff delay?
8. **Question the audit:** Why do we insist on the independent read-only role and why can't a `scientificGate5Passed:false` object be casually relabeled PASS just because a script returns successfully?

### Suggested self-quiz answer checks

For exercise 1: C24 = previous day 06:40, C6 = same day 00:40, C90 = 05:10, W = 08:40 PST. All three listed sources could be as-of-eligible **if durably available by 05:10**, but the writer selects the latest qualifying source as of that cutoff and must save PRE within the 3-minute commit window.

For exercise 3: the 12 eligible keys are closer to the cohort denominator; 48 is raw-normalized observation count. Distinct across horizons must be deduplicated by canonical physical identity.

For exercise 7: POST compares scheduled timestamps seen at different observation times; actual runway departure is a different event, requiring different source semantics.

## Additional safe exploration

Reading source with `git show PIN:path`, `rg "functionName"`, `sed -n 'start,endp' file` and GitHub search is nonmutating. Avoid running an entire owner/POST script locally: these are guarded production workflows with real possible paid/DB side effects. You can practice with existing offline `vitest` tests or a disposable database, not the live cohort.

**Completion milestone:** You can walk from a GitHub YAML job to a saved PRE row and back to its source binding, explain each timestamp and count, and state honestly what the later POST label does not prove.
