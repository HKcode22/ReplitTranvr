# P04/P11/P13 — real receiver COMMIT-unknown source-loss fix and original JSON key fail-closed

Review: October 10, 2026 Pacific. Branch `phase2g-p2g24-github-observer-20261009`; GitHub PR #27 draft, no merges/deploys or paid provider calls. User explicitly **prohibited Cloudflare** and has not approved an alternative paid ingress. **YSSY 6+6 remains NO-GO.**

## New confirmed P04/P13 source-destruction failure

In `server/lib/disruption/prepaidProbeRuntime_v39.ts`, a new raw Replit blob is created and read back before PostgreSQL COMMIT. Previous catch/compensation cleanup unconditionally deleted it after any error, **including a lost COMMIT response** when PostgreSQL did successfully commit the source blob ref and scientific rows. This could leave a committed LOGGED metadata pointer with no source bytes and the provider could bill for a notification the application never confirmed.

### Fix

- Set `sourceCommitOutcomeUnknown=true` immediately before the final insert transaction `COMMIT`, reset only after the PostgreSQL client confirms its result.
- When the COMMIT result is uncertain, never run the normal early object-delete compensation; retain the original object for explicit reconciliation. All ordinary failures *before* attempting COMMIT keep existing compensation and fail-closed 5xx behavior.
- Never infer HTTP ACK or scientific completion from PostgreSQL COMMIT success. Source retained without a matching delivery row is an **orphan requiring a privacy-safe bounded retention/deletion process**, not a successful flight or permission to replay paid items. Retained raw source is not an independent origin signature.

### Authentic PostgreSQL integration

Two real disposable PostgreSQL16 cases wrap actual `PoolClient.query`:

1. Execute the REAL `COMMIT` on the real database and then synthetically suppress its successful response: the original metadata + UNLOGGED delivery remain committed, the raw Replit mock blob is **not deleted**, and the next retry deduplicates using the original stored blob.
2. Refuse execution of the REAL `COMMIT` before the server processes it: no committed source metadata/delivery, the compensating failure counter increments, **one original raw object is conservatively retained** and remains an auditable orphan. No invented provider receipt/physical flight.

Both protect against destruction while honestly preserving the unresolved orphan-retention obligation.

## New P04/P11 actual original HTTP JSON structural guard

Production receives raw prepaid JSON via the dedicated 2MiB Express body parser. Before this change, JSON.parse silently discarded earlier conflicting object keys, including escaped key aliases, e.g. `"costCredits"` and `"\\u0063ostCredits"` in one original attempt. V3.9 archives **canonicalized JSON**, not unchanged original HTTP wire bytes, so scientific audit could never recover these overwritten duplicate keys afterward.

- Added `server/lib/disruption/prepaidOriginalJsonStructure_v39.ts`: fatal UTF-8 decode, nested object key duplicate detection, escape-equivalence, 64-level JSON depth bound, strict syntax scanner before normal parser. The function only validates original bytes, not a new archive or a sender signature.
- Dedicated real prepaid `server/routes_v3.ts` body-parser `verify` now calls it, before `req.rawBody` assignment or Express JSON.parse. Wrong-secret pre-JSON guard remains intact.
- Malformed/duplicated source gets 400 via the existing prepaid parser-error boundary, with accounted ingress failure and **no 2xx, no Replit object upload, no science delivery**. Valid unique escaped JSON fields are still accepted.
- Added 10 direct offline guard tests and 3 real disposable PostgreSQL16 HTTP tests. Workflow trigger and suite now include the new real source/helper and its regression test.

## Verified exact builds and limitations

- [Actions #38105514506](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105514506), source `ba212736ca7e1dbe2e63916db754112e01d3a209`: **468/468 offline + 51/51 actual disposable PG16**, true SIGKILL still confirms UNLOGGED crash reset.
- [Actions #38105682204](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105682204), source `5678281fe9ddaeb52b8e1df0cd30d7b0a3298199`: **478/478 offline in 47 suites + 54/54 actual disposable PG16**, true SIGKILL again confirmed UNLOGGED loss. Includes raw JSON validator under actual HTTP, with no reported scanner/TypeScript issues.
- **Latest code result:** [Actions #38105817505](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105817505), source `1e23c6000b17698e0889e4bbf287643711900a2a`: **BOTH jobs SUCCESS**, **478/478 offline in 47 suites + 55/55 actual disposable V3.9 PostgreSQL16**, real SIGKILL/UNLOGGED loss confirmed.

This closes two concrete subfailure routes inside P04/P11/P13. It does NOT provide independent external source custody for webhooks sent when Replit Autoscale is unavailable; actual provider sender attempts/item-credit ledger and 260/259 reconciliation; original wire-byte storage with original first-edge UTC signatures; live 6+6 trusted verifier (real supervisor still `evidence:undefined` and effective three-strike); real deployed Replit receiver SHA and first-stage 10s P99; prospectively authorized full 120m hosted synthetic rehearsal; 168-hour orphan blob deletion guarantee; nor fresh paid authority. Those remain **NO-GO release requirements**, even with green source tests.

**Operations:** provider calls=0, billed credits=0, Cloudflare provision=0, Replit republish=0, production DB writes=0, main merge=0. User approval required for billable/provider/deploy actions.
