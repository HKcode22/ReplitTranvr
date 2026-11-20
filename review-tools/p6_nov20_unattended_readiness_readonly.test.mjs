import test from "node:test";
import assert from "node:assert/strict";
import {ROUTES,classifyRun,classifyModes,selectRouteRun} from "./p6_nov20_unattended_readiness_readonly.mjs";
const head="0a7b1a28f243de76d4c83026d15f585265ef6f7b",relay="b3a775b4ec7213af796bb8c727b69c3d0feb8bb7",manifest="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7";
const now=Date.parse("2026-11-20T04:00:00Z"),route=ROUTES[0];
const run={id:1,head_sha:head,event:"schedule",head_branch:"main",path:".github/workflows/"+route[1],status:"completed",conclusion:"success",run_attempt:1,created_at:"2026-11-20T03:40:00Z"};
const job={id:2,run_id:1,head_sha:head,name:route[2],run_attempt:1,status:"completed",conclusion:"success",completed_at:"2026-11-20T03:42:00Z",steps:[{name:route[3],status:"completed",conclusion:"success"}]};
test("actual current-main step required; workflow success alone is not execution",()=>{
 assert.equal(classifyRun(run,[job],route,head,now).currentMainExecution,true);
 for(const jobs of [[],[{...job,conclusion:"skipped"}],[{...job,steps:[]}],[{...job,run_id:3}]])
   assert.equal(classifyRun(run,jobs,route,head,now).status,"ACTUAL_STEP_NOT_PROVEN");
 assert.equal(classifyRun({...run,head_sha:"a".repeat(40)},[job],route,head,now).status,"OLD_MAIN");
 assert.equal(classifyRun(run,[job],route,head,now+3600000).status,"STALE_OR_INVALID_CLOCK");
});
test("missing, failed and queued work is not current execution",()=>{
 assert.equal(classifyRun(null,[],route,head,now).status,"NO_RECENT_RUN");
 assert.equal(classifyRun({...run,status:"queued"},[],route,head,now).status,"NOT_COMPLETED");
 assert.equal(classifyRun({...run,conclusion:"failure"},[],route,head,now).status,"NOT_FIRST_ATTEMPT_SUCCESS");
 assert.throws(()=>classifyRun({...run,event:"pull_request"},[job],route,head,now),/RUN_SCOPE/);
});
test("verify-only private expiry and apply/backstop collision are both visible",()=>{
 const p={P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P5_PRIMARY_FIDS_EXPIRY_APPROVAL:"APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:head,P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",P5_RETENTION_READONLY_MONITOR_ENABLED:"true",P6_PRIVATE_EPOCH_EXPIRY_MODE:"COMMISSION_VERIFY_ONLY"};
 const r={TRAVNR_APPROVED_TARGET_MAIN_SHA:head,TRAVNR_CRON_RELAY_SHA:relay,TRAVNR_RELAY_PRIMARY_ENABLED:"1"};
 assert.deepEqual(classifyModes(p,r,head),["PRIVATE_EXPIRY_NOT_ACTIVELY_COMMISSIONED_FOR_CURRENT_MANIFEST"]);
 assert.deepEqual(classifyModes({...p,P6_PRIVATE_EPOCH_EXPIRY_MODE:"APPLY_DUE_ONLY",P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256:manifest},r,head),["PRIMARY_BACKSTOP_PRIVATE_APPLY_MODE_COLLISION"]);
 assert.ok(classifyModes({}, {},head).includes("RELAY_PIN_DRIFT"));
});

test("new manual VERIFY cannot conceal prior scheduled APPLY failure or be counted as APPLY",()=>{
 const verify={...run,id:3,event:"workflow_dispatch",display_title:"Phase5 primary FIDS expiry (STOP default, no provider)"};
 const failed={...run,jobs:[],conclusion:"failure"};
 assert.equal(selectRouteRun([verify,failed],route),failed);
 assert.equal(classifyRun(verify,[job],route,head,now).status,"NOT_ELIGIBLE_EXECUTION_ROUTE");
 assert.equal(selectRouteRun([verify],route),undefined);
 const child={...verify,display_title:"P5 PRIMARY BACKSTOP CHILD"};
 assert.equal(selectRouteRun([verify,child],route),child);
});
