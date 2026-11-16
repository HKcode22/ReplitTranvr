/** Current private T24 scheduler: exact existing singleton V0092 worker,
 * Stage14/V0081, and private receipt custody. No provider, new queue, new
 * storage, synthetic witness, enrollment or paid authority. Up to four
 * approved parallel lanes, prospective DB-clock wait, bounded restartable
 * suffix. Unknown PRE/witness/receipt result stops new work, never replay. */
import pg from "pg";
import {pathToFileURL} from "node:url";
import {readP6T24ProtectedQueueTrust,checkedP6T24TlsUrl,readP6T24RoutingClock} from "./v39_phase6_private_t24_restartable_enrollment_v39.mjs";
import {loadP6CurrentT24CalendarWindows,selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {readP6CurrentT24QueuePackets,projectP6T24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
import {readP6T24PrivateRegistryPackets} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {requireP5CdGithubCurrentPrivateT24Scope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39.ts";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39.ts";
import {verifyP5CdFrozenRoster} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39.ts";
import {waitP5CdGithubSignedDueWindow} from "../server/lib/disruption/phase5CdGithubDbClockLookahead_v39.ts";
import {requireP5CdT24DispatchEvent,runP5CdOneQueuedT24Witness} from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39.ts";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {admitP6CommittedT24Custody,openP6CommittedT24Custody} from "./v39_phase6_committed_t24_witness_custody_v39.mjs";
const H=/^[a-f0-9]{64}$/;
const hold=s=>{throw Error("HOLD_P6_CURRENT_T24_"+s);};
export function admitP6CurrentT24Worker(env){
 const base=requireP5CdGithubCurrentPrivateT24Scope(env);
 requireP5CdT24DispatchEvent(env);
 if(env.P6_T24_CUSTODY_ENABLED!=="1"||env.P6_T24_CUSTODY_APPROVED!=="1"||
    env.P5_CD_GH_E_ROUTE_FEATURES_APPROVED!=="1"||env.P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED!=="1"||
    !env.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64||!env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
    env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
    env.P6_PRIVATE_LATER_ENROLL_ENTRYPOINT==="1"||env.P6_PRIVATE_T24_RUN_DAYS||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||env.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED!=="1")
  hold("CURRENT_T24_REQUIRES_PROTECTED_CUSTODY_AND_ENROLLMENT");
 const trust=readP6T24ProtectedQueueTrust(env);
 if(base.approvedCodeSha!==trust.reviewedCodeSha||base.manifestSha256!==trust.manifestSha256||base.rightsSha256!==trust.rightsSha256)
  hold("STUDY_TRUST_DRIFT");
 // readP6T24ProtectedQueueTrust authenticated exact policy bytes already.
 const p=JSON.parse(Buffer.from(env.P6_NONPAID_DAILY_POLICY_BASE64,"base64").toString("utf8"));
 const lanes=p.nativeLaterReview.maximumT24ExecutionLanes;
 if(!Number.isSafeInteger(lanes)||lanes<1||lanes>4)hold("UNAPPROVED_T24_LANE_BOUND");
 const pre=checkedP6T24TlsUrl(env.P5_V39_PRE_DATABASE_URL,"phase5_p30_pre_login_20261107");
 checkedP6T24TlsUrl(env.P5_V39_T24_WITNESS_DATABASE_URL,"phase5_p30_witness_login_20261107",pre);
 checkedP6T24TlsUrl(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin,pre);
 return {trust,lanes,calendar:loadP6CurrentT24CalendarWindows(env,trust)};
}
/** Do not manufacture a legacy roster authorization from workflow inputs.
 * This local copy is only used after the real current private reader's
 * exact signed registry and packet verification. No file/env/log export. */
export function localP6T24SingletonEnv(env,projection){
 if(env.P5_CD_GH_PRE_ROSTER_SHA256||env.P5_CD_GH_ROSTER_PATH||
    !H.test(projection?.rosterSha256??"")||!Buffer.isBuffer(projection.rosterBytes)||
    projection.roster?.entries?.length!==1||projection.files?.length!==1||
    projection.entry?.permit?.horizon!=="T-24h"||!projection.entry.witnessReview)
  hold("NO_EXACT_T24_SINGLETON_PROJECTION");
 const local={...env,P5_CD_GH_PRE_ROSTER_SHA256:projection.rosterSha256};
 const packets=verifyP5CdFrozenRoster(projection.rosterBytes,projection.roster,projection.files,
  requireP5CdGithubPreRelease(local,{allowReviewedT24Witness:true}),"T24_WITH_SEPARATE_WITNESS");
 if(packets.size!==1||!packets.has(projection.entry.packetSha256))
  hold("PRIVATE_SINGLETON_DRIFT");
 return {local,packets};
}
/** No external actions except the supplied actual singleton worker.
 * Each selected packet is attempted at most once per invocation. Do not
 * begin another after an unknown result. Already-started peers may finish.
 * Only aggregate confirmed observations are returned. */
export async function runP6BoundedT24Packets(packets,lanes,work,clock=()=>performance.now()){
 if(!Array.isArray(packets)||packets.length>384||!Number.isSafeInteger(lanes)||lanes<1||lanes>4||
    typeof work!=="function"||typeof clock!=="function")hold("UNBOUNDED_WORK");
 const seen=new Set();
 for(const p of packets){
  const sha=p?.entry?.packetSha256;
  if(!H.test(sha??"")||seen.has(sha)||p.entry.permit?.horizon!=="T-24h"||!Number.isSafeInteger(p.cutoff))
   hold("NONUNIQUE_T24_PACKET");
  seen.add(sha);
 }
 const start=clock();let next=0,held=0,verified=0,custodied=0,notDue=0,skipped=0,stopped=false;
 await Promise.all(Array.from({length:Math.min(lanes,packets.length)},async()=>{
  while(!stopped&&next<packets.length&&clock()-start<720000){
   const p=packets[next++];
   try{
    // Recheck stop after any lookahead in work before invoking write.
    const r=await work(p,()=>stopped);
    if(r==="VERIFIED_WITH_CUSTODY"){verified++;custodied++;}
    else if(r==="VERIFIED_CUSTODY_UNKNOWN"){verified++;held++;stopped=true;}
    else if(r==="NO_DUE"){notDue++;}
    else if(r==="SKIPPED"){skipped++;}
    else{held++;stopped=true;}
   }catch{held++;stopped=true;}
  }
 }));
 return {status:held?"HOLD_CURRENT_PRIVATE_T24_UNKNOWN_NO_REPLAY":"BOUNDED_CURRENT_PRIVATE_T24_COMPLETE",
  candidateCount:packets.length,attemptedCount:next,verified,custodied,notDue,skipped,held,deferredCount:packets.length-next,
  aggregateCountsMayExcludeUnknownCommits:held>0,providerCalls:0,phase6PaidGo:false};
}
export async function runP6CurrentT24Worker(env){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6CurrentT24Worker(env);
 async function read(work){
  const c=new pg.Client({connectionString:env.P6_PRIVATE_READER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:25000,
   application_name:"p6_current_t24_registry_reader"});
  try{await c.connect();await c.query("SET ROLE phase6_private_frozen_reader_v39");return await work(c);}
  finally{await c.end();}
 }
 const selected=await read(async c=>{
  const due=selectP6LaterCalendarDueDays(ctx.calendar,await readP6T24RoutingClock(c,ctx.trust));
  if(!due.dayIndices.length)return null;
  return readP6CurrentT24QueuePackets({client:c,trust:ctx.trust,runDayIndices:due.dayIndices,purpose:"PRE_EXECUTION"});
 });
 if(!selected?.packetCount)return {status:"NO_DUE_CURRENT_PRIVATE_T24_PACKETS",verified:0,custodied:0,providerCalls:0,phase6PaidGo:false};
 if(selected.status!=="CURRENT_SIGNED_T24_QUEUE_PACKET_PROJECTION_NO_GO"||selected.purpose!=="PRE_EXECUTION"||
    selected.privatePackets.length!==selected.packetCount||selected.providerCalls!==0||selected.databaseWrites!==0||selected.queueClaims!==0)
  hold("NO_EXACT_CURRENT_T24_ROUTE");
 const preRaw=new pg.Pool({connectionString:env.P5_V39_PRE_DATABASE_URL,max:ctx.lanes*2,connectionTimeoutMillis:8000,
  idleTimeoutMillis:2000,query_timeout:20000,application_name:"p6_t24_current_pre"});
 const witnessRaw=new pg.Pool({connectionString:env.P5_V39_T24_WITNESS_DATABASE_URL,max:ctx.lanes*2,connectionTimeoutMillis:8000,
  idleTimeoutMillis:2000,query_timeout:20000,application_name:"p6_t24_current_separate_witness"});
 const pre=makeP5Stage28DedicatedRolePool(preRaw,{group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
 const witness=makeP5Stage28DedicatedRolePool(witnessRaw,{group:"witness",reviewedDedicatedLogin:"phase5_p30_witness_login_20261107",forbiddenApplicationLogin:"phase5_runtime_application_login"});
 async function fresh(p){
  return read(async c=>{
   const got=await readP6T24PrivateRegistryPackets({client:c,trust:ctx.trust,runDayIndex:p.runDayIndex,registrySha256:p.registrySha256});
   const x=projectP6T24QueuePackets(got,ctx.trust,"PRE_EXECUTION").filter(x=>x.entry.packetSha256===p.entry.packetSha256);
   if(x.length>1||x.some(x=>x.rosterSha256!==p.rosterSha256||!x.rosterBytes.equals(p.rosterBytes)||x.cutoff!==p.cutoff))
    hold("T24_SINGLETON_CHANGED_NO_REPLAY");
   return x[0]??null;
  });
 }
 try{
  const result=await runP6BoundedT24Packets(selected.privatePackets,ctx.lanes,async(p,stopped)=>{
   if(stopped())return "SKIPPED";
   // Initial authenticated bytes allow the original read-only wait. Fresh
   // registry/readback AFTER waiting must still authenticate same packet.
   const a=localP6T24SingletonEnv(env,p);
   const due=await waitP5CdGithubSignedDueWindow(a.local,pre,a.packets,undefined,{allowReviewedT24Witness:true});
   if(due.status==="MAX_REVIEWED_LOOKAHEAD_EXHAUSTED")return "SKIPPED";
   if(due.status!=="DUE_WINDOW"||stopped())return "SKIPPED";
   const q=await fresh(p);if(!q||stopped())return "SKIPPED";
   const b=localP6T24SingletonEnv(env,q);
   const exact=[...b.packets.values()][0];
   const custody=await openP6CommittedT24Custody(admitP6CommittedT24Custody(b.local,exact.permit,exact.witnessReview));
   if(!custody)hold("CUSTODY_NOT_COMMISSIONED");
   try{
    if(stopped())return "SKIPPED";
    const t=await runP5CdOneQueuedT24Witness(b.local,{preDb:pre,prePool:pre,witnessPool:witness,
     rosterBytes:q.rosterBytes,roster:q.roster,files:q.files});
    if(t.status==="NO_DUE_SIGNED_T24_TASK")return "NO_DUE";
    if(t.status!=="T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE")return "UNKNOWN";
    try{const c=await custody.publish(t);return c.privateT24CustodyCommittedAndReadBack?"VERIFIED_WITH_CUSTODY":"VERIFIED_CUSTODY_UNKNOWN";}
    catch{return "VERIFIED_CUSTODY_UNKNOWN";}
   }finally{await custody.close();}
  });
  return {...result,lanes:ctx.lanes,deferredRegistries:selected.deferredRegistryCount};
 }finally{await Promise.allSettled([preRaw.end(),witnessRaw.end()]);}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{const r=await runP6CurrentT24Worker(process.env);console.log(JSON.stringify(r));if(r.held)process.exitCode=2;}
 catch{console.error("HOLD_P6_CURRENT_T24_REDACTED_NO_REPLAY");process.exitCode=2;}
}
