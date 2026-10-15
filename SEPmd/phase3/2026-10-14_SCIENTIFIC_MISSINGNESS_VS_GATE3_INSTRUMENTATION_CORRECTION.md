# October 14, 2026 — correction: small delivery gaps ≠ scientifically unusable data

**Owner correction accepted:** do not say a YSSY-like billed/received mismatch must simply be “rejected.” This conflates distinct scientific, operational and historical protocol decisions and repeats an issue already analyzed in GitHub on Oct11–13. **Status:** research interpretation clarification and draft *offline* code/tests. It does **not** rewrite YSSY or silently modify the exact frozen isolated Gate3 certification, approve a numerical Phase6 primary-analysis missingness cutoff, merge/deploy, or permit provider spending.

## Repository references recovered
- [Oct12 proposed pragmatic missingness/DELIVERY_GAP policy](../phase2g/amendments/2026-10-12_PROSPECTIVE_PRAGMATIC_MISSINGNESS_AND_DELIVERY_GAP_POLICY_DRAFT.md): FOUR separate axes: billing safety, received-source integrity, scientific usability, engineering SLA. **Explicitly says valid observed data can be scientifically useful with missing records; the original tiny isolated Gate3 test remains exact under Plan §11.2**, and future *production* can pre-freeze measured bounded tolerance.
- [Oct11 research-only bounded-gap draft](../phase2g/amendments/DRAFT_2026-10-11_P25_PROSPECTIVE_BOUNDED_MISSING_DATA_AND_DELIVERY_GAP_RESEARCH_POLICY.md): distinct partial/exploratory tier without pretending historical strict Stage1 MATCH.
- [Oct13 qualification code review](../phase2g/amendments/2026-10-13_DRAFT_RESEARCH_QUALIFICATION_CODE_REVIEW.md), `server/lib/disruption/prospectiveResearchQualification_v39.ts` and `tests/prospective_research_qualification_v39.test.ts`: existing pure, tested numerical **example** `maxPositiveGapCredits=2` **and** `maxMissingFraction=0.01`, accepting synthetic 229 received out of 231 billed as **QUALIFIED_RESEARCH_CANDIDATE**, independently rejecting unsafe billing, unverified custody/identity, cost/item mismatch, incomplete window and unsettled totals. It always preserves `originalProtocolStatus='DELIVERY_GAP'` and `historicalConfirmatoryPass=false`.
- [Prospective four-HUB science proposal](2026-10-14_PROPOSED_PROSPECTIVE_SMALL_ANCHOR_MAIN_STUDY_AMENDMENT.md): future **WSSS, OMAA, SKBO, YSSY** all equally included in HUB rotation; YSSY historical credit discrepancy is an explicitly disclosed sensitivity stratum, not a site disqualification.
- Binding `SEPmd/V3.9_DataCollectPlan_f.8.md` §11.2 **currently requires zero-tolerance for an ISOLATED dedicated instrumentation Gate3 canary**, but itself permits a prospective measured production tolerance via new MEASURE→FREEZE amendment. Do not confuse this experiment-specific engineering certificate with a mathematical prohibition on missing-data statistics.

## Historical arithmetic and what the numbers do NOT prove

YSSY P25: **C_external=231**, **C_internal_received_item_claims=229**, discrepancy `D=2`. Calculations:

```text
billed-credit discrepancy = (231-229)/231
  = 0.008658008658... = 0.8658009%
received-to-billed credit ratio = 229/231
  = 0.991341991341... = 99.1341991%
```

The 58/58 *actually received* source envelopes had SHA/byte readback verified in the earlier audit. That is NOT confirmation that all SENT envelopes reached Replit, nor that `D=2` represents two distinct omitted flights or iid Bernoulli events. Item updates/codeshares/flight identity and delay severity can differ by observation time. No statistically credible route/flight completeness confidence interval comes from `229/231` unless the sender-attempt population, relationships between billed credits and distinct flights, and missingness mechanism are demonstrated.

### Three independent questions, three separate outcomes

| Axis | What can be said about a YSSY-like observation |
|---|---|
| **Received-data scientific value** | Received, source-valid, identity-vetted, as-of non-leaky flight records can be considered as **B-tier qualified exploratory data**; include explicit missingness/selection sensitivity and limited claim scope. **Do NOT discard valid rows due solely to 2-credit difference**. |
| **Original frozen isolated Gate3 instrumentation certificate** | *Only if this is an actual separately authorized Gate3 canary* — its pre-frozen contract says exact credits; a nonzero difference means the **exact diagnostic certificate is not established**. That does NOT say the data are unusable or the airport is invalid. YSSY P25 is a different historical Phase2 probe, **NOT the new Gate3 canary**. |
| **Future Phase6 operational tolerance / primary score comparability** | Bounded gaps might be acceptable under a **versioned, pre-outcome, empirically supported** criterion plus provider/account safety, denominators and sensitivity. The two-credit / 1%-proposal is an illustrative project candidate **not universally approved** and cannot be chosen post hoc just to admit observed YSSY. Explicitly freeze after representative independent validation, not after peeking at desired ML outcomes. |

