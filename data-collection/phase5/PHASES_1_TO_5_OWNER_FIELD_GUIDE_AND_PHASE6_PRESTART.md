# Owner's field guide: what Phases 1–5 did, what Phase 6 will collect, and what still blocks launch

**Project:** HKcode22/ReplitTranvr · **Snapshot:** November 8, 2026 (Pacific) · **Status:** LIVING PRE-PHASE-6 GUIDE — NOT a signed Phase 5 FREEZE or permission to start paid Phase 6.

**Audience:** The project owner, future ChatGPT engineering sessions, and an independent reviewer. This is intended as the *one place to start* after losing a chat. It is deliberately plain English and distinguishes a completed code test from a real production measurement. The last section must be updated with the actual independent Phase 5 verdict *before Phase 6 starts*. It is not a replacement for the binding [V3.9 f.8 scientific plan](../plans/V3.9_DataCollectPlan_f.8.md).

## Quick answer: what are we trying to build?

We are building an evidence-driven research dataset for **predicting traveler-facing flight disruptions before they happen**, while honestly measuring when prediction is and is not possible. The computer must save information that would have been known *at the time of prediction*, then separately save later observations. Eventually a model can learn whether earlier signs were useful.

This research does not merely collect flight names or build an alert app. We need **who was eligible to be observed, when each fact became available, where the fact came from, which attempts failed or were missing, the cost, and a lawful right to use/retain the data**. Without these, a model can appear impressive by accidentally looking into the future or selecting only the easy flights.

**The entire project in four sentences:**

1. **Phases 1–2:** research providers, sampling frame, eligibility and costs; measure candidate airport coverage. Some original acceptance gates remained on HOLD even though useful data was collected.
2. **Phases 3–4:** build and test real paid provider calls, notification receiver, independent STOP, before/after flight snapshots and source custody; several narrow tests passed, but the original full physical-flight Gate 5 did not pass.
3. **Phase 5:** finalize and freeze the scientific claim, lawful data handling, 31-batch-day calendar, budget, GitHub automations, production receiver, missingness rules and independent GO/STOP; much infrastructure is built, but the **scientific FREEZE has not passed**.
4. **Phase 6:** after a separate explicit start, GitHub Actions should run the approved one-month **31-batch-day collection** automatically and record the outcomes, errors, charges and evidence. Model fitting and final evaluation belong later, principally Phase 7.

### Three different kinds of "31" and numbering

- **Phase** is the project lifecycle (1, 2, 3, 4, 5, 6; the plan also has Phase 0 and Phase 7).
- **Gate** is a specific scientific/operational acceptance test (for example Gate 2, Gate 4 or Gate 5).
- **V0079 / V0082 / V0083** is a **version of a PostgreSQL schema change**, and "Stage29" was an engineering checkpoint name. Neither means Phase 79 or 83; neither is an experiment day.
- **31 batch-days** are the approved target number of **Phase 6 experimental run-days**, NOT the number of Phase 5 stages and NOT necessarily 31 consecutive calendar dates. Repeated-airport washout can extend them over a longer calendar.

## What each phase actually did

### Phase 0 / planning (historical)

Early reviews compared scientific designs, provider options, data leakage risks, budgets, selection bias and failure modes. They informed the eventual V3.9 f.8 plan. The [Phase 0 README](../phase0/README.md) preserves seven original review narratives and the earlier request. Older narrative claims are historically useful but do not overrule the current binding plan or authorize spending.

### Phase 1 / Gate 0 — provider and budget groundwork

**Question:** Can our exact account and intended study afford and access the needed data?

We examined AeroDataBox through RapidAPI, account authentication, REST API-unit allowance, Flight Alert credit balance, provider subscription LIST/CREATE/STOP, the differences between marketplace plan versions, and cost controls. We learned **REST API units and Alert credits are two separate balances**. An API key that authenticates is not by itself proof of the current product plan or a right to keep normalized records for months.

The original [Gate 0 checklist](../phase1/GATE0_INPUT_CHECKLIST.md) is a *dated historical checkpoint*, including earlier conditional HOLD questions. Do not read its 2026-09-09 status as today's balance. Subsequent evidence records a grandfathered **RapidAPI Team Ultra** subscription, historical US$32 renewal and **60,000 API units** for that historical subscription. The most recent existing account-side observation, **November 7 at 09:00 UTC**, was **59,968 of 60,000 REST units remaining, 1,830 Alert credits, and zero active Alerts at that time** ([issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300)). This is **dated evidence, not today's live balance, future price, or an ML-use license**.

**Deliverable:** A known provider integration and initial cost arithmetic; real budget monitoring and account-terms caveats carried into later phases.

