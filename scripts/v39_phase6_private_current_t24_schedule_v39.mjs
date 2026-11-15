/** Current signed native T24 → original queued singleton Stage14 PRE,
 * separate V0081 witness, ACK and post-ACK custody. No new queue/provider.
 * This is a dedicated STOP-default scheduled nonpaid worker, never a
 * substitute for separate study release or production capacity validation. */
import pg from "pg";
import {pathToFileURL} from "node:url";
import {verifyP5CdGithubFrozenCodeLineage} from "../server/lib/disruption/phase5CdGithubCodeLineage_v39.ts";
import {requireP5CdGithubCurrentPrivateT24Scope} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39.ts";
import {requireP5CdT24DispatchEvent} from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39.ts";
import {readP6T24ProtectedQueueTrust,checkedP6T24TlsUrl,readP6T24RoutingClock} from "./v39_phase6_private_t24_restartable_enrollment_v39.mjs";
import {loadP6LaterCalendarWindows,selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {projectP6T24QueuePackets,readP6CurrentT24QueuePackets} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
import {readP6T24PrivateRegistryPackets} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {runP5CdOneQueuedT24VerifiedBytes} from "./v39_phase5_cd_github_one_queued_t24_witness_v39.ts";
const hold=s=>{throw Error("HOLD_P6_CURRENT_T24_"+s);};
const H=/^[a-f0-9]{64}$/;
export function admitP6CurrentT24Schedule(env){
 const base=requireP5CdGithubCurrentPrivateT24Scope(env);
 requireP5CdT24DispatchEvent(env);
 if(base.releaseMode!=="PHASE6_APPROVED"||env.GITHUB_EVENT_NAME!=="schedule"||
    env.P6_PRIVATE_T24_CURRENT_EXECUTE!=="1"||env.P6_PRIVATE_T24_CURRENT_APPROVED!=="1"||
    env.P5_CD_GH_QUEUED_T24_EXECUTE==="1"||env.P5_CD_GH_T24_STATIC_SCHEDULE_ENABLED==="1"||
    env.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED!=="1"||env.P6_T24_CUSTODY_ENABLED!=="1"||
    env.P6_T24_CUSTODY_APPROVED!=="1"||!env.P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64||
    !env.P6_PRIVATE_PUBLISHER_DATABASE_URL||env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
    env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||env.RAPIDAPI_KEY||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.P5_CD_GH_E_ROUTE_FEATURES_APPROVED!=="1"||env.P5_CD_GH_E_SUPPLEMENTAL_FEATURES_APPROVED!=="1"||
    !/^[1-4]$/.test(env.P6_PRIVATE_T24_WORKER_LANES||"1")||!/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??""))
  hold("SEPARATE_CURRENT_SCHEDULE_CUSTODY_OR_CAPACITY_NOT_APPROVED");
 const trust=readP6T24ProtectedQueueTrust(env);
 if(trust.reviewedCodeSha!==base.approvedCodeSha||trust.manifestSha256!==base.manifestSha256||trust.rightsSha256!==base.rightsSha256)
  hold("STUDY_RELEASE_DRIFT");
 const pre=checkedP6T24TlsUrl(env.P5_V39_PRE_DATABASE_URL,"phase5_p30_pre_login_20261107");
 checkedP6T24TlsUrl(env.P5_V39_T24_WITNESS_DATABASE_URL,"phase5_p30_witness_login_20261107",pre);
 checkedP6T24TlsUrl(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin,pre);
 const calendar=loadP6LaterCalendarWindows(env,trust,undefined,"T24");
 return {trust,calendar,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL,lanes:Number(env.P6_PRIVATE_T24_WORKER_LANES||"1")};
}
/** No blind retry. An uncertain worker result stops further dispatch;
 * already-in-flight singletons complete their original fenced operation.
 * Empty/no-longer-due results are ordinary per-flight missingness. */
