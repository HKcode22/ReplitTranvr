# Phase 2G P08 — stalled original prepaid POST passive diagnostics

**Review status:** DRAFT isolated branch; zero provider operation; **not deployed**. Prepared October 10, 2026 Pacific.

## Problem

The actual published callback-only HTTP app wires `observePrepaidHttpTransportV39(res)` on only the prepaid POST path after its allowlist. Previously the diagnostic used only Node response `finish` or `close` events. A request still hung without either event after the evaluated ~10-second upstream provider timeout would generate **no warning during the stall**; it could be silently waiting for SQL pool lock or storage and later appear successful from the server side. The real AeroDataBox source might already have timed out. This is a possible observability gap, **not an assertion that it caused the historical P2G24 failure**.

## Correction

- `server/lib/disruption/phase2gPrepaidHttpTransportTelemetry_v39.ts`: at the existing **7-second warning threshold**, independently emit a sanitized `response_stalled_in_flight` event while the real response is unfinished and unclosed; **`http_status:null`** on this preliminary event, since Node response status 200 is not an actual provider-received acknowledgment. Retain the later terminal `response_slow`, `response_server_error` or early `connection_closed_before_response_finished` event, so the warning does not mask later 503 or aborted transport.
- Timer is `unref()` and cleared on `finish` or `close`, to avoid phantom delayed alarms. Reject invalid/NaN/negative warning thresholds. No logging of URL-path secret, payload, provider ID, session ID or DB URL. `database_queries:0`, `provider_calls:0` refer to the passive diagnostics only, not the actual webhook processor.
- `tests/phase2g_p2g24_prepaid_transport_diagnostics_v39.test.ts`: four new cases prove the in-flight warning preceding finish, later HTTP 503 still recorded, cleanup after finish or aborted close, and invalid config rejection.

## Verification

**GitHub Actions [#38102077686](https://github.com/HKcode22/ReplitTranvr/actions/runs/38102077686), exact tested code SHA `3d82e3c4dd552aaa3a2bbf7b73040f51c9679a39`: BOTH jobs SUCCESS. 447/447 offline tests across 45 suites; 45/45 disposable actual V3.9/PostgreSQL integration; independent PG16 SIGKILL verified `ACTUAL_UNLOGGED_CRASH_RESET=CONFIRMED` and `TWO_STAGE_LOGGED_OWNER_BINDING_AFTER_UNCLEAN_RESTART=1`.** Earlier P16 exit hardening verified in run #38101882460 (443/443, 45/45).

## Limits

This is passive diagnostic only. It **cannot** ensure upstream gets 2xx in <=10 seconds or prevent provider attempts from being billed; does not establish independent source custody, original edge UTC, full wire SHA or independent retained 168-hour original flight evidence, actual non-virtual p95/p99, Replit cold-start POST persistence, or correctly reconstruct scientific data after UNLOGGED loss. The raw source recovery gates P09–P14 remain OPEN, and actual 6+6 source verification is `undefined` so enforceable live threshold remains 3. P20 120-minute hosted zero-provider-credit rehearsal remains NOT RUN. No Replit or Cloudflare publish/provisioning, no source/provider credit spend, no `main` merge and no paid YSSY authorization.

**Decision:** Sunday Oct 11 20:00 PDT YSSY paid Stage 1 remains **NO-GO** pending complete mandatory gates.
