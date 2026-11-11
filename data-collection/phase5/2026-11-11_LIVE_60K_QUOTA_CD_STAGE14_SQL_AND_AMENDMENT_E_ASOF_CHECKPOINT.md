# Nov 11, 2026 — actual AeroDataBox allowance confirmed, C+D Stage14 disposable-PG integration + Amendment E as-of features

**Source of truth:** GitHub `main` at `eb738cc7762c95d435d795eb6fb503823ed8f8ef` when this separate implementation branch started. Scope: **nonpaid, isolated code/CI**, not a Phase5 scientific FREEZE, model validation, production schema release, live Source/PRE deployment or Phase6 authorization. Do not change the history of A/B/C/two D proposals or create E2/E3/F/G; use [one canonical Amendment E](2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md).

## 1. Real account evidence obtained via Replit owner on Nov 11

The user ran the previously reviewed **isolated** `scripts/v39_phase5_free_quota_exact_pinned_isolated_replit_once.sh`, fetched at commit `c9175705758c339e06da2afcd870be515d4d3549` with Git blob `e02ea40cc438c46307bf2ec19a7aa60662f5ab6c`; five pinned source blobs matched and the free, metadata-only account call returned:

| Field | Actual provider metadata from owner-provided output |
| --- | ---: |
| Observed at UTC | 2026-11-11T13:34:38.000Z |
| Active API-unit limit | **60,000** |
| Remaining API units | **59,968** |
| API units reset | **2026-12-04T02:21:21Z** |
| Requests limit/remaining | **240,000 / 239,975** |
| Alert SEND-credit balance | **1,830** |
| Checker provider-billable calls/database writes | **0 / 0** |
| Independent study-cycle spending ceiling (separate) | **50,000** |

This *does* resolve the prior public-new-50K versus original-live-60K dispute **as of this observation**: the project account remains on a provider-reported **60K allowance**. The newly advertised RapidAPI Ultra public 50K plan is a distinct public offer. Do not change the user's subscription or resubscribe to measure quota. This free metadata query does not independently prove a grandfathered plan's source-content license or caching/retention rights. The account balance is current at the indicated clock only, not guaranteed available when future Phase6 payments commence.

The study's **50K self-imposed maximum** is still a project budget rule. It must not be automatically raised to 60K merely because the provider allows 60K. Alerts are their own SEND-credit balance and possible refill charge. No overnight paid work was authorized by *this diagnostic*.

## 2. Real C+D engineering increment

The existing Stage14 single-bound-flight PostgreSQL writer (`server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts`) remains authoritative; there is **no second PRE writer**. PR changes add a new CI test `tests/phase5_cplusd_stage14_parallel_real_pg_v39.test.ts` and workflow `.github/workflows/phase5-cplusd-stage14-parallel-real-pg16.yml`.

The test deliberately uses the same staged V0079/B0062 schema, same limited-role PG permissions and true writer as the prior existing Stage14 source-bound CI fixture; no shortcuts that convert a mocked adapter into a write benchmark. In **disposable local PostgreSQL 16** only it:

1. Inserts one synthetic decoded response original with 32 distinct flight identities and a normalized members/source bound record.
2. Prepares a separate, disposable `p5_cd_stage14_ci.task` queue with one immutable canonical flight/horizon per item. This table **does not exist in production**; it is erased at CI shutdown.
3. Atomically claims tasks using PostgreSQL `FOR UPDATE SKIP LOCKED`, while enforcing a lease, generation and deadline. Before invoking the existing Stage14 SQL writer, changes task state to `WRITE_STARTED_UNKNOWN`, so an exception cannot trigger blind duplicate paid or DB retry.
4. Runs 8 distinct eligible flights at each of 1, 2, 4 and 8 concurrent workers, for **32 total actual synthetic-source-bound Stage14 transactions**; uses the recently merged [Stage14 proof bridge](../../server/lib/disruption/phase5CPlusDStage14ResultBridgeOffline_v39.ts) to check flight/horizon/source/native T/cutoff and post-COMMIT proof.
5. Finalizes the queue only on acknowledged Stage14 success while owner, lease and generation still match, verifies one PRE row per flight plus true cutoff time, and rejects an attempt to requeue the same flight+horizon under revised selected T.