### Phase 2 / reference selection and Phase 2G airport experiments

**Question:** Which airports/regions can we sample, and how reliable are the available sources?

We investigated a reproducible exogenous airport reference and compared network coverage, geographic regions, airport traffic tiers and observable event yield. One candidate used the openly published MrAirspace aircraft schedules derived from ADSB.lol observations and OurAirports metadata; its reference build reported **2,295 airports and 27,669,229 observed movements**. It is an **observational ADS-B-derived candidate**, not automatically an authorized published timetable or the project's true passenger-flight denominator. The [Phase 2 reference review](../phase2/V3.9_PHASE2_REFERENCE_FREEZE.md) records an **earlier** conflict; the current binding [f.8 §§4.1/4.5](../plans/V3.9_DataCollectPlan_f.8.md) and `trafficReferencePlanContract_v39.ts` now **explicitly permit observed-commercial-movement references** if their exogenous source/license/quality/quarterly freshness (up to 92 days) and frozen contract pass. A validated candidate is still not automatic scientific/legal acceptance.

Real Phase 2G pilot windows observed **WSSS (Singapore), OMAA (Abu Dhabi), SKBO (Bogotá), YSSY (Sydney), and MMUN (Cancún)**. Three sites (WSSS/OMAA/SKBO) passed the formal measured capacity screen in the [Gate 2 closeout](../phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md); **YSSY was scientifically useful but degraded** because 231 items were externally billed while 229 receiver items were recovered; MMUN failed the capacity screen. The 229 saved YSSY original-body items passed the recorded local size/hash integrity check, but a **229/231 billing-to-receipt ratio is not an independently estimated delivery probability**.

**Critical limitation:** Five observed airport windows do not mean five formally accepted anchor airports. The frozen **formal Gate 2 anchor promotion remained HOLD** even though fieldwork and useful research observations were complete. No paid retest is automatically justified by this historic HOLD.

**Deliverable:** Evidence of actual coverage/yield/region variety, clear candidate and degraded classes, historical failure evidence, and a basis for a *future prospective* sampling protocol.

### Phase 3 / safe paid collection and receiver engineering

**Question:** Can we safely buy a provider notification, save the original evidence, and stop billing without losing the study?

We built the GitHub-owned one-use controller, the separate independent STOP function, safer CREATE/LIST ambiguity handling, a restricted receiver and raw-original custody checks. Real trials sometimes failed; **we kept failure receipts rather than rewriting history**. An HTTP 422, a missed callback, a server restart, or a duplicate CREATE is an engineering incident to classify and prevent.

A narrowly defined [Gate 4 NEXT4 WSSS microtrial](../phase3/2026-10-26_GATE4_NEXT4_GENUINE_WSSS_SCIENTIFIC_PASS.md) **passed**: one genuine paid subscription, five original notifications matched to its known provider ID and SHA-256 readback, protected STOP, settlement checks and no active billable subscription at closeout. That is strong evidence for **one small tested subscription**, not general 100% notification-delivery reliability.

A separate October 28 [Gate 0.5 60-minute WSSS trial](../phase3/2026-10-28_GATE05_FINAL_151_ITEM_OPERATIONAL_ACCEPTANCE_AND_SCIENCE_BOUNDARY.md) had **151 notification items in 28 logged deliveries**, independently stopped, with credits reconciled and no lingering active subscriptions. **151 items do not mean 151 different flights**; a delivery may contain multiple items. Its full original runway/wheels-off scientific criteria **did not pass**, including some unavailable original bytes and unsupported actual-vs-estimated source semantics.

**Deliverable:** A working bounded paid-alert control path, real callback/STOP experiences and incident recovery design. Narrow operational success did not make future collection or the broader physical-flight claim automatically valid.

### Phase 4 / Gate 5 population → PRE → POST evidence

**Question:** Can the system identify a prospective flight population, take true before-departure snapshots, and compare them with later observations without looking ahead?

FIDS is a **Flight Information Display System** source (scheduled airport/flight information). We tested GitHub-timed **T−24h, T−6h, T−90m PRE** captures and a later **POST**. In the November 6 WSSS G5A experiment, the [scientific closeout](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md) records **nine authenticated PRE FIDS originals, 36 on-time PRE snapshots for 12 conditional composite keys, three POST originals, and 36 schedule-revision comparisons**. All those measured revisions were under the proposed 15-minute threshold in that small cohort. The source/persistence/cutoff path worked **for provider-reported schedule revisions**. The 12 keys were not independently certified provider-native physical operating legs.

