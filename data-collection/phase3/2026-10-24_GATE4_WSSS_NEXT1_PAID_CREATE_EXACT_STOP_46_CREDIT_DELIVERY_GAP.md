# Gate 4 WSSS NEXT1 — genuine paid CREATE, independently verified exact STOP, no captured Alert originals

**UTC date:** 2026-10-24  
**Status:** `SAFETY_PASS_POSSIBLE_DELIVERY_GAP` — **not** a qualified scientific Gate 4 PASS.  
**Purpose:** Durable evidence-grade checkpoint; preserve observed facts, explicit uncertainty, custody and no-second-CREATE boundary.  
**Sensitive custody:** No provider subscription IDs, webhook secrets, raw payloads, auth manifest nonce, DB URL, credentials, or flight identities in this report.

## Executive decision

The new one-shot WSSS Flight Alert subscription was genuinely created, positively assigned a provider ID, transactionally bound and read back in scoped V0072. A separately protected GitHub Actions job confirmed exact-owned STOP and strict inactive LIST shortly afterward. Three fresh later provider balance/LIST checks all showed no active subscriptions and 1,991 credits. Nevertheless, new-scope V0071 read-back found **zero** callback original-wire records despite a **46-credit account delta** against the strict 2,037 starting baseline. Treat as **potential delivery / ingestion gap**, not a demonstration of receiver feasibility and not proof of provider malice or of 46 distinct notifications.

The configured **5-credit soft target** and **2,000 protected floor** were not effective hard limits. The final 1,991 is **9 credits below** the floor. No further billable CREATE is approved; do not repeat this spent one-shot scope, re-arm its used run, or run historical spent scripts. Preserve deployment and evidence while investigating delivery statuses and endpoint semantics. Gate 4 live-delivery science remains open; Phase 4 is not authorized by this checkpoint.

## Exact identities and protected environment

