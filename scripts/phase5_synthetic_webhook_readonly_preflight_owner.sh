#!/usr/bin/env bash
# Phase5 diagnostic for silent exit of existing synthetic signed webhook test.
# Prints only named yes/no predicates; no provider/POST/DB activity.
set -o pipefail
set +x
hold_count=0
check(){ local label="$1"; shift; if "$@" >/dev/null 2>&1; then printf 'PASS %s\n' "$label"; else printf 'HOLD %s\n' "$label"; hold_count=$((hold_count+1)); fi; }
has(){ [[ -n "$(printenv "$1" 2>/dev/null)" ]]; }
secret32(){ local bytes; bytes="$(printenv AERODATABOX_WEBHOOK_SECRET 2>/dev/null | wc -c | tr -d ' ')"; [[ "$bytes" =~ ^[0-9]+$ ]] && [[ "$bytes" -ge 33 ]]; }
bucket(){ [[ "$(printenv V39_PROVIDER_BLOB_BUCKET_ID 2>/dev/null)" == replit-objstore-* ]]; }
mode(){ [[ "$(printenv V39_PROVIDER_BLOB_MODE 2>/dev/null)" == required ]]; }
is_head(){ [[ "$(git rev-parse HEAD 2>/dev/null)" == 29544c30e3c9833fd85035e75999ccf2d2e021f6 ]]; }
code_hash(){ [[ "$(git hash-object scripts/v39_phase2g_verify_live_callback_v39.ts 2>/dev/null)" == cbcc4783690e6e2c9acec392ac4e644392f3ac82 ]]; }
github_hash(){
 local blob
 blob="$(gh api 'repos/HKcode22/ReplitTranvr/contents/scripts/v39_phase2g_verify_live_callback_v39.ts?ref=main' --jq .sha 2>/dev/null)" || return 1
 [[ "$blob" == cbcc4783690e6e2c9acec392ac4e644392f3ac82 ]]
}
cd "$HOME/workspace" 2>/dev/null || {
 echo 'HOLD WORKSPACE_DIRECTORY_MISSING'; exit 2
}
check LOCAL_CHECKOUT_EXACT_REVIEWED_COMMIT is_head
check LOCAL_SYNTHETIC_SCRIPT_EXACT_GIT_BLOB code_hash
check LIVE_GITHUB_SYNTHETIC_SCRIPT_UNCHANGED github_hash
check WEBHOOK_SECRET_ENV_PRESENT has AERODATABOX_WEBHOOK_SECRET
check WEBHOOK_SECRET_LENGTH_AT_LEAST_32 secret32
check RUNTIME_DATABASE_URL_ENV_PRESENT has V39_DATABASE_RUNTIME_URL
check REQUIRED_PROVIDER_BLOB_MODE mode
check REPLIT_OBJECT_STORAGE_BUCKET_ENV_VALID bucket
check TSX_LOCAL_EXECUTABLE_PRESENT test -x node_modules/.bin/tsx
if [[ $hold_count -ne 0 ]]; then
 printf 'PHASE5_SYNTHETIC_WEBHOOK_PREFLIGHT_HOLD_%s_PREDICATES; NO_POST_NO_DB_NO_PROVIDER\n' "$hold_count"
 exit 2
fi
echo 'PHASE5_SYNTHETIC_WEBHOOK_PREFLIGHT_ALL_PREDICATES_PASS_NO_POST_NO_DB_NO_PROVIDER'
