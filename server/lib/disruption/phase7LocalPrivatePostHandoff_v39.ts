/** Same-run POST review IPC, using the existing bounded local frame reader.
 * Same trusted ephemeral runner, role-scoped credentials, no raw body or
 * wire in GitHub outputs/artifacts. Not hostile-OS-user isolation. */
import {createConnection,createServer,type Socket} from "node:net";
import {chmodSync,lstatSync,mkdirSync,realpathSync,unlinkSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {hashPhase7DurableCandidate as hash} from "./phase7DurableDerivedBundleCandidate_v39";
import {readP7BoundedLocalFrame} from "./phase7LocalPrivatePreHandoff_v39";
import {openP7PrivateSignedReviewReader,postRecoveryReviewSelector,postSettlementReviewSelector,p7ReviewPath,type P7ReviewSelector} from "./phase7PrivateSignedReviewTransport_v39";
import type {Phase7PrivateOutcomeReviewTransport} from "./phase7SignedPostConsumer_v39";
import type {P6PostCommittedScope} from "./phase6ActualPostOutcomeObservability_v39";
import type {P7RecoverySelector} from "./phase7StoredPostRecoveryAdmission_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_LOCAL_POST_"+s)};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,R=/^[1-9][0-9]{4,14}$/;
const exact=(v:any,k:string[])=>!!v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
type Scope={runId:string;codeSha:string;manifestSha256:string;rightsSha256:string;originalRunId:string;day:number;packetSha256:string};
export type PostRole="reviewer"|"publisher";
type Op="ready"|"stop"|"recovery"|"prepare"|"settlement"|"publish";
type Request={scope:Scope;op:Op;body:any;sha256:string};
const bytes=(x:unknown)=>{const b=Buffer.from(JSON.stringify(x)+"\n");if(b.length>1024*1024)hold("FRAME_BOUND");return b};
export function postLocalScope(e:NodeJS.ProcessEnv):Scope{
 const recovery=e.P6_PHASE7_POST_RECOVERY_CONFIRM==="RECOVER_EXACT_COMMITTED_POST_NO_PROVIDER";
 const original=recovery?e.P6_PHASE7_ORIGINAL_POST_RUN_ID:e.GITHUB_RUN_ID;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_RUN_ATTEMPT!=="1"||
  e.GITHUB_SHA!==e.V39_P5_POST_APPROVED_CODE_SHA||!C.test(e.GITHUB_SHA??"")||!R.test(e.GITHUB_RUN_ID??"")||!R.test(original??"")||
  ![e.V39_P5_MANIFEST_SHA256,e.V39_P5_RIGHTS_SHA256,e.P6_PRIVATE_POST_PACKET_SHA].every(x=>H.test(x??""))||
  !/^(?:[1-9]|[12][0-9]|3[01])$/.test(e.P6_PRIVATE_POST_DAY??"")||e.ADB_AUTO_COLLECT!=="0"||e.P6_PHASE7_POST_RECOVERY_APPROVED!=="1"||
  (recovery?original===e.GITHUB_RUN_ID||!["workflow_run","workflow_dispatch"].includes(e.GITHUB_EVENT_NAME??""):
    e.GITHUB_EVENT_NAME!=="workflow_dispatch"||e.GITHUB_WORKFLOW_REF!=="HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml@refs/heads/main"))hold("PROTECTED_SCOPE");
 return {runId:e.GITHUB_RUN_ID!,codeSha:e.GITHUB_SHA!,manifestSha256:e.V39_P5_MANIFEST_SHA256!,rightsSha256:e.V39_P5_RIGHTS_SHA256!,originalRunId:original!,day:Number(e.P6_PRIVATE_POST_DAY),packetSha256:e.P6_PRIVATE_POST_PACKET_SHA!};
}
export function postSocketPaths(e:NodeJS.ProcessEnv,create=false){
 const scope=postLocalScope(e),tmp=e.RUNNER_TEMP??"";
 if(!tmp||realpathSync(tmp)!==tmp)hold("RUNNER_DIRECTORY");
 const dir=join(tmp,"p7-post-"+scope.runId);
 if(create){try{mkdirSync(dir,{mode:0o700})}catch(err){if((err as NodeJS.ErrnoException).code!=="EEXIST")throw err;}}
 const st=lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid?.()||(st.mode&0o077)!==0||realpathSync(dir)!==dir)hold("PRIVATE_DIRECTORY");
 const paths={reviewer:join(dir,"review.sock"),publisher:join(dir,"publish.sock")};
 if(Object.values(paths).some(p=>Buffer.byteLength(p)>100))hold("SOCKET_BOUND");
 return {scope,dir,paths};
}
function assertCommitted(s:Scope,c:P6PostCommittedScope){
 if(!c||c.packet?.manifestSha256!==s.manifestSha256||c.packet.reviewedSourceRightsSha256!==s.rightsSha256||c.packet.runDayIndex!==s.day||
  c.packet.githubRunId!==s.originalRunId||!H.test(c.reservationSha256??"")||!H.test(c.responseSha256??""))hold("COMMITTED_SCOPE");
}
function validate(q:Request,s:Scope,role?:PostRole){
 if(!exact(q,["scope","op","body","sha256"])||Buffer.byteLength(JSON.stringify(q))>1024*1024||hash(q.scope)!==hash(s)||hash({scope:q.scope,op:q.op,body:q.body})!==q.sha256)hold("REQUEST_SCOPE");
 if(q.op==="ready"||q.op==="stop"){if(q.body!==null)hold("CONTROL");return;}
 if(q.op==="publish"){
  if(role==="reviewer"||!exact(q.body,["selector","wire"]))hold("PUBLISH_SCOPE");
  const x=q.body.selector as P7ReviewSelector;p7ReviewPath(x);
  if(x.runDayIndex!==s.day||!["POST_RECOVERY","POST_SETTLEMENT"].includes(x.kind))hold("PUBLISH_SELECTOR");
 }else{
  if(role==="publisher"||!["recovery","prepare","settlement"].includes(q.op))hold("OPERATION");
  assertCommitted(s,q.body?.committed);
  if(q.op==="recovery"&&(!exact(q.body,["committed","priorAudit"])||!exact(q.body.priorAudit,["sha256","observedAtUtc"])))hold("PRIOR_AUDIT");
  if(q.op==="prepare"&&!exact(q.body,["committed"]))hold("PREPARE");
  if(q.op==="settlement"&&(!exact(q.body,["committed","anchor","fragments","observedDbClockUtc"])||!Array.isArray(q.body.fragments)||q.body.fragments.length<1||q.body.fragments.length>3))hold("GROUP");
 }
}
export async function callP7PostRole(path:string,scope:Scope,op:Op,body:any=null,timeout=45000){
 const raw={scope,op,body},q={...raw,sha256:hash(raw)};validate(q,scope);
 const s=createConnection({path});s.on("error",()=>{});
 try{const p=readP7BoundedLocalFrame(s,timeout);s.write(bytes(q));const x=await p as any;
  if(!exact(x,["request","ok","value"])||x.request!==q.sha256||x.ok!==true)hold("REMOTE_HOLD_NO_REPLAY");
  return x.value;
 }finally{s.destroy()}
}
export async function listenP7PostRole(path:string,scope:Scope,role:PostRole,handler:(q:Request)=>Promise<any>){
 let busy=false,closed=false,failed=false;const seen=new Set<string>(),sockets=new Set<Socket>();
 let done!:()=>void;const finished=new Promise<void>(r=>{done=r});
 const server=createServer({allowHalfOpen:true},s=>{
  sockets.add(s);s.on("error",()=>{});s.once("close",()=>sockets.delete(s));
  if(busy||closed){s.destroy();return;}busy=true;
  void(async()=>{let q:Request|undefined;
   try{q=await readP7BoundedLocalFrame(s,10000) as Request;validate(q,scope,role);
    let value:any=null;
    if(q.op==="ready"&&failed)hold("ROLE_HELD");
    if(q.op!=="ready"&&q.op!=="stop"){
     if(failed||seen.has(q.sha256)||seen.size>=2600)hold("NO_REPLAY");
     seen.add(q.sha256);value=await handler(q);
    }
    const response={request:q.sha256,ok:true,value};
    if(q.op==="stop")s.end(bytes(response),()=>{void close()});else s.end(bytes(response));
   }catch{failed=true;if(q)s.end(bytes({request:q.sha256,ok:false,value:null}));else s.destroy();}
   finally{busy=false}
  })();
 });
 const close=async()=>{if(closed)return;closed=true;clearTimeout(timer);for(const s of sockets)s.destroy();await new Promise<void>(r=>server.close(()=>r()));try{if(lstatSync(path).isSocket())unlinkSync(path)}catch{}done()};
 await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(path,()=>{server.off("error",reject);resolve()})});
 chmodSync(path,0o600);const timer=setTimeout(()=>{void close()},14*60000);
 server.on("error",()=>{void close()});
 return {closed:finished,close};
}
/** Recovery completion event has no workflow input selector. Reuse the
 * existing private, exact recovery handoff created by the independently
 * authenticated discovery step; never trust public event payload data. */
