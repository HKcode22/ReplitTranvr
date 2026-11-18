import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {admit,runBackstop,ROOT,WORKER,PARENT,CONFIRM,CHILD_CONFIRM} from "../scripts/v39_phase5_primary_github_backstop_v39.mjs";
const MIN=60000,START=Date.parse("2030-01-01T00:00:00Z"),S="a".repeat(40),iso=t=>new Date(t).toISOString();
function fixture(mode="success"){
 let now=START,posts=0;const emitted=[],child=333;
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"111",GITHUB_SHA:S,GITHUB_TOKEN:"fixture",P5_BACKSTOP_REQUESTED_MAIN:S,P5_BACKSTOP_CONFIRM:CONFIRM,P5_BACKSTOP_DEADLINE:iso(START+25*MIN),P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:S,P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",P6_PRIVATE_EPOCH_EXPIRY_MODE:"COMMISSION_VERIFY_ONLY",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 const row=(id,wf,patch={})=>({id,path:".github/workflows/"+wf,head_branch:"main",head_sha:S,run_attempt:1,event:"schedule",status:"completed",conclusion:"success",created_at:iso(START-31*MIN),...patch});
 const parent=row(111,PARENT,{event:"workflow_dispatch",display_title:"P5 PRIMARY BACKSTOP ROOT",status:"in_progress",conclusion:null,created_at:iso(START)});
 const prior=row(222,WORKER);
 const c=row(child,WORKER,{event:"workflow_dispatch",display_title:"P5 PRIMARY BACKSTOP CHILD",created_at:iso(START),conclusion:mode==="failed"?"failure":"success"});
 const job=(x,done)=>({total_count:1,jobs:[{id:x.id+1000,run_id:x.id,head_sha:S,run_attempt:1,name:"primary-fids-expiry",status:"completed",conclusion:"success",completed_at:iso(done),steps:[{name:"Verify exact main and execute only bounded primary FIDS expiry",status:"completed",conclusion:"success"}]}]});
 const response=(x,status=200)=>({ok:status===200,status,json:async()=>x});
 const fetcher=async(u,opt)=>{
  const path=u.slice(ROOT.length);
  if(opt.method==="POST"){
   posts++;assert.equal(path,"/actions/workflows/"+WORKER+"/dispatches");
   assert.deepEqual(JSON.parse(opt.body).inputs,{confirm:CHILD_CONFIRM,approved_main_sha:S});
   if(mode==="unknown")throw Error("network");
   return response({workflow_run_id:child,run_url:ROOT+"/actions/runs/"+child,html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+child});
  }
  if(path==="/git/ref/heads/main")return response({object:{sha:mode==="drift"?"b".repeat(40):S}});
  if(path==="/actions/runs/111")return response(parent);
  if(path.startsWith("/actions/workflows/"+PARENT+"/runs"))return response({total_count:1,workflow_runs:[parent]});
  if(path.startsWith("/actions/workflows/"+WORKER+"/runs")){
   if(path.includes("&status=")){
    if(mode==="busy"&&path.endsWith("in_progress"))return response({total_count:1,workflow_runs:[{...prior,status:"in_progress",conclusion:null}]});
    return response({total_count:0,workflow_runs:[]});
   }
   return response({total_count:1,workflow_runs:[posts?c:prior]});
  }
  if(path==="/actions/runs/222")return response(prior);
  if(path.startsWith("/actions/runs/222/jobs"))return response(job(prior,mode==="recent"?START-1000:START-30*MIN));
  if(path==="/actions/runs/333")return response(c);
  if(path.startsWith("/actions/runs/333/jobs"))return response(job(c,START));
  assert.fail(path);
 };
 return {env,options:{now:()=>now,sleep:async ms=>{now+=ms;},fetcher,emit:x=>emitted.push(x)},posts:()=>posts,emitted};
}
test("bounded exact primary-only dispatch and independent terminal job readback",async()=>{
 const f=fixture();const r=await runBackstop(f.env,f.options);
 assert.equal(f.posts(),1);assert.equal(r.providerCalls,0);assert.equal(r.privateWritesPermitted,false);
 assert.deepEqual(r.accepted,[333]);assert(f.emitted.some(x=>x.event==="CHILD_JOB_COMPLETED_NOT_DELETION_PROOF"));
});
test("active and recent worker defer without dispatch",async()=>{
 for(const mode of ["busy","recent"]){const f=fixture(mode);await runBackstop(f.env,f.options);assert.equal(f.posts(),0);}
});
test("unknown acknowledgement and failed accepted child stop without replay",async()=>{
 for(const mode of ["unknown","failed"]){const f=fixture(mode);await assert.rejects(runBackstop(f.env,f.options),/NO_RETRY/);assert.equal(f.posts(),1);}
});
test("main drift, scope drift and prohibited credentials refuse",async()=>{
 const f=fixture("drift");await assert.rejects(runBackstop(f.env,f.options),/MAIN_MOVED/);assert.equal(f.posts(),0);
 for(const patch of [{GITHUB_RUN_ATTEMPT:"2"},{P6_PRIVATE_EPOCH_EXPIRY_MODE:"APPLY_DUE_ONLY"},{P5_PRIMARY_FIDS_SWEEP_DATABASE_URL:"fixture"},{P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"false"}])assert.throws(()=>admit({...f.env,...patch},START),/SCOPE/);
});
test("actual workflow binds the exact primary-only child confirmation and fresh private-mode condition",()=>{
 const w=readFileSync(new URL("../.github/workflows/"+WORKER,import.meta.url),"utf8");
 assert(w.includes(CHILD_CONFIRM));assert(w.includes("vars.P6_PRIVATE_EPOCH_EXPIRY_MODE == 'COMMISSION_VERIFY_ONLY'"));assert(w.includes("P5_PRIMARY_FIDS_BACKSTOP_REQUEST"));
});
