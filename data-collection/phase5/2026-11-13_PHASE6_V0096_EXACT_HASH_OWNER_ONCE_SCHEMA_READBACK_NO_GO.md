# Phase5→6 / Nov 13 2026 PT — V0096 exact Git-SHA one-time owner schema install/readback (NO PAID GO)

**State:** code-only phase6 commissioning preparation; Phase5 scientific FREEZE **HOLD**, Phase6 paid **NO-GO**. User's goal is a **fully autonomous, scientific** 31-parent-day SOURCE→T24/T6/T90→POST run under existing GitHub schedules **without a daily or four-hour Replit Shell loop**; deadline **Friday Nov20** remains conditional, earlier only on real evidence. Existing Replit-attached Neon `neondb` PG16 and V0079–V0093 are authoritative; no duplicate Neon account, C+D queue, Stage14 or V0083 receiver.

## Already completed

- [#635](https://github.com/HKcode22/ReplitTranvr/pull/635) exact hash-pinned V0094 owner schema installer staged and green, NOT production installed.
- [#644](https://github.com/HKcode22/ReplitTranvr/pull/644) exact Git SHA V0095 private SOURCE_QUERY+POST kind owner installer staged and green, NOT production installed.
- [#645](https://github.com/HKcode22/ReplitTranvr/pull/645) strict V0096 signed private index revision schema (1MiB actual SHA, exact predecessor + prior code/calendar/rights, immutable UPDATE, 7-day conservative cap) merged after real PG16 NULL predecessor/SQL duplication fixes, NOT production installed.
- [#646](https://github.com/HKcode22/ReplitTranvr/pull/646) restricted external Ed25519 current+prior private index read-once with no contents in logs merged.
- [draft #647](https://github.com/HKcode22/ReplitTranvr/pull/647) external signed index publisher; actual private SOURCE/PRE/POST registry must preexist and match signed publication and rights; CI current in progress, NO paid GO.

## What the new code does

`scripts/v39_phase6_v0096_owner_schema_readonly_and_once.mjs` imports **existing** V0094 Git SHA hash check and V0095 owner readback, pins unchanged V0096 Git blob **`e588366a306335bbc6137ac4b66d7285fb472296`** and requires exact one `BEGIN`+`COMMIT`, missing/NULL predecessor refusal, true prior insert-chain guard, immutable trigger, empty role/ACL and 7-day conservative max. No edits to merged V0094/95/96 SQL or reinstall of V0079–V0093.

- **Default `inventory`**: under real `neondb_owner`, use READ ONLY catalog checks to distinguish: V0095 missing, V0095 installed/empty but V0096 absent, V0096 installed/inert/empty with original NOLOGIN reader and publisher privileges; checks table owner, SHA/previous/expiry constraint descriptions, insert-chain and UPDATE triggers, no PUBLIC SELECT/UPDATE/DELETE, 0 index rows. Prints only status, constraint names and counts, **never raw/index bytes, flight IDs or database URL**.
- **Separate `install`**: requires user/owner one-time exact consent token, STOP `ADB_AUTO_COLLECT=0` and Phase6 arm=0, no provider key in install process, not running inside GitHub Actions, exact reviewed local main SHA40, reviewed SQL blob SHA40 and a narrow owner temporary filename. Installs V0096 once *only after* independent V0094→V0095 readbacks proved the existing private packet table is empty and uncommissioned; runs SQL in a **single call** with its own transaction. On error or ambiguous COMMIT: HOLD / **no retry** / independent readback. On success: local owner readback still requires a distinct independent verification before private reader/publisher LOGINs.
- Creates **no** new SQL role/login/password, account-wide DB migration, Contents retention grant, source packet, private index revision, paid GET, Alert, PRE/POST, or scheduled child dispatch. This script is not a substitute for legal rights, real external reviewer or actual paid Phase6 GO.

## Tests

`tests/phase6_v0096_owner_schema_readonly_and_once_v39.test.mjs` checks reviewed Git blob, source tamper/change refusal, cold V0095 hold, wrong owner/ACL/trigger/expiry state rejection.

`.github/workflows/phase6-v0096-owner-exact-once-disposable-pg16-no-provider.yml` applies V0094 and V0095 to **throwaway** non-superuser PostgreSQL16, verifies V0096 absent, installs V0096 once, independently inspects zero rows and narrow privileges, then refuses replay. No real `DATABASE_URL`, API key, airfare/credit or production role used.

## Actual remaining release-critical work

1. Real provider **Contents and normalized ML, 31-day storage, object/PITR/backup rules** (#300) independently established using existing grandfathered RapidAPI Ultra evidence. No historical provider email wait required to finish code; no invented legal permission.
2. Real prospective B0062 31-parent-day calendar and adaptive airport draw/provenance, seven UTC REST category and Alert physical charge budgets; authentic future SOURCE/flight native selected T, external signer and registry-last (#642).
3. One-time **owner-reviewed V0094→V0095→V0096 in actual existing Replit Neon**, then narrow least-privilege private LOGIN/secret commissioning, independent readback/backup/retention proof. User should have no **recurring** Shell instructions after that.
4. Restrictive GH hydration of actual signed index current+prior and every exact private SOURCE/LATER_PRE/POST registry into existing 10m SOURCE / 5m PRE/reaper / V0083 POST children, complete GH run history, DB-clock cutoff/no-retry/real on-time PRE/physical POST, misses/selection-bias.
5. **31-day cumulative index capacity** currently max 1024 revisions and entries and expiry max seven days; authentic 31-day Contents permission or nonreconstructive digest-anchored rolling index required before longer run, rather than silently losing old evidence or keeping unauthorized provider rows.
6. Independent Phase5 scientific FREEZE then distinct paid Phase6 Day1 GO with real source/original/PRE/POST evidence; Nov20 remains a target, not a date-triggered release.

**Last actual owner READONLY `2026-11-14T01:53:37Z`**: historical 17 provider originals, >=1,201 normalized sample cap, 36 PRE; **0** B0062 calendar/physical attempts/bindings/queue; **V0094 absent**. 838 blob references with **65 expired lacking deletion marker**, 30 older than 31 days, physical byte presence unknown; no automated delete. Nothing in this code changes those observations.

**No live migration, real database write, provider REST, credit, public Contents exposure or paid Phase6 activation by this PR.**
