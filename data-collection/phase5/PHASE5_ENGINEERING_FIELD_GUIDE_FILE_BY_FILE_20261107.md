# Phase 5 Engineering Field Guide — Read the actual files and understand the code

**Owner/engineering study guide | 2026-11-07 UTC | V3.9 f.8 + Amendment B + Amendment C**

This guide is for learning the software engineering and the aviation research design **while finishing Phase 5**, not a replacement for the executable code. It covers the primary Phase 5 implementation files in actual dependency order, shows the important code blocks in compact *annotated pseudocode*, and tells you which components are **offline-tested versus genuinely live**. Read one lesson and then open its linked source files side by side.

**Start here when a chat is lost:** [Phase5 README](README.md) → [Phase5 current technical checkpoint](2026-11-07_LIVE_PRODUCTION_DB_AUDIT_AERODATABOX_ACCOUNT_AND_TECHNICAL_STUDY_CHECKPOINT.md) → [f.8 base plan](../plans/V3.9_DataCollectPlan_f.8.md) and [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) → [current issues #413](https://github.com/HKcode22/ReplitTranvr/issues/413) and [#416](https://github.com/HKcode22/ReplitTranvr/issues/416). The **original catalog-locked** [implementation log](../implementation/V3.9_IMPLEMENTATION_LOG.md) is an accurate historical record, not a prohibition against new prospective versioned plan amendments.

## Lesson 1 — What are we doing in Phase 5?

Think of an ML dataset for traveler disruption. We want to predict **before a flight** using only information actually available then; later we compare predictions/features with independently observed outcomes. A model trained on the eventual final schedule as though it had been known yesterday suffers **data leakage**. A dataset that only captures disrupted flights has **selection bias**. A dataset that calls missing callbacks “no disruption” has **label error**.

- **Phase 4:** prospective scientific feasibility and bounded pilot evidence. November 6's real FIDS-only pilot: 9 original PRE receipts, 36 on-time PRE schedule observations, 3 POST originals and 36 comparable schedule revisions across 12 conditional identity keys. It did **not** certify the full original Gate5 operating-leg/Alert/AIRBORNE/actual-runway funnel.
- **Phase 5:** engineer, measure and freeze the lawful source, flight identities, exact time cutoffs, 31-batch-day sampling and crossover calendar, provider budgets, source→PRE→POST and webhook/receiver integrity, independent quality reports and STOP rules. **Build/test is allowed; final scientific FREEZE is still HOLD.**
- **Phase 6:** run the versioned full one-month paid collection after a distinct approved GO. Phase 5 code does not silently start it.
- **Phase 7:** model training, time/flight-instance-disjoint evaluation, missingness and uncertainty.

A healthy pipeline looks like:

```text
Reviewed f.8 design + 31-day schedule + provider-use rights
  └─> [EARLY four-airport selection, durably committed]
       └─> [GitHub-only physical FIDS queries, reserved BEFORE any spend]
            └─> [ORIGINAL provider response + SHA + available_at committed]
                 └─> [exact flight instance / original selected T]
                      ├─> T−24h PRE (before cutoff)
                      ├─> T−6h PRE  (before cutoff)
                      └─> T−90m PRE (before cutoff)
                           └─> Flight Alerts / receiver raw custody
                                └─> independent POST, AIRBORNE, labels
                                     └─> denominator, bias and missingness QA
                                          └─> lawful retained ML dataset
```

The phases above do **not** all run today. Files can exist on `main` while the production tables, dedicated roles, scheduler and source rights remain **not installed / not certified**.

## Lesson 2 — The primary source files, one by one

The table is ordered by the *data flow*, not filename. Every linked file below was confirmed in the repository or in the current Phase5 checkpoints. **Verified test code is not the same thing as a production deployment.**

### A. Research protocol, continuity and release gates

| File / document | What it controls; what to inspect |
| --- | --- |
| [Phase5 README](README.md) | Current entrypoint, relative links, phase boundaries and dated checkpoints. |
| [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) | Scientific definitions: §5 source clocks; §6 milestone semantics; §8 selection/crossover; §17 release. Normative design, **not measured data**. |
| [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) | Historical full Gate5 scientific acceptance; a partial schedule-revision pilot is not a blanket PASS. |
| [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) | Versioned correction to §5/§8 source-range and time coverage for 2×2h and 6h treatments; includes equations and budgets. |
| [Historical V3.9 implementation log](../implementation/V3.9_IMPLEMENTATION_LOG.md) | Past provenance, failures, commits, gates; do not erase old observations when we improve a prospective design. |
| [November 7 engineering handoff](2026-11-07_IMPLEMENTATION_HANDOFF_SEPARATE_FROM_CATALOG_LOCKED_LOG.md) | Current engineering summary separate from the historical log. |
| [Phase5 acceptance checklist](2026-11-06_PHASE5_FREEZE_CHECKLIST_AND_VERSIONED_COLLECTION_QA.md) | Remaining LIVE evidence needed to sign the release; do not convert a hypothetical PASS to a production PASS. |

### B. Calendar, mathematical selection and source timing — **offline controls**

| File | Main function and why |
| --- | --- |
| [`phase6SamplingDecision_v39.ts`](../../server/lib/disruption/phase6SamplingDecision_v39.ts) | `chooseAirportsForRunDay()` selects HUB/MID/REGIONAL from the allowed tier × region cells; `nextRegionalAdaptiveState()` updates future REGIONAL adaptation only from completed valid history. No global redraw to replace an unavailable cell. |
| [`phase5EarlyPreselectionReadback_v39.ts`](../../server/lib/disruption/phase5EarlyPreselectionReadback_v39.ts) | `verifyPreparedDailyDraw()` checks **four already selected** airports and their committed hashes/timestamps; never decides new airports after the T−24h deadline. |
| [`phase5F8CrossoverCalendarFreezeGuard_v39.mjs`](../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) | `deriveP5F8SeededPairRoles()` and `auditP5F8CrossoverCandidate()`: verify 26/3/2 shapes, five matched pair roles, six UTC slots, 24h end→start washout, segment gaps, pair replay, split and parent budget. |
| [`phase5F8FiniteCandidateSolver_v39.mjs`](../../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs) | `solveP5F8FrozenCandidatePool()` searches **provided** bounded calendar candidates and uses §8.8 weekday×UTC cost and lexical tie-break. SAT/UNSAT apply to the supplied candidate set only; not the missing global generator. |
| [`phase5FidsFreezeGridAdmission_v39.ts`](../../server/lib/disruption/phase5FidsFreezeGridAdmission_v39.ts) | `evaluateP5FidsGrid()`: earlier pure FIDS request-grid arithmetic, one GET per horizon/slot illustrative model. It is not real source availability. |
| [`phase5ContinuousPerFlightRefreshCoverage_v39.ts`](../../server/lib/disruption/phase5ContinuousPerFlightRefreshCoverage_v39.ts) | `assessP5Stage11ContinuousCutoffGrid()`: older 31 consecutive 4h UTC day source-freshness planning guard. Useful limited regression, not full f.8 crossover proof. |
| [`phase5F8SegmentedSourceCoverage_v39.mjs`](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) | `partitionP5F8ServiceSegments()`, `digestP5Stage22Requests()`, `auditP5F8SegmentedSourceCoverage()`: **new** all-exposed-segment × provider range × horizon continuous cutoff coverage + physical UTC REST charge-day seven-category budget. Offline-only. |

### C. Early database readback, source preparation, real one-query owner

| File | Main function, state and responsibility |
| --- | --- |
| [`phase5CommittedDayGridReadonly_v39.ts`](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts) | `readCommittedP5DayCandidateGrid()`: read committed day/draw records in **one REPEATABLE READ READ ONLY** transaction; candidates alone do not mean provider data exists. |
| [`phase5DynamicDaySourceGrid_v39.ts`](../../server/lib/disruption/phase5DynamicDaySourceGrid_v39.ts) | `materializeP5DynamicDaySourceGrid()`: join frozen templates to already committed actual airport choices, never insert new airport IDs from a simulation. |
| [`phase5V0079DailyPreparedQueryProposals_v39.ts`](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts) | `planStage8P5DayV0079Proposals()`: format signed candidate requests and UTC budget proposals. **Proposal ≠ paid GET.** |
| [`phase5Stage9V0079CommittedDayPrepare_v39.ts`](../../server/lib/disruption/phase5Stage9V0079CommittedDayPrepare_v39.ts) | `commitStage9P5DayV0079PreparedRows()`: restricted DB-only writer for approved `PREPARED` query rows. **PREPARED ≠ original response ≠ per-flight PRE.** |
| [`phase5GitHubOneQueryReleaseAdmission_v39.ts`](../../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39.ts) | `admitP5GitHubOneQueryRelease()`: bound, explicit release envelope; a hash alone is not legal use authorization. |
| [`phase5V0080GitHubPrearm_v39.ts`](../../server/lib/disruption/phase5V0080GitHubPrearm_v39.ts) | `prearmP5V0080ActualGitHubRun()`: bind the **real** GitHub Actions `GITHUB_RUN_ID` before any physical query. Protects against replay and invented run identity. |
| [`phase5ScopedFidsSourceBridge_v39.ts`](../../server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts) | `runP5ScopedFidsSource()`: one bounded FIDS retrieval using separately injected reservation/custody operations; no generic unaccounted paid loop. |
| [`phase5V0079ScopedDbPorts_v39.ts`](../../server/lib/disruption/phase5V0079ScopedDbPorts_v39.ts) | `createP5V0079ScopedDbPorts()`: real SQL adapter for restricted budget reservations + original FIDS custody, separate from provider transport. |
| [`v39_phase5_one_query_github_fids_source_owner_v39.ts`](../../scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts) | Staged *single-query* GitHub-only CLI. **Not currently connected to a reviewed live paid workflow.** Must never be mistaken for the full 31-batch-day three-horizon owner. |

### D. SQL schemas and safe provenance

| File | Database meaning |
| --- | --- |
| [`V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql`](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql) | Six new `clean.phase5_fids_*` ledgers: cycle/day/UTC budget, allowed queries, physical paid attempts, bound original response. `REFERENCES`, constraints and triggers preserve relations and immutability. |
| [`V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql`](../../migrations/staged/V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql) | One `phase5_fids_github_prearm_v39` table and functions/triggers to require a real preregistered GitHub-run identity. |
| [`V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql`](../../migrations/staged/V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql) | One independent T−24h witness table, DB-clock trigger and immutable witness. Needed because actual PG commit-timestamp tracking is OFF. |
| [`v39_phase5_v0079_v0081_install_dependencies_readonly_once.mjs`](../../scripts/v39_phase5_v0079_v0081_install_dependencies_readonly_once.mjs) | Owner-executed Stage18 read-only `pg_catalog` audit; **already confirmed** existing baseline and eight staged tables ABSENT in live `neondb`. Do not repeat it for its own sake. |
| [`v39_phase5_stage19_atomic_inert_schema_ci_once.mjs`](../../scripts/v39_phase5_stage19_atomic_inert_schema_ci_once.mjs) | Exact Git-blob-pinned all-or-none migration test with injected failure/rollback, successful commit, replay refusal. **Only disposable GitHub CI**; cannot be used as a Replit production installer. |

### E. One flight's source→PRE and independent result audit

| File | Main function and state |
| --- | --- |
| [`phase5V0079BoundFlightPreAsOfReadback_v39.ts`](../../server/lib/disruption/phase5V0079BoundFlightPreAsOfReadback_v39.ts) | `readP5OneBoundSourceFlightPreCandidates()`: read-only actual bound original → physical flight/member candidates, as-of clocks, retimes, missingness. No scientific PRE write. |
| [`preSnapshotBuilder_v3.ts`](../../server/lib/disruption/preSnapshotBuilder_v3.ts) | `resolveSelectedTMilestone()`, `buildPreSnapshot()`, `persistPreSnapshot()`: per-feature cutoff filter and canonical `prediction_state='PRE_DEPARTURE'`; `T` must have provider-authenticated exact semantics. |
| [`phase5V0079SingleBoundFlightPreWriter_v39.ts`](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) | `persistP5V0079SingleBoundFlightPre()`: one staged prospective source-bound **T−24h** PRE write, DB cutoff, commit/readback; NOT the complete T6/T90 owner. |
| [`phase5T24IndependentPostCommitWitness_v39.ts`](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts) | `persistP5T24SeparateTransactionWitness()`: a **second** restricted DB transaction sees the already committed T24 PRE, writes a DB-clock witness and reads it back before cutoff. |
| [`phase5DaySourceQualityReadonly_v39.ts`](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) | `auditPhase5SourceDay()`: restricted read-only aggregate denominator/missingness audits; does not leak raw flight rows, fabricate POST or change DB records. |

### F. Tests and GitHub workflow files to open as you study

| File | Test situation |
| --- | --- |
| [Stage21 tests](../../tests/phase5_stage21_f8_crossover_calendar_guard_v39.test.mjs) | Exact five crossover pairs, seeded roles, alternative exposures, 24h washout and finite candidate SAT/UNSAT/HOLD. |
| [Stage21 CI](../../.github/workflows/phase5-stage21-f8-calendar-crossover-guard-offline.yml) | Runs above without DB/provider secrets. |
| [Stage22 tests](../../tests/phase5_stage22_f8_segmented_source_coverage_v39.test.mjs) | 31-day candidate, 2×2 gap, six-hour splits, late/missing requests, wrong UTC charge, seven-category cost. Hypothetical values, not measured provider. |
| [Stage22 CI](../../.github/workflows/phase5-stage22-f8-segmented-source-coverage-offline.yml) | Focused nonpaid test; PR gate. |
| [Stage19 real PostgreSQL16 CI](../../.github/workflows/phase5-stage19-atomic-inert-schema-real-pg16.yml) | **Disposable** database migration failure rollback, success and duplicate refusal. |
| [Stage18 real PostgreSQL16 CI](../../.github/workflows/phase5-stage18-install-dependencies-real-pg16.yml) | Baseline and staged migration-order dependency catalog, no production connection. |

Open the source link and use your IDE's **Go to Definition** or search for the exact function name. A `type`/`interface` tells you the shape of data; a `function` performs computation; a `Pool.query()` call crosses into PostgreSQL; `fetchFidsAirport()` crosses to a potentially billable external provider.

## Lesson 3 — Understand the 31-day experiment mathematically

One parent **batch-day** tests four airport slots: **HUB=1, MID=2, REGIONAL=1**. Six four-hour UTC start slots rotate as `00/04/08/12/16/20`. Each parent chooses an allowed window shape. A 2×2h treatment has two two-hour *exposure* segments and a positive inactive gap; the gap does not suddenly become an experiment window because a webhook arrived then.

The study has **26 ordinary/control 4h windows + three split-gap alternative windows + two up-to-six-hour alternatives = 31 parent days**. Exactly **five 4h control days** are within five matched pairs; the **remaining 21** 4h days are ordinary. Each paired alternative has a control period using the same frozen four airports. Pair membership is the experiment's **blocking unit**; the **batch-day is the randomization/cluster unit**, not each flight.

The airport may return in a later period only after at least **24 hours from prior END to new START**, not 24 hours from start to start. A four-hour window Monday 08–12 UTC cannot replay the same airport Tuesday 08 UTC: that is only **20 hours** of true washout.

**Computer science:** `phase5F8CrossoverCalendarFreezeGuard_v39.mjs` is a *predicate/checker*. It reports failures but does not invent valid candidates. `phase5F8FiniteCandidateSolver_v39.mjs` is a *bounded constraint-satisfaction search*. It tries an existing SHA-frozen candidate pool. Both are **pure functions**—they do not modify DB or purchase provider data. A complete global calendar generator over real eligible airports/dates remains a later task.

## Lesson 4 — What T−24h / T−6h / T−90m actually mean

`T` is the first verified **provider-native selected schedule milestone** for a *physical operating flight*. It must not silently mean FAA gate-out or runway time when the provider has not established that semantic equivalence.

Example: if an independently authenticated selected `T = 2026-11-09T14:00:00.000Z`:

| Horizon | Exact UTC prediction cutoff |
| --- | --- |
| T−24h | 2026-11-08 14:00 UTC |
| T−6h | 2026-11-09 08:00 UTC |
| T−90m | 2026-11-09 12:30 UTC |

Suppose a weather or FIDS feature first became durably available at 08:01Z on November 9. It must be **NULL / missing** for the T−6h snapshot even if the value describes weather at 07:55Z. `event_time` is *what the event described*; `available_at` is *when the model could have known it*. The cutoff rule is `available_at <= prediction_cutoff_utc`, with an additional freshness limit.

**Annotated pseudocode** (instructional, not a released implementation):

```ts
const cutoffUtc = selectedNativeT - horizonOffsetMs;
const observed = originalSourceObservations
  .filter(x => x.availableAtUtc <= cutoffUtc)
  .filter(x => cutoffUtc - x.availableAtUtc <= frozenMaxAgeMs)
  .sort((a, b) => b.availableAtUtc - a.availableAtUtc)[0];

if (!observed) return { status: "population_unobserved" };
// Never load the later final schedule to repair a missed earlier cutoff.
```

This is called **point-in-time correctness**, **as-of join**, or **information-set constraint**. A final schedule is allowed as a POST comparison target but cannot be smuggled into PRE features.

## Lesson 5 — Source query timing, segment partitioning and staleness proof

There are **three dimensions** in Stage22:
1. Flight service **exposure** (including the 2×2h gap exclusion);
2. Source provider **range** (a single provider GET may be legally/technically limited to less than 6h);
3. Information **age/time** at the prediction cutoff.

For each `day × airport × horizon × segment × provider-range-partition`, Stage22 constructs a half-open target interval `[partitionStart−h, partitionEnd−h)`.

If reviewed upper bounds are scheduling slip 60 seconds, network+durable persistence 120 seconds, and pre-cutoff commit margin 120 seconds, total worst-case latency is **300 seconds = 5 minutes**. If the measured/frozen permissible population age is **60 minutes**, a GET started at `q` only theoretically covers cutoff times in `[q+5 min, q+60 min]`: **55 minutes of useful possible cutoff coverage**. Five requests spaced 50 minutes apart cover a four-hour partition because adjacent intervals overlap by five minutes. Three cover a two-hour partition. These numbers are an **illustrative controlled unit test**, not provider measurements.

With a hypothetical **four-hour verified provider maximum range**:

| Parent exposure | Service partitions | GETs per airport × horizon at illustrative cadence |
| --- | --- | --- |
| 4h | one 4h | 5 |
| 2×2h | two independent 2h, gap excluded | 3+3 = 6 |
| up-to-6h (planned cap) | one 4h plus one 2h | 5+3 = 8 |

For 31 batch-days, **four airports × three horizons = 12** source groups per parent. Total hypothetical GETs:

`12 × [(26×5) + (3×6) + (2×8)] = 1,968 physical GETs`.

At a hypothetical **2 API units per physical GET**, 3,936 REST units. Because the 2×2h second child is a **new BASE segment**, not a second range partition, only the two six-hour days have extra range split costs in this scenario: **72 additional split GETs × 2 = 144 SPLIT units**; the other **1,896 base GETs × 2 = 3,792 BASE units**. It would be incorrect to charge the second 2×2 child as a range split of the first child.

The actual live endpoint's range, request units, response clocks and permitted data use still need verification. If real observed inputs make 31 days unaffordable or temporally impossible, **revise the frozen study prospectively**, document the change and reassess the estimand; don't silently lower the quality standard.

## Lesson 6 — Why seven REST budgets are not the same as Alert credits

A REST API unit is charged for a request. The Flight Alert service has a **different** billable SEND/credit lifecycle. Do not add the two as though they are the same currency.

```text
REST categories (seven distinct reserves)
  FIDS_BASE_UNITS
  FIDS_SPLIT_UNITS
  FIDS_RETRY_UNIT_BUDGET
  VALIDATION_UNIT_BUDGET
  OUTCOME_REST_UNIT_BUDGET
  HISTORY_BOOTSTRAP_UNIT_BUDGET
  DIAGNOSTIC_UNIT_BUDGET

Flight Alert credits (separate ledger)
  subscriptions / SEND / unsettled margin / STOP / reconciliation
```

For one FIDS GET, the physical charge date is `scheduledGetUtc`'s actual UTC calendar date; a batch on November 9 may consume T−24h REST credits on November 8. The input `day.chargeDate` cannot replace this. Our own current project has a **≤50,000-unit REST cycle ceiling** as a separately protected budget, not the old 60,000 original provider entitlement. The 1,900 Alert cap applies to one **parent batch-day**, including both 2×2 children together, not each segment separately.

At execution time we need a **central limiter** with durable reservation, attempt-number, actual provider charge, 429/backoff and settlement. An offline positive budget sum is necessary but not enough to prove the live paid limiter.

## Lesson 7 — Read the database SQL as a transaction, not as a text document

A PostgreSQL **transaction** groups operations with ACID atomicity. `BEGIN` opens it, `COMMIT` makes the transaction durable/visible, and `ROLLBACK` discards its uncommitted changes. `READ ONLY` means a safety audit cannot mutate source rows.

```sql
-- Illustrative structure only; do NOT execute against production.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT ... FROM pg_catalog.pg_class;
COMMIT;
```

A `FOREIGN KEY` guarantees referential integrity: an original binding cannot refer to an unknown source-query response key. A `UNIQUE` constraint rejects duplicate identity/reservation rows. A `BEFORE INSERT` trigger can inspect the DB clock, refuse too-late insertions and stamp independently of the application timestamp.

`V0079` contains **budget/allowed-query/physical-attempt/original-binding ledgers**. `V0080` adds **real GitHub-run prearm**. `V0081` adds a restricted independent **T−24h witness**. There are eight new staged tables altogether. The owner's November 7 read-only production catalog scan reported **0/8 present**, but all five audited baseline tables/columns were there. In Stage19 tests, three SQL migrations succeeded/failed together on disposable PostgreSQL16; that code is **not a production installer**.

**Most important nuance:** `track_commit_timestamp=off` in the actual production server means we cannot claim a native `pg_xact_commit_timestamp()` witness. Stage17 instead has an independent **second transaction** that observes an already committed T24 record and writes a DB-clock witness. The second transaction cannot prove the first transaction's exact native historical commit timestamp, but it can bound independently witnessed visibility and completion before a real cutoff if installed, used and audited correctly.

## Lesson 8 — What do all the hashes mean?

- **Git commit SHA:** pins the exact repository tree/revision; a merge changes `main`.
- **Git blob SHA-1:** identifies the exact bytes of one tracked file, checked before running reviewed code or migrations.
- **SHA-256 source response digest:** identifies a particular stored provider-original representation. It detects accidental mismatch; it does **not** license retention or prove provider-native T.
- **Manifest/config/frame hashes:** version and cross-reference the chosen experiment schedule and input contract. A self-provided hash is **not** independent certification.
- **Signed release identity:** must bind the actual owner/workflow, provider-purpose and budget permission; not a substitute for the external account-use terms.

Example of **idempotency**: when GitHub retries a workflow, the **same physical query identity** must not cause a second paid GET merely because software ran again. Database unique constraints and a durable `PREPARED → PREARM → PHYSICAL_ATTEMPT → ORIGINAL_BOUND` state progression help ensure the system can distinguish retries from new authorized work. A code-level `if (alreadySeen)` without a durable DB uniqueness boundary is not a sufficient concurrency guarantee.

## Lesson 9 — TypeScript / JavaScript vocabulary while reading these files

| Term | Meaning in this repository |
| --- | --- |
| `interface P5...Input` | Compile-time schema/contract of incoming values. Runtime checks still needed for untrusted JSON/DB. |
| `readonly` / `as const` | Prevent unwanted TypeScript-level mutation or widenable string types; **not** a SQL permission. |
| `async/await` | Asynchronous IO such as `Pool.connect()`, DB `query()`, or provider HTTP. |
| `Map<string,...>` / `Set` | Indexed lookups and uniqueness, e.g. one request key or candidate group. |
| `SHA regex` | Guards formatting, not cryptographic authentication of contents by itself. |
| `throw Error('REFUSED_...')` | Fail-closed release guard; a missing prerequisite must not quietly return PASS. |
| `REPEATABLE READ` | Transaction sees a consistent DB snapshot; critical to simultaneous calendar/draw readback. |
| `SERIALIZABLE` | Stronger isolation for concurrent operations; still requires explicit retry/unknown-COMMIT policy. |
| `REFERENCES` / `UNIQUE` | PostgreSQL integrity/privilege versus duplicate-key protection. |
| `GitHub Actions workflow` | YAML that runs code on GitHub; checked-in script alone doesn't prove any workflow executes it. |
| `CI / integration test` | Reproducible tests with synthetic or temporary DB state; cannot stand in for a real 31-day provider run. |
| `fail closed` | Unverified identity, source, budget, or clock becomes HOLD, not an optimistic default. |
| `censored` / `missing` | A label endpoint/grace policy distinction; “not observed yet” is not “false event.” |
| `selection bias` | Sampled operated flights differ systematically from target population, so measured rates need denominators and strata. |
| `data leakage` | Using postcutoff or future information in PRE-side features or the sampling/evaluation split. |
| `EMA` | Exponentially weighted moving average of prior Phase6 observed yield, used for *future* REGIONAL sampling; never updated from future outcomes before a prior decision. |

## Lesson 10 — From source query to a single physical flight PRE

A daily source query is **not** itself a flight row. One FIDS query can return many candidate flight items: codeshares, marketing numbers, multiple updates, canceled flights, and uncertain legs. Stage10's as-of reader checks operating flight identity and membership.

The core PRE writer's critical conceptual invariant is:

```text
REAL source query (authorized) → PREPARED row → real GitHub RUN_ID
  → durable paid-attempt reservation → provider response received
  → raw/original response stored with SHA, actual available_at
  → population membership + physical operated-leg resolution
  → selected provider-native T (immutable first qualified T)
  → check as-of cutoff with independent DB clock
  → write PRE_DEPARTURE row, COMMIT
  → independent reader sees committed row BEFORE cutoff
```

**Stage14 currently handles one T24 flight only**; T6/T90 and the full production owner remain incomplete. One PRE writer's passing PG16 synthetic test does not imply the other two horizons are live. Stage17 strengthens T24 independent visibility with a second SQL transaction, but is still staged.

## Lesson 11 — POST, webhooks, AIRBORNE and honest denominators

Provider callbacks, raw receiver envelopes and per-flight state observations are **different identities**. A single flight can produce multiple events, and a single update can be retried. Match on the frozen *physical flight-instance identity*, not just `flight_number`, `marketing_callsign`, callback count, or a mutable schedule date.

Report separately:
- flights eligible for PRE vs actually on-time captured at each horizon;
- original FIDS queries planned / physically requested / original committed / legally usable;
- Alert subscriptions created / provider SENDs / authenticated received callbacks / unresolved or outside exposure;
- AIRBORNE eligible vs linked vs source-supported usable observations;
- POST observed/comparable vs missing, pending grace, censored and semantically unverified;
- confirmed physical operating legs vs conditional/ambiguous/marketing strata.

A missing callback **must remain unknown**, never a negative outcome. An ADS-B inferred takeoff is a **proxy**, not automatically provider-certified actual wheels-off. A schedule revision is a real *schedule revision* target, not by itself an actual gate or runway delay.

## Lesson 12 — Which work is actually complete?

**Verified engineering:** early-selection guard, bounded source-request adapters, PostgreSQL16 synthetic/disposable tests for prepared rows, source as-of candidates, source-bound T24 PRE and independent T24 witness, source budgets in their limited hypothetical models, Stage18 actual production missing-migration diagnosis, Stage19 CI rollback, Stage21 pair calendar verifier and finite supplied-candidate solver, Stage22 segment-aware coverage model once its focused CI passes.

**Still needed for final Phase5 FREEZE:** production-scoped inert V0079→81 installer/role grants and after-commit audit; actually generated full signed real calendar/region/anchor pool, measured provider range and source latency/cost, proper seven-category live limiter, GitHub-only multi-refresh owner with all three genuine per-flight PRE horizons and POST independent source check, deployed receiver verified exact SHA, provider-native selected T and physical leg, account-specific permitted normalized Contents ML/backup rights, and a signed independent GO/STOP with measured quality denominators.

**No need to repeat:** the known RapidAPI original Team Ultra entitlement/history/November 7 quota snapshots, the two successful Stage16b/18 read-only DB catalog audits, or basic source-only probes for their own sake. Rights and science have their own outstanding evidence, not an excuse for endless account questions.

## Lesson 13 — Self-study exercises with solutions

1. **Time leakage:** Original becomes available at `12:31`; T−90m cutoff is `12:30`. Can the model use the response? **No**. It misses the deadline by one minute, whatever its event timestamp.
2. **Washout:** Monday `08–12`, Tuesday `08–12` same airport. Valid? **No**: only 20 hours END→START.
3. **Crossover:** In a split 2×2h day, do you count flights departing during the inactive gap in the treatment denominator? **No**; tag outside-exposure separately.
4. **Range:** A maximum verified FIDS query range is 4h; planned exposure 6h. How many physical range partitions per retrieval round? **Two**, a 4h and a 2h segment. Extra partition GET uses `FIDS_SPLIT_UNITS`.
5. **Cadence:** Staleness 60min, latency+margin 5min. One request covers at most **55 min** of cutoffs. Why does 50min cadence work in the hypothetical model? Adjacent intervals overlap by 5min, and first/last brackets cover the full exposed partition.
6. **DB:** Why is a `PREPARED` row not scientific PRE? It records intent; it is not the provider-original body, source member, verified physical leg or cutoff-safe `PRE_DEPARTURE` snapshot.
7. **Commit:** If native PG commit tracking is OFF, can `pg_xact_commit_timestamp(xmin)` be used as authentic live T24 evidence? **No**; use a genuinely independent persisted second-transaction witness with its own bounded readback.
8. **Budget:** Your physical GET occurs 23:58Z on November 8 for a flight on November 9. Which UTC charge date? **November 8**, even if the experiment parent day is November 9.
9. **Provider rights:** Does a 60,000-unit entitlement grant long-term normalized per-flight Content retention for ML? **No**. Pricing/quota and permitted purpose/retention are separate contracts.
10. **SAT:** Solver returns `SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE`. Can Phase6 launch? **No**. This is a mathematical candidate, without independent source/rights/deployment/flight evidence.

## Lesson 14 — Productive way to read code without getting lost

Open one file at a time, in this order:

1. **Pure** `phase5F8CrossoverCalendarFreezeGuard_v39.mjs`: inspect `auditP5F8CrossoverCandidate()` and its tests. Try changing a split segment, then predict the `REFUSED` reason.
2. **Pure** `phase5F8FiniteCandidateSolver_v39.mjs`: inspect recursive `dfs()` and `balanceScore()`; learn recursion, backtracking and branch pruning.
3. **Pure** `phase5F8SegmentedSourceCoverage_v39.mjs`: inspect `partitionP5F8ServiceSegments()`, then interval union and UTC charge-day grouping; learn discrete geometry and invariants.
4. **DB read** `phase5CommittedDayGridReadonly_v39.ts`: inspect transaction isolation and independent readback.
5. **DB writes** `phase5Stage9V0079CommittedDayPrepare_v39.ts` and the staged V0079 SQL: inspect idempotency, foreign keys and role privileges.
6. **Provider boundary** `phase5ScopedFidsSourceBridge_v39.ts` and `phase5V0080GitHubPrearm_v39.ts`: separate transport IO from data persistence and paid safety.
7. **ML cutoff** `preSnapshotBuilder_v3.ts`, `phase5V0079SingleBoundFlightPreWriter_v39.ts`, `phase5T24IndependentPostCommitWitness_v39.ts`: look for each `available_at`, `cutoff`, `BEGIN`, `COMMIT` and replay refusal.

For each file, write down: **inputs**, **outputs**, **side effects (none/DB/API)**, **failure/refusal reasons**, and **which missing real-world evidence its tests do not provide**. Those five questions are the fastest way to understand this codebase technically without confusing a GitHub merge with a scientific result.

**Final note:** We can revise our own plan when mathematics, observations or legal constraints demand it. We should do that in a versioned amendment with formulas, tests, effective date and impact on estimates; not by pretending an old observed source response or historical experiment was different. **Phase5 final FREEZE remains HOLD** until the outstanding live evidence is genuine. No tool or documentation here silently spends credits.
