#!/usr/bin/env bash
# Review-only coordination wrapper. Existing owner CLI permissions required.
# Engineering merge and existing primary expiry re-pin, never Phase6 GO.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
OLD=f53a36a787351b9859ff7910d7f5cab41c1d77a2
HEAD_PIN=ef819e1d9bd61c34b7c7bc8cf90a805dd03a6724
TREE_PIN=f4ccdec1f1eceee527ed9bc0f423b223bc63a01c
HELPER_BLOB=4bb2c19926a0b5adcbb5856514598d3b92990716
TEST_BLOB=0e67cb5f47feed8547407babd1abbfee6448bcc0
WF=phase5-primary-fids-expiry-no-provider.yml
PIN=P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
APPROVAL=APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
RUNS='[44058158093,44058158020,44058158530,44058158457,44058158214,44058158131,44058158509,44058158028,44058158289,44058158405,44058158237,44058158461,44058158306,44058158291]'
hold() { printf 'HOLD_P5_IDENTITY_MERGE_REPIN: %s\n' "$1" >&2; exit 2; }
[[ "$#" == 0 && "${GITHUB_ACTIONS:-}" != true ]] || hold OWNER_LOCAL_ONLY
for x in gh git node jq base64 mktemp; do command -v "$x" >/dev/null || hold "MISSING_$x"; done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
api() { gh api "repos/$REPO/$1"; }
variable() { gh variable get "$1" -R "$REPO"; }
main_sha() { api git/ref/heads/main | jq -er '.object.sha'; }
require_config() {
  [[ "$(main_sha)" == "$OLD" ]] || hold MAIN_CHANGED_REVIEW_REQUIRED
  [[ "$(variable "$PIN")" == "$OLD" ]] || hold EXISTING_PRIMARY_PIN_CHANGED
  [[ "$(variable P5_PRIMARY_FIDS_EXPIRY_ENABLED)" == true ]] || hold PRIMARY_NOT_ENABLED
  [[ "$(variable P5_PRIMARY_FIDS_EXPIRY_APPROVAL)" == "$APPROVAL" ]] || hold PRIMARY_APPROVAL_CHANGED
  [[ "$(variable P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)" == "$ENDPOINT" ]] || hold ENDPOINT_CHANGED
  [[ "$(api "actions/workflows/$WF" | jq -er '.state')" == active ]] || hold PRIMARY_WORKFLOW_NOT_ACTIVE
  # Missing scheduling variables are STOP defaults; never print their values.
  local listed value flag
  listed="$(gh variable list -R "$REPO" --json name)"
  jq -e 'type=="array" and all(.[]; (.name|type)=="string") and ((map(.name)|unique|length)==length)' <<<"$listed" >/dev/null || hold SCHEDULE_VARIABLE_LIST_INVALID
  for flag in P5_AUTO_SOURCE_DISPATCH_ENABLED P5_POST_AUTO_DISPATCH_ENABLED P5_T24_AUTO_DISPATCH_ENABLED P5_LATER_PRE_AUTO_DISPATCH_ENABLED P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED P6_PRIVATE_POST_PARENT_ENABLED P6_ROLLING_CONTROLLER_ENABLED; do
    if jq -e --arg n "$flag" 'any(.[]; .name==$n)' <<<"$listed" >/dev/null; then
      value="$(variable "$flag")" || hold SCHEDULE_VARIABLE_READ_UNKNOWN
      [[ "$value" == false || "$value" == 0 || -z "$value" ]] || hold "UNEXPECTED_PAID_OR_LEGACY_ENABLE_$flag"
    fi
  done
}
ENDPOINT="$(variable P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)"
[[ "$ENDPOINT" =~ ^[a-f0-9]{64}$ ]] || hold ENDPOINT_PIN_MISSING
require_config
names="$(gh secret list -R "$REPO" --json name)"
jq -e '([.[].name] | (index("P5_PRIMARY_FIDS_SWEEP_DATABASE_URL") != null and index("P5_RETENTION_READER_DATABASE_URL") != null))' <<<"$names" >/dev/null || hold EXISTING_SECRET_NAMES_MISSING
fetch_blob() {
  local blob="$1" dest="$2"
  api "git/blobs/$blob" | jq -er '.content' | base64 --decode > "$dest"
  [[ "$(git hash-object "$dest")" == "$blob" ]] || hold REVIEW_BLOB_MISMATCH
}
fetch_blob "$HELPER_BLOB" "$TMP/p5_primary_expiry_repin_enabled.cjs"
fetch_blob "$TEST_BLOB" "$TMP/p5_primary_expiry_repin_enabled.test.cjs"
node --check "$TMP/p5_primary_expiry_repin_enabled.cjs"
node --test "$TMP/p5_primary_expiry_repin_enabled.test.cjs"
verify_pr() {
  local p synthetic
  p="$(api pulls/859)"
  jq -e --arg h "$HEAD_PIN" --arg b "$OLD" '.state=="open" and .merged==false and .mergeable==true and .head.sha==$h and .base.sha==$b and .base.ref=="main"' <<<"$p" >/dev/null || hold EXACT_PR_NOT_MERGEABLE
  synthetic="$(jq -er '.merge_commit_sha' <<<"$p")"
  [[ "$synthetic" =~ ^[a-f0-9]{40}$ ]] || hold PR_TEST_MERGE_SHA_MISSING
  api "git/commits/$synthetic" | jq -e --arg t "$TREE_PIN" --arg b "$OLD" --arg h "$HEAD_PIN" '.tree.sha==$t and ([.parents[].sha]==[$b,$h])' >/dev/null || hold TEST_MERGE_TREE_DRIFT
  jq -r '.draft' <<<"$p"
}
verify_ci() {
  local rows
  rows="$(gh api --method GET "repos/$REPO/actions/runs" -f head_sha="$HEAD_PIN" -f per_page=100)"
  jq -e --arg h "$HEAD_PIN" --argjson expected "$RUNS" '(.total_count==14) and (([.workflow_runs[].id]|sort)==($expected|sort)) and all(.workflow_runs[]; .head_sha==$h and .event=="pull_request" and .run_attempt==1 and .status=="completed" and .conclusion=="success")' <<<"$rows" >/dev/null || hold EXACT_COMBINED_CI_NOT_GREEN
}
draft="$(verify_pr)"
verify_ci
require_config
printf '\nReviewed combined identity tree: %s\nEngineering merge only; no provider/DB/paid activation.\n' "$TREE_PIN"
printf 'Type MERGE PR 859 %s to proceed: ' "$HEAD_PIN" >/dev/tty
IFS= read -r answer </dev/tty || hold OWNER_DECLINED
[[ "$answer" == "MERGE PR 859 $HEAD_PIN" ]] || hold OWNER_DECLINED
require_config
verify_ci
[[ "$(verify_pr)" == "$draft" ]] || hold PR_STATE_CHANGED
if [[ "$draft" == true ]]; then
  gh pr ready 859 -R "$REPO" >/dev/null || hold READY_ACK_UNKNOWN_INSPECT_NO_REPLAY
