# Phase5→6 — Nov 13 2026 PT: externally signed V0096 INDEX revision publisher, SOURCE/PRE/POST registry-bound (NO GO)

**State:** engineering code only; Phase5 scientific FREEZE **HOLD**, paid Phase6 **NO-GO**, user's **Friday Nov 20** target conditional. **No routine owner Replit Shell commands** are part of the intended Phase6 runtime. The real production database is the Replit-attached Neon PostgreSQL16 `neondb`; do not create another database or reinstall V0079–V0093.

## Reused work already merged (do NOT redo)

- [#638](https://github.com/HKcode22/ReplitTranvr/pull/638) nonpaid automatic GH controller heartbeat.
- [#639](https://github.com/HKcode22/ReplitTranvr/pull/639) V0095 staged SOURCE/POST private packet kinds; [#640](https://github.com/HKcode22/ReplitTranvr/pull/640) restrictive signed read-once SOURCE/POST and temporary private file cleanup; [#641](https://github.com/HKcode22/ReplitTranvr/pull/641) externally reviewed one-packet SOURCE/POST publisher; [#642](https://github.com/HKcode22/ReplitTranvr/pull/642) genuine external SOURCE registry-last publisher.
- [#643](https://github.com/HKcode22/ReplitTranvr/pull/643) exact source PG16 clock / previous revision SHA / signed day1–31 SOURCE/LATER_PRE/POST **read-only** candidate handoff, redacted operator logs (NOT child dispatch).
- [#644](https://github.com/HKcode22/ReplitTranvr/pull/644) V0095 exact one-time schema install/readback (code only).
- [#645](https://github.com/HKcode22/ReplitTranvr/pull/645) V0096 private 1MiB signed index revision schema with **database-enforced exact previous committed SHA+calendar/rights**, SHA-of-bytes, max 7-day conservative TTL and no new login. Real disposable PG16 tests found/repaired a NULL predecessor bypass and malformed SQL source; all 6 final tests passed and merged.
- [#646](https://github.com/HKcode22/ReplitTranvr/pull/646) restrictive Ed25519 reviewed V0096 **CURRENT+PRIOR** read-once under dedicated PG16 NOLOGIN reader, nonenumerable private Buffers/redacted log, real disposable PG16 all 7 CI checks green and merged.

All V0094/V0095/V0096 **remain NOT INSTALLED** in actual production as of latest owner READONLY; no real Ed25519 source signer/publication has been commissioned.

## New candidate code (publisher only)

`server/lib/disruption/phase6PrivateSignedIndexPublisherOnce_v39.mjs`:
- Takes exact bounded **current index raw bytes** up to 1MiB and a **previously independently pinned Ed25519 external reviewer** envelope including index/previous SHA, complete main code/calendar/manifest/rights/release, reviewer evidence, clock validity and expiry; verifies via the same external-review verifier as #646. It does NOT produce or trust its own signing key, invent unknown flights, infer Contents/ML rights, or enable paid calls.
- Validates that every indexed SOURCE, LATER_PRE or POST registry is a unique exact signed path/day/shard, publication time and external reviewer SHA, with parent SOURCE binding for later lanes; checks actual **previously committed** private V0095 registry row metadata under narrow PG16 `phase6_private_frozen_publisher_v39` effective role. It does NOT query or print original provider bytes to verify this metadata; original table's SHA-of-byte CHECK is the DB invariant. A signed file that was published before its actual underlying registry COMMIT or after cutoff is a hard HOLD.
- One PostgreSQL `SERIALIZABLE` read/write transaction as distinct, restricted publisher LOGIN: verify no app/owner/superuser or UPDATE/DELETE rights, real DB clock and legal TTL, all current private registry metadata, previous signed index row SHA and immutable prefix, no duplicate revision, then **one V0096 INSERT** and COMMIT. Unknown COMMIT: **independent readback ONLY, never retry**. Redacted SHA, revision and count-only receipt explicitly does not attest Phase5 freeze, actual provider rights or Phase6 GO.
- Adds no role, trigger, DB migration, HTTP/REST/Alert, paid request, Stage14/PRE write, GitHub dispatch, public file or final operator secret.

### Tests: strictly synthetic

- Offline Node tests: exact Ed25519/rights/code pins, PG16 restricted INSERT-only role, precommitted SOURCE registry rows, earliest published T vs real COMMIT, revision1 and revision2 prefix, duplicate/conflicting source/clock/role, bad signature, unknown COMMIT hold.
- Real disposable PG16 CI: V0094→V0095→V0096 **only on throwaway non-superuser PostgreSQL16**, synthetic restricted publisher login, synthetic SOURCE registry day1+day2 rows committed first, synthetic externally signed cumulative index revisions 1/2 published after those rows, replay refusal, zero provider calls and no production database writes. This is not evidence genuine future native flight identities, license or scientific freeze.

## Real autonomy left after this publisher

1. **One-time** reviewed V0094→V0095→V0096 live owner install/independent readbacks and only then narrow reader/publisher LOGINS and GH secret scopes. No per-day owner Shell.
2. Genuine signed 31-parent-day B0062 calendar/airport treatment/7 REST UTC categories + separate Alert cap, future native selected-T source member and physical original, external reviewer and exact planned index revisions. Unknown ordinary-airport sites cannot be manufactured ahead of future selection.
3. Connect the authentic index reader from #646 to the existing 10-minute PG-clock observer using restricted private registry hydration in memory; route bounded approved SHA/day/shard packets to existing GH SOURCE/T24/T6/T90/V0083 POST children with original source REST/Alert budget/no-retry/idempotency, on-time PRE and webhook-first raw POST recovery. Green index publisher alone does not dispatch anything.
4. **31-day lawful cumulative-history resolution**: V0096 conservative private index bytes max 7 days and existing validator max **1024** revisions/entries; 31 parent-day cumulative source identities might outlast their permitted period or exceed index capacity. Must prove account-specific AeroDataBox Contents/normalized ML/retention rights and backup/PITR scope (#300), OR design a separately reviewed nonreconstructive metadata hash-anchor/rolling index approach that preserves 31-day scientific evidence without prohibited old provider Contents. Do not infer longer rights from RapidAPI 60k quota.
5. Actual independent Phase5 scientific FREEZE and separate paid Phase6 Day1 GO after authentic SOURCE→PRE/POST and credits. User already authorized bounded paid experiment, but code/CI cannot substitute for upstream rights and real source.

**Real owner last READONLY** at 2026-11-14T01:53:37Z: 17 historical FIDS original rows, >=1,201 capped normalized, 36 PRE; **0** prospective B0062 calendar, physical GET attempts, source-original bindings or V0087 task queue; **V0094 absent**; 838 blob references, 65 expired without any deletion marker and actual underlying object existence unknown. These facts are not changed by CI code merges; do not delete the 65 blindly.

**Current safe status:** NO LIVE DB schema change, credential, real source, retained 31-day license proof, paid call, data write or GH child activation.
