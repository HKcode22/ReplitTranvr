# P06 — new original outside-lock staging: ambiguous upload/readback preservation, SQL-anchored retention and expiry CAS

**Prepared October 11 2026 UTC. Isolated draft PR #27 only. Fixture-only candidate, NOT paid receiver rollout, no live provider calls, no Replit Shell, no production scientific DB/retained objects mutation, no Cloudflare/new hosting or published app change.**

## Concrete original-source custody hazard

The shared **current production blob primitive**, `server/lib/disruption/providerBlobStore_v39.ts` `persistProviderBlobBeforeAckV39`, attempts best-effort object deletion for errors during upload, storage visibility check, or original download/byte verification. This is an existing implementation behavior, **not proof that the October 9 incident deleted any historical original**. But in a future new-original **two-phase PENDING LOGGED journal** design, the upload might have succeeded while the object-storage response or subsequent download merely timed out. Deleting in that ambiguity would destroy bytes the LOGGED PENDING record needs for scientifically faithful later recovery. A source digest alone cannot reconstruct an absent original flight body; no ACK may be emitted and no missing original can be fabricated.

We must **not** simply apply the shared primitive's failure cleanup behavior inside the new experimental P06 journal. A hard-delete after an uncertain upload is particularly harmful when no independently authenticated provider resend/attempt ledger is available. Privacy/168-hour cleanup remains a separate reviewed authorization and retention obligation; preserving source evidence indefinitely is also not authorized.

## Actual changed source — strictly disposable only

Modified `experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts`:

1. New fixture-private `stageQuarantinedOriginalWithoutCleanupV39` explicitly uploads opaque original bytes, checks store object visibility, downloads bytes, and validates exact byte length/SHA-256/byte-for-byte original equality. **It NEVER calls `store.delete` on any failure**, including ambiguous upload result or unreadable/corrupted remote content. It replaces `persistProviderBlobBeforeAckV39` **only inside this isolated disposable candidate**. The deployed paid callback and shared blob primitive remain unchanged.
2. The first LOGGED PENDING SQL `INSERT ... RETURNING` now returns exact `created_utc` and `source_retention_until`, anchored to the **same PostgreSQL `NOW()`** timestamp rather than a later JS time after an arbitrarily long upload. Enforces expiry-created interval exactly 168 hours and rejects invalid evidence; the opaque original UUID/name remain frozen from initial claimant.
3. The post-upload final source receipt `UPDATE PENDING → COMMITTED` now requires the **exact originally frozen opaque object path**, original payload SHA/attempt owner token, and `source_retention_until>clock_timestamp()`. An upload that finishes after declared expiry can never produce a COMMITTED raw-only receipt.
4. Matching duplicate attempts read `source_retention_until` and now reject an expired or malformed retention record **even if the old COMMITTED row and raw bytes remain**. An expired raw source cannot masquerade as a currently verified preserved receipt.
5. Additional fail-closed fixture guards refuse a `DATABASE_URL`, `V39_DATABASE_RUNTIME_URL`, `V39_PROVIDER_BLOB_BUCKET_ID` or provider API key, require `P2G_DISPOSABLE_POSTGRES=YES`, an exact matching `p2g_stage1_fixture` database, SHA attempt and UUID session. This is **NOT** a candidate implementation for active paid deployment.
6. **No source ack on any result**: existing `safeToReturn2xxToSyntheticSender:false`, `normalizedPhysicalFlightV2ScienceCommitted:false`, `realPaidLaunchAuthorized:false`, `originalProviderAttemptWitnessVerified:false`. Even a COMMITTED raw-only journal must never authorize live webhook 2xx, F.8 complete science, billing claims, subscription launch or unmapped flight recovery.

## Real disposable PostgreSQL16 regression coverage

Extended the same actual PostgreSQL16 fixture integration suite with these independent NEW-original scenarios:

- Upload bytes actually saved, **subsequent first download times out**: object remains in mock storage, LOGGED intent remains PENDING, zero delete operations, exact journal 168-hour interval, later SHA recovery can mark first recovery timestamp but still no ACK/replay/delete.
- Upload bytes successfully stored but **upload function throws a lost-success-response error**: object remains recoverable; PENDING intent and no ACK; no automatic object deletion or fabricated source/flight credit evidence.
- Readback returns wrong/corrupted bytes while original stored object is intact: PENDING retained, no auto-delete, later exact readback can verify; no false COMMITTED.
- An upload deliberately takes long enough for an independent SQL transaction to **expire PENDING retention**: post-upload SQL CAS refuses COMMITTED; object retained as orphan for manual retention review; expired duplicate refuses.
- Previously COMMITTED source then artificially expired: reject duplicate even with identical bytes; no new upload or deletion.

The existing tests still demonstrate 22 independent mock original uploads run without holding DB connections in this experimental variant, exact distinct synthetic attempts are not automatically collapsed into one billable event, and real V3.9 callback paths retain their separately-tested SQL COMMIT-before-2xx rule. P13 quarantined physical-v2 replay also remains synthetic and never proves a provider first-edge UTC.

**VERIFIED [GitHub Actions #38122281477](https://github.com/HKcode22/ReplitTranvr/actions/runs/38122281477)** at exact tested code SHA `fc432037bb9fcb5f42d8a2f18857b287305e752b`: **BOTH JOBS SUCCESS, 659/659 offline tests (63 suites), 106/106 real disposable PostgreSQL16 integration tests**. Separate true unclean PostgreSQL restart confirms `AFTER_UNCLEAN_RESTART_LOGGED_AND_UNLOGGED=1|0` and `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED`. The new failures are injected using a fake object store; this does not establish how actual Replit App Storage reports ambiguous upload or deletion.

## Unresolved blockers before changing paid new-original concurrency

This fixes a demonstrable **candidate-source custody hazard** and expiry metadata consistency; it does NOT solve the larger system coupling: independent reliable original HTTPS first-hop, authentic sender attempt/flight-item credits, 168h bucket immutability/real retention enforcement, post-crash exact paid v2 scientific item replay with authenticated first edge, previously committed original idempotence, retention-approved orphan deletion/reaper, public deployed cold-start and <=10 second ACK under 22 distinct sends. No provider acceptance, billing or missing-sender conclusions may be inferred from these fixture tests. The current actual paid callback continues original upload+readback **inside the SQL session lock**, and draft PR #27 remains unmerged.

Source context: [P16 orphan custody risk](2026-10-11_P16_DISPOSABLE_ORIGINAL_CUSTODY_EXPIRY_AND_ORPHAN_MANUAL_GATE.md), [P13 actual physical-v2 synthetic quarantine](2026-10-11_P13_ATOMIC_QUARANTINED_REAL_PHYSICAL_V2_FIXTURE_REHYDRATION.md), [P14 actual 30 saved originals item/credit audit readiness](2026-10-11_P14_REAL_SAVED_ORIGINAL_30_BLOB_ITEM_CREDIT_READONLY_AUDIT_READY.md), [full P01–P20 release ledger](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
