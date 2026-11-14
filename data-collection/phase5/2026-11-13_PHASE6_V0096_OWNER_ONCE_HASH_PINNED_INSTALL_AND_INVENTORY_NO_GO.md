# Phase5→6 — Nov 13 2026 PT: V0096 actual-owner exact Git-blob schema inventory and one-time installer (NO GO)

**Current:** code-only, pending disposable PostgreSQL16 CI; NO live Neon database change, no API provider request, no paid Phase6 GO, no role LOGIN, no private flight data, no existing V0079–V0093 reinstall. Target user deadline **November 20 2026** is conditional on authentic science/rights/source/cutoffs. User wants an autonomous GitHub Actions 31-day experiment with **no recurring Replit Shell**.

## Why this work is distinct, not repetition

- [#635](https://github.com/HKcode22/ReplitTranvr/pull/635) separately staged reviewed one-time **V0094** owner installer creates new private PG16 schema/two NOLOGIN reader-publisher roles. Do not reinstall existing V0079–V0093.
- [#644](https://github.com/HKcode22/ReplitTranvr/pull/644) staged **V0095** owner once installer enlarges kinds SOURCE_QUERY_PACKET, POST_PACKET, reuses existing V0094 table and roles, not an app/paid dispatcher.
- [#645](https://github.com/HKcode22/ReplitTranvr/pull/645) staged **V0096** INDEX revision private table SQL merged with proven PG16 SHA256 payload and exact previous-commit hash/rights/calendar enforcement, 7-day conservative cap, immutable UPDATE, no login. Git blob is **`e588366a306335bbc6137ac4b66d7285fb472296`**. It has not been installed in real Neon.
- [#646](https://github.com/HKcode22/ReplitTranvr/pull/646) verified restricted Ed25519 signed current/prior private INDEX reader; [#647](https://github.com/HKcode22/ReplitTranvr/pull/647) verified externally reviewed SOURCE/PRE/POST private registry-bound INDEX publisher; [#643](https://github.com/HKcode22/ReplitTranvr/pull/643) verified full signed Day1–31 bounded index route planner. None authorizes paid REST, signed SOURCE identity or 31-day record licensing.
- [Draft #650](https://github.com/HKcode22/ReplitTranvr/pull/650) is the independent read-only private INDEX + exact full registry bytes to the existing Day1–31 planner bridge, **not** one-time commissioning or child dispatch.

## What this PR adds

`scripts/v39_phase6_v0096_owner_schema_readonly_and_once.mjs`:

- Reuses existing V0094 Git blob SHA routine and `readV0095OwnerInventory`. **Default `inventory` is READ ONLY** against the actual existing `neondb`, `neondb_owner`, PG16 primary. Distinguishes absent V0094/V0095, V0095 clean/empty ready for V0096, V0096 installed empty/inert, or drifted/partially installed/future nonempty tables. Never reads index bytes or original provider Contents.
- Validates original V0095 table empty, both preexisting NOLOGIN roles and only PostgreSQL16 unavoidable owner-bootstrap ADMIN membership; no employee or GH LOGIN has been commissioned yet. For V0096-present, verifies exact SQL constraints (`previous_index_sha256 IS NOT NULL`, bytea SHA and 7d expiry), indexed table owner/PKEY, both immutable UPDATE + exact previous INSERT chain triggers, reader SELECT-only, publisher SELECT+INSERT-only, PUBLIC denied and **0** INDEX rows.
- A **separately authorized install** can send only the exact pinned V0096 Git blob as a single PostgreSQL simple-protocol SQL string with its own `BEGIN; ... COMMIT;` after distinct owner approval phrase, a reviewed exact checkout main SHA, fixed Git blob and protected `/tmp` SQL path, both auto-collect and Phase6 process armed OFF, provider API tokens unset. Schema+ACL only, creates **no new LOGIN or password**. Unknown COMMIT/error **NO RETRY**, separate read-only owner inventory and independent readback mandatory. It cannot self-authorize paid GO.
- Provides synthetic static test for exact Git blob and alteration refusal, plus real **disposable PG16** CI: original V0094→V0095 under non-superuser `neondb_owner`, cold V0096 read-only inventory, call `installV0096OnceOwner` once, separate new-client independent readback of 2 triggers/ACL/table-zero, refuse second installation. No actual production URL or paid provider.

## Actual readiness boundary before November 20

The last real owner Replit-attached Neon PG16 read-only receipt (2026-11-14 01:53:37Z) showed 17 historical FIDS originals, at least 1,201 normalized sampled rows (not exact total), 36 PRE, **0 all-time** B0062 prospective calendar, physical source attempts/original bindings/PRE task queue; V0094 private schema absent. 838 blob references, 65 expired without verified deletion marker, actual bytes unknown: **do not blindly delete**. No new live owner observation obtained here.

**Unresolved P0:** actual account-specific AeroDataBox Contents vs derived work/ML and **31-day original+normalized storage/backup/PITR** grants (#300), genuine B0062 31 parent-day signed calendar and seven UTC REST charge categories/Alert budgets, separate source signer/rights and original physical flight/source, real live V0094→V0095→V0096 once-only install followed by narrow credential commissioning and GH secret scope, and [#650] protected private INDEX→registries in-memory adapter then authenticated actual source/T24/T6/T90/V0083 GH child dispatch with complete run history/replay/fencing and authoritative original-before-webhook-ACK. Full cumulative index byte history may outlive legal TTL or exceed 1024 revisions; a reviewed metadata-only anchor is required if longer retention not permitted. Independent Phase5 scientific FREEZE must PASS before paid Day1 GO.

No everyday operator Replit Shell needed once automatic GH architecture is genuinely integrated; this PR is only the one-time future commissioning safe boundary. **Nov20 is conditional, not an automatic GO.**
