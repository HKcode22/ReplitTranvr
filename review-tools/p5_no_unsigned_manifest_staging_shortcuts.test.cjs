"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ROOT="review-tools";
const forbiddenNames=new Set(["p5_calendar_only_closeout.cjs","p5_prepare_inert_commissioning_source_use_deferred.cjs"]);
const SAFE_DEFERRED=new Set(["p5_phase5_rights_deferred_prepare.cjs","p5_phase5_rights_deferred_commission.cjs"]);
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):e.isFile()&&e.name.endsWith(".cjs")?[path.join(d,e.name)]:[])}

test("no unsigned-manifest staging shortcut exists",()=>{
 for(const p of files(ROOT))assert.ok(!forbiddenNames.has(path.basename(p)),p);
});

test("rights-deferred staging exists only behind a final frozen manifest contract",()=>{
 for(const p of files(ROOT)){
  if(path.basename(p)===path.basename(__filename)||p.endsWith(".test.cjs"))continue;
  const s=fs.readFileSync(p,"utf8");
  if(!s.includes("sourceUseDeferredToPhase6Activation:true")&&!s.includes("RESERVED_RIGHTS_ID="))continue;
  assert.ok(SAFE_DEFERRED.has(path.basename(p)),p+" is not an approved rights-deferred helper");
  if(path.basename(p)==="p5_phase5_rights_deferred_prepare.cjs"){
   assert.match(s,/scientificFreezeApproved:true/);
   assert.match(s,/phase5CommissioningApproved:true/);
   assert.match(s,/sourceRightsApproved:false/);
   assert.match(s,/finalPredecessorsApproved:false/);
   assert.match(s,/PR879_NOT_EXACT_CURRENT_MAIN/);
   assert.match(s,/UNREVIEWED_FINAL_MAIN_DELTA/);
   assert.match(s,/sourceRightsEvidenceSha256:null/);
  }else{
   assert.match(s,/FROZEN_MANIFEST/);
   assert.match(s,/sourceRightsApproved===false/);
   assert.match(s,/sourceUseDeferredToPhase6Activation===true/);
   assert.match(s,/SOURCE_RIGHTS_SECRET_MUST_REMAIN_ABSENT/);
   assert.match(s,/authorizationEnabled:false/);
   assert.match(s,/phase6PaidGo:false/);
  }
 }
});
