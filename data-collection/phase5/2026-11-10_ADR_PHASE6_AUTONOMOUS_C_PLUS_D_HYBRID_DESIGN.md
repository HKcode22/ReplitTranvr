# ADR — Phase 6 autonomous, restartable, bounded-parallel C+D controller

**Decision date:** 2026-11-10 (Pacific). **Decision:** ACCEPTED AS THE ENGINEERING ARCHITECTURE DIRECTION BY THE STUDY OWNER; **NOT** a signed experimental protocol amendment, an adopted REST/Alert budget, a tested concurrency value, a commissioned task queue, scientific Phase 5 FREEZE, legal Contents-use grant or Phase 6 paid GO.
**Source of truth:** GitHub main at 7e8f2f137d376b3c930c8f7fad81840340f7aff5 before this documentation PR. [Owner RFC on separate branch](https://github.com/HKcode22/ReplitTranvr/blob/docs/phase5-6-parallel-pre-throughput-and-simple-automation-proposal-20261110/data-collection/phase5/2026-11-10_PROPOSED_PHASE6_HIGH_THROUGHPUT_PARALLEL_PRE_AUTOMATION_RFC.md), [independent audit on this PR](2026-11-10_INDEPENDENT_PHASE6_PARALLEL_AUTOMATION_DESIGN_AND_BUDGET_AUDIT.md), [P0 issue #553](https://github.com/HKcode22/ReplitTranvr/issues/553), [master #416](https://github.com/HKcode22/ReplitTranvr/issues/416). **No production code, migration, scheduled action, provider request, Alert subscription or DB operation is changed by this ADR.**

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

Control-plane queue KEY proposed: `SHA256(manifest | source_day_registry | source_query | canonical_operating_flight_instance | horizon | selected_native_T | own_cutoff | packet_SHA)`. Must not use just flight number or job ID. DB UNIQUE for the accepted scientific grain must be independently verified (existing `clean.flight_snapshots` uses `ON CONFLICT(flight_instance_id, horizon, prediction_cutoff_utc) DO NOTHING`; Stage14 also uses `pg_advisory_xact_lock`). Avoid a queue schema storing raw provider Contents or exposing dynamic flight records through public GH Actions.
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
