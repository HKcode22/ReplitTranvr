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
[migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
Boot migrations failed: column "loc_reported_utc" does not exist
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
2:47:16 PM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
~/workspace$ npm run logs

> rest-express@1.0.1 logs
> tail -f logs/collector.log

[2026-08-16T14:47:14.176Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T14:47:14.189Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.190Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.352Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T14:47:14.499Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T14:47:16.044Z] [log] 2:47:16 PM [express] serving on port 5000
[2026-08-16T14:47:16.044Z] [log] Initializing Stripe schema...
[2026-08-16T14:47:16.904Z] [log] Stripe schema ready
[2026-08-16T14:47:17.669Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T14:47:17.670Z] [log] Stripe data synced

~/workspace$ tail -n 1000 logs/collector.log
[2026-08-12T01:06:40.101Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:07:40.103Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:08:40.155Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:09:40.138Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:10:40.129Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:11:40.162Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:12:40.137Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:13:40.140Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:14:40.149Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:15:39.294Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=838min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T01:15:39.296Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 838min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T01:15:41.141Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:16:40.135Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:17:40.154Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:18:40.141Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:19:40.123Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:20:40.119Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:21:40.167Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:22:40.186Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:23:40.152Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:24:40.467Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:25:39.245Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=848min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T01:25:41.120Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:26:40.149Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:27:40.121Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:28:40.158Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:29:40.142Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:30:40.141Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:31:40.156Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:32:40.134Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:33:40.156Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:34:40.148Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:35:39.257Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=858min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T01:35:41.139Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:36:40.149Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:37:40.160Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:39:33.426Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-12T01:39:33.630Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-12T01:39:33.636Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-12T01:39:33.640Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-12T01:39:33.644Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-12T01:39:33.648Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-12T01:39:33.657Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-12T01:39:33.668Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-12T01:39:34.152Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-12T01:39:34.160Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-12T01:39:34.166Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-12T01:39:34.292Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":2}, autoCollect=true)
[2026-08-12T01:39:34.454Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-12T01:39:35.633Z] [log] 1:39:35 AM [express] serving on port 5000
[2026-08-12T01:39:35.633Z] [log] Initializing Stripe schema...
[2026-08-12T01:39:36.394Z] [log] Stripe schema ready
[2026-08-12T01:39:37.231Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-12T01:39:37.232Z] [log] Stripe data synced
[2026-08-12T01:40:35.743Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:41:35.637Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:42:35.663Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:43:35.663Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:44:35.679Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:45:35.740Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:46:35.777Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:47:35.765Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:48:35.800Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:49:35.187Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=872min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T01:49:35.189Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 872min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T01:49:36.846Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:50:35.837Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:51:35.884Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:52:35.890Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:53:35.935Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:54:35.940Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:55:35.945Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:56:35.965Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:57:35.988Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:58:36.032Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T01:59:35.144Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=882min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T01:59:37.026Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:00:36.065Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:01:36.074Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:02:36.114Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:03:36.095Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:04:36.134Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:05:36.161Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:06:36.178Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:07:36.207Z] [warn] [adb-collector] auto-start skipped: Credits too low for a batch: 862 remaining, need reserve 1000 + min batch 300 (budget cap 3000). Refill first.
[2026-08-12T02:07:47.285Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-12T02:07:48.929Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-12T02:07:51.728Z] [log] 2:07:51 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-12T02:07:51.843Z] [log] 2:07:51 AM [express] GET /api/auth/user 401 in 1ms body=31b
[2026-08-12T08:01:50.174Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-12T08:01:50.525Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-12T08:01:50.530Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-12T08:01:50.535Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-12T08:01:50.538Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-12T08:01:50.540Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-12T08:01:50.552Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-12T08:01:50.560Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-12T08:01:51.296Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-12T08:01:51.302Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-12T08:01:51.308Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-12T08:01:51.452Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":2}, autoCollect=true)
[2026-08-12T08:01:51.587Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-12T08:01:53.905Z] [log] 8:01:53 AM [express] serving on port 5000
[2026-08-12T08:01:53.906Z] [log] Initializing Stripe schema...
[2026-08-12T08:01:53.959Z] [log] Stripe schema ready
[2026-08-12T08:01:55.382Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-12T08:01:55.780Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-12T08:01:55.822Z] [log] Stripe data synced
[2026-08-12T08:01:56.914Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-12T08:02:00.577Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-12T08:02:00.588Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-12T08:02:00.591Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-12T08:02:00.595Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-12T08:02:00.598Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-12T08:02:00.599Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-12T08:02:00.602Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-12T08:02:00.606Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-12T08:02:00.737Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-12T08:02:00.741Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-12T08:02:00.745Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-12T08:02:00.752Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-12T08:02:00.912Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-12T08:02:00.958Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-12T08:02:00.975Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-12T08:02:01.519Z] [log] 8:02:01 AM [express] serving on port 5000
[2026-08-12T08:02:01.519Z] [log] Initializing Stripe schema...
[2026-08-12T08:02:01.903Z] [log] Stripe schema ready
[2026-08-12T08:02:02.339Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-12T08:02:03.318Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-12T08:02:05.212Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-12T08:02:05.214Z] [log] Stripe data synced
[2026-08-12T08:02:06.413Z] [log] 8:02:06 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-12T08:12:01.636Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1254min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T08:12:01.739Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1254min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T08:22:01.385Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1264min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T08:32:01.325Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1274min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T08:42:01.348Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1284min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T08:52:01.357Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1294min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T08:52:01.575Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1294min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T09:02:01.351Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1304min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T09:12:01.511Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1314min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T09:22:01.538Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1324min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T09:22:01.727Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1324min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T09:32:01.370Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1334min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T09:42:01.398Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1344min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T09:52:01.390Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1354min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:02:01.472Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1364min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:02:01.772Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1364min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T10:12:01.535Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1374min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:22:01.411Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1384min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:32:01.417Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1394min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:42:01.809Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1404min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T10:42:02.025Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1404min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T10:52:01.885Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1414min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:02:01.604Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1424min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:12:01.440Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1434min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:22:01.516Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1444min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:22:01.699Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1444min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T11:32:01.520Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1454min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:42:01.630Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1464min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:52:01.515Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1474min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T11:52:01.920Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1474min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T12:02:01.523Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1484min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T12:12:01.515Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1494min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T12:22:01.523Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1504min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T12:32:01.830Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1514min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T12:32:02.058Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1514min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T12:42:02.183Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1524min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T12:52:01.564Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1534min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:02:01.593Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1544min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:12:01.577Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1554min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:12:01.761Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1554min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T13:22:01.716Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1564min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:32:01.596Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1574min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:42:01.581Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1584min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T13:42:01.780Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1584min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T13:52:01.586Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1594min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T14:01:58.391Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-12T14:01:58.593Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-12T14:01:58.599Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-12T14:01:58.603Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-12T14:01:58.607Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-12T14:01:58.611Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-12T14:01:58.621Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-12T14:01:58.636Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-12T14:01:59.263Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-12T14:01:59.273Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-12T14:01:59.279Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-12T14:01:59.284Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-12T14:01:59.288Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-12T14:01:59.407Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-12T14:01:59.549Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-12T14:02:00.989Z] [log] 2:02:00 PM [express] serving on port 5000
[2026-08-12T14:02:00.990Z] [log] Initializing Stripe schema...
[2026-08-12T14:02:01.949Z] [log] Stripe schema ready
[2026-08-12T14:02:02.793Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-12T14:02:02.796Z] [log] Stripe data synced
[2026-08-12T14:12:00.367Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1614min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T14:12:00.434Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1614min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T14:22:00.363Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1624min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T14:32:12.530Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1635min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T14:42:00.709Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1644min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T14:42:00.825Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1644min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T14:52:01.334Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1654min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:02:01.189Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1664min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:12:01.532Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1674min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:12:01.598Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1674min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T15:22:01.689Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1684min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:32:01.924Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1694min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:42:02.148Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1704min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T15:42:02.209Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1704min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T15:52:02.620Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1714min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:02:02.720Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1724min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:12:02.825Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1734min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:12:02.931Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1734min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T16:22:03.093Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1744min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:32:03.383Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1754min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:42:03.416Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1764min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T16:42:03.569Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1764min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T16:52:04.008Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1774min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:02:04.199Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1784min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:12:04.055Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1794min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:12:04.205Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1794min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T17:22:04.275Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1804min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:32:04.578Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1814min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:42:04.783Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1824min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T17:42:04.975Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1824min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T17:52:05.021Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1834min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:02:05.255Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1844min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:12:05.803Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1854min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:12:05.997Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1854min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T18:22:05.744Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1864min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:32:05.986Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1874min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:42:06.243Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1884min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T18:42:06.538Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1884min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T18:52:06.502Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1894min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:02:07.040Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1905min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:12:07.039Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1915min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:12:07.253Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1915min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T19:22:07.254Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1925min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:32:07.294Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1935min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:42:07.580Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1945min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-12T19:42:07.797Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 1945min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-12T19:52:07.848Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=1955min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T01:28:19.952Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T01:28:20.174Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T01:28:20.179Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T01:28:20.182Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T01:28:20.186Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T01:28:20.189Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T01:28:20.199Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T01:28:20.208Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T01:28:20.783Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T01:28:20.788Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T01:28:20.793Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T01:28:20.797Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T01:28:20.801Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T01:28:20.911Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T01:28:21.027Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T01:28:22.662Z] [log] 1:28:22 AM [express] serving on port 5000
[2026-08-13T01:28:22.662Z] [log] Initializing Stripe schema...
[2026-08-13T01:28:24.243Z] [log] Stripe schema ready
[2026-08-13T01:28:24.453Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-13T01:28:26.017Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-13T01:28:27.759Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T01:28:27.761Z] [log] Stripe data synced
[2026-08-13T01:28:28.169Z] [log] 1:28:28 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-13T01:38:21.710Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2301min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T01:38:21.800Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2301min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T01:48:21.353Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2311min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T01:58:21.357Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2321min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:01:55.054Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T02:01:55.211Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T02:01:55.215Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T02:01:55.218Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T02:01:55.222Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T02:01:55.224Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T02:01:55.239Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T02:01:55.248Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T02:01:55.662Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T02:01:55.667Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T02:01:55.673Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T02:01:55.677Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T02:01:55.683Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T02:01:55.805Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T02:01:55.941Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T02:01:58.204Z] [log] 2:01:58 AM [express] serving on port 5000
[2026-08-13T02:01:58.205Z] [log] Initializing Stripe schema...
[2026-08-13T02:01:58.251Z] [log] Stripe schema ready
[2026-08-13T02:01:58.691Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T02:01:58.694Z] [log] Stripe data synced
[2026-08-13T02:01:59.797Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-13T02:02:01.115Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-13T02:02:03.065Z] [log] 2:02:03 AM [express] GET /api/auth/user 401 in 2ms body=31b
[2026-08-13T02:11:56.396Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2334min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:11:56.498Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2334min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T02:21:56.252Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2344min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:31:56.197Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2354min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:41:56.183Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2364min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:51:56.506Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2374min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T02:51:56.596Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2374min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T03:01:56.212Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2384min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:11:56.259Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2394min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:21:56.194Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2404min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:31:56.271Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2414min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:31:56.292Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2414min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T03:41:56.337Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2424min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:46:32.093Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T03:46:32.250Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T03:46:32.256Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T03:46:32.260Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T03:46:32.264Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T03:46:32.268Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T03:46:32.277Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T03:46:32.285Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T03:46:32.850Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T03:46:32.855Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T03:46:32.862Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T03:46:32.865Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T03:46:32.871Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T03:46:32.952Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T03:46:33.029Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T03:46:34.227Z] [log] 3:46:34 AM [express] serving on port 5000
[2026-08-13T03:46:34.228Z] [log] Initializing Stripe schema...
[2026-08-13T03:46:34.970Z] [log] Stripe schema ready
[2026-08-13T03:46:35.692Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T03:46:35.694Z] [log] Stripe data synced
[2026-08-13T03:56:33.668Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2439min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T03:56:33.768Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2439min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T04:06:33.802Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2449min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:16:33.995Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2459min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:18:39.841Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-13T04:18:41.542Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-13T04:18:44.939Z] [log] 4:18:44 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-13T04:26:34.073Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2469min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:26:34.158Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2469min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T04:36:34.106Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2479min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:46:34.064Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2489min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:56:34.073Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2499min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T04:56:34.170Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2499min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T05:06:34.127Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2509min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T05:16:34.135Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2519min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T05:26:34.124Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2529min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T05:26:34.314Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2529min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T05:36:34.104Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2539min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T05:46:34.099Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2549min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T05:56:34.135Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2559min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T06:06:09.411Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T06:06:09.590Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T06:06:09.598Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T06:06:09.602Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T06:06:09.606Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T06:06:09.610Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T06:06:09.625Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T06:06:09.641Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T06:06:09.920Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T06:06:09.927Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T06:06:09.933Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T06:06:09.938Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T06:06:09.944Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T06:06:10.016Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T06:06:10.098Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T06:06:11.308Z] [log] 6:06:11 AM [express] serving on port 5000
[2026-08-13T06:06:11.308Z] [log] Initializing Stripe schema...
[2026-08-13T06:06:12.163Z] [log] Stripe schema ready
[2026-08-13T06:06:12.988Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T06:06:12.989Z] [log] Stripe data synced
[2026-08-13T06:16:11.105Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2579min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T06:16:11.195Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2579min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T06:26:10.919Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2589min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T06:34:46.335Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-13T06:34:47.956Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-13T06:34:50.260Z] [log] 6:34:50 AM [express] GET /api/auth/user 401 in 2ms body=31b
[2026-08-13T06:36:11.107Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2599min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T06:46:11.109Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2609min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T06:46:11.246Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2609min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T06:56:11.093Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2619min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:06:11.077Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2629min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:16:11.104Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2639min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:26:11.114Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2649min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:26:11.200Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2649min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T07:36:11.212Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2659min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:46:11.135Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2669min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:56:11.177Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2679min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T07:56:11.256Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2679min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T08:01:55.542Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T08:01:55.726Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T08:01:55.734Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T08:01:55.737Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T08:01:55.742Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T08:01:55.745Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T08:01:55.757Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T08:01:55.765Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T08:01:56.215Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T08:01:56.223Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T08:01:56.229Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T08:01:56.236Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T08:01:56.242Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T08:01:56.386Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T08:01:56.578Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T08:01:57.734Z] [log] 8:01:57 AM [express] serving on port 5000
[2026-08-13T08:01:57.735Z] [log] Initializing Stripe schema...
[2026-08-13T08:01:58.476Z] [log] Stripe schema ready
[2026-08-13T08:01:59.191Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T08:01:59.193Z] [log] Stripe data synced
[2026-08-13T08:11:57.369Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2694min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T08:11:57.454Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2694min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T08:21:57.211Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2704min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T08:31:57.422Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2714min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T08:41:57.662Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2724min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T08:41:57.766Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2724min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T08:51:57.779Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2734min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:01:58.036Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2744min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:11:58.327Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2754min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:11:58.431Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2754min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T09:21:58.600Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2764min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:31:58.740Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2774min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:41:58.924Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2784min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T09:41:59.022Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2784min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T09:51:59.112Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2794min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:01:59.365Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2804min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:11:59.606Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2814min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:11:59.725Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2814min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T10:21:59.824Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2824min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:32:00.091Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2834min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:42:00.331Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2844min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T10:42:00.515Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2844min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T10:52:00.546Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2854min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:02:00.725Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2864min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:12:01.005Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2874min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:12:01.226Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2874min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T11:22:01.328Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2884min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:32:01.527Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2894min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:42:01.776Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2904min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T11:42:01.994Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2904min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T11:52:01.976Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2914min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:02:02.171Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2924min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:12:02.479Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2934min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:12:02.729Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2934min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T12:22:02.660Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2944min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:32:03.279Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2954min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:42:03.177Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2964min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T12:42:03.405Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2964min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T12:52:03.363Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2974min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:02:03.556Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2984min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:12:03.814Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=2994min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:12:03.987Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 2994min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T13:22:04.069Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3004min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:32:04.430Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3014min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:42:04.505Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3024min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T13:42:04.721Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3024min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T13:52:04.785Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3034min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:02:04.884Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T20:02:05.174Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T20:02:05.194Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T20:02:05.199Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T20:02:05.204Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T20:02:05.208Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T20:02:05.220Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T20:02:05.235Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T20:02:05.917Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T20:02:05.923Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T20:02:05.929Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T20:02:05.933Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T20:02:05.939Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T20:02:06.104Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T20:02:06.267Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T20:02:08.577Z] [log] 8:02:08 PM [express] serving on port 5000
[2026-08-13T20:02:08.577Z] [log] Initializing Stripe schema...
[2026-08-13T20:02:08.693Z] [log] Stripe schema ready
[2026-08-13T20:02:09.446Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T20:02:09.447Z] [log] Stripe data synced
[2026-08-13T20:09:06.668Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-13T20:09:09.150Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-13T20:09:10.208Z] [log] 8:09:10 PM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-13T20:12:06.934Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3414min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:12:07.028Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3414min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T20:22:06.643Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3424min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:32:06.671Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3434min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:42:06.667Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3444min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:52:06.645Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3454min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T20:52:06.767Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3454min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T21:02:06.663Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3464min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T21:12:07.004Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3475min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T21:22:06.693Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3484min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T21:22:07.028Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3484min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T21:32:06.693Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3494min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T21:42:06.741Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3504min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T21:52:06.685Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3514min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:02:07.026Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3525min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:02:07.254Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3525min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T22:12:06.706Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3534min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:22:06.716Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3544min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:32:06.711Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3554min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:42:06.730Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3564min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T22:42:07.004Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3564min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T22:52:06.762Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3574min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:02:06.731Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3584min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:12:06.904Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3594min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:12:07.106Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3594min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T23:22:06.749Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3604min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:32:06.894Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3614min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:42:06.771Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3624min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:52:06.760Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3634min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-13T23:52:07.000Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3634min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-13T23:57:24.870Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-13T23:57:25.074Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-13T23:57:25.080Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-13T23:57:25.084Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-13T23:57:25.088Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-13T23:57:25.092Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-13T23:57:25.103Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-13T23:57:25.117Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-13T23:57:25.509Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-13T23:57:25.516Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-13T23:57:25.525Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-13T23:57:25.529Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-13T23:57:25.535Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-13T23:57:25.630Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-13T23:57:25.798Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-13T23:57:27.301Z] [log] 11:57:27 PM [express] serving on port 5000
[2026-08-13T23:57:27.302Z] [log] Initializing Stripe schema...
[2026-08-13T23:57:28.160Z] [log] Stripe schema ready
[2026-08-13T23:57:28.941Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-13T23:57:28.942Z] [log] Stripe data synced
[2026-08-14T00:07:26.505Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3650min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T00:07:26.623Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3650min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T00:17:26.473Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3660min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T00:27:26.683Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3670min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T00:37:26.947Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3680min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T00:37:27.063Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3680min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T00:47:27.594Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3690min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T00:57:27.443Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3700min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:07:27.648Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3710min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:07:27.769Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3710min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T01:17:27.908Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3720min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:27:28.148Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3730min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:37:28.300Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3740min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:37:28.395Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 3740min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T01:47:28.482Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3750min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T01:57:28.682Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=3760min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T08:02:17.029Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-14T08:02:17.353Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-14T08:02:17.359Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-14T08:02:17.362Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-14T08:02:17.367Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-14T08:02:17.371Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-14T08:02:17.380Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-14T08:02:17.389Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-14T08:02:18.038Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-14T08:02:18.045Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-14T08:02:18.051Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-14T08:02:18.055Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-14T08:02:18.060Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-14T08:02:18.153Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-14T08:02:18.292Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-14T08:02:19.873Z] [log] 8:02:19 AM [express] serving on port 5000
[2026-08-14T08:02:19.873Z] [log] Initializing Stripe schema...
[2026-08-14T08:02:20.722Z] [log] Stripe schema ready
[2026-08-14T08:02:21.485Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-14T08:02:21.487Z] [log] Stripe data synced
[2026-08-14T08:12:19.129Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4135min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T08:12:19.223Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4135min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T08:22:19.021Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4145min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T08:32:19.255Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4155min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T08:42:19.498Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4165min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T08:42:19.590Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4165min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T08:52:19.787Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4175min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:02:20.072Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4185min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:12:20.257Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4195min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:12:20.336Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4195min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T09:22:20.521Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4205min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:32:20.677Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4215min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:42:20.965Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4225min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T09:42:21.061Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4225min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T09:52:21.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4235min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:02:21.420Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4245min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:12:21.714Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4255min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:12:21.883Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4255min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T10:22:21.873Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4265min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:32:22.255Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4275min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:42:22.357Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4285min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T10:42:22.544Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4285min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T10:52:22.708Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4295min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:02:22.890Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4305min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:12:23.091Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4315min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:12:23.372Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4315min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T11:22:23.262Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4325min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:27:23.341Z] [warn] [adb-v3] listSubscriptions 502: {"messages":"The API is unreachable, please contact the API provider", "info": "Your Client (working) ---> Gateway (working) ---> API (not working)"}
[2026-08-14T11:32:23.461Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4335min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:42:23.839Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4345min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T11:42:24.072Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4345min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T11:52:24.052Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4355min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:02:24.368Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4365min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:06:24.382Z] [warn] [adb-v3] listSubscriptions 502: {"messages":"The API is unreachable, please contact the API provider", "info": "Your Client (working) ---> Gateway (working) ---> API (not working)"}
[2026-08-14T12:12:24.481Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4375min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:12:24.723Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4375min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T12:22:24.778Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4385min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:32:25.130Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4395min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:33:28.971Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-14T12:33:31.724Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-14T12:33:32.996Z] [log] 12:33:32 PM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-14T12:42:25.058Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4405min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T12:42:25.164Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4405min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T12:52:25.524Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4415min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:02:25.040Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4425min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:12:25.054Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4435min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:22:25.018Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4445min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:22:25.212Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4445min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T13:32:25.037Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4455min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:42:25.040Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4465min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:52:26.184Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4475min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T13:52:26.401Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4475min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T14:02:16.371Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-14T14:02:16.568Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-14T14:02:16.574Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-14T14:02:16.579Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-14T14:02:16.582Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-14T14:02:16.586Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-14T14:02:16.595Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-14T14:02:16.604Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-14T14:02:16.881Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-14T14:02:16.887Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-14T14:02:16.893Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-14T14:02:16.897Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-14T14:02:16.901Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-14T14:02:17.038Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-14T14:02:17.116Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-14T14:02:18.539Z] [log] 2:02:18 PM [express] serving on port 5000
[2026-08-14T14:02:18.540Z] [log] Initializing Stripe schema...
[2026-08-14T14:02:19.353Z] [log] Stripe schema ready
[2026-08-14T14:02:19.864Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-14T14:02:19.865Z] [log] Stripe data synced
[2026-08-14T14:12:18.195Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4495min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T14:12:18.263Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4495min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T14:22:17.971Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4505min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T14:32:18.157Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4515min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T14:42:18.412Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4525min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T14:42:18.509Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4525min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T14:52:18.582Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4535min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:02:18.775Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4545min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:12:19.047Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4555min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:12:19.122Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4555min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T15:22:19.297Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4565min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:32:19.537Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4575min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:42:20.082Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4585min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T15:42:20.196Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4585min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T15:52:19.942Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4595min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:02:20.397Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4605min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:12:20.724Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4615min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:12:20.981Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4615min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T16:22:21.730Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4625min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:32:20.937Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4635min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:42:21.388Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4645min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T16:42:21.650Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4645min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T16:52:21.361Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4655min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:02:21.527Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4665min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:12:21.771Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4675min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:12:22.090Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4675min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T17:22:21.918Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4685min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:32:22.305Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4695min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:42:22.423Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4705min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T17:42:22.661Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4705min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T17:52:22.744Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4715min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:02:23.014Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4725min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:12:23.206Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4735min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:12:23.432Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4735min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T18:22:23.398Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4745min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:32:23.624Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4755min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:42:23.906Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4765min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-14T18:42:24.087Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 4765min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-14T18:52:23.998Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=4775min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:00:52.996Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T04:00:53.252Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T04:00:53.257Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T04:00:53.262Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T04:00:53.265Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T04:00:53.268Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T04:00:53.277Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T04:00:53.288Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T04:00:53.862Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T04:00:53.869Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T04:00:53.878Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T04:00:53.881Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T04:00:53.887Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T04:00:54.002Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T04:00:54.098Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T04:00:56.249Z] [log] 4:00:56 AM [express] serving on port 5000
[2026-08-15T04:00:56.249Z] [log] Initializing Stripe schema...
[2026-08-15T04:00:56.290Z] [log] Stripe schema ready
[2026-08-15T04:00:56.700Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T04:00:56.702Z] [log] Stripe data synced
[2026-08-15T04:00:59.056Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-15T04:01:00.186Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-15T04:01:01.092Z] [log] 4:01:01 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-15T04:10:54.907Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5333min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:10:55.001Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5333min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T04:20:54.404Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5343min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:30:54.412Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5353min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:40:54.394Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5363min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:50:54.390Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5373min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T04:50:54.394Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5373min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T05:00:54.445Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5383min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:10:54.462Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5393min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:19:18.405Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T05:19:18.628Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T05:19:18.634Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T05:19:18.638Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T05:19:18.643Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T05:19:18.647Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T05:19:18.661Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T05:19:18.673Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T05:19:18.908Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T05:19:18.915Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T05:19:18.921Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T05:19:18.925Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T05:19:18.932Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T05:19:19.096Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T05:19:19.234Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T05:19:20.545Z] [log] 5:19:20 AM [express] serving on port 5000
[2026-08-15T05:19:20.546Z] [log] Initializing Stripe schema...
[2026-08-15T05:19:21.321Z] [log] Stripe schema ready
[2026-08-15T05:19:22.072Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T05:19:22.074Z] [log] Stripe data synced
[2026-08-15T05:29:19.982Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5412min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:29:20.048Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5412min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T05:39:19.970Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5422min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:49:20.164Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5432min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:59:20.373Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5442min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T05:59:20.490Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5442min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T06:09:20.654Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5452min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:19:20.908Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5462min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:29:21.122Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5472min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:29:21.254Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5472min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T06:39:21.655Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5482min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:49:21.569Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5492min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:59:21.848Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5502min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T06:59:21.939Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5502min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T07:05:40.945Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-15T07:05:42.816Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-15T07:05:46.523Z] [log] 7:05:46 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-15T07:09:21.923Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5512min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:19:21.956Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5522min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:29:21.970Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5532min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:29:22.062Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5532min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T07:39:21.962Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5542min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:49:21.997Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5552min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:59:21.988Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5562min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T07:59:22.105Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5562min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T08:09:22.014Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5572min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T08:19:21.975Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5582min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T08:29:22.026Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5592min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T08:29:22.320Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5592min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T08:39:21.968Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5602min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T08:49:22.005Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5612min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T08:59:21.926Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5622min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:09:22.062Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5632min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:09:22.152Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5632min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T09:19:22.086Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5642min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:29:22.033Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5652min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:39:22.044Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5662min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:39:22.290Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5662min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T09:49:22.040Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5672min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T09:59:22.096Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5682min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:00:55.910Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T10:00:56.118Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T10:00:56.123Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T10:00:56.126Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T10:00:56.130Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T10:00:56.133Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T10:00:56.142Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T10:00:56.150Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T10:00:56.741Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T10:00:56.747Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T10:00:56.752Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T10:00:56.755Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T10:00:56.759Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T10:00:56.822Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T10:00:56.907Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T10:00:58.006Z] [log] 10:00:57 AM [express] serving on port 5000
[2026-08-15T10:00:58.006Z] [log] Initializing Stripe schema...
[2026-08-15T10:00:58.754Z] [log] Stripe schema ready
[2026-08-15T10:01:02.481Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T10:01:02.482Z] [log] Stripe data synced
[2026-08-15T10:10:57.727Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5693min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:10:57.730Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5693min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:20:57.605Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5703min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:30:57.914Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5713min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.188Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5723min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5723min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:50:58.414Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5733min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:00:58.587Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5743min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.792Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5753min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.795Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5753min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:20:59.092Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5763min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:30:59.306Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5773min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.636Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.701Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:50:59.757Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:01:00.344Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.253Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.468Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5813min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:21:00.476Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:31:00.732Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5833min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.019Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5843min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.169Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5843min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:51:01.308Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5853min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:01:01.482Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5863min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.064Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5873min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5873min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:21:01.963Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5883min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:31:02.145Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5893min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.360Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5903min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.541Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5903min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:51:02.635Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5913min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:01:02.831Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5923min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.129Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5933min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.198Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5933min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:21:03.361Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5943min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:31:03.647Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5953min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:03.877Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5963min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:04.068Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5963min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:51:04.042Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5973min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:01:04.290Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5983min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.511Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5993min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.747Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5993min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:21:04.737Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6003min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:31:04.928Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6013min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.183Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6023min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.243Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6023min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:51:05.441Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6033min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:02:22.940Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T22:02:23.503Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T22:02:23.517Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T22:02:23.521Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T22:02:23.525Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T22:02:23.531Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T22:02:23.537Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T22:02:23.548Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T22:02:24.195Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T22:02:24.201Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T22:02:24.206Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T22:02:24.208Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T22:02:24.212Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T22:02:24.345Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T22:02:24.432Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T22:02:25.872Z] [log] 10:02:25 PM [express] serving on port 5000
[2026-08-15T22:02:25.872Z] [log] Initializing Stripe schema...
[2026-08-15T22:02:26.597Z] [log] Stripe schema ready
[2026-08-15T22:02:27.882Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-15T22:02:29.313Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-15T22:02:30.612Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T22:02:30.665Z] [log] Stripe data synced
[2026-08-15T22:02:35.317Z] [log] 10:02:35 PM [express] GET /api/auth/user 401 in 4ms body=31b
[2026-08-15T22:12:24.968Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6415min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:12:25.032Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6415min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T22:22:24.936Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6425min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:32:25.046Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6435min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:42:24.865Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6445min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.884Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6455min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.968Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6455min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:02:24.854Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6465min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:12:24.890Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6475min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:22:24.850Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6485min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:24.917Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6495min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:25.144Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6495min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:42:24.889Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6505min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:52:24.891Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6515min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:24.972Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6525min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:26.963Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6525min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:12:24.931Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6535min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:22:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6545min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:32:24.933Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6555min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:24.945Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6565min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:25.055Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6565min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:52:24.901Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6575min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:02:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6585min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:05:16.423Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T01:05:16.792Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T01:05:16.798Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T01:05:16.802Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T01:05:16.809Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T01:05:16.812Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T01:05:16.821Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T01:05:16.831Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T01:05:17.295Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T01:05:17.303Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T01:05:17.308Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T01:05:17.312Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T01:05:17.316Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T01:05:17.451Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T01:05:17.629Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T01:05:19.043Z] [log] 1:05:19 AM [express] serving on port 5000
[2026-08-16T01:05:19.043Z] [log] Initializing Stripe schema...
[2026-08-16T01:05:19.831Z] [log] Stripe schema ready
[2026-08-16T01:05:20.383Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T01:05:20.384Z] [log] Stripe data synced
[2026-08-16T01:15:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6598min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:15:18.237Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6598min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:25:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6608min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:35:18.473Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6618min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.696Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6628min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.754Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6628min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:55:18.907Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6638min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:05:19.113Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6648min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.347Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6658min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.466Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6658min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:10:51.693Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T04:10:52.009Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T04:10:52.013Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T04:10:52.016Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T04:10:52.019Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T04:10:52.022Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T04:10:52.031Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T04:10:52.039Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T04:10:52.631Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T04:10:52.638Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T04:10:52.642Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T04:10:52.645Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T04:10:52.650Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T04:10:52.779Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T04:10:52.899Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T04:10:54.240Z] [log] 4:10:54 AM [express] serving on port 5000
[2026-08-16T04:10:54.240Z] [log] Initializing Stripe schema...
[2026-08-16T04:10:55.518Z] [log] Stripe schema ready
[2026-08-16T04:10:56.066Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-16T04:10:58.044Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-16T04:10:58.878Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T04:10:58.880Z] [log] Stripe data synced
[2026-08-16T04:11:01.799Z] [log] 4:11:01 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-16T04:20:53.426Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:20:53.431Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:30:53.320Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:40:53.246Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:50:53.229Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.213Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.218Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6823min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T14:47:12.302Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T14:47:12.961Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T14:47:12.966Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T14:47:12.971Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T14:47:12.975Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T14:47:12.980Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T14:47:12.984Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T14:47:12.998Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T14:47:13.932Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T14:47:13.938Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T14:47:13.989Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T14:47:13.994Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T14:47:14.003Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T14:47:14.121Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T14:47:14.176Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T14:47:14.189Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.190Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.352Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T14:47:14.499Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T14:47:16.044Z] [log] 2:47:16 PM [express] serving on port 5000
[2026-08-16T14:47:16.044Z] [log] Initializing Stripe schema...
[2026-08-16T14:47:16.904Z] [log] Stripe schema ready
[2026-08-16T14:47:17.669Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T14:47:17.670Z] [log] Stripe data synced
~/workspace$ npm run logs:last

