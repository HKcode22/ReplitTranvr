# Nov 13 2026 PT owner LIVE 31-day viewer receipt — precise follow-up for Phase 5 freeze / Phase 6

**Authoritative owner-supplied receipt**, Replit Shell, **2026-11-14T00:35:37.152Z** (Friday November 13 **16:35:37 PST**), existing `neondb` connected as `neondb_owner`, executed reviewed main `c9f17dd4894f9d42c1e3b29adbc989174120e961` source `scripts/v39_phase6_owner_31day_dataflow_readonly.mjs --human`. **Verified READ ONLY, provider calls 0, database writes 0**. Owner pasted log to chat. This checkpoint is a faithful transcription of the sanitized metadata, not an independent second connection or provider rights/license proof.

## Recorded actual inventory — sampled past 31 UTC days, not the future 31 parent-day experiment

| Stage | Actual result | Interpretation |
| --- | --- | --- |
| SOURCE ORIGINALS (`clean.fids_query_response`) | **17** sampled/exact recent receipts (November 6: **9**, November 5: **4**, October 31: **1**, October 30: **1**, October 27: **2**) | Historical source-original metadata exists. A receipt is not necessarily an independently certified physical flight |
| NORMALIZED FLIGHTS (`clean.flight_population`) | **at least 1,201**; all **1,201 sample rows November 6** | Sample cap hit; **actual row count and older days UNKNOWN**. Never report exact 1,201 total or claim only Nov 6 exists |
| PRE SNAPSHOTS (`clean.flight_snapshots`) | **36** exact sampled last31d; November 6 **24**, November 5 **12** | May be multiple horizons per flight, not 36 unique operating flight legs; timing and original SHA require separate evidence |
| COLLECTION BATCHES; ALERT SUBSCRIPTIONS | **0 each in their chosen clock/lookback** | Not proof no historical subscription outside lookback or in other tables |
| WEBHOOK RECEIPTS, WEBHOOK ITEMS, WEBHOOK IDENTITIES, SEMANTIC EVENTS | **0 each in their chosen last31d clock** | No observed rows in these specific tables/time window; callbacks could have been received via other tables/paths. Do not assert none globally |
| POST / OUTCOMES, AIRBORNE RAW/CLEAN, FLIGHT PRE/POST VIEW | **0 each in their chosen last31d clock** | No rows in these specific tables/time window, **not** proof that no POST FIDS originals or provider responses were ever obtained |
| SOURCE QUERY RESERVATIONS | **0 sampled last31d**, by its selected event clock | Reservation outcome not established for other periods |
| PRE QUEUE (`clean.phase5_cd_pre_task_v39`) | **0 recent task rows**, no queue states | Consistent with no Phase6 live enrollment; no future claimed task proven |
| B0062 CALENDAR; PAID REST ATTEMPTS; BOUND SOURCE ORIGINALS | **AVAILABLE_METADATA_ONLY_NO_CLOCK**, not zero | Viewer found tables but lacked recognized date columns; **unresolved all-time counts** |
| V0094 PRIVATE PACKET TRANSPORT | **ABSENT_NOT_A_ZERO** | Previously observed code-only staged migration **still not installed** as of owner log |
| PROVIDER BLOB EXPIRY (`clean.provider_content_blob_ref`) | **36 refs persisted within last31d** (October 29: 28; October 19: 7; October 17: 1); **65 expired refs without verified deletion** | **These are different query scopes.** 65 uses all-time `expires_at_utc<=DB clock AND deletion_verified_at_utc IS NULL`, NOT the 31d persisted subset. **No actual object-storage existence test** occurred, so no claim 65 extant raw payloads or legal violation. Possible missing deletion run, stale marker, prior expired refs, storage exception must be audited before deletion |

## What the owner logs do NOT establish

