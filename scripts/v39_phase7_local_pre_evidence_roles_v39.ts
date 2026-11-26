/** Protected same-runner PRE evidence role launch. The existing SOURCE job
 * starts one lane authority, one proof signer, and one publisher in distinct
 * steps, with only that role's credentials. No key is sent over IPC; the
 * exact original preview remains in the native process. Shared OS/runner
 * trust is explicit, not security isolation against a compromised runner.
 */
import {createPrivateKey,createHash} from "node:crypto";
import {AsyncLocalStorage} from "node:async_hooks";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {verifyP6ConditionalSourceInstructionProof} from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
import {p6ReviewedPolicyMatchesRuntime} from "../server/lib/disruption/phase6ReviewedRuntimeCode_v39.mjs";
import type {P7ConditionalProofScopePort} from "../server/lib/disruption/phase7IndependentPreSourceReader_v39";
import {execFileSync} from "node:child_process";
import {lstatSync,realpathSync,readFileSync,writeFileSync,unlinkSync,rmdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {callP7LocalPreRole,launchP7DetachedPreRole,listenP7LocalPreRole,makeP7LocalPreRequest,p7LocalPreSocketPaths,readP7LocalPreScope,type P7LocalPreRole} from "../server/lib/disruption/phase7LocalPrivatePreHandoff_v39";
import {openP7ActualPreLaneEvidenceAuthority} from "../server/lib/disruption/phase7ExactPreLaneEvidenceAuthority_v39";
import {openP7ExactSourcePreProofProducer} from "../server/lib/disruption/phase7ExactSourcePreProofProducer_v39";
import {inspectP7PreEvidenceBatchPublisher,openP7StoredPreLaneArchivePort,publishP7PreEvidenceBatchFromProtectedEnv} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39";
import {P5_E_V0079_SOURCE_READONLY_LOGIN_V39} from "../server/lib/disruption/phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_LOCAL_PRE_ROLE_"+s)};
const roles=["lane","proof","publisher"] as const;
const common=["PATH","HOME","TMPDIR","RUNNER_TEMP","RUNNER_TRACKING_ID","GITHUB_ACTIONS","GITHUB_REPOSITORY","GITHUB_REF","GITHUB_EVENT_NAME",
 "GITHUB_RUN_ATTEMPT","GITHUB_WORKFLOW_REF","GITHUB_RUN_ID","GITHUB_SHA","P6_PHASE5B_RUNTIME_EXECUTABLE_SHA","V39_P5_APPROVED_CODE_SHA","ADB_AUTO_COLLECT","V39_PHASE6_PROCESS_ARMED",
 "P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST","P5_SOURCE_BATCH_RUN_DAY_INDEX","V39_P5_MANIFEST_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_RELEASE_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256",
 "P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED","P6_PHASE7_PRE_POLICY_BASE64","P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256",
 "P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256","P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64",
 "P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256","P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64",
 "P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256","P6_PHASE7_PRE_PROOF_ISSUER_APPROVED","P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED"];
