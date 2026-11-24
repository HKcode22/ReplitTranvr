#!/usr/bin/env bash
# Restore only the previously approved paid study on the tested PR965 successor.
# Do not replay G13, modify the signed calendar, draw, migrate or backdate.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
S=9c9cddb1aaeb04934d94af2937ee158e6d991f6c
OLD=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
E=2026-11-24T06:24:28.000Z
ENV=phase6-protected-runtime
WF=phase6-direct-recovery-tick.yml
hold(){ echo "HOLD_P6_SUCCESSOR_RESUME_$1" >&2; exit 2; }
v(){ gh variable get "$2" -R "$1"; }
sv(){ gh variable set "$2" -R "$1" --body "$3" >/dev/null && [[ "$(v "$1" "$2")" == "$3" ]]; }
pin(){ [[ "$(gh api user --jq .login)" == HKcode22 && "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$S" && "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" == "$LS" ]]; }
[[ $# == 1 && "$1" == OWNER_RESUMES_EXISTING_APPROVED_PHASE6_36740_UNITS_1900_DAILY_1000_ALERT_FLOOR_NO_BACKFILL ]] || hold CONFIRM
pin || hold MAIN
# Resume well before the remaining first request; do not turn a delayed invocation
# into an unreviewed later-horizon policy change.
[[ "$(date -u +%s)" -lt "$(date -u -d 2026-11-24T17:25:00Z +%s)" ]] || hold DAY1_PREPARATION_DEADLINE
[[ "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 0 &&
 "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_FULL_RETENTION_APPROVED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_TICK &&
 "$(v "$L" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 1 &&
 "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$S" &&
 "$(v "$L" TRAVNR_ROLLING_POLICY_FROM_UTC)" == 2026-11-23T23:45:00.000Z &&
 "$(v "$L" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == 2026-12-29T04:00:00.000Z &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$E" &&
 "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$E" &&
 "$(v "$R" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
 "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 &&
 "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == true &&
 "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false &&
 "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false &&
 "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 0 &&
 "$(v "$R" P6_PRIVATE_SOURCE_REVIEW_MODE)" == stored &&
 "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA)" == "$S" &&
 "$(v "$R" P7_EXPIRY_APPROVED_MAIN_SHA)" == "$S" ]] || hold PAUSED_CONFIG
TMP="$(mktemp -d "$PWD/.p6-resume-XXXXXXXX")"
mutating=0
cleanup(){
 rc=$?
 if [[ "$rc" != 0 && "$mutating" == 1 ]]; then
  set +e
  sv "$L" TRAVNR_RELAY_ROLLING_ENABLED 0
  sv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false
  sv "$R" P6_PRIVATE_POST_PARENT_ENABLED false
  sv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 0
  for k in V39_PHASE6_OWNER_APPROVED V39_PHASE6_PROCESS_ARMED; do
   gh secret set "$k" -R "$R" --body 0 >/dev/null
   gh secret set "$k" -R "$R" -e "$ENV" --body 0 >/dev/null
  done
  echo P6_RESUME_STOP_ROLLBACK_ATTEMPTED_RECONCILE_NO_REPLAY
 fi
 rm -rf -- "$TMP"
}
trap cleanup EXIT
# Exact completed release, repository readback, Day1 publication and protected actors.
for id in 45361171504 45365270869 45367273018 45366510838; do
 gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null || hold CURRENT_RELEASE_RECEIPT
done
gh api "repos/$R/actions/runs/45361485190/jobs?per_page=100" | jq -e 'any(.jobs[]; .name=="repository-secret-readback" and .conclusion=="success")' >/dev/null || hold REPO_POLICY
gh api "repos/$R/actions/runs/45365270869/jobs?per_page=100" | jq -e 'any(.jobs[]; .id==138345251907 and .name=="protected-main-one-day-nonpaid" and .conclusion=="success" and any(.steps[]; .name=="Prepare and publish at most one eligible independently reviewed future day" and .conclusion=="success"))' >/dev/null || hold SIGNED_DAY1
gh api "repos/$R/actions/runs/45367273018/jobs?per_page=100" | jq -e '
 [.jobs[]|select(.id==138352167245 and .name=="exact-main-post-actors-only" and .conclusion=="success")] as $j |
 ($j|length)==1 and ([$j[0].steps[]|select(.conclusion=="success" and (.name|IN("Verify exact disarmed POST actor admission","Preflight actual independent POST reviewer no observation","Preflight actual restricted POST publisher and deadline clock","Preflight exact independent bundle storage actors")))]|length)==4 and
 any(.jobs[]; .name=="exact-signed-one-v0083-future-post" and .conclusion=="skipped")' >/dev/null || hold PROTECTED_POST
gh api "repos/$R/actions/runs/45366510838/jobs?per_page=100" | jq -e '([.jobs[]|select(.conclusion=="success" and (.name|IN("primary-fids-expiry","phase7-expiry")))]|length)==2' >/dev/null || hold RETENTION
# Authenticated original paid GO exists. Never reset the old marker or replay G13.
gh api "repos/$R/issues/413/comments?per_page=100" --paginate --jq '.[]|select(.user.login=="HKcode22" and (.body//""|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body//""|contains("main c8e065d665ccacb6d2575070e94c5500b7583044")))|.id' > "$TMP/go"
[[ "$(wc -l < "$TMP/go" | tr -d ' ')" == 1 ]] || hold ORIGINAL_OWNER_GO
# Prior no-POST direct result, explicitly distinguished from unknown ACK.
gh api "repos/$R/actions/runs/45340234922/jobs?per_page=100" | jq -e 'any(.jobs[]; .id==138261861103 and .conclusion=="success" and any(.steps[]; .name=="Direct outcome PREFLIGHT_HOLD_NO_POST" and .conclusion=="success") and any(.steps[]; .name=="Preserve direct terminal operational receipt" and .conclusion=="success"))' >/dev/null || hold OLD_NO_POST
gh api "repos/$R/actions/runs/45340234922/artifacts" | jq -e '.total_count==1 and .artifacts[0].name=="p6-direct-terminal-45340234922" and .artifacts[0].expired==false and (.artifacts[0].digest|test("^sha256:[a-f0-9]{64}$"))' >/dev/null || hold OLD_ARTIFACT
# Complete history of the prior reconciled epoch; allow only exact known old
# direct HOLD, exact repaired nonpaid failure, its successor, and disarmed POST.
history="$(gh api -X GET "repos/$R/actions/runs" -f branch=main -f "created>=$E" -F per_page=100)"
jq -e --arg s "$S" --arg old "$OLD" '
 .total_count==(.workflow_runs|length) and
 ([.workflow_runs[]|select(.path==".github/workflows/phase6-direct-recovery-tick.yml")|.id]==[45340234922]) and
 all(.workflow_runs[]|select(.path|IN(
 ".github/workflows/phase6-direct-recovery-tick.yml",
 ".github/workflows/phase6-rolling-controller-bounded-session.yml",
 ".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",
 ".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",
 ".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml",
 ".github/workflows/phase6-stored-post-recovery-no-provider.yml",
 ".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",
 ".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",
 ".github/workflows/phase5-cd-github-bounded-pre-tick.yml",
 ".github/workflows/phase6-private-later-enrollment.yml",
 ".github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml",
 ".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml",
 ".github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml"));
 .run_attempt==1 and .status=="completed" and
 (if .id==45340234922 then .head_sha==$old and .conclusion=="success"
 elif .id==45363863638 then .head_sha==$s and .conclusion=="failure"
 elif .id==45367273018 then .head_sha==$s and .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and .conclusion=="success"
 elif .id==45367368800 then .head_sha==$s and .conclusion=="skipped"
 elif .path==".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml" then .head_sha==$s and (.conclusion=="success" or (.event=="schedule" and .conclusion=="skipped"))
 else false end))
 ' <<< "$history" >/dev/null || hold UNRECONCILED_PRIOR_TARGET_HISTORY
rh="$(gh api -X GET "repos/$L/actions/runs" -f branch=main -f "created>=$E" -F per_page=100)"
jq -e --arg s "$LS" '.total_count==(.workflow_runs|length) and all(.workflow_runs[]|select(.name=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT"); .head_sha==$s and .run_attempt==1 and .status=="completed" and (.conclusion=="success" or .conclusion=="skipped"))' <<< "$rh" >/dev/null || hold UNRECONCILED_RELAY
# Verify no paid worker/controller currently executing, even outside old epoch.
for status in queued in_progress waiting pending requested; do
 paths="$(gh api "repos/$R/actions/runs?branch=main&status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
 if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller-bounded-session|phase5-source-upcoming-queue-main-scheduled-readonly|phase5-one-signed-day-source.*|phase5-one-signed-future-post.*|phase6-nonpaid-source-day-prepare-publish|phase6-private-later-enrollment|phase5-cd-github-.*|phase5-six-slot-approved-early-four-airport-draw|phase6-stored-post-recovery-no-provider)\.yml$' <<< "$paths"; then hold ACTIVE_WORKER; fi
done
# Current environment variable shadows must not undermine exact route controls.
gh api "repos/$R/environments/$ENV/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/envvars"
gh api "repos/$L/environments/travnr-target-forward/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/relayvars"
if grep -Eq '^(P6_ROLLING_|P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED$|P6_PRIVATE_POST_PARENT_ENABLED$|P6_NATIVE_POST_PRODUCER_ENABLED$|P6_NONPAID_SOURCE_SCHEDULE_ENABLED$)' "$TMP/envvars"; then hold TARGET_ENV_SHADOW; fi
if grep -Eq '^(TRAVNR_RELAY_ROLLING_|TRAVNR_RELAY_DIRECT_TICK_APPROVED$|TRAVNR_APPROVED_TARGET_MAIN_SHA$)' "$TMP/relayvars"; then hold RELAY_ENV_SHADOW; fi
# Use fresh free account proof, never a billable flight GET.
B=bf6dff6e0f654836069b4cc289e5c7e750b28213
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$TMP/free.mjs"
[[ "$(git hash-object "$TMP/free.mjs")" == "$B" ]] || hold FREE_SOURCE
env -u DATABASE_URL -u V39_DATABASE_RUNTIME_URL ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP/free.mjs" > "$TMP/free.json"
jq -e '.status=="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER" and .apiUnitsLimit==60000 and .apiUnitsRemaining>=36740 and .alertCreditsRemaining>=1000 and .requestsRemaining>0 and .providerPaidGets==0 and .providerMutations==0 and .balancesStable==true' "$TMP/free.json" >/dev/null || hold FREE_QUOTA
cat "$TMP/free.json"
# Fresh metadata-only owner DB census; no contents or credentials emitted.
node <<'P6_CENSUS'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='15s'");
const m="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e";
const x=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,clock_timestamp() at,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) d2,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=1 AND daily_api_ceiling=256) b1,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2 AND daily_api_ceiling=384) b2,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=1) q1,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=1) c1,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1 AND retention_not_after_utc>statement_timestamp()) i1,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_packets,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_indexes",[m,"cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9"])).rows[0];
await c.query("ROLLBACK");console.log(JSON.stringify({status:"P6_PAID_RESUME_READONLY_DB_CENSUS",...x,providerCalls:0}));
if(!x.db||!x.owner||!x.primary||!x.ro||x.auth!==1||x.cost!==1||x.source!==0||x.rest!==0||x.stops!==0||x.d1!==4||x.d2!==4||x.b1!==1||x.b2!==1||x.q1!==128||x.c1!==1||x.i1!==1||x.due_packets!==0||x.due_indexes!==0||Date.parse(x.at)>=Date.parse("2026-11-24T17:25:00Z"))throw Error("DB_SCOPE");
}finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_SUCCESSOR_RESUME_DB_"+(e.code||e.name));process.exitCode=2;});
P6_CENSUS
pin || hold MAIN_MOVED
# New forward epoch is necessary: predecessor is bound to OLD and old failed
# nonpaid preparation was repaired. Preserve the earlier epoch in issue ledger.
N="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
MARK="$HOME/.travnr-p6-pr965-paid-resume-once.started"
( set -C; printf '%s %s\n' "$S" "$N" > "$MARK" ) || hold ATTEMPT_MARKER_NO_REPLAY
gh issue comment 413 -R "$R" --body "PR965 owner prospective resumption of already approved Phase6 paid scope (36740 API units, 1900/day cap, 1000 Alert floor), main $S relay $LS; previous epoch $E preserved; new controller epoch $N. Prior no-POST 45340234922, failed nonpaid 45363863638 reconciled by actual ACL repair and 45365270869 signed 128 publication. Current protected POST 45367273018, retention 45366510838 and fresh free account/zero physical attempt/STOP census PASS. No backfill, redraw, new scope or original G13 replay." >/dev/null || hold OWNER_LEDGER
mutating=1
sv "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$N" || hold TARGET_EPOCH
sv "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC "$N" || hold RELAY_EPOCH
for k in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 gh secret set "$k" -R "$R" --body 1 >/dev/null || hold REPO_PAID_CONTROL
 gh secret set "$k" -R "$R" -e "$ENV" --body 1 >/dev/null || hold PROTECTED_PAID_CONTROL
