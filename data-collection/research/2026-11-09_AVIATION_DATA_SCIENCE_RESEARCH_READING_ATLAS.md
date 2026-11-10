# Research Reading Atlas — Aviation, Data Science, Scientific Design, and Reliable ML Engineering

**Prepared:** 2026-11-09 (Pacific)  
**Repository:** HKcode22/ReplitTranvr  
**Document class:** Educational literature guide / research traceability. **NOT a scientific amendment, approved target, licensing determination, collection instruction, Phase 5 FREEZE, or Phase 6 paid GO.**  
**Scope:** Published work available by November 9, 2026, plus older foundational papers.  
**Branch isolation:** This guide was prepared on the documentation-only branch docs/aviation-delay-research-reading-atlas-20261109, based on main commit c3e72f08d554c1a520add1c6462d88319bc052d5. No production data or provider calls were required to write it.

## 0. Why this reading guide exists

Our project is not simply “train an AI on flight delays.” It is a **prospective, time-aware study** of scheduled passenger flights with:
- before-deadline observations (PRE at T−24h, T−6h and T−90m);
- later source observations and possible physical outcomes (POST), with precise event meanings;
- flight identity and codeshare normalization;
- airport-tier and geographical sampling with recorded selection probabilities;
- missingness, source latency, source rights, original-response provenance and finite spend caps;
- chronological model evaluation and traveler-relevant uncertainty.

No single aviation paper establishes every one of these decisions. Some papers test prediction models; others study flight operations, sampling, missing observations, or robust machine-learning systems. **A publication can support a design principle without validating our chosen settings, providers, airports, costs, software or future coverage.**

### The reading habit to practice for every paper

Answer these eight questions in your own notes:
1. What precise decision or prediction does the paper study (flight vs airport; gate-out vs wheels-off vs arrival vs schedule revision)?
2. Who/what is the population, and **what dates and geography** were actually observed?
3. Where did each input and its label originate; how is identity/ground truth established?
4. **When** would each feature have been available to a real predictor? Could the study accidentally use hindsight?
5. What was the training/validation/testing scheme? Could the same flight, day, tail, or route leak between groups?
6. What baseline did the authors compare with, which metric and confidence/uncertainty information did they report?
7. What observations were missing or selected out? Could coverage vary by airport, traffic volume or disruption?
8. What does the paper genuinely justify for **our** project—and what would need an independent local test?

A strong researcher's answer often is: “The method is plausible, but these results do not transfer automatically to our population.”

## 1. Reading path — start here

**First six papers, in a useful learning order:**
1. **Carvalho/Sternberg et al. (2020; earlier arXiv review)** — map the flight-delay research landscape [P01].
2. **Li et al. (2024)** — understand delay propagation and distinct data/model families [P02].
3. **Chen & Li (2019)** — see how a model uses preceding flights and aircraft chains [P04].
4. **Kaufman et al. (2012)** — learn why “available before prediction” is scientifically critical [M01].
5. **Cerqueira et al. (2020)** — learn how to test models on future periods [M03].
6. **Beltman et al. (2025)** — explore richer probabilistic *per-flight* delay prediction, not just yes/no [P09].

Then choose a track:
- **Flight operations / potential model architecture:** P03–P14.
- **Physical event evidence / ADS-B:** P15–P16.
- **Sampling, validity, missingness, probability:** M01–M08.
- **Databases, trustworthy pipelines and software engineering:** M09–M13.
- **Accessible learning support:** B01.

## 2. Flight and aviation research — verified papers

Each entry gives a link, a plain-language question, a relevant project connection, and a crucial limitation. Tags: **[PLAN]** means cited in the existing f.8 plan; **[PHASE5]** means already cited in a Nov 9 Phase 5 scientific checkpoint; **[NEW]** means added by this survey, not previously established as a project dependency.

