# Production catalog reconciliation and scientific expiry handoff — Nov 20 UTC
Owner-provided read-only PostgreSQL16 metadata transcript, exact stage 6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc. No row values retrieved, no provider calls, no DB writes. All 146 relation lines individually parsed and 2,445 column entries summed; matches reported totals.

| Schema | Tables | Columns | Scope |
|---|---:|---:|---|
| clean | 83 | 1388 | research, operations and some app monitoring |
| phase6_private | 3 | 31 | private native packet custody |
| public | 28 | 342 | app; not blanket research input |
| stripe | 29 | 667 | payment integration; excluded from experiment |
| _system | 1 | 5 | migrations |
| drizzle | 1 | 3 | migrations |
| v39_meta | 1 | 9 | migrations |
| total | 146 | 2445 | metadata only |

The 86 clean/private relations contain 1,419 physical columns, not 1,419 approved predictors. The separate 25-group/provider inventory covers 21 distinct clean tables and 215 listed column entries including a whole-row marker. This census is not a rights clearance for every column.

## Complete research-schema relation triage
Every clean/private table is assigned a review lane below. These lanes are audit routing, not permission to retain provider values forever or a deletion list. A mixed relation needs per-column/per-JSON-path source lineage.

**A. Source custody, scientific records, or mixed lineage (requires actual source-bound expiry and transformation review):**
adb_ingest_events; airborne_eligibility_evidence; airborne_quarantine; clean_airborne_points; fids_query_response; flight_airborne_snapshots; flight_data_pre_post; flight_events; flight_outcomes; flight_population; flight_snapshots; flight_trajectory; historical_feature_store; historical_readiness; raw_airborne_events; raw_delivery; raw_delivery_item; webhook_flight_identity; webhook_flight_schedule_version; webhook_identity_resolution; processing_attempt; prepaid_probe_item_runtime; gate4_alert_prebind_original_v39; phase5_t24_postcommit_witness_v39; population_research_membership; population_research_outcome_link; phase5_cd_pre_admission_receipt_v39; phase5_cd_pre_task_v39; phase6_private.frozen_native_packet_v39; phase6_private.signed_run_day_index_revision_v39.

**B. Control, sampling, budget, custody/index or incident metadata (review for embedded source values, not automatic retention approval):**
adb_adaptive_state_history; adb_airport_sampling_state; adb_anchor_probe; adb_budget_day_adjustment; adb_collection_batches; adb_collection_meta; adb_collection_segments; adb_collection_subs; adb_incident_stop; adb_phase6_admission_attempt; adb_phase6_authorization; adb_phase6_calendar_day; adb_phase6_safety_heartbeat; adb_phase6_settlement_evidence; adb_probe_budget_day; adb_probe_reconciliation_evidence; adb_rest_attempt_ledger; adb_rest_budget_control; adb_sampling_draw; adb_sampling_frame; adb_sampling_frame_registry; gate05_fids_allowed_query_v39; gate05_fids_attempt_v39; gate05_fids_commission_permit_v39; gate05_fids_pilot_scope_v39; gate05_science_delivery_custody_v39; gate4_alert_owned_binding_v39; phase2g_cleanup_journal_v39; phase2g_prepaid_source_intent_v39; phase3_gate05_science_owner_v39; phase3_gate3_canary_owner_v39; phase4_g5_fids_allowed_query_v39; phase4_g5_fids_cohort_budget_v39; phase4_g5_fids_original_binding_v39; phase4_g5_fids_physical_attempt_v39; phase4_g5_fids_physical_owner_v39; phase5_fids_allowed_query_v39; phase5_fids_cycle_budget_v39; phase5_fids_cycle_rest_category_cap_v39; phase5_fids_day_budget_v39; phase5_fids_exact_query_partition_v39; phase5_fids_github_prearm_v39; phase5_fids_original_binding_v39; phase5_fids_physical_attempt_v39; phase5_fids_seven_rest_release_v39; phase5_fids_utc_charge_budget_v39; phase5_fids_utc_rest_category_budget_v39; phase5_other_rest_physical_reservation_v39; phase5_other_rest_reviewed_call_v39; prepaid_probe_delivery_runtime; prepaid_probe_session_runtime; provider_content_blob_ref; retention_tombstone; phase6_private.signed_run_day_epoch_claim_v39.

**C. Legacy app monitoring with possible provider Content, separate review; not automatically a Phase 7 input:**
monitored_flights_v2; risk_score_history_v2. Public monitoring/disruption tables must also be kept separate from research outputs; do not query traveler/customer/payment data for ML.

## Critical gaps visible in physical catalog
- Packet-B durable storage and continuous-target table are not identified in the catalog. Existing pure writer takes a caller-provided sink; this is not proof of deployment or readback. Do not claim a durable release is commissioned.
- The operational PRE snapshot explicitly has features_json, provenance_json, schedule_version, selected_t_milestone_utc and prediction_cutoff_utc. The outcome table has evidence_json and target/status. The source-bound T24 witness carries selected native T and source identifiers/response digest. Their copied source values and JSON lineage need separate custody classification and expiry/readback; no raw-value blanket approval.
- Provider expiry metadata, hashes and control metadata do not certify that all source-shaped nested values are removed. Private frozen/index payload_bytes and review_wire_bytes, generic metadata values, error details and historical feature_text may carry source Contents. Actual retention jobs and their inputs must be verified, not inferred from column names.
- No direct provider row values or private source record identity were inspected by this catalog query. Independent NOAA/ADSB/BTS data requires own source terms; app/Stripe security and privacy are separate.
- Existing Packet B assigns a random ID per horizon row and only checks cohort-bucket split consistency within one packet. That is NOT proof of same-flight paired T−6/T−90 comparison, cross-packet split isolation, or release completeness. Preserve group association using a separately reviewed derived-only random cohort/leg pairing mechanism, no retained source mapping past applicable clock.
- The original 16 feature slots remain the canonical design (#921); the continuous signed target remains #917, neither yet integrated/deployed. Do not silently substitute delay bins for continuous minutes or assume exact source timestamps can persist indefinitely.

## Earliest expiry dependency
First SOURCE Nov20 23:45Z; conservative 24-hour FIDS custody reaches Nov21 23:45Z, 15 minutes before initial service window Nov22 00:00Z. The actual per-observation clock may differ; transform cutoff-safe T24 evidence before its own expiry, not after the flight outcome. Independently sourced qualifying observation/approved derived feature/label linkage must survive lawfully, and if an exact comparator cannot be preserved, declare it not estimable rather than backfill. Other ordinary provider Contents remain on existing max 168h custody and purpose-driven deletion. No delay of lawful expiry or policy widening to save features.

## Operational release
This is a real catalog reconciliation, not a production authorization. Existing source-use determination #904 remains bounded; exact stage metadata separately recorded. A current production expiry/relay rehearsal, reviewed necessary derived output including genuine continuous target and paired association, and a deployable durable write/readback path are still required before a paid GO. Do not rerun disabled restage or source recovery. No automatic launch and no retention exemption claimed.
