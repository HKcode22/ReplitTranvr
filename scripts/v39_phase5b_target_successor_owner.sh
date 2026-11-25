#!/usr/bin/env bash
# One owner cutover, exact tested PR head, no broad stop or new paid dispatch.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
RELAY=HKcode22/TravnrClockRelay
OLD=9c9cddb1aaeb04934d94af2937ee158e6d991f6c
RELAY_SHA=821b4564820d1e0cb5f8858f6e901f44106b7b89
ENV=phase6-protected-runtime
RENV=travnr-target-forward
stage=ADMISSION
hold(){ echo "HOLD_PHASE5B_TARGET_CUTOVER stage=$stage reason=$1" >&2; exit 2; }
trap 'echo "PHASE5B_TARGET_CUTOVER_FAILED stage=$stage; inspect actual main and variables before retry" >&2' ERR
[[ "${1:-}" == APPLY_EXACT_PHASE5B_TARGET_SUCCESSOR && "${2:-}" =~ ^[a-f0-9]{40}$ ]] || hold EXACT_MODE_AND_HEAD_REQUIRED
HEAD="$2"
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_IDENTITY
main(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
v(){ gh variable get "$2" -R "$1"; }
ev(){ gh variable get "$2" -R "$1" --env "$3" 2>/dev/null || v "$1" "$2"; }
[[ "$(main "$R")" == "$OLD" && "$(main "$RELAY")" == "$RELAY_SHA" ]] || hold MAIN_DRIFT
[[ "$(v "$RELAY" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE && "$(v "$RELAY" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 && "$(v "$RELAY" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 ]] || hold INDEPENDENT_RELAY_NOT_ACTIVE
[[ "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 && "$(v "$R" P6_ROLLING_CONTROLLER_ENABLED)" == 1 && "$(ev "$RELAY" TRAVNR_APPROVED_TARGET_MAIN_SHA "$RENV")" == "$OLD" ]] || hold CURRENT_BINDINGS_DRIFT
stage=EXACT_COMBINED_CI
# Observe one immutable head only; expected PR-only protected skips are
# allowed, but the essential actual tests must be positive successes.
for i in $(seq 1 120); do
 PR="$(gh pr view 970 -R "$R" --json headRefOid,baseRefOid,mergeable,isDraft,state,statusCheckRollup)"
 [[ "$(jq -r .headRefOid <<<"$PR")" == "$HEAD" && "$(jq -r .baseRefOid <<<"$PR")" == "$OLD" && "$(jq -r .state <<<"$PR")" == OPEN ]] || hold PR_HEAD_OR_BASE_CHANGED
 BAD="$(jq '[.statusCheckRollup[]|select(.status=="COMPLETED" and .conclusion!="SUCCESS" and .conclusion!="SKIPPED" and .conclusion!="NEUTRAL")]|length' <<<"$PR")"
 if [[ "$BAD" != 0 ]]; then jq -r '.statusCheckRollup[]|select(.status=="COMPLETED" and .conclusion!="SUCCESS" and .conclusion!="SKIPPED" and .conclusion!="NEUTRAL")|.name+" "+.conclusion' <<<"$PR";hold CI_FAILURE;fi
 PENDING="$(jq '[.statusCheckRollup[]|select(.status!="COMPLETED")]|length' <<<"$PR")"
 if [[ "$PENDING" == 0 ]] && jq -e '
   [.statusCheckRollup[]|select(.status=="COMPLETED" and .conclusion=="SUCCESS")|.name] as $n |
   ["offline-safety","actual-atomic-fids-with-fake-http","phase5b-runtime-compatibility","source-isolation-and-atomic-secret-mock","offline-direct-recovery"] | all(. as $x|$n|index($x)!=null)' <<<"$PR" >/dev/null; then
   break
 fi
 echo "WAIT_EXACT_CI pending=$PENDING poll=$i"
 [[ "$i" != 120 ]] || hold CI_NOT_COMPLETE
 sleep 10
done
[[ "$(jq -r .mergeable <<<"$PR")" == MERGEABLE ]] || hold PR_NOT_MERGEABLE
stage=TRIGGER_REPAIR
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Fetch only reviewed candidate bytes, never a mutable main path.
gh api "repos/$R/contents/scripts/v39_phase5b_membership_trigger_owner.cjs?ref=$HEAD" --jq .content | base64 --decode > "$TMP/trigger.cjs"
BLOB="$(gh api "repos/$R/contents/scripts/v39_phase5b_membership_trigger_owner.cjs?ref=$HEAD" --jq .sha)"
[[ "$(git hash-object "$TMP/trigger.cjs")" == "$BLOB" ]] || hold TRIGGER_BLOB_MISMATCH
node --check "$TMP/trigger.cjs"
node "$TMP/trigger.cjs" APPLY_EXACT_EXISTING_MEMBERSHIP_TRIGGER_HARDENING
stage=EXACT_MAIN_MERGE
[[ "$(main "$R")" == "$OLD" && "$(gh pr view 970 -R "$R" --json headRefOid --jq .headRefOid)" == "$HEAD" ]] || hold PREMERGE_DRIFT
if [[ "$(jq -r .isDraft <<<"$PR")" == true ]];then gh pr ready 970 -R "$R";fi
if [[ "$(gh api "repos/$R" --jq .allow_merge_commit)" == true ]];then
 gh pr merge 970 -R "$R" --merge --match-head-commit "$HEAD"
else
 gh pr merge 970 -R "$R" --squash --match-head-commit "$HEAD"
fi
NEW="$(main "$R")"
[[ "$NEW" =~ ^[a-f0-9]{40}$ && "$NEW" != "$OLD" && "$(gh pr view 970 -R "$R" --json mergeCommit --jq .mergeCommit.oid)" == "$NEW" ]] || hold MERGE_RECEIPT_UNVERIFIED
[[ "$(gh api "repos/$R/git/commits/$NEW" --jq .tree.sha)" == "$(gh api "repos/$R/git/commits/$HEAD" --jq .tree.sha)" ]] || hold MERGED_TREE_NOT_TESTED
echo "PHASE5B_TARGET_MAIN_MERGED $NEW"
stage=APPROVE_ACTUAL_EXECUTABLE
# One new nonsecret exact executable approval; no 31-policy/rights resigning.
setpin(){
 local repo="$1" key="$2" env="$3"
 local repo_exists=0 env_exists=0
 if gh variable get "$key" -R "$repo" >/dev/null 2>&1;then repo_exists=1;fi
 if gh variable get "$key" -R "$repo" --env "$env" >/dev/null 2>&1;then env_exists=1;fi
 if [[ "$repo_exists" == 1 || "$env_exists" == 0 || "$key" == P6_PHASE5B_RUNTIME_EXECUTABLE_SHA ]];then gh variable set "$key" -R "$repo" --body "$NEW";fi
 if [[ "$env_exists" == 1 ]];then gh variable set "$key" -R "$repo" --env "$env" --body "$NEW";fi
 [[ "$(ev "$repo" "$key" "$env")" == "$NEW" ]] || hold PIN_READBACK
}
setpin "$R" P6_PHASE5B_RUNTIME_EXECUTABLE_SHA "$ENV"
stage=INDEPENDENT_RETENTION_REPIN
setpin "$R" P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA "$ENV"
setpin "$R" P7_EXPIRY_APPROVED_MAIN_SHA "$ENV"
stage=RELAY_TARGET_REPIN
setpin "$RELAY" TRAVNR_APPROVED_TARGET_MAIN_SHA "$RENV"
[[ "$(main "$R")" == "$NEW" && "$(main "$RELAY")" == "$RELAY_SHA" && "$(v "$RELAY" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE && "$(v "$RELAY" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 && "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 ]] || hold FINAL_READBACK
stage=COMPLETE
echo "PHASE5B_TARGET_SUCCESSOR_DEPLOYED runtime=$NEW reviewedPolicyAnchor=$OLD noSignedArtifactRewrite=1 noManualPaidDispatch=1 nextAutonomousReceiptsUnverified=1"