### P01 — Carvalho, Sternberg et al., *On the Relevance of Data Science for Flight Delay Research: A Systematic Review* (Transport Reviews, published 2020; early review arXiv 2017) [PLAN]
- **Read:** https://arxiv.org/abs/1703.06118 ; published DOI https://doi.org/10.1080/01441647.2020.1861123
- **Question:** How do researchers distinguish flight-delay problems, datasets and modeling strategies?
- **Our connection:** Plan f.8 §19 cites the early review for method taxonomy and benchmarking.
- **Be careful:** A literature review is not proof that one model is best for our AeroDataBox data or that a certain target is supported.

### P02 — Chi Li, Jianfeng Mao et al., *Flight Delay Propagation Modeling: Data, Methods, and Future Opportunities* (Transportation Research Part E, 2024) [PLAN]
- **Read:** https://doi.org/10.1016/j.tre.2024.103525
- **Question:** How does one disruption spread through aircraft, airline and airport networks?
- **Our connection:** Motivates studying aircraft rotations, directed routes, airport network effects, and multiple kinds of operational variables.
- **Be careful:** A network-level propagation model is not itself a flight-level pre-departure ground-truth label.

### P03 — Sebastian Wandelt, Xinyue Chen, Xiaoqian Sun, *Flight Delay Prediction: A Dissecting Review of Recent Studies Using Machine Learning* (IEEE Transactions on Intelligent Transportation Systems, 2025) [NEW]
- **Read:** https://doi.org/10.1109/TITS.2025.3528536
- **Question:** Where have aviation ML studies succeeded, and where are definitions/evaluation practices inadequate?
- **Our connection:** Helps challenge claims of exceptional accuracy and compare studies with different population/label definitions.
- **Be careful:** Review findings do not set our 31-day sample sufficiency or source permissions.

### P04 — Jun Chen (San Diego State University) and Meng Li (Purdue), *Chained Predictions of Flight Delay Using Machine Learning* (AIAA SciTech, 2019) [PLAN]
- **Read the authors' paper:** https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf ; DOI https://doi.org/10.2514/6.2019-1661
- **Question:** Why does a late incoming aircraft matter to the next flight?
- **Our connection:** f.8 §19 explicitly cites this work for prior-leg and same-aircraft chain feature hypotheses.
- **Be careful:** Actual departure delays used to update a later flight's prediction must already have occurred and been available by *that* prediction cutoff.

### P05 — Zhe Zheng, Wenbin Wei (San José State University), Minghua Hu, *A Comparative Analysis of Delay Propagation on Departure and Arrival Flights for a Chinese Case Study* (Aerospace, 2021) [PLAN]
- **Read (SJSU faculty record):** https://scholarworks.sjsu.edu/faculty_rsca/2410/ ; DOI https://doi.org/10.3390/aerospace8080212
- **Question:** What changes when we distinguish arrival and departure delay, buffer times, weather and aircraft utilization?
- **Our connection:** f.8 §19 cites its empirical support for chain, turnaround/buffer and weather hypotheses.
- **Be careful:** This study’s Chinese operations and its delay measures do not establish the semantics of an AeroDataBox revisedTime field.

### P06 — Zhe Zheng, Bo Zou, Wenbin Wei (SJSU), Wen Tian, *A Data-Light and Trajectory-Based Machine Learning Approach for the Online Prediction of Flight Time of Arrival* (Aerospace, 2023) [PLAN]
- **Read:** https://scholarworks.sjsu.edu/faculty_rsca/4774/ ; DOI https://doi.org/10.3390/aerospace10080675
- **Question:** Can aircraft trajectory, speed and learned patterns predict ETA during an airborne flight?
- **Our connection:** f.8 explicitly uses this to motivate a *separate in-flight/POST prediction state*.
- **Be careful:** It does **not** justify giving a T−24h model future ADS-B positions.

