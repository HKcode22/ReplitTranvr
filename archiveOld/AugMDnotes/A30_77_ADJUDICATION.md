# A30 77-Item Adjudication — Source of Truth (A30 §9, A30_3 #9)

> **One literal 77-row table is the only source of truth. Summary counts B/C/D are generated from it. High-level `12 blocker families` grouping in `Log §2` and `MUSE_A30_ASSESSMENT.md §2` is derived from this table, not separate.**

> Plan V3.9-f.7 + f.8 (10 fixes) + Log expanded §13-35. See Plan §22 V3.9-f.7/f.8 change tables.

| # | #70 Item | Plan § | Title | Class (A/B/C/D) | Where lives | Status 2026-08-30 |
|---|---|---|---|---|---|---|
| 1 | #1 | §37.1 | Traffic-tier: 4053 unclassified → REGIONAL blanket (§37.1 §4.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 2 | #2 | §37.2 | Macro-region ICAO first-letter heuristic (§37.2 §4.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 3 | #3 | §37.3 | Population scope cargo/private/charter (§37.3 §4.3) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 4 | #4 | §37.4 | PRE/POST eligibility integrated vs separate (§37.4 §4.4) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 5 | #5 | §43 | Canonical flight_instance_id (§43 §7.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 6 | #6 | §44 | Codeshare dedup (§44 §7.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 7 | #7 | §40 | FIDS population protocol + raw hash (§40 §5.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 8 | #8 | §39 | T−24 as-known-at acquisition (§39 §5.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 9 | #9 | §41 | FIDS timezone/DST IANA (§41 §5.3) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 10 | #10 | §42 | REST/FIDS worst-case 919 budget proof (§42 §5.4) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 11 | #11 | §38 | Exact T milestone (§38 §6.0) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 12 | #12 | §52 | Censoring grace measure→freeze (§52 §6.6) | C — PRE-RUN MEASURE→FREEZE | V3.9-f.7 | MEASURE→FREEZE |
| 13 | #13 | §52 | Airborne_usable min points (§52) | C — PRE-RUN MEASURE→FREEZE | V3.9-f.7 | MEASURE→FREEZE |
| 14 | #14 | §52 | Target cadence/min acceptable (§52) | C — PRE-RUN MEASURE→FREEZE | V3.9-f.7 | MEASURE→FREEZE |
| 15 | #15 | §52 | Max gap / min duration / completeness (§52) | C — PRE-RUN MEASURE→FREEZE | V3.9-f.7 | MEASURE→FREEZE |
| 16 | #16 | §47 | 8 OOOI milestones mapping (§47 §6.3) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 17 | #17 | §48 | Target-specific label_observed (§48 §7.3) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 18 | #18 | §49 | Censoring sequence (§49 §7.4) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 19 | #19 | §50 | Four timestamps + available_at≤cutoff (§50 §6.4) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 20 | #20 | §51 | Snapshot provenance (§51 §6.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 21 | #21 | §56 | Historical feature store spec (§56-§70 §12.2.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 22 | #22 | §72 | Chain completeness (§72 §12.2.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 23 | #23 | §56 | Network degree directed/undirected threshold (§56 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 24 | #24 | §56 | Carrier diversity metric (§56 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 25 | #25 | §56 | International/domestic mix (§56 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 26 | #26 | §57 | Exogenous traffic score (§57 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 27 | #27 | §57 | Geo/network diversity score (§57 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 28 | #28 | §57 | Carrier/international diversity score (§57 §4.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 29 | #29 | §59 | Anchor yield clamp WSSS (§59 §9.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 30 | #30 | §58 | Yield-reference rename WSSS/OMAA (§58 §9.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 31 | #31 | §60 | Stability 1/(1+CV) 15-min buckets (§60 §9.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 32 | #32 | §61 | Anchor shortlist/manifest exact (§61 §9.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 33 | #33 | §61 | Capacity gate 60 (§61 §9.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 34 | #34 | §61 | Time/weekday class matched (§61 §9.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 35 | #35 | §61 | Stage2 promotion 5×4h (§61 §9.1) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 36 | #36 | §62 | Anchor=HUB slot consumes {1,2,1} (§62 §8.4) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 37 | #37 | §63 | HUB selection freshest-first (§63 §8.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 38 | #38 | §63 | MID selection 7-day exclusion (§63 §8.5) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 39 | #39 | §8.2 | REGIONAL draw normalized p=score/Σ (§8.2) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 40 | #40 | §53 | Adaptive m_i ∈[0.25,1.5] recurrence (§53 §8.2) — r_i REMOVED f.8 | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 41 | #41 | §54 | Zero-yield FSM once→repeated→persistent (§54 §8.3) | B — PHASE-6 BLOCKER | V3.9-f.7 | BLOCKED |
| 42 | #42 | §55 | Coverage floor no-starvation (§55 §8.6) | D — FORMALLY DEFERRED (raw preserved) | V3.9-f.7 | DEFERRED |
| 43 | #43 | §64 | Crossover template freeze (§64 §8.7) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 44 | #44 | §65 | Scheduler tie-break lexically smallest seed (§65 §8.8) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 45 | #45 | §66 | Coverage-age ≤5d core recomputed (§66 §4.6) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 46 | #46 | §67 | Environmental context capture (§67 §8) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 47 | #47 | §68 | Weather hierarchy live>archive>gfs>era5 (§68 §10.1) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 48 | #48 | §69 | Weather 30-day retention (§69 §10.2) | B — PHASE-6 BLOCKER (primary) | V3.9-f.7 | BLOCKED |
| 49 | #49 | §70 | Historical bootstrap history_ready_at (§70 §12.2.1) | D — FORMALLY DEFERRED (holdout % before analysis) | V3.9-f.7 | DEFERRED |
| 50 | #50 | §71 | Graph edges raw requirements (§71 §12.3) | D — FORMALLY DEFERRED (holdout % before analysis) | V3.9-f.7 | DEFERRED |
| 51 | #51 | §72 | Chain completeness scheduled vs observable (§72 §12.2.2) | D — FORMALLY DEFERRED (holdout % before analysis) | V3.9-f.7 | DEFERRED |
| 52 | #52 | §73 | Engine-A split hash BEFORE / row IDs AFTER (§73 §13.2) | D — FORMALLY DEFERRED (holdout % before analysis) | V3.9-f.7 | DEFERRED |
| 53 | #53 | §74 | Primary claim T-6 wheels_off MAE≥2min (§74 §13.2) — fallback gate_out | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 54 | #54 | §75 | Endpoint hierarchy PRIMARY/SECONDARY/EXPLORATORY (§75 §13.3) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 55 | #55 | §76 | Model selection train→validation→test (§76 §13.4) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 56 | #56 | §77 | Conformal vs quantile Month1 deferred (§77 §13.5) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 57 | #57 | §78 | Secondary holdout % / ECE bins / staleness buckets (§78 §13.6) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 58 | #58 | §78 | Learning-curve fit a·n^-b+c domain (§78) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 59 | #59 | §78 | Missing-feature handling per model (§78) | B — PRIMARY EVALUATION PREREG (freeze before tuning) | V3.9-f.7 | BLOCKED |
| 60 | #60 | §55 | Coverage floor interaction (§55) | D — PRE-ANALYSIS (freeze before analysis, not collection) | V3.9-f.7 | DEFERRED |
| 61 | #61 | §4.5 | Balancing ref snapshot fixed before freeze (§4.5) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 62 | #62 | §4.1 | Traffic tie/boundary policy (§4.1) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 63 | #63 | §4.2 | Region unknown policy (§4.2) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 64 | #64 | §6.0 | T service-date/retime policy (§6.0 §7.1) — retime <2h same id | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 65 | #65 | §5.1 | FIDS withLocation=false for population (§5.1) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 66 | #66 | §5.1 | FIDS edge inclusivity/pagination (§5.1) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 67 | #67 | §5.1 | FIDS raw response preservation (§5.1) | D — PRE-ANALYSIS (freeze before analysis, not collection) | Log | DEFERRED |
| 68 | #68 | §5.4 | FIDS retry budget FIDS_RETRY_UNIT_BUDGET=75 enforced (§5.4 A30_3 #5) | B/C — INTERVENTION TRIGGER (predeclare before Month1, power uses pilot) | Log | BLOCKED |
| 69 | #69 | §6.2 | Trajectory QC pipeline (§6.2) | B/C — INTERVENTION TRIGGER (predeclare before Month1, power uses pilot) | Log | BLOCKED |
| 70 | #70 | §6.2 | Observation cadence target/min/max (§6.2 §6.6) | B — DOC/CODE CONSISTENCY (BLOCKER) | Log | BLOCKED |
| 71 | #71 | §6.2 | Terminalization grace (§6.2) | B — DOC/CODE CONSISTENCY (BLOCKER) | Log | BLOCKED |
| 72 | #72 | §6.2 | Airborne snapshots table (§6.2) | B — DOC/CODE CONSISTENCY (BLOCKER) | Log | BLOCKED |
| 73 | #73 | §6.2 | POST labels ETA/delay B1/B2 (§6.2) | B — DOC/CODE CONSISTENCY (BLOCKER) | Log | BLOCKED |
| 74 | #74 | §7 | Airborne funnel eligible→labeled (§7) | B — DOC/CODE CONSISTENCY (BLOCKER) | Log | BLOCKED |
| 75 | #75 | §22 | Part2 non-normative header (§22) | A — ALREADY SATISFIED (Part2 non-normative) | Log | DEFERRED |
| 76 | #76 | §15 | Status wording legacy DONE→foundation (§15 §21 A30_3 #8) | B — FINAL FREEZE (manifest/preflight) | Log | BLOCKED |
| 77 | #77 | §36 | Final manifest + preflight scan cat4=0 → GO (§36) | B — FINAL FREEZE (manifest/preflight) | Log | BLOCKED |

**Counts generated from this table (regenerated 2026-08-31, F2 fix):** `B = 57` pure (1-11,16-41,43-48,53-59,70-74,76-77) + `B/C = 2` dual (68,69) = 59 items with B component. `C = 4` pure (12-15) + 2 dual (68,69) = 6 items with C component. `D = 13` (42,49-52,60-67). `A = 1` (75). **77 rows total.** See `MUSE_A30_ASSESSMENT.md` §2 for family rollup.

**Workstreams A-I (A30 §36) not Phases 0-7:** A repo audit DONE, B 77-row DONE, C §§4.1-4.6 DOCUMENTED, D §§5.1-5.4/6.0 STUB, E §§7.1-7.5 IMPLEMENTED+STUB, F §§8.2-8.8 STUB, G §10.1-10.2/12.2.1 STUB, H §§13.2-13.6 DOCUMENTED, I Gates BLOCKED, Log §§13-35 DONE.
