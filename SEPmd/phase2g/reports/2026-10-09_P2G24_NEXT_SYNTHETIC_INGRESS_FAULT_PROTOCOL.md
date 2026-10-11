# P2G24 → Phase6: next no-provider real-ingress resilience experiment protocol

**State:** DESIGN / NOT EXECUTED / NO PAID-LAUNCH AUTHORIZATION.  
**Target:** Exercise real HTTP admission, database transactions, blob-store durability, crashes, idempotency and delivery accounting together, without calling AeroDataBox or modifying scientific data.

## Context / evidence gates already completed

- [130-minute continuous active receiver health](2026-10-09_P2G24_130M_OBSERVER_ARTIFACT_LATENCY_AUDIT.md): PASS / 520 cycles / 2,600 checks / no paid calls, but no real provider payload or SQL test.
- [146-minute sparse receiver health](2026-10-09_P2G24_SPARSE_146M_OBSERVER_ARTIFACT_AUDIT.md): PASS / 6 spaced checkpoints / 30 checks, but can miss outages between them, no demonstrated Autoscale sleep/wake or SQL test.
- [P2G22–P2G24 verified durable ledger and object audit](2026-10-09_P2G22_P2G24_OPERATOR_READONLY_AUDIT.md): 260/259 credit gap / 30 of 30 stored P2G24 objects match SHA-256.
- [Actual-code offline failure injection CI #38009253110](https://github.com/HKcode22/ReplitTranvr/actions/runs/38009253110): 5/5 mocked actual `persistPrepaidProbeWebhookV39` behaviors passed; mocked DB, fake store, zero-flight payload. Useful unit results, **not real integrated restart behavior**.

## Non-negotiable isolation

- GitHub-hosted disposable environment, **independent PostgreSQL instance created only for this CI run**. Never accept `V39_DATABASE_RUNTIME_URL`, `DATABASE_URL` or any production secrets. Refuse when GitHub environment `phase2g-paid` or any `AERODATABOX_*` secrets are injected. No real AeroDataBox API key, subscription, checkBalance, provider HTTP request, refill, or paid owner.
- Launch a synthetic callback-only Express server bound to `127.0.0.1` and a randomly assigned local port. Use **test-only webhook secret**, disposable UUID (not any historical P2G22/23/24 UUID) and synthetic notification IDs; not the published `.replit.app` endpoint. Fake object storage is a local temporary directory or in-memory store with explicit fault hooks; check SHA-256 and read-after-write.
- Run only a migration/schema subset reviewed for local Postgres, and remove the temporary database/files after completion (temporary fixture only). No permission to delete the P2G24 30 provider blobs.
- Record sanitized request traces: path template without secret, HTTP status, start/end UTC, response latency, fake object digest, DB fixture row IDs/counts and fault labels; never raw production payload or actual credentials.

## Tests required

| Scenario | Fault applied | Acceptance signal |
|---|---|---|
| S1 happy path with nonempty item array | no fault; signed synthetic payload, real local SQL and fake object store | 200 only after blob readback/hash, logged ref and UNLOGGED delivery/item transaction COMMIT; physical-flight-instance IDs validated |
| S2 2xx response lost after commit | intercept/drop HTTP reply while DB commit succeeds | provider retry with same exact notification must return duplicate, **one** internal billed delivery, no second blob |
| S3 object upload failure | injected write error | HTTP 5xx, zero success count, no accepted delivery; failure counted once |
| S4 read-after-write mismatch | corrupt fake store read | HTTP 5xx, no acknowledged event, failed blob deleted/marked; no phantom credit |
| S5 SQL failure after successful upload | inject INSERT/COMMIT failure in local Postgres | no 2xx or false credit match; prove cleanup/quarantine for orphan, detect partial logged reference |
| S6 callback route auth / parser | wrong secret, malformed JSON, wrong media type | expected 404/4xx; wrong-secret never poisons real callback session counters |
| S7 listener termination before reply | kill synthetic Node process at exact controlled admission phases | distinguish before-store, after-store-before-COMMIT, after-COMMIT-before-response; retry converges or fails closed without overcount |
| S8 ephemeral Postgres restart | hard-stop fixture PostgreSQL while synthetic session active | UNLOGGED reset detected, trial terminal classified censored/UNRESOLVED, never falsely MATCH; raw object refs preserved as applicable |
| S9 provider credit ledger discrepancy | synthetic external credits=260/internal=259 and 260/260 delayed last delivery | hard DELIVERY_GAP when one missing; MATCH only when real matching last event persists; never numerical tolerance |
| S10 sustained load | realistic batched nonempty YSSY/WSSS-sized synthetic payloads and bursts | P95/P99 callback admission latency, DB lock wait, timeout, queue and memory, credit accounting invariants remain within defined acceptance gates |

## Result qualification

- Predeclare acceptance thresholds including the upstream callback ten-second response budget and internal eight-second admission target, representative max burst and payload size, and frozen identity metric `v39-physical-flight-instance-v2`; record tests with synthetic timestamps and independent provider-receipt count.
- A test that fails at expected injected fault can **pass** only if the correct fail-closed response, durable evidence, idempotent retry, and invariants were demonstrated. Distinguish **expected fault injection** from an actual test failure.
- Produce machine-readable summary with pass/fail per scenario, original SQL process lifecycle, source/build digest, fixture hashes, timing statistics, error detail scrubbed of secrets, and artifact checksums. CI must fail on missed cases or incomplete evidence.
- **Never promote historic P2G22/23/24 to MATCH/completed**. Do not relax three-strike owner watchdog or one-credit tolerance to make CI green.
- Re-running passive health checks cannot substitute for this protocol. Real published Autoscale replacement reason still requires Replit platform logs around **2026-10-09 04:58:21 UTC**.

## Definition of done for protocol implementation

- [ ] Dedicated isolated GitHub CI workflow and typed fixture with hard denial of production secrets and network egress to provider.
- [ ] S1–S10 implemented and passing on the **actual integration path**, not source-text matching alone.
- [ ] Ephemeral Postgres restart and listener restart controlled with exact timestamps, owner/health code and durable evidence.
- [ ] Review privacy/retention and provider callback semantics against data-collection plan + implementation log.
- [ ] Independent review and scientific gate decision. Until then, **Phase6 NO-GO**.

This protocol is a *proposed controlled experiment*, not an authorization for production DB mutations or paid AeroDataBox activity. Source branch and [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27).
