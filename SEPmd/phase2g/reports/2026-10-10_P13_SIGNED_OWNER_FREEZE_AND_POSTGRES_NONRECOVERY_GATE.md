# Phase 2G P13 — Independently pinned synthetic owner/session freeze and fail-closed SQL continuity

**2026-10-10 — DRAFT TEST-ONLY PROPOSAL, NOT PROD / NOT PAID AUTHORIZATION**

## Verified evidence

[GitHub Actions #38054848894](https://github.com/HKcode22/ReplitTranvr/actions/runs/38054848894) ran isolated incident branch `phase2g-p2g24-github-observer-20261009`; **both CI jobs SUCCESS**:

- **22 Vitest offline suites: 166/166 passing**; standalone 18 callback-health tests; server TypeScript typecheck.
- **34/34 actual V3.9 loopback HTTP / disposable PostgreSQL 16 persistence tests**.
- Separate actual PostgreSQL SIGKILL/restart service-container proof: LOGGED synthetic receipt metadata survives, UNLOGGED session material disappears. This is NOT a simulated Replit instance restart or paid-provider integration.
- No AeroDataBox calls/credits/subscriptions, no production DB writes, no Cloudflare or Replit resource provisioning, no deployment, no production migrations, no `main` merge. This is GitHub-hosted CI usage, which may consume the repository's existing GitHub Actions quota; it is not a guarantee of zero GitHub hosting cost.

## New proof components

- `experiments/phase2g_rehearsal/synthetic_owner_freeze_signature_v39.ts`: Ed25519 signed **synthetic after-subscription binding** with deterministic domain-separated bytes and SHA-256 freeze ID. The verifier independently checks a pinned SPKI public-key fingerprint AND an externally supplied exact expected freeze. It binds the fictional session/subscription, F.8 plan/implementation hash, GitHub owner commit, receiver commit, PostgreSQL postmaster start, YSSY/physical-flight-v2/15-minute bins, strict 120-minute window, no provider retries, Stage-1 450 reserve/500 ceiling/1000 protected floor, and test-only mode.
- `tests/phase2g_synthetic_owner_freeze_signature_v39.test.ts`: **11 adversarial tests** for verified signature, attacker key substitution despite valid attacker-generated signature, missing/wrong public-key pin, unsupported key, signature mutation/malformed base64, unknown fields, changed source hashes/builds, wrong session/subscription, shifted windows or database start, unauthorized retry/budget/metric change, signed-after-window and changed independently expected anchor. A final composition test binds independent fictional sender ledger to cryptographically verified owner digest before testing signed edge ↔ internal attempt reconciliation.
- `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts`: a **new real disposable-PostgreSQL test** verifies the signed synthetic owner freeze against an actual `pg_postmaster_start_time()` snapshot, then removes UNLOGGED session/delivery/item test rows while leaving LOGGED raw-blob metadata. The owner signature **remains valid**, yet the existing continuity assessment refuses recovery with missing session/delivery, orphan raw refs, and unverified independent provider accounting. CI logs record `SIGNED_OWNER_FIXTURE_CANNOT_AUTHORIZE_RECOVERY=true`.

## What is and is not proven

**Proven only within synthetic test boundaries:** A forged key, a valid signature from the wrong key, an edited frozen run, an unreviewed retry/budget/source change, or a changed receiver source cannot silently satisfy this exact independent public-key+run-context fixture. A valid signed owner freeze **does not override** missing original scientific runtime or independently unknown sender billing.

**NOT proven / STILL BLOCKING:**

1. No production GitHub Actions key issuance, distribution, rotation/revocation, audit trail, or independently established trust anchor. The expected frozen context and pin are supplied by the offline fixture; an attacker able to control both the trust anchor and policy can still change what is accepted.
2. No production-safe **two-stage** owner protocol: a scientific plan is prospectively frozen before creating the real billable subscription; the *actual* subscription ID becomes known only after creation and must be signed/bound without a second subscription, unbounded billing window or ownership split. This synthetic module models only an already-bound stage and performs NO live creation.
3. No actual source-origin authentication or authentic AeroDataBox billing export. A separately signed test sender and experimental edge HMAC cannot certify upstream credit spend or unseen failed attempts.
4. No complete reconstructible post-crash research dataset: the V3.9 UNLOGGED session, per-delivery and flight-item identity, frozen 8x15m timing bins, original edge UTC, physical-flight-v2 and consented retention must all be proven **individual-by-individual** from lawful, independently durable evidence. The current prototype cannot do this.
5. No live Replit, actual object-storage and network latency, cold starts, Cloudflare Queue/R2 durability or account quotas, scientifically equivalent replay, or 120-minute published-equivalent wall-clock rehearsal. Provider retry stays zero and YSSY Stage-1 remains censored/not authorized for another paid run.
6. A certificate bound to `pg_postmaster_start_time()` alone does not prove multi-host database history, backup restore, row-level state completeness or post-restart scientific validity.
7. P2G22 historical **260 external / 259 internal** remains unexplained; P2G23 and P2G24 fail/censor status unchanged; Replit ticket **#564568** original P2G24 termination still awaits engineering evidence.

## Exact next priority

Establish the prospective **two-stage control-plane and independent trust-anchor protocol** without creating any subscription. Then design an immutable per-attempt, per-physical-item recovery reference anchored to source UTC and full raw bytes, show fail-closed behavior under actual isolated SQL crash, prove legal seven-day raw evidence retention and queue-to-DB replay. Only then consider an explicitly approved isolated $0 additional-cost staging plan for complete 120-minute no-provider rehearsal R0–R11.

**NO-GO:** PR #27 remains DRAFT, no merge/deployment/paid authorizations. P13 is **PARTIALLY ADVANCED, NOT CLOSED**.
