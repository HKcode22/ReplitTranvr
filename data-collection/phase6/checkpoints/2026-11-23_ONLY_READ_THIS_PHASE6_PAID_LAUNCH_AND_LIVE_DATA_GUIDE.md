# CURRENT — Nov23 20:46 PST: normal rolling resumed, no owner action now
Owner resume terminal P6_AUTONOMOUS_NORMAL_ROLLING_ENABLED. Do NOT repeat resume helper or any prior command. New prospective epoch 2026-11-24T04:44:55Z. Actual main direct run [45328532136](https://github.com/HKcode22/ReplitTranvr/actions/runs/45328532136) terminal, four ACKs and four verified terminal, zero pending, four calendar-deferred, 95 GitHub requests, artifact 14891046397, digest sha256:0f7dafc7574b936b5c281fb93ff55a314af475390311cece86fe89d97a7096d6. Independently inspected real worker steps and logs: daily 45328572061 NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE (missed Day1 disclosed); PRE watchdog 45328576101 actual reaper executed; early draw 45328579467 NO_DUE_FUTURE_DRAW_AT_DB_CLOCK next Day3; retention 45328582332 NO_OVERDUE_REFERENCES (838 verified refs, zero overdue). Owner pre-resume database 04:44:54Z auth=1 cost=1 source/rest/stops=0 D1=0 D2=4 claims/indexes=0. Last independently observed external rolling pulse 45327772079 was before resume, skipped while paused; next autonomous pulse and predecessor handoff still to be observed. Primary relay last observed success 45327311501. 
Recommendation: continue original bounded normal automation; do not modify main, policy, secrets, clock epoch or retention while functioning. Not a paid acquisition receipt. Next verify first external pulse, next successful direct successor, Day2 signed preparation before its deadline (first request Nov24 19:45 PST; actual minimum lead shown 20 minutes, conservative operational check by 16:45), then actual SOURCE original and timely PRE/POST receipts. Daily no-eligible is not publication proof; lookahead limits apply. D1 missed T24, no committed draw, T6/T90 exception undeployed; never count as recovered or backfill. Avoid jeopardizing normal calendar with a new main repin to salvage one day. Any separate prospective exception must preserve frozen sites, exact remaining cutoffs, original planned denominator and no retrospective labels. No additional owner command unless concrete unresolved failure or impending cutoff is evidenced.
 
---
 
# CURRENT — Nov23 20:36 PST: L PASSED; only normal resume remains
Do not rerun A–L, reinstall the policy, shorten 59 days to 50, reopen Gates 1–8 or change main. Current installed daily digest c477bb71588352d76383b887cae10c35c02cb4a7fe445cedf8ecda0ac2fe8664, transport b57c503b9d7bfc06ff45e25955eaedf65e8ea3402f3e2c7ab1396428913efeaf. Actual 31-calendar 59/60/61/70 admission test passed; actual T24 45327608266 NO_DUE and daily 45327618316 NO_ELIGIBLE pass. Owner census 04:36:40Z auth=1 cost=1 source/rest/stops=0 D1=0 D2=4 claims/indexes/packets=0. Retention 45327338616 and primary relay 45327311501 green. Rolling relay 45327772079 skipped while paused. No paid receipt. Normal schedule still prospective for Day2 onward. Original Day1 T24 missed; separate late draw exception not deployed; do not claim Day1 T6/T90 recovered by normal resume.

## Single remaining owner action
Use [resume-only helper](p6_20261123_resume_after_59day_policy_pass_owner.sh), blob `5f9a3c77cb23326bf6e7819180454ab13ad7d8b8`, argument `OWNER_APPROVES_RESUME_EXISTING_FROZEN_PHASE6_PAID_CALENDAR`. Reuses L receipts and original owner GO; no secrets, policy, schema, new approval gate, or redundant test dispatch. Reconcile known pre-POST failure 45326507493 and relevant new history, independently check no unresolved paid work, then reenable original normal routes, dispatch one first prospective direct tick and resume external rolling when exact terminal, known-active or explicit safe no-POST receipt exists. Safe pre-POST hold may continue at next existing pulse; unknown attempts cannot. No independent retention interruption. If fail, do not rerun; preserve logs and identify actual stage. No automatic paid replay or broadened spending. 
Owner requested no more repetitive commands, no added gates. Retain only actual scientific/cost/rights/retention/duplicate controls; address incidental compatibility limits via one reviewed maintenance successor after launch rather than repinning tonight. This header supersedes historical instructions below.
 
---
 
# CURRENT — Nov23 after J pre-write HOLD

**J stopped before all mutation:** owner terminal `HOLD_P6_T24_LANE_REPAIR_ORIGINAL_OWNER_ARTIFACT_ABSENT`. The historical local G12 key/request/encrypted artifact path is unavailable. This does NOT invalidate the actual missing T24 policy lane field diagnosis or indicate another worker failure. J has no secret writes, no new workflow dispatch, no changed epoch, no reenabled routes. Retention run 45325582469 remains successful. Do not repeat J, H, I or the old G12 installer. 

## J2 — fresh four-policy correction without old local artifacts

New owner-only request uses a fresh X25519 key generated locally and an authenticated AES-256-GCM envelope. Only the existing four linked policy values are transferred to the owner encrypted; no provider keys, database credentials or private signing keys are read by the seal workflow. Owner calculates exact one-lane correction locally; original frozen main and all other scientific policy fields retained. The local request directory is preserved for reconciliation, not printed contents. One owner request push, one seal workflow, no need for the old artifact. Then the same fresh DB zero-genesis/physical/STOP check, four narrow writes, actual T24 no-due and linked prep validation, original normal-calendar direct controller attempt; external rolling reenabled only on actual successful custody outcome. No Day1 exceptional registration deployed.

~~~bash
cd ~/workspace
bash <<'P6_FRESH_T24_REPAIR'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=f4449b972e0bbfe811e05e5b8820b38d5eb72e68
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_FRESH_T24_POLICY_CORRECTION_AND_PROSPECTIVE_RESTART
P6_FRESH_T24_REPAIR
~~~

Expected P6_FRESH_POLICY_ENVELOPE_SELFTEST_PASS, P6_FRESH_OWNER_SEAL_RUN, P6_ACTUAL_T24_CORRECTED_NO_DUE_PASS and final P6_T24_POLICY_REPAIRED_ACTUAL_WORKERS_AND_DIRECT_WAVE_PASS_AUTONOMOUS_NORMAL_ROUTES_RESUMED. If HOLD paste output, do not rerun: new local directory and request are retained for recovery. Paid collection not yet proven. All original and prior content retained below.

---

# CURRENT — Monday Nov23 after 8:18 PM PST

**I PASS. Actual later PRE and Day2 no-due preparation passed; no repeats A–I.** Fresh 04:12:25Z DB D2 draw=4 index=0 SOURCE/REST/STOP=0. Latest #966 all 11 CI green. Exact T24 runtime error now reproduced from installed repository policy: **missing nativeLaterReview.maximumT24ExecutionLanes**. [45325433100](https://github.com/HKcode22/ReplitTranvr/actions/runs/45325433100) all other static checks passed, absent field, hypothetical one-lane correction PASS. No production-main change, no DB credential/retention/budget/cutoff change. [New exact incident checkpoint](2026-11-23_EXACT_T24_MISSING_LANE_POLICY_ROOT_CAUSE_AND_NARROW_REPAIR.md).

## Command J — exact policy repair and actual normal restart
Use existing authenticated G12 local owner artifact; this is NOT repeating G12. Narrow helper verifies the missing field and only writes four linked repo policy values, after fresh zero-genesis/physical/STOP check. Temporarily pauses only nonpaid preparation during linked write; independent retention remains. Then actual main T24 and linked prep verification. On success records prospective epoch and tests original direct controller wave; rolling enabled only after actual successful outcome. No direct provider GET by shell; future native signed routes may spend original approved cap after enable. If HOLD, report stage and do not repeat J. If actual prep publishes, review actual receipt (not failure) and continue without replay.

~~~bash
cd ~/workspace
bash <<'P6_T24_POLICY_REPAIR'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=4bbbf326bf94c7f79f20a98bdc181d7f40e7123f
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_MISSING_T24_ONE_LANE_POLICY_AND_PROSPECTIVE_NORMAL_RESTART
P6_T24_POLICY_REPAIR
~~~

Expected P6_ACTUAL_T24_CORRECTED_NO_DUE_PASS, P6_ACTUAL_LINKED_DAILY_POLICY_NO_DUE_PASS, P6_T24_POLICY_REPAIRED_ACTUAL_WORKERS_AND_DIRECT_WAVE_PASS_AUTONOMOUS_NORMAL_ROUTES_RESUMED. Day1 late draw remains separate, no backdate. Day2 normal still prospective.

All original and prior content preserved below.

---

# CURRENT — Nov23 after 8:01 PM PST

**H partial progress, DO NOT REPEAT.** Fresh owner 04:00:25Z auth=1 cost=1 SOURCE=0 REST=0 STOP=0 D1=0 D2=4 index=0 and V0108 no due/STOP; 16 protected literal writes acknowledged. Actual T24 run 45323393757 passed scheduler admission and npm but failed worker with generic HOLD_P6_CURRENT_T24_REDACTED_NO_REPLAY. H stopped before later PRE, Day2 preparation, audit pin reconciliation or direct root; paid pause attempted. No new epoch. Latest observed external rolling skipped, retention passed. Exact T24 cause not known. Do not change credentials, policy or SHA on guesses. No need to rewrite sixteen values.

Read the new standalone [incident postmortem and regression contract](2026-11-23_PHASE6_LAUNCH_INCIDENT_POSTMORTEM_AND_REGRESSION_TEST_CONTRACT.md) before further engineering. It records failures, dates, why previous testing missed them, future tests and safe simplification. PR #966 diagnostics-only (prior revision 11/11 CI green, updated T24 runtime diagnostic and full positive synthetic startup fixture in CI); PR #965 earlier 6/6 green; both draft and not deployed. 

## Next owner action — I: independent Day2 prep and later PRE readiness
These nonprovider routes are independent. No change to paid flags/epoch; no repeat of T24 failed job. Existing signed lookahead may correctly return no eligible day; not an index proof. Later worker may return empty due or actual failure, neither prevents Day2 from being checked. Fresh read-only DB summary afterward. 
~~~bash
cd ~/workspace
bash <<'P6_INDEPENDENT_DAY2'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=9b97d59dc6e568c42e05d73217c495769ad78014
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP"
P6_INDEPENDENT_DAY2
~~~
Expected markers DAY2_NONPAID_PREP_RUN=..., LATER_PRE_NONPAID_TEST_RUN=...; report actual dispositions and day2_index, not green-only. No provider GET. If dispatch uncertain do not repeat; check actual run. No paid enable from this command. Day1 T24 64 planned opportunities elapsed Mon 3:45–7:30 PM PST; Day1 T6/T90 tomorrow still exceptional, not deployed. Day2 first T24 Tue 7:45 PM, conservative prep check before 4:45 PM. Tomorrow not yet safe. 

All previous guide content retained below; A–H are historical. 

---

# CURRENT INCIDENT UPDATE — November 23, approximately 7:51 PM PST

**G failed at second T24 admission; do not repeat G, F or prior commands.** [Run 45321496617](https://github.com/HKcode22/ReplitTranvr/actions/runs/45321496617/job/138200886569) failed at Separate STOP-default T24 current registry scheduler before npm or DB; G printed PAID_PAUSE_RECHECK_ATTEMPTED_NO_REPLAY. Actual relay 45322009431 skipped after pause; retention 45322139110 success. No paid SOURCE/POST child since restart in observed history. Changing PRE_STOP alone did not repair admission. Values in runner logs masked; cannot identify exact false literal from generic bash test. Root cause of repeated troubleshooting: prior code CI fixtures assumed correct literal settings; 31-value policy check did not check every effective native scheduler value, successful actor-only PRE test bypassed real T24 and later scheduler shell gates, name census did not prove values, previous GO verified writes but not actual controller wave. Existing names PRE_ARMED/PREPARE_ARMED were not rewritten in E because present. Direct controller and PRE both require the global paid and literal approvals; do not infer exact failing secret until runtime proof. No provider attempt from this failed job.

**Engineering change:** [draft PR #966](https://github.com/HKcode22/ReplitTranvr/pull/966) contains diagnostic-only shell changes for T24/later/enrollment/watchdog and named direct-admission failures (no actual secret values), test every literal mismatch and actual workflow shell, no weakened semantics. CI pending. Main not changed because signed runtime binds exact c8. PR #965 latest six CI all passed, not deployed; not a production recovery. These are runtime failures, not evidence all CI failed.

## H — reconcile known literal settings in one operation and prove real controller before rolling resume

Run the helper below. It reuses G's incident evidence, fresh DB/V0108 check and existing no-provider routes; does not repeat actor-only preflight or old failed runs. Unlike G, reconciles the whole approved protected literal admission set (PRE_STOP=0, PRE_ARMED/PREPARE_ARMED=1, reviewed feature and custody approvals, global freeze/rights/budget/owner/arm and direct approval=1) after fresh zero physical attempt and zero unresolved STOP readback. No credential, policy, source bytes or signing-key changes. Existing signed calendar and budget unchanged. Verifies actual new T24/later no-provider workers, Day2 prep (no-due valid), conditional audit-only SHA fix, then explicit new prospective epoch after reconciled history. Starts ONE original direct controller on unchanged main with native normal routes enabled and rolling still paused. Only if actual terminal/known-active custody outcome and artifact are observed does it restore rolling. No blind retry, paid parent pause attempted on failure. Future signed workers can spend original approved cap; no direct provider call in owner helper.

~~~bash
cd ~/workspace
bash <<'P6_LITERAL_RECONCILE'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=9a90bd3ac02a690c5e2e7bba9b029143c71995d9
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_EXACT_LITERAL_CONTROL_RECONCILIATION_AND_PROVEN_NORMAL_RESTART
P6_LITERAL_RECONCILE
~~~

Expected P6_ACTUAL_PRE_GATES_PASS_T24=... LATER=..., P6_FIRST_NEW_DIRECT_RUN=..., P6_ACTUAL_DIRECT_WAVE_VERIFIED=..., P6_ACTUAL_PRE_AND_DIRECT_WAVE_PASS_AUTONOMOUS_NORMAL_ROUTES_RESUMED. If HOLD, paste result, do not blindly retry. Day1 T24 elapsed and no valid retrospective capture. T6/T90 prospective possible only with reviewed late draw and standalone protocol successor, not installed. Day2 original timeline remains; protect independently. Day2 first T24 Tuesday 7:45 PM PST, conservative signed preparation check by 4:45 PM.

## Simplification decision
Do not reopen Gates 1–8 or add a new gate. Retain original provider cap, actual timestamps/cutoffs, signed identity and outcome provenance, retention deadlines, separate restricted roles and no uncertain paid replay. Remove redundant metadata-only readiness claims and make errors actionable. Next release design should isolate independently proven pre-dependency nonpaid admission failures to their own lane rather than poison entire controller epoch; a successful retention/early-draw/day-preparation lane must not be held merely by unrelated PRE no-side-effect admission. Existing controller planP6RollingTick blocks all due on any HOLD and direct negativeHistory blocks any route failure across epoch; change requires exact job evidence and reconciliation, not indiscriminate ignore. Do not weaken or remove global uncertainty safety for paid SOURCE/POST, unknown ACK or real retention STOP. No live main re-pin during this incident solely for diagnostic changes. User asked to simplify, not fabricate scientific evidence.

All older instructions preserved verbatim below.

---

# CURRENT INCIDENT UPDATE — Monday November 23, 2026, approximately 7:36 PM PST

Normal calendar activation F-resume at 01:00:52Z succeeded only as configuration. **Actual restart failed. Do not repeat A–F or F-resume.** Main remains c8e065d6; relay c5a8763f. Complete target history after restart through 03:34Z: 17 runs, no paid SOURCE/POST child run; direct root 45302763595 at 01:08:35Z stopped at admission (HOLD_P6_DIRECT_RECOVERY_NO_EXACT_SEPARATE_APPROVAL_OR_CONFLICTING_ROOT, zero artifacts); T24 PRE 45307333953 and later PRE 45307652365 stopped before dependencies/database. No claim of live ledger zero until fresh owner census. Relay 45319734667 at 03:28Z actually DEFER_DIRECT_PRIOR_ATTEMPT_REVIEW_NO_REPLAY; not successful dispatch. Primary retention 45320479563 success; independent private sentinel 45311573986 actual NO_OVERDUE_REFERENCES. Cron audit 45316823576 failure: obsolete 046d relay audit pin, 11 HTTP ACK-only slots plus one HOLD_CRON_MANAGER_RUN_IDENTITY at 02:49Z; actual PRIMARY run 45315135919 on c5 passed. Lease current through Dec19. Compare 046d...c5 ahead 3 behind 0, only relay.mjs/tests. Do not renew cron or change credentials for this incident.

**Leading shared failure hypothesis:** P5_CD_GH_PRE_STOP must be literal 0 for all three failed gates. Direct job log masks its value but shows literal ADB_AUTO_COLLECT=0 and all competing flags blank. Cannot read secret value; do not claim root cause proven until corrected worker gates pass. F did not write that STOP. Fresh DB zero unresolved stops and owner explicit authorization required before scoped protected PRE_STOP=0; no DB STOP resolution, no new rights or budget. Actual PRE tests must pass before normal paid routes resume. Day1 late registration remains uninstalled.

## Command G — run now, reconciled targeted STOP repair

This helper first pauses rolling and paid SOURCE/POST parents and native POST producer (retention stays enabled); validates actual failed run identities and complete history, fresh DB and V0108 expiry census; writes only protected PRE_STOP=0; runs both existing no-provider PRE workers first-attempt and checks exact actual job/step success; attempts existing Day2 nonpaid preparation and verifies receipt; reconciles stale audit-only relay SHA only if exact old value and no environment shadow; repeats live DB/history readback; explicitly records prospective successor epoch and re-enables existing normal paid routes only if all checks pass. A failed check leaves/attempts to leave paid parents and rolling paused. No direct provider acquisition, no replay of failed runs, no new migration. Normal calendar only, future signed workers can spend original approved budget. Prepared not executed.

~~~bash
cd ~/workspace
bash <<'P6_SHARED_STOP_REPAIR'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=8e4ae51f217e23957676a194e4de6b1db86dcff1
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_RECONCILED_SHARED_PRE_STOP_REPAIR_AND_PROSPECTIVE_RESTART
P6_SHARED_STOP_REPAIR
~~~

Expected P6_ACTUAL_PRE_GATES_PASS_T24=... LATER=... and P6_ACTUAL_PRE_GATES_PASS_NORMAL_ROUTES_RESUMED_NO_COLLECTION_PROOF. On HOLD paste exact output, do not replay. Day2 prep can legitimately return no eligible if outside signed window. Must observe actual signed index before Tuesday conservative 4:45 PM PST boundary; first SOURCE 7:45 PM PST. Day1 remains separate PR #965, no deployment. All previous guide retained below.

---

# CURRENT UPDATE — Monday November 23, 2026, 5:00:52 PM PST

**F-resume COMPLETE. Do not repeat A–F or F-resume. Normal signed calendar routes and rolling relay now enabled.** Actual owner receipt P6_EXISTING_PRE_ACTOR_FIRST_ATTEMPT_VERIFIED_NO_REPLAY and P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO; fresh read-only primary neondb clock 2026-11-24T01:00:52.402Z, auth=1, COST_UPPER_BOUND=1, SOURCE=0, other REST=0, STOP=0, Day1 draw=0, Day2 draw=4. Authenticated [owner restart ledger](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7118665193) independently read back. Original failed run remains preserved. New prospective activation epoch 2026-11-24T01:00:52.000Z. Final marker P6_EXISTING_NORMAL_PAID_ROUTES_AND_ROLLING_ENABLED_NOT_COLLECTION_PROOF. No direct paid GET in the command; subsequent signed workers can spend approved budget. SSL warning not fatal; do not change TLS.

**Owner instructions now:** no additional shell write or manual workflow dispatch. Check actual controller/worker receipts after the next rolling pulse; at initial readback the latest rolling run 45301411020 was skipped BEFORE restart (00:58:17Z), and no new post-restart root yet visible. Do not interpret pre-restart skipped run as post-restart failure. Retention remains independent. Existing hourly launch watch observes and reports; does not repair. Day2 nonpaid preparation is scheduled but actual signed index still needs confirmation. Tuesday before 4:45 PM PST verify actual Day2 preparation; first planned Day2 SOURCE Tuesday 7:45 PM PST. No validated Tuesday owner write required at this time.

**Day1:** original missing draw, V0079 late-draw fence and absent standalone later PRE authorization remain. Draft PR #965 not deployed. Normal activation does not fix Day1 T6/T90. Do not modify live main or repin approved policies while collecting merely to insert an unreviewed exception. Preserve missed opportunities honestly. Day2 and later normal days can proceed independently under verified V0093 typed cost release. Continue monitoring actual first root, due-only daily preparation, actual paid original and PRE/POST evidence; no guaranteed captures or numerical target claim.

All original and prior dated instructions retained verbatim below; older commands historical only.

---

# CURRENT UPDATE — November 23, 2026, 4:59 PM PST

**Command F partial success: DO NOT REPEAT F.** Three PRE/T24 approval flags installed; protected ARM temporarily set to 0. Actual existing PRE actor-only [run 45301377341/job 138134468471](https://github.com/HKcode22/ReplitTranvr/actions/runs/45301377341/job/138134468471) SUCCESS: six named readiness steps passed, paid and follow-on steps 3/11/12/13 skipped, alternate job skipped; actual log marker P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO, actorOnly=true, productionProofIssued=false, phase6PaidGo=false. The owner's helper halted at ACTOR_STEPS_NOT_EXACT because GitHub masked the exact expected "PG16" step name as "PG***6". This is an owner receipt-checker bug, not a failed PRE actor or provider attempt. No restart epoch written and no route enabled by F after the HOLD. Preserve the successful preflight, no replay.

## F-resume — run now, no repeated actor dispatch

This is the remaining portion of F, with exact run ID, job ID, first-attempt, head, actor, title, job status, numbered steps and exact observed masked/unmasked alias verified, actual log marker checked, fresh DB read-only reconciliation and complete incident history checked. On success it explicitly records prospective owner restart, preserves original failed run, restores protected ARM=1 and activates existing normal-calendar paid routes and rolling relay. No direct provider GET or new migration. Future workers may spend the existing approved cap. Day1 exceptional recovery is still not deployed.

~~~bash
cd ~/workspace
bash <<'P6_RESUME_NORMAL_RESTART'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=8ca74b9cd84b65cc06b77909960c3a452f54de7f
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_RESUME_VERIFIED_PRE_ACTOR_NORMAL_CALENDAR_RESTART_NO_REPLAY
P6_RESUME_NORMAL_RESTART
~~~

Expected `P6_EXISTING_PRE_ACTOR_FIRST_ATTEMPT_VERIFIED_NO_REPLAY` then `P6_EXISTING_NORMAL_PAID_ROUTES_AND_ROLLING_ENABLED_NOT_COLLECTION_PROOF`. Stop on HOLD; no blind replay. No additional timed command for Tuesday currently validated. Day2 first SOURCE Tue 7:45 PM PST. Day1 T6/T90 remain separate. All previous guide content retained below.

---

# CURRENT — Monday November 23, after successful 4:52 PM PST reconciliation

**Command F: run now if you authorize resuming the original signed paid calendar.** Unlike Commands A–E, successful F **enables existing paid SOURCE/POST routes and the external rolling clock**, so later native/relay pulses may consume the originally authorized provider credits. It makes no direct provider call, no database mutation and no paid worker dispatch itself. It does perform one existing protected PRE actor-only workflow dispatch (no provider, no evidence issuance), a fresh live read-only database reconciliation and explicit owner incident/successor-epoch ledger comment. No existing gates are reopened. No new calendar, budget, rights, reviewer keys, legacy route or standalone missing-T24 protocol. It restores three absent literal reviewed PRE/T24 flags if needed, verifies actual PRE actor preflight and only then enables exact native modes and normal calendar routing. The original failed run is preserved. The original signed policy interval and scientific times do not move. There is **no Day1 late-draw exception installed**: do not expect Day1 T6/T90 to become operational just from F. Protect normal Day2 and later days independently using confirmed V0093 typed cost mode.

~~~bash
cd ~/workspace
bash <<'P6_NORMAL_RESTART'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=82f1fc24cbcc8040e3e9c8889be485c5f5e6a818
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_PROSPECTIVE_NORMAL_CALENDAR_RESTART_AFTER_INCIDENT_NO_REPLAY
P6_NORMAL_RESTART
~~~

Expected protected preflight marker `P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO`, actual new epoch line, and final `P6_EXISTING_NORMAL_PAID_ROUTES_AND_ROLLING_ENABLED_NOT_COLLECTION_PROOF`. If any HOLD or unexpected interruption, stop, paste sanitized output, **do not replay**. Preflight temporarily writes protected ARM=0 with routes paused, then restores prior G13 protected ARM=1 only after successful preflight and fresh zero-attempt reconciliation. If failure before rearm, protected ARM remains off; if failure during route activation, helper attempts to pause rolling/paid parents and protected ARM, not cancel any already-issued child. A successful command is configuration acknowledgment, not proof of acquisition. Exact helper [source](https://github.com/HKcode22/ReplitTranvr/blob/f710036372df589273083bb8120f933b979c9f37/data-collection/phase6/checkpoints/p6_20261123_normal_calendar_prospective_restart_owner.sh). Prepared and blob-readback verified; actual execution and all runner predicates must pass.

Tuesday owner timing: F now tonight, no separate pre-scheduled owner write validated for Tuesday. Day1 T6/T90 remain blocked without separate deployment. Day2 first SOURCE Tuesday Nov24 7:45 PM PST; prepared index must be observed before conservative 4:45 PM preparation deadline. Existing nonpaid prep is autonomous and rolling provides extra pulses if F passes; GitHub schedules are not guaranteed. If no actual receipts, investigate rather than promise automatic collection. The existing launch watch observes status only.

Previous content preserved exactly below; A–E complete, do not repeat.

---

# Current update — Monday Nov23 4:52:58 PM PST

**Command E COMPLETE; do not repeat.** Owner's live PG16 READ ONLY receipt at 00:52:48.199Z: correct primary neondb, enabled_manifest=1, typed_cost_release=1 (exact signed V0093 cost-only envelope), SOURCE attempts=0, other REST reservations=0, unresolved stops=0, Day1 draw=0, Day2 draw=4, Day2 index=0. All ten missing PRE/POST controls restored, five existing controls unchanged; marker P6_EXISTING_NATIVE_PRE_POST_CONTROLS_STAGED_RECONCILED_NO_ROUTE_NO_DISPATCH. The pg SSL future-compatibility warning is not a runtime failure; do not alter the existing TLS settings as part of this incident.

**V0093 correction confirmed LIVE:** Day2 can use the existing signed cost-only cap without fictitious Day1 queries. Do not create STOPPED placeholders merely for budget parity. Preserve the full scientific denominator as missingness. No new migration required for ordinary Day2 operation. Day1's independent V0079 early-draw reservation fence still applies and its separately reviewed late-registration successor remains uninstalled.

All previous guide content preserved below. Do not repeat A–E.

---

# Current update — Monday Nov23, after 4:49 PM PST

**Read this section first; prior guide is preserved verbatim below.** A–D completed; no replay. Paid rolling remains paused. The full paid system is not autonomous for Tuesday yet.

## Command E — run now (not tomorrow morning)
Consolidated exact incident read-only reconciliation + existing native PRE/POST runtime control staging. The helper verifies original direct failure identity and log, absence of terminal artifact, complete main-branch run history since original activation, exact owner GO and prior independent POST actor/policy receipts, then live restricted READ ONLY database census using original owner-local DATABASE_URL. Checks typed cost mode, zero SOURCE/other REST attempts and unresolved STOPs, Day2 four draw rows. Requires existing actor credentials and policy names; does not fabricate hashes or replace credentials. Only if these checks pass, writes missing exact literal native PRE/POST controls to protected environment. No route enable, provider calls, paid dispatch, database write, or new standalone T24-missing approval. Existing values not overwritten. Any HOLD: paste sanitized output and stop.

~~~bash
cd ~/workspace
bash <<'P6_RECONCILE_AND_STAGE_NATIVE'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=32789d80f25bd3ebdab77c09a5f1f2340cffa4b6
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_EXISTING_NATIVE_PRE_POST_ACTOR_STAGING_KEEP_ROUTES_OFF
P6_RECONCILE_AND_STAGE_NATIVE
~~~

Expected `P6_EXISTING_NATIVE_PRE_POST_CONTROLS_STAGED_RECONCILED_NO_ROUTE_NO_DISPATCH`. This is staging, not paid collection proof.

## Important correction: V0093 already supports partial cost allocation
Historical V0082 exact-grid parity applies only to EXACT_SOURCE_GRID. V0093 was actually owner-installed and independently verified Nov12/13, and its COST_UPPER_BOUND mode permits unspent planned source allowance without missing Day1 rows. Thus earlier claims that Day1 missing records necessarily block Day2 are superseded. Command E verifies actual frozen mode/digest live. If confirmed, do not manufacture STOPPED missed query rows just to fill the grid. Original missed template denominator still retained in analysis. Day1 physical reserve V0079 independently retains the strict T24 draw clock; actual Day1 recovery remains separate.

## Verified now
- [PR #965](https://github.com/HKcode22/ReplitTranvr/pull/965), head 891823b4, dedicated signed incident-scope and prospective classifier [CI 45300082519](https://github.com/HKcode22/ReplitTranvr/actions/runs/45300082519) passed. Draft, not deployed.
- Original failure 45293307564 actual log shows exact admission HOLD, before any POST in pinned code; zero artifacts, complete 9-run main history at 00:49Z contains only failed root and known non-provider workflows (retention, draw, prep). No paid parent/child runs seen. Fresh owner DB reconciliation in Command E is required to support a prospective restart.
- Rolling relay 45300114052 skipped; retention continues. No Day2 prepared index receipt yet. Native daily preparation schedule enabled.
- No G13/G9 re-run. No silent epoch reset, no paid route activation until reviewed successor and runtime proof. No new timed owner command yet beyond E now. Tuesday Day1 T6/T90 remain conditional; protect Day2 independently.

---

# Current update — Nov23 4:45:47 PM PST

**Command D COMPLETE; do not repeat.** Owner receipt `P6_STORED_SOURCE_REQUIRED_CONTROLS_STAGED_NO_ROUTE_NO_DISPATCH` with all eleven protected-scope secret write acknowledgments from 00:45:37Z to 00:45:47Z Nov24. No paid route enabled or workflow dispatched by this command. Values remain write-only; this is installation metadata, not end-to-end SOURCE proof.

Current main unchanged. Day2 nonpaid schedule enabled; actual publication pending. Day1 remaining-horizon PR #965 dedicated test passed. Additional implementation finding: V0079 physical reservation SQL independently requires the actual draw timestamp before service start minus 24h30m, even if the query is T6/T90. Application-level exception alone will not work. V0082 requires full planned physical UTC grid parity. Recovery must preserve these database checks for all ordinary days, and a separately reviewed Day1-only successor must account for non-dispatchable missed records without pretending a historical observation. No ad hoc owner SQL, no blanket bypass.

**Owner action right now:** none additional until a validated recovery command exists. Do not rerun D, G13/G9, or previously completed commands. Retention remains enabled and paid rolling paused. All prior guide content preserved below.

---

# CURRENT UPDATE — Monday November 23, 2026, after 4:43 PM PST

**Read this first.** Original guide and earlier instructions are preserved IN FULL below; no earlier command is to be rerun unless expressly called for here. Restored original content from the pre-edit Git revision and verified verbatim. Command C completed, native nonpaid schedule enabled; provider key already restored.

## Command D — run now tonight, not at a future cutoff

Current exact stored SOURCE dispatcher and one-GET worker require 11 specific approval/price/range values that were absent in the owner's prior metadata census. These are distinct from existing static signed policy values. The original signed Day1 plan supplies the exact 240-minute provider range and its evidence digest. The following owner-approved staging helper writes only absent literal controls to the protected runtime environment; it does not overwrite existing values, enable routes, dispatch, spend provider credits or write the database. It checks current main, authenticated owner GO record, prior policy/nonpaid admission receipts, no active paid workers, paused rolling and disabled native paid routes. An ACK is not yet effective runtime proof. No PRE/POST legacy, alternate static transport or standalone protocol hash is fabricated.

~~~bash
cd ~/workspace
bash <<'P6_STAGE_SOURCE_CONTROLS'
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
BLOB=a5a4e5503dd2be29156e54ab2bab01d0e8ac33ba
TMP="$(mktemp --suffix=.sh)"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" OWNER_APPROVES_EXISTING_SIGNED_SOURCE_ACTOR_CONTROLS_ONLY_KEEP_ALL_PAID_ROUTES_OFF
P6_STAGE_SOURCE_CONTROLS
~~~

Expected `P6_STORED_SOURCE_REQUIRED_CONTROLS_STAGED_NO_ROUTE_NO_DISPATCH`. Paste sanitized output. No other timed command validated yet. Do not repeat G13/G9, key restoration or Command C.

## Actual recovery implementation, not only reporting

Draft [PR #965](https://github.com/HKcode22/ReplitTranvr/pull/965) created from exact pinned production main, with new executable Day1 original-plan prospective classifier and tests. Dedicated [offline CI 45299426346](https://github.com/HKcode22/ReplitTranvr/actions/runs/45299426346) SUCCESS. Tests use the actual original 192-template plan and cover future horizon eligibility, exact lead boundary, elapsed-window exclusion and tampering. No production merge/deployment. This is a recovery component, not a complete live repair.

Additional actual code findings: strict early draw and readback clock rejects late Day1; Stage6 full group coverage, Stage7, Stage8, Stage9 and private genesis require explicit recovery semantics. Existing V0082 trigger enforces equality of signed BASE/SPLIT query units on each physical UTC charge date; Day1 T90 and Day2 T24 share Nov25 UTC. Simply dropping missed rows could block otherwise valid Day2. Existing V0079 allows STOPPED rows and reservation requires ACTIVE: investigate full-grid non-dispatchable missed accounting with truthful registration clocks, rather than reduce budget or fabricate old preparation. No unreviewed SQL or policy change. Separate explicit standalone PRE protocol still needed. Controller history contains known pre-dispatch failure; reconcile with fresh no-POST/no-charge/no-overlap evidence and separately reviewed prospective epoch, not rerun attempt 2.

Day1 T6 (Tue 9:45 AM) and T90 (Tue 2:15 PM) still **not operational**; paid rolling paused. Day2 preparation schedule enabled but actual publication pending. The aim is to fix both without shifting the calendar. No new gates.

---

# ONLY READ THIS — Phase 6 current operator guide

**Updated Monday November 23, 2026, 4:35 PM PST (Nov24 00:35Z).** All times below are California PST, including Mountain House, Tracy and San José. This is the current guide. Earlier command blocks were corrupted by a documentation edit and are removed from this version; historical revisions are retained in Git history, not to be executed.

## 1. What to do now

**No additional write command is currently validated.** If the shell is showing a continuation prompt `>` after the old broken command, press Ctrl+C. Do not repeat provider-key recovery or Command C, G13, G9, G12, budget repair or early draw.

- G13 and G9 completed; rolling relay paused after [failed DIRECT_TICK 45293307564](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564). Independent primary retention remains enabled.
- Owner restored budget flag and early-draw approval. [Day2 draw 45295746205](https://github.com/HKcode22/ReplitTranvr/actions/runs/45295746205/job/138115547586) committed four airports.
- Owner read-only census 4:22:46 PM PST: correct primary neondb, source attempts 0, other REST reservations 0, unresolved stops 0, Day1 draw rows 0, Day2 draw rows 4.
- Owner restored original Replit AeroDataBox key in existing protected Actions environment at 4:31:34 PM. Do not repeat. It is not a new credential or a paid receipt.
- **Command C completed**: two existing nonpaid actor approvals installed at 4:34:57–58 PM PST; [actual run 45298328334](https://github.com/HKcode22/ReplitTranvr/actions/runs/45298328334/job/138124278446) passed all protected runtime steps, including policy, signer and restricted DB-clock selection. Actual receipt `NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE`, eligible 0, missing draw 0, too late 0, already indexed 0, provider calls 0, dispatches 0. Day2 was about 27h away; code excludes days beyond signed maximum lookahead. Exact private lookahead not read. Owner enabled native nonpaid schedule and returned `P6_NONPAID_PREPARATION_SCHEDULE_ENABLED_PAID_ROLLING_STILL_PAUSED`. This is successful nonpaid admission, not a prepared Day2 or paid GO.
- Original code, rights, budget, policies and database roles remain commissioned. Missing metadata names are not necessarily missing underlying approvals; never bulk-set optional/legacy/conflicting flags.

## 2. Exact signed FIDS windows

| Study day | Horizon | California PST request window | Planned templates |
| --- | --- | --- | ---: |
| 1 | T-24h | Mon Nov23 3:45–7:30 PM | 64 |
| 1 | T-6h | Tue Nov24 9:45 AM–1:30 PM | 64 |
| 1 | T-90m | Tue Nov24 2:15–6 PM | 64 |
| 2 | T-24h | Tue Nov24 7:45–11:30 PM | 64 |
| 2 | T-6h | Wed Nov25 1:45–5:30 PM | 64 |
| 2 | T-90m | Wed Nov25 6:15–10 PM | 64 |

Each Day1 horizon has 16 departure FIDS templates per airport slot (HUB/MID_A/MID_B/REGIONAL), 64 total, 2 units per attempt, one maximum attempt per template. These are planned calls, not flights, bills, or successful snapshots. Day1 original slots OMAA, OMSJ, SPJC, KDEC remain fixed; no outcome-informed redraw. Day1 service Nov24 4–8 PM PST, Day2 service starts Nov25 8 PM PST. Source records can establish prospective schedule/flight identity and available preflight features. Separate verified PRE and actual-only POST evidence are required for Amendment E; no inferred gate-out labels from FIDS estimates.

**Day1 currently blocked at all horizons**: no committed Day1 draw, no signed daily genesis before the first planned request, rolling paused. Some T24 scheduled slots have elapsed and others are still future at this observation. Do not assert all T24 are already missed or any later slots can execute on existing authorization. Existing whole-day preparation will not select Day1 after its first-request deadline; separate reviewed prospective exception is not implemented. Original runtime binding explicitly left standaloneNoT24ProtocolSha256 null; no forced T6/T90 standalone admission. Never backdate. Day2 independently drawn but preparation not yet published.

## 3. Owner schedule

| When | What YOU do |
| --- | --- |
| Monday now | No additional write command; do not repeat completed recovery. |
| Tonight | No T6/T90 Day1 requests are scheduled tonight; remaining T24 blocked. No paid command authorized. |
| Tuesday 8 AM PST | Optional short read-only status command below; if no Day1 recovery receipt, do not expect T6 to collect. |
| Tuesday 9:45 AM–1:30 PM / 2:15–6 PM | Day1 T6/T90 only if separately reviewed, prospectively admitted recovery is verified; otherwise count missed honestly. |
| Tuesday before 4:45 PM | Conservative Day2 prep verification boundary (3h before first SOURCE; actual signed minimum 15–180 min). Nonpaid schedule is enabled, but GitHub scheduling is not guaranteed. |
| Tuesday 7:45 PM | First planned Day2 SOURCE; paid controller still requires reconciliation and verified activation. |
| Wednesday onward | No recurring owner shell commands approved. Unattended collection not yet proved. |

There is no verified timed paid-reactivation command to run tomorrow yet. Do not use stale commands from earlier guide revisions. No new gates or migrations.

### Optional read-only status command, anytime (no secret values, provider calls, dispatch or writes)

~~~bash
cd ~/workspace
set +x
TZ=America/Los_Angeles date '+%Y-%m-%d %I:%M:%S %p %Z'
gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R HKcode22/ReplitTranvr
gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R HKcode22/TravnrClockRelay
gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R HKcode22/TravnrClockRelay
gh run list -R HKcode22/ReplitTranvr --workflow phase6-nonpaid-source-day-prepare-publish.yml --limit 8
gh run list -R HKcode22/ReplitTranvr --limit 12
~~~

Paste output if needed. No raw secrets, source payloads, private packet bytes or DB URLs.

## 4. Remaining engineering incident work

1. Reconcile exact current-mode SOURCE/PRE/POST and controller configuration against original reviewed approvals; do not re-create original signed policies.
2. Observe genuine Day2 nonpaid scheduled preparation/publication before deadline. Successful no-due-work is not a published index.
3. Implement and review Day1 remaining-horizon exception with original airports, original cutoff windows, actual DB clock, explicit missing denominators and no replay; if impossible, record honest missingness and protect subsequent study days.
4. Reconcile exact failed direct run and downstream history, with no dispatch/charge/overlap evidence; prospective approved successor only, no silent epoch reset or blind rerun. Keep retention active.
5. Verify actual paid SOURCE physical attempt, bound authentic original, actual provider charge, normalized flights, per-horizon cutoff-safe PRE, due POST and actual-only gate-out qualification. Gate14 not yet proved.

Production main c8e065d665ccacb6d2575070e94c5500b7583044; relay c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed. No production change from this guide.

## 5. Evidence and history

- [Day1 signed plan](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json) / [Day2 signed plan](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json)
- [Actual Day2 nonpaid receipt](https://github.com/HKcode22/ReplitTranvr/actions/runs/45298328334/job/138124278446)
- [Original runtime binding review](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md)
- [Original uncorrupted morning guide (historical only, DO NOT EXECUTE)](https://github.com/HKcode22/ReplitTranvr/blob/77e9babc42018e5bd4eabb46bb4b3f90f86992de/data-collection/phase6/checkpoints/2026-11-23_ONLY_READ_THIS_PHASE6_PAID_LAUNCH_AND_LIVE_DATA_GUIDE.md)
- [Completed Day2 command source (DO NOT REPEAT)](p6_20261123_day2_existing_nonpaid_prepare_owner.sh)
- [Incident checkpoint](2026-11-23_DAY1_LAUNCH_INCIDENT_ROOT_CAUSES_AND_PROSPECTIVE_RECOVERY.md)
- [Master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413)

**Hard rule:** any unresolved charge/dispatch, rights, expiry, signature, cutoff, role or budget STOP requires reconciliation. No manual paid override, no made-up timestamps or outcomes. Existing hourly launch watch is monitoring only.


---

# ORIGINAL GUIDE — RESTORED IN FULL FOR REFERENCE

**Historical instructions below are preserved verbatim; current dated instructions above supersede old launch commands. G13/G9 already completed; do not replay.**

# ONLY READ THIS — Monday Nov 23 Phase 6 paid-month launch & live-data guide

**Owner:** HKcode22 · **Local timezone:** Pacific Standard Time (PST, UTC−08:00). Mountain House, Tracy and San José use the SAME local clock.  
**Scope:** The existing signed 31-day Phase 6 experiment in HKcode22/ReplitTranvr. This file is an operator guide, not a new gate, new permission, or change to the study.  
**Prepared from live GitHub at about 3:03 AM PST, Nov 23, 2026.** Read fresh logs at the time you act.

## FIRST: are we GO?

**CONDITIONAL TECHNICAL GO to ATTEMPT the scheduled launch, NOT an unconditional paid GO.** Do not buy data or authorize the month before the fresh Gate 13 checks pass inside the exact window.

- Target production main must be **c8e065d665ccacb6d2575070e94c5500b7583044**.
- External relay main must be **c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed**.
- Gates 1–8 and Gate 12 were already completed. Do **NOT** rerun G12, the one-use installer, the expiry pin repair, G8, migrations, or an additional cron installer.
- The recent expiry pin issue was fixed by the owner. Real full expiry #45152223464 and the heartbeat #45152310334 succeeded. **New live evidence:** native scheduled expiry [#45157544951](https://github.com/HKcode22/ReplitTranvr/actions/runs/45157544951) on c8 at 2:35 AM PST succeeded with BOTH primary-FIDS and Phase7 expiry steps actually executed. Later full external-forwarded retention [#45159601869](https://github.com/HKcode22/ReplitTranvr/actions/runs/45159601869) also executed both jobs successfully. This is better than relying on yesterday's heartbeat, but does not prove future populated-record deletion or never-miss scheduling.
- The latest seen pre-GO Phase 6 private-later enrollment [#45160007426](https://github.com/HKcode22/ReplitTranvr/actions/runs/45160007426) was **SKIPPED**, expected while paid GO is off. A green/deferred rolling relay is not a charged SOURCE.
- Exact original Gates 13 and 9 owner commands below were taken from the current [START HERE approved runbook](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md).
- **Still unproven:** today's live AeroDataBox account balance and permissions at GO, Gate 13 owner authorization, Gate 9 DIRECT_TICK after GO, first protected target SOURCE, real provider bill/original, cutoff-safe PRE, due POST and continuous actual gate-out label. No one can promise 31 flawless days in advance.

**Hard rule:** If a required command prints HOLD, reports a failed required step, misses the signed GO window, or reveals an unresolved provider charge, signing, rights, budget or retention STOP: **do not continue to the next paid step**. Send the nonsecret output for review; do not override or blindly retry.

## Your entire Monday timetable — local California time

| When (PST) | What YOU do | What must happen / what NOT to do |
| --- | --- | --- |
| **Now, around 3 AM, before sleep** | Nothing else required. Optionally run the READ-ONLY preflight below and paste the output; save this guide. | **Do not run Gate 13 or Gate 9, reinstall G12, change main, edit secrets, or buy provider credits.** Existing repair is complete. |
| **After waking, before 1:40 PM** | Open this file, check time and GitHub current pinned SHAs; review the latest expiry/relay jobs using the read-only command below. | The production SHAs must still match. The next real current-main full expiry/backstop must execute required jobs, not merely produce a green skipped shell. Any new real due/deletion/rights/budget issue is a HOLD. |
| **1:40–1:50 PM** | Open the existing authenticated Replit Shell in ~/workspace; verify gh authentication and clock. Have this file ready. | Do not start Gate 13 before 1:50 PM. Do not log provider keys, signed source contents, private packets or DB URLs. |
| **1:50–2:15 PM (preferred)** | Run **COMMAND A / G13** below once, only after the fresh checks it performs are acceptable. | Exact accepted terminal marker: **P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED**. It tests free provider balance **at least 36,740 REST units**, **at least 1,000 Alert credits**, rights, STOP, current SHA, 31 policy, protected POST and V0108 retention. No marker or HOLD = NO GO. |
| **2:15 PM–strictly BEFORE 3:10 PM** | If not yet run, G13 can only be attempted within its original signed window and only with clean prerequisites. Save the result and paste sanitized output. | At **3:10 PM or later**, do NOT run G13 under the expired authority. Do not silently shift study dates or hand-enable paid flags. |
| **3:10–3:45 PM** | Confirm G13 succeeded; observe current GitHub histories only. | Do NOT force an early SOURCE GET, an early DIRECT_TICK or a premature PRE. First source epoch is **3:45 PM**. |
| **3:45 PM or later, ONLY after genuine G13 PASS** | Run **COMMAND B / G9** below once, then check external→target forwarding. | Exact accepted marker: **P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO**. Its success alone is not a paid SOURCE. |
| **Around 4:00 PM, 4:30 PM and later that evening** | Read the relay, target, SOURCE child and DB metadata as described below. Paste run IDs and sanitized aggregate receipts. | Distinguish no dispatch, accepted dispatch, successful target, billed physical GET, stored original, normalized flights, PRE, POST, and true labels. No made-up counts. |
| **Next morning / each study day** | Review budget/incident/expiry and missingness summaries when practical. | Authorized automation is intended to run without your Mac on. Still check failures; a system-level STOP must halt further spending, not be bypassed. |

### READ-ONLY CHECK — now or after waking

Paste in the Replit Shell. This changes no secrets, makes no provider calls and dispatches no workflow.

~~~bash
cd ~/workspace
set +x
printf 'CALIFORNIA: '; TZ=America/Los_Angeles date '+%Y-%m-%d %I:%M:%S %p %Z'
printf 'UTC:        '; date -u '+%Y-%m-%d %H:%M:%S UTC'
gh auth status --hostname github.com
printf '\nTARGET MAIN:\n'
gh api repos/HKcode22/ReplitTranvr/git/ref/heads/main --jq '.object.sha'
printf '\nRELAY MAIN:\n'
gh api repos/HKcode22/TravnrClockRelay/git/ref/heads/main --jq '.object.sha'
printf '\nRECENT TARGET RUNS:\n'
gh run list --repo HKcode22/ReplitTranvr --limit 12 --json databaseId,name,createdAt,conclusion,headSha
printf '\nRECENT RELAY RUNS:\n'
gh run list --repo HKcode22/TravnrClockRelay --limit 10 --json databaseId,name,createdAt,conclusion,headSha
printf '\nNATIVE EXPIRY JOBS:\n'
gh run view 45157544951 --repo HKcode22/ReplitTranvr --json jobs,conclusion
~~~

**Paste back:** local and UTC time, target SHA, relay SHA, recent run list and expiry jobs. **Do not paste** GH authentication tokens or environment variables. Historical red jobs or intentional pre-GO skips are not automatically a new blocker; investigate any fresh current-main regression.

### COMMAND A — exact Gate 13 signed paid-month owner GO

**Only Monday Nov 23 from 1:50 PM PST to STRICTLY BEFORE 3:10 PM PST. Prefer 1:50–2:15 PM.** This authorizes the existing signed budget; it does not itself prove an AeroDataBox charge. Run once; do not repeat after uncertain partial-write/HOLD.

~~~bash
cd ~/workspace

bash <<'P6_OWNER_G13_MONDAY_PAID_GO'
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BLOB="c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517"

TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g13_go_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$BLOB" \
  --jq '.content' | base64 --decode > "$TMP"

test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"

bash "$TMP" \
  OWNER_HKCODE22_APPROVES_EXACT_PHASE6_31_DAY_PAID_GO_UP_TO_36740_API_UNITS_WITH_1900_DAY_CAP_AND_1000_ALERT_FLOOR

P6_OWNER_G13_MONDAY_PAID_GO
~~~

**Accept only:** P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED, with verifiable authenticated scope/ledger evidence. **Any HOLD / partial scope / red required live check / missing marker = STOP**. Paste full **sanitized** status + run IDs into ChatGPT before continuing. Do not expose secrets.

### COMMAND B — exact Gate 9 external DIRECT_TICK recovery switch

**Only at/after 3:45 PM PST AND ONLY if Command A genuinely PASSED.** It enables an existing guarded automatic relay route. This command itself is not a provider GET.

~~~bash
cd ~/workspace

bash <<'P6_OWNER_G9_AFTER_GO_DIRECT'
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BLOB="6871236a9743b3b84f978c9e3cd9042b2aff2161"

TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g9_direct_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$BLOB" \
  --jq '.content' | base64 --decode > "$TMP"

test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"

bash "$TMP" \
  OWNER_CONFIRMS_GATE13_PAID_GO_ALREADY_APPROVED_AND_ENABLED_FOR_SIGNED_MONTH

P6_OWNER_G9_AFTER_GO_DIRECT
~~~

**Accept only:** P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO. Then look for a **new** actual external ROLLING_ROOT→target DIRECT_TICK ACK and the **target job**. If no real target job appears, do not claim autonomy proved or send an unapproved direct provider retry.

## How to SEE results live — which screen and what means what

The production data database is the **existing Neon PostgreSQL 16 database named neondb**, not a replacement database. GitHub Actions show **jobs and sanitized receipts**; Neon shows **durable private source, queue, budget and PRE data**. Replit Shell is for authenticated owner operations and optional read-only inspection; do **not** depend on keeping the browser/terminal open for every automatic worker.

| What you want to see | GitHub / Neon location | What healthy evidence looks like |
| --- | --- | --- |
| **External timer works** | [TravnrClockRelay Actions](https://github.com/HKcode22/TravnrClockRelay/actions), especially ROLLING_ROOT and PRIMARY_BACKSTOP | Correct c5 relay, approved target c8, new target ACK **with target run ID**, not just a green deferred pulse |
| **Protected worker actually ran** | [ReplitTranvr Actions](https://github.com/HKcode22/ReplitTranvr/actions), workflow **Phase6 direct existing-worker recovery** or **Phase6 initial bounded rolling controller session** | Correct c8, actual protected admission steps, existing bounded SOURCE parent/child ACK; not STOP/skipped |
| **FIDS SOURCE queries scheduled** | Neon: **clean.phase5_fids_allowed_query_v39**, **clean.adb_sampling_draw**, **clean.adb_phase6_calendar_day** | Signed selected **run_day_index**, four distinct HUB/MID_A/MID_B/REGIONAL slots, query horizon and its genuine dispatch/cutoff |
| **A physical billable FIDS request was reserved** | **clean.phase5_fids_physical_attempt_v39** and **clean.phase5_fids_utc_charge_budget_v39** | Exact bounded physical attempt and UTC-day reserved units. Reservation is NOT proof the provider actually billed or returned data |
| **Real provider response/original received** | **clean.phase5_fids_original_binding_v39**, **clean.fids_query_response**, SOURCE child job/physical GET settlement ledger | A bound original + response digest + independent provider usage/charge. A missing original after uncertain network timeout is a reconciliation incident, not “free” |
| **Actual flights normalized** | **clean.flight_population** and per-source original binding | Confirmed operating legs linked to authentic original; number of flights need not equal query count |
| **T−24 / T−6 / T−90 PRE** | **clean.phase5_cd_pre_task_v39**, **clean.flight_snapshots**, **Phase6 restartable private PRE enrollment** / Stage14 source-clock checks | Per **horizon** task states and original same-leg proof. VERIFIED_ON_TIME and individual cutoff checks matter; late cannot become on-time |
| **Private signed day packets** | **phase6_private.frozen_native_packet_v39**, **phase6_private.signed_run_day_index_revision_v39**, **phase6_private.signed_run_day_epoch_claim_v39** | Signed approved day/index, lawful TTL; don't expose private packet bytes in logs or chat |
| **POST and actual outcome labels** | **Phase5 one signed future POST v0083** protected reviewer/publisher/storage steps; reviewed private outcome evidence and its DB-linked metadata | Only when due. A real actual gate-out paired with scheduled gate-out may qualify. Revised/estimated/runway times alone do **not** qualify; unknown/not_due/censored is not zero delay |
| **Cost and STOPs** | **clean.phase5_fids_cycle_budget_v39**, **clean.phase5_fids_day_budget_v39**, **clean.phase5_fids_utc_charge_budget_v39**, **clean.adb_incident_stop**, Phase6 safety watchdog | Actual physical UTC-day charge and other reserved categories under **1,900/day**, month signed ceiling, Alert floor and no unresolved hard STOP |
| **Retention/expiry** | [Phase5 primary FIDS expiry workflow](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase5-primary-fids-expiry-no-provider.yml) and full backstop child, **clean.provider_content_blob_ref**, V0108 PG status | **Both** primary-fids-expiry and phase7-expiry step SUCCESS; due rows/deletion STOP reconciled. Empty sweep ≠ populated deletion/PITR guarantee |
| **Tests/probes/canaries** | Workflow name contains **offline**, **NO PROVIDER**, **callback health**, **canary**, **probe**, **READ ONLY** | These check only the exact advertised layer. A green zero-provider test is not a bill, FIDS row, valid T−6 snapshot or real POST |

For SOURCE/flight evidence, always compare **planned queries → actual physical attempts → provider responses → bound originals → normalized flight legs → per-horizon verified PRE → due qualified POST**. Count both the numerator **and denominator**. T−24h/T−6h/T−90m are prediction deadlines relative to an individual flight's frozen scheduled T; they are not three independent airports or guaranteed three samples per flight.

### Optional: safe, aggregate SQL to read in Neon SQL Editor

Use **the existing neondb** and a read-only/restricted auditor identity. These SELECTs return **counts only**, no raw provider contents or flight identities. Some identities may lack permission for a table; a permission error is not permission to weaken production grants. The first table lists estimates; the next queries count actual rows where available. These are **cumulative** unless a specific day/time filter is shown.

~~~sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT current_database() AS database_name, current_user AS role_name,
       clock_timestamp() AS database_clock_utc;

SELECT schemaname, relname, n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE (schemaname = 'clean' AND
       relname IN ('phase5_fids_allowed_query_v39',
                   'phase5_fids_physical_attempt_v39',
                   'phase5_fids_original_binding_v39',
                   'fids_query_response',
                   'flight_population','flight_snapshots',
                   'phase5_cd_pre_task_v39','adb_incident_stop',
                   'phase5_fids_utc_charge_budget_v39'))
   OR (schemaname = 'phase6_private' AND
       relname IN ('frozen_native_packet_v39',
                   'signed_run_day_index_revision_v39'))
ORDER BY schemaname, relname;

SELECT horizon, state, COUNT(*) AS tasks
FROM clean.phase5_cd_pre_task_v39
GROUP BY horizon, state
ORDER BY horizon, state;

SELECT run_day_index, horizon, state, COUNT(*) AS signed_query_rows
FROM clean.phase5_fids_allowed_query_v39
WHERE run_day_index = 1
GROUP BY run_day_index, horizon, state
ORDER BY horizon, state;

SELECT horizon, COUNT(*) AS newly_created_pre_snapshots
FROM clean.flight_snapshots
WHERE created_at >= TIMESTAMPTZ '2026-11-23 23:45:00+00'
  AND prediction_state = 'PRE_DEPARTURE'
GROUP BY horizon
ORDER BY horizon;

SELECT cause, COUNT(*) AS unresolved_incidents
FROM clean.adb_incident_stop
WHERE NOT resolved
GROUP BY cause
ORDER BY cause;

COMMIT;
~~~

**Do not interpret a PRE snapshot count as scientifically qualified PRE.** The independent Stage14 check must also prove correct flight, original provider availability, exact signed T, source expiry/rights, and cutoff. The first SOURCE may be later than 3:45 PM, may return zero flights, or may have no qualified POST yet. A missing PRE before it is due is **not_due**, not a failure.

### Fast GitHub metadata-only monitoring after Gate 9

~~~bash
cd ~/workspace
set +x
gh run list --repo HKcode22/TravnrClockRelay --limit 15 --json databaseId,name,createdAt,status,conclusion,headSha
gh run list --repo HKcode22/ReplitTranvr --limit 25 --json databaseId,name,createdAt,status,conclusion,headSha
~~~

For an exact run number shown above, inspect its JOBS (not only the parent conclusion):

~~~bash
gh run view RUN_ID --repo HKcode22/ReplitTranvr --json jobs,conclusion
~~~

**Replace RUN_ID with a real numeric ID** before running; this is an inspection command, not a dispatch. You can open that run in GitHub → Actions → Jobs → Step logs. Never paste a DB URL, token, full source payload, private packet, or flight identity into a public GitHub comment.

## The 6+6 callback question — what was replaced and what remains

**The old “6+6 callback health” is a historical Phase 3 Gate 4 NEXT2/NEXT3 health-observation workflow. It is not the main Phase 6 SOURCE/PRE/POST control plane or a reason to run twelve callback probes before today's GO.**

The inspected **current c8 workflows** use: GitHub Actions + external rolling/PRIMARY relay; separate **restricted Neon PostgreSQL credentials** such as V39_P5_SOURCE_DATABASE_URL, P6_PRIVATE_READER_DATABASE_URL and P5_V39_PREPARE_DATABASE_URL; durable DB queue/lease; and private same-runner reviewer/publisher/socket handoffs. Generic DATABASE_URL is intentionally blank in several protected GH jobs while the **specific scoped DB secret** is supplied. Direct DB authorization, not a Replit HTTP callback carrying private packets through public Actions, is the primary signed data path.

**Important caveat:** the repository still contains the Replit callback-only service and a **protected AeroDataBox webhook destination guard** for webhook use cases. Not every optional callback/webhook function has been eliminated. Current no-provider preflight success **does not certify** future external webhook delivery, network uptime or the absence of a Replit callback error during a later genuine paid run. Do not try to “fix” that by disabling webhook authentication or changing the signed runtime today.

## What if something is missing while you are away?

The planned **external cron-job.org wake-ups**, detached GitHub relay, bounded chained workers and durable PostgreSQL queue/leases are designed so your **computer and this chat need not stay open**. They are also designed to refuse or STOP certain unsafe actions. They are **not** a mathematical guarantee of punctuality or 100% capture. GitHub-native scheduling has shown historical delays; the independent backstop reduces that risk, not eliminates it.

- **A few missed, cutoff-late or provider-empty SOURCE/PRE results:** preserve the true timestamps, record missingness and keep valid independently qualified flight/horizon pairs. Do **not** backfill a past prediction cutoff or quietly redraw airports.
- **POST not due / actual gate-out unknown:** record not_due or unknown/censored. Never invent zero-minute delay or use an estimate as actual.
- **Ambiguous charge, duplicate GET, broken signatures, wrong SHA, rights/TTL, hard budget, provider usage or deletion STOP:** halt affected collection and reconcile before any retry. This may block later study days.
- **A green relay with no actual protected target receipt:** verify dispatch ACK and target run ID. It proves only the timer layer.
- **A missed G13 deadline:** no retroactive paid GO, no hand-edit of study dates. New launch authority would need a separately reviewed **prospective** schedule.

**Your monitoring obligation:** review receipts when possible, especially after the first epoch and the following morning. You do **not** need to run a manual command every four hours or stay awake all 31 days. But neither ChatGPT nor a success icon can guarantee rescue of a missing past observation. A serious shared STOP needs owner review.

## Exactly what to paste back to ChatGPT (no secrets)

1. **Before launch:** read-only command output: date/time, both SHAs, latest current-main expiry/relay jobs, any new real STOP or skipped execution. Redact tokens.
2. **After Gate 13:** entire **sanitized terminal output**, success/HOLD marker, authenticated run IDs and ledger status. Do not run Gate 9 on anything other than a verified G13 PASS.
3. **After Gate 9:** sanitized marker, relay run ID, target run ID, actual target job and child results.
4. **After the first SOURCE:** sanitized aggregates: physical attempts, billed/settled REST units, originals bound, normalized physical flights, T−24/T−6/T−90 planned/qualified/missed/not_due counts, POST due/qualified/censored, unresolved STOP, TTL/expiry status. Use UNKNOWN rather than fabricated zero.

**Assistant's remaining work after receiving your outputs:** independently check the exact run/job receipts and authorized source/budget/rights/retention state, distinguish a recoverable bounded missing observation from a shared STOP, and advise the next safe step. This guide **does not** authorize anyone to override a live STOP.

## Authoritative original sources — for verification, not a competing instruction set

- [Current START HERE — exact owner command sources](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md)
- [Full Day 1 operations / salvage classification](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_DAY1_PHASE6_PAID_MONTH_OPERATOR_RUNBOOK_GATES_9_14.md)
- [Technical guide: full Gates 1–14, code and architecture](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_PHASE6_GATES_1_TO_14_TECHNICAL_GUIDE_AND_ACCIDENTAL_MAIN_AUDIT.md)
- [Master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413)

**Do not merge this or other documentation into SHA-pinned production main before the launch. This file is on the isolated evidence/documentation branch only.**
