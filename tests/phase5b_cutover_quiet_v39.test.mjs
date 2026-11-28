import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const text=readFileSync(new URL("../scripts/v39_phase5b_coordinated_recovery_cutover_owner.sh",import.meta.url),"utf8");
const functions=text.split("# BEGIN TESTED QUIET FUNCTIONS\n")[1].split("# END TESTED QUIET FUNCTIONS")[0];
function run(body){
 const script="set -Eeuo pipefail\nshopt -s inherit_errexit\nR=target\nL=relay\nhold(){ echo HOLD_\"$1\" >&2; exit 2; }\n"+functions+"\n"+body;
 return spawnSync("bash",["-c",script],{encoding:"utf8",timeout:5000});
}
test("T040 active target or relay waits rather than cancelling or merging",()=>{
 const x=run(`scans=0
 scan_quiet(){ scans=$((scans+1)); if [[ "$scans" == 1 ]];then return 4;fi; return 0; }
 sleep(){ :; }
 wait_quiet relay 3 0
 test "$scans" == 2
 echo PASSED`);
 assert.equal(x.status,0,x.stderr);assert.match(x.stdout,/PASSED/);
 const y=run(`active(){ if [[ "$1" == relay ]];then echo 1;else echo 0;fi; }
 sleep(){ :; }
 wait_quiet relay 2 0
 echo NEVER`);
 assert.equal(y.status,2);assert.match(y.stderr,/QUIET_WINDOW_NOT_OBSERVED_NO_CANCEL/);assert.doesNotMatch(y.stdout,/NEVER/);
});
test("T040 failed or malformed active read never becomes a quiet interval",()=>{
 for(const body of [
  'gh(){ return 1; }',
  'gh(){ echo "{\\"total_count\\":null}"; }',
  'gh(){ echo "{\\"total_count\\":-1}"; }',
  'gh(){ echo "{\\"total_count\\":1.5}"; }'
 ]){
  const x=run(body+'\nsleep(){ echo NEVER_RETRY; }\nwait_quiet relay 3 0\necho NEVER');
  assert.equal(x.status,2,x.stderr);assert.match(x.stderr,/ACTIVE_STATUS_UNVERIFIED/);assert.doesNotMatch(x.stdout,/NEVER/);
 }
});
test("T040 real quiet scanner checks both repos and all active states",()=>{
 const x=run(`gh(){ printf '{"total_count":0}\\n'; }
 wait_quiet relay 1 0
 echo PASSED`);
 assert.equal(x.status,0,x.stderr);assert.match(x.stdout,/PASSED/);
 const y=run(`gh(){ if [[ "$2" == *external-clock.yml*status=waiting* ]];then printf '{"total_count":1}\\n';else printf '{"total_count":0}\\n';fi; }
 wait_quiet relay 1 0
 echo NEVER`);
 assert.equal(y.status,2,y.stderr);assert.match(y.stderr,/relay_workflow=external-clock.yml active=1/);
});


