#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr";
const BASE="7d178225aeea4d8a6b4145546d2c1b12dfb72b42";
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const PINS=Object.freeze([
 "V39_P5_APPROVED_CODE_SHA",
 "P6_NONPAID_SOURCE_APPROVED_MAIN_SHA",
 "P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA",
 "V39_P5_LATER_PRE_APPROVED_CODE_SHA",
 "V39_P5_POST_APPROVED_CODE_SHA",
 "V39_P5_QUEUE_APPROVED_CODE_SHA",
 "V39_P5_T24_APPROVED_CODE_SHA",
 "V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA",
 "P5_CD_GH_PRE_APPROVED_CODE_SHA"
]);
const C=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/;
const hold=s=>{throw Error("HOLD_P6_FINAL_NINE_PIN_"+s)},need=(x,s)=>{if(!x)hold(s)};
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:8*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const gh=(a,o={})=>cmd("gh",a,o);
function evidenceOnlyFinalMain(head){
 need(C.test(head)&&head!==BASE,"FINAL_MAIN");
 try{cmd("git",["merge-base","--is-ancestor",BASE,head]);}catch{hold("NOT_DESCENDANT_OF_FINAL_EXECUTABLE_MAIN")}
 const rows=cmd("git",["diff","--no-renames","--name-only",BASE,head]).split("\n").filter(Boolean);
 need(rows.length>0&&rows.every(p=>p===LEDGER||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/.test(p)),"POST_BRIDGE_NON_EVIDENCE_DRIFT");
 return rows;
}
function verifyEnableReceipt(raw,ledger){
 const r=JSON.parse(raw);
 need(r?.status==="EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED"&&
  /^AUTH-\d{8}-[A-Z0-9]+$/.test(r.authorizationId??"")&&H.test(r.authArtifactSha256??"")&&
  r.databaseAuthorizationEnabled===true&&r.providerCalls===0&&r.githubFlagsChanged===0&&
  r.legacyAlertStarted===false&&r.phase6PaidGoGrantedByThisTransition===false,"SOURCE_ENABLE_RECEIPT");
 need(ledger?.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(ledger.approvals)&&
  ledger.approvals.some(x=>x.authorizationId===r.authorizationId&&x.artifactSha256===r.authArtifactSha256),"AUTH_NOT_IN_FINAL_LEDGER");
 return r;
}
function main(){
 const [mode,head,receiptPath]=process.argv.slice(2);
 need(["--verify-only","--apply"].includes(mode)&&C.test(head??"")&&receiptPath&&process.env.GITHUB_ACTIONS!=="true","ARGS");
 need(cmd("git",["rev-parse","HEAD"])===head&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_CHECKOUT");
 need(gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])===head,"REMOTE_MAIN_CHANGED");
 const changed=evidenceOnlyFinalMain(head);
 const ledger=JSON.parse(cmd("git",["show",head+":"+LEDGER]));
 const receiptRaw=fs.readFileSync(receiptPath,"utf8"),receipt=verifyEnableReceipt(receiptRaw,ledger);
 const secretRows=JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
 const present=new Map(secretRows.map(x=>[x.name,x.updatedAt]));
 need(PINS.every(n=>present.has(n)),"REQUIRED_PIN_SECRET_NAME_MISSING");
 if(mode==="--verify-only"){
  console.log(JSON.stringify({status:"P6_FINAL_NINE_PIN_REPIN_READY_NO_MUTATION",head,changedEvidencePaths:changed.length,
   authorizationId:receipt.authorizationId,pinNames:PINS,githubMutations:0,providerCalls:0,phase6PaidGo:false}));
  return;
 }
 const out=process.env.P6_FINAL_NINE_PIN_JOURNAL;
 need(out&&!fs.existsSync(out),"FRESH_PRIVATE_JOURNAL_REQUIRED");
 const fd=fs.openSync(out,"wx",0o600),emit=x=>{fs.writeSync(fd,JSON.stringify(x)+"\n");fs.fsyncSync(fd)};
 try{
  emit({status:"P6_FINAL_NINE_PIN_REPIN_STARTED",head,authorizationId:receipt.authorizationId,pinNames:PINS,phase6PaidGo:false});
  for(const name of PINS){
   need(gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])===head,"MAIN_CHANGED_DURING_REPIN");
   emit({name,status:"WRITE_ATTEMPTED_NO_REPLAY"});
   gh(["secret","set",name,"-R",REPO],{input:head,stdio:["pipe","pipe","ignore"]});
   const row=JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"])).find(x=>x.name===name);
   need(row&&typeof row.updatedAt==="string"&&Number.isFinite(Date.parse(row.updatedAt)),"SECRET_METADATA_READBACK");
   emit({name,status:"METADATA_READBACK",updatedAt:row.updatedAt});
  }
  emit({status:"P6_FINAL_NINE_PIN_REPIN_METADATA_COMPLETE",head,pinCount:PINS.length,
   rightsChanged:false,armingChanged:false,stopChanged:false,budgetChanged:false,providerCalls:0,phase6PaidGo:false});
 }finally{fs.closeSync(fd)}
 console.log(JSON.stringify({status:"P6_FINAL_NINE_PIN_REPIN_METADATA_COMPLETE",head,pinCount:PINS.length,providerCalls:0,phase6PaidGo:false}));
}
module.exports={PINS,evidenceOnlyFinalMain,verifyEnableReceipt,BASE,LEDGER};
if(require.main===module)try{main()}catch(e){const m=String(e?.message??"");console.error(/^HOLD_P6_FINAL_NINE_PIN_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_FINAL_NINE_PIN_REDACTED_NO_REPLAY");process.exitCode=2}
