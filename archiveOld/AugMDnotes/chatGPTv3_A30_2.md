Yes. I re-checked the prompt against the current V3.9 plan, #70, and the actual structure/content of your `IMPLEMENTATION_LOG.md`.

There were several things worth strengthening rather than deleting. In particular, the existing log already contains valuable teaching sections, code explanations, run-history recovery, financial records, change history, and archived prior instructions; those should remain and be expanded, not replaced.  It also currently delegates the “full” code walkthrough to `CODE_WALKTHROUGH.md`, which is not enough for what you are asking—the critical implementation explanation needs to be inside `IMPLEMENTATION_LOG.md` itself.  And the old sentence saying `flight_data_pre_post` is the only “true data table” is definitely stale now that V3.9 has first-class population, event, snapshot, trajectory, outcome, and historical-feature layers. 

I also fixed a problem in my previous prompt: I had created another “Phase 0–8” audit roadmap on top of your real V3.9 Phases 0–7. That could create more confusion. This version **never renumbers your real phases**; audit/repair work is called **Workstreams A–I**.

I have also added things I had not made strict enough before: exact code-location maps, per-function explanations, schema/data dictionaries, environment-variable registry, dependency/runtime versions, Git commit/hash tracking, run-report structure, testing matrix, migration/idempotency testing, baseline-vs-new TypeScript errors, secret-redaction rules, Definition of Done, status vocabulary, requirement→code→test→evidence traceability, daily Phase-6 records, model-evaluation records, recovery procedures, and a rule that the implementation log cannot outsource essential explanations to another file.

**Use the following as the replacement for all earlier versions of the prompt. Do not combine it with an older shorter version.**

# FINAL MASTER V3.9 PRE-FREEZE AUDIT, IMPLEMENTATION, DOCUMENTATION, AND IMPLEMENTATION-LOG PROMPT

You are performing the **FINAL PRE-FREEZE AUDIT, PATCH, IMPLEMENTATION, VERIFICATION, AND DOCUMENTATION** of the existing V3.9 aviation PRE-DEPARTURE + AIRBORNE/POST data-collection experiment.

This prompt supersedes earlier audit prompts.

This is **NOT another theoretical redesign**.

The architecture has already undergone repeated review against SJSU, SDSU, FAA, broader peer-reviewed aviation research, sampling/statistical principles, and AeroDataBox provider constraints.

Your job is now to:

1. inspect the real repository;
2. reconcile the binding V3.9 specification with the actual implementation;
3. resolve every remaining collection-affecting or primary-evaluation-affecting ambiguity;
4. implement the required fixes;
5. test them;
6. document exactly what happened;
7. run/record the required preflight gates when execution is authorized and technically available;
8. freeze the final manifest;
9. produce an auditable GO/NO-GO determination for Phase 6;
10. stop theoretical redesign after the requirements below are satisfied.

---

# 0. FILES AND SOURCES THAT MUST BE AUDITED

At minimum inspect:

* `V3.9_DataCollectPlan.md`
* **ONLY PART 1 (§1–§22) is normative**
* `IMPLEMENTATION_LOG.md`
* the original #70 / 77-item audit checklist
* the complete actual source-code repository
* `package.json`
* lock file (`package-lock.json`, `pnpm-lock.yaml`, etc.)
* TypeScript configuration
* runtime/environment configuration
* database boot/migration registration
* every migration relevant to V3.9
* shared schema/types
* AeroDataBox client/wrapper code
* coverage code
* sampling-frame builder
* airport catalog/reference data
* collection controller
* scheduler
* crossover code
* anchor-probe code
* credit-canary code
* webhook routes
* webhook extractor
* raw event store
* current-state store
* flight population/FIDS builder
* snapshot builder
* outcome builder
* airborne event/time-series code
* trajectory builder
* historical feature-store implementation
* weather ingestion/join code
* diagnostics
* export/reporting scripts
* evaluation split builder
* baseline/XGBoost configuration
* manifest writer
* tests
* run logs
* `AugMDnotes/rl*.md`
* relevant historical run reports
* `CODE_WALKTHROUGH.md` if it exists
* any other file discovered to participate in the collection/evaluation pipeline.

Do not assume this list is exhaustive.

Perform repository-wide search to discover additional producers, consumers, old paths, duplicate implementations, deprecated code, hidden defaults, legacy environment variables and stale schemas.

---

# 1. SOURCE-OF-TRUTH HIERARCHY

Use this hierarchy.

## 1.1 Scientific/methodological source of truth

`V3.9_DataCollectPlan.md` PART 1 (§1–§22)

However, if PART 1 contains a genuine internal contradiction or an unresolved pre-freeze requirement documented in this prompt, resolve it explicitly and patch PART 1.

Never silently choose one conflicting rule.

## 1.2 Implementation truth

The actual executable repository.

Do not claim that a rule is implemented merely because `IMPLEMENTATION_LOG.md` says it is.

Inspect the code.

## 1.3 Execution truth

Actual command output, database state, API responses, run artifacts, logs and gate results.

Do not claim a gate passed because code for the gate exists.

## 1.4 Documentation truth

`IMPLEMENTATION_LOG.md` must accurately explain the other three layers.

Documentation never overrides actual scientific requirements or executable behavior.

## 1.5 Historical material

PART 2 of the V3.9 plan, old ChatGPT/CGT analyses, archived strategies and old implementation-log entries are historical evidence only.

They may explain why a decision was made.

They may **not** silently override current PART 1.

---

# 2. ABSOLUTE VERSIONING RULE

DO NOT create:

* V3.10
* V3.11
* V3.12
* another conceptual architecture version.

Patch and finish V3.9.

Do not restart theoretical review after the final preflight is green.

If an actual provider limitation makes an existing requirement technically impossible, create a formal issue and adjudication entry inside V3.9 rather than inventing a new architecture version.

---

# 3. SAFETY / LIVE-EXECUTION RULE

`ADB_AUTO_COLLECT=false` must remain in force while auditing, patching and testing unless the exact authorized step explicitly requires a controlled live preflight operation.

Never start Phase 6 automatically.

Never start the 31-day scientific run merely because code compilation/tests pass.

Controlled preflight calls such as a canary or anchor probe may only run:

* in the correct gate order;
* under the existing cost/budget protections;
* with live access available;
* when the current task actually authorizes execution.

If execution cannot be performed, do not fabricate a PASS.

Record:

`IMPLEMENTED — LIVE VERIFICATION PENDING`

rather than `PASSED`.

---

# 4. CREDENTIAL / SECRET POLICY

`IMPLEMENTATION_LOG.md`, run reports and generated artifacts must NEVER contain raw secrets.

Do not write:

* API keys;
* RapidAPI keys;
* database passwords;
* webhook secrets;
* access tokens;
* private credentials;
* full authentication headers.

Environment-variable documentation may record:

* variable name;
* purpose;
* whether it is SET/UNSET;
* whether it is required;
* source code that reads it;
* expected type/range;
* whether it is frozen.

Never record the secret value itself.

If old logs contain secrets, flag them for secure remediation rather than repeating them.

---

# 5. NON-NEGOTIABLE SCIENTIFIC ARCHITECTURE

Do NOT reopen or redesign these principles unless real provider evidence proves implementation impossible.

1. Provider-supported measured universe → feed-eligible sampling frame.
2. Zero yield does NOT imply that an airport does not exist.
3. FIDS/provider population defines the prediction denominator; webhook capture does not.
4. Snapshot existence is population-defined, not post-event-defined.
5. Post-cutoff information supplies labels only and cannot leak into cutoff features.
6. Information must actually have been available to our system by the prediction cutoff.
7. Immutable raw provenance must be preserved.
8. `flight_events` remains a first-class research representation.
9. Current/latest flight state must never be the only research representation.
10. PRE_DEPARTURE and AIRBORNE are separate modeling populations.
11. Preserve every usable airborne observation required to reconstruct trajectories.
12. Never destructively replace airborne time series with latest-location state.
13. Same-aircraft/previous-leg information remains a first-class delay-propagation feature.
14. No automatic flight-row `1/p` weighting.
15. REGIONAL adaptation remains bounded and explicitly efficiency-oriented.
16. Adaptive REGIONAL allocation is NOT claimed to preserve population representation.
17. Anchor live yield remains a minority component of anchor selection.
18. GNN remains a later hypothesis, not the default first model.
19. Month 1 remains an early operational pilot.
20. Thirty-one days is NOT seasonal validation.
21. Do not claim population representativeness before validating the provider-observable population layer.
22. No REST-based airborne supplementation before Gate-0.5 cadence measurement.
23. No post-cutoff schedule/status/destination revisions in prediction features.
24. No silent weather backfill from later/revised truth.
25. No foreign billable subscription during experimental collection.
26. No “window ended = missing outcome” shortcut.
27. No manual expensive Rescore/Simulate actions during the scientific run.
28. No Phase-6 run until all required preflight gates and final FREEZE pass.
29. Experimental spendable Flight-Alert envelope remains 57,900 credits unless verified account facts require an explicit pre-run correction.
30. Protected credit floor remains separate from the REST/API-unit budget.
31. `maxDeliveryRetries=0` remains the experimental policy unless the binding plan is explicitly adjudicated before collection.
32. The final primary test cannot be used to tune collection policy, features, models or endpoints.

