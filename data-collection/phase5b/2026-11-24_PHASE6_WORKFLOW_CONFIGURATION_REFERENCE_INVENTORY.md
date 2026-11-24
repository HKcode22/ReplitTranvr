# Phase5B static workflow configuration inventory — 2026-11-24

PROPOSAL / read-only source census. Production target 9c9cddb1aaeb04934d94af2937ee158e6d991f6c; relay c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed. Scope: 17 active/relevant workflow YAML files, including all eight direct routes, children, retention, heartbeat and relay. Every literal `vars.NAME` and `secrets.NAME` reference is enumerated with exact source lines. This is NOT a live secret-value audit, not the complete repository, and not proof any reference is required or obsolete. Dynamic lookups, programmatic environment reads, SQL ACLs, non-selected workflows and effective environment shadowing require further inventory. No secret values read or printed. No production changes authorized.

## Counts

- HKcode22/ReplitTranvr secrets: 169
- HKcode22/ReplitTranvr vars: 68
- HKcode22/TravnrClockRelay secrets: 1
- HKcode22/TravnrClockRelay vars: 15

Distinct per-repository/kind references: 253. A name in more than one workflow is a reuse candidate, not automatically redundant.

## Workflows and scheduling

| Repo | Workflow | Unique references | Cron UTC | Environment declarations |
|---|---|---:|---|---|
| ReplitTranvr | phase6-direct-recovery-tick.yml | 21 | none | phase6-protected-runtime |
| ReplitTranvr | phase5-source-upcoming-queue-main-scheduled-readonly.yml | 91 | '5,15,25,35,45,55 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase6-nonpaid-source-day-prepare-publish.yml | 29 | '2,12,22,32,42,52 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase6-private-later-enrollment.yml | 28 | '7,17,27,37,47,57 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase5-cd-github-one-queued-t24-witness-main-manual.yml | 38 | '3,8,13,18,23,28,33,38,43,48,53,58 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase5-cd-github-bounded-pre-tick.yml | 36 | '1,6,11,16,21,26,31,36,41,46,51,56 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase5-cd-github-existing-queue-lease-watchdog.yml | 17 | '4,9,14,19,24,29,34,39,44,49,54,59 * * * *' | phase6-protected-runtime |
| ReplitTranvr | phase5-six-slot-approved-early-four-airport-draw.yml | 11 | '17 0,4,8,12,16,20 * * *' | repository/no environment |
| ReplitTranvr | phase5-private-blob-retention-readonly-sentinel-no-provider.yml | 3 | '19 * * * *' | repository/no environment |
| ReplitTranvr | phase5-primary-fids-expiry-no-provider.yml | 18 | '7,22,37,52 * * * *' | repository/no environment |
| ReplitTranvr | phase5-one-signed-day-source-child-dispatch.yml | 60 | none | phase6-protected-runtime |
| ReplitTranvr | phase5-one-signed-future-post-v0083-main-manual.yml | 52 | none | phase6-protected-runtime |
| ReplitTranvr | phase6-stored-post-recovery-no-provider.yml | 39 | none | phase6-protected-runtime |
| ReplitTranvr | phase6-autonomous-gh-controller-heartbeat-no-provider.yml | 8 | '7,37 * * * *' | repository/no environment |
| ReplitTranvr | phase6-rolling-controller-bounded-session.yml | 28 | '13 */2 * * *' | repository/no environment |
| ReplitTranvr | phase5-phase6-append-only-day-shard-dbclock-readonly.yml | 12 | '*/10 * * * *' | repository/no environment |
| TravnrClockRelay | external-clock.yml | 16 | none | travnr-target-forward |

## Exact source references and preliminary classification

Each entry needs final KEEP / CONSOLIDATE / REDESIGN / RETIRE CANDIDATE / UNKNOWN with consumer semantics, replacement evidence and actual scoped admission. Classification below is a heuristic, NOT removal approval.

