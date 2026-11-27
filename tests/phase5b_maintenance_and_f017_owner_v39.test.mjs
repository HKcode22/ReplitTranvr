import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
const dir=new URL("../data-collection/phase6/owner-recovery/20261126-979/",import.meta.url);
const fixtures=[{"name":"maintenance-original.sh","sha":"ca60e319da3548d747225c08204e821493a36363"},{"name":"maintenance-progress.sh","sha":"bd4a11ee7d95753ba3b293dd592b8a7882fa630f"},{"name":"f017-geometry.mjs","sha":"209a5b3db7863fe24286fb7eedfff8ad01ad6011"}];
const clean={...process.env,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",AERODATABOX_API_KEY:"",RAPIDAPI_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",GH_TOKEN:"",GITHUB_TOKEN:""};
function run(cmd,args,marker){
 const r=spawnSync(cmd,args,{encoding:"utf8",timeout:60000,env:clean});
 assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,marker);
}
test("T098/T099/T100 exact archived incident owner blobs, offline only",()=>{
 for(const x of fixtures){const b=readFileSync(new URL(x.name,dir));assert.equal(createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex"),x.sha);}
 const original=fileURLToPath(new URL("maintenance-original.sh",dir)),progress=fileURLToPath(new URL("maintenance-progress.sh",dir));
 run("bash",[original,"SELF_TEST"],/P6_I104_T098_LOCAL_MAINTENANCE_GUARDS_PASS/);
 run("bash",[progress,"SELF_TEST"],/P6_I106_T100_DRAIN_PROGRESS_GUARDS_PASS/);
 run(process.execPath,[fileURLToPath(new URL("f017-geometry.mjs",dir)),"--self-test"],/P6_I105_T099_GEOMETRY_SELF_TEST_PASS/);
});
test("T098 full mocked original owner orchestration, no live GitHub or DB",()=>{
 run("python3",[fileURLToPath(new URL("./phase5b_maintenance_979_mock_v39.py",import.meta.url)),fileURLToPath(new URL("maintenance-original.sh",dir))],/8 mock orchestration scenarios passed/);
});
