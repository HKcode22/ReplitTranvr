# Phase 5 technical and team-meeting checkpoint — 2026-11-09 (UTC)

**Repository:** `HKcode22/ReplitTranvr` • **Workstream:** Phase 5 scientific protocol, database/receiver safety, and prospective Phase 6 collection readiness • **Truth boundary:** this report separates what production readbacks *verified*, what code/CI *tested offline*, and what science/release work is still *unproved*. **Status at this checkpoint:** five *candidate* crossover airport sets scientifically corrected and reproduced; **no signed pair set, no signed real 31-batch-day calendar, Phase 5 scientific FREEZE = HOLD, paid Phase 6 GO = NO.**

**Use in the meeting:** Sections 1–4 are the spoken summary; sections 5–16 are a technical study guide. This is a checkpoint and explanation, not a claim that a future ML model is already accurate or that collection is authorized.

## 1. The 90-second project update you can say out loud

> We are finishing the **design-and-release phase** of an aviation data-science experiment. Our end goal is a traveler-facing flight disruption predictor, but we will not claim accuracy until prospective data exists and an untouched test set has been evaluated. We have a real, versioned airport sampling frame from PostgreSQL/Neon, verified **4,346** airport records and **1,125** historically dual PRE/POST-eligible airports, and structurally verified our four chosen HUB airports: Singapore WSSS, Abu Dhabi OMAA, Bogotá SKBO, and Sydney YSSY. Of the MID and REGIONAL airports, **1,013** pass our stricter technical feed/metadata screen. We used a committed, reproducible random seed to propose five crossover airport sets. One originally drawn site, Teterboro KTEB, is unsuitable for our **scheduled-airline passenger** target; we documented that after-selection eligibility issue and deterministically replaced **only that one slot** with Buffalo KBUF, leaving the other 19 slots and seed unchanged. We have checked all this without spending AeroDataBox credits or changing database rows. The next scientific tasks are to verify actual future flight/source coverage, routes and usable outcomes, sign the calendar and budgets, and independently decide if Phase 6 collection is safe. Our primary Phase 7 pilot will compare an XGBoost model against a persistence baseline at T−6 hours on a protected chronological test set, while also examining route and other generalization gaps. The outcome is still unknown; the point of the safeguards is to obtain an honest, reproducible result rather than a falsely optimistic model score.

## 2. Exactly where we are now — evidence vs claims

| Work item | What has been demonstrated | What is **not** demonstrated |
|---|---|---|
| GitHub as source of truth | Reviewed PRs #497–#501 merged; exact source Git blobs, checkpoint history and offline regression tests | A green GitHub workflow is **not** genuine paid flight data or a science FREEZE |
| Historical airport frame | Live PostgreSQL frame version `frame_02ec6e78ba1fe3c2`, SHA-256 `02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94`; 4,346 frame rows and 1,125 dual-eligible records | That there will be adequate scheduled passenger traffic during our **future study dates** |
| Four chosen HUBs | WSSS / OMAA / SKBO / YSSY each exist, tier `HUB`, PRE+POST eligible and schedule/live feed flags true | The **historical original five-anchor Stage2 gate** passed; it did not |
| MID/REGIONAL census | 427 MID and 587 REGIONAL initially dual eligible; 427+586=1,013 pass stricter schedule/(live-or-ADS-B)/metric screen | The 48 traffic-ranked candidate list is the whole population or a probability sample; it is neither |
| Five crossover proposals | Real deterministic airport metadata from **all 1,013** screened records; original and corrected pair SHA digests verified; 15 distinct non-HUB sites | Independently *signed* pair assignments, real future traffic/route supply or treatment allocation |
| KTEB correction | Official pre-existing scheduled-passenger operating restriction documented **after** original draw; only pair 3 MID_A deterministically changed to KBUF; the original draw is preserved | That every other sampled site has been individually checked for current scheduled-passenger/source eligibility |
| Database / code infrastructure | Schema and role infrastructure documented; CI tests source custody/clock logic on disposable PostgreSQL; restricted read-only production queries genuinely worked | Full real receiver signed POST, live SOURCE→three true PREs→POST for the new 31-day regime, lawful ML Contents retention or a final released calendar |
| Historical YSSY pilot | The administrative #31/#32 incident and budget closeout was independently audited | Scientific success of historical P25: it remains **failed / DELIVERY_GAP**, externally 231 vs internally 229 credits |
| Model readiness | Preregistered model families, as-of cutoffs, grouped splits, metrics and baseline in Plan f.8 | Any demonstrated future prediction accuracy, adequate rare-event counts, or a licensed complete training dataset |

