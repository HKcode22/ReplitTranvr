# 2026-10-14 UTC — Phase 2G research closeout / Phase 3 Gate3 OFFLINE hardening checkpoint

**Status:** draft PR #36, NOT deployed. Last code commit `8b66da7005166a5b547ca0e96c1436ad632da7b5`. Production protected `main=f5b1347b7b9aebd6830302394ea2cc5775aedbf4` unchanged as explicitly fetched. No paid provider calls, no DB writes, no Replit redeploy, no blob deletion or incident-resolution action occurred in this work session.

## Why Gate3 remains NO-GO
`scripts/credit_canary.ts` previously creates `createSubscription("FlightByAirportIcao", ICAO, {maxDeliveryRetries:0})` using `defaultWebhookUrl()` with the **legacy** `/api/v1/webhooks/aerodatabox/:secret` endpoint. The published callback-only runtime `server/phase2gCallbackOnly.ts` accepts only the **prepaid session** `.../:secret/prepaid/:sessionId` path, which requires signed session setup. Old Gate3's aggregation reads `clean.adb_ingest_events`; P25's new prepaid collector uses a *different* exact-session ledger and source custody. Thus neither a syntactically valid AUTH nor a healthy published GET establishes endpoint compatibility or valid canary accounting.

Draft `server/lib/disruption/gate3CanaryReceiverReadiness_v39.ts` exports a **hard fail-closed** guard unconditionally refusing the incompatible legacy owner. Draft `scripts/credit_canary.ts` calls this after the owner AUTH check but **BEFORE getBalance, listSubscriptions, createSubscription or paid mutation**. No override via environment switch. `tests/phase3_gate3_legacy_callback_no_go_v39.test.ts` checks the guard and source ordering. Future live Gate3 requires an independently designed, frozen exact owned-session/admission/settlement adapter, exact public callback binding, authorization, disposable-postgres plus hosted no-provider end-to-end test and explicit new operator approval. Do **NOT** remove the guard merely to move forward.

## Legacy raw/semantic ACK semantics — CI-discovered correction
At first, a source-level inspection found the legacy semantic error handler returned `200` with raw exception text. An initial draft incorrectly changed this to `503`. Full CI run [#38536335487](https://github.com/HKcode22/ReplitTranvr/actions/runs/38536335487) **FAILED** because `tests/raw_ingress_v39.test.ts` deliberately requires a 2xx ACK **after raw source is already durably persisted**, while downstream identity/event processing errors generate an incident for repair. A 503 after durable capture could induce unnecessary **billable** retries.

**Corrected and retested draft at `8b66da7`:**
- Before successful raw persistence, a real raw failure returns sanitized HTTP `500` for sender retry. New code makes `recordIncident` best-effort/nonawaited so a second failing SQL connection does **not** swallow/delay the 500. The raw persistence failure is not silently ACKed.
- After **confirmed raw persistence** but later semantic failure, return legacy HTTP `200` with a **generic sanitized** `semantic_processing_failed_after_raw_durability` body; never include thrown error strings or falsely claim downstream semantic processing PASS. Incident/ledger diagnostics are best-effort and cannot suppress the final response.
- This is a **draft-only legacy handler** change, not a change to the published prepaid YSSY callback route. It is NOT the cause of P25's externally billed two-credit gap.
- Focused and full offline tests must both pass; a static source-order regression is not sufficient proof of end-to-end replay. Add a disposable end-to-end fault test before merging/deploying to any receiver.

## CI and proof status, after code commit `8b66da7`
- Focused no-provider [#38536941956](https://github.com/HKcode22/ReplitTranvr/actions/runs/38536941956) **PASS**.
- Real PostgreSQL receiver faults [#38536941749](https://github.com/HKcode22/ReplitTranvr/actions/runs/38536941749) **PASS**.
- Published receiver identity read-only [#38536941774](https://github.com/HKcode22/ReplitTranvr/actions/runs/38536941774) **PASS**.
- Full offline safety [#38536941901](https://github.com/HKcode22/ReplitTranvr/actions/runs/38536941901) **PASS, completed**; all four zero-provider GitHub workflows are confirmed successful for exact code commit `8b66da7005166a5b547ca0e96c1436ad632da7b5`. This verifies offline build/typecheck, full regressions, migration/PG checks and receiver-binding tests in GitHub Actions. It is **NOT hosted live subscription delivery proof** or production deployment authorization.

## P25 and research-status invariants
YSSY probe19 final `DELIVERY_GAP` unchanged, 231 provider billed credits, 229 receiver items, 2 missing billed units; all 58 original envelopes SHA/bytes verified (308832B), their 229 item count equals all 229 saved explicit cost claims, 0 duplicates or per-payload disagreements. Full 120-minute uncensored observation. Report ✅ completed research observation, tier B qualified, not historical P25 confirmatory PASS. No known receiver postraw accounting defect for the 58 observed envelopes, no proof of upstream SEND attempted count. Future scientific-quality scorecards must disclose unknown missingness mechanism and inferential limits.

## Incident31 and future phase boundary
- 58 YSSY original object refs remained live at last operator query, earliest 2026-10-20T03:06:15Z latest 05:02:12Z. No transient session/deliveries/items; no active paid provider sub. Incident31 OPEN; no verified deletion journal.
- Existing exact-session cleanup `--apply` requires lost session row and must **never be used** for YSSY. Draft after-expiry exact incident31 disposition and tests exist, but no close/apply until **after** all 58 objects are individually TTL-tombstoned under separately reviewed expiry operator + consent and independent provider inactivity proven. Do not archive raw object payloads to GitHub.
- Phase2G **observation work complete**; official Gate2 acceptance **HOLD** pending prospectively approved qualified-pilot disposition and unresolved incident. Oct2 early-pilot freeze retired automatic four-hour Phase2H Stage2; do not start Phase2H or new YSSY. Phase3 Gate3/0.5/4 **offline** planning can proceed but Gate3 real canary requires a new bounded AUTH and Gate2 closure.

## Exact starting point next session
1. Four-way CI for code SHA `8b66da7` is DONE/PASS. Preserve these run IDs and continue from this exact reviewed code, not merely the documentation head.
2. Add a true disposable/in-memory HTTP fault test reproducing legacy route's pre-raw 500 and postraw 200 + incident, and prove Stage3 Gate3 owner no-provider calls under a test harness; reject automatic retries.
3. Design a **compatible** Phase3 canary receiver owned-source ledger and mandatory named preflight before any new PAID AUTH. No provider calls or deployed changes until review.
4. Stage1 scientific acceptance/research fitness under NIST/ISO/STROBE limitations and final incident31 retention decision. Latest existing research handoff: [Phase2G closeout](2026-10-14_PHASE2G_EARLY_PILOT_CLOSEOUT_PHASE3_OFFLINE_HANDOFF.md).

**Never merge PR36 en bloc without safety review**; it now includes code for watchdog and canary, not only documentation. Paid provider + protected main change require explicit operator approval.
