#!/usr/bin/env node
"use strict";
// Orchestrate existing exact reviewers/installers only. No new authorization,
// new database, provider requests, paid activation, or blind replay.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const BLOBS={core:"34156ac65811165c0d217e7175f8643eeef55761",assembly:"cf9463ae4c078cf178acd350fbe510cd4d371591",bundle:"cf5c220fa4c44c13c93e8bfe58f72f5a5bc635ed",install:"651c2389bace887165af6c31349f9882e05decd4",stage:"432043debae812e8495c6d217cc94251a4e9728c"};
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_BULK_"+s)};
const digest=b=>crypto.createHash("sha256").update(b).digest("hex");
function sequence(mode,ops){
 if(mode==="PREPARE_POLICY_REVIEW"){ops.assemble();return}
 if(mode==="PREPARE_STATIC_REVIEW"){ops.verify();return}
 need(mode==="COMMISSION_EXISTING_INERT_NO_GO","MODE");
 // All reviewer artifacts and nonmutating checks pass before any mutation.
 ops.verify();ops.installPlan();ops.checkStagePrerequisites();ops.noPriorAttempt();
 ops.storeManifest();ops.install();ops.stage();
}
function safeDir(d){const st=fs.lstatSync(d);need(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function safeRead(d,n,max=4000000){const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");return fs.readFileSync(p)}
function run(){
 const [mode,dirArg,policySha,staticSha]=process.argv.slice(2);
 need(["PREPARE_POLICY_REVIEW","PREPARE_STATIC_REVIEW","COMMISSION_EXISTING_INERT_NO_GO"].includes(mode)&&H.test(policySha??"")&&(mode==="COMMISSION_EXISTING_INERT_NO_GO"?process.argv.length===6&&H.test(staticSha??""):process.argv.length===5),"EXACT_REVIEW_ARGUMENTS");
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
 const required=mode==="PREPARE_POLICY_REVIEW"?[...prep,"reviewed-final-policy-binding-decisions.json"]:[...prep.slice(1),"source-inventory.json","approved-policy-objects.json","approved-private-policy-review.json"];
 const missing=required.filter(n=>!fs.existsSync(path.join(d,n)));
 if(missing.length){console.log(JSON.stringify({status:"HOLD_MISSING_EXISTING_REVIEWED_INPUTS",missing,phase6PaidGo:false}));process.exitCode=2;return}
 const review=mode==="PREPARE_POLICY_REVIEW"?"reviewed-final-policy-binding-decisions.json":"approved-private-policy-review.json";
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
  sequence(mode,{
   assemble:()=>call(tsx,[f.assembly,f.core,d,policySha]),
   verify:()=>bundle("VERIFY_AND_EXPORT_EXACT_APPROVED_BUNDLE"),
   installPlan:()=>installer("PLAN_EXACT_STATIC_INSTALL"),
   checkStagePrerequisites(){
    const meta=JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
    const names=new Set(meta.map(x=>x.name));
    need(["V39_PHASE6_PROCESS_ARMED","P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL","P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"].every(n=>names.has(n)),"EXISTING_STAGE_APPROVAL_AND_ROLE_NAMES");
    const w=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/phase5-exact-inert-release-stage-manual.yml"]));
    need(w.state==="active"&&Number.isSafeInteger(w.id),"EXISTING_STAGE_WORKFLOW");
    const runs=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/"+w.id+"/runs?event=workflow_dispatch&head_sha="+head+"&per_page=100"]));
    need(runs.total_count===0&&Array.isArray(runs.workflow_runs)&&runs.workflow_runs.length===0,"PRIOR_STAGE_ATTEMPT_RECONCILIATION");
   },
   noPriorAttempt(){need(!["static-install-attempt.jsonl","inert-stage-chain-attempt.jsonl"].some(n=>fs.existsSync(path.join(out,n))),"LOCAL_ATTEMPT_RECONCILIATION")},
   storeManifest:()=>bundle("STORE_EXACT_APPROVED_MANIFEST_AND_EXPORT_NO_PROVIDER"),
   install:()=>installer("INSTALL_EXACT_STATIC_NO_GO"),
   stage:()=>call(process.execPath,[f.stage,out,receipt()])
  });
  console.log(JSON.stringify({status:"EXISTING_EXACT_HANDOFF_STEP_COMPLETE",mode,main:head,phase6PaidGo:false}));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}
module.exports={sequence};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_BULK_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_BULK_REDACTED_CHECK_EXISTING_JOURNALS_NO_BLIND_REPLAY");process.exitCode=2}