// The same owner readback must accept the already-authorized SOURCE-only
// configuration and refuse unknown effective overrides, without mutations.
const readbackPath=new URL("../scripts/v39_phase5b_post_cutover_pin_readonly.sh",import.meta.url);
function runReadback({mode="SOURCE_ONLY",source="true",targetEnv={},relayEnv={},failEnv=false}={}){
 const m="a".repeat(40),r="b".repeat(40);
 const target={P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:m,P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:m,P7_EXPIRY_APPROVED_MAIN_SHA:m,
  P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:source,P6_PRIVATE_POST_PARENT_ENABLED:"false",P6_FULL_RETENTION_BACKSTOP_ENABLED:"true",
  P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P7_EXPIRY_ENABLED:"true",
  P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",P6_PRIVATE_EPOCH_EXPIRY_MODE:"APPLY_DUE_ONLY",
  P6_PRIVATE_EPOCH_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER",P7_EXPIRY_APPROVAL:"APPLY_P7_DUE_ONLY_NO_PROVIDER",
  P6_ROLLING_CONTROLLER_ENABLED:"1",P6_ROLLING_DIRECT_RECOVERY_ENABLED:"0"};
 const relay={TRAVNR_APPROVED_TARGET_MAIN_SHA:m,P6_RELAY_APPROVED_EXECUTABLE_SHA:r,TRAVNR_RELAY_ROLLING_ENABLED:"1",TRAVNR_RELAY_PRIMARY_ENABLED:"1",TRAVNR_RELAY_ROLLING_ROUTE:"INDEPENDENT_WAKE"};
 const vars=x=>JSON.stringify(Object.entries(x).map(([name,value])=>({name,value})));
 const mock=`gh(){
  case "$1:$2" in
   api:user) echo HKcode22;;
   api:--paginate) case "$3" in
    *ReplitTranvr/environments/*) [[ "$MOCK_FAIL_ENV" == 0 ]] || return 5; jq -c '.[]' <<<"$MOCK_TARGET_ENV";;
    *TravnrClockRelay/environments/*) jq -c '.[]' <<<"$MOCK_RELAY_ENV";;
    *ReplitTranvr/actions/variables*) jq -c '.[]' <<<"$MOCK_TARGET";;
    *TravnrClockRelay/actions/variables*) jq -c '.[]' <<<"$MOCK_RELAY";;
    *) return 9;; esac;;
   api:repos/HKcode22/ReplitTranvr/git/ref/heads/main) echo "$MOCK_MAIN";;
   api:repos/HKcode22/TravnrClockRelay/git/ref/heads/main) echo "$MOCK_RELAY_MAIN";;
   run:list) echo '[]';;
   *) echo UNEXPECTED_GH >&2; return 9;; esac
 }
 export -f gh
 bash "$MOCK_SCRIPT" "$MOCK_MAIN" "$MOCK_RELAY_MAIN" "$MOCK_MODE"`;
 return spawnSync("bash",["-c",mock],{encoding:"utf8",timeout:20000,env:{...process.env,MOCK_MAIN:m,MOCK_RELAY_MAIN:r,MOCK_SCRIPT:decodeURIComponent(readbackPath.pathname),MOCK_MODE:mode,MOCK_TARGET:vars(target),MOCK_RELAY:vars(relay),MOCK_TARGET_ENV:vars(targetEnv),MOCK_RELAY_ENV:vars(relayEnv),MOCK_FAIL_ENV:failEnv?"1":"0"}});
}
test("T076 SOURCE_ONLY owner readback preserves existing enablement and retention; PAUSED remains supported",()=>{
 for(const cfg of [{},{mode:"PAUSED",source:"false"}]){
  const x=runReadback(cfg);assert.equal(x.status,0,x.stderr+x.stdout);
  assert.match(x.stdout,/PASS_(SOURCE_ONLY|PAUSED)_NO_WRITES/);
 }
});
test("T076 fails closed on protected route, retention approval, conditional activation or unknown metadata",()=>{
 for(const [cfg,marker] of [
  [{targetEnv:{P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"false"}},/MISMATCH protected-runtime\/P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED/],
  [{targetEnv:{P7_EXPIRY_APPROVAL:"DO_NOT_PRINT_UNEXPECTED_VALUE"}},/MISMATCH protected-runtime\/P7_EXPIRY_APPROVAL/],
  [{targetEnv:{P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:"1"}},/HOLD_CONDITIONAL_METADATA_REQUIRES_SEPARATE_REVIEW/],
  [{relayEnv:{TRAVNR_APPROVED_TARGET_MAIN_SHA:"c".repeat(40)}},/MISMATCH travnr-target-forward\/TRAVNR_APPROVED_TARGET_MAIN_SHA/]]){
  const x=runReadback(cfg);assert.equal(x.status,2,x.stderr+x.stdout);
  assert.match(x.stdout,marker);
  assert.match(x.stdout,/HOLD_POST_CUTOVER_VARIABLE_MISMATCH/);
  assert.doesNotMatch(x.stdout+x.stderr,/PASS_SOURCE_ONLY_NO_WRITES|DO_NOT_PRINT_UNEXPECTED_VALUE|parse error|UNEXPECTED_GH/);
 }
 const unavailable=runReadback({failEnv:true});
 assert.equal(unavailable.status,5,unavailable.stderr+unavailable.stdout);
 assert.doesNotMatch(unavailable.stdout+unavailable.stderr,/PASS_SOURCE_ONLY_NO_WRITES|parse error|UNEXPECTED_GH/);
});

