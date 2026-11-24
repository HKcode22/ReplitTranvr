#!/usr/bin/env bash
# Exact diagnosed missing T24 policy field repair; original main unchanged.
# One bounded lane initially, all scientific/budget/retention rules preserved.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
OLD=2026-11-24T01:00:52.000Z
DIR="$HOME/.travnr-g12-seal-jUvJmL5A"
hold(){ echo "HOLD_P6_T24_LANE_REPAIR_$1" >&2; exit 2; }
[[ $# == 1 && "$1" == OWNER_APPROVES_MISSING_T24_ONE_LANE_POLICY_AND_PROSPECTIVE_NORMAL_RESTART ]] || hold CONFIRM
pin(){
 [[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
 [[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
 [[ $(gh api "repos/$L/git/ref/heads/main" --jq .object.sha) == "$LS" ]] || hold RELAY
}
pin
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]]
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]]
[[ $(gh variable get P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED -R "$R") == false ]]
[[ $(gh variable get P6_PRIVATE_POST_PARENT_ENABLED -R "$R") == false ]]
[[ $(gh variable get P6_NATIVE_POST_PRODUCER_ENABLED -R "$R") == 0 ]]
[[ $(gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R "$R") == true ]]
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$OLD" ]]
[[ $(gh variable get P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC -R "$R") == "$OLD" ]]
[[ $(gh variable get P6_ROLLING_DIRECT_RECOVERY_ENABLED -R "$R") == 1 ]]
# No production protected environment bypass. Exact prior successful
# repo-only static diagnostic, and the actual current-main I receipts.
gh api "repos/$R/actions/runs/45325433100" | jq -e '.head_sha=="ba3110c2ec37e6eeea915b94788dd800b8cddbeb" and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold DIAGNOSTIC_RUN
for id in 45324664146 45324674821; do
 gh api "repos/$R/actions/runs/$id" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .conclusion=="success"' >/dev/null || hold I_RECEIPT
done
for f in owner-private.pem request.json artifact/p6-g12-owner-sealed-code-repin-successor.json; do
 [[ -f "$DIR/$f" && ! -L "$DIR/$f" ]] || hold ORIGINAL_OWNER_ARTIFACT_ABSENT
done
TMP="$(mktemp -d)"
phase=before
setv(){ gh variable set "$1" -R "$R" --body "$2" >/dev/null && [[ $(gh variable get "$1" -R "$R") == "$2" ]]; }
cleanup(){
 local rc=$?
 rm -rf -- "$TMP"
 if [[ "$phase" == activating ]]; then
  set +e
  gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 0 >/dev/null
  setv P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false
  setv P6_PRIVATE_POST_PARENT_ENABLED false
  setv P6_NATIVE_POST_PRODUCER_ENABLED 0
  echo P6_PAID_ROUTE_PAUSE_ATTEMPTED_NO_REPLAY
 elif [[ "$phase" == changing ]]; then
  echo P6_POLICY_LINK_CHANGE_UNCERTAIN_KEEP_PREP_PAUSED_RECONCILE
 fi
 exit "$rc"
}
trap cleanup EXIT
BLOB=466a0916eac736c87fe5ac49ff8ffe3ea001415c
gh api "repos/$R/git/blobs/$BLOB" --jq .content | base64 --decode > "$TMP/repair.cjs"
[[ $(git hash-object "$TMP/repair.cjs") == "$BLOB" ]] || hold BLOB
node --check "$TMP/repair.cjs"
node "$TMP/repair.cjs" --verify "$DIR/owner-private.pem" "$DIR/artifact/p6-g12-owner-sealed-code-repin-successor.json" "$DIR/request.json"
# Prevent racing genesis while the linked policy bytes are replaced.
# Existing independent retention remains operational.
for k in P6_NONPAID_DAILY_POLICY_BASE64 P6_NONPAID_DAILY_POLICY_SHA256 P6_NONPAID_TRANSPORT_TRUST_BASE64 P6_NONPAID_TRANSPORT_TRUST_SHA256; do
 gh api "repos/$R/actions/secrets/$k" | jq -e '.updated_at<"2026-11-23T23:45:00Z"' >/dev/null || hold "POLICY_CHANGED_SINCE_LAUNCH_$k"
done
setv P6_NONPAID_SOURCE_SCHEDULE_ENABLED false || hold PREP_PAUSE
# If a scheduled operation was already admitted, do not cancel it.
for status in queued in_progress waiting pending requested; do
 paths="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[]|select(.head_branch=="main")|.path')"
 if grep -Eq '^\.github/workflows/(phase6-nonpaid-source-day-prepare-publish|phase6-direct-recovery-tick|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post|phase5-cd-github|phase6-private-later-enrollment)' <<< "$paths"; then
  setv P6_NONPAID_SOURCE_SCHEDULE_ENABLED true || true
  hold LIVE_RELEVANT_WORKER_RECONCILE_FIRST
 fi
done
census(){
node <<'P6_RO'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
 const r=(await c.query("SELECT clock_timestamp() AS db_clock,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) AS cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS d2,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) AS claims,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) AS indexes",["a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e","cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9"])).rows[0];
 await c.query("ROLLBACK"); console.log(JSON.stringify(r));
 if(!r.correct_db||!r.read_only||!r.primary||r.auth!==1||r.cost!==1||r.source!==0||r.rest!==0||r.stops!==0||r.d1!==0||r.d2!==4||r.claims!==0||r.indexes!==0)throw Error("LIVE_POLICY_GENESIS_NOT_EMPTY");
 }finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_T24_POLICY_CENSUS",e.code||e.name);process.exitCode=2;});
P6_RO
}
if ! census; then setv P6_NONPAID_SOURCE_SCHEDULE_ENABLED true || true; hold NO_SAFE_POLICY_REPLACEMENT; fi
phase=changing
node "$TMP/repair.cjs" --repair-t24-lane "$DIR/owner-private.pem" "$DIR/artifact/p6-g12-owner-sealed-code-repin-successor.json" "$DIR/request.json" || hold NARROW_POLICY_WRITE
setv P6_NONPAID_SOURCE_SCHEDULE_ENABLED true || hold PREP_REENABLE
phase=testing
# No reruns of failed executions. New prospective no-provider T24 test,
# now with exact diagnosed field restored. Reuse I's later success.
dispatch(){
 local wf="$1" before ids
 shift
 before="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2 || return 1
 for n in $(seq 1 30); do
  ids="$(gh run list -R "$R" --workflow "$wf" --event workflow_dispatch --limit 15 --json databaseId,createdAt,headSha --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"$before\")|.databaseId")" || return 1
  if [[ -n "$ids" ]]; then [[ $(wc -l <<< "$ids") == 1 ]] || return 1; printf '%s\n' "$ids";return 0;fi
  sleep 3
 done
 return 1
}
t24="$(dispatch phase5-cd-github-one-queued-t24-witness-main-manual.yml -f confirm=RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER -f frozen_roster='')" || hold T24_DISPATCH_UNCERTAIN
echo "P6_T24_CORRECTED_RUN=$t24"
timeout 600 gh run watch "$t24" -R "$R" --exit-status || hold T24_ACTUAL_FAILED_NO_REPLAY
gh api "repos/$R/actions/runs/$t24/jobs?per_page=100" | jq -e '([.jobs[]|select(.name=="current-private-native-t24" and .conclusion=="success")]|length)==1' >/dev/null || hold T24_NOT_EXECUTED
log="$(gh run view "$t24" -R "$R" --log)"
grep -q '"status":"NO_DUE_CURRENT_PRIVATE_T24_PACKETS"' <<< "$log" || hold T24_NO_DUE_RECEIPT_UNVERIFIED
unset log
echo P6_ACTUAL_T24_CORRECTED_NO_DUE_PASS
# Verify the two linked policy digests through the actual daily prep runtime.
prep="$(dispatch phase6-nonpaid-source-day-prepare-publish.yml -f run_day_index=2 -f confirm=ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH)" || hold PREP_DISPATCH_UNCERTAIN
echo "P6_CORRECTED_POLICY_DAY2_PREP_RUN=$prep"
timeout 600 gh run watch "$prep" -R "$R" --exit-status || hold PREP_ACTUAL_FAILED_NO_REPLAY
gh api "repos/$R/actions/runs/$prep/jobs?per_page=100" | jq -e '([.jobs[]|select(.name=="protected-main-one-day-nonpaid" and .conclusion=="success")]|length)==1' >/dev/null || hold PREP_NOT_EXECUTED
log="$(gh run view "$prep" -R "$R" --log)"
grep -q '"status":"NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE"' <<< "$log" || hold PREP_NEW_GENESIS_OR_UNEXPECTED_RECEIPT_REVIEW
unset log
echo P6_ACTUAL_LINKED_DAILY_POLICY_NO_DUE_PASS
# Reconcile original incident history, not an arbitrary silent epoch reset.
h="$(gh api "repos/$R/actions/runs?branch=main&created=%3E%3D2026-11-24T01%3A00%3A52Z&per_page=100")"
jq -e --argjson t "$t24" --argjson p "$prep" '.total_count==(.workflow_runs|length) and all(.workflow_runs[];
 (.id|IN(45302763595,45307333953,45307652365,45321496617,45323393757,45324664146,45324674821,45315773941,45315758768,45311573986,$t,$p)) or
 (.path==".github/workflows/phase5-primary-fids-expiry-no-provider.yml" and .conclusion=="success") or
 ((.conclusion=="success" or .conclusion=="skipped") and (.path|IN(".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",".github/workflows/phase5-cd-github-bounded-pre-tick.yml",".github/workflows/phase6-private-later-enrollment.yml",".github/workflows/phase5-cd-github-existing-queue-lease-watchdog.yml",".github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml",".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml",".github/workflows/phase5-autonomous-clock-canary-no-provider.yml"))))' <<< "$h" >/dev/null || hold NEW_UNRECONCILED_HISTORY
