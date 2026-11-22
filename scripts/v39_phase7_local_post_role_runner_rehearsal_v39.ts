/** Actual GH-hosted process/step boundary rehearsal of the production POST
 * socket/frame/role protocol. All requests, IDs, wires and review decisions
 * are explicitly synthetic. No provider, production secret, DB call, actual
 * signed review, SOURCE dispatch, durable claim or paid activation. */
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {lstatSync,mkdirSync,realpathSync,rmdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {callP7PostRole,listenP7PostRole,type PostRole} from "../server/lib/disruption/phase7LocalPrivatePostHandoff_v39";
import {hashPhase7DurableCandidate as hash} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {postRecoveryReviewSelector,type P7ReviewSelector} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
import type {P6PostCommittedScope} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
const e=process.env,hold=(s:string):never=>{throw Error("HOLD_P7_POST_ROLE_CI_"+s)};
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
const roles=["reviewer","publisher"] as const,modes=["normal","recovery"] as const;
type Mode=typeof modes[number];
type Scope=Parameters<typeof listenP7PostRole>[1];
function context(create=false){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_EVENT_NAME!=="pull_request"||
  !/^[1-9][0-9]{4,14}$/.test(e.GITHUB_RUN_ID??"")||!(/^[a-f0-9]{40}$/).test(e.GITHUB_SHA??"")||!e.RUNNER_TRACKING_ID||
  e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
  [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.V39_P5_SOURCE_DATABASE_URL,e.P6_PRIVATE_READER_DATABASE_URL,e.P6_PRIVATE_PUBLISHER_DATABASE_URL,e.GITHUB_TOKEN].some(Boolean)||
  Object.entries(e).some(([k,v])=>v&&(/^(P6_PHASE7_|P5_V39_|P6_PRIVATE_)/.test(k))&&/PRIVATE_KEY|KEY_BASE64|DATABASE_URL/.test(k)))hold("NO_PRODUCTION_CREDENTIALS");
 const tmp=e.RUNNER_TEMP??"";
 if(!tmp||realpathSync(tmp)!==tmp)hold("RUNNER_DIRECTORY");
 const dir=join(tmp,"p7-post-ci-"+e.GITHUB_RUN_ID);
 if(create){try{mkdirSync(dir,{mode:0o700})}catch(err){if((err as NodeJS.ErrnoException).code!=="EEXIST")throw err}}
 const st=lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0||realpathSync(dir)!==dir)hold("PRIVATE_DIRECTORY");
 const scope=(mode:Mode):Scope=>({runId:e.GITHUB_RUN_ID!,codeSha:e.GITHUB_SHA!,manifestSha256:h("synthetic-manifest"),rightsSha256:h("synthetic-rights"),originalRunId:mode==="normal"?e.GITHUB_RUN_ID!:String(BigInt(e.GITHUB_RUN_ID!)-1n),day:1,packetSha256:h("synthetic-packet-"+mode)});
 const path=(mode:Mode,role:PostRole)=>join(dir,mode[0]+(role==="reviewer"?"r":"p")+".sock");
 for(const mode of modes)for(const role of roles)if(Buffer.byteLength(path(mode,role))>100)hold("SOCKET_BOUND");
 return {dir,scope,path};
}
function fixture(s:Scope){
 const committed={packet:{manifestSha256:s.manifestSha256,reviewedSourceRightsSha256:s.rightsSha256,runDayIndex:s.day,githubRunId:s.originalRunId},reservationSha256:h("synthetic-reservation-"+s.originalRunId),responseSha256:h("synthetic-response-"+s.originalRunId)} as P6PostCommittedScope;
 const priorAudit={sha256:h("synthetic-prior-audit"),observedAtUtc:"2035-01-01T00:01:00.000Z"};
 const recovery={committed,priorAudit},prepare={committed};
 const settlement={committed,anchor:{synthetic:true},fragments:[{synthetic:true}],observedDbClockUtc:"2035-01-01T00:02:00.000Z"};
 const recoverySelector=postRecoveryReviewSelector(committed);
 const settlementSelector:P7ReviewSelector={kind:"POST_SETTLEMENT",runDayIndex:s.day,scopeSha256:hash(settlement)};
 const wire=(selector:P7ReviewSelector)=>({payloadBase64:Buffer.from("SYNTHETIC_ONLY:"+hash({s,selector})).toString("base64"),signatureBase64:Buffer.alloc(64,selector.kind==="POST_RECOVERY"?1:2).toString("base64")});
 return {recovery,prepare,settlement,recoverySelector,settlementSelector,wire};
}
async function serve(role:PostRole){
 process.umask(0o077);
 const {scope,path}=context();
 if(e.P7_POST_CI_ROLE_MARKER!==role)hold("ROLE_PROCESS");
 const services=[];
 try{
  for(const mode of modes){
   const s=scope(mode),f=fixture(s);let recovered=false,prepared=false,settled=false,publishedRecovery=false,publishedSettlement=false;
   services.push(await listenP7PostRole(path(mode,role),s,role,async q=>{
    if(role==="reviewer"){
     if(q.op==="recovery"&&!recovered&&hash(q.body)===hash(f.recovery)){recovered=true;return f.wire(f.recoverySelector)}
     if(q.op==="prepare"&&recovered&&!prepared&&hash(q.body)===hash(f.prepare)){prepared=true;return {syntheticPrepared:true}}
     if(q.op==="settlement"&&prepared&&!settled&&hash(q.body)===hash(f.settlement)){settled=true;return f.wire(f.settlementSelector)}
     return hold("SYNTHETIC_REVIEW_ORDER");
    }
    if(q.op!=="publish")return hold("SYNTHETIC_PUBLISH_ROLE");
    const sel=q.body.selector as P7ReviewSelector;
    if(hash(q.body.wire)!==hash(f.wire(sel)))hold("SYNTHETIC_WIRE");
    if(hash(sel)===hash(f.recoverySelector)&&!publishedRecovery)publishedRecovery=true;
    else if(hash(sel)===hash(f.settlementSelector)&&publishedRecovery&&!publishedSettlement)publishedSettlement=true;
    else return hold("SYNTHETIC_PUBLISH_ORDER");
    return {syntheticWireSha256:hash(q.body.wire)};
   }));
  }
  await Promise.all(services.map(s=>s.closed));
 }finally{await Promise.allSettled(services.map(s=>s.close()))}
}
async function start(role:PostRole){
 process.umask(0o077);
 const {scope,path}=context(true);
 if(e.P7_POST_CI_ROLE_MARKER!==role)hold("ROLE_STEP");
 for(const mode of modes){try{lstatSync(path(mode,role));hold("SOCKET_REPLAY")}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}}
 const env:NodeJS.ProcessEnv={};
 for(const k of ["PATH","HOME","TMPDIR","RUNNER_TEMP","RUNNER_TRACKING_ID","GITHUB_ACTIONS","GITHUB_REPOSITORY","GITHUB_EVENT_NAME","GITHUB_RUN_ID","GITHUB_SHA","ADB_AUTO_COLLECT","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED","P7_POST_CI_ROLE_MARKER"])if(e[k]!==undefined)env[k]=e[k];
 const child=spawn(process.execPath,["--import","tsx",fileURLToPath(import.meta.url),"serve",role],{env,detached:true,stdio:"ignore"});
 let gone=false;child.once("exit",()=>{gone=true});child.once("error",()=>{gone=true});
 try{const until=Date.now()+60000;
  while(Date.now()<until&&!gone){
   const ready=modes.every(mode=>{try{const st=lstatSync(path(mode,role));return st.isSocket()&&st.uid===process.getuid?.()&&(st.mode&0o077)===0}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err;return false}});
   if(ready){for(const mode of modes)await callP7PostRole(path(mode,role),scope(mode),"ready",null,5000);child.unref();console.log(JSON.stringify({status:"P7_SYNTHETIC_POST_ROLE_READY",role,providerCalls:0,databaseWrites:0}));return}
   await new Promise(r=>setTimeout(r,200));
  }hold("STARTUP");
 }catch(err){child.kill("SIGTERM");throw err}
}
async function rejects(f:()=>Promise<unknown>,suffix:string){
 let rejected=false;try{await f()}catch(err){if(!String((err as Error).message).includes(suffix))throw err;rejected=true}
 if(!rejected)hold("NEGATIVE_CONTROL_ACCEPTED");
}
async function run(){
 const {scope,path}=context();
 if(e.P7_POST_CI_ROLE_MARKER)hold("NATIVE_HAS_ROLE_MARKER");
 for(const mode of modes){
  const s=scope(mode),f=fixture(s),review=path(mode,"reviewer"),publisher=path(mode,"publisher");
  await callP7PostRole(review,s,"ready");await callP7PostRole(publisher,s,"ready");
  const wrong=fixture(scope(mode==="normal"?"recovery":"normal"));
  await rejects(()=>callP7PostRole(review,s,"recovery",wrong.recovery),"COMMITTED_SCOPE");
  const rw=await callP7PostRole(review,s,"recovery",f.recovery);
  if(hash(rw)!==hash(f.wire(f.recoverySelector)))hold("RECOVERY_WIRE");
  const rp=await callP7PostRole(publisher,s,"publish",{selector:f.recoverySelector,wire:rw});
  if(rp.syntheticWireSha256!==hash(rw))hold("RECOVERY_PUBLISH");
  const pre=await callP7PostRole(review,s,"prepare",f.prepare);
  if(pre.syntheticPrepared!==true)hold("PREPARE");
  const sw=await callP7PostRole(review,s,"settlement",f.settlement);
  if(hash(sw)!==hash(f.wire(f.settlementSelector)))hold("SETTLEMENT_WIRE");
  const sp=await callP7PostRole(publisher,s,"publish",{selector:f.settlementSelector,wire:sw});
  if(sp.syntheticWireSha256!==hash(sw))hold("SETTLEMENT_PUBLISH");
  await rejects(()=>callP7PostRole(publisher,s,"publish",{selector:f.settlementSelector,wire:sw}),"REMOTE_HOLD_NO_REPLAY");
  await rejects(()=>callP7PostRole(publisher,s,"ready"),"REMOTE_HOLD_NO_REPLAY");
  await rejects(()=>callP7PostRole(review,s,"publish",{selector:f.settlementSelector,wire:sw}),"REMOTE_HOLD_NO_REPLAY");
  await rejects(()=>callP7PostRole(review,s,"ready"),"REMOTE_HOLD_NO_REPLAY");
 }
 console.log(JSON.stringify({status:"P7_ACTUAL_GITHUB_STEP_BOUNDARY_SYNTHETIC_POST_HANDOFF_PASS",roleProcesses:2,modeCount:2,syntheticRecoveries:2,syntheticSettlements:2,syntheticPublishes:4,wrongOriginalBlocked:2,duplicatePublishBlocked:2,crossRoleBlocked:2,heldRolesRemainHeld:4,providerCalls:0,databaseReads:0,databaseWrites:0,productionProofIssued:false,phase6PaidGo:false}));
}
async function stop(){
 if(!e.RUNNER_TEMP||!e.GITHUB_RUN_ID)hold("STOP");
 const dir=join(e.RUNNER_TEMP,"p7-post-ci-"+e.GITHUB_RUN_ID);
 try{lstatSync(dir)}catch(err){if((err as NodeJS.ErrnoException).code==="ENOENT")return;throw err}
 const {scope,path}=context();
 const all=modes.flatMap(mode=>roles.map(role=>({mode,path:path(mode,role)})));
 for(const p of all){try{const st=lstatSync(p.path);if(!st.isSocket()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0)hold("STOP_SOCKET");await callP7PostRole(p.path,scope(p.mode),"stop",null,5000)}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}}
 for(let i=0;i<40;i++){if(all.every(p=>{try{lstatSync(p.path);return false}catch(err){return (err as NodeJS.ErrnoException).code==="ENOENT"}}))break;await new Promise(r=>setTimeout(r,50))}
 rmdirSync(dir);console.log(JSON.stringify({status:"P7_SYNTHETIC_POST_ROLE_SCRATCH_CLEANUP_PASS",providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
}
const [mode,role]=process.argv.slice(2);
Promise.resolve().then(()=>{
 if(mode==="run"&&!role)return run();
 if(mode==="stop"&&!role)return stop();
 if(!roles.includes(role as PostRole))return hold("MODE");
 return mode==="start"?start(role as PostRole):mode==="serve"?serve(role as PostRole):hold("MODE");
}).catch(()=>{console.error("HOLD_P7_POST_ROLE_CI_REDACTED");process.exitCode=2});