export async function executeP6BoundedT24Candidates(packets,lanes,runOne,monotonic=()=>performance.now()){
 if(!Array.isArray(packets)||packets.length>384||!Number.isInteger(lanes)||lanes<1||lanes>4||
    typeof runOne!=="function")hold("UNBOUNDED_T24_EXECUTION");
 const ids=new Set(),sha=new Set();
 for(const p of packets){
  const id=p?.entry?.permit?.flightInstanceId,d=p?.entry?.packetSha256;
  if(p.entry?.permit?.horizon!=="T-24h"||!p.entry.witnessReview||!H.test(d??"")||
     !H.test(p.registrySha256??"")||!H.test(p.rosterSha256??"")||
     !Number.isSafeInteger(p.cutoff)||typeof id!=="string"||ids.has(id)||sha.has(d))
   hold("UNVERIFIED_DUPLICATE_T24_EXECUTION_PACKET");
  ids.add(id);sha.add(d);
 }
 const ordered=packets.slice().sort((a,b)=>a.cutoff-b.cutoff||a.entry.packetSha256.localeCompare(b.entry.packetSha256));
 const started=monotonic();let cursor=0,verified=0,noDue=0,held=0,stopped=false;
 await Promise.all(Array.from({length:Math.min(lanes,ordered.length)},async()=>{
  while(!stopped&&cursor<ordered.length&&monotonic()-started<600000){
   const p=ordered[cursor++];
   try{
    const r=await runOne(p,()=>stopped);
    if(r?.status==="T24_PRE_V0081_WITNESS_AND_QUEUE_VERIFIED_NOT_SCIENTIFIC_FREEZE"&&
       r.privateCustodyCommittedAndReadBack===true&&r.providerCalls===0&&r.paidProviderCalls===0&&r.phase6PaidGo===false)
     verified++;
    else if(r?.status==="NO_DUE_SIGNED_T24_TASK"&&r.providerCalls===0&&r.phase6PaidGo===false)noDue++;
    else {held++;stopped=true;}
   }catch{held++;stopped=true;}
  }
 }));
 return {status:held?"HOLD_CURRENT_NATIVE_T24_NO_REPLAY":"BOUNDED_CURRENT_NATIVE_T24_COMPLETE",
  selected:ordered.length,lanes:Math.min(lanes,ordered.length),attempted:cursor,verified,noDue,held,deferred:ordered.length-cursor,
  aggregateCountsMayExcludeUnknownCommits:held>0,providerCalls:0,phase6PaidGo:false};
}
export async function runP6CurrentT24Schedule(env){
 verifyP5CdGithubFrozenCodeLineage(env);
 const ctx=admitP6CurrentT24Schedule(env);
 async function read(work){
  const c=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000,
   application_name:"p6_current_t24_readonly"});
  await c.connect();
  try{await c.query("SET ROLE phase6_private_frozen_reader_v39");return await work(c);}
  finally{await c.end();}
 }
 const selected=await read(async c=>{
  const due=selectP6LaterCalendarDueDays(ctx.calendar,await readP6T24RoutingClock(c,ctx.trust));
  if(!due.dayIndices.length)return null;
  return readP6CurrentT24QueuePackets({client:c,trust:ctx.trust,runDayIndices:due.dayIndices,purpose:"PRE_EXECUTION"});
 });
 if(!selected)return {status:"NO_DUE_NATIVE_T24_DAYS",providerCalls:0,phase6PaidGo:false};
 if(selected.status!=="CURRENT_SIGNED_T24_QUEUE_PACKET_PROJECTION_NO_GO"||selected.purpose!=="PRE_EXECUTION"||
    selected.providerCalls!==0||selected.databaseWrites!==0||selected.queueClaims!==0||selected.phase6PaidGo!==false||
    selected.privatePackets.length!==selected.packetCount)hold("UNAUTHENTICATED_SELECTION");
 const report=await executeP6BoundedT24Candidates(selected.privatePackets,ctx.lanes,async(p,stopped)=>{
  // Derived compatibility digest is private in-process only. No workflow
  // input, secret or public flight-data artifact may substitute a roster.
  const scopedEnv={...env,P5_CD_GH_PRE_ROSTER_SHA256:p.rosterSha256};
  return runP5CdOneQueuedT24VerifiedBytes(scopedEnv,p.rosterBytes,p.roster,p.files,async()=>{
   if(stopped())return false;
   const fresh=await read(async c=>{
    const got=await readP6T24PrivateRegistryPackets({client:c,trust:ctx.trust,runDayIndex:p.runDayIndex,registrySha256:p.registrySha256});
    const projection=projectP6T24QueuePackets(got,ctx.trust,"PRE_EXECUTION");
    const exact=projection.filter(x=>x.entry.packetSha256===p.entry.packetSha256);
    if(!exact.length)return false;
    if(exact.length!==1||exact[0].cutoff!==p.cutoff||exact[0].rosterSha256!==p.rosterSha256||
       !exact[0].rosterBytes.equals(p.rosterBytes)||!exact[0].files[0].bytes.equals(p.files[0].bytes))
     hold("PRIVATE_T24_SINGLETON_CHANGED_AFTER_LOOKAHEAD");
    return true;
   });
   return fresh&&!stopped();
  });
 });
 return {...report,deferredRegistries:selected.deferredRegistryCount,expiredAtProjection:selected.expiredPacketCount};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{const r=await runP6CurrentT24Schedule(process.env);console.log(JSON.stringify(r));
  if(r.status==="HOLD_CURRENT_NATIVE_T24_NO_REPLAY")process.exitCode=2;}
 catch{console.error("HOLD_P6_CURRENT_T24_REDACTED_NO_REPLAY");process.exitCode=2;}
}