**No promise of “nearly accurate.”** We can maximize scientific usefulness through better provenance, route/time diversity, observed outcomes and transparent uncertainty; we cannot know how accurate an unseen model will be before testing it.

## 3. The corrected five crossover **candidate** airport sets

The user's actual READ ONLY result at **2026-11-09T03:58:40.164Z** is preserved without alteration in [`evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json`](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json). The table below is **not** a released 31-day operating schedule:

| Pair | HUB slot | MID_A slot | MID_B slot | REGIONAL slot |
|---|---|---|---|---|
| 1 | **OMAA** | OMSJ | SPJC | KDEC |
| 2 | **WSSS** | SBFL | TJSJ | LSZB |
| 3 | **YSSY** | **KBUF** | LFQQ | NZNP |
| 4 | **SKBO** | EBAW | NZNS | RJNK |
| 5 | **SKBO** | YBUD | RKTU | FAKM |

- **MID_A and MID_B** mean **two distinct mid-tier airport sampling slots**, not inbound versus outbound routes and not two aircraft. **REGIONAL** is the fourth, smaller-airport sampling slot. Each batch-day observes the selected airports' departing flight populations. Flights' *destination* airport ICAOs define origin–destination (OD) route features, and the destination is **not required to be another of the four sampled airports**.
- **Why SKBO appears twice:** the experimental design contains **five paired comparisons but only four unique owner HUB anchors**; one HUB must recur among the five pair templates. This is an allowable seeded repetition. Its two templates use different MID/REGIONAL airports. Within an individual crossover comparison, the **same four airports** are reused in treatment periods 1 and 2 for fairness; other repeated-airport washouts are part of the future calendar.
- **Why KTEB originally appeared:** a transparent, precommitted seed hashed all 1,013 frozen-frame MID/REGIONAL candidates, selecting the first eligible code for pair 3's North America MID_A slot. KTEB was technically classified as frame MID/feed-eligible but is unsuitable for scheduled passenger airline service according to the documented operating restriction. That fact was discovered **after the original random draw**, not inserted as a retroactive preregistered rule. The same seed and same within-stratum ranking then skipped *only KTEB* and selected **KBUF**. Do not state that KTEB never existed in the original proposal, or that KBUF is already provider-verified for the actual study dates.
- **Digest of original candidate selection:** `3dbcc18dd44bdbb7e5323766a9a6bfacacc0bb2e38e3ccce9aff442611738763`. **Digest after KTEB→KBUF:** `f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592`. The SHA-256 digest was independently recomputed from `[{pairId,icaos:[HUB,MID_A,MID_B,REGIONAL]}]` and matched the actual owner readback. All **19 other pair slots** remained identical. Zero paid provider calls, SQL writes and webhooks.
- **Not yet signed:** `crossoverAirportSetSigned=false`, `independentTreatmentOrderSeedSet=false`, `treatmentOrderRandomized=false`, `thirtyOneBatchDayCalendarSigned=false`, `providerFidsSourceReachabilityVerified=false`, `providerContentsRightsVerified=false`, `sevenRestChargeCategoriesBudgetVerified=false`, `scientificPhase5FreezePassed=false`, `phase6PaidGo=false`.

## 4. What actually happens in Phases 5, 6 and 7

