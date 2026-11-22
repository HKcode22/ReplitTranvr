/** Actor-only exact-main POST commissioning. No observation selector, no
 * source packet, no provider, no signing/settling/publication, no DB writes.
 * Shares actual production constructors and role preflight functions. */
import {createPrivateKey} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstatSync,mkdirSync,readFileSync,realpathSync,unlinkSync,rmdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {Client,Pool} from "pg";
import {readP6StablePostTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {readP7RestrictedSourceClock} from "../server/lib/disruption/phase7ExactSourcePreProofProducer_v39";
import {createP7IndependentPostSettlementIssuer} from "../server/lib/disruption/phase7IndependentPostSettlementIssuer_v39";
import {openP7PostWirePublisher,openP7PrivateSignedReviewReader,openP7StoredRecoveryReceiptPort} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
import {parsePhase7ProtectedPrePolicy} from "../server/lib/disruption/phase7ProtectedPreResolver_v39";
import {admitPhase7ProtectedPostResolver,P7_POST_ACTORS} from "../server/lib/disruption/phase7ProtectedPostResolver_v39";
import {preflightPhase7DurableBundleActors} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {readP6PrivateDeadlinePressure} from "../server/lib/disruption/phase6PrivateDeadlinePressure_v39";
export const P7_POST_ACTOR_CONFIRM="ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER";
type Role="reviewer"|"publisher"|"storage";
const hold=(s:string):never=>{throw Error("HOLD_P7_POST_ACTOR_PREFLIGHT_"+s)};
const SIGNER="P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64";
export function admitP7ActorOnlyPost(e:NodeJS.ProcessEnv,role:Role){
 if(!["reviewer","publisher","storage"].includes(role)||e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
 e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_WORKFLOW_REF!=="HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml@refs/heads/main"||
 e.GITHUB_EVENT_NAME!=="workflow_dispatch"||e.GITHUB_RUN_ATTEMPT!=="1"||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==e.V39_P5_POST_APPROVED_CODE_SHA||
 e.P6_POST_ACTOR_PREFLIGHT_CONFIRM!==P7_POST_ACTOR_CONFIRM||e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
 e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||[e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,
 e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P5_V39_PREPARE_DATABASE_URL,e.P5_V39_T24_WITNESS_DATABASE_URL].some(Boolean)||
 Object.entries(e).some(([k,v])=>!!v&&((k.includes("PRIVATE_KEY")||k.endsWith("_REVIEWER_KEY_BASE64"))&&!(role==="reviewer"&&k===SIGNER)||
 k.startsWith("P6_PRIVATE_POST_")&&/_(DAY|REVISION|INDEX_SHA|SHARD|PACKET_SHA|ROUTE_SHA)$/.test(k)))||
 (role==="reviewer"&&(!e[SIGNER]||!e.V39_P5_SOURCE_DATABASE_URL||!e.P6_PHASE7_POST_SCOPED_DATABASE_URL||e.P6_PRIVATE_PUBLISHER_DATABASE_URL||e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL||e.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL))||
 (role==="publisher"&&(!e.P6_PRIVATE_PUBLISHER_DATABASE_URL||e.V39_P5_SOURCE_DATABASE_URL||e.P6_PHASE7_POST_SCOPED_DATABASE_URL||e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL||e.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL))||
 (role==="storage"&&(e.V39_P5_SOURCE_DATABASE_URL||e.P6_PRIVATE_PUBLISHER_DATABASE_URL||!e.P6_PHASE7_POST_SCOPED_DATABASE_URL||!e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL||!e.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL)))
 hold("SCOPE");
}
function scratch(e:NodeJS.ProcessEnv){
 if(!e.RUNNER_TEMP||realpathSync(e.RUNNER_TEMP)!==e.RUNNER_TEMP||!(/^[1-9][0-9]{4,14}$/).test(e.GITHUB_RUN_ID??""))hold("SCRATCH_SCOPE");
 return join(e.RUNNER_TEMP!,"p7-post-actor-only-"+e.GITHUB_RUN_ID);
}
function checkDir(dir:string){
 const s=lstatSync(dir);
 if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid?.()||(s.mode&0o077)!==0||realpathSync(dir)!==dir)hold("SCRATCH_DIR");
}
function endpointOnly(dir:string){
 checkDir(dir);const p=join(dir,"endpoint.txt"),s=lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid?.()||s.nlink!==1||(s.mode&0o077)!==0||s.size>512)hold("ENDPOINT_FILE");
 const u=new URL(readFileSync(p,"utf8"));if(u.password||decodeURIComponent(u.username)!=="phase5_p5_source_login_20261108"||!sameP6NeonDatabaseEndpoint(u,u))hold("ENDPOINT_ONLY");
 return u.toString();
}
function sourceUrl(e:NodeJS.ProcessEnv){
 const u=new URL(e.V39_P5_SOURCE_DATABASE_URL??"");
 if(decodeURIComponent(u.username)!=="phase5_p5_source_login_20261108"||!u.password||!sameP6NeonDatabaseEndpoint(u,u)||
 u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
 [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("SOURCE_URL");
 u.searchParams.set("sslmode","verify-full");return u;
}
function scopedUrl(raw:string|undefined,source:URL,role:string){
 const u=new URL(raw??"");
 if(!sameP6NeonDatabaseEndpoint(u,source)||decodeURIComponent(u.username)!==role||!u.password||u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="verify-full"||
 [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("SCOPED_URL");return u.toString();
}
function pool(url:string,label:string){return new Pool({connectionString:url,max:1,connectionTimeoutMillis:8000,query_timeout:20000,application_name:label})}
async function reviewer(e:NodeJS.ProcessEnv,dir:string){
 const trust=readP6StablePostTrust(e),u=sourceUrl(e);
 const p=parsePhase7ProtectedPrePolicy(e),b=Buffer.from(e[SIGNER]!,"base64");
 let signer;try{if(b.toString("base64")!==e[SIGNER]||b.length>4500)hold("SIGNER");signer=createPrivateKey(b)}finally{b.fill(0)}
 const env={...e,V39_P5_SOURCE_DATABASE_URL:u.toString(),P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256:trust.postReviewerFingerprintSha256};delete env[SIGNER];
 const scoped=scopedUrl(e.P6_PHASE7_POST_SCOPED_DATABASE_URL,u,P7_POST_ACTORS.scoped.role);
 const src=pool(u.toString(),"p7_actor_source_read"),group=pool(scoped,"p7_actor_group_read");
 try{
  const source=makeP5Stage28DedicatedRolePool(src,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"});
  const receipt=openP7StoredRecoveryReceiptPort(env),issuer=createP7IndependentPostSettlementIssuer({env,signer,source,scopedReader:group,scopedReaderRole:P7_POST_ACTORS.scoped.role,contract:p.contract,profile:p.profile,readExactRecoveryReceipt:receipt.readExactRecoveryReceipt});
  await readP7RestrictedSourceClock(source);await openP7PrivateSignedReviewReader(env).inspect();await issuer.preflight();
  u.password="";mkdirSync(dir,{mode:0o700});checkDir(dir);writeFileSync(join(dir,"endpoint.txt"),u.toString(),{mode:0o600,flag:"wx"});
 }finally{await Promise.allSettled([src.end(),group.end()])}
}
async function publisher(e:NodeJS.ProcessEnv,dir:string){
 const env={...e,V39_P5_SOURCE_DATABASE_URL:endpointOnly(dir)};
 await openP7PostWirePublisher(env).preflight();
 // Actual restricted DB clock and deadline-pressure readback; never select content.
 const u=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");u.searchParams.set("sslmode","verify-full");
 const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p7_actor_deadline_pressure"});
 try{await c.connect();await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const s=await readP6PrivateDeadlinePressure(c,env.P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN??"",env.V39_P5_MANIFEST_SHA256??"");
  console.log(JSON.stringify(s));if(s.deadlineDueObserved||s.deadlineBoundaryMayHaveCrossedDuringRead)hold("DEADLINE_PRESSURE");
 }finally{await c.end().catch(()=>{})}
}
async function storage(e:NodeJS.ProcessEnv,dir:string){
 const a=admitPhase7ProtectedPostResolver({...e,V39_P5_SOURCE_DATABASE_URL:endpointOnly(dir)});
 const w=pool(a.privateUrls.writer,"p7_actor_bundle_writer"),r=pool(a.privateUrls.reader,"p7_actor_bundle_reader");
 try{await preflightPhase7DurableBundleActors(w,r,a.privatePolicy.contract,{writerRole:P7_POST_ACTORS.writer.role,readerRole:P7_POST_ACTORS.reader.role})}finally{await Promise.allSettled([w.end(),r.end()])}
}
function cleanup(dir:string){
 try{checkDir(dir)}catch(err){if((err as NodeJS.ErrnoException).code==="ENOENT")return;throw err}
 endpointOnly(dir);unlinkSync(join(dir,"endpoint.txt"));rmdirSync(dir);
}
async function main(){
 process.umask(0o077);const e=process.env,role=process.argv[2] as Role|"cleanup";
 if(process.argv.length!==3)hold("MODE");
 if(role==="cleanup"){cleanup(scratch(e));console.log("P7_POST_ACTOR_SCRATCH_CLEAN");return}
 admitP7ActorOnlyPost(e,role);
 if(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000}).trim()!==e.GITHUB_SHA)hold("CHECKOUT");
 const dir=scratch(e);
 if(role==="reviewer")await reviewer(e,dir);else if(role==="publisher")await publisher(e,dir);else if(role==="storage")await storage(e,dir);else hold("MODE");
 console.log(JSON.stringify({status:"P7_POST_ACTOR_PREFLIGHT_PASS_NO_GO",role,providerCalls:0,databaseWrites:0,observationSigned:false,phase6PaidGo:false}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(err=>{
 const s=String(err?.message??"");console.error(/^HOLD_P7_POST_ACTOR_PREFLIGHT_[A-Z0-9_]+$/.test(s)?s:"HOLD_P7_POST_ACTOR_PREFLIGHT_REDACTED_NO_REPLAY");process.exitCode=2
});
