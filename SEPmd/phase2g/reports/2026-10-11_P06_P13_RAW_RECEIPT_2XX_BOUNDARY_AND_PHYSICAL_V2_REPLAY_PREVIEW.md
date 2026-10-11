# P06/P13 — raw-only receipt no longer implies HTTP 2xx; recovered original mapped to actual physical-v2 input (read-only fixture preview)

**Oct 11, 2026 UTC. Isolated draft PR #27 ONLY. No paid launches, published deployments, GitHub main merges, production DB mutations, AeroDataBox API calls, extra Replit computation, new subscriptions, or Cloudflare resources.**

## Critical safety finding and fix

The earlier two-phase **disposable synthetic** admission `experiments/phase2g_rehearsal/disposable_parallel_raw_admission_candidate_v39.ts` returned `safeToReturn2xxToSyntheticSender:true` for raw original SHA-backed `COMMITTED_SOURCE_RECEIPT` and `VERIFIED_DUPLICATE`. This was misleading: it only established a **LOGGED raw-intent commit**, not that recovered contents had been mapped to physical-flight-v2, persisted into scientific tables, linked to correct owner/UTC window, reconciled to independent billed flight-item attempts, or could be recovered after UNLOGGED reset.

Now `safeToReturn2xxToSyntheticSender:false` and `normalizedPhysicalFlightV2ScienceCommitted:false` **for all outcomes, including a verified original**. `sourceBlobBytesVerified` and `pgCommitted` retain their narrower correct meaning, permitting engineering measurement without granting release. The current actual paid V3.9 receiver remains unchanged in this specific fix and still only ACKs after its ordinary external blob readback and SQL COMMIT. **This fix does not change LIVE provider callback behavior.**

## Read-only bridge toward physical-flight-v2 recovery

Added `experiments/phase2g_rehearsal/disposable_pending_physical_v2_replay_preview_v39.ts`: a strictly **disposable-only**, preexisting **LOGGED PENDING** recovered-original inspection. It enforces fixture DB `p2g_stage1_fixture`, `P2G_DISPOSABLE_POSTGRES=YES`, rejects real DB/provider/bucket environment, requires matching session ID and attempt digest, *previously verified source timestamp* and unexpired retention, checks original opaque object path and CURRENT downloaded original SHA/byte size, rejects invalid UTF-8, duplicate or escaped JSON object keys through the same production `assertPrepaidOriginalJsonStructureV39`, then uses the actual production `preparePrepaidProbeSourceV39` and `prepaidIdentityObservationFromFlightV39` to calculate deterministic body/item hashes and classify source flight records as operator candidates vs marketing/ambiguous codeshares and missing identity prerequisites.

The result is a **sanitized replay preview**: total parsed flight records, candidate/quarantine counts, canonical body SHA and item-list SHA digest, and raw source SHA. No flight numbers, PII, session ID, source object key, callback secret, or raw provider payload are emitted. Its `senderClaimsCostCredits` is **a parsed source claim**, not an independently verified credit count; all source authentication/independent first-hop/scientific completeness are explicitly false.

### HARD LIMIT: no actual replay or HTTP success

The preview does **not** invoke the actual `resolvePrepaidFlightIdentityV39` persistent identity resolver; does **not** construct/restore UNLOGGED session, item or delivery tables; does **not** write scientific SQL or source; does **not** alter a PENDING intent to COMMITTED; does **not** delete; does **not** authorize HTTP 2xx, paid six-plus-six, or YSSY paid GO. A recovered byte blob is necessary for replay, never alone sufficient for F.8 population inference or per-credit source/billing evidence.

## Tests

Existing real PostgreSQL16 integration fixture extended with five cases for: exact saved original from a failed final SQL attempt (operator + marketing + unknown codeshare classification), stable deterministic repeated inspection without state mutation, source tampering or disappearance **after** previous SHA verification, duplicate JSON billable key rejection, committed/expired/unverified/malformed source refusal, and production-context hard refusal. The unchanged CI also exercises actual V3.9 physical-v2 resolver against disposable PostgreSQL and true UNLOGGED crash loss, separately.

This is progress on **recovery safety and exact source-to-mapper contract**, not the yet unbuilt crash-safe live end-to-end replay. The next real milestone is an **idempotent, quarantined, scientifically faithful physical-v2 replay to disposable actual UNLOGGED tables with authenticated item/time/source ledgers**, then source custody and deployed receiver changes only after safe, cost-reviewed release gate.

[Issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28), [P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [prior P13/P16 verified recovery](2026-10-11_P13_P16_DISPOSABLE_ORIGINAL_PENDING_RECOVERY_AND_STALE_BLOB_AUDIT.md). **[New CI #38118098397](https://github.com/HKcode22/ReplitTranvr/actions/runs/38118098397) is pending/being verified at time of original report creation; do not claim it passed until both jobs finish.**
