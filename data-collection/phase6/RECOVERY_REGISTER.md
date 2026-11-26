# Phase5B / Phase6 recovery register — READ FIRST

Working branch: phase5b/20261125-1610-custody-identity-reconciliation, [PR #976](https://github.com/HKcode22/ReplitTranvr/pull/976), [master #413](https://github.com/HKcode22/ReplitTranvr/issues/413). Baseline Nov26 02:04 PST: production main 1ce885f1, relay 87949484, paid SOURCE/POST paused, exact prior candidate 3327ff5d 42/42 CI success. This is an initial evidence-linked index, not exhaustive review of all 627 issue comments or all historical workflows.

F = failure family or evidenced defect; I = corrective implementation; C = incomplete component, not a new gate; T = regression scenario and acceptance evidence. IDs permanent, consecutive, never renumber or delete. Recurrence updates existing F; new distinct cause gets next ID. Link actual checkpoint, commit, job and production evidence. Historical loss is irreversible. Tested is not deployed; deployed is not end-to-end proven. No new branches or closed gates without substantive evidence.

**Experiment Day 1 is November 23, 2026 (Pacific owner correction, Nov26).** November 3–22 failures are prelaunch historical regression evidence, not losses of the one-month paid experiment. Keep their stable IDs and distinguish any recurrence on or after Nov23. Do not rewrite the signed calendar or historical outcomes.

## Failures

| ID | Status | Observed defect and evidence | Implementations |
|---|---|---|---|
| F001 | Historical repaired | Nov3 cron and job predicate drift, plus independently missed GitHub schedule. [Checkpoint](../phase4/2026-11-03_GATE5_G5A_MISSED_T24_REAL_ACTIONS_RECOVERY.md) | I001 |
| F002 | Historical repaired | Nov4 idle PG 57P01 and prearm cancellation. [Checkpoint](../phase4/2026-11-04_G5A_T24_CANCELLED_RUN_HEARTBEAT_RECOVERY.md) | I002 |
| F003 | Historical loss | Nov4 and Nov24 reservations without bound originals, generic failure; HTTP/billing not proved by reservation. [Checkpoint](../phase4/2026-11-04_G5A_ZERO_SOURCE_T24_INCIDENT_AND_BUDGET_PROTECTION.md) | I003, I009, I010, I013, I030 |
| F004 | Historical repaired | Nov4 expired foreign cohort blocked PREPARED owner; empty DB tests missed this. [Checkpoint](../phase4/2026-11-04_G5A_PREARM_FOREIGN_COHORT_ROOT_CAUSE_AND_BOUNDARY_REPAIR.md) | I004 |
| F005 | Open recurring | Nov5 and Nov25–26 native ID/explicit origin/scope evidence missing, zero native PRE. Synthetic provider IDs hid failure. [Nov5](../phase4/2026-11-05_G5A_IDLESS_OPERATOR_CRITICAL_SCIENCE_FIX_NEXT_COHORT.md), [Nov26](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I005, I014, I015, I016, I034 |
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
| F017 | Open | Nov24–25 HTTP_OK then FIDS_BODY_UNAVAILABLE, older 204/205 masked; exact old transport causes unknown. [Checkpoint](checkpoints/2026-11-25_1549_PST_T6_SOURCE_RESPONSE_AND_PACING_INCIDENT.md) | I013, I030 |
| F018 | Partial branch repair | Native-only signer/normalizer/witness/registration and standalone GitHub admission wrappers reject existing conditional tier. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I014, I015, I016, I034 |
| F019 | Tested branch | Conditional reader staleness measured from binding rather than availability; signed window/member clock mismatch. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/0731789d16675d012d42cd68ba8c49d3c898bf23) | I017 |
| F020 | Tested branch | Stage14 cutoff-specific duplicate check admitted possible retimed second PRE. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/23b02b489db71d331efe1f8b9da95c67f4c1fd07) | I018 |
| F021 | Open cause, diagnostic tested | Later PRE generic redacted failure 45762925573, subsequent no-due success not proof of resolution. [Checkpoint](checkpoints/2026-11-26_0129_PST_PHASE5B_THREE_DAY_AUDIT_AND_REPAIR.md) | I019 |
| F022 | Tested branch | Audit incorrectly classified eight expired original hashes as mismatches. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I020 |
| F023 | Tested branch | Idle native follow-on acquired publisher lock before zero candidate check. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I021 |
| F024 | Tested branch | Optional weather archive read for FIDS-only permit. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/3327ff5d84d9d0aa0478a34bb41e44e788cd3a9a) | I022 |
| F025 | Corrected and exact #976 CI passed | Superseded V0112 predecessor mismatch 45796497453; seven workflows on 6572192 failed same TS18048; two on 41d5d38f failed synthetic Phase7 digest shape. Successor #976 exact 454349c9 passed 46/46, including TypeScript, focused proof/registration, PG16 and full offline safety. Production install separate. Four #977 runs on 427411f4 failed one TS2345 legacy-child union mismatch; 433082ba focused diagnostics and V0094 PG16 passed, full offline pending at 03:50 PST. | I023, I026 |
| F026 | Historical loss | Day1 zero bindings; Day2 52 bindings zero PRE; pause missed T90 and elapsed Day3 T24. [Owner census](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) Nov26 10:58 PST latest actual rolling wake SOURCE/POST paid jobs skipped; do not infer additional missed query count without current owner census. 19:47:58Z owner census: Day3 T24 64 elapsed, T6/T90 128 prospective, 52 historical bindings, 92 reservations, zero PRE tasks, zero unresolved stops; owner enabled SOURCE only. | I008, I012, I013, I014, I016, I043, I045, I057 |
| F027 | Partial; staged conditional later registry reader | Native-only private registry/producer/feature proof despite separate conditional writer. #976 implements independent source proof/permit preparation and conditional queue packets; #977 connects protected current later registry reader. No actual conditional producer signature or observed PRE. | I005, I014, I016, I025, I029, I031, I033, I034, I038, I039, I040, I041, I044, I046, I047, I048, I050, I051, I052, I053, I054, I055, I056, I058 |
| F028 | Superseded CI failure | Stacked PR excluded full offline CI; trigger fixed. [Checkpoint](checkpoints/2026-11-25_1730_PST_PHASE5B_DRAIN_AND_STACKED_CI_COVERAGE.md) | I023 |
| F029 | Open | Actual physical gate-out source not certified; schedule revision is not substitute. [Adopted runtime scope](../phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md) | I005 |
| F030 | Focused tested, full pending | Conditional raw/normalized matcher parity corrected in c66f6307; [focused run](https://github.com/HKcode22/ReplitTranvr/actions/runs/45799119831) passed. Not a demonstrated live cause. | I024 |
| F031 | Code finding, not live cause | Provider timestamp precision/UTC representation mismatch can discard otherwise identical observations; reject unzoned or impossible dates rather than assume timezone. | I026 | 
| F032 | Corrected and exact #976 CI passed | Register crosswalk parser failure 45800099500 and T038 invalid test-path metadata 45810213223 corrected; exact 454349c9 46/46. No production SOURCE fault. Recurrence 45880797152 missing reciprocal F026/I057 link repaired in d39097d2; focused 45880957835 and full exact 20/20 passed. | I027 |
| F033 | Code finding; correction staged | Conditional feature review pruned late drafts at the final database clock but still returned earlier candidate/member proposals. A future signer could see a stale proposal after required lead was lost. Not established as a historical live cause. | I028 |

| F034 | Open monitoring distinction | Managed cron audit failed with pending or unresolved wake evidence; HTTP ACK not execution proof. Relay runs 45709316609, 45573403453, 45562024566, 45424056708. Later audit pass is not proof every wake executed. | I032 |
| F035 | Historical fixture correction observed | Relay isolated test 45525733215 failed three assertions: extra active-state GETs, unknown active-read deferred before dispatch, pin rejection fixture. Current relay test models active states; exact-head isolated CI evidence pending. | I032 |

| F036 | Implemented staged; exact relay CI pending | Four ROLLING_ROOT cancellations (45727773405, 45717616827, 45713496477, 45709128629), empty job lists; no runner execution or paid call proven. Concurrency replacement is plausible, not proven cause. | I035 |
| F037 | Code-discovered deadline risk; implemented staged | Seven serial distinct route groups with up to 10s active read and 10s dispatch each can exceed 120s wake deadline; late route starvation risk, historical attribution not proven. | I036 |

| F038 | Code repair merged; actual live acceptance open | Immutable original selector and coherent current snapshot; exact 454349c9 46/46. Never substitute changed SOURCE or roll back. | I037, I042 |

| F039 | Code-discovered signed-object parity risk; staged | Existing signed later registry validated separate caller-provided parsed objects instead of comparing to authenticated bytes. A changed shard or source entry must never inherit original digest. | I044 |

| F040 | Observed repeated safe operational hold; bounded wait staged | Owner relay cutover held ACTIVE_RELAY_NO_CANCEL then ACTIVE_PARENT_OR_CHILD_NO_CANCEL after target retention verified. Periodic nonpaid parent runs can overlap; no cancellation or paid failure inferred. Failed active/variable metadata reads must never become quiet/absent. | I045 |
| F041 | Focused repair passed; current-main early worker verified | Main heartbeat 45817522392 red at 12:12Z for stale EARLY_DRAW shortly after 11:40Z cutover. Six actual first-parent early-draw jobs at 04/08 UTC succeeded with NO_DUE_FUTURE_DRAW_AT_DB_CLOCK; Current-main draw 45818445640 worker 139904142414 subsequently executed successfully at 12:19Z, NO_DUE_FUTURE_DRAW_AT_DB_CLOCK, no missed indices. Primary backstop executed. Distinct from missing draw, paid loss or retention failure. 19:48Z manual heartbeat 45886325626 evaluated earlier 19:38Z paused SOURCE job after switch enabled; first actual resumed parent 45886377755 completed NO_DUE_WORK. Native primary schedule gap remains, recent full backstop verified. No paid failure proven. | I049, I057 |

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
| I023 | Exact #976 CI passed | Exact-head coverage and compile/SQL fixes; 46/46 on 454349c9, target merged f4fe806d. | F025, F028 |
| I024 | Focused tested | Shared conditional route/key/positive-operator ambiguity between normalizer and raw review; real normalizer and reader regressions; run 45799119831 passed | F030 |
| I025 | Implemented, CI pending | Shared existing four-field FIDS feature draft from authenticated marked conditional raw member, exact protected content-use/protocol, private output and fresh cutoff; no signed issuance | F027 |
| I026 | Exact #976 CI passed | Explicit never-return narrowing, UTC parity, linear lookup; all exact #976 workflows passed. | F025, F031 |
| I027 | Exact #976 CI passed | Scope primary ID parsing to canonical sections and correct T038 test-path metadata; no relaxed validator. | F032 |
| I028 | Implemented; CI pending | Reconcile private candidate report, member proposals and draft counts to final database clock; reject stale direct member match, preserve cutoff and source custody, add positive and exact-boundary regression. | F033 |
| I029 | Implemented; CI pending | Explicit separately scoped independent conditional exact permit-page read, using existing authentic marked-source reader, Stage14 checks and Phase7 feature drift recomputation; test wrong scope, omitted features, late and positive paths. Not wired to active signer or deployed. | F027 |
| I030 | Implemented; CI pending | Fixed-stage outer SOURCE reader/admission/subprocess/cleanup diagnostics with bounded SQL category; preserve redaction, no replay and existing exception boundaries. | F003, F017 |

| I031 | Implemented staged; CI pending | Both independent PRE roles use explicit identity-tier routing with a separately authenticated conditional scope port; absent scope or mixed tiers fails before SOURCE reads; no production wiring or signer grant. | F027 |
| I032 | Historical correction observed; exact runtime review pending | Relay active-read/acknowledgement/pin fixtures and managed pair clock audit evidence; preserve pending versus executed distinction, no changes to relay main. | F034, F035 |

| I033 | Implemented staged; CI pending | Exact signed SOURCE query/index resolver authenticates existing stored registry and prospective conditional feature purpose; rejects cross-tier, policy and permit drift, supplies independent proof scope. Actual protected role transport not yet commissioned. | F027 |

| I034 | Implemented staged; CI pending | Construct exact conditional Stage14 permit from independently pinned review artifact and fresh authenticated original/member/draft; preserve separate T24 witness or honest standalone later path; no native claim or production signing. | F005, F018, F027 |

| I035 | Implemented relay PR30; CI pending | Canceled run audit reads exact job metadata, distinguishes empty runner list and uncertain execution; keeps unresolved and never collection proof. | F036 |
| I036 | Implemented relay PR30; CI pending | Bound distinct route wake concurrency to two, retain per-route active check, one POST maximum, no retransmit and deadline. | F037 |

| I037 | Implemented staged; exact CI pending | Reuse current signed revision resolution for both native audit and conditional proof; authenticate original and current, compare exact SOURCE registry, shard, query path and bytes. | F038 |

| I038 | Implemented staged; exact CI pending | Minimal independently verifiable signed SOURCE instruction proof for separate PRE role processes: authentic day index, all SOURCE registry instructions and exact signed query; no raw flight response, private key or reader credential in transport. | F027 |

| I039 | Implemented staged; CI pending | Existing private Unix-socket PRE role path passes signed SOURCE instructions only to lane/proof signers; independently verifies protected trust and own DB clock; no extra lane reader credentials or replay with changed proof. Actual conditional registry issuance still outstanding. | F027 |

| I040 | Implemented staged; CI pending | Bounded 96-member conditional permit preparation page validates every independent review before SQL and reads actual SOURCE original/member population once, reuses existing Stage14 preflight; rejects duplicates/absent member and no signing. | F027 |

| I041 | Exact #976 CI passed; live issuance incomplete | Separate conditional packet envelopes, existing Phase7 proof attachment, C+D roster metadata and worker-side scope; actual signed publication remains open. | F027 |

| I042 | Exact #976 CI passed; target merged | Current SOURCE snapshot uses bounded read-only retry on explicit stale revision, always anchored to immutable child. Actual production conditional use still unproven. | F038 |

| I043 | Both target and relay deployed paused | Owner exact #976 and relay #30 CI 46/46 and 4/4. Target main f4fe806d, retention 45812762727 both jobs success; ACTIVE_RELAY_NO_CANCEL before relay merge. Idempotent owner procedure can resume on quiet interval; no paid resume. | F026 |

| I044 | Implemented #977; exact CI pending | Conditional later registry and private C+D hydration/projection accept only explicit protected prospective scope and mandatory proof metadata; compare parsed registry/source objects against authenticated bytes; legacy direct writer remains native-only. | F027, F039 |

| I045 | Staged #977; CI required | Bounded read-only quiet wait for already merged target relay cutover; explicit malformed/API failure handling, preserve all existing pause/retention/active checks and no cancel/replay. | F026, F040 |
| I046 | Staged; exact CI required | Bounded conditional prepared-permit page adapter for existing independent proof port; explicit count-only conditional draft status distinct from native audit; no actual producer signature or publication. | F027 |
| I047 | Staged; exact CI required | Complete exact conditional proof page and assemble unsigned later registry from genuine proof-attached packets under explicit scope; native signature path unchanged. | F027 |
| I048 | Staged; exact CI required | External conditional reviewer signs exact private registry and separately protected conditional scope in distinct signature domain; existing append reader propagates exact scope, delegated day policy separately pins it. | F027 |
| I049 | Focused heartbeat CI passed; full exact CI pending | Bounded first-parent early-draw handover requires actual successful prior worker step, exact commit ancestry, no current-main run and existing slot deadline; retain prior/current distinction, no draw or paid authorization. | F041 |
| I050 | Exact 9dcdec5a CI passed; production pending | Authenticated independent signed review artifact page binds exact source, study, code, protocol, member set and optional separately pinned standalone protocol before SQL; existing fresh restricted reread and Stage14 preflight reused. | F027 |
| I051 | Exact 9dcdec5a CI passed; production pending | Compose authenticated conditional permit ingress with original protected Phase7 proof port, real clock check, distinct signers and exact proof attachment; no unsigned fallback. | F027 |
| I052 | Exact 9dcdec5a CI passed; production pending | Conditional T24 registry distinct signature domain, explicit separate protected scope and existing private registry publication/readback/singleton queue projection. | F027 |
| I053 | Exact 9dcdec5a CI passed; production pending | Independent restricted SOURCE lane conditional T24 permit-review issuer under explicit prospective protected delegation; exact signed page, no native claim or later missingness assumption. | F027 |
| I054 | Exact 55ade358 CI passed; production pending | Existing protected Unix lane socket issues bounded conditional T24 signed review page from authenticated SOURCE instructions and actual restricted reread; distinct request from permit proof, exact member replay fence. | F027 |
| I055 | Exact 55ade358 CI passed; production pending | Protected actual SOURCE T24 follow-on now consumes independent review and proof ports, fresh signed registry scope, separate delegated signature and existing atomic publish/readback even if native count is zero; source expiry bounds conditional custody. | F027 |
| I056 | Exact 55ade358 CI passed; production pending | Validate distinct conditional public reviewer and explicit prospective delegation in the pre-SOURCE readiness and actual publisher admission; missing pin fails before acquisition. | F027 |
| I057 | Exact d39097d2 CI passed; deployment pending | Explicit paid route configuration on heartbeat regardless of arm expectation; absent flags unknown, never collection evidence. | F041, F026 |
| I058 | Staged; exact CI required | Conditional later T24 evidence reader independently rereads exact original, member and stored custody and shares existing restricted persisted PRE/witness classification; no standalone authorization. | F027 |

## Completion components (not gates)

| ID | Status | Component | Failure IDs | Implementation IDs |
|---|---|---|---|---|
| C001 | Partial; conditional T24 integration CI passed | Conditional permit/proof/registry integrated on #977, actual protected workflow projection/commissioning and actual restricted positive task remain unverified; conditional T6/T90 read staged I058, no signer yet. | F005, F018, F027 | I005, I014, I016, I034, I054, I055, I058 |
| C002 | Partial | Conditional features and independent T24 issuer/proof integration CI passed; lawful Packet B actual custody and conditional later issue remain open. | F027, F030, F031, F033 | I014, I024, I025, I026, I028, I029, I031, I033, I053, I054, I055, I058 |
| C003 | Open | Distinct conditional schedule-revision POST pairing | F005, F029 | I005 |
| C004 | Open | Same-leg physical gate-out observability, honest censoring | F029 | I005 |
| C005 | Open | V0111/V0112 production install and genuine task path | F018 | I015, I016 |
| C006 | Open | Prospective SOURCE effectiveness and status/body custody | F016, F017 | I012, I013 |
| C007 | SOURCE routing resumed; collection verification open | Owner exact pins and budget/STOP audit passed 19:47:58Z, SOURCE switch enabled, first actual stored parent 45886377755 NO_DUE_WORK; POST remains paused. Do not treat routing as paid capture. | F026 | I008, I011, I023, I057 |
| C008 | Open | Missingness, representativeness, no leakage and 31-day split audit | F005, F026, F029 | I018, I020 |
| C009 | Open | Remove redundant runtime dependencies and isolate failures without weakening custody | F007, F021, F023, F024, F041 | I006, I019, I021, I022, I049 |

| C010 | Partial; deployed and primary pulse verified | Relay #30 merged to 91888916, target f4fe806d; independent primary relay 45816236626 and target retention child 45816293783 passed. New relay rolling wake 45816860550 passed and six target child workflows completed; scientific execution remains separate. | F034, F035, F036, F037, F041 | I032, I035, I036, I049 |

## Regression tests

T IDs are permanent scenarios, not claims of passing CI. Each references existing test files or workflows; **open end-to-end acceptance** rows list partial fixtures, not a completed integration test. Production acceptance always needs separate evidence. Do not increment a T ID for a recurrence of the same scenario.

| ID | Status | Scenario and acceptance | Failure IDs | Implementation IDs | Component IDs | Test / workflow paths |
|---|---|---|---|---|---|---|
| T001 | Existing historical regression | Cron cadence and clock ownership, never equate green dispatch with execution | F001, F006, F007, F009 | I001, I006, I007 | C009 | tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs; tests/phase6_direct_recovery_tick_v39.test.mjs |
| T002 | Existing historical regression | Bounded recovery after connection interruption; no uncertain write replay | F002, F008 | I002, I006 | C009 | tests/phase6_rolling_failure_journal_v39.test.mjs; tests/phase6_rolling_failure_readback_v39.test.mjs |
| T003 | Existing regression; live evidence required | Reservation versus original binding, never charge/replay uncertain source | F003, F017, F026 | I003, I013, I020, I030 | C006, C008 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase6_private_source_one_original_child_github_v39.test.ts |
| T004 | Existing historical regression | Expired foreign cohort cannot block current owner; historical records preserved | F004 | I004 | C005 | tests/phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts |
| T005 | Existing regression; end-to-end open | Positive operator ID-less service matches marked original; no physical native claim | F005, F018, F030 | I005, I014, I024 | C001, C002 | tests/phase5_conditional_fids_service_recovery_v39.test.ts; tests/phase5_conditional_bound_source_review_v39.test.ts |
| T006 | Existing regression | Signed flags and exact launch approval required; no unreviewed spend | F010 | I008 | C007 | tests/phase6_source_enable_approval_ledger_v39.test.ts; tests/phase6_direct_recovery_tick_v39.test.mjs |
| T007 | Existing PG16 regression; production readback separate | Restricted SOURCE writer/trigger and POST metadata privileges; actual transaction required | F011, F012, F013 | I009 | C005, C006 | tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts; tests/phase5_cd_v0088_existing_stage14_real_v0087_queue_pg16_v39.test.ts |
| T008 | Existing regression; production binding separate | Immutable study anchor and executable successor distinct; role projection cannot leak other credentials | F014 | I010 | C007 | tests/phase7_local_private_pre_handoff_v39.test.ts; tests/phase7_post_actor_preflight_v39.test.ts |
| T009 | Existing regression; full production baseline required | Exact retention expiry execution and independent source custody | F015, F022 | I011, I020 | C007, C008 | tests/fids_population_retention_v39.test.ts; tests/phase5_retention_metadata_private_readonly_sentinel_v39.test.mjs |
| T010 | Existing regression; actual HTTP cause unknown | Rate status and finite body availability: no fabricated empty original, no extra physical GET | F016, F017 | I012, I013 | C006 | tests/phase5b_fids_response_diagnostics_v39.test.ts; tests/phase5b_source_diagnostics_v39.test.mjs |
| T011 | Existing PG16 regression; deployment pending | Separate conditional T24 witness and scoped queue enrollment; no native or physical substitution | F018, F005 | I015, I016 | C005 | tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts; tests/phase5_cd_v0088_existing_stage14_real_v0087_queue_pg16_v39.test.ts |
| T012 | Focused CI passed on 5936e6d | Original availability versus binding, minimum review lead, final-clock candidate/draft parity | F019, F033 | I017, I028 | C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T013 | Existing regression | Reject retimed or duplicate PRE and preserve same-flight cutoff | F020 | I018 | C001, C008 | tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts |
| T014 | Existing diagnostic regression; cause unknown | Later PRE stage/category diagnostics only; no unsafe retry | F021 | I019 | C009 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase6_private_later_pre_existing_stage14_bridge_v39.test.ts |
| T015 | Existing regression | Idle publication does not lock before audit; empty result is not success evidence | F023 | I021 | C009 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |
| T016 | Existing regression | Absent optional NOAA archive does not block FIDS-only proof; present weather independently verified | F024 | I022 | C002, C009 | tests/phase7_independent_noaa_receipt_v39.test.ts |
| T017 | Exact #976 46/46 passed | Typecheck, full offline and actual PG16 migration execution at exact head | F025, F028 | I023, I026 | C005, C007 | .github/workflows/v39-phase0-offline.yml; .github/workflows/phase5b-conditional-t24-witness-pg16.yml; .github/workflows/phase5-v0091-source-bound-registration-disposable-pg16.yml |
| T018 | Focused CI passed on 5936e6d; signer still open | Independent conditional exact original reread and drift rejection for omitted/changed FIDS values | F027, F030, F031 | I024, I025, I026, I029 | C002 | tests/phase5_conditional_bound_source_review_v39.test.ts; tests/phase7_signed_pre_field_proof_v39.test.ts |
| T019 | Existing isolated test; actual label source unresolved | Conditional schedule revision and physical gate-out are distinct; unknown not zero | F029 | I005 | C003, C004 | tests/phase5_conditional_signed_schedule_pair_v39.test.ts; tests/phase7_continuous_gate_out_target_v39.test.ts |
| T020 | Exact #976 46/46 passed | Register consecutive IDs, duplicate section, reciprocal references and crosswalk ignored | F032 | I027 | C009 | tests/phase5b_recovery_register_v39.test.mjs |
| T021 | Existing partial coverage; full production chain required | Packet A expiry and Packet B approved field parity; no permanent raw link or unapproved field | F027, F026 | I025, I029 | C002, C008 | tests/phase7_canonical_field_parity_v39.test.ts; tests/phase7_derived_release_writer_v39.test.ts; tests/phase7_purpose_bound_reference_identifier_v39.test.ts |
| T022 | Open end-to-end acceptance | Positive signed conditional SOURCE→independent proof→queue→committed PRE→lawful distinct POST; no historical backfill | F005, F018, F027, F029 | I005, I014, I016, I029 | C001, C002, C003, C004, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts; tests/phase5_conditional_signed_schedule_pair_v39.test.ts |
| T023 | Open scientific acceptance | Fixed 20/5/6 split; per-day/horizon denominator and missingness, no leakage | F026, F005, F029 | I018, I020 | C008 | tests/phase7_final_group_assembly_v39.test.ts; tests/phase7_paired_derived_release_candidate_v39.test.ts |
| T024 | New tests committed; CI pending | Outer SOURCE stage category on reader and admission failure; no raw errors or replay | F003, F017 | I030 | C006, C009 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase6_private_source_one_original_child_github_v39.test.ts |

| T025 | New regression; exact CI pending | Both PRE authority callers route explicit separate identity tiers, reject absent authenticated scope or mixed page before DB access | F027 | I031 | C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T026 | Existing main regression; separate relay readback pending | Cron ACK is not execution; pending, unresolved, stale or canceled wake cannot become collection proof | F034 | I032 | C010 | tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs; tests/phase6_direct_recovery_tick_v39.test.mjs |
| T027 | Existing main regression; separate relay fixture exact CI pending | Unknown active-state reads defer only own lane; no duplicate child or replay; exact executable pin | F035 | I032 | C010 | tests/phase6_rolling_github_controller_v39.test.mjs; tests/phase6_rolling_child_custody_v39.test.mjs |

| T028 | New regression; CI pending | Exact signed query and independent conditional content purpose bind to permit; refuse native promotion, changed query/early draw, unapproved purpose or extra policy keys before original read | F027 | I033 | C002 | tests/phase6_stored_source_native_candidate_audit_v39.test.ts |

| T029 | New regression; CI pending | Exact conditional Stage14 permit creation from live original/member and external artifact pin; reject fake native attestation, changed evidence, cutoff miss, incorrect standalone T24 protocol | F005, F018, F027 | I034 | C001 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T030 | New relay regression; exact CI pending | Canceled relay job metadata empty vs present vs unavailable; no log read or false proof; unresolved remains | F036 | I035 | C010 | https://github.com/HKcode22/TravnrClockRelay/blob/b2dec744491d5438a8041adc38f74d9fcc9f3b64/cron-audit.test.mjs |
| T031 | New relay regression; exact CI pending | Slow first route does not serialize paired independent lane; cap two route groups; deadline during active reads prevents POST and no retry | F037 | I036 | C010 | https://github.com/HKcode22/TravnrClockRelay/blob/b2dec744491d5438a8041adc38f74d9fcc9f3b64/isolated/independent-wake.test.mjs |

| T032 | New regression; exact CI pending | Advanced append with unchanged SOURCE is accepted; rollback, changed packet, same-revision digest drift fail closed | F038 | I037 | C002 | tests/phase6_stored_source_native_candidate_audit_v39.test.ts |

| T033 | New regression; exact CI pending | Real Ed25519 fixture keys authenticate exact signed day and query; reject byte drift, omitted registry, invalid signature, expired proof, wrong run and native promotion | F027 | I038 | C002 | tests/phase6_stored_source_native_candidate_audit_v39.test.ts |

| T034 | New regression; exact CI pending | Conditional IPC requires exact proof, refuses mixed pages, publisher/control leakage, changed digest or same-permit changed-proof replay; both independent signers receive same proof; real protected role projection plus synthetic Ed25519 stable trust and exact day-plan policy, wrong digest/marker rejected | F027 | I039 | C002 | tests/phase7_local_private_pre_handoff_v39.test.ts |

| T035 | New regression; exact CI pending | Conditional permit page validates inputs before SQL, one actual original read, no duplicate permit or partial signing, missing member held | F027 | I040 | C001 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T036 | Exact #976 46/46 passed; actual registry publication open | Actual prepared conditional permit -> real fixture Ed25519 independent proof -> immutable packet -> existing roster; reject native promotion, missing policy, invalid signature or synthetic preview | F027 | I041 | C001 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T037 | Exact #976 46/46 passed; actual live use open | Concurrent append after CURRENT_DAY read retries only stale current revision up to three times; original anchor preserved, changed query/expiry/integrity errors never retried | F038 | I042 | C002, C009 | tests/phase6_stored_source_native_candidate_audit_v39.test.ts |

| T038 | Target partial cutover proven; relay owner completion pending | Exact #976 and relay #30 green; target new main and retention both verified, active relay safe stop before merge. | F026 | I043 | C007, C010 | .github/workflows/phase5b-source-diagnostics-offline.yml |

| T039 | Exact prior #977 14/14 passed | Conditional actual prepared packet into exact signed later registry; absent or wrong protected scope refuses. Parsed SOURCE/later objects must match original authenticated bytes; legacy native direct owner remains separate. | F027, F039 | I044 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts; tests/phase5_signed_later_pre_day_registry_v39.test.ts |

| T040 | Exact prior #977 14/14 passed; owner cutover succeeded | Quiet wait retries only known active-run state, stops on unknown/malformed status and bounded persistent activity; checks target plus relay and never cancels or dispatches. | F026, F040 | I045 | C007, C010 | tests/phase5b_cutover_quiet_v39.test.mjs; .github/workflows/phase5b-source-diagnostics-offline.yml |
| T041 | New regression; exact CI pending | Actual prepared permit page is private, bounded and same SOURCE; duplicate/empty/oversized/forged pages rejected; conditional draft diagnostics separate from native no-op. | F027 | I046 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts; tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |
| T042 | New regression; exact CI pending | Real prepared conditional page, exact proof set, unsigned registry and existing consumer; reject forged packet, wrong policy, duplicate, and source drift; independent registry signature still required. | F027 | I047 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T043 | New regression; exact CI pending | Actual prepared proof-attached conditional shard with fixture Ed25519 distinct-domain signature; wrong scope, native wire, expiration and signature substitution rejected. | F027 | I048 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T044 | Focused 45818163362 passed; full exact CI pending | Prior successful worker and exact first-parent cutover with next-slot deadline produce explicit handover notice; current failure, expired grace, wrong ancestry and missing step still alert; no collection proof. | F041 | I049 | C009, C010 | tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs |
| T045 | Exact 9dcdec5a CI passed; production pending | Exact independent Ed25519 artifact page reaches real prepared member; wrong signature, alias, cross-query, altered artifact, standalone scope and duplicate fail before SQL. | F027 | I050 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T046 | Exact 9dcdec5a CI passed; production pending | Signed review page through shared protected proof resolver and genuine packet attachment; missing proof, cutoff and signer alias rejected; synthetic policy fixture only. | F027 | I051 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T047 | Exact 9dcdec5a CI passed; production pending | Synthetic signed conditional T24 registry and witness packet through existing authenticated transport and singleton routing; missing scope, wrong signature, out-of-window execution rejected. Actual restricted publisher/DB positive path still required. | F027 | I052 | C001, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T048 | Exact 9dcdec5a CI passed; production pending | Independently reread prospectively marked T24 original, sign exact artifact and consume into conditional permit/witness, absent delegation and signer alias refused before SQL. | F027 | I053 | C001, C002, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T049 | Exact 55ade358 CI passed; production pending | Real local socket transports exact T24 anchor/member set, only lane accepts, duplicate/cross-run/changed-proof replay rejected. Fixture transport, no live production signer. | F027 | I054 | C001, C002 | tests/phase7_local_private_pre_handoff_v39.test.ts |
| T050 | Exact 55ade358 CI passed; production pending | Conditional T24 bounded selection excludes indexed, too-late and outside-window members, refuses duplicate or wrong-day scope. Actual restricted DB path remains required. | F027 | I055 | C001, C002, C005 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |
| T051 | Exact 55ade358 CI passed; production pending | Conditional readiness verifies public key and scoped policy; missing key, alias and missing delegation hold; native-only unchanged. | F027 | I056 | C001, C002, C006 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |
| T052 | Exact d39097d2 CI passed; deployment pending | Paused, enabled, mixed and absent paid parent config visible even when protected arm false or unknown; no execution proof inferred. | F041, F026 | I057 | C007, C009, C010 | tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs |
| T053 | New regression; exact CI pending | Conditional later evidence entrypoint rejects duplicate or wrong protocol scope before custody/PRE read; actual positive restricted path remains open. | F027 | I058 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |

## Scientific and retention authorities

Read the [f.8 core](../plans/V3.9_DataCollectPlan_f.8.md), [A](../plans/V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md), [B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md), [C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [D1](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md), [D2](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md), [canonical E](../phase5/2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md), [C+D ADR](../phase5/2026-11-10_ADR_PHASE6_AUTONOMOUS_C_PLUS_D_HYBRID_DESIGN.md), [crosswalk](../phase5/2026-11-16_FINAL_EXIT_SCIENCE_AND_COMMISSIONING_CROSSWALK.md), [Nov22 freeze](../phase5/evidence/2026-11-22_phase6_scientific_freeze_adoption.md) and [runtime scope](../phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md). Historical proposals are not new approvals. E primary T6 actual continuous gate-out delay, T90 paired update, T24 comparator; cancellation and airborne ETA separate. Conditional schedule revision is distinct, never an automatic primary replacement. Preserve 20/5/6 chronological parent-day split and same-flight isolation, immutable cutoffs, genuine availability, no backfill or missing-as-zero.

Read [Packet A/B](../phase5/2026-11-19_PHASE6_SECOND_RETENTION_PHASE7_DERIVED_RELEASE_PACKET.md), [16-field parity](../phase5/evidence/2026-11-20_packet_b_amendment_e_field_parity_audit_NO_GO.md), [retention review](checkpoints/2026-11-22_GATE3_EXACT_CI_INDEPENDENT_REVIEW_AND_SOURCE_MARGIN_BOUNDARY_NO_GO.md). A operational custody only while permitted; existing FIDS early 23h/hard 24h, ordinary 168h where applicable, stricter signed expiry honored. B only approved genuinely derived fields, no exact unauthorized copies or links. Reference identifiers distinct Article 5.8 purpose-bound lane. Independent NOAA/ADSB terms distinct. No raw data in Git or extending expiry; no PITR claim without evidence. Retention independent of acquisition.

Original calendar/draw, approved 36,740 launch units, daily 1,900 cap, protected 1,000 floor unchanged. General owner paid authorization acknowledged Nov26; use only exact reviewed prospective signed scope, current balance and quiet cutover; no historical replay, new endpoint or ad hoc extra paid test.

## Evidence baseline and regression strategy

Owner 01:52 PST: 92 reservations, 184 reserved units (not billing), 52 bindings (44 live T6, 8 prior timely T24 now expired), 4,044 live normalized observations, zero native candidates/tasks/PRE rows. Day1 16 reserved zero bound; Day2 T6 44/64, T90 paused; Day3 then 32 T24 elapsed, 32 future. No full training cohort. F005 was known Nov5 and partial Nov9 repair did not reach the full Phase6 producer. Known testing gaps: synthetic IDs, empty/admin fixtures, EXPLAIN without trigger execution, green no-op/dispatch versus real output. Regression must exercise historical failure shapes, real-contract id-less and nullable fixtures, actual restricted roles and triggers, dirty/expired state, complete signed producer/consumer/commit chain, optional failures, real DB cutoff and independent retention. Record current exact head and real logs before closure; avoid unnecessary owner commands. Read existing PostgreSQL via Replit and restricted GitHub secrets, not a connected Neon project.

## Regression crosswalk (2026-11-26 02:15 PST)

| Failure family | Required regression and evidence | Production acceptance |
| --- | --- | --- |
| F005, F018, F027 | Nov 5 real ID-less WSSS shape; Nov 9 conditional service semantics; V0111 witness and V0112 queue registration on PostgreSQL 16; raw/normalized parity and private FIDS feature draft | Actual prospective signed conditional receipt, independent feature proof, enrollment, and lawful outcome; do not relabel as native |
| F025 | TypeScript check, full offline suite and real PostgreSQL migrations at exact head; no relying on superseded green SHA | Exact tested release and owner-protected installation/readback |
| F030, F031 | Duplicate positive operators (including outside service window), marketing aliases, malformed identifiers, explicit UTC precision and invalid dates | Same source member selected consistently without hindsight; no fabricated timestamps |
| F026 and collection gaps | Per-day signed denominators, bound originals, eligible observations, PRE/POST counts, missingness and fixed chronological split | Retain only lawful cutoff-safe observations; no backfill or claim of unbiased coverage |

## Nov26 02:26 PST onward — exact-head audit

- PR #976 head 7c607d6: 41 success / 1 failure of 42 completed PR workflows; full offline safety 45800099520 passed. Failed 45800099500 job 139840779912: register test interpreted crosswalk F025 as a duplicate primary ID (66 distinct / 67 parsed rows) and then failed reciprocal validation; downstream focused tests skipped. This is F032, not evidence of a fresh production SOURCE failure. I027 committed 4d00959c; successor exact CI remains required.
- Owner clarified Day 1 Nov23. C001–C003 remain incomplete: private conditional drafts are not signed PREs, and native runtime currently publishes only native candidates; independent proof must be separately authorized and verified before release. No provider calls, production database changes, or main/relay changes in this audit. Keep existing scientific/retention scopes.

## Nov26 03:42 PST onward — post-cutover reconciliation

See [CI failure reconciliation and partial cutover](checkpoints/2026-11-26_0342_PST_PHASE5B_POST_CUTOVER_CI_RECONCILIATION.md). #976 merged and exact main retention verified; do not repeat superseded CI failures as new production defects. #977 is the single target continuation on exact main f4fe806d. No paid replay, migration commissioning or physical-label substitution.


## Nov26 04:06 PST onward — coordinated cutover complete

Owner output confirms relay #30 merged and pinned to 9188891698958e03d6fc4bf964266f560c36a6d0 with target f4fe806dbda9695f181aee3b16d7285c42e44f93. Live GitHub confirmed #977 prior exact 3b0f529a 14/14, relay tests 45815886344, external primary 45816236626 and independent full target retention child 45816293783 success. No paid resume or migration. Do not repeat previous cutover command. I046/T041 is a staged partial F027 bridge, not a production signer. See [dated continuation](checkpoints/2026-11-26_0406_PST_PHASE5B_PAUSED_CUTOVER_AND_PROOF_PAGE.md).

## Nov26 continuation — I047/T042

Prior f7735c72 exact CI 14/15 successful at census, full safety still in progress, no newer failed target workflow returned after 12:08Z. Independent rolling wake 45816860550 succeeded; six target nonpaid/STOP-default children completed on f4fe806d. New producer-side unsigned proposal is not an independent signed registry, production release, or new approval. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_UNSIGNED_REGISTRY_PRODUCER.md).

## Nov26 continuation — I048/T043

I047/T042 focused run 45817548711 passed; exact 047c2843 at last census 11/16 passed, five running, zero failed. External conditional signer verifier and append scope propagation staged without minting a new production key or authorizing a live signer. Existing native domain remains unchanged. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_EXTERNAL_SIGNATURE_SCOPE.md).

