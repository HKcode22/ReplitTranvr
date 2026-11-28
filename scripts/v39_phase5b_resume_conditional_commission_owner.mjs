#!/usr/bin/env node
/** S002: exact one-time continuation of successful inactive 46144830945.
 * No repeated preview/staging, new token, paid route, source publication,
 * migration or database action. Only the reviewed nonsecret repo variable.
 * After unknown activation/dispatch, reconcile current state; never blindly replay.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {homedir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
const R="HKcode22/ReplitTranvr",M="a02e3d6eddc378871f030848235746de160b71e5",L="2d96b22345908aa4334335aa899aec71b2fec2cb";
const KEY="P6_PHASE5B_CONDITIONAL_DERIVATION_APPROVAL_BASE64",ENV="phase6-protected-runtime",WF="phase6-nonpaid-source-day-prepare-publish.yml";
const REVIEW="243fcee2426649390ac7d712b3707bde6f15b0533c3241ee1949f77183a15ab3",RECIPE="eb444e1ec929c67819b110b482e324c2e6067f05fb75b6139ad2d25fe3277710",CANDIDATE="75bee0903ee8a6d275b95e4d0acd3b782b2a7f2363db4f1cece82e461469f2f7";
const PREVIEW=46140377128,STAGED=46144830945,WF_ID=418926752;
const sha=b=>createHash("sha256").update(b).digest("hex");
const letters=s=>[...s].map(c=>String.fromCharCode(97+parseInt(c,16))).join("");
const hex=s=>{assert.match(s,/^[a-p]{64}$/);return [...s].map(c=>(c.charCodeAt(0)-97).toString(16)).join("");};
const need=(ok,code)=>{if(!ok)throw Error("HOLD_PHASE5B_RESUME_"+code);};
export function exactReceipt(log,status){
 const marker='{"status":"'+status+'"';
 const rows=log.split(/\r?\n/).filter(s=>s.includes(marker)).map(s=>JSON.parse(s.slice(s.indexOf(marker))));
 need(rows.length===1,"RECEIPT_CARDINALITY");
 const x=rows[0];
 need(x.phase6PaidGo===false&&x.actualConditionalPreCommitVerified===false&&x.prospective?.runDayIndex===5&&x.prospective.genesisAbsent===true&&x.prospective.preparedQueryCount===0,"RECEIPT_SCOPE");
 for(const k of ["providerCalls","databaseWrites","githubWrites","signaturesIssued"])need(x[k]===0,"RECEIPT_SIDE_EFFECT");
 return x;
}
export function verifyDerivedReceipt(log,active,candidate,base){
 const status=active?"P6_ACTUAL_ACTIVE_DERIVED_CONDITIONAL_POLICY_READBACK_NO_PROVIDER":"P6_ACTUAL_INACTIVE_CONDITIONAL_DERIVATION_READBACK_NO_PROVIDER";
 const x=exactReceipt(log,status);
 need(x.actualConditionalDerivationVerified===true&&x.actualConditionalPolicyInstalledVerified===active&&x.candidatePublicCommitmentLetters===letters(candidate)&&x.basePolicyPublicCommitmentLetters===letters(base),"DERIVED_RECEIPT_DRIFT");
}
export function approvalFromPreview(saved,log,now){
 const bytes=Buffer.from(saved.reviewBase64,"base64"),d=JSON.parse(bytes);
 need(bytes.toString("base64")===saved.reviewBase64&&sha(bytes)===REVIEW&&saved.reviewSha256===REVIEW,"REVIEW_BYTES");
 need(d.schema==="v39.phase5b.prospective-conditional-commissioning-commitment-review.v1"&&d.firstEligibleRunDayIndex===5&&d.ownerDelegatedTechnicalScopeReviewed===true&&d.standaloneNoT24ProtocolSha256===null&&/^[a-f0-9]{64}$/.test(d.protocolSha256),"REVIEW_SCOPE");
 need(Number.isFinite(now)&&now<Date.parse("2026-11-29T02:45:00Z")&&now<Date.parse(d.effectiveUtc),"WINDOW_ELAPSED");
 const p=exactReceipt(log,"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY"),v=p.derivationPreview;
 need(p.actualConditionalPolicyInstalledVerified===false&&v?.status==="CONDITIONAL_DERIVATION_RECIPE_PREVIEW_NOT_ACTIVE","PREVIEW_SCOPE");
 const x=v.publicCommitmentLetters;
 const recipe={schema:"v39.phase5b.conditional-derivation-recipe.v1",reviewSha256:hex(x.review),basePolicyCommitmentSha256:hex(x.base),candidateCommitmentSha256:hex(x.candidate),commitments:Object.fromEntries(["daily","signing","transport"].map(k=>[k,{predecessor:hex(x.commitments[k].predecessor),successor:hex(x.commitments[k].successor)}]))};
 need(recipe.reviewSha256===REVIEW&&recipe.basePolicyCommitmentSha256===d.basePolicyCommitmentSha256&&recipe.candidateCommitmentSha256===CANDIDATE&&sha(JSON.stringify(recipe))===RECIPE&&hex(x.recipe)===RECIPE,"RECIPE_DRIFT");
 const approval={schema:"v39.phase5b.conditional-derivation-approval.v1",reviewBase64:saved.reviewBase64,recipe,recipeSha256:RECIPE};
 return {approvalBase64:Buffer.from(JSON.stringify(approval)).toString("base64"),reviewBase64:saved.reviewBase64,protocolSha256:d.protocolSha256,base:recipe.basePolicyCommitmentSha256,effectiveUtc:d.effectiveUtc};
}
let stage="ADMISSION",wrote=false,runId=null;
function command(bin,args,timeout=45000){
 const x=spawnSync(bin,args,{encoding:"utf8",timeout,maxBuffer:8*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:"1",GH_NO_UPDATE_NOTIFIER:"1"}});
 if(x.status!==0||x.error)throw Error("HOLD_PHASE5B_RESUME_COMMAND_"+bin.toUpperCase());
 return x.stdout;
}
const gh=(...args)=>command("gh",args);
const api=path=>JSON.parse(gh("api",path));
const main=()=>api("repos/"+R+"/git/ref/heads/main").object.sha;
function guard(effective){
 need(gh("api","user","--jq",".login").trim()==="HKcode22"&&main()===M,"OWNER_OR_MAIN_DRIFT");
 need(gh("variable","get","P6_PHASE5B_RUNTIME_EXECUTABLE_SHA","-R",R).trim()===M,"RUNTIME_PIN_DRIFT");
 need(Date.now()<Date.parse("2026-11-29T02:45:00Z")&&(!effective||Date.now()<Date.parse(effective)),"WINDOW_ELAPSED");
}
function pause(path){
 const b=readFileSync(path);
 need(createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")==="c47c4d688d746f3e7c8f3119d3eb9068c3840c30","PAUSE_HELPER_BYTES");
 const v=JSON.parse(command("bash",[path,"VERIFY_PAUSED_ADMISSIONS_AND_FUTURE_PUBLICATION",M,L],90000));
 need(v.status==="PAUSED_ADMISSIONS_AND_FUTURE_SOURCE_PUBLICATION_VERIFIED_READONLY"&&v.targetMainSha===M&&v.relayMainSha===L&&v.existingProtectedOverridesVerified===true&&v.retentionAndRuntimePinsPreserved===true&&v.drainState==="QUIESCENT"&&Array.isArray(v.activeAfter)&&v.activeAfter.length===0&&v.githubVariableWritesAttempted===0&&v.githubVariableWritesConfirmed===0&&v.phase6PaidGo===false&&v.automaticResume===false,"PAUSE_NOT_VERIFIED");
 const age=Date.now()-Date.parse(v.observedAtUtc);need(age>=0&&age<=60000,"PAUSE_STALE");
}
function vars(endpoint){
 const pages=JSON.parse(gh("api","--paginate","--slurp",endpoint+"?per_page=100"));
 need(Array.isArray(pages)&&pages.length>0&&pages.every(p=>Array.isArray(p.variables)&&Number.isSafeInteger(p.total_count)&&p.total_count>=0&&p.total_count===pages[0].total_count),"VARIABLE_METADATA");
 const v=pages.flatMap(p=>p.variables);
 need(v.length===pages[0].total_count&&v.every(x=>typeof x.name==="string"&&typeof x.value==="string")&&new Set(v.map(x=>x.name)).size===v.length,"VARIABLE_METADATA");
 return new Map(v.map(x=>[x.name,x.value]));
}
function selector(a){
 const r=vars("repos/"+R+"/actions/variables"),e=vars("repos/"+R+"/environments/"+ENV+"/variables");
 need(!e.has(KEY)&&[r,e].every(v=>!v.get("P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256")),"LEGACY_OR_SHADOW_SELECTOR");
 const val=r.get(KEY)||"";need(!val||val===a.approvalBase64,"OTHER_ACTIVE_RECIPE");
 return val;
}
function runMeta(id){
 const v=api("repos/"+R+"/actions/runs/"+id);
 need(v.id===id&&v.head_sha===M&&v.head_branch==="main"&&v.event==="workflow_dispatch"&&v.actor?.login==="HKcode22"&&v.run_attempt===1&&v.status==="completed"&&v.conclusion==="success"&&v.path===".github/workflows/"+WF,"RUN_METADATA");
 return gh("run","view",String(id),"-R",R,"--log");
}
// Old gh CLI versions can report successful workflow_dispatch without a
// run URL. Snapshot only the exact workflow, owner, branch and SHA; refuse
// incomplete metadata or more than one new run rather than guessing.
export function exactDispatchIds(data,notBefore){
 need(data&&Number.isSafeInteger(data.total_count)&&data.total_count>=0&&data.total_count<=100&&Array.isArray(data.workflow_runs)&&data.workflow_runs.length===data.total_count,"DISPATCH_LIST_INCOMPLETE");
 const ids=[];
 for(const x of data.workflow_runs){
  need(Number.isSafeInteger(x.id)&&x.id>0&&!ids.includes(x.id)&&x.workflow_id===WF_ID&&x.head_sha===M&&x.head_branch==="main"&&x.event==="workflow_dispatch"&&x.actor?.login==="HKcode22"&&x.path===".github/workflows/"+WF&&Number.isFinite(Date.parse(x.created_at))&&Date.parse(x.created_at)>=notBefore,"DISPATCH_LIST_SCOPE");
  ids.push(x.id);
 }
 return ids;
}
export function newDispatchId(before,after,output){
 const fresh=after.filter(id=>!before.includes(id));
 const printed=[...new Set([...output.matchAll(/github\.com\/HKcode22\/ReplitTranvr\/actions\/runs\/([0-9]+)/g)].map(x=>Number(x[1])))];
 need(fresh.length<=1&&printed.length<=1,"DISPATCH_ID_AMBIGUOUS");
 if(fresh.length===0)return null;
 need(printed.length===0||printed[0]===fresh[0],"DISPATCH_URL_MISMATCH");
 return fresh[0];
}
function dispatchSnapshot(since){
 const path="repos/"+R+"/actions/workflows/"+WF_ID+"/runs?branch=main&event=workflow_dispatch&actor=HKcode22&head_sha="+M+"&created="+encodeURIComponent(">="+new Date(since).toISOString())+"&per_page=100";
 return exactDispatchIds(api(path),since);
}
function cli(){
 const reconcile=process.argv[2]==="VERIFY_EXISTING_ACTIVE_DAY5_RECIPE";
 need((process.argv.length===4&&process.argv[2]==="RESUME_EXACT_INACTIVE_DAY5_RECIPE")||(reconcile&&process.argv.length===5&&/^[0-9]+$/.test(process.argv[4])),"EXACT_MODE");
 const pausePath=resolve(process.argv[3]),reviewPath=join(homedir(),".travnr-phase5b-day5-9426eda5f749e43b1e798b1c308f5c428f696882.json");
 guard();
 stage="VERIFY_EXISTING_PREVIEW_AND_INACTIVE";
 const a=approvalFromPreview(JSON.parse(readFileSync(reviewPath,"utf8")),runMeta(PREVIEW),Date.now());
 verifyDerivedReceipt(runMeta(STAGED),false,CANDIDATE,a.base);
 console.log("EXISTING_INACTIVE_RECEIPT_VERIFIED_NO_REDISPATCH");
 stage="FRESH_PAUSED_SCOPE";selector(a);guard(a.effectiveUtc);pause(pausePath);guard(a.effectiveUtc);
 stage="EXACT_NONSECRET_SELECTOR";
 const current=selector(a);
 if(reconcile){
  need(current===a.approvalBase64,"NO_EXACT_ACTIVE_SELECTOR");
  stage="RECONCILE_EXISTING_ACTIVE_READBACK";
  runId=Number(process.argv[4]);need(Number.isSafeInteger(runId)&&runId>0&&runId!==PREVIEW&&runId!==STAGED,"ACTIVE_RUN_ID");
  verifyDerivedReceipt(runMeta(runId),true,CANDIDATE,a.base);
  pause(pausePath);need(selector(a)===a.approvalBase64,"SELECTOR_DRIFT");
  console.log("TOKENLESS_CONDITIONAL_POLICY_COMMISSIONED");
  console.log("PAID_COLLECTION_REMAINS_PAUSED_NO_AUTOMATIC_RESUME");return;
 }
 need(!current,"ALREADY_ACTIVE_SELECTOR_NO_AUTOMATIC_REDISPATCH");
 // Bound listing before any mutation. Reuse one interval for the full
 // discovery; UTC second precision matches GitHub created_at.
 const since=Math.floor((Date.now()-300000)/1000)*1000,before=dispatchSnapshot(since);
 guard(a.effectiveUtc);
 if(!current){
  // Only after actual inactive readback and fresh read-only pause; no broad
  // secret/write capability passed to the workflow. No second variable.
  wrote=true;
  gh("variable","set",KEY,"-R",R,"--body",a.approvalBase64);
  need(selector(a)===a.approvalBase64,"SELECTOR_READBACK");
  console.log("EXACT_RECIPE_VARIABLE_SET_AND_READ_BACK");
 }else {console.log("EXACT_RECIPE_ALREADY_SET_RECONCILE_EXISTING_ACTIVE_RUN");need(false,"ALREADY_ACTIVE_SELECTOR_NO_AUTOMATIC_REDISPATCH");}
 guard(a.effectiveUtc);
 stage="ACTIVE_PROTECTED_READBACK";
 // If the selector already exists, inspect actual active readback runs
 // before any new request. This command is readback-only, never paid.
 const out=gh("workflow","run",WF,"-R",R,"--ref","main","-f","run_day_index=5","-f","confirm=VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER","-f","conditional_action=VERIFY_ACTIVE_CONDITIONAL_SUCCESSOR","-f","conditional_review_sha256="+REVIEW,"-f","conditional_review_base64="+a.reviewBase64,"-f","conditional_candidate_commitment_sha256="+CANDIDATE,"-f","conditional_protocol_sha256="+a.protocolSha256);
 for(let i=0;i<12;i++){
  const id=newDispatchId(before,dispatchSnapshot(since),out);
  if(id!==null){runId=id;break;}
  command("sleep",["2"],5000);
 }
 need(runId!==null,"DISPATCH_ID_UNKNOWN");console.log("ACTIVE_READBACK_RUN="+runId);
 command("gh",["run","watch",String(runId),"-R",R,"--exit-status"],240000);
 verifyDerivedReceipt(runMeta(runId),true,CANDIDATE,a.base);
 stage="FINAL_PAUSE";pause(pausePath);need(selector(a)===a.approvalBase64,"SELECTOR_DRIFT");
 console.log("TOKENLESS_CONDITIONAL_POLICY_COMMISSIONED");
 console.log("PAID_COLLECTION_REMAINS_PAUSED_NO_AUTOMATIC_RESUME");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{cli()}catch(e){console.error("HOLD_PHASE5B_RESUME stage="+stage+" selectorWriteAttempted="+wrote+" activeRun="+(runId??"UNKNOWN")+" reason="+(/^HOLD_PHASE5B_RESUME_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"RECEIPT_OR_METADATA_INVALID")+"; inspect actual state; no automatic replay");process.exitCode=2;}
}
