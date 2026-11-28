#!/usr/bin/env bash
# I141/T137: owner-authorized routing pause only. Existing admitted work drains
# naturally. Future publication scope is SOURCE day preparation only; the
# separate no-provider native POST publisher remains unchanged. No merge,
# cancellation, provider/DB action, policy edit or resume.
set -Eeuo pipefail
shopt -s inherit_errexit
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
P5B_PROTECTED_ENV=phase6-protected-runtime
MODE="${1:-}"
MAIN="${2:-}"
RELAY="${3:-}"
PREVIOUS_TARGET="${4:-}"
stage=ADMISSION
attempted=0
written=0
routes_verified=false
hold(){
 trap - ERR
 printf 'HOLD_SCIENTIFIC_PAUSE stage=%s reason=%s variable_writes_attempted=%s variable_writes_confirmed=%s routes_verified=%s; inspect current state; no automatic resume\n' "$stage" "$1" "$attempted" "$written" "$routes_verified" >&2
 exit 2
}
trap 'hold UNEXPECTED_COMMAND_FAILURE' ERR
[[ "$MAIN" =~ ^[a-f0-9]{40}$ && "$RELAY" =~ ^[a-f0-9]{40}$ ]] || hold EXACT_SCOPE
if [[ "$MODE" == VERIFY_PAUSED_RECOVERY_INVARIANTS ]];then
 [[ "$#" == 4 && "$PREVIOUS_TARGET" =~ ^[a-f0-9]{40}$ && "$PREVIOUS_TARGET" != "$MAIN" ]] || hold EXACT_SCOPE
else
 [[ "$#" == 3 && ( "$MODE" == PAUSE_NEW_PAID_ADMISSIONS_AND_FUTURE_PUBLICATION || "$MODE" == VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION ) ]] || hold EXACT_SCOPE
