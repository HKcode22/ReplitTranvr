#!/usr/bin/env node
"use strict";
// Orchestrate existing exact reviewers/installers only. No new authorization,
// new database, provider requests, paid activation, or blind replay.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const BLOBS={coreInputs:"c9adb783f29103fdfdd118472cbcc4d4910374ce",core:"34156ac65811165c0d217e7175f8643eeef55761",assembly:"cf9463ae4c078cf178acd350fbe510cd4d371591",bundle:"78bb0b7bea4712305edab194952faf55310c4903",install:"60691feaf6e0dd02a2b36b9ec6af9c0c46069af1",stage:"432043debae812e8495c6d217cc94251a4e9728c"};
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_BULK_"+s)};
const digest=b=>crypto.createHash("sha256").update(b).digest("hex");
const INERT_APPROVALS=Object.freeze(["P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED"]);
// Optional continuation of the existing exact independent review. These
// are already-required stage controls, not a new review or an authorization
// minted by this runner. Never set collection/arm/owner or other GO flags.
function planInertApprovals(review,receipt,metadata,planWrites){
 const names=new Set(metadata.map(x=>x.name));
 const a=review.inertStageFlagInstallation;
 if(a===undefined){
  need(INERT_APPROVALS.every(n=>names.has(n)),"EXISTING_STAGE_APPROVALS_MISSING_EXACT_REVIEW_REQUIRED");
  return [];
 }
 need(a&&a.approvedExactInertStageFlagInstallation===true&&a.phase6PaidGo===false&&a.authArtifactSha256===receipt.authArtifactSha256&&H.test(a.authArtifactSha256??"")&&a.stageSha256===receipt.stageSha256&&H.test(a.stageSha256??"")&&a.costEnvelopeSha256===receipt.costEnvelopeSha256&&H.test(a.costEnvelopeSha256??""),"EXACT_INERT_FLAG_REVIEW_SCOPE");
 need(Array.isArray(a.approvedNames)&&a.approvedNames.length===INERT_APPROVALS.length&&new Set(a.approvedNames).size===INERT_APPROVALS.length&&INERT_APPROVALS.every(n=>a.approvedNames.includes(n)),"EXACT_THREE_INERT_APPROVAL_NAMES_ONLY");
 // Reuse the verified static installer's metadata compare/replace rules.
 return planWrites(INERT_APPROVALS,metadata,a.approvedReplacements);
}
// Generate a non-authorizing, exact review workpaper from the already
// verified bundle and actual GitHub name/timestamp metadata. No secret
// value or private policy is included. Review is external and explicit.
function staticReviewWorkpaper(r,receiptSha,valuesSha,values,metadata,planWrites){
 need(r?.schema==="v39.phase5.exact-final-commissioning-bundle.v1"&&r.status==="EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH"&&r.phase6PaidGo===false&&r.approvalFlagsPrepared===0&&r.githubMutations===0&&C.test(r.main??"")&&[receiptSha,valuesSha,r.approvedPrivatePolicyReviewSha256,r.authArtifactSha256,r.stageSha256,r.costEnvelopeSha256].every(x=>H.test(x??"")),"EXACT_BUNDLE_REVIEW_WORKPAPER");
 const names=Object.keys(values??{});
 need(names.length===31&&r.staticSecretsPrepared===31&&new Set(names).size===31&&names.every(n=>/^[A-Z0-9_]+$/.test(n)&&!INERT_APPROVALS.includes(n)&&!/_APPROVED$|_ARMED$|_STOP$|_ENABLED$|_DATABASE_URL$|_KEY_BASE64$/.test(n)),"EXACT_STATIC_REVIEW_NAMES");
 const replacements=ns=>metadata.filter(x=>ns.includes(x.name)).map(({name,updatedAt})=>({name,updatedAt})).sort((a,b)=>a.name.localeCompare(b.name));
 const proposedStaticReplacements=replacements(names),proposedInertReplacements=replacements(INERT_APPROVALS);
 const staticPlan=planWrites(names,metadata,proposedStaticReplacements);
 const inertPlan=planWrites(INERT_APPROVALS,metadata,proposedInertReplacements);
 return {status:"EXACT_STATIC_INSTALL_REVIEW_WORKPAPER_NOT_APPROVED_NO_GO",main:r.main,staticCount:staticPlan.length,inertCount:inertPlan.length,
  staticPlan,inertPlan,
  draftReview:{schema:"v39.phase5.static-install-review.v1",approvedStaticInstallation:false,independentGlobalStopConfirmed:false,phase6PaidGo:false,main:r.main,bundleReceiptSha256:receiptSha,staticValuesSha256:valuesSha,privatePolicyReviewSha256:r.approvedPrivatePolicyReviewSha256,reviewedBy:null,reviewedAtUtc:null,approvedReplacements:proposedStaticReplacements,
   inertStageFlagInstallation:{approvedExactInertStageFlagInstallation:false,phase6PaidGo:false,authArtifactSha256:r.authArtifactSha256,stageSha256:r.stageSha256,costEnvelopeSha256:r.costEnvelopeSha256,approvedNames:[...INERT_APPROVALS],approvedReplacements:proposedInertReplacements}}};
}
function sequence(mode,ops){
 if(mode==="PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE"||mode==="ADOPT_CORE_ALREADY_APPROVED_ON_MAIN"){ops.coreInputs(mode);return}
 if(mode==="PREPARE_POLICY_REVIEW"){ops.assemble();return}
 if(mode==="PREPARE_STATIC_REVIEW"){ops.verify();ops.prepareStaticReviewWorkpaper();return}
 need(mode==="COMMISSION_EXISTING_INERT_NO_GO","MODE");
 // All reviewer artifacts and nonmutating checks pass before any mutation.
 ops.verify();ops.installPlan();ops.checkStagePrerequisites();ops.noPriorAttempt();
 ops.storeManifest();ops.install();ops.installInertApprovals();ops.stage();
}
function safeDir(d){const st=fs.lstatSync(d);need(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function safeRead(d,n,max=4000000){const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");return fs.readFileSync(p)}
function classifyHistory(endpointResponse,projectResponse,host,project){
 const normalized=h=>String(h||"").toLowerCase().replace(/-pooler(?=\.)/,"");
 if(!Array.isArray(endpointResponse?.endpoints)||endpointResponse.endpoints.filter(x=>x.type==="read_write"&&normalized(x.host)===normalized(host)).length!==1)
  return {status:"PROJECT_NOT_MATCHED_TO_EXISTING_OWNER_DB",historyWindowVerified:false,isolatedRestoreVerified:false};
 const x=projectResponse?.project;
 if(x?.id!==project||!Number.isSafeInteger(x.history_retention_seconds)||x.history_retention_seconds<0)
  return {status:"MATCHED_ENDPOINT_HISTORY_SETTING_NOT_RETURNED",historyWindowVerified:false,isolatedRestoreVerified:false};
 return {status:"EXISTING_PRODUCTION_ENDPOINT_HISTORY_WINDOW_READONLY",historyWindowVerified:true,historyRetentionSeconds:x.history_retention_seconds,isolatedRestoreVerified:false};
}
async function remainingOwnerMetadata(){
 // Only the genuinely outstanding owner-side management setting and three
 // stage approval names. Do not replay the previous production inventory.
 need(process.argv.length===3&&process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&!!process.env.DATABASE_URL,"EXISTING_OWNER_ENV");
 const cmd=(c,a)=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],maxBuffer:4*1024*1024,timeout:30000,env:{...process.env,GH_PROMPT_DISABLED:"1"}}).trim();
 const head=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]),pin=head();
 need(pin==="70580b3749544dfcbeff39da181b2aa42b1b4476","MAIN_MOVED_REVIEW_NEW_PIN");
 const u=new URL(process.env.DATABASE_URL);
 need(["postgresql:","postgres:"].includes(u.protocol)&&decodeURIComponent(u.username)==="neondb_owner"&&!!u.password&&u.hostname.endsWith(".neon.tech")&&u.pathname==="/neondb","EXISTING_OWNER_URL");
 const meta=JSON.parse(cmd("gh",["secret","list","-R",REPO,"--json","name,updatedAt"]));
 const stageApprovalMetadata=INERT_APPROVALS.map(name=>{const v=meta.find(x=>x.name===name);return {name,present:!!v,updatedAt:v?.updatedAt??null}});
 const key=process.env.NEON_API_KEY,project=process.env.NEON_PROJECT_ID;
 let management={status:"NO_EXISTING_MANAGEMENT_CREDENTIALS_USE_LINKED_CONSOLE_SETTING",historyWindowVerified:false,isolatedRestoreVerified:false},managementReads=0;
 if(key&&project&&/^[a-z0-9-]{1,60}$/.test(project)){
  const read=async suffix=>{managementReads++;const r=await fetch("https://console.neon.tech/api/v2/projects/"+project+suffix,{method:"GET",headers:{Authorization:"Bearer "+key,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error("MANAGEMENT_READ");return r.json()};
  try {
   const ep=await read("/endpoints");
   const normalize=x=>String(x||"").toLowerCase().replace(/-pooler(?=\.)/,"");
   if(Array.isArray(ep.endpoints)&&ep.endpoints.filter(e=>e.type==="read_write"&&normalize(e.host)===normalize(u.hostname)).length===1)
    management=classifyHistory(ep,await read(""),u.hostname,project);
   else management={status:"PROJECT_NOT_MATCHED_TO_EXISTING_OWNER_DB",historyWindowVerified:false,isolatedRestoreVerified:false};
  }catch{management={status:"MANAGEMENT_READ_UNAVAILABLE",historyWindowVerified:false,isolatedRestoreVerified:false}}
 }
 need(head()===pin,"MAIN_MOVED_DURING_READBACK");
 console.log(JSON.stringify({status:"EXACT_REMAINING_OWNER_METADATA_READONLY_NO_GO",main:pin,stageApprovalMetadata,management,managementReads,secretValuesRead:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false}));
}
function run(){
 const [mode,dirArg,policySha,staticSha]=process.argv.slice(2);
 const coreMode=["PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE","ADOPT_CORE_ALREADY_APPROVED_ON_MAIN"].includes(mode);
 need((coreMode||["PREPARE_POLICY_REVIEW","PREPARE_STATIC_REVIEW","COMMISSION_EXISTING_INERT_NO_GO"].includes(mode))&&H.test(policySha??"")&&(mode==="COMMISSION_EXISTING_INERT_NO_GO"?process.argv.length===6&&H.test(staticSha??""):process.argv.length===5),"EXACT_REVIEW_ARGUMENTS");
 need(process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&!!process.env.DATABASE_URL,"EXISTING_OWNER_ENV");
 const env={...process.env,GH_PROMPT_DISABLED:"1",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","NODE_OPTIONS"])delete env[k];
 const ghEnv={...env};delete ghEnv.DATABASE_URL;delete ghEnv.V39_DATABASE_RUNTIME_URL;
 const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:["ignore","pipe","ignore"],env:ghEnv,...o}).trim();
 const gh=a=>cmd("gh",a),root=fs.realpathSync(cmd("git",["rev-parse","--show-toplevel"])),head=cmd("git",["rev-parse","HEAD"]);
 const checkMain=()=>need(C.test(head)&&head===gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_MAIN");
 checkMain();need(root===fs.realpathSync(process.cwd()),"CHECKOUT_ROOT");env.V39_P5_APPROVED_CODE_SHA=head;
 const d=safeDir(path.resolve(dirArg));need(d!==root&&!d.startsWith(root+path.sep),"PRIVATE_OUTSIDE_CHECKOUT");
 const prep=["policy-complete-shape-NOT-RUNTIME.json","public-provider-contract-CANDIDATE.json","approved-manifest.json","approved-config.json","approved-external-input.json","approved-timing-input.json","approved-auth.json"];
 const required=coreMode?["manifest-candidate.json","config-candidate.json","source-inventory.json","external-input-offline-review-NOT-STAGE.json","timing-input-offline-review.json","reviewed-final-core-scope-decisions.json"]:mode==="PREPARE_POLICY_REVIEW"?[...prep,"reviewed-final-policy-binding-decisions.json"]:[...prep.slice(1),"source-inventory.json","approved-policy-objects.json","approved-private-policy-review.json"];
 const missing=required.filter(n=>!fs.existsSync(path.join(d,n)));
 if(missing.length){console.log(JSON.stringify({status:"HOLD_MISSING_EXISTING_REVIEWED_INPUTS",missing,phase6PaidGo:false}));process.exitCode=2;return}
 const review=coreMode?"reviewed-final-core-scope-decisions.json":mode==="PREPARE_POLICY_REVIEW"?"reviewed-final-policy-binding-decisions.json":"approved-private-policy-review.json";
 need(digest(safeRead(d,review))===policySha,"REVIEW_HASH");
 const out=path.join(d,"exact-final-commissioning-"+head.slice(0,12));
 if(mode==="COMMISSION_EXISTING_INERT_NO_GO"){safeDir(out);need(digest(safeRead(out,"static-install-review.json"))===staticSha,"STATIC_REVIEW_HASH")}
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"p5-bulk-"));fs.chmodSync(temp,0o700);
 try{
  const f={};
  for(const [k,b] of Object.entries(BLOBS)){
   const raw=Buffer.from(gh(["api","repos/"+REPO+"/git/blobs/"+b,"--jq",".content"]),"base64");
   need(crypto.createHash("sha1").update("blob "+raw.length+"\0").update(raw).digest("hex")===b,"HELPER_BLOB_MISMATCH");
   f[k]=path.join(temp,k+".cjs");fs.writeFileSync(f[k],raw,{flag:"wx",mode:0o600});cmd(process.execPath,["--check",f[k]]);
  }
  const tsx=path.join(root,"node_modules",".bin","tsx");need(fs.existsSync(tsx),"EXISTING_TSX_REQUIRED");
  function call(c,a){checkMain();execFileSync(c,a,{env,stdio:["ignore","inherit","inherit"],timeout:40*60*1000});checkMain()}
  function receipt(){return digest(safeRead(out,"bundle-receipt.json",200000))}
  function values(){return digest(safeRead(out,"static-secret-values-PRIVATE.json",400000))}
  function installer(m){call(process.execPath,[f.install,m,out,receipt(),values(),staticSha])}
  const bundle=m=>call(tsx,[f.bundle,f.core,m,d,policySha]);
  const secretMeta=()=>JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
  let approvalPlan=[];
  sequence(mode,{
   coreInputs:m=>call(tsx,[f.coreInputs,m,d,policySha]),
   assemble:()=>call(tsx,[f.assembly,f.core,d,policySha]),
   verify:()=>bundle("VERIFY_AND_EXPORT_EXACT_APPROVED_BUNDLE"),
   prepareStaticReviewWorkpaper(){
    safeDir(out);const rb=safeRead(out,"bundle-receipt.json",200000),vb=safeRead(out,"static-secret-values-PRIVATE.json",400000),st=safeRead(out,"exact-approved-stage-input.json",48000);
    const r=JSON.parse(rb),v=JSON.parse(vb),installerModule=require(f.install);
    need(r.main===head&&r.approvedPrivatePolicyReviewSha256===policySha,"EXACT_REVIEWED_BUNDLE");
    installerModule.validate(r,v,st.toString("utf8"));
    const w=staticReviewWorkpaper(r,digest(rb),digest(vb),v,secretMeta(),installerModule.planWrites);
    checkMain();const raw=Buffer.from(JSON.stringify(w)),dest=path.join(out,"static-install-review-workpaper-NOT-APPROVED.json");
    // This is not the approved filename, and the installer cannot treat
    // this workpaper as authorization. Do not overwrite a prior review.
    try{fs.writeFileSync(dest,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(safeRead(out,"static-install-review-workpaper-NOT-APPROVED.json").equals(raw),"WORKPAPER_METADATA_CHANGED_REVIEW_REQUIRED")}
    console.log(JSON.stringify({status:w.status,main:head,staticCount:w.staticCount,inertCount:w.inertCount,staticCreates:w.staticPlan.filter(x=>x.operation==="CREATE").length,inertCreates:w.inertPlan.filter(x=>x.operation==="CREATE").length,workpaperSha256:digest(raw),approvedReviewCreated:false,secretValuesPrinted:false,githubMutations:0,providerCalls:0,phase6PaidGo:false}));
   },
   installPlan:()=>installer("PLAN_EXACT_STATIC_INSTALL"),
   checkStagePrerequisites(){
    const meta=secretMeta(),names=new Set(meta.map(x=>x.name));
    need(["V39_PHASE6_PROCESS_ARMED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL","P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"].every(n=>names.has(n)),"EXISTING_STOP_AND_STAGE_ROLE_NAMES");
    const rb=safeRead(out,"bundle-receipt.json",200000),sr=safeRead(out,"static-install-review.json",100000);
    need(digest(sr)===staticSha,"STATIC_REVIEW_DRIFT");
    const review=JSON.parse(sr),r=JSON.parse(rb);
    need(review.approvedStaticInstallation===true&&review.independentGlobalStopConfirmed===true&&review.phase6PaidGo===false&&review.bundleReceiptSha256===digest(rb)&&review.main===head&&r.main===head,"EXACT_EXISTING_STOP_AND_STATIC_REVIEW");
    approvalPlan=planInertApprovals(review,r,meta,require(f.install).planWrites);
    console.log(JSON.stringify({status:"INERT_STAGE_APPROVAL_METADATA_PLAN_NO_GO",existingOrReviewedNames:INERT_APPROVALS,plannedWrites:approvalPlan.map(x=>({name:x.name,operation:x.operation})),secretValuesRead:false,phase6PaidGo:false}));
    const w=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/phase5-exact-inert-release-stage-manual.yml"]));
    need(w.state==="active"&&Number.isSafeInteger(w.id),"EXISTING_STAGE_WORKFLOW");
    const runs=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/"+w.id+"/runs?event=workflow_dispatch&head_sha="+head+"&per_page=100"]));
    need(runs.total_count===0&&Array.isArray(runs.workflow_runs)&&runs.workflow_runs.length===0,"PRIOR_STAGE_ATTEMPT_RECONCILIATION");
   },
   noPriorAttempt(){need(!["static-install-attempt.jsonl","inert-stage-chain-attempt.jsonl","inert-approval-install-attempt.jsonl"].some(n=>fs.existsSync(path.join(out,n))),"LOCAL_ATTEMPT_RECONCILIATION")},
   storeManifest:()=>bundle("STORE_EXACT_APPROVED_MANIFEST_AND_EXPORT_NO_PROVIDER"),
   install:()=>installer("INSTALL_EXACT_STATIC_NO_GO"),
   installInertApprovals(){
    if(!approvalPlan.length)return;
    const fd=fs.openSync(path.join(out,"inert-approval-install-attempt.jsonl"),"wx",0o600);
    const emit=x=>{fs.writeSync(fd,JSON.stringify(x)+"\n");fs.fsyncSync(fd)};
    try{
     emit({main:head,receiptSha256:receipt(),staticReviewSha256:staticSha,status:"EXACT_REVIEWED_INERT_APPROVAL_INSTALL_STARTED_NO_GO"});
     for(const p of approvalPlan){
      checkMain();
      const now=secretMeta().find(x=>x.name===p.name)?.updatedAt??null;
      need(now===p.oldUpdatedAt,"INERT_APPROVAL_METADATA_DRIFT_NO_REPLAY");
      emit({name:p.name,status:"WRITE_ATTEMPTED"});
      cmd("gh",["secret","set",p.name,"-R",REPO],{input:"1",stdio:["pipe","pipe","ignore"]});
      const after=secretMeta().find(x=>x.name===p.name);
      need(after&&Number.isFinite(Date.parse(after.updatedAt))&&(now===null||Date.parse(after.updatedAt)>Date.parse(now)),"INERT_APPROVAL_METADATA_READBACK_NO_REPLAY");
      emit({name:p.name,status:"METADATA_READBACK",updatedAt:after.updatedAt});
     }
     checkMain();emit({status:"THREE_EXACT_REVIEWED_INERT_APPROVAL_FLAGS_INSTALLED_NO_GO"});
    }finally{fs.closeSync(fd)}
   },
   stage:()=>call(process.execPath,[f.stage,out,receipt()])
  });
  console.log(JSON.stringify({status:"EXISTING_EXACT_HANDOFF_STEP_COMPLETE",mode,main:head,phase6PaidGo:false}));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}
module.exports={sequence,planInertApprovals,staticReviewWorkpaper,INERT_APPROVALS,classifyHistory};
if(require.main===module)Promise.resolve().then(()=>process.argv[2]==="OWNER_FINAL_METADATA_READONLY"?remainingOwnerMetadata():run()).catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_BULK_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_BULK_REDACTED_CHECK_EXISTING_JOURNALS_NO_BLIND_REPLAY");process.exitCode=2});
