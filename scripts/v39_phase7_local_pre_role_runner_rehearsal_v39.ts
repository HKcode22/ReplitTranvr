/** Actual GitHub-hosted cross-step process rehearsal using the exact local
 * IPC/launcher implementation. All permits/wires below are synthetic. No
 * real DB, signer key, source payload, artifact, provider or paid GO. */
import {createHash} from "node:crypto";
import {lstatSync,mkdirSync,realpathSync,rmdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {callP7LocalPreRole,launchP7DetachedPreRole,listenP7LocalPreRole,makeP7LocalPreRequest,openP7LocalPrivatePreHandoff,type P7LocalPreRole,type P7LocalPreScope} from "../server/lib/disruption/phase7LocalPrivatePreHandoff_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_ROLE_RUNNER_REHEARSAL_"+s)};
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
const roles=["lane","proof","publisher"] as const;
const e=process.env;
function context(create:boolean){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_EVENT_NAME!=="pull_request"||
  !/^[0-9]{5,25}$/.test(e.GITHUB_RUN_ID??"")||!(/^[a-f0-9]{40}$/).test(e.GITHUB_SHA??"")||!e.RUNNER_TRACKING_ID||
  e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
  [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.V39_P5_SOURCE_DATABASE_URL,e.P6_PRIVATE_READER_DATABASE_URL,e.P6_PRIVATE_PUBLISHER_DATABASE_URL].some(Boolean)||
  Object.entries(e).some(([k,v])=>k.startsWith("P6_PHASE7_")&&(/PRIVATE_KEY|DATABASE_URL/.test(k))&&v))hold("NO_PRODUCTION_CREDENTIALS");
 const tmp=e.RUNNER_TEMP??"";
 if(!tmp||realpathSync(tmp)!==tmp)hold("RUNNER");
 const dir=join(tmp,"p7-role-ci-"+e.GITHUB_RUN_ID);
 if(create){try{mkdirSync(dir,{mode:0o700})}catch(err){if((err as NodeJS.ErrnoException).code!=="EEXIST")throw err}}
 const st=lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0||realpathSync(dir)!==dir)hold("DIRECTORY");
 const scope:P7LocalPreScope={codeSha:e.GITHUB_SHA!,runId:e.GITHUB_RUN_ID!,runDayIndex:1,queryDigestSha256:h("synthetic-query"),manifestSha256:h("synthetic-manifest"),rightsSha256:h("synthetic-rights"),releaseSha256:h("synthetic-release"),providerContractSha256:h("synthetic-contract")};
 const paths={lane:join(dir,"l.sock"),proof:join(dir,"p.sock"),publisher:join(dir,"w.sock")};
 return {scope,dir,paths};
}
const fixtureWire=(p:P5Stage14SingleFlightPrePermit,role:"lane"|"proof")=>({payloadBase64:Buffer.from("SYNTHETIC_"+role+"_"+hashPhase7DurableCandidate(p)).toString("base64"),signatureBase64:Buffer.alloc(64,role==="lane"?1:2).toString("base64")});
async function start(role:P7LocalPreRole){
 const {scope,paths}=context(true);
 if(e.P7_CI_ROLE_MARKER!==role)hold("ROLE_STEP");
 const env:NodeJS.ProcessEnv={};
 for(const k of ["PATH","HOME","TMPDIR","RUNNER_TEMP","RUNNER_TRACKING_ID","GITHUB_ACTIONS","GITHUB_REPOSITORY","GITHUB_EVENT_NAME","GITHUB_RUN_ID","GITHUB_SHA","ADB_AUTO_COLLECT","V39_PHASE6_PROCESS_ARMED","P7_CI_ROLE_MARKER"])if(e[k]!==undefined)env[k]=e[k];
 await launchP7DetachedPreRole({scriptPath:fileURLToPath(import.meta.url),role,path:paths[role],scope,env,cwd:process.cwd()});
 console.log(JSON.stringify({status:"P7_SYNTHETIC_ROLE_READY",role,providerCalls:0,databaseWrites:0}));
}
async function serve(role:P7LocalPreRole){
 process.umask(0o077);const {scope,paths}=context(false);
 if(e.P7_CI_ROLE_MARKER!==role)hold("ROLE_PROCESS");
 const committed=new Set<string>();
 const service=await listenP7LocalPreRole({path:paths[role],role,scope,maxLifetimeMs:8*60000,onFatal:()=>process.exit(2),handler:async q=>{
  if(q.op==="issue_lane"||q.op==="issue_proof"){
   return {wires:q.permits.map(p=>({permitSha256:hashPhase7DurableCandidate(p),wire:fixtureWire(p,q.op==="issue_lane"?"lane":"proof")})),committedCount:0};
  }
  const expected=q.op==="publish_lane"?"lane":"proof";
  for(let i=0;i<q.permits.length;i++){
   const p=q.permits[i],k=hashPhase7DurableCandidate(p);
   if(JSON.stringify(q.wires[i].wire)!==JSON.stringify(fixtureWire(p,expected))||committed.has(expected+k)||
    (expected==="proof"&&!committed.has("lane"+k)))hold("SYNTHETIC_PUBLICATION_ORDER");
   committed.add(expected+k);
  }
  return {wires:[],committedCount:q.permits.length};
 }});
 await service.closed;
}
async function run(){
 const {scope,paths}=context(false);
 if(e.P7_CI_ROLE_MARKER)hold("NATIVE_HAS_ROLE_MARKER");
 const permits=Array.from({length:192},(_,i)=>({manifestSha256:scope.manifestSha256,expectedReviewedSourceRightsSha256:scope.rightsSha256,expectedReviewedReleaseSha256:scope.releaseSha256,
  expectedProviderContractSha256:scope.providerContractSha256,expectedGithubSourceRunId:scope.runId,runDayIndex:scope.runDayIndex,queryDigestSha256:scope.queryDigestSha256,
  horizon:"T-6h",selectedTNativeUtc:"2035-11-25T12:00:00.000Z",flightInstanceId:"leg:synthetic-"+i} as P5Stage14SingleFlightPrePermit));
 const port=openP7LocalPrivatePreHandoff({scope,paths,readStored:async p=>new Map(p.map(x=>[hashPhase7DurableCandidate(x),fixtureWire(x,"proof")]))});
 const first=await port.readExactPermitProofs(permits.slice(0,96)),second=await port.readExactPermitProofs(permits.slice(96));
 if(first.size!==96||second.size!==96)hold("PAGE_DENOMINATOR");
 let blocked=false;try{await port.readExactPermitProofs(permits.slice(0,96))}catch{blocked=true}if(!blocked)hold("REPLAY");
 console.log(JSON.stringify({status:"P7_ACTUAL_GITHUB_STEP_BOUNDARY_SYNTHETIC_PRE_HANDOFF_PASS",pages:2,syntheticPermits:192,roleProcesses:3,replayBlocked:true,providerCalls:0,databaseWrites:0,productionProofIssued:false,phase6PaidGo:false}));
}
async function stop(){
 if(!e.RUNNER_TEMP||!e.GITHUB_RUN_ID)hold("STOP");
 const dir=join(e.RUNNER_TEMP,"p7-role-ci-"+e.GITHUB_RUN_ID);
 try{lstatSync(dir)}catch(err){if((err as NodeJS.ErrnoException).code==="ENOENT")return;throw err}
 const {scope,paths}=context(false);
 for(const role of roles){try{lstatSync(paths[role]);await callP7LocalPreRole(paths[role],makeP7LocalPreRequest(scope,"stop"),5000);}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err;}}
 for(let i=0;i<40;i++){
  if(Object.values(paths).every(path=>{try{lstatSync(path);return false}catch(err){return (err as NodeJS.ErrnoException).code==="ENOENT"}}))break;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 rmdirSync(dir);console.log(JSON.stringify({status:"P7_SYNTHETIC_ROLE_SCRATCH_CLEANUP_PASS",providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
}
const [mode,role]=process.argv.slice(2);
Promise.resolve().then(()=>{
 if(mode==="run"&&!role)return run();
 if(mode==="stop"&&!role)return stop();
 if(!roles.includes(role as P7LocalPreRole))return hold("MODE");
 return mode==="start"?start(role as P7LocalPreRole):mode==="serve"?serve(role as P7LocalPreRole):hold("MODE");
}).catch(()=>{console.error("HOLD_P7_ROLE_RUNNER_REHEARSAL_REDACTED");process.exitCode=2});
