# October 14, 2026 (PDT) — Gate3 shared paid-owner CREATE exception recovery

**Read first:** [START_HERE](START_HERE.md), [Oct14 science correction](2026-10-14_SCIENTIFIC_MISSINGNESS_VS_GATE3_INSTRUMENTATION_CORRECTION.md), [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38). Repo `HKcode22/ReplitTranvr`. Draft code PR [#36](https://github.com/HKcode22/ReplitTranvr/pull/36), branch `phase2g-pragmatic-science-and-checkpoints-20261012`. PR37 qualified Phase2 science is a separate, docs-only unmerged PR.

## What was actually fixed (no provider calls this session)

A reproducible code path in the **real shared paid prepaid owner** `server/lib/disruption/prepaidProbeWindow_v39.ts` previously used:

```ts
let sub = await createSubscription(...);
if (!sub?.id) sub = await recoverAmbiguousSubscriptionCreateV39(icao, webhookUrl);
```

A remote provider can commit a subscription while the HTTP response is lost; the SDK may **throw**, not return `null`. In that case the old code bypassed strict subscription LIST recovery completely. An already-billable subscription might remain active while the local owner exits without a confirmed provider ID. This is a concrete shared-system risk; it is NOT proof of the historical YSSY two-credit cause.

**Implemented:**
1. New **provider-free** `server/lib/disruption/prepaidAmbiguousCreateResolution_v39.ts` (commit `8240705e859c39c59729739be89384cc5881374f`): invoke CREATE at most once; on thrown or empty CREATE response use **existing strict LIST recovery for exact airport plus deterministic callback**, refuse MULTIPLE exact matches, do not retry POST, and emit `PREPAID_AMBIGUOUS_CREATE_PROVIDER_OUTCOME_UNVERIFIED_HOLD` if LIST fails/identity ambiguous. One authoritative successful LIST with no exact active result may return `null`; not a promise of full account settlement.
2. Integrated into the actual `server/lib/disruption/prepaidProbeWindow_v39.ts` (commit `4920bdb13c298185c7da1d1a497461fe59678251`). If strict LIST finds one owned ID after a thrown response, existing provider-ID-to-SQL-BIND compensation (previous checkpoint) applies, followed by existing watchdog/delete/settle path. Gate3 **still hard-stops before any billable SDK calls** pending approved owner/host parity; production deployment untouched.
3. New `tests/phase3_gate3_ambiguous_create_recovery_v39.test.ts` (commit `a5a2081a1463c3ab98294327afba630a7a773d6e`) verifies one POST only on healthy and thrown paths, thrown + recovered exact, empty ID + recovered exact, authoritative zero LIST, LIST transport failure/multiple-match HOLD, invalid ID refusal, no uncontrolled input side effect, and real shared-runner source wiring order.

**Scientific acceptance separate from financial safety:** YSSY P25 remains owner-approved for *qualified Tier-B exploratory received-source use* (PR37) with historical 231 billed /229 item claims and 2/231=0.8658% credit discrepancy, **NOT** an assertion of two missing physical flights. The dedicated small isolated Gate3 exact instrumentation certificate under original Plan §11.2 differs from a future prospectively justified bounded Phase6 missing-data policy; neither reason allows an untracked billable subscription, invented sender receipts, or fabricated flight data. No new YSSY pilot or strict project reset authorized.

## CI — exact state

Prior exact scientific-dual-track code SHA `2370cfb734ecad62a387aea5f2b281b9b527bc3a` **4/4 no-provider GitHub CI success**: full #38666670746, focused #38666670348, real disposable PG #38666670555, receiver identity source/read-only #38666670795.

**New executable code/test SHA `a5a2081a1463c3ab98294327afba630a7a773d6e`** has four GitHub workflows: full V3.9 Offline Safety #38667316837; focused no-provider #38667317058; real PG receiver faults #38667316828; public receiver identity read-only #38667316956. **They were in progress at creation of this report.** Recheck this exact SHA and complete all four conclusions before claiming fully tested; doc-only later commits have independent CI.

## Remaining real Gate3 critical path (not optional perfectionism)
1. New paid `phase3_credit_canary` owner must consume already-prepared Gate3 LOGGED+UNLOGGED same-ID source under exact approved/auth hash; current shared runner correctly rejects Gate3 paid exposure with `GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY`. Do **not** simply remove this stop or delegate legacy `credit_canary.ts`. Real pre-run host route/SQL/object-store identity and account-subscription exclusivity are unverified.
2. Short **actual hosted zero-provider** receiver/PG parity readback; separately reviewed host/runtime/DB writes if needed. No general two-hour hosting rehearsal required solely from old synthetic test.
3. A fresh small credit/time-bounded explicit operator AUTH for **one exact experimental subscription** only after first two and provider headroom/zero foreign billables; full owned deletion and 3 stable authoritative balance readings. Original exact canary success or failure does not determine whether valid observed rows have scientific value.
4. Gate0.5 actual native departure milestone/availability; Gate4 runtime controller stop; Phase4 measured FIDS observable denominator; Phase5 approved four-HUB calendar FREEZE; Phase6 real 31-parent-budget-day main run with separate paid approval; Phase7 ML when enough collection is available. No Cloudflare or parallel ML work.

## Approval and operational boundaries
**During this session:** GitHub draft code/tests/reports/issue only; provider calls 0, credits 0, new subscriptions 0, live PostgreSQL writes 0, production Replit publish/reset 0, merges 0, deletion of received source 0. Historical pilot state and expiry policy untouched. User local checkout previously recorded clean `release/p25-reviewed-publish-20261012`, `bb44fc1d122868e20664b2c149406f99bb10cb86`; not re-verified this session and never touched. No assumption that GitHub PR36 is the hosted Replit SHA. Progress targets in issue #38 are conditional.

## Follow-up: full CI failure caught stale tests, fixed without reducing safety
Initial executable SHA `a5a2081a1463c3ab98294327afba630a7a773d6e` GitHub CI: focused #38667317058 SUCCESS, real disposable PG #38667316828 SUCCESS, receiver read-only #38667316956 SUCCESS, **full Offline Safety #38667316837 FAILURE**. Independently inspected job #116202115104: 1268 tests passed, 19 skipped, **two failures** in *previous* source-order tests `phase3_gate3_prearmed_window_selection_v39.test.ts` and `phase3_gate3_prepaid_bind_recovery_v39.test.ts`; both searched for obsolete direct `await createSubscription("FlightByAirportIcao"` after real code moved SDK call into `resolveAmbiguousPrepaidCreateV39` adapter. These are obsolete test text targets, not evidence that ownership safety has been compromised; the **new eight-scenario test file passed 8/8**. Fixed both test source-order assertions to check the new real SDK adapter position relative to hard Gate3 paid stop and SQL bind/compensation instead, commits `5d86b0ea24bfaf93bd2709d5672a9bb207c877a7` and `bdcbaf0ed2378dae11073b36a5a27c7cc15c525d`. **No producer source change** in these test-fix commits.

Latest executable exact SHA for full recheck `bdcbaf0ed2378dae11073b36a5a27c7cc15c525d`: initial GitHub Actions: full offline #38667521372, focused #38667521313, real PG faults #38667521282, receiver source #38667521278. **IN PROGRESS at this checkpoint update**; require exact per-commit final conclusions before declaring 4/4 PASS. Documentation-only commits do not substitute for these executable-source CI proofs. Original Gate3 paid path still hard-stops before provider CREATE.
