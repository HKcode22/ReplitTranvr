# Phase 2G: pragmatic missingness, delivery gaps, and progress policy — DRAFT (2026-10-12)

**Status: PROPOSED ONLY — NOT ADOPTED, NOT AN AUTHORIZATION, DOES NOT CHANGE THE FROZEN P25 YSSY RUN.**
Authoritative current baseline: `SEPmd/V3.9_DataCollectPlan_f.8.md` §§0–21; paired `SEPmd/V3.9_IMPLEMENTATION_LOG.md`; compact-six/physical-v2/P25 prospective freezes. Those files and all earlier observations remain unchanged. This draft is a separate review stream from YSSY release PR #35, whose reviewed code, hashes and release candidate must remain untouched.

## Why this proposal exists

After August–October 2026 engineering work, the research has accumulated many conservative project-specific binary gates. Plan §0 explicitly prioritizes P0/P1 validity over P2/P3 diagnostics and says to stop theoretical redesign once contradictions close. Plan §11.2 explicitly allows a separately measured and pre-frozen **PRODUCTION** tolerance in the future; the isolated Gate-3 canary remains exact. `SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md` and the compact-six amendment currently restrict promotion to exact MATCH. Relaxing promotion requires a **new, pre-outcome, versioned scientific amendment, matched code/tests and manifest freeze**. It cannot be done retroactively for P2G06 (220 vs 219), P2G22 (260 vs 259), or P2G24 (UNKNOWN), nor mid-way through P25.

## Crucial distinction: four independent axes, not one binary PASS

1. **Billing safety/accounting:** settled provider balance is authoritative. A discrepancy must remain recorded with amount, sign, evidence, unknowns and settlement state. Never infer nonexistent credits, mark MISMATCH as MATCH, reuse funds, bypass protected floor/ceiling, or continue when exposure is ambiguous.
2. **Raw source integrity:** immutable bytes/hash/source-time/identity for each *received* item; no fabrication of never-received sends. Acknowledged-but-not-durable is a correctness defect, not an ordinary statistical missing value.
3. **Scientific usability:** observed valid measurements can contribute to explicitly scoped ML training or exploratory descriptive analysis despite other missing records. Whether a complete *anchor-yield estimate* remains acceptable is an independent question: unknown missing notifications may bias the numerator and per-credit yield. Maintain dataset flags `observed_valid`, `missing_known`, `missing_extent_unknown`, `source_integrity_valid`, `reconciliation_gap`, `score_eligibility`.
4. **Operator/reliability SLA:** transient GET/callback-health failures are not proof of lost source data. Retain bounded recovery while preventing unsafe billing, silent data loss and label leakage. Root cause investigations can be tracked separately from a one-shot experimental start.

## Candidate future policy (NOT a currently approved numeric threshold)

A. **Retain zero tolerance for hard P0:** unauthorized active billable subscriptions, inability to bound paid exposure, identity splits/double counts, incorrect label source, future-known features, false acknowledgements before durable custody, fabricated external credits, schema contract mismatches, secret leaks, breached retention/license, or mutation of frozen historical evidence.

B. **Keep exact equality for small isolated Gate-3 canary**, as required by §11.2. Its purpose is to validate delivery/billing instrumentation and establish a baseline, not to define an allowable whole-run missingness fraction.

C. **Introduce a *candidate* future 'bounded-gap/degraded-but-usable' tier** distinct from full certified/comparable anchor score. A preliminary *engineering discussion range* could be 0.5%–1% of **independently verified** sender attempts/items, but there is **no scientific justification yet to accept either number as the primary validity cutoff**. Validate against representative independent pre-change trials, intensity/time-of-day/airport/delay strata, extreme-delay stress cases and actual ML score/anchor membership sensitivity, then select and freeze a justified threshold before seeing outcome data. If original sender count is unavailable, observed fraction is a lower-bound completeness estimate or UNKNOWN, **not 99% by assumption**. Example: WSSS 219/220=99.545% received by credit count yet selective missingness remains possible; it is historical sensitivity data, not calibration permission.

D. **Measure bias, not only aggregate percent:** report gaps by provider-attempt time, 15-minute time bin, UTC slot, airport, flight outcome/severity when known, delay tails, flight/route/tail identity and callback health state. Distinguish missing completely at random / at random conditional on observed covariates / not at random as hypotheses, not proven labels. Include worst-case or plausible adversarial bounds on unique flights per authoritative credit, tail-chain links, stability and final-five membership. If selection changes across bounds, call `INSUFFICIENT_EVIDENCE`, not success. Do not assume extreme missing delayed flights have the same distribution as observed flights.

