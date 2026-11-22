#!/usr/bin/env bash
# Owner-only exact merge and disarmed Gate 2/3/7 verification. No SOURCE enable.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
A="repos/$R"
RR=HKcode22/TravnrClockRelay
RP=046d89d341fa9f24524ea11e2778e273e3f39533
E=phase6-protected-runtime
OLD=e058b9d0817151d4b10282c9242c6c8ebeef7814
H=609341b862144a91c49e1b58fe1f3cb669c25d28
AUTH="$HOME/.travnr-phase6-source-auth-exact-962-3ae55fabcc03ac41/auth.json"
AUTH_SHA=3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c
MAN=a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e
hold(){ echo "HOLD_P6_FINAL_DISARMED_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == MERGE_EXACT_962_AND_VERIFY_DISARMED_NO_PAID_GO ]] || hold OWNER_SCOPE
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_ID
[[ -f "$AUTH" && ! -L "$AUTH" && "$(sha256sum "$AUTH" | cut -d' ' -f1)" == "$AUTH_SHA" ]] || hold AUTH_BYTES
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
main(){ gh api "$A/git/ref/heads/main" --jq .object.sha; }
relay(){ gh api "repos/$RR/git/ref/heads/main" --jq .object.sha; }
var(){ gh variable get "$1" -R "$2"; }
isvar(){ [[ "$(var "$1" "$2")" == "$3" ]] || hold "VARIABLE_$1"; }
gh api "$A/environments/$E" | jq -e '.deployment_branch_policy.protected_branches==false and .deployment_branch_policy.custom_branch_policies==true' >/dev/null || hold ENV_POLICY
gh api "$A/environments/$E/deployment-branch-policies?per_page=100" | jq -e '.total_count==1 and .branch_policies[0].name=="main" and .branch_policies[0].type=="branch"' >/dev/null || hold ENV_BRANCH
[[ "$(relay)" == "$RP" ]] || hold RELAY_PIN
# Verify deployed retention and direct STOP policy values before merging.
isvar P5_PRIMARY_FIDS_EXPIRY_ENABLED "$R" true
isvar P5_PRIMARY_FIDS_BACKSTOP_ENABLED "$R" true
isvar P5_PRIMARY_FIDS_EXPIRY_APPROVAL "$R" APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER
isvar P5_PRIMARY_FIDS_DEADLINE_PROFILE "$R" V0107_VERIFIED_FUTURE_POST_23H_MARGIN
isvar P6_FULL_RETENTION_BACKSTOP_ENABLED "$R" true
isvar P6_PRIVATE_EPOCH_EXPIRY_MODE "$R" APPLY_DUE_ONLY
isvar P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256 "$R" "$MAN"
isvar P6_PRIVATE_EPOCH_EXPIRY_APPROVAL "$R" APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER
isvar P7_EXPIRY_ENABLED "$R" true
isvar P7_EXPIRY_APPROVAL "$R" APPLY_P7_DUE_ONLY_NO_PROVIDER
[[ "$(var P6_ROLLING_DIRECT_RECOVERY_ENABLED "$R" 2>/dev/null || true)" != 1 ]] || hold DIRECT_ALREADY_ENABLED
isvar TRAVNR_RELAY_MODE "$RR" MULTI_LANE
isvar TRAVNR_RELAY_PRIMARY_ENABLED "$RR" 1
isvar TRAVNR_RELAY_ROLLING_ENABLED "$RR" 1
isvar TRAVNR_RELAY_FULL_RETENTION_APPROVED "$RR" 1
# Only names, never values. No duplicate environment shadow values.
names(){
 gh api "$A/actions/secrets?per_page=100" --paginate --jq '.secrets[].name' | sort -u >"$T/repo"
 gh api "$A/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name' | sort -u >"$T/env"
 [[ ! -s "$T/duplicates" ]] || true
 comm -12 "$T/repo" "$T/env" >"$T/duplicates"
 [[ ! -s "$T/duplicates" ]] || hold DUPLICATE_SCOPE
}
exists(){ grep -Fxq "$1" "$T/repo" || grep -Fxq "$1" "$T/env"; }
names
# Actual static/key/login values were already read back in Gate 6. Do not
# recreate them or move them. A missing real value is a HOLD, not a new key.
required=(
 V39_P5_MANIFEST_SHA256 V39_P5_RIGHTS_SHA256 V39_P5_RELEASE_SHA256
 V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED
 P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN
 P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256 P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256
 P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256 P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64
 P6_PHASE7_POST_PRESERVATION_POLICY_SHA256 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64
 P6_PRIVATE_POST_REVIEWER_TRUST_BASE64 P6_PHASE7_PRE_POLICY_BASE64 P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256
 P6_PHASE7_POST_CONTRACT_SHA256 P6_PHASE7_POST_PROFILE_SHA256 V39_P5_SOURCE_DATABASE_URL
 P6_PHASE7_POST_SCOPED_DATABASE_URL P6_PRIVATE_READER_DATABASE_URL P6_PRIVATE_PUBLISHER_DATABASE_URL
 P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64 P6_PHASE7_POST_PRESERVATION_POLICY_BASE64
 P6_NATIVE_POST_POLICY_BASE64 P6_NATIVE_POST_POLICY_SHA256
 P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL
)
missing=()
for k in "${required[@]}"; do exists "$k" || missing+=("$k"); done
if (( ${#missing[@]} )); then printf 'Missing existing POST binding: %s\n' "${missing[@]}" >&2; hold EXISTING_POST_VALUES; fi
# Keep global STOP/arm approvals at the repository scope.
for k in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 grep -Fxq "$k" "$T/repo" || hold GLOBAL_STOP_SCOPE
 gh secret set "$k" -R "$R" --body 0
done
# Confirm PR exact evidence-only successor and complete CI, never squash or
# rebase: the exact reviewed executable commit must remain an ancestor.
gh api "$A/pulls/962" >"$T/pr"
jq -e --arg h "$H" --arg o "$OLD" '.head.sha==$h and .base.ref=="main" and .draft==false and (.merged==true or (.base.sha==$o and .state=="open"))' "$T/pr" >/dev/null || hold PR_IDENTITY
if [[ "$(jq -r .merged "$T/pr")" == false ]]; then
 [[ "$(main)" == "$OLD" ]] || hold MAIN_MOVED
 gh run watch 44990585995 -R "$R" --interval 5 --exit-status
 gh api "$A/commits/$H/check-runs?per_page=100" | jq -e '.total_count==43 and ([.check_runs[]|select(.status=="completed" and .conclusion=="success")]|length)==20 and ([.check_runs[]|select(.status=="completed" and .conclusion=="skipped")]|length)==23' >/dev/null || hold EXACT_CI
 [[ "$(main)" == "$OLD" ]] || hold MAIN_MOVED_BEFORE_MERGE
 gh pr merge 962 -R "$R" --merge --match-head-commit "$H"
fi
gh api "$A/pulls/962" >"$T/pr"
PIN="$(jq -r .merge_commit_sha "$T/pr")"
[[ "$PIN" =~ ^[a-f0-9]{40}$ && "$(jq -r .merged "$T/pr")" == true && "$(main)" == "$PIN" ]] || hold MERGE_ACK_RECONCILE
gh api "$A/commits/$PIN" | jq -e --arg o "$OLD" --arg h "$H" '[.parents[].sha]==[$o,$h]' >/dev/null || hold MERGE_ANCESTRY
[[ "$(gh api "$A/git/commits/$PIN" --jq .tree.sha)" == "$(gh api "$A/git/commits/$H" --jq .tree.sha)" ]] || hold MERGE_TREE
pin(){ [[ "$(main)" == "$PIN" && "$(relay)" == "$RP" ]] || hold FINAL_PIN_MOVED; }
pin
# First restore ongoing existing due-only retention protection on the merged SHA.
for k in P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA; do
 gh variable set "$k" -R "$R" --body "$PIN"
 isvar "$k" "$R" "$PIN"
done
# Existing approvals and pins stay in their existing scope. Only missing
# job-scoped flags go in the main-only environment. No paid route is armed.
setscoped(){
 local k="$1" v="$2"
 if grep -Fxq "$k" "$T/repo"; then gh secret set "$k" -R "$R" --body "$v"
 else gh secret set "$k" -R "$R" --env "$E" --body "$v"; fi
}
setscoped V39_P5_POST_APPROVED_CODE_SHA "$PIN"
for k in P6_PHASE7_POST_RECOVERY_APPROVED P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED P6_PHASE7_POST_STORAGE_APPROVED P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED P6_PRIVATE_POST_STORED_REVIEW_APPROVED P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED; do
 setscoped "$k" 1
done
names
echo "{\"status\":\"P6_EXACT_MERGED_POST_AND_RETENTION_PINS_READY_NO_GO\",\"main\":\"$PIN\",\"phase6PaidGo\":false}"
# Reuse current existing retention APPLY-only duty; no new deletion scope.
# Snapshot prior matching IDs and accept exactly one new run; never blindly replay.
dispatch(){
 local wf="$1" title="$2"; shift 2
 local api="$A/actions/workflows/$wf/runs?branch=main&event=workflow_dispatch&per_page=100"
 local before="$T/before-$wf" after="$T/after-$wf"
 local id count n
 gh api "$api" --jq '.workflow_runs[].id' | sort -n >"$before"
 pin
 gh workflow run "$wf" -R "$R" --ref main "$@" >&2
 for n in $(seq 1 60); do
  gh api "$api" | jq -r --arg pin "$PIN" --arg title "$title" '.workflow_runs[]|select(.head_sha==$pin and .run_attempt==1 and .display_title==$title)|.id' | sort -n >"$after"
  comm -13 "$before" "$after" >"$T/new-$wf"
  count="$(wc -l <"$T/new-$wf" | tr -d ' ')"
  [[ "$count" -le 1 ]] || hold "AMBIGUOUS_$wf"
  if [[ "$count" == 1 ]]; then cat "$T/new-$wf"; return; fi
  sleep 2
 done
 hold "DISPATCH_ACK_$wf"
}
RET="$(dispatch phase5-primary-fids-expiry-no-provider.yml 'P5 FULL RETENTION BACKSTOP CHILD' -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER -f approved_main_sha="$PIN")"
POST="$(dispatch phase5-one-signed-future-post-v0083-main-manual.yml 'P5 POST ACTOR_PREFLIGHT_ONLY' -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY -f private_transport=checkout)"
CLOCK="$(dispatch phase6-direct-recovery-tick.yml 'P6 DIRECT RECOVERY VERIFY' -f confirm=VERIFY_DIRECT_RECOVERY_CLOCK_NO_PROVIDER_NO_DB_NO_DISPATCH -f approved_main_sha="$PIN")"
echo "{\"status\":\"P6_FINAL_DISARMED_RUNS_DISPATCHED\",\"main\":\"$PIN\",\"retentionRun\":$RET,\"postRun\":$POST,\"clockRun\":$CLOCK,\"phase6PaidGo\":false}"
gh run watch "$RET" -R "$R" --interval 5 --exit-status
job(){
 gh api "$A/actions/runs/$1/jobs?filter=latest&per_page=100" | jq -er --arg n "$2" --arg pin "$PIN" '[.jobs[]|select(.name==$n and .head_sha==$pin and .conclusion=="success")]|if length==1 then .[0].id else error("JOB_NOT_SUCCESS") end'
}
RJ="$(job "$RET" primary-fids-expiry)"
PJ="$(job "$RET" phase7-expiry)"
gh run view "$RET" -R "$R" --job "$RJ" --log >"$T/primary.log"
gh run view "$RET" -R "$R" --job "$PJ" --log >"$T/research.log"
node --input-type=module - "$T" "$PIN" <<'JS'
import fs from "node:fs";const [t,p]=process.argv.slice(2);
function read(file,status){const v=[];for(const l of fs.readFileSync(t+"/"+file,"utf8").split(/\r?\n/)){const i=l.indexOf("{");if(i<0)continue;try{const x=JSON.parse(l.slice(i));if(x.status===status)v.push(x)}catch{}}if(v.length!==1)throw Error("HOLD_RETENTION_RECEIPT_"+status);return v[0]}
const a=read("primary.log","PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED"),b=read("primary.log","PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED"),c=read("research.log","P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK");
if([a,b,c].some(x=>x.providerCalls!==0||x.phase6PaidGo!==false)||a.reviewedMainSha!==p||b.reviewedMainSha!==p||a.distinctDbActorsVerified!==true||a.primaryDeadlineProfile!=="V0107_VERIFIED_FUTURE_POST_23H_MARGIN"||a.deadlineEvidenceHold!==false||b.deadlineDueObservedAtInitialRead!==false||c.writerActorVerified!==true||a.after.hardDueOriginals!==0||a.after.eligibleOriginals!==0||a.after.deletionStopUnresolved!==false||b.after.duePackets!==0||b.after.dueIndexes!==0||b.after.foreignDuePackets!==0||b.after.foreignDueIndexes!==0||b.after.deletionStopUnresolved!==false||[c.after.dueLinks,c.after.dueBundles,c.after.dueFragments].some(x=>x!==0))throw Error("HOLD_RETENTION_FINAL_RECEIPTS");
console.log(JSON.stringify({status:"P6_FINAL_MAIN_THREE_SURFACE_RETENTION_READBACK_PASS_NO_GO",main:p,providerCalls:0,phase6PaidGo:false}));
JS
# Existing full-retention route uses this actual completed baseline.
pin
gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RR" --body "$PIN"
isvar TRAVNR_APPROVED_TARGET_MAIN_SHA "$RR" "$PIN"
gh variable set TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID -R "$RR" --body "$RET"
isvar TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID "$RR" "$RET"
echo "{\"status\":\"P6_RELAY_TARGET_REPINNED_NO_GO\",\"main\":\"$PIN\",\"retentionRun\":$RET,\"phase6PaidGo\":false}"
# Do not require a paid controller run merely to prove prelaunch readiness.
gh run watch "$POST" -R "$R" --interval 5 --exit-status
OJ="$(job "$POST" exact-main-post-actors-only)"
gh run view "$POST" -R "$R" --job "$OJ" --log >"$T/post.log"
gh run watch "$CLOCK" -R "$R" --interval 5 --exit-status
CJ="$(job "$CLOCK" direct-readonly-verify)"
gh run view "$CLOCK" -R "$R" --job "$CJ" --log >"$T/direct.log"
node --input-type=module - "$T" "$PIN" <<'JS'
import fs from "node:fs";const [t,p]=process.argv.slice(2);
function rows(file,status){const a=[];for(const l of fs.readFileSync(t+"/"+file,"utf8").split(/\r?\n/)){const i=l.indexOf("{");if(i<0)continue;try{const x=JSON.parse(l.slice(i));if(x.status===status)a.push(x)}catch{}}return a}
const a=rows("post.log","P7_POST_ACTOR_PREFLIGHT_PASS_NO_GO"),b=rows("direct.log","ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO");
if(a.length!==3||a.map(x=>x.role).sort().join(",")!=="publisher,reviewer,storage"||a.some(x=>x.providerCalls!==0||x.databaseWrites!==0||x.observationSigned!==false||x.phase6PaidGo!==false))throw Error("HOLD_POST_ACTOR_RECEIPTS");
if(b.length!==1||b[0].actualCheckoutSha!==p||b[0].observedMainSha!==p||b[0].providerCalls!==0||b[0].databaseReads!==0||b[0].routeStates?.length!==8||b[0].routeStates.some(x=>x.state!=="active"))throw Error("HOLD_DIRECT_RECEIPT");
console.log(JSON.stringify({status:"P6_FINAL_MAIN_POST_THREE_ACTORS_AND_DIRECT_EIGHT_ROUTES_PASS_NO_GO",main:p,postActors:3,routes:8,providerCalls:0,phase6PaidGo:false}));
JS
pin
echo "{\"status\":\"P6_FINAL_DISARMED_VERIFICATION_COMPLETE_NO_GO\",\"main\":\"$PIN\",\"retentionRun\":$RET,\"postRun\":$POST,\"clockRun\":$CLOCK,\"sourceEnabled\":false,\"phase6PaidGo\":false}"
