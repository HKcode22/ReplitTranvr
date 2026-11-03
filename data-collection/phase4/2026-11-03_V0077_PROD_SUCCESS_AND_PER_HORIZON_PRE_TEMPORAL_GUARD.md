# Phase 4 Gate 5 — V0077 installed and PRE time integrity critical path

**Owner's actual production result, 2026-11-03 Pacific:** on exact GitHub main `184825b8f0a77fa7a84570d8c016c20933d36e13` (V0077 staged migration Git blob `6783468fccf32de571e7ea77671db7370d9d87a4`) ran one Replit schema-only installer. Real output included:
- `V0077_PRIVATE_EMPTY_METADATA_ONLY_INSTALLED` with installer exit 0, 1 new metadata table, 0 original-binding rows, 0 paid provider calls, no provider Content copies, no new runtime role grants or activation;
- Independent privileged+restricted **READ ONLY** diagnostic: `ALREADY_INSTALLED_PRIVATE_READONLY_VERIFIED`, same PG16+ DB, complete V0076 parents, new table + both trigger functions present, worker has no schema `CREATE` or V0077 SELECT/INSERT/UPDATE/DELETE; and
- `V0077_PRODUCTION_INSTALL_AND_PRIVATE_ACL_VERIFIED`. **V0077 is now installed; do not reinstall.**

Owner's November 2 WSSS T−24h, T−6h, T−90m **nine paid source FIDS requests were completed (9/9, 18 REST API units)**. Do NOT rerun a source-only experiment. They did not prove historically timely per-flight PRE/webhook/POST; missing source bodies cannot be reconstructed after expiry.

## Scientific PRE correctness — next necessary engineering safeguard

Source `server/lib/disruption/phase4Gate5ScopedPreWriter_v39.ts` previously staged all three T horizons in one SERIALIZABLE transaction and inserted every qualified candidate without comparing **database server time to individual flight/horizon cutoff**. Freezing the builder before C and finding a source available by C is NOT sufficient: a snapshot written after C cannot be retroactively declared historical PRE. A single transaction also cannot naturally write T−24h, T−6h and T−90m 18–22.5 hours apart.

This work makes the **existing writer, still NOT production-wired**, explicitly **single-horizon**. Each authorized owner must call `P4G5ReviewedPreWriteScopeV39.horizon` for its own original clock. The writer:
1. Requires a separately independently reviewed native `departure.scheduledTime.utc` T, physical-leg identity, licensed source rights, frozen manifest and pre-cutoff builder evidence (existing guards remain). A SHA/CLI string by itself is not a certificate.
2. Checks `SELECT clock_timestamp()` **from the database**, not caller-supplied JavaScript or GitHub/event UTC, against the claimed observation time. Claimed observation time in the future or more than 3 minutes stale fails closed.
3. Selects only candidates of its own authorized horizon from source as-of staging. A not-yet-due flight (more than 3 minutes before C) is explicitly pending; a flight past C is `LATE_NO_BACKFILL`, **never inserted**. Each pending/missed candidate is counted separately, never silently counted as created.
4. Re-reads database time immediately before each due INSERT. Uses the existing SERIALIZABLE, unique flight/horizon/cutoff, original source hash, frozen T/version and idempotent provenance checks.
5. Before COMMIT, rechecks database clock. If any newly inserted row would become durable too near or past its cutoff (2-second guard), **ROLLBACK** all such new inserts; never publish a successful retrospective PRE merely because the INSERT started before C. This conservative guard can produce real missingness; it is measured, not fabricated.
6. Returns exactly its own horizon, expected due, newly persisted vs exact idempotent, not-yet-due, late nonbackfilled, optional source missingness, 0 provider API calls and **scientific Gate5 remains false**.

**Important limitation:** The 3-minute early window is an operational timing guard for the pre-registered prediction cutoff, **not an independent proof that all C-time features were measured**. Report actual PRE creation latency and observation age, not a fictional exact-at-C observation. A recent original source with >3 minutes age remains a coverage issue, not solved by this writer.

**No live authorization:** This is code/test only. Even with V0077 metadata installed, writer and source producer remain unconnected and no rights/selected-T or paid source owner was authorized by installation. Do not grant worker access to V0077 or activate source based on installation alone. Original f.8 and hash-locked Log §1.9 unchanged.

**Remaining scientific work before owner target Thursday Nov 5 Pacific:** true lawful reviewed source and schedule/actual label semantics; GitHub-only prospective source 3×3 owner + V0076/V0077 binding; physical unique operating-flight denominator; actual horizon-by-horizon C-time PRE persisted; independently scoped webhook inside/outside/unresolved, POST actual/estimated/censored; AIRBORNE/stratified missingness/coverage-age and scientific independent audit. No claim of complete PASS from a successful schema install, green CI, or 9/9 historical source-only GETs.