### P07 — Jiaxin Chen, Weiwei Wu, Wenbin Wei (SJSU), Jiahui Yu, *Delay Prediction of Flight Operation Network Based on Deep Learning Combination Model* (CICTP, 2023) [PLAN]
- **Read:** https://scholarworks.sjsu.edu/faculty_rsca/4935/ ; DOI https://doi.org/10.1061/9780784484869.074
- **Question:** How can a graph convolutional network and recurrent network capture spatial and temporal dependence?
- **Our connection:** f.8 cites this as *plausible* GCN/GRU network modeling research.
- **Be careful:** Model sophistication is not evidence of more accurate per-flight predictions when labels or routes are sparse.

### P08 — Ke Liu et al., *Airport Delay Prediction with Temporal Fusion Transformers* (2024 arXiv; conference/workshop version associated with IWCTS/SIGSPATIAL 2024) [PLAN]
- **Read:** https://arxiv.org/abs/2405.08293 ; publication record https://www.ornl.gov/publication/airport-delay-prediction-temporal-fusion-transformers
- **Question:** Which airport-level operational, demand/capacity and weather variables help with time-resolved prediction?
- **Our connection:** f.8 §19 cites the preprint for feature-family motivation.
- **Be careful:** **Airport aggregate arrival delays at quarter-hour resolution** are not the same target as one physical flight’s gate-out or wheels-off delay. Mark arXiv as a preprint, not a license or performance guarantee.

### P09 — Maarten Beltman, Marta Ribeiro, Jasper de Wilde, Junzi Sun, *Dynamically Forecasting Airline Departure Delay Probability Distributions for Individual Flights Using Supervised Learning* (Journal of Air Transport Management, 2025) [NEW]
- **Read:** https://doi.org/10.1016/j.jairtraman.2025.102788 ; university record https://repository.tudelft.nl/record/uuid:5f56ced5-55d2-4719-8370-5d0816f7fb58
- **Question:** Can we predict an entire **distribution of possible delay minutes**, rather than only “delay / no delay”?
- **Our connection:** Especially relevant to Proposed Amendment E’s interest in richer, calibrated passenger-facing outputs.
- **Be careful:** Studied one major hub-and-spoke airline’s hub departures with day-of-operation variables. Its label semantics, airline-only information and reported results cannot be imported into our heterogeneous global observations.

### P10 — Jorge Silvestre, Miguel A. Martínez-Prieto, Anibal Bregon, Pedro C. Álvarez-Esteban, *A Deep Learning-Based Approach for Predicting In-Flight Estimated Time of Arrival* (Journal of Supercomputing, 2024) [PLAN]
- **Read:** https://doi.org/10.1007/s11227-024-06060-6 ; associated code https://github.com/JorgeSilvestre/SupComp24-rta-prediction
- **Question:** How do researchers formulate, compare and release a trajectory-based ETA model?
- **Our connection:** f.8 cites it for separately timed in-flight predictions. The authors’ code is valuable for learning reproducible workflow practices.
- **Be careful:** Results for aircraft arriving at Madrid are not an international physical-takeoff-label benchmark.

### P11 — Abdulmajid Murad and Massimiliano Ruocco, *Pre-tactical Flight-Delay and Turnaround Forecasting with Synthetic Aviation Data* (CEAS Aeronautical Journal, 2026) [PHASE5]
- **Read:** https://doi.org/10.1007/s13272-026-00941-7
- **Question:** How much can a model predict using schedules well before operations, and what happens when synthetic training data are used?
- **Our connection:** Nov 9 physical-departure-proxy checkpoint discusses differing predictability of gate/turnaround/departure tasks, and why ADS-B alone lacks airline schedule information.
- **Important metric precision:** The **R² 0.27–0.44** range discussed in the article’s §4.4 refers to **turnaround-time prediction**, **not** a universal R² ceiling for predeparture flight delay or a claim about our model.
- **Be careful:** Synthetic source fidelity is a different claim from real AeroDataBox sample/label coverage.

