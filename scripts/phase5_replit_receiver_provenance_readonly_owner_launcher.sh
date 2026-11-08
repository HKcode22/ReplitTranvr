#!/usr/bin/env bash
# Phase5 exact-Git-blob receiver provenance only: no reset, no publisher, no provider.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo 'HOLD_P5_RECEIVER_WORKSPACE_MISSING'; exit 2; }
R='HKcode22/ReplitTranvr'
BASE='329490356422d5af01594fb49ef05949168ee60f'
FILE='scripts/v39_phase5_replit_receiver_deployment_readonly_once.mjs'
BLOB='5c2d2dea66751a31ad35bf7c722813ca8cb32fc4'
hold() { echo "HOLD_P5_RECEIVER_READONLY: $1" >&2; exit 2; }
for c in gh git node base64; do
  command -v "$c" >/dev/null 2>&1 || hold "MISSING_TOOL_$c"
done
gh auth status --hostname github.com >/dev/null 2>&1 || hold GH_AUTH_MISSING
LIVE="$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_NOT_AVAILABLE
ANCESTRY="$(gh api "repos/$R/compare/$BASE...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_UNAVAILABLE
[[ "$ANCESTRY" == ahead || "$ANCESTRY" == identical ]] || hold MAIN_NOT_REVIEWED_DESCENDANT
GIT_BLOB="$(gh api "repos/$R/contents/$FILE?ref=$LIVE" --jq '.sha')" || hold CODE_NOT_ON_MAIN
[[ "$GIT_BLOB" == "$BLOB" ]] || hold CODE_CHANGED_SINCE_REVIEW
CI="$(gh api "repos/$R/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")] | length')" || hold MAIN_CI_UNAVAILABLE
[[ "$CI" -ge 1 ]] || hold MAIN_CI_NOT_GREEN
# Pipefail ensures incomplete download / decode cannot fake a success.
echo 'PHASE5_RECEIVER_REVIEWED_READONLY_CODE_PIN_OK; NO_GIT_MUTATION_NO_PUBLISH'
gh api "repos/$R/git/blobs/$BLOB" --jq '.content' |
 base64 --decode |
 env P5_RECEIVER_READONLY_CLI=1 node --input-type=module
