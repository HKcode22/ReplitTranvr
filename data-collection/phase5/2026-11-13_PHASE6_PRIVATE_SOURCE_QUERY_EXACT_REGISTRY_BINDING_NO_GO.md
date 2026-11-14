# Phase 6 checkpoint — exact private SOURCE query/registry binding (Nov 13 PST / Nov 14 UTC)

**STOP / no paid Phase6 GO.** The user's existing Replit-attached Neon PostgreSQL16 `neondb` and existing Phase5 V0079–V0093 migrations remain authoritative. Do **not** use separate Neon plugin or recreate database. V0094–V0096 are reviewed/staged schema migrations, not known installed in production. No new owner shell action, provider calls, SQL writes, credentials, or collection activation in this PR.

## Why this addition is required

The merged #650 V0096 current/prior signed-index → authenticated PG16 registry bridge can produce Day 1–31 SOURCE/LATER_PRE/POST due-shard candidates, but **a SOURCE due shard is not an individual provider request**. Existing #640 V0095 restricted reader returns one authenticated SOURCE_QUERY_PACKET. Joining them by a public path alone would be unsafe: a digest/path could be swapped between days or query identities. The existing paid one-query child in `v39_phase5_one_signed_day_source_child_github_owner_v39.ts` must still be admitted by `phase5SignedDaySourceChildRelease_v39.ts`.

## New code

- `server/lib/disruption/phase6PrivateSourceQueryBindingInMemory_v39.mjs`: pure, nonpaid **second-stage cross-binding**. Requires a #650 verified private full registry handoff and #640 authenticated one-packet receipt. Selects one exact signed SOURCE route intent and exact query digest. Verifies in-memory restricted registry SHA, unique per-day entries, reader receipt Ed25519 validation flags, source packet SHA, SOURCE day/shard, real PG16 time not past hard cutoff, one-GET acquisition shape, and private/non-enumerable raw bytes. Returns only SHA/counters in redacted JSON; original bytes and logical paths are separate non-enumerable properties for a later separately admitted child. No SQL/HTTP/GitHub actions/file writes in this function.
- `server/lib/disruption/phase6PrivateSourceChildEphemeralPair_v39.mjs`: **separate, explicitly scoped existing-child adapter** that places the previously verified SOURCE registry and exact query into two private `0600` GitHub job-only frozen paths under the already enforced Git-ignore rule; uses exclusive file create (never overwrites), refuses parent/symlink issues, and must attempt cleanup of **both files** in one `try/finally`, even if the child throws or a later file creation fails. It passes only their existing relative paths and SHA/count summary to an injected separately admitted child. It does not call a provider itself, issue GitHub dispatch or certify the child's paid work.
- `tests/phase6_private_source_ephemeral_existing_child_pair_v39.test.mjs`: disposable temporary-repository cleanup tests for success, child failure, pre-existing file collision, scope/byte mismatch, and missing Git ignore.
- `tests/phase6_private_source_query_binding_inmemory_v39.test.mjs`: entirely synthetic offline fixtures including success, packet swapping, altered bytes, duplicate query, elapsed cutoff, forged handoff and accidental public enumerable payload.
- `.github/workflows/phase6-private-source-query-binding-offline-no-provider.yml`: secrets-empty offline Node20 test. Does not touch the real database or provider.
- This checkpoint is intended for the Phase5 README and issue #416 after tests pass.

## Non-goals, blockers, and next implementation

This code does **not** prove the external signer is independent; the two earlier readers must already have performed signature, PG16 role/ACL and expiry validation. It does not establish AeroDataBox subscription rights or 31-day original-response retention, and cannot turn a signed schema into a real scheduled observation.

**In the adapter's synthetic unit tests, writing ephemeral files to a disposable temporary job directory is expected; this is NOT a production database write or a real original provider observation. The real GH child workflow is still not connected.**

Actual unattended SOURCE requires the reviewed approved prospective B0062 calendar, 7 REST categories + Alert budget, signed external rights, physical provider original and independently frozen Phase5 science, installed V0094/V0095/V0096 schema with limited new GH login secrets, **GitHub child adapter that retrieves exact private pair in the child job**, and independent replay/spend/cutoff tests before any paid test. Existing T−24h/T−6h/T−90m and V0083 POST flow still need their own private-child input adapters.

Most recent real DB evidence (2026-11-14 01:53Z): historical 17 FIDS originals, ≥1201 normalized capped, 36 PRE snapshots; prospective B0062 calendar, source attempts, source bindings, PRE queue each zero; V0094 absent; 838 expiry references, 65 expired lacking verified deletion markers, of which 30 older than 31d. This does not imply the underlying objects still exist. **Do not delete objects based on references alone.**

**Phase5 scientific FREEZE: HOLD. Phase6 paid: NO-GO. Nov 20: conditional readiness goal, not guaranteed start.**

## Next engineering order

1. PR #651 V0096 owner schema once-only tool **merged as code** at `ddde0a35c10e1542ee218c67ce32b73ad8b0b4c9` after all seven exact-head CI checks. Do not execute it solely because CI passed.
2. Review and merge this in-memory one-query binding after its own exact-head checks, then bind the existing SOURCE child to verified private receipts with mandatory cleanup and matching signed registry through the existing Phase5 paid admission, not a new provider implementation.
3. Extend the private-child adapter separately to later-PRE and POST; test errors, restarts, schedule overlap, same-horizon collision, missingness, duplicate physical attempts and unknown commits.
4. Establish independent prospective frozen calendar/source and lawful retention proofs, then separate independent science freeze and paid Day 1 authorization. No daily Replit Shell workflow.