```text
PHASE 5 — DEFINE & VERIFY BEFORE SPENDING
versioned frame + study population + 4-HUB anchor proposal
     → five real candidate paired sets + operating-scope review
     → precommitted independent treatment-order rule
     → actual 31 parent batch-day calendar and early draw policy
     → versioned FIDS source query/3 PRE horizon/POST/STOP custody proof
     → seven-category REST reservation, separate Alert spending,
        source-use rights, retention/expiry, independent safety audit
     → independently signed scientific FREEZE; separate paid GO

PHASE 6 — COLLECT PROSPECTIVELY, UNDER FROZEN RULES
GitHub-only early selected-airport draw + source GETs
     → durable original with available_at before T−24h/T−6h/T−90m
     → source-qualified flight identity and strictly as-of snapshots
     → later event/POST/actual outcomes, with unknown/censored kept honest
     → daily quality, selection probability and expense audit
     → protected split-rule remains unchanged; NO model-driven tuning

PHASE 7 — MEASURE, DON'T ASSUME
apply frozen train/validation/test split to actual rows
     → Model −1 baseline vs Model 1 (XGBoost) on Engine A T−6h
     → Engine B/C/D/R/P (including unseen-route R) and POST pilot
     → MAE, uncertainty, probability calibration, missingness,
        information-per-credit, route/tail diversity and learning curves
     → honest positive / neutral / negative *pilot* result;
        only later independent evaluation supports deployment claims
```

**The 31 batch-days are Phase 6 experimental days, not 31 days of Phase 5 coding.** Per Plan f.8: **26** continuous 4-hour windows, **3** split 2h+2h windows (with inactive gap), **2** up-to-6-hour windows, with **five matched crossover pairs**. The 31 ordered parent batch-days need not be consecutive calendar dates; repeated airports require **at least 24 hours end-to-start washout**, and six UTC starts rotate through 00/04/08/12/16/20. A batch-day = four airport slots; the actual number of flight rows is **unknown** until paid source collection begins.

## 5. What **B0062** is, where it lives, and why Replit may look empty

**B0062 is not a database, subscription, cloud instance or data file containing 4,346 flights.** It is the repository's versioned PostgreSQL **baseline schema migration**, named `B0062__v39_schema_baseline_20261001.sql`. A **migration** is SQL code that creates/defines tables, columns, indexes, constraints and relationships. The live airport-reference records that we queried reside in the **external PostgreSQL database called `neondb`** (Neon-backed connection), notably in `clean.adb_sampling_frame` (airport rows) and `clean.adb_sampling_frame_registry` (which version/hash is ACTIVE).

- **PostgreSQL** is the database-management system; **`neondb`** is the database; **`clean`** is the schema namespace; **`adb_sampling_frame`** is a table; **`frame_version`** is a column identifying a frozen reference dataset. These are distinct concepts.
- `clean` contains scientific data tables, while `public` contains application tables. Under a different schema or database browser connection you may not see the same relations. A Replit message like “Development Database not found” is **not proof that the external production Neon database is empty**. Our owner READ ONLY queries explicitly reported `current_database() = neondb`.
- The frozen B0062 traffic metric is historical **observed commercial departures** in a fixed past 365-day window, *not* AeroDataBox credits, a live future timetable, or a guaranteed number of independently linkable flights. Airport `pre_eligible`/`post_eligible` means frame-level technical capability, **not** each specific future flight's successful original or actual wheels-off label.
- A migration's tables can exist with **0 Phase 5 scientific collection rows**. That is normal before a signed prospective schedule and GO. Do **not** rerun V0079–V0083 database migrations or change `DATABASE_URL` blindly to make the UI display something.

Conceptual relational chain (the exact SQL keys and constraints differ by table):

```text
clean.adb_sampling_frame_registry (ACTIVE version and hashes)
     ↓ frame version lookup
clean.adb_sampling_frame          (airport / tier / region / eligibility)
     ↓ eligible airport + later signed policy
clean.adb_phase6_calendar_day    (one real parent batch-day)
     ├─ clean.adb_sampling_draw    (4 actual chosen airport slots)
     └─ V0079–V0083 FIDS query/budget/physical-attempt/original metadata
                         ↓ source query and durable original
clean.fids_query_response → clean.flight_population
                                      ├─ clean.flight_snapshots (strict T24/T6/T90 PRE)
                                      ├─ clean.flight_outcomes (observed/pending/censored)
                                      └─ research partition / provenance
```

