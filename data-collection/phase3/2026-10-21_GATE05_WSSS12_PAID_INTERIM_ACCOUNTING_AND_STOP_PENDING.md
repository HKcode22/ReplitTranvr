> **HISTORICAL / SUPERSEDED:** This is the 9:42 PM interim snapshot. The signed expiry STOP later completed successfully and the independent production database readback verified `STOPPED / EXPIRED` at `2026-10-22T05:10:01.235Z`, 2 attempts, 4 units and zero open scopes. Read [FINAL TECHNICAL CLOSEOUT](2026-10-21_GATE05_WSSS12_TERMINAL_STOP_VERIFIED_FINAL_TECHNICAL_CLOSEOUT.md) for the controlling result. Scientific Gate 0.5 feasibility remains pending.

# Phase 3 Gate 0.5 — WSSS 12-unit feasibility pilot: paid interim reconciliation (STOP pending)

**Status at 2026-10-21 ~21:42 PDT / 2026-10-22 ~04:42 UTC:** PAID TWO-QUERY RESPONSES RECEIVED; reservation/account-delta consistency PASS; **terminal STOP not yet verified**. This document is an interim evidence checkpoint, **not a final Gate 0.5 scientific PASS**, and does not authorize more paid calls. Prepared as a documentation-only branch based on the reviewed source; keep `main` unchanged until the live safety run is terminal.

## Reviewed identity and authorization

- Repository: `HKcode22/ReplitTranvr`.
- Reviewed/executed source: `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814` (GitHub `main` at run time).
- Exact scope UUID: `d1e2cdc6-2b1d-40bb-930e-a872a534ea72`.
- Authorization ID: `AUTH-20261022-G05WSSS-C29C3D14`.
- Authorization bytes SHA-256: `3c805f701416400a2680525bc8eb12af5fc2849ad88d9c8e0458c4ace9a58f32`.
- Signer SPKI SHA-256, fingerprint only: `1cffdc8d780c1944981a68ef6e7b9d4f9cc30b6d0924499ab375e6518202e19c`.
- OpenAPI spec SHA-256: `63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09`, version `1.15.4.0`.
- Signed execution: **2026-10-22 04:30:00Z → 05:10:00Z**; **Oct 21 21:30 → 22:10 PDT**.
- Airport: WSSS / Asia-Singapore. Signed FIDS sample: `2026-10-22T12:35` to `12:45` local.
- Approved: exact two departure queries (`withLocation=false` and `true`), at most **4 base + 8 retry = 12 units**, zero alert CREATE. Owner expressly approved the bounded paid WSSS pilot. No broader Phase3/Phase6 or additional billable authorization.
- Old expired morning scope `10f158dd-3bce-4f9e-896c-78c961071107` was separately stopped with `EXPIRED`, zero attempts/units, and terminal readback PASS before the new authorization.

## Executed lifecycle and observed evidence

