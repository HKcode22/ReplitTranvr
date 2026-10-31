# Phase4 Gate5 source schedule-literal sensitivity repair — Oct 29, 2026

Binding f.8 §§5, 7.1, 7.5, 16–17; Implementation Log §1.9/§2.22. Continues merged [PR #260](https://github.com/HKcode22/ReplitTranvr/pull/260), which added a query-origin-only operator RECORD tier without canonical promotion.

Real protected read-only [run #40879412315](https://github.com/HKcode22/ReplitTranvr/actions/runs/40879412315) reported 2 FIDS receipts / 31 departure records, 9 provider IsOperator, 22 marketing, all 9 operator records dependent on query origin, all 9 scope UNKNOWN. Every operator record had flight number, destination ICAO and nonempty departure schedule text; yet the first *overly restrictive UTC text regex* rejected all 9 as complete syntactic fingerprints. That is NOT evidence of absent schedule or actual flight nonexistence.

Correction:
- Compare exact retained departure schedule **text** in the candidate source fingerprint, not an assumed fixed ISO-8601 textual rendering. Source text fidelity matters for exact-repeat sensitivity. No parsing, timezone conversion, date validation or schedule-T inference is performed for that fingerprint.
- Add separate anonymous aggregate counts for records with a syntactically shaped destination ICAO and those matching the narrow prior UTC lexical pattern. The difference isolates representation mismatch without logging any raw dates, flight numbers, routes or source IDs. Strict T, first observed version, retime identity and clock semantics remain *unverified*.
- Fix the protected GitHub inventory workflow paths filter so changes to the imported sensitivity module alone trigger the postmerge READ-ONLY automatic audit. No new secrets/permissions/paid provider calls/SQL DML.
- Negative mock tests include source lexical mismatch, impossible aggregate counters, no canonical promotion, no production/API keys and path-trigger dependency.

Scientific interpretation: the operator records remain nine source observations, not nine distinct physical flights. Even a matching exact source fingerprint cannot prove one flight across retime, repeat queries, or marketing/operated-leg collisions. No prospective T−24h/T−6h/T−90m backfill, actual runway target, passenger-core scope or protected scientific Gate5 PASS. Phase5 final freeze and paid Phase6 remain HOLD. Inspect actual postmerge GitHub run before quoting any distinct fingerprint counts.