const sourceCutover=readFileSync(new URL("../scripts/v39_phase5b_source_only_successor_owner.sh",import.meta.url),"utf8");
const sourceGuards=sourceCutover.split("# BEGIN SOURCE ONLY TESTED GUARDS\n")[1].split("# END SOURCE ONLY TESTED GUARDS")[0];
function runSourceGuards(body){
 return spawnSync("bash",["-c","set -Eeuo pipefail\nR=target\nL=relay\nhold(){ echo HOLD_\"$1\";exit 2; }\n"+sourceGuards+"\n"+body],{encoding:"utf8",timeout:10000});
}
test("T078 exact SOURCE-only cutover gap rejects open, short, missing and malformed evidence",()=>{
 const base={status:"SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY",calendarDays:31,providerCalls:0,databaseWrites:0,observedAtUtc:"2026-11-26T23:04:07.489Z",
 cells:[{status:"PREPARED_DENOMINATOR_OBSERVED",open_unreserved:0,future_unreserved:64,next_planned_utc:"2026-11-27T01:45:00.000Z"}]};
 const call=x=>runSourceGuards("gap_ok '"+JSON.stringify(x)+"' && echo GAP_PASS");
 assert.equal(call(base).status,0,call(base).stderr);
 for(const cells of [[{...base.cells[0],open_unreserved:1}],[{...base.cells[0],next_planned_utc:"2026-11-27T00:45:00.000Z"}],[{...base.cells[0],next_planned_utc:null}],[]]){
  const x=call({...base,cells});assert.notEqual(x.status,0);assert.doesNotMatch(x.stdout,/GAP_PASS/);
 }
});
test("T078 all-main quiet guard distinguishes active and metadata failures",()=>{
 for(const [fixture,expected] of [['{"total_count":0}',0],['{"total_count":1}',4],['{"total_count":null}',3],['bad json',3]]){
  const x=runSourceGuards("gh(){ echo '"+fixture+"'; }\nall_main_quiet");assert.equal(x.status,expected,x.stderr);
 }
});

test("T078 independent relay stage skips unrelated target push CI but still drains operational and retention lanes",()=>{
 const x=runSourceGuards(`gh(){ if [[ "$2" == target/actions/runs* || "$2" == repos/target/actions/runs* ]];then echo '{"total_count":1}';else echo '{"total_count":0}';fi; }
 relay_stage_quiet
 echo PASS`);assert.equal(x.status,0,x.stderr);assert.match(x.stdout,/PASS/);
 const y=runSourceGuards(`gh(){ if [[ "$2" == *phase5-primary-fids-expiry-no-provider.yml* ]];then echo '{"total_count":1}';else echo '{"total_count":0}';fi; }
 relay_stage_quiet`);assert.equal(y.status,4,y.stderr);
});

test("T084 target-only successor requires all exact mandatory CI paths and preserves shared quiet and gap guards",()=>{
 const h="a".repeat(40);
 const paths=["v39-phase0-offline.yml","phase5b-source-diagnostics-offline.yml","phase5b-phase7-role-successor.yml","phase5b-runtime-successor-compatibility.yml","phase5-one-signed-future-post-v0083-main-manual.yml","phase6-source-existing-p5-child-admission-offline-no-provider.yml","phase5-source-upcoming-queue-main-scheduled-readonly.yml","phase5-public-frozen-private-flight-packet-leak-guard.yml","phase5-actual-source-native-flight-candidates-readonly-manual.yml","phase2g-yssy-p25-published-identity-readonly.yml","phase2g-yssy-p25-release-no-provider-ci.yml","phase2g-yssy-p25-release-postgres-ci.yml"];
 const rows=paths.map(path=>({path:".github/workflows/"+path,head_sha:h,status:"completed",conclusion:"success",run_attempt:1}));
 const check=rs=>runSourceGuards("target_only_ci_ok '"+JSON.stringify({total_count:rs.length,workflow_runs:rs})+"' "+h+" && echo PASS");
 assert.equal(check(rows).status,0);
 for(const rs of [rows.slice(1),[{...rows[0],conclusion:"failure"},...rows.slice(1)],[{...rows[0],head_sha:"b".repeat(40)},...rows.slice(1)],[{...rows[0],run_attempt:2},...rows.slice(1)],[{...rows[0],path:rows[1].path},...rows.slice(1)]]){
  const x=check(rs);assert.notEqual(x.status,0);assert.doesNotMatch(x.stdout,/PASS/);
 }
 assert.match(sourceCutover,/DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_979/);
 const tail=sourceCutover.slice(sourceCutover.indexOf('stage=TARGET_MERGE'));
 assert.match(tail,/merge_exact "\$R" "\$TARGET_PR"/);
 assert.match(tail,/if \[\[ "\$TARGET_ONLY" == 1 \]\];then[\s\S]*?FINAL_TARGET_ONLY_READBACK[\s\S]*?relay_unchanged=\$ROLD[\s\S]*?exit 0[\s\S]*?stage=RELAY_MERGE/);
 assert.ok(tail.indexOf("NEW_TARGET_RETENTION")<tail.indexOf("FINAL_TARGET_ONLY_READBACK"));
});