- Repository: `HKcode22/ReplitTranvr`, independent STOP reviewed main runner `a475a8cf3686428fa50ba084ef46b812dba6893c`.
- Frozen actually published Replit callback-only compiled receiver source: `97ed05bfcc8b34bd607a80dbcfec6945ffd0d11a` (public runtime and routes verified before CREATE).
- Single new scope: `d6c0fcac-798e-4913-bfd1-a561adb3dd82`, WSSS, credit-based FlightByAirportIcao, `maxDeliveryRetries=0`.
- Protected independent STOP [GitHub Actions run 40071053415](https://github.com/HKcode22/ReplitTranvr/actions/runs/40071053415), `event=workflow_dispatch`, `run_attempt=1`, final `completed/success`.
- Approved window **06:49:00Z–07:09:00Z**, 20-minute upper bound, early stop permitted; initial credit balance **2,037**, STOP threshold **5** credit delta, intended protected floor **2,000**. These are **soft operational policies, not provider-enforced spending caps**.
- Owner-private evidence under `~/.config/replittranvr/gate4-owner-20261022/` includes one-create intent, exact positive provider CREATE receipt, Ed25519 key, protected writer login and original receiver login. **Do not upload or print**.
- Private scoped database role credentials have finite expiration around 2026-10-24T10:34Z; an expiration does not authorize bypassing RLS.

## Evidence and timestamps

1. Previous strict provider baseline at 2026-10-24T06:18:17Z: credits 2,037, API units 59,996, zero active subscriptions. Public runtime exact source/route health passed. Correct private webhook bearer with text/plain invalid-envelope probe gave **415**; wrong bearer **404**. This only proves route/bearer rejection path; **it did not prove genuine JSON envelope ingestion or PostgreSQL commit**.
2. New reviewed one-shot operator offline `--check` returned `GATE4_OPERATOR_OFFLINE_CONFIGURATION_PASS`, 20-minute window, soft 5, floor 2,000, zero provider/DB writes.
3. Independent protected STOP emitted genuine `github-actions[bot]` `GATE4_ACTIONS_ARMED_RECEIPT_V1` comments on issue #38 before CREATE. Independent review tied run, source, scope, AUTH, WSSS, start/stop and baseline.
4. Owner's guarded **single** `--execute-one` yielded `POSITIVE_TLS_CREATE_BOUND_V0072_NEEDS_EXTERNAL_ANCHOR_AND_SETTLEMENT`; `positiveProviderIdCaptured=true`, `exactScopedV0072ReadBack=true`, `providerCreates=1`, no automatic retry. Only the protected owner file contains the exact provider-assigned ID.
5. Full GitHub job log at `2026-10-24T06:49:56.9188741Z` reported `STOPPED_EXACT_PENDING_SETTLEMENT`, `exactStopVerified=true`, `threeBalanceSettlementVerified=false`, `scientificGate4Passed=false`. Job completed successfully at about 06:50Z. Exact STOP was confirmed within 57 seconds of the approved window opening. That log alone does **not** reveal the trigger or the final charged credit delta.
6. Owner's read-only V0072/V0071/strict provider settlement audit reported `positiveCreateBindingVerified=true`, `originalRows=0`, `shaAndOwnerValidOriginalRows=0`, `validPaidWindowOriginalRows=0`, `invalidOriginalRows=0`. It read the new-scope V0071 original quarantine through scoped receiver RLS and the V0072 positive binding through scoped writer role.
7. Independent three post-STOP balance/zero-active samples: **06:57:02Z**, **06:57:13Z**, **06:57:25Z**, all **1,991** Alert credits, zero active subscriptions, positive owned ID not active. Baseline difference **46 credits**. Three stable samples establish finite-sampled settlement, not proof of no later adjustments.

## Interpretation and billing

According to the [official AeroDataBox Flight Alert 2026 guide](https://aerodatabox.com/flight-alert-api-2026/), credits are charged on **SEND attempts**, even if delivery fails; billing is **one credit per flight item contained in a notification**, so **46 credits do not establish 46 distinct HTTP POSTs or distinct notification IDs**. No delivery retries were requested (`maxDeliveryRetries=0`). For busy-airport subscriptions, even one notification can exceed a 5-credit *soft* target before a five-second watchdog reacts. This does not justify falsely presenting a 2,000-credit floor as successfully maintained. The exact distribution, sender response statuses, webhook request times, and response payloads remain unknown.

The read-only result of **zero scoped original rows** together with observed consumption is materially inconsistent with the desired proof of a successfully captured genuine Alert. This could arise from provider delivery failure or timeout, unexpected content type/envelope, endpoint response 404/415/422/503/500, a mismatch in configured subscription callback URL, platform ingress, or DB ingestion/RLS. These are **hypotheses**, not established root causes. A strict route/bearer HTTP 415 probe does not rule them out. Determine exact HTTP outcome via **Replit published deployment access/runtime logs for 06:49–06:50Z** and, if needed, **AeroDataBox provider-side delivery status and per-SEND cost breakdown** for the private positive provider ID.

## Next actions — strictly no new paid exposure

1. Preserve published Replit deployment and existing PostgreSQL V0071/V0072 records and protected owner files. No blind republish, no synthetic insertion into the paid scope, no manual webhook replay, no new paid CREATE, and no cancellation/replay of completed GitHub STOP.
2. From **published** Replit logs around `2026-10-24T06:49:00Z–06:50:10Z`, obtain **sanitized HTTP status distribution and counts** for the Gate4 Alert endpoint; redact path bearer, URLs, full body, headers, flight IDs, credentials, provider IDs. Look for `GATE4_PREBIND_SQL_STAGE` and `CALLBACK_ONLY_REQUEST_FAILURE`; if HTTP access logs are unavailable, explicitly record their absence.
3. Ask AeroDataBox/provider support for SEND-attempt timestamps, number of deliveries, number of flight items, callback HTTP response status/timeout, retries actually performed, and destination hostname/path **redacted of bearer**, plus billing explanation for the 46 Alert-credit delta. Use the private positive provider-assigned ID only through provider secure support channels; never in GitHub.
4. Cross-check provider content-type/body against `server/lib/disruption/gate4PrebindAdditiveRoute_v39.ts` (accepts only `application/json` and valid bearer) and `server/lib/disruption/gate4PrebindIngress_v39.ts` (requires matching `subscription.id`, subject `FlightByAirportIcao/WSSS`, `flights` array and scoped DB insert). Existing source register order mounts Gate4 before general JSON parser; not proven enough to guarantee successful provider delivery.
5. If indicated, implement a **focused offline regression test / source-only fix** with negative cases and callback status metrics; review and publish only under a **new** explicit controlled release process. Do not merely widen billing windows or accept a user-level 46-credit overshoot as routine.
6. Gate4 verdict remains `SAFETY_PASS_POSSIBLE_DELIVERY_GAP` until genuine paid Alert originals can be independently verified. A future paid retest requires new scope, new positive owner, renewed expiring roles, independent STOP and a separately evaluated exposure risk/approval.

## Verification boundaries

- **Passed:** one authorized genuine TLS CREATE, positive provider ID, exact V0072 owner binding and readback, independent authenticated ARMED STOP before CREATE, exact provider DELETE and inactive inventory, three stable post-STOP provider samples.
- **Unobserved:** any new-scope V0071 original; provider-side per-delivery HTTP result or SEND count; independent provider-origin HMAC; exact internal charge event breakdown; permanent settlement; long-term delivery reliability.
- **Not claimed:** an end-to-end paid callback PASS, 99%/100% reliability, a hard 5-credit cap or preserved 2,000-credit floor, an explanation or fault attribution for the missing webhooks.
- **Scientific bottom line:** safety lifecycle **PASS**; end-to-end delivery feasibility **NOT DEMONSTRATED**; delivery-gap investigation **OPEN**.
