# November 11 — exact V0088 + V0089 **atomic owner installer** and Phase 5 release boundary

**Verified owner state:** user already executed the exact V0087 reviewed installer in Replit. Real team `neondb` PostgreSQL16 has `clean.phase5_cd_pre_task_v39`, **zero rows**, unchanged legacy population-member trigger, no runtime queue/claim privileges and **zero provider charges**. NEVER repeat V0087 installation. Subsequent source and budget plans must reuse the installed V0079/Phase5 tables, original Stage14 PRE writer, existing Phase4 weather/history and free ADSB.lol.

**Verified GitHub:** PR #572 merged the V0088 real-queue Stage14 in-transaction SQL guard and legacy-compatible scoped snapshot protections in disposable PG16 (main SHA `b2c5f4d2fa5e64085c27c0c9053dc6453174ca29`). PR #573 merged the first two actual Amendment E origin/destination categorical FIDS features persisted by Stage14 under true issuance timestamp (SHA `1f7ebf6df87075694ee49bccd865c897f7d01a7d`). PR #574 merged the V0089 NOLOGIN least-privilege function owner with the previously installed PRE NOLOGIN group (SHA `c4690735599fd1d0fc51e02f74bf5aa646b0dadb`). None of these merges alone installs V0088/V0089 in the live database, trains a model or starts paid work.

## What is newly authored here

`scripts/v39_phase5_cd_v0088_v0089_atomic_owner_install_once.mjs` is a **one-shot private owner Replit Shell installer**. It accepts exactly SHA-pinned Git blobs for the two already reviewed SQL migrations:

- `migrations/staged/V0088__phase5_cd_real_v0087_queue_stage14_scoped_admission_v39.sql` — same transaction V0087 queue row lock + durable receipt + scoped enrolled-flight PRE INSERT/UPDATE/DELETE database guards.
- `migrations/staged/V0089__phase5_cd_v0088_no_login_function_owner_commission_v39.sql` — one dedicated `phase5_cd_admission_guard_owner_v39` NOLOGIN role with only row-lock and receipt rights, owned SECURITY DEFINER functions, EXECUTE **only** to the existing `phase5_fids_pre_writer_prod_20261107` NOLOGIN group, no direct queue access to runtime.

**Atomicity is the crucial new feature.** The SQL files each contain a reviewed `BEGIN; ... COMMIT;` wrapper for independent CI testing. The installer checks that each has exactly one matching wrapper with no executable SQL before/after, strips **only** the outer wrapper in memory **after verifying each Git blob SHA**, and executes both unchanged statement bodies inside ONE new `BEGIN SERIALIZABLE READ WRITE` transaction. An exception in V0088 or V0089 before COMMIT rolls back all new table/functions/role/grants rather than leaving a privileged definer on live Neon. No multi-step partial schema grants. A lost COMMIT acknowledgment or post-COMMIT verification failure yields a distinct **DO NOT RETRY** HOLD that requires independent read-only catalog reconciliation.

### Mandatory preflight and postflight

The live installer accepts **only** `neondb_owner` on `neondb` PostgreSQL16 primary with CREATE on `clean` and CREATEROLE authority (explicitly checks); it refuses rerun when V0088 receipt or guard exists or V0089 owner exists, requires V0087 queue rowcount exactly **zero**, the original `trg_flight_snapshots_population_member` enabled as the **only** existing noninternal snapshot trigger, and verifies the existing PRE NOLOGIN group. Its write transaction creates no task rows or worker secrets.

After COMMIT, it reads back exact guard function ownership, NOLOGIN role flags, zero receipt rows, three enabled snapshot triggers including the untouched original, PRE group EXECUTE but **no direct task UPDATE or receipt SELECT**, and no runtime guard EXECUTE. A mismatch is a HOLD, not “success” and not permission to rerun. Output contains only sanitized schema/role/evidence status and the two Git blob SHAs; no connection URL or keys.

A separate GitHub Actions workflow `phase5-v0088-v0089-atomic-owner-install-disposable-pg16.yml` tests the **actual installer**, not just sequential SQL, against disposable local PG16 with synthetic PRE group and runtime roles. It then reuses the original Stage14 V0088/source-bound FIDS/Amendment E test fixture. No provider HTTP, no paid FIDS or Alert, no production DB access.

## Remaining after a successful live installation

V0088/V0089 being live still means a **0-row, 0-worker** control plane. It does not activate experimental Phase6. Required next steps, without repeating Phases1–4:

1. Real restricted PRE login/SET ROLE readback, exact worker credential and necessary GH secret scope. Commission a minimal C+D task **producer** identity and claim/start/ack permissions with no direct payload write or unreviewed paid source. The existing Stage30 PRE login/group should be reused if verified.
2. Production Stage14 code path must be explicitly commissioned to use the installed real V0088 guard **by default for enrolled flights** rather than the earlier CI-only opt-in. No bypass through old writer paths; the DB trigger now supplies defense-in-depth for enrolled flights.
3. GitHub-only rolling queued worker + watchdog/STOP/POST with real sourced packet prep and pre-horizon deadline coverage, bounded 50/100/250-task tests, crash/unknown-COMMIT read-only reconciliation and no overnight human dependency.
4. Amendment E's genuine **issued-time** operational FIDS, weather, historical and route inputs, missingness and feature lineage; source rights/retention. Existing categorical origin/destination are a first proof, **not** adequate predictive performance alone.
5. Resolve independent primary actual departure delay-minute event (gate-out vs runway wheels-off), authentic POST/airborne label tier, baseline/temporal splits, source rights and 50K project budget. Adopt bounded missingness and available airports; don't make perfect sampling a precondition.
6. Final Phase5 scientist/owner freeze and separate Phase6 paid GO, then first monitored paid pilot.

**User planning target:** Friday November 13 or, if safety/credentials require, Friday November 20, 2026. These are targets rather than guaranteed outcomes. **Current Phase5 scientific FREEZE HOLD and Phase6 paid GO NO.** Never confuse code merge, an inert schema installation or synthetic tests with paid live collection.

### No need to repeat the provider quota or queue absence check

At 2026-11-11T13:34:38Z the owner read the account metadata: 60,000 available monthly units limit; 59,968 remaining; 1,830 Alert credits; 2026-12-04 reset. Project's independent cap is 50K/cycle. These figures are historical observations, not evidence of current spend or rights. No further paid airborne service is needed; reuse ADSB.lol only within verified public API/ODbL terms.
