# Gate4 hardening — October 21, 2026 (DRAFT; NO BILLABLE AUTHORIZATION)

**This is a reviewed-source candidate, not production deployment or Gate4 PASS.**
Baseline production source: ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814.

## Audited source gaps
Existing Gate4 owner returned PASS from a simple arithmetic simulation and a legacy controller idle-state read. This was not real SEND-aware proof.
Existing V3.9 watchdog previously logged a provider-balance failure but did not necessarily attempt STOP. It did not feed an internal received-item witness into its threshold decision.
Existing startBatch guarded against a currently active batch, but did not explicitly require the latest predecessor to be CLOSED and settled.

## Changes on the research branch
1. New pure SEND budget policy, tested at cap 100/margin 10; external credit delta and received-item counts both considered, missing or increased provider balance and unexpected SEND mismatch result in HOLD_STOP, not zero spending.
2. Wired policy into V3.9 real watchdog and attempted stopBatch() after a failed balance/ledger read; incident attempted in addition. This is an attempt, NOT guaranteed deletion under DB/provider outage.
3. StartBatch now refuses an active/unsettled latest predecessor before subscriber CREATE.
4. Frozen config now refuses soft margin smaller than reserved unsettled SEND-burst amount.
5. Gate4 owner no longer reports Gate4 PASS from synthetic simulation; outputs OFFLINE_ONLY_NOT_LIVE_CERTIFIED.
6. Added focused offline tests; execution and TypeScript validation remain PENDING until operator executes them.

## Hard technical limitations
A lagging balance read, missing provider SEND, billing after DELETE and simultaneous controller processes may still defeat a simple polling cap. No provider-enforced hard 100 or 1900 credit limit is claimed. The internal adb_ingest_events is RECEIVED data, not complete SEND-side accounting. Atomic second-start ownership and independent supervisor behavior still need disposable-PG/real-path tests. A future separately authorized tiny live canary is required for Gate4 certification only after reliable source+settlement safeguards.

## Status and boundaries
Offline source DRAFT. Do not merge, publish, turn on PHASE6_READY, create a subscription, issue a paid call or approve Phase4 from these tests. Gate3 prepaid and Gate0.5 scientific certificates remain separate Phase3 requirements. This report documents a real defect fix proposal and a finite verification plan; deadline is not permission to bypass safety.