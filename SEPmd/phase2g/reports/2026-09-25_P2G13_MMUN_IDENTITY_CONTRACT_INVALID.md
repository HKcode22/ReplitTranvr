# P2G13 MMUN — full-duration provider-safe run, scientifically invalid identity contract

> Date: 2026-09-25  
> Phase/Gate: Phase 2 / Gate 2 / Stage 1  
> Scientific disposition: **INVALID FOR PROMOTION / PRESERVE AS HISTORICAL EVIDENCE**  
> Operational disposition: **full-duration provider-safe MATCH; post-provider exact-session cleanup must be separately verified**

## Exact execution identity

- GitHub workflow: `Phase2G Paid Stage1 Owner`
- GitHub run ID: `36126990149`
- GitHub run number: `3`
- execution HEAD: `2ff4149b8ba7f2125ee2fd2b6be95f8f82adf779`
- authorization: `AUTH-20260925-P2G13`
- budget day: `P2G-S1-20260925-12`
- airport: `MMUN`
- durable probe ID: `10`
- runtime session: `e343329e-4966-482d-8e51-1b7867deed1c`
- provider subscription ID: `9c55108f-fdba-4c45-8102-656b31c55c6b`
- metric contract written by this run: `v39-physical-flight-instance-v1`

## Operational result

The paid collection path itself succeeded:

- fresh paid gate: PASS;
- GitHub owner: PASS;
- independent GitHub watchdog: PASS;
- intended two-hour window reached;
- `duration_censored=false`;
- `stop_reason=null`;
- callback receiver remained bound to the exact authorized source/runtime contract;
- provider subscription was deleted at terminal settlement;
- final active billable subscription count observed by the watchdog: 0;
- authoritative starting Alert balance: 1,842;
- authoritative terminal observed balance: 1,790;
- external provider spend: 52 Alert credits;
- internally persisted received cost: 52 credits;
- terminal reconciliation: `MATCH`;
- delivery/accounting gap: 0;
- final watchdog callback requests seen: 39;
- callback failures: 0;
- provider-read failures: 0.

The owner terminated with:

```text
PASS_PROVIDER_SAFE_AWAITING_CLEANUP
```

and the independent watchdog terminated with:

```text
PROVIDER_SAFE_AWAITING_REPLIT_CLEANUP
reconciliation_status=MATCH
active_billable_subscriptions=0
runtime_cleanup_verified=false
```

Therefore this report does **not** claim that the exact-session Replit raw/runtime cleanup/finalizer was already complete merely because GitHub was green. That post-provider state requires its own cleanup receipt and finalizer evidence.

## Live identity audit that exposed the defect

Before transient runtime cleanup, a read-only audit of the active MMUN session observed:

```text
total_items=26
provider_id_missing=26
callsign_missing=6
resolved=22
quarantined=4

logical_leg_groups=23
repeated_groups=3
mixed_resolved_quarantined_groups=2
groups_with_quarantine=3
```

All 26 sampled items lacked AeroDataBox `flight.id`, so the prepaid probe depended entirely on the no-provider-ID physical identity fallback.

Three repeated logical scheduled-leg groups were present:

### VB 2102 — defect-revealing case

Both observations had the same:

- operating carrier/flight: VB 2102;
- route: MMUN → MMVR;
- scheduled gate-out: 2026-09-25 11:00 UTC.

First observation:

- provider flight ID: NULL;
- callsign: NULL;
- aircraft registration: NULL;
- identity: resolved;
- physical identity: `leg:e7159686`.

Later observation:

- provider flight ID: NULL;
- callsign: `VIV2102`;
- aircraft registration: `XA-VXY`;
- same route and exact scheduled gate-out;
- identity: quarantined;
- physical identity: NULL;
- different provisional ambiguity token.

### AM 501 — second defect-revealing case

AM 501, MMUN → MMMX, scheduled gate-out 11:03 UTC, also had one resolved observation and a later enriched observation quarantined despite the same logical scheduled leg. The later observation supplied callsign `AMX501` and aircraft registration `N838AM`.

