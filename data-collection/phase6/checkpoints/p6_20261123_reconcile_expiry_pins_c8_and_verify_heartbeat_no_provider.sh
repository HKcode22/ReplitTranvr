#!/usr/bin/env bash
# Narrow fix of accidental 0369 SHA drift in two *public GitHub Actions variables*.
# First read current main/relay, approved nonpaid expiry configuration and GO time.
# Only if exact old value 0369 is found, repin to original exact c8; NEVER edit
# code, protected environment, secrets, provider settings, schema, cron or G13.
# Then verify existing authorized DUE-ONLY no-provider expiry and heartbeat.
set -Eeuo pipefail
set +x
umask 077
hold() { printf 'HOLD_P6_EXPIRY_PIN_%s_PAID_GO_OFF\n' "$1" >&2; exit 2; }
test "$#" -eq 1 || hold WRONG_ARGUMENT_COUNT
test "$1" = "FIX_ONLY_ACCIDENTAL_0369_EXPIRY_VARIABLES_C8_NO_PAID_GO" || hold WRONG_CONFIRM
REPO="HKcode22/ReplitTranvr"
PIN="c8e065d665ccacb6d2575070e94c5500b7583044"
BAD="0369f88ba361ff8f97a352b9d438ee5bcf59af57"
RELAY="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed"
expiry_wf="phase5-primary-fids-expiry-no-provider.yml"
hb_wf="phase6-autonomous-gh-controller-heartbeat-no-provider.yml"

test "$(gh api user --jq .login)" = "HKcode22" || hold OWNER_IDENTITY
test "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \< "2026-11-23T21:50:00Z" || hold AFTER_GO_WINDOW_START
assert_pins() {
  test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$PIN" || hold TARGET_MAIN_DRIFT
  test "$(gh api "repos/HKcode22/TravnrClockRelay/git/ref/heads/main" --jq .object.sha)" = "$RELAY" || hold RELAY_MAIN_DRIFT
}
v() { gh api "repos/$REPO/actions/variables/$1" --jq .value; }
assert_pins

# Existing reviewed *nonpaid* primary and private due-only approval must match.
test "$(v P5_PRIMARY_FIDS_EXPIRY_ENABLED)" = true || hold PRIMARY_DISABLED
test "$(v P5_PRIMARY_FIDS_EXPIRY_APPROVAL)" = APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER || hold PRIMARY_APPROVAL_DRIFT
test "$(v P5_PRIMARY_FIDS_BACKSTOP_ENABLED)" = true || hold PRIMARY_BACKSTOP_DISABLED
test "$(v P6_FULL_RETENTION_BACKSTOP_ENABLED)" = true || hold FULL_BACKSTOP_DISABLED
test "$(v P6_PRIVATE_EPOCH_EXPIRY_MODE)" = APPLY_DUE_ONLY || hold PRIVATE_MODE_DRIFT
test "$(v P6_PRIVATE_EPOCH_EXPIRY_APPROVAL)" = APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER || hold PRIVATE_APPROVAL_DRIFT
M="$(v P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256)"
[[ "$M" =~ ^[0-9a-f]{64}$ ]] || hold MANIFEST_DRIFT
test "$(v P7_EXPIRY_ENABLED)" = true || hold P7_DISABLED
test "$(v P7_EXPIRY_APPROVAL)" = APPLY_P7_DUE_ONLY_NO_PROVIDER || hold P7_APPROVAL_DRIFT
test "$(v P6_ROLLING_DIRECT_RECOVERY_ENABLED)" = 0 || hold G9_DIRECT_ALREADY_ACTIVE

P5_NOW="$(v P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA)"
P7_NOW="$(v P7_EXPIRY_APPROVED_MAIN_SHA)"
for x in "$P5_NOW" "$P7_NOW"; do
  test "$x" = "$PIN" || test "$x" = "$BAD" || hold UNKNOWN_EXISTING_PIN_REFUSE
done
printf 'P6_EXPIRY_PIN_PRECHECK_APPROVED_MAIN_AND_NONPAID_GUARDS_PASS\n'

# Repair only variable(s) *actually* equal to the accidentally promoted SHA.
changed=0
if test "$P5_NOW" = "$BAD"; then
  gh api --method PATCH "repos/$REPO/actions/variables/P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA" \
    -f name=P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA -f value="$PIN" >/dev/null
  changed=1
fi
if test "$P7_NOW" = "$BAD"; then
  gh api --method PATCH "repos/$REPO/actions/variables/P7_EXPIRY_APPROVED_MAIN_SHA" \
    -f name=P7_EXPIRY_APPROVED_MAIN_SHA -f value="$PIN" >/dev/null
  changed=1