See [`PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md`](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md) for the full table inventory and careful foreign-key-versus-logical-join explanation.

## 6. Why the shell commands look complicated (and what they have **actually** done)

An example from the most recent readback:

```bash
bash -o pipefail -c 'gh api repos/HKcode22/ReplitTranvr/git/blobs/<REVIEWED_GIT_BLOB_SHA> --jq .content | base64 --decode | bash -se'
```

This is a **handoff to a reviewed script**, not a request to manually type SQL or collect a flight. The outer `bash -o pipefail` makes a failure anywhere in the pipeline fail the command. `gh api` uses the authenticated GitHub CLI to fetch **one exact content-addressed Git blob**; `.content` contains its Base64 representation; `base64 --decode` converts it back to the reviewed shell script; `bash -se` executes it with strict error handling. The launcher then checks GitHub main ancestry, the exact source SHA and successful GitHub CI, checks that the owner's database URL is separate from the restricted runtime URL, downloads the exact reviewed JS module and verifies its Git blob. It runs a **single READ ONLY database transaction**, prints a JSON evidence report and rolls back. It does **not** silently copy, reset or rewrite your local Replit Git checkout.

A **Git blob SHA** pins *file contents*, a **Git commit SHA** pins a *repository version*, a **data/manifest SHA-256** pins the exact *research dataset or planned batch*. These are useful checks against accidental code/data drift, not proof that an absent physical flight was actually observed.

So far the recent commands have asked increasingly narrow questions:

| Readback/check | Research question answered | Result |
|---|---|---|
| Active frame census | How many frozen reference airports and PRE/POST-eligible records actually exist? | 4,346 frame rows, 1,125 dual-eligible |
| Four owner-HUB rows | Do the four prechosen HUBs really satisfy frame tier/feed rules? | All four structurally PASS |
| 12 MID/REGIONAL groups | Are six regions represented in both smaller tiers? | Yes; 427 MID + 587 REGIONAL dual-eligible |
| 48-screen sample | Which real candidate airport codes/metrics are visible across 12 groups? | 48 returned, **not** randomly selected |
| Full 1,013-case seeded selection | What five paired four-airport sets arise if we do not cherry-pick the highest-traffic 48? | Five *candidate* sets, one KTEB mismatch spotted |
| KTEB scope adjudication | Does the same seed replace exactly the one unsuitable scheduled-passenger site? | **KBUF** replaced **KTEB** in Pair 3, 19 other slots unchanged |

**Next commands should answer substantive new questions**: Do the paired airports have genuine operating-leg scheduled passenger coverage in the intended future periods? Is the physical-source cutoff grid complete at all horizons? Is the time/expense budget defensible? The actual paid Phase6 collector must be a separately authorized, GitHub-timed workflow, **not manual Replit Shell commands at T−24 hours**.

## 7. How we'll capture the *useful* flight data, not merely “as much as possible”

The goal is **high-quality, representative-within-our-declared-frame, cutoff-valid usable observations**, not maximizing bytes or assuming every optional signal exists. Feature candidates must be available before the applicable prediction time and legally retainable for the defined use.

