# P06 — actual callback-source failure journal and original reuse after scientific SQL rollback (opt-in OFF)

**Oct 11, 2026. Isolated draft PR #27, NOT merged or published. All new source behavior is disabled unless two specific explicit environment flags are present. No provider subscription, Replit deployment, paid credits, or production database/storage changes.**

## Real production-source problem found

The actual `server/lib/disruption/prepaidProbeRuntime_v39.ts` callback uploads/download-verifies a new canonical provider notification in Replit App Storage while holding an UNLOGGED session row lock. If later normalization/physical-v2/item SQL fails BEFORE successful COMMIT, its catch handler rolls back scientific data and had **best-effort early DELETION** of the verified original source via `deleteProviderBlobAtExpiryV39({allowEarlyDelete:true})`. In a zero-upstream-retry environment, this removes the only saved bytes of a provider notification that ACTUALLY reached our receiver. If an HTTP retry DOES happen, the callback could upload the same original twice because no successful UNLOGGED delivery remains. A lost response to a *failure-accounting* SQL COMMIT could also leave uncertainty, where destructive cleanup is unjustified.

We already proved that LOGGED PostgreSQL survives an unclean restart while UNLOGGED tables may disappear; ordinary preserved stored original object bytes and logged content SHA alone never prove an independent upstream sender census or full F.8. Avoid replacing this defect with an untracked permanent orphan or an unsupported new `source_kind`: baseline B0062 `clean.provider_content_blob_ref` accepts **only `webhook` or `fids`** for `source_kind`, with 168-hour source metadata retention and immutable blob metadata. A safe incremental fix must reuse the existing exact `webhook` blob-ref contract.

## Real callback implementation (disabled by default)

New `prepaidFailedSourceJournalApprovedV39(env)` requires BOTH
`V39_CALLBACK_ONLY_RUNTIME=1` AND `V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED=1`. Neither flag was set by these commits. Normal paid callbacks therefore retain previous behavior until separate cost/privacy/release approval.

**On new-original failure after verified storage but before scientific COMMIT:**
- Existing session lock, request/failure accounting and `ROLLBACK TO SAVEPOINT phase2g_callback_payload` remain.
- In a separate journal savepoint within that same failure-accounting transaction, write **one** immutable `clean.provider_content_blob_ref` row for the verified exact canonical bytes/blob ref, with baseline-supported `source_kind='webhook'`, source key `prepaid:<session_id>:<delivery_id>`, original `persisted_at_utc`, exact SHA/size and 168-hour expiry. The original scientific delivery and flight items remain rolled back. This is a **source-custody failure journal**, never a successful normalized observation or sender ACK.
- COMMIT both the failure counter and the LOGGED original reference. **Do not early-delete** a journaled original. If this COMMIT response is lost, treat its outcome as **UNKNOWN** and retain the blob rather than assuming rollback and deleting data.
- A failed journal insertion cannot turn scientific SQL failure into HTTP 200; the nested savepoint allows ordinary failure accounting to continue. If journaling fails, existing recovery limitations remain and no false source evidence is claimed.

**On a retry of an original whose previous normalized SQL failed:**
- Under the existing same-session lock, look up the deterministic `webhook` source record in LOGGED metadata; require EXACTLY ONE, not 2 ambiguous refs.
- Validate the baseline blob-ref contract including opaque UUID/path, SHA, size, original 168h retention and unexpired object, then download/reverify full canonical SHA and byte equality. Changed, expired, absent or duplicate LOGGED source must FAIL without uploading another source or ACK.
- Reuse **the same existing LOGGED blob ref** and **the original Node-receiver-observed UTC** for delivery and physical-flight item timestamps. A retry time does NOT masquerade as first receipt for the 15-minute science bins.
- **Still execute the ordinary real physical-v2 resolver and UNLOGGED SQL transaction, update success counters and COMMIT before 200.** Failed again? Keep the same source metadata/blob and failure accounting, no re-upload or early deletion.
- This does not lower 22-distinct-original session lock + App Storage latency on a first original, and does not invent independent AeroDataBox sender data/charged-flight-item proof.

