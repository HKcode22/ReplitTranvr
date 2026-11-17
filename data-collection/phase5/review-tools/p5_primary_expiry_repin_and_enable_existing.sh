#!/usr/bin/env bash
# Existing V0103 only. No source enable, provider call, DDL or new secret.
# Current exact main; rerun NOT permitted on uncertain APPLY.
set -Eeuo pipefail
set +x
umask 077
REPO='HKcode22/ReplitTranvr'
PIN='6cb6c28a1508a2aaf3ebe5551bf41444dbb6622e'
OLD='0f0f87b0c10f3c724a78c75cf519f82ca7147d08'
WF='phase5-primary-fids-expiry-no-provider.yml'
ENABLE='P5_PRIMARY_FIDS_EXPIRY_ENABLED'
APPROVAL='P5_PRIMARY_FIDS_EXPIRY_APPROVAL'
PINS='P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA'
APPLY='APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER'
VERIFY='VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES'
TMP="$(mktemp -d)"
ARM_ATTEMPT=0
DONE=0
cleanup(){
 local rc=$?
 trap - EXIT
 if (( ARM_ATTEMPT == 1 && DONE == 0 )); then
  if gh variable set "$ENABLE" -R "$REPO" --body false >/dev/null &&
     [[ "$(gh variable get "$ENABLE" -R "$REPO")" == false ]]; then
   echo 'HOLD_RECURRING_APPLY_DISABLED_AFTER_UNCERTAIN_RESULT_NO_REPLAY'
  else
   echo 'HOLD_DISABLE_READBACK_UNKNOWN_CHECK_GITHUB_VARIABLE_NOW'
  fi
 fi
 rm -rf "$TMP"
 exit "$rc"
}
trap cleanup EXIT
hold(){ echo "HOLD_PRIMARY_EXPIRY_REPIN: $1"; exit 2; }
main_pin(){
 [[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] ||
  hold MAIN_CHANGED
}
var(){ gh variable get "$1" -R "$REPO"; }
main_pin
[[ "$(var "$ENABLE")" == false ]] || hold ALREADY_ENABLED_RECONCILE_NOT_REPLAY
old="$(var "$PINS")"
[[ "$old" == "$OLD" || "$old" == "$PIN" ]] || hold UNKNOWN_PRIOR_PIN
ap="$(gh variable list -R "$REPO" --json name,value --jq '.[] | select(.name=="P5_PRIMARY_FIDS_EXPIRY_APPROVAL") | .value')"
[[ -z "$ap" ]] || hold EXISTING_APPROVAL_REVIEW_REQUIRED
endpoint="$(var P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)"
[[ "$endpoint" =~ ^[a-f0-9]{64}$ ]] || hold EXISTING_ENDPOINT_PIN_REQUIRED
names="$(gh secret list -R "$REPO" --json name --jq '.[].name')"
for k in P5_PRIMARY_FIDS_SWEEP_DATABASE_URL P5_RETENTION_READER_DATABASE_URL; do
 grep -Fxq "$k" <<< "$names" || hold EXISTING_SCOPED_SECRET_MISSING
done
if [[ "$old" != "$PIN" ]]; then gh variable set "$PINS" -R "$REPO" --body "$PIN"; fi
[[ "$(var "$PINS")" == "$PIN" && "$(var "$ENABLE")" == false ]] || hold VERIFY_PIN_READBACK
main_pin
run_readback(){
 local mode="$1" tag="$2" id n
 local url="repos/$REPO/actions/workflows/$WF/runs?event=workflow_dispatch&branch=main&per_page=50"
 gh api "$url" --jq '.workflow_runs[].id' | sort -u > "$TMP/old"
 main_pin
 gh workflow run "$WF" -R "$REPO" --ref main -f "confirm=$mode" -f "approved_main_sha=$PIN"
 id=''
 for ((n=0;n<24;n++)); do
  gh api "$url" --jq ".workflow_runs[] | select(.head_sha == \"$PIN\" and .run_attempt == 1) | .id" | sort -u > "$TMP/new"
  comm -13 "$TMP/old" "$TMP/new" > "$TMP/difference"
  nids="$(wc -l < "$TMP/difference")"
  [[ "$nids" -le 1 ]] || hold AMBIGUOUS_NEW_WORKFLOW_RUN
  if [[ "$nids" -eq 1 ]]; then id="$(cat "$TMP/difference")"; break; fi
  sleep 5
 done
 [[ "$id" =~ ^[1-9][0-9]*$ ]] || hold NO_NEW_RUN_ID_DO_NOT_REPLAY
 echo "$tag run: $id"
 timeout 900 gh run watch "$id" -R "$REPO" --interval 10 --exit-status
 main_pin
 gh api "repos/$REPO/actions/runs/$id" > "$TMP/run.json"
 gh api "repos/$REPO/actions/runs/$id/jobs?per_page=100" > "$TMP/jobs.json"
 gh run view "$id" -R "$REPO" --log > "$TMP/log"
 node - "$PIN" "$id" "$tag" "$TMP" <<'NODE'
const fs=require('node:fs');
const [pin,id,tag,dir]=process.argv.slice(2);
const hold=()=>{console.error('HOLD_PRIMARY_EXPIRY_EXACT_JOB_OR_RECEIPT_REVIEW_NO_REPLAY');process.exit(2);};
try{
const a=JSON.parse(fs.readFileSync(dir+'/run.json','utf8')),j=JSON.parse(fs.readFileSync(dir+'/jobs.json','utf8'));
if(String(a.id)!==id||a.head_sha!==pin||a.event!=='workflow_dispatch'||a.run_attempt!==1||
 a.status!=='completed'||a.conclusion!=='success')hold();
const jobs=j.jobs.filter(x=>x.name==='primary-fids-expiry'&&x.conclusion==='success'&&
 x.steps?.some(s=>s.name==='Verify exact main and execute only bounded primary FIDS expiry'&&s.conclusion==='success'));
if(jobs.length!==1)hold();
const status=tag==='VERIFY'?'PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES':'PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED';
const needle='{"status":"'+status+'"';
const hits=fs.readFileSync(dir+'/log','utf8').split('\n').filter(l=>l.includes(needle));
if(hits.length!==1)hold();
const r=JSON.parse(hits[0].slice(hits[0].indexOf(needle)).trim());
const keys=['liveOriginals','eligibleOriginals','hardDueOriginals','eligibleNextHour','hardDueNextHour',
 'unboundLiveOriginals','markedExpiredPayloadPresent','unlinkedUnexpiredPopulation','unexpiredPopulationWithoutLiveOriginal'];
const zero=s=>s&&keys.every(k=>s[k]===0)&&s.deletionStopUnresolved===false&&
 s.providerCalls===0&&s.databaseWrites===0&&s.phase6PaidGo===false;
if(r.status!==status||r.reviewedMainSha!==pin||r.distinctDbActorsVerified!==true||
 r.providerCalls!==0||r.objectDeletions!==0||r.phase6PaidGo!==false||
 r.backupOrPitrVerified!==false||r.completeRetentionDeploymentVerified!==false||!zero(r.before))hold();
if(tag==='VERIFY'?r.databaseWrites!==0:(!zero(r.after)||!Array.isArray(r.receipts)||
 r.receipts.length!==0||r.databaseWritesPossible!==false))hold();
console.log(JSON.stringify({status:r.status,runId:Number(id),jobId:jobs[0].id,reviewedMainSha:pin,
 observedAtUtc:(r.after??r.before).observedAtUtc,distinctDbActorsVerified:true,allPrimaryCountersZero:true,
 providerCalls:0,databaseWrites:0,objectDeletions:0,phase6PaidGo:false}));
}catch{hold();}
NODE
}
run_readback "$VERIFY" VERIFY
echo 'The existing expiry policy is unchanged. Enabling only due-primary cleanup may delete eligible primary FIDS content under the existing limits. No SOURCE/POST/Alert permission.'
printf 'Type ENABLE PRIMARY EXPIRY to enable the existing nonpaid schedule: ' >/dev/tty
IFS= read -r answer </dev/tty
[[ "$answer" == 'ENABLE PRIMARY EXPIRY' ]] || hold OWNER_DECLINED
main_pin
[[ "$(var "$ENABLE")" == false && "$(var "$PINS")" == "$PIN" ]] || hold CONFIG_CHANGED
ARM_ATTEMPT=1
gh variable set "$APPROVAL" -R "$REPO" --body "$APPLY"
gh variable set "$ENABLE" -R "$REPO" --body true
[[ "$(var "$ENABLE")" == true && "$(var "$APPROVAL")" == "$APPLY" && "$(var "$PINS")" == "$PIN" ]] || hold APPLY_CONFIG_READBACK
run_readback "$APPLY" APPLY
main_pin
[[ "$(var "$ENABLE")" == true && "$(var "$APPROVAL")" == "$APPLY" && "$(var "$PINS")" == "$PIN" &&
 "$(var P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256)" == "$endpoint" ]] || hold FINAL_CONFIG_READBACK
DONE=1
printf '%s\n' '{"status":"PRIMARY_FIDS_RECURRING_CONFIGURED_MANUAL_ZERO_WORK_APPLY_VERIFIED_NO_GO","scheduledApplyEnabled":true,"futureScheduledExecutionVerified":false,"retentionDeadlineGuaranteed":false,"providerCalls":0,"phase6PaidGo":false}'
