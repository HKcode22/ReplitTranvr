#!/usr/bin/env bash
# Resume exact normal-calendar prospective restart after proven actor receipt. Day1 exception is NOT installed.
# Owner confirmation authorizes existing signed paid routes after no-provider preflight.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
OLD=2026-11-23T23:45:00.000Z
W=phase5-one-signed-day-source-child-dispatch.yml
hold(){ echo "HOLD_P6_NORMAL_RESTART_$1"; exit 2; }
[[ $# == 1 && "$1" == OWNER_APPROVES_RESUME_VERIFIED_PRE_ACTOR_NORMAL_CALENDAR_RESTART_NO_REPLAY ]] || hold OWNER_CONFIRM
pin(){
 [[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
 [[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
 [[ $(gh api "repos/$L/git/ref/heads/main" --jq .object.sha) == "$LS" ]] || hold RELAY_MAIN
}
pin
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING_NOT_PAUSED
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$OLD" ]] || hold RELAY_EPOCH_CHANGED
[[ $(gh variable get P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC -R "$R") == "$OLD" ]] || hold TARGET_EPOCH_CHANGED
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ROUTE -R "$L") == DIRECT_TICK ]] || hold RELAY_ROUTE
[[ $(gh variable get TRAVNR_RELAY_DIRECT_TICK_APPROVED -R "$L") == 1 ]] || hold RELAY_APPROVAL
[[ $(gh variable get P6_ROLLING_DIRECT_RECOVERY_ENABLED -R "$R") == 1 ]] || hold DIRECT_ENABLE
[[ $(gh variable get P6_ROLLING_CONTROLLER_ENABLED -R "$R") == 1 ]] || hold CONTROLLER_ENABLE
[[ $(gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R") == true ]] || hold DAILY_PREP
[[ $(gh variable get TRAVNR_ROLLING_POLICY_FROM_UTC -R "$L") == "$OLD" ]] || hold POLICY_FROM
[[ $(gh variable get TRAVNR_ROLLING_POLICY_UNTIL_UTC -R "$L") == 2026-12-29T04:00:00.000Z ]] || hold POLICY_UNTIL
[[ $(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$L") == "$S" ]] || hold RELAY_TARGET
gh api "repos/$R/issues/comments/7115092142" | jq -e --arg s "$S" '.user.login=="HKcode22" and (.body|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body|contains($s))' >/dev/null || hold ORIGINAL_GO
gh api "repos/$R/actions/runs/45293307564" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .conclusion=="failure"' >/dev/null || hold INCIDENT_ID
[[ $(gh api "repos/$R/actions/runs/45293307564/artifacts" --jq .total_count) == 0 ]] || hold INCIDENT_ARTIFACT
log="$(gh run view 45293307564 -R "$R" --job 138107310909 --log)"
grep -q 'HOLD_P6_DIRECT_RECOVERY_NO_EXACT_SEPARATE_APPROVAL_OR_CONFLICTING_ROOT' <<< "$log" || hold INCIDENT_LOG
unset log
# Native source and post routes must be off during role preflight.
switches=(P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED P6_NATIVE_POST_PRODUCER_ENABLED P6_PRIVATE_LATER_ENROLL_ENABLED P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED P6_PRIVATE_T24_ENROLL_ENABLED P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED P6_PRIVATE_T24_EXECUTION_ENABLED P5_CD_GH_T24_SCHEDULE_ENABLED P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED P5_CD_GH_PRE_SCHEDULE_ENABLED P5_CD_GH_WATCHDOG_ENABLED)
legacy=(P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED P5_T24_AUTO_DISPATCH_ENABLED P5_LATER_PRE_AUTO_DISPATCH_ENABLED P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED P6_PRIVATE_SOURCE_PARENT_RO_ENABLED P6_ROLLING_SCHEDULED_ROOT_ENABLED P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED P6_ROLLING_WINDOW_CUSTODY_ENABLED)
modes=(P6_PRIVATE_SOURCE_REVIEW_MODE P6_NATIVE_LATER_RUNTIME_ENABLED P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED P5_CD_GH_PRE_MODE P6_T24_CUSTODY_ENABLED)
names="$(gh api "repos/$R/actions/secrets?per_page=100" --paginate --jq '.secrets[].name')"
en="$(gh api "repos/$R/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name')"
allnames="$names"$'\n'"$en"
for k in P6_ROLLING_SESSION_APPROVED P5_CD_GH_PHASE5_CANARY_APPROVED P5_CD_GH_STANDALONE_LATER_APPROVED P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256 P5_CD_GH_PRIVATE_LATER_APPROVED; do
 if grep -qx "$k" <<< "$allnames"; then hold "UNEXPECTED_ALTERNATE_SCOPE_$k"; fi
done
required=(AERODATABOX_API_KEY P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64 P6_PRIVATE_POST_REVIEWER_KEY_BASE64 P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED P6_PHASE7_PRE_PROOF_ISSUER_APPROVED P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED P6_ROLLING_DIRECT_RECOVERY_APPROVED P5_CD_GH_PRE_STOP V39_P5_SEVEN_REST_BUDGET_SIGNED P6_NATIVE_LATER_RUNTIME_APPROVED P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED P6_PRIVATE_POST_PARENT_APPROVED P6_NATIVE_POST_PRODUCER_APPROVED)
for k in "${required[@]}"; do grep -qx "$k" <<< "$allnames" || hold "MISSING_EXISTING_$k"; done
repo_vars="$(gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv')"
env_vars="$(gh api "repos/$R/environments/$E/variables?per_page=100" --paginate --jq '.variables[].name')"
relay_env_vars="$(gh api "repos/$L/environments/travnr-target-forward/variables?per_page=100" --paginate --jq '.variables[].name')"
v(){ awk -F '\t' -v k="$1" '$1==k{print $2}' <<< "$repo_vars"; }
for k in "${switches[@]}" "${legacy[@]}" "${modes[@]}" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC P6_ROLLING_DIRECT_RECOVERY_ENABLED P6_ROLLING_CONTROLLER_ENABLED P6_NONPAID_SOURCE_SCHEDULE_ENABLED P5_CD_GH_BURST_TICKS; do
 if grep -qx "$k" <<< "$env_vars"; then hold "ENV_VARIABLE_SHADOW_$k"; fi
done
for k in TRAVNR_RELAY_ROLLING_ENABLED TRAVNR_RELAY_ROLLING_SINCE_UTC TRAVNR_RELAY_ROLLING_ROUTE TRAVNR_RELAY_DIRECT_TICK_APPROVED; do
 if grep -qx "$k" <<< "$relay_env_vars"; then hold "RELAY_VARIABLE_SHADOW_$k"; fi
done
for k in "${switches[@]}" "${legacy[@]}"; do
 case "$(v "$k")" in ""|0|false) ;; *) hold "UNEXPECTED_ENABLED_$k";; esac
done
case "$(v P5_CD_GH_BURST_TICKS)" in ""|1) ;; *) hold BURST_DRIFT;; esac
quiet(){
 for status in queued in_progress waiting requested pending; do
  p="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
  if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post|phase5-cd-github|phase6-private-later-enrollment)' <<< "$p"; then hold ACTIVE_COLLECTION; fi
 done
}
history(){
 local actor_id="$1" x
 x="$(gh api "repos/$R/actions/runs?branch=main&created=%3E%3D2026-11-23T23%3A45%3A00Z&per_page=100")"
 jq -e --arg id "$actor_id" '.total_count==(.workflow_runs|length) and all(.workflow_runs[]; (.id==45293307564 or (.id|tostring)==$id or .path==".github/workflows/phase5-primary-fids-expiry-no-provider.yml" or .path==".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml" or .path==".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml"))' <<< "$x" >/dev/null || hold UNRECONCILED_HISTORY
}
quiet
# Reuse the actual successful first-attempt owner preflight. Never dispatch it again.
id=45301377341
job=138134468471
D=e7123cd513a009e0e0d3e24e3aaa844dd5916dd63bae279fb952ce9526b03ee8
history "$id"
gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" --arg d "$D" '.id==45301377341 and .head_sha==$s and .head_branch=="main" and .event=="workflow_dispatch" and .run_attempt==1 and .actor.login=="HKcode22" and .path==".github/workflows/phase5-one-signed-day-source-child-dispatch.yml" and .display_title==("P5 SOURCE "+$d) and .status=="completed" and .conclusion=="success"' >/dev/null || hold ACTOR_RUN_IDENTITY
for k in P5_CD_GH_E_ROUTE_FEATURES_APPROVED P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED P6_T24_CUSTODY_APPROVED; do
 grep -qx "$k" <<< "$en" || hold "ACTOR_CONTROL_NOT_PRESENT_$k"
done
jobs="$(gh api "repos/$R/actions/runs/$id/jobs?filter=latest&per_page=100")"
# GitHub masked the 1 in PG16 in step 11. Check exact job ID, step numbers,
# six exact successful readiness names, and all four nonexecuted paid/follow-on
# steps. Accept only the observed masked alias or original unmasked step 11.
jq -e --arg s "$S" '
 .total_count==2 and (.jobs|length)==2 and
 ([.jobs[]|select(.id==138134469973 and .name=="exact-reviewed-source-child" and .conclusion=="skipped")]|length)==1 and
 ([.jobs[]|select(.id==138134468471 and .name=="exact-private-source-existing-one-get-child" and .conclusion=="success" and .status=="completed" and .head_sha==$s and .run_id==45301377341 and .run_attempt==1)]|length)==1 and
 ([.jobs[]|select(.id==138134468471)|.steps[]] as $steps |
  def exact($n;$name;$out): ([$steps[]|select(.number==$n and .name==$name and .status=="completed" and .conclusion==$out)]|length)==1;
  ($steps|map(.number)|unique|length)==($steps|length) and
  exact(3;"Reject unfinished release BEFORE accessing provider or SQL";"skipped") and
  exact(4;"Admission for real actor preflight ONLY (no paid capability)";"success") and
  exact(7;"Preflight independent PRE lane role (no provider, no DB writes)";"success") and
  exact(8;"Preflight independent PRE proof role (no provider, no DB writes)";"success") and
  exact(9;"Preflight independent PRE publisher role (no provider, no DB writes)";"success") and
  exact(10;"Validate native PRE publication readiness BEFORE SOURCE (NONPAID)";"success") and
  (exact(11;"Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child";"skipped") or exact(11;"Authenticate real private PG***6 signed index and query, then ORIGINAL one-physical-GET child";"skipped")) and
  exact(12;"Independently read actual committed native candidates (NONPAID, no signing)";"skipped") and
  exact(13;"Review and publish later PRE using existing private registry (NONPAID, separately approved)";"skipped") and
  exact(14;"Stop private PRE role processes and verify scratch cleanup";"success")
 )' <<< "$jobs" >/dev/null || hold EXISTING_ACTOR_STEPS_NOT_EXACT
log="$(gh run view "$id" -R "$R" --job "$job" --log)"
grep -q 'P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO' <<< "$log" || hold NO_ACTUAL_PRE_READINESS_RECEIPT
unset log
echo P6_EXISTING_PRE_ACTOR_FIRST_ATTEMPT_VERIFIED_NO_REPLAY
echo P7_NATIVE_PRE_CONFIGURATION_AND_RESTRICTED_WRITER_READER_READY_NO_GO
pin
quiet
history "$id"
# Fresh production read-only reconciliation after actor-only run.
node <<'P6_RO'
const {Client}=require("pg");
const m="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e",cost="cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9";
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
 const r=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) AS cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS d2",[m,cost])).rows[0];
 await c.query("ROLLBACK"); console.log(JSON.stringify(r));
 if(!r.correct_db||!r.read_only||!r.primary||r.auth!==1||r.cost!==1||r.source!==0||r.rest!==0||r.stops!==0||r.d1!==0||r.d2!==4)throw Error("LIVE_RECONCILIATION_HOLD");
 }finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_RESTART_DATABASE",e.code||e.name);process.exitCode=2;});
P6_RO
# Record explicit prospective restart with the failed predecessor preserved.
# No silent epoch advance. New epoch is actual current time, original policy from/until unchanged.
new_epoch="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
[[ $(date -u +%s) -lt $(date -u -d '2026-11-25T00:45:00Z' +%s) ]] || hold DAY2_PREP_DEADLINE_REVIEW_FIRST
gh issue comment 413 -R "$R" --body "PHASE6 OWNER PROSPECTIVE NORMAL CALENDAR RESTART AUTHORIZATION: original failed run 45293307564 remains preserved, exact admission failure before dispatch and zero artifacts, complete post-GO history verified, fresh live readonly PG16 auth=1 COST_UPPER_BOUND=1 SOURCE=0 REST=0 STOP=0 Day1 draw=0 Day2 draw=4, protected PRE-only actor run $id PASS, original owner G13 comment 7115092142. Old epoch $OLD; separately authorized successor epoch $new_epoch; main $S relay $LS. No replay, no standalone missing-T24 approval, no change to calendar, cost or rights. This is restart authorization, not a paid receipt." || hold OWNER_RESTART_LEDGER_UNKNOWN
pin
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold RELAY_DRIFT
# Stage exact mode flags before enabling any execution lane.
setv(){ gh variable set "$1" -R "$R" --body "$2" >/dev/null; [[ $(gh variable get "$1" -R "$R") == "$2" ]]; }
setv P6_PRIVATE_SOURCE_REVIEW_MODE stored
setv P6_NATIVE_LATER_RUNTIME_ENABLED 1
setv P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED 1
setv P5_CD_GH_PRE_MODE PHASE6_APPROVED
setv P6_T24_CUSTODY_ENABLED 1
setv P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$new_epoch"
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L" --body "$new_epoch" >/dev/null || hold RELAY_EPOCH_WRITE_UNKNOWN
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$new_epoch" ]] || hold RELAY_EPOCH_READBACK
# On failure during activation, attempt to pause paid paths; never cancel or replay an already issued child.
activating=1
cleanup(){
 local rc=$?
 if [[ "$rc" != 0 && "${activating:-0}" == 1 ]]; then
  set +e
  gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 0 >/dev/null
  gh variable set P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED -R "$R" --body false >/dev/null
  gh variable set P6_PRIVATE_POST_PARENT_ENABLED -R "$R" --body false >/dev/null
  gh secret set V39_PHASE6_PROCESS_ARMED -R "$R" -e "$E" --body 0 >/dev/null
  echo HOLD_P6_ACTIVATION_PARTIAL_PAUSE_ATTEMPTED_RECONCILE_NO_REPLAY
 fi
 exit "$rc"
}
trap cleanup EXIT
# Restore exactly the previous G13 protected ARM, then enable only existing normal mode.
gh secret set V39_PHASE6_PROCESS_ARMED -R "$R" -e "$E" --body 1 >/dev/null || hold PROTECTED_REARM_UNKNOWN
setv P6_PRIVATE_LATER_ENROLL_ENABLED 1
setv P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED 1
setv P6_PRIVATE_T24_ENROLL_ENABLED 1
setv P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED 1
setv P6_PRIVATE_T24_EXECUTION_ENABLED 1
setv P5_CD_GH_T24_SCHEDULE_ENABLED 1
setv P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED 1
setv P5_CD_GH_PRE_SCHEDULE_ENABLED 1
setv P5_CD_GH_WATCHDOG_ENABLED 1
setv P6_NATIVE_POST_PRODUCER_ENABLED 1
# These two may cause paid dispatch via existing native schedules; signed workers
# still enforce exact original prospective query/POST, physical date and budget.
setv P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true
setv P6_PRIVATE_POST_PARENT_ENABLED true
pin
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION_DRIFT
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 1 >/dev/null || hold RELAY_ENABLE_UNKNOWN
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 1 ]] || hold RELAY_ENABLE_READBACK
activating=0
echo "P6_NORMAL_CALENDAR_PROSPECTIVE_RESTART_ENABLED_EPOCH=$new_epoch"
echo P6_EXISTING_NORMAL_PAID_ROUTES_AND_ROLLING_ENABLED_NOT_COLLECTION_PROOF
