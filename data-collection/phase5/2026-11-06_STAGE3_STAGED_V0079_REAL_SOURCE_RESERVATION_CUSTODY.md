# Phase 5 Stage 3 — staged V0079 source reservation and original binding

**Status:** code and disposable-PG16 admission tests only. **NOT installed in Replit, no grants, no production rows, no provider calls, no Phase6 GO.** Stage3 is under review against [Phase5 source owner issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

## Why V0079 is necessary rather than reusing the Gate5 cohort ledger

Phase4 Gate5 [V0076](../../migrations/staged/V0076__phase4_gate5_logged_physical_fids_attempt_owner_v39.sql) ties an owner to one `(manifest,horizon)` and a six-hour release window; the 31-day Phase5 experiment can have four moving daily airport slots with separate T24/T6/T90 source queries and local API splits. Copying/reinterpreting the Gate5 tables would corrupt its original scientific evidence and could double-reserve credits.

The [Stage2 typed bridge](../../server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts) already refuses the ordinary application REST ledger and implicit FIDS persistence, but its callback ports remain mocked until a real, independently reviewed Phase5 database-backed implementation exists.

## Proposed V0079 staged PostgreSQL16 database controls

`migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql` is **forward-only** and isolated from Phase4 tables. Nothing auto-installs it.

- `clean.phase5_fids_cycle_budget_v39` freezes a full study REST ceiling ≤50,000, independently reserved other categories, protected floor, and cumulative irreversible FIDS units; no source request can exceed remaining project headroom.
- `clean.phase5_fids_day_budget_v39` keeps a day-level REST ceiling ≤1,900 inclusive of other source categories and physical FIDS GET reservations, plus frozen config/frame/calendar and four-airport selection hash.
- `clean.phase5_fids_allowed_query_v39` requires reviewed exact query/role: day, slot, horizon, airport, service window and local range, approved rights/provider contract SHA, actual GitHub run ID, planned/hard latest GET clocks, 2-unit costing, **one physical attempt**, PRE cutoff and an explicit `ACTIVE` state (default PREPARED). Splits need separate query IDs, budget slots, original receipts and unit reservations.
- `clean.reserve_phase5_fids_physical_get_v39()` is `SECURITY DEFINER` but **REVOKED FROM PUBLIC**, with **no production grants in migration**. It locks the global cycle, query and day rows and verifies all four saved early selections, exact airport/slot, run ID, DB clock, GET window and deterministic reservation SHA before inserting one immutable attempt and atomically charging both day and cycle. Duplicate/retry/unknown GETs cannot be refunded; crash/ambiguous dispatch remains billed-or-unknown until separate provider settlement.
- `clean.phase5_fids_original_binding_v39` binds source to the exact committed attempt and source-query contract. BEFORE INSERT triggers compare the actual `clean.fids_query_response` airport, Departure direction, service window, timezone/local request range, protocol/OpenAPI hash, original response SHA, decoded-original-body SHA-256 **computed from stored base64 entity bytes**, retrieval/DB-availability clocks, conservative expiry and number/availability of related normalized population rows. Metadata cannot be rewritten; cleanup is a **separately approved** retention operation and must not rehydrate expired provider Content.
- No paid REST GETs, Alert subscriptions, PRE/POST rows, novel operating-leg identity, provider rights permission, native actual runway timestamps or final scientific acceptance are inferred from a successful DB constraint.

### Distinguish genuine cutoff evidence from the ledger

A successful V0079 binding proves a particular provider-decoded original was durably bound to a recorded physical attempt under an approved *planned* source query. It is **not itself flight-level PRE**, and the actual transaction commit clock may be later than the original `available_at` property. Any future per-flight PRE owner must explicitly confirm committed, independently readback `available_at <= flight-specific cutoff`, a valid frozen selected-T/operating identity, source and right-to-use expiry. No retrospective PRE after a missed cutoff.

### Release HOLD — still required

1. **PG16 proof:** dedicated [disposable SQL test](../../tests/phase5_v0079_real_pg_source_ledger_v39.test.ts) and [no-paid CI workflow](../../.github/workflows/phase5-v0079-source-ledger-real-pg16-offline.yml) must pass against the actual B0062 schema. Failure is a code defect, not a reason to use the live Replit database for debugging.
2. **Installer and roles:** production phase5-specific schema installer, independent grants/default privilege audit, restricted GitHub source-reservation role, original-writing role and read-only auditor, physical stop/cancel, selection history as-of, nonoverlap with current Gate5, and no secrets in logs. These are **not included in this PR**.
3. **Real port integration:** Stage2 `reservePhysicalBeforeGet` and `commitOriginalAndPopulation` must be wired to exact V0079 SQL and existing `persistFidsObservation()` inside a **shared restricted PostgreSQL transaction**. The generic application pool must never be used by that GitHub-only runner; a function callback returning `persisted:true` is not a DB commit.
4. **Real source scheduler and complete 31-day grid:** independently frozen actual day-level adaptive selection before T−24h, actual provider-local query ranges and source response timings, true requested-API cost, all REST categories and retries charged, GitHub clocks, readback of T24/T6/T90 expected vs late/missing, POST and actual-only targets. Source schema and expiry/retention requirements must be verified against the current account agreement; signed SHA is not rights.
5. **A billable diagnostic** must await real published receiver SHA and source-use entitlement/remaining credits (#28/#300), and a reliable STOP. One paid microprobe does not qualify month-long service reliability, operating-leg labels or scientific Gate5 PASS.

**Relevant previous merged changes:** [#417](https://github.com/HKcode22/ReplitTranvr/pull/417) no late redraw, [#418](https://github.com/HKcode22/ReplitTranvr/pull/418) atomic early selection on PG16, [#419](https://github.com/HKcode22/ReplitTranvr/pull/419) scoped source bridge. Work belongs to Phase5; historical YSSY #28 and Phase4 Gate5 #293 remain separate.
