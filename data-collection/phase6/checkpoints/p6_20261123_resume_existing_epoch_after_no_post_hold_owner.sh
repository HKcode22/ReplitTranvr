#!/usr/bin/env bash
# Restore the existing approved relay after the exact confirmed no-POST HOLD.
# No new authorization, epoch reset, paid-scope change, secret changes or prior run replay.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
E=2026-11-24T06:24:28.000Z
ID=45340234922
hold(){ echo "HOLD_P6_EXISTING_RELAY_$1" >&2; exit 2; }
v(){ gh variable get "$2" -R "$1"; }
setv(){ gh variable set "$2" -R "$1" --body "$3" >/dev/null; [[ "$(v "$1" "$2")" == "$3" ]]; }
pin(){ [[ "$(gh api user --jq .login)" == HKcode22 && "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$S" && "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" == "$LS" ]]; }
pin || hold MAIN
[[ "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 && "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_TICK &&
   "$(v "$L" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 1 && "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$S" &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$E" && "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$E" &&
   "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 && "$(v "$R" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
   "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == true ]] || hold EXISTING_CONTROL_DRIFT
if [[ "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 ]]; then
 [[ "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == true && "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == true && "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 1 ]] || hold INCONSISTENT_RESTORE
 echo P6_RELAY_ALREADY_RESTORED_NO_REPLAY
 exit 0
fi
[[ "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 0 && "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false &&
   "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false && "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 0 ]] || hold PAUSED_SCOPE
gh api "repos/$R/actions/runs/$ID" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .status=="completed" and .conclusion=="success" and .path==".github/workflows/phase6-direct-recovery-tick.yml"' >/dev/null || hold EXACT_RUN
gh api "repos/$R/actions/runs/$ID/jobs?per_page=100" | jq -e 'any(.jobs[]; .name=="direct-protected-recovery-tick" and .conclusion=="success" and any(.steps[]; .name=="Direct outcome PREFLIGHT_HOLD_NO_POST" and .conclusion=="success") and any(.steps[]; .name=="Preserve direct terminal operational receipt" and .conclusion=="success"))' >/dev/null || hold EXACT_NO_POST_STEP
gh api "repos/$R/actions/runs/$ID/artifacts" | jq -e --arg n "p6-direct-terminal-$ID" '.total_count==1 and .artifacts[0].name==$n and .artifacts[0].expired==false and (.artifacts[0].digest|test("^sha256:[a-f0-9]{64}$"))' >/dev/null || hold ARTIFACT
log="$(gh run view "$ID" -R "$R" --job 138261861103 --log)"
grep -q '"reason":"HOLD_P6_DIRECT_RECOVERY_HISTORY_RESPONSE_INCOMPLETE"' <<< "$log" || hold REASON
if grep -q 'DISPATCH_ATTEMPT_BEFORE_ACK' <<< "$log"; then hold UNEXPECTED_ATTEMPT; fi
unset log
# Full post-reconciliation epoch history. No prior failed/unknown collection child.
h="$(gh api -X GET "repos/$R/actions/runs" -f branch=main -f "created>=$E" -F per_page=100)"
jq -e --arg s "$S" --argjson id "$ID" '
 .total_count==(.workflow_runs|length) and
 ([.workflow_runs[]|select(.path==".github/workflows/phase6-direct-recovery-tick.yml")|.id]==[$id]) and
 all(.workflow_runs[]|select(.path|IN(".github/workflows/phase6-rolling-controller-bounded-session.yml",".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml",".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",".github/workflows/phase5-cd-github-bounded-pre-tick.yml",".github/workflows/phase6-private-later-enrollment.yml",".github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml",".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml"));
 .head_sha==$s and .run_attempt==1 and .status=="completed" and (.conclusion=="success" or .conclusion=="skipped") and
 (.path|IN(".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml")|not))
' <<< "$h" >/dev/null || hold NEW_TARGET_HISTORY
for status in queued in_progress waiting pending requested; do
 active="$(gh api "repos/$R/actions/runs?branch=main&status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
 if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller-bounded-session|phase5-source-upcoming-queue-main-scheduled-readonly|phase5-one-signed-day-source.*|phase5-one-signed-future-post.*|phase6-nonpaid-source-day-prepare-publish)\.yml$' <<< "$active"; then hold ACTIVE_COLLECTION; fi
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
# Same exact prior owner-approved settings. Preserve this epoch and all receipts.
restore_started=1
cleanup(){
 rc=$?
 if [[ "$rc" != 0 && "$restore_started" == 1 ]]; then
  set +e
  setv "$L" TRAVNR_RELAY_ROLLING_ENABLED 0
  setv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false
  setv "$R" P6_PRIVATE_POST_PARENT_ENABLED false
  setv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 0
  echo P6_RESTORE_FAILED_PAUSE_ATTEMPTED
 fi
}
trap cleanup EXIT
gh issue comment 413 -R "$R" --body "Owner restores the already-authorized normal rolling route, unchanged epoch $E, after exact no-POST preflight HOLD 45340234922 and fresh zero physical/STOP census. Prior 45339488814 nonpaid incident reconciled by owner. No replays or new scope." >/dev/null
setv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true
setv "$R" P6_PRIVATE_POST_PARENT_ENABLED true
setv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 1
setv "$L" TRAVNR_RELAY_ROLLING_ENABLED 1
restore_started=0
echo P6_EXISTING_AUTHORIZED_RELAY_RESTORED_SAME_EPOCH
echo P6_NEXT_EXTERNAL_WAKE_NOT_YET_EXECUTION_PROOF