test("T090 cutover permits only internally reconciled terminal PRE history; blocks unknown writes and STOP",()=>{
 const at="2026-11-27T15:40:00.000Z";
 const stop={status:"P6_SOURCE_RESERVATION_AND_STOP_READONLY",at,unresolvedStops:0,providerCalls:0,productionWrites:0};
 const packet={status:"P6_PRIVATE_PACKET_AND_PRE_TASK_CUSTODY_READONLY",at,tasks:[],providerCalls:0,productionWrites:0};
 const verified={horizon:"T-6h",state:"VERIFIED_ON_TIME",tasks:2,tasks_with_snapshot_ref:2,linked_cutoff_safe_verified:2};
 const missed={horizon:"T-24h",state:"MISSED",tasks:1,tasks_with_snapshot_ref:0,linked_cutoff_safe_verified:0};
 const call=(rows)=>runSourceGuards("cutover_pre_tasks_ok '"+rows.map(x=>JSON.stringify(x)).join("\n")+"' && echo PASS");
 for(const tasks of [[],[verified,missed]]){
  const x=call([stop,{...packet,tasks}]);assert.equal(x.status,0,x.stderr+x.stdout);assert.match(x.stdout,/PASS/);
 }
 for(const rows of [
  [{...stop,unresolvedStops:1},packet],[stop,{...packet,at:"2026-11-27T15:39:00.000Z"}],[stop,{...packet,productionWrites:1}],
  [stop,{...packet,tasks:[{...verified,linked_cutoff_safe_verified:1}]}],[stop,{...packet,tasks:[{...verified,tasks_with_snapshot_ref:1}]}],
  [stop,{...packet,tasks:[{...missed,tasks_with_snapshot_ref:1}]}],[stop,{...packet,tasks:[verified,verified]}],
  [stop,{...packet,tasks:[{...missed,tasks:0}]}],[stop,{...packet,tasks:[{...missed,horizon:"OTHER"}]}],
  ...["READY","CLAIMED","WRITE_STARTED_UNKNOWN","QUARANTINED","UNRECOGNIZED"].map(state=>[stop,{...packet,tasks:[{...missed,state}]}]),
  [stop,{...packet,tasks:null}],[stop,stop,packet],[packet]
 ]){
  const x=call(rows);assert.notEqual(x.status,0,x.stdout);assert.doesNotMatch(x.stdout,/PASS/);
 }
 const afterWait=sourceCutover.slice(sourceCutover.indexOf("stage=QUIET_AND_GAP"),sourceCutover.indexOf("stage=TARGET_MERGE"));
 assert.match(afterWait,/wait_all_quiet[\s\S]*?node "\$TMP\/funnel.cjs"[\s\S]*?cutover_pre_tasks_ok[\s\S]*?node "\$TMP\/census.mjs"[\s\S]*?TASK_CENSUS_CLOCK[\s\S]*?all_main_quiet/);
});

test("T106 target980 requires every added exact workflow and checks all pin scopes before mutation",()=>{
 const h="a".repeat(40);
 const base=["v39-phase0-offline.yml","phase5b-source-diagnostics-offline.yml","phase5b-phase7-role-successor.yml","phase5b-runtime-successor-compatibility.yml","phase5-one-signed-future-post-v0083-main-manual.yml","phase6-source-existing-p5-child-admission-offline-no-provider.yml","phase5-source-upcoming-queue-main-scheduled-readonly.yml","phase5-public-frozen-private-flight-packet-leak-guard.yml","phase5-actual-source-native-flight-candidates-readonly-manual.yml","phase2g-yssy-p25-published-identity-readonly.yml","phase2g-yssy-p25-release-no-provider-ci.yml","phase2g-yssy-p25-release-postgres-ci.yml"];
 const extra=["phase6-private-later-enrollment.yml","phase6-nonpaid-source-day-prepare-publish.yml","phase5-github-fids-source-release-guard-offline.yml","phase5-cd-github-one-queued-t24-witness-main-manual.yml","phase5-source-login-and-manual-owner-disposable-pg16.yml","phase5-v0080-github-runtime-prearm-real-pg16.yml","phase5-amendment-c-segmented-day-stage6-stage8-offline.yml","phase3-gate4-owned-handoff-ci.yml","phase5-v0082-atomic-segmented-day-pg16-no-provider.yml","phase5-stage9-v0079-db-prepare-offline.yml","phase5-stage8-v0079-daily-prepare-proposals-offline.yml"];
 const rows=[...base,...extra].map(path=>({path:".github/workflows/"+path,head_sha:h,status:"completed",conclusion:"success",run_attempt:1}));
 const call=rs=>runSourceGuards("target_980_ci_ok '"+JSON.stringify({total_count:rs.length,workflow_runs:rs})+"' "+h+" && echo PASS");
 assert.equal(call(rows).status,0);
 for(let i=0;i<rows.length;i++)assert.notEqual(call(rows.filter((_,j)=>i!==j)).status,0);
 const pinCase=body=>runSourceGuards("v(){ echo old; }; vars(){ echo ok; }; value(){ echo __ABSENT__; }; "+body);
 assert.equal(pinCase("pin_candidates_ok repo key old new env").status,0);
 assert.equal(pinCase("value(){ echo new; }; pin_candidates_ok repo key old new env").status,0);
 assert.notEqual(pinCase("value(){ echo other; }; pin_candidates_ok repo key old new env").status,0);
 assert.notEqual(pinCase("vars(){ return 5; }; pin_candidates_ok repo key old new env").status,0);
 assert.match(sourceCutover,/RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_980/);
 assert.match(sourceCutover,/stage=QUIET_AND_GAP[\s\S]*?target_980_pins_ok "\$OLD" "\$OLD" \|\| hold PIN_SCOPE_DRIFT;fi[\s\S]*?wait_all_quiet[\s\S]*?node "\$TMP\/funnel.cjs"/);
 assert.match(sourceCutover,/RECOVERY_REQUIRES_EXACT_MERGED_TREE/);
});