### P12 — Luís F. F. M. Santos and Sebastião Gonçalves, *Graph-Based Multi-Horizon Forecasting of Airport Delay Propagation in the U.S. Air Transportation Network* (Applied Sciences, July 2026) [NEW]
- **Read:** https://doi.org/10.3390/app16147110
- **Question:** How can network-aware multi-horizon forecasts compare with LSTM and XGBoost and report uncertainty?
- **Our connection:** A useful alternative view of model families, feature aggregation, graph structure and multi-horizon performance.
- **Be careful:** **Airport-hour aggregates** (not directly one correctly matched operating flight); the authors report that LSTM won aligned point errors in their comparison, so graph complexity is not automatically superior.

### P13 — *Delay Propagation Prediction of Aviation Network Based on Spatial–Temporal Dynamic Interaction* (Chinese Journal of Aeronautics, 2026) [NEW]
- **Read:** https://doi.org/10.1016/j.cja.2025.103884
- **Question:** Can dynamically learned interactions improve airport-network delay propagation forecasts?
- **Our connection:** Helps you assess whether graph-derived features might eventually add value beyond a simple baseline.
- **Be careful:** Performance gains in those Chinese/U.S. datasets are not claims about our source semantics or small regional-airport representation.

### P14 — S. Gharibzadeh, M. M. Pedram, M. Khademi, A. Salajegheh, *Trends and Gaps in Machine Learning Based Flight Delay Prediction in Spatiotemporal and Data-Driven Approaches: A Systematic Review* (Applied Soft Computing, October 2026) [NEW]
- **Read:** https://doi.org/10.1016/j.asoc.2026.115761
- **Question:** What have modern studies neglected about uncertainty, explainability and actual deployment?
- **Our connection:** A recent survey to help distinguish academic benchmark results from operationally reliable traveler predictions.
- **Be careful:** Review comparisons pool different problem definitions and should not be used to pick one endpoint after seeing our TEST outcomes.

### P15 — John Fitzgerald, Enrico Spinielli, Allan Tart and Rainer Koelle, *Reference Trajectories: The Dataset Enabling Gate-to-Gate Flight Analysis* (Engineering Proceedings / OpenSky Symposium, 2021 proceedings, online 2022) [PHASE5]
- **Read:** https://doi.org/10.3390/engproc2021013014
- **Question:** How can surveillance trajectories be compared with trusted operational milestones to estimate flight events?
- **Our connection:** Nov 9 ADSB.lol label-error protocol cites this for plausibility of **validated** takeoff proxies.
- **Be careful:** Accuracy conditional on **successfully matched reference trajectories** cannot be generalized to unmatched airports, gaps in radio coverage, or all our future flights. The proxy and true wheels-off must remain differently labeled.

### P16 — Matthias Schäfer, Martin Strohmeier, Vincent Lenders, Ivan Martinovic and Matthias Wilhelm, *Bringing Up OpenSky: A Large-Scale ADS-B Sensor Network for Research* (IPSN, 2014) [NEW]
- **Read authors’ paper:** https://s3.opensky-network.org/website-public-files/publications/ipsn2014.pdf ; publication listing https://opensky-network.org/about/publications
- **Question:** How do distributed aircraft-position sensors work, and what are their coverage/security limitations?
- **Our connection:** Learn why **a track point is an observation**, not an exact guaranteed takeoff event or verified scheduled operating leg.
- **Be careful:** OpenSky’s historic receiver population is not a measured 2026 ADSB.lol coverage map; do not conflate providers.

## 3. The research methods behind our decisions

These papers may be even more useful than another aviation model when learning **how to think scientifically**. Unless stated otherwise they are **new broader context**, not explicit citations in f.8 §19. None proves a chosen numeric project parameter.

### M01 — Kaufman, Rosset, Perlich and Stitelman, *Leakage in Data Mining: Formulation, Detection, and Avoidance* (ACM TKDD, 2012)
- **Read:** https://doi.org/10.1145/2382577.2382579
- **Project question:** “What information did our prediction know at T−6h?” This is why late POST information must never leak into PRE features.
- **Practice:** Draw a timeline for one flight and classify each candidate feature as *available*, *not yet available*, or *unknown*.

