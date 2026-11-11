# Nov 11 Phase 5 — staged V0089 dedicated NOLOGIN SQL guard owner and next owner release

**Confirmed live:** user ran pinned V0087 queue installer on actual Replit `neondb` PostgreSQL16 and got `INERT_REAL_QUEUE_SCHEMA_INSTALLED_NO_WORKERS`; zero tasks, no runtime claims, zero AeroDataBox charges. **Do not re-run that installer.**

**Confirmed repo:** V0088 true queue-to-original-Stage14 same-transaction admission was merged as PR #572 main `b2c5f4d2fa5e64085c27c0c9053dc6453174ca29` (12 applicable CI checks green). The first issued-time-gated FIDS origin/destination Amendment E PRE fields were merged as PR #573 main `1f7ebf6df87075694ee49bccd865c897f7d01a7d` (12 checks green). Both remain **CI-only feature/guard activation**: no live V0088, no live paid worker, no false predictions/retrospective PRE.

## What V0089 does — more code, not a new experiment

`migrations/staged/V0089__phase5_cd_v0088_no_login_function_owner_commission_v39.sql` is the next missing production-privilege piece, reusing the **already-installed Phase5 PRE NOLOGIN group** `phase5_fids_pre_writer_prod_20261107` rather than inventing another PRE login.

It creates a single dedicated `phase5_cd_admission_guard_owner_v39` **NOLOGIN / NOINHERIT / no superuser, role, DB creation, replication or RLS bypass**, and transfers the V0088 queue-fencing function and both scoped snapshot triggers to that role. The guard owner can only SELECT/lock task rows and INSERT/SELECT the new same-transaction admission receipt (plus USAGE on `clean`). A temporary `CREATE` grant on the schema is revoked immediately after the function ownership changes. The pre-existing restricted PRE NOLOGIN group is granted **EXECUTE on the guard only**, never direct INSERT, SELECT or UPDATE on the queue or receipt. Known untrusted runtime/source/prepare roles get no V0088 function/receipt authority. Prior Phase1–5 source, budget, flight, weather, PRE and POST tables and privileges are not revoked or altered.

This **does not** add a paid source, a second writer, a new GH login/password or unreviewed Cloudflare/Replit agent. It is exactly the privilege boundary missing before the already-tested V0088 trigger can safely be considered for live commissioning.

### Disposable CI proof (do not confuse with a live rollout)

`.github/workflows/phase5-v0089-guard-owner-disposable-pg16.yml` provisions an isolated PG16 DB from original B0062+V0079+V0087+V0088, creates the same-named Phase5 PRE NOLOGIN group in CI, applies V0089, and reuses the real V0088 32-flight synthetic source fixture with the CI PRE login inheriting EXECUTE **only through the NOLOGIN group**. The test verifies the guard owner cannot login or act as superuser, the restricted writer cannot directly UPDATE queue or SELECT receipts, then the *existing* Stage14 still writes/reads back on time and Amendment E's two real source-bound category values remain present. No provider API keys or live DB connections.

**Test plans are not success claims until exact PR-head CI reports success.**

## What needs to happen next for live V0088/V0089 and Phase5 closeout

1. **Create a reviewed one-shot owner installer** that verifies actual non-superuser PG16 role creation authority, snapshot trigger compatibility, exact SQL Git blobs, existing V0087 queue empty or independently reconciled, existing Phase5 NOLOGIN PRE group, and no unrelated public grants. Apply both V0088+V0089 atomically where feasible and distinguish pre-commit rollback from ambiguous/post-commit verification HOLD. No secret logging or blind retry. A failure to assign NOLOGIN function ownership is a HOLD, never a reason to leave a privileged definer silently active.
2. Reuse Phase5 Stage30 `P5_V39_PRE_DATABASE_URL` login/SET ROLE membership and commission only explicitly scoped PRE guard EXECUTE. Confirm live `neondb_owner` vs separate CREATEROLE principal as needed; new passwords or GH secrets only if existing identities cannot safely serve the operation. No second paid source worker.
3. GH Actions C+D controller: atomic reviewed packet admission, short rolling workers in exact own-cutoff window, durable claim generations, no requeue after unknown COMMIT, watchdog/STOP/POST, **no human overnight**. Test 50/100/250 tasks in disposable PG16 with realistic connection limits rather than choosing an arbitrary 8-worker concurrency.
4. Amendment E still needs real timely FIDS status/revised departure, original weather/route/history as-of sources, missingness and immutable receipt of feature provenance, and an agreed actual departure delay-minute label. Physical gate-out event is **not** the same as free ADSB.lol wheels-off proxy. Keep **ONE Amendment E**.
5. Confirm source use/retention and 50K project-cycle budget, perform modest independent final freeze and separate paid Phase6 GO. Accept bounded missingness/limited airport coverage rather than perfection loops or retrospective PRE.

**Time constraint from owner:** practical Phase5 checkpoint by **Fri Nov 13**, outside target **Fri Nov 20, 2026**. These are planned goals, not an unconditional guarantee or permission to relax anti-leakage/paid-account protections. Current live Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.

Official PostgreSQL16 sources: [secure SECURITY DEFINER role/EXECUTE management](https://www.postgresql.org/docs/16/sql-createfunction.html), [row trigger transaction behavior](https://www.postgresql.org/docs/16/trigger-definition.html), [row-level locking](https://www.postgresql.org/docs/16/explicit-locking.html).
