# Aviation delay data project — management/peer case study and full technical story
**State of the project: 2026-10-17 18:00 PDT.** Written against reviewed GitHub `main=1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00` and dated historical artifacts. **Tonight's Gate3 paid WSSS canary has not yet run; no Phase6 main collection or Phase7 ML results exist.** Historical analyses retain their original dated verdicts.

## 60-second executive explanation — read this to a boss

> We are building a **reproducible aviation-data acquisition system** to support future machine-learning research on **departure/runway delay**, particularly whether real-time flight status and network context can provide useful pre-departure predictors. Before making any accuracy claim, we must know **which flights we could observe, when information became available, whether the correct physical flight was identified, how much data was missing, and whether our paid real-time feed is safely controlled**.
>
> During August–October 2026 we built and tested the collection architecture, ran real airport pilots, discovered both successful observations and limits such as a two-credit YSSY delivery gap, and improved source preservation, reliability and billing oversight. We deliberately preserved imperfect observations as potential qualified research data rather than deleting or re-labeling them. The work took longer than expected because transport, billing, ownership, raw data custody and statistical comparability are different problems; we also acknowledge that some overly strict *research* gates, repetitive re-review and repository clutter caused avoidable delay. We separated **financial safety** (strict) from **research usability** (fit for purpose), reorganized the repository without rewriting the original evidence, and now have reviewed published source ready for one independent-watchdog Gate3 canary. **We have not claimed that the final ML model or main 31-day experiment is finished.**

## Two-minute briefing: what, why, how, where, current results

| Question | Brief answer |
| --- | --- |
| **What** | Instrumented near-real-time observations of airport departures and related flight updates, with research-ready provenance for later runway/departure-delay prediction. |
| **Why** | The model must not learn from future-arriving data, conflate notification items with unique flights, or generalize from one airport's biased sample as if it represented the world. |
| **How** | AeroDataBox Flight Alert webhooks + selective FIDS/REST, Replit published HTTPS receiver, PostgreSQL durable owner/state, raw original payload storage and SHA-256, signed/auth-bound project receipts, GitHub Actions CI and independent live safety monitor. |
| **Where** | Research, AUTH, analyses and evidence: `data-collection/`; runtime: `server/lib/disruption/`, `scripts/`, `server/routes_v3.ts`; orchestration: `.github/workflows/`; deployment: Replit. |
| **When** | Early exploratory gathering **Aug–Sep 2026**; Gate0 account/design checks **early September**; actual two-hour pilots **mid-Sep–Oct 13**; qualified Gate2 closeout **Oct 14**; repository cleanup and reviewed Gate3 release **Oct 15–17**. These are activity periods, not a validated claim of continuous full-time work. |
| **Achieved** | Multiple real received-data windows, reconstructed WSSS 219/220 billed item-credit gap, YSSY 229/231 accounting ratio plus 58/58 original-body SHA custody, successful publisher parity and 4/4 reviewed offline source CI. |
| **Not achieved** | Formal original five-anchor Gate2 promotion; tonight's paid Gate3 certificate; dedicated Gate0.5, Gate4, Gate5; prospective four-anchor manifest freeze; complete 31-batch-day Phase6 data; trained/evaluated Phase7 ML model. |

## 1. What are the actual scientific estimands?

The practical long-term prediction target is a **departure/runway delay outcome**, not simply today's observed flight number. A prospective model requires one row per carefully defined physical flight/runway event, actual target/outcome timestamp and predictors **available by the cutoff time T**. If a provider updates estimated departure after T, it cannot be back-filled into a T-time prediction. Use explicit time zones, received/event clocks, label latency and an `as_of` cutoff. Airport traffic, route connectivity and flight features must be defined before the protected experiment rather than cherry-picked using future outcomes.

The system has several noninterchangeable counts: (1) **provider sent/billed flight items**; (2) **durably received item credits**; (3) **webhook HTTP requests** that can contain multiple items; (4) **unique physical-flight identities**; (5) **eligible scheduled/observed FIDS flight population**. None of those is automatically another's denominator. For example WSSS 36 raw webhook payloads contained 219 flight items but 134 reconstructed physical-flight identities; 36, 219 and 134 answer different questions [WSSS reconstruction](phase2g/reports/2026-09-21_P2G06_WSSS_RECONSTRUCTION.md).

## 2. System flow and trust boundaries