---

# 6. RESEARCH ATTRIBUTION RULES

Use research accurately.

## SDSU / Chen & Li

Use Chen & Li, SDSU/AIAA SciTech 2019 for support regarding:

* previous-leg delay;
* late-arriving aircraft;
* same-aircraft chained prediction;
* aircraft itinerary/rotation propagation.

Do not claim the paper proves our numerical sampling constants.

## SJSU Zheng / Wei / Hu 2021

Use for:

* delay propagation;
* effect of previous delays;
* buffer/turnaround effects;
* weather effects;
* aircraft utilization;
* stronger propagation along later legs.

## SJSU #4774

Use for:

* AIRBORNE prediction;
* trajectory reconstruction;
* latitude/longitude/speed/time trajectory sequences;
* online ETA/landing-time prediction.

Do NOT use #4774 as the primary citation for same-tail downstream-flight propagation.

## SJSU #4935

Use as evidence that graph/network modeling of flight-delay dynamics is scientifically defensible.

Do NOT claim it proves a GNN will beat XGBoost in this project.

## Transportation Research Part E 2024 review

Use for:

* delay-propagation taxonomy;
* flight-chain perspective;
* airport-network perspective;
* broader methodological landscape.

## FAA ASPM

Use for operational milestone semantics:

* Gate Out;
* Wheels Off;
* Wheels On;
* Gate In.

## AeroDataBox documentation

Use only for provider/API behavior and field semantics.

Do NOT present provider implementation details as scientific aviation laws.

## Project-specific choices

Do NOT claim SJSU/SDSU proved:

* five anchors;
* 60 rows/hour;
* 40/20/20/20 anchor weighting;
* `{HUB:1,MID:2,REGIONAL:1}`;
* 4-hour default;
* 1,900 credits/day;
* particular adaptive bounds.

Those are predeclared V3.9 engineering/experimental design choices.

---

# 7. STATUS VOCABULARY — USE EXACTLY

Do not use vague “done.”

Every requirement/component must have one of these statuses:

### DOCUMENTED

Rule exists in binding documentation.

### IMPLEMENTED

Executable code/schema implementing the rule exists.

### UNIT-TESTED

Relevant deterministic tests pass.

### INTEGRATION-TESTED

Cross-component behavior passes.

### LIVE-VERIFIED

Actual provider/account/database execution verified the behavior.

### FROZEN

All required values/version/hash/seed are written into the final manifest and may no longer adapt using Phase-6 outcomes.

### DEFERRED

Formally classified downstream analysis item with a documented freeze deadline.

### BLOCKED

Cannot proceed because a required dependency is unresolved.

### SUPERSEDED

Historical behavior/entry retained for audit but no longer governs.

Do not collapse these statuses.

Example:

`IMPLEMENTED` does not mean `LIVE-VERIFIED`.

`LIVE-VERIFIED` does not mean `FROZEN`.

---

# 8. DEFINITION OF DONE FOR EVERY TASK

A task is NOT complete until all applicable items are recorded:

1. requirement identified;
2. existing behavior inspected;
3. conflict/gap documented;
4. chosen resolution documented;
5. PART 1 patched if normative rule changed/clarified;
6. code changed;
7. schema/migration changed if necessary;
8. relevant tests created/updated;
9. tests executed;
10. result recorded;
11. related docs synchronized;
12. implementation-log entry completed;
13. artifact/hash recorded;
14. unresolved dependency checked;
15. status assigned correctly;
16. manifest implication recorded;
17. no new contradiction introduced.

---

# 9. #70 / 77-ITEM CLASSIFICATION SYSTEM

For EACH of the 77 original #70 checklist items, assign exactly one category.

## A — ALREADY SATISFIED

PART 1 + real executable code already define and implement it consistently.

Evidence is required.

## B — PHASE-6 BLOCKER

It affects:

* what gets collected;
* which airports/flights enter the population;
* sampling probabilities/allocation;
* labels;
* leakage protection;
* irrecoverable provenance;
* primary scientific endpoint;
* primary evaluation/test protection.

It MUST be resolved before Phase 6.

## C — PRE-RUN MEASURE → FREEZE

The value should not be guessed.

A named gate/canary/probe measures it before Phase 6.

Then the result is frozen.

## D — FORMALLY DEFERRED ANALYSIS ITEM

It cannot alter collection or the precommitted primary claim.

Record exactly:

* why it is safe to defer;
* when it must be specified;
* what information may NOT be viewed before specification.

Do NOT treat all 77 items as equivalent defects.

Before Phase 6:

`unresolved B count = 0`

and all required C values must have completed their freeze procedure.

---

# 10. IMPLEMENTATION-LOG REQUIREMENT — FIRST-CLASS DELIVERABLE

`IMPLEMENTATION_LOG.md` is NOT an informal notebook.

It is a **first-class research implementation record, technical manual, audit trail, teaching document, reproducibility guide and operations runbook**.

It must be updated continuously.

It must become detailed enough that a technically capable person who did not participate in the project can answer:

* What are we trying to do?
* Why?
* What phase are we in?
* What exactly happens next?
* Where does that happen in code?
* Which function performs it?
* Which database table stores it?
* Which configuration controls it?
* Which scientific rule requires it?
* Which test proves it?
* Which real run verified it?
* How much did it cost?
* What failed previously?
* How was it fixed?
* What is frozen?
* What is still pending?
* How do I reproduce it?
* What must never be changed?

No essential implementation explanation may exist **only** in `CODE_WALKTHROUGH.md`.

`CODE_WALKTHROUGH.md` may remain supplemental.

The critical implementation information must also exist directly in `IMPLEMENTATION_LOG.md`.

---

# 11. PRESERVE THE EXISTING IMPLEMENTATION LOG

Do not delete or shorten useful existing material.

Preserve and update the current concepts including:

* current status;
* one-sentence status;
* status board;
* next ordered command list;
* Part-1 section-by-section explanation;
* real V3.9 phase walkthrough;
* statistics/probability teaching;
* glossary;
* table/schema teaching;
* code explanation;
* shell/history recovery;
* money/date/credit ledger;
* run-report analyses;
* change log;
* archive;
* historical run notes;
* explanations of prior failures.

Historical errors must remain visible.

If something is wrong:

`old entry → SUPERSEDED`

then append a correction.

Do not rewrite history to make the project appear cleaner.

---

# 12. DO NOT CREATE A SECOND PHASE NUMBERING SYSTEM

The real V3.9 phases remain:

* Phase 0 — code deltas / implementation preparation;
* Phase 1 — Gate 0;
* Phase 2 — Gates 1–2;
* Phase 3 — Gates 3–4 + Gate 0.5;
* Phase 4 — Gate 5;
* Phase 5 — FREEZE;
* Phase 6 — 31-day scientific run;
* Phase 7 — Month-1 deliverables/evaluation.

Do not invent “Phase 8” or another sequence.

For audit/repair activities use:

* Workstream A
* Workstream B
* Workstream C
* …
* Workstream I

Always write:

`Plan §X`

when referring to `V3.9_DataCollectPlan.md`.

Always write:

`Log §X`

when referring to `IMPLEMENTATION_LOG.md`.

This avoids cross-document section confusion.

---

# 13. REQUIRED IMPLEMENTATION-LOG MASTER STRUCTURE

Keep the existing sections and add/expand material so the log contains all of the following.

## CURRENT STATE

Must always be near the top.

Include:

* current real V3.9 phase;
* current gate;
* last completed step;
* last successful live verification;
* last failed verification;
* unresolved B count;
* unresolved C count;
* frozen values count;
* live credit balance if actually known;
* REST/API-unit state if actually known;
* `ADB_AUTO_COLLECT` state;
* Git commit SHA;
* DB migration level;
* manifest status;
* exact next permitted action;
* exact action that is currently prohibited.

Update after every work session.

## NEXT ACTIONS

One ordered list only.

No competing “next steps” lists.

Each item:

* step ID;
* prerequisite;
* exact command;
* expected side effects;
* whether it can cost API units/credits;
* expected output;
* PASS condition;
* FAIL response;
* implementation-log entry to update afterward.

Old next-step lists go into archive marked SUPERSEDED.

## V3.9 PART-1 WALKTHROUGH

Explain every §1–§22 section.

For every section state:

* rule;
* purpose;
* scientific rationale;
* implementation location;
* status;
* related tests;
* related manifest fields;
* unresolved issue if any.

## PHASE-BY-PHASE WALKTHROUGH

For every real Phase 0–7:

* objective;
* prerequisites;
* inputs;
* steps;
* code files;
* functions;
* DB tables;
* migrations;
* configuration;
* commands;
* API/provider interactions;
* outputs;
* generated artifacts;
* tests;
* gate requirements;
* failure conditions;
* rollback/recovery;
* Definition of Done;
* next-phase dependency.

## GATE-BY-GATE GUIDE

Separate detailed entry for:

* Gate 0;
* Gate 1;
* Gate 2;
* Gate 3;
* Gate 0.5;
* Gate 4;
* Gate 5;
* final FREEZE;
* final preflight.

## SCIENCE / STATISTICS TEACHING

Preserve and expand.

Use aviation examples, not unrelated analogies where avoidable.

Explain:

* population;
* sampling frame;
* strata;
* conditional probability;
* inclusion probability;
* why airport-layer probability ≠ flight-layer inclusion probability;
* censoring;
* missingness;
* leakage;
* randomization;
* blocking;
* crossover;
* bootstrapping;
* rolling-origin evaluation;
* calibration;
* Brier score;
* ECE;
* confidence/prediction intervals;
* causal-vs-associational wording;
* information/credit;
* marginal value;
* network degree;
* chain propagation;
* uncertainty.

Include formulas and define every symbol.

## GLOSSARY

Every technical term used in the project.

Include:

* plain-language meaning;
* formal meaning;
* where it appears in V3.9;
* where it appears in code;
* aviation example.

## DATABASE/TABLE GUIDE

Every research/operational table.

Do not claim `flight_data_pre_post` is the only true data table.

## CODE GUIDE

Detailed below.

## COMMAND GUIDE

Detailed below.

## CREDIT/BUDGET LEDGER

Maintain actual measurements separately from design limits.

## RUN REPORTS

Every meaningful run gets its own analysis.

## CHANGE HISTORY

Newest changes summarized while original entries remain auditable.

## ARCHIVE

Outdated instructions retained and clearly labeled SUPERSEDED.

---

# 14. IMPLEMENTATION-LOG ENTRY FORMAT

For every task/change, create an entry with at minimum:

1. Entry ID.
2. UTC date/time.
3. Local date/time if useful.
4. Git commit SHA before.
5. Git commit SHA after if committed.
6. Real V3.9 phase.
7. Gate.
8. Workstream.
9. #70 checklist item(s).
10. Plan section.
11. Requirement ID.
12. Human-readable title.
13. Problem.
14. Why it matters scientifically.
15. Why it matters operationally.
16. Why it matters for reproducibility.
17. Previous documented behavior.
18. Previous actual code behavior.
19. Intended final behavior.
20. Files inspected.
21. Files modified.
22. Functions/classes/modules modified.
23. Tables/columns/indexes/constraints modified.
24. Migration IDs.
25. Config/env variables involved.
26. External APIs involved.
27. Implementation approach.
28. Step-by-step code logic.
29. Representative before-code excerpt/pseudocode.
30. Representative after-code excerpt/pseudocode.
31. Inputs.
32. Outputs.
33. Side effects.
34. Data flow.
35. Timestamp semantics.
36. Units.
37. Provenance implications.
38. Sampling implications.
39. Population/denominator implications.
40. Label implications.
41. Leakage implications.
42. Evaluation implications.
43. Credit/API-unit implications.
44. Failure modes considered.
45. Recovery behavior.
46. Tests added/changed.
47. Commands executed.
48. Exit codes where available.
49. Expected result.
50. Observed result.
51. Raw artifact location.
52. Artifact hash.
53. Seed/version/hash affected.
54. A/B/C/D classification.
55. Reversibility.
56. Manifest fields affected.
57. Unresolved issues.
58. Next required action.
59. Final status.

Do not reduce this to vague prose.

---

# 15. UNIQUE RECORD IDS

Use consistent IDs.

Examples:

* `REQ-###` — requirement
* `LOG-YYYYMMDD-###` — implementation entry
* `DEC-###` — decision
* `ISS-###` — issue
* `GATE-0-###`
* `GATE-1-###`
* `GATE-2-###`
* `GATE-3-###`
* `GATE-05-###`
* `GATE-4-###`
* `GATE-5-###`
* `TEST-###`
* `RUN-###`
* `ART-###`
* `MANIFEST-###`

Trace these IDs across matrices.

---

# 16. CODE-LOCATION REQUIREMENT

For every major component write a **WHERE THIS LIVES** block.

Include:

* repository-relative file path;
* module;
* function/class;
* important helper functions;
* database table;
* migration;
* environment/config key;
* package script;
* test file;
* generated artifact;
* producer;
* consumer.

Prefer function/class names + Git commit SHA as stable identifiers.

Line ranges may be recorded for convenience, but do not rely only on line numbers because they move after edits.

---

# 17. CODE EXPLANATION REQUIREMENT

For every new or modified critical function explain:

1. function signature;
2. inputs;
3. input types;
4. output;
5. output type;
6. external state read;
7. external state written;
8. DB queries;
9. API calls;
10. validation;
11. branching logic;
12. error handling;
13. retry behavior;
14. timestamp behavior;
15. randomness/seed behavior;
16. provenance behavior;
17. cost behavior;
18. why each major branch exists;
19. what requirement it implements;
20. which test proves it.

Then provide:

### WHAT THE CODE SHOULD LOOK LIKE

Use a representative:

* TypeScript excerpt;
* pseudocode;
* SQL;
* function signature;
* data structure;
* query;
* validation rule.

Do not dump an entire huge source file unnecessarily.

The log must contain enough code to understand the critical algorithm and compare it against the repository.

---

# 18. REQUIRED COMPONENT-BY-COMPONENT CODE WALKTHROUGH

Provide the detailed code-location + explanation format for at least:

1. measured provider universe retrieval;
2. airport metadata ingestion;
3. traffic reference ingestion;
4. traffic-tier assignment;
5. region mapping;
6. PRE eligibility;
7. POST eligibility;
8. integrated/separate frame logic;
9. frame persistence;
10. future airport/window assignment;
11. UTC schedule;
12. local-time conversion;
13. DST handling;
14. T−24 scheduling;
15. T−6 scheduling;
16. T−90 scheduling;
17. FIDS query construction;
18. FIDS response preservation;
19. FIDS population membership;
20. flight-instance canonicalization;
21. codeshare canonicalization;
22. route identity;
23. tail identity;
24. webhook route;
25. webhook authentication without exposing secret;
26. payload validation;
27. extractor;
28. immutable raw envelope;
29. ingest ledger;
30. `flight_events`;
31. current operational state;
32. raw airborne events;
33. cleaned airborne points;
34. trajectory reconstruction;
35. PRE snapshot builder;
36. AIRBORNE snapshot builder;
37. target-specific outcomes;
38. censoring/grace;
39. four-timestamp availability contract;
40. provenance graph/linkage;
41. historical feature store;
42. weather observations;
43. weather forecasts;
44. weather joins;
45. anchor Stage 1;
46. anchor score;
47. yield-reference normalization;
48. stability;
49. capacity gate;
50. anchor Stage 2;
51. anchor lock;
52. HUB selection;
53. MID selection;
54. REGIONAL probability draw;
55. adaptive `m_i`;
56. zero-yield state machine;
57. coverage floor;
58. scheduler;
59. crossover randomization;
60. batch start;
61. subscription creation;
62. budget guard;
63. SOFT_STOP;
64. HARD_CAP;
65. delivery-failure stop;
66. credit reconciliation;
67. canary;
68. Gate-0 budget report;
69. Gate-1 coverage;
70. Gate-2 anchor probe;
71. Gate-3 canary;
72. Gate-0.5 payload/cadence inspection;
73. Gate-4 cap/reliability;
74. Gate-5 census validation;
75. manifest generation;
76. preflight lexical scan;
77. split-assignment rule;
78. final test materialization;
79. Model −1;
80. Model 1/XGBoost;
81. evaluation engines;
82. block bootstrap;
83. rolling-origin pilot;
84. collection-mechanism ablation;
85. staleness curves;
86. info-per-credit;
87. exports;
88. diagnostics.

---

# 19. REPOSITORY FILE MAP

Create a table:

| File | Role | Major functions | Reads | Writes | External API | DB objects | Config | Tests | Plan requirement | Status |

Include every relevant file.

Do not omit helper modules because they appear “small.”

---

# 20. REQUIREMENT → CODE TRACEABILITY

Create:

| Requirement ID | Plan section | #70 item | Code file | Function | Schema | Test | Live evidence | Manifest field | Status |

Every B and C item must appear.

---

# 21. CODE → REQUIREMENT REVERSE TRACEABILITY

Also create the reverse map:

| Critical function/module | Why it exists | Requirement(s) | Tests | Consumers |

This detects orphan code that is running but no longer belongs to V3.9.

---

# 22. DATABASE DATA DICTIONARY

For every first-class table document:

* table name;
* purpose;
* producer;
* consumer;
* primary key;
* unique keys;
* foreign keys;
* indexes;
* row unit;
* expected cardinality;
* append-only vs mutable;
* source of truth;
* retention;
* provenance relationship.

For every important column document:

* name;
* SQL type;
* nullable?;
* unit;
* semantics;
* source: provider / derived / our server / reference;
* timestamp type;
* availability rule;
* producer;
* consumers;
* missing-state meaning;
* QC rules.

Cover at minimum:

