# Phase 3 Gate 4 — live commissioning critical path (2026-10-22)

> **Status: LIVE HOLD, NOT AUTHORIZED.** This is the concise release/commissioning handoff for the October 22 contingency deadline. It is **not** a deployment manifest, production migration approval, independent safety attestation or paid API approval. See [the full dated Gate4 checkpoint](./2026-10-22_GATE4_STANDALONE_CANARY_SAFETY_PLAN_AND_CHECKPOINT.md) and [draft PR #95](https://github.com/HKcode22/ReplitTranvr/pull/95).

## What is actually complete

| Gate | Status | Verified evidence |
| --- | --- | --- |
| 1. Source + provider-free safety tests | PASS at immutable code pin `6caf6bdcecf6743f251ecd926e96657c0b6abef7` | 5/5 GitHub workflows, including real disposable PostgreSQL and separate Alert-only bundle |
| 2. Timestamped published-host / provider-account / DB read-only preflight | PASS at owner observation | Published SHA `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`, 2,037 credits, no billable subscription; **must refresh immediately before real run** |
| 3. Dedicated ordinary Alert receiver | SOURCE candidate only | Separate opt-in binary; Phase2G prepaid-only live deployment still refuses ordinary Alert POST; no new receiver published |
| 4. Provider-ID pre-CREATE quarantine | SOURCE candidate / disposable PG PASS | `V0071` LOGGED original-wire staged table, POST receipt after commit+readback; not installed in real runtime |
| 5. Independently trusted post-CREATE ownership binding | **BLOCKED** | No real CREATE receipt, exact provider LIST confirmation, independent signer root or atomic activation/replay |
| 6. Independent STOP supervisor + STOP-only gateway | **BLOCKED** | No externally commissioned/attested process, scoped gateway, protected anchor, or owner-confirmed alert ACK |
| 7. Specific human paid AUTH and trial STOP/settlement | **NOT AUTHORIZED** | No provider Alert CREATE/DELETE, no billing envelope measured, no 3-balance post-STOP receipt |

## Highest-priority commissioning decisions (owner actions needed)

1. **Choose and prepare an actually separate STOP runtime.** **Required runtime separation:** a separately hosted, continuously running and supervised STOP worker **outside the Replit controller's lifecycle**, with independent custody and incident escalation. A GitHub Actions *environment* is useful for protected approval and release-secret access, and GitHub Actions may provide a supplementary manual audit/recovery job, **but GitHub scheduled Actions must NOT be the sole deadline/heartbeat/STOP watchdog**: the minimum cron interval is 5 minutes and scheduled events may be delayed or dropped. A second Replit app alone separates application lifecycles but may share the same platform outage domain. The workspace and this chat cannot create an independently trusted account or attest service liveness automatically. The connected Replit app name search for `gate4` found no matching app on October 22; this is NOT proof that a safety service under a different name is absent.
2. **Provision credentials privately, not in GitHub source or chat.** The safety worker needs independently attested source+trial AUTH and an authenticated read-only custody channel. The exact-owned STOP gateway needs strictly reviewed provider READ/LIST + DELETE privileges for **one** positively owned ID. The AeroDataBox account-level key may not support provider-side DELETE-only scoping; if the provider does not support it, a separate narrow proxy/reviewed exception is required and must be disclosed. No generic app DB URL/CREATE or production application secrets in the worker.
3. **Separately approve the staged receiver environment and database permissions before changing real infrastructure.** Migrations in `migrations/staged`, especially `V0071`, must stay out of automatic boot. The receiver's trial-specific callback secret, byte-preserving data store, retention, monitoring and zero-authority prebinding mode must be proven on a separated staging identity before any paid CREATE. Production SQL/deploy is NOT approved by reading this plan.
4. **Resolve ID handoff as a release blocker.** When AeroDataBox returns the exact subscription ID from CREATE, independently verify matching account ownership/subject and sign/pin an exact CREATE receipt outside the untrusted POST body. In one durable atomic operation, bind trial and ID; quarantine replay may classify science **only after** authentic binding. A first-seen body ID must never count as a CREATE receipt; unknown remote CREATE outcome remains HOLD requiring manual rescue.
5. **Perform a *no-provider* hosted rehearsal** with the newly commissioned separate process and staged receiver: signed source and scope identity, duplicate/late callbacks, raw-body durable ACK, readback, restricted DB roles, failure/restart, externally observed heartbeat, deadline expiry, independently persisted STOP receipt and an operator-received **ACK** of test alert. An HTTP 200 health check, passing offline tests or a scheduled GitHub job is insufficient proof that STOP stayed armed.
6. **Only after the above**, refresh the real provider account three stable balance readings, strict LIST=0, DB identity/active ledger and published Git head. Present **one exact new paid authorization**: the actual time window, ICAO, source pin, signed scope, 20-credit *soft* target, 10-credit unsettled reserve, protected floor 1,000, possible provider SEND burst beyond 30, and exact emergency STOP route.
7. On distinct human GO only, run **one** credit-based Alert trial, reconcile outbound provider SEND/item counts vs durable callbacks, issue independently verified DELETE on exact owned ID, confirm strict provider no-active LIST and >=3 stable post-STOP balances, record potential in-flight SEND residual charges, reconcile/scientifically report gaps without requiring mathematically impossible zero delivery loss, refuse another trial until settled.

## Minimum proof to change milestone 3 to live PASS

A real **owner-attested** and independently verifiable receipt bundle must show:
- Exact reviewed commit and deployed receiver callback-path hash, real immutable trial-specific callback URL and verified hosted prebind readiness *before* CREATE
- Successful restricted DB schema/role/backup and original-byte storage plus readback; original POSTs retain a trustworthy raw digest
- Exact provider-subscription ownership from reviewed CREATE response + strict provider LIST; separate trusted binding signature and monotonic CAS readback
- Independently running STOP process in a separate failure domain; real restricted credentials, STOP health, signed deadline and scope, observer ACK
- Real service-level callback, terminal exact DELETE and post-STOP accounting evidence

If any are missing, status stays **GATE4 LIVE HOLD**. No permission is inferred to merge protected main, publish Replit, create/change infrastructure, install staged SQL, call provider paid endpoints, or start Phase6.

## Source-review issue found October 22: prebind readback metadata

The earlier `gate4PrebindPgStore_v39.ts` compared post-COMMIT raw bytes + SHA without rechecking every original source/auth/airport/claimed-owner metadata field. Code is now corrected so `readBackOriginal(original)` verifies the entire independently supplied record via `same(row,original)`; unit and real disposable-PG regression tests include foreign claimed ID and changed authorization. Exact new source pin: `b196b10fb3f64095c35605324546f929bf39a88d`; **recheck 5/5 CI before calling the patch verified**.

## Action boundary

The user explicitly prefers **Replit Shell commands, not Replit AI Agent**, and **no Cloudflare**. Do not ask them to paste secrets, publish silently, modify protected main/production DB, call AeroDataBox CREATE/DELETE/refill, or start Phase6. Manual infrastructure setup and live canary are distinct, specific owner approval decisions.

**Next session:** read this page first; verify CI at `b196b10...`; resolve the named independent safety hosting/credential owner action; and close the real ID-binding/STOP commissioning checkboxes. Do not repeat the already resolved old `f5b1347...` published pin diagnosis or repeatedly recreate the same offline mock safety checks.

## 2026-10-22 — signed exact provider-ID handoff (staged source)

**DRAFT handoff implementation** (no deployment or real provider calls) at source pin `a5e0f82b54078174698a713ae87146544eeb0e1c`:
- `server/lib/disruption/gate4VerifiedOwnerBinding_v39.ts`: validates exact source, trial scope, original authorization, ICAO and subscribed ID against an externally supplied monotonic custody anchor; requires a cryptographically valid signed STOP ticket with separately pinned digest and the same exact owned ID; strictly checks the provider LIST has **exactly one** active CreditBased subscription with that ID+ICAO before injecting a write-once binding. A callback's first-seen `subscription.id` is **never** used to choose the owned provider ID. Absent/ambiguous provider inventory, swapped signer, wrong signed scope, stale/foreign anchor, DB conflict or readback failure => HOLD. Positive result explicitly remains `BOUND_RECEIPT_ONLY_NOT_EXTERNAL_ATTESTATION`, **not** a live owner/provenance/STOP or science-attribution proof.
- `migrations/staged/V0072__gate4_owned_binding_v39.sql`: staged **unapplied** unique trial-scope and unique provider subscription-ID binding table, with reviewed CREATE receipt digest and signed STOP-ticket digest. No automatic migration; PUBLIC privileges revoked. The ordinary callback receiver MUST NOT receive the binding writer role.
- `server/lib/disruption/gate4OwnedBindingPgStore_v39.ts`: transactional `INSERT ... ON CONFLICT DO NOTHING`, exact-field SELECT and COMMIT, then a separate independent readback. An altered trial/ID/CREATE digest cannot silently overwrite an existing row. An ambiguous COMMIT reply maps to HOLD and does not blindly retry.
- `tests/phase3_gate4_verified_owner_binding_v39.test.ts`: 10 offline provider-mock negative and positive cases; `tests/phase3_gate4_prebind_real_pg_v39.test.ts` extended to apply **V0072 only inside a disposable PostgreSQL16 CI container** and test same-ID idempotence, cross-scope duplicate ID, foreign ID on same scope, and changed authorization. Dedicated workflow updated to run these tests at exact source `a5e0f82b54078174698a713ae87146544eeb0e1c`. GitHub CI was still running at the moment of this entry; record final result separately only after completed success.

**Unresolved authenticity vs verified field consistency:** The source cannot prove the outside actor witnessed AeroDataBox CREATE, that the reviewed CREATE receipt was genuinely from the account, that the signer identity is trusted, that the external anchor is rollback-resistant, or that the provider's real subject encoding is identical to the simulated fixtures. Before commissioning, independently attest these with separate, restricted credentials and immutable source evidence, then test the receiver's binding handoff without converting quarantined content to science on incomplete custody.

**Remaining real blockers:** (1) GitHub `gate4-safety` environment and protected secrets/reviewer controls (could not inspect environment using currently connected GitHub read operations; do not assume configured); (2) physically distinct supervised STOP gateway/worker and external custody anchor, with owner-acknowledged escalation; (3) reviewed/published dedicated ordinary Alert receiver and approved STAGED schema/roles; (4) fresh read-only provider foundation and independent paid GO; (5) actual bounded paid CREATE, webhook measurements, exact STOP, and >=3 stable settlement balances. Production/main/Phase6 and published Replit were untouched here. Real Gate4 remains **HOLD**, regardless of synthetic CI success.

## 2026-10-22 — STOP runtime architecture correction (verified with GitHub documentation)

**Do not commission only a GitHub Actions cron as the independent STOP.** GitHub's [scheduled workflows reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) states a **five-minute minimum schedule** and that scheduled runs can be delayed or dropped. For a short AeroDataBox Alert test where each attempted SEND may consume credits, this is **not a deterministic STOP-clock guarantee**. The project previously suggested a protected GitHub Actions safety job as a preferable alternative to an independent worker; that advice is revised: Actions is useful as a **release/authorization/backup-audit plane only**, NOT as the sole real-time STOP protection.

**Target minimal deployment topology (not yet built or authorized):**

```text
Owner-controlled GitHub gate4-safety environment
   | approves exact source / trial / expiry; no raw provider key in the PR
   v
Dedicated Gate4 STOP host — continuously supervised; NOT controller Replit lifecycle
   | independent clock + exact signed ticket + durable read-only owner custody
   | strict LIST + owned-id-only DELETE via restricted gateway
   | independent ACKed human alert / fail-closed deadline and crash recovery
   v
Independent custody anchor + credential-filtered STOP gateway

Replit published original Phase2G receiver: UNCHANGED
Separate Gate4 Alert receiver: DRAFT, needs reviewed publish and V0071/V0072 roles
AeroDataBox paid CREATE: FORBIDDEN until all above are genuinely armed
```

**Owner action (no secret disclosure):** Visit [repository Environments settings](https://github.com/HKcode22/ReplitTranvr/settings/environments), check/create `gate4-safety`. Protect the environment/branch where available; inspect protection availability for the actual repo plan/visibility. Do **not** add secrets yet. The currently connected GitHub tool set does not expose repository Environment GET/CREATE or protection-rule writes, so configuration cannot be attested in chat. The environment alone does **not** deploy the STOP worker or prove privileges. The owner must also authorize a truly separate host and later review its credential boundary as a **distinct infrastructure decision**, before any publish/SQL mutation. No Cloudflare or Replit AI Agent.

**Minimum external-worker acceptance before LIVE Gate4:** The host is online before any paid CREATE; has isolated runtime identity and separately provisioned narrowly scoped read-only custody credential and exact-ID STOP gateway credential; enforces independently reviewed trial expiry and loss-of-controller-heartbeat STOP; survives/reconciles its own restart/unknown DELETE response; produces durable STOP evidence plus separately acknowledged alert; and confirms exact owned ID deletion and strict LIST/credit settlement. A test success in GitHub Actions is not evidence of these live properties.

**Current source milestone:** source `a5e0f82b54078174698a713ae87146544eeb0e1c` passed **5/5 GitHub provider-free workflows** (V3.9 Offline Safety, focused release, public receiver, disposable PG faults, and dedicated Gate4 Alert+V0072 real disposable PG16). PR #95 remains unmerged; V0071/V0072 unapplied. The next action is operational host/environment commissioning and human-reviewed authorization, *not another generic mocked STOP helper*.

## 2026-10-22 — owner-directed FREE-ONLY GitHub Actions completion track

**Owner decision / capability:** `gate4-safety` GitHub repository Environment **confirmed created by owner's screenshot** on October 22, 2026, 3:22 PM local. The screenshot shows the environment listed, without displayed protections/secrets; do not claim its actual approval rules or secret scopes are configured. `gate05-safety` (two protection rules) and `phase2g-paid` (five secrets) are separate prior environments and must not be silently shared with Gate4.

**Architecture deliberately revised for existing no-cost resources:** Reuse the earlier Gate3/Phase2G *continuously executing* GitHub-hosted Actions watchdog model, **not** a cron trigger for each 5-second poll. A GitHub-hosted Actions job has a documented six-hour execution limit ([official limits](https://docs.github.com/en/actions/reference/limits)); 2-hour monitoring windows fit within one job if it launches in time and stays healthy. GitHub cron's five-minute minimum does **not** constrain in-process ticks. The watch job must start and visibly report **ARMED** before any paid CREATE; a pending/queued job is NOT protection. A runner cancellation, host outage, network failure or a provider SEND burst can defeat the soft budget; this is an explicitly accepted **residual operational risk only if the owner separately approves it**. There is NO mathematical/provider hard cap.

**New no-provider source** on DRAFT PR #95 at `7e070b8eddc529adbbd4e31aba041615a30080b9`:
- `server/lib/disruption/gate4ActionsWatchdogPolicy_v39.ts`: pure policy for exact owner ID, per-trial 20-credit soft budget, 1,000-credit floor, up-to-two-hour trial window and terminal STOP decision. Foreign/unknown ID never grants an inferred provider DELETE. Exposes `hardProviderCreditCap:false`; does not CREATE a provider subscription or Phase6.
- `tests/phase3_gate4_actions_watchdog_policy_v39.test.ts`: 10 scenarios, including known-ID deadline, credit threshold, unknown remote CREATE ID, foreign account subscription, failed balance, duplicate ownership, floor, and overlong signed windows.
- `scripts/v39_gate4_actions_supervisor_rehearsal_v39.ts` and its test: **five** explicit synthetic 5-second in-job WATCH/STOP transitions (20 seconds real runner walltime on CI), zero provider GET/CREATE/DELETE and zero database connections.
- `.github/workflows/phase3-gate4-actions-injob-watch-rehearsal.yml`: PR-triggered source CI and optional manually dispatched **NO_PROVIDER_REHEARSAL_ONLY** from main after released; no secrets, no provider requests, no paid or production operations. It is NOT the live signed actions STOP runner. The workflow's source and tests must pass on the exact commit before promotion.

**Minimum live Gate4 on a free-first basis, proportional to risk rather than perfection:**
1. Publish/release a dedicated **ordinary Alert** receiver with its pre-CREATE scoped quarantine and original-wire durable readback, plus staged V0071/V0072 role checks. This still requires owner approval to change database or publish.
2. Prepare an **owner-approved in-job GitHub Actions watchdog** that runs *before paid CREATE* with the actual account credentials in a protected environment, exact scope and trial signed/reviewed ID custody, strict provider GET and exact-only DELETE. If provider key cannot be scoped to DELETE, keep it only in the `gate4-safety` job, never expose it in callback app/PR/log. Explicitly accept its broader raw-key capability and non-guaranteed runner uptime. No cron-based wakeup and no second infrastructure bill required. THIS ACTUAL LIVE CONNECTOR IS NOT YET RELEASED.
3. Run a tiny no-provider/zero-credit rehearsal against the real published receiver and sidecar with mock POST/faults, then **separately authorize** one short paid trial with soft budget, provider SEND-burst risk, fail-safe operator rescue for unknown ID and exact STOP/settlement. Report scientific quality tolerantly: a small documented mismatch is not automatically experiment failure.

**Not waivable:** positive owned subscription ID before its DELETE, actual route delivery, absence of unintended foreign deletes, ability to stop before continuing exposure, and transparent charged-SEND accounting. **Can be proportional:** not require a new paid external host, not require mathematically zero delivery gaps, and use a documented soft risk cap instead of pretending a hard cap exists. The older two-hour paid successes were on different prepaid/FIDS paths; they demonstrate operational experience and reusable Actions patterns but do not certify the ordinary Alert callback.

**Phase4 dependency decision:** Offline Phase4 dataset preparation and modelling can be planned in parallel from already collected qualified Phase2 data, without falsely marking live Gate4 as complete. Any Phase4 production launch depending on new Alert ingestion remains gated on Gate4 real receiver/STOP evidence. Ask owner only if a specific Phase4 task actually requires a decision.

No automatic merge to protected main, production database write, deployment, paid provider CREATE/DELETE/refill or Phase6 action follows from this document. The GitHub Environment screenshot supplies configuration evidence only; no live provider credentials have been transferred.
