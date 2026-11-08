# Phase 5 database atlas — what the SQL tables actually are

**Reference:** `B0062__v39_schema_baseline_20261001.sql` on GitHub `main`, plus additive staged migration files V0076/V0077/V0079/V0080/V0081. Created 2026-11-08 UTC. **This is a code/schema inventory, not a fresh query of the live Replit/Neon database; live deployment, grants, empty rows and Development-vs-Production database differences require their own authorized readonly inspection.**

## The 60-second explanation

- **DBMS:** PostgreSQL is a *relational database management system* (RDBMS). **SQL** means **Structured Query Language**; `structured` does **not** mean all information is flattened into one giant table.
- A **table** is a relation: named columns + rows. A **schema** is a namespace before a table name. Here `clean.flight_population` belongs to the research/collection schema; `public.users` belongs to the application schema. They can coexist in one PostgreSQL database but serve different purposes.
- **Primary key (PK):** uniquely identifies a row. **Foreign key (FK):** references another table, to prevent invalid relationships. **JOIN:** follow those relationships to read connected facts. **Normalization** keeps day setup, airport draws, source responses, selected flights, PRE snapshots and outcomes in separate tables instead of repeating the same facts on every row. The baseline also uses `jsonb` for structured nested payloads.
- In the Replit database browser, choose the correct **database + schema** first; searching for `flight` can show different tables in `clean` and `public` with unrelated purposes. Seeing a table name does **not** establish that it has rows or that it holds verified scientific labels.

## How the research tables relate

```text
clean.adb_phase6_calendar_day   (one batch-day, run_day_index)
      | 1-to-many
      +--> clean.adb_sampling_draw         (four selected airport slots)
      |             |
      |             +--> clean.phase5_fids_day_budget_v39    (planned rights/budget)
      |                              |
      |                              +--> clean.phase5_fids_allowed_query_v39
      |                                           | exact FIDS request
      |                                           +--> clean.phase5_fids_physical_attempt_v39
      |                                           |       irreversible pre-GET reservation
      |                                           +--> clean.phase5_fids_original_binding_v39
      |                                                   source/original proof
      |
      +--> source query --> clean.fids_query_response (one source response)
                                         |
                                         +--> clean.flight_population (0..N members)
                                                    |
                                                    +--> clean.flight_snapshots (T24/T6/T90 PRE)
                                                    +--> clean.flight_outcomes (conditional outcome)
                                                    +--> clean.population_research_membership
                                                            research inclusion/evaluation

clean.raw_delivery --> clean.raw_delivery_item --> clean.webhook_flight_identity
                                   source identity & schedule-event lineage
```

This is a **conceptual workflow drawing**, not a claim that each arrow has a declared SQL `FOREIGN KEY`. The baseline explicitly declares `adb_sampling_draw.run_day_index → adb_phase6_calendar_day.run_day_index` and `flight_population.population_query_id → fids_query_response.population_query_id`. Some scientific joins use separately verified immutable digests/IDs rather than a conventional FK.

## The actual baseline: 76 tables (48 clean + 28 public)

Representative columns were extracted from the repository schema, **not from production data**. For readability, only up to five columns per table are shown; sensitive application field names are omitted. Every baseline table is listed below.

### Research, collection and evidence: `clean` (48)