* `adb_sampling_frame`;
* `adb_anchor_probe`;
* `adb_collection_batches`;
* `adb_collection_subs`;
* `adb_collection_meta`;
* `adb_ingest_events`;
* raw webhook envelope/table;
* `flight_data_pre_post` if retained;
* `flight_events`;
* current-state table;
* `flight_population`;
* `flight_snapshots`;
* `flight_outcomes`;
* `raw_airborne_events`;
* `clean_airborne_points`;
* `flight_trajectory`;
* `flight_airborne_snapshots`;
* `historical_feature_store`;
* weather observations;
* weather forecasts;
* split/test-set metadata;
* manifest metadata.

---

# 23. DATA LINEAGE

Create a complete lineage diagram or text equivalent.

At minimum:

provider coverage/reference data
→ airport metadata
→ tier/region/eligibility
→ `adb_sampling_frame`
→ future collection template
→ scheduled T−24/T−6/T−90 FIDS calls
→ raw FIDS response
→ `flight_population`
→ webhook subscription
→ raw webhook envelope
→ `adb_ingest_events`
→ `flight_events`
→ current state
→ raw airborne observations
→ cleaned airborne points
→ trajectory
→ historical/as-of features
→ PRE snapshots
→ AIRBORNE snapshots
→ target-specific outcomes
→ frozen split rule
→ actual partitions
→ Model −1 / Model 1
→ Engines A/B/C/D/E/R/P/POST
→ metrics
→ information-per-credit/reporting.

For each arrow explain:

* key used;
* timing;
* producer;
* information-availability condition;
* whether one-to-one/one-to-many/many-to-one;
* provenance link.

---

# 24. ENVIRONMENT / CONFIGURATION REGISTRY

Document every relevant configuration setting.

Table:

| Variable/key | Purpose | Type | Default | Allowed range | Secret? | Read by | Frozen? | Manifest? | Validation |

Include at minimum:

* `ADB_AUTO_COLLECT`;
* monthly unit setting;
* batch budget;
* daily cap;
* SOFT_STOP margin;
* reserve;
* minimum batch;
* retries;
* UTC schedule seed;
* anchor seed;
* adaptive-sampling seed/state;
* crossover seed;
* split seed;
* traffic/reference versions;
* region version;
* thresholds;
* grace interval;
* cadence values.

Never print secret values.

---

# 25. RUNTIME / DEPENDENCY REPRODUCIBILITY

Record:

* Node version;
* npm/pnpm/yarn version;
* TypeScript version;
* database engine/version;
* important package versions;
* OS/runtime environment;
* timezone configuration;
* Git branch;
* Git commit SHA;
* lock-file hash;
* migration set/hash;
* schema version;
* relevant external API documentation date.

A future maintainer must be able to recreate the environment.

---

# 26. TYPECHECK / LINT / BASELINE-ERROR POLICY

If the repository already contains pre-existing errors, record a baseline.

Example:

`baseline TypeScript errors = 57`

Then every change must report:

* baseline count;
* post-change count;
* new errors attributable to this change;
* resolved errors.

Do NOT say:

`typecheck passed`

if it still has 57 errors.

Say:

`no new TypeScript errors relative to the recorded baseline`

when that is what actually happened.

Where possible, work toward zero, but do not silently mix unrelated technical-debt repair into the experiment unless necessary.

---

# 27. MIGRATION POLICY

For every migration document:

* migration number/name;
* tables affected;
* before schema;
* after schema;
* data migration behavior;
* idempotency;
* expected rerun behavior;
* clean-database behavior;
* existing-database behavior;
* downgrade/rollback possibility;
* destructive operations;
* validation queries.

Because prior migration-order/idempotency problems already occurred, explicitly test:

1. fresh database migration;
2. database already containing earlier V3.9 migrations;
3. re-running boot migrations;
4. both old/new-column edge states when a rename is involved.

---

# 28. TEST MATRIX

Create a master test table.

Categories:

* unit;
* integration;
* schema;
* migration;
* idempotency;
* API-contract;
* time-zone/DST;
* codeshare identity;
* dedup;
* provenance;
* leakage;
* timestamp ordering;
* population membership;
* censoring;
* trajectory;
* sampling probability;
* deterministic seeding;
* coverage floor;
* budget;
* credit reconciliation;
* SOFT_STOP;
* failure-stop;
* split integrity;
* no-future-feature;
* no same-flight POST partition leak;
* final-test protection.

Table:

| TEST ID | Requirement | Type | File | Command | Fixture/input | Expected | Observed | Status | Artifact |

---

# 29. COMMAND INDEX

Every project command must have documentation.

For each command:

* exact command;
* working directory;
* script/file invoked;
* prerequisites;
* environment requirements;
* whether it touches live provider/account;
* whether it can spend credits;
* whether it can spend REST/API units;
* DB side effects;
* files produced;
* expected console output;
* PASS indicators;
* FAIL indicators;
* recovery action;
* implementation-log section.

Include commands such as:

* health;
* gate0;
* coverage;
* build-catalog;
* canary;
* anchor-probe modes;
* cleanup;
* webhook check;
* migrations;
* dev boot;
* exports;
* diagnostics;
* test commands;
* typecheck;
* preflight;
* manifest creation;
* evaluation builder.

---

# 30. RUN REPORT FORMAT

Every meaningful execution gets a RUN record.

Record:

* RUN ID;
* date;
* UTC start/end;
* actual observed runtime if known;
* Git SHA;
* DB schema version;
* command;
* arguments;
* environment flags excluding secrets;
* balance before;
* API units before if known;
* active subscriptions before;
* expected result;
* raw output artifact;
* exit code;
* provider response count;
* DB rows;
* credits spent;
* API units spent;
* balance after;
* reconciliation;
* errors/warnings;
* PASS/FAIL;
* next action.

Keep raw run output in a durable artifact such as `rlN.md` or equivalent.

Then summarize it in `IMPLEMENTATION_LOG.md`.

Do not rely on ephemeral shell output.

---

# 31. PHASE-6 DAILY RECORD — WHEN PHASE 6 EVENTUALLY STARTS

For every scientific collection day document:

* run day;
* calendar date;
* UTC slot;
* window shape;
* requested duration;
* actual duration;
* stop reason;
* crossover group;
* treatment;
* template hash;
* airport set;
* tier of every airport;
* anchor;
* selection probability for randomized airports;
* coverage ages;
* seed;
* FIDS population calls;
* population counts;
* PRE snapshot counts by horizon;
* webhook notifications;
* notification items;
* unique physical flights;
* AIRBORNE observations;
* trajectory counts;
* label counts;
* missingness funnel;
* credits consumed;
* REST/API units;
* balance reconciliation;
* environmental context;
* cadence statistics;
* failures;
* anomalies;
* artifacts;
* hashes.

Never silently edit a previous day's record.

---

# 32. DECISION RECORD

Every scientific/engineering decision requires:

* DEC ID;
* question;
* alternatives;
* evidence;
* relevant research;
* provider constraints;
* statistical consequences;
* operational consequences;
* budget consequences;
* selected option;
* rejected options;
* reason for rejection;
* files affected;
* schema affected;
* tests;
* reversible?;
* freeze status.

---

# 33. ISSUE RECORD

Every unresolved issue requires:

* ISS ID;
* discovered date;
* discoverer/source;
* description;
* affected requirement;
* severity;
* B/C/D classification;
* collection impact;
* primary-evaluation impact;
* affected files;
* proposed resolution;
* owner/action;
* resolution evidence;
* closed date;
* final status.

An issue may not disappear from the log merely because code changed.

Close it explicitly.

---

# 34. GATE RECORD

For every gate record:

* gate name;
* purpose;
* scientific rationale;
* operational rationale;
* prerequisites;
* exact code path;
* exact command;
* provider/account requirements;
* inputs;
* expected output;
* PASS criterion;
* FAIL criterion;
* actual output;
* artifacts;
* hashes;
* cost;
* warnings;
* failures;
* remediation;
* rerun evidence;
* final status;
* freeze consequence;
* permitted next action.

A failed gate remains documented even after a later successful rerun.

---

# 35. CURRENT FAILED/PENDING HISTORY MUST NOT BE ERASED

Preserve the historical fact that the earlier Gate-3 canary failed and that the root cause was subsequently patched.

Do not retroactively label that failed run as PASS.

A later successful rerun gets a new RUN/GATE record.

Similarly, earlier WSSS probe results affected by the failed ingestion path must not silently become valid scientific evidence.

Mark them invalid/superseded with reason.

---

# 36. WORKSTREAMS FOR THE FINAL AUDIT

These are **not V3.9 phases**.

## Workstream A — Repository truth audit

Inventory repository, configs, migrations, commands, tests and code paths.

## Workstream B — Document/checklist reconciliation

Map all 77 #70 items and final-prompt requirements to code and documents.

## Workstream C — Sampling frame

Traffic tier, geography, eligibility, scope, balancing reference.

## Workstream D — Population/FIDS/time

T milestone, future assignment, T−24/T−6/T−90 acquisition, FIDS protocol, budget.

## Workstream E — Identity/provenance/outcomes

Flight identity, codeshares, routes, tails, OOOI, labels, timestamps, censoring.

## Workstream F — Sampling execution

Anchors, scheduler, crossover, HUB/MID/REGIONAL, adaptive state, coverage floor.