done
pin || hold MAIN_MOVED
sv "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true || hold SOURCE_ENABLE
sv "$R" P6_PRIVATE_POST_PARENT_ENABLED true || hold POST_ENABLE
sv "$R" P6_NATIVE_POST_PRODUCER_ENABLED 1 || hold NATIVE_POST_ENABLE
# Exactly one authorized test wave with external rolling still paused.
gh workflow run "$WF" -R "$R" --ref main -f confirm=RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO -f approved_main_sha="$S" || hold DIRECT_DISPATCH_UNKNOWN
id=""
for i in $(seq 1 30); do
 ids="$(gh run list -R "$R" --workflow "$WF" --branch main --event workflow_dispatch --limit 20 --json databaseId,headSha,createdAt --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"${N%.*}Z\")|.databaseId")"
 if [[ -n "$ids" ]]; then [[ "$(wc -l <<< "$ids" | tr -d ' ')" == 1 ]] || hold MULTIPLE_DIRECT_RUNS; id="$ids"; break; fi
 sleep 3
done
[[ "$id" =~ ^[0-9]+$ ]] || hold DIRECT_ACK_UNKNOWN
echo "P6_CURRENT_MAIN_DIRECT_RUN=$id"
timeout 660 gh run watch "$id" -R "$R" --exit-status || hold DIRECT_FAILED_NO_REPLAY
j="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
mark="$(jq -er '([.jobs[]|select(.name=="direct-protected-recovery-tick" and .conclusion=="success")]|if length==1 then .[0].steps else error("DIRECT_JOB") end)|[.[]|select(.conclusion=="success" and (.name|IN("Direct outcome TERMINAL_PARENT_ACKS_RECONCILED","Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED","Direct outcome PREFLIGHT_HOLD_NO_POST")))]|if length==1 then .[0].name else error("DIRECT_DISPOSITION") end' <<< "$j")" || hold DIRECT_DISPOSITION
gh api "repos/$R/actions/runs/$id/artifacts" | jq -e --arg n "p6-direct-terminal-$id" '.total_count==1 and .artifacts[0].name==$n and .artifacts[0].expired==false and (.artifacts[0].digest|test("^sha256:[a-f0-9]{64}$"))' >/dev/null || hold DIRECT_RECEIPT
echo "P6_DIRECT_DISPOSITION=$mark"
[[ "$mark" != "Direct outcome PREFLIGHT_HOLD_NO_POST" ]] || hold DIRECT_PREFLIGHT_NO_POST
pin || hold MAIN_MOVED
sv "$L" TRAVNR_RELAY_ROLLING_ENABLED 1 || hold RELAY_ENABLE
mutating=0
echo "P6_CURRENT_REVISION_PAID_RESUME_AND_RELAY_RESTORED"
echo "P6_EXTERNAL_NEXT_WAKE_AND_REAL_PAID_SOURCE_RECEIPTS_STILL_REQUIRED"