fi
test "$(v P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA)" = "$PIN" || hold PRIMARY_READBACK_MISMATCH
test "$(v P7_EXPIRY_APPROVED_MAIN_SHA)" = "$PIN" || hold P7_READBACK_MISMATCH
assert_pins
printf 'P6_EXPIRY_TWO_ACTION_VARIABLES_MATCH_C8 paidGoChanged=false changed=%s\n' "$changed"

# If corrected already, no duplicate manual retention dispatch merely for CI.
if test "$changed" = 0; then
  printf 'P6_EXPIRY_PINS_ALREADY_CORRECT_NO_EXTRA_DISPATCH\n'
  exit 0
fi

# Existing separately authorized FULL DUE-ONLY retention backstop (no provider).
# This may perform lawful bounded deletions; not a READ-ONLY SQL audit.
before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run "$expiry_wf" --repo "$REPO" --ref main \
  -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER \
  -f approved_main_sha="$PIN" >/dev/null
run_id=""
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  run_id="$(gh run list --repo "$REPO" --workflow "$expiry_wf" --limit 15 \
    --json databaseId,createdAt,displayTitle,event,headSha \
    --jq '.[] | select(.event=="workflow_dispatch" and .displayTitle=="P5 FULL RETENTION BACKSTOP CHILD" and .headSha=="c8e065d665ccacb6d2575070e94c5500b7583044" and .createdAt >= "'"$before"'") | .databaseId' | head -1 || true)"
  test -n "$run_id" && break
  sleep 4
done
test -n "$run_id" || hold NEW_EXPIRY_RUN_NOT_IDENTIFIED
printf 'P6_EXPIRY_REPAIR_BACKSTOP_RUN=https://github.com/%s/actions/runs/%s\n' "$REPO" "$run_id"
gh run watch "$run_id" --repo "$REPO" --exit-status || hold BACKSTOP_DID_NOT_PASS
gh run view "$run_id" --repo "$REPO" --json conclusion,headSha,jobs \
  --jq '
    if .conclusion=="success" and
       .headSha=="c8e065d665ccacb6d2575070e94c5500b7583044" and
       ([.jobs[] | select(.name=="primary-fids-expiry" and .conclusion=="success" and ([.steps[] | select(.name=="Verify exact main and execute only bounded primary FIDS expiry" and .conclusion=="success")] | length)==1)] | length)==1 and
       ([.jobs[] | select(.name=="phase7-expiry" and .conclusion=="success" and ([.steps[] | select(.name=="Bounded derived research and temporary link due-only expiry" and .conclusion=="success")] | length)==1)] | length)==1
    then "P6_EXPIRY_PRIMARY_PLUS_P7_REAL_DUE_ONLY_STEPS_PASS"
    else error("HOLD_P6_EXPIRY_PIN_JOB_STEPS_NOT_VERIFIED") end
  ' || hold BACKSTOP_STEPS_UNVERIFIED

# Recheck the unchanged approved code. A manual HEALTH probe is completely
# nonpaid/read-only, and still reports historical native GH cron gaps honestly.
assert_pins
hb_before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run "$hb_wf" --repo "$REPO" --ref main \
  -f confirm=READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO >/dev/null
hb_id=""
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  hb_id="$(gh run list --repo "$REPO" --workflow "$hb_wf" --limit 15 \
    --json databaseId,createdAt,event,headSha \
    --jq '.[] | select(.event=="workflow_dispatch" and .headSha=="c8e065d665ccacb6d2575070e94c5500b7583044" and .createdAt >= "'"$hb_before"'") | .databaseId' | head -1 || true)"
  test -n "$hb_id" && break
  sleep 4
done
test -n "$hb_id" || hold NEW_HEARTBEAT_RUN_NOT_IDENTIFIED
printf 'P6_EXPIRY_REPAIR_HEARTBEAT_RUN=https://github.com/%s/actions/runs/%s\n' "$REPO" "$hb_id"
gh run watch "$hb_id" --repo "$REPO" --exit-status || hold HEARTBEAT_STILL_ACTIONABLE_INCIDENT
gh run view "$hb_id" --repo "$REPO" --json conclusion,headSha,jobs \
  --jq 'if .conclusion=="success" and .headSha=="c8e065d665ccacb6d2575070e94c5500b7583044" and ([.jobs[] | select(.name=="actual-main-nonpaid-controller-heartbeat" and .conclusion=="success")] | length)==1 then "P6_EXPIRY_MAIN_NONPAID_HEARTBEAT_PASS" else error("HOLD_P6_EXPIRY_PIN_HB_RESULT_UNVERIFIED") end' \
  || hold HB_ACTUAL_JOB_UNVERIFIED
printf 'P6_EXPIRY_TWO_PIN_SCOPE_REPAIR_VERIFIED_NO_PAID_GO\n'