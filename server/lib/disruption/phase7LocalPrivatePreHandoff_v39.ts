/** Same reviewed, ephemeral GitHub runner, separate role processes.
 * Exact prospective permits traverse only a mode-0600 local Unix socket,
 * never GitHub outputs/artifacts, argv, public logs or another DB source
 * archive. This is process-scoped credential separation, NOT isolation
 * against a compromised runner/OS user. Production requires explicit
 * owner approval of this trust boundary. No provider request here. */
import {createServer,createConnection,type Socket} from "node:net";
import {spawn} from "node:child_process";
import {chmodSync,lstatSync,mkdirSync,realpathSync,unlinkSync} from "node:fs";
import {join} from "node:path";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {P7Wire} from "./phase7PrivateSignedReviewTransport_v39";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,GH=/^[0-9]{5,25}$/;
const hold=(s:string):never=>{throw Error("HOLD_P7_LOCAL_PRE_HANDOFF_"+s);};
const exact=(v:unknown,keys:string[])=>!!v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const sha=(x:unknown):x is string=>typeof x==="string"&&H.test(x);
const key=hashPhase7DurableCandidate;
const MAX_FRAME=24*1024*1024,MAX_PAGE=96,MAX_REQUESTS=128;
export type P7LocalPreRole="lane"|"proof"|"publisher";
export type P7LocalPreOp="ready"|"stop"|"issue_lane"|"issue_proof"|"publish_lane"|"publish_proof";
export type P7LocalPreScope={codeSha:string;runId:string;runDayIndex:number;queryDigestSha256:string;manifestSha256:string;rightsSha256:string;releaseSha256:string;providerContractSha256:string};
type WireRow={permitSha256:string;wire:P7Wire};
export type P7LocalPreRequest={schema:"v39.phase7.local-pre-handoff-request.v1";scope:P7LocalPreScope;op:P7LocalPreOp;permits:P5Stage14SingleFlightPrePermit[];wires:WireRow[];requestSha256:string};
type OK={schema:"v39.phase7.local-pre-handoff-response.v1";requestSha256:string;ok:true;wires:WireRow[];committedCount:number};
type Bad={schema:"v39.phase7.local-pre-handoff-response.v1";requestSha256:string;ok:false};
type Response=OK|Bad;
type Payload={wires:WireRow[];committedCount:number};
const ops:Record<P7LocalPreRole,readonly P7LocalPreOp[]>={lane:["issue_lane"],proof:["issue_proof"],publisher:["publish_lane","publish_proof"]};
function scopeValid(s:P7LocalPreScope){
 if(!exact(s,["codeSha","runId","runDayIndex","queryDigestSha256","manifestSha256","rightsSha256","releaseSha256","providerContractSha256"])||
  !C.test(s.codeSha)||!GH.test(s.runId)||!Number.isSafeInteger(s.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||
  ![s.queryDigestSha256,s.manifestSha256,s.rightsSha256,s.releaseSha256,s.providerContractSha256].every(sha))hold("SCOPE");
}
export function readP7LocalPreScope(env:NodeJS.ProcessEnv):P7LocalPreScope{
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
  env.GITHUB_WORKFLOW_REF!=="HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml@refs/heads/main"||
  env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||env.P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED!=="1"||
  env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL].some(Boolean))hold("PROTECTED_NO_PROVIDER_SCOPE");
 const s={codeSha:env.GITHUB_SHA??"",runId:env.GITHUB_RUN_ID??"",runDayIndex:Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX),queryDigestSha256:env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST??"",manifestSha256:env.V39_P5_MANIFEST_SHA256??"",rightsSha256:env.V39_P5_RIGHTS_SHA256??"",releaseSha256:env.V39_P5_RELEASE_SHA256??"",providerContractSha256:env.V39_P5_PROVIDER_CONTRACT_SHA256??""};
 scopeValid(s);return Object.freeze(s);
}
function frame(x:unknown){
 const b=Buffer.from(JSON.stringify(x)+"\n","utf8");
 if(b.length>MAX_FRAME)hold("FRAME_BOUND");return b;
}
function permitKeys(permits:readonly P5Stage14SingleFlightPrePermit[],s:P7LocalPreScope){
 if(!Array.isArray(permits)||permits.length<1||permits.length>MAX_PAGE)hold("PAGE_BOUND");
 const keys=permits.map(p=>{
  if(!p||p.manifestSha256!==s.manifestSha256||p.expectedReviewedSourceRightsSha256!==s.rightsSha256||
   p.expectedReviewedReleaseSha256!==s.releaseSha256||p.expectedProviderContractSha256!==s.providerContractSha256||
   p.expectedGithubSourceRunId!==s.runId||p.runDayIndex!==s.runDayIndex||p.queryDigestSha256!==s.queryDigestSha256||
   !["T-24h","T-6h","T-90m"].includes(p.horizon)||!Number.isFinite(Date.parse(p.selectedTNativeUtc))||
   new Date(p.selectedTNativeUtc).toISOString()!==p.selectedTNativeUtc||Buffer.byteLength(JSON.stringify(p))>200000)hold("EXACT_PERMIT_SCOPE");
  return key(p);
 });
 if(new Set(keys).size!==keys.length)hold("DUPLICATE_PERMIT");return keys;
}
function checkWires(rows:readonly WireRow[],keys:string[]){
 if(!Array.isArray(rows)||rows.length!==keys.length||rows.some((r,i)=>!exact(r,["permitSha256","wire"])||r.permitSha256!==keys[i]||
  !exact(r.wire,["payloadBase64","signatureBase64"])||typeof r.wire.payloadBase64!=="string"||r.wire.payloadBase64.length<4||r.wire.payloadBase64.length>27000||
  typeof r.wire.signatureBase64!=="string"||!(/^[A-Za-z0-9+/]{86}==$/).test(r.wire.signatureBase64)))hold("EXACT_WIRE_SET");
}
export function makeP7LocalPreRequest(s:P7LocalPreScope,op:P7LocalPreOp,permits:readonly P5Stage14SingleFlightPrePermit[]=[],wires:readonly WireRow[]=[]):P7LocalPreRequest{
 const body={schema:"v39.phase7.local-pre-handoff-request.v1" as const,scope:s,op,permits:[...permits],wires:[...wires]};
 const req={...body,requestSha256:key(body)};
 const transported=JSON.parse(frame(req).toString("utf8"));
 // JSON must not silently omit undefined fields or change the canonical
 // permit identity. Reject instead of reconstructing a different permit.
 validateP7LocalPreRequest(transported,s);
 if(key(transported.permits)!==key(permits))hold("TRANSPORT_BYTE_DRIFT");
 return transported;
}
export function validateP7LocalPreRequest(input:unknown,s:P7LocalPreScope,role?:P7LocalPreRole):asserts input is P7LocalPreRequest{
 scopeValid(s);
 const q=input as P7LocalPreRequest;
 if(!exact(q,["schema","scope","op","permits","wires","requestSha256"])||q.schema!=="v39.phase7.local-pre-handoff-request.v1"||
  key(q.scope)!==key(s)||!sha(q.requestSha256)||!Array.isArray(q.permits)||!Array.isArray(q.wires))hold("REQUEST_SCOPE");
 const {requestSha256,...body}=q;if(key(body)!==requestSha256)hold("REQUEST_DIGEST");
 if(q.op==="ready"||q.op==="stop"){
  if(q.permits.length!==0||q.wires.length!==0)hold("CONTROL_SCOPE");return;
 }
 if(!["issue_lane","issue_proof","publish_lane","publish_proof"].includes(q.op)||(role&&!ops[role].includes(q.op)))hold("ROLE_OPERATION");
 const ks=permitKeys(q.permits,s);
 if(q.op.startsWith("publish"))checkWires(q.wires,ks);else if(q.wires.length)hold("SIGNER_NO_CALLER_WIRE");
}
function validateResponse(raw:unknown,q:P7LocalPreRequest):OK{
 const x=raw as Response;
 if(!x||x.schema!=="v39.phase7.local-pre-handoff-response.v1"||x.requestSha256!==q.requestSha256||x.ok!==true||
  !exact(x,["schema","requestSha256","ok","wires","committedCount"]))return hold("REMOTE_HOLD_NO_REPLAY");
 if(q.op.startsWith("issue")){
  checkWires(x.wires,permitKeys(q.permits,q.scope));if(x.committedCount!==0)hold("ISSUER_WROTE");
 }else if(q.op.startsWith("publish")){
  if(!Array.isArray(x.wires)||x.wires.length!==0||x.committedCount!==q.permits.length)hold("PUBLICATION_DENOMINATOR");
 }else if(!Array.isArray(x.wires)||x.wires.length!==0||x.committedCount!==0)hold("CONTROL_RESPONSE");
 return x;
}
export function readP7BoundedLocalFrame(socket:Socket,timeoutMs:number):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  let parts:Buffer[]=[],size=0,finished=false;
  const timer=setTimeout(()=>finish(new Error("HOLD_P7_LOCAL_PRE_HANDOFF_TIMEOUT_NO_REPLAY")),timeoutMs);
  function cleanup(){clearTimeout(timer);socket.off("data",data);socket.off("error",err);socket.off("end",end);socket.off("close",end);parts=[];}
  function finish(e?:Error,v?:unknown){if(finished)return;finished=true;cleanup();if(e)reject(e);else resolve(v);}
  function err(){finish(new Error("HOLD_P7_LOCAL_PRE_HANDOFF_SOCKET_NO_REPLAY"));}
  function end(){finish(new Error("HOLD_P7_LOCAL_PRE_HANDOFF_TRUNCATED_NO_REPLAY"));}
  function data(b:Buffer){size+=b.length;if(size>MAX_FRAME){err();return;}const idx=b.indexOf(10);
   if(idx>=0&&idx!==b.length-1){err();return;}
   parts.push(b);if(idx<0)return;
   try{const value=JSON.parse(Buffer.concat(parts,size).toString("utf8"));socket.pause();finish(undefined,value);}catch{err();}
  }
  socket.on("data",data);socket.once("error",err);socket.once("end",end);socket.once("close",end);socket.resume();
 });
}
export async function callP7LocalPreRole(path:string,q:P7LocalPreRequest,timeoutMs=240000){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>240000)hold("TIME_BOUND");
 const socket=createConnection({path});socket.on("error",()=>{}); // never print route/bytes
 try{
  const reading=readP7BoundedLocalFrame(socket,timeoutMs);
  socket.write(frame(q));
  return validateResponse(await reading,q);
 }finally{socket.destroy();}
}
export async function listenP7LocalPreRole(input:{path:string;role:P7LocalPreRole;scope:P7LocalPreScope;handler:(q:P7LocalPreRequest)=>Promise<Payload>;onFatal?:()=>void;maxLifetimeMs?:number}){
 const {path,role,scope,handler}=input;scopeValid(scope);
 if(!Object.hasOwn(ops,role)||typeof handler!=="function")hold("ROLE");
 const seen=new Set<string>();let busy=false,closed=false;const sockets=new Set<Socket>();
 let resolveClosed!:()=>void;const closedPromise=new Promise<void>(resolve=>{resolveClosed=resolve});

 const server=createServer({allowHalfOpen:true},socket=>{
  sockets.add(socket);socket.on("error",()=>{});socket.once("close",()=>sockets.delete(socket));
  if(busy||closed){socket.destroy();return;}busy=true;
  let req:P7LocalPreRequest|undefined;
  void (async()=>{
   try{
    const raw=await readP7BoundedLocalFrame(socket,15000);validateP7LocalPreRequest(raw,scope,role);req=raw;
    let payload:Payload={wires:[],committedCount:0};
    if(req.op!=="ready"&&req.op!=="stop"){
     if(seen.size>=MAX_REQUESTS||seen.has(req.requestSha256))hold("DUPLICATE_OR_MAX_REQUESTS_NO_REPLAY");
     seen.add(req.requestSha256);
     // The caller has a 240s bound. A timed-out publisher is an ambiguous
     // outcome: terminate this endpoint, never accept another request.
     let deadline:ReturnType<typeof setTimeout>|undefined;
     try{payload=await Promise.race([handler(req),new Promise<Payload>((_,reject)=>{deadline=setTimeout(()=>reject(new Error("WORKER_DEADLINE")),230000);})]);}
     catch(e){if((e as Error)?.message==="WORKER_DEADLINE"){void close().finally(()=>input.onFatal?.());return;}throw e;}
     finally{if(deadline)clearTimeout(deadline);}

    }
    const response:OK={schema:"v39.phase7.local-pre-handoff-response.v1",requestSha256:req.requestSha256,ok:true,...payload};
    validateResponse(response,req);
    if(req.op==="stop"){socket.end(frame(response),()=>{void close()});}
    else socket.end(frame(response));
   }catch{
    if(req)socket.end(frame({schema:"v39.phase7.local-pre-handoff-response.v1",requestSha256:req.requestSha256,ok:false}));
    else socket.destroy();
   }finally{busy=false;}
  })();
 });
 server.maxConnections=2;
 const close=async()=>{
  if(closed)return;closed=true;clearTimeout(lifetime);
  for(const s of sockets)s.destroy();
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  try{if(lstatSync(path).isSocket())unlinkSync(path);}catch{}
  resolveClosed();
 };
 let lifetime:ReturnType<typeof setTimeout>;
 await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(path,()=>{server.off("error",reject);resolve();});});
 chmodSync(path,0o600);
 lifetime=setTimeout(()=>{void close().finally(()=>input.onFatal?.());},input.maxLifetimeMs??150*60000);
 server.on("error",()=>{void close().finally(()=>input.onFatal?.());});
 return {close,closed:closedPromise};
}
/** Existing private runner scratch directory, not a storage channel. No
 * permits/wires/credentials in files. Socket paths contain only GH run id. */
