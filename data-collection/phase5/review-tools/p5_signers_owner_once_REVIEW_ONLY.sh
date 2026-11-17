#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077
REPO='HKcode22/ReplitTranvr'
PIN='6f518add10d00567a95fbcaf3650ebf608da8a60'
BLOB='72a204a6586d01c3acfe63030fa3b68201c88bb4'
export GH_PROMPT_DISABLED=1
for cmd in gh git node base64 grep; do command -v "$cmd" >/dev/null || { echo "HOLD_P5_SIGNERS_MISSING_${cmd}" >&2; exit 2; }; done
remote_main() { gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha'; }
[[ "$(remote_main)" == "$PIN" ]] || { echo HOLD_P5_SIGNERS_MAIN_CHANGED >&2; exit 2; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api --paginate "repos/$REPO/actions/secrets?per_page=100" --jq '.secrets[].name' > "$TMP/names"
for name in P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64 P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64 P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64 P6_PRIVATE_DAY_REVIEWER_KEY_BASE64 P6_PRIVATE_LATER_REVIEWER_KEY_BASE64 P6_PRIVATE_POST_REVIEWER_KEY_BASE64 P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64; do
  if grep -Fxq "$name" "$TMP/names"; then echo HOLD_P5_SIGNERS_EXISTING_REPOSITORY_SIGNER_RECONCILE >&2; exit 2; fi
done
gh api "repos/$REPO/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP/candidates.cjs"
[[ "$(git hash-object "$TMP/candidates.cjs")" == "$BLOB" ]] || { echo HOLD_P5_SIGNERS_BLOB_MISMATCH >&2; exit 2; }
node --check "$TMP/candidates.cjs"
[[ "$(remote_main)" == "$PIN" ]] || { echo HOLD_P5_SIGNERS_MAIN_CHANGED >&2; exit 2; }
node "$TMP/candidates.cjs"
node <<'NODE'
console.log(JSON.stringify({status:'P5_EXISTING_PROVIDER_ENV_PRESENCE_ONLY',aerodataboxApiKeyEnvironmentPresent:Boolean(process.env.AERODATABOX_API_KEY),rapidapiKeyEnvironmentPresent:Boolean(process.env.RAPIDAPI_KEY),valuesPrinted:false,accountEntitlementVerified:false,providerCalls:0,githubSecretWrites:0,phase6PaidGo:false}));
NODE
[[ "$(remote_main)" == "$PIN" ]] || { echo HOLD_P5_SIGNERS_MAIN_CHANGED_CANDIDATES_RETAINED >&2; exit 2; }
echo P5_LOCAL_CANDIDATE_KEY_CUSTODY_COMPLETE_NO_GO