fi
[[ "$(gh api user --jq .login 2>/dev/null)" == HKcode22 ]] || hold OWNER_UNVERIFIED
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
keys=(P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED P6_NONPAID_SOURCE_SCHEDULE_ENABLED)
relay_envs=(travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal)
mains(){
 local target actual_relay
 target="$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha 2>/dev/null)" || hold TARGET_MAIN_UNVERIFIED
 actual_relay="$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha 2>/dev/null)" || hold RELAY_MAIN_UNVERIFIED
 [[ "$target" == "$MAIN" && "$actual_relay" == "$RELAY" ]] || hold EXACT_MAIN_DRIFT
}
load_vars(){
 local repo="$1" scope="$2" dest="$3" endpoint
 if [[ "$scope" == repo ]];then endpoint="repos/$repo/actions/variables";else endpoint="repos/$repo/environments/$scope/variables";fi
 gh api --paginate --slurp "$endpoint?per_page=100" > "$TMP/pages" 2>/dev/null || hold VARIABLE_METADATA_UNVERIFIED
 # Validate the complete authenticated pagination, including duplicates. An
 # unavailable or malformed environment response is never an absent shadow.
 jq -ce '
   if type=="array" and length>0 and all(.[];
     (.variables|type)=="array" and (.total_count|type)=="number" and
     .total_count>=0 and .total_count==(.total_count|floor)) then
     . as $p | [.[].variables[]] as $v |
     if all($p[];.total_count==$p[0].total_count) and
       ($v|length)==$p[0].total_count and
       all($v[];(.name|type)=="string" and (.value|type)=="string") and
       ([$v[].name]|unique|length)==($v|length)
     then $v|map({name,value}) else error("variable metadata") end
   else error("variable pages") end' "$TMP/pages" > "$dest" 2>/dev/null || hold VARIABLE_METADATA_MALFORMED
}
present(){
 local n
 n="$(jq -er --arg k "$2" '[.[]|select(.name==$k)]|length' "$1" 2>/dev/null)" || hold VARIABLE_PRESENCE_UNVERIFIED
 [[ "$n" == 0 || "$n" == 1 ]] || hold VARIABLE_PRESENCE_UNVERIFIED
 [[ "$n" == 1 ]]
}
value(){ jq -er --arg k "$2" '[.[]|select(.name==$k)|.value]|if length==1 then .[0] else error("missing or duplicate") end' "$1" 2>/dev/null; }
required(){ [[ "$(value "$1" "$2")" == "$3" ]] || hold REQUIRED_VARIABLE_DRIFT; }
override(){ if present "$1" "$2";then [[ "$(value "$1" "$2")" == "$3" ]] || hold ENVIRONMENT_OVERRIDE_DRIFT;fi; }
# Partial recovery may only converge these target-code bindings from the
# explicitly named previous main. No other pin/approval/route is relaxed.
target_binding(){
 local x;x="$(value "$1" "$2")"
 [[ "$x" == "$MAIN" || ( "$MODE" == VERIFY_PAUSED_RECOVERY_INVARIANTS && "$x" == "$PREVIOUS_TARGET" ) ]] || hold TARGET_BINDING_DRIFT
}
target_binding_override(){ if present "$1" "$2";then target_binding "$1" "$2";fi; }
load_all(){
 load_vars "$R" repo "$TMP/target"
 load_vars "$R" "$P5B_PROTECTED_ENV" "$TMP/target-env"
 load_vars "$L" repo "$TMP/relay"
 local e;for e in "${relay_envs[@]}";do load_vars "$L" "$e" "$TMP/$e";done
}
invariants(){
 local k f e x
 for k in P6_PHASE5B_RUNTIME_EXECUTABLE_SHA P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA;do
  target_binding "$TMP/target" "$k";target_binding_override "$TMP/target-env" "$k"
 done
 for k in P6_FULL_RETENTION_BACKSTOP_ENABLED P5_PRIMARY_FIDS_BACKSTOP_ENABLED P5_PRIMARY_FIDS_EXPIRY_ENABLED P7_EXPIRY_ENABLED;do
  required "$TMP/target" "$k" true;override "$TMP/target-env" "$k" true
 done
 while read -r k x;do required "$TMP/target" "$k" "$x";override "$TMP/target-env" "$k" "$x";done <<'PINS'
P5_PRIMARY_FIDS_EXPIRY_APPROVAL APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
P6_PRIVATE_EPOCH_EXPIRY_MODE APPLY_DUE_ONLY
P6_PRIVATE_EPOCH_EXPIRY_APPROVAL APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
P7_EXPIRY_APPROVAL APPLY_P7_DUE_ONLY_NO_PROVIDER
P6_ROLLING_CONTROLLER_ENABLED 1
P6_ROLLING_DIRECT_RECOVERY_ENABLED 0
PINS
 required "$TMP/relay" P6_RELAY_APPROVED_EXECUTABLE_SHA "$RELAY"
 target_binding "$TMP/relay" TRAVNR_APPROVED_TARGET_MAIN_SHA
 required "$TMP/relay" TRAVNR_RELAY_ROLLING_ROUTE INDEPENDENT_WAKE
 for k in TRAVNR_RELAY_PRIMARY_ENABLED TRAVNR_RELAY_ROLLING_ENABLED;do
  required "$TMP/relay" "$k" 1
  for e in "${relay_envs[@]}";do override "$TMP/$e" "$k" 1;done
 done
 for e in "${relay_envs[@]}";do target_binding_override "$TMP/$e" TRAVNR_APPROVED_TARGET_MAIN_SHA;done
 for e in travnr-target-forward travnr-cron-audit;do override "$TMP/$e" P6_RELAY_APPROVED_EXECUTABLE_SHA "$RELAY";done
 override "$TMP/travnr-target-forward" TRAVNR_RELAY_ROLLING_ROUTE INDEPENDENT_WAKE
 for f in "$TMP/target" "$TMP/target-env";do
  for k in P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED;do
   if present "$f" "$k";then [[ "$(value "$f" "$k")" == false ]] || hold LEGACY_PAID_ROUTE_ACTIVE;fi
  done
 done
 for k in "${keys[@]}";do
  x="$(value "$TMP/target" "$k")";[[ "$x" == true || "$x" == false ]] || hold UNEXPECTED_ROUTE_VALUE
  if present "$TMP/target-env" "$k";then
   x="$(value "$TMP/target-env" "$k")";[[ "$x" == true || "$x" == false ]] || hold UNEXPECTED_ENV_ROUTE_VALUE
  fi
 done
}
paused(){
 local key
 for key in "${keys[@]}";do required "$TMP/target" "$key" false;override "$TMP/target-env" "$key" false;done
}
active_snapshot(){
 local dest="$1" state attempt bad
 # GitHub status pages are non-atomic: a moving run can invalidate a page.
 # Retry only a fresh complete read-only snapshot, never a mutation, and
 # never turn an invalid/incomplete page into evidence of quiescence.
 for attempt in 1 2 3;do
  bad=""
  : > "$TMP/active-lines"
  for state in queued in_progress waiting requested pending;do
  gh api "repos/$R/actions/runs?branch=main&status=$state&per_page=100" > "$TMP/runs" 2>/dev/null || hold ACTIVE_METADATA_UNVERIFIED
  if ! jq -ce --arg status "$state" '
    if (.total_count|type)=="number" and .total_count>=0 and .total_count<=100 and
      .total_count==(.total_count|floor) and (.workflow_runs|type)=="array" and
      (.workflow_runs|length)==.total_count and
      all(.workflow_runs[];(.id|type)=="number" and .id>0 and .id==(.id|floor) and
        .status==$status and .head_branch=="main" and (.path|type)=="string" and
        (.created_at|type)=="string") then
      [.workflow_runs[] | .path as $p |
      select([".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",
        ".github/workflows/phase6-rolling-controller-bounded-session.yml",
        ".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",
        ".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",
        ".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml"]|index($p)!=null) |
      {id,path,status,createdAtUtc:.created_at}]
    else error("active metadata") end' "$TMP/runs" >> "$TMP/active-lines" 2>/dev/null;then
   bad="$state";break
  fi
  done
  if [[ -z "$bad" ]];then
   jq -s 'add|unique_by(.id)' "$TMP/active-lines" > "$dest" || hold ACTIVE_METADATA_MALFORMED
   return 0
  fi
  printf 'ACTIVE_SNAPSHOT_RECHECK status=%s attempt=%s (no writes; full fresh scan required)\n' "$bad" "$attempt" >&2
 done
 hold ACTIVE_METADATA_MALFORMED
}
pause_scope(){
 local key="$1" scope="$2" file="$3" x
 stage="PAUSE_${key}_${scope}"
 load_vars "$R" "$scope" "$file"
 if [[ "$scope" != repo ]] && ! present "$file" "$key";then return;fi
 x="$(value "$file" "$key")"
 [[ "$x" == true || "$x" == false ]] || hold UNEXPECTED_ROUTE_VALUE
 if [[ "$x" == true ]];then
  mains
  attempted=$((attempted+1))
  if [[ "$scope" == repo ]];then
   gh variable set "$key" -R "$R" --body false >/dev/null 2>&1 || hold VARIABLE_WRITE_OUTCOME_UNKNOWN
  else
   gh variable set "$key" -R "$R" --env "$scope" --body false >/dev/null 2>&1 || hold VARIABLE_WRITE_OUTCOME_UNKNOWN
  fi
  load_vars "$R" "$scope" "$file"
  required "$file" "$key" false
  written=$((written+1))
 fi
}
stage=READ_ONLY_PRECHECK
mains;load_all;invariants
if [[ "$MODE" != PAUSE_NEW_PAID_ADMISSIONS_AND_FUTURE_PUBLICATION ]];then paused;fi
active_snapshot "$TMP/before"
mains
if [[ "$MODE" == PAUSE_NEW_PAID_ADMISSIONS_AND_FUTURE_PUBLICATION ]];then
 for key in "${keys[@]}";do
  pause_scope "$key" repo "$TMP/target"
  pause_scope "$key" "$P5B_PROTECTED_ENV" "$TMP/target-env"
 done
