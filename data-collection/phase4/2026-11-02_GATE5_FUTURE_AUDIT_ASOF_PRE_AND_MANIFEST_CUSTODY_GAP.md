# 2026-11-02 Phase 4 Gate 5 — future independent audit source/PRE exactness repair

**Status:** offline engineering, zero provider and zero production DB writes. The running Nov 2 T−90m paid source job and separately merged automatic nonretained closeout remain unchanged. Binding Plan `../plans/V3.9_DataCollectPlan_f.8.md` §§5–7, 16–17, the hash-locked `../implementation/V3.9_IMPLEMENTATION_LOG.md`, and related #200, #293 and #300 are unchanged.

## Verified preexisting gap

The new-cohort generic read-only auditor `server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39.ts` previously counted a PRE row if its `population_query_id` belonged to *any* retained FIDS query for the requested airport + service interval. It did **not** ensure that:

1. PRE's `fids_response_hash` was the same immutable retained response hash,
2. the original query and normalized flight/member were available no later than that PRE's frozen historical cutoff,
3. the original normalized member was the *same physical* flight identity as the stored snapshot,
4. the original member was requested-airport-primary, confirmed-core, confirmed operating leg, and not independently expired.

That weak join could overcount retrospectively linked / cross-leg PRE rows. A separate defect in labeling was more subtle: the auditor returned caller-provided `reviewedFrozenManifestSha256` verbatim, although the present clean FIDS table does not contain a verified query-to-frozen-manifest relation. Filtering only airport/window is **not** independent SHA-bound source membership.

## Engineering changes

- Replaced the PRE subquery with a strict read-only join on original FIDS query ID plus response hash, parent available-at <= stored snapshot cutoff, and an `EXISTS` original normalized member matching **all** of query ID, response hash, exact canonical flight instance, airport, service window, requested-airport primary and confirmed operator; member must be unexpired and available between parent time and snapshot historical cutoff. This still counts candidate inventory only, not authenticated source-native scheduled-T or earliest frozen builder proof.
- Explicit result flags `frozenManifestToOriginalSourceMembershipVerified:false`, `persistedPreNativeSelectedTAndBuilderCertified:false`, `retainedSourceRightsIndependentlyVerified:false` and `sourceInventoryIsScopedByAirportAndWindowOnly:true`. They remain false even if all SQL counters are positive. The requested reviewed manifest SHA is a scope **label**, not a verified custody relationship.
- Test coverage for matching source hash, exact leg/source context, data availability cutoff, qualified role, expiration and no provider/SQL mutations. Existing disposable PostgreSQL and full repository CI must pass before merge.

## Remaining work, before any real source-carrying next-cohort approval

- Add an authenticated, logged **original FIDS receipt → exact allowed query digest → V0076 frozen manifest SHA** mapping, with immutable DB constraints plus independently verified publisher/provenance and source content expiry semantics; review its migration under staged development, never bypass approved production role isolation. A V0076 physical GET reservation **alone is not** proof that source bytes arrived or that they belong to a particular retained query.
- Extend the independent read-only auditor to demand that retained mapping before announcing `frozenManifestToOriginalSourceMembershipVerified:true`; use a single source/ledger `REPEATABLE READ READ ONLY` transaction for cohort, postflight outcome and reserved-attempt reconciliation. Until then these returned counters are *exploratory/diagnostic*, not a complete original denominator or certified PRE.
- Close external provider-native selected-T/actual-only runway semantics #200 and source usage/retention rights #300, then freeze a genuinely future source-carrying cohort under #293. Nov 2 nonretained pilot **cannot be converted retrospectively**.
- Maintain scientific **Gate 5 HOLD**, Phase 5 FREEZE HOLD, Phase 6 NO-GO regardless of green CI. No Cloudflare, Replit Agent, Replit timed commands or new paid action authorized by this patch.

**Operator action:** none. No user shell command or extra paid request required for this offline correction.
