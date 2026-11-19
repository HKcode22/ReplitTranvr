"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ROOT="review-tools";
const forbiddenNames=new Set(["p5_calendar_only_closeout.cjs","p5_prepare_inert_commissioning_source_use_deferred.cjs"]);
const forbidden=[
 "sourceUseDeferredToPhase6Activation:true",
 "RESERVED_RIGHTS_ID=",
 "EXACT_INERT_INPUT_READY_SOURCE_USE_DEFERRED",
 "AUTH-20261119-P5INERT"
];
function files(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):e.isFile()&&e.name.endsWith(".cjs")?[path.join(d,e.name)]:[])}
test("no unsigned-manifest or reserved-future-rights staging shortcuts exist",()=>{
 const all=files(ROOT);
 for(const p of all){
  assert.ok(!forbiddenNames.has(path.basename(p)),p);
  if(path.basename(p)===path.basename(__filename))continue;
  const s=fs.readFileSync(p,"utf8");
  for(const needle of forbidden)assert.ok(!s.includes(needle),p+" contains "+needle);
 }
});
