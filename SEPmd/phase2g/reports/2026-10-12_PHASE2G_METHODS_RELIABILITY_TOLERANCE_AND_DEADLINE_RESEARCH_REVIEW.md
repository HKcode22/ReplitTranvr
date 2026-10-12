# Phase 2G methods and delivery-reliability assessment — evidence review and realistic deadlines
**Date:** 2026-10-12 PDT · **Status:** PROSPECTIVE REVIEW ONLY, NOT AN ADOPTED THRESHOLD, NOT PAID GO.  
**Owner/repo:** HKcode22/ReplitTranvr · draft PR #36 `phase2g-pragmatic-science-and-checkpoints-20261012`, separately from draft launch PR #35.  
**Purpose:** Reassess the project lead's concern that Phase 2G (August–October 2026) is stuck pursuing operational perfection at a cost disproportionate to the ML science; identify justified leniency, unjustified leniency, and actual completion milestones. No existing science/billing/history is retroactively reclassified.

## 1. Evidence read (direct original documents, not remembered titles)
- **Binding baseline:** `SEPmd/V3.9_DataCollectPlan_f.8.md`, blob SHA `3ef1b8730e3148b936fcf02b46d0a091e69f7480`, 2,466 lines (main, Oct12 inspection). §§0, 9.1–9.2, 11.1–11.3, 13.2–13.6, 20.1–20.8 and Phase-2G physical-v2 amendment were examined.
- **Paired implementation manual:** `SEPmd/V3.9_IMPLEMENTATION_LOG.md`, blob SHA `0a5e4bedfa7c743feaf05ec2dc66f22084f39236`, 8,210 lines. §§1.7–1.12, 1.13, 22–26 reviewed. The historical manual has outdated "current Phase 0" examples: always validate against newer dated live checkpoints before treating them as operational state.
- **Current release:** [PR #35](https://github.com/HKcode22/ReplitTranvr/pull/35), draft/unmerged/unpublished candidate `66e9bce772918ceca470bae0e3c9e13f6e8d0af6`; Oct11 P01–P20 release matrix, packaging report, and rehearsal handoff examined. Four GitHub CI suites were recorded successful on that head in prior readback; no new paid GO inferred.
- **Separate proposal:** [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) and `SEPmd/phase2g/amendments/2026-10-12_PROSPECTIVE_PRAGMATIC_MISSINGNESS_AND_DELIVERY_GAP_POLICY_DRAFT.md`.
- **Actual operator Shell output this session:** pinned `469d94be9e5dc51cd45496b39f6d29469c3157eb` historical-budget **READ_ONLY_PREVIEW** returned `ELIGIBLE_ONLY_FOR_HISTORICAL_MISMATCH_QUARANTINE`, old budget `P2G-S1-20261009-23` OPEN, probe18 failed and UNRESOLVED, null historic credit totals, 30 retained source references, incident30 contained but actual runtime cleanup unproven, safe mode true, reserved 500, zero active billable subscriptions, `new_paid_stage1_authorized=false`, provider calls/spend 0 **for this preview**. **No `--apply` output was supplied; quarantine has not been proven applied.** Local P20 120min synthetic rehearsal started from worktree `f4c9b24`, log `/tmp/yssy-p20-local.5GpMah/rehearsal.log`, but **no finish/PASS evidence supplied**. Do not equate the start message with a completed test.

## 2. Judgment: where the project lead is correct, and where not
**Correct:** 100% operational reliability is not a universal engineering optimum. Google SRE explicitly weighs innovation velocity and service reliability using error budgets [R1,R2]. NIST treats sampling cost, precision and decision risk as coupled design choices [R3]. The Plan itself prohibits endless theoretical redesign once P0/P1 inconsistencies close (§0), accepts a separately measured future *production* reconciliation tolerance (§11.2), and prospectively reduced Stage1 shortlist 12→6 plus made Stage2 conditional (§20). The *current* practice of exact MATCH for every Stage1 promotion, while understandable as a conservative initial test contract, is not a universal statistical theorem. Valid retained source records should not be discarded just because an independently recorded billing/distribution incident exists.

**Qualification/correction:** A tiny *credit gap* is not a statistically demonstrated tiny random *flight-observation gap*. AeroDataBox bills on SEND, not successful delivery [R4]. Gap 1 means a discrepant **billed flight-item credit** in the verified isolated-account example; it does **not** identify which flight update was lost, whether it was a unique flight, what its delay was, or whether the receiver outage was correlated with peak activity. Missing-not-at-random/informative missingness can bias models with even a small fraction of lost observations [R5,R6,R7]. An SRE uptime error budget cannot certify scientific unbiasedness. The user is right to stop an unproductive investigation if independent evidence cannot recover missing wire data, but wrong if "unknown gap" is therefore documented as "negligible loss" or "complete coverage."

**Correct distinction:** Received source integrity, statistical use of valid observed rows, official reference-yield/ranking certification, and protected financial exposure are four different outcomes. Avoid a single binary verdict for all of them. P25 remains frozen under its pre-outcome **exact-reconciliation** acceptance rule; changes below are for future cohorts after pre-registration, tests, and approval.

## 3. Quantitative case review
| Case | What is actually evidenced | Sound inference | Unsound inference |
|---|---|---|---|
| P2G06 WSSS | 220 billed vs 219 received item credits; 1/220 = **0.4545%** item-credit gap | Provider SEND and receiver reception did not reconcile; retained 219 credits' worth of events may still contain valid rows | Exactly 0.4545% of distinct flights or delayed flights are missing; anchor yield unbiased; old run can be promoted |
| P2G22 | 260 vs 259; 1/260 = **0.3846%** item-credit gap | A distinct historical cost/reception discrepancy | Proves webhook failure mechanism or that an important flight could not be missing |
| P2G24 YSSY | Historic actual billed credits **UNKNOWN**, probe18 failed/UNRESOLVED, sources retained 30 | Independently verified retained originals remain available for evidence; administrative OPEN→MISMATCH may quarantine uncertainty without guessing spend | "Only one credit was missing"; prior attempt is science-valid or paid spend now known |
| Three 15s polling intervals | 45 seconds = **0.625%** of 7,200s *if wholly interrupted* | Health detection/recovery grace shorter | Proves better scientific capture or lower loss |
| Two groups of 6×15s with 180s aggregate cap | 180 seconds = **2.5%** of 7,200s *if wholly interrupted* | Bounded chance to recover transient callback-host trouble instead of premature fatal stop | 2.5% of flights definitely missing; receiver was healthy; all billed sends persisted |

**Bounds (conditional, not certification):** If a settled gap `g=C_external-C_received>=0` represents (g) billed individual flight-item attempts and each one such attempt can add at most one new physical-flight identity, then the *unseen* additional distinct identities are at most (g) and at least 0, **assuming** the account was exclusive, billing contract obeyed, all costs settled, and observed physical identities are sound. This gives a limited **count sensitivity** bound, not a guarantee on delay-tail distribution, 15min stability, chain links, or exact population/notification completeness. For a fifth-versus-sixth anchor comparison, rerun predeclared scoring with hypothetical missing items allocated adversarially (strongest challenger/worst bucket). If selected top-five membership flips, official rank is *inconclusive*, but observed valid rows may remain available to separately scoped ML analyses. For historical P2G24 where external credits are NULL there is **no defensible numeric gap bound**: mark unknown, not zero.

A missing fraction relative to cost `g/C_external` is a **reconciliation diagnostic**. The primary ML denominator must come independently from the provider-observable FIDS population; webhook received-row count is not that denominator (Plan §§5, 11). Also report feature/label availability by airport, UTC bin, delay severity where observed, and time of callback outages.

## 4. Retry analysis — what 6+6 should and should not mean
AeroDataBox **provider delivery retries** and our **local receiver-health/watchdog retries** are independent controls. Their Jan31 2026 guide [R4] says provider retries are off by default, charged if enabled, and can be configured up to two retries. Existing frozen P25 `maxDeliveryRetries=0` must remain unchanged without a separately priced new authorization. Current P25 matrix records 6+6 health polls at 15s, maximum two health episodes with **180s total cumulative bound**. This does **not** mean twelve cost-free supplier redelivery attempts.

**Assessment:** Retain bounded 6+6 as the current proposed receiver-health grace (subject to deployed-code proof). Three attempts lack a privileged scientific rationale. Abrupt STOP can censor a nearly completed 120min observation window, while short host blips can be recoverable. Conversely, waiting longer on a genuinely dead ingress can accumulate charged lost SENDs; poll cadence and consecutive failures do not demonstrate successful webhook custody. Never trade away an independent spend watchdog or real delivery-failure stop to gain uptime.

**Stop/degrade logic proposed for future runs (not applied to P25):**
1. Receiver-health probe fails → enter bounded degraded state; keep **independent** billable-send/cap monitoring running and report loss/callback uncertainty. Do not assert continued ingest.
2. Health recovers within **frozen total** budget → record affected time interval with uncertainty; actual-source receipts determine what was observed. If needed, classify scientific run B (observed-only), not an automatic clean PASS.
3. Hard cap/floor, unauthorized subscription, unbounded spend, source custody/integrity failure, incorrect labels/identity, failed actual provider delivery evidence or inability to bound exposure → hard STOP even before 180s.
4. At maximum outage allowance or irrecoverable health → STOP/censor without extending a matched time-class window. No automatic extra paid run.
5. Use offline fault injections and actual external provider balance to evaluate policy; avoid claiming independence of retry failures or calculating success as (1-p^{12}) without measuring correlation. AWS recommends bounded retries/backoff, cautions that retries can amplify overload and should not proliferate across layers [R8]. Revisit grace period only on observed incident distribution, charged SEND loss and effective recovery, not arbitrary demands for 3 or 12 attempts.

## 5. Proposed acceptance classes, including unquantifiable gaps
**P0 / never waive:** durable original custody before successful acknowledgment; authentic received bytes; canonical physical-v2 identity and nonduplicated label; correct prediction cutoff/no leakage; source-compliant retention; frozen retrospective non-promotion; independent account ceilings/floor and active subscription exclusivity; actual settled balance not invented; no exposure while accounting/cleanup state unsafe.

**A — certified/comparable:** Meets predeclared official cohort accounting, identity, temporal population and scientific scoring criteria; eligible for anchor-rank normalization and preregistered comparable results.

**B — observed-valid, degraded coverage:** Verified genuine rows and labels but incomplete/uncertain webhook coverage; eligible for **exploratory ML development or preapproved restricted analyses**, with known limitations and sensitivity tests. Do **not** claim full 2h producer completeness, unbiased delay extremes, or old official Stage-1 ranking unless a prospectively approved criterion permits this.

**C — diagnostic / insufficient evidence:** Run's billed spend, clock, label origin or population denominator too uncertain for official claims, but there may be immutable source objects useful for incident analysis. Distinguish from B when verified rows are actually valid.

**D — exclude contaminated records:** Corrupted/untrusted raw records, physically invalid duplicate identities, future-derived features; remove or quarantine affected observations, not necessarily an entire disjoint dataset.

For *unrecoverable* missingness, timebox forensic retrieval once: enumerate available provider delta, webhook receipts, raw hashes, outage interval, and independent FIDS frame; if impossible to estimate an upper bound, write `extent=UNKNOWN`, state its consequences, and **close the investigation with a tracked limitation**. Do not continue weeks searching for inaccessible provider wire attempts. Never substitute "probably small" for unknown, and don't treat diagnostic labels as proof of absence. Missingness may be handled via complete-case subsets, indicators, forward-available-only features or models that naturally handle NULL, chosen on train/validation only [R5,R9,R10].

**Numerical cutoff:** The existing draft's 0.5%–1% is a discussion range, **NOT** a statistically validated allowance. Do not commit an acceptance percentage yet. For next eligible cohort, preregister a threshold only after transparent representative synthetic dropout scenarios (MCAR, time-block, high-delay/outage-correlated MNAR), top-five ranking sensitivity and model performance by time/airport/delay strata. This need not become an endless investigation: run one bounded, reproducible sensitivity study and accept observed-only if evidence cannot justify full certified comparison.

## 6. Concrete scope reductions identified in actual log/plan
| Area/owner | Existing situation | Proposed practical change | Safety caveat / approval point |
|---|---|---|---|
| Plan §0 P0–P3 | Explicit close-stop exists, but scope continues growing | Enforce P0/P1 done → stop redesign; P2/P3 are backlog except when they become demonstrated P0 | No hiding real hard blockers |
| Plan §11.2 vs §20.4–.5 | Canary exact and Stage1 exact | Keep canary exact; define future degraded scientific tier and measured production tolerance separately | Stage1 P25 frozen exact still binds |
| Plan §9 vs compact-six §20.2/20.7 | Older 12 candidates + 4h ×5 Stage2 | Follow prospectively frozen six candidates + **conditional** Stage2; no repeat valid OMAA solely to be neat | Do not call compact Stage1 pool the original Stage2-confirmed pool |
| Log §23 | **59 mandatory fields for every task/change** | Future amended Log: **8–12-field concise change receipt** for ordinary fixes, full deep artifact for significant P0 science/billing/schema changes | Preserve historical entries; no backfill busywork |
| Log §25 | 20 fields per function/code explanation | Require full detail only for new high-risk function/contracts; standard docstrings+tests for routine functions | Data lineage/cost and cutoff important for affected path |
| Log §§12–13,16,26 | 104 requirement rows, 88-component mapping, document and repo scanners | One canonical traceability index + automated tests; no manual recopy after every trivial change | Version/critical invariants still checked |
| P01–P20 | Original outage RCA, independent frontdoor staging not complete | Preserve as separate follow-up tasks with clear dependencies, not automatic permanent blockers for a tightly bounded conditional Stage1 | Never claim full receiver fault tolerance |
| P20 | 2h synthetic local harness optional | Optional supplemental evidence if not part of frozen P25 GO contract; do not hold up paid entry solely waiting for local test | Actual source/deploy/callback checks remain mandatory |
| Phase 6/7 | 31 batch-day design and protected evaluation | Keep scientifically valuable temporal/group split and true costing; optional graph/conformal/Engine E remain deferred | 31 batch-days imply *at least* 31 elapsed collection days, calendar may be longer |

## 7. Working deadlines: dependency-based, realistic, and nonpunitive
**These are new planning estimates, not completion promises or scientific validity constants.** Clocked windows and human approval are external dependencies. Never substitute artificial speed for verified identity, spend, custody or no-leakage. Task timing starts only when prerequisites are ready; report actual variance, limited blockers, and revised target if exceeded. Operator can stop after each checkpoint without losing context.

### Immediate Oct 12 launch-critical path (timeboxes, local PDT)
- **Before 12:00**: Inspect one stable PR35 diff/head and verify green safety evidence; stop speculative additional code scope. If meaningful code changes → re-review and test (don't fake prior green).
- **Before 15:00**: Operator has now supplied **eligible READ-ONLY** old-budget quarantine preview. Next separate human consent for guarded OPEN→MISMATCH, independently verify after write; review/authorize exact new P25 AUTH SHA and ledger. **No mutation yet observed.**
- **Before 17:00**: Reviewed and matched Replit callback-only publish, actual running git SHA and fresh signed wrong-secret/nonempty POST + readback/custody verification; else HOLD.
- **Before 19:30**: Fresh live account floor, zero billable subscriptions, exact authorized head/runtime/ledger, paid workflow preflight `PASS_READY_FOR_PAID_STAGE1`; otherwise HOLD.
- **20:00–22:00**: At most one user-approved YSSY 120min Stage1, maximum 500 Alert credits including reserve, no automatic rerun. Optional 120min synthetic P20 may continue separately and never fake PASS. If deadline missed, declare HOLD and select the next objectively comparable window rather than backdate or force success.

### Subsequent phases: per-work-package timeboxes and exit conditions
| Scope | Initial planning allowance AFTER prerequisites | Done/exit condition | Escalate rather than endlessly expand if |
|---|---|---|---|
| Ordinary noncritical fix + docs | 30–90min; 1 short checkpoint per work session | Targeted test & commit/receipt | Goes beyond 90min: identify hard dependency, defer minor work |
| P0 safety/identity/integrity fix | 0.5–2 focused workdays; one targeted integration and regression | Demonstrated affected-path invariant + evidence | Failure after ~2 days → split into minimal release blocker vs deferred research |
| Root-cause investigation of old outage | 2–4 focused hours initial; later on external provider/host evidence | Either actual cause with evidence or `ROOT_CAUSE_UNKNOWN` with observability limitation | No independent source evidence exists; don't spend multiple days on unknowable wire |
| Phase 0 remainder (implementation closure) | 3–7 focused workdays **only if actual code missing** | True P0 production callgraph/CI; not redrafting 59-field entries | Re-review last checkpoint: completed Phase0 must not reopen |
| Phase 1 account envelope | 0.5–1 focused workday | Provider IDs, quotas, floor/ceiling, safe-mode documented | Account/provider verification unavailable |
| Phase 2 pre-probe / Gate1 and frozen frame | 1–3 focused workdays for unresolved pieces | One authoritative preprobe record and safety smoke | Frozen external source or provider prerequisites unavailable |
| Phase 2G Stage1 candidate | Per airport: target 2h real collection **plus 1–2h** approval/preflight/settlement/report; scheduling may require a later matched weekday/time slot | Valid honest candidate class, not always A; no duplicated valid OMAA | Window missed, paid safe-mode or real source invalid; schedule next matched slot |
| Conditional Stage2 candidate | Only upon documented trigger: target 4h exposure + 1–2h overhead | Correctly labeled confirmed candidate | No trigger: SKIP Stage2, don't consume 5×4h |
| Phase 3 Gate3/0.5/4 | 2–5 focused workdays plus actual pilot windows | Measured and frozen cap/T/target/cadence/quality, real owned canary | Statistically insufficient sample: label insufficient; use one preplanned additional pilot, not unlimited retry |
| Phase 4 Gate5 | 1–3 focused workdays | Independent provider-observable population funnel | Invalid denominator is P0; missing optional feature isn't |
| Phase 5 calendar/manifest FREEZE | 2–4 focused workdays | Valid exact calendar, budget tree, split and immutable manifest | Solver UNSAT: explicit amendment decision, not silent relaxation |
| Phase 6 | **31 scheduled batch-days minimum**, may span more than 31 calendar days | Completed authorized observations and honest daily reconciliations | A failed day gets classified, no endless same-day re-runs |
| Phase 7 first pilot ML evaluation | 5–10 focused workdays after valid dataset & frozen splits | Baseline/XGB/MAE, uncertainty, documented quality/limits | Improvement inconclusive → report inconclusive, don't relabel |

### Decision hygiene / cut-scope rule
1. At start of each work block: define *one* output, an owner, evidence required and a stop deadline.
2. After first targeted test pass, refrain from adding speculative fault matrices unless observed fault is P0 or expected likely failure materially threatens cost/integrity.
3. If a blocker consumes its allotted work block, checkpoint cause/evidence, classify P0/P1 or defer P2/P3. Re-estimate; do not silently reset the clock for a new speculative requirement.
4. Use one concise daily GitHub checkpoint rather than new 59-field reports for each small conversation; old mandatory Log §23 remains **normative until a formal prospective document amendment is reviewed**.
5. Do not make dates dependent on sleep deprivation; reproducibility and durable handoffs should enable stopping and resuming.

## 8. Specific recommended formal amendment sequence (future cohorts only)
1. Review this report and PR36 as a method *proposal*, not as launch-authorizing code.
2. Add a **small prospective one-shot** amendment to Plan §§0, 9.2, 11.2/11.3, 20.4/20.5 and implementation-log §§1, 23, 25/26: clear A/B/C/D uses; exact vs measured tolerance; lightweight logs; timeboxes; and version/hash references.
3. Perform bounded synthetic stress/sensitivity analysis using preregistered uniform/time-correlated/high-delay missingness scenarios; include separate billable-balance reconciliation. Select a threshold (or no numeric threshold, only B observed-only) *before* new cohort and protected outcomes.
4. Add tests that confirm A cannot be awarded with unknown denominator, forged credits, mismatched physical identities, inappropriate future feature, missing signed custody; B retains valid observed rows but prevents official ranking.
5. Freeze the amended protocol + code/manifest + approvals for a **later** cohort. Keep P2G06/P2G22/P2G24 historic states and P25 original frozen rule. If unavoidable source truth unavailable, preserve UNKNOWN and move on with restricted claims.

## 9. External sources and exactly what they do/do not establish
**[R1]** Google SRE Book, *Embracing Risk* / Introduction. 100% reliability usually not practical target; product-specific error budgets balance velocity. Applies to infrastructure, **not statistical selection-bias certification**. https://sre.google/sre-book/embracing-risk/ and https://sre.google/sre-book/introduction/

**[R2]** Google SRE Workbook, *Example Error Budget Policy* (2018). A service level objective and 1–SLO allowance may guide engineering prioritization; project must choose its own. https://sre.google/workbook/error-budget-policy/

**[R3]** NIST/SEMATECH Engineering Statistics Handbook, *Selecting Sample Sizes*, §3.3.3.3. Precision/cost/sample-size tradeoffs are decision specific; no universal n or percentage. https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc333.htm

**[R4]** AeroDataBox, *Flight Alert API: Guide to the New System* (updated 2026-01-31). Charged on SEND per flight item, even when endpoint down; provider retries charged and distinct from local health polls. https://aerodatabox.com/flight-alert-api-2026/

**[R5]** Sterne et al., BMJ 2009, *Multiple imputation for missing data ... potential and pitfalls*. Missingness threatens bias; imputation and complete-case are context-specific, not automatically safe. https://www.bmj.com/content/338/bmj.b2393

**[R6]** National Research Council, 2010, *The Prevention and Treatment of Missing Data in Clinical Trials*, Recommendation 15. Examine conclusions under varying missing-data assumptions. Medical-trial domain differs from aviation; principle transfers, not numeric cutoff. https://www.nationalacademies.org/read/12955/chapter/7

**[R7]** STROBE 2007, *Strengthening the Reporting of Observational Studies*. Report missingness by variable and relevant sensitivity analysis; observational reporting framework, not aviational certification. https://pmc.ncbi.nlm.nih.gov/articles/PMC2034723/

**[R8]** Amazon/AWS, *Timeouts, retries, and backoff with jitter* (2026 edition). Bounded retry and backoff recover transient failures but can amplify overload, especially at multiple layers. https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter%20%C2%B7%20Like%20%C2%B7%20Reply.%201%20Reaction.%20See%20more%20...

**[R9]** scikit-learn, *TimeSeriesSplit* and cross-validation documentation. Avoid train-on-future/test-on-past bias and leakage. https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html and https://scikit-learn.org/stable/modules/cross_validation.html

**[R10]** Stempfle et al., ICML 2025, *Prediction models that learn to avoid missing values*. Demonstrates modern ML methods for missing features; does not recover unseen labels or validate cost-gap tolerance. https://proceedings.mlr.press/v267/stempfle25a.html

**[R11]** UC Berkeley School of Information, 2025 project, *Air Travel Delay Prediction Feature Engineering and ML Approaches*. Domain-specific educational example of missing-feature processing and time-aware validation. Not a binding standard for our dataset. https://www.ischool.berkeley.edu/projects/2025/air-travel-delay-prediction-feature-engineering-and-ml-approaches

**[R12]** TRIPOD+AI, BMJ 2024, prediction model transparency and validation reporting checklist. Clinical prediction domain; relevant as reporting discipline, not aviation-specific required compliance. https://www.bmj.com/content/385/bmj-2023-078378

## 10. End-of-session checkpoint and handoff
- **Executed:** Read original Plan and Log with source SHA, PR35/PR36 metadata, original release matrix; web-verified 12 scientific/engineering/provider sources; authored this review as documentation-only on PR36 branch. No baseline/production code/DB/provider/payment mutations in this review.
- **Operator-provided observed:** historical budget eligible *for quarantine preview only*; rehearsal started *without finish evidence*.
- **Not executed:** historical OPEN→MISMATCH `--apply`; P25 AUTH financial ledger consent; release merge or Replit publication; fresh post-publish webhook receipt; live provider balance/safety read; paid preflight; paid 120min YSSY.
- **Next exact independent read:** Obtain guarded quarantine write consent separately from new financial AUTH; verify status post-write; compare PR35 actual HEAD/deployed matching source and required workflow; obtain signed callback evidence; run real protected preflight. **HOLD** until proof.
- **Research next:** Review user agreement; implement *prospective* changes only after future-cohort numerical/sensitivity checks. Preserve no-backdating and no automatic paid action.
