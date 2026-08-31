~/workspace$ git pull origin main
remote: Enumerating objects: 21, done.
remote: Counting objects: 100% (21/21), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 13 (delta 8), reused 13 (delta 8), pack-reused 0 (from 0)
Unpacking objects: 100% (13/13), 27.53 KiB | 61.00 KiB/s, done.
From https://github.com/HKcode22/ReplitTranvr
 * branch            main       -> FETCH_HEAD
   2ffb693..73affad  main       -> origin/main
Updating 2ffb693..73affad
Fast-forward
 AugMDnotes/CODE_WALKTHROUGH.md           | 522 ++++++++++++++++++++++++++++++++++++++++++++
 AugMDnotes/IMPLEMENTATION_LOG.md         | 419 ++++++++++++++++++++++-------------
 AugMDnotes/rl7.md                        | 120 ++++++++++
 migrations/0023_anchor_probe_results.sql |  66 ++++++
 package.json                             |   1 +
 scripts/anchor_probe.ts                  | 511 +++++++++++++++++++++++++++++++++++++++++++
 server/db.ts                             |   1 +
 7 files changed, 1491 insertions(+), 149 deletions(-)
 create mode 100644 AugMDnotes/CODE_WALKTHROUGH.md
 create mode 100644 AugMDnotes/rl7.md
 create mode 100644 migrations/0023_anchor_probe_results.sql
 create mode 100644 scripts/anchor_probe.ts
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
6:01:31 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced

~/workspace$ npm run anchor-probe -- --status

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --status

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.

No probes recorded yet. Run: npm run anchor-probe -- --stage 1
~/workspace$ 

~/workspace$ npm run anchor-probe -- --stage 1

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --stage 1

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.


=== PROBE KLAX (stage 1, 2h window, North America) ===
  feed membership check: covered
  balance_before: 2901
  subscription: 99cdf2be-8016-4a91-ab8c-22246fabbd8d
  probing 2h — deliveries must reach the live webhook...

  ~/workspace$ npm run anchor-probe -- --stage 2

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --stage 2

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.


=== PROBE KLAX (stage 2, 4h window, North America) ===
  feed membership check: covered
  balance_before: 2901
  subscription: 9c87e594-c245-4126-af71-97e3acbef457
  probing 4h — deliveries must reach the live webhook...
~/workspace$ npm run anchor-probe -- --score

> rest-express@1.0.1 anchor-probe
> tsx scripts/anchor_probe.ts --score

V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.


--- FROZEN anchor score (§9) — filled with measured data ---
No calibration baseline probed yet (WSSS/OMAA). Run stage 1 first.

Proposed lock (top 5 capacity-passing, cross-region):
  (fewer than 5 eligible yet — run more stage-1 probes / stage 2)
~/workspace$ 
~/workspace$ npm run logs:last

> rest-express@1.0.1 logs:last
> tail -200 logs/collector.log

