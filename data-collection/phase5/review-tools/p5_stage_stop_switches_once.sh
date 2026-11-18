#!/usr/bin/env bash
# Existing GitHub owner session only. No provider, DB, dispatch, credential or approval upload.
set -Eeuo pipefail
set +x
umask 077
export GH_PROMPT_DISABLED=1
REPO='HKcode22/ReplitTranvr'
PIN='6f518add10d00567a95fbcaf3650ebf608da8a60'
MODE="${1:-review}"
[[ $# -le 1 && ( "$MODE" == review || "$MODE" == apply-explicit-stop-only ) ]] || { echo HOLD_P5_STOP_SCOPE_INVALID_MODE >&2; exit 2; }
hold(){ printf 'HOLD_P5_STOP_SCOPE_%s_NO_AUTOMATIC_REPLAY\n' "$1" >&2; exit 2; }
for cmd in gh mktemp; do command -v "$cmd" >/dev/null || hold MISSING_COMMAND; done
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
remote_main(){ gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
require_main(){ local sha; sha="$(remote_main)" || hold MAIN_READ_FAILED; [[ "$sha" == "$PIN" ]] || hold MAIN_CHANGED; }
declare -A present=()
list_names(){
  gh api --paginate "repos/$REPO/actions/secrets?per_page=100" --jq '.secrets[].name' > "$TMP/raw" || hold SECRET_NAME_READ_FAILED
  present=()
  local n
  while IFS= read -r n || [[ -n "$n" ]]; do
    [[ "$n" =~ ^[A-Z_][A-Z0-9_]*$ ]] || hold SECRET_NAME_FORMAT
    present["$n"]=1
  done < "$TMP/raw"
  # Production retention is a separate commissioned path; no touch or requirement to disable it.
}
exists(){ [[ "${present[$1]+x}" == x ]]; }
names=(V39_PHASE6_PROCESS_ARMED P5_CD_GH_PRE_STOP P5_CD_GH_PRE_ARMED P5_CD_GH_PREPARE_ARMED)
values=(0 1 0 0)
# Any changed release/approval context means stop instead of interfering with another review.
protected=(
  P5_CD_GH_E_ROUTE_FEATURES_APPROVED P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED
  P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED P5_CD_GH_PRIVATE_CURRENT_APPROVED
  P5_CD_GH_STANDALONE_LATER_APPROVED P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256
  P5_CD_GH_T24_PREPARE_APPROVED P5_CD_GH_T24_WITNESS_APPROVED
  P6_INERT_CALENDAR_REVIEW_APPROVED P6_INERT_COST_REVIEW_APPROVED P6_NATIVE_LATER_RUNTIME_APPROVED
  P6_NATIVE_POST_PRODUCER_APPROVED P6_NONPAID_SOURCE_RUNTIME_APPROVED
  P6_PRIVATE_POST_CHILD_APPROVED P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED P6_PRIVATE_POST_PARENT_APPROVED
  P6_PRIVATE_POST_STORED_REVIEW_APPROVED P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED
  P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED P6_PRIVATE_SOURCE_TRANSPORT_APPROVED
  P6_T24_CUSTODY_APPROVED V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED V39_P5_AUTO_SOURCE_DISPATCH_APPROVED
  V39_P5_EARLY_DRAW_OWNER_APPROVED V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED V39_P5_POST_OWNER_APPROVED
  V39_P5_PREPARE_OWNER_APPROVED V39_P5_SEVEN_REST_BUDGET_SIGNED V39_P5_SIGNED_DAY_REGISTRY_RELEASE
  V39_P5_SOURCE_DB_ROLE_REVIEWED V39_P5_SOURCE_OWNER_APPROVED V39_P5_SOURCE_QUEUE_OWNER_APPROVED
  V39_PHASE5_FREEZE_SIGNED V39_PHASE5_SOURCE_RIGHTS_APPROVED
  P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64 P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64
  P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64 P6_PRIVATE_DAY_REVIEWER_KEY_BASE64
  P6_PRIVATE_LATER_REVIEWER_KEY_BASE64 P6_PRIVATE_POST_REVIEWER_KEY_BASE64 P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64
)
check_absent_approval(){ local n; for n in "${protected[@]}"; do if exists "$n"; then hold RELEASE_CONTEXT_CHANGED; fi; done; }
require_main; list_names; check_absent_approval
for n in "${names[@]}"; do if exists "$n"; then hold STOP_NAME_ALREADY_PRESENT_RECONCILE; fi; done
if [[ "$MODE" == review ]]; then
  printf '%s\n' 'P5_STOP_ONLY_PREFLIGHT_READY_NO_WRITES' 'V39_PHASE6_PROCESS_ARMED=0' 'P5_CD_GH_PRE_STOP=1' 'P5_CD_GH_PRE_ARMED=0' 'P5_CD_GH_PREPARE_ARMED=0'
  exit 0
fi
# Each write is only to an absent name, with the exact stopped value. GitHub
# offers no atomic create-if-absent or plaintext readback; coordinate with other
# owners. Never retry an uncertain write or pretend presence proves a value.
for i in "${!names[@]}"; do
  require_main; list_names; check_absent_approval
  for j in "${!names[@]}"; do
    if (( j < i )); then exists "${names[j]}" || hold PREVIOUS_STOP_NAME_DISAPPEARED
    else if exists "${names[j]}"; then hold STOP_NAME_ALREADY_PRESENT_RECONCILE; fi
    fi
  done
  if ! printf '%s' "${values[i]}" | gh secret set "${names[i]}" --repo "$REPO"; then hold SECRET_WRITE_UNKNOWN; fi
  printf 'P5_STOP_WRITE_ACKNOWLEDGED %s\n' "${names[i]}"
done
require_main; list_names; check_absent_approval
for n in "${names[@]}"; do exists "$n" || hold FINAL_NAME_READBACK_FAILED; done
printf '%s\n' '{"status":"P5_EXPLICIT_STOP_SWITCHES_WRITES_ACKNOWLEDGED_NAMES_READ_BACK","stopSwitches":4,"plaintextValuesIndependentlyVerified":false,"providerCalls":0,"databaseWrites":0,"workflowDispatches":0,"signerUploads":0,"approvalFlagsSet":0,"phase6PaidGo":false}'