## Nov26 continuation — actual heartbeat F041

Run 45817522392 job 139900985225 exited 2; early draw stale schedule and current-main primary cron absent, but independent full retention step 45816293783 executed. Actual prior early-draw run IDs 45754384565, 45755433957, 45756517078, 45782100546, 45783476405, 45784923538 each executed exact protected worker and reported NO_DUE_FUTURE_DRAW_AT_DB_CLOCK, selectedDays 4, nextDueRunDayIndex 5, zero writes/provider calls. First parent 1ce885f1 of f4fe806d, merge at 11:40:12Z, observer at 12:12:52Z, before first current-main relay early slot completed. No confirmed missed due draw. I049/T044 bounded explicit handover, not a green current-main execution claim. Prior 90c93fd8 exact I048 17/18 successful at audit, full safety pending, no new PR failure at census. See [checkpoint](checkpoints/2026-11-26_PHASE5B_EARLY_DRAW_HANDOVER_HEARTBEAT_REPAIR.md).

## Nov26 continuation — current early worker and signed permit artifact transport

Exact 5554f655 18/19 successful, full safety 45818163156 still running; heartbeat regression 45818163362 passed. Real relay 45818402059 acknowledged current-main EARLY_DRAW 45818445640; actual job 139904142414 completed with NO_DUE_FUTURE_DRAW_AT_DB_CLOCK at 12:19Z, selectedDays 4, nextDueRunDayIndex 5, no missed indices, zero provider calls/writes. F041 current execution gap reconciled; no proof of an actual due draw, paid collection or permanent code deployment. I050/T045 staged authenticated review transport; existing protected reviewer/permit issuer still needs actual integration and deployment. See [checkpoint](checkpoints/2026-11-26_PHASE5B_SIGNED_CONDITIONAL_PERMIT_REVIEW_PAGE.md).