Hard safety vetoes remain: unresolved account/foreign active subscription, unbounded debit, actual source corruption or false raw-before-2xx ACK, invalid flight identity, wrong prediction clocks/labels, license/retention breach and forged results. Routine intermittent failures and incomplete received data do **not** imply those hard vetoes occurred.

### Statistical method and source basis

1. Document the observed cohort, missingness pattern, potential failure windows and lack of sender-attempt denominator. Model availability at cutoff, route/airport/time/flight outcomes, with missing flags and partial-data scope.
2. For **comparative scientific claims**, use sensitivity and stress scenarios: e.g. if a truly independently established `m` distinct target observations are missing and a delay outcome is plausibly bounded `[L,U]`, observed `n` and sum `S` imply worst-case mean range `[(S+mL)/(n+m),(S+mU)/(n+m)]`. **Never substitute 2 billed credits for known `m=2` flights**.
3. Compare models/estimates with qualified data included/excluded; compare high-delay-tail sensitivity and airport/time/cell subgroup patterns. Treat MCAR/MAR/MNAR as hypotheses with limited identifiability, never assert that 0.8658% implies negligible missingness bias.
4. Standard-method references (domain transfer principles, not universal thresholds): STROBE observational report missing data and sensitivity https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/ ; STROBE Explanation and Elaboration https://pmc.ncbi.nlm.nih.gov/articles/PMC2020496/ ; National Research Council missing data and sensitivity https://www.nationalacademies.org/read/12955/chapter/7 ; TARMOS framework https://pmc.ncbi.nlm.nih.gov/articles/PMC8168830/ . Aviation network-specific missingness must still be measured through Phase4 provider-observable FIDS denominator.

## Actual code alignment in draft PR36 (not production)

- Existing `prospectiveResearchQualification_v39.ts` remains the source of *research* classifications.
- **NEW** `server/lib/disruption/gate3CanaryDualTrackReview_v39.ts` (commit `570ac8f6c714634eee59da03e58f7004ec22e0fe`) and `tests/phase3_gate3_dual_track_research_disposition_v39.test.ts` (commit `e8416733ec9b17786d9d96a03cc8767f3d42cc48`) expose both decisions side by side:
  - `instrumentation`: isolated frozen Gate3 exact `OFFLINE_CANDIDATE` or `HOLD` **if and only if an actual canary was given**; `null` for historical YSSY which is NOT a Gate3 canary.
  - `scientific`: `EXACT_RESEARCH_CANDIDATE`, `QUALIFIED_RESEARCH_CANDIDATE` or `HOLD_FOR_REVIEW` using explicit *proposed* parameters and full source-accounting safety checks.
  - Always returns `prospectiveScientificApprovalVerifiedHere=false`, `observedFlightMissingFractionEstablished=false`, `futurePaidProviderAuthorizationGranted=false`; zero provider calls or database writes. Under hypothetical verified source/ownership values, 229/231 is **QUALIFIED_RESEARCH_CANDIDATE**, not discarded.
- Added `gate3CanaryTerminalAssessment_v39.ts` header clarification commit `861b08a414e971bdaebb7c06e48045680f87b779` and narrowed wording of strict canary test commit `2370cfb734ecad62a387aea5f2b281b9b527bc3a`: the exact-match HOLD is only for *that specific certified instrumentation question*, never a global research-data rejection.
- New code/tests remain offline and **not wired into paid acquisition**, so no retroactive or automatic approval. Latest executable source SHA `2370cfb734ecad62a387aea5f2b281b9b527bc3a`; GitHub Actions must be independently queried to establish exact tests before marking PASS.
- The prior terminal-candidate exact-check code `c4485c8405483114f03b5ebc61ce864fc9f15515` had **4/4 provider-free GitHub CI PASS** (#38665519296 full, #38665519204 focused, #38665519284 realPG, #38665519265 receiver). The new composite code requires its own verification.

## Next decisive work, not another months-long Phase2 repeat

1. Verify 4 no-provider CI on latest executable SHA; repair exact failing test only, record evidence in checkpoint and [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).
2. For **future Phase6 production observations** choose an independent, falsifiable, prospective bounded-missingness criterion (not assumed 1%), **separately from** the Gate3 exact smoke diagnostic. Test hard safety invariants, supplier-side coverage/denominator uncertainty, reason-by-route/time sensitivity, and scope. Only then adopt in amended Plan f.8/Implementation Log/Phase5 frozen manifest. The project owner can approve a versioned decision, not historical rewriting.
3. Continue REAL Phase3 paid execution owner and published zero-provider receiver check. Original Phase2 YSSY is QUALIFIED historically by owner's exception and remains future HUB; do **not** demand a YSSY re-probe or discard its received data merely for the two-unit debit discrepancy.
4. Gate3→0.5→4; Phase4 independent FIDS/route denominator; Phase5 four-HUB method/calendar source freeze; Phase6 31 parent paid batch days after exact spend AUTH; Phase7 independent ML plan/data audit after meaningful acquisition.

**Deployment/spend/retention:** 0 live provider GET/CREATE/DELETE, 0 refills, 0 live SQL, 0 deployments/merges, 0 raw deletions; Replit local release `bb44fc1d` unchanged. PR36 remains draft; original historical P25 rows/plan never rewritten. Scientific methodological qualification is independent of data-retention permissions.
