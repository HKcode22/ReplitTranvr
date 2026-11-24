#!/usr/bin/env bash
# Exact same-revision recovery from 45418254527 AFTER two terminal nonpaid ACKs; no secret edits, no policy change.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
S=9c9cddb1aaeb04934d94af2937ee158e6d991f6c
LS=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
WF=phase6-direct-recovery-tick.yml
hold(){ echo "HOLD_P6_ACTIVE_COUNT_INCIDENT_$1" >&2; exit 2; }
v(){ gh variable get "$2" -R "$1"; }
sv(){ gh variable set "$2" -R "$1" --body "$3" >/dev/null && [[ "$(v "$1" "$2")" == "$3" ]]; }
pin(){ [[ "$(gh api user --jq .login)" == HKcode22 && "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$S" && "$(gh api "repos/$L/git/ref/heads/main" --jq .object.sha)" == "$LS" ]]; }
[[ $# == 1 && "$1" == RESUME_EXISTING_SCOPE_AFTER_45418254527_TWO_TERMINAL_NONPAID_ACKS ]] || hold CONFIRM
pin || hold MAIN
[[ "$(date -u +%s)" -lt "$(date -u -d 2026-11-24T15:45:00Z +%s)" ]] || hold DAY2_PREPARATION_OPEN_REQUIRES_NEW_CENSUS
E="$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)"
[[ "$E" =~ ^2026-11-24T11:45:19\.000Z$ &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$E" &&
 "$(v "$L" TRAVNR_APPROVED_TARGET_MAIN_SHA)" == "$S" &&
 "$(v "$L" TRAVNR_RELAY_PRIMARY_ENABLED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_FULL_RETENTION_APPROVED)" == 1 &&
 "$(v "$L" TRAVNR_RELAY_MODE)" == MULTI_LANE &&
 "$(v "$L" TRAVNR_RELAY_ROLLING_ROUTE)" == DIRECT_TICK &&
 "$(v "$L" TRAVNR_RELAY_DIRECT_TICK_APPROVED)" == 1 &&
 "$(v "$R" P6_ROLLING_CONTROLLER_ENABLED)" == 1 &&
 "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_ENABLED)" == 1 &&
 "$(v "$R" P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED)" == true &&
 "$(v "$R" P6_PRIVATE_POST_PARENT_ENABLED)" == true &&
 "$(v "$R" P6_NATIVE_POST_PRODUCER_ENABLED)" == 1 &&
 "$(v "$R" P6_NONPAID_SOURCE_SCHEDULE_ENABLED)" == true ]] || hold EXISTING_CONFIG_DRIFT
TMP="$(mktemp -d "$PWD/.p6-archive-recovery-XXXXXXXX")"
trap 'rm -rf -- "$TMP"' EXIT
sv "$L" TRAVNR_RELAY_ROLLING_ENABLED 0 || hold RELAY_PAUSE
echo P6_ROLLING_PAUSED_RETENTION_UNCHANGED
# Complete current history, exact failed run and all successful worker receipts.
node - "$R" "$L" "$S" "$LS" "$E" "$TMP" <<'P6_HISTORY'
const {execFileSync}=require("node:child_process");
const {createHash}=require("node:crypto");
const {writeFileSync}=require("node:fs");
const {join}=require("node:path");
const [r,l,s,ls,e,tmp]=process.argv.slice(2),epoch=e.replace(".000Z","Z");
const oldSuccess=[45387080623,45389109210,45390687191,45392268658,45393858045,45395481423,45397105279,45398707565,45400394358,45402100374,45403809356,45405571285,45407281834,45409000831,45410802469,45412638423,45414515951,45416379180];
const failed=45418254527,direct=".github/workflows/phase6-direct-recovery-tick.yml";
const routePaths={
 DAILY_PREPARE:"phase6-nonpaid-source-day-prepare-publish",
 PRE_RECOVERY:"phase5-cd-github-existing-queue-lease-watchdog",
 EARLY_DRAW:"phase5-six-slot-approved-early-four-airport-draw",
 RETENTION_MONITOR:"phase5-private-blob-retention-readonly-sentinel-no-provider"
};
const path=n=>".github/workflows/"+n+".yml";
const halt=(reason,detail={})=>{console.error(JSON.stringify({status:"HOLD_P6_ACTIVE_COUNT_HISTORY_"+reason,...detail}));process.exit(2);};
const api=(...args)=>execFileSync("gh",["api",...args],{timeout:30000,maxBuffer:16*1024*1024,stdio:["ignore","pipe","pipe"]});
const json=(...args)=>JSON.parse(api(...args));
const runs=repo=>{
 for(let i=0;i<3;i++){
  const x=json("-X","GET","repos/"+repo+"/actions/runs","-f","branch=main","-f","created=>="+epoch,"-F","per_page=100");
  if(x.total_count===x.workflow_runs?.length&&new Set(x.workflow_runs.map(z=>z.id)).size===x.total_count)return x.workflow_runs;
 }
 halt("INCOMPLETE",{repo});
};
const jobs=(repo,id)=>{const q=json("repos/"+repo+"/actions/runs/"+id+"/jobs?per_page=100");if(q.total_count!==q.jobs?.length)halt("JOBS_INCOMPLETE",{id});return q.jobs;};
const log=(repo,id)=>execFileSync("gh",["run","view",String(id),"-R",repo,"--log"],{encoding:"utf8",timeout:30000,maxBuffer:16*1024*1024,stdio:["ignore","pipe","pipe"]});
try{
 const rows=runs(r),by=new Map(rows.map(z=>[z.id,z]));
 const dr=rows.filter(z=>z.path===direct);
 if(dr.length!==oldSuccess.length+1||!oldSuccess.every(id=>dr.some(z=>z.id===id))||!dr.some(z=>z.id===failed))halt("DIRECT_SET",{ids:dr.map(z=>z.id)});
 const expectedWorkers=new Map();
 for(const id of oldSuccess){
  const x=by.get(id),js=jobs(r,id),p=js.filter(j=>j.name==="direct-protected-recovery-tick"&&j.conclusion==="success"&&j.steps?.some(t=>t.name==="Direct outcome TERMINAL_PARENT_ACKS_RECONCILED"&&t.conclusion==="success")&&j.steps?.some(t=>t.name==="Preserve direct terminal operational receipt"&&t.conclusion==="success"));
  if(x.head_sha!==s||x.run_attempt!==1||x.status!=="completed"||x.conclusion!=="success"||p.length!==1)halt("PRIOR_TERMINAL",{id});
  const a=json("repos/"+r+"/actions/runs/"+id+"/artifacts");
  if(a.total_count!==1||a.artifacts?.length!==1)halt("ARTIFACT_COUNT",{id});
  const z=a.artifacts[0];
  if(z.name!=="p6-direct-terminal-"+id||z.expired!==false||z.size_in_bytes<1||z.size_in_bytes>65536||!/^sha256:[0-9a-f]{64}$/.test(z.digest))halt("ARTIFACT_META",{id});
  let bytes;
  for(let k=0;k<3;k++){try{bytes=api("--method","GET","repos/"+r+"/actions/artifacts/"+z.id+"/zip");break;}catch{if(k===2)halt("ARCHIVE_UNAVAILABLE",{id});}}
  if(bytes.length!==z.size_in_bytes||"sha256:"+createHash("sha256").update(bytes).digest("hex")!==z.digest)halt("ARTIFACT_BYTES",{id});
  const file=join(tmp,"receipt-"+id+".zip");writeFileSync(file,bytes,{mode:0o600});
  const names=execFileSync("unzip",["-Z1",file],{encoding:"utf8",timeout:5000}).trim();
  if(names!=="p6-direct-terminal.json")halt("ARCHIVE_ENTRY",{id});
  const q=JSON.parse(execFileSync("unzip",["-p",file,"p6-direct-terminal.json"],{encoding:"utf8",timeout:5000,maxBuffer:65536}));
  if(q.schema!=="v39.phase6.direct-recovery-tick.v2"||q.runId!==id||q.reviewedMainSha!==s||q.activationUtc!==e||q.status!=="DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF"||q.unknownAttempts!==0||q.providerCalls!==0||q.databaseWrites!==0||q.databaseReads!==0||q.phase6PaidGo!==false||q.pending?.length!==0||q.pendingAcknowledgements?.length!==0||!Array.isArray(q.terminalAcknowledgements)||q.acknowledged!==q.terminalAcknowledgements.length||q.verifiedTerminal!==q.acknowledged)halt("RECEIPT_SCOPE",{id});
  for(const ack of q.terminalAcknowledgements){
   if(!routePaths[ack.lane]||expectedWorkers.has(ack.runId))halt("UNEXPECTED_ACK",{id,lane:ack.lane,worker:ack.runId});
   expectedWorkers.set(ack.runId,routePaths[ack.lane]);
  }
  console.log(JSON.stringify({status:"P6_PRIOR_ARCHIVE_BYTES_AND_TERMINAL_ACKS_VERIFIED",run:id,workers:q.acknowledged,pending:0}));
 }
 const f=by.get(failed),fj=jobs(r,failed),fl=log(r,failed);
 if(f.head_sha!==s||f.run_attempt!==1||f.status!=="completed"||f.conclusion!=="failure"||!fj.some(j=>j.id===138530339042&&j.conclusion==="failure")||!fl.includes("HOLD_P6_ROLLING_CONTROLLER_GITHUB_HISTORY_UNAVAILABLE_OR_INCOMPLETE_ACTIVE_SWEEP_COUNT_NO_REPLAY"))halt("FAILED_TICK_IDENTITY");
 const evidence=fl.split("\n").filter(z=>z.includes('"status":"DISPATCH_ATTEMPT_BEFORE_ACK"')||z.includes('"status":"EXACT_ACK_NOT_EXECUTION_PROOF"')||z.includes('"status":"EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF"'));
 for(const lane of ["DAILY_PREPARE","PRE_RECOVERY"]){
  for(const status of ["DISPATCH_ATTEMPT_BEFORE_ACK","EXACT_ACK_NOT_EXECUTION_PROOF","EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF"]){
   if(evidence.filter(z=>z.includes('"lane":"'+lane+'"')&&z.includes('"status":"'+status+'"')).length!==1)halt("EXACT_NONPAID_ACK_LOG",{lane,status});
  }
 }
 if(evidence.length!==6)halt("UNEXPECTED_DISPATCH_EVIDENCE");
 const exactAdditional=[
 [45418343712,"phase6-nonpaid-source-day-prepare-publish","workflow_dispatch",138530677797,"protected-main-one-day-nonpaid","NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE"],
 [45418357308,"phase5-cd-github-existing-queue-lease-watchdog","workflow_dispatch",138530714330,"reviewed-existing-queue-watchdog","EMPTY_OR_SAFE_RECOVERY"],
 [45408782850,"phase5-private-blob-retention-readonly-sentinel-no-provider","schedule",138496602491,"private-main-restricted-metadata-sentinel","NO_OVERDUE_REFERENCES"],
 [45419242819,"phase5-six-slot-approved-early-four-airport-draw","schedule",138533879617,"gated-exact-early-parent","NO_DUE_FUTURE_DRAW_AT_DB_CLOCK"],
 [45419265364,"phase5-autonomous-clock-canary-no-provider","schedule",138533964013,"six-slot-cron-observation-only","HOLD_GITHUB_SCHEDULE_MISSING_FAILED_LATE_OR_INCOMPLETE"]
 ];
 for(const [id,n,event,jid,name,receipt] of exactAdditional){
  const x=by.get(id),js=jobs(r,id);
  if(!x||x.path!==path(n)||x.event!==event||x.head_sha!==s||x.run_attempt!==1||x.status!=="completed"||x.conclusion!=="success"||!js.some(j=>j.id===jid&&j.name===name&&j.conclusion==="success")||!log(r,id).includes(receipt))halt("ADDITIONAL_WORKER_RECEIPT",{id});
  expectedWorkers.set(id,n);
 }
 for(const [id,n] of expectedWorkers){
  const x=by.get(id);
  if(!x||x.path!==path(n)||x.head_sha!==s||x.run_attempt!==1||x.status!=="completed"||x.conclusion!=="success")halt("WORKER_TERMINAL",{id});
 }
 for(const x of rows){
  if(x.path===direct||expectedWorkers.has(x.id))continue;
  if(x.path===path("phase5-primary-fids-expiry-no-provider"))continue;
  if(x.event==="schedule"&&x.head_sha===s&&x.run_attempt===1&&x.status==="completed"&&x.conclusion==="skipped"){const j=jobs(r,x.id);if(j.length&&j.every(y=>y.conclusion==="skipped"))continue;}
  halt("NEW_UNRECONCILED_TARGET_RUN",{id:x.id,path:x.path,status:x.status,conclusion:x.conclusion});
 }
 // Refresh after potentially lengthy artifact reconciliation.
 const rr=runs(l);
 for(const x of rr.filter(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT")){
  if(x.head_sha!==ls||x.run_attempt!==1||x.status!=="completed"||!["success","skipped"].includes(x.conclusion))halt("UNRECONCILED_RELAY",{id:x.id,status:x.status,conclusion:x.conclusion});
 }
 // New native schedules must not be silently dropped while verifying archives.
 for(const x of runs(r))if(!by.has(x.id)&&x.path!==path("phase5-primary-fids-expiry-no-provider"))halt("NEW_RUN_DURING_AUDIT",{id:x.id,path:x.path});
 for(const status of ["queued","in_progress","waiting","pending","requested"]){
  const q=json("repos/"+r+"/actions/runs?branch=main&status="+status+"&per_page=100");
  if(q.total_count!==q.workflow_runs?.length||q.workflow_runs.some(x=>x.path!==path("phase5-primary-fids-expiry-no-provider")))halt("ACTIVE_TARGET",{status,ids:q.workflow_runs?.map(x=>x.id)});
 }
 console.log(JSON.stringify({status:"P6_EXACT_ACTIVE_SWEEP_COUNT_FAILURE_TWO_NONPAID_ACKS_RECONCILED",failed,verifiedPredecessors:oldSuccess.length,verifiedWorkers:expectedWorkers.size,providerCalls:0}));
}catch(e){halt("READBACK",{code:e.code||e.name});}
P6_HISTORY
# Use fresh free account proof, never a billable flight GET.
B=bf6dff6e0f654836069b4cc289e5c7e750b28213
gh api "repos/$R/git/blobs/$B" --jq .content | base64 --decode > "$TMP/free.mjs"
[[ "$(git hash-object "$TMP/free.mjs")" == "$B" ]] || hold FREE_SOURCE
env -u DATABASE_URL -u V39_DATABASE_RUNTIME_URL ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 node "$TMP/free.mjs" > "$TMP/free.json"
jq -e '.status=="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER" and .apiUnitsLimit==60000 and .apiUnitsRemaining>=36740 and .alertCreditsRemaining>=1000 and .requestsRemaining>0 and .providerPaidGets==0 and .providerMutations==0 and .balancesStable==true' "$TMP/free.json" >/dev/null || hold FREE_QUOTA
cat "$TMP/free.json"
# Fresh metadata-only owner DB census; no contents or credentials emitted.
node <<'P6_CENSUS'
const {Client}=require("pg");
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='15s'");
const m="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e";
const x=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,clock_timestamp() at,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) d2,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=1 AND daily_api_ceiling=256) b1,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2 AND daily_api_ceiling=384) b2,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=1) q1,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=1) c1,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1 AND retention_not_after_utc>statement_timestamp()) i1,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_packets,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_indexes",[m,"cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9"])).rows[0];
await c.query("ROLLBACK");console.log(JSON.stringify({status:"P6_PAID_RESUME_READONLY_DB_CENSUS",...x,providerCalls:0}));
if(!x.db||!x.owner||!x.primary||!x.ro||x.auth!==1||x.cost!==1||x.source!==0||x.rest!==0||x.stops!==0||x.d1!==4||x.d2!==4||x.b1!==1||x.b2!==1||x.q1!==128||x.c1!==1||x.i1!==1||x.due_packets!==0||x.due_indexes!==0||Date.parse(x.at)>=Date.parse("2026-11-24T15:45:00Z"))throw Error("DB_SCOPE");
}finally{await c.end().catch(()=>{});}})().catch(e=>{console.error("HOLD_P6_SUCCESSOR_RESUME_DB_"+(e.code||e.name));process.exitCode=2;});
P6_CENSUS
pin || hold MAIN_MOVED
[[ "$(date -u +%s)" -lt "$(date -u -d 2026-11-24T15:45:00Z +%s)" ]] || hold DAY2_PREPARATION_OPEN_REQUIRES_NEW_CENSUS
[[ "$(v "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC)" == "$E" && "$(v "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC)" == "$E" && "$(v "$L" TRAVNR_RELAY_ROLLING_ENABLED)" == 0 ]] || hold EPOCH_OR_PAUSE_DRIFT
# Preserve the exact reviewed history in the issue before forward activation.
N="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
MARK="$HOME/.travnr-p6-45418254527-archive-recovery-once.started"
( set -C; printf '%s %s\n' "$S" "$N" > "$MARK" ) || hold ATTEMPT_MARKER_NO_REPLAY
gh issue comment 413 -R "$R" --body "Owner exact same-main recovery after 45418254527 active-sweep count failure AFTER two nonpaid dispatch ACKs. All 18 prior direct archives and exact acknowledged worker outcomes plus three native schedule outcomes independently verified terminal; zero new paid attempts/REST/stops and original D1/D2 preparation preserved. Old epoch $E retained in ledger; forward epoch $N, unchanged main $S, unchanged signed policy/budget/rights, no re-arm, no replay, no redraw." >/dev/null || hold OWNER_LEDGER
sv "$R" P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC "$N" || hold TARGET_EPOCH
sv "$L" TRAVNR_RELAY_ROLLING_SINCE_UTC "$N" || hold RELAY_EPOCH
# Exactly one authorized test wave with external rolling still paused.
gh workflow run "$WF" -R "$R" --ref main -f confirm=RUN_ONE_REVIEWED_DIRECT_RECOVERY_TICK_AFTER_SEPARATE_PHASE6_GO -f approved_main_sha="$S" || hold DIRECT_DISPATCH_UNKNOWN
id=""
for i in $(seq 1 30); do
 ids="$(gh run list -R "$R" --workflow "$WF" --branch main --event workflow_dispatch --limit 20 --json databaseId,headSha,createdAt --jq ".[]|select(.headSha==\"$S\" and .createdAt>=\"${N%.*}Z\")|.databaseId")"
 if [[ -n "$ids" ]]; then [[ "$(wc -l <<< "$ids" | tr -d ' ')" == 1 ]] || hold MULTIPLE_DIRECT_RUNS; id="$ids"; break; fi
 sleep 3
