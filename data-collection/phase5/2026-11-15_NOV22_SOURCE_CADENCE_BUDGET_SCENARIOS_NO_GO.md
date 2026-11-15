# Nov15 UTC — proposed Nov22 calendar: source cadence / budget planning scenarios (NO GO)

## Scope

Use real corrected Nov9 pair evidence and original `proposeP5RealCorrectedPairDateGeometry` dated November 22, 2026 through January 4, 2027 (#721). Enumerate all ten balanced treatment allocations (two alternative-first / three control-first), before any treatment seed is chosen. No actual treatment assignment or ordinary airport selection is generated. Cost calculation matches existing `buildP5PrelaunchSlotBudgetEnvelope`, with proposed 240-minute range, 300-second lead, 2 units per physical GET, four slots, three horizons, 50,000 project-wide REST ceiling and 1,000 protected floor, 1,900 UTC daily REST ceiling. These are **scenario assumptions**, not a current vendor quote or account entitlement; this calendar spans 44 civil days and must be reconciled against actual renewal cycles. Zero calls, no writes, no release.

| Refresh | Source units, 1 GET | Source units, 2 GETs | Worst source UTC day, 1/2 GETs | Remaining for five other categories after floor, 1/2 GETs | Max templates per service day |
|---|---:|---:|---:|---:|---:|
| 5 min | 36,864 | 73,728 | 1,536 / 3,072 | 12,136 / -24,728 | 864 |
| 10 min | 18,432 | 36,864 | 768 / 1,536 | 30,568 / 12,136 | 432 |
| 15 min | 12,288 | 24,576 | 512 / 1,024 | 36,712 / 24,424 | 288 |
| 30 min | 6,144 | 12,288 | 256 / 512 | 42,856 / 36,712 | 144 |
| 60 min | 3,072 | 6,144 | 128 / 256 | 45,928 / 42,856 | 72 |

Totals and peaks are equal across the ten model allocations. FIDS requests touch 42 distinct possible UTC dates in this proposal; per-date categories must be bound to the realized order and physical request times. Two-GET model is a sensitivity multiplier (not permission to automatically retry). No other categories allocated in the source-only test; real FIDS_RETRY, VALIDATION, OUTCOME_REST, HISTORY_BOOTSTRAP, DIAGNOSTIC require distinct nonnegative covered budgets. Alert creates/credits are a different ledger; do not equate them with REST units. The 50k is a project ceiling, not asserted current subscription balance.

## Candidate choice

**15 minutes** is the fastest of these modeled cadences that fits existing compiler group-level maximum 32 refreshes per provider partition and maximum 384 templates per service day even at a full six-hour exposure. At 10 minutes the six-hour day requires 432 templates; at 5 minutes the four-hour partition alone requires 48 refreshes, violating existing 32 limit. Do not quietly raise limits or promise 10-minute operational readiness. At 15 minutes single-GET source upper bound is 12,288 units, leaving 36,712 units across the project after the floor, before other caps. The two-GET scenario leaves 24,424. Those amounts are not a predicted POST yield.

## Before staging

- Review actual current account balance and renewal timing, provider range/price/multiplier, measured latency and freshness. No assumptions about complete source coverage: existing candidate audit needs over 15 min of lead to the flight cutoff; 300-second request lead does not establish that eligibility.
- Independently commit treatment seed and draw seeds prospectively, review all 21 ordinary HUB/region plans and exact shape. Re-run existing stage compiler with real evidence rather than test hashes.
- Verify outcome/other-only UTC charge dates. Current slot-budget contract requires exactly the source charge-date set, so it must not silently drop an actual outcome date that falls outside that set. Resolve against actual date/timing policy before seven-category freeze.
- Reuse B0062/V0093 installed restricted stagers and actual independent readback. No replay of V0100 or earlier production schema.
- Keep canonical Amendment E, T−6 conditional primary gate-out minutes, T−90 update, T−24 comparator; separate airborne arrival ETA. Missingness is accepted and reported, never backfilled.

No source permissions, actual flight availability, measured capacity or independent scientific release certified here.
