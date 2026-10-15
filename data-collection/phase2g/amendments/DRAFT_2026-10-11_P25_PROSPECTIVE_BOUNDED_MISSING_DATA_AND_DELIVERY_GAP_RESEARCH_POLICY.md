# DRAFT ONLY — P25 prospective bounded missing-data and delivery-gap scientific policy
**Created 2026-10-11 PDT. Status: SCIENTIFIC_REVIEW_REQUIRED, NOT APPROVED, NOT BINDING, NOT IMPLEMENTED IN PAID ACCEPTANCE. No historical reclassification or provider change.**

## Scope, provenance and precedence
- Binding `SEPmd/V3.9_DataCollectPlan_f.8.md` §§11.2, 20.1 and 20.4 and its newer amendments require **exact** `C_external == C_internal` for primary Stage1 scientific acceptance. Live `server/lib/disruption/prepaidProbeWindow_v39.ts` enforces `PROBE_DELIVERY_COMPLETENESS_FLOOR_V39=1`, with `DELIVERY_GAP` diagnostic **NON-scoreable**. The Implementation Log cannot override this.
- A distinct **2026-09-22 proposed** reconciliation-v2 amendment (`SEPmd/PHASE2G/V3.9_PHASE2G_COMPACT6_RECONCILIATION_AMENDMENT_20260922.md` §C.3) suggested for *anchor probes only*: positive gap **at most 1 billed credit**, delivery completeness **at least 0.99**, no cost/item contradictions, resolved settlement, uncensored 120min, and all safety/cleanup gates, with external billed credits as yield denominator. It explicitly kept canary/smoke exact. **The later binding f.8 text disallowed treating that proposal as live approval** and forbade calibrating tolerance from a historical one-credit failure. It must not be silently reinstated.
- Historical YSSY P2G22: external **260**, internally received **259**, `delivery_gap=1` / **0.384615...% of billed credits**, `DELIVERY_GAP`, terminal failed under exact freeze. P2G23 & P2G24 failed/censored/UNRESOLVED. None can become `MATCH` or completed because of a new proposal.
- Source risk mechanism: an AeroDataBox attempt may debit Alert credits when sent even when Replit ingress cannot accept its HTTP POST. Autoscale startup/shutdown is plausible but **not proved** as the cause of P2G22 260/259; one billed credit is **not unconditionally one missing distinct physical-flight instance, one model row, one 15-minute bin, or one independent observation**.

## Research question and recommended dual analysis
A defensible experiment need not discard all accurately observed data merely because some data are missing. HOWEVER, a scientifically useful **partial/qualified exploratory** data set is NOT a confirmatory 120-minute matched Stage1 `completed/MATCH` anchor.

1. **Original confirmatory track (unchanged):** authoritative stable settled external balance, complete 120-minute matching window unless separately classified cap-censored under frozen rules, correct physical-flight-instance-v2, exact original receipt/cost/item match, and proven owned subscription cleanup. Only an original exact `MATCH` can be promoted under the frozen current score/rank protocol.
2. **Prospective supplementary track (proposed):** classify `QUALIFIED_PARTIAL_EXPLORATORY` *outside the paid run status machine* for transparently incomplete, source-integrity-vetted observations. Preserve exact provider credit spend, unmodified raw source and UTC, failed/censored status if applicable, all `DELIVERY_GAP` records, missingness windows, validation provenance and complete/incomplete 15-minute bins. Use only observed physical v2 flights for measured outcome counts; denominator for yield-per-credit is **all settled billed credits**. Make no inference that missing items have zero delay or that successful health GET implies recovered sender attempts. Report uncertainty and sensitivity.
3. **Unbounded or unsafe track:** if provider settlement, exact account ownership, original-source durability, missingness opportunity/identity, protected budget or 168h privacy-safe custody is unresolved, output `UNRESOLVED_NO_SCIENTIFIC_PROMOTION`. An operator cannot waive safety/financial constraints through a percentage.

