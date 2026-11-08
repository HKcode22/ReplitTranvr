# Phase 5 — V0083 empty production schema and independent REST permissions (proposed)

**November 7 PT / November 8 UTC.** Review PR for this document before treating the source as merged or installed. This checkpoint belongs to Phase 5, not to a new Stage-N scientific gate. Binding source requirements: [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [V0082 seven-category category freeze](2026-11-08_STAGE22_TO_V0082_SIGNED_SEVEN_REST_INPUT_FREEZE_CHECKPOINT.md) and [V0083 request reservation review](2026-11-08_V0083_FIVE_OTHER_REST_RESERVATION_SAFETY_CHECKPOINT.md).

## Why a migration and separate roles are necessary

PR #475 merged the **staged** V0083 SQL but did not execute it in Neon and did not activate any worker. That SQL adds two tables: one immutable **approved future non-SOURCE REST request** and one **actual one-time physical credit reservation**. A future role permitted to approve REST requests must **not** be the same role permitted to reserve provider credits. Otherwise the collector could self-approve a request and its cost.

The proposed owner-only file `scripts/v39_phase5_v0083_inert_other_rest_schema_nologin_owner_once.mjs` reads exactly the staged migration Git blob **`a5e1e9df39ec9b436f0576245f375985a69a3b71`** (not a downloaded unreviewed SQL string). The executable requires one explicit purpose token, a separately reviewed main SHA, actual PostgreSQL >=16 primary database `neondb`, a matching privileged owner, distinct privileged/runtime URL identities, all five earlier NOLOGIN groups, **all real V0079–V0082 prerequisite tables**, and zero existing V0079 source/budget rows. It rejects an existing/partial V0083 installation. No provider HTTP or runtime dispatch exists in this code.

Inside **one SERIALIZABLE PostgreSQL transaction**, the owner executes the exact V0083 DDL, which includes a reviewed replacement of **only the V0082 category immutability trigger body** (FIDS BASE/SPLIT +2 branch remains). The same transaction creates two new NOLOGIN groups:

| Group | Only new privilege | Explicitly denied |
| --- | --- | --- |
| `phase5_other_rest_review_prod_20261108` | INSERT a future immutable `clean.phase5_other_rest_reviewed_call_v39` | physical debit INSERT; reserved function EXECUTE; original flight contents SELECT; UPDATE/DELETE |
| `phase5_other_rest_reserve_prod_20261108` | EXECUTE only `clean.reserve_phase5_other_rest_once_v39(...)` | approval INSERT; any direct debit-table INSERT; source flight-data read/write; role LOGIN |

Neither group gets a password or membership. The original five Phase 5 groups get **no new V0083 access**. For real paid use, separate independently reviewed future GitHub LOGIN setup and actual request/rights/price review are still required. A PostgreSQL superuser/creator remains a trusted administrator; NOLOGIN security does not make it impossible for a trusted administrator to change grants.

### SQL refresher: why the database needs two new tables

The **reviewed-call** table is one row per approved *future request*, identified by `request_sha256`. The **physical-reservation** table is one row per *actual attempted provider request*. Its `request_sha256` column is a foreign key to the reviewed-call table and is also unique. In relational terms the relationship is **one approved request → zero or one physical reservation**, never one reservation → several unreviewed requests. This is not a flattened spreadsheet.

A transaction can insert a physical attempt and increment the matching seven-category UTC budget in one indivisible commit. A trigger uses `txid_current()` to confirm they share the same transaction and verifies the old debit counter. If the increment fails, the attempted reservation row also rolls back. Failure or uncertainty **after** a committed reservation is not automatically refunded.

## Exact test and science boundaries

The proposed isolated PostgreSQL 16 CI workflow boots authentic B0062+V0079+V0080+V0081+V0082 staged SQL into **disposable local PG**, with no provider keys or Phase 6 release. It checks refusal before DDL, injected rollback of tables/**the replaced V0082 trigger body**/roles, successful exact scoped permissions, unchanged zero source/budget/spend rows, preservation of the V0082 BASE/SPLIT +2 branch, and replay refusal. **Tests must pass at the exact PR head along with V3.9 Offline Safety before merge.**

**Deployment order (do not skip):** complete reviewed V0082 production schema/ACL first, then separately audit and consider a one-time V0083 install, later review a real provider-rights and price-bound approved future call, and only subsequently commission independent GitHub worker identities. Never run both migrations through a generic unrestricted startup process, or rerun prior V0079/V0080/V0081 and worker installers.

**Still OPEN:** lawful normalized AeroDataBox Contents/ML retention and backups (#300), actual provider range/pricing and measured source latency, a signed prospective 31-batch-day 26/3/2 calendar/five pairings, four real selected airports/day, independent first-cycle outcome/Amendment D decision, prospective SOURCE→T24/T6/T90 PRE→separate T24 witness→POST, released receiver/Alert SEND and STOP, independent Phase 5 scientific FREEZE, and separate Phase 6 paid GO. No zero-row migration or SHA self-attestation proves these scientific or legal requirements.

**Release status: no production V0083 installation or live GET from this PR; Phase5 FREEZE HOLD; Phase6 paid collection NO-GO.**
