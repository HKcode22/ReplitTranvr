#!/usr/bin/env bash
# One owner reconciliation and staging operation. No paid or PRE/POST dispatch.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
E=phase6-protected-runtime
S=c8e065d665ccacb6d2575070e94c5500b7583044
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
hold(){ echo "HOLD_P6_NATIVE_STAGE_$1"; exit 2; }
[[ $# == 1 && "$1" == OWNER_APPROVES_EXISTING_NATIVE_PRE_POST_ACTOR_STAGING_KEEP_ROUTES_OFF ]] || hold OWNER_CONFIRM
[[ $(gh api user --jq .login) == HKcode22 ]] || hold OWNER
[[ $(gh api "repos/$R/git/ref/heads/main" --jq .object.sha) == "$S" ]] || hold MAIN
[[ $(gh api "repos/$L/git/ref/heads/main" --jq .object.sha) == "$LS" ]] || hold RELAY_MAIN
[[ $(gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R "$L") == 0 ]] || hold ROLLING
[[ $(gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R "$L") == 1 ]] || hold RETENTION
quiet(){
 for scope in "repos/$R/actions/variables" "repos/$R/environments/$E/variables"; do
  v="$(gh api "$scope?per_page=100" --paginate --jq '.variables[]|[.name,.value]|@tsv')"
  if grep -Eq '^(P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED|P5_AUTO_SOURCE_DISPATCH_ENABLED|P6_PRIVATE_POST_PARENT_ENABLED|P5_POST_AUTO_DISPATCH_ENABLED|P6_NATIVE_POST_PRODUCER_ENABLED|P5_CD_GH_PRE_SCHEDULE_ENABLED|P6_PRIVATE_LATER_ENROLL_ENABLED|P6_PRIVATE_T24_ENROLL_ENABLED|P6_PRIVATE_T24_EXECUTION_ENABLED|P5_CD_GH_WATCHDOG_ENABLED|P5_T24_AUTO_DISPATCH_ENABLED|P5_LATER_PRE_AUTO_DISPATCH_ENABLED|P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED)[[:space:]]+(1|true)$' <<< "$v"; then hold ROUTE_ALREADY_ENABLED; fi
 done
 for status in queued in_progress waiting requested pending; do
  v="$(gh api "repos/$R/actions/runs?status=$status&per_page=100" --paginate --jq '.workflow_runs[].path')"
  if grep -Eq '^\.github/workflows/(phase6-direct-recovery-tick|phase6-rolling-controller|phase5-source-upcoming-queue|phase5-one-signed-day-source|phase5-one-signed-future-post|phase5-cd-github|phase6-private-later-enrollment)' <<< "$v"; then hold ACTIVE_WORKER; fi
 done
}
quiet
gh api "repos/$R/actions/runs/45125753815" --jq '.conclusion' | grep -qx success || hold POST_ACTOR_RECEIPT
gh api "repos/$R/actions/runs/45123278530" --jq '.conclusion' | grep -qx success || hold POLICY_RECEIPT
gh api "repos/$R/issues/comments/7115092142" | jq -e --arg s "$S" '.user.login=="HKcode22" and (.body|contains("PHASE6 G13 OWNER PAID GO AT")) and (.body|contains($s))' >/dev/null || hold G13_RECEIPT
# Verify exact original failure and complete current history, not a new epoch.
gh api "repos/$R/actions/runs/45293307564" | jq -e --arg s "$S" '.head_sha==$s and .run_attempt==1 and .conclusion=="failure"' >/dev/null || hold INCIDENT_ID
gh api "repos/$R/actions/runs/45293307564/artifacts" --jq '.total_count' | grep -qx 0 || hold INCIDENT_ARTIFACT
log="$(gh run view 45293307564 -R "$R" --job 138107310909 --log)"
grep -q 'HOLD_P6_DIRECT_RECOVERY_NO_EXACT_SEPARATE_APPROVAL_OR_CONFLICTING_ROOT' <<< "$log" || hold INCIDENT_LOG
unset log
# Require complete history; allow only observed no-provider routes and original failed root.
history="$(gh api "repos/$R/actions/runs?branch=main&created=%3E%3D2026-11-23T23%3A45%3A00Z&per_page=100")"
jq -e '.total_count==(.workflow_runs|length) and all(.workflow_runs[]; (.id==45293307564 or .path==".github/workflows/phase5-primary-fids-expiry-no-provider.yml" or .path==".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml" or .path==".github/workflows/phase5-six-slot-approved-early-four-airport-draw.yml"))' <<< "$history" >/dev/null || hold UNRECONCILED_HISTORY
# Existing production connection. No owner DB write, no credentials in output.
node <<'P6_RO'
const {Client}=require("pg");
const manifest="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e",cost="cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9";
async function main(){
 if(!process.env.DATABASE_URL)throw Error("DATABASE_URL_MISSING");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
 await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='10s'");
 const r=(await c.query("SELECT clock_timestamp() AS observed_utc,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only,NOT pg_is_in_recovery() AS primary,(SELECT COUNT(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) AS enabled_manifest,(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_source_request_grid_sha256 IS NULL AND reviewed_cost_envelope_sha256=$2) AS typed_cost_release,(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source_attempts,(SELECT COUNT(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS other_rest_reservations,(SELECT COUNT(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS unresolved_stops,(SELECT COUNT(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS day1_draw_rows,(SELECT COUNT(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS day2_draw_rows,(SELECT COUNT(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=2) AS day2_index_rows",[manifest,cost])).rows[0];
 await c.query("ROLLBACK");console.log(JSON.stringify(r));
 if(!r.correct_db||!r.read_only||!r.primary||r.enabled_manifest!==1||r.typed_cost_release!==1||r.source_attempts!==0||r.other_rest_reservations!==0||r.unresolved_stops!==0||r.day2_draw_rows!==4)throw Error("LIVE_RECONCILIATION_HOLD");
 }finally{await c.end().catch(()=>{});}
}
main().catch(e=>{console.error("HOLD_P6_NATIVE_STAGE_DB",e.code||e.name);process.exitCode=2;});
P6_RO
repo="$(gh api "repos/$R/actions/secrets?per_page=100" --paginate --jq '.secrets[].name')"
env="$(gh api "repos/$R/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name')"
names="$repo"$'\n'"$env"
# Do not fabricate missing private keys, signatures, hash pins, actor URLs or independent policy proofs.
required=(P5_CD_GH_PRE_APPROVED_CODE_SHA P5_CD_GH_PRE_STOP P5_V39_PRE_DATABASE_URL P5_V39_PREPARE_DATABASE_URL P5_V39_T24_WITNESS_DATABASE_URL P6_PRIVATE_READER_DATABASE_URL P6_PRIVATE_PUBLISHER_DATABASE_URL P6_NONPAID_DAILY_POLICY_BASE64 P6_NONPAID_DAILY_POLICY_SHA256 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED P6_PHASE7_PRE_POLICY_BASE64 P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256 P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256 P6_PHASE7_PRE_READBACK_DATABASE_URL P6_PHASE7_PRE_READBACK_ROLE P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256 P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64 P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64 P6_PRIVATE_LATER_REVIEWER_KEY_BASE64 P6_PRIVATE_DAY_REVIEWER_KEY_BASE64 V39_P5_POST_APPROVED_CODE_SHA P6_NATIVE_POST_POLICY_BASE64 P6_NATIVE_POST_POLICY_SHA256 P6_PRIVATE_POST_REVIEWER_TRUST_BASE64 P6_PRIVATE_POST_STORED_REVIEW_APPROVED P5_V39_OTHER_REST_REVIEW_DATABASE_URL P5_V39_OTHER_REST_RESERVE_DATABASE_URL V39_P5_POST_CATEGORY_BUDGET_SHA256 V39_P5_POST_PROVIDER_CONTRACT_SHA256 V39_P5_POST_PRICE_SHA256 P6_PHASE7_POST_PRESERVATION_POLICY_BASE64 P6_PHASE7_POST_PRESERVATION_POLICY_SHA256 P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64 P6_PHASE7_POST_SCOPED_DATABASE_URL)
missing=()
for k in "${required[@]}"; do
 grep -qx "$k" <<< "$names" || missing+=("$k")
done
if (( ${#missing[@]} )); then printf 'REQUIRED_EXISTING_NAME_NOT_VISIBLE %s\n' "${missing[@]}"; hold EXISTING_POLICY_OR_ACTOR_NAMES; fi
# Restore only missing literal controls within existing reviewed native path.
# Do not enable standalone-without-T24, legacy automatic modes, or supplemental feature approvals.
controls=(P5_CD_GH_PRE_ARMED P5_CD_GH_PREPARE_ARMED P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED P5_CD_GH_T24_PREPARE_APPROVED P5_CD_GH_T24_WITNESS_APPROVED P5_CD_GH_PRIVATE_CURRENT_APPROVED P6_NATIVE_LATER_RUNTIME_APPROVED V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED V39_P5_POST_OWNER_APPROVED V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED P6_PRIVATE_POST_CHILD_APPROVED P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED P6_PRIVATE_POST_PARENT_APPROVED P6_NATIVE_POST_PRODUCER_APPROVED P6_PRIVATE_POST_OUTCOME_TAIL_HOURS)
for k in "${controls[@]}"; do
 if grep -qx "$k" <<< "$names"; then echo "PRESENT_UNCHANGED_$k"; continue; fi
 value=1; [[ "$k" != P6_PRIVATE_POST_OUTCOME_TAIL_HOURS ]] || value=48
 gh secret set "$k" -R "$R" -e "$E" --body "$value" >/dev/null || hold "WRITE_UNKNOWN_$k"
 gh api "repos/$R/environments/$E/secrets/$k" --jq '{name,updated_at}'
done
quiet
echo P6_EXISTING_NATIVE_PRE_POST_CONTROLS_STAGED_RECONCILED_NO_ROUTE_NO_DISPATCH
