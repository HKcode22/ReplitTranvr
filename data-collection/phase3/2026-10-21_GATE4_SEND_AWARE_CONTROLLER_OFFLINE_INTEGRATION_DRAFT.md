# Gate4 hardening — October 21, 2026 (DRAFT; NO BILLABLE AUTHORIZATION)

**This is a reviewed-source candidate, not production deployment or Gate4 PASS.**
Baseline production source: ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814.

## Audited source gaps
Existing Gate4 owner returned PASS from a simple arithmetic simulation and a legacy controller idle-state read. This was not real SEND-aware proof.
Existing V3.9 watchdog previously logged a provider-balance failure but did not necessarily attempt STOP. It did not feed an internal received-item witness into its threshold decision.
Existing startBatch guarded against a currently active batch, but did not explicitly require the latest predecessor to be CLOSED and settled.

## Changes on the research branch
1. New pure SEND budget policy, tested at cap 100/margin 10; external credit delta and received-item counts both considered, missing or increased provider balance and unexpected SEND mismatch result in HOLD_STOP, not zero spending.
2. Wired policy into V3.9 real watchdog and attempted stopBatch() after a failed balance/ledger read; incident attempted in addition. This is an attempt, NOT guaranteed deletion under DB/provider outage.
3. StartBatch now refuses an active/unsettled latest predecessor before subscriber CREATE.
4. Frozen config now refuses soft margin smaller than reserved unsettled SEND-burst amount.
5. Gate4 owner no longer reports Gate4 PASS from synthetic simulation; outputs OFFLINE_ONLY_NOT_LIVE_CERTIFIED.
6. Added focused offline tests; execution and TypeScript validation remain PENDING until operator executes them.

## Hard technical limitations
A lagging balance read, missing provider SEND, billing after DELETE and simultaneous controller processes may still defeat a simple polling cap. No provider-enforced hard 100 or 1900 credit limit is claimed. The internal adb_ingest_events is RECEIVED data, not complete SEND-side accounting. Atomic second-start ownership and independent supervisor behavior still need disposable-PG/real-path tests. A future separately authorized tiny live canary is required for Gate4 certification only after reliable source+settlement safeguards.

## Status and boundaries
Offline source DRAFT. Do not merge, publish, turn on PHASE6_READY, create a subscription, issue a paid call or approve Phase4 from these tests. Gate3 prepaid and Gate0.5 scientific certificates remain separate Phase3 requirements. This report documents a real defect fix proposal and a finite verification plan; deadline is not permission to bypass safety.
## 2026-10-21 implementation supplement (source patch after initial draft)

- Added watchdog outer-fault STOP attempt on failures in the earlier delivery-failure/config/calendar reads, not just account-balance failure. If the database or provider prevents the stop, logs must explicitly say STOP_UNCONFIRMED; do not claim that a source-level catch ensures physical cancellation.
- Added a local non-overlap latch for setInterval watchdog ticks to avoid simultaneous in-process STOP/CREATE paths. This is NOT a cross-process durable lock and is not independent supervisor evidence.
- Updated synthetic test source-contract assertions to require the outer fault path and single-flight latch. The new branch HEAD must be re-pinned for each focused test. Tests are still NOT verified as passed.
- Production rollout is still blocked on disposable-PostgreSQL and mocked-provider fault injection, concrete SEND inflight worst-case margin and a newly independently authorized, limited live Gate4 test. A future hard cap cannot be asserted solely from a soft polling threshold.

## Separate earlier Gate05 offline test report

User ran the aggregate-only Gate05 tests on initial draft SHA 8fd6a2e...: 4 passed, 1 failed because the privacy assertion searched for substring 'lat', matching 'withLocation' and 'population'. That is a TEST FALSE-POSITIVE, not an observed coordinate leak. Fixed on its SEPARATE branch research/gate05-aggregate-evidence-20261021 at SHA 5f681e631850ba441a16af9fe8ab4318e7ec51d4, by checking actual JSON coordinate key. Rerun before claiming 5/5 green. No source normalization or production behavior changed for this fix.
## Verified owner-shell focused test checkpoint and new injected fault tests

Owner ran `PHASE3_FOCUSED_OFFLINE_VERIFY` in isolated Replit Shell checkouts with no provider keys or production writes:

