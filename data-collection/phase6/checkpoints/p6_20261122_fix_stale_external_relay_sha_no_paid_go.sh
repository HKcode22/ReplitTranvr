#!/usr/bin/env bash
# One-shot NO PROVIDER/NO DB/NO CRON scope correction after target heartbeat-only
# commits. Repair detached relay CURRENT MAIN SHA identity (old b432 -> new c8e).
# Requires existing main, previously reviewed code-only diff and healthy target
# dual-expiry real APPLY. Does not modify target credentials or paid controls.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
OLD="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
NEW="c8e065d665ccacb6d2575070e94c5500b7583044"
RELAY="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
hold(){ echo "HOLD_P6_RELAY_CURRENT_MAIN_REPIN_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == REPAIR_EXACT_OBSERVED_B432_TO_C8_RELAY_MAIN_DRIFT_PAID_OFF ]] || hold CONFIRM
for c in gh jq git awk grep; do command -v "$c" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
pin(){
 [[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$NEW" ]] || hold TARGET_MAIN
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$RELAY" ]] || hold RELAY_MAIN
}
pin
gh api "repos/$T/compare/$OLD...$NEW" | jq -e '
 .status=="ahead" and .ahead_by==3 and .behind_by==0 and
 ([.files[].filename]|sort)==([
 "data-collection/phase6/checkpoints/2026-11-23_PHASE6_HEARTBEAT_AUTONOMOUS_WORKFLOW_AUDIT.md",
 "scripts/v39_phase6_github_controller_heartbeat_v39.mjs",
 "server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs",
 "tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs"]|sort)
 ' >/dev/null || hold UNREVIEWED_MAIN_DIFF
for run in 45115450162 45115536602 45115427067; do
 gh api "repos/$T/actions/runs/$run" | jq -e --arg sha "$NEW" \
   '.head_sha==$sha and .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null || hold CURRENT_MAIN_TEST
done
gh api "repos/$T/actions/runs/45115450162/jobs?per_page=100" | jq -e '
 [.jobs[] | select(.name=="primary-fids-expiry" or .name=="phase7-expiry") | select(.conclusion=="success")] | length==2
 ' >/dev/null || hold TWO_ACTUAL_RETENTION_JOBS
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/relay" || hold RELAY_METADATA
gh api "repos/$R/environments/travnr-target-forward/variables?per_page=100" --paginate --jq '.variables[].name' > "$TMP/renv" || hold RELAY_EFFECTIVE_ENV
gh api "repos/$T/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/target" || hold TARGET_METADATA
v(){ awk -F '\t' -v k="$2" '$1==k {print $2}' "$1" | head -n1; }
! grep -Fxq TRAVNR_APPROVED_TARGET_MAIN_SHA "$TMP/renv" || hold RELAY_ENV_SHA_SHADOW
[[ "$(v "$TMP/relay" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
   "$(v "$TMP/relay" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
   "$(v "$TMP/relay" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(v "$TMP/relay" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 ]] || hold RELAY_MODE_NOT_STANDBY
[[ "$(v "$TMP/target" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 0 ]] || hold TARGET_DIRECT_PREGO_NOT_OFF
BEFORE="$(v "$TMP/relay" TRAVNR_APPROVED_TARGET_MAIN_SHA)"
[[ "$BEFORE" == "$OLD" || "$BEFORE" == "$NEW" ]] || hold UNEXPECTED_RELAY_SHA
if [[ "$BEFORE" == "$OLD" ]]; then
 pin
 gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$R" --body "$NEW" >/dev/null || hold UNKNOWN_GITHUB_WRITE_DO_NOT_RETRY
fi
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/after" || hold POSTWRITE_READBACK
[[ "$(v "$TMP/after" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$NEW" &&
   "$(v "$TMP/after" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
   "$(v "$TMP/after" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
   "$(v "$TMP/after" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(v "$TMP/after" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 ]] || hold POSTWRITE_SCOPE
pin
printf '{"status":"P6_DETACHED_RELAY_TARGET_MAIN_SHA_%s_NO_PAID_GO","targetMain":"%s","relayMain":"%s","previousRelayTargetSha":"%s","approvedRelayTargetSha":"%s","providerCalls":0,"databaseWrites":0,"cronWrites":0,"relayPulseDispatchedByThisScript":0,"actualNextRelayToTargetAckPending":true,"paidGo":false}\n' \
  "$([[ "$BEFORE" == "$OLD" ]] && printf REPAIRED || printf ALREADY_CORRECT)" "$NEW" "$RELAY" "$BEFORE" "$NEW"
