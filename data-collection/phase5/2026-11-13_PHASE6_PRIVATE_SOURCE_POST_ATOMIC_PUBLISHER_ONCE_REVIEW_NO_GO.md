# Phase5→6 — 2026-11-13 PT: one-packet private SOURCE/POST publisher (STAGED CODE, NO GO)

**Release decision:** Phase5 scientific **FREEZE HOLD**, Phase6 paid **NO-GO**. No production database is touched; no original response, real flight member or paid AeroDataBox call was created. The Nov20 first-day target is **conditional**, not an automatically triggered launch. New ChatGPT sessions should read this file together with [Phase5 README](README.md), [actual owner SQL receipt](2026-11-13_1635PST_LIVE_OWNER_31DAY_VIEWER_EXACT_ROWS_AND_65_EXPIRED_REF_REVIEW.md), [latest autonomous lanes gap](2026-11-13_1755PST_PHASE6_AUTONOMOUS_GH_CONTROLLER_AUDIT_AND_31DAY_ROLLOVER_P0.md), [V0095 staged schema](2026-11-13_V0095_PRIVATE_SOURCE_POST_PACKET_COMPATIBILITY_STAGED_ONLY.md) and [read-once GH handoff](2026-11-13_PHASE6_PRIVATE_SOURCE_POST_RESTRICTED_READ_ONCE_CI_AND_AUTONOMY_HANDOFF.md).

## Already completed, do not redo

- Existing **Replit-attached PostgreSQL16 `neondb`**, V0079–V0093 installed and bounded C+D source/PRE/POST/reaper/early-draw GH pipelines. Do NOT create a second Neon project or reinstall prior schema/roles. Historical owner live read-only `2026-11-14T01:53:37Z`: 17 source originals, at least 1,201 normalized rows (capped), 36 PRE, zero prospective signed B0062 calendar/physical attempts/source bindings/PRE queue, V0094 still **absent**, 838 blob refs and 65 expired refs lacking deletion verification (30 older than 31d). That is *not* 65 known extant payloads. No cleanup was authorized.
- [#638](https://github.com/HKcode22/ReplitTranvr/pull/638) merged autonomous GitHub-only **nonpaid** source/PRE/lease/draw/index scheduling heartbeat, not 31-day real collected flights.
- [#639](https://github.com/HKcode22/ReplitTranvr/pull/639) merged staged-only V0095 kind/path extension for SOURCE_QUERY_PACKET and POST_PACKET to V0094 restricted table; disposable PG16 tests pass. **Neither V0094 nor V0095 installed in production.**
- [#640](https://github.com/HKcode22/ReplitTranvr/pull/640) merged private SOURCE/POST **restricted reader**, independent Ed25519 signature pre-pin, real PG16 limited login/effective group, 7d conservative retention, non-enumerable byte Buffer and explicitly approved `0600` ephemeral packet materialization with same-process cleanup. **It is not yet wired to real SOURCE/POST paid GH children.**

## What this candidate adds to the private transport

`server/lib/disruption/phase6PrivateSourcePostPublisherOnce_v39.mjs`: one-source-query/POST-packet **publisher** that reuses the same externally pinned cryptographic review as #640, and uses an independent **publisher** PG16 LOGIN (not owner, not app, not read-only reader) with `current_user=phase6_private_frozen_publisher_v39`, `session_user` an approved `phase6_private_publisher_login_...`. Requires actual private storage/source-use review assertions, approved exact code/rights/reviewer evidence, payload SHA, externally signed validUntil, positive conservative at-most-7-day retention and STOP-default no paid child launch.

It uses **one PostgreSQL SERIALIZABLE transaction**, verifies least-privilege `SELECT+INSERT` only, refuses row-path replay, writes **one** externally reviewed `SOURCE_QUERY_PACKET` or `POST_PACKET` row, and returns **redacted SHA/count-only post-COMMIT independent-readback REQUIRED** receipt. A failed or unknown COMMIT is a hard HOLD: **never retry**, never claim row absent, and never publish the bytes in GitHub logs. SOURCE query packets still need a separately reviewed **registry-last SOURCE_DAY_REGISTRY** publish; this function does not generate the registry, choose future flights, call AeroDataBox or dispatch any child. POST packets require a **precommitted and externally pinned SOURCE_DAY_REGISTRY SHA/path**, same day, code/manifest/rights and live expiry. The real existing V0083 POST child must still validate actual original/physical label/no-repeat.

### Explicit science/security caveat

A caller-supplied `separateProviderContentRightsReviewApproved=true` is an *admission signal*, not proof of legal/contract rights; cryptographic validation only proves possession of the approved signing key. Reviewer organizational independence, actual source agreement/ML/31-day raw + normalized Contents retention, backup expiry, real native selected T, signed 31 calendar, actual seven physical UTC REST budgets/Alert cap, and authentic SOURCE/PRE/POST are **still independent release evidence**.

The common external-signature verifier in the #640 reader is being refactored in this PR to distinguish **cryptographic reviewer proof** from separate read vs publisher authorization; do not treat `privateSourcePostReadOnlyApproved` as publishing permission or broaden live role grants.

### Test plan (no real provider/Neon database)

- Offline Node tests: authentic **CI-only synthetic Ed25519** signed data, one SOURCE query and POST publication, precommitted-source proof, duplicate path/refusal, owner/superuser/UPDATE privilege rejection, expired signing, wrong SHA, disabled publication scope, unknown COMMIT no retry, redacted errors and no paid calls.
- Disposable real PostgreSQL16 non-superuser owner: apply V0094→V0095 **only in CI**, create a **CI-only** restricted publisher LOGIN with `SET ROLE` into NOLOGIN publisher, run one synthetic SOURCE query packet, independently insert a synthetic SOURCE_DAY_REGISTRY, then publish a separate signed synthetic POST packet bound to that registry, refuse same-path replay, read count 3 and print only redacted counts. This is **not production schema installation or source evidence**.
- Keep PR draft until exact-head tests + V3.9 full safety PASS. Never change already reviewed V0094/V0095 files or provision new credentials as part of this PR.

## Remaining actual automation critical path (not hidden by green CI)

1. Complete real legal private Contents/ML/retention + PITR/backup proof and one-time owner-reviewed **V0094 then V0095** install/independent readback; separately commission narrow read-only and publisher LOGINS and GH scoped secrets. Owner should not be asked to paste commands on every 4h cycle.
2. Real future SOURCE review and **registry-last** publication, external signer independently authorized, genuine POST request and precommitted SOURCE; do not self-generate authorization, flight IDs or labels.
3. Wire the existing signed GH SOURCE/T6/T90/POST child to the private reader and same-process cleanup, then add **bounded 31-day signed append-only index routing** driven by real PG clock, never a fixed day1 repo variable or retrospective PRE.
4. Prove SOURCE original after paid GET and pre-cutoff, Stage14 native PRE, V0083 POST, raw webhook-before-2xx restart/replay, physical target semantics and honest missingness; provide detailed safe operator logs without privately retained AeroDataBox bytes in public GH.
5. Complete signed B0062 calendar and seven REST UTC category+Alert budget readback; independent Phase5 FREEZE then **separate** conditional paid Phase6 Day1 GO. Nov20 target remains conditional, user paid authorization already recorded. Optional weather/ADSB missingness alone need not block a bounded scientific study.

**No paid call, new production DB row, migration install, role commission, schema/TTL change, public flight file, actual reviewer key, 31-day lawfulness claim or Phase6 GO performed by this candidate.**
