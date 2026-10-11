# P13 — Exact science-item recovery into quarantined disposable V3.9 without duplicating LOGGED originals

**2026-10-10 · TEST-ONLY DESIGN / not a paid-run fix · YSSY NO-GO.**

This report follows [the 120-minute signed source/journal reconstruction evidence and duplicate-blobs issue](2026-10-10_P13_120MIN_SOURCE_RECONSTRUCTION_REPLAY_RISK.md). The changes are exclusively on the isolated `phase2g-p2g24-github-observer-20261009` GitHub branch. **No main merge, deployed Replit change, Cloudflare provision, real provider API call/credit, or production scientific database action.** GitHub Actions consumes standard repository CI resources.

## Actual V3.9 failure addressed

After PostgreSQL UNLOGGED state disappears, the normal `persistPrepaidProbeWebhookV39` callback sees no previous delivery row, **uploads the same logical source again and inserts another LOGGED source reference** even when the physical-v2 flight/delivery ID matches. Ordinary HTTP replay also stamps the new processing UTC instead of the original first-edge UTC. Passing explicit `receivedAtUtc` to the lower-level persistence function can fix the UTC symptom, **but not the duplicate reference**. In real science this can corrupt source accounting, ownership and time-bucket attribution.

### New isolated transaction

`experiments/phase2g_rehearsal/disposable_exact_science_restore_v39.ts` introduces a **test-only**, explicitly localhost-guarded exact-row recovery primitive, plus a companion disposable PostgreSQL integration test:

- The fixture first ingests one **synthetic two-flight YSSY notification** through the actual V3.9 lower-level parser/persistence backed by disposable Postgres16 and mock blob storage, supplying the frozen original UTC.
- **Before simulated loss**, the fixture stores (a) an HMAC-signed full-wire/physical-flight science journal, and (b) an additional HMAC-signed, **LOGGED exact runtime-column snapshot** of the original delivery and two item rows. Both are local test signers created *after* the original callback, **not independent real provider receipts**.
- It verifies the original wire SHA and exact per-flight canonical SHA, owner/session/subscription binding, original source UTC, payload/delivery cost, full item count, exact production table columns, and the existing **single** unexpired LOGGED blob reference with matching canonical object bytes and at least 168h configured retention.
- After deliberately truncating the **disposable** session/delivery/item UNLOGGED tables, it uses a **SERIALIZABLE PostgreSQL transaction plus per-session advisory lock** to validate both original signed journals and existing LOGGED blob, insert the *same original* UNLOGGED delivery and **all** original item columns, and bind the original blob-ref UUID. It does not upload a new object or create a new LOGGED blob-ref row.
- It creates a replacement `clean.prepaid_probe_session_runtime` in **`quarantined` state**, with original frozen end-of-window and **zero newly fabricated live callback-success counters**; the real `persistPrepaidProbeWebhookV39` correctly rejects paid-callback continuation on this state. This is an **analysis-only staging state**, not a real paid owner authorization or replacement for operator scientific adjudication.
- Repeating an identical restore is **idempotent**, requires exact complete runtime rows and original hash/time and leaves blob reference count unchanged. Existing active owner, partial recovery, corrupt recovered item or wrong owner/wire **fail closed**, and transaction failures roll back as a unit. The extended test also requires rejection of an expired original source and two LOGGED refs for the same logical delivery, even if the two blobs share a content SHA.
- All returned flags are hard-coded to **`paidCollectionResumed=false`, `independentRealProviderSourceVerified=false`, `scientificPassAuthorized=false`, `automatedPaidRecoveryAuthorized=false`**. Runtime recovery is not scientific acceptance.

### Critical PITR/privacy architecture limit

V3.9's primary scientific design intentionally stores provider-identifying and normalized flight fields only in **UNLOGGED runtime** and keeps ordinary LOGGED tables to restricted opaque/hash references. **The fixture's LOGGED table containing full provider-identifying item rows violates that production storage/isolation contract if copied into real V3.9.** It is used here exclusively as disposable scientific reconstruction *test input*.

A real design instead requires independent, explicitly approved, encrypted/retained full-wire source custody and authorized external recovery evidence, with only the permissible opaque/reference metadata in ordinary LOGGED tables. No production journal DDL is proposed or applied here.

A complete two-hour YSSY recovery requires all independently original attempts/credits (including those never delivered to the receiver), every first-edge/source UTC and eight 15-minute bins, all flight-item/code-share continuity, bounded backlog and 168h retained raw payload, a fresh authorized owner and exact independent deployment/source fingerprint. **This tested transaction currently restores ONE notification containing two flights, not an entire 120-minute paid session.** Full hosted 120-minute interruption rehearsal R0–R11 and actual billing proof are still missing.

## Verified CI checkpoint

Attach current exact CI commit, full job conclusions and case counts **only after GitHub Actions has successfully completed both jobs**. Initial implementation previously passed at [Actions #38092203588](https://github.com/HKcode22/ReplitTranvr/actions/runs/38092203588): **321 offline tests/31 suites; 41 disposable V3.9 PostgreSQL cases**, with no provider operations. The extended **expired original source, forged or duplicate original LOGGED reference, active-owner and corrupted-runtime safeguards also passed** in [GitHub Actions #38092364892](https://github.com/HKcode22/ReplitTranvr/actions/runs/38092364892), tested source commit `bbfb652520d98b2b8387c61bff4e21cb3ba29507`: **both jobs SUCCESS, 321/321 offline tests across 31 suites, 41/41 actual disposable V3.9 PostgreSQL integration cases**, plus a separate isolated real PostgreSQL SIGKILL/UNLOGGED reset and LOGGED owner survival check. Exact CI diagnostics include `P13_DISPOSABLE_QUARANTINED_REPLAY_EXACT_ITEM_UTC=true`, `P13_DISPOSABLE_QUARANTINED_REPLAY_LOGGED_BLOB_ADDED=0`, `P13_DISPOSABLE_QUARANTINED_REPLAY_IDEMPOTENT=true`, `P13_DISPOSABLE_QUARANTINED_REPLAY_CALLBACK_RESTARTED=false`, and `P13_QUARANTINED_REPLAY_REJECTS_EXPIRED_DUPLICATE_AND_ACTIVE_OWNER=true`.

## Remaining hard stop conditions

- **P09/P10:** No independently deployed authenticated/durable-before-2xx receiver. Connected Cloudflare account has zero Queues, R2 not enabled (API 10042); Cloudflare free Queue's 24h retention alone is insufficient for 168h source evidence. No billing-capacity assumption or provisioning without user approval.
- **P11/P12/P13:** Test HMAC key is not actual independent AeroDataBox source truth, LOGGED local full-row fixture cannot be used in production due to PITR restrictions, restore not full-window and no real cold-server 2h replay, crash owner epoch or multi-writer proof.
- **P14:** Real billed sender attempts vs internal exact attempt ledger remain unverified; do not tolerate a 260/259 gap.
- **P15–P20:** User-selected 6+6 health-check design test-only; actual GitHub paid supervisor still has three consecutive health failures and 15s cadence. Provider maxDeliveryRetries remains zero. Build/owner/publish equivalence, actual hosted 120-minute no-provider fault rehearsal, cost/account isolation, formal prospective science amendment, fresh YSSY authorization and explicit final GO outstanding.

**Paid YSSY Sunday 2026-10-11 20:00–22:00 PDT (Monday 03:00–05:00 UTC) remains NO-GO** on this evidence. A stronger offline reconstruction primitive is not independent proof of collecting and retaining all original paid events.
