# Phase 5 — Owner/team technical checkpoint: real airports, five pairs, routes, predictive value, and the Phase 6 critical path

**Prepared:** 2026-11-09 UTC.  
**Status:** educational and engineering handoff, NOT a signed science FREEZE, new provider authorization, or Phase 6 GO.  
**Source of truth at preparation:** GitHub main commit d182e874df09d6414ff096bddcb8fb114c64da10 (merged PR #501), Phase 5 README, original owner readbacks and proposed f.8 Amendment D. Verify current main and all new evidence when resuming.

## 1. A meeting-ready summary (read aloud)

We are designing a prospective aviation disruption dataset, not merely a historical list of delayed flights. Phase 5 is the **design, safety, and operational freeze** before Phase 6 begins collecting a 31-parent-batch-day study. We have verified the real airport-reference frame and our four selected HUBs, screened all twelve MID/REGIONAL tier-by-region groups, and generated five reproducible four-airport crossover proposals from a seeded draw over the full qualified pool. We found a scope problem at KTEB (scheduled common-carrier passenger flights are excluded there), preserved the original draw, and implemented a deterministic one-slot replacement procedure; the owner's pasted continuation reports **KBUF**, but the pasted checksum was truncated and a complete corrected production receipt is **not yet archived here**. The pair set is therefore not signed. The next release-critical work is final airport operating-population eligibility, independent treatment-order assignment, a real feasible 31-day time/source/budget calendar, authenticated source-to-PRE/POST delivery and legal-use constraints, then ONE independent Phase 5 FREEZE verdict. Phase 6 paid activation is a separate decision. We do not need a promise of perfect data; we need honest denominators, source timestamps, observable labels, sample adequacy and limitations.

## 2. Facts verified versus not yet proven

| Item | What evidence establishes | What it does NOT establish |
| --- | --- | --- |
| B0062 active airport reference | 4,346 active frame rows; 1,125 with frame PRE+POST eligibility: 111 HUB / 427 MID / 587 REGIONAL; same active reference/version hashes | Live purchasable flight records, complete scheduled-passenger operations, legally retainable ML training corpus |
| Four owner-chosen HUBs | WSSS, OMAA, SKBO, YSSY each true HUB, schedule+live source flags, frame PRE+POST eligible | Original five-HUB Stage2 Gate2 scientific PASS; physical operating-leg outcome, current Alert budget |
| Twelve MID/REGIONAL strata | All six mapped regions represented in both MID and REGIONAL; 48 screening records archived | Random sample if using just top-48 |
| Strict full-frame sampling | 427 MID + 586 strictly feed/metadata-qualified REGIONAL = **1,013**; 15 distinct selected non-HUB identities across five pair proposals | Every selected site has suitable scheduled passenger flights during future run dates |
| Pair 3 correction | PR #501 archived original seed/draw and scoped a no-cherry-pick KTEB exclusion | A fully checked corrected owner result; user paste reports KBUF but ends mid-digest |
| Phase 5 operational environment | V0079–V0083 and least-privilege GitHub database worker infrastructure already commissioned; Nov 8 readback saw 16 present, empty Phase 5 operational tables | Signed actual run calendar, successful published webhook persistence, paid release |
| Legacy YSSY P25 | Administrative closeout completed; historical 231 billed / 229 received gap preserved | Retroactive scientific success |
| Gate states | Phase 5 FREEZE = HOLD; Phase 6 paid GO = NO | A reason to stop offline engineering while waiting for vendor email |

**Never convert:** frame eligibility to observed real flights; query reservation to source response; PRE snapshot to actual runway departure; source silence to an on-time/negative label; a simulation/CI pass to production source and receiver proof.

## 3. B0062 is not a separate database

B0062__v39_schema_baseline_20261001.sql is a **versioned database schema/baseline artifact**, a SQL file that defines database structures and reference logic. It does not mean “database number 62,” and you will not see a separate “B0062 database” in Replit. The application's PostgreSQL database can contain schemas such as **clean** (research and collection) and **public** (app/service). Tables are addressed as schema.table, for example clean.adb_phase6_calendar_day or clean.flight_population. The active B0062 **sampling frame** is an actual versioned set of airport metadata/eligibility rows maintained in that database. The **frozen frame hash** identifies the exact reference version. The full row data and run-day source/feature tables are different things.

Read the permanent file **PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md** for all 76 baseline table descriptions (48 clean + 28 public), the Phase 5 additive migration families and the Replit database-browser explanation. An empty Phase 5 day/source table is expected **before** a prospective run; it does not erase old pilot data in other tables.

Technical analogy: B0062 is similar to a **schema/migration specification**; the active airport frame is a **versioned relation** in PostgreSQL; the source/prediction records are **future transactional rows**. A SHA-256 reference digest checks reproducibility of metadata, not that a provider delivered an operational flight.

## 4. What the shell commands are actually doing

A one-line owner Replit shell launcher generally downloads a specific **GitHub Git blob pinned by SHA**, checks that its source matches the reviewed main ancestry and safety preconditions, then runs a narrowly scoped script against the owner's real database. A Git blob SHA is the identity of the **script contents**; a Git commit SHA identifies a **repository snapshot**. They are not flight IDs or database tables.

The recent scripts used **BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY**: a consistent PostgreSQL read transaction that rejects writes, then **ROLLBACK**. They ask concrete questions in order:

1. **Frame census:** How many eligible HUB/MID/REGIONAL airport records exist in each geographic stratum? Do their frozen source hashes match?
2. **Four-HUB check:** Do the exact four owner-chosen anchors exist, in the correct regions/tiers, with candidate PRE and POST feed flags?
3. **Twelve-cell screen:** Are the required MID and REGIONAL populations nonempty in each of six regions? What are the strict feeder counts and up to four inspectable examples per cell?
4. **Full 1,013-row seeded draw:** Given a seed fixed before inspecting the selected airports, which fifteen distinct MID/REGIONAL airports are chosen for five four-slot crossover templates?
5. **KTEB objective adjudication:** Can the original exact draw be reproduced, then **only** the one ineligible KTEB slot replaced by deterministic within-stratum ordering, leaving the other nineteen slots untouched?

These commands are **discovery and reproducibility checks**, not payment requests, a secret reset, five separate new databases, or Phase 6 collection. Do not rerun old successful census / four-HUB / 48-shortlist / original draw / V0079–V0083 installers. The corrected draw's full digest is still needed for an evidence archive; the user-supplied excerpt ends after “f511”.

### Small SQL learning example (illustrative, not executable production SQL)

    SELECT tier, region, COUNT(*)
    FROM eligible_airport_reference
    WHERE pre_eligible AND post_eligible
    GROUP BY tier, region;

GROUP BY makes one **summary row per tier/region**, while COUNT totals qualifying rows. ROW_NUMBER() OVER (PARTITION BY tier,region ORDER BY traffic DESC) ranks records **within** each group; using the top four per group is a **screening shortlist**, not a probability sample. The full draw instead ranks **all 1,013 strict records** within predetermined strata using SHA256(seed + pair + slot + ICAO) and takes the first unused airport. SQL JOIN later connects a frozen run-day, selected airport, permitted source query, durable original response, flight identity, cutoff-safe PRE and conditional POST observation without treating missing links as confirmed outcomes. One-to-many source-to-flight joins require unique keys and explicit anti-duplication.

## 5. Why there are four HUBs but five SKBO/WSSS/other pair comparisons

A **HUB** is one airport occupying one of four slots on a batch day: 1 HUB + 2 MID + 1 REGIONAL. A **crossover pair** is **two experimental batch-days with the same four airport identities** but different exposure-window treatments. Therefore five pairs do not require five different HUBs. With four distinct owner-approved HUBs, one HUB legitimately repeats across the five proposed pairs. SKBO appears in pairs 4 and 5. This is not a duplicate mistaken flight observation; the planned analyses must account for site clustering/reuse.

| Pair | HUB | MID_A | MID_B | REGIONAL | Eligibility stage |
| --- | --- | --- | --- | --- | --- |
| 1 | OMAA | OMSJ | SPJC | KDEC | Candidate only |
| 2 | WSSS | SBFL | TJSJ | LSZB | Candidate only; schedule seasonality to check |
| 3 | YSSY | **KTEB originally; KBUF reported replacement** | LFQQ | NZNP | Original preserved; corrected final digest/archival proof pending |
| 4 | SKBO | EBAW | NZNS | RJNK | Candidate only |
| 5 | SKBO | YBUD | RKTU | FAKM | Candidate only |

**KTEB, not “KTAB”:** Teterboro is predominantly general/business aviation, and official pre-draw authority excludes scheduled common-carrier passenger service; the study targets scheduled airline passenger departures. KBUF is Buffalo Niagara International Airport, the reported replacement, **not an extra HUB**. Its deterministic assignment must be checked from the actual complete corrected source result before signing. Other small/seasonal airports must receive a source-calendar coverage assessment; low counts may be honestly modeled as missing/low precision, but **no scheduled-passenger operating population at all** is a different population-scope failure. Do not hand-pick “better” airports after looking at outcomes.

## 6. Will these airports and routes be enough for a useful prediction model?

**No scientific design can promise “nearly accurate” predictions before the data and holdout results exist.** The objective is to make an honest, decision-useful prediction and quantify when the model is uncertain or worse than a simple baseline. The key risk is not just the total flight-record count, but the number of **independent days, routes, carriers, delay/disruption events, and observed labels** in each evaluation stratum.

The existing f.8 plan already treats routes as **directed origin→original-scheduled-destination ICAO pairs**, keeps operating carrier distinct from marketing codeshare, and separates original scheduled, operational and actual destinations. A bidirectional route is **two** directed pairs. Route and tail presence alone are not guaranteed usable predictive information: time-of-availability and sufficient historical observations are required. Do not train on later POST facts, retrospective “recent delay” summaries, revised gate timestamps known only after the forecast cutoff, or the same disrupted event split across train and test.

**Design checks required before and during Phase 6:**

- For each site/stratum/day: eligible scheduled departures, attempted FIDS queries, successful originals, unique operating legs, T−24/T−6/T−90 snapshots, usable label outcomes, cancellation/unknown and reason-coded missingness. Count **both successes and failures**; do not silently discard hard-to-observe routes.
- Track unique directed routes, operating carriers, aircraft/tails and consecutive legs; route concentration and tail observation rates; short versus long, domestic versus international, seasonal/rare service; local/UTC time, weekday, weather/regime, airport and region.
- Preserve source timestamps **and available_at** so that route rolling averages, aircraft prior-leg history, congestion, weather issue time and airline history exist **at the forecast cutoff**. A feature computed later from full-month data is retrospective leakage even if its source flight occurred earlier.
- Assess missingness and label observability **by airport, tier, region, route, carrier, prediction horizon, window shape and calendar day**. Use bounded sensitivity analyses and clustered uncertainty, not a global “95% complete” claim hiding a failed airport.
- Maintain a temporally held-out Engine A comparison and the plan's Engine B/C/D/R/P diagnostics, including **Engine R = unseen directed routes**. Four purposively selected HUBs cannot justify “unbiased for all global airports” regardless of airport sampling seed.
- Phase 7 must compare the naive/persistence baseline (Model −1) with a tabular model (Model 1), report the preregistered endpoint, calendar-day block uncertainty, error/calibration/Brier when label semantics support them, and refuse deployment-quality claims from an underpowered pilot. The **original runway-defined primary** is not yet source-certified; the prospective provider-schedule-revision primary is a **separate draft amendment**, not silently the adopted primary.

**If Phase 7 is weak:** report a negative/neutral result honestly; examine source coverage, label semantics, class imbalance, unavailable history and unseen-route performance using TRAIN/VALIDATION, not the protected TEST outcomes. A simpler baseline or narrower supported scope may be better; a later prospectively designed second data cycle can add missing routes, independent days or rare-event coverage. It would not make the first study “for nothing”: a defensible negative pilot plus coverage/uncertainty evidence informs the next experiment. Never tune the primary outcome after inspecting protected test results.

## 7. What the 31-day calendar must actually certify

The proposed f.8 four-HUB design retains exactly **31 parent batch-days**, not necessarily 31 consecutive dates:

- **26** continuous 4h days;
- **3** split 2h + **1h inactive gap** + 2h days (one five-hour wall-clock span);
- **2** planned up-to-6h days (actual STOP may censor exposure early);
- **5** same-airport-set matched crossover pairs: three comparisons 4h vs split 2×2h and two 4h vs up-to-6h, with independently randomized **treatment order** after airport-set admission;
- six UTC start rotations **00/04/08/12/16/20**, explicit local date conversion, time/weekday comparability and at least **24h from prior scheduled END to next START** when repeating airports;
- one early immutable four-airport selection and source-query grid **before** the first physical T−24h cutoff; separate T−6h and T−90m PRE and actual POST;
- one lawful provider source/operating-leg contract and safe current published receiver/STOP proof.

The five crossover pairs are **exploratory pilot comparisons**; n=3 and n=2 within distinct interventions cannot support conventional two-sided p<0.05 sharp-null sign-test claims even under ideal clean measurements. Other ordinary batch-days use prospective rotation/adaptive selection without secretly predrawing all 31 future ordinary airport identities.

### Physical REST, Alert and clocks

**REST units** are separate from **Alert credits**. The physical source-request ledger must charge actual UTC GET dates and cover seven named categories: FIDS base, FIDS split, FIDS retry, validation, outcome, history and diagnostics. Protect the **50,000 REST-unit project cap**, **1,900 Alert SEND credits per parent day** and **57,900 designed Alert-cycle ceiling**, plus actual available balance/headroom and safety reserve. These are upper limits, not evidence that the credits currently exist.

The provider-supported maximum FIDS request range and any rate/latency/cost assumptions must be genuinely verified: a test fixture claiming R=240 minutes is **not** live provider proof. Split-window gaps must never receive source queries as if service were active; the first physical partition of each active child is base, further partitions are split; retries have their own budget category. POST source silence and missing callback are not a zero delay; production MUST retain unknown/censored codes and a safe STOP.

## 8. The shortest real engineering critical path (not more “stages”)

| Order | Deliverable | Completion evidence |
| --- | --- | --- |
| 1 | Archive and independently check **complete KTEB→reported KBUF** correction | One original 20-slot hash, corrected 20-slot hash, exact unchanged 19 slots, one adjudicated slot, original seed/frame hashes and zero write/paid flags |
| 2 | Confirm actual scheduled-passenger source reachability at selected low-volume/seasonal sites | Date-specific supported/zero/unknown and source/operating population reason codes; do not choose airports from downstream outcomes |
| 3 | Freeze proposed paired airport sets and **separately precommit treatment order**, then solve actual dated 31-day calendar | Real dates, six UTC rotations, five replay pairs, ≥24h END→START washout, treatment assignment and train/validation/test split rule |
| 4 | Bind physical partitioned SOURCE request grid + prearm cutoff + seven-category UTC budgets | Valid provider range evidence, exact allowed queries, real live entitlement, REST/Alert ceilings and no unsupported backfill |
| 5 | Verify actual published receiver, GitHub-restricted producer, source original, PRE commit/witness, POST/callback reconciliation and independent STOP | At least one representative prospective source→PRE→POST cohort with truthful denominators and custody, not a simulated or solely FIDS schedule-revision Gate5 inheritance |
| 6 | Resolve a lawful source/retention/ML-use policy and freeze a semantically supported primary label | Dated rights/TTL/backup lifecycle and actual-only vs schedule-revision endpoint amendment; do not wait for vendor email to work offline |
| 7 | One independent Phase 5 scientific FREEZE/PASS-or-HOLD review; separately authorize paid Phase 6 | Evidence-bundled verdict, no synthetic PASS, no implicit paid dispatch |

**No more:** repeat P25 cleanup; fake raw original/flight identities; install V0079–V0083 again; re-run prior successful four-HUB, 48-candidate or original 1,013-row draw; wait for provider email before writing safe code; pretend any CI PASS is deployed receiver proof. The work is now about **closing specific release dependencies**, not inventing Stage32+.

## 9. Team-meeting Q&A scripts

**Q: What did we collect already?**  
A: We collected real prior pilot data and verified live PostgreSQL metadata and eligibility, plus a reproducible planned airport sample. The Phase 6 month-long dataset has **not** started, and its calendar/source tables were empty at the Nov 8 inventory.

**Q: Why do we care about sampling bias?**  
A: Collecting only high-traffic, provider-friendly airports/routes can produce deceptively high performance. We seeded the full stratified 1,013-airport draw instead of using only the top-48 inspected airports; we still limit claims to the supported operational frame, and must quantify route and label coverage.

**Q: Do we need a thousand features before launch?**  
A: No. Freeze the measurable as-of features, route/aircraft identity, label and population definitions first. Optional unavailable weather/ADSB/history are explicit NULLs with timestamps/reasons. Advanced ML cannot fix invalid labels or leaked POST information.

**Q: Is the KBUF correction a failure?**  
A: It is a transparent **post-selection** operating-scope adjustment using one public prior eligibility rule. The original seeded draw remains archived; the replacement is acceptable for review only when exact one-slot reproduction is independently verified.

**Q: What if the model performs badly?**  
A: Compare against the prespecified persistence baseline, examine performance by route/airport and confidence/coverage, report uncertainty, narrow scope if necessary, and use a later independently designed data cycle. Do not rewrite the test set.

**Q: Are we ready to spend and start Phase 6?**  
A: Not yet. Phase 5 FREEZE is HOLD. We can progress on code/calendar/rights review without more paid calls, but only a separately audited GO can begin the month.

## 10. Continuity and technical source pointers

- data-collection/phase5/README.md — living chronological current-state index; newer sections supersede older unresolved historical statuses.
- data-collection/phase5/2026-11-09_REAL_FIVE_PAIR_SCOPE_ADJUDICATION_KTEB.md — exact original five-pair record, official Teterboro scope evidence, deterministic replacement contract.
- data-collection/phase5/2026-11-09_ACTUAL_48_B0062_AND_FULLFRAME_FIVE_CROSSOVER_PRESELECTION.md — 48-screen vs 1,013-probability-frame distinction, 12 strata and precommitted seed.
- data-collection/plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md — prospective four-HUB design, rights/sampling/cost caveats.
- data-collection/phase5/2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md — four actual release deliverables and stop inventing stages.
- data-collection/phase5/PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md — database teaching atlas; B0062 and V0079–V0083 distinctions.
- data-collection/phase5/PHASES_1_TO_5_OWNER_FIELD_GUIDE_AND_PHASE6_PRESTART.md — phases, original science, feature custody and how the month runs.
- data-collection/plans/V3.9_DataCollectPlan_f.8.md — route/OD §7.5, feature timing §6, historical store, evaluation and metrics §13.
- GitHub PRs #498–#501 and issue #416 — historical evidence/actions; issue #300 — provider/use rights context.

**The next assistant/session should:** check CURRENT main and this README; first obtain the complete corrected Pair 3 owner receipt if not archived; do not hallucinate its final checksum; then advance the independent corrected-pair review and real-calendar feasibility/budget engineering in a single focused PR with appropriate offline tests. Keep the scientific/paid HOLD boundaries intact.