test("T108 required target980 offline workflows trigger on the exact owner release helper",()=>{
 const required=["phase5-one-signed-future-post-v0083-main-manual.yml","phase6-source-existing-p5-child-admission-offline-no-provider.yml","phase5-source-upcoming-queue-main-scheduled-readonly.yml","phase5-actual-source-native-flight-candidates-readonly-manual.yml","phase6-private-later-enrollment.yml","phase5-github-fids-source-release-guard-offline.yml","phase5-cd-github-one-queued-t24-witness-main-manual.yml","phase5-source-login-and-manual-owner-disposable-pg16.yml","phase5-v0080-github-runtime-prearm-real-pg16.yml","phase5-amendment-c-segmented-day-stage6-stage8-offline.yml","phase5-v0082-atomic-segmented-day-pg16-no-provider.yml","phase5-stage9-v0079-db-prepare-offline.yml","phase5-stage8-v0079-daily-prepare-proposals-offline.yml"];
 for(const path of required){
  const yaml=readFileSync(new URL("../.github/workflows/"+path,import.meta.url),"utf8");
  const pull=yaml.split("  pull_request:\n")[1]?.split(/\n  [a-z_]+:/)[0];
  assert.ok(pull,"missing pull_request "+path);
  assert.match(pull,/^      - 'scripts\/v39_phase5b_source_only_successor_owner\.sh'$/m,path);
 }
});

test("T110 final 980 merge retains the full 130-minute margin and fresh database evidence after API reads",()=>{
 const at="2026-11-27T15:40:00.000Z",sec=Date.parse(at)/1000;
 const base={status:"SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY",calendarDays:31,providerCalls:0,databaseWrites:0,observedAtUtc:at,
  cells:[{status:"PREPARED_DENOMINATOR_OBSERVED",open_unreserved:0,future_unreserved:64,next_planned_utc:"2026-11-27T17:50:30.000Z"}]};
 const call=(elapsed,task=at,data=base)=>runSourceGuards("date(){ if [[ \"$#\" == 2 ]];then echo "+(sec+elapsed)+";else command date \"$@\";fi; }; fresh_980_gap '"+JSON.stringify(data)+"' '"+task+"' && echo PASS");
 for(const e of [0,30])assert.equal(call(e).status,0,call(e).stderr);
 for(const e of [-1,31,61])assert.notEqual(call(e).status,0);
 assert.notEqual(call(0,"2026-11-27T15:38:59.000Z").status,0);
 assert.notEqual(call(0,"bad-clock").status,0);
 assert.notEqual(call(0,at,{...base,cells:[{...base.cells[0],open_unreserved:1}]}).status,0);
 const merge=sourceCutover.slice(sourceCutover.indexOf("merge_exact(){"),sourceCutover.indexOf("\npin(){"));
 assert.match(merge,/gh pr ready[\s\S]*?all_main_quiet[\s\S]*?fresh_980_gap[\s\S]*?gh pr merge/);
 assert.match(merge,/FINAL_MERGE_EVIDENCE_STALE_OR_GAP/);
});


