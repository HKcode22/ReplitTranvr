# Phase 5 — Stop numbering stages; finish the actual collection-release requirements

**Decision/checkpoint: 2026-11-07 Pacific / 2026-11-08 UTC.** Intended audience: project owner, future engineering sessions, independent scientific release reviewer.

**Purpose:** the user asked why there appear to be 31+ "stages", how long Phase 5 must remain open, whether our f.8 plan is overengineered, and how to reach Phase 6 responsibly without endless review. This file is an **operational scope-control document**, not an automatic override of normative f.8 or a scientifically unsupported GO. It is intentionally the **last ad hoc Stage-N milestone index**. Subsequent engineering PRs should name the actual deliverable/defect rather than inventing Stage32/33.

## 1. The three numbering systems are different

| Identifier | What it counts | Scientific status |
| --- | --- | --- |
| **Phase 0 → Phase 7** | Project lifecycle and research/implementation sequence in f.8 §17 | Normative plan structure |
| **Gate 0, P, 1, 2, 3, 0.5, 4, 5** | Specific safety/provenance/scientific release dependencies in f.8 §16 | Actual gate criteria; not every filename is a new gate |
| **Engineering Stage1–31** | Our incremental code patches, database migrations, tests and checkpoints written while debugging Phase 5 | **NOT** a promised number of scientific stages; there is no required "Stage32" or known terminal stage count |
| **31 batch-days** | The actual **Phase 6** experimental collection design (`run_day_index=1..31`) | Not Phase5 duration, not Stage31, and not necessarily 31 consecutive calendar dates |

The exact March/July start or completion date is NOT established from stage numbers. We cannot honestly promise a future Phase5 finish time from passing database role tests; the source-rights and prospective data-path blockers must be resolved first. Once collection is authorized, f.8 §8.7's ≥24h repeated-airport washout can extend 31 batch-days beyond 31 calendar dates.

## 2. Authenticated current status — genuinely finished

