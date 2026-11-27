#!/usr/bin/env bash
# Phase5B I104/T098 owner maintenance release for exact #979.
# Explicit prospective interruption of NEW SOURCE admissions only; no cancel,
# replay, new paid GO, changed signed plan or retention disablement.
set -Eeuo pipefail
shopt -s inherit_errexit
set +x
umask 077
TARGET=bce39a3dcc179c96101363afde628e24424488e2
BASE=9ff0684de9d6afb9be8bb9835894ab8dbc0d5281
# The only live-window exception is Day3 T90; never interrupt primary T6
# or an already opened Day4 T24. Initial budget: 100m drain + 40m deploy.
maintenance_clock_ok(){
 local j="$1" reserve="$2"
 jq -e --argjson reserve "$reserve" '
 .status=="SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY" and
 .calendarDays==31 and .providerCalls==0 and .databaseWrites==0 and
 (.cells|length)==93 and
 ([.cells[]|select(.day==3 and .horizon=="T-6h")]|length)==1 and
 ([.cells[]|select(.day==3 and .horizon=="T-90m")]|length)==1 and
 ([.cells[]|select(.day==4 and .horizon=="T-24h")]|length)==1 and
 ([.cells[]|select(.day==3 and .horizon=="T-6h")][0]|
   .status=="PREPARED_DENOMINATOR_OBSERVED" and .prepared==64 and .open_unreserved==0 and .future_unreserved==0) and
 ([.cells[]|select(.day==3 and .horizon=="T-90m")][0]|
   .status=="PREPARED_DENOMINATOR_OBSERVED" and .prepared==64 and .stopped_unreserved==0) and
 ([.cells[]|select(.day==4 and .horizon=="T-24h")][0]|
   .status=="PREPARED_DENOMINATOR_OBSERVED" and .prepared==64 and .reservations==0 and
   .open_unreserved==0 and .future_unreserved==64 and .stopped_unreserved==0 and
   .next_planned_utc=="2026-11-27T11:45:00.000Z") and
 all(.cells[]|select(.status=="PREPARED_DENOMINATOR_OBSERVED" and (.day!=3 or .horizon!="T-90m"));.open_unreserved==0) and
 ([.cells[]|select(.status=="PREPARED_DENOMINATOR_OBSERVED" and (.day!=3 or .horizon!="T-90m") and .future_unreserved>0)|.next_planned_utc] as $t|
   ($t|length)>0 and all($t[];type=="string") and
   ($t|min)=="2026-11-27T11:45:00.000Z" and
   ((($t|min|sub("\\.[0-9]+Z$";"Z")|fromdateiso8601)-(.observedAtUtc|sub("\\.[0-9]+Z$";"Z")|fromdateiso8601)) >= $reserve))
 ' <<<"$j" >/dev/null
}
maintenance_receipt(){
 local j="$1" label="$2"
 jq -c --arg label "$label" '{status:$label,observedAtUtc,day3T90:([.cells[]|select(.day==3 and .horizon=="T-90m")][0]|{prepared,reservations,bindings,timely_bindings,elapsed_unreserved,open_unreserved,future_unreserved,stopped_unreserved}),day4T24:([.cells[]|select(.day==4 and .horizon=="T-24h")][0]|{prepared,reservations,open_unreserved,future_unreserved,next_planned_utc}),providerCalls:0,databaseWrites:0}' <<<"$j"
}
# Pure mockable recovery decision. Never restore into a partial/new main.
old_release_can_restore(){ [[ "$1" == "$2" && "$3" == OPEN && "$4" == "$5" ]]; }
# Validate ALL explicit variable scopes before the first mutation. Missing
# environment override is inheritance, never an API failure.
assert_pin_candidates(){
 local repo="$1" key="$2" a="$3" b="$4" x e j;shift 4
 x="$(v "$repo" "$key")" || return 3
 [[ "$x" == "$a" || "$x" == "$b" ]] || return 4
 for e in "$@";do
  j="$(vars "$repo" "$e")" || return 3
  x="$(value "$j" "$key")" || return 3
  [[ "$x" == __ABSENT__ || "$x" == "$a" || "$x" == "$b" ]] || return 4
 done
}
assert_all_pin_candidates(){
 local a="$1" b="$2" k
 for k in P6_PHASE5B_RUNTIME_EXECUTABLE_SHA P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA;do
  assert_pin_candidates "$R" "$k" "$a" "$b" "$ENV" || return 1
 done
 assert_pin_candidates "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$a" "$b" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal || return 1
 assert_pin_candidates "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true false "$ENV"
}
# Report every drain poll, preserving the original all-main quiet scope.
# Count validation is identical to quiet_endpoint; any read failure is unknown.
maintenance_progress_quiet(){
 local repo state q n total=0 target_active=0 relay_active=0
 for repo in "$R" "$L";do
  for state in queued in_progress waiting requested pending;do
   q="$(gh api "repos/$repo/actions/runs?branch=main&status=$state&per_page=1")" || return 3
   n="$(jq -er '.total_count|select(type=="number" and .>=0 and .==floor)' <<<"$q")" || return 3
   total=$((total+n))
   if [[ "$repo" == "$R" ]];then target_active=$((target_active+n));else relay_active=$((relay_active+n));fi
  done
 done
 printf 'MAINTENANCE_DRAIN_PROGRESS target_active=%s relay_active=%s total=%s elapsed_seconds=%s remaining_seconds=%s\\n' "$target_active" "$relay_active" "$total" "$(( $(date -u +%s)-drain_start ))" "$(( end-$(date -u +%s) ))"
 [[ "$total" == 0 ]] || return 4
}
if [[ "${1:-}" == SELF_TEST ]];then
 [[ "$#" == 1 ]] || exit 2
 j="$(jq -nc '[range(1;32) as $d|["T-24h","T-6h","T-90m"][] as $h|{day:$d,horizon:$h,status:"NO_PREPARED_ROWS_OBSERVED_NOT_ZERO_YIELD"}] | map(if .day==3 and .horizon=="T-6h" then .+{status:"PREPARED_DENOMINATOR_OBSERVED",prepared:64,open_unreserved:0,future_unreserved:0} elif .day==3 and .horizon=="T-90m" then .+{status:"PREPARED_DENOMINATOR_OBSERVED",prepared:64,reservations:8,bindings:4,timely_bindings:4,elapsed_unreserved:0,open_unreserved:4,future_unreserved:52,stopped_unreserved:0} elif .day==4 and .horizon=="T-24h" then .+{status:"PREPARED_DENOMINATOR_OBSERVED",prepared:64,reservations:0,open_unreserved:0,future_unreserved:64,stopped_unreserved:0,next_planned_utc:"2026-11-27T11:45:00.000Z"} else . end) | {status:"SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY",calendarDays:31,providerCalls:0,databaseWrites:0,observedAtUtc:"2026-11-27T06:45:00.000Z",cells:.}')"
 maintenance_clock_ok "$j" 8400
 # 40m only after admission paused; an open T90 cell remains explicit.
 close="$(jq -c '.observedAtUtc="2026-11-27T11:05:00.000Z"' <<<"$j")"
 maintenance_clock_ok "$close" 2400
 if maintenance_clock_ok "$close" 8400;then exit 9;fi
 for expr in '.observedAtUtc="2026-11-27T11:05:01.000Z"' '.cells[7].open_unreserved=1' '.cells[9].reservations=1' '.cells[8].stopped_unreserved=1' '.cells[9].next_planned_utc=null' '.providerCalls=1' '.calendarDays=30' '.cells|=.[0:92]';do
  bad="$(jq -c "$expr" <<<"$close")";if maintenance_clock_ok "$bad" 2400;then exit 9;fi
 done
 old_release_can_restore old old OPEN relay relay
 for v in 'new old OPEN relay relay' 'old old MERGED relay relay' 'old old OPEN changed relay';do
  read -r -a fields <<<"$v";if old_release_can_restore "${fields[@]}";then exit 9;fi
 done
 # Synthetic scoped variable preflight: absent inherits; bad or unreadable
 # protected values cannot reach a mutation stage.
 v(){ printf '%s\n' old; }
 vars(){ printf '%s\n' "${MOCK_ENV:-__ABSENT__}"; }
 value(){ printf '%s\n' "$1"; }
 assert_pin_candidates repo key old new env
 MOCK_ENV=new assert_pin_candidates repo key old new env
 if MOCK_ENV=unexpected assert_pin_candidates repo key old new env;then exit 9;fi
 vars(){ return 5; }
 if assert_pin_candidates repo key old new env;then exit 9;fi
 # T100 progress-only guard: all ten exact metadata reads, nonzero blocks,
 # unreadable/malformed never produces a successful quiet receipt.
 R=target L=relay drain_start="$(date -u +%s)" end=$(( $(date -u +%s)+6000 ))
 gh(){ printf '{"total_count":0}\\n'; }
 maintenance_progress_quiet
 gh(){ if [[ "$2" == *target*status=queued* ]];then printf '{"total_count":2}\\n';else printf '{"total_count":0}\\n';fi; }
 if maintenance_progress_quiet;then exit 9;else [[ "$?" == 4 ]] || exit 9;fi
 gh(){ printf '{"total_count":null}\\n'; }
 if maintenance_progress_quiet;then exit 9;else [[ "$?" == 3 ]] || exit 9;fi
 gh(){ return 5; }
 if maintenance_progress_quiet;then exit 9;else [[ "$?" == 3 ]] || exit 9;fi
 echo P6_I106_T100_DRAIN_PROGRESS_GUARDS_PASS
 echo P6_I104_T098_LOCAL_MAINTENANCE_GUARDS_PASS
 exit 0
