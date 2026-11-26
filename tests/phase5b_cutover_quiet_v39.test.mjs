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
