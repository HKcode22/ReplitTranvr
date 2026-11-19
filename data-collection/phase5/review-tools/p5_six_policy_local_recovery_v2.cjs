#!/usr/bin/env node
"use strict";
// Owner-local reuse of already verified private bytes. No provider, DB, secret,
// signature, or dispatch. Output is deliberately non-runtime, never approval.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {createRequire}=require('node:module');
function check(ok,r){if(!ok)throw Error("HOLD_P5_PRIVATE_POLICY_"+r)}
function moveCalendar(rows,c){
 check(Array.isArray(rows)&&rows.length===31&&Array.isArray(c?.rows)&&c.rows.length===31,"SHAPE");
 return rows.map((r,i)=>{const p=c.rows[i];check(r.runDayIndex===i+1&&p.runDayIndex===i+1&&r.startUtc===p.originalStartUtc&&r.anchorIcao===p.anchorIcao,"ASSIGNMENT");check(typeof p.startUtc==="string"&&Number.isFinite(Date.parse(p.startUtc))&&new Date(p.startUtc).toISOString()===p.startUtc&&p.startUtc.slice(11)===r.startUtc.slice(11),"DATE_ONLY");return {...r,startUtc:p.startUtc,budgetDayId:"p5-f8-"+p.startUtc.slice(0,10).replace(/-/g,"")+"-"+String(i+1).padStart(2,"0")}});
}
function scope(rows){
 const fixed=new Set(),cells=new Set(),slots=["HUB","MID_A","MID_B","REGIONAL"];
 for(const r of rows){check(r.slotRegions&&slots.every(s=>typeof r.slotRegions[s]==="string"&&r.slotRegions[s]),"REGIONS");
 if(r.pairAirportSet){for(const s of slots){const a=r.pairAirportSet[s];check(a&&/^[A-Z]{4}$/.test(a.icao)&&a.region===r.slotRegions[s],"PAIR");fixed.add(a.icao)}}else{check(/^[A-Z]{4}$/.test(r.anchorIcao),"ANCHOR");fixed.add(r.anchorIcao);for(const s of slots.slice(1))cells.add(JSON.stringify([s==="REGIONAL"?"REGIONAL":"MID",r.slotRegions[s]]))}}
 return {fixed:[...fixed].sort(),cells:[...cells].sort()};
}
function validateCatalog(c,required,expectedAirports=1017,expectedGroups=168){
 check(c&&Object.keys(c).length===1&&Array.isArray(c.airportTimezoneGroups)&&c.airportTimezoneGroups.length===expectedGroups,"GROUPS");const seen=new Set(),zones=new Set();
 for(const g of c.airportTimezoneGroups){check(g&&typeof g.ianaTimezone==="string"&&g.ianaTimezone.length>0&&g.ianaTimezone.length<=80&&!zones.has(g.ianaTimezone)&&Array.isArray(g.icaos)&&g.icaos.length>0,"GROUP");try{new Intl.DateTimeFormat("en-US",{timeZone:g.ianaTimezone}).format(0)}catch{check(false,"TIMEZONE")};zones.add(g.ianaTimezone);for(const i of g.icaos){check(typeof i==="string"&&/^[A-Z]{4}$/.test(i)&&!seen.has(i),"ICAO");seen.add(i)}}
 check(seen.size===expectedAirports&&required.every(i=>seen.has(i)),"COVERAGE");return {airports:seen.size,groups:zones.size};
}
const PIN="70580b3749544dfcbeff39da181b2aa42b1b4476";
const OLD="45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c";
const COMPACT="7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c";
const CAT="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534";
const SCOPE_PROJECTION="4b298ed185aab5938f8de32c3a80231ccc1069a00359ffb55df67d11a9548cfe";
const SCOPE_DIGEST="ce9bd17c2011564dd6c9d941acfdb0eee47bf18e6a503b10f4353f588ca5bd38";
const MANIFEST="9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25";
const CONFIG="4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb";
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const digest=x=>hash(JSON.stringify(x));
const gh=args=>execFileSync("gh",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:3*1024*1024}).trim();
const head=()=>gh(["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
function blob(id){const b=Buffer.from(gh(["api","repos/HKcode22/ReplitTranvr/git/blobs/"+id,"--jq",".content"]),"base64");check(crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")===id,"BLOB");return JSON.parse(b.toString("utf8"))}
function exact(p,sha){const st=fs.lstatSync(p);check(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.size<=10*1024*1024,"FILE");const b=fs.readFileSync(p);check(hash(b)===sha,"DIGEST");return JSON.parse(b.toString("utf8"))}
function privateDir(p){const st=fs.lstatSync(p);return st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0}
// Only date-independent selection fields projected from the actual previously
// fetched historical Actions archive 14212961986. No seed or private catalog
// included here. The 31-row projection has its own exact SHA256.
function originalScopeProjection(){
 const pairs=[
 ["OMAA","Gulf/Africa","Gulf/Africa","South America","North America","OMSJ","SPJC","KDEC"],
 ["WSSS","Asia-Pacific","South America","North America","Europe","SBFL","TJSJ","LSZB"],
 ["YSSY","Oceania","North America","Europe","Oceania","KBUF","LFQQ","NZNP"],
 ["SKBO","South America","Europe","Oceania","Asia-Pacific","EBAW","NZNS","RJNK"],
 ["SKBO","South America","Oceania","Asia-Pacific","Gulf/Africa","YBUD","RKTU","FAKM"]];
 const rows=[...pairs,["WSSS","Asia-Pacific","Asia-Pacific","Gulf/Africa","South America"],...pairs,
 ["YSSY","Oceania","Gulf/Africa","South America","Europe"],
 ["OMAA","Gulf/Africa","Europe","Gulf/Africa","North America"],
 ["WSSS","Asia-Pacific","South America","Oceania","Asia-Pacific"],
 ["YSSY","Oceania","North America","Asia-Pacific","Gulf/Africa"],
 ["OMAA","Gulf/Africa","Oceania","North America","Oceania"],
 ["SKBO","South America","Asia-Pacific","Europe","South America"],
 ["OMAA","Gulf/Africa","Gulf/Africa","North America","Asia-Pacific"],
 ["YSSY","Oceania","Asia-Pacific","Asia-Pacific","Europe"],
 ["WSSS","Asia-Pacific","Europe","Gulf/Africa","Oceania"],
 ["SKBO","South America","South America","South America","Gulf/Africa"],
 ["WSSS","Asia-Pacific","Oceania","Oceania","North America"],
 ["SKBO","South America","North America","Europe","South America"],
 ["OMAA","Gulf/Africa","Oceania","North America","Asia-Pacific"],
 ["YSSY","Oceania","Europe","South America","North America"],
 ["OMAA","Gulf/Africa","North America","Asia-Pacific","Europe"],
 ["WSSS","Asia-Pacific","Asia-Pacific","Europe","Gulf/Africa"],
 ["YSSY","Oceania","South America","Oceania","Oceania"],
 ["SKBO","South America","Gulf/Africa","Gulf/Africa","South America"],
 ["OMAA","Gulf/Africa","South America","Europe","Europe"],
 ["WSSS","Asia-Pacific","Asia-Pacific","North America","Oceania"]];
 const out=rows.map(([anchorIcao,HUB,MID_A,MID_B,REGIONAL,a,b,c],i)=>({
 runDayIndex:i+1,slotRegions:{HUB,MID_A,MID_B,REGIONAL},anchorIcao,
 pairAirportSet:a?{HUB:{icao:anchorIcao,region:HUB},MID_A:{icao:a,region:MID_A},MID_B:{icao:b,region:MID_B},REGIONAL:{icao:c,region:REGIONAL}}:null}));
 check(out.length===31&&digest(out)===SCOPE_PROJECTION,"SCOPE_PROJECTION_DRIFT");return out;
}
function dirs(home){
 const out=[];
 function visit(p,depth){let st;try{st=fs.lstatSync(p)}catch(e){if(e.code==="ENOENT")return;throw e}
 if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)return;
 out.push(p);
 if(depth)for(const n of fs.readdirSync(p,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.isSymbolicLink()).sort((a,b)=>a.name.localeCompare(b.name)))visit(path.join(p,n.name),depth-1);
 check(out.length<=512,"PRIVATE_DIR_SEARCH_BOUND");}
 for(const n of fs.readdirSync(home).filter(n=>/^\.phase5-(?:review|final-review|timezone|policy|recovered-review)[A-Za-z0-9_-]*$/.test(n)).sort())visit(path.join(home,n),2);
 return out;
}
function findMatching(ds,name,sha){
 const matches=[];let named=0,unsafe=0,different=0;
 for(const d of ds){const p=path.join(d,name);let st;try{st=fs.lstatSync(p)}catch(e){if(e.code==="ENOENT")continue;throw e}
 named++;if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0||st.size>10*1024*1024){unsafe++;continue;}
 const b=fs.readFileSync(p);if(hash(b)!==sha){different++;continue;}matches.push({dir:d,raw:b,value:JSON.parse(b.toString("utf8"))});}
 return {matches,named,unsafe,different};
}
function findCandidate(ds){
 const m=findMatching(ds,"manifest-candidate.json",MANIFEST),c=findMatching(ds,"config-candidate.json",CONFIG);
 for(const x of m.matches){const y=c.matches.find(z=>z.dir===x.dir);if(!y)continue;
 const manifest=x.value,cfg=y.value;
 check(manifest.scientificFreezeApproved===false&&manifest.finalPredecessorsApproved===false&&manifest.phase6PaidGo===false&&manifest.configCandidateSha256===CONFIG&&cfg.status==="PROPOSED_NOT_FROZEN"&&cfg.calendarRowsSha256===COMPACT,"CANDIDATE_SCOPE");return {d:x.dir,cfg};}
 return null;
}
function rawBlob(id){
 const b=Buffer.from(gh(["api","repos/HKcode22/ReplitTranvr/git/blobs/"+id,"--jq",".content"]),"base64");
 check(crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")===id,"RECOVERY_BLOB");return b;
}
function recoverManifest(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p5-policy-manifest-recover-"));
 try{const names=[["recover.cjs","ca216ba1c2d1a64a1fada6b4f72a5bac5ffc4503"],["helper.cjs","62ffb5537748e4d50ed5c2d54be92e5d16c51814"],["index.json","6b626c5f34a0891d1322eb150d97456a7ed95d02"]];
 for(const [n,id] of names)fs.writeFileSync(path.join(tmp,n),rawBlob(id),{flag:"wx",mode:0o600});
 execFileSync(process.execPath,[path.join(tmp,"recover.cjs"),path.join(tmp,"helper.cjs"),path.join(tmp,"index.json")],{stdio:"inherit",timeout:600000});
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
async function recoverCatalog(rows,outDir){
 check(process.env.DATABASE_URL&&process.env.V39_DATABASE_RUNTIME_URL&&process.env.DATABASE_URL!==process.env.V39_DATABASE_RUNTIME_URL,"EXISTING_DISTINCT_OWNER_URL_REQUIRED");
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p5-policy-tz-recover-"));
 let pool;
 try{
 const p=path.join(tmp,"tz.cjs");fs.writeFileSync(p,rawBlob("7adbd255fae4aa1921a8489dcecf10d903541bab"),{flag:"wx",mode:0o600});
 const tz=require(p),root=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim();
 const {Pool}=createRequire(path.join(root,"package.json"))("pg");
 pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000});
 const client=await pool.connect();let snapshot;try{snapshot=await tz.readOwnerSnapshot(client)}finally{client.release()}
 const r=tz.buildCatalog(snapshot.rows,rows);
 check(r.privateCandidate&&r.requiredAirportCount===1017&&r.groupCount===168&&r.missingOrInvalidTimezoneCount===0&&r.invalidRequiredCodeCount===0,"CATALOG_RECOVERY_INCOMPLETE");
 const raw=Buffer.from(JSON.stringify(r.privateCandidate));check(hash(raw)===CAT,"CATALOG_RECOVERY_DIFFERS_FROM_PRIOR");check(head()===PIN,"MAIN_CHANGED_AFTER_CATALOG_RECOVERY");
 // Only after exact prior equality, write the private recovered bytes.
 writeOnce(path.join(outDir,"airport-timezone-catalog-CANDIDATE.json"),raw);
 return {value:r.privateCandidate,disposition:"RECOVERED_EXACT_PRIOR_BYTES_READONLY"};
 }finally{if(pool)await pool.end();fs.rmSync(tmp,{recursive:true,force:true})}
}
function inspectPublicContract(b){
 check(Buffer.isBuffer(b)&&b.length>0&&b.length<=20*1024*1024,"CONTRACT_SIZE");
 const c=JSON.parse(b.toString("utf8"));
 check(typeof c.openapi==="string"&&c.info?.version==="1.15.4.0"&&c.paths&&typeof c.paths==="object","CONTRACT_VERSION");
 const k="/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}";
 check(c.paths[k]?.get&&typeof c.paths[k].get==="object","CONTRACT_FIDS_PATH");
 return {rawSha256:hash(b),bytes:b.length,version:c.info.version,fidsPath:k};
}
function writeOnce(p,b){
 const raw=Buffer.isBuffer(b)?b:Buffer.from(b,"utf8");
 try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600});return "WRITTEN"}catch(e){if(e.code!=="EEXIST")throw e;const st=fs.lstatSync(p);check(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.size===raw.length&&fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DRIFT");return "EXACT_EXISTING_REUSED"}
}
async function run(){
 check(process.env.GITHUB_ACTIONS!=="true"&&process.argv.length===3,"OWNER_ONLY");check(head()===PIN,"MAIN_CHANGED");
 const home=fs.realpathSync(os.homedir());
 let ds=dirs(home),b=findCandidate(ds),manifestDisposition="EXISTING_EXACT";
 if(!b){console.log(JSON.stringify({status:"P5_POLICY_EXACT_MANIFEST_LOCAL_RECOVERY_REQUIRED",privateDirectoryCount:ds.length}));recoverManifest();ds=dirs(home);b=findCandidate(ds);manifestDisposition="RECOVERED_EXACT";}
 check(b,"EXACT_MANIFEST_OR_CONFIG_NOT_FOUND_AFTER_RECOVERY");
 const oldCatalog=findMatching(ds,"airport-timezone-catalog-CANDIDATE.json",CAT);
 const rows=originalScopeProjection(),s=scope(rows);
 check(s.fixed.length===19&&s.cells.length===12&&digest(s)===SCOPE_DIGEST,"SCOPE_CHANGED");
 const compact=blob("ee17a694594356e2b0c772545c490c198db11b42"),work=blob("f5b5b553b52d9e426727c343d439d19f5187a825");
 check(compact.status==="PROSPECTIVE_COMPACT_REVIEW_NOT_RELEASE"&&compact.phase6PaidGo===false&&compact.cases[0].totalReserve===37388,"COMPACT_SCOPE");
 check(work.main===PIN&&work.manifestCandidateSha256===MANIFEST&&work.manifestApproved===false&&work.phase6PaidGo===false,"WORKPAPER_SCOPE");
 check(compact.cases[0].rows.length===31&&compact.cases[0].rows.every((r,i)=>r.runDayIndex===rows[i].runDayIndex&&r.anchorIcao===rows[i].anchorIcao&&JSON.stringify(r.fixedKnownAirportSet)===JSON.stringify(rows[i].pairAirportSet?Object.fromEntries(Object.entries(rows[i].pairAirportSet).map(([k,v])=>[k,v.icao])):null)),"COMPACT_FIXED_SCOPE_DRIFT");
 const catalog=oldCatalog.matches.length?{value:oldCatalog.matches[0].value,disposition:"EXISTING_EXACT"}:await recoverCatalog(rows,b.d);
 const stats=validateCatalog(catalog.value,s.fixed);
 const daily=work.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64;
 check(daily.delegatedDailyPacketProductionApproved===false&&daily.airportTimezoneGroups===null&&daily.airportFrames===undefined,"DRAFT_SCOPE");
 daily.airportTimezoneGroups=catalog.value.airportTimezoneGroups;
 check(Object.keys(work.policyDrafts).length===6&&daily.nativeLaterReview?.approved===false&&daily.nativePreFeatureReview?.approved===false&&work.policyDrafts.P6_NATIVE_POST_POLICY_BASE64?.independentPostRequestGeometryApproved===false,"SIX_POLICY_SCOPE");
 const contractFile=fs.lstatSync(process.argv[2]);check(contractFile.isFile()&&!contractFile.isSymbolicLink()&&contractFile.size>0&&contractFile.size<=20*1024*1024,"CONTRACT_FILE");
 const contractRaw=fs.readFileSync(process.argv[2]),publicContract=inspectPublicContract(contractRaw);
 work.contractCandidate={...work.contractCandidate,...publicContract,rawBytesReviewed:false};
 const dailyBytes=Buffer.byteLength(JSON.stringify(daily));check(dailyBytes<=35000,"DAILY_SIZE");
 work.status="PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME";
 work.timezoneScopeProof={originalCalendarSha256:OLD,compactCalendarSha256:COMPACT,originalCatalogSha256:CAT,scopeSha256:digest(s),fixedAirportCount:s.fixed.length,adaptiveCellCount:s.cells.length,catalogAirports:stats.airports,catalogGroups:stats.groups,scopeProjectionSha256:SCOPE_PROJECTION,independentFinalPolicyApproval:false};
 work.candidateCategoryRowsSha256=b.cfg.physicalUtcCategoryRowsSha256;
 check(work.candidateCategoryRowsSha256==="a49720f28ce10019ee049436086e1734ac6ee2ec0f24189621aab2e32583ad6a","CATEGORY_DIGEST");
 // Do not assign approved provider/budget/rights/release digests or approval booleans.
 check(head()===PIN,"MAIN_CHANGED_AFTER_ASSEMBLY");
 const out=path.join(b.d,"policy-complete-shape-NOT-RUNTIME.json"),raw=JSON.stringify(work);
 const contractDisposition=writeOnce(path.join(b.d,"public-provider-contract-CANDIDATE.json"),contractRaw);
 const workpaperDisposition=writeOnce(out,raw);
 console.log(JSON.stringify({status:work.status,main:PIN,manifestCandidateSha256:MANIFEST,timezoneScopeProof:work.timezoneScopeProof,candidateCategoryRowsSha256:work.candidateCategoryRowsSha256,privateWorkpaperSha256:hash(raw),privateWorkpaperBytes:Buffer.byteLength(raw),dailyPolicyCandidateBytes:dailyBytes,publicContractCandidate:publicContract,contractDisposition,workpaperDisposition,policyCount:6,policyInstalled:false,providerCalls:0,databaseWrites:0,githubMutations:0,manifestDisposition,catalogDisposition:catalog.disposition,catalogReadOnlyRecoveryPerformed:catalog.disposition!=="EXISTING_EXACT",phase6PaidGo:false}));
}
module.exports={moveCalendar,scope,validateCatalog,inspectPublicContract,writeOnce,originalScopeProjection,dirs,findMatching,findCandidate};
if(require.main===module)run().catch(e=>{const s=String(e.message||"");console.error(/^HOLD_P5_PRIVATE_POLICY_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_PRIVATE_POLICY_REDACTED");process.exitCode=2});
