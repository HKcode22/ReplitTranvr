#!/usr/bin/env bash
# Phase6 Gate9, ONE-TIME FUTURE OPERATOR ACTION. NOT TO BE RUN BEFORE
# signed first SOURCE UTC and independently authorized separate Gate13 GO.
# Never starts paid provider requests itself. A future relay pulse may
# dispatch a bounded paid-worker parent, under the ORIGINAL G13/worker gates.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
T_SHA="c8e065d665ccacb6d2575070e94c5500b7583044"
R_SHA="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
EPOCH="2026-11-23T23:45:00.000Z"
UNTIL="2026-12-29T04:00:00.000Z"
hold(){ printf '%s\n' "HOLD_P6_GATE9_AFTER_GO_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == OWNER_CONFIRMS_GATE13_PAID_GO_ALREADY_APPROVED_AND_ENABLED_FOR_SIGNED_MONTH ]] || hold G13_REQUIRED
for c in gh jq date git awk grep; do command -v "$c" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
pin(){
 [[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$T_SHA" ]] || hold TARGET_MAIN
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$R_SHA" ]] || hold RELAY_MAIN
}
pin
NOW="$(date -u +%s)"
START="$(date -u -d "$EPOCH" +%s)"
END="$(date -u -d "$UNTIL" +%s)"
[[ "$NOW" -ge "$START" && "$NOW" -lt $((END-1800)) ]] || hold OUTSIDE_ACTUAL_SIGNED_WINDOW
# Exact original main current policies/POST verified before G13;
# do not repeat their actor workflows, signer generation or provider calls.
gh api "repos/$T/actions/runs/45028187506" | jq -e --arg s "$T_SHA" '.head_sha==$s and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold POST_APPROVAL_DRIFT
gh api "repos/$T/actions/runs/45028157406" | jq -e '.run_attempt==1 and .conclusion=="success"' >/dev/null || hold SIGNED_POLICY_DRIFT
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/r" || hold RELAY_METADATA
gh api "repos/$R/environments/travnr-target-forward/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/re" || hold RELAY_ENVIRONMENT
gh api "repos/$T/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/t" || hold TARGET_METADATA
gh api "repos/$T/environments/phase6-protected-runtime/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/tenv" || hold TARGET_ENVIRONMENT
gh api "repos/$T/actions/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/ts" || hold TARGET_STOP_NAMES
gh api "repos/$T/environments/phase6-protected-runtime/secrets?per_page=100" --paginate --jq '.secrets[].name' > "$TMP/te" || hold PROTECTED_STOP_NAMES
val(){ awk -F '\t' -v k="$2" '$1==k {print $2}' "$1" | head -n1; }
for k in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 grep -Fxq "$k" "$TMP/ts" || hold PAID_REPO_STOP_NAME_MISSING
 grep -Fxq "$k" "$TMP/te" || hold PAID_ENV_STOP_NAME_MISSING
done
# GitHub issue record from the actual G13 owner operation is a second
# independent gate alongside this explicit confirmation. Neither is a
# plaintext readback of GitHub secrets.
gh api "repos/$T/issues/413/comments?per_page=100" --paginate --jq  '.[]|select(.user.login=="HKcode22" and (.body//""|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body//""|contains("main c8e065d665ccacb6d2575070e94c5500b7583044")))|.id' > /dev/null || hold G13_LEDGER_UNAVAILABLE
G13_COUNT="$(gh api "repos/$T/issues/413/comments?per_page=100" --paginate --jq  '.[]|select(.user.login=="HKcode22" and (.body//""|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body//""|contains("main c8e065d665ccacb6d2575070e94c5500b7583044")))|.id' | wc -l | tr -d ' ')"
[[ "$G13_COUNT" == 1 ]] || hold G13_OWNER_ISSUE_RECORD_NOT_UNIQUE_OR_ABSENT
# Secret values are write-only in GitHub. The explicit owner confirmation
# above is still necessary; an external relay never grants paid authority.
[[ "$(val "$TMP/t" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
   "$(val "$TMP/t" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 &&
   "$(val "$TMP/t" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$EPOCH" ]] || hold TARGET_NOT_FUTURE_STAGED
[[ "$(val "$TMP/r" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
   "$(val "$TMP/r" TRAVNR_RELAY_ROLLING_ENABLED)" == 1 &&
   "$(val "$TMP/r" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(val "$TMP/r" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 &&
   "$(val "$TMP/r" TRAVNR_ROLLING_POLICY_FROM_UTC)" == "$EPOCH" &&
   "$(val "$TMP/r" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == "$UNTIL" &&
   "$(val "$TMP/r" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$T_SHA" ]] || hold RELAY_NOT_FUTURE_STAGED
for k in P6_ROLLING_DIRECT_RECOVERY_ENABLED P6_ROLLING_CONTROLLER_ENABLED P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC; do
 ! grep -Fxq "$k" "$TMP/tenv" || hold TARGET_ENV_SHADOW
done
for k in TRAVNR_RELAY_ROLLING_ENABLED TRAVNR_RELAY_ROLLING_ROUTE TRAVNR_RELAY_DIRECT_TICK_APPROVED TRAVNR_RELAY_ROLLING_SINCE_UTC; do
 ! grep -Fxq "$k" "$TMP/re" || hold RELAY_ENV_SHADOW
done
# Any existing real DIRECT_TICK attempt since signed start must be reviewed,
# not followed by another owner activation or silent replay.
gh api "repos/$T/actions/workflows/phase6-direct-recovery-tick.yml/runs?branch=main&per_page=100" \
 --jq '.workflow_runs[]|select(.display_title=="P6 DIRECT RECOVERY TICK")|.created_at' > "$TMP/d" || hold HISTORY_UNAVAILABLE
if awk -v start="$EPOCH" '$0>=start{found=1}END{exit !found}' "$TMP/d"; then hold PRIOR_DIRECT_ATTEMPT_NO_REPLAY; fi
pin
# Disable only the rolling external lane, not independent primary retention.
# This is necessary because DIRECT_VERIFY+approved=1 or DIRECT_TICK+approved=0
# could otherwise fail on an intervening external pulse.
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$R" --body 0 >/dev/null || hold UNKNOWN_DISABLE_ACK
[[ "$(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$R")" == 0 ]] || hold ROLLING_NOT_DISABLED
pin
# Gemini correctly left target DIRECT_RECOVERY_ENABLED=0 before paid GO to
# prevent the heartbeat from reporting future activation as an incident.
# Enable it ONLY after G13 paid GO and while external rolling pulse is OFF.
gh variable set P6_ROLLING_DIRECT_RECOVERY_ENABLED -R "$T" --body 1 >/dev/null || hold UNKNOWN_TARGET_ENABLE_ACK
[[ "$(gh variable get P6_ROLLING_DIRECT_RECOVERY_ENABLED -R "$T")" == 1 ]] || hold TARGET_ENABLE_READBACK
pin
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$R" --body "$EPOCH" >/dev/null || hold UNKNOWN_SINCE_ACK
pin
gh variable set TRAVNR_RELAY_DIRECT_TICK_APPROVED -R "$R" --body 1 >/dev/null || hold UNKNOWN_APPROVAL_ACK
pin
gh variable set TRAVNR_RELAY_ROLLING_ROUTE -R "$R" --body DIRECT_TICK >/dev/null || hold UNKNOWN_ROUTE_ACK
# Verify full effective repository-mode configuration before permitting pulses.
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/r2" || hold PREENABLE_READBACK
[[ "$(val "$TMP/r2" TRAVNR_RELAY_ROLLING_ENABLED)" == 0 &&
   "$(val "$TMP/r2" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$EPOCH" &&
   "$(val "$TMP/r2" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 1 &&
   "$(val "$TMP/r2" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_TICK &&
   "$(val "$TMP/r2" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$T_SHA" &&
   "$(val "$TMP/r2" TRAVNR_ROLLING_POLICY_FROM_UTC)" == "$EPOCH" &&
   "$(val "$TMP/r2" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == "$UNTIL" ]] || hold PREENABLE_DRIFT
pin
# Last and only admission switch. After this the already-existing external
# clock may dispatch one bounded direct recovery tick. No manual dispatch.
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$R" --body 1 >/dev/null || hold UNKNOWN_ENABLE_ACK
[[ "$(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$R")" == 1 ]] || hold ENABLE_READBACK
echo '{"status":"P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO","reviewedMain":"c8e065d665ccacb6d2575070e94c5500b7583044","route":"DIRECT_TICK","fromUtc":"2026-11-23T23:45:00.000Z","untilUtc":"2026-12-29T04:00:00.000Z","thisScriptProviderCalls":0,"thisScriptDatabaseWrites":0,"thisScriptPaidWorkerDispatches":0,"relayMayNowDispatchProtectedDirectWorkers":true,"firstActualTargetAckStillRequired":true}'
