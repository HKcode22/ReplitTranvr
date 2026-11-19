"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {TARGETS,EXISTING}=require("./p5_phase5_rights_deferred_commission.cjs");
const src=fs.readFileSync("review-tools/p5_phase5_rights_deferred_commission.cjs","utf8");
test("commissioner writes only seven inert-stage secret values",()=>{
 assert.deepEqual(TARGETS,[
  "V39_P5_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","P6_INERT_STAGE_INPUT_JSON",
  "P6_INERT_STAGE_INPUT_SHA256","P6_INERT_CALENDAR_REVIEW_APPROVED",
  "P6_INERT_COST_REVIEW_APPROVED","P6_INERT_COST_ENVELOPE_SHA256"
 ]);
 assert.equal(TARGETS.includes("V39_PHASE5_SOURCE_RIGHTS_APPROVED"),false);
 assert.equal(TARGETS.includes("V39_PHASE6_PROCESS_ARMED"),false);
 assert.equal(TARGETS.includes("V39_PHASE6_OWNER_APPROVED"),false);
});
test("existing credentials are required but never recreated by target plan",()=>{
 assert.deepEqual(EXISTING,[
  "V39_PHASE6_PROCESS_ARMED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL",
  "P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"
 ]);
 for(const n of EXISTING)assert.equal(TARGETS.includes(n),false);
});
test("source-rights approval remains absent and explicitly checked",()=>{
 assert.match(src,/SOURCE_RIGHTS_SECRET_MUST_REMAIN_ABSENT/);
 assert.equal(src.includes('gh",["secret","set","V39_PHASE5_SOURCE_RIGHTS_APPROVED"'),false);
 assert.match(src,/sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true/);
});
test("calendar is dispatched and independently read before cost",()=>{
 const cal=src.indexOf('dispatch(ctx,wf,"calendar"');
 const cost=src.indexOf('dispatch(ctx,wf,"cost"');
 assert.ok(cal>0&&cost>cal);
 assert.match(src,/CALENDAR_ONLY_SCOPE/);
 assert.match(src,/COST_SCOPE/);
});
test("final Phase5 freeze stays disabled and no-go",()=>{
 assert.match(src,/PHASE5_PRODUCTION_FREEZE_COMPLETE_SOURCE_USE_DEFERRED_NO_GO/);
 assert.match(src,/authorizationEnabled:false/);
 assert.match(src,/phase6PaidGo:false/);
 assert.match(src,/phase5ScientificFreezeApproved:true/);
});
