# Phase 4 Gate 5 — retained same-cohort FIDS candidate turnover audit

**Date:** Friday, October 30, 2026 PDT. **Execution:** zero-provider/read-only GitHub Actions, no new FIDS GET, no DB write, no retention extension, no Replit command. Same October 31 WSSS scheduled-departure cohort 17:00–18:00 UTC.

## Why this work is needed

The existing live funnel and PRE engine can count original FIDS observations and candidates at each horizon, but cannot show candidate membership turnover as the *same one-hour WSSS cohort* is reread at T−24h, T−6h and T−90m. That difference matters for evaluating source stability and future population representativeness. Do not equate provisional analytic identities with unique physically operated flights; especially do not claim "appearing in a later FIDS query" means a new real-world flight or "absent" means cancellation.

## Code and validation

- New `server/lib/disruption/phase4Gate5RetainedCohortDrift_v39.ts` runs one bounded SQL SELECT against **original retained** `clean.fids_query_response` and normalized `clean.flight_population` in the same service cohort and same audit clock. It requires original raw to be present and unexpired and applies the already frozen **24-hour** original-source age ceiling.
- Source response hashes must match, both query/member availability clocks must be consistent to <1ms PostgreSQL timestamp precision, and only requested-airport **primary** rows are candidate members. Duplicate provisional identities within a query are not counted as additional flights.
- At each frozen **earliest candidate cutoff** (Oct30 17:00Z, Oct31 11:00Z, Oct31 15:30Z), use the newest **retained** query with original available_at at or before that cutoff. Future cutoffs are `NOT_YET_REACHED`; missing/expired original receipts are `UNOBSERVED`, not zero flight counts. This is *not* a per-flight source-selected-T certificate.
- If two successive cutoff receipts are retained, report aggregate reappearing, appearing, absent-from-later-query and schedule-changed **provisional IDs**, never the identifiers or raw content in logs. Where a source is absent or expired, differences are NULL/UNKNOWN and no historical backfill is attempted.
- This audit is integrated in the current protected `scripts/v39_gate5_source_inventory_readonly_actions.ts` `REPEATABLE READ READ ONLY` transaction, and thus runs automatically on its protected main-push workflow and the existing Oct31 03:07/07:37 paid-run post-GET audit and 12:15/15:15 PDT outcome audits. No changes to either time-critical scheduler.

## Important observed retention limitation

The already successful first WSSS source receipt was at **October 30 13:49Z**. By the T−90m sample on October 31 14:37Z, it will be **24 hours 48 minutes old** and therefore outside this audit's fixed 24-hour raw-read ceiling. **We cannot claim complete T−24h vs T−90m original-source turnover from retained original bytes at the later audit**, even if both successful later requests run. No retention rule will be stretched to hide this; T−24→T−6 turnover may be computable in the earlier audit, while T−6→T−90 turnover may be computable in the later audit. This is explicit missingness, not zero yield.

## Science hold

The comparison reports source-observation diagnostics only. Provider-native selected T, confirmed operating/codeshare identity, sampled commercial population, actual-only wheels-off semantics, certified persisted PRE and webhook/target coverage remain unverified; no Gate 5 PASS, Phase 5 FREEZE or Phase 6 authorization. The user accepts bounded missingness but does not authorize invented values, backdating, or fabricated coverage rates. The latest live audit run URL and test result should be added after the PR checks/merge.
