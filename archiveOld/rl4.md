~/workspace$ git pull origin main
remote: Enumerating objects: 14, done.
remote: Counting objects: 100% (14/14), done.
remote: Compressing objects: 100% (1/1), done.
remote: Total 8 (delta 7), reused 8 (delta 7), pack-reused 0 (from 0)
Unpacking objects: 100% (8/8), 6.16 KiB | 21.00 KiB/s, done.
From https://github.com/HKcode22/ReplitTranvr
 * branch            main       -> FETCH_HEAD
   4e88b1e..e283254  main       -> origin/main
Updating 4e88b1e..e283254
Fast-forward
 AugMDnotes/IMPLEMENTATION_LOG.md   | 340 ++++++++++++++++++++++++++++++++------------------
 AugMDnotes/replitLogs3.md          | 151 ++++++++++++++++++++++
 scripts/check_collection_health.ts |  27 ++--
 scripts/gate0_budget_report.ts     |  23 +++-
 4 files changed, 407 insertions(+), 134 deletions(-)
 create mode 100644 AugMDnotes/replitLogs3.md
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
6:21:35 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
~/workspace$ npm run logs

> rest-express@1.0.1 logs
> tail -f logs/collector.log

[2026-08-17T06:21:34.863Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T06:21:34.868Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T06:21:34.869Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T06:21:34.889Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T06:21:34.905Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T06:21:35.479Z] [log] 6:21:35 AM [express] serving on port 5000
[2026-08-17T06:21:35.480Z] [log] Initializing Stripe schema...
[2026-08-17T06:21:35.886Z] [log] Stripe schema ready
[2026-08-17T06:21:36.253Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T06:21:36.254Z] [log] Stripe data synced

~/workspace$ npm run logs:last

> rest-express@1.0.1 logs:last
> tail -200 logs/collector.log

