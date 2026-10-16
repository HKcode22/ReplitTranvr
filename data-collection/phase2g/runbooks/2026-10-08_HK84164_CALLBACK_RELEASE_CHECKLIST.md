# Phase-2G hk84164 callback release & team handoff — 2026-10-08

## Architectural decision (one repository, two Replit runtime roles)

- **Source of truth:** `HKcode22/ReplitTranvr`, branch `main` for team-shared application and protected V3.9 source; use reviewed GitHub branches and commits for all changes.
- **Team application:** `almabdella/Travnr-Environment-Setupzip` at `travnr.com`. Do not reset, republish, alter its `.replit`, trigger boot schema pushes, or sync it until the team explicitly approves a reviewed checkpoint.
- **Experiment receiver:** `hk84164/ReplitTranvr` at `https://replit-tranvr--hk84164.replit.app`, running the callback-only server. Its `.replit` is application-specific and must **not** be merged into shared `main`.
- **Database:** Both authorized runtimes use the external shared Neon `V39_DATABASE_RUNTIME_URL`; the database does not live inside either Replit app.
- **Raw storage:** hk84164 has its own explicitly named Replit Object Storage bucket; never write raw callback payloads into the original teammate-owned bucket by default.
- **Scientific owner:** GitHub Actions owns paid provider subscription create/delete, watchdog and after-stop attestation. Replit receives callbacks, persists raw content and can clean one exact session when authorized.

## Verified baseline before this hardening (do not confuse with new release approval)

- Shared `main` baseline: `b3015264272a3b25eac46822bcc013ba98fad406`.
- Published hk84164 callback release before this hardening: `b401ed31e98c46c38a66d237b908f84c7c09d373`; separately preserved as `phase2g-hk84164-callback`.
- Zero-credit GitHub/receiver source + webhook-secret + database-binding workflow succeeded in run `37781013485`.
- Published synthetic callback produced verified 1 session, 1 delivery, 1 flight item, 1 raw blob and then 1 blob deletion / 3 runtime rows deleted; receipt `artifacts/phase2f-workspace-callback-verification-20261008T131816Z.json`, SHA-256 `f6b7880d567b1b408768d31d5b14bdd2b14bfd8f9963fca45d85822ff5c9c177` on the hk84164 workspace only.
- At last read-only inventory: 0 open incidents; 0 runtime sessions; 710 historical webhook refs (all deletion-verified) before the synthetic test.
- YSSY probe 16 failed with `DELIVERY_GAP`, cleanup not verified. YSSY probe 17 failed, `UNRESOLVED` / censored, cleanup verified. Keep both failures intact.
- **This staging is NOT permission to launch a paid probe.**

## Code review and promotion boundaries

- `phase2g-signed-cleanup-hardening-20261008`: callback-specific development branch based on the preserved hk84164 commit, including its callback-only `.replit`.
- `phase2g-signed-cleanup-main-integration-20261008`: code-only branch based on shared `main`; PR #25 is **draft**, and its diff must exclude `.replit`.
- Merge code into `main` only after offline CI, security review, protected-science source attestation reconciliation and team handoff approval.
- Reconcile the new live published SHA with the GitHub Actions dispatch SHA after every hk84164 deployment. No fabricated/overridden commit identity. Any Replit-created commit must be audited for path differences.
- After final integration, update the original teammate-owned Replit deliberately using reviewed GitHub `main`; keep its production startup, Stripe integration and environment-specific settings intact. Do not treat an existing GitHub commit as proof that teammates have republished.

## Required cleanup credentials — **new code only, not configured by this PR**

- **GitHub Actions `phase2g-paid` environment:** `AERODATABOX_API_KEY` (owner/provider reads), `V39_DATABASE_RUNTIME_URL` (shared Neon), `AERODATABOX_WEBHOOK_SECRET`, and newly generated `V39_PHASE2G_CLEANUP_SIGNING_KEY` (>=32 random bytes represented as a secret string).
- **Published hk84164 receiver:** `V39_DATABASE_RUNTIME_URL`, `AERODATABOX_WEBHOOK_SECRET`, `V39_PROVIDER_BLOB_BUCKET_ID` (owned dedicated bucket), `V39_PROVIDER_BLOB_MODE=required`, `ADB_AUTO_COLLECT=false`, `V39_PHASE2G_CLEANUP_SIGNING_KEY` (same exact new key), and `V39_PHASE2G_CALLBACK_ORIGIN=https://replit-tranvr--hk84164.replit.app`.
- Never add the provider API key, database owner URL or Stripe keys to the public callback-only deployment merely to satisfy cleanup; no old `V39_PHASE2G_CONTROL_SECRET` reuse as GitHub credential.
- Never print secrets in CI logs or shell captures. Replit workspace variables are not proof of Published deployment variables: verify deployment configuration separately.

## Mandatory no-paid launch progression

1. Complete CI: V3.9 typecheck, offline and full tests, lint, registry, traceability, scanner, preflight and build on the **exact** code commit.
2. Verify the new cleanup-key binding endpoint rejects bad HMAC, accepts correct nonce HMAC and invokes no provider/DB mutations.
3. Test new signed cleanup offline (wrong key, wrong session, wrong probe, wrong budget, wrong ICAO/subscription, wrong blob count, wrong origin, expired/future attestation); ensure no unsigned legacy fallback.
4. Test live **exact-session** signed cleanup in an authorized **synthetic-only** isolated probe with an auditable receipt and no historical YSSY mutation. Previous phase2f synthetic callback proof does **not** test this new bridge.
5. Verify GitHub published exact source, Neon HMAC binding, webhook-secret binding and new cleanup-key binding from the exact workflow code.
6. Recreate/approve any impacted Gate-2 frozen runtime evidence when the protected tree SHA changes. A stale source fingerprint is a hard stop; do not adjust `expected_head` to bypass it.
7. Generate a fresh, non-stale `v39.phase2g-live-callback-verification.v1` receipt with the existing official verifier, preserving its SHA-256 in the launch evidence.
8. Verify unattended publication stability over the desired 120-minute YSSY window, including cold-start and provider 10-second ACK constraints. Autoscale and free-tier expiration are not continuous-uptime guarantees.
9. Obtain a **fresh** exact YSSY authorization, window, protected credit floor and budget-day ID. Do not reuse expired `AUTH-20261008-P2G23` or failed YSSY probes as PASS.
10. After the paid owner terminates its subscription, cleanup may run only if provider inventory strictly confirms zero account-wide active billable subscriptions, the exact probe is `settling/MATCH` and uncensored, and the callback is quiescent for >=30 seconds. The signed 90-second proof is one-session/one-probe scoped. Signed cleanup success is followed by the existing hash-checked settling finalizer.
11. On any failure, preserve unresolved/censored evidence and raw refs per retention policy; do not automatically retry paid YSSY or blindly cleanup live/unknown subscriptions.

## Remaining hard boundaries

- PostgreSQL `UNLOGGED` prepaid runtime tables are not crash-durable. Runtime loss remains scientifically censored, regardless of signed cleanup.
- Provider account inventory is an external API **read** from GitHub, not a guaranteed zero-cost operation across provider billing products; no subscription creation/deletion/refill occurs in the cleanup script.
- A successful isolated synthetic callback or GitHub HMAC binding cannot prove a complete 120-minute flight-delivery series or eliminate every 260-vs-259 accounting risk.
- GitHub workflow_dispatch registrations may depend on a workflow being present on the repository default branch. The staged cleanup workflow is not available for a production run merely because it exists on a draft branch.
- **Neither a merge nor deployment nor any paid action is performed by this runbook or its PR.**
