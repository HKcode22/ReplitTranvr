#!/usr/bin/env bash
# Owner-directed limited acquisition pause, exact tested consolidated main
# successor, retained independent expiry. No automatic paid resume, replay,
# global arm changes, new provider calls or retrospective PRE.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
OLD=95e9130fbb2ef5dbf67b161fbcf2881a5f358db4
OLDHEAD=982e2806819af13de35f0170ec6433fca7f691d4
RELAY=879494843b02699ef3e3bebd0acd8f6ddf9551d0
ENV=phase6-protected-runtime
B=8df852a34c08ba91a6b3a0441b2718579901a5ca
H="${2:-}"
stage=ADMISSION
hold(){ echo "HOLD_P5B_FULL_RECOVERY stage=$stage reason=$1" >&2;exit 2; }
trap 'echo "P5B_FULL_RECOVERY_INTERRUPTED stage=$stage; inspect actual pins and pause state before any further APPLY; no automatic paid resume" >&2' ERR
[[ "${1:-}" == PAUSE_NEW_ACQUISITION_AND_APPLY_EXACT_FULL_RECOVERY && "$H" =~ ^[a-f0-9]{40}$ && "$H" != "$OLDHEAD" ]] || hold MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
v(){ gh variable get "$2" -R "$1"; }
[[ "$(main "$L")" == "$RELAY" && "$(v "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA)" == "$RELAY" && "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 && "$(v "$R" P6_FULL_RETENTION_BACKSTOP_ENABLED)" == true && "$(v "$R" P5_PRIMARY_FIDS_BACKSTOP_ENABLED)" == true && "$(v "$R" P7_EXPIRY_ENABLED)" == true && "$(v "$R" P5_PRIMARY_FIDS_EXPIRY_ENABLED)" == true ]] || hold RETENTION_OR_RELAY_DRIFT
p="$(gh pr view 975 -R "$R" --json headRefOid,baseRefOid,state,mergeCommit,isDraft)"
[[ "$(jq -r .headRefOid <<<"$p")" == "$H" ]] || hold PR_HEAD
STATE="$(jq -r .state <<<"$p")"
CURRENT="$(main "$R")"
if [[ "$STATE" == OPEN ]];then
 [[ "$CURRENT" == "$OLD" && "$(jq -r .baseRefOid <<<"$p")" == "$OLD" ]] || hold MAIN_OR_BASE_DRIFT
 [[ "$(v "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA)" == "$OLD" && "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$OLD" ]] || hold OLD_PIN_DRIFT
elif [[ "$STATE" == MERGED ]];then
 [[ "$CURRENT" == "$(jq -r .mergeCommit.oid <<<"$p")" && "$(gh api "repos/$R/git/commits/$CURRENT" --jq .tree.sha)" == "$(gh api "repos/$R/git/commits/$H" --jq .tree.sha)" ]] || hold MERGED_TREE_DRIFT
else hold PR_STATE;fi
# These are existing routing switches, not global paid GO. No cancellation
# of acknowledged children. Legacy routing must remain off.
stage=PAUSE_NEW_SOURCE_AND_POST_PARENTS
[[ "$(v "$R" P5_AUTO_SOURCE_DISPATCH_ENABLED)" != true && "$(v "$R" P5_POST_AUTO_DISPATCH_ENABLED)" != true ]] || hold LEGACY_ROUTE_ACTIVE
pause(){
 local k="$1" x e
 x="$(v "$R" "$k")"
 [[ "$x" == true || "$x" == false ]] || hold UNEXPECTED_ROUTE_VALUE
 if [[ "$x" != false ]];then gh variable set "$k" -R "$R" --body false;fi
 if e="$(gh variable get "$k" -R "$R" --env "$ENV" 2>/dev/null)";then
  [[ "$e" == true || "$e" == false ]] || hold UNEXPECTED_ENV_ROUTE_VALUE
  if [[ "$e" != false ]];then gh variable set "$k" -R "$R" --env "$ENV" --body false;fi
  [[ "$(gh variable get "$k" -R "$R" --env "$ENV")" == false ]] || hold ENV_PAUSE_READBACK
 fi
 [[ "$(v "$R" "$k")" == false ]] || hold PAUSE_READBACK
 echo "P5B_NEW_PAID_PARENT_PAUSED $k"
}
pause P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED
pause P6_PRIVATE_POST_PARENT_ENABLED
echo "P5B_ACQUISITION_PAUSED_EXISTING_CHILDREN_NOT_CANCELLED retention_remains_enabled=1 signed_windows_may_be_missed=1"
# Obsolete PR-only CI uses shared runners; never cancel production jobs or
# any current candidate check. API identity checked per exact old run.
stage=SUPERSEDED_CI_ONLY
if [[ "$STATE" == OPEN ]];then
 for id in 45726282441 45726282465 45726282444 45726282514 45726282445;do
  j="$(gh api "repos/$R/actions/runs/$id")"
  [[ "$(jq -r .head_sha <<<"$j")" == "$OLDHEAD" && "$(jq -r .event <<<"$j")" == pull_request ]] || hold OLD_CI_IDENTITY
  if [[ "$(jq -r .status <<<"$j")" != completed ]];then gh run cancel "$id" -R "$R" || hold OLD_CI_CANCEL_UNCERTAIN;fi
 done
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$TMP/baseline.sh"
[[ "$(git hash-object "$TMP/baseline.sh")" == "$B" ]] || hold RETENTION_BLOB
bash -n "$TMP/baseline.sh"
# Parent jobs submitted before pause can still dispatch. Require exact
# post-pause parent runs to finish and no active paid child before merge.
# Other nonpaid parent jobs continue, and a fresh parent may exist in pause.
active_count(){
 local wf="$1" k total=0 q
 for k in queued in_progress waiting requested pending;do
  q="$(gh api "repos/$R/actions/workflows/$wf/runs?branch=main&status=$k&per_page=1")"
  total=$((total+$(jq -er .total_count <<<"$q")))
 done
 printf '%s\n' "$total"
}
if [[ "$STATE" == OPEN ]];then
 stage=DRAIN_EXISTING_PAID_CHILDREN
 # Capture active parent IDs after switches disabled. No later parent
 # should admit stored paid dispatch with repository switches false.
 gh api "repos/$R/actions/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml/runs?branch=main&per_page=100" --jq '.workflow_runs[]|select(.status!="completed")|.id' > "$TMP/parent-ids"
 while read -r id;do
  [[ -z "$id" ]] || timeout 900 gh run watch "$id" -R "$R" >/dev/null || hold PARENT_DRAIN_PENDING
 done < "$TMP/parent-ids"
 for i in $(seq 1 180);do
  [[ "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false && "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false ]] || hold PAUSE_DRIFT
  a="$(active_count phase5-one-signed-day-source-child-dispatch.yml)"
  b="$(active_count phase5-one-signed-future-post-v0083-main-manual.yml)"
  echo "P5B_DRAIN source=$a post=$b"
  [[ "$a" == 0 && "$b" == 0 ]] && break
  [[ "$i" != 180 ]] || hold CHILDREN_STILL_ACTIVE
  sleep 20
 done
 stage=EXACT_CONSOLIDATED_CI
 for i in $(seq 1 180);do
  [[ "$(main "$R")" == "$OLD" && "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false && "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false ]] || hold MAIN_OR_PAUSE_DRIFT
  p="$(gh pr view 975 -R "$R" --json headRefOid,baseRefOid,state,mergeable,isDraft,statusCheckRollup)"
  [[ "$(jq -r .headRefOid <<<"$p")" == "$H" && "$(jq -r .baseRefOid <<<"$p")" == "$OLD" && "$(jq -r .state <<<"$p")" == OPEN ]] || hold PR_DRIFT
  j="$(gh api "repos/$R/actions/runs?head_sha=$H&event=pull_request&per_page=100")"
  jq -e '.total_count<=100 and (.workflow_runs|length)==.total_count' <<<"$j" >/dev/null || hold CI_PAGINATION
  jq -r '.workflow_runs[]|[.id,.name,.status,.conclusion]|@tsv' <<<"$j"
  jq -e 'all(.workflow_runs[];.status!="completed" or .conclusion=="success")' <<<"$j" >/dev/null || hold CI_FAILURE_NO_REPLAY
  if jq -e '(.workflow_runs|length)>=9 and all(.workflow_runs[];.status=="completed" and .conclusion=="success" and .run_attempt==1) and ( [.workflow_runs[].name] as $n | ["Phase5B exact executable successor compatibility","YSSY P25 Public Receiver Identity (Read-Only, No Provider)","YSSY P25 Focused Release — No Provider","YSSY P25 Real PG Receiver Faults (No Paid Provider)","V3.9 Offline Safety","Phase5 public GitHub forbids private frozen AeroDataBox flight packets","P5 SOURCE NATIVE FLIGHT CANDIDATES READONLY","Phase5B Phase7 actual role executable admission","Phase5B source diagnostics offline tests"]|all(. as $x|$n|index($x)!=null))' <<<"$j" >/dev/null &&
   jq -e '.mergeable=="MERGEABLE" and all(.statusCheckRollup[];.status=="COMPLETED" and (.conclusion=="SUCCESS" or .conclusion=="SKIPPED" or .conclusion=="NEUTRAL")) and ([.statusCheckRollup[]|select(.conclusion=="SUCCESS")|.name] as $n | ["offline-safety","role-admission","phase5b-runtime-compatibility","fixed-metadata-only"]|all(. as $x|$n|index($x)!=null))' <<<"$p" >/dev/null;then break;fi
  [[ "$i" != 180 ]] || hold CI_NOT_READY
  sleep 15
 done
 stage=PREMERGE_RETENTION_AND_DRAIN
 bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$OLD"
 [[ "$(main "$R")" == "$OLD" && "$(main "$L")" == "$RELAY" && "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false && "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false && "$(active_count phase5-one-signed-day-source-child-dispatch.yml)" == 0 && "$(active_count phase5-one-signed-future-post-v0083-main-manual.yml)" == 0 && "$(gh pr view 975 -R "$R" --json headRefOid --jq .headRefOid)" == "$H" ]] || hold FINAL_DRAIN_OR_PIN_DRIFT
 stage=MERGE
 if [[ "$(jq -r .isDraft <<<"$p")" == true ]];then gh pr ready 975 -R "$R";fi
 if [[ "$(gh api "repos/$R" --jq .allow_merge_commit)" == true ]];then gh pr merge 975 -R "$R" --merge --match-head-commit "$H";else gh pr merge 975 -R "$R" --squash --match-head-commit "$H";fi
fi
NEW="$(main "$R")"
[[ "$NEW" != "$OLD" && "$NEW" == "$(gh pr view 975 -R "$R" --json mergeCommit --jq .mergeCommit.oid)" && "$(gh api "repos/$R/git/commits/$NEW" --jq .tree.sha)" == "$(gh api "repos/$R/git/commits/$H" --jq .tree.sha)" ]] || hold EXACT_MERGED_TREE
echo "P5B_FULL_RECOVERY_MAIN_MERGED $NEW"
# Idempotent repin after verified exact merge, including partial cutover.
pin(){
 local repo="$1" key="$2";shift 2
 local current env
 current="$(v "$repo" "$key")"
 [[ "$current" == "$OLD" || "$current" == "$NEW" ]] || hold UNEXPECTED_PIN
 if [[ "$current" != "$NEW" ]];then gh variable set "$key" -R "$repo" --body "$NEW";fi
 [[ "$(v "$repo" "$key")" == "$NEW" ]] || hold PIN_READBACK
 for env in "$@";do
  if current="$(gh variable get "$key" -R "$repo" --env "$env" 2>/dev/null)";then
   [[ "$current" == "$OLD" || "$current" == "$NEW" ]] || hold UNEXPECTED_ENV_PIN
   if [[ "$current" != "$NEW" ]];then gh variable set "$key" -R "$repo" --env "$env" --body "$NEW";fi
   [[ "$(gh variable get "$key" -R "$repo" --env "$env")" == "$NEW" ]] || hold ENV_PIN_READBACK
  fi
 done
}
stage=COORDINATED_EXECUTABLE_BINDINGS
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA travnr-target-forward travnr-cron-audit
stage=MANDATORY_NEW_MAIN_RETENTION
bash "$TMP/baseline.sh" ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE "$NEW"
[[ "$(main "$R")" == "$NEW" && "$(main "$L")" == "$RELAY" && "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == false && "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == false ]] || hold FINAL_STATE
echo "P5B_FULL_RECOVERY_MAIN_AND_RETENTION_DEPLOYED_ACQUISITION_PAUSED target=$NEW relay=$RELAY"
echo "P5B_PAID_RESUME_REQUIRES_ACTUAL_PROSPECTIVE_SCIENTIFIC_PATH_AND_OWNER_DECISION"
