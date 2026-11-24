import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const workflow=".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml";
const src=readFileSync(workflow,"utf8");
const start=src.indexOf("      - name: Separate STOP-default T24 current registry scheduler");
const stop=src.indexOf("      - uses: actions/setup-node@v4",start);
assert(start>=0&&stop>start);
const shell=src.slice(start,stop).split("\n").slice(3).filter(l=>l.trim()).map(l=>l.slice(10)).join("\n");
const base={GITHUB_EVENT_NAME:"workflow_dispatch",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER",GITHUB_RUN_ATTEMPT:"1",P6_PRIVATE_T24_EXECUTION_ENABLED:"1",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_T24_WITNESS_APPROVED:"1",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",DATABASE_URL:"",V39_P5_SOURCE_DATABASE_URL:""};
const run=env=>spawnSync("bash",["-c",shell],{env:{PATH:process.env.PATH,...env},encoding:"utf8"});
test("real workflow shell gate admits the reviewed correct fixture, not an invented parallel gate",()=>{
 assert.equal(run(base).status,0);
 assert.equal(run({...base,GITHUB_EVENT_NAME:"schedule",P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM:""}).status,0);
});
test("every literal control mismatch names the exact failing predicate; no values printed",()=>{
 for(const k of Object.keys(base).filter(k=>!["GITHUB_EVENT_NAME","P6_PRIVATE_CURRENT_T24_DISPATCH_CONFIRM","AERODATABOX_API_KEY","DATABASE_URL","V39_P5_SOURCE_DATABASE_URL"].includes(k))){
  const r=run({...base,[k]:"SECRET_SENTINEL_NEVER_PRINT"});
  assert.equal(r.status,2,k);assert.match(r.stderr,new RegExp("HOLD_P6_LITERAL_GATE_"+k+"\\b"));assert(!r.stderr.includes("SECRET_SENTINEL_NEVER_PRINT"));
 }
});
test("forbidden provider or broad database credentials remain rejected",()=>{
 for(const k of ["AERODATABOX_API_KEY","DATABASE_URL","V39_P5_SOURCE_DATABASE_URL"]){
  const r=run({...base,[k]:"SECRET_SENTINEL_NEVER_PRINT"});assert.notEqual(r.status,0);assert(!r.stderr.includes("SECRET_SENTINEL_NEVER_PRINT"));
 }
});