**Limits of the test:** It does **not** measure commercial AeroDataBox throughput, actual Neon pool pressure or lawful production SOURCE. It also **does not yet provide an atomic stale-owner fence in the PRE writer's very same SQL transaction**. The queue can reject a stale owner's final receipt while an already in-flight old transaction might still write; never mistake this narrow test for a safe production queue release. Fixed 165-second synthetic cutoffs/32 tasks and GitHub runner noise do not determine the eventual production lane count. Record the CI-measured per-lane timing only after successful checks; more representative workload/lock/failure testing and real catalog inventory remain P0.

## 3. Amendment E engineering increment

New pure `server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts` with `tests/phase5_amendment_e_asof_feature_selection_offline_v39.test.ts` and `.github/workflows/phase5-amendment-e-asof-features-offline.yml`.

- Distinct T−6h and T−90m issue-time views of allowed candidate **PRE** features: origin/destination/operator, provider timetable/revision as *reported*, origin METAR, origin/destination TAF and lagged historic context. **No actual gate-out/wheels-off label or future AIRBORNE position in PRE**.
- Uses the **actual forecast issuance timestamp**, which can be before the individual mathematical cutoff. A feature received after issuance is omitted **even if it arrived before cutoff**; T−90m may legitimately see a newer report than T−6h.
- Preserves empty/missing/too-late/right-held/ambiguous tied-source classifications. Refuses mismatched flight identity, bogus times, unsupported future outcome names, non-finite values or shifted native T.
- Composes only with the **existing pure `preSnapshotBuilder_v3.ts`**, which is not a production DB change. Stage14 still passes `features:[]` today; integrating this feature selection with properly reviewed real source rows and real Stage14 is the next task. The module's `EXTERNALLY_REVIEWED_ALLOW` field is a typed *caller-supplied status*, **not an authenticated license**.

Owner's intent: richer traveler-facing delay-minute distributions, 15/30/60/120m risk, honest cancellation probability, T−90m update and separate genuinely in-flight ETA. **T−6h actual gate-out delay in minutes remains a preferred conditional first-cycle primary candidate**, not scientifically frozen until same-milestone actual outcomes are known. Existing [ADSB.lol research](2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md) and earlier code remain the only selected *free* airborne candidate; do not invent another paid provider.

## 4. Still missing before Phase6 GO

- **CI must pass**; this file was authored while the pull request was being prepared, not evidence of completed runs.
- Independent real teammate-managed `DATABASE_URL` **read-only** catalog, queues/indexes/roles and runtime reliability. Do not treat connected personal Neon account as this database.
- The actual Stage14 writer needs an independently reviewed, correctly transaction-fenced authorization/claim check in its SQL transaction; recovery of UNKNOWN_COMMIT requires independent original snapshot and transaction-fate readback, never an immediate retry.
- Verify source-content/derived-use license, retention and backup surfaces, current account and Alerts refill/spend ledger at paid activation. Protect no-op and STOP paths.
- Automatic GitHub dispatcher/rolling workers, budget/source/POST/Alert/stop orchestration, watchdog and no-human-overnight operation: **not commissioned**.
- End-to-end as-of, source/route/weather feature binding and outcome label confidence; then preregister the single first-cycle primary target, chronological test and baseline. Real physical events are not guaranteed by FIDS or ADSB.lol proxies.

**Release status:** Phase5 scientific FREEZE HOLD / Phase6 paid GO NO. Everything in this PR is offline/synthetic/durable documentation, not a license grant.


## 5. First live disposable-PG16 test exposed REAL SERIALIZABLE contention (not production)

The first PR #566 `real-stage14-synthetic-parallel-pre-only` job **FAILED** on actual PG16, even though its **single-lane eight-flight** mode succeeded (`VERIFIED=8`, elapsed **82ms**, max individual Stage14+receipt **27ms** in that CI run). Upon starting parallel work, PostgreSQL raised **SQLSTATE `40001`** during `INSERT ... ON CONFLICT DO NOTHING` inside the **existing** `persistPreSnapshot` under Stage14 `SERIALIZABLE`: *could not serialize access due to read/write dependencies among transactions; canceled on identification as a pivot during write*. The test stopped with 12 total saved PRE rows rather than 32. The later 32-count assertion was a cascading symptom of the first failure. **Do not interpret the 82ms as a representative production speed or claim C+D throughput was already proven.**

