#!/usr/bin/env bash
# GitHub-reviewed once READ ONLY owner metadata check. No provider/DB writes.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo "HOLD_P5_MID_REGION_NO_WORKSPACE"; exit 2; }
REPO="HKcode22/ReplitTranvr"
BASE="b3a19905f7c0e9c750762bb5f78380d26b21a06b"
SOURCE="scripts/v39_phase5_mid_regional_crossover_candidates_readonly_once.mjs"
PIN="aef7c2e837c5dd7da7506c9b726274c621819370"
hold(){ printf "HOLD_P5_MID_REGION_CANDIDATES_NO_EXECUTION: %s\n" "$1" >&2; exit 2; }
for c in gh git node base64 mktemp; do
 command -v "$c" >/dev/null 2>&1 || hold "MISSING_$c"
done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
[[ -n "\${DATABASE_URL:-}" && -n "\${V39_DATABASE_RUNTIME_URL:-}" ]] || hold OWNER_DATABASE_URLS_MISSING
[[ "$DATABASE_URL" != "$V39_DATABASE_RUNTIME_URL" ]] || hold RUNTIME_DATABASE_NOT_SEPARATED
[[ -d node_modules/pg && -d scripts ]] || hold LOCAL_MODULES_MISSING
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_MISSING
STATUS="$(gh api "repos/$REPO/compare/$BASE...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_MISSING
[[ "$STATUS" == "identical" || "$STATUS" == "ahead" ]] || hold MAIN_NOT_REVIEWED_DESCENDANT
ACTUAL="$(gh api "repos/$REPO/contents/$SOURCE?ref=$LIVE" --jq '.sha')" || hold SOURCE_NOT_ON_MAIN
[[ "$ACTUAL" == "$PIN" ]] || hold REVIEWED_SOURCE_CHANGED
SUCCEEDED="$(gh api "repos/$REPO/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[]|select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")]|length')" || hold MAIN_SAFETY_STATUS_UNAVAILABLE
[[ "$SUCCEEDED" -ge 1 ]] || hold MAIN_FULL_OFFLINE_SAFETY_NOT_GREEN
TMP="$(mktemp "$PWD/scripts/.p5_mid_regional_checked_XXXXXXXX.mjs")" || hold TEMP_CREATION_FAILED
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$PIN" --jq '.content' | base64 --decode > "$TMP" || hold IMMUTABLE_SOURCE_READ_FAILED
[[ "$(git hash-object "$TMP")" == "$PIN" ]] || hold IMMUTABLE_SOURCE_SHA_MISMATCH
echo "P5_MID_REGIONAL_PINNED_SOURCE_AND_MAIN_VERIFIED_READONLY"
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP"
