# Phase 5 Stage 16 — live production DB schema and commit-clock support: one-shot read-only evidence

**Purpose:** make the current external Replit/Neon database readiness *observable without guessing* before any production PRE writer or paid source owner is enabled. This is **not** a production migration, source provider request, legal clearance, actual on-time flight PRE, scientific FREEZE, or Phase 6 authorization.

The staged [standalone metadata probe](../../scripts/v39_phase5_native_commit_production_environment_readonly_once.mjs) connects using the local `DATABASE_URL` (never prints it). It opens `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, sets strict local statement/lock timeouts, reads only PostgreSQL built-in setting/current connection/clock metadata and eight `to_regclass` schema-presence booleans, then commits a **read-only** transaction. It does not SELECT provider rows, inspect FIDS original bodies, request AeroDataBox data, modify grants, install V0079/V0080, flip `track_commit_timestamp`, deploy Replit, or print secrets. Errors are deliberately sanitized into one HOLD line.

The report differentiates:

- `nativeCommitTimestampTrackingEnabledNow`: **only** present `track_commit_timestamp` setting. Even `true` is **not** evidence an older T24's XID commit timestamp still exists; PostgreSQL could have enabled tracking later or pruned history.
- `v0079RequiredSchemaPresent`: only basic table visibility for an original/attempt/query/budget and flight snapshot/provenance structure; **not** verified role permissions, rows, legal rights or V0080 committed GitHub run ID behavior.
- `expectedDatabaseMatched`: DB `neondb` only; never infer from a Replit UI development database banner. A different DB name makes this read-only audit a HOLD, not justification to migrate or swap URLs.
- Native tracking off/missing V0079 tables is a **hard engineering blocker to live native Stage15 original-commit proof**. It does not retroactively disprove already captured Phase4 metadata. Under such a result, source→PRE→POST data and future scientific FREEZE must still be held pending an independently reviewed alternative proof design.

## Owner-only one-shot execution

Because the connected Neon plugin currently lists no accessible projects, this metadata check must be executed against the **actual Replit production database** using the owner's existing Replit Shell `DATABASE_URL` (not a guessed Neon project). Use an exact reviewed GitHub `main` commit SHA and GitHub blob SHA guard to fetch the one file into the Node process **without changing the local Replit checkout**. The script should be run once, with no provider keys exposed in output. Do not publish, install migrations, run the Replit AI Agent or change timed source schedules. The owner should paste only the JSON/HOLD output into the review chat.

The GitHub CI checks the script's SQL and output via fake connection; no real production DB or provider credential is passed to CI.

## Further P0

Even if this probe returns PostgreSQL16, the correct schema and native tracking `on`, **Phase 5 scientific FREEZE is still HOLD** until the independently authenticated native source selected T and physical operating leg, account-specific research/ML/Contents and backup retention (issue [#300](https://github.com/HKcode22/ReplitTranvr/issues/300)), actual 31-day full crossover FIDS calendar and seven-category budget, bounded source→durable preflight and full actual outcome chain and independent audit are complete. No supported live source writer can bypass those prerequisites.

Original f.8 and the historical catalog-locked implementation log are left unchanged.
