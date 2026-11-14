# 2026-11-13 PT — Phase6 V0096 signed index CURRENT+PREVIOUS restricted PG16 READ ONCE (NO GO)

**Scientific & paid state:** Phase5 FREEZE HOLD / paid Phase6 NO-GO; **November 20** conditional preparation target. User requests full **GitHub-autonomous** 31 parent-day SOURCE→T24/T6/T90→POST, not per-slot Replit Shell. Existing V0079–V0093 roles/queue/Stage14/V0081/V0083 and existing 5m/10m GH controllers are the source of truth and not to be reinstalled.

## Verified gap and predecessor

- [#643 merged PG-clock dynamic 31-day handoff](https://github.com/HKcode22/ReplitTranvr/pull/643) reuses the existing signed append-only day/shard validator and can select overlapping SOURCE/LATER_PRE/POST across day boundaries at most four shards/lane, reporting due/deferred/missed without private paths in public stdout. But its live observer still reads current+prior signed index files from `frozen/` on the runner.
- The repository [public leak guard](../../.github/workflows/phase5-public-frozen-private-flight-packet-leak-guard.yml) forbids TRACKED private `frozen/*` flight/packet bytes in GitHub. Never disable it or put provider Contents in logs/artifacts.
- [#645 staged V0096](https://github.com/HKcode22/ReplitTranvr/pull/645) extends V0094→V0095 private transport with a **separate** 1MiB hash-verified index revision table. It is **not installed live**; real disposable PG16 tests discovered and fixed PostgreSQL 3-valued-NULL predecessor bypass and a doubled SQL tail, then passed the corrected exact version's focused CI. The full V3.9 suite must still pass before #645 merges.
- As of last actual owner READONLY Replit-attached Neon `neondb` `2026-11-14T01:53:37Z`: 17 historical FIDS originals, ≥1,201 normalized sample cap, 36 PRE, **0** B0062 calendar/physical requests/source bindings/PRE queue, **V0094 absent**, 838 provider refs with 65 expired lacking deletion marker; actual object storage unverified.

## New code in this PR (requires #645 first)

`server/lib/disruption/phase6PrivateSignedIndexReadOnce_v39.mjs`:

- Verifies **pre-pinned independent reviewer Ed25519 signature** over an exact signed JSON review envelope: current revision=1..1024, current and prior index SHA, exact main code SHA, manifest/calendar/release/rights SHA, external reviewer evidence digest, signer public-key DER fingerprint, reviewedAt UTC, validUntil UTC and permitted retention time. This does not create or authenticate organizational independence or provider license by itself.
- Requires a separately commissioned restricted **session login** `phase6_private_reader_login_...` and effective `current_user=phase6_private_frozen_reader_v39`, genuine `neondb` PG16 primary, `REPEATABLE READ READ ONLY`, SELECT/no INSERT/UPDATE/DELETE both index and existing packet tables, actual PostgreSQL clock and unexpired **at-most-7-day conservative** reviewer/bytes window. Does not accept generic owner `DATABASE_URL`.
- Fetches **one current and at most one immediately previous** revision in one bounded query, checks exact actual byte SHA against signed review, committed DB timestamp, own previous pointer, same code/calendar/release/rights, strict index JSON shape and appended byte-order-preserving entries prefix. If previous bytes have expired or are missing, hard HOLD instead of inventing a 31-day provenance chain.
- Returns raw current/previous Buffers as **nonenumerable private fields**, while the public JSON log receipt contains only revision, SHA, entries count, authenticated DB clock, role status, and explicit `phase6PaidGo=false`. No private flight IDs, paths or query payload exposed.
- No new SQL migration, source GET, SSH/auth secret, external signer key, GH child dispatch, app role change, data retention extension, original provider record, PRE/POST physical outcome or Phase6 GO.

### Tests

- Node20 mocked fake PG16 Ed25519 tests cover revision1 genesis/revision2 appended prefix, correct review fingerprint/signature and expiry, changed prior/index bytes, bad role/ACL, missing prior, invalid clock, falsely self-signed review and receipt redaction. Explicitly check **no SQL before cryptographic admission** and read-only rollback.
- Real throwaway **PG16** GitHub CI applies staged V0094→V0095→V0096 only to disposable `neondb`, creates a dummy `NOINHERIT LOGIN` granted **SET ROLE** into existing NOLOGIN private reader, inserts two synthetic current/prior index rows via synthetic owner, signs a CI-only Ed25519 review and verifies exact bytes under restricted reader with **no public Contents**. No production Neon/ADB credentials, paid credits or live data.

## Follow-up actual complete-autonomy work (P0)

1. Merge only after exact-head #645 and this PR's CI pass. One-time V0094→V0095→V0096 actual owner installation/independent readback, then separately commission limited reader/publisher credentials and GH-only secrets after authentic source/provider rights/storage review. Never replay V0079–V0093.
2. Add **genuine external signed index publisher** for prospectively appended current revisions bound to real future 31-day calendar, legally retained provider-derived identity, reviewer public key custody and previous committed SHA. V0096 schema trigger verifies exact previous metadata, not the publisher's independent authority.
3. Integrate this read-only index result and the V0094/95 private signed SOURCE/LATER_PRE/POST packet reader with existing GH signed-index observer: use the existing actual restricted DB-clock index validator, then bounded existing SOURCE/laterPRE/V0083 POST child adapter with private ephemeral hydration and cleanup. **Do not simply enable cron**, bypass physical FIDS quota, or claim GitHub workflow success is a saved provider original.
4. Resolve cumulative 31-day index history (MAX_INDEX=1024 entries/revisions + 1MiB bytes and potentially expired underlying Contents) with account-specific provider rights/ML/backups or an independently reviewed nonreconstructive digest-anchor rollover. 7-day conservative cap is an interim STOP, not evidence this user lacks 31-day rights; never disable expiry to force success.
5. Populate real B0062 31 parent-day release/airport treatment plan and seven REST UTC charge category/Alert spend bounds, physical source/original→native T24/T6/T90 PRE, POST/webhook before 2xx + missingness, independent science FREEZE and separate paid Day1 GO. November 20 conditional.

**Current:** Engineering tests only, no new production row, code merge does not grant paid GO. No recurring owner Shell commands are part of the intended architecture.