What remained unproved: genuine native operating-flight identity, generic webhook ↔ same operating-leg linkage, actual-only physical wheels-off, appropriate AIRBORNE linkage and the full source → PRE → callback → POST population funnel. No G5A Alert was purchased, so no webhook was expected in that G5A subset; earlier paid Gate 4/0.5 callbacks belong to *different* cohorts. **Never merge unrelated pilots into one imaginary complete flight record.**

**Deliverable:** Real same-cohort schedule data at the three PRE horizons and POST, original custody and missed-cutoff guards. **Original physical-operation Gate 5 remains HOLD**. A prospective *narrower* provider-schedule-revision outcome has been proposed, **not retrospectively declared the original physical outcome**.

### Phase 5 / what we are doing *right now*

**Question:** If we leave the machines running for one month, is the experiment completely defined, authorized, repeatable, affordable, and safe enough that nobody must stay awake to press buttons?

Five kinds of work are underway:

1. **Scientific FREEZE:** say exactly which flights are eligible, what feature data counts as known at T−24/T−6/T−90, what prediction target means, what is missing/censored, and how train/validation/test periods are separated. The original runway-based claim lacks sufficient source support. The [proposed Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) would instead predict a **provider-reported schedule revision of at least 15 minutes** using an earlier scheduled-departure reference. This is a different estimand and still needs prospective independent approval.
2. **Sampling/calendar FREEZE:** check the actual *active* airport frame, choose qualified anchor/region inputs without fabricating traffic, then freeze future UTC dates, 31 batch-day shapes, matched crossovers, selection rules, early daily draws, and source request grid. A mathematical SAT result from synthetic fixture inputs is **not** a signed production calendar.
3. **Budget and data rights:** separate **REST unit categories** from **Alert credits**, prevent duplicate/over-budget requests, and decide what original/normalized data may be retained, for what purpose, how long, and when backups expire. Paying for API access is **not** permission to retain every flight-level record for ML.
4. **Production plumbing:** separate least-privilege GitHub SOURCE/PREPARE/PRE/T24-witness roles, physical source reservation before paid GET, timestamped original bindings, read-only witness after PRE commit, POST/callback custody, deployed callback receiver and STOP/DELETE reconciliation.
5. **Independent acceptance:** review real evidence and either write a signed **Phase 5 FREEZE PASS** or an explicit **HOLD with bounded reasons**. A PR green badge, migration receipt or verbal paid approval cannot substitute for source rights and live operational science.

This phase has many small GitHub PRs because each deals with a different failure mode. **They are not separate experimental phases.**

## A practical dictionary for the unfamiliar terms

| Term you saw | Meaning in ordinary English |
| --- | --- |
| **GitHub / main / commit / PR** | The repository of versioned code and plans; main is our accepted branch, a commit is an exact snapshot, a pull request is a proposed change reviewed and tested before merge. |
| **Git SHA / Git blob / SHA-256** | Exact identities/checksums so we do not silently substitute changed code or evidence. A Git blob SHA is not the same as a scientific data SHA-256. |
| **GitHub Actions / workflow / cron** | GitHub's hosted automated jobs. They can start at reviewed times without keeping the user's computer or Replit Shell open. Actual schedules and missed/delayed jobs still require monitoring, fail-safes and evidence. |
| **Replit / published receiver** | Replit runs the HTTPS server that listens for provider callback notifications. "Publish" means deploying a particular compiled server build to its public URL. Published **success** only proves a deployment exists, not that it runs the newest reviewed code or stores real callbacks durably. |
| **Receiver / webhook / POST / HTTP 2xx** | A webhook is an HTTP POST sent *to* our receiver by AeroDataBox. 2xx means the server acknowledged the request. We must persist the original durably **before** acknowledging it; 2xx without verified storage is unsafe. |
| **RAW original / custody / readback** | Store the exact source response bytes/hash under a lawful short-lived policy, then separately read them back to verify they were saved, rather than believing a success message. |
| **Neon / PostgreSQL / neondb / SQL** | The actual shared relational database. The owner connects to its PG16 primary from Replit; GitHub workers use restricted credentials. Multiple tables and roles do **not** mean a new cloud database each time. |
| **Migration V00xx** | A versioned SQL change to a database's tables/constraints/permissions. Installed once, not a command to repeat whenever the chat restarts. |
| **LOGIN vs NOLOGIN database role** | LOGIN can authenticate with a credential; NOLOGIN is a permission group that cannot log in directly. A dedicated worker login receives narrowly scoped permissions from one group. These are **not extra human accounts**. |
| **ACL / least privilege** | A permission rule. A source worker should not be able to edit the independent witness, erase originals, or use another worker's paid functions. |
| **Reservation / physical attempt / ledger** | A durable record that a specific paid query was allowed and bounded before making the HTTP request. The ledger prevents a retry from silently double-spending. A reservation is **not evidence that the provider responded**. |
| **T / as-of / cutoff / PRE** | T is the frozen source scheduled-departure reference. "As-of" means facts actually available *by that precise cutoff*. PRE at T−24h/−6h/−90m must not be backfilled using later data. |
| **POST / outcome / label** | Later observation, compared against the earlier prediction. Schedule change, cancellation, actual runway time, and ADS-B proxy are **different** labels. |
| **Witness / independent transaction** | A separate database connection/transaction checks the committed PRE was really durable. It is not the writer congratulating itself before COMMIT. |
| **Alert CREATE / SEND / STOP / unknown CREATE** | CREATE starts a potentially billable subscription; SEND is provider delivery, not guaranteed to happen for every flight; STOP ends the exact subscription. An ambiguous CREATE must be reconciled before trying again. |
| **Freeze / signed manifest / GO** | Freeze means the definitions and versioned run instructions are locked for comparison. A GO is a separately justified authorization to start, not an automatic effect of a frozen file. |
| **Missing / unknown / censored** | A fact that was never observed, could not be linked, or had insufficient observation time. **Missing does not mean "no delay."** |
| **Selection bias / leakage / calibration** | Sampling only easy flights may distort estimates; leakage means using a future fact as a past feature; calibration asks if predicted probabilities match observed frequencies. |
| **STOP / kill switch** | A fail-closed method to stop future paid requests, reconcile any active subscription and preserve real evidence when a budget/source/callback rule fails. |

