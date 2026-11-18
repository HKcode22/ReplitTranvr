'use strict';
// Only recover the prior reviewed timezone bytes if missing and verify the
// old six candidate keys. No key generation, upload, signer rotation, rights,
// approval, staging, model work or provider call.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {createRequire}=require("node:module"),{execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",PIN="ea89308f468494d848f549539200f73f848a4fa7";
const OLD="6f518add10d00567a95fbcaf3650ebf608da8a60",OLD_MANIFEST="fc6b594ec0e458d8810981ac8f170a3a91384be609e3c16a09c25f5a91449041";
const MANIFEST="e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0";
const CONFIG="4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb";
const INV="af8122be433b471ef09091f194a9a3d275514fa8240e337ccfec505288ceaa17";
const DRAFT="db1645f302e7840455938e88738c3b895bea808ea2b3132eaff959551214a46e";
const CAL="7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c";
const PRIOR_RAW="25f5204cac9ed0b8a031bf2a609c323caab4e7f939ae6b12c6b93afeec94ee47";
const TZ="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",TZ_FILE="airport-timezone-catalog-CANDIDATE.json";
const PUB="b14c6523e12131ea92bd5cd792b439ded77e52da",TZ_HELPER="7adbd255fae4aa1921a8489dcecf10d903541bab";
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitHash=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const bytes=x=>Buffer.from(JSON.stringify(x));
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_CURRENT_ASSETS_"+k)};
let stage="START";
const mark=s=>{stage=s;console.log(JSON.stringify({status:"P5_CURRENT_ASSETS_STEP",step:s}));};
function stat(p){try{return fs.lstatSync(p)}catch(e){if(e.code==="ENOENT")return null;throw e;}}
function privatePath(p,directory){
 const s=stat(p);
 need(s&&(directory?s.isDirectory():s.isFile())&&!s.isSymbolicLink()&&s.uid===process.getuid()&&
  (s.mode&0o777)===(directory?0o700:0o600)&&(directory||s.nlink===1),"PRIVATE_PATH_SCOPE");
 return s;
}
function readExact(p,digest,max=2*1024*1024){
 const s=privatePath(p,false);need(s.size>0&&s.size<max,"FILE_SIZE");
 const b=fs.readFileSync(p);need(hash(b)===digest,"LOCAL_REVIEW_DIGEST");return b;
}
function main(){
 return execFileSync("gh",["api","--hostname","github.com","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"],
 {encoding:"utf8",timeout:20000,stdio:["ignore","pipe","pipe"],env:{...process.env,GH_PROMPT_DISABLED:"1"}}).trim();
}
function verifyReview(home,dir){
 const original=path.dirname(dir);
 need(path.dirname(original)===home&&/^\.phase5-final-review-[A-Za-z0-9]+$/.test(path.basename(original))&&
  path.basename(dir)==="nov18-"+PIN.slice(0,12),"REVIEW_DIRECTORY_SCOPE");
 privatePath(original,true);privatePath(dir,true);
 const receiptPath=path.join(dir,"receipt.json");need(privatePath(receiptPath,false).size<16384,"RECEIPT_SIZE");
 const r=JSON.parse(fs.readFileSync(receiptPath,"utf8"));
 need(r.status==="P5_NOV18_EXACT_MAIN_UNSIGNED_MANIFEST_DELTA_REBOUND_NO_GO"&&r.main===PIN&&
 r.manifestCandidateSha256===MANIFEST&&r.sourceInventorySha256===INV&&r.configCandidateSha256===CONFIG&&
 r.externalReviewDraftSha256===DRAFT&&r.verifiedUnchangedDayPlans===31&&r.plannedQueries===6144&&r.reservedRestUnits===37388&&
 r.actualAuthorizationId===null&&r.stagePacketExported===false&&r.phase6PaidGo===false,"RECEIPT_SCOPE");
 const m=JSON.parse(readExact(path.join(dir,"manifest-candidate.json"),MANIFEST).toString("utf8"));
 need(m.scientificFreezeApproved===false&&m.finalPredecessorsApproved===false&&m.phase6PaidGo===false&&m.sourceInventorySha256===INV,"MANIFEST_NOT_UNSIGNED");
 readExact(path.join(dir,"source-inventory.json"),INV);
 readExact(path.join(dir,"config-candidate.json"),CONFIG);
 const draft=JSON.parse(readExact(path.join(dir,"external-input-offline-review-NOT-STAGE.json"),DRAFT).toString("utf8"));
 need(draft.codeSha40===PIN&&draft.manifestSha256===MANIFEST&&draft.phase6AuthorizationId===null&&draft.predecessorEvidenceIds===null,"DRAFT_SCOPE");
 const prior=JSON.parse(readExact(path.join(original,"review-only.json"),PRIOR_RAW).toString("utf8"));
 const calendar=prior.calendarDraft?.calendarDays;
 need(Array.isArray(calendar)&&calendar.length===31&&hash(bytes(calendar))===CAL,"CALENDAR_SCOPE");
 return calendar;
}
function signerInventory(home,pub){
 need(pub.schema==="v39.phase6.actual-owner-signer-candidates-public-readback.v1"&&
 pub.originMain===OLD&&pub.originManifestCandidateSha256===OLD_MANIFEST&&
 pub.distinctKeyCount===6&&pub.secretNameCount===7&&pub.independentCustodianApproved===false&&
 pub.delegationPolicyApproved===false&&pub.phase6PaidGo===false&&Array.isArray(pub.signers)&&pub.signers.length===6,"PUBLIC_RECEIPT_SCOPE");
 const dir=path.join(home,".travnr-phase6-signer-candidates-v1"),s=stat(dir);
 if(!s)return {state:"PRIOR_DIRECTORY_NOT_PRESENT_NO_REGEN",verifiedKeys:0,expectedKeys:6};
 privatePath(dir,true);
 const expected=[...pub.signers.map(x=>x.id+".pkcs8.pem"),"public-candidate-receipt.json"].sort();
 need(JSON.stringify(fs.readdirSync(dir).sort())===JSON.stringify(expected),"KEY_CUSTODY_PARTIAL_OR_FOREIGN");
 const markerPath=path.join(dir,"public-candidate-receipt.json");
 need(privatePath(markerPath,false).size<16384,"MARKER_SIZE");
 const marker=JSON.parse(fs.readFileSync(markerPath,"utf8"));
 need(marker.schema==="v39.phase6.local-signer-candidate-custody.v1"&&marker.originMain===OLD&&marker.originManifestCandidateSha256===OLD_MANIFEST&&
 JSON.stringify(marker.signers)===JSON.stringify(pub.signers),"ORIGINAL_PUBLIC_MARKER_DRIFT");
 for(const x of pub.signers){
  need(/^(daily|query|registry-index|later-pre-t24-registry|post|t24-independent-custody)$/.test(x.id)&&/^[a-f0-9]{64}$/.test(x.fingerprintSha256),"PUBLIC_KEY_ID");
  const f=path.join(dir,x.id+".pkcs8.pem");need(privatePath(f,false).size<65536,"KEY_SIZE");
  const raw=fs.readFileSync(f);
  try{
   const k=crypto.createPrivateKey(raw),p=crypto.createPublicKey(k);
   need(k.asymmetricKeyType==="ed25519"&&hash(p.export({type:"spki",format:"der"}))===x.fingerprintSha256&&
    p.export({type:"spki",format:"pem"})===x.publicKeyPem,"ORIGINAL_SIGNER_FINGERPRINT_DRIFT");
   const challenge=Buffer.from("travnr candidate key possession check; no release or flight approval");
   need(crypto.verify(null,challenge,p,crypto.sign(null,challenge,k)),"KEY_POSSESSION_CHECK");
  }finally{raw.fill(0);}
 }
 need(new Set(pub.signers.map(x=>x.id)).size===6&&new Set(pub.signers.map(x=>x.fingerprintSha256)).size===6&&
 new Set(pub.signers.flatMap(x=>x.secretNames)).size===7,"SIX_DISTINCT_KEYS_SEVEN_ALIASES");
 return {state:"SIX_ORIGINAL_KEYS_PRESENT_AND_MATCH_PUBLIC_FINGERPRINTS",verifiedKeys:6,expectedKeys:6,secretAliases:7};
}
function verifyCatalog(b){
 need(b.length===14722&&hash(b)===TZ,"TIMEZONE_BYTES_DRIFT");
 const c=JSON.parse(b.toString("utf8"));
 const g=c.airportTimezoneGroups;
 need(Array.isArray(g)&&g.length===168&&g.every(x=>typeof x.ianaTimezone==="string"&&Array.isArray(x.icaos)),"TIMEZONE_GROUPS");
 const a=g.flatMap(x=>x.icaos);
 need(a.length===1017&&new Set(a).size===1017&&a.every(x=>/^[A-Z]{4}$/.test(x)),"TIMEZONE_AIRPORTS");
 return b;
}
function findCatalog(home,dir){
 const current=path.join(dir,TZ_FILE);
 if(stat(current)){privatePath(current,false);return verifyCatalog(fs.readFileSync(current));}
 const dirs=fs.readdirSync(home,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^\.phase5-(?:final-)?review-[A-Za-z0-9]+$/.test(x.name));
 need(dirs.length<=128,"BOUNDED_PRIVATE_DIRECTORY_SCAN");
 for(const x of dirs){
  const loc=path.join(home,x.name),f=path.join(loc,TZ_FILE),s=stat(f);
  if(!s||!s.isFile()||s.isSymbolicLink()||s.size!==14722)continue;
  privatePath(loc,true);privatePath(f,false);
  const b=fs.readFileSync(f);
  if(hash(b)===TZ)return verifyCatalog(b);
 }
 return null;
}
function validateOwnerUrl(raw){
 let u;try{u=new URL(raw)}catch{need(false,"EXISTING_OWNER_DB_URL_REQUIRED");}
 need(["postgres:","postgresql:"].includes(u.protocol)&&u.hostname.endsWith(".neon.tech")&&
  u.pathname==="/neondb"&&u.username&&u.password&&!u.hash&&(u.port===""||u.port==="5432")&&
  u.searchParams.getAll("sslmode").length===1&&["require","verify-full"].includes(u.searchParams.get("sslmode"))&&
  [...u.searchParams.keys()].every(x=>["sslmode","channel_binding"].includes(x))&&
  (!u.searchParams.has("channel_binding")||(u.searchParams.getAll("channel_binding").length===1&&u.searchParams.get("channel_binding")==="require")),"OWNER_NEON_TLS_SCOPE");
}
async function recoverCatalog(calendar,helper){
 mark("MISSING_CATALOG_EXACT_READONLY_RECOVERY");
 need(process.env.DATABASE_URL&&process.env.V39_DATABASE_RUNTIME_URL&&
  process.env.DATABASE_URL!==process.env.V39_DATABASE_RUNTIME_URL,"EXISTING_DISTINCT_OWNER_URL_REQUIRED");
 validateOwnerUrl(process.env.DATABASE_URL);
 need(process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0","INSECURE_TLS");
 const root=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 const origin=execFileSync("git",["-C",root,"remote","get-url","origin"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 need(["https://github.com/HKcode22/ReplitTranvr","https://github.com/HKcode22/ReplitTranvr.git","git@github.com:HKcode22/ReplitTranvr","git@github.com:HKcode22/ReplitTranvr.git"].includes(origin),"REPOSITORY_ORIGIN");
 const {Pool}=createRequire(path.join(root,"package.json"))("pg");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000,query_timeout:20000,
  options:"-c default_transaction_read_only=on",application_name:"phase5_missing_exact_timezone_recovery"});
 let snap;
 try{const db=await pool.connect();try{snap=await helper.readOwnerSnapshot(db);}finally{db.release();}}finally{await pool.end();}
 const result=helper.buildCatalog(snap.rows,calendar);
 need(result.privateCandidate&&result.requiredAirportCount===1017&&result.validTimezoneCount===1017&&
 result.groupCount===168&&result.missingOrInvalidTimezoneCount===0&&result.invalidRequiredCodeCount===0,"RECOVERED_TIMEZONE_SCOPE");
 return verifyCatalog(bytes(result.privateCandidate));
}
function persistCatalog(dir,b){
 const f=path.join(dir,TZ_FILE);
 if(stat(f)){privatePath(f,false);need(fs.readFileSync(f).equals(b),"CATALOG_CONFLICT_NO_OVERWRITE");return;}
 const fd=fs.openSync(f,"wx",0o600);
 try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
async function execute(){
 mark("CHECK_MAIN_AND_PRIVATE_REVIEW");
 need(process.argv.length===5&&process.env.GITHUB_ACTIONS!=="true"&&typeof process.getuid==="function"&&main()===PIN,"OWNER_MAIN_SCOPE");
 const [pubPath,tzPath,dirArg]=process.argv.slice(2),home=fs.realpathSync(os.homedir());
 const dir=path.resolve(dirArg);
 need(dir===fs.realpathSync(dir),"DIRECTORY_SYMLINK");
 const calendar=verifyReview(home,dir);
 const pubRaw=fs.readFileSync(pubPath),tzRaw=fs.readFileSync(tzPath);
 need(gitHash(pubRaw)===PUB&&gitHash(tzRaw)===TZ_HELPER,"REVIEWED_HELPER_BLOB");
 const pub=JSON.parse(pubRaw.toString("utf8"));
 mark("EXISTING_SIGNER_CUSTODY_ONLY");
 const signers=signerInventory(home,pub);
 mark("EXISTING_TIMEZONE_BYTES");
 let b=findCatalog(home,dir),recovered=false;
 if(!b){b=await recoverCatalog(calendar,require(path.resolve(tzPath)));recovered=true;}
 need(main()===PIN,"MAIN_MOVED");
 persistCatalog(dir,b);
 const ready=signers.verifiedKeys===6;
 const out={status:ready?"P5_CURRENT_PRIVATE_REVIEW_ASSETS_EXACT_NO_GO":"HOLD_P5_CURRENT_ASSETS_ORIGINAL_SIGNER_CANDIDATES_MISSING_NO_REGEN",
 main:PIN,manifestCandidateSha256:MANIFEST,signers,timezone:{sha256:TZ,bytes:b.length,airports:1017,groups:168,recoveredReadOnly:recovered},
 createdOrRotatedKeys:0,providerCalls:0,databaseWrites:0,githubSecretWrites:0,workflowDispatches:0,
 signerCustodyApproved:false,sourceRightsApproved:false,actualAuthorizationId:null,phase6PaidGo:false};
 console.log(JSON.stringify(out));if(!ready)process.exitCode=2;
}
function safeError(e){
 const m=String(e?.message??"");
 if(/^HOLD_P5_(?:CURRENT_ASSETS|TIMEZONE)_[A-Z0-9_]+$/.test(m))return m;
 const code=typeof e?.code==="string"&&/^[A-Z0-9_]{1,20}$/.test(e.code)?e.code:"UNCLASSIFIED";
 return "HOLD_P5_CURRENT_ASSETS_"+stage+"_"+code;
}
module.exports={signerInventory,findCatalog,verifyCatalog,safeError};
if(require.main===module)execute().catch(e=>{console.error(safeError(e));process.exitCode=2;});