> rest-express@1.0.1 logs:last
> tail -200 logs/collector.log

[2026-08-15T10:00:56.126Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T10:00:56.130Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T10:00:56.133Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T10:00:56.142Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T10:00:56.150Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T10:00:56.741Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T10:00:56.747Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T10:00:56.752Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T10:00:56.755Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T10:00:56.759Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T10:00:56.822Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T10:00:56.907Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T10:00:58.006Z] [log] 10:00:57 AM [express] serving on port 5000
[2026-08-15T10:00:58.006Z] [log] Initializing Stripe schema...
[2026-08-15T10:00:58.754Z] [log] Stripe schema ready
[2026-08-15T10:01:02.481Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T10:01:02.482Z] [log] Stripe data synced
[2026-08-15T10:10:57.727Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5693min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:10:57.730Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5693min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:20:57.605Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5703min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:30:57.914Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5713min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.188Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5723min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5723min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:50:58.414Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5733min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:00:58.587Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5743min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.792Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5753min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.795Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5753min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:20:59.092Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5763min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:30:59.306Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5773min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.636Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.701Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:50:59.757Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:01:00.344Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.253Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.468Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5813min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:21:00.476Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:31:00.732Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5833min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.019Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5843min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.169Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5843min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:51:01.308Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5853min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:01:01.482Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5863min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.064Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5873min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5873min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:21:01.963Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5883min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:31:02.145Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5893min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.360Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5903min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.541Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5903min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:51:02.635Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5913min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:01:02.831Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5923min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.129Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5933min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.198Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5933min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:21:03.361Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5943min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:31:03.647Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5953min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:03.877Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5963min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:04.068Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5963min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:51:04.042Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5973min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:01:04.290Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5983min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.511Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5993min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.747Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5993min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:21:04.737Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6003min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:31:04.928Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6013min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.183Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6023min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.243Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6023min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:51:05.441Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6033min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:02:22.940Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T22:02:23.503Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T22:02:23.517Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T22:02:23.521Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T22:02:23.525Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T22:02:23.531Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T22:02:23.537Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T22:02:23.548Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T22:02:24.195Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T22:02:24.201Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T22:02:24.206Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T22:02:24.208Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T22:02:24.212Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T22:02:24.345Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T22:02:24.432Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T22:02:25.872Z] [log] 10:02:25 PM [express] serving on port 5000
[2026-08-15T22:02:25.872Z] [log] Initializing Stripe schema...
[2026-08-15T22:02:26.597Z] [log] Stripe schema ready
[2026-08-15T22:02:27.882Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-15T22:02:29.313Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-15T22:02:30.612Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T22:02:30.665Z] [log] Stripe data synced
[2026-08-15T22:02:35.317Z] [log] 10:02:35 PM [express] GET /api/auth/user 401 in 4ms body=31b
[2026-08-15T22:12:24.968Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6415min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:12:25.032Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6415min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T22:22:24.936Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6425min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:32:25.046Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6435min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:42:24.865Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6445min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.884Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6455min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.968Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6455min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:02:24.854Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6465min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:12:24.890Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6475min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:22:24.850Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6485min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:24.917Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6495min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:25.144Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6495min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:42:24.889Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6505min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:52:24.891Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6515min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:24.972Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6525min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:26.963Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6525min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:12:24.931Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6535min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:22:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6545min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:32:24.933Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6555min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:24.945Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6565min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:25.055Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6565min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:52:24.901Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6575min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:02:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6585min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:05:16.423Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T01:05:16.792Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T01:05:16.798Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T01:05:16.802Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T01:05:16.809Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T01:05:16.812Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T01:05:16.821Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T01:05:16.831Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T01:05:17.295Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T01:05:17.303Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T01:05:17.308Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T01:05:17.312Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T01:05:17.316Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T01:05:17.451Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T01:05:17.629Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T01:05:19.043Z] [log] 1:05:19 AM [express] serving on port 5000
[2026-08-16T01:05:19.043Z] [log] Initializing Stripe schema...
[2026-08-16T01:05:19.831Z] [log] Stripe schema ready
[2026-08-16T01:05:20.383Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T01:05:20.384Z] [log] Stripe data synced
[2026-08-16T01:15:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6598min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:15:18.237Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6598min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:25:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6608min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:35:18.473Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6618min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.696Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6628min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.754Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6628min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:55:18.907Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6638min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:05:19.113Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6648min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.347Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6658min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.466Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6658min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:10:51.693Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T04:10:52.009Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T04:10:52.013Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T04:10:52.016Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T04:10:52.019Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T04:10:52.022Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T04:10:52.031Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T04:10:52.039Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T04:10:52.631Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T04:10:52.638Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T04:10:52.642Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T04:10:52.645Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T04:10:52.650Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T04:10:52.779Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T04:10:52.899Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T04:10:54.240Z] [log] 4:10:54 AM [express] serving on port 5000
[2026-08-16T04:10:54.240Z] [log] Initializing Stripe schema...
[2026-08-16T04:10:55.518Z] [log] Stripe schema ready
[2026-08-16T04:10:56.066Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-16T04:10:58.044Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-16T04:10:58.878Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T04:10:58.880Z] [log] Stripe data synced
[2026-08-16T04:11:01.799Z] [log] 4:11:01 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-16T04:20:53.426Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:20:53.431Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:30:53.320Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:40:53.246Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:50:53.229Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.213Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.218Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6823min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T14:47:12.302Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T14:47:12.961Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T14:47:12.966Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T14:47:12.971Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T14:47:12.975Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T14:47:12.980Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T14:47:12.984Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T14:47:12.998Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T14:47:13.932Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T14:47:13.938Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T14:47:13.989Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T14:47:13.994Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T14:47:14.003Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T14:47:14.121Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T14:47:14.176Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T14:47:14.189Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.190Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.352Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T14:47:14.499Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T14:47:16.044Z] [log] 2:47:16 PM [express] serving on port 5000
[2026-08-16T14:47:16.044Z] [log] Initializing Stripe schema...
[2026-08-16T14:47:16.904Z] [log] Stripe schema ready
[2026-08-16T14:47:17.669Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T14:47:17.670Z] [log] Stripe data synced
~/workspace$ 
~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 7421 min ago — data has stalled
FAIL  balance                      866 — below reserve+min (1300), refill soon
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
  Latest Flight-Alert balance                    866 credits
  Permanent floor (1000) intact                  NO — controller must refuse further spend

  NOTE: census spend (FIDS/S1, probes, diagnostics) is tracked on the
  REST line (1,000 units), NEVER against the 57,900 refill envelope (§3.2).

