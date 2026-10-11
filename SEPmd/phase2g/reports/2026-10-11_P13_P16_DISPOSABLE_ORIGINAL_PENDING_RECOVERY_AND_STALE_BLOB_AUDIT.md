# P13/P16 — crash-window original recovery progress with durable-but-non-ACK source evidence (disposable PostgreSQL only)

**Prepared October 11, 2026 UTC.** Branch `phase2g-p2g24-github-observer-20261009`, draft PR #27; **NOT merged or deployed. No provider calls, provider credits, new hosted resources, Cloudflare, real Replit deployment, or real scientific SQL mutation**.

## Why this specific repair matters

In P05/P06, the current actual V3.9 callback holds the same UNLOGGED session row lock while asynchronously uploading/download-verifying original provider content. A proposed two-phase admission would instead commit a short LOGGED opaque PENDING intent and release the PostgreSQL connection during external App Storage I/O. Existing [P06 analysis](2026-10-10_P06_DISPOSABLE_TWO_PHASE_OUTSIDE_POOL_BLOB_ADMISSION.md) proved a promising artificial 22-way throughput improvement, but it had an unresolved critical crash window: storage may have completed original upload while final SQL was never committed, or the process may have crashed before any original bytes were stored.

A hash-only PENDING intent **cannot reconstruct an original HTTP body that does not exist**. Repeating a health GET or merely changing the provider-attempt accounting is insufficient. We therefore separate **actual saved byte evidence** from **scientific result integrity**, **independent sender ledger**, **HTTP 2xx authorization**, **live receiver readiness**, and **billable original flight-item counts**.

## Implemented this turn — actual disposable PostgreSQL CAS recovery metadata

On the existing `experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts`, add a nullable `recovery_original_verified_utc` LOGGED metadata field to fixture-only original admission intent DDL. The new guarded `recordVerifiedDisposablePendingOriginalRecoveryV39`:

1. Rejects production/sensitive DB/blob/provider environments and anything other than fixture database `p2g_stage1_fixture`, explicit `P2G_DISPOSABLE_POSTGRES=YES`, and strict synthetic SHA-attempt/UUID arguments.
2. Loads an existing PENDING intent's opaque storage path and SHA; never reads/logs provider data, source object name, original body, sender credentials or scientific schema in output.
3. Refuses missing intent, already COMMITTED source, expired retention window, invalid state/path.
4. Downloads existing ORIGINAL bytes from mock App Storage and SHA-256 verifies them against the immutable LOGGED intent digest. Distinguishes inaccessible/missing bytes and changed bytes from actual intact source.
5. Uses an exact conditional PostgreSQL UPDATE (`source_sha256`, original path, PENDING state, unexpired window and exact synthetic attempt) to record a recovery verification timestamp without moving the intent to COMMITTED.
6. **Never sends HTTP 2xx, deletes an original, deduplicates billable provider flight attempts, restores physical-flight-v2 UNLOGGED items, claims original F.8 PASS, or authorizes the paid YSSY experiment.** On concurrent change it throws a fail-closed uncertainty error rather than quietly reporting success.

Expanded read-only `auditDisposableRawAdmissionIntentsV39` to also report `pendingRecoveryPreviouslyVerified`, `pendingRecoveryThenMissingOrUnreadable`, and `pendingRecoveryThenChanged`, by **re-downloading and SHA-verifying original bytes at each audit**. Thus a past verification timestamp is NEVER proof that the object is still readable or valid. All findings are aggregate-only without object names, session IDs or payload identifiers.

## Real disposable SQL regression matrix

Extended `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts` with actual PostgreSQL16 (not JS mock DB) tests:

- final SQL fails **after** original object successfully uploads: PENDING row survives, recovery verifies exactly that object, saves logged timestamp, leaves PENDING and the original object unchanged, no 2xx or science replay (no false completeness)
- upload crashes **before** original exists: PENDING hash-only source remains unrecoverable, return an explicit missing/no-ack result, never forge payload
- object contents become altered: reject recovered content and do not write verification timestamp or delete blob
- source was already committed, nonexistent or expired: no retroactive PENDING recovery
- production mode or DB URL present: hard refusal without accessing real scientific DB
- an original was verified and **later deleted or mutated**: audit re-verifies current content, surfaces missing/changed post-verification witnesses instead of trusting stale timestamp; pending source and no-2xx safety remain intact

The existing six-plus-six operational tolerance and scoped received-only descriptive science remain distinct and untouched. The P2G22 260/259 historic provider-credit discrepancy is still unresolved by this experiment.

## Explicit remaining release blockers

This is a **disposable-only experiment**; no physical-v2 SQL transformation or original callback parser/route integrates the two-phase path. Even if verified bytes exist, the experiment does not provide signed upstream provider attempt and credit evidence, independent HTTPS first hop, source-to-science reconstruction, UNLOGGED restart replay, 168h real object custody, signed cleanup, or 10s actual published sender ACK. The staged original source may have been present but unknown upstream completeness persists. Source already missing cannot be recreated.

**Correct next architecture:** the future live interface must offer a durable original-byte admission guarantee before any possible 2xx, privacy-compliant lifecycle and cleanup/expiry, short SQL session-lock scope, atomic exact attempted-original/source identities, idempotent rehydration of physical-flight-v2 in UNLOGGED tables, and a defensible uncertainty ledger for missing provider sends. Mere success of this test is **not** a YSSY GO. The user's Oct10 Replit screenshot shows free allowance 100% used; do not schedule or recommend a further two-hour Replit Shell test without cost review.

Cross-references: [P05/P06 actual receiver prep optimization](2026-10-11_P05_P06_REAL_PREPAID_RECEIVER_PRELOCK_SOURCE_PREPARATION.md), [P01–P20 readiness ledger](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [user/assistant decision and partial-science acceptance](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md), [P2G24 issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).


## Final exact CI checkpoint — verified

**[GitHub Actions #38117718758](https://github.com/HKcode22/ReplitTranvr/actions/runs/38117718758)**, exact tested source commit `3f3e0a0d589cb79bcb7af5a4c723505e41677752`, **both jobs SUCCESS**:
- **641/641 offline tests** in **62 suites**
- **82/82 actual disposable PostgreSQL16 integration tests**, six newly added P13 source-recovery/first-timestamp/stale-blob scenarios
- Real unclean PostgreSQL SIGKILL still confirms `AFTER_UNCLEAN_RESTART_LOGGED_AND_UNLOGGED=1|0`

The new fixture recovery timestamp is now `COALESCE(recovery_original_verified_utc,clock_timestamp())`; a repeated exact SHA readback preserves the first verified timestamp rather than altering the historical recovery witness. A subsequent audit independently re-downloads stored original bytes, so this timestamp never substitutes for actual present and matching content.

These 82/82 tests include *real SQL* through PostgreSQL16 but mock the external object store; they do NOT demonstrate surviving Replit Autoscale cold-start, live provider callback, production App Storage readback, source attempt attribution, external billing, or a deployed replay. Candidate remains intentionally fixture-only and not invoked from the current paid callback.
