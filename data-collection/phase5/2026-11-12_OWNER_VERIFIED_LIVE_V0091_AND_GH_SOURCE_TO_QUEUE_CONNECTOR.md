# Phase 5 — LIVE V0091 confirmed, signed GitHub source enrollment

**Owner Replit evidence (November 11, 2026 local / November 12 UTC):**
`V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT` on the actual team `neondb` PostgreSQL 16, exact reviewed SQL Git blob `62f1f99883c47cc60ee00c31f21a34bbdb8a5515`. Restricted function owner `phase5_cd_source_registration_owner_v39`. The **existing** `phase5_fids_prepare_prod_20261107` NOLOGIN group may EXECUTE; it cannot directly INSERT the V0087 task queue. Owner's readback reports `queueRows:0`, `taskEnrollments:0`, `flightSnapshotsWritten:0`, no new GitHub secrets, worker schedule, provider calls or paid credits. **Do not run V0091 or V0087–V0090 installers again.** This is user-provided actual Replit output, not a fresh independent DB connection by this repository change.

### PR #579 already merged and default STOP

The original C+D GitHub PRE tick, as-of route feature and Stage14 writer were merged in PR #579, main `d95611d7750c9cb064d74c914561dfe6c1a5089f`; 15 applicable checks passed and 2 expected jobs skipped. It is **not** activated just because V0091 exists. It will take future source-bound V0087 tasks only once an independent release gate, genuine retained original, witness and cutoff are satisfied.

## Actual new code — source registration is a separate nonpaid PREPARE worker

- `server/lib/disruption/phase5CdGithubSourceEnrollGate_v39.ts`: independent fail-closed GitHub-main code SHA, explicit Phase5 evidence canary or Phase6 GO mode, original/rights reviewer SHA, **shared STOP** plus separate V0091 STOP and arm flags, exact frozen roster SHA and target packet SHA. It requires the **already installed** Stage30 PREPARE login `phase5_p30_prepare_login_20261107`. PRE, runtime, raw SOURCE, witness and other credentials are rejected. A Phase5 canary requires its own explicit approval but **does not claim** the full scientific freeze or paid Phase6 GO.
- `server/lib/disruption/phase5CdGithubSourceEnrollV0091_v39.ts`: reuses existing `verifyP5CdFrozenRoster` from the Stage14 C+D controller, rather than introducing a new packet type. Limits first-cycle registration to witnessed T−6h/T−90m; refuses T24 (it still requires Stage17+V0081 transaction/readback) and standalone-later (separate protocol). Checks original Stage14 permit, frozen first-native-T and full signed Stage17 receipt digest. Calls **only** `clean.phase5_cd_register_source_flight_v39` with immutable manifest/query/leg/horizon/native-T/packet SHA/population UUID/original SHA/rights SHA/source staleness. The **already live V0091 SQL** independently checks the real V0079 allowed source, physical attempt, retained provider original, confirmed operating leg and DB prospective cutoff, then writes one V0087 task. No other table writer, no paid GET or Alert.
- `scripts/v39_phase5_cd_github_one_v0091_source_enrollment_v39.ts`: first hashes **all** frozen roster files, verifies the selected packet and Stage17 witness **before opening a DB connection**. Uses the existing Stage28 SET-only PREPARE pool, capped to one login/session and one selected flight/horizon.
- `.github/workflows/phase5-v0091-github-one-signed-source-enrollment.yml`: PR offline CI + **manual one-source GitHub job** disabled until repository variable `P5_CD_GH_ENROLL_ENABLED=1` *and* all independent STOP/rights/source/canary or Phase6 pin secrets agree. It NEVER runs provider GET and is **not scheduled** as an automatic retry because V0091 registration is intentionally immutable and a duplicate attempt is not safe without independent readback.
- `tests/phase5_cd_github_v0091_source_enrollment_offline_v39.test.ts`: accepts proper signed T6 source, refuses forged Stage17 receipt/hash, STOP/cross-role/rights/SSH changes, verifies exact SQL arguments and one-only call, quarantines ambiguous PG ACK without automatic retry. Existing V0091 real PG16 integration tests already prove the actual source V0079→V0087 SQL function with a synthetic operating flight.

### The important still-missing connection

**No real task is enrolled yet.** This new GH caller requires a frozen **future** packet and retained provider FIDS source original. The packet roster is not a cryptographic third-party signature or a legal grant: its SHA is integrity evidence tied to separate reviewer approval. Source paid GET and the source batch must occur only under their own previously approved budget/rights gates. The initial PREPARE enrollment is manual/one-shot: to achieve the user's full **no-human-overnight C+D architecture**, a subsequent Source-child→V0091 one-time trigger or a durable idempotent registration-status audit must be implemented. Do not automatically retry an immutable V0091 call after lost COMMIT ACK.

**Full Phase 5 exit** also requires T24 independent Stage17/V0081 witness orchestration, real source-to-V0087 registration→Stage14 PRE→POST evidence, honest cron missedness/selection bias, genuine additional Amendment E as-of FIDS status/weather/route-history predictors, stable physical departure-delay label versus ADSB.lol wheels-off proxy, source-content rights/retention and independent scientific signoff. Phase6 paid GO remains NO. Aim a Nov 13 progress checkpoint and Nov 20 readiness target if actual evidence supports it; these are planning goals, not guaranteed release or reason to fabricate rows.

**Summary:** V0087–V0091 **LIVE and commissioned inert**, no installations outstanding. First GH source-to-queue caller coded; not yet released or used live. **Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.**


## Exact one-task owner readback (new, READ ONLY)

`scripts/v39_phase5_cd_v0091_exact_registration_owner_readonly_once.ts` is a scoped owner-only query for a particular manifest, canonical flight identity, horizon, selected first native T and frozen packet SHA. It starts `REPEATABLE READ READ ONLY` against `neondb`, requires the exact `neondb_owner` role, and reads at most two existing V0087 task rows. It reports one of:

- `EXACT_TASK_VISIBLE_NO_DUPLICATE_REGISTRATION`: the same packet and native T are already registered; never enroll it again.
- `NO_TASK_VISIBLE_IN_THIS_SNAPSHOT_NOT_PROOF_OF_ABORT`: no task was visible at that instant; a concurrent or uncertain COMMIT could still resolve later, so **this is not permission to automatically retry**.
- A `HOLD` on packet/native-T drift, multiple rows, bad scope or unavailable owner read-only session.

The script does not print a database URL, FIDS original payload, provider keys, or authorization secrets and explicitly reports `automaticRegistrationRetryAuthorizedByAudit:false`. It is **not** an independently provided legal/content-rights approval and cannot certify aircraft physical departure. If needed after a real ambiguous registration, the owner can run it with the exact reviewed identifiers in their private Replit Shell; do **not** run it arbitrarily or reveal secret credentials in CI.


## Source-packet identity cannot be faked between review and registration

The code keeps an in-process `WeakMap` of objects that actually passed the entire exact-roster/Stage17/native-T review. Only that same object with an unchanged permit digest is accepted by `registerOneP5CdGithubSourceFlightV39`; a fabricated type-compatible object or one mutated after review **never reaches SQL**. This is a local code-integrity boundary, not external identity or licence authentication. The owner and SQL clocks remain authoritative. The offline test explicitly rejects a lookalike packet and changed leg after verification with **zero database calls**.