| Data family | Useful fields / example | Key bias, legality or leakage rule |
|---|---|---|
| Flight identity/population | One provider-observable operating leg, airline/operator, marketing code-share linkage, origin, destination, flight date, scheduled departure `T` | Do not double-count marketing codeshares; retain missing/ambiguous identity separately |
| Route & network | Directed OD pair, route distance, direction, domestic/international, route/airport/carrier historical frequency, previous known route performance | Route aggregates trained **only** on earlier observations or designated training data; do not compute full-dataset global delay statistics then leak them into PRE/test |
| Schedule & local time | Earliest known scheduled T, current as-of scheduled revision, local hour/day/weekday/UTC offset and season | Freeze clock semantics; the post-cutoff schedule is a target/label candidate, never a PRE feature |
| Airline, fleet & prior leg | Operator, aircraft type, tail when genuinely available, previous leg's *already known* arrival/departure, turnaround evidence | Aircraft-tail chains must be ordered by availability, not hindsight; missing tail is a real segment, not a random deletion |
| Airport/traffic context | Pre-cutoff airport activity, historical congestion/proxy, region, tier, network degree | Different airport yields and sampling probabilities can bias results; preserve these in selection/weighting analysis |
| Weather / operations | METAR/TAF issued and received by the cutoff, wind, visibility, precipitation, aviation hazards if lawfully available | Do not use an eventual revised report as if it was known hours earlier; NOAA ADS-B sources separate from AeroDataBox rights |
| Provider status & source health | As-of last known flight status, reported revision event, field availability, latest original `available_at`, data-age and capture reason | Missing webhook is not “on time”; observation-frequency can accidentally teach provider behavior instead of aviation conditions |
| Labels / real outcomes | Provider-observable schedule-revision proxy vs genuinely certified gate-out/wheels-off/arrival evidence; cancellation/diversion with explicit censoring | A schedule change is **not** proof of physical wheels-off; unknown/censored never automatically become negative examples |
| Airborne auxiliary (POST) | Observed trajectory time/location, ETA updates, availability intervals | POST model must be separated from PRE model; no airborne features leak backwards into T−6h prediction |

**Coverage mechanism:** a signed source query creates a provider-observable flight population (the denominator). For each selected flight we attempt T−24h, T−6h and T−90m PRE observations using strict provider-original availability timestamps. POST/callback evidence is associated later and may be absent. We record **planned → attempted → durable source → identity-bound → cutoff-valid PRE → observed/censored POST** counts instead of asserting that all rows completed every stage. Repeated FIDS refreshes have real REST API costs, and Alert SEND consumes a **different** credit ledger. The budget is measured by physical request UTC dates and separately accounts for FIDS base/split/retry plus validation/outcome/history/diagnostic.

## 8. Routes — the key predictive-value worry

A route is an **ordered origin→destination pair**, e.g., `WSSS→KUL` and `KUL→WSSS` are not the same directed route. We sample four **departure airports** per batch-day; we do **not** limit destinations to our sampled airports. This means meaningful route diversity may arise from many destinations at each chosen origin, but the exact number of distinct, repeated or bidirectional routes remains **UNOBSERVED for the future Phase6 cohort**.

The Plan's first-class route analysis includes **Engine R (unseen OD pairs)**. During collection, measure: unique directed OD routes, new-route rate, route recurrence by distinct **batch-day** (not merely repeat API responses), origin/destination/airline mix, share of routes observed in at least two independent days, direction imbalance, uncovered and unsupported routes, and training/validation/test group overlap under the frozen split policy. Route targets/metrics with too few independent observations should be tagged **low support / not estimable**, not given falsely precise scores. Also keep aircraft-chain depth and previous-flight links distinct from route recurrence.

**Important sampling implication:** four HUBs were purposively chosen; ordinary MID and REGIONAL airports are sampled within frozen eligibility strata, not all global airports uniformly. Engine A's future-in-collection-regime result cannot support claims of reliable predictions for *all routes worldwide*. The Engine R holdout estimates the problem of unseen routes **conditional on what our study actually observed**, and needs both nonempty training and route-held-out tests with sufficient class/event counts before publishing a score.

## 9. How to know whether we have **enough data** for Phase 7

**Before Phase 6**, we can establish that the experiment is technically capable of producing suitable data and that the sample/feature/evaluation contracts are frozen. We **cannot** certify enough usable labels, rare events, route recurrence or model accuracy from an airport frame alone. This has to be audited **during** collection and analyzed **after** collection, without using outcomes to rewrite protected test rules.