## Workstream G — Context/history/AIRBORNE

Weather, historical store, cadence, trajectories, chains.

## Workstream H — Evaluation/freeze

Split rule, primary endpoint, deferred items, manifest.

## Workstream I — Gates/final readiness

Gate verification, lexical preflight, consistency report, GO/NO-GO.

---

# 37. SAMPLING FRAME — MANDATORY BLOCKERS

## 37.1 Global traffic-tier correction

Replace blanket treatment of universe-only airports as REGIONAL.

Freeze:

* traffic measure;
* source;
* reference period;
* thresholds;
* HUB definition;
* MID definition;
* REGIONAL definition;
* missing-reference policy;
* tie/boundary policy;
* version;
* retrieval date;
* source hash.

Do NOT derive global traffic tiers from Phase-6 delay outcomes.

Rebuild `clean.adb_sampling_frame`.

## 37.2 Region mapping

Replace undocumented ICAO-first-letter geography with validated airport-country-region mapping.

Freeze:

* six macro-regions;
* mapping source;
* country→macro-region mapping;
* territorial/exceptions policy;
* unknown policy;
* version/hash.

## 37.3 Population scope

Explicitly decide and freeze:

* scheduled commercial passenger;
* cargo;
* private;
* charter;
* non-scheduled;
* cancelled;
* diverted.

The same scope must flow through population → capture → snapshots → evaluation unless another population is separately named.

## 37.4 PRE/POST airport eligibility

Resolve whether:

A. core experimental airports require both PRE and POST support;

or

B. PRE and AIRBORNE use separate eligibility pools/slots.

Document exact controller behavior.

No PRE horizon may depend on an airport lacking required FIDS/schedule coverage.

---

# 38. EXACT T MILESTONE

Do not leave T as generic “scheduled departure.”

Freeze:

* exact milestone;
* provider field path;
* original vs revised;
* service-date handling;
* retime policy;
* timezone.

T must be stable according to the frozen flight-instance policy.

---

# 39. T−24 OPERATIONAL ACQUISITION

Prove how a T−24 snapshot is actually obtained.

It is forbidden to reconstruct T−24 from a final schedule observed later.

If using live schedule snapshots:

future experimental airport/window assignment
→ assignment frozen early enough
→ actual T−24 FIDS observation
→ T−6 observation
→ T−90 observation
→ experimental webhook window
→ later outcomes.

If historical schedule versions are used instead, prove that the provider preserves genuine versioned as-known-at-time state and trustworthy availability timestamps.

Document scheduler jobs and code paths.

---

# 40. COMPLETE FIDS PROTOCOL

Verify against current provider documentation and actual behavior.

Freeze:

* endpoint/version;
* direction;
* `withLeg`;
* `withCancelled`;
* `withCodeshared`;
* `withCargo`;
* `withPrivate`;
* `withLocation`;
* local from/to;
* maximum window;
* edge inclusivity;
* pagination;
* truncation;
* result limits;
* retries;
* timeout;
* duplicate handling;
* schedule revisions;
* cancellations;
* diversions;
* retimes;
* population membership;
* raw response preservation;
* response hash;
* retrieval timestamp.

---

# 41. FIDS TIMEZONE / DST

Provider airport FIDS bounds use airport-local time.

Implement and test:

canonical UTC experimental interval
→ airport IANA timezone
→ local date/time
→ correct `fromLocal`
→ correct `toLocal`
→ provider query
→ persist original local request
→ persist timezone
→ persist UTC equivalent.

DST test cases are mandatory.

Never use fixed `UTC±offset` logic as a universal solution.

---

# 42. REST/FIDS WORST-CASE BUDGET PROOF

Do not accept `≈1,000`.

Build an explicit formula.

Include:

* days;
* airports/day;
* horizons;
* calls/horizon;
* API units/call;
* Gate-5 sample calls;
* diagnostics;
* reference calls;
* allowed retries;
* contingency.

Show:

BASE

* VALIDATION
* RETRIES
* CONTINGENCY
  = WORST CASE.

Then prove it fits the REST/API-unit line.

It cannot consume the protected Flight-Alert floor or silently reduce scientific population coverage.

Record account-specific unit values verified at Gate 0.

---

# 43. CANONICAL `flight_instance_id`

Define one physical operated flight leg.

Preferred provider ID may be used only after testing its stability.

Fallback specification must include:

* operating carrier;
* operating flight number;
* origin;
* destination;
* original scheduled time;
* service date;
* provider ID;
* callsign where useful;
* collision fallback.

Explicitly define:

* codeshare behavior;
* retime behavior;
* revision behavior;
* diversion behavior.

Separate:

STABLE IDENTITY

from

MUTABLE STATE.

---

# 44. CODESHARE DEDUPLICATION

Multiple marketing numbers must not become multiple physical prediction units.

Verify provider code-share behavior.

Prefer enough raw information to canonicalize to the operating leg internally.

Store marketing identifiers if useful, but do not allow them to inflate:

* population;
* snapshots;
* outcomes;
* route counts;
* test partitions.

---

# 45. ROUTE / OD IDENTITY

Freeze:

* directed OD;
* original destination;
* operational destination;
* actual destination;
* diversion representation;
* codeshare behavior;
* retime behavior.

Do not silently turn directed routes into undirected routes.

---

# 46. AIRCRAFT/TAIL IDENTITY

Freeze identity priority/fallback for:

* registration;
* Mode-S;
* ICAO24;
* provider aircraft ID.

Define:

* missing tail;
* conflicting identifiers;
* aircraft swap;
* reuse;
* chain break;
* tail-known flag.

---

# 47. EIGHT OOOI/ASPM-STYLE MILESTONES

Map individually:

1. scheduled_gate_out
2. actual_gate_out
3. scheduled_wheels_off
4. actual_wheels_off
5. scheduled_wheels_on
6. actual_wheels_on
7. scheduled_gate_in
8. actual_gate_in

For each record:

* provider path;
* provider description;
* exact semantic interpretation;
* FAA/ASPM equivalence if justified;
* availability timestamp;
* null behavior;
* caveat;
* verification source;
* Gate-0.5 live evidence.

If not verifiable:

NULL
+
`milestone_unverified`.

Never invent a gate timestamp from a runway timestamp.

---

# 48. TARGET-SPECIFIC LABEL OBSERVABILITY

Do not use one generic `observed` flag for all targets.

Implement target-specific fields such as:

* `gate_out_label_observed`;
* `wheels_off_label_observed`;
* `wheels_on_label_observed`;
* `gate_in_label_observed`.

A flight may be valid for one regression target but not another.

Each training population is target-specific.

---

# 49. CENSORING

Binding sequence:

collection/window ends
→ outcome not automatically declared missing
→ frozen grace interval
→ task-specific terminal evidence checked
→ observed/cancelled/diverted/etc. if available
→ otherwise censored/missing according to frozen rules.

Patch stale wording everywhere.

---

# 50. FOUR TIMESTAMPS

Preserve separately:

* `event_timestamp`;
* `provider_published_utc`;
* `received_timestamp_utc`;
* `available_at`.

Define:

* source;
* nullability;
* fallback;
* ordering;
* negative latency;
* clock skew;
* duplicates;
* quarantine/QC.

Universal eligibility rule:

`information_available_timestamp <= prediction_cutoff`

Event occurrence alone is insufficient.

---

# 51. SNAPSHOT PROVENANCE

Every PRE and AIRBORNE derived snapshot must be traceable to:

* exact raw events;
* exact population version;
* schedule version;
* weather version;
* historical feature rows;
* feature-builder version.

A researcher must be able to answer:

“Why was this feature value available in this snapshot?”

Store row IDs/hashes or equivalent deterministic provenance.

---

# 52. GATE-0.5 MEASURE → FREEZE ITEMS

Do NOT guess:

* censoring grace;
* `airborne_usable` minimum point count;
* target cadence;
* minimum acceptable cadence;
* maximum gap;
* minimum trajectory duration;
* minimum route/trajectory coverage;
* completeness formula;
* completeness threshold;
* warning/fail rule.

Gate 0.5 must record:

* sample size;
* distributions;
* median;
* P95;
* maximum;
* latency behavior;
* rationale for selected values.

Then freeze in manifest before Phase 6.

---

# 53. REGIONAL ADAPTATION

Retain:

`0.25 <= m_i <= 1.5`

but fully define:

`m_{i,t+1} = f(...)`

including:

* exact yield measure;
* history window;
* smoothing;
* update frequency;
* cold start;
* missing data;
* zero yield;
* reset;
* floor/cap;
* deterministic replay;
* seed/state persistence.

---

# 54. ZERO-YIELD STATE MACHINE

Define exact transitions:

`normal`
→ `zero_yield_once`
→ `zero_yield_repeated`
→ `zero_yield_persistent`.

Specify:

* count thresholds;
* observation window;
* recovery;
* what affects `m_i`;
* what does not;
* whether persistent remains selectable;
* how provider errors differ from genuine empty yield.

One empty result cannot remove an airport.

---

# 55. COVERAGE FLOOR

Define mathematically.

Examples of acceptable concepts:

