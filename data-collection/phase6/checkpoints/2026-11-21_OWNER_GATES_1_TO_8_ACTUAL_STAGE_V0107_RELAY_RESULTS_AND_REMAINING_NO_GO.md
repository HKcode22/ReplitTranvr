# Phase 6 fixed gates 1–8 — actual owner commissioning, accepted evidence, and remaining blockers

**Checkpoint date:** 2026-11-21 UTC (owner shell observed at approximately 14:41–14:43 UTC).  
**Disposition:** `PHASE6_PAID_GO=false`; no SOURCE authorization, no paid FIDS acquisition.  
**Evidence status:** This is a *review-only checkpoint branch*. **Do not merge this document or any new executable to production main without controlled reviewed main/pin/stage transition.** The actual commissioned disabled stage binds current production main `781140cde71af3b72376c2db9f0fdb84204a2b7c`.

## Governing decisions — not new blockers

- Controlling register: [2026-11-20 fixed Phase 6 gates](./2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md) and master issue [#413](https://github.com/HKcode22/ReplitTranvr/issues/413).
- Exact runnable frozen owner handoff was review-only PR [#933](https://github.com/HKcode22/ReplitTranvr/pull/933), head `ff24033ad2994e854454ee68805e0d1f39232bba`, script Git blob `0272671819bec1827ff65bd21cd6cf9ee91b27f6`. Its six exact-head checks all passed, including full Offline Safety `44914177129` and handoff-contract `44914177194`. The predecessor moving PR #932 is superseded. Do not merge #933 merely to execute the owner script.
- AeroDataBox bounded published-Terms source use remains reviewed in `data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md`: ordinary Contents short-lived; genuine Derived Works separately verified; Article 5.8 identifiers used for identification/linking/retrieval, not copied source training records. No personalized extended-caching exception assumed.
- Amendment E T−6 continuous actual-gate-out target is **conditional**. True same-leg actual-only attestation generates a numerical label when lawfully observed; otherwise explicitly CENSORED. Generic ADB revised/runway/status or ADS-B are not substitutes. Future nonzero numerical labels are **not** a pre-launch blocker.
- Preserved scientific design f.8/A/B/C/D1/D2/E and Monday geometry: 31 days, 6,144 source templates, 36,740 reserved units, maximum 1,280/day, first planned SOURCE 2026-11-23T23:45:00Z, independent authorization before 23:10Z, outcome tail 2026-12-29T04:00:00Z. No unreviewed budget or calendar change.
- No regenerated keypairs, recreated roles, replacement Neon database, vendor replacement, rebuilt legacy stage, or retrospective PRE.

## Evidence from **actually executed** Replit owner handoff

The owner supplied a complete redacted shell transcript (2026-11-21 UTC). The GitHub workflows and production readback jobs below were independently checked.

### Gate 5 — DONE (exact disabled stage)

1. Deterministic existing-stage recovery and reviewed Monday package preparation returned `MONDAY_REVIEWED_PRIVATE_PACKAGE_PREPARED_NO_GO`, review digest `3eb640b6aa44de9c137847da70bee74d0a7d2897d14ad60975726fe6c55a63e1`.
2. The owner actually executed one bounded atomic `DISABLED_STAGE_MOVED_PROSPECTIVELY_NO_SOURCE_NO_PAID_GO` transition. Old cost rows preserved; 31 parent days changed prospectively; authorization stayed disabled.
3. The **independent production database readback passed**: `P6_PROSPECTIVE_DISABLED_STAGE_REVISION_READBACK_PASS_NO_GO` and `GATE5_EXACT_MONDAY_DISABLED_STAGE_AND_ARCHIVED_COST_VERIFIED`.
4. Exact committed new identities:
   - main/code: `781140cde71af3b72376c2db9f0fdb84204a2b7c`
   - stage packet SHA-256: `a4c30369fcb52eb58da2dd12ec0ea9dabb07fe41b171f44fcb766d0408b3f682`
   - cost SHA-256: `ebf61e512a40c03e3bd3be679a83f995645b199f0bbb172f82677e9cb7976f0e`
   - manifest SHA-256: `b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4`
   - config SHA-256: `ee4ec9f6ca3e0f123512c8aa463cadd07a8892a3fedc4c316fe0c1b64731457c`
   - calendar SHA-256: `55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b`
5. These committed stage/cost writes **must not be repeated**; further auditing should use official read-only reconciliation. This checkpoint is not a new stage approval or SOURCE enable.

### Gate 3 — V0107 installed; retention certification still OPEN

- Owner installed V0107 on real production under STOP and obtained `V0107_COMMISSIONED_PROFILE_STILL_DISABLED_NO_GO`, with `committedFunctionReadback=true`, stopped auth/batches/subs/deletion incidents/originals all zero and **two controlled DB function replacements**. Profile: `V0107_VERIFIED_FUTURE_POST_23H_MARGIN`.
- Current-main primary verifier [run 44915274503](https://github.com/HKcode22/ReplitTranvr/actions/runs/44915274503), job 136879435867, returned `PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES` and exact current main/profile, all nine pre-existing hazard counters zero, no provider calls, no DB writes.
- Relay target triggered actual protected production child [run 44915360246](https://github.com/HKcode22/ReplitTranvr/actions/runs/44915360246), job 136879694022. Its log verified `PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED` under `APPLY_DUE_ONLY`, real restricted actors and the V0107 profile. The live/eligible/due original counts were **zero**, so no purge was needed or observed. `backupOrPitrVerified=false`, `completeRetentionDeploymentVerified=false`, `phase6PaidGo=false`.
- **Still required:** physical due-time and failure fencing under genuine work, 24h FIDS/168h ordinary-source deadlines, proactive margin, complete object/backup/PITR/log/restore handling and missed-native-schedule mitigation. No zero-work receipt proves populated-workload physical deletion or 2-minute receipt latency.

### Gate 7 — real relay drift fixed; full autonomous rehearsal still OPEN

- Owner set and read back `P5_PRIMARY_FIDS_DEADLINE_PROFILE`, `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` and the external relay variables `TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID`, `TRAVNR_APPROVED_TARGET_MAIN_SHA`, `TRAVNR_CRON_RELAY_SHA`.
- Real relay [44915339874](https://github.com/HKcode22/TravnrClockRelay/actions/runs/44915339874) executed, returned `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF`, identified target child 44915360246; child later completed SUCCESS and was separately inspected. This **resolves the previous target-main-drift preflight** for that scoped primary wake.
- Before repin, native controller heartbeat [44900124671](https://github.com/HKcode22/ReplitTranvr/actions/runs/44900124671) reported stale schedule observations; external managed-cron audit [44906842652](https://github.com/HKcode22/TravnrClockRelay/actions/runs/44906842652) found 11 HTTP ACKs and one unresolved identity in 12 sampled planned slots. Neither is fixed by relabeling a successful HTTP acknowledgement as verified execution.
- **Still required:** a bounded end-to-end *no-provider* rehearsal of PRE/POST actors, private storage, rolling SOURCE control, budget/STOP paths, native+external schedule continuity and actual target acknowledgement/child execution across required modes. Keep failing cron/heartbeat evidence visible.

### Gate 8 — isolated free account prearm NOT RUN, exact defect located

- The final stage of the owner bulk runner attempted `node review-tools/p6_launch_free_account_prearm_current_v39.mjs`, but this module exists **only on frozen review-only PR #933**, not released production main. The resulting `MODULE_NOT_FOUND` is a packaging/checkout-path error, **not** evidence of an inadequate account balance.
- Verified reviewed prearm script blob on #933: `bf6dff6e0f654836069b4cc289e5c7e750b28213`, standalone Node ESM; requires `AERODATABOX_API_KEY`, and explicitly limits requests to `GET /subscriptions/balance` and `GET /subscriptions/webhook`. It includes no FIDS/source or mutation call. Fetch to a temporary private `.mjs` file with exact Git blob SHA and Node syntax/hash validation, then run with production DB credentials removed, `ADB_AUTO_COLLECT=0`, `V39_PHASE6_PROCESS_ARMED=0`, `V39_PHASE6_OWNER_APPROVED=0`. **Do not rerun Gates 5/3/7 just for this check.**
- The actual free balance/subscription/allowance prearm readback remains pending, as do the exact scoped SOURCE ledger approval and separate paid GO. The current committed ledger `data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json` still contains 29 evidence records and **0 approvals**; blanket owner authorization is not an exact audit-ready entry.

## Fixed eight gates — what IS / IS NOT done now

| Gate | Implemented/verified | What remains | Disposition |
|---|---|---|---|
| **1. Independent PRE** | Native signed producer, restricted role/read transport, full-width flight-identity protections, tests and merged implementation | Actual independently accepted 16-field and purpose-bound reference policy bytes, local signer/reader placement and exact stage-specific commission/readback; disarmed real actor preflight | **IN PROGRESS / NOT COMMISSIONED** |
| **2. Independent POST** | Reviewer/settlement/recovery/transport implemented; Amendment E censoring understood | Exact protected reviewer/reader/publisher roles, policy byte/secret readback and no-provider actor rehearsal | **IN PROGRESS / NOT COMMISSIONED** |
| **3. Retention** | Production V0107 installed; actual current-main primary VERIFY, relay-driven primary child run success with zero live originals | Positive populated-workload hard/proactive deadline, backup/PITR/log/restore custody, operator STOP proof | **IN PROGRESS / FUNCTION UPGRADE DONE** |
| **4. Executable review and merge** | PR #926 merged; scoped technical review accepted and final executable checks passed; #931 Monday decision merged | Separate runtime/source admission still outside Gate 4 | **DONE (SCOPED EXECUTABLE GATE)** |
| **5. Disabled Monday stage** | Actual atomic disabled revision, exact independent stage/cost/archived-original readback | No replay. Subsequent code/main changes require controlled approval/pin transition | **DONE** |
| **6. Protected runtime** | Existing six recovered candidate policy bytes/owner keypairs and static installer implemented | Current Monday six exact reviewed policies + 31 static values + PRE/POST/runtime bindings installed with independent readback | **NOT DONE / BLOCKED ON REVIEWED INPUTS** |
| **7. Autonomous rehearsal** | Actual primary-only relay repin + real protected child execution | Full zero-provider native/relay/clock/actor/budget/recovery rehearsal, stale schedule incident resolution | **IN PROGRESS / PARTIAL** |
| **8. Separate SOURCE admission & paid GO** | Account prearm helper code on PR #933; older account evidence; paid paths remain stopped | Isolated fresh free read, scoped approval ledger, verified source enable/STOP readback, separate paid GO, post-GO first actual SOURCE receipt | **NOT DONE / SOURCE DISABLED** |

## Exact next safe execution order

1. **Only** isolated Gate-8 account prearm using the reviewed #933 prearm script blob and a temporary private file; capture redacted JSON. Do not rerun completed Monday/V0107 commissioning.
2. Review/commission existing Gate-1 PRE and Gate-2 POST independent field, reference, signer, publisher and reader policies; ensure real production credentials are separate and protected. No invented long-lived right from categorical normalization or hashing.
3. Use the already-existing Gate-6 owner six-policy/31-static assembler once with *actual* scoped review decisions and an exact approved SOURCE artifact. Do not fabricate the approval ledger, regenerate keypairs, or install source enable early.
4. Reconcile exact existing primary/rolling native and relay paths; obtain **one** honest bounded no-provider integrated Gate-7 rehearsal and actual readback. Distinguish child success from cron manager ACK-only gaps.
5. Finish the remaining retention/backup/PITR certification, no overwrite of provider-shaped full originals beyond allowed TTL.
6. Only when the scoped SOURCE ledger and all relevant independent production observations are valid, execute existing separate SOURCE enable, verify exact readbacks, then separately authorize paid GO under the existing cap/floor. The first authentic paid SOURCE receipt is post-GO execution proof, not an impossible prelaunch input.
7. Re-evaluate the first SOURCE deadline (2026-11-23 23:45Z) prospectively. If it is missed, preserve study geometry and advance through an explicitly reviewed prospective correction; never backdate or rewrite PRE.

**No new source or paid provider GET, backend/source enable, signer creation, production DB write, workflow dispatch, or main change is performed by committing this checkpoint to a review-only branch.**

## Additional callback publication result — actual Replit status SUCCESS

After the owner's clean current-main synchronization, the connected Replit publish operation was executed once for the existing `ReplitTranvr` app (`d2a063c7-c2c2-4f46-9db4-3a3850d2eb1f`). The connector reported successive `pending`, `building`, `promoting`, and finally **`success`** for the existing deployment `c11d7f04-1b9b-4e39-977a-5fb50138d134`, public URL `https://replit-tranvr--hk84164.replit.app`. This resolves the earlier **publish-operation failure** as of this observation. The .replit runtime stays callback-only, with `ADB_AUTO_COLLECT=false`, and the V5 build wrapper is `scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh`.

Independent GitHub comparison `c3c3050e12c4e327f9c82c35c95f856f3c1cbd20...781140cde71af3b72376c2db9f0fdb84204a2b7c` contains **zero changes in V5 guarded `client/`, `server/`, `shared/` or listed main build inputs**. This is static provenance evidence. The publish API's `success` does **not** independently attest the live HTTP receiver's exact build metadata, signed webhook delivery, raw-before-2xx custody, production database policy or provider balance. A separate public-root fetch was not accessible to the inspecting web client, so HTTP health is **not claimed**. Preserve these remaining Gate-6 acceptance limits; do not republish again solely to turn an API success badge into callback-science proof. No paid SOURCE enable or GO was performed by publishing.

## 2026-11-21 14:59:51 UTC — Gate 8 fresh account prearm and Gate 6 public health PASS (owner attested)

The owner supplied direct Replit Shell output after the frozen owner handoff. **No local script-file upload/download is required going forward; avoid long heredocs, which pasted corruptly and left a shell `>` continuation.** Use two short `gh workflow run` commands for the next independent no-provider checks instead.

- Exact reviewed account helper was verified from PR #933 Git blob `bf6dff6e0f654836069b4cc289e5c7e750b28213`: `P6_ACCOUNT_SCRIPT_VERIFIED_BLOB` matched.
- Published callback-only root: `PUBLIC_CALLBACK_ONLY_HEALTH_GET_PASS_NOT_SOURCE_PROVENANCE`; `GATE6_PUBLISHED_ROOT_HEALTH=PASS`. This is health-only, **not** callback provenance/signature/payload acceptance proof.
- Exact provider result: `v39.phase6.launch-free-account-prearm.v2`, `FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER`, observed `2026-11-21T14:59:51.546Z`.
- `apiUnitsLimit=60000`, `apiUnitsRemaining=59968`, `requestsRemaining=239965`, `alertCreditsRemaining=1830`, `balancesStable=true`, `activeBillableSubscriptions=0`, `totalSubscriptionRecords=0`.
- Account operation reported **3 free reads, 0 paid GET, 0 mutations, 0 SOURCE FIDS calls, 0 DB writes, no source contents retrieved, paid GO false**.
- `GATE8_FREE_ACCOUNT_PREARM=PASS`. This **closes the fresh account prearm subcheck**, NOT Gate 8 exact scoped approval ledger, SOURCE enable, or paid GO.
- User's subsequent pasted text was corrupted near `doneeep...` and left an interactive `>` shell prompt. This corruption is a *shell input/quoting* problem, not a database/provider failure; Ctrl+C returns to normal prompt. Do not rerun Gate 5, V0107 or the full frozen bulk runner.

Remaining next nonpaid operational checks: the existing main-only `phase6-private-transport-two-login-readonly-manual.yml` (Gate 2 private reader/publisher restricted ACLs) and `phase6-direct-recovery-tick.yml` with `VERIFY_DIRECT_RECOVERY_CLOCK_NO_PROVIDER_NO_DB_NO_DISPATCH` (Gate 7 direct clock read-only), each pinned to current main. Native direct recovery verify requires `P6_ROLLING_DIRECT_RECOVERY_ENABLED != 1`; if protection is already enabled, do not bypass it. These are not a substitute for actual PRE/POST commissioning or full autonomous rehearsal.

## 2026-11-21 15:08:18–15:08:43 UTC — independent actual two-login and direct-clock readbacks PASS

These are the user's two new **actual GitHub workflow dispatches on current production main** (not review-only synthetic CI).

1. [Run 44917566057](https://github.com/HKcode22/ReplitTranvr/actions/runs/44917566057), **Phase6 private transport credentials — main-only real READ ONLY**: both jobs SUCCESS, independently inspected job logs:
   - `verify-reader` job `136886347488`: `P6_PRIVATE_READER_GITHUB_READONLY_PASS`, restricted login `phase6_private_reader_login_prod20261115`, group `phase6_private_frozen_reader_v39`, `readOnly=true`, `packetRowsRead=0`, `providerCalls=0`, `databaseWrites=0`, `phase6PaidGo=false`.
   - `verify-publisher` job `136886347667`: `P6_PRIVATE_PUBLISHER_GITHUB_READONLY_PASS`, distinct login `phase6_private_publisher_login_prod20261115`, group `phase6_private_frozen_publisher_v39`, `readOnly=true`, `packetRowsRead=0`, `providerCalls=0`, `databaseWrites=0`, `phase6PaidGo=false`.
   - **Gate 2 restricted private two-login production ACL/readback subcheck CLOSED.** This does not commission POST outcome reviewer/private signed publisher role processes or settle an authentic POST, because both packet tables were empty. No source or paid GO.
2. [Run 44917568249](https://github.com/HKcode22/ReplitTranvr/actions/runs/44917568249), **P6 DIRECT RECOVERY VERIFY**, job `136886356282`, SUCCESS: exact head, checkout and reviewed main all `781140cde71af3b72376c2db9f0fdb84204a2b7c`. Real read-only verdict `ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO`.
   - All eight **existing** route workflow metadata states marked `active`: SOURCE_POST, PRE_ENROLLMENT, T24, LATER_PRE, DAILY_PREPARE, PRE_RECOVERY, EARLY_DRAW and RETENTION_MONITOR.
   - Six negative-history conclusion categories queried, zero matching failed/cancelled/timed-out/action-required/stale/neutral existing worker runs within that probe's exact search scope; `complete=true`. **Does not erase earlier native heartbeat/managed-cron incidents**, which remain part of separate control-plane proof.
   - Exact Monday first SOURCE `2026-11-23T23:45:00.000Z`, first-wave templates `4`; parent observation admitted `2026-11-23T22:15:00Z` through `23:30:00Z`; total 6,144 source templates, 1,448 distinct request waves, maximum eight at one instant, maximum 48 in a 90-minute window, simulation source-per-tick eight, in-flight cap 24.
   - **Simulation caveat:** with external 10-minute ticks and [2,4]-minute jitter, hypothetical cooldown **10 min** / parent **1 min** / tail 6 min admitted **6044** and missed **100**; **8 min** / 1 min / 6 min admitted **6144**, missed 0; **8 min** / 12 min / 6 min admitted **6044**, missed **100**; **8 min** / 5 min / 10 min admitted **6144**, missed 0. This is *predictive/offline arithmetic*, not evidence actual 31-day capacity or that source will run. Do not relax timeout/cap/retry fencing to hide these missed-wave scenarios. First-window nominal external ticks 22:18, 22:28, 22:38, 22:48, 22:58, 23:08, 23:18, 23:28 UTC.
   - Output explicitly `actualCapacityOrCadenceProven=false`, `githubReads=38`, `providerCalls=0`, `databaseReads=0`, `databaseWrites=0`, `dispatches=0`, `phase6PaidGo=false`. The protected recovery job **did not run** (skipped), correctly; no paid actor/call or full autonomous rehearsal.
   - **Gate 7 actual direct clock metadata/plan subcheck CLOSED; full Gate 7 remains OPEN** for real autonomous native/external cadence, source/PRE/POST no-provider actor/readiness, budget/STOP, protection against stale schedule and end-to-end recovery.
3. No production main change occurred as a result of these read-only checks, and no Gate 5 staging, V0107 upgrade or private-role creation should be replayed.

## Gate 7 follow-up: the eight-minute versus ten-minute cooldown is a **real mode distinction**, not a proven fix

Direct inspection of **current main** `server/lib/disruption/phase6RollingGithubController_v39.mjs`, `assessP6RollingRoute` (near lines 146–151), establishes `const cooldown=directRecovery===true&&route.minutes===10?8:route.minutes`. Therefore:
- **Direct recovery mode** uses an eight-minute tolerance for routes configured for a ten-minute cadence, while preserving active-run exclusion, original one-query/database/cutoff gates and job evidence.
- **Ordinary rolling mode** still uses a full **ten-minute** cooldown on ten-minute routes; the direct recovery script's favorable 6,144/6,144 eight-minute simulation is **not proof** that an ordinary-root 10-minute run has the same throughput.
- `tests/phase6_direct_recovery_tick_v39.test.mjs` explicitly asserts this distinction. Do not silently modify the scientific calendar or claim the direct-recovery scenario is today's enabled source scheduler. The actual direct recovery workflow was **VERIFY-only**; protected recovery was skipped because `P6_ROLLING_DIRECT_RECOVERY_ENABLED` was unset.
- The direct clock simulation's **100 missed under 10m cooldown or 12m parent runtime** is a conditional worst-case warning, **not** an actual missed flight or an accepted prelaunch throughput guarantee. Gate 7 must measure runner/child latencies and review the already-designed recovery/no-overlap mode under real no-provider session evidence. Any change to executable controller bytes after Gate5 requires a controlled main/disabled-stage rebind and scoped review, never a stealth patch.
- Existing safe preparatory independent workflow for actual GitHub three-hop **no-provider** handoff: `.github/workflows/phase5-autonomous-clock-canary-no-provider.yml`, `mode=ROLLING_REHEARSAL`, `handoff_confirm=REHEARSE_THREE_ROLLING_SESSIONS_NO_PROVIDER_NO_DB`, exact main, private random 32-hex chain, hop 0/parent 0, UTC deadline +30m. This rehearses actual GitHub relay/read-only preview/ACK chain, **not** paid SOURCE or real DB actor, and is a Gate-7 *partial* check. The 45-minute sustained variant is not requested here.
- Existing safe Gate3 metadata sentinel: `.github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml`, exact main, `READONLY_PRIVATE_RETENTION_METADATA_NO_PROVIDER_NO_DELETE`; prior owner already installed a dedicated five-column production role `phase5_retention_reader_prod20261114` per #413 comment 6889036985 and first recurring observation #413 comment 6906032340. This is **not** new role installation or an object deletion; any overdue response is a STOP, not a retry cue.
