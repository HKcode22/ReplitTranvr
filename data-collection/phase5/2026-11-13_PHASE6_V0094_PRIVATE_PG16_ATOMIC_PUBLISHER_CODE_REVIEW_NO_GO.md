# Phase 5 → 6: V0094 private PostgreSQL publisher — technical checkpoint (NO LIVE GO)

**2026-11-13 UTC.** Companion to [staged V0094 private read-only transport checkpoint](2026-11-13_PHASE6_PRIVATE_NEON_PG16_FROZEN_SOURCE_LATER_PRE_READ_HYDRATION_V0094_NO_GO.md).

## Existing database: do not confuse connector with production

The actual PostgreSQL16 `neondb` is the **existing Neon database connected to the user's Replit project**. The PostgreSQL URL is already stored in Replit and GitHub Actions secrets. Do **not** discover/create another Neon project or replace an existing working URL. The earlier independent two-login B0062/V0093 readback PASSED, so their logins and V0079–V0093 migrations must **never be reinstalled** merely to make a new CI status green. V0094 is a *new, staged-only* schema and has **not been installed on live production**.

GitHub `HKcode22/ReplitTranvr` is **public**; real AeroDataBox Contents, full flight packets, signer secrets and the private SOURCE registry bytes must never be committed into public GitHub or Actions logs. The `frozen/` ignore/leak guard on main (#633) remains a hard stop.

## New candidate code

- `server/lib/disruption/phase5Phase6Pg16PrivateLaterPrePublisher_v39.ts`: prepares a **single PostgreSQL SERIALIZABLE transaction** for one externally reviewed, prospective 1–96-flight later PRE shard. Reuses the exact #630 Ed25519 public-key review verifier and #629 in-memory day-registry/packet proposal; invents no observed flights and calls no provider.
- Requires separately approved private-only storage scope, `ADB_AUTO_COLLECT=0`, `V39_PHASE6_PROCESS_ARMED=0`, dedicated `phase6_private_publisher_login_...` session and effective `phase6_private_frozen_publisher_v39` role, real PG16 `neondb`, exact SELECT+INSERT privileges and *no* UPDATE/DELETE/superuser/role creation.
- Requires a **pre-existing** private SOURCE day registry row with separately pinned actual SOURCE SHA, reviewer evidence, code, manifest, rights, UTC and unexpired lawful retention. It never manufactures a SOURCE review or inserts an unreviewed SOURCE registry.
- Refuses any previously present target registry/packet. Inserts exact SHA-checked full flight bytes with positional SQL parameters, then the exact signed registry **last**. PostgreSQL makes the whole batch visible only on COMMIT; no old partial packet subset becomes a false valid release.
- Enforces each selected **native** T−6h or T−90m cutoff against actual PostgreSQL time at transaction start **and immediately before COMMIT**, with at least 15 minutes margin. A late flight is censored, not backfilled.
- Uses an explicit separately approved retention date, a conservative maximum of seven days from current database clock, and refuses expiry beyond the already protected source registry. This seven-day ceiling is **not proof** of AeroDataBox rights; shorter actual provider limits override it. Official rights/backup/retention approval is still required.
- If any INSERT or validation fails before COMMIT, it attempts ROLLBACK and HOLDS. If COMMIT outcome is unknown, it **does not retry or run another query on that connection**. Independent readback with independently pinned SHAs is mandatory. Even a reported successful commit still requires independent reviewer/readback before any V0091 task or Stage 14 worker.
- The function emits only a redacted receipt: IDs/hashes/counts and hard-coded false GO status. No user flight, response body, database URL or private registry bytes should be logged.

## CI and evidence scope

`tests/phase5_v0094_private_pg16_publisher_stop_default_v39.test.ts` uses **real Node Ed25519 signatures** with a simulated SQL client. It covers authorized signing/pin, correct insertion ordering and one COMMIT, default STOP, rejected owner role, source review mismatch, duplicate target, wrong signature, expired retention, SQL insert error + rollback, unknown COMMIT quarantine, and late cutoff censor. The new no-secret, no-provider workflow also runs TypeScript checking. The PG16 disposable workflow is separately extended to run the real write/rollback integration tests, and an independent test-fixture count has been scoped to its own paths rather than globally.

The **reader** (#632) has separate disposable real PostgreSQL16 schema/readback integration tests. This PR additionally introduces `tests/phase5_v0094_private_pg16_publisher_real_pg16_v39.test.ts`, executed in the same disposable PostgreSQL16 CI service, to exercise the dedicated role, actual signed restricted INSERT+COMMIT, precommitted SOURCE evidence, duplicate refusal, real ROLLBACK and forbidden UPDATE/DELETE. Its final exact-head CI result must be checked before crediting it as PASS. Real concurrent writers, network-lost unknown COMMIT, quota/backups, lawful retention and production identity still require independent review.

## Dependencies still unresolved

1. Independently approve actual Replit-linked Neon private storage capacity, retention/backup lawfulness and change-control; optionally run a **read-only** Replit inspection, never expose secrets.
2. Independently review and install V0094 once with a new hash-pinned owner procedure and dedicated readback — **not performed** by committing this code.
3. Commission only a separately reviewed narrow **reader and publisher LOGIN** for V0094; existing B0062 and V0093 staging logins are **not** these identities.
4. Prove the **independent SOURCE registry publisher/sign-off** that safely creates the SOURCE row required by this later-PRE transaction.
5. Connect the private reader to actual GitHub SOURCE/later-PRE/POST workers; connect V0091 task admission / Stage14 cutoff/POST/receiver/STOP / daily rollover. No public checkout payloads.
6. Complete genuine 31-day prospective calendar and seven REST physical UTC category budgets plus Alert separate accounting, lawful source rights, scientific FREEZE, then separate paid Phase 6 GO.

**Current safety status: Phase 5 scientific FREEZE HOLD; Phase 6 paid collection NO-GO. No live V0094 install, credential change, provider call or live Neon write is implied by this checkpoint.**
