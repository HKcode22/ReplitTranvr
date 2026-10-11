# P16 — source-original custody and orphan/expiry manual-review gate for P06 new-original two-phase staging

**Scope:** October 11, 2026 UTC, only isolated draft GitHub branch `phase2g-p2g24-github-observer-20261009`, draft PR #27. **Not merged, not published, no real AeroDataBox calls, no production DB/object mutations and no Replit Shell execution.**

## Specific failure we are closing

P06 cannot safely move uploads for *new, distinct* callbacks outside the session-wide PostgreSQL `FOR UPDATE` until a LOGGED original intent, original-byte integrity, post-crash replay, first ingress attempt custody, credit accounting, and cleanup are jointly correct. The existing strict disposable candidate deliberately keeps a **LOGGED PENDING SHA/object reference** before upload, uploads outside session lock, and only produces an *unacknowledgeable raw-only* COMMITTED result, never a paid 2xx. A crash may leave PENDING with either a real original still stored or only a hash (original was never stored). A previously intact blob may disappear later. Original bytes may survive after recorded retention expiry while the scientific replay remains incomplete; silently deleting such bytes would destroy irreplaceable scientific source evidence.

Our previous `auditDisposableRawAdmissionIntentsV39` only differentiated PENDING/COMMITTED, current original present/corrupted/missing and previously-verified-then-missing, plus an aggregate metadata expiry count. It did NOT specifically identify original custody becoming urgent *before* the retention boundary and did not forbid passing a live DB URL/bucket env as strongly as its write-capable recovery neighbor.

## Actual P16 code change

Strengthened the **existing read-only** `experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts` original audit. New strict guards now refuse any environment containing `DATABASE_URL`, `V39_DATABASE_RUNTIME_URL`, `AERODATABOX_API_KEY` or `V39_PROVIDER_BLOB_BUCKET_ID`; only explicit disposable fixture database `p2g_stage1_fixture` with `P2G_DISPOSABLE_POSTGRES=YES` can run. Invalid retention timestamp throws instead of being silently treated as unexpired.

The fixture audit adds **aggregate-only** counters (1-hour diagnostic watch horizon, NO automatic action):

| Counter | Precise meaning |
| --- | --- |
| `pendingVerifiedOriginalNearExpiry` | PENDING; SHA matched current bytes, earlier verification stamp exists, retention expires in <=1h but not already expired |
| `pendingUnstampedOriginalNearExpiry` | PENDING; current bytes verified, no recorded prior recovery, retention expires in <=1h |
| `pendingOriginalMissingBeforeExpiry` | PENDING with originally referenced object currently missing/unreadable despite unexpired metadata |
| `pendingRecoveryVerifiedThenMissingBeforeExpiry` | Subset of preceding: a previously verified PENDING original is NOW missing while its nominal retention remains unexpired |
| `committedOriginalMissingBeforeExpiry` | COMMITTED raw-only receipt currently missing source bytes before its stated retention deadline |
| `pendingOriginalPresentAfterExpiry` | PENDING with current object still readable after metadata expiry, regardless of SHA validity |
| `expiredObjectStillReadable` | Any PENDING or COMMITTED object physically readable after its retention metadata expires |

**Every status remains strictly non-authorizing**: `orphanCleanupDisposition:"MANUAL_REVIEW_NO_AUTOMATIC_DELETION"`, `canAutoAcknowledge=false`, `canAutoDelete=false`, `canAutoReplay=false`, `originalProviderSourceCompletenessVerified=false`, and `paidLaunchAuthorized=false`. Source objects stay untouched, metadata stays unchanged and no original identity/object key/payload is exposed in audit output.

**DO NOT infer** that a metadata expiry timestamp permits deleting a readable original: source contract, F.8/raw preservation, payer/billing proof, known provider sender attempts and legitimate cleanup authorizations are separately needed. An expired object that is already missing is NOT retroactive evidence that its original bytes were absent at time of webhook receipt. The audit uses caller-supplied test reference time and fixture state, **not** an external immutable provider/first-hop timestamp.

## Real PostgreSQL16 integration evidence

Expanded `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts` with six real disposable PENDING/COMMITTED journal scenarios (not JS DB mocks), using a mock object store and deliberately short/expired reference times:

1. PENDING, previously verified actual source, within 30m of expiry.
2. PENDING original still SHA-valid but not previously stamped, within 30m.
3. PENDING previously verified original later lost, still inside original retention.
4. PENDING original still readable but its declared retention expired.
5. COMMITTED original missing before declared expiry.
6. COMMITTED original still readable after declared expiry.

Assertions check exact aggregate counts, all false authorizations and no changes to the PostgreSQL journal or object store; another test rejects any environment containing real DB URL/bucket credentials. This simulated fixture expiry clock tests **classification semantics** only; it does not assert that the published 168h Replit retention is automatically enforced or that source never changes. The real PostgreSQL SIGKILL test continues to demonstrate that LOGGED survives and UNLOGGED disappears; it is not evidence of Replit runtime recovery.

## Remaining production gate

**P06 new-original source-before-lock cutover remains NO-GO**. No production migration, atomic independent HTTPS ingress, storage object write-once/generation evidence, upstream attempt provenance, exactly-once scientific replay to physical-v2 after arbitrary crash, unknown COMMIT reconciliation, protected raw-object retention/legally approved deletion, or 10s hosted callback sender-ACK has been demonstrated by this manual status check. This changes only the **disposable readiness and custody audit**, not original paid route behavior. Existing live code still uploads new originals under lock. The duplicate-only fastpath remains operator-disabled and has independent TOCTOU limitations.

[Original P13 verified PENDING recovery](2026-10-11_P13_P16_DISPOSABLE_ORIGINAL_PENDING_RECOVERY_AND_STALE_BLOB_AUDIT.md), [P06 duplicate-only opt-in](2026-10-11_P06_ACTUAL_PREPAID_DUPLICATE_READBACK_PRELOCK_OPT_IN.md), [P14 original saved content audit (coded, real run not executed)](2026-10-11_P14_REAL_SAVED_ORIGINAL_30_BLOB_ITEM_CREDIT_READONLY_AUDIT_READY.md), [P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), and [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).

**VERIFIED [GitHub Actions #38121524747](https://github.com/HKcode22/ReplitTranvr/actions/runs/38121524747)** at exact tested code SHA `fe2885b00b8c94bf8635a762e86bae345ccb4490`: BOTH JOBS SUCCESS, **659/659 offline across 63 suites, 101/101 actual disposable PostgreSQL16 integrations**. True unclean PostgreSQL SIGKILL again proved LOGGED=1 / UNLOGGED=0. The new source-custody expiry tests and source code are fixture-only; no real App Storage retention or production callback tested.
