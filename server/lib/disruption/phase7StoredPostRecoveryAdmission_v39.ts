/** Independent no-GET restart admission for one previously attempted signed
 * POST. Verifies the actual retained day revision, original signed packet and
 * GitHub child identity. Never calls the paid-child admission/dispatcher.
 * A closed dispatch window is permitted only inside the existing recovery
 * bound, and only an actual committed original + independent receipt may
 * pass the subsequent recovery readback. No workflow inputs are authority.
 */
import {createHash,type KeyObject} from "node:crypto";
import {Client,Pool} from "pg";
import {readP6StablePostTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39";
import {admitP5FuturePostFrozenForReadOnly} from "./phase5FuturePostGithubReadonlyRelease_v39";
import {makeP5Stage28DedicatedRolePool} from "./phase5Stage28DedicatedRolePool_v39";
import {readP6CommittedPostOutcomeObservability} from "./phase6ActualPostOutcomeObservability_v39";
import {discoverPhase7CommittedPostScope,recoverPhase7CommittedPost,phase7CommittedPostAuditIdentity,issuePhase7CommittedPostRecoveryReceipt,verifyPhase7RecoveryReceiptForAudit} from "./phase7CommittedPostRecovery_v39";
import {openPhase7ProtectedPostConsumer} from "./phase7ProtectedPostResolver_v39";
import {openP7StoredPostRecoveryTransport,openP7StoredRecoveryReceiptPort,postRecoveryReviewSelector} from "./phase7PrivateSignedReviewTransport_v39";
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import type {Phase7PostConsumer} from "./phase7PostPreservationBridge_v39";
import type {P6PostCommittedScope} from "./phase6ActualPostOutcomeObservability_v39";
import type {P6ProspectiveShardHandoff} from "./phase6SignedThirtyOneDayShardHandoff_v39";
import type {P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,RUN=/^[1-9][0-9]{4,14}$/;
const REPO="HKcode22/ReplitTranvr",WORKFLOW=".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml";
const HOLD=(s:string):never=>{throw Error("HOLD_P7_STORED_POST_RECOVERY_"+s);};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const at=(s:unknown)=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s)))return HOLD("CLOCK");return Date.parse(s)};
export interface P7RecoverySelector{
 runDayIndex:number;indexRevision:number;indexSha256:string;shardIndex:number;packetSha256:string;
 routingIntentSha256:string;originalGithubRunId:string;
}
const integer=(n:unknown,max:number)=>typeof n==="number"&&Number.isSafeInteger(n)&&n>=1&&n<=max;
function selectorOK(s:P7RecoverySelector){
 return s&&integer(s.runDayIndex,31)&&integer(s.indexRevision,1024)&&integer(s.shardIndex,100000)&&
 [s.indexSha256,s.packetSha256,s.routingIntentSha256].every(x=>H.test(x??""))&&RUN.test(s.originalGithubRunId??"");
}
const readonlyScope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
function admitRecoveryBase(env:NodeJS.ProcessEnv,originalGithubRunId:string){
 if(!RUN.test(originalGithubRunId)||env.P6_PHASE7_POST_RECOVERY_APPROVED!=="1"||env.GITHUB_ACTIONS!=="true"||
  env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
  !["workflow_dispatch","schedule","workflow_run"].includes(env.GITHUB_EVENT_NAME??"")||env.GITHUB_RUN_ATTEMPT!=="1"||
  !C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_POST_APPROVED_CODE_SHA||
  !RUN.test(env.GITHUB_RUN_ID??"")||env.GITHUB_RUN_ID===originalGithubRunId||
  env.ADB_AUTO_COLLECT!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,
   env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
   env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P6_PRIVATE_PUBLISHER_DATABASE_URL,
   env.P5_V39_PRE_DATABASE_URL,env.P5_V39_PREPARE_DATABASE_URL,env.P5_V39_T24_WITNESS_DATABASE_URL].some(Boolean)||
  Object.entries(env).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v)||
  ![env.V39_P5_POST_CATEGORY_BUDGET_SHA256,env.V39_P5_POST_PROVIDER_CONTRACT_SHA256,
    env.V39_P5_FRAME_HASH,env.V39_P5_POST_PRICE_SHA256].every(v=>H.test(v??""))||
  typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16)HOLD("EXACT_NO_PAID_SCOPE");
 const trust=readP6StablePostTrust(env);
 const url=(raw:string|undefined,login:string)=>{
  let u:URL;try{u=new URL(raw??"");}catch{return HOLD("RESTRICTED_URL");}
  if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!==login||!u.password||
     u.pathname!=="/neondb"||u.hash||u.searchParams.getAll("sslmode").length!==1||
     !["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
     [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
     (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))HOLD("RESTRICTED_TLS_URL");
  u.searchParams.set("sslmode","verify-full");return u;
 };
 const reader=url(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin),
  source=url(env.V39_P5_SOURCE_DATABASE_URL,"phase5_p5_source_login_20261108");
 if(reader.username===source.username||!sameP6NeonDatabaseEndpoint(reader,source))HOLD("SAME_EXISTING_ENDPOINT");
 const out={trust,providerCalls:0};
 return Object.freeze(Object.defineProperties(out,{
  privateReaderUrl:{value:reader.toString(),enumerable:false},privateSourceUrl:{value:source.toString(),enumerable:false}
 })) as typeof out&{readonly privateReaderUrl:string;readonly privateSourceUrl:string};
}
export function admitP7StoredPostRecovery(env:NodeJS.ProcessEnv,s:P7RecoverySelector){
 if(!selectorOK(s))HOLD("EXACT_NO_PAID_SCOPE");
 const a=admitRecoveryBase(env,s.originalGithubRunId);
 return Object.freeze(Object.defineProperties({...a,selector:s},{
  privateReaderUrl:{value:a.privateReaderUrl,enumerable:false},privateSourceUrl:{value:a.privateSourceUrl,enumerable:false}
 })) as typeof a&{selector:P7RecoverySelector};
}
/** This selector has no access to paid routes or reservations. */
export function selectP7RecoverablePostRoute(handoff:any,s:P7RecoverySelector):P6ProspectiveShardHandoff{
 const z=handoff?.redactedSummary,r=Object.getOwnPropertyDescriptor(handoff??{},"privateRecoverablePostRoutingCandidates");
 if(!selectorOK(s)||z?.status!=="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"||
  z.runDayIndex!==s.runDayIndex||z.indexRevision!==s.indexRevision||z.externallySignedDayEpochIndexSha256!==s.indexSha256||
  z.reviewedEd25519SourceWasOriginalDayBytes!==true||z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
  !r||r.enumerable!==false||!Array.isArray(r.value)||r.value.length>1024||typeof handoff.getFrozen!=="function")HOLD("AUTHENTICATED_RECOVERY_INDEX");
 const hits=r!.value.filter((x:P6ProspectiveShardHandoff)=>x.lane==="POST"&&x.runDayIndex===s.runDayIndex&&
  x.shardIndex===s.shardIndex&&x.signedFrozenSha256===s.packetSha256&&x.routingIntentSha256===s.routingIntentSha256);
 if(hits.length!==1)HOLD("EXACT_RECOVERY_ROUTE");
 const x:P6ProspectiveShardHandoff=hits[0],now=at(z.observedRealPgClockUtc);
 if(!x.privateBytesOnlyFromRestrictedReader||x.newPaidDispatchAuthorizedHere!==false||
  now<at(x.notBeforeUtc)||now>=at(x.hardLatestUtc)+600000||
  !x.boundSourceRegistryPath||!H.test(x.boundSourceRegistrySha256??""))HOLD("RECOVERY_ROUTE_WINDOW");
 const p=handoff.getFrozen(x.signedFrozenPath),src=handoff.getFrozen(x.boundSourceRegistryPath);
 if(!Buffer.isBuffer(p)||sha(p)!==s.packetSha256||!Buffer.isBuffer(src)||sha(src)!==x.boundSourceRegistrySha256)HOLD("RECOVERY_EXACT_BYTES");
 return x;
}
/** GitHub history is evidence of which original run to look up, never
 * proof of a reservation/response. Only first-attempt terminal children,
 * within the signed original dispatch window, are admitted. A failed
 * child without committed data subsequently holds in the original DB read. */
