# Phase 2G P13 — disposable PostgreSQL continuity audit: false-recovery guard

**2026-10-10 | Experimental test-only source | NO PAID STAGE-1 AUTHORIZATION**

## Scope and proof

GitHub Actions [run #38052530259](https://github.com/HKcode22/ReplitTranvr/actions/runs/38052530259), investigation branch `phase2g-p2g24-github-observer-20261009`, tested the exact new source in [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27). Both jobs **completed successfully**:

- **20 offline Vitest suites, 139/139 passing tests**, 18 separate callback-health scenarios and TypeScript validation.
- **32/32 actual V3.9 route/persistence integration tests on disposable PostgreSQL 16**.
- **Real isolated PostgreSQL SIGKILL and restart**: LOGGED receipt metadata retained, UNLOGGED runtime rows removed. This CI operation never touches Replit's scientific database.
- The new actual-PostgreSQL P13 test: a synthetically admitted HTTP notification has one persisted LOGGED raw-blob reference, one UNLOGGED session and one linked UNLOGGED delivery. After isolated `TRUNCATE` of the UNLOGGED fixtures, the LOGGED blob reference survives; the read-only continuity guard returns `mandatoryCensor=true`, `scientificRunAuthorized=false`, `automaticRestoreAllowed=false`. A synthetic changed database postmaster start also forbids automatic continuation.

## Test correction and genuine detection gap

The first integration attempt [#38052397519](https://github.com/HKcode22/ReplitTranvr/actions/runs/38052397519) failed one new assertion (31/32 SQL tests passed). The original guard checked only `linkedDeliveryBlobRefs === deliveryRows`. When the delivery ledger disappears, **zero linked rows == zero delivery rows**, so that check can overlook orphaned historical LOGGED blob references.

We fixed this specific omission by also requiring `linkedDeliveryBlobRefs === loggedRawBlobRefs`, scoped to the same synthetic session, and added a dedicated offline regression for four surviving logged blobs with zero UNLOGGED deliveries. The complete corrected CI then passed. Do not rewrite the earlier failed run as successful.

## New test-only code

- `experiments/phase2g_rehearsal/postgres_continuity_guard_v39.ts` — read-only, fixture-only snapshot of postmaster UTC, session/delivery/item counts and same-session LOGGED blob to UNLOGGED delivery linkage, plus fail-closed frozen-baseline assessment.
- `tests/phase2g_postgres_continuity_guard_v39.test.ts` — ten fail-closed scenarios covering database lifecycle change, session loss, count mismatch, missing flight items, missing/orphaned raw evidence and absent independent binding/accounting.
- `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts` — added the actual disposable PostgreSQL P13 continuity test, including a fake HTTP source notification.
- `.github/workflows/phase2g-p2g24-offline-fault-injection.yml` — includes the new offline test and runs existing isolated PostgreSQL crash and V3.9 integration job.

## Scientific limitations and next gates

**P13 is NOT solved.** Counting SQL rows, matching LOGGED blob refs or comparing `pg_postmaster_start_time()` can detect certain breaks, but cannot prove identity-by-identity restoration, verify real provider-attempt billing, independently authenticate the frozen owner baseline, reconstruct 120-minute original timestamps / 15-minute bins / physical-flight-v2 identity, or validate a real upstream sender's acknowledgment. A boolean claiming an independent owner signature is verified must not be accepted from untrusted callbacks. The snapshot is intentionally diagnostic, not production release authorization.

These new tests did not use actual Replit deployment, real object-store network, Cloudflare Queue/R2, AerodataBox sender or paid account, live database, or scientific replay. They do not prove the original P2G24 failure was caused by a PostgreSQL crash. The distinct P2G22 260/259 billed/internal gap remains unresolved.

Priorities: (1) get Quinn's platform instance lifecycle report for P2G24, independently; (2) design and prove an immutable, authenticated per-attempt source/owner evidence manifest with exact id-by-id reconciliation, source UTC and approved post-crash science behavior; (3) resolve Queue/SQL partial-commit and 24h Queue vs 168h raw-retention limitations without enabling paid resources; (4) measured published-equivalent POST/storage latency with user-approved $0 isolated staging; (5) genuine wall-clock 120-minute zero-provider rehearsal with fault matrix R0–R11. All remain gated.

**Decision:** Keep paid Stage-1 YSSY `NO-GO`; keep PR #27 draft and isolated. No AeroDataBox API calls/credits, Cloudflare provisioning, Replit publishing, production database mutation or `main` merge.