[2026-08-17T02:07:05.286Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T02:07:05.290Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T02:07:05.301Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T02:07:06.001Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T02:07:06.007Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T02:07:06.013Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T02:07:06.017Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T02:07:06.021Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T02:07:06.025Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T02:07:06.031Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T02:07:06.035Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T02:07:06.164Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-17T02:07:06.249Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T02:07:07.595Z] [log] 2:07:07 AM [express] serving on port 5000
[2026-08-17T02:07:07.595Z] [log] Initializing Stripe schema...
[2026-08-17T02:07:08.363Z] [log] Stripe schema ready
[2026-08-17T02:07:08.984Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T02:07:08.996Z] [log] Stripe data synced
[2026-08-17T02:17:07.153Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8100min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T02:17:07.291Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8100min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-17T02:18:49.272Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-17T02:18:51.478Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-17T02:18:54.218Z] [log] 2:18:54 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-17T02:27:06.905Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8109min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T02:37:06.786Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8119min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T02:47:06.777Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8129min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T02:51:27.855Z] [log] 2:51:27 AM [express] GET /api/auth/user 401 in 2ms body=31b
[2026-08-17T02:55:23.326Z] [log] 2:55:23 AM [express] GET /api/auth/user 401 in 1ms body=31b
[2026-08-17T02:57:06.845Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8139min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T02:57:06.848Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8139min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-17T03:07:06.895Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8149min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T03:17:06.952Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8159min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T03:27:06.840Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8169min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T03:27:06.905Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8169min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-17T03:37:06.917Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=8179min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-17T03:40:07.351Z] [log] 3:40:07 AM [express] GET /api/auth/user 401 in 2ms body=31b
[2026-08-17T03:40:29.546Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T03:40:30.022Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T03:40:30.127Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T03:40:30.131Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T03:40:30.134Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T03:40:30.136Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T03:40:30.139Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T03:40:30.201Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T03:40:31.120Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T03:40:31.126Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T03:40:31.174Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T03:40:31.178Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T03:40:31.182Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T03:40:31.184Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T03:40:31.190Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T03:40:31.196Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T03:40:31.292Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T03:40:31.377Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T03:41:04.638Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T03:41:04.680Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T03:41:04.684Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T03:41:04.688Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T03:41:04.692Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T03:41:04.693Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T03:41:04.696Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T03:41:04.700Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T03:41:05.336Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T03:41:05.344Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T03:41:05.349Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T03:41:05.352Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T03:41:05.357Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T03:41:05.360Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T03:41:05.364Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T03:41:05.367Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T03:41:05.384Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T03:41:05.398Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T03:44:31.577Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T03:44:31.598Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T03:44:31.603Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T03:44:31.606Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T03:44:31.610Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T03:44:31.611Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T03:44:31.615Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T03:44:31.621Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T03:44:31.961Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T03:44:31.965Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T03:44:31.977Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T03:44:31.982Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T03:44:31.986Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T03:44:31.990Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T03:44:31.995Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T03:44:32.001Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T03:44:32.020Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T03:44:32.044Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T03:44:58.101Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T03:44:58.118Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T03:44:58.122Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T03:44:58.126Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T03:44:58.130Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T03:44:58.132Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T03:44:58.135Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T03:44:58.140Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T03:44:58.396Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T03:44:58.400Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T03:44:58.405Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T03:44:58.408Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T03:44:58.413Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
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
[2026-08-17T04:04:59.384Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8207min canStart=true
[2026-08-17T04:14:59.711Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8217min canStart=true
[2026-08-17T04:25:00.046Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8227min canStart=true
[2026-08-17T04:25:00.201Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8227min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-17T04:35:00.092Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8237min canStart=true
[2026-08-17T04:45:00.346Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8247min canStart=true
[2026-08-17T04:55:00.486Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8257min canStart=true
[2026-08-17T04:55:00.568Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8257min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-17T05:05:01.084Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8267min canStart=true
[2026-08-17T05:15:00.955Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8277min canStart=true
[2026-08-17T05:25:01.108Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=8287min canStart=true
[2026-08-17T05:25:01.307Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 8287min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-17T06:15:10.649Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T06:15:11.014Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T06:15:11.019Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T06:15:11.022Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T06:15:11.035Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T06:15:11.039Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T06:15:11.048Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T06:15:11.059Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T06:15:11.730Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T06:15:11.736Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T06:15:11.750Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T06:15:11.753Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T06:15:11.757Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T06:15:11.761Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T06:15:11.768Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T06:15:11.772Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T06:15:11.841Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T06:15:11.927Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T06:15:13.186Z] [log] 6:15:13 AM [express] serving on port 5000
[2026-08-17T06:15:13.187Z] [log] Initializing Stripe schema...
[2026-08-17T06:15:14.455Z] [log] Stripe schema ready
[2026-08-17T06:15:14.893Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-17T06:15:17.355Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-17T06:15:18.109Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T06:15:18.110Z] [log] Stripe data synced
[2026-08-17T06:15:19.866Z] [log] 6:15:19 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-17T06:17:53.445Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T06:17:53.498Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T06:17:53.502Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T06:17:53.505Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T06:17:53.516Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T06:17:53.518Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T06:17:53.522Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T06:17:53.527Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T06:17:53.932Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T06:17:53.936Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T06:17:53.950Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T06:17:53.954Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T06:17:53.960Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T06:17:53.963Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T06:17:53.969Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T06:17:53.970Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T06:17:53.988Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T06:17:54.006Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T06:21:34.376Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-17T06:21:34.435Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-17T06:21:34.447Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-17T06:21:34.450Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-17T06:21:34.454Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-17T06:21:34.459Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-17T06:21:34.466Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-17T06:21:34.471Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-17T06:21:34.835Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-17T06:21:34.839Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-17T06:21:34.852Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-17T06:21:34.855Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-17T06:21:34.860Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-17T06:21:34.863Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-17T06:21:34.868Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-17T06:21:34.869Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-17T06:21:34.889Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-17T06:21:34.905Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-17T06:21:35.479Z] [log] 6:21:35 AM [express] serving on port 5000
[2026-08-17T06:21:35.480Z] [log] Initializing Stripe schema...
[2026-08-17T06:21:35.886Z] [log] Stripe schema ready
[2026-08-17T06:21:36.253Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-17T06:21:36.254Z] [log] Stripe data synced
~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 8344 min ago — data has stalled
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




