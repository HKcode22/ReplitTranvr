# Phase 4 Gate 5 — historical PostgreSQL schema smoke only (no provider)

**Prepared October 31, 2026.** This work is a GitHub Actions SQL/schema compatibility test of the **already observed October 31 WSSS service cohort 17:00–18:00 UTC**. It does not establish a new prospective cohort, original Gate5 certification, verified runway departure, or recovered T−6h.

## Reason and immutable scope

- Future same-cohort Gate5 cannot yet be genuinely frozen: official provider-native selected T, actual-versus-estimated runway, operating/codeshare identity, legal raw retention and measured acquisition grid are not independently certified. The new parameterized SQL function can still be tested on retained OLD originals without external API calls.
- The reviewed static manifest is [2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json](2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json), content SHA-256 **c3785cfae051fd0cf4ef3dd68a3a9d8b0079c89cd34c002fe5610000ff318853**, with WSSS, the exact past service interval, original paid run [#41202671665](https://github.com/HKcode22/ReplitTranvr/actions/runs/41202671665), T−6h UNOBSERVED, T−24h UNOBSERVED at its fixed cutoff and Phase5/6 explicitly false.
- The SHA is checked from the exact file bytes and all fields are compared to immutable literals in the new operator script. It is a historical scope lock, **not** permission to collect or spend.
- New workflow: .github/workflows/phase4-gate5-historical-cohort-schema-smoke-readonly.yml. Push-to-main for its exact code/manifest/workflow paths only; no schedule or workflow_dispatch. GitHub environment phase2g-paid supplies **only** the existing GATE05_AUTOMATION_DATABASE_URL reader secret at the audit step. No AeroDataBox API key, HTTP calls, subscriptions, or REST credits.
- Runner: scripts/v39_phase4_gate5_historical_cohort_smoke_readonly_actions.ts. Confirms repo, push event, main, first attempt, exact job/workflow/ref, checked-out commit and absence of provider secrets; creates PostgreSQL default read-only session, then REPEATABLE READ READ ONLY transaction with SQL query timeouts and ROLLBACK in finally. Calls the already merged phase4Gate5FreshCohortReadOnly_v39.ts aggregate-only function.
- Tests: tests/phase4_gate5_historical_cohort_smoke_actions_v39.test.ts. Guarded GitHub provenance, true SHA digest, tampering, wrong retry/branch, provider-secret refusal, SQL transaction safety and intentionally historical missingness.

## Verification and scientific result

**Prepared != executed.** Only after required PR CI passes and this workflow merges to main can its own real GitHub job establish DB connectivity/schema compatibility and current source retention. The previous October 31 paid and retrospective audit workflows, and the hash-locked canonical Implementation Log, are unchanged.

The new generic SQL inventories retained raw FIDS original receipts, provisional population and tags, PRE rows linked to retained source, provisional identity-resolved callbacks, and stored wheels-off label statuses. If originals are expired, it must return **NULL source-dependent denominators**, not a measured zero. The selected T, full physical operator denominator, actual-only target, callback coverage outside the complete provider universe and certified PRE all remain unproven. A green SQL job is NOT Gate5 PASS.

## VERIFIED: initial historical real PostgreSQL execution after merge

[PR #295](https://github.com/HKcode22/ReplitTranvr/pull/295) merged main commit **777983700ec931b93e343e413dfef153ebc3ee14** after all four mandatory CI checks succeeded. The NEW main-only protected GitHub run [#41265529465](https://github.com/HKcode22/ReplitTranvr/actions/runs/41265529465), job **124727440059**, actually executed against retained production PostgreSQL in a repeatable-read read-only transaction at **2026-11-01T02:31:29.318Z**, first attempt, SUCCESS. Exact SHA-pinned historical manifest verified.

The measured **historical** WSSS Oct31 17–18Z scoped query reported:
- Retained original FIDS receipts **2**; source-normalized primary observations **110**, provisional distinct analytic IDs **110**.
- Independently certified operating physical flight denominator **UNKNOWN/null**; DB-tagged core canonical IDs **0** in this join. Do not reclassify those 110 as physical flights.
- Source hash/parent-to-member clock violations **0 within this scoped query**; does not negate the earlier broader 31 one-millisecond precision findings in another inventory.
- Truly stored PRE rows: T−24h **0**, T−6h **0**, T−90m **0**; PRE previews do not count as persisted.
- Original-identity-resolved webhook candidate count **0** in this narrow join; source-scoped wheels-off outcome rows **0**, all status counts **0**. This is NOT a measured zero true callback rate, provider flight population, runway departure population, or actual-only target availability.
- Provider/API calls **0**, DB writes **0**, no Alert, no credits consumed by this check, no historical backfill. Selected native T, actual-only wheels-off, science Gate5, Phase5/6 remain HOLD.

The earlier Oct31 read-only postflight audit reported one retained receipt and 86 observations because it used a **different 24-hour raw-source lookback**. This generic new audit counts two currently retained original receipts at its timestamp. These are separate query definitions and clocks, not conflicting data or retroactive justification of the missed T−6h.

## New native source field presence step (this PR — pending verified live execution)

A pure aggregate SQL module now counts provider-native original **field presence**, not physical flights: IsOperator / IsCodeshared / unknown, explicit departure origin, generic scheduled/revised/runway timestamps, and quality markers. It runs against these legally retained original historical sources inside the same read-only transaction; the merged runner will include a bounded native source receipt-parity check. **No real counts for these newly added fields should be claimed until the next actual Actions job finishes.** Even a Live quality with runwayTime does NOT certify actual-only wheels-off under the official AeroDataBox contract.


## October 31 continuation — source-receipt normalization parity

[PR #296](https://github.com/HKcode22/ReplitTranvr/pull/296) merged successfully; its independent [real protected SQL execution #41266327695](https://github.com/HKcode22/ReplitTranvr/actions/runs/41266327695) measured **two** still-retained original query receipts with **111 raw departure movements** versus **110** normalized source population observations in the same WSSS 17:00–18:00Z cohort. Of the 111 original movement records, IsOperator=32, IsCodeshared=62, other/unknown=17; generic scheduled=111, revised=87, Live quality=87, and departure runwayTime UTC **0**. Explicit departure ICAO at the inspected native JSON path was **0**. These are per-observation source-field counts, not actual-only labels or unique physical legs. The 110 normalized database rows were never scientifically certified operating flights.

This continuation implements a *separate aggregate-only* per-receipt reconciliation in server/lib/disruption/phase4Gate5RawNormalizedReceiptParity_v39.ts and its tests. It samples at most 12 unexpired original source receipts for a reviewed fixed cohort; counts raw departures versus the source-linked normalized rows **inside each original**, requested-airport primary versus other/unknown role, absent provisional identity, response hash mismatches and member-available-before-parent-clock inconsistencies. Original receipt indexes are anonymous 1..N, with **no original UUID, flight ID, timestamp or source payload in logged results**. It reports a signed net difference per original and total, **not** an assertion of one omitted physical flight: net differences can hide offsetting omissions, codeshare duplication, normalization filters or unmatched contexts. If raw departure shape is not an array, it HOLDs instead of treating that as zero. If all original source has expired, original-source denominators remain NULL/UNKNOWN.

The existing SHA-pinned historical protected runner now queries this parity result in the **same** PostgreSQL REPEATABLE READ READ ONLY transaction and requires parity with both the preceding native-field raw counts and the previous normalized population totals, provided the receipt sample is untruncated. Any real SQL/schema/clock error is a HOLD; no writes/provider calls. Old 2026-10-31 missing T−24h/T−6h can never be backfilled. **Do not state measured per-original differences until GitHub CI passes and a new real postmerge protected SQL job finishes.** Gate5 strict HOLD; Phase5/6 NO-GO. Original Implementation Log remains hash-locked unchanged.

## Follow-on

1. Read actual historical SQL smoke run and job logs. If SQL fails, repair it with nonpaid code and regression CI; do not mutate source originals or waive read-only.
2. Resolve authenticated provider semantics under [issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200), including per-record actual/estimated runway and first observed selected native T, plus physical operating-leg proof.
3. For the **next genuine prospective cohort**, create a different frozen approved manifest and independent GitHub-only runner. Track [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293). This old historical smoke cannot be relabeled as a new attempt.
4. Connect certified PRE writer, source-as-of full 24h/6h/90m nonadaptive FIDS grid, retained original provenance, denominator/capture and actual outcome certification before scientific Gate5 and Phase5/6 review.

**Current decision: Gate5 HOLD. Phase5 freeze HOLD. Phase6 NO-GO. No Replit command and no new paid GET needed.**

Start with [Phase4 redo root-cause checkpoint](2026-10-31_GATE5_REDO_ROOTCAUSE_AND_RESTART_HANDOFF.md), [fresh-cohort audit implementation checkpoint](2026-10-31_GATE5_FRESH_COHORT_READONLY_AUDIT_HANDOFF.md), and binding [V3.9-f.8 Plan](../plans/V3.9_DataCollectPlan_f.8.md).