[2026-08-18T18:23:43.913Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-18T18:23:43.918Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-18T18:23:43.925Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-18T18:23:44.524Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-18T18:23:44.531Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-18T18:23:44.605Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-18T18:23:44.612Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-18T18:23:44.620Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-18T18:23:44.625Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-18T18:23:44.632Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-18T18:23:44.635Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-18T18:23:44.640Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-18T18:23:44.676Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-18T18:23:44.741Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-18T18:23:44.819Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-18T18:23:46.587Z] [log] 6:23:46 PM [express] serving on port 5000
[2026-08-18T18:23:46.588Z] [log] Initializing Stripe schema...
[2026-08-18T18:23:47.551Z] [log] Stripe schema ready
[2026-08-18T18:23:48.486Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-18T18:23:48.487Z] [log] Stripe data synced
[2026-08-18T18:33:45.601Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10516min canStart=true
[2026-08-18T18:33:45.716Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10516min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T18:43:45.948Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10526min canStart=true
[2026-08-18T18:53:45.892Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10536min canStart=true
[2026-08-18T19:03:46.116Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10546min canStart=true
[2026-08-18T19:03:46.337Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10546min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T19:13:46.426Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10556min canStart=true
[2026-08-18T19:23:46.586Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10566min canStart=true
[2026-08-18T19:33:47.156Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10576min canStart=true
[2026-08-18T19:33:47.399Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10576min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T19:43:47.378Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10586min canStart=true
[2026-08-18T19:53:47.237Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10596min canStart=true
[2026-08-18T20:03:47.503Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10606min canStart=true
[2026-08-18T20:03:47.779Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10606min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T20:13:47.757Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10616min canStart=true
[2026-08-18T20:23:47.917Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10626min canStart=true
[2026-08-18T21:01:54.264Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-18T21:01:54.331Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-18T21:01:54.336Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-18T21:01:54.341Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-18T21:01:54.349Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-18T21:01:54.354Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-18T21:01:54.359Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-18T21:01:54.370Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-18T21:01:55.084Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-18T21:01:55.090Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-18T21:01:55.104Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-18T21:01:55.108Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-18T21:01:55.114Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-18T21:01:55.117Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-18T21:01:55.122Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-18T21:01:55.126Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-18T21:01:55.128Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-18T21:01:55.157Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-18T21:01:55.232Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-18T21:01:55.366Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-18T21:01:56.657Z] [log] 9:01:56 PM [express] serving on port 5000
[2026-08-18T21:01:56.658Z] [log] Initializing Stripe schema...
[2026-08-18T21:01:57.650Z] [log] Stripe schema ready
[2026-08-18T21:01:58.471Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-18T21:01:58.473Z] [log] Stripe data synced
[2026-08-18T21:11:56.144Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10674min canStart=true
[2026-08-18T21:11:56.230Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10674min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T21:21:56.185Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10684min canStart=true
[2026-08-18T21:31:56.434Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10694min canStart=true
[2026-08-18T21:41:56.588Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10704min canStart=true
[2026-08-18T21:41:56.656Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10704min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T21:51:56.816Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10714min canStart=true
[2026-08-18T22:01:56.997Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10724min canStart=true
[2026-08-18T22:11:57.263Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10734min canStart=true
[2026-08-18T22:11:57.324Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10734min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T22:21:57.577Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10744min canStart=true
[2026-08-18T22:31:58.004Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10754min canStart=true
[2026-08-18T22:41:57.970Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10764min canStart=true
[2026-08-18T22:41:58.047Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10764min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T22:51:58.229Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10774min canStart=true
[2026-08-18T23:01:58.427Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10784min canStart=true
[2026-08-18T23:11:58.625Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10794min canStart=true
[2026-08-18T23:11:58.722Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10794min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-18T23:21:58.809Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10804min canStart=true
[2026-08-19T02:14:15.618Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-19T02:14:15.675Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-19T02:14:15.681Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-19T02:14:15.686Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-19T02:14:15.690Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-19T02:14:15.692Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-19T02:14:15.696Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-19T02:14:15.705Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-19T02:14:16.391Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-19T02:14:16.397Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-19T02:14:16.411Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-19T02:14:16.416Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-19T02:14:16.423Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-19T02:14:16.426Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-19T02:14:16.432Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-19T02:14:16.437Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-19T02:14:16.439Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-19T02:14:16.463Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-19T02:14:16.558Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-19T02:14:16.733Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-19T02:14:18.273Z] [log] 2:14:18 AM [express] serving on port 5000
[2026-08-19T02:14:18.273Z] [log] Initializing Stripe schema...
[2026-08-19T02:14:19.003Z] [log] Stripe schema ready
[2026-08-19T02:14:19.699Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-19T02:14:19.700Z] [log] Stripe data synced
[2026-08-19T02:24:17.417Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10987min canStart=true
[2026-08-19T02:24:17.527Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 10987min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-19T02:34:17.397Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=10997min canStart=true
[2026-08-19T02:44:17.626Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11007min canStart=true
[2026-08-19T02:54:17.821Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11017min canStart=true
[2026-08-19T02:54:17.880Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 11017min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-19T04:28:13.333Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-19T04:28:13.472Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-19T04:28:13.477Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-19T04:28:13.482Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-19T04:28:13.486Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-19T04:28:13.488Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-19T04:28:13.493Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-19T04:28:13.501Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-19T04:28:14.010Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-19T04:28:14.015Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-19T04:28:14.031Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-19T04:28:14.036Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-19T04:28:14.040Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-19T04:28:14.045Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-19T04:28:14.049Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-19T04:28:14.053Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-19T04:28:14.056Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-19T04:28:14.080Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-19T04:28:14.147Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-19T04:28:14.302Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-19T04:28:16.274Z] [log] 4:28:16 AM [express] serving on port 5000
[2026-08-19T04:28:16.274Z] [log] Initializing Stripe schema...
[2026-08-19T04:28:16.380Z] [log] Stripe schema ready
[2026-08-19T04:28:17.171Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-19T04:28:17.173Z] [log] Stripe data synced
[2026-08-19T04:38:14.855Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11121min canStart=true
[2026-08-19T04:38:14.958Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 11121min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-19T04:48:15.025Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11131min canStart=true
[2026-08-19T04:58:15.249Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11141min canStart=true
[2026-08-19T05:08:15.451Z] [log] [adb-collector] heartbeat balance=2901 rowsToday=0 gap=11151min canStart=true
[2026-08-19T05:08:15.560Z] [warn] [adb-collector] ⚠ ALERT data gap: no row for 11151min (> 90min). Check logs/collector.log or run: npm run health
[2026-08-19T06:01:27.850Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-19T06:01:28.364Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-19T06:01:28.370Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-19T06:01:28.376Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-19T06:01:28.380Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-19T06:01:28.385Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-19T06:01:28.391Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-19T06:01:28.542Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-19T06:01:29.628Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-19T06:01:29.634Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-19T06:01:29.748Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-19T06:01:29.757Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-19T06:01:29.764Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-19T06:01:29.768Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-19T06:01:29.776Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-19T06:01:29.917Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-19T06:01:29.921Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-19T06:01:29.951Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-19T06:01:29.991Z] [log] [migrations] applied 0023_anchor_probe_results.sql
[2026-08-19T06:01:30.086Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-19T06:01:30.226Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-19T06:01:31.531Z] [log] 6:01:31 AM [express] serving on port 5000
[2026-08-19T06:01:31.531Z] [log] Initializing Stripe schema...
[2026-08-19T06:01:32.289Z] [log] Stripe schema ready
[2026-08-19T06:01:33.023Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-19T06:01:33.025Z] [log] Stripe data synced
[2026-08-19T06:11:47.481Z] [log] [migrations] applied 0002_agency_disruption_system.sql
[2026-08-19T06:11:47.556Z] [log] [migrations] applied 0003_travelers_health.sql
[2026-08-19T06:11:47.560Z] [log] [migrations] applied 0004_confirmation_alert.sql
[2026-08-19T06:11:47.564Z] [log] [migrations] applied 0005_aircraft_data.sql
[2026-08-19T06:11:47.567Z] [log] [migrations] applied 0006_test_flight_seeder.sql
[2026-08-19T06:11:47.569Z] [log] [migrations] applied 0007_user_monitored_flights.sql
[2026-08-19T06:11:47.572Z] [log] [migrations] applied 0008_resolved_flight_status.sql
[2026-08-19T06:11:47.582Z] [log] [migrations] applied 0010_flight_data_pre_post.sql
[2026-08-19T06:11:48.155Z] [log] [migrations] applied 0011_flight_data_pre_post_quality_jsonb.sql
[2026-08-19T06:11:48.164Z] [log] [migrations] applied 0012_collection_sampling.sql
[2026-08-19T06:11:48.171Z] [log] [migrations] applied 0014_flight_data_pre_post_drop_dead_columns.sql
[2026-08-19T06:11:48.177Z] [log] [migrations] applied 0015_collection_v33_sampling_meta.sql
[2026-08-19T06:11:48.182Z] [log] [migrations] applied 0017_collection_v39_credit_accounting.sql
[2026-08-19T06:11:48.187Z] [log] [migrations] applied 0018_collection_v39_delivery_failure_flag.sql
[2026-08-19T06:11:48.193Z] [log] [migrations] applied 0019_collection_v39_population_and_events.sql
[2026-08-19T06:11:48.196Z] [log] [migrations] applied 0020_collection_v39_airborne_time_series.sql
[2026-08-19T06:11:48.199Z] [log] [migrations] applied 0021_collection_v39_sampling_frame.sql
[2026-08-19T06:11:48.225Z] [log] [migrations] applied 0022_collection_v39_design_probability.sql
[2026-08-19T06:11:48.227Z] [log] [migrations] applied 0023_anchor_probe_results.sql
[2026-08-19T06:11:48.340Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[2026-08-19T06:11:48.544Z] [log] [Duffel] Initialized (testMode=false)
[2026-08-19T06:11:50.569Z] [log] 6:11:50 AM [express] serving on port 5000
[2026-08-19T06:11:50.569Z] [log] Initializing Stripe schema...
[2026-08-19T06:11:50.618Z] [log] Stripe schema ready
[2026-08-19T06:11:51.009Z] [log] Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
[2026-08-19T06:11:51.010Z] [log] Stripe data synced
[2026-08-19T06:11:52.363Z] [warn] Browserslist: browsers data (caniuse-lite) is 6 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[2026-08-19T06:11:54.684Z] [warn] 
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.
[2026-08-19T06:11:55.935Z] [log] 6:11:55 AM [express] GET /api/auth/user 401 in 3ms body=31b
~/workspace$ 