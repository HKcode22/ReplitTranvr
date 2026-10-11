# P11/P13 — Preserve actual Node receiver-observed UTC before V3.9 prepaid JSON parsing

**Work:** isolated investigation draft PR #27, Oct 11 2026 UTC. This modifies **real `server/routes_v3.ts` V3.9 prepaid webhook handler source**, NOT a simulation. **Undeployed**. No AeroDataBox traffic, production DB/bucket mutation, Replit shell, Cloudflare, paid owner, or main branch change.

## What actual source inspection showed

Prior V3.9 prepaid route (already protected by early constant-time path-secret guard, per-route 2 MB JSON parser, duplicate JSON key structural scan, dedicated handler) called:
`persistPrepaidProbeWebhookV39({sessionId,body:req.body??{},receivedAtUtc:new Date()})`
**after the complete JSON body had been received and parsed**. The lower persistence function correctly uses this parameter for `clean.prepaid_probe_delivery_runtime.received_at_utc`, all `clean.prepaid_probe_item_runtime.received_at_utc`, and reception-derived 15-min UTC bins. It already preserves the first accepted SQL UTC on identical retry/duplicate. But the caller's default time previously observed *post-parse handler start*, which could be shifted by slow upload/JSON parsing before entering SQL and App Storage.

A real provider HTTP sender's original attempted-time and provider first-edge time remain **outside Node**. Even with the improvement below, Replit Autoscale/proxy cold-start time BEFORE Node accepts the request is UNOBSERVED. This fix does **not** authenticate an original provider notification or allow a web client to assert its own time. It addresses a narrower, demonstrable *in-process* UTC skew.

## Implementation

In `registerV3Routes`:
- Add a per-route-registrar `WeakMap<Request, Date>`, entirely private to this process.
- At the very beginning of the **actual** `prepaidEarlySecretGuard` middleware (before `express.json()` reads and parses the request body), take `new Date()`.
- Store this time for the Express request only AFTER constant-time comparison authenticates the path secret. Wrong-secret POSTs are not stored and cannot poison proper session timestamps.
- In the existing `prepaidWebhookIngress` handler, retrieve that exact receiver timestamp; **fail closed if the private arrival time is missing or invalid**; pass it unchanged to `persistPrepaidProbeWebhookV39`. The DB transaction, original canonical blob upload+readback-before-2xx, physical-flight-v2 resolver, per-session row lock and billing/duplicate behavior are unchanged.
- Ignore `x-v39-first-edge-received-at-utc`, `req.body.receivedAtUtc`, other client headers or remote-proxy claims. The timestamp is **Node's first route-handler observation only**. No independent original provider edge attestation, no changed provider retries, no new live six-plus-six setting.

## Regression against actual HTTP + real disposable PostgreSQL 16

Added `P11/P13 real V3.9 HTTP route freezes Node-observed arrival BEFORE slow JSON body transfer` to the full actual route test in `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts`:
- Uses a **real local Node HTTP chunked POST** to the registered production route and correct disposable test secret.
- Sends a first chunk and intentionally waits 850ms before finishing the JSON body. Express route secret guard receives the request before the body parser can finish. The stored real PostgreSQL `received_at_utc` must precede the second chunk by at least 300ms.
- Forged first-edge UTC HTTP header from year 2000 is ignored; SQL uses receiver time instead.
- Retries identical original with a forged year-2099 header: no second delivery/LOGGED blob, `duplicate:true`, original `received_at_utc` remains identical and unchanged.
- Real PostgreSQL fixture includes existing source hash/readback, item and financial tests. The separate real SIGKILL case demonstrates LOGGED refs survive and UNLOGGED science is lost. No external provider or production DB access.

**VERIFIED [GitHub Actions #38119519940](https://github.com/HKcode22/ReplitTranvr/actions/runs/38119519940)** at exact tested SOURCE SHA `3ea891e9b0b854e6e00d268c25a5a7e71d13f901`: BOTH JOBS SUCCESS; **646/646 offline tests (62 suites)** and **95/95 actual disposable PostgreSQL16 integration tests**, including live-chunked HTTP output `P11_NODE_RECEIVER_FIRST_OBSERVED_BEFORE_PARSER_DONE=true` and `P11_UNTRUSTED_RECEIPT_TIME_HEADERS_IGNORED=true`. True PG SIGKILL confirms LOGGED=1,UNLOGGED=0. This is still only Node receiver-observed time, not an independent original AeroDataBox sender timestamp or a published app deploy.

## Important limits / next action

This does NOT create an independent provider-signed UTC, immutable original on-the-wire webhook byte archive, independent 260/259 item-cost evidence, external first-hop durable source spool, Autoscale no-loss guarantee, or source continuity outside the app. Existing stored original provider content is canonical JSON and its SHA confirms the **stored representation**; it is not asserted byte-for-byte identical to original HTTP body. Real first-edge evidence would require approved independent sender/ingress and custody design, scoped to the frozen F.8 protocol and hosting budget, without retroactively inventing an Oct9 source census.

Full paid YSSY remains NO-GO on P09, P14, P18, P20 and unresolved P06 lock-across-blob/readback. This is an additive **real production-source improvement in a draft**, not a deployment. No user Replit action needed.

[Gate tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md) · [P14 independent synthetic attempt attribution](2026-10-11_P14_SYNTHETIC_THREE_LEG_FLIGHT_ITEM_CREDIT_ATTRIBUTION_AND_EXACT_ARITHMETIC.md) · [joint scientific received-only/6+6 decision](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md) · [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