export function withP7PostRecoverySelector(e:NodeJS.ProcessEnv):NodeJS.ProcessEnv{
 if(e.P6_PHASE7_POST_RECOVERY_CONFIRM!=="RECOVER_EXACT_COMMITTED_POST_NO_PROVIDER")return e;
 const runId=e.GITHUB_RUN_ID;
 const temp=e.RUNNER_TEMP;
 if(!R.test(runId??"")||!temp||realpathSync(temp)!==temp)hold("RECOVERY_HANDOFF_ROOT");
 const path=join(temp,"p7-recovery-"+runId+".json"),st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid?.()||st.nlink!==1||(st.mode&0o077)!==0||st.size<100||st.size>14000)hold("RECOVERY_HANDOFF_FILE");
 const w=JSON.parse(readFileSync(path,"utf8")),s=w.selector as P7RecoverySelector;
 if(w.schema!=="v39.phase7.recovery-runner-wire.v1"||w.runId!==runId||s?.originalGithubRunId!==e.P6_PHASE7_ORIGINAL_POST_RUN_ID)hold("RECOVERY_HANDOFF_SCOPE");
 return {...e,P6_PRIVATE_POST_DAY:String(s.runDayIndex),P6_PRIVATE_POST_REVISION:String(s.indexRevision),P6_PRIVATE_POST_INDEX_SHA:s.indexSha256,
  P6_PRIVATE_POST_SHARD:String(s.shardIndex),P6_PRIVATE_POST_PACKET_SHA:s.packetSha256,P6_PRIVATE_POST_ROUTE_SHA:s.routingIntentSha256};
}
export function exactPostLocalSelector(e:NodeJS.ProcessEnv):P7RecoverySelector{
 const x=postLocalScope(e);
 return {runDayIndex:x.day,indexRevision:Number(e.P6_PRIVATE_POST_REVISION),indexSha256:e.P6_PRIVATE_POST_INDEX_SHA??"",shardIndex:Number(e.P6_PRIVATE_POST_SHARD),packetSha256:x.packetSha256,routingIntentSha256:e.P6_PRIVATE_POST_ROUTE_SHA??"",originalGithubRunId:x.originalRunId};
}
/** Consumer only holds restricted reader access. Signer and publisher are
 * separate already-ready processes. Exact existing wires are reused; only
 * a definitive missing row permits a fresh independent signature. */