| Table | What it is for | Example column names from DDL |
|---|---|---|
| `clean.adb_adaptive_state_history` | Prior adaptive-draw state changes and traceable decisions. | `history_id`, `icao`, `state_version`, `observation_class`, `observation_date` |
| `clean.adb_airport_sampling_state` | Per-airport state used by adaptive selection. | `icao`, `ema_yield`, `m_i`, `zero_yield_state`, `consecutive_zero_yield` |
| `clean.adb_anchor_probe` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `probe_id`, `stage`, `icao`, `region`, `window_start` |
| `clean.adb_budget_day_adjustment` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `source_run_day_index`, `target_run_day_index`, `overshoot_credits`, `operator_required`, `source_credit_budget` |
| `clean.adb_collection_batches` | Parent provider collection batches and their lifecycle. | `batch_id`, `batch_seq`, `random_seed`, `status`, `started_at` |
| `clean.adb_collection_meta` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `key`, `value` |
| `clean.adb_collection_segments` | Subwindows and continuity of a collection batch. | `segment_id`, `batch_id`, `run_day_index`, `segment_index`, `segment_kind` |
| `clean.adb_collection_subs` | Provider Alert subscriptions associated with collection. | `subscription_id`, `batch_id`, `icao`, `tier`, `airport_layer_design_probability` |
| `clean.adb_incident_stop` | Safety stop/incident records during collection. | `id`, `cause`, `occurred_at_utc`, `detail`, `resolved` |
| `clean.adb_ingest_events` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `received_at`, `subscription_id`, `batch_id`, `notification_items` |
| `clean.adb_phase6_admission_attempt` | Recorded approval/refusal decisions for prospective runs. | `admission_id`, `attempted_at_utc`, `run_day_index`, `authorization_id`, `manifest_sha256` |
| `clean.adb_phase6_authorization` | Explicit paid Phase6 release authorization boundary. | `singleton_key`, `authorization_id`, `manifest_sha256`, `calendar_hash`, `config_hash` |
| `clean.adb_phase6_calendar_day` | One row per planned batch-day: design, UTC timing, crossover group, frozen hashes. | `run_day_index`, `budget_day_id`, `calendar_hash`, `config_hash`, `date_utc` |
| `clean.adb_phase6_safety_heartbeat` | Owner heartbeat and safety cadence for running collection. | `singleton_key`, `authorization_id`, `code_sha`, `config_hash`, `watchdog_poll_ms` |
| `clean.adb_phase6_settlement_evidence` | Post-billing or cleanup settlement evidence. | `segment_id`, `batch_id`, `authorization_id`, `config_hash`, `evidence_status` |
| `clean.adb_probe_budget_day` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `probe_budget_day_id`, `state`, `cap_credits`, `created_at`, `closed_at` |
| `clean.adb_probe_reconciliation_evidence` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `probe_id`, `runtime_session_id`, `stage`, `icao`, `evidence_status` |
| `clean.adb_rest_attempt_ledger` | Generic physical REST reservation journal, not the new Phase5 scoped ledger. | `reservation_id`, `cycle_id`, `category`, `units`, `attempt_number` |
| `clean.adb_rest_budget_control` | Generic provider REST cycle cap/control (separate from Stage V0079 budgets). | `category`, `cycle_id`, `cap_units`, `used_units`, `enabled` |
| `clean.adb_sampling_draw` | Four selected airports/slots per parent batch-day; probabilities, seed and selection time. | `draw_id`, `run_day_index`, `slot_id`, `target_region`, `draw_type` |
| `clean.adb_sampling_frame` | Candidate sampling frame for airport selection. | `icao`, `tier`, `tier_source`, `traffic_prior`, `region` |
| `clean.adb_sampling_frame_registry` | Registered versions and hashes of the airport sampling frame. | `registry_key`, `active_frame_version`, `frame_hash`, `activated_at`, `traffic_reference_hash` |
| `clean.airborne_eligibility_evidence` | Source/eligibility validation for airborne evidence. | `flight_instance_id`, `population_query_id`, `evidence_source`, `movement_milestone`, `evidence_observed_utc` |
| `clean.airborne_quarantine` | Airborne samples withheld due to evidence-quality/identity issues. | `quarantine_id`, `raw_event_id`, `flight_instance_id`, `reason`, `evidence_json` |
| `clean.clean_airborne_points` | Normalized airborne position measurements. | `id`, `raw_event_id`, `flight_key`, `event_timestamp`, `provider_published_utc` |
| `clean.fids_query_response` | One FIDS request/response original and availability/retention timestamps. | `population_query_id`, `source_airport_icao`, `query_direction`, `service_window_start_utc`, `service_window_end_utc` |
| `clean.flight_airborne_snapshots` | Time-stamped airborne evidence/derived observations. | `airborne_snapshot_id`, `flight_id`, `flight_number`, `carrier_iata`, `airline` |
| `clean.flight_data_pre_post` | PRE versus POST study evidence linkage. | `id`, `flight_number`, `carrier_iata`, `carrier_icao`, `carrier_name` |
| `clean.flight_events` | Flight-event observations. | `id`, `ingest_event_id`, `batch_id`, `subscription_id`, `event_key` |
| `clean.flight_outcomes` | Outcome status/target and censoring; not all are proven actual flight labels. | `id`, `flight_instance_id`, `flight_operational_state`, `target`, `label_status` |
| `clean.flight_population` | Flight/service members found in a particular source query. | `id`, `batch_id`, `source_airport_icao`, `source_airport_tier`, `window_start_utc` |
| `clean.flight_snapshots` | As-of flight feature state; PRE is frozen at cutoff. | `id`, `flight_instance_id`, `prediction_state`, `horizon`, `prediction_cutoff_utc` |
| `clean.flight_trajectory` | Aggregated flight position/movement series. | `id`, `flight_key`, `flight_number`, `carrier_iata`, `first_point_utc` |
| `clean.historical_feature_store` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `entity_type`, `entity_id`, `feature_name`, `feature_value` |
| `clean.historical_readiness` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `entity_type`, `entity_id`, `history_ready_at`, `bootstrap_end` |
| `clean.monitored_flights_v2` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `flight_number`, `carrier_iata`, `departure_date`, `departure_time` |
| `clean.population_research_membership` | Which selected population member belongs to a research sample. | `population_member_id`, `batch_id`, `source_airport_icao`, `source_airport_tier`, `window_start_utc` |
| `clean.population_research_outcome_link` | Links population member to candidate observed outcomes. | `population_member_id`, `target`, `label_status`, `updated_at_utc` |
| `clean.processing_attempt` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `delivery_id`, `attempt_index`, `parser_version`, `schema_version` |
| `clean.provider_content_blob_ref` | Retention-scoped provider-Content reference and expiry metadata. | `blob_ref_id`, `storage_kind`, `contract_version`, `object_name`, `content_class` |
| `clean.raw_airborne_events` | Raw position-event ingestion. | `id`, `ingest_event_id`, `batch_id`, `subscription_id`, `flight_number` |
| `clean.raw_delivery` | Raw inbound provider webhook delivery envelope. | `id`, `delivery_id`, `subscription_id`, `batch_id`, `http_method` |
| `clean.raw_delivery_item` | Individual notification members belonging to a raw delivery. | `id`, `delivery_id`, `item_index`, `flight_number`, `carrier_iata` |
| `clean.retention_tombstone` | Audit trail for expiry/deletion transitions. | `id`, `surface`, `record_id`, `content_hash`, `expired_at` |
| `clean.risk_score_history_v2` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `monitored_flight_id`, `scored_at`, `actual_delay_minutes`, `actual_cancelled` |
| `clean.webhook_flight_identity` | Provider alias to canonical flight-identity mapping. | `id`, `provider_identity_alias`, `provider_flight_id`, `flight_instance_id`, `operating_carrier` |
| `clean.webhook_flight_schedule_version` | Schedule history reported through webhook source. | `schedule_version_pk`, `flight_instance_id`, `retime_version`, `observed_scheduled_gate_out_utc`, `current_service_date` |
| `clean.webhook_identity_resolution` | Evidence and decisions resolving inbound identity aliases. | `resolution_id`, `delivery_id`, `item_index`, `raw_item_sha256`, `resolution_status` |

