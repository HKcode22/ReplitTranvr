# Start Here: What Phase 5 Actually Means — Freeze, FIDS, Pilots and All the Important Words

**Read this BEFORE the engineering field guide.** Updated 2026-11-07 against live GitHub `main` at `eca8ff557aece054d131aef18fe0722205ddc1ed`. Written as a teaching companion, not a new experiment or a command to run. Source of truth for signed requirements: [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [Phase5 README](README.md).

## The one-sentence purpose of Phase 5

**Phase 5 builds, tests, documents, and accepts the exact scientific *rules and machinery* for the full prospective aviation study, before Phase 6 actually runs its 31 parent batch-day collection.** Think of it as finalizing the experimental protocol and proving that the measurement system is competent, rather than counting a green unit test as one month of real flights.

We need a dataset for travelers that can answer: *At a specific moment before departure, what was knowable about this genuine operating flight, and what happened later?* Our machine-learning model must not learn from tomorrow's final schedule as if tomorrow had already occurred.

## 1. “Freeze” does NOT mean stop development forever

In this project, **freeze** is a *version-control and scientific approval operation*, not a computer lock or command that stops data collection.

We freeze **the experiment's definition**: the allowed airports and strata, randomized sampling seed, 31 ordered batch-day calendar and five matched crossover pairs, the three PRE cutoff formulas, what counts as a physical operating leg, the exact provider API/retention limitations, maximum spending, chosen data fields, label meanings, missingness/STOP policy, and the executable GitHub/SQL revisions.

Why? Consider two ML studies:

- Study A decides *before seeing outcomes* which flights, hours, airports, source fields, and correctness thresholds matter.
- Study B looks at which schedules produced the most convincing results, and then silently changes which days or flights count.

Study B can produce **selection bias, leakage and optimistic evaluations**, even if all its code runs correctly. A frozen, hash-identified protocol lets another person audit whether the goalposts moved **after** observations were known.

### Can we ever update a frozen plan?

**Yes. We authored f.8.** A scientifically warranted change is allowed when documented as a *prospective versioned amendment*. State what failed, the alternative methods, mathematical/economic consequences, the effective timestamp, changed hashes, and what old versus new evidence can legitimately be compared. Re-freeze **before** collecting data under the new version. Do **not** retroactively relabel a missed PRE cutoff as on-time, pretend a prior 4h window was a 6h window, or erase the historical implementation log.

That is exactly why [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) exists: our earlier simplified 31-consecutive-day/4h source coverage code did not fully model the registered 26/3/2 crossover windows. We corrected the **prospective math** instead of falsifying past experiments.

### Freeze, STOP and GO are different

| Word | Precise meaning here | What it is not |
| --- | --- | --- |
| **Freeze** | Approve and pin the protocol, code, evidence and launch inputs to a named version. | A permanent ban on valid revisions. |
| **Scientific PASS / acceptance** | Independent evidence says the defined measurements and gates are satisfied. | “All unit tests are green.” |
| **HOLD** | Prerequisite remains unresolved; do not claim scientific completion or execute a dependent action. | A statement that all prior engineering work was wasted. |
| **GO** | An explicit release authorization for a specified scope, window, and safety envelope. | A general grant to spend anytime or to use data for any purpose. |
| **STOP / kill switch** | Stop specific running collection or deployment when a budget, cutoff, role, or provider risk arises. | The same thing as freeze. |
| **CI green** | Automated tests passed for the exact checked code revision. | Proof a real API request, database migration or future flight observation happened. |
| **Staged / deployed** | Staged = code exists in GitHub, tested or untested; deployed = exact code actually installed/running in target runtime. | A file in a repository automatically running in Replit. |

The current verdict (as of this guide): **Phase5 final scientific FREEZE = HOLD; Phase6 paid collection GO = NO**. This is not the same thing as “we must stop engineering.” We have substantial verified engineering progress.

## 2. What is FIDS?

**FIDS** commonly expands to **Flight Information Display System**. In **this repository**, it means the **AeroDataBox airport-level flight information / flights-by-airport API source**, used to retrieve a list of scheduled/updated arrivals or departures for a requested airport and local time window. It is *not* a physical screen at an airport that we photographed. The software requests data electronically.

A hypothetical AeroDataBox FIDS airport response could tell us about a departing flight: service airport, scheduled departure, flight number, service status and later schedule revisions, depending on actual provider response fields. **Do not assume a field exists, is a physical operating leg, or has certified actual runway semantics unless the real provider original confirms it.**

### FIDS is one source, not the entire study

```text
FIDS (airport flight-list / schedule source)
  → candidate flights discovered and original response preserved
  → eligibility: which one is the real operating flight?
  → freeze provider-native selected departure T for that physical flight
  → PRE snapshots (known at each cutoff)
  → independent later sources: FIDS revisions / Flight Alerts / POST / AIRBORNE
  → observed, missing, censored and uncertainty labels
```

A **codeshare** may be a marketing flight number on another airline's operating flight. We must not count it as a new aircraft operation merely because another FIDS list item exists. A **physical operating leg** is the actual flight operation as distinct from marketing aliases; it must be evidenced, not assumed from a string equality.

## 3. What is “FIDS-only pilot”?

**Pilot** = a small, bounded rehearsal used to find failures in source retrieval, timestamp handling, storage, joins and accounting **before** committing to a full study. **FIDS-only** means that this particular rehearsal tested the *FIDS schedule-information portion*; it was not a certification of the complete Alert → received webhook → airborne/actual runway outcome chain.

Recorded November 6 Phase4 Gate5 pilot evidence (as documented in the repository): **nine original PRE FIDS receipts, 36 on-time conditional PRE schedule observations, three POST originals, and 36 schedule comparisons across 12 conditional identity keys**. These are meaningful **source/schedule-revision** results. They do **not** mean 36 uniquely confirmed physical operating legs, 36 certified actual takeoffs, a complete three-horizon production collection, nor a legal approval of all normalized Contents retention.

**A “schedule revision” is not the same as “actual delay.”** Example: the published scheduled departure changes from 14:00 to 14:30. That establishes a 30-minute change in the published schedule. If we never see an authenticated actual departure event, we cannot call the flight's true runway departure exactly 30 minutes late.

A pilot can legitimately report **partial success and remaining HOLDs**. The point is to measure what works and what needs correcting, not to produce a marketing-style PASS.

## 4. PRE, POST, T and the three horizons

- **T** = one defined, independently authenticated **provider-native selected departure schedule timestamp** for a qualified physical flight. It is frozen as the forecast reference. It is *not automatically wheels-off, gate-out, a later revised schedule, or the time the code ran*.
- **T−24h** = a prediction made 24 hours before selected T.
- **T−6h** = six hours before T.
- **T−90m** = 90 minutes before T.
- **PRE** = the flight's model input snapshot containing only information actually available by that horizon's cutoff.
- **POST** = a later observation used to compare, label, or evaluate what happened after the PRE snapshot.
- **As-of join** = database join constrained by what existed as of a particular historical cutoff; never use a later version to fill an earlier missing value.
- **available_at** = when we actually had the information in durable custody, which may differ from the event timestamp printed inside the API response.

**Concrete example:** Suppose selected T is `2026-11-09T14:00:00.000Z`. The cutoffs are Nov 8 14:00Z, Nov 9 08:00Z, and Nov 9 12:30Z. If a response first became available Nov 9 **08:01Z**, it is too late for the **T−6h** PRE, even if the API describes something that “happened at 07:55.” The snapshot must record the value as unavailable for that horizon.

**No backfill** means we do **not** collect a feature on Wednesday and insert it into Monday's PRE as though it had been available Monday. Mark the earlier feature missing and quantify it. This is essential data-leakage protection.

## 5. ORIGINAL, flight row, PRE row: not the same record

| Record | What it means | Can it prove an on-time per-flight PRE by itself? |
| --- | --- | --- |
| **Physical GET reservation** | DB has irrevocably reserved budget for one attempted real API request. | No — request may fail or return no usable flight. |
| **FIDS original** | Actual response body plus response digest/availability and lawful retention controls. | No — can contain many flights/codeshares. |
| **Normalized population row** | Extracted flight candidate linked to original provider query. | No — membership and first T need validation. |
| **PRE snapshot** | One physical flight, one cutoff, permitted point-in-time features. | Only if its source clocks, identity and COMMIT evidence independently pass. |
| **T24 independent witness** | Separate DB transaction proves an already committed T24 record was visible before the deadline. | Supports timing provenance but not alone source legality/native-T truth. |
| **POST / outcome** | Observed later schedule, Alert or actual-state evidence, with source semantics. | No — it is target/label-side evidence. |

This is why GitHub code may show a green “PREPARED” state while the scientific report still says **zero actual per-flight PRE**.

## 6. Sampling, four slots, 31 days and the five crossover pairs

**Sampling** means choosing which airports/windows/flights will be observed, so we do not accidentally select only easy-to-capture flights or only the largest airports. A **sampling frame** is the eligible set. A **stratum** is a group (e.g. HUB/MID/REGIONAL and geographic region). The four airport slots in each batch-day are `HUB`, `MID_A`, `MID_B`, `REGIONAL`.

**31 batch-days** means **31 planned experimental units**, not necessarily 31 consecutive calendar dates. Their source requests can happen earlier (e.g., T24). The f.8 registered shapes are:

- **26 × 4h:** one four-hour continuous exposed service window;
- **3 × 2×2h:** two separate exposed two-hour segments with a **positive inactive gap** between them;
- **2 × up-to-6h:** a planned exposure window capped at six hours; the actual observed exposure may be shorter and must record why.

A **matched crossover pair** compares a 4h control with an alternative (three split, two longer) while repeating the **same frozen four airport identities** and matching UTC/weekday class and evaluation partition. There are exactly **five pairs**. **Washout** is a safety gap between repeated airports: at least 24 hours from prior service-window **END** to the next START, not from start to start.

**Random seed** = reproducible input to deterministic draw ordering. **Adaptive** means the REGIONAL candidate weights can change using prior available eligible observations; they must not peek at future results before an earlier draw. The four-slot airport selection is persisted early and later workers read it; they should not redraw after the first T24 cutoff has passed.

**Denominator** = what we divide by. Example: 10 eligible flights, 7 on-time PRE snapshots → captured fraction = 7/10. Missing 3 is **missingness**, not proof the flights did not operate.

## 7. API, REST, Alert, webhook, and bills

- **API** = application programming interface: our code requests information from a service using defined operations.
- **REST GET** = read request to an HTTP endpoint; an AeroDataBox FIDS GET may consume billed RapidAPI units. In our source code a provider call is not a local file read.
- **RapidAPI units** = one kind of account consumption. The project's separate **50,000 REST-unit cycle ceiling** protects room for other categories; an account entitlement alone is not permission to spend it all.
- **Alert** = provider service that can send event updates/subscription notifications and has **separate credit accounting**; do not treat an Alert credit as one REST API unit.
- **Webhook** = incoming HTTP message from a provider to our receiver when an event occurs. One callback ≠ one unique flight or one actual takeoff.
- **Receiver** = the endpoint storing and verifying inbound webhook notifications.
- **GET budget** = independently reserved, per actual UTC date of the physical request (may precede the service batch-day); seven REST categories are tracked separately.
- **Timeout/retry** = a request may have been charged even when the client did not get a reply. Blind retry could cost twice; the ledger refuses unknown replay.

An account's historical plan, subscription, quota and price are already documented in GitHub. The **source-use and retention** restrictions are different: buying request units does not necessarily mean we can keep individual normalized flight Content indefinitely for ML or backups. This distinct question remains in [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300).

## 8. Database, SQL, TypeScript and the mixed-language files

Our project uses **TypeScript** (`.ts`), **JavaScript modules** (`.mjs`), and **PostgreSQL SQL** (`.sql`). It is normal to see all three in one codebase.

- **TypeScript** = JavaScript with extra type annotations (e.g., `const airport: string`). Types help catch errors during code checks; runtime validation is still required.
- **Node.js** = the process that executes JS/compiled TypeScript. It can call HTTP endpoints and connect to PostgreSQL.
- **SQL** = language used to ask PostgreSQL to `SELECT` existing rows, `INSERT` new rows, `UPDATE` and `DELETE`, or `CREATE` tables.
- **`pg` / `Pool`** = Node PostgreSQL client library; a pool controls reusable database connections.
- **Transaction** = `BEGIN` / SQL work / `COMMIT` or `ROLLBACK`. An operation inside a failed transaction does not count as committed evidence.
- **Role / GRANT** = database permissions. Source collector, PRE writer and witness writer must not all be superusers.
- **`ON CONFLICT`**, **UNIQUE**, **FOREIGN KEY** = DB constraints for duplicate and relational integrity.
- **`clock_timestamp()`** = actual PostgreSQL wall-clock timestamp at evaluation, unlike `now()`/transaction start semantics.

You will frequently see **SQL written inside TypeScript string literals**:

```ts
// Teaching example (NOT a live Phase5 production script).
const sql = "SELECT selected_icao FROM clean.adb_sampling_draw WHERE run_day_index=$1";
const result = await pool.query(sql, [3]);
console.log(result.rows);
```

Break it down: TypeScript creates a **string** containing SQL; `pool.query` sends that SQL and the parameter array to PostgreSQL; `$1` refers to the **first parameter** (`3`), not literal dollars; PostgreSQL executes it and sends rows back; TypeScript reads `result.rows`. This is ordinary **application code + relational database access**, a common backend engineering pattern. We use parameters rather than concatenating unknown user content into SQL to avoid injection.

**Important:** executing `SELECT` above reads the database; it does not create a flight or call AeroDataBox. A different `INSERT` or `reserve_phase5_fids_physical_get_v39(...)` may change a database or irrevocably reserve provider budget. Read the SQL and called function, not only the TypeScript line.

## 9. Hashes, GitHub, code files and scientific provenance

- **Git commit SHA** = precise version of the entire repository tree.
- **Git blob SHA** = identity of the bytes of one source/SQL file.
- **SHA-256 source digest** = detector of mismatch between original response bytes and later stored representation; not a source license.
- **Manifest** = frozen record of the intended study version, calendar, data-source contract, budget and other scopes.
- **GitHub Actions** = executable workflow described in `.github/workflows/*.yml`; a script existing in GitHub does not mean a job calls it.
- **CI** = continuous integration checks: automated tests on a code revision. Real disposable PostgreSQL tests still use *test data*, not production flight evidence.
- **Idempotency** = re-executing a command must not repeat a costly side effect or duplicate protected source identity.

A hash **binds bytes**; it does **not** automatically prove a human/independent reviewer signed a release, that data rights exist, or that a flight is physically operating.

## 10. What is finished versus still missing (verified November 7)

**Already done:** Stage23 owner executed a source-pinned one-shot **empty-schema-only production install** and returned `P5_EMPTY_V0079_80_81_SCHEMA_DURABLE_INERT`: V0079 six, V0080 one, V0081 one new tables installed; zero PUBLIC grants, zero producer grants, zero new flight rows, zero FIDS GET/Alert CREATE. Stage24's T6/T90 witness-gated code merged after six CI checks. Stage25's four distinct PostgreSQL role permissions tested successfully **on disposable PG16** and merged to `main=eca8ff557aece054d131aef18fe0722205ddc1ed`. These facts are recorded in [#416](https://github.com/HKcode22/ReplitTranvr/issues/416).

**Not finished:** production dedicated roles/credentials and grants; genuinely authorized full 31 batch-day real calendar and observed source GET ranges/latency; linked real FIDS original → T24 PRE → separate committed T24 witness → T6/T90 PRE; independent signed source/native T/leg review and legal normalized Content rights; receiver and POST/Alert/AIRBORNE evidence and independent quality-denominator audit; final Phase5 scientific FREEZE and explicit Phase6 GO.

There is **no need to repeat** the historical RapidAPI account subscription/balance questions, earlier Stage18 absent-table investigation, or successful Stage23 installation. The final scientific status is **HOLD**, but that should not delay ordinary safe engineering and documentation.

## 11. Where to go next

1. Read the [Section B code laboratory](PHASE5_SECTION_B_DEEP_CODE_LAB_LINE_BY_LINE_20261107.md) to learn the real source files with actual line-number references, block scope, parameters, `async/await`, SQL and Postgres transactions.
2. Read the [full 14-lesson engineering guide](PHASE5_ENGINEERING_FIELD_GUIDE_FILE_BY_FILE_20261107.md) for the rest of the pipeline, vocabulary and exercises.
3. Continue tracking [the real Phase5 engineering checkpoint](https://github.com/HKcode22/ReplitTranvr/issues/416) and [release issues](https://github.com/HKcode22/ReplitTranvr/issues/413).

**The learning documents are here for you. They do not block engineering progress, alter the live database, or authorize paid provider access.**