### M02 — David R. Roberts et al., *Cross-validation Strategies for Data with Temporal, Spatial, Hierarchical, or Phylogenetic Structure* (Ecography, 2017)
- **Read:** https://doi.org/10.1111/ecog.02881
- **Project question:** How could shared airport, day, tail or route introduce dependency that makes random splits look deceptively good?
- **Practice:** Sketch different holdouts for future days and unseen routes; explain which deployment claim each tests.

### M03 — Vítor Cerqueira, Luís Torgo and Igor Mozetič, *Evaluating Time Series Forecasting Models: An Empirical Study on Performance Estimation Methods* (Machine Learning, 2020)
- **Read:** https://doi.org/10.1007/s10994-020-05910-7 ; author page https://web.cs.dal.ca/~ltorgo/publication/2020_ctm20/
- **Project question:** Why train on earlier times and evaluate on later times?
- **Practice:** Explain 20 TRAIN / 5 VALIDATION / 6 TEST as **our precommitted design**, not a ratio mandated or proven optimal by this paper. Group the same physical flight and its source revisions to avoid leakage.

### M04 — D. G. Horvitz and D. J. Thompson, *A Generalization of Sampling Without Replacement from a Finite Universe* (Journal of the American Statistical Association, 1952)
- **Read:** https://doi.org/10.1080/01621459.1952.10483446
- **Project question:** Why do selection probabilities matter when we deliberately sample different airports at different rates?
- **Practice:** Think through the difference between an estimate for **observed flights in sampled windows** and an estimate for **all airports or travelers worldwide**. Unequal-probability inference needs correct units, inclusion probabilities and assumptions, not just a SHA or a count.

### M05 — Tlamelo Emmanuel et al., *A Survey on Missing Data in Machine Learning* (Journal of Big Data, 2021)
- **Read:** https://doi.org/10.1186/s40537-021-00516-9
- **Project question:** Why does “we didn't receive an actual runway timestamp” differ from “flight departed on time”?
- **Practice:** Make a missingness matrix by airport tier, region, source feed, flight and horizon; distinguish zero eligible flights from no source response and unknown physical events.

### M06 — Tilmann Gneiting and Adrian E. Raftery, *Strictly Proper Scoring Rules, Prediction, and Estimation* (JASA, 2007)
- **Read:** https://doi.org/10.1198/016214506000001437 ; author-hosted PDF https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf
- **Project question:** If a model reports a 70% chance of a disruption, how do we judge whether the probabilities are trustworthy?
- **Practice:** Understand Brier/log score for event probabilities and CRPS for a continuous prediction distribution. Do not compare unlike labels with one metric.

### M07 — Anastasios N. Angelopoulos and Stephen Bates, *Conformal Prediction: A Gentle Introduction* (Foundations and Trends in Machine Learning, 2023)
- **Read:** https://doi.org/10.1561/2200000101 ; authors’ tutorial https://people.eecs.berkeley.edu/~angelopoulos/publications/downloads/gentle_intro_conformal_dfuq.pdf
- **Project question:** How might a future model show an interval rather than pretend to know an exact delay?
- **Practice:** Write down the assumptions for the coverage guarantee. Distribution shift and time dependence can invalidate a naive “90% guaranteed at every airport” claim; f.8 defers full conformal work until later models.

### M08 — Takaya Saito and Marc Rehmsmeier, *The Precision–Recall Plot Is More Informative Than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets* (PLOS ONE, 2015)
- **Read:** https://doi.org/10.1371/journal.pone.0118432
- **Project question:** If severe delays are rare, can a model appear accurate while missing most cases that travelers care about?
- **Practice:** Record event prevalence, precision/recall and calibration by airport/tier, rather than relying on accuracy alone.