### Application/traveler product: `public` (28)

| Table | What it is for | Example column names from DDL |
|---|---|---|
| `public.agency_accounts` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `name`, `contact_email`, `contact_name`, `plan` |
| `public.bland_calls` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `call_request_id`, `user_id`, `bland_call_id`, `phone_number` |
| `public.calendar_entries` | User-facing itinerary/event calendar entries, not the 31-day science calendar. | `id`, `user_id`, `payment_id`, `proposal_id`, `entry_type` |
| `public.call_requests` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `destination`, `phone`, `date_from` |
| `public.callback_requests` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `name`, `phone`, `email`, `status` |
| `public.disruption_alternatives` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `monitored_flight_id`, `flight_number`, `carrier_iata`, `carrier_name` |
| `public.flight_travelers` | Traveler links to flights. | `id`, `monitored_flight_id`, `agency_id`, `traveler_name`, `traveler_email` |
| `public.guest_proposals` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `email`, `origin_iata`, `destination_iata`, `departure_date` |
| `public.health_reports` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `generated_at`, `flights_analyzed`, `flights_flagged`, `true_positives` |
| `public.hotel_bookings` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `hotel_option_id`, `payment_id`, `provider` |
| `public.hotel_options` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `search_id`, `provider`, `provider_hotel_id`, `provider_rate_id` |
| `public.hotel_searches` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `call_request_id`, `proposal_id`, `provider` |
| `public.itinerary_proposals` | Proposed itineraries. | `id`, `user_id`, `call_request_id`, `title`, `summary` |
| `public.monitored_flights` | Application-side flights a traveler follows. | `id`, `agency_id`, `flight_number`, `carrier_iata`, `departure_date` |
| `public.notifications` | User-facing application notifications. | `id`, `user_id`, `type`, `title`, `body` |
| `public.payments` | Payment ledger for travel product, not AeroDataBox REST charges. | `id`, `user_id`, `proposal_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id` |
| `public.phone_email_map` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `phone`, `email`, `created_at`, `updated_at` |
| `public.promo_codes` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `code`, `description`, `override_amount_cents`, `force_manual` |
| `public.proposal_items` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `proposal_id`, `description`, `price_estimate`, `duffel_offer_id` |
| `public.public_flight_subscribers` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `email`, `flight_number`, `carrier_iata`, `departure_date` |
| `public.risk_score_history` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `monitored_flight_id`, `score`, `tier`, `signals` |
| `public.saved_cards` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `last_four`, `expiry_month`, `expiry_year` |
| `public.sessions` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `sid`, `sess`, `expire` |
| `public.system_settings` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `key`, `value`, `updated_at` |
| `public.traveler_profiles` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `name`, `phone`, `home_airport` |
| `public.trip_requests` | User travel requests. | `id`, `payment_id`, `user_id`, `message`, `created_at` |
| `public.user_monitored_flights` | Schema-defined research/application table; inspect listed representative fields to determine its exact role. | `id`, `user_id`, `flight_number`, `carrier_iata`, `departure_date` |
| `public.users` | Application users (separate product schema; sensitive columns intentionally omitted). | `id`, `email`, `first_name`, `last_name`, `profile_image_url` |

