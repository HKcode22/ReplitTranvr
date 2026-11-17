#!/usr/bin/env bash
# Review-only coordination wrapper. Existing owner CLI permissions required.
# Engineering merge and existing primary expiry re-pin, never Phase6 GO.
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
OLD=de15816bccb867dc17dcd396f8bedec66960e115
HEAD_PIN=cfce6e3693eab1244f8d7fec65d6da676d4471c4
TREE_PIN=b8b8224f07dd1b0bf5696a93e7a170bbd8631e51
HELPER_BLOB=75445a273f2901b603bd1a4e46914c6776dedb22
TEST_BLOB=72d36f1950027649c6bfefbef692ef9c9718a927
WF=phase5-primary-fids-expiry-no-provider.yml
PIN=P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA
APPROVAL=APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
RUNS='[44088415233,44088415075,44088415284,44088415127,44088415058,44088414936,44088415023,44088415252,44088414959,44088415059]'
hold() { printf 'HOLD_P5_COMPACT_MERGE_REPIN: %s\n' "$1" >&2; exit 2; }
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
fetch_blob "$HELPER_BLOB" "$TMP/p5_compact_expiry_repin_owner.cjs"
fetch_blob "$TEST_BLOB" "$TMP/p5_compact_expiry_repin_owner.test.cjs"
node --check "$TMP/p5_compact_expiry_repin_owner.cjs"
node --test "$TMP/p5_compact_expiry_repin_owner.test.cjs"
verify_pr() {
  local p synthetic
  p="$(api pulls/862)"
  jq -e --arg h "$HEAD_PIN" --arg b "$OLD" '.state=="open" and .merged==false and .mergeable==true and .head.sha==$h and .base.sha==$b and .base.ref=="main"' <<<"$p" >/dev/null || hold EXACT_PR_NOT_MERGEABLE
  synthetic="$(jq -er '.merge_commit_sha' <<<"$p")"
  [[ "$synthetic" =~ ^[a-f0-9]{40}$ ]] || hold PR_TEST_MERGE_SHA_MISSING
  api "git/commits/$synthetic" | jq -e --arg t "$TREE_PIN" --arg b "$OLD" --arg h "$HEAD_PIN" '.tree.sha==$t and ([.parents[].sha]==[$b,$h])' >/dev/null || hold TEST_MERGE_TREE_DRIFT
  jq -r '.draft' <<<"$p"
}
verify_ci() {
  local rows
  rows="$(gh api --method GET "repos/$REPO/actions/runs" -f head_sha="$HEAD_PIN" -f per_page=100)"
  jq -e --arg h "$HEAD_PIN" --argjson expected "$RUNS" '(.total_count==10) and (([.workflow_runs[].id]|sort)==($expected|sort)) and all(.workflow_runs[]; .head_sha==$h and .event=="pull_request" and .run_attempt==1 and .status=="completed" and .conclusion=="success")' <<<"$rows" >/dev/null || hold EXACT_COMBINED_CI_NOT_GREEN
}
draft="$(verify_pr)"
verify_ci
require_config
printf '\nReviewed compact engineering tree: %s\nEngineering merge only; no provider/DB/paid activation.\n' "$TREE_PIN"
# Explicitly invoking this hash-pinned owner wrapper is the one operator action.
# All machine gates remain; no extra typed password or confirmation phrase.
require_config
verify_ci
[[ "$(verify_pr)" == "$draft" ]] || hold PR_STATE_CHANGED
if [[ "$draft" == true ]]; then
  gh pr ready 862 -R "$REPO" >/dev/null || hold READY_ACK_UNKNOWN_INSPECT_NO_REPLAY
fi
[[ "$(verify_pr)" == false ]] || hold PR_STILL_DRAFT
verify_ci
require_config
# GitHub enforces repository merge rules; no admin or force override.
if ! merge_result="$(gh api --method PUT "repos/$REPO/pulls/862/merge" -f sha="$HEAD_PIN" -f merge_method=merge)"; then
  hold MERGE_ACK_UNKNOWN_INSPECT_MAIN_AND_PIN_NO_REPLAY
fi
jq -e '.merged==true and (.sha|test("^[a-f0-9]{40}$"))' <<<"$merge_result" >/dev/null || hold MERGE_NOT_CONFIRMED_INSPECT_MAIN_AND_PIN
NEW="$(jq -er '.sha' <<<"$merge_result")"
[[ "$(main_sha)" == "$NEW" ]] || hold MERGED_MAIN_CHANGED_INSPECT_PIN
[[ "$(api "git/commits/$NEW" | jq -er '.tree.sha')" == "$TREE_PIN" ]] || hold MERGED_TREE_DRIFT_INSPECT_PIN
printf 'P5_COMPACT_ENGINEERING_MERGE_OBSERVED %s\n' "$NEW"
# Coordinated exact-main re-pin uses the existing approval, not a new paid release.
# If any step below fails, inspect pin/run state; never replay APPLY or revert blindly.
P5_COMPACT_OWNER_WRAPPER_EXECUTED=1 node "$TMP/p5_compact_expiry_repin_owner.cjs" --repin "$NEW"