1. Fresh official AeroDataBox OpenAPI file was recovered/validated from `https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json`; no billable request was made for this documentation.
2. New detached-signed private authorization issued; commissioner/activator/dispatcher restricted PostgreSQL credentials individually authenticated; dedicated STOP-only credential verified and installed as GitHub protected-environment secrets. **Never store private JSON bundles, passwords, raw provider payloads, or API keys in this repository.**
3. Signed permit consumed and scope exact-`PREPARED` readback PASS: two allowlisted queries, zero reservations. Owner activation receipt `GATE05_ACTIVATION_VERIFIED_NO_PROVIDER`: `ACTIVE`, zero provider requests.
4. Separate independent safety GitHub Actions run: [39719432734](https://github.com/HKcode22/ReplitTranvr/actions/runs/39719432734), job `119629225970`, exact reviewed `ffb5c142` and scope/auth digest. Protected deployment owner-reviewed. Runner printed `GATE05_SAFETY_WATCH_STARTED_NO_PROVIDER` (login authenticated, signature/source bound). GitHub run/job/step `Run independent safety-only signed expiry STOP` were **in_progress** on the later readback. This is **NOT** a verified eventual terminal STOP nor uptime/alert guarantee.
5. Synthetic STOP failure notification [issue #90](https://github.com/HKcode22/ReplitTranvr/issues/90) was owner-acknowledged via `GATE05_SYNTHETIC_FAILURE_ALERT_ACK`. Earlier separate notification drill [issue #88](https://github.com/HKcode22/ReplitTranvr/issues/88) was also acknowledged.
6. Within signed window, owner explicitly gave separate paid GO. Exact restricted signed dispatcher ran once and returned `PROVIDER_RESPONSES_RETURNED_ACCOUNTING_UNSETTLED`; **never rerun it**. The private non-raw receipt path is `/tmp/gate05-evening.VoAWip/wsss12-paid-receipt.json` (not copied to GitHub).
7. **Two provider responses**: `withLocation=false` → 30 departure objects, `withLocation=true` → 30. For each response, the retained top-level key inventory was `aircraft, airline, arrival, codeshareStatus, departure, isCargo, number, status`. This does **not** attest per-flight identity overlap, nested `departure` fields, runway-time actuality, location-field coverage, or completeness. No raw flight identifiers/payloads were retained by the reviewed operator receipt.
8. Read-only PostgreSQL readback at the postpaid audit: scope `ACTIVE`, stop reason/time null (expected prior to expiry), `base_used_units=4`, `retry_used_units=0`, **two unique reserved attempts, 2 units each; 4 units total**, one base attempt per signed query, **zero retries**. Reservation ledger summed to counters, below the 12-unit ceiling.
9. Free AeroDataBox account readback observed at **2026-10-22T04:42:09Z**: `apiUnitsRemaining=59996` versus previous `60000`; **account delta -4** matching 4 units reserved, `activeSubscriptions=0`. This strongly supports consistent billing but **does not independently attribute every provider charge**; a separate itemized provider account receipt was not shown.

## Key qualification / scientific unknowns

- Two response arrays of length 30 are **not** proof of complete FIDS coverage, matched flights, identity deduplication, correct runway or gate field availability, actual-versus-estimated timestamps, or adequate labels for runway departure-delay prediction.
- The `withLeg=true` response shape can nest departure/arrival movement data; the saved receipt only records **top-level keys**, not nested `departure.runwayTime` or timestamp-quality statistics. A dedicated separately authorized future feasibility design may be needed to measure those properties without retaining prohibited raw data.
- API reservation vs account-balance consistency is **not** equivalent to an immutable individual-provider-request invoice.
- This was the bounded WSSS 10-minute feasibility query, **not** Phase 3 Gate 3 prepaid proof, Gate 4 load proof, a four-hub study, or Gate 0.5 final gate pass.
- AeroDataBox public reference for endpoint and tier: `https://rapidapi.com/aedbx-aedbx/api/aerodatabox/playground/apiendpoint_3dbf8f9a-22de-4a99-8e7d-e542f6e63e4f` (Tier 2). Entitlement/retention remain separately subject to the actual account agreement.

## Exact next steps: terminal closeout and audit

1. **At/after signed expiry, 2026-10-22T05:10:00Z (Oct 21 22:10 PDT):** independently check GitHub run **39719432734** and job **119629225970** through the GitHub API. Require the signed expiry STOP step `completed/success` and job `completed/success`. `in_progress` or GitHub green alone is not the database receipt.
2. Independently query the correct production PostgreSQL database under **BEGIN READ ONLY**, exact scope/auth: require `state='STOPPED'`, `stop_reason='EXPIRED'`, durable `stopped_at_utc` at or after `05:10Z`, retained 2 immutable reservations/4 units and 4/0 counters. Inspect other open scopes separately. **If not STOPPED: HOLD / incident; do not describe a successful STOP or perform any paid request.** A scoped operator STOP/recovery would require distinct review.
3. Use free account balance and subscription inventory: compare `59996` against current balance; investigate deviations, provider cycle/reset, and unrelated usage; do not infer per-request charges from global balance alone.
4. Document the independent terminal STOP receipt, GitHub run conclusion, any incident/escalation, final accounting, uncertainty about nested field completeness/actuality and the gate verdict. Until the receipt is verified, this checkpoint remains explicitly **INTERIM / STOP PENDING**.
5. Review whether Gate0.5 scientific success criteria require a future *new* owner-approved, limited, privacy-preserving provider sampling procedure for flight overlap, location inclusion, completeness and actual-vs-estimated runway-time labels. No extra billable authorization is implied.
6. Only after terminal safety closure should this documentation branch be reviewed for merging; avoid changes to pinned production `main` during this live run.

**Safety rule:** Never rerun `GATE05_PAID_WSSS12`; no fresh paid FIDS calls are needed for closeout. Preserve the existing live safety worker to its signed deadline. Do not expose secrets or private receipts in public GitHub logs/issues.

**Continuity starting point:** GitHub Actions [run #39719432734](https://github.com/HKcode22/ReplitTranvr/actions/runs/39719432734), production scope `d1e2cdc6-2b1d-40bb-930e-a872a534ea72`, private paid receipt `/tmp/gate05-evening.VoAWip/wsss12-paid-receipt.json` and exact expiry `2026-10-22T05:10:00Z`. All known values in this checkpoint derive from Replit terminal outputs and GitHub readbacks supplied or queried on Oct 21, 2026; no terminal STOP outcome has been invented.