## Nov26 continuation — I051/T046

Shared protected Phase7 proof resolver conditional entrypoint connects signed review-page ingress, actual restricted reread, exact independent proof port and fresh clock, then genuine packet attachment. Native invocation unchanged; no production authority commissioned. Exact CI required; see [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_SHARED_PROOF_RESOLVER.md).

## Nov26 continuation — I052/T047

Conditional T24 registry transport and queue projection now accept only separately pinned conditional tier with a distinct Ed25519 domain. Existing native registry signature schema and reader remain unchanged. New bounded unsigned proposal consumes genuine attached packets; external signature required before existing restricted publisher. Synthetic transport/queue fixture only, not actual T24 PRE. Production source runtime integration, protected commissioning and actual PG16 path still required. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_T24_REGISTRY_TRANSPORT.md).

## Nov26 continuation — I053/T048

Existing independent SOURCE lane can now generate the actual conditional T24 permit-review page under a separately pinned prospective delegation, instead of merely verifying supplied artifacts. I052 exact a0f4b998 19/20 successful including diagnostics 45819411543 and PG16 transport 45819411694, full safety 45819411521 pending. The new issuer is not yet connected to protected local transport or commissioned. No automatic missing-T24 claim. See [checkpoint](checkpoints/2026-11-26_PHASE5B_INDEPENDENT_CONDITIONAL_T24_PERMIT_ISSUER.md).

