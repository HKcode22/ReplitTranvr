#!/usr/bin/env node
"use strict";
// Owner-local deployment of ONLY the existing final approved bundle's static
// values. No approval secret, signer key, DB login, mode switch or dispatch.
// GitHub secret values cannot be read back; verify name/timestamp metadata only.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const ALLOWED=["V39_P5_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_CONFIG_HASH","V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256","V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256","P6_NATIVE_POST_POLICY_SHA256"];
const POLICY=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
const HASHED=["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P5_STATIC_"+s)},need=(x,s)=>{if(!x)hold(s)};
function planWrites(names,metadata,approvedReplacements){
  const fail=s=>{throw Error("HOLD_P5_STATIC_"+s)};
  if(!Array.isArray(names)||new Set(names).size!==names.length||!Array.isArray(metadata)||!Array.isArray(approvedReplacements))fail("INVALID_PLAN_INPUT");
  const m=new Map();
  for(const x of metadata){
    if(typeof x.name!=="string"||typeof x.updatedAt!=="string"||!Number.isFinite(Date.parse(x.updatedAt))||m.has(x.name))fail("INVALID_SECRET_METADATA");
    m.set(x.name,x.updatedAt);
  }
  const a=new Map();
  for(const x of approvedReplacements){
    if(!names.includes(x.name)||typeof x.updatedAt!=="string"||a.has(x.name)||m.get(x.name)!==x.updatedAt)fail("REPLACEMENT_METADATA_DRIFT");
    a.set(x.name,x.updatedAt);
  }
  return [...names].sort().map(name=>{
    const old=m.get(name)??null;
    if(old!==null&&a.get(name)!==old)fail("EXISTING_SECRET_NEEDS_EXACT_REPLACEMENT_REVIEW");
    return {name,oldUpdatedAt:old,operation:old===null?"CREATE":"REPLACE_REVIEWED"};
  });
}
function readPrivate(dir,name,max){
 const f=path.join(dir,name),s=fs.lstatSync(f);
 need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");
 const raw=fs.readFileSync(f),x=JSON.parse(raw.toString("utf8"));
 need(Buffer.from(JSON.stringify(x)).equals(raw),"NONCANONICAL_INPUT");
 return {raw,x,sha256:sha(raw)};
}
function validate(r,v,stage){
 need(r?.schema==="v39.phase5.exact-final-commissioning-bundle.v1"&&r.status==="EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH"&&C.test(r.main??"")&&r.phase6PaidGo===false&&r.approvalFlagsPrepared===0&&r.githubMutations===0&&r.providerCalls===0&&r.verifiedPlanCount===31&&r.plannedQueries===6144&&r.reservedRestUnits===37388,"EXACT_APPROVED_BUNDLE_RECEIPT");
 need(v&&typeof v==="object"&&Object.keys(v).length===ALLOWED.length&&r.staticSecretsPrepared===ALLOWED.length&&ALLOWED.every(k=>Object.hasOwn(v,k)&&typeof v[k]==="string"&&Buffer.byteLength(v[k])>0&&Buffer.byteLength(v[k])<=48000),"EXACT_STATIC_NAME_ALLOWLIST");
 need([r.manifestSha256,r.configSha256,r.calendarSha256,r.stageSha256,r.costEnvelopeSha256,r.approvedPrivatePolicyReviewSha256,r.authArtifactSha256,r.policyBundleSha256].every(x=>H.test(x??"")),"REVIEW_DIGESTS");
 for(const k of ["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA"])need(v[k]===r.main,"CODE_PIN");
 need(v.V39_P5_MANIFEST_SHA256===r.manifestSha256&&v.V39_P5_CONFIG_HASH===r.configSha256&&v.V39_P5_CALENDAR_HASH===r.calendarSha256&&v.P6_INERT_STAGE_INPUT_JSON===stage&&sha(stage)===r.stageSha256&&v.P6_INERT_STAGE_INPUT_SHA256===r.stageSha256&&v.P6_INERT_COST_ENVELOPE_SHA256===r.costEnvelopeSha256&&v.V39_P5_POST_CATEGORY_BUDGET_SHA256===r.costEnvelopeSha256,"STAGE_AND_COST_PINS");
 const st=JSON.parse(stage);need(JSON.stringify(st)===stage&&st.codeSha40===r.main&&st.manifestSha256===r.manifestSha256&&st.phase6AuthorizationId===r.authorizationId,"STAGE_AUTH_PIN");
 const objects={};
 need(Array.isArray(r.policyDigests)&&r.policyDigests.length===POLICY.length&&new Set(r.policyDigests.map(x=>x.name)).size===POLICY.length,"POLICY_SET");
 for(const n of POLICY){
  const raw=Buffer.from(v[n],"base64"),x=JSON.parse(raw.toString("utf8"));
  need(raw.toString("base64")===v[n]&&Buffer.from(JSON.stringify(x)).equals(raw)&&r.policyDigests.find(d=>d.name===n)?.sha256===sha(raw),"EXACT_POLICY_BYTES");
  objects[n]=x;
 }
 for(const n of HASHED)need(v[n+"_SHA256"]===sha(Buffer.from(v[n+"_BASE64"],"base64")),"POLICY_HASH");
 const d=objects.P6_NONPAID_DAILY_POLICY_BASE64,p=objects.P6_NATIVE_POST_POLICY_BASE64;
 need([v.V39_P5_FRAME_HASH,v.V39_P5_RELEASE_SHA256,v.V39_P5_RIGHTS_SHA256,v.V39_P5_PROVIDER_CONTRACT_SHA256,v.V39_P5_POST_PRICE_SHA256].every(x=>H.test(x??""))&&d.frameSha256===v.V39_P5_FRAME_HASH&&d.releaseSha256===v.V39_P5_RELEASE_SHA256&&d.rightsSha256===v.V39_P5_RIGHTS_SHA256&&d.providerContractSha256===v.V39_P5_PROVIDER_CONTRACT_SHA256&&p.reviewedProviderContractSha256===v.V39_P5_POST_PROVIDER_CONTRACT_SHA256&&p.reviewedProviderPriceSha256===v.V39_P5_POST_PRICE_SHA256,"EXACT_RELEASE_RIGHTS_PROVIDER_PINS");
 return ALLOWED;
}
const gh=(a,opts={})=>execFileSync("gh",a,{encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:["ignore","pipe","ignore"],env:{...process.env,GH_PROMPT_DISABLED:"1"},...opts}).trim();
const main=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
const metadata=()=>JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
function run(){
 const [mode,inputDir,receiptSha,valuesSha,reviewSha]=process.argv.slice(2);
 need(process.argv.length===7&&["PLAN_EXACT_STATIC_INSTALL","INSTALL_EXACT_STATIC_NO_GO"].includes(mode)&&[receiptSha,valuesSha,reviewSha].every(x=>H.test(x??""))&&process.env.GITHUB_ACTIONS!=="true","EXPLICIT_PRIVATE_OWNER_REVIEW");
 const d=fs.realpathSync(inputDir),s=fs.lstatSync(inputDir);
 need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const r=readPrivate(d,"bundle-receipt.json",200000),v=readPrivate(d,"static-secret-values-PRIVATE.json",400000),st=readPrivate(d,"exact-approved-stage-input.json",48000),review=readPrivate(d,"static-install-review.json",100000);
 need(r.sha256===receiptSha&&v.sha256===valuesSha&&review.sha256===reviewSha,"EXACT_EXTERNAL_REVIEW_HASHES");
 const names=validate(r.x,v.x,st.raw.toString("utf8"));
 const a=review.x;
 need(a.schema==="v39.phase5.static-install-review.v1"&&a.approvedStaticInstallation===true&&a.independentGlobalStopConfirmed===true&&a.phase6PaidGo===false&&a.main===r.x.main&&a.bundleReceiptSha256===receiptSha&&a.staticValuesSha256===valuesSha&&a.privatePolicyReviewSha256===r.x.approvedPrivatePolicyReviewSha256&&typeof a.reviewedBy==="string"&&a.reviewedBy.trim().length>=3&&Number.isFinite(Date.parse(a.reviewedAtUtc))&&Date.parse(a.reviewedAtUtc)<=Date.now(),"GENUINE_EXACT_INSTALL_REVIEW_REQUIRED");
 need(main()===r.x.main,"MAIN_DRIFT");
 const before=metadata(),plan=planWrites(names,before,a.approvedReplacements);
 if(mode==="PLAN_EXACT_STATIC_INSTALL"){console.log(JSON.stringify({status:"EXACT_STATIC_INSTALL_PLAN_NO_GO",main:r.x.main,plan,phase6PaidGo:false,githubMutations:0}));return}
 // Persist a one-shot journal BEFORE first remote mutation. Unknown or partial
 // results require independent metadata reconciliation, not blind retry.
 const journal=path.join(d,"static-install-attempt.jsonl");
 const fd=fs.openSync(journal,"wx",0o600);
 const emit=x=>{fs.writeSync(fd,JSON.stringify(x)+"\n");fs.fsyncSync(fd)};
 let n=0;
 try{
  emit({main:r.x.main,receiptSha,valuesSha,reviewSha,plan,phase6PaidGo:false});
  for(const p of plan){
   need(main()===r.x.main,"MAIN_CHANGED_DURING_INSTALL");
   const now=metadata().find(x=>x.name===p.name)?.updatedAt??null;
   need(now===p.oldUpdatedAt,"SECRET_METADATA_CHANGED_NO_REPLAY");
   emit({name:p.name,status:"WRITE_ATTEMPTED",oldUpdatedAt:now});
   gh(["secret","set",p.name,"-R",REPO],{input:v.x[p.name],stdio:["pipe","pipe","ignore"]});
   const after=metadata().find(x=>x.name===p.name);
   need(after&&Number.isFinite(Date.parse(after.updatedAt))&&(now===null||Date.parse(after.updatedAt)>Date.parse(now)),"SECRET_METADATA_READBACK_NO_REPLAY");
   emit({name:p.name,status:"METADATA_READBACK",updatedAt:after.updatedAt});n++;
  }
  need(main()===r.x.main,"MAIN_CHANGED_AFTER_INSTALL");
  emit({status:"EXACT_STATIC_SECRETS_INSTALLED_METADATA_ONLY_NO_GO",installed:n});
  console.log(JSON.stringify({status:"EXACT_STATIC_SECRETS_INSTALLED_METADATA_ONLY_NO_GO",main:r.x.main,installed:n,approvalFlagsChanged:0,signerKeysChanged:0,providerCalls:0,databaseWrites:0,workflowDispatches:0,githubSecretValuesReadBack:false,phase6PaidGo:false}));
 }finally{fs.closeSync(fd)}
}
module.exports={planWrites,validate};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_STATIC_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_STATIC_REDACTED_OR_PARTIAL_NO_REPLAY");process.exitCode=2}