export function openP7LocalPostTransport(e:NodeJS.ProcessEnv,call=callP7PostRole):Phase7PrivateOutcomeReviewTransport{
 const {scope,paths}=postSocketPaths(e),reader=openP7PrivateSignedReviewReader(e);
 const read=async(s:P7ReviewSelector)=>{const w=(await reader.read([s])).get(s.scopeSha256);if(!w)return hold("EXACT_READBACK");return w;};
 const missing=(err:unknown)=>(err as Error)?.message==="HOLD_P7_PRIVATE_REVIEW_TRANSPORT_MISSING_EXACT_REVIEW_NO_FALLBACK";
 let prepared:string|null=null;
 async function publish(s:P7ReviewSelector,w:unknown){
  await call(paths.publisher,scope,"publish",{selector:s,wire:w});
  const v=await read(s);if(hash(v)!==hash(w))hold("PUBLISHED_WIRE_DRIFT");return v;
 }
 return {async preflight(p){
  if(p.manifestSha256!==scope.manifestSha256||p.reviewedSourceRightsSha256!==scope.rightsSha256||p.runDayIndex!==scope.day||p.githubRunId!==scope.originalRunId)hold("PACKET_SCOPE");
  await reader.inspect();await call(paths.reviewer,scope,"ready");await call(paths.publisher,scope,"ready");
  return {providerCalls:0,writeAuthority:false,independentReviewerAvailable:true,recoveryReceiptCustodyAvailable:true};
 },readExactRecoveryReceipt:s=>read(postRecoveryReviewSelector(s)),
 async readOrRecordExactRecoveryReceipt(input){
  assertCommitted(scope,input.committed);
  const selector=postRecoveryReviewSelector(input.committed);
  try{return await read(selector)}catch(err){if(!missing(err))throw err}
  const w=await call(paths.reviewer,scope,"recovery",input);
  return publish(selector,w);
 },async readExactReview(input){
  assertCommitted(scope,input.committed);
  const selector=postSettlementReviewSelector(input.committed,input.anchor,input.fragments);
  try{return await read(selector)}catch(err){if(!missing(err))throw err}
  const k=hash(input.committed);
  if(prepared===null){await call(paths.reviewer,scope,"prepare",{committed:input.committed});prepared=k}
  if(prepared!==k)hold("ONE_ORIGINAL");
  const w=await call(paths.reviewer,scope,"settlement",input);
  return publish(selector,w);
 }};
}
