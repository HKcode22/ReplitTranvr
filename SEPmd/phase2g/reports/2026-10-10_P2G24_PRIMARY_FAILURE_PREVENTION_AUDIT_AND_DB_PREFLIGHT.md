# 2026-10-10 — Primary callback failure PREVENTION hardening audit (Phase 2G Stage-1 YSSY)

**Status: PROPOSED SOURCE CHANGES IN DRAFT PR #27; NOT DEPLOYED; NOT MERGED; NO PAID AUTHORIZATION.** No changes to Replit, Cloudflare, AeroDataBox, scientific DB or provider credits. Source and tests only.

## Input: actual retained YSSY webhook sizes (operator read-only SQL)

User independently ran SELECT-only P2G24 exact-session object metadata audit:

| Metric | observed value |
|---|---:|
| Raw webhook references | **30** |
| Smallest serialized stored payload | **1,781 bytes** |
| Largest | **21,746 bytes** |
| Average | **5,827 bytes** |
| P95 | **17,441.15 bytes** |
| Above proposed conservative 60,000-byte cap | **0** |
| At/above Cloudflare Queues 128,000-byte limit | **0** |

The thirty P2G24 **stored provider-content objects** comfortably fit the *raw size* screen for the prospective Queue-only fallback. This sample is not a statistical upper bound for every future YSSY notification; raw blob byte size is not serialized Cloudflare Queue message size; 30 references are not necessarily 30 notification attempts/provider credits. Source: user-provided read-only SQL output; object hash/byte integrity on all 30 was separately verified previously. No personal/source flight bytes copied into repo.

## Primary prevention audit: protections already present BEFORE this patch

- `server/phase2gCallbackOnly.ts` published callback-only Express app refuses startup when `V39_CALLBACK_ONLY_RUNTIME`, `ADB_AUTO_COLLECT=false`, scientific DB URL, webhook secret or required dedicated blob storage are absent; app allowlists only prepaid callback and specified control-health routes. `GET /` returns platform 200 independently from external services; avoids the *specific missing root readiness* defect in earlier published revision. Because it does not query SQL, `GET /` does NOT certify ready-to-persist.
- `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` compares exact git HEAD, auth ID/digest, wrong-secret 404 route, runtime owner/mode/retention/version, webhook secret and DB URL HMAC **every 15s**, with 8-second per-request timeouts, serialized in-flight check and three-strike **fail-closed** stop. It cannot prevent Replit platform instance replacement and may trigger safely if callback route is unhealthy for ~45s.
- The existing `prepaidProbeRuntime_v39.ts` locks each session row, deduplicates delivery IDs, verifies raw content-store read-back and SHA256 before returning ACK, inserts logged opaque blob reference and UNLOGGED item/delivery/accounting rows inside a transaction, returns 2xx after commit. An object-store or SQL failure returns 5xx; provider retries are frozen to zero, so 5xx may still cost a credit and lose a callback.
- GitHub independently owns subscriptions, budget caps and watchdog/recovery; callback Replit environment is not owner and should never create or delete subscriptions. P2G22 260 external /259 internal remains DELIVERY_GAP. P2G23/P2G24 are historically failed/censored/UNRESOLVED and remain so.
- The 130m active and 146m sparse HTTP observations pass at sampled times but do **not** verify signed nonempty provider callback durability, full 120m peer continuity, DB restart/replay or external credit match.

## Newly identified and fixed prelaunch gap (DRAFT SOURCE)

**Gap:** Original `/__v39/phase2g/runtime-db-binding` HMAC proved GitHub and published callback held the same DB URL, **but did not query PostgreSQL**. A matching URL when DB is unavailable could have permitted launch.

**Patch:** Authenticated, separately namespaced `POST /__v39/phase2g/db-live-preflight`. It validates a fresh URL-derived HMAC challenge before issuing **exactly SELECT 1 AS connected** on the published callback's runtime pool; refuses bad/missing auth without DB access; only a correct SQL result returns status PASS. Response is redacted, no URL/SQL server errors/secrets or flight details. A bounded **6.5s** GitHub prelaunch client checks this AFTER the existing four callback configuration probes but BEFORE the paid owner subprocess is launched; refusal is `SUPERVISOR_REFUSED:PUBLISHED_DATABASE_NOT_CONNECTING`. It is **intentionally NOT** queried by the per-15s in-run callback watchdog, avoiding extra SQL load during paid collection and preserving the exact three-strike policy.

