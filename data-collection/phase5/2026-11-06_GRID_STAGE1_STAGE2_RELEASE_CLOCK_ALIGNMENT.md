# Phase 5 — staged source freeze grid now agrees with real Stage 1/2 timing

**Status:** proposed offline code/test change on a review branch; no paid dispatch, Phase 5 FREEZE, V0079/V0080 live install or Phase 6 GO. Owners: [P0 #416](https://github.com/HKcode22/ReplitTranvr/issues/416) and [Phase 5 #413](https://github.com/HKcode22/ReplitTranvr/issues/413).

## Concrete discrepancy

After PR #427, the 31-day synthetic FIDS grid correctly counted one physical GET at the provisional 2 units per request on actual UTC charge days. But its proposed `plannedAirportSelectionUtc` and `maxResponseAndPersistSeconds` were still looser than the actual merged runtime:

- `phase5EarlyAdaptiveDrawOwner_v39.ts` creates **one serializable 4-slot selection timestamp**, strictly more than 24h45m and no more than 72h before the frozen day-window start.
- `phase5EarlyPreselectionReadback_v39.ts` requires all four selection timestamps to match and validates the frozen day.
- `phase5ScopedFidsSourceBridge_v39.ts` requires selection **strictly before** every signed source request, day-start alignment and a maximum **3600 seconds** for response + durable original commit.
- Previously the pure `phase5FidsFreezeGridAdmission_v39.ts` accepted different slot selection times (provided each slot was internally consistent), selection exactly at the request, and up to 86,400 seconds of response/commit latency. A green synthetic planner could therefore pass a source grid the real owners must refuse.

## Safe prospective correction

The planner now rejects any candidate where:

1. Selection is at/after its first signed query, earlier than the 72h selection window or not strictly more than 24h45m before the frozen service start.
2. The four airport slots on one day have different proposed selection timestamps.
3. One day's airport slots claim different service starts, despite the real scoped runner matching each request to one immutable day start.
4. The signed request response+persist latency bound exceeds the actual Stage2 3600-second cap.

Focused synthetic tests include the allowed 31 × 4 × 3 one-GET sample, boundary contradictions, non-atomic four-slot selection and non-matching day starts. They use zero provider keys and no SQL. The sample timestamp was shifted from the formerly impossible 24h20m to an admissible 25h before service.

## Meaning and remaining work

This is **static release-design consistency**, not genuine committed selection or measured source coverage. Even after green CI, the official plan still requires an actual reviewed 31-day manifest, dynamic committed early draw, V0079/V0080 production role/installer and signed GitHub timed owner, flight-level T−24h/T−6h/T−90m PRE, post-service labels, lawful AeroDataBox record use/retention, billed quotas and independent release audit. Historical full strict Gate 5 remains HOLD. No calendar or source data is retroactively modified.

Normative authority remains [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md), [Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) and the [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md); this addendum cannot weaken any release gate.