As observed **directly in GitHub Actions run [42438676554](https://github.com/HKcode22/ReplitTranvr/actions/runs/42438676554)**, Nov 8 `02:28:41Z`, main SHA `2641bd54b5840f2f0214a61fe27c22051e9c84d3`:

`P5_STAGE31_THREE_NONPAID_GITHUB_WORKERS_LIVE_READONLY_VERIFIED`

- Independent `PREPARE`, `PRE`, `T24_WITNESS`: all three have `roleSessionVerified=true`, `readOnlyTransactionVerified=true`, exactly their source-pinned PostgreSQL `NOLOGIN` group; GitHub Actions secrets authenticated on real `neondb` PG16.
- **Production database installed:** Stage23 V0079/V0080/V0081 8 tables; Stage27 four dedicated `NOLOGIN` groups; Stage30 three nonpaid dedicated `LOGIN` roles with one `SET TRUE, INHERIT FALSE, ADMIN FALSE` membership each, and three encrypted GitHub Actions secrets. Stage31 used them successfully.
- **Working code rehearsal:** Stage29 `source original → prospective T24 PRE COMMIT → separate T24 witness COMMIT` using real PostgreSQL functions + Stage28 role adapter, but its source bytes/draw/prearm were **synthetic in disposable CI**.
- **NOT yet done:** paid FIDS source LOGIN/secret or producer, real future selection and selected flight T/three PRE, authentic physical operating-leg/actual-only outcomes, POST and receiver evidence, frozen 31-batch-day calendar, signed primary endpoint, budget, provider ML Contents rights. Thus `sourceRightsCertified=false`, `phase5FreezePassed=false`, `phase6PaidGo=false`.

**Never re-run** the successful Stage23, Stage26/27, Stage30 or Stage31 commissioning just because a conversation restarted. All prior owner-command results and merged hashes are in [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## 3. Phase 5 has FOUR exit deliverables — no more arbitrary implementation stage count

### A. Valid, legally usable prediction experiment

The frozen protocol needs an identifiable first provider-native scheduled T, accurate operating-leg vs marketing/ambiguous membership, cutoff-safe feature availability, an explicit **provider-observable schedule-change proxy versus confirmed actual physical-outcome** distinction, and an admissible source Content retention/use/expiry/backup policy. Never turn `Unknown` into confirmed physical departure, or schedule revision into actual wheels-off. Source-use/legal case [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) is genuinely OPEN. Historical RapidAPI Team Ultra / 60k entitlement was already recorded; do not repeat plan/account/email inquiries. **Subscription API quota is not a long-term normalized per-flight Contents/ML license.**

Minimum final evidence: target and selection definitions, first native T evidence, admissible Contents usage/TTL, field/clock contract, cancellation/unknown/censoring codes, and date/hash/version. If actual runway metrics cannot be authenticated, an **explicit prospective narrower primary claim** about *provider-reported schedule changes/cancellations* is scientifically defensible; it is a **different endpoint**, not a false Gate0.5 runway PASS. Any such change requires a superseding dated plan/analysis/model-contract amendment **before** any relevant prospective data is inspected.

### B. Actual GitHub-only future source → three PREs → independent witness → POST

Fix the live P0 [early-selection issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416): `adbCollectionController_v3.ts::startBatch()` cannot first select four airports **at service start** if T−24h FIDS acquisition needed those airports earlier. Produce and durably bind an immutable preselected four-airport set, first provider-native T, source request/cutoff grid, account-hash and budget categories before the earliest per-flight cutoff. GitHub's restricted source producer must make legitimate **physical** FIDS GETs with V0079/V0080 reservations and V0077 immutable original response binding, then three separate real DB-clock PRE horizon commits plus V0081 independent T24 witness and late-slot inheritance. Receiver/POST outcomes must distinguish observed, censored, missing, not applicable, and ambiguous; no fabricated earlier PRE or outcomes from silence.

Minimum final evidence: one prospectively preselected and independently audited representative real cohort, timing and cutoff checks at all three horizons, accounted paid source attempts, verified raw→normalized/operating identity and fallback/STOP, true conditional expected/created/missing counters, and same-cohort POST or honest pending/censoring status. **A one-airport pilot alone cannot prove a 31-batch-day sampling calendar.** Missingness is measurable; missing science is never called 100% success.

### C. One actual calendar, resource envelope and STOP owner

Use frozen actual dates, UTC/local conversion, 31 batch-day shape, four airports per day, five valid matched crossover pairs, split-gap exclusion, >=24h washout, and committed early airport selection. Materialize **all seven REST/FIDS category caps** from the *actual source refresh grid*, including physical retries and crossover child segments; separately reserve/protect Alert credit `1900` maximum per budget-day and settlement margin. Prove no source body/flight value after predicted cutoff becomes a feature. Include live reviewed provider account units/rate/refresh and final receiver version, retention, raw-before-2xx and genuine stop/recovery logic.

Minimum final evidence: feasible hash-frozen real calendar or formal `UNSAT` with evidence; no silent `UNSAT` relaxation, executable source/budget/scheduler gate and one independent STOP path. If actual costs make f.8 infeasible, amend the protocol **prospectively** and rerun math; do not switch date/window shape secretly.

### D. Exactly one independent Phase5 FREEZE verdict and separate Phase6 start

An independent read-only review checks A–C against genuine source and authenticated PG/GitHub evidence. Freeze the versioned protocol, executable manifest, normalized/feature/label code hashes, split-assignment **rule** (not nonexistent future test row IDs), rights/expiry, endpoints, calendar and ceilings. Issue one `PASS` or explicit `HOLD` with exact owners. The **paid Phase6 start is a separate permission**, not the implication of a green CI suite or a new Stage number.

## 4. What can be DEFERRED without scientific deception?

The original f.8 §17.1 includes much more than a simple flight population study: five matched *window-shape* crossover pairs, a POST airborne model, multi-engine analysis and covariates. We authored that plan; a justified **prospective amendment is possible**, but it changes what we can claim.

- Already explicitly deferred/not necessary to start first-cycle collection per f.8: Engine E/event regime expansion, GNN/advanced conformal, marginal optimization, some derived weather/ATC/storm composites when the named source is unavailable (store `NULL` with missingness/source provenance).
- Model fitting, post-run evaluation and test **row IDs** belong after actual Phase6 collection, not tasks to fully finish in Phase5. The **split rule and source/feature code** must be frozen before first sample.
- Original plan's **five matched crossover pairs are exploratory**, not a well-powered confirmatory shape-effect study. The pairs actually test **TWO DIFFERENT contrasts**: `n=3` compares 4h versus 2×2h; `n=2` compares 4h versus up-to-6h. In a standard exact two-sided sharp-null sign/permutation randomization test under independent fair within-pair order assignments, there are `2^n` possible assignments. Even the extreme all-same-direction result has minimum two-sided p-value `2/2^3=0.25` for the three split pairs and `2/2^2=0.50` for the two longer-window pairs (no ties; smallest nonzero two-sided tail). **Neither can give p<0.05.** Even hypothetical pooled *homogeneous* five pairs would have minimum `2/2^5=0.0625`, but pooling these distinct interventions as one effect is NOT justified without a specifically defined estimand/model. These values are mathematical limits on that exact test, **not** empirical evidence that the window shapes are equivalent or ineffective. Treat them as feasibility/missingness pilot contrasts; a stronger later study would need more independent pairs.
- **Potential scope option if hard calendar/cost infeasibility is proven:** replace the exploratory window-shape crossover objective with a uniform `31 × 4h` operational data-acquisition pilot and explicitly defer paired-treatment analyses. The original full-length maximum exposure is `26×4 + 3×(2×2) + 2×6 = 128h`; the uniform alternative is `31×4=124h` (only `4h` less, a **3.125% reduction in maximum exposure-hours**, not proof of equivalent REST requests, actual Alert credits or sample size). **This would be a MATERIAL protocol amendment**, invalidates original hard 26/3/2 + five pairs, requires new scheduler, unit-budget and manifest proof and loses the paired window-shape estimand. It is NOT automatically approved and is NOT assumed faster merely because it is conceptually simpler.
- **Deferring a true runway-defined target** to a confirmed secondary analysis is another material change if we choose a source-observable schedule-change primary target instead. It must preregister the exact endpoint/labels/forecast claim and preserve unknown/censored/late/ambiguous status. It does NOT permit representing revised times as physical departures or bypassing lawful source use.

**Recommended course now:** keep existing f.8 26/3/2 treatment plan if an actual complete valid solver-generated calendar and bounded budget can be frozen without material delay; don't throw away already implemented structural guards. First make A/B genuine and determine real feasibility. If hard calendar or actual provider limits block the launch, use a dated, independently reviewed *f.8 prospective scope amendment* focused on lawful provider-observable disruption forecasting. Don't mutate the protected implementation log or silently rewrite past aims.

## 4a. One concrete P0 timing correction made during this scope audit

A genuinely mathematical issue was found in the *existing* source code: `phase6SamplingDecision_v39.ts::violates24hWashout` compared **the start of the last service window** to **the start of the next**. But binding f.8 §8.7 requires at least 24h from the **previous window END to the next START**. The older test could mistakenly admit Monday 08:00–12:00 followed by Tuesday 08:00: `24h` start-to-start, but only `20h` after the prior end.

The narrow source patch replaces that formula with `next_start - previous_frozen_planned_end >= 24h`; missing/unverified prior end returns HOLD instead of silently PASS. The existing [early immutable draw owner](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) now JOINs the previous selected run day against the **same frozen calendar hash and actual prior scheduled start**, deriving the prior end before applying the day sampler. This uses the conservative *planned* end even if a live window ended early: it can overblock but cannot falsely meet washout by assuming an early stop. All four selected airports still use the single DB-clock early selection timestamp.

A second cross-file inconsistency was also identified: the current production controller `adbCollectionController_v3.ts::segmentTemplates` executes `2h active + 1h gap + 2h active` for `2x2h`. The f.8 structural guard formerly admitted any positive gap, meaning a 2h-gap manifest could pass the validator while the controller actually ran a 1h gap and the early owner computed a different end. **Before first Phase6 FREEZE**, restrict the executable split-gap treatment to **exactly 60 minutes** (a permitted prospectively fixed gap, not a retrospective rewrite). The revised `phase5F8CrossoverCalendarFreezeGuard_v39.mjs` rejects any other gap. This is a conservative, single executable shape; changing it later requires an explicit versioned plan/controller/segment/clock amendment, not a silent calendar substitution. The sample estimand stays exploratory and the parent 2×2 treatment day remains one randomized unit.

**New focused tests** check Monday→Tuesday 20h failure, exactly 24h PASS, missing/malformed previous end HOLD, and a valid 2h+2h pair with an unexecutable 2h split gap HOLD. These are real scientific correctness guards, not another numbered release stage. They must pass exact-head Node/TypeScript + PG16 checks before merge. The choice of a fixed 60-minute split gap must appear in the final frozen manifest; it does NOT itself certify the missing real source/POST, budget or legal-use evidence.

## 5. Technical owner's shortest critical path (not a time estimate)

1. **DONE**: independent three real GitHub→PG read-only worker identities. Stop credential/schema churn.
2. **NOW**: implement the missing GitHub **early frozen draw + authentic source owner and full PRE/POST orchestrator** (existing modules are staged but not a running scheduled producer). Parallelize actual rights/label/receiver source-evidence review **without** repeated account-plan discovery.
3. **THEN**: demonstrate one real future cohort, independently audit timing/missingness and the source receipt, and freeze an admissible calendar + budgets + purpose/retention/endpoint.
4. **FINALLY**: a single true Phase5 FREEZE review and separate paid Phase6 launch. Let Phase6 perform the 31-batch-day collection; do **not** require a second 31-day Phase5 rehearsal.

Each item advances the experiment; no more 'Stage32' for isolated boilerplate. Engineering can proceed nonpaid while external source-use/actual T remains unresolved, but neither user approval to spend nor historical quota lifts those other gates.

## 6. How to read the code

[Start Here glossary](PHASE5_START_HERE_FREEZE_FIDS_PILOT_GLOSSARY_20261107.md) defines FIDS, T, PRE, POST and scientific freeze. [Section B deep code lab](PHASE5_SECTION_B_DEEP_CODE_LAB_LINE_BY_LINE_20261107.md) teaches real TypeScript/SQL functions. [Stage31 read-only handshake](2026-11-07_STAGE31_REAL_GITHUB_NONPAID_WORKERS_READONLY_HANDSHAKE.md) shows the actual `session_user`→`current_user` and `BEGIN READ ONLY` proof. The implementation stage label is just a commit history namespace, not something the scientist must memorize.
