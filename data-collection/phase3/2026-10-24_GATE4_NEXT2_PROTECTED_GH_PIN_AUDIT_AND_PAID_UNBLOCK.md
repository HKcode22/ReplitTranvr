# Gate 4 NEXT2 — protected GitHub pin audit and final paid-trial prerequisites

**UTC/Pacific date:** 2026-10-24 | **Status:** Owner read-only GH environment audit complete; repair PR #144 under no-provider CI. Paid trial NOT started.

## Owner evidence — protected STOP environment still bound to obsolete NEXT1

Owner ran GitHub protected `gate4-safety` **read-only** from Replit Shell, without printing secret values:

```json
{
 "status":"GATE4_NEXT2_PROTECTED_ENV_READONLY",
 "environmentExists":true,
 "requiredReviewerConfigured":true,
 "sourceMatchesNEXT2":false,
 "scopeMatchesNEXT2":false,
 "airportMatchesWSSS":true,
 "authorizationHashPresent":true,
 "signerFingerprintMatches":false,
 "runnerMatchesCurrentMain":false,
 "futureWindowConfigured":false,
 "softTarget":5,
 "protectedFloor":2000,
 "stopArmed":false,
 "providerCalls":0,
 "databaseWrites":0,
 "secretValuesPrinted":false
}
```

**Interpretation:** The protected environment is correctly protected with a reviewer, WSSS and a nominal five-credit **SOFT** target. But its source/scope/signer/runner are stale, and the UTC authorization window is absent/expired. The 2,000-credit protected floor is already higher than latest owner-confirmed **1,991** Alert credits. **This is a release configuration mismatch, not another failure of the working Replit HTTP receiver.** An AUTH variable's presence does **not** imply that its 64-digit value equals NEXT2's sealed authorization. No STOP workflow was actually armed or observed. Do not attempt a CREATE or arm legacy STOP settings.

## Prior NEXT2 facts that do not need repeating

- Reviewed published receiver source `087dc948c29d004f88eca141e1fc8e83c2844e3f`, NEXT2 technical scope `16f819c6-7c68-4d5a-82cf-3820e9294dc7`; valid real public HTTPS synthetic HTTP 200 and independent byte-for-byte V0071 SHA256 original readback. One synthetic original; no legitimate provider originals or V0072 positive-ID binding. Full RLS four scoped policies PASS, no ambiguity; do NOT repeat synthetic test, DB rotation or app publish.
- Exactly one owner authorized V0072 **writer-only** recovery PASS; encrypted private Replit App Storage credential read back, receiver role unchanged and policies preserved, expires `2026-10-27T02:56:11.524Z` (October 26 7:56 PM PDT).
- Exactly one Ed25519 signer commission and verify PASS; its **PUBLIC non-secret SPKI SHA256** is `48c176d3c0f9e706b19b500f1ff85d2b0b1166185ff73f242ac02cb59abe6770`; private signing key remains in encrypted App Storage, never GitHub or stdout.
- Latest prior AeroDataBox GET baseline 1991 Alert credits, 59996 API units, ZERO active subscriptions; WSSS schedules/live OK and ADS-B OKPartial. A new GET at actual paid window remains necessary. Historical real NEXT1 spent 46 Alert credits and proved ZERO genuine original despite exact-ID STOP; the send/path/log root cause remains unestablished. 46 credits are billed flight items, **NOT** 46 independent callback attempts.

## Targeted identity-only repair — no provider action

[PR #144](https://github.com/HKcode22/ReplitTranvr/pull/144) introduces `scripts/v39_gate4_next2_protected_identity_pins_v39.ts` and tests. It opens the already source-bound encrypted receiver and signer App Storage objects, and runs GitHub GET-only checks. With a separately explicit GO and exact reviewed merged operator SHA, it may update the **five protected identity variables only**: `GATE4_SAFETY_APPROVED_SOURCE`, `...SCOPE`, `...AUTH`, `...ICAO`, and `...SIGNER_SPKI_SHA256`, with required reviewer, zero active or queued GH STOP worker and protected readback. Sensitive auth SHA is never printed. This is an authorized future *GitHub environment variable configuration change* — not yet executed. No AeroDataBox API calls/credits, DB writes, STOP dispatch, receiver republish or secret storage changes.

The updater intentionally does **NOT** change or approve `GATE4_SAFETY_APPROVED_RUNNER_SHA`, `...START_UTC`, `...STOP_UTC`, `...SOFT_TARGET`, `...PROTECTED_FLOOR`, or GitHub secrets. The runner must be pinned to actual final reviewed `main` after substantive changes. Explicit clock window must be in the future and narrow; the owner must accept realistic spending risk, not assume 5 is hard cap. A hypothetical 1900-credit floor starting from 1991 allows **91 credits of initial balance margin**, but a WSSS alert burst/lag/STOP interruption might exceed it; owner has not yet approved that loss exposure. A paid CREATE must never occur while the old 2000 floor remains.

## What must be true before **one** separately authorized genuine CREATE

1. PR #144 fully reviewed and CI PASS; protected environment exact five NEXT2 identity pins updated from sealed values and readback verified without sharing auth/private keys.
2. A newly reviewed and tested **NEXT2-specific** one-actual-CREATE/positive-HTTP-provider-ID-to-V0072 operator with immutable no-second-CREATE App Storage intent, independent public SPKI fingerprint matching, fresh balance/LIST, scoped writer LOGIN/readback and honest incident/compensating exact STOP. The earlier NEXT1 paid operator is **NOT** reusable: hardcoded spent scope, old pre-published source, obsolete 2000 floor, vanished private HOME signer/writer, old authorization and expired window. The prospective new operator is NOT currently committed/reviewed; a previous attempted GitHub source write was blocked, so do not claim it exists.
3. Protected `gate4-safety` exact new approved runner SHA/NETX2 scope/auth/source/WSSS, fresh future UTC start/STOP, soft target, selected floor and owner accepted potential burst overshoot; GH Actions reviewer approval preserved. GitHub STOP-only workflow must be ACTUALLY `in_progress` with authenticated fresh GitHub Actions bot ARMED proof and independent 5-second billable owned-ID/credit/deadline monitoring; GitHub STOP runner must not be held behind 6+6 callback-health grace.
4. Separate protected GitHub 6 PRIMARY + 6 conditional backup 15-second hosted-health workflow ACTUALLY in progress; it is diagnostic only. It does not create/delete a subscription and a green GET is not provider SEND proof. Provider `maxDeliveryRetries` is separate (officially 0–2). Choose a paid retry cost option only with separate user-informed risk; 6+6 is local monitoring, not 12 paid re-deliveries.
5. One live provider CREATE only after explicitly accepted billing risk and armed STOP; never rerun CREATE after ambiguous response or a durable intent. Positive actual provider-assigned CREATE-response ID independently bound to V0072. Genuine Alert original in V0071 must have byte/SHA intact and ID/source/authorization evidence matching, independent exact owned-ID STOP, zero-active account and ≥3 settlement reads. One authentic successful SEND→ingest establishes **feasibility**, not delivery-rate reliability (1 of 1 cannot support a claim of 100% production reliability); 0 sends/0 charged = inconclusive, positive billed SEND/0 matched original = possible delivery/ingestion gap, not conclusive provider fault.

**NEXT SESSION START:** do NOT rotate credentials. Continue PR #144 review; once merged, owner uses one exact SHA-pin Replit Script `--audit`, `--apply-identity-only`, `--verify` for protected identity values only. Then prioritize operator/ARM evidence and user credit acceptance. No paid CREATE/STOP armed currently.