test("T128 #981 exact worker CI requires all scientific paths and verified skipped callback binary",()=>{
 const h="a".repeat(40);
 const existing=[...sourceGuards.matchAll(/"\.github\/workflows\/([^"]+\.yml)"/g)].map(x=>x[1]);
 const rows=[...new Set(existing)].map(path=>({path:".github/workflows/"+path,head_sha:h,status:"completed",conclusion:"success",run_attempt:1}));
 const call=rs=>runSourceGuards("target_981_ci_ok '"+JSON.stringify({total_count:rs.length,workflow_runs:rs})+"' "+h+" && echo PASS");
 assert.equal(rows.length,29);assert.equal(call(rows).status,0);
 for(let i=0;i<rows.length;i++)assert.notEqual(call(rows.filter((_,j)=>j!==i)).status,0);
 assert.notEqual(call([{...rows[0],conclusion:"failure"},...rows.slice(1)]).status,0);
 assert.notEqual(call([{...rows[0],run_attempt:2},...rows.slice(1)]).status,0);
 const job={head_sha:h,name:"verify-offline-reviewed-receiver-build",status:"completed",conclusion:"success",steps:[
 {name:"Prove source-equivalent callback-only build and historical constraints",conclusion:"success"},
 {name:"Explicit worker-only callback admission or exact reviewed source",conclusion:"success"},
 {name:"Build reviewed callback-only binary without provider or production credentials",conclusion:"skipped"}]};
 const check=j=>runSourceGuards("target_981_callback_jobs_ok '"+JSON.stringify({total_count:1,jobs:[j]})+"' "+h+" && echo PASS");
 assert.equal(check(job).status,0);
 for(const bad of [{...job,head_sha:"b".repeat(40)},{...job,conclusion:"failure"},{...job,steps:job.steps.slice(0,2)},{...job,steps:job.steps.map(x=>({...x,conclusion:"success"}))}])
  assert.notEqual(check(bad).status,0);
 assert.match(sourceCutover,/DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_981/);
 assert.match(sourceCutover,/RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_981/);
});


test("T135 #982 reuses the exact guarded release and explicitly limits additional worker input scope",()=>{
 assert.match(sourceCutover,/DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_982/);
 assert.match(sourceCutover,/RECOVER_EXACT_MERGED_SOURCE_ONLY_TARGET_982/);
 assert.match(sourceCutover,/TARGET_PR=982\s+OLD=697501b9443837018414082434cbe798ab835f92/);
 assert.match(sourceCutover,/if \[\[ "\$TARGET_PR" == 981 \|\| "\$TARGET_PR" == 982 \|\| "\$TARGET_PR" == 983 \]\];then\s+target_981_ci_ok/);
 assert.match(sourceCutover,/"\$num" == 980 \|\| "\$num" == 981 \|\| "\$num" == 982/);
 const guard=readFileSync(new URL("../scripts/v39_phase5b_callback_worker_only_guard.sh",import.meta.url),"utf8");
 assert.match(guard,/BASE_982=697501b9443837018414082434cbe798ab835f92/);
 assert.match(guard,/git diff --name-only[^\n]*"\$BASE_982" HEAD/);
 assert.match(guard,/server\/lib\/disruption\/phase5ConditionalPostOutcomeMatcher_v39\.ts/);
 assert.match(guard,/PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD/);
 const workflow=readFileSync(new URL("../.github/workflows/phase5-reviewed-replit-callback-only-build-no-provider.yml",import.meta.url),"utf8");
 assert.match(workflow,/github.event.pull_request.number == 981 \|\| github.event.pull_request.number == 982/);
});

test("T135 commissioning worker successor explicitly triggers all three scientific sibling checks",()=>{
 for(const name of ["phase5-v0088-real-queue-stage14-disposable-pg16.yml","phase5-v0091-source-bound-registration-disposable-pg16.yml","phase5-amendment-e-endpoint-evidence-review-offline.yml"]){
  const yaml=readFileSync(new URL("../.github/workflows/"+name,import.meta.url),"utf8");
  const pr=yaml.split("  pull_request:\n")[1]?.split(/\n  [a-z_]+:/)[0];
  assert.ok(pr,name);assert.match(pr,/^      - 'scripts\/v39_phase5b_source_only_successor_owner\.sh'$/m,name);
 }
});

