# Phase5→6 Nov13 / V0095 — private SOURCE query + V0083 POST packet transport compatibility (STAGED ONLY)

**State:** pure engineering code review, disposable PostgreSQL16 tests, **no production install**, no new role, login/secret, provider call, database row, scheduled child, retained flight Content, legal rights finding or Phase6 GO. V0094 production empty schema remains **absent** as of owner's latest read-only `2026-11-14T01:53:37.064Z` receipt. Prior V0079–V0093 are already installed and MUST NOT be replayed. This is a **separate additive V0095 migration**, *not* a modification of the merged/hash-pinned V0094 installer.

## Why this is necessary for genuine autonomous 31 parent-days

The user requires autonomous SOURCE→T24/T6/T90→POST and 31-day rolling cohorts; Replit Shell should be only a rare, separately approved one-time owner operation, never needed per day/flight. Existing GitHub 10m source, 5m PRE, reaper and UTC early-draw Actions already run on schedule but are **STOP-default** without genuine signed packets and independent budgets/GO.

Two existing pieces cannot currently exchange packet contents:
1. [V0094](../../migrations/staged/V0094__phase6_private_frozen_packet_transport_inert_v39.sql) only supports `SOURCE_DAY_REGISTRY`, `LATER_PRE_PACKET`, and `LATER_PRE_DAY_REGISTRY` in `phase6_private.frozen_native_packet_v39`. It cannot store **one SOURCE QUERY packet** or **one V0083 POST packet** under its kind CHECK.
2. Existing [SOURCE child](../../.github/workflows/phase5-one-signed-day-source-child-dispatch.yml), [later PRE child](../../.github/workflows/phase5-one-signed-witnessed-later-pre-main-manual.yml) and [POST child](../../.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) reference `data-collection/phase5/frozen/*.json` as checkout-local files; the [public-GH privacy guard](../../.github/workflows/phase5-public-frozen-private-flight-packet-leak-guard.yml) forbids committing private provider/flight packet bytes. The existing source and later dispatchers pin one day via repo variables; `phase5Phase6AppendOnlyDayShardIndex_v39.ts` already validates and selects due shards from a signed rolling index but **does not materialize private bytes or dispatch**. GitHub cron activation alone cannot close this gap.

## Implemented candidate: V0095 atomic one-use PG16 constraint extension

`migrations/staged/V0095__phase6_private_source_query_post_packet_kind_scope_inert_v39.sql`:

- Uses **only existing V0094 table** and existing two NOLOGIN groups. Adds allowed `kind` values **`SOURCE_QUERY_PACKET`** and **`POST_PACKET`**, preserving `SOURCE_DAY_REGISTRY`, `LATER_PRE_PACKET`, `LATER_PRE_DAY_REGISTRY`. Names future private source-query paths `data-collection/phase5/frozen/sourceq_*.json` and post paths `post_*.json` to avoid name/scope confusion.
- Own `BEGIN`/LOCK timeout/`COMMIT`; preflight exact `neondb`, PG16 primary, `neondb_owner` and unchanged V0094 table/constraints/role shape; **table must be empty**. Refuses replay or unexpectedly installed/partially modified schema. Preserves original immutable-before-UPDATE trigger, SHA of actual bytes, 100–250kB bounds, legal-retention deadline marker, PK uniqueness, restricted SELECT/INSERT and no PUBLIC access. No new password or broadened role; no producer called.
- Postflight confirms only new kind/path constraints, table remains **0 rows**, original narrow ACL and PG16 owner-only bootstrap ADMIN membership protection, zero extra worker memberships.
- **Not a retention solution**: V0094 expiry timestamp is metadata, not deletion; actual AeroDataBox Content/ML legal period, 7-day baseline vs grandfathered Ultra, PITR/object/log retention and safe signed source reviewer must be independently established. It does NOT assert the user's desired 31-day raw/normalized Content rights.

### Tests

- `tests/phase6_v0095_private_source_post_kind_scope_v39.test.mjs` verifies bounded schema-only operation, all original/new kinds, original SHA/ACL structure retained, no role/grant/new app or live provider calls.
- `.github/workflows/phase6-v0095-private-source-post-schema-pg16-no-provider.yml` applies V0094 then V0095 **only to CI disposable PG16** under an actual non-superuser CREATEROLE `neondb_owner`, confirms two new kinds can store hash-checked synthetic bytes inside an explicit `ROLLBACK`, narrow existing group privileges, empty table after tests and second V0095 apply refusal. No real provider/API/database secret and no production credentials.

## Remaining before any production V0095 installation, child hydration, or paid GO

1. **Exact production owner V0094 one-use install** only after independent schema/storage review, then separate readback; V0095 may be applied only in a separate reviewed one-use action to the real **existing** Replit-attached `neondb` after V0094 proven, not before. It must NOT be run automatically on every GH cron tick. Original V0094 SQL Git blob must remain unchanged.
2. **Signed SOURCE/POST review and publisher code** for actual bytes, with independent external signer, real rights and effective retention deadline; never populate private table merely because a SHA matches itself.
3. **Restricted per-child private read/hydration**: GitHub child must receive an independently pinned path, exact verified public-key/registry SHA and short-lived authorized private reader credentials; read source/later/POST *ephemerally*, protect file permissions, avoid stdout/artefacts/private source in git, verify content hash and DB clock/expiry before dispatch. Adapt existing signed SOURCE/T6/T90/POST child runners, never replace their real V0079/V0091/Stage14/V0081/V0083 reservation/write/no-replay checks.
4. **Dynamic 31-day rollover**: reuse existing verified append-only shard index; select actual due day/shard by **real PostgreSQL clock**, signed calendar/manifest, approved budget, stable one-flight identity; route maximum four reviewed children/lane per tick, with no retrospective PRE/backfill, true GH replay/physical UTC REST fencing; progress and honest missingness. Do not hardcode Day1 variable through Day31.
5. **Actual owner-visible telemetry and release**: scheduled no-provider GH controller heartbeat from companion PR #638, eventual exact signed flight/source/POST count/STOP and receiver readback; independent Phase5 FREEZE and *separate* Phase6 paid GO. As of latest owner receipt, B0062 calendar/physical attempts/bindings and PRE queue **0 rows**, V0094 absent. User's Nov20 deadline is conditional on these documented facts, not a clock-based permission to start collecting.

**Decision:** V0095 is an important missing **schema capability** for private source/POST, not proof end-to-end autonomy. A green CI test is not a source publication or legal/paid release. Phase5 scientific FREEZE HOLD / paid Phase6 NO-GO.
