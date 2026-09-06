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
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
3:44:59 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced

> rest-express@1.0.1 logs
> tail -f logs/collector.log

[2026-08-17T03:44:58.417Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T03:44:58.422Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T03:44:58.424Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T03:44:58.445Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T03:44:58.467Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T03:44:59.222Z] [log] 3:44:59 AM [express] serving on port 5000
[2026-08-17T03:44:59.222Z] [log] Initializing Stripe schema...
[2026-08-17T03:45:01.212Z] [log] Stripe schema ready
[2026-08-17T03:45:02.031Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T03:45:02.033Z] [log] Stripe data synced
~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 8189 min ago — data has stalled
FAIL  balance                      866 — below reserve+min (1300), refill soon
PASS  rows today                   0
PASS  rows total                   4316
FAIL  active batch                 none running right now (idle)

HEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last
~/workspace$ 

~/workspace$ npm run logs

> rest-express@1.0.1 logs
> tail -f logs/collector.log

[2026-08-17T03:44:58.417Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T03:44:58.422Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T03:44:58.424Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T03:44:58.445Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T03:44:58.467Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T03:44:59.222Z] [log] 3:44:59 AM [express] serving on port 5000
[2026-08-17T03:44:59.222Z] [log] Initializing Stripe schema...
[2026-08-17T03:45:01.212Z] [log] Stripe schema ready
[2026-08-17T03:45:02.031Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T03:45:02.033Z] [log] Stripe data synced
[2026-08-17T03:54:59.138Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8197min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T03:54:59.365Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8197min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health

~/workspace$ pkill -9 -f server/index.ts
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
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
3:44:59 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
[adb-collector] heartbeat balance=862 rowsToday=0 gap=8197min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[adb-collector] ⚠ ALERT data gap: no row for 8197min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health

~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 8189 min ago — data has stalled
FAIL  balance                      866 — below reserve+min (1300), refill soon
PASS  rows today                   0
PASS  rows total                   4316
FAIL  active batch                 none running right now (idle)

HEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last
~/workspace$ npm run refill 

> rest-express@1.0.1 refill
> tsx scripts/refill_credits.ts

Flight-Alert balance (read-only):
  creditsRemaining : 862
  lastRefilledUtc  : 2026-08-10 01:15
  lastDeductedUtc  : 2026-08-11 11:17
To refill (billing): npm run refill -- <credits>   # 1 unit = 1 credit
~/workspace$ npm run refill -- 1 

> rest-express@1.0.1 refill
> tsx scripts/refill_credits.ts 1

Refilling 1 credit(s) via POST /subscriptions/balance/refill ...
Success. New balance:
  creditsRemaining : 863
  lastRefilledUtc  : 2026-08-17 03:55Z
  lastDeductedUtc  : 2026-08-11 11:17
~/workspace$ npm run refill -- 2038

> rest-express@1.0.1 refill
> tsx scripts/refill_credits.ts 2038

Refilling 2038 credit(s) via POST /subscriptions/balance/refill ...
Success. New balance:
  creditsRemaining : 2901
  lastRefilledUtc  : 2026-08-17 03:55Z
  lastDeductedUtc  : 2026-08-11 11:17
~/workspace$ 