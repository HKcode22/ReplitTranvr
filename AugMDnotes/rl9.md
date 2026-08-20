~/workspace$ git pull origin main
remote: Enumerating objects: 16, done.
remote: Counting objects: 100% (16/16), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 9 (delta 6), reused 9 (delta 6), pack-reused 0 (from 0)
Unpacking objects: 100% (9/9), 36.71 KiB | 709.00 KiB/s, done.
From https://github.com/HKcode22/ReplitTranvr
 * branch            main       -> FETCH_HEAD
   73affad..6bcea50  main       -> origin/main
Updating 73affad..6bcea50
Fast-forward
 AugMDnotes/IMPLEMENTATION_LOG.md         | 2646 ++++++++++++++++++++++++++++++++++++++------------------------------------------
 AugMDnotes/rl8.md                        |  314 ++++++++++
 migrations/0023_anchor_probe_results.sql |   16 +-
 scripts/anchor_probe.ts                  |  216 ++++++-
 4 files changed, 1796 insertions(+), 1396 deletions(-)
 create mode 100644 AugMDnotes/rl8.md
~/workspace$ pkill -9 -f node
~/workspace$ ADB_AUTO_COLLECT=0 npm run dev

> rest-express@1.0.1 dev
> NODE_ENV=development tsx --watch server/index.ts

