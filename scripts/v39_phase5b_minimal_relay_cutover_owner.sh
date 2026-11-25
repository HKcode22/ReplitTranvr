#!/usr/bin/env bash
# One-time, exact owner-authorized relay cutover. No target main/policy changes,
# provider calls, database mutation, worker cancellation or workflow dispatch.
set -Eeuo pipefail
set +x
umask 077
T=HKcode22/ReplitTranvr
R=HKcode22/TravnrClockRelay
TARGET=9c9cddb1aaeb04934d94af2937ee158e6d991f6c
BASE=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
HEAD=f69a60a8a8ec522c45344ac70debc38834c67db9
PR=27
CI=45525951075
hold(){ echo "HOLD_PHASE5B_RELAY_CUTOVER: $1" >&2; exit 2; }
[[ "${1:-}" == APPLY_EXACT_MINIMAL_RELAY_SUCCESSOR ]] || hold EXACT_MODE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_LOGIN
main_sha(){ gh api "repos/$1/git/ref/heads/main" --jq .object.sha; }
v(){ gh variable get "$2" -R "$1"; }
effective(){ gh variable get "$2" -R "$1" --env travnr-target-forward 2>/dev/null || v "$1" "$2"; }
[[ "$(main_sha "$T")" == "$TARGET" ]] || hold TARGET_MAIN_DRIFT
[[ "$(v "$T" P6_ROLLING_CONTROLLER_ENABLED)" == 1 ]] || hold TARGET_GROUPED_PARENT_NOT_ENABLED
[[ "$(v "$R" TRAVNR_RELAY_MODE)" == MULTI_LANE ]] || hold RELAY_MODE
[[ "$(effective "$R" TRAVNR_TARGET_FORWARD_ENV_READY)" == 1 ]] || hold EXISTING_FORWARD_ENV
[[ "$(effective "$R" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$TARGET" ]] || hold EXISTING_TARGET_PIN
[[ "$(v "$R" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 ]] || hold PRIMARY_NOT_ENABLED
primary_since="$(effective "$R" TRAVNR_RELAY_PRIMARY_SINCE_UTC)"
policy_from="$(effective "$R" TRAVNR_ROLLING_POLICY_FROM_UTC)"
policy_until="$(effective "$R" TRAVNR_ROLLING_POLICY_UNTIL_UTC)"
node -e 'const [a,b,c]=process.argv.slice(1).map(Date.parse);if(![a,b,c].every(Number.isFinite)||a>Date.now()||b>Date.now()||c<=Date.now()||c-b>60*86400000)process.exit(2)' "$primary_since" "$policy_from" "$policy_until" || hold CLOCK_SCOPE
old_route="$(v "$R" TRAVNR_RELAY_ROLLING_ROUTE)"
old_enabled="$(v "$R" TRAVNR_RELAY_ROLLING_ENABLED)"
[[ "$old_enabled" == 0 || "$old_enabled" == 1 ]] || hold ROLLING_FLAG
if [[ "$old_route" == INDEPENDENT_WAKE ]]; then
 [[ "$(v "$R" P6_RELAY_APPROVED_EXECUTABLE_SHA)" == "$(main_sha "$R")" && "$old_enabled" == 1 ]] || hold PARTIAL_EXISTING_ACTIVATION
 echo "PHASE5B_INDEPENDENT_WAKE_ALREADY_ACTIVE_VERIFY_ACTUAL_NEXT_PULSE"
 exit 0
fi
[[ "$old_route" == DIRECT_TICK || "$old_route" == DIRECT_VERIFY || "$old_route" == DURABLE_ROOT ]] || hold OLD_ROUTE
# One-time preservation check: old primary failure could be quarantined on
# a new relay SHA by unchanged legacy retention-lane history code.
for status in failure cancelled timed_out action_required stale neutral; do
 old_primary="$(gh api --method GET "repos/$R/actions/workflows/external-clock.yml/runs" -f branch=main -f event=workflow_dispatch -f status="$status" -f created=">=$primary_since" -f per_page=100 --paginate --jq '.workflow_runs[] | select(.display_title=="TRAVNR EXTERNAL CLOCK PRIMARY_BACKSTOP") | .id')"
 [[ -z "$old_primary" ]] || hold PRIMARY_OLD_FAILURE_REVIEW
done
assert_no_old_root(){
 local repo="$1" workflow="$2" title="$3" state ids
 for state in queued in_progress waiting requested pending; do
  if [[ -n "$title" ]]; then
   ids="$(gh api --method GET "repos/$repo/actions/workflows/$workflow/runs" -f branch=main -f status="$state" -f per_page=100 --paginate --jq ".workflow_runs[] | select(.display_title==\"$title\") | .id")"
  else
   ids="$(gh api --method GET "repos/$repo/actions/workflows/$workflow/runs" -f branch=main -f status="$state" -f per_page=100 --paginate --jq '.workflow_runs[].id')"
  fi
  [[ -z "$ids" ]] || hold EXISTING_ROLLING_ROOT_ACTIVE_DO_NOT_CANCEL
 done
}
roots(){
 assert_no_old_root "$T" phase6-direct-recovery-tick.yml ""
 assert_no_old_root "$T" phase6-rolling-controller-bounded-session.yml ""
 assert_no_old_root "$R" external-clock.yml "TRAVNR EXTERNAL CLOCK ROLLING_ROOT"
}
roots
[[ "$(gh api "repos/$R/actions/runs/$CI" --jq '.head_sha+" "+.status+" "+.conclusion')" == "$HEAD completed success" ]] || hold EXACT_MINIMAL_CI
pr="$(gh pr view "$PR" -R "$R" --json headRefOid,baseRefOid,state,isDraft,mergeCommit)"
[[ "$(jq -r .headRefOid <<<"$pr")" == "$HEAD" ]] || hold PR_HEAD_DRIFT
if [[ "$(jq -r .state <<<"$pr")" == OPEN ]]; then
 [[ "$(main_sha "$R")" == "$BASE" && "$(jq -r .baseRefOid <<<"$pr")" == "$BASE" ]] || hold RELAY_BASE_DRIFT
 if [[ "$(jq -r .isDraft <<<"$pr")" == true ]]; then gh pr ready "$PR" -R "$R"; fi
 if [[ "$(gh api "repos/$R" --jq .allow_merge_commit)" == true ]]; then
  gh pr merge "$PR" -R "$R" --merge --match-head-commit "$HEAD"
 elif [[ "$(gh api "repos/$R" --jq .allow_squash_merge)" == true ]]; then
  gh pr merge "$PR" -R "$R" --squash --match-head-commit "$HEAD"
 else hold NO_REVIEWED_MERGE_METHOD
 fi
fi
pr="$(gh pr view "$PR" -R "$R" --json headRefOid,state,mergeCommit)"
new="$(jq -r .mergeCommit.oid <<<"$pr")"
[[ "$(jq -r .state <<<"$pr")" == MERGED && "$(jq -r .headRefOid <<<"$pr")" == "$HEAD" && "$new" =~ ^[0-9a-f]{40}$ && "$(main_sha "$R")" == "$new" ]] || hold MERGE_NOT_PROVEN
# Recheck before activation. Existing target paid/nonpaid workers never stop.
[[ "$(main_sha "$T")" == "$TARGET" ]] || hold TARGET_CHANGED_AFTER_MERGE
roots
changed=0
rollback(){
 local rc=$?
 if [[ $rc != 0 && "$changed" == 1 ]]; then
  echo "PHASE5B_RELAY_ACTIVATION_ROLLBACK_EXISTING_ROUTE_AND_ENABLE" >&2
  gh variable set TRAVNR_RELAY_ROLLING_ROUTE -R "$R" --body "$old_route" || true
  gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$R" --body "$old_enabled" || true
 fi
 return "$rc"
}
trap rollback EXIT
gh variable set P6_RELAY_APPROVED_EXECUTABLE_SHA -R "$R" --body "$new"
changed=1
gh variable set TRAVNR_RELAY_ROLLING_ROUTE -R "$R" --body INDEPENDENT_WAKE
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$R" --body 1
[[ "$(v "$R" P6_RELAY_APPROVED_EXECUTABLE_SHA)" == "$new" && "$(v "$R" TRAVNR_RELAY_ROLLING_ROUTE)" == INDEPENDENT_WAKE && "$(v "$R" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 ]] || hold ROUTE_READBACK
[[ "$(v "$R" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 && "$(main_sha "$T")" == "$TARGET" && "$(effective "$R" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$TARGET" ]] || hold PRIMARY_OR_TARGET_DRIFT
changed=0
trap - EXIT
printf 'PHASE5B_MINIMAL_RELAY_DEPLOYED_CONFIG_READBACK relay=%s target=%s priorRoute=%s priorEnabled=%s noManualDispatch=1 actualNextPulseNotYetProven=1\n' "$new" "$TARGET" "$old_route" "$old_enabled"
