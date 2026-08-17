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
11:59:02 PM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced

~/workspace$ npm run logs

> rest-express@1.0.1 logs
> tail -f logs/collector.log

[2026-08-16T23:58:59.911Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T23:58:59.918Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T23:58:59.993Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-16T23:59:00.132Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T23:59:00.234Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T23:59:02.988Z] [log] 11:59:02 PM [express] serving on port 5000
[2026-08-16T23:59:02.988Z] [log] Initializing Stripe schema...
[2026-08-16T23:59:03.787Z] [log] Stripe schema ready
[2026-08-16T23:59:04.492Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T23:59:04.494Z] [log] Stripe data synced

~/workspace$ npm run logs:last

> rest-express@1.0.1 logs:last
> tail -200 logs/collector.log

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
[2026-08-16T15:07:15.239Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7430min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:17:15.493Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7440min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:27:15.740Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7450min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:27:15.882Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7450min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T15:37:15.980Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7460min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:47:16.234Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7470min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:57:17.172Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7480min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:57:17.544Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7480min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T16:07:16.711Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7490min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:17:16.976Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7500min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:27:17.177Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7510min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:37:17.426Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7520min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:37:17.690Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7520min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T16:47:17.603Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7530min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:57:17.854Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7540min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:07:17.950Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7550min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:07:18.125Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7550min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T17:17:18.222Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7560min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:27:18.496Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7570min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:37:18.750Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7580min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:37:19.003Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7580min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T17:47:18.934Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7590min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:57:19.275Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7600min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:07:19.571Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7610min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:07:19.825Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7610min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T18:17:19.666Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7620min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:27:19.912Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7630min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:37:20.190Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7640min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:37:20.370Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7640min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T18:47:20.348Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7650min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:57:20.546Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7660min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:07:20.768Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7670min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:07:20.992Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7670min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T19:17:21.059Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7680min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:27:21.271Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7690min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:37:21.545Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7700min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:37:21.694Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7700min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T19:47:21.821Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7710min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:57:22.061Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7720min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:06:58.690Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T20:06:58.793Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T20:06:58.801Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T20:06:58.804Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T20:06:58.807Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T20:06:58.809Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T20:06:58.821Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T20:06:58.830Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T20:06:59.199Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T20:06:59.204Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T20:06:59.210Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T20:06:59.215Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T20:06:59.219Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T20:06:59.222Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T20:06:59.228Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T20:06:59.335Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T20:06:59.335Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T20:06:59.465Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T20:06:59.583Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T20:07:00.829Z] [log] 8:07:00 PM [express] serving on port 5000
[2026-08-16T20:07:00.829Z] [log] Initializing Stripe schema...
[2026-08-16T20:07:01.497Z] [log] Stripe schema ready
[2026-08-16T20:07:02.099Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T20:07:02.100Z] [log] Stripe data synced
[2026-08-16T20:17:00.136Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7739min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:17:00.194Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7739min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T20:27:00.253Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7749min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:37:00.450Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7759min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:47:00.736Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7769min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:47:00.826Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7769min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T20:57:00.984Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7779min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:07:01.193Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7789min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:17:01.433Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7799min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:17:01.496Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7799min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T21:27:01.729Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7809min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:37:01.841Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7819min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:47:02.144Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7829min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:47:02.219Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7829min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T21:57:02.330Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7839min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T23:58:58.232Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T23:58:58.742Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T23:58:58.748Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T23:58:58.752Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T23:58:58.757Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T23:58:58.759Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T23:58:58.763Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T23:58:58.820Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T23:58:59.786Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T23:58:59.792Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T23:58:59.897Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T23:58:59.901Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T23:58:59.907Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T23:58:59.911Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T23:58:59.918Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T23:58:59.993Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-16T23:59:00.132Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T23:59:00.234Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T23:59:02.988Z] [log] 11:59:02 PM [express] serving on port 5000
[2026-08-16T23:59:02.988Z] [log] Initializing Stripe schema...
[2026-08-16T23:59:03.787Z] [log] Stripe schema ready
[2026-08-16T23:59:04.492Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T23:59:04.494Z] [log] Stripe data synced
~/workspace$ npm run health

> rest-express@1.0.1 health
> tsx scripts/check_collection_health.ts