const daily=["P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256"];
const instructionPins=["P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_PRIVATE_DAY_INDEX_REVISION","P6_PRIVATE_DAY_INDEX_SHA256","P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256"];
const reader=["P6_PRIVATE_READER_DATABASE_URL","P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED","P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN","P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN"];
const laneKey="P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64",proofKey="P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64";
const roleOnly:Record<P7LocalPreRole,readonly string[]>={
 lane:[...daily,"V39_P5_SOURCE_DATABASE_URL",laneKey,"P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64","P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256"],
 proof:[...daily,"V39_P5_SOURCE_DATABASE_URL",proofKey,...reader],
 publisher:[...reader,"P6_PRIVATE_PUBLISHER_DATABASE_URL","P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED","V39_P5_SOURCE_DATABASE_URL"]
};
function key(raw:string|undefined){
 if(!raw||raw.length>12000||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))return hold("EXACT_KEY");
 const b=Buffer.from(raw,"base64");
 try{if(b.toString("base64")!==raw)hold("EXACT_KEY");const k=createPrivateKey(b);if(k.asymmetricKeyType!=="ed25519")hold("EXACT_KEY");return k}
 finally{b.fill(0)}
}
function source(raw:string|undefined,password:boolean){
 const u=new URL(raw??"");
 if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||
  Boolean(u.password)!==password||u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
  [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k)))hold("SOURCE_ENDPOINT");
 return u;
}
export function projectP7LocalRoleEnvironment(e:NodeJS.ProcessEnv,role:P7LocalPreRole,endpointOnly?:string){
 readP7LocalPreScope(e);
 if(!roles.includes(role)||!e.RUNNER_TRACKING_ID||
  [e.P5_V39_PRE_DATABASE_URL,e.P5_V39_PREPARE_DATABASE_URL,e.P5_V39_T24_WITNESS_DATABASE_URL,e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL,e.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64,e.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,e.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64].some(Boolean)||
  (role!=="lane"&&!!e[laneKey])||(role!=="proof"&&!!e[proofKey])||(role!=="publisher"&&!!e.P6_PRIVATE_PUBLISHER_DATABASE_URL)||(role==="lane"&&!!e.P6_PRIVATE_READER_DATABASE_URL))hold("CROSS_ROLE_LAUNCH_CREDENTIALS");
 const out:NodeJS.ProcessEnv={};
 for(const name of [...common,...roleOnly[role],...(role==="publisher"?[]:instructionPins)])if(e[name]!==undefined)out[name]=e[name];
 if(role==="publisher"){
  // The publisher never receives a live SOURCE password, even in its
  // launch step. Endpoint-only pointer was made by the lane step after
  // parsing the actual dedicated source URL; proof step checks continuity.
  if(e.V39_P5_SOURCE_DATABASE_URL)hold("PUBLISHER_SOURCE_CREDENTIAL");
  const u=source(endpointOnly,false);out.V39_P5_SOURCE_DATABASE_URL=u.toString();
 }else source(out.V39_P5_SOURCE_DATABASE_URL,true);
 for(const name of roleOnly[role])if(!out[name])hold("ROLE_CONFIGURATION_MISSING");
 return out;
}
function endpointFile(dir:string){return join(dir,"source-endpoint.txt")}
function inspectEndpoint(dir:string){
 const path=endpointFile(dir),st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid?.()||st.nlink!==1||(st.mode&0o077)!==0||st.size<10||st.size>512||realpathSync(path)!==path)hold("ENDPOINT_FILE");
 return source(readFileSync(path,"utf8"),false).toString();
}
function checkedMain(e:NodeJS.ProcessEnv){
 if(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5000}).trim()!==e.GITHUB_SHA)hold("CHECKOUT");
}
async function start(role:P7LocalPreRole){
 const e=process.env,scope=readP7LocalPreScope(e);checkedMain(e);
 const {dir,roles:paths}=p7LocalPreSocketPaths(e,true);
 try{lstatSync(paths[role]);hold("ENDPOINT_ALREADY_STARTED_NO_REPLAY")}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
 let endpoint:string|undefined;
 if(role==="lane"){
  const u=source(e.V39_P5_SOURCE_DATABASE_URL,true);u.password="";
  writeFileSync(endpointFile(dir),u.toString(),{flag:"wx",mode:0o600});
 }else{
  endpoint=inspectEndpoint(dir);
  if(role==="proof"&&!sameP6NeonDatabaseEndpoint(source(e.V39_P5_SOURCE_DATABASE_URL,true),source(endpoint,false)))hold("SOURCE_ENDPOINT_DRIFT");
 }
 const env=projectP7LocalRoleEnvironment(e,role,endpoint);
 await launchP7DetachedPreRole({scriptPath:fileURLToPath(import.meta.url),role,path:paths[role],scope,env,cwd:process.cwd()});
 console.log(JSON.stringify({status:"P7_LOCAL_PRE_ROLE_READY_NO_PROVIDER",role,providerCalls:0,databaseWrites:0,productionProofIssued:false,phase6PaidGo:false}));
}
/** No new database permission: each signer authenticates the same signed
 * instructions at its own restricted SOURCE clock, using only stable public
 * reviewer pins and the protected day-plan/purpose already present in the job. */