- Gate4 original draft at commit `8393b339d5ef2ff82df5b5fd7b1bd31259262aea`: **6/6 focused tests PASS**, `tsc --noEmit` **PASS**.
- Corrected Gate05 scientific draft at `5f681e631850ba441a16af9fe8ab4318e7ec51d4`: **5/5 focused tests PASS**. The prior substring `lat` failure was a fixture assertion false positive, not a coordinate leak.
- Owner terminal confirms `PAID_PROVIDER_REQUESTS=0`, `PRODUCTION_DB_WRITES=0`, `NO_DEPLOYMENT_OR_MERGE` for this check.

These passes do **not** apply automatically to later commits, so they do not certify the new Gate4 watchdog-action orchestration yet.

New Gate4 code after that passing checkpoint:

- New pure `gate4WatchdogAction_v39.ts`, invoked by the actual `adbCollectionController_v39.ts` watchdog; its injected dependencies allow fail-path tests to exercise owned STOP attempts and return `STOP_UNCONFIRMED` rather than fictitious PASS when delete/DB results fail or refer to a different batch.
- New `tests/phase3_gate4_watchdog_action_integration_v39.test.ts`: six additional fixture-driven cases for soft STOP, failing incident write, deleted subscription failure, wrong batch/status, permitted CONTINUE, and malformed batch scope. These are **injected offline faults**, **not** a live disposable-Postgres or provider integration certificate.
- Existing six Gate4 decision/source checks updated for real helper wiring and named witness/readback failure output. An account witness error is `HOLD_STOP` and still attempts the owned stop.
- **Tests, compile, GitHub CI on the latest branch commit: PENDING execution**. Need the new exact SHA before any conclusion.

**New decisive Gate4 limitations:** A returned `CLOSED` from an owned stop function is not independent durable-provider deletion verification. Internal `adb_ingest_events` is not true SEND-side ingress on undelivered calls. Local watchdog latch does not serialize multiple published processes or protect against process death. Gate4 remains HOLD for live admission until disposable PostgreSQL/provider-failure injection, independent safety process and bounded live trial are proven. No hard guarantee of the intended provider alert-credit cap has been established.

## Cross-process START safety hardening (subsequent draft commit)

The latest Gate4 draft now adds `gate4TransactionalAdmission_v39.ts` and `tests/phase3_gate4_transactional_admission_v39.test.ts`. `startBatch` invokes the guard **after BEGIN and before INSERT**, on the **same PostgreSQL transaction client**. `pg_try_advisory_xact_lock(3904,20261021)` rejects contention rather than waiting indefinitely, then rechecks that no ACTIVE batch exists and the most recent parent is CLOSED/MATCH, acknowledged, and has valid settled credits. A second Replit V3.9 controller cooperating with that same lock cannot concurrently pass the gate across separate connection pools. Separate unmatched legacy/unreviewed writers remain outside this protection; a database unique active-batch constraint and real concurrent PostgreSQL test should be evaluated before production release.

Five offline negative/positive tests cover fresh start, lock contention, active batch, unsettled predecessor and source code order. **These tests are not an actual multi-connection PG concurrency test and have not yet been verified as passed on the updated branch.** Future terminal production release still needs a real backend concurrency challenge, failing provider DEL/settlement and source verified independent watchdog, rather than promising a hard credit cap.

Latest source review head after this change is `97d9faa931794bc4d4777fcb7eeb317278f948e9`. Passing earlier six Gate4 focused tests and five separate Gate05 focused tests remain historical specific-commit evidence, not automatic green for this SHA.

## Stop-first ordering hardening (post-offline test snapshot)

The injectable watchdog action now attempts the exact owned STOP **before** attempting to write a failure incident to PostgreSQL. A stalled incident SQL write must never be a prerequisite for a DELETE attempt. The helper still returns `STOP_UNCONFIRMED` if deletion, ownership, or the local CLOSED receipt is missing; even `STOP_ATTEMPT_RETURNED` explicitly requires later independent provider/DB/account terminal readback. The seventh watchdog action fixture asserts STOP-before-incident ordering. It **has not yet been proven on a real provider**, nor has the seven-test suite been verified green at this SHA.

No existing paid authorization is used. Any new live Gate4 proof requires independently signed source, an allowed billable CREATE scope, time and protected-credit controls, a separate non-billable independent owner/delete rescue, 3 stable provider balance reads, immutable error receipts, and owner approval after a clear overrun warning. A local `setInterval` catch and transaction-scoped lock alone are insufficient.

## Latest real disposable PG16 concurrency addition (post-18/18 checkpoint)

