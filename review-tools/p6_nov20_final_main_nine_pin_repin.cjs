#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr";
const {BASE,LEDGER,STOP_PATH,verifyEnableReceipt,verifyCurrentStop}=require("./p6_nov20_runtime_repin_evidence.cjs");
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
 const rows=cmd("git",["diff","--no-renames","--name-status",BASE,head]).split("\n").filter(Boolean);
 need(rows.length>0&&rows.every(s=>{const [kind,p,...extra]=s.split("\t");return ["A","M"].includes(kind)&&extra.length===0&&(p===LEDGER||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/.test(p));}),"POST_BRIDGE_NON_EVIDENCE_DRIFT");
 return rows;
}
function metadata(kind){
 const pages=JSON.parse(gh(["api","--paginate","--slurp","repos/"+REPO+"/actions/"+kind+"?per_page=100"]));
 need(Array.isArray(pages)&&pages.length>0&&pages.every(x=>Array.isArray(x[kind])&&x.total_count===pages[0].total_count),"METADATA_PAGES");
 const rows=pages.flatMap(x=>x[kind]);
 need(rows.length===pages[0].total_count&&new Set(rows.map(x=>x.name)).size===rows.length,"METADATA_ROWS");
 return rows;
}
function assertStopped(head,ledger){
 const raw=execFileSync("git",["show",head+":"+STOP_PATH],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000});
 const secrets=metadata("secrets");
 verifyCurrentStop(raw,ledger,secrets,metadata("variables"));
 return secrets;
}
function main(){
 const [mode,head,receiptPath]=process.argv.slice(2);
 need(["--verify-only","--apply"].includes(mode)&&C.test(head??"")&&receiptPath&&process.env.GITHUB_ACTIONS!=="true","ARGS");
 need(cmd("git",["rev-parse","HEAD"])===head&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_CHECKOUT");
 need(gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])===head,"REMOTE_MAIN_CHANGED");
 const changed=evidenceOnlyFinalMain(head);
 const ledger=JSON.parse(cmd("git",["show",head+":"+LEDGER]));
 const receiptRaw=fs.readFileSync(receiptPath,"utf8"),receipt=verifyEnableReceipt(receiptRaw,ledger);
 const secretRows=assertStopped(head,ledger);
 const present=new Map(secretRows.map(x=>[x.name,x.updated_at]));
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
   assertStopped(head,ledger);
   emit({name,status:"WRITE_ATTEMPTED_NO_REPLAY"});
   gh(["secret","set",name,"-R",REPO],{input:head,stdio:["pipe","pipe","ignore"]});
   const row=metadata("secrets").find(x=>x.name===name);
   need(row&&typeof row.updated_at==="string"&&Number.isFinite(Date.parse(row.updated_at)),"SECRET_METADATA_READBACK");
   emit({name,status:"METADATA_READBACK",updatedAt:row.updated_at});
  }
  assertStopped(head,ledger);
  emit({status:"P6_FINAL_NINE_PIN_REPIN_METADATA_COMPLETE",head,pinCount:PINS.length,
   rightsChanged:false,armingChanged:false,stopChanged:false,budgetChanged:false,providerCalls:0,phase6PaidGo:false});
 }finally{fs.closeSync(fd)}
 console.log(JSON.stringify({status:"P6_FINAL_NINE_PIN_REPIN_METADATA_COMPLETE",head,pinCount:PINS.length,providerCalls:0,phase6PaidGo:false}));
}
module.exports={PINS,evidenceOnlyFinalMain,verifyEnableReceipt,BASE,LEDGER};
if(require.main===module)try{main()}catch(e){const m=String(e?.message??"");console.error(/^HOLD_P6_FINAL_NINE_PIN_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_FINAL_NINE_PIN_REDACTED_NO_REPLAY");process.exitCode=2}
