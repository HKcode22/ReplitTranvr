# DRAFT — research-only small-gap classification implementation

Branch-only code proof; **not deployed, not a change to the frozen P25 owner/workflow/database status, and not permission to rerun paid provider subscriptions.**

`server/lib/disruption/prospectiveResearchQualification_v39.ts` implements a **pure** evidence evaluator. Explicit proposed example tolerances: <=2 credit-units and <=1% missing debit, both required; these are *project choices to validate* and are **not** scientific universal thresholds. It reports `QUALIFIED_RESEARCH_CANDIDATE` rather than official paid protocol PASS, and independently refuses incomplete observations, unsettled external accounting, retained active billable subscriptions, unverified source custody, source-cost discrepancies, and hard identity violations.

The associated Vitest suite checks a **hypothetical 229/231** fixture (99.134%), keeps `historicalReconciliationStatus='DELIVERY_GAP'` and `historicalConfirmatoryPass=false`, and negative cases. The fixture's `sourceCustodyVerified=true` is an assumption for testing only: production YSSY provenance still needs actual independent verification. No database accesses, no provider operations, no long-running job, and no automatic promissory waiver.

To adopt for a **future paid confirmatory run**, scientifically approve/pre-register the numeric thresholds *before collecting that run*, adapt the normative Plan/Log and source SHA, add signed scientific identity/output eligibility, integrity/retention and missingness-bias gates, owner/watchdog isolation tests, released CI, and publish a new provenance-bound version; never change a historical failed GitHub job to green. A new green research-inventory badge may be added separately after YSSY custody/cleanup audit without rewriting that job.

Scientific rationale (not a tolerance mandate): STROBE observational reporting item 12(c/e) requires missing-data handling and sensitivity analyses; observational data may be usable with incomplete observations, but missingness assumptions (MCAR/MAR/MNAR) affect bias. https://pmc.ncbi.nlm.nih.gov/articles/PMC2020496/
