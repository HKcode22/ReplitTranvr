# Phase 5 owner study guide: four HUBs, five crossover pairs, forty windows, and the earliest safe Phase 6 start

**Checkpoint date:** November 9, 2026. This is the project's owner-facing technical study material and recovery checkpoint. It is based on the real corrected B0062 PostgreSQL readback archived in GitHub and the already merged PRs #503, #505, #506, #507 and #508. **It is not a scientific FREEZE PASS, provider-licensing conclusion or paid Phase 6 GO.**

## 1. The scheduling decision: DO NOT wait for November 24 just because an example used it

The **November 24, 2026 to January 5, 2027** schedule from PR #506 is a **synthetic scenario**, not an approved flight calendar. Its first date was supplied to demonstrate calendar arithmetic. Nothing requires us to hold collection until November 24. The project objective is **the earliest scientifically and operationally safe start immediately after Phase 5 is independently complete**.

The crucial prospective relationship is:

~~~text
First possible flight-window start - 24 hours
    >= all-gates-actually-ready UTC
       + verified maximum scheduler slip
       + verified maximum provider response and durable database persist
       + PRE cutoff safety margin
       + any separately reviewed extra reserve
~~~

The first scheduled UTC start slot in the current design is 00:00. We can select the earliest UTC day at which the inequality holds; we must not round DOWN and pretend an expired T−24h cutoff still exists. **A real selected flight may occur later than its parent window start**; the real flight-level selected T and provider-native available-at clock must be audited separately.

**NEW:** server/lib/disruption/phase5RollingEarliestFirstDayScenario_v39.ts implements a zero-cost, pure *hypothetical* lower-bound calculator and calls the existing actual-sample date proposer to construct the 31-parent-day scenario. It requires explicit worst-case safety timing inputs, does not guess them and returns all release flags FALSE.

For teaching only, if one assumes every release prerequisite already passed at 2026-11-09 09:27 UTC and uses hypothetical bounds of 300 seconds scheduler slip, 120 seconds response/persist, 60 seconds margin, then the earliest geometric first UTC batch is **November 11, 00:00 UTC**, with its first-window T−24h at November 10, 00:00 UTC. **That is NOT a claim that Phase 5 had actually passed or that a Nov 11 flight can be purchased.** When true readiness is later, the candidate rolls forward. The 31-date span is a separate feasibility problem, not a fixed November/January booking.

The November 24–January 5 example takes 43 calendar dates for 31 batch-days because it spaces days for repeated-airport washout and paired weekday/time matches. The existing greedy planner is not a global optimal scheduler; 43 dates do not prove a hard minimum or a fixed end date.

## 2. Different numbers count different things

| Number | Exact meaning | Not the same as |
| --- | --- | --- |
| **4 HUBs** | Actual selected anchor airports WSSS, OMAA, SKBO, YSSY | Four routes or four experimental pairs |
| **5 crossover pairs** | Five matched four-airport samples, each revisited under two treatments | Five separate geographic regions |
| **4 slots per pair** | HUB, MID_A, MID_B, REGIONAL | An origin-to-destination route |
| **20 pair-slot assignments** | Five pairs times four named positions | Twenty distinct physical airports |
| **19 unique airports** | SKBO fills the HUB position in TWO different pairs; the others are distinct | A data duplication or error |
| **10 paired parent batch-days** | Five pairs, observed twice each | Ten finished real data captures |
| **40 airport-window review rows** | Ten paired batch-days times four airport positions | Forty flights or forty API calls |
| **21 ordinary adaptive batch-days** | Additional future sampling days whose airports are selected *before their first T−24h source cutoff* | Twenty-one already known airport sets |
| **31 total batch-days** | Ten crossover plus twenty-one ordinary days | Thirty-one necessarily consecutive dates |
| **13 paired active child exposure segments** | Five 4-hour control, six 2-hour pieces (in three split alternatives), two up-to-6-hour alternatives | Thirteen paid GETs |
| **52 airport × active-segment opportunities** | Thirteen active child segments times four airport positions | Fifty-two distinct physical airports |
| **156 paired PRE cutoff-span groups** | Fifty-two opportunities times three horizons (T−24h, T−6h, T−90m) | 156 flight observations or 156 physical REST units |