### Q4 312 — expected quarantine, not this defect

Q4 312 remained `ambiguous_unknown` under the provider codeshare boundary. It had no confirmed physical identity and is retained as an expected conservative ambiguity case. It must not be used as evidence that the exact-schedule bug itself is fixed or broken.

## Root cause

The normal production physical-flight persistence in
`server/lib/disruption/flightInstanceCanonical_v3.ts` performs an exact
schedule-aware alias lookup before fuzzy no-provider linkage.

The prepaid session-local persistence in
`server/lib/disruption/prepaidProbeRuntime_v39.ts` did not mirror that exact
lookup. For no-provider-ID observations it moved directly to retained callsign /
nearby-schedule linkage. Therefore a later update that added a callsign could
fail to match an earlier observation whose callsign was NULL, even when carrier,
flight number, route, service date and scheduled gate-out were unchanged.

The prepaid provisional ambiguity key also included callsign. Callsign is mutable
enrichment, so its later appearance could create a second ambiguity token for
the same exact scheduled leg.

This was an implementation-parity defect, not an AeroDataBox delivery failure.

## Why the defect is scientifically material

The binding Stage-1 metric contract requires confirmed distinct physical
`flight_instance_id` as the yield unit and states that retries/updates do not
create flights.

The defect can:

1. detach a later observation from an already-confirmed physical leg;
2. inflate the ambiguity upper bound with a new provisional token;
3. prevent later aircraft-registration enrichment from attaching to the
   confirmed leg;
4. undercount or otherwise distort confirmed tail-chain links;
5. alter identity-bounded Stage-1 yield and promotion invariance.

Because `tail_chain_links_per_credit`, unique-flight yield and stability enter
the frozen Stage-1 yield score, P2G13's v1 identity-derived metrics are not safe
for anchor promotion.

## Scientific disposition

P2G13 is therefore classified as:

```text
provider collection execution: PASS
full-duration exposure: PASS
provider/internal reconciliation: MATCH
callback transport: PASS

physical-flight metric contract: INVALID
promotion-valid Stage-1 evidence: NO
scientific outcome: INVALID / EXCLUDED
```

Probe 10 and its evidence remain immutable historical evidence. No row is
deleted, rewritten into a different historical outcome, or retroactively
rescored as if the corrected resolver had run live.

## Additional contract-version consequence

The deeper audit found that:

- OMAA probe 2 completed before the corrected physical-flight metric contract
  and has historical `metric_contract_version=NULL`;
- WSSS probe 9 / P2G11 completed on 2026-09-24, also before the physical-flight
  metric implementation, with historical `metric_contract_version=NULL`;
- MMUN probe 10 / P2G13 used v1, which this report adjudicates scientifically
  invalid.

The existing 2026-09-25 physical-flight amendment already prohibits mixing old
NULL-contract yield metrics with corrected physical-flight metrics. Therefore a
corrected MMUN result cannot be normalized against the old WSSS/OMAA yield
metrics.

The prospective recovery must use one comparable corrected-contract measurement
for WSSS, then OMAA, then MMUN before normal compact-six sequencing continues.

## Required prospective correction

Before any further paid Stage-1 candidate:

1. correct prepaid exact scheduled-leg reuse to match production identity
   semantics;
2. make provisional ambiguity identity stable across later callsign enrichment;
3. version the corrected physical metric contract as
   `v39-physical-flight-instance-v2`;
4. regression-test the observed VB2102/AM501 pattern;
5. preserve Q4312-style genuine ambiguity;
6. require preflight and owner to use the same Stage-1 evidence reconstruction
   and target selector;
7. exclude historical NULL/v1 rows from v2 promotion;
8. permit at most one prospectively frozen v2 remeasurement for each of WSSS,
   OMAA and MMUN in the fixed order WSSS → OMAA → MMUN;
9. require a fresh runtime, budget day, AUTH, callback verification and paid
   preflight for every paid remeasurement;
10. never auto-retry a failed v2 remeasurement.

No paid provider action is authorized by this report.