## Nov26 continuation — I054/T049

Exact 9dcdec5a 20/20 green, full offline 45819757530 and focused diagnostics 45819757568 passed. I054 authenticates signed instructions without pretending a permit already exists, adds private same-run lane request and actual role handler with one-shot per-member fence. No additional credential projection or durable artifact. Actual SOURCE caller orchestration/publication and protected commissioning remain. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_T24_LOCAL_ISSUER_TRANSPORT.md).

## Nov26 continuation — I055/T050

Connect actual SOURCE T24 conditional runtime to I054 protected lane review, I051 proof resolver, I052 registry publisher and independent readback, including native-zero path. Conditional custody expires no later than fresh exact SOURCE expiry. Native unchanged unless separate conditional policy commissioned. No actual production publication or owner policy change. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_T24_RUNTIME_PUBLICATION.md).

## Nov26 continuation — I056/T051

I054 focused diagnostics 45825169246 and actual-role admission 45825168694 passed; 19/20 workflows successful, full 45825169421 pending. I055 diagnostics 45825389420 passed. Actual SOURCE workflow inspection showed the existing lane public verification pins absent from both pre-SOURCE publisher readiness and postcommit publication. I056 validates those pins before paid acquisition if separately commissioned. Workflow projection change was not applied; it remains an explicit release blocker and the guard must hold until it is reviewed. No protected configuration was changed. See [checkpoint](checkpoints/2026-11-26_PHASE5B_CONDITIONAL_T24_PUBLIC_VERIFIER_PREFLIGHT.md).