* maximum starvation interval;
* guaranteed minimum draw opportunity;
* deterministic forced-eligibility rule.

Freeze:

* interval/frequency;
* eligible pool;
* interaction with `m_i`;
* tie-break;
* seed behavior.

Do not call it representative sampling.

---

# 56. FRAME-BALANCING VARIABLES

Fully define:

* network degree;
* carrier diversity;
* international/domestic share;
* exogenous traffic;
* geo/network diversity;
* carrier/international diversity.

For each:

* source;
* formula;
* reference period;
* operating vs marketing carrier;
* directed/undirected;
* minimum route frequency if applicable;
* missing policy;
* normalization;
* version/hash.

Reference data must be fixed independently of the scientific sample it helps choose.

---

# 57. ANCHOR SCORE

Keep 40/20/20/20 unless genuine contradiction requires adjudication.

Copy the exact executable formula into PART 1.

Document:

* traffic component;
* geo/network component;
* carrier/international component;
* measured-yield component.

---

# 58. YIELD REFERENCE NORMALIZATION

Stop ambiguously calling WSSS/OMAA “calibration” when discussing anchor scoring.

Use a term such as:

`yield reference normalization`.

Define:

* WSSS role;
* OMAA role;
* primary;
* fallback;
* diagnostic;
* invalid-reference behavior.

---

# 59. YIELD STANDARDIZATION

Document exact formula.

If:

`component_std = clamp(candidate/reference, 0, 1)`

then state it explicitly.

Explain clipping above reference.

---

# 60. STABILITY

Freeze exact calculation:

* 15-minute bucket boundary;
* count definition;
* mean;
* variance;
* population vs sample SD;
* CV;
* zero-mean handling;
* `stability = 1/(1+CV)` if retained.

Show a worked aviation example.

---

# 61. ANCHOR PROBE EXACTNESS

Replace approximate controls before results can influence selection.

Do not leave:

* `~10–12`;
* `top ~5–6`;
* “longer confirmation”;
* undocumented threshold.

Freeze:

* exact shortlist count;
* exact Stage-1 duration;
* exact promotion count;
* exact Stage-2 duration;
* exact capacity threshold;
* exact time-class definition;
* exact weekday-class definition;
* exact scheduling procedure.

If code uses:

`rows_per_hour >= 60`

PART 1/config/manifest must all say 60.

---

# 62. ANCHOR/HUB RELATIONSHIP

Explicitly state whether rotating anchor consumes the one HUB slot in:

`{HUB:1,MID:2,REGIONAL:1}`.

Code and documentation must match.

---

# 63. HUB/MID SELECTION

Freeze:

* freshest-first;
* recent exclusion period;
* eligibility filter;
* deterministic tie-break;
* random seed if used;
* missing-history behavior.

No unspecified runtime discretion.

---

# 64. CROSSOVER

Fully specify:

* `crossover_group_id`;
* experimental unit;
* template;
* period 1;
* period 2;
* matching variables;
* treatment assignment;
* random seed;
* incomplete pair;
* failure;
* budget-capped window;
* order/carryover policy.

Treatment must never depend on information seen after template freeze.

---

# 65. SCHEDULER TIE-BREAK

If multiple valid schedules have equal weekday×UTC objective:

define deterministic selection.

No undocumented “may also consider...” criteria.

---

# 66. `coverage-age <=5 d core`

Define:

* what `core` means;
* which airports qualify;
* when membership is frozen/recomputed;
* what ≤5 days means exactly;
* how measured.

---

# 67. ENVIRONMENTAL CONTEXT

Define and preserve:

* weather severity;
* ATC delay-program;
* storm-track context.

For each:

* source;
* data contract;
* timestamp;
* availability;
* classification;
* threshold;
* missing state;
* archive behavior.

If it cannot be reliably reconstructed later, capture it during collection.

---

# 68. WEATHER HIERARCHY

Freeze:

* METAR;
* TAF;
* GFS/NAM if retained;
* ERA5/reanalysis.

Define:

* precedence;
* spatial join;
* temporal join;
* issue time;
* amendment/revision;
* retrieval time;
* availability;
* missing behavior;
* archive/live distinction.

Never give a pre-cutoff snapshot meteorological truth that only became available afterward.

---

# 69. WEATHER RETENTION WORDING

Do not preserve stale “15-day” language as timeless truth.

Verify current AviationWeather.gov behavior at freeze.

Record:

* docs/API date;
* observed archive depth;
* source version;
* retrieval date.

Manifest the verified fact.

---

# 70. HISTORICAL FEATURE STORE

For:

* airport delay;
* route delay;
* carrier×airport delay;
* tail previous-leg delay;
* OD;
* utilization;
* congestion;
* weather;

freeze:

* source;
* lookback;
* minimum observations;
* update frequency;
* availability timestamp;
* validity interval;
* bootstrap source;
* missingness behavior;
* readiness criterion.

Define `history_ready_at` mathematically/operationally.

Do not let early Day-1 snapshots masquerade as fully mature history.

---

# 71. GRAPH DATA REQUIREMENTS

Before Phase 6 preserve enough information for:

* static route edges;
* dynamic state/congestion;
* resource edges;
* aircraft-chain edges.

Advanced GNN formulas may be D/deferred.

Collection-side raw requirements may not.

---

# 72. CHAIN COMPLETENESS

Define:

* what constitutes a successor;
* allowable turnaround;
* maximum time gap;
* in-window boundary;
* right boundary;
* missing-registration behavior;
* aircraft swap;
* cancellation/diversion;
* known absent vs unknown.

---

# 73. ENGINE-A TEST CHRONOLOGY — MANDATORY FIX

Do NOT materialize Phase-6 row IDs before Phase 6 rows exist.

## BEFORE PHASE 6

Freeze:

* split algorithm;
* date/relative-date boundaries;
* group keys;
* event blocking;
* seed;
* ordering;
* hash/version.

## AFTER COLLECTION BUT BEFORE MODEL TUNING

Apply the frozen rule.

Materialize actual row IDs.

Hash them.

Make read-only.

No tuning against final test.

Patch Phase-5 wording accordingly.

---

# 74. PRIMARY SCIENTIFIC CLAIM

Before Phase 6 freeze:

* primary model comparison;
* primary target;
* primary horizon or hierarchy;
* primary Engine;
* primary metric;
* metric direction;
* practical effect threshold;
* uncertainty/CI rule if used;
* exact “Model 1 beats Model −1” decision.

Do not select the headline metric after results appear.

---

# 75. ENDPOINT HIERARCHY

Label every endpoint:

PRIMARY
SECONDARY
EXPLORATORY.

Cover:

* PRE;
* AIRBORNE;
* gate-out delay;
* wheels-off delay;
* wheels-on delay;
* gate-in delay;
* delay >15;
* delay >60;
* delay >120;
* cancellation;
* diversion;
* ETA;
* Engines A/B/C/D/E/R/P/POST.

---

# 76. MODEL-SELECTION PROTOCOL

Freeze:

TRAIN
→ VALIDATION
→ MODEL/HYPERPARAMETER SELECTION
→ UNTOUCHED TEST.

Final test cannot influence:

* feature choice;
* missingness treatment;
* hyperparameters;
* collection policy;
* endpoint;
* threshold;
* model family.

---

# 77. CONFORMAL / INTERVAL CONTRADICTION

Part 1 must not simultaneously imply:

* conformal is Model 7/later;

and

* every Month-1 model must report conformal intervals.

Resolve explicitly.

Either:

A. define a fixed Month-1 interval method;

or

B. defer interval/conformal evaluation to the later uncertainty rung.

Document classification.

---

# 78. SECONDARY ANALYSIS ITEMS

For:

* Engine-B holdout percentage;
* Engine-C holdout choice;
* Engine-D fraction;
* Engine-R fraction;
* bootstrap confidence;
* bootstrap replicate count;
* rolling-origin folds;
* ECE bins;
* staleness bins;
* learning-curve fit;
* severe-delay summaries;
* missing-feature strategies;
* advanced GNN details;

either freeze now or formally D/defer.

Every D item must state:

* freeze deadline;
* prohibited information before freeze.

---

# 79. COLLECTION-MARGINAL-VALUE EXPERIMENTS

Do not overclaim causality.

If retained in Month 1, define:

* intervention unit;
* assignment;
* baseline/control;
* repeated intervention;
* outcome metric;
* credit denominator;
* replication;
* randomization/pairing.

Otherwise explicitly defer powered causal comparison to Month 2.

Month 1 pilot variance may inform Month-2 power, but Month-1 pilot results must not be presented as a definitive treatment-effect verdict.

---

# 80. DOCUMENT STATUS CORRECTIONS

Replace misleading wording like:

`Implementation lock: COMPLETE`

with separate statuses:

* architecture locked;
* implementation status;
* code-tested status;
* live-gate status;
* pre-freeze measured values pending;
* manifest pending;
* Phase-6 readiness.

Update stale R1–R7 / S1–S5 “planned/new” language based on actual repository truth.

---

# 81. FIRST-CLASS DATA LAYERS

Fix any log sentence saying `flight_data_pre_post` is the only true data table.

