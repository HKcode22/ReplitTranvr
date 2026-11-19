#!/usr/bin/env node
"use strict";
// Convenience launcher only: reuse the existing exact private review and
// commissioning helpers. Does not create or alter an approval, stage packet,
// evidence ledger, paid GO flag, database credential, or source policy.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",BASE="70580b3749544dfcbeff39da181b2aa42b1b4476";
const RUNNER="54b29fad160dbb358c323b26c64d55045096fa04",STAGE="6a84f6b9cd993965e3d267a1e7f9246de19995ae",REPIN="e27585debcaccd2f123381ed61f448352a732e3f",FREEZE="607886ff73c1c342873d66820ca16be18f803210";
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const PINS={"manifest-candidate.json":"9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25","config-candidate.json":"4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb","source-inventory.json":"6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0","external-input-offline-review-NOT-STAGE.json":"a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9"};
const CORE="reviewed-final-core-scope-decisions.json",POLICY="reviewed-final-policy-binding-decisions.json",PRIVATE="approved-private-policy-review.json",STATIC="static-install-review.json",FINAL_FREEZE="approved-final-phase5-freeze.json";
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_RESUME_"+s)},sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function next(s){
 if(s.finalRepinPresent&&!s.completedStageJournal)return {status:"HOLD_FINAL_REPIN_EXISTS_BEFORE_COMPLETED_COMMISSIONING_RECONCILE_NO_REPLAY"};
 if(s.completedStageJournal){
  if(!s.freezeWorkpaper)return {mode:"RECOVER_EXISTING_FREEZE_WORKPAPER"};
  if(!s.finalFreezeDecision)return {status:"HOLD_FINAL_PHASE5_FREEZE_DECISION_ABSENT",missing:[FINAL_FREEZE]};
  if(s.partialFinalRepin)return {status:"HOLD_FINAL_REPIN_JOURNAL_RECONCILE_NO_REPLAY"};
  if(!s.finalRepinComplete)return {mode:"FINAL_SCHEDULER_REPIN_AFTER_FREEZE"};
  return {status:"PHASE5_FINAL_FREEZE_AND_SCHEDULER_REPIN_COMPLETE_NO_PAID_GO"};
 }
 if(s.acknowledgedCalendarOnly&&s.coreAdopted&&s.privateReview&&s.staticReview&&s.authOnMain)return {mode:"RESUME_ACKNOWLEDGED_CALENDAR_NO_GO",review:PRIVATE,static:STATIC};
 if(s.completedStaticInstall){
  if(!s.stageJournalPresent&&!s.partialInertApproval&&s.coreAdopted&&s.privateReview&&s.staticReview&&s.authOnMain)
   return {mode:"RESUME_AFTER_ACKNOWLEDGED_STATIC_NO_GO",review:PRIVATE,static:STATIC};
  return {status:"HOLD_EXISTING_MUTATION_JOURNAL_RECONCILE_NO_REPLAY"};
 }
 if(s.anyMutationJournal)return {status:"HOLD_EXISTING_MUTATION_JOURNAL_RECONCILE_NO_REPLAY"};
 if(!s.coreReview)return {status:"HOLD_EXACT_CORE_REVIEW_FILE_ABSENT",missing:[CORE]};
 if(!s.corePrepared)return {mode:"PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE",review:CORE};
 if(!s.authOnMain)return {status:"HOLD_PREPARED_AUTH_NOT_IN_APPROVED_MAIN_LEDGER"};
 if(!s.coreAdopted)return {mode:"ADOPT_CORE_ALREADY_APPROVED_ON_MAIN",review:CORE};
 if(!s.policyObjects)return s.policyDecision?{mode:"PREPARE_POLICY_REVIEW",review:POLICY}:{status:"HOLD_EXACT_POLICY_BINDING_REVIEW_ABSENT",missing:[POLICY]};
 if(!s.privateReview)return {status:"HOLD_EXACT_PRIVATE_POLICY_BYTE_REVIEW_ABSENT",missing:[PRIVATE]};
 if(!s.staticWorkpaper)return {mode:"PREPARE_STATIC_REVIEW",review:PRIVATE};
 if(!s.staticReview)return {status:"HOLD_EXACT_STATIC_INSTALL_REVIEW_ABSENT",missing:[STATIC]};
 return {mode:"COMMISSION_EXISTING_INERT_NO_GO",review:PRIVATE,static:STATIC};
}
function safeDir(d){let s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function read(d,n,max=4000000){const f=path.join(d,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.nlink===1&&s.size>0&&s.size<=max,"PRIVATE_FILE");return fs.readFileSync(f)}
const exists=(d,n)=>fs.existsSync(path.join(d,n));
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:60000,maxBuffer:12*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const gh=a=>cmd("gh",a),live=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
function choose(root){
 const home=fs.realpathSync(os.homedir()),names=fs.readdirSync(home).filter(n=>/^\.phase5-final-review-[A-Za-z0-9_-]+$/.test(n)).sort();
 need(names.length<=100,"PRIVATE_DIRECTORY_BOUND");
 const matching=[];
 for(const n of names){
  const parent=path.join(home,n),d=path.join(parent,"nov18-"+BASE.slice(0,12));
  if(!fs.existsSync(d))continue;
  try{safeDir(parent);const p=safeDir(d);need(p!==root&&!p.startsWith(root+path.sep),"PRIVATE_OUTSIDE_WORKSPACE");
   if(Object.entries(PINS).every(([name,digest])=>sha(read(p,name))===digest))matching.push(p);
  }catch(e){if(!/^HOLD_P5_RESUME_|ENOENT/.test(String(e.message??"")))throw e}
 }
 if(process.env.P5_FINAL_REVIEW_DIRECTORY){const requested=safeDir(path.resolve(process.env.P5_FINAL_REVIEW_DIRECTORY));need(matching.includes(requested),"EXPLICIT_DIRECTORY_NOT_EXACT_CANDIDATE");return requested}
 need(matching.length===1,"EXACTLY_ONE_EXISTING_CANDIDATE_DIRECTORY_REQUIRED");
 return matching[0];
}
function reviewDigest(d,n,envName){
 // This is a consistency pin of the actual private review file, NOT a new
 // approval. If a reviewer provided an out-of-band digest, require equality.
 const digest=sha(read(d,n));const supplied=process.env[envName];
 need(!supplied||(H.test(supplied)&&supplied===digest),"REVIEWER_DIGEST_MISMATCH");
 return digest;
}
function state(d,out,ledger){
 const ex=n=>exists(d,n),xo=n=>exists(out,n);
 const corePrepared=ex("core-exact-artifact-review/review-receipt.json");
 let authOnMain=false,prepared=null;
 if(corePrepared){
  const sub=safeDir(path.join(d,"core-exact-artifact-review"));prepared=JSON.parse(read(sub,"review-receipt.json",200000));
  const authRaw=read(sub,"auth.json",256000),a=JSON.parse(authRaw);
  need(H.test(prepared.authArtifactSha256??"")&&sha(authRaw)===prepared.authArtifactSha256&&a.authorizationId===prepared.authorizationId,"EXACT_PREPARED_AUTH_RECEIPT");
  authOnMain=ledger.approvals.some(x=>x.authorizationId===a.authorizationId&&x.artifactSha256===prepared.authArtifactSha256&&JSON.stringify(x.predecessorEvidenceIds)===JSON.stringify(a.predecessorEvidenceIds));
 }
 let completedStageJournal=false,acknowledgedCalendarOnly=false;
 const stageJournalPresent=xo("inert-stage-chain-attempt.jsonl");
 if(stageJournalPresent){
  const j=read(safeDir(out),"inert-stage-chain-attempt.jsonl",1000000).toString("utf8").trim().split("\n").map(l=>JSON.parse(l));
  completedStageJournal=j.at(-1)?.status==="BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO";
  acknowledgedCalendarOnly=j.length===5&&j.at(-1)?.mode==="calendar"&&j.at(-1)?.status==="INDEPENDENT_READBACK_MATCH"&&H.test(j[0]?.secretMetadataSha256??"")&&!xo("acknowledged-calendar-resume-once.json");
 }
 const staticJournalPresent=xo("static-install-attempt.jsonl"),inertApprovalJournalPresent=xo("inert-approval-install-attempt.jsonl");
 let completedStaticInstall=false,completedInertApproval=false;
 if(staticJournalPresent){
  const j=read(safeDir(out),"static-install-attempt.jsonl",300000).toString("utf8").trim().split("\n").map(l=>JSON.parse(l));
  completedStaticInstall=j.at(-1)?.status==="EXACT_STATIC_SECRETS_INSTALLED_METADATA_ONLY_NO_GO"&&Number.isSafeInteger(j.at(-1)?.installed)&&j.at(-1).installed>0;
 }
 if(inertApprovalJournalPresent){
  const j=read(safeDir(out),"inert-approval-install-attempt.jsonl",100000).toString("utf8").trim().split("\n").map(l=>JSON.parse(l));
  completedInertApproval=j.at(-1)?.status==="THREE_EXACT_REVIEWED_INERT_APPROVAL_FLAGS_INSTALLED_NO_GO";
 }
 const partialStaticInstall=staticJournalPresent&&!completedStaticInstall,partialInertApproval=inertApprovalJournalPresent&&!completedInertApproval;
 const repinName="final-primary-relay-repin-"+path.basename(out).slice("exact-final-commissioning-".length)+".jsonl";
 const repinPath=path.join(d,repinName),finalRepinPresent=fs.existsSync(repinPath);
 let finalRepinComplete=false;
 if(finalRepinPresent){
  const rs=read(d,repinName,1000000).toString("utf8").trim().split("\n").filter(Boolean).map(l=>JSON.parse(l));
  const last=rs.at(-1);
  finalRepinComplete=last?.status==="FINAL_PRIMARY_AND_RELAY_REPIN_VERIFIED_NO_GO"&&typeof last.main==="string"&&C.test(last.main)&&Number.isSafeInteger(last.verifyRunId)&&last.verifyRunId>0;
  var finalRepinMain=finalRepinComplete?last.main:null;
 }
 const partialFinalRepin=finalRepinPresent&&!finalRepinComplete;
 const statuses={coreReview:ex(CORE),corePrepared,authOnMain,coreAdopted:["approved-manifest.json","approved-config.json","approved-external-input.json","approved-timing-input.json","approved-auth.json"].every(ex),policyDecision:ex(POLICY),policyObjects:ex("approved-policy-objects.json"),privateReview:ex(PRIVATE),staticWorkpaper:xo("static-install-review-workpaper-NOT-APPROVED.json"),staticReview:xo(STATIC),completedStageJournal,acknowledgedCalendarOnly,completedStaticInstall,completedInertApproval,stageJournalPresent,partialStaticInstall,partialInertApproval,freezeWorkpaper:xo("final-freeze-review-workpaper-NOT-APPROVED.json"),finalFreezeDecision:xo(FINAL_FREEZE),finalRepinPresent,finalRepinComplete,finalRepinMain:typeof finalRepinMain==="string"?finalRepinMain:null,partialFinalRepin,anyMutationJournal:stageJournalPresent||partialStaticInstall||partialInertApproval||partialFinalRepin};
 return {statuses,prepared};
}
function run(){
 need(process.argv.length===2&&process.env.GITHUB_ACTIONS!=="true"&&!!process.env.DATABASE_URL&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0","EXISTING_OWNER_ENV");
 const root=fs.realpathSync(cmd("git",["rev-parse","--show-toplevel"]));need(root===fs.realpathSync(process.cwd()),"WORKSPACE_ROOT");
 const head=live();need(C.test(head),"REMOTE_MAIN");
 const dir=choose(root),out=path.join(dir,"exact-final-commissioning-"+head.slice(0,12));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p5-final-resume-")),checkout=path.join(tmp,"checkout");
 fs.chmodSync(tmp,0o700);
 const env={...process.env,GH_PROMPT_DISABLED:"1",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","NODE_OPTIONS"])delete env[k];
 const noCred={...env};delete noCred.DATABASE_URL;delete noCred.V39_DATABASE_RUNTIME_URL;
 const git=(a,o={})=>cmd("git",a,{cwd:root,env:noCred,...o});
 const fetchBlob=(b,n)=>{
  const raw=Buffer.from(cmd("gh",["api","repos/"+REPO+"/git/blobs/"+b,"--jq",".content"],{env:noCred}),"base64");
  need(crypto.createHash("sha1").update("blob "+raw.length+"\0").update(raw).digest("hex")===b,"REVIEWED_HELPER_BLOB");
  const p=path.join(tmp,n);fs.writeFileSync(p,raw,{mode:0o600,flag:"wx"});cmd(process.execPath,["--check",p],{env:noCred});return p;
 };
 let added=false;
 try{
  try{git(["cat-file","-e",head+"^{commit}"])}catch{git(["fetch","--no-tags","origin","main"],{timeout:120000})}
  git(["cat-file","-e",head+"^{commit}"]);
  need(live()===head,"MAIN_CHANGED");
  const delta=git(["diff","--name-only",BASE,head]).split("\n").filter(Boolean);
  need(delta.every(n=>n===LEDGER||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(json|md)$/.test(n)),"EXECUTABLE_SCOPE_CHANGED");
  git(["worktree","add","--detach",checkout,head]);added=true;
  need(fs.readFileSync(path.join(root,"package-lock.json")).equals(fs.readFileSync(path.join(checkout,"package-lock.json")))&&fs.existsSync(path.join(root,"node_modules",".bin","tsx")),"EXISTING_DEPENDENCY_LOCK");
  fs.symlinkSync(path.join(root,"node_modules"),path.join(checkout,"node_modules"),"dir");
  const runner=fetchBlob(RUNNER,"runner.cjs");
  let freezePath=null,repinPath=null;
  for(let i=0;i<6;i++){
   need(live()===head,"MAIN_CHANGED_REVIEW_REQUIRED");
   const ledger=JSON.parse(git(["show",head+":"+LEDGER]));need(ledger.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(ledger.approvals),"EXACT_LEDGER");
   const {statuses,prepared}=state(dir,out,ledger);
   if(statuses.finalFreezeDecision){
    freezePath??=fetchBlob(FREEZE,"final-freeze.cjs");const mod=require(freezePath),od=safeDir(out);
    const work=JSON.parse(read(od,"final-freeze-review-workpaper-NOT-APPROVED.json",1000000));
    const decisionRaw=read(od,FINAL_FREEZE,1000000),decision=JSON.parse(decisionRaw);
    need(Buffer.from(JSON.stringify(decision)).equals(decisionRaw),"FINAL_FREEZE_DECISION_NOT_CANONICAL");
    mod.validateDecision(work,decision,Date.now());
    need(decision.reviewedMainSha===head&&decision.phase6PaidGo===false&&decision.finalSchedulerRepinApproved===true,"FINAL_FREEZE_DECISION_MAIN_OR_SCOPE");
   }
   if(statuses.finalRepinComplete)need(statuses.finalRepinMain===head,"FINAL_REPIN_RECEIPT_MAIN_DRIFT");
   const n=next(statuses);
   if(n.status){
    if(n.status==="PHASE5_FINAL_FREEZE_AND_SCHEDULER_REPIN_COMPLETE_NO_PAID_GO"){
     repinPath??=fetchBlob(REPIN,"final-repin.cjs");
     // Existing repin helper classifies the acknowledged journal against the
     // live repository + relay variables and performs no write when complete.
     execFileSync(process.execPath,[repinPath,dir,head],{cwd:checkout,env:noCred,stdio:"inherit",timeout:5*60*1000});
    }
    console.log(JSON.stringify({status:n.status,main:head,missing:n.missing??[],preparedAuth:prepared?{authorizationId:prepared.authorizationId,authArtifactSha256:prepared.authArtifactSha256}:null,phase6PaidGo:false,existingJournalsPreserved:true}));
    if(n.status.startsWith("HOLD"))process.exitCode=2;
    return;
   }
   if(n.mode==="RECOVER_EXISTING_FREEZE_WORKPAPER"){
    const stage=fetchBlob(STAGE,"stage.cjs");
    execFileSync(process.execPath,[stage,"--prepare-freeze-review",out,sha(read(safeDir(out),"bundle-receipt.json",200000))],{cwd:checkout,env:noCred,stdio:"inherit",timeout:120000});
    return;
   }
   if(n.mode==="FINAL_SCHEDULER_REPIN_AFTER_FREEZE"){
    need(head!==BASE,"FINAL_REPIN_REQUIRES_EVIDENCE_ONLY_MAIN");
    repinPath??=fetchBlob(REPIN,"final-repin.cjs");
    execFileSync(process.execPath,[repinPath,dir,head],{cwd:checkout,env:noCred,stdio:"inherit",timeout:20*60*1000});
    continue;
   }
   if(n.mode==="PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE"){
    const r=JSON.parse(read(dir,CORE,200000)),c=r.evidenceCommit;need(C.test(c??""),"EXACT_EVIDENCE_COMMIT");
    try{git(["cat-file","-e",c+"^{commit}"])}catch{git(["fetch","--no-tags","origin",c],{timeout:120000})}
   }
   const key=n.review===CORE?"P5_FINAL_CORE_REVIEW_SHA256":n.review===POLICY?"P5_FINAL_POLICY_DECISION_SHA256":"P5_FINAL_PRIVATE_REVIEW_SHA256";
   const args=[runner,n.mode,dir,reviewDigest(dir,n.review,key)];
   if(n.static)args.push(reviewDigest(safeDir(out),n.static,"P5_FINAL_STATIC_REVIEW_SHA256"));
   console.log(JSON.stringify({status:"EXECUTING_EXISTING_ADMITTED_MODE",mode:n.mode,main:head,phase6PaidGo:false}));
   execFileSync(process.execPath,args,{cwd:checkout,env,stdio:"inherit",timeout:45*60*1000});
   if(["COMMISSION_EXISTING_INERT_NO_GO","RESUME_ACKNOWLEDGED_CALENDAR_NO_GO","RESUME_AFTER_ACKNOWLEDGED_STATIC_NO_GO"].includes(n.mode))return;
  }
  need(false,"MAXIMUM_LOCAL_CONTINUATION_STEPS");
 }finally{
  if(added)try{git(["worktree","remove","--force",checkout])}catch{console.error("P5_TEMP_WORKTREE_CLEANUP_REQUIRED_NO_PRODUCTION_REPLAY")}
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
module.exports={next,state};
if(require.main===module)try{run()}catch(e){console.error(/^HOLD_P5_RESUME_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_RESUME_EXISTING_HELPER_STOPPED_INSPECT_OUTPUT_NO_REPLAY");process.exitCode=2}
