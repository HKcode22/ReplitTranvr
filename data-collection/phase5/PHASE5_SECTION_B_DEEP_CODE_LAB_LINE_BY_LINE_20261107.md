# Section B Deep Code Lab — How to Read Our Real Phase 5 TypeScript, JavaScript and SQL

**2026-11-07 | Source snapshot:** GitHub `main` at `eca8ff557aece054d131aef18fe0722205ddc1ed`. **Audience:** the project owner who wants to understand the engineering *without slowing down the actual Phase 5 implementation*. This guide only teaches and annotates; it does not execute an API call or SQL. Always open the [actual source file in GitHub](../../server/lib/disruption/) side by side. Source line numbers refer to this commit; future edits can shift them.

**Start with [the plain-language Phase 5 glossary](PHASE5_START_HERE_FREEZE_FIDS_PILOT_GLOSSARY_20261107.md)** for freeze/FIDS/pilot/PRE/POST, then this lab, then [the rest of the engineering field guide](PHASE5_ENGINEERING_FIELD_GUIDE_FILE_BY_FILE_20261107.md).

## Zero — Learn the shape of a code file before reading our files

A TypeScript file is not one giant operation. It consists of **imports** (what it borrows), **types/interfaces** (data shapes), **constants** (fixed parameters), **functions** (reusable blocks), and sometimes a **top-level entrypoint** (what actually runs).

```ts
// TEACHING EXAMPLE — not copied from this repo.
import { Pool } from "pg";                 // borrow a PostgreSQL client
type Airport = { icao: string };          // shape of an object
const maxRows = 4;                        // fixed input
function isValid(a: Airport): boolean {  // function header; returns true/false
  if (a.icao.length !== 4) {              // if condition and its block
    return false;                         // exit this function
  }
  return true;
}
```

**Do you see the braces `{ }`?** They mark a *scope* (block). The function starts at one `{` and ends at its matching `}`. `if`, `for`, `try`, `catch` and object literals can contain their own nested blocks. A semicolon `;` normally ends one statement; a line break alone does not necessarily end a statement. **Indentation** makes nesting easier to read, but JavaScript's brace/token grammar is decisive.

Other frequent symbols: `===` strict equality; `!==` strict inequality; `&&` AND; `||` OR; `!` NOT; `?.` optional access without throwing if object is null; `??` default only when null/undefined; `=>` arrow function; `...` spread existing properties; `[]` array/index; `{}` object literal **or** block depending on context; `<Type>` generics/type parameters; `as Type` TypeScript type assertion (not runtime verification); `export` makes a function available to other modules.

**`async`** makes a function return a `Promise`; **`await`** waits for its result while allowing nonblocking IO. `return` exits the current function; `throw` fails immediately and transfers control to a matching `catch` (or rejects the Promise). `try/finally` ensures cleanup (e.g., releasing a DB connection) even after a failure.

**How do I know if a file “does something” automatically?** A file exporting functions *defines* what could be done. It does not automatically run the functions. Someone must **call** them from a worker, script, test or GitHub Actions workflow. A green unit test tells us the tests called the functions with particular inputs; it doesn't mean a real flight was collected.

## A. Start at the top: Phase 5 code architecture

```text
f.8 scientific experiment definition
    ↓
[Pure] phase6SamplingDecision_v39.ts         choose four airports from a frozen frame
    ↓
[Pure] phase5EarlyPreselectionReadback_v39.ts validate four ALREADY chosen DB rows
    ↓
[Pure] phase5F8CrossoverCalendarFreezeGuard_v39.mjs
       + phase5F8FiniteCandidateSolver_v39.mjs  check/rank calendar candidates
    ↓
[Pure] phase5F8SegmentedSourceCoverage_v39.mjs
       check all exposed source-time windows and proposed UTC REST charges
    ↓
[Database SELECT] phase5CommittedDayGridReadonly_v39.ts
       read real committed calendar/draw rows without changing anything
    ↓
[Pure builder] phase5DynamicDaySourceGrid_v39.ts
       materialize signed FIDS query candidates for real four airports
    ↓
[Pure plan] phase5V0079DailyPreparedQueryProposals_v39.ts
       prepare exact allowed-query and budget proposals
    ↓
[Database INSERT] phase5Stage9V0079CommittedDayPrepare_v39.ts
       commit PREPARED query rows, still NO provider GET or flight PRE
    ↓
[GitHub identity & guarded paid GET] phase5V0080GitHubPrearm_v39.ts
        + phase5ScopedFidsSourceBridge_v39.ts
        + phase5V0079ScopedDbPorts_v39.ts
    ↓
[DB original custody] clean.fids_query_response + flight_population
    ↓
[DB PRE] phase5V0079SingleBoundFlightPreWriter_v39.ts
       + Stage17 independent witnessed T24 + Stage24 T6/T90 anchor guard
```

