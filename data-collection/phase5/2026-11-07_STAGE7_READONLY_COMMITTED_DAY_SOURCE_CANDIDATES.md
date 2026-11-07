# Phase 5 Stage 7 — restricted source-day readback before query prearm

**Status:** proposed, provider-free and production-read-only adapter. No current connected real source DB or credentials have been touched. Phase5 FREEZE and Phase6 paid GO remain blocked.

## Scope and concrete safety gap

After Stage6 has a valid pure 4-airport adaptive-day → 12 source-query candidate materializer, the source-selection proof must be read from a **real committed PostgreSQL transaction** instead of an in-memory simulated sample. A forged list of selected airports and a self-asserted draw digest are not acceptable prearm evidence.

`phase5CommittedDayGridReadonly_v39.ts` opens a single `REPEATABLE READ READ ONLY` transaction on a separately supplied restricted role. It checks `current_user`, `transaction_read_only=on`, the enabled/nonrevoked release authorization, exact manifest/calendar/config/frame, frozen day date/seed/template, exactly four saved `adb_sampling_draw` rows, and the independent expected canonical digest. It then delegates to Stage6's pure guard for exactly 12 airport/slot/horizon query candidates, checks actual DB clock is **before earliest planned FIDS GET** and after actual saved draw, and commits the read-only transaction. Failure rolls back and does not substitute any airport or backfill. No provider Content or flight row is selected.

The adapter does **NOT** install V0079/V0080, create signed queries, infer rights, verify provider-native selected T, authorize a single charged GET, or create PRE/POST. A future signed GitHub source day owner must independently verify database role/credentials, rights, cache expiry, FIDS query frame and all-category UTC charge-day budgets before a separate mutation to V0079 PREPARED query rows. The currently returned Boolean `databaseReadOnlySnapshot` is a code-path statement, not external proof against malicious/mock database connections.

## Tests and release boundaries

Isolated offline test mocks the PostgreSQL port only (no secrets/network) to assert: scoped readonly transaction, positive 12-query readback, reader role mismatch, read-write mode refusal, revoked authorization, wrong calendar frame, partial saved day draw, wrong independent digest, past-due source clock and future-dated phantom draw. Full suite and new isolated workflow must pass before merge.

Strict original Phase4 scientific Gate5 remains HOLD. Phase5 #416 and final freeze #413 remain open, with legal source use and retention #300 separate. Do not modify provenance-locked implementation log.