| Repo | Kind | Name | Workflows | Initial category |
|---|---|---|---:|---|
| ReplitTranvr | secrets | `AERODATABOX_API_KEY` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_CD_GH_BURST_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_E_ROUTE_FEATURES_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PHASE5_CANARY_APPROVED` | 4 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PRE_APPROVED_CODE_SHA` | 4 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_CD_GH_PRE_ARMED` | 4 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PRE_ROSTER_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_CD_GH_PRE_STOP` | 6 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PREPARE_ARMED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PRIVATE_CURRENT_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_PRIVATE_LATER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_STANDALONE_LATER_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_CD_GH_T24_PREPARE_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_CD_GH_T24_ROSTER_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_CD_GH_T24_WITNESS_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P5_PRIMARY_FIDS_SWEEP_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_RETENTION_READER_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_SHARD_INDEX_RO_CALENDAR_SHA256` | 1 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `P5_SHARD_INDEX_RO_CODE_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P5_V39_OTHER_REST_RESERVE_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_V39_OTHER_REST_REVIEW_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_V39_PRE_DATABASE_URL` | 5 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_V39_PREPARE_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P5_V39_T24_WITNESS_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_NATIVE_LATER_RUNTIME_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_NATIVE_POST_POLICY_BASE64` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NATIVE_POST_POLICY_SHA256` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NATIVE_POST_PRODUCER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_NONPAID_DAILY_POLICY_BASE64` | 8 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_DAILY_POLICY_SHA256` | 8 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_NONPAID_SIGNING_POLICY_BASE64` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_SIGNING_POLICY_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_SOURCE_APPROVED_MAIN_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_SOURCE_RUNTIME_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_NONPAID_TRANSPORT_TRUST_BASE64` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_NONPAID_TRANSPORT_TRUST_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_POST_CONTRACT_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64` | 2 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_POST_PRESERVATION_POLICY_BASE64` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_PRESERVATION_POLICY_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_PROFILE_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_POST_RECOVERY_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_POST_SCOPED_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_POST_STORAGE_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_POLICY_BASE64` | 5 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256` | 5 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_PROOF_ISSUER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256` | 5 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64` | 3 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_READBACK_DATABASE_URL` | 3 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_READBACK_ROLE` | 3 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED` | 3 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN` | 3 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN` | 3 | other — review purpose |
| ReplitTranvr | secrets | `P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED` | 3 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_DAY_EPOCH_REVIEW_PINS_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_DAY_EPOCH_REVIEW_WIRE_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_DAY_EPOCH_REVIEWER_PUBLIC_KEY_PEM_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_DAY_REVIEWER_KEY_BASE64` | 2 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_LATER_REVIEWER_KEY_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_CHILD_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_OUTCOME_TAIL_HOURS` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_PARENT_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_REVIEWER_KEY_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_REVIEWER_TRUST_BASE64` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PRIVATE_POST_STORED_REVIEW_APPROVED` | 3 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_PUBLISHER_DATABASE_URL` | 6 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PRIVATE_READER_DATABASE_URL` | 8 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_QUERY_REVIEW_WIRE_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_QUERY_REVIEWER_PUBLIC_KEY_PEM_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64` | 9 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED` | 9 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_SOURCE_TRANSPORT_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_ROLLING_CHAIN_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_DIRECT_RECOVERY_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_FOUR_SESSION_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_HISTORY_RETIREMENT_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_SESSION_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_SESSION_DEADLINE_UTC` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_ROLLING_SESSION_EPOCH_UTC` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_ROLLING_WINDOW_AUTHORIZATION_ID` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_ROLLING_WINDOW_CUSTODY_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P6_ROLLING_WINDOW_EXPECTED_LOGIN` | 1 | other — review purpose |
| ReplitTranvr | secrets | `P6_T24_CUSTODY_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `P7_EXPIRY_READER_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `P7_EXPIRY_WRITER_DATABASE_URL` | 1 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_APPROVED_CODE_SHA` | 5 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_AUTO_SOURCE_DISPATCH_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_CALENDAR_HASH` | 4 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_CONFIG_HASH` | 4 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_EARLY_DRAW_DATABASE_URL` | 2 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `V39_P5_EARLY_DRAW_EFFECTIVE_ROLE` | 2 | other — review purpose |
| ReplitTranvr | secrets | `V39_P5_EARLY_DRAW_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_FRAME_HASH` | 5 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_APPROVED_CODE_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_AUTO_DISPATCH_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_BATCH_AUTO_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_DAY_REGISTRY_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_SIGNED_PACKET_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_LATER_PRE_T24_RECEIPT_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_MANIFEST_SHA256` | 13 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_NATIVE_T_SEMANTICS_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_POST_APPROVED_CODE_SHA` | 3 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_POST_CATEGORY_BUDGET_SHA256` | 3 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_POST_CONTEXT_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_POST_OWNER_APPROVED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_POST_PRICE_SHA256` | 3 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_POST_PROVIDER_CONTRACT_SHA256` | 3 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_POST_REVIEWED_REQUEST_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_POST_SIGNED_PACKET_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_PREPARE_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_PROVIDER_CONTRACT_SHA256` | 3 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_QUERY_DIGEST` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_QUEUE_APPROVED_CODE_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_RELEASE_SHA256` | 12 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_REST_UNIT_PRICE_APPROVED` | 2 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_RIGHTS_SHA256` | 12 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_SEVEN_REST_BUDGET_SIGNED` | 4 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_P5_SIGNED_DAY_REGISTRY_RELEASE` | 2 | other — review purpose |
| ReplitTranvr | secrets | `V39_P5_SIGNED_QUERY_JSON_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_SOURCE_BATCH_REGISTRY_SHA256` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_SOURCE_DATABASE_URL` | 5 | credential/connection — KEEP access boundary |
| ReplitTranvr | secrets | `V39_P5_SOURCE_DB_ROLE_REVIEWED` | 2 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_SOURCE_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_SOURCE_QUEUE_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_T24_APPROVED_CODE_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_T24_OWNER_APPROVED` | 1 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_P5_T24_SIGNED_PACKET_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_P5_VERIFIED_PROVIDER_MAX_RANGE_MINUTES` | 1 | other — review purpose |
| ReplitTranvr | secrets | `V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | secrets | `V39_PHASE5_FREEZE_SIGNED` | 11 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_PHASE5_SOURCE_RIGHTS_APPROVED` | 11 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | secrets | `V39_PHASE6_OWNER_APPROVED` | 3 | admission/control — review overlap |
| ReplitTranvr | secrets | `V39_PHASE6_PROCESS_ARMED` | 11 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_AUTO_SOURCE_DISPATCH_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_CD_GH_BURST_TICKS` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_CD_GH_PRE_MODE` | 4 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_CD_GH_PRE_SCHEDULE_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_CD_GH_QUEUED_T24_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_CD_GH_ROSTER_PATH` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_CD_GH_T24_SCHEDULE_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_CD_GH_T24_SCHEDULE_ROSTER_PATH` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_CD_GH_WATCHDOG_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_LATER_PRE_AUTO_DISPATCH_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_LATER_PRE_BATCH_REGISTRY_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_LATER_PRE_DAY_INDEX` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_LATER_PRE_FROZEN_PACKET_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_POST_AUTO_DISPATCH_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_POST_FROZEN_PACKET_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_BACKSTOP_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_DEADLINE_PROFILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_EXPIRY_APPROVAL` | 2 | other — review purpose |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` | 2 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_PRIMARY_FIDS_EXPIRY_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_RETENTION_EXPECTED_READER_ROLE` | 1 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | vars | `P5_RETENTION_READONLY_MONITOR_ENABLED` | 1 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | vars | `P5_SHARD_INDEX_RO_CURRENT_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_SHARD_INDEX_RO_ENABLED` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_SHARD_INDEX_RO_INDEX_FILE` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P5_SOURCE_BATCH_REGISTRY_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_SOURCE_BATCH_RUN_DAY_INDEX` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_SOURCE_QUEUE_OBSERVER_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_SOURCE_SIGNED_FROZEN_PACKET_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_T24_AUTO_DISPATCH_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P5_T24_READONLY_SIGNED_PACKET_FILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P5_T24_SOURCE_READONLY_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_FULL_RETENTION_BACKSTOP_ENABLED` | 1 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | vars | `P6_NATIVE_LATER_RUNTIME_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_NATIVE_POST_PRODUCER_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_NONPAID_SOURCE_SCHEDULE_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PHASE7_POST_RECOVERY_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_EPOCH_DEADLINE_PROFILE` | 1 | other — review purpose |
| ReplitTranvr | vars | `P6_PRIVATE_EPOCH_EXPIRY_APPROVAL` | 1 | other — review purpose |
| ReplitTranvr | vars | `P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256` | 1 | science/rights/spend/retention — preserve semantics |
| ReplitTranvr | vars | `P6_PRIVATE_EPOCH_EXPIRY_MODE` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_LATER_ENROLL_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_POST_PARENT_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_SOURCE_PARENT_RO_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_SOURCE_REVIEW_MODE` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_T24_ENROLL_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_PRIVATE_T24_EXECUTION_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_ROLLING_CONTROLLER_ENABLED` | 5 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_ROLLING_DIRECT_RECOVERY_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC` | 2 | other — review purpose |
| ReplitTranvr | vars | `P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_ROLLING_SCHEDULED_ROOT_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_ROLLING_WINDOW_CUSTODY_ENABLED` | 2 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P6_T24_CUSTODY_ENABLED` | 1 | admission/control — review overlap |
| ReplitTranvr | vars | `P7_EXPIRY_APPROVAL` | 1 | other — review purpose |
| ReplitTranvr | vars | `P7_EXPIRY_APPROVED_MAIN_SHA` | 1 | identity/policy binding — review coupling |
| ReplitTranvr | vars | `P7_EXPIRY_ENABLED` | 1 | admission/control — review overlap |
| TravnrClockRelay | secrets | `TRAVNR_TARGET_ACTIONS_TOKEN` | 1 | credential/connection — KEEP access boundary |
| TravnrClockRelay | vars | `TRAVNR_APPROVED_TARGET_MAIN_SHA` | 1 | identity/policy binding — review coupling |
| TravnrClockRelay | vars | `TRAVNR_EXTERNAL_LANE_COMMISSION_APPROVED` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_RELAY_DIRECT_TICK_APPROVED` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_RELAY_FULL_RETENTION_APPROVED` | 1 | science/rights/spend/retention — preserve semantics |
| TravnrClockRelay | vars | `TRAVNR_RELAY_MODE` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_RELAY_PRIMARY_ENABLED` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_RELAY_PRIMARY_SINCE_UTC` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_RELAY_ROLLING_ENABLED` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_RELAY_ROLLING_ROUTE` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_RELAY_ROLLING_SINCE_UTC` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_ROLLING_FOUR_APPROVED` | 1 | admission/control — review overlap |
| TravnrClockRelay | vars | `TRAVNR_ROLLING_POLICY_FROM_UTC` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_ROLLING_POLICY_UNTIL_UTC` | 1 | other — review purpose |
| TravnrClockRelay | vars | `TRAVNR_TARGET_FORWARD_ENV_READY` | 1 | other — review purpose |

## Line-level dependency register

### ReplitTranvr / secrets.AERODATABOX_API_KEY
- [phase5-one-signed-day-source-child-dispatch.yml:87,200,406](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L87)
- [phase5-one-signed-future-post-v0083-main-manual.yml:236](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L236)

### ReplitTranvr / secrets.P5_CD_GH_BURST_APPROVED
- [phase5-cd-github-bounded-pre-tick.yml:129](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L129)

### ReplitTranvr / secrets.P5_CD_GH_E_ROUTE_FEATURES_APPROVED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:113,233](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L113)
- [phase5-cd-github-bounded-pre-tick.yml:159](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L159)

### ReplitTranvr / secrets.P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:114,234](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L114)
- [phase5-cd-github-bounded-pre-tick.yml:160](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L160)

### ReplitTranvr / secrets.P5_CD_GH_PHASE5_CANARY_APPROVED
- [phase6-private-later-enrollment.yml:71,137](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L71)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:108,230](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L108)
- [phase5-cd-github-bounded-pre-tick.yml:131](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L131)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:80](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L80)

### ReplitTranvr / secrets.P5_CD_GH_PRE_APPROVED_CODE_SHA
- [phase6-private-later-enrollment.yml:72,138](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L72)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:110,232](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L110)
- [phase5-cd-github-bounded-pre-tick.yml:132](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L132)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:81](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L81)

### ReplitTranvr / secrets.P5_CD_GH_PRE_ARMED
- [phase6-private-later-enrollment.yml:68,134](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L68)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:105,227](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L105)
- [phase5-cd-github-bounded-pre-tick.yml:123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L123)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:77](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L77)

### ReplitTranvr / secrets.P5_CD_GH_PRE_ROSTER_SHA256
- [phase5-cd-github-bounded-pre-tick.yml:153](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L153)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:83](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L83)

### ReplitTranvr / secrets.P5_CD_GH_PRE_STOP
- [phase6-direct-recovery-tick.yml:123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L123)
- [phase6-private-later-enrollment.yml:69,135](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L69)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:106,228](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L106)
- [phase5-cd-github-bounded-pre-tick.yml:126](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L126)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:78](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L78)
- [phase6-rolling-controller-bounded-session.yml:140](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L140)

### ReplitTranvr / secrets.P5_CD_GH_PREPARE_ARMED
- [phase6-private-later-enrollment.yml:67,133](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L67)

### ReplitTranvr / secrets.P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED
- [phase6-private-later-enrollment.yml:66,132](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L66)

### ReplitTranvr / secrets.P5_CD_GH_PRIVATE_CURRENT_APPROVED
- [phase5-cd-github-bounded-pre-tick.yml:135](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L135)

### ReplitTranvr / secrets.P5_CD_GH_PRIVATE_LATER_APPROVED
- [phase5-cd-github-bounded-pre-tick.yml:142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L142)

### ReplitTranvr / secrets.P5_CD_GH_STANDALONE_LATER_APPROVED
- [phase6-private-later-enrollment.yml:73,139](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L73)
- [phase5-cd-github-bounded-pre-tick.yml:124](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L124)

### ReplitTranvr / secrets.P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256
- [phase6-private-later-enrollment.yml:74,140](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L74)
- [phase5-cd-github-bounded-pre-tick.yml:125](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L125)

### ReplitTranvr / secrets.P5_CD_GH_T24_PREPARE_APPROVED
- [phase6-private-later-enrollment.yml:157](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L157)

### ReplitTranvr / secrets.P5_CD_GH_T24_ROSTER_SHA256
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:112](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L112)

### ReplitTranvr / secrets.P5_CD_GH_T24_WITNESS_APPROVED
- [phase6-private-later-enrollment.yml:158](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L158)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:109,231](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L109)

### ReplitTranvr / secrets.P5_PRIMARY_FIDS_SWEEP_DATABASE_URL
- [phase5-primary-fids-expiry-no-provider.yml:88](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L88)

### ReplitTranvr / secrets.P5_RETENTION_READER_DATABASE_URL
- [phase5-private-blob-retention-readonly-sentinel-no-provider.yml:141](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml#L141)
- [phase5-primary-fids-expiry-no-provider.yml:89](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L89)

### ReplitTranvr / secrets.P5_SHARD_INDEX_RO_CALENDAR_SHA256
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:97](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L97)

### ReplitTranvr / secrets.P5_SHARD_INDEX_RO_CODE_SHA
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:90](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L90)

### ReplitTranvr / secrets.P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:95](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L95)

### ReplitTranvr / secrets.P5_V39_OTHER_REST_RESERVE_DATABASE_URL
- [phase5-one-signed-future-post-v0083-main-manual.yml:234](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L234)

### ReplitTranvr / secrets.P5_V39_OTHER_REST_REVIEW_DATABASE_URL
- [phase5-one-signed-future-post-v0083-main-manual.yml:233](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L233)

### ReplitTranvr / secrets.P5_V39_PRE_DATABASE_URL
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:299,380,551,643](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L299)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:120,240](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L120)
- [phase5-cd-github-bounded-pre-tick.yml:161](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L161)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:92](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L92)
- [phase5-one-signed-day-source-child-dispatch.yml:381,453](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L381)

### ReplitTranvr / secrets.P5_V39_PREPARE_DATABASE_URL
- [phase6-nonpaid-source-day-prepare-publish.yml:129](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L129)
- [phase6-private-later-enrollment.yml:84,150](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L84)

### ReplitTranvr / secrets.P5_V39_T24_WITNESS_DATABASE_URL
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:121,241](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L121)

### ReplitTranvr / secrets.P6_NATIVE_LATER_RUNTIME_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:379,451](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L379)

### ReplitTranvr / secrets.P6_NATIVE_POST_POLICY_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1061](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1061)
- [phase5-one-signed-future-post-v0083-main-manual.yml:174,330](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L174)
- [phase6-stored-post-recovery-no-provider.yml:160](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L160)

### ReplitTranvr / secrets.P6_NATIVE_POST_POLICY_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1062](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1062)
- [phase5-one-signed-future-post-v0083-main-manual.yml:175,331](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L175)
- [phase6-stored-post-recovery-no-provider.yml:161](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L161)

### ReplitTranvr / secrets.P6_NATIVE_POST_PRODUCER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1039](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1039)

### ReplitTranvr / secrets.P6_NONPAID_DAILY_POLICY_BASE64
- [phase6-direct-recovery-tick.yml:128](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L128)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:952,1059](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L952)
- [phase6-nonpaid-source-day-prepare-publish.yml:118](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L118)
- [phase6-private-later-enrollment.yml:87,152](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L87)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:194,291](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L194)
- [phase5-cd-github-bounded-pre-tick.yml:138](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L138)
- [phase5-one-signed-day-source-child-dispatch.yml:304,332,376,427,448](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L304)
- [phase6-rolling-controller-bounded-session.yml:145](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L145)

### ReplitTranvr / secrets.P6_NONPAID_DAILY_POLICY_SHA256
- [phase6-direct-recovery-tick.yml:129](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L129)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:953,1060](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L953)
- [phase6-nonpaid-source-day-prepare-publish.yml:119](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L119)
- [phase6-private-later-enrollment.yml:88,153](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L88)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:195,292](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L195)
- [phase5-cd-github-bounded-pre-tick.yml:139](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L139)
- [phase5-one-signed-day-source-child-dispatch.yml:305,333,377,428,449](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L305)
- [phase6-rolling-controller-bounded-session.yml:146](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L146)

### ReplitTranvr / secrets.P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64
- [phase6-nonpaid-source-day-prepare-publish.yml:124](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L124)

### ReplitTranvr / secrets.P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64
- [phase6-nonpaid-source-day-prepare-publish.yml:125](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L125)

### ReplitTranvr / secrets.P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64
- [phase6-nonpaid-source-day-prepare-publish.yml:126](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L126)

### ReplitTranvr / secrets.P6_NONPAID_SIGNING_POLICY_BASE64
- [phase6-nonpaid-source-day-prepare-publish.yml:120](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L120)

### ReplitTranvr / secrets.P6_NONPAID_SIGNING_POLICY_SHA256
- [phase6-nonpaid-source-day-prepare-publish.yml:121](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L121)

### ReplitTranvr / secrets.P6_NONPAID_SOURCE_APPROVED_MAIN_SHA
- [phase6-nonpaid-source-day-prepare-publish.yml:79](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L79)

### ReplitTranvr / secrets.P6_NONPAID_SOURCE_RUNTIME_APPROVED
- [phase6-nonpaid-source-day-prepare-publish.yml:80](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L80)

### ReplitTranvr / secrets.P6_NONPAID_TRANSPORT_TRUST_BASE64
- [phase6-nonpaid-source-day-prepare-publish.yml:122](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L122)

### ReplitTranvr / secrets.P6_NONPAID_TRANSPORT_TRUST_SHA256
- [phase6-nonpaid-source-day-prepare-publish.yml:123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L123)

### ReplitTranvr / secrets.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL
- [phase5-one-signed-future-post-v0083-main-manual.yml:187,369](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L187)
- [phase6-stored-post-recovery-no-provider.yml:188](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L188)

### ReplitTranvr / secrets.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL
- [phase5-one-signed-future-post-v0083-main-manual.yml:186,368](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L186)
- [phase6-stored-post-recovery-no-provider.yml:187](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L187)

### ReplitTranvr / secrets.P6_PHASE7_POST_CONTRACT_SHA256
- [phase5-one-signed-future-post-v0083-main-manual.yml:148,249,362](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L148)
- [phase6-stored-post-recovery-no-provider.yml:99](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L99)

### ReplitTranvr / secrets.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64
- [phase5-one-signed-future-post-v0083-main-manual.yml:172,327](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L172)
- [phase6-stored-post-recovery-no-provider.yml:131,157](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L131)

### ReplitTranvr / secrets.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256
- [phase5-one-signed-day-source-child-dispatch.yml:297,323,349](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L297)
- [phase5-one-signed-future-post-v0083-main-manual.yml:139,252,365](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L139)
- [phase6-stored-post-recovery-no-provider.yml:102](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L102)

### ReplitTranvr / secrets.P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64
- [phase5-one-signed-future-post-v0083-main-manual.yml:140,253,366](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L140)
- [phase6-stored-post-recovery-no-provider.yml:103](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L103)

### ReplitTranvr / secrets.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64
- [phase5-one-signed-future-post-v0083-main-manual.yml:173,329](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L173)
- [phase6-stored-post-recovery-no-provider.yml:159](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L159)

### ReplitTranvr / secrets.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256
- [phase5-one-signed-future-post-v0083-main-manual.yml:141,251,364](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L141)
- [phase6-stored-post-recovery-no-provider.yml:101](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L101)

### ReplitTranvr / secrets.P6_PHASE7_POST_PROFILE_SHA256
- [phase5-one-signed-future-post-v0083-main-manual.yml:149,250,363](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L149)
- [phase6-stored-post-recovery-no-provider.yml:100](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L100)

### ReplitTranvr / secrets.P6_PHASE7_POST_RECOVERY_APPROVED
- [phase5-one-signed-future-post-v0083-main-manual.yml:131,239](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L131)
- [phase6-stored-post-recovery-no-provider.yml:77](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L77)

### ReplitTranvr / secrets.P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED
- [phase5-one-signed-future-post-v0083-main-manual.yml:132,240](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L132)
- [phase6-stored-post-recovery-no-provider.yml:104,130](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L104)

### ReplitTranvr / secrets.P6_PHASE7_POST_SCOPED_DATABASE_URL
- [phase5-one-signed-future-post-v0083-main-manual.yml:170,185,328,367](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L170)
- [phase6-stored-post-recovery-no-provider.yml:158,186](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L158)

### ReplitTranvr / secrets.P6_PHASE7_POST_STORAGE_APPROVED
- [phase5-one-signed-future-post-v0083-main-manual.yml:133,248,361](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L133)
- [phase6-stored-post-recovery-no-provider.yml:98](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L98)

### ReplitTranvr / secrets.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:299,325,351](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L299)

### ReplitTranvr / secrets.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256
- [phase5-one-signed-day-source-child-dispatch.yml:295,321,347](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L295)
- [phase5-one-signed-future-post-v0083-main-manual.yml:138,247](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L138)
- [phase6-stored-post-recovery-no-provider.yml:105](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L105)

### ReplitTranvr / secrets.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:301](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L301)

### ReplitTranvr / secrets.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:296,322,348](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L296)

### ReplitTranvr / secrets.P6_PHASE7_PRE_POLICY_BASE64
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:242](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L242)
- [phase5-cd-github-bounded-pre-tick.yml:162](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L162)
- [phase5-one-signed-day-source-child-dispatch.yml:291,317,343,387,457](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L291)
- [phase5-one-signed-future-post-v0083-main-manual.yml:146,244,358](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L146)
- [phase6-stored-post-recovery-no-provider.yml:95](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L95)

### ReplitTranvr / secrets.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:243](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L243)
- [phase5-cd-github-bounded-pre-tick.yml:163](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L163)
- [phase5-one-signed-day-source-child-dispatch.yml:292,318,344,388,458](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L292)
- [phase5-one-signed-future-post-v0083-main-manual.yml:147,245,359](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L147)
- [phase6-stored-post-recovery-no-provider.yml:96](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L96)

### ReplitTranvr / secrets.P6_PHASE7_PRE_PROOF_ISSUER_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:298,324,350](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L298)

### ReplitTranvr / secrets.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:244](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L244)
- [phase5-cd-github-bounded-pre-tick.yml:164](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L164)
- [phase5-one-signed-day-source-child-dispatch.yml:293,319,345,389,459](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L293)
- [phase5-one-signed-future-post-v0083-main-manual.yml:137,246,360](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L137)
- [phase6-stored-post-recovery-no-provider.yml:97](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L97)

### ReplitTranvr / secrets.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:327](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L327)

### ReplitTranvr / secrets.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:245](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L245)
- [phase5-cd-github-bounded-pre-tick.yml:165](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L165)
- [phase5-one-signed-day-source-child-dispatch.yml:294,320,346,390,460](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L294)

### ReplitTranvr / secrets.P6_PHASE7_PRE_READBACK_DATABASE_URL
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:247](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L247)
- [phase5-cd-github-bounded-pre-tick.yml:167](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L167)
- [phase5-one-signed-day-source-child-dispatch.yml:382](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L382)

### ReplitTranvr / secrets.P6_PHASE7_PRE_READBACK_ROLE
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:246](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L246)
- [phase5-cd-github-bounded-pre-tick.yml:166](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L166)
- [phase5-one-signed-day-source-child-dispatch.yml:383](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L383)

### ReplitTranvr / secrets.P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:302](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L302)

### ReplitTranvr / secrets.P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256
- [phase5-one-signed-day-source-child-dispatch.yml:303](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L303)

### ReplitTranvr / secrets.P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:290,316,342,380,452,474](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L290)

### ReplitTranvr / secrets.P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:357](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L357)
- [phase5-one-signed-future-post-v0083-main-manual.yml:181,350](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L181)
- [phase6-stored-post-recovery-no-provider.yml:139,179](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L139)

### ReplitTranvr / secrets.P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN
- [phase5-one-signed-day-source-child-dispatch.yml:331,355,393,463](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L331)
- [phase5-one-signed-future-post-v0083-main-manual.yml:136,243](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L136)
- [phase6-stored-post-recovery-no-provider.yml:94](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L94)

### ReplitTranvr / secrets.P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN
- [phase5-one-signed-day-source-child-dispatch.yml:330,354,392,462](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L330)
- [phase5-one-signed-future-post-v0083-main-manual.yml:135,242](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L135)
- [phase6-stored-post-recovery-no-provider.yml:93](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L93)

### ReplitTranvr / secrets.P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:329,353,391,461](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L329)
- [phase5-one-signed-future-post-v0083-main-manual.yml:134,241](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L134)
- [phase6-stored-post-recovery-no-provider.yml:92](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L92)

### ReplitTranvr / secrets.P6_PRIVATE_DAY_EPOCH_REVIEW_PINS_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:184](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L184)

### ReplitTranvr / secrets.P6_PRIVATE_DAY_EPOCH_REVIEW_WIRE_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:185](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L185)

### ReplitTranvr / secrets.P6_PRIVATE_DAY_EPOCH_REVIEWER_PUBLIC_KEY_PEM_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:186](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L186)

### ReplitTranvr / secrets.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1099](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1099)
- [phase5-one-signed-day-source-child-dispatch.yml:386,456](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L386)

### ReplitTranvr / secrets.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:385,455](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L385)

### ReplitTranvr / secrets.P6_PRIVATE_POST_CHILD_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:930](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L930)
- [phase5-one-signed-future-post-v0083-main-manual.yml:204](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L204)

### ReplitTranvr / secrets.P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:931](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L931)
- [phase5-one-signed-future-post-v0083-main-manual.yml:203](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L203)

### ReplitTranvr / secrets.P6_PRIVATE_POST_OUTCOME_TAIL_HOURS
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:929,1041](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L929)

### ReplitTranvr / secrets.P6_PRIVATE_POST_PARENT_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:928](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L928)

### ReplitTranvr / secrets.P6_PRIVATE_POST_REVIEWER_KEY_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1098](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1098)

### ReplitTranvr / secrets.P6_PRIVATE_POST_REVIEWER_TRUST_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:935,1058](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L935)
- [phase5-one-signed-future-post-v0083-main-manual.yml:145,215](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L145)
- [phase6-stored-post-recovery-no-provider.yml:81](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L81)

### ReplitTranvr / secrets.P6_PRIVATE_POST_STORED_REVIEW_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:934,1057](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L934)
- [phase5-one-signed-future-post-v0083-main-manual.yml:144,214](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L144)
- [phase6-stored-post-recovery-no-provider.yml:80](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L80)

### ReplitTranvr / secrets.P6_PRIVATE_PUBLISHER_DATABASE_URL
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1097](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1097)
- [phase6-nonpaid-source-day-prepare-publish.yml:131](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L131)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:191,288](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L191)
- [phase5-one-signed-day-source-child-dispatch.yml:356,384,454](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L356)
- [phase5-one-signed-future-post-v0083-main-manual.yml:180,349](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L180)
- [phase6-stored-post-recovery-no-provider.yml:140,178](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L140)

### ReplitTranvr / secrets.P6_PRIVATE_READER_DATABASE_URL
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:738,838,951,1096](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L738)
- [phase6-nonpaid-source-day-prepare-publish.yml:130](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L130)
- [phase6-private-later-enrollment.yml:83,149](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L83)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:190,287](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L190)
- [phase5-cd-github-bounded-pre-tick.yml:150](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L150)
- [phase5-one-signed-day-source-child-dispatch.yml:201,328,352,373,407,424,445](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L201)
- [phase5-one-signed-future-post-v0083-main-manual.yml:171,179,216](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L171)
- [phase6-stored-post-recovery-no-provider.yml:91](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L91)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:732](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L732)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:728,821](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L728)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:727,820](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L727)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:187](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L187)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_QUERY_REVIEW_WIRE_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:188](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L188)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_QUERY_REVIEWER_PUBLIC_KEY_PEM_BASE64
- [phase5-one-signed-day-source-child-dispatch.yml:189](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L189)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:731,819,933,1056](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L731)
- [phase6-nonpaid-source-day-prepare-publish.yml:117](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L117)
- [phase6-private-later-enrollment.yml:82,148](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L82)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:193,290](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L193)
- [phase5-cd-github-bounded-pre-tick.yml:149](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L149)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:85](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L85)
- [phase5-one-signed-day-source-child-dispatch.yml:183](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L183)
- [phase5-one-signed-future-post-v0083-main-manual.yml:143,213](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L143)
- [phase6-stored-post-recovery-no-provider.yml:79](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L79)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:816](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L816)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:730,817,932,1055](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L730)
- [phase6-nonpaid-source-day-prepare-publish.yml:116](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L116)
- [phase6-private-later-enrollment.yml:81,147](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L81)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:192,289](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L192)
- [phase5-cd-github-bounded-pre-tick.yml:148](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L148)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:84](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L84)
- [phase5-one-signed-day-source-child-dispatch.yml:182](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L182)
- [phase5-one-signed-future-post-v0083-main-manual.yml:142,212](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L142)
- [phase6-stored-post-recovery-no-provider.yml:78](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L78)

### ReplitTranvr / secrets.P6_PRIVATE_SOURCE_TRANSPORT_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:818](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L818)
- [phase5-one-signed-day-source-child-dispatch.yml:176](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L176)

### ReplitTranvr / secrets.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:189,286](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L189)

### ReplitTranvr / secrets.P6_ROLLING_CHAIN_APPROVED
- [phase6-rolling-controller-bounded-session.yml:123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L123)

### ReplitTranvr / secrets.P6_ROLLING_DIRECT_RECOVERY_APPROVED
- [phase6-direct-recovery-tick.yml:111](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L111)

### ReplitTranvr / secrets.P6_ROLLING_FOUR_SESSION_APPROVED
- [phase6-rolling-controller-bounded-session.yml:124](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L124)

### ReplitTranvr / secrets.P6_ROLLING_HISTORY_RETIREMENT_APPROVED
- [phase6-rolling-controller-bounded-session.yml:125](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L125)

### ReplitTranvr / secrets.P6_ROLLING_SESSION_APPROVED
- [phase6-direct-recovery-tick.yml:116](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L116)
- [phase6-rolling-controller-bounded-session.yml:122](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L122)

### ReplitTranvr / secrets.P6_ROLLING_SESSION_DEADLINE_UTC
- [phase6-rolling-controller-bounded-session.yml:133](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L133)

### ReplitTranvr / secrets.P6_ROLLING_SESSION_EPOCH_UTC
- [phase6-rolling-controller-bounded-session.yml:132](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L132)

### ReplitTranvr / secrets.P6_ROLLING_WINDOW_AUTHORIZATION_ID
- [phase6-rolling-controller-bounded-session.yml:162](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L162)

### ReplitTranvr / secrets.P6_ROLLING_WINDOW_CUSTODY_APPROVED
- [phase6-rolling-controller-bounded-session.yml:161](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L161)

### ReplitTranvr / secrets.P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL
- [phase6-rolling-controller-bounded-session.yml:164](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L164)

### ReplitTranvr / secrets.P6_ROLLING_WINDOW_EXPECTED_LOGIN
- [phase6-rolling-controller-bounded-session.yml:163](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L163)

### ReplitTranvr / secrets.P6_T24_CUSTODY_APPROVED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:188,285](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L188)

### ReplitTranvr / secrets.P7_EXPIRY_READER_DATABASE_URL
- [phase5-primary-fids-expiry-no-provider.yml:141](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L141)

### ReplitTranvr / secrets.P7_EXPIRY_WRITER_DATABASE_URL
- [phase5-primary-fids-expiry-no-provider.yml:142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L142)

### ReplitTranvr / secrets.V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA
- [phase5-one-signed-day-source-child-dispatch.yml:375,426,447](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L375)

### ReplitTranvr / secrets.V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:374,425,446](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L374)

### ReplitTranvr / secrets.V39_P5_APPROVED_CODE_SHA
- [phase6-direct-recovery-tick.yml:117](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L117)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:206,823](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L206)
- [phase5-six-slot-approved-early-four-airport-draw.yml:85,138](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L85)
- [phase5-one-signed-day-source-child-dispatch.yml:69,157](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L69)
- [phase6-rolling-controller-bounded-session.yml:134](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L134)

### ReplitTranvr / secrets.V39_P5_AUTO_SOURCE_DISPATCH_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:208,825](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L208)
- [phase5-one-signed-day-source-child-dispatch.yml:70,158](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L70)

### ReplitTranvr / secrets.V39_P5_CALENDAR_HASH
- [phase6-direct-recovery-tick.yml:125](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L125)
- [phase6-nonpaid-source-day-prepare-publish.yml:110](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L110)
- [phase5-six-slot-approved-early-four-airport-draw.yml:92,145](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L92)
- [phase6-rolling-controller-bounded-session.yml:142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L142)

### ReplitTranvr / secrets.V39_P5_CONFIG_HASH
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:297,378,549,641](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L297)
- [phase6-nonpaid-source-day-prepare-publish.yml:111](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L111)
- [phase5-six-slot-approved-early-four-airport-draw.yml:93,146](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L93)
- [phase6-rolling-controller-bounded-session.yml:165](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L165)

### ReplitTranvr / secrets.V39_P5_EARLY_DRAW_DATABASE_URL
- [phase6-nonpaid-source-day-prepare-publish.yml:127](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L127)
- [phase5-six-slot-approved-early-four-airport-draw.yml:62,89,142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L62)

### ReplitTranvr / secrets.V39_P5_EARLY_DRAW_EFFECTIVE_ROLE
- [phase6-nonpaid-source-day-prepare-publish.yml:128](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L128)
- [phase5-six-slot-approved-early-four-airport-draw.yml:63,90,143](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L63)

### ReplitTranvr / secrets.V39_P5_EARLY_DRAW_OWNER_APPROVED
- [phase5-six-slot-approved-early-four-airport-draw.yml:84,137](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L84)

### ReplitTranvr / secrets.V39_P5_FRAME_HASH
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:296,377,461,548,640,948,1053](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L296)
- [phase6-nonpaid-source-day-prepare-publish.yml:112](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L112)
- [phase5-six-slot-approved-early-four-airport-draw.yml:94,147](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L94)
- [phase5-one-signed-future-post-v0083-main-manual.yml:231](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L231)
- [phase6-stored-post-recovery-no-provider.yml:88](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L88)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_APPROVED_CODE_SHA
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:536,629](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L536)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_AUTO_DISPATCH_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:534](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L534)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_BATCH_AUTO_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:626](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L626)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:628](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L628)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:630](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L630)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:535,627](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L535)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:537](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L537)

### ReplitTranvr / secrets.V39_P5_LATER_PRE_T24_RECEIPT_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:538](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L538)

### ReplitTranvr / secrets.V39_P5_MANIFEST_SHA256
- [phase6-direct-recovery-tick.yml:124](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L124)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:129,216,292,373,455,544,637,733,833,943,1048](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L129)
- [phase6-nonpaid-source-day-prepare-publish.yml:109](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L109)
- [phase6-private-later-enrollment.yml:78,144](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L78)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:118,238](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L118)
- [phase5-cd-github-bounded-pre-tick.yml:157](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L157)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:90](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L90)
- [phase5-six-slot-approved-early-four-airport-draw.yml:91,144](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L91)
- [phase5-one-signed-day-source-child-dispatch.yml:73,161](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L73)
- [phase5-one-signed-future-post-v0083-main-manual.yml:126,225](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L126)
- [phase6-stored-post-recovery-no-provider.yml:83](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L83)
- [phase6-rolling-controller-bounded-session.yml:141](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L141)
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:96](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L96)

### ReplitTranvr / secrets.V39_P5_NATIVE_T_SEMANTICS_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:298,379,550,642](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L298)

### ReplitTranvr / secrets.V39_P5_POST_APPROVED_CODE_SHA
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:450,938,1042](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L450)
- [phase5-one-signed-future-post-v0083-main-manual.yml:125,223](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L125)
- [phase6-stored-post-recovery-no-provider.yml:82](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L82)

### ReplitTranvr / secrets.V39_P5_POST_CATEGORY_BUDGET_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:457,946,1051](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L457)
- [phase5-one-signed-future-post-v0083-main-manual.yml:227](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L227)
- [phase6-stored-post-recovery-no-provider.yml:86](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L86)

### ReplitTranvr / secrets.V39_P5_POST_CONTEXT_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:460](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L460)
- [phase5-one-signed-future-post-v0083-main-manual.yml:230](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L230)

### ReplitTranvr / secrets.V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:449,937,1047](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L449)
- [phase5-one-signed-future-post-v0083-main-manual.yml:222](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L222)

### ReplitTranvr / secrets.V39_P5_POST_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:448,936,1046](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L448)
- [phase5-one-signed-future-post-v0083-main-manual.yml:218](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L218)

### ReplitTranvr / secrets.V39_P5_POST_PRICE_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:462,949,1054](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L462)
- [phase5-one-signed-future-post-v0083-main-manual.yml:232](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L232)
- [phase6-stored-post-recovery-no-provider.yml:89](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L89)

### ReplitTranvr / secrets.V39_P5_POST_PROVIDER_CONTRACT_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:458,947,1052](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L458)
- [phase5-one-signed-future-post-v0083-main-manual.yml:228](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L228)
- [phase6-stored-post-recovery-no-provider.yml:87](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L87)

### ReplitTranvr / secrets.V39_P5_POST_REVIEWED_REQUEST_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:459](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L459)
- [phase5-one-signed-future-post-v0083-main-manual.yml:229](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L229)

### ReplitTranvr / secrets.V39_P5_POST_SIGNED_PACKET_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:451](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L451)
- [phase5-one-signed-future-post-v0083-main-manual.yml:224](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L224)

### ReplitTranvr / secrets.V39_P5_PREPARE_OWNER_APPROVED
- [phase6-nonpaid-source-day-prepare-publish.yml:81](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L81)

### ReplitTranvr / secrets.V39_P5_PROVIDER_CONTRACT_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:132,219,736,836](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L132)
- [phase6-nonpaid-source-day-prepare-publish.yml:115](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L115)
- [phase5-one-signed-day-source-child-dispatch.yml:76,164](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L76)

### ReplitTranvr / secrets.V39_P5_QUERY_DIGEST
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:137,293,374,545](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L137)

### ReplitTranvr / secrets.V39_P5_QUEUE_APPROVED_CODE_SHA
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:128,205,822](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L128)

### ReplitTranvr / secrets.V39_P5_RELEASE_SHA256
- [phase6-direct-recovery-tick.yml:126](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L126)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:130,217,294,375,546,638,734,834,944,1049](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L130)
- [phase6-nonpaid-source-day-prepare-publish.yml:113](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L113)
- [phase6-private-later-enrollment.yml:79,145](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L79)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:196,293](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L196)
- [phase5-cd-github-bounded-pre-tick.yml:151](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L151)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:86](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L86)
- [phase5-one-signed-day-source-child-dispatch.yml:74,162](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L74)
- [phase5-one-signed-future-post-v0083-main-manual.yml:128,217](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L128)
- [phase6-stored-post-recovery-no-provider.yml:85](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L85)
- [phase6-rolling-controller-bounded-session.yml:143](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L143)
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:98](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L98)

### ReplitTranvr / secrets.V39_P5_REST_UNIT_PRICE_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:215,832](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L215)
- [phase5-one-signed-day-source-child-dispatch.yml:85,173](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L85)

### ReplitTranvr / secrets.V39_P5_RIGHTS_SHA256
- [phase6-direct-recovery-tick.yml:127](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L127)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:131,218,295,376,456,547,639,735,835,945,1050](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L131)
- [phase6-nonpaid-source-day-prepare-publish.yml:114](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L114)
- [phase6-private-later-enrollment.yml:80,146](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L80)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:119,239](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L119)
- [phase5-cd-github-bounded-pre-tick.yml:158](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L158)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:91](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L91)
- [phase5-one-signed-day-source-child-dispatch.yml:75,163](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L75)
- [phase5-one-signed-future-post-v0083-main-manual.yml:127,226](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L127)
- [phase6-stored-post-recovery-no-provider.yml:84](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L84)
- [phase6-rolling-controller-bounded-session.yml:144](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L144)
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:99](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L99)

### ReplitTranvr / secrets.V39_P5_SEVEN_REST_BUDGET_SIGNED
- [phase6-direct-recovery-tick.yml:120](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L120)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:214,831,942,1045](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L214)
- [phase5-one-signed-day-source-child-dispatch.yml:84,172](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L84)
- [phase6-rolling-controller-bounded-session.yml:137](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L137)

### ReplitTranvr / secrets.V39_P5_SIGNED_DAY_REGISTRY_RELEASE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:209,826](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L209)
- [phase5-one-signed-day-source-child-dispatch.yml:71,159](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L71)

### ReplitTranvr / secrets.V39_P5_SIGNED_QUERY_JSON_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:136](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L136)

### ReplitTranvr / secrets.V39_P5_SOURCE_BATCH_REGISTRY_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:141,204,631](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L141)
- [phase5-one-signed-day-source-child-dispatch.yml:72,160](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L72)

### ReplitTranvr / secrets.V39_P5_SOURCE_DATABASE_URL
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:133,220,463,737,837,950,1095](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L133)
- [phase5-one-signed-day-source-child-dispatch.yml:86,199,300,326,372,405,423,444](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L86)
- [phase5-one-signed-future-post-v0083-main-manual.yml:169,235](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L169)
- [phase6-stored-post-recovery-no-provider.yml:90](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L90)
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:100](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L100)

### ReplitTranvr / secrets.V39_P5_SOURCE_DB_ROLE_REVIEWED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:213,830](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L213)
- [phase5-one-signed-day-source-child-dispatch.yml:83,171](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L83)

### ReplitTranvr / secrets.V39_P5_SOURCE_OWNER_APPROVED
- [phase5-one-signed-day-source-child-dispatch.yml:79,167](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L79)

### ReplitTranvr / secrets.V39_P5_SOURCE_QUEUE_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:124,207,824](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L124)

### ReplitTranvr / secrets.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:540,633](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L540)

### ReplitTranvr / secrets.V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:539,632](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L539)

### ReplitTranvr / secrets.V39_P5_T24_APPROVED_CODE_SHA
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:287,368](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L287)

### ReplitTranvr / secrets.V39_P5_T24_OWNER_APPROVED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:286,367](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L286)

### ReplitTranvr / secrets.V39_P5_T24_SIGNED_PACKET_SHA256
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:288,369](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L288)

### ReplitTranvr / secrets.V39_P5_VERIFIED_PROVIDER_MAX_RANGE_MINUTES
- [phase5-one-signed-day-source-child-dispatch.yml:78,166](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L78)

### ReplitTranvr / secrets.V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256
- [phase5-one-signed-day-source-child-dispatch.yml:77,165](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L77)

### ReplitTranvr / secrets.V39_PHASE5_FREEZE_SIGNED
- [phase6-direct-recovery-tick.yml:118](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L118)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:125,210,289,370,452,541,634,827,939,1043](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L125)
- [phase6-nonpaid-source-day-prepare-publish.yml:82](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L82)
- [phase6-private-later-enrollment.yml:75,141](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L75)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:115,235](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L115)
- [phase5-cd-github-bounded-pre-tick.yml:154](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L154)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:87](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L87)
- [phase5-six-slot-approved-early-four-airport-draw.yml:86,139](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L86)
- [phase5-one-signed-day-source-child-dispatch.yml:80,168](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L80)
- [phase5-one-signed-future-post-v0083-main-manual.yml:219](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L219)
- [phase6-rolling-controller-bounded-session.yml:135](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L135)

### ReplitTranvr / secrets.V39_PHASE5_SOURCE_RIGHTS_APPROVED
- [phase6-direct-recovery-tick.yml:119](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L119)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:126,211,290,371,453,542,635,828,940,1044](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L126)
- [phase6-nonpaid-source-day-prepare-publish.yml:83](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L83)
- [phase6-private-later-enrollment.yml:76,142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L76)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:116,236](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L116)
- [phase5-cd-github-bounded-pre-tick.yml:155](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L155)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:88](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L88)
- [phase5-six-slot-approved-early-four-airport-draw.yml:87,140](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L87)
- [phase5-one-signed-day-source-child-dispatch.yml:81,169](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L81)
- [phase5-one-signed-future-post-v0083-main-manual.yml:221](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L221)
- [phase6-rolling-controller-bounded-session.yml:136](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L136)

### ReplitTranvr / secrets.V39_PHASE6_OWNER_APPROVED
- [phase6-direct-recovery-tick.yml:122](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L122)
- [phase5-one-signed-future-post-v0083-main-manual.yml:130](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L130)
- [phase6-rolling-controller-bounded-session.yml:139](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L139)

### ReplitTranvr / secrets.V39_PHASE6_PROCESS_ARMED
- [phase6-direct-recovery-tick.yml:121](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L121)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:127,212,291,372,454,543,636,829,941](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L127)
- [phase6-private-later-enrollment.yml:77,143](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L77)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:117,237](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L117)
- [phase5-cd-github-bounded-pre-tick.yml:156](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L156)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:89](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L89)
- [phase5-six-slot-approved-early-four-airport-draw.yml:41,88,141](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml#L41)
- [phase5-one-signed-day-source-child-dispatch.yml:82,170](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L82)
- [phase5-one-signed-future-post-v0083-main-manual.yml:129,220](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml#L129)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:119](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L119)
- [phase6-rolling-controller-bounded-session.yml:138](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L138)

### ReplitTranvr / vars.P5_AUTO_SOURCE_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:180,198,790,815](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L180)

### ReplitTranvr / vars.P5_CD_GH_BURST_TICKS
- [phase5-cd-github-bounded-pre-tick.yml:128](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L128)

### ReplitTranvr / vars.P5_CD_GH_PRE_MODE
- [phase6-private-later-enrollment.yml:70,136](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L70)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:107,229,242,243,244,245,246,247](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L107)
- [phase5-cd-github-bounded-pre-tick.yml:130,162,163,164,165,166,167](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L130)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:79](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L79)

### ReplitTranvr / vars.P5_CD_GH_PRE_SCHEDULE_ENABLED
- [phase5-cd-github-bounded-pre-tick.yml:107](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L107)

### ReplitTranvr / vars.P5_CD_GH_QUEUED_T24_ENABLED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:81](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L81)

### ReplitTranvr / vars.P5_CD_GH_ROSTER_PATH
- [phase5-cd-github-bounded-pre-tick.yml:152](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L152)

### ReplitTranvr / vars.P5_CD_GH_T24_SCHEDULE_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:343,365](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L343)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:84,100,206,223](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L84)

### ReplitTranvr / vars.P5_CD_GH_T24_SCHEDULE_ROSTER_PATH
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:103](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L103)

### ReplitTranvr / vars.P5_CD_GH_WATCHDOG_ENABLED
- [phase5-cd-github-existing-queue-lease-watchdog.yml:56,73](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L56)

### ReplitTranvr / vars.P5_LATER_PRE_AUTO_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:511,532,601,623](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L511)

### ReplitTranvr / vars.P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:601,622](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L601)

### ReplitTranvr / vars.P5_LATER_PRE_BATCH_REGISTRY_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:624](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L624)

### ReplitTranvr / vars.P5_LATER_PRE_DAY_INDEX
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:625](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L625)

### ReplitTranvr / vars.P5_LATER_PRE_FROZEN_PACKET_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:533](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L533)

### ReplitTranvr / vars.P5_POST_AUTO_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:427,446,905,926,1016,1040](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L427)

### ReplitTranvr / vars.P5_POST_FROZEN_PACKET_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:447](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L447)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_BACKSTOP_ENABLED
- [phase5-primary-fids-expiry-no-provider.yml:50,58,78,122](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L50)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L123)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_DEADLINE_PROFILE
- [phase5-primary-fids-expiry-no-provider.yml:75](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L75)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256
- [phase5-primary-fids-expiry-no-provider.yml:74](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L74)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_EXPIRY_APPROVAL
- [phase5-primary-fids-expiry-no-provider.yml:42,48,52,60,73,124](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L42)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:122](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L122)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
- [phase5-primary-fids-expiry-no-provider.yml:39,71,121](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L39)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:121](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L121)

### ReplitTranvr / vars.P5_PRIMARY_FIDS_EXPIRY_ENABLED
- [phase5-primary-fids-expiry-no-provider.yml:41,47,51,59,72,123](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L41)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:120](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L120)

### ReplitTranvr / vars.P5_RETENTION_EXPECTED_READER_ROLE
- [phase5-private-blob-retention-readonly-sentinel-no-provider.yml:142](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml#L142)

### ReplitTranvr / vars.P5_RETENTION_READONLY_MONITOR_ENABLED
- [phase5-private-blob-retention-readonly-sentinel-no-provider.yml:131](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml#L131)

### ReplitTranvr / vars.P5_SHARD_INDEX_RO_CURRENT_SHA256
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:94](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L94)

### ReplitTranvr / vars.P5_SHARD_INDEX_RO_ENABLED
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:67,87](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L67)

### ReplitTranvr / vars.P5_SHARD_INDEX_RO_INDEX_FILE
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:91](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L91)

### ReplitTranvr / vars.P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:92](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L92)

### ReplitTranvr / vars.P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256
- [phase5-phase6-append-only-day-shard-dbclock-readonly.yml:93](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-phase6-append-only-day-shard-dbclock-readonly.yml#L93)

### ReplitTranvr / vars.P5_SOURCE_BATCH_REGISTRY_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:139,202](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L139)

### ReplitTranvr / vars.P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:138,180,200](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L138)

### ReplitTranvr / vars.P5_SOURCE_BATCH_RUN_DAY_INDEX
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:140,203](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L140)

### ReplitTranvr / vars.P5_SOURCE_QUEUE_OBSERVER_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:113,180,199](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L113)

### ReplitTranvr / vars.P5_SOURCE_SIGNED_FROZEN_PACKET_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:135](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L135)

### ReplitTranvr / vars.P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:134](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L134)

### ReplitTranvr / vars.P5_T24_AUTO_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:343,364](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L343)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:85,102,206,225](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L85)

### ReplitTranvr / vars.P5_T24_READONLY_SIGNED_PACKET_FILE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:285,366](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L285)

### ReplitTranvr / vars.P5_T24_SOURCE_READONLY_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:269,284,343,363](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L269)

### ReplitTranvr / vars.P6_FULL_RETENTION_BACKSTOP_ENABLED
- [phase5-primary-fids-expiry-no-provider.yml:61,80,125,140](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L61)

### ReplitTranvr / vars.P6_NATIVE_LATER_RUNTIME_ENABLED
- [phase5-one-signed-day-source-child-dispatch.yml:202,287,313,339,378,414,435,450,471](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L202)

### ReplitTranvr / vars.P6_NATIVE_POST_PRODUCER_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:1016,1038](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L1016)

### ReplitTranvr / vars.P6_NONPAID_SOURCE_SCHEDULE_ENABLED
- [phase6-nonpaid-source-day-prepare-publish.yml:69,72,78](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml#L69)

### ReplitTranvr / vars.P6_PHASE7_POST_RECOVERY_ENABLED
- [phase6-stored-post-recovery-no-provider.yml:51](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-stored-post-recovery-no-provider.yml#L51)

### ReplitTranvr / vars.P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED
- [phase5-cd-github-bounded-pre-tick.yml:133,135,136,137,138,139,148,149,150,152,153,162,163,164,165,166,167](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L133)
- [phase5-cd-github-existing-queue-lease-watchdog.yml:82,83,84,85,86](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml#L82)

### ReplitTranvr / vars.P6_PRIVATE_EPOCH_DEADLINE_PROFILE
- [phase5-primary-fids-expiry-no-provider.yml:84](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L84)

### ReplitTranvr / vars.P6_PRIVATE_EPOCH_EXPIRY_APPROVAL
- [phase5-primary-fids-expiry-no-provider.yml:56,64,87,128](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L56)

### ReplitTranvr / vars.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256
- [phase5-primary-fids-expiry-no-provider.yml:55,63,86,127](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L55)

### ReplitTranvr / vars.P6_PRIVATE_EPOCH_EXPIRY_MODE
- [phase5-primary-fids-expiry-no-provider.yml:53,54,62,85,126](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L53)

### ReplitTranvr / vars.P6_PRIVATE_LATER_ENROLL_ENABLED
- [phase6-private-later-enrollment.yml:50,85](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L50)

### ReplitTranvr / vars.P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED
- [phase6-private-later-enrollment.yml:50,86](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L50)
- [phase5-cd-github-bounded-pre-tick.yml:137](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-bounded-pre-tick.yml#L137)

### ReplitTranvr / vars.P6_PRIVATE_POST_PARENT_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:427,905,925](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L427)

### ReplitTranvr / vars.P6_PRIVATE_SOURCE_PARENT_RO_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:700,726](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L700)

### ReplitTranvr / vars.P6_PRIVATE_SOURCE_REVIEW_MODE
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:729,731,732,790,814](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L729)

### ReplitTranvr / vars.P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:180,790,813](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L180)

### ReplitTranvr / vars.P6_PRIVATE_T24_ENROLL_ENABLED
- [phase6-private-later-enrollment.yml:116,156](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L116)

### ReplitTranvr / vars.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED
- [phase6-private-later-enrollment.yml:116,151](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L116)
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:222](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L222)

### ReplitTranvr / vars.P6_PRIVATE_T24_EXECUTION_ENABLED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:79,206,220](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L79)

### ReplitTranvr / vars.P6_ROLLING_CONTROLLER_ENABLED
- [phase6-direct-recovery-tick.yml:94,109](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L94)
- [phase5-source-upcoming-queue-main-scheduled-readonly.yml:790,812,905,924,1016](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml#L790)
- [phase6-private-later-enrollment.yml:50,87,88,116](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-private-later-enrollment.yml#L50)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:115](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L115)
- [phase6-rolling-controller-bounded-session.yml:102,121](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L102)

### ReplitTranvr / vars.P6_ROLLING_DIRECT_RECOVERY_ENABLED
- [phase6-direct-recovery-tick.yml:64,82,93,110](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L64)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:116](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L116)

### ReplitTranvr / vars.P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC
- [phase6-direct-recovery-tick.yml:112](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L112)
- [phase6-autonomous-gh-controller-heartbeat-no-provider.yml:117](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml#L117)

### ReplitTranvr / vars.P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED
- [phase6-direct-recovery-tick.yml:96,114](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L96)
- [phase6-rolling-controller-bounded-session.yml:104,129,132,133](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L104)

### ReplitTranvr / vars.P6_ROLLING_SCHEDULED_ROOT_ENABLED
- [phase6-direct-recovery-tick.yml:95,113](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L95)
- [phase6-rolling-controller-bounded-session.yml:103,117](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L103)

### ReplitTranvr / vars.P6_ROLLING_WINDOW_CUSTODY_ENABLED
- [phase6-direct-recovery-tick.yml:97,115](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-direct-recovery-tick.yml#L97)
- [phase6-rolling-controller-bounded-session.yml:104,155,160,161,162,163,164,165](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase6-rolling-controller-bounded-session.yml#L104)

### ReplitTranvr / vars.P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED
- [phase5-one-signed-day-source-child-dispatch.yml:203,306,371,414,422,435,443](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml#L203)

### ReplitTranvr / vars.P6_T24_CUSTODY_ENABLED
- [phase5-cd-github-one-queued-t24-witness-main-manual.yml:187,284](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml#L187)

### ReplitTranvr / vars.P7_EXPIRY_APPROVAL
- [phase5-primary-fids-expiry-no-provider.yml:67,117,131,137](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L67)

### ReplitTranvr / vars.P7_EXPIRY_APPROVED_MAIN_SHA
- [phase5-primary-fids-expiry-no-provider.yml:65,114,129,135](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L65)

### ReplitTranvr / vars.P7_EXPIRY_ENABLED
- [phase5-primary-fids-expiry-no-provider.yml:66,116,130,136](https://github.com/HKcode22/ReplitTranvr/blob/9c9cddb1aaeb04934d94af2937ee158e6d991f6c/.github/workflows/phase5-primary-fids-expiry-no-provider.yml#L66)

### TravnrClockRelay / secrets.TRAVNR_TARGET_ACTIONS_TOKEN
- [external-clock.yml:83](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L83)

### TravnrClockRelay / vars.TRAVNR_APPROVED_TARGET_MAIN_SHA
- [external-clock.yml:79](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L79)

### TravnrClockRelay / vars.TRAVNR_EXTERNAL_LANE_COMMISSION_APPROVED
- [external-clock.yml:33](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L33)

### TravnrClockRelay / vars.TRAVNR_RELAY_DIRECT_TICK_APPROVED
- [external-clock.yml:78](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L78)

### TravnrClockRelay / vars.TRAVNR_RELAY_FULL_RETENTION_APPROVED
- [external-clock.yml:75](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L75)

### TravnrClockRelay / vars.TRAVNR_RELAY_MODE
- [external-clock.yml:33,55](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L33)

### TravnrClockRelay / vars.TRAVNR_RELAY_PRIMARY_ENABLED
- [external-clock.yml:33,56,71](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L33)

### TravnrClockRelay / vars.TRAVNR_RELAY_PRIMARY_SINCE_UTC
- [external-clock.yml:73](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L73)

### TravnrClockRelay / vars.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID
- [external-clock.yml:74](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L74)

### TravnrClockRelay / vars.TRAVNR_RELAY_ROLLING_ENABLED
- [external-clock.yml:33,57,72](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L33)

### TravnrClockRelay / vars.TRAVNR_RELAY_ROLLING_ROUTE
- [external-clock.yml:77](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L77)

### TravnrClockRelay / vars.TRAVNR_RELAY_ROLLING_SINCE_UTC
- [external-clock.yml:76](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L76)

### TravnrClockRelay / vars.TRAVNR_ROLLING_FOUR_APPROVED
- [external-clock.yml:82](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L82)

### TravnrClockRelay / vars.TRAVNR_ROLLING_POLICY_FROM_UTC
- [external-clock.yml:80](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L80)

### TravnrClockRelay / vars.TRAVNR_ROLLING_POLICY_UNTIL_UTC
- [external-clock.yml:81](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L81)

### TravnrClockRelay / vars.TRAVNR_TARGET_FORWARD_ENV_READY
- [external-clock.yml:84](https://github.com/HKcode22/TravnrClockRelay/blob/c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed/.github/workflows/external-clock.yml#L84)

## Live audit still required

Compare repository and protected-environment variable names/values and secret names only, not plaintext; detect scope shadows. Effective protected runtime admission is separate from names. Reuse actual worker receipts and nonpaid admission. Check programmatic process.env and env accesses, trust/schema constraints, SQL roles and grants. Do not remove or modify a live flag from this inventory. Prioritize the repeated code SHA binding, global STOP propagation and nonpaid controller GET reliability. Native schedules exist independently of direct recovery, but actual delivery jitter is material and observed. A green relay may be DEFER, not execution.
