# Phase 0 — define the research question and scientific validity before spending money

**Historical foundation (September 2026); not a present-day payment or live-run authorization.** Return to [data-collection home](../README.md), [boss-ready case study](../PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md) or [current Plan](../plans/V3.9_DataCollectPlan_f.8.md). **What was done:** seven historically preserved AI/technical review documents, the earlier question/request, and a collection of experiment-design concerns. The eight original Phase0 files were relocated byte-for-byte; navigation prose is editorial, not original source.

## Five things to tell a peer

1. **What:** Phase0 asked whether aviation delay prediction could be formulated as a reproducible *measurable* problem rather than a pile of API responses.
2. **Why:** A model built on incorrectly timed, selected or mislabeled data can look accurate while predicting with information unavailable at decision time.
3. **How:** Review sampling, cutoff time T, physical-flight identities, source provenance, planned outcomes, missingness, endpoints and budget limitations **before** treating any pilot as scientific validation.
4. **Where:** [Seven original review narratives](reviews/README.md), [original request](requests/confused.md), [binding current plan](../plans/V3.9_DataCollectPlan_f.8.md) and [implementation](../implementation/README.md).
5. **Result:** Important questions and scientific constraints were documented; **Phase0 historical reviews do not prove a live system is safe, a sample is representative, or any model has validated predictive power**.

## Scientific question: what would we actually learn?

The eventual target is a **departure/runway-delay outcome** for a uniquely identified physical flight. Define one target per flight/decision time; use only predictors available at that `as_of T`. Never incorporate a provider status that arrived *after* T as a predictive feature for T (future leakage). Define the eligible flight population before looking at an airport's observed yield; account for time zone, time-of-day and day-of-week classes, international/domestic composition, airport congestion, airline and weather context when permitted. A time-sliced API sample is **not** necessarily a random sample of all aircraft departures.

The dependent outcome may require an external, independently sourced actual-departure/runway timestamp. Estimated schedule fields and transport reception time are not necessarily runway-off-block labels. Report *which* timestamp measured what and whether it was observed before a prediction cutoff. Phase0 exposed such questions; it did not automatically answer every label and FIDS coverage concern.

## Phase0 review topics and the science behind them

| Critical issue | Why it matters / what later phases must verify |
| --- | --- |
| Construct validity | Is the outcome **runway departure delay** rather than generic gate/event update delay? Are schedules, actuals and event semantics differentiated? |
| Measurement unit | Webhook **message** vs flight **item** vs normalized **physical flight**: duplicates/retries and marketing callsigns can inflate apparent sample size. |
| Selection bias | Airport anchors, high-frequency routes and reliable callbacks can exclude low-coverage regions and systematically delayed or hard-to-deliver flights. |
| Time and leakage | Store provider event timestamp, receipt timestamp, and prediction `as_of T`; never backdate revised values. |
| Missing observations | Missing completely at random (MCAR), missing at random (MAR) or not at random (MNAR) mechanisms change whether complete-case estimates are credible. |
| Statistical uncertainty | A one-credit missing send does **not** automatically void every observed item; nor does a 99% billed-credit ratio prove unbiased flight-population coverage. |
| Operational boundaries | Estimate provider Alert credits **and** API units, account security, retention and one-shot authorization before paid experiments. |

### Scientific examples

If 229 item-credits reached durable storage from 231 billed sends, `229/231=0.99134` describes **billed-item capture**. It does not show *two physical departures missing*, and it does not quantify the effect on delay-distribution inference without knowing which observations were missing. Likewise one pilot site with 100 observations tells little about global coverage without a selection model or independent denominator. A valid future sensitivity analysis could compare observed airports/time classes and bound an outcome estimate under plausible lost-flight scenarios. **Never say a universal one-percent threshold exists in NIST or STROBE.**

NIST defines data quality as fitness for purpose across accuracy, completeness, relevance, reliability etc. [NIST RDaF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html). STROBE asks observers to report their missing-data handling and sensitivity analyses; it is guidance for observational reporting, **not a probability proof or certification of this project's validity** [STROBE](https://www.strobe-statement.org/checklists/). Rubin's missing-data research makes the assumptions behind ignoring missingness explicit [Rubin 1976](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b).

## What took time; what was avoidable?

**Necessary effort:** choosing the correct physical-flight unit, timing contract and data sources before irreversible paid data were collected; repeated AI reviews raised real unresolved design questions. **Avoidable effort:** accumulating seven sequential narrative reviews without one concise operative decision table; later readers treated speculative AI statements and old tentative plan numbers as current acceptance criteria. Better process: write a single versioned hypothesis/estimand sheet and track questions as resolved, rejected or deferred. Once a genuine issue is captured, avoid restarting the entire methodology debate without new evidence.

## Historical review navigation and exact provenance

- [Review 1](reviews/gptP0analyze.md), [2](reviews/gptP0analyze2.md), [3](reviews/gptP0analyze3.md), [4](reviews/gptP0analyze4.md), [5](reviews/gptP0analyze5.md), [6](reviews/gptP0analyze6.md), [7](reviews/gptP0analyze7.md) — **AI-generated historic analyses**; inspect dates and actual supporting evidence before quoting as empirical findings. File order is not proven chronology.
- [Original user concern/request](requests/confused.md) — archived context; **not** a new owner instruction.
- The eight historical source files were moved unchanged from `docs/history/phase0/`; see [Wave C2 provenance checkpoint](../../docs/repository-maintenance/2026-10-15_WAVEC2_PHASE0_PHASE1_RELOCATION_CHECKPOINT.md). An earlier review index's claim that #4 lived at root was corrected in new navigation text; the original seven reviews were not rewritten.

**Next logical handoff:** [Phase1/Gate0 financial and source-account evidence](../phase1/README.md); then [Phase2 frame/reference](../phase2/README.md). **Historical Phase0 is not a current experimental PASS.**
