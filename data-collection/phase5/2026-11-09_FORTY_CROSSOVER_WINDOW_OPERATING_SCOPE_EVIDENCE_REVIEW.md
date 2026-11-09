# Phase 5 — exact 40 crossover airport-window evidence backlog (native source still UNVERIFIED)

**Nov 9 owner scheduling update (later checkpoint):** The fixed-date **Nov 24 example** in this original 40-row table is NOT a required start. Start Phase6 at the **earliest independently safe date after Phase5 freeze**, as documented in the [rolling-start owner guide](2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md). The real airport-selection hash remains unchanged, but **all 40 dated review-key hashes must be regenerated if the first date changes**. All public/source-operating coverage must be screened for the *new* actual UTC windows; an earlier date can change seasonal airline service and first-flight T−24h feasibility. Do not reuse Nov24-era public notes to infer an earlier positive or zero provider native source.

**Date:** November 9, 2026 UTC. **Purpose:** close the *accountability/matrix* part of Phase5's next critical-path task, **not** certify any future flights, label source, budget, study dates or rights. **Source:** immutable owner-corrected B0062 five-pair packet from PR #503 + 31-date review-only candidate from merged PR #506. Selection SHA `f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592`.

## Exactly what this change produces

The 31-day design contains ten **paired** parent batch-days (five pair templates × two comparison periods), each with one HUB, MID_A, MID_B, REGIONAL. Therefore the exact pre-outcome workload is **10 × 4 = 40 airport-window rows** referencing **19 unique airport identities** (four distinct HUBs + 15 unique sampled MID/REGIONAL airports). The other 21 parent days have **not-yet-selected adaptive airports**; they are **not** twenty-one empty days or twenty-one fabricated four-airport sets.

The deterministic function `buildP5Crossover40WindowReview` takes the genuine archived corrected packet and candidate first-date request. It reuses the source-pinned date-generator (which checks original draw SHA, corrected SHA, frame hash, one KTEB→KBUF change and read-only flags) and derives 40 SHA-256 **review keys** binding `candidateDateMapSha256 + pairId + period + runDayIndex + slot + ICAO + startUtc + conservativeEndUtc`. Changing *any* date, ICAO or window requires a **new** review identity; a future reviewer cannot quietly carry a previous day's evidence into a different experimental window.

The 6h upper-bound interval is a **conservative review envelope**, NOT an assertion that every day is a 6-hour service or that the actual FIDS window includes gap minutes. Real treatment shapes remain 26×4h, 3×(2h + 60m inactive + 2h), 2×up-to-6h under the **not-yet-independent** treatment-order seed; before actual source queries the selected active intervals and physically allowed provider range must be attached separately.

## Actual ten paired proposed parent dates and four airports

*These dates are a deterministic **provisional** example with `firstRunDateUtc=2026-11-24`; no owner-signed calendar or true dated flight coverage has been established.*

| Run | Period | Candidate UTC start → 6h MAX review end | HUB | MID_A | MID_B | REGIONAL | Native scheduled-passenger provider population |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pair 1 / P1 | Nov 24, 00:00→06:00 | OMAA | OMSJ | SPJC | KDEC | **UNKNOWN**, all 4 |
| 2 | Pair 2 / P1 | Nov 25, 04:00→10:00 | WSSS | SBFL | TJSJ | LSZB | **UNKNOWN**, all 4 |
| 3 | Pair 3 / P1 | Nov 26, 08:00→14:00 | YSSY | KBUF | LFQQ | NZNP | **UNKNOWN**, all 4 |
| 4 | Pair 4 / P1 | Nov 27, 12:00→18:00 | SKBO | EBAW | NZNS | RJNK | **UNKNOWN**, all 4 |
| 5 | Pair 5 / P1 | Nov 29, 16:00→22:00 | SKBO | YBUD | RKTU | FAKM | **UNKNOWN**, all 4 |
| 7 | Pair 1 / P2 | Dec 2, 00:00→06:00 | OMAA | OMSJ | SPJC | KDEC | **UNKNOWN**, all 4 |
| 8 | Pair 2 / P2 | Dec 3, 04:00→10:00 | WSSS | SBFL | TJSJ | LSZB | **UNKNOWN**, all 4 |
| 9 | Pair 3 / P2 | Dec 4, 08:00→14:00 | YSSY | KBUF | LFQQ | NZNP | **UNKNOWN**, all 4 |
| 10 | Pair 4 / P2 | Dec 7, 12:00→18:00 | SKBO | EBAW | NZNS | RJNK | **UNKNOWN**, all 4 |
| 11 | Pair 5 / P2 | Dec 12, 16:00→22:00 | SKBO | YBUD | RKTU | FAKM | **UNKNOWN**, all 4 |

The full row-level artifact is emitted on stdout, with all 40 different review key hashes and explicit null evidence fields. No manual copying of a large hardcoded 40-row table into the production scheduler is permitted. Any final study calendar change invalidates these *candidate* evidence keys and requires rematerialization and re-review.

**Note:** Public pre-screen at LSZB Bern describes intermittent/seasonal flights. In particular, a claimed return of airline flights around November 25 is not proof that any airline passenger flight departs during **04:00–10:00 UTC**, or that AeroDataBox will return one. Also, KDEC's narrow route exposure, EBAW's seasonal service and FAKM's small-airport history must be classified by the **same** procedure; do not cherry-pick or silently substitute airports for high yield.

