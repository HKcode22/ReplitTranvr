# P06 — new-original PENDING source CAS must preserve exact opaque object identity and full-precision 168-hour expiry

**Date:** October 11, 2026 UTC. **Branch:** isolated investigation `phase2g-p2g24-github-observer-20261009`, draft PR #27. **NOT DEPLOYED.** No Replit Shell, provider calls, original App Storage writes, paid credits, scientific production DB changes, new hosting/Cloudflare or real paid collection.

## Exact safety gap found in the latest new-original fixture

The previous P06 disposable two-phase journal staged an original outside the per-session SQL lock after committing a LOGGED `PENDING` record. Successful remote upload/readback could then run `UPDATE state='COMMITTED'` using exact owner token, attempt HMAC, source SHA, original opaque path, and **retention timestamp still in the future**. However, it did not require that:
- the original **opaque object UUID** still equaled the initial reservation;
- the `created_utc` and `source_retention_until` remained at their **original reserved values**; or
- the retention interval remained exactly 168 hours, not extended to 169h or otherwise rewritten.

A future or concurrent database change could therefore alter the original's retention or UUID while the external upload was running and still satisfy `source_retention_until>clock_timestamp()`. The source should not silently become COMMITTED under that changed evidence; it must remain PENDING, with the actual original bytes retained for manual/source-SHA recovery and no 2xx.

## Engineering fix (DISPOSABLE candidate only)

Updated `experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts`:
1. Initial `INSERT ... RETURNING` emits `created_utc::text` and `source_retention_until::text` in the response. Their exact PostgreSQL **microsecond precision** is retained. Returning JavaScript `Date` objects instead truncates microseconds; the first CI attempts demonstrated this yields incorrect failure of legitimate equality CAS (14 otherwise working real-PG tests rejected). We caught, diagnosed, and repaired the precision regression before final acceptance.
2. Final `PENDING → COMMITTED` CAS now includes original **`original_opaque_blob_uuid=$6::uuid`**, exact opaque path, original `created_utc=$7::timestamptz`, original `source_retention_until=$8::timestamptz`, `source_retention_until=created_utc+interval '168 hours'`, and unexpired `source_retention_until>clock_timestamp()`. This tests the exact original journal reservation, not merely an expiry that remains in the future. A mismatch returns no row and **fails with `P06_CANDIDATE_ORIGINAL_COMMIT_UNCERTAIN_NO_ACK`**, retaining the object and original journal for explicit review.
3. A duplicate with the same attempt digest/source SHA now checks **stored blob UUID/path correspondence** via the production opaque path constructor, exact 168h interval and unexpired metadata before any `VERIFIED_DUPLICATE`. A tampered COMMITTED source cannot masquerade as an intact verified original receipt. `VERIFIED_DUPLICATE` still has `safeToReturn2xxToSyntheticSender=false`, zero normalized physical-flight-v2 science, no real upstream sender/credit proof and no paid GO.
4. This does NOT implement production App Storage object generation/write-once behavior or prove original bytes cannot mutate *after* the last SHA readback. It does not prevent an authorized DB actor from changing metadata after a transaction; release requires explicit DB immutability constraints, scoped migration review, real 168h retention and separately authenticated original sender evidence.

## Real disposable PostgreSQL regression matrix

Added three actual PostgreSQL16 source-race tests, with the full pre-existing 659 offline and 106 real-PG tests retained:
- An original upload delayed ~380ms, then a distinct database transaction extends retention **168h→169h** during upload. CAS must refuse COMMITTED; original saved object remains; matching later attempt fails the frozen-reference guard; no new upload/ack.
- An original upload delayed ~380ms, while a distinct SQL query mutates the reserved opaque blob UUID. CAS refuses COMMITTED despite original bytes being retained, and duplicate cannot accept an invalid UUID/path pairing.
- After a legitimate COMMITTED source, alter blob UUID or extend expiry. Both changes prevent a falsely verified raw-only duplicate despite byte contents unchanged. No duplicate cost source or science should be created.

Existing tests additionally cover upload-success response lost, post-upload download timeout, readback corruption, upload finishing after expiry, COMMITTED duplicate after expiry, recovery SHA and no delete. All tests use a disposable database `p2g_stage1_fixture` and mock original storage; true separate PostgreSQL SIGKILL LOGGED=1/UNLOGGED=0 is also part of suite.

**VERIFIED [GitHub Actions #38124265984](https://github.com/HKcode22/ReplitTranvr/actions/runs/38124265984)** at exact tested source SHA `040c4ff9b2165577b63f0ceb43c6a5757ec4aea4`: **BOTH JOBS SUCCESS: 659/659 offline tests (63 suites), 109/109 real disposable PostgreSQL16 integration tests**. The real PostgreSQL server SIGKILL again confirmed `AFTER_UNCLEAN_RESTART_LOGGED_AND_UNLOGGED=1|0`, `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED`. Earlier interim runs #38124132542 and #38124160610 failed because JS Date truncated the PostgreSQL microseconds, which was fixed by exact SQL timestamp-text roundtrip. No production DB/blob/provider was exercised.

## Operational relevance

The user asked us to keep strengthening the real ability to complete future YSSY 2h Stage-1. This closes one additional **candidate journal state-transition integrity** hazard and prevents silent acceptance of manipulated 168h source custody. It remains **research/release prerequisite code only**. The actual paid V3.9 callback still uploads NEW DISTINCT originals under the shared session `FOR UPDATE` lock, still has no independent original POST first-hop sender ledger, no authoritative AeroDataBox per-attempt item-cost/source census (historic external 260 vs internal 259 unexplained), no all-original atomic verified production rehydration and no tested public 10s burst sender ACK. Do not merge PR #27, enable opt-in duplicate path, launch paid provider subscription, deploy published app, or extend/delete protected originals without explicit operator decision and respective gates.

Cross references: [P06 ambiguous upload/no-delete correction](2026-10-11_P06_NEW_ORIGINAL_AMBIGUOUS_UPLOAD_READBACK_NO_DELETE_AND_EXPIRY_CAS.md), [P16 original expiry and no auto-delete](2026-10-11_P16_DISPOSABLE_ORIGINAL_CUSTODY_EXPIRY_AND_ORPHAN_MANUAL_GATE.md), [P13 quarantined physical-v2 fixture rehydrate](2026-10-11_P13_ATOMIC_QUARANTINED_REAL_PHYSICAL_V2_FIXTURE_REHYDRATION.md), [P01–P20 tracked gates](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