fi
stage=PAUSE_READBACK
mains;load_all;invariants;paused
routes_verified=true
paused_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
stage=POST_PAUSE_ACTIVE_SNAPSHOT
snapshot_started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
active_snapshot "$TMP/after"
snapshot_completed="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
stage=FINAL_READBACK
routes_verified=false
mains;load_all;invariants;paused
routes_verified=true
jq -n --arg mode "$MODE" --arg main "$MAIN" --arg relay "$RELAY" --arg at "$paused_at" --arg observed "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
 --arg previous "$PREVIOUS_TARGET" \
 --arg snapshotStarted "$snapshot_started" --arg snapshotCompleted "$snapshot_completed" \
 --argjson attempted "$attempted" --argjson written "$written" --slurpfile before "$TMP/before" --slurpfile after "$TMP/after" '
 {schema:"v39.phase5b.scientific-pause-receipt.v1",
  status:(if $mode=="VERIFY_PAUSED_RECOVERY_INVARIANTS" then "PAUSED_RECOVERY_INVARIANTS_VERIFIED_READONLY"
    elif $mode=="VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION" then "PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY"
    else "NEW_PAID_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_PAUSED" end),
  mode:$mode,targetMainSha:$main,relayMainSha:$relay,pauseObservedAtUtc:$at,observedAtUtc:$observed,
  allowedPreviousTargetMainSha:(if $previous=="" then null else $previous end),
  runtimePinConvergenceCertified:($mode!="VERIFY_PAUSED_RECOVERY_INVARIANTS"),deploymentEvidence:false,
  pausedVariables:["P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NONPAID_SOURCE_SCHEDULE_ENABLED"],
  existingProtectedOverridesVerified:true,retentionAndRuntimePinsPreserved:true,
  publicationPauseScope:"FUTURE_SOURCE_DAY_PREPARATION_ONLY",nativePostPublisher:"UNCHANGED_BY_THIS_HELPER",
  githubVariableWritesAttempted:$attempted,githubVariableWritesConfirmed:$written,
  activeBefore:$before[0],activeAfter:$after[0],drainState:(if ($after[0]|length)>0 then "DRAINING" else "QUIESCENT" end),
  activeSnapshotScope:"SOURCE_POST_ADMISSION_AND_FUTURE_SOURCE_PREPARATION",cutoverReadinessCertified:false,
  activeSnapshotConsistency:"SEQUENTIAL_NONATOMIC_STATUS_READS",activeSnapshotStartedAtUtc:$snapshotStarted,activeSnapshotCompletedAtUtc:$snapshotCompleted,
  snapshotOnly:true,drainCompletionGuaranteed:false,alreadyAdmittedWorkMayStillExecute:true,
  futureSignedWindowsMayBeMissed:true,automaticResume:false,githubDispatches:0,
  cancelledRuns:0,providerCalls:0,databaseWrites:0,policyBytesChanged:false,phase6PaidGo:false}'
