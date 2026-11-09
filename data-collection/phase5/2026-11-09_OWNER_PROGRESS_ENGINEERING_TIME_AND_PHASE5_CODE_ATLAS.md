# Phase 5 — owner’s complete progress atlas, code study guide, team explanation and why engineering takes time

**Owner technical checkpoint: November 9, 2026.** Written for the data-science research/project owner and collaborators who want to know **what we built, why, where to read real code, what is actually completed, what is still missing, and why several hours of careful work have not yet produced a Phase 5 scientific PASS.** It is a learning guide, not a substitute for reading current code and not an authorization to buy flight data.

**Start here:** [Phase5 README](README.md) · [technical-lead new-chat handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md) · [four actual Phase5 exit deliverables](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md).

**Actual verified GitHub main when written:** 98c1e1c24370f3e4a35063512402741d44d7d075. Postmerge offline CI SUCCESS (Actions #42602086265). **Scientific status Phase5 FREEZE HOLD; paid Phase6 GO NO.** These are separate from whether a particular source file has green tests.

## 1. First answer: why has this taken so much time?

It is **not mainly typing speed** or the sheer size of Markdown. There are six distinct activities:

| Activity | What happens in THIS repository | Why it cannot be skipped |
| --- | --- | --- |
| **1. Recovering true current state** | Read GitHub main SHA, README, PRs and Actions; compare with time-stamped real SQL snapshots and current release issues | Otherwise the next chat might reinstall an installed DB migration, buy an already failed historical source attempt, or treat a draft as production |
| **2. Experimental design and source definitions** | Establish the target prediction, sampling probabilities, four HUBs, five comparisons, 31-day design, what T means, which records can be PRE and POST, what is unknown | A model may appear to score well because it saw future data, duplicated a codeshare flight, or selected only high-volume routes |
| **3. Building interlocking modules** | Write small TypeScript/JavaScript components for calendar, airport early draw, restricted DB readback, FIDS source request, REST budget, original receipt, PRE/POST/witness, receiver | One big untested script would mix rights, billing, clocks, source and outcomes; independent components make errors attributable and auditable |
| **4. Testing real failure boundaries** | Synthetic unit tests, dependency tests, disposable PostgreSQL16 migrations and role checks, GitHub credential roles, exact cutoff millisecond cases, CI lint/typecheck | A test must prove incorrect or unauthorized behavior is **refused**, not merely that the happy path returns true |
| **5. Diagnosing/repairing CI failures** | Read the precise failed GitHub job, distinguish a TypeScript issue from a real science defect, correct code or an obsolete expectation, rerun all exact-head checks | For example, after hardening early draw, two older tests tried to compute a SHA of an invalid draw that the new first guard correctly refused |
| **6. Source/rights/operational release decisions** | Confirm native supplier flight availability, per-flight T and clock, provider legal retention, physical UTC billing, real DB and published receiver, independent science/paid GO | A green CI result does not create a lawful AeroDataBox source response or travel disruption label |

**Measured examples, not guessed percentages:** GitHub PR #512 was opened **10:17:27Z** and merged **10:33:22Z** Nov 9 (~15m55s). Its final successful offline safety workflow took **4m48s**. PR #513 was opened **10:28:42Z** and merged **10:36:34Z** (~7m52s); its final successful offline workflow took **5m39s**. Both involved previous code changes and CI review. Those durations can overlap with human/assistant investigation and are NOT a measured account of every minute or a promise that future work takes the same amount.

**What slows a real run more than a unit test?** A disposable PG16 test starts a separate database, installs B0062/source migrations, checks permissions/roles/triggers, intentionally submits forbidden writes and confirms they fail. The production-guard test chain includes TypeScript, a large V3.9 suite, full tests, lint, traceability, contradiction scan, aggregate preflight and build. We wait for exact-head checks before merging, then check the postmerge main again. No performance percentages for these activities are independently instrumented; do not invent a 60% testing / 20% documentation breakdown.

**Some of the delay is genuine complexity; some is process overhead we should reduce.** The codebase has historical Phase2G, Phase3, Phase4 Gate5 and Phase5 pilots/guardrails, with many similarly named files. We should consolidate the release checklist around the four actual exit deliverables rather than create endless “Stage32/Stage33” steps. We can avoid repetitive context gathering and unnecessary broad rebuilds, **without** waiving the few indispensable safety checks.

## 2. 31 engineering stages are NOT 31 days or 31 phases

There are three unrelated counting schemes:

- **Project Phase 0–7** in f.8: research and data-collection lifecycle. We are working to close **Phase 5** and authorize **Phase 6** future collection, with later model work in Phase 7.
- **Named gates** (Gate0, Gate0.5, Gate1–5, etc.): specific prior source/safety/evidence requirements. A historical failed Gate5 cannot be retrospectively turned into PASS by more docs.
- **Engineering Stage1–31**: labels attached to incremental Phase5 code, migrations, tests, and security commissioning (particularly November 7). They are **not** mandatory 31 Phase5 milestones and Stage31 does not imply Phase5 was done. We intentionally stopped inventing new Stage numbers.
- **31 future Phase6 batch-days**: independently planned sample dates, including **10 paired crossover days** and **21 ordinary adaptive days**, not necessarily 31 consecutive calendar days. A sample November24→January5 calendar is not a required launch date; the owner wants the first **earliest safe** prospective source opportunity after authentic Phase5 PASS.

[Read the engineering numbering clarification](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md).

## 3. What happened in Phases 3 and 4, and why Phase5 still has a job?

**In broad terms, according to the repository checkpoints:**

- **Phase 3** dealt with guarded canary/owner sessions, constrained permissions, source/alert lifecycle, actual callback/receiver behavior, STOP/recovery and distinguishing safe tests from paid external operations. These are not merely model-preparation tasks. Historical reports contain mixed completed engineering gates and held scientific provider prerequisites; read [Phase 3 README](../phase3/README.md) and the exact archived owner receipts for full chronology.
- **Phase 4 Gate5** attempted to establish authentic prospective flight-level source/original→PRE→POST/physical-outcome evidence, with WSSS/YSSY cohorts and paid scheduling/provenance work. Actual missed cutoffs, owner job timing, unbound or unavailable original source responses, event semantics and receiver behavior prevented an independent complete physical runway-outcome three-horizon PASS. Closing a historical administrative pilot or correctly recording missing/censored evidence is not equivalent to having the needed supervised training labels. Read [Phase 4 README](../phase4/README.md), its Gate5 outcome/closeout and source provenance documents.
- **Phase 5** turns the lessons into a reproducible *future* experiment: a coherent prospective flight population, trustworthy source custody, sample design, exact clock and budget contracts, account-specific lawful Contents use, genuine independent readback, STOP and one science freeze review. Its question is **“Can we responsibly begin the next actual 31-batch-day collection?”** not “Can we make every previous red historical Action green?”

This separation is deliberate: finish the next legitimate prospective acquisition, not spend months repairing every unrelated historical PR.

## 4. What the project is trying to predict — and what would count as failure

We want meaningful, calibrated traveler-oriented flight disruption predictions, based on **facts available before the event**, with transparent uncertainty. The study needs real scheduled operating flights, a valid source clock and eventually observed outcomes. A different provider-observable scheduled departure **revision ≥15 minutes** is a prospective narrower proxy under a separate plan amendment; it is **not automatically actual physical wheels-off delay**.

A useful labeled row eventually needs a stable **physical operating leg** (avoid duplicate marketing codeshares), an arrival/departure direction, directed origin→destination route, selection probability/eligibility, three distinct cutoff-safe PRE sources (**T−24h, T−6h, T−90m**) and a distinct POST/outcome source. Each feature must have a trusted available-at timestamp <= the horizon cutoff; future actual departure and later estimates must NOT leak into earlier features.

Failure can look like: insufficient real airline legs/routes, rare positive disruptions, nonrandom missing source data, unrepresentative geography, inconsistent source semantics, bad calibration, or wide uncertainty. **The 31-day design is a plan to measure these risks, not a promise of “nearly accurate” predictions.** A valid study can conclude the available data does not support the desired route-level model and report that limit honestly.

## 5. The sampling design in plain terms — four HUBs, five pairs, 19 sites, 408 groups

Real corrected B0062 owner draw:

| Pair | HUB | MID_A | MID_B | REGIONAL |
| --- | --- | --- | --- | --- |
| 1 | **OMAA** | OMSJ | SPJC | KDEC |
| 2 | **WSSS** | SBFL | TJSJ | LSZB |
| 3 | **YSSY** | **KBUF** | LFQQ | NZNP |
| 4 | **SKBO** | EBAW | NZNS | RJNK |
| 5 | **SKBO** | YBUD | RKTU | FAKM |

The four distinct HUBs are WSSS/OMAA/SKBO/YSSY; SKBO appears twice because **five pairs does not mean five HUBs**. Original Pair3 MID_A KTEB was replaced exactly once with KBUF after scheduled passenger-scope adjudication; other 19 slot assignments persisted. Corrected owner-selected set fingerprint:

~~~text
f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592
~~~

A **route** is one physical flight's directed airport of origin → destination. The four slots HUB/MID_A/MID_B/REGIONAL in a collection day are **not** four legs or an origin/destination pairing.

**New full f.8 counts:**

~~~text
31 future parent batch-days
   = 10 crossover paired-days (5 pairs × 2 periods)
   + 21 ordinary adaptive days

10 paired days × 4 airports = 40 airport × broad-UTC-window REVIEW records
    (NOT 40 flights, NOT 40 provider calls)

26 ordinary/control 4-hour shapes
+ 3 split alternatives of (2 hours ACTIVE + 1h GAP + 2 hours ACTIVE)
+ 2 up-to-six-hour alternatives
= 34 active child segments, at most 128 active hours

34 segments × 4 airport slots = 136 logical airport/segment targets
136 × 3 PRE horizons = 408 logical cutoff groups
    (156 groups from paired-days + 252 from ordinary days)
~~~

**Important:** 21 ordinary-day airport sets are not yet chosen. The new [31-day shape envelope code](../../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts) outputs literal NULL for these future ordinary airport identities. An externally approved calendar can freeze **dates, UTC start class, region targets and window shapes** while letting legitimate adaptive airport draws occur later, in their own early time windows. That avoids using future information to decide which airports “should have” been sampled.

A public timetable may show seasonal **zero scheduled passengers** for an airport (LSZB was flagged for certain November dates), even when historical B0062 proxy suggests commercial movements. A valid selection/frame needs the **actual date/window** and provider native operating-leg support, not an invented count. [Public screening notes](2026-11-09_SELECTED_CROSSOVER_SCHEDULED_PASSENGER_PUBLIC_SCOPE_PRECHECK.md).

## 6. How the actual computer systems fit together

There is **one versioned GitHub repository**, a deployed app/receiver, one live PostgreSQL database with multiple tables and roles, and external provider APIs. They have different responsibilities:

~~~text
GitHub repository + reviewed SHA
    ├── Markdown plan, frozen hashes, candidate dates and source contract
    ├── .github/workflows = guarded exact-run jobs and offline CI
    ├── server/lib/disruption = study/clock/budget/selection rules
    ├── scripts = reviewed owner commands, bounded launch adapters
    └── tests = synthetic failures and temporary PG16 integration

Future signed 31-day shape/region protocol (NOT READY)
    ↓
Real DB-clock early draw of 4 airports, T−72h .. strictly before T−24h45m
    ↓ (four committed rows, real time, regions/probabilities, frozen hashes)
Restricted GitHub readback and source-grid preparation
    ↓
Physical UTC REST/Alert budget reserve and exact source query PREPARED
    ↓
GitHub-only FIDS physical GET (provider AeroDataBox)
    ↓ (durably bind original response, actual source available_at)
T−24h PRE writer  → independent committed T24 witness
    ↓
T−6h PRE writer  → T−90m PRE writer
    ↓
Receiver / actual or proxy POST → missingness/censoring/STOP/expiry
    ↓
Later dataset feature/label join → train, validate, held-out test, model
~~~

**PostgreSQL is not 31 databases.** It stores a normalized set of related *tables*, ledgers, foreign keys, authority rows and independent writer privileges, so audits can separately check the calendar, four-airport draw, physical REST attempts, source originals, PRE snapshot witnesses and budgets.

As of the **owner’s Nov 8 08:18:35.246 UTC READ ONLY snapshot**, the sixteen named new Phase5 calendar/source/budget/witness tables existed with **zero rows**, and Phase6 authorization was disabled. That was an actual specific-time result, NOT a claim about current rows, and does not count older Phase4 records elsewhere. [Read real inventory and exact tables](2026-11-08_LIVE_EMPTY_PHASE5_COLD_START_AND_TRUE_RELEASE_ORDER.md). The V0079–V0083 SQL migrations and role installations exist; **DO NOT reinstall just to see rows.**

## 7. Where the real code lives — technical learning and current completion

Open the path from the repository root, not an old branch or the Replit published app. The following files are **merged on main** as of the checkpoint:

| Topic to study | Real file path | What is achieved / scientific caution |
| --- | --- | --- |
| Binding original study | [f.8 plan](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [four-HUB Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md) | Design requirements and proposed modifications; not all independently adopted |
| Actual airports from PostgreSQL | [corrected owner JSON](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json) | Real immutable B0062 owner readback of five sets, not future flight traffic |
| Five-pair calendar clock and washout | [experimentCalendarSolver_v39.ts](../../server/lib/disruption/experimentCalendarSolver_v39.ts), [phase5CorrectedPairDateGeometryProposal_v39.ts](../../server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39.ts) | Known-site global SKBO 24h END→START fix; future dates still provisional |
| Crossover review/backlog | [phase5Crossover40WindowEvidenceReview_v39.ts](../../server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39.ts) | 40 dated SHA-bound windows, native operating-leg population UNKNOWN |
| External treatment/randomization proposal | [phase5IndependentPairedTreatmentSourcePreview_v39.ts](../../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39.ts) | Balanced 5 control vs 5 alternative paired periods, exact gap; independent seed witness still missing |
| Full 31 dates but 21 future IDs unknown | [phase5Prospective31DayShapeEnvelope_v39.ts](../../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts) | 26/3/2 shapes, 408 logical cutoff groups and pure per-day candidate binding; no DB provenance |
| Actual live early sample write | [phase5EarlyAdaptiveDrawOwner_v39.ts](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) | Atomic, time-bounded DB four-row draw; real selection cannot be backdated |
| Saved draw readback | [phase5EarlyPreselectionReadback_v39.ts](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts) | Exact four slots/one timestamp/region/probability + strict early bounds |
| Shared clock | [phase5ProspectiveEarlyDrawClockContract_v39.ts](../../server/lib/disruption/phase5ProspectiveEarlyDrawClockContract_v39.ts), [phase5RollingEarliestFirstDayScenario_v39.ts](../../server/lib/disruption/phase5RollingEarliestFirstDayScenario_v39.ts) | Shared strict >24h45m and <=72h; earliest mathematical day, not launch authority |
| Real restricted read-only day/DB | [phase5CommittedDayGridReadonly_v39.ts](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts) | Checks PG role/READ ONLY, calendar, selected rows and prepares day query candidates; not actual GET |
| Physical FIDS target generation | [phase5DynamicDaySourceGrid_v39.ts](../../server/lib/disruption/phase5DynamicDaySourceGrid_v39.ts), [phase5F8SegmentedSourceCoverage_v39.mjs](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) | Exact active child segments, cutoff/time/range checks; full actual provider range not yet approved |
| Source admission | [phase5GitHubOneQueryReleaseAdmission_v39.ts](../../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39.ts), [v39_phase5_one_query_github_fids_source_owner_v39.ts](../../scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts) | Main-only, one physical GET with exact reviewed source rights/price/SHAs; NOT dispatched |
| Budget & prepared source state | [phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts](../../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39.ts), [phase5V0082SevenCategoryFreezePacket_v39.mjs](../../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs) | Seven physical REST category/partition ledger, strict whole units; unknown budget evidence remains HOLD |
| True PRE and independent T24 witness | [phase5V0079SingleBoundFlightPreWriter_v39.ts](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts), [phase5T24IndependentPostCommitWitness_v39.ts](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts), [phase5T24WitnessedLaterHorizonGuard_v39.ts](../../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts) | Tested restricted program and source-as-of gating; no actual complete future three-horizon cohort |
| Route generalization & ML readiness | [phase5RouteAndModelDataSupportAudit_v39.mjs](../../server/lib/disruption/phase5RouteAndModelDataSupportAudit_v39.mjs) | Tests feature/route/sampling support and uncertainty metadata; no measured Phase7 performance |
| Persistent SQL schema | [migrations/staged/](../../migrations/staged/), V0079–V0083 | Roles, functions, rules, ledgers installed inert; no duplicate migration |
| CI, not production collection | [.github/workflows/](../../.github/workflows/) and [tests/](../../tests/) | PR green shows offline test expectations, not new source data |

**Recommended 20-minute reading sequence:** start with the 31-day shape module (why ordinary airports are NULL), then saved-draw readback (four SQL rows and SHA), then dynamic-day source grid (how three horizons emerge), then atomic Stage9 writer (seven physical categories), then PRE/witness modules (how "as-of" becomes a durable evidence claim). Follow the related tests to see which invalid inputs must fail.

## 8. Read the code like an engineer — small actual concepts

### A. Why a NULL airport is scientifically correct

Simplified version of the actual 31-day envelope logic:

~~~ts
const paired = pairWindowMap.get(runDayIndex);
const selectedCandidateAirports = paired?.airportIcaos ?? null;

// For a paired day, this names the predetermined four *candidate* airports.
// For an ordinary adaptive day, null explicitly means future site selection
// must come from the real serializable PostgreSQL early draw transaction.
// "????" / dummy airports / retroactive optimized picks would be dishonest.
~~~

The compiled code additionally checks frozen B0062 hashes, pair membership, actual crossover date/UTC and 26/3/2 shapes, 19 unique paired sites, global known-site washout and experiment partitions.

### B. Why T−24h needs early selection

If the first source window begins Wednesday at 00:00 UTC, a source query for its earliest possible T−24h must be arranged **before Tuesday at 00:00**, with proven transport/database margin. The real early draw writer requires an even earlier strict boundary: **more than 24h45m and no more than 72h before first parent service**. These must BOTH hold. A source request at Tuesday 00:05 cannot be mislabeled an on-time Tuesday 00:00 PRE just because its body shows a previously expected scheduled departure.

### C. What a SHA does — and what it cannot do

~~~ts
const digest = sha256(JSON.stringify({calendarSha, runDayIndex,
  selectedAtUtc, selectedIcaos, sampleProbabilities}));
~~~

A SHA detects changes to exactly serialized input. It cannot tell us that a JSON packet came from the real PostgreSQL primary, that a source original is lawful and authentic, that a future response arrived before a cutoff, or that an airport actually has scheduled passenger departures. Therefore a separate **restricted read-only PostgreSQL transaction** and a genuine provider response are required.

### D. How SQL JOIN can help and hurt

The real calendar/draw relationship is based on **run_day_index** and each saved draw has **slot_id**. A read-only educational query shape is:

~~~sql
-- Educational example only. Run it only with an authorized read-only role.
SELECT c.run_day_index, c.scheduled_start_utc,
       d.slot_id, d.selected_icao, d.selected_at_utc
FROM clean.adb_phase6_calendar_day AS c
JOIN clean.adb_sampling_draw AS d
  ON d.run_day_index = c.run_day_index
WHERE c.run_day_index = 6
ORDER BY d.slot_id;
~~~

A future signed run day is supposed to return **exactly four distinct slots**, not arbitrary rows. The actual [restricted readback module](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts) further pins active authorization, checked current/role identity, hashes, transaction read-only state, config/frame and time. Do not treat this simple illustrative JOIN as an implementation-ready source acquisition or proof the rows exist today.

At flight level, a careless JOIN across a raw source envelope, marketing codeshares, multiple response refreshes and many POSTs can **multiply one operating leg into many training examples**. Conversely, an INNER JOIN that drops unmatched PRE/POST may silently conceal missingness and bias the dataset. The science audit needs explicit one-to-one physical operating-leg keys and eligible denominators, with missing source rows preserved as missing rather than discarded.

### E. What our budget guard bug taught us

JavaScript converts null, blank text and false to numeric zero when called via Number(value). The Stage9 guard previously permitted such conversion before validating whole REST units. PR #511 replaced this with a strict canonical whole-number check so malformed "zero budget" inputs fail closed. This is a clear example of how a **tiny TypeScript change** protects the economics and integrity of an entire multi-day acquisition.

### F. Why two-phase source original + witness matters

An authentic source original is not a prediction feature just because it arrived. The system must durably record available-at and identity, then commit PRE using only source data admissible before each flight's cutoff. A separate **T24 witness transaction** reads back the committed original/PRE to avoid accepting a process's own claim without independent custody. The T6 and T90 guards inherit that evidence, but they cannot retroactively repair a missed T24.

## 9. Work accomplished, grouped by real outcomes

| Outcome | Evidence / current state |
| --- | --- |
| Program baseline and experiments | f.8 plus proposed four-HUB / segmented source amendments, past gate evidence preserved |
| Sampling baseline | Real B0062 frame; four owner-selected HUBs; corrected five paired candidate sets and immutable owner readback |
| Calendar science | Five paired comparisons, global SKBO 24h washout repaired; candidate 31-date generator; no forced November 24 |
| Treatment/source shape | 40 review rows, claimed external treatment allocation, 156 paired cutoff targets, full 31 shape/21 null ordinary sets and 408 logical groups |
| T−24 early draw correctness | Real writer, daily grid, FIDS freeze grid, saved readback and rolling planner now agree on strict 24h45m/72h |
| Budget correctness | Seven-category source/REST planning, V0082/V0083 ledgers, strict integer/no null-as-zero source writer |
| Database infrastructure | Installed V0079–V0083 and limited scoped roles; three actual nonpaid GitHub worker logins passed real read-only primary handshake |
| Source & PRE architecture | Reviewed one-GET manual workflow, guarded physical reservation/source binding, independent T24 witness and later-horizon source lineage in disposable PG16 |
| Operational production evidence | As of Nov8 read-only snapshot, new collection tables existed but had zero rows; do not infer current live rows or Phase4 tables from that snapshot |
| Current scientific release | **NOT DONE:** prospective signed whole-source plan, native flight population, actual 3-horizon real PRE, POST/receiver proof, rights/TTL, independent FREEZE |

Recent success chronology:
- PR #503 actual corrected five-pair evidence; #504 operating-scope public timetable precheck;
- #505 cross-pair 22h SKBO bug fixed; #506 proposed real 31-date geometry;
- #507 40 SHA-bound review rows; #508 13 paired active segments/156 cutoff targets;
- #509 earliest prospective rolling start + owner study; #510 clock writer/grid fix;
- #511 malformed budget numeric coercion fix; #512 readback/FIDS freeze grid clock parity; #513 **real 31-day shape with 21 NULL adaptive sites**.
- PR #513 merged to main SHA **98c1e1c24370f3e4a35063512402741d44d7d075** with all four exact-head checks SUCCESS and postmerge offline safety SUCCESS.
- The history has many more PRs, failed iterations and historical Phase3/4 tasks; this table is a verified milestone overview, not an exhaustive line-by-line Git log.

## 10. What exactly is left before Phase5 can be finished?

There are FOUR true exit outcomes, not an infinite Stage list.

| Exit | Precise remaining proof | Why it is release-critical |
| --- | --- | --- |
| **A. Defensible lawful science target** | Independently adopt either a true physical outcome with real actual-only semantics or a narrower clearly named provider-observable schedule revision proxy; verify source Content-use, 7-day default or actual plan exception, deletion/expiry/backups and ML derived-work rules per issue #300 | Without this, labels might misrepresent flights, and retained normalized source could exceed provider rights |
| **B. End-to-end future source/PRE/POST evidence** | Actual published receiver, one genuinely authorized future physical operating-leg source, source available-at from DB, valid T24/T6/T90 PRE + independent witness + POST or explicit pending/unknown; truthful denominators | Offline passing tests cannot show prospective source custody or a scientifically usable real label |
| **C. Real 31-day approved calendar and physical resource budget** | External treatment seed commitment and slot/region/date/weekday/UTC class, ten paired sets, 21 ordinary prospective early draws, >=24h reuse washout, actual provider max query range and FIDS refresh, seven charge-day REST categories, Alert reservations and STOP | 408 cutoff planning groups are not 408 real GETs; real price, provider range, charge days and sample rights must be known |
| **D. Independent actual Phase5 FREEZE PASS and separate paid Phase6 GO** | Audited main/source SHA, DB and deployed receiver, rights + signed record classes, valid release calendar, balance/budget, no hidden missingness and fail-closed STOP | A green test suite is engineering evidence, not authorization to start a paid scientific study |

A clean truthful outcome is not necessarily "all providers replied and every possible variable exists." We can document bounded missingness and unavailable features, prospectively adopt a narrower defensible endpoint, and make a decision. **But we cannot waive mandatory first real source/cutoff identity or license data the supplier has not permitted us to retain.**

**Highest-value next code integration:** the new pure 31-day ordinary-day SHA binding must be connected to the existing **restricted READ ONLY PostgreSQL day/grid readback** without inventing rows. A genuine selected-day result also needs prior-day global airport washout and a real provider-capacity/charge-day check before any source request. Finish those seams rather than creating another catalog of future stage names.

**Launch schedule:** Do not wait for a hardcoded November24→January5 example. After genuine independent Phase5 PASS, identify the earliest future actual window with sufficient **strict early draw and T24 source/commit lead**. Never buy an expired cutoff and call it PRE.

## 11. Your role, team communication, and oversight

**Yes: your current responsibility is reasonably described as data-science project manager plus research owner.** You choose what question the system must answer, prioritization and deadlines, acceptable limitations and provider costs, and review whether the evidence reflects the intended study. You can also act as product owner for traveler-alert requirements. Coding is one contribution, but **study ownership is not measured by the number of lines typed**.

A useful role split for team communication is:

| Role | Accountable for |
| --- | --- |
| Research owner / data-science project manager (you) | Problem definition, study trade-offs, constraints, selecting the forecast use case, budget, delivery priority, accepting documented limitations and final go/no-go decision alongside independent evidence |
| Engineering lead (ChatGPT-assisted, reviewed by owner/team) | Architecture, source and database implementation, TypeScript, tests, CI triage, integrations and rigorous GitHub handoff |
| Independent scientific/release reviewer | Signs off actual source rights/technical evidence/selection design/label semantics, distinguishes PASS from HOLD and documents reproducibility; should not merely rubber-stamp its own test fixture |
| Data/ML analyst (later Phase6/7) | Real coverage/missingness/route diversity assessment, feature as-of checks, baseline vs ML model, calibration, protected held-out evaluation |

**One-paragraph explanation you can give your team:**

> We are building a prospective flight-data study rather than simply downloading flights and training XGBoost. Each flight must have an auditable identity, source timestamp, cutoff-safe PRE snapshots, valid POST outcome and legal data-retention scope. Phase 5 prepares and tests the source pipeline, controlled airport sampling, calendar, permissions and budgets before a 31-batch-day paid collection. Some code tasks are quick; the release-critical work is verifying that several independent clocks, database records, source terms and tests agree. We have merged major protections and a complete calendar shape, but we will not call the study ready until actual source coverage, rights, a legitimate first prospective collection path and the independent freeze audit pass.

**Suggested questions to ask when reviewing a PR:** What exact scientific failure does this prevent? Is the tested evidence synthetic or from real PostgreSQL/real provider? Where does the source timestamp come from? Is the selected flight's T defined unambiguously? What happens on 429/503 or late data? Does the split-gap accidentally enter the denominator? Is missing or canceled service counted truthfully? Which seven-category physical UTC budget absorbs retries? What one new thing is proven, and which release flags remain false?

## 12. What to read next, and how the two new checkpoints work together

**This file** is your textbook and progress atlas: learn the experiment, the code map, SQL/JOINs, why the work takes time, your project-manager role and remaining deliverables.

[The other NEW checkpoint](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md) is the technical assistant's recovery route: exact main SHA and receipts, historical no-repeat instructions, owner decisions, current release HOLD state, sample identities and four scientific exits, so a new conversation can immediately resume meaningful engineering.

After every significant merged change, update Phase5 README near the top and issue #416; when facts materially change, append a dated superseding checkpoint rather than silently overwriting earlier observed snapshots. **Latest GitHub main and authenticated independent evidence outrank the date of any older Markdown file.** Do not paste provider keys into GitHub or ask the owner to re-run installed production migrations simply to continue this reading session.