~/workspace$ npm run health
npm run gate0
npm run logs:last

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 7421 min ago — data has stalled
FAIL  balance                      866 — below reserve+min (1300), refill soon
PASS  rows today                   0
PASS  rows total                   4316
FAIL  active batch                 none running right now (idle)

HEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last

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
  Latest Flight-Alert balance                    866 credits
  Permanent floor (1000) intact                  NO — controller must refuse further spend

  NOTE: census spend (FIDS/S1, probes, diagnostics) is tracked on the
  REST line (1,000 units), NEVER against the 57,900 refill envelope (§3.2).


> rest-express@1.0.1 logs:last
> tail -200 logs/collector.log

[2026-08-15T10:00:56.133Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T10:00:56.142Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T10:00:56.150Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T10:00:56.741Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T10:00:56.747Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T10:00:56.752Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T10:00:56.755Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T10:00:56.759Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T10:00:56.822Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T10:00:56.907Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T10:00:58.006Z] [log] 10:00:57 AM [express] serving on port 5000
[2026-08-15T10:00:58.006Z] [log] Initializing Stripe schema...
[2026-08-15T10:00:58.754Z] [log] Stripe schema ready
[2026-08-15T10:01:02.481Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T10:01:02.482Z] [log] Stripe data synced
[2026-08-15T10:10:57.727Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5693min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:10:57.730Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5693min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:20:57.605Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5703min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:30:57.914Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5713min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.188Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5723min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T10:40:58.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5723min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T10:50:58.414Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5733min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:00:58.587Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5743min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.792Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5753min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:10:58.795Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5753min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:20:59.092Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5763min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:30:59.306Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5773min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.636Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T11:40:59.701Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T11:50:59.757Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:01:00.344Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.253Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:11:00.468Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5813min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:21:00.476Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:31:00.732Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5833min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.019Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5843min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T12:41:01.169Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5843min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T12:51:01.308Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5853min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:01:01.482Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5863min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.064Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5873min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:11:02.298Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5873min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:21:01.963Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5883min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:31:02.145Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5893min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.360Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5903min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T13:41:02.541Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5903min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T13:51:02.635Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5913min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:01:02.831Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5923min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.129Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5933min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:11:03.198Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5933min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:21:03.361Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5943min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:31:03.647Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5953min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:03.877Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5963min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T14:41:04.068Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5963min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T14:51:04.042Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5973min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:01:04.290Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5983min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.511Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=5993min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:11:04.747Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 5993min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:21:04.737Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6003min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:31:04.928Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6013min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.183Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6023min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T15:41:05.243Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6023min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T15:51:05.441Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6033min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:02:22.940Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-15T22:02:23.503Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-15T22:02:23.517Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-15T22:02:23.521Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-15T22:02:23.525Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-15T22:02:23.531Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-15T22:02:23.537Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-15T22:02:23.548Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-15T22:02:24.195Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-15T22:02:24.201Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-15T22:02:24.206Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-15T22:02:24.208Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-15T22:02:24.212Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-15T22:02:24.345Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-15T22:02:24.432Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-15T22:02:25.872Z] [log] 10:02:25 PM [express] serving on port 5000
[2026-08-15T22:02:25.872Z] [log] Initializing Stripe schema...
[2026-08-15T22:02:26.597Z] [log] Stripe schema ready
[2026-08-15T22:02:27.882Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-15T22:02:29.313Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-15T22:02:30.612Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-15T22:02:30.665Z] [log] Stripe data synced
[2026-08-15T22:02:35.317Z] [log] 10:02:35 PM [express] GET /api/auth/user 401 in 4ms body=31b
[2026-08-15T22:12:24.968Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6415min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:12:25.032Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6415min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T22:22:24.936Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6425min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:32:25.046Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6435min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:42:24.865Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6445min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.884Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6455min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T22:52:24.968Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6455min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:02:24.854Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6465min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:12:24.890Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6475min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:22:24.850Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6485min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:24.917Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6495min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:32:25.144Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6495min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-15T23:42:24.889Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6505min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-15T23:52:24.891Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6515min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:24.972Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6525min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:02:26.963Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6525min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:12:24.931Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6535min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:22:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6545min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:32:24.933Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6555min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:24.945Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6565min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T00:42:25.055Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6565min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T00:52:24.901Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6575min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:02:24.911Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6585min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:05:16.423Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T01:05:16.792Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T01:05:16.798Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T01:05:16.802Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T01:05:16.809Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T01:05:16.812Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T01:05:16.821Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T01:05:16.831Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T01:05:17.295Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T01:05:17.303Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T01:05:17.308Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T01:05:17.312Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T01:05:17.316Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T01:05:17.451Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T01:05:17.629Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T01:05:19.043Z] [log] 1:05:19 AM [express] serving on port 5000
[2026-08-16T01:05:19.043Z] [log] Initializing Stripe schema...
[2026-08-16T01:05:19.831Z] [log] Stripe schema ready
[2026-08-16T01:05:20.383Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T01:05:20.384Z] [log] Stripe data synced
[2026-08-16T01:15:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6598min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:15:18.237Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6598min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:25:18.175Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6608min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:35:18.473Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6618min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.696Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6628min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T01:45:18.754Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6628min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T01:55:18.907Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6638min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:05:19.113Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6648min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.347Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6658min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T02:15:19.466Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6658min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:10:51.693Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T04:10:52.009Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T04:10:52.013Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T04:10:52.016Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T04:10:52.019Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T04:10:52.022Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T04:10:52.031Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T04:10:52.039Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T04:10:52.631Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T04:10:52.638Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T04:10:52.642Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T04:10:52.645Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T04:10:52.650Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T04:10:52.779Z] [log] [adb-collector] watchdog started (window=4h, budget=3000 credits/batch, dailyCap=1900, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T04:10:52.899Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T04:10:54.240Z] [log] 4:10:54 AM [express] serving on port 5000
[2026-08-16T04:10:54.240Z] [log] Initializing Stripe schema...
[2026-08-16T04:10:55.518Z] [log] Stripe schema ready
[2026-08-16T04:10:56.066Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-16T04:10:58.044Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-16T04:10:58.878Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T04:10:58.880Z] [log] Stripe data synced
[2026-08-16T04:11:01.799Z] [log] 4:11:01 AM [express] GET /api/auth/user 401 in 3ms body=31b
[2026-08-16T04:20:53.426Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6783min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:20:53.431Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6783min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T04:30:53.320Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6793min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:40:53.246Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6803min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T04:50:53.229Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6813min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.213Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=6823min canStart=false refillToFullBudget=3138 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T05:00:53.218Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 6823min (> 90min) — refill 3138+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T14:47:12.302Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T14:47:12.961Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T14:47:12.966Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T14:47:12.971Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T14:47:12.975Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T14:47:12.980Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T14:47:12.984Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T14:47:12.998Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T14:47:13.932Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T14:47:13.938Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T14:47:13.989Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T14:47:13.994Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T14:47:14.003Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T14:47:14.121Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T14:47:14.176Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T14:47:14.189Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.190Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T14:47:14.352Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T14:47:14.499Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T14:47:16.044Z] [log] 2:47:16 PM [express] serving on port 5000
[2026-08-16T14:47:16.044Z] [log] Initializing Stripe schema...
[2026-08-16T14:47:16.904Z] [log] Stripe schema ready
[2026-08-16T14:47:17.669Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T14:47:17.670Z] [log] Stripe data synced
[2026-08-16T14:57:15.188Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7420min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T14:57:15.250Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7420min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
~/workspace$ 