### So what were V0079 through V0083?

Each is a carefully limited addition to **the same** PostgreSQL system:

| Version | Simple purpose | Production status as evidenced Nov 8 |
| --- | --- | --- |
| **V0076–V0078 (Phase 4)** | Record physical FIDS source attempts, bind the real original response and handle repeat observations without corrupting identity. | Historical Phase 4 work installed; do not rerun. |
| **V0079** | Organize the 31-batch-day FIDS budgets, allowed queries, physical source attempts and original bindings. | Installed, inert. |
| **V0080** | Require an actual GitHub workflow run identity before a physical GET so source requests cannot be misattributed to a pretend job. | Installed, inert. |
| **V0081** | Independently record whether a T−24h PRE snapshot truly survived COMMIT, from another transaction. | Installed, inert. |
| **V0082** | Enforce the seven distinct physical REST spending categories and exact allowed source partitions; permit a transparent daily/cycle budget. | Installed, empty. |
| **V0083** | Separate the reviewer who approves non-FIDS REST uses from the role that makes the physical charge reservation. | Installed, empty; second independent live DB readback passed. |

As of the **real owner production inventory at 2026-11-08 08:18:35 UTC**, **all 16 inspected Phase 5 calendar/allowed-source/budget/original/witness tables existed but each contained zero rows**, and **all seven expected NOLOGIN groups existed**; the Phase 6 authorization table was empty/disabled. This is a *successfully installed but not launched* release environment, not evidence that all old Phase 4 tables are empty. See [live cold-start evidence](2026-11-08_LIVE_EMPTY_PHASE5_COLD_START_AND_TRUE_RELEASE_ORDER.md) and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## What a single flight's data pipeline will look like

~~~text
Active, legally admissible airport frame + reviewed UTC schedule
                     |
       Prospective chosen airport / operating leg
                     |
 GitHub SOURCE query prearmed + physically budget-reserved
                     |
       AeroDataBox FIDS response (real original)
                     |
       Persist original with source time and hash
                     |
  +------------------+------------------+
  |                  |                  |
PRE T-24h        PRE T-6h         PRE T-90m
  |                  |                  |
  +---- immutable as-of snapshots ------+
                     |
         Independent T-24 COMMIT witness
                     |
       Later provider status / possible webhook
                     |
               POST observation
                     |
  Join only if legal source, identity and clocks match
                     |
 Observed label / UNKNOWN / CENSORED + reason
                     |
  Dataset with as-of source, charges and provenance
                     |
       Later Phase 7 model and evaluation
~~~

The diagram describes the **intended fully integrated future system**. It is not proof that all branches have been observed together in a live Phase 5 cohort. For example, Nov 6 FIDS PRE/POST and October 28 paid Alerts were **different** runs.

### Example: why the clock matters

Suppose a flight's frozen original scheduled departure T is 18:00 UTC:

| Horizon | Cutoff | What the PRE may use |
| --- | --- | --- |
| T−24h | Previous day 18:00 UTC | Only observations whose real availability time is at/before that cutoff |
| T−6h | Same day 12:00 UTC | Newly available facts by 12:00, not the later outcome |
| T−90m | Same day 16:30 UTC | Last permitted prediction snapshot |
| POST | After the preannounced observation window | Later state/label, never inserted back into PRE |

