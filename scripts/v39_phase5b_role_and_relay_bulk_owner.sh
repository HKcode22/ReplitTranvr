#!/usr/bin/env bash
# Exact coordinated successor; no manual paid workflow dispatch or replay.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
OLD=9fee7360cfa8a5411a7fe8229f37216197fec528
L_OLD=821b4564820d1e0cb5f8858f6e901f44106b7b89
H=27fca1ebc6289102aedb12e797863a095d476699
LH=156b05880639cdaf153befdea7b1d30f95377022
ENV=phase6-protected-runtime
RENV=travnr-target-forward
AENV=travnr-cron-audit
stage=ADMISSION
hold(){ echo "HOLD_PHASE5B_BULK_ROLE_RELAY stage=$stage reason=$1" >&2;exit 2; }
trap 'echo "PHASE5B_BULK_FAILED stage=$stage; inspect actual main and pin readbacks before retry" >&2' ERR
[[ "${1:-}" == APPLY_EXACT_PHASE5B_ROLE_AND_RELAY_SUCCESSORS ]] || hold MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
v(){ gh variable get "$2" -R "$1"; }
[[ "$(main "$R")" == "$OLD" && "$(main "$L")" == "$L_OLD" ]] || hold MAIN_DRIFT
[[ "$(v "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA)" == "$OLD" &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE &&
   "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
   "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 ]] || hold CONTROL_DRIFT
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/git/blobs/0bcda5669a27b2bf57d8e2b1c062461bb47553bb" --jq .content | base64 --decode > "$TMP/census.cjs"
[[ "$(git hash-object "$TMP/census.cjs")" == 0bcda5669a27b2bf57d8e2b1c062461bb47553bb ]] || hold CENSUS_HASH
node --check "$TMP/census.cjs"
echo "=== EXACT CURRENT PRODUCTION SOURCE/PREARM CUSTODY ==="
node "$TMP/census.cjs" || echo CUSTODY_READ_HOLD_NO_PRODUCTION_WRITES
stage=CI
check_ci(){
 local repo="$1" pr="$2" sha="$3" base="$4" minimum="$5" required="$6"
 local p j count pending red
 p="$(gh pr view "$pr" -R "$repo" --json headRefOid,baseRefOid,state,mergeable,statusCheckRollup)"
 [[ "$(jq -r .headRefOid <<<"$p")" == "$sha" && "$(jq -r .baseRefOid <<<"$p")" == "$base" && "$(jq -r .state <<<"$p")" == OPEN ]] || hold PR_DRIFT
 j="$(gh api "repos/$repo/actions/runs?head_sha=$sha&event=pull_request&per_page=100")"
 count="$(jq .total_count <<<"$j")"
 [[ "$count" -le 100 && "$(jq '.workflow_runs|length' <<<"$j")" == "$count" ]] || hold CI_PAGINATION
 red="$(jq '[.workflow_runs[]|select(.status=="completed" and .conclusion!="success")]|length' <<<"$j")"
 if [[ "$red" != 0 ]];then jq -r '.workflow_runs[]|select(.status=="completed" and .conclusion!="success")|[.id,.name,.conclusion]|@tsv' <<<"$j";hold CI_RED;fi
 pending="$(jq '[.workflow_runs[]|select(.status!="completed")]|length' <<<"$j")"
 echo "CI repo=$repo workflows=$count pending=$pending"
 [[ "$count" -ge "$minimum" && "$pending" == 0 && "$(jq -r .mergeable <<<"$p")" == MERGEABLE ]] || return 1
 jq -e --argjson required "$required" '[.statusCheckRollup[]|select(.status=="COMPLETED" and .conclusion=="SUCCESS")|.name] as $n | $required|all(. as $x|$n|index($x)!=null)' <<<"$p" >/dev/null || return 1
 jq -e '[.statusCheckRollup[]|select(.status!="COMPLETED" or (.conclusion!="SUCCESS" and .conclusion!="SKIPPED" and .conclusion!="NEUTRAL"))]|length==0' <<<"$p" >/dev/null
}
for i in $(seq 1 120);do
 if check_ci "$R" 971 "$H" "$OLD" 10 '["offline-safety","role-admission","disposable-only","offline-admission-regression","phase5b-runtime-compatibility"]' &&
    check_ci "$L" 28 "$LH" "$L_OLD" 3 '["tests-no-secret"]';then break;fi
 [[ "$i" != 120 ]] || hold CI_INCOMPLETE
 sleep 10
done
stage=CHECK_ACTIVE_PAID_CHILDREN
for i in $(seq 1 30);do
 active=0
 for wf in phase5-one-signed-day-source-child-dispatch.yml phase5-one-signed-future-post-v0083-main-manual.yml;do
  q="$(gh run list -R "$R" --branch main --workflow "$wf" --limit 100 --json status,headSha)"
  n="$(jq '[.[]|select(.status!="completed")]|length' <<<"$q")"
  active=$((active+n))
 done
 [[ "$active" != 0 ]] || break
 echo "WAIT_EXISTING_CHILDREN active=$active"
 [[ "$i" != 30 ]] || hold ACTIVE_CHILDREN_DO_NOT_INTERRUPT
 sleep 10
done
merge_exact(){
 local repo="$1" pr="$2" head="$3" base="$4" new
 [[ "$(main "$repo")" == "$base" && "$(gh pr view "$pr" -R "$repo" --json headRefOid --jq .headRefOid)" == "$head" ]] || hold PREMERGE_DRIFT
 if [[ "$(gh pr view "$pr" -R "$repo" --json isDraft --jq .isDraft)" == true ]];then gh pr ready "$pr" -R "$repo" >&2;fi
 if [[ "$(gh api "repos/$repo" --jq .allow_merge_commit)" == true ]];then
  gh pr merge "$pr" -R "$repo" --merge --match-head-commit "$head" >&2
 else
  gh pr merge "$pr" -R "$repo" --squash --match-head-commit "$head" >&2
 fi
 new="$(main "$repo")"
 [[ "$new" != "$base" && "$new" =~ ^[a-f0-9]{40}$ && "$(gh pr view "$pr" -R "$repo" --json mergeCommit --jq .mergeCommit.oid)" == "$new" &&
 "$(gh api "repos/$repo/git/commits/$new" --jq .tree.sha)" == "$(gh api "repos/$repo/git/commits/$head" --jq .tree.sha)" ]] || hold MERGED_TREE_UNVERIFIED
 printf '%s\n' "$new"
}
pin(){
 local repo="$1" name="$2" value="$3";shift 3
 gh variable set "$name" -R "$repo" --body "$value"
 [[ "$(v "$repo" "$name")" == "$value" ]] || hold REPO_PIN_READBACK
 local env
 for env in "$@";do
  if gh variable get "$name" -R "$repo" --env "$env" >/dev/null 2>&1;then
   gh variable set "$name" -R "$repo" --env "$env" --body "$value"
   [[ "$(gh variable get "$name" -R "$repo" --env "$env")" == "$value" ]] || hold ENV_PIN_READBACK
  fi
 done
}
stage=TARGET_MERGE
NEW="$(merge_exact "$R" 971 "$H" "$OLD")"
echo "PHASE5B_ROLE_TARGET_MAIN_MERGED $NEW"
stage=TARGET_REPIN
pin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$NEW" "$ENV"
pin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$NEW" "$ENV"
pin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$NEW" "$ENV"
pin "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA "$NEW" "$RENV" "$AENV"
stage=RELAY_MERGE
LNEW="$(merge_exact "$L" 28 "$LH" "$L_OLD")"
echo "PHASE5B_MONITORING_RELAY_MAIN_MERGED $LNEW"
stage=RELAY_REPIN
pin "$L" P6_RELAY_APPROVED_EXECUTABLE_SHA "$LNEW" "$RENV" "$AENV"
[[ "$(main "$R")" == "$NEW" && "$(main "$L")" == "$LNEW" &&
   "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 && "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE &&
   "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 && "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 ]] || hold FINAL_READBACK
echo "PHASE5B_ROLE_AND_RELAY_SUCCESSORS_DEPLOYED target=$NEW relay=$LNEW noSignedRewrite=1 noPaidManualDispatch=1"
stage=RETENTION
q="$(gh run list -R "$R" --branch main --workflow phase5-primary-fids-expiry-no-provider.yml --limit 30 --json status,headSha,displayTitle,conclusion)"
if jq -e --arg sha "$NEW" 'any(.[]; .status!="completed" or (.headSha==$sha and .displayTitle=="P5 FULL RETENTION BACKSTOP CHILD" and .conclusion=="success"))' <<<"$q" >/dev/null;then
 echo EXISTING_RETENTION_OR_CURRENT_MAIN_RECEIPT
else
 gh workflow run phase5-primary-fids-expiry-no-provider.yml -R "$R" --ref main -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER -f approved_main_sha="$NEW"
fi
stage=OBSERVE_INDEPENDENT_WAKE
# Observe real cron deliveries, never manually dispatch a paid parent or child.
WAKE=""
for i in $(seq 1 60);do
 q="$(gh run list -R "$L" --workflow external-clock.yml --branch main --limit 20 --json databaseId,displayTitle,headSha,status,conclusion)"
 for rid in $(jq -r --arg sha "$LNEW" '.[]|select(.headSha==$sha and .displayTitle=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT" and .status=="completed" and .conclusion=="success")|.databaseId' <<<"$q");do
  jid="$(gh run view "$rid" -R "$L" --json jobs --jq '.jobs[]|select(.name=="independent-wake" and .conclusion=="success")|.databaseId')"
  [[ -n "$jid" ]] || continue
  if gh run view "$rid" -R "$L" --job "$jid" --log > "$TMP/wake.log" 2>/dev/null;then
   receipt="$(sed -n 's/^.*\({"status":"INDEPENDENT_WAKE_COMPLETE_NOT_COLLECTION_PROOF".*\)$/\1/p' "$TMP/wake.log" | tail -1)"
   if jq -e --arg sha "$NEW" --argjson rid "$rid" '.targetSha==$sha and .relayRunId==$rid and .providerCalls==0 and .databaseWrites==0 and .paidAuthorityGranted==false' <<<"$receipt" >/dev/null 2>&1;then
    echo "$receipt"
    WAKE="$rid";break
   fi
  fi
 done
 [[ -z "$WAKE" ]] || break
 echo "WAIT_AUTONOMOUS_RELAY_RECEIPT poll=$i"
 sleep 10
done
if [[ -n "$WAKE" ]];then
 stage=HEARTBEAT
 gh workflow run phase6-autonomous-gh-controller-heartbeat-no-provider.yml -R "$R" --ref main -f confirm=READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO -f approved_main_sha="$NEW"
 # Audit stays read-only; use external scheduled receipt after the grace period.
 echo "ACTUAL_HEARTBEAT_REQUESTED_NO_PROVIDER"
else
 echo "AUTONOMOUS_RELAY_RECEIPT_NOT_YET_OBSERVED_DO_NOT_INFER_FAILURE_OR_COLLECTION"
fi
stage=FINAL_CUSTODY
node "$TMP/census.cjs" || echo CUSTODY_READ_HOLD_NO_PRODUCTION_WRITES
gh run list -R "$R" --branch main --limit 18 --json databaseId,headSha,displayTitle,status,conclusion
gh run list -R "$L" --branch main --limit 6 --json databaseId,headSha,displayTitle,status,conclusion
echo "PHASE5B_BULK_OWNER_COMMAND_FINISHED actualPaidAcquisitionRequiresOriginalReceipt=1 cronAuditLiveReadbackPending=1"
TZ=America/Los_Angeles date
