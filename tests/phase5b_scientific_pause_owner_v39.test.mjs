// I141/T137: exercise the complete owner helper with persistent gh metadata
// and mutations. No credentials, database, provider, or actual GitHub access.
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,delimiter} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const script=fileURLToPath(new URL("../scripts/v39_phase5b_scientific_pause_owner.sh",import.meta.url));
const main="697501b9443837018414082434cbe798ab835f92";
const relay="2d96b22345908aa4334335aa899aec71b2fec2cb";
const mode="PAUSE_NEW_PAID_ADMISSIONS_AND_FUTURE_PUBLICATION";
const protectedScope="target/phase6-protected-runtime";
const keys=["P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NONPAID_SOURCE_SCHEDULE_ENABLED"];
const row=(id,path,status="in_progress")=>({id,path:`.github/workflows/${path}`,status,head_branch:"main",created_at:"2026-11-28T08:00:00Z"});
function fixture(){
 const target={P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:main,P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:main,P7_EXPIRY_APPROVED_MAIN_SHA:main,
  [keys[0]]:"true",[keys[1]]:"false",[keys[2]]:"true",P5_AUTO_SOURCE_DISPATCH_ENABLED:"false",
  P6_FULL_RETENTION_BACKSTOP_ENABLED:"true",P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P7_EXPIRY_ENABLED:"true",
  P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",P6_PRIVATE_EPOCH_EXPIRY_MODE:"APPLY_DUE_ONLY",
  P6_PRIVATE_EPOCH_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER",P7_EXPIRY_APPROVAL:"APPLY_P7_DUE_ONLY_NO_PROVIDER",
  P6_ROLLING_CONTROLLER_ENABLED:"1",P6_ROLLING_DIRECT_RECOVERY_ENABLED:"0"};
 const vars={"target/repo":target,[protectedScope]:{[keys[0]]:"true",[keys[2]]:"true",P7_EXPIRY_ENABLED:"true"},
  "relay/repo":{P6_RELAY_APPROVED_EXECUTABLE_SHA:relay,TRAVNR_APPROVED_TARGET_MAIN_SHA:main,TRAVNR_RELAY_PRIMARY_ENABLED:"1",TRAVNR_RELAY_ROLLING_ENABLED:"1",TRAVNR_RELAY_ROLLING_ROUTE:"INDEPENDENT_WAKE"}};
 for(const name of ["travnr-target-forward","travnr-cron-audit","travnr-cron-management","travnr-cron-lease-renewal"])vars[`relay/${name}`]={};
 return {main,relay,vars,writes:[],calls:[],metadataReads:{},targetMainReads:0,runReads:0,config:{},active:[]};
}
const mock=String.raw`#!/usr/bin/env node
const fs=require("node:fs");
const file=process.env.MOCK_GH_STATE;
const s=JSON.parse(fs.readFileSync(file,"utf8"));
const a=process.argv.slice(2),c=s.config;s.calls.push(a);
function done(value,code=0){fs.writeFileSync(file,JSON.stringify(s));if(value!==undefined)process.stdout.write(typeof value==="string"?value+"\n":JSON.stringify(value)+"\n");process.exit(code);}
function fail(){process.stderr.write("WITHHELD_API_SECRET_SENTINEL\n");done(undefined,5);}
if(a[0]==="api"){
 const endpoint=a.find(x=>x==="user"||x.startsWith("repos/"));
 if(endpoint==="user")done(c.owner??"HKcode22");
 if(endpoint.endsWith("/git/ref/heads/main")){
  if(endpoint.includes("/ReplitTranvr/")){s.targetMainReads++;done(c.initialMainDrift||(c.mainDriftAfterWrites&&s.writes.length>0)||(c.mainDriftBeforeWrite&&s.targetMainReads>=2)?"c".repeat(40):s.main);}
  done(s.relay);
 }
 if(endpoint.includes("/variables?")){
  const repo=endpoint.includes("/ReplitTranvr/")?"target":"relay";
  const env=endpoint.match(/\/environments\/([^/]+)\/variables/);
  const scope=repo+"/"+(env?env[1]:"repo");
  s.metadataReads[scope]=(s.metadataReads[scope]??0)+1;
  if(c.failScope===scope&&(!c.failAfterWrites||s.writes.length>0))fail();
  const v={...s.vars[scope]};
  if(c.staleReadback&&s.writes.length>0){const w=s.writes.at(-1);if(w.scope===scope)v[w.key]="true";}
  if(c.retentionDriftAfterWrites&&s.writes.length>0&&scope==="target/repo")v.P7_EXPIRY_ENABLED="false";
  const entries=Object.entries(v).map(([name,value])=>({name,value}));
  if(c.duplicateScope===scope)entries.push(entries[0]);
  if(c.malformedScope===scope)done([{total_count:0,unexpected:[]}]);
  done([{total_count:entries.length+(c.incompleteScope===scope?1:0),variables:entries}]);
 }
 if(endpoint.includes("/actions/runs?")){
  s.runReads++;
  if(c.failPostPauseRuns&&s.runReads>5)fail();
  const status=endpoint.match(/[?&]status=([^&]+)/)[1];
  const runs=s.active.filter(x=>x.status===status);
  done({total_count:c.badRuns?101:c.badRunsAt===s.runReads?runs.length+1:runs.length,workflow_runs:runs});
 }
}
if(a[0]==="variable"&&a[1]==="set"){
 const key=a[2],env=a.indexOf("--env"),scope="target/"+(env<0?"repo":a[env+1]);
 if(a[a.indexOf("-R")+1]!=="HKcode22/ReplitTranvr"||a[a.indexOf("--body")+1]!=="false"||
   !["P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NONPAID_SOURCE_SCHEDULE_ENABLED"].includes(key))fail();
 s.writes.push({scope,key,value:"false"});
 s.vars[scope][key]="false";
 if(c.failWriteAt===s.writes.length)fail();
 done();
}
done("UNEXPECTED_GH_OPERATION",99);
`;
function execute(change=()=>{},requestedMode=mode,previousTarget){
 const d=mkdtempSync(join(tmpdir(),"p5b-pause-test-"));
 try{
  const s=fixture();change(s);const initial=structuredClone(s.vars);
  const state=join(d,"state.json");writeFileSync(state,JSON.stringify(s));writeFileSync(join(d,"gh"),mock,{mode:0o700});
  const args=[script,requestedMode,main,relay];if(previousTarget!==undefined)args.push(previousTarget);
  const r=spawnSync("bash",args,{encoding:"utf8",timeout:30000,
   env:{...process.env,PATH:d+delimiter+process.env.PATH,MOCK_GH_STATE:state}});
  const actual=JSON.parse(readFileSync(state,"utf8"));
  assert.doesNotMatch(r.stdout+r.stderr,/WITHHELD_API_SECRET_SENTINEL|UNEXPECTED_GH_OPERATION/);
  return {...r,actual,initial,receipt:r.status===0?JSON.parse(r.stdout):null};
 }finally{rmSync(d,{recursive:true,force:true});}
}
function held(r,reason,writes=0){
 assert.equal(r.status,2,r.stdout+r.stderr);assert.match(r.stderr,new RegExp(reason));
 assert.equal(r.actual.writes.length,writes);assert.doesNotMatch(r.stdout,/NEW_PAID_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_PAUSED|PUBLICATION_VERIFIED_READONLY|RECOVERY_INVARIANTS_VERIFIED_READONLY|"QUIESCENT"/);
}
test("T137 actual helper pauses only the three routes and existing shadows; active children remain untouched",()=>{
 const child=row(101,"phase5-one-signed-day-source-child-dispatch.yml");
 const parent=row(102,"phase5-source-upcoming-queue-main-scheduled-readonly.yml","queued");
 const r=execute(s=>s.active=[child,parent,row(103,"v39-phase0-offline.yml")]);
 assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(r.receipt.drainState,"DRAINING");
 assert.deepEqual(r.receipt.activeAfter.map(x=>x.id),[101,102]);assert.equal(r.actual.writes.length,4);
 assert.equal(r.receipt.githubVariableWritesConfirmed,4);assert.equal(r.receipt.cancelledRuns,0);
 assert.equal(r.receipt.status,"NEW_PAID_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_PAUSED");
 assert.equal(r.receipt.publicationPauseScope,"FUTURE_SOURCE_DAY_PREPARATION_ONLY");
 assert.equal(r.receipt.nativePostPublisher,"UNCHANGED_BY_THIS_HELPER");
 assert.equal(r.receipt.drainCompletionGuaranteed,false);assert.equal(r.receipt.automaticResume,false);
 for(const [scope,vars] of Object.entries(r.initial))for(const [key,value] of Object.entries(vars))
  assert.equal(r.actual.vars[scope][key],scope.startsWith("target/")&&keys.includes(key)?"false":value);
 assert.deepEqual(Object.keys(r.actual.vars[protectedScope]).sort(),Object.keys(r.initial[protectedScope]).sort());
 assert.deepEqual(r.actual.active,[child,parent,row(103,"v39-phase0-offline.yml")]);
 assert.ok(r.actual.calls.every(a=>a[0]==="api"||(a[0]==="variable"&&a[1]==="set")));
 assert.equal(r.actual.runReads,10);
});
test("T137 an already paused same scope is idempotent; unrelated active CI does not block the snapshot",()=>{
 const r=execute(s=>{for(const scope of ["target/repo",protectedScope])for(const k of keys)if(k in s.vars[scope])s.vars[scope][k]="false";
  s.active=[row(104,"v39-phase0-offline.yml")];});
 assert.equal(r.status,0,r.stderr);assert.equal(r.actual.writes.length,0);
 assert.equal(r.receipt.drainState,"QUIESCENT");assert.equal(r.receipt.snapshotOnly,true);
 assert.equal(r.receipt.drainCompletionGuaranteed,false);assert.equal(r.receipt.githubVariableWritesAttempted,0);
});
test("T137 unknown or incomplete environment metadata never becomes absent",()=>{
 for(const config of [{failScope:protectedScope},{malformedScope:protectedScope},{incompleteScope:protectedScope},{duplicateScope:protectedScope}])
  held(execute(s=>s.config=config),"VARIABLE_METADATA_");
});
test("T137 unexpected routes, legacy admissions and retention overrides refuse before mutation",()=>{
 held(execute(s=>s.vars["target/repo"][keys[0]]="DO_NOT_PRINT_UNEXPECTED_VALUE"),"UNEXPECTED_ROUTE_VALUE");
 const r=execute(s=>s.vars[protectedScope][keys[2]]="DO_NOT_PRINT_UNEXPECTED_VALUE");held(r,"UNEXPECTED_ENV_ROUTE_VALUE");
 assert.doesNotMatch(r.stderr+r.stdout,/DO_NOT_PRINT_UNEXPECTED_VALUE/);
 held(execute(s=>s.vars[protectedScope].P5_POST_AUTO_DISPATCH_ENABLED="true"),"LEGACY_PAID_ROUTE_ACTIVE");
 held(execute(s=>s.vars[protectedScope].P7_EXPIRY_ENABLED="false"),"ENVIRONMENT_OVERRIDE_DRIFT");
 held(execute(s=>s.vars["relay/travnr-cron-audit"].TRAVNR_APPROVED_TARGET_MAIN_SHA="c".repeat(40)),"TARGET_BINDING_DRIFT");
});
test("T137 a literal former absence sentinel is a present override, never inherited configuration",()=>{
 for(const [scope,key,reason] of [
  [protectedScope,"P7_EXPIRY_ENABLED","ENVIRONMENT_OVERRIDE_DRIFT"],
  ["relay/travnr-cron-audit","P6_RELAY_APPROVED_EXECUTABLE_SHA","ENVIRONMENT_OVERRIDE_DRIFT"],
  [protectedScope,keys[2],"UNEXPECTED_ENV_ROUTE_VALUE"],
  [protectedScope,"P5_POST_AUTO_DISPATCH_ENABLED","LEGACY_PAID_ROUTE_ACTIVE"]
 ])held(execute(s=>s.vars[scope][key]="__ABSENT__"),reason);
});
test("T137 exact main drift is refused initially and immediately before writes",()=>{
 for(const config of [{initialMainDrift:true},{mainDriftBeforeWrite:true}])held(execute(s=>s.config=config),"EXACT_MAIN_DRIFT");
 const r=execute(s=>s.config={mainDriftAfterWrites:true});held(r,"EXACT_MAIN_DRIFT",1);
 assert.equal(r.actual.vars["target/repo"][keys[0]],"false");
 assert.match(r.stderr,/variable_writes_confirmed=1/);
});
test("T137 a partial write with unknown API outcome never resumes or claims completion",()=>{
 const r=execute(s=>s.config={failWriteAt:2});held(r,"VARIABLE_WRITE_OUTCOME_UNKNOWN",2);
 assert.match(r.stderr,/variable_writes_attempted=2 variable_writes_confirmed=1 routes_verified=false/);
 assert.equal(r.actual.vars["target/repo"][keys[0]],"false");
 assert.equal(r.actual.vars[protectedScope][keys[0]],"false");
 assert.equal(r.actual.vars["target/repo"][keys[2]],"true");
});
test("T137 failed or inconsistent write readback is not a verified pause",()=>{
 const unknown=execute(s=>s.config={failScope:"target/repo",failAfterWrites:true});held(unknown,"VARIABLE_METADATA_UNVERIFIED",1);
 assert.match(unknown.stderr,/variable_writes_confirmed=0 routes_verified=false/);
 const stale=execute(s=>s.config={staleReadback:true});held(stale,"REQUIRED_VARIABLE_DRIFT",1);
 assert.equal(stale.actual.vars["target/repo"][keys[0]],"false");
});
test("T137 incomplete active enumeration holds; post-pause metadata failure preserves verified route pause without a drain claim",()=>{
 held(execute(s=>s.config={badRuns:true}),"ACTIVE_METADATA_MALFORMED");
 const r=execute(s=>s.config={failPostPauseRuns:true});held(r,"ACTIVE_METADATA_UNVERIFIED",4);
 assert.match(r.stderr,/routes_verified=true/);
 for(const k of keys)assert.equal(r.actual.vars["target/repo"][k],"false");
});
test("T137 external retention drift during pause is detected with no automatic rollback",()=>{
 const r=execute(s=>s.config={retentionDriftAfterWrites:true});held(r,"REQUIRED_VARIABLE_DRIFT",4);
 assert.equal(r.actual.vars["target/repo"].P7_EXPIRY_ENABLED,"true");
 assert.ok(r.actual.writes.every(w=>keys.includes(w.key)&&w.value==="false"));
});
test("T137 VERIFY requires all three repository and protected routes already false and never mutates",()=>{
 const verify="VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION";
 held(execute(()=>{},verify),"REQUIRED_VARIABLE_DRIFT");
 const prep=execute(s=>{for(const scope of ["target/repo",protectedScope])for(const k of keys)if(k in s.vars[scope])s.vars[scope][k]="false";
  s.vars["target/repo"][keys[2]]="true";},verify);
 held(prep,"REQUIRED_VARIABLE_DRIFT");
 const r=execute(s=>{for(const k of keys)s.vars["target/repo"][k]="false";},verify);
 held(r,"ENVIRONMENT_OVERRIDE_DRIFT");
 assert.equal(r.actual.calls.filter(a=>a[0]==="variable").length,0);
});
test("T137 VERIFY produces read-only quiet or draining snapshots with zero write attempts",()=>{
 for(const active of [[],[row(201,"phase5-one-signed-day-source-child-dispatch.yml","queued")]]){
  const r=execute(s=>{
   for(const scope of ["target/repo",protectedScope])for(const k of keys)if(k in s.vars[scope])s.vars[scope][k]="false";
   s.active=active;
  },"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION");
  assert.equal(r.status,0,r.stderr+r.stdout);assert.equal(r.receipt.status,"PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY");
  assert.equal(r.receipt.githubVariableWritesAttempted,0);assert.equal(r.receipt.githubVariableWritesConfirmed,0);
  assert.equal(r.receipt.drainState,active.length?"DRAINING":"QUIESCENT");assert.equal(r.receipt.drainCompletionGuaranteed,false);
  assert.deepEqual(r.actual.vars,r.initial);assert.ok(r.actual.calls.every(a=>a[0]==="api"));
 }
});

