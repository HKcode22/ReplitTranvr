# 2026-11-14 — P0 genuine expired raw Contents objects in Replit bucket: owner-only reconciliation (NO PHASE6 GO)

## Ground truth from three owner Replit READ ONLY observations

Existing PostgreSQL16 `neondb`, actor `neondb_owner`, original physical DB clock on the first/second readbacks **2026-11-14T11:49:09.541Z** and **2026-11-14T11:55:54.029Z**. Production source of truth is the owner Replit-attached database, **not** the separate Neon plugin or a replacement DB. Owners used pinned GitHub scripts read-only and a bounded `@replit/object-storage` `exists` pass; no download, paid AeroDataBox call, write or migration.

- Existing `clean.provider_content_blob_ref`: **838** reference metadata records; **773** with independently recorded deletion-verification markers.
- **65** expired unverified, none with `deleted_at_utc`; all are `raw_provider_content`, `replit_app_storage`, 168-hour hard TTL. All **65** more than 7 days past the stored expiry, none more than 31 days after expiry. **30** persisted more than 31 days ago; persistence age is different from expiry age.
- EXACT physical object-store presence result: **65 of 65 EXIST in configured Replit dedicated bucket**, 0 absent, 0 inconclusive; no object bodies were downloaded.
- Latest recorded primary deletion `2026-10-22T08:19:00.590Z`. That suggests a missing/failed regular expiry operation but does not prove its cause, or that no separate operator exists.
- No verified backup/replica/PITR expiry, no legal account-specific retained-Contents/ML rights and no independent physical-actual departure truth. Do not claim a legal violation or infer that all copies are deleted after primary-bucket deletion.

## Correct pre-existing primitive, and why the broad CLI is not the right manual fix

The repository already has `collectExpiredProviderBlobsV39` in `server/lib/disruption/providerBlobExpiry_v39.ts` and `deleteProviderBlobAtExpiryV39` in `providerBlobStore_v39.ts`. Its apply path checks genuine expiration and exact blob metadata, calls the dedicated bucket `delete`, verifies `exists()===false`, and only then updates `deleted_at_utc` and `deletion_verified_at_utc` on that ref with a unique run ID. It raises a retention incident on an uncertain deletion/SQL write. Reuse it; do not use an arbitrary SQL tombstone update.

The existing `scripts/v39_phase2_retention_v39.ts --apply` and `scripts/v39_retention_expiry_v39.ts --apply` are intentionally **broad**: they may also delete/expire prepaid sessions, identities and primary content tables. They also print per-record content hashes/IDs. Running either as an ad hoc shortcut for exactly these 65 is unsafe and unneeded.

## Focused candidate owner operator (this PR, STOP-default)

`scripts/v39_phase5_expired_provider_blobs_only_owner_v39.ts` is a **separate, owner-only manual wrapper** around the existing original blob expiry primitives; never a new provider worker, source collector, cron, role or migration.

1. `--dry-run` is the default. It checks exact production `neondb` / `neondb_owner` / PG16, uses the existing `DATABASE_URL`, selects at most 101 expired reference rows and fails closed when more than 100 are due, validates raw-only `replit_app_storage`, exact 168h TTL, opaque object path/UUID, consistent content hash and at least 24h past expiry. It checks **object existence only** in the already approved dedicated bucket, refuses unknown/missing objects, and reports only counts. **No payload downloaded, no SQL writes, no object deletion.**
2. Future `--apply` is unreachable unless a separately reviewed `P5_BLOB_ONLY_CLEANUP_APPROVAL` **exact string**, a live local `git rev-parse HEAD` matching `P5_BLOB_ONLY_CLEANUP_APPROVED_MAIN_SHA`, exact candidate count `P5_BLOB_ONLY_CLEANUP_EXPECTED_COUNT`, provider auto-collect OFF, Phase6 GO not armed and dedicated storage required are all independently present. The owner must explicitly authorize irreversible deletion separately. Unknown or drifting counts STOP.
3. Only after all guards: pass exact reviewed refs to the **existing** `applyExpiredProviderBlobsV39`, which deletes and confirms absence **before** writing each tombstone. On any error, never blindly replay a batch; investigate partial deletion and independently read back both storage and DB. No other retention surfaces are touched. The script reports aggregate counts only, not per-flight provider Contents, objects, hashes or keys.
4. After actual future owner-approved execution, independently confirm `expired_unverified=0`, relevant primary bucket objects absent, no new retention incidents, and record the cleanup scope and time in #300 and #413. This does **not** certify backup/PITR deletion or a future scheduler.

**No deletion or owner installation was carried out by this PR.** Never run an `--apply` merely because these objects have exceeded a technical TTL; complete independent scope/actor review, get explicit owner decision and pin exact merged code. Preserve original Phase5 scientific FREEZE HOLD and Phase6 paid NO-GO.

## Remaining dependency and recurrence prevention

A one-off cleanup does not solve the missing expiry cadence. Audit the actual deployed callback-only Replit environment and workflows for who owns the expiry schedule, permission to the dedicated bucket, previous failed/deferred expiry attempts and incident handling. Then reuse the existing expiry worker in a controlled monitored cadence rather than inventing another provider pipeline. Reconcile every future expiration under both the technical 168h raw limit and account-specific permitted-purpose/Contents rights (#300) and backups. Do not block unrelated offline Phase5 engineering, but **do not approve further paid collection while confirmed overdue objects remain physically available**.
