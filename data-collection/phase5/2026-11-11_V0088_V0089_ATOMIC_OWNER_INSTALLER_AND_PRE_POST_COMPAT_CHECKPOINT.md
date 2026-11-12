# Phase 5 — Atomic V0088 + V0089 owner commissioning (after V0087 LIVE)

**2026-11-11 engineering checkpoint.** Owner already ran the exact pinned V0087 SQL installer on private team Replit and obtained `INERT_REAL_QUEUE_SCHEMA_INSTALLED_NO_WORKERS`: 0 tasks, unchanged original population-member trigger, no worker grant, no paid AeroDataBox action. **Never reinstall V0087.** This checkpoint is for the *new* V0088/V0089 queue-admission and role boundary, not a second queue discovery exercise.

## Completed and ongoing in source of truth

- PR #571: real durable canonical flight×horizon queue V0087, typed client and 12/12 disposable CI checks, **already installed live INERT**.
- PR #572: actual V0087 queue Stage14 SQL fence/receipt and compatibility tests, merged.
- PR #573: first issued-time-safe origin/destination FIDS fields written through existing Stage14 into PRE `features_json` in disposable PG16, merged; actual live Stage14 default still `features:[]`.
- PR #574: staged V0089 dedicated NOLOGIN function owner, reusing existing Phase5 restricted PRE group, merged.
- PR #576: **PG16 non-superuser** adjustment to V0089 (CREATEROLE only gives implicit SET FALSE), superuser-independent proof passed, merged `cf97e19479e14455b5069f996cf4680e32e030a5`.
- This increment: one owner-only atomic installer for existing V0087 + staged V0088/V0089 and explicit rollback injection tests.

## Why the two migrations must be inseparable

V0088 introduces a **shared `clean.flight_snapshots` trigger** and its `SECURITY DEFINER` function. If V0088 commits independently and V0089 fails, the installed privileged function owner/default privileges could be unsafe. The new installer combines the **exact reviewed, Git blob-hash-verified** V0088 and V0089 SQL inside **one PostgreSQL SERIALIZABLE transaction**. It strips their standalone outer `BEGIN; COMMIT;` wrappers without editing SQL logic. It checks before any DDL:

- Exact team `neondb` PostgreSQL16 primary; `neondb_owner` non-superuser with CREATEROLE, schema and V0087 task table ownership, CREATE on clean schema and TRIGGER on original snapshot table.
- V0087 exists with **zero tasks**, original population-member trigger is still enabled, V0088 admission receipt/function/triggers do **not** exist, V0089 guard role absent.
- Existing Phase5 PRE NOLOGIN group `phase5_fids_pre_writer_prod_20261107` remains restricted (not a new source/paid credential).
- Existing`flight_snapshots` trigger list is captured; an advisory transaction lock excludes concurrent schema commissioning.

Within the same transaction, the real V0088 receipt and PRE guard are created; V0089 creates an independent NOLOGIN guard function owner, gives the existing PRE group only controlled function EXECUTE, removes default public and untrusted runtime grants, and **removes temporary SET ROLE privilege** after transfer. A failure *after V0088 but before V0089* rolls back BOTH: CI explicitly injects this failure and checks neither trigger nor receipt table nor role persists.

Before and after COMMIT, exact table/guard owner/trigger/canonical queue/role ACL assertions must pass. **If COMMIT acknowledgment is uncertain, the installer quarantines and refuses a blind rerun.** A second invocation must HOLD without changes. The installer makes no PRE, POST, provider, GitHub login/secret, or worker changes. Creating an inert guard does not mean the Stage14 production feature is activated; Stage14 V0088 integration is still gated to disposable PG16 until a separate runtime worker/role authorizer is reviewed.

## Important PRE versus POST compatibility correction

The V0088 trigger is explicitly **PRE-only**. An enrolled flight with a non-PRE snapshot observation must not be blocked from storing or updating POST-like facts through the shared table. However, it must not be possible to UPDATE a non-PRE row into `PRE_DEPARTURE`, or to alter/delete an enrolled PRE row, without queue admission. The V0088 guard code now skips insert-admission for non-PRE rows and restricts immutability to existing/new enrolled PRE state. A real disposable PG16 regression writes a non-PRE row, edits it, rejects a prohibited conversion to PRE and deletes it, while preserving the existing PRE no-bypass tests. This does not alter any existing phase1–5 table definitions.

## Release boundary

This source-controlled installer is **not yet a production deployment**; merge only if actual PG16 non-superuser, injected rollback, same-tx owner transfer, ACL and full repository CI checks pass. After merge, owner can run a single **pin+blob-hash-verified private Replit Shell** script to apply only this new guard to the real V0087 queue. Do not give users an unverified blob SHA or claim success without the owner's sanitized JSON readback.

**Then** the critical remaining Phase5 work is a separate, scoped GH worker login authorization/credential check, controller + watchdog + source admission/STOP + POST readback, actual Amendment E licensed weather/status/history fields and physical delay-minute label acceptance, bounded missingness and independent Phase5 FREEZE. Project 50K/cycle ceiling and last observed 60K provider entitlement are separate; **no additional paid calls** for these schema steps. Accept limitations, not retrospective PRE backfill or privileges that bypass source/clock fencing.

**Owner deadline preference:** Nov 13 checkpoint; Nov 20 outside target for readiness and prompt Phase6 start *only when independently approved*. **Phase5 scientific FREEZE HOLD / Phase6 paid GO NO** until verified.


### Additional unique-key collision safety

The shared `clean.flight_snapshots` table has a uniqueness key `(flight_instance_id,horizon,prediction_cutoff_utc)`, **not** prediction_state. Merely letting POST/non-PRE rows bypass the new PRE trigger could allow another writer to occupy the *identical reserved PRE key*, preventing a real enrolled PRE even though it had not faked a PRE state. The V0088 trigger now allows non-PRE facts **only when they do not occupy a queued flight/horizon's exact PRE cutoff key**; INSERT or UPDATE of non-PRE into that reserved identity is refused. A disposable PG16 test now covers legitimate distinct-cutoff POST INSERT/UPDATE/DELETE, a direct key-collision POST INSERT, a non-PRE UPDATE into the reserved key, and a non-PRE-to-PRE promotion. This preserves bona fide POST custody without letting existing writers monopolize a scientifically frozen PRE slot. Existing old PRE/POST data is never deleted.
