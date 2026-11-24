#!/usr/bin/env bash
# Reconcile the exact known nonpaid ACK-readback incident at 06:19Z.
# No provider, policy/secret changes, unknown attempt replay or new spending scope.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
OLD="$(gh variable get P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC -R "$R")"
[[ "$OLD" =~ ^2026-11-24T05:23:[0-5][0-9]\.000Z$ ]] || { echo HOLD_P6_ACK_INCIDENT_UNEXPECTED_EXISTING_EPOCH; exit 2; }
phase=before
hold(){ echo "HOLD_P6_ACK_INCIDENT_RESUME_$1" >&2; exit 2; }
v(){ gh variable get "$2" -R "$1"; }
setv(){ gh variable set "$2" -R "$1" --body "$3" >/dev/null && [[ "$(v "$1" "$2")" == "$3" ]]; }
pin(){ [[ "$(gh api user --jq .login)" == HKcode22 && "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$S" && "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" == "$LS" ]]; }
cleanup(){
 local rc=$?
 if [[ "$phase" == activating ]]; then
  set +e
  setv "$L" TRAVNR_RELAY_ROLLING_ENABLED 0
  setv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false
  setv "$R" P6_PRIVATE_POST_PARENT_ENABLED false
  setv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 0
  echo P6_RESUME_PAID_PAUSE_ATTEMPTED_NO_REPLAY
 fi
 exit "$rc"
}
trap cleanup EXIT
[[ $# == 1 && "$1" == OWNER_APPROVES_KNOWN_NONPAID_ACK_RECONCILIATION_AND_NORMAL_RESUME ]] || hold CONFIRM
pin || hold MAIN
[[ "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 &&
   "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_TICK &&
   "$(v "$L" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 1 &&
   "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$S" &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$OLD" &&
   "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$OLD" &&
   "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 &&
   "$(v "$R" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
   "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == true &&
   "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == true &&
   "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 1 &&
   "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == true ]] || hold EXISTING_CONTROL_DRIFT
# Exact prior wave terminal and two known, successful nonpaid children.
for id in 45338237273 45339530888 45339535374 45339597180; do
 gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null || hold EXISTING_RECEIPT
done
gh api "repos/$R/actions/runs/45339488814" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .conclusion=="failure" and .path==".github/workflows/phase6-direct-recovery-tick.yml"' >/dev/null || hold INCIDENT_ID
gh api "repos/$R/actions/runs/45338237273/jobs?per_page=100" | jq -e 'any(.jobs[]; .name=="direct-protected-recovery-tick" and .conclusion=="success" and any(.steps[]; .name=="Direct outcome TERMINAL_PARENT_ACKS_RECONCILED" and .conclusion=="success"))' >/dev/null || hold PRIOR_TERMINAL
gh api "repos/$R/actions/runs/45339530888/jobs?per_page=100" | jq -e 'any(.jobs[]; .name=="protected-main-one-day-nonpaid" and .conclusion=="success" and any(.steps[]; .name=="Prepare and publish at most one eligible independently reviewed future day" and .conclusion=="success"))' >/dev/null || hold DAILY_CHILD
gh api "repos/$R/actions/runs/45339535374/jobs?per_page=100" | jq -e 'any(.jobs[]; .name=="reviewed-existing-queue-watchdog" and .conclusion=="success")' >/dev/null || hold WATCHDOG_CHILD
log="$(gh run view 45339488814 -R "$R" --job 138259437012 --log)"
[[ "$(grep -c '"status":"DISPATCH_ATTEMPT_BEFORE_ACK"' <<< "$log")" == 2 &&
   "$(grep -c '"status":"EXACT_ACK_NOT_EXECUTION_PROOF"' <<< "$log")" == 2 &&
   "$(grep -c '"lane":"DAILY_PREPARE","status":"EXACT_ACK_NOT_EXECUTION_PROOF"' <<< "$log")" == 1 &&
   "$(grep -c '"lane":"PRE_RECOVERY","status":"EXACT_ACK_NOT_EXECUTION_PROOF"' <<< "$log")" == 1 ]] || hold EXACT_NONPAID_ACKS
grep -q 'HOLD_P6_ROLLING_SESSION_ACK_READBACK_UNAVAILABLE_NO_REPLAY' <<< "$log" || hold ACK_READBACK_REASON
# Freeze only the rolling trigger while checking its complete settled history.
# Retention independent PRIMARY stays enabled.
setv "$L" TRAVNR_RELAY_ROLLING_ENABLED 0 || hold RELAY_PAUSE
phase=activating
h="$(gh api -X GET "repos/$R/actions/runs" -f branch=main -f "created=>=$OLD" -F per_page=100)"
# Reconcile only relevant controller/collection history; unrelated CI and
# independent retention do not block a prospective restart.
jq -e --arg s "$S" '
 .total_count==(.workflow_runs|length) and
 all(.workflow_runs[] |
   select(.path|IN(".github/workflows/phase6-direct-recovery-tick.yml",
   ".github/workflows/phase6-rolling-controller-bounded-session.yml",
   ".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",
   ".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",
   ".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml",
   ".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",
   ".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",
   ".github/workflows/phase5-cd-github-bounded-pre-tick.yml",
   ".github/workflows/phase6-private-later-enrollment.yml",
   ".github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml",
   ".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml"));
   .head_sha==$s and .run_attempt==1 and
   (.id==45339488814 or
    (.conclusion=="success" or .conclusion=="skipped")) and
   (.path|IN(".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml")|not))
' <<< "$h" >/dev/null || hold NEW_TARGET_HISTORY
h="$(gh api -X GET "repos/$L/actions/runs" -f branch=main -f "created=>=$OLD" -F per_page=100)"
jq -e --arg s "$LS" '.total_count==(.workflow_runs|length) and all(.workflow_runs[]|select(.name=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT"); .head_sha==$s and .run_attempt==1 and (.conclusion=="success" or .conclusion=="skipped"))' <<< "$h" >/dev/null || hold NEW_RELAY_HISTORY
for status in queued in_progress waiting pending requested; do
  active="$(gh api "repos/$R/actions/runs?branch=main&status=$status&per_page=100" --paginate --jq '.workflow_runs[]|.path')"
  if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller-bounded-session|phase5-source-upcoming-queue-main-scheduled-readonly|phase5-one-signed-day-source.*|phase5-one-signed-future-post.*)\.yml$' <<< "$active"; then hold ACTIVE_COLLECTION_RECONCILE; fi
done
census(){
node <<'P6_RO'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
 const r=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) AS cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS d2,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) AS claims,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) AS indexes",["a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e","cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9"])).rows[0];
 await c.query("ROLLBACK"); console.log(JSON.stringify(r));
 if(!r.correct_db||!r.read_only||!r.primary||r.auth!==1||r.cost!==1||r.source!==0||r.rest!==0||r.stops!==0)throw Error("LIVE_POLICY_GENESIS_NOT_EMPTY");
 }finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_T24_POLICY_CENSUS",e.code||e.name);process.exitCode=2;});
