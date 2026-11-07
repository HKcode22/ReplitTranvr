# Phase 5 — restricted metadata-only daily source quality scorecard

**Status:** implementation and offline tests only. Does not expose a live explorer, certify real PRE or authorize Phase6. Requires separately installed V0079 schema and an independent read-only auditor role; no command is necessary against Replit before that installation review.

## Purpose

Phase5 is not complete merely because GitHub Actions jobs are green. A daily source audit must distinguish *planned signed queries* from physical GETs, durable source originals, late/missing attempts, expired Content and normalized observation counts. It must not use a zero-row generic webhook table to infer the provider never sent alerts, and must not treat missing source as on-time flight operations.

[Implementation](../../server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) takes one exact source-release manifest SHA and 1–31 run-day index and opens a **REPEATABLE READ READ ONLY** PostgreSQL transaction on the dedicated auditor pool. It reads only V0079 metadata, the 4-airport selected-draw metadata, `fids_query_response.available_at`, and aggregate counts of linked `flight_population` and clock-ordered `flight_snapshots` records. It selects **no raw_payload, raw decoded provider bytes, flight number, operated-leg identifiers, source flight contents, provider keys or JSON features** and writes no rows.

## Output denominators, not fabricated claims

- Per slot/horizon: planned signed source queries, irreversible reserved GETs, bound originals, missed physical-dispatch window, not-yet-due requests, reserved-without-original after cutoff, originals bound before/after the *planned query cutoff*, expired-source metadata and normalized population observation count.
- Budget: true cycle and selected-day cumulative physical units plus frozen other-category reserves and protected floor.
- Selected-day draw: total row/unique slots/unique airports only, without exposing the airport identities.
- Snapshot rows: metadata-only existing observation row and DB-clock ordering counts. **These are not scientifically certified genuine PRE** without independent provider-native selected T, operating-leg identity and verified commit-before-each-flight-cutoff.
- If V0079/day is missing or there are zero signed source queries, the auditor returns **HOLD**, never a misleading successful zero. No raw Contents or user data are returned.

[Staged CLI](../../scripts/v39_phase5_day_source_quality_readonly_v39.ts) accepts only a signed manifest SHA and day index with an explicitly approved source-auditor role `V39_P5_AUDITOR_DATABASE_URL`. It does not install any DB role, make a provider GET, create subscriptions or enable Phase6. [Offline contract tests](../../tests/phase5_day_source_quality_readonly_v39.test.ts) ensure mandatory read-only transaction, safe denominators/unknowns, error rollback, and no raw payload output.

## Release dependencies

Actual production `V39_P5_AUDITOR_DATABASE_URL` role and exact restricted SELECT grants have **not** been installed. V0079 is only staged in the repository, as of this artifact. Phase5 final freeze still needs actual source rights, 31-day frame/calendar, GitHub-timed T24/T6/T90 source owners, genuine flight-level PRE/POST and scientific missingness/selection-bias review. This scorecard can be safely integrated into an authenticated future explorer only after account-specific provider Content retention policy is enforced. It is not a user-facing record browser or a substitute for the analysis protocol.

The historical YSSY diagnostic belongs to Phase2G (#28), and original strict scientific Gate5 remains HOLD (#293). User's authorization to pay for bounded experiments does not change source-use rights or permit premature Phase6 deployment.
