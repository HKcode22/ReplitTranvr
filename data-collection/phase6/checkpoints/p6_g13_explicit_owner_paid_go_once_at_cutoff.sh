#!/usr/bin/env bash
# One-time owner signed paid GO for EXACT frozen 31-day Phase6 stage.
# NEVER run prior to Monday approved window; requires explicit fresh GO
# confirmation. Fails closed; on uncertain writes attempts all-four STOP=0.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
SHA="b432eb9a5bac7bc3c4537249e75ec7df41e8727c"
RSHA="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
ENVIRONMENT="phase6-protected-runtime"
CHECK_BLOB="24acf96e85b10efd823556975494a6ec4cf90c75"
EPOCH="2026-11-23T23:45:00.000Z"
WINDOW_START="2026-11-23T21:50:00Z"
GO_DEADLINE="2026-11-23T23:10:00Z"
MARKER="$HOME/.travnr-p6-g13-owner-paid-go-once.started"
hold(){ echo "HOLD_P6_G13_OWNER_EXPLICIT_GO_$1" >&2; exit 2; }
[[ $# -eq 1 && "$1" == OWNER_HKCODE22_APPROVES_EXACT_PHASE6_31_DAY_PAID_GO_UP_TO_36740_API_UNITS_WITH_1900_DAY_CAP_AND_1000_ALERT_FLOOR ]] || hold OWNER_EXPLICIT_CONFIRM
for c in gh git jq node base64 date; do command -v "$c" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold GITHUB_OWNER
[[ ! -e "$MARKER" ]] || hold PREVIOUS_ATTEMPT_REVIEW_NO_REPLAY
window(){
 local n a z
 n="$(date -u +%s)"; a="$(date -u -d "$WINDOW_START" +%s)"; z="$(date -u -d "$GO_DEADLINE" +%s)"
 [[ "$n" -ge "$a" && "$n" -lt "$z" ]] || hold OUTSIDE_MONDAY_GO_WINDOW
}
pin(){
 [[ "$(gh api "repos/$T/git/ref/heads/main" --jq '.object.sha')" == "$SHA" ]] || hold MAIN_DRIFT
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" == "$RSHA" ]] || hold RELAY_MAIN_DRIFT
}
window
pin
[[ -f "$PWD/package.json" && -d "$PWD/scripts" ]] || hold REPLIT_WORKSPACE
TMP="$(mktemp -d "$PWD/scripts/.p6-g13-go-XXXXXXXX")"
cleanup(){ rm -rf -- "$TMP"; }
MUTATING=0
COMMITTED=0
on_exit(){
 local ec=$?
 if [[ "$ec" -ne 0 && "$MUTATING" == 1 && "$COMMITTED" == 0 ]]; then
   set +e
   gh secret set V39_PHASE6_OWNER_APPROVED -R "$T" --body 0 >/dev/null 2>&1
   gh secret set V39_PHASE6_OWNER_APPROVED -R "$T" -e "$ENVIRONMENT" --body 0 >/dev/null 2>&1
   gh secret set V39_PHASE6_PROCESS_ARMED -R "$T" --body 0 >/dev/null 2>&1
   gh secret set V39_PHASE6_PROCESS_ARMED -R "$T" -e "$ENVIRONMENT" --body 0 >/dev/null 2>&1
   echo "HOLD_P6_G13_UNKNOWN_PARTIAL_PAID_CONTROL_WRITE_STOP_ROLLBACK_ATTEMPTED_INSPECT_NO_REPLAY" >&2
 fi
 cleanup
}
trap on_exit EXIT
# Validate the exact already-prepared read-only script, then perform the
# *fresh* two-channel account and actual scoped PG16 expiry STOP readback.
gh api "repos/$T/git/blobs/$CHECK_BLOB" --jq '.content' | base64 --decode > "$TMP/check.sh" || hold CHECK_SOURCE
[[ "$(git hash-object "$TMP/check.sh")" == "$CHECK_BLOB" ]] || hold CHECK_SOURCE_DRIFT
bash -n "$TMP/check.sh" || hold CHECK_SYNTAX
bash "$TMP/check.sh" READ_FRESH_ACCOUNT_AND_EXISTING_PRODUCTION_RETENTION_NO_PAID_GO > "$TMP/check.json" || hold FRESH_G11_G12
jq -e '.status=="P6_G11_G12_FRESH_ACCOUNT_AND_LIVE_EXPIRY_READONLY_PASS_NOT_GO" and .apiUnitsRemaining>=36740 and .alertCreditsRemaining>=1000 and .unresolvedDeletionStops==0 and .duePackets==0 and .dueIndexes==0 and .paidGo==false' "$TMP/check.json" >/dev/null || hold FRESH_RELEASE_NOT_GREEN
pin
window
# Already-prepared minimal direct route must remain disarmed until 23:45Z.
gh api "repos/$R/actions/variables?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv' > "$TMP/relay" || hold RELAY_METADATA
v(){ awk -F '\t' -v k="$2" '$1==k {print $2}' "$1" | head -n1; }
[[ "$(v "$TMP/relay" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
   "$(v "$TMP/relay" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 0 &&
   "$(v "$TMP/relay" TRAVNR_ROLLING_POLICY_FROM_UTC)" == "$EPOCH" &&
   "$(v "$TMP/relay" TRAVNR_ROLLING_POLICY_UNTIL_UTC)" == 2026-12-29T04:00:00.000Z ]] || hold RELAY_PREGO_NOT_DISARMED
for scope in "repos/$T/actions/secrets?per_page=100" "repos/$T/environments/$ENVIRONMENT/secrets?per_page=100"; do
 gh api "$scope" --jq '.secrets[].name' > "$TMP/names" || hold SECRET_SCOPE
 for name in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
  grep -Fxq "$name" "$TMP/names" || hold MISSING_EFFECTIVE_PAID_FLAG_NAME
 done
done
# Monotone one-use local marker *before any* secret writes. No blind retry.
( set -C; printf '%s\n' "$SHA $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$MARKER" ) || hold ATTEMPT_MARKER
MUTATING=1
# A single armed secret is never sufficient by itself: all worker admission
# checks separately require owner approval + frozen rights, scope, budget.
gh secret set V39_PHASE6_PROCESS_ARMED -R "$T" --body 1 >/dev/null || hold ARMED_REPO
gh secret set V39_PHASE6_PROCESS_ARMED -R "$T" -e "$ENVIRONMENT" --body 1 >/dev/null || hold ARMED_ENV
pin
window
gh secret set V39_PHASE6_OWNER_APPROVED -R "$T" -e "$ENVIRONMENT" --body 1 >/dev/null || hold OWNER_ENV
gh secret set V39_PHASE6_OWNER_APPROVED -R "$T" --body 1 >/dev/null || hold OWNER_REPO
# GitHub secret VALUES cannot be read; verify all four effective name
# metadata are present and updated during this one-use commissioning.
for scope in "repos/$T/actions/secrets?per_page=100" "repos/$T/environments/$ENVIRONMENT/secrets?per_page=100"; do
 gh api "$scope" --jq '.secrets[]|[.name,.updated_at]|@tsv' > "$TMP/checkmeta" || hold POSTWRITE_SECRET_METADATA
 for name in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
  grep -q "^$name"$'\t' "$TMP/checkmeta" || hold EFFECTIVE_SCOPE_MISSING
 done
done
pin
# The explicit owner authorization is recorded *after* successful writes.
# No data, key or private SQL is sent to GitHub.
gh issue comment 413 -R "$T" --body \
 "PHASE6 G13 OWNER PAID GO AT $(date -u +%Y-%m-%dT%H:%M:%SZ): authenticated HKcode22 owner explicitly approves the frozen 31-day paid collection; main $SHA relay $RSHA; fresh G11/12 account + V0108 deletion STOP readback PASS; 36740 planned API units, 1900/day cap, 1000 protected Alert floor, first SOURCE 2026-11-23T23:45:00Z; 4 paired repo+protected-env paid control writes acknowledged, values write-only, no provider work in owner command. Existing signed rights, scope, and source/worker STOPs remain mandatory. G9 existing DIRECT_TICK external recovery still intentionally NOT enabled until >=23:45Z. G14 genuine first SOURCE receipt pending." >/dev/null || hold GO_LEDGER_COMMENT
COMMITTED=1
jq -n --slurpfile p "$TMP/check.json" --arg sha "$SHA" \
 '{status:"P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED",main:$sha,
 apiUnitsAtGo:$p[0].apiUnitsRemaining,alertCreditsAtGo:$p[0].alertCreditsRemaining,
 protectedAlertFloor:1000,plannedApiUnits:36740,dailyHardCap:1900,
 realFirstSourceReceiptStillPending:true,externalDirectRouteSwitchStillPendingAfterFirstEpoch:true,
 thisScriptProviderPaidGets:0,thisScriptDatabaseWrites:0,
 valueReadbackUnsupportedByGitHub:true,originalWorkerGatesStillMandatory:true}'
