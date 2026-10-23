# Phase 2 — construct the reference frame and define measurable, comparable airports

**Historical work: mainly September 2026.** Phase2 is the bridge from scientific assumptions/financial Gate0 to small real paid airport pilots (Phase2G). It is **not** the October 17 Gate3 paid integration test. Return to [project presentation](../PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md) or [overall roadmap](../README.md).

## Executive answer in 5 questions

- **What?** Decide which airports represent distinct traffic/network contexts, how to measure them, which UTC/time/region strata to balance and what an eligible observed flight means.
- **Why?** A high-yield airport selected after observing its outcome can bias evaluation. A route list from observed transponder tracks is **not** the same as a published scheduled airline timetable.
- **How?** Inspect a fixed historical aviation network reference, define source semantics, build an airport frame with tier/region and exposure design, freeze before treating pilot yields as rank comparisons.
- **Where?** [Original candidate reference freeze](V3.9_PHASE2_REFERENCE_FREEZE.md), [explicit method amendment proposal](V3.9_PHASE2_PLAN_AMENDMENT_PROPOSAL.md), [binding Plan](../plans/V3.9_DataCollectPlan_f.8.md), [Phase2G measured pilots](../phase2g/README.md).
- **What happened?** An externally reconstructed ADS-B-derived observed-movement **candidate** was validated, but it conflicted with original V3.9-f.8 language expecting an eligible scheduled-service reference. Historical reference evidence **does not silently amend** the binding scientific protocol or certify main-run sampling.

## The hard methodological distinction

| Term | Means | Could be confused with | Correction |
| --- | --- | --- | --- |
| **Scheduled-service reference** | Exogenous listed scheduled passenger/commercial service | Observed aircraft ADS-B movements | Licenses, definitions and validity differ |
| **Observed ADS-B movement** | Reconstructed observed aircraft route/position event | A complete schedule or ground-truth runway timestamp | Not every operation broadcasts/appears; filters affect selection |
| **Network degree** | Distinct route connections under a predefined frequency threshold | Total flight volume | Degree and volume capture different hub attributes |
| **Carrier diversity** | Distinct resolved operators | Callsign prefix/marketing carrier count | Code and physical operator can differ |
| **Airport yield** | Verified received/deduplicated exposure-based events per unit time | All eligible flight departures at airport | Requires independent denominator to assess representativeness |

[Reference freeze record](V3.9_PHASE2_REFERENCE_FREEZE.md) reports a **2026-09-13** GitHub rebuilding/validation of an MrAirspace/ADSB.lol four-quarter candidate spanning **2025-07-01 to 2026-06-30 UTC**: **2,295 airports** and **27,669,229 resolved observed movements**, across its documented six-region groups, with WSSS and OMAA fields present. The report labels the candidate `OBSERVED_ADSB_DERIVED_NOT_PUBLISHED_SCHEDULE`; its test status was `PASS_CANDIDATE_SOURCE`. This proves **repeatable candidate construction and checksum**, not that 27m records are *all globally scheduled departures* or that the Plan's binding reference substitution was approved.

## Why did the original Plan and the source disagree?

The frozen V3.9-f.8 plan initially used **scheduled departures** for network features. The accessible MrAirspace quarterly source reconstructs **observed** aircraft movements from ADS-B. Replacing one with the other silently would change a scientific **construct** under the same label: a metric might be accurate at measuring observed movements while wrong at measuring published scheduled service.

The [proposal](V3.9_PHASE2_PLAN_AMENDMENT_PROPOSAL.md) therefore proposes **prospectively** switching only after explicit approval, recording source semantics, a fixed four-quarter reference, source-license/provenance and variable definitions such as directed in-/out-degree and a deterministic observed-movement threshold (historically suggested **53 movements/year ≈ once per week**, not claimed to be a schedule). The document is a **proposal**, not a binding final revision; never silently overwrite the old Plan's original numeric reference.

## Small sampling design — statistical necessities versus negotiable project rules

**Necessary:** define the population of eligible observed flights and intended estimator; avoid time leakage, carry input selection provenance, stratify by airport-region/tier/time class when studying transfer/generalization, examine route/airline clustering and intra-airport dependence, quantify coverage and uncertainty, freeze selection before inspecting its outcomes.

**Project-specific and amendable:** the original **five-anchor** requirement or exact 100% transport instrumentation rate is not a universal scientific law. The later user-approved *prospective* candidate four-anchor strategy selects **WSSS, OMAA, SKBO, YSSY**, and rotates two independent MID airports + one REGIONAL with a HUB per normal parent batch, six UTC time classes and matched crossover comparisons. YSSY's historical 231/229 exact-accounting failure stays immutable even when future designs choose to include separately qualified YSSY observations. **MMUN** is not promoted as a future anchor after low yield/identity limitations; it remains historic evidence, not an airport that “doesn't exist.”

A planned 31-parent-batch design under discussion includes 26 ordinary 4-hour days, three split days (2×2h) and two up-to-6h days and five matched pairs. This plan is **not yet a released Phase5 calendar nor proof of global airline-route coverage**; actual independent FIDS population/airport time and feasible budgeting must be checked first. See [Phase3–Phase6 scoped roadmap](../phase3/2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md).

## Why Phase2 mattered — and what delayed it

A reference frame is what allows us to discuss **generalizability**, not merely count callbacks. Exogenous sampling avoids circularly choosing only airports that performed well in preliminary tests. Distinguishing observed movement from scheduled service prevents semantic leakage in feature definitions. It took effort because accessible/licensed sources constrained the design, quarterly release cadence differs from arbitrary rolling “latest 365 days,” carrier and airport resolution can be incomplete, and historical definitions were frozen.

But we also added time by repeatedly reconsidering *perfect* cohort composition and conflating “does not meet original proprietary reference text” with “has zero exploratory scientific value.” A better approach is to explicitly version and freeze a **new** observed-network study with its actual target population, confidence/limitations and a smaller honest scope, rather than endlessly seeking an ideal global schedule without a license.

## Proof and literature

- [Source/algorithm/quarter evidence](V3.9_PHASE2_REFERENCE_FREEZE.md) (Sep13 workflow **34732924481**; pinned checksums and known unresolved semantics); [proposed plan amendment](V3.9_PHASE2_PLAN_AMENDMENT_PROPOSAL.md).
- [Phase2G exact site-level results](../phase2g/README.md) · [original Plan](../plans/V3.9_DataCollectPlan_f.8.md) · [original evidence](../evidence/README.md).
- [NIST data fitness for purpose](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html) explains why data completeness, relevance and consistency are distinct properties; [STROBE reporting](https://www.strobe-statement.org/checklists/) calls for reporting selection, missing data and limitations.
- [September Phase2 reference provenance](V3.9_PHASE2_REFERENCE_FREEZE.md): the proposed open ADS-B reference carries external licensing and comparability restrictions; consult the actual source dataset's rights for reuse. **A validated source checksum is not independent proof of schedule completeness.**

**Next step:** [Phase2G actual paid fieldwork and failures](../phase2g/README.md). Its reported site yield and small-credit gaps must be interpreted using these fixed construct definitions and original source records.