Document first-class layers including:

* immutable raw webhook envelope;
* ingest ledger;
* event history;
* current state;
* provider population;
* PRE snapshots;
* raw airborne observations;
* cleaned points;
* trajectories;
* AIRBORNE snapshots;
* task-specific outcomes;
* historical feature store;
* weather;
* collection metadata.

---

# 82. FRAME REGENERATION

After re-tiering/re-regioning:

regenerate:

* total frame;
* HUB;
* MID;
* REGIONAL;
* six macro-regions;
* 18 tier×region cells;
* PRE eligible;
* POST eligible;
* both;
* missing traffic;
* missing geography;
* population exclusions.

Do not copy old “18/18” counts forward.

---

# 83. FINAL MANIFEST

Before Phase 6 create an immutable/versioned manifest containing at minimum:

* manifest ID;
* creation time;
* Git SHA;
* lock-file hash;
* schema/migration hash;
* frame version/hash;
* traffic source/version;
* traffic period;
* traffic thresholds;
* region version/hash;
* scope;
* eligibility rule;
* flight-instance algorithm/version;
* codeshare policy;
* route identity;
* tail identity;
* FIDS builder version;
* FIDS parameters;
* timezone/DST implementation version;
* cutoff T milestone;
* T−24 acquisition rule;
* milestone map;
* REST budget proof/hash;
* anchor score version;
* final anchor pool;
* yield reference rule;
* stability rule;
* capacity threshold;
* Stage-1 protocol;
* Stage-2 protocol;
* scheduler seed;
* scheduler rule;
* tie-break;
* crossover seed/rule;
* REGIONAL adaptive rule;
* coverage-floor rule;
* zero-yield rule;
* timestamp contract;
* censoring grace;
* cadence thresholds;
* trajectory thresholds;
* weather versions;
* weather joins;
* historical-store readiness;
* `history_ready_at`;
* snapshot-builder SHA;
* outcome-builder SHA;
* provenance version;
* split rule/hash;
* primary endpoint;
* primary metric;
* decision rule;
* model-selection protocol;
* account plan;
* monthly units;
* Flight Alert balance parameters;
* reserve;
* REST budget;
* daily cap;
* SOFT_STOP;
* retry policy.

Hash the manifest.

---

# 84. REQUIRED ACTUAL REPOSITORY SEARCH

Search at minimum for:

* `maxDeliveryRetries`;
* `sampling_weight`;
* `sampling_probability`;
* `airport_layer_design_probability`;
* `planned_share`;
* `is_randomized`;
* `dedup_key`;
* `flight_number`;
* `flight_instance`;
* `codeshare`;
* `withCodeshared`;
* `withCargo`;
* `withPrivate`;
* `withCancelled`;
* `withLeg`;
* `post_eligible`;
* `pre_eligible`;
* `tier_source`;
* `REGIONAL`;
* `traffic_prior`;
* ICAO first-letter logic;
* `m_i`;
* coverage floor;
* anchor;
* WSSS;
* OMAA;
* stability;
* rows/hour;
* 60;
* Stage 1;
* Stage 2;
* scheduler seed;
* crossover;
* `available_at`;
* `received_at`;
* `provider_published`;
* `reportedAtUtc`;
* schedule revision;
* FIDS;
* local-time conversion;
* timezone;
* DST;
* weather;
* historical feature;
* outcomes;
* censoring;
* grace;
* split;
* test hash;
* manifest.

Do not claim the audit is complete until the actual results of these searches are documented.

---

# 85. FINAL PREFLIGHT LEXICAL SCAN

Search binding PART 1 and executable config for:

* `proposal`;
* `proposed`;
* `TBD`;
* approximate `~`;
* `top ~`;
* `may`;
* `approximately`;
* unspecified `threshold`;
* `longer`;
* `planned`;
* `new`;
* `open experiment`;
* competing alternatives;
* placeholder seed;
* undefined `core`;
* undefined `matched`;
* undefined `calibration baseline`.

Every occurrence:

1. exact frozen rule;
2. Gate-measured → freeze;
3. formal D/defer;
4. unresolved blocker.

Category 4 must be empty before Phase 6.

---

# 86. CORRECT GATE ORDER

Do not reorder based on convenience.

pre-freeze specification repair
→ code/schema synchronization
→ frame rebuild
→ Gate 0
→ Gate 1
→ Gate 2
→ Gate 3
→ Gate 0.5
→ freeze C measurements
→ Gate 4
→ Gate 5
→ final manifest
→ final consistency audit
→ final lexical preflight
→ Phase 6.

If a gate fails:

STOP progression.

Preserve failure evidence.

Fix cause.

Rerun with new RUN ID.

Do not lower criteria after failure.

---

# 87. IMPLEMENTATION-LOG PHASE DETAIL

For EACH real V3.9 phase create:

## Purpose

Plain English.

## Why this phase exists

Scientific and operational reason.

## Prerequisites

Exactly what must already be true.

## Inputs

Files/tables/config/state.

## Steps

Every numbered action.

## Code locations

Every relevant file/function.

## What the code does

Step-by-step.

## Representative code

Pseudocode/excerpts.

## Database effects

Tables/columns/rows.

## API effects

Calls/cost.

## Outputs

Artifacts/state.

## Tests

Unit/integration/live.

## Failure conditions

What stops progression.

## Recovery

What to do.

## Definition of Done

Exact checklist.

## What becomes frozen

If applicable.

## Handoff

How next phase uses it.

---

# 88. IMPLEMENTATION-LOG STEP DETAIL

For EVERY step inside each phase, document:

* step number;
* purpose;
* prerequisite;
* exact file;
* exact function;
* input;
* output;
* algorithm;
* DB operation;
* API operation;
* command;
* expected console output;
* expected database change;
* test;
* PASS criterion;
* FAIL criterion;
* next step.

Do not group five steps into “implemented pipeline.”

---

# 89. TEACHING REQUIREMENT

The implementation log must teach the system.

For each complex concept use an aviation-specific worked example.

Examples:

* one physical codeshared flight;
* one T−24 snapshot;
* one aircraft with three consecutive legs;
* one REGIONAL probability draw;
* one anchor probe;
* one balance reconciliation;
* one DST FIDS conversion;
* one censored gate-in outcome;
* one future-data leakage example;
* one Engine-A split example.

Explain equations variable by variable.

---

# 90. NO ESSENTIAL INFORMATION ONLY IN ANOTHER FILE

`CODE_WALKTHROUGH.md`, README files or comments can be supplemental.

But for every critical V3.9 component, `IMPLEMENTATION_LOG.md` itself must contain:

* where it lives;
* what it does;
* how it works;
* why it exists;
* code/pseudocode example;
* tests;
* status.

A reader must not be forced to open another document to understand the core workflow.

---

# 91. SESSION SUMMARY

At the end of each work session append:

* session ID;
* UTC date;
* Git SHA start/end;
* work completed;
* requirements affected;
* files changed;
* migrations;
* commands;
* tests;
* failures;
* decisions;
* issues opened;
* issues closed;
* artifacts;
* hashes;
* spend;
* gates affected;
* unresolved B;
* unresolved C;
* next exact action;
* prohibited next action;
* overall status.

---

# 92. PHASE SUMMARY

At the end of each real V3.9 phase append:

* objective;
* tasks completed;
* incomplete tasks;
* files;
* code map;
* DB objects;
* artifacts;
* tests;
* gate results;
* failures/recovery;
* frozen values;
* remaining risk;
* next phase prerequisites;
* phase status.

---

# 93. FINAL IMPLEMENTATION-LOG CONTENT CHECKLIST

Before declaring documentation complete, `IMPLEMENTATION_LOG.md` must contain:

1. current-state dashboard;
2. single authoritative next-action list;
3. source-of-truth hierarchy;
4. frozen scientific principles;
5. complete Part-1 walkthrough;
6. complete Phase 0–7 walkthrough;
7. complete gate guide;
8. science/statistics teaching;
9. glossary;
10. table/data dictionary;
11. schema/migration guide;
12. repository file map;
13. code/function walkthrough;
14. config/environment registry;
15. dependency/runtime record;
16. requirement→code matrix;
17. code→requirement matrix;
18. #70→implementation matrix;
19. manifest→source matrix;
20. data lineage;
21. command index;
22. test matrix;
23. run-report index;
24. credit/API-unit ledger;
25. decision register;
26. issue register;
27. artifact/hash register;
28. frozen-values register;
29. C-measure→freeze register;
30. D/deferred register;
31. rejected alternatives;
32. known limitations;
33. explicit non-claims;
34. failure/recovery history;
35. final system walkthrough;
36. reproduction guide;
37. future-maintainer “must not change” section;
38. final readiness verdict.

---

# 94. REPRODUCTION GUIDE

Document exact prerequisites and commands to reproduce:

1. clone/checkout correct commit;
2. install dependencies;
3. configure non-secret env variables;
4. configure secret variables without logging them;
5. DB startup;
6. migrations;
7. baseline checks;
8. typecheck;
9. tests;
10. health;
11. gate checks;
12. frame generation;
13. FIDS validation;
14. canary;
15. probes;
16. manifest;
17. final preflight.

