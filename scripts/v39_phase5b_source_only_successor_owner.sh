#!/usr/bin/env bash
# Exact owner decision for a code-only successor in its verified route state.
# No route/approval/secret changes, no migrations, no paid dispatch, no replay.
# The only workflow dispatch permitted is the existing due-only retention baseline.
set -Eeuo pipefail
shopt -s inherit_errexit
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
MODE="${1:-}"
ROUTE_MODE=SOURCE_ONLY
TARGET_ONLY=0
TARGET_PR=977
OLD=f4fe806dbda9695f181aee3b16d7285c42e44f93
ROLD=9188891698958e03d6fc4bf964266f560c36a6d0
RH=6c6cbd36e9838ad519ba2c8403c0e2e12ed51f7f
if [[ "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_979 ]];then
 TARGET_ONLY=1
 TARGET_PR=979
 OLD=c2bb8e18dfcf64ea815745da59ede62f53e448bb
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
elif [[ "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_980 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_980 ]];then
 TARGET_ONLY=1
 TARGET_PR=980
 OLD=2b9cb404da863aede54d9069e440ff32bcf6d00e
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
elif [[ "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_981 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_981 ]];then
 TARGET_ONLY=1
 TARGET_PR=981
 OLD=24df876fc612c0e4fdfb6f69585ed90bcc56f9b8
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
elif [[ "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_982 || "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_982 ]];then
 TARGET_ONLY=1
 TARGET_PR=982
 OLD=697501b9443837018414082434cbe798ab835f92
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
 if [[ "$MODE" == *_PAUSED_TARGET_982 ]];then ROUTE_MODE=PAUSED;fi
elif [[ "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_983 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_983 ]];then
 TARGET_ONLY=1
 TARGET_PR=983
 OLD=9426eda5f749e43b1e798b1c308f5c428f696882
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
 ROUTE_MODE=PAUSED
elif [[ "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_984 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_984 ]];then
 TARGET_ONLY=1
 TARGET_PR=984
 OLD=a02e3d6eddc378871f030848235746de160b71e5
 ROLD=2d96b22345908aa4334335aa899aec71b2fec2cb
 ROUTE_MODE=PAUSED
fi
H="${2:-}"
ENV=phase6-protected-runtime
stage=ADMISSION
hold(){ echo "HOLD_SOURCE_ONLY_CUTOVER stage=$stage reason=$1" >&2;exit 2; }
trap 'echo "SOURCE_ONLY_CUTOVER_INTERRUPTED stage=$stage; inspect actual main and pins; never blindly replay" >&2' ERR
[[ ( "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_SUCCESSOR || "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_979 || "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_980 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_980 || "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_981 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_981 || "$MODE" == DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_982 || "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_982 || "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_983 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_983 || "$MODE" == DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_984 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_984 ) && "$H" =~ ^[a-f0-9]{40}$ && "$#" == 2 ]] || hold EXACT_MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
tree(){ gh api "repos/$1/git/commits/$2" --jq .tree.sha; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
vars(){ local repo="$1" env="$2" endpoint; if [[ "$env" == repo ]];then endpoint="repos/$repo/actions/variables";else endpoint="repos/$repo/environments/$env/variables";fi
 gh api --paginate --slurp "$endpoint?per_page=100" | jq -ce '
  if type=="array" and length>0 and all(.[];
   (.variables|type)=="array" and (.total_count|type)=="number" and
   .total_count>=0 and .total_count==(.total_count|floor)) then
   . as $p | [.[].variables[]] as $v |
   if all($p[];.total_count==$p[0].total_count) and ($v|length)==$p[0].total_count and
    all($v[];(.name|type)=="string" and (.value|type)=="string" and .value!="__ABSENT__") and
    ([$v[].name]|unique|length)==($v|length)
   then $v|map({name,value}) else error("variable metadata") end
  else error("variable pages") end'
}
value(){ jq -er --arg k "$2" '[.[]|select(.name==$k)|.value]|if length==0 then "__ABSENT__" elif length==1 then .[0] else error("duplicate variable") end' <<<"$1"; }
v(){ gh variable get "$2" -R "$1"; }
effective(){
 local a j
 j="$(vars "$1" "$3")" || return 3
 a="$(value "$j" "$2")" || return 3
 if [[ "$a" == __ABSENT__ ]];then v "$1" "$2";else printf '%s\n' "$a";fi
}
guard(){ local repo="$1" key="$2" expected="$3";shift 3
 [[ "$(v "$repo" "$key")" == "$expected" ]] || hold "REPO_$key"
 local e;for e in "$@";do [[ "$(effective "$repo" "$key" "$e")" == "$expected" ]] || hold "ENV_$key";done
}
pr(){ gh pr view "$2" -R "$1" --json headRefOid,baseRefOid,state,mergeCommit,isDraft,mergeable,statusCheckRollup; }
statecheck(){
 local repo="$1" num="$2" old="$3" head="$4" j state now
 j="$(pr "$repo" "$num")";state="$(jq -r .state <<<"$j")";now="$(main "$repo")"
 [[ "$(jq -r .headRefOid <<<"$j")" == "$head" ]] || hold PR_HEAD_DRIFT
 if [[ "$state" == OPEN ]];then
  [[ "$now" == "$old" && "$(jq -r .baseRefOid <<<"$j")" == "$old" ]] || hold BASE_DRIFT
 elif [[ "$state" == MERGED ]];then
  [[ "$now" == "$(jq -r .mergeCommit.oid <<<"$j")" && "$(tree "$repo" "$now")" == "$(tree "$repo" "$head")" ]] || hold MERGED_TREE_DRIFT
 else hold PR_STATE;fi
 printf '%s\n' "$state"
}
ci(){
 local repo="$1" head="$2" minimum="$3" j
 j="$(gh api "repos/$repo/actions/runs?head_sha=$head&event=pull_request&per_page=100")"
 jq -e --arg h "$head" --argjson n "$minimum" '.total_count<=100 and (.workflow_runs|length)==.total_count and .total_count>=$n and all(.workflow_runs[];.head_sha==$h and .status=="completed" and .conclusion=="success" and .run_attempt==1)' <<<"$j" >/dev/null || hold EXACT_CI_NOT_ALL_GREEN
 if [[ "$repo" == "$R" && "$TARGET_ONLY" == 1 ]];then
  if [[ "$TARGET_PR" == 981 || "$TARGET_PR" == 982 || "$TARGET_PR" == 983 || "$TARGET_PR" == 984 ]];then
   target_981_ci_ok "$j" "$head" || hold MANDATORY_981_CI_MISSING
   local run jobs
   run="$(jq -er '[.workflow_runs[]|select(.path==".github/workflows/phase5-reviewed-replit-callback-only-build-no-provider.yml")|.id]|if length==1 then .[0] else error("callback run") end' <<<"$j")"
   jobs="$(gh api "repos/$repo/actions/runs/$run/jobs?per_page=100")"
   target_981_callback_jobs_ok "$jobs" "$head" || hold CALLBACK_REFUSAL_NOT_VERIFIED
  elif [[ "$TARGET_PR" == 980 ]];then
   target_980_ci_ok "$j" "$head" || hold MANDATORY_980_CI_MISSING
  else
   target_only_ci_ok "$j" "$head" || hold MANDATORY_CI_MISSING
  fi
 elif [[ "$repo" == "$R" ]];then
  jq -e '([.workflow_runs[].name] as $n | ["V3.9 Offline Safety","Phase5B source diagnostics offline tests","Phase5B conditional T24 existing witness path real PG16 (NO paid)","Phase5 V0091 genuine-source-to-V0087 scoped enrollment PG16 (NO PROVIDER)","Phase5B exact executable successor compatibility","Phase5B Phase7 actual role executable admission"] | all(. as $x|$n|index($x)!=null))' <<<"$j" >/dev/null || hold MANDATORY_CI_MISSING
 fi
 echo "EXACT_CI_PASS repo=$repo head=$head count=$(jq -r .total_count <<<"$j")"
}
merge_exact(){
 local repo="$1" num="$2" old="$3" head="$4" j
 [[ "$(statecheck "$repo" "$num" "$old" "$head")" == OPEN ]] || return 0
 j="$(pr "$repo" "$num")"
 jq -e '.mergeable=="MERGEABLE" and (.statusCheckRollup|length)>0 and all(.statusCheckRollup[];.status=="COMPLETED" and (.conclusion=="SUCCESS" or .conclusion=="SKIPPED" or .conclusion=="NEUTRAL"))' <<<"$j" >/dev/null || hold CHECK_ROLLUP
 if [[ "$(jq -r .isDraft <<<"$j")" == true ]];then gh pr ready "$num" -R "$repo";fi
 local method
 if [[ "$(gh api "repos/$repo" --jq .allow_merge_commit)" == true ]];then method=--merge
 elif [[ "$(gh api "repos/$repo" --jq .allow_squash_merge)" == true ]];then method=--squash
 else hold NO_REVIEWED_MERGE_METHOD;fi
 # Metadata reads and draft promotion may consume the original time margin.
 # For #980, recertify quiet and fresh evidence at the final merge boundary.
 if [[ "$repo" == "$R" && ( "$num" == 980 || "$num" == 981 || "$num" == 982 || "$num" == 983 || "$num" == 984 ) ]];then
  all_main_quiet || hold ACTIVE_NO_CANCEL
  if [[ "$ROUTE_MODE" == PAUSED ]];then
   verify_paused "$OLD"
   all_main_quiet || hold ACTIVE_NO_CANCEL
   fresh_paused_cutover "$(cat "$TMP/paused")" "$funnel_observed" "$OLD" "$ROLD" || hold FINAL_PAUSED_EVIDENCE_STALE_OR_ACTIVE
  else
   fresh_980_gap "$(cat "$TMP/census")" "$funnel_observed" || hold FINAL_MERGE_EVIDENCE_STALE_OR_GAP
  fi
 fi
 gh pr merge "$num" -R "$repo" "$method" --match-head-commit "$head"
 [[ "$(statecheck "$repo" "$num" "$old" "$head")" == MERGED ]] || hold MERGE_NOT_PROVEN
}
pin(){
 local repo="$1" key="$2" old="$3" new="$4";shift 4
 local x e
 x="$(v "$repo" "$key")";[[ "$x" == "$old" || "$x" == "$new" ]] || hold UNEXPECTED_REPO_PIN
 if [[ "$x" != "$new" ]];then gh variable set "$key" -R "$repo" --body "$new";fi
 for e in "$@";do
  local j
  j="$(vars "$repo" "$e")" || hold VARIABLE_LIST_UNVERIFIED
  x="$(value "$j" "$key")" || hold VARIABLE_VALUE_UNVERIFIED
  if [[ "$x" == __ABSENT__ ]];then continue;fi
  [[ "$x" == "$old" || "$x" == "$new" ]] || hold UNEXPECTED_ENV_PIN
  if [[ "$x" != "$new" ]];then gh variable set "$key" -R "$repo" --env "$e" --body "$new";fi
 done
 guard "$repo" "$key" "$new" "$@"
}

# BEGIN SOURCE ONLY TESTED GUARDS
# Exact paths, not dynamic run-name or a minimum count alone.
target_only_ci_ok(){
 local j="$1" h="$2"
 jq -e --arg h "$h" '
 .total_count<=100 and (.workflow_runs|length)==.total_count and .total_count>=12 and
 all(.workflow_runs[];.head_sha==$h and .status=="completed" and .conclusion=="success" and .run_attempt==1) and
 ([.workflow_runs[].path] as $p | [
 ".github/workflows/v39-phase0-offline.yml",
 ".github/workflows/phase5b-source-diagnostics-offline.yml",
 ".github/workflows/phase5b-phase7-role-successor.yml",
 ".github/workflows/phase5b-runtime-successor-compatibility.yml",
 ".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml",
 ".github/workflows/phase6-source-existing-p5-child-admission-offline-no-provider.yml",
 ".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",
 ".github/workflows/phase5-public-frozen-private-flight-packet-leak-guard.yml",
 ".github/workflows/phase5-actual-source-native-flight-candidates-readonly-manual.yml",
 ".github/workflows/phase2g-yssy-p25-published-identity-readonly.yml",
 ".github/workflows/phase2g-yssy-p25-release-no-provider-ci.yml",
 ".github/workflows/phase2g-yssy-p25-release-postgres-ci.yml"
 ] | all(. as $x|$p|index($x)!=null))' <<<"$j" >/dev/null
}
# #980 adds real policy custody/redirect regressions: require their exact
# workflow paths in addition to the proven #979 set.
target_980_ci_ok(){
 local j="$1" h="$2"
 target_only_ci_ok "$j" "$h" &&
 jq -e '([.workflow_runs[].path] as $p | [
 ".github/workflows/phase6-private-later-enrollment.yml",
 ".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",
 ".github/workflows/phase5-github-fids-source-release-guard-offline.yml",
 ".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",
 ".github/workflows/phase5-source-login-and-manual-owner-disposable-pg16.yml",
 ".github/workflows/phase5-v0080-github-runtime-prearm-real-pg16.yml",
 ".github/workflows/phase5-amendment-c-segmented-day-stage6-stage8-offline.yml",
 ".github/workflows/phase3-gate4-owned-handoff-ci.yml",
 ".github/workflows/phase5-v0082-atomic-segmented-day-pg16-no-provider.yml",
 ".github/workflows/phase5-stage9-v0079-db-prepare-offline.yml",
 ".github/workflows/phase5-stage8-v0079-daily-prepare-proposals-offline.yml"
 ] | all(. as $x|$p|index($x)!=null))' <<<"$j" >/dev/null
}
# #981: all prior workflow paths plus actual T24 witness, queue and endpoint
# acceptance. No absent, failed or retried workflow is accepted.
target_981_ci_ok(){
 local j="$1" h="$2"
 target_980_ci_ok "$j" "$h" &&
 jq -e '([.workflow_runs[].path] as $p | [
 ".github/workflows/phase5b-conditional-t24-witness-pg16.yml",
 ".github/workflows/phase5-v0088-real-queue-stage14-disposable-pg16.yml",
 ".github/workflows/phase5-v0091-source-bound-registration-disposable-pg16.yml",
 ".github/workflows/phase5-amendment-e-endpoint-evidence-review-offline.yml",
 ".github/workflows/phase6-admission-diagnostics-offline.yml",
 ".github/workflows/phase5-reviewed-replit-callback-only-build-no-provider.yml"
 ] | all(. as $x|($p|map(select(.==$x))|length)==1))' <<<"$j" >/dev/null
}
target_981_callback_jobs_ok(){
 local j="$1" h="$2"
 jq -e --arg h "$h" '
 .total_count==1 and (.jobs|length)==1 and
 .jobs[0].head_sha==$h and .jobs[0].name=="verify-offline-reviewed-receiver-build" and
 .jobs[0].status=="completed" and .jobs[0].conclusion=="success" and
 ([.jobs[0].steps[]|select(.name=="Prove source-equivalent callback-only build and historical constraints")|.conclusion]==["success"]) and
 ([.jobs[0].steps[]|select(.name=="Explicit worker-only callback admission or exact reviewed source")|.conclusion]==["success"]) and
 ([.jobs[0].steps[]|select(.name=="Build reviewed callback-only binary without provider or production credentials")|.conclusion]==["skipped"])
 ' <<<"$j" >/dev/null
}
# Check all explicit scopes before the first mutation, not while partially
# converging a release. An absent environment override inherits.
pin_candidates_ok(){
 local repo="$1" key="$2" old="$3" new="$4" x e j;shift 4
 x="$(v "$repo" "$key")" || return 3
 [[ "$x" == "$old" || "$x" == "$new" ]] || return 4
 for e in "$@";do
  j="$(vars "$repo" "$e")" || return 3
  x="$(value "$j" "$key")" || return 3
  [[ "$x" == __ABSENT__ || "$x" == "$old" || "$x" == "$new" ]] || return 4
 done
}
target_980_pins_ok(){
 local old="$1" new="$2" k
 for k in P6_PHASE5B_RUNTIME_EXECUTABLE_SHA P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA;do
  pin_candidates_ok "$R" "$k" "$old" "$new" "$ENV" || return 1
 done
 pin_candidates_ok "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$old" "$new" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
}
# Database time, not runner wall clock, determines the prospective no-cutover gap.
# 90-minute stored prearm + 40-minute deployment reserve. Open due work is fatal.
gap_ok(){
 local j="$1"
 jq -e '
 .status=="SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY" and
 .calendarDays==31 and .providerCalls==0 and .databaseWrites==0 and
 (.observedAtUtc|type=="string") and
 ([.cells[]|select(.status=="PREPARED_DENOMINATOR_OBSERVED")]|length)>0 and
 ([.cells[]|select(.open_unreserved!=null)|.open_unreserved]|add)==0 and
 ([.cells[]|select(.future_unreserved!=null)|.future_unreserved]|add)>0 and
 ([.cells[]|select(.future_unreserved!=null and .future_unreserved>0)|.next_planned_utc] as $t |
   ($t|length)>0 and all($t[];type=="string") and
   (($t|min|sub("\\.[0-9]+Z$";"Z")|fromdateiso8601)-(.observedAtUtc|sub("\\.[0-9]+Z$";"Z")|fromdateiso8601))>=7800)
 ' <<<"$j" >/dev/null
}
quiet_endpoint(){
 local endpoint="$1" state q n
 for state in queued in_progress waiting requested pending;do
  q="$(gh api "repos/$endpoint?branch=main&status=$state&per_page=1")" || return 3
  n="$(jq -er '.total_count|select(type=="number" and .>=0 and .==floor)' <<<"$q")" || return 3
  [[ "$n" == 0 ]] || return 4
 done
}
all_main_quiet(){
 quiet_endpoint "$R/actions/runs" || return "$?"
 quiet_endpoint "$L/actions/runs"
}
# A target-main push CI triggered by our merge is offline and must not
# block the independent relay cutover. Still drain every prior operational
# parent/child/retention lane (same scope as the earlier tested procedure).
relay_stage_quiet(){
 local wf
 quiet_endpoint "$L/actions/runs" || return "$?"
 for wf in phase5-source-upcoming-queue-main-scheduled-readonly.yml phase6-rolling-controller-bounded-session.yml phase5-one-signed-day-source-child-dispatch.yml phase5-one-signed-future-post-v0083-main-manual.yml phase5-primary-fids-expiry-no-provider.yml;do
  quiet_endpoint "$R/actions/workflows/$wf/runs" || return "$?"
 done
}
wait_all_quiet(){
 local fn="${1:-all_main_quiet}" i rc
 [[ "$fn" == all_main_quiet || "$fn" == relay_stage_quiet ]] || hold INVALID_QUIET_SCOPE
 for ((i=1;i<=12;i++));do
  if "$fn";then return 0;else rc=$?;fi
  [[ "$rc" == 4 ]] || hold ACTIVE_STATUS_UNVERIFIED
  [[ "$i" != 12 ]] || hold ACTIVE_NO_CANCEL
  sleep 10
 done
}
# The durable queue retains terminal history; requiring an empty table
# would prohibit every future safe deployment after the first genuine PRE.
# Do not waive ambiguous writes or quarantined tasks.
cutover_pre_tasks_ok(){
 local j="$1"
 jq -es '
  ([.[]|select(.status=="P6_SOURCE_RESERVATION_AND_STOP_READONLY")]) as $s |
  ([.[]|select(.status=="P6_PRIVATE_PACKET_AND_PRE_TASK_CUSTODY_READONLY")]) as $t |
  ($s|length)==1 and ($t|length)==1 and
  $s[0].unresolvedStops==0 and
  $s[0].providerCalls==0 and $s[0].productionWrites==0 and
  $t[0].providerCalls==0 and $t[0].productionWrites==0 and
  ($s[0].at|type=="string") and $s[0].at==$t[0].at and
  ($t[0].tasks|type=="array") and
  ([$t[0].tasks[]|[.horizon,.state]]|unique|length)==($t[0].tasks|length) and
  all($t[0].tasks[];
    (.horizon=="T-24h" or .horizon=="T-6h" or .horizon=="T-90m") and
    (.tasks|type=="number" and .>0 and .==floor) and
    (.tasks_with_snapshot_ref|type=="number" and .>=0 and .==floor) and
    (.linked_cutoff_safe_verified|type=="number" and .>=0 and .==floor) and
    ((.state=="VERIFIED_ON_TIME" and .tasks_with_snapshot_ref==.tasks and .linked_cutoff_safe_verified==.tasks) or
     (.state=="MISSED" and .tasks_with_snapshot_ref==0 and .linked_cutoff_safe_verified==0)))
 ' <<<"$j" >/dev/null
}
# #980 final local wall clock is only a conservative freshness guard;
# the prospective schedule and initial gap remain bound to actual DB time.
fresh_980_gap(){
 local j="$1" task_at="$2" now observed task next
 gap_ok "$j" || return 1
 now="$(date -u +%s)" || return 1
 observed="$(jq -er '.observedAtUtc' <<<"$j")" || return 1
 observed="$(date -u -d "$observed" +%s)" || return 1
 task="$(date -u -d "$task_at" +%s)" || return 1
 next="$(jq -er '[.cells[]|select(.future_unreserved!=null and .future_unreserved>0)|.next_planned_utc]|min' <<<"$j")" || return 1
 next="$(date -u -d "$next" +%s)" || return 1
 [[ "$now" =~ ^[0-9]+$ && "$observed" =~ ^[0-9]+$ && "$task" =~ ^[0-9]+$ && "$next" =~ ^[0-9]+$ ]] || return 1
 (( now>=observed && now-observed<=60 && now>=task && now-task<=60 && next-now>=7800 ))
}
# I142/T138: a paused deployment needs fresh proven quiescence and reconciled
# tasks, not a new future paid slot. A flag alone is never drain evidence.
fresh_paused_cutover(){
 local j="$1" task_at="$2" main_sha="$3" relay_sha="$4" now observed task
 jq -e --arg m "$main_sha" --arg r "$relay_sha" '
  .schema=="v39.phase5b.scientific-pause-receipt.v1" and
  .status=="PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY" and
  .targetMainSha==$m and .relayMainSha==$r and
  .existingProtectedOverridesVerified==true and .retentionAndRuntimePinsPreserved==true and
  .publicationPauseScope=="FUTURE_SOURCE_DAY_PREPARATION_ONLY" and
  .drainState=="QUIESCENT" and (.activeAfter|type=="array" and length==0) and
  .snapshotOnly==true and .drainCompletionGuaranteed==false and
  .githubVariableWritesAttempted==0 and .githubVariableWritesConfirmed==0 and
  .githubDispatches==0 and .cancelledRuns==0 and .providerCalls==0 and .databaseWrites==0 and
  .policyBytesChanged==false and .phase6PaidGo==false and .automaticResume==false and
  (.observedAtUtc|type=="string")' <<<"$j" >/dev/null || return 1
 now="$(date -u +%s)" || return 1
 observed="$(jq -er .observedAtUtc <<<"$j")" || return 1
 observed="$(date -u -d "$observed" +%s)" || return 1
 task="$(date -u -d "$task_at" +%s)" || return 1
 [[ "$now" =~ ^[0-9]+$ && "$observed" =~ ^[0-9]+$ && "$task" =~ ^[0-9]+$ ]] || return 1
 (( now>=observed && now-observed<=60 && now>=task && now-task<=60 ))
}
# Already-merged recovery can have mixed old/new allowed pins. Read the actual
# route scopes independently before converging them; never re-enable SOURCE to
# satisfy a historical SOURCE_ONLY recovery command.
paused_routes_ok(){
 local endpoint pages key
 for endpoint in "repos/$R/actions/variables" "repos/$R/environments/$ENV/variables";do
  pages="$(gh api --paginate --slurp "$endpoint?per_page=100")" || return 3
  jq -e --arg scope "$endpoint" '
   type=="array" and length>0 and
   all(.[];(.variables|type)=="array" and (.total_count|type)=="number" and
     .total_count>=0 and .total_count==(.total_count|floor)) and
   (. as $p | [.[].variables[]] as $v |
    all($p[];.total_count==$p[0].total_count) and ($v|length)==$p[0].total_count and
    all($v[];(.name|type)=="string" and (.value|type)=="string") and
    ([$v[].name]|unique|length)==($v|length) and
    (["P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NONPAID_SOURCE_SCHEDULE_ENABLED"] |
      all(. as $k | [$v[]|select(.name==$k)|.value] |
        if ($scope|contains("/environments/")) then .==[] or .==["false"] else .==["false"] end)) and
    (["P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED"] |
      all(. as $k | [$v[]|select(.name==$k)|.value] | .==[] or .==["false"])))
  ' <<<"$pages" >/dev/null || return 4
 done
}
# END SOURCE ONLY TESTED GUARDS
verify_paused(){
 bash "$TMP/pause.sh" VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION "$1" "$ROLD" > "$TMP/paused"
 jq -e '.status=="PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY"' "$TMP/paused" >/dev/null || hold PAUSED_READBACK_UNVERIFIED
}
verify_paused_recovery(){
 bash "$TMP/pause.sh" VERIFY_PAUSED_RECOVERY_INVARIANTS "$1" "$ROLD" "$OLD" > "$TMP/paused-recovery"
 jq -e --arg m "$1" --arg r "$ROLD" --arg old "$OLD" '
  .status=="PAUSED_RECOVERY_INVARIANTS_VERIFIED_READONLY" and
  .targetMainSha==$m and .relayMainSha==$r and .allowedPreviousTargetMainSha==$old and
  .existingProtectedOverridesVerified==true and .retentionAndRuntimePinsPreserved==true and
  .githubVariableWritesAttempted==0 and .githubVariableWritesConfirmed==0
 ' "$TMP/paused-recovery" >/dev/null || hold PAUSED_RECOVERY_INVARIANTS_UNVERIFIED
}
blob(){ gh api "repos/$R/git/blobs/$1" --jq .content | base64 --decode > "$2"; [[ "$(git hash-object "$2")" == "$1" ]] || hold BLOB_MISMATCH; }
stage=EXACT_CI
if [[ "$TARGET_ONLY" == 1 ]];then
 if [[ "$TARGET_PR" == 981 || "$TARGET_PR" == 982 || "$TARGET_PR" == 983 || "$TARGET_PR" == 984 ]];then ci "$R" "$H" 29;elif [[ "$TARGET_PR" == 980 ]];then ci "$R" "$H" 23;else ci "$R" "$H" 12;fi
 [[ "$(main "$L")" == "$ROLD" ]] || hold RELAY_BASE_DRIFT
 STATE="$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")"
 if [[ "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_980 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_981 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_983 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_984 ]];then
  [[ "$STATE" == MERGED ]] || hold RECOVERY_REQUIRES_EXACT_MERGED_TREE
 else
  [[ "$STATE" == OPEN ]] || hold NO_BLIND_REPLAY
 fi
else
 ci "$R" "$H" 31
 ci "$L" "$RH" 1
 [[ "$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")" == OPEN && "$(statecheck "$L" 31 "$ROLD" "$RH")" == OPEN ]] || hold NO_BLIND_REPLAY
fi
blob 3ee5830338e6e121befdb6d324e9c61311dc28ea "$TMP/pins.sh"
blob 018a350036ebe0f2b326e322b586d4ef9b343dd1 "$TMP/census.mjs"
blob cc7121bbb91715ce066ae2c84e5656227853a473 "$TMP/funnel.cjs"
blob 8df852a34c08ba91a6b3a0441b2718579901a5ca "$TMP/retention.sh"
if [[ "$ROUTE_MODE" == PAUSED ]];then
 if [[ "$TARGET_PR" == 984 ]];then blob c47c4d688d746f3e7c8f3119d3eb9068c3840c30 "$TMP/pause.sh";else blob 53d403000f7f199d1eecbcc6c84e5f1d3ffa7d26 "$TMP/pause.sh";fi
 bash -n "$TMP/pause.sh"
fi
bash -n "$TMP/pins.sh";bash -n "$TMP/retention.sh";node --check "$TMP/census.mjs";node --check "$TMP/funnel.cjs"
if [[ "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_980 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_981 || "$MODE" == RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_982 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_983 || "$MODE" == RECOVER_EXACT_MERGED_PAUSED_TARGET_984 ]];then
 stage=EXACT_MERGED_980_RECOVERY
 NEW="$(main "$R")"
 target_980_pins_ok "$OLD" "$NEW" || hold PIN_SCOPE_DRIFT
 if [[ "$ROUTE_MODE" == PAUSED ]];then
  verify_paused_recovery "$NEW"
  paused_routes_ok || hold PAUSED_ROUTE_SCOPE_UNVERIFIED
 else
  guard "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true "$ENV"
  guard "$R" P6_PRIVATE_POST_PARENT_ENABLED false "$ENV"
 fi
 # Already-merged recovery converges exact pins; it never merges again,
 # pauses SOURCE, or widens a paid window. No active job cancellation.
 wait_all_quiet
 node "$TMP/funnel.cjs" > "$TMP/funnel"
 cutover_pre_tasks_ok "$(cat "$TMP/funnel")" || hold STOP_OR_UNSETTLED_PRE_TASKS
 [[ "$(statecheck "$R" "$TARGET_PR" "$OLD" "$H")" == MERGED && "$(main "$L")" == "$ROLD" ]] || hold RECOVERY_TREE_DRIFT
 target_980_pins_ok "$OLD" "$NEW" || hold PIN_SCOPE_DRIFT
 if [[ "$ROUTE_MODE" == PAUSED ]];then
  verify_paused_recovery "$NEW"
  paused_routes_ok || hold PAUSED_ROUTE_SCOPE_UNVERIFIED
  all_main_quiet || hold ACTIVE_NO_CANCEL
  recovery_at="$(jq -ser '.[]|select(.status=="P6_SOURCE_RESERVATION_AND_STOP_READONLY")|.at' "$TMP/funnel")"
  recovery_epoch="$(date -u -d "$recovery_at" +%s)" || hold TASK_CENSUS_CLOCK
  now_epoch="$(date -u +%s)"
  (( now_epoch>=recovery_epoch && now_epoch-recovery_epoch<=60 )) || hold TASK_CENSUS_CLOCK
 fi
else
stage=EXACT_SOURCE_ONLY_OWNER_READBACK
bash "$TMP/pins.sh" "$OLD" "$ROLD" "$ROUTE_MODE" > "$TMP/pin-output"
grep -Fxq "P6_POST_CUTOVER_VARIABLE_READBACK_PASS_${ROUTE_MODE}_NO_WRITES" "$TMP/pin-output" || hold OLD_PIN_READBACK
if [[ "$ROUTE_MODE" == PAUSED ]];then verify_paused "$OLD";fi
# No raw originals, no writes; check actual STOP and any existing queue tasks.
node "$TMP/funnel.cjs" > "$TMP/funnel"
cutover_pre_tasks_ok "$(cat "$TMP/funnel")" || hold STOP_OR_UNSETTLED_PRE_TASKS
stage=PREMERGE_RETENTION
bash "$TMP/retention.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$OLD"
stage=QUIET_AND_GAP
# Do the potentially slow scoped pin enumeration before the final DB census.
if [[ "$TARGET_PR" == 980 || "$TARGET_PR" == 981 || "$TARGET_PR" == 982 || "$TARGET_PR" == 983 || "$TARGET_PR" == 984 ]];then target_980_pins_ok "$OLD" "$OLD" || hold PIN_SCOPE_DRIFT;fi
wait_all_quiet
# Recheck STOP and task state after the retention baseline and wait. A
# pre-wait census is not evidence that no new task has appeared.
node "$TMP/funnel.cjs" > "$TMP/funnel"
cutover_pre_tasks_ok "$(cat "$TMP/funnel")" || hold STOP_OR_UNSETTLED_PRE_TASKS
funnel_observed="$(jq -ser '.[]|select(.status=="P6_SOURCE_RESERVATION_AND_STOP_READONLY")|.at' "$TMP/funnel")"
if [[ "$ROUTE_MODE" == PAUSED ]];then
 verify_paused "$OLD"
 fresh_paused_cutover "$(cat "$TMP/paused")" "$funnel_observed" "$OLD" "$ROLD" || hold PAUSED_EVIDENCE_STALE_OR_ACTIVE
else
node "$TMP/census.mjs" > "$TMP/census"
gap_ok "$(cat "$TMP/census")" || hold NO_SAFE_PROSPECTIVE_GAP
# Also require clock freshness to prevent stale census reuse after the quiet wait.
observed="$(jq -r .observedAtUtc "$TMP/census")"
[[ "$(date -u +%s)" -ge "$(date -u -d "$observed" +%s)" && "$(( $(date -u +%s)-$(date -u -d "$observed" +%s) ))" -le 60 ]] || hold CENSUS_CLOCK
now_epoch="$(date -u +%s)"
funnel_epoch="$(date -u -d "$funnel_observed" +%s)" || hold TASK_CENSUS_CLOCK
[[ "$now_epoch" -ge "$funnel_epoch" && "$((now_epoch-funnel_epoch))" -le 60 ]] || hold TASK_CENSUS_CLOCK
fi
all_main_quiet || hold ACTIVE_NO_CANCEL
stage=TARGET_MERGE
[[ "$(main "$L")" == "$ROLD" ]] || hold RELAY_BASE_DRIFT
merge_exact "$R" "$TARGET_PR" "$OLD" "$H"
NEW="$(main "$R")"
fi
stage=TARGET_RUNTIME_AND_RETENTION_PINS
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$OLD" "$NEW" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
bash "$TMP/pins.sh" "$NEW" "$ROLD" "$ROUTE_MODE" > "$TMP/pin-output"
grep -Fxq "P6_POST_CUTOVER_VARIABLE_READBACK_PASS_${ROUTE_MODE}_NO_WRITES" "$TMP/pin-output" || hold NEW_TARGET_PIN_READBACK
stage=NEW_TARGET_RETENTION
bash "$TMP/retention.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
echo "${ROUTE_MODE}_TARGET_DEPLOYED_AND_RETENTION_BASELINE main=$NEW"
if [[ "$TARGET_ONLY" == 1 ]];then
 stage=FINAL_TARGET_ONLY_READBACK
 [[ "$(main "$L")" == "$ROLD" ]] || hold RELAY_BASE_DRIFT
 bash "$TMP/pins.sh" "$NEW" "$ROLD" "$ROUTE_MODE" > "$TMP/pin-output"
 grep -Fxq "P6_POST_CUTOVER_VARIABLE_READBACK_PASS_${ROUTE_MODE}_NO_WRITES" "$TMP/pin-output" || hold FINAL_PIN_READBACK
 if [[ "$ROUTE_MODE" == PAUSED ]];then verify_paused "$NEW";fi
 echo "${ROUTE_MODE}_TARGET_SUCCESSOR_DEPLOYED target=$NEW relay_unchanged=$ROLD"
 echo "NO_PAID_DISPATCH_NO_ROUTE_CHANGE_NO_POLICY_REWRITE_NO_MIGRATION; source posture preserved; no paid restart or scientific acceptance inferred"
 exit 0
fi
# Do not unwind the successfully deployed target if the separate relay quiet
# window disappears. Report the exact stage and do not repeat target merge.
stage=RELAY_MERGE
wait_all_quiet relay_stage_quiet
node "$TMP/census.mjs" > "$TMP/census"
gap_ok "$(cat "$TMP/census")" || hold RELAY_NO_SAFE_PROSPECTIVE_GAP
relay_stage_quiet || hold ACTIVE_NO_CANCEL
merge_exact "$L" 31 "$ROLD" "$RH"
RNEW="$(main "$L")"
stage=RELAY_EXECUTABLE_PIN
pin "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA "$ROLD" "$RNEW" travnr-target-forward travnr-cron-audit
stage=FINAL_READBACK
bash "$TMP/pins.sh" "$NEW" "$RNEW" SOURCE_ONLY > "$TMP/pin-output"
grep -Fxq P6_POST_CUTOVER_VARIABLE_READBACK_PASS_SOURCE_ONLY_NO_WRITES "$TMP/pin-output" || hold FINAL_PIN_READBACK
echo "SOURCE_ONLY_COORDINATED_CODE_DEPLOYED target=$NEW relay=$RNEW"
echo "NO_PAID_DISPATCH_NO_ROUTE_CHANGE_NO_POLICY_REWRITE_NO_MIGRATION; verify actual independent pulse and paid child separately"