done
[[ "$id" =~ ^[0-9]+$ ]] || hold DIRECT_ACK_UNKNOWN
echo "P6_CURRENT_MAIN_DIRECT_RUN=$id"
timeout 660 gh run watch "$id" -R "$R" --exit-status || hold DIRECT_FAILED_NO_REPLAY
j="$(gh api "repos/$R/actions/runs/$id/jobs?per_page=100")"
mark="$(jq -er '([.jobs[]|select(.name=="direct-protected-recovery-tick" and .conclusion=="success")]|if length==1 then .[0].steps else error("DIRECT_JOB") end)|[.[]|select(.conclusion=="success" and (.name|IN("Direct outcome TERMINAL_PARENT_ACKS_RECONCILED","Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED","Direct outcome PREFLIGHT_HOLD_NO_POST")))]|if length==1 then .[0].name else error("DIRECT_DISPOSITION") end' <<< "$j")" || hold DIRECT_DISPOSITION
gh api "repos/$R/actions/runs/$id/artifacts" | jq -e --arg n "p6-direct-terminal-$id" '.total_count==1 and .artifacts[0].name==$n and .artifacts[0].expired==false and (.artifacts[0].digest|test("^sha256:[a-f0-9]{64}$"))' >/dev/null || hold DIRECT_RECEIPT
echo "P6_DIRECT_DISPOSITION=$mark"
[[ "$mark" == "Direct outcome TERMINAL_PARENT_ACKS_RECONCILED" ]] || hold DIRECT_NOT_TERMINAL
pin || hold MAIN_MOVED
sv "$L" TRAVNR_RELAY_ROLLING_ENABLED 1 || hold RELAY_ENABLE
echo P6_ACTIVE_SWEEP_COUNT_INCIDENT_SAME_MAIN_ROLLING_RESTORED
echo P6_EXTERNAL_NEXT_WAKE_AND_PAID_RECEIPTS_STILL_REQUIRED