For each command show expected PASS pattern.

---

# 95. FUTURE MAINTAINER “DO NOT CHANGE” SECTION

Explicitly list frozen controls.

Examples:

* population definition;
* physical-flight identity;
* cutoff rule;
* sampling design;
* seeds;
* adaptive rule;
* anchor formula;
* threshold;
* label definitions;
* primary endpoint;
* split rule;
* retry policy;
* budget cap.

Explain that changing these after seeing Phase-6 outcomes invalidates the precommitment unless treated as a separate later experiment.

---

# 96. KNOWN LIMITATIONS / NON-CLAIMS

State clearly:

* provider-observable population ≠ absolute world census;
* 31 days ≠ seasonality;
* adaptive REGIONAL allocation ≠ representative probability sample;
* airport-layer `p_i` ≠ flight-level inclusion probability;
* five anchors ≠ statistically proven universal optimum;
* 4h ≠ scientifically proven superior before powered test;
* GNN ≠ guaranteed winner;
* AeroDataBox coverage ≠ all aviation activity;
* Month 1 ≠ production validation;
* missing AIRBORNE points may remain provider-dependent;
* inference beyond observed domain must be labeled.

---

# 97. REQUIRED FINAL OUTPUT FROM THE AGENT

Return ALL of these.

## 1. Executive current-state verdict

Include:

* Architecture status;
* Code status;
* Documentation status;
* Gate status;
* Phase-6 status.

## 2. Complete 77-item #70 table

Columns:

| # | Requirement | A/B/C/D | Current document | Current code | Evidence | Required action | Final location | Status |

Exactly 77 rows.

## 3. Additional-findings table

Any issue not already represented in #70.

Do not hide new findings.

## 4. Patch table

| ID | Old behavior/wording | New behavior/wording | Why | Plan | Code | Schema | Tests | Status |

## 5. Repository inventory

Complete relevant file map.

## 6. Code-location map

Path/function/table/config/test for every critical component.

## 7. Requirement-to-code traceability matrix

## 8. Code-to-requirement reverse matrix

## 9. Complete database/data dictionary

## 10. Data-lineage representation

## 11. Configuration/environment registry

Secrets redacted.

## 12. Dependency/runtime reproducibility record

## 13. Migration report

Include idempotency results.

## 14. Test matrix

Expected vs observed.

## 15. Command index

## 16. Run-report index

## 17. Sampling-frame regeneration report

Report:

* total frame;
* HUB;
* MID;
* REGIONAL;
* each six-region count;
* 18 cells;
* PRE eligible;
* POST eligible;
* both;
* missing traffic;
* missing region;
* exclusions.

## 18. FIDS protocol specification

## 19. UTC/local/DST specification

## 20. T−24/T−6/T−90 acquisition specification

## 21. REST/FIDS worst-case budget calculation

Show arithmetic.

## 22. `flight_instance_id` specification

## 23. Codeshare specification

## 24. Route/OD specification

## 25. Tail identity specification

## 26. Eight-milestone mapping table

## 27. Target-specific label-population table

## 28. Four-timestamp contract

## 29. Provenance specification

## 30. REGIONAL adaptive-rule specification

## 31. Zero-yield state machine

## 32. Coverage-floor formula

## 33. Anchor system specification

## 34. Scheduler/crossover specification

## 35. Weather specification

## 36. Historical feature-store readiness specification

## 37. Chain-completeness specification

## 38. Engine-A split/test-protection specification

## 39. Primary endpoint/metric/decision rule

## 40. Endpoint hierarchy

## 41. Deferred-analysis table

## 42. Gate-measured-values table

Columns:

| Parameter | Gate | Measurement | Sample | Decision rule | Frozen value | Manifest field |

## 43. Final frozen-values table

## 44. Final manifest content + hash

## 45. Implementation-log entry index

| Entry ID | Phase | Gate | Requirement | Files | Tests | Artifact | Status |

## 46. Phase-by-phase implementation guide

## 47. Gate-by-gate guide

## 48. Plain-language complete system walkthrough

From:

airport universe

through:

final evaluation.

## 49. Reproduction guide

## 50. Final unresolved-items table

Separate:

* unresolved collection-affecting B;
* unresolved required C;
* unresolved primary evaluation;
* formally deferred D.

## 51. Final readiness verdict

Report exactly:

`ARCHITECTURE: GO / NO-GO`

`PART-1 SPECIFICATION: GO / NO-GO`

`CODE: GO / NO-GO`

`SCHEMA/MIGRATIONS: GO / NO-GO`

`IMPLEMENTATION LOG: GO / NO-GO`

`GATE 0: PASS / FAIL / PENDING`

`GATE 1: PASS / FAIL / PENDING`

`GATE 2: PASS / FAIL / PENDING`

`GATE 3: PASS / FAIL / PENDING`

`GATE 0.5: PASS / FAIL / PENDING`

`GATE 4: PASS / FAIL / PENDING`

`GATE 5: PASS / FAIL / PENDING`

`FINAL FREEZE: PASS / FAIL / PENDING`

`PHASE 6: GO / NO-GO`

Then state the single exact next action.

---

# 98. CONDITIONS FOR PHASE-6 GO

You may say Phase 6 = GO ONLY if:

1. every B blocker = resolved;
2. every required C value = measured and frozen;
3. collection-affecting unresolved count = 0;
4. primary-evaluation unresolved count = 0;
5. traffic-tier frame rebuilt;
6. region mapping rebuilt;
7. scope frozen;
8. PRE/POST eligibility frozen;
9. T milestone frozen;
10. T−24 acquisition proved;
11. FIDS protocol frozen;
12. REST budget fits;
13. physical flight identity frozen;
14. codeshares handled;
15. milestone mapping verified;
16. target-specific labels implemented;
17. censoring rule consistent;
18. timestamp contract implemented;
19. provenance verified;
20. adaptive REGIONAL rule frozen;
21. coverage floor frozen;
22. anchor protocol frozen;
23. scheduler/crossover frozen;
24. weather rules frozen;
25. historical feature readiness frozen;
26. primary split rule frozen;
27. primary claim frozen;
28. code/schema/docs agree;
29. migrations are verified;
30. required tests pass or have no new regressions relative to explicitly documented baseline;
31. Gate 0 passed;
32. Gate 1 passed;
33. Gate 2 passed;
34. Gate 3 passed on an actual successful rerun;
35. Gate 0.5 passed;
36. Gate 4 passed;
37. Gate 5 passed;
38. manifest is written and hashed;
39. final lexical scan has no Category-4 unresolved controls;
40. `IMPLEMENTATION_LOG.md` meets its completeness requirements;
41. `ADB_AUTO_COLLECT` is enabled only deliberately for the authorized scientific run.

Architecture GO alone is NOT sufficient.

Code GO alone is NOT sufficient.

Documentation GO alone is NOT sufficient.

---

# 99. STOP CONDITION FOR FURTHER THEORETICAL REVIEW

Once:

* unresolved B = 0;
* required C = frozen;
* primary evaluation = fully precommitted;
* repository/code/schema/docs = synchronized;
* gates = passed;
* manifest = hashed;
* preflight = clean;

STOP theoretical architecture revision.

Do not manufacture V3.10.

Do not add another review simply because a different reasonable modeling option exists.

Remaining questions such as:

* whether XGBoost actually beats persistence;
* how much staleness matters;
* whether 4h performs better than split windows;
* how much airborne cadence is achieved;
* whether GNN adds value;
* what one additional credit is worth;

are empirical questions for the data.

At that point execute V3.9 as frozen.

---

# 100. FINAL BEHAVIOR RULE

Be conservative about declaring success and aggressive about documenting evidence.

Never write:

“looks good.”

Write:

* what requirement was checked;
* where;
* what code implements it;
* what test proved it;
* what live evidence proved it;
* what remains;
* whether it is frozen.

Do not silently omit a requirement because implementing or documenting it is inconvenient.

Do not invent evidence.

Do not hide failures.

Do not erase history.

Do not change scientific rules after seeing Phase-6 outcomes.

The final goal is not merely working code.

The goal is a **scientifically defensible, leakage-safe, reproducible, budget-safe, provider-aware aviation data-collection experiment whose complete implementation can be understood and audited from `V3.9_DataCollectPlan.md`, the repository, the immutable run artifacts, the final manifest, and especially the fully detailed `IMPLEMENTATION_LOG.md`.**

This version is intentionally much stricter about the implementation log than the previous one. It also preserves the good parts of your existing log instead of replacing them: the current log already records exact commands and explains how run history survives restarts, for example.  And it already has detailed historical failure explanations such as the migration re-run problem and the Gate-3 webhook failure; the new prompt requires that style of explanation for **every** major implementation change rather than only a few important incidents.  

Within the files we have audited, **this is the master prompt I would use now instead of the earlier #70 prompt or my previous shorter version**. The remaining thing no written prompt can predetermine is what the agent may discover when it inspects the *actual current repository*. That is why this prompt forces it to report additional findings rather than silently ignore them—but it also forbids those findings from becoming another unnecessary architecture redesign.
