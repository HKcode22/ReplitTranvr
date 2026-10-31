# Phase4 WSSS FIDS operating-leg identity root-cause diagnostic — 2026-10-29

Binding: V3.9-f.8 sections 5, 7.5, 16-17; implementation log 1.9 and 2.22. Additive checkpoint; never revise original gates retroactively.

Source: merged PR #258, protected successful GitHub run #40874815862, linked in Issue #38. Seven of seven source tables readable/LOGGED, two WSSS FIDS receipts with still-present original inline raw, 31 normalized FIDS records, ZERO confirmed operating-leg candidates, 28 recent unexpired provider webhook blob refs whose airport is unverified. No provider calls/DB writes.

Follow-on diagnostic extends the same protected READ ONLY original-source workflow. Already materialized normalized FIDS rows are separately counted by requested primary vs opposite context, confirmed core scope, confirmed operating / marketing / ambiguous codeshare and canonical identity/schedule field presence. These are independent dimensions, not mutually exclusive causes.

A bounded SQL aggregate over retained original FIDS response JSON counts departures/arrivals, provider-native codeshareStatus presence and IsOperator/IsCodeshared tags (number or string forms), provider flight ID presence, explicit origin/destination ICAO and scheduled departure UTC fields. Individual provider flight IDs, hashes, callsigns, locations, raw JSON or schedules are NEVER emitted in CI outputs. SQL is WITH SELECT on two retained receipts, inside same read-only PostgreSQL transaction with final ROLLBACK, no historical archive or new FIDS request.

Normalized source gaps cannot be patched by silently assigning missing operator codeshare flags. If original fields are missing, original physical operating identity remains unresolved, strict Gate5 HOLD and any prospective fresh-sampling requires separate evidence and budget approval. Candidate T arithmetic is not independently certified provider-native first selected T.

New focused test mocks fabricated values only. Do not claim a real original-source status distribution until the postmerge protected Actions report has completed. Final Phase5 FREEZE / Phase6 paid remain NO-GO.
