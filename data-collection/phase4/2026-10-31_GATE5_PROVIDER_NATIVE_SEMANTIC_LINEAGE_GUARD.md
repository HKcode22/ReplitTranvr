# Phase 4 Gate 5 — provider-native timestamp ambiguity and source-lineage guard

**October 31, 2026. Status: OFFLINE CODE ONLY; Gate5 scientific HOLD.** No provider GET, database write, Alert, workflow dispatch, Replit shell or Phase5/6 activation.

## Binding evidence and provider contract

- [V3.9-f.8 Plan §§5–7, 16–17](../plans/V3.9_DataCollectPlan_f.8.md); [hash-locked Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §§1.9 and 2.22; [current Gate5 restart handoff](2026-10-31_GATE5_REDO_ROOTCAUSE_AND_RESTART_HANDOFF.md); [three-horizon grid checkpoint](2026-10-31_GATE5_FROZEN_GRID_OFFLINE_PLANNER.md).
- [Official AeroDataBox RapidAPI OpenAPI v1.15.4.0](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json), schema FlightAirportMovementContract, independently retrieved October 31, 2026: **scheduledTime** means scheduled arrival/departure, but does not independently establish scheduled gate-out versus scheduled wheels-off. **revisedTime** can mean actual OR estimated and may mean gate OR runway. **runwayTime** can mean actual OR estimated on the runway. **quality** can be Basic, Live, or Approximate; none is an explicit per-value isActual certificate.
- [Official AeroDataBox historical ADS-B runway announcement](https://aerodatabox.com/flight-take-off-and-landing-time-runway-detection-based-on-ads-b-data-more-flights-and-status-updates/) discusses retrospectively detected actual times at some airports but warns coverage and precision are not guaranteed. Historical listed airport support cannot establish current individual WSSS labels.
- [Source semantics issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200) remains OPEN; no authenticated definitive provider reply was found. An earlier one-time paid status feasibility test found no verified physical T or actual departure label. Repeating identical uninformative paid GETs is not proof.
- [October 31 prospective WSSS T−90m](https://github.com/HKcode22/ReplitTranvr/actions/runs/41202671665): 86 source-observed provisional rows, 2 measured units, original SHA readback PASS. Missed T−6h remains UNOBSERVED. Postflight identity-resolved results do not prove true capture=0.

## Implemented pure offline validator

- Source: server/lib/disruption/phase4Gate5ProviderNativeLineage_v39.ts
- Tests: tests/phase4_gate5_provider_native_lineage_v39.test.ts
- Accepts only bounded, caller-supplied versioned FIDS *metadata*. No source HTTP, key, PostgreSQL or provider system access. Output is anonymous aggregate counts only.
- Checks immutable original SHA equality, original-retained marker, strict UTC, parent original source receipt preceding normalized member availability, audit as-of time, duplicate source query/analytic identity, source airport and requested-primary versus opposite-movement context.
- Separately counts IsOperator / IsCodeshared / Unknown; explicit source origin present/absent/conflicting; revisions; presence of generic scheduled, revised and runway timestamps; Live quality flags. An IsOperator record or query-origin-only WSSS observation is NOT a proven unique physically operated commercial flight.
- Chooses the earliest durably available **generic scheduled** observation per provisional identity and counts retimes WITHOUT moving that first candidate schedule; assesses historical source availability at three **nominal** T−24h/T−6h/T−90m cutoffs and rejects later as-of evidence. These are diagnostics, NOT verified selected T.
- Even when a runway timestamp and Live quality exist, independent selected-T certainty, uniquely confirmed physical-flight counts, actual wheels-off count, original wire-byte authenticity and actual outcome rate remain **UNKNOWN (null)**, not measured zero. No certified persisted PRE or downstream authorization.
- Earlier submillisecond PostgreSQL-versus-JS serialization anomalies must remain separate source-integrity measurements; this pure module never rewrites original clocks or relaxes negative parent-to-child ordering.

## Next critical steps

1. All four PR checks pass before merge. Keep canonical implementation log original blob unchanged.
2. Connect these pure aggregates to the protected existing **read-only** source inventory only after confirming original retained provider versioned fields/retention and the database projection; no flight IDs, private provider values or raw timestamps in Actions output.
3. Resolve #200 from authenticated original provider semantics or a sufficiently evidenced per-value actual/estimated indicator and a first observed provider-native scheduled-T milestone. If absent, record SOURCE_SEMANTICS_UNPROVEN; do not redefine the endpoint without protocol approval.
4. Independently verify physical operating-leg and commercial passenger scope, source-first qualified T, applicable actual-only outcomes, missing/censored counts and durable as-of certified PRE snapshots. Optional weather/webhook NULL must not prevent otherwise eligible PRE.
5. Only then freeze the new future same-cohort full T−24h/T−6h/T−90m query grid with verified GitHub prearms, owned paid dispatch, current quota and retention rights and separate complete source/outcome evidence. Never backfill the October 31 missed T−6h.

**Current decision:** Gate5 HOLD, Phase5 FREEZE NO-GO, Phase6 NO-GO. Owner paid authorization is acknowledged in #200 but there is no newly activated paid job. No Replit shell action required.
