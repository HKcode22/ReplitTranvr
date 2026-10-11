# P13/P06 — atomic quarantined actual physical-flight-v2 fixture rehydration from previously verified original

**Recorded Oct 11, 2026 UTC. State: NEW CODE/TESTS on isolated draft PR #27; not production code and not paid YSSY authorization.**

## Problem addressed

Prior P13 source recovery could only (a) verify saved object SHA/bytes and leave a LOGGED raw admission intent PENDING or (b) produce a read-only physical-v2 source mapping preview. None rebuilt an actual V3.9 UNLOGGED physical-flight item from the original. A separate preexisting fixture `disposable_exact_science_restore_v39.ts` restores exact **signed post-ingest snapshots**, but such self-signed synthetic snapshots do not prove an independent provider source attempt.

The new guarded `experiments/phase2g_rehearsal/disposable_quarantined_physical_v2_rehydrate_v39.ts` fills a **narrower, safe disposable implementation gap**. It reconstructs scientific delivery+physical item rows using the real `resolvePrepaidFlightIdentityV39` and V3.9 prepaid mapping, but **requires an explicitly quarantined synthetic owner** and a separately supplied *UNAUTHENTICATED synthetic first-edge UTC*. These rows must not become a paid scientific sample, full F.8 source census, original sender attempted/billed credit count, or a positive provider ACK.

## Source custody and algorithm

1. Reject `DATABASE_URL`, `V39_DATABASE_RUNTIME_URL`, `AERODATABOX_API_KEY`, `V39_PROVIDER_BLOB_BUCKET_ID`; demand `P2G_DISPOSABLE_POSTGRES=YES`, UUID session, synthetic SHA attempt ID, and exact disposable PostgreSQL database `p2g_stage1_fixture`. This is a fixture-only standalone module **NOT imported by the live receiver**.
2. Require original PENDING LOGGED intent with prior `recovery_original_verified_utc`, unexpired 168h source, strict opaque original storage name and content SHA. **Download real original bytes again** from test storage, enforce size and SHA. Apply the *actual paid JSON duplicate-key/UTF-8 structural parser* and the production source body/item canonical hash functions. Do not trust the old verification timestamp alone.
3. Require a single synthetic subscription ID matching the quarantined session, a **user-supplied synthetic** two-hour original UTC window and synthetic first-edge UTC inside it; source JSON cost credits remain **UNAUTHENTICATED source claims**. No attempt to infer a missing upstream sender notification.
4. Under a real disposable PostgreSQL transaction, acquire a per-session advisory transaction lock, recheck exact PENDING source record/owner, and reject anything but `state='quarantined'`. The fixture must be explicitly placed in quarantine; after UNLOGGED reset the module **does NOT autonomously rearm or create an owner**.
5. Reuse the **exact original bytes and existing original object UUID**. Create at most one LOGGED metadata reference with `source_kind='synthetic-quarantined'` (not provider-`webhook`) and exact source SHA/size/TTL; **do not upload a second source object**. Subsequent replay requires strict matching original source metadata, including content length, SHA, opaque object key, source kind, contract, storage, timestamp and 168h retention. Fixture original intent source creation and expiry now share the same SQL `NOW()` clock to avoid inconsistent retention boundaries.
6. Insert exactly one UNLOGGED V3.9 delivery and source flight-items using **the real `resolvePrepaidFlightIdentityV39` function**, in source order. Identifiable `IsOperator` records may receive physical-flight-v2 IDs; `IsCodeshared` marketing and unknown codeshare states remain quarantined. Source items use production per-item canonical SHA and identity metadata. **First-edge recorded time is synthetic caller input, not authenticated original provider receipt UTC**, and the session remains quarantined.
7. On duplicate call, serially verify existing delivery and item content/physical ID/codeshare/source/time against deterministically reconstructed expectations; do not insert additional rows or create another LOGGED blob reference. Any conflicting item/source/delivery makes the entire transaction roll back. **Never report success if a concurrent original changes, expires or disappears before readback**.
8. All results deliberately include `originalSourceCustodyIndependentlyAttested:false`, `originalEdgeUtcIndependentlyAttested:false`, `providerAttemptAndCreditsIndependentlyVerified:false`, `canAcknowledge:false`, `canResumePaidCollection:false`, `canClaimCompleteF8:false`, `paidLaunchAuthorized:false`. Even `SYNTHETIC_QUARANTINED_INSERTED` is **not a scientific PASS**.

## Actual disposable PostgreSQL tests added

- Rehydrate three original flight observations — operated QF leg, marketing codeshare and unknown codeshare — confirming one physical-v2 resolution and two quarantine outcomes; exact synthetic original edge UTC and item SHA preserved.
- Repeat from the same exact original: **idempotent**, no duplicate UNLOGGED delivery/flight items or logged blob reference; unchanged original PENDING source status and zero callback successes.
- Concurrent duplicate rehydrations: one insert plus one idempotent result, one original blob/upload, zero upstream credits.
- Wrong active session owner (rather than explicit quarantine), changed original bytes, deleted source, expired source, and synthetic first edge outside frozen window fail closed.
- Corrupted existing normalized item SHA on duplicate causes transaction rollback and refuses a falsely accepted reconstruction.
- After simulated UNLOGGED reset, no owner = **no automatic restoration**. A separate **manual synthetic-only** quarantined owner re-creation can rehydrate the same original physical ID, item SHA and synthetic timestamp without duplicating LOGGED content (not an independently attested timestamp).
- Tampered LOGGED original reference size or expiry fails close; original JSON with duplicate source/billable-credit field, wrong subscription ID and production env guard all refuse.
- Whole test suite retains real disposable PostgreSQL16 + external storage mocked + separate real SIGKILL LOGGED=1/UNLOGGED=0 proof. An explicit TRUNCATE in a fixture models the expected UNLOGGED loss; it does **NOT** replace the separate actual unclean restart test.

## Why this is not yet deployable

The key blocking fact is still the **absence of an independently captured original POST first-edge UTC and upstream sender/attempt/credit ledger**, plus absence of a reliable original provider POST admission path during Replit Autoscale cold starts. The recovered rows have a synthetic timestamp and artificial fixture signer: they could describe source CONTENT, but cannot infer true source-time coverage, scientifically complete missingness, or historical 260 external/259 internal credit causes. Current paid receiver still holds a shared SQL lock across actual blob upload/download; two-phase design remains unintegrated due to real crash/cleanup and original source custody requirements. No production DB, Replit publish, Cloudflare, provider subscription or paid credits were touched.

**Next:** extend idempotence under competing ORIGINAL physical-leg retimes, prove consistency of original 168h lifecycle, and design a signed real ingress source ledger with an operator-approved, existing-cost Replit deployment review. Do NOT use the fixture recovery mechanism to reclassify P2G24 or authorize YSSY.

Links: [Prior P13 raw-only ACK safety](2026-10-11_P06_P13_RAW_RECEIPT_2XX_BOUNDARY_AND_PHYSICAL_V2_REPLAY_PREVIEW.md), [P01–P20 ledger](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [our joint bounded-missingness/6+6 decision](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).

**CI [#38118686804](https://github.com/HKcode22/ReplitTranvr/actions/runs/38118686804) at code SHA `cee11f3d43e623a8858ba71a378a85a398066e31` was IN PROGRESS when this file was created; final claims require direct verification of both jobs.**
