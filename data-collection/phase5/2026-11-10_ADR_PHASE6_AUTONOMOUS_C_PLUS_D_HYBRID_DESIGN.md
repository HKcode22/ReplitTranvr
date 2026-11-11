# ADR — Phase 6 autonomous, restartable, bounded-parallel C+D controller

**Decision date:** 2026-11-10 (Pacific). **Decision:** ACCEPTED AS THE ENGINEERING ARCHITECTURE DIRECTION BY THE STUDY OWNER; **NOT** a signed experimental protocol amendment, an adopted REST/Alert budget, a tested concurrency value, a commissioned task queue, scientific Phase 5 FREEZE, legal Contents-use grant or Phase 6 paid GO.
**Source of truth:** GitHub main at 7e8f2f137d376b3c930c8f7fad81840340f7aff5 before this documentation PR. [Owner RFC on separate branch](https://github.com/HKcode22/ReplitTranvr/blob/docs/phase5-6-parallel-pre-throughput-and-simple-automation-proposal-20261110/data-collection/phase5/2026-11-10_PROPOSED_PHASE6_HIGH_THROUGHPUT_PARALLEL_PRE_AUTOMATION_RFC.md), [independent audit on this PR](2026-11-10_INDEPENDENT_PHASE6_PARALLEL_AUTOMATION_DESIGN_AND_BUDGET_AUDIT.md), [P0 issue #553](https://github.com/HKcode22/ReplitTranvr/issues/553), [master #416](https://github.com/HKcode22/ReplitTranvr/issues/416). **No production code, migration, scheduled action, provider request, Alert subscription or DB operation is changed by this ADR.**

## READ THIS FIRST — November 11, 2026 at 01:40 Pacific: the owner's plain-language C+D guide

**Audience:** research owner/project manager reading the architecture from start to finish. This explanation is intentionally repeated in a simpler form. You do not need to understand every SQL keyword in the later specification before approving the *general design*. An **ADR** is an *Architecture Decision Record*: it records what design we chose and what still needs to be proven. The two Nov10 documents describe the **design and remaining release checklist**, not a completed or paid-live Phase6 workflow. They do **not** replace the frozen f.8 sampling protocol, previous scientific amendments, final activation checklist, or source-rights review.

### 1. What is a task, what is a lane, and where did 100 come from?

Imagine one real AeroDataBox airport FIDS response contains schedule information for **100 records**. That is **one physical GET**, potentially returning information about **many flights**. Some rows might be duplicate airline codeshares or ambiguous services; the system must first decide which are genuine eligible operating flights.

If hypothetically all 100 are eligible and each needs one **T−6h PRE**, then we have **100 tasks**: each task means “save one flight's truthful T−6h PRE observation by that flight's own cutoff.” If the same 100 separately qualify for T−24h and T−90m too, there could be **300 flight×horizon tasks over time**, but still only **100 unique underlying flights**; three snapshots are not three independent training examples.

A **packet** is the small reviewed instruction for **one flight×one horizon**: which original SOURCE response, exact operating-flight identity, original scheduled time, PRE cutoff, rights/version evidence, and writer scope. A packet is **not a purchased FIDS response** or a new flight. A **96-entry shard** is merely one signed envelope grouping at most 96 packet instructions. For **200 eligible tasks**, pages could be **96 + 96 + 8**. Ninety-six is a software packaging bound, **not** the number of allowed flights, airports, GETs or usable ML examples; multi-page processing should be supported.

A **worker lane** is one simultaneously active piece of PRE work, analogous to one checkout cashier. Four lanes can process **up to four different flight tasks at once**. We proposed trying **1, 2, 4, 8 and 16** simply as *benchmark settings*; AeroDataBox did not demand those numbers. They do not equal API purchases. If each independent transaction takes a hypothetical five seconds and there are 100 tasks:
- **1 lane**: about 100 × 5 = 500 seconds.
- **4 lanes**: ideal continuous-work lower bound 500 ÷ 4 = 125 seconds.
- **8 lanes**: ideal continuous-work lower bound 500 ÷ 8 = 62.5 seconds; with indivisible five-second tasks, at least 13 rounds × 5 = 65 seconds.
- **16 lanes**: 31.25-second ideal lower bound; 7 full rounds × 5 = 35 seconds.

Those times are **math examples**, not the latency actually measured on our Neon database. With too many simultaneous connections, real performance can degrade. We will test, not guess, a production setting.

A **shared three-minute PRE window** means many flights have *different scheduled departure times whose specific horizon cutoffs happen to be near each other*. For example, 100 flights scheduled around 18:00 UTC could all have T−6h cutoffs around noon. We did **not** observe or claim a real 100-flight cohort.

### 2. A real clock example: when do we collect T24, T6 and T90?

Suppose a particular flight is originally scheduled to depart **18:00 UTC on February 10** (illustrative, not a real flight):
- **T−24h:** February 9, **18:00 UTC** is its 24-hour prediction cutoff.
- **T−6h:** February 10, **12:00 UTC** is its 6-hour prediction cutoff.
- **T−90m:** February 10, **16:30 UTC** is its 90-minute prediction cutoff.

These are **three different PRE opportunities for that one flight**, not three times we query every airport each day. Different flights have different cutoffs; the system automatically calculates and schedules each. We must fetch and durably save acceptable SOURCE evidence before each cutoff. The current Stage14 SQL writer opens an eligible window **up to about 3 minutes before the particular cutoff**, allowing a verified write before it becomes too late. For this flight's T−6h cutoff at 12:00, the worker can prearm earlier (for example 11:00–11:15) **without starting a database transaction**: it can be ready as an idle software process, but it only opens a short SQL transaction within the allowed ~11:57:00–11:59:58. At or after the cutoff it must **not fabricate a PRE as though it happened earlier**. That prohibited fake historical insertion is what “**backfill**” means here.

A **database transaction** is a short all-or-nothing set of SQL actions. One attempted PRE transaction checks its SOURCE and flight identity, writes the snapshot if permitted, then **COMMIT** makes it durable or **ROLLBACK** cancels it. A process waiting 45 minutes for the flight must **not** hold a transaction or a scarce database connection waiting idle. The queue/timer can remember the task until it becomes due.

### 3. Option C and Option D are two parts of one machine

**C — Parallel working:** A small number of GitHub Actions jobs each manage several simultaneous lanes, invoking the **same existing Stage14 PRE writer** for different flights. We need not write separate SQL PRE writers. SOURCE ingestion, PRE writing and POST/receiver are three *different types* of writers; those already legitimately have separate modules.

**D — Durable checklist:** PostgreSQL remembers task A was approved, is waiting, became due, was claimed by GitHub job 42, and either produced a verified snapshot, is unknown, was never observed, or was too late. The queue is **a to-do/status ledger**, not another copy of raw AeroDataBox flight information. We first audit existing tables. If they already support correct task ownership/recovery, reuse them. Otherwise a single narrowly scoped **operational queue** may be added *after* reviewed disposable-PG16 tests. This is not a decision to install another table immediately.

**A watcher/guard**, suggested by the owner, is a *separate health-check job* looking at when the GitHub controller last ran, due tasks not started, unknown writes, provider/API balance, live Alert subscriptions, signed STOP, and source expiry. The watcher **does not create flight data** or treat its own success as proof the collected PRE happened. A 4-hour readable owner summary is useful; an operational watchdog should check often enough to notice missed 3-minute write windows (propose a measured 5–10-minute cadence plus proactively prearmed workers, **not** a promise a 5-minute GitHub cron will always start promptly). It should alert or invoke only a separately authorized bounded recovery mechanism; it must never blindly retry a possibly committed flight or spend without the existing permissions. This lets the project manager sleep, and inspect a dashboard when interested.

A **lease** means one GitHub job temporarily owns a queued task; a **fencing token** is an increasing owner generation so a stale old job cannot act as the newest owner. **Atomic claim** means “assign one task to exactly one owner in one completed SQL transaction”; two runners cannot both claim the same task simultaneously. PostgreSQL \`FOR UPDATE SKIP LOCKED\` is a queue-claim technique: take an available task while skipping another worker's locked task. The lock lasts only during a very short claim transaction; no worker holds it while waiting for a flight. **Primary key (PK)** is an identifier unique within a table, and **data residency** means where private records may legally be stored. These are storage/ownership terms, **not new flight data providers**.

A worker may fail before it saves anything; if PostgreSQL returns a proven **ROLLBACK**, a narrowly bounded retry could be separately approved while the cutoff still permits it. **Unknown COMMIT** is different: the database may have saved the PRE even if a network error prevented us from seeing the confirmation. That flight must be quarantined and independently read back; a missing row from one instantaneous query doesn't prove the older transaction can no longer COMMIT. Healthy other flights may continue. **System-wide STOP** is reserved for a shared DB or rights/budget/Alert failure, not one bad flight.

### 4. GitHub jobs ending does not mean the 31 days stop

One GitHub-hosted job cannot run the whole month; its maximum runtime is six hours. A **rolling window job** is a shorter job responsible only for the flights about to become due during its scoped time range. Example: one job covers upcoming 10:00–12:00 cutoffs and another covers 11:45–13:45. Their schedules overlap briefly, but the queue lease lets only one owner perform each distinct task. An early successor can start **before** the first job ends; do not depend solely on an exact immediate completion chain because GitHub schedules can run late/drop and \`workflow_run\` has chain limits. A recurring controller and independent watchdog check the queue. No manual night-time alarm is part of the desired Phase6 design.

### 5. Why 31 batch days, 128 hours, 34 segments, 408 groups?

A **parent batch-day** is one planned sampling/collection study window, **not necessarily one midnight-to-midnight UTC day** or 31 consecutive calendar days:
| Parent-day shape | Count | Active segment count | Maximum active hours |
| --- | ---: | ---: | ---: |
| One 4-hour window | 26 | 26 | 26×4 = 104 |
| 2-hour window + 1-hour gap + another 2-hour window | 3 | 6 | 3×(2+2)=12 |
| One up-to-6-hour window | 2 | 2 | 2×6=12 |
| **Total** | **31 batch-days** | **34 separate active segments** | **128 hours maximum** |

We plan **four airport sampling slots** per parent day, thus 34 active segments ×4=**136 airport×segment opportunities**. Planning those across three horizon source classes yields 136×3=**408 logical groups**. **These are neither 408 actual flights nor 408 paid GETs**. Some source queries may need to be repeated more often, split due to provider range limits, or censored if SOURCE is unavailable. Twenty-one ordinary days still need genuine future adaptive airport selection; ten paired days have planned crossover airport candidates.

The **early draw 72h to strictly more than 24h45m** before the earliest parent window means: choose the four airports **between three days ahead and a little more than one day ahead**. The extra 45 minutes provides planning lead before the earliest T−24h SOURCE/horizon. It does **not** imply a flight's departure is predicted 24h45m in advance, and we cannot retroactively choose airports after looking at their outcomes.

### 6. FIDS refresh and an understandable budget calculation

A **refresh interval** is how often we *would* ask AeroDataBox for a new airport/window FIDS response. Shorter intervals produce **more GETs**, not fewer:

| If one airport-source query runs for four hours | GETs, assuming exact even spacing |
| --- | ---: |
| Every 60 minutes | 4 |
| Every 30 minutes | 8 |
| Every 15 minutes | 16 |
| Every 10 minutes | 24 |
| Every 5 minutes | 48 |

If a hypothetical four-hour segment used four airports × three distinct horizon-source plans, **hourly** refresh means 4×3×4=**48 GETs**. If each actual endpoint request costs Tier2 **2 API units**, that would cost **96 units** for those FIDS calls only. The same hypothetical pattern every 30 minutes would be 96 GETs /192 units. In reality T24, T6 and T90 belong to **different clock times and sometimes different UTC dates**, and real selected segments, partitions, retries and POST may alter GET counts. Do not interpret a GET as a flight: one GET can return many flights and multiple refreshes can contain the same flight.

**50k versus 60k:** the historically verified grandfathered AeroDataBox RapidAPI subscription had **60,000 provider API units per billing cycle**, whereas **50,000 is our own lower project safety ceiling**. We did not voluntarily downgrade the provider subscription to 50k just by setting a research cap. It reserves roughly 10,000 units of headroom *at the start of a fresh historical 60k cycle*, before any spending. Actual currently remaining units and renewal time require a fresh **free metadata-only** check from the true Replit environment, not the unrelated connected Neon account. Provider public website new plans do not establish the owner's grandfathered account quota or rights. “1,900 per day” is a **limit**, not a daily purchase target or a promise 31×1,900 fits inside one billing cycle.

**Alerts and why 58,900 was quoted:** an Alert credit is charged when AeroDataBox *sends a flight item notification to our webhook*, not when we save one SQL PRE. We may subscribe by reviewed airport/time scope; AeroDataBox asynchronously calls the published Replit webhook when a qualifying update occurs. We store and acknowledge the original, reconcile provider SEND cost, and issue an owned **STOP/DELETE**. Alerts and FIDS can overlap; FIDS is normally used to define the studied population and reviewed scope, but an individual Alert does not have to wait for an exact FIDS GET to return. A **flight-by-airport alert is NOT a complete denominator** of all flights. SOURCE, PRE, Alert, POST and STOP are separate observation streams.

The planned cap **1,900 Alert credits/day** means “do not authorize more exposure than this without reapproval,” **not** that 1,900 credits are guaranteed available or must be used. For 31 days, *if* we tried the maximum every day: **1,900×31=58,900 Alert SEND credits**. On November 7, we observed a **historical** credit balance of 1,830. Protecting 1,000 of those left **830** hypothetically spendable at that instant. Hence 58,900−830=**58,070 new credit refills** would be required in that *extreme example* (and refilling one Alert credit normally consumes one API unit). That demand could exceed the 50k single-cycle study limit **even before FIDS/POST**. This is a warning about the maximum, **not a prediction, a planned invoice or today's credit balance**. The owner is willing to authorize future refills, but each must fit an actual reviewed balance/cycle/budget. Do not silently transfer budget categories.

The **seven REST categories** are simply seven separate accounting buckets, created in existing **V0082/V0083 SQL**, not seven flight providers:
1. \`FIDS_BASE_UNITS\` — planned normal airport FIDS GETs;
2. \`FIDS_SPLIT_UNITS\` — extra GETs needed when one time window must be split into provider-supported ranges;
3. \`FIDS_RETRY_UNIT_BUDGET\` — reviewed exceptional GET retry for the same source request, not new research population;
4. \`VALIDATION_UNIT_BUDGET\` — permitted provider validation/inspection calls;
5. \`OUTCOME_REST_UNIT_BUDGET\` — POST/outcome provider calls;
6. \`HISTORY_BOOTSTRAP_UNIT_BUDGET\` — approved historical baseline queries;
7. \`DIAGNOSTIC_UNIT_BUDGET\` — approved diagnostic calls.

**Alert SEND credits are separate from these seven REST request categories**, although paid Alert refill can reduce overall REST-unit headroom. A reservation before a paid GET means a short SQL transaction checks the approved category, actual UTC charge date and remaining units, and writes an allowed-spend record **before** allowing the physical HTTP call. A reservation is a *permission to attempt* that exact request; it is **not proof that a provider response was saved**. Saving the real response with provider arrival/storage clocks and a bound SHA makes the original authentic. “Normalized” means transforming the provider's nested response into consistent flight rows while keeping lineage, codeshare labels and missingness. **TTL** (*time to live*) is how long data may be held under the verified rules.

### 7. What is “signed policy”, “native T” or “private packet materialization”?

The primary flight-data provider is **AeroDataBox**, not a bunch of mystery services. “Source class” distinguishes **the kind of AeroDataBox evidence** (airport FIDS schedule, Flight Alert callback, later POST status); optional NOAA weather is a **separate weather feature source** and not an airline schedule. We cannot silently replace the primary ADB flight source.

“**Native T**” is the provider's actual first scheduled departure timestamp for the identified *operating* flight; it must be distinguished from later revised schedules. “**Semantics**” simply means *exactly what the field means*. “**Source class verified**” means independently checked which ADB endpoint returned it, and whether a marketing codeshare, conditional schedule or actual operated leg is being interpreted correctly. A SHA-256 hash proves byte equality to a reviewed expectation; **it is not proof the data were licensed or the flight truly flew**.

The **signed policy** is an approved instruction saying “for these future airports/days and this verified flight source, create one task for every eligible independent flight under these specific identity/time/retention rules.” The generator can then prepare **hundreds of private instructions automatically**, instead of a person signing each one. **Materialization** simply means converting the approved rule + real saved SOURCE into a concrete task/packet record. “Private PK/residency” means keep a stable unique database task ID and keep provider-derived details in an authorized private database/storage location with verified retention; **do not automatically write licensed AeroDataBox original content to this public GitHub repo**. The independent source-use and physical-identity checks are still open, so no live automatic signing is authorized yet.

### 8. Watcher, weather, second month, and what is not finished

- **Watcher idea adopted as a design requirement:** a status-only operational heartbeat/watchdog for GitHub job liveness, due-task backlog, unknown COMMIT, current licensed-source/rights state, seven REST budgets, provider Alert balance and owned STOP. Record what it saw and notify the owner only for meaningful failures; a readable four-hour daily-style summary is optional. A watcher must not secretly buy provider GETs.
- **Weather is NOT fully integrated.** Existing \`phase4Gate5NoaaMetarReceipt_v39.ts\` decodes free NOAA **METAR** (*observed conditions at an airport weather station*). \`phase4Gate5WeatherAsOfFeature_v39.ts\` selects an airport-specific weather record that was **already issued, obtained and durably stored before the flight's PRE cutoff**, limiting METAR age and station proximity. It does **not** prove full origin→destination→en-route weather coverage. Departure-airport weather, destination-airport weather at predicted arrival (from a genuinely issued forecast) and en-route route-cell weather are **three distinct feature roles**. To claim route weather we would need a verified route/waypoints/altitude/ETA and spatial+time matching with relevant TAF, SIGMET or grid forecast, all actually issued before PRE. If not available, report optional route weather **MISSING**, not unrelated airport data. Existing Stage14 \`buildPreSnapshot({features:[],scheduleVersion:null})\` is evidence of a real remaining *ML feature join* gap; do not claim model readiness.
- **Second month:** Phase7 can train on the first prospective month while an independently approved second prospective manifest continues collection and later temporal validation. It requires a new actual provider budget/renewal, rights and freeze; it cannot silently reuse 31-day paid permissions.
- **Not completed by this ADR:** production queue table/roles inventory, true AeroDataBox/Neon account balance, measured actual p99 PG16 per-flight performance, automatic signer/PRIVATE packet storage, 31 real scheduled future dates and 21 future draws, full POST/receiver/Alert STOP, cutoff-safe route/weather/historical ML features, independent Phase5 scientific FREEZE, separately signed Phase6 paid GO. These are **engineering tasks ahead**, not reasons to redo Phases 1–4.

## 1. Decision in one paragraph

Implement **C+D as a small, restartable GitHub-only controller with bounded parallel PRE workers AND durable per-flight task state**. Use the original serializable Stage14 one-flight PRE writer concurrently across independent flight/horizon identities; never implement a second PRE SQL writer. Use actual already-installed SOURCE/flight/witness/POST/budget databases as evidence. Reuse any existing durable task/attempt table that genuinely supports atomic claiming, unique identity, per-task terminal states and separate uncertain-COMMIT readback; if those requirements do not fit installed schema, add **one minimal operational queue table/function only after read-only catalog+disposable PG16 proof**. Never create duplicate SOURCE, PRE or budget tables. Preserve source rights and true cutoff; relax eight sequential limit, one GH child per flight, four dispatches per 10min, two-minute clustering, “one ambiguous flight stops unrelated healthy flights,” and manually signing hundreds of flights one by one (subject to an independently approved deterministic signed POLICY). Start with a small number of horizon-window GH jobs and benchmark lanes 1/2/4/8/16; **the actual live lane count remains unapproved until load tests**. Controller is one LOGICAL ownership policy, not one GH job lasting 31 days.

## 2. Plain-language glossary

- **RFC** (*Request for Comments*): an engineering proposal for review. **ADR** (*Architecture Decision Record*): the adopted design direction and reasons; does not turn on live systems.
- **One FIDS GET**: one billable AeroDataBox airport/window HTTP request. The response may include MANY scheduled flight records (some duplicate marketing codeshares). **One GET != one flight != one PRE snapshot**.
- **Flight × horizon task**: e.g. real operated Flight A at T-6h, with its OWN scheduled-native departure T and permissible write cutoff C=T-6h. Flight A T-24 and T-90 are OTHER tasks; don't count them as three independent physical flights.
- **Worker**: running code processing a task. **Lane**: one simultaneously active database-writing task. Four lanes = four independent one-flight Stage14 transactions at the same moment, not four new scripts/SQL table copies, airport sites or API GETs. A **semaphore** is a software counter that guarantees the configured maximum simultaneous lanes.
- **Latency**: duration to commit+read back one flight, including tail latency p95 (95th percentile) / p99 (99th). **Overlapping cutoffs**: several flights have PRE write windows at similar seconds. Existing Stage14 lets a task commit starting 180s before its own C and finishes proof before C with at least 2s last pre-C safety margin.
- **Queue**: persistent checklist of approved eligible work, including status/deadline/owner. It survives process shutdown. **Lease**: temporary ownership held by one GH job. **Fencing token**: monotonically changing ownership generation to stop an old job from acting as current owner.
- **Reconciler**: a fresh restricted READ ONLY observer checking the exact immutable database snapshot after a possibly lost COMMIT acknowledgement. The queue is NOT itself the reconciler.
- **Prearmed**: job starts early, authenticates permissions, loads work, and idles OUTSIDE a held DB transaction until each task is within its own genuine deadline window.
- **Scientific freeze**: approved population, source uses, prediction target, immutable times and budget. **Paid GO**: later distinct authorization to spend. Neither follows from this ADR.

## 3. Worker graph, including handoffs under GitHub's 6-hour job limit

```text
                    PROSPECTIVE SIGNED RESEARCH POLICY (not provider Contents)
                             calendar / day & early 4-airport draw
                              + actual per-cycle/day 7 REST caps
                                + independent Alert caps and STOP
                                           |
                  periodic GitHub scheduler / optional completion fast path
                       (one logical controller, idempotent)
                                           |
               SOURCE reservation → paid FIDS GET → original durable save
                         → normalized population and source UTC
                                           |
              private independent native/rights review → deterministic
                     per-flight/horizon permit generator
                          (reuse #555/#558/#559)
                                           |
                DURABLE QUEUE / EXISTING EVIDENCE TABLES (D)
                  PENDING / DUE / CLAIMED / PROOF / UNKNOWN
                                           |
          +--------------------+--------------------+
          |                    |                    |
       GH job 1             GH job 2             GH job 3
       bounded pool         bounded pool         bounded pool
         c lanes              c lanes              c lanes
          |                    |                    |
          +------------ Original one-flight Stage14 ------------+
                   individual PostgreSQL transactions, own C
                    post-COMMIT readback, one flight at a time
                                           |
                independent per-flight reconciliation / daily QA
                                           |
                    POST original / Replit raw-first receiver
                    / Alert owned lifecycle / automatic STOP
```

- **No 31-day process:** GitHub-hosted jobs last at most six hours; use substantially shorter **rolling horizon-window jobs** with capacity verified by tests. For an up-to-six-hour active segment, split into multiple shorter windows; do not pin the whole segment to one almost-expiring GH job.
- **Preferred handoff:** schedule the next job **before** the old one expires; both may briefly overlap. Each claims only its own work via a transaction/lease/fence. Completion-triggered `workflow_dispatch` can accelerate a handoff but is NOT the only trigger. A recurring GitHub controller tick and an independent scheduled watchdog restart the appropriate window after dropped/slow jobs; the critical PRE task's true clock is PostgreSQL, never the scheduled trigger timestamp. Actual tick cadence (e.g. trial 5–10min) and prearm lead (trial 45–90min) are *benchmark inputs*, not guaranteed reliable start times.
- **GH events nuance:** `workflow_run` cannot chain over three levels, `workflow_dispatch` is an explicit event exception, and new jobs are not guaranteed to start within seconds of the old job finishing. Never promise a zero-second handoff. `cancel-in-progress` should not cancel unrelated flights, and broad default GitHub concurrency groups may replace pending runs.
- **Time-aware scheduler:** tasks that are still waiting for their individual window belong in a lightweight timer heap / DB due index OUTSIDE active transaction semaphore. Only ALREADY DUE tasks consume active write lanes; use earliest-own-deadline-first, not sequential `for await` for all flight packets.

## 4. Minimum durable D semantics; one queue only IF existing tables cannot provide it

Control-plane queue KEY proposed: `SHA256(manifest | source_day_registry | source_query | canonical_operating_flight_instance | horizon | selected_native_T | own_cutoff | packet_SHA)`. Must not use just flight number or job ID. DB UNIQUE for the accepted scientific grain must be independently verified (existing `clean.flight_snapshots` uses `ON CONFLICT(flight_instance_id, horizon, prediction_cutoff_utc) DO NOTHING`; Stage14 also uses `pg_advisory_xact_lock`). **Specific risk:** the existing key includes cutoff. If the same operated flight+horizon is presented with TWO changed scheduled-native T values and therefore two different cutoffs, the existing three-column uniqueness alone does not prevent two separate PRE snapshots, and an advisory lock only serializes overlapping transactions rather than forbidding later repeats. Verify that immutable first-selected-T identity plus existing triggered grants prevents this; otherwise evaluate an additive qualified `UNIQUE(flight_instance_id,horizon) WHERE prediction_state='PRE_DEPARTURE'` or equivalent reviewed owner invariant **on disposable PG16 first**, after checking cross-day legitimate IDs and prior installed data. Never blindly add that index on production. Avoid a queue schema storing raw provider Contents or exposing dynamic flight records through public GH Actions.
```text
SOURCE_ELIGIBLE → REVIEW_PENDING → APPROVED_PENDING → PREARMED
                                          |
                                    DUE → CLAIMED
                                          |
                                      WRITE_STARTED
                                   /          |         \
                        ACK+READBACK        UNKNOWN   proven PRE-C rollback
                            |                  |               |
                     VERIFIED_ON_TIME   READONLY_RECONCILE    SAFE_NOT_WRITTEN
                                               |
                                  exact committed → VERIFIED
                                  no safe proof   → UNKNOWN/HOLD
                                  deadline gone   → CENSORED_MISSED
```
Statuses are operational metadata and cannot replace independently saved scientific source and snapshot. Atomic claim can use `FOR UPDATE SKIP LOCKED` only on the **operational queue**, not on research denominator queries; short transaction updates owner/lease/token then releases locks. Never hold a claim lock for a 30-minute prearm wait. No automatic replay of `WRITE_STARTED` merely because an old lease expired; first fence and independently reconcile uncertain COMMIT. Source candidate, missing-T24, codeshare uncertainty, no native T, POST pending, late cutoff and nonresponse remain in daily denominators; no convenient-flight selection.

**Roles:** reuse the existing restricted PRE-only writer and existing auditor read-only roles. Grant queue claim/status writes via a narrowly reviewed function or a MINIMAL separate least-privilege permission if needed. Do not let a generic runtime app login edit scientific source originals, snapshots or rights evidence. Existing roles and V0079–V0083 have been commissioned; do not rerun those installers. Connected Neon currently exposes no accessible live project: production task-table/index/role/compute readback is pending, and no existing durable PRE lease table was verified through live DB. The GitHub migrations already have SOURCE physical reservations, independent T24 witness, 7-category REST and other REST reservations; those are NOT a full per-flight lease/status queue by themselves.

## 5. One concrete flight scenario, with 100 overlap tasks

Suppose Flight A has initial independently verified native scheduled departure T=18:00 UTC and a T-6h cutoff at 12:00 UTC. Authorized SOURCE evidence must be saved before 12:00. Controller prearms a job around 11:00–11:15 (illustrative), then marks A eligible; its waiting state occupies no DB transaction lane. Stage14 permits the actual writing attempt in approximately 11:57:00–11:59:58, checking again against PostgreSQL `clock_timestamp()`; the committed, verified PRE cannot be backdated after 12:00.

If 100 other independently eligible flight/horizon tasks have overlapping 3-minute windows, an **ideal and entirely hypothetical** five-second Stage14+readback per task would take 100×5=500 s with one lane, 125s with 4 lanes or 62.5s with 8. The ideal concurrency lower bound is `ceil(N × measured_safe_latency / effective_window)`, but rising DB p99 and startup jitter can invalidate it. We must measure 1/2/4/8/16 lanes on actual Stage14 using disposable PG16 representative data, including serializable conflicts, true PG16 clock, end-of-window contention, invalid/late source and missing witness.

If Flight A becomes `COMMIT_UNKNOWN`, only A should be quarantined and independently checked. B/C/D remain eligible if shared DB, rights, STOP and budget are healthy. A fresh missing-row SELECT is *not* proof that an old in-flight transaction cannot commit; fencing+unique identity+proven old owner end+time-safe policy must be checked before any separately authorized new attempt. No retrospective repair or silent double-PRE.

## 6. Budget understanding (same 31 batch-day experiment, NOT fabricated flight counts)

**Account evidence:** historical grandfathered Team Ultra had a verified 60,000-unit monthly entitlement, but the project separately imposes a **50,000-unit cycle ceiling** and a ≤1,900 REST-unit actual UTC day limit in installed V0079 (with seven physically assigned category caps V0082–V0083). Current remaining balance and subscription rights are not verified from this ADR. Four slots/day are airports, NOT four flights. There are 31 parent batch-days (26 four-hour, three split 2+gap+2, two up-to-six-hour), max 128 active segment-hours and 34 segments; four slots × three horizons = 408 **logical airport/segment/horizon target groups**, not 408 API calls.

**One simple hypothetical four-hour service segment:** one FIDS GET per HOUR for four airports and three distinct horizon source plans means `4 hours × 4 airports × 3 horizon source plans = 48 physical GETs`. If the correct account endpoint price is Tier2=2 units, `48×2=96 REST API units`. A 30min hypothetical cadence doubles to 96 GET / 192 units for that segment. These do NOT account for API provider maximum query range, partitioning, T24 sources occurring a day earlier, GET retries, POST/outcome REST, private source rights, actual UTC billing day, Alert SEND or actual unique operating flight count. **The prior 128h×4×3×frequency table was only a rough upper exposure sensitivity; do NOT freeze one uniform refresh cadence from that table.**

**Critical cross-budget arithmetic:** Max REST 1,900 units/UTC day ×31 = 58,900, which is **greater than 50,000 project-cycle ceiling** if all 31 occurred in one billing cycle. Actual multiple cycles change the calculation; daily cap is a guard, not a spending goal. A 50k single-cycle no-other-cost division gives 1,613 units per batch-day average; real allowable FIDS is LESS after POST/retry/validation/history/diagnostic costs, Alert refills, protected floors and date boundaries. A FIDS Tier2 price of 2 units per GET does **not** mean 2 units per returned flight.
**Alert credits separate:** owned 1,900 SEND credits/day is only a CAP. If every one of 31 batch-days actually spent 1,900, 58,900 credit SEND exposure would be required. Historical Nov7 1,830 credit balance minus 1,000 protected floor = 830 old potentially spendable credits, **not today's balance**; the remaining 58,070 would require refills (which consume API units at 1:1) if one hypothetically tried that use from the same old balance. Hence full maximum Alert exposure is not pre-funded under a 50k single-cycle project budget. Preserve real per-subscription delayed SEND settlement and hard STOP before exposure becomes unaffordable.

**Budget strategy:** a research-approved, prospective, tier-aware priority policy first reserves independently verified source/POST/diagnostics/Alert floors and 7 categories on the physical UTC charge day, next chooses source refreshes based on genuine expected marginal *eligible flight×horizon with valid POST* yield, population coverage and site strata, not total raw rows. Spend no extra FIDS GET just because 20 database workers are writing snapshots from one saved source. Never assume unused POST or Alert can silently fund source without a signed budget amendment. A month-two extension needs separately accepted budget/cycle and forward source/license protocol, not automatic max-rate purchase.

## 7. Source and machine learning accuracy: engineering must create useful as-of examples

Existing Stage14 in `phase5V0079SingleBoundFlightPreWriter_v39.ts` calls `buildPreSnapshot({features:[], scheduleVersion:null})`. It produces source-bound PRE timestamps, NOT a feature-complete predictor record. **Reuse** `historicalFeatureStore_v3.ts`, `phase4Gate5WeatherAsOfFeature_v39.ts`, `phase5RouteAndModelDataSupportAudit_v39.mjs`, `exploratoryMlInputAudit_v39.ts`, append-only clean.flight_snapshots and real original+event stores. Define an approved **as-of feature-view/manifest** joining flight→route, verified available historical weather/airport/carrier/tail/preceding-leg metadata and SOURCE versions only if actually before the task cutoff. Optional unavailable variables are NULL with reasons and do not suppress legitimate PRE. No source-use certification or feature materialization by this ADR. Existing sample is four owner-selected HUBs, five paired crossover sets, 21 ordinary future adaptive days; preserve signed inclusion probabilities and protected chronological test. Raw row counts and repeated T24/T6/T90 snapshots are not independent flights, and provider schedule revision is not automatically wheels-off physical delay.
**Month 2** may be independently approved as a NEW prospective manifest/authorized provider cycle while models train on month 1; freeze month 1 evaluation before looking at month 2 labels and use month 2 for genuine later temporal validation, not outcomes-dependent sample changes. Have an owner-facing read-only daily report and optional user-controlled manual observability, but **never a required human morning/night login** for collection continuation.

## 8. Tests and acceptance before a future production implementation and scientific FREEZE

1. Read-only production catalog and index/role/compute/connection inventory (current Neon connector returns no projects). Confirm whether existing attempt tables suffice for atomic durable PRE claims, uniqueness and fenced recovery; if not, stage **one tiny additive operational queue** in disposable PG16, no immediate live migration.
2. Nonpaid **disposable PostgreSQL16** stress tests: same eligible/censor population and real Stage14 SQL, lane counts 1/2/4/8/16, 50/100/250/500 tasks in overlapping 1/2/3/5/10min cutoffs, dense HUB/MID/REGIONAL strata. Measure ontime PRE / ALL eligible by horizon/tier, GH job start p95/p99, Stage14 complete + postcommit readback p95/p99, serializer 40001, 40P01, lock waits and CPU/pool/connection headroom. Compare original sequential and one-child/flight baselines.
3. Failure-injection + continuity: duplicate dispatch, same packet overlapping GH jobs, stale lease, wait outside DB locks, real GH schedule delay/drop, cancellation before/after COMMIT, uncertain COMMIT, queue restart across job limits, separate per-flight vs global circuit breaker, source rights revoked/expired, provider GET budget and webhook Alert SEND overshoot, T24 missing with honest v2, POST silence and exact UTC midnight accounting. Validate original writer still has exclusive immutable SQL authority.
4. Safe automatic policies: approved deterministic source-native flight packet generator with privately stored actual provider content, signed exact code/source-day version and independent audit. **No public per-flight dynamic Contents** in this PUBLIC GitHub repo unless independently lawful. No manual signature per packet when signed POLICY correctly defines complete sampling and joins, but no generated SHA self-approves native physical identity or legal ML rights.
5. Real integration: actual signed upcoming calendar + 21 legitimate future early site draws, SOURCE original, native selected T, real PRE/horizon/missingness, V0081 witness, V0083 physical POST and raw-first receiver + STOP, real REST seven-category and separate Alert balance ledger, as-of feature vector and one read-only daily dashboard. Independently adopt schedule-revision first-cycle target only if objectively valid, or physical actuals if qualified; never fabricate labels.
6. Independent Phase5 scientific FREEZE PASS/HOLD using actual evidence, then separate signed paid Phase6 GO. **No new paid experiment, cron, database writes or permissions from this document.** If measured throughput is still limited, document unbiased per-stratum capture and a prospective bounded reduction to a scientifically defensible sample; never silently cherry-pick successful packets.

## 9. Why this is supported by real references rather than architectural guesswork

**Official platform 2026:** [GitHub Actions six-hour/job and 256 matrix maximum](https://docs.github.com/en/actions/reference/limits); [scheduled jobs can delay/drop, three-level workflow_run chain cap](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows); [workflow_dispatch token exception](https://docs.github.com/en/actions/concepts/security/github_token); [job concurrency/queued pending replacement](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency); [public-repo standard hosted GH runner billing](https://docs.github.com/en/actions/concepts/billing-and-usage); [PostgreSQL16 SERIALIZABLE 40001](https://www.postgresql.org/docs/16/transaction-iso.html), [retry policy](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html), [transaction-level advisory locks](https://www.postgresql.org/docs/16/explicit-locking.html), [SKIP LOCKED queue semantics](https://www.postgresql.org/docs/16/sql-select.html); [Neon connection pooling, last updated 2026-10-19](https://neon.com/docs/connect/connection-pooling) — 10k client acceptance is NOT 10k actual DB writes, transaction pooling prohibits session-level SET and session advisory locks; benchmark existing SET LOCAL / pg_advisory_xact_lock with exact least-privilege credentials before choosing pooled endpoint. [Official AeroDataBox pricing](https://aerodatabox.com/pricing/), [2026 Flight Alert SEND credit guide](https://aerodatabox.com/flight-alert-api-2026/); current plan/channel/rights subject to independently verified active owner evidence.
**Aviation methods:** [Li et al., 2024, flight delay propagation review](https://doi.org/10.1016/j.tre.2024.103525) surveys heterogeneous sources/network dependence; [2026 ML delay systematic review, 72 studies](https://doi.org/10.1016/j.asoc.2026.115761) emphasizes external weather/uncertainty/operational validation; [Sadeek et al., 2026 Japanese domestic delay and conformal uncertainty](https://doi.org/10.1016/j.jairtraman.2026.103037) reinforces temporal/network context and predictive uncertainty. These papers do NOT prescribe the number of GitHub jobs or Neon transaction lanes; local benchmarking must do that.

## 10. Non-goals / no false closure

Do NOT: run a GH-hosted 31-day job, assume second-to-second guaranteed handoffs, put one GH workflow per flight, rewrite/bypass Stage14 source timestamps, reinstall B0062/V0079–V0083, re-purchase historic FIDS pilots, manually maintain 31 daily jobs, create a redundant source/prediction table, publish licensed provider Contents in public workflow logs, treat missing POST as on-time, silently auto-refill Alert credits or set Phase6 paid GO based on old balance, treat >96 page limit as study sample cap or pretend one SHA is legal permission.

**This ADR is the owner-approved design DIRECTION; bench results and actual prospective scientific/paid freeze remain separate reviewable evidence. It is safe to merge as documentation only without authorizing running workers.**

## 11. Owner's endgame code-reading map (as of Nov 11; old modules are reused, not recreated)

**Read in this order** if you want to follow an actual flight through the system. All paths are relative to repository root. “Existing tested” means code exists and has offline tests; it does **not** mean live Phase6 has run. “Prototype PR” means new nonpaid offline work under separate review, not an active workflow.

| First read / subsystem | File you can open in GitHub | Why it matters |
| --- | --- | --- |
| 1. The proposed future **31-day shape** | \`server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts\` | Describes 26 ordinary, three split and two extended parent days; keeps 21 future adaptive airport draws UNKNOWN until real early selection |
| 2. Real early airport selection | \`server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts\` | Selects the four airports prospectively, under the real early-draw rule |
| 3. Independent chosen-airport readback | \`server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts\` | Proves from the database which four airports were actually saved |
| 4. Horizon/grid coverage | \`server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs\` | Calculates FIDS source coverage, 34 segments, seven categories and real provider source time-range partitioning |
| 5. Seven REST category caps | \`server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs\` | Reviews planned spending and distinct request categories; does not spend by itself |
| 6. SOURCE upcoming queue observer | \`server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39.ts\`; \`scripts/v39_phase5_github_source_upcoming_queue_readonly_v39.ts\` | Finds proposed due airport SOURCE work without purchasing it |
| 7. SOURCE scheduled workflow | \`.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml\` | Current inert/default-off control-plane design, not a paid-ready full collector |
| 8. Exact paid SOURCE owner | \`scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts\` | Existing reviewed SOURCE-permit/physical-get/original binding path; only active with separate GO |
| 9. The actual-source per-flight reviewer | \`server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39.ts\` | From one authentic saved FIDS response, identify eligible native-flight members and missing/ambiguous cases |
| 10. Unsigned flight review dossier | \`server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39.ts\` | Prepare per-flight source evidence and up-to-96-entry REVIEW pages, not signed flight permits |
| 11. External reviewed packet completion | \`server/lib/disruption/phase5IndependentLaterPrePacketCompletion_v39.ts\` | Given separately reviewed rights/identity/T24 evidence, prepares exact later-PRE instruction bytes; no self-approval |
| 12. Signed registry verifier | \`server/lib/disruption/phase5SignedLaterPreDayRegistry_v39.ts\` | Verifies existing prospective later PRE packet hashes/day, not a live automatic policy signer |
| 13. Old single-child later PRE controller | \`scripts/v39_phase5_later_pre_signed_day_batch_dispatcher_v39.ts\` | Old four-GH-children-per-ten-minute orchestration bottleneck; fallback/reference only |
| 14. Old manual eight-sequential batch | \`scripts/v39_phase5_bounded_signed_later_pre_batch_owner_v39.ts\`; \`.github/workflows/phase5-bounded-signed-later-pre-batch-manual.yml\` | Exact signed manual batch under extra gates; reuse validation/writer, not chosen permanent throughput policy |
| 15. Actual one-flight PRE SQL writer (**Stage14**) | \`server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts\` | Reusable serializable transaction; authentic SOURCE+member, T24 proof or reviewed absence, own cutoff, immutable PRE and POST-COMMIT readback; no second PRE SQL implementation |
| 16. Flight PRE feature builder | \`server/lib/disruption/preSnapshotBuilder_v3.ts\` | Enforces as-of feature schema; current Stage14 supplies an EMPTY feature array and needs a separate supervised join |
| 17. Historical feature store | \`server/lib/disruption/historicalFeatureStore_v3.ts\` | Potential source of historical cutoff-safe route/operational features, needs scientific integration |
| 18. Existing weather decoder | \`server/lib/disruption/phase4Gate5NoaaMetarReceipt_v39.ts\`; \`scripts/v39_phase4_gate5_free_noaa_metar_actions.ts\`; \`.github/workflows/phase4-gate5-free-noaa-weather-receipt.yml\` | Free NOAA airport METAR observations and validated source time; not complete route forecast |
| 19. Existing weather selector | \`server/lib/disruption/phase4Gate5WeatherAsOfFeature_v39.ts\` | Requires airport matching and durable availability before cutoff; absent weather → optional NULL |
| 20. POST source and actual outcome | \`server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts\`; \`scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39.ts\`; \`.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml\` | Later provider POST original/observation as distinct original, not a physical wheels-off proof automatically |
| 21. Webhook callback | \`server/lib/webhookHandlers.ts\`; \`server/lib/disruption/phase5Phase6WebhookDestinationGuard_v39.ts\` | Published Replit receiver and safety admission, separate from GitHub timed GET |
| 22. Owned Alert compensation | \`server/lib/disruption/prepaidSubscriptionBindingRecovery_v39.ts\` | If provider CREATE succeeded but SQL binding failed, delete only exact owned provider subscription and reconcile billing |
| 23. Roles/connection isolation | \`server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts\`; \`server/lib/disruption/phase5V0083RestDedicatedRolePool_v39.ts\` | Reuse narrowly scoped PRE/REST connection privileges; no new full-privilege application writer |
| 24. Actual historical schema | \`migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql\`; \`V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql\`; \`V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql\`; \`V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql\`; \`V0083__phase5_nonfids_five_category_physical_rest_reservation_v39.sql\` (all in \`migrations/staged/\`) | Distinct SOURCE reservation/original, GitHub run, T24 witness, seven REST caps and non-FIDS physical request reservations; **do not rerun** |
| 25. Free account balance check | \`scripts/v39_phase4_account_quota_readonly_once.ts\` | Existing **free** provider balance/quota reader from Replit-held ADB credential, not connected Neon console |
| 26. Existing recovery policy | \`server/lib/disruption/phase5BoundedOperationalRecoveryReview_v39.mjs\` | Prior conservative recovery guard to reuse, not a production durable PRE lease queue |
| 27. **New C+D offline first slice (on this PR)** | \`server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39.ts\`; \`tests/phase5_cplusd_parallel_pre_proof_of_concept_v39.test.ts\`; \`.github/workflows/phase5-cplusd-parallel-pre-proof-of-concept-offline.yml\` | Models due/waiting/missed tasks, bounded 1–16 independent lanes, per-flight quarantine, changed-native-T duplicate refusal and read-only watcher metrics; **synthetic only, no live DB queue/worker/paid provider** |

**Still to build**, with reviewed separate PRs after the nonpaid tests: an authorized private per-flight packet publisher, live due-work queue/lease interface IF existing schema cannot do it, GH rolling parallel PRE owner and watchdog workflow, real p95/p99 PG16 benchmark, real optional as-of origin/destination/en-route feature joins and daily read-only status dashboard. **None is silently completed by this file map.**

| 28. **New safe actual-database reuse inventory (on this PR)** | `scripts/v39_phase5_cd_queue_catalog_owner_readonly_once.mjs`; `tests/phase5_cd_queue_catalog_readonly_v39.test.ts` | Replit-owner one-shot `BEGIN REPEATABLE READ READ ONLY` **catalog only** for existing Phase5 tables, columns and unique indexes, no flight rows, no provider, no secret logging, no migration. Candidate queues remain **unverified until separately reviewed** |
**If something fails, where should you look?** Airport selection → rows 1–3; wrong/missing provider original → rows 4–9; flight identity/packet mismatch → rows 9–12; late/missing PRE → rows 13–16, then Stage14 audit; weather absent → rows 18–19; missing POST or webhooks → rows 20–22; unexpected database permission denial → row 23; budget refusal → rows 5, 24–25; controller not running or unknown COMMIT → rows 26–27 plus future controller/watchdog. Read issue #553 and the latest dated Phase5 checkpoint before repeating any production command.
