#!/usr/bin/env bash
# Gate 9 ONLY: stage reviewed FUTURE autonomous rolling relay window on
# existing externally commissioned relay; no paid GO / provider / DB / cron.
# Does not create target rolling claim credentials or set target GO flags.
set -Eeuo pipefail
set +x
umask 077

TARGET="HKcode22/ReplitTranvr"
RELAY="HKcode22/TravnrClockRelay"
TARGET_SHA="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RELAY_SHA="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
SCOPE_ENV="travnr-target-forward"
FROM="2026-11-23T21:50:00.000Z"
UNTIL="2026-12-29T04:00:00.000Z"
ROUTE="DURABLE_ROOT"
hold(){ echo "HOLD_P6_GATE9_FUTURE_RELAY_STAGE_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == STAGE_EXISTING_MONTH_RELAY_WINDOW_ONLY_PAID_STOP_NO_TARGET_DISPATCH ]] || hold CONFIRM
for cmd in gh jq git date sort; do command -v "$cmd" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
head_check(){
 [[ "$(gh api "repos/$TARGET/git/ref/heads/main" --jq '.object.sha')" == "$TARGET_SHA" ]] || hold TARGET_MAIN_CHANGED
 [[ "$(gh api "repos/$RELAY/git/ref/heads/main" --jq '.object.sha')" == "$RELAY_SHA" ]] || hold RELAY_MAIN_CHANGED
}
head_check
# The owner already observed the effective current protected POST pass under
# both STOPs zero, so no stale data/policy commission is re-executed here.
gh api "repos/$TARGET/actions/runs/45028187506" |
 jq -e --arg sha "$TARGET_SHA" '.head_sha==$sha and .event=="workflow_dispatch" and
 .run_attempt==1 and .conclusion=="success"' >/dev/null || hold POST_BASELINE
gh api "repos/$TARGET/actions/runs/45028157406" |
 jq -e '.run_attempt==1 and .conclusion=="success"' >/dev/null || hold POLICY_BASELINE

# Do not stage new authority after the first intended external wake.
now="$(date -u +%s)"
from_s="$(date -u -d "$FROM" +%s)"
until_s="$(date -u -d "$UNTIL" +%s)"
[[ "$now" -lt "$from_s" && "$from_s" -lt "$until_s" ]] || hold REVIEWED_FUTURE_WINDOW_ELAPSED
[[ $((until_s-from_s)) -le 5184000 ]] || hold ROLLING_WINDOW_OVER_60_DAYS

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$RELAY/actions/variables?per_page=100" \
  --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/repo_vars" || hold REPO_VARIABLE_READ
gh api "repos/$RELAY/environments/$SCOPE_ENV/variables?per_page=100" \
  --paginate --jq '.variables[]|.name' > "$TMP/env_vars" || hold ENV_VARIABLE_READ

for key in TRAVNR_RELAY_ROLLING_ROUTE TRAVNR_ROLLING_POLICY_FROM_UTC TRAVNR_ROLLING_POLICY_UNTIL_UTC; do
 ! grep -Fxq "$key" "$TMP/env_vars" || hold ENVIRONMENT_SHADOW_NO_BLIND_EDIT
done
get(){
 awk -F '\t' -v k="$1" '$1==k {print $2}' "$TMP/repo_vars" | head -n1
}
[[ "$(get TRAVNR_RELAY_MODE)" == MULTI_LANE ]] || hold NOT_EXISTING_MULTI_LANE
[[ "$(get TRAVNR_RELAY_ROLLING_ENABLED)" == 1 ]] || hold ROLLING_LANE_OFF
[[ "$(get TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$TARGET_SHA" ]] || hold TARGET_SHA_AUTHORITY_CHANGED
[[ "$(get TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 ]] || hold DIRECT_ROUTE_CONFLICT
prior="$(get TRAVNR_RELAY_ROLLING_ROUTE)"
[[ "$prior" == DIRECT_VERIFY || "$prior" == DURABLE_ROOT ]] || hold UNKNOWN_RELAY_ROUTE

since="$(get TRAVNR_RELAY_ROLLING_SINCE_UTC)"
[[ -n "$since" && "$since" == *Z ]] || hold SINCE_MISSING
since_s="$(date -u -d "$since" +%s)" || hold SINCE_UNPARSEABLE
[[ "$since_s" -le "$now" && $((until_s-since_s)) -le 5184000 ]] || hold SINCE_OUTSIDE_DURATION
for key in TRAVNR_ROLLING_POLICY_FROM_UTC TRAVNR_ROLLING_POLICY_UNTIL_UTC; do
 value="$(get "$key")"
 # Never overwrite a different already-published duration; only install if
 # absent or equal. This avoids conflicting signed scopes/parallel owner work.
 expect="$FROM"; [[ "$key" == TRAVNR_ROLLING_POLICY_UNTIL_UTC ]] && expect="$UNTIL"
 [[ -z "$value" || "$value" == "$expect" ]] || hold EXISTING_POLICY_WINDOW_DIFFERENT_REVIEW
done

# Set FUTURE exact FROM/UNTIL first, then switch to existing DURABLE_ROOT;
# all global target paid controls remain zero. No dispatch by this script.
head_check
gh variable set -R "$RELAY" TRAVNR_ROLLING_POLICY_FROM_UTC --body "$FROM" >/dev/null || hold UNKNOWN_FROM_ACK
head_check
gh variable set -R "$RELAY" TRAVNR_ROLLING_POLICY_UNTIL_UTC --body "$UNTIL" >/dev/null || hold UNKNOWN_UNTIL_ACK
head_check
gh variable set -R "$RELAY" TRAVNR_RELAY_ROLLING_ROUTE --body "$ROUTE" >/dev/null || hold UNKNOWN_ROUTE_ACK
head_check

gh api "repos/$RELAY/actions/variables?per_page=100" \
 --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/after" || hold READBACK
readv(){
 awk -F '\t' -v k="$1" '$1==k {print $2}' "$TMP/after" | head -n1
}
[[ "$(readv TRAVNR_ROLLING_POLICY_FROM_UTC)" == "$FROM" &&
   "$(readv TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == "$UNTIL" &&
   "$(readv TRAVNR_RELAY_ROLLING_ROUTE)" == "$ROUTE" ]] || hold READBACK_SCOPE
# A future-root route is staged, NOT proven active. No G10 target approval
# or protected runtime permission is installed or asserted here.

# Narrow G10 metadata inventory only: no approval values, credentials, logs,
# database SQL or reviewer identities are changed by this Gate9 command.
gh api "repos/$TARGET/actions/variables?per_page=100" \
 --paginate --jq '.variables[].name' > "$TMP/target_vars" || hold TARGET_VAR_READ
gh api "repos/$TARGET/actions/secrets?per_page=100" \
 --paginate --jq '.secrets[].name' > "$TMP/target_secrets" || hold TARGET_SECRET_NAMES_READ
for key in P6_ROLLING_CONTROLLER_ENABLED P6_ROLLING_SCHEDULED_ROOT_ENABLED P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED P6_ROLLING_WINDOW_CUSTODY_ENABLED; do
 if grep -Fxq "$key" "$TMP/target_vars"; then
  echo "P6_GATE10_VAR_NAME_PRESENT=$key"
 else
  echo "P6_GATE10_VAR_NAME_MISSING=$key"
 fi
done
for key in P6_ROLLING_SESSION_APPROVED P6_ROLLING_WINDOW_CUSTODY_APPROVED P6_ROLLING_WINDOW_AUTHORIZATION_ID P6_ROLLING_WINDOW_EXPECTED_LOGIN P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL; do
 if grep -Fxq "$key" "$TMP/target_secrets"; then
  echo "P6_GATE10_SECRET_NAME_PRESENT=$key"
 else
  echo "P6_GATE10_SECRET_NAME_MISSING=$key"
 fi
done
echo '{"status":"P6_GATE9_EXISTING_FUTURE_DURABLE_ROOT_ROUTE_REPO_VARIABLES_STAGED_NO_PAID_GO","relayRoute":"DURABLE_ROOT","fromUtc":"2026-11-23T21:50:00.000Z","untilUtc":"2026-12-29T04:00:00.000Z","existingRelayMain":"c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed","targetMain":"b432eb9a5bac7bc3c4537249e75ec7df41e8727c","paidGo":false,"providerCalls":0,"databaseReads":0,"databaseWrites":0,"cronWrites":0,"targetDispatches":0}'