const recoveryMode="VERIFY_PAUSED_RECOVERY_INVARIANTS",previousTarget="d".repeat(40);
function mixedRecovery(s){
 for(const scope of ["target/repo",protectedScope])for(const k of keys)if(k in s.vars[scope])s.vars[scope][k]="false";
 s.vars["target/repo"].P6_PHASE5B_RUNTIME_EXECUTABLE_SHA=previousTarget;
 s.vars["target/repo"].P7_EXPIRY_APPROVED_MAIN_SHA=previousTarget;
 s.vars[protectedScope].P6_PHASE5B_RUNTIME_EXECUTABLE_SHA=main;
 s.vars[protectedScope].P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA=previousTarget;
 s.vars["relay/repo"].TRAVNR_APPROVED_TARGET_MAIN_SHA=previousTarget;
 s.vars["relay/travnr-target-forward"].TRAVNR_APPROVED_TARGET_MAIN_SHA=main;
 s.vars["relay/travnr-cron-audit"].TRAVNR_APPROVED_TARGET_MAIN_SHA=previousTarget;
 s.vars["relay/travnr-cron-management"].TRAVNR_APPROVED_TARGET_MAIN_SHA=main;
 s.vars["relay/travnr-cron-lease-renewal"].TRAVNR_APPROVED_TARGET_MAIN_SHA=previousTarget;
}
test("T137 recovery invariant verification accepts only the exact mixed target bindings without convergence or deployment claims",()=>{
 const r=execute(mixedRecovery,recoveryMode,previousTarget);
 assert.equal(r.status,0,r.stderr+r.stdout);assert.equal(r.receipt.status,"PAUSED_RECOVERY_INVARIANTS_VERIFIED_READONLY");
 assert.equal(r.receipt.allowedPreviousTargetMainSha,previousTarget);assert.equal(r.receipt.targetMainSha,main);
 assert.equal(r.receipt.runtimePinConvergenceCertified,false);assert.equal(r.receipt.deploymentEvidence,false);
 assert.equal(r.receipt.githubVariableWritesAttempted,0);assert.equal(r.receipt.githubVariableWritesConfirmed,0);
 assert.deepEqual(r.actual.vars,r.initial);assert.ok(r.actual.calls.every(a=>a[0]==="api"));
 held(execute(mixedRecovery,"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION"),"TARGET_BINDING_DRIFT");
});
test("T137 recovery invariant verification still refuses retention, relay, sentinel and paid/preparation drift before any write",()=>{
 for(const [change,reason] of [
  [s=>s.vars["target/repo"].P6_PHASE5B_RUNTIME_EXECUTABLE_SHA="e".repeat(40),"TARGET_BINDING_DRIFT"],
  [s=>s.vars["relay/travnr-cron-management"].TRAVNR_APPROVED_TARGET_MAIN_SHA="e".repeat(40),"TARGET_BINDING_DRIFT"],
  [s=>s.vars[protectedScope].P7_EXPIRY_ENABLED="false","ENVIRONMENT_OVERRIDE_DRIFT"],
  [s=>s.vars[protectedScope].P7_EXPIRY_ENABLED="__ABSENT__","ENVIRONMENT_OVERRIDE_DRIFT"],
  [s=>s.vars[protectedScope].P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA="__ABSENT__","TARGET_BINDING_DRIFT"],
  [s=>s.vars["relay/repo"].P6_RELAY_APPROVED_EXECUTABLE_SHA=previousTarget,"REQUIRED_VARIABLE_DRIFT"],
  [s=>s.vars["target/repo"][keys[0]]="true","REQUIRED_VARIABLE_DRIFT"],
  [s=>s.vars[protectedScope][keys[2]]="true","ENVIRONMENT_OVERRIDE_DRIFT"]
 ]){
  const r=execute(s=>{mixedRecovery(s);change(s);},recoveryMode,previousTarget);held(r,reason);
  assert.ok(r.actual.calls.every(a=>a[0]==="api"));
 }
});
test("T137 recovery mode requires an exact distinct previous target and the actual current main",()=>{
 for(const previous of [undefined,"bad",main]){
  const r=execute(mixedRecovery,recoveryMode,previous);held(r,"EXACT_SCOPE");assert.equal(r.actual.calls.length,0);
 }
 held(execute(s=>{mixedRecovery(s);s.config.initialMainDrift=true;},recoveryMode,previousTarget),"EXACT_MAIN_DRIFT");
});

// S001: a single inconsistent status response does not force a repeat of
// a previously completed protected policy stage. Persistent drift still holds.
test("T137 S001 fresh whole-snapshot retry recovers one inconsistent active page, never hides an active child",()=>{
 const r=execute(s=>{for(const scope of ["target/repo",protectedScope])for(const k of keys)if(k in s.vars[scope])s.vars[scope][k]="false";s.config.badRunsAt=6;s.active=[row(301,"phase5-one-signed-day-source-child-dispatch.yml","queued")];},"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION");
 assert.equal(r.status,0,r.stderr);assert.equal(r.receipt.drainState,"DRAINING");assert.deepEqual(r.receipt.activeAfter.map(x=>x.id),[301]);assert.equal(r.actual.writes.length,0);assert.match(r.stderr,/ACTIVE_SNAPSHOT_RECHECK status=queued attempt=1/);assert.equal(r.actual.runReads,11);
});
