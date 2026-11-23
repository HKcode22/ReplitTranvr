#!/usr/bin/env bash
# One-time owner signed paid GO for EXACT frozen 31-day Phase6 stage.
# Supersedes original b432-pinned predecessor after ONLY heartbeat-and-doc
# main advance. Detached relay must be repinned independently before GO.
# NEVER run prior to Monday approved window; requires explicit fresh GO
# confirmation. Fails closed; on uncertain writes attempts all-four STOP=0.
set -Eeuo pipefail
set +x
umask 077
T="HKcode22/ReplitTranvr"
R="HKcode22/TravnrClockRelay"
SHA="c8e065d665ccacb6d2575070e94c5500b7583044"
RSHA="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
ENVIRONMENT="phase6-protected-runtime"
CHECK_BLOB="e4bae61cf2473674c99066952b0e928091101b4f"
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
# New sealed c8 metadata-only code successor MUST already be actually
# installed and independently verified on the repo and MAIN protected actor.
# The prior historic b432-G8 readback/POST proofs are not sufficient.
G12_TITLE="P6 G12 exact current c8 policy postinstall readback NO PROVIDER"
G12_RUNS="$(gh api "repos/$T/actions/runs?branch=phase6%2F20261122-g8-502-readback-evidence&per_page=100")" || hold CURRENT_G12_REPOSITORY_EVIDENCE_UNAVAILABLE
G12="$(jq -r --arg title "$G12_TITLE" '
 [.workflow_runs[]|select(.name==$title and .head_branch=="phase6/20261122-g8-502-readback-evidence" and
  .event=="push" and .run_attempt==1 and .status=="completed" and .conclusion=="success") ] |
 if length==1 then .[0].id else empty end' <<<"$G12_RUNS")"
[[ "$G12" =~ ^[1-9][0-9]*$ ]] || hold CURRENT_C8_REPO_31_POLICY_PROOF_ABSENT_OR_NOT_UNIQUE
G12_CREATED="$(gh api "repos/$T/actions/runs/$G12" --jq .created_at)" || hold G12_CREATED_CLOCK
gh api "repos/$T/actions/runs/$G12/jobs?filter=latest&per_page=100" |
 jq -e '[.jobs[]|select(.name=="repository-secret-readback" and .conclusion=="success" and
  ([.steps[]|select(.name=="Check 31 canonical installed policy values and both OFF switches in THIS scope" and .conclusion=="success")]|length)==1)]|length==1' >/dev/null ||
 hold CURRENT_C8_31_VALUE_ACTUAL_READBACK_STEP
POST_RUNS="$(gh api "repos/$T/actions/workflows/phase5-one-signed-future-post-v0083-main-manual.yml/runs?branch=main&event=workflow_dispatch&per_page=100")" ||
 hold POST_PROTECTED_MAIN_HISTORY
G12_POST="$(jq -r --arg sha "$SHA" --arg created "$G12_CREATED" '
 [.workflow_runs[]|select(.head_sha==$sha and .created_at>=$created and
  .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and
  .status=="completed" and .conclusion=="success" and .run_attempt==1)] |
 if length==1 then .[0].id else empty end' <<<"$POST_RUNS")"
[[ "$G12_POST" =~ ^[1-9][0-9]*$ ]] || hold CURRENT_C8_PROTECTED_POST_NOT_LIVE_PASS
gh api "repos/$T/actions/runs/$G12_POST/jobs?filter=latest&per_page=100" |
 jq -e --arg sha "$SHA" '
 [.jobs[]|select(.name=="exact-main-post-actors-only" and .head_sha==$sha and
  .run_attempt==1 and .conclusion=="success")] as $a |
 ($a|length)==1 and
 (([$a[0].steps[]|select(.conclusion=="success" and
 (.name=="Verify exact disarmed POST actor admission" or
  .name=="Preflight actual independent POST reviewer no observation" or
  .name=="Preflight actual restricted POST publisher and deadline clock" or
  .name=="Preflight exact independent bundle storage actors"))]|length)==4)' >/dev/null ||
 hold CURRENT_C8_PROTECTED_POST_ACTORS_STEPS
# Full G12 original strict validation and actual external primary backstop
# on CURRENT main were previously proven; verify those actual run identities.
for run in 45118733902 45118631787 45115427067 45115536602; do
 gh api "repos/$T/actions/runs/$run" |
 jq -e '.run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null ||
 hold PREGO_FULL_VALIDATOR_CLOCK_CI
done
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
[[ "$(v "$TMP/relay" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$SHA" &&
   "$(v "$TMP/relay" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_VERIFY &&
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
 "PHASE6 G13 OWNER PAID GO AT $(date -u +%Y-%m-%dT%H:%M:%SZ): authenticated HKcode22 owner explicitly approves the frozen 31-day paid collection; main $SHA relay $RSHA; fresh G11/12 account + V0108 deletion STOP readback PASS; independent G12 c8 31-policy repository readback run $G12 and protected 4-step actor run $G12_POST PASS; 36740 planned API units, 1900/day cap, 1000 protected Alert floor, first SOURCE 2026-11-23T23:45:00Z; 4 paired repo+protected-env paid control writes acknowledged, values write-only, no provider work in owner command. Existing signed rights, scope, and source/worker STOPs remain mandatory. G9 existing DIRECT_TICK external recovery still intentionally NOT enabled until >=23:45Z. G14 genuine first SOURCE receipt pending." >/dev/null || hold GO_LEDGER_COMMENT
COMMITTED=1
jq -n --slurpfile p "$TMP/check.json" --arg sha "$SHA" \
 '{status:"P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED",main:$sha,
 apiUnitsAtGo:$p[0].apiUnitsRemaining,alertCreditsAtGo:$p[0].alertCreditsRemaining,
 protectedAlertFloor:1000,plannedApiUnits:36740,dailyHardCap:1900,
 realFirstSourceReceiptStillPending:true,externalDirectRouteSwitchStillPendingAfterFirstEpoch:true,
 thisScriptProviderPaidGets:0,thisScriptDatabaseWrites:0,
 valueReadbackUnsupportedByGitHub:true,originalWorkerGatesStillMandatory:true}'