[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[migrations] applied 0010_flight_data_pre_post.sql
[migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[migrations] applied 0012_collection_sampling.sql
[migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[migrations] applied 0015_collection_v33_sampling_meta.sql
[migrations] applied 0017_collection_v39_credit_accounting.sql
[migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[migrations] applied 0019_collection_v39_population_and_events.sql
[migrations] applied 0020_collection_v39_airborne_time_series.sql
[migrations] applied 0021_collection_v39_sampling_frame.sql
[migrations] applied 0022_collection_v39_design_probability.sql
[migrations] applied 0023_anchor_probe_results.sql
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
1:13:44 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
~/workspace$ git pull origin main
remote: Enumerating objects: 16, done.
remote: Counting objects: 100% (16/16), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 9 (delta 6), reused 9 (delta 6), pack-reused 0 (from 0)
Unpacking objects: 100% (9/9), 36.71 KiB | 709.00 KiB/s, done.
From https://github.com/HKcode22/ReplitTranvr
 * branch            main       -> FETCH_HEAD
   73affad..6bcea50  main       -> origin/main
Updating 73affad..6bcea50
Fast-forward
 AugMDnotes/IMPLEMENTATION_LOG.md         | 2646 ++++++++++++++++++++++++++++++++++++++------------------------------------------
 AugMDnotes/rl8.md                        |  314 ++++++++++
 migrations/0023_anchor_probe_results.sql |   16 +-
 scripts/anchor_probe.ts                  |  216 ++++++-
 4 files changed, 1796 insertions(+), 1396 deletions(-)
 create mode 100644 AugMDnotes/rl8.md
~/workspace$ pkill -9 -f node
~/workspace$ ADB_AUTO_COLLECT=0 npm run dev

> rest-express@1.0.1 dev
> NODE_ENV=development tsx --watch server/index.ts

[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[migrations] applied 0010_flight_data_pre_post.sql
[migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[migrations] applied 0012_collection_sampling.sql
[migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[migrations] applied 0015_collection_v33_sampling_meta.sql
[migrations] applied 0017_collection_v39_credit_accounting.sql
[migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[migrations] applied 0019_collection_v39_population_and_events.sql
[migrations] applied 0020_collection_v39_airborne_time_series.sql
[migrations] applied 0021_collection_v39_sampling_frame.sql
[migrations] applied 0022_collection_v39_design_probability.sql
[migrations] applied 0023_anchor_probe_results.sql
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
1:13:44 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
1:15:22 AM [express] GET /api/v1/webhooks/aerodatabox 200 in 43ms body=0b
Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme

A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
~/workspace$ npm run anchor-probe -- --check-webhook

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --check-webhook

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.

Webhook reachability check (Gate 3/0.5 pre-requisite):

  defaultWebhookUrl() : https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev:443/api/v1/webhooks/aerodatabox
  REPLIT_DOMAINS       : set  (WEBHOOK_BASE_URL override: no)
  AERODATABOX_WEBHOOK_SECRET : not set
  live server running  : check a boot line 'serving on port 5000' — the webhook route POST /api/v1/webhooks/aerodatabox(:secret) must be up for deliveries.

  probing URL from the Replit box (GET — the route expects POST, so any
  HTTP status like 404/405 still PROVES the URL is reachable; a network
  error means AeroDataBox cannot reach us either):
  → HTTP 200 — OK

Note: the 2026-08-18 rl8 probe created subscriptions but zero deliveries arrived (balance stayed 2901, rowsToday=0 for hours). Verify this URL is publicly reachable before re-running stage 1, otherwise probes are wasted windows.
~/workspace$ 
~/workspace$ npm run anchor-probe -- --check-webhook

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --check-webhook

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.

Webhook reachability check (Gate 3/0.5 pre-requisite):

  defaultWebhookUrl() : https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev:443/api/v1/webhooks/aerodatabox
  REPLIT_DOMAINS       : set  (WEBHOOK_BASE_URL override: no)
  AERODATABOX_WEBHOOK_SECRET : not set
  live server running  : check a boot line 'serving on port 5000' — the webhook route POST /api/v1/webhooks/aerodatabox(:secret) must be up for deliveries.

  probing URL from the Replit box (GET — the route expects POST, so any
  HTTP status like 404/405 still PROVES the URL is reachable; a network
  error means AeroDataBox cannot reach us either):
  → HTTP 200 — OK

Note: the 2026-08-18 rl8 probe created subscriptions but zero deliveries arrived (balance stayed 2901, rowsToday=0 for hours). Verify this URL is publicly reachable before re-running stage 1, otherwise probes are wasted windows.
~/workspace$ npm run anchor-probe -- --cleanup

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --cleanup

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.

R1 orphan cleanup — searching for probe subscriptions left 'probing'...
  probe-owned orphan subs deleted: 0 of 0
  no other ACTIVE credit-based subscriptions on the account.
cleanup done.
~/workspace$ npm run health
npm run gate0

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 12367 min ago — data has stalled
PASS  balance                      2901 credits (live-api)
PASS  rows today                   0
PASS  rows total                   4316
FAIL  active batch                 none running right now (idle)

HEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last

> rest-express@1.0.1 gate0
> tsx scripts/gate0_budget_report.ts


══════════════════════════════════════════════════════
GATE-0 BUDGET-PARTITION REPORT (plan §3.2)
══════════════════════════════════════════════════════

  Plan (VERIFY at Gate 0)                        ULTRA
  Monthly API units (VERIFY)                     60000
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
~/workspace$ npm run canary

> rest-express@1.0.1 canary
> tsx scripts/credit_canary.ts

V3.9 credit canary — one tiny controlled batch (maxDeliveryRetries=0)

balance_before          : 2901
existing subscriptions : 0 (foreign ACTIVE billable: 0)
subscription            : 01d241f6-f8ba-440b-a0f5-7e58121f9bf3 (KLAX, maxDeliveryRetries=0)
waiting 120s for deliveries (webhook must be reachable)...
/workspace$ npm run canary

> rest-express@1.0.1 canary
> tsx scripts/credit_canary.ts

V3.9 credit canary — one tiny controlled batch (maxDeliveryRetries=0)

balance_before          : 2901
existing subscriptions : 0 (foreign ACTIVE billable: 0)
subscription            : 01d241f6-f8ba-440b-a0f5-7e58121f9bf3 (KLAX, maxDeliveryRetries=0)
waiting 120s for deliveries (webhook must be reachable)...
subscription deleted    : yes
settling 5s for in-flight deliveries...
balance_after           : 2900
C_external (balance Δ)  : 1
C_internal (items)      : 0
rows stored/ins/upd/skip: 0 / 0 / 0 / 0
delivery_failures       : 1
tolerance               : 3
result                  : FAIL
Delivery failures observed — PAUSE and inspect the webhook path (gate 10).
~/workspace$ 
~/workspace$ npm run anchor-probe -- --stage 1 --icao WSSS

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --stage 1 --icao WSSS

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.


=== PROBE WSSS (stage 1, 2h window, Asia-Pacific) ===
  feed membership check: covered
  balance_before: 2900
  subscription: 6a73207d-98aa-4f96-9151-36fc3e3e1271  isActive=true  activateBeforeUtc=n/a
  probing 2h — deliveries must reach the live webhook...