fi
OP="${1:-}"
[[ "$#" == 1 && ( "$OP" == PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979 || "$OP" == RECOVER_EXACT_MERGED_PAUSED_979 ) ]] || { echo HOLD_EXACT_MAINTENANCE_MODE;exit 2; }
OUTER="$(mktemp -d)"
trap 'rm -rf "$OUTER"' EXIT
gh api "repos/HKcode22/ReplitTranvr/git/blobs/$BASE" --jq .content | base64 --decode > "$OUTER/base.sh"
[[ "$(git hash-object "$OUTER/base.sh")" == "$BASE" && "$(grep -cx 'stage=EXACT_CI' "$OUTER/base.sh")" == 1 ]]
bash -n "$OUTER/base.sh"
# Reuse the existing immutable, reviewed helper definitions only; not its
# normal 130m live-admission cutover body. All exact CI/pin/quiet guards stay.
awk '/^stage=EXACT_CI$/{exit}{print}' "$OUTER/base.sh" > "$OUTER/defs.sh"
bash -n "$OUTER/defs.sh"
set -- DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_979 "$TARGET"
# shellcheck disable=SC1090
source "$OUTER/defs.sh"
PAUSE_STARTED=0
RESUMED=0
restore_or_hold(){
 local rc="$?" current pstate relay
 trap - EXIT ERR
 if (( PAUSE_STARTED==1 && RESUMED==0 ));then
  # Restore existing authorization only when exact old main and open PR
  # still independently read back. Never reopen after a partial merge.
  current="$(main "$R" 2>/dev/null)" || current=UNKNOWN
  pstate="$(pr "$R" "$TARGET_PR" 2>/dev/null | jq -er .state)" || pstate=UNKNOWN
  relay="$(main "$L" 2>/dev/null)" || relay=UNKNOWN
  if old_release_can_restore "$current" "$OLD" "$pstate" "$relay" "$ROLD";then
   if (assert_all_pin_candidates "$OLD" "$OLD" && pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true false "$ENV" && bash "$TMP/pins.sh" "$OLD" "$ROLD" PAUSED >/dev/null && pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false true "$ENV" && bash "$TMP/pins.sh" "$OLD" "$ROLD" SOURCE_ONLY >/dev/null);then
    echo MAINTENANCE_ABORT_OLD_EXACT_SOURCE_ROUTE_RESTORED
   else
    echo HOLD_MAINTENANCE_OLD_ROUTE_READBACK_OR_RESTORE_UNCERTAIN >&2
   fi
  else
   # If merge did succeed, leave (or converge) new admission paused until
   # the exact tree and all pins/retention can be independently recovered.
   # A completely restored route is not paused merely because final output
   # was interrupted. Any metadata uncertainty remains an explicit hold.
   if [[ "$pstate" == MERGED && "$relay" == "$ROLD" ]] && ( [[ "$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")" == MERGED ]] );then
    if bash "$TMP/pins.sh" "$current" "$ROLD" SOURCE_ONLY >/dev/null 2>&1;then
     echo MAINTENANCE_NEW_SOURCE_ROUTE_READBACK_ALREADY_RESTORED >&2
    elif (assert_all_pin_candidates "$OLD" "$current" && pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true false "$ENV");then
     echo MAINTENANCE_NEW_ADMISSION_PAUSED_FOR_EXACT_RECOVERY >&2
    else
     echo HOLD_MAINTENANCE_NEW_ROUTE_STATE_UNCERTAIN >&2
    fi
   fi
   echo HOLD_MAINTENANCE_PARTIAL_OR_UNKNOWN_CUTOVER_DO_NOT_BLINDLY_REPLAY >&2
   echo "Use RECOVER_EXACT_MERGED_PAUSED_979 only after exact merged-main evidence." >&2
  fi
 fi
 rm -rf "$TMP" "$OUTER"
 exit "$rc"
}
trap restore_or_hold EXIT
trap 'exit 130' INT TERM
trap 'echo "MAINTENANCE_INTERRUPTED stage=$stage" >&2' ERR
stage=EXACT_CI
ci "$R" "$H" 21
[[ "$(main "$L")" == "$ROLD" ]] || hold RELAY_BASE_DRIFT
STATE="$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")"
blob 3ee5830338e6e121befdb6d324e9c61311dc28ea "$TMP/pins.sh"
blob 018a350036ebe0f2b326e322b586d4ef9b343dd1 "$TMP/census.mjs"
blob cc7121bbb91715ce066ae2c84e5656227853a473 "$TMP/funnel.cjs"
blob 8df852a34c08ba91a6b3a0441b2718579901a5ca "$TMP/retention.sh"
bash -n "$TMP/pins.sh";bash -n "$TMP/retention.sh";node --check "$TMP/census.mjs";node --check "$TMP/funnel.cjs"
fresh_census(){
 local strict="${1:-1}"
 node "$TMP/funnel.cjs" > "$TMP/funnel"
 if [[ "$strict" == 1 ]];then
  cutover_pre_tasks_ok "$(cat "$TMP/funnel")" || hold STOP_OR_UNSETTLED_PRE_TASKS
 else
  jq -es '([.[]|select(.status=="P6_SOURCE_RESERVATION_AND_STOP_READONLY")]) as $s|($s|length)==1 and $s[0].unresolvedStops==0 and $s[0].providerCalls==0 and $s[0].productionWrites==0 and ($s[0].at|type=="string")' "$TMP/funnel" >/dev/null || hold STOP_OR_READBACK_UNVERIFIED
 fi
 node "$TMP/census.mjs" > "$TMP/census"
 local at fa now t
 at="$(jq -er .observedAtUtc "$TMP/census")"
 fa="$(jq -ser '.[]|select(.status=="P6_SOURCE_RESERVATION_AND_STOP_READONLY")|.at' "$TMP/funnel")"
 now="$(date -u +%s)"
 for t in "$at" "$fa";do
  t="$(date -u -d "$t" +%s)" || hold CENSUS_CLOCK
  ((now>=t && now-t<=60)) || hold CENSUS_CLOCK
 done
}
verify_day4_unarmed(){
 # Metadata only, exact current owner role; no original data/secret output.
 node --input-type=module <<'P6_DAY4_UNARMED_SQL'
import {createRequire} from "node:module";
import {resolve} from "node:path";
const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
let c,tx=false;
try{
 if(!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw Error("OWNER_URL");
 c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});await c.connect();
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
 await c.query("SET LOCAL statement_timeout='15000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
 const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro")).rows[0];
 if(!id?.db||!id.owner||!id.login||!id.primary||!id.ro)throw Error("OWNER_CONTEXT");
 const a=(await c.query("SELECT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
 if(a.length!==1||!/^[a-f0-9]{64}$/.test(a[0].manifest_sha256??""))throw Error("AUTH");
 const q=(await c.query(`SELECT count(*)::int prepared,count(*) FILTER(WHERE q.state='PREPARED' AND q.github_run_id='00000' AND q.last_reserved_attempt=0 AND p.query_digest IS NULL)::int unarmed,min(q.planned_dispatch_utc) AS first FROM clean.phase5_fids_allowed_query_v39 q LEFT JOIN clean.phase5_fids_github_prearm_v39 p USING(manifest_sha256,query_digest) WHERE q.manifest_sha256=$1 AND q.run_day_index=4 AND q.horizon='T-24h'`,[a[0].manifest_sha256])).rows[0];
 if(q?.prepared!==64||q.unarmed!==64||new Date(q.first).toISOString()!=="2026-11-27T11:45:00.000Z")throw Error("DAY4_ALREADY_PREARMED_OR_SCOPE_DRIFT");
 console.log(JSON.stringify({status:"MAINTENANCE_DAY4_T24_EXACT_64_UNARMED",providerCalls:0,databaseWrites:0}));
}catch(e){console.error(JSON.stringify({status:"HOLD_MAINTENANCE_DAY4_UNARMED_READBACK",sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
finally{if(c){if(tx)await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}}
P6_DAY4_UNARMED_SQL
}
if [[ "$OP" == PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979 ]];then
 [[ "$STATE" == OPEN ]] || hold NO_BLIND_REPLAY
 stage=PREPAUSE_OLD_RETENTION_AND_PINS
 bash "$TMP/pins.sh" "$OLD" "$ROLD" SOURCE_ONLY > "$TMP/pin-output"
 grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_SOURCE_ONLY_NO_WRITES "$TMP/pin-output" || hold OLD_PIN_READBACK
 bash "$TMP/retention.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$OLD"
 fresh_census
 maintenance_clock_ok "$(cat "$TMP/census")" 8400 || hold MAINTENANCE_SCOPE_OR_PRIMARY_T6_NOT_DRAINED
 verify_day4_unarmed
 assert_all_pin_candidates "$OLD" "$OLD" || hold PIN_SCOPE_DRIFT
 maintenance_receipt "$(cat "$TMP/census")" MAINTENANCE_BEFORE_PAUSE
 stage=PAUSE_ONLY_NEW_SOURCE_ADMISSION
 PAUSE_STARTED=1
 pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true false "$ENV"
 bash "$TMP/pins.sh" "$OLD" "$ROLD" PAUSED > "$TMP/pin-output"
 grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_PAUSED_NO_WRITES "$TMP/pin-output" || hold PAUSE_READBACK
 echo 'NEW_SOURCE_ADMISSION_PAUSED_EXISTING_CHILDREN_NOT_CANCELLED_T90_MISSINGNESS_POSSIBLE'
 stage=DRAIN_AND_ACTUAL_GAP
 drain_start="$(date -u +%s)"
 end=$((drain_start+6000))
 echo "MAINTENANCE_DRAIN_STARTED maximum_seconds=6000"
 while :;do
  [[ "$(main "$R")" == "$OLD" && "$(main "$L")" == "$ROLD" ]] || hold MAIN_DRIFT
  guard "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false "$ENV"
  if maintenance_progress_quiet;then break;else rc=$?;fi
  [[ "$rc" == 4 ]] || hold ACTIVE_STATUS_UNVERIFIED
  (( $(date -u +%s)<end )) || hold DRAIN_LIMIT_NO_CANCEL
  sleep 15
 done
 fresh_census
 maintenance_clock_ok "$(cat "$TMP/census")" 2400 || hold MAINTENANCE_DEPLOYMENT_RESERVE_OR_SCOPE
 verify_day4_unarmed
 maintenance_receipt "$(cat "$TMP/census")" MAINTENANCE_DRAINED_BEFORE_MERGE
 all_main_quiet || hold ACTIVE_NO_CANCEL
 guard "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false "$ENV"
 # Recheck live clock after the final GitHub metadata scan.
 now="$(date -u +%s)";obs="$(date -u -d "$(jq -er .observedAtUtc "$TMP/census")" +%s)"
 ((now>=obs && now-obs<=60 && $(date -u -d '2026-11-27 11:45:00 UTC' +%s)-now>=2400)) || hold MAINTENANCE_FRESH_GAP
 stage=TARGET_MERGE
 merge_exact "$R" "$TARGET_PR" "$OLD" "$H"
else
 [[ "$STATE" == MERGED ]] || hold RECOVERY_REQUIRES_EXACT_MERGED_TREE
 stage=EXACT_PAUSED_PARTIAL_RECOVERY
 NEW="$(main "$R")"
 if bash "$TMP/pins.sh" "$NEW" "$ROLD" SOURCE_ONLY > "$TMP/pin-output" 2>/dev/null && grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_SOURCE_ONLY_NO_WRITES "$TMP/pin-output";then
  bash "$TMP/retention.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
  echo MAINTENANCE_ALREADY_DEPLOYED_AND_SOURCE_ROUTE_RESTORED
  exit 0
 fi
 assert_all_pin_candidates "$OLD" "$NEW" || hold PIN_SCOPE_DRIFT
 PAUSE_STARTED=1
 pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true false "$ENV"
 wait_all_quiet
 fresh_census
fi
NEW="$(main "$R")"
[[ "$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")" == MERGED && "$(main "$L")" == "$ROLD" ]] || hold MERGED_TREE_OR_RELAY_DRIFT
stage=COORDINATED_PIN_CONVERGENCE
assert_all_pin_candidates "$OLD" "$NEW" || hold PIN_SCOPE_DRIFT
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$OLD" "$NEW" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
bash "$TMP/pins.sh" "$NEW" "$ROLD" PAUSED > "$TMP/pin-output"
grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_PAUSED_NO_WRITES "$TMP/pin-output" || hold NEW_PAUSED_PIN_READBACK
stage=NEW_TARGET_RETENTION
bash "$TMP/retention.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
# If the maintenance deadline is missed after merge, converge the safe
# pins/retention first; do not resurrect expired work. Existing SOURCE
# admission itself rechecks exact signed due windows and STOP.
fresh_census 0
maintenance_receipt "$(cat "$TMP/census")" MAINTENANCE_BEFORE_RESUME
stage=RESTORE_EXISTING_SOURCE_ROUTE
bash "$TMP/pins.sh" "$NEW" "$ROLD" PAUSED > "$TMP/pin-output"
grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_PAUSED_NO_WRITES "$TMP/pin-output" || hold NEW_PAUSED_PIN_READBACK
pin "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false true "$ENV"
bash "$TMP/pins.sh" "$NEW" "$ROLD" SOURCE_ONLY > "$TMP/pin-output"
grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_SOURCE_ONLY_NO_WRITES "$TMP/pin-output" || hold FINAL_SOURCE_ONLY_READBACK
RESUMED=1
echo "P6_MAINTENANCE_EXACT_TARGET_DEPLOYED_EXISTING_SOURCE_ROUTE_RESTORED target=$NEW relay_unchanged=$ROLD"
echo 'NO_NEW_PAID_AUTHORIZATION_NO_REPLAY_NO_MIGRATION_NO_RETENTION_DISABLE; actual paid capture requires independent receipt'
