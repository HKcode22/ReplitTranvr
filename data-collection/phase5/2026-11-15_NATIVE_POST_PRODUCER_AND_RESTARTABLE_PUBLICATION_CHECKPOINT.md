# Native POST producer and restartable publication — November 15, 2026

Phase 5 scientific FREEZE remains HOLD; Phase 6 paid start remains NO-GO. This is code and synthetic test implementation, not live deployment. The existing production database, V0079–V0095 and V0097–V0100, first actual seed, 31-parent-day study, Amendment E and seven-category budget are unchanged. V0101 is still staged; do not replay foundational migrations or install obsolete global V0096.

## Completed baseline

- #756 (7/7) and #759 (9/9) merged: signed current T24 enrollment and existing queue worker/witness route.
- #760 (6/6) merged at `f021da362e0182d44995240ac1aafd51682b3f35`: actual source-bound PRE metadata, prospective one-physical-window POST draft and stable request deduplication.
- This branch adds T24-only candidate coverage, the original POST packet verifier and distinct protected POST/day signing keys, existing V0094 private POST publisher, actual restricted independent packet readback, existing same-day signed append writer and actual independent index readback.
- Stable private path `post_<physical request digest>.json` is independent of anchor flight, source refresh, and horizon. Existing V0083 reviewed-call uniqueness remains mandatory. A failed day append after packet COMMIT can be recovered from exact independently authenticated stored bytes and original SOURCE binding, without rewriting that packet or selecting a replacement anchor. Uncertain writes are never blindly retried.
- The existing 10-minute source/POST parent schedule receives one separately STOP-default **nonpaid** producer job. It reads at most four current outcome days, checks metadata of signed SOURCE query identities against real committed PRE rows, groups candidates by airport and service interval, selects at most four prospective physical windows and three query hints per window, and invokes the original detailed PRE verifier before each publication. This is a capacity bound, not measured throughput; a finite time-bound may defer work. Existing paid POST parent/child remain the only dispatch/reservation route. Ordinary missing observations stay local. The policy does not presume that 30-minute/40-minute source timing or POST follow-up offset is approved.

## What has not happened

No production SQL write, key installation, secret configuration, provider GET, phase6 paid activation or physical gate-out label was performed by this branch. Workflow tests are synthetic unless explicitly named disposable PG16 tests; the real connected production SOURCE role and publisher must be verified with actual exact current rows, and the real outcome timing/capacity must be tested. New protected native POST policy and signer settings must be compiled from approved rights, retention, price, budget, frame and prospective geometry; no synthetic approval or test key can certify them. Recurring lawful retention and backup/PITR remain unresolved. Existing signed packet bytes do not certify actual gate-out, takeoff, cancellation, or arrival. Need physical outcome label semantics/reconciliation and real bounded end-to-end release evidence. Use existing ADSB.lol and BTS supplementary work; no additional paid vendor. Finish Phase 5 engineering and independent release decisions before the initial prospective draw/collection; no biased seed redraw or retrospective POST backfill.

## Current code map

- `phase6PostNativePreCandidateReadOnce_v39.mjs`: existing signed SOURCE/LATER_PRE and authenticated T24 private registry, actual independent PRE candidates, draft.
- `phase6NativePostSignedPublication_v39.mjs`: actual PRE hint scan, bounded selection, exact signer/immutable POST packet, independent readback, original day-index append, orphan recovery.
- `v39_phase6_native_post_producer_v39.mjs`: same-endpoint SOURCE/reader/publisher sessions, clock, policy, bounded scheduled execution.
- `v39_phase6_private_post_existing_v0083_child_v39.ts`: original child uses the signed new exact source binding when present, preserving legacy packets.
- Existing `phase5-source-upcoming-queue-main-scheduled-readonly.yml`: nonpaid producer, no provider/key exposure to other jobs; existing parent and paid child untouched in authorization.
- Tests: `phase6_native_post_pre_candidates_v39.test.ts` and `phase6_private_post_actual_child_transport_v39.test.ts`.

Next: exact-head CI and independent integration validation; merge only after tests, review actual rights/retention and keys/release authority, and complete physical-label/remaining outcome collection chain. No user shell action is implied by this checkpoint.
