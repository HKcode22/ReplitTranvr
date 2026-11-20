# Amendment E continuous T-6 target — clean current-main implementation note

Date: 2026-11-19 Pacific  
Status: **DRAFT / NO SOURCE ENABLE / NO PROVIDER / NO PAID GO**

## Why this exists

The frozen Phase-6/7 design keeps the first-cycle primary target as **continuous T−6 actual gate-out delay minutes**, with a T−90 update, T−24 comparator, and separate post-takeoff arrival ETA.

The existing Packet-B contract is intentionally bucket-oriented. That is useful for conservative long-lived derived features, but the primary regression target must not be silently changed into a classification-only label. The earlier draft #906 identified that scientific problem but was stacked on stale pre-#907/#910 work and relied too heavily on a declarative `nonReconstructable:true` assertion.

This clean successor is based on current main `0a7b1a28f243de76d4c83026d15f585265ef6f7b` and does not modify Packet A, source authorization, scheduler state, provider calls, database state, or paid GO.

## Boundary

Packet A remains the short-lived full-fidelity operational/source-custody lane. The transform consumes exact schedule and actual gate-out observations only while Packet A and the temporary source→release mapping are still alive.

The long-lived output contains only:

- random Packet-B `releaseRowId`;
- continuous signed gate-out delay in minutes for observed T−6 rows;
- null for censored/missing/not-due rows;
- censoring state;
- a hash of the already-derived Packet-B packet, not a hash of the provider/source record.

It does **not** emit flight identity, airport/carrier/route identity, source record identity, exact schedule/actual timestamps, provider fields, raw values, or a permanent source→release mapping.

## Stronger transform requirements

An observed continuous target is accepted only when:

1. the profile carries non-placeholder hashes for the Terms review, bounded source-use review, field-inventory review, Derived-Work review, and exact transform review;
2. the source schedule observation and actual gate-out observation have distinct evidence hashes;
3. at least two separate source observations are attested;
4. the schedule observation precedes the scheduled event and the actual observation occurs after the actual event;
5. computation occurs inside a temporary mapping window of at most 24 hours;
6. the Packet-B row exists, is T−6, and has the same censoring state;
7. the signed target is recomputed from the two exact timestamps rather than accepted as a caller-supplied value;
8. non-observed rows are forbidden from carrying an actual gate-out source value.

The per-row input/evidence receipt is explicitly ephemeral and must be deleted no later than the source→release mapping expiry. It is not part of the long-lived Packet-B target.

## Retention interpretation

This implementation does not by itself declare the target a legally valid Derived Work. It creates the engineering boundary needed for the independent review to make that determination.

The intended conservative basis remains:

- ordinary AeroDataBox source-shaped Contents are short-lived under the applicable retention clock;
- Article 5.8 reference identifiers are a separate identification/linking path and do not automatically include exact timestamps/status/delay values;
- long-lived Phase-7 outputs must satisfy the Terms definition of a genuine Derived Work;
- routine backup/PITR copies remain recovery-only and are not a research archive.

## Launch relationship

This is **not a prerequisite for the first Phase-6 SOURCE call** provided it is independently reviewed, completed, and parity-checked before the first acquired source-custody records reach expiry. No launch gate is weakened by this draft.