**Important truth in November 2026:** the Stage23 schema tables are **actually installed** in production, but most source/PRE workers are **staged, not live**, and production collector/witness role grants are not activated. This diagram is a design/data flow, not a claim that every arrow has executed.

## B1. File: `phase6SamplingDecision_v39.ts` — choose the four airport identities

[Open the actual file, lines 22–35 and 110–153](../../server/lib/disruption/phase6SamplingDecision_v39.ts#L22-L153).

**Why?** If we only sample airports that happen to be easy for the API, ML estimates can be biased. We need a prespecified tier/region frame, matched pair replay, stable probability and no future information leaking into decisions.

**What goes in?** `plan: FrozenRunDaySamplingPlan` (fixed run day, seed, regions, anchor, pair policy), `frame: FrameSamplingCandidate[]` (eligible airports) and `statesInput: AirportSamplingState[]` (history known before the draw). **What comes out?** `SamplingDecision` with four `selections` and `stateHash`. **Side effects:** none — no HTTP, SQL or paid request.

**Actual source excerpt (lines 110–122):**

```ts
export function chooseAirportsForRunDay(
  plan: FrozenRunDaySamplingPlan,
  frame: FrameSamplingCandidate[],
  statesInput: AirportSamplingState[],
): SamplingDecision {
  assertFrozenHash("calendar", plan.calendarHash);
  assertFrozenHash("config", plan.configHash);
  if (!Number.isInteger(plan.runDayIndex) || plan.runDayIndex < 1 || plan.runDayIndex > 31) throw new Error("REFUSED_RUN_DAY: invalid run_day_index");
  const states = new Map(statesInput.map(s => [norm(s.icao), { ...s, icao: norm(s.icao) }]));
  const eligible = frame.filter(candidateEligible).map(c => ({ ...c, icao: norm(c.icao) }));
  const byIcao = new Map(eligible.map(c => [c.icao, c]));
  const selections: SamplingSelection[] = [];
```

**Read it line by line:** `export function` allows another file to import it. The three typed parameters are **inputs**, not global variables. The `): SamplingDecision` after the parenthesis is the expected **output type**. The first two calls verify that frozen hashes are in acceptable form. The `if` rejects invalid day indices (1–31). `statesInput.map(s => [key,value])` builds pairs for a `Map`, which gives fast lookup by ICAO airport code. `{...s,icao:norm(s.icao)}` copies a prior object while normalizing its code. `frame.filter(candidateEligible)` removes ineligible airports and `.map(...)` transforms the retained candidates. `new Map(eligible.map(...))` indexes by airport identity. `selections: SamplingSelection[] = []` creates an initially empty **typed array**.

**Actual source excerpt (lines 124–135, inside the *same* function):**

```ts
if (plan.drawType === "PAIR_REPLAY") {
  if (!plan.pairAirportSet) throw new Error("REFUSED_PAIR_REPLAY: exact frozen pair airport set missing");
  for (const slot of ["HUB", "MID_A", "MID_B", "REGIONAL"] as SlotId[]) {
    const frozen = plan.pairAirportSet[slot];
    const c = byIcao.get(norm(frozen.icao));
    if (!c || c.region !== plan.slotRegions[slot] || frozen.region !== plan.slotRegions[slot]) {
      throw new Error(`REFUSED_CELL_EMPTY: replay ${slot} ${frozen.icao} is not eligible in frozen region ${plan.slotRegions[slot]}`);
    }
    if (violates24hWashout(stateFor(states, c.icao), plan.windowStartUtc)) throw new Error(`REFUSED_WASHOUT: ${c.icao} <24h since prior use`);
    selections.push({ slotId: slot, icao: c.icao, targetRegion: plan.slotRegions[slot], isRandomized: slot === "REGIONAL", designProbability: slot === "REGIONAL" ? 1 : null, plannedShare: slot === "REGIONAL" ? null : 1, adaptiveStateHash: null, probabilityVector: slot === "REGIONAL" ? [{ icao: c.icao, probability: 1, drawScore: 1 }] : null, drawType: "PAIR_REPLAY" });
  }
  return { selections, stateHash: sha({ plan, selections }) };
}
```

The **outer `if` block** applies *only* on crossover period-2 replay. The **`for...of` block** runs **four times** (one per slot). `plan.pairAirportSet[slot]` gets the previously frozen airport for the slot. `byIcao.get(...)` looks for that airport in the eligible frame. If missing/mismatched, **throw**, not redraw a convenient replacement. `violates24hWashout(...)` rejects reuse too soon. `.push({...})` appends the selected airport object. The ternary `condition ? A : B` chooses A if true, B if false. Finally `return` exits the function early for replay cases. Below this block the source has separate handling for first-period templates and ordinary days — reading only the first `if` would mislead you into thinking every day is `PAIR_REPLAY`.

**Exercise:** Why is `c = byIcao.get(...)` not enough? Because an airport can exist in the frame but have the wrong frozen region or violate washout; independent checks are needed.

## B2. File: `phase5EarlyPreselectionReadback_v39.ts` — check a historical decision, don't redo it

[Open lines 12–15 and 58–129](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts#L12-L129).

**Why?** One airport choice must be committed *early enough* for T24 source collection. If selection happens after the source should have been captured, that day cannot claim a genuinely prospective PRE.

**Inputs:** `day: PreparedDayForReadback` and four `rows: PreparedDrawRow[]` supplied from a committed DB read. **Output:** `PreparedReadback`; **Side effects:** none, just validation of supplied rows.

**Actual excerpt (lines 64–85):**

```ts
const start = dateMs(day.scheduledStartUtc, "SERVICE_START");
if (![day.calendarHash, day.configHash, day.frameHash].every(x=>SHA.test(x)))
  refuse("UNPINNED_CALENDAR_CONFIG_OR_FRAME");
if (!Array.isArray(rows) || rows.length !== 4)
  refuse("MISSING_OR_DUPLICATED_SLOTS");
const slots = new Set<string>();
const airports = new Set<string>();
const times = new Set<number>();
const selections: SamplingSelection[] = [];
for (const x of rows) {
  const slot = x.slot_id as SlotId;
  if (!SLOTS.includes(slot) || slots.has(slot))
    refuse("INVALID_OR_DUPLICATE_SLOT");
  slots.add(slot);
  const airport = norm(x.selected_icao);
  if (!ICAO.test(airport) || airports.has(airport))
    refuse("INVALID_OR_DUPLICATE_AIRPORT");
  airports.add(airport);
  const selectedAt = dateMs(x.selected_at_utc, "SELECTED");
  times.add(selectedAt);
  if (selectedAt >= start - MIN_PREPARE_LEAD_MS)
    refuse("DRAW_TOO_LATE_FOR_T24_SOURCE");
```

Line-by-line, `.every(predicate)` asks whether **every hash** matches the SHA format. `Set<string>` stores *unique* entries, so `slots.has(slot)` detects duplicates. `for (const x of rows)` iterates **one row at a time**, and the nested block is the checks applied to each row. The `selectedAt >= start - MIN_PREPARE_LEAD_MS` inequality compares **milliseconds since the Unix epoch**; it rejects late picks when the readback wasn't at least 24h30m before the service window. This is a **necessary calendar-level lead guard** — not proof each future flight's actual selected T was already known.

**One confusing point:** `as SlotId` is a **TypeScript assertion**, *not* a runtime validator. The next `SLOTS.includes(slot)` is the actual runtime check.

## B3. Files: `phase5F8CrossoverCalendarFreezeGuard_v39.mjs` and `phase5F8FiniteCandidateSolver_v39.mjs`

[Open calendar validator](../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) and [open solver, lines 40–75 and 100–169](../../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs#L40-L169).

**Why two files?** The guard answers **“Does this proposed calendar obey the rules?”**. The solver answers **“Among a fixed supplied set of candidate calendars, can we find an admissible one, and which is best under a defined objective?”** The guard is like checking whether a solution to an exam is valid; the solver is like systematically trying solutions. Neither magically generates the real provider measurements, verified rights or entire real-world global candidate universe.

### B3a. Reading the numeric “balance score”

**Actual solver excerpt (lines 40–55):**

```js
function balanceScore(days){
 const counts=new Map();
 for(const row of days){
  const week=new Date(row.startUtc).getUTCDay();
  const cls=week===0||week===6?"weekend":"weekday";
  const group=cls+"|"+row.utcSlot;
  counts.set(group,(counts.get(group)??0)+1);
 }
 const avg=31/12;
 let score=0;
 for(const cls of ["weekday","weekend"])
  for(const slot of ["00","04","08","12","16","20"]){
   const count=counts.get(cls+"|"+slot)??0;
   score+=(count-avg)**2;
  }
 return score;
}
```

`Map()` accumulates frequency counts. `getUTCDay()` returns an integer 0 (Sunday) to 6 (Saturday). The ternary defines weekday versus weekend. `group` builds keys like `weekday|08`. `counts.set` stores the previous count (or 0 if absent) **plus one**. The ideal average here is 31 parent days across 12 weekday/weekend × UTC-slot cells, so `avg=31/12` is **a scoring convention**; because weekends and weekdays are different calendar class frequencies, “ideal uniform 31/12” is a design choice, not automatically a measured target distribution. The two nested `for` loops compute `Σ(count − avg)²`; `**2` means square. Lower score = more balanced under this explicitly defined objective.

### B3b. Reading recursion / backtracking

**Actual solver excerpt (lines 102–107, 130–149):**

```js
function dfs(i){
 if(exhausted)return;
 if(i===31){
  if(Object.entries(shapes).some(([k,n])=>shapeCount[k]!==n))return;
  const evaluated=auditP5F8CrossoverCandidate({
   ...p.basePacket,days:selected
  });
  // ...full candidate evaluated at base case...
 }
 // ...select ordered options...
 for(const row of options){
  visited++;
  if(visited>p.maxSearchNodes){exhausted=true;return;}
  if(!earlyValid(row,selected,used,seen,shapeCount))continue;
  const old=new Map(seen);
  for(const slot of slo)seen.set(row.airports[slot],
    Date.parse(row.endUtc));
  selected.push(row);
  shapeCount[row.windowShape]++;
  const left=31-i-1;
  if(Object.entries(shapes).every(([k,n])=>
     shapeCount[k]<=n&&n-shapeCount[k]<=left))
   dfs(i+1);
  shapeCount[row.windowShape]--;
  selected.pop();
  seen.clear();for(const [k,v] of old)seen.set(k,v);
  if(exhausted)return;
 }
}
dfs(0);
```

**Note:** the middle comment is explanatory omission; this excerpt is *abridged from the actual source*; click the link for all branches. `dfs(i)` is a **recursive function**: a function calls itself for day `i+1`. If `i===31`, we've chosen a candidate for all 31 days, so we run the hard validator and score it. Otherwise, try each possible candidate for this day. `continue` skips invalid candidates. `selected.push(row)` chooses a candidate; `dfs(i+1)` explores future choices; `selected.pop()` **undoes** that choice before trying the next one. This is called **backtracking**. `new Map(seen)` snapshots prior airport reuse dates so they can be restored after exploring a branch. `visited>p.maxSearchNodes` stops runaway search; an incomplete search returns **HOLD**, not a fraudulent “no feasible real calendar exists.”

### B3c. What does SAT/UNSAT mean?

- `SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE` = one valid selection found in this **supplied** finite pool.
- `UNSAT_SUPPLIED_FROZEN_CANDIDATE_POOL_ONLY` = exhaustively tried **that specific pool**, found none.
- `HOLD_BOUNDED_SEARCH_NOT_PROVEN_COMPLETE` = ran out of allowed search nodes; cannot prove UNSAT or optimality.

None of these output strings establishes that the 31-batch-day real experiment is already authorized, deployed, or executed. *A synthetic SAT is not a scientific FREEZE.*

## B4. File: `phase5F8SegmentedSourceCoverage_v39.mjs` — source-time intervals and REST budget

[Open lines 17–38, 43–66 and 170–235](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs#L17-L235).

**Why?** The full study includes an inactive gap in 2×2h treatment and up-to-6h windows that may exceed the provider's verified maximum service range. Every actual exposed segment, airport slot and PRE horizon needs FIDS observations whose **receipt/availability** could fall before a cutoff. This file is **pure arithmetic**, not an HTTP caller.

### B4a. Partitioning intervals

**Actual excerpt (lines 47–65):**

```js
export function partitionP5F8ServiceSegments(day,verifiedMaxRangeMinutes){
 const range=integer(verifiedMaxRangeMinutes,1,360,"UNVERIFIED_PROVIDER_RANGE")*MIN;
 if(!Array.isArray(day?.segments))deny("MISSING_EXPOSURE_SEGMENTS");
 return day.segments.flatMap((segment,segmentIdx)=>{
  const start=stamp(segment.startUtc,"SEGMENT_START");
  const end=stamp(segment.endUtc,"SEGMENT_END");
  if(end<=start)deny("NONPOSITIVE_SERVICE_INTERVAL");
  const p=[];
  for(let cur=start;cur<end;cur+=range){
   const stop=Math.min(cur+range,end);
   p.push({
    segmentIndex:segmentIdx+1,
    partitionIndex:p.length+1,
    partStartUtc:iso(cur),partEndUtc:iso(stop),
    segmentStartUtc:iso(start),segmentEndUtc:iso(end)
   });
  }
  return p;
 });
}
```

`day.segments` is an array of **actual exposed segments**. `flatMap` processes each segment and flattens each nested list of provider-range partitions into one array. `verifiedMaxRangeMinutes` must be a reviewed input, not a guessed account capability. `range=minutes*60000` converts to milliseconds. For a 6h segment with verified max 4h, the loop runs twice: `[0,4h)` and `[4h,6h)`. For a 2×2h day with an inactive gap, it processes only the two separate segments, **never filling the gap**. `[start,end)` means *include start, exclude end* so adjacent partitions don't double-count the exact boundary.

### B4b. How source freshness becomes an interval union

In Stage22, each scheduled GET at `t` has a conservative *hypothetical* usable cutoff interval:

`[t + scheduling slip + response/persist time + commit margin, t + maximum permitted source age]`.

The algorithm sorts these intervals and advances `covered` to their combined endpoint. If a new interval starts *after* `covered`, it records a gap with the exact earliest uncovered cutoff. That is why simply making “five calls” without respecting when original responses are available is not enough.

**Actual excerpt (lines 189–206, abbreviated):**

```js
const intervals=g.rangeRequests.map(t=>({
  from:t+latency,to:t+stale
})).sort((a,b)=>a.from-b.from||a.to-b.to);
let covered=start;
for(const {from,to} of intervals){
  if(to<=covered)continue;
  if(from>covered){
    const stop=Math.min(from,end);
    if(stop>covered)gaps.push({groupKey:g.key,
      runDayIndex:g.runDayIndex,
      firstUncoveredCutoffUtc:iso(covered),
      uncoveredSeconds:(stop-covered)/1000,
      reason:"STALENESS_OR_LATENCY_GAP"});
    covered=stop;
  }
  covered=Math.max(covered,Math.min(end,to));
  if(covered>=end)break;
}
```

`.map(t=>({...}))` converts each GET time into an interval object; `.sort((a,b)=>a.from-b.from||a.to-b.to)` orders by start then end time. `for(const {from,to} of intervals)` uses **object destructuring** to read fields directly. `continue` ignores intervals already behind current coverage. `gaps.push(...)` records a scientific missingness reason, not a made-up response. `Math.max` extends the furthest covered cutoff. The actual success flag remains **candidate/planned timing feasibility**, not proof real response bytes existed.

### B4c. REST charge-day versus batch-day

Every actual physical source GET belongs to its **UTC dispatch date**, which could be the day before a service window. A 2×2h *second exposed child* is **a new BASE segment**, not automatically an extra range partition; the *second provider-range partition within the same segment* uses SPLIT units.

The focused CI fixture uses **hypothetical** 50-minute refresh cadence, a hypothetical 240-minute provider max, 60-minute freshness limit and 2 REST units/GET:

`12 slot×horizon × (26×5 + 3×6 + 2×8) = 1,968 GETs`, corresponding to `1,896 BASE GETs (3,792 units) + 72 SPLIT GETs (144 units)`. This is **test arithmetic**, not verified AeroDataBox billing or a live budget authorization.

## B5. File: `phase5CommittedDayGridReadonly_v39.ts` — the first real SQL inside TypeScript

[Open actual file, lines 32–49 and 84–168](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts#L32-L168).

**Why?** A synthetic four-airport candidate set is not the same as an airport draw saved before source cutoffs. This module reads the *real committed calendar and draw rows* in a consistent snapshot. It **does not SELECT provider raw content**, make any FIDS GET, or write PRE.

### B5a. Strings containing SQL

**Actual excerpt (lines 37–49):**

```ts
const CALENDAR_SQL=[
 "SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,",
 "anchor_icao,slot_regions,pair_airport_set,calendar_hash,",
 "config_hash,frame_hash,date_utc",
 "FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1"
].join(" ");
const DRAW_SQL=[
 "SELECT slot_id,target_region,draw_type,selected_icao,",
 "frozen_draw_seed,selected_at_utc,adaptive_state_hash,",
 "probability_vector,airport_layer_design_probability",
 "FROM clean.adb_sampling_draw WHERE run_day_index=$1",
 "ORDER BY slot_id"
].join(" ");
```

The square brackets build a **TypeScript array of strings**, one piece per line for readability. `.join(" ")` assembles a **single SQL string** with spaces. The `SELECT ... FROM ... WHERE ...` is **PostgreSQL language**, not TypeScript syntax — it becomes data (text) passed to the database driver. The `clean.` prefix is the PostgreSQL **schema** containing these tables. `$1` means parameter number 1 and is supplied **separately** by TypeScript; unlike `"${value}"` string interpolation, this protects against SQL injection and preserves types.

### B5b. Connection, consistent transaction, query, and response

**Actual excerpt (lines 94–112, 119–126 and 142–144):**

```ts
if(!pool||typeof pool.connect!=="function")hold("NO_RESTRICTED_POOL");
const client=await pool.connect();
let tx=false;
try{
 await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 tx=true;
 await client.query("SET LOCAL statement_timeout='8000ms'");
 await client.query("SET LOCAL lock_timeout='2000ms'");
 // ...verify restricted current_user and authorization...
 const cal=await client.query(CALENDAR_SQL,[scope.runDayIndex]);
 if(cal.rowCount!==1)hold("SAVED_DAY_MISSING");
 const cr=row(cal.rows[0],"CALENDAR");
 if(Number(cr.run_day_index)!==scope.runDayIndex||
    cr.calendar_hash!==scope.expectedCalendarSha256||
    cr.config_hash!==scope.expectedConfigSha256||
    cr.frame_hash!==scope.expectedFrameSha256)
  hold("SAVED_DAY_PIN_MISMATCH");
 // ...rebuild typed PreparedDayForReadback...
 const draws=await client.query(DRAW_SQL,[scope.runDayIndex]);
 if(draws.rowCount!==4||draws.rows.length!==4)
  hold("FOUR_COMMITTED_DRAW_ROWS_NOT_FOUND");
```

**This excerpt is abridged, not contiguous runnable code.** `pool.connect()` leases a PostgreSQL connection and `await` waits for the connection. `try{...` establishes a cleanup/failure scope. `BEGIN ... REPEATABLE READ READ ONLY` obtains a stable transaction snapshot and prohibits writes. The two `SET LOCAL` statements limit how long it can wait on locks or a SQL statement; they apply only inside the transaction. `client.query(CALENDAR_SQL,[scope.runDayIndex])` sends SQL **plus one bound parameter**. `cal.rows[0]` is the first result row. `rowCount!==1` is a **cardinality assertion**: not missing or duplicated. `Number(...)` converts the returned value for a safe comparison. The second query must return **exactly four already committed airport draw rows**. If something changed, `hold(...)` throws and prevents an incorrect source proposal.

The remainder calls `materializeP5DynamicDaySourceGrid(...)` to build *candidate query plans*, checks the next scheduled GET is still in the future and commits the read-only transaction. Again: a clean `COMMIT` of a **read-only** transaction does not prove a paid GET or write a flight PRE.

## B6. Files: `phase5DynamicDaySourceGrid_v39.ts` and `phase5V0079DailyPreparedQueryProposals_v39.ts`

[Read materializer](../../server/lib/disruption/phase5DynamicDaySourceGrid_v39.ts), then [read Stage8 proposal builder](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts).

These two functions are a **transformation pipeline**: saved calendar/draw inputs → exact source-request plans → budgeted, reviewed **proposed** V0079 allowed-query rows. They are **pure transformations** (no live HTTP or database insert). A `query_digest` binds an exact request identity; a `manifest_sha256` binds the experiment version; a `run_day_index` identifies its parent batch-day; `horizon` defines whether source is being requested for T24, T6 or T90.

`materializeP5DynamicDaySourceGrid()` matches the selected ICAOs to the frozen `HUB/MID_A/MID_B/REGIONAL` template, checks persisted selection provenance, and builds planned service time windows. `planStage8P5DayV0079Proposals()` turns those candidates into the V0079 table's column-shaped records with prospective dispatch cutoff and budget reservations. It cannot **create** rights approval by putting a string SHA into a proposal.

**Block-reading tip:** Find the function declaration by searching its exact name; identify `return` near the bottom; trace each earlier `if (... ) hold(...)` to its input property; distinguish a local `const result = ...` from a call to `pool.query`. If the module has no `Pool`/fetch side-effect and is only processing objects, do not call it a production source collector.

## B7. File: `phase5Stage9V0079CommittedDayPrepare_v39.ts` — now real SQL INSERT inside TypeScript

[Open actual lines 35–45, 152–181, 244–326](../../server/lib/disruption/phase5Stage9V0079CommittedDayPrepare_v39.ts#L35-L326).

**Why?** When four airports have actually been frozen and budgeted, we must store an approved set of **PREPARED** source query rows **before** the real paid source time. This module is a database **writer** and is currently staged, not connected to an approved live entrypoint. It still does not call AeroDataBox.

### B7a. “SQL string + parameter array” line by line

**Actual excerpt (lines 303–311):**

```ts
for(const q of x.queries){
  const values=COLUMNS.map(c=>q[c as keyof Stage8V0079PreparedProposal]);
  const sql="INSERT INTO clean.phase5_fids_allowed_query_v39 ("+
     COLUMNS.join(",")+") VALUES ("+
     COLUMNS.map((_,i)=>"$"+(i+1)).join(",")+
     ") RETURNING query_digest";
  const ret=await client.query(sql,values);
  if(ret.rowCount!==1||ret.rows[0]?.query_digest!==q.query_digest)
    hold("PREPARED_QUERY_NOT_INSERTED_EXACT");
}
```

**Line 303:** loop over all proposed queries in the approved day. **Line 304:** build the SQL **values array** in the fixed order of `COLUMNS`; `as keyof` tells TypeScript how to interpret the property key (runtime checks still matter). **Lines 305–308:** construct an `INSERT INTO` statement. `COLUMNS.join(",")` lists the DB column names. `COLUMNS.map((_,i)=>"$"+(i+1))` generates placeholders `$1,$2,...` — here `_` means “we don't use the current column object,” and `i` is the zero-based array index. **Line 309:** `client.query(sql,values)` gives SQL and values to PostgreSQL as **separate arguments**. `RETURNING query_digest` asks PostgreSQL to send the inserted digest back. **Lines 310–311:** fail the transaction if not exactly one correctly bound row was inserted.

The code also uses `BEGIN ISOLATION LEVEL SERIALIZABLE` to ensure a transactional consistent write, checks `current_user` and explicit INSERT-only privileges, and verifies **the actual calendar, four airport draw rows, daily/cycle/physical-UTC-day budgets**. If a freeze hash or budget fails, the writer refuses rather than pretending a real provider query has been performed.

### B7b. What the SQL looks like after TypeScript builds it

**TEACHING SIMPLIFICATION — NOT a paste-ready production statement:**

```sql
INSERT INTO clean.phase5_fids_allowed_query_v39
  (query_digest, manifest_sha256, run_day_index, ...)
VALUES ($1, $2, $3, ...)
RETURNING query_digest;
```

The actual Stage9 builder fills **all 26 fields** defined by `COLUMNS`, with exact matching placeholders and the same-length values array. PostgreSQL applies table constraints (e.g., unique query digest, valid horizon, max attempts, exact hash formats). Our TypeScript code is the **client**; the PostgreSQL server checks those **constraints** again, independently.

**Important contrast:** `INSERT INTO ... PREPARED` means **the query has been authorized and recorded for future dispatch**. It does not mean the FIDS HTTP GET happened, that a flight was observed, or that a per-flight PRE exists.

## B8. File: `phase5V0079ScopedDbPorts_v39.ts` — SQL functions that reserve REAL paid attempts

[Open actual lines 41–56 and 123–175](../../server/lib/disruption/phase5V0079ScopedDbPorts_v39.ts#L41-L175).

This code is *more dangerous* than a pure solver because its DB methods can **reserve paid physical provider attempts** when an independently approved GitHub owner invokes them.

**Actual excerpt (lines 150–170, abridged for readability):**

```ts
const r=await pool.query(
 "SELECT clean.reserve_phase5_fids_physical_get_v39($1,$2,$3,$4,$5,$6) AS committed_at",
 [ctx.manifestSha256,ctx.exactQueryDigest,ctx.githubRunId,
  plan.expectedEarlyDrawSha256,plan.reviewedProviderRightsSha256,expected],
);
if(r.rowCount!==1||!r.rows[0].committed_at)
  refuse("PHYSICAL_COMMIT_NOT_CONFIRMED");
const a=await pool.query([
 "SELECT reservation_sha256,query_digest,manifest_sha256,github_run_id,",
 "physical_attempt_number,charged_reserved_units,committed_at_utc",
 "FROM clean.phase5_fids_physical_attempt_v39",
 "WHERE reservation_sha256=$1"
].join(" "),[expected]);
```

**This code does two database operations:** the first `SELECT` actually **invokes a stored PostgreSQL FUNCTION** that changes internal reservation/budget tables (read its source under [V0079 SQL migration](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql)); **the word `SELECT` does not guarantee a read-only operation if it calls a mutating function.** The function uses database-scoped checks, unique identities, physical UTC charge-day, source rights fields and irreversible attempt numbers. The second `SELECT` reads back the committed reservation and verifies its identity. **Only after that** may the actual provider GET be attempted; a timeout may still have consumed a charge, so retry is not automatically safe.

`ctx` means “context object”: the signed manifest, exact query digest, GitHub run ID and separate scoped PostgreSQL pool. `expected` is a computed reservation SHA. `P5SourcePorts` is an interface that separates HTTP transport from database mutation. This is called **dependency injection**: a test can supply fake ports; production supplies genuine restricted DB and fetch implementations. No ad hoc paid call should bypass that interface.

### Big lesson: “mixed SQL in TypeScript” is an ordinary backend pattern

```text
Node/TypeScript code: can validate JS objects, choose candidate and call SQL
  ↓ with parameter array
pg Pool: serializes query safely to PostgreSQL protocol
  ↓
PostgreSQL SQL: SELECT tables or call a stored SECURITY DEFINER function
  ↓
Database: checks constraints, roles, clocks, atomic COMMIT/ROLLBACK
  ↓
pg Promise result: rows, rowCount; TypeScript checks exact readback
  ↓
Then, and only then, a separately approved HTTP fetch may occur
```

This is **not** the same as embedding JavaScript inside SQL. The `.ts` file contains ordinary JS/TypeScript *strings holding SQL*, and PostgreSQL runs the SQL on a different server.

## B9. Why does the same program contain “BEGIN”, “COMMIT”, “try”, “catch” and “finally”?

An application transaction often looks like this (TEACHING SIMPLIFICATION):

```ts
const client = await pool.connect();    // borrow one PostgreSQL connection
let txOpen = false;
try {
  await client.query("BEGIN");          // start one DB transaction
  txOpen = true;
  await client.query("INSERT INTO ...", [/* validated values */]);
  await client.query("COMMIT");         // durable database change
  txOpen = false;
} catch (error) {
  if (txOpen) await client.query("ROLLBACK");
  throw error;                          // do not turn failure into PASS
} finally {
  client.release();                     // always return borrowed connection
}
```

**Do not run this snippet:** it contains an ellipsis. `try/catch/finally` is **TypeScript/JS exception handling**; `BEGIN/COMMIT/ROLLBACK` is **PostgreSQL transaction handling**. The first controls code flow, the second controls persistent database writes. These are related but **not the same system**.

Our real Stage9/Stage14 modules explicitly track whether COMMIT has been **attempted**, because a connection failing during COMMIT can create **ambiguous state**: the server may already have committed. Blind retry might cause a duplicate PRE or billable GET. In those cases we quarantine and require independent readback, not hopeful repetition.

## B10. How to trace a single file without getting overwhelmed

For every real `.ts` or `.mjs`, make a five-column note:

| Question | What to inspect |
| --- | --- |
| **Where is it called from?** | Search the imported function name in `tests/`, `scripts/`, `server/` and `.github/workflows/`. No caller = just staged code. |
| **What data enters?** | Function parameters and `interface`/schema definitions. |
| **What comes out?** | Return type/status/fields or thrown errors. |
| **What does it mutate?** | `pool.query` SQL, `fetch`/provider HTTP, file writes, or nothing. A `SELECT some_mutating_function(...)` counts as a mutation. |
| **What is its refusal logic?** | `throw`, `hold`, `refuse`, unique constraints, timestamp/cutoff checks, and ambiguous-COMMIT handling. |

**Study sequence (one file a day if useful; engineering continues in parallel):**

1. `phase6SamplingDecision_v39.ts`: learn type declarations, `.filter`, `.map`, `Map`, `if/for/return`.
2. `phase5EarlyPreselectionReadback_v39.ts`: learn `Set`, duplicate refusal, timestamp arithmetic.
3. `phase5F8FiniteCandidateSolver_v39.mjs`: learn recursion, backtracking and mathematical objective functions.
4. `phase5F8SegmentedSourceCoverage_v39.mjs`: learn array `flatMap`, intervals and sorting.
5. `phase5CommittedDayGridReadonly_v39.ts`: learn `Pool`, `await`, bound SQL `$1`, transaction snapshot.
6. `phase5Stage9V0079CommittedDayPrepare_v39.ts`: learn INSERT + parameter arrays + budget checks + COMMIT.
7. `phase5V0079ScopedDbPorts_v39.ts`: learn a `SELECT` invoking a **mutating stored PostgreSQL function**, source custody and postcommit readback.
8. `phase5V0079SingleBoundFlightPreWriter_v39.ts`: learn flight-specific as-of joins and T24→T6→T90 guarded PRE.

## B11. Exercises with answer key

1. **Braces:** In `for(const row of options){ ... if (...)continue; ... }`, what does `continue` do? **It skips the rest of that loop iteration and tries the next candidate**, not the whole function.
2. **Arrays:** `rows.length!==4` rejects a DB result of three or five draw rows. Why? **Four distinct airport slots are required.**
3. **Type assertion:** Does `x.slot_id as SlotId` validate the database field at runtime? **No.** `SLOTS.includes(...)` does that.
4. **Promise:** What does `await pool.connect()` return? **A database client/connection** (or throw on failure), not a source flight.
5. **SQL placeholder:** In `query(SQL,[runDayIndex])`, what is `$1`? **The first bound parameter**, not a JavaScript variable.
6. **Read-only:** Can a `BEGIN ... READ ONLY` transaction normally insert rows? **No.**
7. **Mutating SELECT:** Is `SELECT clean.reserve_phase5_fids_physical_get_v39(...)` a harmless read? **No; it executes a stored function that reserves paid attempts.**
8. **Hash:** Does matching `query_digest` prove the provider legally permits retained normalized flight contents for ML? **No.**
9. **Cutoff:** If `available_at=08:01` and T6 cutoff `08:00`, can the source appear in PRE? **No**, even if an earlier event timestamp is printed inside the payload.
10. **Recursive solver:** Why does `selected.pop()` follow `dfs(i+1)`? **It restores state for the next possible choice**.
11. **Pilot:** Do 36 FIDS schedule comparisons equal 36 actual takeoff labels? **No**.
12. **Release:** Do Stage23 installed schema, Stage24 typed code, and Stage25 CI role matrices establish final Phase5 scientific FREEZE? **No**: dedicated live grants, actual source and physical/native-T evidence, rights, full prospective pipeline and final audit are separate gates.

## Next engineering, not just teaching

The code path is now concretely identified. Stage23 installed eight V0079/V0080/V0081 tables in production; Stage24 merged witnessed-later-PRE logic; Stage25 merged **disposable-only** four-role ACL tests. We should next validate actual production role identities/privileges, commission *only* reviewed restricted roles and then integrate a genuine authorized GitHub-only source/original → PRE → independently witnessed T24 → T6/T90 → POST chain. No need to rerun the old account/balance or missing-table inventory. All provider-use/physical-leg and long-retention legal questions remain scientifically separate, and the final scientific FREEZE must not be declared by this documentation alone.

**Read the lab at your own pace. The engineering work is continuing independently; there is no exam you must pass before the project progresses.**