export function readP7ConditionalInstructionRolePolicy(e:NodeJS.ProcessEnv,read=readFileSync){
 const local=readP7LocalPreScope(e),trust=readP6StableSourceTrust(e);
 const H=/^[a-f0-9]{64}$/,sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
 const revision=Number(e.P6_PRIVATE_DAY_INDEX_REVISION),indexSha256=e.P6_PRIVATE_DAY_INDEX_SHA256??"";
 const raw=e.P6_NONPAID_DAILY_POLICY_BASE64??"",bytes=Buffer.from(raw,"base64");
 if(!/^[1-9][0-9]{0,3}$/.test(e.P6_PRIVATE_DAY_INDEX_REVISION??"")||revision>1024||!H.test(indexSha256)||
    raw.length<100||raw.length>46668||bytes.toString("base64")!==raw||!H.test(e.P6_NONPAID_DAILY_POLICY_SHA256??"")||sha(bytes)!==e.P6_NONPAID_DAILY_POLICY_SHA256)hold("CONDITIONAL_INSTRUCTION_POLICY");
 const d=JSON.parse(bytes.toString("utf8")),f=d?.conditionalPreFeatureReview;
 if(d?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||d.delegatedDailyPacketProductionApproved!==true||
    !p6ReviewedPolicyMatchesRuntime(e,d.approvedCodeSha)||!["manifestSha256","calendarSha256","rightsSha256","releaseSha256"].every(k=>d[k]===(trust as Record<string,unknown>)[k])||
    d.providerContractSha256!==local.providerContractSha256||!Array.isArray(d.dayPlanSha256s)||d.dayPlanSha256s.length!==31||
    d.dayPlanSha256s.some((x:any,i:number)=>x?.runDayIndex!==i+1||!H.test(x.sha256??""))||new Set(d.dayPlanSha256s.map((x:any)=>x.sha256)).size!==31||
    !f||f.schema!=="v39.phase5.conditional-pre-feature-review-policy.v1"||f.approved!==true||f.rightsSha256!==trust.rightsSha256||
    !H.test(f.protocolSha256??"")||f.protocolSha256!==e.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256||!H.test(f.externalContentUseReviewSha256??"")||
    Object.keys(f).sort().join(",")!==["approved","externalContentUseReviewSha256","protocolSha256","rightsSha256","schema"].sort().join(","))
  hold("CONDITIONAL_INSTRUCTION_POLICY");
 const plan=read("data-collection/phase5/planning/phase6-source-day-"+String(local.runDayIndex).padStart(2,"0")+".json");
 if(!Buffer.isBuffer(plan)||plan.length>500000||sha(plan)!==d.dayPlanSha256s[local.runDayIndex-1].sha256)hold("CONDITIONAL_INSTRUCTION_DAY_PLAN");
 const parsed=JSON.parse(plan.toString("utf8")),max=parsed?.reviewedRefreshTiming?.maxPopulationStalenessSeconds;
 if(parsed?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||parsed.runDayIndex!==local.runDayIndex||!Number.isSafeInteger(max)||max<1||max>86400)hold("CONDITIONAL_INSTRUCTION_DAY_PLAN");
 return {trust,selector:{runDayIndex:local.runDayIndex,indexRevision:revision,indexSha256,queryDigestSha256:local.queryDigestSha256},
  policy:{independentNativeCandidateReadOnlyApproved:true,existingPaidDispatchApproved:false,noProviderCredentialsInAudit:true,maximumPopulationStalenessSeconds:max,providerContractSha256:local.providerContractSha256,conditionalPreFeatureReview:f},expectedSourceRunId:local.runId};
}
async function serve(role:P7LocalPreRole){
 process.umask(0o077);
 const e=process.env,paths=p7LocalPreSocketPaths(e,false);
 let clean:()=>Promise<unknown>=async()=>{};
 let handler:Parameters<typeof listenP7LocalPreRole>[0]["handler"];
 const instructionContext=new AsyncLocalStorage<unknown>();
 let readClock:()=>Promise<string>=async()=>hold("CONDITIONAL_SOURCE_CLOCK");
 const conditionalScope:P7ConditionalProofScopePort={async readExactSignedConditionalScope(p){
  const proof=instructionContext.getStore();if(!proof)hold("CONDITIONAL_INSTRUCTION_SCOPE");
  return verifyP6ConditionalSourceInstructionProof(proof,{...readP7ConditionalInstructionRolePolicy(e),permit:p,observedDbClockUtc:await readClock()});
 }};
 try{
  if(role==="lane"){
   const a=openP7ActualPreLaneEvidenceAuthority(e,key(e[laneKey]),undefined,conditionalScope);clean=a.close;readClock=a.preflight;await a.preflight();
   handler=async q=>{
    const issued=await instructionContext.run(q.conditionalSourceProof,()=>a.issueExactLaneReceiptPage(q.permits));
    if(issued.length!==q.permits.length)hold("EXACT_LANE_PAGE");
    return {wires:q.permits.map((permit,i)=>({permitSha256:hashPhase7DurableCandidate(permit),wire:issued[i].privateWire})),committedCount:0};
   };
  }else if(role==="proof"){
   const archive=openP7StoredPreLaneArchivePort(e);await archive.inspect();
   const a=openP7ExactSourcePreProofProducer(e,key(e[proofKey]),archive,conditionalScope);clean=a.close;readClock=a.preflight;await a.preflight();
   handler=async q=>{
    const m=await instructionContext.run(q.conditionalSourceProof,()=>a.port.readExactPermitProofs(q.permits));
    return {wires:q.permits.map(p=>{const permitSha256=hashPhase7DurableCandidate(p),wire=m.get(permitSha256);if(!wire)return hold("EXACT_PROOF_SET");return {permitSha256,wire};}),committedCount:0};
   };
  }else{
   source(e.V39_P5_SOURCE_DATABASE_URL,false);await inspectP7PreEvidenceBatchPublisher(e);
   handler=async q=>{
    const result=await publishP7PreEvidenceBatchFromProtectedEnv(e,q.permits,q.op==="publish_lane"?"PRE_LANE_RECEIPT":"PRE_PROOF",new Map(q.wires.map(x=>[x.permitSha256,x.wire])));
    return {wires:[],committedCount:result.committedCount};
   };
  }
  const service=await listenP7LocalPreRole({path:paths.roles[role],role,scope:paths.scope,handler,onFatal:()=>process.exit(2)});
  const stop=()=>{void service.close().finally(()=>process.exit(2))};
  process.once("SIGTERM",stop);process.once("SIGINT",stop);
  await service.closed;
 }finally{await clean()}
}
async function stop(){
 const e=process.env;
 // If the role gate failed before a directory existed, STOP is already
 // clean. Otherwise authenticate the same exact scoped local endpoints.
 if(!e.RUNNER_TEMP||!(/^[0-9]{5,25}$/).test(e.GITHUB_RUN_ID??""))hold("STOP_SCOPE");
 const dir=join(e.RUNNER_TEMP,"p7-pre-"+e.GITHUB_RUN_ID);
 try{lstatSync(dir)}catch(err){if((err as NodeJS.ErrnoException).code==="ENOENT")return;throw err}
 const x=p7LocalPreSocketPaths(e,false);let held=false;
 for(const role of roles){
  try{const s=lstatSync(x.roles[role]);if(!s.isSocket()||s.uid!==process.getuid?.()||(s.mode&0o077)!==0)hold("STOP_SOCKET");
   await callP7LocalPreRole(x.roles[role],makeP7LocalPreRequest(x.scope,"stop"),5000);
  }catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")held=true;}
 }
 if(held)hold("STOP_UNCERTAIN_RUNNER_CLEANUP_REQUIRED");
 // Closed endpoints unregister their own sockets; wait only boundedly for
 // filesystem readback, not another issuance or provider call.
 for(let i=0;i<20;i++){
  if(Object.values(x.roles).every(path=>{try{lstatSync(path);return false}catch(err){return (err as NodeJS.ErrnoException).code==="ENOENT"}}))break;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 try{inspectEndpoint(x.dir);unlinkSync(endpointFile(x.dir))}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
 rmdirSync(x.dir);console.log(JSON.stringify({status:"P7_LOCAL_PRE_ROLES_STOPPED",providerCalls:0,phase6PaidGo:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,role]=process.argv.slice(2);
 Promise.resolve().then(()=>{
  if(mode==="stop"&&!role&&process.argv.length===3)return stop();
  if(!roles.includes(role as P7LocalPreRole)||process.argv.length!==4)return hold("MODE");
  return mode==="start"?start(role as P7LocalPreRole):mode==="serve"?serve(role as P7LocalPreRole):hold("MODE");
 }).catch(err=>{const m=String(err?.message??"");console.error(/^HOLD_P7_(?:LOCAL_PRE_(?:ROLE|HANDOFF)|EXACT_PRE_PRODUCER|PRE_LANE_AUTHORITY)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_LOCAL_PRE_ROLE_REDACTED_NO_REPLAY");process.exitCode=2});
}
