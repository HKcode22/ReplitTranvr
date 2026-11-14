# Phase5→6 — Nov13 2026 PT: restricted private signed INDEX → SOURCE/LATER_PRE/POST REGISTRY in-memory hydration (NO PAID GO)

**User's completion objective:** existing GitHub Actions should run the scientifically valid full 31 parent-day SOURCE→T24/T6/T90 PRE→POST experiment without **daily operator Replit Shell**. Nov20 conditional deadline. This PR is **only the missing READ-ONLY PRIVATE INPUT HANDOFF**; Phase5 scientific FREEZE HOLD / Phase6 paid NO-GO. No real provider original, billable request, SQL production change, original/physical outcome, ADB license, or secret permission created.

## Reuse existing source-of-truth infrastructure

- [#643 merged](https://github.com/HKcode22/ReplitTranvr/pull/643) real PG16-clock immutable current/prior index validator/handoff already selects max 4 due SHA/day/shard candidates per SOURCE/LATER_PRE/POST lane with reliable missed/deferred counts; its public GH operator log omits private filenames. **Do not create another scientific selector or flight queue.**
- [#645 merged](https://github.com/HKcode22/ReplitTranvr/pull/645) V0096 staged private 1MiB signed index revision table, and [#646 merged](https://github.com/HKcode22/ReplitTranvr/pull/646) real restricted Ed25519 current/previous index read-once, both CI green. Existing V0094/95 NOLOGIN private reader/publisher; none installed LIVE.
- [#647 draft](https://github.com/HKcode22/ReplitTranvr/pull/647) restricted externally signed private index one-revision publisher, and [#648 draft](https://github.com/HKcode22/ReplitTranvr/pull/648) V0096 exact one-use owner installer/readback, both code-only. They must be reviewed before any live commissioning.

## Actual additional module

`server/lib/disruption/phase6PrivateSignedIndexRegistryBundleReadOnly_v39.mjs` calls the **existing #646** external Ed25519-reviewed current/prior reader, verifies index parent+sha/cal/rights/main and 31day private-signer pins, then:
- Confirms all current index entries have allowlisted exact SOURCE/LATER_PRE/POST **logical paths**, SHA, shard, day 1..31, unique paths, current SOURCE reference for PRE and POST, UTC cutoff and publication (no backdated source linkage).
- Re-authenticates `session_user=phase6_private_reader_login_*` / `current_user=phase6_private_frozen_reader_v39`, both private table SELECT only/NO INSERT-UPDATE-DELETE, actual `neondb` PG16 READ ONLY, and monotonic PG16 clock with max30sec between index and registry reads. No owner URL, app role or source paid secret.
- Fetches all **exactly indexed** private V0094/V0095 registry rows in bounded chunks ≤48 via parameterized SQL, verifies real row's type, full main/manifest/rights/reviewer SHA and actual payload SHA/size, real committedAt ≤ signed publishedAt ≤ external index reviewer signedAt ≤ actual PG16 clock, no missing item, and conservative maximum 7day/real-unexpired retention. No arbitrary SQL/POST/REST call.
- Holds the bytes **in memory only** (≤256MiB bounded fail-closed) and returns a **nonenumerable** `getFrozen(exactPath)` synchronous callback, private current/prior index Buffers and parsed index objects for the existing `planP6ThirtyOneDaySignedShardHandoffs` validator in the SAME process. The owner JSON receipt only shows revision, index SHA, count/size, DB clock, schema/no-GO status and zero provider/DB writes/GH dispatch. This module **does not itself claim the full scientific per-flight/index semantic audit completed**. That existing validator must still re-run on the actual private frozen bytes before any child.
- Does not change existing `phase5-source-upcoming-queue-main-scheduled-readonly.yml`, V0091 queue, Stage14/V0081 horizon writer or V0083 POST child, no GitHub Actions write permission, no public `frozen/*`, no synthetic provider flights/labels.
- Potential high volume: current index supports 1024 entries; a worst-case 31day full-history index might require >256MiB of registry bytes and may contain expired provider-derived Contents; this must be addressed by real 31day legal rights or a reviewed bounded nonreconstructive digest-anchor architecture, **not** by silently dropping rows or extending TTL.

## Tests, not real source proof

Offline Node20 mocks exact external Ed25519 index+two registries with separate SOURCE vs POST, wrong role, changed bytes, missing/expired private rows, stale PG clock, forged reviewer, forbidden SQL. Real disposable PG16 CI applies unchanged staged V0094→V0095→V0096 on throwaway owner `neondb`, creates CI-only NOINHERIT limited reader, saves **synthetic** source and post packet rows and two signed index revisions, then checks exact private rows can be read without public file/log/packet Contents and with no DB writes or provider calls. Test signer has **no** real reviewer authority. NO LIVE migrations.

## True full Phase6 preparation work still required

1. Exact authentic account-specific AeroDataBox **31day raw+normalized Contents use/ML/backup/PITR retention** evidence or independent lawful derived research metadata design (#300), not quota equality.
2. Real future 31day signed B0062 calendar/airport treatment, seven UTC REST physical charge categories and separate Alert budget, authenticated source-native selected T/flight population.
3. Separate reviewed one-time V0094→V0095→V0096 owner install/independent readback into existing Replit-attached Neon and restricted GH reader/publisher credential commissioning; never reinstall V0079–V0093 or make user run each 4h.
4. Wire this private bundle + existing full signed shard science validator and actual independently reviewed child registry packet/horizon into existing GH SOURCE/T24/T6/T90/V0083 POST child APIs, with authenticated complete GitHub run-history, real DB lock/lease/cutoff/billing and STOP. Test real first prospective source/member/on-time PRE and raw-before-2xx webhook POST/physical label. No blind retry or retrospective PRE.
5. Independent Phase5 scientific FREEZE then separately authorized paid Phase6 Day1 GO, Nov20 conditional.

**Latest owner authentic LIVE READONLY** `2026-11-14T01:53:37Z`: 17 historic FIDS originals, ≥1,201 capped normalized rows, 36 PRE; 0 B0062 calendar/physical source attempts/source binding/PRE tasks, V0094 absent; 838 blob refs with 65 expired lacking deletion marker (actual object presence unverified). This CI-only code does not change any of these facts.