## Limits and explicit non-goals

- A SOURCE-ONLY LOGGED ref is not a completed prepaid delivery. Any reporting/cleanup must distinguish a LOGGED source with missing current UNLOGGED delivery, not count it as a scientifically complete or externally billed event.
- If the verified-upload helper itself throws before yielding `blob`, the existing destructive cleanup behavior *inside that helper* remains. The separate disposable two-phase candidate has an explicit no-delete upload, but we have **not** safely integrated its source-first journal and bucket retention into the paid path. This feature addresses **verified bytes + later scientific SQL failure**, not every ambiguous upload.
- If the journal commit cannot complete and returns an ambiguous response, the bytes may be retained without a confirmed LOGGED reference; this requires supervised orphan review within the 168-hour privacy/retention rules. No unlimited retention or automatic deletion policy is authorized.
- This implementation does not create a durable first hop outside Replit Autoscale, authenticate the sender's original HTTP wire bytes, prove original send UTC/attempt/cost, fix historical 260 externally billed versus 259 internally committed credits, or make real hosted 10-second SLO valid.
- The new extra SQL LOGGED source lookup runs only when explicitly enabled, while still holding the paid session lock. The feature must be performance-reviewed before considering activation, and on-disk B0062 triggers/real cleanup policies must be validated against a disposable copy of the baseline before a paid release.

## Integration and CI

Added real PostgreSQL16 fixture tests (not SQL mocks) on the **actual V3.9 persistence function**, including:
1. Flags default-OFF and requiring both explicitly.
2. Insert a disposable-only cost CHECK forcing *later* scientific SQL failure after verified original upload. Verify original byte remains, LOGGED metadata exists with 168h retention, UNLOGGED delivery absent, requests=1/successes=0/failures=1. Remove constraint and resend same notification with a *later* arrival clock: verified original source UUID is reused with NO second upload, frozen original UTC is preserved in delivery+physical item, source/credit is counted only once, further callback is correctly duplicate.
3. Delete the verified retained original before retry: callback fails closed, no new blob, no false 2xx.
4. Lose the server response to **failure-accounting COMMIT** after PostgreSQL actually commits: blob must remain rather than be destroyed, LOGGED source survives, no completed scientific delivery/false ACK.

All real provider calls=0, original paid app change=0, new live migrations=0, deployment/main merge=0.

**CI pending at creation**: [Actions #38125006523](https://github.com/HKcode22/ReplitTranvr/actions/runs/38125006523) at exact code source SHA `d4ce312b4e8b24e64c74490f3a61595f6491b1a9`. Do not call success until BOTH offline and ephemeral PostgreSQL16 finish; if either fails, fix and rerun.

## Remaining release gate

P06 new-original callback still holds the PostgreSQL session lock during the initial App Storage upload/readback. P09 independent reliable ingress, P13 paid-source provenance and audited exact flight-v2 restoration, P14 authentic AeroDataBox attempts/billed flight-items, P18 deployed receiver image parity and P20 public sender ACK under load are OPEN. No paid YSSY until these operational gates and explicit operator authorization.

Sources: [previous P06 outside-lock disposable original candidate and CAS](2026-10-11_P06_NEW_ORIGINAL_FROZEN_RETENTION_UUID_CAS_AND_TIMESTAMP_PRECISION.md), [P14 source-only LOGGED ref vs UNLOGGED content audit](2026-10-11_P14_REAL_SAVED_ORIGINAL_30_BLOB_ITEM_CREDIT_READONLY_AUDIT_READY.md), [P16 source orphan/expiry manual guard](2026-10-11_P16_DISPOSABLE_ORIGINAL_CUSTODY_EXPIRY_AND_ORPHAN_MANUAL_GATE.md), [living P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [Issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
