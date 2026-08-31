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
12:25:39 AM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
~/workspace$ npm run logs:last | grep "watchdog started" | tail -1
[2026-08-18T00:25:38.134Z] [log] [adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
~/workspace$ 

~/workspace$ pkill -9 -f node
~/workspace$ git pull origin main 
remote: Enumerating objects: 48, done.
remote: Counting objects: 100% (48/48), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 26 (delta 20), reused 26 (delta 20), pack-reused 0 (from 0)
Unpacking objects: 100% (26/26), 30.75 KiB | 49.00 KiB/s, done.
From https://github.com/HKcode22/ReplitTranvr
 * branch            main       -> FETCH_HEAD
   60c4d52..eaac002  main       -> origin/main
Updating 60c4d52..eaac002
Fast-forward
 AugMDnotes/IMPLEMENTATION_LOG.md                        | 1453 +++++++++++++++++++---------
 AugMDnotes/rl6.md                                       |   29 +
 migrations/0021_collection_v39_sampling_frame.sql       |   60 ++
 migrations/0022_collection_v39_design_probability.sql   |  144 +++
 scripts/analyze_flight_data_pre_post.py                 |    4 +-
 scripts/backfill_flight_data_pre_post.ts                |    4 +-
 scripts/build_stratified_catalog.ts                     |  333 +++++--
 scripts/export_flight_data.ts                           |    4 +-
 scripts/measure_coverage.ts                             |    6 +-
 scripts/test-extractor-real-payload.ts                  |   12 +-
 server/db.ts                                            |    2 +
 server/lib/disruption/adbCollectionController_v3.ts     |  202 +++-
 server/lib/disruption/aerodataboxLimiter_v3.ts          |    7 +-
 server/lib/disruption/flightDataPrePostStore_v3.ts      |    4 +-
 server/lib/disruption/flightNotificationExtractor_v3.ts |   13 +-
 server/routes_v3.ts                                     |    4 +-
 shared/schema.ts                                        |    8 +-
 17 files changed, 1693 insertions(+), 596 deletions(-)
 create mode 100644 AugMDnotes/rl6.md
 create mode 100644 migrations/0021_collection_v39_sampling_frame.sql
 create mode 100644 migrations/0022_collection_v39_design_probability.sql
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
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch, dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300, tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB, utcCycle=0,4,8,12,16,20, autoCollect=false)
[Duffel] Initialized (testMode=false)
6:09:08 PM [express] serving on port 5000
Initializing Stripe schema...
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced

~/workspace$ npm run build-catalog

> rest-express@1.0.1 build-catalog
> tsx scripts/build_stratified_catalog.ts

Building the measured sampling frame (Option 1 — universe, not 276)...

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
[migrations] failed to apply 0022_collection_v39_design_probability.sql: column "airport_layer_design_probability" of relation "flight_data_pre_post" already exists
catalog build failed: column "airport_layer_design_probability" of relation "flight_data_pre_post" already exists
~/workspace$ 