1. 17 original receipt rows ≠ 17 distinct flights; 36 PRE snapshots ≠ 36 independent labels; at least 1,201 population rows ≠ exactly 1,201 rows in the database.
2. `NO_ROWS_IN_SELECTED_LOOKBACK` is **not** proof the underlying table has never had rows. Some tables have other event-clock columns or historical/legacy POST evidence. The source original table may include GETs collected as later/POST; inspect classification separately.
3. The **65** is a **potential source custody/deletion verification issue** needing priority read-only analysis, **not** permission to bypass retention, disable backups or run `deleteProviderBlobAtExpiryV39` without validated source/permission/authoritative object-store state. The expiry processor `server/lib/disruption/providerBlobExpiry_v39.ts` uses `deletion_verified_at_utc IS NULL` for candidates. Its `applyExpiredProviderBlobsV39` deletes through the existing object store and updates a tombstone, so a missing tombstone can reflect non-execution, a failure, or a previous object deletion without recorded verification. No automatic inference permitted.
4. The existing private V0094 transport is absent; prior migrations V0079–V0093 and staged B0062/V0093 restricted logins must **not** be replayed.
5. A 31-day SQL lookback is NOT the signed 31 parent-day future calendar nor licensed 31-day AeroDataBox Content retention. Rights issue [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) and previous historical plan/backup facts remain in force, without repeating the user’s account details or support email.
6. The PG driver's `pg-connection-string` warning is a **future SSL mode semantics warning**, not a failed TLS connection. Review verify-full before driver upgrade; do not disable verification or print DATABASE_URL in logs.

## Engineering continuation in this PR: resolve blind spots without mutation

Incremental revision of **existing** owner-only viewer, not a new database/repo:
- For **every allowed table**, add a bounded **ALL-TIME** `SELECT 1 ... LIMIT 1201` count independently from the 31-day clock-specific count. If no suitable timestamp column exists, show `NO_ROWS_ALL_TIME`, `EXACT_ROWS_ALL_TIME_UNDER_CAP_NO_CLOCK`, or `AT_LEAST_SAMPLE_LIMIT_ALL_TIME_NO_CLOCK`, **never** misleading `AVAILABLE_METADATA_ONLY_NO_CLOCK` or fabricated `0 recent`.
- Break down the **expired no-verified-deletion refs**, up to the same 1,201 cap: `noDeletionMarker`, `deletionMarkedButUnverified`, `referencePersistedMoreThan31DaysAgo`. These are metadata-only; still do **NOT** check physical object existence, request provider, mark deleted or touch the TTL. Distinguish primary deletion marker from verified object deletion and backups/PITR.
- Preserve previous per-day SOURCE→PRE→POST counts and bounded PRE queue-state breakdown. Both machine-readable JSON and owner `--human` output remain available, with no raw provider values or secret leak.
- Offline and disposable PostgreSQL16 CI tests prove all-time/no-clock semantics, zero vs unavailable, and deletion-marker scope. No production migration or paid provider call.
- After CI/review, owner may run the **same one-use Replit Shell pattern pinned to the new merged main**. The private owner output will resolve actual calendar/attempt/binding population and exact 65 ref buckets, then a separate verified object-store existence & expiry-job audit can be considered **without deletion**.

## Critical path through conditional November 20 deadline

**P0 (nonpaid)** production storage retention metadata reconciliation and existing recovery window/expiry job state; V0094 separate reviewed empty schema-only installation and independently restricted readback; source registry publisher with separate external review, secure GH private packet reader; signed 31-day B0062 plan + seven-category actual UTC REST budget/Alert bounds; real C+D T24/T6/T90 + V0083 POST/receiver/STOP throughput; actual physical-label semantics/denominators. Build explicit owner-readable counters throughout, preserve missingness, no reinstallation of earlier versions.

**Release condition:** user has already approved future bounded paid experiments, but **Phase5 scientific FREEZE HOLD / Phase6 paid NO-GO** until concrete source rights, safe retention/backup, independent calendar-budget/flight-source proof and distinct release decision. The planned **Nov20** date is a target, not automatic activation. No legal ruling or paid data call is performed by this checkpoint.

**Crossrefs:** [Phase5 README](README.md), [Nov13 original 31-day user visibility design](2026-11-13_OWNER_31DAY_RECORD_VISIBILITY_PROVIDER_RIGHTS_REUSE_AND_NOV20_PHASE6_GO_PATH.md), [V0094 and full release matrix](2026-11-13_PHASE6_FULL_READINESS_INVENTORY_V0094_OWNER_SCHEMA_ONCE_NO_GO.md), [preexisting blob expiry script](../../server/lib/disruption/providerBlobExpiry_v39.ts), [#300 source rights](https://github.com/HKcode22/ReplitTranvr/issues/300), [#413 Phase5 freeze](https://github.com/HKcode22/ReplitTranvr/issues/413), [#416 automation](https://github.com/HKcode22/ReplitTranvr/issues/416), [#553 private SOURCE producer](https://github.com/HKcode22/ReplitTranvr/issues/553).