### M09 — James Cheney, Laura Chiticariu and Wang-Chiew Tan, *Provenance in Databases: Why, How, and Where* (Foundations and Trends in Databases, 2009)
- **Read:** https://doi.org/10.1561/1900000006 ; university record https://www.research.ed.ac.uk/en/publications/provenance-in-databases-why-how-and-where/
- **Project question:** When we JOIN calendar, source-original, PRE and POST records, can we reconstruct **why a row exists and which inputs produced it**?
- **Practice:** Trace a hypothetical prediction back to original response, request/charge ledger, flight identity and cutoff. A hash alone does not authenticate the provider.

### M10 — Timnit Gebru et al., *Datasheets for Datasets* (Communications of the ACM, 2021)
- **Read:** https://doi.org/10.1145/3458723
- **Project question:** What must a future user of our flight dataset know about origin, intended uses, exclusions, privacy, limits and maintenance?
- **Practice:** Write a one-page datasheet describing the B0062 airport frame, actual Phase 6 collected population, missingness, rights/retention and data version.

### M11 — Margaret Mitchell et al., *Model Cards for Model Reporting* (FAT*, 2019)
- **Read:** https://doi.org/10.1145/3287560.3287596
- **Project question:** How should we communicate to clients what a future model **does not** predict or where it performs poorly?
- **Practice:** Draft a model card for an *untrained candidate* and leave performance numbers “NOT MEASURED,” rather than making a marketing claim.

### M12 — D. Sculley et al., *Hidden Technical Debt in Machine Learning Systems* (NeurIPS, 2015)
- **Read:** https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/
- **Project question:** Why is robust data collection/operational architecture more complex than fitting XGBoost?
- **Practice:** Identify training/serving skew, undeclared data dependencies, stale source timestamps, hidden feedback loops, and configuration changes in our collection workflow.

### M13 — Eric Breck, Shanqing Cai, Eric Nielsen, Michael Salib and D. Sculley, *The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction* (IEEE Big Data, 2017)
- **Read:** https://doi.org/10.1109/BigData.2017.8258038 ; author page https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/
- **Project question:** What tests protect data, model, infrastructure and monitoring when we move from an offline toy to a real system?
- **Practice:** Compare our Phase 5 fail-closed database tests, GET/STOP controls and independent witness to production data/model monitoring. Strong engineering tests do not themselves prove scientific validity or rights.

### M14 — Sarah Ahmed A. AlBassam and Samira Dhafir N. AlShahrani, *Flight Delay Prediction: Evaluating Machine Learning Algorithms for Enhanced Accuracy* (PLOS ONE, December 2025)
- **Read:** https://doi.org/10.1371/journal.pone.0335141
- **Project question:** How do different classifiers behave on imbalanced flight-delay labels?
- **Practice:** Treat the paper’s resampling/classification comparisons as methods to interrogate, not proof that random stratified cross-validation and oversampling are correct for our chronological, geographically structured flight study. Never SMOTE the untouched TEST portion.

### B01 — Gareth James, Daniela Witten, Trevor Hastie, Robert Tibshirani and Jonathan Taylor, *An Introduction to Statistical Learning, with Applications in Python* (book, 2023)
- **Read/book and companion materials:** https://www.statlearning.com/home ; publisher https://doi.org/10.1007/978-3-031-38747-0
- **Why include a textbook?** It provides approachable explanations and Python exercises for classification, regression, resampling, trees, survival/censored data, and evaluation while reading the more specialized papers above.

## 4. Evidence map — what research in OUR repository already supports

Use these actual GitHub starting points:

1. **Binding plan f.8 §19 — Sources & research foundation:** [V3.9_DataCollectPlan_f.8.md](../plans/V3.9_DataCollectPlan_f.8.md). Explicit citations for Chen & Li; Zheng/Wei/Hu; Zheng/Zou/Wei/Tian; Jiaxin Chen et al.; Sternberg review; Liu et al.; Li et al.; Silvestre et al. Also contains **provider documents**, which are API contracts, not academic journal articles.
2. **Nov 9 ADS-B/physical departure error research:** [2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md](../phase5/2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md). Already cites Fitzgerald (OpenSky takeoff-proxy validation), Murad & Ruocco, OpenSky docs, ADSB.lol provider materials and U.S. BTS official reporting.
3. **Nov 9 Amendment E science review:** [2026-11-09_AMENDMENT_E_CROSS_BRANCH_SCIENCE_REVIEW_AND_ENDPOINT_MATRIX.md](../phase5/2026-11-09_AMENDMENT_E_CROSS_BRANCH_SCIENCE_REVIEW_AND_ENDPOINT_MATRIX.md). Clarifies provider runway/revised-time ambiguity, label choices, metrics, same-operating-leg identity and separate target classes.
4. **Nov 9 owner engineering guide:** [2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md](../phase5/2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md). Explains sample size and calendar geometry, but that geometry is a **project design choice**, not something a flight-delay paper establishes.
5. **Database and source traceability:** [PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md](../phase5/PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md). Illustrates why Chen(e)y-style provenance thinking is relevant without claiming the database research *directly tested* V0079–V0083.
6. **Our code truth:** [phase5F8SegmentedSourceCoverage_v39.mjs](../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs), [phase5T24IndependentPostCommitWitness_v39.ts](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts), [gate05RunwayDelayLabelAudit_v39.ts](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts), [tests](../../tests). Read code to see project implementation; papers cannot establish deployment/production status.

### What is from published research vs what is OUR local design?

| Project decision | Support from literature | Still not established by that literature |
|---|---|---|
| Late incoming aircraft/turnaround and network delay dependencies | P02, P04–P08 | That we have permitted, cutoff-safe, correctly matched tail chains for all routes |
| Probabilistic delay minutes and uncertainty | P09, M06–M07 | That our provider labels suffice for this first-cycle primary |
| Separate airborne ETA task | P06, P10 | Future track availability at T−24h; worldwide ETA transfer |
| Physical takeoff proxy from surveillance | P15–P16 | ADSB.lol exact wheels-off or actual-only certification for all flight/airport strata |
| No leakage and future chronological tests | M01–M03 | The **20/5/6** ratio is a project precommitment, not a theorem or universal optimum |
| Geography/tier probabilities and weighted estimands | M04 | That four chosen HUBs plus adaptive selected airports represent worldwide travelers |
| Missingness and censoring | M05 | That unavailable physical outcomes are “on time,” or that missingness is random |
| Original/response/SQL provenance | M09–M10 | A SHA, CI test, installed table, or role grant is proof of source rights/actual flight identity |
| Fail-closed source reservation, owner/witness, reproducibility | M12–M13 | The exact seven spending categories, 31 days, timers, provider prices and API permissions |
| Traveler-ready explanation and limits | M10–M11 | Measured commercial accuracy, route support or final model release readiness |

## 5. Three exercises using our real project

**Exercise A — Label meaning:** Compare these four values without equating them: scheduled gate departure, actual off-block, actual wheels-off, and AeroDataBox revisedTime. Read P11, P15 and our Nov 9 provider-semantic checkpoint. Ask which can be trusted as the label for a specific target and *why*.

**Exercise B — Sampling and representation:** Look at our four HUBs, five fixed paired four-airport sets, and 21 later adaptive batch-days. Read M02 and M04. Write two different claims: (i) outcomes for the actually captured, properly eligible sample; (ii) outcomes for global scheduled passenger flights. What extra inclusion probabilities, frame coverage, missingness and assumptions would (ii) require?

**Exercise C — Audit one model score:** Suppose a complicated model gives strong accuracy on data randomly mixed across all days, but severe disruptions are rare and several later POST updates leaked into earlier features. Read M01, M03, M06 and M08. Explain why the apparent score could be invalid, and propose a chronological train/validation/test evaluation with a simple baseline, missingness counts, calibration and uncertainty.

## 6. Suggested four-session reading journal

**Session 1: What are we predicting?** Read P01, P02, P09. Record exactly what “delay” means in each paper. Compare binary vs minutes vs probability distribution vs airport-level graph.

