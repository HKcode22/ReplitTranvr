# Phase 4 Gate 5 — production callback/outcome funnel implementation

Date: 2026-10-30 PDT. Source-of-truth Plan `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §5 and §17 step 17, Implementation Log §A1.15.

## Completed operational prerequisites

PR #278 merged main `736bb15cc7736e5bf9a5fdde28eb5c736bddd5ca`; [real protected DB audit #41149969367](https://github.com/HKcode22/ReplitTranvr/actions/runs/41149969367) completed SUCCESS and found **1 retained original WSSS FIDS receipt, 24 population observations, 24 provisional analytic IDs and 24 source-as-of-cutoff candidate identities for each of three provisional horizons**, with 0 missing schedule text and 0 invalid source lineage. **0 certified PRE snapshots**. All 24 commercial scope and operating-leg classifications remain unverified; this is neither a zero-flight airport nor a provider-verified physical-flight denominator. The already completed PR #278 postmerge offline safety [#41149969384](https://github.com/HKcode22/ReplitTranvr/actions/runs/41149969384) PASS.

First GitHub scheduled candidate T−24 refresh [#41125194823](https://github.com/HKcode22/ReplitTranvr/actions/runs/41125194823) fired around 20:41 UTC instead of 16:07 UTC, and correctly reported **HOLD_BEFORE_PAID_FIDS_GET**, 0 provider calls, 0 API units; the earlier successful 13:49Z observation remains valid pre-cutoff evidence. The two later fixed UTC slots remain queued by GitHub; never backfill an already elapsed cutoff or count missed refresh as a measured zero.

## This implementation

`server/lib/disruption/phase4Gate5LiveCaptureOutcome_v39.ts` adds actual, independently queried live production **webhook capture + wheels-off outcome** counts from the same single WSSS October 31 17–18Z FIDS service cohort. A protected READ ONLY transaction in `scripts/v39_gate5_source_inventory_readonly_actions.ts` now runs it alongside the existing population/snapshot funnel, cutoff audit and original SHA verifier:

- Bounds the FIDS receipts to the fixed service interval, last 12 unexpired valid query rows and stricter 24h original-body retention ceiling. The receipt total must agree with independently computed live candidate-funnel receipts.
- Restricts core comparable FIDS identities to primary confirmed commercial scope + confirmed operating leg + nonexpired original canonical identity and source hash.
- Resolves webhook identities **only via existing `webhook_identity_resolution` plus `webhook_flight_identity` with exact WSSS origin and scheduled service window** and an unexpired, durably received original `raw_delivery` record. Do not match on callsign, flight-number text or destination guesses.
- Counts unique resolved webhook identities matched to the sampled confirmed-core FIDS population and those outside that *sampled confirmed-core* set **separately**, never calling the latter a verified outside-provider-population count.
- Reads latest current `wheels_off` outcome status per eligible canonical ID in `flight_outcomes`: observed, pending, censored, missing or not-applicable. Source-verified actual departure/runway labels remain UNKNOWN until separately substantiated; an `observed` row is not automatically a certified runway event.
- Outputs *actual* counts for measured things but NULL for missing comparable full provider denominator, unmatched webhook identity completeness, independent actual runway labels and target/capture rates; future service window not marked completed. All SQL read-only with 10s statement timeout, no provider keys, no paid call, no persisted content, no source row IDs or hashes in logs.

This is Phase 4 real implementation work, not hypothetical/optional research. User has authorized paid operations but this step costs **0 provider units** and needs **no Replit shell**. It does not change strict Gate 3 accounting or declare Phase 5/6 GO.

## Next

After 4/4 exact-head CI green, merge and inspect the **real main-push GitHub protected audit output**; record all counts, failure if any, and distinguishing missingness. Continue fixing genuine snapshot materialization and optional feature missingness independent of webhook capture, and apply the later T−6/T−90 scheduled FIDS observations if they dispatch before their cutoffs.
