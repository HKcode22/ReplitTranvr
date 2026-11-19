#!/usr/bin/env node
"use strict";
// Existing B0062/V0093 compiler + existing ledger AUTH verifier + existing
// adb_collection_meta exact manifest key. Not a signer, approver, provider
// client, stage writer, flag setter or paid authorization issuer.
// Run with the pinned repository's existing tsx in a clean detached main
// checkout and actual independently approved private input files only.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const {createRequire}=require("node:module");
const REPO="HKcode22/ReplitTranvr",H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=s=>{throw Error("HOLD_P5_FINAL_OWNER_"+s)},need=(ok,s)=>{if(!ok)hold(s)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),digest=x=>sha(JSON.stringify(x));
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const scope=p=>/^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p);
const cmd=(c,args,opts={})=>execFileSync(c,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:12*1024*1024,...opts}).trim();
const live=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
function privateDir(d){const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function privateFile(dir,name,max=2000000,canonical=true){
 const p=path.join(dir,name),s=fs.lstatSync(p);
 need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>=10&&s.size<=max,"PRIVATE_INPUT_"+name.toUpperCase().replace(/[^A-Z0-9]/g,"_"));
 const raw=fs.readFileSync(p),x=JSON.parse(raw.toString("utf8"));
 if(canonical)need(Buffer.from(JSON.stringify(x)).equals(raw),"NONCANONICAL_PRIVATE_INPUT");
 return {p,raw,x,sha256:sha(raw)};
}
function writeOnce(dir,n,b){
 const raw=Buffer.isBuffer(b)?b:Buffer.from(b),p=path.join(dir,n);
 try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600});return "WRITTEN"}catch(e){
  if(e.code!=="EEXIST")throw e;
  const s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DIFFERS_NO_OVERWRITE");return "EXACT_EXISTING_REUSE";
 }
}
function checkSourceInventory(root,head,manifest,inv){
 need(Array.isArray(inv.x)&&inv.x.length>=100&&inv.x.length===manifest.executableFileCount&&inv.sha256===manifest.sourceInventorySha256,"SOURCE_INVENTORY_DIGEST");
 const entries=execFileSync("git",["ls-tree","-r","-z","--full-tree",head],{cwd:root,encoding:"utf8",timeout:20000,maxBuffer:12*1024*1024}).split("\0").filter(Boolean).map(e=>{
  const ix=e.indexOf("\t"),[mode,type,gitSha]=e.slice(0,ix).split(" ");return {mode,type,gitSha,path:e.slice(ix+1)}
 }).filter(e=>scope(e.path)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 need(entries.length===inv.x.length,"EXECUTABLE_PATH_COUNT_CHANGED");
 for(let i=0;i<entries.length;i++){
  const e=entries[i],v=inv.x[i];need(e.path===v.path&&e.mode===v.mode&&e.type==="blob"&&["100644","100755"].includes(e.mode)&&H.test(v.sha256??""),"SOURCE_PATH_OR_MODE_CHANGED");
  const raw=fs.readFileSync(path.join(root,e.path));need(gitBlob(raw)===e.gitSha&&sha(raw)===v.sha256,"EXECUTABLE_SOURCE_BYTES_CHANGED");
 }
 need(Array.isArray(manifest.bindingDocuments)&&manifest.bindingDocuments.length>=8,"BINDING_DOCUMENTS");
 for(const x of [...manifest.bindingDocuments,manifest.originalSeed,manifest.calendarRevisionReceipt].filter(Boolean)){
  need(typeof x.path==="string"&&x.path.startsWith("data-collection/")&&!x.path.includes("..")&&H.test(x.sha256??""),"BINDING_DOCUMENT_PATH");
  need(sha(execFileSync("git",["show",head+":"+x.path],{cwd:root,timeout:15000,maxBuffer:4*1024*1024}))===x.sha256,"BINDING_DOCUMENT_DRIFT");
 }
 return entries.length;
}
function pubfp(pem){const k=crypto.createPublicKey(pem);need(k.asymmetricKeyType==="ed25519","SIGNER_TYPE");return sha(k.export({type:"spki",format:"der"}))}
function approvedPrivateReview(review,pins,policies){
 // Final private review occurs AFTER final main is pinned. Do not commit
 // code-SHA-containing policy byte hashes into the AUTH approval ledger:
 // this would create a circular Git commit hash. Its actual independent
 // review is represented by the existing protected exact policy SHA inputs.
 need(review?.independentExactPolicyAndDailyReviewApproved===true&&review.independentTransportAndSigningScopeApproved===true&&review.independentStudyTrustPinsApproved===true&&review.independentPostReviewerPinsApproved===true&&review.independentDelegatedNativeReviewApproved===true&&review.independentDelegatedPostAndDayAppendApproved===true,"MISSING_ACTUAL_PRIVATE_POLICY_REVIEW");
 need(review.reviewedMainSha===pins.codeSha&&review.manifestSha256===pins.manifestSha256&&review.configSha256===pins.configSha256&&review.releaseSha256===pins.releaseSha256&&review.rightsSha256===pins.rightsSha256&&review.finalPolicyBundleSha256===policies.sha256,"PRIVATE_POLICY_REVIEW_PIN");
 need(Array.isArray(review.policyDigests)&&review.policyDigests.length===6&&new Set(review.policyDigests.map(x=>x.name)).size===6&&review.policyDigests.every(x=>Object.hasOwn(policies.x,x.name)&&digest(policies.x[x.name])===x.sha256),"PRIVATE_POLICY_REVIEW_EXACT_BYTES");
 need(review.phase6PaidGo===false&&typeof review.reviewedBy==="string"&&review.reviewedBy.trim().length>=3&&typeof review.reviewedAtUtc==="string"&&new Date(review.reviewedAtUtc).toISOString()===review.reviewedAtUtc&&Date.parse(review.reviewedAtUtc)<=Date.parse(pins.nowUtc),"PRIVATE_POLICY_REVIEW_CLOCK");
}
function staticValues(stageRaw,costSha,p,policies,verified){
 const values={
  V39_P5_APPROVED_CODE_SHA:p.codeSha,V39_P5_MANIFEST_SHA256:p.manifestSha256,V39_P5_CALENDAR_HASH:p.calendarSha256,V39_P5_CONFIG_HASH:p.configSha256,V39_P5_FRAME_HASH:p.frameSha256,V39_P5_RELEASE_SHA256:p.releaseSha256,V39_P5_RIGHTS_SHA256:p.rightsSha256,V39_P5_PROVIDER_CONTRACT_SHA256:p.providerContractSha256,
  P6_INERT_STAGE_INPUT_JSON:stageRaw,P6_INERT_STAGE_INPUT_SHA256:sha(stageRaw),P6_INERT_COST_ENVELOPE_SHA256:costSha,
  P6_NONPAID_SOURCE_APPROVED_MAIN_SHA:p.codeSha,V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA:p.codeSha,P5_CD_GH_PRE_APPROVED_CODE_SHA:p.codeSha,V39_P5_POST_APPROVED_CODE_SHA:p.codeSha,
  V39_P5_POST_PROVIDER_CONTRACT_SHA256:p.providerContractSha256,V39_P5_POST_CATEGORY_BUDGET_SHA256:costSha,V39_P5_POST_PRICE_SHA256:policies.P6_NATIVE_POST_POLICY_BASE64.reviewedProviderPriceSha256
 };
 const hashNames={P6_NONPAID_DAILY_POLICY_BASE64:"P6_NONPAID_DAILY_POLICY_SHA256",P6_NONPAID_SIGNING_POLICY_BASE64:"P6_NONPAID_SIGNING_POLICY_SHA256",P6_NONPAID_TRANSPORT_TRUST_BASE64:"P6_NONPAID_TRANSPORT_TRUST_SHA256",P6_NATIVE_POST_POLICY_BASE64:"P6_NATIVE_POST_POLICY_SHA256"};
 for(const d of verified.policyDigests){const raw=JSON.stringify(policies[d.name]);need(sha(raw)===d.sha256,"POLICY_PAYLOAD_DRIFT");values[d.name]=Buffer.from(raw).toString("base64");if(hashNames[d.name])values[hashNames[d.name]]=d.sha256;}
 need(Object.values(values).every(x=>typeof x==="string"&&Buffer.byteLength(x)<=48000),"GITHUB_SECRET_SIZE");
 // NO approval, paid switch, credential or signing key generated here.
 return values;
}
async function storeExactManifest(pool,ctx,auth,manifestRaw,core,checkFresh){
 need(live()===ctx.codeSha,"MAIN_MOVED_BEFORE_MANIFEST_TRANSACTION");
 const key="phase5_frozen_manifest:"+ctx.input.manifestSha256,c=await pool.connect();let began=false,attempted=false,inserted=0;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");began=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,clock_timestamp() now")).rows[0];
  need(who?.db==="neondb"&&who.actor==="neondb_owner"&&who.actor===who.session_actor&&who.ver>=160000&&who.ver<170000&&who.ro==="off"&&who.replica===false,"DISTINCT_EXISTING_OWNER_DB");
  need((await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0]?.ok===true,"PROVIDER_OWNER_LOCK_BUSY");
  await c.query("LOCK TABLE clean.adb_collection_meta,clean.adb_phase6_authorization,clean.adb_incident_stop,clean.adb_probe_budget_day,clean.adb_collection_batches,clean.adb_collection_subs IN SHARE ROW EXCLUSIVE MODE");
  const rows=(await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",[key])).rows;
  const action=core.selectManifestWrite(rows,manifestRaw);
  // Initial storage is before either inert stage. Exact reuse also requires
  // an empty authority; never claim disabled state from raw-file equality.
  core.validateEmptyAuthority((await c.query("SELECT (SELECT count(*)::int FROM clean.adb_phase6_authorization) auth,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') open_budget,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key LIKE 'phase6_source_authorization_enabled:%') prior_enable")).rows);
  checkFresh(new Date((await c.query("SELECT clock_timestamp() t")).rows[0].t));
  if(action==="INSERT_ONCE"){
   const result=await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",[key,manifestRaw]);need(result.rowCount===1,"MANIFEST_INSERT_NOT_EXACT");inserted=1;
  }
  attempted=true;await c.query("COMMIT");began=false;
 }catch(e){if(began&&!attempted)await c.query("ROLLBACK").catch(()=>{});if(attempted)hold("UNKNOWN_MANIFEST_COMMIT_READBACK_ONLY_NO_REPLAY");throw e}
 finally{c.release(attempted&&began?new Error("UNKNOWN_MANIFEST_COMMIT"):undefined)}
 // A new transaction establishes exact raw byte persistence, not simply a
 // committed statement acknowledgement. Never reinsert on read failure.
 const r=await pool.connect();let open=false;
 try{
  await r.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
  await r.query("SET LOCAL statement_timeout='12000ms'");
  const who=(await r.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('transaction_read_only') ro")).rows[0];
  need(who?.db==="neondb"&&who.actor==="neondb_owner"&&who.actor===who.session_actor&&who.ro==="on","MANIFEST_READBACK_OWNER_SCOPE");
  const rows=(await r.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",[key])).rows;
  const authority=(await r.query("SELECT count(*)::int n FROM clean.adb_phase6_authorization")).rows;
  need(authority.length===1&&authority[0].n===0,"AUTHORITY_CREATED_AFTER_MANIFEST_STORAGE_REVIEW");
  need(core.selectManifestWrite(rows,manifestRaw)==="EXACT_EXISTING_REUSE"&&sha(rows[0].value)===ctx.input.manifestSha256,"MANIFEST_EXACT_READBACK");
  await r.query("ROLLBACK");open=false;
  need(live()===ctx.codeSha,"MAIN_MOVED_AFTER_MANIFEST_COMMIT_NO_REPLAY");
  return {status:"EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO",manifestSha256:ctx.input.manifestSha256,authSha256:auth.artifactHash,manifestRowsWritten:inserted,independentReadOnlyBytesMatch:true,providerCalls:0,databaseWrites:inserted,authorizationEnabled:false,phase6PaidGo:false};
 }finally{if(open)await r.query("ROLLBACK").catch(()=>{});r.release()}
}
async function run(){
 const [coreFile,mode,inputDir,expectedPrivateReviewSha]=process.argv.slice(2);
 need(process.argv.length===6&&["VERIFY_AND_EXPORT_EXACT_APPROVED_BUNDLE","STORE_EXACT_APPROVED_MANIFEST_AND_EXPORT_NO_PROVIDER"].includes(mode)&&H.test(expectedPrivateReviewSha??"")&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&![process.env.AERODATABOX_API_KEY,process.env.AERODATABOX_WEBHOOK_SECRET,process.env.RAPIDAPI_KEY].some(Boolean),"EXPLICIT_OWNER_NONPAID_SCOPE");
 const core=require(path.resolve(coreFile)),root=fs.realpathSync(cmd("git",["rev-parse","--show-toplevel"])),head=cmd("git",["rev-parse","HEAD"]);
 need(fs.realpathSync(process.cwd())===root&&C.test(head)&&head===live()&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","CLEAN_EXACT_REMOTE_MAIN");
 need(process.env.V39_P5_APPROVED_CODE_SHA===head,"REVIEWED_MAIN_ENV");
 const dir=privateDir(path.resolve(inputDir));need(dir!==root&&!dir.startsWith(root+path.sep),"PRIVATE_DIR_OUTSIDE_REPO");
 const load=(p,max,canonical)=>privateFile(dir,p,max,canonical),manifest=load("approved-manifest.json"),config=load("approved-config.json"),inv=load("source-inventory.json",4000000),external=load("approved-external-input.json",100000),timing=load("approved-timing-input.json",10000),authFile=load("approved-auth.json",256000,false),policies=load("approved-policy-objects.json",250000),review=load("approved-private-policy-review.json",100000,false),contract=load("public-provider-contract-CANDIDATE.json",20000000,false);
 need(review.sha256===expectedPrivateReviewSha,"INDEPENDENT_PRIVATE_REVIEW_BYTE_PIN");
 need(contract.x.info?.version==="1.15.4.0"&&contract.x.paths?.["/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}"]?.get,"EXACT_PROVIDER_CONTRACT_VERSION_PATH");
 const x=external.x,a=authFile.x;
 need(x.codeSha40===head&&x.manifestSha256===manifest.sha256&&x.configSha256===config.sha256&&x.phase6AuthorizationId===a.authorizationId&&JSON.stringify(x.predecessorEvidenceIds)===JSON.stringify(a.predecessorEvidenceIds),"ACTUAL_EXTERNAL_STAGE_AUTH_PINS");
 const imp=p=>import(pathToFileURL(path.join(root,p)).href);
 const exporter=await imp("scripts/v39_phase6_actual_release_candidate_export_v39.ts");
 const reader=await imp("scripts/v39_phase6_source_enable_approval_ledger_v39.ts");
 const owner=await imp("scripts/v39_phase6_enable_source_owner_v39.ts");
 const stageModule=await imp("scripts/v39_phase6_inert_release_stage_manual_v39.mjs");
 const auth=reader.verifyP6SourceEnableAuthFile(authFile.p,head);need(auth.verdict.verified===true&&auth.artifactHash===authFile.sha256,"EXISTING_SCOPED_LEDGER_AUTH_NOT_APPROVED");
 const result=exporter.compileP6ActualCandidateExport({externalBytes:external.raw,expectedExternalFileSha256:external.sha256,timingBytes:timing.raw,expectedTimingFileSha256:timing.sha256,calendarVariant:"COMPACT_NOV21"});
 const parity=exporter.verifyP6ActualCommittedCheckout(result);
 need(parity.verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388,"REVIEWED_COMPACT_PLAN_BUDGET_DRIFT");
 const stage=result.files.find(f=>f.path==="unsigned-stage-input.json"),costSha=result.summary.unsignedCostOnlyEnvelopeSha256;
 need(stage&&sha(stage.bytes)===stage.sha256&&H.test(costSha??"")&&Buffer.byteLength(stage.bytes)<=48000,"EXACT_STAGE_SECRET_BYTES");
 const ctx=stageModule.admitP6InertOwnerReadback(process.env,stage.bytes,stage.sha256,costSha,head);
 const checkFresh=now=>owner.verifyP6SourceActivationReview({input:ctx.input,review:ctx.review,freezeReview:ctx.freezeReview},auth,now);
 checkFresh(new Date());
 const pins={codeSha:head,manifestSha256:manifest.sha256,configSha256:config.sha256,calendarSha256:x.calendarSha256,frameSha256:x.frameSha256,releaseSha256:review.x.releaseSha256,rightsSha256:a.releaseActivation.sourceRightsEvidenceSha256,providerContractSha256:contract.sha256,costSha256:costSha,sourceInventorySha256:inv.sha256,executableFileCount:inv.x.length,dayPlanSha256s:result.summary.dayPlanSha256s,airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",dailyRestCeiling:1900,cycleRestCeiling:x.cycleRestCeilingUnits,minimumProtectedFloor:x.protectedRestFloorUnits,maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:"2026-12-26T04:00:00.000Z"};
 const ops={hash:digest,publicFingerprint:pubfp,byteLength:Buffer.byteLength};
 core.verifyFinalManifest(manifest.x,config.x,pins,ops);
 checkSourceInventory(root,head,manifest.x,inv);
 // The declared rights hash is the actual ledger-bound rights evidence.
 // Release scope digest is separately reviewed, and must not be the hash
 // of commitments containing these same policy hashes.
 approvedPrivateReview(review.x,pins,policies);
 const verified=core.validateFinalPolicies(policies.x,pins,ops);
 need(live()===head,"MAIN_CHANGED_BEFORE_EXPORT");
 const values=staticValues(stage.bytes,costSha,pins,policies.x,verified);
 const out=path.join(dir,"exact-final-commissioning-"+head.slice(0,12));
 try{fs.mkdirSync(out,{mode:0o700})}catch(e){if(e.code!=="EEXIST")throw e}privateDir(out);
 const packageReceipt={schema:"v39.phase5.exact-final-commissioning-bundle.v1",status:"EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH",main:head,manifestSha256:pins.manifestSha256,configSha256:pins.configSha256,calendarSha256:pins.calendarSha256,sourceInventorySha256:inv.sha256,executableFiles:inv.x.length,authorizationId:a.authorizationId,authArtifactSha256:auth.artifactHash,stageSha256:stage.sha256,costEnvelopeSha256:costSha,approvedPrivatePolicyReviewSha256:review.sha256,policyBundleSha256:policies.sha256,policyDigests:verified.policyDigests,policySizes:verified.policySizes,verifiedPlanCount:31,plannedQueries:6144,reservedRestUnits:37388,staticSecretsPrepared:Object.keys(values).length,approvalFlagsPrepared:0,githubMutations:0,providerCalls:0,phase6PaidGo:false};
 writeOnce(out,"exact-approved-stage-input.json",stage.bytes);writeOnce(out,"static-secret-values-PRIVATE.json",JSON.stringify(values));writeOnce(out,"bundle-receipt.json",JSON.stringify(packageReceipt));
 console.log(JSON.stringify(packageReceipt));
 if(mode==="STORE_EXACT_APPROVED_MANIFEST_AND_EXPORT_NO_PROVIDER"){
  need(!process.env.V39_DATABASE_RUNTIME_URL||process.env.V39_DATABASE_RUNTIME_URL!==ctx.url,"OWNER_RUNTIME_URL_NOT_DISTINCT");
  const u=new URL(ctx.url);need(decodeURIComponent(u.username)==="neondb_owner","EXISTING_OWNER_URL");
  u.searchParams.set("sslmode","verify-full");
  const {Pool}=createRequire(path.join(root,"package.json"))("pg");
  const pool=new Pool({connectionString:u.toString(),max:2,connectionTimeoutMillis:8000,query_timeout:20000,application_name:"p5_exact_approved_manifest_store"});
  try{console.log(JSON.stringify(await storeExactManifest(pool,ctx,auth,manifest.raw.toString("utf8"),core,checkFresh)))}finally{await pool.end()}
 }
}
module.exports={approvedPrivateReview,staticValues,storeExactManifest};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^(?:HOLD_P5_FINAL_OWNER|HOLD_P5_FINAL_BUNDLE|HOLD_P6_EXACT_SOURCE_AUTH|HOLD_P6_ACTUAL_RELEASE_EXPORT|HOLD_P6_INERT_RELEASE)_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_FINAL_OWNER_REDACTED_NO_REPLAY");process.exitCode=2});