This is an important **empirical** engineering finding that validates the owner's concern about parallel SQL race/contension. PostgreSQL explicitly reports an aborted serializable transaction; blindly rerunning *all* exceptions or switching globally to `READ COMMITTED` would be incorrect.

**Corrective implementation on the same review branch, pending CI:**

- Existing `phase5V0079SingleBoundFlightPreWriter_v39.ts` now distinguishes (i) PostgreSQL SQLSTATE `40001` **before COMMIT**, plus acknowledged ROLLBACK, and (ii) **a server-returned `40001` from the COMMIT statement itself**, also definitively aborted and followed by acknowledged ROLLBACK. Critically, a *successfully acknowledged COMMIT* followed by a failed readback, a lost network ACK, any non-`40001` or an unacknowledged rollback **stays quarantined**, never automatically retried. Explicit `commitAcknowledged` state guards that distinction.
- `phase5CPlusDStage14ConfirmedAbortRetry_v39.ts` adds **at most six** narrowly classified full-transaction recovery attempts, each after independent `REPEATABLE READ READ ONLY` readback finds **no existing PRE for the flight/horizon under any native-T cutoff**, with current queue lease/owner and deadline rechecked. It sleeps only *outside* SQL transactions to reduce hot contention. Non-`40001`, unmatched source, unknown COMMIT, lost lease, or exhausted attempts stay quarantined. This follows [official PostgreSQL 16 §13.5 guidance](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html): retry a **complete** transaction after `40001`, with no guarantee every retry succeeds.
- Disposable parallel test now invokes that confirmed-abort wrapper and logs per-lane retries. It still leaves `WRITE_STARTED_UNKNOWN` until actual Stage14 acknowledges a valid durable PRE and finalizes the queue receipt; no broad exception retry or weakening of existing SERIALIZABLE writer.
- **Unresolved**: this wrapper's outer lease checks still do not enforce lease fencing inside Stage14's own write transaction; production queue installation and paid Phase6 release continue to HOLD.

**State at time of this amendment:** the rerun on the new branch head was pending; no guarantee of success, no live DB or paid provider calls. On any renewed CI failure, investigate and retain the failure evidence rather than masking the problem. See PR #566 exact-head Actions for current outcome.


## 6. Current corrected CI result — exact observed *synthetic* performance

**PR #566 isolated Postgres16 Action [run #43034978362](https://github.com/HKcode22/ReplitTranvr/actions/runs/43034978362)** passed after the proven SQLSTATE-40001 recovery path. Its eight-flight trials reported the following on that one shared-hosted-runner test (not production throughput, not a representative multi-day statistical benchmark):

| Parallel worker lanes | Distinct synthetic flights saved and acknowledged | Total time for eight tasks | Maximum task write + readback time | Proven SQLSTATE-40001 aborted-transaction retries |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 8 | **97 ms** | 22 ms | 0 |
| 2 | 8 | **115 ms** | 96 ms | 1 |
| 4 | 8 | **260 ms** | 249 ms | 5 |
| 8 | 8 | **328 ms** | 280 ms | 10 |

**Total:** 32 distinct source-bound staged Stage14 PRE rows committed/read back before their respective cutoffs, no provider GET, no production DB write. The test additionally checked nonduplicate canonical flight×horizon and refused a revised-native-T duplicate. More lanes were slower under this tiny sample because SERIALIZABLE contention and recovery overhead dominated. **Do NOT declare 1 lane optimal** from this isolated 8-task synthetic demonstration. Next benchmark should vary 50/100/250 eligible tasks, cutoff overlap, source/query grouping and p95/p99 latency; record successful, explicit-rollback retried, failed/unknown and missed deadlines as separate denominators.

The testing path still **lacks an in-transaction queue generation/fence check in the actual Stage14 writer**, so it is not a production release. Production must prevent an old leased worker writing if another owner has already reclaimed the same task. The existing outer check is insufficient proof.

**Scientific caution:** the first failed test was a valuable discovery, not evidence the experimental data were damaged. Only disposable local PG16 was used. No production data rows were deleted or overwritten. The subsequent successful test illustrates *a possible* bounded recovery under this synthetic scenario, not an accuracy or reliability guarantee for the 31-day prospective study.