census
pin
new="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
gh issue comment 413 -R "$R" --body "PHASE6 OWNER VERIFIED MISSING T24 LANE POLICY REPAIR AND PROSPECTIVE NORMAL RESTART: old epoch $OLD, exact missing nativeLaterReview.maximumT24ExecutionLanes reproduced in repository-only run 45325433100, in-memory single-lane correction passed. Existing authenticated G12 policy corrected only lane=1 and linked transport digest, four values, no other changes; actual main T24 run $t24 no due PASS and linked Day2 prepare $prep no due PASS. I later PRE 45324674821 PASS. Original failure runs 45302763595 45307333953 45307652365 45321496617 45323393757 retained; fresh zero physical/STOP/claims/index census. New explicitly authorized prospective epoch $new, main $S, no Day1 exceptional deployment, no replay." >/dev/null || hold RESTART_LEDGER
phase=activating
setv P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$new" || hold TARGET_EPOCH
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L" --body "$new" >/dev/null
[[ $(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$L") == "$new" ]]
setv P6_NATIVE_POST_PRODUCER_ENABLED 1 || hold POST_PRODUCER
setv P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true || hold SOURCE
setv P6_PRIVATE_POST_PARENT_ENABLED true || hold POST
# The first real root must prove execution before re-enabling external relay.
id="$(dispatch phase6-direct-recovery-tick.yml -f confirm=RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO -f approved_main_sha="$S")" || hold DIRECT_DISPATCH_UNCERTAIN
echo "P6_FIRST_NEW_DIRECT_RUN=$id"
timeout 660 gh run watch "$id" -R "$R" --exit-status || hold DIRECT_ACTUAL_FAILURE_NO_REPLAY
j="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
jq -e '([.jobs[]|select(.name=="direct-protected-recovery-tick" and .conclusion=="success")]|length)==1 and ([.jobs[]|select(.name=="direct-protected-recovery-tick")|.steps[]|select((.name=="Direct outcome TERMINAL_PARENT_ACKS_RECONCILED" or .name=="Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED") and .conclusion=="success")]|length)==1' <<< "$j" >/dev/null || hold DIRECT_WAVE_NOT_PROVEN
gh api "repos/$R/actions/runs/$id/artifacts" | jq -e --arg n "p6-direct-terminal-$id" '.total_count==1 and .artifacts[0].name==$n and .artifacts[0].expired==false' >/dev/null || hold DIRECT_RECEIPT
pin
gh variable set TRAVNR_RELAY_ROLLING_ENABLED -R "$L" --body 1 >/dev/null
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 1 ]]
phase=done
echo "P6_ACTUAL_DIRECT_WAVE_VERIFIED=$id"
echo P6_T24_POLICY_REPAIRED_ACTUAL_WORKERS_AND_DIRECT_WAVE_PASS_AUTONOMOUS_NORMAL_ROUTES_RESUMED
