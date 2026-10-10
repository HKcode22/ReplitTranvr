# P13 — Two-stage signed owner binding, disposable logged uniqueness and crash survival

**Status: TEST-ONLY INVESTIGATION. No live provider, scientific, Cloudflare or Replit resource changes. Paid Stage-1 YSSY is NO-GO.**

Date 2026-10-10. Branch `phase2g-p2g24-github-observer-20261009`, draft PR [#27](https://github.com/HKcode22/ReplitTranvr/pull/27), incident [#28](https://github.com/HKcode22/ReplitTranvr/issues/28).

## Independently verified GitHub CI

[Run #38055562712](https://github.com/HKcode22/ReplitTranvr/actions/runs/38055562712) **completed SUCCESS in both jobs**:

- **23 offline Vitest suites / 180 of 180 tests passed**, 18 separate network-isolated callback-health scenarios and TypeScript validation.
- **35 of 35 real V3.9 HTTP/persistence integration tests passed** against disposable local PostgreSQL 16 with synthetic payloads and mocked in-memory provider-object storage.
- Real, isolated CI PostgreSQL **SIGKILL→restart** proves `UNLOGGED` test rows disappear and a **single synthetic LOGGED two-stage binding row survives** (`TWO_STAGE_LOGGED_OWNER_BINDING_AFTER_UNCLEAN_RESTART=1`). Separate existing dual-hash logged receipt survivability also passed.
- **No AeroDataBox provider calls/subscriptions/credits**, Cloudflare provisioning, production scientific database access, Replit deployment, `main` merge or PR promotion. GitHub Actions still consumes the repository's normal CI quota; this is not a statement that GitHub CI hosting is free.

## Two-phase design and tests

**Stage A — BEFORE provider subscription creation**: `experiments/phase2g_rehearsal/synthetic_two_stage_owner_protocol_v39.ts` signs a prospective frozen Stage-1 owner scientific plan using domain-separated Ed25519 with `providerSubscriptionId=null`. The signed plan includes a fixed UTC 120-minute window, YSSY/physical-flight-v2/15min bucket definitions, frozen plan/implementation hashes and owner/receiver commits, database lifecycle baseline, 0 provider delivery retries, 500 credit ceiling / 450 initial reserve / 1000 protected-account floor. Key SPKI fingerprint and exact independent freeze are required when verifying.

**Stage B — AFTER a declared synthetic creation event**: the owner signs a second versioned binding with **pre-plan SHA**, specific synthetic subscription ID, create-attempt SHA, declared provider creation UTC, bind UTC and post-create frozen-run SHA. The post-create owner freeze is independently signed as well; all three signatures/context fields must agree. Backdated plan freeze, binding-before-create, binding-after-start, altered version/metric/budget/retry/source revision, mismatched subscription and two conflicting signed bindings are rejected. It is a *test-only* declared creation event, **not a real AeroDataBox API receipt**, and owner keys are ephemeral fixtures, not deployed GitHub signing keys.

**14 adversarial offline tests** in `tests/phase2g_synthetic_two_stage_owner_protocol_v39.test.ts` cover the above, plus wrong trusted key, forged signatures and post-bind SHA matching with the existing independent sender/edge/internal synthetic attempt verifier. A pre-plan hash alone cannot substitute for a signed post-binding run hash.

**Local PostgreSQL feasibility**: `experiments/phase2g_rehearsal/disposable_two_stage_owner_journal_v39.ts` is strictly gated to `127.0.0.1/p2g_stage1_fixture`, refuses presence of production/provider credentials, verifies the complete signed chain **before** insertion, and inserts one LOGGED row under `plan_sha256 PRIMARY KEY`, `subscription_id UNIQUE`, and `create_attempt_sha256 UNIQUE`. Repeated identical inserts are idempotent. A conflicting rebind to a different subscription is refused even when separately signed with the same synthetic owner key. New actual SQL test checks two concurrent writers and subsequent conflict; CI crash step proves its LOGGED row survives SIGKILL/restart.

## Important limits: no scientifically validated real-world recovery

1. **External exactly-one creation is NOT proven.** A crash after AeroDataBox accepts a CREATE but before receiving its response or before writing the local journal may leave an *orphan paid subscription*. An atomic DB row cannot atomically commit a third-party API side effect. Before real authorization, require a design for unique create-attempt idempotency (if supported), provider-side listing/reconciliation, unknown-result quarantine, strict owner/watchdog leases and fail-closed abort. Do not blindly retry CREATE.
2. **No authentic provider-origin receipt or billing proof** was used. Independent creation fields are declared by the synthetic fixture. The verifier returns `independentCreationVerified=false` and `crossProcessOneSubscriptionProven=false`; the journal returns `productionSubscriptionUniquenessProven=false`.
3. **No live owner-signing ceremony or protected trust anchor**: ephemeral CI private keys prove cryptographic feasibility, not deployment key custody, rotation, revocation, authorized run signing or immutable evidence-store semantics.
4. **Post-crash scientific state remains unsafe**: even with the owner binding surviving in a LOGGED table, original V3.9 UNLOGGED session/deliveries/physical-flight item ledger may vanish. One preserved control record cannot reconstruct source-time 15min buckets, physical-v2 identities, exact attempt costs, ACK history or the 120-minute scientific exposure. The earlier fail-closed censor gate remains mandatory.
5. **Durable ingress/replay still absent** in actual deployment. Process-local edge first-UTC idempotency, Queue+SQL dual-write non-atomicity, 24h Queue vs 168h raw retention, true HTTP source-wire bytes versus legacy canonical JSON, Replit published runtime/lifecycle, storage latency and two-hour realistic no-provider wall-clock rehearsal remain open.
6. Original P2G22 provider **260 external / 259 internal**, P2G23/P2G24 censored experiments and ticket **#564568** instance termination remain unresolved. Synthetic accounting tests do not supply retrospective provider evidence.

## Next release-gate work — no provider calls

1. Implement an isolated **CREATE-unknown-outcome state machine** with a durable pre-call intent, exact owner lease, non-success timeout state, read-only provider listing evidence supplied by a fake, and no second CREATE when the first is uncertain. Test process crash between provider acceptance, owner ACK and DB commit. Do not assume AeroDataBox has idempotency tokens unless documented.
2. Add fault-injection of concurrent owner failover, create/reconcile races, unresponsive provider listing, duplicate subscription discovery, missed unsubscribe and watchdog timeout; ensure ledger **never** asserts 0 spend merely from no locally recorded response.
3. Advance full offline signed source/owner/physical-item evidence reconstruction under an actual isolated PostgreSQL crash while keeping missing evidence censored. Do not mutate historic study contract without prospective scientific approval.
4. Pending legal/cost/privacy gates, obtain explicit permission before any cloud staging, actual published callback tests or 120-minute hosted rehearsal; the final 120-minute no-credit R0/R1–R11 protocol has not been executed.

**Decision: P13 two-stage signing and local logged uniqueness feasibility validated in isolated CI; overall P13 and scientific paid readiness remain NOT CLOSED. Stage-1 YSSY remains NO-GO.**