fi
[[ "$(verify_pr)" == false ]] || hold PR_STILL_DRAFT
verify_ci
require_config
# GitHub enforces repository merge rules; no admin or force override.
if ! merge_result="$(gh api --method PUT "repos/$REPO/pulls/859/merge" -f sha="$HEAD_PIN" -f merge_method=merge)"; then
  hold MERGE_ACK_UNKNOWN_INSPECT_MAIN_AND_PIN_NO_REPLAY
fi
jq -e '.merged==true and (.sha|test("^[a-f0-9]{40}$"))' <<<"$merge_result" >/dev/null || hold MERGE_NOT_CONFIRMED_INSPECT_MAIN_AND_PIN
NEW="$(jq -er '.sha' <<<"$merge_result")"
[[ "$(main_sha)" == "$NEW" ]] || hold MERGED_MAIN_CHANGED_INSPECT_PIN
[[ "$(api "git/commits/$NEW" | jq -er '.tree.sha')" == "$TREE_PIN" ]] || hold MERGED_TREE_DRIFT_INSPECT_PIN
printf 'P5_IDENTITY_ENGINEERING_MERGE_OBSERVED %s\n' "$NEW"
# Existing helper requires explicit confirmation of the actual new main SHA.
# If any step below fails, inspect pin/run state; never replay APPLY or revert blindly.
node "$TMP/p5_primary_expiry_repin_enabled.cjs" --repin "$NEW"