## Exact read-only review interfaces

- Source module: `server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39.ts`
- Tests: `tests/phase5_crossover_40_window_evidence_review_v39.test.ts`
- No provider/no DB stdout CLI: `scripts/v39_phase5_crossover_40_window_review_readonly.ts`
- To print one review-ready row per airport/window locally (optional, no paid service):

```bash
npx tsx scripts/v39_phase5_crossover_40_window_review_readonly.ts --first-date 2026-11-24 --format csv
```

- To obtain the more detailed 40-row JSON and exact identity/selection hashes:

```bash
npx tsx scripts/v39_phase5_crossover_40_window_review_readonly.ts --first-date 2026-11-24 --format json
```

**This does not have to be run in Replit now.** It only reads the versioned repository JSON and prints stdout; no generated file is silently saved, no GitHub schedule triggered, no API secret contacted, no production SQL read/write and no credits consumed. A later reviewer can explicitly capture an immutable review artifact under a new version/hash.

## Three evidence classes must never be conflated

1. **Frozen frame metadata:** 1,013 technically feed-qualified historical MID/REGIONAL airports; observed past departures/degree/carriers are useful for sampling balance but **not current future flight observations**.
2. **Public timetable/airport sources:** optional `P5PublicContextClaim` ties an official/third-party HTTPS URL and a capture timestamp **prior to the proposed service start** to **one exact SHA review key**, classified as public service indicated, public zero indicated or inconclusive. This may guide investigations; it is **not authenticated provider FIDS**, it may refer to an incomplete/unclear clock range, and it is **never** added to an ML cutoff feature or converted to a native source PASS.
3. **Authenticated actual provider original:** actual paid/entitled AeroDataBox FIDS query/GET receipt and source contract, durable original binding to source/flight identities, DB-clock received/available-at, valid before per-flight cutoff, its physical charge-day ledger, source rights and independent review. **None of these are produced or attested by this offline 40-row module.** A scheduled service on a public website does not establish a usable source observation, and a true provider original does not automatically grant storage/training rights.

The audit always returns `HOLD_ALL_40_PROVIDER_NATIVE_WINDOWS_UNVERIFIED`, `nativeVerifiedWindows=0`, `unknownPopulationWindows=40`, `distinctDirectedRoutesVerified=0`, `independentPhase5FreezePassed=false`, and `phase6PaidGo=false`. Public claims cannot change these fields. Unknown **does not mean zero**. The count 40 represents observation *opportunities*, NOT individual flights. No reconstructed route counts or invented terminal labels.

## Technical teaching notes for the owner

- `flatMap` turns the ten paired-day objects into four rows each; `Set` verifies 40 distinct SHA IDs and 19 distinct physical airports, which prevents codeshare-style and pair-replay confusion at the *airport-window* level (it is **not** the later operating-leg deduplication).
- SHA-256 on canonical JSON `{dateMapSha256,pairId,period,runDayIndex,slot,airportIcao,startUtc,endUtc}` acts like a **content-addressed foreign key** for a reviewer artifact. It cannot itself prove that a screenshot or FIDS original is accurate; its role is immutably binding *which window* the evidence purports to discuss.
- A date-specific published schedule may classify a window as *publicly indicated positive* or *publicly indicated zero*. Native provider response and independently audited storage are different evidence streams. No same-window public claim should be copied as a label or used to redefine a sample after seeing model performance.
- The six-hour bound is about clock **supersets** and 24-hour rest/washout. Actual training PRE features instead require an **as-of available_at <= flight cutoff** proof. A later completed/altered schedule cannot be used as a T−6h feature by retroactive recomputation.

## Next real engineering and scientific admission actions

1. Complete the uniform **40-window** time-and-operating-population screen, ideally using published authoritative future timetables with precise coverage/date/time and then **separate** authenticated provider receipt, never claiming that an unsupported future native count is positive/zero.
2. Independently precommit matched pair treatment-order allocation; determine true active child segments, split inactive gaps, source query lookahead/refresh rules and earliest T−24h owner arm.
3. Calculate seven REST categories for **physical UTC GET charge days** with measured provider range, latency, retries, current remaining units, protected 50,000 cycle cap and independent 1,900 Alert SEND/day cap. No test-fixture credits can certify this.
4. Confirm published receiver and GitHub-only SOURCE→original→T24/T6/T90 PRE→independent witness→POST/STOP and source use/expiry (#300). Ordinary adaptive days need their *own* early selected airport identities and database-backed global washout.
5. Issue one independent Phase5 scientific FREEZE `PASS` or explicit `HOLD`; Phase6 paid `GO` is a second permission and remains NO until that review.

**Boundaries unchanged:** do not reinstall V0079–V0083, re-run old four-HUB/48/1,013-frame owner selects, dispatch historical P25, call Cloudflare/Replit Agent, or wait for provider email to do this offline evidence-accountability work. Source of truth: Phase5 README, PR #503 real corrected JSON, PR #505 washout, PR #506 date proposal, issue #416 and provider-rights issue #300.
