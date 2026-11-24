import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyWorker,observe,LANES} from "./p6_alternate_worker_heartbeat.mjs";
const sha="a".repeat(40),now=Date.parse("2026-11-24T06:10:00Z");
const run=(route,event="workflow_dispatch",over={})=>({id:event==="schedule"?101:102,head_sha:sha,head_branch:"main",path:".github/workflows/"+route.workflow,event,run_attempt:1,status:"completed",conclusion:"success",created_at:"2026-11-24T06:05:00Z",...over});
const step=(name,conclusion="success")=>({name,status:"completed",conclusion});
const jobs=(route,r)=>{const a=route.requirements.map(([name,required,parent],i)=>({id:1000+i,run_id:r.id,head_sha:sha,run_attempt:1,name,status:"completed",conclusion:"success",steps:[...(required?[step(required)]:[]),...(parent?["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>step("Parent outcome "+x,x==="NO_DUE_WORK"?"success":"skipped")):[])]}));return {total_count:a.length,jobs:a}};
test("exact named execution, no success on skip or missing step",()=>{
 const lane=LANES[4],r=run(lane),b=jobs(lane,r);assert.equal(verifyWorker(r,b,lane,sha,now).verified,true);
 for(const patch of [{conclusion:"skipped"},{run_attempt:2},{head_sha:"b".repeat(40)},{created_at:"2026-11-24T00:00:00Z"}])assert.equal(verifyWorker({...r,...patch},b,lane,sha,now).verified,false);
 b.jobs[0].steps=[];assert.equal(verifyWorker(r,b,lane,sha,now).verified,false);
});
test("missing parent outcome and safe HOLD are not execution coverage",()=>{
 const lane=LANES[1],r=run(lane),b=jobs(lane,r);assert.equal(verifyWorker(r,b,lane,sha,now).verified,true);
 b.jobs[0].steps.find(x=>x.name==="Parent outcome NO_DUE_WORK").conclusion="skipped";
 b.jobs[0].steps.find(x=>x.name==="Parent outcome SAFE_PREFLIGHT_HOLD").conclusion="success";
 assert.equal(verifyWorker(r,b,lane,sha,now).verified,false);
});
test("native gap remains visible; alternate execution never proves collection",async()=>{
 const lookup=new Map();let n=100;
 const read=async url=>{
  if(url.includes("/actions/workflows/")){
   const lane=LANES.find(l=>url.includes(l.workflow));const event=url.includes("event=schedule")?"schedule":"workflow_dispatch";
   const r=run(lane,event,{id:++n,...(event==="schedule"?{created_at:"2026-11-24T00:00:00Z"}:{})});
   lookup.set(r.id,jobs(lane,r));return {total_count:1,workflow_runs:[r]};
  }
  return lookup.get(Number(url.match(/runs\/(\d+)\/jobs/)[1]));
 };
 const o=await observe(read,sha,now);
 assert.equal(o.lanes.length,7);
 assert(o.lanes.every(l=>l.state==="NATIVE_GAP_ALTERNATE_EXECUTED"&&l.collectionVerified===false&&l.dueWorkVerified===false));
 assert.equal(o.providerCalls,0);assert.equal(o.dispatches,0);
});
test("recent failed native remains a warning even with alternate green",async()=>{
 const lookup=new Map();let n=100;
 const read=async url=>{
  if(url.includes("/actions/workflows/")){
   const lane=LANES.find(l=>url.includes(l.workflow));const event=url.includes("event=schedule")?"schedule":"workflow_dispatch";
   const r=run(lane,event,{id:++n,...(event==="schedule"?{conclusion:"failure"}:{})});lookup.set(r.id,jobs(lane,r));return {total_count:1,workflow_runs:[r]};
  }
  return lookup.get(Number(url.match(/runs\/(\d+)\/jobs/)[1]));
 };
 assert((await observe(read,sha,now)).lanes.every(l=>l.state==="NATIVE_FAILURE_REVIEW"));
});