export function verifyP7OriginalPostRun(run:any,s:P7RecoverySelector,route:P6ProspectiveShardHandoff,code:string,clock:string){
 if(!selectorOK(s)||!C.test(code)||!run||String(run.id)!==s.originalGithubRunId||
  run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
  run.path!==WORKFLOW||run.head_branch!=="main"||run.head_sha!==code||
  run.event!=="workflow_dispatch"||run.run_attempt!==1||run.status!=="completed"||
  !["success","failure","cancelled","timed_out"].includes(run.conclusion)||
  run.display_title!=="P5 POST "+s.packetSha256)HOLD("ORIGINAL_GITHUB_RUN_IDENTITY");
 const create=at(run.created_at),start=at(run.run_started_at),updated=at(run.updated_at),now=at(clock);
 if(create<at(route.notBeforeUtc)||create>=at(route.hardLatestUtc)||start<create||
  start>=at(route.hardLatestUtc)||updated<start||updated>now+5000||now-updated>600000)
  HOLD("ORIGINAL_GITHUB_RUN_CLOCK");
 return s.originalGithubRunId;
}
export async function readP7OriginalPostRun(env:NodeJS.ProcessEnv,s:P7RecoverySelector,route:P6ProspectiveShardHandoff,clock:string,fetcher:typeof fetch=fetch){
 const response=await fetcher("https://api.github.com/repos/"+REPO+"/actions/runs/"+s.originalGithubRunId,
  {method:"GET",headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"},
   redirect:"error",signal:AbortSignal.timeout(10000)});
 if(!response.ok)HOLD("ORIGINAL_GITHUB_READ");
 return verifyP7OriginalPostRun(await response.json(),s,route,env.GITHUB_SHA!,clock);
}
export async function readP7StoredPostRecoveryPacket(env:NodeJS.ProcessEnv,s:P7RecoverySelector,fetcher:typeof fetch=fetch){
 const a=admitP7StoredPostRecovery(env,s),t=a.trust,c=new Client({connectionString:a.privateReaderUrl,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_post_recovery_original_read"});
 try{
  await c.connect();await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const day=await readP6StoredPrivateReviewOnce({client:c,trust:t,scope:readonlyScope,selector:{kind:"EXACT_DAY",runDayIndex:s.runDayIndex,indexRevision:s.indexRevision,indexSha256:s.indexSha256}});
  const handoff=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({client:c,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
   scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:false}});
  const route=selectP7RecoverablePostRoute(handoff,s);
  const signed=await readP6StoredPrivateReviewOnce({client:c,trust:t,scope:readonlyScope,selector:{kind:"POST",runDayIndex:s.runDayIndex,shardIndex:s.shardIndex,logicalPath:route.signedFrozenPath,contentSha256:s.packetSha256}});
  const read=await readP6PrivateSourcePostOnce(c,signed.pins,signed.wire,signed.publicKeyPem),z=read.redactedSummary;
  if(z.kind!=="POST_PACKET"||z.verifiedEd25519Review!==true||z.contentSha256!==s.packetSha256||z.providerCalls!==0||z.databaseWrites!==0||
   z.runDayIndex!==s.runDayIndex||z.shardIndex!==s.shardIndex||read.privateLogicalPath!==route.signedFrozenPath||
   !Buffer.isBuffer(read.privateBytes)||!read.privateBytes.equals(handoff.getFrozen(route.signedFrozenPath))||
   at(z.observedDatabaseClockUtc)<at(handoff.redactedSummary.observedRealPgClockUtc)||
   at(z.observedDatabaseClockUtc)-at(handoff.redactedSummary.observedRealPgClockUtc)>120000||
   at(z.observedDatabaseClockUtc)>=at(route.hardLatestUtc)+600000||
   at(z.observedDatabaseClockUtc)>=at(day.wire.review.validUntilUtc)||at(z.observedDatabaseClockUtc)>=at(day.wire.review.retentionNotAfterUtc))HOLD("LIVE_RETAINED_POST_PACKET");
  const originalRun=await readP7OriginalPostRun(env,s,route,z.observedDatabaseClockUtc,fetcher);
  const packet=JSON.parse(read.privateBytes.toString("utf8"));
  const p=admitP5FuturePostFrozenForReadOnly(read.privateBytes,packet,{
    frozenPacketPath:route.signedFrozenPath,expectedPacketSha256:s.packetSha256,approvedCodeSha:t.reviewedCodeSha,currentGithubRunId:originalRun,
    manifestSha256:t.manifestSha256,sourceRightsSha256:t.rightsSha256,
    categoryBudgetSha256:env.V39_P5_POST_CATEGORY_BUDGET_SHA256!,providerContractSha256:env.V39_P5_POST_PROVIDER_CONTRACT_SHA256!,
    requestSha256:packet.reviewed?.requestSha256,requestContextSha256:packet.reviewed?.reviewedRequestContextSha256,
    frameSha256:env.V39_P5_FRAME_HASH!,providerPriceSha256:env.V39_P5_POST_PRICE_SHA256!});
  if(p.runDayIndex!==s.runDayIndex||p.postDispatchEarliestUtc!==route.notBeforeUtc||p.postDispatchHardLatestUtc!==route.hardLatestUtc)HOLD("ORIGINAL_PACKET_ROUTE_CLOCK");
  const out={status:"EXACT_ORIGINAL_RUN_AND_RETAINED_SIGNED_POST_RECOVERY_PACKET_NO_GET",providerCalls:0,paidReservations:0,phase6PaidGo:false};
  return Object.freeze(Object.defineProperty(out,"privatePacket",{value:Object.freeze(p),enumerable:false})) as typeof out&{readonly privatePacket:Readonly<P5ReviewedFuturePostOneGet>};
 }finally{await c.end().catch(()=>{});}
}
export interface P7RecoveryReceiptTransport{
 readExactRecoveryReceipt(scope:Readonly<P6PostCommittedScope>):Promise<unknown>;
}
/** Complete the nonpaid read/reconcile path using the exact original
 * signed packet plus the private independent receipt transport. */
export async function runP7StoredPostRecovery(input:{
 env:NodeJS.ProcessEnv;selector:P7RecoverySelector;transport:P7RecoveryReceiptTransport;consumer:Phase7PostConsumer;
}){
 const {env,selector,transport,consumer}=input,a=admitP7StoredPostRecovery(env,selector);
 if(typeof transport?.readExactRecoveryReceipt!=="function")HOLD("PRIVATE_RECEIPT_TRANSPORT");
 const packet=(await readP7StoredPostRecoveryPacket(env,selector)).privatePacket;
 const pool=new Pool({connectionString:a.privateSourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_post_recovery_source"});
 try{
  const source=makeP5Stage28DedicatedRolePool(pool,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"});
  const scope=await discoverPhase7CommittedPostScope(source,packet);
  const wire=await transport.readExactRecoveryReceipt(Object.freeze({...scope,packet:Object.freeze({...scope.packet})}));
  return await recoverPhase7CommittedPost({env,scope,wire,source,consumer});
 }finally{await pool.end();}
}

/** Find only the original run's exact private POST digest. The event payload
 * is not authority; independently read the GitHub run and authenticate the
 * current retained signed index route before returning a selector. */
export async function discoverP7WorkflowRunRecoverySelector(env:NodeJS.ProcessEnv,originalGithubRunId:string){
 if(env.GITHUB_EVENT_NAME!=="workflow_run")HOLD("COMPLETION_EVENT_REQUIRED");
 const a=admitRecoveryBase(env,originalGithubRunId),t=a.trust;
 const res=await fetch("https://api.github.com/repos/"+REPO+"/actions/runs/"+originalGithubRunId,{
  method:"GET",redirect:"error",signal:AbortSignal.timeout(10000),
  headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"}});
 if(!res.ok)HOLD("ORIGINAL_GITHUB_READ");
 const run=await res.json(),m=/^P5 POST ([a-f0-9]{64})$/.exec(run?.display_title??"");
 if(!m||String(run.id)!==originalGithubRunId||run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
  run.path!==WORKFLOW||run.head_branch!=="main"||run.head_sha!==env.GITHUB_SHA||run.event!=="workflow_dispatch"||
  run.run_attempt!==1||run.status!=="completed"||!["failure","cancelled","timed_out"].includes(run.conclusion))HOLD("ORIGINAL_FAILED_CHILD_IDENTITY");
 const packetSha256=m![1];
 const c=new Client({connectionString:a.privateReaderUrl,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_recovery_completion_lookup"});
 try{
  await c.connect();await c.query("SET ROLE phase6_private_frozen_reader_v39");
  let row:any,clock:string;
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try{
   clock=await readP6DayEpochRestrictedReaderClock(c,t.expectedReaderSessionLogin);
   if(at(clock)-at(run.updated_at)>600000||at(run.updated_at)>at(clock)+5000)HOLD("COMPLETION_TOO_LATE");
   const q=await c.query("SELECT run_day_index,shard_index FROM phase6_private.frozen_native_packet_v39 WHERE kind='POST_PACKET' AND content_sha256=$1 AND manifest_sha256=$2 AND rights_sha256=$3 AND reviewed_code_sha=$4 AND retention_not_after_utc>clock_timestamp() LIMIT 2",[packetSha256,t.manifestSha256,t.rightsSha256,t.reviewedCodeSha]);
   row=q.rows[0];
   if(q.rowCount!==1||q.rows.length!==1||!integer(row?.run_day_index,31)||!integer(row.shard_index,100000))HOLD("NO_UNIQUE_RETAINED_POST");
  }finally{await c.query("ROLLBACK")}
  const day=await readP6StoredPrivateReviewOnce({client:c,trust:t,scope:readonlyScope,selector:{kind:"CURRENT_DAY",runDayIndex:row.run_day_index}});
  const handoff=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({client:c,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
   scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
  const z=handoff.redactedSummary,d=Object.getOwnPropertyDescriptor(handoff,"privateRecoverablePostRoutingCandidates");
  if(!d||d.enumerable!==false||!Array.isArray(d.value)||d.value.length>1024)HOLD("NO_AUTHENTICATED_RECOVERY_ROUTES");
  const hits=d!.value.filter((x:P6ProspectiveShardHandoff)=>x.lane==="POST"&&x.runDayIndex===row.run_day_index&&x.shardIndex===row.shard_index&&x.signedFrozenSha256===packetSha256);
  if(hits.length!==1)HOLD("NO_EXACT_RECOVERABLE_ROUTE");
  if(typeof z.indexRevision!=="number"||!integer(z.indexRevision,1024)||typeof z.externallySignedDayEpochIndexSha256!=="string"||!H.test(z.externallySignedDayEpochIndexSha256)||typeof z.observedRealPgClockUtc!=="string")return HOLD("CURRENT_SIGNED_INDEX_SCOPE");
  const selector:P7RecoverySelector={runDayIndex:row.run_day_index,indexRevision:z.indexRevision,indexSha256:z.externallySignedDayEpochIndexSha256,
   shardIndex:row.shard_index,packetSha256,routingIntentSha256:hits[0].routingIntentSha256,originalGithubRunId};
  const route=selectP7RecoverablePostRoute(handoff,selector);
  verifyP7OriginalPostRun(run,selector,route,env.GITHUB_SHA!,z.observedRealPgClockUtc);
  return selector;
 }finally{await c.end().catch(()=>{})}
}
/** Actual recovery process; no paid child or its environment. */
export async function executeP7StoredPostRecovery(env:NodeJS.ProcessEnv,selector:P7RecoverySelector){
 const a=admitP7StoredPostRecovery(env,selector);
 const packet=(await readP7StoredPostRecoveryPacket(env,selector)).privatePacket;
 const pool=new Pool({connectionString:a.privateSourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_post_recovery_execution"});
 try{
  const source=makeP5Stage28DedicatedRolePool(pool,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"});
  const scope=await discoverPhase7CommittedPostScope(source,packet);
  const transport=openP7StoredPostRecoveryTransport(env,scope);
  const wire=await transport.readExactRecoveryReceipt(scope);
  const opened=openPhase7ProtectedPostConsumer(env,transport);
  try{return await recoverPhase7CommittedPost({env,scope,wire,source,consumer:opened.consumer})}
  finally{await opened.close()}
 }finally{await pool.end()}
}

/** Actual independent first observation or existing receipt reconciliation.
 * The prior observation here is the real first recovery read, never a
 * fabricated timestamp of the failed paid process. Previous group writes
 * require a receipt before any write; never replace an existing receipt. */
export async function prepareP7RecoveryReceiptFromOriginal(env:NodeJS.ProcessEnv,selector:P7RecoverySelector,signer:KeyObject){
 const a=admitP7StoredPostRecovery(env,selector);
 if(env.P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED!=="1"||env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL)HOLD("INDEPENDENT_REVIEWER_ONLY");
 const packet=(await readP7StoredPostRecoveryPacket(env,selector)).privatePacket;
 const pool=new Pool({connectionString:a.privateSourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_post_independent_receipt_issuer"});
 try{
  const source=makeP5Stage28DedicatedRolePool(pool,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107"});
  const scope=await discoverPhase7CommittedPostScope(source,packet);
  const audit=await readP6CommittedPostOutcomeObservability(source,scope);
  const transport=openP7StoredRecoveryReceiptPort(env);
  let wire:unknown,existing=true;
  try{wire=await transport.readExactRecoveryReceipt(scope)}
  catch(err){
   // Specifically an absent exact row, NOT an expired, malformed, changed
   // or unavailable receipt. No replacement after unknown read/commit.
   if((err as Error)?.message!=="HOLD_P7_PRIVATE_REVIEW_TRANSPORT_MISSING_EXACT_REVIEW_NO_FALLBACK")throw err;
   existing=false;
   const issued=await issuePhase7CommittedPostRecoveryReceipt({env,source,scope,
    priorAudit:{sha256:phase7CommittedPostAuditIdentity(audit),observedAtUtc:audit.privateObservedDbClockUtc},signer});
   wire=issued.privateWire;
  }
  const fresh=await readP6CommittedPostOutcomeObservability(source,scope);
  verifyPhase7RecoveryReceiptForAudit(env,scope,fresh,wire,fresh.privateObservedDbClockUtc);
  // No original raw body, flight identifier or denominator in handoff.
  return {selector:postRecoveryReviewSelector(scope),wire,existing};
 }finally{await pool.end()}
}
