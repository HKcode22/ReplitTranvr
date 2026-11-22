#!/usr/bin/env bash
# One owner-only, no-provider Gate3 V0108 install + nonpaid retention SHA pin
# readbacks. Does NOT change SOURCE auth, static private policy secrets,
# paid GO, cron service, flight objects, or research records.
set -Eeuo pipefail
set +x
umask 077
hold(){ echo "HOLD_P6_G3_OWNER_FINAL_$1" >&2; exit 2; }
R=HKcode22/ReplitTranvr
RELAY=HKcode22/TravnrClockRelay
OLD=fe3fef5dbddc3577d585f778385677979031cd64
REVIEWED_HEAD=3bb42d7c6ae71896de592665abe2f95b1d787ffb
INSTALL_BLOB=00dadbf56241103f650b62781c059d628df5ec70
MIG_BLOB=ee626ee1ad90b6c7e281565ade5a79930eeeb74b
RELAY_BLOB=66e10596b138a9c6d0b2872586d8448126dc26fc
PROFILE=V0108_RECOVERY_METADATA_ONLY
APPROVAL=INSTALL_EXACT_V0108_EMPTY_CUSTODY_NO_PROVIDER_AND_READBACK
[[ "$#" -eq 1 && "$1" == COMMISSION_EXACT_G3_V0108_NONPAID_ONLY ]] || hold CONFIRM
command -v jq >/dev/null && command -v node >/dev/null && command -v gh >/dev/null && command -v git >/dev/null || hold PREREQUISITES
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold GITHUB_OWNER
PR="$(gh api "repos/$R/pulls/964")"
echo "$PR" | jq -e --arg h "$REVIEWED_HEAD" '.merged==true and .head.sha==$h and .merge_commit_sha!=null' >/dev/null || hold EXACT_CORRECTION_PR_NOT_MERGED
PIN="$(echo "$PR" | jq -er .merge_commit_sha)"
[[ "$PIN" =~ ^[a-f0-9]{40}$ ]] || hold MAIN_SHA_INVALID
pin(){ [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$PIN" ]] || hold CURRENT_MAIN_MOVED; }
pin
[[ "$(gh api "repos/$R/contents/scripts/v39_phase6_v0108_owner_once_v39.mjs?ref=main" --jq .sha)" == "$INSTALL_BLOB" ]] || hold EXACT_INSTALLER_BLOB
[[ "$(gh api "repos/$R/contents/migrations/staged/V0108__phase6_private_operational_metadata_expiry_class_v39.sql?ref=main" --jq .sha)" == "$MIG_BLOB" ]] || hold EXACT_MIGRATION_BLOB
[[ "$(gh api "repos/$RELAY/contents/relay.mjs?ref=main" --jq .sha)" == "$RELAY_BLOB" ]] || hold EXACT_RELAY_BACKSTOP
# Authenticate both repositories and all fixed existing nonpaid pin settings
# BEFORE the only database write, so a missing GH permission cannot surprise us.
gh api "repos/$R/actions/variables?per_page=1" >/dev/null || hold TARGET_VARS_PERMISSION
gh api "repos/$RELAY/actions/variables?per_page=1" >/dev/null || hold RELAY_VARS_PERMISSION
get_target(){ gh api "repos/$R/actions/variables/$1" --jq .value; }
old_or_new(){ [[ "$1" == "$OLD" || "$1" == "$PIN" ]] || hold UNREVIEWED_EXISTING_MAIN_PIN; }
for key in P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA; do
 value="$(get_target "$key")" || hold MISSING_RETENTION_MAIN_PIN
 old_or_new "$value"
done
# Resolve optional GitHub Actions variables using exit status, never the
# JSON error body emitted by gh for HTTP 404. Independently list the exact
# scope after a lookup failure to distinguish NOT FOUND from 403/network.
get_optional_variable(){
 local endpoint="$1" item scope listing value
 if value="$(gh api "$endpoint" --jq .value 2>/dev/null)"; then
   printf '%s' "$value"
   return 0
 fi
 item="${endpoint##*/}"
 scope="${endpoint%/*}"
 listing="$(gh api "$scope?per_page=100" --paginate --jq '.variables[].name' 2>/dev/null)" || hold OPTIONAL_SCOPE_LIST_FAILED
 if grep -Fxq -- "$item" <<< "$listing"; then hold OPTIONAL_VARIABLE_LOOKUP_FAILED; fi
 printf ''
}
P_CURRENT="$(get_optional_variable "repos/$R/actions/variables/P6_PRIVATE_EPOCH_DEADLINE_PROFILE")"
# This exact reviewed main only implements V0105 and
# V0108_RECOVERY_METADATA_ONLY. An unsupported legacy value cannot execute
# private retention (it fails the runtime profile allowlist). It is NOT a
# license to clear a deliberate safety STOP or to bypass an unknown marker.
if [[ -n "$P_CURRENT" && "$P_CURRENT" != V0105 && "$P_CURRENT" != "$PROFILE" ]]; then
  [[ ${#P_CURRENT} -le 100 && "$P_CURRENT" =~ ^[a-zA-Z0-9_.:-]+$ ]] || hold INVALID_PROFILE_VALUE_SHAPE
  [[ ! "$P_CURRENT" =~ (STOP|HOLD|DISABLED|QUARANTINE|NO_GO|DO_NOT|PAUSE|FREEZE|CANCEL|INHIBIT|BLOCKED) ]] || hold EXPLICIT_SAFETY_STOP_PROFILE
  printf '%s\n' '{"status":"P6_G3_UNSUPPORTED_LEGACY_PROFILE_DETECTED","action":"REPAIR_ONLY_AFTER_EXACT_V0108_OWNER_READBACK","databaseWrites":0,"phase6PaidGo":false}'
fi
R_REPO="$(get_optional_variable "repos/$RELAY/actions/variables/TRAVNR_APPROVED_TARGET_MAIN_SHA")"
R_ENV="$(get_optional_variable "repos/$RELAY/environments/travnr-target-forward/variables/TRAVNR_APPROVED_TARGET_MAIN_SHA")"
[[ -n "$R_REPO" || -n "$R_ENV" ]] || hold NO_EXISTING_RELAY_PIN
if [[ -n "$R_REPO" ]]; then old_or_new "$R_REPO"; fi
if [[ -n "$R_ENV" ]]; then old_or_new "$R_ENV"; fi
TMP="$(mktemp -d "$PWD/scripts/.p6-g3-exact-owner-XXXXXXXX")"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/git/blobs/$INSTALL_BLOB" --jq .content | base64 --decode > "$TMP/install.mjs"
[[ "$(git hash-object "$TMP/install.mjs")" == "$INSTALL_BLOB" ]] || hold OWNER_SCRIPT_HASH
node --check "$TMP/install.mjs"
# Exact existing Neon owner identity is verified in code; never use another DB,
# update SOURCE authorization, or bypass a mismatch or uncertain COMMIT.
export P6_V0108_REVIEWED_MAIN_SHA="$PIN"
export ADB_AUTO_COLLECT=0
export V39_PHASE6_PROCESS_ARMED=0
node "$TMP/install.mjs" review > "$TMP/before.json" || hold OWNER_READONLY_PREFLIGHT
cat "$TMP/before.json"
jq -e --arg p "$PIN" '
  (.mainSha==$p and .sourceEnabled==true and .reviewedCodeAncestor==true and
   .packets==0 and .indexes==0 and .deletionStops==0 and
   (.status=="V0108_OWNER_READONLY_REVIEW_NO_GO" or
    .status=="V0108_EXACT_CATALOG_ALREADY_INSTALLED_NO_REPLAY"))
' "$TMP/before.json" >/dev/null || hold DB_SCOPE_BEFORE_APPLY
pin
if jq -e '.status=="V0108_OWNER_READONLY_REVIEW_NO_GO"' "$TMP/before.json" >/dev/null; then
  P6_V0108_OWNER_APPROVAL="$APPROVAL" node "$TMP/install.mjs" apply > "$TMP/apply.json" || hold DB_COMMIT_UNKNOWN_READONLY_RECONCILE_NO_REPLAY
  cat "$TMP/apply.json"
  jq -e --arg p "$PIN" '.status=="V0108_EXACT_OWNER_FUNCTIONS_COMMITTED_NEW_SESSION_READBACK_NO_PAID_GO" and .mainSha==$p and .sourceEnabled==true and .packets==0 and .indexes==0 and .deletionStops==0 and .paidGo==false' "$TMP/apply.json" >/dev/null || hold DB_COMMIT_READBACK
fi
node "$TMP/install.mjs" review > "$TMP/after.json" || hold FINAL_DB_READBACK
cat "$TMP/after.json"
jq -e --arg p "$PIN" '.status=="V0108_EXACT_CATALOG_ALREADY_INSTALLED_NO_REPLAY" and .mainSha==$p and .sourceEnabled==true and .reviewedCodeAncestor==true and .packets==0 and .indexes==0 and .deletionStops==0 and .paidGo==false' "$TMP/after.json" >/dev/null || hold DB_AFTER_DRIFT
pin
# Only fixed nonpaid retention/profile vars. Do not mutate private 31-value
# SOURCE/PRE/POST secrets or protected review approvals.
if [[ "$P_CURRENT" != "$PROFILE" ]]; then
  # Fail closed if another owner changed the variable during Neon install.
  live="$(get_optional_variable "repos/$R/actions/variables/P6_PRIVATE_EPOCH_DEADLINE_PROFILE")"
  [[ "$live" == "$P_CURRENT" ]] || hold CONCURRENT_PROFILE_REVIEW_REQUIRED
  gh variable set P6_PRIVATE_EPOCH_DEADLINE_PROFILE --body "$PROFILE" -R "$R" || hold PROFILE_WRITE
fi
for key in P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA; do
  pin
  cur="$(get_target "$key")" || hold READBACK_PIN
  old_or_new "$cur"
  if [[ "$cur" != "$PIN" ]]; then
    gh variable set "$key" --body "$PIN" -R "$R" || hold TARGET_PIN_WRITE
  fi
done
if [[ -n "$R_REPO" && "$R_REPO" != "$PIN" ]]; then
  pin
  gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA --body "$PIN" -R "$RELAY" || hold RELAY_REPO_PIN_WRITE
fi
if [[ -n "$R_ENV" && "$R_ENV" != "$PIN" ]]; then
  pin
  gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA --body "$PIN" -R "$RELAY" --env travnr-target-forward || hold RELAY_ENV_PIN_WRITE
fi
[[ "$(get_target P6_PRIVATE_EPOCH_DEADLINE_PROFILE)" == "$PROFILE" ]] || hold PROFILE_READBACK
for key in P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA; do
 [[ "$(get_target "$key")" == "$PIN" ]] || hold TARGET_PIN_READBACK
done
if [[ -n "$R_REPO" ]]; then
 [[ "$(gh api "repos/$RELAY/actions/variables/TRAVNR_APPROVED_TARGET_MAIN_SHA" --jq .value)" == "$PIN" ]] || hold RELAY_REPO_READBACK
fi
if [[ -n "$R_ENV" ]]; then
 [[ "$(gh api "repos/$RELAY/environments/travnr-target-forward/variables/TRAVNR_APPROVED_TARGET_MAIN_SHA" --jq .value)" == "$PIN" ]] || hold RELAY_ENV_READBACK
fi
pin
[[ "$(gh api "repos/$RELAY/contents/relay.mjs?ref=main" --jq .sha)" == "$RELAY_BLOB" ]] || hold RELAY_REREAD
jq -nc --arg pin "$PIN" --arg profile "$PROFILE" '{
 status:"P6_GATE3_V0108_REAL_OWNER_EXACT_INSTALL_AND_NONPAID_PINS_PASS",
 actualMainSha:$pin,installedProfile:$profile,
 sourceAuthorizationPreserved:true,providerCalls:0,
 sourceContentDeleted:0,paidGo:false,
 protectedSourcePrePostStaticSecretsNotModified:true,
 independentRetentionWorkflowRunStillRequired:true
}'
