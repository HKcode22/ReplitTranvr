# Phase 5 — Nov 12 actual Neon SOURCE/PREPARE ACL readback and least-privilege feature-compiler correction

**Owner-provided read-only Replit Shell output**, Nov 12, 2026; database `neondb`. The owner's diagnostic ran `BEGIN TRANSACTION READ ONLY` with catalog `has_table_privilege(..., 'SELECT')` and `ROLLBACK`. It read **no flight rows**, performed **zero database writes** and **zero provider API calls**.

| Actual existing Stage28 group role | allowed_query | physical_attempt | V0079 original_binding | fids_query_response original body | flight_population |
|---|---:|---:|---:|---:|---:|
| `phase5_fids_prepare_prod_20261107` | YES | **NO** | **NO** | **NO** | **NO** |
| `phase5_fids_source_prod_20261107` | YES | YES | YES | YES | YES |

The Node `pg` / `pg-connection-string` warning about future `sslmode=require` alias semantics was **nonfatal**, and this one diagnostic succeeded. Connection-string rotation/SSL-mode upgrades are a *separate* environment review, not a reason to reinterpret these privileges.

## Real issue and correction

[PR #595](https://github.com/HKcode22/ReplitTranvr/pull/595) merged the new [read-only original-V0079 feature compiler](../../server/lib/disruption/phase5AmendmentEOriginalFidsReadonlyCompiler_v39.ts). It correctly used the **existing** Stage14 bound-source/member SQL and an original-body JOIN but incorrectly demanded `current_user=phase5_fids_prepare_prod_20261107`. The live role catalog proves that **PREPARE cannot SELECT four tables required by this compiler**. Without correction, it would fail at the first source read despite all synthetic tests being green.

The reviewed small fix is **not** to widen PREPARE permissions, relax the identity checks, access raw Content as `neondb_owner`, or reinstall V0087–V0092. The correct worker identity is the already commissioned **SOURCE** group `phase5_fids_source_prod_20261107`, which already has the exact table privileges.

- The original source read-only compiler now requires `current_user === P5_STAGE28_GROUPS.source`, an existing dedicated SOURCE identity. It still requires Neon PG16 `neondb`, actual server read-only transaction, original source/member SHA and physical identity joins, unexpired source/usage cutoff, and every raw-body checksum, and produces only a draft feature packet.
- A real caller must pass the existing [Stage28 dedicated-role-scoped pool adapter](../../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts) with `group:"source"`, not a PREPARE pool or owner login. That adapter independently validates `session_user`, exclusive SET membership, no admin and no inherited cross-group grants. This change does **not** create or rotate any login, secret, membership or role.
- Tests use a fake connection: SOURCE succeeds, PREPARE and `neondb_owner` are refused **before** any source/member/body SELECT, no `GRANT`/DML/SET ROLE is emitted inside the compiler, and rollback/release happen on errors. Existing actual full safety suite and disposable PostgreSQL CI must pass the exact PR HEAD before merge.

**What the owner result demonstrates:** permissions of the two existing PostgreSQL group roles; no new grants are necessary for a read-only SOURCE-group feature compiler. **What it does NOT demonstrate:** that a dedicated SOURCE login is presently connected and SET to the group during a real worker run, that an unexpired V0079 response and matching operating leg are available, that source Contents can lawfully be retained and used for ML, or that a signed real future-flight PRE/POST pilot was completed.

## Next execution / release boundary

The next genuine source compiler run should use only a separately approved SOURCE-group worker with a future signed eligible flight and a still-unexpired bound original. No provider HTTP in this source-to-feature operation and **no owner-level bulk readback**. Do not run as owner to bypass group scoping, do not copy/paste flight raw Contents into chat/GitHub logs, and do not broaden PREPARE `SELECT` privileges.

The original Stage14 PRE worker keeps its separate `phase5_fids_pre_writer_prod_20261107` group. PREPARE keeps its existing V0091 task-registration role, and V0081 keeps its separate witness group. Existing 4/5/6 horizon candidates remain purely cost scenarios. The genuine one-flight source→V0091→T24/V0081→T6/T90→POST/STOP pilot plus independent contents/legal rights, empirical feature availability, physical label availability and 31-day charge-day caps are still unresolved.

**No database changes, paid operations, Alert actions, source authenticity certification, new frozen signed source, Phase6 paid activation, or V0087–V0092 reinstallation in this correction. Phase5 scientific FREEZE HOLD; Phase6 paid GO NO.**
