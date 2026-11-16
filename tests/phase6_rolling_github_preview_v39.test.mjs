import test from "node:test";
import assert from "node:assert/strict";
import {runP6RollingPreview} from "../scripts/v39_phase6_rolling_github_preview_v39.mjs";
const sha="a".repeat(40),clock=Date.parse("2030-01-02T01:00:00.000Z");
const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:sha,P6_ROLLING_PREVIEW_APPROVED_MAIN:sha,
 P6_CONTROLLER_HEARTBEAT_CONFIRM:"PREVIEW_ROLLING_CONTROLLER_READONLY_NO_PROVIDER_NO_DISPATCH",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",GITHUB_TOKEN:"synthetic-test-token-only"};
test("actual API-shaped preview only issues bounded GET and never dispatches hypothetical routes",async()=>{
 let calls=0;
 const out=await runP6RollingPreview(env,{now:()=>clock,fetcher:async(url,opt)=>{
  calls++;assert.equal(opt.method,"GET");assert.equal(opt.redirect,"error");
  return {ok:true,json:async()=>url.endsWith("/git/ref/heads/main")?{object:{sha}}:{total_count:0,workflow_runs:[]}};
 }});
 assert.equal(out.hypotheticallyDue.length,8);assert.equal(out.githubReadRequests,23);
 assert.equal(calls,23);assert.equal(out.dispatchCount,0);assert.equal(out.phase6PaidGo,false);
 assert.equal(out.databaseWrites,0);assert.equal(out.providerCalls,0);
});
test("exact preview refuses schedule, release enable, credentials, drift or missing authorization",async()=>{
 for(const d of [{GITHUB_EVENT_NAME:"schedule"},{P6_ROLLING_CONTROLLER_ENABLED:"1"},{P6_ROLLING_PREVIEW_APPROVED_MAIN:""},
  {P6_PRIVATE_READER_DATABASE_URL:"private"},{V39_PHASE6_PROCESS_ARMED:"1"},{AERODATABOX_API_KEY:"private"},
  {GITHUB_RUN_ATTEMPT:"2"}])
  await assert.rejects(runP6RollingPreview({...env,...d},{now:()=>clock,fetcher:()=>{throw Error("no fetch");}}),/NOT_EXACT_READONLY_MAIN_SCOPE/);
 await assert.rejects(runP6RollingPreview(env,{now:()=>clock,fetcher:async()=>({ok:true,json:async()=>({object:{sha:"b".repeat(40)}})})}),/MAIN_CHANGED/);
});