P6_RO
}
census
pin || hold MAIN_DRIFT
dispatch(){
 local wf="$1" before ids
 shift
 before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2 || return 1
 for n in $(seq 1 30); do
  ids="$(gh run list -R "$R" --workflow "$wf" --event workflow_dispatch --limit 15 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")" || return 1
  if [[ -n "$ids" ]]; then [[ $(wc -l <<< "$ids") == 1 ]] || return 1; printf '%s\n' "$ids";return 0;fi
  sleep 3
 done
 return 1
}
# Explicit forward epoch for exact reconciled nonpaid children. No old run replay.
new="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
gh issue comment 413 -R "$R" --body "Owner authorizes prospective normal restart at $new after exact known nonpaid ACK-readback failure 45339488814; previous direct 45338237273 terminal; actual daily 45339530888 and watchdog 45339535374 success; two exact nonpaid ACKs, no unknown paid dispatch in complete epoch history, fresh zero physical/STOP census. Prior epoch $OLD preserved. No retrospective Day1 acquisition." >/dev/null || hold LEDGER
phase=activating
setv "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$new" || hold TARGET_EPOCH
setv "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC "$new" || hold RELAY_EPOCH
setv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 1 || hold POST_PRODUCER
setv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true || hold SOURCE
setv "$R" P6_PRIVATE_POST_PARENT_ENABLED true || hold POST
id="$(dispatch phase6-direct-recovery-tick.yml -f confirm=RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO -f approved_main_sha="$S")" || hold DIRECT_DISPATCH_UNCERTAIN
echo P6_NEW_DIRECT_RUN="$id"
timeout 660 gh run watch "$id" -R "$R" --exit-status || hold ACTUAL_DIRECT_FAILED_NO_REPLAY
j="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
mark="$(jq -er '([.jobs[]|select(.name=="direct-protected-recovery-tick" and .conclusion=="success")]|if length==1 then .[0].steps else error("DIRECT_JOB") end)|[.[]|select(.conclusion=="success" and (.name|IN("Direct outcome TERMINAL_PARENT_ACKS_RECONCILED","Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED","Direct outcome PREFLIGHT_HOLD_NO_POST")))]|if length==1 then .[0].name else error("DIRECT_DISPOSITION") end' <<< "$j")" || hold DIRECT_DISPOSITION
gh api "repos/$R/actions/runs/$id/artifacts" | jq -e --arg n "p6-direct-terminal-$id" '.total_count==1 and .artifacts[0].name==$n and .artifacts[0].expired==false and (.artifacts[0].digest|test("^sha256:[a-f0-9]{64}$"))' >/dev/null || hold DIRECT_RECEIPT
# Existing relay explicitly understands a known pre-POST HOLD and can try
# the next prospective wake; a red/unknown attempt cannot be auto-replayed.
echo "P6_DIRECT_DISPOSITION=$mark"
pin || hold PIN_DRIFT
setv "$L" TRAVNR_RELAY_ROLLING_ENABLED 1 || hold RELAY_ENABLE
phase=done
echo P6_AUTONOMOUS_NORMAL_ROLLING_ENABLED
echo P6_KNOWN_0619_NONPAID_ACK_INCIDENT_RECONCILED_NO_REPLAY
