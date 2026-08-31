~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 8695 min ago — data has stalled
PASS  balance                      2901 credits (live-api)
PASS  rows today                   0
PASS  rows total                   4316
FAIL  active batch                 none running right now (idle)

HEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last

~/workspace$ npm run gate0

> rest-express@1.0.1 gate0
> tsx scripts/gate0_budget_report.ts


══════════════════════════════════════════════════════
GATE-0 BUDGET-PARTITION REPORT (plan §3.2)
══════════════════════════════════════════════════════

  Plan (VERIFY at Gate 0)                        VERIFY_AT_GATE_0
  Monthly API units (VERIFY)                     VERIFY_AT_GATE_0
  Refill conversion                              1 API unit → 1 credit
  ------------------------------------------------------------
  Total monthly entitlement                      60,000 units
  Alert-credit refill                            58,900 units → 58,900 credits
    ├─ Spendable experimental envelope           57,900 credits  (binding invariant)
    └─ Permanent balance floor                   1,000 credits  (ADB_RESERVE_CREDITS=1000)
  Census + REST budget                           ≈1,000 units  (FIDS/S1 + probes + diagnostics)
  Unallocated remainder                          100 units  (never used experimentally)
  ------------------------------------------------------------
  Arithmetic check: 57900 + 1000 + 1000 + 100 = 60000 ✓ (= 60,000)
  ------------------------------------------------------------
  Daily cap: HARD_CAP=1900  SOFT_STOP=1850 (margin 50)
  Estimated daily reservation: 1900 − credits_actually_consumed_today
  ------------------------------------------------------------
  Realized spend (ledger Σ notification_items)   0 credits
  Remaining spendable                            57,900 credits
  Run-total invariant (≤ 57,900)                 HOLDING
  ------------------------------------------------------------
  Latest Flight-Alert balance                    2,901 credits (live-api)
  Permanent floor (1000) intact                  YES

  NOTE: census spend (FIDS/S1, probes, diagnostics) is tracked on the
  REST line (1,000 units), NEVER against the 57,900 refill envelope (§3.2).

~/workspace$ 
~/workspace$ npm run coverage

> rest-express@1.0.1 coverage
> tsx scripts/measure_coverage.ts

Measuring AeroDataBox airport coverage (forces a fresh fetch)...

fetchedAt                 : 2026-08-17T12:21:07.097Z
universeCount (union)     : 4332
worldScheduledCommercial  : 4072 (ATAG 2023)
catalogCount (ours)       : 276
catalogInUniverse         : 267
catalogMissingFromUniverse: 9
universeNotInCatalog      : 4065
byTier (ours, in universe):
  HUB       30/30
  MID       89/87
  REGIONAL  157/150

Frame note: frame = measured universe; directly-collectable = catalog ∩ universe.
~/workspace$ 
~/workspace$ npm run gate0

> rest-express@1.0.1 gate0
> tsx scripts/gate0_budget_report.ts


══════════════════════════════════════════════════════
GATE-0 BUDGET-PARTITION REPORT (plan §3.2)
══════════════════════════════════════════════════════

  Plan (VERIFY at Gate 0)                        VERIFY_AT_GATE_0
  Monthly API units (VERIFY)                     VERIFY_AT_GATE_0
  Refill conversion                              1 API unit → 1 credit
  ------------------------------------------------------------
  Total monthly entitlement                      60,000 units
  Alert-credit refill                            58,900 units → 58,900 credits
    ├─ Spendable experimental envelope           57,900 credits  (binding invariant)
    └─ Permanent balance floor                   1,000 credits  (ADB_RESERVE_CREDITS=1000)
  Census + REST budget                           ≈1,000 units  (FIDS/S1 + probes + diagnostics)
  Unallocated remainder                          100 units  (never used experimentally)
  ------------------------------------------------------------
  Arithmetic check: 57900 + 1000 + 1000 + 100 = 60000 ✓ (= 60,000)
  ------------------------------------------------------------
  Daily cap: HARD_CAP=1900  SOFT_STOP=1850 (margin 50)
  Estimated daily reservation: 1900 − credits_actually_consumed_today
  ------------------------------------------------------------
  Realized spend (ledger Σ notification_items)   0 credits
  Remaining spendable                            57,900 credits
  Run-total invariant (≤ 57,900)                 HOLDING
  ------------------------------------------------------------
  Latest Flight-Alert balance                    2,901 credits (live-api)
  Permanent floor (1000) intact                  YES

  NOTE: census spend (FIDS/S1, probes, diagnostics) is tracked on the
  REST line (1,000 units), NEVER against the 57,900 refill envelope (§3.2).

~/workspace$ npm run coverage

> rest-express@1.0.1 coverage
> tsx scripts/measure_coverage.ts

Measuring AeroDataBox airport coverage (forces a fresh fetch)...

fetchedAt                 : 2026-08-17T12:21:07.097Z
universeCount (union)     : 4332
worldScheduledCommercial  : 4072 (ATAG 2023)
catalogCount (ours)       : 276
catalogInUniverse         : 267
catalogMissingFromUniverse: 9
universeNotInCatalog      : 4065
byTier (ours, in universe):
  HUB       30/30
  MID       89/87
  REGIONAL  157/150

Frame note: frame = measured universe; directly-collectable = catalog ∩ universe.
~/workspace$ 