If the 12:00 acquisition fails and resumes at 13:30, that **does not become a valid 12:00 PRE**. The row is missing/late with an explicit reason. This is how we prevent **data leakage** and dishonest hindsight.

### Small coding example: an as-of join (illustrative, not a direct production query)

~~~sql
-- Conceptual example. Real production column and table names differ.
SELECT
  p.flight_key,
  p.horizon,
  p.cutoff_utc,
  s.observed_value
FROM pre_snapshot AS p
LEFT JOIN source_observation AS s
  ON p.flight_key = s.flight_key
 AND s.available_at_utc <= p.cutoff_utc;
~~~

**LEFT JOIN** means keep the intended PRE row even if no eligible source observation exists; its observed value stays **NULL**. The additional time condition prevents a later observation from pretending to have existed earlier. A production join also needs exact provider-native operating identity, original hash, immutable T, observation order, source/license and tie-breaking; the four-line teaching example **alone is not a scientifically safe implementation**.

A second conceptual rule is:

~~~python
# Illustrative decision logic, not an executable production collector.
if source_available_by_cutoff and identity_verified and retention_permitted:
    use_observation_in_pre()
else:
    mark_missing(reason="NO_ADMISSIBLE_AS_OF_SOURCE")

# Only use a later label if it actually exists for that same eligible leg.
if observed_and_comparable_post:
    label = scheduled_revision_meets_frozen_threshold
else:
    label = None  # unknown/censored, NOT zero/no-delay
~~~

## What exactly will we collect during Phase 6?

The **binding f.8 plan** is a 31-batch-day experiment, not 31 arbitrary daily airport scrapes. The current plan calls for **26 standard 4-hour days, 3 split days with two 2-hour service segments separated by a 1-hour inactive gap, and 2 up-to-6-hour days**. Five matched crossover pairs explore window-shape effects: three compare split vs 4h and two compare longer vs 4h. These are scientifically **exploratory** with very limited sample size, not a statistically powered confirmation of a global window effect.

The strict calendar solver already exists: [experimentCalendarSolver_v39.ts](../../server/lib/disruption/experimentCalendarSolver_v39.ts), with [calendar_solve.ts](../../scripts/calendar_solve.ts). It uses a five-anchor candidate pool, slot-specific eligible regions and paired-airport templates, six UTC rotation slots **00, 04, 08, 12, 16, 20**, an early selection rule, and repeated-airport washout. **Ordinary-day airports should be drawn prospectively at the proper lead time**, not assigned using future yields. The live **frame's structural presence is now measured** (4,346 active rows and 1,125 dual-eligible records), and the current f.8 **allows correctly qualified observed-movements references**, but its specific license, frozen observed/quarterly rules, quality/coverage and provenance acceptance still require verification and the five HUB anchors are not selected. A synthetic fixture is not a substitute for signing a prospective eligible anchor pool.

The future raw/derived fields we expect *when available and legally permitted* include:

- Source request/event ID, original source digest, provider timestamps, UTC acquisition time, cost and reason for failed/missing calls.
- Airport, role/tier/region, selected window and exact inclusion/selection probability; distinguish confirmed operating legs, uncertain composite flight keys and code-shares.
- Frozen T and three before-departure PRE snapshots, with source availability/clock references and feature missingness flags.
- Provider-observed schedule changes and cancellation/status evidence; optional physical actual-only metrics **only when actually authenticated**, optional ADS-B and weather as separately admissible sources.
- Alert subscription CREATE/SEND, signed receiver, raw original readback, STOP and budget reconciliation when the provider actually sends a notification.
- Later POST and confirmed label / unknown / censored outcome, plus provenance, expiry and deletion eligibility.
- Per-batch-day QA counts, selected vs observed denominators, population coverage, null/late/censored rates, API units, Alerts, failure codes and incidents.

**This does not promise 31 days of complete positive labels, exactly four successfully observed airports per day, a worldwide true delay rate, or any exact number of usable flights.** Missingness must be reported as data, not concealed.

### What is the primary prediction target?

The *original full physical runway/wheels-off target* lacks sufficient native actual-only evidence and remains scientifically **HOLD**. The current proposed [Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) instead specifies **provider-reported departure schedule revision ≥15 minutes**, comparing a pre-frozen T−6h reference and a later comparable POST. This is a useful narrower task **if adopted prospectively with legitimate source-use rights**. It does **not** mean actual takeoff was 15 minutes late.

