# Phase 5 — restricted PostgreSQL saved-day readback × reviewed 31-day shape binding

**Engineering checkpoint, November 9, 2026.** Phase 5 independent science FREEZE = HOLD. Paid Phase 6 GO = NO. This code is intended for a future, properly authorized prospective day. It has NOT yet observed any real future four-airport cohort in the production database.

## The actual integration gap

The existing 31-day shape-envelope module correctly leaves the 21 ordinary adaptive days' four airport identities **NULL**. The separate pure ordinary-day verifier could only check caller-submitted four-row JSON, which might be synthetic. Meanwhile the Phase 5 committed-day PostgreSQL reader already verified a real authorized calendar day, restricted role, READ ONLY transaction, four saved airport rows and earliest GET clock, but had **no link to the complete 31-day envelope**.

This PR combines the checks inside the existing REPEATABLE READ READ ONLY transaction, without inventing airports, a new database, source privileges or an automatic paid launch.

## Exact code and security boundary

Implementation: server/lib/disruption/phase5CommittedDayGridReadonly_v39.ts

- A reviewer supplies an optional reviewedOrdinaryDayEnvelope containing the 31-day candidate envelope and its independently reviewed SHA. Missing/invalid SHA is rejected **before** connecting to PostgreSQL.
- The existing transaction first checks restricted current_user, transaction_read_only=on, database clock, active manifest authorization, and exact day/config/frame/calendar hashes.
- For an ordinary day, the stored calendar row must have window_shape=4h and active_duration_minutes=240. The program reads exactly four saved draw rows from the **same repeatable-read snapshot**.
- It calls the already-reviewed pure inspectP5OrdinaryDayCandidateBinding to match the exact ordinary run index, date, start time, four selected slot identities, checked draw clock, REGIONAL probability/region metadata, known envelope hash, and separately pinned signed calendar SHA.
- The resulting draw SHA MUST equal the independently reviewed expectedEarlyDrawSha256 before any per-day source candidates are derived. Any mismatch results in ROLLBACK; no fallback to a fabricated site selection.
- It reuses the existing dynamic day source-grid builder with independent request/endpoint/query pins, and returns the checked ordinary shape binding alongside a candidate-only source grid.
- The response explicitly keeps priorDaySiteWashoutVerified=false, realFlightSourceVerified=false, physicalChargeDayBudgetsVerified=false, phase5FreezePassed=false and phase6Go=false. No AeroDataBox HTTP, Alerts or database INSERT are executed by this reader.

The older standalone readback API still works without the optional envelope so this does not invalidate historical read-only use cases. However, a legacy readback is **NOT** proof of agreement with the f.8 31-day prospective study envelope.

## The tests and their limitations

Implementation tests: tests/phase5_committed_day_grid_readonly_v39.test.ts

The regression uses the archived **real owner corrected B0062 five-pair packet** to reconstruct the 31-day date/shape envelope. It selects ordinary run day 6 as a hypothetical prospective example. The day-six actual airports and PG rows are MOCKS, deliberately NOT a production flight collection.

Tests assert: the existing PG transaction reads exactly one signed day plus four rows; no missing source/GO certification; four selected ICAOs and early timestamp match the envelope; one-day source grid still has 12 legacy candidate groups; wrong persisted 4-hour shape, wrong or edited envelope hash, late draw and wrong source approval fail closed. Rejection paths ROLLBACK and success COMMIT only after checks. Existing callers without an envelope remain unchanged.

**Mocked PG tests are not live provider or DB evidence.** A future independent release audit must use a real credential-scoped primary read-only PostgreSQL connection, genuine serializable saved airport draw and a still-valid future source clock. The same test names do not guarantee an actual source population or a lawful per-flight Contents retention policy.

## Actual remaining science exits

(A) Independently adopted scientific target and legally admissible AeroDataBox source Contents/retention (issue #300). (B) Actual first prospective source original and flight-specific T, three cutoff-valid PRE commits, witness, POST/receiver/STOP. (C) Reviewed signed 31-day date/UTC slot/region/seed/shape envelope, authentic per-day adaptive site draw + global >=24h site reuse washout, provider native source range and physical UTC seven-category REST/Alert charge-day budget. (D) One independent Phase5 FREEZE PASS/HOLD and separate paid Phase6 GO.

The 31-day shape remains 10 matched paired days and 21 ordinary days with future unknown airport IDs. Nov24–Jan5 is a synthetic calendar input, **not a mandatory start date**. Start Phase6 at the earliest truly safe future date after approval and first authentic >24h45m/<=72h early selection plus T24 source lead.

No provider calls, Alerts, production PostgreSQL writes, migrations, secret changes or owner Shell actions were required by this patch.

Related: [assistant new-chat handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md) and [owner learning atlas](2026-11-09_OWNER_PROGRESS_ENGINEERING_TIME_AND_PHASE5_CODE_ATLAS.md).
