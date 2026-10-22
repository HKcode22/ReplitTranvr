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

1. **Choose and prepare an actually separate STOP runtime.** Preferred trust separation: a protected, pinned-commit GitHub Actions safety job or separately hosted, continuously supervised worker **outside the Replit controller's process**. A second Replit app alone separates application lifecycles but may share the same platform outage domain. The workspace and this chat cannot create an independently trusted account or attest service liveness automatically. The connected Replit app name search for `gate4` found no matching app on October 22; this is NOT proof that a safety service under a different name is absent.
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