These are **nested descriptions of one experiment**, not new experimental samples being added whenever a number changes. PR #507 generated the 40 **conservative 6-hour review envelopes**. PR #508 applied a separately *claimed* treatment-order seed to preview true active child segments and 156 **cutoff targets**. The seed is not independently witnessed yet, so neither set proves the data were observed.

### Visual hierarchy

~~~text
31 parent batch-days
├── 10 paired days = 5 matched comparisons × 2 periods
│   └── 4 airport slots per day = 40 airport-window review rows
│       └── after preview treatment allocation:
│           13 active child segments over all paired parent days
│             × 4 airport slots = 52 airport-segment instances
│             × 3 PRE horizons = 156 cutoff-span target groups
└── 21 ordinary adaptive parent days
    └── four *future* airport identities chosen before T−24h, not drawn now
~~~

## 3. The five REAL corrected sample sets

The actual corrected PostgreSQL owner receipt (PR #503) records these twenty pair-slot assignments:

| Comparison | HUB | MID_A | MID_B | REGIONAL |
| --- | --- | --- | --- | --- |
| 1 | OMAA, Abu Dhabi | OMSJ | SPJC | KDEC |
| 2 | WSSS, Singapore | SBFL | TJSJ | LSZB |
| 3 | YSSY, Sydney | **KBUF** | LFQQ | NZNP |
| 4 | SKBO, Bogotá | EBAW | NZNS | RJNK |
| 5 | SKBO, Bogotá | YBUD | RKTU | FAKM |

Why two SKBO entries? We deliberately have **five comparisons from a pool of four HUBs**. Reusing one HUB across different comparison sets is structurally allowed, but never inside a prohibited washout. PR #505 found that the old date draft gave SKBO only **22 hours from its prior window END to the next START**, failing the required 24 hours; it repaired the validator without replacing the frozen airport selection.

Why KBUF? The original seed-preserved full-frame draw put KTEB in Pair 3 MID_A. The operating-passenger-scope review found KTEB unsuitable. The actual documented correction replaced that **one slot only**, keeping the other nineteen slot assignments unchanged, before seeing Phase 6 outcomes. This does NOT permit swapping future low-yield airports until a result looks good.

**MID_A and MID_B are intermediate airport tier slots.** They are not flight origin/destination endpoints and do NOT mean an airplane will travel from MID_A to MID_B.

### Why the crossover helps

A match between Period 1 and Period 2 reuses the exact same four airports, UTC start-time class, and weekday/weekend class. One period takes the 4h control; the other takes the alternative observation-window strategy. This controls some site-specific variation when comparing temporal sampling strategies. It is not proof that all traffic, weather, holidays or disruption mechanisms are equivalent. **Five comparisons may still be statistically underpowered**; we must report uncertainty and selection/missingness rather than guarantee model success.

The twenty-one ordinary days broaden coverage beyond those fixed matched samples. Their airport choices will be prospective and should preserve regional/tier selection probabilities rather than favor routes known to be predictable.

## 4. Five pairs are NOT five geographic regions

Regions are **strata** for sampling balance, a different concept from paired comparisons. B0062 is the PostgreSQL **schema/migration baseline**, NOT a separate database. The historical active sampling frame contained **4,346** airports. Of these, **1,125** met a broader dual PRE/POST eligibility criterion (111 HUB, 427 MID, 587 REGIONAL). A stricter scheduled/feed/positive-metric rule left **1,013** MID/REGIONAL airports (427 MID + 586 REGIONAL) for the corrected whole-frame pair draw. The **12 tier × region cells** are two sampled tiers (MID, REGIONAL) across six geographic region groups, not 12 model labels.

The frozen data frame is in the project's PostgreSQL database (reported as neondb), including the schema objects **clean.adb_sampling_frame** and **clean.adb_sampling_frame_registry**. A separate early-draw/selection process records airport assignments and timing; selected airport rows in a frame are not physical operating-flight results.

## 5. How 40 became 156 in the actual code

The ten paired-day windows contain five 4h controls and five alternatives. Alternatives for Pair 1–3 are **two separate active 2-hour segments with a 1-hour NONPOPULATION gap**; alternatives for Pair 4–5 are planned **up-to-6-hour** windows, which may end earlier under STOP.

~~~ts
const pairedAirportWindows = 5 * 2 * 4; // 40 review rows
const activeSegments = 5 + (3 * 2) + 2; // 13 child segments
const pairedCutoffTargets = activeSegments * 4 * 3; // 156 groups
~~~

A specific real physical airline flight is not implied by these arithmetic identities. Its T is **flight-specific**; a group cutoff span is a planning window, not the flight's provider-native T. A source provider may require **more than one GET per target** due to partitioning, range limitations, refresh latency and retries. Conversely, one GET may describe several physical flights. Therefore neither 40 nor 156 can be used as the source-bill forecast or the model's training row count.

## 6. Why model accuracy and routes still need independent evidence

A **directed route** is a physical operating flight's origin → destination, e.g. a genuine flight from Airport X to Airport Y. Four airports appearing together in a batch do **not** create six or twelve routes. We count actual directed OD support only after provider source identities and scheduled operating-leg scope are documented; marketing codeshares must not become duplicate independent flights.

The data pipeline aims to join:

- **Real flight identity and sampling probability**, with source/provider/provenance and selected airport/date;
- **PRE** snapshots as they were available at each distinct time cutoff (not later reconstructed actuals);
- **POST** actual outcomes with verified semantic meaning (e.g., actual-only wheels-off vs scheduled departure), valid ownership and retention;
- Missingness and coverage indicators that distinguish zero service from **UNKNOWN source** and distinguish weather/context available then from hindsight.

Phase 7 should compare a simple baseline (Model −1 / persistence) against ML models, report calibration and uncertainty, evaluate unknown/unseen directed routes separately (Engine R), and preserve the **20 TRAIN / 5 VALIDATION / 6 TEST batch-day split**. Five pairs and many raw rows alone cannot guarantee meaningful predictive accuracy. If route/event strata are underpowered or badly biased, we report the limitation and amend the research design prospectively, never use TEST outcomes to cherry-pick training conditions.

## 7. The exact GitHub file map: where the code LIVES

**Source of truth:** https://github.com/HKcode22/ReplitTranvr on main. The files are not separate apps or databases. GitHub houses versioned implementation and documentation; GitHub Actions runs guarded jobs; Replit Shell is an optional owner interface to inspect reviewed copies; PostgreSQL stores actual SQL rows; the published receiver is an independently verified deployed component.

| Path from repository root | Responsibility / why it exists |
| --- | --- |
| data-collection/phase5/README.md | Living authoritative Phase5 checkpoint. Read top entries after a lost chat. |
| data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json | Actual read-only PostgreSQL result for corrected five pairs, selection/frame hashes, KTEB→KBUF. Not live provider flight data. |
| server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39.ts | Date-only **candidate** for 31 batch-days from actual corrected sample and any supplied first date. Nov24 was only one input. |
| server/lib/disruption/phase5RollingEarliestFirstDayScenario_v39.ts | **New** pure best-case rolling-first-day lower-bound using an assumed fully-ready timestamp and explicit T24/source safety margins. Not a release authority. |
| server/lib/disruption/experimentCalendarSolver_v39.ts | Original five-anchor solver, separately named four-HUB draft, matched-airport/UTC/weekday shapes and global washout. Draft SAT does NOT rewrite historical Gate2. |
| server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39.ts | 40 precise paired airport/date/window review keys. Real future provider-native counts still UNKNOWN. |
| server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39.ts | **PR #508**: separate claimed seed commitment → 5 control/5 alternative windows → 13 true paired active segments and 156 cutoff target groups. No independently witnessed seed or paid GETs. |
| server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs | Binding structural 31-day validator: 26×4h, 3 split two-hour pairs, 2 up-to-6h alternatives, balanced paired treatments. |
| server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs | Already implemented actual active-segment partition/three PRE horizon, provider-range, refresh, **seven physical UTC charge-day REST categories** validator. Requires externally authenticated provider/pricing/clock inputs. |
| scripts/v39_phase5_corrected_pair_date_geometry_readonly.ts | Optional local-only stdout provisional full calendar. No provider or DB writes. |
| scripts/v39_phase5_crossover_40_window_review_readonly.ts | Optional local-only JSON/CSV 40-row review checklist. No provider GET. |
| tests/phase5_rolling_earliest_first_day_scenario_v39.test.ts | **New** synthetic edge cases: first safe date, no missed T24, rollover on delay, bad latency bounds, 31-day UNSAT. |
| data-collection/phase5/2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md | **This guide**, explaining WHAT/WHY/WHERE/HOW and scientific limitations. |

Other important directories: .github/workflows (exact code SHA jobs), migrations (database schema and scoped permissions), scripts (read-only helpers and owner commands), tests (Vitest regressions), data-collection/phase5/evidence (versioned observational receipts), and data-collection/phase5 (checkpoints and science decisions).

### Read this code snippet first

The mathematical idea behind the new rolling start helper is:

~~~ts
const extraMilliseconds =
  (schedulerSlip + providerPersist + preCutoffMargin) * 1000;
const earliestPossibleStart =
  hypotheticalAllGatesReadyAt + extraMilliseconds + (24 * 3600 * 1000);
const nextBatchMidnight =
  Math.ceil(earliestPossibleStart / 86400000) * 86400000;
// Now call the actual five-pair date proposer with that UTC day.
// Return PROVISIONAL ONLY. No actual paid Phase6 activation.
~~~

Round **UP** to the next available day-one 00:00 UTC slot. Never reduce the 24h lead, count a late flight observation as on-time, or turn a test clock into a documented source response.

## 8. What do SHA-256, commits, SQL JOINs, and PRE labels mean?

**SHA-256** is a fingerprint of fixed JSON/code inputs: it can detect changed airport identities/dates but cannot certify truth, legality, or timestamp provenance. **A Git commit** pins exact file contents; **a PR** is the review route onto main. We require all four exact-head CI checks green; CI success is still not the independent scientific PASS.

**A SQL JOIN** matches logical keys between flight identities, selected draw, original source receipt, PRE snapshots and POST labels. A bad JOIN can multiply a physical flight into multiple rows (marketing codeshares/retries) or silently drop missing-source flights (selection bias). B0062 is a schema version, not a flight table full of predictions. See the November 9 meeting checkpoint for repository-specific SQL explanations and the source→PRE→POST design.

A cutoff-safe PRE feature requires authentic **available_at at or before that exact flight's T−24h, T−6h or T−90m cutoff**. What was observed afterward is a POST outcome, not a retrospective PRE feature. Missing/unknown is never silently zero.

## 9. Remaining release gates, without repeating old work

**Completed offline:** actual corrected B0062 frame/selected pairs, preservation of one KTEB→KBUF adjudication, global 24h repeated-SKBO washout fix, 31-date scenario builder, forty SHA-bound review targets, treatment/active-segment preview with 156 potential cutoff targets, plus this new rolling-first-day planning helper and study guide.

**Still independently needed:** verified provider-native passenger operating population by real airport/date/time, independent precommitted treatment assignment, region/route selection integrity, 21 ordinary early immutable draws before actual T−24h, authenticated provider FIDS range and latency, physical UTC GET/retry budget across seven REST categories and Alert credits, lawful source Contents retention/use and backup expiry (#300), current published receiver/STOP, actually timely FIDS original→PRE at three horizons→witness→POST, and one independent scientific Phase5 FREEZE verdict followed by separate Phase6 paid GO (#416).

**Decision:** If Phase5 passes sooner, **roll the schedule earlier** within real source safety. If any prerequisite fails, HOLD and repair that precise issue; do not wait for an arbitrary date, rerun old B0062/P25, reinstall V0079–V0083, invoke Cloudflare/Replit AI Agent, backfill missed cutoffs, or claim a fake PASS. Vendor email replies do not block offline engineering, but unknown data-use rights cannot be assumed permitted.

No Replit Shell command is required just to read this guide or receive this checkpoint.
