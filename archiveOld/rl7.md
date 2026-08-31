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
6:23:46 PM [express] serving on port 5000
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
[migrations] applied 0022_collection_v39_design_probability.sql
fetchedAt                     : 2026-08-18T18:24:22.883Z
universeCount                 : 4333  (measured AeroDataBox universe)
frameCount                    : 4320  (every feed-eligible universe airport)
  curated (our 276 ∩ frame)   : 267
  unclassified (universe)     : 4053  (provisional REGIONAL, traffic_prior=1.0, §8)
unmapped (no region)          : 13  ⚠ 0CO2, 0TE7, 16A, 38WA, 44U, 4A2, 4K0, 4K5, 65LA, 78WA, 7WA5, 90WA, 9Z8
curated catalog total         : 276  (30 HUB + 89 MID + 157 REGIONAL)
curated ∩ universe            : 267  (ours that ADB serves)
curated in-universe fraction  : 96.7%

Feed eligibility (explicit per layer — NOT one union population):
  pre_eligible  (has FlightSchedules feed)   : 3337
  post_eligible (has LiveUpdates OR ADS-B)   : 2264
  both (pre AND post)                       : 1281

Frame validation:
  exactly-one region per row                : NO — 13 unmapped excluded
  unclassified ⇒ REGIONAL + prior=1.0 (0022) : 4053 rows (enforced by CHECK constraint)
Primary strata (traffic tier × macro-region) — PART 1 §4 / §17 step 11:
  cell                          frame   curated
  HUB      × North America         9        9
  HUB      × Europe                7        7
  HUB      × Asia-Pacific          8        8
  HUB      × Gulf/Africa           2        2
  HUB      × South America         2        2
  HUB      × Oceania               2        2
  MID      × North America        33       33
  MID      × Europe               22       22
  MID      × Asia-Pacific         14       14
  MID      × Gulf/Africa          10       10
  MID      × South America         5        5
  MID      × Oceania               3        3
  REGIONAL × North America      1645       73
  REGIONAL × Europe              815       37
  REGIONAL × Asia-Pacific        701       16
  REGIONAL × Gulf/Africa         406        9
  REGIONAL × South America       287       12
  REGIONAL × Oceania             349        3

  → no empty tier × region cells (every stratum has universe airports)

Missing from universe (not collectable — stays cataloged, PART 1 §4): DTAA, FNLU, HETB, HSSS, LFSZ, OLKA, SEQU, SPIM, WMSK

Persisting frame to clean.adb_sampling_frame (migration 0021)...
  → wrote 4320 rows — the collector now samples from THIS measured frame, not the 276.

Frozen traffic-tier rule v1:
  curated catalog airports → their human-classified tier (HUB/MID/REGIONAL).
  all other universe airports → REGIONAL as "unclassified" (tier_source =
  "unclassified"), traffic_prior starts at 1.0 (§8). This is the plan's own
  §8 long-tail design — NOT a measured traffic class. It is provisional: a
  traffic reference snapshot (or probe data) re-tiers them before the run is
  frozen. No HUB/MID label is invented without traffic evidence.

Feed eligibility: PRE needs FlightSchedules; POST needs FlightLiveUpdates or
  AdsbUpdates — recorded per airport (pre_eligible / post_eligible) so the
  frame never claims "provider supports airport" = "supports every layer".

Balancing variables (PART 1 §4 — reported WITHIN strata, never crossed):
  network degree · intl/domestic · carrier diversity · time zone
  → from a FIXED reference snapshot at frame-build time.
Zero-yield airports: stay in the frame, tracked, never dropped (PART 1 §4).
Only coverage-failed airports leave the frame.
~/workspace$ 