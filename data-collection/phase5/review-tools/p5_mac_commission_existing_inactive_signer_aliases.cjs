#!/usr/bin/env node
"use strict";
// Existing Mac key custody -> exact seven inactive repository secret aliases.
// No key generation, policy/approval/flag changes, provider calls, SQL, dispatch,
// or overwrite of an unexplained existing alias. GitHub API metadata only.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",PIN="70580b3749544dfcbeff39da181b2aa42b1b4476";
const GROUPS=[
 ["daily","7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744",["P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64"]],
 ["query","80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2",["P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64"]],
 ["registry-index","60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67",["P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64","P6_PRIVATE_DAY_REVIEWER_KEY_BASE64"]],
 ["later-pre-t24-registry","de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733",["P6_PRIVATE_LATER_REVIEWER_KEY_BASE64"]],
 ["post","4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b",["P6_PRIVATE_POST_REVIEWER_KEY_BASE64"]],
 ["t24-independent-custody","5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f",["P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64"]]
];
const ALIASES=GROUPS.flatMap(([id,fingerprintSha256,names])=>names.map(name=>({id,fingerprintSha256,name})));
const BLOCK_SECRETS=[
 "V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED",
 "P6_NONPAID_SOURCE_RUNTIME_APPROVED","P6_NATIVE_LATER_RUNTIME_APPROVED","P6_NATIVE_POST_PRODUCER_APPROVED",
 "P6_T24_CUSTODY_APPROVED","P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED","P6_PRIVATE_POST_STORED_REVIEW_APPROVED",
 "P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64",
 "P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64"
];
const FLAGS={P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"false",P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"false",P6_PRIVATE_POST_PARENT_ENABLED:"false",P6_NATIVE_LATER_RUNTIME_ENABLED:"0",P6_NATIVE_POST_PRODUCER_ENABLED:"0",P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"0",P6_PRIVATE_T24_EXECUTION_ENABLED:"0",P6_PRIVATE_LATER_ENROLL_ENABLED:"0",P6_PRIVATE_T24_ENROLL_ENABLED:"0",P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"0",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"0",P5_CD_GH_PRE_SCHEDULE_ENABLED:"0",P5_CD_GH_T24_SCHEDULE_ENABLED:"0",P6_ROLLING_CONTROLLER_ENABLED:"0",P5_AUTO_SOURCE_DISPATCH_ENABLED:"false",P5_POST_AUTO_DISPATCH_ENABLED:"false",P5_T24_AUTO_DISPATCH_ENABLED:"false",P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"false",P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"false",P6_T24_CUSTODY_ENABLED:"0",P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED:"0"};
const hold=s=>{throw Error("HOLD_P5_INACTIVE_SIGNERS_"+s)};
const need=(ok,s)=>{if(!ok)hold(s)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const gh=(args,input)=>execFileSync("gh",args,{input,encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:[input?"pipe":"ignore","pipe","pipe"],env:{...process.env,GH_PROMPT_DISABLED:"1"}}).trim();
const lines=s=>s?s.split("\n").map(l=>JSON.parse(l)):[];
function state(){
 need(gh(["api","user","--jq",".login"]).toLowerCase()==="hkcode22","WRONG_GITHUB_OWNER");
 need(gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])===PIN,"MAIN_CHANGED");
 const secrets=lines(gh(["api","--paginate","repos/"+REPO+"/actions/secrets?per_page=100","--jq",".secrets[] | @json"]));
 const vars=lines(gh(["api","--paginate","repos/"+REPO+"/actions/variables?per_page=100","--jq",".variables[] | @json"]));
 return inspectState(secrets,vars);
}
function inspectState(secrets,vars){
 const sm=new Map(secrets.map(s=>[s.name,s])),vm=new Map(vars.map(v=>[v.name,v.value]));
 need(sm.size===secrets.length&&vm.size===vars.length,"DUPLICATE_METADATA");
 need(!BLOCK_SECRETS.some(n=>sm.has(n)),"APPROVAL_OR_POLICY_ALREADY_PRESENT");
 need(Object.entries(FLAGS).every(([k,v])=>!vm.has(k)||vm.get(k)===v),"ACTIVE_OR_UNREVIEWED_MODE");
 // This is bounded repo metadata, not a global STOP or secret-value proof.
 return sm;
}
function plan(sm,journal){
 need(journal?.schema==="v39.phase5.inactive-signer-alias-commission.v1"&&journal.repo===REPO&&journal.main===PIN&&Array.isArray(journal.completed),"JOURNAL_SCOPE");
 const notes=new Map(journal.completed.map(r=>[r.name,r]));
 need(notes.size===journal.completed.length&&[...notes.keys()].every(n=>ALIASES.some(a=>a.name===n)),"JOURNAL_ALIASES");
 return ALIASES.map(a=>{
  const actual=sm.get(a.name),old=notes.get(a.name);
  if(!actual){need(!old,"RECORDED_ALIAS_MISSING");return {...a,action:"CREATE"}}
  need(old&&old.fingerprintSha256===a.fingerprintSha256&&typeof old.updatedAt==="string"&&old.updatedAt===actual.updated_at,"EXISTING_ALIAS_UNVERIFIED_NO_OVERWRITE");
  return {...a,action:"REUSE_RECORDED_METADATA"};
 });
}
function safe(p,isDir){
 const st=fs.lstatSync(p);
 need((isDir?st.isDirectory():st.isFile())&&!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o777)===(isDir?0o700:0o600)&&(isDir||st.nlink===1),"UNSAFE_LOCAL_CUSTODY");
 return st;
}
function validateKey(dir,id,fp){
 const p=path.join(dir,id+".pkcs8.pem");const st=safe(p,false);need(st.size>100&&st.size<65536,"KEY_SIZE");
 const raw=fs.readFileSync(p);
 try{
  const key=crypto.createPrivateKey(raw),pub=crypto.createPublicKey(key);
  need(key.asymmetricKeyType==="ed25519"&&sha(pub.export({type:"spki",format:"der"}))===fp,"EXISTING_KEY_FINGERPRINT_DRIFT");
  const challenge=crypto.randomBytes(32);
  need(crypto.verify(null,challenge,pub,crypto.sign(null,challenge,key)),"KEY_POSSESSION_FAILED");
  return raw;
 }catch(e){raw.fill(0);throw e}
}
const newJournal=()=>({schema:"v39.phase5.inactive-signer-alias-commission.v1",repo:REPO,main:PIN,completed:[]});
function saveJournal(dir,j){
 const tmp=path.join(dir,"journal-next-"+crypto.randomBytes(12).toString("hex")+".json"),out=path.join(dir,"journal.json");
 fs.writeFileSync(tmp,JSON.stringify(j),{flag:"wx",mode:0o600});fs.renameSync(tmp,out);
}
function run(){
 need(process.platform==="darwin"&&process.env.GITHUB_ACTIONS!=="true"&&process.argv.length===3&&process.argv[2]==="INSTALL_EXISTING_SEVEN_INACTIVE_SIGNER_ALIASES_NO_GO","MAC_OWNER_EXPLICIT_CONFIRMATION");
 const home=fs.realpathSync(os.homedir()),dir=path.join(home,".travnr-phase6-signer-candidates-v2"),jd=path.join(home,".travnr-phase6-github-signer-commission-v1");
 safe(dir,true);
 // All six identities verified before the first possible secret mutation.
 const keys=new Map();let journal;
 try{
  for(const [id,fp] of GROUPS)keys.set(id,validateKey(dir,id,fp));
  const sm=state();
  try{fs.mkdirSync(jd,{mode:0o700})}catch(e){if(e.code!=="EEXIST")throw e}safe(jd,true);
  // One owner process at a time. An interrupted run holds for custody review.
  const lock=path.join(jd,"install.lock");fs.writeFileSync(lock,"in progress\n",{flag:"wx",mode:0o600});
  try{
   const jp=path.join(jd,"journal.json");
   if(fs.existsSync(jp)){safe(jp,false);journal=JSON.parse(fs.readFileSync(jp,"utf8"));}else journal=newJournal();
   const todo=plan(sm,journal);
   for(const a of todo){
    if(a.action!=="CREATE")continue;
    const live=state();plan(live,journal);need(!live.has(a.name),"ALIAS_APPEARED_NO_OVERWRITE");
    const raw=keys.get(a.id),encoded=Buffer.from(raw.toString("base64"),"ascii");
    try{
     // Secret payload is stdin only. Never command arguments, logs or files.
     gh(["secret","set",a.name,"--repo",REPO],encoded);
    }finally{encoded.fill(0)}
    const meta=JSON.parse(gh(["api","repos/"+REPO+"/actions/secrets/"+a.name]));
    need(meta.name===a.name&&typeof meta.updated_at==="string"&&Number.isFinite(Date.parse(meta.updated_at)),"SECRET_METADATA_READBACK");
    journal.completed.push({name:a.name,fingerprintSha256:a.fingerprintSha256,updatedAt:meta.updated_at});
    saveJournal(jd,journal);
    console.log(JSON.stringify({status:"EXISTING_SIGNER_ALIAS_INSTALLED_INACTIVE",name:a.name,fingerprintSha256:a.fingerprintSha256,metadataReadback:true}));
   }
   const done=plan(state(),journal);need(done.every(a=>a.action==="REUSE_RECORDED_METADATA")&&journal.completed.length===7,"FINAL_ALIASES_INCOMPLETE");
   console.log(JSON.stringify({status:"SEVEN_EXISTING_SIGNER_ALIASES_COMMISSIONED_INACTIVE_NO_GO",main:PIN,signerCount:6,aliasCount:7,newAliases:todo.filter(a=>a.action==="CREATE").length,verifiedOwnerLocalPublicFingerprints:true,githubSecretNamesAndUpdatedAtReadBack:true,githubSecretValuesReadBack:false,approvalFlagsChanged:0,policySecretsChanged:0,providerCalls:0,databaseWrites:0,workflowDispatches:0,independentCustodyApprovalGranted:false,phase6PaidGo:false}));
  }finally{fs.unlinkSync(lock)}
 }finally{for(const b of keys.values())b.fill(0)}
}
module.exports={inspectState,plan,newJournal,ALIASES,BLOCK_SECRETS,FLAGS};
if(require.main===module)try{run()}catch(e){console.error(/^HOLD_P5_INACTIVE_SIGNERS_[A-Z0-9_]+$/.test(String(e.message??""))?e.message:"HOLD_P5_INACTIVE_SIGNERS_COMMAND_OR_UNKNOWN_WRITE_OUTCOME_NO_REPLAY");process.exitCode=2}
