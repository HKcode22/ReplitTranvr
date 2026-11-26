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