FAIL  data flow                    last row 7963 min ago — data has stalled
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

FAIL  data flow                    last row 7963 min ago — data has stalled
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
[2026-08-16T15:07:15.239Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7430min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:17:15.493Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7440min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:27:15.740Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7450min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:27:15.882Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7450min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T15:37:15.980Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7460min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:47:16.234Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7470min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:57:17.172Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7480min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T15:57:17.544Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7480min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T16:07:16.711Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7490min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:17:16.976Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7500min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:27:17.177Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7510min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:37:17.426Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7520min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:37:17.690Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7520min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T16:47:17.603Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7530min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T16:57:17.854Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7540min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:07:17.950Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7550min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:07:18.125Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7550min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T17:17:18.222Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7560min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:27:18.496Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7570min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:37:18.750Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7580min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:37:19.003Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7580min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T17:47:18.934Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7590min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T17:57:19.275Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7600min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:07:19.571Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7610min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:07:19.825Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7610min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T18:17:19.666Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7620min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:27:19.912Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7630min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:37:20.190Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7640min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:37:20.370Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7640min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T18:47:20.348Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7650min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T18:57:20.546Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7660min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:07:20.768Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7670min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:07:20.992Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7670min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T19:17:21.059Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7680min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:27:21.271Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7690min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:37:21.545Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7700min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:37:21.694Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7700min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T19:47:21.821Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7710min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T19:57:22.061Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7720min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:06:58.690Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T20:06:58.793Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T20:06:58.801Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T20:06:58.804Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T20:06:58.807Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T20:06:58.809Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T20:06:58.821Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T20:06:58.830Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T20:06:59.199Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T20:06:59.204Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T20:06:59.210Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T20:06:59.215Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T20:06:59.219Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T20:06:59.222Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T20:06:59.228Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T20:06:59.335Z] [error] [migrations] failed to apply 0020_collection_v39_airborne_time_series.sql: column "loc_reported_utc" does not exist
[2026-08-16T20:06:59.335Z] [error] Boot migrations failed: column "loc_reported_utc" does not exist
[2026-08-16T20:06:59.465Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=true)
[2026-08-16T20:06:59.583Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T20:07:00.829Z] [log] 8:07:00 PM [express] serving on port 5000
[2026-08-16T20:07:00.829Z] [log] Initializing Stripe schema...
[2026-08-16T20:07:01.497Z] [log] Stripe schema ready
[2026-08-16T20:07:02.099Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T20:07:02.100Z] [log] Stripe data synced
[2026-08-16T20:17:00.136Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7739min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:17:00.194Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7739min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T20:27:00.253Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7749min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:37:00.450Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7759min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:47:00.736Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7769min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T20:47:00.826Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7769min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T20:57:00.984Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7779min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:07:01.193Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7789min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:17:01.433Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7799min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:17:01.496Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7799min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T21:27:01.729Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7809min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:37:01.841Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7819min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:47:02.144Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7829min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T21:47:02.219Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 7829min (> 90min) — refill 2038+ credits. Check logs/collector.log or run: npm run health
[2026-08-16T21:57:02.330Z] [log] [adb-collector] heartbeat balance=862 rowsToday=0 gap=7839min canStart=false refillToFullBudget=2038 reason=Insufficient credits (862 < reserve 1000 + min batch 300).
[2026-08-16T23:58:58.232Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-16T23:58:58.742Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-16T23:58:58.748Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-16T23:58:58.752Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-16T23:58:58.757Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-16T23:58:58.759Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-16T23:58:58.763Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-16T23:58:58.820Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-16T23:58:59.786Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-16T23:58:59.792Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-16T23:58:59.897Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-16T23:58:59.901Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-16T23:58:59.907Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-16T23:58:59.911Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-16T23:58:59.918Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-16T23:58:59.993Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-16T23:59:00.132Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-16T23:59:00.234Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-16T23:59:02.988Z] [log] 11:59:02 PM [express] serving on port 5000
[2026-08-16T23:59:02.988Z] [log] Initializing Stripe schema...
[2026-08-16T23:59:03.787Z] [log] Stripe schema ready
[2026-08-16T23:59:04.492Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-16T23:59:04.494Z] [log] Stripe data synced
~/workspace$ 