## Additive collection-specific migrations (not part of B0062)

The separate staged migrations declare these tables. The previous Phase 5 GitHub readonly checks reported **V0079/V0080/V0081 installed in production**, but this document does **not** imply any future migration is installed, any approved rights, or actual nonempty flight records.

### V0076: V0076__phase4_gate5_logged_physical_fids_attempt_owner_v39.sql

| Table | Example fields |
|---|---|
| `clean.phase4_g5_fids_cohort_budget_v39` | `manifest_sha256`, `cohort_id`, `project_unit_ceiling`, `reserved_units` |
| `clean.phase4_g5_fids_physical_owner_v39` | `owner_digest`, `manifest_sha256`, `horizon`, `github_run_id`, `reviewed_authorization_sha256`, `state` |
| `clean.phase4_g5_fids_allowed_query_v39` | `query_digest`, `owner_digest`, `query_index`, `max_physical_attempts`, `last_reserved_attempt` |
| `clean.phase4_g5_fids_physical_attempt_v39` | `expected_reservation_sha256`, `owner_digest`, `query_digest`, `github_run_id`, `physical_attempt_number`, `charged_reserved_units` |

### V0077: V0077__phase4_gate5_original_fids_reservation_binding_v39.sql

| Table | Example fields |
|---|---|
| `clean.phase4_g5_fids_original_binding_v39` | `population_query_id`, `expected_reservation_sha256`, `query_digest`, `manifest_sha256`, `original_response_sha256`, `rights_review_artifact_sha256` |

### V0079: V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql

| Table | Example fields |
|---|---|
| `clean.phase5_fids_cycle_budget_v39` | `manifest_sha256`, `cycle_api_ceiling`, `other_category_reserved_units`, `protected_api_floor_units`, `physically_reserved_units` |
| `clean.phase5_fids_day_budget_v39` | `manifest_sha256`, `run_day_index`, `budget_day_utc`, `calendar_hash`, `config_hash`, `frame_hash`, `early_draw_sha256` |
| `clean.phase5_fids_utc_charge_budget_v39` | `manifest_sha256`, `charge_day_utc`, `daily_api_ceiling`, `daily_other_reserved_units`, `physically_reserved_units` |
| `clean.phase5_fids_allowed_query_v39` | `query_digest`, `manifest_sha256`, `run_day_index`, `query_key`, `slot_id`, `horizon`, `airport_icao` |
| `clean.phase5_fids_physical_attempt_v39` | `reservation_sha256`, `query_digest`, `manifest_sha256`, `github_run_id`, `physical_attempt_number`, `charged_reserved_units`, `charged_utc_date` |
| `clean.phase5_fids_original_binding_v39` | `population_query_id`, `reservation_sha256`, `query_digest`, `manifest_sha256`, `response_hash`, `decoded_original_body_sha256`, `rights_review_sha256` |

### V0080: V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql

| Table | Example fields |
|---|---|
| `clean.phase5_fids_github_prearm_v39` | `query_digest`, `manifest_sha256`, `github_run_id`, `early_draw_sha256`, `rights_review_sha256`, `prearm_sha256` |

### V0081: V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql

| Table | Example fields |
|---|---|
| `clean.phase5_t24_postcommit_witness_v39` | `snapshot_id`, `flight_instance_id`, `population_query_id`, `fids_response_hash`, `source_query_digest`, `rights_review_sha256`, `selected_t_version` |

### V0082: V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql

**NEW staged additive migration, merged in PR #470; it has NOT been installed on production.**

| Table | One row means | Representative columns |
|---|---|---|
| `clean.phase5_fids_seven_rest_release_v39` | Reviewed 31-day source-grid, provider-range and REST budget SHA context for one manifest | `manifest_sha256`, `reviewed_source_request_grid_sha256`, `reviewed_provider_range_sha256`, `verified_provider_max_range_minutes`, `reviewed_category_budget_sha256` |
| `clean.phase5_fids_cycle_rest_category_cap_v39` | One of seven project REST category limits for a manifest | `manifest_sha256`, `category`, `ceiling_units` |
| `clean.phase5_fids_utc_rest_category_budget_v39` | One category's frozen planned units and physical reservation debit on an actual UTC charge date | `manifest_sha256`, `charge_day_utc`, `category`, `planned_units`, `physically_reserved_units` |
| `clean.phase5_fids_exact_query_partition_v39` | One V0079 approved query's exact exposure child, provider range partition, and BASE/SPLIT category | `query_digest`, `manifest_sha256`, `segment_index`, `partition_index`, `window_shape`, `rest_category` |

V0082's additional `BEFORE INSERT` trigger on `clean.phase5_fids_physical_attempt_v39` enforces exact source geometry and category spending **inside the existing V0079 SQL transaction**. It is source-only and **does not yet physically book the five non-FIDS categories**, or operate real Alert SEND credits. GitHub code and disposable PG16 success do not mean a migration was installed on the live Replit/Neon database. See [V0082 engineering checkpoint](2026-11-08_SEVEN_CATEGORY_V0082_ATOMIC_SOURCE_GET_LEDGER_CHECKPOINT.md).

### V0083: separately staged non-source REST physical attempts and immutable counter proof

