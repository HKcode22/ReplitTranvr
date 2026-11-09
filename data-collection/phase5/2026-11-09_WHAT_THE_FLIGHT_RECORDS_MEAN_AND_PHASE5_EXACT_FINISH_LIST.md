# What we actually collected, what “12 conditional flight identities” means, and the exact remaining Phase 5 work

**Owner-readable technical guide and scope-control checkpoint — November 9, 2026.** This explains recorded evidence and source-code roles. It does **not** override the scientific plan, claim that Phase 5 has passed, authorize a paid API request, or create a new numbered “stage.” GitHub main at the time of review: `f23a0586ed86b12fd7399a001b928f3bdba5c597`; current exact owner read-only primary SQL observation: **2026-11-09T13:42:38.603Z**.

**Read these authoritative records for the claims below:** [Phase 4 Nov 6 Gate 5 outcome](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md), [Phase 3 paid operational trials](../phase3/README.md), [Phase 2G closeout](../phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md), [binding f.8](../plans/V3.9_DataCollectPlan_f.8.md), [draft first-cycle target Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md), [Phase5 exit criteria](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md), [owner stop-loop directive](../phase4/2026-11-03_OWNER_DIRECTIVE_NO_PERFECTION_LOOP_FAST_SCIENTIFIC_GATE5_CLOSURE.md), [Phase5 freeze issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413), [timed owner #416](https://github.com/HKcode22/ReplitTranvr/issues/416). “Observed” and “approved” are distinct. Do not infer record-level evidence from aggregated counts.

## 1. What are we building — the specific product and study?

The overall goal is to **collect a geographically and temporally varied flight dataset** so Phase 7 can test whether information known *ahead of time* gives useful, calibrated, traveler-facing disruption predictions. In Phase 6, the experiment would collect **31 approved batch-days**. On each batch-day, four airports are selected: one HUB, MID_A, MID_B and REGIONAL. There are planned sampling probabilities and five matched crossover comparisons of window shapes. For individual eligible flight/service records at those airports, the source system acquires observations at **T−24h**, **T−6h**, and **T−90m**, and later an outcome observation.

Phase 5 is **not another month-long collection**. It is the release engineering and protocol decision: define what records/labels we claim, install and connect the existing GitHub workers, sign dates and costs, and ensure the Day 1 automation can start and stop safely. Phase 6 collects the batch-days; Phase 7 trains/evaluates models. The 31 **engineering stage numbers** found in older Phase 5 files are just implementation history, not 31 tasks required before Phase 6.

## 2. Four distinct notions that earlier explanations mixed together

| What we mean | Example of evidence | What that evidence permits us to say | What it does NOT automatically prove |
| --- | --- | --- | --- |
| **An authentic provider observation** | A FIDS response with original response/body hash, retrieval/availability time and request scope | “AeroDataBox returned this scheduled-service information at this recorded time.” | The service certainly flew, actual runway movement, or a unique operating aircraft leg |
| **A conditional scheduled-service identity** | Query-filtered provider record keyed by operator/flight number, departure airport, destination, service date and first scheduled departure reference | “We can compare the provider's records for this specifically defined *scheduled-service* key across earlier/later snapshots, if they match unambiguously.” | Independent certified physical operating leg, the exact flight's aircraft tail or guaranteed commercial operation |
| **A provider-native operating-leg identity** | A verified source-native operating-leg identifier/role consistently attached to the same departure across original observations | “We have positive stronger evidence these observations refer to the same provider-identified operating leg.” | An actually completed takeoff or physically observed wheels-off timestamp |
| **A physical departure outcome** | A field/source explicitly established as *observed actual* gate-out or wheels-off, correctly matched to that same flight and available after event | “This leg actually departed at the observed physical milestone, so a physical delay target may be defined.” | That another provider field labeled scheduled/revised/estimated means the same thing |

**“Certified” in this guide means that *the exact field + source + timestamp + identity join needed for a scientific claim* has positive reviewed provenance, not that the flight data are fake, that the vendor is unreliable, or that a special official aviation certification is required.** A genuine record can support one measurement and not another. We should use it for the measurement it does support.

### Why the original physical-flight question keeps appearing

The original f.8 first-cycle primary model goal was physical **gate-out / wheels-off departure delay**, a continuous-minute outcome. For that particular label, a schedule string or a field that might be **actual or estimated** cannot be silently treated as an observed actual runway event. The authentic older webhook and flight position observations from Phase 3 and Phase 2G belong to **different cohorts**; joining them to November 6 service keys merely because a flight number or airport looks similar would invent evidence. **This is a limitation of one proposed target, NOT a reason to rerun every flight collection.**

There is an already written prospective alternative, **draft Amendment D**: predict whether **the provider's reported scheduled-departure time changes by at least 15 minutes** from its T−6h version to the last comparable version by T+2h. This measures *provider schedule revisions*, not wheels-off, late actual departure, or airline delay. It is a potentially useful, different traveler-facing target; adopting it formally before future data is the decision. Do **not** continue investigating original runway semantics in every engineering session.

## 3. Exactly what the “12 conditional identities” were

The **12** refers to **12 distinct analysis keys in the November 6 WSSS Gate 5A FIDS-only test**, **not** to “the entire Phase 6 experiment will use only 12 flights,” **not** to 12 confirmed native-operated flights, and **not** to a special AeroDataBox product called a conditional identity.

Think of a source response that says, in effect: `airline/flight number + requested departure airport + destination + service date + first observed scheduled departure T`. The program constructs a **stable composite key** from independently available provider/query fields so it can compare records across time. “Conditional” means “these records are considered the same *scheduled service for this analysis only if the source match and ambiguity checks pass*.” It is not a probability or a hypothetical flight. **We have not pasted any of the twelve actual IDs or flight numbers here; do not make them up.**

The exact historic counts in the Nov 6 independent decision are:

| Count | What was actually observed | What must not be inferred |
| ---: | --- | --- |
| **9** | Authentic FIDS PRE source-original responses | 9 distinct aircraft, 9 Alert subscriptions or a month-long dataset |
| **12** | Conditional, query-filtered scheduled-service **identity keys** | 12 source-certified actual operating legs |
| **36** | On-time PRE snapshots: **12 service keys × 3 horizons** (T−24h, T−6h, T−90m) | 36 different flights |
| **3** | Authentic FIDS POST originals | Three independently verified physical departure events |
| **36** | Schedule-version comparisons (same service keys and horizons) | 36 physical departure delay labels; rare-event prediction accuracy |
| **0 in that G5A test** | Generic Alert subscriptions/webhooks and actual-only wheels-off rows in the audited path | That earlier Phase 3 callbacks did not exist; they belonged to other cohorts |

All 36 recorded schedule-revision comparisons in that small pilot were below the proposed 15-minute threshold. This is useful **engineering and descriptive** evidence, but not evidence the model can discriminate rare positive changes: the pilot had no positive observations under that threshold and was not a population-level Phase 7 evaluation.

The flow in that existing November 6 study was roughly:
```text
real airport FIDS PRE source responses (9 originals)
          ↓
identify 12 conditional scheduled-service keys
          ↓
three cutoff-safe PRE snapshots per key (36 rows)
          ↓
later FIDS POST responses (3 originals)
          ↓
compare scheduled-time versions (36 comparisons)
```
That flow **worked for this narrow scheduled-time measurement**. Do not pay again just to repeat it.

## 4. Where does the data come from? There is no single “12 flights” source

| Source/transport | What it is used for | What we already tested |
| --- | --- | --- |
| **AeroDataBox FIDS REST GET** | Airport/departure feed snapshots; provider-described scheduled/revised fields, flight numbers, airports, source timestamp, status | Phase 4 Nov6 original→T24/T6/T90 PRE→POST measurements |
| **AeroDataBox Flight Alert** | Separately paid subscription. AeroDataBox sends callback **webhook POST** items as status/event updates arrive | Phase 3 genuine bounded CREATE/receiver/original/STOP trials; earlier Phase 2G deliveries |
| **ADSB.lol / other independent sources** | Optional aircraft movement/position reference where lawfully and reliably available; position ≠ automatically exact scheduled service identity or exact wheels-off | Limited historical observations, different pilots; not universal Phase 6 blocker |
| **NOAA / BTS / external outcomes** | Optional weather/reference outcomes with their own source, geographic coverage, time lags and allowed uses | Historical exploration; no claim of complete global join |
| **GitHub Actions** | Runs source and write jobs at reviewed clock times, with limited secrets and per-role PostgreSQL permissions | Nonpaid/CI workers and discrete source/persistence code; **complete automatic 31-day producer not yet live** |
| **Neon PostgreSQL** | Stores registered calendar, physical provider attempt reservations, authentic original hashes and normalized membership, cutoff PRE, witness, quality/missingness and budget records | Schema and roles installed; Phase 4 real rows in different tables; new Phase 5/6 setup tables still empty at Nov9 13:42 UTC |
| **Published Replit server** | HTTPS endpoint for asynchronous provider callback webhooks, raw-before-ack storage and bounded STOP | Earlier paid callback operations; Nov9 read-only public endpoint reported reviewed V2 published SHA; no signed **new** Phase6 webhook yet |

**FIDS source GET** is the ordinary scheduled-flight snapshot; **Flight Alert webhook** is an independently purchased event notification. One doesn't create the other. A raw callback, a flight-schedule record, an aircraft track, and a physical departure label are distinct observations which may or may not be joinable to the **same** flight.

### What is the “replica manager,” Replit, or the SQL replica check?

There is **no new Phase 5 requirement called “replica manager”** in the four-exit checklist. Three similar-sounding terms can be confusing:
- **Replit** hosts the published callback web app. It is not the airline data source or the project scientific manager.
- A **PostgreSQL read replica** is a copy of a database that may be read-only. The inventory script's `pg_is_in_recovery() AS replica` verifies the query reached the expected **primary** database, not a standby copy. `replica=false` in your Nov9 output is **a good result**, not a missing feature.
- The GitHub **owner/worker** executes a restricted job (source, PRE, independent witness, STOP) under its own approved credentials. This separation prevents one compromised component from rewriting everything. We already installed/tested these roles. You do not need to install a “replica manager.”

## 5. Why do Phases 2, 3 and 4 look similar, and what can we reuse?

They deliberately used some of the **same external provider capabilities**, but tested different questions. We should **reuse** each successful layer rather than pay again:

| Phase | Actual job | Reuse in the next phase | Don't repeat |
| --- | --- | --- | --- |
| **Phase 1** | Choose/verify initial AeroDataBox integration, separate REST/Alert units and establish initial source/account constraints | API client, plan history and billing safety arithmetic | Re-ask subscription identity and historic limits every chat |
| **Phase 2/2G** | Determine what airports and routes have useful observations; test actual delivery, source population and coverage | Airport reference frame, real coverage/failure observations, geography/tier priors, delivery telemetry | Original YSSY repeated same test or assume billed=delivered |
| **Phase 3** | Prove *paid Alert* session ownership, original callback custody, duplicate/lost delivery recovery and STOP | Proven subscription controller, receiver, independent stop logic, paid-incident records | Buy a new Alert solely to demonstrate CREATE/STOP again |
| **Phase 4** | Prove a **narrow prospective** before/after source experiment at genuine clock deadlines, with known bias and uncertainty | Nov6 nine PRE sources → 36 cutoff-safe PRE → three POST technical evidence; original source/flight-candidate logic; quality counts | New identical three-horizon FIDS pilot or pretend a schedule revision equals physical runway delay |
| **Phase 5** | Freeze a **one-month, generalizable sampling and collection operating procedure** from all those tested modules: 31 batch-days, 4 airport slots/day, genuinely early sampling, source/clock/budget/expiry permissions, automated GitHub source/PRE/witness/POST/STOP and independent release decision | All completed Phase1–4 modules/data; plus V0079–V0083 schema/NOLOGIN roles, early draw, sampling readback, source/budget builders, receiver V2 identity | Reinstall schema, rebuild the alert receiver, remake prior source/POST modules, add arbitrary Stage32+ or retest a resolved G5A observation |
| **Phase 6** | **Operate** the 31 prospectively scheduled batch-days under the frozen protocol; accumulate real flight/source/label/missingness evidence and Day1 operational receipts | Phase5 signed producer/calendar/budget/STOP | Require all 31 days of outcome data **before** launch |
| **Phase 7** | Train/validate/test the approved model on permitted data and report calibration, missingness, bias and actual prediction performance | Collected, feature-time-safe, target-specific evidence | Promise a target accuracy before running the experiment |

**Why Phase5 took longer than it should:** late discovery that the four airports had to be selected earlier than the first T−24h source cutoff, numerous separate narrow CI/SQL permission patches, and repeatedly confusing old pilot limitations with new release prerequisites. Some of the patches fixed real defects, but many hours were spent repeatedly reading and explaining the same unresolved science. We should now prioritize *assembly, the frozen calendar/budget, and the release verdict*.

## 6. What the Nov9 13:42 UTC database inventory says (and does not say)

Your actual output returned **16/16 expected tables**, **seven NOLOGIN permission groups**, **zero rows in each of those 16 new tables**, and **Phase6 enabled=false**. It returned `missingTables=[]` and `missingNoLoginRoles=[]`. The PostgreSQL SSL message was a driver future-compatibility warning, **not a failed SQL query**.

These tables are the **new Phase5/6 planned calendar/source/budget/witness system**, not the historical `clean.flight_population`, `flight_snapshots`, or earlier provider records. Thus the audit does **not contradict** Phase4's actual 1,574 all-time population observation rows and Nov6 PRE/POST evidence.

**Critical circularity corrected in the inventory code:** a future Phase6 **Day1** sampled draw, paid source original, prepared source query and durable T24 PRE witness **cannot be prerequisites to the Phase5 science FREEZE**, because the early-draw writer requires its authorized Phase6 calendar and GO before generating that Day1 draw. We must:
1. Complete the real **prelaunch** 31-day plan, budget/roles, target/source-use review, GitHub orchestrator and independent FREEZE;
2. separately authorize Phase6;
3. **then**, at true future approved clock times, record the first actual four-airport draw, source originals, PRE witnesses and POST (or explicit pending/censored), applying STOP/hold on missed/unsafe observations.

This fixes the circular checklist; it does **not** waive real operating-flight evidence needed for a particular outcome or let PRE be backfilled after a cutoff.

## 7. Exact Phase 5 remaining work: ordered, finite, and nonduplicative

This is **the release work list**. Previously completed components are linked to their existing code; statuses are from main plus Nov9 13:42 owner SQL. A task is not “done” merely because a module compiled. No separate new Stage-N series or second 31-day rehearsal is authorized.

| Order | Remaining deliverable/action | Reuse what already exists | Evidence of completion / current state |
| --- | --- | --- | --- |
| **1** | **Adopt one prospective first-cycle prediction target, population and modeling/split rule.** Choose the already drafted schedule-revision first-cycle Amendment D or a separate explicit approved alternative; distinguish actual physical departure label as a different secondary claim; specify eligible conditional/native strata, UNKNOWN/censored and 20/5/6 chronological split without ever tuning to Nov6 pilot zeros. | Draft Amendment D, Phase4 G5A technical evidence, Phase2 active frame and f.8 | A dated signed/versioned scientific decision attached to the actual release manifest. **OPEN: D is still draft.** No new provider “runway meaning” research required. |
| **2** | **Close actual planned source-use/retention/ML workflow.** Apply already recorded grandfathered plan/account facts and reviewed source-specific rights or choose a prospective compliant bounded-lifetime processing/training design. Verify deletion/backup/identifiable-vs-derived outputs without repeating generic emails/plan questions. | Issue #300, existing source TTL constraints, original custody code | A source-class-by-purpose/TTL/use/expiry record with evidence and exact approved model-data behavior. **OPEN**; this is distinct from “do we have the API key?” |
| **3** | **Freeze the actual 31 future batch-day parent calendar and treatment seed.** Include 26×4h, 3×2×2h, 2×up-to6h; five fixed paired sample sets; exactly four slots per day; 21 ordinary airport identities genuinely left to **future early adaptive draws**; true planned end→next start washout and full UTC schedule. | Existing B0062 five-pair evidence, calendar shape solver, early-draw/clock and global-washout code | One independently reviewed actual UTC date/treatment/calendar SHA and **31 parent rows** ready in the new `adb_phase6_calendar_day` table. **OPEN: count=0.** Never manufacture 21 future airport IDs. |
| **4** | **Freeze the actual complete FIDS request partitions and cost cap.** Derive each child query, source refresh cadence and physical UTC charge day; verify source range, seven REST cost categories (plus separate Alert credit reserve), hard STOP and expected nonresponse/missingness. | Existing Stage22 / V0082 seven-category freeze / V0083 reviewed reservation code, source-split planner and provider contract evidence | Approved/verified request grid, category/charge-day receipts and bounded write, represented in real source/budget tables. **OPEN: relevant table counts=0.** No made-up account balance or unrestricted retry. |
| **5** | **Assemble and verify the real unattended GitHub experiment owner (the largest remaining engineering piece).** Wire existing early four-slot draw and reviewed saved readback, allowed FIDS source/physical reservation and original binding, individual per-flight three PRE commits, independent T24 witness, later POST reconciliation, known/unknown callback statuses and STOP. Include clock/failure decisions and reuse Phase3 STOP/receiver rather than copy it. | Existing `phase5EarlyAdaptiveDrawOwner_v39.ts`, `phase5ScopedFidsSourceBridge_v39.ts`, `phase5V0079SingleBoundFlightPreWriter_v39.ts`, `phase5T24IndependentPostCommitWitness_v39.ts`, Phase4 PRE/POST and Phase3 STOP. A **manual one-paid-FIDS-GET** GitHub Action exists; it is not a full 31-day scheduler. | Reviewed workflow manifests, exact signed schedule and secret/role scopes, disposable/real read-only acceptance evidence, strict first-day abort path, then truly scheduled GitHub jobs *after separate GO*. **PARTIAL: individual modules are built/tested; integrated live 31-day owner is not.** No manually timed Replit jobs. |
| **6** | **Prepare one independent Day1 quality and STOP decision plus reporting counters.** Reuse tested receiver source SHA/public identity, independent status ledger, Phase4 data-visibility/denominator code. Report expected→observed PRE, source attempts, operating/conditional/unknown, callback SEND/received/unresolved, POST observed/pending/censored, units, missingness and duplicates. | Phase3 subscription/STOP, Phase4 metrics, already published reviewed V2 receiver and source-quality modules | Signed Day1 STOP conditions and executable read-only reporting before launch; actual Day1 observations are checked **AFTER GO**. **PARTIAL.** Do not buy a duplicate pilot to fabricate prelaunch receipts. |
| **7** | **Independent final Phase5 FREEZE and separate Phase6 paid GO.** An independent reviewer checks the actual manifest hash, endpoint/identity definition, source rights, date/treatment grid, cost/STOP, published source and GitHub orchestration. Report PASS or exact HOLD honestly and release only once. | Existing #413 checklist, full offline green CI, past real pilots, Nov9 production inventory | A dated verifiable Phase5 release receipt then separate paid activation decision. **NOT DONE.** Green CI or 16 installed tables alone is not a science freeze. |

**Important scope:** The **first real four-airport early draw**, first Phase6 source original, first Phase6 T24 witness, later T6/T90 and POST, and 31 subsequent batch-day results are **Phase6 operations**, not seven more Phase5 tests. Their safe code paths and STOP must be prepared now, but their actual future provider data cannot already exist. We should accept measurable individual missingness and publish evidence, not demand every flight receive a webhook or a physical actual time.

## 8. The single most consequential correction to our management

Do not use the wording **“not enough real flight data”** to dismiss Phase2–4. The true blocker is a **nonempty, agreed Phase5 release manifest and connected unattended owner**: `calendar=0`, `budget=0`, `sourceQuery=0` are direct missing Phase6 setup entries. The **first two** are actually prelaunch work. `sourceQuery` may be staged per approved Day1 query later; `sourceOriginalBinding` and `t24Witness` are bona fide **after-GO proof**. Distinguish those from independently approved first-cycle source-use and target design.

**No new installation; no redundant source-only paid pilot; no fake signed permission; no future PRE backfill.** Work the seven ordered tasks, then a separate Phase6 start. Preserve known risks as explicitly measured missingness or an honestly amended target. If an actual permission is not established for a particular source/feature class, exclude or redesign that class prospectively rather than stalling the entire no-provider implementation.

## 9. Short explanation to teammates

> We finished the source, receiver, cutoff-safe pilot and database-safety building blocks in Phases 2–4. During Phase 5, we prepared their generalization into a 31-batch-day automated, stratified experiment. Much of the apparent delay came from iterative small fixes and an incorrectly circular readiness checklist that demanded first-day source evidence before first-day authorization. The next tasks are to adopt the first-cycle measurement contract, commit actual future dates/budgets, connect the existing GitHub-run modules into one safe scheduler, and do one independent prelaunch review. We do not need to rerun the old pilots or wait for a perfect physical-wheels-off data source before progressing with an explicitly approved schedule-change study.

**The guide documents exactly what has been verified; it does not declare Phase5 complete.**
