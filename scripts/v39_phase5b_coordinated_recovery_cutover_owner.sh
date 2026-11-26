#!/usr/bin/env bash
# Exact, paused/nonpaid recovery release only. No conditional production
# authority, migration, paid resume, replay, cancellation, or policy rewrite.
# Owner shell is required for protected variable writes; do not use Agent.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
OLD=1ce885f1f7f2f0f826f02c9f87bb80212591b6fb
ROLD=879494843b02699ef3e3bebd0acd8f6ddf9551d0
RH=b2dec744491d5438a8041adc38f74d9fcc9f3b64
H="${2:-}"
ENV=phase6-protected-runtime
B=8df852a34c08ba91a6b3a0441b2718579901a5ca
stage=ADMISSION
hold(){ echo "HOLD_P5B_COORDINATED_CUTOVER stage=$stage reason=$1" >&2;exit 2; }
trap 'echo "P5B_CUTOVER_INTERRUPTED stage=$stage; inspect exact PR and pins; no automatic paid resume" >&2' ERR
[[ "${1:-}" == DEPLOY_EXACT_TESTED_RECOVERY_PAUSED_ONLY && "$H" =~ ^[a-f0-9]{40}$ ]] || hold EXACT_MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
tree(){ gh api "repos/$1/git/commits/$2" --jq .tree.sha; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Successful authenticated list, never interpret an API error as no override.
vars(){ local repo="$1" env="$2" endpoint; if [[ "$env" == repo ]];then endpoint="repos/$repo/actions/variables";else endpoint="repos/$repo/environments/$env/variables";fi
 gh api --paginate "$endpoint?per_page=100" --jq '.variables[]|{name,value}' | jq -s '.'
}
value(){ jq -er --arg k "$2" '[.[]|select(.name==$k)|.value]|if length==0 then "__ABSENT__" elif length==1 then .[0] else error("duplicate variable") end' <<<"$1"; }
v(){ gh variable get "$2" -R "$1"; }
effective(){ local a; a="$(value "$(vars "$1" "$3")" "$2")";if [[ "$a" == __ABSENT__ ]];then v "$1" "$2";else printf '%s\n' "$a";fi; }
guard(){ local repo="$1" key="$2" expected="$3";shift 3
 [[ "$(v "$repo" "$key")" == "$expected" ]] || hold "REPO_$key"
 local e;for e in "$@";do [[ "$(effective "$repo" "$key" "$e")" == "$expected" ]] || hold "ENV_$key";done
}
paused(){
 for k in P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED;do guard "$R" "$k" false "$ENV";done
 local j e k
 for e in repo "$ENV";do j="$(vars "$R" "$e")";for k in P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED;do
  [[ "$(value "$j" "$k")" == false || "$(value "$j" "$k")" == __ABSENT__ ]] || hold LEGACY_ROUTE_ACTIVE
 done;done
}
retention(){
 for k in P6_FULL_RETENTION_BACKSTOP_ENABLED P5_PRIMARY_FIDS_BACKSTOP_ENABLED P5_PRIMARY_FIDS_EXPIRY_ENABLED P7_EXPIRY_ENABLED;do guard "$R" "$k" true "$ENV";done
 guard "$L" TRAVNR_RELAY_PRIMARY_ENABLED 1 travnr-target-forward travnr-cron-audit
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
 if [[ "$repo" == "$R" ]];then
  jq -e '([.workflow_runs[].name] as $n | ["V3.9 Offline Safety","Phase5B source diagnostics offline tests","Phase5B conditional T24 existing witness path real PG16 (NO paid)","Phase5 V0091 genuine-source-to-V0087 scoped enrollment PG16 (NO PROVIDER)","Phase5B exact executable successor compatibility","Phase5B Phase7 actual role executable admission"] | all(. as $x|$n|index($x)!=null))' <<<"$j" >/dev/null || hold MANDATORY_CI_MISSING
 fi
 echo "EXACT_CI_PASS repo=$repo head=$head count=$(jq -r .total_count <<<"$j")"
}
active(){
 local repo="$1" wf="$2" k q total=0
 for k in queued in_progress waiting requested pending;do
  q="$(gh api "repos/$repo/actions/workflows/$wf/runs?branch=main&status=$k&per_page=1")"
  total=$((total+$(jq -er .total_count <<<"$q")))
 done
 printf '%s\n' "$total"
}
# New paid parent admission is already paused. Never cancel active work.
drain(){
 for wf in phase5-one-signed-day-source-child-dispatch.yml phase5-one-signed-future-post-v0083-main-manual.yml;do
  [[ "$(active "$R" "$wf")" == 0 ]] || hold ACTIVE_PAID_CHILD_NO_CANCEL
 done
}
merge_exact(){
 local repo="$1" num="$2" old="$3" head="$4" j
 [[ "$(statecheck "$repo" "$num" "$old" "$head")" == OPEN ]] || return 0
 j="$(pr "$repo" "$num")"
 jq -e '.mergeable=="MERGEABLE" and (.statusCheckRollup|length)>0 and all(.statusCheckRollup[];.status=="COMPLETED" and (.conclusion=="SUCCESS" or .conclusion=="SKIPPED" or .conclusion=="NEUTRAL"))' <<<"$j" >/dev/null || hold CHECK_ROLLUP
 if [[ "$(jq -r .isDraft <<<"$j")" == true ]];then gh pr ready "$num" -R "$repo";fi
 if [[ "$(gh api "repos/$repo" --jq .allow_merge_commit)" == true ]];then gh pr merge "$num" -R "$repo" --merge --match-head-commit "$head"
 elif [[ "$(gh api "repos/$repo" --jq .allow_squash_merge)" == true ]];then gh pr merge "$num" -R "$repo" --squash --match-head-commit "$head"
 else hold NO_REVIEWED_MERGE_METHOD;fi
 [[ "$(statecheck "$repo" "$num" "$old" "$head")" == MERGED ]] || hold MERGE_NOT_PROVEN
}
pin(){
 local repo="$1" key="$2" old="$3" new="$4";shift 4
 local x e
 x="$(v "$repo" "$key")";[[ "$x" == "$old" || "$x" == "$new" ]] || hold UNEXPECTED_REPO_PIN
 if [[ "$x" != "$new" ]];then gh variable set "$key" -R "$repo" --body "$new";fi
 for e in "$@";do
  x="$(value "$(vars "$repo" "$e")" "$key")"
  if [[ "$x" == __ABSENT__ ]];then continue;fi
  [[ "$x" == "$old" || "$x" == "$new" ]] || hold UNEXPECTED_ENV_PIN
  if [[ "$x" != "$new" ]];then gh variable set "$key" -R "$repo" --env "$e" --body "$new";fi
 done
 guard "$repo" "$key" "$new" "$@"
}
stage=EXACT_BOTH_CI_AND_PAUSED_PRECHECK
# Minimum is not a replacement for checking every returned exact run.
ci "$R" "$H" 46
ci "$L" "$RH" 4
ts="$(statecheck "$R" 976 "$OLD" "$H")"
ls="$(statecheck "$L" 30 "$ROLD" "$RH")"
paused;retention;drain
guard "$L" TRAVNR_RELAY_ROLLING_ENABLED 1 travnr-target-forward travnr-cron-audit
guard "$L" TRAVNR_RELAY_ROLLING_ROUTE INDEPENDENT_WAKE travnr-target-forward
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$TMP/baseline.sh"
[[ "$(git hash-object "$TMP/baseline.sh")" == "$B" ]] || hold BASELINE_BLOB
bash -n "$TMP/baseline.sh"
if [[ "$ts" == OPEN ]];then
 stage=PREMERGE_BASELINE
 guard "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$OLD" "$ENV"
 guard "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$ENV"
 guard "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$ENV"
 guard "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$OLD" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
 bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$OLD"
 paused;retention;drain
 stage=TARGET_MERGE
 merge_exact "$R" 976 "$OLD" "$H"
fi
NEW="$(main "$R")"
[[ "$(statecheck "$R" 976 "$OLD" "$H")" == MERGED ]] || hold TARGET_NOT_MERGED
stage=TARGET_PINS
paused;retention
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$OLD" "$NEW" "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$OLD" "$NEW" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
stage=NEW_MAIN_RETENTION
bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
stage=RELAY_MERGE_AND_PIN
paused;retention;drain
if [[ "$ls" == OPEN ]];then
 guard "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA "$ROLD" travnr-target-forward travnr-cron-audit
 # Preserve active primary/wake; do not cancel or race any in-flight relay job.
 [[ "$(active "$L" external-clock.yml)" == 0 ]] || hold ACTIVE_RELAY_NO_CANCEL
 merge_exact "$L" 30 "$ROLD" "$RH"
fi
RNEW="$(main "$L")"
[[ "$(statecheck "$L" 30 "$ROLD" "$RH")" == MERGED ]] || hold RELAY_NOT_MERGED
pin "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA "$ROLD" "$RNEW" travnr-target-forward travnr-cron-audit
stage=FINAL_READBACK
paused;retention;drain
[[ "$(main "$R")" == "$NEW" && "$(main "$L")" == "$RNEW" ]] || hold FINAL_MAIN_DRIFT
guard "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$NEW" travnr-target-forward travnr-cron-audit travnr-cron-management travnr-cron-lease-renewal
guard "$L" TRAVNR_RELAY_ROLLING_ENABLED 1 travnr-target-forward travnr-cron-audit
guard "$L" TRAVNR_RELAY_ROLLING_ROUTE INDEPENDENT_WAKE travnr-target-forward
bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
echo "PHASE5B_TESTED_CODE_AND_RELAY_DEPLOYED_PAUSED target=$NEW relay=$RNEW"
echo "NO_MIGRATION_INSTALL_NO_PAID_RESUME_NO_CONDITIONAL_PRODUCTION_AUTHORITY; verify independent next pulse and actual scientific chain separately"
