/** Role-scoped same-run POST review. No paid replay or raw source files.
 * Existing source and scoped-group readers sign independently; separate
 * restricted publisher stores signed wires, not source values. */
import {createPrivateKey} from "node:crypto";
import {spawn,execFileSync} from "node:child_process";
import {lstatSync,readFileSync,writeFileSync,realpathSync,unlinkSync,rmdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
import {callP7PostRole,listenP7PostRole,postSocketPaths,withP7PostRecoverySelector,exactPostLocalSelector,type PostRole} from "../server/lib/disruption/phase7LocalPrivatePostHandoff_v39";
import {admitP7StoredPostRecovery,readP7StoredPostRecoveryPacket} from "../server/lib/disruption/phase7StoredPostRecoveryAdmission_v39";
import {discoverPhase7CommittedPostScope,issuePhase7CommittedPostRecoveryReceipt} from "../server/lib/disruption/phase7CommittedPostRecovery_v39";
import {createP7IndependentPostSettlementIssuer} from "../server/lib/disruption/phase7IndependentPostSettlementIssuer_v39";
import {openP7PostWirePublisher,openP7StoredRecoveryReceiptPort,openP7PrivateSignedReviewReader} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
import {parsePhase7ProtectedPrePolicy} from "../server/lib/disruption/phase7ProtectedPreResolver_v39";
import {readP7RestrictedSourceClock} from "../server/lib/disruption/phase7ExactSourcePreProofProducer_v39";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {hashPhase7DurableCandidate as hash} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {P6PostCommittedScope} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_LOCAL_POST_ROLE_"+s)};
const roles=["reviewer","publisher"] as const,signerName="P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64";
const common=["PATH","HOME","RUNNER_TEMP","RUNNER_TRACKING_ID","GITHUB_ACTIONS","GITHUB_REPOSITORY","GITHUB_REF","GITHUB_EVENT_NAME","GITHUB_RUN_ATTEMPT","GITHUB_WORKFLOW_REF","GITHUB_RUN_ID","GITHUB_SHA","P6_PHASE5B_RUNTIME_EXECUTABLE_SHA",
 "ADB_AUTO_COLLECT","V39_PHASE6_PROCESS_ARMED","V39_P5_POST_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_RELEASE_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_FRAME_HASH","V39_P5_POST_PRICE_SHA256",
 "P6_PRIVATE_POST_DAY","P6_PRIVATE_POST_REVISION","P6_PRIVATE_POST_INDEX_SHA","P6_PRIVATE_POST_SHARD","P6_PRIVATE_POST_PACKET_SHA","P6_PRIVATE_POST_ROUTE_SHA",
 "P6_PHASE7_POST_RECOVERY_CONFIRM","P6_PHASE7_ORIGINAL_POST_RUN_ID","P6_PHASE7_POST_RECOVERY_APPROVED","P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED",
 "P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED","P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN","P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN","P6_PRIVATE_READER_DATABASE_URL",
 "P6_PHASE7_POST_STORAGE_APPROVED","P6_PHASE7_POST_PRESERVATION_POLICY_SHA256","P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256","P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64","P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256","P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256",
 "P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_PRIVATE_POST_STORED_REVIEW_APPROVED","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64"];
const reviewerOnly=["GITHUB_TOKEN",signerName,"V39_P5_SOURCE_DATABASE_URL","P6_PHASE7_POST_SCOPED_DATABASE_URL","P6_PHASE7_PRE_POLICY_BASE64","P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256","P6_PHASE7_POST_CONTRACT_SHA256","P6_PHASE7_POST_PROFILE_SHA256","P6_PHASE7_POST_PRESERVATION_POLICY_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_NATIVE_POST_POLICY_SHA256"];
const publisherOnly=["P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED","P6_PRIVATE_PUBLISHER_DATABASE_URL"];
function scope(e:NodeJS.ProcessEnv,role:PostRole){
 if(e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
 [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL,e.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL].some(Boolean)||
 (role==="reviewer"?!!e.P6_PRIVATE_PUBLISHER_DATABASE_URL:!!e[signerName]||!!e.P6_PHASE7_POST_SCOPED_DATABASE_URL))hold("CROSS_ROLE_CAPABILITY");
}
function endpoint(raw:string|undefined,password:boolean){
 const u=new URL(raw??"");
 if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!=="phase5_p5_source_login_20261108"||Boolean(u.password)!==password||
  u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
  [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("SOURCE_ENDPOINT");
 return u;
}
function key(raw:string|undefined){if(!raw||raw.length>6000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw))return hold("SIGNER");
 const b=Buffer.from(raw,"base64");try{if(b.toString("base64")!==raw)hold("SIGNER");return createPrivateKey(b)}finally{b.fill(0)}}
function endpointRead(dir:string){
 const path=join(dir,"endpoint.txt"),s=lstatSync(path);
 if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid?.()||s.nlink!==1||(s.mode&0o077)!==0||s.size>512||realpathSync(path)!==path)hold("ENDPOINT_FILE");
 return endpoint(readFileSync(path,"utf8"),false).toString();
}
async function start(e:NodeJS.ProcessEnv,role:PostRole){
 scope(e,role);
 const x=postSocketPaths(e,true);
 if(!e.RUNNER_TRACKING_ID||execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000}).trim()!==e.GITHUB_SHA)hold("EXACT_CHECKOUT");
 const out:NodeJS.ProcessEnv={};for(const k of [...common,...(role==="reviewer"?reviewerOnly:publisherOnly)])if(e[k]!==undefined)out[k]=e[k];
 if(role==="reviewer"){const u=endpoint(e.V39_P5_SOURCE_DATABASE_URL,true);u.password="";writeFileSync(join(x.dir,"endpoint.txt"),u.toString(),{flag:"wx",mode:0o600})}
 else{if(e.V39_P5_SOURCE_DATABASE_URL)hold("PUBLISHER_NO_SOURCE_PASSWORD");out.V39_P5_SOURCE_DATABASE_URL=endpointRead(x.dir)}
 try{lstatSync(x.paths[role]);hold("ALREADY_STARTED")}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
 const child=spawn(process.execPath,["--import","tsx",fileURLToPath(import.meta.url),"serve",role],{env:out,detached:true,stdio:"ignore"});
 let gone=false;child.once("exit",()=>{gone=true});child.once("error",()=>{gone=true});
 try{const until=Date.now()+60000;
  while(Date.now()<until&&!gone){let st;try{st=lstatSync(x.paths[role])}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
   if(st){if(!st.isSocket()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0)hold("SOCKET_PERMISSION");await callP7PostRole(x.paths[role],x.scope,"ready",null,5000);child.unref();console.log(JSON.stringify({status:"P7_POST_ROLE_READY_NO_PROVIDER",role,providerCalls:0,databaseWrites:0}));return}
   await new Promise(r=>setTimeout(r,200));
  }hold("STARTUP");
 }catch(err){child.kill("SIGTERM");throw err}
}
async function serve(e:NodeJS.ProcessEnv,role:PostRole){
 scope(e,role);const x=postSocketPaths(e);
 if(role==="publisher"){
  const p=openP7PostWirePublisher(e);await p.preflight();
  const s=await listenP7PostRole(x.paths.publisher,x.scope,role,async q=>p.publish(q.body.selector,q.body.wire));
  await s.closed;return;
 }
 const sel=exactPostLocalSelector(e),mode=e.P6_PHASE7_POST_RECOVERY_CONFIRM?"recovery":"same-run";
 const a=admitP7StoredPostRecovery(Object.fromEntries(Object.entries(e).filter(([k])=>k!==signerName)),sel,mode);
 const env={...e,P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256:a.trust.postReviewerFingerprintSha256};delete env[signerName];
 const k=key(e[signerName]),p=parsePhase7ProtectedPrePolicy(env);
 const sourcePool=new Pool({connectionString:a.privateSourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_independent_post_source_read"});
 const u=new URL(env.P6_PHASE7_POST_SCOPED_DATABASE_URL??"");
 if(!sameP6NeonDatabaseEndpoint(u,new URL(a.privateSourceUrl))||decodeURIComponent(u.username)!=="phase7_post_scoped_prod20261120"||!u.password||u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="verify-full"||[...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("SCOPED_READER");
 const group=new Pool({connectionString:u.toString(),max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_independent_post_group_read"});
 try{
  const source=makeP5Stage28DedicatedRolePool(sourcePool,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"});
  const receipt=openP7StoredRecoveryReceiptPort(env);
  const issuer=createP7IndependentPostSettlementIssuer({env,signer:k,source,scopedReader:group,scopedReaderRole:"phase7_post_scoped_prod20261120",contract:p.contract,profile:p.profile,readExactRecoveryReceipt:receipt.readExactRecoveryReceipt});
  await readP7RestrictedSourceClock(source);await openP7PrivateSignedReviewReader(env).inspect();await issuer.preflight();
  let authenticated:string|null=null;
  const match=async(c:P6PostCommittedScope)=>{
   const h=hash(c);if(authenticated===h)return;if(authenticated!==null)hold("ONE_ORIGINAL");
   const original=(await readP7StoredPostRecoveryPacket(env,sel,fetch,mode)).privatePacket;
   const actual=await discoverPhase7CommittedPostScope(source,original);
   if(hash(actual)!==h)hold("INDEPENDENT_COMMITTED_SCOPE");authenticated=h;
  };
  const s=await listenP7PostRole(x.paths.reviewer,x.scope,role,async q=>{
   await match(q.body.committed);
   if(q.op==="recovery")return (await issuePhase7CommittedPostRecoveryReceipt({env,source,scope:q.body.committed,priorAudit:q.body.priorAudit,signer:k})).privateWire;
   if(q.op==="prepare")return issuer.prepare(q.body.committed);
   if(q.op==="settlement")return (await issuer.issue(q.body)).privateWire;
   return hold("OPERATION");
  });
  await s.closed;
 }finally{await Promise.allSettled([sourcePool.end(),group.end()])}
}
async function stop(e:NodeJS.ProcessEnv){
 const dir=join(e.RUNNER_TEMP??"","p7-post-"+(e.GITHUB_RUN_ID??""));
 try{lstatSync(dir)}catch(err){if((err as NodeJS.ErrnoException).code==="ENOENT")return;throw err}
 const x=postSocketPaths(withP7PostRecoverySelector(e));let held=false;
 for(const path of Object.values(x.paths)){try{const st=lstatSync(path);if(!st.isSocket()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0)hold("STOP_SOCKET");await callP7PostRole(path,x.scope,"stop",null,5000)}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")held=true}}
 if(held)hold("STOP_UNCERTAIN");
 for(let i=0;i<20;i++){if(Object.values(x.paths).every(path=>{try{lstatSync(path);return false}catch(err){return (err as NodeJS.ErrnoException).code==="ENOENT"}}))break;await new Promise(r=>setTimeout(r,50))}
 try{endpointRead(x.dir);unlinkSync(join(x.dir,"endpoint.txt"))}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
 rmdirSync(x.dir);console.log(JSON.stringify({status:"P7_POST_LOCAL_ROLES_STOPPED",providerCalls:0}));
}
async function main(){process.umask(0o077);const [mode,role]=process.argv.slice(2);
 if(mode==="stop"&&process.argv.length===3)return stop(process.env);
 if(!roles.includes(role as PostRole)||process.argv.length!==4)return hold("MODE");
 const env=mode==="start"?withP7PostRecoverySelector(process.env):process.env;
 if(mode==="start")return start(env,role as PostRole);if(mode==="serve")return serve(env,role as PostRole);hold("MODE")
}
main().catch(()=>{console.error("HOLD_P7_LOCAL_POST_ROLE_REDACTED_NO_REPLAY");process.exitCode=2});