A minimum scientifically useful daily/weekly **route + prediction-readiness scorecard** must count, by day/tier/region/origin/carrier/route/horizon:

1. **Population and source funnel:** physical scheduled GET, durable original before cutoff, unique *operating* legs in FIDS population, selected/horizon-eligible rows, genuine committed as-of PRE, true observed target, unknown/censored/not applicable. Use distinct flight identities, not count of callbacks or credits as fake flight sample size.
2. **Diversity:** unique airports, directed OD pairs, carriers, aircraft/tails; new vs recurring routes, sampled-region shares, times of day, weekdays, same-tail 2/3/4+-leg chains, bidirectional route coverage. For crossover windows, compare outcomes **by treatment shape** and measured expense, accounting for pairing and washout.
3. **Outcome support:** number of independently observed positive severe-delay events (≥15, ≥60, ≥120 minutes), cancellations/diversions, eligible negative observations, class imbalance, confidence intervals; zeros with *no usable labels* are **unknown**, not successes.
4. **Feature completeness & latency:** clock-valid availability at T−24/T−6/T−90, per-field null/missing-reason %, state-age buckets, endpoint/airline/route missingness, weather issue-to-availability timing, code-share/tail identity ambiguity.
5. **Evaluation support:** number of **independent calendar-day blocks** for Engine A and independently held-out routes for Engine R, with route/airport/time/aircraft leakage checks. Thousands of flight rows inside six days still represent **six protected test day blocks** for the Plan's primary pilot uncertainty.
6. **Budget efficiency:** actual REST units and separately accounted Alert credits per usable cutoff-valid PRE, valid observed target, new route, tail-chain link and information gained; no claim “one row equals one credit.”

**Practical decision framing (not invented universal numeric guarantees):** if an endpoint has no constructible observed target, it is **BLOCKED**; if there are too few valid events/independent groups, a quantitative subgroup or calibration estimate is **INSUFFICIENT_SUPPORT**; if a cohort is valid but imbalanced, report it with group-level uncertainties and honest model scope; if added samples stop improving training-only learning curves, investigate whether richer *pre-cutoff* features, a different target or a separately preregistered longer collection is the right next experiment. A random, after-the-fact “we need 10,000 rows” threshold is not scientific without effect size, prevalence, independence and desired precision.

## 10. How Phase 7 will test prediction quality without giving us a false positive

The binding f.8 §13 research contract already defines:

- **Model −1:** a **persistence baseline** (simple reference); **Model 1:** XGBoost tabular using allowed as-of schedule/route/aircraft features. **Primary pilot comparison:** T−6h, **Engine A**, target `selected_primary_target` only if its actual scheduled/observed definitions are constructible. A primary physical delay claim is **BLOCKED** if the provider evidence cannot support it; a narrower schedule-change proxy must be explicitly redefined and prospectively frozen, not silently substituted.
- **Primary metric:** MAE in minutes. `delta_MAE = MAE_baseline − MAE_XGBoost`; preregistered *practical* signal is **at least 2 minutes lower MAE**, with a 95% **calendar-day block-bootstrap** interval whose lower bound is above zero for a **positive** Month-1 pilot. A comparable negative result needs at least 2 minutes worse and an interval wholly below zero; otherwise neutral/inconclusive. These are **pilot** categories, not guaranteed production efficacy.
- **Data splits:** ordered batch-days **TRAIN 1–20**, **VALIDATION 21–25**, **untouched TEST 26–31**. Freeze the split **rule** before Phase 6; materialize/hash actual test row IDs only after collection and before any model tuning; test only once after model selection. No hyperparameter/feature/collection-policy choices based on the protected test.
- **Generalization engines:** A = later days under observed collection regime; B = unfamiliar airport, C = unfamiliar region, D = unfamiliar tail/type, **R = unseen directed OD route**, P = population audit. E = event-held-out **deferred** until an event source/taxonomy is frozen. Separate airborne POST ETA model from predeparture predictions.
- **Beyond headline MAE:** RMSE; probability of delay >15 or >60 minutes using Brier score and 15-bin ECE; 90% quantile prediction-interval coverage/width; severe-delay ≥60/≥120 tails; missingness and staleness curves; route/airport/aircraft/time subgroup scores; provider-observable population audit and collection-mechanism ablation. A model that performs well only because it learned which sources we paid for fails scientific generalization scrutiny.
- **Uncertainty:** the Plan's primary protected test has **six batch-days**. Bootstrap resampling produces an *interval*, not more independent data. Do not market Month 1 as robust seasonal/confirmatory or “nearly perfectly accurate.” If the pilot is weak, underpowered or negative, report it and propose an independently preregistered follow-on study; do **not** change the test set or success threshold after reading it.

