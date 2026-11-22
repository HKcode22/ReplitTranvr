#!/usr/bin/env bash
# Gate 9+10 preparation ONLY: future-bound existing DIRECT_TICK mode.
# Existing SOURCE/PRE/POST schedules, cron jobs and global paid STOPs untouched.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
TS="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RS="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
PROT="phase6-protected-runtime"
FWD="travnr-target-forward"
EPOCH="2026-11-23T23:45:00.000Z"
END="2026-12-29T04:00:00.000Z"
hold(){ echo "HOLD_P6_G9_G10_DIRECT_FUTURE_PREPARE_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == PREPARE_EXISTING_FUTURE_DIRECT_RECOVERY_NO_PAID_GO ]] || hold CONFIRM
for c in gh jq date awk grep git; do command -v "$c" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
pins(){
 [[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$TS" ]] || hold TARGET_MAIN
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$RS" ]] || hold RELAY_MAIN
}
pins
gh api "repos/$T/actions/runs/45028187506" | jq -e --arg sha "$TS" '.head_sha==$sha and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold POST_BASELINE
gh api "repos/$T/actions/runs/45028157406" | jq -e '.run_attempt==1 and .conclusion=="success"' >/dev/null || hold POLICY_BASELINE
now="$(date -u +%s)"
start="$(date -u -d "$EPOCH" +%s)"
end="$(date -u -d "$END" +%s)"
[[ "$now" -lt "$start" && "$end" -gt "$start" && $((end-start)) -le 5184000 ]] || hold FUTURE_WINDOW
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$T/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/tv" || hold TARGET_VARIABLES
gh api "repos/$T/environments/$PROT/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/tev" || hold TARGET_ENV_VARIABLES
gh api "repos/$T/actions/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/ts" || hold TARGET_SECRETS
gh api "repos/$T/environments/$PROT/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/tes" || hold TARGET_ENV_SECRETS
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/rv" || hold RELAY_VARIABLES
gh api "repos/$R/environments/$FWD/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/rev" || hold RELAY_ENV_VARIABLES
v(){ awk -F '\t' -v k="$2" '$1==k {print $2}' "$1" | head -n1; }
[[ "$(v "$TMP/rv" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
   "$(v "$TMP/rv" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 &&
   "$(v "$TMP/rv" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$TS" &&
   "$(v "$TMP/rv" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(v "$TMP/rv" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 ]] || hold RELAY_NOT_DISABLED_VERIFY
for k in TRAVNR_ROLLING_POLICY_FROM_UTC TRAVNR_ROLLING_POLICY_UNTIL_UTC; do
 ! grep -Fxq "$k" "$TMP/rev" || hold RELAY_ENV_SHADOW
done
for k in P6_ROLLING_CONTROLLER_ENABLED P6_ROLLING_DIRECT_RECOVERY_ENABLED P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC; do
 ! grep -Fxq "$k" "$TMP/tev" || hold TARGET_ENV_SHADOW
done
for k in P6_ROLLING_SCHEDULED_ROOT_ENABLED P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED P6_ROLLING_WINDOW_CUSTODY_ENABLED; do
 x="$(v "$TMP/tv" "$k")"
 [[ -z "$x" || "$x" == 0 ]] || hold CONFLICTING_DURABLE_MODE
done
! grep -Fxq P6_ROLLING_SESSION_APPROVED "$TMP/ts" || hold UNREVIEWED_REPO_DURABLE_APPROVAL
! grep -Fxq P6_ROLLING_SESSION_APPROVED "$TMP/tes" || hold UNREVIEWED_PROTECTED_DURABLE_APPROVAL
for k in TRAVNR_ROLLING_POLICY_FROM_UTC TRAVNR_ROLLING_POLICY_UNTIL_UTC; do
 x="$(v "$TMP/rv" "$k")"
 expected="$EPOCH"; [[ "$k" == TRAVNR_ROLLING_POLICY_UNTIL_UTC ]] && expected="$END"
 [[ -z "$x" || "$x" == "$expected" ]] || hold EXISTING_RELAY_WINDOW_CONFLICT
done
for k in P6_ROLLING_CONTROLLER_ENABLED P6_ROLLING_DIRECT_RECOVERY_ENABLED; do
 x="$(v "$TMP/tv" "$k")"
 [[ -z "$x" || "$x" == 1 ]] || hold EXISTING_TARGET_FLAG_CONFLICT
done
x="$(v "$TMP/tv" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)"
[[ -z "$x" || "$x" == "$EPOCH" ]] || hold EXISTING_TARGET_EPOCH_CONFLICT

# All changes remain nonpaid/inert: the relay stays DIRECT_VERIFY and 0.
pins
gh variable set P6_ROLLING_CONTROLLER_ENABLED -R "$T" --body 1 >/dev/null || hold CONTROLLER_VAR_UNKNOWN
pins
gh variable set P6_ROLLING_DIRECT_RECOVERY_ENABLED -R "$T" --body 1 >/dev/null || hold DIRECT_VAR_UNKNOWN
pins
gh variable set P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC -R "$T" --body "$EPOCH" >/dev/null || hold EPOCH_VAR_UNKNOWN
pins
gh secret set P6_ROLLING_DIRECT_RECOVERY_APPROVED -R "$T" -e "$PROT" --body 1 >/dev/null || hold REVIEWED_APPROVAL_UNKNOWN
pins
gh variable set TRAVNR_ROLLING_POLICY_FROM_UTC -R "$R" --body "$EPOCH" >/dev/null || hold RELAY_FROM_UNKNOWN
pins
gh variable set TRAVNR_ROLLING_POLICY_UNTIL_UTC -R "$R" --body "$END" >/dev/null || hold RELAY_UNTIL_UNKNOWN
pins
gh api "repos/$T/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/tafter" || hold TARGET_READBACK
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/rafter" || hold RELAY_READBACK
gh api "repos/$T/environments/$PROT/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/pafter" || hold PROTECTED_READBACK
[[ "$(v "$TMP/tafter" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
   "$(v "$TMP/tafter" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 &&
   "$(v "$TMP/tafter" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$EPOCH" &&
   "$(v "$TMP/rafter" TRAVNR_ROLLING_POLICY_FROM_UTC)" == "$EPOCH" &&
   "$(v "$TMP/rafter" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == "$END" &&
   "$(v "$TMP/rafter" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(v "$TMP/rafter" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 ]] || hold POSTWRITE_SCOPE
grep -Fxq P6_ROLLING_DIRECT_RECOVERY_APPROVED "$TMP/pafter" || hold APPROVAL_NAME_MISSING
echo '{"status":"P6_G9_G10_EXISTING_DIRECT_RECOVERY_FUTURE_PREPARED_PAID_OFF","targetMode":"FUTURE_STAGED","relayRoute":"DIRECT_VERIFY_STILL_DISABLED","firstAllowedUtc":"2026-11-23T23:45:00.000Z","policyUntilUtc":"2026-12-29T04:00:00.000Z","targetDispatches":0,"providerCalls":0,"databaseWrites":0,"cronWrites":0,"paidGo":false}'
