#!/usr/bin/env node
"use strict";
// Reconstruct already-commissioned historical *archive* bytes only.
// No release admission, old transition package, signing, provider or DB access.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),cp=require("node:child_process");
const STAGE="795ace55984b44a3d0bffa886d33a5ec11d31927",SOURCE="774d1d0907076b25487ecb3bce28a35a3ad319af";
const DECISION="data-collection/phase5/evidence/2026-11-22_monday_exact_machine_bound_date_decision.json";
const EXPECTED="data-collection/phase5/evidence/phase6-monday-stage-input-795ace55.json";
const MAIN="c8e065d665ccacb6d2575070e94c5500b7583044";
const H=["8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc","cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9","a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e","9f181bbc70a378f41b85ecd70cd8bc05d8bf4ef76398b0225400c4c21abccebe"];
const run=(cmd,args,opts={})=>cp.execFileSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:8*1024*1024,...opts}).trim();
const hold=m=>{throw Error("HOLD_P6_ARCHIVE_"+m)};
const need=(v,m)=>{if(!v)hold(m)};
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
let scratch;
try {
 const root=run("git",["rev-parse","--show-toplevel"]);
 need(root===fs.realpathSync(process.cwd())&&run("git",["rev-parse","HEAD"])===STAGE,"EXACT_ARCHIVE_CHECKOUT");
 need(!run("git",["status","--porcelain","--untracked-files=no"]),"TRACKED_DIRTY");
 const srcPath="review-tools/p6_nov23_prospective_revision_owner_v39.ts";
 need(run("git",["hash-object",srcPath])===SOURCE,"SOURCE_BLOB");
 need(run("git",["rev-parse",MAIN])===MAIN,"COMMITTED_EVIDENCE_PRESENT");
 const original=fs.readFileSync(srcPath,"utf8");
 const boundary=original.indexOf("\n const writer=P5_TWO_STAGE_ROLES.find(");
 need(boundary>0&&original.indexOf("\n const writer=P5_TWO_STAGE_ROLES.find(",boundary+1)<0,"PURE_EXPORT_BOUNDARY");
 // Retain the original static geometry and byte compiler, never the
 // prospective admission or mutation entrypoints. This is a different task:
 // verification/reconstruction of past bytes, not new release admission.
 let src=original.slice(0,boundary);
 src=src.split("\n").filter(l=>!l.startsWith('import {Pool}')&&!l.startsWith('import {compileP6ProspectiveDisabledStageRevisionV39,commitP6ProspectiveDisabledStageRevisionOnceV39')&&!l.startsWith('import {P5_TWO_STAGE_ROLES}')).join("\n");
 src+='\n return {input,stageSha,costSha,manifestRaw,config,external,timing,result};\n}\n';
 src+=`
 const historical=exactCheckout();
 if(historical!==${JSON.stringify(STAGE)})hold("ARCHIVAL_CHECKOUT");
 const old=recoverP6Nov22StageInputFromCommittedEvidence().input;
 const b=baseReview(historical,old);
 const decisionPath=${JSON.stringify(DECISION)};
 const decisionSha=sha(readFileSync(decisionPath));
 approvedDecision(decisionPath,decisionSha,{reviewDigest:b.reviewDigest,dateReceiptSha256:b.scope.dateReceiptSha256,oldStageSha256:P6_NOV22_STAGE_SHA,sourceInventorySha256:b.scope.sourceInventorySha256},historical);
 const v=prepared(old,historical,b,decisionSha);
 const expected=execFileSync("git",["show",${JSON.stringify(MAIN+":"+EXPECTED)}],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000});
 const hashes=${JSON.stringify(H)};
 if(v.result.files.length!==32||v.result.summary.sourceQueries!==6144||v.result.summary.totalReservedUnits!==36740||v.result.summary.peakDailyUnits!==1280||!Buffer.from(JSON.stringify(v.input)).equals(expected)||v.stageSha!==hashes[0]||v.costSha!==hashes[1]||sha(v.manifestRaw)!==hashes[2]||hash(v.config)!==hashes[3])hold("ARCHIVE_EXACT_BYTES_DRIFT");
 verifyP6ActualCommittedPlanParity(v.result,p=>execFileSync("git",["show",historical+":"+p],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000}),p=>readFileSync(p));
 const receipt={status:"P6_HISTORICAL_STAGE_ARCHIVE_EXACT_BYTES_VERIFIED",archiveOnly:true,stageSha256:v.stageSha,costSha256:v.costSha,manifestSha256:sha(v.manifestRaw),configSha256:hash(v.config),dayPlans:31,sourceQueries:v.result.summary.sourceQueries,reservedUnits:v.result.summary.totalReservedUnits,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 const out=process.env.P6_ARCHIVE_ONLY_OUT;
 if(out){
  const home=realpathSync(process.env.HOME!);
  if(dirname(resolve(out))!==home||!resolve(out).startsWith(home+"/.travnr-phase6-stage-archive-"))hold("ARCHIVE_OUTPUT_LOCATION");
  mkdirSync(out,{mode:0o700});
  for(const [n,x] of Object.entries({"new-stage-input.json":JSON.stringify(v.input),"new-manifest.json":v.manifestRaw,"new-config.json":JSON.stringify(v.config),"new-external.json":JSON.stringify(v.external),"new-timing.json":JSON.stringify(v.timing),"ARCHIVE_ONLY_RECEIPT.json":JSON.stringify(receipt)}))writeFileSync(join(out,n),x,{flag:"wx",mode:0o600});
 }
 console.log(JSON.stringify(receipt));
 `;
 need(!/commitP6ProspectiveDisabledStageRevisionOnceV39|compileP6ProspectiveDisabledStageRevisionV39|new Pool\(|\.query\(/.test(src),"NO_LIVE_ADMISSION_OR_MUTATION");
 scratch=path.join(root,"review-tools",".p6_historical_stage_archive_"+process.pid+".ts");
 fs.writeFileSync(scratch,src,{flag:"wx",mode:0o600});
 const env={PATH:process.env.PATH,HOME:process.env.HOME,LANG:"C.UTF-8",TZ:"UTC",P6_ARCHIVE_ONLY_OUT:process.env.P6_ARCHIVE_ONLY_OUT||""};
 cp.execFileSync(path.join(root,"node_modules",".bin","tsx"),[scratch],{stdio:"inherit",env,timeout:120000});
} catch(e){console.error(/^HOLD_P6_ARCHIVE_[A-Z_]+$/.test(e.message||"")?e.message:"HOLD_P6_ARCHIVE_RECONSTRUCTION_FAILED");process.exitCode=2}
finally{if(scratch)fs.rmSync(scratch,{force:true})}