**NEW proposed additive SQL (PR #475), not installed in production.** It depends on V0082 and does not overwrite V0079 SOURCE reservation functions.

| Table | Row meaning and primary key | Useful related fields |
|---|---|---|
| `clean.phase5_other_rest_reviewed_call_v39` | One immutable reviewed prospective **physical** GET, `request_sha256` | `manifest_sha256`, `rest_category`, `planned_charge_day_utc`, `api_units_per_get`, `github_run_id`, `rights_review_sha256`, `provider_price_sha256`, optional `source_query_digest` **mandatory for FIDS_RETRY** |
| `clean.phase5_other_rest_physical_reservation_v39` | One irrevocable once-only receipt, `reservation_sha256`, unique `request_sha256` | `charged_utc_date`, `approved_api_units`, `previous_reserved_units`, `reserved_txid`, `github_run_id` |

The V0083 `reserve_phase5_other_rest_once_v39()` **SECURITY DEFINER** function (no PUBLIC EXECUTE) locks the frozen cycle/UTC category ledgers before any provider GET, checks exact current UTC day, authorization, independently approved rights/cost/price/GitHub run, one request only, seven-category caps, and commits a physical receipt plus the category's exact charge in **one transaction**. It extends the V0082 category-immutability trigger so non-FIDS increments require a same-transaction, matching prior-balance receipt. Source BASE/SPLIT remain exact `+2` on their original V0079 path. **FIDS_RETRY cannot be reserved without its own previous actual committed V0079 source attempt and no bound original.** See [V0083 technical checkpoint](2026-11-08_V0083_FIVE_OTHER_REST_RESERVATION_SAFETY_CHECKPOINT.md). A schema SQL source file is NOT evidence of a current physical production table.

V0078 modifies uniqueness constraints on Phase4 evidence and declares no new table in its migration file. Earlier V0066–V0075 migrations and any separately managed runtime schema objects may add further tables: this atlas is **complete for B0062 and the named V0076–V0083 source/evidence tables**, **not a claim of every table that currently exists on a live database**.

## Phase5 seven important V0079 tables — how to read them

| Research table | Logical grain (what one row means) | Important link |
|---|---|---|
| `phase5_fids_cycle_budget_v39` | A reviewed Phase5 cycle budget by manifest hash | `manifest_sha256` |
| `phase5_fids_day_budget_v39` | One budget per numbered source batch-day | `(manifest_sha256, run_day_index)` |
| `phase5_fids_utc_charge_budget_v39` | One REST charge-day budget (may be *before* its service day) | `(manifest_sha256, charge_day_utc)` |
| `phase5_fids_allowed_query_v39` | One exact prospective proposed provider request | `query_digest`, `run_day_index` |
| `phase5_fids_physical_attempt_v39` | One irreversible physical GET reservation | `query_digest`, `charged_utc_date` |
| `phase5_fids_original_binding_v39` | Original provider response bound after actual persistence | `population_query_id`, `reservation_sha256` |
| `phase5_fids_github_prearm_v39` (V0080) | Exact GitHub Actions job/run identity precommitted before source | Query digest and approved run ID |

V0081's `phase5_t24_postcommit_witness_v39` is an **eighth** table in the latest staged Phase5 installation and provides the independently committed T−24h witness. A **source GET budget** and an **Alert SEND credit budget** are separate resources; do not use these REST tables to infer Alerts balance.

## Finding your way in Replit's table explorer

1. Check whether the explorer is attached to your **development** database or your **external/production Neon PostgreSQL** connection; they need not be identical. The folder name in Replit is not proof of which PostgreSQL instance is open.
2. Expand **`clean`** for science/collection; expand **`public`** for app/travel/customer tables. Start with `clean.adb_phase6_calendar_day`, then `clean.adb_sampling_draw`, then `clean.fids_query_response` and `clean.flight_population`.
3. For Phase5 release plumbing, inspect the *names* `clean.phase5_fids_allowed_query_v39`, `clean.phase5_fids_physical_attempt_v39`, `clean.phase5_fids_original_binding_v39`, and `clean.phase5_t24_postcommit_witness_v39`. Empty does not mean broken: no Phase6 paid launch has been certified.
4. Use metadata-only, read-only `information_schema.tables` / `information_schema.columns` queries in the companion SQL lab to inspect actual installed structures. **No writes or raw provider-content dumps** are needed.

## Source files and truth boundaries

- Baseline B0062: [`migrations/baseline/B0062__v39_schema_baseline_20261001.sql`](../../migrations/baseline/B0062__v39_schema_baseline_20261001.sql).
- New Phase5 budget/custody: [`V0079`](../../migrations/staged/V0079__phase5_fids_31day_physical_attempt_and_original_binding_v39.sql), [`V0080`](../../migrations/staged/V0080__phase5_bind_actual_github_run_id_before_fids_get_v39.sql), [`V0081`](../../migrations/staged/V0081__phase5_t24_separate_transaction_postcommit_witness_v39.sql).
- [Plan f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) controls exposed segments, not a naive consecutive-day 4h-only source grid.
- [Source partition implementation checkpoint](2026-11-08_AMENDMENT_C_REAL_SOURCE_SEGMENT_RELEASE_CHECKPOINT.md) describes exact source-category and live-source gap remaining.

**No paid GET, SQL migration installation, live DB query, credential or personal data is performed by this guide. Phase5 scientific FREEZE=HOLD; Phase6 paid GO=NO.**