```text
Research question + frozen scientific plan
            |
Airport/UTC treatment windows; exact AUTH, SHA, one-run budget
            |                         GitHub Actions (CI/release/evidence)
            v                                  |
AeroDataBox flight alert (provider SEND billed per flight item)
            |     failure/timeouts may incur charged, missing deliveries
            v
Public Replit HTTPS prepaid webhook /api/v1/webhooks/aerodatabox/...
            | verify endpoint ownership and session; durable original-before-ACK
            v
Raw object storage (original bytes + SHA-256) + PostgreSQL
   |                      |
   | original readback    | LOGGED durable financial/owner receipt
   |                      | UNLOGGED ephemeral receive-session state
   v                      v
Identity and clock normalization, event-time/as-of features
            |
Independent FIDS denominator + coverage/missingness audit
            |
Prospectively frozen Phase5 sampling + Phase6 retained dataset
            |
Phase7 leakage-safe train/validation/test → descriptive metrics/ML
```

**Why both PostgreSQL LOGGED and UNLOGGED?** Persistent authorization/owner/terminal evidence must survive a crash. Transient callback rows are optimized for live state; PostgreSQL explicitly documents that UNLOGGED relations are truncated after a crash. We test this difference with disposable PostgreSQL rather than interpreting a vanished UNLOGGED row as proof a provider subscription was deleted [PostgreSQL documentation](https://www.postgresql.org/docs/16/sql-createtable.html).

**Why external independent watchdog?** If the paid Replit owner disappears, it cannot safely delete its own provider subscription. An independent, source-pinned GitHub Actions process can monitor and stop **only the exactly owned** one by verified provider ID/callback. It cannot CREATE a second subscription. Fail-closed ownership is justified for *financial exposure*, even when scientific missingness is tolerable. See [Gate3 operator playbook](phase3/2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md).

**Why two credit budgets?** Marketplace **API units** pay for certain REST calls/refills, while **Alert credits** are consumed when alerts are **sent**, not necessarily received. Provider docs explicitly state one credit per flight item and billing for failed delivery attempts or billable retries [AeroDataBox 2026 Flight Alert guide](https://aerodatabox.com/flight-alert-api-2026/). A 50-credit watchdog is a soft target, **not** a provider hard spending parameter.

## 3. Dated evidence-backed project chronology

| Date (UTC unless indicated) | Evidence milestone | What it proves / does not prove |
| --- | --- | --- |
| Aug–Sep 2026 | Early AeroDataBox batches, rotating UTC collection proposal and initial airport-route/tail datasets | Feasibility and feature brainstorming; **not** a frozen main sampling population |
| Sep 9 | Gate0 account/entitlement correction in [checklist](phase1/GATE0_INPUT_CHECKLIST.md) | Different marketplace keys or plan periods require separate observed quota evidence |
| Sep 13 | MrAirspace/ADSB.lol reference candidate rebuild, run **34732924481**, 2,295 airports and 27,669,229 resolved observed movements | Reproducible *observed movements* proxy, **not** a licensed scheduled timetable or final binding reference [reference freeze](phase2/V3.9_PHASE2_REFERENCE_FREEZE.md) |
| Sep 16 | OMAA P2G03 two-hour real success (historic file P2G02 name retained) | Valid Stage1 received observations, paid ownership, preflight blocked unhealthy callback once before passing [OMAA report](phase2g/reports/2026-09-16_P2G02_OMAA_SUCCESS.md) |
| Sep 21–22 | WSSS P2G06 36 original verified webhook payloads, 219 durably received items vs 220 billed | Real data; one unaccounted charged item credit; strict historical reconciliation failed, not “no data” [WSSS report](phase2g/reports/2026-09-21_P2G06_WSSS_RECONSTRUCTION.md) |
| Sep 25–26 | MMUN physical-flight identity/candidate comparability faults, incident taxonomy and prevention | A transport-successful feed can still create mathematically wrong row/route identities [failure report](phase2g/reports/2026-09-26_PHASE2G_COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md) |
| Sep 29–Oct 3 | Later WSSS, OMAA, MMUN, SKBO tests and research reference promotion candidates | Genuine data, site-specific yields; not every airport satisfied capacity criterion |
| Oct 13 | YSSY P25 observed **7203.639s**, 58 SHA-verified original callback bodies, **229 received** items vs **231 provider billed**; 107 resolved physical identities | Useful and real field observations; the **strict exact-credit instrument certification failed** [YSSY P25 report](phase2g/reports/2026-10-13_P25_YSSY_120MIN_COMPLETED_PROTOCOL_FAIL_RESEARCH_CANDIDATE.md) and [Oct14 reconciliation inventory](phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md) |
| Oct 14 | Five-site Phase2 fieldwork closed under qualified exploratory exception; original 5-anchor Gate2 remains HOLD | A scoped **administrative progression**, not rewriting failed probe or asserting general population coverage |
| Oct 15–16 | Repository Waves A/B/C2 move historical materials with immutable blob identities, 108 scientific + 352 evidence items | Navigation easier, original evidence preserved, path-sensitive code checks and CI corrections [maintenance](../docs/repository-maintenance/START_HERE.md) |
| Oct 16–17 | Gate3 source-only PRs [#60](https://github.com/HKcode22/ReplitTranvr/pull/60) and [#61](https://github.com/HKcode22/ReplitTranvr/pull/61) merged, 4/4 CI each; published Replit identity reports exact main `1a9a0ca9...`; extra Replit `Published your App` commit same source tree | Real source/published parity and operator readiness, **not** proof a new paid subscription ran [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) |
| **Oct 17 20:00 PDT, future** | One approved WSSS Gate3 600s / 50-credit soft-stop attempt | **NOT YET EXECUTED** at time of this writing |

Dates describe checked-in records and verified milestone dates, not inferred timestamps for work lacking a recorded wall clock. Historical descriptions such as PR36 still being a current gate must be read **as of their original date**, not as 17 October status.

## 4. Scientific imperfection is NOT the same as permission for unreliable accounting

For an isolated provider interval, compute **external billed Alert items** `C_external = B_before - B_after_stable`, **internal persistently received item credits** `C_received = Σ cost(item) over SHA-verified original callbacks`, and `G = C_external - C_received`. This arithmetic should be exact and auditable; if `G > 0` it tells us we cannot prove complete delivery. It **does not** give the count or selection mechanism of missed distinct physical flights.

- WSSS: `219/220=99.54545%` **billed item-credit capture**; gap `1`. This is **not a 99.54545% worldwide flight capture estimate**.
- YSSY: `229/231=99.13420%` **billed item-credit capture**; gap `2`. Valid received identities remain scientifically available under restricted, transparent evaluation.
- A proposed **research-only** illustrative filter is `G <= 2` **and** `G/C_external <= 0.01`, *plus* full window, source custody, closed account, no identity/cost contradictions. This can mark an independently verifiable historical-type sample as **QUALIFIED_RESEARCH_CANDIDATE**. It does not retroactively mark the original zero-gap instrument protocol PASS or make a missing-not-at-random sample representative.
- **Counterexample:** if a particular 10-minute 50-credit canary loses one billed item, `1/50=2%`, above a 1% illustrative rule. Do not invent a universal threshold just to pass this or discard otherwise valid raw observations.
- Missingness may correlate with network failures, flight time, airport, route, extreme delays or retries. Under MCAR/MAR/MNAR distinctions and Rubin/Little missingness theory, small **amount** missing alone does not prove **unbiased inference**. Evaluate selective missingness, sensitivity analyses, and a credible independent denominator. [Rubin 1976](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b); [Little 2021](https://www.annualreviews.org/content/journals/10.1146/annurev-statistics-040720-031104).
- NIST Research Data Framework describes accuracy, completeness, relevance, consistency, reliability and data quality as **fitness for purpose**, not a single zero-gap universal pass percentage [NIST RDaF SP 1500-18r2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html). STROBE calls for explicit missing-data handling, analysis design and sensitivity reporting [STROBE](https://www.strobe-statement.org/checklists/); STROBE is **reporting guidance**, not a way to award project Gate3 PASS.
- Financial/identity safety is different: an unknown billable subscription, invalid AUTH, secret leak, wrong session/source, uncontrolled refill, inability to STOP exact-owned subscription and missing original bytes **must** HOLD. We deliberately will not tolerate unknown charges or change historical accounting labels for convenience.

## 5. Why did this take so long? Accountable retrospective

**Real engineering work, not merely "overthinking":** provider SEND billing differs from HTTP delivery; signed callback original custody vs parsed rows; transient database rows disappear after restarts; webhook/server deployment and owner process have independent lifetimes; ambiguous POST/DELETE results are unsafe to replay; airport flight identifiers are not always physical identities; scheduled vs ADS-B-observed traffic are different constructs; source release GitHub SHA can differ from Replit's published SHA. Each required testing based on direct failure or meaningful risk.

**Also avoidable:** (a) Too many reports and draft branches before an operator-oriented single current-status page; (b) repeating broad Phase2/P25 QA even after bounded evidence had stopped changing; (c) treating **every** one-credit mismatch as grounds to declare *scientific observations themselves* void instead of separately labeling a strict instrument failure; (d) over-specifying lower-risk hypothetical failure cases while the user needed a single paid Gate3 integration path; (e) historical root-level folder duplication, conflicting document indexes and unmerged PRs confusing navigation; (f) deadlines and cost estimates made without actual GitHub/paid run timing evidence. These are process decisions we should improve; they do not negate genuine hard integrity failures.

**Proposed leaner rule going forward:** (1) define precisely what a gate measures; (2) separate mandatory P0 security/billing/identity from scientific measurement quality; (3) accept **qualified** received-data evidence with explicit missingness/bias assessment where valid; (4) one owner, one latest checkpoint, one current runbook, no blanket re-runs; (5) source-controlled, versioned prospective amendments; (6) release only after exact-head CI and published parity, but do not demand metaphysical zero bugs; (7) after an actual canary, decide the next phase from the actual receipts rather than endless preparatory reports.

## 6. What's next — and what to say we haven't done

**Phase3**: Gate3 one-time paid WSSS canary (tonight), then separate Gate0.5 provider-native schedule/outcome-cadence and Gate4 budget/second-start evidence **only if separately authorized**. **Phase4 Gate5:** compare provider-observable flight-population/FIDS denominator and webhook coverage by location/time/route; unknown denominator is not quietly coded as 0 missing. **Phase5:** prospective four-anchor (WSSS/OMAA/SKBO/YSSY) plus two MID and one REGIONAL sampling architecture, UTC balance, 31 parent batch-day calendar, 26 ordinary 4-hour days + three split + two extended, source/clock/identity label freeze and both budgets. The original five-anchor gate remains historically NOT_PASSED. **Phase6:** execute separately approved paid batch collection. **Phase7:** train/evaluate after useful Phase6 data, protect as-of features and train/validation/test split. A nominal `31 × 1,900 = 58,900` Alert credits exceeds the preliminary `57,900` run-total ceiling, so budget must be reconciled; **no known main-start date is guaranteed**.

## 7. Five-minute Q&A for colleagues

- **“Is the model working?”** Not yet a valid generalization claim: Phase7 model validation awaits real Phase6 data and a frozen as-of/outcome contract.
- **“Did WSSS fail?”** Some early WSSS strict billing reconciliation failed by one item credit, while later WSSS pilot evidence passed; “WSSS failed forever” is factually wrong.
- **“Did YSSY fail?”** It supplied a complete-duration, source-verified, scientifically useful *observed* dataset; the original exact accounting acceptance failed and stays recorded failed.
- **“Could any missing data be allowed?”** Yes, with proper denominator, source proof, missingness mechanism/selection and sensitivity analysis. Not all missingness is harmless; a small proportion alone does not establish an unbiased sample.
- **“What did the GitHub work accomplish?”** Immutable historical custody, readable navigation, no-provider CI and production parity—none are a substitute for independent, real paid-run receipts.
- **“Are we done?”** Phase0–2 historical science and Phase3 engineering are substantially advanced; Gate3 live still pending, then Gates0.5/4/5, Phase5 freeze, Phase6 and Phase7 remain.
- **“How can one 50-credit run exceed 50?”** A provider sends/bills asynchronously; our monitors can request deletion after detecting a threshold, not prevent all sends in an in-flight burst.
- **“Do we use Cloudflare or Replit AI Agent?”** No. Reviewed Replit published deployment, exact GitHub Actions watchdog and human Replit Shell actions only.

## 8. Primary project evidence and independent literature

[Scientific Plan](plans/V3.9_DataCollectPlan_f.8.md) · [Implementation Log](implementation/V3.9_IMPLEMENTATION_LOG.md) · [Original Ledger](evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md) · [Phase2G dated reports](phase2g/ALL_REPORTS.md) · [Phase3 current technical manual](phase3/2026-10-14_TECHNICAL_GUIDE_PHASES2_TO7_AND_CURRENT_GATE3.md) · [Gate3 one-time operator playbook](phase3/2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md) · [live checkpoint Issue38](https://github.com/HKcode22/ReplitTranvr/issues/38).

Independent sources: [AeroDataBox 2026 credit billing](https://aerodatabox.com/flight-alert-api-2026/); [PostgreSQL 16 UNLOGGED](https://www.postgresql.org/docs/16/sql-createtable.html); [NIST RDaF quality framework](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html); [STROBE reporting guidance](https://www.strobe-statement.org/checklists/); [Rubin (1976) missing data](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b); [Little (2021) missing-data assumptions](https://www.annualreviews.org/content/journals/10.1146/annurev-statistics-040720-031104).
