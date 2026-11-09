# Phase 5 — connect the real saved four-airport day to the reviewed source-query ledger

**November 9, 2026 · Engineering checkpoint.** Reuse existing Phase 5 Stage7, Stage8, Stage9 and B0062/V0079/V0082; **no new stage number, migration, extra paid pilot or invented selected airport**.

## Purpose: close the source-side gap instead of repeating Phase2–4

The existing prospective **GitHub early-draw owner** now has a six-slot scheduler (merged [PR #522](https://github.com/HKcode22/ReplitTranvr/pull/522)), but the source pipeline is still broken into three previously tested pieces:

1. **Stage7** `readCommittedP5DayCandidateGrid`: real signed calendar + precisely four persisted airport draw rows, read using an independent restricted PostgreSQL `REPEATABLE READ READ ONLY` transaction. It also rechecks earlier saved airport washout and the T−24 source clock, when the reviewed 31-day ordinary envelope is supplied. **No GET; no write.**
2. **Stage8** `planStage8P5DayV0079Proposals`: turn that actual selected-day grid into one day’s exact FIDS query/partition proposals with per-horizon times, four approved local time zones, signed provider source range, and real UTC charge-day budget comparisons. **No GET; no write.**
3. **Stage9** `commitStage9P5V0082AtomicSegmentedDay`: after an **independent review of the particular complete proposal** and signed 31-day seven-category budget, insert the day's exact `PREPARED` source requests and matching immutable partition records inside one restricted `SERIALIZABLE` transaction. Commit or roll back **both** ledgers; never directly reserve paid attempts, modify budgets, or write PRE.

**Previously missing:** Stage8 historically accepted a separately supplied `day` and `savedEarlyDrawRows`. A future live owner could copy stale/guessed airport rows from another time, even while supplying a separately valid Stage7 candidate. Also no reviewed functional bridge called Stage7→Stage8→Stage9 in one sequential operation.

## This integration (PR review pending)

Files:
- [`phase5CommittedDayGridReadonly_v39.ts`](../../server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts): return a `committedDayAndDrawProof` field containing **the exact day and four draw rows read in the same original read-only transaction**, plus their independently recomputed `drawStateSha256`. Check this matches the candidate builder digest before returning.
- [`phase5V0079DailyPreparedQueryProposals_v39.ts`](../../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39.ts): `planP5Stage8FromCommittedDayReadback` takes the saved proof instead of accepting copied airport rows; verify its recomputed identity, exact frozen calendar/config/frame hashes and authentic candidate acquisition digest. It still checks time-zone conversion and actual physical UTC budget arithmetic.
- [`phase5ReviewedSourceDayPrepareOrchestrator_v39.ts`](../../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39.ts): **connect Stage7→Stage8→Stage9** using separate read-only and insert-only Postgres pools. Before any prepared-query insert, require the independently reviewed **exact dynamic per-day proposal SHA**, same source candidate SHA, identical source rights/release/manifest/calendar/config/frame pins and 31-day reviewed budget pins. It never substitutes its own computed SHA as a supposed external signature. Stage9 then **revalidates** real data, ledger ACLs, source range, cycle caps and seven UTC REST categories inside its separate serializable transaction, preventing a race with saved airports and category budgets.
- [`phase5_committed_day_grid_readonly_v39.test.ts`](../../tests/phase5_committed_day_grid_readonly_v39.test.ts): mock-PG same-snapshot to 12 source query proposals, tampered airport, missing Day0 charge budget and nonexistent snapshot proof refusals.
- [`phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts`](../../tests/phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts): existing real disposable PostgreSQL16 B0062/V0079/V0082 2×2h segmented source-day fixture **now exercises all three actual modules together**: one genuine signed early four-airport draw in disposable PG, independent candidate readback, 96 planned provider queries and 96 partition rows committed atomically by the restricted writer. Refuses changed independent SHA/rights with zero inserts; preserves previous permission and transactional rollback tests. All these 96 **CI synthetic planned source requests** have `github_run_id='00000'`; no paid source GET, POST, real PRE, or actual flight data is created.
- [`phase5-v0082-atomic-segmented-day-pg16-no-provider.yml`](../../.github/workflows/phase5-v0082-atomic-segmented-day-pg16-no-provider.yml): already existing GitHub actual-PG16 CI that runs this integrated case. This is **regression**, not paid or real production deployment.

## Exact status and next actual Phase 5 steps

This bridges the **saved day's selected airports → exact source proposal → database source PREPARED records**, reusing existing modules instead of recreating collectors. It does **not yet run as an authorized GitHub production preparing job**: the independently reviewed future per-day dynamic proposal SHA, four real timezone/source identities, signed physical 31-day UTC category budgets, actual 31-day calendar and separate stage-specific role credentials must exist. The manual one-query Phase5 paid source workflow is **not the unattended source dispatcher**, and this patch does not pretend it is.

Actual most recent owner production primary SQL observation **2026-11-09T13:42:38.603Z**: 16 scoped new Phase5/6 tables exist, seven NOLOGIN groups exist, all 16 new tables count zero at that timestamp; Phase6 disabled. Historical Phase2/3/4 real aviation records remain in different tables, not erased or retested.

Remaining release work: reviewed first-cycle scientific source-use/target decision, real future 31-day calendar/treatment seed, physical seven-category UTC budget, GitHub production-day preparer with approved day packet, source dispatcher and genuinely bound FIDS original, T24/T6/T90 PRE and independent witness, POST, receiver/Alert STOP and honest missingness, one independent Phase5 scientific FREEZE and **separate** Phase6 paid GO. **Do not demand future Day1 source or witness rows before that GO** (circular checklist fixed in merged PR #520).

**Phase5 scientific FREEZE: HOLD. Phase6 paid GO: NO.** No provider call, production database write, new role installation, source rights determination or scientific PASS from this integration. If source rights remain unresolved for a class, continue nonpaid engineering or prospectively exclude/redesign that class; do not repeat old paid historical pilots.

## Repeat-proof engineering instructions for future chats

Start at [Phase5 README](README.md), [exact seven-item owner checklist](2026-11-09_WHAT_THE_FLIGHT_RECORDS_MEAN_AND_PHASE5_EXACT_FINISH_LIST.md), [lead handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). GitHub is source of truth; read actual main SHA and exact check conclusions. Avoid Replit timers, Replit AI Agent, Cloudflare, old P25 retries or rebuilt V0079–V0083 schemas. DO NOT create another Stage32+.