export function p7LocalPreSocketPaths(env:NodeJS.ProcessEnv,create:boolean){
 const scope=readP7LocalPreScope(env),tmp=env.RUNNER_TEMP??"";
 if(!tmp||realpathSync(tmp)!==tmp)hold("RUNNER_DIRECTORY");
 const dir=join(tmp,"p7-pre-"+scope.runId);
 if(create){try{mkdirSync(dir,{mode:0o700});}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}}
 const st=lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0||realpathSync(dir)!==dir)hold("PRIVATE_SOCKET_DIRECTORY");
 const roles={lane:join(dir,"lane.sock"),proof:join(dir,"proof.sock"),publisher:join(dir,"publisher.sock")};
 if(Object.values(roles).some(p=>Buffer.byteLength(p)>100))hold("SOCKET_PATH_BOUND");
 return {scope,dir,roles};
}
export function openP7LocalPrivatePreHandoff(input:{scope:P7LocalPreScope;paths:Record<P7LocalPreRole,string>;readStored:(p:readonly P5Stage14SingleFlightPrePermit[])=>Promise<Map<string,P7Wire>>;call?:typeof callP7LocalPreRole}){
 const {scope,paths,readStored}=input,call=input.call??callP7LocalPreRole;
 scopeValid(scope);
 return {async readExactPermitProofs(permits:readonly P5Stage14SingleFlightPrePermit[]){
  const ks=permitKeys(permits,scope);
  // All four operations block on the exact immutable original preview.
  // Any failure or unknown commit stops the sequence and the native
  // publisher; it must never regenerate the preview or replay SOURCE.
  const issueLane=await call(paths.lane,makeP7LocalPreRequest(scope,"issue_lane",permits));
  await call(paths.publisher,makeP7LocalPreRequest(scope,"publish_lane",permits,issueLane.wires));
  const issueProof=await call(paths.proof,makeP7LocalPreRequest(scope,"issue_proof",permits));
  await call(paths.publisher,makeP7LocalPreRequest(scope,"publish_proof",permits,issueProof.wires));
  const stored=await readStored(permits);
  if(!(stored instanceof Map)||stored.size!==ks.length||ks.some((k,i)=>JSON.stringify(stored.get(k))!==JSON.stringify(issueProof.wires[i].wire)))hold("FINAL_INDEPENDENT_READBACK_DRIFT");
  return stored;
 }};
}