**Session 2: Where do trustworthy labels come from?** Read P15, P16, P11 and the Nov 9 ADS-B research checkpoint. Draw scheduled gate, actual gate-out, wheels-off, wheels-on and gate-in on a timeline. Leave any unsupported actual event UNKNOWN.

**Session 3: How do researchers avoid fooling themselves?** Read M01, M02, M03, M04 and M05. Write why the sampling frame, eligibility, time ordering, missingness and independent outcome evidence cannot be skipped.

**Session 4: How do engineers make the study operational?** Read M09, M10, M12 and M13. Trace one legitimate prospective original response from authorization through paid reservation, source binding, cutoff-safe PRE, independent witness, and later POST/UNKNOWN. Compare the paper principles with code and tests rather than assuming implementation was proven.

For each reading, keep a notebook entry with: **precise label; unit of prediction; source/data period; design; method; evaluation; major limitation; our project decision; unanswered question.**

## 7. Important boundaries and corrections

- **Not a covert Amendment E approval.** This document is for learning and evidence review. It does not change A–E, main, the scientific primary, model splits, sampling, source retention, API spending, provider rights, or the final Phase 5 release decision.
- **Do not select a primary from observed TEST performance.** A richer continuous delay target is valuable only if its label, matching, legal processing and denominators are demonstrably adequate under rules specified before outcomes are used.
- **Do not mix incompatible aviation targets.** Airport-delay aggregates, airline gate departure, runway takeoff proxy, scheduled-time revision and in-flight ETA are not interchangeable.
- **The KTEB→KBUF exception is an exogenous scheduled-airline scope correction recorded post-initial draw**, not a literature-backed right to swap any low-yield airport. The 31-day geometry/26+3+2, five pairs, six regions, and four slots/day are our protocol decisions and require their own validity checks.
- **Operational status is independent:** The existence of tested modules and installed V0079–V0083 does not make the 31-day unattended owner, release calendar/budget, licensed source use, or Phase 6 GO complete. No new provider calls, migrations, database writes or workflow dispatches were done for this educational atlas.
- **Not legal advice:** Scholarly permissions to read articles do not grant usage rights to AeroDataBox/ADSB.lol flight data. Research source access and provider Content-use/retention permission are distinct.
- **Known metric correction:** Do not repeat the claim that Murad & Ruocco (2026) established a general flight-departure-delay R² ceiling of 0.44. Their cited 0.27–0.44 figure appears in §4.4’s **turnaround-time** comparison.
- **Where older sources are used:** Fundamental work from 1952–2023 is included intentionally. A paper does not become scientifically irrelevant just because a new neural architecture exists.

## 8. Reader's glossary

- **Population / denominator:** Every flight or airport opportunity that counts under a defined question, including eligible members with missing outcomes.
- **Estimand:** The exact quantity the study wants to estimate for a defined population.
- **PRE / as-of:** Data the model genuinely could have known by a specified deadline.
- **POST / outcome:** Later evidence; legitimate for targets, never hindsight features for earlier horizons.
- **Censoring:** Defined partial follow-up for a time-to-event outcome; not a generic replacement for all missing labels.
- **Calibration:** Whether predicted probabilities or interval coverage agree with observed frequencies under the evaluated population.
- **Provenance / lineage:** Traceable origin and transformations of a value.
- **Graph model:** Learns connections among airports/routes, not necessarily the best method for predicting every individual flight.
- **Crossover comparison:** Repeats a sample under alternative window strategies; it is not the flight route between airports.
- **Research review:** Survey/taxonomy, not necessarily a new tested system.
- **Peer reviewed / preprint:** Different evidence statuses; check the linked publication record.

**Closing research principle:** A stronger model is not defined by the number of layers or the amount of data. It makes a precisely defined claim, uses information legitimately available at prediction time, has trustworthy outcomes and denominators, beats an appropriate simple baseline on future data, quantifies uncertainty, and reports where it fails.