### Prospective eligibility prerequisites (no tolerance authorized merely by meeting them)
- Existing Gate0, safety smoke/canary, authorizations, paid owner stop, 500-credit cap, 1,000-credit account floor, `maxDeliveryRetries=0`, signed receiver+P06 custody, 168h retention and non-leaky cleanup **unchanged**.
- Independent authoritative >=3-read stable external accounting and no foreign billable subscription; exact 1:1 provider `costCredits` vs flight items **for each actually received webhook**; no unknown untracked duplicate, receipt corruption or fake ACK.
- Record `C_external`, `C_internal`, signed outbound attempt evidence *if actually available* (otherwise label sender-attempt count `UNKNOWN`), positive gap size, fraction `gap / external`, start/stop UTC and complete fraction of each original 15-minute bin. Never equate health-check 3 minutes with a specific missing-flight fraction.
- A review must freeze BEFORE additional paid data: a tolerance threshold (possible candidate from the historical **PROPOSED, NOT BINDING** 2026-09-22 scheme is **gap <=1 credit AND billed completeness >=99%**) AND a rationale based on *independent* transport reliability/capacity evidence and matched cross-airport sensitivity. The P2G22 one-credit outcome is **not an acceptable calibration set**.
- For physical flight delay outcomes, report outcome-dependent missingness (MNAR) risks, airport/time-bin comparisons, and worst-case or `delta` sensitivity. An unknown lost flight may be highly delayed even when a small fraction of credits was lost. Absence of independent sender attempted-item identity means per-flight missingness bound is **UNKNOWN**.
- Report observed-only scientific estimates, uncertainty, and comparability separately; no replacement of missing time bins with zero, no promotion to confirmatory ranking/top-5/phase2 Stage2 on this exploratory label without a separate preregistered redesign and independent scientific approval. A completed but mismatch run is **not** retroactively `MATCH`.
- If the 120-minute exposure is truncated, retain the `duration_censored=true` classification. Even a tiny gap does not permit calling a 60-minute stopped run 120-minute complete.

## Proposed machine-readable outcomes — future research interface ONLY
`EXACT_CONFIRMATORY_MATCH`: existing original exact-MATCH logic, unchanged.

`PARTIAL_EXPLORATORY_POTENTIALLY_ANALYZABLE`: original exact gate did not pass, data retained with traceable missingness; prospective research review gates pass; **not** a production acceptance status, not scoreable against complete Stage1 anchors.

`INDETERMINATE_MISSINGNESS`: source attempt count/number of possibly missing flights unbounded; observed data can still be described, but robust 120-minute estimand not established.

`SAFETY_OR_ACCOUNTING_VETO`: unresolved account spend, authentication, custody, ownership, retention, source integrity or scientific clock/identity; do not launch additional subscriptions.

## Illustrative error arithmetic (NOT acceptance evidence)
For P2G22, `1 / 260 = 0.003846153846...` or **0.3846% billing-credit discrepancy**; `259 / 260 = 99.6154% billed-credit reception ratio**`. These describe the credit ledger, **not physical-flight completeness**. A single sender event could contain multiple flights, and missingness could be correlated with adverse delay outcomes.

A bounded-outcome sensitivity estimate would require **independently verified count of missing distinct target observations** and defensible lower/upper possible delay. With `n` observed target observations of sum `S` and exactly `m` missing target values bounded `[L,U]`, a deterministic full-population mean lies in `[(S+mL)/(n+m), (S+mU)/(n+m)]`. Here `m` is **NOT proven by `C_external-C_internal`**, so this formula cannot be applied to YSSY solely from 260/259. Further sensitivity must account for repeated flight updates and dependent chain links.

## Supporting general methodological sources (not aviation-specific allowable percentages)
- STROBE (2007): report missing values, methods, exclusion and sensitivity analysis, rather than claiming incomplete observational data is automatically unusable: https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/
- STROBE Explanation and Elaboration (2007), item 12(c): distinguish complete-case, assumptions and bias: https://pmc.ncbi.nlm.nih.gov/articles/PMC2020496/
- US National Research Council (2010) *The Prevention and Treatment of Missing Data in Clinical Trials*: transparency about missingness mechanism and sensitivity analyses: https://www.nationalacademies.org/read/12955/chapter/7
- Project’s original illustrative one-credit/99% draft: `SEPmd/PHASE2G/V3.9_PHASE2G_COMPACT6_RECONCILIATION_AMENDMENT_20260922.md` C.3. This is historical project design provenance, not an external industry standard.

## Approval and release requirements
**Current stage:** `DRAFT_NOT_APPROVED`. No edits to the binding f.8 Plan, historical Implementation Log, frozen manifest or paid owner reconciliation acceptance from this document. To adopt: independent scientific lead/PI review of estimand, bias impact, external send accounting, threshold justification and variance/power sensitivity; prospective amendment before a new paid run; hash freeze, machine-verifiable validator/tests, separate AUTH and explicit final GO. Historical failed runs remain failed. Tonight’s YSSY must not launch on this proposed loosened rule while genuine infrastructure/custody/release blockers are open.
