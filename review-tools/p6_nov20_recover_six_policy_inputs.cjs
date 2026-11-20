#!/usr/bin/env node
"use strict";
// Recover only missing historical policy workpapers; no new signing key, source
// records, provider API requests, DB writes, GitHub writes or approval.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {createRequire}=require("node:module");
const BASE="0a7b1a28f243de76d4c83026d15f585265ef6f7b";
const WORK="7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e";
const CAT="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534";
const CONTRACT="63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09";
const STAGE="6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc";
const MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7";
const CONFIG="001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88";
const CAL="9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6";
const COST="a3d3525a890bfe542f9588b18d3b5d9367ba657ccae2c1c0401edc625ac46124";
const FIXTURE="f5b5b553b52d9e426727c343d439d19f5187a825";
const ASSEMBLER="3402d8c11b5c3d333b4fd216ca5398f1c4ae92c6";
const TZ="7adbd255fae4aa1921a8489dcecf10d903541bab";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hashObject=o=>sha(JSON.stringify(o));
const hold=s=>{throw Error("HOLD_P6_POLICY_RECOVERY_"+s)};
const need=(ok,s)=>{if(!ok)hold(s)};
const gitBlob=b=>crypto.createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
const cmd=(c,a)=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:4000000,stdio:["ignore","pipe","ignore"]}).trim();
const remote=()=>cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
const rawBlob=id=>{const raw=Buffer.from(cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/blobs/"+id,"--jq",".content"]),"base64");need(gitBlob(raw)===id,"ARCHIVE_BLOB");return raw};
function readExact(p,h,max=2000000){
 const s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");
 const raw=fs.readFileSync(p);need(sha(raw)===h,"EXACT_FILE_DIGEST");return raw;
}
function directory(p){const s=fs.lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return fs.realpathSync(p)}
function recoverWorkpaper(fixture,catalog,publicContract,archive){
 const work=JSON.parse(JSON.stringify(fixture)),rows=archive.originalScopeProjection(),scope=archive.scope(rows);
 need(work.status==="SIX_POLICY_SHAPES_CANDIDATE_ONLY_NOT_RUNTIME"&&work.manifestApproved===false&&work.phase6PaidGo===false&&Object.keys(work.policyDrafts).length===6,"ARCHIVE_SCOPE");
 need(hashObject(catalog)===CAT&&scope.fixed.length===19&&scope.cells.length===12&&hashObject(scope)==="ce9bd17c2011564dd6c9d941acfdb0eee47bf18e6a503b10f4353f588ca5bd38","EXACT_CATALOG_SCOPE");
 const stats=archive.validateCatalog(catalog,scope.fixed);
 need(sha(publicContract)===CONTRACT,"HISTORICAL_PUBLIC_CONTRACT_CHANGED");
 const pub=archive.inspectPublicContract(publicContract);
 const daily=work.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64;
 need(daily.airportTimezoneGroups===null&&daily.delegatedDailyPacketProductionApproved===false,"UNAPPROVED_DRAFT");
 daily.airportTimezoneGroups=catalog.airportTimezoneGroups;
 work.contractCandidate={...work.contractCandidate,...pub,rawBytesReviewed:false};
 work.status="PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME";
 work.timezoneScopeProof={originalCalendarSha256:"45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c",compactCalendarSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",originalCatalogSha256:CAT,scopeSha256:hashObject(scope),fixedAirportCount:scope.fixed.length,adaptiveCellCount:scope.cells.length,catalogAirports:stats.airports,catalogGroups:stats.groups,scopeProjectionSha256:"4b298ed185aab5938f8de32c3a80231ccc1069a00359ffb55df67d11a9548cfe",independentFinalPolicyApproval:false};
 work.candidateCategoryRowsSha256="a49720f28ce10019ee049436086e1734ac6ee2ec0f24189621aab2e32583ad6a";
 const raw=JSON.stringify(work);
 need(sha(raw)===WORK&&Buffer.byteLength(raw)===34693,"HISTORICAL_WORKPAPER_REPRODUCTION");
 return raw;
}
async function main(){
 const [mode,rev,out,contractFile]=process.argv.slice(2);
 need(mode==="--recover-private"&&process.argv.length===6&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET"].some(k=>process.env[k]),"OWNER_NO_PROVIDER_SCOPE");
 const root=fs.realpathSync(cmd("git",["rev-parse","--show-toplevel"]));
 const home=fs.realpathSync(process.env.HOME);
 need(remote()===BASE&&fs.realpathSync(process.cwd())===root,"EXACT_CURRENT_MAIN");
 const d=directory(rev),dest=path.resolve(out);
 need(path.dirname(dest)===home&&path.basename(dest).startsWith(".travnr-phase6-policy-recovery-")&&!fs.existsSync(dest)&&!d.startsWith(root+path.sep),"PRIVATE_OUTPUT");
 const stageRaw=readExact(path.join(d,"new-stage-input.json"),STAGE,48000),stage=JSON.parse(stageRaw);
 readExact(path.join(d,"new-manifest.json"),MANIFEST);readExact(path.join(d,"new-config.json"),CONFIG);
 need(stage.codeSha40===BASE&&stage.manifestSha256===MANIFEST&&stage.configSha256===CONFIG&&stage.calendarSha256===CAL&&stage.calendarDays.length===31&&stage.calendarDays[0].startUtc==="2026-11-22T00:00:00.000Z","REVISED_STAGE");
 const contract=readExact(contractFile,CONTRACT,20000000);
 need(process.env.DATABASE_URL&&process.env.DATABASE_URL!==process.env.V39_DATABASE_RUNTIME_URL,"EXISTING_OWNER_URL");
 const temp=fs.mkdtempSync(path.join(home,".travnr-policy-temp-"));
 try{
  const a=path.join(temp,"archive.cjs"),t=path.join(temp,"timezone.cjs");
  fs.writeFileSync(a,rawBlob(ASSEMBLER),{mode:0o600,flag:"wx"});fs.writeFileSync(t,rawBlob(TZ),{mode:0o600,flag:"wx"});
  const archive=require(a),tz=require(t),fixture=JSON.parse(rawBlob(FIXTURE));
  const {Pool}=createRequire(path.join(root,"package.json"))("pg");
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p6_exact_policy_catalog_readonly"});
  let snapshot;
  try{const c=await pool.connect();try{
   const who=(await c.query("SELECT current_user actor,session_user login")).rows[0];
   need(who?.actor==="neondb_owner"&&who.login===who.actor,"OWNER_ACTOR");
   snapshot=await tz.readOwnerSnapshot(c);
  }finally{c.release()}}finally{await pool.end()}
  const rows=archive.originalScopeProjection(),r=tz.buildCatalog(snapshot.rows,rows);
  need(r.privateCandidate&&r.fixedAirportCount===19&&r.adaptiveCellCount===12&&r.requiredAirportCount===1017&&r.groupCount===168&&!r.missingOrInvalidTimezoneCount&&!r.invalidRequiredCodeCount,"CATALOG_COVERAGE");
  // Historical and revised selection scope, including all tiers/regions, must agree.
  need(hashObject(archive.scope(stage.calendarDays))===hashObject(archive.scope(rows)),"REVISED_SCOPE_CHANGED");
  const raw=recoverWorkpaper(fixture,r.privateCandidate,contract,archive);
  need(remote()===BASE,"MAIN_CHANGED_AFTER_READ");
  fs.mkdirSync(dest,{mode:0o700});
  const write=(name,bytes)=>fs.writeFileSync(path.join(dest,name),bytes,{mode:0o600,flag:"wx"});
  write("policy-complete-shape-NOT-RUNTIME.json",raw);
  write("airport-timezone-catalog-CANDIDATE.json",JSON.stringify(r.privateCandidate));
  write("public-provider-contract-CANDIDATE.json",contract);
  const statics={V39_P5_MANIFEST_SHA256:MANIFEST,V39_P5_CALENDAR_HASH:CAL,V39_P5_CONFIG_HASH:CONFIG,V39_P5_FRAME_HASH:stage.frameSha256,V39_P5_POST_CATEGORY_BUDGET_SHA256:COST,P6_INERT_STAGE_INPUT_JSON:stageRaw.toString("utf8"),P6_INERT_STAGE_INPUT_SHA256:STAGE,P6_INERT_COST_ENVELOPE_SHA256:COST};
  write("revised-static-inputs-PRIVATE.json",JSON.stringify(statics));
  const receipt={status:"EXACT_SIX_POLICY_WORKPAPER_RECOVERED_AND_REVISED_STATIC_INPUTS_PREPARED_NO_GO",main:BASE,workpaperSha256:WORK,catalogSha256:CAT,contractSha256:CONTRACT,stageSha256:STAGE,staticCandidateSha256:hashObject(statics),staticNames:Object.keys(statics),catalogAirports:1017,catalogGroups:168,observedAtUtc:snapshot.observedUtc,output:dest,policyInstalled:false,independentPolicyApproval:false,providerApiCalls:0,databaseWrites:0,githubWrites:0,phase6PaidGo:false};
  write("recovery-receipt.json",JSON.stringify(receipt));console.log(JSON.stringify(receipt));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}
module.exports={recoverWorkpaper};
if(require.main===module)main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_(?:P6_POLICY_RECOVERY|P5_PRIVATE_POLICY|P5_TIMEZONE)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_POLICY_RECOVERY_REDACTED");process.exitCode=2});
