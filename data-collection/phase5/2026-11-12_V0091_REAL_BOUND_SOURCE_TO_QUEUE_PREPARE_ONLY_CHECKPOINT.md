# Phase 5 — V0091 reuse real FIDS original to enroll existing V0087 queue (STAGED)

**Date:** 2026-11-12 in the owner's Pacific timezone. **This is an actual SQL implementation and disposable PG16 integration, not a Phase6 paid release.**

## Confirmed already installed live; DO NOT reinstall

Owner-submitted Replit JSON verifies V0087 durable flight×horizon queue, V0088 guarded snapshot transaction, V0089 no-login guard owner, V0090 existing queue claim/start/ACK/reap permissions are **LIVE** on team PostgreSQL16 `neondb`. V0090 reported `V0090_EXISTING_PRE_ONLY_QUEUE_FUNCTIONS_COMMISSIONED_NO_PAID`, with 0 tasks, 0 flight rows, and 0 provider calls. The code-only signed GH bounded T6/T90 PRE controller was merged in PR #579 at main `d95611d7750c9cb064d74c914561dfe6c1a5089f`. Its production job remains **STOP default** and has NOT run real PRE.

## New V0091 registration implementation

`migrations/staged/V0091__phase5_cd_source_bound_flight_registration_prepare_only_v39.sql` adds **only a scoped SECURITY DEFINER function**, no second task queue or second source ingestion. The owner is a restricted `phase5_cd_source_registration_owner_v39` NOLOGIN role. **Only** already-existing nonpaid `phase5_fids_prepare_prod_20261107` NOLOGIN group (via `phase5_p30_prepare_login_20261107`) can call it. The PRE group, source group, runtime and provider roles cannot. The function owner has SELECT on existing V0079 original/bound flight tables plus only V0087 INSERT+SELECT+sequence, never queue UPDATE, flight snapshot INSERT/UPDATE or any paid source/API access. A non-superuser PG16 CREATEROLE temporary SET TRUE membership is revoked atomically after function transfer.

The function `clean.phase5_cd_register_source_flight_v39(...)` validates **the real existing**:
- ACTIVE V0079 allowed query and its original physical charged-attempt reservation (same manifest, query digest and actual GitHub run), real bound FIDS original and unexpired body, response SHA and rights-review SHA.
- One matching `flight_population` analytic/canonical flight ID, **confirmed_core** and **confirmed_operating_leg**, requested airport primary FIDS departure; no conditional/composite identities silently promoted to physical operating legs.
- Provider-native first scheduled T **equals the normalized flight's first departure schedule**, and lies inside the original frozen source service window.
- Independent signed packet SHA supplied by the caller, exact canonical flight/horizon and rights/native-T match, source-body expiry, source+member available by that flight's **own true cutoff**, bounded staleness, physical request hard deadline before cutoff, and the database's own prospective clock.
- Existing immutable V0087 INSERT trigger independently enforces duplicate `(flight_instance_id,horizon)` and previously created snapshot refusal. No retroactive PRE tasks; no mutation of earlier tasks.

**Important limitation:** A caller-supplied 64-character SHA or bool is not automatically legally authenticated. A **separate main-only GH PREPARE controller** must independently compare signed roster bytes/source-rights review and invoke V0091 under the existing PREPARE credentials. The SQL independently checks real bound source content/provenance, but does **not** authorize external ML/content-retention rights by itself.

## Test plan

New local disposable `postgres:16` PR workflow recreates original source V0079, live V0087 and V0088/V0089 guard DDL, and creates a synthetic local SAME-NAMED Stage30 PREPARE login and NOLOGIN group. Applies V0091 as a **real non-superuser CREATEROLE owner**, verifies ownership and no lingering SET, then **reuses the existing full Stage14 synthetic original+32 physical flight fixture**: PREPARE direct queue INSERT denied, wrong native T rejected, valid one-flight original→V0087 queue accepted, repeat rejected, existing Stage14 guarded transactional PRE persists as before, no provider/paid or live Neon. New role grants are all isolated to the new V0091 function and owner.

The PR must **pass all exact-head tests** before considering a new one-shot owner installer. **V0091 is not installed live** until owner sees and runs separately reviewed SHA-pinned, nonpaid, one-shot command and returns independent readback.

## Next actual steps after V0091

1. Build GH-only **PREPARE source-bound signed roster admission** using existing Stage30 PREPARE secret (separate from PRE), without provider/Alert or raw output. Hash-verify packet files and check V0079 source via scoped SQL; call only the new V0091 function. Unknown INSERT COMMIT MUST HOLD; no blind retry.
2. Connect reviewed future source cohort→single native T→V0091 registered flight×horizon → bounded GH T6/T90 controller. Extend T24 via existing V0081 separate witness; do not treat T6 alone as sufficient for T24 evidence where original protocol demands witness.
3. Verify missed-cutoff rates and cron jitter; accept honest missingness with actual issuance times. Freeze bounded design/label/source rights and audit one authentic prospective pilot before Phase6 GO; no indefinite provider-mail wait if the limitation is documented.
4. Keep **ONE Amendment E**: genuine physical departure delay minutes at T−6h candidate; T−90m update and T−24h comparator. Free ADSB.lol wheels-off is only a proxy, not actual gate-out. No second paid airborne vendor.

**Phase5 scientific FREEZE HOLD; Phase6 paid GO NO.** Nov 13 and Nov 20 are planning checkpoints, not unconditional authorizations.


## One-shot owner installer now implemented and independently CI-tested

`scripts/v39_phase5_cd_v0091_owner_once.mjs` is a **new, separately pinned one-time Replit owner commissioner**, not an automatic install. It checks actual non-superuser `neondb_owner`, `neondb` PG16 primary, original V0079/V0087 empty task queue, existing Phase5 PREPARE login+SET-only NOLOGIN membership, and absence of any V0091 partial objects. It reads the SQL only from a private temporary location and rechecks its exact Git blob hash. It strips the reviewed standalone outer transaction delimiters and applies SQL within **one SERIALIZABLE transaction**; it verifies owner NOLOGIN, no PUBLIC/SOURCE/PRE EXECUTE, PREPARE EXECUTE-only, no direct PREPARE queue writes, no retained temporary SET role and zero queue records **before and after COMMIT**. If COMMIT acknowledgment is uncertain, it emits HOLD without a blind retry.

The disposable PG16 workflow tests this **actual owner runner as a non-superuser**, checks exact successful status `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT`, verifies duplicate install REFUSED, and then executes the original synthetic FIDS→V0091 PREPARE→V0087→Stage14 pipeline. V0091 derives `source_expires_at_utc` **exclusively from the real previously bound V0079 original**, never from caller-supplied expiry.

**No live V0091 installation is claimed yet.** Owner's next Replit Shell command must use an exact main merge commit and the freshly verified runner+SQL Git blob SHAs. Successful V0087–V0090 operations MUST NOT be repeated.