The owner proved **18/18 focused Gate4 tests + TypeScript PASS** on exact earlier SHA `e7e1a5c359871e4e16550374343bf58f678527c4`, with no provider requests or production writes. CI also reported four no-provider suites `completed/success` on that exact SHA.

A newly added CI-guarded real PostgreSQL 16 test `tests/phase3_gate4_real_postgres_concurrency_v39.test.ts` uses GitHub Actions **only**, requires the exact `v39_ci` local connection string and `AERODATABOX_API_KEY` absent, creates a unique disposable database, exercises the production `assertGate4TransactionalAdmissionV39` helper with two independent connections, then drops the disposable database. It covers contention, ACTIVE rejection after transaction commit, CLOSED/UNSETTLED, missing reconciliation acknowledgment, and advisory lock release on rollback; zero provider calls. This is stronger than mock-PG tests but not a full batch subscription lifecycle.

Updated watchdog outer exception route to attempt owned `stopBatch` **before** incident-write SQL (failure to record an incident must not delay deletion). Updated admission guard to reject blank/noncanonical string credit counts rather than silently coercing them to zero.

**NEW SOURCE STATUS: UNTESTED AT THIS COMMIT, awaiting current-head GitHub CI.** The 18/18 historical PASS must not be relabeled as a real PG PASS. Further requirements: fault-injected end-to-end DELETE/settlement + an independent STOP supervisor; measured bound on SEND incurred after missing webhook/DELETE; separately explicitly authorized small live Gate4 owned scope with terminal account readback. No main merge or provider/production mutation.

## High-priority subscription CREATE→PG-INSERT custody gap repaired in draft

Source review exposed a real hazard: previous `createSegmentSubscriptions` called the remote provider CREATE, then attempted SQL INSERT, and **only afterward** appended the provider subscription ID to the deletion list. If SQL INSERT failed, the just-created billable subscription could be absent from the rollback list. Existing catch-loop could also stop compensating later subscriptions if one DELETE or ended-at update threw.

New pure injected `gate4OwnedCreateRecovery_v39.ts` is now wired directly into production V3.9 `createSegmentSubscriptions`. It tracks each returned provider ID **immediately before** attempting its database INSERT, and on any failure attempts deletion of **all** known IDs in reverse order. Incident evidence is written with nonidentifying counts; ambiguous CREATE responses, failed physical deletes, stale SQL ended-at writes or incident failures result in a clear **HOLD** instead of assuming no billable exposure. Even a compensation attempt returning success remains in HOLD pending independently checked subscription and account settlement. No raw provider IDs are logged in the incident.

Eight synthetic no-network tests check successful creation, failed first/second SQL INSERT, continued cleanup after DELETE failure, ended-at failure, missing CREATE acknowledgment, failed incident write, and structural source wiring. **These tests and TypeScript are not yet verified on this revision; Gate4 remains not live certified.** A provider response lost *after* physical CREATE but before obtaining an ID requires an independent provider inventory/deletion rescue and cannot be repaired by this helper alone. 

## Final fail-closed wrapper correction

The generic `runAuthorizedOwner()` wrapper classifies a child exit code of **zero** as `PASS`. Existing Gate4 diagnostic owner, although printing `OFFLINE_ONLY_NOT_LIVE_CERTIFIED`, previously returned zero after passing only arithmetic fixtures. Therefore a wrapper called `v39:gate4:live-check` could incorrectly emit `PASS`. The reviewed branch now returns **exit 2** for valid offline-only evidence, while preserving exit 1 for a failed offline self-check. This deliberately blocks any accidental live certification from synthetic tests. Focused source test asserts the fail-closed status; latest-head CI and TypeScript must validate this revision before treating it as verified.

## Owned STOP delete-all hardening (subsequent candidate)

During source inspection we found the original `settleAndCloseActiveSegment` loop could throw on one `deleteSubscription` or `ended_at` SQL write, thus **skip the remaining known subscriptions**. `gate4OwnedStopDelete_v39.ts` now attempts all known distinct IDs, even if one provider DELETE throws or a database marker fails, returns counts only (no provider IDs), and refuses to proceed to credit settlement if even one known-owned deletion cannot be marked. The controller independently attempts incident and failed-segment SQL after the physical cleanup attempts, then throws a fail-closed error. Seven focused no-network negative tests were authored. **Pending exact-head TypeScript and CI execution; live provider closure is not independently certified.** A missing database source row from a lost CREATE response still requires provider inventory rescue and cannot be ruled out by the helper.
