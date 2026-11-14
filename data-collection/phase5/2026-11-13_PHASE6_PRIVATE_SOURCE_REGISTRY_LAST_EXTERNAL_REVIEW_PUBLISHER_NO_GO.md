# Phase5→6 — Nov 13 2026 PT SOURCE registry-last publisher (external Ed25519, staged only)

**Scientific decision:** Phase5 FREEZE **HOLD**, Phase6 paid **NO-GO**, Nov20 is a conditional target. This work is code-only. No SOURCE/POST provider REST call, real flight identity, current query-budget charge, Neon production schema install, user/API secret, LOGIN, GH child dispatch or raw private packet generated.

## Why this is needed for fully autonomous Phase6

User expects existing GitHub Actions to run the full signed 31 parent-day experiment unattended, not a daily Replit shell loop. The earlier root cause was that existing SOURCE, later PRE and V0083 POST children expect legitimate signed packet bytes, but public GitHub correctly forbids those private flight Contents. Existing parent SOURCE variable points to **one** day and there was no real signed SOURCE-day publication / private index rollover. Do not create duplicate PRE queues, migration roles, provider callers or redo earlier phases.

Already merged [PR #638](https://github.com/HKcode22/ReplitTranvr/pull/638) GitHub controller heartbeat, [PR #639](https://github.com/HKcode22/ReplitTranvr/pull/639) V0095 staged private SOURCE_QUERY_PACKET/POST_PACKET kinds, [PR #640](https://github.com/HKcode22/ReplitTranvr/pull/640) restricted SHA/Ed25519 read-once + private `0600` child temp-file cleanup, and [PR #641](https://github.com/HKcode22/ReplitTranvr/pull/641) **one-packet** restricted Ed25519 SOURCE/POST publisher with POST precommitted SOURCE registry and unknown-COMMIT hold. None installed in live Neon.

## New code under review: genuine registry-last ordering

- `server/lib/disruption/phase6PrivateSourceRegistryLastPublisher_v39.mjs` verifies an **independently pinned** external Ed25519 signature over exact SOURCE registry byte SHA, manifest, 31-day calendar SHA, release/rights SHA, reviewed main code, source entries digest, day and shard, reviewer-evidence SHA and bounded reviewedAt/validUntil/retention. It does not create its own signature, self-certify reviewer independence, grant 31-day provider Contents retention, or validate physical labels.
- Registry is the existing **`v39.phase5.signed-per-day-source-batch-readonly.v1`** shape with 1–96 exact **`SOURCE_QUERY_PACKET`** entries; duplicates/rewrites of file paths or query digests are refused.
- One PG16 SERIALIZABLE transaction under separately commissioned narrow `phase6_private_frozen_publisher_v39` effective group, not app owner, checks each named private V0095 source-query packet already **committed** and matches exact path/SHA, day, code/manifest/rights and valid expiry; only then INSERTs the signed `SOURCE_DAY_REGISTRY` as last row and COMMIT. A duplicated registry or unknown COMMIT is a hard **do not replay; independently read back**. No provider call/paid child is dispatched.
- No production SQL, schema migration, new password or PUBLIC GitHub Contents. The on-time SOURCE child still needs its original budget/rights/stop approval, same native DB cutoff, real V0079 original and flight-role selection. The registry is metadata + original private bytes, NOT a GO.

### Tests (strictly synthetic)

- Offline Node20 tests exercise Ed25519 key tampering, independent SHA/calendar/release/rights pins, exact 2-packet ordered registry, conflicting/missing source packets, wrong PG16 role/ACL, expired DB clock, unregistered/already registered day, unknown COMMIT replay block, no paid calls.
- Disposable PostgreSQL16 workflow installs **unchanged V0094 + V0095 in throwaway CI only**, creates synthetic restricted publisher LOGIN with NOINHERIT/SET ROLE, inserts two synthetic source query packets, verifies actual signed registry-last, rejects duplicate and checks committed row counts `SOURCE_QUERY_PACKET=2, SOURCE_DAY_REGISTRY=1`. CI synthetic signer is never treated as real independent reviewer.

## Release-critical next stage

1. The **actual** Replit-attached Neon `neondb` read-only receipt at `2026-11-14T01:53:37Z`: 17 historical FIDS originals, **at least 1,201** population rows (sample cap), 36 PRE snapshots, **0 all-time B0062 calendar/physical attempts/source bindings/PRE queue**, V0094 absent, 838 blob refs of which **65 expired without deletion verification** (30 persisted more than 31 days ago). This has not changed. Don't infer objects still exist or blindly purge.
2. Independently approve current plan-specific AeroDataBox ML/Content retention and backup/PITR terms (issue [#300](https://github.com/HKcode22/ReplitTranvr/issues/300)); the historical RapidAPI grandfathered Ultra key/60k quota is already in the repo. Preserve 31-day allowed **metadata/derived** operator history; retain 31-day raw/normalized provider contents only on real permission.
3. **One-time** owner-reviewed V0094→V0095 private schema installation/independent readback and narrow role LOGIN secrets. Already installed V0079–V0093 must NOT be reinstalled; do not create a duplicate Neon project. Once commissioned, future GH schedule uses restricted secret scopes, not per-day owner shell.
4. Genuine prospective 31 parent-day B0062 calendar/seven actual REST UTC category budget + Alert budget, real original after approved REST GET, independently reviewed source-query bytes→external signer→SOURCE registry-last. Use existing `phase5Phase6AppendOnlyDayShardIndex_v39.ts` and its monotonic revision history to route next due day/shard on **real PG clock**, bounded 4 per lane; do NOT leave static day1 vars for Day31.
5. Wire existing SOURCE/T24/T6/T90/V0083 child dispatchers to the restricted private reader and **always-cleanup** signed packet input, preserving original Stage14/V0081 cutoff/replay and webhook original-before-2xx/POST label checks. Only separate scientific FREEZE PASS and Phase6 paid owner GO may activate actual flight collection.

**No routine Replit Shell command to run this code now.** Replit is appropriate only for a distinctly approved one-time production schema/access check or evidence investigation, not every four-hour flight slot. Green CI validates the code path on synthetic PG16, not actual licensure/flight source/GO.

## Continuity references

[Phase5 README](README.md), [Nov13 full Phase6 readiness matrix](2026-11-13_PHASE6_FULL_READINESS_INVENTORY_V0094_OWNER_SCHEMA_ONCE_NO_GO.md), [autonomous SOURCE/PRE/watchdog/rollover gaps](2026-11-13_1755PST_PHASE6_AUTONOMOUS_GH_CONTROLLER_AUDIT_AND_31DAY_ROLLOVER_P0.md), [V0095 packet kinds](2026-11-13_V0095_PRIVATE_SOURCE_POST_PACKET_COMPATIBILITY_STAGED_ONLY.md), [private SOURCE/POST publisher](2026-11-13_PHASE6_PRIVATE_SOURCE_POST_ATOMIC_PUBLISHER_ONCE_REVIEW_NO_GO.md), [source rights #300](https://github.com/HKcode22/ReplitTranvr/issues/300), [real prospective SOURCE #553](https://github.com/HKcode22/ReplitTranvr/issues/553), [phase5 freeze #413](https://github.com/HKcode22/ReplitTranvr/issues/413).