Source:
- `server/lib/disruption/phase2gDbLivePreflight_v39.ts` pure HMAC + SELECT result validation
- `scripts/phase2gStage1PublishedDatabaseLivePreflight_v39.ts` 6.5s prelaunch client
- `server/routes_v3.ts` authenticated SELECT-only handler
- `server/phase2gCallbackOnly.ts` allowlist
- `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` invoke before owner
- `tests/phase2g_p2g24_prepublish_real_db_prelaunch_v39.test.ts` (8 controlled offline scenarios)

**Limit:** Actual PostgreSQL connectivity was injected/mock-tested in CI; production Replit preflight endpoint will only be available after a separately approved republish and matching source/owner frozen release. A passed SELECT 1 at the start does **not** guarantee uninterrupted PostgreSQL health for two hours.

## New in-run evidence diagnostic (DRAFT SOURCE)

Callback-only server now uses `observePrepaidHttpTransportV39()` for the **prepaid POST path only**. It emits *sanitized warnings* if:
- Server response `finish` takes 7,000ms or more (within AeroDataBox ~10s timeout envelope);
- Server responds HTTP 5xx, even rapidly;
- Client/transport connection closes **before** the server finishes its response.

Telemetry reports only elapsed_ms, HTTP status, finish flag, and non-mutating counters; it deliberately excludes secret-bearing URL, provider payload and identifiers. The receiver's ordinary ACK/persistence/stop behavior is unchanged. `finish` is a **server-side** completion marker, **not proof the remote provider received it**. Test module `tests/phase2g_p2g24_prepaid_transport_diagnostics_v39.test.ts` verifies six scenarios including double-event idempotency and redaction.

These records improve real incident diagnosis; they do **not prevent Replit Autoscale SIGTERM or create recoverable lost provider bytes**.

## Outstanding critical risks and next gates

1. **Published Autoscale lifecycle:** Replit support ticket #564568 confirms transient cold-start buffering with **no Replit-managed delivery retries**; startup sometimes took ~3.25–5.39s for cheap GET route, and later logs show several process SIGTERMs. A code change cannot guarantee Replit will always remain running. Keepalive HTTP health probes already existed during P2G24, so idle scaling alone is not established as the original cause. Await Replit engineering's original revision stop/replacement reason and no unauthorised republish/unpublish.
2. **True callback performance:** Current prepaid handler performs R2-equivalent Replit object upload/read-back, logged ref insert and a possibly long per-flight identity transaction before 2xx. The upstream ~10-second response envelope has **never** been load-verified using nonempty realistic YSSY messages on the production-equivalent stack. Need staged isolated synthetic test and latency P95/P99/slow-ACK tail, plus injected object/DB faults. Never treat ordinary GET 200 as proof.
3. **PostgreSQL UNLOGGED runtime reset:** Missing state fails closed (confirmed by offline tests), but preserving raw source bytes elsewhere does not preserve session/scientific validity. Need disposable PostgreSQL crash/restart + producer/relay integration, dual timestamp interpretation and prospectively approved recovery semantics.
4. **Budget/accounting:** External 260 vs internal 259 remains unexplained and invalid; zero provider retries frozen. Positive retries are *billable* and would require a new prospective cost/safety amendment, not silently turned on.
5. **Free backup contingency:** 30 historical blob metadata objects all <=21,746 bytes makes short-message Queue-only plausible for those samples, but Cloudflare Free 24h queue retention, per-message envelope max and account quota are hard failure modes. R2 is NOT enabled and risk of usage charges is unacceptable without user approval. No Cloudflare deploy.
6. **Repository/source roll-out:** Original GitHub `main` and Replit published build remain unchanged. PR #27 is draft/unmerged. The new endpoint needs paired new Replit publish and signed supervisor deployment only **after** CI, contract review, freeze/hash, scientific amendment and explicit user approval. Deploying the new supervisor without publishing the new route would fail at prelaunch (safe but causes no run).
7. **Governance:** Existing one-additional-YSSY recovery authorization was consumed, and P2G23/P2G24 failures require new bounded scientifically reviewed retry authorization for a future paid Stage-1 YSSY. No automatic paid use of Sunday PDT / Monday UTC slot, even if technical CI is green.

**Decision:** Better prevention + richer diagnostics in DRAFT; not proof of unstoppable 120min scientific probe. Pending Replit original incident reason, real synthetic Postgres/replay/latency gate, free-tier capacity/retention proof, and new bounded retry approval. If any gate unmet: NO-GO, stop before using AeroDataBox credits.
