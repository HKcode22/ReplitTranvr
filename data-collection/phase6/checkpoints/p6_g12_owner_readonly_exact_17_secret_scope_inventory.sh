#!/usr/bin/env bash
# Name-only inventory of exact sealed G12 successor scopes. Zero secret values.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
ENV="phase6-protected-runtime"
SHA="c8e065d665ccacb6d2575070e94c5500b7583044"
hold(){ echo "HOLD_P6_G12_OWNER_SCOPE_METADATA_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == INVENTORY_ONLY_G12_EXISTING_SEVENTEEN_NAMES_AND_DUAL_STOP_NO_GO ]] || hold CONFIRM
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_LOGIN
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$SHA" ]] || hold MAIN_DRIFT
NAMES=(
 V39_P5_APPROVED_CODE_SHA
 P6_NONPAID_SOURCE_APPROVED_MAIN_SHA
 V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA
 P5_CD_GH_PRE_APPROVED_CODE_SHA
 P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA
 V39_P5_QUEUE_APPROVED_CODE_SHA
 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64
 P6_NONPAID_DAILY_POLICY_BASE64
 P6_NONPAID_SIGNING_POLICY_BASE64
 P6_NONPAID_TRANSPORT_TRUST_BASE64
 P6_NATIVE_POST_POLICY_BASE64
 P6_NONPAID_DAILY_POLICY_SHA256
 P6_NONPAID_SIGNING_POLICY_SHA256
 P6_NONPAID_TRANSPORT_TRUST_SHA256
 P6_NATIVE_POST_POLICY_SHA256
 P6_PHASE7_POST_PRESERVATION_POLICY_BASE64
 P6_PHASE7_POST_PRESERVATION_POLICY_SHA256
)
[[ "${#NAMES[@]}" == 17 ]] || hold INTERNAL_SCOPE_COUNT
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$REPO/actions/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/repo" || hold REPO_NAME_READ
gh api "repos/$REPO/environments/$ENV/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/env" || hold ENV_NAME_READ
missing=0
shadows=0
for k in "${NAMES[@]}"; do
 grep -Fxq "$k" "$TMP/repo" || ((missing+=1))
 grep -Fxq "$k" "$TMP/env" && ((shadows+=1)) || true
done
stops=0
for k in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 grep -Fxq "$k" "$TMP/repo" && grep -Fxq "$k" "$TMP/env" && ((stops+=1)) || true
done
printf '{"status":"P6_G12_OWNER_17_POLICY_NAMES_METADATA_ONLY","namesExpected":17,"missingInRepository":%d,"protectedEnvironmentShadowCount":%d,"dualScopePaidStopNamesPresent":%d,"valuesNotRead":true,"providerCalls":0,"databaseWrites":0,"githubSecretWrites":0,"paidGo":false}\n' "$missing" "$shadows" "$stops"
[[ "$missing" == 0 && "$shadows" == 0 && "$stops" == 2 ]] ||
 hold REPO_ONLY_POLICIES_AND_DUAL_STOP_SCOPE_NOT_READY
echo "P6_G12_OWNER_EXACT_SEVENTEEN_REPO_ONLY_AND_TWO_DUAL_PAID_STOPS_SCOPE_PASS_NO_GO"