The proposal includes chronological **20 training / 5 validation / 6 held-out test batch-days**, an explicit threshold, a simple event-prevalence baseline, a candidate XGBoost classifier, Brier score/calibration, bootstrap intervals and honest handling of no positive classes or missing POST. These are **proposal-defined**, not an already signed binding success criterion. Model training and final metrics are Phase 7 work; no scientific performance number has been earned yet.

## Cost and automatic scheduling — so nobody needs to wake up nightly

### Two separate spending ledgers

1. **REST API units**, spent on approved physical calls for the source and related uses. V0082 uses **seven explicit categories**: FIDS_BASE_UNITS, FIDS_SPLIT_UNITS, FIDS_RETRY_UNIT_BUDGET, VALIDATION_UNIT_BUDGET, OUTCOME_REST_UNIT_BUDGET, HISTORY_BOOTSTRAP_UNIT_BUDGET, DIAGNOSTIC_UNIT_BUDGET.
2. **Flight Alert credits**, spent on actual provider notification delivery under its own rules, with separate budget, floor, hard STOP and after-run reconciliation.

The historical f.8 project uses a **50,000 REST-unit cycle ceiling** and a smaller daily operating envelope rather than spending the advertised full subscription quota automatically. The last known Nov7 account free observation was 59,968/60,000 REST remaining and 1,830 Alerts. Those balances change with requests/cycle timing and do not prove source license, range or price. A priced calendar must cover actual partitions, retries, validation, outcomes, history and diagnostic allocations—not just multiply four airports by 31.

### Automation we intend — and what is not yet proved

**The goal is fully GitHub-hosted timed ownership.** Your laptop and an open Replit Shell should *not* be required at 2 AM. Once Phase 6 GO is separately signed, reviewed GitHub Actions should:

1. Start a future scheduled batch-day and choose eligible airport roles far enough before **T−24h**.
2. Prearm and account for exact provider source queries **before their cutoffs**, fail closed if the original is late, and record immutable PRE at T−24h.
3. Independently read back the T−24h PRE from a separate transaction.
4. Execute T−6h and T−90m source/PRE work at their real clocks, including needed bounded retries, split-segment coverage and STOP checks.
5. Collect later POST/callbacks, distinguish no SEND from missing receipt, write outcome status, and reconcile provider usage/active subscriptions.
6. Produce a **daily automatic evidence/health/credit/missingness report**, alert or STOP on hard violations, and leave optional observations null rather than sending you to manually repair a missed cutoff overnight.

**Important present limitation:** The GitHub scripts, dedicated credentials, source reservations, PRE/witness functions and narrow paid pilot exist, but the **actual reliable 31-batch-day end-to-end GitHub scheduling with automatic fallback/receiver/STOP has not yet passed a full prospective production test.** GitHub Actions cron can start late or skip under circumstances; design must tolerate that via early prearms, checked source/clock windows, fail-closed cutoffs and independent status monitoring. We must **not** start Phase 6 on the assumption that every cron job will fire on time.

**What your nightly responsibility should be after GO:** ideally nothing. Inspect a daytime dashboard/daily report when convenient, with a separate urgent STOP notification only for a genuine safety incident. **This is the operating goal, not a capability already certified as of this guide.**

## Where do I look to understand my data?

