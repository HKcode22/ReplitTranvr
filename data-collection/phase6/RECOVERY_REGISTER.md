# Phase5B / Phase6 recovery register — READ FIRST

Working branch: phase5b/20261125-1610-custody-identity-reconciliation, [PR #976](https://github.com/HKcode22/ReplitTranvr/pull/976), [master #413](https://github.com/HKcode22/ReplitTranvr/issues/413). Baseline Nov26 02:04 PST: production main 1ce885f1, relay 87949484, paid SOURCE/POST paused, exact prior candidate 3327ff5d 42/42 CI success. This is an initial evidence-linked index, not exhaustive review of all 627 issue comments or all historical workflows.

F = failure family or evidenced defect; I = corrective implementation; C = incomplete component, not a new gate; T = regression scenario and acceptance evidence. IDs permanent, consecutive, never renumber or delete. Recurrence updates existing F; new distinct cause gets next ID. Link actual checkpoint, commit, job and production evidence. Historical loss is irreversible. Tested is not deployed; deployed is not end-to-end proven. No new branches or closed gates without substantive evidence.

**Experiment Day 1 is November 23, 2026 (Pacific owner correction, Nov26).** November 3–22 failures are prelaunch historical regression evidence, not losses of the one-month paid experiment. Keep their stable IDs and distinguish any recurrence on or after Nov23. Do not rewrite the signed calendar or historical outcomes.

## Failures

| ID | Status | Observed defect and evidence | Implementations |
|---|---|---|---|
| F001 | Historical repaired | Nov3 cron and job predicate drift, plus independently missed GitHub schedule. [Checkpoint](../phase4/2026-11-03_GATE5_G5A_MISSED_T24_REAL_ACTIONS_RECOVERY.md) | I001 |
| F002 | Historical repaired | Nov4 idle PG 57P01 and prearm cancellation. [Checkpoint](../phase4/2026-11-04_G5A_T24_CANCELLED_RUN_HEARTBEAT_RECOVERY.md) | I002 |
| F003 | Historical loss; current reservation/no-binding remains observable | Nov4 and Nov24 reservations without bound originals, generic failure; HTTP/billing not proved by reservation. [Checkpoint](../phase4/2026-11-04_G5A_ZERO_SOURCE_T24_INCIDENT_AND_BUDGET_PROTECTION.md) | I003, I009, I010, I013, I030, I086, I087, I098, I099 |
| F004 | Historical repaired | Nov4 expired foreign cohort blocked PREPARED owner; empty DB tests missed this. [Checkpoint](../phase4/2026-11-04_G5A_PREARM_FOREIGN_COHORT_ROOT_CAUSE_AND_BOUNDARY_REPAIR.md) | I004 |
| F005 | Open recurring | Nov5 and Nov25–26 native ID/explicit origin/scope evidence missing, zero native PRE. Synthetic provider IDs hid failure. [Nov5](../phase4/2026-11-05_G5A_IDLESS_OPERATOR_CRITICAL_SCIENCE_FIX_NEXT_COHORT.md), [Nov26](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I005, I014, I015, I016, I034, I059 |
| F006 | Historical repaired | Nov12 unreachable T24 scheduling branch. [Checkpoint](../phase5/2026-11-12_T24_SCHEDULE_UNREACHABLE_BRANCH_AND_EXCLUSIVE_AUTOMATION_REPAIR.md) | I001 |
| F007 | Mitigated; bounded history repair staged | Nov15–24 best-effort cron and ACK/history visibility; direct root incomplete read 45429790971. Nov26 code audit: serial all-attempt SOURCE parent history GETs can exhaust 120s freshness and partial-ACK stale return omitted undispatched counts; no proven live miss from this defect. [Checkpoint](checkpoints/2026-11-24_1625_PST_PHASE5B_OPERATIONAL_INCIDENT_AUDIT.md) | I006, I007, I060, I062, I100 |
| F008 | Mitigated | Nov15 rolling failure receipt custody and generic root diagnostics. [Checkpoint](../phase5/2026-11-15_ROLLING_FAILURE_CUSTODY_AND_RECEIPT_RETENTION.md) | I006 |
| F009 | Mitigated | Nov23 heartbeat premature direct activation and wrong expiry multi-job recognition; later paused-route classification. [Checkpoint](checkpoints/2026-11-23_PHASE6_HEARTBEAT_AUTONOMOUS_WORKFLOW_AUDIT.md) | I007 |
| F010 | Historical loss | Nov23 launch budget approval flag absent, early draw flag absent, first direct tick failed, Day1 T24 unprepared. [Run](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564) | I008 |
| F011 | Mitigated | Nov24 source actor lacked POST snapshot metadata access. [Checkpoint](checkpoints/2026-11-24_1744_PST_PHASE5B_POST_ACL_PASS_SOURCE_V0078_MISMATCH.md) | I009 |
| F012 | Mitigated | Nov24 SOURCE serial sequence USAGE and actual population membership trigger ACL; EXPLAIN/admin fixtures missed this. [Checkpoint](checkpoints/2026-11-24_1753_PST_PHASE5B_EXECUTABLE_SUCCESSOR_AND_TRIGGER_POSTMORTEM.md) | I009 |
| F013 | Historical repaired | Nov24 role entry conflated with SQL permission; wrong V0078 constraint assumption. [Checkpoint](checkpoints/2026-11-24_1744_PST_PHASE5B_POST_ACL_PASS_SOURCE_V0078_MISMATCH.md) | I009 |
| F014 | Production mitigated | Nov24 executable SHA vs immutable policy anchor mismatch before paid step. [Checkpoint](checkpoints/2026-11-24_1819_PST_PHASE5B_SOURCE_ROLE_SUCCESSOR_INCIDENT.md) | I010 |
| F015 | Production observed | Nov25 cutover lacked exact-main full two-job retention baseline. [Checkpoint](checkpoints/2026-11-25_0007_PST_PHASE5B_CUSTODY_PAIR_AND_RATE_LIMIT_REPAIR.md) | I011 |
| F016 | Mitigated unproven | Nov24–25 HTTP 429 concurrent SOURCE waves, pacing fallback. [Checkpoint](checkpoints/2026-11-25_1549_PST_T6_SOURCE_RESPONSE_AND_PACING_INCIDENT.md) | I012, I086, I087 |
| F017 | Actual repeated no-content; transport classification repair staged | Nov24–25 HTTP_OK then FIDS_BODY_UNAVAILABLE, older 204/205 masked; exact old transport causes unknown. Nov26 17:45–19:30 PST all 16 red SOURCE jobs show exact HTTP_NO_CONTENT, no body and unobserved; the other 16 timely originals have zero native PRE candidates. Pattern 2/4 in eight waves; actual owner 04:44:57Z reconciles all 32 runs: YSSY HUB and LFQQ MID_B 8/8 timely each; KBUF MID_A and NZNP REGIONAL 8/8 no binding each with prior HTTP_NO_CONTENT logs. Cause still unknown, no fake empty population. [Checkpoint](checkpoints/2026-11-25_1549_PST_T6_SOURCE_RESPONSE_AND_PACING_INCIDENT.md) | I013, I030, I086, I087, I097, I098, I099 |
| F018 | Partial; migration permission recurrence resolved in production | Nov26 21:47Z actual V0112 SQLSTATE 42501 after V0111 uncommitted, entire transaction rollback reported. CI had installed V0112 as superuser, unlike real V0091/V0100 NOLOGIN owner path; I079/T073 and I080/T074 corrected and verified non-superuser commissioning; owner 22:02Z all three production commits independently read back. Runtime/actual task still outstanding. Native-only signer/normalizer/witness/registration and standalone GitHub admission wrappers reject existing conditional tier. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I014, I015, I016, I034, I079, I080 |
| F019 | Tested branch | Conditional reader staleness measured from binding rather than availability; signed window/member clock mismatch. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/0731789d16675d012d42cd68ba8c49d3c898bf23) | I017 |
| F020 | Tested branch | Stage14 cutoff-specific duplicate check admitted possible retimed second PRE. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/23b02b489db71d331efe1f8b9da95c67f4c1fd07) | I018 |
| F021 | Open cause, diagnostic tested | Later PRE generic redacted failure 45762925573, subsequent no-due success not proof of resolution. [Checkpoint](checkpoints/2026-11-26_0129_PST_PHASE5B_THREE_DAY_AUDIT_AND_REPAIR.md) | I019 |
| F022 | Tested branch | Audit incorrectly classified eight expired original hashes as mismatches. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I020 |
| F023 | Tested branch | Idle native follow-on acquired publisher lock before zero candidate check. [Checkpoint](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) | I021 |
| F024 | Tested branch | Optional weather archive read for FIDS-only permit. [Commit](https://github.com/HKcode22/ReplitTranvr/commit/3327ff5d84d9d0aa0478a34bb41e44e788cd3a9a) | I022 |
| F025 | Corrected and exact #976 CI passed | Superseded V0112 predecessor mismatch 45796497453; seven workflows on 6572192 failed same TS18048; two on 41d5d38f failed synthetic Phase7 digest shape. Successor #976 exact 454349c9 passed 46/46, including TypeScript, focused proof/registration, PG16 and full offline safety. Production install separate. Four #977 runs on 427411f4 failed one TS2345 legacy-child union mismatch; 433082ba focused diagnostics and V0094 PG16 passed, full offline pending at 03:50 PST. Recurrence exact 88188823: four workflows 45895855329/45895855211/45895855254/45895855318 failed the same TS18048 optional response wire type narrowing; no production fault. Exact 6be1b51a T076 shell mock JSON overwritten by real RELAY variable; fixture repair within I082/T076. Exact 61f677b6 full safety 45916151587 failed only ESLint no-regex-spaces in T087 line64; corrected quantifier, no production impact. | I023, I026, I069, I082, I094 |
| F026 | Historical loss | Day1 zero bindings; Day2 52 bindings zero PRE; pause missed T90 and elapsed Day3 T24. [Owner census](checkpoints/2026-11-26_0152_PST_PHASE5B_OWNER_CENSUS_AND_QUEUE_REPAIR.md) Nov26 10:58 PST latest actual rolling wake SOURCE/POST paid jobs skipped; do not infer additional missed query count without current owner census. 19:47:58Z owner census: Day3 T24 64 elapsed, T6/T90 128 prospective, 52 historical bindings, 92 reservations, zero PRE tasks, zero unresolved stops; owner enabled SOURCE only. 19:58:19Z I059 actual owner audit confirms 512 prepared, 292 elapsed unreserved, 128 future, 52 timely binding, no PRE; Day4 no prepared rows yet (first signed plan request Nov27 11:45Z, draw already selected). | I008, I012, I013, I014, I016, I043, I045, I057, I059, I060, I062, I082, I084, I086, I087, I090 |
| F027 | Partial; actual synthetic PG16 publication and persistence segments passed; production outstanding | Native-only private registry/producer/feature proof despite separate conditional writer. #976 implements independent source proof/permit preparation and conditional queue packets; #977 connects protected current later registry reader. Independent issuer/conditional registry/persistence tested in separate synthetic segments T070–T072; no actual production conditional signature or observed PRE. Owner 00:47:29Z actual Day3/4 384/384 retained query instructions match ledger/hash/clock; all lack conditional marker. Next unsigned Day5, commission prospectively only. I095 detects candidate clock not previously bound to exact reviewed day plans and conditional delegation could expire before later marked days; candidate-only defect, no production occurrence. | I005, I014, I016, I025, I029, I031, I033, I034, I038, I039, I040, I041, I044, I046, I047, I048, I050, I051, I052, I053, I054, I055, I056, I058, I061, I064, I066, I067, I068, I070, I071, I072, I073, I074, I075, I076, I077, I078, I085, I091, I094, I095 |
| F028 | Superseded CI failure | Stacked PR excluded full offline CI; trigger fixed. [Checkpoint](checkpoints/2026-11-25_1730_PST_PHASE5B_DRAIN_AND_STACKED_CI_COVERAGE.md) | I023 |
| F029 | Open; candidate evidence parity staged | Actual physical gate-out source not certified; schedule revision is not substitute. Candidate evaluator previously allowed reuse of schedule/frozen original evidence for later actual claim; no production numerical label observed. [Adopted runtime scope](../phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md) | I005, I081 |
| F030 | Focused tested, full pending | Conditional raw/normalized matcher parity corrected in c66f6307; [focused run](https://github.com/HKcode22/ReplitTranvr/actions/runs/45799119831) passed. Not a demonstrated live cause. | I024 |
| F031 | Code finding, not live cause | Provider timestamp precision/UTC representation mismatch can discard otherwise identical observations; reject unzoned or impossible dates rather than assume timezone. | I026 | 
| F032 | Corrected; additional crosswalk regression staged | Register crosswalk parser failure 45800099500 and T038 invalid test-path metadata 45810213223 corrected; exact 454349c9 46/46. No production SOURCE fault. Recurrence 45880797152 missing reciprocal F026/I057 link repaired in d39097d2; focused 45880957835 and full exact 20/20 passed. | I027, I063, I065 |
| F033 | Code finding; correction staged | Conditional feature review pruned late drafts at the final database clock but still returned earlier candidate/member proposals. A future signer could see a stale proposal after required lead was lost. Not established as a historical live cause. | I028 |

| F034 | Open monitoring distinction | Managed cron audit failed with pending or unresolved wake evidence; HTTP ACK not execution proof. Relay runs 45709316609, 45573403453, 45562024566, 45424056708. Later audit pass is not proof every wake executed. Actual 45910297117 audit red sampled earlier 45908690260 pre-POST self identity defer; later retention 45910247115 actual success. | I032, I062, I083 |
| F035 | Historical fixture correction observed | Relay isolated test 45525733215 failed three assertions: extra active-state GETs, unknown active-read deferred before dispatch, pin rejection fixture. Current relay test models active states; exact-head isolated CI evidence pending. | I032 |

| F036 | Implemented staged; exact relay CI pending | Four ROLLING_ROOT cancellations (45727773405, 45717616827, 45713496477, 45709128629), empty job lists; no runner execution or paid call proven. Concurrency replacement is plausible, not proven cause. | I035 |
| F037 | Code-discovered deadline risk; additional SOURCE history repair staged | Seven serial distinct route groups with up to 10s active read and 10s dispatch each can exceed 120s wake deadline; late route starvation risk, historical attribution not proven. SOURCE parent also walked all prior job histories serially (12s/read); I100 bounded parallel GETs retains exact no-replay fence. | I036, I100 |

| F038 | Code repair merged; actual live acceptance open | Immutable original selector and coherent current snapshot; exact 454349c9 46/46. Never substitute changed SOURCE or roll back. | I037, I042 |

| F039 | Code-discovered signed-object parity risk; staged | Existing signed later registry validated separate caller-provided parsed objects instead of comparing to authenticated bytes. A changed shard or source entry must never inherit original digest. | I044 |

| F040 | Actual safety hold; additional cutover state correction staged | Owner relay cutover held ACTIVE_RELAY_NO_CANCEL then ACTIVE_PARENT_OR_CHILD_NO_CANCEL after target retention verified. Periodic nonpaid parent runs can overlap; no cancellation or paid failure inferred. Failed active/variable metadata reads must never become quiet/absent. Owner exact 7251796b procedure held QUIET_AND_GAP ACTIVE_NO_CANCEL before merge; then guarded retry succeeded; both PRs merged. Do not cancel or bypass. Nov26 17:46 PST owner #979 stopped safely before merge. Code inspection: old task-empty guard incorrectly blocks all terminal history and relies on a pre-wait STOP/task census. I096 allows only reconciled VERIFIED_ON_TIME and MISSED history, blocks uncertain/active/quarantined, repeats fresh census. | I045, I084, I090, I096 |
| F041 | Focused repair passed; current-main early worker verified | Main heartbeat 45817522392 red at 12:12Z for stale EARLY_DRAW shortly after 11:40Z cutover. Six actual first-parent early-draw jobs at 04/08 UTC succeeded with NO_DUE_FUTURE_DRAW_AT_DB_CLOCK; Current-main draw 45818445640 worker 139904142414 subsequently executed successfully at 12:19Z, NO_DUE_FUTURE_DRAW_AT_DB_CLOCK, no missed indices. Primary backstop executed. Distinct from missing draw, paid loss or retention failure. 19:48Z manual heartbeat 45886325626 evaluated earlier 19:38Z paused SOURCE job after switch enabled; first actual resumed parent 45886377755 completed NO_DUE_WORK. Native primary schedule gap remains, recent full backstop verified. No paid failure proven. | I049, I057, I083 |
| F042 | Actual production POST actor-only admission failed; cleanup dependency cause confirmed | 45913523153 job140227209450 shell admission failed before npm/actors; masked flag values prevent exact failed predicate attribution. Global owner approval may legitimately be true during SOURCE-only operation. Cleanup ran despite skipped dependency install; actual npm missing tsx. Paid job skipped, zero paid authority. Same dependency-blind cleanup found by code inspection in SOURCE role workflow; no observed SOURCE recurrence from this cause. | I088, I089, I093 |
| F043 | Resolved for actual owner audit at 00:47Z | I091 owner audit executed twice on live PG16, SQLSTATE 42601, no provider calls or database writes. Prior mocked query test never executed SQL; exact parser token not exposed. I092/T086 real PG16 passed and actual owner corrected blob 00:47:29Z 384 instructions read successfully, no calls/writes. | I092 |

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
| I058 | Exact 44d4678a 21/21 passed; live publication pending | Conditional later T24 evidence reader independently rereads exact original, member and stored custody and shares existing restricted persisted PRE/witness classification; no standalone authorization. | F027 |
| I059 | Exact 44d4678a 21/21 passed; owner production readback verified | Owner signed-calendar 31-day coverage, explicit missing prepared denominators, prospective dispatch clocks, source binding/cutoff metadata and cross-day/cross-partition identity collision counts. | F005, F026 |
| I060 | Exact bda0c414 CI passed; production pending | Explicit nearest future preparation opening/deadline, draw and genesis state; empty PRE leakage status not assessable. No change to selection, signed window or cutoff. | F007, F026 |
| I061 | Exact bda0c414 CI passed; production pending | Enforce conditional/native T24 identity tier at authenticated metadata-only registry enumeration, not only after hydration; exact conditional schema and expiry fields. | F027 |
| I062 | Staged; exact CI required | Fixed SOURCE predispatch hold stage, due and already submitted counters, explicit in-flight capacity deferral vs no new ACK; no-due/unavailable queue count and DB observation clock/freshness explicitly do not certify full calendar. No dispatch or cutoff policy change. | F007, F026, F034 |
| I063 | Staged; exact CI required | Require each T to link at least one actual implementation for every listed F collectively across register, every I to have a matching T, and reject unrelated T-to-I mappings; repair historical metadata mismatches. | F032 |

| I064 | Staged; exact CI required | Project existing independent lane public verifier fingerprint and public key into both protected nonpaid native/conditional readiness and publication steps. No private signer key, provider access, authorization or paid step change. | F027 |

| I065 | Staged; exact CI required | Enforce per-scenario per-failure linkage, not merely aggregate coverage; remove unrelated F026 from T021 without changing actual F026 regressions. | F032 |

| I066 | Staged; exact CI required | Independent conditional later permit-review issuer uses actual restricted SOURCE, private T24 custody and PRE reads, fresh SOURCE reread and explicit separate protected policy; signs only verified witness or explicitly approved honest standalone, never partial/ambiguous. | F027 |

| I067 | Staged; exact CI required | Bind conditional later custody key, policy, retention, validity and reader login to existing protected delegation before any SQL, including absence path; verify actual Ed25519 public key fingerprint even when no receipt exists. | F027 |

| I068 | Staged; exact CI required | Separate later signed SOURCE instruction scope and same-run lane socket operation with exact horizon and anchor, explicit no-review or selected subset, replay refusal; live handler remains explicitly disarmed pending separately reviewed restricted read access. | F027 |

| I069 | Staged; exact CI required | Explicit return on absent later response wire and missing request scope so TypeScript narrows correctly; distinguish missing field from explicit null no-review, retain strict runtime rejection. | F025 |

| I070 | Staged; exact CI required | Delegate conditional later registry signature from actual module-bound proof-resolved page, exact SOURCE bytes and existing policy with five distinct reviewer identities and source-expiry cap; reuse external verifier. No live publish wiring. | F027 |

| I071 | Staged; exact CI and owner install required | V0113 narrow conditional T24 metadata projections on existing private read-only role; independent exact role/ACL runtime check and bounded conditional-only SELECT path. No new login, writer grants, raw features or retention changes. | F027 |

| I072 | Staged; exact CI required | Wire protected lane to existing private reader via explicit disabled-default configuration, same endpoint and stable reader login, real metadata/custody preflight, authenticated later instruction and actual issuer; preserve writer/key separation. | F027 |

| I073 | Staged; exact CI required | Conditional later SOURCE follow-on now selects current unindexed conditional members independently of native entries, uses actual lane signed review and proof, conditional registry signer and existing private append, separate conditional day policy preserving native append. | F027 |

| I074 | Exact disposable PG16 passed 45898094489; production outstanding | Extend rollback-only V0112 conditional enrollment fixture; use signed field proof, exact registry and roster verification, actual V0100 registration, V0087 claim, Stage14 commit/readback and ACK for both later horizons. | F027 |

| I075 | Staged; exact CI required | Extend existing actual private publisher integration with conditional packet and distinct signed policy, real day index append, restricted current signed registry read and original queue roster projection; preserve full publication lead. | F027 |

| I076 | Staged; exact CI required | Correct T071 synthetic policy SHA (existing proof verifier rejects repeated-character digest); add positive witnessed-only conditional issuer test using exact signed T24 custody and narrow metadata role, reject mismatch/ACL denial. | F027 |

| I077 | Staged; exact CI required | Correct T071 proof-bound study manifest/rights fixture digests consistently across SOURCE, native, conditional, index and reviewer pins; explicitly exercise existing proof metadata validator before publication. | F027 |

| I078 | Real PG16 passed 45899065182; full exact CI pending | T071 actual positive publication/readback/roster reached; correct negative assertions to exact intentionally redacted SQL hydration refusal and verify valid read after refusals, immutable row/index counts unchanged. | F027 |

| I079 | Exact I080 CI 31/31 and owner production V0112 commit independently verified 22:02Z | V0112 owner commissioning uses existing V0100 transaction-local SET/CREATE procedure and verifies removal; test actual non-superuser rollback, commit, repeat rejection and subsequent original queue/Stage14 path. | F018 |

| I080 | Exact 31/31 green; owner production V0111/V0113 commit independently verified 22:02Z | V0111/V0113 owner-parity CI uses existing schema/base/function ownership and non-superuser actor, combined rollback and commit plus restricted witness reader; AGENTS production parity and adopted science continuity. | F018 |
| I081 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Amendment E candidate boundary rejects scheduled/frozen-original evidence reuse for a numerical actual gate-out; separately test real zero and conditional revision threshold without physical promotion. No new provider or physical label source. | F029 |
| I082 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Existing owner pin readback supports already-enabled SOURCE-only mode, checks effective retention/rolling approval overrides and refuses unreviewed conditional metadata activation. Isolate mock shell metadata and assert exact refusal causes; no paid or DB action. | F025, F026 |
| I083 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Same-run bounded GET-only self metadata propagation repair on relay #31; immutable wrong identity, wrong lane and terminal refusal unchanged; 65/65 exact relay tests. | F034, F041 |
| I084 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Owner SOURCE-only coordinated successor, exact CI/pins, zero STOP/tasks, fresh DB prospective gap, quiet main, no route or signed-policy mutation, new retention baseline and relay pin coordination. | F026, F040 |
| I085 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Redacted actual actor preflight readiness differentiates conditional T24/later policy admitted/current/future/expired, disabled metadata transport and standalone/witness requirement. No change to approvals or signers. | F027 |
| I086 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Bounded current-main owner GitHub paid child audit, exact private job/step, timestamped allowlisted diagnostics, explicit nonpaid/unknown/HTTP/late/timely distinction without billing or PRE claim. | F003, F016, F017, F026 |
| I087 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Actual GitHub metadata mask fidelity, exact paid-step log clock scope, and distinct subsequent PRE step status; no raw log, new route or provider request. | F003, F016, F017, F026 |
| I088 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Isolated nonpaid POST actor admission accepts only known owner flag 0/1 while requiring process armed=0, parent disabled, exact actor mode/code and zero provider/owner DB credentials; fixed safe hold markers, cleanup dependency guard and partial empty scratch. No paid route change. | F042 |
| I089 | Staged; exact CI required | Guard SOURCE actor cleanup by successful dependency install, preserve actual pre-provider role/readiness checks, no paid-path relaxation. | F042 |
| I090 | Staged; exact CI required | Reuse verified owner SOURCE-only cutover for target-only #979, exact required CI workflow paths, existing quiet/gap/STOP/custody and full retention guards, no second relay merge or executable repin. | F026, F040 |
| I091 | Actual owner readback via I092 00:47:29Z passed | Count-only owner Day3/4 prospective conditional marker inventory using exact retained SOURCE_QUERY_PACKET instruction/ledger parity and clocks; distinguish absent marker, unavailable, invalid and shape/clock match without signature/policy/actual PRE claim. | F027 |
| I092 | Exact bd6315a6 actual PG16 and focused passed; actual owner 00:47:29Z passed | Rewrite ambiguous SQL projection with explicit aliases and JSON functions, bind ledger rights, retain safe error stage/position only, execute exact production query on disposable PG16 with non-superuser owner. | F043 |
| I093 | Staged; exact CI required | Explicit locally disarmed POST actor-only job, as existing actual PRE preflight already uses; no global SOURCE arm/owner change, retain disabled POST parent, exact mode, runtime pin and credential separation. Paid job unchanged. | F042 |
| I094 | Exact 28e86964 12/12 passed; uninstalled | F025 lint correction and F027 private candidate assembly from exact old three policy byte digests and distinct existing public signer pins, explicit prospective review and unsigned day, preserve native/budget and witnessed-only path, rehash transport and invoke actual public admission; no installation. | F025, F027 |
| I095 | Staged; exact CI required | Bind candidate to all 31 exact existing policy-pinned plan bytes, actual first-request/lookahead clock and full remaining service interval; reject altered plans or truncated conditional delegation; no runtime, policy installation, or spend. | F027 |

| I096 | Exact 0e94d05d 12/12 passed; not deployed | Reuse the existing V0087 owner aggregate census: allow only fully linked cutoff-safe verified tasks and clean missed tasks; hold all active, unknown, quarantined or malformed states. Fresh STOP/task read after quiet wait and before merge; no route change, queue rewrite or weakened gap. | F040 |

| I097 | Staged; exact CI required | Existing bounded paid child auditor inspects up to 100 exact metadata rows and 64 terminal logs separately from prearm; fixed no-content/reset-content terminal category only for complete noncontradictory markers, still failure/unobserved and no replay. | F017 |
| I098 | Staged; exact CI required | Existing owner read-only signed calendar census adds slot/airport denominator, reserved-without-binding and units/member counts; verifies exact per-horizon totals in same transaction, no raw source, no billing or zero-yield inference. | F003, F017 |

| I099 | Exact e0e92a62 focused and PG16 passed; full exact suite 11/12 at inspection | Reuse signed calendar owner read-only transaction to corroborate selected actual child run IDs against exact reservation/query/binding rows and slot, refuse missing/duplicate or contradictory custody; no HTTP/billing/PRE certification. | F003, F017 |

| I100 | Staged; exact CI required | Bounded four-wide read-only all-attempt SOURCE parent job inspection before any POST, wait for all batch results and hold any unknown; preserve 120s freshness and exact deferred counts after partial ACK. No cap, scope, scheduling or retry change. | F007, F037 |

## Completion components (not gates)

| ID | Status | Component | Failure IDs | Implementation IDs |
|---|---|---|---|---|
| C001 | Partial; conditional T24/later synthetic integration evidence passed | Conditional permit/proof/registry integrated on #977, actual native lane/proof/publisher actor preflight 45913505491 passed; conditional commissioning and actual restricted positive task remain unverified; conditional T6/T90 signer integrated, T070/T071 actual disposable PG16 and T072 witnessed-only synthetic SQL passed; production protected policy, live signer and complete actual observation still outstanding. | F005, F018, F027, F043 | I005, I014, I016, I034, I054, I055, I058, I066, I067, I068, I070, I071, I072, I073, I074, I075, I076, I077, I078, I085, I091, I092, I094, I095 |
| C002 | Partial | Conditional features and independent T24 issuer/proof integration CI passed; conditional later proof/registry path tested in T070/T071 and witnessed-only synthetic T072; lawful actual Packet B custody and production issue remain open. | F027, F030, F031, F033, F043 | I014, I024, I025, I026, I028, I029, I031, I033, I053, I054, I055, I058, I066, I070, I072, I073, I074, I075, I076, I078, I085, I091, I092, I094, I095 |
| C003 | Open; isolated regression extended | Distinct conditional schedule-revision POST pairing; signed comparator boundary tests, actual issuer/pairing outstanding | F005, F029, F042 | I005, I081, I088, I093 |
| C004 | Open; candidate evidence parity staged | Same-leg physical gate-out observability, honest censoring; I081 rejects reused evidence at candidate stage, real external physical milestone evidence not certified | F029, F042 | I005, I081, I088, I093 |
| C005 | Partial; production migrations verified | V0111/V0112/V0113 production installed atomically 22:02Z, independent new-connection owner readback verified ownership/ACL and no lingering permissions; actual production task unproven; T067/T070/T071/T073/T074 CI passed | F018, F043 | I015, I016, I071, I074, I075, I078, I079, I080, I091, I092, I094, I095 |
| C006 | Open | Prospective SOURCE effectiveness and status/body custody | F003, F016, F017 | I012, I013, I086, I087, I097, I098, I099 |
| C007 | Coordinated deployment complete; actual paid capture open | Owner exact pins and budget/STOP audit passed 19:47:58Z, SOURCE switch enabled, first actual stored parent 45886377755 NO_DUE_WORK; POST remains paused. Do not treat routing as paid capture. Owner 23:20Z quiet hold followed by successful exact coordinated retry: target c2bb8e18, relay 2d96b223, retention 45910885837 both jobs success and final pin readback. No paid capture inferred. | F026, F040 | I008, I011, I023, I057, I082, I084, I086, I087, I090, I096 |
| C008 | Partial; actual owner coverage readback passed | I059/T054 verified 31 days, 512 prepared queries, 92 reservations, 52 timely bindings, 292 elapsed unreserved, 128 future, zero linked PRE; leakage not assessable. I060 explicit empty status staged. Labels, feature completeness, actual split collision evaluation remain open. | F003, F005, F017, F026, F029 | I018, I020, I059, I060, I086, I087, I097, I098, I099 |
| C009 | Open | Remove redundant runtime dependencies and isolate failures without weakening custody | F007, F021, F023, F024, F037, F040, F041, F042, F043 | I006, I019, I021, I022, I049, I088, I089, I092, I093, I094, I096, I100 |

| C010 | Coordinated deployment, rolling and actual primary due sweep verified | Relay #30 merged to 91888916, target f4fe806d; independent primary relay 45816236626 and target retention child 45816293783 passed. New relay rolling wake 45816860550 passed and six target child workflows completed; scientific execution remains separate. 23:19Z retention cleared 6 originals; cron audit 23:20Z detected older preflight defer. New-main 23:28Z and 23:38Z rolling six lanes passed; primary 23:34Z self-admitted and intentionally deferred recent retention, not new deletion. Actual 23:49Z independent retention 45913171519 cleared 6 originals/576 population/582 tombstones, zero hard due, private/P7 zero due. | F007, F034, F035, F036, F037, F041 | I032, I035, I036, I049, I083, I084, I090, I100 |

## Regression tests

T IDs are permanent scenarios, not claims of passing CI. Each references existing test files or workflows; **open end-to-end acceptance** rows list partial fixtures, not a completed integration test. Production acceptance always needs separate evidence. Do not increment a T ID for a recurrence of the same scenario.

| ID | Status | Scenario and acceptance | Failure IDs | Implementation IDs | Component IDs | Test / workflow paths |
|---|---|---|---|---|---|---|
| T001 | Existing historical regression | Cron cadence and clock ownership, never equate green dispatch with execution | F001, F006, F007, F009 | I001, I006, I007 | C009 | tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs; tests/phase6_direct_recovery_tick_v39.test.mjs |
| T002 | Existing historical regression | Bounded recovery after connection interruption; no uncertain write replay | F002, F008 | I002, I006 | C009 | tests/phase6_rolling_failure_journal_v39.test.mjs; tests/phase6_rolling_failure_readback_v39.test.mjs |
| T003 | Existing regression; live evidence required | Reservation versus original binding, never charge/replay uncertain source | F003, F017, F026 | I003, I013, I030 | C006, C008 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase6_private_source_one_original_child_github_v39.test.ts |
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
| T021 | Existing partial coverage; full production chain required | Packet A expiry and Packet B approved field parity; no permanent raw link or unapproved field | F027 | I025, I029 | C002, C008 | tests/phase7_canonical_field_parity_v39.test.ts; tests/phase7_derived_release_writer_v39.test.ts; tests/phase7_purpose_bound_reference_identifier_v39.test.ts |
| T022 | Open end-to-end acceptance | Positive signed conditional SOURCE→independent proof→queue→committed PRE→lawful distinct POST; no historical backfill | F005, F018, F027, F029 | I005, I014, I016, I029 | C001, C002, C003, C004, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts; tests/phase5_conditional_signed_schedule_pair_v39.test.ts |
| T023 | Open scientific acceptance | Fixed 20/5/6 split; per-day/horizon denominator and missingness, no leakage | F026, F005, F029 | I005, I059 | C008 | tests/phase7_final_group_assembly_v39.test.ts; tests/phase7_paired_derived_release_candidate_v39.test.ts |
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
| T053 | Exact 44d4678a 21/21 passed; production path pending | Conditional later evidence entrypoint rejects duplicate or wrong protocol before SQL; synthetic full restricted custody and PRE read distinguishes absent vs partial and never approves standalone; actual production positive path remains open. | F027 | I058 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T054 | Exact 44d4678a 21/21 and actual owner readback passed | 31-day/93 horizon-cell metadata projection preserves frozen 20/5/6 split, unknown unprepared cells, rejects inconsistent counts and detects split collisions; actual owner readback verified at 19:58:19Z, zero PRE rows not leakage proof. | F005, F026 | I059 | C008 | tests/phase5b_source_diagnostics_v39.test.mjs |
| T055 | Exact bda0c414 CI passed; production pending | Future preparation outside lookahead is distinct from missed deadline; bounded nearest day exposes actual policy clock and genesis; empty PRE leakage is not assessable. | F007, F026 | I060 | C006, C008, C009 | tests/phase6_nonpaid_source_day_github_runtime_v39.test.mjs; tests/phase5b_source_diagnostics_v39.test.mjs |
| T056 | Exact bda0c414 CI passed; production pending | Authentic signed metadata-only wrong-tier entries and unexpected conditional fields rejected before packet routing; valid metadata and exact expiry still verified. | F027 | I061 | C001, C002, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |
| T057 | New regression; exact CI pending | Full capacity deferral, final submitted reconciliation, prior ambiguity, and redacted observation failures report distinct finite stages without paid dispatch or private details; fresh, stale, invalid, empty and unavailable no-due observation metadata never certifies full calendar or collection. | F007, F026, F034 | I062 | C006, C009, C010 | tests/phase6_stored_source_child_dispatcher_v39.test.mjs |
| T058 | New regression; exact CI pending | Reject a T mapped to unrelated implementation, untested I, or F with no matching implementation-tested scenario. Existing historical aliases remain immutable. | F032 | I063 | C008, C009 | tests/phase5b_recovery_register_v39.test.mjs |

| T059 | New regression; exact CI pending | Inspect actual workflow step projection for both nonpaid consumers, reject missing public verifier or private signer credentials in consumers and verifier or publisher credentials in the paid step; existing T051 verifies key identity and signed scope. | F027 | I064 | C001, C002, C006 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |

| T060 | New regression; exact CI pending | Reject a test claiming an additional F when none of its linked I implementations address that F, even when the F is covered by another T. | F032 | I065 | C008, C009 | tests/phase5b_recovery_register_v39.test.mjs |

| T061 | New regression; exact CI pending | Actual code path fixture with exact separate Ed25519 policy signs eligible absent-T24 standalone only under separately pinned protocol, verifies resulting permit; rejects partial, absent delegation, mismatched pin and witnessed-only policy. Actual production wiring and positive DB path remain open. | F027 | I066 | C001, C002, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T062 | New regression; exact CI pending | Exact protected custody permits genuine read; substituted digest, fingerprint, retention, validity, reader role or matching wrong public key rejected before SOURCE SQL. | F027 | I067 | C001, C002 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T063 | New regression; exact CI pending | Real fixture day/query signatures authenticate later scope prior to permit; T24, cross-horizon, wrong anchor refused. | F027 | I068 | C001, C002 | tests/phase6_stored_source_native_candidate_audit_v39.test.ts |

| T064 | New regression; exact CI pending | Real local Unix socket accepts later subset/null only on lane, exact response horizon, no duplicate member or replay; wrong role and horizon refused. | F027 | I068 | C001, C002 | tests/phase7_local_private_pre_handoff_v39.test.ts |

| T065 | New regression; exact CI pending | Full TypeScript check plus real local socket later response with undefined/missing wire rejects while explicit null succeeds; no permissive optional chaining or cast bypass. | F025 | I069 | C001, C002 | tests/phase7_local_private_pre_handoff_v39.test.ts |

| T066 | New regression; exact CI pending | Actual restricted source fixture -> authenticated permit and shared independent proof -> conditional registry issuer -> existing external verifier; reject copied page, expired/late scope or absent conditional policy. | F027 | I070 | C001, C002, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T067 | New real disposable PG16 scenario; exact CI pending | Actual Stage14 conditional PRE and Stage17 witness commits then existing restricted private reader reads only exact conditional metadata, excludes native/absent, rejects base table access and mutation. | F027 | I071 | C001, C002, C005 | tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts |

| T068 | New regression; exact CI pending | Protected lane projection gives private reader only with explicit enable, refuses unapproved URL, missing configuration or PRE/publisher credentials; existing lane/proof/publisher roles preserved. | F027 | I072 | C001, C002, C005 | tests/phase7_local_private_pre_handoff_v39.test.ts |

| T069 | New regression; exact CI pending | Distinct conditional day policy, protected reviewer pins, native unchanged, current duplicate/lead/attempt selection, source registry byte parity, source-expiry and existing-route retention bounds. | F027 | I073 | C001, C002, C005 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |

| T070 | Actual disposable PG16 passed both T6/T90; 9/9 tests run 45898094489 job 140176886919 | T6/T90 exact fixture registry and marked SOURCE -> verified roster -> restricted PREPARE exact enrollment/restart/conflict -> actual Stage14 PRE commit and queue ACK; no standalone approval rejects, zero T24 rows/witnesses. CI-only synthetic policy, not production approval. | F027 | I074 | C001, C002, C005 | tests/phase5_cd_v0088_existing_stage14_real_v0087_queue_pg16_v39.test.ts |

| T071 | Actual disposable PG16 passed 45899065182 job 140180093765, explicit T071 marker | Conditional registry publication and real signed day successor -> restricted current private reader -> exact queue roster and field proof re-verification; reject missing separate conditional policy/standalone scope; no replay. T070 separately covers final Stage14 write window. | F027 | I075, I076, I077, I078 | C001, C002, C005 | tests/phase6_reviewed_later_shard_append_real_pg16_v39.mts |

| T072 | Focused suite passed 45898703448; full exact CI pending | Exact independent signed custody + matching conditional T24 metadata -> signed later review and existing permit verifier with no standalone protocol; witness mismatch and denied ACL refuse. Synthetic SQL fixture, not actual production persistence. | F027 | I076 | C001, C002, C005 | tests/phase5_conditional_bound_source_review_v39.test.ts |

| T073 | Real non-superuser PG16 passed 45900656433 job 140185324695 | V0112 exact migration under existing NOLOGIN registration-owner commissioning, rollback and postcommit no SET/CREATE, duplicate installer refuses, original V0091/V0100 restricted queue tests continue. | F018 | I079 | C005 | .github/workflows/phase5-v0091-source-bound-registration-disposable-pg16.yml |

| T074 | Real PG16 passed 45900988087 job 140186418441; owner production readback passed | V0111 and V0113 in one outer transaction under non-superuser owner, rollback leaves predecessor and no views; commit produces exact witness successor and restricted metadata only, existing actual Stage14/witness/read tests continue. | F018 | I080 | C005 | .github/workflows/phase5b-conditional-t24-witness-pg16.yml |
| T075 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Distinct actual gate-out evidence required at candidate boundary, identical schedule/frozen-source digest stays null; genuine zero with distinct evidence remains numeric candidate only. Conditional revision zero/negative/threshold and duplicated POST receipt cannot certify physical delay or training. | F029 | I081 | C003, C004 | tests/phase5_amendment_e_gateout_label_v39.test.ts; tests/phase5_conditional_signed_schedule_pair_v39.test.ts |
| T076 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | SOURCE-only and prior paused modes, exact target/relay pins, effective route and retention flags, unexpected conditional activation, failed metadata retrieval and no secret output; no mutation. | F025, F026 | I082 | C007, C010 | tests/phase5b_cutover_quiet_v39.test.mjs; .github/workflows/phase5b-source-diagnostics-offline.yml |
| T077 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Same-ID bounded pre-POST active/title metadata retry, exhaustion and immutable wrong-lane/SHA/terminal refusal; no paid authority. | F034, F041 | I083 | C010 | https://github.com/HKcode22/TravnrClockRelay/blob/6c6cbd36e9838ad519ba2c8403c0e2e12ed51f7f/relay.test.mjs |
| T078 | Exact CI passed; coordinated deployment verified 23:25–26Z; actual scientific execution separate | Cutover requires zero open opportunities, fresh signed database clock and 130-minute prospective lead; malformed/active main metadata never authorizes merge. | F026, F040 | I084 | C007, C010 | tests/phase5b_cutover_quiet_v39.test.mjs; .github/workflows/phase5b-source-diagnostics-offline.yml |
| T079 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Native-only, not-yet-effective, current witnessed-only, separate standalone policy and expired configurations return finite enum/count-only readiness, never actual source/commit/training proof; no private pins or malformed clock. | F027 | I085 | C001, C002 | tests/phase6_stored_source_postcommit_native_audit_v39.test.mjs |
| T080 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Actual historical marker shapes, timely original despite later overall failure, HTTP OK without binding, 429, late, actor-only, log missing, wrong attempt/head and contradictory markers; echoed command never evidence. | F003, F016, F017, F026 | I086 | C006, C007, C008 | tests/phase5b_source_diagnostics_v39.test.mjs |
| T081 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Actual masked PG***6 step name and subsecond historical receipt, reject other masks/missing clock/out-of-step markers, explicit separate follow-on failure/success not commit proof. | F003, F016, F017, F026 | I087 | C006, C007, C008 | tests/phase5b_source_diagnostics_v39.test.mjs |
| T082 | Exact dc99e800 10/10 passed; new successor CI and deployment pending | Actual shell admission positive owner-approved SOURCE and negative armed/unknown flag/POST enabled/credential/code, isolated role constructors, dependency-aware cleanup and partial scratch, no raw error. | F042 | I088 | C003, C004, C009 | tests/phase7_post_actor_preflight_v39.test.ts |
| T083 | Staged; exact CI required | Source actor cleanup must not invoke missing tsx after admission/dependency failure; verify production workflow dependency ordering and paid readiness interlock. | F042 | I089 | C009 | tests/phase7_local_private_pre_handoff_v39.test.ts |
| T084 | Staged; exact CI required | Exact target-only CI path/commit/attempt/conclusion checks and shared quiet/gap tests; no duplicate relay merge, retention verified before final readback. | F026, F040 | I090 | C007, C010 | tests/phase5b_cutover_quiet_v39.test.mjs |
| T085 | Actual owner corrected audit passed; all 384 absent markers | Conditional marker absent/unavailable/hash or clock drift/malformed/current scope; bounded read-only active-manifest/retention projection, no raw source or certification; empty denominator explicit. | F027 | I091 | C001, C002, C005 | tests/phase5b_conditional_query_scope_owner_v39.test.mjs |
| T086 | Actual PG16 45916006296 job140235264481 passed; actual production owner readback passed | Real PG16 non-superuser owner exact query executes valid/absent/expired/extra/hash/clock/rights mismatch fixture and proves read-only unchanged counts; safe stage/position on SQL error. | F043 | I092 | C001, C002, C005, C009 | tests/phase5b_conditional_query_scope_real_pg16_v39.mjs; tests/phase5b_conditional_query_scope_owner_v39.test.mjs |
| T087 | Focused POST CI 45916151748 passed; full lint correction pending | Inspect actual workflow job scopes: nonpaid actor local disarm, no provider/reserve credential, exact disabled POST parent, real paid job retains global arm; runtime rejects armed actor. | F042 | I093 | C003, C004, C009 | tests/phase7_post_actor_preflight_v39.test.ts |
| T088 | Exact 28e86964 passed | Candidate byte binding and exact public reviewer admission, no native/budget rewrite, no standalone, reject published/retrospective/day drift/key reuse/unapproved review; lint corrected T087. | F025, F027 | I094 | C001, C002, C005, C009 | tests/phase5b_conditional_policy_candidate_v39.test.mjs; tests/phase7_post_actor_preflight_v39.test.ts |
| T089 | Staged; exact CI required | Actual checked-in 31 metadata plans under synthetic policy pins; positive exact prospective clock and coverage, reject tampered or missing plans, drifted first/open clocks and shortened delegation. Does not authenticate actual database receipt. | F027 | I095 | C001, C002, C005 | tests/phase5b_conditional_policy_candidate_v39.test.mjs |

| T090 | Exact 0e94d05d passed; not deployed | Exact Bash/JQ cutover guard: empty and fully reconciled terminal history pass; STOP, active/unknown/quarantined state, partial link, duplicate/malformed evidence, mismatched clock fail. Assert renewed task census and clock before final quiet and merge. | F040 | I096 | C007, C009 | tests/phase5b_cutover_quiet_v39.test.mjs |

| T091 | Staged; exact CI required | Eight-wave actual 204 marker family and exact masked job shape, no-content/reset distinction, incomplete/contradictory or interrupted subprocess refuses attribution; 24 active rows do not crowd 64 terminal logs out of bounded audit. | F017 | I097 | C006, C008 | tests/phase5b_source_diagnostics_v39.test.mjs |
| T092 | Staged; exact CI required | Real disposable PG16 actual slot SQL, synthetic bound/unbound reservation plus future rows, exact four-slot and horizon reconciliation with contradiction refusal. | F003, F017 | I098 | C006, C008 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase5b_conditional_query_scope_real_pg16_v39.mjs |

| T093 | Exact e0e92a62 focused and real PG16 passed | Run receipt scope, exact one-row cardinality and timely/unbound positive and negative mapping, missing and contradictory evidence refusal; real disposable PG16 actual run-ID join. | F003, F017 | I099 | C006, C008 | tests/phase5b_source_diagnostics_v39.test.mjs; tests/phase5b_conditional_query_scope_real_pg16_v39.mjs |

| T094 | Staged; exact CI required | Twelve prior all-attempt metadata GETs bounded to four concurrent, any ambiguous attempt blocks POST; stale clock after one ACK retains exact remaining count without further POST. | F007, F037 | I100 | C009, C010 | tests/phase6_stored_source_child_dispatcher_v39.test.mjs |

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

I059/T054 adds owner-only signed calendar coverage and split-collision audit. No provider calls, raw export or DB writes. Current and future query times use actual planned database rows; missing preparation stays unknown, not zero yield. Frozen 20/5/6 chronology, no repartition. Actual owner execution still required; no training eligibility claim.

## Nov26 12:22 PST — actual 31-day owner coverage and next windows

Exact 44d4678a all 21 CI passed (full 45887030057, focused 45887030047, actual SOURCE unsigned native dossier 45887029922). I059/T054 owner actual 19:58:19.757Z, 31 days, 8/93 prepared horizon cells, 512 queries, 92 reservations, 52 timely bindings, 292 elapsed unreserved, 128 future, zero PRE. Zero collision on empty PRE is not evidence of absence of leakage. Latest 20:18Z SOURCE parent 45890082594 job 140150310728 NO_DUE_SOURCE_NO_DISPATCH; early draw 45890092454 actual selectedDays=4 nextDue=5 no missed indices; daily prepare 45890089257 no eligible unpublished day and no missed/at-risk/partial-past genesis; retention 45890201103 both jobs success. Day3 T6 signed first/last 01:45–06:30Z Nov27 (Nov26 17:45–22:30 PST), T90 06:15–11:00Z (Nov26 22:15–Nov27 03:00 PST). Actual first hard latest +1m from owner census. Existing stored dispatch 90m max lead and 24 in-flight/8 per tick; prearm earliest 00:15Z Nov27 = 16:15 PST Nov26. Day4 T24 plan 11:45–15:30Z Nov27 (03:45–07:30 PST), not yet prepared in owner audit; no evidence of missed deadline at 20:19Z. I060/T055 makes next approved preparation opening and deadline visible; no selection or policy change. SOURCE remains enabled, POST paused; no deployment or provider call by this audit.

I061/T056 code-discovered F027 scope risk: metadata-only T24 registry enumeration previously accepted a validly signed wrong-tier member ID until packet hydration. That could suppress an otherwise eligible member via current registry identity enumeration; not a proven production recurrence. Enforce identity tier in both native and conditional metadata, exact conditional schema and source expiry. Synthetic freshly signed negative cases; production acceptance remains open.

I062/T057 SOURCE dispatcher diagnostics: current parent green no-due is not prearm, and a zero ACK can mean capacity deferral or previously submitted work. Preserve existing authorization and exact two-pass history guard, add bounded counters and fixed no-POST stage. No new incident ID: F007/F026/F034 monitoring and loss observability. No production failure recurrence inferred.

## Nov26 12:36 PST — production nonpaid actor preflight and release isolation

Owner dispatched current main f4fe806d run 45892180597, actual job 140157259756 succeeded; restricted lane, proof, publisher, native publication readiness and cleanup succeeded, paid GET and postcommit steps skipped. No independent conditional successor commissioning or actual persistence inferred. At review f5f711bb 21/22 exact CI passed, full offline 45891715979 pending. F032/I063/T058 strengthens exact F/I/T crosswalk; removes unrelated I020 from T003, replaces T023 historical mismatched I018/I020 references with I005/I059 (scientific target/coverage, not proof of completion); T009 and T013 retain the actual expiry and duplicate-specific links. Operational-only release candidate isolates existing heartbeat, preparation, SOURCE diagnostic and coverage improvements from #977's incomplete protected conditional policy integration. No new failure ID, no deployment or paid switch change by this checkpoint.


## Nov26 12:43 PST — I064/T059 protected workflow projection

F027 existing checkpoint identified pending conditional public verifier projection. Exact #977 source inspection confirms both actual nonpaid consumers omit the lane public fingerprint/key already supplied to independent actors. Project only the two existing public values; verify actual workflow text and preserve paid admission and private key separation. No production policy commissioning, provider request, migration or PRE persistence claimed. Exact CI pending.


I065/T060: audited every T against each listed F; only T021 claimed unrelated F026 via I025/I029. Corrected the mapping and made the validator enforce each per-T F relationship. This is traceability, not a claim of all failure repairs or live PRE persistence.


## Nov26 continuation — I066/T061 conditional later review issuer

Exact f33304b0 passed 23/23 including full 45893317369 and focused 45893317531. #978 exact cc4424b4 passed 11/11; not deployed. Implement actual conditional later independent issuer as a separate explicitly delegated path using restricted SOURCE/custody/PRE reads and fresh revalidation. Standalone approval is still null in adopted Nov22 policy; synthetic test delegation does not commission it. No protected policy change, actual role transport or publisher wiring, migration, paid request, or production persistence. No new failure ID.


## Nov26 continuation — I067/T062 conditional later custody binding

I066 exact 9ab19602 at inspection 22/23 green; full offline 45894889753 pending. Bind the existing protected T24 custody policy/key/retention/clock and existing reader-login pin before any later evidence read, including absent receipt classification. Synthetic Ed25519 trust regression rejects drift before SQL. No live actor permission projection, policy changes, provider calls, DB writes, production deployment or standalone approval. No new F ID.


## Nov26 continuation — I068/T063/T064 conditional later instruction and socket transport

Reuse existing immutable SOURCE proof and private same-run socket with distinct T24 versus later operations. Later response may be explicit no-review or exact requested subset, never fabricated T24 or cross-horizon. Actual lane handler explicitly refuses uncommissioned later operation; existing lane currently has SOURCE-only DB capability, and the existing T24/PRE evidence reader requires restricted PRE and private reader sessions. Do not pass write-role credentials into signer or invent a grant. Existing T24/native behavior preserved; no paid workflow, production deployment or live persistence. CI required.


## Nov26 continuation — I069/T065 exact CI shared-cause repair

Exact 88188823 four CI failures all share TS18048 in later response validator, not four incidents or PG permission regression. Explicit return on undefined wire and missing request scope retains strict behavior and fixes narrowing; expanded real socket test for missing versus explicit null. Existing F025 recurrence, no new F. I066 exact 23/23 passed. Operational #978 unchanged 11/11. No production switch, migration, paid request or deployment.


## Nov26 continuation — I070/T066 conditional later registry issuer

Use existing proof-resolved page, opaque module binding and conditional packet assembler to issue an exact policy-scoped Ed25519 shard signature under five distinct reviewer pins, bounded source expiry and prospective cutoff. Verify immediately with existing external reviewer verifier; live runtime and publication remain open, no rights or paid authorization changes. T066 uses existing synthetic source/proof fixture. I069 exact CI running. No production data, provider or deployment.


## Nov26 continuation — I071/T067 narrow conditional metadata read

I070 at check 22/23 green, full 45896209697 pending. Existing lane cannot hold PRE writer URL; V0113 candidate creates two restricted metadata views on existing private frozen reader role only (no new login or writer grants). Existing native PRE reader unchanged. Conditional exact read mode verifies private reader login, READ ONLY PG16 primary, narrow view SELECT, no base SELECT or mutation. Existing Stage14/witness disposable PG16 fixture exercises genuine commits and narrow read/deny behavior. No production migration, credentials, runtime activation, provider call or policy change. Owner review and actual permissions readback still required.


## Nov26 continuation — I072/T068 actual conditional lane handler

V0113 staged metadata read is wired into existing protected lane with existing private reader secret conditional on disabled-default owner variable. Authenticate stable login, same TLS endpoint, explicit READ ONLY metadata/custody preflight and exact signed later SOURCE instruction. No PRE writer URL, publisher key or provider credential in lane. Native/conditional T24 path unchanged while disabled. T067 fixture regex corrected before exact successor CI. Production still requires owner-reviewed V0113 install and protected policy/route commissioning; no production change, no additional paid call. Existing Phase7 pre-fragment readback role grants only pre_fragment_v39 SELECT, not witness/snapshot evidence; no reuse of its unrelated grant.


## Nov26 continuation — I073/T069 conditional later actual follow-on

I070 exact 23/23 passed. I071 initial T067 real PG16 migration/read succeeded through actual role clock but test regex was incorrectly escaped (45897075148); corrected I072 successor, no new failure cause beyond existing F025 test fixture family. I073 connects conditional later independent lane -> proof page -> signed registry -> existing private publisher/day append with separate conditional day policy (native append policy must stay unscoped); bounded current membership, no replay, expiry and existing route validity. Disabled-default owner flag and separately reviewed protected policy still required. No production migration, deployment, provider call, actual PRE enrollment or persistence claim. The historical standalone later approval remains null until separate prospective scientific decision.


## Nov26 continuation — I074/T070 conditional later registry to actual queue and Stage14

I073 at check 27/28 green, full offline pending. Existing V0112 conditional registration was rollback-only; new T070 uses original marked SOURCE fixture, cryptographic proof check and SHA-pinned registry/roster verification, restricted V0100 actual commit/restart/conflict, V0087 claim and Stage14 commit/readback/ACK, for T6/T90. Explicit synthetic CI-only standalone approval tests no fabricated T24; production approval remains null. Private signed day-index publication and actual live signer/field preservation still separate tests, not inferred complete. No production changes or provider call.


## Nov26 continuation — I075/T071 real private publication and queue consumer

T070 exact e71054c1 real PG16 45898094489 job 140176886919 passed 9/9 including actual T6 and T90 conditional registry -> V0100 -> V0087 -> Stage14 commit/readback/ACK (both explicit markers present). New T071 extends existing real private publisher/day append with independently signed conditional fixture, real current index and restricted queue reader, no replay and missing-scope negatives. It preserves publication lead >15 min; T070 separately verifies final write window <=3 min, not one time-traveling integration test. Synthetic approval only; no production or paid changes. No new F ID.


## Nov26 continuation — I076/T072 witnessed-only coverage and T071 fixture correction

Initial T071 real PG16 job 140178011417 run 45898425153 refused the repeated-character placeholder policy SHA at the existing proof verifier. Replace with actual synthetic SHA-256; no relaxation of proof checks. T072 tests currently relevant witnessed-only policy (standalone null), signed exact custody + matching restricted metadata reader, no standalone substitution, mismatched witness and denied ACL refusal. Synthetic SQL and keys, not actual production evidence. Existing T070 real commit proof remains unchanged. No production or paid changes.


## Nov26 continuation — I077 proof metadata fixture parity

I076 exact publisher 45898703110 job 140178907913 advanced past protected policy trust and failed the existing assertPhase7PreProofMetadataShape at queue permit scope because the shared synthetic manifest/rights were uniform placeholder digests. Correct both consistently in the whole disposable day fixture and invoke metadata shape preflight explicitly, without modifying production verifier. T072 focused suite 45898703448 job 140178908399 completed 143/143. I077 retests existing T071; no new scenario or failure ID. No production change, no provider request.


## Nov26 continuation — I078 exact negative boundary contract

Exact I077 real PG16 45898855379 job 140179417308 advanced through conditional append, readback, no-replay, exact queue roster and proof verification. Failed only at first missing-scope assertion expecting /CONDITIONAL/ rather than existing intentionally redacted SQL hydration refusal. I078 checks exact public refusal for both missing approvals and confirms valid read after both refusals plus immutable counts. No production behavior or scope changed; no new failure/scenario ID. Full test completion not yet established.


## Nov26 continuation — verified T071 acceptance, commissioning boundary

Exact runtime/test revision f1070a04b8ff81aa9da537a9f7d1b406e41b4f30: real PG16 45899065182 job 140180093765 completed success, explicit T071_REAL_PG16_CONDITIONAL_PRIVATE_APPEND_CURRENT_SIGNED_DAY_QUEUE_CONSUMER_NO_REPLAY_CI_ONLY. Positive and negative acceptance all reached, including both redacted refusal cases, subsequent authorized read and final immutable counts. Exact CI 30/31 success at inspection, full offline 45899065678 in progress. T070 real Stage14 later commit and ACK and T072 witnessed-only synthetic signed custody remain independently passed. These are separate segments; no single production or time-spanning end-to-end claim. Updated F027 and C001/C002/C005 descriptions; no new F/I/T/C IDs. Production current target f4fe806d, relay 91888916; 21:34Z actual retention 45899072826 jobs 140180124950 and 140180125161 both success. #978 operational 11/11, unmerged, old owner cutover references superseded #976/#30 and cannot be used unchanged. Current protected effective pins must be read by owner; owner install V0111–V0113 and reviewed conditional policy/route commissioning required separately. No production mutation, migration, paid call, replay, new scope or permission granted.


## Nov26 continuation — owner V0112 refusal and exact non-superuser correction

Owner actual install 21:47:17Z passed exact pins, 31 CI, blob checks, upcoming 01:45Z SOURCE gap, V0111 uncommitted, then V0112 SQLSTATE 42501; no COMMIT attempted, rollback reported. Prior exact V0112 CI applied using disposable postgres superuser, but V0091 registration is protected NOLOGIN owner and V0100 explicitly commissions via bounded temporary SET/CREATE with postflight revocation. I079 reuses that same existing transactional pattern, preserves exact function ownership/ACL and restricted PREPARE-only EXECUTE, and T073 moves actual migration to non-superuser schema owner with rollback/repeat/no-lasting-grant checks. No paid action or new scientific scope, no production install yet. Exact CI required before retry; confirm all three migrations absent independently, never blindly replay.


## Nov26 continuation — T073 verified and I080 owner parity audit

Exact cfab7cd1 job 140185324695 run 45900656433 emitted T073_V0112_REAL_NON_SUPERUSER_COMMIT_ROLLBACK_REPEAT_NO_LASTING_GRANT_PASS at 21:49:44Z, both T070 later persistence markers and 9/9 tests. Exact 30/31 success at inspection; full offline pending. Audit found V0111/V0113 test setup still superuser, although actual V0111 executed uncommitted. I080 changes disposable setup to production-equivalent non-superuser schema/base/witness function owner, tests atomic rollback and commit of both reviewed unchanged SQL files then existing restricted consumer tests. AGENTS records owner reaffirmed Packet A/B, E, C+D, expiry, immutable identifiers and production-role parity. No production change. Owner retry waits exact test acceptance; do not rerun superseded V0112 blob.


## Nov26 14:02 PST — actual production migration acceptance

Owner receipt at 22:02:27–37Z exact a23b4292 31/31, operational #978 11/11, PG16 160016 non-superuser CREATEROLE, all absent markers before install, zero queue/stops, 01:45Z next SOURCE. V0111–V0113 atomically committed; independent new connection verified unchanged function ownership/ACL, no lingering temporary role privileges, restricted metadata reader. Final source and retention pins preserved. No paid dispatch or historical backfill. T074 run 45900988087 job 140186418441 8/8, T073 run 45900987852 job 140186416599 9/9 incl T070 both horizons. Actual study: 512 prepared, 92 reservations, 52 timely bindings, 292 elapsed unreserved, 128 prospective, zero linked PRE/tasks, 184 reserved units not provider billing. Current #977 contains every #978 operational runtime/test change byte-identical except later strengthened recovery-register test; AGENTS/register newer. One canonical combined candidate preferable to duplicate cutover; #978 remains unmerged until reconciliation. Actual protected daily policy bytes/delegation and coordinated executable/retention binding not commissioned. No standalone exception, no rewriting signed historical producer bytes. F018 migration recurrence resolved; C005 remains partial until actual genuine task. No new F/I/T/C IDs.


## Nov26 14:54 PST — I062/T057 no-op observation parity and actual retention readback

Current production f4fe806d / relay 91888916. Actual SOURCE 45907093218 reports no due work. Observer omitted clock and dispatcher discarded queue count; extend I062/T057 with bounded redacted count/clock/freshness, explicit non-certification of coverage. Exact CI pending. Actual full retention 45907191466 cleared two originals, seven population rows, nine tombstones with independent readback; 21 remaining, zero eligible/hard-due/unbound, no unresolved stop. Backup/PITR not verified. No new F/I/T/C IDs, paid calls or production changes. See [checkpoint](checkpoints/2026-11-26_1454_PST_PHASE5B_NO_DUE_EVIDENCE_AND_RETENTION.md).


## Nov26 continuation — I081/T075 Amendment E candidate evidence parity

Exact source audit compared phase5AmendmentEGateOutDelayLabel_v39.ts with phase7ContinuousGateOutTarget_v39.ts and Nov22 adopted scope/Nov20 Packet A/B parity. Earlier candidate could emit a numerical value with reused schedule or frozen PRE original evidence digest despite the downstream distinct-observation requirement. I081 rejects both at candidate stage and preserves real zero, signed early values, null missing and no training authority. T075 also tests the separate conditional schedule revision comparator with zero, negative, below-threshold and same-original POST refusal. No actual numerical production label observed, no new provider or change to adopted endpoint/rights; F029/C003/C004 stay open. Exact CI pending. See [checkpoint](checkpoints/2026-11-26_PHASE5B_AMENDMENT_E_DISTINCT_EVIDENCE_PARITY.md).


## Nov26 continuation — I082/T076 SOURCE-only owner pre-cutover readback

The existing owner pin script only accepts PAUSED and does not check protected environment retention/rolling approval overrides. Actual source route was enabled at 19:47Z; no new pause is appropriate. Extend existing read-only mode to SOURCE_ONLY, require POST off and effective runtime/retention/relay/rolling pins, require new conditional metadata transport disabled/absent pending separate commissioning, withhold unexpected values; no write, dispatch, provider or database access. Existing PAUSED mode retained. T076 tests mocked metadata success/drift/failure. Prior 26709a8d 31/32 green, full offline pending, actual 22:58Z SOURCE no due and all six target lanes success. No new failure ID, no production change. See [checkpoint](checkpoints/2026-11-26_PHASE5B_SOURCE_ONLY_OWNER_READBACK.md).


## Nov26 continuation — I082/T076 test harness correction

Exact 6be1b51a focused run 45908378513 job 140210524327 failed at T076 positive SOURCE_ONLY with jq invalid numeric literal (16/17); negative tests previously accepted any nonzero status and were not meaningful until the positive mock worked. Exported RELAY JSON was overwritten by real readback script RELAY SHA assignment. Namespace all mock values MOCK_*; require each exact mismatch marker and exit 2, metadata failure exit 5, no parse errors or unexpected calls. No change to owner script bytes, production config, paid route or database. Owner command reported HOLD_EXACT_FOCUSED_CI_NOT_PASSED before fetching/reading. Existing I082/T076 retained, F025 fixture recurrence documented; no new ID. Also explicitly include I081 physical candidate test in focused suite (previous focus only included conditional pair); exact full CI separately required. See [checkpoint](checkpoints/2026-11-26_PHASE5B_T076_MOCK_COLLISION_REPAIR.md).


## Nov26 15:09 PST — actual owner readback and I083/I084

Owner census 23:04:07Z and final SOURCE_ONLY readback passed exact d50b6a7d focused 45908621799 job 140211313967 (17/17 node, 163/163 Vitest, 12/12 tsx), 512 prepared/92 reservations/52 timely bindings/292 elapsed unreserved/128 future/zero linked PRE, all effective target/relay/retention approvals and pins passed. No additional database write or paid receipt. Relay 45908690260 actual pre-POST self-identity defer, no target dispatch, later immutable fields match but historic mismatching field unknown. I083 relay #31 6c6cbd36 65/65 exact 45908958296; no deployment. I084 reuses prior owner coordination and verified pin/census/funnel/retention blobs; no legacy route changes, no migration, no paid dispatch. Fresh gap >=130min before planned SOURCE and no active main, STOP/tasks or open unreserved; if cutover stops after target merge, inspect exact stage and do not blindly rerun. Target full exact d50b6a7d 31/32 at inspection; new release CI required. See [checkpoint](checkpoints/2026-11-26_1509_PST_SOURCE_ONLY_SUCCESSOR.md).


## Owner priority and frozen-requirement crosswalk (Nov26 15:20 PST)

Read [the permanent priority and science crosswalk](checkpoints/2026-11-26_1520_PST_RECOVERY_PRIORITY_AND_SCIENCE_CROSSWALK.md) before deciding the next repair. It maps the seven priorities and seven invariants to existing F/I/C/T IDs and actual acceptance evidence. Exact 7251796b target 32/32, relay 6c6cbd36 65/65; owner F040 QUIET_AND_GAP ACTIVE_NO_CANCEL before merge. Actual 23:19Z retention cleared 6 originals/576 population/582 tombstones; 23:20Z cron audit red correctly detected prior self-identity defer, no new F ID. No live mutation from this documentation branch.


## Nov26 15:26 PST coordinated deployment and I085

Owner exact retry successfully merged #977 c2bb8e18 and relay #31 2d96b223; effective SOURCE_ONLY final readback and actual full retention 45910885837 both jobs passed, zero hard due, no provider calls. F040 cutover resolved. C007/C010 deployed; actual independent wake and paid/PRE receipt remain open. I085/T079 staged conditional readiness diagnostic, no new scope/flag change. See [checkpoint](checkpoints/2026-11-26_1526_PST_COORDINATED_DEPLOYMENT_AND_CONDITIONAL_READINESS.md).


## Nov26 15:33 PST actual rolling acceptance and paid-child audit

Six actual new-main workers passed, SOURCE fresh no-due, Day4 preparation not yet due. I086/T080 adds bounded exact owner GitHub paid receipt audit; do not infer billing, DB persistence or PRE from workflow status. [Checkpoint](checkpoints/2026-11-26_1533_PST_PAID_SOURCE_CHILD_AUDIT.md). No paid receipt on new main yet.


## Nov26 15:40 PST real API audit fidelity

I087/T081 fixes exact observed masked step name in actual historical GitHub job 139028362242 and binds count-only marker interpretation to that paid step's clock (GitHub second precision). Explicit follow-on PRE status never certifies actual committed rows. I085/I086 focused CI passed at exact 0bfd3193; I087 exact successor CI required. C007 rolling actual acceptance passed twice; SOURCE no due. See [checkpoint](checkpoints/2026-11-26_1540_PST_PAID_AUDIT_REAL_METADATA_AND_ACTOR_PREFLIGHT.md). Production stays on c2bb8e18 and relay 2d96b223.


## Nov26 15:55 PST actual protected actor checks and POST repair

Actual PRE actor 45913505491 passed lane/proof/publisher, reader readiness and cleanup, paid step skipped; conditional policy and real commit not proved. Actual POST actor 45913523153 failed predependency shell admission; masked exact predicate unknown, cleanup missing tsx confirmed. F042/I088/T082. Exact 02691ff3 prior 9/9 CI passed; successor exact CI required. Actual Day4 signed publication 45913087269 and due retention 45913171519 succeeded. [Checkpoint](checkpoints/2026-11-26_1555_PST_POST_ACTOR_ADMISSION_RECOVERY.md). Do not disable owner SOURCE approval to run POST preflight or replay paid requests.


## Nov26 16:00 PST release and evidence reconciliation

Actual owner 23:58:32Z census: 704 prepared (11/93 cells), 92 reservations/184 SOURCE units reserved, 52 historical timely bindings, 292 elapsed unreserved, 320 future, zero open, zero linked PRE and unresolved STOP. Day4 T24/T6/T90 64 each confirmed, 192 added. Paid child audit inspected sole current-main child, nonpaid actor-only; no new paid receipt. Nine live Day2 originals with 864 members, zero native shape and zero PRE, expire naturally; no historical recovery or deadline extension. Previous exact dc99e800 10/10 passed. F042/I089/T083 repairs analogous SOURCE cleanup dependency defect found by code inspection, no live SOURCE recurrence inferred. F040/F026 I090/T084 reuses tested cutover guards for target-only #979, no redundant relay merge. Main has 84 I IDs, candidate prior 88; count registry membership separately from active production. Latest 90 I, 84 T, 42 F, 10 C; no new F this session. [Checkpoint](checkpoints/2026-11-26_1600_PST_DEPLOYMENT_AND_FAILURE_RECONCILIATION.md).


Nov26 16:05 PST: actual next independent primary relay 45914569144 and target retention 45914591567 both jobs success; 3 originals/288 population/291 tombstones cleared, six live, zero hard due or STOP, private/P7 zero due. Exact source workflow change additionally triggers source child admission and upcoming queue CI; I090/T084 now requires all 12 exact paths including both new relevant workflows (not only previous 10), all first-attempt exact successes. No new F or I/T ID for same change.


I091/T085 F027: owner-only bounded Day3/4 prepared query instruction marker census before next T24. Does not read provider Contents, print private packets or certify signatures/commissioning. Exact current packet scope is the missing evidence; if absent, never rewrite frozen already-signed query, commission only a future unsigned day under existing adopted scientific/rights review. No new F.


## Nov26 16:12 PST F043 actual SQL parity repair

Owner I091 twice SQLSTATE 42601, zero paid calls/writes. Prior exact 22f49ed3 CI 12/12 green but mocked SQL only. I092/T086 explicit SQL projection/rights and bounded redacted stage/position, real PG16 non-superuser fixture job in same focused workflow. Actual owner retry only after actual PG16 test passes. No change to paid workflow, sampling, policy or retention. Current production unchanged. [Checkpoint](checkpoints/2026-11-26_1612_PST_OWNER_SQL_PARITY_REPAIR.md).


Nov26 16:19 PST actual PG16 T086 job140235264481 / focused job140235264627 passed on bd6315a6, owner retry corrected blob 30fadfbd608860a059bcc09a17cfd904a0f025de pending. Actual rolling 45915940213 and six children passed. SOURCE parent 45915957841 job140235111164 acknowledged all four due children 45916017872/45916019790/45916022655/45916024425, zero deferred/missed, no parent provider or DB writes; actual children running, not paid receipt. F042 additional operational coupling found: isolated POST job reads global process arm despite no paid capability, unlike already successful SOURCE actor-only explicit local disarm. I093/T087 corrects only POST actor-only projection to local 0; actual original failed predicate remains masked. No paid job or global variable changes. No new F beyond F043.


## Nov26 16:47 PST actual conditional instruction and policy candidate

F043 resolved actual owner corrected audit 00:47:29Z: 384/384 Day3/4 retained instructions ledger/hash/clock parity, 0 conditional markers, 320 future, 0 invalid/unavailable, zero calls/writes. F027 actual commissioning gap confirmed; no rewrite of signed Day3/4. Day5 next unsigned per 00:39Z actual prep receipt, first 11/29 15:45Z, opens 03:45Z. I094/T088 exact three-policy candidate assembler requires existing private bytes and separate exact approved decision, independent actual public admission, no install. F025 same CI class lint failure 45916151587 fixed. See checkpoint. SOURCE active eight children 4+4 ACK, no actual paid receipt yet.


## Nov26 17:13 PST — exact CI and prospective plan binding

Exact 28e86964 all 12 PR workflows successful. Latest failed workflow census since 20Z: 11 superseded PR CI failures (shared compile, PG16 fixtures, shell mock, lint) and actual POST actor preflight F042, no repeat paid SOURCE failure in that result. Earlier relay 45910297117 correctly flagged actual pre-POST defer 45908690260 on 91888916; newer relay 2d96b223 actual 01:08Z rolling 45920825433 and 01:04Z primary 45920425090 passed. Target 45920445644 both retention jobs actual success; zero live/eligible/hard-due FIDS, no deletion STOP, zero due P7 links/bundles/fragments, no PITR proof. 45920845931 current protected preparation actual next Day5 still ABSENT, zero due/missed, 720 min lookahead/20 min lead, first 11/29 15:45Z. 4 more SOURCE children ACKed/in progress 01:09Z, not acquired originals. I095/T089 candidate-only plan-clock and complete remaining-service binding; no changed signed plan, runtime route, keys, budget, provider call or database mutation. Exact current production unchanged. F43 I95 T89 C10. See [checkpoint](checkpoints/2026-11-26_1713_PST_EXACT_CI_AND_PROSPECTIVE_PLAN_BINDING.md).

## Nov26 17:51 PST — first T6 wave and I096/T090

[Checkpoint](checkpoints/2026-11-26_1751_PST_FIRST_T6_RECEIPTS_AND_CUTOVER_STATE_SIMPLIFICATION.md). F017 actual 2 no-content and 2 timely reported, zero native PRE on both positive children; owner cutover safe hold. I096/T090 correct terminal-history false hold and fresh STOP/task scan; no new F, exact successor CI required.

## Nov26 20:29 PST — eight-wave actual SOURCE evidence and slot denominator

[Checkpoint](checkpoints/2026-11-26_2029_PST_EIGHT_WAVE_SOURCE_NO_CONTENT_AND_PERMANENT_CENSUS.md). F017 actual 16/32 no-content, 16/32 timely reported, zero native PRE on all positives; I097/T091 fixed classification and terminal-audit sampling, I098/T092 slot denominator and same-transaction parity. Prior 0e94d05d 12/12 green; new exact CI pending. No production change.


## Nov26 20:45 PST — actual run-to-slot custody and local archive hold

[Checkpoint](checkpoints/2026-11-26_2045_PST_OWNER_SLOT_RECEIPT_AND_POLICY_CUSTODY.md). Owner 04:44:57Z exact 32 distinct run receipts, 32 reserved, 16 bound timely; actual HUB YSSY and MID_B LFQQ each 8/8; MID_A KBUF and REGIONAL NZNP each 0/8, prior no-content logs. No cause or billing inference. F003/F017 actual scope narrowed; F005/F027 still open, archive verification 0 does not establish missing policy secrets. I099/T093 durable exact selected run reconciliation in same read-only transaction, real PG16 fixture; exact successor CI required. No new F/C, no deployment or provider call.


## Nov26 continuation — next T24 prearm and prospective policy transition

[Checkpoint](checkpoints/2026-11-26_PHASE5B_T24_PREARM_HISTORY_AND_POLICY_TRANSITION_AUDIT.md). Four additional actual F017 no-content children at 04:45–05:00Z; 20 total inspected red SOURCE cases, no new family. Current capacity deferral observed without missed/stopped receipt. I100/T094 bounded parallel all-attempt history read and partial-ACK stale denominator, not a confirmed live root cause. Exact prior e0e92a62 focused/PG16 passed, 11/12 CI at inspection. Day3 T90 and Day4 T24 overlap prearm; no existing >=130min safe deployment gap before T24. Conditional policy transition must verify prior signed T24 registry digest continuity and activation clock (future conditional scope can block native preflight); no guessed keys, digest rewrite, or relaxation. P2/P3 remain open. F43 I100 T94 C10.