**What counts as success:** a scientifically honest usable pipeline and an informative, documented prediction/evaluation result are worthwhile outputs even if XGBoost does not beat persistence. A production prediction claim needs independent evidence and calibration, not just a successful schema migration or a one-month pilot.

## 11. Concrete Phase 5 release-critical checklist (no perfection loop)

| Exit deliverable | Current state | Minimum next evidence needed |
|---|---|---|
| A. Scientifically valid, lawful experiment | **PARTIAL** | Confirm target semantics (provider-native T / actual-only vs reported schedule); additional candidate airports scheduled-passenger operating-leg scope; legal source Contents/retention boundaries; frozen feature/as-of/route-split contract |
| B. Real end-to-end source→PRE→POST | **PARTIAL** | Reproducible GitHub-only selected airport early draw, real source-body persistence before ACK, all three cutoff-valid flight-level PREs, restart-safe signed receiver, independent POST/STOP/unknown/censor reconciliation |
| C. One concrete calendar + bounded cost | **NOT SIGNED** | Actual future 31 ordered parent batch-day dates, 4 airport slots per day, 5 matched pair sets and random treatment order, 26/3/2 shapes, ≥24h washout, verified response maximum/latency, **all seven REST categories** and separate Alert provider balances/floor |
| D. Independent release verdict | **NO** | Immutable signed scientific FREEZE evidence after A–C and distinct paid Phase6 GO (not implied by prior paid authorization for bounded diagnostics) |

**Do not reopen:** already audited historical P25 incident/budget administration; old synthetic signed-POST one-shot marker; completed initial B0062 census/four-HUB/48-site scans; installed V0079–V0083 schemas and restricted roles; historical AeroDataBox account-plan questions. **Do not block offline engineering awaiting a vendor email**, but do not silently grant ML Contents rights or future physical observability that have not been demonstrated.

## 12. Immediate engineering handoff — what to build or verify next

**P0:** archive the corrected owner five-pair JSON and its hash; review the other 14 MID/REGIONAL candidates' scheduled-passenger service evidence and distinguish unsupported/seasonal from low volume; create a stable, explicit pair-set eligibility verdict **without changing the already chosen seed to chase high-yield airports**. Next precommit independent within-pair **treatment-order randomization** only after scientifically reviewed real airport sets; do not treat the seed used for *airport sampling* as the seed for *treatment assignment*.

**P0:** create and independently audit a real 31-batch-day calendar with the 26/3/2 window shapes, correct UTC schedule, 5 pair replays, ≥24h washout, and early selected-day draw committed sufficiently ahead of the earliest physical T−24h source cutoffs. Verify separate provider REST units/Alert SEND budget and exact physical charge day; no “historical 60k plan = current available” leap.

**P0:** demonstrate the *actual* prospective source→PRE/POST data path and scientifically allowed source retention. Hold strong claims about real wheels-off, origin/destination identity, route generalization and forecast accuracy until there is real evidence.

**P1:** integrate the existing Phase 5 day-source quality and Phase 7 route/chain/model-readiness metadata scorecards so that insufficient data is detected early, not discovered only after the month ends. Daily process diagnostics during Phase 6 must not tune ML models or inspect protected test outcomes.

## 13. 15-minute meeting walkthrough and likely questions

