#!/usr/bin/env bash
# Exact P25 YSSY historical ADMIN-ONLY metadata closeout, at most once.
# NEVER invoke this without a fresh *explicit* owner instruction approving
# resolution of exactly incident IDs 31/32 and closure of only the P25 budget.
# No paid AeroDataBox CREATE/DELETE/flight calls or webhook test.
set -Eeuo pipefail
set +x
umask 077
cd "$HOME/workspace" || { echo "HOLD_P25_ADMIN_APPLY_OWNER_WORKSPACE_MISSING"; exit 2; }
REPO='HKcode22/ReplitTranvr'
LOCAL_PIN='a2d75104cfa4c74d6936da4bc06bf15939671cc0'
HISTORICAL_PIN='29544c30e3c9833fd85035e75999ccf2d2e021f6'
DB_BLOB='6986e2467b9df6da9715e8890730979da8acf204'
LIMITER_BLOB='c6438e63181fe76c7aa0217504a8d5888ad00ec3'
PURE_BLOB='df10e4d943fb98c06c3f8eaef356ec5ee829b2f0'
RUNNER_BLOB='fec8e8f7da7f89495b0e65fc33225f453c222e68'
HELPER='server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39.ts'
OLD_SYNTHETIC_ONCE='artifacts/phase5-synthetic-signed-post-a2d75104-once.lock'
APPLY_ONCE='artifacts/phase5-p25-exact-31-32-budget-admin-apply-once.lock'
OWNER_CONFIRM='APPROVE_P25_ONLY_RESOLVE_INCIDENTS_31_32_CLOSE_BUDGET_PRESERVE_FAILED_GAP2'
RUNNER=''
HELPER_CREATED=0
STARTED=0
cleanup(){
  local code=$?
  if [[ -n "$RUNNER" && -f "$RUNNER" ]]; then rm -f -- "$RUNNER"; fi
  if [[ "$HELPER_CREATED" == 1 && -f "$HELPER" ]]; then rm -f -- "$HELPER"; fi
  if [[ "$STARTED" == 1 && "$code" != 0 ]]; then
    echo "HOLD_P25_APPLY_AMBIGUOUS_ONCE_MARKER_PRESERVED; NO_RETRY; RUN_INDEPENDENT_READONLY_POSTAUDIT" >&2
  fi
}
trap cleanup EXIT
hold(){ echo "HOLD_P25_ADMIN_APPLY_NOT_STARTED: $1" >&2; exit 2; }
# Explicit named permission is different from blanket paid-API authorization.
[[ -v P25_ADMIN_OPERATOR_CONFIRMED ]] || hold EXACT_OWNER_CONSENT_MISSING
[[ "$P25_ADMIN_OPERATOR_CONFIRMED" == "$OWNER_CONFIRM" ]] ||
  hold EXACT_OWNER_CONSENT_NOT_MATCHED
for t in gh git node; do command -v "$t" >/dev/null || hold "MISSING_$t"; done
[[ -x node_modules/.bin/tsx ]] || hold TSX_MISSING
gh auth status --hostname github.com >/dev/null 2>&1 || hold GITHUB_AUTH_MISSING
[[ "$(git rev-parse HEAD 2>/dev/null)" == "$LOCAL_PIN" ]] || hold LOCAL_HEAD_CHANGED
git merge-base --is-ancestor "$HISTORICAL_PIN" "$LOCAL_PIN" ||
  hold REVIEWED_HISTORIC_ANCESTRY_MISSING
[[ "$(git hash-object server/lib/disruption/db_v39.ts 2>/dev/null)" == "$DB_BLOB" ]] ||
  hold DB_CONNECTION_SOURCE_CHANGED
[[ "$(git hash-object server/lib/disruption/aerodataboxLimiter_v3.ts 2>/dev/null)" == "$LIMITER_BLOB" ]] ||
  hold NATIVE_STRICT_PROVIDER_LIST_CHANGED
[[ -v V39_DATABASE_RUNTIME_URL ]] || hold DB_URL_MISSING
[[ -n "$V39_DATABASE_RUNTIME_URL" ]] || hold DB_URL_EMPTY
[[ -v AERODATABOX_API_KEY ]] || hold PROVIDER_STRICT_LIST_KEY_MISSING
[[ -n "$AERODATABOX_API_KEY" ]] || hold PROVIDER_STRICT_LIST_KEY_EMPTY
[[ -d "$OLD_SYNTHETIC_ONCE" ]] || hold PREVIOUS_SYNTHETIC_ATTEMPT_MARKER_MISSING
[[ ! -e "$HELPER" && ! -L "$HELPER" ]] || hold LOCAL_HELPER_COLLISION
[[ ! -e "$APPLY_ONCE" && ! -L "$APPLY_ONCE" ]] || hold ADMIN_APPLY_ALREADY_ATTEMPTED
RUNNER="$(mktemp --suffix=.ts "$PWD/scripts/.p25-admin-approved-XXXXXXXX")" ||
  hold EXACT_TEMP_RUNNER_FAILED
touch "$HELPER" || hold EXACT_TEMP_HELPER_FAILED
HELPER_CREATED=1
gh api "repos/$REPO/git/blobs/$PURE_BLOB" --jq .content |
  base64 --decode > "$HELPER" || hold PURE_GUARD_DOWNLOAD_FAILED
gh api "repos/$REPO/git/blobs/$RUNNER_BLOB" --jq .content |
  base64 --decode > "$RUNNER" || hold RUNNER_DOWNLOAD_FAILED
[[ "$(git hash-object "$HELPER")" == "$PURE_BLOB" ]] || hold PURE_GUARD_HASH_CHANGED
[[ "$(git hash-object "$RUNNER")" == "$RUNNER_BLOB" ]] || hold ADMIN_RUNNER_HASH_CHANGED
[[ ! -e "$APPLY_ONCE" && ! -L "$APPLY_ONCE" ]] || hold ADMIN_APPLY_RACE_ALREADY_ATTEMPTED
mkdir -p artifacts || hold ARTIFACT_DIR_MISSING
mkdir "$APPLY_ONCE" || hold ADMIN_APPLY_AT_MOST_ONCE_ALREADY_MARKED
STARTED=1
printf '%s\n' "P25_ADMIN_EXACT_ONCE_ATTEMPT_STARTED_REVIEWED_SOURCE; NEVER_BLINDLY_RETRY"
printf 'source_guard_blob=%s\nsource_runner_blob=%s\nreplit_local_pin=%s\n' \
  "$PURE_BLOB" "$RUNNER_BLOB" "$LOCAL_PIN" > "$APPLY_ONCE/manifest.txt" ||
  hold ADMIN_APPLY_MARKER_PERSISTENCE_FAILURE
PHASE2G_P25_ADMIN_CLOSEOUT_APPROVAL='CLOSE_EXACT_31_32_AND_P25_BUDGET_PRESERVE_DELIVERY_GAP' \
  node_modules/.bin/tsx "$RUNNER" --apply
printf '%s\n' "P25_ADMIN_EXACT_APPLY_SCRIPT_RETURNED; STILL_REQUIRES_INDEPENDENT_READONLY_POSTAUDIT"