## Nov26 11:01 PST — paid route pause and missing native heartbeat audit

Exact main f4fe806d / relay 91888916 unchanged. Exact 55ade358 20/20 CI passed, full 45825611498. Only 8 native schedules since 12Z through audit; most recent main heartbeat 45817522392 at 12:12Z red F041, no later scheduled heartbeat observed. Independent 18:58Z relay 45880053370 six ACKs, not collection. Actual target 45880073768 SOURCE and POST paid parent jobs skipped; nonpaid POST no prospective window. T24 45880076837 no due packets, later 45880076528 no due shards; daily prepare 45880080169 no eligible unpublished future day. Full retention child 45878952696 44 live originals, zero hard-due/unbound, no unresolved deletion stop, private expiry due zero. No new failed workflow since 13Z. Prior owner paused cutover deliberately disables both paid parents. Owner explicitly requests prospective SOURCE resume despite tolerable downstream scientific failures. Protected variable endpoints unavailable to connector; owner-side exact readback and guarded SOURCE-only route restoration required; no new authorization, no migration/replay, no POST re-enable until independent pairing reviewed. Keep native existing signed path independent of unfinished #977. I057 improves explicit status on heartbeat even if arm not expected; does not fix absent native cron itself. See [checkpoint](checkpoints/2026-11-26_1101_PST_PHASE5B_PAID_PAUSE_AND_HEARTBEAT_AUDIT.md).

I057 exact e77ab03c focused 45880797152 failed the existing F032 reciprocal-register validator (`I057 not reciprocated by F026`), not a production failure. Added missing F026 reciprocal link, preserving all IDs. No new distinct failure ID. Exact successor test required.

## Nov26 11:49 PST — owner SOURCE resume and complete priority crosswalk

Owner exact paused pin readback passed, DB 19:47:58.582Z active authorization, zero STOPs, 37 UTC charge dates, 7 categories, 36,740 planned/184 reserved, 1,900 daily max, 1,000 floor. SOURCE variable restored true; POST false. First actual parent 45886377755 protected dispatch job 140138004876 reports NO_DUE_SOURCE_NO_DISPATCH, zero ACKs, not a paid original. No need to reapply switch. Latest 45886489109 full retention green. Exact d39097d2 all 20 CI green including F032 register validator 45880957835. See [priority crosswalk](checkpoints/2026-11-26_1149_PST_PHASE5B_SOURCE_RESUMED_ALL_COMPONENTS.md). I058/T053 conditional later custody reader staged, actual sign/publication and real PG path remain open.