**Suggested flow:** (1) state the goal and pilot-versus-deployment distinction; (2) show 4,346/1,125/1,013 counts; (3) show four HUBs and five corrected pair templates; (4) explain B0062/PostgreSQL/Neon in one slide; (5) show how GitHub immutability + READ ONLY audits work; (6) explain route/outcome/feature/uncertainty scorecards; (7) list the four Phase 5 exit deliverables and independent Phase6 GO boundary.

**Q: Does choosing four airports per day mean only four routes?** No. Four *departure-airport sampling slots* can expose many directed OD routes from those airports, if the provider actually returns scheduled operating legs. Their number and repetition must be measured, not invented.

**Q: Why is SKBO used twice?** Five crossover *comparisons* draw HUB identities from a four-airport owner pool. One repeated HUB is expected; matching periods replay exact four-airport sets, while washout and chronology protect inference.

**Q: Why exclude KTEB after random selection? Isn't that biased?** The original draw is retained, the official pre-existing scheduled-passenger service restriction is documented, and only that one slot is replaced by the **next precommitted seeded North America MID candidate**. This is a disclosed post-selection operating-population eligibility adjudication. We cannot present it as if preregistered, or cherry-pick replacements based on predicted performance.

**Q: If there is no visible B0062 table in Replit, is the research database fake?** No. B0062 is a SQL baseline file, not a table. The owner verified the live Neon `neondb`/`clean` airport frame via real READ ONLY SQL. An empty/missing Replit development browser is a different interface and not the production DB readback.

**Q: Are we collecting data already?** Recent commands read *existing reference metadata* and verify software, not prospective Phase 6 flight records. Phase6 paid collection must still be independently released, scheduled and audited.

**Q: Can we guarantee an almost-perfect predictor?** No. We can guarantee predeclared evaluation rules, source provenance and honest errors; we cannot promise unseen empirical accuracy. The first cycle tests a real model against a simple baseline, assesses route/generalization/calibration and yields a legitimate pilot even if inconclusive.

**Q: What if the first model disappoints?** A negative or uncertain pilot is not “for nothing”: it diagnoses feature/label limits and the value of additional samples. We can improve preprocessing, only lawful as-of features, route coverage or experimental design using training/validation data, or preregister a fresh independently tested collection cycle. The protected original test remains untouched and cannot be recycled to inflate scores.

## 14. Permanent source-of-truth links

- [Phase 5 README and dated checkpoints](README.md); [Issue #416 release/continuity discussion](https://github.com/HKcode22/ReplitTranvr/issues/416).
- [Owner actual four-HUB frame verification](evidence/2026-11-08_owner_four_hub_live_b0062_frame_readonly.json).
- [Owner actual 48 MID/REGIONAL candidate metadata](evidence/2026-11-09_mid_regional_12cell_owner_live_b0062_readonly.json).
- [Original full-frame five-pair SHA-pinned owner readback](evidence/2026-11-09_five_full_frame_pair_owner_readonly_original.json).
- [Corrected owner readback KTEB → KBUF](evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json) and [scientific adjudication](2026-11-09_REAL_FIVE_PAIR_SCOPE_ADJUDICATION_KTEB.md).
- [Plan f.8, especially §§5–8, 10–14 and 17](../plans/V3.9_DataCollectPlan_f.8.md); [prospective four-HUB Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md); [segmented provider source/budget Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md).
- [Database atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md); [Phase 5 four exit deliverables](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md); [daily source quality](2026-11-06_PHASE5_DAY_SOURCE_QUALITY_READONLY_SCORECARD.md); [segmented FIDS source/budget coverage](2026-11-07_STAGE22_F8_SEGMENTED_FIDS_SOURCE_COVERAGE_AND_SEVEN_REST_BUDGET.md).

**Closing reminder:** We have a stronger, more auditable experimental design, not a proven accurate model. Proceed without unnecessary perfection loops; preserve explicit uncertainty, scientific sample restrictions, and a real independent Phase 5 FREEZE before Phase 6 paid collection. Inshallah.
