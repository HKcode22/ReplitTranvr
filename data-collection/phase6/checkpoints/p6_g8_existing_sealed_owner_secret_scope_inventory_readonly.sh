#!/usr/bin/env bash
# Gate 8: inspect exact names/scope only. No secret values, no writes, no
# extra seal request, no POST dispatch. Uses existing owner-private artifact.
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
RELAY="HKcode22/TravnrClockRelay"
PIN="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY_PIN="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
ENVIRONMENT="phase6-protected-runtime"
PRIVATE="$HOME/.travnr-g8-seal-CbyqP2xW"
hold() { printf 'HOLD_P6_G8_SCOPE_READONLY_%s\n' "$1" >&2; exit 2; }

[[ "$#" == 1 && "$1" == "EXISTING_G8_SEALED_ARTIFACT_SCOPE_NAMES_READONLY_NO_REPLAY" ]] || hold CONFIRM
[[ "$(gh api user --jq '.login')" == "HKcode22" ]] || hold OWNER
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_DRIFT
[[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_PIN" ]] || hold RELAY_DRIFT

gh api "repos/$REPO/actions/runs/45026584506" |
  jq -e --arg pin "18b8b506ab21c09d30c7f56d4970fa0cb70d3ead" '
    .head_sha==$pin and .status=="completed" and .conclusion=="success" and
    .run_attempt==1 and .event=="push"
  ' >/dev/null || hold OWNER_SEALED_RUN

[[ -d "$PRIVATE" && ! -L "$PRIVATE" ]] || hold PRIVATE_DIRECTORY_MISSING
[[ -f "$PRIVATE/request.json" && -f "$PRIVATE/owner-private.pem" &&
   -f "$PRIVATE/artifact/p6-g8-owner-sealed-policy-successor.json" ]] ||
  hold ORIGINAL_PRIVATE_EVIDENCE_MISSING

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api --paginate "repos/$REPO/actions/secrets?per_page=100" \
  --jq '.secrets[].name' > "$TMP/repo" || hold REPO_NAMES_HTTP
gh api --paginate "repos/$REPO/environments/$ENVIRONMENT/secrets?per_page=100" \
  --jq '.secrets[].name' > "$TMP/env" || hold ENV_NAMES_HTTP

# Only these 13 expected names, no other metadata/values.
export P6_G8_REPO_SECRET_NAMES_FILE="$TMP/repo"
export P6_G8_ENV_SECRET_NAMES_FILE="$TMP/env"
node <<'JS'
const fs=require("node:fs");
const e=process.env;
const names=[
"P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64",
"P6_NONPAID_DAILY_POLICY_BASE64",
"P6_NONPAID_SIGNING_POLICY_BASE64",
"P6_NONPAID_TRANSPORT_TRUST_BASE64",
"P6_NATIVE_POST_POLICY_BASE64",
"P6_NONPAID_DAILY_POLICY_SHA256",
"P6_NONPAID_SIGNING_POLICY_SHA256",
"P6_NONPAID_TRANSPORT_TRUST_SHA256",
"P6_NATIVE_POST_POLICY_SHA256",
"P6_PHASE7_POST_PRESERVATION_POLICY_BASE64",
"P6_PHASE7_POST_PRESERVATION_POLICY_SHA256",
"V39_PHASE6_PROCESS_ARMED",
"V39_PHASE6_OWNER_APPROVED"
];
const get=k=>new Set(fs.readFileSync(e[k],"utf8").split(/\r?\n/).filter(Boolean));
const r=get("P6_G8_REPO_SECRET_NAMES_FILE"),v=get("P6_G8_ENV_SECRET_NAMES_FILE");
const entries=names.map(name=>{
 const a=r.has(name),b=v.has(name);
 return {name,scope:a&&b?"BOTH":a?"REPOSITORY_ONLY":b?"ENVIRONMENT_ONLY":"MISSING"};
});
const counts=Object.fromEntries(["BOTH","REPOSITORY_ONLY","ENVIRONMENT_ONLY","MISSING"]
 .map(scope=>[scope,entries.filter(x=>x.scope===scope).length]));
console.log(JSON.stringify({
 status:"P6_G8_EXISTING_SEALED_OWNER_SECRET_SCOPE_NAMES_READONLY",
 mainSha:"b432eb9a5bac7bc3c4537249e75ec7df41e8727c",
 historicalSignedPolicyRunId:45026584506,
 previousDecoderVerify:"OWNER_ENCRYPTED_SUCCESSOR_DECRYPTED_AND_VALIDATED",
 protectedEnvironment:"phase6-protected-runtime",
 entries,counts,
 providerCalls:0,databaseReads:0,databaseWrites:0,githubWrites:0,
 secretValuesRead:false,secretValuesPrinted:false,
 encryptedRequestReissued:false,paidGo:false
}));
JS