E. **Proposed data tiers:** `A_VERIFIED_PRIMARY` (exact certified protocol), `B_DEGRADED_OBSERVED_ONLY` (valid received records, missingness/exposure disclosed; future eligible only for pre-specified analyses passing sensitivity checks), `C_DIAGNOSTIC_ONLY` (identity/denominator unresolved), `D_EXCLUDED_CORRUPT` (untrusted measurements). Existing historic statuses are not rewritten. Credit status remains an orthogonal field, never a proxy for data class. No use of B for official §9.2 score normalization until prospective amendment plus tests explicitly authorize it.

F. **Optional features/weather/history:** keep NULL plus missing indicators when unavailable at prediction cutoff; do not block snapshot/population creation or inject later-known substitutes. Future scoring can allow missing optional columns with pre-defined per-model coverage criteria and report per-feature missingness. Preserve chronological/airport/tail group boundaries, no preprocessing on the test set.

G. **Engineering evidence proportionality:** one code owner, targeted negative tests plus one integration suite, source/deployment binding, essential signed ingestion test and budget preflight. Record P2/P3 instrumentation/observability improvements as follow-up work. Do not require a 120-minute *local* synthetic rehearsal as a universal paid-entry gate if it has not been prospectively frozen; it is supplemental and is not a hosted Replit ingress proof. Current P25's specific contracted gates are unchanged.

H. **Approval process, without indefinite redesign:** propose a prospective policy only after read-only sample audit and synthetic sensitivity analysis; freeze the version, numerical criterion, baseline population/denominator, missingness audit windows, worst-case calculation, and intended permitted uses before the *next* affected paid cohort. Update Plan §11.2/§11.3, §9.2/§9.1, §5 missingness and Log §§1, 5–7, 12, 20–23 with exact cross-reference and tests in one small PR. Leave frozen prior cohort and P25 unchanged. The design threshold is a project decision justified by empirical sensitivity, not a universal theorem.

## Mandatory models/analysis safeguards that should stay

- Physical-flight-instance-v2, stable provenance, no code-share duplicates, proper tail-chain identity.
- Correct population denominators independent of webhook capture; explicit no-capture and missing feature flags.
- Train/validation/test split by time and groups, with prediction-cutoff availability; protect the test set.
- Data collection and analysis of outages should not be outcome-adaptively stopped or cleaned up to make results look better.
- Complete disclosure of dates, source versions, surviving rows, gap bounds, observed rate, exclusions, baseline model and sensitivity analysis.
- Provider balance/authorization, hard cap/floor, least privilege, raw retention/law, and independent paid owner remain hard constraints.

## Research foundation and transfer limits

- Sterne et al. (2009), *Multiple imputation for missing data in epidemiological and clinical research: potential and pitfalls*, BMJ: missingness mechanism drives bias; complete-case results can be biased. https://www.bmj.com/content/338/bmj.b2393
- National Research Council (2010), *Prevention and Treatment of Missing Data in Clinical Trials*, esp. sensitivity analysis recommendation 15: robustness to missing-data assumptions must be assessed. Domain differs from aviation; principle transfers, not any fixed numerical tolerance. https://www.nationalacademies.org/read/12955/chapter/7
- scikit-learn official, *Common pitfalls and recommended practices*, data leakage, split-before-fit. https://scikit-learn.org/stable/common_pitfalls.html
- scikit-learn official, *Cross-validation: time series*, naive K-fold may overstate accuracy with temporal dependence. https://scikit-learn.org/stable/modules/cross_validation.html

## Decision and stop rule

**Do not change the live P25 accounting tolerance, strict safety preflight, exact AUTH, or historic disposition today based on this proposal.** Workstream owner should separate the question “may valid observed rows be useful for ML?” from “can we claim a fully observed, comparison-valid 2h Stage-1 anchor score?” An evidence-backed future acceptance tier can answer YES to the first without pretending YES to the second.

**Status:** independent methodological proposal, no run authorized, no production code or baseline Plan edit. Next: review the diagnostic sample and pre-register thresholds; then approve targeted plan/log text + tests before future collection.