test("T138 paused cutover needs fresh read-only route proof, quiet admissions and fresh reconciled tasks without a future paid slot",()=>{
 const at="2026-11-28T08:10:00.000Z",sec=Date.parse(at)/1000;
 const m="a".repeat(40),r="b".repeat(40);
 const receipt={schema:"v39.phase5b.scientific-pause-receipt.v1",status:"PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY",
  targetMainSha:m,relayMainSha:r,existingProtectedOverridesVerified:true,retentionAndRuntimePinsPreserved:true,
  publicationPauseScope:"FUTURE_SOURCE_DAY_PREPARATION_ONLY",drainState:"QUIESCENT",activeAfter:[],snapshotOnly:true,
  drainCompletionGuaranteed:false,githubVariableWritesAttempted:0,githubVariableWritesConfirmed:0,githubDispatches:0,
  cancelledRuns:0,providerCalls:0,databaseWrites:0,policyBytesChanged:false,phase6PaidGo:false,automaticResume:false,observedAtUtc:at};
 const call=(j=receipt,elapsed=0,task=at)=>runSourceGuards("date(){ if [[ \"$#\" == 2 ]];then echo "+(sec+elapsed)+";else command date \"$@\";fi; }; fresh_paused_cutover '"+JSON.stringify(j)+"' '"+task+"' "+m+" "+r+" && echo PAUSED_PASS");
 for(const elapsed of [0,60])assert.equal(call(receipt,elapsed).status,0,call(receipt,elapsed).stderr);
 for(const patch of [
  {status:"NEW_PAID_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_PAUSED"},{targetMainSha:r},{relayMainSha:m},
  {existingProtectedOverridesVerified:false},{retentionAndRuntimePinsPreserved:false},{publicationPauseScope:"ALL_PUBLICATION"},
  {drainState:"DRAINING"},{activeAfter:[{id:1}]},{activeAfter:null},{snapshotOnly:false},{drainCompletionGuaranteed:true},
  {githubVariableWritesAttempted:1},{githubVariableWritesConfirmed:1},{githubDispatches:1},{cancelledRuns:1},
  {providerCalls:1},{databaseWrites:1},{policyBytesChanged:true},{phase6PaidGo:true},{automaticResume:true},{observedAtUtc:"bad"}
 ]){
  const x=call({...receipt,...patch});assert.notEqual(x.status,0,JSON.stringify(patch));assert.doesNotMatch(x.stdout,/PAUSED_PASS/);
 }
 for(const [elapsed,task] of [[-1,at],[61,at],[0,"2026-11-28T08:08:59Z"],[0,"2026-11-28T08:10:01Z"],[0,"bad-clock"]])
  assert.notEqual(call(receipt,elapsed,task).status,0);
});

test("T138 paused recovery independently refuses enabled, missing, malformed or unknown protected route metadata",()=>{
 const keys=["P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NONPAID_SOURCE_SCHEDULE_ENABLED"];
 const rows=keys.map(name=>({name,value:"false"}));
 const pages=variables=>[{total_count:variables.length,variables}];
 const call=(repo=pages(rows),env=pages([]),fail=false)=>runSourceGuards("ENV=phase6-protected-runtime; gh(){ if [[ \"$4\" == *environments* ]];then "+(fail?"return 5;":"echo '"+JSON.stringify(env)+"';")+" else echo '"+JSON.stringify(repo)+"';fi; }; paused_routes_ok && echo ROUTES_PASS");
 assert.equal(call().status,0,call().stderr);
 assert.equal(call(pages(rows),pages(rows)).status,0);
 for(const k of keys){
  assert.notEqual(call(pages(rows.map(x=>x.name===k?{...x,value:"true"}:x))).status,0);
  assert.notEqual(call(pages(rows.filter(x=>x.name!==k))).status,0);
  for(const value of ["true","__ABSENT__","0",null])assert.notEqual(call(pages(rows),pages([{name:k,value}])).status,0);
 }
 for(const name of ["P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED"]){
  assert.notEqual(call(pages([...rows,{name,value:"true"}])).status,0);
  assert.notEqual(call(pages(rows),pages([{name,value:"true"}])).status,0);
  assert.equal(call(pages([...rows,{name,value:"false"}]),pages([{name,value:"false"}])).status,0);
 }
 for(const bad of [[],{},[{total_count:1,variables:[]}],pages([...rows,rows[0]]),[{variables:rows}],pages([{name:1,value:"false"}])])
  assert.notEqual(call(pages(rows),bad).status,0);
 assert.notEqual(call(pages(rows),pages([]),true).status,0);
});

