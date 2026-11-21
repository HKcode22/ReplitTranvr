# Gate 1 reversible-category validation finding

Date reviewed: 2026-11-21 UTC  
Status: **implementation correction complete in review candidate. Independent field approval remains open.**

The 16-field review candidate listed three direct encodings that could recreate
their source value from the emitted bucket:

- `origin_taf_flight_category` and `destination_taf_flight_category` used four
  distinct values and four distinct buckets.
- `prior_aircraft_adsb_not_ground_reported` used the two original boolean values
  and two distinct buckets.

The Phase 7 transformation validator now rejects both a one-to-one categorical
dictionary and a boolean bucket. The `nonReconstructable` field remains review
evidence and cannot convert a reversible encoding into a derived work.

The reviewed native FlightStatus path remains the only categorical route. It
requires all 13 public contract values exactly once in explicit groups, with at
least two values in every group. The disposable Stage14 fixture now exercises
that same grouped shape.

For the pending Gate 1 policy decision, the two TAF categories may proceed only
through the existing independent exact-source lane when its separate source and
as-of evidence is accepted. The ADS-B boolean has no existing independent exact
production lane and remains unavailable until a supported, reviewed
representation exists. An absent observation remains missing.

Focused transformation tests and TypeScript passed on this review candidate.
The disposable Stage14 workflow was queued for the candidate at the time of
this checkpoint. No provider request, production database write, policy
installation, SOURCE enablement, or paid GO occurred.
