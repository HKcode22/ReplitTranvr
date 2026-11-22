#!/usr/bin/env node
"use strict";
// Owner-side exact candidate recovery. No source collection, DB write, new
// authority or final decision. Use actual existing frame in read-only tx.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process"),{createRequire}=require("node:module");
const R="HKcode22/ReplitTranvr",PIN="27074feda386247c4faf3877bd5349e696cde8a9";
const home=fs.realpathSync(os.homedir()),dst=path.join(home,".travnr-phase6-six-policy-exact-recovered-27074fed");
const hashes={"policy-complete-shape-NOT-RUNTIME.json":"7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e","airport-timezone-catalog-CANDIDATE.json":"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534","public-provider-contract-CANDIDATE.json":"63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09"};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),digest=x=>sha(JSON.stringify(x));
const check=(x,s)=>{if(!x)throw Error("HOLD_P6_SIX_RECOVERY_"+s)};
const cmd=(c,a,o={})=>execFileSync(c,a,{stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:5*1024*1024,...o});
const main=()=>cmd("gh",["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"],{encoding:"utf8"}).trim();
const blob=id=>{const b=Buffer.from(cmd("gh",["api","repos/"+R+"/git/blobs/"+id,"--jq",".content"],{encoding:"utf8"}),"base64");check(crypto.createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")===id,"GIT_BLOB");return b};
function files(){
 const all=[];
 function visit(d,depth){let st;try{st=fs.lstatSync(d)}catch{return}
  if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid())return;
  const entries=fs.readdirSync(d,{withFileTypes:true});
  for(const e of entries){
   const p=path.join(d,e.name);
   if(e.isFile()&&Object.hasOwn(hashes,e.name)||e.isFile()&&/^(reviewed-final-policy-binding-decisions|reviewed-final-core-scope-decisions|approved-private-policy-review|static-values-PRIVATE|six-policy-objects-PRIVATE|bundle-receipt)\.json$/.test(e.name)) all.push(p);
   if(depth&&e.isDirectory()&&!/^(node_modules|\.git|\.cache)$/.test(e.name))visit(p,depth-1);
  }
  check(all.length<512,"INVENTORY_BOUND");
 }
 for(const e of fs.readdirSync(home,{withFileTypes:true}))if(e.isDirectory()&&/^\.(?:phase5-|travnr-)/.test(e.name))visit(path.join(home,e.name),4);
 return all;
}
function exactFile(f,h){try{const st=fs.lstatSync(f);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||st.size>20*1024*1024)return null;const b=fs.readFileSync(f);return sha(b)===h?b:null}catch{return null}}
function write(n,b){check(sha(b)===hashes[n],"EXACT_DIGEST");const p=path.join(dst,n);try{fs.writeFileSync(p,b,{mode:0o600,flag:"wx"})}catch(e){if(e.code!=="EEXIST"||!exactFile(p,hashes[n]))throw e}fs.chmodSync(p,0o600)}
async function run(){
 check(process.env.GITHUB_ACTIONS!=="true"&&main()===PIN&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!process.env.AERODATABOX_API_KEY&&!process.env.RAPIDAPI_KEY&&!process.env.AERODATABOX_WEBHOOK_SECRET,"OWNER_NONPAID_SCOPE");
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"p6-exact-six-"));
 try {
 const inv=files(),found={};
 for(const n of Object.keys(hashes)){
  for(const f of inv.filter(f=>path.basename(f)===n)){const b=exactFile(f,hashes[n]);if(b){found[n]=b;console.log(JSON.stringify({status:"EXACT_PRIOR_LOCAL_FILE_REUSED",file:n,location:f,sha256:hashes[n]}));break}}
 }
 const old=path.join(temp,"prior.cjs"),tzp=path.join(temp,"tz.cjs");
 fs.writeFileSync(old,blob("3402d8c11b5c3d333b4fd216ca5398f1c4ae92c6"),{mode:0o600});
 fs.writeFileSync(tzp,blob("7adbd255fae4aa1921a8489dcecf10d903541bab"),{mode:0o600});
 const a=require(old),tz=require(tzp),rows=a.originalScopeProjection(),scope=a.scope(rows);
 check(scope.fixed.length===19&&scope.cells.length===12&&digest(scope)==="ce9bd17c2011564dd6c9d941acfdb0eee47bf18e6a503b10f4353f588ca5bd38","ORIGINAL_SCOPE");
 const wn="policy-complete-shape-NOT-RUNTIME.json",cn="airport-timezone-catalog-CANDIDATE.json",pn="public-provider-contract-CANDIDATE.json";
 let catalog;
 if(found[cn])catalog=JSON.parse(found[cn].toString("utf8"));
 else if(found[wn]){catalog={airportTimezoneGroups:JSON.parse(found[wn].toString("utf8")).policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64.airportTimezoneGroups};found[cn]=Buffer.from(JSON.stringify(catalog));check(sha(found[cn])===hashes[cn],"CATALOG_FROM_WORKPAPER");}
 else {
  const u=new URL(process.env.DATABASE_URL||"");check(decodeURIComponent(u.username)==="neondb_owner"&&u.hostname.endsWith(".neon.tech")&&u.pathname==="/neondb"&&u.searchParams.getAll("sslmode").length===1&&["require","verify-full"].includes(u.searchParams.get("sslmode")),"OWNER_DB");
  const {Client}=createRequire(path.join(process.cwd(),"package.json"))("pg");
  const c=new Client({connectionString:u.toString(),options:"-c default_transaction_read_only=on",connectionTimeoutMillis:8000,query_timeout:20000});
  try{await c.connect();const snapshot=await tz.readOwnerSnapshot(c),x=tz.buildCatalog(snapshot.rows,rows);check(x.privateCandidate&&x.requiredAirportCount===1017&&x.groupCount===168&&x.missingOrInvalidTimezoneCount===0&&x.invalidRequiredCodeCount===0,"FRAME_CATALOG");catalog=x.privateCandidate;found[cn]=Buffer.from(JSON.stringify(catalog));check(sha(found[cn])===hashes[cn],"EXACT_CATALOG_DRIFT");}finally{await c.end()}
  console.log(JSON.stringify({status:"EXACT_PRIOR_CATALOG_RECONSTRUCTED_READONLY",sha256:hashes[cn],airports:1017,groups:168,databaseWrites:0}));
 }
 const stats=a.validateCatalog(catalog,scope.fixed);
 if(!found[pn]){
  // Only the official public API specification, no commercial API/key.
  found[pn]=cmd("curl",["--fail","--silent","--show-error","--location","--proto","=https","--max-time","30","https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json"]);
  check(sha(found[pn])===hashes[pn],"PUBLIC_CONTRACT_VERSION_DRIFT");
 }
 const pc=a.inspectPublicContract(found[pn]);check(pc.rawSha256===hashes[pn],"PUBLIC_CONTRACT_DIGEST");
 if(!found[wn]){
  const w=JSON.parse(blob("f5b5b553b52d9e426727c343d439d19f5187a825").toString("utf8"));
  check(w.status==="SIX_POLICY_SHAPES_CANDIDATE_ONLY_NOT_RUNTIME"&&w.manifestApproved===false&&w.phase6PaidGo===false&&Object.keys(w.policyDrafts).length===6,"WORKPAPER_CANDIDATE");
  w.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64.airportTimezoneGroups=catalog.airportTimezoneGroups;
  w.contractCandidate={...w.contractCandidate,...pc,rawBytesReviewed:false};
  w.status="PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME";
  w.timezoneScopeProof={originalCalendarSha256:"45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c",compactCalendarSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",originalCatalogSha256:hashes[cn],scopeSha256:digest(scope),fixedAirportCount:scope.fixed.length,adaptiveCellCount:scope.cells.length,catalogAirports:stats.airports,catalogGroups:stats.groups,scopeProjectionSha256:"4b298ed185aab5938f8de32c3a80231ccc1069a00359ffb55df67d11a9548cfe",independentFinalPolicyApproval:false};
  w.candidateCategoryRowsSha256="a49720f28ce10019ee049436086e1734ac6ee2ec0f24189621aab2e32583ad6a";
  found[wn]=Buffer.from(JSON.stringify(w));check(sha(found[wn])===hashes[wn]&&found[wn].length===34693,"EXACT_WORKPAPER_RECONSTRUCTION");
 }
 check(main()===PIN,"MAIN_MOVED");try{fs.mkdirSync(dst,{mode:0o700})}catch(e){if(e.code!=="EEXIST")throw e}
 const s=fs.lstatSync(dst);check(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_OUTPUT_DIR");
 for(const n of Object.keys(hashes))write(n,found[n]);
 const decisions=inv.filter(f=>!Object.hasOwn(hashes,path.basename(f)));
 for(const f of decisions)console.log(JSON.stringify({status:"EXISTING_DECISION_FILE",file:path.basename(f),path:f,sha256:sha(fs.readFileSync(f))}));
 console.log(JSON.stringify({status:"P6_EXACT_SIX_POLICY_CANDIDATES_RECOVERED_NO_GO",directory:dst,hashes,policyCount:6,finalDecisionFileCount:decisions.length,providerPaidGets:0,databaseWrites:0,phase6PaidGo:false}));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}
run().catch(e=>{console.error(/^HOLD_P6_SIX_RECOVERY_[A-Z0-9_]+$/.test(e.message)?e.message:"HOLD_P6_SIX_RECOVERY_REDACTED");process.exitCode=2});
