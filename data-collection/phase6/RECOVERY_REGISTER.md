# Phase5B / Phase6 recovery register — READ FIRST

Working branch: phase5b/20261125-1610-custody-identity-reconciliation, [PR #976](https://github.com/HKcode22/ReplitTranvr/pull/976), [master #413](https://github.com/HKcode22/ReplitTranvr/issues/413). Baseline Nov26 02:04 PST: production main 1ce885f1, relay 87949484, paid SOURCE/POST paused, exact prior candidate 3327ff5d 42/42 CI success. This is an initial evidence-linked index, not exhaustive review of all 627 issue comments or all historical workflows.

F = failure family or evidenced defect; I = corrective implementation; C = incomplete component, not a new gate. IDs permanent, consecutive, never renumber or delete. Recurrence updates existing F; new distinct cause gets next ID. Link actual checkpoint, commit, job and production evidence. Historical loss is irreversible. Tested is not deployed; deployed is not end-to-end proven. No new branches or closed gates without substantive evidence.

## Failures

| ID | Status | Observed defect and evidence | Implementations |
|---|---|---|---|
| F001 | Historical repaired | Nov3 cron and job predicate drift, plus independently missed GitHub schedule. [Checkpoint](../phase4/2026-11-03_GATE5_G5A_MISSED_T24_REAL_ACTIONS_RECOVERY.md) | I001 |
| F002 | Historical repaired | Nov4 idle PG 57P01 and prearm cancellation. [Checkpoint](../phase4/2026-11-04_G5A_T24_CANCELLED_RUN_HEARTBEAT_RECOVERY.md) | I002 |
| F003 | Historical loss | Nov4 and Nov24 reservations without bound originals, generic failure; HTTP/billing not proved by reservation. [Checkpoint](../phase4/2026-11-04_G5A_ZERO_SOURCE_T24_INCIDENT_AND_BUDGET_PROTECTION.md) | I003, I009, I010, I013 |
| F004 | Historical repaired | Nov4 expired foreign cohort blocked PREPARED owner; empty DB tests missed this. [Checkpoint](../phase4/2026-11-04_G5A_PREARM_FOREIGN_COHORT_ROOT_CAUSE_AND_BOUNDARY_REPAIR.md) | I004 |
| F005 | Open recurring | Nov5 and Nov25–26 native ID/explicit origin/scope evidence missing, zero native PRE. Synthetic provider IDs hid failure. [Nov5](../phase4/2026-11-05_G5A_IDLESS_OPERATOR_CRITICAL_SCIENCE_FIX_NEXT_COHORT.md), [Nov26](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I005, I014, I015, I016 |
| F006 | Historical repaired | Nov12 unreachable T24 scheduling branch. [Checkpoint](../phase5/2026-11-12_T24_SCHEDULE_UNREACHABLE_BRANCH_AND_EXCLUSIVE_AUTOMATION_REPAIR.md) | I001 |
| F007 | Mitigated | Nov15–24 best-effort cron and ACK/history visibility; direct root incomplete read 45429790971. [Checkpoint](checkpoints/2026-11-24_1625_PST_PHASE5B_OPERATIONAL_INCIDENT_AUDIT.md) | I006, I007 |
| F008 | Mitigated | Nov15 rolling failure receipt custody and generic root diagnostics. [Checkpoint](../phase5/2026-11-15_ROLLING_FAILURE_CUSTODY_AND_RECEIPT_RETENTION.md) | I006 |
| F009 | Mitigated | Nov23 heartbeat premature direct activation and wrong expiry multi-job recognition; later paused-route classification. [Checkpoint](checkpoints/2026-11-23_PHASE6_HEARTBEAT_AUTONOMOUS_WORKFLOW_AUDIT.md) | I007 |
| F010 | Historical loss | Nov23 launch budget approval flag absent, early draw flag absent, first direct tick failed, Day1 T24 unprepared. [Run](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564) | I008 |
| F011 | Mitigated | Nov24 source actor lacked POST snapshot metadata access. [Checkpoint](checkpoints/2026-11-24_1744_PST_PHASE5B_POST_ACL_PASS_SOURCE_V0078_MISMATCH.md) | I009 |
| F012 | Mitigated | Nov24 SOURCE serial sequence USAGE and actual population membership trigger ACL; EXPLAIN/admin fixtures missed this. [Checkpoint](checkpoints/2026-11-24_1753_PST_PHASE5B_EXECUTABLE_SUCCESSOR_AND_TRIGGER_POSTMORTEM.md) | I009 |
| F013 | Historical repaired | Nov24 role entry conflated with SQL permission; wrong V0078 constraint assumption. [Checkpoint](checkpoints/2026-11-24_1744_PST_PHASE5B_POST_ACL_PASS_SOURCE_V0078_MISMATCH.md) | I009 |
| F014 | Production mitigated | Nov24 executable SHA vs immutable policy anchor mismatch before paid step. [Checkpoint](checkpoints/2026-11-24_1819_PST_PHASE5B_SOURCE_ROLE_SUCCESSOR_INCIDENT.md) | I010 |
| F015 | Production observed | Nov25 cutover lacked exact-main full two-job retention baseline. [Checkpoint](checkpoints/2026-11-25_0007_PST_PHASE5B_CUSTODY_PAIR_AND_RATE_LIMIT_REPAIR.md) | I011 |
| F016 | Mitigated unproven | Nov24–25 HTTP 429 concurrent SOURCE waves, pacing fallback. [Checkpoint](checkpoints/2026-11-25_1549_PST_T6_SOURCE_RESPONSE_AND_PACING_INCIDENT.md) | I012 |
| F017 | Open | Nov24–25 HTTP_OK then FIDS_BODY_UNAVAILABLE, older 204/205 masked; exact old transport causes unknown. [Checkpoint](checkpoints/2026-11-25_1549_PST_T6_SOURCE_RESPONSE_AND_PACING_INCIDENT.md) | I013 |
| F018 | Partial branch repair | Native-only signer/normalizer/witness/registration reject existing conditional tier. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I014, I015, I016 |
| F019 | Tested branch | Conditional reader staleness measured from binding rather than availability; signed window/member clock mismatch. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/0731789d16675d012d42cd68ba8c49d3c898bf23) | I017 |
| F020 | Tested branch | Stage14 cutoff-specific duplicate check admitted possible retimed second PRE. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/23b02b489db71d331efe1f8b9da95c67f4c1fd07) | I018 |
| F021 | Open cause, diagnostic tested | Later PRE generic redacted failure 45762925573, subsequent no-due success not proof of resolution. [Checkpoint](checkpoints/2026-11-26_0129_PST_PHASE5B_THREE_DAY_AUDIT_AND_REPAIR.md) | I019 |
| F022 | Tested branch | Audit incorrectly classified eight expired original hashes as mismatches. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I020 |
| F023 | Tested branch | Idle native follow-on acquired publisher lock before zero candidate check. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I021 |
| F024 | Tested branch | Optional weather archive read for FIDS-only permit. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/3327ff5d84d9d0aa0478a34bb41e44e788cd3a9a) | I022 |
| F025 | Superseded CI failure | TS2322 and V0112 whitespace exact predecessor errors; new exact head 42/42. [PG16](https://github.com/HKcode22/ReplitTranvr/actions/runs/45796775104) | I023 |
| F026 | Historical loss | Day1 zero bindings; Day2 52 bindings zero PRE; pause missed T90 and elapsed Day3 T24. [Owner census](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I008, I012, I013, I014, I016 |
| F027 | Open | Native-only feature proof and signed packet issuance even though conditional writer exists. [Prior decision](../phase5/2026-11-09_REUSE_PHASE4_CONDITIONAL_SERVICE_PRE_IN_PHASE5_WITHOUT_NEW_PILOT.md) | I005, I014, I016 |
| F028 | Superseded CI failure | Stacked PR excluded full offline CI; trigger fixed. [Checkpoint](checkpoints/2026-11-25_1730_PST_PHASE5B_DRAIN_AND_STACKED_CI_COVERAGE.md) | I023 |
| F029 | Open | Actual physical gate-out source not certified; schedule revision is not substitute. [Adopted runtime scope](../phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md) | I005 |
| F030 | Code finding, not live cause | Conditional raw/normalized matcher differences on duplicate marketing aliases and malformed origin/casing; verify parity before release. [Existing implementation](../phase5/2026-11-09_REUSE_PHASE4_CONDITIONAL_SERVICE_PRE_IN_PHASE5_WITHOUT_NEW_PILOT.md) | I024 |

## Implementations

| ID | Status | Repair | Failure IDs |
|---|---|---|---|
| I001 | Historical | Cron/job predicates and exclusive routing | F001, F006 |
| I002 | Historical | Bounded readonly heartbeat/reconnect without uncertain replay | F002 |
| I003 | Historical | Reservation vs actual binding census, stop invalid cohort successors | F003 |
| I004 | Historical | Scope conflict to live owners, preserve history | F004 |
| I005 | Partial | Reuse Nov9 G5A separate identity and Stage14 permit, no physical label | F005, F027, F029 |
| I006 | Deployed partial | Exact GET-only history retry, controller custody, independent relay | F007, F008 |
| I007 | Partial | Independent wake, expiry/heartbeat classification; latest pause correction branch only | F007, F009 |
| I008 | Deployed partial | Restore existing flags, Day1 prospective salvage and Day2 preparation | F010, F026 |
| I009 | Production observed | SOURCE sequence/trigger and POST metadata permissions, actual SOURCE success | F003, F011, F012, F013 |
| I010 | Production observed | Executable successor vs immutable policy anchor, timely originals after cutover | F003, F014 |
| I011 | Production observed | Exact four-pin cutover and full retention baseline 45737282278 | F015 |
| I012 | Deployed unproven | Adaptive pacing within signed slack, no extra calls | F016, F026 |
| I013 | Deployed partial | Explicit no-content/body/rate diagnostics, old cause unknown | F003, F017, F026 |
| I014 | Tested branch | Signed SOURCE marker, normalization, exact bound reader | F005, F018, F026, F027 |
| I015 | Tested branch | V0111 independent conditional T24 witness (45796775318) | F005, F018 |
| I016 | Tested branch | V0112 existing V0091/V0100 restricted registration (45796775104) | F005, F018, F026, F027 |
| I017 | Tested branch | Correct source clock/window and nullable member handling | F019 |
| I018 | Tested branch | Immutable per-flight horizon duplicate guard | F020 |
| I019 | Tested branch | Redacted PRE stage/category failure diagnostics | F021 |
| I020 | Tested branch | Three-day expiry-aware custody audit | F022 |
| I021 | Tested branch | Audit before publisher lock | F023 |
| I022 | Tested branch | Skip weather read for absent weather; present proof retained | F024 |
| I023 | Tested branch | Exact-head CI coverage, compile/SQL fixes | F025, F028 |
| I024 | Implemented, CI pending | Shared conditional route/key/positive-operator ambiguity between normalizer and raw review; real normalizer and reader regressions | F030 |

## Completion components (not gates)

| ID | Status | Component | Failure IDs | Implementation IDs |
|---|---|---|---|---|
| C001 | Open | Prospective conditional signed PRE issuance and private producer-consumer admission | F005, F018, F027 | I005, I014, I016 |
| C002 | Open | Conditional feature extraction, independent Packet A proof, lawful Packet B preservation | F027, F030 | I014, I024 |
| C003 | Open | Distinct conditional schedule-revision POST pairing | F005, F029 | I005 |
| C004 | Open | Same-leg physical gate-out observability, honest censoring | F029 | I005 |
| C005 | Open | V0111/V0112 production install and genuine task path | F018 | I015, I016 |
| C006 | Open | Prospective SOURCE effectiveness and status/body custody | F016, F017 | I012, I013 |
| C007 | Open | Bulk exact-head cutover and safe resumed paid collection | F026 | I008, I011, I023 |
| C008 | Open | Missingness, representativeness, no leakage and 31-day split audit | F005, F026, F029 | I018, I020 |
| C009 | Open | Remove redundant runtime dependencies and isolate failures without weakening custody | F007, F021, F023, F024 | I006, I019, I021, I022 |

## Scientific and retention authorities

Read the [f.8 core](../plans/V3.9_DataCollectPlan_f.8.md), [A](../plans/V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md), [B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [D1](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md), [D2](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md), [canonical E](../phase5/2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md), [C+D ADR](../phase5/2026-11-10_ADR_PHASE6_AUTONOMOUS_C_PLUS_D_HYBRID_DESIGN.md), [crosswalk](../phase5/2026-11-16_FINAL_EXIT_SCIENCE_AND_COMMISSIONING_CROSSWALK.md), [Nov22 freeze](../phase5/evidence/2026-11-22_phase6_scientific_freeze_adoption.md) and [runtime scope](../phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md). Historical proposals are not new approvals. E primary T6 actual continuous gate-out delay, T90 paired update, T24 comparator; cancellation and airborne ETA separate. Conditional schedule revision is distinct, never an automatic primary replacement. Preserve 20/5/6 chronological parent-day split and same-flight isolation, immutable cutoffs, genuine availability, no backfill or missing-as-zero.

Read [Packet A/B](../phase5/2026-11-19_PHASE6_SECOND_RETENTION_PHASE7_DERIVED_RELEASE_PACKET.md), [16-field parity](../phase5/evidence/2026-11-20_packet_b_amendment_e_field_parity_audit_NO_GO.md), [retention review](checkpoints/2026-11-22_GATE3_EXACT_CI_INDEPENDENT_REVIEW_AND_SOURCE_MARGIN_BOUNDARY_NO_GO.md). A operational custody only while permitted; existing FIDS early 23h/hard 24h, ordinary 168h where applicable, stricter signed expiry honored. B only approved genuinely derived fields, no exact unauthorized copies or links. Reference identifiers distinct Article 5.8 purpose-bound lane. Independent NOAA/ADSB terms distinct. No raw data in Git or extending expiry; no PITR claim without evidence. Retention independent of acquisition.

Original calendar/draw, approved 36,740 launch units, daily 1,900 cap, protected 1,000 floor unchanged. General owner paid authorization acknowledged Nov26; use only exact reviewed prospective signed scope, current balance and quiet cutover; no historical replay, new endpoint or ad hoc extra paid test.

## Evidence baseline and regression strategy

Owner 01:52 PST: 92 reservations, 184 reserved units (not billing), 52 bindings (44 live T6, 8 prior timely T24 now expired), 4,044 live normalized observations, zero native candidates/tasks/PRE rows. Day1 16 reserved zero bound; Day2 T6 44/64, T90 paused; Day3 then 32 T24 elapsed, 32 future. No full training cohort. F005 was known Nov5 and partial Nov9 repair did not reach the full Phase6 producer. Known testing gaps: synthetic IDs, empty/admin fixtures, EXPLAIN without trigger execution, green no-op/dispatch versus real output. Regression must exercise historical failure shapes, real-contract id-less and nullable fixtures, actual restricted roles and triggers, dirty/expired state, complete signed producer/consumer/commit chain, optional failures, real DB cutoff and independent retention. Record current exact head and real logs before closure; avoid unnecessary owner commands. Read existing PostgreSQL via Replit and restricted GitHub secrets, not a connected Neon project.