test("T138 paused #982 deployment reuses final task, quiet, pin and retention protections and never resumes routes",()=>{
 assert.match(sourceCutover,/DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_982/);
 assert.match(sourceCutover,/RECOVER_EXACT_MERGED_PAUSED_TARGET_982/);
 const merge=sourceCutover.slice(sourceCutover.indexOf("merge_exact(){"),sourceCutover.indexOf("\npin(){"));
 assert.match(merge,/gh pr ready[\s\S]*?all_main_quiet[\s\S]*?verify_paused "\$OLD"[\s\S]*?all_main_quiet[\s\S]*?fresh_paused_cutover[\s\S]*?gh pr merge/);
 const lastCheck=sourceCutover.slice(sourceCutover.indexOf("stage=QUIET_AND_GAP"),sourceCutover.indexOf("stage=TARGET_MERGE"));
 assert.match(lastCheck,/wait_all_quiet[\s\S]*?node "\$TMP\/funnel.cjs"[\s\S]*?cutover_pre_tasks_ok[\s\S]*?verify_paused[\s\S]*?fresh_paused_cutover[\s\S]*?else\s+node "\$TMP\/census.mjs"/);
 assert.match(sourceCutover,/stage=NEW_TARGET_RETENTION[\s\S]*?ENSURE_EXACT_CURRENT_MAIN_FULL_RETENTION_BASELINE[\s\S]*?stage=FINAL_TARGET_ONLY_READBACK[\s\S]*?verify_paused "\$NEW"/);
 assert.match(sourceCutover,/bash "\$TMP\/pause.sh" VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION/);
 assert.match(sourceCutover,/bash "\$TMP\/pause.sh" VERIFY_PAUSED_RECOVERY_INVARIANTS "\$1" "\$ROLD" "\$OLD"/);
 const recovery=sourceCutover.slice(sourceCutover.indexOf("stage=EXACT_MERGED_980_RECOVERY"),sourceCutover.indexOf("stage=EXACT_SOURCE_ONLY_OWNER_READBACK"));
 assert.match(recovery,/target_980_pins_ok[\s\S]*?verify_paused_recovery "\$NEW"[\s\S]*?wait_all_quiet[\s\S]*?cutover_pre_tasks_ok[\s\S]*?verify_paused_recovery "\$NEW"[\s\S]*?all_main_quiet/);
 assert.doesNotMatch(sourceCutover,/gh variable set (?:P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED|P6_PRIVATE_POST_PARENT_ENABLED|P6_NONPAID_SOURCE_SCHEDULE_ENABLED)/);
 assert.doesNotMatch(sourceCutover,/gh run cancel|gh api[^\n]*DELETE/);
});

test("T138 complete variable enumeration refuses literal absence sentinels and malformed or partial metadata",()=>{
 const defs=sourceCutover.slice(sourceCutover.indexOf("vars(){"),sourceCutover.indexOf("\nvalue(){"));
 const invoke=(pages,fail=false)=>spawnSync("bash",["-c","set -Eeuo pipefail\n"+defs+"\ngh(){ "+(fail?"return 5;":"echo '"+JSON.stringify(pages)+"';")+" }; vars repo env"],{encoding:"utf8",timeout:5000});
 assert.equal(invoke([{total_count:0,variables:[]}]).status,0);
 assert.equal(invoke([{total_count:1,variables:[{name:"PIN",value:"a".repeat(40)}]}]).status,0);
 for(const pages of [[],{},[{total_count:1,variables:[]}],[{total_count:1,variables:[{name:"PIN",value:"__ABSENT__"}]}],[{total_count:1,variables:[{name:"PIN",value:null}]}],[{total_count:2,variables:[{name:"PIN",value:"a"},{name:"PIN",value:"b"}]}]])
  assert.notEqual(invoke(pages).status,0);
 assert.notEqual(invoke([{total_count:0,variables:[]}],true).status,0);
});

test("paused #983 reuses exact mandatory checks, recovery, and callback isolation",()=>{
 assert.match(sourceCutover,/TARGET_PR=983\s+OLD=9426eda5f749e43b1e798b1c308f5c428f696882\s+ROLD=[a-f0-9]{40}\s+ROUTE_MODE=PAUSED/);
 assert.match(sourceCutover,/DEPLOY_EXACT_REVIEWED_PAUSED_TARGET_983/);
 assert.equal([...sourceCutover.matchAll(/RECOVER_EXACT_MERGED_PAUSED_TARGET_983/g)].length,4);
 assert.match(sourceCutover,/"\$num" == 982 \|\| "\$num" == 983/);
 assert.match(sourceCutover,/"\$TARGET_PR" == 982 \|\| "\$TARGET_PR" == 983 \]\];then ci "\$R" "\$H" 29/);
 assert.match(sourceCutover,/"\$TARGET_PR" == 982 \|\| "\$TARGET_PR" == 983 \]\];then target_980_pins_ok/);
 for(const name of ["phase6-nonpaid-source-day-prepare-publish.yml","phase6-admission-diagnostics-offline.yml","phase5-reviewed-replit-callback-only-build-no-provider.yml"]){
  const y=readFileSync(new URL("../.github/workflows/"+name,import.meta.url),"utf8");
  const pr=y.split("  pull_request:\n")[1]?.split(/\n  [a-z_]+:/)[0];
  assert.ok(pr,name);assert.match(pr,/^      - 'scripts\/v39_phase5b_source_only_successor_owner\.sh'$/m,name);
 }
 assert.doesNotMatch(sourceCutover,/gh variable set (?:P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED|P6_PRIVATE_POST_PARENT_ENABLED|P6_NONPAID_SOURCE_SCHEDULE_ENABLED)/);
});