/** Exact launcher shared by production and a no-secret GitHub cross-step
 * process rehearsal. Child stays under the runner's orphan-cleanup ID.
 * Production caller first projects its approved role-only credentials. */
export async function launchP7DetachedPreRole(input:{scriptPath:string;role:P7LocalPreRole;path:string;scope:P7LocalPreScope;env:NodeJS.ProcessEnv;cwd:string}){
 const {scriptPath,role,path,scope,env,cwd}=input;scopeValid(scope);
 if(!Object.hasOwn(ops,role)||!env.RUNNER_TRACKING_ID||!scriptPath.endsWith(".ts")||!scriptPath.startsWith(cwd+"/")||realpathSync(scriptPath)!==scriptPath)hold("LAUNCH_SCOPE");
 const child=spawn(process.execPath,["--import","tsx",scriptPath,"serve",role],{env,cwd,detached:true,stdio:"ignore"});
 let exited=false;child.once("exit",()=>{exited=true});child.once("error",()=>{exited=true});
 try{
  const until=Date.now()+60000;
  while(Date.now()<until&&!exited){
   let s;try{s=lstatSync(path)}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err;}
   if(s){
    if(!s.isSocket()||s.uid!==process.getuid?.()||(s.mode&0o077)!==0)hold("SOCKET_PERMISSION");
    await callP7LocalPreRole(path,makeP7LocalPreRequest(scope,"ready"),5000);
    child.unref();return;
   }
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  hold("ROLE_STARTUP_UNVERIFIED");
 }catch(err){try{child.kill("SIGTERM")}catch{}throw err}
}
