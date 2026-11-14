# Phase5 retention reader — 2026-11-14 exact column ACL correction and one-use owner commissioner

## Why this work, and why it does not repeat prior phases

Owner's authentic Replit `neondb` read-only role catalogue returned `suitable_role_candidates=[]`, `NO_MATCHING_ROLE_FOUND`, `database_writes=0`. That first catalogue queried **table-level** SELECT access, so it did **not** exhaustively rule out *column-only* readers. Do NOT claim the role did not exist on the basis of a full-table query. A second exact-column catalogue check in the new commissioner is required **before installing** any new role; it fails if an already suitable restricted column-only role is found for independent reuse review.

The owner has already completed authorized cleanup of **65/65** expired raw Content objects in the dedicated Replit bucket; independent fresh readback confirmed 65 absent, 0 present, overdue refs 0, verified-deletion DB markers 838. Run `provider-blob-expiry-12e52e0f-80fc-4e7c-9b16-a5a13e1750a9`. **Never rerun the irreversible November14-only --apply** and never recreate the existing `neondb`/V0079–V0094 schemas, login groups or prior migrations.

## A crucial least-privilege improvement to #673

The first staged metadata monitor SQL read only five columns, but the disposable fixture granted its test LOGIN **table-wide SELECT**. That would let a future production role fetch `object_name`, `source_record_id`, `blob_ref_id`, `content_sha256`, etc. The current fix enforces **PostgreSQL column-level SELECT only** (not a merely restricted query):

`expires_at_utc`, `deletion_verified_at_utc`, `content_class`, `storage_kind`, `retention_hours`.

The monitor independently checks against the real B0062 16-column table: it must see precisely those five privileges, reject SELECT on all eleven other columns, reject full-table SELECT, INSERT, UPDATE, DELETE, TRUNCATE, schema/db CREATE, role membership, rolcanlogin=false, INHERIT, superuser, bypass RLS, CREATEROLE/CREATEDB, wrong PG16 `neondb` identity, and wrong session-user/actor. The aggregate uses only the five allowed columns, no object-store SDK, no raw Contents, no plaintext in GitHub. The original monitoring workflow is still **disabled** until a separate manual opt-in; it never performs deletion or paid provider HTTP.

## New one-use owner-commissioning source candidate

`scripts/v39_phase5_retention_five_column_reader_owner_once_v39.mjs` runs from an exact SHA-pinned *temporary detached main worktree* in the original Replit environment. Its **--dry-run** only checks owner identity, real existing PG16 table schema, exact sixteen reference columns and whether a five-column-only role already exists; no SQL writes or GitHub secret changes.

Only an entirely separate **--install** path can commission the new fixed role `phase5_retention_reader_prod20261114` with `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, generated cryptographic random password, `GRANT CONNECT`, `GRANT USAGE ON SCHEMA clean`, and **only five column-specific SELECT grants**. It requires exact SHA currently equal to remote main AND a dedicated explicit owner approval string, real owner `DATABASE_URL`, paid/off switch zero, GitHub Actions refused, no TLS disable, no existing matching role. This role does not update, delete or recreate any prior schema.

Commissioner sets `P5_RETENTION_READONLY_MONITOR_ENABLED=false` **before** role creation; confirms the independently authenticated new LOGIN's exact five-column privileges and real metadata-only SELECT in a read-only transaction; then passes the credential via **stdin** to `gh secret set P5_RETENTION_READER_DATABASE_URL -R HKcode22/ReplitTranvr`, sets exact expected role variable and ensures monitoring stays FALSE. It must never print DB URL, password, bucket name, object paths/hashes or flight contents. Any error after the role CREATE is a **partial-commission HOLD**; do not automatically repeat role creation or rotate the credential blindly. Independently inspect production catalog and GH settings to reconcile.

The GitHub PR workflow tests this on **disposable PG16** only, including a role with precisely five column grants, read-only metadata query, PostgreSQL denial of object_name/content_sha256/source_record_id/SELECT *, UPDATE and any unexpected extra full-table or column privileges; pure owner admission and 16-column schema checker also tested. No live role creation or GH secret has been attempted.

## Owner path and limits

After exact-head full CI success and merge, the next authorized production task is a **one-time owner Shell**: exact current Git SHA, hash-verified detached worktree, **--dry-run first**, examine existing five-column reader discovery, and **only then** separately owner-authorized `--install` if no role exists; independent login and GH secret connection readback; GH monitoring variable stays false. Commissioning a reader is **not** approving recurring destructive deletion or paid Phase6. A first real nonpaid GitHub manual monitoring run and separately authorized hourly enablement must be independently observed before monitoring is called operational.

What is still open: actual recurring **deletion** owner and its lease/fence/unknown ACK handling, backup/PITR scope, AeroDataBox normalized ML Contents rights, genuine V0095/day-epoch signed SOURCE→PRE→POST with actual departure gate-out, and scientific Phase5 FREEZE HOLD / Phase6 paid NO-GO. Do not delay independent offline scientific engineering waiting on provider email, but do not silently assume licensed ML use.