| Where | What it contains | What to look for |
| --- | --- | --- |
| [GitHub main](https://github.com/HKcode22/ReplitTranvr) | Code, frozen manifests, tests, exact PR versions, dated explanations and Actions | **Authoritative implementation and protocols.** Start with this guide and the [Phase5 README](README.md). |
| [GitHub Actions](https://github.com/HKcode22/ReplitTranvr/actions) | Scheduled worker runs, CI, red/green jobs, future bounded paid owner/STOP receipts | **Did the correct job really start?** Check actual run ID, source SHA, UTC start, finish, status and provider charges. A green unit test is not a provider outcome. |
| PostgreSQL16 **neondb** (accessed by owner Replit Shell and scoped GitHub workers) | Controlled tables for approved queries, attempted source GET, original refs, flight as-of snapshots, budgets, witnesses and later POST | **Actual records and counts.** Never infer rows from migration presence. On Nov8 all 16 inspected *Phase5 release* tables were EMPTY. Historical Phase4 records may live elsewhere. |
| [Published Replit receiver](https://replit-tranvr--hk84164.replit.app) | Callback-only public web service; production destination for approved signed notifications | **What source SHA is actually deployed? Did it durably store the original BEFORE a successful 2xx?** Nov8 public source reported old 84b7f..., not the new V2 candidate. |
| Protected app/object storage | Permitted original response/callback blobs with limited retention | **Correct original hash, expiry, access rights and readback.** Do not post raw provider Contents or secrets publicly in GitHub. |
| [Issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) | Provider account, dated budgets, official Terms, retention and ML-use questions | **Are the particular uses allowed?** Old paid subscription and balance are already documented, not new owner homework. |
| [Issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413) and [#416](https://github.com/HKcode22/ReplitTranvr/issues/416) | Phase 5 exact work left, current owner production readbacks, continuity checkpoints | **What is genuinely installed, verified, pending and prohibited from repetition?** |
| Future protected Phase 6 viewer (NOT YET DEPLOYED) | As-of feature/label counts by batch-day, source/horizon, eligibility, missingness and credits, with no unauthorized Contents exposure | **Daytime monitoring and reports.** This remains a release-readiness work item. |

### If a GitHub Action is red, what does it mean?

A red **test** means some assertion, compilation, permission or offline rehearsal failed; it **does not by itself** mean a provider request was sent or credits were lost. A red **paid source worker** is different and requires examining the durable physical-attempt ledger and exact provider receipts before retrying. A long-running **owner** workflow may be intentionally waiting for a cutoff; do not cancel it only because the progress bar is long. A red **STOP** is urgent to inspect against actual provider LIST/balance and DB ownership, not a reason to blindly create/stop again. Always look for the exact run, bound cohort, commit and UTC time.

## November 8 exact release status: done versus still required

| Milestone | Actual status | What would prove it is closed? |
| --- | --- | --- |
| V0079–V0083 production schema, seven NOLOGIN groups, four dedicated GitHub logins/secrets | **DONE, owner production readbacks** | Do **not** reinstall. |
| Three PRE horizons + POST for a narrow actual provider FIDS schedule-revision cohort | **DONE in Phase4 Nov6 narrow scope** | Do **not** repeat the identical FIDS-only pilot; preserve its limitations. |
| New **active exogenous airport frame** and real five-anchor/region qualification | **FRAME PRESENT; SCIENTIFIC QUALIFICATION OPEN** — Nov8 09:56 UTC readback: 4,346 active rows, 1,125 dual-eligible, 0 hash mismatches; MrAirspace observational references are already explicitly permitted by current f.8, and June30→Sep13 is 75 days within the binding quarterly 92-day maximum; exact frozen license/threshold/freshness/coverage proof still needs confirmation | Verify current permitted reference contract and independently qualify five actual HUB anchors; do not rebuild a frame that already exists. |
| Actual future 31 batch-day calendar, matched crossover roles and early airport draws | **OPEN** — calendar=0, draws=0 | Independently reviewed real future input, successful existing strict solver, versioned commit/freeze and production readback. |
| Seven-category priced REST grid and separate Alert budget/STOP | **OPEN** — category/source budget tables=0 | Frozen actual price/range/ceiling evidence, physically counted allowed query partitions, independent budget signer and readback. |
| Prospective first-cycle target and admissible ML/source Contents retention+expiry | **OPEN** — Amendment D proposed; issue #300 not closed | Signed prospective narrow estimand, lawful feature/label/backup expiry policy, no false physical-delay inference. |
| GitHub 31-batch-day SOURCE→PRE→witness→POST and independent monitoring | **PARTIAL — components + historical pilots, not full production season** | Representative lawful end-to-end future cohort, exact clock/identity/permissions/STOP and automatic schedule/fallback evidence. |
| Callback-only receiver *code build* | **V2 candidate built and CI tested** via [PR #482](https://github.com/HKcode22/ReplitTranvr/pull/482); NOT necessarily published | Correct reviewed pin, protected local workspace, deliberate deployment, actual hosted SHA, signed raw-first durable POST/ACK and independent STOP. |
| Protected inspection/reporting and independent final FREEZE | **OPEN** | Real QA viewer/report, signed independent release checklist PASS/HOLD and separate Phase 6 paid GO. |

### Exactly what has to happen before Phase 6 starts

This is **not** a request to invent Stage32, Stage33 or new databases. The final four release packages are:

**A — Scientific/legal contract.** Independently choose the honest first-cycle target, population, frozen time/feature/label/missingness definitions, source rights, retention/expiry/backup and analysis split.

**B — Real signed resource/calendar package.** Validate active airport frame, qualified five anchors and regions, prospective 31-day/26+3+2 clock calendar, five matched pairs, early future draws, exact REST seven-category and Alert budgets with account/runtime limits.

**C — Production automation and receiver proof.** Use the existing dedicated GH SOURCE/PREPARE/PRE/T24-witness roles to prove an actual lawful future SOURCE→on-time PRE→separate witness→POST path, safe Replit callback-only published release, signed durable POST/ACK and STOP/reconcile; automatic scheduled triggers/daily health/incident handling instead of nightly human intervention. Accept and quantify bounded optional missingness.

**D — One independent Phase5 FREEZE and a *separate* Phase6 paid GO.** Publish exact evidence/code/calendar hashes and state PASS or HOLD. If HOLD, name only the unclosed P0 conditions. After PASS, require a different explicit Phase6 start admission and first-day protected monitor; no retroactive edits to PRE.

**What can wait until Phase 7:** model fit/performance, final test row identities and long-term accuracy claims. **What cannot wait:** target identity/clock, legal retention, schedule/randomization rules, source provenance, receiver durability, budgets, stop controls and a verifiable start.

## Current action and continuity notes

- On Nov8, PR #482 implemented a **new versioned, exact-source callback-only V2 build** to replace the obsolete deployed-source build route; **the older published receiver remains stale until safely deployed and verified**. Do not mistake a passing build for a deployed callback or a signed external event. Preserve the Replit local-only b44b1e... history before any manual checkout/publish.
- **The owner completed both free readbacks Nov8 09:56 UTC.** The B0062 frame exists (4,346 records, 1,125 dual-eligible, 0 mismatched hashes), but its MrAirspace+OurAirports observational reference needs f.8 scientific acceptance; five anchors and the 31-day calendar are not frozen. The Replit local checkout is a known GitHub commit `7e34c6...` (50 commits behind main, clean tracked, one untracked file), old V1 build; PR #485 prepares a fail-closed *private Git bundle + untracked backup → fast-forward only → V2 verify-only* path. The **public V2 receiver remains undeployed**; one Replit-outbound GET returned HTTP404 but an independent GitHub-hosted GET returned HTTP200 with the old `84b7f...` source, so do not assert a public outage from the 404. See [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). **No RapidAPI account lookup or duplicated migration is required.**
- The project owner has approved bounded paid work. That approval is documented; it does not waive provider licensing, prospective scientific cutoffs, budget/STOP admission or a separate actual Phase6 start. **Never ask the owner to reidentify the grandfathered account or to rerun a successful installer.**
- GitHub is the **source of truth**, Replit hosts only the published callback receiver/owner Shell for rare privileged readbacks, and scheduled collection belongs to GitHub Actions. **No Cloudflare and no Replit AI Agent** for this project.
- This guide must receive a final **POST-FREEZE addendum** recording which primary endpoint was actually approved, final source license/expiry, signed 31-day manifest, budget/seed/hash, real scheduled runner/receiver proof, independent FREEZE decision and precise Phase6 start-control instructions **before** anyone presses paid GO. Do not quietly convert this living guide into a false PASS.

## Authoritative paths for a deeper audit

- [Binding study design — f.8](../plans/V3.9_DataCollectPlan_f.8.md)
- [Phase1 checklist](../phase1/GATE0_INPUT_CHECKLIST.md) · [Phase2 reference candidate](../phase2/V3.9_PHASE2_REFERENCE_FREEZE.md) · [Phase2G real closeout](../phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md)
- [Phase3 exact Gate4 paid pass](../phase3/2026-10-26_GATE4_NEXT4_GENUINE_WSSS_SCIENTIFIC_PASS.md) · [Phase3 151-item technical closeout and scientific HOLD](../phase3/2026-10-28_GATE05_FINAL_151_ITEM_OPERATIONAL_ACCEPTANCE_AND_SCIENCE_BOUNDARY.md)
- [Phase4 original Gate5 physical science HOLD and narrow FIDS proof](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md)
- [Phase5 independent checklist](2026-11-06_PHASE5_FREEZE_CHECKLIST_AND_VERSIONED_COLLECTION_QA.md) · [Four exit packages](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md)
- [Actual production 16-table cold start](2026-11-08_LIVE_EMPTY_PHASE5_COLD_START_AND_TRUE_RELEASE_ORDER.md) · [Active airport frame verification](2026-11-08_ACTIVE_FRAME_CALENDAR_REAL_ELIGIBILITY_READONLY.md)
- [Published receiver safe checkout](2026-11-08_REPLIT_RECEIVER_READONLY_DEPLOYMENT_ADMISSION.md) · [New source-locked V2 build](2026-11-08_CALLBACK_ONLY_V2_REVIEWED_SOURCE_RELEASE_CANDIDATE.md)
- [Master Phase5 issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413) · [Production receipt issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416) · [Source/retention issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300)

*Last substantive state incorporated: 2026-11-08, prior to a signed Phase5 FREEZE. The status table must be refreshed from actual later owner/CI evidence before Phase6 GO.*
